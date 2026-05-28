import { query, connectDatabase } from "../../config/database-better-sqlite3.js";

interface ColumnInfo {
  name: string;
}

const NEW_SCHEMA = `
  job_id TEXT PRIMARY KEY,
  formula_id TEXT DEFAULT NULL,
  version_id TEXT DEFAULT NULL,
  template_id TEXT DEFAULT NULL,
  data_category TEXT NOT NULL DEFAULT 'formula' CHECK(data_category IN ('formula', 'material', 'weekly-report', 'monthly-report')),
  target_ids_json TEXT DEFAULT NULL,
  export_type TEXT NOT NULL CHECK(export_type IN ('pdf', 'excel')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  period_start TEXT DEFAULT NULL,
  period_end TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT DEFAULT NULL,
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE SET NULL
`;

const OLD_SCHEMA = `
  job_id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  version_id TEXT DEFAULT NULL,
  template_id TEXT DEFAULT NULL,
  export_type TEXT NOT NULL CHECK(export_type IN ('pdf', 'excel', 'api')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  api_endpoint TEXT DEFAULT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT DEFAULT NULL,
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
`;

export async function up(): Promise<void> {
  console.log("[Migration] 开始：迁移 export_jobs 表结构...");

  try {
    const [tables] = query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='export_jobs'"
    ) as [Array<{ name: string }>];

    if (!tables || tables.length === 0) {
      console.log("[Migration] export_jobs 表不存在，直接创建新结构");
      query(`CREATE TABLE IF NOT EXISTS export_jobs (${NEW_SCHEMA})`);
      createIndexes();
      console.log("[Migration] ✅ export_jobs 表创建完成");
      return;
    }

    const [columns] = query("PRAGMA table_info(export_jobs)") as [Array<ColumnInfo>];
    const columnNames = columns.map((c) => c.name);

    if (columnNames.includes("data_category")) {
      console.log("[Migration] ⏭️ export_jobs 表已包含 data_category 字段，跳过迁移");
      createIndexes();
      return;
    }

    console.log("[Migration] 检测到旧结构，开始重建表...");

    query("DROP TABLE IF EXISTS export_jobs_new");

    query(`CREATE TABLE export_jobs_new (${NEW_SCHEMA})`);
    console.log("[Migration] ✅ 临时表 export_jobs_new 创建成功");

    const oldColumnNames = columnNames;
    const selectParts: string[] = [];
    const selectValues: string[] = [];

    const columnMappings: Array<{ target: string; source: string }> = [
      { target: "job_id", source: "job_id" },
      { target: "formula_id", source: "formula_id" },
      { target: "version_id", source: "version_id" },
      { target: "template_id", source: "template_id" },
      { target: "data_category", source: "'formula'" },
      { target: "target_ids_json", source: "NULL" },
      {
        target: "export_type",
        source: "CASE WHEN export_type = 'api' THEN 'excel' ELSE export_type END",
      },
      { target: "status", source: "status" },
      { target: "file_url", source: "file_url" },
      { target: "file_name", source: "file_name" },
      { target: "progress", source: "progress" },
      { target: "error_message", source: "error_message" },
      { target: "period_start", source: "NULL" },
      { target: "period_end", source: "NULL" },
      { target: "created_by", source: "created_by" },
      { target: "created_at", source: "created_at" },
      { target: "updated_at", source: "datetime('now')" },
      { target: "completed_at", source: "completed_at" },
    ];

    for (const mapping of columnMappings) {
      selectParts.push(mapping.target);
      if (mapping.source.startsWith("'") || mapping.source.startsWith("NULL") || mapping.source.startsWith("CASE") || mapping.source.startsWith("datetime")) {
        selectValues.push(mapping.source);
      } else if (oldColumnNames.includes(mapping.source)) {
        selectValues.push(mapping.source);
      } else {
        selectValues.push("NULL");
      }
    }

    const insertSql = `INSERT INTO export_jobs_new (${selectParts.join(", ")}) SELECT ${selectValues.join(", ")} FROM export_jobs`;
    query(insertSql);
    console.log("[Migration] ✅ 数据迁移完成");

    query("DROP TABLE export_jobs");
    console.log("[Migration] ✅ 旧表已删除");

    query("ALTER TABLE export_jobs_new RENAME TO export_jobs");
    console.log("[Migration] ✅ 表重命名完成");

    createIndexes();

    console.log("[Migration] ✅ export_jobs 迁移完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 迁移失败:", message);
    throw error;
  }
}

function createIndexes(): void {
  query("CREATE INDEX IF NOT EXISTS idx_ej_formula ON export_jobs(formula_id)");
  query("CREATE INDEX IF NOT EXISTS idx_ej_status ON export_jobs(status)");
  query("CREATE INDEX IF NOT EXISTS idx_ej_data_category ON export_jobs(data_category)");
  query("CREATE INDEX IF NOT EXISTS idx_ej_created_by ON export_jobs(created_by)");
  query("CREATE INDEX IF NOT EXISTS idx_ej_category_status ON export_jobs(data_category, status)");
  console.log("[Migration] ✅ 索引创建成功");
}

export async function down(): Promise<void> {
  console.log("[Migration] 开始回滚 export_jobs 表...");
  console.log("[Migration] ⚠️ 回滚将丢失 data_category、target_ids_json、period_start、period_end、updated_at 字段数据");

  try {
    const [tables] = query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='export_jobs'"
    ) as [Array<{ name: string }>];

    if (!tables || tables.length === 0) {
      console.log("[Migration] export_jobs 表不存在，跳过回滚");
      return;
    }

    const [columns] = query("PRAGMA table_info(export_jobs)") as [Array<ColumnInfo>];
    const columnNames = columns.map((c) => c.name);

    if (!columnNames.includes("data_category")) {
      console.log("[Migration] ⏭️ export_jobs 表已是旧结构，跳过回滚");
      return;
    }

    query("DROP TABLE IF EXISTS export_jobs_old");

    query(`CREATE TABLE export_jobs_old (${OLD_SCHEMA})`);
    console.log("[Migration] ✅ 临时旧结构表创建成功");

    query(
      `INSERT INTO export_jobs_old (job_id, formula_id, version_id, template_id, export_type, status, file_url, file_name, api_endpoint, progress, error_message, created_by, created_at, completed_at)
       SELECT job_id, formula_id, version_id, template_id, export_type, status, file_url, file_name, NULL, progress, error_message, created_by, created_at, completed_at
       FROM export_jobs`
    );
    console.log("[Migration] ✅ 数据回迁完成");

    query("DROP TABLE export_jobs");
    query("ALTER TABLE export_jobs_old RENAME TO export_jobs");
    console.log("[Migration] ✅ 表回滚完成");

    query("CREATE INDEX IF NOT EXISTS idx_ej_formula ON export_jobs(formula_id)");
    query("CREATE INDEX IF NOT EXISTS idx_ej_status ON export_jobs(status)");
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
