import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FormulaDetail from "@/views/formulas/FormulaDetail.vue";

const push = vi.fn();
const mockRoute = vi.hoisted(() => ({
  params: { id: "f1-test-id" } as Record<string, string>,
  query: {} as Record<string, string>,
}));

const mockGetFormulaNutritionTables = vi.hoisted(() => vi.fn());
const mockGetById = vi.hoisted(() => vi.fn());
const mockGetPriceQuote = vi.hoisted(() => vi.fn());

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute,
}));

vi.mock("@/api/nutrition", () => ({
  nutritionApi: {
    getFormulaNutritionTables: mockGetFormulaNutritionTables,
  },
}));

vi.mock("@/api/formula", () => ({
  formulaApi: {
    getById: mockGetById,
    getPriceQuote: mockGetPriceQuote,
  },
}));

vi.mock("@/stores/export", () => ({
  useExportStore: vi.fn(() => ({
    templates: [],
    fetchTemplates: vi.fn(),
    createJob: vi.fn(),
    downloadFile: vi.fn(),
  })),
}));

vi.mock("@/utils/ratioValidation", () => ({
  validateRatioFull: vi.fn(() => ({
    level: "normal",
    totalRatio: 1.0,
    breakdown: [],
    thresholds: {
      normalLow: 0.98,
      normalHigh: 1.02,
      warningLow: 0.95,
      warningHigh: 1.05,
      highWarningLow: 0.92,
      highWarningHigh: 1.08,
    },
    message: "含量比校验通过",
    description: "在正常范围内",
    allowed: true,
    requiresManualReview: false,
  })),
  RATIO_THRESHOLDS: {
    normalLow: 0.98,
    normalHigh: 1.02,
    warningLow: 0.95,
    warningHigh: 1.05,
    highWarningLow: 0.92,
    highWarningHigh: 1.08,
  },
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Alert: { name: "Alert", template: '<div><slot name="message" /><slot /></div>' },
  Tag: { name: "Tag", template: "<span><slot /></span>" },
  Tooltip: { name: "Tooltip", template: '<div><slot /></div>' },
  Table: { name: "Table", template: '<div class="t-table-stub"><slot /></div>' },
  Empty: { name: "Empty", template: '<div class="t-empty-stub" />' },
  Drawer: { name: "Drawer", template: '<div class="t-drawer-stub"><slot /><slot name="footer" /></div>' },
  Form: { name: "Form", template: '<form><slot /></form>' },
  FormItem: { name: "FormItem", template: '<div><slot /></div>' },
  RadioGroup: { name: "RadioGroup", template: '<div><slot /></div>' },
  RadioButton: { name: "RadioButton", template: '<div><slot /></div>' },
  Select: { name: "Select", template: '<select><slot /></select>' },
  Option: { name: "Option", template: '<option><slot /></option>' },
  Switch: { name: "Switch", template: '<input type="checkbox" />' },
  Button: { name: "Button", template: '<button><slot /></button>' },
}));

const mockNutritionData = {
  formulaId: "f1-test-id",
  formulaName: "测试配方A",
  finishedWeight: 500,
  ratioFactor: 0.18,
  supplementRatioFactor: 1.0,
  version: "V2.0",
  per100g: { energy: 1200, protein: 12.5, fat: 8.3, carbohydrate: 45.0, sodium: 200 },
  nrv: { energy: 14, protein: 21, fat: 14, carbohydrate: 15, sodium: 10 },
  energy: 1200,
  calcRows: [
    {
      materialId: "m1",
      name: "枸杞",
      quantity: 100,
      materialType: "herb",
      ratio: 0.036,
      energy: 1200,
      protein: 13.0,
      fat: 1.0,
      carbohydrate: 60.0,
      sodium: 50,
      hasEmptyNutrition: false,
      emptyNutritionFields: [],
    },
    {
      materialId: "m2",
      name: "蜂蜜",
      quantity: 50,
      materialType: "supplement",
      ratio: 0.1,
      energy: 1380,
      protein: 0.3,
      fat: 0.0,
      carbohydrate: 82.0,
      sodium: 5,
      hasEmptyNutrition: false,
      emptyNutritionFields: [],
    },
  ],
  summaryRow: { name: "合计", quantity: 150, energy: 1250, protein: 10.0, fat: 0.7, carbohydrate: 65.0, sodium: 35 },
  nrvRow: { name: "NRV", energy: 14.9, protein: 16.7, fat: 1.1, carbohydrate: 21.7, sodium: 1.8 },
  nrvPercentRow: { name: "NRV%", nrvPercent: 14.9 },
  labelRows: [
    { item: "能量", value: 1200, unit: "kJ", nrvPercent: 14.0, zeroThreshold: "≤17kJ", tolerance: "≤20%" },
    { item: "蛋白质", value: 12.5, unit: "g", nrvPercent: 21.0, zeroThreshold: "≤0.5g", tolerance: "≥20%" },
    { item: "脂肪", value: 8.3, unit: "g", nrvPercent: 14.0, zeroThreshold: "≤0.5g", tolerance: "≤20%" },
    { item: "碳水化合物", value: 45.0, unit: "g", nrvPercent: 15.0, zeroThreshold: "≤0.5g", tolerance: "≤20%" },
    { item: "钠", value: 200, unit: "mg", nrvPercent: 10.0, zeroThreshold: "≤5mg", tolerance: "≤20%" },
  ],
  missingNutritionMaterials: [],
  salesmanName: "张三",
  salesmanDept: "销售一部",
  demandTitle: "新品开发需求",
  demandCode: "D001",
  demandPriority: "高",
  remark: "测试备注",
  updatedAt: "2026-05-03T14:21:47.611Z",
  versionHistory: [
    { version: "V1.0", createdAt: "2026-04-01T00:00:00.000Z", note: "初始版本" },
  ],
};

