import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";

const mockQuery = vi.fn();
vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/services/reviewService.js", () => ({
  createReviewLog: vi.fn(),
  getReviewLogs: vi.fn(),
  getPendingReviewList: vi.fn(),
  isFormulaOwner: vi.fn(),
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data, message) => ({ success: true, data, message })),
  rowToCamelCase: vi.fn((row) => {
    if (!row) return row;
    const result: any = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }),
  rowsToCamelCase: vi.fn((rows) =>
    rows?.map((r: any) => {
      const result: any = {};
      for (const [key, value] of Object.entries(r)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c) =>
          c.toUpperCase()
        );
        result[camelKey] = value;
      }
      return result;
    }) || []
  ),
  safeJsonParse: vi.fn((json, fallback) => {
    if (!json) return fallback;
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }),
}));

describe("VersionController - 版本审批控制器", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  const mockVersion = {
    version_id: "v-001",
    formula_id: "f-001",
    version_number: "v1.0",
    status: "pending_review",
    is_current: 0,
    created_by: "user-001",
    snapshot_json: JSON.stringify({
      name: "测试配方",
      salesmanId: "s-001",
      salesmanName: "张三",
      materials: [],
      packagingPrice: 0,
      otherPrice: 0,
      profitMargin: 20,
      description: "测试",
    }),
    changes_json: null,
    ratio_factor: 0.18,
    supplement_ratio_factor: 1.0,
  };

  const mockDraftVersion = {
    ...mockVersion,
    version_id: "v-draft",
    status: "draft",
    created_by: "user-001",
  };

  const mockFormula = {
    id: "f-001",
    name: "测试配方",
    salesman_id: "s-001",
    salesman_name: "张三",
    materials_json: JSON.stringify([]),
    finished_weight: 100,
    ratio_factor: 0.18,
    supplement_ratio_factor: 1.0,
    packaging_price: 0,
    other_price: 0,
    profit_margin: 20,
    description: "测试",
    created_by: "user-001",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockQuery.mockImplementation(() => Promise.resolve([[], null]));
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe("submitVersion - 提交版本审批", () => {
    it("应该成功提交草稿版本，状态变为 pending_review", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };
      (mockReq as any).body = { comment: "请审批" };

      mockQuery
        .mockResolvedValueOnce([[mockDraftVersion], null]) // SELECT version
        .mockResolvedValueOnce([[{ display_name: "用户A" }], null]) // SELECT user
        .mockResolvedValueOnce([{ changes: 1 }, null]); // UPDATE status

      const { createReviewLog } = await import(
        "../src/services/reviewService.js"
      );
      const { submitVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await submitVersion(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            versionId: "v-draft",
            status: "pending_review",
          }),
        })
      );
      expect(createReviewLog).toHaveBeenCalledWith(
        expect.objectContaining({
          versionId: "v-draft",
          action: "submit",
          comment: "请审批",
        })
      );
    });

    it("非草稿版本应返回 400 VALIDATION_ERROR", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      mockQuery.mockResolvedValueOnce([[mockVersion], null]); // SELECT version (status: pending_review)

      const { submitVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await submitVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        })
      );
    });

    it("非创建者非管理员应返回 403 FORBIDDEN", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "user-002", role: "formulist" };

      const otherDraftVersion = {
        ...mockDraftVersion,
        created_by: "user-001",
      };
      mockQuery.mockResolvedValueOnce([[otherDraftVersion], null]);

      const { submitVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await submitVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });

    it("不存在的版本应返回 404 NOT_FOUND", async () => {
      mockReq.params = { versionId: "v-nonexistent" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      mockQuery.mockResolvedValueOnce([[], null]); // SELECT version → empty

      const { submitVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await submitVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });

    it("管理员可以提交任何版本", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };
      (mockReq as any).body = { comment: "管理员提交" };

      const otherDraftVersion = {
        ...mockDraftVersion,
        created_by: "user-002",
      };
      mockQuery
        .mockResolvedValueOnce([[otherDraftVersion], null]) // SELECT version
        .mockResolvedValueOnce([[{ display_name: "管理员" }], null]) // SELECT user
        .mockResolvedValueOnce([{ changes: 1 }, null]); // UPDATE status

      const { submitVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await submitVersion(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            versionId: "v-draft",
            status: "pending_review",
          }),
        })
      );
    });
  });

  describe("approveVersion - 批准版本", () => {
    it("管理员应成功批准待审批版本", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };
      (mockReq as any).body = { comment: "批准" };

      mockQuery
        .mockResolvedValueOnce([[mockVersion], null]) // SELECT version
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE archive others
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE publish version
        .mockResolvedValueOnce([[mockFormula], null]) // SELECT formula (syncSnapshotToFormula)
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE formula (syncSnapshotToFormula)
        .mockResolvedValueOnce([[{ display_name: "管理员" }], null]); // SELECT user

      const { createReviewLog } = await import(
        "../src/services/reviewService.js"
      );
      const { approveVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await approveVersion(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            versionId: "v-001",
            status: "published",
            isCurrent: 1,
          }),
        })
      );
      expect(createReviewLog).toHaveBeenCalledWith(
        expect.objectContaining({
          versionId: "v-001",
          action: "approve",
        })
      );
    });

    it("非管理员应返回 403", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      const { approveVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await approveVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });

    it("非待审批版本应返回 400 VALIDATION_ERROR", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      const draftVersion = { ...mockVersion, status: "draft" };
      mockQuery.mockResolvedValueOnce([[draftVersion], null]); // SELECT version

      const { approveVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await approveVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        })
      );
    });

    it("不存在的版本应返回 404 NOT_FOUND", async () => {
      mockReq.params = { versionId: "v-nonexistent" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      mockQuery.mockResolvedValueOnce([[], null]); // SELECT version → empty

      const { approveVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await approveVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });
  });

  describe("rejectVersion - 驳回版本", () => {
    it("管理员应成功驳回待审批版本，状态变为 draft", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };
      (mockReq as any).body = { comment: "需要修改" };

      mockQuery
        .mockResolvedValueOnce([[mockVersion], null]) // SELECT version
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE status to draft
        .mockResolvedValueOnce([[{ display_name: "管理员" }], null]); // SELECT user

      const { createReviewLog } = await import(
        "../src/services/reviewService.js"
      );
      const { rejectVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await rejectVersion(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            versionId: "v-001",
            status: "draft",
            comment: "需要修改",
          }),
        })
      );
      expect(createReviewLog).toHaveBeenCalledWith(
        expect.objectContaining({
          versionId: "v-001",
          action: "reject",
          comment: "需要修改",
        })
      );
    });

    it("驳回时未填写意见应返回 400 VALIDATION_ERROR", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };
      (mockReq as any).body = { comment: "" };

      const { rejectVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await rejectVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        })
      );
    });

    it("非管理员应返回 403", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };
      (mockReq as any).body = { comment: "驳回" };

      const { rejectVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await rejectVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });

    it("非待审批版本应返回 400 VALIDATION_ERROR", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };
      (mockReq as any).body = { comment: "驳回" };

      const draftVersion = { ...mockVersion, status: "draft" };
      mockQuery.mockResolvedValueOnce([[draftVersion], null]); // SELECT version

      const { rejectVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await rejectVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        })
      );
    });
  });

  describe("getPendingReviews - 获取待审核列表", () => {
    it("管理员应能获取待审核列表", async () => {
      (mockReq as any).user = { userId: "admin-001", role: "admin" };
      mockReq.query = { page: "1", pageSize: "20" };

      const { getPendingReviewList } = await import(
        "../src/services/reviewService.js"
      );
      (getPendingReviewList as any).mockResolvedValueOnce({
        list: [
          {
            versionId: "v-001",
            formulaId: "f-001",
            formulaName: "测试配方",
            versionNumber: "v1.0",
            status: "pending_review",
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });

      const { getPendingReviews } = await import(
        "../src/controllers/versionController.js"
      );
      await getPendingReviews(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      expect(getPendingReviewList).toHaveBeenCalledWith({
        keyword: undefined,
        page: 1,
        pageSize: 20,
      });
    });

    it("非管理员应返回空列表（非403）", async () => {
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      const { getPendingReviews } = await import(
        "../src/controllers/versionController.js"
      );
      await getPendingReviews(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            list: [],
          }),
        })
      );
    });
  });

  describe("getVersionReviewLogs - 获取版本审核日志", () => {
    it("应返回版本的审核日志", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      const versionRow = {
        formula_id: "f-001",
        created_by: "user-001",
      };
      mockQuery.mockResolvedValueOnce([[versionRow], null]); // SELECT version

      const { getReviewLogs } = await import(
        "../src/services/reviewService.js"
      );
      (getReviewLogs as any).mockResolvedValueOnce([
        {
          reviewLogId: "log-001",
          versionId: "v-001",
          action: "submit",
          comment: "请审批",
        },
      ]);

      const { getVersionReviewLogs } = await import(
        "../src/controllers/versionController.js"
      );
      await getVersionReviewLogs(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            versionId: "v-001",
            logs: expect.arrayContaining([
              expect.objectContaining({ action: "submit" }),
            ]),
          }),
        })
      );
    });

    it("不存在的版本应返回 404", async () => {
      mockReq.params = { versionId: "v-nonexistent" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      mockQuery.mockResolvedValueOnce([[], null]); // SELECT version → empty

      const { getVersionReviewLogs } = await import(
        "../src/controllers/versionController.js"
      );
      await getVersionReviewLogs(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });

    it("非创建者非管理员且非配方拥有者应返回 403", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "user-002", role: "formulist" };

      const versionRow = {
        formula_id: "f-001",
        created_by: "user-001",
      };
      mockQuery.mockResolvedValueOnce([[versionRow], null]); // SELECT version

      const { isFormulaOwner } = await import(
        "../src/services/reviewService.js"
      );
      (isFormulaOwner as any).mockResolvedValueOnce(false);

      const { getVersionReviewLogs } = await import(
        "../src/controllers/versionController.js"
      );
      await getVersionReviewLogs(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });
  });

  describe("getMaterialUpdates - 检查原料更新", () => {
    const mockFormulaRow = {
      id: "f-001",
      name: "测试配方",
      created_by: "user-001",
    };

    const mockCurrentVersion = {
      version_id: "v-001",
      formula_id: "f-001",
      version_number: "v1.0",
      snapshot_json: JSON.stringify({
        materials: [
          {
            materialId: "mat-001",
            materialName: "原料A",
            unitPrice: 10,
            materialVersion: 1,
          },
          {
            materialId: "mat-002",
            materialName: "原料B",
            unitPrice: 20,
            materialVersion: 1,
          },
        ],
      }),
    };

    it("应返回配方的原料更新信息", async () => {
      mockReq.params = { formulaId: "f-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      const latestMaterial = {
        id: "mat-001",
        name: "原料A",
        code: "CODE-A",
        is_latest: 1,
        unit_price: 10,
        version: 2,
      };
      const outdatedMaterial = {
        id: "mat-002",
        name: "原料B",
        code: "CODE-B",
        is_latest: 0,
        unit_price: 20,
        version: 1,
      };
      const latestRowForOutdated = {
        id: "mat-003",
        name: "原料B(新)",
        unit_price: 25,
        version: 2,
      };

      mockQuery
        .mockResolvedValueOnce([[mockFormulaRow], null]) // SELECT formula
        .mockResolvedValueOnce([[mockCurrentVersion], null]) // SELECT current version
        .mockResolvedValueOnce([[latestMaterial], null]) // SELECT material mat-001 (is_latest=1)
        .mockResolvedValueOnce([[outdatedMaterial], null]) // SELECT material mat-002 (is_latest=0)
        .mockResolvedValueOnce([[latestRowForOutdated], null]); // SELECT latest for CODE-B

      const { getMaterialUpdates } = await import(
        "../src/controllers/versionController.js"
      );
      await getMaterialUpdates(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            formulaId: "f-001",
            formulaName: "测试配方",
            hasUpdates: true,
            totalMaterials: 2,
            outdatedCount: 1,
          }),
        })
      );
    });

    it("不存在的配方应返回 404", async () => {
      mockReq.params = { formulaId: "f-nonexistent" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      mockQuery.mockResolvedValueOnce([[], null]); // SELECT formula → empty

      const { getMaterialUpdates } = await import(
        "../src/controllers/versionController.js"
      );
      await getMaterialUpdates(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });

    it("非拥有者非管理员应返回 403", async () => {
      mockReq.params = { formulaId: "f-001" };
      (mockReq as any).user = { userId: "user-002", role: "formulist" };

      mockQuery.mockResolvedValueOnce([[mockFormulaRow], null]); // SELECT formula

      const { getMaterialUpdates } = await import(
        "../src/controllers/versionController.js"
      );
      await getMaterialUpdates(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });

    it("配方无当前版本应返回空数据（非404）", async () => {
      mockReq.params = { formulaId: "f-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      mockQuery
        .mockResolvedValueOnce([[mockFormulaRow], null]) // SELECT formula
        .mockResolvedValueOnce([[], null]); // SELECT current version → empty

      const { getMaterialUpdates } = await import(
        "../src/controllers/versionController.js"
      );
      await getMaterialUpdates(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            formulaId: "f-001",
            hasUpdates: false,
            totalMaterials: 0,
            outdatedCount: 0,
          }),
        })
      );
    });
  });

  describe("refreshSnapshot - 刷新原料快照", () => {
    const mockFormulaRow = {
      id: "f-001",
      name: "测试配方",
      created_by: "user-001",
    };

    const mockCurrentVersionWithOutdated = {
      version_id: "v-001",
      formula_id: "f-001",
      version_number: "v1.0",
      snapshot_json: JSON.stringify({
        name: "测试配方",
        materials: [
          {
            materialId: "mat-001",
            materialName: "原料A",
            unitPrice: 10,
            materialVersion: 1,
          },
        ],
      }),
      changes_json: null,
      ratio_factor: 0.18,
      supplement_ratio_factor: 1.0,
    };

    it("应成功刷新过时原料并创建新版本", async () => {
      mockReq.params = { formulaId: "f-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };
      (mockReq as any).body = {};

      const outdatedMaterial = {
        id: "mat-001",
        name: "原料A",
        code: "CODE-A",
        is_latest: 0,
        unit_price: 10,
        version: 1,
      };
      const latestRow = {
        id: "mat-002",
        name: "原料A(新)",
        unit_price: 12,
        version: 2,
      };

      mockQuery
        .mockResolvedValueOnce([[mockFormulaRow], null]) // SELECT formula
        .mockResolvedValueOnce([[mockCurrentVersionWithOutdated], null]) // SELECT current version
        .mockResolvedValueOnce([[outdatedMaterial], null]) // SELECT material (is_latest=0)
        .mockResolvedValueOnce([[latestRow], null]) // SELECT latest for CODE-A
        .mockResolvedValueOnce([[{ version_number: "v1.0" }], null]) // SELECT last version number
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE archive current
        .mockResolvedValueOnce([{ changes: 1 }, null]); // INSERT new version

      const { refreshSnapshot } = await import(
        "../src/controllers/versionController.js"
      );
      await refreshSnapshot(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            formulaId: "f-001",
            refreshedCount: 1,
          }),
        })
      );
    });

    it("所有原料已是最新版本时应返回提示消息", async () => {
      mockReq.params = { formulaId: "f-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };
      (mockReq as any).body = {};

      const latestMaterial = {
        id: "mat-001",
        name: "原料A",
        code: "CODE-A",
        is_latest: 1,
        unit_price: 10,
        version: 2,
      };

      const currentVersionAllLatest = {
        version_id: "v-001",
        formula_id: "f-001",
        version_number: "v1.0",
        snapshot_json: JSON.stringify({
          name: "测试配方",
          materials: [
            {
              materialId: "mat-001",
              materialName: "原料A",
              unitPrice: 10,
              materialVersion: 2,
            },
          ],
        }),
        changes_json: null,
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
      };

      mockQuery
        .mockResolvedValueOnce([[mockFormulaRow], null]) // SELECT formula
        .mockResolvedValueOnce([[currentVersionAllLatest], null]) // SELECT current version
        .mockResolvedValueOnce([[latestMaterial], null]); // SELECT material (is_latest=1)

      const { refreshSnapshot } = await import(
        "../src/controllers/versionController.js"
      );
      await refreshSnapshot(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "所有原料已是最新版本，无需刷新",
        })
      );
    });

    it("不存在的配方应返回 404", async () => {
      mockReq.params = { formulaId: "f-nonexistent" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      mockQuery.mockResolvedValueOnce([[], null]); // SELECT formula → empty

      const { refreshSnapshot } = await import(
        "../src/controllers/versionController.js"
      );
      await refreshSnapshot(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });

    it("非拥有者非管理员应返回 403", async () => {
      mockReq.params = { formulaId: "f-001" };
      (mockReq as any).user = { userId: "user-002", role: "formulist" };

      mockQuery.mockResolvedValueOnce([[mockFormulaRow], null]); // SELECT formula

      const { refreshSnapshot } = await import(
        "../src/controllers/versionController.js"
      );
      await refreshSnapshot(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });

    it("配方无当前版本应返回 404", async () => {
      mockReq.params = { formulaId: "f-001" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      mockQuery
        .mockResolvedValueOnce([[mockFormulaRow], null]) // SELECT formula
        .mockResolvedValueOnce([[], null]); // SELECT current version → empty

      const { refreshSnapshot } = await import(
        "../src/controllers/versionController.js"
      );
      await refreshSnapshot(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });
  });

  describe("setCurrentVersion - 切换当前版本", () => {
    const mockPublishedVersion = {
      version_id: "v-002",
      formula_id: "f-001",
      version_number: "v2.0",
      status: "published",
      is_current: 0,
      created_by: "user-001",
      snapshot_json: JSON.stringify({
        name: "测试配方v2",
        salesmanId: "s-001",
        salesmanName: "张三",
        materials: [],
        packagingPrice: 0,
        otherPrice: 0,
        profitMargin: 20,
        description: "测试v2",
      }),
      changes_json: null,
    };

    it("应成功切换当前版本并同步数据", async () => {
      mockReq.params = { versionId: "v-002" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      mockQuery
        .mockResolvedValueOnce([[mockPublishedVersion], null]) // SELECT version
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE reset is_current
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE set is_current=1
        .mockResolvedValueOnce([[mockFormula], null]) // SELECT formula (syncSnapshotToFormula)
        .mockResolvedValueOnce([{ changes: 1 }, null]); // UPDATE formula (syncSnapshotToFormula)

      const { setCurrentVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await setCurrentVersion(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            versionId: "v-002",
            isCurrent: 1,
            status: "published",
          }),
        })
      );
    });

    it("非已发布版本应返回 400 VALIDATION_ERROR", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      const draftVersion = { ...mockPublishedVersion, status: "draft" };
      mockQuery.mockResolvedValueOnce([[draftVersion], null]); // SELECT version

      const { setCurrentVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await setCurrentVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        })
      );
    });

    it("已是当前版本应返回成功提示", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      const alreadyCurrentVersion = {
        ...mockPublishedVersion,
        is_current: 1,
      };
      mockQuery.mockResolvedValueOnce([[alreadyCurrentVersion], null]); // SELECT version

      const { setCurrentVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await setCurrentVersion(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "该版本已是当前版本",
        })
      );
    });

    it("非拥有者非管理员应返回 403", async () => {
      mockReq.params = { versionId: "v-002" };
      (mockReq as any).user = { userId: "user-002", role: "formulist" };

      const otherUserVersion = {
        ...mockPublishedVersion,
        created_by: "user-001",
      };
      mockQuery.mockResolvedValueOnce([[otherUserVersion], null]); // SELECT version

      const { isFormulaOwner } = await import(
        "../src/services/reviewService.js"
      );
      (isFormulaOwner as any).mockResolvedValueOnce(false);

      const { setCurrentVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await setCurrentVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });

    it("不存在的版本应返回 404", async () => {
      mockReq.params = { versionId: "v-nonexistent" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      mockQuery.mockResolvedValueOnce([[], null]); // SELECT version → empty

      const { setCurrentVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await setCurrentVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });
  });

  describe("publishVersion - 管理员直接发布", () => {
    it("管理员应成功直接发布草稿版本", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      const draftVersion = { ...mockVersion, version_id: "v-draft", status: "draft" };
      mockQuery
        .mockResolvedValueOnce([[draftVersion], null]) // SELECT version
        .mockResolvedValueOnce([[mockFormula], null]) // SELECT formula (existence check)
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE archive others
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE publish version
        .mockResolvedValueOnce([[mockFormula], null]) // SELECT formula (syncSnapshotToFormula)
        .mockResolvedValueOnce([{ changes: 1 }, null]) // UPDATE formula (syncSnapshotToFormula)
        .mockResolvedValueOnce([[{ display_name: "管理员" }], null]); // SELECT user

      const { createReviewLog } = await import(
        "../src/services/reviewService.js"
      );
      const { publishVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await publishVersion(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      expect(createReviewLog).toHaveBeenCalledWith(
        expect.objectContaining({
          versionId: "v-draft",
          action: "approve",
          comment: "管理员直接发布",
        })
      );
    });

    it("非管理员应返回 403 FORBIDDEN", async () => {
      mockReq.params = { versionId: "v-draft" };
      (mockReq as any).user = { userId: "user-001", role: "formulist" };

      const { publishVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await publishVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "FORBIDDEN" }),
        })
      );
    });

    it("已发布版本应返回 400 VALIDATION_ERROR", async () => {
      mockReq.params = { versionId: "v-001" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      const publishedVersion = { ...mockVersion, status: "published" };
      mockQuery.mockResolvedValueOnce([[publishedVersion], null]); // SELECT version

      const { publishVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await publishVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        })
      );
    });

    it("已归档版本应返回 400 VALIDATION_ERROR", async () => {
      mockReq.params = { versionId: "v-archived" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      const archivedVersion = { ...mockVersion, version_id: "v-archived", status: "archived" };
      mockQuery.mockResolvedValueOnce([[archivedVersion], null]); // SELECT version

      const { publishVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await publishVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        })
      );
    });

    it("不存在的版本应返回 404 NOT_FOUND", async () => {
      mockReq.params = { versionId: "v-nonexistent" };
      (mockReq as any).user = { userId: "admin-001", role: "admin" };

      mockQuery.mockResolvedValueOnce([[], null]); // SELECT version → empty

      const { publishVersion } = await import(
        "../src/controllers/versionController.js"
      );
      await publishVersion(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        })
      );
    });
  });
});
