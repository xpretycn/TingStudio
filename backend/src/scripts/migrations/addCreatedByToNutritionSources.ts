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

async function indexExists(indexName: string): Promise<boolean> {
  try {
    const result = await query(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`, [indexName]);
    return result.rows.length > 0;
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
  logger.info("[Migration] 开始营养来源 created_by 索引迁移...");

  if (!(await tableExists("material_nutrition_sources"))) {
    logger.warn("[Migration] material_nutrition_sources 表不存在，跳过");
    return;
  }

  if (!(await columnExists("material_nutrition_sources", "created_by"))) {
    await query(`ALTER TABLE material_nutrition_sources ADD COLUMN created_by TEXT DEFAULT NULL`);
    logger.info("[Migration] ✓ material_nutrition_sources.created_by 字段已添加");
  } else {
    logger.info("[Migration] ✓ material_nutrition_sources.created_by 字段已存在，跳过");
  }

  if (!(await indexExists("idx_mns_created_by"))) {
    await query(`CREATE INDEX IF NOT EXISTS idx_mns_created_by ON material_nutrition_sources(created_by)`);
    logger.info("[Migration] ✓ idx_mns_created_by 索引已创建");
  } else {
    logger.info("[Migration] ✓ idx_mns_created_by 索引已存在，跳过");
  }

  const orphanResult = await query<{ count: number }>(
    "SELECT COUNT(*) as count FROM material_nutrition_sources WHERE created_by IS NULL"
  )
  const orphanRow = orphanResult.rows[0] as Record<string, unknown> | undefined
  const orphanCount = Number(orphanRow?.count ?? 0);

  if (orphanCount > 0) {
    logger.warn(`[Migration] ⚠ ${orphanCount} 条来源数据缺少 created_by 字段，将回退为 admin 角色访问`);
  } else {
    logger.info("[Migration] ✓ 所有来源数据均有关联 created_by");
  }

  logger.info("[Migration] ✓ 营养来源 created_by 索引迁移完成");
}

if (process.argv[1]?.endsWith("addCreatedByToNutritionSources.ts")) {
  connectDatabase()
    .then(() => runMigration())
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error("[Migration] 迁移失败:", err);
      process.exit(1);
    });
}
