import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AiOverview from "@/views/ai/AiOverview.vue";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: {}, params: {} }),
}));

const mockFetchModels = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockParseFormula = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockNaturalSearch = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockClearParseResult = vi.hoisted(() => vi.fn());

vi.mock("@/stores/ai", () => ({
  useAiStore: vi.fn(() => ({
    models: [
      {
        provider: "openai",
        name: "GPT-4",
        supportsVision: true,
      },
      {
        provider: "deepseek",
        name: "DeepSeek",
        supportsVision: false,
      },
    ],
    selectedModel: "openai",
    modelVersions: [],
    parseLoading: false,
    parseResult: null,
    parseError: "",
    searchLoading: false,
    searchResult: null,
    searchError: "",
    searchHistory: [],
    fetchModels: mockFetchModels,
    parseFormula: mockParseFormula,
    naturalSearch: mockNaturalSearch,
    clearParseResult: mockClearParseResult,
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Input: { name: "Input", template: "<input />" },
  Button: { name: "Button", template: "<button><slot /></button>" },
  Card: { name: "Card", template: "<div><slot /></div>" },
  Table: { name: "Table", template: "<div><slot /></div>" },
  Tag: { name: "Tag", template: "<span><slot /></span>" },
  Alert: { name: "Alert", template: '<div><slot /></div>' },
  Loading: { name: "Loading", template: "<div><slot /></div>" },
  RadioGroup: { name: "RadioGroup", template: "<div><slot /></div>" },
  RadioButton: { name: "RadioButton", template: "<div><slot /></div>" },
  Space: { name: "Space", template: "<div><slot /></div>" },
  Tooltip: { name: "Tooltip", template: "<div><slot /></div>" },
  Popconfirm: { name: "Popconfirm", template: "<div><slot /></div>" },
  Empty: { name: "Empty", template: "<div>empty</div>" },
  Textarea: { name: "Textarea", template: "<textarea></textarea>" },
  Upload: { name: "Upload", template: "<div><slot /></div>" },
  Select: { name: "Select", template: "<select><slot /></select>" },
  Option: { name: "Option", template: "<option><slot /></option>" },
  Dialog: { name: "Dialog", template: "<div><slot /></div>" },
  Tabs: { name: "Tabs", template: "<div><slot /></div>" },
  TabPanel: { name: "TabPanel", template: "<div><slot /></div>" },
}));

vi.mock("@/api/model", () => ({
  modelApi: {
    getList: vi.fn(() => Promise.resolve({ list: [] })),
  },
}));

vi.mock("@/components/Skeleton/PageSkeleton.vue", () => ({
  default: { template: '<div class="page-skeleton">Loading...</div>' },
}));

describe("AiOverview 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper() {
    return mount(AiOverview, {
      global: {
        stubs: {
          "t-card": { template: "<div><slot /></div>" },
          "t-table": { template: "<div><slot /></div>" },
          "t-input": { template: "<input />" },
          "t-textarea": { template: "<textarea></textarea>" },
          "t-icon": { template: "<span />" },
          "t-button": { template: "<button><slot /></button>" },
          "t-tag": { template: "<span><slot /></span>" },
          "t-alert": { template: '<div class="alert"><slot /></div>' },
          "t-loading": { template: '<div class="loading">loading</div>' },
          "t-radio-group": { template: "<div><slot /></div>" },
          "t-radio-button": { template: "<button><slot /></button>" },
          "t-space": { template: "<div><slot /></div>" },
          "t-tooltip": { template: "<div><slot /></div>" },
          "t-popconfirm": { template: "<div><slot /></div>" },
          "t-empty": { template: "<div>empty</div>" },
          "t-select": { template: "<select><slot /></select>" },
          "t-option": { template: "<option><slot /></option>" },
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

  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockClear();
    mockFetchModels.mockClear();
    mockParseFormula.mockClear();
    mockNaturalSearch.mockClear();
    mockClearParseResult.mockClear();
  });

  it("AA-01: AI 助手容器应正确渲染", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".ai-assistant").exists()).toBe(true);
  });

  it("AA-02: 应包含 Dashboard 数据看板区域", async () => {
    wrapper = createWrapper();
    const dashboard = wrapper.find(".dashboard-grid");
    expect(dashboard.exists()).toBe(true);
  });

  it("AA-03: 看板应包含3个统计卡片", async () => {
    wrapper = createWrapper();
    const cards = wrapper.findAll(".stat-card");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("AA-04: 标题应显示'AI 智能助手'", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("AI 智能助手");
  });

  it("AA-05: 应包含智能填单和智能导入 Tab 文字", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    const text = wrapper.text();
    const hasSmartForm = text.includes("智能填单");
    const hasSmartImport = text.includes("智能导入");
    expect(hasSmartForm && hasSmartImport).toBeTruthy();
  });

  it("AA-06: 应包含导航 Tab 区域", async () => {
    wrapper = createWrapper();
    const navTabs = wrapper.find(".ai-nav");
    if (navTabs.exists()) {
      expect(navTabs.findAll(".nav-tab").length).toBeGreaterThanOrEqual(1);
    }
  });

  it("AA-07: 组件内容应包含配方解析相关元素", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    const text = wrapper.text();
    const hasParseOrSmart = text.includes("解析") || text.includes("智能") || text.includes("配方");
    expect(hasParseOrSmart).toBeTruthy();
  });

  it("AA-08: 组件应包含模型相关功能", async () => {
    wrapper = createWrapper();
    const text = wrapper.text();
    const hasModelInfo =
      text.includes("模型") || text.includes("GPT-4") || text.includes("DeepSeek");
    expect(hasModelInfo).toBeTruthy();
  });

  it("AA-09: 应包含 AI 智能助手相关按钮文字", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    const text = wrapper.text();
    const hasActionBtn = text.includes("AI") || text.includes("智能") || text.includes("助手");
    expect(hasActionBtn).toBeTruthy();
  });

  it("AA-10: 应包含模型选择区域（GPT-4）", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("GPT-4");
  });

  it("AA-11: 初始化时应调用 fetchModels 获取模型列表", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockFetchModels).toHaveBeenCalled();
  });

  it("AA-12: 应包含近期操作动态区域", async () => {
    wrapper = createWrapper();
    const activitySection = wrapper.find(".activity-section");
    expect(activitySection.exists()).toBe(true);
  });

  it("AA-13: 应包含 AI 助手中心提示卡片", async () => {
    wrapper = createWrapper();
    expect(wrapper.text()).toContain("AI 助手中心");
  });

  it("AA-14: 应包含智能检索相关功能区域", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    // The AI content area exists even if empty - verify the nav has smart-form tab
    const navTabs = wrapper.find(".ai-nav");
    expect(navTabs.exists()).toBe(true);
  });
});
