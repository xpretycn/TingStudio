import { Request, Response } from "express";
import { query, transaction } from "../config/database-better-sqlite3.js";
import {
  generateId,
  generateMaterialCode,
  now,
  success,
  successWithPagination,
  rowToCamelCase,
  rowsToCamelCase,
} from "../utils/helpers.js";
import * as materialService from "../services/materialService.js";
import * as materialReviewService from "../services/materialReviewService.js";

export async function getMaterials(req: any, res: Response) {
  try {
    const { keyword, page, pageSize, status, scope } = req.query;
    const kw = Array.isArray(keyword) ? keyword[0] : keyword || "";
    const userId = req.user.userId;
    const userRole = req.user.role;

    const result = await materialService.getMaterialList({
      keyword: kw,
      page: Number(page),
      pageSize: Number(pageSize),
      userId,
      userRole,
      status: status ? String(status) : undefined,
      scope: scope ? String(scope) : undefined,
    });

    res.json({
      success: true,
      message: "查询成功",
      data: result,
    });
  } catch (error: any) {
    console.error("[MaterialController] getMaterials Error:", error);
    res.status(500).json({ success: false, message: "获取原料列表失败", error: error.message });
  }
}

export async function getMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId || "";
    const userRole = (req as any).user?.role || "formulist";
    const result = await materialService.getMaterialDetail(id, userId, userRole);

    if (!result) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }

    res.json(success(result));
  } catch (error: any) {
    console.error("[MaterialController] getMaterial Error:", error);
    res.status(500).json({ success: false, message: "获取原料失败", error: error.message });
  }
}

export async function getNextCode(req: any, res: Response) {
  try {
    const { name } = req.query;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "请提供原料名称" });
    }
    const baseCode = generateMaterialCode(name.trim());
    if (!baseCode) {
      return res.status(500).json({ success: false, message: "无法生成编码" });
    }
    let code = baseCode;
    let suffix = 2;
    while (true) {
      const [existing]: any[] = await query("SELECT id FROM materials WHERE code = ? AND is_deleted = 0", [code]);
      if (!existing || existing.length === 0) break;
      code = baseCode + suffix;
      suffix++;
    }
    res.json(success({ code }));
  } catch (error: any) {
    console.error("[MaterialController] getNextCode Error:", error);
    res.status(500).json({ success: false, message: "获取编码失败", error: error.message });
  }
}

export async function createMaterial(req: any, res: Response) {
  try {
    const { name, code, unit, stock, materialType, unitPrice, dataSource, appearance, taste, efficacy } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    // 检查编码唯一性（同一 code 在未删除的原料中不应重复）
    const [existingCodes]: any[][] = await query(
      "SELECT id FROM materials WHERE code = ? AND is_deleted = 0",
      [code],
    );
    if (existingCodes && existingCodes.length > 0) {
      res.status(409).json({
        success: false,
        error: { message: "原料编码已存在", code: "DUPLICATE_ENTRY" },
      });
      return;
    }

    await query(
      `INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, version, is_latest, status, created_at, appearance_json, taste_json, efficacy_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'draft', ?, ?, ?, ?)`,
      [
        id,
        name,
        code,
        unit || "g",
        stock || 0,
        materialType || "herb",
        unitPrice ?? null,
        dataSource || "manual",
        userId,
        now(),
        Array.isArray(appearance) ? JSON.stringify(appearance) : null,
        Array.isArray(taste) ? JSON.stringify(taste) : null,
        Array.isArray(efficacy) ? JSON.stringify(efficacy) : null,
      ],
    );

    const [[material]]: any[][] = await query("SELECT * FROM materials WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(material), "原料创建成功，当前为草稿状态"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({ success: false, message: "原料编码已存在，请使用其他编码" });
      return;
    }
    console.error("[MaterialController] createMaterial Error:", error);
    res.status(500).json({ success: false, message: "创建原料失败", error: error.message });
  }
}

