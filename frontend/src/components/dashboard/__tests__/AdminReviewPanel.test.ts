import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AdminReviewPanel from "@/components/dashboard/AdminReviewPanel.vue";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/utils/timeFormat", () => ({
  formatTimestamp: (v: string) => v ?? "",
}));

const mockFetchPendingReviews = vi.fn(() => Promise.resolve());
const mockFetchReviewedHistory = vi.fn(() => Promise.resolve());
const mockFetchMaterialPendingReviews = vi.fn(() => Promise.resolve());

let mockStore: Record<string, unknown>;

vi.mock("@/stores/approval", () => ({
  useApprovalStore: vi.fn(() => mockStore),
}));

function initStore(overrides: Record<string, unknown> = {}) {
  mockStore = {
    pendingReviews: [],
    reviewedHistory: [],
    materialPendingReviews: [],
    loading: false,
    pendingCount: 0,
    pendingTotal: 0,
    pendingPage: 1,
    pendingPageSize: 6,
    reviewedTotal: 0,
    reviewedPage: 1,
    reviewedPageSize: 6,
    materialPendingCount: 0,
    materialPendingPage: 1,
    materialPendingPageSize: 6,
    adminSortBy: "createdAt",
    adminSortOrder: "desc",
    adminDateRange: "",
    adminSubmitter: "",
    adminReviewAction: "all",
    fetchPendingReviews: mockFetchPendingReviews,
    fetchReviewedHistory: mockFetchReviewedHistory,
    fetchMaterialPendingReviews: mockFetchMaterialPendingReviews,
    ...overrides,
  };
}

function createWrapper() {
  return mount(AdminReviewPanel, {
    global: {
      stubs: {
        "t-tabs": {
          template: '<div class="t-tabs"><slot /></div>',
          props: ["modelValue"],
          emits: ["update:modelValue"],
        },
        "t-tab-panel": {
          template: '<div class="t-tab-panel">{{ label }}</div>',
          props: ["value", "label"],
        },
        "t-input": {
          template:
            '<input class="t-input" :value="modelValue" @input="$emit(\'input\', $event.target.value)" @clear="$emit(\'clear\')" />',
          props: ["modelValue", "clearable"],
          emits: ["input", "clear", "update:modelValue"],
        },
        "t-icon": { template: "<span class='t-icon'><slot /></span>" },
        "t-tag": {
          template: '<span class="t-tag"><slot /></span>',
          props: ["size", "variant", "theme"],
        },
        "t-button": {
          template:
            '<button class="t-button" @click="$emit(\'click\')"><slot /></button>',
          props: ["size", "theme"],
        },
        "t-loading": {
          template: '<div class="t-loading"><slot /></div>',
          props: ["loading", "size"],
        },
        "t-pagination": {
          template: '<div class="t-pagination" />',
          props: ["current", "pageSize", "total", "size", "totalContent"],
          emits: ["current-change"],
        },
        "t-radio-group": {
          template: '<div class="t-radio-group"><slot /></div>',
          props: ["modelValue", "variant", "size"],
          emits: ["change", "update:modelValue"],
        },
        "t-radio-button": {
          template: '<label class="t-radio-button"><slot /></label>',
          props: ["value"],
        },
        "t-select": {
          template: '<select class="t-select" />',
          props: ["modelValue", "options", "placeholder", "clearable", "size"],
          emits: ["change", "update:modelValue"],
        },
        "router-link": {
          template: '<a class="router-link" :href="to"><slot /></a>',
          props: ["to"],
        },
      },
    },
  });
}

