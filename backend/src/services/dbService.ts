import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

import { query, execute, transactionAsync } from '../config/database-adapter.js';
import { generateId, now, rowToCamelCase, buildPagination, buildLike } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.resolve(__dirname, "../../data/backup");
const SCRIPTS_DIR = path.resolve(__dirname, "../scripts");

const execFileAsync = promisify(execFile);
const MAX_VERSIONS_PER_SCRIPT = 20;
const MAX_CHANGE_SUMMARY_LENGTH = 200;

interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  dfltValue: unknown;
  pk: boolean;
}

interface ForeignKeyInfo {
  from: string;
  table: string;
  to: string;
}

interface IndexInfo {
  name: string;
  tblName: string;
  sql: string | null;
  unique: boolean;
  columns: string[];
}

interface TableSchemaResult {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

interface ColumnMeta {
  name: string;
  type: string;
  notnull: boolean;
  dfltValue: unknown;
  pk: boolean;
}

interface TableDataResult {
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface BackupMeta {
  fileName: string;
  version: string;
  exportedAt: string;
  tableCount: number;
  totalRows: number;
  hash: string;
  fileSize: string;
}

interface ExportDataV2 {
  version: string;
  exportedAt: string;
  tables: {
    schema: {
      name: string;
      columns: ColumnInfo[];
      foreignKeys: ForeignKeyInfo[];
      rowCount: number;
      dataHash: string;
    };
    rows: Record<string, unknown>[];
  }[];
  meta: {
    totalRows: number;
    totalTables: number;
    schemaHash: string;
  };
}

interface ScriptDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  dangerLevel: "low" | "medium" | "high";
  scriptPath: string;
  estimatedTime: string;
  details: string[];
  impact?: string;
  reversible?: boolean;
  usageNote?: string;
}

interface ScriptLogRow {
  id: string;
  scriptId: string;
  scriptName: string;
  triggeredBy: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  resultSummary: string | null;
  errorMessage: string | null;
}

const SCRIPT_REGISTRY: ScriptDefinition[] = [
  {
    id: "fix-materials",
    name: "修复原料数据",
    description: "修复原料表中的名称乱码、编码格式异常、必填字段缺失等问题",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixMaterials.ts",
    estimatedTime: "10-30s",
    details: ["修复原料名称中的乱码字符", "修正原料编码格式为标准格式", "补全缺失的必填字段（单位、类型等）"],
    impact: "直接修改原料表数据，影响配方中引用的原料信息",
    reversible: false,
    usageNote: "执行前建议先创建数据库备份；适用于数据导入后出现乱码或字段缺失的场景",
  },
  {
    id: "fix-material-codes",
    name: "修复原料编码",
    description: "根据拼音首字母重新生成原料编码，确保编码唯一性和规范性",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixMaterialCodes.ts",
    estimatedTime: "5-15s",
    details: ["根据原料名称拼音首字母生成编码", "检查并确保编码唯一性", "同步更新关联表中的编码引用"],
    impact: "修改原料编码字段，配方中通过ID关联不受影响，但外部引用编码的系统需同步更新",
    reversible: false,
    usageNote: "适用于编码格式混乱或重复的场景；执行后需确认外部系统是否依赖旧编码",
  },
  {
    id: "fix-all-material-codes",
    name: "修复全部原料编码",
    description: "批量扫描并修复所有原料编码异常，比单条修复更彻底",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixAllMaterialCodes.ts",
    estimatedTime: "10-30s",
    details: ["全量扫描所有原料编码", "批量修复编码异常", "更新关联表中的编码引用"],
    impact: "批量修改所有原料编码，影响范围比「修复原料编码」更大",
    reversible: false,
    usageNote: "当大量原料编码需要修复时使用；建议先执行「修复原料编码」测试效果",
  },
  {
    id: "fix-created-by",
    name: "修复创建人字段",
    description: "补全数据中缺失的创建人信息，修正无效的用户引用",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixCreatedBy.ts",
    estimatedTime: "5-10s",
    details: ["扫描created_by为空的记录", "将缺失的创建人补全为系统管理员", "修正无效的用户ID引用"],
    impact: "修改原料、配方等表的created_by字段，不影响业务数据本身",
    reversible: false,
    usageNote: "适用于数据导入后创建人信息缺失的场景；修复后创建人统一为admin",
  },
  {
    id: "fix-diju",
    name: "修复地级数据",
    description: "修复原料地级（产地）字段中的异常值，标准化数据格式",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixDiju.ts",
    estimatedTime: "5-10s",
    details: ["扫描地级字段中的异常值", "修正格式不规范的产地信息", "统一数据格式标准"],
    impact: "修改原料产地字段，不影响配方计算和营养数据",
    reversible: false,
  },
  {
    id: "clean-invalid-materials",
    name: "清理无效原料",
    description: "删除名称为空、编码重复或数据严重异常的原料记录",
    category: "clean",
    dangerLevel: "high",
    scriptPath: "cleanInvalidMaterials.ts",
    estimatedTime: "5-10s",
    details: ["扫描名称为空的原料记录", "检测编码重复的原料", "删除严重异常的数据"],
    impact: "直接删除原料记录，关联的配方可能受影响",
    reversible: false,
    usageNote: "执行前务必创建备份；删除后无法恢复",
  },
  {
    id: "clean-old-materials",
    name: "清理旧版原料",
    description: "清理不再使用的旧版原料数据，释放存储空间",
    category: "clean",
    dangerLevel: "high",
    scriptPath: "cleanOldMaterials.ts",
    estimatedTime: "5-10s",
    details: ["扫描长期未使用的原料", "清理历史遗留数据", "释放存储空间"],
    impact: "删除旧版原料数据，可能影响历史配方查看",
    reversible: false,
  },
  {
    id: "refresh-material-updated-at",
    name: "刷新原料更新时间",
    description: "重新计算并更新原料的updated_at字段",
    category: "fix",
    dangerLevel: "low",
    scriptPath: "refreshMaterialUpdatedAt.ts",
    estimatedTime: "5-10s",
    details: ["重新计算原料更新时间", "确保时间戳正确"],
    impact: "仅修改updated_at字段，不影响业务数据",
    reversible: true,
  },
  {
    id: "generate-formula-codes",
    name: "生成配方编码",
    description: "为缺少编码的配方自动生成编码",
    category: "fix",
    dangerLevel: "low",
    scriptPath: "generateFormulaCodes.ts",
    estimatedTime: "5-10s",
    details: ["扫描缺少编码的配方", "根据规则生成编码", "确保编码唯一性"],
    impact: "新增配方编码字段，不影响现有数据",
    reversible: false,
  },
  {
    id: "verify-nutrition-data",
    name: "验证营养数据",
    description: "检查营养数据的完整性和一致性",
    category: "check",
    dangerLevel: "low",
    scriptPath: "verifyNutritionData.ts",
    estimatedTime: "5-15s",
    details: ["检查营养数据完整性", "验证数据一致性", "输出检查报告"],
    impact: "只读操作，不修改任何数据",
    reversible: true,
  },
  {
    id: "check-ai-usage",
    name: "检查AI用量",
    description: "统计和检查AI模型的使用情况",
    category: "check",
    dangerLevel: "low",
    scriptPath: "check-ai-usage.ts",
    estimatedTime: "5-10s",
    details: ["统计AI模型调用次数", "检查Token消耗", "输出使用报告"],
    impact: "只读操作，不修改任何数据",
    reversible: true,
  },
  {
    id: "audit-nutrition",
    name: "审计营养数据",
    description: "全面审计营养数据的缺失和异常",
    category: "check",
    dangerLevel: "low",
    scriptPath: "auditAndSupplementNutrition.ts",
    estimatedTime: "10-30s",
    details: ["审计营养数据缺失", "检查数据异常", "生成审计报告"],
    impact: "只读操作，不修改任何数据",
    reversible: true,
  },
];

function getAllScriptDefinitions(): ScriptDefinition[] {
  return SCRIPT_REGISTRY;
}

function computeHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function ensureScriptLogsTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS db_script_logs (
      id VARCHAR(36) PRIMARY KEY,
      script_id VARCHAR(100) NOT NULL,
      script_name VARCHAR(255) NOT NULL,
      triggered_by VARCHAR(100) DEFAULT 'unknown',
      status VARCHAR(50) NOT NULL DEFAULT 'running',
      started_at DATETIME NOT NULL,
      completed_at DATETIME DEFAULT NULL,
      duration_ms INT DEFAULT NULL,
      result_summary TEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      INDEX idx_script_logs_script_id (script_id),
      INDEX idx_script_logs_started_at (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, []);
}

async function ensureScriptVersionsTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS db_script_versions (
      id VARCHAR(36) PRIMARY KEY,
      script_id VARCHAR(100) NOT NULL,
      script_name VARCHAR(255) NOT NULL,
      script_path VARCHAR(500) NOT NULL,
      content LONGTEXT DEFAULT NULL,
      saved_by VARCHAR(100) DEFAULT 'unknown',
      saved_at DATETIME NOT NULL,
      change_summary VARCHAR(500) DEFAULT NULL,
      INDEX idx_script_versions_script_id (script_id),
      INDEX idx_script_versions_saved_at (saved_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, []);
}

// ==================== Database Info ====================

export async function getDbInfo(): Promise<Record<string, unknown>> {
  try {
    const tables = (await query(
      "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'",
      []
    )).rows as { name: string }[];

    let totalRows = 0;
    for (const t of tables) {
      const result = (await query(`SELECT COUNT(*) as cnt FROM \`${t.name}\``, [])).rows[0] as { cnt: number };
      totalRows += result.cnt;
    }

    const dbSizeResult = (await query(
      "SELECT SUM(DATA_LENGTH + INDEX_LENGTH) as size_bytes FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()",
      []
    )).rows[0] as { size_bytes: number | null };

    const fileSize = dbSizeResult.size_bytes || 0;

    return {
      dbType: "mysql",
      fileSize: formatFileSize(fileSize),
      fileSizeBytes: fileSize,
      tableCount: tables.length,
      totalRows,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取数据库信息失败";
    throw new Error(message);
  }
}

// ==================== Table List ====================

export async function getTableList(): Promise<Record<string, unknown>[]> {
  try {
    const tables = (await query(
      "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
      []
    )).rows as { name: string }[];

    const result: Record<string, unknown>[] = [];

    for (const t of tables) {
      const tableName = t.name;

      const countResult = (await query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``, [])).rows[0] as { cnt: number };

      const colResult = (await query(
        "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
        [tableName]
      )).rows[0] as { cnt: number };

      const idxResult = (await query(
        "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? GROUP BY INDEX_NAME",
        [tableName]
      )).rows;

      result.push({
        name: tableName,
        rowCount: countResult.cnt,
        columnCount: colResult.cnt,
        indexCount: idxResult.length,
      });
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取表列表失败";
    throw new Error(message);
  }
}

// ==================== Table Schema ====================

export async function getTableSchema(tableName: string): Promise<TableSchemaResult> {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error("无效的表名格式");
  }

  try {
    const tableCheck = (await query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [tableName]
    )).rows;

    if (tableCheck.length === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // Get columns
    const colRows = (await query(
      `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE = 'NO' as notnull,
              COLUMN_DEFAULT as dflt_value, COLUMN_KEY = 'PRI' as pk
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    )).rows as Array<{ name: string; type: string; notnull: number; dflt_value: unknown; pk: number }>;

    const columns: ColumnInfo[] = colRows.map(c => ({
      name: c.name,
      type: c.type,
      notnull: !!c.notnull,
      dfltValue: c.dflt_value,
      pk: !!c.pk,
    }));

    // Get indexes
    const idxRows = (await query(
      `SELECT INDEX_NAME as name, NON_UNIQUE = 0 as unique_flag, COLUMN_NAME as col
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [tableName]
    )).rows as Array<{ name: string; unique_flag: number; col: string }>;

    const idxMap = new Map<string, { unique: boolean; columns: string[] }>();
    for (const idx of idxRows) {
      if (!idxMap.has(idx.name)) {
        idxMap.set(idx.name, { unique: !!idx.unique_flag, columns: [] });
      }
      idxMap.get(idx.name)!.columns.push(idx.col);
    }

    const indexes: IndexInfo[] = [];
    for (const [name, info] of idxMap) {
      indexes.push({
        name,
        tblName: tableName,
        sql: null,
        unique: info.unique,
        columns: info.columns,
      });
    }

    // Get foreign keys
    const fkRows = (await query(
      `SELECT COLUMN_NAME as \`from\`, REFERENCED_TABLE_NAME as \`table\`, REFERENCED_COLUMN_NAME as \`to\`
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tableName]
    )).rows as ForeignKeyInfo[];

    return {
      name: tableName,
      columns,
      indexes,
      foreignKeys: fkRows,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("不存在")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "获取表结构失败";
    throw new Error(message);
  }
}

// ==================== Table Data ====================

export async function getTableData(
  tableName: string,
  params: { page?: number; pageSize?: number; search?: string; sort?: string; order?: string }
): Promise<TableDataResult> {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error("无效的表名格式");
  }

  try {
    const tableCheck = (await query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [tableName]
    )).rows;

    if (tableCheck.length === 0) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    // Get column metadata
    const colRows = (await query(
      `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE = 'NO' as notnull,
              COLUMN_DEFAULT as dflt_value, COLUMN_KEY = 'PRI' as pk
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [tableName]
    )).rows as Array<{ name: string; type: string; notnull: number; dflt_value: unknown; pk: number }>;

    const columnMeta: ColumnMeta[] = colRows.map(c => ({
      name: c.name,
      type: c.type,
      notnull: !!c.notnull,
      dfltValue: c.dflt_value,
      pk: !!c.pk,
    }));

    // Text-like columns for search
    const textColumns = colRows
      .filter(c => ["varchar", "text", "longtext", "mediumtext", "char", "enum"].includes(c.type.toLowerCase()))
      .map(c => c.name);

    const { page, pageSize, offset } = buildPagination(params.page, params.pageSize);

    let whereClause = "";
    const queryParams: unknown[] = [];

    if (params.search && textColumns.length > 0) {
      const likeValue = buildLike(params.search);
      const conditions = textColumns.map((col) => `\`${col}\` LIKE ?`);
      whereClause = ` WHERE ${conditions.join(" OR ")}`;
      for (const _ of textColumns) {
        queryParams.push(likeValue);
      }
    }

    const countResult = (await query(`SELECT COUNT(*) as cnt FROM \`${tableName}\`${whereClause}`, [...queryParams])).rows[0] as { cnt: number };
    const total = countResult.cnt;

    let orderClause = "";
    if (params.sort) {
      if (!/^[a-zA-Z0-9_]+$/.test(params.sort)) {
        throw new Error("无效的排序字段名");
      }
      const sortOrder = params.order?.toUpperCase() === "DESC" ? "DESC" : "ASC";
      orderClause = ` ORDER BY \`${params.sort}\` ${sortOrder}`;
    }

    const rows = (await query(`SELECT * FROM \`${tableName}\`${whereClause}${orderClause} LIMIT ? OFFSET ?`, [...queryParams, pageSize, offset])).rows as Record<string, unknown>[];

    return {
      columns: columnMeta,
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes("不存在") || error.message.includes("无效"))) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "获取表数据失败";
    throw new Error(message);
  }
}