export async function updateMaterial(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const user = (req as any).user;
    const body = req.body;

    const current = await materialService.getLatestVersion(id);
    if (!current) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }

    if (!materialService.canEdit(user, current)) {
      res.status(403).json({
        success: false,
        error: { message: "您没有权限编辑此原料", code: "FORBIDDEN" },
      });
      return;
    }

    if (current.status === "pending_review") {
      res.status(400).json({
        success: false,
        error: { message: "待审批状态的原料不可编辑，请等待审批结果", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const updated = await materialService.updateMaterial(id, body);

    if (!updated) {
      res.status(500).json({ success: false, message: "更新失败" });
      return;
    }

    const refInfo = await materialService.checkReference(id);

    if (refInfo.referenced && updated.id !== id) {
      res.json(success({
        id: updated.id,
        version: updated.version,
        isLatest: updated.is_latest,
        previousVersionId: id,
        versionAction: "created",
      }, `原料版本已升级至 v${updated.version}，旧版本 v${current.version} 已存档`));
    } else {
      res.json(success({
        id: updated.id,
        version: updated.version,
        isLatest: updated.is_latest,
        versionAction: "updated",
      }, "原料更新成功"));
    }
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed") && error.message?.includes("materials.code")) {
      try {
        const refInfo = await materialService.checkReference(id);
        if (!refInfo.referenced) {
          res.status(409).json({ success: false, message: "原料编码已存在" });
          return;
        }
      } catch {
        // checkReference 失败时仍返回 409
      }
      res.status(409).json({ success: false, message: "原料编码冲突，请重启服务器以完成数据库升级" });
      return;
    }
    console.error("[MaterialController] updateMaterial Error:", error);
    res.status(500).json({ success: false, message: "更新原料失败", error: error.message });
  }
}

export async function deleteMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!materialService.canDelete(user)) {
      res.status(403).json({
        success: false,
        error: { message: "仅管理员可删除原料", code: "FORBIDDEN" },
      });
      return;
    }

    const refInfo = await materialService.checkReference(id);
    if (refInfo.referenced) {
      res.status(400).json({
        success: false,
        error: {
          message: `该原料正在被 ${refInfo.count} 个配方引用，无法删除`,
          code: "VALIDATION_ERROR",
        },
      });
      return;
    }

    const deleted = await materialService.softDeleteMaterial(id);
    if (deleted) {
      res.json(success(null, "原料已删除"));
    } else {
      res.status(500).json({ success: false, message: "删除失败" });
    }
  } catch (error: any) {
    console.error("[MaterialController] deleteMaterial Error:", error);
    res.status(500).json({ success: false, message: "删除原料失败", error: error.message });
  }
}

export async function getMaterialVersions(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await materialService.getMaterialVersions(id);
    if (!result) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }

    res.json(success(result));
  } catch (error: any) {
    console.error("[MaterialController] getMaterialVersions Error:", error);
    res.status(500).json({ success: false, message: "获取版本历史失败", error: error.message });
  }
}

export async function getMaterialVersion(req: Request, res: Response) {
  try {
    const { id, versionId } = req.params;

    const result = await materialService.getVersionDetail(id, versionId);
    if (!result) {
      res.status(404).json({ success: false, message: "版本不存在" });
      return;
    }

    res.json(success(result));
  } catch (error: any) {
    console.error("[MaterialController] getMaterialVersion Error:", error);
    res.status(500).json({ success: false, message: "获取版本详情失败", error: error.message });
  }
}

export async function getMaterialReferences(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const current = await materialService.getLatestVersion(id);
    if (!current) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }

    const refInfo = await materialService.checkReference(id);

    res.json(success({
      materialId: id,
      currentVersion: current.version,
      referenceCount: refInfo.count,
      referencedFormulas: refInfo.formulas.map((f) => ({
        formulaId: f.id,
        formulaName: f.name,
      })),
    }));
  } catch (error: any) {
    console.error("[MaterialController] getMaterialReferences Error:", error);
    res.status(500).json({ success: false, message: "获取引用信息失败", error: error.message });
  }
}

export async function compareMaterialVersions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;

    if (!v1 || !v2) {
      res.status(400).json({
        success: false,
        error: { message: "请提供对比版本 ID（v1, v2）", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const result = await materialService.compareVersions(id, v1, v2);
    if (!result) {
      res.status(404).json({ success: false, message: "版本不存在" });
      return;
    }

    res.json(success(result));
  } catch (error: any) {
    console.error("[MaterialController] compareMaterialVersions Error:", error);
    res.status(500).json({ success: false, message: "版本对比失败", error: error.message });
  }
}

export async function getMaterialStats(req: any, res: Response) {
  try {
    // 配方师拥有所有原料的查看权：stats 统计全量
    const [[total]]: any[] = await query(
      `SELECT COUNT(*) as count FROM materials WHERE is_deleted = 0 AND is_latest = 1`,
    );
    const [[herbCount]]: any[] = await query(
      `SELECT COUNT(*) as count FROM materials WHERE material_type = 'herb' AND is_deleted = 0 AND is_latest = 1`,
    );
    const [[supplementCount]]: any[] = await query(
      `SELECT COUNT(*) as count FROM materials WHERE material_type != 'herb' AND is_deleted = 0 AND is_latest = 1`,
    );
    const [[nutritionCount]]: any[] = await query(
      "SELECT COUNT(DISTINCT material_id) as count FROM material_nutrition WHERE is_latest = 1",
    );
    res.json(
      success({
        total: total.count,
        herbCount: herbCount.count,
        supplementCount: supplementCount.count,
        nutritionCount: nutritionCount.count,
      }),
    );
  } catch (error: any) {
    console.error("[MaterialController] getMaterialStats Error:", error);
    res.status(500).json({ success: false, message: "获取统计数据失败", error: error.message });
  }
}

export async function submitMaterialReview(req: any, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;

    const current = await materialService.getLatestVersion(id);
    if (!current) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    if (current.status !== "draft") {
      res.status(400).json({
        success: false,
        error: { message: "仅草稿状态的原料可提交审批", code: "VALIDATION_ERROR" },
      });
      return;
    }

    if (user.role !== "admin" && current.created_by !== user.userId) {
      res.status(403).json({
        success: false,
        error: { message: "仅创建者或管理员可提交审批", code: "FORBIDDEN" },
      });
      return;
    }

    transaction(() => {
      query("UPDATE materials SET status = 'pending_review', updated_at = ? WHERE id = ?", [now(), id]);
    });
    try {
      await materialReviewService.createReviewLog({
        materialId: id,
        reviewerId: user.userId,
        action: "submit",
      });
    } catch (logError) {
      console.error("[MaterialController] 提交审批日志写入失败:", logError);
    }

    res.json(success(null, "原料已提交审批"));
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: "提交审批失败", code: "INTERNAL_ERROR" } });
  }
}

