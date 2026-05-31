import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

import { getDb, query, transaction } from "../config/database-better-sqlite3.js";
import { getDatabaseType } from "../config/database-adapter.js";
import { generateId, now, success, rowToCamelCase, buildPagination, buildLike } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../data/tingstudio.db");
const BACKUP_DIR = path.resolve(__dirname, "../../data/backup");
const SCRIPTS_DIR = path.resolve(__dirname, "../scripts");

const execFileAsync = promisify(execFile);

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
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
  dbPath: string;
  sqliteVersion: string;
  tables: {
    schema: {
      name: string;
      sql: string;
      columns: ColumnInfo[];
      foreignKeys: ForeignKeyInfo[];
      rowCount: number;
      dataHash: string;
    };
    rows: Record<string, unknown>[];
  }[];
  indexes: { name: string; tbl_name: string; sql: string }[];
  triggers: { name: string; tbl_name: string; sql: string }[];
  meta: {
    totalRows: number;
    totalTables: number;
    totalIndexes: number;
    totalTriggers: number;
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
    description: "修复原料表中的异常数据",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixMaterials.ts",
    estimatedTime: "10-30s",
    details: ["修复原料名称中的乱码", "修正原料编码格式", "补全缺失的必填字段"],
  },
  {
    id: "fix-material-codes",
    name: "修复原料编码",
    description: "重新生成所有原料的编码",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixMaterialCodes.ts",
    estimatedTime: "5-15s",
    details: ["根据拼音首字母重新生成编码", "确保编码唯一性", "更新关联数据"],
  },
  {
    id: "fix-created-by",
    name: "修复创建人字段",
    description: "修复数据中缺失或错误的创建人信息",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixCreatedBy.ts",
    estimatedTime: "5-10s",
    details: ["补全缺失的created_by字段", "修正无效的用户引用", "同步创建人名称"],
  },
  {
    id: "seed-data",
    name: "初始化种子数据",
    description: "插入预设的基础数据",
    category: "seed",
    dangerLevel: "low",
    scriptPath: "seedData.ts",
    estimatedTime: "5-10s",
    details: ["插入默认用户", "插入示例配方", "插入基础原料"],
  },
  {
    id: "seed-enum-options",
    name: "初始化枚举选项",
    description: "插入系统枚举选项数据",
    category: "seed",
    dangerLevel: "low",
    scriptPath: "seedEnumOptions.ts",
    estimatedTime: "3-5s",
    details: ["插入原料类型选项", "插入配方分类选项", "插入单位选项"],
  },
  {
    id: "seed-preset-profiles",
    name: "初始化预设营养档案",
    description: "插入预设的营养成分档案数据",
    category: "seed",
    dangerLevel: "low",
    scriptPath: "seedPresetProfiles.ts",
    estimatedTime: "5-10s",
    details: ["插入常见药材营养数据", "插入辅料营养数据", "设置NRV参考值"],
  },
  {
    id: "import-materials-excel",
    name: "从Excel导入原料",
    description: "从Excel文件批量导入原料数据",
    category: "import",
    dangerLevel: "medium",
    scriptPath: "importMaterialsFromExcel.ts",
    estimatedTime: "30-60s",
    details: ["读取Excel文件", "解析原料信息", "批量写入数据库"],
  },
  {
    id: "import-real-data",
    name: "导入真实数据",
    description: "导入真实业务数据到系统",
    category: "import",
    dangerLevel: "medium",
    scriptPath: "importRealData.ts",
    estimatedTime: "30-120s",
    details: ["读取数据源", "数据清洗转换", "批量导入并验证"],
  },
  {
    id: "clean-invalid-materials",
    name: "清理无效原料",
    description: "删除无效或重复的原料记录",
    category: "clean",
    dangerLevel: "high",
    scriptPath: "cleanInvalidMaterials.ts",
    estimatedTime: "10-30s",
    details: ["检测重复原料", "删除无效记录", "清理关联数据"],
  },
  {
    id: "clean-old-materials",
    name: "清理过期原料",
    description: "清理标记为删除的过期原料数据",
    category: "clean",
    dangerLevel: "high",
    scriptPath: "cleanOldMaterials.ts",
    estimatedTime: "10-30s",
    details: ["查找过期原料", "删除关联营养数据", "释放存储空间"],
  },
  {
    id: "verify-data",
    name: "数据完整性验证",
    description: "验证数据库中数据的完整性和一致性",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "verifyData.ts",
    estimatedTime: "10-30s",
    details: ["检查外键完整性", "验证数据格式", "生成验证报告"],
  },
  {
    id: "check-users",
    name: "检查用户数据",
    description: "检查用户表数据的完整性",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "checkUsers.ts",
    estimatedTime: "3-5s",
    details: ["检查用户角色", "验证认证信息", "统计用户活跃度"],
  },
  {
    id: "check-ai-usage",
    name: "检查AI用量",
    description: "检查AI调用日志和用量统计",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "check-ai-usage.ts",
    estimatedTime: "5-10s",
    details: ["统计AI调用量", "检查用量日志", "验证Token消耗记录"],
  },
  {
    id: "migrate-ratio-factor",
    name: "迁移比系数",
    description: "迁移配方比系数字段到新格式",
    category: "migrate",
    dangerLevel: "medium",
    scriptPath: "migrate-ratio-factor.ts",
    estimatedTime: "10-30s",
    details: ["读取旧比系数", "转换为新格式", "更新所有配方"],
  },
  {
    id: "sync-material-types",
    name: "同步原料类型",
    description: "同步原料类型字段到最新分类",
    category: "migrate",
    dangerLevel: "medium",
    scriptPath: "syncMaterialTypes.ts",
    estimatedTime: "10-30s",
    details: ["扫描原料类型", "映射到新分类", "更新数据库记录"],
  },
  {
    id: "generate-formula-codes",
    name: "生成配方编码",
    description: "为缺少编码的配方自动生成编码",
    category: "migrate",
    dangerLevel: "medium",
    scriptPath: "generateFormulaCodes.ts",
    estimatedTime: "5-15s",
    details: ["查找缺失编码的配方", "根据名称生成编码", "确保编码唯一性"],
  },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function computeHash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
}

function ensureScriptLogsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_script_logs (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL,
      script_name TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      completed_at TEXT DEFAULT NULL,
      duration_ms INTEGER DEFAULT NULL,
      result_summary TEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_script_logs_script_id ON db_script_logs(script_id);
    CREATE INDEX IF NOT EXISTS idx_script_logs_status ON db_script_logs(status);
    CREATE INDEX IF NOT EXISTS idx_script_logs_started_at ON db_script_logs(started_at)
  `);
}

export function getDbInfo(): Record<string, unknown> {
  try {
    const dbType = getDatabaseType();
    let fileSize = 0;
    let lastUpdated: string | null = null;

    if (fs.existsSync(DB_PATH)) {
      const stat = fs.statSync(DB_PATH);
      fileSize = stat.size;
      lastUpdated = stat.mtime.toISOString();
    }

    const db = getDb();

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[];

    let totalRows = 0;
    for (const t of tables) {
      const result = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get() as { cnt: number };
      totalRows += result.cnt;
    }

    return {
      dbType,
      dbPath: DB_PATH,
      fileSize: formatFileSize(fileSize),
      fileSizeBytes: fileSize,
      tableCount: tables.length,
      totalRows,
      lastUpdated,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取数据库信息失败";
    throw new Error(message);
  }
}

export function getTableList(): Record<string, unknown>[] {
  try {
    const db = getDb();

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as { name: string }[];

    const result: Record<string, unknown>[] = [];

    for (const t of tables) {
      const tableName = t.name;

      const countResult = db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get() as { cnt: number };

      const columns = db.pragma(`table_info("${tableName}")`) as ColumnInfo[];

      const indexCount = (db.prepare(
        "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%'"
      ).get(tableName) as { cnt: number }).cnt;

      result.push({
        name: tableName,
        rowCount: countResult.cnt,
        columnCount: columns.length,
        indexCount,
      });
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取表列表失败";
    throw new Error(message);
  }
}

export function getTableSchema(tableName: string): TableSchemaResult {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error("无效的表名格式");
  }

  try {
    const db = getDb();

    const tableCheck = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ? AND name NOT LIKE 'sqlite_%'"
    ).get(tableName) as { name: string } | undefined;

    if (!tableCheck) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    const columns = db.pragma(`table_info("${tableName}")`) as ColumnInfo[];

    const indexList = db.pragma(`index_list("${tableName}")`) as {
      seq: number;
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }[];

    const indexes: IndexInfo[] = [];
    for (const idx of indexList) {
      const idxInfo = db.pragma(`index_info("${idx.name}")`) as {
        seqno: number;
        cid: number;
        name: string;
      }[];

      const idxSql = (db.prepare(
        "SELECT sql FROM sqlite_master WHERE type='index' AND name = ?"
      ).get(idx.name) as { sql: string | null } | undefined)?.sql ?? null;

      indexes.push({
        name: idx.name,
        tblName: tableName,
        sql: idxSql,
        unique: idx.unique === 1,
        columns: idxInfo.map((i) => i.name),
      });
    }

    const fkList = db.pragma(`foreign_key_list("${tableName}")`) as {
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
      match: string;
    }[];

    const foreignKeys: ForeignKeyInfo[] = fkList.map((fk) => ({
      from: fk.from,
      table: fk.table,
      to: fk.to,
    }));

    return {
      name: tableName,
      columns,
      indexes,
      foreignKeys,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("不存在")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "获取表结构失败";
    throw new Error(message);
  }
}

export function getTableData(
  tableName: string,
  params: { page?: number; pageSize?: number; search?: string; sort?: string; order?: string }
): TableDataResult {
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    throw new Error("无效的表名格式");
  }

  try {
    const db = getDb();

    const tableCheck = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ? AND name NOT LIKE 'sqlite_%'"
    ).get(tableName) as { name: string } | undefined;

    if (!tableCheck) {
      throw new Error(`表 ${tableName} 不存在`);
    }

    const columns = db.pragma(`table_info("${tableName}")`) as ColumnInfo[];
    const columnMeta: ColumnMeta[] = columns.map((c) => ({
      name: c.name,
      type: c.type,
      notnull: c.notnull === 1,
      dfltValue: c.dflt_value,
      pk: c.pk === 1,
    }));

    const textColumns = columns
      .filter((c) => c.type.toUpperCase() === "TEXT" || c.type.toUpperCase() === "")
      .map((c) => c.name);

    const { page, pageSize, offset } = buildPagination(params.page, params.pageSize);

    let whereClause = "";
    const queryParams: unknown[] = [];

    if (params.search && textColumns.length > 0) {
      const likeValue = buildLike(params.search);
      const conditions = textColumns.map((col) => `"${col}" LIKE ?`);
      whereClause = ` WHERE ${conditions.join(" OR ")}`;
      for (const _ of textColumns) {
        queryParams.push(likeValue);
      }
    }

    const countResult = db.prepare(
      `SELECT COUNT(*) as cnt FROM "${tableName}"${whereClause}`
    ).get(...queryParams) as { cnt: number };
    const total = countResult.cnt;

    let orderClause = "";
    if (params.sort) {
      if (!/^[a-zA-Z0-9_]+$/.test(params.sort)) {
        throw new Error("无效的排序字段名");
      }
      const sortOrder = params.order?.toUpperCase() === "DESC" ? "DESC" : "ASC";
      orderClause = ` ORDER BY "${params.sort}" ${sortOrder}`;
    }

    const rows = db.prepare(
      `SELECT * FROM "${tableName}"${whereClause}${orderClause} LIMIT ? OFFSET ?`
    ).all(...queryParams, pageSize, offset) as Record<string, unknown>[];

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
          version: data.version || "1.0",
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

export function createBackup(): Record<string, unknown> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outputFile = path.join(BACKUP_DIR, `tingstudio_backup_${timestamp}.json`);

    const tables = db.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as { name: string; sql: string }[];

    const indexes = db.prepare(
      "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as { name: string; tbl_name: string; sql: string }[];

    const triggers = db.prepare(
      "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as { name: string; tbl_name: string; sql: string }[];

    const exportData: ExportDataV2 = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      dbPath: DB_PATH,
      sqliteVersion: (db.prepare("SELECT sqlite_version() as v").get() as { v: string }).v,
      tables: [],
      indexes,
      triggers,
      meta: {
        totalRows: 0,
        totalTables: tables.length,
        totalIndexes: indexes.length,
        totalTriggers: triggers.length,
        schemaHash: "",
      },
    };

    let totalRows = 0;
    const schemaHashParts: string[] = [];

    for (const table of tables) {
      const tableName = table.name;
      const columns = db.pragma(`table_info("${tableName}")`) as ColumnInfo[];
      const fkList = db.pragma(`foreign_key_list("${tableName}")`) as {
        from: string;
        table: string;
        to: string;
      }[];
      const foreignKeys: ForeignKeyInfo[] = fkList.map((fk) => ({
        from: fk.from,
        table: fk.table,
        to: fk.to,
      }));

      const rows = db.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, unknown>[];
      let sanitizedRows = rows;
      if (tableName === "users") {
        sanitizedRows = rows.map(row => ({
          ...row,
          password: "[REDACTED]",
        }));
      }
      if (tableName === "ai_models") {
        sanitizedRows = rows.map(row => ({
          ...row,
          api_key: row.api_key ? "[REDACTED]" : null,
        }));
      }
      const rowsJson = JSON.stringify(sanitizedRows);
      const dataHash = computeHash(rowsJson);
      schemaHashParts.push(table.sql || "");

      exportData.tables.push({
        schema: {
          name: tableName,
          sql: table.sql,
          columns,
          foreignKeys,
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

    db.close();

    const fileSize = fs.statSync(outputFile).size;

    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("tingstudio_backup_") && f.endsWith(".json"))
      .sort()
      .reverse();
    const MAX_BACKUPS = 10;
    for (let i = MAX_BACKUPS; i < backupFiles.length; i++) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, backupFiles[i]));
      } catch {}
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

export function restoreBackup(fileName: string): Record<string, unknown> {
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

    const db = getDb();

    let insertedTotal = 0;
    let skippedTotal = 0;

    transaction(() => {
      db.pragma("foreign_keys = OFF");

      for (const tableInfo of backupData.tables) {
        const { schema, rows } = tableInfo;
        const tableName = schema.name;

        if (rows.length === 0) continue;

        db.prepare(`DELETE FROM "${tableName}"`).run();

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const colNames = columns.map((c) => `"${c}"`).join(", ");
        const insertSql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`;
        const stmt = db.prepare(insertSql);

        for (const row of rows) {
          try {
            const values = columns.map((col) => (row as Record<string, unknown>)[col] ?? null);
            stmt.run(...values);
            insertedTotal++;
          } catch {
            skippedTotal++;
          }
        }
      }

      db.pragma("foreign_keys = ON");
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

