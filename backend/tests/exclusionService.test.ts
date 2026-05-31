import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("../src/config/database-adapter.js", () => ({
  query: mockQuery,
  getDatabaseType: vi.fn(() => "sqlite"),
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
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
}));

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: vi.fn(() => ({ exec: vi.fn() })),
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("exclusionService - 互斥规则服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllExclusions - 获取所有互斥规则", () => {
    it("应该返回按分类分组的互斥规则", async () => {
      const dbRows = [
        { id: "1", category: "appearance", value_a: "red", value_b: "blue", label_a: "红色", label_b: "蓝色" },
        { id: "2", category: "taste", value_a: "sweet", value_b: "sour", label_a: "甜", label_b: "酸" },
      ];
      mockQuery.mockResolvedValueOnce({ rows: dbRows });

      const { getAllExclusions } = await import("../src/services/exclusionService.js");
      const result = await getAllExclusions();

      expect(result.appearance).toHaveLength(1);
      expect(result.taste).toHaveLength(1);
      expect(result.appearance[0].valueA).toBe("red");
      expect(result.taste[0].valueA).toBe("sweet");
    });

    it("应该在没有数据时返回空数组", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getAllExclusions } = await import("../src/services/exclusionService.js");
      const result = await getAllExclusions();

      expect(result.appearance).toHaveLength(0);
      expect(result.taste).toHaveLength(0);
    });
  });

  describe("createExclusion - 创建互斥规则", () => {
    it("应该在分类无效时抛出 VALIDATION_ERROR", async () => {
      const { createExclusion } = await import("../src/services/exclusionService.js");

      await expect(
        createExclusion({ category: "invalid", valueA: "a", valueB: "b" })
      ).rejects.toThrow("互斥规则分类必须为 appearance 或 taste");

      try {
        await createExclusion({ category: "invalid", valueA: "a", valueB: "b" });
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("VALIDATION_ERROR");
      }
    });

    it("应该在 valueA 和 valueB 相同时抛出 VALIDATION_ERROR", async () => {
      const { createExclusion } = await import("../src/services/exclusionService.js");

      await expect(
        createExclusion({ category: "appearance", valueA: "red", valueB: "red" })
      ).rejects.toThrow("valueA 和 valueB 不能相同");

      try {
        await createExclusion({ category: "appearance", valueA: "red", valueB: "red" });
      } catch (error: unknown) {
        expect((error as Error & { code: string }).code).toBe("VALIDATION_ERROR");
      }
    });

    it("应该在 valueA > valueB 时自动交换顺序", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: "opt-a" }] })
        .mockResolvedValueOnce({ rows: [{ id: "opt-b" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: "mock-id-123", category: "taste", value_a: "apple", value_b: "banana", label_a: "苹果", label_b: "香蕉" },
          ],
        });

      const { createExclusion } = await import("../src/services/exclusionService.js");
      const result = await createExclusion({ category: "taste", valueA: "banana", valueB: "apple" });

      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[1][2]).toBe("apple");
      expect(insertCall[1][3]).toBe("banana");
      expect(result.valueA).toBe("apple");
      expect(result.valueB).toBe("banana");
    });

    it("应该在 valueA 不存在于 enum_options 时抛出 VALIDATION_ERROR", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { createExclusion } = await import("../src/services/exclusionService.js");

      await expect(
        createExclusion({ category: "appearance", valueA: "ghost", valueB: "red" })
      ).rejects.toThrow('选项 "ghost" 在枚举表中不存在或未启用');
    });

    it("应该在 valueB 不存在于 enum_options 时抛出 VALIDATION_ERROR", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: "opt-a" }] })
        .mockResolvedValueOnce({ rows: [] });

      const { createExclusion } = await import("../src/services/exclusionService.js");

      await expect(
        createExclusion({ category: "appearance", valueA: "apple", valueB: "ghost" })
      ).rejects.toThrow('选项 "ghost" 在枚举表中不存在或未启用');
    });

    it("应该在 UNIQUE 约束冲突时抛出 DUPLICATE_ENTRY", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: "opt-a" }] })
        .mockResolvedValueOnce({ rows: [{ id: "opt-b" }] })
        .mockRejectedValueOnce(new Error("UNIQUE constraint failed"));

      const { createExclusion } = await import("../src/services/exclusionService.js");

      try {
        await createExclusion({ category: "taste", valueA: "sweet", valueB: "sour" });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("该互斥规则已存在");
        expect((error as Error & { code: string }).code).toBe("DUPLICATE_ENTRY");
      }
    });

    it("应该成功创建互斥规则并返回含标签的结果", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: "opt-a" }] })
        .mockResolvedValueOnce({ rows: [{ id: "opt-b" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: "mock-id-123", category: "appearance", value_a: "blue", value_b: "red", label_a: "蓝色", label_b: "红色" },
          ],
        });

      const { createExclusion } = await import("../src/services/exclusionService.js");
      const result = await createExclusion({ category: "appearance", valueA: "blue", valueB: "red" });

      expect(result.id).toBe("mock-id-123");
      expect(result.category).toBe("appearance");
      expect(result.valueA).toBe("blue");
      expect(result.valueB).toBe("red");
      expect(result.labelA).toBe("蓝色");
      expect(result.labelB).toBe("红色");
    });
  });

  describe("deleteExclusion - 删除互斥规则", () => {
    it("应该在规则不存在时抛出 NOT_FOUND", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { deleteExclusion } = await import("../src/services/exclusionService.js");

      try {
        await deleteExclusion("non-existent-id");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("互斥规则不存在");
        expect((error as Error & { code: string }).code).toBe("NOT_FOUND");
      }
    });

    it("应该成功删除并返回 deletedId", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: "rule-001" }] })
        .mockResolvedValueOnce({ rows: [] });

      const { deleteExclusion } = await import("../src/services/exclusionService.js");
      const result = await deleteExclusion("rule-001");

      expect(result.deletedId).toBe("rule-001");
      expect(mockQuery).toHaveBeenCalledTimes(2);
      const deleteCall = mockQuery.mock.calls[1];
      expect(deleteCall[0]).toContain("DELETE FROM enum_exclusions");
      expect(deleteCall[1]).toEqual(["rule-001"]);
    });
  });
});
