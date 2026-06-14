import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import ModelManagement from "@/views/system/ModelManagement.vue";

// ─── Router mock ───
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
}));

// ─── hoisted data & mocks via vi.hoisted ───
const mockModels = vi.hoisted(() => [
  {
    id: "m1", provider: "dashscope", name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/v1",
    apiKeyConfigured: true, model: "qwen-plus", visionModel: "qwen-vl-plus", description: "",
    supportsVision: true, healthStatus: "healthy", healthCheckIntervalDays: 7,
    fallbackProvider: "", todayCalls: 120, todayTokens: 45000, monthTokens: 1200000, sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z", visionMaxTokens: 4096,
  },
  {
    id: "m2", provider: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1",
    apiKeyConfigured: true, model: "deepseek-chat", visionModel: "", description: "",
    supportsVision: false, healthStatus: "healthy", healthCheckIntervalDays: 3,
    fallbackProvider: "", todayCalls: 80, todayTokens: 32000, monthTokens: 950000, sortOrder: 2,
    createdAt: "2026-01-15T00:00:00.000Z", updatedAt: "2026-05-03T00:00:00.000Z", visionMaxTokens: null,
  },
  {
    id: "m3", provider: "zhipu", name: "智谱", baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyConfigured: false, model: "glm-4-flash", visionModel: "", description: "",
    supportsVision: false, healthStatus: "unknown", healthCheckIntervalDays: 1,
    fallbackProvider: "", todayCalls: 0, todayTokens: 0, monthTokens: 0, sortOrder: 3,
    createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-04-20T00:00:00.000Z", visionMaxTokens: null,
  },
]);

const mockStats = vi.hoisted(() => ({
  totalModels: 5, configuredModels: 3, todayCalls: 200, todayTokens: 77000, monthTokens: 2150000, activeAlerts: 1,
}));

const mockAlertConfigs = vi.hoisted(() => [
  { id: "ac1", modelId: "m1", provider: "dashscope", modelName: "通义千问", dailyCallLimit: 10000, monthlyTokenLimit: 5000000, warningThreshold: 80, criticalThreshold: 95, enabled: 1 },
  { id: "ac2", modelId: "m2", provider: "deepseek", modelName: "DeepSeek", dailyCallLimit: 5000, monthlyTokenLimit: 3000000, warningThreshold: 85, criticalThreshold: 95, enabled: 1 },
]);

const mockAlertRecords = vi.hoisted(() => [
  { id: "ar1", provider: "dashscope", modelName: "通义千问", alertType: "daily_call", level: "warning", threshold: 80, currentValue: 8200, limitValue: 10000, message: "今日调用次数已达82%", isRead: 0, createdAt: "2026-05-03T10:00:00.000Z" },
  { id: "ar2", provider: "deepseek", modelName: "DeepSeek", alertType: "month_token", level: "critical", threshold: 95, currentValue: 2850000, limitValue: 3000000, message: "本月Token使用已达95%", isRead: 0, createdAt: "2026-05-02T14:00:00.000Z" },
]);

const mockUsageSummary = vi.hoisted(() => [
  { provider: "dashscope", name: "通义千问", totalCalls: 15000, totalTokens: 45000000, todayCalls: 120, todayTokens: 45000, monthCalls: 3500, monthTokens: 1200000, avgLatencyMs: 1200 },
  { provider: "deepseek", name: "DeepSeek", totalCalls: 8500, totalTokens: 28000000, todayCalls: 80, todayTokens: 32000, monthCalls: 2800, monthTokens: 950000, avgLatencyMs: 800 },
]);

const mockUsageTrend = vi.hoisted(() => [
  { date: "2026-04-28", dashscope: 38000, deepseek: 25000 },
  { date: "2026-04-29", dashscope: 42000, deepseek: 28000 },
  { date: "2026-04-30", dashscope: 35000, deepseek: 30000 },
  { date: "2026-05-01", dashscope: 40000, deepseek: 27000 },
  { date: "2026-05-02", dashscope: 45000, deepseek: 32000 },
]);

