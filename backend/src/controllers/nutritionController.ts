import { Request, Response } from "express";
import { success, fail } from "../utils/helpers.js";
import {
  NRV_REFERENCE,
  NUTRIENT_LABELS,
  CORE_NUTRIENT_COLS,
} from "../config/nutritionConstants.js";
import { normalizeNutrientKey } from "../utils/nutritionHelpers.js";
import * as nutritionService from "../services/nutritionService.js";

export async function getMaterialNutrition(req: Request, res: Response) {
  try {
    const { materialId } = req.params;
    const data = await nutritionService.getMaterialNutritionData(materialId);
    res.json(data ? success(data) : { success: true, data: null });
  } catch (error: unknown) {
    res.status(500).json(fail("获取营养成分失败"));
  }
}

export async function setMaterialNutrition(req: Request & { user: { userId: string } }, res: Response) {
  try {
    const { materialId } = req.params;
    const { per100g, dataSource, notes, confidence } = req.body;
    const userId = req.user.userId;

    const result = await nutritionService.setMaterialNutritionData(
      materialId, per100g, dataSource, notes, confidence, userId,
    );

    if (!result.success) {
      res.status(404).json(fail(result.message, "NOT_FOUND"));
      return;
    }
    res.json(success(null, "营养成分已保存"));
  } catch (error: unknown) {
    res.status(500).json(fail("保存营养成分失败"));
  }
}

export async function calculateFormulaNutrition(req: Request & { user: { userId: string } }, res: Response) {
  try {
    const { formulaId } = req.params;
    const userId = req.user.userId;

    const result = await nutritionService.calculateFormulaNutritionData(formulaId, userId);
    if (!result) {
      res.status(404).json(fail("配方不存在", "NOT_FOUND"));
      return;
    }
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("营养计算失败"));
  }
}

export async function getNutritionProfiles(req: Request, res: Response) {
  try {
    const { category, keyword } = req.query as { category?: string; keyword?: string };
    const profiles = await nutritionService.getNutritionProfilesList(category, keyword);
    res.json(success(profiles));
  } catch (error: unknown) {
    res.status(500).json(fail("获取营养标准失败"));
  }
}

export async function createNutritionProfile(req: Request & { user: { userId: string } }, res: Response) {
  try {
    const userId = req.user.userId;
    const result = await nutritionService.createNutritionProfile(req.body, userId);
    res.status(201).json(success(result, "营养标准创建成功"));
  } catch (error: unknown) {
    res.status(500).json(fail("创建营养标准失败"));
  }
}

export async function updateNutritionProfile(req: Request & { user: { userId: string } }, res: Response) {
  try {
    const { profileId } = req.params;
    const userId = req.user.userId;
    const result = await nutritionService.updateNutritionProfileData(profileId, req.body, userId);

    if (!result.success) {
      const status = result.message?.includes("预置") ? 403 : 404;
      const code = status === 403 ? "FORBIDDEN" : "NOT_FOUND";
      res.status(status).json(fail(result.message, code));
      return;
    }
    res.json(success(null, "营养标准更新成功"));
  } catch (error: unknown) {
    res.status(500).json(fail("更新营养标准失败"));
  }
}

export async function deleteNutritionProfile(req: Request, res: Response) {
  try {
    const { profileId } = req.params;
    const result = await nutritionService.deleteNutritionProfileData(profileId);

    if (!result.success) {
      const status = result.message?.includes("预置") ? 403 : 404;
      const code = status === 403 ? "FORBIDDEN" : "NOT_FOUND";
      res.status(status).json(fail(result.message, code));
      return;
    }
    res.json(success(null, "营养标准删除成功"));
  } catch (error: unknown) {
    res.status(500).json(fail("删除营养标准失败"));
  }
}

