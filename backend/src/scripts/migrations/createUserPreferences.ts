import { query, execute } from '../../config/database-adapter.js';

export async function up(): Promise<void> {
  console.log("[Migration] 开始：创建 user_preferences 表...");

  try {
    query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        preferences_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("[Migration] ✅ user_preferences 表创建成功");

    console.log("[Migration] ✅ user_preferences 迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 迁移失败:", message);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log("[Migration] 开始回滚 user_preferences 表...");

  try {
    query("DROP TABLE IF EXISTS user_preferences");
    console.log("[Migration] ✅ user_preferences 表回滚完成");
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
