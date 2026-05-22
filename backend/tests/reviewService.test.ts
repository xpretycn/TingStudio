import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  rowsToCamelCase: vi.fn((rows) =>
    rows.map((r: any) => {
      const result: any = {};
      for (const [key, value] of Object.entries(r)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        result[camelKey] = value;
      }
      return result;
    })
  ),
}));

describe("reviewService - 审核服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createReviewLog - 创建审核日志", () => {
    it("应该使用正确参数插入审核日志", async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const { createReviewLog } = await import(
        "../src/services/reviewService.js"
      );
      await createReviewLog({
        versionId: "version-001",
        reviewerId: "user-001",
        reviewerName: "张三",
        action: "submit",
        comment: "提交审核",
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO formula_review_logs"),
        [
          "mock-id-123",
          "version-001",
          "user-001",
          "张三",
          "submit",
          "提交审核",
          "2026-05-22T00:00:00.000Z",
        ]
      );
    });

    it("可选字段为空时应传入 null", async () => {
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const { createReviewLog } = await import(
        "../src/services/reviewService.js"
      );
      await createReviewLog({
        versionId: "version-002",
        reviewerId: "user-002",
        action: "approve",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO formula_review_logs"),
        [
          "mock-id-123",
          "version-002",
          "user-002",
          null,
          "approve",
          null,
          "2026-05-22T00:00:00.000Z",
        ]
      );
    });
  });

  describe("getReviewLogs - 获取审核日志", () => {
    it("应该返回带用户信息的审核日志列表", async () => {
      const mockLogs = [
        {
          review_log_id: "log-001",
          version_id: "version-001",
          reviewer_id: "user-001",
          reviewer_name: "张三",
          action: "submit",
          comment: "提交审核",
          created_at: "2026-05-22T00:00:00.000Z",
          reviewer_display_name: "张三",
          reviewer_role: "formulist",
        },
        {
          review_log_id: "log-002",
          version_id: "version-001",
          reviewer_id: "user-002",
          reviewer_name: "李四",
          action: "approve",
          comment: "审核通过",
          created_at: "2026-05-22T01:00:00.000Z",
          reviewer_display_name: "李四",
          reviewer_role: "admin",
        },
      ];

      mockQuery.mockResolvedValueOnce([mockLogs]);

      const { getReviewLogs } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getReviewLogs("version-001");

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("formula_review_logs"),
        ["version-001"]
      );
      expect(result).toHaveLength(2);
      // 验证 rowsToCamelCase 转换后的字段名
      expect(result[0]).toHaveProperty("reviewLogId", "log-001");
      expect(result[0]).toHaveProperty("reviewerDisplayName", "张三");
      expect(result[0]).toHaveProperty("reviewerRole", "formulist");
      expect(result[1]).toHaveProperty("reviewLogId", "log-002");
      expect(result[1]).toHaveProperty("action", "approve");
    });

    it("无日志时应返回空数组", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const { getReviewLogs } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getReviewLogs("version-nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("getPendingReviewList - 获取待审核列表", () => {
    it("应该返回分页的待审核版本列表", async () => {
      const mockDataRows = [
        {
          version_id: "v-001",
          formula_id: "f-001",
          version_number: 1,
          version_name: "V1",
          status: "pending_review",
          created_by: "user-001",
          created_at: "2026-05-22T00:00:00.000Z",
          formula_name: "配方A",
          submitter_name: "张三",
        },
      ];

      // 数据查询
      mockQuery.mockResolvedValueOnce([mockDataRows]);
      // 计数查询
      mockQuery.mockResolvedValueOnce([[{ total: 1 }]]);
      // getLatestSubmitLog（fire-and-forget 调用）
      mockQuery.mockResolvedValueOnce([[]]);

      const { getPendingReviewList } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getPendingReviewList({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.list[0]).toEqual({
        versionId: "v-001",
        formulaId: "f-001",
        formulaName: "配方A",
        versionNumber: 1,
        versionName: "V1",
        status: "pending_review",
        submittedBy: "user-001",
        submittedByName: "张三",
        submittedAt: "2026-05-22T00:00:00.000Z",
      });
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("应该支持关键字筛选", async () => {
      const mockDataRows = [
        {
          version_id: "v-002",
          formula_id: "f-002",
          version_number: 2,
          version_name: "V2",
          status: "pending_review",
          created_by: "user-002",
          created_at: "2026-05-22T01:00:00.000Z",
          formula_name: "配方B",
          submitter_name: "李四",
        },
      ];

      // 数据查询
      mockQuery.mockResolvedValueOnce([mockDataRows]);
      // 计数查询
      mockQuery.mockResolvedValueOnce([[{ total: 1 }]]);
      // getLatestSubmitLog（fire-and-forget 调用）
      mockQuery.mockResolvedValueOnce([[]]);

      const { getPendingReviewList } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getPendingReviewList({
        keyword: "配方B",
        page: 1,
        pageSize: 10,
      });

      // 验证数据查询包含 LIKE 条件和正确的参数
      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[0]).toContain("LIKE");
      expect(dataCall[1]).toEqual(["%配方B%", "%配方B%", 10, 0]);

      // 验证计数查询包含 LIKE 条件和正确的参数
      const countCall = mockQuery.mock.calls[1];
      expect(countCall[0]).toContain("LIKE");
      expect(countCall[1]).toEqual(["%配方B%", "%配方B%"]);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].formulaName).toBe("配方B");
      expect(result.pagination.total).toBe(1);
    });

    it("无待审核版本时应返回空列表", async () => {
      // 数据查询
      mockQuery.mockResolvedValueOnce([[]]);
      // 计数查询
      mockQuery.mockResolvedValueOnce([[{ total: 0 }]]);

      const { getPendingReviewList } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getPendingReviewList({ page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe("getMySubmissions - 获取我的提交记录", () => {
    it("应该返回分页的提交记录列表，格式正确", async () => {
      const mockDataRows = [
        {
          version_id: "v-001",
          formula_id: "f-001",
          formula_name: "配方A",
          formula_code: "FC-001",
          version_number: "1.0",
          version_name: "初版",
          status: "pending_review",
          created_at: "2026-05-20T00:00:00.000Z",
          latest_action: "submit",
          latest_reviewer_name: "张三",
          latest_comment: "提交审核",
          latest_review_at: "2026-05-20T00:00:00.000Z",
        },
        {
          version_id: "v-002",
          formula_id: "f-002",
          formula_name: "配方B",
          formula_code: "FC-002",
          version_number: "2.0",
          version_name: "第二版",
          status: "published",
          created_at: "2026-05-21T00:00:00.000Z",
          latest_action: "approve",
          latest_reviewer_name: "李四",
          latest_comment: "审核通过",
          latest_review_at: "2026-05-21T01:00:00.000Z",
        },
      ];

      // 数据查询
      mockQuery.mockResolvedValueOnce([mockDataRows]);
      // 计数查询
      mockQuery.mockResolvedValueOnce([[{ total: 5 }]]);

      const { getMySubmissions } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getMySubmissions({
        userId: "user-001",
        page: 1,
        pageSize: 10,
      });

      expect(result.list).toHaveLength(2);
      // 验证第一条记录所有字段
      expect(result.list[0]).toEqual({
        versionId: "v-001",
        formulaId: "f-001",
        formulaName: "配方A",
        formulaCode: "FC-001",
        versionNumber: "1.0",
        versionName: "初版",
        status: "pending_review",
        createdAt: "2026-05-20T00:00:00.000Z",
        latestReview: {
          action: "submit",
          reviewerName: "张三",
          comment: "提交审核",
          createdAt: "2026-05-20T00:00:00.000Z",
        },
      });
      // 验证第二条记录
      expect(result.list[1].latestReview).toEqual({
        action: "approve",
        reviewerName: "李四",
        comment: "审核通过",
        createdAt: "2026-05-21T01:00:00.000Z",
      });
      // 验证分页格式
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 5,
        totalPages: 1,
      });

      // 验证 SQL 查询参数
      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[0]).toContain("WHERE fv.created_by = ?");
      expect(dataCall[1]).toEqual(["user-001", 10, 0]);

      const countCall = mockQuery.mock.calls[1];
      expect(countCall[1]).toEqual(["user-001"]);
    });

    it("用户没有提交记录时应返回空列表", async () => {
      // 数据查询返回空
      mockQuery.mockResolvedValueOnce([[]]);
      // 计数查询返回 0
      mockQuery.mockResolvedValueOnce([[{ total: 0 }]]);

      const { getMySubmissions } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getMySubmissions({
        userId: "user-empty",
        page: 1,
        pageSize: 20,
      });

      expect(result.list).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it("应该正确处理分页参数", async () => {
      const mockDataRows = [
        {
          version_id: "v-011",
          formula_id: "f-003",
          formula_name: "配方C",
          formula_code: "FC-003",
          version_number: "1.0",
          version_name: "初版",
          status: "draft",
          created_at: "2026-05-22T00:00:00.000Z",
          latest_action: null,
          latest_reviewer_name: null,
          latest_comment: null,
          latest_review_at: null,
        },
      ];

      // 数据查询
      mockQuery.mockResolvedValueOnce([mockDataRows]);
      // 计数查询
      mockQuery.mockResolvedValueOnce([[{ total: 25 }]]);

      const { getMySubmissions } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getMySubmissions({
        userId: "user-001",
        page: 3,
        pageSize: 10,
      });

      // 验证分页
      expect(result.pagination).toEqual({
        page: 3,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      });

      // 验证 offset 计算: (page - 1) * pageSize = (3 - 1) * 10 = 20
      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[1]).toEqual(["user-001", 10, 20]);
    });

    it("没有审核记录时 latestReview 应为 null", async () => {
      const mockDataRows = [
        {
          version_id: "v-003",
          formula_id: "f-004",
          formula_name: "配方D",
          formula_code: "FC-004",
          version_number: "1.0",
          version_name: "草稿",
          status: "draft",
          created_at: "2026-05-22T00:00:00.000Z",
          latest_action: null,
          latest_reviewer_name: null,
          latest_comment: null,
          latest_review_at: null,
        },
      ];

      mockQuery.mockResolvedValueOnce([mockDataRows]);
      mockQuery.mockResolvedValueOnce([[{ total: 1 }]]);

      const { getMySubmissions } = await import(
        "../src/services/reviewService.js"
      );
      const result = await getMySubmissions({
        userId: "user-001",
        page: 1,
        pageSize: 10,
      });

      expect(result.list).toHaveLength(1);
      expect(result.list[0].latestReview).toBeNull();
    });
  });

  describe("isFormulaOwner - 判断配方所有权", () => {
    it("用户是所有者时应返回 true", async () => {
      mockQuery.mockResolvedValueOnce([[{ created_by: "user-001" }]]);

      const { isFormulaOwner } = await import(
        "../src/services/reviewService.js"
      );
      const result = await isFormulaOwner("formula-001", "user-001");

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("FROM formulas"),
        ["formula-001"]
      );
    });

    it("用户不是所有者时应返回 false", async () => {
      mockQuery.mockResolvedValueOnce([[{ created_by: "user-002" }]]);

      const { isFormulaOwner } = await import(
        "../src/services/reviewService.js"
      );
      const result = await isFormulaOwner("formula-001", "user-001");

      expect(result).toBe(false);
    });

    it("配方不存在时应返回 false", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const { isFormulaOwner } = await import(
        "../src/services/reviewService.js"
      );
      const result = await isFormulaOwner("nonexistent-formula", "user-001");

      expect(result).toBe(false);
    });
  });
});
