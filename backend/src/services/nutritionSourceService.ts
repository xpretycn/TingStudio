import { query } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase, rowsToCamelCase, safeJsonParse } from "../utils/helpers.js";
import { normalizePer100g } from "../utils/nutritionHelpers.js";
import { NUTRIENT_FIELDS, NUTRIENT_LABELS, NUTRIENT_META } from "../config/nutritionConstants.js";

type DbRow = Record<string, unknown>;

const VALID_SOURCE_TYPES = ["manual", "tianapi", "seed", "ai", "excel_import", "other"] as const;
type SourceType = (typeof VALID_SOURCE_TYPES)[number];

function classifyDataSource(dataSource: string | null): SourceType {
  if (!dataSource) return "manual";
  const ds = dataSource.toLowerCase();
  if (ds.includes("xls") || ds.includes("excel")) return "excel_import";
  if (ds.includes("ai") || ds.includes("智能")) return "ai";
  if (ds.includes("api") || ds.includes("天行")) return "tianapi";
  if (ds.includes("食物成分表") || ds.includes("种子") || ds.includes("标准")) return "seed";
  return "manual";
}

export async function addNutritionSource(
  materialId: string,
  sourceType: string,
  per100g: Record<string, number>,
  sourceDetail?: string,
  confidence?: string,
  matchScore?: number,
  notes?: string,
  userId?: string,
): Promise<{ success: boolean; sourceId?: string; message?: string }> {
  if (!VALID_SOURCE_TYPES.includes(sourceType as SourceType)) {
    return { success: false, message: `无效的来源类型: ${sourceType}` };
  }

  const material = (await query("SELECT id FROM materials WHERE id = ?", [materialId])).rows[0] as DbRow | undefined;
  if (!material) return { success: false, message: "原料不存在" };

  await query(
    `UPDATE material_nutrition_sources SET is_active = 0 WHERE material_id = ? AND source_type = ? AND is_active = 1`,
    [materialId, sourceType],
  );

  const sourceId = generateId();
  const per100gJson = JSON.stringify(per100g);
  const validConfidence = confidence && ["high", "medium", "low"].includes(confidence) ? confidence : "medium";

  await query(
    `INSERT INTO material_nutrition_sources (source_id, material_id, source_type, source_detail, per_100g_json, confidence, match_score, notes, created_at, created_by, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [sourceId, materialId, sourceType, sourceDetail || null, per100gJson, validConfidence, matchScore ?? null, notes || null, now(), userId || null],
  );

  return { success: true, sourceId };
}

export async function getNutritionSources(materialId: string, includeInactive = false): Promise<DbRow[]> {
  const sql = includeInactive
    ? `SELECT * FROM material_nutrition_sources WHERE material_id = ? ORDER BY created_at DESC`
    : `SELECT * FROM material_nutrition_sources WHERE material_id = ? AND is_active = 1 ORDER BY created_at DESC`;
  const rows = (await query(sql, [materialId])).rows as DbRow[];
  return rows.map((row) => {
    const camel = rowToCamelCase(row);
    return {
      ...camel,
      per100g: normalizePer100g(safeJsonParse(row.per_100g_json as string, {})),
    };
  });
}

export async function getNutritionSourcesCompare(materialId: string): Promise<Record<string, unknown>> {
  const material = (await query("SELECT id, name FROM materials WHERE id = ?", [materialId])).rows[0] as DbRow | undefined;
  if (!material) return { materialId, materialName: null, authoritative: null, nutrients: [], summary: { totalSources: 0, totalNutrients: 0, diffCount: 0, maxDiffPercent: 0, avgDiffPercent: 0 } };

  const sources = (await getNutritionSources(materialId)) as DbRow[];
  const authoritativeRow = (await query("SELECT * FROM material_nutrition WHERE material_id = ? AND is_latest = 1", [materialId])).rows[0] as DbRow | undefined;
  const authoritativePer100g = authoritativeRow ? normalizePer100g(safeJsonParse(authoritativeRow.per_100g_json as string, {})) : {};
  const authoritativeSourceType = (authoritativeRow?.source_type as string) || "manual";
  const authoritativeSourceDetail = (authoritativeRow?.source_detail as string) || null;
  const authoritativeFieldSources = authoritativeRow
    ? safeJsonParse((authoritativeRow.field_sources_json as string) ?? "{}", {})
    : {};

  const nutrients = NUTRIENT_FIELDS.map((field) => {
    const label = (NUTRIENT_LABELS as Record<string, string>)[field] || field;
    const meta = (NUTRIENT_META as Record<string, Record<string, unknown>>)[field];
    const unit = (meta?.unit as string) || "";
    const authoritativeValue = authoritativePer100g[field] ?? 0;

    const sourceEntries = sources.map((src) => {
      const srcPer100g = src.per100g as Record<string, number>;
      const value = srcPer100g[field] ?? 0;
      const diff = value - authoritativeValue;
      const diffPercent = authoritativeValue > 0.001 ? Math.abs(diff) / authoritativeValue * 100 : 0;
      return {
        sourceId: src.sourceId as string,
        sourceType: src.sourceType as string,
        sourceDetail: src.sourceDetail as string | null,
        confidence: src.confidence as string,
        value,
        diff: Math.round(diff * 1000) / 1000,
        diffPercent: Math.round(diffPercent * 10) / 10,
      };
    });

    return { field, label, unit, authoritativeValue, sources: sourceEntries };
  });

  let diffCount = 0;
  let totalDiffPercent = 0;
  let maxDiffPercent = 0;

  for (const n of nutrients) {
    for (const s of n.sources) {
      if (s.diffPercent > 0) {
        diffCount++;
        totalDiffPercent += s.diffPercent;
        if (s.diffPercent > maxDiffPercent) maxDiffPercent = s.diffPercent;
      }
    }
  }

  const avgDiffPercent = diffCount > 0 ? Math.round(totalDiffPercent / diffCount * 10) / 10 : 0;

  return {
    materialId,
    materialName: material.name,
    authoritative: {
      sourceType: authoritativeSourceType,
      sourceDetail: authoritativeSourceDetail,
      per100g: authoritativePer100g,
      fieldSources: authoritativeFieldSources,
    },
    nutrients,
    summary: {
      totalSources: sources.length,
      totalNutrients: NUTRIENT_FIELDS.length,
      diffCount,
      maxDiffPercent: Math.round(maxDiffPercent * 10) / 10,
      avgDiffPercent,
    },
  };
}

export async function updateNutritionSource(
  materialId: string,
  sourceId: string,
  sourceDetail?: string,
  confidence?: string,
  notes?: string,
): Promise<{ success: boolean; message?: string }> {
  const existing = (await query(`SELECT source_id FROM material_nutrition_sources WHERE source_id = ? AND material_id = ?`, [sourceId, materialId])).rows[0] as DbRow | undefined;
  if (!existing) return { success: false, message: "来源数据不存在" };

  const validConfidence = confidence && ["high", "medium", "low"].includes(confidence) ? confidence : undefined;
  const sets: string[] = [];
  const params: unknown[] = [];

  if (sourceDetail !== undefined) { sets.push("source_detail = ?"); params.push(sourceDetail); }
  if (validConfidence) { sets.push("confidence = ?"); params.push(validConfidence); }
  if (notes !== undefined) { sets.push("notes = ?"); params.push(notes); }

  if (sets.length === 0) return { success: true };

  params.push(sourceId, materialId);
  await query(`UPDATE material_nutrition_sources SET ${sets.join(", ")} WHERE source_id = ? AND material_id = ?`, params);
  return { success: true };
}

export async function softDeleteNutritionSource(
  sourceId: string,
  materialId: string,
): Promise<{ success: boolean; message?: string }> {
  const existing = (await query(`SELECT source_id, is_active FROM material_nutrition_sources WHERE source_id = ? AND material_id = ?`, [sourceId, materialId])).rows[0] as DbRow | undefined;
  if (!existing) return { success: false, message: "来源数据不存在" };
  if (!existing.is_active) return { success: false, message: "来源数据已被删除" };

  await query(`UPDATE material_nutrition_sources SET is_active = 0 WHERE source_id = ? AND material_id = ?`, [sourceId, materialId]);
  return { success: true };
}

export async function setAuthoritativeFromSources(
  materialId: string,
  fieldSelections: Record<string, string>,
  userId: string,
): Promise<{ success: boolean; message?: string; updatedFields?: number; sourceType?: string; fieldSources?: Record<string, unknown> }> {
  const material = (await query("SELECT id FROM materials WHERE id = ?", [materialId])).rows[0] as DbRow | undefined;
  if (!material) return { success: false, message: "原料不存在" };

  const uniqueSourceIds = [...new Set(Object.values(fieldSelections))];
  if (uniqueSourceIds.length === 0) return { success: false, message: "未指定来源" };

  const placeholders = uniqueSourceIds.map(() => "?").join(",");
  const sourceRows = (await query(
    `SELECT source_id, source_type, source_detail, per_100g_json FROM material_nutrition_sources WHERE source_id IN (${placeholders}) AND material_id = ? AND is_active = 1`,
    [...uniqueSourceIds, materialId],
  )).rows as DbRow[];

  if (sourceRows.length !== uniqueSourceIds.length) {
    const foundIds = new Set(sourceRows.map((r) => r.source_id));
    const missing = uniqueSourceIds.filter((id) => !foundIds.has(id));
    return { success: false, message: `来源数据不存在或不活跃: ${missing.join(", ")}` };
  }

  const sourceMap = new Map<string, { sourceType: string; sourceDetail: string | null; per100g: Record<string, number> }>();
  for (const row of sourceRows) {
    sourceMap.set(row.source_id as string, {
      sourceType: row.source_type as string,
      sourceDetail: row.source_detail as string | null,
      per100g: normalizePer100g(safeJsonParse(row.per_100g_json as string, {})),
    });
  }

  const existing = (await query("SELECT * FROM material_nutrition WHERE material_id = ? AND is_latest = 1", [materialId])).rows[0] as DbRow | undefined;
  const currentPer100g: Record<string, number> = existing ? normalizePer100g(safeJsonParse(existing.per_100g_json as string, {})) : {};
  const newPer100g: Record<string, number> = { ...currentPer100g };
  const fieldSources: Record<string, unknown> = {};
  let updatedFields = 0;
  const sourceTypes = new Set<string>();

  for (const [field, sourceId] of Object.entries(fieldSelections)) {
    const src = sourceMap.get(sourceId);
    if (!src) continue;
    const value = src.per100g[field];
    if (value !== undefined) {
      newPer100g[field] = value;
      fieldSources[field] = { sourceId, sourceType: src.sourceType, sourceDetail: src.sourceDetail };
      sourceTypes.add(src.sourceType);
      updatedFields++;
    }
  }

  const protein = newPer100g.protein ?? 0;
  const fat = newPer100g.fat ?? 0;
  const carbohydrate = newPer100g.carbohydrate ?? 0;
  if (protein > 0 || fat > 0 || carbohydrate > 0) {
    newPer100g.energy = Math.round((protein * 17 + fat * 37 + carbohydrate * 17) * 100) / 100;
  }

  const compositeSourceType = sourceTypes.size === 1 ? [...sourceTypes][0] : "composite";

  // 从各字段来源提取"标准数据来源"标识（如《中国食物成分表》v1.0）
  // fieldSources 中每个值包含 {sourceId, sourceType, sourceDetail}
  const sourceDetailList: string[] = [];
  const seenSourceIds = new Set<string>();
  for (const fs of Object.values(fieldSources)) {
    const f = fs as { sourceId: string; sourceType: string; sourceDetail: string | null };
    if (!seenSourceIds.has(f.sourceId)) {
      seenSourceIds.add(f.sourceId);
      // 优先从 sourceDetail 中提取《xxx》格式的标准来源
      const detail = f.sourceDetail || "";
      const standardMatch = detail.match(/《[^》]+》/g);
      if (standardMatch && standardMatch.length > 0) {
        const std = standardMatch[standardMatch.length - 1];
        const versionMatch = detail.match(/v\d+(\.\d+)*/i);
        sourceDetailList.push(versionMatch ? `${std} ${versionMatch[0]}` : std);
      } else {
        // 回退到 sourceType 映射
        const fallbackMap: Record<string, string> = {
          seed: "《中国食物成分表》 v1.0",
          tianapi: "天眼查营养数据",
          excel_import: "Excel 外部数据",
          ai: "AI 估算",
          manual: "手工录入",
        };
        sourceDetailList.push(fallbackMap[f.sourceType] || f.sourceType);
      }
    }
  }
  // 组装最终的 source_detail 和 data_source
  const compositeSourceDetail = sourceDetailList.length > 0
    ? (sourceDetailList.length === 1
        ? sourceDetailList[0]
        : `多源组合：${sourceDetailList.join("、")}`)
    : `由 ${updatedFields} 个字段组合`;

  if (existing) {
    await query(
      `UPDATE material_nutrition SET per_100g_json = ?, field_sources_json = ?, source_type = ?, source_detail = ?, data_source = ?, last_updated = ? WHERE material_id = ? AND is_latest = 1`,
      [JSON.stringify(newPer100g), JSON.stringify(fieldSources), compositeSourceType, compositeSourceDetail, compositeSourceDetail, now(), materialId],
    );
  } else {
    const nutritionId = generateId();
    await query(
      `INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, confidence, last_updated, material_version, is_latest, field_sources_json, source_type, source_detail, created_at, created_by)
       VALUES (?, ?, ?, '1.0', ?, NULL, 'medium', ?, 1, 1, ?, ?, ?, ?, ?)`,
      [nutritionId, materialId, JSON.stringify(newPer100g), compositeSourceDetail, now(), JSON.stringify(fieldSources), compositeSourceType, compositeSourceDetail, now(), userId],
    );
  }

  await query("UPDATE materials SET updated_at = ? WHERE id = ?", [now(), materialId]);

  return { success: true, updatedFields, sourceType: compositeSourceType, fieldSources };
}
