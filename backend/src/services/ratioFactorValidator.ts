/**
 * 配方原料含量比(ratioFactor)分级校验服务
 *
 * 校验规则：
 *   - 总和 ∈ [0.98, 1.02]  → 正常
 *   - 总和 ∈ [0.95, 0.98) ∪ (1.02, 1.05] → 预警
 *   - 总和 ∈ [0.92, 0.95) ∪ (1.05, 1.08] → 高级预警，需人工审核
 *   - 总和 < 0.92 或 > 1.08 → 配方错误，拒绝创建
 *
 * 设计原则：
 *   - 阈值可配置，支持未来调整
 *   - 计算精度保留小数点后5位（满足至少3位要求）
 *   - 返回结构化结果，包含分级、消息、明细
 */

export type ValidationLevel = 'normal' | 'warning' | 'high_warning' | 'error';

export interface RatioFactorThresholds {
  normalLow: number;
  normalHigh: number;
  warningLow: number;
  warningHigh: number;
  highWarningLow: number;
  highWarningHigh: number;
}

export interface MaterialInput {
  materialId: string;
  materialName?: string;
  quantity: number;
  materialType?: 'herb' | 'supplement';
}

export interface MaterialRatioResult {
  materialId: string;
  materialName: string;
  quantity: number;
  materialType: string;
  ratioFactor: number;
}

export interface RatioFactorValidationResult {
  level: ValidationLevel;
  totalRatio: number;
  breakdown: MaterialRatioResult[];
  thresholds: RatioFactorThresholds;
  message: string;
  description: string;
  allowed: boolean;
  requiresManualReview: boolean;
}

export const DEFAULT_THRESHOLDS: RatioFactorThresholds = {
  normalLow: 0.98,
  normalHigh: 1.02,
  warningLow: 0.95,
  warningHigh: 1.05,
  highWarningLow: 0.92,
  highWarningHigh: 1.08,
};

let cachedThresholds: RatioFactorThresholds | null = null;

export function setCachedThresholds(thresholds: RatioFactorThresholds): void {
  cachedThresholds = { ...thresholds };
}

export function clearCachedThresholds(): void {
  cachedThresholds = null;
}

export function getCachedThresholds(): RatioFactorThresholds | null {
  return cachedThresholds;
}

export async function loadThresholdsFromConfig(): Promise<RatioFactorThresholds> {
  try {
    const { getDb } = await import("../config/database-better-sqlite3.js");
    const db = getDb();
    const row = db.prepare(`
      SELECT normal_low, normal_high, warning_low, warning_high,
             high_warning_low, high_warning_high
      FROM ratio_threshold_configs LIMIT 1
    `).get() as any;

    if (row) {
      cachedThresholds = {
        normalLow: row.normal_low,
        normalHigh: row.normal_high,
        warningLow: row.warning_low,
        warningHigh: row.warning_high,
        highWarningLow: row.high_warning_low,
        highWarningHigh: row.high_warning_high,
      };
      return cachedThresholds;
    }
  } catch {
    cachedThresholds = null;
  }
  return DEFAULT_THRESHOLDS;
}

function calcMaterialRatio(
  material: MaterialInput,
  finishedWeight: number,
  ratioFactor: number,
  supplementRatioFactor: number,
): number {
  const baseRatio = material.quantity / finishedWeight;
  const isSupplement = material.materialType === 'supplement';
  return baseRatio * (isSupplement ? supplementRatioFactor : ratioFactor);
}

function determineLevel(totalRatio: number, thresholds: RatioFactorThresholds): ValidationLevel {
  if (totalRatio >= thresholds.normalLow && totalRatio <= thresholds.normalHigh) {
    return 'normal';
  }
  if (
    (totalRatio >= thresholds.warningLow && totalRatio < thresholds.normalLow) ||
    (totalRatio > thresholds.normalHigh && totalRatio <= thresholds.warningHigh)
  ) {
    return 'warning';
  }
  if (
    (totalRatio >= thresholds.highWarningLow && totalRatio < thresholds.warningLow) ||
    (totalRatio > thresholds.warningHigh && totalRatio <= thresholds.highWarningHigh)
  ) {
    return 'high_warning';
  }
  return 'error';
}

