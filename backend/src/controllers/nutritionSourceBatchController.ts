import { Response } from "express";
import { query } from "../config/database-adapter.js";
import { success } from "../utils/helpers.js";
import { safeJsonParse } from "../utils/helpers.js";
import { normalizePer100g } from "../utils/nutritionHelpers.js";
import { NUTRIENT_FIELDS } from "../config/nutritionConstants.js";
import { recommendByStrategy, scoreSources, type SourceScoreInput } from "../services/nutritionSourceScorer.js";
import { exportNutritionSourcesExcel, exportNutritionSourcesPdf } from "../utils/exportNutritionSources.js";
import { setAuthoritativeFromSources } from "../services/nutritionSourceService.js";
import { createSnapshot } from "../services/nutritionSourceSnapshot.js";
import { logger } from "../utils/logger.js";
import type { AuthRequest } from "../types/auth.js";

type DbRow = Record<string, unknown>;

async function loadSourcesForScoring(materialId: string): Promise<SourceScoreInput[]> {
  const rows = (await query(
    "SELECT source_id, confidence, created_at, match_score, is_active FROM material_nutrition_sources WHERE material_id = ? AND is_active = 1",
    [materialId],
  )).rows as DbRow[];

  return rows.map((r) => ({
    sourceId: r.source_id as string,
    confidence: (r.confidence as "high" | "medium" | "low") ?? "medium",
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    matchScore: r.match_score != null ? Number(r.match_score) : null,
    isActive: (r.is_active as number) ?? 1,
  }));
}

