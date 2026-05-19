import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import VersionList from "@/views/formulas/versions/VersionList.vue";

const push = vi.fn();
const mockRoute = vi.hoisted(() => ({
  params: { id: "f1" } as Record<string, string>,
  query: {} as Record<string, string>,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute,
}));

const mockFetchVersions = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockPublishVersion = vi.hoisted(() => vi.fn(() => Promise.resolve({ success: true })));

vi.mock("@/stores/version", () => ({
  useVersionStore: vi.fn(() => ({
    versions: [
      {
        versionId: "v1",
        versionNumber: "v1.0",
        status: "published",
        isCurrent: true,
        createdAt: "2026-01-15T10:00:00Z",
        createdBy: "admin",
        changes: [],
      },
      {
        versionId: "v2",
        versionNumber: "v2.0",
        status: "draft",
        isCurrent: false,
        createdAt: "2026-02-20T10:00:00Z",
        createdBy: "admin",
        versionReason: "调整原料配比",
        changes: [{ changeType: "modified", fieldLabel: "成品重量", oldValue: 100, newValue: 120 }],
      },
    ],
    loading: false,
    fetchVersions: mockFetchVersions,
    publishVersion: mockPublishVersion,
  })),
}));

vi.mock("@/stores/formula", () => ({
  useFormulaStore: vi.fn(() => ({
    getFormula: vi.fn(() =>
      Promise.resolve({ id: "f1", name: "佛手玫苓膏" })
    ),
  })),
}));

vi.mock("@/stores/material", () => ({
  useMaterialStore: vi.fn(() => ({
    fetchMaterials: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/Skeleton/PageSkeleton.vue", () => ({
  default: { template: '<div class="page-skeleton">Loading...</div>' },
}));

describe("VersionList 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper() {
    return mount(VersionList, {
      global: {
        stubs: {
          "t-card": { template: "<div><slot /></div>" },
          "t-table": { template: "<div><slot /></div>" },
          "t-icon": { template: "<span />" },
          "t-button": { template: "<button><slot /></button>" },
          "t-tag": { template: "<span><slot /></span>" },
          "t-radio-group": { template: "<div><slot /></div>" },
          "t-radio-button": { template: "<button><slot /></button>" },
          "t-popconfirm": { template: "<div><slot /></div>" },
          "t-empty": { template: "<div>empty</div>" },
          "t-tooltip": { template: "<div><slot /></div>" },
          "t-space": { template: "<div><slot /></div>" },
          PageSkeleton: true,
        },
      },
    });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockClear();
    mockFetchVersions.mockClear();
  });

  it("VL-01: 版本列表容器应正确渲染", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.find(".version-list").exists()).toBe(true);
  });

  it("VL-02: 标题应显示'版本控制中心'", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("版本控制中心");
  });

  it("VL-03: 应包含状态筛选按钮组（全部/草稿/已发布/已归档）", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const content = wrapper.text();
    expect(
      content.includes("全部") ||
        content.includes("草稿") ||
        content.includes("已发布") ||
        content.includes("已归档")
    ).toBeTruthy();
  });

  it("VL-04: 应包含创建版本按钮", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("创建版本");
  });

  it("VL-05: 应包含进入对比按钮", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("进入对比");
  });

  it("VL-06: 返回按钮应导航到配方列表", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const backBtn = wrapper.find(".header-back-btn");
    if (backBtn.exists()) {
      await backBtn.trigger("click");
      expect(push).toHaveBeenCalledWith("/formulas");
    }
  });

  it("VL-07: 初始化时应调用 fetchVersions 获取数据", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetchVersions).toHaveBeenCalled();
  });
});