const mockUsageDistribution = vi.hoisted(() => [
  { provider: "dashscope", name: "通义千问", tokens: 1200000, calls: 3500 },
  { provider: "deepseek", name: "DeepSeek", tokens: 950000, calls: 2800 },
]);

const mockUsageLogs = vi.hoisted(() => [
  { id: "log1", provider: "dashscope", modelName: "通义千问", model: "qwen-plus", callType: "parse_formula", promptTokens: 450, completionTokens: 820, totalTokens: 1270, latencyMs: 1500, status: "success", errorMessage: null, requestSummary: "解析配方 #123", userId: null, fallbackFrom: null, applicationName: "智能配方", applicationLocation: "配方管理", createdAt: "2026-05-03T14:21:47.000Z" },
  { id: "log2", provider: "deepseek", modelName: "DeepSeek", model: "deepseek-chat", callType: "natural_search", promptTokens: 320, completionTokens: 640, totalTokens: 960, latencyMs: 900, status: "success", errorMessage: null, requestSummary: "自然检索：甘草功效", userId: null, fallbackFrom: null, applicationName: "智能检索", applicationLocation: "全局搜索", createdAt: "2026-05-03T14:20:00.000Z" },
  { id: "log3", provider: "dashscope", modelName: "通义千问", model: "qwen-plus", callType: "health_check", promptTokens: 100, completionTokens: 50, totalTokens: 150, latencyMs: null, status: "error", errorMessage: "Timeout", requestSummary: null, userId: null, fallbackFrom: null, applicationName: null, applicationLocation: null, createdAt: "2026-05-03T14:19:00.000Z" },
]);

