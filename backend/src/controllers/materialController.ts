import { Request, Response } from "express";
import { query } from "../config/database-better-sqlite3.js";
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

export async function getMaterials(req: any, res: Response) {
  try {
    const { keyword, page, pageSize, scope } = req.query;
    const kw = Array.isArray(keyword) ? keyword[0] : keyword || "";
    const userId = req.user.userId;
    const userRole = req.user.role;

    const result = await materialService.getMaterialList({
      keyword: kw,
      page: Number(page),
      pageSize: Number(pageSize),
      scope,
      userId,
      userRole,
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
    const result = await materialService.getMaterialDetail(id, (req as any).user?.userId || "");

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
    const { name, code, unit, stock, materialType, unitPrice, dataSource } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    await query(
      `INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, version, is_latest, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
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
      ],
    );

    const [[material]]: any[][] = await query("SELECT * FROM materials WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(material), "原料创建成功"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({ success: false, message: "原料编码已存在" });
      return;
    }
    console.error("[MaterialController] createMaterial Error:", error);
    res.status(500).json({ success: false, message: "创建原料失败", error: error.message });
  }
}

export async function updateMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;
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
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({ success: false, message: "原料编码已存在" });
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

export async function getMaterialStats(req: any, res: Response) {
  try {
    const [[total]]: any[] = await query("SELECT COUNT(*) as count FROM materials WHERE is_deleted = 0 AND is_latest = 1");
    const [[herbCount]]: any[] = await query("SELECT COUNT(*) as count FROM materials WHERE material_type = 'herb' AND is_deleted = 0 AND is_latest = 1");
    const [[supplementCount]]: any[] = await query(
      "SELECT COUNT(*) as count FROM materials WHERE material_type != 'herb' AND is_deleted = 0 AND is_latest = 1",
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