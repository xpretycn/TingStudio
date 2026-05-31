import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockQuery = vi.fn();
const mockTaskStop = vi.fn();
const mockSchedule = vi.fn(() => ({ stop: mockTaskStop }));

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
}));

vi.mock("../src/controllers/reportController.js", () => ({
  aggregateReportData: vi.fn(() => Promise.resolve({ summary: {} })),
  getWeekNumber: vi.fn(() => 21),
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: mockSchedule,
  },
}));

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("reportGenerator - 报告自动生成器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("startScheduledTasks - 启动定时任务", () => {
    it("应创建两个 cron 任务（周报和月报）", async () => {
      const { startScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();

      expect(mockSchedule).toHaveBeenCalledTimes(2);
      expect(mockSchedule).toHaveBeenCalledWith(
        "0 9 * * 1",
        expect.any(Function)
      );
      expect(mockSchedule).toHaveBeenCalledWith(
        "0 9 1 * *",
        expect.any(Function)
      );
    });
  });

  describe("stopScheduledTasks - 停止定时任务", () => {
    it("应停止所有已注册的任务", async () => {
      const { startScheduledTasks, stopScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();
      stopScheduledTasks();

      expect(mockTaskStop).toHaveBeenCalledTimes(2);
    });
  });

  describe("getLastWeekRange - 获取上周日期范围", () => {
    it("应返回上周一到上周日的日期范围", async () => {
      mockQuery.mockReturnValueOnce([[]]);
      mockQuery.mockReturnValueOnce([[{ id: "admin-001" }]]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { startScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();

      const weeklyHandler = mockSchedule.mock.calls[0][1];
      weeklyHandler();
      await flushPromises();

      const selectCall = mockQuery.mock.calls[0];
      expect(selectCall[1][0]).toBe("weekly");

      const periodStart = selectCall[1][1] as string;
      const periodEnd = selectCall[1][2] as string;

      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);
      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(6);
    });
  });

  describe("getLastMonthRange - 获取上月日期范围", () => {
    it("应返回上月第一天到最后一天的日期范围", async () => {
      mockQuery.mockReturnValueOnce([[]]);
      mockQuery.mockReturnValueOnce([[{ id: "admin-001" }]]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { startScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();

      const monthlyHandler = mockSchedule.mock.calls[1][1];
      monthlyHandler();
      await flushPromises();

      const selectCall = mockQuery.mock.calls[0];
      expect(selectCall[1][0]).toBe("monthly");

      const periodStart = selectCall[1][1] as string;
      const periodEnd = selectCall[1][2] as string;

      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);
      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeGreaterThanOrEqual(27);
      expect(diffDays).toBeLessThanOrEqual(31);
    });
  });

  describe("generateAutoReport - 自动生成报告", () => {
    it("报告已存在时应跳过生成", async () => {
      mockQuery.mockReturnValueOnce([[{ id: "existing-report-id" }]]);

      const { startScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();

      const weeklyHandler = mockSchedule.mock.calls[0][1];
      weeklyHandler();
      await flushPromises();

      const insertCalls = mockQuery.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" && (call[0] as string).includes("INSERT")
      );
      expect(insertCalls.length).toBe(0);
    });

    it("报告不存在时应创建新报告", async () => {
      mockQuery.mockReturnValueOnce([[]]);
      mockQuery.mockReturnValueOnce([[{ id: "admin-001" }]]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { startScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();

      const weeklyHandler = mockSchedule.mock.calls[0][1];
      weeklyHandler();
      await flushPromises();

      const insertCalls = mockQuery.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" && (call[0] as string).includes("INSERT")
      );
      expect(insertCalls.length).toBe(1);
      expect(insertCalls[0][0]).toContain("INSERT INTO reports");
    });

    it("应使用 admin 用户作为创建者", async () => {
      mockQuery.mockReturnValueOnce([[]]);
      mockQuery.mockReturnValueOnce([[{ id: "admin-user-id" }]]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { startScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();

      const weeklyHandler = mockSchedule.mock.calls[0][1];
      weeklyHandler();
      await flushPromises();

      const insertCall = mockQuery.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === "string" && (call[0] as string).includes("INSERT")
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContain("admin-user-id");
    });

    it("发生错误时应优雅处理不抛出异常", async () => {
      mockQuery.mockImplementation(() => {
        throw new Error("数据库连接失败");
      });

      const { startScheduledTasks } = await import(
        "../src/services/reportGenerator.js"
      );
      startScheduledTasks();

      const weeklyHandler = mockSchedule.mock.calls[0][1];
      weeklyHandler();
      await flushPromises();

      const { logger } = await import("../src/utils/logger.js");
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
