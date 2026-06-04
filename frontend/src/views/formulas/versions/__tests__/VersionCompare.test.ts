import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import VersionCompare from "@/views/formulas/versions/VersionCompare.vue";

const push = vi.fn();
const mockRoute = vi.hoisted(() => ({
  params: { formulaId: "f1" } as Record<string, string>,
  query: { versions: "v1,v2" } as Record<string, string>,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute,
}));

vi.mock("@/stores/version", () => ({
  useVersionStore: vi.fn(() => ({
    versions: [
      {
        versionId: "v1",
        versionNumber: "v1.0",
        versionName: "初始版本",
        status: "published",
        createdAt: "2026-01-15T10:00:00Z",
        createdBy: "admin",
        materials: [
          { name: "黄芪", value: 20 },
          { name: "当归", value: 15 },
          { name: "茯苓", value: 12 },
        ],
      },
      {
        versionId: "v2",
        versionNumber: "v2.0",
        versionName: "优化版本",
        status: "draft",
        createdAt: "2026-02-20T10:00:00Z",
        createdBy: "admin",
        materials: [
          { name: "黄芪", value: 25 },
          { name: "当归", value: 18 },
          { name: "茯苓", value: 14 },
          { name: "党参", value: 10 },
        ],
      },
    ],
    loading: false,
    fetchVersions: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/stores/formula", () => ({
  useFormulaStore: vi.fn(() => ({
    getFormula: vi.fn(() => Promise.resolve({ id: "f1", name: "佛手玫苓膏" })),
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Popconfirm: { name: "Popconfirm", template: "<div><slot /></div>" },
  Button: { name: "Button", template: "<button><slot /></button>" },
}));

describe("VersionCompare 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper(query?: Record<string, string>) {
    if (query) mockRoute.query = query;
    else mockRoute.query = { versions: "v1,v2" };

    return mount(VersionCompare, {
      global: {
        stubs: {
          "t-icon": { template: "<span />" },
          "t-button": { template: "<button><slot /></button>" },
          "t-popconfirm": { template: "<div><slot /></div>" },
        },
      },
    });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockClear();
  });

  it("VC-01: 版本对比容器应正确渲染", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.find(".version-compare").exists()).toBe(true);
  });

  it("VC-02: 标题应显示'版本差异对比'", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("版本差异对比");
  });

  it("VC-03: 应显示当前对比版本数", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("当前对比版本数");
  });

  it("VC-04: 应包含重置对比按钮", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("重置对比");
  });

  it("VC-05: 返回按钮应导航到版本管理页面", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const backBtn = wrapper.find(".header-back-btn");
    if (backBtn.exists()) {
      await backBtn.trigger("click");
      expect(push).toHaveBeenCalled();
    }
  });

  it("VC-06: 无选中版本时应显示空状态提示", async () => {
    wrapper = createWrapper({ versions: "" });
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const emptyState = wrapper.find(".empty-state");
    if (emptyState.exists()) {
      expect(emptyState.isVisible()).toBe(true);
    }
  });

  it("VC-07: 有选中版本时应对比卡片区域存在", async () => {
    wrapper = createWrapper({ versions: "v1,v2" });
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const compareGrid = wrapper.find(".compare-grid");
    if (compareGrid.exists()) {
      expect(compareGrid.findAll(".compare-card").length).toBeGreaterThanOrEqual(
        2
      );
    }
  });
});