function buildMessage(
  level: ValidationLevel,
  totalRatio: number,
  thresholds: RatioFactorThresholds,
): { message: string; description: string; allowed: boolean; requiresManualReview: boolean } {
  const deviation = ((totalRatio - 1) * 100).toFixed(2);

  switch (level) {
    case 'normal':
      return {
        message: '含量比校验通过',
        description: `原料含量比总和为 ${totalRatio.toFixed(5)}（偏差 ${deviation}%），在正常范围内 [${thresholds.normalLow}, ${thresholds.normalHigh}]`,
        allowed: true,
        requiresManualReview: false,
      };
    case 'warning':
      return {
        message: `含量比偏差预警（偏差 ${deviation}%）`,
        description: `原料含量比总和为 ${totalRatio.toFixed(5)}，超出正常范围 [${thresholds.normalLow}, ${thresholds.normalHigh}]，偏差 ${deviation}%。建议检查原料用量是否合理，仍可继续创建。`,
        allowed: true,
        requiresManualReview: false,
      };
    case 'high_warning':
      return {
        message: `含量比严重偏差（偏差 ${deviation}%）`,
        description: `原料含量比总和为 ${totalRatio.toFixed(5)}，严重偏离标准值 1.0，偏差 ${deviation}%。需要人工审核确认后方可创建，请仔细核对原料用量数据。`,
        allowed: true,
        requiresManualReview: true,
      };
    case 'error':
      return {
        message: `含量比校验失败（偏差 ${deviation}%）`,
        description: `原料含量比总和为 ${totalRatio.toFixed(5)}，偏差 ${deviation}% 超出允许范围 [${thresholds.highWarningLow}, ${thresholds.highWarningHigh}]。配方数据存在错误，无法创建，请修正原料用量后重试。`,
        allowed: false,
        requiresManualReview: false,
      };
  }
}

export function validateRatioFactor(
  materials: MaterialInput[],
  finishedWeight: number,
  ratioFactor: number,
  supplementRatioFactor: number,
  thresholds: RatioFactorThresholds = cachedThresholds ?? DEFAULT_THRESHOLDS,
): RatioFactorValidationResult {
  if (!materials || materials.length === 0) {
    return {
      level: 'error',
      totalRatio: 0,
      breakdown: [],
      thresholds,
      message: '无原料数据',
      description: '配方未包含任何原料，无法进行含量比校验',
      allowed: false,
      requiresManualReview: false,
    };
  }

  if (finishedWeight <= 0) {
    return {
      level: 'error',
      totalRatio: 0,
      breakdown: [],
      thresholds,
      message: '成品重量无效',
      description: '成品重量必须大于0才能进行含量比校验',
      allowed: false,
      requiresManualReview: false,
    };
  }

  const breakdown: MaterialRatioResult[] = materials.map((m) => {
    const materialType = m.materialType || 'herb';
    const ratio = calcMaterialRatio(m, finishedWeight, ratioFactor, supplementRatioFactor);
    return {
      materialId: m.materialId,
      materialName: m.materialName || m.materialId,
      quantity: m.quantity,
      materialType,
      ratioFactor: Math.round(ratio * 100000) / 100000,
    };
  });

  const totalRatio =
    Math.round(breakdown.reduce((sum, item) => sum + item.ratioFactor, 0) * 100000) / 100000;

  const level = determineLevel(totalRatio, thresholds);
  const { message, description, allowed, requiresManualReview } = buildMessage(level, totalRatio, thresholds);

  return {
    level,
    totalRatio,
    breakdown,
    thresholds,
    message,
    description,
    allowed,
    requiresManualReview,
  };
}
