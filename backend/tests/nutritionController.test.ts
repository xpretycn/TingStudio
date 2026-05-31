import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";

const mockService = {
  getMaterialNutritionData: vi.fn(),
  setMaterialNutritionData: vi.fn(),
  calculateFormulaNutritionData: vi.fn(),
  getNutritionProfilesList: vi.fn(),
  createNutritionProfile: vi.fn(),
  updateNutritionProfileData: vi.fn(),
  deleteNutritionProfileData: vi.fn(),
  getComplianceCheckData: vi.fn(),
  saveComplianceReport: vi.fn(),
  getProfileById: vi.fn(),
  getFormulaNutritionTablesData: vi.fn(),
  getAnalyzeFormulaData: vi.fn(),
  getCoverageData: vi.fn(),
};

vi.mock("../src/services/nutritionService.js", () => mockService);

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data, message) => ({ success: true, message: message || "操作成功", data })),
  rowToCamelCase: vi.fn((row) => {
    if (!row) return row;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
  rowsToCamelCase: vi.fn((rows) =>
    (rows as Record<string, unknown>[]).map((r) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
      }
      return result;
    })
  ),
  safeJsonParse: vi.fn((str: string | null, def: unknown) => {
    if (!str) return def;
    try {
      return JSON.parse(str);
    } catch {
      return def;
    }
  }),
}));

vi.mock("../src/config/nutritionConstants.js", () => ({
  NUTRIENT_FIELDS: ["energy", "protein", "fat", "carbohydrate", "fiber", "sugars", "sodium"],
  NRV_REFERENCE: { energy: 8400, protein: 60, fat: 60, carbohydrate: 300, sodium: 2000, fiber: 25 },
  ZERO_THRESHOLD: { energy: 17, protein: 0.5, fat: 0.5, carbohydrate: 0.5, sodium: 5 },
  NUTRIENT_LABELS: { energy: "能量", protein: "蛋白质", fat: "脂肪", carbohydrate: "碳水化合物", sodium: "钠" },
  CORE_NUTRIENT_COLS: ["protein", "fat", "carbohydrate", "sodium"],
  LABEL_INFO: {
    energy: { name: "能量", unit: "千焦(kJ)", zeroThreshold: "≤17千焦(kJ)", tolerance: "≤120%标示值" },
    protein: { name: "蛋白质", unit: "克(g)", zeroThreshold: "≤0.5克(g)", tolerance: "≥80%标示值" },
    fat: { name: "脂肪", unit: "克(g)", zeroThreshold: "≤0.5克(g)", tolerance: "≤120%标示值" },
    carbohydrate: { name: "碳水化合物", unit: "克(g)", zeroThreshold: "≤0.5克(g)", tolerance: "≥80%标示值" },
    sodium: { name: "钠", unit: "毫克(mg)", zeroThreshold: "≤5毫克(mg)", tolerance: "≤120%标示值" },
  },
}));

vi.mock("../src/utils/nutritionHelpers.js", () => ({
  normalizeNutrientKey: vi.fn((key: string) => key),
  normalizePer100g: vi.fn((data: Record<string, unknown>) => data as Record<string, number>),
  normalizeMaterialName: vi.fn((name: string) => name?.trim()),
  parseMaterialsJson: vi.fn((data: unknown) => {
    if (typeof data === "string") {
      try { return JSON.parse(data); } catch { return []; }
    }
    return Array.isArray(data) ? data : [];
  }),
}));