export async function approveMaterial(req: any, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { message: "仅管理员可审批原料", code: "FORBIDDEN" },
      });
      return;
    }

    const current = await materialService.getLatestVersion(id);
    if (!current) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    if (current.status !== "pending_review") {
      res.status(400).json({
        success: false,
        error: { message: "仅待审批状态的原料可审批", code: "VALIDATION_ERROR" },
      });
      return;
    }

    transaction(() => {
      query("UPDATE materials SET status = 'published', updated_at = ? WHERE id = ?", [now(), id]);
    });
    try {
      await materialReviewService.createReviewLog({
        materialId: id,
        reviewerId: user.userId,
        action: "approve",
      });
    } catch (logError) {
      console.error("[MaterialController] 审批日志写入失败:", logError);
    }

    res.json(success(null, "原料已审批通过并发布"));
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: "审批操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function rejectMaterial(req: any, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { comment } = req.body || {};

    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { message: "仅管理员可驳回原料", code: "FORBIDDEN" },
      });
      return;
    }

    if (!comment || comment.trim().length < 5) {
      res.status(400).json({
        success: false,
        error: { message: "驳回原因至少5个字符", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const current = await materialService.getLatestVersion(id);
    if (!current) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    if (current.status !== "pending_review") {
      res.status(400).json({
        success: false,
        error: { message: "仅待审批状态的原料可驳回", code: "VALIDATION_ERROR" },
      });
      return;
    }

    transaction(() => {
      query("UPDATE materials SET status = 'draft', updated_at = ? WHERE id = ?", [now(), id]);
    });
    try {
      await materialReviewService.createReviewLog({
        materialId: id,
        reviewerId: user.userId,
        action: "reject",
        comment,
      });
    } catch (logError) {
      console.error("[MaterialController] 驳回日志写入失败:", logError);
    }

    res.json(success(null, "原料已驳回"));
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: "驳回操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function publishMaterial(req: any, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { message: "仅管理员可直接发布原料", code: "FORBIDDEN" },
      });
      return;
    }

    const current = await materialService.getLatestVersion(id);
    if (!current) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    if (current.status !== "draft" && current.status !== "pending_review") {
      res.status(400).json({
        success: false,
        error: { message: "仅草稿或待审批状态的原料可发布", code: "VALIDATION_ERROR" },
      });
      return;
    }

    transaction(() => {
      query("UPDATE materials SET status = 'published', updated_at = ? WHERE id = ?", [now(), id]);
    });
    try {
      await materialReviewService.createReviewLog({
        materialId: id,
        reviewerId: user.userId,
        action: "publish",
      });
    } catch (logError) {
      console.error("[MaterialController] 发布日志写入失败:", logError);
    }

    res.json(success(null, "原料已发布"));
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: "发布操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function getMaterialPendingReviews(req: any, res: Response) {
  try {
    if (req.user.role !== "admin") {
      res.json(
        successWithPagination(
          [],
          0,
          Number(req.query.page) || 1,
          Number(req.query.pageSize) || 20,
        ),
      );
      return;
    }

    const { keyword, page, pageSize } = req.query;
    const kw = Array.isArray(keyword) ? keyword[0] : keyword || "";

    const result = await materialReviewService.getPendingReviewList({
      keyword: kw,
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.json(successWithPagination(result.list, result.pagination.total, result.pagination.page, result.pagination.pageSize));
  } catch (error: any) {
    console.error("[MaterialController] getMaterialPendingReviews Error:", error);
    res.status(500).json({ success: false, error: { message: "获取待审批列表失败", code: "INTERNAL_ERROR" } });
  }
}

export async function getMaterialReviewLogs(req: any, res: Response) {
  try {
    const { id } = req.params;

    const logs = await materialReviewService.getReviewLogs(id);
    res.json(success(logs));
  } catch (error: any) {
    console.error("[MaterialController] getMaterialReviewLogs Error:", error);
    res.status(500).json({ success: false, error: { message: "获取审批日志失败", code: "INTERNAL_ERROR" } });
  }
}

export async function getMyMaterialCounts(req: any, res: Response) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const counts = await materialService.getMyMaterialStatusCounts(userId);
    res.json(success(counts));
  } catch (error: any) {
    console.error("[MaterialController] getMyMaterialCounts Error:", error);
    res.status(500).json({ success: false, error: { message: error.message || "获取原料状态计数失败", code: "INTERNAL_ERROR" } });
  }
}