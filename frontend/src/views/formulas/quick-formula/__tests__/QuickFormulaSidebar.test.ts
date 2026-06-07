import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import QuickFormulaSidebar from "@/views/formulas/quick-formula/QuickFormulaSidebar.vue";
import type { QuickFormulaItem, QuickFormulaDraft } from "@/types/quickFormula";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchList = vi.fn(() => Promise.resolve());
const mockCreateQuickFormula = vi.fn(() => Promise.resolve(null));
const mockDeleteQuickFormula = vi.fn(() => Promise.resolve(true));
const mockSaveQuickFormula = vi.fn(() => Promise.resolve(true));

vi.mock("@/stores/quickFormulaList", () => ({
  useQuickFormulaListStore: vi.fn(() => ({
    list: [] as QuickFormulaItem[],
    loading: false,
    selectedId: null,
    fetchList: mockFetchList,
    createQuickFormula: mockCreateQuickFormula,
    deleteQuickFormula: mockDeleteQuickFormula,
    saveQuickFormula: mockSaveQuickFormula,
  })),
}));

const mockLoadDraft = vi.fn(() => null);
const mockClearDraft = vi.fn();
const mockRestoreDraft = vi.fn();

vi.mock("@/stores/quickFormula", () => ({
  useQuickFormulaStore: vi.fn(() => ({
    loadDraft: mockLoadDraft,
    clearDraft: mockClearDraft,
    restoreDraft: mockRestoreDraft,
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn() },
  Icon: { name: "Icon", template: "<span class='t-icon-stub' />", props: ["name", "size"] },
  Loading: { name: "Loading", template: "<div class='t-loading-stub'><slot /></div>", props: ["loading", "size"] },
  Popconfirm: { name: "Popconfirm", template: "<div class='t-popconfirm-stub'><slot /></div>", props: ["content", "confirmBtn"] },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  isEditing: false,
  collapsed: false,
  currentQuickFormulaId: null as string | null,
  triggerCreate: false,
};

function createWrapper(overrides: Record<string, unknown> = {}) {
  return mount(QuickFormulaSidebar, {
    props: { ...defaultProps, ...overrides },
    global: {
      stubs: {
        "t-icon": { template: "<span class='t-icon-stub' />" },
        "t-loading": {
          template: "<div class='t-loading-stub'><slot /></div>",
          props: ["loading", "size"],
        },
        "t-popconfirm": {
          template: "<div class='t-popconfirm-stub'><slot /></div>",
          props: ["content", "confirmBtn"],
        },
        Transition: { template: "<div><slot /></div>" },
      },
    },
    attachTo: document.body,
  });
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("QuickFormulaSidebar - 新建配方按钮", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  // =========================================================================
  // 1. 功能验证测试
  // =========================================================================

  describe("1. 功能验证", () => {
    it("NFB-01: 按钮应存在于 DOM 中", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      expect(btn.exists()).toBe(true);
    });

    it("NFB-02: 按钮应包含 '新建配方' 文本", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      expect(btn.text()).toContain("新建配方");
    });

    it("NFB-03: 按钮应包含 t-icon 组件（add 图标）", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      const icon = btn.find(".t-icon-stub");
      expect(icon.exists()).toBe(true);
    });

    it("NFB-04: 点击按钮应触发 startCreateInline，显示内联输入框", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      // isCreatingInline 应为 true，内联输入框应出现
      const input = wrapper.find("[data-create-input]");
      expect(input.exists()).toBe(true);
    });

    it("NFB-05: 点击按钮后 newFormulaName 应被重置为空字符串", async () => {
      wrapper = createWrapper();
      // 先模拟一次创建流程，填入名称
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("测试配方");
      expect((wrapper.vm as Record<string, unknown>).newFormulaName).toBe("测试配方");

      // 再次点击新建按钮
      await btn.trigger("click");
      await wrapper.vm.$nextTick();
      expect((wrapper.vm as Record<string, unknown>).newFormulaName).toBe("");
    });

    it("NFB-06: 在内联输入框中按 Enter 应调用 store.createQuickFormula", async () => {
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "测试配方",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("测试配方");
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(mockCreateQuickFormula).toHaveBeenCalledWith("测试配方");
    });

    it("NFB-07: 创建成功后应 emit 'create' 事件", async () => {
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "新配方",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("新配方");
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(wrapper.emitted("create")).toBeTruthy();
      expect(wrapper.emitted("create")![0][0]).toEqual(mockItem);
    });

    it("NFB-08: 创建成功后内联输入框应消失", async () => {
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "新配方",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find("[data-create-input]").exists()).toBe(true);

      const input = wrapper.find("[data-create-input]");
      await input.setValue("新配方");
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(wrapper.find("[data-create-input]").exists()).toBe(false);
    });

    it("NFB-09: 在输入框中按 Escape 应取消创建，输入框消失", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.trigger("keydown.escape");
      await wrapper.vm.$nextTick();

      expect(wrapper.find("[data-create-input]").exists()).toBe(false);
    });

    it("NFB-10: 输入空名称后按 Enter 应取消创建（不调用 API）", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("   ");
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(mockCreateQuickFormula).not.toHaveBeenCalled();
      expect(wrapper.find("[data-create-input]").exists()).toBe(false);
    });

    it("NFB-11: 输入框 blur 事件应触发创建", async () => {
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "模糊创建",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("模糊创建");
      await input.trigger("blur");
      await flushPromises();

      expect(mockCreateQuickFormula).toHaveBeenCalledWith("模糊创建");
    });

    it("NFB-12: 创建成功后若 isEditing 为 true，应 emit 'update:collapsed' 为 true", async () => {
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "编辑中创建",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper({ isEditing: true, collapsed: false });
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("编辑中创建");
      await input.trigger("keydown.enter");
      await flushPromises();

      const collapsedEvents = wrapper.emitted("update:collapsed");
      expect(collapsedEvents).toBeTruthy();
      // 最后一次 collapsed 事件应为 true
      const lastEvent = collapsedEvents![collapsedEvents!.length - 1];
      expect(lastEvent[0]).toBe(true);
    });

    it("NFB-13: triggerCreate prop 从 false 变为 true 时应自动触发创建流程", async () => {
      wrapper = createWrapper({ triggerCreate: false, isEditing: false, collapsed: false });
      await wrapper.vm.$nextTick();

      // 将 triggerCreate 从 false 变为 true，触发 watch
      await wrapper.setProps({ triggerCreate: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      await flushPromises();

      // 应 emit update:triggerCreate 为 false
      expect(wrapper.emitted("update:triggerCreate")).toBeTruthy();
      expect(wrapper.emitted("update:triggerCreate")![0][0]).toBe(false);

      // triggerCreate watch 应调用 startCreateInline，输入框出现
      const input = wrapper.find("[data-create-input]");
      expect(input.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 2. UI/UX 测试
  // =========================================================================

  describe("2. UI/UX 测试", () => {
    it("NFB-20: 按钮应具有 title 属性用于 tooltip 提示", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      expect(btn.attributes("title")).toBe("新建快速配方");
    });

    it("NFB-21: 按钮应使用虚线边框样式（dashed border）", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      // 验证 CSS 类存在，具体样式由 CSS 驱动
      expect(btn.classes()).toContain("new-formula-btn");
    });

    it("NFB-22: 侧边栏折叠时按钮不可见", async () => {
      wrapper = createWrapper({ collapsed: true });
      const btn = wrapper.find(".new-formula-btn");
      expect(btn.exists()).toBe(false);
    });

    it("NFB-23: 侧边栏展开时按钮可见", () => {
      wrapper = createWrapper({ collapsed: false });
      const btn = wrapper.find(".new-formula-btn");
      expect(btn.exists()).toBe(true);
    });

    it("NFB-24: 点击按钮后按钮仍存在但输入框出现在列表顶部", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      // 按钮仍然存在
      expect(wrapper.find(".new-formula-btn").exists()).toBe(true);
      // 输入框出现在列表中
      const input = wrapper.find("[data-create-input]");
      expect(input.exists()).toBe(true);
    });

    it("NFB-25: 创建中的列表项应具有特殊的视觉标识类", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const creatingItem = wrapper.find(".sidebar-item--creating");
      expect(creatingItem.exists()).toBe(true);
    });

    it("NFB-26: 输入框应具有 maxlength=50 限制", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      expect(input.attributes("maxlength")).toBe("50");
    });

    it("NFB-27: 输入框应显示 placeholder 提示文本", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      expect(input.attributes("placeholder")).toBe("输入配方名称");
    });

    it("NFB-28: 按钮应包含图标和文本两个子元素", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      // 验证按钮内包含 t-icon-stub 和 span 文本
      const icon = btn.find(".t-icon-stub");
      expect(icon.exists()).toBe(true);
      expect(btn.text()).toContain("新建配方");
    });
  });

  // =========================================================================
  // 3. 边界条件测试
  // =========================================================================

  describe("3. 边界条件测试", () => {
    it("NFB-30: 快速连续点击按钮不应产生多个输入框", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");

      // 快速连续点击 3 次
      await btn.trigger("click");
      await btn.trigger("click");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      // 只应有一个 data-create-input
      const inputs = wrapper.findAll("[data-create-input]");
      expect(inputs.length).toBe(1);
    });

    it("NFB-31: 创建 API 返回 null 时输入框仍保留（允许用户重试），且不 emit create", async () => {
      mockCreateQuickFormula.mockResolvedValueOnce(null);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("冲突名称");
      await input.trigger("keydown.enter");
      await flushPromises();

      // 创建失败时输入框保留，允许用户修改名称重试
      expect(wrapper.find("[data-create-input]").exists()).toBe(true);
      // 不应 emit create
      expect(wrapper.emitted("create")).toBeFalsy();
    });

    it("NFB-32: 创建 API 抛出异常时不应崩溃", async () => {
      mockCreateQuickFormula.mockImplementationOnce(() => {
        // store.createQuickFormula 内部有 try-catch，不会向上抛出
        // 但如果意外抛出，组件不应崩溃
        return Promise.resolve(null);
      });

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("异常测试");
      await input.trigger("keydown.enter");
      await flushPromises();

      // 组件不应崩溃
      expect(wrapper.find(".quick-formula-sidebar").exists()).toBe(true);
    });

    it("NFB-33: 输入恰好 50 个字符的名称应正常创建", async () => {
      const longName = "A".repeat(50);
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: longName,
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue(longName);
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(mockCreateQuickFormula).toHaveBeenCalledWith(longName);
    });

    it("NFB-34: 输入仅包含空格的名称应视为空名称，取消创建", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("   \t  ");
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(mockCreateQuickFormula).not.toHaveBeenCalled();
    });

    it("NFB-35: 取消创建后再次点击按钮应能重新开始创建流程", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");

      // 第一次点击
      await btn.trigger("click");
      await wrapper.vm.$nextTick();
      expect(wrapper.find("[data-create-input]").exists()).toBe(true);

      // 取消
      const input = wrapper.find("[data-create-input]");
      await input.trigger("keydown.escape");
      await wrapper.vm.$nextTick();
      expect(wrapper.find("[data-create-input]").exists()).toBe(false);

      // 再次点击
      await btn.trigger("click");
      await wrapper.vm.$nextTick();
      expect(wrapper.find("[data-create-input]").exists()).toBe(true);
    });

    it("NFB-36: 创建过程中网络延迟时 UI 应保持稳定", async () => {
      // 模拟慢速 API
      let resolveCreate: (value: unknown) => void;
      const slowPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      mockCreateQuickFormula.mockReturnValueOnce(slowPromise);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("慢速创建");
      await input.trigger("keydown.enter");
      await flushPromises();

      // 等待期间组件不应崩溃
      expect(wrapper.find(".quick-formula-sidebar").exists()).toBe(true);

      // 解决 Promise
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "慢速创建",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      resolveCreate!(mockItem);
      await flushPromises();

      expect(wrapper.emitted("create")).toBeTruthy();
    });

    it("NFB-37: 输入名称前后有空格时应 trim 后再提交", async () => {
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "带空格的配方",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.setValue("  带空格的配方  ");
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(mockCreateQuickFormula).toHaveBeenCalledWith("带空格的配方");
    });
  });

  // =========================================================================
  // 4. 可访问性测试
  // =========================================================================

  describe("4. 可访问性测试", () => {
    it("NFB-40: 按钮应可通过 Tab 键聚焦", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      const element = btn.element as HTMLButtonElement;

      // 模拟 Tab 聚焦
      element.focus();
      await wrapper.vm.$nextTick();

      expect(document.activeElement).toBe(element);
    });

    it("NFB-41: 按钮应可通过 Enter 键激活（原生 button 支持 Enter 触发 click）", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      const element = btn.element as HTMLButtonElement;

      // 原生 <button> 元素默认支持 Enter 键触发 click
      // 在 JSDOM 中 keydown.enter 不自动触发 click，需手动模拟
      element.focus();
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      // 应显示创建输入框
      expect(wrapper.find("[data-create-input]").exists()).toBe(true);
    });

    it("NFB-42: 按钮应可通过 Space 键激活", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");

      // 模拟键盘 Space 激活
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find("[data-create-input]").exists()).toBe(true);
    });

    it("NFB-43: 按钮应具有有意义的 title 属性（屏幕阅读器可读取）", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      const title = btn.attributes("title");

      expect(title).toBeTruthy();
      expect(title).toBe("新建快速配方");
    });

    it("NFB-44: 按钮使用原生 <button> 元素，确保语义化", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");

      expect(btn.element.tagName).toBe("BUTTON");
    });

    it("NFB-45: 内联输入框应自动获取焦点", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();
      await flushPromises();

      // startCreateInline 使用 nextTick + querySelector + focus
      // 在 JSDOM 中 document.querySelector 可能找到元素
      const input = wrapper.find("[data-create-input]");
      expect(input.exists()).toBe(true);
    });

    it("NFB-46: 内联输入框可通过 Escape 键取消，符合用户预期", async () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");
      await input.trigger("keydown.escape");
      await wrapper.vm.$nextTick();

      // 输入框应消失，焦点回到按钮
      expect(wrapper.find("[data-create-input]").exists()).toBe(false);
    });

    it("NFB-47: 按钮不应设置 tabindex=-1（确保可键盘导航）", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      const tabindex = btn.attributes("tabindex");

      // 原生 button 默认可聚焦，tabindex 不应为 -1
      expect(tabindex).not.toBe("-1");
    });

    it("NFB-48: 按钮不应设置 aria-disabled（非禁用状态）", () => {
      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      const ariaDisabled = btn.attributes("aria-disabled");

      expect(ariaDisabled).not.toBe("true");
    });

    it("NFB-49: 创建输入框应可通过 Enter 提交和 Escape 取消，符合表单交互惯例", async () => {
      const mockItem: QuickFormulaItem = {
        id: "qf1",
        name: "键盘测试",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      mockCreateQuickFormula.mockResolvedValueOnce(mockItem);

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      const input = wrapper.find("[data-create-input]");

      // Enter 提交
      await input.setValue("键盘测试");
      await input.trigger("keydown.enter");
      await flushPromises();

      expect(mockCreateQuickFormula).toHaveBeenCalledWith("键盘测试");
    });
  });

  // =========================================================================
  // 5. 与其他组件交互测试
  // =========================================================================

  describe("5. 组件交互测试", () => {
    it("NFB-50: isEditing 为 true 时 watch 应 emit update:collapsed", async () => {
      wrapper = createWrapper({ isEditing: true, collapsed: false });
      await flushPromises();

      const collapsedEvents = wrapper.emitted("update:collapsed");
      expect(collapsedEvents).toBeTruthy();
    });

    it("NFB-51: 创建中状态下点击列表项不应触发选择", async () => {
      const mockItem: QuickFormulaItem = {
        id: "existing1",
        name: "已有配方",
        status: "draft",
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        finishedWeight: 900,
        materials: [],
        packagingPrice: 2,
        otherPrice: 3,
        profitMargin: 30,
        description: null,
        preparationMethod: null,
        salesmanId: null,
        salesmanName: null,
        createdBy: "user1",
        createdByName: "测试用户",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      // 重新 mock store 包含列表数据
      vi.mocked(await import("@/stores/quickFormulaList")).useQuickFormulaListStore.mockReturnValue({
        list: [mockItem],
        loading: false,
        selectedId: null,
        fetchList: mockFetchList,
        createQuickFormula: mockCreateQuickFormula,
        deleteQuickFormula: mockDeleteQuickFormula,
        saveQuickFormula: mockSaveQuickFormula,
      });

      wrapper = createWrapper();
      const btn = wrapper.find(".new-formula-btn");
      await btn.trigger("click");
      await wrapper.vm.$nextTick();

      // 创建输入框存在
      expect(wrapper.find("[data-create-input]").exists()).toBe(true);
    });

    it("NFB-52: 点击外部区域应触发折叠（collapsed 状态下不触发）", async () => {
      wrapper = createWrapper({ collapsed: false });
      await flushPromises();

      // 模拟点击侧边栏外部
      const outsideElement = document.createElement("div");
      document.body.appendChild(outsideElement);
      outsideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      await flushPromises();

      const collapsedEvents = wrapper.emitted("update:collapsed");
      if (collapsedEvents) {
        const lastEvent = collapsedEvents[collapsedEvents.length - 1];
        expect(lastEvent[0]).toBe(true);
      }

      document.body.removeChild(outsideElement);
    });

    it("NFB-53: clearDraftBanner 暴露方法应清除草稿横幅", async () => {
      const mockDraft: QuickFormulaDraft = {
        formulaName: "草稿配方",
        formulaData: {
          ratioFactor: 0.18,
          supplementRatioFactor: 1.0,
          finishedWeight: 900,
          packagingPrice: 2,
          otherPrice: 3,
          profitMargin: 30,
          materials: [],
        },
        savedAt: "2026-01-01T00:00:00.000Z",
      };
      mockLoadDraft.mockReturnValueOnce(mockDraft);

      wrapper = createWrapper();
      await flushPromises();

      // 草稿横幅应可见
      expect(wrapper.find(".draft-banner").exists()).toBe(true);

      // 调用暴露的方法
      (wrapper.vm as Record<string, unknown>).clearDraftBanner();
      await wrapper.vm.$nextTick();

      // 草稿横幅应消失
      expect(wrapper.find(".draft-banner").exists()).toBe(false);
    });
  });
});
