import { query } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase, safeJsonParse } from "../utils/helpers.js";
import * as materialReviewService from "./materialReviewService.js";

const NUTRIENT_KEY_MAP: Record<string, string> = {
  energy_kj: "energy",
  protein_g: "protein",
  fat_g: "fat",
  carbohydrate_g: "carbohydrate",
  dietary_fiber_g: "fiber",
  sugars_g: "sugars",
  sodium_mg: "sodium",
  potassium_mg: "potassium",
  calcium_mg: "calcium",
  iron_mg: "iron",
  zinc_mg: "zinc",
  magnesium_mg: "magnesium",
  phosphorus_mg: "phosphorus",
  vitaminA_ug: "vitaminA",
  vitaminC_mg: "vitaminC",
  vitaminD_ug: "vitaminD",
  vitaminE_mg: "vitaminE",
  vitaminK_ug: "vitaminK",
  vitaminB1_mg: "vitaminB1",
  vitaminB2_mg: "vitaminB2",
  vitaminB3_mg: "vitaminB3",
  vitaminB6_mg: "vitaminB6",
  vitaminB12_ug: "vitaminB12",
  folate_ug: "folate",
  cholesterol_mg: "cholesterol",
  transFat_g: "transFat",
  saturatedFat_g: "saturatedFat",
};

function normalizeNutrientKey(key: string): string {
  if (NUTRIENT_KEY_MAP[key]) return NUTRIENT_KEY_MAP[key];
  const cleaned = key.replace(/_(mg|g|ug|μg|kj|kcal)$/, "");
  return NUTRIENT_KEY_MAP[cleaned] || key;
}

function normalizePer100g(raw: Record<string, any>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number") {
      result[normalizeNutrientKey(k)] = v;
    }
  }
  if (result.energy == null || isNaN(result.energy)) {
    const protein = result.protein ?? 0;
    const fat = result.fat ?? 0;
    const carbohydrate = result.carbohydrate ?? 0;
    if (protein > 0 || fat > 0 || carbohydrate > 0) {
      result.energy = Math.round((protein * 17 + fat * 37 + carbohydrate * 17) * 100) / 100;
    }
  }
  return result;
}

interface AuthUser {
  userId: string;
  role: string;
}

export interface MaterialRow {
  id: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  material_type: string;
  unit_price: number | null;
  data_source: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  previous_version_id: string | null;
  is_latest: number;
  is_deleted: number;
  status: string;
  appearance_json: string | null;
  taste_json: string | null;
  efficacy_json: string | null;
}

const BASIC_FIELD_LABELS: Record<string, string> = {
  name: "名称",
  unit: "单位",
  stock: "库存",
  unit_price: "单价",
  material_type: "类型",
  data_source: "数据源",
};

const BASIC_FIELD_CAMEL_MAP: Record<string, string> = {
  name: "name",
  unit: "unit",
  stock: "stock",
  unit_price: "unitPrice",
  material_type: "materialType",
  data_source: "dataSource",
};

const NUTRIENT_LABELS: Record<string, string> = {
  energy: "能量",
  protein: "蛋白质",
  fat: "脂肪",
  carbohydrate: "碳水化合物",
  fiber: "膳食纤维",
  sugars: "糖",
  sodium: "钠",
  potassium: "钾",
  calcium: "钙",
  iron: "铁",
  zinc: "锌",
  magnesium: "镁",
  phosphorus: "磷",
  vitaminA: "维生素A",
  vitaminC: "维生素C",
  vitaminD: "维生素D",
  vitaminE: "维生素E",
  vitaminK: "维生素K",
  vitaminB1: "维生素B1",
  vitaminB2: "维生素B2",
  vitaminB3: "维生素B3",
  vitaminB6: "维生素B6",
  vitaminB12: "维生素B12",
  folate: "叶酸",
  cholesterol: "胆固醇",
  transFat: "反式脂肪",
  saturatedFat: "饱和脂肪",
};