const mockApplications = vi.hoisted(() => [
  { id: "app1", module: "weekly-report", moduleName: "周报AI分析", provider: "dashscope", model: "qwen-plus", description: "周报生成", enabled: true, createdBy: "admin", createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-04-15T00:00:00.000Z" },
  { id: "app2", module: "smart-search", moduleName: "智能数据检索", provider: "deepseek", model: "deepseek-chat", description: "", enabled: false, createdBy: "admin", createdAt: "2026-03-10T00:00:00.000Z", updatedAt: "2026-04-20T00:00:00.000Z" },
]);

const mockPromptTemplates = vi.hoisted(() => [
  { id: "pt1", module: "smart-generate", name: "标准配方描述", type: "description", systemPrompt: "你是专业配方描述生成助手", userPromptTemplate: "配方名称：{{formulaName}}", variables: ["formulaName", "materials"], isDefault: true, enabled: true, sortOrder: 1 },
  { id: "pt2", module: "smart-generate", name: "简略描述", type: "description", systemPrompt: "", userPromptTemplate: "简要描述：{{formulaName}}", variables: ["formulaName"], isDefault: false, enabled: true, sortOrder: 2 },
]);

const mockActivityItems = vi.hoisted(() => [
  { type: "success" as const, title: "模型健康检测通过", desc: "通义千问 健康检测正常", time: "2026-05-03T14:00:00.000Z", provider: "dashscope" },
  { type: "info" as const, title: "版本切换", desc: "DeepSeek 切换至 deepseek-chat", time: "2026-05-03T13:30:00.000Z", provider: "deepseek" },
]);

const mockFloatConfig = vi.hoisted(() => ({
  id: "fc1", userId: "u1", enabled: true, model: "deepseek", modelName: "deepseek-chat",
  fallbackModel: "dashscope", fallbackModelName: "qwen-plus", position: "right" as const,
  drawerWidth: 400, themeColor: "", showPulse: true, enabledPages: ["formula-add", "formula-edit"],
  maxRounds: 10, updatedAt: "2026-05-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z",
}));

const mockVersionsByProvider = vi.hoisted(() => ({
  dashscope: { provider: "dashscope", currentModel: "qwen-plus", versions: [{ value: "qwen-plus", label: "Qwen Plus" }, { value: "qwen-turbo", label: "Qwen Turbo" }, { value: "qwen-max", label: "Qwen Max" }] },
  deepseek: { provider: "deepseek", currentModel: "deepseek-chat", versions: [{ value: "deepseek-chat", label: "V3 Chat" }, { value: "deepseek-v4-flash", label: "V4 Flash" }] },
  zhipu: { provider: "zhipu", currentModel: "glm-4-flash", versions: [{ value: "glm-4-flash", label: "GLM-4 Flash" }, { value: "glm-4-air", label: "GLM-4 Air" }] },
}));

// ─── Store mocks (vi.hoisted so vi.mock can reference) ───
const mockModelStoreObj = vi.hoisted(() => ({
  models: [] as typeof mockModels,
  stats: { totalModels: 0, configuredModels: 0, todayCalls: 0, todayTokens: 0, monthTokens: 0, activeAlerts: 0 },
  loading: false,
  usageSummary: [] as typeof mockUsageSummary,
  usageTrend: [] as typeof mockUsageTrend,
  usageDistribution: [] as typeof mockUsageDistribution,
  usageLogs: [] as typeof mockUsageLogs,
  usageLogsTotal: 0,
  alertConfigs: [] as typeof mockAlertConfigs,
  alertRecords: [] as typeof mockAlertRecords,
  alertRecordsTotal: 0,
  activeAlerts: 0,
  healthHistory: [],
  fetchModels: vi.fn().mockResolvedValue(undefined),
  createModel: vi.fn().mockResolvedValue({ id: "m-new" }),
  updateModel: vi.fn().mockResolvedValue({}),
  deleteModel: vi.fn().mockResolvedValue({}),
  testConnection: vi.fn().mockResolvedValue({ success: true }),
  fetchUsageStats: vi.fn().mockResolvedValue(undefined),
  fetchUsageLogs: vi.fn().mockResolvedValue(undefined),
  fetchAlertConfigs: vi.fn().mockResolvedValue(undefined),
  updateAlertConfig: vi.fn().mockResolvedValue({}),
  fetchAlertRecords: vi.fn().mockResolvedValue(undefined),
  fetchHealthHistory: vi.fn().mockResolvedValue(undefined),
}));

const mockAuthStoreObj = vi.hoisted(() => ({
  user: { id: "u1", username: "admin", role: "admin" },
  isAuthenticated: true,
}));

const mockFloatAgentStoreObj = vi.hoisted(() => ({
  config: { enabled: true, model: "deepseek", modelName: "deepseek-chat", fallbackModel: "", fallbackModelName: "", position: "right" as const, drawerWidth: 400, themeColor: "", showPulse: true, enabledPages: [], maxRounds: 10 },
  loadConfig: vi.fn().mockResolvedValue(undefined),
}));

const mockModelApi = vi.hoisted(() => ({
  getModels: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  testConnection: vi.fn(),
  getUsageStats: vi.fn(),
  getUsageLogs: vi.fn(),
  getAlertConfigs: vi.fn(),
  updateAlertConfig: vi.fn(),
  getAlertRecords: vi.fn(),
  getVersionsByProvider: vi.fn(),
  getRecentActivity: vi.fn(),
  getModelApplications: vi.fn(),
  createModelApplication: vi.fn(),
  updateModelApplication: vi.fn(),
  patchModelApplication: vi.fn(),
  deleteModelApplication: vi.fn(),
  getPromptTemplates: vi.fn(),
  createPromptTemplate: vi.fn(),
  updatePromptTemplate: vi.fn(),
  deletePromptTemplate: vi.fn(),
}));

const mockAgentApi = vi.hoisted(() => ({
  getFloatConfig: vi.fn(),
  updateFloatConfig: vi.fn(),
}));

// ─── vi.mock calls (hoisted by vitest) ───
vi.mock("@/stores/model", () => ({
  useModelStore: () => mockModelStoreObj,
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => mockAuthStoreObj,
}));

vi.mock("@/stores/floatAgent", () => ({
  useFloatAgentStore: () => mockFloatAgentStoreObj,
}));

vi.mock("@/api/model", () => ({
  modelApi: mockModelApi,
}));

vi.mock("@/api/agent", () => ({
  agentApi: mockAgentApi,
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Button: { name: "Button", template: "<button><slot /></button>" },
  Card: { name: "Card", template: "<div><slot /></div>" },
  Dialog: { name: "Dialog", template: "<div><slot /></div>" },
  Select: { name: "Select", template: "<select><slot /></select>" },
  Option: { name: "Option", template: "<option><slot /></option>" },
  Switch: { name: "Switch", template: "<input type='checkbox' />" },
  Input: { name: "Input", template: "<input />" },
  Textarea: { name: "Textarea", template: "<textarea></textarea>" },
  Form: { name: "Form", template: "<form><slot /></form>" },
  FormItem: { name: "FormItem", template: "<div><slot /></div>" },
  Table: { name: "Table", template: "<div><slot /></div>" },
  Tag: { name: "Tag", template: "<span><slot /></span>" },
  Popconfirm: { name: "Popconfirm", template: "<span><slot /></span>" },
  Loading: { name: "Loading", template: "<span><slot /></span>" },
  Drawer: { name: "Drawer", template: "<div><slot /></div>" },
  Checkbox: { name: "Checkbox", template: "<label><input type='checkbox' /><slot /></label>" },
  CheckboxGroup: { name: "CheckboxGroup", template: "<div><slot /></div>" },
  InputNumber: { name: "InputNumber", template: "<input type='number' />" },
  DateRangePicker: { name: "DateRangePicker", template: "<input />" },
  OptionGroup: { name: "OptionGroup", template: "<optgroup><slot /></optgroup>" },
}));

vi.mock("echarts", () => ({
  default: {
    init: () => ({
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    }),
  },
  init: () => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }),
}));

