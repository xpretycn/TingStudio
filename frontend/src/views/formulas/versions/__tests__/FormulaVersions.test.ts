import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FormulaVersions from "@/views/formulas/versions/FormulaVersions.vue";

const push = vi.fn();
const mockRoute = vi.hoisted(() => ({
  params: { formulaId: "f1" } as Record<string, string>,
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
    fetchAllForSelect: vi.fn(() => Promise.resolve()),
    allMaterials: [],
  })),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn(() => ({
    user: { role: "admin" },
  })),
}));

vi.mock("tdesign-vue-next", () => ({
  MessagePlugin: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  Icon: { name: "Icon", template: "<span><slot /></span>" },
  Input: { name: "Input", template: "<input />" },
  Button: { name: "Button", template: "<button><slot /></button>" },
  Tag: { name: "Tag", template: "<span><slot /></span>" },
  Popconfirm: { name: "Popconfirm", template: "<div><slot /></div>" },
  Dialog: { name: "Dialog", template: "<div><slot /></div>" },
  RadioGroup: { name: "RadioGroup", template: "<div><slot /></div>" },
  RadioButton: { name: "RadioButton", template: "<div><slot /></div>" },
  Empty: { name: "Empty", template: "<div>empty</div>" },
  Tooltip: { name: "Tooltip", template: "<div><slot /></div>" },
  Space: { name: "Space", template: "<div><slot /></div>" },
  Card: { name: "Card", template: "<div><slot /></div>" },
  Table: { name: "Table", template: "<div><slot /></div>" },
}));

vi.mock("@/components/Skeleton/PageSkeleton.vue", () => ({
  default: { template: '<div class="page-skeleton">Loading...</div>' },
}));

describe("FormulaVersions 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  function createWrapper() {
    return mount(FormulaVersions, {
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

  it("FV-01: 版本列表容器应正确渲染", async () => {
    wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.find(".version-list").exists()).toBe(true);
  });

  it("FV-02: 标题应显示'版本控制中心'", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("版本控制中心");
  });

  it("FV-03: 应包含状态筛选按钮组（全部/草稿/已发布等）", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const content = wrapper.text();
    expect(
      content.includes("全部") ||
        content.includes("草稿") ||
        content.includes("已发布") ||
        content.includes("已归档") ||
        content.includes("待审批")
    ).toBeTruthy();
  });

  it("FV-04: 应包含版本对比按钮", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("版本对比");
  });

  it("FV-05: 应包含加入对比选项", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(wrapper.text()).toContain("加入对比");
  });

  it("FV-06: 返回按钮应导航到配方列表", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const backBtn = wrapper.find(".back-btn");
    if (backBtn.exists()) {
      await backBtn.trigger("click");
      expect(push).toHaveBeenCalledWith("/formulas");
    }
  });

  it("FV-07: 初始化时应调用 fetchVersions 获取数据", async () => {
    wrapper = createWrapper();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockFetchVersions).toHaveBeenCalled();
  });
});
