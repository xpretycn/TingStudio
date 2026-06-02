import { query } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase, rowsToCamelCase, safeJsonParse } from "../utils/helpers.js";
import {
  NUTRIENT_FIELDS,
  NRV_REFERENCE,
  ZERO_THRESHOLD,
  NUTRIENT_LABELS,
  CORE_NUTRIENT_COLS,
  LABEL_INFO,
} from "../config/nutritionConstants.js";
import {
  normalizePer100g,
  normalizeMaterialName,
  parseMaterialsJson,
} from "../utils/nutritionHelpers.js";

type DbRow = Record<string, unknown>;

export async function getMaterialNutritionData(materialId: string): Promise<DbRow | null> {
  const nutrition = (await query("SELECT * FROM material_nutrition WHERE material_id = ?", [materialId])).rows[0] as DbRow | undefined;
  if (!nutrition) return null;
  return {
    ...rowToCamelCase(nutrition),
    per100g: normalizePer100g(safeJsonParse(nutrition.per_100g_json as string, {})),
    fieldSources: safeJsonParse(nutrition.field_sources_json as string | null, null),
    sourceType: (nutrition.source_type as string) || "manual",
    sourceDetail: (nutrition.source_detail as string) || null,
  };
}

export async function setMaterialNutritionData(
  materialId: string,
  per100g: Record<string, number>,
  dataSource?: string,
  notes?: string,
  confidence?: string,
  userId?: string,
): Promise<{ success: boolean; message?: string }> {
  const material = (await query("SELECT id, name, code FROM materials WHERE id = ?", [materialId])).rows[0] as DbRow | undefined;
  if (!material) return { success: false, message: "原料不存在" };

  let hasConfidence = true;
  try {
    await query("SELECT confidence FROM material_nutrition LIMIT 1", []);
  } catch {
    hasConfidence = false;
  }

  const selCols = hasConfidence
    ? "nutrition_id, material_id, per_100g_json, data_source, notes, confidence, data_version, material_version, is_latest"
    : "nutrition_id, material_id, per_100g_json, data_source, notes, data_version, material_version, is_latest";

  const existing = (await query(`SELECT ${selCols} FROM material_nutrition WHERE material_id = ?`, [
    materialId,
  ])).rows[0] as DbRow | undefined;

  const oldData: Record<string, number> = safeJsonParse(existing?.per_100g_json as string, {});
  const merged: Record<string, number> = { ...oldData };

  for (const [key, val] of Object.entries(per100g)) {
    if (typeof val === "number") {
      if (val > 0) {
        merged[key] = val;
      } else if (val === 0) {
        merged[key] = 0;
      } else {
        delete merged[key];
      }
    } else {
      delete merged[key];
    }
  }

  const per100gJson = JSON.stringify(merged);
  const version = existing ? ((existing.data_version as string) || "1.0") : "1.0";

  if (existing) {
    if (hasConfidence) {
      await query(
        `UPDATE material_nutrition SET per_100g_json = ?, data_source = ?, notes = ?, confidence = ?, last_updated = ? WHERE material_id = ?`,
        [per100gJson, dataSource || existing.data_source || "manual", notes || existing.notes || "", confidence || existing.confidence || "medium", now(), materialId],
      );
    } else {
      await query(
        `UPDATE material_nutrition SET per_100g_json = ?, data_source = ?, notes = ?, last_updated = ? WHERE material_id = ?`,
        [per100gJson, dataSource || existing.data_source || "manual", notes || existing.notes || "", now(), materialId],
      );
    }
  } else {
    const nutritionId = generateId();
    const match = (version as string).match(/^(\d+)\./);
    const majorVersion = match ? parseInt(match[1]) : 1;

    if (hasConfidence) {
      await query(
        `INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, confidence, last_updated, material_version, is_latest)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [nutritionId, materialId, per100gJson, `${majorVersion + 1}.0`, dataSource || "manual", notes || "", confidence || "medium", now(), majorVersion + 1],
      );
    } else {
      await query(
        `INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, last_updated, material_version, is_latest)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [nutritionId, materialId, per100gJson, `${majorVersion + 1}.0`, dataSource || "manual", notes || "", now(), majorVersion + 1],
      );
    }
  }

  await query("UPDATE materials SET updated_at = ? WHERE id = ?", [now(), materialId]);

  try {
    const { addNutritionSource } = await import("./nutritionSourceService.js");
    await addNutritionSource(materialId, "manual", merged, dataSource || "manual", confidence, undefined, notes, userId);
  } catch { /* 来源层写入失败不影响主流程 */ }

  return { success: true };
}

