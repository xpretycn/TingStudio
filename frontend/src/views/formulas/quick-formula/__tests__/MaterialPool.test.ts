import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";
import MaterialPool from "@/views/formulas/quick-formula/MaterialPool.vue";
import type { Material } from "@/api/material";

// ---------------------------------------------------------------------------
// Browser API polyfills (not available in jsdom)
// ---------------------------------------------------------------------------

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = MockResizeObserver;
}

const rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;
if (typeof globalThis.requestAnimationFrame === "undefined") {
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return ++rafId;
  };
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = (id: number) => {
    const idx = rafCallbacks.findIndex((_, i) => i + 1 === id);
    if (idx !== -1) rafCallbacks.splice(idx, 1);
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMaterials: Material[] = [
  {
    id: "m1",
    name: "枸杞",
    code: "C001",
    unit: "g",
    stock: 100,
    materialType: "herb",
    unitPrice: 12.5,
    createdBy: "u1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    version: 1,
    isLatest: 1,
    isDeleted: 0,
    isOwner: true,
    referenceCount: 5,
    totalVersions: 1,
    hasNewerVersion: false,
    nutrition: { energy: 100, protein: 5, fat: 2, carbohydrate: 20, sodium: 10 },
    status: "published",
    appearance: ["红色"],
    taste: ["甘"],
    efficacy: ["补肾"],
  },
  {
    id: "m2",
    name: "蜂蜜",
    code: "C002",
    unit: "ml",
    stock: 200,
    materialType: "supplement",
    unitPrice: 20.0,
    createdBy: "u1",
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    version: 1,
    isLatest: 1,
    isDeleted: 0,
    isOwner: true,
    referenceCount: 3,
    totalVersions: 1,
    hasNewerVersion: false,
    nutrition: { energy: 300, protein: 1, fat: 0, carbohydrate: 80, sodium: 5 },
    status: "published",
    appearance: ["黄色"],
    taste: ["甜"],
    efficacy: ["润燥"],
  },
  {
    id: "m3",
    name: "黄芪",
    code: "C003",
    unit: "g",
    stock: 150,
    materialType: "herb",
    unitPrice: 15.0,
    createdBy: "u1",
    createdAt: "2024-01-03T00:00:00.000Z",
    updatedAt: "2024-01-03T00:00:00.000Z",
    version: 1,
    isLatest: 1,
    isDeleted: 0,
    isOwner: true,
    referenceCount: 8,
    totalVersions: 1,
    hasNewerVersion: false,
    nutrition: { energy: 50, protein: 3, fat: 1, carbohydrate: 10, sodium: 8 },
    status: "published",
    appearance: ["黄色"],
    taste: ["甘"],
    efficacy: ["补气"],
  },
];

const mockAddMaterial = vi.fn();

const sharedPoolFilter = reactive({
  keyword: "",
  type: "all" as string,
  appearance: [] as string[],
  taste: [] as string[],
  efficacy: [] as string[],
});

const sharedFormulaData = reactive({
  materials: [] as Array<{ materialId: string }>,
});

vi.mock("@/stores/quickFormula", () => ({
  useQuickFormulaStore: vi.fn(() => ({
    poolFilter: sharedPoolFilter,
    formulaData: sharedFormulaData,
    addMaterial: mockAddMaterial,
  })),
}));

vi.mock("@/stores/material", () => ({
  useMaterialStore: vi.fn(() => ({
    allMaterials: mockMaterials,
    fetchAllForSelect: vi.fn(),
  })),
}));

vi.mock("@/stores/enum", () => ({
  useEnumStore: vi.fn(() => ({
    loaded: true,
    fetchEnums: vi.fn(),
    getActiveOptionsByCategory: vi.fn(() => []),
    getExcludedValues: vi.fn(() => new Set<string>()),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  return mount(MaterialPool, {
    global: {
      stubs: {
        "t-input": {
          template: "<div class='t-input-stub'><slot /><slot name='prefix-icon' /></div>",
          props: ["modelValue", "placeholder", "clearable", "size"],
          emits: ["update:modelValue"],
        },
        "t-icon": {
          template: "<span class='t-icon-stub' />",
          props: ["name", "size"],
        },
        "t-button": {
          template: "<div class='t-button-stub' @click='$emit(\"click\")'><slot /><slot name='icon' /></div>",
          props: ["variant", "size"],
          emits: ["click"],
        },
        MaterialFish: {
          template: "<div class='material-fish-stub' @click='$emit(\"add\", material)'>{{ material.name }}</div>",
          props: ["material", "freeMove", "freePos"],
          emits: ["add"],
        },
      },
    },
    attachTo: document.body,
  });
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("MaterialPool", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    sharedPoolFilter.keyword = "";
    sharedPoolFilter.type = "all";
    sharedPoolFilter.appearance = [];
    sharedPoolFilter.taste = [];
    sharedPoolFilter.efficacy = [];
    sharedFormulaData.materials = [];
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  // =========================================================================
  // P01-P03: Rendering
  // =========================================================================

  describe("Rendering", () => {
    it("P01: Shows materials in grid view by default", async () => {
      wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find(".pool-materials").exists()).toBe(true);
      expect(wrapper.find(".pool-free").exists()).toBe(false);
      expect(wrapper.findAll(".material-fish-stub").length).toBe(mockMaterials.length);
    });

    it("P02: Shows material count in counter bar", async () => {
      wrapper = createWrapper();
      await flushPromises();

      const counter = wrapper.find(".pool-counter");
      expect(counter.exists()).toBe(true);

      const herbCount = counter.findAll(".counter-item").at(0);
      expect(herbCount?.text()).toContain("主料");
      expect(herbCount?.text()).toContain("2");

      const supplementCount = counter.findAll(".counter-item").at(1);
      expect(supplementCount?.text()).toContain("辅料");
      expect(supplementCount?.text()).toContain("1");

      expect(counter.find(".counter-total").text()).toContain("3");
    });

    it("P03: Shows search input", async () => {
      wrapper = createWrapper();
      await flushPromises();

      const searchInput = wrapper.find(".filter-search");
      expect(searchInput.exists()).toBe(true);
    });
  });

  // =========================================================================
  // P10-P12: Filtering
  // =========================================================================

  describe("Filtering", () => {
    it("P10: Filters materials by keyword", async () => {
      wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.findAll(".material-fish-stub").length).toBe(3);

      sharedPoolFilter.keyword = "枸";
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".material-fish-stub").length).toBe(1);
      expect(wrapper.find(".material-fish-stub").text()).toBe("枸杞");
    });

    it("P11: Filters by type (herb/supplement)", async () => {
      wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.findAll(".material-fish-stub").length).toBe(3);

      sharedPoolFilter.type = "herb";
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".material-fish-stub").length).toBe(2);
      expect(wrapper.findAll(".material-fish-stub").every((el) => ["枸杞", "黄芪"].includes(el.text()))).toBe(true);

      sharedPoolFilter.type = "supplement";
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".material-fish-stub").length).toBe(1);
      expect(wrapper.find(".material-fish-stub").text()).toBe("蜂蜜");
    });

    it("P12: Reset button clears all filters", async () => {
      wrapper = createWrapper();
      await flushPromises();

      sharedPoolFilter.keyword = "枸";
      sharedPoolFilter.type = "herb";
      await wrapper.vm.$nextTick();

      expect(wrapper.findAll(".material-fish-stub").length).toBe(1);

      const resetBtn = wrapper.find(".filter-reset");
      expect(resetBtn.exists()).toBe(true);
      await resetBtn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(sharedPoolFilter.keyword).toBe("");
      expect(sharedPoolFilter.type).toBe("all");
      expect(wrapper.findAll(".material-fish-stub").length).toBe(3);
    });
  });

  // =========================================================================
  // P20-P21: Actions
  // =========================================================================

  describe("Actions", () => {
    it("P20: Click material emits add event", async () => {
      wrapper = createWrapper();
      await flushPromises();

      const firstFish = wrapper.find(".material-fish-stub");
      expect(firstFish.exists()).toBe(true);

      await firstFish.trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockAddMaterial).toHaveBeenCalledTimes(1);
      expect(mockAddMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "m1",
          name: "枸杞",
        }),
      );
    });

    it("P21: Toggle view mode changes display", async () => {
      wrapper = createWrapper();
      await flushPromises();

      expect(wrapper.find(".pool-materials").exists()).toBe(true);
      expect(wrapper.find(".pool-free").exists()).toBe(false);

      const poolBtn = wrapper.findAll(".view-toggle-btn").at(1);
      expect(poolBtn?.exists()).toBe(true);
      await poolBtn?.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".pool-materials").exists()).toBe(false);
      expect(wrapper.find(".pool-free").exists()).toBe(true);

      const gridBtn = wrapper.findAll(".view-toggle-btn").at(0);
      await gridBtn?.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".pool-materials").exists()).toBe(true);
      expect(wrapper.find(".pool-free").exists()).toBe(false);
    });
  });
});
