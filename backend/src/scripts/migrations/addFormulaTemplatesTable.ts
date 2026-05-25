// 配方模板表迁移脚本
import { query, connectDatabase } from "../../config/database.js";

/** 升级：创建 formula_templates 表及索引 */
export async function up(): Promise<void> {
  console.log("[Migration] 开始创建 formula_templates 表...");

  try {
    query(`
      CREATE TABLE IF NOT EXISTS formula_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        ratio_factor REAL NOT NULL DEFAULT 0.18,
        supplement_ratio_factor REAL NOT NULL DEFAULT 1.0,
        finished_weight REAL NOT NULL DEFAULT 0,
        materials_json TEXT NOT NULL,
        packaging_price REAL NOT NULL DEFAULT 0,
        other_price REAL NOT NULL DEFAULT 0,
        profit_margin REAL NOT NULL DEFAULT 20,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("[Migration] formula_templates 表创建成功");

    query(`CREATE INDEX IF NOT EXISTS idx_template_name ON formula_templates(name)`);
    query(`CREATE INDEX IF NOT EXISTS idx_template_created_by ON formula_templates(created_by)`);
    console.log("[Migration] 索引创建成功");

    console.log("[Migration] formula_templates 迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] formula_templates 迁移失败:", message);
    throw error;
  }
}

/** 降级：删除 formula_templates 表及索引 */
export async function down(): Promise<void> {
  console.log("[Migration] 开始回滚 formula_templates 表...");

  try {
    query(`DROP INDEX IF EXISTS idx_template_created_by`);
    query(`DROP INDEX IF EXISTS idx_template_name`);
    query(`DROP TABLE IF EXISTS formula_templates`);
    console.log("[Migration] formula_templates 表回滚完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] formula_templates 回滚失败:", message);
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