export function uploadAndRestore(file: { buffer: Buffer; originalname: string }): Record<string, unknown> {
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

    const db = getDb();

    let insertedTotal = 0;
    let skippedTotal = 0;

    transaction(() => {
      db.pragma("foreign_keys = OFF");

      for (const tableInfo of backupData.tables) {
        const { schema, rows } = tableInfo;
        const tableName = schema.name;

        if (rows.length === 0) continue;

        db.prepare(`DELETE FROM "${tableName}"`).run();

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const colNames = columns.map((c) => `"${c}"`).join(", ");
        const insertSql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`;
        const stmt = db.prepare(insertSql);

        for (const row of rows) {
          try {
            const values = columns.map((col) => (row as Record<string, unknown>)[col] ?? null);
            stmt.run(...values);
            insertedTotal++;
          } catch {
            skippedTotal++;
          }
        }
      }

      db.pragma("foreign_keys = ON");
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

export function getScriptList(): Record<string, unknown> {
  try {
    ensureScriptLogsTable();

    const db = getDb();
    const logMap = new Map<string, { lastExecutedAt: string | null; lastStatus: string | null }>();

    try {
      const logs = db.prepare(
        "SELECT script_id, started_at, status FROM db_script_logs ORDER BY started_at DESC"
      ).all() as { script_id: string; started_at: string; status: string }[];

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

    const grouped: Record<string, ScriptDefinition[]> = {};
    for (const script of SCRIPT_REGISTRY) {
      if (!grouped[script.category]) {
        grouped[script.category] = [];
      }
      grouped[script.category].push(script);
    }

    const scripts = SCRIPT_REGISTRY.map((script) => {
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
      total: SCRIPT_REGISTRY.length,
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
  if (!/^[a-zA-Z0-9\-]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  const script = SCRIPT_REGISTRY.find((s) => s.id === scriptId);
  if (!script) {
    throw new Error(`脚本不存在: ${scriptId}`);
  }

  try {
    ensureScriptLogsTable();

    const logId = generateId();
    const startedAt = now();

    const db = getDb();
    db.prepare(
      `INSERT INTO db_script_logs (id, script_id, script_name, triggered_by, status, started_at)
       VALUES (?, ?, ?, ?, 'running', ?)`
    ).run(logId, script.id, script.name, triggeredBy, startedAt);

    const scriptPath = path.resolve(SCRIPTS_DIR, script.scriptPath);

    if (!fs.existsSync(scriptPath)) {
      db.prepare(
        "UPDATE db_script_logs SET status = ?, error_message = ?, completed_at = ? WHERE id = ?"
      ).run("failed", `脚本文件不存在: ${script.scriptPath}`, now(), logId);

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
        }
      );

      const durationMs = Date.now() - startTime;
      const completedAt = now();

      const resultSummary = (stdout || "").slice(0, 2000);

      db.prepare(
        "UPDATE db_script_logs SET status = ?, completed_at = ?, duration_ms = ?, result_summary = ? WHERE id = ?"
      ).run("completed", completedAt, durationMs, resultSummary, logId);

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

      db.prepare(
        "UPDATE db_script_logs SET status = ?, completed_at = ?, duration_ms = ?, error_message = ? WHERE id = ?"
      ).run("failed", completedAt, durationMs, errorMessage.slice(0, 2000), logId);

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

export function getScriptHistory(
  scriptId: string,
  limit: number = 20
): ScriptLogRow[] {
  if (!/^[a-zA-Z0-9\-]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  try {
    ensureScriptLogsTable();

    const db = getDb();
    const safeLimit = Math.min(100, Math.max(1, limit));

    const rows = db.prepare(
      "SELECT * FROM db_script_logs WHERE script_id = ? ORDER BY started_at DESC LIMIT ?"
    ).all(scriptId, safeLimit) as Record<string, unknown>[];

    return rows.map((row) => rowToCamelCase<ScriptLogRow>(row));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取脚本历史失败";
    throw new Error(message);
  }
}