export async function calculateFormulaNutritionData(formulaId: string, userId: string) {
  const formula = (await query("SELECT * FROM formulas WHERE id = ?", [formulaId])).rows[0] as DbRow | undefined;
  if (!formula) return null;

  const materials = parseMaterialsJson(formula.materials_json);
  const finishedWeight = Number(formula.finished_weight) || 0;
  const formulaRatioFactor = Number(formula.ratio_factor) || 0.18;
  const supplementRatioFactor = Number(formula.supplement_ratio_factor) || 1.0;

  const matIds = materials.map((m) => m.materialId as string).filter(Boolean);
  const materialTypes: Record<string, string> = {};
  if (matIds.length > 0) {
    const placeholders = matIds.map(() => "?").join(",");
    const matRows = (await query(
      `SELECT id, material_type FROM materials WHERE id IN (${placeholders})`,
      matIds,
    )).rows as DbRow[];
    for (const row of matRows) {
      materialTypes[row.id as string] = (row.material_type as string) || "herb";
    }
  }

  const nutritionMap: Record<string, Record<string, number>> = {};
  if (matIds.length > 0) {
    const placeholders = matIds.map(() => "?").join(",");
    const nutritionRows = (await query(
      `SELECT material_id, per_100g_json FROM material_nutrition WHERE material_id IN (${placeholders}) AND is_latest = 1`,
      matIds,
    )).rows as DbRow[];
    for (const row of nutritionRows) {
      nutritionMap[row.material_id as string] = normalizePer100g(safeJsonParse(row.per_100g_json as string, {}));
    }
  }

  const breakdown: Array<Record<string, unknown>> = [];
  let totalWeight = 0;
  const totalNutrition: Record<string, number> = {};
  for (const field of NUTRIENT_FIELDS) {
    totalNutrition[field] = 0;
  }

  for (const mat of materials) {
    const materialId = mat.materialId as string;
    let per100g = nutritionMap[materialId];
    if (!per100g && mat.materialName) {
      const normalizedName = normalizeMaterialName(mat.materialName as string);
      const altMaterial = (await query(
        "SELECT id FROM materials WHERE name = ? LIMIT 1",
        [normalizedName],
      )).rows[0] as DbRow | undefined;
      if (altMaterial) {
        const altId = altMaterial.id as string;
        if (nutritionMap[altId]) {
          per100g = nutritionMap[altId];
        } else {
          const altNutrition = (await query(
            "SELECT per_100g_json FROM material_nutrition WHERE material_id = ? AND is_latest = 1",
            [altId],
          )).rows[0] as DbRow | undefined;
          if (altNutrition) {
            per100g = normalizePer100g(safeJsonParse(altNutrition.per_100g_json as string, {}));
            nutritionMap[altId] = per100g;
          }
        }
      }
    }
    if (!per100g) per100g = {};

    const quantity = Number(mat.quantity) || 0;
    const isSupplement = materialTypes[materialId] === "supplement";
    const effectiveRatioFactor = isSupplement ? supplementRatioFactor : formulaRatioFactor;
    const ratio = finishedWeight > 0 ? (quantity / finishedWeight) * effectiveRatioFactor : 0;

    const contribution: Record<string, number> = {};
    for (const field of NUTRIENT_FIELDS) {
      const val = (per100g[field] || 0) * ratio;
      contribution[field] = val;
      totalNutrition[field] += val;
    }

    totalWeight += quantity;
    breakdown.push({
      materialId,
      materialName: mat.materialName,
      materialCode: "",
      quantity,
      unit: "g",
      weightContribution: quantity,
      percentage: 0,
      nutritionContribution: contribution,
    });
  }

  if (totalWeight > 0) {
    for (const item of breakdown) {
      item.percentage = Math.round(((item.weightContribution as number) / totalWeight) * 10000) / 100;
    }
  }

  const per100gNutrition: Record<string, number> = {};
  if (finishedWeight > 0) {
    const factor = 100 / finishedWeight;
    for (const field of NUTRIENT_FIELDS) {
      per100gNutrition[field] = Math.round(totalNutrition[field] * factor * 100) / 100;
    }
  }

  const existingSummary = (await query(
    "SELECT summary_id FROM formula_nutrition_summaries WHERE formula_id = ?",
    [formulaId],
  )).rows[0] as DbRow | undefined;

  if (existingSummary) {
    await query(
      `UPDATE formula_nutrition_summaries SET total_weight = ?, total_nutrition_json = ?, per_100g_nutrition_json = ?, material_breakdown_json = ?, calculated_by = ?, calculated_at = ?
       WHERE formula_id = ?`,
      [totalWeight, JSON.stringify(totalNutrition), JSON.stringify(per100gNutrition), JSON.stringify(breakdown), userId, now(), formulaId],
    );
  } else {
    const summaryId = generateId();
    await query(
      `INSERT INTO formula_nutrition_summaries (summary_id, formula_id, total_weight, total_nutrition_json, per_100g_nutrition_json, material_breakdown_json, calculated_by, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [summaryId, formulaId, totalWeight, JSON.stringify(totalNutrition), JSON.stringify(per100gNutrition), JSON.stringify(breakdown), userId, now()],
    );
  }

  try {
    const { saveNutritionSnapshot } = await import("./nutritionSnapshotService.js");
    const nutritionRefs: Record<string, { nutritionId: string; dataVersion: string; sourceType: string; per100gSnapshot: Record<string, number> }> = {};
    for (const mat of materials) {
      const materialId = mat.materialId as string;
      const per100g = nutritionMap[materialId] || {};
      if (Object.keys(per100g).length > 0) {
        const nutritionRow = (await query(
          "SELECT nutrition_id, data_version, source_type FROM material_nutrition WHERE material_id = ? AND is_latest = 1",
          [materialId],
        )).rows[0] as DbRow | undefined;
        nutritionRefs[materialId] = {
          nutritionId: (nutritionRow?.nutrition_id as string) || "",
          dataVersion: (nutritionRow?.data_version as string) || "1.0",
          sourceType: (nutritionRow?.source_type as string) || "manual",
          per100gSnapshot: per100g,
        };
      }
    }
    await saveNutritionSnapshot(
      formulaId,
      formula.parse_result_id as string | null || null,
      nutritionRefs,
      totalNutrition,
      per100gNutrition,
      breakdown,
      userId,
    );
  } catch { /* 快照保存失败不影响主流程 */ }

  return {
    formulaId,
    formulaName: formula.name as string,
    totalWeight,
    totalNutrition,
    per100gNutrition,
    materialBreakdown: breakdown,
  };
}

export async function getNutritionProfilesList(category?: string, keyword?: string) {
  let sql = "SELECT * FROM nutrition_profiles WHERE 1=1";
  const params: unknown[] = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (keyword) {
    sql += " AND name LIKE ?";
    params.push(`%${keyword}%`);
  }
  sql += " ORDER BY created_at DESC";

  const profiles = (await query(sql, params)).rows as DbRow[];
  return profiles.map((p) => ({
    ...rowToCamelCase(p),
    targetValues: safeJsonParse(p.target_values_json as string, {}),
    toleranceRanges: safeJsonParse(p.tolerance_ranges_json as string, []),
    mandatoryFields: safeJsonParse(p.mandatory_fields_json as string, []),
  }));
}

export async function createNutritionProfile(data: {
  name: string;
  description?: string;
  category?: string;
  targetValues: Record<string, unknown>;
  toleranceRanges?: unknown[];
  mandatoryFields?: string[];
}, userId: string) {
  const profileId = generateId();
  await query(
    `INSERT INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, is_preset, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      profileId,
      data.name,
      data.description || "",
      data.category || "general",
      JSON.stringify(data.targetValues),
      JSON.stringify(data.toleranceRanges || []),
      JSON.stringify(data.mandatoryFields || []),
      userId,
      now(),
      now(),
    ],
  );
  return { profileId };
}