// ─── TDesign stubs ───
const tdesignStubs: Record<string, unknown> = {
  "t-card": { template: "<div class='t-card'><slot /></div>" },
  "t-table": { template: "<div class='t-table'><slot /></div>" },
  "t-input": { template: "<input class='t-input' />" },
  "t-textarea": { template: "<textarea class='t-textarea'></textarea>" },
  "t-icon": { template: "<span class='t-icon'><slot /></span>" },
  "t-button": { template: "<button class='t-button'><slot /></button>" },
  "t-tag": { template: "<span class='t-tag'><slot /></span>" },
  "t-select": { template: "<select class='t-select'><slot /></select>" },
  "t-option": { template: "<option class='t-option'><slot /></option>" },
  "t-option-group": { template: "<optgroup class='t-option-group'><slot /></optgroup>" },
  "t-switch": { template: "<input type='checkbox' class='t-switch' :checked='modelValue' @change='$emit(\"change\", $event.target.checked)' />", props: ["modelValue", "disabled"] },
  "t-input-number": { template: "<input type='number' class='t-input-number' />" },
  "t-checkbox": { template: "<label class='t-checkbox'><input type='checkbox' /><slot /></label>" },
  "t-checkbox-group": { template: "<div class='t-checkbox-group'><slot /></div>" },
  "t-dialog": { template: "<div class='t-dialog' v-if='visible'><slot /></div>", props: ["visible"] },
  "t-drawer": { template: "<div class='t-drawer' v-if='visible'><slot /></div>", props: ["visible"] },
  "t-form": { template: "<form class='t-form'><slot /></form>" },
  "t-form-item": { template: "<div class='t-form-item'><slot /></div>" },
  "t-popconfirm": { template: "<span class='t-popconfirm'><slot /></span>" },
  "t-loading": { template: "<span class='t-loading'><slot /></span>" },
  "t-date-range-picker": { template: "<input class='t-date-range-picker' />" },
  Transition: { template: "<div><slot /></div>" },
};

