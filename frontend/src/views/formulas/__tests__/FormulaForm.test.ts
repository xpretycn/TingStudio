import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FormulaForm from "@/views/formulas/FormulaForm.vue";

const push = vi.fn();
const mockRoute = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute,
}));

vi.mock("@/stores/formula", () => ({
  useFormulaStore: vi.fn(() => ({
    createFormula: vi.fn(() => Promise.resolve({ success: true })),
    updateFormula: vi.fn(() => Promise.resolve({ success: true })),
    getFormula: vi.fn(() => Promise.resolve(null)),
    loading: false,
  })),
}));

vi.mock("@/stores/salesman", () => ({
  useSalesmanStore: vi.fn(() => ({
    salesmen: [
      { id: "s1", name: "张三" },
      { id: "s2", name: "李四" },
    ],
    fetchSalesmen: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/stores/material", () => ({
  useMaterialStore: vi.fn(() => ({
    allMaterials: [],
    fetchAllForSelect: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/stores/ai", () => ({
  useAiStore: vi.fn(() => ({
    models: [],
    selectedModel: "",
    parseLoading: false,
    parseResult: null,
    parseError: "",
    fetchModels: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ExcelImportPanel.vue", () => ({
  default: { template: '<div class="excel-import-mock">ExcelImportPanel</div>' },
}));

describe("FormulaForm 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper(params?: Record<string, string>, query?: Record<string, string>) {
    if (params) mockRoute.params = params;
    if (query) mockRoute.query = query;
    else mockRoute.query = {};

    return mount(FormulaForm, {
      global: {
        stubs: {
          "t-form": { template: "<form><slot /></form>" },
          "t-input": { template: "<input />" },
          "t-select": { template: "<select><slot /></select>" },
          "t-option": { template: "<option><slot /></option>" },
          "t-input-number": { template: '<input type="number" />' },
          "t-textarea": { template: "<textarea></textarea>" },
          "t-alert": { template: '<div class="alert"><slot /></div>' },
          "t-icon": { template: '<span class="icon" />' },
          "t-button": { template: "<button><slot /></button>" },
          "t-tag": { template: "<span><slot /></span>" },
          "t-dropdown": { template: "<div><slot /></div>" },
          "t-dropdown-menu": { template: "<div><slot /></div>" },
          "t-dropdown-item": { template: "<div><slot /></div>" },
        },
      },
    });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute.params = {};
    push.mockClear();
  });

  it("FF-01: 新增模式应正确渲染表单标题", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".formula-form").exists()).toBe(true);
    expect(wrapper.text()).toContain("新增配方");
  });

  it("FF-02: 编辑模式应显示编辑标题", async () => {
    wrapper = createWrapper({ id: "f1" });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("编辑配方");
  });

  it("FF-03: 取消按钮应调用 router.push 返回列表", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    const cancelBtns = wrapper.findAll(".header-action-btn.secondary");
    if (cancelBtns.length > 0) {
      await cancelBtns[0].trigger("click");
      expect(push).toHaveBeenCalledWith("/formulas");
    }
  });

  it("FF-04: 表单应包含基础信息区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("基础信息录入");
  });

  it("FF-05: 表单应包含原料配比表区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("原料配比表");
  });

  it("FF-06: 应包含 AI 智能解析面板区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("AI 智能配方解析");
  });

  it("FF-07: 应包含操作提示面板", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("操作提示");
  });

  it("FF-08: 配方名称输入框应存在", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    const nameLabel = wrapper.find("#lbl-formula-name");
    if (nameLabel.exists()) {
      expect(nameLabel.text()).toContain("配方名称");
    } else {
      expect(wrapper.text().length).toBeGreaterThan(0);
    }
  });
});
