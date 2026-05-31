import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Request, Response } from "express";

const mockQuery = vi.fn();
const mockTransaction = vi.fn(<T>(fn: () => T): T => fn());
vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  generateMaterialCode: vi.fn(() => "TPSH"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data: unknown, message?: string) => ({
    success: true,
    message: message || "操作成功",
    data,
  })),
  successWithPagination: vi.fn(
    (list: unknown[], total: number, page: number, pageSize: number) => ({
      success: true,
      message: "查询成功",
      data: {
        list,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    })
  ),
  rowToCamelCase: vi.fn((row: unknown) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
  rowsToCamelCase: vi.fn((rows: unknown[]) =>
    rows.map((r: unknown) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r as Record<string, unknown>)) {
        result[key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())] = value;
      }
      return result;
    })
  ),
}));

vi.mock("../src/services/materialService.js", () => ({
  getMaterialList: vi.fn(() =>
    Promise.resolve({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
  ),
  getMaterialDetail: vi.fn(() => Promise.resolve(null)),
  getLatestVersion: vi.fn(() => Promise.resolve(null)),
  canEdit: vi.fn(() => true),
  canDelete: vi.fn(() => false),
  updateMaterial: vi.fn(() => Promise.resolve(null)),
  softDeleteMaterial: vi.fn(() => Promise.resolve(true)),
  checkReference: vi.fn(() =>
    Promise.resolve({ referenced: false, count: 0, formulas: [] })
  ),
}));

vi.mock("../src/services/materialReviewService.js", () => ({
  createReviewLog: vi.fn(() => Promise.resolve()),
  getPendingReviewList: vi.fn(() =>
    Promise.resolve({ list: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  ),
  getReviewLogs: vi.fn(() => Promise.resolve([])),
}));

interface MockUser {
  userId: string;
  role: string;
}

interface MockRequest {
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
  user: MockUser;
}

describe("materialController - 原料控制器", () => {
  let mockReq: MockRequest;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let mockRes: Partial<Response>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      json: jsonMock,
      status: statusMock,
    };

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { userId: "user-001", role: "formulist" },
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("getMaterials - 获取原料列表", () => {
    it("正常返回原料列表", async () => {
      mockReq.query = { keyword: "人参", page: "1", pageSize: "20" };
      mockReq.user = { userId: "user-001", role: "admin" };

      const mockResult = {
        list: [{ id: "mat-001", name: "人参" }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };

      const { getMaterialList } = await import("../src/services/materialService.js");
      vi.mocked(getMaterialList).mockResolvedValueOnce(mockResult);

      const { getMaterials } = await import("../src/controllers/materialController.js");
      await getMaterials(mockReq as unknown as Request, mockRes as Response);

      expect(vi.mocked(getMaterialList)).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: "人参",
          page: 1,
          pageSize: 20,
          userId: "user-001",
          userRole: "admin",
        })
      );
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "查询成功",
          data: mockResult,
        })
      );
    });

    it("服务异常返回 500", async () => {
      mockReq.query = { page: "1", pageSize: "20" };
      mockReq.user = { userId: "user-001", role: "formulist" };

      const { getMaterialList } = await import("../src/services/materialService.js");
      vi.mocked(getMaterialList).mockRejectedValueOnce(new Error("数据库错误"));

      const { getMaterials } = await import("../src/controllers/materialController.js");
      await getMaterials(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "获取原料列表失败",
        })
      );
    });
  });

  describe("getMaterial - 获取原料详情", () => {
    it("正常返回原料详情", async () => {
      mockReq.params = { id: "mat-001" };

      const mockDetail = { id: "mat-001", name: "人参", code: "TPSH" };
      const { getMaterialDetail } = await import("../src/services/materialService.js");
      vi.mocked(getMaterialDetail).mockResolvedValueOnce(mockDetail);

      const { getMaterial } = await import("../src/controllers/materialController.js");
      await getMaterial(mockReq as unknown as Request, mockRes as Response);

      expect(vi.mocked(getMaterialDetail)).toHaveBeenCalledWith("mat-001", "user-001");
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockDetail,
        })
      );
    });

    it("原料不存在返回 404", async () => {
      mockReq.params = { id: "mat-nonexistent" };

      const { getMaterialDetail } = await import("../src/services/materialService.js");
      vi.mocked(getMaterialDetail).mockResolvedValueOnce(null);

      const { getMaterial } = await import("../src/controllers/materialController.js");
      await getMaterial(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "原料不存在",
        })
      );
    });
  });

  describe("createMaterial - 创建原料", () => {
    it("正常创建原料返回 201", async () => {
      mockReq.body = {
        name: "人参",
        code: "TPSH",
        unit: "g",
        stock: 100,
        materialType: "herb",
        unitPrice: 50,
        dataSource: "manual",
      };
      mockReq.user = { userId: "user-001", role: "formulist" };

      const insertedRow = {
        id: "mock-id-123",
        name: "人参",
        code: "TPSH",
        unit: "g",
        material_type: "herb",
        unit_price: 50,
        status: "draft",
      };

      mockQuery
        .mockResolvedValueOnce([{ changes: 1 }])
        .mockResolvedValueOnce([[insertedRow], null]);

      const { createMaterial } = await import("../src/controllers/materialController.js");
      await createMaterial(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "原料创建成功，当前为草稿状态",
        })
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("INSERT INTO materials"),
        expect.arrayContaining(["mock-id-123", "人参", "TPSH"])
      );
    });

    it("编码重复返回 409", async () => {
      mockReq.body = { name: "人参", code: "TPSH" };
      mockReq.user = { userId: "user-001", role: "formulist" };

      mockQuery.mockRejectedValueOnce(new Error("UNIQUE constraint failed: materials.code"));

      const { createMaterial } = await import("../src/controllers/materialController.js");
      await createMaterial(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "原料编码已存在，请使用其他编码",
        })
      );
    });
  });

  describe("updateMaterial - 更新原料", () => {
    it("正常更新原料（无引用，同版本更新）", async () => {
      mockReq.params = { id: "mat-001" };
      mockReq.body = { name: "人参（更新）" };
      mockReq.user = { userId: "user-001", role: "formulist" };

      const currentVersion = {
        id: "mat-001",
        name: "人参",
        status: "draft",
        version: 1,
        created_by: "user-001",
      };

      const updatedMaterial = {
        id: "mat-001",
        version: 1,
        is_latest: 1,
      };

      const { getLatestVersion, canEdit, updateMaterial, checkReference } =
        await import("../src/services/materialService.js");

      vi.mocked(getLatestVersion).mockResolvedValueOnce(currentVersion);
      vi.mocked(canEdit).mockReturnValueOnce(true);
      vi.mocked(updateMaterial).mockResolvedValueOnce(updatedMaterial);
      vi.mocked(checkReference).mockResolvedValueOnce({
        referenced: false,
        count: 0,
        formulas: [],
      });

      const { updateMaterial: updateMaterialController } = await import(
        "../src/controllers/materialController.js"
      );
      await updateMaterialController(mockReq as unknown as Request, mockRes as Response);

      expect(vi.mocked(getLatestVersion)).toHaveBeenCalledWith("mat-001");
      expect(vi.mocked(canEdit)).toHaveBeenCalledWith(
        { userId: "user-001", role: "formulist" },
        currentVersion
      );
      expect(vi.mocked(updateMaterial)).toHaveBeenCalledWith("mat-001", mockReq.body);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "原料更新成功",
        })
      );
    });

    it("原料不存在返回 404", async () => {
      mockReq.params = { id: "mat-nonexistent" };
      mockReq.user = { userId: "user-001", role: "formulist" };

      const { getLatestVersion } = await import("../src/services/materialService.js");
      vi.mocked(getLatestVersion).mockResolvedValueOnce(null);

      const { updateMaterial: updateMaterialController } = await import(
        "../src/controllers/materialController.js"
      );
      await updateMaterialController(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "原料不存在",
        })
      );
    });

    it("无编辑权限返回 403", async () => {
      mockReq.params = { id: "mat-001" };
      mockReq.user = { userId: "user-002", role: "formulist" };

      const currentVersion = {
        id: "mat-001",
        name: "人参",
        status: "draft",
        version: 1,
        created_by: "user-001",
      };

      const { getLatestVersion, canEdit } = await import("../src/services/materialService.js");
      vi.mocked(getLatestVersion).mockResolvedValueOnce(currentVersion);
      vi.mocked(canEdit).mockReturnValueOnce(false);

      const { updateMaterial: updateMaterialController } = await import(
        "../src/controllers/materialController.js"
      );
      await updateMaterialController(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "您没有权限编辑此原料",
            code: "FORBIDDEN",
          }),
        })
      );
    });

    it("待审批状态不可编辑返回 400", async () => {
      mockReq.params = { id: "mat-001" };
      mockReq.user = { userId: "user-001", role: "formulist" };

      const currentVersion = {
        id: "mat-001",
        name: "人参",
        status: "pending_review",
        version: 1,
        created_by: "user-001",
      };

      const { getLatestVersion, canEdit } = await import("../src/services/materialService.js");
      vi.mocked(getLatestVersion).mockResolvedValueOnce(currentVersion);
      vi.mocked(canEdit).mockReturnValueOnce(true);

      const { updateMaterial: updateMaterialController } = await import(
        "../src/controllers/materialController.js"
      );
      await updateMaterialController(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "待审批状态的原料不可编辑，请等待审批结果",
            code: "VALIDATION_ERROR",
          }),
        })
      );
    });
  });

  describe("deleteMaterial - 删除原料", () => {
    it("非管理员返回 403", async () => {
      mockReq.params = { id: "mat-001" };
      mockReq.user = { userId: "user-001", role: "formulist" };

      const { canDelete } = await import("../src/services/materialService.js");
      vi.mocked(canDelete).mockReturnValueOnce(false);

      const { deleteMaterial } = await import("../src/controllers/materialController.js");
      await deleteMaterial(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "仅管理员可删除原料",
            code: "FORBIDDEN",
          }),
        })
      );
    });

    it("被引用的原料不可删除返回 400", async () => {
      mockReq.params = { id: "mat-001" };
      mockReq.user = { userId: "admin-001", role: "admin" };

      const { canDelete, checkReference } = await import("../src/services/materialService.js");
      vi.mocked(canDelete).mockReturnValueOnce(true);
      vi.mocked(checkReference).mockResolvedValueOnce({
        referenced: true,
        count: 3,
        formulas: [
          { id: "f-001", name: "配方A" },
          { id: "f-002", name: "配方B" },
          { id: "f-003", name: "配方C" },
        ],
      });

      const { deleteMaterial } = await import("../src/controllers/materialController.js");
      await deleteMaterial(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "该原料正在被 3 个配方引用，无法删除",
            code: "VALIDATION_ERROR",
          }),
        })
      );
    });
  });
});
