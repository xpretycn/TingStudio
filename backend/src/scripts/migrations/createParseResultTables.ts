import { getDb, connectDatabase } from "../../config/database-better-sqlite3.js";
import crypto from "node:crypto";

connectDatabase();

async function migrateCreateParseResultTables() {
  console.log("开始迁移：创建解析结果存储表...\n");

  try {
    const db = getDb();

    // 创建 parse_results 表
    console.log("创建 parse_results 表...");
    db.exec(`
      CREATE TABLE IF NOT EXISTS parse_results (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        call_type TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        parsed_result TEXT NOT NULL,
        raw_response TEXT NOT NULL,
        model_provider TEXT,
        model_name TEXT,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        used_count INTEGER NOT NULL DEFAULT 0,
        is_linked INTEGER NOT NULL DEFAULT 0,
        linked_formula_id TEXT,
        linked_material_id TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log("✅ parse_results 表创建成功\n");

    // 创建索引
    console.log("创建索引...");
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_parse_results_user_id ON parse_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_parse_results_file_hash ON parse_results(file_hash);
      CREATE INDEX IF NOT EXISTS idx_parse_results_call_type ON parse_results(call_type);
      CREATE INDEX IF NOT EXISTS idx_parse_results_status ON parse_results(status);
      CREATE INDEX IF NOT EXISTS idx_parse_results_created_at ON parse_results(created_at);
      CREATE INDEX IF NOT EXISTS idx_parse_results_expires_at ON parse_results(expires_at);
    `);
    console.log("✅ 索引创建成功\n");

    // 创建 parse_result_configs 表
    console.log("创建 parse_result_configs 表...");
    db.exec(`
      CREATE TABLE IF NOT EXISTS parse_result_configs (
        id TEXT PRIMARY KEY,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT NOT NULL
      )
    `);
    console.log("✅ parse_result_configs 表创建成功\n");

    // 插入默认配置
    console.log("插入默认配置...");
    const now = new Date().toISOString();
    
    const configs = [
      { key: 'storage_limit', value: 5000, desc: '最大解析结果数量' },
      { key: 'cleanup_threshold_percent', value: 95, desc: '触发自动清理的阈值（百分比）' },
      { key: 'cleanup_batch_percent', value: 5, desc: '每次清理的比例（百分比）' },
      { key: 'retention_days', value: 30, desc: '保留天数（预留字段）' },
      { key: 'max_file_size_bytes', value: 5242880, desc: '可缓存文件大小上限（5MB）' },
    ];

    for (const config of configs) {
      const existing = db.prepare("SELECT id FROM parse_result_configs WHERE config_key = ?").get(config.key);
      if (!existing) {
        db.prepare(`
          INSERT INTO parse_result_configs (id, config_key, config_value, description, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          config.key,
          JSON.stringify(config.value),
          config.desc,
          now
        );
      }
    }
    console.log("✅ 默认配置插入成功\n");

    // 添加公式表关联字段（如果不存在）
    console.log("检查 formulas 表关联字段...");
    const formulasColumns = db.prepare("PRAGMA table_info(formulas)").all() as any[];
    const hasParseResultId = formulasColumns.some((col: any) => col.name === 'parse_result_id');
    
    if (!hasParseResultId) {
      db.exec(`
        ALTER TABLE formulas ADD COLUMN parse_result_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_formulas_parse_result_id ON formulas(parse_result_id);
      `);
      console.log("✅ formulas 表添加 parse_result_id 字段成功\n");
    } else {
      console.log("ℹ️ formulas 表已有 parse_result_id 字段\n");
    }

    // 添加 materials 表关联字段（如果不存在）
    console.log("检查 materials 表关联字段...");
    const materialsColumns = db.prepare("PRAGMA table_info(materials)").all() as any[];
    const hasMaterialParseResultId = materialsColumns.some((col: any) => col.name === 'parse_result_id');
    
    if (!hasMaterialParseResultId) {
      db.exec(`
        ALTER TABLE materials ADD COLUMN parse_result_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_materials_parse_result_id ON materials(parse_result_id);
      `);
      console.log("✅ materials 表添加 parse_result_id 字段成功\n");
    } else {
      console.log("ℹ️ materials 表已有 parse_result_id 字段\n");
    }

    console.log("\n✅ 迁移完成！");
    console.log("\n已创建的表：");
    console.log("  - parse_results: 解析结果主表");
    console.log("  - parse_result_configs: 配置表");
    console.log("\n已添加的字段：");
    console.log("  - formulas.parse_result_id");
    console.log("  - materials.parse_result_id");
    console.log("\n默认配置：");
    for (const config of configs) {
      console.log(`  - ${config.key}: ${config.value}`);
    }

  } catch (error: any) {
    console.error(`\n❌ 迁移失败:`, error.message);
    throw error;
  }
}

migrateCreateParseResultTables()
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n迁移失败:", err);
    process.exit(1);
  });
