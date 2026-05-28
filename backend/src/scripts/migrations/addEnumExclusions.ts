import { query, connectDatabase } from "../../config/database-adapter.js";

connectDatabase();

export async function migrateAddEnumExclusions() {
  console.log("[Migration] 开始：创建枚举互斥规则表...");

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS enum_exclusions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK(category IN ('appearance', 'taste')),
        value_a TEXT NOT NULL,
        value_b TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(category, value_a, value_b),
        CHECK(value_a < value_b)
      )
    `);
    console.log("[Migration] ✅ enum_exclusions 表已就绪");

    await query("CREATE INDEX IF NOT EXISTS idx_exclusion_category ON enum_exclusions(category)");
    await query("CREATE INDEX IF NOT EXISTS idx_exclusion_value_a ON enum_exclusions(value_a)");
    await query("CREATE INDEX IF NOT EXISTS idx_exclusion_value_b ON enum_exclusions(value_b)");
    console.log("[Migration] ✅ enum_exclusions 索引已就绪");

    console.log("[Migration] ✅ 枚举互斥规则表迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 迁移失败:", message);
    throw error;
  }
}

migrateAddEnumExclusions()
  .then(() => {
    console.log("\n✅ 迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 迁移失败:", err);
    process.exit(1);
  });
