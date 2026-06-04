import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
  connectDatabase: vi.fn(),
  getDb: vi.fn(),
  closeDatabase: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-qf-id-123"),
  generateFormulaCode: vi.fn((name: string) => `CODE-${name}`),
  now: vi.fn(() => "2026-05-26T00:00:00.000Z"),
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }),
  rowsToCamelCase: vi.fn((rows: Record<string, unknown>[]) =>
    rows.map((r) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        result[camelKey] = value;
      }
      return result;
    })
  ),
  buildPagination: vi.fn((page?: number, pageSize?: number) => ({
    page: page || 1,
    pageSize: pageSize || 20,
    offset: ((page || 1) - 1) * (pageSize || 20),
  })),
  buildLike: vi.fn((keyword: string) => `%${keyword}%`),
  success: vi.fn((data) => ({ success: true, data })),
  successWithPagination: vi.fn((list, total, page, pageSize) => ({
    success: true,
    data: { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
  })),
}));

describe("quickFormulaService - 快速配方服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAll - 查询快速配方列表", () => {
    it("admin 应该查询全部快速配方", async () => {
      mockQuery.mockReturnValueOnce([[]]);
      mockQuery.mockReturnValueOnce([[{ total: 0 }]]);

      const { findAll } = await import("../src/services/quickFormulaService.js");
      const result = await findAll("admin-001", "admin");

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const selectCall = mockQuery.mock.calls[0];
      expect(selectCall[0]).not.toContain("created_by = ?");
      expect(result.list).toEqual([]);
    });

    it("formulist 应该只查询自己的快速配方", async () => {
      mockQuery.mockReturnValueOnce([[]]);
      mockQuery.mockReturnValueOnce([[{ total: 0 }]]);

      const { findAll } = await import("../src/services/quickFormulaService.js");
      await findAll("user-001", "formulist");

      const selectCall = mockQuery.mock.calls[0];
      expect(selectCall[0]).toContain("created_by = ?");
      expect(selectCall[1]).toContain("user-001");
    });

    it("应该支持关键词搜索", async () => {
      mockQuery.mockReturnValueOnce([[]]);
      mockQuery.mockReturnValueOnce([[{ total: 0 }]]);

      const { findAll } = await import("../src/services/quickFormulaService.js");
      await findAll("user-001", "formulist", "清热");

      const selectCall = mockQuery.mock.calls[0];
      expect(selectCall[0]).toContain("name LIKE ?");
    });
  });

  describe("findById - 根据ID查询", () => {
    it("存在时返回数据", async () => {
      const mockRow = {
        id: "qf-001",
        name: "清热解毒方",
        status: "draft",
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
        finished_weight: 3000,
        materials_json: "[]",
        packaging_price: 0,
        other_price: 0,
        profit_margin: 20,
        description: null,
        preparation_method: null,
        salesman_id: null,
        salesman_name: null,
        created_by: "user-001",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
      };
      mockQuery.mockReturnValueOnce([[mockRow]]);

      const { findById } = await import("../src/services/quickFormulaService.js");
      const result = await findById("qf-001");

      expect(result).not.toBeNull();
      expect(result.id).toBe("qf-001");
    });

    it("不存在时返回 null", async () => {
      mockQuery.mockReturnValueOnce([[]]);

      const { findById } = await import("../src/services/quickFormulaService.js");
      const result = await findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByName - 名称唯一性校验", () => {
    it("名称存在时返回记录", async () => {
      mockQuery.mockReturnValueOnce([[{ id: "qf-001" }]]);

      const { findByName } = await import("../src/services/quickFormulaService.js");
      const result = await findByName("清热解毒方", "user-001");

      expect(result).not.toBeNull();
    });

    it("名称不存在时返回 null", async () => {
      mockQuery.mockReturnValueOnce([[]]);

      const { findByName } = await import("../src/services/quickFormulaService.js");
      const result = await findByName("不存在的配方", "user-001");

      expect(result).toBeNull();
    });
  });

  describe("create - 创建快速配方", () => {
    it("应该正确插入数据", async () => {
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([[{
        id: "mock-qf-id-123",
        name: "新配方",
        status: "draft",
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
        finished_weight: 0,
        materials_json: "[]",
        packaging_price: 0,
        other_price: 0,
        profit_margin: 20,
        description: null,
        preparation_method: null,
        salesman_id: null,
        salesman_name: null,
        created_by: "user-001",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
      }]]);

      const { create } = await import("../src/services/quickFormulaService.js");
      const result = await create({
        name: "新配方",
        createdBy: "user-001",
        createdByName: "张三",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO quick_formulas"),
        expect.arrayContaining(["mock-qf-id-123", "新配方", "user-001"]),
      );
      expect(result).not.toBeNull();
    });
  });

  describe("update - 更新快速配方", () => {
    it("应该动态构建 SET 子句", async () => {
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([[{
        id: "qf-001",
        name: "更新后名称",
        status: "draft",
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
        finished_weight: 3000,
        materials_json: "[]",
        packaging_price: 0,
        other_price: 0,
        profit_margin: 20,
        description: null,
        preparation_method: null,
        salesman_id: null,
        salesman_name: null,
        created_by: "user-001",
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
      }]]);

      const { update } = await import("../src/services/quickFormulaService.js");
      await update("qf-001", { name: "更新后名称", finishedWeight: 3000 });

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain("name = ?");
      expect(updateCall[0]).toContain("finished_weight = ?");
      expect(updateCall[0]).toContain("updated_at = ?");
    });

    it("没有更新字段时不应执行 UPDATE", async () => {
      mockQuery.mockReturnValueOnce([[{
        id: "qf-001",
        name: "原名称",
        status: "draft",
      }]]);

      const { update } = await import("../src/services/quickFormulaService.js");
      await update("qf-001", {});

      const updateCalls = mockQuery.mock.calls.filter(
        (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).includes("UPDATE quick_formulas")
      );
      expect(updateCalls.length).toBe(0);
    });
  });

  describe("remove - 删除快速配方", () => {
    it("应该执行 DELETE 语句", async () => {
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { remove } = await import("../src/services/quickFormulaService.js");
      await remove("qf-001");

      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM quick_formulas WHERE id = ?",
        ["qf-001"],
      );
    });
  });

  describe("publish - 发布快速配方", () => {
    it("应该创建 formulas 和 formula_versions 记录", async () => {
      const quickFormulaRow = {
        id: "qf-001",
        name: "清热解毒方",
        status: "draft",
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
        finished_weight: 3000,
        materials_json: '[{"materialId":"mat-001","materialName":"金银花","quantity":500,"materialType":"herb"}]',
        packaging_price: 0,
        other_price: 0,
        profit_margin: 20,
        description: null,
        preparation_method: null,
        salesman_id: null,
        salesman_name: null,
        created_by: "user-001",
      };

      mockQuery.mockReturnValueOnce([[quickFormulaRow]]);
      mockQuery.mockReturnValueOnce([[{ id: "sls-001", name: "李四" }]]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { publish } = await import("../src/services/quickFormulaService.js");
      const result = await publish(
        "qf-001",
        { salesmanId: "sls-001", description: "清热解毒" },
        "user-001",
        "formulist",
      );

      expect(result.formulaId).toBe("mock-qf-id-123");
      expect(result.quickFormulaStatus).toBe("published");

      const insertFormulaCall = mockQuery.mock.calls[2];
      expect(insertFormulaCall[0]).toContain("INSERT INTO formulas");

      const insertVersionCall = mockQuery.mock.calls[3];
      expect(insertVersionCall[0]).toContain("INSERT INTO formula_versions");

      const updateQfCall = mockQuery.mock.calls[4];
      expect(updateQfCall[0]).toContain("UPDATE quick_formulas SET status = 'published'");
    });

    it("formulist 发布时版本状态应为 draft", async () => {
      const quickFormulaRow = {
        id: "qf-001", name: "测试方", status: "draft",
        ratio_factor: 0.18, supplement_ratio_factor: 1.0, finished_weight: 0,
        materials_json: "[]", packaging_price: 0, other_price: 0, profit_margin: 20,
        description: null, preparation_method: null, salesman_id: null, salesman_name: null,
        created_by: "user-001",
      };

      mockQuery.mockReturnValueOnce([[quickFormulaRow]]);
      mockQuery.mockReturnValueOnce([[{ id: "sls-001", name: "李四" }]]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { publish } = await import("../src/services/quickFormulaService.js");
      await publish("qf-001", { salesmanId: "sls-001", description: "测试" }, "user-001", "formulist");

      const insertVersionCall = mockQuery.mock.calls[3];
      expect(insertVersionCall[1]).toContain("draft");
    });

    it("admin 发布时版本状态应为 published", async () => {
      const quickFormulaRow = {
        id: "qf-001", name: "测试方", status: "draft",
        ratio_factor: 0.18, supplement_ratio_factor: 1.0, finished_weight: 0,
        materials_json: "[]", packaging_price: 0, other_price: 0, profit_margin: 20,
        description: null, preparation_method: null, salesman_id: null, salesman_name: null,
        created_by: "admin-001",
      };

      mockQuery.mockReturnValueOnce([[quickFormulaRow]]);
      mockQuery.mockReturnValueOnce([[{ id: "sls-001", name: "李四" }]]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);
      mockQuery.mockReturnValueOnce([{ affectedRows: 1 }]);

      const { publish } = await import("../src/services/quickFormulaService.js");
      await publish("qf-001", { salesmanId: "sls-001", description: "测试" }, "admin-001", "admin");

      const insertVersionCall = mockQuery.mock.calls[3];
      expect(insertVersionCall[1]).toContain("published");
    });

    it("已发布的快速配方不能重复发布", async () => {
      const quickFormulaRow = {
        id: "qf-001", name: "测试方", status: "published",
        ratio_factor: 0.18, supplement_ratio_factor: 1.0, finished_weight: 0,
        materials_json: "[]", packaging_price: 0, other_price: 0, profit_margin: 20,
        description: null, preparation_method: null, salesman_id: null, salesman_name: null,
        created_by: "user-001",
      };

      mockQuery.mockReturnValueOnce([[quickFormulaRow]]);

      const { publish } = await import("../src/services/quickFormulaService.js");
      await expect(
        publish("qf-001", { salesmanId: "sls-001", description: "测试" }, "user-001", "formulist"),
      ).rejects.toThrow("草稿状态");
    });

    it("业务员不存在时应抛出错误", async () => {
      const quickFormulaRow = {
        id: "qf-001", name: "测试方", status: "draft",
        ratio_factor: 0.18, supplement_ratio_factor: 1.0, finished_weight: 0,
        materials_json: "[]", packaging_price: 0, other_price: 0, profit_margin: 20,
        description: null, preparation_method: null, salesman_id: null, salesman_name: null,
        created_by: "user-001",
      };

      mockQuery.mockReturnValueOnce([[quickFormulaRow]]);
      mockQuery.mockReturnValueOnce([[]]);

      const { publish } = await import("../src/services/quickFormulaService.js");
      await expect(
        publish("qf-001", { salesmanId: "sls-999", description: "测试" }, "user-001", "formulist"),
      ).rejects.toThrow("业务员不存在");
    });
  });
});
