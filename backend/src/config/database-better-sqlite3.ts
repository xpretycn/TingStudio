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

function ensureTable(dbInstance: Database.Database, tableName: string, createSql: string) {
  try {
    const exists = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    if (!exists) {
      dbInstance.exec(createSql);
      logger.info(`数据库迁移: 创建表 ${tableName}`);
    }
  } catch (_err) {}
}

function seedDefaultPromptTemplates(dbInstance: Database.Database) {
  try {
    const count = (dbInstance.prepare("SELECT COUNT(*) as cnt FROM ai_prompt_templates WHERE module = ?").get("smart-generate") as any).cnt;
    if (count > 0) return;
    const now = new Date().toISOString();
    const templates = [
      {
        id: "pt_desc_default",
        module: "smart-generate",
        name: "标准配方描述模板",
        type: "description",
        system_prompt: "你是TingStudio的专业配方描述生成助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n\n请根据配方名称和原料信息，生成专业的配方描述。要求：\n1. 简述研发目标和主要功效特点\n2. 结合配方名称的含义和原料特性\n3. 100字以内\n4. 只输出描述文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight"]),
        is_default: 1,
        enabled: 1,
        sort_order: 0,
      },
      {
        id: "pt_prep_default",
        module: "smart-generate",
        name: "标准制法模板",
        type: "preparation",
        system_prompt: "你是TingStudio的专业配方制法生成助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n\n请根据配方名称和原料信息，生成专业的配方制法。要求：\n1. 描述制取工艺流程，包括提取、浓缩、收膏等关键步骤\n2. 结合配方名称的含义和原料特性\n3. 200字以内\n4. 只输出制法文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight"]),
        is_default: 1,
        enabled: 1,
        sort_order: 0,
      },
      {
        id: "pt_vr_default",
        module: "smart-generate",
        name: "标准升版原因模板",
        type: "version_reason",
        system_prompt: "你是TingStudio的专业配方升版原因生成助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n\n请根据配方名称和原料信息，分析可能的调整原因，生成升版原因说明。要求：\n1. 分析原料组成，推测可能的调整原因\n2. 结合配方名称的含义和原料特性\n3. 100字以内\n4. 只输出升版原因文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight"]),
        is_default: 1,
        enabled: 1,
        sort_order: 0,
      },
      {
        id: "pt_rev_default",
        module: "smart-generate",
        name: "升版描述修订模板",
        type: "revision",
        system_prompt: "你是TingStudio的专业配方描述修订助手，只输出纯文本内容。",
        user_prompt_template: "配方名称：{{formulaName}}\n原料：{{materials}}\n成品重量：{{finishedWeight}}g\n现有描述：{{existingDescription}}\n升版原因：{{revisionReason}}\n\n请根据升版原因，识别新旧配方的差异，生成更新后的配方描述。要求：\n1. 保留原描述中仍有效的部分\n2. 补充升版原因导致的变化\n3. 描述应专业、简洁，100字以内\n4. 只输出描述文本，不要其他内容",
        variables: JSON.stringify(["formulaName", "materials", "finishedWeight", "existingDescription", "revisionReason"]),
        is_default: 1,
        enabled: 1,
        sort_order: 0,
      },
    ];
    const stmt = dbInstance.prepare(
      "INSERT OR IGNORE INTO ai_prompt_templates (id, module, name, type, system_prompt, user_prompt_template, variables, is_default, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const t of templates) {
      stmt.run(t.id, t.module, t.name, t.type, t.system_prompt, t.user_prompt_template, t.variables, t.is_default, t.enabled, t.sort_order, now, now);
    }
    logger.info("数据库初始化: 已插入默认提示词模板");
  } catch (err: any) {
    logger.error("插入默认提示词模板失败: " + err.message);
  }
}

