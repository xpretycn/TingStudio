import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FormulaEditor from "@/views/formulas/quick-formula/FormulaEditor.vue";
import type { QuickFormulaMaterial } from "@/types/quickFormula";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFormulaData = {
  ratioFactor: 0.18,
  supplementRatioFactor: 1.0,
  finishedWeight: 900,
  packagingPrice: 2,
  otherPrice: 3,
  profitMargin: 30,
  materials: [] as QuickFormulaMaterial[],
};

const mockHerbMaterials = [
  {
    materialId: "m1",
    materialName: "枸杞",
    materialType: "herb" as const,
    quantity: 100,
    unitPrice: 12.5,
    baseUnitPrice: 12.5,
    isPriceAdjusted: false,
    nutrition: { protein: 5, fat: 2, carbohydrate: 20, sodium: 10 },
  },
];

const mockSupplementMaterials = [
  {
    materialId: "m2",
    materialName: "蜂蜜",
    materialType: "supplement" as const,
    quantity: 50,
    unitPrice: 20.0,
    baseUnitPrice: 20.0,
    isPriceAdjusted: false,
    nutrition: { protein: 1, fat: 0, carbohydrate: 80, sodium: 5 },
  },
];

const mockValidate = vi.fn(() => [] as string[]);
const mockUpdateMaterialQuantity = vi.fn();
const mockUpdateMaterialUnitPrice = vi.fn();
const mockRestoreMaterialUnitPrice = vi.fn();
const mockRemoveMaterial = vi.fn();
const mockCalculateMaterialRatio = vi.fn(() => "18.00%");
const mockCalculateMaterialSubtotal = vi.fn(() => 1.25);

vi.mock("@/stores/quickFormula", () => ({
  useQuickFormulaStore: vi.fn(() => ({
    formulaData: mockFormulaData,
    formulaStatus: "new",
    herbMaterials: mockHerbMaterials,
    supplementMaterials: mockSupplementMaterials,
    validate: mockValidate,
    updateMaterialQuantity: mockUpdateMaterialQuantity,
    updateMaterialUnitPrice: mockUpdateMaterialUnitPrice,
    restoreMaterialUnitPrice: mockRestoreMaterialUnitPrice,
    removeMaterial: mockRemoveMaterial,
    calculateMaterialRatio: mockCalculateMaterialRatio,
    calculateMaterialSubtotal: mockCalculateMaterialSubtotal,
  })),
}));

const mockSaveQuickFormula = vi.fn(() => Promise.resolve(true));

