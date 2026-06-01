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
    id: "fix-all-material-codes",
    name: "修复全部原料编码",
    description: "批量修复所有原料编码异常",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixAllMaterialCodes.ts",
    estimatedTime: "10-30s",
    details: ["扫描所有原料", "批量修复编码", "更新关联表"],
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
    id: "fix-diju",
    name: "修复地级数据",
    description: "修复原料地级字段异常数据",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "fixDiju.ts",
    estimatedTime: "5-10s",
    details: ["扫描地级字段", "修复异常值", "标准化数据格式"],
  },
  {
    id: "refresh-material-updated-at",
    name: "刷新原料更新时间",
    description: "批量刷新所有原料的updated_at字段",
    category: "fix",
    dangerLevel: "low",
    scriptPath: "refreshMaterialUpdatedAt.ts",
    estimatedTime: "5-10s",
    details: ["扫描所有原料", "更新更新时间戳", "保持数据一致性"],
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
    id: "seed-permissions",
    name: "初始化权限数据",
    description: "插入RBAC权限和角色数据",
    category: "seed",
    dangerLevel: "low",
    scriptPath: "seedPermissions.ts",
    estimatedTime: "5-10s",
    details: ["插入权限定义", "分配角色权限", "设置系统角色"],
  },
  {
    id: "seed-enhanced-data",
    name: "初始化增强数据",
    description: "插入增强版种子数据",
    category: "seed",
    dangerLevel: "low",
    scriptPath: "seedEnhancedData.ts",
    estimatedTime: "10-20s",
    details: ["插入扩展业务数据", "初始化高级配置", "填充示例数据"],
  },
  {
    id: "fill-material-enums",
    name: "填充原料枚举",
    description: "为原料填充枚举字段值",
    category: "seed",
    dangerLevel: "low",
    scriptPath: "fillMaterialEnums.ts",
    estimatedTime: "5-10s",
    details: ["扫描原料缺失枚举", "根据规则填充", "更新数据库"],
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
    id: "import-real-materials",
    name: "导入真实原料",
    description: "导入真实原料数据",
    category: "import",
    dangerLevel: "medium",
    scriptPath: "importRealMaterials.ts",
    estimatedTime: "30-60s",
    details: ["读取原料数据源", "解析并清洗", "批量写入数据库"],
  },
  {
    id: "import-to-database",
    name: "通用数据导入",
    description: "通用数据导入数据库工具",
    category: "import",
    dangerLevel: "medium",
    scriptPath: "importToDatabase.ts",
    estimatedTime: "30-120s",
    details: ["读取数据文件", "格式转换", "写入数据库"],
  },
  {
    id: "import-formulas-from-files",
    name: "从文件导入配方",
    description: "从数据文件导入配方记录",
    category: "import",
    dangerLevel: "medium",
    scriptPath: "importFormulasFromFiles.ts",
    estimatedTime: "30-60s",
    details: ["扫描配方文件", "解析配方结构", "批量导入"],
  },
  {
    id: "full-data-import",
    name: "全量数据导入",
    description: "执行全量业务数据导入",
    category: "import",
    dangerLevel: "high",
    scriptPath: "fullDataImport.ts",
    estimatedTime: "60-180s",
    details: ["清空现有数据", "全量导入", "数据校验"],
  },
  {
    id: "reimport-all-materials",
    name: "重新导入全部原料",
    description: "重新导入所有原料数据",
    category: "import",
    dangerLevel: "high",
    scriptPath: "reimportAllMaterials.ts",
    estimatedTime: "60-120s",
    details: ["删除现有原料", "重新导入", "重建关联"],
  },
  {
    id: "import-nutrition-data",
    name: "导入营养数据",
    description: "导入原料营养成分数据",
    category: "import",
    dangerLevel: "medium",
    scriptPath: "importNutritionData.ts",
    estimatedTime: "30-60s",
    details: ["读取营养数据源", "匹配原料", "写入营养表"],
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
    id: "check-nutrition-table",
    name: "检查营养表状态",
    description: "检查material_nutrition表数据状态",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "checkNutritionTable.ts",
    estimatedTime: "3-5s",
    details: ["统计记录数", "检查is_latest分布", "输出示例数据"],
  },
  {
    id: "check-weekly-report-data",
    name: "检查周报数据",
    description: "检查周报生成所需数据完整性",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "check-weekly-report-data.ts",
    estimatedTime: "5-10s",
    details: ["检查配方数据", "检查原料数据", "检查销售数据"],
  },
  {
    id: "check-reports",
    name: "检查报表数据",
    description: "检查各类报表数据状态",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "check-reports.ts",
    estimatedTime: "5-10s",
    details: ["扫描报表表", "统计数据量", "检查异常"],
  },
  {
    id: "check-sqlite-data",
    name: "检查SQLite数据",
    description: "检查SQLite数据库数据质量",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "check-sqlite-data.ts",
    estimatedTime: "5-10s",
    details: ["检查表完整性", "验证数据格式", "输出诊断报告"],
  },
  {
    id: "verify-nutrition-data",
    name: "验证营养数据",
    description: "验证营养成分数据准确性",
    category: "verify",
    dangerLevel: "low",
    scriptPath: "verifyNutritionData.ts",
    estimatedTime: "10-30s",
    details: ["检查营养素计算", "验证NRV百分比", "排查异常值"],
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
  {
    id: "migrate-to-mysql",
    name: "迁移到MySQL",
    description: "将SQLite数据迁移到MySQL数据库",
    category: "mysql",
    dangerLevel: "high",
    scriptPath: "migrate-to-mysql.ts",
    estimatedTime: "60-180s",
    details: ["连接MySQL", "转换表结构", "迁移数据", "验证一致性"],
  },
  {
    id: "init-database",
    name: "初始化数据库",
    description: "执行数据库表结构初始化",
    category: "init",
    dangerLevel: "high",
    scriptPath: "initDatabase.ts",
    estimatedTime: "10-30s",
    details: ["读取init.sql", "创建表结构", "执行基础迁移"],
  },
  {
    id: "create-admin",
    name: "创建管理员",
    description: "创建默认管理员账号",
    category: "admin",
    dangerLevel: "medium",
    scriptPath: "createAdmin.ts",
    estimatedTime: "3-5s",
    details: ["检查现有用户", "创建admin账号", "输出账号信息"],
  },
  {
    id: "export-database",
    name: "导出数据库",
    description: "导出完整数据库到JSON备份",
    category: "export",
    dangerLevel: "low",
    scriptPath: "exportDatabase.ts",
    estimatedTime: "30-120s",
    details: ["扫描所有表", "导出结构和数据", "生成备份文件"],
  },
  {
    id: "restore-database",
    name: "恢复数据库",
    description: "从JSON备份恢复数据库",
    category: "export",
    dangerLevel: "high",
    scriptPath: "restoreDatabase.ts",
    estimatedTime: "30-120s",
    details: ["读取备份文件", "重建表结构", "导入数据", "一致性校验"],
  },
  {
    id: "audit-supplement-nutrition",
    name: "营养数据排查补充",
    description: "排查并补充原料营养数据",
    category: "nutrition",
    dangerLevel: "medium",
    scriptPath: "auditAndSupplementNutrition.ts",
    estimatedTime: "30-60s",
    details: ["读取Excel参考", "匹配数据库原料", "补充缺失营养数据"],
  },
  {
    id: "analyze-nutrition-files",
    name: "分析营养文件",
    description: "分析营养数据文件内容",
    category: "nutrition",
    dangerLevel: "low",
    scriptPath: "analyzeNutritionFiles.ts",
    estimatedTime: "10-30s",
    details: ["读取营养文件", "分析数据结构", "输出分析报告"],
  },
];

