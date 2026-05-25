import { query, connectDatabase } from "../../config/database-adapter.js";

connectDatabase();

export async function migrateAddEnumFieldsToMaterials() {
  console.log("[Migration] 开始：添加枚举字段到原料表...");

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS enum_options (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK(category IN ('appearance', 'taste', 'efficacy')),
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(category, value)
      )
    `);
    console.log("[Migration] ✅ enum_options 表已就绪");

    await query("CREATE INDEX IF NOT EXISTS idx_enum_category ON enum_options(category)");
    await query("CREATE INDEX IF NOT EXISTS idx_enum_category_active ON enum_options(category, is_active)");
    console.log("[Migration] ✅ enum_options 索引已就绪");

    const columns: string[] = ["appearance_json", "taste_json", "efficacy_json"];

    for (const col of columns) {
      const checkResult = await query<{ name: string }>("PRAGMA table_info(materials)");
      const exists = (checkResult.rows || []).some((r) => r.name === col);
      if (!exists) {
        await query(`ALTER TABLE materials ADD COLUMN ${col} TEXT DEFAULT NULL`);
        console.log(`[Migration] ✅ materials 表已添加 ${col} 字段`);
      } else {
        console.log(`[Migration] ⏭️ materials 表 ${col} 字段已存在，跳过`);
      }
    }

    console.log("[Migration] ✅ 枚举字段迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 迁移失败:", message);
    throw error;
  }
}

migrateAddEnumFieldsToMaterials()
  .then(() => {
    console.log("\n✅ 迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 迁移失败:", err);
    process.exit(1);
  });
