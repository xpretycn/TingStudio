import { query, connectDatabase } from "../../config/database-better-sqlite3.js";

interface ColumnInfo {
  name: string;
}

export async function up(): Promise<void> {
  console.log("[Migration] 开始：添加 category 和 updated_at 字段到 export_templates 表...");

  try {
    const [tables] = query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='export_templates'"
    ) as [Array<{ name: string }>];
    if (!tables || tables.length === 0) {
      console.log("[Migration] export_templates 表不存在，跳过迁移");
      return;
    }

    const [columns] = query("PRAGMA table_info(export_templates)") as [Array<ColumnInfo>];
    const columnNames = columns.map((c) => c.name);

    if (!columnNames.includes("category")) {
      query(
        "ALTER TABLE export_templates ADD COLUMN category TEXT NOT NULL DEFAULT 'formula' CHECK(category IN ('formula', 'material', 'weekly-report', 'monthly-report'))"
      );
      console.log("[Migration] ✅ export_templates 表已添加 category 字段");
    } else {
      console.log("[Migration] ⏭️ export_templates 表 category 字段已存在，跳过");
    }

    if (!columnNames.includes("updated_at")) {
      query(
        "ALTER TABLE export_templates ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'"
      );
      query("UPDATE export_templates SET updated_at = created_at WHERE updated_at = '1970-01-01 00:00:00'");
      console.log("[Migration] ✅ export_templates 表已添加 updated_at 字段");
    } else {
      console.log("[Migration] ⏭️ export_templates 表 updated_at 字段已存在，跳过");
    }

    query("CREATE INDEX IF NOT EXISTS idx_et_category ON export_templates(category)");
    query("CREATE INDEX IF NOT EXISTS idx_et_category_type ON export_templates(category, type)");
    console.log("[Migration] ✅ 索引创建成功");

    console.log("[Migration] ✅ export_templates 迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 迁移失败:", message);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log("[Migration] 开始回滚 export_templates 表...");

  try {
    query("DROP INDEX IF EXISTS idx_et_category_type");
    query("DROP INDEX IF EXISTS idx_et_category");
    console.log("[Migration] ✅ 索引已删除");
    console.log("[Migration] ⚠️ category 和 updated_at 字段无法通过 ALTER TABLE 移除，需手动重建表");
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