export async function checkCompliance(req: Request & { user: { userId: string } }, res: Response) {
  try {
    const { formulaId } = req.params;
    const userId = req.user.userId;

    const summary = await nutritionService.getComplianceCheckData(formulaId);
    if (!summary) {
      res.status(404).json(fail("请先计算配方营养汇总", "NOT_FOUND"));
      return;
    }

    const per100g = safeJsonParse(summary.per_100g_nutrition_json as string, {}) as Record<string, number>;
    const profileId = req.body.profileId;
    const profile = profileId ? await nutritionService.getProfileById(profileId) : null;
    const targets = profile?.targetValues as Record<string, number> || {};
    const tolerances = profile?.toleranceRanges || [];

    const normalizedTargets: Record<string, number> = {};
    for (const [key, val] of Object.entries(targets)) {
      normalizedTargets[normalizeNutrientKey(key)] = val;
    }

    const normalizedTolerances: Record<string, { min: number; max: number; label: string; alertLevel?: string }> = {};
    if (Array.isArray(tolerances)) {
      for (const r of tolerances as Record<string, unknown>[]) {
        const normalizedKey = normalizeNutrientKey((r.field as string) || "");
        normalizedTolerances[normalizedKey] = {
          min: r.min as number,
          max: r.max as number,
          label: (r.label as string) || NUTRIENT_LABELS[normalizedKey] || normalizedKey,
          alertLevel: r.alertLevel as string | undefined,
        };
      }
    } else if (tolerances && typeof tolerances === "object") {
      for (const [key, range] of Object.entries(tolerances as Record<string, Record<string, unknown>>)) {
        const normalizedKey = normalizeNutrientKey(key);
        const target = normalizedTargets[normalizedKey];
        if (target && typeof range.min === "number" && typeof range.max === "number") {
          normalizedTolerances[normalizedKey] = {
            min: Math.round(target * range.min * 100) / 100,
            max: Math.round(target * range.max * 100) / 100,
            label: NUTRIENT_LABELS[normalizedKey] || normalizedKey,
            alertLevel: "warning",
          };
        }
      }
    }

    const complianceChecks: Array<Record<string, unknown>> = [];
    const recommendations: Array<Record<string, unknown>> = [];

    for (const field of CORE_NUTRIENT_COLS) {
      const actualValue = (per100g as Record<string, number>)[field] || 0;
      const label = NUTRIENT_LABELS[field] || field;
      const tolerance = normalizedTolerances[field];
      const target = normalizedTargets[field];

      if (tolerance) {
        if (actualValue < tolerance.min || actualValue > tolerance.max) {
          complianceChecks.push({
            field,
            label,
            actualValue,
            targetMin: tolerance.min,
            targetMax: tolerance.max,
            status: "fail",
            message: `${label}: ${actualValue.toFixed(2)} 不在范围 [${tolerance.min}, ${tolerance.max}]`,
            suggestedActions: [
              actualValue < tolerance.min ? `增加${label}含量` : `减少${label}含量`,
            ],
          });
        } else if (
          actualValue < tolerance.min * 1.05 && actualValue > tolerance.min * 0.95 ||
          actualValue > tolerance.max * 0.95 && actualValue < tolerance.max * 1.05
        ) {
          complianceChecks.push({
            field,
            label,
            actualValue,
            targetMin: tolerance.min,
            targetMax: tolerance.max,
            status: "warning",
            message: `${label}: ${actualValue.toFixed(2)} 接近边界`,
            suggestedActions: [`关注${label}含量变化`],
          });
        } else {
          complianceChecks.push({
            field,
            label,
            actualValue,
            status: "pass",
            message: `${label}: ${actualValue.toFixed(2)}`,
            suggestedActions: [],
          });
        }
      } else if (target) {
        complianceChecks.push({
          field,
          label,
          actualValue,
          target,
          status: "pass" as const,
          message: `${label}: ${actualValue.toFixed(2)}`,
          suggestedActions: [],
        });
      }
    }

    const passCount = complianceChecks.filter((c) => c.status === "pass").length;
    const warningCount = complianceChecks.filter((c) => c.status === "warning").length;
    const failCount = complianceChecks.filter((c) => c.status === "fail").length;

    if (failCount > 0) {
      recommendations.push({
        type: "safety",
        priority: "high",
        title: "营养合规性警告",
        description: `有 ${failCount} 项营养指标不达标，建议调整配方`,
        actionable: true,
        suggestedActions: complianceChecks
          .filter((c) => c.status === "fail")
          .flatMap((c) => (c.suggestedActions as string[]) || []),
      });
    }

    if (warningCount > 0) {
      recommendations.push({
        type: "warning",
        priority: "medium",
        title: "营养指标接近临界值",
        description: `有 ${warningCount} 项营养指标接近临界值，建议关注`,
        actionable: true,
        suggestedActions: complianceChecks
          .filter((c) => c.status === "warning")
          .flatMap((c) => (c.suggestedActions as string[]) || []),
      });
    }

    if (passCount > 0 && failCount === 0) {
      recommendations.push({
        type: "nutrition",
        priority: "low",
        title: "营养指标达标",
        description: "所有营养指标均在标准范围内",
        actionable: false,
        suggestedActions: [],
      });
    }

    const reportId = await nutritionService.saveComplianceReport(
      formulaId,
      summary.summary_id as string | undefined,
      complianceChecks,
      recommendations,
      userId,
    );

    res.json(
      success({
        reportId,
        complianceCheck: complianceChecks,
        recommendations,
        summary: {
          totalChecked: complianceChecks.length,
          passed: passCount,
          failed: failCount,
          warnings: warningCount,
        },
      }),
    );
  } catch (error: unknown) {
    res.status(500).json(fail("服务器内部错误"));
  }
}

function safeJsonParse(str: string | null, def: unknown): unknown {
  if (!str) return def;
  try {
    return JSON.parse(str);
  } catch {
    return def;
  }
}

export async function getFormulaNutritionTables(req: Request, res: Response) {
  try {
    const { formulaId } = req.params;
    const data = await nutritionService.getFormulaNutritionTablesData(formulaId);
    if (!data) {
      res.status(404).json(fail("配方不存在", "NOT_FOUND"));
      return;
    }
    res.json(success(data));
  } catch (error: unknown) {
    res.status(500).json(fail("获取营养计算表格失败"));
  }
}

export async function analyzeFormula(req: Request & { user: { userId: string; role: string } }, res: Response) {
  try {
    const { formulaId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const data = await nutritionService.getAnalyzeFormulaData(formulaId, userId, userRole);

    if (data && "error" in data) {
      const statusMap: Record<string, number> = { NOT_FOUND: 404, FORBIDDEN: 403, VALIDATION_ERROR: 400 };
      const errCode = data.error as string;
      res.status(statusMap[errCode] || 400).json({
        success: false,
        error: { message: data.message, code: errCode },
      });
      return;
    }

    const { nutritionEngine } = await import("../services/formula/nutritionEngine.js");
    const result = nutritionEngine.analyze(data as Parameters<typeof nutritionEngine.analyze>[0]);
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("营养分析失败"));
  }
}

export async function getCoverage(req: Request & { user: { userId: string; role: string } }, res: Response) {
  try {
    const { formulaId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const data = await nutritionService.getCoverageData(formulaId, userId, userRole);

    if (data && "error" in data) {
      const statusMap: Record<string, number> = { NOT_FOUND: 404, FORBIDDEN: 403 };
      const errCode = data.error as string;
      res.status(statusMap[errCode] || 400).json({
        success: false,
        error: { message: data.message, code: errCode },
      });
      return;
    }

    res.json(success(data));
  } catch (error: unknown) {
    res.status(500).json(fail("获取覆盖度失败"));
  }
}
