import { RATIO_VALIDATION_THRESHOLDS } from "../../config/nutritionConstants.js";

type ValidationLevel = "normal" | "warning" | "high_warning" | "error";

interface ValidationResult {
  level: ValidationLevel;
  total_ratio: number;
  deviation: number;
  message: string;
  color: string;
  action: string;
}

class RatioFactorValidator {
  validate(materials: Array<{ quantity: number; ratioFactor?: number }>, finishedWeight: number): ValidationResult {
    const totalRatio = this.calculateTotalRatio(materials, finishedWeight);
    const deviation = Math.abs(totalRatio - 1);

    const thresholds = this.getThresholdsForDeviation(deviation);
    return this.buildResult(totalRatio, deviation, thresholds);
  }

  private calculateTotalRatio(
    materials: Array<{ quantity: number; ratioFactor?: number }>,
    finishedWeight: number,
  ): number {
    let sum = 0;

    for (const m of materials) {
      if (m.ratioFactor !== undefined) {
        sum += (m.quantity / finishedWeight) * m.ratioFactor;
      }
    }

    return parseFloat(sum.toFixed(5));
  }

  private getThresholdsForDeviation(deviation: number): { level: ValidationLevel; color: string; action: string } {
    if (deviation <= 1 - RATIO_VALIDATION_THRESHOLDS.normal.low) {
      return {
        level: "normal",
        color: "#52c41a",
        action: "无需调整，可直接保存",
      };
    }

    if (deviation <= 1 - RATIO_VALIDATION_THRESHOLDS.warning.low) {
      return {
        level: "warning",
        color: "#faad14",
        action: "建议检查配方原料用量或 ratioFactor 设置",
      };
    }

    if (deviation < 1 - RATIO_VALIDATION_THRESHOLDS.highWarning.low) {
      return {
        level: "high_warning",
        color: "#ff4d4f",
        action: "必须修正配方原料用量或 ratioFactor 后才能保存",
      };
    }

    return {
      level: "error",
      color: "#cf1322",
      action: "禁止保存，请重新设计配方",
    };
  }

  private buildResult(
    totalRatio: number,
    deviation: number,
    thresholds: { level: ValidationLevel; color: string; action: string },
  ): ValidationResult {
    let message = "";

    switch (thresholds.level) {
      case "normal":
        message = `✅ 配方原料总含量比 ${totalRatio.toFixed(5)} 在正常范围 [${RATIO_VALIDATION_THRESHOLDS.normal.low}, ${RATIO_VALIDATION_THRESHOLDS.normal.high}] 内`;
        break;
      case "warning":
        message = `⚠️ 配方原料总含量比 ${totalRatio.toFixed(5)} 偏离标准值，偏差 ${deviation.toFixed(5)}。建议检查配方原料用量或 ratioFactor 设置`;
        break;
      case "high_warning":
        message = `❌ 配方原料总含量比 ${totalRatio.toFixed(5)} 严重偏离标准值，偏差 ${deviation.toFixed(5)}。必须修正后才能保存`;
        break;
      case "error":
        message = `🚫 配方原料总含量比 ${totalRatio.toFixed(5)} 超出允许范围，偏差 ${deviation.toFixed(5)}。请重新设计配方`;
        break;
    }

    return {
      level: thresholds.level,
      total_ratio: totalRatio,
      deviation,
      message,
      color: thresholds.color,
      action: thresholds.action,
    };
  }

  canSave(validationResult: ValidationResult): boolean {
    return validationResult.level === "normal";
  }

  requiresWarning(validationResult: ValidationResult): boolean {
    return ["warning", "high_warning"].includes(validationResult.level);
  }

  isBlocked(validationResult: ValidationResult): boolean {
    return validationResult.level === "error";
  }

  getValidationRules(): Record<string, any> {
    return {
      normal_range: RATIO_VALIDATION_THRESHOLDS.normal,
      warning_range: RATIO_VALIDATION_THRESHOLDS.warning,
      high_warning_range: RATIO_VALIDATION_THRESHOLDS.highWarning,
      target_value: 1.0,
      tolerance_description: "总含量比应在目标值 ±2% 以内为最佳",
    };
  }
}

export const ratioFactorValidator = new RatioFactorValidator();
export type { ValidationLevel, ValidationResult };