function autoCategorize(fileName: string, relativePath: string): string {
  const lower = fileName.toLowerCase();
  const dir = path.dirname(relativePath).toLowerCase();

  if (dir.includes("migration")) return "migrate";
  if (lower.startsWith("fix")) return "fix";
  if (lower.startsWith("seed")) return "seed";
  if (lower.startsWith("import")) return "import";
  if (lower.startsWith("clean")) return "clean";
  if (lower.startsWith("verify") || lower.startsWith("check") || lower.startsWith("test")) return "verify";
  if (lower.startsWith("migrate")) return "migrate";
  if (lower.startsWith("init")) return "init";
  if (lower.includes("mysql")) return "mysql";
  if (lower.includes("nutrition")) return "nutrition";
  if (lower.startsWith("export")) return "export";
  if (lower.startsWith("create") && (lower.includes("admin") || lower.includes("user"))) return "admin";
  if (lower.startsWith("restore")) return "export";
  if (lower.includes("report") || lower.includes("audit") || lower.includes("analyze")) return "verify";
  return "other";
}

function getAllScriptDefinitions(): ScriptDefinition[] {
  const registeredMap = new Map<string, ScriptDefinition>();
  for (const s of SCRIPT_REGISTRY) {
    registeredMap.set(s.scriptPath, s);
  }

  const discovered = new Map<string, ScriptDefinition>();

  function scanDir(dir: string, baseDir: string) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath, baseDir);
      } else if (/\.(ts|js|cjs|sql)$/.test(item)) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        if (!registeredMap.has(relativePath) && !discovered.has(relativePath)) {
          const category = autoCategorize(item, relativePath);
          const id = relativePath.replace(/\//g, "-").replace(/\.(ts|js|cjs|sql)$/, "");
          const name = item.replace(/\.(ts|js|cjs|sql)$/, "");
          const isDangerous = category === "clean" || category === "migrate" || category === "export" || category === "mysql";
          discovered.set(relativePath, {
            id,
            name,
            description: `脚本文件: ${relativePath}`,
            category,
            dangerLevel: isDangerous ? "high" : "medium",
            scriptPath: relativePath,
            estimatedTime: "未知",
            details: [],
          });
        }
      }
    }
  }

  scanDir(SCRIPTS_DIR, SCRIPTS_DIR);

  return [...SCRIPT_REGISTRY, ...discovered.values()];
}

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

function ensureScriptVersionsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_script_versions (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL,
      script_name TEXT NOT NULL,
      script_path TEXT NOT NULL,
      content TEXT NOT NULL,
      saved_by TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      change_summary TEXT DEFAULT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_script_versions_script_id ON db_script_versions(script_id);
    CREATE INDEX IF NOT EXISTS idx_script_versions_saved_at ON db_script_versions(saved_at)
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
  if (!/^[a-zA-Z0-9\-]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  const allScripts = getAllScriptDefinitions();
  const script = allScripts.find((s) => s.id === scriptId);
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

export function getScriptContent(scriptId: string): { content: string; scriptPath: string } {
  if (!/^[a-zA-Z0-9\-]+$/.test(scriptId)) {
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

export function saveScriptContent(
  scriptId: string,
  content: string,
  savedBy: string = "unknown",
  changeSummary?: string
): { scriptPath: string } {
  if (!/^[a-zA-Z0-9\-]+$/.test(scriptId)) {
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

  // Save current content as a version before overwriting
  const currentContent = fs.readFileSync(scriptPath, "utf-8");
  if (currentContent !== content) {
    ensureScriptVersionsTable();
    const db = getDb();
    const versionId = generateId();
    db.prepare(
      `INSERT INTO db_script_versions (id, script_id, script_name, script_path, content, saved_by, saved_at, change_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(versionId, script.id, script.name, script.scriptPath, currentContent, savedBy, now(), changeSummary ?? null);

    // Keep only last 20 versions per script
    const versionsToDelete = db.prepare(
      `SELECT id FROM db_script_versions WHERE script_id = ? ORDER BY saved_at DESC LIMIT -1 OFFSET 20`
    ).all(scriptId) as { id: string }[];
    for (const v of versionsToDelete) {
      db.prepare("DELETE FROM db_script_versions WHERE id = ?").run(v.id);
    }
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

export function getScriptVersions(scriptId: string, limit: number = 20): ScriptVersionRow[] {
  if (!/^[a-zA-Z0-9\-]+$/.test(scriptId)) {
    throw new Error("无效的脚本ID格式");
  }

  try {
    ensureScriptVersionsTable();

    const db = getDb();
    const safeLimit = Math.min(50, Math.max(1, limit));

    const rows = db.prepare(
      "SELECT * FROM db_script_versions WHERE script_id = ? ORDER BY saved_at DESC LIMIT ?"
    ).all(scriptId, safeLimit) as Record<string, unknown>[];

    return rows.map((row) => rowToCamelCase<ScriptVersionRow>(row));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取脚本版本历史失败";
    throw new Error(message);
  }
}

export function restoreScriptVersion(scriptId: string, versionId: string, savedBy: string = "unknown"): { scriptPath: string } {
  if (!/^[a-zA-Z0-9\-]+$/.test(scriptId) || !/^[a-zA-Z0-9\-]+$/.test(versionId)) {
    throw new Error("无效的ID格式");
  }

  try {
    ensureScriptVersionsTable();

    const db = getDb();
    const versionRow = db.prepare(
      "SELECT * FROM db_script_versions WHERE id = ? AND script_id = ?"
    ).get(versionId, scriptId) as Record<string, unknown> | undefined;

    if (!versionRow) {
      throw new Error("版本记录不存在");
    }

    const version = rowToCamelCase<ScriptVersionRow>(versionRow);

    // Save current content before restoring
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
    db.prepare(
      `INSERT INTO db_script_versions (id, script_id, script_name, script_path, content, saved_by, saved_at, change_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(autoVersionId, script.id, script.name, script.scriptPath, currentContent, savedBy, now(), "恢复版本前自动备份");

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
