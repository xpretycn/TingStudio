// 快速配方 Service 层
import { query } from '../config/database-adapter.js';
import {
  generateId,
  generateFormulaCode,
  rowToCamelCase,
  rowsToCamelCase,
  now,
  buildPagination,
  buildLike,
} from "../utils/helpers.js";

function transformQuickFormula(row: Record<string, unknown>) {
  const camel = rowToCamelCase(row) as Record<string, unknown>;
  if ("materialsJson" in camel && typeof camel.materialsJson === "string") {
    try {
      camel.materials = JSON.parse(camel.materialsJson);
    } catch {
      camel.materials = [];
    }
    delete camel.materialsJson;
  }
  return camel;
}

function transformQuickFormulaList(rows: Record<string, unknown>[]) {
  return rows.map(transformQuickFormula);
}

/** 查询快速配方列表（admin 见全部，formulist 仅见自己） */
export async function findAll(
  userId: string,
  role: string,
  keyword?: string,
  page?: number,
  pageSize?: number,
) {
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const whereParts: string[] = [];
  const params: unknown[] = [];

  if (role !== "admin") {
    whereParts.push("created_by = ?");
    params.push(userId);
  }

  if (keyword) {
    whereParts.push("name LIKE ?");
    params.push(buildLike(keyword));
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const [list]: unknown[] = query(
    `SELECT id, name, status, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, description, preparation_method, salesman_id, salesman_name, created_by, created_at, updated_at FROM quick_formulas ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );

  const [countResult]: unknown[] = query(
    `SELECT COUNT(*) as total FROM quick_formulas ${whereSql}`,
    params,
  );

  const countRows = countResult as Record<string, unknown>[];
  const total = countRows.length > 0 ? Number(countRows[0].total) : 0;

  return {
    list: transformQuickFormulaList(list as Record<string, unknown>[]),
    pagination: { page: p, pageSize: size, total, totalPages: Math.ceil(total / size) },
  };
}

/** 根据 ID 查询快速配方 */
export async function findById(id: string) {
  const [rows]: unknown[] = query(
    "SELECT id, name, status, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, description, preparation_method, salesman_id, salesman_name, created_by, created_at, updated_at FROM quick_formulas WHERE id = ?",
    [id],
  );

  const quickFormulaRows = rows as Record<string, unknown>[];
  if (!quickFormulaRows || quickFormulaRows.length === 0) {
    return null;
  }

  return transformQuickFormula(quickFormulaRows[0]);
}

/** 根据名称+用户查询（唯一性校验） */
export async function findByName(name: string, userId: string) {
  const [rows]: unknown[] = query(
    "SELECT id FROM quick_formulas WHERE name = ? AND created_by = ?",
    [name, userId],
  );

  const quickFormulaRows = rows as Record<string, unknown>[];
  return quickFormulaRows.length > 0 ? rowToCamelCase(quickFormulaRows[0]) : null;
}

/** 创建快速配方 */
export async function create(data: {
  name: string;
  createdBy: string;
  createdByName: string;
}) {
  const id = generateId();
  const currentTime = now();

  query(
    `INSERT INTO quick_formulas (id, name, status, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, description, preparation_method, salesman_id, salesman_name, created_by, created_at, updated_at)
     VALUES (?, ?, 'draft', 0.18, 1.0, 0, '[]', 0, 0, 20, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    [id, data.name.trim(), data.createdBy, currentTime, currentTime],
  );

  const result = await findById(id);
  return result;
}

/** 更新快速配方 */
export async function update(id: string, data: Record<string, unknown>) {
  const setParts: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined && data.name !== null) {
    setParts.push("name = ?");
    params.push(String(data.name).trim());
  }
  if (data.ratioFactor !== undefined && data.ratioFactor !== null) {
    setParts.push("ratio_factor = ?");
    params.push(Number(data.ratioFactor));
  }
  if (data.supplementRatioFactor !== undefined && data.supplementRatioFactor !== null) {
    setParts.push("supplement_ratio_factor = ?");
    params.push(Number(data.supplementRatioFactor));
  }
  if (data.finishedWeight !== undefined && data.finishedWeight !== null) {
    setParts.push("finished_weight = ?");
    params.push(Number(data.finishedWeight));
  }
  if (data.materials !== undefined && data.materials !== null) {
    setParts.push("materials_json = ?");
    params.push(JSON.stringify(data.materials));
  }
  if (data.packagingPrice !== undefined && data.packagingPrice !== null) {
    setParts.push("packaging_price = ?");
    params.push(Number(data.packagingPrice));
  }
  if (data.otherPrice !== undefined && data.otherPrice !== null) {
    setParts.push("other_price = ?");
    params.push(Number(data.otherPrice));
  }
  if (data.profitMargin !== undefined && data.profitMargin !== null) {
    setParts.push("profit_margin = ?");
    params.push(Number(data.profitMargin));
  }
  if (data.description !== undefined && data.description !== null) {
    setParts.push("description = ?");
    params.push(data.description as string | null);
  }
  if (data.preparationMethod !== undefined && data.preparationMethod !== null) {
    setParts.push("preparation_method = ?");
    params.push(data.preparationMethod as string | null);
  }
  if (data.salesmanId !== undefined && data.salesmanId !== null) {
    setParts.push("salesman_id = ?");
    params.push(data.salesmanId as string | null);
  }
  if (data.salesmanName !== undefined && data.salesmanName !== null) {
    setParts.push("salesman_name = ?");
    params.push(data.salesmanName as string | null);
  }

  if (setParts.length === 0) {
    return await findById(id);
  }

  setParts.push("updated_at = ?");
  params.push(now());
  params.push(id);

  query(
    `UPDATE quick_formulas SET ${setParts.join(", ")} WHERE id = ?`,
    params,
  );

  return await findById(id);
}

/** 删除快速配方 */
export async function remove(id: string) {
  query("DELETE FROM quick_formulas WHERE id = ?", [id]);
}

/** 发布快速配方为正式配方 */
export async function publish(
  id: string,
  publishData: {
    salesmanId: string;
    description: string;
    preparationMethod?: string;
  },
  userId: string,
  role: string,
) {
  // 1. 查询快速配方记录
  const [rows]: unknown[] = query(
    "SELECT id, name, status, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, description, preparation_method, salesman_id, salesman_name, created_by FROM quick_formulas WHERE id = ?",
    [id],
  );

  const quickFormulaRows = rows as Record<string, unknown>[];
  if (!quickFormulaRows || quickFormulaRows.length === 0) {
    throw new Error("快速配方不存在");
  }

  const quickFormula = quickFormulaRows[0];

  // 校验状态为 draft
  if (quickFormula.status !== "draft") {
    throw new Error("只有草稿状态的快速配方才能发布");
  }

  // 校验成品重量必须大于 0
  const finishedWeight = Number(quickFormula.finished_weight);
  if (finishedWeight <= 0) {
    throw new Error("成品重量必须大于 0");
  }

  // 校验发布描述不能为空或仅空格
  if (!publishData.description || !publishData.description.trim()) {
    throw new Error("发布描述不能为空");
  }

  // 2. 校验 salesmanId 在 salesmen 表中存在
  const [salesmanRows]: unknown[] = query(
    "SELECT id, name FROM salesmen WHERE id = ?",
    [publishData.salesmanId],
  );

  const salesmen = salesmanRows as Record<string, unknown>[];
  if (!salesmen || salesmen.length === 0) {
    throw new Error("业务员不存在");
  }

  const salesmanName = String(salesmen[0].name);

  // 3. 合并数据
  const name = String(quickFormula.name);
  const code = generateFormulaCode(name);
  const materialsJson = String(quickFormula.materials_json);
  const ratioFactor = Number(quickFormula.ratio_factor);
  const supplementRatioFactor = Number(quickFormula.supplement_ratio_factor);
  const packagingPrice = Number(quickFormula.packaging_price);
  const otherPrice = Number(quickFormula.other_price);
  const profitMargin = Number(quickFormula.profit_margin);
  const description = publishData.description.trim();
  const preparationMethod = publishData.preparationMethod || (quickFormula.preparation_method as string | null);

  // 4. 生成配方编码
  const formulaId = generateId();
  const currentTime = now();

  // 5. INSERT INTO formulas
  query(
    `INSERT INTO formulas (id, code, name, salesman_id, salesman_name, materials_json, finished_weight, ratio_factor, supplement_ratio_factor, packaging_price, other_price, profit_margin, description, preparation_method, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      formulaId,
      code,
      name,
      publishData.salesmanId,
      salesmanName,
      materialsJson,
      finishedWeight,
      ratioFactor,
      supplementRatioFactor,
      packagingPrice,
      otherPrice,
      profitMargin,
      description,
      preparationMethod,
      userId,
      currentTime,
      currentTime,
    ],
  );

  // 6. INSERT INTO formula_versions
  const versionId = generateId();
  const initialStatus = role === "admin" ? "published" : "draft";

  const materials = JSON.parse(materialsJson);

  query(
    `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, snapshot_json, status, is_current, ratio_factor, supplement_ratio_factor, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [
      versionId,
      formulaId,
      "v1.0",
      `从快速配方发布，含${materials.length}种原料`,
      JSON.stringify({
        code,
        name,
        salesmanId: publishData.salesmanId,
        salesmanName,
        materials,
        finishedWeight,
        ratioFactor,
        supplementRatioFactor,
        packagingPrice,
        otherPrice,
        profitMargin,
        description,
        preparationMethod,
        formulaData: {
          code,
          name,
          salesmanId: publishData.salesmanId,
          materials,
          finishedWeight,
          ratioFactor,
          supplementRatioFactor,
          packagingPrice,
          otherPrice,
          profitMargin,
          description,
          preparationMethod,
        },
      }),
      initialStatus,
      ratioFactor,
      supplementRatioFactor,
      userId,
      currentTime,
    ],
  );

  // 7. UPDATE quick_formulas SET status = 'published'
  query(
    "UPDATE quick_formulas SET status = 'published', updated_at = ? WHERE id = ?",
    [currentTime, id],
  );

  // 8. 返回结果
  return {
    formulaId,
    versionId,
    quickFormulaStatus: "published",
  };
}
