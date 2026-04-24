// 使用 better-sqlite3 作为默认数据库驱动
import Database from "better-sqlite3";
import { config } from "./index.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

let db: Database.Database | null = null;

function ensureColumn(dbInstance: Database.Database, table: string, col: string, type: string, defaultValue: string) {
  try {
    const cols = dbInstance.prepare(`PRAGMA table_info(${table})`).all();
    const colNames = cols.map((c: any) => c.name);
    if (!colNames.includes(col)) {
      dbInstance.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${type} DEFAULT ${defaultValue}`).run();
      logger.info(`数据库迁移: 添加列 ${table}.${col}`);
    }
  } catch (_err) {}
}

function runAutoMigrations(dbInstance: Database.Database) {
  ensureColumn(dbInstance, "materials", "material_type", "TEXT", "'herb'");
  ensureColumn(dbInstance, "formulas", "finished_weight", "REAL", "0");
  ensureColumn(dbInstance, "formulas", "ratio_factor", "REAL", "0.18");
  ensureColumn(dbInstance, "formulas", "supplement_ratio_factor", "REAL", "1.0");
  ensureColumn(dbInstance, "formula_versions", "ratio_factor", "REAL", "0.18");
  ensureColumn(dbInstance, "formula_versions", "supplement_ratio_factor", "REAL", "1.0");
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
`;

export async function connectDatabase(): Promise<void> {
  try {
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.database.path);

    // 启用 WAL 模式和外键约束
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // 检查是否需要初始化数据库
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
    if (!tables || tables.length === 0) {
      logger.info("检测到空数据库，正在初始化表结构...");
      db.exec(INIT_SQL);
      logger.info("表结构初始化完成");
    }

    runAutoMigrations(db);

    logger.info(`SQLite 数据库已连接: ${config.database.path}`);
  } catch (error) {
    logger.error("数据库连接失败:", error);
    throw error;
  }
}

export function getDb(): Database.Database {
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

    if (isSelect) {
      const result = stmt.all(...params);
      return [result] as T;
    } else {
      const result = stmt.run(...params);
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid } as unknown as T;
    }
  }

  if (isSelect) {
    const result = dbInstance.prepare(sql).all();
    return [result] as T;
  }

  const result = dbInstance.prepare(sql).run();
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid } as unknown as T;
}

export function transaction<T>(fn: () => T): T {
  const dbInstance = getDb();

  try {
    dbInstance.prepare("BEGIN").run();
    const result = fn();
    dbInstance.prepare("COMMIT").run();
    return result;
  } catch (e) {
    dbInstance.prepare("ROLLBACK").run();
    throw e;
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
    logger.info("数据库连接已关闭");
  }
}
