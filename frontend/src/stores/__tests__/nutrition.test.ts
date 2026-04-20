import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useNutritionStore } from "@/stores/nutrition";
import { nutritionApi } from "@/api/nutrition";

const mockGetMaterialNutrition = vi.hoisted(() => vi.fn(() => Promise.resolve({ protein: 20, carbs: 50 })));

vi.mock("@/api/nutrition", () => ({
  nutritionApi: {
    getMaterialNutrition: mockGetMaterialNutrition,
    setMaterialNutrition: vi.fn(() => Promise.resolve()),
    calculateFormulaNutrition: vi.fn(() => Promise.resolve({ totalCalories: 2000 })),
    getProfiles: vi.fn(() => Promise.resolve([{ id: "p1", name: "标准A" }])),
    createProfile: vi.fn(() => Promise.resolve()),
    updateProfile: vi.fn(() => Promise.resolve()),
    deleteProfile: vi.fn(() => Promise.resolve()),
    checkCompliance: vi.fn(() => Promise.resolve({ compliant: true })),
  },
}));

describe("Nutrition Store", () => {
  let store: ReturnType<typeof useNutritionStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useNutritionStore();
    mockGetMaterialNutrition.mockResolvedValue({ protein: 20, carbs: 50 });
  });

  it("NUT-01: 初始状态应正确设置", () => {
    expect(store.loading).toBe(false);
    expect(store.profiles).toEqual([]);
    expect(store.materialNutrition).toBeNull();
    expect(store.formulaNutrition).toBeNull();
    expect(store.complianceResult).toBeNull();
  });

  it("NUT-02: getMaterialNutrition 应获取原料营养数据", async () => {
    const result = await store.getMaterialNutrition("m1");
    expect(result.success).toBe(true);
    expect(store.loading).toBe(false);
  });

  it("NUT-03: setMaterialNutrition 应调用 API 设置数据", async () => {
    const result = await store.setMaterialNutrition("m1", { per100g: { protein: 20 } });
    expect(result.success).toBe(true);
  });

  it("NUT-04: calculateFormulaNutrition 应计算配方营养", async () => {
    const result = await store.calculateFormulaNutrition("f1");
    expect(result.success).toBe(true);
    expect(store.formulaNutrition).not.toBeNull();
  });

  it("NUT-05: fetchProfiles 应加载营养标准列表", async () => {
    await store.fetchProfiles();
    expect(store.profiles.length).toBeGreaterThan(0);
  });

  it("NUT-06: createProfile 应创建新标准并刷新列表", async () => {
    const result = await store.createProfile({
      name: "新标准",
      category: "custom",
      targetValues: { protein: 15 },
    });
    expect(result.success).toBe(true);
  });

  it("NUT-07: updateProfile 应更新标准并刷新列表", async () => {
    const result = await store.updateProfile("p1", {
      name: "更新后",
      category: "custom",
      targetValues: { protein: 18 },
    });
    expect(result.success).toBe(true);
  });

  it("NUT-08: deleteProfile 应删除标准并刷新列表", async () => {
    const result = await store.deleteProfile("p1");
    expect(result.success).toBe(true);
  });

  it("NUT-09: checkCompliance 应检查合规性", async () => {
    const result = await store.checkCompliance("f1", "p1");
    expect(result.success).toBe(true);
    expect(store.complianceResult).not.toBeNull();
  });

  it("NUT-10: API 失败时应返回 success: false", async () => {
    mockGetMaterialNutrition.mockRejectedValueOnce(new Error("网络错误"));
    const result = await store.getMaterialNutrition("m1");
    expect(result.success).toBe(false);
  });
});
