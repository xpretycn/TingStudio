import { query } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase, rowsToCamelCase } from "../utils/helpers.js";

const VALID_CATEGORIES = ["appearance", "taste", "efficacy"] as const;
type EnumCategory = (typeof VALID_CATEGORIES)[number];

export async function getAllEnums(): Promise<Record<string, any[]>> {
  const result = await query<any>("SELECT * FROM enum_options ORDER BY category, sort_order");
  const rows = rowsToCamelCase(result.rows || []);
  const grouped: Record<string, any[]> = { appearance: [], taste: [], efficacy: [] };
  for (const row of rows) {
    if (grouped[row.category]) {
      grouped[row.category].push({ ...row, isActive: Boolean(row.isActive) });
    }
  }
  return grouped;
}

export async function getEnumsByCategory(category: string, activeOnly = false): Promise<any[]> {
  let sql = "SELECT * FROM enum_options WHERE category = ?";
  const params: any[] = [category];
  if (activeOnly) {
    sql += " AND is_active = 1";
  }
  sql += " ORDER BY sort_order";
  const result = await query<any>(sql, params);
  return rowsToCamelCase(result.rows || []).map((r: any) => ({ ...r, isActive: Boolean(r.isActive) }));
}

export async function createEnumOption(data: { category: string; label: string; value: string }): Promise<any> {
  if (!VALID_CATEGORIES.includes(data.category as EnumCategory)) {
    throw new Error("无效的枚举分类");
  }
  const existing = await query<any>(
    "SELECT id FROM enum_options WHERE category = ? AND value = ?",
    [data.category, data.value],
  );
  if (existing.rows?.length > 0) {
    const err = new Error("该分类下已存在相同选项") as any;
    err.code = "DUPLICATE_ENTRY";
    throw err;
  }
  const maxSortResult = await query<any>(
    "SELECT MAX(sort_order) as max_sort FROM enum_options WHERE category = ?",
    [data.category],
  );
  const maxSort = maxSortResult.rows?.[0]?.max_sort ?? 0;
  const id = generateId();
  await query(
    "INSERT INTO enum_options (id, category, label, value, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
    [id, data.category, data.label, data.value, maxSort + 1, now(), now()],
  );
  const result = await query<any>("SELECT * FROM enum_options WHERE id = ?", [id]);
  const row = rowToCamelCase(result.rows?.[0]);
  return { ...row, isActive: Boolean(row.isActive) };
}

export async function updateEnumOption(id: string, data: { label?: string; value?: string; isActive?: boolean }): Promise<any> {
  const existing = await query<any>("SELECT * FROM enum_options WHERE id = ?", [id]);
  if (!existing.rows?.[0]) {
    const err = new Error("枚举选项不存在") as any;
    err.code = "NOT_FOUND";
    throw err;
  }
  const current = existing.rows[0];
  const newValue = data.value ?? current.value;
  if (data.value && data.value !== current.value) {
    const dupCheck = await query<any>(
      "SELECT id FROM enum_options WHERE category = ? AND value = ? AND id != ?",
      [current.category, data.value, id],
    );
    if (dupCheck.rows?.length > 0) {
      const err = new Error("该分类下已存在相同选项") as any;
      err.code = "DUPLICATE_ENTRY";
      throw err;
    }
  }
  const updates: string[] = [];
  const params: any[] = [];
  if (data.label !== undefined) { updates.push("label = ?"); params.push(data.label); }
  if (data.value !== undefined) { updates.push("value = ?"); params.push(data.value); }
  if (data.isActive !== undefined) { updates.push("is_active = ?"); params.push(data.isActive ? 1 : 0); }
  if (updates.length === 0) return { ...rowToCamelCase(current), isActive: Boolean(current.is_active) };
  updates.push("updated_at = ?");
  params.push(now());
  params.push(id);
  await query(`UPDATE enum_options SET ${updates.join(", ")} WHERE id = ?`, params);
  if (data.value && data.value !== current.value) {
    await syncMaterialJsonField(current.category, current.value, data.value);
  }
  const result = await query<any>("SELECT * FROM enum_options WHERE id = ?", [id]);
  const row = rowToCamelCase(result.rows?.[0]);
  return { ...row, isActive: Boolean(row.isActive) };
}

export async function deleteEnumOption(id: string): Promise<{ deletedId: string; referenceCount: number }> {
  const existing = await query<any>("SELECT * FROM enum_options WHERE id = ?", [id]);
  if (!existing.rows?.[0]) {
    const err = new Error("枚举选项不存在") as any;
    err.code = "NOT_FOUND";
    throw err;
  }
  const row = existing.rows[0];
  const refCount = await getReferenceCount(row.category, row.value);
  await query("DELETE FROM enum_options WHERE id = ?", [id]);
  return { deletedId: id, referenceCount: refCount };
}

export async function getReferenceCount(category: string, value: string): Promise<number> {
  const jsonField = `${category}_json`;
  const result = await query<any>(
    `SELECT COUNT(*) as count FROM materials WHERE ${jsonField} LIKE ?`,
    [`%"${value}"%`],
  );
  return result.rows?.[0]?.count ?? 0;
}

async function syncMaterialJsonField(category: string, oldValue: string, newValue: string): Promise<void> {
  const jsonField = `${category}_json`;
  const result = await query<any>(
    `SELECT id, ${jsonField} FROM materials WHERE ${jsonField} LIKE ?`,
    [`%"${oldValue}"%`],
  );
  for (const row of result.rows || []) {
    try {
      const arr: string[] = JSON.parse(row[jsonField]);
      const updated = arr.map((v: string) => (v === oldValue ? newValue : v));
      await query(
        `UPDATE materials SET ${jsonField} = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(updated), now(), row.id],
      );
    } catch {
      // skip invalid json
    }
  }
}
