import { query } from "../config/database-adapter.js";
import { generateId, now, safeJsonParse } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

type DbRow = Record<string, unknown>;

export async function saveNutritionSnapshot(
  formulaId: string,
  formulaVersionId: string | null,
  nutritionRefs: Record<string, {
    nutritionId: string;
    dataVersion: string;
    sourceType: string;
    per100gSnapshot: Record<string, number>;
  }>,
  totalNutrition: Record<string, number>,
  per100gNutrition: Record<string, number>,
  materialBreakdown: Record<string, unknown> | null,
  calculatedBy: string,
): Promise<string> {
  const existing = (await query(
    `SELECT snapshot_id FROM formula_nutrition_snapshots WHERE formula_id = ? AND (formula_version_id = ? OR (formula_version_id IS NULL AND ? IS NULL))`,
    [formulaId, formulaVersionId, formulaVersionId],
  )).rows[0] as DbRow | undefined;

  const refsJson = JSON.stringify(nutritionRefs);
  const totalJson = JSON.stringify(totalNutrition);
  const per100gJson = JSON.stringify(per100gNutrition);
  const breakdownJson = materialBreakdown ? JSON.stringify(materialBreakdown) : null;

  if (existing) {
    await query(
      `UPDATE formula_nutrition_snapshots SET nutrition_refs_json = ?, total_nutrition_json = ?, per_100g_json = ?, material_breakdown_json = ?, calculated_at = ?, calculated_by = ? WHERE snapshot_id = ?`,
      [refsJson, totalJson, per100gJson, breakdownJson, now(), calculatedBy, existing.snapshot_id],
    );
    return existing.snapshot_id as string;
  }

  const snapshotId = generateId();
  await query(
    `INSERT INTO formula_nutrition_snapshots (snapshot_id, formula_id, formula_version_id, nutrition_refs_json, total_nutrition_json, per_100g_json, material_breakdown_json, calculated_at, calculated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [snapshotId, formulaId, formulaVersionId, refsJson, totalJson, per100gJson, breakdownJson, now(), calculatedBy],
  );
  return snapshotId;
}

export async function getNutritionSnapshot(
  formulaId: string,
  formulaVersionId?: string | null,
): Promise<DbRow | null> {
  const sql = formulaVersionId
    ? `SELECT * FROM formula_nutrition_snapshots WHERE formula_id = ? AND formula_version_id = ?`
    : `SELECT * FROM formula_nutrition_snapshots WHERE formula_id = ? AND formula_version_id IS NULL`;
  const params = formulaVersionId ? [formulaId, formulaVersionId] : [formulaId];

  const row = (await query(sql, params)).rows[0] as DbRow | undefined;
  if (!row) return null;

  return {
    snapshotId: row.snapshot_id,
    formulaId: row.formula_id,
    formulaVersionId: row.formula_version_id,
    nutritionRefs: safeJsonParse(row.nutrition_refs_json as string, {}),
    totalNutrition: safeJsonParse(row.total_nutrition_json as string, {}),
    per100g: safeJsonParse(row.per_100g_json as string, {}),
    materialBreakdown: row.material_breakdown_json ? safeJsonParse(row.material_breakdown_json as string, null) : null,
    calculatedAt: row.calculated_at,
    calculatedBy: row.calculated_by,
  };
}
