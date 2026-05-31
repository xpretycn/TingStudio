import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("../src/config/database-adapter.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  rowsToCamelCase: vi.fn((rows: Record<string, unknown>[]) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
      }
      return result;
    })
  ),
  buildPagination: vi.fn((p: number, ps: number) => ({ page: p || 1, pageSize: ps || 20, offset: 0 })),
  buildLike: vi.fn((k: string) => `%${k}%`),
}));

describe("materialReviewService - 原料审核服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createReviewLog - 创建审核日志", () => {
    it("成功创建审核日志并返回 logId", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ display_name: "张三" }] });
      mockQuery.mockResolvedValueOnce({ rows: [], changes: 1 });

      const { createReviewLog } = await import("../src/services/materialReviewService.js");
      const logId = await createReviewLog({
        materialId: "mat-001",
        reviewerId: "user-001",
        action: "approve",
      });

      expect(logId).toBe("mock-id-123");
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("带 comment 时应正确传入评论内容", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ display_name: "李四" }] });
      mockQuery.mockResolvedValueOnce({ rows: [], changes: 1 });

      const { createReviewLog } = await import("../src/services/materialReviewService.js");
      await createReviewLog({
        materialId: "mat-002",
        reviewerId: "user-002",
        action: "reject",
        comment: "数据不完整",
      });

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[0]).toContain("INSERT INTO material_review_logs");
      expect(insertCall[1]).toEqual([
        "mock-id-123",
        "mat-002",
        "user-002",
        "李四",
        "reject",
        "数据不完整",
        "2026-05-22T00:00:00.000Z",
      ]);
    });

    it("应从 users 表获取审核人姓名", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ display_name: "王五" }] });
      mockQuery.mockResolvedValueOnce({ rows: [], changes: 1 });

      const { createReviewLog } = await import("../src/services/materialReviewService.js");
      await createReviewLog({
        materialId: "mat-003",
        reviewerId: "user-003",
        action: "approve",
      });

      const nameQueryCall = mockQuery.mock.calls[0];
      expect(nameQueryCall[0]).toContain("SELECT display_name FROM users");
      expect(nameQueryCall[0]).toContain("WHERE id = ?");
      expect(nameQueryCall[1]).toEqual(["user-003"]);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][3]).toBe("王五");
    });
  });

  describe("getReviewLogs - 获取审核日志", () => {
    it("应返回指定原料的审核日志列表", async () => {
      const mockLogs = [
        {
          review_log_id: "log-001",
          material_id: "mat-001",
          reviewer_id: "user-001",
          reviewer_name: "张三",
          action: "approve",
          comment: "审核通过",
          created_at: "2026-05-22T00:00:00.000Z",
          reviewer_display_name: "张三",
        },
        {
          review_log_id: "log-002",
          material_id: "mat-001",
          reviewer_id: "user-002",
          reviewer_name: "李四",
          action: "reject",
          comment: null,
          created_at: "2026-05-22T01:00:00.000Z",
          reviewer_display_name: "李四",
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockLogs });

      const { getReviewLogs } = await import("../src/services/materialReviewService.js");
      const result = await getReviewLogs("mat-001");

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("material_review_logs"),
        ["mat-001"]
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("reviewLogId", "log-001");
      expect(result[0]).toHaveProperty("reviewerDisplayName", "张三");
      expect(result[1]).toHaveProperty("action", "reject");
    });

    it("无审核日志时应返回空数组", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getReviewLogs } = await import("../src/services/materialReviewService.js");
      const result = await getReviewLogs("mat-nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("getPendingReviewList - 获取待审核原料列表", () => {
    it("应返回分页的待审核原料列表", async () => {
      const mockDataRows = [
        {
          id: "mat-001",
          name: "枸杞",
          code: "GQ-001",
          status: "pending_review",
          is_deleted: 0,
          is_latest: 1,
          created_by: "user-001",
          updated_at: "2026-05-22T00:00:00.000Z",
          submitter_name: "张三",
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDataRows });
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });

      const { getPendingReviewList } = await import("../src/services/materialReviewService.js");
      const result = await getPendingReviewList({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.list[0]).toHaveProperty("id", "mat-001");
      expect(result.list[0]).toHaveProperty("submitterName", "张三");
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("应支持关键字筛选", async () => {
      const mockDataRows = [
        {
          id: "mat-002",
          name: "红枣",
          code: "HZ-001",
          status: "pending_review",
          is_deleted: 0,
          is_latest: 1,
          created_by: "user-002",
          updated_at: "2026-05-22T01:00:00.000Z",
          submitter_name: "李四",
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDataRows });
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] });

      const { getPendingReviewList } = await import("../src/services/materialReviewService.js");
      const result = await getPendingReviewList({
        keyword: "红枣",
        page: 1,
        pageSize: 10,
      });

      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[0]).toContain("LIKE");
      expect(dataCall[1]).toEqual(["%红枣%", "%红枣%", 10, 0]);

      const countCall = mockQuery.mock.calls[1];
      expect(countCall[0]).toContain("LIKE");
      expect(countCall[1]).toEqual(["%红枣%", "%红枣%"]);

      expect(result.list).toHaveLength(1);
      expect(result.list[0]).toHaveProperty("name", "红枣");
      expect(result.pagination.total).toBe(1);
    });

    it("应正确处理分页参数", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 55 }] });

      const { getPendingReviewList } = await import("../src/services/materialReviewService.js");
      const result = await getPendingReviewList({ page: 3, pageSize: 10 });

      expect(result.pagination).toEqual({
        page: 3,
        pageSize: 10,
        total: 55,
        totalPages: 6,
      });

      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[0]).toContain("LIMIT");
      expect(dataCall[0]).toContain("OFFSET");
    });
  });
});
