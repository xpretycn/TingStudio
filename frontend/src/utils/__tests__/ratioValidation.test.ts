import { describe, it, expect } from "vitest";
import {
  roundRatio,
  calcMaterialRatio,
  determineRatioLevel,
  validateRatio,
  validateRatioFull,
  RATIO_THRESHOLDS,
  type RatioThresholds,
} from "@/utils/ratioValidation";

describe("roundRatio", () => {
  it("R01: 正常值四舍五入到5位小数", () => {
    expect(roundRatio(1.23456789)).toBe(1.23457);
  });

  it("R02: NaN 返回 0", () => {
    expect(roundRatio(NaN)).toBe(0);
  });

  it("R03: Infinity 返回 0", () => {
    expect(roundRatio(Infinity)).toBe(0);
  });

  it("R04: -Infinity 返回 0", () => {
    expect(roundRatio(-Infinity)).toBe(0);
  });

  it("R05: 0 返回 0", () => {
    expect(roundRatio(0)).toBe(0);
  });

  it("R06: 已经是5位小数的值保持不变", () => {
    expect(roundRatio(1.23456)).toBe(1.23456);
  });
});

describe("calcMaterialRatio", () => {
  it("R10: 正常计算 (100g / 1000g * 0.18 = 0.018)", () => {
    expect(calcMaterialRatio(100, 1000, 0.18)).toBe(0.018);
  });

  it("R11: finishedWeight 为 0 返回 0", () => {
    expect(calcMaterialRatio(100, 0, 0.18)).toBe(0);
  });

  it("R12: quantity 为 0 返回 0", () => {
    expect(calcMaterialRatio(0, 1000, 0.18)).toBe(0);
  });

  it("R13: 负数 finishedWeight 返回 0", () => {
    expect(calcMaterialRatio(100, -1000, 0.18)).toBe(0);
  });

  it("R14: 负数 quantity 返回 0", () => {
    expect(calcMaterialRatio(-100, 1000, 0.18)).toBe(0);
  });

  it("R15: NaN quantity 返回 0", () => {
    expect(calcMaterialRatio(NaN, 1000, 0.18)).toBe(0);
  });

  it("R16: Infinity quantity 返回 0", () => {
    expect(calcMaterialRatio(Infinity, 1000, 0.18)).toBe(0);
  });

  it("R17: 补充材料使用 supplementRatioFactor", () => {
    expect(calcMaterialRatio(50, 1000, 1.0)).toBe(0.05);
  });
});

describe("determineRatioLevel", () => {
  const t = RATIO_THRESHOLDS;

  it("R20: totalRatio=1.0 → normal", () => {
    expect(determineRatioLevel(1.0)).toBe("normal");
  });

  it("R21: totalRatio=0.98 → normal (下边界)", () => {
    expect(determineRatioLevel(t.normalLow)).toBe("normal");
  });

  it("R22: totalRatio=1.02 → normal (上边界)", () => {
    expect(determineRatioLevel(t.normalHigh)).toBe("normal");
  });

  it("R23: totalRatio=0.9799 → warning (低于 normalLow)", () => {
    expect(determineRatioLevel(0.9799)).toBe("warning");
  });

  it("R24: totalRatio=1.0201 → warning (高于 normalHigh)", () => {
    expect(determineRatioLevel(1.0201)).toBe("warning");
  });

  it("R25: totalRatio=0.95 → warning (下边界)", () => {
    expect(determineRatioLevel(t.warningLow)).toBe("warning");
  });

  it("R26: totalRatio=1.05 → warning (上边界)", () => {
    expect(determineRatioLevel(t.warningHigh)).toBe("warning");
  });

  it("R27: totalRatio=0.9499 → high_warning (低于 warningLow)", () => {
    expect(determineRatioLevel(0.9499)).toBe("high_warning");
  });

  it("R28: totalRatio=1.0501 → high_warning (高于 warningHigh)", () => {
    expect(determineRatioLevel(1.0501)).toBe("high_warning");
  });

  it("R29: totalRatio=0.92 → high_warning (下边界)", () => {
    expect(determineRatioLevel(t.highWarningLow)).toBe("high_warning");
  });

  it("R30: totalRatio=1.08 → high_warning (上边界)", () => {
    expect(determineRatioLevel(t.highWarningHigh)).toBe("high_warning");
  });

  it("R31: totalRatio=0.9199 → error (低于 highWarningLow)", () => {
    expect(determineRatioLevel(0.9199)).toBe("error");
  });

  it("R32: totalRatio=1.0801 → error (高于 highWarningHigh)", () => {
    expect(determineRatioLevel(1.0801)).toBe("error");
  });

  it("R33: NaN → error", () => {
    expect(determineRatioLevel(NaN)).toBe("error");
  });

  it("R34: Infinity → error", () => {
    expect(determineRatioLevel(Infinity)).toBe("error");
  });
});