// ==================== Backup ====================

export function getBackupList(): BackupMeta[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("tingstudio_backup_") && f.endsWith(".json"))
      .sort()
      .reverse();

    const result: BackupMeta[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content) as ExportDataV2;

        result.push({
          fileName: file,
          version: data.version || "2.0",
          exportedAt: data.exportedAt,
          tableCount: data.meta?.totalTables ?? data.tables.length,
          totalRows: data.meta?.totalRows ?? 0,
          hash: data.meta?.schemaHash?.slice(0, 16) ?? "",
          fileSize: formatFileSize(stat.size),
        });
      } catch {
        continue;
      }
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取备份列表失败";
    throw new Error(message);
  }
}

export async function createBackup(): Promise<Record<string, unknown>> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outputFile = path.join(BACKUP_DIR, `tingstudio_backup_${timestamp}.json`);

    const tables = (await query(
      "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
      []
    )).rows as { name: string }[];

    const exportData: ExportDataV2 = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      tables: [],
      meta: {
        totalRows: 0,
        totalTables: tables.length,
        schemaHash: "",
      },
    };

    let totalRows = 0;
    const schemaHashParts: string[] = [];

    for (const table of tables) {
      const tableName = table.name;

      // Get columns
      const colRows = (await query(
        `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE = 'NO' as notnull,
                COLUMN_DEFAULT as dflt_value, COLUMN_KEY = 'PRI' as pk
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [tableName]
      )).rows as ColumnInfo[];

      // Get foreign keys
      const fkRows = (await query(
        `SELECT COLUMN_NAME as \`from\`, REFERENCED_TABLE_NAME as \`table\`, REFERENCED_COLUMN_NAME as \`to\`
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [tableName]
      )).rows as ForeignKeyInfo[];

      // Get rows
      const rows = (await query(`SELECT * FROM \`${tableName}\``, [])).rows as Record<string, unknown>[];

      // Sanitize sensitive data
      let sanitizedRows = rows;
      if (tableName === "users") {
        sanitizedRows = rows.map(row => ({ ...row, password: "[REDACTED]" }));
      }
      if (tableName === "ai_models") {
        sanitizedRows = rows.map(row => ({ ...row, api_key: row.api_key ? "[REDACTED]" : null }));
      }

      const rowsJson = JSON.stringify(sanitizedRows);
      const dataHash = computeHash(rowsJson);
      schemaHashParts.push(tableName);

      exportData.tables.push({
        schema: {
          name: tableName,
          columns: colRows,
          foreignKeys: fkRows,
          rowCount: rows.length,
          dataHash,
        },
        rows: sanitizedRows,
      });

      totalRows += rows.length;
    }

    exportData.meta.totalRows = totalRows;
    exportData.meta.schemaHash = computeHash(schemaHashParts.join("|"));

    const jsonStr = JSON.stringify(exportData, null, 2);
    fs.writeFileSync(outputFile, jsonStr, "utf-8");

    const fileSize = fs.statSync(outputFile).size;

    // Keep only last 10 backups
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("tingstudio_backup_") && f.endsWith(".json"))
      .sort()
      .reverse();
    const MAX_BACKUPS = 10;
    for (let i = MAX_BACKUPS; i < backupFiles.length; i++) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, backupFiles[i]));
      } catch { /* ignore */ }
    }

    return {
      fileName: path.basename(outputFile),
      version: exportData.version,
      exportedAt: exportData.exportedAt,
      tableCount: tables.length,
      totalRows,
      fileSize: formatFileSize(fileSize),
      hash: exportData.meta.schemaHash.slice(0, 16),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "创建备份失败";
    throw new Error(message);
  }
}