export async function updateNutritionProfileData(
  profileId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    targetValues?: Record<string, unknown>;
    toleranceRanges?: unknown[];
    mandatoryFields?: string[];
  },
  userId: string,
) {
  const profile = (await query("SELECT * FROM nutrition_profiles WHERE profile_id = ?", [profileId])).rows[0] as DbRow | undefined;
  if (!profile) return { success: false, message: "营养标准不存在" };
  if (profile.is_preset) return { success: false, message: "预置营养标准不可修改" };

  await query(
    `UPDATE nutrition_profiles SET name = ?, description = ?, category = ?, target_values_json = ?, tolerance_ranges_json = ?, mandatory_fields_json = ?, updated_at = ? WHERE profile_id = ?`,
    [
      data.name || profile.name,
      data.description !== undefined ? data.description : profile.description,
      data.category || profile.category,
      JSON.stringify(data.targetValues ?? safeJsonParse(profile.target_values_json as string, {})),
      JSON.stringify(data.toleranceRanges ?? safeJsonParse(profile.tolerance_ranges_json as string, [])),
      JSON.stringify(data.mandatoryFields ?? safeJsonParse(profile.mandatory_fields_json as string, [])),
      now(),
      profileId,
    ],
  );
  return { success: true };
}

export async function deleteNutritionProfileData(profileId: string) {
  const profile = (await query("SELECT * FROM nutrition_profiles WHERE profile_id = ?", [profileId])).rows[0] as DbRow | undefined;
  if (!profile) return { success: false, message: "营养标准不存在" };
  if (profile.is_preset) return { success: false, message: "预置营养标准不可删除" };

  await query("DELETE FROM nutrition_profiles WHERE profile_id = ?", [profileId]);
  return { success: true };
}

