import { describe, it, expect, beforeEach, vi } from "vitest";
import { Response } from "express";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  success: vi.fn((data) => ({ success: true, data })),
  rowsToCamelCase: vi.fn((rows) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
      }
      return result;
    }),
  ),
}));

import { getDashboardStats, getRecentActivity, getSalesTrend } from "../src/controllers/dashboardController.js";

function createMockRes(): Record<string, unknown> {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("dashboardController - 仪表盘控制器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardStats - 获取仪表盘统计", () => {
    it("admin 用户可查看全部数据（无 WHERE 子句）", async () => {
      const req = {
        user: { userId: "user1", role: "admin" },
      } as unknown as Parameters<typeof getDashboardStats>[0];
      const res = createMockRes() as unknown as Response;

      mockQuery.mockResolvedValueOnce([[{ total: 5 }]]);
      mockQuery.mockResolvedValueOnce([[{ total: 10 }]]);
      mockQuery.mockResolvedValueOnce([[{ totalQuantity: 100, totalRevenue: 5000, formulaCount: 3 }]]);

      await getDashboardStats(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        "SELECT COUNT(*) as total FROM formulas ",
        [],
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        "SELECT COUNT(*) as total FROM materials ",
        [],
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            formulas: 5,
            materials: 10,
            sales: expect.objectContaining({
              quantity: 100,
              revenue: 5000,
              formulaCount: 3,
            }),
            pendingTasks: 0,
          }),
        }),
      );
    });

    it("formulist 用户仅查看自己创建的数据（WHERE created_by = ?）", async () => {
      const req = {
        user: { userId: "user1", role: "formulist" },
      } as unknown as Parameters<typeof getDashboardStats>[0];
      const res = createMockRes() as unknown as Response;

      mockQuery.mockResolvedValueOnce([[{ total: 2 }]]);
      mockQuery.mockResolvedValueOnce([[{ total: 3 }]]);
      mockQuery.mockResolvedValueOnce([[{ totalQuantity: 50, totalRevenue: 2000, formulaCount: 1 }]]);

      await getDashboardStats(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        "SELECT COUNT(*) as total FROM formulas WHERE created_by = ?",
        ["user1"],
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        "SELECT COUNT(*) as total FROM materials WHERE created_by = ?",
        ["user1"],
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("WHERE f.created_by = ?"),
        ["user1"],
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            formulas: 2,
            materials: 3,
          }),
        }),
      );
    });

    it("查询出错时返回 500", async () => {
      const req = {
        user: { userId: "user1", role: "admin" },
      } as unknown as Parameters<typeof getDashboardStats>[0];
      const res = createMockRes() as unknown as Response;

      mockQuery.mockRejectedValueOnce(new Error("DB error"));

      await getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "获取仪表盘数据失败",
        }),
      );
    });
  });

  describe("getRecentActivity - 获取最近活动", () => {
    it("返回最近活动列表，按 limit 截取", async () => {
      const req = {
        user: { userId: "user1", role: "admin" },
        query: { limit: "6" },
      } as unknown as Parameters<typeof getRecentActivity>[0];
      const res = createMockRes() as unknown as Response;

      const mockFormulas = [
        { id: "f1", name: "配方1", code: "FM001", updatedAt: "2026-05-28T10:00:00.000Z", type: "formula" },
        { id: "f2", name: "配方2", code: "FM002", updatedAt: "2026-05-27T10:00:00.000Z", type: "formula" },
        { id: "f3", name: "配方3", code: "FM003", updatedAt: "2026-05-26T10:00:00.000Z", type: "formula" },
      ];
      const mockMaterials = [
        { id: "m1", name: "原料1", code: "MT001", updatedAt: "2026-05-29T10:00:00.000Z", type: "material" },
        { id: "m2", name: "原料2", code: "MT002", updatedAt: "2026-05-25T10:00:00.000Z", type: "material" },
        { id: "m3", name: "原料3", code: "MT003", updatedAt: "2026-05-24T10:00:00.000Z", type: "material" },
      ];

      mockQuery.mockResolvedValueOnce([mockFormulas]);
      mockQuery.mockResolvedValueOnce([mockMaterials]);

      await getRecentActivity(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("FROM formulas"),
        [3],
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("FROM materials"),
        [3],
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });
  });

  describe("getSalesTrend - 获取销量趋势", () => {
    it("默认按月（month）查询", async () => {
      const req = {
        user: { userId: "user1", role: "admin" },
        query: {},
      } as unknown as Parameters<typeof getSalesTrend>[0];
      const res = createMockRes() as unknown as Response;

      const mockTrend = [
        { period: "2026-01", quantity: 100, revenue: 5000, orderCount: 10 },
        { period: "2026-02", quantity: 120, revenue: 6000, orderCount: 12 },
      ];
      mockQuery.mockResolvedValueOnce([mockTrend]);

      await getSalesTrend(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("strftime('%Y-%m', fs.period_start)"),
        [],
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it("按周（week）查询", async () => {
      const req = {
        user: { userId: "user1", role: "admin" },
        query: { period: "week" },
      } as unknown as Parameters<typeof getSalesTrend>[0];
      const res = createMockRes() as unknown as Response;

      const mockTrend = [
        { period: "2026-20", quantity: 30, revenue: 1500, orderCount: 3 },
      ];
      mockQuery.mockResolvedValueOnce([mockTrend]);

      await getSalesTrend(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("strftime('%Y-%W', fs.period_start)"),
        [],
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });
  });
});
