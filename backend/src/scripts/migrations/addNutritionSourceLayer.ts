import { query, connectDatabase } from "../../config/database-adapter.js";
import { logger } from "../../utils/logger.js";

async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const result = await query(`PRAGMA table_info(${table})`);
    return result.rows.some((row: Record<string, unknown>) => row.name === column);
  } catch {
    return false;
  }
}

async function tableExists(table: string): Promise<boolean> {
  try {
    const result = await query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function runMigration(): Promise<void> {
  logger.info("[Migration] 开始营养数据治理迁移...");

  if (!(await tableExists("material_nutrition_sources"))) {
    await query(`
      CREATE TABLE IF NOT EXISTS material_nutrition_sources (
        source_id     TEXT PRIMARY KEY,
        material_id   TEXT NOT NULL,
        source_type   TEXT NOT NULL DEFAULT 'manual' CHECK(source_type IN ('manual', 'tianapi', 'seed', 'ai', 'excel_import', 'other')),
        source_detail TEXT DEFAULT NULL,
        per_100g_json TEXT NOT NULL,
        confidence    TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
        match_score   REAL DEFAULT NULL,
        notes         TEXT DEFAULT NULL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        created_by    TEXT DEFAULT NULL,
        is_active     INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_mns_material ON material_nutrition_sources(material_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_mns_source_type ON material_nutrition_sources(source_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_mns_material_type ON material_nutrition_sources(material_id, source_type)`);
    logger.info("[Migration] ✓ material_nutrition_sources 表已创建");
  } else {
    logger.info("[Migration] ✓ material_nutrition_sources 表已存在，跳过");
  }

  if (!(await tableExists("formula_nutrition_snapshots"))) {
    await query(`
      CREATE TABLE IF NOT EXISTS formula_nutrition_snapshots (
        snapshot_id         TEXT PRIMARY KEY,
        formula_id          TEXT NOT NULL,
        formula_version_id  TEXT DEFAULT NULL,
        nutrition_refs_json TEXT NOT NULL,
        total_nutrition_json TEXT NOT NULL,
        per_100g_json       TEXT NOT NULL,
        material_breakdown_json TEXT DEFAULT NULL,
        calculated_at       TEXT NOT NULL DEFAULT (datetime('now')),
        calculated_by       TEXT DEFAULT NULL,
        FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_fnss_formula ON formula_nutrition_snapshots(formula_id)`);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS uk_fnss_version ON formula_nutrition_snapshots(formula_id, formula_version_id)`);
    logger.info("[Migration] ✓ formula_nutrition_snapshots 表已创建");
  } else {
    logger.info("[Migration] ✓ formula_nutrition_snapshots 表已存在，跳过");
  }

  const columnsToAdd: Array<{ column: string; definition: string }> = [
    { column: "field_sources_json", definition: "TEXT DEFAULT NULL" },
    { column: "source_type", definition: "TEXT DEFAULT 'manual'" },
    { column: "source_detail", definition: "TEXT DEFAULT NULL" },
    { column: "created_at", definition: "TEXT DEFAULT NULL" },
    { column: "created_by", definition: "TEXT DEFAULT NULL" },
  ];

  for (const { column, definition } of columnsToAdd) {
    if (!(await columnExists("material_nutrition", column))) {
      await query(`ALTER TABLE material_nutrition ADD COLUMN ${column} ${definition}`);
      logger.info(`[Migration] ✓ material_nutrition.${column} 字段已添加`);
    } else {
      logger.info(`[Migration] ✓ material_nutrition.${column} 字段已存在，跳过`);
    }
  }

  const existingSources = (await query(`SELECT COUNT(*) as cnt FROM material_nutrition_sources`)).rows[0] as Record<string, unknown>;
  if ((existingSources.cnt as number) === 0) {
    logger.info("[Migration] 开始迁移现有营养数据到来源层...");
    await query(`
      INSERT INTO material_nutrition_sources (source_id, material_id, source_type, source_detail, per_100g_json, confidence, notes, created_at, created_by, is_active)
      SELECT
        lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
        material_id,
        CASE
          WHEN data_source LIKE '%xls%' OR data_source LIKE '%excel%' OR data_source LIKE '%Excel%' THEN 'excel_import'
          WHEN data_source LIKE '%AI%' OR data_source LIKE '%智能%' OR data_source LIKE '%ai%' THEN 'ai'
          WHEN data_source LIKE '%API%' OR data_source LIKE '%api%' OR data_source LIKE '%天行%' THEN 'tianapi'
          WHEN data_source LIKE '%食物成分表%' OR data_source LIKE '%种子%' OR data_source LIKE '%标准%' THEN 'seed'
          ELSE 'manual'
        END,
        data_source,
        per_100g_json,
        COALESCE(confidence, 'medium'),
        notes,
        COALESCE(last_updated, datetime('now')),
        NULL,
        1
      FROM material_nutrition
      WHERE is_latest = 1
    `);
    logger.info("[Migration] ✓ 现有营养数据已迁移到来源层");
  } else {
    logger.info("[Migration] ✓ 来源层已有数据，跳过迁移");
  }

  await query(`
    UPDATE material_nutrition SET
      source_type = CASE
        WHEN data_source LIKE '%xls%' OR data_source LIKE '%excel%' OR data_source LIKE '%Excel%' THEN 'excel_import'
        WHEN data_source LIKE '%AI%' OR data_source LIKE '%智能%' OR data_source LIKE '%ai%' THEN 'ai'
        WHEN data_source LIKE '%API%' OR data_source LIKE '%api%' OR data_source LIKE '%天行%' THEN 'tianapi'
        WHEN data_source LIKE '%食物成分表%' OR data_source LIKE '%种子%' OR data_source LIKE '%标准%' THEN 'seed'
        ELSE 'manual'
      END,
      source_detail = data_source,
      created_at = COALESCE(created_at, last_updated)
    WHERE source_type = 'manual' AND data_source IS NOT NULL AND data_source != 'manual'
  `);

  logger.info("[Migration] ✓ 营养数据治理迁移完成");
}

if (process.argv[1]?.endsWith("addNutritionSourceLayer.ts")) {
  connectDatabase()
    .then(() => runMigration())
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error("[Migration] 迁移失败:", err);
      process.exit(1);
    });
}