describe("nutritionController - 营养成分管理控制器", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockReq = { params: {}, query: {}, body: {} };
    mockRes = { json: jsonMock, status: statusMock };
  });

  describe("getMaterialNutrition - 获取原料营养成分", () => {
    it("原料存在营养成分时返回数据", async () => {
      mockReq.params = { materialId: "mat-001" };
      mockService.getMaterialNutritionData.mockResolvedValueOnce({
        nutritionId: "nutr-001",
        materialId: "mat-001",
        per100g: { protein: 10, fat: 5, carbohydrate: 20 },
        dataSource: "manual",
      });

      const { getMaterialNutrition } = await import("../src/controllers/nutritionController.js");
      await getMaterialNutrition(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalled();
      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg.success).toBe(true);
      expect(callArg.data.per100g).toBeDefined();
      expect(callArg.data.per100g.protein).toBe(10);
    });

    it("原料不存在营养成分时返回 null", async () => {
      mockReq.params = { materialId: "mat-002" };
      mockService.getMaterialNutritionData.mockResolvedValueOnce(null);

      const { getMaterialNutrition } = await import("../src/controllers/nutritionController.js");
      await getMaterialNutrition(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: null });
    });
  });

  describe("setMaterialNutrition - 设置原料营养成分", () => {
    it("原料不存在时返回 404", async () => {
      mockReq.params = { materialId: "mat-999" };
      (mockReq as Record<string, unknown>).body = {
        per100g: { protein: 10 },
        dataSource: "manual",
      };
      (mockReq as Record<string, unknown>).user = { userId: "user-001" };
      mockService.setMaterialNutritionData.mockResolvedValueOnce({
        success: false,
        message: "原料不存在",
      });

      const { setMaterialNutrition } = await import("../src/controllers/nutritionController.js");
      await setMaterialNutrition(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "原料不存在" })
      );
    });
  });

  describe("calculateFormulaNutrition - 计算配方营养汇总", () => {
    it("配方不存在时返回 404", async () => {
      mockReq.params = { formulaId: "f-999" };
      (mockReq as Record<string, unknown>).user = { userId: "user-001" };
      mockService.calculateFormulaNutritionData.mockResolvedValueOnce(null);

      const { calculateFormulaNutrition } = await import("../src/controllers/nutritionController.js");
      await calculateFormulaNutrition(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "配方不存在" })
      );
    });
  });

  describe("getNutritionProfiles - 获取营养标准列表", () => {
    it("无分类筛选时返回全部列表", async () => {
      mockService.getNutritionProfilesList.mockResolvedValueOnce([
        { profileId: "p-001", name: "标准A", description: "描述A", category: "herb", targetValues: { protein: 10 }, toleranceRanges: [], mandatoryFields: [] },
        { profileId: "p-002", name: "标准B", description: "描述B", category: "supplement", targetValues: { fat: 5 }, toleranceRanges: [], mandatoryFields: [] },
      ]);

      const { getNutritionProfiles } = await import("../src/controllers/nutritionController.js");
      await getNutritionProfiles(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalled();
      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg.success).toBe(true);
      expect(callArg.data).toHaveLength(2);
    });
  });

  describe("createNutritionProfile - 创建营养标准", () => {
    it("成功创建并返回 201", async () => {
      (mockReq as Record<string, unknown>).body = {
        name: "新标准",
        description: "测试标准",
        category: "herb",
        targetValues: { protein: 15 },
        toleranceRanges: [],
        mandatoryFields: [],
      };
      (mockReq as Record<string, unknown>).user = { userId: "user-001" };
      mockService.createNutritionProfile.mockResolvedValueOnce({ profileId: "mock-id-123" });

      const { createNutritionProfile } = await import("../src/controllers/nutritionController.js");
      await createNutritionProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalled();
      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg.success).toBe(true);
      expect(callArg.data.profileId).toBe("mock-id-123");
    });
  });

  describe("updateNutritionProfile - 更新营养标准", () => {
    it("预置标准不可修改，返回 403", async () => {
      mockReq.params = { profileId: "p-preset" };
      (mockReq as Record<string, unknown>).body = {
        name: "修改名称",
        description: "修改描述",
        category: "herb",
        targetValues: {},
        toleranceRanges: [],
        mandatoryFields: [],
      };
      (mockReq as Record<string, unknown>).user = { userId: "user-001" };
      mockService.updateNutritionProfileData.mockResolvedValueOnce({
        success: false,
        message: "预置营养标准不可修改",
      });

      const { updateNutritionProfile } = await import("../src/controllers/nutritionController.js");
      await updateNutritionProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "预置营养标准不可修改" })
      );
    });

    it("标准不存在时返回 404", async () => {
      mockReq.params = { profileId: "p-999" };
      (mockReq as Record<string, unknown>).body = {
        name: "修改名称",
        description: "修改描述",
        category: "herb",
        targetValues: {},
        toleranceRanges: [],
        mandatoryFields: [],
      };
      (mockReq as Record<string, unknown>).user = { userId: "user-001" };
      mockService.updateNutritionProfileData.mockResolvedValueOnce({
        success: false,
        message: "营养标准不存在",
      });

      const { updateNutritionProfile } = await import("../src/controllers/nutritionController.js");
      await updateNutritionProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "营养标准不存在" })
      );
    });
  });

  describe("deleteNutritionProfile - 删除营养标准", () => {
    it("预置标准不可删除，返回 403", async () => {
      mockReq.params = { profileId: "p-preset" };
      mockService.deleteNutritionProfileData.mockResolvedValueOnce({
        success: false,
        message: "预置营养标准不可删除",
      });

      const { deleteNutritionProfile } = await import("../src/controllers/nutritionController.js");
      await deleteNutritionProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "预置营养标准不可删除" })
      );
    });
  });
});
