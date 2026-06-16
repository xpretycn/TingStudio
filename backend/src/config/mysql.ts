// MySQL 数据库模块 — 唯一数据库驱动
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { logger } from "../utils/logger.js";

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
}

let pool: mysql.Pool | null = null;

function getMySQLConfig(): MySQLConfig {
  return {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "tingstudio",
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || "10", 10),
    acquireTimeout: parseInt(process.env.MYSQL_ACQUIRE_TIMEOUT || "60000", 10),
    timeout: parseInt(process.env.MYSQL_TIMEOUT || "60000", 10),
  };
}

// ═══════════════════════════════════════════════════════════
// 基础查询函数
// ═══════════════════════════════════════════════════════════

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const poolInstance = getMySQLPool();
  try {
    const [rows] = await poolInstance.execute(
      sql,
      params as (string | number | boolean | null | Buffer)[]
    );
    return rows as T;
  } catch (error) {
    logger.error("MySQL 查询错误:", { sql, params, error });
    throw error;
  }
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<{ changes: number; lastInsertId?: number }> {
  const poolInstance = getMySQLPool();
  try {
    const [result] = await poolInstance.execute(
      sql,
      params as (string | number | boolean | null | Buffer)[]
    );
    const mysqlResult = result as { affectedRows: number; insertId: number };
    return {
      changes: mysqlResult.affectedRows || 0,
      lastInsertId: mysqlResult.insertId,
    };
  } catch (error) {
    logger.error("MySQL 执行错误:", { sql, params, error });
    throw error;
  }
}

export async function transaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const poolInstance = getMySQLPool();
  const conn = await poolInstance.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    throw new Error("MySQL 数据库未初始化，请先调用 connectMySQL()");
  }
  return pool;
}

export async function closeMySQL(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("MySQL 数据库连接已关闭");
  }
}

// ═══════════════════════════════════════════════════════════
// 迁移辅助函数
// ═══════════════════════════════════════════════════════════

