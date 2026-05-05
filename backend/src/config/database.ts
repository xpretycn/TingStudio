import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { config } from "./index.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

let db: SqlJsDatabase | null = null;
let SQL: any = null;

async function getSqlJs() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

function ensureColumn(dbInstance: SqlJsDatabase, table: string, col: string, type: string, defaultValue: string) {
  try {
    const cols = dbInstance.exec(`PRAGMA table_info(${table})`);
    const colNames = cols[0]?.values?.map((c: any[]) => c[1]) || [];
    if (!colNames.includes(col)) {
      dbInstance.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type} DEFAULT ${defaultValue}`);
      logger.info(`数据库迁移: 添加列 ${table}.${col}`);
    }
  } catch (_err) {}
}

function ensureTable(dbInstance: SqlJsDatabase, tableName: string, createSql: string) {
  try {
    const exists = dbInstance.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='" + tableName + "'");
    if (!exists[0] || !exists[0].values || exists[0].values.length === 0) {
      dbInstance.exec(createSql);
      logger.info(`数据库迁移: 创建表 ${tableName}`);
    }
  } catch (err) {
    logger.error(`数据库迁移失败: 创建表 ${tableName}`, err);
  }
}

function runAutoMigrations(dbInstance: SqlJsDatabase) {
  ensureColumn(dbInstance, "materials", "material_type", "TEXT", "'herb'");
  ensureColumn(dbInstance, "formulas", "finished_weight", "REAL", "0");
  ensureColumn(dbInstance, "formulas", "ratio_factor", "REAL", "0.18");
  ensureColumn(dbInstance, "formulas", "supplement_ratio_factor", "REAL", "1.0");
  ensureColumn(dbInstance, "formulas", "packaging_price", "REAL", "0");
  ensureColumn(dbInstance, "formulas", "other_price", "REAL", "0");
  ensureColumn(dbInstance, "formulas", "profit_margin", "REAL", "20");
  ensureColumn(dbInstance, "formulas", "preparation_method", "TEXT", "NULL");
  ensureColumn(dbInstance, "formula_versions", "ratio_factor", "REAL", "0.18");
  ensureColumn(dbInstance, "formula_versions", "supplement_ratio_factor", "REAL", "1.0");
  ensureColumn(dbInstance, "materials", "unit_price", "REAL", "NULL");
  ensureColumn(dbInstance, "materials", "data_source", "TEXT", "'manual'");
  ensureTable(
    dbInstance,
    "formula_sales",
    `
    CREATE TABLE formula_sales (
      id TEXT PRIMARY KEY,
      formula_id TEXT NOT NULL,
      salesman_id TEXT NOT NULL,
      period_type TEXT NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT,
      UNIQUE(formula_id, period_type, period_start)
    );
    CREATE INDEX IF NOT EXISTS idx_fs_formula ON formula_sales(formula_id);
    CREATE INDEX IF NOT EXISTS idx_fs_salesman ON formula_sales(salesman_id);
    CREATE INDEX IF NOT EXISTS idx_fs_period ON formula_sales(period_start)
  `,
  );
  ensureTable(
    dbInstance,
    "uploaded_files",
    `
    CREATE TABLE uploaded_files (
      file_id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('formula', 'material')),
      status TEXT NOT NULL DEFAULT 'uploaded' CHECK(status IN ('uploaded', 'parsed', 'linked', 'orphaned', 'archived')),
      related_id TEXT DEFAULT NULL,
      related_type TEXT DEFAULT NULL CHECK(related_type IS NULL OR related_type IN ('formula', 'material')),
      parse_result_json TEXT DEFAULT NULL,
      parse_model TEXT DEFAULT NULL,
      parse_confidence REAL DEFAULT NULL,
      parse_usage_json TEXT DEFAULT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_accessed_at TEXT DEFAULT NULL,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_uploaded_files_related ON uploaded_files(related_id, related_type);
    CREATE INDEX IF NOT EXISTS idx_uploaded_files_type ON uploaded_files(file_type);
    CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
    CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files(uploaded_at)
    `,
  );
  ensureTable(
    dbInstance,
    "file_audit_log",
    `
    CREATE TABLE file_audit_log (
      log_id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('upload', 'parse', 'link', 'unlink', 'reparse', 'download', 'delete', 'archive')),
      operator TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      detail_json TEXT DEFAULT NULL,
      ip_address TEXT DEFAULT NULL,
      FOREIGN KEY (file_id) REFERENCES uploaded_files(file_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_file_audit_file ON file_audit_log(file_id);
    CREATE INDEX IF NOT EXISTS idx_file_audit_operator ON file_audit_log(operator);
    CREATE INDEX IF NOT EXISTS idx_file_audit_timestamp ON file_audit_log(timestamp)
    `,
  );
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'formulist' CHECK(role IN ('admin', 'formulist')),
  display_name TEXT DEFAULT NULL,
  avatar TEXT DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'g',
  stock REAL NOT NULL DEFAULT 0,
  material_type TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
  unit_price REAL DEFAULT NULL,
  data_source TEXT DEFAULT 'manual',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_material_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_material_code ON materials(code);
CREATE TABLE IF NOT EXISTS formulas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  salesman_id TEXT NOT NULL,
  salesman_name TEXT NOT NULL,
  materials_json TEXT NOT NULL,
  finished_weight REAL NOT NULL DEFAULT 0,
  ratio_factor REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  description TEXT DEFAULT NULL,
  preparation_method TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_formula_name ON formulas(name);
CREATE INDEX IF NOT EXISTS idx_formula_salesman_id ON formulas(salesman_id);
CREATE INDEX IF NOT EXISTS idx_formula_created_by ON formulas(created_by);
CREATE TABLE IF NOT EXISTS salesmen (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_salesman_name ON salesmen(name);
CREATE INDEX IF NOT EXISTS idx_salesman_code ON salesmen(code);
CREATE TABLE IF NOT EXISTS formula_versions (
  version_id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  version_number TEXT NOT NULL,
  version_name TEXT DEFAULT NULL,
  version_reason TEXT DEFAULT NULL,
  changes_json TEXT DEFAULT NULL,
  snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  is_current INTEGER NOT NULL DEFAULT 0,
  ratio_factor REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fv_formula ON formula_versions(formula_id);
CREATE TABLE IF NOT EXISTS export_templates (
  template_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  type TEXT NOT NULL CHECK(type IN ('pdf', 'excel', 'api', 'print')),
  format_config_json TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS export_jobs (
  job_id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  version_id TEXT DEFAULT NULL,
  template_id TEXT DEFAULT NULL,
  export_type TEXT NOT NULL CHECK(export_type IN ('pdf', 'excel', 'api')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  api_endpoint TEXT DEFAULT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT DEFAULT NULL,
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS material_nutrition (
  nutrition_id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL UNIQUE,
  per_100g_json TEXT NOT NULL,
  data_version TEXT NOT NULL DEFAULT '1.0',
  data_source TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  confidence TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS formula_nutrition_summaries (
  summary_id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  version_id TEXT DEFAULT NULL,
  total_weight REAL NOT NULL DEFAULT 0,
  total_nutrition_json TEXT NOT NULL,
  per_100g_nutrition_json TEXT NOT NULL,
  material_breakdown_json TEXT DEFAULT NULL,
  calculated_by TEXT NOT NULL,
  calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  profile_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  category TEXT NOT NULL CHECK(category IN ('infant', 'child', 'adult', 'elderly', 'pregnant', 'special')),
  target_values_json TEXT NOT NULL,
  tolerance_ranges_json TEXT DEFAULT NULL,
  mandatory_fields_json TEXT DEFAULT NULL,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS formula_sales (
  id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  salesman_id TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE,
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT,
  UNIQUE(formula_id, period_type, period_start)
);
CREATE INDEX IF NOT EXISTS idx_fs_formula ON formula_sales(formula_id);
CREATE INDEX IF NOT EXISTS idx_fs_salesman ON formula_sales(salesman_id);
CREATE INDEX IF NOT EXISTS idx_fs_period ON formula_sales(period_start);
`;

export async function connectDatabase(): Promise<void> {
  try {
    const SQLJs = await getSqlJs();
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(config.database.path)) {
      const fileBuffer = fs.readFileSync(config.database.path);
      db = new SQLJs.Database(fileBuffer);
    } else {
      db = new SQLJs.Database();
    }

    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA foreign_keys = ON");

    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (!tables || tables.length === 0 || !tables[0].values || tables[0].values.length === 0) {
      logger.info("检测到空数据库，正在初始化表结构...");
      db.run(INIT_SQL);
      logger.info("表结构初始化完成");
    }

    runAutoMigrations(db);

    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);

    logger.info(`SQLite 数据库已连接: ${config.database.path}`);
  } catch (error) {
    logger.error("数据库连接失败:", error);
    throw error;
  }
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error("数据库未初始化，请先调用 connectDatabase()");
  }
  return db;
}

