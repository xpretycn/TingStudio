import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
const mockTransaction = vi.fn(<T>(fn: () => T): T => fn());

vi.mock("../src/config/database-adapter.js", () => ({ query: mockQuery, transaction: mockTransaction }));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  buildPagination: vi.fn((p: number, ps: number) => ({ page: p || 1, pageSize: ps || 20, offset: 0 })),
  buildLike: vi.fn((k: string) => `%${k}%`),
  rowsToCamelCase: vi.fn((rows: Record<string, unknown>[]) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
      }
      return result;
    })
  ),
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
  safeJsonParse: vi.fn((str: string | null, def: unknown) => (str ? JSON.parse(str) : def)),
}));

vi.mock("../src/services/materialReviewService.js", () => ({
  getReviewLogs: vi.fn(() => []),
}));

const baseMaterial = {
  id: "mat-001",
  name: "当归",
  code: "DG001",
  unit: "g",
  stock: 500,
  material_type: "herb",
  unit_price: 28.0,
  data_source: "manual",
  created_by: "user-001",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  version: 1,
  previous_version_id: null,
  is_latest: 1,
  is_deleted: 0,
  status: "draft",
  appearance_json: null,
  taste_json: null,
  efficacy_json: null,
};

describe("materialService - 原料服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildChangesSummary - 构建变更摘要", () => {
    it("基本字段变更时应该生成变更记录", async () => {
      const { buildChangesSummary } = await import("../src/services/materialService.js");
      const newData = { name: "黄芪", unit: "kg" };
      const result = buildChangesSummary(baseMaterial, newData);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ field: "name", label: "名称", old: "当归", new: "黄芪" });
      expect(parsed[1]).toEqual({ field: "unit", label: "单位", old: "g", new: "kg" });
    });

    it("无变更时应该返回空数组", async () => {
      const { buildChangesSummary } = await import("../src/services/materialService.js");
      const newData = { name: "当归", unit: "g" };
      const result = buildChangesSummary(baseMaterial, newData);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(0);
    });

    it("营养成分变更时应该包含营养变更记录", async () => {
      const { buildChangesSummary } = await import("../src/services/materialService.js");
      const currentNutrition = { protein: 10, fat: 5 };
      const newNutritionJson = JSON.stringify({ protein_g: 15, fat_g: 8 });
      const result = buildChangesSummary(baseMaterial, {}, currentNutrition, newNutritionJson);
      const parsed = JSON.parse(result);

      expect(parsed.length).toBeGreaterThanOrEqual(2);
      const proteinChange = parsed.find((c: Record<string, unknown>) => c.field === "nutrition_protein");
      const fatChange = parsed.find((c: Record<string, unknown>) => c.field === "nutrition_fat");
      expect(proteinChange).toEqual({ field: "nutrition_protein", label: "营养·蛋白质", old: 10, new: 15 });
      expect(fatChange).toEqual({ field: "nutrition_fat", label: "营养·脂肪", old: 5, new: 8 });
    });

    it("营养数据解析失败时应该忽略营养变更", async () => {
      const { buildChangesSummary } = await import("../src/services/materialService.js");
      const currentNutrition = { protein: 10 };
      const result = buildChangesSummary(baseMaterial, {}, currentNutrition, "invalid-json");
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(0);
    });

    it("同时包含基本字段和营养成分变更", async () => {
      const { buildChangesSummary } = await import("../src/services/materialService.js");
      const currentNutrition = { protein: 10 };
      const newNutritionJson = JSON.stringify({ protein_g: 20 });
      const newData = { name: "黄芪" };
      const result = buildChangesSummary(baseMaterial, newData, currentNutrition, newNutritionJson);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].field).toBe("name");
      expect(parsed[1].field).toBe("nutrition_protein");
    });
  });

  describe("canEdit - 编辑权限判断", () => {
    it("admin 用户可以编辑任何原料", async () => {
      const { canEdit } = await import("../src/services/materialService.js");
      const admin = { userId: "admin-001", role: "admin" };
      expect(canEdit(admin, baseMaterial)).toBe(true);
    });

    it("创建者可以编辑自己的原料", async () => {
      const { canEdit } = await import("../src/services/materialService.js");
      const owner = { userId: "user-001", role: "formulist" };
      expect(canEdit(owner, baseMaterial)).toBe(true);
    });

    it("非创建者非 admin 不能编辑", async () => {
      const { canEdit } = await import("../src/services/materialService.js");
      const other = { userId: "user-002", role: "formulist" };
      expect(canEdit(other, baseMaterial)).toBe(false);
    });
  });

  describe("canDelete - 删除权限判断", () => {
    it("admin 用户可以删除", async () => {
      const { canDelete } = await import("../src/services/materialService.js");
      const admin = { userId: "admin-001", role: "admin" };
      expect(canDelete(admin)).toBe(true);
    });

    it("非 admin 用户不能删除", async () => {
      const { canDelete } = await import("../src/services/materialService.js");
      const formulist = { userId: "user-001", role: "formulist" };
      expect(canDelete(formulist)).toBe(false);
    });
  });

  describe("checkReference - 检查原料引用", () => {
    it("被配方引用时应该返回引用信息", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: "formula-001", name: "配方A" },
          { id: "formula-002", name: "配方B" },
        ],
      });

      const { checkReference } = await import("../src/services/materialService.js");
      const result = await checkReference("mat-001");

      expect(result.referenced).toBe(true);
      expect(result.count).toBe(2);
      expect(result.formulas).toEqual([
        { id: "formula-001", name: "配方A" },
        { id: "formula-002", name: "配方B" },
      ]);
    });

    it("未被引用时应该返回 referenced=false", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { checkReference } = await import("../src/services/materialService.js");
      const result = await checkReference("mat-002");

      expect(result.referenced).toBe(false);
      expect(result.count).toBe(0);
      expect(result.formulas).toEqual([]);
    });
  });

  describe("getLatestVersion - 获取最新版本", () => {
    it("存在时应该返回原料记录", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [baseMaterial] });

      const { getLatestVersion } = await import("../src/services/materialService.js");
      const result = await getLatestVersion("mat-001");

      expect(result).toEqual(baseMaterial);
      expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM materials WHERE id = ?", ["mat-001"]);
    });

    it("不存在时应该返回 null", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getLatestVersion } = await import("../src/services/materialService.js");
      const result = await getLatestVersion("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("softDeleteMaterial - 软删除原料", () => {
    it("被引用时应该返回 false 不执行删除", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: "formula-001", name: "配方A" }],
      });

      const { softDeleteMaterial } = await import("../src/services/materialService.js");
      const result = await softDeleteMaterial("mat-001");

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("未被引用时应该执行软删除并返回 true", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { softDeleteMaterial } = await import("../src/services/materialService.js");
      const result = await softDeleteMaterial("mat-001");

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenLastCalledWith(
        "UPDATE materials SET is_deleted = 1, updated_at = ? WHERE id = ?",
        ["2026-05-22T00:00:00.000Z", "mat-001"]
      );
    });
  });
});
