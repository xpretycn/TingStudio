import { describe, it, expect } from "vitest";
import { ratioFactorValidator, type ValidationResult } from "../src/services/formula/ratioFactorValidator.js";

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
