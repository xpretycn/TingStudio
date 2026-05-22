import { query, connectDatabase } from "../../config/database.js";

connectDatabase();

async function migrateAddVersionToMaterials() {
  console.log("[Migration] 开始原料版本化迁移...");

  try {
    // 0. 检查 materials 表的 code 字段是否有 UNIQUE 约束
    const [indexList]: any[] = await query("PRAGMA index_list(materials)");
    const hasUniqueCode = (indexList || []).some(
      (idx: any) => idx.origin === "c" && idx.unique === 1 && idx.name !== "sqlite_autoindex_materials_1",
    );

    if (hasUniqueCode) {
      console.log("[Migration] 检测到 materials.code UNIQUE 约束，需要重建表...");
      await rebuildMaterialsTable();
    } else {
      console.log("[Migration] ⏭️ materials.code 无 UNIQUE 约束，跳过重建");
    }

    // 1. 检查版本化字段是否存在
    const mResult = await query("PRAGMA table_info(materials)");
    const mColumns = (mResult.rows || []).map((col: any) => col.name);

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
    const nResult = await query("PRAGMA table_info(material_nutrition)");
    const nColumns = (nResult.rows || []).map((col: any) => col.name);

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

    // 3. 检查 material_nutrition 的 material_id UNIQUE 约束
    const nIndexResult = await query("PRAGMA index_list(material_nutrition)");
    const hasNutUniqueMaterial = (nIndexResult.rows || []).some(
      (idx: any) => idx.origin === "c" && idx.unique === 1 && idx.name !== "sqlite_autoindex_material_nutrition_1",
    );

    if (hasNutUniqueMaterial) {
      console.log("[Migration] 检测到 material_nutrition.material_id UNIQUE 约束，需要重建表...");
      await rebuildNutritionTable();
    } else {
      console.log("[Migration] ⏭️ material_nutrition.material_id 无 UNIQUE 约束，跳过重建");
    }

    console.log("[Migration] ✅ 原料版本化迁移完成");
  } catch (error: any) {
    console.error("[Migration] ✗ 迁移失败:", error.message);
    throw error;
  }
}

async function rebuildMaterialsTable() {
  console.log("[Migration] 重建 materials 表（移除 code UNIQUE 约束）...");

  await query(`
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

  const oldResult = await query("PRAGMA table_info(materials)");
  const oldCols = (oldResult.rows || []).map((c: any) => c.name);
  const newResult = await query("PRAGMA table_info(materials_new)");
  const newCols = (newResult.rows || []).map((c: any) => c.name);
  const commonCols = oldCols.filter((c: string) => newCols.includes(c));

  await query(`INSERT INTO materials_new (${commonCols.join(", ")}) SELECT ${commonCols.join(", ")} FROM materials`);
  await query("DROP TABLE materials");
  await query("ALTER TABLE materials_new RENAME TO materials");

  await query("CREATE INDEX IF NOT EXISTS idx_material_name ON materials(name)");
  await query("CREATE INDEX IF NOT EXISTS idx_material_code ON materials(code)");
  await query("CREATE INDEX IF NOT EXISTS idx_material_version ON materials(version)");
  await query("CREATE INDEX IF NOT EXISTS idx_material_previous_version ON materials(previous_version_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_material_is_latest ON materials(is_latest)");
  await query("CREATE INDEX IF NOT EXISTS idx_material_is_deleted ON materials(is_deleted)");

  console.log("[Migration] ✅ materials 表重建完成（code UNIQUE 已移除）");
}

async function rebuildNutritionTable() {
  console.log("[Migration] 重建 material_nutrition 表（移除 material_id UNIQUE 约束）...");

  await query(`
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

  const oldResult = await query("PRAGMA table_info(material_nutrition)");
  const oldCols = (oldResult.rows || []).map((c: any) => c.name);
  const newResult = await query("PRAGMA table_info(material_nutrition_new)");
  const newCols = (newResult.rows || []).map((c: any) => c.name);
  const commonCols = oldCols.filter((c: string) => newCols.includes(c));

  await query(`INSERT INTO material_nutrition_new (${commonCols.join(", ")}) SELECT ${commonCols.join(", ")} FROM material_nutrition`);
  await query("DROP TABLE material_nutrition");
  await query("ALTER TABLE material_nutrition_new RENAME TO material_nutrition");

  await query("CREATE INDEX IF NOT EXISTS idx_mn_material_version ON material_nutrition(material_id, material_version)");
  await query("CREATE INDEX IF NOT EXISTS idx_mn_is_latest ON material_nutrition(is_latest)");

  console.log("[Migration] ✅ material_nutrition 表重建完成（material_id UNIQUE 已移除）");
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