export async function getComplianceCheckData(formulaId: string) {
  const summary = (await query("SELECT * FROM formula_nutrition_summaries WHERE formula_id = ?", [formulaId])).rows[0] as DbRow | undefined;
  if (!summary) return null;
  return summary;
}

export async function saveComplianceReport(
  formulaId: string,
  summaryId: string | undefined,
  complianceChecks: unknown[],
  recommendations: unknown[],
  userId: string,
) {
  const reportId = generateId();
  await query(
    `INSERT INTO nutrition_analysis_reports (report_id, formula_id, summary_id, compliance_check_json, recommendations_json, generated_by, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [reportId, formulaId, summaryId || null, JSON.stringify(complianceChecks), JSON.stringify(recommendations), userId, now()],
  );
  return reportId;
}

export async function getProfileById(profileId: string): Promise<Record<string, unknown> | null> {
  const profile = (await query("SELECT * FROM nutrition_profiles WHERE profile_id = ?", [profileId])).rows[0] as DbRow | undefined;
  if (!profile) return null;

  return {
    ...rowToCamelCase(profile),
    targetValues: safeJsonParse(profile.target_values_json as string, {}),
    toleranceRanges: safeJsonParse(profile.tolerance_ranges_json as string, []),
    mandatoryFields: safeJsonParse(profile.mandatory_fields_json as string, []),
  };
}

export async function getFormulaNutritionTablesData(formulaId: string) {
  try {
    const { getNutritionSnapshot } = await import("./nutritionSnapshotService.js");
    const snapshot = await getNutritionSnapshot(formulaId);
    if (snapshot) {
      const formula = (await query("SELECT * FROM formulas WHERE id = ?", [formulaId])).rows[0] as DbRow | undefined;
      if (formula) {
        let salesmanInfo: Record<string, unknown> | null = null;
        if (formula.salesman_id) {
          const sm = (await query(
            "SELECT id, name, code, department, phone, email FROM salesmen WHERE id = ?",
            [formula.salesman_id],
          )).rows[0] as DbRow | undefined;
          if (sm) salesmanInfo = rowToCamelCase(sm);
        }
        const versionHistory = await getVersionHistoryData(formulaId);
        const snapshotPer100g = snapshot.per100g as Record<string, number>;
        const snapshotTotal = snapshot.totalNutrition as Record<string, number>;
        const summaryEnergy = Math.round(
          (snapshotTotal.protein * 17 + snapshotTotal.fat * 37 + snapshotTotal.carbohydrate * 17) * 100,
        ) / 100;
        const summaryRow: Record<string, unknown> = {
          name: "营养成分表",
          quantity: Number(formula.finished_weight) || 0,
          ratio: 1,
          energy: summaryEnergy,
          protein: snapshotTotal.protein,
          fat: snapshotTotal.fat,
          carbohydrate: snapshotTotal.carbohydrate,
          sodium: snapshotTotal.sodium,
        };
        const nrvRow: Record<string, unknown> = { name: "营养素参考值(NRV)", quantity: "", ratio: "" };
        const nrvPercentRow: Record<string, unknown> = { name: "营养素参考值%", quantity: "", ratio: "" };
        nrvRow.energy = NRV_REFERENCE.energy ?? "";
        nrvPercentRow.energy = NRV_REFERENCE.energy ? Math.round((summaryEnergy / NRV_REFERENCE.energy) * 10000) / 100 : 0;
        for (const f of CORE_NUTRIENT_COLS) {
          nrvRow[f] = NRV_REFERENCE[f] ?? "";
          nrvPercentRow[f] = NRV_REFERENCE[f] ? Math.round((snapshotTotal[f] / NRV_REFERENCE[f]) * 10000) / 100 : 0;
        }
        const labelValues: Record<string, number> = { energy: summaryEnergy };
        for (const f of CORE_NUTRIENT_COLS) labelValues[f] = snapshotTotal[f];
        const zeroedFields = new Set<string>();
        for (const f of CORE_NUTRIENT_COLS) {
          if (Math.abs(labelValues[f]) < ZERO_THRESHOLD[f]) { zeroedFields.add(f); labelValues[f] = 0; }
        }
        if (Math.abs(labelValues.energy) < ZERO_THRESHOLD.energy) { zeroedFields.add("energy"); labelValues.energy = 0; }
        if (!zeroedFields.has("energy")) {
          labelValues.energy = Math.round(labelValues.protein * 17 + labelValues.fat * 37 + labelValues.carbohydrate * 17);
        }
        const labelRows: Array<Record<string, unknown>> = [];
        const energyNrv = NRV_REFERENCE.energy || 1;
        labelRows.push({ item: "能量", value: labelValues.energy, unit: "千焦(kJ)", nrvPercent: labelValues.energy > 0 ? Math.round((labelValues.energy / energyNrv) * 10000) / 100 : 0, zeroThreshold: "≤17千焦(kJ)", tolerance: "≤120%标示值" });
        for (const f of CORE_NUTRIENT_COLS) {
          const info = LABEL_INFO[f];
          const val = labelValues[f];
          const nrv = NRV_REFERENCE[f] || 1;
          labelRows.push({ item: info.name, value: val, unit: info.unit, nrvPercent: val > 0 ? Math.round((val / nrv) * 10000) / 100 : 0, zeroThreshold: info.zeroThreshold, tolerance: info.tolerance });
        }
        return {
          formulaId: formula.id,
          formulaName: formula.name,
          finishedWeight: Number(formula.finished_weight) || 0,
          ratioFactor: Number(formula.ratio_factor) || 0.18,
          supplementRatioFactor: Number(formula.supplement_ratio_factor) || 1.0,
          parseResultId: formula.parse_result_id || null,
          salesmanName: (salesmanInfo?.name as string) || (formula.salesman_name as string) || "",
          salesmanDept: (salesmanInfo?.department as string) || "",
          demandTitle: formula.description ? `配方需求：${formula.name}` : null,
          demandCode: formula.id,
          demandDesc: formula.description,
          demandPriority: null,
          totalWeight: Number(formula.finished_weight) || 0,
          calcRows: snapshot.materialBreakdown as Array<Record<string, unknown>> || [],
          summaryRow,
          nrvRow,
          nrvPercentRow,
          labelRows,
          missingNutritionMaterials: [],
          versionHistory,
          fromSnapshot: true,
          snapshotCalculatedAt: snapshot.calculatedAt,
        };
      }
    }
  } catch { /* 快照读取失败，回退到实时计算 */ }

  let dbHasSupplementRatio = true;
  try {
    await query("SELECT supplement_ratio_factor FROM formulas LIMIT 1", []);
  } catch {
    dbHasSupplementRatio = false;
  }

  const formula = (await query("SELECT * FROM formulas WHERE id = ?", [formulaId])).rows[0] as DbRow | undefined;
  if (!formula) return null;

  let salesmanInfo: Record<string, unknown> | null = null;
  if (formula.salesman_id) {
    const sm = (await query(
      "SELECT id, name, code, department, phone, email FROM salesmen WHERE id = ?",
      [formula.salesman_id],
    )).rows[0] as DbRow | undefined;
    if (sm) {
      salesmanInfo = rowToCamelCase(sm);
    }
  }

  const materials = parseMaterialsJson(formula.materials_json);
  const finishedWeight = Number(formula.finished_weight) || 0;
  const formulaRatioFactor = Number(formula.ratio_factor) || 0.18;
  const supplementRatioFactor = dbHasSupplementRatio ? Number(formula.supplement_ratio_factor) || 1.0 : 1.0;

  const matIds = materials.map((m) => m.materialId as string).filter(Boolean);
  const materialTypes: Record<string, string> = {};
  if (matIds.length > 0) {
    const placeholders = matIds.map(() => "?").join(",");
    const matRows = (await query(
      `SELECT id, material_type FROM materials WHERE id IN (${placeholders})`,
      matIds,
    )).rows as DbRow[];
    for (const row of matRows) {
      materialTypes[row.id as string] = (row.material_type as string) || "herb";
    }
  }

  const nutritionMap: Record<string, Record<string, number>> = {};
  if (matIds.length > 0) {
    const placeholders = matIds.map(() => "?").join(",");
    const nutritionRows = (await query(
      `SELECT material_id, per_100g_json FROM material_nutrition WHERE material_id IN (${placeholders}) AND is_latest = 1`,
      matIds,
    )).rows as DbRow[];
    for (const row of nutritionRows) {
      nutritionMap[row.material_id as string] = normalizePer100g(safeJsonParse(row.per_100g_json as string, {}));
    }
  }

  let totalQuantity = 0;
  let totalRatio = 0;
  const missingNutritionMaterials: string[] = [];
  const calcRows: Array<Record<string, unknown>> = [];

  for (const mat of materials) {
    const materialId = mat.materialId as string;
    let per100g = nutritionMap[materialId];
    if (!per100g && mat.materialName) {
      const normalizedName = normalizeMaterialName(mat.materialName as string);
      const altMaterial = (await query(
        "SELECT id FROM materials WHERE name = ? LIMIT 1",
        [normalizedName],
      )).rows[0] as DbRow | undefined;
      if (altMaterial) {
        const altId = altMaterial.id as string;
        if (nutritionMap[altId]) {
          per100g = nutritionMap[altId];
        } else {
          const altNutrition = (await query(
            "SELECT per_100g_json FROM material_nutrition WHERE material_id = ? AND is_latest = 1",
            [altId],
          )).rows[0] as DbRow | undefined;
          if (altNutrition) {
            per100g = normalizePer100g(safeJsonParse(altNutrition.per_100g_json as string, {}));
            nutritionMap[altId] = per100g;
          }
        }
      }
    }

    const hasNutrition = !!per100g && Object.keys(per100g).length > 0;
    if (!per100g) per100g = {};

    const emptyNutritionFields: string[] = [];
    if (!hasNutrition) {
      missingNutritionMaterials.push((mat.materialName as string) || materialId);
      for (const f of CORE_NUTRIENT_COLS) {
        emptyNutritionFields.push(NUTRIENT_LABELS[f]);
      }
      emptyNutritionFields.push(NUTRIENT_LABELS.energy);
    } else {
      for (const f of CORE_NUTRIENT_COLS) {
        if (per100g[f] === undefined || per100g[f] === null) {
          emptyNutritionFields.push(NUTRIENT_LABELS[f]);
        }
      }
      if (per100g.energy === undefined || per100g.energy === null) {
        emptyNutritionFields.push(NUTRIENT_LABELS.energy);
      }
    }

    const quantity = Number(mat.quantity) || 0;
    const isSupplement = materialTypes[materialId] === "supplement";
    const effectiveRatio = isSupplement ? supplementRatioFactor : formulaRatioFactor;
    const ratio = finishedWeight > 0 ? Math.round((quantity / finishedWeight) * effectiveRatio * 100000) / 100000 : 0;

    const row: Record<string, unknown> = {
      name: mat.materialName,
      materialId,
      quantity,
      ratio,
      materialType: materialTypes[materialId] || "herb",
      energy: "",
      protein: per100g.protein ?? 0,
      fat: per100g.fat ?? 0,
      carbohydrate: per100g.carbohydrate ?? 0,
      sodium: per100g.sodium ?? 0,
      hasEmptyNutrition: !hasNutrition,
      emptyNutritionFields,
    };
    calcRows.push(row);

    totalQuantity += quantity;
    totalRatio += ratio;
  }

  const summaryNutrition: Record<string, number> = {};
  for (const f of CORE_NUTRIENT_COLS) {
    let sum = 0;
    for (const row of calcRows) {
      sum += ((row[f] as number) || 0) * (row.ratio as number);
    }
    summaryNutrition[f] = Math.round(sum * 10000) / 10000;
  }
  const summaryEnergy =
    Math.round(
      (summaryNutrition.protein * 17 + summaryNutrition.fat * 37 + summaryNutrition.carbohydrate * 17) * 100,
    ) / 100;

  const summaryRow: Record<string, unknown> = {
    name: "营养成分表",
    quantity: totalQuantity,
    ratio: Math.round(totalRatio * 100000) / 100000,
    energy: summaryEnergy,
    protein: summaryNutrition.protein,
    fat: summaryNutrition.fat,
    carbohydrate: summaryNutrition.carbohydrate,
    sodium: summaryNutrition.sodium,
  };

  const nrvRow: Record<string, unknown> = { name: "营养素参考值(NRV)", quantity: "", ratio: "" };
  const nrvPercentRow: Record<string, unknown> = { name: "营养素参考值%", quantity: "", ratio: "" };
  nrvRow.energy = NRV_REFERENCE.energy ?? "";
  nrvPercentRow.energy = NRV_REFERENCE.energy ? Math.round((summaryEnergy / NRV_REFERENCE.energy) * 10000) / 100 : 0;
  for (const f of CORE_NUTRIENT_COLS) {
    nrvRow[f] = NRV_REFERENCE[f] ?? "";
    nrvPercentRow[f] = NRV_REFERENCE[f] ? Math.round((summaryNutrition[f] / NRV_REFERENCE[f]) * 10000) / 100 : 0;
  }

  const labelValues: Record<string, number> = { energy: summaryEnergy };
  for (const f of CORE_NUTRIENT_COLS) {
    labelValues[f] = summaryNutrition[f];
  }

  const zeroedFields = new Set<string>();
  for (const f of CORE_NUTRIENT_COLS) {
    if (Math.abs(labelValues[f]) < ZERO_THRESHOLD[f]) {
      zeroedFields.add(f);
      labelValues[f] = 0;
    }
  }
  if (Math.abs(labelValues.energy) < ZERO_THRESHOLD.energy) {
    zeroedFields.add("energy");
    labelValues.energy = 0;
  }

  if (!zeroedFields.has("energy")) {
    const techEnergy = labelValues.protein * 17 + labelValues.fat * 37 + labelValues.carbohydrate * 17;
    labelValues.energy = Math.round(techEnergy);
  }

  const labelRows: Array<Record<string, unknown>> = [];
  const energyNrv = NRV_REFERENCE.energy || 1;
  const energyNrvPercent = labelValues.energy > 0 ? Math.round((labelValues.energy / energyNrv) * 10000) / 100 : 0;
  labelRows.push({
    item: "能量",
    value: labelValues.energy,
    unit: "千焦(kJ)",
    nrvPercent: energyNrvPercent,
    zeroThreshold: "≤17千焦(kJ)",
    tolerance: "≤120%标示值",
  });
  for (const f of CORE_NUTRIENT_COLS) {
    const info = LABEL_INFO[f];
    const val = labelValues[f];
    const nrv = NRV_REFERENCE[f] || 1;
    const nrvPct = val > 0 ? Math.round((val / nrv) * 10000) / 100 : 0;
    labelRows.push({
      item: info.name,
      value: val,
      unit: info.unit,
      nrvPercent: nrvPct,
      zeroThreshold: info.zeroThreshold,
      tolerance: info.tolerance,
    });
  }

  const versionHistory = await getVersionHistoryData(formulaId as string);

  return {
    formulaId: formula.id,
    formulaName: formula.name,
    finishedWeight,
    ratioFactor: formulaRatioFactor,
    supplementRatioFactor,
    parseResultId: formula.parse_result_id || null,
    salesmanName: (salesmanInfo?.name as string) || (formula.salesman_name as string) || "",
    salesmanDept: (salesmanInfo?.department as string) || "",
    demandTitle: formula.description ? `配方需求：${formula.name}` : null,
    demandCode: formula.id,
    demandDesc: formula.description,
    demandPriority: null,
    totalWeight: totalQuantity,
    calcRows,
    summaryRow,
    nrvRow,
    nrvPercentRow,
    labelRows,
    missingNutritionMaterials,
    versionHistory,
  };
}

async function getVersionHistoryData(formulaId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const versions = (await query(
      `SELECT version_number, version_name, version_reason as note,
              created_by, created_at, status
       FROM formula_versions
       WHERE formula_id = ? AND is_current = 0
       ORDER BY created_at DESC LIMIT 3`,
      [formulaId],
    )).rows as DbRow[];
    return rowsToCamelCase(versions);
  } catch {
    return [];
  }
}

export async function getAnalyzeFormulaData(formulaId: string, userId: string, userRole: string) {
  const formula = (await query("SELECT * FROM formulas WHERE id = ?", [formulaId])).rows[0] as DbRow | undefined;
  if (!formula) return { error: "NOT_FOUND", message: "配方不存在" };

  if (userRole !== "admin" && formula.created_by !== userId) {
    return { error: "FORBIDDEN", message: "无权分析该配方" };
  }

  const materials = parseMaterialsJson(formula.materials_json);
  if (materials.length === 0) return { error: "VALIDATION_ERROR", message: "配方无原料" };

  const finishedWeight = Number(formula.finished_weight) || 0;
  if (finishedWeight <= 0) return { error: "VALIDATION_ERROR", message: "成品重量为0" };

  const materialTypes: Record<string, string> = {};
  const matIds = materials.map((m) => m.materialId as string).filter(Boolean);
  if (matIds.length > 0) {
    const placeholders = matIds.map(() => "?").join(",");
    const matRows = (await query(`SELECT id, material_type FROM materials WHERE id IN (${placeholders})`, matIds)).rows as DbRow[];
    for (const row of matRows) {
      materialTypes[row.id as string] = (row.material_type as string) || "herb";
    }
  }

  const nutritionMap: Record<string, Record<string, number>> = {};
  if (matIds.length > 0) {
    const placeholders = matIds.map(() => "?").join(",");
    const nutritionRows = (await query(
      `SELECT material_id, per_100g_json FROM material_nutrition WHERE material_id IN (${placeholders}) AND is_latest = 1`,
      matIds,
    )).rows as DbRow[];
    for (const row of nutritionRows) {
      nutritionMap[row.material_id as string] = normalizePer100g(safeJsonParse(row.per_100g_json as string, {}));
    }
  }

  for (const mat of materials) {
    const materialId = mat.materialId as string;
    if (!nutritionMap[materialId] && mat.materialName) {
      const normalizedName = normalizeMaterialName(mat.materialName as string);
      const altMaterial = (await query("SELECT id FROM materials WHERE name = ? LIMIT 1", [normalizedName])).rows[0] as DbRow | undefined;
      if (altMaterial) {
        const altNutrition = (await query(
          "SELECT per_100g_json FROM material_nutrition WHERE material_id = ? AND is_latest = 1",
          [altMaterial.id],
        )).rows[0] as DbRow | undefined;
        if (altNutrition) {
          nutritionMap[materialId] = normalizePer100g(safeJsonParse(altNutrition.per_100g_json as string, {}));
        }
      }
    }
  }

  const formulaRatioFactor = Number(formula.ratio_factor) || 0.18;
  let supplementRatioFactor = 1.0;
  try {
    supplementRatioFactor = Number(formula.supplement_ratio_factor) || 1.0;
  } catch {}

  const analyzeMaterials = materials.map((mat) => {
    const materialId = mat.materialId as string;
    const per100g = nutritionMap[materialId] || {};
    const hasNutritionData = Object.keys(per100g).length > 0;
    const materialType = (materialTypes[materialId] || "herb") as "herb" | "supplement";
    return {
      materialId,
      materialName: (mat.materialName as string) || "",
      materialType,
      quantity: Number(mat.quantity) || 0,
      per100g,
      hasNutritionData,
    };
  });

  return {
    formulaId,
    formulaName: formula.name as string,
    finishedWeight,
    ratioFactor: formulaRatioFactor,
    supplementRatioFactor,
    materials: analyzeMaterials,
  };
}

export async function getCoverageData(formulaId: string, userId: string, userRole: string) {
  const formula = (await query("SELECT * FROM formulas WHERE id = ?", [formulaId])).rows[0] as DbRow | undefined;
  if (!formula) return { error: "NOT_FOUND", message: "配方不存在" };

  if (userRole !== "admin" && formula.created_by !== userId) {
    return { error: "FORBIDDEN", message: "无权访问该配方" };
  }

  const materials = parseMaterialsJson(formula.materials_json);
  const matIds = materials.map((m) => m.materialId as string).filter(Boolean);
  const materialTypes: Record<string, string> = {};
  if (matIds.length > 0) {
    const placeholders = matIds.map(() => "?").join(",");
    const matRows = (await query(`SELECT id, name, material_type FROM materials WHERE id IN (${placeholders})`, matIds)).rows as DbRow[];
    for (const row of matRows) {
      materialTypes[row.id as string] = (row.material_type as string) || "herb";
    }
  }

  let withNutrition = 0;
  const missingMaterials: Array<{ materialId: string; materialName: string; materialType: string }> = [];
  let weightWithNutrition = 0;
  let totalWeight = 0;

  for (const mat of materials) {
    const materialId = mat.materialId as string;
    const quantity = Number(mat.quantity) || 0;
    totalWeight += quantity;
    const nutrition = (await query(
      "SELECT nutrition_id FROM material_nutrition WHERE material_id = ? AND is_latest = 1",
      [materialId],
    )).rows[0] as DbRow | undefined;
    if (nutrition) {
      withNutrition++;
      weightWithNutrition += quantity;
    } else {
      missingMaterials.push({
        materialId,
        materialName: (mat.materialName as string) || "",
        materialType: materialTypes[materialId] || "herb",
      });
    }
  }

  const coverageRate = materials.length > 0 ? withNutrition / materials.length : 0;
  const weightCoverage = totalWeight > 0 ? weightWithNutrition / totalWeight : 0;
  const confidenceLevel: "high" | "medium" | "low" = coverageRate >= 0.9 ? "high" : coverageRate >= 0.7 ? "medium" : "low";

  return {
    formulaId,
    totalMaterials: materials.length,
    withNutrition,
    coverageRate: Math.round(coverageRate * 10000) / 10000,
    missingMaterials,
    weightCoverage: Math.round(weightCoverage * 10000) / 10000,
    confidenceLevel,
  };
}