// ─── Helpers ───
function initMockData(role: string = "admin") {
  mockModelStoreObj.models = [...mockModels];
  mockModelStoreObj.stats = { ...mockStats };
  mockModelStoreObj.usageSummary = [...mockUsageSummary];
  mockModelStoreObj.usageTrend = [...mockUsageTrend];
  mockModelStoreObj.usageDistribution = [...mockUsageDistribution];
  mockModelStoreObj.usageLogs = [...mockUsageLogs];
  mockModelStoreObj.usageLogsTotal = mockUsageLogs.length;
  mockModelStoreObj.alertConfigs = [...mockAlertConfigs];
  mockModelStoreObj.alertRecords = [...mockAlertRecords];
  mockModelStoreObj.alertRecordsTotal = mockAlertRecords.length;
  mockModelStoreObj.activeAlerts = 1;

  if (role === "formulist") {
    mockAuthStoreObj.user = { id: "u2", username: "formulist", role: "formulist" };
  } else {
    mockAuthStoreObj.user = { id: "u1", username: "admin", role: "admin" };
  }

  mockModelApi.getModels.mockResolvedValue({ models: mockModels, stats: mockStats });
  mockModelApi.createModel.mockResolvedValue({ id: "m-new" });
  mockModelApi.updateModel.mockResolvedValue({});
  mockModelApi.deleteModel.mockResolvedValue({ success: true });
  mockModelApi.testConnection.mockResolvedValue({ success: true });
  mockModelApi.getUsageStats.mockResolvedValue({ summary: mockUsageSummary, trend: mockUsageTrend, distribution: mockUsageDistribution });
  mockModelApi.getUsageLogs.mockResolvedValue({ logs: mockUsageLogs, total: mockUsageLogs.length, page: 1, pageSize: 10 });
  mockModelApi.getAlertConfigs.mockResolvedValue({ configs: mockAlertConfigs });
  mockModelApi.updateAlertConfig.mockResolvedValue({ success: true });
  mockModelApi.getAlertRecords.mockResolvedValue({ records: mockAlertRecords, total: mockAlertRecords.length, activeAlerts: 1, page: 1, pageSize: 10 });
  mockModelApi.getVersionsByProvider.mockImplementation((provider: string) => Promise.resolve(
    (mockVersionsByProvider as Record<string, unknown>)[provider] || { provider, currentModel: "", versions: [] },
  ));
  mockModelApi.getRecentActivity.mockResolvedValue({ items: mockActivityItems });
  mockModelApi.getModelApplications.mockResolvedValue(mockApplications);
  mockModelApi.createModelApplication.mockResolvedValue({ id: "app-new" });
  mockModelApi.updateModelApplication.mockResolvedValue({ success: true });
  mockModelApi.patchModelApplication.mockResolvedValue({ success: true });
  mockModelApi.deleteModelApplication.mockResolvedValue({ success: true });
  mockModelApi.getPromptTemplates.mockResolvedValue(mockPromptTemplates);
  mockModelApi.createPromptTemplate.mockResolvedValue({ id: "pt-new" });
  mockModelApi.updatePromptTemplate.mockResolvedValue({ success: true });
  mockModelApi.deletePromptTemplate.mockResolvedValue({ success: true });

  mockAgentApi.getFloatConfig.mockResolvedValue(mockFloatConfig);
  mockAgentApi.updateFloatConfig.mockResolvedValue(mockFloatConfig);
}

function createWrapper(role: string = "admin") {
  initMockData(role);
  return mount(ModelManagement, {
    global: {
      plugins: [createPinia()],
      stubs: tdesignStubs,
    },
  });
}

async function waitForComponent(wrapper: ReturnType<typeof mount>) {
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  await wrapper.vm.$nextTick();
  await delay(30);
  await wrapper.vm.$nextTick();
}

