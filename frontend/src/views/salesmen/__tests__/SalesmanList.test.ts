import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SalesmanList from "@/views/salesmen/SalesmanList.vue";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

const mockFetchSalesmen = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockDeleteSalesman = vi.hoisted(() => vi.fn(() => Promise.resolve({ success: true })));

const mockSalesmen = [
  {
    id: "s1",
    name: "张三",
    code: "EMP001",
    department: "销售部",
    phone: "13800138000",
    email: "zhangsan@example.com",
    status: "active",
    createdAt: "2026-01-15",
  },
  {
    id: "s2",
    name: "李四",
    code: "EMP002",
    department: "市场部",
    phone: "13900139000",
    email: "lisi@example.com",
    status: "inactive",
    createdAt: "2026-02-20",
  },
];

vi.mock("@/stores/salesman", () => ({
  useSalesmanStore: vi.fn(() => ({
    salesmen: mockSalesmen,
    total: 2,
    pageSize: 10,
    currentPage: 1,
    loading: false,
    fetchSalesmen: mockFetchSalesmen,
    deleteSalesman: mockDeleteSalesman,
    setKeyword: vi.fn(),
  })),
}));

vi.mock("@/stores/pagination", () => ({
  usePaginationStore: vi.fn(() => ({
    register: vi.fn(),
    update: vi.fn(),
    unregister: vi.fn(),
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/Skeleton/PageSkeleton.vue", () => ({
  default: { template: '<div class="page-skeleton">Loading...</div>' },
}));

describe("SalesmanList 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper() {
    return mount(SalesmanList, {
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

  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockClear();
    mockFetchSalesmen.mockClear();
  });

  it("SL-01: 业务员列表容器应正确渲染", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.find(".salesman-list").exists()).toBe(true);
  });

  it("SL-02: 应包含 Dashboard 数据看板区域", async () => {
    wrapper = createWrapper();
    const dashboard = wrapper.find(".dashboard-grid");
    expect(dashboard.exists()).toBe(true);
  });

  it("SL-03: 标题应显示'业务员管理中心'", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("业务员管理中心");
  });

  it("SL-04: 工具栏应包含搜索输入框", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const searchInput = wrapper.find("#salesman-search-input");
    expect(searchInput.exists()).toBe(true);
  });

  it("SL-05: 应包含添加业务员按钮", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const addBtn = wrapper.find(".add-formula-btn");
    expect(addBtn.exists()).toBe(true);
  });

  it("SL-06: 点击添加按钮应导航到新建表单", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const addBtn = wrapper.find(".add-formula-btn");
    if (addBtn.exists()) {
      await addBtn.trigger("click");
      expect(push).toHaveBeenCalledWith("/salesmen/new");
    }
  });

  it("SL-07: 应包含筛选按钮", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const filterBtn = wrapper.find(".filter-btn");
    expect(filterBtn.exists()).toBe(true);
  });

  it("SL-08: 初始化时应调用 fetchSalesmen 获取数据", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetchSalesmen).toHaveBeenCalled();
  });
});