async function ensureColumn(
  table: string,
  col: string,
  type: string,
  defaultValue: string
): Promise<void> {
  try {
    const rows = await query<Array<{ COLUMN_NAME: string }>>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [table, col]
    );
    if (rows.length === 0) {
      await execute(
        `ALTER TABLE ${table} ADD COLUMN ${col} ${type} DEFAULT ${defaultValue}`
      );
      logger.info(`数据库迁移: 添加列 ${table}.${col}`);
    }
  } catch (err: unknown) {
    logger.warn(
      `数据库迁移: ensureColumn ${table}.${col} 失败 - ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ═══════════════════════════════════════════════════════════
// Seed 数据
// ═══════════════════════════════════════════════════════════

const DEFAULT_ADMIN_PASSWORD = "Ting@Admin2026!";

interface MaterialSeedEntry {
  name: string;
  unitPrice: number | null;
  per100g: { energy: number; protein: number; fat: number; carbohydrate: number; sodium: number };
  materialType: "herb" | "supplement";
  ratioFactor: number;
}

const C_TIER_MATERIALS: MaterialSeedEntry[] = [
  { name: "佛手", unitPrice: 60, per100g: { energy: 1869.3, protein: 1.2, fat: 7.7, carbohydrate: 92, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "重瓣玫瑰花", unitPrice: 80, per100g: { energy: 1474.4, protein: 8.5, fat: 4.7, carbohydrate: 68, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "茯苓", unitPrice: 55, per100g: { energy: 1443.1, protein: 1.2, fat: 0.5, carbohydrate: 82.6, sodium: 1 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "山药", unitPrice: 28, per100g: { energy: 1400.4, protein: 9.4, fat: 1, carbohydrate: 70.8, sodium: 104 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "桔梗", unitPrice: 50, per100g: { energy: 1483.4, protein: 10.7, fat: 0.9, carbohydrate: 74.6, sodium: 12 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "甘草", unitPrice: 35, per100g: { energy: 1513.7, protein: 4.9, fat: 4.2, carbohydrate: 75, sodium: 155 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "低聚异麦芽糖", unitPrice: 8, per100g: { energy: 1530, protein: 0, fat: 0, carbohydrate: 90, sodium: 0 }, materialType: "supplement", ratioFactor: 1.0 },
  { name: "桃仁", unitPrice: 70, per100g: { energy: 1479.7, protein: 7.4, fat: 0.8, carbohydrate: 77.9, sodium: 3.8 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "短梗五加", unitPrice: 45, per100g: { energy: 1309, protein: 12, fat: 0, carbohydrate: 65, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "桑椹", unitPrice: 65, per100g: { energy: 278.3, protein: 1.7, fat: 0.4, carbohydrate: 13.8, sodium: 2 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "黄精", unitPrice: 55, per100g: { energy: 1223.2, protein: 11.6, fat: 3.7, carbohydrate: 52.3, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "黄芪", unitPrice: 42, per100g: { energy: 861.8, protein: 14.9, fat: 1.1, carbohydrate: 33.4, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "沙棘", unitPrice: 48, per100g: { energy: 515.4, protein: 0.9, fat: 1.8, carbohydrate: 25.5, sodium: 28 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "枸杞子", unitPrice: 58, per100g: { energy: 1381.5, protein: 13.9, fat: 1.5, carbohydrate: 64.1, sodium: 252 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "香橼", unitPrice: 40, per100g: { energy: 652.1, protein: 6.9, fat: 0.9, carbohydrate: 29.5, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "陈皮", unitPrice: 38, per100g: { energy: 1530.8, protein: 8, fat: 1.4, carbohydrate: 79, sodium: 21 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "平卧菊三七", unitPrice: 50, per100g: { energy: 1409.1, protein: 6.8, fat: 3.9, carbohydrate: 67.6, sodium: 17.5 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "重瓣红玫瑰", unitPrice: 75, per100g: { energy: 1474.4, protein: 8.5, fat: 4.7, carbohydrate: 68, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "金银花", unitPrice: 52, per100g: { energy: 946.8, protein: 13.1, fat: 4.5, carbohydrate: 32.8, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "葛根", unitPrice: 32, per100g: { energy: 1608.5, protein: 0.4, fat: 0.1, carbohydrate: 94, sodium: 5 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "荷叶", unitPrice: 25, per100g: { energy: 155.3, protein: 3.1, fat: 0.2, carbohydrate: 5.6, sodium: 5 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "竹叶黄酮", unitPrice: 120, per100g: { energy: 0, protein: 0, fat: 0, carbohydrate: 0, sodium: 0 }, materialType: "supplement", ratioFactor: 1.0 },
  { name: "纳豆", unitPrice: 60, per100g: { energy: 1443.4, protein: 20.2, fat: 0.6, carbohydrate: 63.4, sodium: 2 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "显脉旋覆花", unitPrice: 45, per100g: { energy: 1214.1, protein: 5.5, fat: 1.8, carbohydrate: 62, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "栀子", unitPrice: 35, per100g: { energy: 159.3, protein: 2.9, fat: 0.4, carbohydrate: 5.6, sodium: 5 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "西红花", unitPrice: 800, per100g: { energy: 1523.9, protein: 11.4, fat: 5.9, carbohydrate: 65.4, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "当归", unitPrice: 55, per100g: { energy: 1149.6, protein: 44.2, fat: 2.4, carbohydrate: 18.2, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "芦根", unitPrice: 20, per100g: { energy: 232.4, protein: 0.8, fat: 0.4, carbohydrate: 12, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "薄荷", unitPrice: 42, per100g: { energy: 1409.1, protein: 6.8, fat: 3.9, carbohydrate: 67.6, sodium: 17.5 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "白芷", unitPrice: 40, per100g: { energy: 1466.5, protein: 8.9, fat: 1.5, carbohydrate: 74.1, sodium: 27 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "薏苡仁", unitPrice: 22, per100g: { energy: 462.5, protein: 0.8, fat: 0.6, carbohydrate: 25.1, sodium: 15 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "化橘红", unitPrice: 48, per100g: { energy: 1530.8, protein: 8, fat: 1.4, carbohydrate: 79, sodium: 21 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "鱼腥草", unitPrice: 18, per100g: { energy: 1530.8, protein: 8, fat: 1.4, carbohydrate: 79, sodium: 21 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "乌药叶", unitPrice: 35, per100g: { energy: 281, protein: 3.8, fat: 1.3, carbohydrate: 9.9, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "黄芥子", unitPrice: 30, per100g: { energy: 954.8, protein: 13.4, fat: 6.6, carbohydrate: 28.4, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "苦杏仁", unitPrice: 45, per100g: { energy: 2468.6, protein: 22.5, fat: 45.4, carbohydrate: 23.9, sodium: 8 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "蒲公英", unitPrice: 22, per100g: { energy: 241.3, protein: 4.8, fat: 1.1, carbohydrate: 7, sodium: 76 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "麦冬", unitPrice: 50, per100g: { energy: 1483.4, protein: 10.7, fat: 0.9, carbohydrate: 74.6, sodium: 12 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "西洋参", unitPrice: 300, per100g: { energy: 1294.6, protein: 9.9, fat: 0.3, carbohydrate: 65.6, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "牡蛎", unitPrice: 80, per100g: { energy: 277.6, protein: 10.8, fat: 1.3, carbohydrate: 2.7, sodium: 510 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "昆布", unitPrice: 25, per100g: { energy: 1170.5, protein: 8, fat: 2, carbohydrate: 56.5, sodium: 2700 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "丹凤牡丹花", unitPrice: 70, per100g: { energy: 1474.4, protein: 8.5, fat: 4.7, carbohydrate: 68, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "百合", unitPrice: 35, per100g: { energy: 1483.9, protein: 6.7, fat: 0.5, carbohydrate: 79.5, sodium: 37 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "麦芽", unitPrice: 18, per100g: { energy: 1572.8, protein: 10.3, fat: 1.8, carbohydrate: 78.3, sodium: 11 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "姜黄", unitPrice: 48, per100g: { energy: 1602.2, protein: 7.8, fat: 9.9, carbohydrate: 64.9, sodium: 38 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "山茱萸", unitPrice: 60, per100g: { energy: 1381.5, protein: 13.9, fat: 1.5, carbohydrate: 64.1, sodium: 252 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "肉桂", unitPrice: 35, per100g: { energy: 760.5, protein: 4, fat: 1.9, carbohydrate: 36.6, sodium: 15 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "山楂", unitPrice: 20, per100g: { energy: 457.4, protein: 0.5, fat: 0.6, carbohydrate: 25.1, sodium: 5 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "酸枣仁", unitPrice: 80, per100g: { energy: 1491.5, protein: 31.8, fat: 25.7, carbohydrate: 0, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "鸡内金", unitPrice: 55, per100g: { energy: 1525.4, protein: 83.1, fat: 1.3, carbohydrate: 3.8, sodium: 0 }, materialType: "herb", ratioFactor: 0.18 },
  { name: "r-氨基丁酸", unitPrice: 200, per100g: { energy: 0, protein: 0, fat: 0, carbohydrate: 0, sodium: 0 }, materialType: "supplement", ratioFactor: 1.0 },
  { name: "地龙蛋白肽粉", unitPrice: 150, per100g: { energy: 1312, protein: 60, fat: 1, carbohydrate: 15, sodium: 0 }, materialType: "supplement", ratioFactor: 1.0 },
];

// ═══════════════════════════════════════════════════════════
// 建表 SQL（MySQL 8.0+）
// ═══════════════════════════════════════════════════════════

const INIT_SQL_STATEMENTS: string[] = [
  // schema_migrations
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // users
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'formulist',
    display_name VARCHAR(255) DEFAULT NULL,
    avatar VARCHAR(500) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    role_id VARCHAR(36) DEFAULT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    must_change_password TINYINT NOT NULL DEFAULT 0,
    data_source VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_username (username),
    INDEX idx_users_role (role),
    INDEX idx_users_role_id (role_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // materials
  `CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'g',
    stock DOUBLE NOT NULL DEFAULT 0,
    material_type VARCHAR(50) NOT NULL DEFAULT 'herb',
    unit_price DOUBLE DEFAULT NULL,
    data_source VARCHAR(50) DEFAULT 'manual',
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    previous_version_id VARCHAR(36) DEFAULT NULL,
    is_latest TINYINT NOT NULL DEFAULT 1,
    is_deleted TINYINT NOT NULL DEFAULT 0,
    changes_json TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    appearance_json TEXT DEFAULT NULL,
    taste_json TEXT DEFAULT NULL,
    efficacy_json TEXT DEFAULT NULL,
    INDEX idx_material_name (name),
    INDEX idx_material_code (code),
    INDEX idx_material_version (version),
    INDEX idx_material_previous_version (previous_version_id),
    INDEX idx_material_is_latest (is_latest),
    INDEX idx_material_is_deleted (is_deleted),
    INDEX idx_material_status (status),
    INDEX idx_material_created_by (created_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // material_review_logs
  `CREATE TABLE IF NOT EXISTS material_review_logs (
    review_log_id VARCHAR(36) PRIMARY KEY,
    material_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36) NOT NULL,
    reviewer_name VARCHAR(255) DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    comment TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mrl_material (material_id),
    INDEX idx_mrl_reviewer (reviewer_id),
    INDEX idx_mrl_action (action),
    INDEX idx_mrl_created_at (created_at),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // salesmen
  `CREATE TABLE IF NOT EXISTS salesmen (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_salesman_name (name),
    INDEX idx_salesman_code (code),
    INDEX idx_salesman_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // formulas
  `CREATE TABLE IF NOT EXISTS formulas (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    salesman_id VARCHAR(36) NOT NULL,
    salesman_name VARCHAR(255) NOT NULL,
    materials_json TEXT NOT NULL,
    finished_weight DOUBLE NOT NULL DEFAULT 0,
    ratio_factor DOUBLE NOT NULL DEFAULT 0.18,
    supplement_ratio_factor DOUBLE NOT NULL DEFAULT 1.0,
    packaging_price DOUBLE NOT NULL DEFAULT 0,
    other_price DOUBLE NOT NULL DEFAULT 0,
    profit_margin DOUBLE NOT NULL DEFAULT 20,
    description TEXT DEFAULT NULL,
    preparation_method TEXT DEFAULT NULL,
    original_name VARCHAR(255) DEFAULT NULL,
    original_weight DOUBLE DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_formula_name (name),
    INDEX idx_formula_salesman_id (salesman_id),
    INDEX idx_formula_created_by (created_by),
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // formula_versions
  `CREATE TABLE IF NOT EXISTS formula_versions (
    version_id VARCHAR(36) PRIMARY KEY,
    formula_id VARCHAR(36) NOT NULL,
    version_number VARCHAR(50) NOT NULL,
    version_name VARCHAR(255) DEFAULT NULL,
    version_reason TEXT DEFAULT NULL,
    changes_json TEXT DEFAULT NULL,
    snapshot_json TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    is_current TINYINT NOT NULL DEFAULT 0,
    ratio_factor DOUBLE NOT NULL DEFAULT 0.18,
    supplement_ratio_factor DOUBLE NOT NULL DEFAULT 1.0,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fv_formula (formula_id),
    INDEX idx_fv_version_number (formula_id, version_number),
    INDEX idx_fv_status (status),
    INDEX idx_fv_formula_status (formula_id, status),
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // formula_review_logs
  `CREATE TABLE IF NOT EXISTS formula_review_logs (
    review_log_id VARCHAR(36) PRIMARY KEY,
    version_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36) NOT NULL,
    reviewer_name VARCHAR(255) DEFAULT NULL,
    action VARCHAR(50) NOT NULL,
    comment TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_frl_version (version_id),
    INDEX idx_frl_reviewer (reviewer_id),
    INDEX idx_frl_action (action),
    FOREIGN KEY (version_id) REFERENCES formula_versions(version_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // export_templates
  `CREATE TABLE IF NOT EXISTS export_templates (
    template_id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'formula',
    format_config_json TEXT NOT NULL,
    is_default TINYINT NOT NULL DEFAULT 0,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_et_type (type),
    INDEX idx_et_category (category),
    INDEX idx_et_category_type (category, type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // export_jobs
  `CREATE TABLE IF NOT EXISTS export_jobs (
    job_id VARCHAR(36) PRIMARY KEY,
    formula_id VARCHAR(36) DEFAULT NULL,
    version_id VARCHAR(36) DEFAULT NULL,
    template_id VARCHAR(36) DEFAULT NULL,
    data_category VARCHAR(50) NOT NULL DEFAULT 'formula',
    target_ids_json TEXT DEFAULT NULL,
    export_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    file_url VARCHAR(500) DEFAULT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    progress INT NOT NULL DEFAULT 0,
    error_message TEXT DEFAULT NULL,
    period_start VARCHAR(50) DEFAULT NULL,
    period_end VARCHAR(50) DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    INDEX idx_ej_formula (formula_id),
    INDEX idx_ej_status (status),
    INDEX idx_ej_data_category (data_category),
    INDEX idx_ej_created_by (created_by),
    INDEX idx_ej_category_status (data_category, status),
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // api_data_interfaces
  `CREATE TABLE IF NOT EXISTS api_data_interfaces (
    interface_id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    endpoint VARCHAR(500) NOT NULL UNIQUE,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    authentication VARCHAR(50) NOT NULL DEFAULT 'none',
    auth_config_json TEXT DEFAULT NULL,
    data_format VARCHAR(20) NOT NULL DEFAULT 'json',
    field_mapping_json TEXT DEFAULT NULL,
    rate_limit_json TEXT DEFAULT NULL,
    retry_config_json TEXT DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_adi_endpoint (endpoint)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // share_configs
  `CREATE TABLE IF NOT EXISTS share_configs (
    share_id VARCHAR(36) PRIMARY KEY,
    formula_id VARCHAR(36) NOT NULL,
    version_id VARCHAR(36) DEFAULT NULL,
    share_type VARCHAR(50) NOT NULL DEFAULT 'link',
    share_url VARCHAR(500) DEFAULT NULL,
    password VARCHAR(255) DEFAULT NULL,
    expire_date DATETIME DEFAULT NULL,
    allowed_emails_json TEXT DEFAULT NULL,
    download_limit INT DEFAULT NULL,
    download_count INT NOT NULL DEFAULT 0,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sc_formula (formula_id),
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // export_center_config
  `CREATE TABLE IF NOT EXISTS export_center_config (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value TEXT NOT NULL,
    config_type VARCHAR(50) NOT NULL DEFAULT 'string',
    description TEXT DEFAULT NULL,
    updated_by VARCHAR(36) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ecc_config_type (config_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // material_nutrition
  `CREATE TABLE IF NOT EXISTS material_nutrition (
    nutrition_id VARCHAR(36) PRIMARY KEY,
    material_id VARCHAR(36) NOT NULL,
    per_100g_json TEXT NOT NULL,
    data_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    data_source VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    confidence VARCHAR(20) DEFAULT 'medium',
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    material_version INT NOT NULL DEFAULT 1,
    is_latest TINYINT NOT NULL DEFAULT 1,
    field_sources_json TEXT DEFAULT NULL,
    source_type VARCHAR(50) DEFAULT 'manual',
    source_detail TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT NULL,
    created_by VARCHAR(36) DEFAULT NULL,
    INDEX idx_mn_material_version (material_id, material_version),
    INDEX idx_mn_is_latest (is_latest),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // formula_nutrition_summaries
  `CREATE TABLE IF NOT EXISTS formula_nutrition_summaries (
    summary_id VARCHAR(36) PRIMARY KEY,
    formula_id VARCHAR(36) NOT NULL,
    version_id VARCHAR(36) DEFAULT NULL,
    total_weight DOUBLE NOT NULL DEFAULT 0,
    total_nutrition_json TEXT NOT NULL,
    per_100g_nutrition_json TEXT NOT NULL,
    material_breakdown_json TEXT DEFAULT NULL,
    calculated_by VARCHAR(36) NOT NULL,
    calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fns_formula (formula_id),
    UNIQUE INDEX uk_fns_version (version_id),
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // material_nutrition_sources
  `CREATE TABLE IF NOT EXISTS material_nutrition_sources (
    source_id VARCHAR(36) PRIMARY KEY,
    material_id VARCHAR(36) NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_detail TEXT DEFAULT NULL,
    per_100g_json TEXT NOT NULL,
    confidence VARCHAR(20) DEFAULT 'medium',
    match_score DOUBLE DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36) DEFAULT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    INDEX idx_mns_material (material_id),
    INDEX idx_mns_source_type (source_type),
    INDEX idx_mns_material_type (material_id, source_type),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // formula_nutrition_snapshots
  `CREATE TABLE IF NOT EXISTS formula_nutrition_snapshots (
    snapshot_id VARCHAR(36) PRIMARY KEY,
    formula_id VARCHAR(36) NOT NULL,
    formula_version_id VARCHAR(36) DEFAULT NULL,
    nutrition_refs_json TEXT NOT NULL,
    total_nutrition_json TEXT NOT NULL,
    per_100g_json TEXT NOT NULL,
    material_breakdown_json TEXT DEFAULT NULL,
    calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    calculated_by VARCHAR(36) DEFAULT NULL,
    INDEX idx_fnss_formula (formula_id),
    UNIQUE INDEX uk_fnss_version (formula_id, formula_version_id),
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // nutrition_profiles
  `CREATE TABLE IF NOT EXISTS nutrition_profiles (
    profile_id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    category VARCHAR(50) NOT NULL,
    target_values_json TEXT NOT NULL,
    tolerance_ranges_json TEXT DEFAULT NULL,
    mandatory_fields_json TEXT DEFAULT NULL,
    is_preset TINYINT NOT NULL DEFAULT 0,
    created_by VARCHAR(36) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_np_category (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // nutrition_analysis_reports
  `CREATE TABLE IF NOT EXISTS nutrition_analysis_reports (
    report_id VARCHAR(36) PRIMARY KEY,
    formula_id VARCHAR(36) NOT NULL,
    version_id VARCHAR(36) DEFAULT NULL,
    summary_id VARCHAR(36) NOT NULL,
    compliance_check_json TEXT DEFAULT NULL,
    recommendations_json TEXT DEFAULT NULL,
    generated_by VARCHAR(36) NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nar_formula (formula_id),
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_id) REFERENCES formula_nutrition_summaries(summary_id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ratio_threshold_configs
  `CREATE TABLE IF NOT EXISTS ratio_threshold_configs (
    id VARCHAR(36) PRIMARY KEY,
    normal_low DOUBLE NOT NULL DEFAULT 0.98,
    normal_high DOUBLE NOT NULL DEFAULT 1.02,
    warning_low DOUBLE NOT NULL DEFAULT 0.95,
    warning_high DOUBLE NOT NULL DEFAULT 1.05,
    high_warning_low DOUBLE NOT NULL DEFAULT 0.92,
    high_warning_high DOUBLE NOT NULL DEFAULT 1.08,
    updated_at DATETIME NOT NULL,
    updated_by VARCHAR(36) DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // enum_options
  `CREATE TABLE IF NOT EXISTS enum_options (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uk_enum_category_value (category, value),
    INDEX idx_enum_category (category),
    INDEX idx_enum_category_active (category, is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // quick_formulas
  `CREATE TABLE IF NOT EXISTS quick_formulas (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    ratio_factor DOUBLE NOT NULL DEFAULT 0.18,
    supplement_ratio_factor DOUBLE NOT NULL DEFAULT 1.0,
    finished_weight DOUBLE NOT NULL DEFAULT 0,
    materials_json TEXT NOT NULL,
    packaging_price DOUBLE NOT NULL DEFAULT 0,
    other_price DOUBLE NOT NULL DEFAULT 0,
    profit_margin DOUBLE NOT NULL DEFAULT 20,
    description TEXT DEFAULT NULL,
    preparation_method TEXT DEFAULT NULL,
    salesman_id VARCHAR(36) DEFAULT NULL,
    salesman_name VARCHAR(255) DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_qf_name (name),
    INDEX idx_qf_status (status),
    INDEX idx_qf_created_by (created_by),
    UNIQUE INDEX idx_qf_name_user (name, created_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // formula_templates
  `CREATE TABLE IF NOT EXISTS formula_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    ratio_factor DOUBLE NOT NULL DEFAULT 0.18,
    supplement_ratio_factor DOUBLE NOT NULL DEFAULT 1.0,
    finished_weight DOUBLE NOT NULL DEFAULT 0,
    materials_json TEXT NOT NULL,
    packaging_price DOUBLE NOT NULL DEFAULT 0,
    other_price DOUBLE NOT NULL DEFAULT 0,
    profit_margin DOUBLE NOT NULL DEFAULT 20,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_template_name (name),
    INDEX idx_template_created_by (created_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // formula_sales
  `CREATE TABLE IF NOT EXISTS formula_sales (
    id VARCHAR(36) PRIMARY KEY,
    formula_id VARCHAR(36) NOT NULL,
    salesman_id VARCHAR(36) NOT NULL,
    period_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
    period_start VARCHAR(50) NOT NULL,
    period_end VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    revenue DOUBLE NOT NULL DEFAULT 0,
    notes TEXT DEFAULT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uk_fs_unique (formula_id, salesman_id, period_type, period_start),
    INDEX idx_fs_formula (formula_id),
    INDEX idx_fs_salesman (salesman_id),
    INDEX idx_fs_period (period_start),
    FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE,
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // reports
  `CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    period_start VARCHAR(50) NOT NULL,
    period_end VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    data_json TEXT NOT NULL,
    generated_by VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at DATETIME DEFAULT NULL,
    period_key VARCHAR(255) DEFAULT NULL,
    INDEX idx_reports_type (type),
    INDEX idx_reports_period (period_start, period_end),
    INDEX idx_reports_status (status),
    INDEX idx_reports_created_by (created_by),
    INDEX idx_reports_period_key (type, created_by, period_key),
    FOREIGN KEY (created_by) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // report_targets
  `CREATE TABLE IF NOT EXISTS report_targets (
    id VARCHAR(36) PRIMARY KEY,
    period_type VARCHAR(50) NOT NULL,
    period_start VARCHAR(50) NOT NULL,
    period_end VARCHAR(50) NOT NULL,
    targets_json TEXT NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // roles
  `CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    role_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    is_system TINYINT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roles_role_key (role_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // permissions
  `CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(36) PRIMARY KEY,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    permission_key VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_permissions_module (module),
    INDEX idx_permissions_permission_key (permission_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // role_permissions
  `CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(36) NOT NULL,
    permission_id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    INDEX idx_role_permissions_role_id (role_id),
    INDEX idx_role_permissions_permission_id (permission_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // user_preferences
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(36) PRIMARY KEY,
    preferences_json TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ai_models
  `CREATE TABLE IF NOT EXISTS ai_models (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_key TEXT DEFAULT '',
    model VARCHAR(255) NOT NULL,
    vision_model VARCHAR(255) DEFAULT '',
    vision_max_tokens INT DEFAULT NULL,
    description TEXT DEFAULT '',
    supports_vision TINYINT NOT NULL DEFAULT 0,
    health_status VARCHAR(50) NOT NULL DEFAULT 'unknown',
    last_health_check DATETIME DEFAULT NULL,
    last_health_latency INT DEFAULT NULL,
    health_check_interval_days INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_models_provider (provider),
    INDEX idx_ai_models_health (health_status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ai_usage_logs
  `CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(255) NOT NULL,
    call_type VARCHAR(100) NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    latency_ms INT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    error_message TEXT DEFAULT NULL,
    request_summary TEXT DEFAULT NULL,
    fallback_from VARCHAR(100) DEFAULT NULL,
    user_id VARCHAR(36) DEFAULT NULL,
    application_name VARCHAR(255) DEFAULT NULL,
    application_location VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_usage_provider_date (provider, created_at),
    INDEX idx_ai_usage_call_type (call_type),
    INDEX idx_ai_usage_user (user_id, created_at),
    INDEX idx_ai_usage_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ai_alert_configs
  `CREATE TABLE IF NOT EXISTS ai_alert_configs (
    id VARCHAR(36) PRIMARY KEY,
    model_id VARCHAR(36) NOT NULL UNIQUE,
    provider VARCHAR(100) NOT NULL,
    daily_call_limit INT NOT NULL DEFAULT 0,
    monthly_token_limit INT NOT NULL DEFAULT 0,
    warning_threshold INT NOT NULL DEFAULT 80,
    critical_threshold INT NOT NULL DEFAULT 95,
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_alert_model (model_id),
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ai_alert_records
  `CREATE TABLE IF NOT EXISTS ai_alert_records (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    level VARCHAR(50) NOT NULL,
    threshold INT NOT NULL,
    current_value INT NOT NULL,
    limit_value INT NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_alert_rec_provider (provider, created_at),
    INDEX idx_ai_alert_rec_level (level, is_read)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ai_health_records
  `CREATE TABLE IF NOT EXISTS ai_health_records (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    latency_ms INT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_health_provider_date (provider, checked_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ai_fallback_configs
  `CREATE TABLE IF NOT EXISTS ai_fallback_configs (
    id VARCHAR(36) PRIMARY KEY,
    model_id VARCHAR(36) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    fallback_provider VARCHAR(100) NOT NULL,
    fallback_priority INT NOT NULL DEFAULT 1,
    enabled TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uk_fallback_model_provider (model_id, fallback_provider),
    INDEX idx_ai_fallback_model (model_id),
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // model_applications
  `CREATE TABLE IF NOT EXISTS model_applications (
    id VARCHAR(36) PRIMARY KEY,
    module VARCHAR(100) NOT NULL UNIQUE,
    module_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    enabled TINYINT NOT NULL DEFAULT 1,
    created_by VARCHAR(36) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_model_app_module (module),
    INDEX idx_model_app_provider (provider)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ai_prompt_templates
  `CREATE TABLE IF NOT EXISTS ai_prompt_templates (
    id VARCHAR(36) PRIMARY KEY,
    module VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'description',
    system_prompt TEXT NOT NULL DEFAULT '',
    user_prompt_template TEXT NOT NULL DEFAULT '',
    variables TEXT DEFAULT '[]',
    is_default TINYINT NOT NULL DEFAULT 0,
    enabled TINYINT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by VARCHAR(36) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_prompt_module (module),
    INDEX idx_ai_prompt_type (module, type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_sessions
  `CREATE TABLE IF NOT EXISTS agent_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    message_count INT DEFAULT 0,
    last_intent VARCHAR(255) DEFAULT NULL,
    last_active_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_agent_sessions_user_id (user_id),
    INDEX idx_agent_sessions_last_active (user_id, last_active_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_messages
  `CREATE TABLE IF NOT EXISTS agent_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT DEFAULT '',
    intent VARCHAR(255) DEFAULT NULL,
    tool_calls TEXT DEFAULT NULL,
    tool_results TEXT DEFAULT NULL,
    display_type VARCHAR(50) DEFAULT NULL,
    metadata TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_agent_messages_session_id (session_id),
    INDEX idx_agent_messages_session_created (session_id, created_at),
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // search_export_cache
  `CREATE TABLE IF NOT EXISTS search_export_cache (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    sql TEXT NOT NULL,
    row_count INT DEFAULT 0,
    file_path VARCHAR(500) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_search_export_user (user_id),
    INDEX idx_search_export_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_pending_confirmations
  `CREATE TABLE IF NOT EXISTS agent_pending_confirmations (
    session_id VARCHAR(36) PRIMARY KEY,
    tool_name VARCHAR(255) NOT NULL,
    params_json TEXT NOT NULL,
    confirm_message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_pending_forms
  `CREATE TABLE IF NOT EXISTS agent_pending_forms (
    session_id VARCHAR(36) PRIMARY KEY,
    form_id VARCHAR(36) NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    form_json TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_role_config
  `CREATE TABLE IF NOT EXISTS agent_role_config (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    agent_name VARCHAR(255) NOT NULL DEFAULT '小听',
    user_title VARCHAR(255) NOT NULL DEFAULT '老板',
    greeting TEXT DEFAULT '',
    tone_style VARCHAR(50) DEFAULT 'professional',
    custom_instructions TEXT DEFAULT '',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_float_config
  `CREATE TABLE IF NOT EXISTS agent_float_config (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    enabled TINYINT DEFAULT 1,
    model VARCHAR(100) DEFAULT 'deepseek',
    model_name VARCHAR(255) DEFAULT '',
    fallback_model VARCHAR(100) DEFAULT '',
    fallback_model_name VARCHAR(255) DEFAULT '',
    position VARCHAR(20) DEFAULT 'right',
    drawer_width INT DEFAULT 400,
    theme_color VARCHAR(50) DEFAULT '',
    show_pulse TINYINT DEFAULT 1,
    enabled_pages TEXT DEFAULT '[]',
    max_rounds INT DEFAULT 10,
    fill_strategy VARCHAR(50) DEFAULT 'overwrite',
    context_mode VARCHAR(50) DEFAULT 'page',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_provider_health
  `CREATE TABLE IF NOT EXISTS agent_provider_health (
    provider VARCHAR(100) PRIMARY KEY,
    consecutive_failures INT DEFAULT 0,
    circuit_open TINYINT DEFAULT 0,
    circuit_open_until DATETIME DEFAULT NULL,
    last_error TEXT DEFAULT NULL,
    last_failure_at DATETIME DEFAULT NULL,
    last_success_at DATETIME DEFAULT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_agent_provider_health_circuit (circuit_open, circuit_open_until)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // agent_session_cleanup_log
  `CREATE TABLE IF NOT EXISTS agent_session_cleanup_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cleaned_sessions INT DEFAULT 0,
    cleaned_messages INT DEFAULT 0,
    cleaned_confirmations INT DEFAULT 0,
    cleaned_forms INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_agent_cleanup_log_created (created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // parse_templates
  `CREATE TABLE IF NOT EXISTS parse_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'nutrition',
    default_provider VARCHAR(100) DEFAULT NULL,
    default_model VARCHAR(255) DEFAULT NULL,
    custom_prompt TEXT DEFAULT NULL,
    field_mapping TEXT DEFAULT '{}',
    validation_rules TEXT DEFAULT '{}',
    is_preset TINYINT NOT NULL DEFAULT 0,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pt_category (category),
    INDEX idx_pt_created_by (created_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // parse_results
  `CREATE TABLE IF NOT EXISTS parse_results (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    call_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    parsed_result TEXT NOT NULL,
    raw_response TEXT NOT NULL,
    model_provider VARCHAR(255) DEFAULT NULL,
    model_name VARCHAR(255) DEFAULT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT DEFAULT NULL,
    used_count INT NOT NULL DEFAULT 0,
    is_linked TINYINT NOT NULL DEFAULT 0,
    linked_formula_id VARCHAR(36) DEFAULT NULL,
    linked_material_id VARCHAR(36) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_parse_results_user_id (user_id),
    INDEX idx_parse_results_file_hash (file_hash),
    INDEX idx_parse_results_call_type (call_type),
    INDEX idx_parse_results_status (status),
    INDEX idx_parse_results_created_at (created_at),
    INDEX idx_parse_results_expires_at (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // parse_result_configs
  `CREATE TABLE IF NOT EXISTS parse_result_configs (
    id VARCHAR(36) PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    updated_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

// ═══════════════════════════════════════════════════════════
// Seed 函数
// ═══════════════════════════════════════════════════════════

async function seedDefaultAdmin(): Promise<void> {
  try {
    const existing = await query<Array<{ id: string }>>(
      "SELECT id FROM users WHERE username = ?",
      ["admin"]
    );
    if (existing.length > 0) {
      logger.info("数据库初始化: admin 用户已存在，跳过创建");
      return;
    }

    const id = crypto.randomUUID();
    const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
    const now = new Date().toISOString();

    await execute(
      "INSERT INTO users (id, username, password, role, display_name, must_change_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
      [id, "admin", hashedPassword, "admin", "系统管理员", now, now]
    );

    const adminRole = await query<Array<{ id: string }>>(
      "SELECT id FROM roles WHERE role_key = ?",
      ["admin"]
    );
    if (adminRole.length > 0) {
      await execute("UPDATE users SET role_id = ? WHERE username = ?", [
        adminRole[0].id,
        "admin",
      ]);
    }

    logger.info(
      `数据库初始化: 已创建默认管理员账号 (用户名: admin, 密码: ${DEFAULT_ADMIN_PASSWORD})`
    );
    logger.info("⚠️  请在首次登录后立即修改管理员密码！");
  } catch (err: unknown) {
    logger.error(
      "数据库初始化: 创建管理员账号失败 - " +
        (err instanceof Error ? err.message : String(err))
    );
  }
}

async function seedDefaultRoles(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM roles"
    );
    if (countRow[0].cnt > 0) return;

    const now = new Date().toISOString();
    const roles = [
      { id: "role_admin", key: "admin", name: "管理员", desc: "系统管理员，拥有全部权限", sort: 0 },
      { id: "role_formulist", key: "formulist", name: "配方师", desc: "配方研发人员，管理自己的配方与原料", sort: 1 },
      { id: "role_viewer", key: "viewer", name: "查看者", desc: "只读权限，仅可查看数据", sort: 2 },
    ];

    for (const r of roles) {
      await execute(
        "INSERT INTO roles (id, role_key, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [r.id, r.key, r.name, r.desc, r.sort, now, now]
      );
    }

    const adminRole = await query<Array<{ id: string }>>(
      "SELECT id FROM roles WHERE role_key = ?",
      ["admin"]
    );
    if (adminRole.length > 0) {
      await execute("UPDATE users SET role_id = ? WHERE role = ?", [adminRole[0].id, "admin"]);
    }

    const formulistRole = await query<Array<{ id: string }>>(
      "SELECT id FROM roles WHERE role_key = ?",
      ["formulist"]
    );
    if (formulistRole.length > 0) {
      await execute("UPDATE users SET role_id = ? WHERE role = ?", [formulistRole[0].id, "formulist"]);
    }

    logger.info("数据库初始化: 已插入默认角色并同步现有用户");
  } catch (err: unknown) {
    logger.error("插入默认角色失败: " + (err instanceof Error ? err.message : String(err)));
  }
}

async function seedDefaultPermissions(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM permissions"
    );
    if (countRow[0].cnt > 0) return;

    const now = new Date().toISOString();
    const perms: [string, string, string, string, number][] = [
      ["material", "read", "material:read", "查看原料", 1],
      ["material", "write", "material:write", "编辑原料", 2],
      ["formula", "read", "formula:read", "查看配方", 3],
      ["formula", "write", "formula:write", "编辑配方", 4],
      ["ai", "read", "ai:read", "使用AI助手", 5],
      ["ai", "write", "ai:write", "配置AI助手", 6],
      ["nutrition", "read", "nutrition:read", "查看营养分析", 7],
      ["nutrition", "write", "nutrition:write", "编辑营养分析", 8],
      ["file", "read", "file:read", "查看文件", 9],
      ["file", "write", "file:write", "管理文件", 10],
      ["export", "read", "export:read", "查看导出", 11],
      ["export", "write", "export:write", "执行导出", 12],
      ["system", "read", "system:read", "查看系统配置", 13],
      ["system", "write", "system:write", "修改系统配置", 14],
      ["user", "read", "user:read", "查看用户", 15],
      ["user", "write", "user:write", "管理用户", 16],
      ["permission", "read", "permission:read", "查看权限", 17],
      ["permission", "write", "permission:write", "管理权限", 18],
    ];

    for (const p of perms) {
      await execute(
        "INSERT INTO permissions (id, module, action, permission_key, label, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?, '', ?, ?)",
        [crypto.randomUUID(), ...p, now]
      );
    }

    const formulistPermKeys = [
      "material:read", "material:write", "formula:read", "formula:write",
      "ai:read", "ai:write", "nutrition:read", "nutrition:write",
      "file:read", "export:read", "export:write",
    ];
    const formulistRole = await query<Array<{ id: string }>>(
      "SELECT id FROM roles WHERE role_key = ?",
      ["formulist"]
    );
    if (formulistRole.length > 0) {
      for (const pk of formulistPermKeys) {
        const perm = await query<Array<{ id: string }>>(
          "SELECT id FROM permissions WHERE permission_key = ?",
          [pk]
        );
        if (perm.length > 0) {
          await execute(
            "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)",
            [formulistRole[0].id, perm[0].id, now]
          );
        }
      }
    }

    await execute("UPDATE roles SET is_system = 1 WHERE role_key = ?", ["admin"]);
    logger.info(`数据库初始化: 已插入 ${perms.length} 条权限数据并分配角色权限`);
  } catch (err: unknown) {
    logger.error("数据库初始化: 权限数据填充失败 - " + (err instanceof Error ? err.message : String(err)));
  }
}

async function seedDefaultEnumOptions(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM enum_options"
    );
    if (countRow[0].cnt > 0) return;

    const now = new Date().toISOString();
    const SEED_DATA: Record<string, string[]> = {
      appearance: ["颗粒", "膏状", "粉末", "块状", "液体", "澄清", "浑浊", "有沉淀"],
      taste: ["苦味", "甘味", "酸味", "辛味", "咸味", "泥土味", "涩感", "滑润感", "颗粒感", "粗糙感", "清凉感", "草本香", "药香", "焦香", "清香", "陈味"],
      efficacy: ["滋补肝肾", "补中益气", "养血安神", "清热解毒", "清肝明目", "泻火除烦", "健脾养胃", "利水渗湿", "化痰止咳", "活血化瘀", "行气止痛", "疏肝解郁", "敛肺止咳", "涩肠止泻", "生津止渴"],
    };

    let total = 0;
    for (const [category, values] of Object.entries(SEED_DATA)) {
      for (let i = 0; i < values.length; i++) {
        await execute(
          "INSERT INTO enum_options (id, category, label, value, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
          [crypto.randomUUID(), category, values[i], values[i], i + 1, now, now]
        );
        total++;
      }
    }

    logger.info(`数据库初始化: 已插入 ${total} 条枚举选项数据`);
  } catch (err: unknown) {
    logger.error("数据库初始化: 枚举选项填充失败 - " + (err instanceof Error ? err.message : String(err)));
  }
}

async function seedCTierMaterials(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM materials"
    );
    if (countRow[0].cnt > 0) {
      logger.info(`数据库初始化: 原料表已有 ${countRow[0].cnt} 条数据，跳过 C 层原料填充`);
      return;
    }

    const now = new Date().toISOString();
    const adminUser = await query<Array<{ id: string }>>(
      "SELECT id FROM users WHERE username = ?",
      ["admin"]
    );
    const createdBy = adminUser.length > 0 ? adminUser[0].id : "system";

    let inserted = 0;
    for (let i = 0; i < C_TIER_MATERIALS.length; i++) {
      const mat = C_TIER_MATERIALS[i];
      const code = `MAT${String(i + 1).padStart(3, "0")}`;
      try {
        await execute(
          "INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'seed', ?, ?, ?)",
          [crypto.randomUUID(), mat.name, code, "g", 50000, mat.materialType, mat.unitPrice, createdBy, now, now]
        );
        inserted++;
      } catch {
        // 忽略重复
      }
    }

    // 同时填充 material_nutrition_sources
    let nutritionInserted = 0;
    for (let i = 0; i < C_TIER_MATERIALS.length; i++) {
      const mat = C_TIER_MATERIALS[i];
      const code = `MAT${String(i + 1).padStart(3, "0")}`;
      const materialRow = await query<Array<{ id: string }>>(
        "SELECT id FROM materials WHERE code = ?",
        [code]
      );
      if (materialRow.length === 0) continue;

      try {
        await execute(
          "INSERT INTO material_nutrition_sources (source_id, material_id, source_type, source_detail, per_100g_json, confidence, created_at) VALUES (?, ?, 'seed', ?, ?, 'medium', ?)",
          [crypto.randomUUID(), materialRow[0].id, `C层原料营养数据 (${mat.name})`, JSON.stringify(mat.per100g), now]
        );
        nutritionInserted++;
      } catch {
        // 忽略重复
      }
    }

    logger.info(`数据库初始化: 已插入 ${inserted} 条 C 层原料 + ${nutritionInserted} 条营养数据`);
  } catch (err: unknown) {
    logger.error("数据库初始化: C 层原料填充失败 - " + (err instanceof Error ? err.message : String(err)));
  }
}

async function seedDefaultNutritionProfiles(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM nutrition_profiles"
    );
    if (countRow[0].cnt > 0) return;

    const now = new Date().toISOString();
    const profiles = [
      {
        name: "GB 10765-2021 婴儿配方食品", description: "适用于 0-6 月龄婴儿的配方食品国家标准", category: "infant",
        targetValues: { energy: 2550, protein: 9.3, fat: 20.4, carbohydrate: 54, sodium: 150 },
        toleranceRanges: [
          { field: "energy", label: "能量", min: 2550, max: 2950, alertLevel: "warning" },
          { field: "protein", label: "蛋白质", min: 9.3, max: 14.0, alertLevel: "warning" },
          { field: "fat", label: "脂肪", min: 20.4, max: 36.0, alertLevel: "warning" },
          { field: "carbohydrate", label: "碳水化合物", min: 54, max: 72, alertLevel: "warning" },
          { field: "sodium", label: "钠", min: 80, max: 200, alertLevel: "warning" },
        ],
        mandatoryFields: ["energy", "protein", "fat", "carbohydrate"],
      },
      {
        name: "GB 10767-2021 较大婴儿配方食品", description: "适用于 6-12 月龄较大婴儿的配方食品国家标准", category: "child",
        targetValues: { energy: 2720, protein: 10.5, fat: 18.0, carbohydrate: 52, sodium: 200 },
        toleranceRanges: [
          { field: "energy", label: "能量", min: 2720, max: 3100, alertLevel: "warning" },
          { field: "protein", label: "蛋白质", min: 10.5, max: 16.0, alertLevel: "warning" },
          { field: "fat", label: "脂肪", min: 18.0, max: 30.0, alertLevel: "warning" },
          { field: "carbohydrate", label: "碳水化合物", min: 52, max: 70, alertLevel: "warning" },
          { field: "sodium", label: "钠", min: 100, max: 300, alertLevel: "warning" },
        ],
        mandatoryFields: ["energy", "protein", "fat", "carbohydrate"],
      },
      {
        name: "GB 28050-2011 成人营养标签", description: "预包装食品营养标签通则（成人适用）", category: "adult",
        targetValues: { energy: 8400, protein: 60, fat: 60, carbohydrate: 300, sodium: 2000 },
        toleranceRanges: [
          { field: "energy", label: "能量", min: 6720, max: 10080, alertLevel: "warning" },
          { field: "protein", label: "蛋白质", min: 48, max: 90, alertLevel: "warning" },
          { field: "fat", label: "脂肪", min: 48, max: 72, alertLevel: "warning" },
          { field: "carbohydrate", label: "碳水化合物", min: 240, max: 360, alertLevel: "warning" },
          { field: "sodium", label: "钠", min: 1600, max: 2400, alertLevel: "warning" },
        ],
        mandatoryFields: ["energy", "protein", "fat", "carbohydrate", "sodium"],
      },
      {
        name: "老年人营养标准", description: "中国居民膳食营养素参考摄入量（65 岁以上老年人）", category: "elderly",
        targetValues: { energy: 7530, protein: 65, fat: 50, carbohydrate: 280, sodium: 1500 },
        toleranceRanges: [
          { field: "energy", label: "能量", min: 6024, max: 9036, alertLevel: "warning" },
          { field: "protein", label: "蛋白质", min: 52, max: 98, alertLevel: "warning" },
          { field: "fat", label: "脂肪", min: 40, max: 60, alertLevel: "warning" },
          { field: "carbohydrate", label: "碳水化合物", min: 224, max: 336, alertLevel: "warning" },
          { field: "sodium", label: "钠", min: 1200, max: 1800, alertLevel: "warning" },
        ],
        mandatoryFields: ["energy", "protein", "fat", "carbohydrate"],
      },
      {
        name: "孕妇营养标准", description: "中国居民膳食营养素参考摄入量（孕中期/晚期）", category: "pregnant",
        targetValues: { energy: 9620, protein: 80, fat: 65, carbohydrate: 350, sodium: 2000 },
        toleranceRanges: [
          { field: "energy", label: "能量", min: 7696, max: 11544, alertLevel: "warning" },
          { field: "protein", label: "蛋白质", min: 64, max: 120, alertLevel: "warning" },
          { field: "fat", label: "脂肪", min: 52, max: 78, alertLevel: "warning" },
          { field: "carbohydrate", label: "碳水化合物", min: 280, max: 420, alertLevel: "warning" },
          { field: "sodium", label: "钠", min: 1600, max: 2400, alertLevel: "warning" },
        ],
        mandatoryFields: ["energy", "protein", "fat", "carbohydrate"],
      },
      {
        name: "特殊医学用途配方食品", description: "GB 29922-2013 特殊医学用途配方食品通则", category: "special",
        targetValues: { energy: 8400, protein: 60, fat: 60, carbohydrate: 300, sodium: 2000 },
        toleranceRanges: [
          { field: "energy", label: "能量", min: 6720, max: 10080, alertLevel: "warning" },
          { field: "protein", label: "蛋白质", min: 48, max: 90, alertLevel: "warning" },
          { field: "fat", label: "脂肪", min: 48, max: 72, alertLevel: "warning" },
          { field: "carbohydrate", label: "碳水化合物", min: 240, max: 360, alertLevel: "warning" },
          { field: "sodium", label: "钠", min: 1600, max: 2400, alertLevel: "warning" },
        ],
        mandatoryFields: ["energy", "protein", "fat", "carbohydrate", "sodium"],
      },
    ];

    let inserted = 0;
    for (const profile of profiles) {
      try {
        await execute(
          "INSERT INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
          [
            crypto.randomUUID(), profile.name, profile.description, profile.category,
            JSON.stringify(profile.targetValues), JSON.stringify(profile.toleranceRanges),
            JSON.stringify(profile.mandatoryFields), now, now,
          ]
        );
        inserted++;
      } catch {
        // 忽略重复
      }
    }

    logger.info(`数据库初始化: 已插入 ${inserted} 条预置营养标准`);
  } catch (err: unknown) {
    logger.error("数据库初始化: 营养档案填充失败 - " + (err instanceof Error ? err.message : String(err)));
  }
}

async function seedDefaultPromptTemplates(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM ai_prompt_templates WHERE module = ?",
      ["smart-generate"]
    );
    if (countRow[0].cnt > 0) return;

    const now = new Date().toISOString();
    const templates = [
      {
        id: "pt_desc_default", module: "smart-generate", name: "标准配方描述模板", type: "description",
        system_prompt: "你是TingStudio的专业配方描述生成助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n\n请根据配方名称和原料信息，生成专业的配方描述。要求：\n1. 简述研发目标和主要功效特点\n2. 结合配方名称的含义和原料特性\n3. 100字以内\n4. 只输出描述文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight"]),
        is_default: 1, enabled: 1, sort_order: 0,
      },
      {
        id: "pt_prep_default", module: "smart-generate", name: "标准制法模板", type: "preparation",
        system_prompt: "你是TingStudio的专业配方制法生成助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n\n请根据配方名称和原料信息，生成专业的配方制法。要求：\n1. 描述制取工艺流程，包括提取、浓缩、收膏等关键步骤\n2. 结合配方名称的含义和原料特性\n3. 200字以内\n4. 只输出制法文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight"]),
        is_default: 1, enabled: 1, sort_order: 0,
      },
      {
        id: "pt_vr_default", module: "smart-generate", name: "标准升版原因模板", type: "version_reason",
        system_prompt: "你是TingStudio的专业配方升版原因生成助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n\n请根据配方名称和原料信息，分析可能的调整原因，生成升版原因说明。要求：\n1. 分析原料组成，推测可能的调整原因\n2. 结合配方名称的含义和原料特性\n3. 100字以内\n4. 只输出升版原因文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight"]),
        is_default: 1, enabled: 1, sort_order: 0,
      },
      {
        id: "pt_rev_default", module: "smart-generate", name: "升版描述修订模板", type: "revision",
        system_prompt: "你是TingStudio的专业配方描述修订助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n现有描述：{{existingDescription}}\n升版原因：{{revisionReason}}\n\n请根据升版原因，识别新旧配方的差异，生成更新后的配方描述。要求：\n1. 保留原描述中仍有效的部分\n2. 补充升版原因导致的变化\n3. 描述应专业、简洁，100字以内\n4. 只输出描述文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight", "existingDescription", "revisionReason"]),
        is_default: 1, enabled: 1, sort_order: 0,
      },
    ];

    for (const t of templates) {
      await execute(
        "INSERT IGNORE INTO ai_prompt_templates (id, module, name, type, system_prompt, user_prompt_template, variables, is_default, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [t.id, t.module, t.name, t.type, t.system_prompt, t.user_prompt_template, t.variables, t.is_default, t.enabled, t.sort_order, now, now]
      );
    }

    logger.info("数据库初始化: 已插入默认提示词模板");
  } catch (err: unknown) {
    logger.error("插入默认提示词模板失败: " + (err instanceof Error ? err.message : String(err)));
  }
}

async function seedExportCenterConfigs(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM export_center_config"
    );
    if (countRow[0].cnt > 0) return;

    const now = new Date().toISOString();
    const configs = [
      { key: "default_export_format", value: "excel", type: "string", desc: "默认导出格式" },
      { key: "default_template_formula", value: "", type: "string", desc: "配方默认模板ID" },
      { key: "default_template_material", value: "", type: "string", desc: "原料默认模板ID" },
      { key: "default_template_weekly_report", value: "", type: "string", desc: "周报默认模板ID" },
      { key: "default_template_monthly_report", value: "", type: "string", desc: "月报默认模板ID" },
      { key: "export_rate_limit", value: "10", type: "number", desc: "每小时导出次数限制" },
      { key: "file_naming_pattern", value: "{type}_{category}_{date}", type: "string", desc: "文件命名模板" },
      { key: "auto_delete_days", value: "30", type: "number", desc: "导出文件自动删除天数" },
    ];

    for (const c of configs) {
      await execute(
        "INSERT INTO export_center_config (config_key, config_value, config_type, description, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [c.key, c.value, c.type, c.desc, "system", now]
      );
    }

    logger.info("数据库初始化: 已插入导出中心默认配置");
  } catch (err: unknown) {
    logger.error("插入导出中心配置失败: " + (err instanceof Error ? err.message : String(err)));
  }
}

async function ensureInitialAiModels(): Promise<void> {
  try {
    const countRow = await query<Array<{ cnt: number }>>(
      "SELECT COUNT(*) as cnt FROM ai_models"
    );
    if (countRow[0].cnt > 0) return;

    const models = [
      {
        provider: "dashscope", name: "通义千问",
        base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key: process.env.AI_DASHSCOPE_API_KEY || "",
        model: process.env.AI_DASHSCOPE_MODEL || "qwen-plus",
        vision_model: process.env.AI_DASHSCOPE_VISION_MODEL || "qwen-vl-plus",
        vision_max_tokens: null,
        description: "阿里云通义千问大模型",
        supports_vision: 1, sort_order: 0,
      },
      {
        provider: "zhipu", name: "智谱GLM",
        base_url: "https://open.bigmodel.cn/api/paas/v4",
        api_key: process.env.AI_ZHIPU_API_KEY || "",
        model: process.env.AI_ZHIPU_MODEL || "glm-4-flash",
        vision_model: process.env.AI_ZHIPU_VISION_MODEL || "glm-4v-flash",
        vision_max_tokens: 1024,
        description: "智谱AI GLM系列大模型",
        supports_vision: 1, sort_order: 1,
      },
      {
        provider: "deepseek", name: "DeepSeek",
        base_url: "https://api.deepseek.com/v1",
        api_key: process.env.AI_DEEPSEEK_API_KEY || "",
        model: process.env.AI_DEEPSEEK_MODEL || "deepseek-chat",
        vision_model: "", vision_max_tokens: null,
        description: "DeepSeek深度求索大模型",
        supports_vision: 0, sort_order: 2,
      },
    ];

    for (const m of models) {
      const modelId = `model_${m.provider}`;
      await execute(
        "INSERT INTO ai_models (id, provider, name, base_url, api_key, model, vision_model, vision_max_tokens, description, supports_vision, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [modelId, m.provider, m.name, m.base_url, m.api_key, m.model, m.vision_model, m.vision_max_tokens, m.description, m.supports_vision, m.sort_order]
      );
      await execute(
        "INSERT INTO ai_alert_configs (id, model_id, provider, daily_call_limit, monthly_token_limit, warning_threshold, critical_threshold, enabled) VALUES (?, ?, ?, 500, 5000000, 80, 95, 1)",
        [`alert_${m.provider}`, modelId, m.provider]
      );
    }

    logger.info(`自动迁移: 初始化 ${models.length} 个AI模型配置`);
  } catch (err: unknown) {
    logger.error("初始化AI模型数据失败:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// 迁移逻辑
// ═══════════════════════════════════════════════════════════

async function runAutoMigrations(): Promise<void> {
  // 通用列迁移
  await ensureColumn("materials", "material_type", "VARCHAR(50)", "'herb'");
  await ensureColumn("materials", "unit_price", "DOUBLE", "NULL");
  await ensureColumn("materials", "data_source", "VARCHAR(50)", "'manual'");
  await ensureColumn("materials", "version", "INT", "1");
  await ensureColumn("materials", "previous_version_id", "VARCHAR(36)", "NULL");
  await ensureColumn("materials", "is_latest", "TINYINT", "1");
  await ensureColumn("materials", "is_deleted", "TINYINT", "0");
  await ensureColumn("materials", "changes_json", "TEXT", "NULL");
  await ensureColumn("materials", "status", "VARCHAR(50)", "'draft'");
  await ensureColumn("materials", "appearance_json", "TEXT", "NULL");
  await ensureColumn("materials", "taste_json", "TEXT", "NULL");
  await ensureColumn("materials", "efficacy_json", "TEXT", "NULL");

  await ensureColumn("material_nutrition", "material_version", "INT", "1");
  await ensureColumn("material_nutrition", "is_latest", "TINYINT", "1");
  await ensureColumn("material_nutrition", "field_sources_json", "TEXT", "NULL");
  await ensureColumn("material_nutrition", "source_type", "VARCHAR(50)", "'manual'");
  await ensureColumn("material_nutrition", "source_detail", "TEXT", "NULL");
  await ensureColumn("material_nutrition", "created_at", "DATETIME", "NULL");
  await ensureColumn("material_nutrition", "created_by", "VARCHAR(36)", "NULL");

  await ensureColumn("formulas", "finished_weight", "DOUBLE", "0");
  await ensureColumn("formulas", "ratio_factor", "DOUBLE", "0.18");
  await ensureColumn("formulas", "supplement_ratio_factor", "DOUBLE", "1.0");
  await ensureColumn("formulas", "packaging_price", "DOUBLE", "0");
  await ensureColumn("formulas", "other_price", "DOUBLE", "0");
  await ensureColumn("formulas", "profit_margin", "DOUBLE", "20");
  await ensureColumn("formulas", "preparation_method", "TEXT", "NULL");
  await ensureColumn("formulas", "original_name", "VARCHAR(255)", "NULL");
  await ensureColumn("formulas", "original_weight", "DOUBLE", "NULL");
  await ensureColumn("formula_versions", "ratio_factor", "DOUBLE", "0.18");
  await ensureColumn("formula_versions", "supplement_ratio_factor", "DOUBLE", "1.0");
  await ensureColumn("formula_versions", "updated_at", "DATETIME", "CURRENT_TIMESTAMP");

  await ensureColumn("users", "role_id", "VARCHAR(36)", "NULL");
  await ensureColumn("users", "is_active", "TINYINT", "1");
  await ensureColumn("users", "must_change_password", "TINYINT", "0");
  await ensureColumn("users", "data_source", "VARCHAR(50)", "'manual'");

  await ensureColumn("roles", "is_system", "TINYINT", "0");
  await ensureColumn("roles", "sort_order", "INT", "0");

  await ensureColumn("export_jobs", "data_category", "VARCHAR(50)", "'formula'");
  await ensureColumn("export_jobs", "version_id", "VARCHAR(36)", "NULL");

  await ensureColumn("ai_usage_logs", "application_name", "VARCHAR(255)", "NULL");
  await ensureColumn("ai_usage_logs", "application_location", "VARCHAR(255)", "NULL");

  await ensureColumn("agent_float_config", "model_name", "VARCHAR(255)", "''");
  await ensureColumn("agent_float_config", "fallback_model_name", "VARCHAR(255)", "''");

  await ensureColumn("nutrition_profiles", "created_by", "VARCHAR(36)", "NULL");

  await ensureColumn("parse_results", "tokens_used", "INT", "0");
  await ensureColumn("parse_results", "used_count", "INT", "0");
  await ensureColumn("parse_results", "model_provider", "VARCHAR(255)", "NULL");
  await ensureColumn("parse_results", "model_name", "VARCHAR(255)", "NULL");
  await ensureColumn("parse_results", "status", "VARCHAR(50)", "'pending'");
  await ensureColumn("parse_results", "prompt_tokens", "INT", "0");
  await ensureColumn("parse_results", "completion_tokens", "INT", "0");
  await ensureColumn("parse_results", "is_linked", "TINYINT", "0");
  await ensureColumn("parse_results", "linked_formula_id", "VARCHAR(36)", "NULL");
  await ensureColumn("parse_results", "linked_material_id", "VARCHAR(36)", "NULL");

  await ensureColumn("reports", "period_key", "VARCHAR(255)", "NULL");

  // 标记所有迁移为已完成
  const migrationVersions = [
    "20260101_remove_materials_code_unique",
    "20260102_remove_nutrition_material_id_unique",
    "20260103_material_columns",
    "20260104_nutrition_columns",
    "20260105_version_indexes",
    "20260106_version_defaults",
    "20260107_formula_columns",
    "20260108_fv_pending_review",
    "20260109_formula_review_logs",
    "20260110_fv_indexes",
    "20260111_material_prices",
    "20260112_formula_sales",
    "20260113_reports",
    "20260114_report_targets",
    "20260116_ai_tables",
    "20260117_agent_tables",
    "20260118_rbac",
    "20260119_user_preferences",
    "20260120_share_configs",
    "20260121_export_center",
    "20260122_export_jobs_category",
    "20260123_ratio_threshold",
    "20260124_material_review_logs",
    "20260125_search_export_cache",
    "20260126_quick_formulas",
    "20260127_parse_tables",
    "20260128_enum_options",
    "20260129_formula_templates",
    "20260130_nutrition_sources",
    "20260131_nutrition_profiles_created_by",
  ];
  for (const v of migrationVersions) {
    try {
      await execute("INSERT IGNORE INTO schema_migrations (version) VALUES (?)", [v]);
    } catch {
      // 忽略
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 连接与初始化
// ═══════════════════════════════════════════════════════════

export async function connectMySQL(): Promise<void> {
  try {
    if (pool) {
      return;
    }

    const config = getMySQLConfig();
    pool = mysql.createPool(config);

    // 验证连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    logger.info(`MySQL 数据库已连接: ${config.host}:${config.port}/${config.database}`);

    // 初始化表结构
    const tablesResult = await query<Array<{ TABLE_NAME: string }>>(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );
    if (tablesResult.length === 0) {
      logger.info("检测到空数据库，正在初始化表结构...");
      for (const sql of INIT_SQL_STATEMENTS) {
        await execute(sql);
      }
      logger.info("表结构初始化完成");
    }

    // 运行迁移
    await runAutoMigrations();

    // 自动 seed 必要数据（仅首次启动时执行，已有数据则跳过）
    await seedDefaultRoles();
    await seedDefaultAdmin();
    await seedCTierMaterials();
    await seedDefaultPermissions();
    await seedDefaultEnumOptions();
    await seedDefaultNutritionProfiles();
    await seedDefaultPromptTemplates();
    await seedExportCenterConfigs();
    await ensureInitialAiModels();

    logger.info("MySQL 数据库初始化完成");
  } catch (error) {
    logger.error("MySQL 数据库连接失败:", error);
    throw error;
  }
}