export async function restoreBackup(fileName: string): Promise<Record<string, unknown>> {
  if (!/^tingstudio_backup_[\w\-]+\.json$/.test(fileName)) {
    throw new Error("无效的备份文件名格式");
  }

  try {
    const filePath = path.join(BACKUP_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`备份文件不存在: ${fileName}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const backupData = JSON.parse(content) as ExportDataV2;

    if (!backupData.version || !backupData.tables || !Array.isArray(backupData.tables)) {
      throw new Error("无效的备份文件格式");
    }

    let insertedTotal = 0;
    let skippedTotal = 0;

    await transactionAsync(async () => {
      for (const tableInfo of backupData.tables) {
        const { schema, rows } = tableInfo;
        const tableName = schema.name;

        if (rows.length === 0) continue;

        await execute(`DELETE FROM \`${tableName}\``, []);

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const colNames = columns.map((c) => `\`${c}\``).join(", ");
        const insertSql = `INSERT INTO \`${tableName}\` (${colNames}) VALUES (${placeholders})`;

        for (const row of rows) {
          try {
            const values = columns.map((col) => (row as Record<string, unknown>)[col] ?? null);
            await execute(insertSql, values);
            insertedTotal++;
          } catch {
            skippedTotal++;
          }
        }
      }
    });

    return {
      fileName,
      tableCount: backupData.tables.length,
      insertedRows: insertedTotal,
      skippedRows: skippedTotal,
      restoredAt: now(),
    };
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes("不存在") || error.message.includes("无效"))) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "恢复备份失败";
    throw new Error(message);
  }
}