export function query<T = any>(sql: string, params?: any[]): T {
  const dbInstance = getDb();
  const isSelect = sql.trim().toUpperCase().startsWith("SELECT") || sql.trim().toUpperCase().startsWith("PRAGMA");

  if (params && params.length > 0) {
    const stmt = dbInstance.prepare(sql);
    stmt.bind(params);
    if (isSelect) {
      const result: any[] = [];
      while (stmt.step()) {
        result.push(stmt.getAsObject());
      }
      stmt.free();
      return [result] as T;
    }
    stmt.step();
    stmt.free();
    return { changes: dbInstance.getRowsModified(), lastInsertRowid: 0 } as unknown as T;
  }

  if (isSelect) {
    const results = dbInstance.exec(sql);
    if (results.length === 0) return [[]] as T;

    const columns = results[0].columns;
    const rows = results[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => (obj[col] = row[i]));
      return obj;
    });
    return [rows] as T;
  }

  dbInstance.run(sql);
  return { changes: dbInstance.getRowsModified(), lastInsertRowid: 0 } as unknown as T;
}

export function transaction<T>(fn: () => T): T {
  const dbInstance = getDb();
  dbInstance.exec("BEGIN");
  try {
    const result = fn();
    dbInstance.exec("COMMIT");
    return result;
  } catch (e) {
    dbInstance.exec("ROLLBACK");
    throw e;
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);
    db.close();
    db = null;
    logger.info("数据库连接已关闭");
  }
}
