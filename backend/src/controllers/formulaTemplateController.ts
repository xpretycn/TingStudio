// 配方模板控制器
import { Response } from "express";
import { query } from "../config/database.js";
import {
  generateId,
  now,
  success,
  successWithPagination,
  buildPagination,
  buildLike,
  rowToCamelCase,
  rowsToCamelCase,
} from "../utils/helpers.js";
import { AuthRequest } from "../middleware/auth.js";

/** 获取模板列表（支持关键词搜索和分页，admin 见全部，formulist 仅见自己） */
export async function getTemplates(req: AuthRequest, res: Response) {
  try {
    const { keyword, page, pageSize } = req.query as Record<string, string | undefined>;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    const whereParts: string[] = [];
    const params: unknown[] = [];

    // formulist 只能看自己创建的模板
    if (userRole !== "admin") {
      whereParts.push("created_by = ?");
      params.push(userId);
    }

    if (keyword) {
      whereParts.push("name LIKE ?");
      params.push(buildLike(keyword));
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [list]: unknown[] = await query(
      `SELECT id, name, description, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, created_by, created_at, updated_at FROM formula_templates ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );

    const [countResult]: unknown[] = await query(
      `SELECT COUNT(*) as total FROM formula_templates ${whereSql}`,
      params,
    );

    const countRows = countResult as Record<string, unknown>[];
    const total = countRows.length > 0 ? Number(countRows[0].total) : 0;

    res.json(successWithPagination(rowsToCamelCase(list as Record<string, unknown>[]), total, p, size));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取模板列表失败";
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 获取单个模板详情 */
export async function getTemplateById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    const [rows]: unknown[] = await query(
      "SELECT id, name, description, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, created_by, created_at, updated_at FROM formula_templates WHERE id = ?",
      [id],
    );

    const templateRows = rows as Record<string, unknown>[];
    if (!templateRows || templateRows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: "模板不存在", code: "NOT_FOUND", timestamp: new Date().toISOString() },
      });
      return;
    }

    const template = templateRows[0];

    // formulist 只能查看自己创建的模板
    if (userRole !== "admin" && template.created_by !== userId) {
      res.status(403).json({
        success: false,
        error: { message: "无权查看该模板", code: "FORBIDDEN", timestamp: new Date().toISOString() },
      });
      return;
    }

    res.json(success(rowToCamelCase(template)));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取模板详情失败";
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 创建模板 */
export async function createTemplate(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      description,
      ratioFactor,
      supplementRatioFactor,
      finishedWeight,
      materials,
      packagingPrice,
      otherPrice,
      profitMargin,
    } = req.body as Record<string, unknown>;

    const userId = req.user?.userId ?? "";

    // 校验：名称不能为空
    if (!name || String(name).trim() === "") {
      res.status(400).json({
        success: false,
        error: { message: "模板名称不能为空", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：ratioFactor 范围 0.15-0.25
    const rFactor = Number(ratioFactor ?? 0.18);
    if (rFactor < 0.15 || rFactor > 0.25) {
      res.status(400).json({
        success: false,
        error: { message: "主料含量比系数范围为0.15-0.25", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：supplementRatioFactor 范围 0.5-1.5
    const sFactor = Number(supplementRatioFactor ?? 1.0);
    if (sFactor < 0.5 || sFactor > 1.5) {
      res.status(400).json({
        success: false,
        error: { message: "辅料含量比系数范围为0.5-1.5", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：finishedWeight > 0
    const fWeight = Number(finishedWeight ?? 0);
    if (fWeight <= 0) {
      res.status(400).json({
        success: false,
        error: { message: "成品重量必须大于0", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：materials 不能为空数组
    if (!Array.isArray(materials) || materials.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: "原料列表不能为空", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：同一用户下模板名称不能重复
    const [existing]: unknown[] = await query(
      "SELECT id FROM formula_templates WHERE name = ? AND created_by = ?",
      [String(name).trim(), userId],
    );
    if ((existing as Record<string, unknown>[]).length > 0) {
      res.status(409).json({
        success: false,
        error: { message: "模板名称已存在", code: "DUPLICATE_ENTRY", timestamp: new Date().toISOString() },
      });
      return;
    }

    const id = generateId();
    const currentTime = now();

    await query(
      `INSERT INTO formula_templates (id, name, description, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(name).trim(),
        description ?? null,
        rFactor,
        sFactor,
        fWeight,
        JSON.stringify(materials),
        Number(packagingPrice ?? 0),
        Number(otherPrice ?? 0),
        Number(profitMargin ?? 20),
        userId,
        currentTime,
        currentTime,
      ],
    );

    const [newRows]: unknown[] = await query(
      "SELECT id, name, description, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, created_by, created_at, updated_at FROM formula_templates WHERE id = ?",
      [id],
    );

    res.status(201).json(success(rowToCamelCase((newRows as Record<string, unknown>[])[0]), "模板创建成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "创建模板失败";
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 更新模板 */
export async function updateTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    // 查询现有模板
    const [rows]: unknown[] = await query(
      "SELECT id, name, description, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, created_by FROM formula_templates WHERE id = ?",
      [id],
    );

    const templateRows = rows as Record<string, unknown>[];
    if (!templateRows || templateRows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: "模板不存在", code: "NOT_FOUND", timestamp: new Date().toISOString() },
      });
      return;
    }

    const existing = templateRows[0];

    // formulist 只能修改自己创建的模板
    if (userRole !== "admin" && existing.created_by !== userId) {
      res.status(403).json({
        success: false,
        error: { message: "无权修改该模板", code: "FORBIDDEN", timestamp: new Date().toISOString() },
      });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // 合并字段：有传值用新值，没传用旧值
    const newName = body.name !== undefined ? String(body.name).trim() : (existing.name as string);
    const newDescription = body.description !== undefined ? body.description : existing.description;
    const newRatioFactor = body.ratioFactor !== undefined ? Number(body.ratioFactor) : Number(existing.ratio_factor);
    const newSupplementRatioFactor = body.supplementRatioFactor !== undefined ? Number(body.supplementRatioFactor) : Number(existing.supplement_ratio_factor);
    const newFinishedWeight = body.finishedWeight !== undefined ? Number(body.finishedWeight) : Number(existing.finished_weight);
    const newMaterialsJson = body.materials !== undefined ? JSON.stringify(body.materials) : (existing.materials_json as string);
    const newPackagingPrice = body.packagingPrice !== undefined ? Number(body.packagingPrice) : Number(existing.packaging_price);
    const newOtherPrice = body.otherPrice !== undefined ? Number(body.otherPrice) : Number(existing.other_price);
    const newProfitMargin = body.profitMargin !== undefined ? Number(body.profitMargin) : Number(existing.profit_margin);

    // 校验：名称不能为空
    if (!newName || newName.trim() === "") {
      res.status(400).json({
        success: false,
        error: { message: "模板名称不能为空", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：ratioFactor 范围
    if (newRatioFactor < 0.15 || newRatioFactor > 0.25) {
      res.status(400).json({
        success: false,
        error: { message: "主料含量比系数范围为0.15-0.25", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：supplementRatioFactor 范围
    if (newSupplementRatioFactor < 0.5 || newSupplementRatioFactor > 1.5) {
      res.status(400).json({
        success: false,
        error: { message: "辅料含量比系数范围为0.5-1.5", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 校验：如果修改了名称，检查新名称是否重复
    if (body.name !== undefined && newName !== existing.name) {
      const [dupRows]: unknown[] = await query(
        "SELECT id FROM formula_templates WHERE name = ? AND created_by = ? AND id != ?",
        [newName, existing.created_by, id],
      );
      if ((dupRows as Record<string, unknown>[]).length > 0) {
        res.status(409).json({
          success: false,
          error: { message: "模板名称已存在", code: "DUPLICATE_ENTRY", timestamp: new Date().toISOString() },
        });
        return;
      }
    }

    await query(
      `UPDATE formula_templates SET name = ?, description = ?, ratio_factor = ?, supplement_ratio_factor = ?, finished_weight = ?, materials_json = ?, packaging_price = ?, other_price = ?, profit_margin = ?, updated_at = ? WHERE id = ?`,
      [
        newName,
        newDescription,
        newRatioFactor,
        newSupplementRatioFactor,
        newFinishedWeight,
        newMaterialsJson,
        newPackagingPrice,
        newOtherPrice,
        newProfitMargin,
        now(),
        id,
      ],
    );

    const [updatedRows]: unknown[] = await query(
      "SELECT id, name, description, ratio_factor, supplement_ratio_factor, finished_weight, materials_json, packaging_price, other_price, profit_margin, created_by, created_at, updated_at FROM formula_templates WHERE id = ?",
      [id],
    );

    res.json(success(rowToCamelCase((updatedRows as Record<string, unknown>[])[0]), "模板更新成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "更新模板失败";
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 删除模板 */
export async function deleteTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    const [rows]: unknown[] = await query(
      "SELECT id, created_by FROM formula_templates WHERE id = ?",
      [id],
    );

    const templateRows = rows as Record<string, unknown>[];
    if (!templateRows || templateRows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: "模板不存在", code: "NOT_FOUND", timestamp: new Date().toISOString() },
      });
      return;
    }

    const template = templateRows[0];

    // formulist 只能删除自己创建的模板
    if (userRole !== "admin" && template.created_by !== userId) {
      res.status(403).json({
        success: false,
        error: { message: "无权删除该模板", code: "FORBIDDEN", timestamp: new Date().toISOString() },
      });
      return;
    }

    await query("DELETE FROM formula_templates WHERE id = ?", [id]);
    res.json(success(null, "模板删除成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "删除模板失败";
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}
