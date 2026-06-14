import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SmartTools from "@/views/ai/SmartTools.vue";

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
}));

const mockFetchModels = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockSwitchVersion = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@/stores/ai", () => ({
  useAiStore: vi.fn(() => ({
    models: [
      { provider: "qwen", name: "通义千问", supportsVision: true },
      { provider: "deepseek", name: "DeepSeek", supportsVision: false },
    ],
    selectedModel: "",
    selectedVersion: "",
    parseHistoryHighlight: null,
    fetchModels: mockFetchModels,
    switchVersion: mockSwitchVersion,
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Card: { name: "Card", template: "<div><slot /></div>" },
  Select: { name: "Select", template: '<div class="t-select"><slot /></div>' },
  OptionGroup: { name: "OptionGroup", template: "<div><slot /></div>" },
  Option: { name: "Option", template: "<div><slot /></div>" },
}));

vi.mock("@/api/model", () => ({
  modelApi: {
    getVersionsByProvider: vi.fn(() =>
      Promise.resolve({
        versions: [{ value: "qwen-max", label: "qwen-max" }],
      }),
    ),
  },
}));

vi.mock("@/components/Skeleton/PageSkeleton.vue", () => ({
  default: { template: '<div class="page-skeleton" />' },
}));

vi.mock("@/views/ai/tabs/FormulaParseTab.vue", () => ({
  default: {
    template: '<div class="tab-formula-parse">智能填单</div>',
    emits: ["activity-add"],
  },
}));

vi.mock("@/views/ai/tabs/MaterialImportTab.vue", () => ({
  default: {
    template: '<div class="tab-material-import">智能导入</div>',
    emits: ["activity-add"],
  },
}));

vi.mock("@/views/ai/tabs/DataSearchTab.vue", () => ({
  default: {
    template: '<div class="tab-data-search">智能查询</div>',
  },
}));

vi.mock("@/views/ai/tabs/ParseHistoryTab.vue", () => ({
  default: {
    template: '<div class="tab-parse-history">解析历史</div>',
  },
}));

describe("SmartTools 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper() {
    return mount(SmartTools, {
      global: {
        stubs: {
          "t-card": { template: "<div><slot /></div>" },
          "t-icon": { template: "<span />" },
          "t-select": {
            template: '<div class="t-select-stub"><slot /></div>',
          },
          "t-option-group": { template: "<div><slot /></div>" },
          "t-option": { template: "<div><slot /></div>" },
          Transition: {
            setup(_, { slots }) {
              return () => slots.default?.();
            },
          },
          PageSkeleton: true,
        },
      },
    });
  }

  beforeEach(async () => {
    setActivePinia(createPinia());
    mockFetchModels.mockClear();
    mockSwitchVersion.mockClear();
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
  });

  it("ST01: 渲染 4 个选项卡按钮", () => {
    const tabButtons = wrapper.findAll(".toolbar-tab");
    expect(tabButtons.length).toBe(4);

    const labels = tabButtons.map((btn) => btn.text().trim());
    expect(labels).toContain("智能填单");
    expect(labels).toContain("智能导入");
    expect(labels).toContain("智能查询");
    expect(labels).toContain("解析历史");
  });

  it("ST02: 默认激活选项卡为智能填单 (smart-form)", () => {
    const activeTab = wrapper.find(".toolbar-tab.active");
    expect(activeTab.exists()).toBe(true);
    expect(activeTab.text().trim()).toBe("智能填单");

    const panels = wrapper.findAll(".tab-panel");
    expect(panels.length).toBe(4);
    const shownPanels = panels.filter((p) => p.isVisible());
    expect(shownPanels.length).toBeGreaterThanOrEqual(1);
    expect(wrapper.find(".tab-formula-parse").exists()).toBe(true);
  });

  it("ST03: 点击不同选项卡切换显示内容", async () => {
    const tabButtons = wrapper.findAll(".toolbar-tab");

    await tabButtons[1].trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".tab-material-import").exists()).toBe(true);
    expect(tabButtons[1].classes()).toContain("active");

    await tabButtons[2].trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".tab-data-search").exists()).toBe(true);
    expect(tabButtons[2].classes()).toContain("active");

    await tabButtons[3].trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".tab-parse-history").exists()).toBe(true);
    expect(tabButtons[3].classes()).toContain("active");
  });

  it("ST04: 模型选择器可见", () => {
    expect(wrapper.find(".model-select-inline").exists()).toBe(true);
  });
});
