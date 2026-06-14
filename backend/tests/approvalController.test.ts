import { describe, it, expect, beforeEach, vi } from "vitest";
import { Response } from "express";

const { mockQuery, mockCreateReviewLog, mockGetPendingReviewList, mockIsFormulaOwner } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCreateReviewLog: vi.fn(),
  mockGetPendingReviewList: vi.fn(),
  mockIsFormulaOwner: vi.fn(),
}));

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data, message) => ({
    success: true,
    message: message || "操作成功",
    data,
  })),
  fail: vi.fn((message, code) => ({
    success: false,
    message,
    code,
  })),
  rowToCamelCase: vi.fn((row) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
  rowsToCamelCase: vi.fn((rows) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
      }
      return result;
    }),
  ),
  safeJsonParse: vi.fn((str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback; }
  }),
}));

vi.mock("../src/services/reviewService.js", () => ({
  createReviewLog: mockCreateReviewLog,
  getPendingReviewList: mockGetPendingReviewList,
  isFormulaOwner: mockIsFormulaOwner,
  getMySubmissions: vi.fn(),
  getReviewedByMe: vi.fn(),
  getMySubmissionStatusCounts: vi.fn(),
}));

import {
  submitVersion,
  approveVersion,
  rejectVersion,
  getPendingReviews,
} from "../src/controllers/versionController.js";