describe("FormulaDetail 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper() {
    return mount(FormulaDetail, {
      global: {
        stubs: {
          "router-link": { template: '<a><slot /></a>' },
          "t-icon": { template: '<span class="t-icon" />' },
          "t-table": {
            template: '<div class="t-table-stub"><slot /></div>',
          },
          "t-alert": { template: '<div class="t-alert-stub"><slot name="message" /></div>' },
          "t-tag": { template: '<span class="t-tag-stub"><slot /></span>' },
          "t-tooltip": { template: '<div class="t-tooltip-stub"><slot /></div>' },
          "t-empty": { template: '<div class="t-empty-stub" />' },
          "t-drawer": { template: '<div class="t-drawer-stub"><slot /><slot name="footer" /></div>' },
          "t-form": { template: '<form><slot /></form>' },
          "t-form-item": { template: '<div><slot /></div>' },
          "t-radio-group": { template: '<div><slot /></div>' },
          "t-radio-button": { template: '<div><slot /></div>' },
          "t-select": { template: '<select><slot /></select>' },
          "t-option": { template: '<option><slot /></option>' },
          "t-switch": { template: '<input type="checkbox" />' },
          "t-button": { template: '<button><slot /></button>' },
        },
      },
    });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockClear();
    mockRoute.params = { id: "f1-test-id" };
    mockRoute.query = {};
    mockGetFormulaNutritionTables.mockReset();
    mockGetFormulaNutritionTables.mockResolvedValue(mockNutritionData);
    mockGetById.mockReset();
    mockGetById.mockResolvedValue({ status: "draft" });
    mockGetPriceQuote.mockReset();
    mockGetPriceQuote.mockResolvedValue(null);
  });

  it("D05: 应显示加载状态", async () => {
    let resolvePromise: (value: unknown) => void;
    mockGetFormulaNutritionTables.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; })
    );

    wrapper = createWrapper();
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".formula-detail").exists()).toBe(true);

    resolvePromise!(mockNutritionData);
    await flushPromises();
  });

  it("D01: 应显示配方名称和基础信息", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("测试配方A");
    expect(wrapper.text()).toContain("500g");
    expect(wrapper.text()).toContain("18%");
    expect(wrapper.text()).toContain("2 种");
  });

  it("D01: 应显示版本标签", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("V2.0");
  });

  it("D01: 应显示配方概况卡片", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("配方概况");
    expect(wrapper.text()).toContain("配方编号");
    expect(wrapper.text()).toContain("成品重量");
    expect(wrapper.text()).toContain("比例因子");
    expect(wrapper.text()).toContain("原料数量");
    expect(wrapper.text()).toContain("营养状态");
  });

  it("D01: 应显示面包屑导航", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("配方管理");
    expect(wrapper.text()).toContain("配方详情");
  });

  it("D02: 应显示原料列表和营养值", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("配方营养数据自动计算");
    expect(wrapper.text()).toContain("成品总重");
    expect(wrapper.text()).toContain("500");
  });

  it("D02: 应显示关联业务员信息", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("张三");
    expect(wrapper.text()).toContain("销售一部");
  });

  it("D02: 应显示需求信息", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("新品开发需求");
    expect(wrapper.text()).toContain("D001");
  });

  it("D02: 应显示备注信息", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("测试备注");
  });

  it("D03: 应显示含量比校验区域", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("含量比校验");
    expect(wrapper.text()).toContain("含量比校验通过");
    expect(wrapper.text()).toContain("含量比总和");
  });

  it("D03: 应显示含量比校验详情表格", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("查看各原料含量比明细");
  });

  it("D04: 应显示营养成分表", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("营养成分表");
  });

  it("D04: 应显示使用说明", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("使用说明");
    expect(wrapper.text()).toContain("含量比指原料在成品中含量比");
  });

  it("D04: 应显示变更记录时间线", async () => {
    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("变更记录");
    expect(wrapper.text()).toContain("V2.0");
    expect(wrapper.text()).toContain("V1.0");
    expect(wrapper.text()).toContain("初始版本");
  });

  it("D10: 编辑按钮应导航到编辑页面", async () => {
    wrapper = createWrapper();
    await flushPromises();

    const editBtn = wrapper.findAll(".header-action-btn").find((btn) => btn.text().includes("编辑配方"));
    expect(editBtn).toBeDefined();
    await editBtn!.trigger("click");

    expect(push).toHaveBeenCalledWith("/formulas/f1-test-id/edit");
  });

  it("D11: 导出按钮应打开导出抽屉", async () => {
    wrapper = createWrapper();
    await flushPromises();

    const exportBtn = wrapper.findAll(".header-action-btn").find((btn) => btn.text().includes("导出配方"));
    expect(exportBtn).toBeDefined();
    await exportBtn!.trigger("click");

    await wrapper.vm.$nextTick();
    expect(wrapper.find(".t-drawer-stub").exists()).toBe(true);
  });

  it("D01: 无数据时不渲染主内容", async () => {
    mockGetFormulaNutritionTables.mockRejectedValue(new Error("API error"));

    wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find(".detail-header").exists()).toBe(false);
  });
});