vi.mock("@/stores/quickFormulaList", () => ({
  useQuickFormulaListStore: vi.fn(() => ({
    selectedId: "qf1" as string | null,
    saveQuickFormula: mockSaveQuickFormula,
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Icon: { template: "<span class='t-icon-stub' />", props: ["name", "size"] },
  Button: {
    template: "<button class='t-button-stub' :disabled='disabled' @click='$emit(\"click\")'><slot /><slot name='icon' /></button>",
    props: ["variant", "theme", "block", "disabled"],
    emits: ["click"],
  },
  InputNumber: {
    template: "<input class='t-input-number-stub' :value='modelValue ?? value' />",
    props: ["modelValue", "value", "min", "max", "step", "decimalPlaces", "theme", "size"],
    emits: ["update:modelValue", "change"],
  },
  Popconfirm: { template: "<div class='t-popconfirm-stub'><slot /></div>", props: ["content"] },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  return mount(FormulaEditor, {
    global: {
      stubs: {
        "t-icon": { template: "<span class='t-icon-stub' />", props: ["name", "size"] },
        "t-input-number": {
          template: "<input class='t-input-number-stub' :value='modelValue ?? value' />",
          props: ["modelValue", "value", "min", "max", "step", "decimalPlaces", "theme", "size"],
          emits: ["update:modelValue", "change"],
        },
        "t-button": {
          template: "<button class='t-button-stub' :disabled='disabled' @click='$emit(\"click\")'><slot /><slot name='icon' /></button>",
          props: ["variant", "theme", "block", "disabled"],
          emits: ["click"],
        },
        "t-popconfirm": {
          template: "<div class='t-popconfirm-stub'><slot /></div>",
          props: ["content"],
        },
      },
    },
    attachTo: document.body,
  });
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("FormulaEditor", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockFormulaData.ratioFactor = 0.18;
    mockFormulaData.supplementRatioFactor = 1.0;
    mockFormulaData.finishedWeight = 900;
    mockFormulaData.packagingPrice = 2;
    mockFormulaData.otherPrice = 3;
    mockFormulaData.profitMargin = 30;
    mockFormulaData.materials = [...mockHerbMaterials, ...mockSupplementMaterials] as unknown as QuickFormulaMaterial[];
    mockValidate.mockReturnValue([]);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  // =========================================================================
  // E01-E03: Parameter settings
  // =========================================================================

  describe("Parameter settings", () => {
    it("E01: Displays current ratioFactor value", () => {
      wrapper = createWrapper();
      const inputs = wrapper.findAll(".t-input-number-stub");
      expect(inputs[0].attributes("value")).toBe("0.18");
    });

    it("E02: Displays current supplementRatioFactor value", () => {
      wrapper = createWrapper();
      const inputs = wrapper.findAll(".t-input-number-stub");
      expect(inputs[1].attributes("value")).toBe("1");
    });

    it("E03: Displays current finishedWeight value", () => {
      wrapper = createWrapper();
      const inputs = wrapper.findAll(".t-input-number-stub");
      expect(inputs[2].attributes("value")).toBe("900");
    });
  });

  // =========================================================================
  // E10-E13: Material list
  // =========================================================================

  describe("Material list", () => {
    it("E10: Shows materials from store", () => {
      wrapper = createWrapper();
      const rows = wrapper.findAll(".material-row");
      expect(rows.length).toBe(2);
    });

    it("E11: Shows quantity for each material", () => {
      wrapper = createWrapper();
      const qtyInputs = wrapper.findAll(".quantity-input.t-input-number-stub");
      expect(qtyInputs.length).toBeGreaterThanOrEqual(2);
      expect(qtyInputs[0].attributes("value")).toBe("100");
      expect(qtyInputs[1].attributes("value")).toBe("50");
    });

    it("E12: Shows unit price for each material", () => {
      wrapper = createWrapper();
      const priceInputs = wrapper.findAll(".price-input.t-input-number-stub");
      expect(priceInputs.length).toBeGreaterThanOrEqual(2);
      expect(priceInputs[0].attributes("value")).toBe("12.5");
      expect(priceInputs[1].attributes("value")).toBe("20");
    });

    it("E13: Shows ratio percentage for each material", () => {
      wrapper = createWrapper();
      const ratios = wrapper.findAll(".material-ratio");
      expect(ratios.length).toBeGreaterThanOrEqual(2);
      expect(ratios[0].text()).toBe("18.00%");
      expect(ratios[1].text()).toBe("18.00%");
    });
  });

  // =========================================================================
  // E20-E22: Actions
  // =========================================================================

  describe("Actions", () => {
    it("E20: Save button triggers store save", async () => {
      wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const saveBtn = wrapper.findAll(".t-button-stub").find((b) => b.text().includes("保存配方"));
      expect(saveBtn).toBeTruthy();

      await saveBtn!.trigger("click");
      await flushPromises();

      expect(wrapper.emitted("save")).toBeTruthy();
    });

    it("E21: Publish button shows validation errors when invalid", async () => {
      mockValidate.mockReturnValue(["配方名称不能为空", "至少需要添加一种原料"]);

      wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const publishBtn = wrapper.findAll(".t-button-stub").find((b) => b.text().includes("发布配方"));
      expect(publishBtn).toBeTruthy();

      await publishBtn!.trigger("click");
      await wrapper.vm.$nextTick();

      const errors = wrapper.findAll(".error-item");
      expect(errors.length).toBe(2);
      expect(errors[0].text()).toContain("配方名称不能为空");
      expect(errors[1].text()).toContain("至少需要添加一种原料");
      expect(wrapper.emitted("publish")).toBeFalsy();
    });

    it("E22: Publish button opens drawer when valid", async () => {
      mockValidate.mockReturnValue([]);

      wrapper = createWrapper();
      await wrapper.vm.$nextTick();

      const publishBtn = wrapper.findAll(".t-button-stub").find((b) => b.text().includes("发布配方"));
      expect(publishBtn).toBeTruthy();

      await publishBtn!.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".error-item").length).toBe(0);
      expect(wrapper.emitted("publish")).toBeTruthy();
    });
  });
});