function getAllModelCards(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll(".model-card");
}

function getAllNavTabs(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll(".nav-tab");
}

describe("ModelManagement [MM]", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  // ───── MM01-MM06: Component rendering ─────
  describe("MM01-MM06: Component rendering", () => {
    it("MM01: renders the main container", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      expect(wrapper.find(".model-management").exists()).toBe(true);
    });

    it("MM02: renders 4 dashboard stat cards", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const cards = wrapper.findAll(".stat-card");
      expect(cards.length).toBe(4);
    });

    it("MM03: renders 6 navigation tabs", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      expect(getAllNavTabs(wrapper).length).toBe(6);
    });

    it("MM04: renders labels for all 6 tabs", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const text = wrapper.text();
      expect(text).toContain("模型管理");
      expect(text).toContain("模型应用");
      expect(text).toContain("悬浮助手");
      expect(text).toContain("用量监控");
      expect(text).toContain("预警设置");
      expect(text).toContain("调用日志");
    });

    it("MM05: active tab defaults to models", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const activeTab = wrapper.find(".nav-tab.active");
      expect(activeTab.exists()).toBe(true);
      expect(activeTab.text()).toContain("模型管理");
    });

    it("MM06: renders content card wrapper", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      expect(wrapper.find(".content-card").exists()).toBe(true);
    });
  });

  // ───── MM07-MM12: Models tab ─────
  describe("MM07-MM12: Models tab", () => {
    it("MM07: renders a model card per model", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const cards = getAllModelCards(wrapper);
      expect(cards.length).toBe(mockModels.length);
    });

    it("MM08: displays model names in cards", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const text = wrapper.text();
      expect(text).toContain("通义千问");
      expect(text).toContain("DeepSeek");
      expect(text).toContain("智谱");
    });

    it("MM09: shows add-model button for admin role", async () => {
      wrapper = createWrapper("admin");
      await waitForComponent(wrapper);
      expect(wrapper.find(".add-model-btn").exists()).toBe(true);
    });

    it("MM10: hides add-model button for formulist role", async () => {
      wrapper = createWrapper("formulist");
      await waitForComponent(wrapper);
      expect(wrapper.find(".add-model-btn").exists()).toBe(false);
    });

    it("MM11: shows health-status dots on each card", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const dots = wrapper.findAll(".health-dot");
      expect(dots.length).toBe(mockModels.length);
      expect(dots[0].text()).toContain("正常");
      expect(dots[2].text()).toContain("未知");
    });

    it("MM12: each model card shows version field label", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const fieldLabels = wrapper.findAll(".model-card .field-label");
      const versionLabel = fieldLabels.filter(l => l.text().includes("可用版本"));
      expect(versionLabel.length).toBe(mockModels.length);
    });
  });

  // ───── MM13-MM16: Model CRUD ─────
  describe("MM13-MM16: Model CRUD", () => {
    it("MM13: clicking add-model opens the drawer", async () => {
      wrapper = createWrapper("admin");
      await waitForComponent(wrapper);
      await wrapper.find(".add-model-btn").trigger("click");
      await nextTick();
      expect(wrapper.vm.showAddDrawer).toBe(true);
    });

    it("MM14: handleAddModel calls store.createModel", async () => {
      wrapper = createWrapper("admin");
      await waitForComponent(wrapper);
      wrapper.vm.addForm = { provider: "test", name: "Test", baseUrl: "https://test.com/v1", apiKey: "sk-test", model: "test-model", visionModel: "", description: "", supportsVision: false };
      await wrapper.vm.handleAddModel();
      expect(mockModelStoreObj.createModel).toHaveBeenCalled();
    });

    it("MM15: handleDeleteModel calls store.deleteModel", async () => {
      wrapper = createWrapper("admin");
      await waitForComponent(wrapper);
      await wrapper.vm.handleDeleteModel(mockModels[0]);
      expect(mockModelStoreObj.deleteModel).toHaveBeenCalledWith(mockModels[0].id);
    });

    it("MM16: openEditDialog populates edit form", async () => {
      wrapper = createWrapper("admin");
      await waitForComponent(wrapper);
      wrapper.vm.openEditDialog(mockModels[0]);
      expect(wrapper.vm.editingModelId).toBe(mockModels[0].id);
      expect(wrapper.vm.editForm.name).toBe(mockModels[0].name);
      expect(wrapper.vm.showEditDrawer).toBe(true);
    });
  });

  // ───── MM17-MM18: Version switching ─────
  describe("MM17-MM18: Version switching", () => {
    it("MM17: handleVersionChange triggers updateModel", async () => {
      wrapper = createWrapper("admin");
      await waitForComponent(wrapper);
      await wrapper.vm.handleVersionChange(mockModels[0], "qwen-max");
      expect(mockModelStoreObj.updateModel).toHaveBeenCalledWith(mockModels[0].id, { model: "qwen-max" });
    });

    it("MM18: getAvailableVersionsForProvider returns predefined versions for dashscope", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      const versions = wrapper.vm.getAvailableVersionsForProvider(mockModels[0]);
      expect(versions.length).toBeGreaterThanOrEqual(1);
      expect(versions.some((v: { value: string }) => v.value === "qwen-plus")).toBe(true);
    });
  });

  // ───── MM19-MM22: Applications tab ─────
  describe("MM19-MM22: Applications tab", () => {
    it("MM19: switching to applications tab renders the app grid", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "applications";
      await waitForComponent(wrapper);
      expect(wrapper.find(".applications-grid").exists()).toBe(true);
    });

    it("MM20: renders correct number of application cards", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "applications";
      await waitForComponent(wrapper);
      expect(wrapper.findAll(".application-card").length).toBe(2);
    });

    it("MM21: toggleAppStatus calls patch API", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "applications";
      await waitForComponent(wrapper);
      const app = { ...mockApplications[1], enabled: false };
      await wrapper.vm.toggleAppStatus(app);
      expect(mockModelApi.patchModelApplication).toHaveBeenCalledWith(app.id, { enabled: true });
    });

    it("MM22: deleteApplication calls delete API", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      await wrapper.vm.deleteApplication("app1");
      expect(mockModelApi.deleteModelApplication).toHaveBeenCalledWith("app1");
    });
  });

  // ───── MM23-MM25: Prompt templates ─────
  describe("MM23-MM25: Prompt templates", () => {
    it("MM23: renders prompt template cards", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "applications";
      await waitForComponent(wrapper);
      expect(wrapper.findAll(".prompt-template-card").length).toBe(mockPromptTemplates.length);
    });

    it("MM24: openCreatePromptDialog initializes form correctly", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.openCreatePromptDialog();
      expect(wrapper.vm.promptFormMode).toBe("create");
      expect(wrapper.vm.showPromptDialog).toBe(true);
    });

    it("MM25: deletePromptTemplate calls API", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      await wrapper.vm.deletePromptTemplate("pt1");
      expect(mockModelApi.deletePromptTemplate).toHaveBeenCalledWith("pt1");
    });
  });

  // ───── MM26-MM28: Usage tab ─────
  describe("MM26-MM28: Usage tab", () => {
    it("MM26: switching to usage tab renders chart grid", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "usage";
      await waitForComponent(wrapper);
      expect(wrapper.find(".charts-grid").exists()).toBe(true);
    });

    it("MM27: usage tab shows refresh button", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "usage";
      await waitForComponent(wrapper);
      expect(wrapper.find(".refresh-usage-btn").exists()).toBe(true);
    });

    it("MM28: usage tab shows detail table card", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "usage";
      await waitForComponent(wrapper);
      expect(wrapper.find(".usage-table-card").exists()).toBe(true);
    });
  });

  // ───── MM29-MM32: Alerts tab ─────
  describe("MM29-MM32: Alerts tab", () => {
    it("MM29: switching to alerts tab renders config grid", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "alerts";
      await waitForComponent(wrapper);
      expect(wrapper.find(".alert-config-grid").exists()).toBe(true);
    });

    it("MM30: renders one alert config card per config", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "alerts";
      await waitForComponent(wrapper);
      expect(wrapper.findAll(".alert-config-card").length).toBe(mockAlertConfigs.length);
    });

    it("MM31: handleAlertConfigChange calls updateAlertConfig", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      await wrapper.vm.handleAlertConfigChange(mockAlertConfigs[0]);
      expect(mockModelStoreObj.updateAlertConfig).toHaveBeenCalled();
    });

    it("MM32: alert records pagination renders when records present", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "alerts";
      await waitForComponent(wrapper);
      // activity-nav is used for both activity section and alert record pagination
      expect(wrapper.vm.pagedAlertRecords.length).toBeGreaterThan(0);
    });
  });

  // ───── MM33-MM36: Logs tab ─────
  describe("MM33-MM36: Logs tab", () => {
    it("MM33: switching to logs tab renders log-filters bar", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "logs";
      await waitForComponent(wrapper);
      expect(wrapper.find(".log-filters").exists()).toBe(true);
    });

    it("MM34: log-filters renders model/type/status filter elements", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "logs";
      await waitForComponent(wrapper);
      const logFilters = wrapper.find(".log-filters");
      expect(logFilters.exists()).toBe(true);
      // The filters area should contain select elements (t-select stubs)
      const selectElements = logFilters.findAll("select");
      expect(selectElements.length).toBeGreaterThanOrEqual(1);
    });

    it("MM35: log pagination controls render when logs exist", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "logs";
      await waitForComponent(wrapper);
      expect(wrapper.find(".log-table-pagination").exists()).toBe(true);
    });

    it("MM36: changing logFilters triggers store.fetchUsageLogs", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "logs";
      await waitForComponent(wrapper);
      mockModelStoreObj.fetchUsageLogs.mockClear();
      wrapper.vm.logFilters = { provider: "dashscope", callType: "", status: "" };
      await nextTick();
      await waitForComponent(wrapper);
      expect(mockModelStoreObj.fetchUsageLogs).toHaveBeenCalled();
    });
  });

  // ───── MM37-MM38: Float agent tab ─────
  describe("MM37-MM38: Float agent tab", () => {
    it("MM37: switching to float-agent tab renders config cards", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "float-agent";
      await waitForComponent(wrapper);
      expect(wrapper.find(".float-agent-config").exists()).toBe(true);
    });

    it("MM38: float-agent has at least 3 fa-card sections", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "float-agent";
      await waitForComponent(wrapper);
      expect(wrapper.findAll(".fa-card").length).toBeGreaterThanOrEqual(3);
    });
  });

  // ───── MM39-MM41: Activity & assistant ─────
  describe("MM39-MM41: Activity & assistant", () => {
    it("MM39: renders the activity timeline section", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      expect(wrapper.find(".activity-section").exists()).toBe(true);
    });

    it("MM40: renders the assistant card with title", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      expect(wrapper.text()).toContain("模型助手中心");
    });

    it("MM41: handleAssistantAction cycles through tabs", async () => {
      wrapper = createWrapper();
      await waitForComponent(wrapper);
      wrapper.vm.activeTab = "models";
      wrapper.vm.handleAssistantAction();
      expect(wrapper.vm.activeTab).toBe("usage");
      wrapper.vm.handleAssistantAction();
      expect(wrapper.vm.activeTab).toBe("alerts");
      wrapper.vm.handleAssistantAction();
      expect(wrapper.vm.activeTab).toBe("logs");
      wrapper.vm.handleAssistantAction();
      expect(wrapper.vm.activeTab).toBe("models");
    });
  });
});
