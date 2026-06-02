import { Request, Response } from "express";
import {
  addNutritionSource,
  getNutritionSources,
  getNutritionSourcesCompare,
  updateNutritionSource,
  softDeleteNutritionSource,
  setAuthoritativeFromSources,
} from "../services/nutritionSourceService.js";
import { enrichMaterialNutrition, bulkEnrichNutrition } from "../services/externalNutrition/AggregateNutritionService.js";
import { success } from "../utils/helpers.js";

type AuthRequest = Request & { user: { userId: string; role: string } };

export async function getSources(req: Request, res: Response) {
  try {
    const { materialId } = req.params;
    const includeInactive = req.query.includeInactive === "true";
    const data = await getNutritionSources(materialId, includeInactive);
    res.json(success(data));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "获取来源数据失败", error: msg });
  }
}

export async function addSource(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const { sourceType, per100g, sourceDetail, confidence, matchScore, notes } = req.body;
    const result = await addNutritionSource(materialId, sourceType, per100g, sourceDetail, confidence, matchScore, notes, req.user.userId);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.json(success({ sourceId: result.sourceId, materialId, sourceType, sourceDetail, confidence, matchScore, createdAt: new Date().toISOString() }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "添加来源数据失败", error: msg });
  }
}

export async function getSourcesCompare(req: Request, res: Response) {
  try {
    const { materialId } = req.params;
    const data = await getNutritionSourcesCompare(materialId);
    res.json(success(data));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "获取来源对比失败", error: msg });
  }
}

export async function updateSource(req: AuthRequest, res: Response) {
  try {
    const { materialId, sourceId } = req.params;
    const { sourceDetail, confidence, notes } = req.body;
    const result = await updateNutritionSource(materialId, sourceId, sourceDetail, confidence, notes);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.json(success(null, "来源数据已更新"));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "更新来源数据失败", error: msg });
  }
}

export async function deleteSource(req: AuthRequest, res: Response) {
  try {
    const { materialId, sourceId } = req.params;
    if (req.user.role !== "admin") {
      res.json(success(null, "非管理员，跳过删除操作"));
      return;
    }
    const result = await softDeleteNutritionSource(sourceId, materialId);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.json(success(null, "来源数据已删除"));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "删除来源数据失败", error: msg });
  }
}

export async function setAuthoritative(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const { fieldSelections } = req.body;
    if (req.user.role !== "admin") {
      res.json(success(null, "非管理员，跳过设定操作"));
      return;
    }
    const result = await setAuthoritativeFromSources(materialId, fieldSelections, req.user.userId);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.json(success({
      materialId,
      updatedFields: result.updatedFields,
      sourceType: result.sourceType,
      fieldSources: result.fieldSources,
    }, "权威数据已更新"));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "设定权威数据失败", error: msg });
  }
}

function isSmartFetchAllowed(): boolean {
  if (process.env.EXTERNAL_NUTRITION_ENABLED === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export async function enrichNutrition(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    if (!isSmartFetchAllowed()) {
      res.status(503).json({ success: false, message: "外部营养数据功能未启用" });
      return;
    }
    const { sources } = req.body || {};
    const material = (await (await import("../config/database-adapter.js")).query("SELECT id, name FROM materials WHERE id = ?", [materialId])).rows[0] as Record<string, unknown> | undefined;
    if (!material) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }
    const result = await enrichMaterialNutrition(materialId, material.name as string, req.user.userId, sources);
    res.json(success({
      materialId,
      materialName: material.name,
      results: result.results,
      summary: result.summary,
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "获取外部营养数据失败", error: msg });
  }
}

export async function bulkEnrichNutritionHandler(req: AuthRequest, res: Response) {
  try {
    if (req.user.role !== "admin") {
      res.json(success({ successCount: 0, failedCount: 0 }, "非管理员，跳过批量补全操作"));
      return;
    }
    if (!isSmartFetchAllowed()) {
      res.status(503).json({ success: false, message: "外部营养数据功能未启用" });
      return;
    }
    const { materialIds, sources, overwriteExisting } = req.body || {};
    const result = await bulkEnrichNutrition(materialIds || [], req.user.userId, sources, overwriteExisting);
    res.json(success(result));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: "批量补全失败", error: msg });
  }
}
