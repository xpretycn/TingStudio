import { describe, it, expect } from "vitest";
import { ratioFactorValidator, type ValidationResult } from "../src/services/formula/ratioFactorValidator.js";
import {
  validateRatioFactor,
  DEFAULT_THRESHOLDS,
  type MaterialInput,
  type RatioFactorThresholds,
} from "../src/services/ratioFactorValidator.js";

describe("RatioFactorValidator - 含量比校验器", () => {
  describe("正常范围 (normal)", () => {
    it("应该通过总含量比接近1.0的配方", () => {
      const materials = [
        { quantity: 50, ratioFactor: 1.0 },
        { quantity: 50, ratioFactor: 1.0 },
      ];

      const result = ratioFactorValidator.validate(materials, 100);

      expect(result.level).toBe("normal");
      expect(ratioFactorValidator.canSave(result)).toBe(true);
      expect(ratioFactorValidator.isBlocked(result)).toBe(false);
      expect(ratioFactorValidator.requiresWarning(result)).toBe(false);
      expect(result.color).toBe("#52c41a");
      expect(result.message).toContain("✅");
    });

    it("应该在 [0.98, 1.02] 范围内返回 normal", () => {
      const testCases = [
        { total: 0.98, expectedLevel: "normal" },
        { total: 1.0, expectedLevel: "normal" },
        { total: 1.02, expectedLevel: "normal" },
      ];

      for (const tc of testCases) {
        const materials = [{ quantity: tc.total * 100, ratioFactor: 1.0 }];
        const result = ratioFactorValidator.validate(materials, 100);
        expect(result.level).toBe(tc.expectedLevel);
      }
    });
  });

  describe("警告范围 (warning)", () => {
    it("应该在 (0.95, 0.98) 或 (1.02, 1.05] 范围内返回 warning", () => {
      const testCases = [
        { total: 0.96, expectedLevel: "warning" },
        { total: 1.04, expectedLevel: "warning" },
      ];

      for (const tc of testCases) {
        const materials = [{ quantity: tc.total * 100, ratioFactor: 1.0 }];
        const result = ratioFactorValidator.validate(materials, 100);
        expect(result.level).toBe(tc.expectedLevel);
        expect(ratioFactorValidator.requiresWarning(result)).toBe(true);
        expect(ratioFactorValidator.isBlocked(result)).toBe(false);
        expect(result.color).toBe("#faad14");
        expect(result.message).toContain("⚠️");
      }
    });
  });

  describe("高警告范围 (high_warning)", () => {
    it("应该在 (0.92, 0.95] 或 [1.08, 1.08) 范围内返回 high_warning", () => {
      const testCases = [
        { total: 0.93, expectedLevel: "high_warning" },
        { total: 1.07, expectedLevel: "high_warning" },
      ];

      for (const tc of testCases) {
        const materials = [{ quantity: tc.total * 100, ratioFactor: 1.0 }];
        const result = ratioFactorValidator.validate(materials, 100);
        expect(result.level).toBe(tc.expectedLevel);
        expect(ratioFactorValidator.requiresWarning(result)).toBe(true);
        expect(ratioFactorValidator.isBlocked(result)).toBe(false);
        expect(result.color).toBe("#ff4d4f");
        expect(result.message).toContain("❌");
      }
    });
  });

  describe("错误范围 (error)", () => {
    it("应该在 <0.92 或 >1.08 范围内返回 error", () => {
      const testCases = [
        { total: 0.9, expectedLevel: "error" },
        { total: 1.1, expectedLevel: "error" },
        { total: 0.8, expectedLevel: "error" },
        { total: 1.2, expectedLevel: "error" },
      ];

      for (const tc of testCases) {
        const materials = [{ quantity: tc.total * 100, ratioFactor: 1.0 }];
        const result = ratioFactorValidator.validate(materials, 100);
        expect(result.level).toBe(tc.expectedLevel);
        expect(ratioFactorValidator.isBlocked(result)).toBe(true);
        expect(ratioFactorValidator.canSave(result)).toBe(false);
        expect(result.color).toBe("#cf1322");
        expect(result.message).toContain("🚫");
      }
    });
  });

  describe("多原料复杂配方测试", () => {
    it("应该正确计算多原料配方的总含量比", () => {
      const materials = [
        { quantity: 30, ratioFactor: 0.18 },
        { quantity: 25, ratioFactor: 1.0 },
        { quantity: 45, ratioFactor: 1.0 },
      ];

      const result = ratioFactorValidator.validate(materials, 100);

      expect(result.total_ratio).toBeCloseTo((30 / 100) * 0.18 + (25 / 100) * 1.0 + (45 / 100) * 1.0, 4);
    });

    it("应该正确处理药材和辅料的混合配方", () => {
      const materials = [
        { quantity: 10, ratioFactor: 0.18 },
        { quantity: 40, ratioFactor: 1.0 },
        { quantity: 50, ratioFactor: 1.0 },
      ];

      const result = ratioFactorValidator.validate(materials, 100);

      expect(result.deviation).toBeLessThan(0.1);
    });
  });

  describe("边界值测试", () => {
    it("应该精确处理边界值 0.98 和 1.02", () => {
      const exactNormal = [{ quantity: 98, ratioFactor: 1.0 }];
      let result = ratioFactorValidator.validate(exactNormal, 100);
      expect(result.level).toBe("normal");

      const exactUpperNormal = [{ quantity: 102, ratioFactor: 1.0 }];
      result = ratioFactorValidator.validate(exactUpperNormal, 100);
      expect(result.level).toBe("normal");
    });

    it("应该精确处理边界值 0.92 和 1.08", () => {
      const exactHighWarning = [{ quantity: 92, ratioFactor: 1.0 }];
      let result = ratioFactorValidator.validate(exactHighWarning, 100);
      expect(result.level).toBe("error");

      const exactUpperHighWarning = [{ quantity: 108, ratioFactor: 1.0 }];
      result = ratioFactorValidator.validate(exactUpperHighWarning, 100);
      expect(result.level).toBe("error");
    });
  });

  describe("getValidationRules()", () => {
    it("应该返回完整的校验规则配置", () => {
      const rules = ratioFactorValidator.getValidationRules();

      expect(rules).toHaveProperty("normal_range");
      expect(rules).toHaveProperty("warning_range");
      expect(rules).toHaveProperty("high_warning_range");
      expect(rules).toHaveProperty("target_value", 1.0);
      expect(rules).toHaveProperty("tolerance_description");
    });
  });
});