export function deleteBackup(fileName: string): Record<string, unknown> {
  if (!/^tingstudio_backup_[\w\-]+\.json$/.test(fileName)) {
    throw new Error("无效的备份文件名格式");
  }

  try {
    const filePath = path.join(BACKUP_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`备份文件不存在: ${fileName}`);
    }

    fs.unlinkSync(filePath);

    return { fileName, deleted: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("不存在")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "删除备份失败";
    throw new Error(message);
  }
}

export function readBackupFile(fileName: string): Buffer | null {
  if (!/^tingstudio_backup_[\w\-]+\.json$/.test(fileName)) {
    throw new Error("无效的备份文件名格式");
  }

  try {
    const filePath = path.join(BACKUP_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "读取备份文件失败";
    throw new Error(message);
  }
}

export async function uploadAndRestore(file: { buffer: Buffer; originalname: string }): Promise<Record<string, unknown>> {
  try {
    let backupData: ExportDataV2;
    try {
      backupData = JSON.parse(file.buffer.toString("utf-8")) as ExportDataV2;
    } catch {
      throw new Error("无法解析上传的文件，请确保为有效的JSON备份文件");
    }

    if (!backupData.version || !backupData.tables || !Array.isArray(backupData.tables)) {
      throw new Error("无效的备份文件格式，缺少必要字段");
    }

    let insertedTotal = 0;
    let skippedTotal = 0;

    await transactionAsync(async () => {
      for (const tableInfo of backupData.tables) {
        const { schema, rows } = tableInfo;
        const tableName = schema.name;

        if (rows.length === 0) continue;

        await execute(`DELETE FROM \`${tableName}\``, []);

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const colNames = columns.map((c) => `\`${c}\``).join(", ");
        const insertSql = `INSERT INTO \`${tableName}\` (${colNames}) VALUES (${placeholders})`;

        for (const row of rows) {
          try {
            const values = columns.map((col) => (row as Record<string, unknown>)[col] ?? null);
            await execute(insertSql, values);
            insertedTotal++;
          } catch {
            skippedTotal++;
          }
        }
      }
    });

    return {
      originalName: file.originalname,
      tableCount: backupData.tables.length,
      insertedRows: insertedTotal,
      skippedRows: skippedTotal,
      restoredAt: now(),
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("无法解析")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "上传恢复失败";
    throw new Error(message);
  }
}

// ==================== Scripts ====================

export async function getScriptList(): Promise<Record<string, unknown>> {
  try {
    await ensureScriptLogsTable();

    const logMap = new Map<string, { lastExecutedAt: string | null; lastStatus: string | null }>();

    try {
      const logs = (await query("SELECT script_id, started_at, status FROM db_script_logs ORDER BY started_at DESC", [])).rows as { script_id: string; started_at: string; status: string }[];

      for (const log of logs) {
        if (!logMap.has(log.script_id)) {
          logMap.set(log.script_id, {
            lastExecutedAt: log.started_at,
            lastStatus: log.status,
          });
        }
      }
    } catch {
      // logMap remains empty
    }

    const allScripts = getAllScriptDefinitions();

    const grouped: Record<string, ScriptDefinition[]> = {};
    for (const script of allScripts) {
      if (!grouped[script.category]) {
        grouped[script.category] = [];
      }
      grouped[script.category].push(script);
    }

    const scripts = allScripts.map((script) => {
      const logInfo = logMap.get(script.id);
      return {
        ...script,
        lastExecutedAt: logInfo?.lastExecutedAt ?? null,
        lastStatus: logInfo?.lastStatus ?? null,
      };
    });

    return {
      categories: Object.keys(grouped),
      scripts,
      total: allScripts.length,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取脚本列表失败";
    throw new Error(message);
  }
}

export async function executeScript(
  scriptId: string,
  triggeredBy: string
): Promise<Record<string, unknown>> {
  if (!/^[a-zA-Z0-9\-_]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  const allScripts = getAllScriptDefinitions();
  const script = allScripts.find((s) => s.id === scriptId);
  if (!script) {
    throw new Error(`脚本不存在: ${scriptId}`);
  }

  try {
    await ensureScriptLogsTable();

    const logId = generateId();
    const startedAt = now();

    await execute(
      `INSERT INTO db_script_logs (id, script_id, script_name, triggered_by, status, started_at)
       VALUES (?, ?, ?, ?, 'running', ?)`,
      [logId, script.id, script.name, triggeredBy, startedAt]
    );

    const scriptPath = path.resolve(SCRIPTS_DIR, script.scriptPath);

    if (!fs.existsSync(scriptPath)) {
      await execute(
        "UPDATE db_script_logs SET status = ?, error_message = ?, completed_at = ? WHERE id = ?",
        ["failed", `脚本文件不存在: ${script.scriptPath}`, now(), logId]
      );
      throw new Error(`脚本文件不存在: ${script.scriptPath}`);
    }

    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execFileAsync(
        "npx",
        ["tsx", scriptPath],
        {
          cwd: path.resolve(__dirname, "../../"),
          timeout: 300000,
          maxBuffer: 10 * 1024 * 1024,
          shell: process.platform === "win32",
        }
      );

      const durationMs = Date.now() - startTime;
      const completedAt = now();
      const resultSummary = (stdout || "").slice(0, 2000);

      await execute(
        "UPDATE db_script_logs SET status = ?, completed_at = ?, duration_ms = ?, result_summary = ? WHERE id = ?",
        ["completed", completedAt, durationMs, resultSummary, logId]
      );

      return {
        scriptId: script.id,
        scriptName: script.name,
        status: "completed",
        durationMs,
        resultSummary,
        stderr: stderr ? stderr.slice(0, 1000) : null,
      };
    } catch (execError: unknown) {
      const durationMs = Date.now() - startTime;
      const completedAt = now();
      const errorMessage = execError instanceof Error ? execError.message : "脚本执行失败";

      await execute(
        "UPDATE db_script_logs SET status = ?, completed_at = ?, duration_ms = ?, error_message = ? WHERE id = ?",
        ["failed", completedAt, durationMs, errorMessage.slice(0, 2000), logId]
      );

      return {
        scriptId: script.id,
        scriptName: script.name,
        status: "failed",
        durationMs,
        errorMessage,
      };
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("不存在")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "执行脚本失败";
    throw new Error(message);
  }
}

export async function getScriptHistory(
  scriptId: string,
  limit: number = 20
): Promise<ScriptLogRow[]> {
  if (!/^[a-zA-Z0-9\-_]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  try {
    await ensureScriptLogsTable();

    const safeLimit = Math.min(100, Math.max(1, limit));

    const rows = (await query(
      "SELECT * FROM db_script_logs WHERE script_id = ? ORDER BY started_at DESC LIMIT ?",
      [scriptId, safeLimit]
    )).rows as Record<string, unknown>[];

    return rows.map((row) => rowToCamelCase<ScriptLogRow>(row));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取脚本历史失败";
    throw new Error(message);
  }
}

export function getScriptContent(scriptId: string): { content: string; scriptPath: string } {
  if (!/^[a-zA-Z0-9\-_]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  const allScripts = getAllScriptDefinitions();
  const script = allScripts.find((s) => s.id === scriptId);
  if (!script) {
    throw new Error(`脚本不存在: ${scriptId}`);
  }

  const scriptPath = path.resolve(SCRIPTS_DIR, script.scriptPath);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`脚本文件不存在: ${script.scriptPath}`);
  }

  const content = fs.readFileSync(scriptPath, "utf-8");
  return { content, scriptPath: script.scriptPath };
}

export async function saveScriptContent(
  scriptId: string,
  content: string,
  savedBy: string = "unknown",
  changeSummary?: string
): Promise<{ scriptPath: string }> {
  if (!/^[a-zA-Z0-9\-_]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  const allScripts = getAllScriptDefinitions();
  const script = allScripts.find((s) => s.id === scriptId);
  if (!script) {
    throw new Error(`脚本不存在: ${scriptId}`);
  }

  const scriptPath = path.resolve(SCRIPTS_DIR, script.scriptPath);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`脚本文件不存在: ${script.scriptPath}`);
  }

  const currentContent = fs.readFileSync(scriptPath, "utf-8");
  if (currentContent !== content) {
    await ensureScriptVersionsTable();

    const versionId = generateId();
    const trimmedSummary = changeSummary && changeSummary.length > MAX_CHANGE_SUMMARY_LENGTH
      ? changeSummary.slice(0, MAX_CHANGE_SUMMARY_LENGTH)
      : changeSummary;

    await transactionAsync(async () => {
      await execute(
        `INSERT INTO db_script_versions (id, script_id, script_name, script_path, content, saved_by, saved_at, change_summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [versionId, script.id, script.name, script.scriptPath, currentContent, savedBy, now(), trimmedSummary ?? null]
      );

      // Keep only last N versions per script
      const versionsToDelete = (await execute(
        `SELECT id FROM db_script_versions WHERE script_id = ? ORDER BY saved_at DESC LIMIT 18446744073709551615 OFFSET ?`,
        [scriptId, MAX_VERSIONS_PER_SCRIPT]
      )).rows as { id: string }[];
      for (const v of versionsToDelete) {
        await execute("DELETE FROM db_script_versions WHERE id = ?", [v.id]);
      }
    });
  }

  fs.writeFileSync(scriptPath, content, "utf-8");
  return { scriptPath: script.scriptPath };
}

export interface ScriptVersionRow {
  id: string;
  scriptId: string;
  scriptName: string;
  scriptPath: string;
  content: string;
  savedBy: string;
  savedAt: string;
  changeSummary: string | null;
}

export async function getScriptVersions(scriptId: string, limit: number = 20): Promise<ScriptVersionRow[]> {
  if (!/^[a-zA-Z0-9\-_]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  try {
    await ensureScriptVersionsTable();

    const safeLimit = Math.min(50, Math.max(1, limit));

    const rows = (await query(
      "SELECT * FROM db_script_versions WHERE script_id = ? ORDER BY saved_at DESC LIMIT ?",
      [scriptId, safeLimit]
    )).rows as Record<string, unknown>[];

    return rows.map((row) => rowToCamelCase<ScriptVersionRow>(row));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取脚本版本历史失败";
    throw new Error(message);
  }
}

export async function restoreScriptVersion(scriptId: string, versionId: string, savedBy: string = "unknown"): Promise<{ scriptPath: string }> {
  if (!/^[a-zA-Z0-9\-_]+$/.test(scriptId) || !/^[a-zA-Z0-9\-_]+$/.test(versionId)) {
    throw new Error("无效的ID格式");
  }

  try {
    await ensureScriptVersionsTable();

    const versionRow = (await query(
      "SELECT * FROM db_script_versions WHERE id = ? AND script_id = ?",
      [versionId, scriptId]
    )).rows[0] as Record<string, unknown> | undefined;

    if (!versionRow) {
      throw new Error("版本记录不存在");
    }

    const version = rowToCamelCase<ScriptVersionRow>(versionRow);

    const allScripts = getAllScriptDefinitions();
    const script = allScripts.find((s) => s.id === scriptId);
    if (!script) {
      throw new Error(`脚本不存在: ${scriptId}`);
    }

    const scriptPath = path.resolve(SCRIPTS_DIR, script.scriptPath);
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`脚本文件不存在: ${script.scriptPath}`);
    }

    const currentContent = fs.readFileSync(scriptPath, "utf-8");
    const autoVersionId = generateId();

    await execute(
      `INSERT INTO db_script_versions (id, script_id, script_name, script_path, content, saved_by, saved_at, change_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [autoVersionId, script.id, script.name, script.scriptPath, currentContent, savedBy, now(), "恢复版本前自动备份"]
    );

    fs.writeFileSync(scriptPath, version.content, "utf-8");
    return { scriptPath: script.scriptPath };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("不存在")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "恢复脚本版本失败";
    throw new Error(message);
  }
}
