import { query, execute } from '../../config/database-adapter.js';

export async function up(): Promise<void> {
  console.log("[Migration] 开始：创建 export_center_config 表...");

  try {
    query(`
      CREATE TABLE IF NOT EXISTS export_center_config (
        config_key TEXT PRIMARY KEY,
        config_value TEXT NOT NULL,
        config_type TEXT NOT NULL DEFAULT 'string' CHECK(config_type IN ('string', 'number', 'boolean', 'json')),
        description TEXT DEFAULT NULL,
        updated_by TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("[Migration] ✅ export_center_config 表创建成功");

    query("CREATE INDEX IF NOT EXISTS idx_ecc_config_type ON export_center_config(config_type)");
    console.log("[Migration] ✅ 索引创建成功");

    console.log("[Migration] ✅ export_center_config 迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 迁移失败:", message);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log("[Migration] 开始回滚 export_center_config 表...");

  try {
    query("DROP INDEX IF EXISTS idx_ecc_config_type");
    query("DROP TABLE IF EXISTS export_center_config");
    console.log("[Migration] ✅ export_center_config 表回滚完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 回滚失败:", message);
    throw error;
  }
}

connectDatabase()
  .then(() => up())
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("迁移失败:", err);
    process.exit(1);
  });
