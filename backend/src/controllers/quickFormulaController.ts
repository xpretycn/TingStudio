// 快速配方控制器
import { Response } from "express";
import { success, successWithPagination } from "../utils/helpers.js";
import { AuthRequest } from "../middleware/auth.js";
import * as quickFormulaService from "../services/quickFormulaService.js";

/** 获取快速配方列表 */
export async function getQuickFormulas(req: AuthRequest, res: Response) {
  try {
    const { keyword, page, pageSize } = req.query as Record<string, string | undefined>;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    const result = await quickFormulaService.findAll(
      userId,
      userRole,
      keyword,
      Number(page),
      Number(pageSize),
    );

    res.json(
      successWithPagination(result.list, result.pagination.total, result.pagination.page, result.pagination.pageSize),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取快速配方列表失败";
    console.error("[QuickFormula] Error:", message);
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 获取快速配方详情 */
export async function getQuickFormulaById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    const quickFormula = await quickFormulaService.findById(id);

    if (!quickFormula) {
      res.status(404).json({
        success: false,
        error: { message: "快速配方不存在", code: "NOT_FOUND", timestamp: new Date().toISOString() },
      });
      return;
    }

    // formulist 只能查看自己创建的快速配方
    if (userRole !== "admin" && quickFormula.createdBy !== userId) {
      res.status(403).json({
        success: false,
        error: { message: "无权查看该快速配方", code: "FORBIDDEN", timestamp: new Date().toISOString() },
      });
      return;
    }

    res.json(success(quickFormula));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取快速配方详情失败";
    console.error("[QuickFormula] Error:", message);
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 创建快速配方 */
export async function createQuickFormula(req: AuthRequest, res: Response) {
  try {
    const { name } = req.body as Record<string, unknown>;
    const userId = req.user?.userId ?? "";

    // 校验名称唯一性
    const existing = await quickFormulaService.findByName(String(name).trim(), userId);
    if (existing) {
      res.status(409).json({
        success: false,
        error: { message: "快速配方名称已存在", code: "DUPLICATE_ENTRY", timestamp: new Date().toISOString() },
      });
      return;
    }

    const quickFormula = await quickFormulaService.create({
      name: String(name).trim(),
      createdBy: userId,
      createdByName: "",
    });

    res.status(201).json(success(quickFormula, "快速配方创建成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "创建快速配方失败";
    console.error("[QuickFormula] Error:", message);
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 更新快速配方 */
export async function updateQuickFormula(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    // 查询现有记录
    const existing = await quickFormulaService.findById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { message: "快速配方不存在", code: "NOT_FOUND", timestamp: new Date().toISOString() },
      });
      return;
    }

    // formulist 只能修改自己创建的快速配方
    if (userRole !== "admin" && existing.createdBy !== userId) {
      res.status(403).json({
        success: false,
        error: { message: "无权修改该快速配方", code: "FORBIDDEN", timestamp: new Date().toISOString() },
      });
      return;
    }

    // 仅 draft 状态可更新
    if (existing.status !== "draft") {
      res.status(400).json({
        success: false,
        error: { message: "只有草稿状态的快速配方才能修改", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // 如果修改了名称，检查新名称是否重复
    if (body.name !== undefined && String(body.name).trim() !== existing.name) {
      const duplicate = await quickFormulaService.findByName(String(body.name).trim(), existing.createdBy as string);
      if (duplicate) {
        res.status(409).json({
          success: false,
          error: { message: "快速配方名称已存在", code: "DUPLICATE_ENTRY", timestamp: new Date().toISOString() },
        });
        return;
      }
    }

    const updated = await quickFormulaService.update(id, body);
    res.json(success(updated, "快速配方更新成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "更新快速配方失败";
    console.error("[QuickFormula] Error:", message);
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 删除快速配方 */
export async function deleteQuickFormula(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    const existing = await quickFormulaService.findById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { message: "快速配方不存在", code: "NOT_FOUND", timestamp: new Date().toISOString() },
      });
      return;
    }

    // formulist 只能删除自己创建的快速配方
    if (userRole !== "admin" && existing.createdBy !== userId) {
      res.status(403).json({
        success: false,
        error: { message: "无权删除该快速配方", code: "FORBIDDEN", timestamp: new Date().toISOString() },
      });
      return;
    }

    await quickFormulaService.remove(id);
    res.json(success(null, "快速配方删除成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "删除快速配方失败";
    console.error("[QuickFormula] Error:", message);
    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

/** 发布快速配方为正式配方 */
export async function publishQuickFormula(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? "";
    const userRole = req.user?.role ?? "";

    // 查询现有记录
    const existing = await quickFormulaService.findById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { message: "快速配方不存在", code: "NOT_FOUND", timestamp: new Date().toISOString() },
      });
      return;
    }

    // formulist 只能发布自己创建的快速配方
    if (userRole !== "admin" && existing.createdBy !== userId) {
      res.status(403).json({
        success: false,
        error: { message: "无权发布该快速配方", code: "FORBIDDEN", timestamp: new Date().toISOString() },
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const { salesmanId, description, preparationMethod } = body;

    const result = await quickFormulaService.publish(
      id,
      {
        salesmanId: String(salesmanId),
        description: String(description),
        preparationMethod: preparationMethod ? String(preparationMethod) : undefined,
      },
      userId,
      userRole,
    );

    res.json(success(result, "快速配方发布成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "发布快速配方失败";
    console.error("[QuickFormula] Error:", message);

    // 已知业务错误
    if (
      message.includes("不存在") ||
      message.includes("草稿状态")
    ) {
      res.status(400).json({
        success: false,
        error: { message, code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message, code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}
