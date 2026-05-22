import { query } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase } from "../utils/helpers.js";

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

  const refInfo = await checkReference(id);

  if (refInfo.referenced) {
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
  };

  const updates: Record<string, any> = {};
  for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
    if (camelKey in data) {
      updates[snakeKey] = data[camelKey];
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

  const fields = [
    "id", "name", "code", "unit", "stock", "material_type",
    "unit_price", "data_source", "created_by", "version",
    "previous_version_id", "is_latest", "is_deleted", "created_at", "updated_at",
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
  };

  const placeholders = fields.map(() => "?").join(", ");
  const values = fields.map((f) => newRow[f]);

  await query(`INSERT INTO materials (${fields.join(", ")}) VALUES (${placeholders})`, values);

  const nutritionResult = await query<any>(
    "SELECT * FROM material_nutrition WHERE material_id = ? LIMIT 1",
    [current.id],
  );
  const nutritionRow = nutritionResult.rows?.[0];
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
    `SELECT m.id, m.version, m.is_latest, m.created_at, m.created_by,
            u.display_name AS created_by_name, u.role AS created_by_role
     FROM materials m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE m.code = (SELECT code FROM materials WHERE id = ?)
       AND m.is_deleted = 0
     ORDER BY m.version DESC`,
    [materialId],
  );

  const versions = (result.rows || []).map((r: any) => ({
    ...rowToCamelCase(r),
    changesSummary: r.version === 1 ? "初始创建" : `版本 v${r.version}`,
  }));

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
    res.nutrition = JSON.parse(nutRow.per_100g_json);
  }

  return res;
}

export async function getMaterialList(params: {
  keyword?: string;
  page: number;
  pageSize: number;
  scope?: string;
  userId: string;
  userRole: string;
}) {
  const { keyword, page, pageSize, scope, userId, userRole } = params;
  const { buildPagination, buildLike } = await import("../utils/helpers.js");
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = ["m.is_deleted = 0", "m.is_latest = 1"];
  const queryParams: any[] = [];

  if (keyword) {
    conditions.push("(m.name LIKE ? OR m.code LIKE ?)");
    const like = buildLike(keyword);
    queryParams.push(like, like);
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const dataResult = await query<any>(
    `SELECT m.*,
            (SELECT COUNT(*) FROM formulas WHERE materials_json LIKE '%"materialId":"' || m.id || '"%') AS reference_count,
            (SELECT COUNT(*) FROM materials WHERE code = m.code AND is_deleted = 0) AS total_versions
     FROM materials m
     ${whereClause}
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, size, offset],
  );

  const countResult = await query<any>(
    `SELECT COUNT(*) as total FROM materials m ${whereClause}`,
    queryParams,
  );

  const list = (dataResult.rows || []).map((row: any) => ({
    ...rowToCamelCase(row),
    isOwner: row.created_by === userId,
    referenceCount: row.reference_count || 0,
    totalVersions: row.total_versions || 1,
    hasNewerVersion: !row.is_latest,
  }));

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
            (SELECT COUNT(*) FROM formulas WHERE materials_json LIKE '%"materialId":"' || m.id || '"%') AS reference_count,
            (SELECT COUNT(*) FROM materials WHERE code = m.code AND is_deleted = 0) AS total_versions
     FROM materials m
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

  return res;
}