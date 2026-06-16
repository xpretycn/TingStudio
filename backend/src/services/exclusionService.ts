import { query, execute } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase, rowsToCamelCase } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

const VALID_EXCLUSION_CATEGORIES = ["appearance", "taste"] as const;
type ExclusionCategory = (typeof VALID_EXCLUSION_CATEGORIES)[number];

interface ExclusionRuleRow {
  id: string;
  category: string;
  value_a: string;
  value_b: string;
  label_a: string | null;
  label_b: string | null;
}

export interface ExclusionRule {
  id: string;
  category: string;
  valueA: string;
  valueB: string;
  labelA: string | null;
  labelB: string | null;
}

export interface CreateExclusionData {
  category: string;
  valueA: string;
  valueB: string;
}

export interface GroupedExclusions {
  appearance: ExclusionRule[];
  taste: ExclusionRule[];
}

function createAppError(message: string, code: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

async function ensureExclusionsTable(): Promise<void> {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS enum_exclusions (
        id VARCHAR(36) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        value_a VARCHAR(100) NOT NULL,
        value_b VARCHAR(100) NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE(category, value_a, value_b),
        INDEX idx_exclusion_category (category),
        INDEX idx_exclusion_value_a (value_a),
        INDEX idx_exclusion_value_b (value_b)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch {
    // ignore if table already exists
  }
}

const EXCLUSION_JOIN_QUERY = `
  SELECT
    e.id,
    e.category,
    e.value_a,
    e.value_b,
    eo1.label AS label_a,
    eo2.label AS label_b
  FROM enum_exclusions e
  LEFT JOIN enum_options eo1 ON eo1.category = e.category AND eo1.value = e.value_a
  LEFT JOIN enum_options eo2 ON eo2.category = e.category AND eo2.value = e.value_b
`;

export async function getAllExclusions(): Promise<GroupedExclusions> {
  await ensureExclusionsTable();
  const sql = EXCLUSION_JOIN_QUERY + " ORDER BY e.category, e.value_a";
  const result = await query<ExclusionRuleRow>(sql);
  const rows = rowsToCamelCase<ExclusionRule>(result.rows || []);

  const grouped: GroupedExclusions = { appearance: [], taste: [] };
  for (const row of rows) {
    if (row.category === "appearance" || row.category === "taste") {
      grouped[row.category].push(row);
    }
  }
  return grouped;
}

export async function createExclusion(data: CreateExclusionData): Promise<ExclusionRule> {
  await ensureExclusionsTable();
  // 校验 category 必须为 appearance 或 taste
  if (!VALID_EXCLUSION_CATEGORIES.includes(data.category as ExclusionCategory)) {
    throw createAppError("互斥规则分类必须为 appearance 或 taste", "VALIDATION_ERROR");
  }

  // 校验 valueA !== valueB
  if (data.valueA === data.valueB) {
    throw createAppError("valueA 和 valueB 不能相同", "VALIDATION_ERROR");
  }

  // 确保 valueA < valueB（字典序），否则交换
  let valueA = data.valueA;
  let valueB = data.valueB;
  if (valueA > valueB) {
    [valueA, valueB] = [valueB, valueA];
  }

  // 校验 valueA 必须存在于 enum_options 表且 is_active = 1
  const checkA = await query<Record<string, unknown>>(
    "SELECT id FROM enum_options WHERE category = ? AND value = ? AND is_active = 1",
    [data.category, valueA],
  );
  if (!checkA.rows?.[0]) {
    throw createAppError(`选项 "${valueA}" 在枚举表中不存在或未启用`, "VALIDATION_ERROR");
  }

  // 校验 valueB 必须存在于 enum_options 表且 is_active = 1
  const checkB = await query<Record<string, unknown>>(
    "SELECT id FROM enum_options WHERE category = ? AND value = ? AND is_active = 1",
    [data.category, valueB],
  );
  if (!checkB.rows?.[0]) {
    throw createAppError(`选项 "${valueB}" 在枚举表中不存在或未启用`, "VALIDATION_ERROR");
  }

  // 插入，UNIQUE 约束兜底重复检查
  const id = generateId();
  try {
    await query(
      "INSERT INTO enum_exclusions (id, category, value_a, value_b, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, data.category, valueA, valueB, now(), now()],
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("UNIQUE") || errMsg.includes("unique") || errMsg.includes("duplicate")) {
      throw createAppError("该互斥规则已存在", "DUPLICATE_ENTRY");
    }
    throw error;
  }

  // 查询创建的规则（含 label）
  const fetchSql = EXCLUSION_JOIN_QUERY + " WHERE e.id = ?";
  const result = await query<ExclusionRuleRow>(fetchSql, [id]);
  const row = result.rows?.[0];
  if (!row) {
    throw createAppError("创建互斥规则后查询失败", "INTERNAL_ERROR");
  }
  return rowToCamelCase<ExclusionRule>(row);
}

export async function deleteExclusion(id: string): Promise<{ deletedId: string }> {
  await ensureExclusionsTable();
  const existing = await query<Record<string, unknown>>(
    "SELECT id FROM enum_exclusions WHERE id = ?",
    [id],
  );
  if (!existing.rows?.[0]) {
    throw createAppError("互斥规则不存在", "NOT_FOUND");
  }
  await query("DELETE FROM enum_exclusions WHERE id = ?", [id]);
  return { deletedId: id };
}
