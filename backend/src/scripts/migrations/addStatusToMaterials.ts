import { query, connectDatabase } from "../../config/database-adapter.js";

connectDatabase();

export async function migrateAddStatusToMaterials() {
  console.log("[Migration] 开始添加 status 字段到 materials 表...");

  try {
    const result = await query<{ name: string }>("PRAGMA table_info(materials)");
    const columnNames = (result.rows || []).map((col) => col.name);

    if (!columnNames.includes("status")) {
      await query("ALTER TABLE materials ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published'))");
      console.log("[Migration] ✅ materials.status 字段已添加");
    } else {
      console.log("[Migration] ⏭️ materials.status 字段已存在，跳过");
    }

    await query("UPDATE materials SET status = 'published' WHERE is_latest = 1 AND is_deleted = 0");
    await query("UPDATE materials SET status = 'published' WHERE is_latest = 0 AND is_deleted = 0");
    console.log("[Migration] ✅ 现有原料已设为 published");

    await query(`
      CREATE TABLE IF NOT EXISTS material_review_logs (
        review_log_id TEXT PRIMARY KEY,
        material_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        reviewer_name TEXT DEFAULT NULL,
        action TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject', 'publish')),
        comment TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("[Migration] ✅ material_review_logs 表已创建");

    await query("CREATE INDEX IF NOT EXISTS idx_mrl_material ON material_review_logs(material_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_mrl_reviewer ON material_review_logs(reviewer_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_mrl_action ON material_review_logs(action)");
    await query("CREATE INDEX IF NOT EXISTS idx_mrl_created_at ON material_review_logs(created_at)");
    await query("CREATE INDEX IF NOT EXISTS idx_material_status ON materials(status)");
    console.log("[Migration] ✅ 索引已创建");

    console.log("[Migration] ✅ status 迁移完成");
  } catch (error: any) {
    console.error("[Migration] ✗ 迁移失败:", error.message);
    throw error;
  }
}

migrateAddStatusToMaterials()
  .then(() => {
    console.log("\n✅ 迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 迁移失败:", err);
    process.exit(1);
  });
