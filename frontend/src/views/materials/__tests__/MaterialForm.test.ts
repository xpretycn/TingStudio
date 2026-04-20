import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MaterialForm from "@/views/materials/MaterialForm.vue";

const push = vi.fn();
const mockRoute = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute,
}));

const mockCreateMaterial = vi.fn();
const mockUpdateMaterial = vi.fn();

vi.mock("@/stores/material", () => ({
  useMaterialStore: vi.fn(() => ({
    createMaterial: mockCreateMaterial,
    updateMaterial: mockUpdateMaterial,
    getMaterial: vi.fn(),
  })),
}));

vi.mock("@/stores/ai", () => ({
  useAiStore: vi.fn(() => ({
    models: [],
    selectedModel: "",
    materialParseLoading: false,
    materialParseResult: null,
    materialParseError: "",
    fetchModels: vi.fn(),
  })),
}));

vi.mock("@/api/nutrition", () => ({
  nutritionApi: {
    save: vi.fn(),
  },
}));

vi.mock("@/api/material", () => ({
  materialApi: {
    getNextCode: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("MaterialForm 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  const createWrapper = (params: Record<string, string> = {}) => {
    setActivePinia(createPinia());
    Object.assign(mockRoute.params, params);
    Object.assign(mockRoute.query, {});
    vi.clearAllMocks();

    return mount(MaterialForm, {
      global: {
        stubs: {
          "t-icon": { template: "<span></span>" },
          "t-input": { template: "<input />", props: ["modelValue"] },
          "t-radio-group": { template: "<div><slot /></div>", props: ["modelValue"] },
          "t-radio": { template: "<label><slot /></label>", props: ["value"] },
          "t-radio-button": { template: "<label><slot /></label>", props: ["value"] },
          "t-select": { template: "<select><slot /></select>", props: ["modelValue", "options"] },
          "t-input-number": { template: '<input type="number" />', props: ["modelValue"] },
          "t-form": { template: "<form><slot /></form>", props: ["data", "rules"] },
          "t-button": true,
          "t-card": true,
          "t-tag": true,
          "t-collapse": { template: "<div><slot /></div>", props: ["value"] },
          "t-collapse-panel": { template: "<div><slot /></div>", props: ["value"] },
          "t-space": true,
          "t-table": true,
          "t-alert": { template: '<div><slot name="title" /><slot /></div>' },
          "t-upload": { template: '<div class="upload-stub"><slot /></div>' },
          "t-dropdown": { template: "<div><slot /></div>" },
          "t-dropdown-menu": { template: "<div><slot /></div>" },
          "t-dropdown-item": { template: "<div><slot /></div>" },
        },
      },
    });
  };

  beforeEach(() => {
    mockRoute.params = {};
    mockRoute.query = {};
  });

  it("MF01: 新建模式应显示「新增原料」标题", () => {
    wrapper = createWrapper({});
    const titles = wrapper.findAll(".formula-title");
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(titles[0].text()).toContain("新增原料");
  });

  it("MF02: 编辑模式应显示「编辑原料」标题", () => {
    wrapper = createWrapper({ id: "mat-001" });
    const titles = wrapper.findAll(".formula-title");
    expect(titles[0].text()).toContain("编辑原料");
  });

  it("MF03: 新建模式保存按钮应显示「创建」文本", () => {
    wrapper = createWrapper({});
    const saveBtns = wrapper.findAll(".header-action-btn");
    const primary = saveBtns.find(b => !b.classes().includes("secondary"));
    expect(primary).toBeTruthy();
    expect(primary!.text()).toContain("创建");
  });

  it("MF04: 编辑模式保存按钮应显示「保存」文本", () => {
    wrapper = createWrapper({ id: "mat-001" });
    const saveBtns = wrapper.findAll(".header-action-btn");
    const primary = saveBtns.find(b => !b.classes().includes("secondary"));
    expect(primary).toBeTruthy();
    expect(primary!.text()).toContain("保存");
  });

  it("MF05: 点击返回按钮应导航到 /materials", async () => {
    wrapper = createWrapper({});
    const backBtn = wrapper.find(".header-back-btn");
    await backBtn.trigger("click");

    expect(push).toHaveBeenCalledWith("/materials");
  });

  it("MF06: 点击取消按钮应导航到 /materials", async () => {
    wrapper = createWrapper({});
    const cancelBtn = wrapper.find(".header-action-btn.secondary");
    await cancelBtn.trigger("click");

    expect(push).toHaveBeenCalledWith("/materials");
  });

  it("MF07: 编辑模式下 AI 面板应有禁用样式", () => {
    wrapper = createWrapper({ id: "mat-001" });
    const aiPanel = wrapper.find(".ai-panel--disabled");
    expect(aiPanel.exists()).toBe(true);
  });

  it("MF08: 新建模式下 AI 面板不应有禁用样式", () => {
    wrapper = createWrapper({});
    const aiPanel = wrapper.find(".ai-panel--disabled");
    expect(aiPanel.exists()).toBe(false);
  });

  it("MF09: 营养素区域默认不显示（showNutrition=false）", () => {
    wrapper = createWrapper({});
    const nutritionSec = wrapper.find(".nutrition-sec");
    expect(nutritionSec.exists()).toBe(false);
  });

  it('MF10: handleBack 应调用 router.push("/materials")', async () => {
    wrapper = createWrapper({});
    const vm = wrapper.vm as any;
    vm.handleBack();

    expect(push).toHaveBeenCalledWith("/materials");
  });
});