export async function getRecommendation(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    // 同时加载 sourceType / sourceDetail 等上下文信息，
    // 避免 scoreSources 后只返回纯评分数据导致前端缺少"来源类型/详情"
    const sourceRows = (await query(
      "SELECT source_id, source_type, source_detail, confidence, created_at, match_score, is_active FROM material_nutrition_sources WHERE material_id = ? AND is_active = 1",
      [materialId],
    )).rows as DbRow[];

    const sources: SourceScoreInput[] = sourceRows.map((r) => ({
      sourceId: r.source_id as string,
      sourceType: r.source_type as string,
      sourceDetail: (r.source_detail as string) ?? null,
      confidence: (r.confidence as "high" | "medium" | "low") ?? "medium",
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
      matchScore: r.match_score != null ? Number(r.match_score) : null,
      isActive: 1,
    }));

    const ranked = scoreSources(sources);
    // 把 sourceType / sourceDetail 合并进排名结果
    const enriched = ranked.map((r) => {
      const ctx = sources.find((s) => s.sourceId === r.sourceId);
      return {
        ...r,
        sourceType: ctx?.sourceType ?? "unknown",
        sourceDetail: ctx?.sourceDetail ?? null,
      };
    });
    const top = enriched[0] ?? null;

    res.json(success({
      materialId,
      sources: enriched,
      recommendation: top,
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[NutritionSourceBatch] getRecommendation error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

export async function batchSetAuthoritative(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const { strategy, sourceIds, fieldSelections } = req.body as {
      strategy?: "best-deviation" | "manual" | "highest-confidence" | "newest"
      sourceIds?: string[]
      fieldSelections?: Record<string, string>
    };

    const VALID_STRATEGIES = ["best-deviation", "manual", "highest-confidence", "newest"] as const;
    if (strategy && !VALID_STRATEGIES.includes(strategy as typeof VALID_STRATEGIES[number])) {
      res.status(400).json({ success: false, error: { message: "无效的策略类型", code: "VALIDATION_ERROR" } });
      return;
    }

    const sources = await loadSourcesForScoring(materialId);
    if (sourceIds && sourceIds.length > 0) {
      const allowed = new Set(sourceIds);
      sources.forEach((s) => {
        if (!allowed.has(s.sourceId)) s.isActive = 0;
      });
    }

    let resolvedSelections: Record<string, string> = {};

    if (strategy === "manual" && fieldSelections) {
      resolvedSelections = fieldSelections;
    } else {
      const strategyKey = strategy ?? "best-deviation";
      const activeSources = sources.filter((s) => s.isActive === 1);
      if (activeSources.length === 0) {
        res.status(400).json({ success: false, message: "没有可用的活跃来源" });
        return;
      }

      const recommended = recommendByStrategy(activeSources, strategyKey);
      if (!recommended) {
        res.status(400).json({ success: false, message: "无法推荐来源" });
        return;
      }

      const sourceRow = (await query(
        "SELECT per_100g_json FROM material_nutrition_sources WHERE source_id = ?",
        [recommended.sourceId],
      )).rows[0] as DbRow | undefined;

      const per100g = sourceRow
        ? normalizePer100g(safeJsonParse(sourceRow.per_100g_json as string, {}))
        : {};

      for (const field of NUTRIENT_FIELDS) {
        if (per100g[field] != null) {
          resolvedSelections[field] = recommended.sourceId;
        }
      }
    }

    if (Object.keys(resolvedSelections).length === 0) {
      res.status(400).json({ success: false, message: "未生成字段映射" });
      return;
    }

    const result = await setAuthoritativeFromSources(materialId, resolvedSelections, req.user.userId);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    try {
      const affectedSourceIds = Array.from(new Set(Object.values(resolvedSelections)));
      await createSnapshot({
        materialId,
        action: "batch_set_authoritative",
        operatorId: req.user.userId,
        operatorName: req.user.name,
        affectedSourceIds,
        payload: {
          strategy: strategy ?? "best-deviation",
          updatedFields: result.updatedFields,
          fieldSources: result.fieldSources,
        },
        note: `批量设为主用：策略 ${strategy ?? "best-deviation"}，更新 ${result.updatedFields} 个字段`,
      });
    } catch (snapErr) {
      logger.warn("[Snapshot] Failed to create snapshot for batchSetAuthoritative:", snapErr);
    }

    res.json(success({
      materialId,
      updatedFields: result.updatedFields,
      strategy: strategy ?? "best-deviation",
      fieldSources: result.fieldSources,
    }, "批量设定权威数据完成"));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[NutritionSourceBatch] batchSetAuthoritative error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

export async function batchArchive(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const { sourceIds } = req.body as { sourceIds?: string[] };

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      res.status(400).json({ success: false, message: "sourceIds 不能为空" });
      return;
    }

    if (sourceIds.length > 100) {
      res.status(400).json({ success: false, error: { message: "sourceIds 数量不能超过 100", code: "VALIDATION_ERROR" } });
      return;
    }

    if (req.user.role !== "admin") {
      const owned = (await query(
        "SELECT source_id FROM material_nutrition_sources WHERE source_id IN (" +
        sourceIds.map(() => "?").join(",") + ") AND material_id = ? AND created_by = ?",
        [...sourceIds, materialId, req.user.userId],
      )).rows as DbRow[];
      const ownedIds = new Set(owned.map((r) => r.source_id as string));
      const unauthorized = sourceIds.filter((id) => !ownedIds.has(id));
      if (unauthorized.length > 0) {
        res.status(403).json({ success: false, error: { message: "无权归档部分来源，请联系管理员", code: "FORBIDDEN" } });
        return;
      }
    }

    await query(
      "UPDATE material_nutrition_sources SET is_active = 0 WHERE source_id IN (" +
      sourceIds.map(() => "?").join(",") + ") AND material_id = ?",
      [...sourceIds, materialId],
    );

    try {
      await createSnapshot({
        materialId,
        action: "batch_archive",
        operatorId: req.user.userId,
        operatorName: req.user.username,
        affectedSourceIds: sourceIds,
        payload: { archivedCount: sourceIds.length },
        note: `批量归档 ${sourceIds.length} 个来源`,
      });
    } catch (snapErr) {
      logger.warn("[Snapshot] Failed to create snapshot for batchArchive:", snapErr);
    }

    res.json(success({
      materialId,
      archivedCount: sourceIds.length,
      sourceIds,
    }, "已归档指定来源"));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[NutritionSourceBatch] batchArchive error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

export async function batchRestore(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const { sourceIds } = req.body as { sourceIds?: string[] };

    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, message: "仅管理员可恢复归档" });
      return;
    }

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      res.status(400).json({ success: false, message: "sourceIds 不能为空" });
      return;
    }

    if (sourceIds.length > 100) {
      res.status(400).json({ success: false, error: { message: "sourceIds 数量不能超过 100", code: "VALIDATION_ERROR" } });
      return;
    }

    await query(
      "UPDATE material_nutrition_sources SET is_active = 1 WHERE source_id IN (" +
      sourceIds.map(() => "?").join(",") + ") AND material_id = ?",
      [...sourceIds, materialId],
    );

    try {
      await createSnapshot({
        materialId,
        action: "batch_restore",
        operatorId: req.user.userId,
        operatorName: req.user.username,
        affectedSourceIds: sourceIds,
        payload: { restoredCount: sourceIds.length },
        note: `批量恢复 ${sourceIds.length} 个来源`,
      });
    } catch (snapErr) {
      logger.warn("[Snapshot] Failed to create snapshot for batchRestore:", snapErr);
    }

    res.json(success({
      materialId,
      restoredCount: sourceIds.length,
    }, "已恢复指定来源"));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[NutritionSourceBatch] batchRestore error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

export async function exportSources(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const format = (req.query.format as string) ?? "excel";

    const material = (await query("SELECT id, name FROM materials WHERE id = ?", [materialId])).rows[0] as DbRow | undefined;
    if (!material) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }

    const sourceRows = (await query(
      "SELECT source_id, source_type, source_detail, confidence, per_100g_json, created_at, notes, match_score, is_active FROM material_nutrition_sources WHERE material_id = ? AND is_active = 1 ORDER BY created_at DESC",
      [materialId],
    )).rows as DbRow[];

    const sources = sourceRows.map((r) => ({
      sourceId: r.source_id as string,
      sourceType: r.source_type as string,
      sourceDetail: (r.source_detail as string) ?? null,
      confidence: (r.confidence as string) ?? "medium",
      per100g: normalizePer100g(safeJsonParse(r.per_100g_json as string, {})),
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
      notes: (r.notes as string) ?? null,
    }));

    const authoritativeRow = (await query(
      "SELECT source_type, source_detail, per_100g_json FROM material_nutrition WHERE material_id = ? AND is_latest = 1",
      [materialId],
    )).rows[0] as DbRow | undefined;

    const authoritative = authoritativeRow ? {
      sourceType: (authoritativeRow.source_type as string) ?? "manual",
      sourceDetail: (authoritativeRow.source_detail as string) ?? null,
      per100g: normalizePer100g(safeJsonParse(authoritativeRow.per_100g_json as string, {})),
    } : null;

    const scoreInputs: SourceScoreInput[] = sources.map((s) => ({
      sourceId: s.sourceId,
      confidence: (s.confidence as "high" | "medium" | "low") ?? "medium",
      createdAt: s.createdAt,
      matchScore: null,
      isActive: 1,
    }));
    const ranked = scoreSources(scoreInputs);
    const top = ranked[0];

    const payload = {
      materialId,
      materialName: material.name as string,
      sources,
      authoritative,
      recommendation: top ? {
        sourceId: top.sourceId,
        sourceType: top.confidence,
        totalScore: top.totalScore,
      } : null,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.userId,
    };

    const safeName = (material.name as string).replace(/[\\/:*?"<>|\r\n]/g, "_").replace(/\.\./g, "_");
    const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_");
    if (format === "pdf") {
      const buf = await exportNutritionSourcesPdf(payload);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodeURIComponent(`营养来源对比_${safeName}.pdf`)}`,
      );
      res.send(buf);
    } else {
      const buf = await exportNutritionSourcesExcel(payload);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${asciiName}.xlsx"; filename*=UTF-8''${encodeURIComponent(`营养来源对比_${safeName}.xlsx`)}`,
      );
      res.send(buf);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[NutritionSourceBatch] exportSources error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

export async function getSourcesWithScores(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const sourceRows = (await query(
      "SELECT source_id, source_type, source_detail, confidence, match_score, notes, created_at, created_by, is_active FROM material_nutrition_sources WHERE material_id = ? AND is_active = 1 ORDER BY created_at DESC",
      [materialId],
    )).rows as DbRow[];

    const inputs: SourceScoreInput[] = sourceRows.map((r) => ({
      sourceId: r.source_id as string,
      confidence: (r.confidence as "high" | "medium" | "low") ?? "medium",
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
      matchScore: r.match_score != null ? Number(r.match_score) : null,
      isActive: (r.is_active as number) ?? 1,
    }));

    const ranked = scoreSources(inputs);
    const scoreMap = new Map(ranked.map((s) => [s.sourceId, s]));

    const enriched = sourceRows.map((r) => {
      const score = scoreMap.get(r.source_id as string);
      return {
        sourceId: r.source_id,
        sourceType: r.source_type,
        sourceDetail: r.source_detail,
        confidence: r.confidence,
        matchScore: r.match_score,
        notes: r.notes,
        createdAt: r.created_at,
        createdBy: r.created_by,
        isActive: r.is_active,
        totalScore: score?.totalScore ?? 0,
        rank: score?.rank ?? 0,
      };
    });

    res.json(success({
      materialId,
      sources: enriched,
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[NutritionSourceBatch] getSourcesWithScores error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}
