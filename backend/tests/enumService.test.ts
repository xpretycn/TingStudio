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
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
}));

describe("enumService - 枚举选项服务", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getAllEnums - 获取所有枚举", () => {
    it("应该按分类分组返回所有枚举选项，并将 isActive 转为布尔值", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: "1", category: "appearance", label: "棕褐色", value: "brown", sort_order: 1, is_active: 1 },
          { id: "2", category: "taste", label: "苦", value: "bitter", sort_order: 1, is_active: 0 },
          { id: "3", category: "efficacy", label: "清热", value: "clear-heat", sort_order: 1, is_active: 1 },
        ],
      });

      const { getAllEnums } = await import("../src/services/enumService.js");
      const result = await getAllEnums();

      expect(result.appearance).toHaveLength(1);
      expect(result.appearance[0].isActive).toBe(true);
      expect(result.taste).toHaveLength(1);
      expect(result.taste[0].isActive).toBe(false);
      expect(result.efficacy).toHaveLength(1);
      expect(result.efficacy[0].isActive).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM enum_options ORDER BY category, sort_order"
      );
    });
  });

  describe("getEnumsByCategory - 按分类查询枚举", () => {
    it("应该返回指定分类的枚举，activeOnly 为 true 时仅返回启用项", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: "1", category: "taste", label: "苦", value: "bitter", sort_order: 1, is_active: 1 },
        ],
      });

      const { getEnumsByCategory } = await import("../src/services/enumService.js");
      const result = await getEnumsByCategory("taste", true);

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM enum_options WHERE category = ? AND is_active = 1 ORDER BY sort_order",
        ["taste"]
      );
    });
  });

  describe("createEnumOption - 创建枚举选项", () => {
    it("应该成功创建枚举选项并返回布尔化的 isActive", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ max_sort: 2 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: "mock-id-123", category: "appearance", label: "红色", value: "red", sort_order: 3, is_active: 1, created_at: "2026-05-22T00:00:00.000Z", updated_at: "2026-05-22T00:00:00.000Z" },
          ],
        });

      const { createEnumOption } = await import("../src/services/enumService.js");
      const result = await createEnumOption({ category: "appearance", label: "红色", value: "red" });

      expect(result.isActive).toBe(true);
      expect(result.id).toBe("mock-id-123");
      expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    it("应该在无效分类时抛出错误", async () => {
      const { createEnumOption } = await import("../src/services/enumService.js");

      await expect(
        createEnumOption({ category: "invalid", label: "测试", value: "test" })
      ).rejects.toThrow("无效的枚举分类");
    });

    it("应该在重复值时抛出 DUPLICATE_ENTRY 错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "existing-id" }] });

      const { createEnumOption } = await import("../src/services/enumService.js");

      await expect(
        createEnumOption({ category: "taste", label: "苦", value: "bitter" })
      ).rejects.toThrow("该分类下已存在相同选项");
    });
  });

  describe("updateEnumOption - 更新枚举选项", () => {
    it("应该在选项不存在时抛出 NOT_FOUND 错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { updateEnumOption } = await import("../src/services/enumService.js");

      await expect(
        updateEnumOption("non-existent-id", { label: "新标签" })
      ).rejects.toThrow("枚举选项不存在");
    });

    it("应该在更新 value 时检查重复并同步原料 JSON 字段", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: "opt-1", category: "appearance", label: "棕褐", value: "brown", is_active: 1 }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: "opt-1", category: "appearance", label: "棕褐", value: "dark-brown", sort_order: 1, is_active: 1, created_at: "2026-05-22T00:00:00.000Z", updated_at: "2026-05-22T00:00:00.000Z" },
          ],
        });

      const { updateEnumOption } = await import("../src/services/enumService.js");
      const result = await updateEnumOption("opt-1", { value: "dark-brown" });

      expect(result.value).toBe("dark-brown");
      expect(result.isActive).toBe(true);
    });
  });

  describe("deleteEnumOption - 删除枚举选项", () => {
    it("应该删除选项及其关联排斥记录，并返回引用计数", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: "opt-1", category: "taste", value: "bitter" }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 3 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const { deleteEnumOption } = await import("../src/services/enumService.js");
      const result = await deleteEnumOption("opt-1");

      expect(result.deletedId).toBe("opt-1");
      expect(result.referenceCount).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM enum_options WHERE id = ?",
        ["opt-1"]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM enum_exclusions WHERE category = ? AND (value_a = ? OR value_b = ?)",
        ["taste", "bitter", "bitter"]
      );
    });

    it("应该在选项不存在时抛出 NOT_FOUND 错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { deleteEnumOption } = await import("../src/services/enumService.js");

      await expect(deleteEnumOption("non-existent-id")).rejects.toThrow("枚举选项不存在");
    });
  });

  describe("getReferenceCount - 获取引用计数", () => {
    it("应该返回指定分类和值在原料中的引用数量", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });

      const { getReferenceCount } = await import("../src/services/enumService.js");
      const count = await getReferenceCount("appearance", "brown");

      expect(count).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT COUNT(*) as count FROM materials WHERE appearance_json LIKE ?",
        ['%"brown"%']
      );
    });
  });
});