export function buildChangesSummary(
  current: MaterialRow,
  newData: Record<string, any>,
  currentNutrition?: Record<string, number> | null,
  newNutritionJson?: string | null,
): string {
  const changes: Array<{ field: string; label: string; old: any; new: any }> = [];

  for (const [snakeKey, label] of Object.entries(BASIC_FIELD_LABELS)) {
    const camelKey = BASIC_FIELD_CAMEL_MAP[snakeKey];
    const oldVal = (current as any)[snakeKey];
    const newVal = newData[camelKey] ?? newData[snakeKey];
    if (newVal !== undefined && oldVal !== newVal) {
      changes.push({ field: snakeKey, label, old: oldVal, new: newVal });
    }
  }

  if (currentNutrition && newNutritionJson) {
    try {
      const rawNew = JSON.parse(newNutritionJson);
      const newNut = normalizePer100g(rawNew);
      for (const [key, label] of Object.entries(NUTRIENT_LABELS)) {
        const oldVal = currentNutrition[key];
        const newVal = newNut[key];
        if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
          changes.push({ field: `nutrition_${key}`, label: `营养·${label}`, old: oldVal, new: newVal });
        }
      }
    } catch {
      // ignore nutrition parse errors
    }
  }

  return JSON.stringify(changes);
}

export function canEdit(user: AuthUser, material: MaterialRow): boolean {
  if (user.role === "admin") return true;
  return material.created_by === user.userId;
}

export function canDelete(user: AuthUser): boolean {
  return user.role === "admin";
}

export async function checkReference(materialId: string): Promise<{
  referenced: boolean;
  count: number;
  formulas: { id: string; name: string }[];
}> {
  const result = await query<any>("SELECT id, name FROM formulas WHERE materials_json LIKE ?", [
    `%"materialId":"${materialId}"%`,
  ]);
  const formulas = (result.rows || []).map((r: any) => ({ id: r.id, name: r.name }));
  return {
    referenced: formulas.length > 0,
    count: formulas.length,
    formulas,
  };
}

export async function getLatestVersion(materialId: string): Promise<MaterialRow | null> {
  const result = await query<any>("SELECT * FROM materials WHERE id = ?", [materialId]);
  return result.rows?.[0] || null;
}

