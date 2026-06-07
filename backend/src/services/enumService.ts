import { query } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase, rowsToCamelCase } from "../utils/helpers.js";

const VALID_CATEGORIES = ["appearance", "taste", "efficacy"] as const;
type EnumCategory = (typeof VALID_CATEGORIES)[number];

interface EnumOptionRow {
  id: string;
  category: string;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EnumOption extends EnumOptionRow {}

function createAppError(message: string, code: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function toEnumOption(row: Record<string, unknown>): EnumOption {
  const converted = rowToCamelCase<EnumOptionRow>(row);
  return { ...converted, isActive: Boolean(converted.isActive) };
}

export async function getAllEnums(): Promise<Record<string, EnumOption[]>> {
  const result = await query<Record<string, unknown>>("SELECT * FROM enum_options ORDER BY category, sort_order");
  const rows = rowsToCamelCase<EnumOptionRow>(result.rows || []);
  const grouped: Record<string, EnumOption[]> = { appearance: [], taste: [], efficacy: [] };
  for (const row of rows) {
    if (grouped[row.category]) {
      grouped[row.category].push({ ...row, isActive: Boolean(row.isActive) });
    }
  }
  return grouped;
}

export async function getEnumsByCategory(category: string, activeOnly = false): Promise<EnumOption[]> {
  let sql = "SELECT * FROM enum_options WHERE category = ?";
  const params: unknown[] = [category];
  if (activeOnly) {
    sql += " AND is_active = 1";
  }
  sql += " ORDER BY sort_order";
  const result = await query<Record<string, unknown>>(sql, params);
  return rowsToCamelCase<EnumOptionRow>(result.rows || []).map(toEnumOption);
}

export async function createEnumOption(data: { category: string; label: string; value: string }): Promise<EnumOption> {
  if (!VALID_CATEGORIES.includes(data.category as EnumCategory)) {
    throw new Error("无效的枚举分类");
  }
  const existing = await query<Record<string, unknown>>(
    "SELECT id FROM enum_options WHERE category = ? AND value = ?",
    [data.category, data.value],
  );
  if (existing.rows?.length > 0) {
    throw createAppError("该分类下已存在相同选项", "DUPLICATE_ENTRY");
  }
  const maxSortResult = await query<{ max_sort: number }>(
    "SELECT MAX(sort_order) as max_sort FROM enum_options WHERE category = ?",
    [data.category],
  );
  const maxSort = maxSortResult.rows?.[0]?.max_sort ?? 0;
  const id = generateId();
  await query(
    "INSERT INTO enum_options (id, category, label, value, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
    [id, data.category, data.label, data.value, maxSort + 1, now(), now()],
  );
  const result = await query<Record<string, unknown>>("SELECT * FROM enum_options WHERE id = ?", [id]);
  return toEnumOption(result.rows?.[0] as Record<string, unknown>);
}

export async function updateEnumOption(id: string, data: { label?: string; value?: string; isActive?: boolean }): Promise<EnumOption> {
  const existing = await query<Record<string, unknown>>("SELECT * FROM enum_options WHERE id = ?", [id]);
  if (!existing.rows?.[0]) {
    throw createAppError("枚举选项不存在", "NOT_FOUND");
  }
  const current = existing.rows[0];
  if (data.value && data.value !== current.value) {
    const dupCheck = await query<Record<string, unknown>>(
      "SELECT id FROM enum_options WHERE category = ? AND value = ? AND id != ?",
      [current.category, data.value, id],
    );
    if (dupCheck.rows?.length > 0) {
      throw createAppError("该分类下已存在相同选项", "DUPLICATE_ENTRY");
    }
  }
  const updates: string[] = [];
  const params: unknown[] = [];
  if (data.label !== undefined) { updates.push("label = ?"); params.push(data.label); }
  if (data.value !== undefined) { updates.push("value = ?"); params.push(data.value); }
  if (data.isActive !== undefined) { updates.push("is_active = ?"); params.push(data.isActive ? 1 : 0); }
  if (updates.length === 0) return toEnumOption(current);
  updates.push("updated_at = ?");
  params.push(now());
  params.push(id);
  await query(`UPDATE enum_options SET ${updates.join(", ")} WHERE id = ?`, params);
  if (data.value && data.value !== current.value) {
    await syncMaterialJsonField(current.category as string, current.value as string, data.value);
  }
  const result = await query<Record<string, unknown>>("SELECT * FROM enum_options WHERE id = ?", [id]);
  return toEnumOption(result.rows?.[0] as Record<string, unknown>);
}

export async function deleteEnumOption(id: string): Promise<{ deletedId: string; referenceCount: number }> {
  const existing = await query<Record<string, unknown>>("SELECT * FROM enum_options WHERE id = ?", [id]);
  if (!existing.rows?.[0]) {
    throw createAppError("枚举选项不存在", "NOT_FOUND");
  }
  const row = existing.rows[0];
  const refCount = await getReferenceCount(row.category as string, row.value as string);
  await query("DELETE FROM enum_options WHERE id = ?", [id]);
  return { deletedId: id, referenceCount: refCount };
}

export async function getReferenceCount(category: string, value: string): Promise<number> {
  const jsonField = `${category}_json`;
  const result = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM materials WHERE ${jsonField} LIKE ?`,
    [`%"${value}"%`],
  );
  return result.rows?.[0]?.count ?? 0;
}

async function syncMaterialJsonField(category: string, oldValue: string, newValue: string): Promise<void> {
  const jsonField = `${category}_json`;
  const result = await query<Record<string, unknown>>(
    `SELECT id, ${jsonField} FROM materials WHERE ${jsonField} LIKE ?`,
    [`%"${oldValue}"%`],
  );
  for (const row of result.rows || []) {
    try {
      const arr: string[] = JSON.parse(row[jsonField] as string);
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
