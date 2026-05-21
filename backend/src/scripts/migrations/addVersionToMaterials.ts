import { query, connectDatabase } from "../../config/database.js";

connectDatabase();

async function migrateAddVersionToMaterials() {
  console.log("[Migration] 开始原料版本化迁移...");

  try {
    // 1. materials 表
    const [mTableInfo]: any[] = await query("PRAGMA table_info(materials)");
    const mColumns = mTableInfo.map((col: any) => col.name);

    if (!mColumns.includes("version")) {
      await query("ALTER TABLE materials ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
      await query("ALTER TABLE materials ADD COLUMN previous_version_id TEXT DEFAULT NULL");
      await query("ALTER TABLE materials ADD COLUMN is_latest INTEGER NOT NULL DEFAULT 1");
      await query("ALTER TABLE materials ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0");

      await query("UPDATE materials SET version = 1, is_latest = 1 WHERE version IS NULL");

      await query("CREATE INDEX IF NOT EXISTS idx_material_version ON materials(version)");
      await query("CREATE INDEX IF NOT EXISTS idx_material_previous_version ON materials(previous_version_id)");
      await query("CREATE INDEX IF NOT EXISTS idx_material_is_latest ON materials(is_latest)");
      await query("CREATE INDEX IF NOT EXISTS idx_material_is_deleted ON materials(is_deleted)");

      console.log("[Migration] ✅ materials 表版本字段已添加");
    } else {
      console.log("[Migration] ⏭️ materials 表版本字段已存在，跳过");
    }

    // 2. material_nutrition 表
    const [nTableInfo]: any[] = await query("PRAGMA table_info(material_nutrition)");
    const nColumns = nTableInfo.map((col: any) => col.name);

    if (!nColumns.includes("material_version")) {
      await query("ALTER TABLE material_nutrition ADD COLUMN material_version INTEGER NOT NULL DEFAULT 1");
      await query("ALTER TABLE material_nutrition ADD COLUMN is_latest INTEGER NOT NULL DEFAULT 1");

      await query("UPDATE material_nutrition SET material_version = 1, is_latest = 1 WHERE material_version IS NULL");

      await query("CREATE INDEX IF NOT EXISTS idx_mn_material_version ON material_nutrition(material_id, material_version)");
      await query("CREATE INDEX IF NOT EXISTS idx_mn_is_latest ON material_nutrition(is_latest)");

      console.log("[Migration] ✅ material_nutrition 表版本字段已添加");
    } else {
      console.log("[Migration] ⏭️ material_nutrition 表版本字段已存在，跳过");
    }

    console.log("[Migration] ✅ 原料版本化迁移完成");
  } catch (error: any) {
    console.error("[Migration] ✗ 迁移失败:", error.message);
    throw error;
  }
}

migrateAddVersionToMaterials()
  .then(() => {
    console.log("\n✅ 迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 迁移失败:", err);
    process.exit(1);
  });