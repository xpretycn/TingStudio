import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FormulaList from "@/views/formulas/FormulaList.vue";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

const mockFormulas = [
  {
    id: "f1",
    name: "佛手玫苓膏",
    version: "v1.0",
    salesmanName: "张三",
    status: "active",
    createdAt: "2026-01-15",
    materialCount: 8,
  },
  {
    id: "f2",
    name: "参芪补气方",
    version: "v2.1",
    salesmanName: "李四",
    status: "archived",
    createdAt: "2026-02-20",
    materialCount: 12,
  },
];

const mockFetchFormulas = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockDeleteFormula = vi.hoisted(() => vi.fn(() => Promise.resolve({ success: true })));

vi.mock("@/stores/formula", () => ({
  useFormulaStore: vi.fn(() => ({
    formulas: mockFormulas,
    loading: false,
    fetchFormulas: mockFetchFormulas,
    deleteFormula: mockDeleteFormula,
    setKeyword: vi.fn(),
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
    materials: [],
    fetchMaterials: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/stores/pagination", () => ({
  usePaginationStore: vi.fn(() => ({
    register: vi.fn(),
    update: vi.fn(),
    unregister: vi.fn(),
  })),
}));

vi.mock("@/stores/theme", () => ({
  useThemeStore: vi.fn(() => ({
    brandColor: "pink",
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn() },
}));

describe("FormulaList 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockClear();
    mockFetchFormulas.mockClear();
  });

  function createWrapper() {
    return mount(FormulaList, {
      global: {
        stubs: {
          "t-card": { template: "<div><slot /></div>" },
          "t-table": { template: "<div><slot /></div>" },
          "t-input": { template: "<input />" },
          "t-icon": { template: "<span />" },
          "t-button": { template: "<button><slot /></button>" },
          "t-tag": { template: "<span><slot /></span>" },
          PageSkeleton: true,
          "t-empty": true,
          "t-popconfirm": { template: "<div><slot /></div>" },
          "router-link": { template: "<a><slot /></a>" },
        },
      },
    });
  }

  it("FL-01: 配方列表页应正确渲染容器", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(wrapper.find(".formula-list").exists()).toBe(true);
  });

  it("FL-02: 应包含 Dashboard 数据看板区域", async () => {
    wrapper = createWrapper();
    const dashboard = wrapper.find(".dashboard-grid");
    expect(dashboard.exists()).toBe(true);
  });

  it("FL-03: 工具栏应包含搜索输入框", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    const searchInput = wrapper.find("#formula-search-input");
    expect(searchInput.exists()).toBe(true);
  });

  it("FL-04: 应包含创建新配方按钮", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    const createBtn = wrapper.find(".add-formula-btn");
    expect(createBtn.exists()).toBe(true);
  });

  it("FL-05: 点击创建按钮应导航到新建表单", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    const createBtn = wrapper.find(".add-formula-btn");
    if (createBtn.exists()) {
      await createBtn.trigger("click");
      expect(push).toHaveBeenCalled();
    }
  });

  it('FL-06: 工具栏标题应显示"配方管理中心"', async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("配方管理中心");
  });

  it("FL-07: 初始化时应调用 fetchFormulas 获取数据", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockFetchFormulas).toHaveBeenCalled();
  });

  it("FL-08: 应包含筛选按钮", async () => {
    wrapper = createWrapper();
    await new Promise(resolve => setTimeout(resolve, 100));
    const filterBtn = wrapper.find(".filter-btn");
    expect(filterBtn.exists()).toBe(true);
  });
});
