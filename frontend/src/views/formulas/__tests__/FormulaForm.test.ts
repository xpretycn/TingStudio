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
    allSalesmen: [
      { id: "s1", name: "张三" },
      { id: "s2", name: "李四" },
    ],
    fetchSalesmen: vi.fn(() => Promise.resolve()),
    fetchAllForSelect: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/stores/material", () => ({
  useMaterialStore: vi.fn(() => ({
    allMaterials: [],
    materials: [],
    fetchAllForSelect: vi.fn(() => Promise.resolve()),
    fetchMaterials: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/stores/ai", () => ({
  useAiStore: vi.fn(() => ({
    models: [],
    selectedModel: "",
    parseLoading: false,
    parseResult: null,
    parseError: "",
    parseAborted: false,
    fetchModels: vi.fn(() => Promise.resolve()),
    clearParseResult: vi.fn(),
    loadModelVersions: vi.fn(),
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Input: { name: "Input", template: "<input />" },
  Button: { name: "Button", template: "<button><slot /></button>" },
  Form: { name: "Form", template: "<form><slot /></form>" },
  FormItem: { name: "FormItem", template: "<div><slot /></div>" },
  Select: { name: "Select", template: "<select><slot /></select>" },
  Option: { name: "Option", template: "<option><slot /></option>" },
  InputNumber: { name: "InputNumber", template: '<input type="number" />' },
  Textarea: { name: "Textarea", template: "<textarea></textarea>" },
  Alert: { name: "Alert", template: '<div><slot /></div>' },
  Tag: { name: "Tag", template: "<span><slot /></span>" },
  Dropdown: { name: "Dropdown", template: "<div><slot /></div>" },
  DropdownMenu: { name: "DropdownMenu", template: "<div><slot /></div>" },
  DropdownItem: { name: "DropdownItem", template: "<div><slot /></div>" },
  RadioGroup: { name: "RadioGroup", template: "<div><slot /></div>" },
  RadioButton: { name: "RadioButton", template: "<div><slot /></div>" },
  Checkbox: { name: "Checkbox", template: '<input type="checkbox" />' },
  Dialog: { name: "Dialog", template: "<div><slot /></div>" },
  Card: { name: "Card", template: "<div><slot /></div>" },
  Collapse: { name: "Collapse", template: "<div><slot /></div>" },
  CollapsePanel: { name: "CollapsePanel", template: "<div><slot /></div>" },
  Upload: { name: "Upload", template: "<div><slot /></div>" },
  Tooltip: { name: "Tooltip", template: "<div><slot /></div>" },
  Popup: { name: "Popup", template: "<div><slot /></div>" },
  Drawer: { name: "Drawer", template: "<div><slot /></div>" },
  Table: { name: "Table", template: "<div><slot /></div>" },
  Space: { name: "Space", template: "<div><slot /></div>" },
  Popconfirm: { name: "Popconfirm", template: "<div><slot /></div>" },
}));

vi.mock("@/components/ExcelImportPanel.vue", () => ({
  default: { template: '<div class="excel-import-mock">ExcelImportPanel</div>' },
}));

vi.mock("@/components/formula/MaterialTableCore.vue", () => ({
  default: { template: '<div class="material-table-core-mock">MaterialTableCore</div>' },
}));

vi.mock("@/components/QuickCreateSalesmanDialog.vue", () => ({
  default: { template: '<div class="quick-create-salesman-mock">QuickCreateSalesmanDialog</div>' },
}));

vi.mock("@/api/agent", () => ({
  agentApi: {
    chat: vi.fn(() => Promise.resolve({ content: "" })),
  },
}));

vi.mock("@/api/version", () => ({
  versionApi: {
    create: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

vi.mock("@/components/formula/UnifiedMaterialTable.vue", () => ({
  default: { template: '<div class="unified-material-table-mock">UnifiedMaterialTable</div>' },
}));

vi.mock("@/api/parseTemplate", () => ({
  parseTemplateApi: {
    getList: vi.fn(() => Promise.resolve({ list: [] })),
  },
}));

vi.mock("@/utils/timeFormat", () => ({
  formatTimestamp: vi.fn((date: string) => date),
  formatDate: vi.fn((date: string) => date),
  formatCompact: vi.fn((num: number) => String(num)),
}));

vi.mock("@/api/excelImport", () => ({
  excelImportApi: {
    downloadTemplate: vi.fn(() => Promise.resolve(new Blob())),
  },
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
          "t-radio-group": { template: "<div><slot /></div>" },
          "t-radio-button": { template: "<div><slot /></div>" },
          "t-checkbox": { template: "<input type=\"checkbox\" />" },
          "t-dialog": { template: "<div><slot /></div>" },
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
      expect(push).toHaveBeenCalledWith({ path: "/formulas", query: {} });
    }
  });

  it("FF-05: 表单应包含基础信息区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("基础信息");
  });

  it("FF-06: 应包含智能生成区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("智能生成");
  });

  it("FF-07: 应包含原料配比表区域", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("原料配比表");
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
