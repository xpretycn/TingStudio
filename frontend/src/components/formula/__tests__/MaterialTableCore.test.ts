import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MaterialTableCore from "@/components/formula/MaterialTableCore.vue";
import type { MaterialTableRow } from "@/components/formula/MaterialTableCore.vue";
import type { RatioValidationResult } from "@/utils/ratioValidation";

const mockValidateRatio = vi.fn();
const mockCalcMaterialRatio = vi.fn();

vi.mock("@/utils/ratioValidation", () => ({
  validateRatio: (...args: unknown[]) => mockValidateRatio(...args),
  calcMaterialRatio: (...args: unknown[]) => mockCalcMaterialRatio(...args),
}));

vi.mock("@/stores/material", () => ({
  useMaterialStore: vi.fn(() => ({
    allMaterials: [],
  })),
}));

vi.mock("@/api/nutrition", () => ({
  nutritionApi: {
    getMaterialNutrition: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("tdesign-vue-next", async (importOriginal) => {
  const original = await importOriginal<typeof import("tdesign-vue-next")>();
  return {
    ...original,
    MessagePlugin: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

function makeRow(overrides: Partial<MaterialTableRow> = {}): MaterialTableRow {
  return {
    materialId: "mat-1",
    materialName: "枸杞",
    quantity: 100,
    unit: "g",
    basePrice: 50,
    materialType: "herb",
    ...overrides,
  };
}

function buildValidationResult(
  level: RatioValidationResult["level"] = "normal",
  totalRatio = 1.0,
): RatioValidationResult {
  const badgeMap: Record<string, string> = {
    none: "",
    normal: "通过",
    warning: "预警",
    high_warning: "警告",
    error: "失败",
  };
  return {
    level,
    totalRatio,
    breakdown: [],
    thresholds: {
      normalLow: 0.98,
      normalHigh: 1.02,
      warningLow: 0.95,
      warningHigh: 1.05,
      highWarningLow: 0.92,
      highWarningHigh: 1.08,
    },
    message: "",
    description: `含量比校验${badgeMap[level] || ""}`,
    allowed: level !== "error",
    requiresManualReview: level === "high_warning",
    badgeText: badgeMap[level] || "",
  };
}

const defaultProps = {
  materials: [] as MaterialTableRow[],
  mode: "parse" as const,
  finishedWeight: 500,
  ratioFactor: 0.18,
  supplementRatioFactor: 1.0,
  supplementPriceMap: () => ({}) as Record<string, number>,
  materialVersions: () => ({}) as Record<string, { currentVersion: number; latestVersion: number; isLatest: boolean }>,
};

function mountComponent(propsOverrides: Record<string, unknown> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(MaterialTableCore, {
    props: { ...defaultProps, ...propsOverrides },
    global: {
      plugins: [pinia],
      stubs: {
        "t-icon": { template: "<span class='t-icon-stub'></span>" },
        "t-tag": { template: "<span class='t-tag-stub'><slot /></span>" },
        "t-popconfirm": {
          template: "<div class='t-popconfirm-stub'><slot /><button class='popconfirm-confirm-btn' @click='$emit(\"confirm\")'>确认</button></div>",
        },
        "t-input-number": { template: "<input class='t-input-number-stub' />" },
        "t-checkbox": { template: "<input type='checkbox' class='t-checkbox-stub' />" },
        "t-select": { template: "<div class='t-select-stub'><slot /></div>" },
        "t-option": { template: "<div class='t-option-stub'><slot /></div>" },
        "t-tooltip": { template: "<div class='t-tooltip-stub'><slot /></div>" },
      },
    },
  });
}

describe("MaterialTableCore 组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRatio.mockReturnValue(buildValidationResult("normal", 1.0));
    mockCalcMaterialRatio.mockImplementation((qty: number, fw: number, factor: number) => {
      if (fw <= 0 || qty <= 0) return 0;
      return Math.round((qty / fw) * factor * 100000) / 100000;
    });
  });

  describe("渲染", () => {
    it("M01: 提供 materials 时应渲染原料行", () => {
      const wrapper = mountComponent({
        materials: [makeRow({ materialName: "枸杞", quantity: 100 })],
      });
      const rows = wrapper.findAll(".materials-row");
      expect(rows.length).toBe(1);
      expect(wrapper.text()).toContain("枸杞");
    });

    it("M02: 无 materials 时应显示空状态（仅添加按钮）", () => {
      const wrapper = mountComponent({ materials: [] });
      expect(wrapper.findAll(".materials-row").length).toBe(0);
      expect(wrapper.find(".add-material-inline-btn").exists()).toBe(true);
      expect(wrapper.find(".nutrition-summary-zone").exists()).toBe(false);
    });

    it("M03: 应显示原料名称、用量和单价", () => {
      const wrapper = mountComponent({
        materials: [makeRow({ materialName: "枸杞", quantity: 100, basePrice: 50 })],
      });
      expect(wrapper.text()).toContain("枸杞");
      expect(wrapper.find(".col-qty-edit").exists()).toBe(true);
      expect(wrapper.find(".col-price-edit").exists()).toBe(true);
    });

    it("M04: 药材原料应显示「药材」标签", () => {
      const wrapper = mountComponent({
        materials: [makeRow({ materialType: "herb" })],
      });
      const tags = wrapper.findAll(".t-tag-stub");
      const herbTag = tags.find((t) => t.text() === "药材");
      expect(herbTag).toBeTruthy();
    });

    it("M05: 辅料原料应显示「辅料」标签", () => {
      const wrapper = mountComponent({
        materials: [makeRow({ materialType: "supplement" })],
      });
      const tags = wrapper.findAll(".t-tag-stub");
      const suppTag = tags.find((t) => t.text() === "辅料");
      expect(suppTag).toBeTruthy();
    });
  });

  describe("含量比计算", () => {
    it("M10: 应显示正确的含量比百分比", () => {
      mockCalcMaterialRatio.mockReturnValue(0.36);
      const wrapper = mountComponent({
        materials: [makeRow({ quantity: 1000, materialType: "herb" })],
        finishedWeight: 500,
        ratioFactor: 0.18,
      });
      expect(wrapper.text()).toContain("36.000%");
    });

    it("M11: finishedWeight 为 0 时含量比应显示「—」", () => {
      mockCalcMaterialRatio.mockReturnValue(0);
      const wrapper = mountComponent({
        materials: [makeRow({ quantity: 100 })],
        finishedWeight: 0,
      });
      expect(wrapper.text()).toContain("—");
    });

    it("M12: quantity 为 0 时含量比应显示「—」", () => {
      mockCalcMaterialRatio.mockReturnValue(0);
      const wrapper = mountComponent({
        materials: [makeRow({ quantity: 0 })],
        finishedWeight: 500,
      });
      expect(wrapper.text()).toContain("—");
    });

    it("M13: 药材应使用 ratioFactor 计算含量比", () => {
      mockCalcMaterialRatio.mockReturnValue(0.18);
      mountComponent({
        materials: [makeRow({ quantity: 500, materialType: "herb" })],
        finishedWeight: 500,
        ratioFactor: 0.18,
      });
      expect(mockCalcMaterialRatio).toHaveBeenCalledWith(500, 500, 0.18);
    });

    it("M14: 辅料应使用 supplementRatioFactor 计算含量比", () => {
      mockCalcMaterialRatio.mockReturnValue(1.0);
      mountComponent({
        materials: [makeRow({ quantity: 500, materialType: "supplement" })],
        finishedWeight: 500,
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
      });
      expect(mockCalcMaterialRatio).toHaveBeenCalledWith(500, 500, 1.0);
    });
  });

  describe("含量比校验展示", () => {
    it("M20: 应显示校验徽章和对应 level 样式", () => {
      mockValidateRatio.mockReturnValue(buildValidationResult("warning", 0.96));
      const wrapper = mountComponent({
        materials: [makeRow()],
      });
      const bar = wrapper.find(".ratio-validation-bar");
      expect(bar.exists()).toBe(true);
      expect(bar.classes()).toContain("ratio-validation-bar--warning");
    });

    it("M21: normal 级别应显示「通过」", () => {
      mockValidateRatio.mockReturnValue(buildValidationResult("normal", 1.0));
      const wrapper = mountComponent({ materials: [makeRow()] });
      const badge = wrapper.find(".rv-badge");
      expect(badge.text()).toBe("通过");
    });

    it("M22: warning 级别应显示「预警」", () => {
      mockValidateRatio.mockReturnValue(buildValidationResult("warning", 0.96));
      const wrapper = mountComponent({ materials: [makeRow()] });
      const badge = wrapper.find(".rv-badge");
      expect(badge.text()).toBe("预警");
    });

    it("M23: high_warning 级别应显示「警告」", () => {
      mockValidateRatio.mockReturnValue(buildValidationResult("high_warning", 0.93));
      const wrapper = mountComponent({ materials: [makeRow()] });
      const badge = wrapper.find(".rv-badge");
      expect(badge.text()).toBe("警告");
    });

    it("M24: error 级别应显示「失败」", () => {
      mockValidateRatio.mockReturnValue(buildValidationResult("error", 0.85));
      const wrapper = mountComponent({ materials: [makeRow()] });
      const badge = wrapper.find(".rv-badge");
      expect(badge.text()).toBe("失败");
    });
  });

  describe("单价展示", () => {
    it("M30: 有单价时应显示单价编辑输入框", () => {
      const wrapper = mountComponent({
        materials: [makeRow({ basePrice: 50 })],
      });
      expect(wrapper.find(".col-price-edit").exists()).toBe(true);
    });

    it("M31: 单价为 null 时应显示「未录入」", () => {
      const wrapper = mountComponent({
        materials: [makeRow({ basePrice: null })],
      });
      expect(wrapper.find(".col-price-missing").exists()).toBe(true);
      expect(wrapper.find(".col-price-missing").text()).toBe("未录入");
    });

    it("M32: 有单价和用量时应显示小计金额", () => {
      mockCalcMaterialRatio.mockReturnValue(0.18);
      const wrapper = mountComponent({
        materials: [makeRow({ quantity: 200, basePrice: 50 })],
      });
      const rowSubtotal = wrapper.find(".materials-row .col-subtotal");
      expect(rowSubtotal.text()).toContain("¥");
      expect(rowSubtotal.text()).toContain("10.00");
    });
  });

  describe("移除原料", () => {
    it("M40: 点击删除按钮应 emit update:materials 并移除对应行", async () => {
      const materials = [
        makeRow({ materialName: "枸杞", materialId: "m1" }),
        makeRow({ materialName: "黄芪", materialId: "m2" }),
      ];
      const wrapper = mountComponent({ materials });

      const removeBtn = wrapper.find(".remove-material-btn");
      expect(removeBtn.exists()).toBe(true);
      await removeBtn.trigger("click");
      await flushPromises();

      const confirmBtn = wrapper.find(".popconfirm-confirm-btn");
      expect(confirmBtn.exists()).toBe(true);
      await confirmBtn.trigger("click");
      await flushPromises();

      const emitted = wrapper.emitted("update:materials");
      expect(emitted).toBeTruthy();
      const emittedMaterials = emitted![0][0] as MaterialTableRow[];
      expect(emittedMaterials.length).toBe(1);
      expect(emittedMaterials[0].materialName).toBe("黄芪");
    });
  });
});