export async function updateMaterial(
  id: string,
  data: Record<string, any>,
): Promise<MaterialRow | null> {
  const current = await getLatestVersion(id);
  if (!current) return null;

  if (current.status === "pending_review") {
    throw new Error("待审批状态的原料不可编辑");
  }

  const refInfo = await checkReference(id);

  if (refInfo.referenced || current.status === "published") {
    return await createNewVersion(current, data);
  }

  const fieldMap: Record<string, string> = {
    name: "name",
    code: "code",
    unit: "unit",
    stock: "stock",
    materialType: "material_type",
    unitPrice: "unit_price",
    dataSource: "data_source",
    appearance: "appearance_json",
    taste: "taste_json",
    efficacy: "efficacy_json",
  };

  const jsonFields = new Set(["appearance_json", "taste_json", "efficacy_json"]);

  const updates: Record<string, any> = {};
  for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
    if (camelKey in data) {
      if (jsonFields.has(snakeKey)) {
        const arr = data[camelKey];
        updates[snakeKey] = Array.isArray(arr) ? JSON.stringify(arr) : null;
      } else {
        updates[snakeKey] = data[camelKey];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return current;
  }

  const fields = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.values(updates);
  values.push(now(), id);

  await query(`UPDATE materials SET ${fields}, updated_at = ? WHERE id = ?`, values);

  return await getLatestVersion(id);
}

export async function createNewVersion(current: MaterialRow, newData: Record<string, any>): Promise<MaterialRow> {
  await query("UPDATE materials SET is_latest = 0 WHERE id = ?", [current.id]);

  const newId = generateId();
  const newVersion = current.version + 1;

  let currentNutrition: Record<string, number> | null = null;
  const nutritionResult = await query<any>(
    "SELECT * FROM material_nutrition WHERE material_id = ? LIMIT 1",
    [current.id],
  );
  const nutritionRow = nutritionResult.rows?.[0];
  if (nutritionRow) {
    try {
      currentNutrition = normalizePer100g(JSON.parse(nutritionRow.per_100g_json));
    } catch {
      // ignore
    }
  }

  const changesJson = buildChangesSummary(current, newData, currentNutrition, nutritionRow?.per_100g_json ?? null);

  const fields = [
    "id", "name", "code", "unit", "stock", "material_type",
    "unit_price", "data_source", "created_by", "version",
    "previous_version_id", "is_latest", "is_deleted", "created_at", "updated_at",
    "changes_json", "status", "appearance_json", "taste_json", "efficacy_json",
  ];

  const newRow: Record<string, any> = {
    id: newId,
    name: newData.name ?? current.name,
    code: newData.code ?? current.code,
    unit: newData.unit ?? current.unit,
    stock: newData.stock ?? current.stock,
    material_type: newData.materialType ?? newData.material_type ?? current.material_type,
    unit_price: newData.unitPrice ?? newData.unit_price ?? current.unit_price,
    data_source: newData.dataSource ?? newData.data_source ?? current.data_source,
    created_by: current.created_by,
    version: newVersion,
    previous_version_id: current.id,
    is_latest: 1,
    is_deleted: 0,
    created_at: current.created_at,
    updated_at: now(),
    changes_json: changesJson,
    status: "draft",
    appearance_json: newData.appearance !== undefined
      ? (Array.isArray(newData.appearance) ? JSON.stringify(newData.appearance) : null)
      : current.appearance_json,
    taste_json: newData.taste !== undefined
      ? (Array.isArray(newData.taste) ? JSON.stringify(newData.taste) : null)
      : current.taste_json,
    efficacy_json: newData.efficacy !== undefined
      ? (Array.isArray(newData.efficacy) ? JSON.stringify(newData.efficacy) : null)
      : current.efficacy_json,
  };

  const placeholders = fields.map(() => "?").join(", ");
  const values = fields.map((f) => newRow[f]);

  await query(`INSERT INTO materials (${fields.join(", ")}) VALUES (${placeholders})`, values);

  if (nutritionRow) {
    const newNutritionId = generateId();
    await query(
      `INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, confidence, last_updated, material_version, is_latest)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        newNutritionId,
        newId,
        nutritionRow.per_100g_json,
        nutritionRow.data_version,
        nutritionRow.data_source,
        nutritionRow.notes,
        nutritionRow.confidence,
        now(),
        newVersion,
      ],
    );
  }

  const result = await query<any>("SELECT * FROM materials WHERE id = ?", [newId]);
  return result.rows?.[0] || null;
}

export async function softDeleteMaterial(id: string): Promise<boolean> {
  const refInfo = await checkReference(id);
  if (refInfo.referenced) return false;

  await query("UPDATE materials SET is_deleted = 1, updated_at = ? WHERE id = ?", [now(), id]);
  return true;
}

export async function getMaterialVersions(materialId: string): Promise<{
  materialName: string;
  materialCode: string;
  currentVersion: number;
  versions: any[];
} | null> {
  const currentResult = await query<any>("SELECT name, code, version FROM materials WHERE id = ?", [materialId]);
  const current = currentResult.rows?.[0];
  if (!current) return null;

  const result = await query<any>(
    `SELECT m.id, m.version, m.is_latest, m.created_at, m.created_by, m.changes_json,
            u.display_name AS created_by_name, u.role AS created_by_role
     FROM materials m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE m.code = (SELECT code FROM materials WHERE id = ?)
       AND m.is_deleted = 0
     ORDER BY m.version DESC`,
    [materialId],
  );

  const versions = (result.rows || []).map((r: any) => {
    let changesDetail: Array<{ field: string; label: string; old: any; new: any }> | undefined;
    let changesSummary: string;

    if (r.changes_json) {
      try {
        const parsed = JSON.parse(r.changes_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          changesDetail = parsed;
          changesSummary = parsed.map((c: any) => `${c.label}: ${c.old} → ${c.new}`).join("；");
        } else {
          changesSummary = r.version === 1 ? "初始创建" : `版本 v${r.version}`;
        }
      } catch {
        changesSummary = r.version === 1 ? "初始创建" : `版本 v${r.version}`;
      }
    } else {
      changesSummary = r.version === 1 ? "初始创建" : `版本 v${r.version}`;
    }

    const versionObj: any = {
      ...rowToCamelCase(r),
      changesSummary,
    };
    if (changesDetail) {
      versionObj.changesDetail = changesDetail;
    }
    return versionObj;
  });

  return {
    materialName: current.name,
    materialCode: current.code,
    currentVersion: current.version,
    versions,
  };
}

export async function getVersionDetail(materialId: string, versionId: string): Promise<any> {
  const result = await query<any>(
    `SELECT m.*, u.display_name AS created_by_name, u.role AS created_by_role
     FROM materials m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE m.id = ? AND m.code = (SELECT code FROM materials WHERE id = ?)`,
    [versionId, materialId],
  );
  const row = result.rows?.[0];
  if (!row) return null;

  const nutritionResult = await query<any>(
    "SELECT per_100g_json FROM material_nutrition WHERE material_id = ? AND material_version = ? LIMIT 1",
    [versionId, row.version],
  );

  const res: any = rowToCamelCase(row);
  res.createdByName = row.created_by_name;
  res.createdByRole = row.created_by_role;
  const nutRow = nutritionResult.rows?.[0];
  if (nutRow) {
    const raw = JSON.parse(nutRow.per_100g_json);
    res.nutrition = normalizePer100g(raw);
  }

  return res;
}

function computeChangeType(left: number | null | undefined, right: number | null | undefined): {
  change: string;
  type: "increase" | "decrease" | "unchanged" | "new" | "deleted";
} {
  if (left == null && right != null) return { change: "NEW", type: "new" };
  if (left != null && right == null) return { change: "DEL", type: "deleted" };
  if (left == null && right == null) return { change: "—", type: "unchanged" };
  if (left === right) return { change: "—", type: "unchanged" };

  const diff = Number(right) - Number(left);
  const absLeft = Math.abs(Number(left));
  const pct = absLeft > 0 ? Math.round((diff / absLeft) * 100) : 0;

  if (diff > 0) return { change: `↑ +${Math.abs(pct)}%`, type: "increase" };
  return { change: `↓ -${Math.abs(pct)}%`, type: "decrease" };
}

export async function compareVersions(
  materialId: string,
  versionId1: string,
  versionId2: string,
): Promise<any | null> {
  const leftDetail = await getVersionDetail(materialId, versionId1);
  const rightDetail = await getVersionDetail(materialId, versionId2);
  if (!leftDetail || !rightDetail) return null;

  const basicFields: Array<{ field: string; label: string; format?: (v: any) => string }> = [
    { field: "name", label: "名称" },
    { field: "code", label: "编码" },
    { field: "unit", label: "单位" },
    { field: "stock", label: "库存" },
    { field: "unitPrice", label: "单价", format: (v: any) => (v != null ? `¥${Number(v).toFixed(2)}` : "暂未录入") },
    { field: "materialType", label: "类型", format: (v: any) => (v === "herb" ? "药材" : "辅料") },
    { field: "dataSource", label: "数据源" },
  ];

  const basicDiff = basicFields
    .map(({ field, label, format }) => {
      const leftVal = (leftDetail as any)[field];
      const rightVal = (rightDetail as any)[field];
      if (leftVal === rightVal) {
        return { field, label, left: leftVal, right: rightVal, leftDisplay: format ? format(leftVal) : String(leftVal ?? "--"), rightDisplay: format ? format(rightVal) : String(rightVal ?? "--"), change: "—", type: "unchanged" as const };
      }
      const isNumeric = typeof leftVal === "number" && typeof rightVal === "number";
      const changeInfo = isNumeric ? computeChangeType(leftVal, rightVal) : { change: "修改", type: "increase" as const };
      return {
        field,
        label,
        left: leftVal,
        right: rightVal,
        leftDisplay: format ? format(leftVal) : String(leftVal ?? "--"),
        rightDisplay: format ? format(rightVal) : String(rightVal ?? "--"),
        ...changeInfo,
      };
    })
    .filter((d) => d.type !== "unchanged");

  const nutritionFields: Array<{ field: string; label: string; unit: string }> = [
    { field: "energy", label: "能量", unit: "kJ" },
    { field: "protein", label: "蛋白质", unit: "g" },
    { field: "fat", label: "脂肪", unit: "g" },
    { field: "carbohydrate", label: "碳水化合物", unit: "g" },
    { field: "fiber", label: "膳食纤维", unit: "g" },
    { field: "sodium", label: "钠", unit: "mg" },
  ];

  const leftNutrition = leftDetail.nutrition || {};
  const rightNutrition = rightDetail.nutrition || {};

  const nutritionDiff = nutritionFields
    .map(({ field, label, unit }) => {
      const leftVal = leftNutrition[field];
      const rightVal = rightNutrition[field];
      if (leftVal == null && rightVal == null) return null;
      const changeInfo = computeChangeType(leftVal, rightVal);
      return {
        field,
        label,
        left: leftVal,
        right: rightVal,
        leftDisplay: leftVal != null ? `${leftVal}${unit}` : "--",
        rightDisplay: rightVal != null ? `${rightVal}${unit}` : "--",
        ...changeInfo,
      };
    })
    .filter(Boolean);

  return {
    left: { versionId: leftDetail.id, version: leftDetail.version, name: leftDetail.name },
    right: { versionId: rightDetail.id, version: rightDetail.version, name: rightDetail.name },
    diff: {
      basic: basicDiff,
      nutrition: nutritionDiff,
    },
  };
}

export async function getMaterialList(params: {
  keyword?: string;
  page: number;
  pageSize: number;
  scope?: string;
  userId: string;
  userRole: string;
  status?: string;
}) {
  const { keyword, page, pageSize, scope, userId, userRole, status } = params;
  const { buildPagination, buildLike } = await import("../utils/helpers.js");
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = ["m.is_deleted = 0", "m.is_latest = 1"];
  const queryParams: any[] = [];

  if (keyword) {
    conditions.push("(m.name LIKE ? OR m.code LIKE ?)");
    const like = buildLike(keyword);
    queryParams.push(like, like);
  }

  if (status) {
    conditions.push("m.status = ?");
    queryParams.push(status);
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const dataResult = await query<any>(
    `SELECT m.*,
            COALESCE(u.display_name, u.username) AS created_by_name,
            u.avatar AS created_by_avatar,
            (SELECT COUNT(*) FROM formulas WHERE materials_json LIKE '%"materialId":"' || m.id || '"%') AS reference_count,
            (SELECT COUNT(*) FROM materials WHERE code = m.code AND is_deleted = 0) AS total_versions,
            mn.per_100g_json AS per_100g_json
     FROM materials m
     LEFT JOIN users u ON m.created_by = u.id
     LEFT JOIN material_nutrition mn ON mn.material_id = m.id AND mn.is_latest = 1
     ${whereClause}
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, size, offset],
  );

  const countResult = await query<any>(
    `SELECT COUNT(*) as total FROM materials m ${whereClause}`,
    queryParams,
  );

  const list = (dataResult.rows || []).map((row: any) => {
    const item: any = {
      ...rowToCamelCase(row),
      isOwner: row.created_by === userId,
      referenceCount: row.reference_count || 0,
      totalVersions: row.total_versions || 1,
      hasNewerVersion: !row.is_latest,
    };
    if (row.per_100g_json) {
      try {
        item.nutrition = JSON.parse(row.per_100g_json);
      } catch {
        item.nutrition = null;
      }
    }
    delete item.per100gJson;
    item.appearance = row.appearance_json ? safeJsonParse<string[]>(row.appearance_json, []) : null;
    item.taste = row.taste_json ? safeJsonParse<string[]>(row.taste_json, []) : null;
    item.efficacy = row.efficacy_json ? safeJsonParse<string[]>(row.efficacy_json, []) : null;
    delete item.appearanceJson;
    delete item.tasteJson;
    delete item.efficacyJson;
    return item;
  });

  return {
    list,
    pagination: {
      page: p,
      pageSize: size,
      total: countResult.rows?.[0]?.total || 0,
      totalPages: Math.ceil((countResult.rows?.[0]?.total || 0) / size),
    },
  };
}

export async function getMaterialDetail(materialId: string, userId: string): Promise<any> {
  const result = await query<any>(
    `SELECT m.*,
            COALESCE(u.display_name, u.username) AS created_by_name,
            u.avatar AS created_by_avatar,
            (SELECT COUNT(*) FROM formulas WHERE materials_json LIKE '%"materialId":"' || m.id || '"%') AS reference_count,
            (SELECT COUNT(*) FROM materials WHERE code = m.code AND is_deleted = 0) AS total_versions
     FROM materials m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE m.id = ?`,
    [materialId],
  );
  const row = result.rows?.[0];
  if (!row) return null;

  const nutritionResult = await query<any>(
    "SELECT per_100g_json FROM material_nutrition WHERE material_id = ? AND material_version = ? AND is_latest = 1 LIMIT 1",
    [materialId, row.version],
  );

  const formulaResult = await query<any>(
    "SELECT id, name FROM formulas WHERE materials_json LIKE ?",
    [`%"materialId":"${materialId}"%`],
  );

  const res: any = rowToCamelCase(row);
  res.isOwner = row.created_by === userId;
  res.referenceCount = row.reference_count || 0;
  res.totalVersions = row.total_versions || 1;
  res.hasNewerVersion = !row.is_latest;
  res.referencedFormulas = (formulaResult.rows || []).map((f: any) => ({ id: f.id, name: f.name }));

  const nutRow = nutritionResult.rows?.[0];
  if (nutRow) {
    res.nutrition = JSON.parse(nutRow.per_100g_json);
  }

  res.appearance = row.appearance_json ? safeJsonParse<string[]>(row.appearance_json, []) : null;
  res.taste = row.taste_json ? safeJsonParse<string[]>(row.taste_json, []) : null;
  res.efficacy = row.efficacy_json ? safeJsonParse<string[]>(row.efficacy_json, []) : null;
  delete res.appearanceJson;
  delete res.tasteJson;
  delete res.efficacyJson;

  res.reviewLogs = await materialReviewService.getReviewLogs(materialId);

  return res;
}