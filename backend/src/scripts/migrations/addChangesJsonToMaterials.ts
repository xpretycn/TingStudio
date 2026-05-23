import { getDb, connectDatabase } from "../../config/database-better-sqlite3.js";

connectDatabase();

async function migrateAddChangesJsonToMaterials() {
  console.log("[Migration] 开始添加 changes_json 字段到 materials 表...");

  try {
    const db = getDb();
    const cols = db.pragma("table_info(materials)") as Array<{ name: string }>;
    const columnNames = cols.map((col) => col.name);

    if (!columnNames.includes("changes_json")) {
      db.exec("ALTER TABLE materials ADD COLUMN changes_json TEXT DEFAULT NULL");
      console.log("[Migration] ✅ materials.changes_json 字段已添加");
    } else {
      console.log("[Migration] ⏭️ materials.changes_json 字段已存在，跳过");
    }

    console.log("[Migration] ✅ changes_json 迁移完成");
  } catch (error: any) {
    console.error("[Migration] ✗ 迁移失败:", error.message);
    throw error;
  }
}

migrateAddChangesJsonToMaterials()
  .then(() => {
    console.log("\n✅ 迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 迁移失败:", err);
    process.exit(1);
  });