function runAutoMigrations(dbInstance: Database.Database) {
  // 0. 检测并移除 materials.code UNIQUE 约束（版本化需要同 code 多版本）
  try {
    const indexes = dbInstance.pragma("index_list(materials)") as any[];
    const hasUniqueCode = indexes.some(
      (idx: any) => idx.origin === "c" && idx.unique === 1 && idx.name !== "sqlite_autoindex_materials_1",
    );
    if (hasUniqueCode) {
      logger.info("数据库迁移: 检测到 materials.code UNIQUE 约束，重建表...");
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS materials_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL,
          unit TEXT NOT NULL DEFAULT 'g',
          stock REAL NOT NULL DEFAULT 0,
          material_type TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
          unit_price REAL DEFAULT NULL,
          data_source TEXT DEFAULT 'manual',
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          version INTEGER NOT NULL DEFAULT 1,
          previous_version_id TEXT DEFAULT NULL,
          is_latest INTEGER NOT NULL DEFAULT 1,
          is_deleted INTEGER NOT NULL DEFAULT 0
        )
      `);
      const oldCols = (dbInstance.pragma("table_info(materials)") as any[]).map((c: any) => c.name);
      const newCols = (dbInstance.pragma("table_info(materials_new)") as any[]).map((c: any) => c.name);
      const commonCols = oldCols.filter((c: string) => newCols.includes(c));
      dbInstance.prepare(`INSERT INTO materials_new (${commonCols.join(", ")}) SELECT ${commonCols.join(", ")} FROM materials`).run();
      dbInstance.exec("DROP TABLE materials");
      dbInstance.exec("ALTER TABLE materials_new RENAME TO materials");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_name ON materials(name)");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_code ON materials(code)");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_version ON materials(version)");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_previous_version ON materials(previous_version_id)");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_is_latest ON materials(is_latest)");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_is_deleted ON materials(is_deleted)");
      logger.info("数据库迁移: materials 表重建完成（code UNIQUE 已移除）");
    }
  } catch (err: any) {
    logger.error("数据库迁移: materials 表重建失败 - " + err.message);
  }

  // 0.1 检测并移除 material_nutrition.material_id UNIQUE 约束
  try {
    const nutIndexes = dbInstance.pragma("index_list(material_nutrition)") as any[];
    const hasNutUnique = nutIndexes.some(
      (idx: any) => idx.origin === "c" && idx.unique === 1 && idx.name !== "sqlite_autoindex_material_nutrition_1",
    );
    if (hasNutUnique) {
      logger.info("数据库迁移: 检测到 material_nutrition.material_id UNIQUE 约束，重建表...");
      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS material_nutrition_new (
          nutrition_id TEXT PRIMARY KEY,
          material_id TEXT NOT NULL,
          per_100g_json TEXT NOT NULL,
          data_version TEXT NOT NULL DEFAULT '1.0',
          data_source TEXT DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          confidence TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
          last_updated TEXT NOT NULL DEFAULT (datetime('now')),
          material_version INTEGER NOT NULL DEFAULT 1,
          is_latest INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        )
      `);
      const oldCols = (dbInstance.pragma("table_info(material_nutrition)") as any[]).map((c: any) => c.name);
      const newCols = (dbInstance.pragma("table_info(material_nutrition_new)") as any[]).map((c: any) => c.name);
      const commonCols = oldCols.filter((c: string) => newCols.includes(c));
      dbInstance.prepare(`INSERT INTO material_nutrition_new (${commonCols.join(", ")}) SELECT ${commonCols.join(", ")} FROM material_nutrition`).run();
      dbInstance.exec("DROP TABLE material_nutrition");
      dbInstance.exec("ALTER TABLE material_nutrition_new RENAME TO material_nutrition");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_mn_material_version ON material_nutrition(material_id, material_version)");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_mn_is_latest ON material_nutrition(is_latest)");
      logger.info("数据库迁移: material_nutrition 表重建完成（material_id UNIQUE 已移除）");
    }
  } catch (err: any) {
    logger.error("数据库迁移: material_nutrition 表重建失败 - " + err.message);
  }

  ensureColumn(dbInstance, "materials", "material_type", "TEXT", "'herb'");
  ensureColumn(dbInstance, "materials", "unit_price", "REAL", "NULL");
  ensureColumn(dbInstance, "materials", "data_source", "TEXT", "'manual'");

  // 原料版本化字段
  ensureColumn(dbInstance, "materials", "version", "INTEGER", "1");
  ensureColumn(dbInstance, "materials", "previous_version_id", "TEXT", "NULL");
  ensureColumn(dbInstance, "materials", "is_latest", "INTEGER", "1");
  ensureColumn(dbInstance, "materials", "is_deleted", "INTEGER", "0");

  // 营养表版本化字段
  ensureColumn(dbInstance, "material_nutrition", "material_version", "INTEGER", "1");
  ensureColumn(dbInstance, "material_nutrition", "is_latest", "INTEGER", "1");

  // 版本化索引
  try {
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_version ON materials(version)");
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_previous_version ON materials(previous_version_id)");
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_is_latest ON materials(is_latest)");
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_material_is_deleted ON materials(is_deleted)");
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_mn_material_version ON material_nutrition(material_id, material_version)");
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_mn_is_latest ON material_nutrition(is_latest)");
  } catch (_err) {}

  // 更新现有新数据库的 is_latest/is_deleted 默认值
  try {
    dbInstance.exec("UPDATE materials SET version = 1 WHERE version IS NULL");
    dbInstance.exec("UPDATE materials SET is_latest = 1 WHERE is_latest IS NULL");
    dbInstance.exec("UPDATE materials SET is_deleted = 0 WHERE is_deleted IS NULL");
    dbInstance.exec("UPDATE material_nutrition SET material_version = 1 WHERE material_version IS NULL");
    dbInstance.exec("UPDATE material_nutrition SET is_latest = 1 WHERE is_latest IS NULL");
  } catch (_err) {}
  ensureColumn(dbInstance, "formulas", "finished_weight", "REAL", "0");
  ensureColumn(dbInstance, "formulas", "ratio_factor", "REAL", "0.18");
  ensureColumn(dbInstance, "formulas", "supplement_ratio_factor", "REAL", "1.0");
  ensureColumn(dbInstance, "formulas", "packaging_price", "REAL", "0");
  ensureColumn(dbInstance, "formulas", "other_price", "REAL", "0");
  ensureColumn(dbInstance, "formulas", "profit_margin", "REAL", "20");
  ensureColumn(dbInstance, "formulas", "preparation_method", "TEXT", "NULL");
  ensureColumn(dbInstance, "formulas", "original_name", "TEXT", "NULL");
  ensureColumn(dbInstance, "formulas", "original_weight", "REAL", "NULL");
  ensureColumn(dbInstance, "formula_versions", "ratio_factor", "REAL", "0.18");
  ensureColumn(dbInstance, "formula_versions", "supplement_ratio_factor", "REAL", "1.0");

  // 0.2 检测 formula_versions.status CHECK 约束是否包含 pending_review
  try {
    const fvCreateSql = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='formula_versions'").get() as any;
    if (fvCreateSql && fvCreateSql.sql && !fvCreateSql.sql.includes("pending_review")) {
      logger.info("数据库迁移: formula_versions.status 约束缺少 pending_review，重建表...");
      const oldCols = (dbInstance.pragma("table_info(formula_versions)") as any[]).map((c: any) => c.name);

      dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS formula_versions_new (
          version_id              TEXT PRIMARY KEY,
          formula_id              TEXT NOT NULL,
          version_number          TEXT NOT NULL,
          version_name            TEXT DEFAULT NULL,
          version_reason          TEXT DEFAULT NULL,
          changes_json            TEXT DEFAULT NULL,
          snapshot_json           TEXT NOT NULL,
          status                  TEXT NOT NULL DEFAULT 'draft'
                                  CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
          is_current              INTEGER NOT NULL DEFAULT 0,
          ratio_factor            REAL NOT NULL DEFAULT 0.18
                                  CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
          supplement_ratio_factor REAL NOT NULL DEFAULT 1.0
                                  CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
          created_by              TEXT NOT NULL,
          created_at              TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
        )
      `);

      const newCols = (dbInstance.pragma("table_info(formula_versions_new)") as any[]).map((c: any) => c.name);
      const commonCols = oldCols.filter((c: string) => newCols.includes(c));
      dbInstance.prepare(`INSERT INTO formula_versions_new (${commonCols.join(", ")}) SELECT ${commonCols.join(", ")} FROM formula_versions`).run();
      dbInstance.exec("DROP TABLE formula_versions");
      dbInstance.exec("ALTER TABLE formula_versions_new RENAME TO formula_versions");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_fv_formula ON formula_versions(formula_id)");
      dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_fv_version_number ON formula_versions(formula_id, version_number)");
      logger.info("数据库迁移: formula_versions 表重建完成（status 约束已含 pending_review）");
    }
  } catch (err: any) {
    logger.error("数据库迁移: formula_versions 表重建失败 - " + err.message);
  }

  // 0.3 创建 formula_review_logs 表和相关索引
  ensureTable(
    dbInstance,
    "formula_review_logs",
    `
    CREATE TABLE formula_review_logs (
      review_log_id  TEXT PRIMARY KEY,
      version_id     TEXT NOT NULL,
      reviewer_id    TEXT NOT NULL,
      reviewer_name  TEXT DEFAULT NULL,
      action         TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
      comment        TEXT DEFAULT NULL,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_frl_version ON formula_review_logs(version_id);
    CREATE INDEX IF NOT EXISTS idx_frl_reviewer ON formula_review_logs(reviewer_id);
    CREATE INDEX IF NOT EXISTS idx_frl_action ON formula_review_logs(action)
  `,
  );

  try {
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_fv_status ON formula_versions(status)");
    dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_fv_formula_status ON formula_versions(formula_id, status)");
  } catch (err: any) {
    logger.error("数据库迁移: formula_versions 索引创建失败 - " + err.message);
  }

  ensureMaterialPrices(dbInstance);
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
    "reports",
    `
    CREATE TABLE reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('weekly', 'monthly')),
      title TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
      data_json TEXT NOT NULL DEFAULT '{}',
      generated_by TEXT NOT NULL DEFAULT 'manual' CHECK(generated_by IN ('auto', 'manual')),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT DEFAULT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
    CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period_start, period_end);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by)
    `,
  );
  ensureTable(
    dbInstance,
    "report_targets",
    `
    CREATE TABLE report_targets (
      id TEXT PRIMARY KEY,
      period_type TEXT NOT NULL CHECK(period_type IN ('quarterly', 'yearly')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      targets_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
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
      last_accessed_at TEXT DEFAULT NULL
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
  ensureTable(
    dbInstance,
    "file_relations",
    `
    CREATE TABLE file_relations (
      relation_id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      related_id TEXT NOT NULL,
      related_type TEXT NOT NULL CHECK(related_type IN ('formula', 'material')),
      related_name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (file_id) REFERENCES uploaded_files(file_id) ON DELETE CASCADE,
      UNIQUE(file_id, related_id, related_type)
    );
    CREATE INDEX IF NOT EXISTS idx_fr_file ON file_relations(file_id);
    CREATE INDEX IF NOT EXISTS idx_fr_related ON file_relations(related_id, related_type)
    `,
  );
  ensureTable(
    dbInstance,
    "ai_models",
    `
    CREATE TABLE ai_models (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      model TEXT NOT NULL,
      vision_model TEXT DEFAULT '',
      vision_max_tokens INTEGER DEFAULT NULL,
      description TEXT DEFAULT '',
      supports_vision INTEGER NOT NULL DEFAULT 0,
      health_status TEXT NOT NULL DEFAULT 'unknown',
      last_health_check TEXT DEFAULT NULL,
      last_health_latency INTEGER DEFAULT NULL,
      health_check_interval_days INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
    CREATE INDEX IF NOT EXISTS idx_ai_models_health ON ai_models(health_status)
    `,
  );
  ensureTable(
    dbInstance,
    "ai_usage_logs",
    `
    CREATE TABLE ai_usage_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      call_type TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      error_message TEXT DEFAULT NULL,
      request_summary TEXT DEFAULT NULL,
      fallback_from TEXT DEFAULT NULL,
      user_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_date ON ai_usage_logs(provider, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_call_type ON ai_usage_logs(call_type);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_status ON ai_usage_logs(status)
    `,
  );
  ensureTable(
    dbInstance,
    "ai_alert_configs",
    `
    CREATE TABLE ai_alert_configs (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      daily_call_limit INTEGER NOT NULL DEFAULT 0,
      monthly_token_limit INTEGER NOT NULL DEFAULT 0,
      warning_threshold INTEGER NOT NULL DEFAULT 80,
      critical_threshold INTEGER NOT NULL DEFAULT 95,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ai_alert_model ON ai_alert_configs(model_id)
    `,
  );
  ensureTable(
    dbInstance,
    "ai_alert_records",
    `
    CREATE TABLE ai_alert_records (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      level TEXT NOT NULL,
      threshold INTEGER NOT NULL,
      current_value INTEGER NOT NULL,
      limit_value INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_alert_rec_provider ON ai_alert_records(provider, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_alert_rec_level ON ai_alert_records(level, is_read)
    `,
  );
  ensureTable(
    dbInstance,
    "ai_health_records",
    `
    CREATE TABLE ai_health_records (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      latency_ms INTEGER DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      checked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_health_provider_date ON ai_health_records(provider, checked_at)
    `,
  );
  ensureTable(
    dbInstance,
    "ai_fallback_configs",
    `
    CREATE TABLE ai_fallback_configs (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      fallback_provider TEXT NOT NULL,
      fallback_priority INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
      UNIQUE(model_id, fallback_provider)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_fallback_model ON ai_fallback_configs(model_id)
  `,
  );
  ensureTable(
    dbInstance,
    "model_applications",
    `
    CREATE TABLE model_applications (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL UNIQUE,
      module_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      description TEXT DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_by TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_model_app_module ON model_applications(module);
    CREATE INDEX IF NOT EXISTS idx_model_app_provider ON model_applications(provider)
  `,
  );
  ensureTable(
    dbInstance,
    "ai_prompt_templates",
    `
    CREATE TABLE ai_prompt_templates (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'description',
      system_prompt TEXT NOT NULL DEFAULT '',
      user_prompt_template TEXT NOT NULL DEFAULT '',
      variables TEXT DEFAULT '[]',
      is_default INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_prompt_module ON ai_prompt_templates(module);
    CREATE INDEX IF NOT EXISTS idx_ai_prompt_type ON ai_prompt_templates(module, type)
  `,
  );
  seedDefaultPromptTemplates(dbInstance);
  ensureTable(
    dbInstance,
    "agent_sessions",
    `
    CREATE TABLE agent_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      message_count INTEGER DEFAULT 0,
      last_intent TEXT DEFAULT NULL,
      last_active_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_active ON agent_sessions(user_id, last_active_at DESC)
  `,
  );
  ensureTable(
    dbInstance,
    "agent_messages",
    `
    CREATE TABLE agent_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT DEFAULT '',
      intent TEXT DEFAULT NULL,
      tool_calls TEXT DEFAULT NULL,
      tool_results TEXT DEFAULT NULL,
      display_type TEXT DEFAULT NULL,
      metadata TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_session_created ON agent_messages(session_id, created_at)
  `,
  );
  ensureTable(
    dbInstance,
    "search_export_cache",
    `
    CREATE TABLE search_export_cache (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      sql TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      file_path TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_search_export_user ON search_export_cache(user_id);
    CREATE INDEX IF NOT EXISTS idx_search_export_expires ON search_export_cache(expires_at)
  `,
  );
  ensureTable(
    dbInstance,
    "agent_pending_confirmations",
    `
    CREATE TABLE agent_pending_confirmations (
      session_id TEXT PRIMARY KEY,
      tool_name TEXT NOT NULL,
      params_json TEXT NOT NULL,
      confirm_message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
    )
  `,
  );

  ensureTable(
    dbInstance,
    "agent_pending_forms",
    `
    CREATE TABLE agent_pending_forms (
      session_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      form_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
    )
  `,
  );

  ensureTable(
    dbInstance,
    "agent_role_config",
    `
    CREATE TABLE agent_role_config (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      agent_name TEXT NOT NULL DEFAULT '小听',
      user_title TEXT NOT NULL DEFAULT '老板',
      greeting TEXT DEFAULT '',
      tone_style TEXT DEFAULT 'professional',
      custom_instructions TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
  );

  ensureTable(
    dbInstance,
    "agent_float_config",
    `
    CREATE TABLE agent_float_config (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      enabled INTEGER DEFAULT 1,
      model TEXT DEFAULT 'deepseek',
      model_name TEXT DEFAULT '',
      fallback_model TEXT DEFAULT '',
      fallback_model_name TEXT DEFAULT '',
      position TEXT DEFAULT 'right',
      drawer_width INTEGER DEFAULT 400,
      theme_color TEXT DEFAULT '',
      show_pulse INTEGER DEFAULT 1,
      enabled_pages TEXT DEFAULT '[]',
      max_rounds INTEGER DEFAULT 10,
      fill_strategy TEXT DEFAULT 'overwrite',
      context_mode TEXT DEFAULT 'page',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
  );

  ensureColumn(dbInstance, "agent_float_config", "model_name", "TEXT", "''");
  ensureColumn(dbInstance, "agent_float_config", "fallback_model_name", "TEXT", "''");

  ensureColumn(dbInstance, "ai_usage_logs", "application_name", "TEXT", "NULL");
  ensureColumn(dbInstance, "ai_usage_logs", "application_location", "TEXT", "NULL");

  ensureTable(
    dbInstance,
    "agent_provider_health",
    `
    CREATE TABLE agent_provider_health (
      provider TEXT PRIMARY KEY,
      consecutive_failures INTEGER DEFAULT 0,
      circuit_open INTEGER DEFAULT 0,
      circuit_open_until TEXT DEFAULT NULL,
      last_error TEXT DEFAULT NULL,
      last_failure_at TEXT DEFAULT NULL,
      last_success_at TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_agent_provider_health_circuit ON agent_provider_health(circuit_open, circuit_open_until)
  `,
  );

  ensureTable(
    dbInstance,
    "agent_session_cleanup_log",
    `
    CREATE TABLE agent_session_cleanup_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cleaned_sessions INTEGER DEFAULT 0,
      cleaned_messages INTEGER DEFAULT 0,
      cleaned_confirmations INTEGER DEFAULT 0,
      cleaned_forms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_agent_cleanup_log_created ON agent_session_cleanup_log(created_at DESC)
  `,
  );

  ensureTable(
    dbInstance,
    "parse_templates",
    `
    CREATE TABLE parse_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'nutrition' CHECK(category IN ('formula', 'nutrition', 'general')),
      default_provider TEXT DEFAULT NULL,
      default_model TEXT DEFAULT NULL,
      custom_prompt TEXT DEFAULT NULL,
      field_mapping TEXT DEFAULT '{}',
      validation_rules TEXT DEFAULT '{}',
      is_preset INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pt_category ON parse_templates(category);
    CREATE INDEX IF NOT EXISTS idx_pt_created_by ON parse_templates(created_by)
    `,
  );

  ensureTable(
    dbInstance,
    "ratio_threshold_configs",
    `
    CREATE TABLE ratio_threshold_configs (
      id TEXT PRIMARY KEY,
      normal_low REAL NOT NULL DEFAULT 0.98,
      normal_high REAL NOT NULL DEFAULT 1.02,
      warning_low REAL NOT NULL DEFAULT 0.95,
      warning_high REAL NOT NULL DEFAULT 1.05,
      high_warning_low REAL NOT NULL DEFAULT 0.92,
      high_warning_high REAL NOT NULL DEFAULT 1.08,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    )
    `,
  );

  ensureInitialAiModels(dbInstance);
}

function ensureInitialAiModels(dbInstance: Database.Database) {
  try {
    const count = (dbInstance.prepare("SELECT COUNT(*) as cnt FROM ai_models").get() as any).cnt;
    if (count > 0) return;

    const models = [
      {
        provider: "dashscope",
        name: "通义千问",
        base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key: process.env.AI_DASHSCOPE_API_KEY || "",
        model: process.env.AI_DASHSCOPE_MODEL || "qwen-plus",
        vision_model: process.env.AI_DASHSCOPE_VISION_MODEL || "qwen-vl-plus",
        vision_max_tokens: null,
        description: "阿里云通义千问大模型",
        supports_vision: 1,
        sort_order: 0,
      },
      {
        provider: "zhipu",
        name: "智谱GLM",
        base_url: "https://open.bigmodel.cn/api/paas/v4",
        api_key: process.env.AI_ZHIPU_API_KEY || "",
        model: process.env.AI_ZHIPU_MODEL || "glm-4-flash",
        vision_model: process.env.AI_ZHIPU_VISION_MODEL || "glm-4v-flash",
        vision_max_tokens: 1024,
        description: "智谱AI GLM系列大模型",
        supports_vision: 1,
        sort_order: 1,
      },
      {
        provider: "deepseek",
        name: "DeepSeek",
        base_url: "https://api.deepseek.com/v1",
        api_key: process.env.AI_DEEPSEEK_API_KEY || "",
        model: process.env.AI_DEEPSEEK_MODEL || "deepseek-chat",
        vision_model: "",
        vision_max_tokens: null,
        description: "DeepSeek深度求索大模型",
        supports_vision: 0,
        sort_order: 2,
      },
    ];

    const insertModel = dbInstance.prepare(`
      INSERT INTO ai_models (id, provider, name, base_url, api_key, model, vision_model, vision_max_tokens, description, supports_vision, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertAlert = dbInstance.prepare(`
      INSERT INTO ai_alert_configs (id, model_id, provider, daily_call_limit, monthly_token_limit, warning_threshold, critical_threshold, enabled)
      VALUES (?, ?, ?, 500, 5000000, 80, 95, 1)
    `);

    const now = new Date().toISOString();
    for (const m of models) {
      const modelId = `model_${m.provider}`;
      insertModel.run(
        modelId,
        m.provider,
        m.name,
        m.base_url,
        m.api_key,
        m.model,
        m.vision_model,
        m.vision_max_tokens,
        m.description,
        m.supports_vision,
        m.sort_order,
      );
      insertAlert.run(`alert_${m.provider}`, modelId, m.provider);
    }
    logger.info(`自动迁移: 初始化 ${models.length} 个AI模型配置`);
  } catch (err) {
    logger.error("初始化AI模型数据失败:", err);
  }
}

const MATERIAL_DEFAULT_PRICES: Record<string, number> = {
  佛手: 60,
  重瓣玫瑰花: 80,
  茯苓: 55,
  山药: 28,
  桔梗: 50,
  甘草: 35,
  低聚异麦芽糖: 8,
  桃仁: 70,
  短梗五加: 45,
  桑椹: 65,
  黄精: 55,
  黄芪: 42,
  沙棘: 48,
  枸杞子: 58,
  香橼: 40,
  陈皮: 38,
  平卧菊三七: 50,
  重瓣红玫瑰: 75,
  金银花: 52,
  葛根: 32,
  荷叶: 25,
  竹叶黄酮: 120,
  纳豆: 60,
  显脉旋覆花: 45,
  栀子: 35,
  西红花: 800,
  当归: 55,
  芦根: 20,
  薄荷: 42,
  白芷: 40,
  薏苡仁: 22,
  化橘红: 48,
  鱼腥草: 18,
  乌药叶: 35,
  黄芥子: 30,
  苦杏仁: 45,
  蒲公英: 22,
  麦冬: 50,
  西洋参: 300,
  牡蛎: 80,
  昆布: 25,
  丹凤牡丹花: 70,
  百合: 35,
  麦芽: 18,
  姜黄: 48,
  山茱萸: 60,
  肉桂: 35,
  山楂: 20,
  酸枣仁: 80,
  鸡内金: 55,
  人参: 280,
  大黄: 25,
  小茴香: 28,
  炮姜: 55,
  菊花: 38,
  槐花: 18,
  炒白扁豆: 15,
  肉豆蔻: 66,
  铁皮石斛: 350,
  "r-氨基丁酸": 200,
  地龙蛋白肽粉: 150,
  白术: 38,
  淡竹叶: 15,
  马齿苋: 12,
  杏仁: 45,
  赤小豆: 16,
  阿胶: 280,
  莲子: 35,
  芡实: 30,
  小麦: 5,
  桑葫鲜果: 45,
  酸枣蜜炼: 120,
  黄精蜜炼: 95,
};

function ensureMaterialPrices(dbInstance: Database.Database) {
  try {
    const rows = dbInstance.prepare("SELECT id, name, unit_price FROM materials").all() as any[];
    let fixed = 0;
    for (const row of rows) {
      if (row.unit_price !== null && row.unit_price !== undefined) continue;
      const price = MATERIAL_DEFAULT_PRICES[row.name as string];
      if (price !== undefined) {
        dbInstance.prepare("UPDATE materials SET unit_price = ? WHERE id = ?").run(price, row.id);
        fixed++;
      }
    }
    if (fixed > 0) logger.info(`自动迁移: 补全 ${fixed} 条原料单价`);
  } catch (_err) {}
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
  code TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  stock REAL NOT NULL DEFAULT 0,
  material_type TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
  unit_price REAL DEFAULT NULL,
  data_source TEXT DEFAULT 'manual',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1,
  previous_version_id TEXT DEFAULT NULL,
  is_latest INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_material_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_material_code ON materials(code);
CREATE INDEX IF NOT EXISTS idx_material_version ON materials(version);
CREATE INDEX IF NOT EXISTS idx_material_previous_version ON materials(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_material_is_latest ON materials(is_latest);
CREATE INDEX IF NOT EXISTS idx_material_is_deleted ON materials(is_deleted);
CREATE TABLE IF NOT EXISTS formulas (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  salesman_id TEXT NOT NULL,
  salesman_name TEXT NOT NULL,
  materials_json TEXT NOT NULL,
  finished_weight REAL NOT NULL DEFAULT 0,
  ratio_factor REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  packaging_price REAL NOT NULL DEFAULT 0,
  other_price REAL NOT NULL DEFAULT 0,
  profit_margin REAL NOT NULL DEFAULT 20,
  description TEXT DEFAULT NULL,
  preparation_method TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_formula_name ON formulas(name);
CREATE INDEX IF NOT EXISTS idx_formula_code ON formulas(code);
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
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
  is_current INTEGER NOT NULL DEFAULT 0,
  ratio_factor REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fv_formula ON formula_versions(formula_id);
CREATE INDEX IF NOT EXISTS idx_fv_version_number ON formula_versions(formula_id, version_number);
CREATE INDEX IF NOT EXISTS idx_fv_status ON formula_versions(status);
CREATE INDEX IF NOT EXISTS idx_fv_formula_status ON formula_versions(formula_id, status);
CREATE TABLE IF NOT EXISTS formula_review_logs (
  review_log_id  TEXT PRIMARY KEY,
  version_id     TEXT NOT NULL,
  reviewer_id    TEXT NOT NULL,
  reviewer_name  TEXT DEFAULT NULL,
  action         TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
  comment        TEXT DEFAULT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_frl_version ON formula_review_logs(version_id);
CREATE INDEX IF NOT EXISTS idx_frl_reviewer ON formula_review_logs(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_frl_action ON formula_review_logs(action);
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
  material_id TEXT NOT NULL,
  per_100g_json TEXT NOT NULL,
  data_version TEXT NOT NULL DEFAULT '1.0',
  data_source TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  confidence TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  material_version INTEGER NOT NULL DEFAULT 1,
  is_latest INTEGER NOT NULL DEFAULT 1,
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
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('weekly', 'monthly')),
  title TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  data_json TEXT NOT NULL DEFAULT '{}',
  generated_by TEXT NOT NULL DEFAULT 'manual' CHECK(generated_by IN ('auto', 'manual')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT DEFAULT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE TABLE IF NOT EXISTS report_targets (
  id TEXT PRIMARY KEY,
  period_type TEXT NOT NULL CHECK(period_type IN ('quarterly', 'yearly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  targets_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
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
