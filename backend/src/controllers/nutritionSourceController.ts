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
import { SeedDataAdapter } from "../services/externalNutrition/adapters/NutritionAdapters.js";
import { success, fail } from "../utils/helpers.js";

type AuthRequest = Request & { user: { userId: string; role: string } };

export async function getSources(req: Request, res: Response) {
  try {
    const { materialId } = req.params;
    const includeInactive = req.query.includeInactive === "true";
    const data = await getNutritionSources(materialId, includeInactive);
    res.json(success(data));
  } catch (error: unknown) {
    res.status(500).json(fail("获取来源数据失败"));
  }
}

export async function addSource(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const { sourceType, per100g, sourceDetail, confidence, matchScore, notes } = req.body;
    const result = await addNutritionSource(materialId, sourceType, per100g, sourceDetail, confidence, matchScore, notes, req.user.userId);
    if (!result.success) {
      res.status(400).json(fail(result.message, "VALIDATION_ERROR"));
      return;
    }
    res.status(201).json(success({ sourceId: result.sourceId, materialId, sourceType, sourceDetail, confidence, matchScore, createdAt: new Date().toISOString() }));
  } catch (error: unknown) {
    res.status(500).json(fail("添加来源数据失败"));
  }
}

export async function getSourcesCompare(req: Request, res: Response) {
  try {
    const { materialId } = req.params;
    const data = await getNutritionSourcesCompare(materialId);
    res.json(success(data));
  } catch (error: unknown) {
    res.status(500).json(fail("获取来源对比失败"));
  }
}

export async function updateSource(req: AuthRequest, res: Response) {
  try {
    const { materialId, sourceId } = req.params;
    const { sourceDetail, confidence, notes } = req.body;
    const result = await updateNutritionSource(materialId, sourceId, sourceDetail, confidence, notes);
    if (!result.success) {
      res.status(400).json(fail(result.message, "VALIDATION_ERROR"));
      return;
    }
    res.json(success(null, "来源数据已更新"));
  } catch (error: unknown) {
    res.status(500).json(fail("更新来源数据失败"));
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
      res.status(400).json(fail(result.message, "VALIDATION_ERROR"));
      return;
    }
    res.json(success(null, "来源数据已删除"));
  } catch (error: unknown) {
    res.status(500).json(fail("删除来源数据失败"));
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
      res.status(400).json(fail(result.message, "VALIDATION_ERROR"));
      return;
    }
    res.json(success({
      materialId,
      updatedFields: result.updatedFields,
      sourceType: result.sourceType,
      fieldSources: result.fieldSources,
    }, "权威数据已更新"));
  } catch (error: unknown) {
    res.status(500).json(fail("设定权威数据失败"));
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
      res.status(404).json(fail("原料不存在", "NOT_FOUND"));
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
    res.status(500).json(fail("获取外部营养数据失败"));
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
    res.status(500).json(fail("批量补全失败"));
  }
}

const seedAdapter = new SeedDataAdapter();

export async function checkSeedAvailability(req: Request, res: Response) {
  try {
    const name = (req.query.name as string | undefined)?.trim();
    if (!name || name.length < 2) {
      res.json(success({ found: false, matchScore: 0 }));
      return;
    }
    const result = await seedAdapter.search(name);
    if (result) {
      res.json(success({ found: true, matchScore: result.matchScore, confidence: result.confidence }));
    } else {
      res.json(success({ found: false, matchScore: 0 }));
    }
  } catch (error: unknown) {
    res.json(success({ found: false, matchScore: 0 }));
  }
}

export async function searchSeedByName(req: Request, res: Response) {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      res.json(success({ results: [] }));
      return;
    }
    const result = await seedAdapter.search(name.trim());
    if (result) {
      res.json(success({
        results: [{
          sourceType: "seed",
          sourceId: "",
          found: true,
          matchScore: result.matchScore,
          confidence: result.confidence,
          sourceDetail: result.dataSource || null,
          per100g: result.per100g,
        }],
      }));
    } else {
      res.json(success({ results: [] }));
    }
  } catch (error: unknown) {
    res.json(success({ results: [] }));
  }
}