describe("validateRatio", () => {
  const materials = [
    { quantity: 100, materialType: "herb" },
    { quantity: 50, materialType: "herb" },
  ];

  it("R40: 空材料列表返回 level 'none'", () => {
    const result = validateRatio([], 1000, 0.18, 1.0);
    expect(result.level).toBe("none");
    expect(result.totalRatio).toBe(0);
    expect(result.allowed).toBe(true);
  });

  it("R41: finishedWeight 为 0 返回 level 'none'", () => {
    const result = validateRatio(materials, 0, 0.18, 1.0);
    expect(result.level).toBe("none");
    expect(result.totalRatio).toBe(0);
  });

  it("R42: 正常含量比返回 level 'normal' 且 allowed=true", () => {
    const result = validateRatio(
      [{ quantity: 5556, materialType: "herb" }],
      1000,
      0.18,
      1.0,
    );
    expect(result.level).toBe("normal");
    expect(result.allowed).toBe(true);
  });

  it("R43: 错误含量比返回 level 'error' 且 allowed=false", () => {
    const result = validateRatio(
      [{ quantity: 6001, materialType: "herb" }],
      1000,
      0.18,
      1.0,
    );
    expect(result.level).toBe("error");
    expect(result.allowed).toBe(false);
  });

  it("R44: 预警含量比返回 level 'warning'", () => {
    const result = validateRatio(
      [{ quantity: 5700, materialType: "herb" }],
      1000,
      0.18,
      1.0,
    );
    expect(result.level).toBe("warning");
    expect(result.allowed).toBe(true);
    expect(result.requiresManualReview).toBe(false);
  });

  it("R45: 高预警含量比返回 requiresManualReview=true", () => {
    const result = validateRatio(
      [{ quantity: 5900, materialType: "herb" }],
      1000,
      0.18,
      1.0,
    );
    expect(result.level).toBe("high_warning");
    expect(result.requiresManualReview).toBe(true);
  });

  it("R46: quantity=0 的材料被跳过", () => {
    const result = validateRatio(
      [{ quantity: 0, materialType: "herb" }, { quantity: 5556, materialType: "herb" }],
      1000,
      0.18,
      1.0,
    );
    expect(result.level).toBe("normal");
  });
});

describe("validateRatioFull", () => {
  const materials = [
    { materialId: "m1", materialName: "药材A", quantity: 100, materialType: "herb" },
    { materialId: "m2", materialName: "药材B", quantity: 50, materialType: "herb" },
  ];

  it("R50: 空材料列表返回 level 'normal'（非 'none'）", () => {
    const result = validateRatioFull([], 1000, 0.18, 1.0);
    expect(result.level).toBe("normal");
    expect(result.totalRatio).toBe(0);
  });

  it("R51: finishedWeight 为 0 返回 level 'normal'", () => {
    const result = validateRatioFull(materials, 0, 0.18, 1.0);
    expect(result.level).toBe("normal");
    expect(result.totalRatio).toBe(0);
  });

  it("R52: 返回 breakdown 数组包含每个材料的比率", () => {
    const result = validateRatioFull(materials, 1000, 0.18, 1.0);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0].materialId).toBe("m1");
    expect(result.breakdown[0].ratioFactor).toBeCloseTo(0.018, 5);
    expect(result.breakdown[1].materialId).toBe("m2");
    expect(result.breakdown[1].ratioFactor).toBeCloseTo(0.009, 5);
  });

  it("R53: 过滤掉没有 materialId 的材料", () => {
    const result = validateRatioFull(
      [
        { materialId: "", materialName: "", quantity: 100, materialType: "herb" },
        { materialId: "m1", materialName: "药材A", quantity: 180, materialType: "herb" },
      ],
      1000,
      0.18,
      1.0,
    );
    expect(result.totalRatio).toBeCloseTo(0.0324, 5);
  });

  it("R54: 过滤掉 quantity=0 的材料", () => {
    const result = validateRatioFull(
      [
        { materialId: "m1", materialName: "药材A", quantity: 0, materialType: "herb" },
        { materialId: "m2", materialName: "药材B", quantity: 180, materialType: "herb" },
      ],
      1000,
      0.18,
      1.0,
    );
    expect(result.totalRatio).toBeCloseTo(0.0324, 5);
  });

  it("R55: 仅使用有效材料计算 totalRatio", () => {
    const result = validateRatioFull(
      [
        { materialId: "m1", materialName: "药材A", quantity: 100, materialType: "herb" },
        { materialId: "", materialName: "", quantity: 50, materialType: "herb" },
        { materialId: "m2", materialName: "药材B", quantity: 50, materialType: "herb" },
      ],
      1000,
      0.18,
      1.0,
    );
    expect(result.totalRatio).toBeCloseTo(0.027, 5);
  });
});

describe("RATIO_THRESHOLDS", () => {
  it("R60: 包含全部 6 个阈值字段", () => {
    expect(RATIO_THRESHOLDS).toHaveProperty("normalLow");
    expect(RATIO_THRESHOLDS).toHaveProperty("normalHigh");
    expect(RATIO_THRESHOLDS).toHaveProperty("warningLow");
    expect(RATIO_THRESHOLDS).toHaveProperty("warningHigh");
    expect(RATIO_THRESHOLDS).toHaveProperty("highWarningLow");
    expect(RATIO_THRESHOLDS).toHaveProperty("highWarningHigh");
  });

  it("R61: normalLow < normalHigh", () => {
    expect(RATIO_THRESHOLDS.normalLow).toBeLessThan(RATIO_THRESHOLDS.normalHigh);
  });

  it("R62: warningLow < normalLow", () => {
    expect(RATIO_THRESHOLDS.warningLow).toBeLessThan(RATIO_THRESHOLDS.normalLow);
  });

  it("R63: normalHigh < warningHigh", () => {
    expect(RATIO_THRESHOLDS.normalHigh).toBeLessThan(RATIO_THRESHOLDS.warningHigh);
  });

  it("R64: highWarningLow < warningLow", () => {
    expect(RATIO_THRESHOLDS.highWarningLow).toBeLessThan(RATIO_THRESHOLDS.warningLow);
  });

  it("R65: warningHigh < highWarningHigh", () => {
    expect(RATIO_THRESHOLDS.warningHigh).toBeLessThan(RATIO_THRESHOLDS.highWarningHigh);
  });
});
