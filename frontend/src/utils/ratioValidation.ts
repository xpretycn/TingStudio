export interface RatioThresholds {
  normalLow: number;
  normalHigh: number;
  warningLow: number;
  warningHigh: number;
  highWarningLow: number;
  highWarningHigh: number;
}

export const RATIO_THRESHOLDS: RatioThresholds = {
  normalLow: 0.98,
  normalHigh: 1.02,
  warningLow: 0.95,
  warningHigh: 1.05,
  highWarningLow: 0.92,
  highWarningHigh: 1.08,
};

export type RatioLevel = "none" | "normal" | "warning" | "high_warning" | "error";

export interface RatioBreakdownItem {
  materialId: string;
  materialName: string;
  quantity: number;
  materialType: string;
  ratioFactor: number;
}

export interface RatioValidationResult {
  level: RatioLevel;
  totalRatio: number;
  breakdown: RatioBreakdownItem[];
  thresholds: RatioThresholds;
  message: string;
  description: string;
  allowed: boolean;
  requiresManualReview: boolean;
  badgeText: string;
}

export interface RatioFactorValidationResult {
  level: 'normal' | 'warning' | 'high_warning' | 'error';
  totalRatio: number;
  breakdown: RatioBreakdownItem[];
  thresholds: RatioThresholds;
  message: string;
  description: string;
  allowed: boolean;
  requiresManualReview: boolean;
}

export function roundRatio(value: number): number {
  if (!isFinite(value) || value === 0) return 0;
  return Math.round(value * 100000) / 100000;
}

export function calcMaterialRatio(
  quantity: number,
  finishedWeight: number,
  ratioFactor: number,
): number {
  if (!isFinite(quantity) || !isFinite(finishedWeight) || !isFinite(ratioFactor)) return 0;
  if (finishedWeight <= 0 || quantity <= 0) return 0;
  return roundRatio((quantity / finishedWeight) * ratioFactor);
}

export function determineRatioLevel(
  totalRatio: number,
  thresholds: RatioThresholds = RATIO_THRESHOLDS,
): RatioLevel {
  if (!isFinite(totalRatio)) return "error";
  if (totalRatio >= thresholds.normalLow && totalRatio <= thresholds.normalHigh) return "normal";
  if (
    (totalRatio >= thresholds.warningLow && totalRatio < thresholds.normalLow) ||
    (totalRatio > thresholds.normalHigh && totalRatio <= thresholds.warningHigh)
  ) return "warning";
  if (
    (totalRatio >= thresholds.highWarningLow && totalRatio < thresholds.warningLow) ||
    (totalRatio > thresholds.warningHigh && totalRatio <= thresholds.highWarningHigh)
  ) return "high_warning";
  return "error";
}

function buildMessages(level: RatioLevel, totalRatio: number) {
  const deviation = ((totalRatio - 1) * 100).toFixed(2);
  const totalPercent = (totalRatio * 100).toFixed(2);

  const map: Record<RatioLevel, { badgeText: string; message: string; description: string }> = {
    none: { badgeText: "", message: "待输入数据", description: "请填写原料用量和成品重量后进行含量比校验" },
    normal: {
      badgeText: "通过",
      message: "含量比校验通过",
      description: `原料含量比总和为 ${totalPercent}%（偏差 ${deviation}%），在正常范围内 [98%, 102%]`,
    },
    warning: {
      badgeText: "预警",
      message: `含量比偏差预警（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalPercent}%，超出正常范围 [98%, 102%]，偏差 ${deviation}%。建议检查原料用量是否合理，仍可继续创建。`,
    },
    high_warning: {
      badgeText: "警告",
      message: `含量比严重偏差（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalPercent}%，严重偏离标准值 100%，偏差 ${deviation}%。需要人工审核确认后方可创建，请仔细核对原料用量数据。`,
    },
    error: {
      badgeText: "失败",
      message: `含量比校验失败（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalPercent}%，偏差 ${deviation}% 超出允许范围 [92%, 108%]。配方数据存在错误，无法创建，请修正原料用量后重试。`,
    },
  };

  return map[level];
}

export function validateRatio(
  materials: Array<{ quantity: number; materialType?: string }>,
  finishedWeight: number,
  ratioFactor: number,
  supplementRatioFactor: number,
  thresholds: RatioThresholds = RATIO_THRESHOLDS,
): RatioValidationResult {
  const emptyResult: RatioValidationResult = {
    level: "none",
    totalRatio: 0,
    breakdown: [],
    thresholds,
    ...buildMessages("none", 0),
    allowed: true,
    requiresManualReview: false,
  };

  if (!materials.length || finishedWeight <= 0) return emptyResult;

  let totalRatio = 0;
  for (const m of materials) {
    if (!m.quantity || m.quantity <= 0) continue;
    const factor = m.materialType === "supplement" ? supplementRatioFactor : ratioFactor;
    totalRatio += calcMaterialRatio(m.quantity, finishedWeight, factor);
  }
  totalRatio = roundRatio(totalRatio);

  const level = determineRatioLevel(totalRatio, thresholds);
  const msgs = buildMessages(level, totalRatio);

  return {
    level,
    totalRatio,
    breakdown: [],
    thresholds,
    ...msgs,
    allowed: level !== "error",
    requiresManualReview: level === "high_warning",
  };
}

export function validateRatioFull(
  materials: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    materialType: string;
  }>,
  finishedWeight: number,
  ratioFactor: number,
  supplementRatioFactor: number,
  thresholds: RatioThresholds = RATIO_THRESHOLDS,
): RatioFactorValidationResult {
  const emptyResult: RatioFactorValidationResult = {
    level: 'normal',
    totalRatio: 0,
    breakdown: [],
    thresholds,
    message: '待输入数据',
    description: '请填写原料用量和成品重量后进行含量比校验',
    allowed: true,
    requiresManualReview: false,
  };

  if (!materials.length || finishedWeight <= 0) return emptyResult;

  const breakdown: RatioBreakdownItem[] = materials.map((m) => ({
    materialId: m.materialId,
    materialName: m.materialName,
    quantity: m.quantity,
    materialType: m.materialType,
    ratioFactor: calcMaterialRatio(
      m.quantity,
      finishedWeight,
      m.materialType === "supplement" ? supplementRatioFactor : ratioFactor,
    ),
  }));

  const validItems = breakdown.filter((item) => item.materialId && item.quantity > 0);
  if (validItems.length === 0) return emptyResult;

  const totalRatio = roundRatio(validItems.reduce((sum, item) => sum + item.ratioFactor, 0));
  const level = determineRatioLevel(totalRatio, thresholds);
  const msgs = buildMessages(level, totalRatio);

  return {
    level: level === 'none' ? 'normal' : level,
    totalRatio,
    breakdown,
    thresholds,
    message: msgs.message,
    description: msgs.description,
    allowed: level !== "error",
    requiresManualReview: level === "high_warning",
  };
}