describe("validateRatioFactor - 含量比校验函数", () => {
  const defaultThresholds: RatioFactorThresholds = {
    normalLow: 0.98,
    normalHigh: 1.02,
    warningLow: 0.95,
    warningHigh: 1.05,
    highWarningLow: 0.92,
    highWarningHigh: 1.08,
  };

  describe("V01-V02: 边界输入", () => {
    it("V01: 空原料数组返回 level 'error'", () => {
      const result = validateRatioFactor([], 100, 0.18, 1.0);
      expect(result.level).toBe("error");
      expect(result.allowed).toBe(false);
      expect(result.message).toBe("无原料数据");
    });

    it("V02: finishedWeight 为 0 返回 level 'error'", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 100 },
      ];
      const result = validateRatioFactor(materials, 0, 0.18, 1.0);
      expect(result.level).toBe("error");
      expect(result.allowed).toBe(false);
      expect(result.message).toBe("成品重量无效");
    });
  });

  describe("V03-V07: 各级别校验", () => {
    it("V03: 正常比率 (1.0) 返回 level 'normal', allowed=true", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 100 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("normal");
      expect(result.allowed).toBe(true);
      expect(result.requiresManualReview).toBe(false);
    });

    it("V04: 预警比率返回 level 'warning', allowed=true", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 96 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("warning");
      expect(result.allowed).toBe(true);
      expect(result.requiresManualReview).toBe(false);
    });

    it("V05: 高预警比率返回 level 'high_warning', requiresManualReview=true", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 93 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("high_warning");
      expect(result.allowed).toBe(true);
      expect(result.requiresManualReview).toBe(true);
    });

    it("V06: 错误比率 (< 0.92) 返回 level 'error', allowed=false", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 91 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("error");
      expect(result.allowed).toBe(false);
      expect(result.requiresManualReview).toBe(false);
    });

    it("V07: 错误比率 (> 1.08) 返回 level 'error', allowed=false", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 109 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("error");
      expect(result.allowed).toBe(false);
      expect(result.requiresManualReview).toBe(false);
    });
  });

  describe("V08-V11: 边界值精确测试", () => {
    it("V08: 边界值 0.98 返回 'normal'", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 98 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("normal");
    });

    it("V09: 边界值 1.02 返回 'normal'", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 102 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("normal");
    });

    it("V10: 边界值 0.92 返回 'high_warning'", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 92 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("high_warning");
    });

    it("V11: 边界值 1.08 返回 'high_warning'", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 108 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(result.level).toBe("high_warning");
    });
  });

  describe("V12-V15: 功能验证", () => {
    it("V12: 返回 breakdown 数组，包含每个原料的比率明细", () => {
      const materials: MaterialInput[] = [
        { materialId: "herb1", materialName: "枸杞", quantity: 30 },
        { materialId: "supp1", materialName: "维生素C", quantity: 70, materialType: "supplement" },
      ];
      const result = validateRatioFactor(materials, 100, 0.18, 1.0);

      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].materialId).toBe("herb1");
      expect(result.breakdown[0].materialName).toBe("枸杞");
      expect(result.breakdown[0].ratioFactor).toBe(0.054);
      expect(result.breakdown[1].materialId).toBe("supp1");
      expect(result.breakdown[1].materialName).toBe("维生素C");
      expect(result.breakdown[1].ratioFactor).toBe(0.7);
    });

    it("V13: 补充剂使用 supplementRatioFactor 计算比率", () => {
      const materials: MaterialInput[] = [
        { materialId: "herb1", materialName: "黄芪", quantity: 50 },
        { materialId: "supp1", materialName: "钙片", quantity: 50, materialType: "supplement" },
      ];
      const result = validateRatioFactor(materials, 100, 0.18, 1.0);

      const herbBreakdown = result.breakdown.find((b) => b.materialId === "herb1");
      const suppBreakdown = result.breakdown.find((b) => b.materialId === "supp1");

      expect(herbBreakdown?.ratioFactor).toBe(0.09);
      expect(suppBreakdown?.ratioFactor).toBe(0.5);
      expect(result.totalRatio).toBe(0.59);
    });

    it("V14: quantity=0 的原料在计算中被跳过", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 0 },
        { materialId: "m2", quantity: 100 },
      ];
      const result = validateRatioFactor(materials, 100, 1.0, 1.0);

      expect(result.totalRatio).toBe(1.0);
      expect(result.level).toBe("normal");
      expect(result.breakdown[0].ratioFactor).toBe(0);
      expect(result.breakdown[1].ratioFactor).toBe(1.0);
    });

    it("V15: 自定义阈值覆盖默认值", () => {
      const materials: MaterialInput[] = [
        { materialId: "m1", quantity: 98 },
      ];
      const customThresholds: RatioFactorThresholds = {
        normalLow: 0.99,
        normalHigh: 1.01,
        warningLow: 0.97,
        warningHigh: 1.03,
        highWarningLow: 0.95,
        highWarningHigh: 1.05,
      };

      const resultDefault = validateRatioFactor(materials, 100, 1.0, 1.0);
      expect(resultDefault.level).toBe("normal");

      const resultCustom = validateRatioFactor(materials, 100, 1.0, 1.0, customThresholds);
      expect(resultCustom.level).toBe("warning");
    });
  });

  describe("V20-V21: DEFAULT_THRESHOLDS", () => {
    it("V20: 包含全部 6 个阈值字段", () => {
      expect(DEFAULT_THRESHOLDS).toHaveProperty("normalLow");
      expect(DEFAULT_THRESHOLDS).toHaveProperty("normalHigh");
      expect(DEFAULT_THRESHOLDS).toHaveProperty("warningLow");
      expect(DEFAULT_THRESHOLDS).toHaveProperty("warningHigh");
      expect(DEFAULT_THRESHOLDS).toHaveProperty("highWarningLow");
      expect(DEFAULT_THRESHOLDS).toHaveProperty("highWarningHigh");
    });

    it("V21: 阈值值与预期默认值一致", () => {
      expect(DEFAULT_THRESHOLDS.normalLow).toBe(0.98);
      expect(DEFAULT_THRESHOLDS.normalHigh).toBe(1.02);
      expect(DEFAULT_THRESHOLDS.warningLow).toBe(0.95);
      expect(DEFAULT_THRESHOLDS.warningHigh).toBe(1.05);
      expect(DEFAULT_THRESHOLDS.highWarningLow).toBe(0.92);
      expect(DEFAULT_THRESHOLDS.highWarningHigh).toBe(1.08);
    });
  });
});
