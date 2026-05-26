// 快速配方表迁移脚本
import { query, connectDatabase } from "../../config/database-better-sqlite3.js";

/** 升级：创建 quick_formulas 表及索引 */
export async function up(): Promise<void> {
  console.log("[Migration] 开始创建 quick_formulas 表...");

  try {
    query(`
      CREATE TABLE IF NOT EXISTS quick_formulas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
        ratio_factor REAL NOT NULL DEFAULT 0.18,
        supplement_ratio_factor REAL NOT NULL DEFAULT 1.0,
        finished_weight REAL NOT NULL DEFAULT 0,
        materials_json TEXT NOT NULL DEFAULT '[]',
        packaging_price REAL NOT NULL DEFAULT 0,
        other_price REAL NOT NULL DEFAULT 0,
        profit_margin REAL NOT NULL DEFAULT 20,
        description TEXT DEFAULT NULL,
        preparation_method TEXT DEFAULT NULL,
        salesman_id TEXT DEFAULT NULL,
        salesman_name TEXT DEFAULT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("[Migration] quick_formulas 表创建成功");

    query(`CREATE INDEX IF NOT EXISTS idx_qf_name ON quick_formulas(name)`);
    query(`CREATE INDEX IF NOT EXISTS idx_qf_status ON quick_formulas(status)`);
    query(`CREATE INDEX IF NOT EXISTS idx_qf_created_by ON quick_formulas(created_by)`);
    query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_qf_name_user ON quick_formulas(name, created_by)`);
    console.log("[Migration] 索引创建成功");

    console.log("[Migration] quick_formulas 迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] quick_formulas 迁移失败:", message);
    throw error;
  }
}

/** 降级：删除 quick_formulas 表及索引 */
export async function down(): Promise<void> {
  console.log("[Migration] 开始回滚 quick_formulas 表...");

  try {
    query(`DROP INDEX IF EXISTS idx_qf_name_user`);
    query(`DROP INDEX IF EXISTS idx_qf_created_by`);
    query(`DROP INDEX IF EXISTS idx_qf_status`);
    query(`DROP INDEX IF EXISTS idx_qf_name`);
    query(`DROP TABLE IF EXISTS quick_formulas`);
    console.log("[Migration] quick_formulas 表回滚完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] quick_formulas 回滚失败:", message);
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