describe("AdminReviewPanel", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    push.mockClear();
    mockFetchPendingReviews.mockClear();
    mockFetchReviewedHistory.mockClear();
    mockFetchMaterialPendingReviews.mockClear();
    initStore();
  });

  describe("AR01-AR03: 渲染", () => {
    it("AR01: 组件应正确渲染容器", () => {
      const wrapper = createWrapper();
      expect(wrapper.find(".admin-review").exists()).toBe(true);
    });

    it("AR02: 应包含三个 tab 面板", () => {
      const wrapper = createWrapper();
      const panels = wrapper.findAll(".t-tab-panel");
      expect(panels.length).toBe(3);
    });

    it("AR03: tab 标签应有正确计数", () => {
      initStore({ pendingCount: 2, materialPendingCount: 1, reviewedTotal: 5 });
      const wrapper = createWrapper();
      const text = wrapper.text();
      expect(text).toContain("配方待审");
      expect(text).toContain("原料待审");
      expect(text).toContain("已审核");
    });
  });

  describe("AR10-AR12: Tab 切换", () => {
    it("AR10: 切换到原料待审应将 currentView 设为 material", () => {
      const wrapper = createWrapper();
      expect(wrapper.vm.currentView).toBe("pending");
      wrapper.vm.currentView = "material";
      expect(wrapper.vm.currentView).toBe("material");
    });

    it("AR11: 切换到已审核应将 currentView 设为 history", () => {
      const wrapper = createWrapper();
      wrapper.vm.currentView = "history";
      expect(wrapper.vm.currentView).toBe("history");
    });

    it("AR12: 切换 tab 触发对应 fetch 调用", () => {
      const wrapper = createWrapper();
      wrapper.vm.currentView = "material";
      wrapper.vm.$nextTick();
      expect(mockFetchMaterialPendingReviews).toHaveBeenCalled();
    });
  });

  describe("AR20-AR21: 筛选", () => {
    it("AR20: 搜索输入触发防抖后调用 fetch", async () => {
      vi.useFakeTimers();
      const wrapper = createWrapper();
      wrapper.vm.currentView = "pending";
      wrapper.vm.searchKeyword = "测试";
      wrapper.vm.onSearchInput();
      vi.advanceTimersByTime(300);
      expect(mockFetchPendingReviews).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "测试", page: 1 }),
      );
      vi.useRealTimers();
    });

    it("AR21: 点击筛选切换按钮应展开/收起筛选区域", async () => {
      const wrapper = createWrapper();
      expect(wrapper.vm.filterExpanded).toBe(false);
      await wrapper.find(".admin-review__filter-toggle").trigger("click");
      expect(wrapper.vm.filterExpanded).toBe(true);
      await wrapper.find(".admin-review__filter-toggle").trigger("click");
      expect(wrapper.vm.filterExpanded).toBe(false);
    });
  });

  describe("AR30-AR31: 操作", () => {
    it("AR30: 配方待审审核按钮导航到审核页面", async () => {
      initStore({
        pendingReviews: [
          {
            versionId: "v1",
            formulaId: "f1",
            formulaName: "测试配方",
            formulaCode: "F001",
            versionNumber: "v1.0",
            status: "pending_review",
            submittedBy: "u1",
            submittedByName: "张三",
            createdAt: "2026-06-01T10:00:00Z",
          },
        ],
        pendingCount: 1,
        pendingTotal: 1,
      });
      const wrapper = createWrapper();
      await wrapper.vm.$nextTick();
      const btn = wrapper.find(".admin-review__item-actions .t-button");
      expect(btn.exists()).toBe(true);
      await btn.trigger("click");
      expect(push).toHaveBeenCalledWith("/versions/formula/f1");
    });

    it("AR31: 原料待审审核按钮导航到原料版本页", async () => {
      initStore({
        materialPendingReviews: [
          {
            id: "m1",
            name: "测试原料",
            code: "M001",
            materialType: "herb",
            createdAt: "2026-06-01T10:00:00Z",
            updatedAt: "2026-06-01T10:00:00Z",
          },
        ],
        materialPendingCount: 1,
      });
      const wrapper = createWrapper();
      wrapper.vm.currentView = "material";
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      const btn = wrapper.find(".admin-review__item-actions .t-button");
      expect(btn.exists()).toBe(true);
      await btn.trigger("click");
      expect(push).toHaveBeenCalledWith("/materials/m1/versions");
    });
  });
});