function createMockRes(): Record<string, unknown> {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("versionController - 审批流程控制器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
  });

  describe("submitVersion - 提交审批", () => {
    it("AC01: POST /versions/submit/:versionId returns 200", async () => {
      const mockVersion = {
        version_id: "v-001",
        formula_id: "f-001",
        version_number: "v1.0",
        status: "draft",
        created_by: "user-001",
      };

      mockQuery
        .mockResolvedValueOnce([[mockVersion]])
        .mockResolvedValueOnce([[{ display_name: "张三" }]])
        .mockResolvedValueOnce({ changes: 1 });

      const req = {
        params: { versionId: "v-001" },
        body: { comment: "提交审批" },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await submitVersion(
        req as unknown as Parameters<typeof submitVersion>[0],
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalled();
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
      expect(mockCreateReviewLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "submit" }),
      );
    });

    it("AC02: Returns 404 for non-existent version", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const req = {
        params: { versionId: "non-existent" },
        body: {},
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await submitVersion(
        req as unknown as Parameters<typeof submitVersion>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "版本不存在" }),
      );
    });

    it("AC03: Returns 400 for already published version", async () => {
      const mockVersion = {
        version_id: "v-001",
        formula_id: "f-001",
        version_number: "v1.0",
        status: "published",
        created_by: "user-001",
      };

      mockQuery.mockResolvedValueOnce([[mockVersion]]);

      const req = {
        params: { versionId: "v-001" },
        body: {},
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await submitVersion(
        req as unknown as Parameters<typeof submitVersion>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "仅草稿版本可提交审批" }),
      );
    });
  });

  describe("approveVersion - 批准版本", () => {
    it("AC04: PUT /versions/approve/:versionId returns 200", async () => {
      const mockVersion = {
        version_id: "v-001",
        formula_id: "f-001",
        version_number: "v1.0",
        status: "pending_review",
        snapshot_json: '{"name":"测试配方","materials":[]}',
      };

      mockQuery
        .mockResolvedValueOnce([[mockVersion]])
        .mockResolvedValueOnce({ changes: 0 })
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce([[{ id: "f-001" }]])
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce([[{ display_name: "管理员" }]]);

      const req = {
        params: { versionId: "v-001" },
        body: { comment: "批准发布" },
        user: { userId: "admin-001", role: "admin" },
      };
      const res = createMockRes();

      await approveVersion(
        req as unknown as Parameters<typeof approveVersion>[0],
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalled();
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
      expect(callArgs.data.status).toBe("published");
      expect(mockCreateReviewLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "approve" }),
      );
    });

    it("AC05: Returns 404 for non-existent version", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const req = {
        params: { versionId: "non-existent" },
        body: {},
        user: { userId: "admin-001", role: "admin" },
      };
      const res = createMockRes();

      await approveVersion(
        req as unknown as Parameters<typeof approveVersion>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "版本不存在" }),
      );
    });

    it("AC06: Returns 400 for non-pending version", async () => {
      const mockVersion = {
        version_id: "v-001",
        formula_id: "f-001",
        version_number: "v1.0",
        status: "draft",
        snapshot_json: '{}',
      };

      mockQuery.mockResolvedValueOnce([[mockVersion]]);

      const req = {
        params: { versionId: "v-001" },
        body: {},
        user: { userId: "admin-001", role: "admin" },
      };
      const res = createMockRes();

      await approveVersion(
        req as unknown as Parameters<typeof approveVersion>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "仅待审批版本可批准" }),
      );
    });
  });

  describe("rejectVersion - 驳回版本", () => {
    it("AC07: PUT /versions/reject/:versionId with comment returns 200", async () => {
      const mockVersion = {
        version_id: "v-001",
        formula_id: "f-001",
        version_number: "v1.0",
        status: "pending_review",
      };

      mockQuery
        .mockResolvedValueOnce([[mockVersion]])
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce([[{ display_name: "管理员" }]]);

      const req = {
        params: { versionId: "v-001" },
        body: { comment: "配方需要调整" },
        user: { userId: "admin-001", role: "admin" },
      };
      const res = createMockRes();

      await rejectVersion(
        req as unknown as Parameters<typeof rejectVersion>[0],
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalled();
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
      expect(callArgs.data.status).toBe("draft");
      expect(mockCreateReviewLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: "reject", comment: "配方需要调整" }),
      );
    });

    it("AC08: Returns 400 when comment is empty", async () => {
      const req = {
        params: { versionId: "v-001" },
        body: { comment: "" },
        user: { userId: "admin-001", role: "admin" },
      };
      const res = createMockRes();

      await rejectVersion(
        req as unknown as Parameters<typeof rejectVersion>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "驳回时必须填写意见" }),
      );
    });
  });

  describe("getPendingReviews - 待审核列表", () => {
    it("AC09: GET /versions/pending-review returns pending versions", async () => {
      const mockResult = {
        list: [
          { versionId: "v-001", formulaName: "测试配方", status: "pending_review" },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };

      mockGetPendingReviewList.mockResolvedValueOnce(mockResult);

      const req = {
        query: { page: 1, pageSize: 20 },
        user: { userId: "admin-001", role: "admin" },
      };
      const res = createMockRes();

      await getPendingReviews(
        req as unknown as Parameters<typeof getPendingReviews>[0],
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalled();
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
      expect(callArgs.data.list).toHaveLength(1);
    });

    it("AC10: Admin sees all pending, formulist sees none", async () => {
      const mockResult = {
        list: [
          { versionId: "v-001", formulaName: "配方A" },
          { versionId: "v-002", formulaName: "配方B" },
        ],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      };

      mockGetPendingReviewList.mockResolvedValueOnce(mockResult);

      const adminReq = {
        query: {},
        user: { userId: "admin-001", role: "admin" },
      };
      const adminRes = createMockRes();

      await getPendingReviews(
        adminReq as unknown as Parameters<typeof getPendingReviews>[0],
        adminRes as unknown as Response,
      );

      const adminBody = (adminRes.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(adminBody.success).toBe(true);
      expect(adminBody.data.list).toHaveLength(2);

      const formulistReq = {
        query: {},
        user: { userId: "user-001", role: "formulist" },
      };
      const formulistRes = createMockRes();

      await getPendingReviews(
        formulistReq as unknown as Parameters<typeof getPendingReviews>[0],
        formulistRes as unknown as Response,
      );

      const formulistBody = (formulistRes.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(formulistBody.success).toBe(true);
      expect(formulistBody.data.list).toHaveLength(0);
      expect(formulistBody.data.pagination.total).toBe(0);
    });
  });
});
