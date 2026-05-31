import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({ all: vi.fn(() => []), get: vi.fn(() => undefined), run: vi.fn() })),
    pragma: vi.fn(() => []),
    exec: vi.fn(),
  })),
  query: vi.fn(() => [[]]),
  transaction: vi.fn((fn) => fn()),
}));
vi.mock("../src/config/database-adapter.js", () => ({
  getDatabaseType: vi.fn(() => "sqlite"),
}));
vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data) => ({ success: true, data })),
  rowToCamelCase: vi.fn((row) => row),
  rowsToCamelCase: vi.fn((rows) => rows),
  buildPagination: vi.fn((p, ps) => ({ page: p || 1, pageSize: ps || 20, offset: 0 })),
  buildLike: vi.fn((k) => `%${k}%`),
}));
vi.mock("../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("../src/controllers/reportController.js", () => ({
  aggregateReportData: vi.fn(),
  getWeekNumber: vi.fn(),
}));

import {
  getTableSchema,
  getTableData,
  restoreBackup,
  deleteBackup,
  executeScript,
} from "../src/services/dbService.js";

describe("dbService - 输入验证", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTableSchema 无效表名应抛出错误", () => {
    expect(() => getTableSchema("drop table users;--")).toThrow("无效的表名格式");
  });

  it("getTableData 无效表名应抛出错误", () => {
    expect(() => getTableData("users; DROP TABLE", {})).toThrow("无效的表名格式");
  });

  it("restoreBackup 无效文件名应抛出错误", () => {
    expect(() => restoreBackup("../../etc/passwd")).toThrow("无效的备份文件名格式");
  });

  it("deleteBackup 无效文件名应抛出错误", () => {
    expect(() => deleteBackup("malicious.exe")).toThrow("无效的备份文件名格式");
  });

  it("executeScript 无效脚本ID应抛出错误", async () => {
    await expect(executeScript("../etc/passwd", "admin")).rejects.toThrow("无效的脚本ID格式");
  });

  it("executeScript 不存在的脚本应抛出错误", async () => {
    await expect(executeScript("non-existent-script", "admin")).rejects.toThrow(
      "脚本不存在: non-existent-script"
    );
  });
});
