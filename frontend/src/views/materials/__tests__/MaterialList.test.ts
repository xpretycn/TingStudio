import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MaterialList from "@/views/materials/MaterialList.vue";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: {}, query: {} }),
}));

vi.mock("@/stores/material", () => ({
  useMaterialStore: vi.fn(() => ({
    materials: [],
    total: 0,
    loading: false,
    currentPage: 1,
    pageSize: 10,
    fetchMaterials: vi.fn(() => Promise.resolve()),
    deleteMaterial: vi.fn(),
    updateMaterial: vi.fn(),
  })),
}));

vi.mock("@/stores/pagination", () => ({
  usePaginationStore: vi.fn(() => ({
    visible: true,
    register: vi.fn(),
    update: vi.fn(),
    unregister: vi.fn(),
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("MaterialList 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  const createWrapper = async () => {
    setActivePinia(createPinia());
    const w = mount(MaterialList, {
      global: {
        stubs: {
          "t-icon": { template: "<span></span>" },
          "t-input": { template: "<input />", props: ["modelValue"] },
          "t-table": {
            template: '<div class="table-stub"><slot /></div>',
            props: ["data", "columns", "loading", "pagination"],
          },
          "t-button": { template: "<button><slot /></button>", props: ["theme", "variant", "size", "loading"] },
          "t-card": { template: '<div class="card-stub"><slot /></div>', props: ["bordered"] },
          "t-popconfirm": {
            template: '<div class="popconfirm"><slot /><slot name="content" /></div>',
            props: ["theme", "content"],
          },
          "t-tag": { template: '<span class="tag-stub" />', props: ["theme", "variant", "shape", "size"] },
          "t-tooltip": { template: "<div><slot /></div>", props: ["content"] },
          "t-progress": { template: '<div class="progress-stub" />', props: ["percentage", "color", "showInfo"] },
          "t-avatar": { template: '<div class="avatar-stub" />', props: ["shape", "size"] },
          "t-checkbox": { template: '<input type="checkbox" />', props: ["modelValue"] },
          "t-empty": { template: '<div class="empty-stub">暂无数据</div>' },
          "t-loading": { template: '<div class="loading-stub"><slot /></div>' },
          "t-dropdown": { template: "<div><slot /></div>" },
          "t-dropdown-menu": { template: "<div><slot /></div>" },
          "t-dropdown-item": { template: "<div><slot /></div>" },
          PageSkeleton: { template: '<div class="skeleton">loading...</div>', props: ["type", "rows", "columns"] },
          Transition: { template: "<div><slot /></div>" },
        },
      },
    });
    await flushPromises();
    return w;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("LL01: 页面应正常渲染，不抛出错误", async () => {
    wrapper = await createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it("LL02: Dashboard 网格区域应存在", async () => {
    wrapper = await createWrapper();
    const dashboard = wrapper.find(".dashboard-grid");
    expect(dashboard.exists()).toBe(true);
  });

  it("LL03: 搜索输入框应存在", async () => {
    wrapper = await createWrapper();
    const searchInput = wrapper.find(".search-input");
    expect(searchInput.exists()).toBe(true);
  });

  it("LL04: 新增按钮应存在", async () => {
    wrapper = await createWrapper();
    const addBtn = wrapper.find(".add-formula-btn");
    expect(addBtn.exists()).toBe(true);
  });

  it("LL05: 页面标题应显示「原料管理中心」", async () => {
    wrapper = await createWrapper();
    const title = wrapper.find(".toolbar-title");
    expect(title.text()).toContain("原料管理中心");
  });

  it("LL06: 分页控件应在数据为空时隐藏", async () => {
    wrapper = await createWrapper();
    const pagination = wrapper.find(".table-pagination");
    expect(pagination.exists()).toBe(false);
  });

  it("LL07: 数据中心工具栏应存在", async () => {
    wrapper = await createWrapper();
    const toolbar = wrapper.find(".data-center-toolbar");
    expect(toolbar.exists()).toBe(true);
  });

  it("LL08: 活动时间线区域应存在", async () => {
    wrapper = await createWrapper();
    const activity = wrapper.find(".activity-section");
    expect(activity.exists()).toBe(true);
  });

  it("LL09: 搜索容器应存在", async () => {
    wrapper = await createWrapper();
    const searchContainer = wrapper.find(".search-container");
    expect(searchContainer.exists()).toBe(true);
  });

  it("LL10: 工具栏副标题应包含描述文字", async () => {
    wrapper = await createWrapper();
    const subtitle = wrapper.find(".toolbar-subtitle");
    expect(subtitle.exists()).toBe(true);
    expect(subtitle.text().length).toBeGreaterThan(0);
  });
});
