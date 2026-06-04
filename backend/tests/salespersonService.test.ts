import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import { SalespersonService } from "../src/services/business/salespersonService.js";
import type { SalespersonCreateInput, SalespersonUpdateInput } from "../src/services/business/salespersonService.js";

let testDb: Database.Database;

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: () => testDb,
  connectDatabase: vi.fn(),
  closeDatabase: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(<T>(fn: () => T): T => fn()),
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => `test-id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
  now: vi.fn(() => new Date().toISOString()),
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    if (!row) return row;
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

describe("SalespersonService - 业务员管理", () => {
  let service: SalespersonService;

  beforeAll(() => {
    testDb = new Database(":memory:");
    testDb.exec(`
      CREATE TABLE salesmen (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        department TEXT DEFAULT NULL,
        phone TEXT DEFAULT NULL,
        email TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  });

  afterAll(() => {
    testDb.close();
  });

  beforeEach(() => {
    service = new SalespersonService();
  });

  afterEach(() => {
    testDb.exec("DELETE FROM salesmen");
  });

  describe("create()", () => {
    it("应该成功创建业务员记录", async () => {
      const input: SalespersonCreateInput = {
        name: "张三",
        phone: "13800138000",
        email: "zhangsan@example.com",
        department: "销售一部",
      };

      const result = await service.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("张三");
      expect(result.phone).toBe("13800138000");
      expect(result.email).toBe("zhangsan@example.com");
      expect(result.department).toBe("销售一部");
      expect(result.status).toBe("active");
      expect(result.created_at).toBeDefined();
    });

    it("应该使用默认值创建最小化记录", async () => {
      const input: SalespersonCreateInput = {
        name: "李四",
      };

      const result = await service.create(input);

      expect(result.name).toBe("李四");
      expect(result.status).toBe("active");
      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
    });
  });

  describe("getById()", () => {
    it("应该根据ID获取业务员信息", async () => {
      const created = await service.create({ name: "王五" });
      const found = await service.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.name).toBe("王五");
    });

    it("应该对不存在的ID返回null", async () => {
      const found = await service.getById("nonexistent-id-99999");
      expect(found).toBeNull();
    });
  });

  describe("update()", () => {
    it("应该更新业务员信息", async () => {
      const created = await service.create({ name: "赵六" });

      const updateData: SalespersonUpdateInput = {
        name: "赵六更新",
        phone: "13900139000",
        department: "销售二部",
      };

      const updated = await service.update(created.id, updateData);

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("赵六更新");
      expect(updated!.phone).toBe("13900139000");
      expect(updated!.department).toBe("销售二部");
      expect(updated!.updated_at).toBeDefined();
    });

    it("应该对不存在的ID返回null", async () => {
      const updated = await service.update("nonexistent-id-99999", { name: "不存在" });
      expect(updated).toBeNull();
    });
  });

  describe("delete()", () => {
    it("应该删除存在的业务员", async () => {
      const created = await service.create({ name: "孙七" });
      const deleted = await service.delete(created.id);

      expect(deleted).toBe(true);
      const found = await service.getById(created.id);
      expect(found).toBeNull();
    });

    it("应该对不存在的ID返回false", async () => {
      const deleted = await service.delete("nonexistent-id-99999");
      expect(deleted).toBe(false);
    });
  });

  describe("query()", () => {
    beforeEach(async () => {
      await service.create({ name: "张三", department: "销售一部" });
      const sp2 = await service.create({ name: "李四", department: "销售二部" });
      await service.update(sp2.id, { status: "inactive" });
      await service.create({ name: "张伟", department: "销售一部" });
      await service.create({ name: "王芳", phone: "13800138001", department: "销售三部" });
    });

    it("应该支持分页查询", async () => {
      const result = await service.query({ page: 1, limit: 2 });

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(4);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it("应该支持关键词搜索", async () => {
      const result = await service.query({ search: "张" });

      result.data.forEach(sp => {
        expect(sp.name.includes("张") || sp.phone?.includes("张")).toBe(true);
      });
    });

    it("应该支持状态筛选", async () => {
      const activeResult = await service.query({ status: "active" });
      activeResult.data.forEach(sp => {
        expect(sp.status).toBe("active");
      });
    });

    it("应该支持部门筛选", async () => {
      const deptResult = await service.query({ department: "销售一部" });
      deptResult.data.forEach(sp => {
        expect(sp.department).toBe("销售一部");
      });
    });
  });

  describe("getStatistics()", () => {
    it("应该返回正确的统计信息", async () => {
      await service.create({ name: "统计测试1", department: "A部" });
      await service.create({ name: "统计测试2", department: "A部" });
      const sp3 = await service.create({ name: "统计测试3", department: "B部" });
      await service.update(sp3.id, { status: "inactive" });

      const stats = await service.getStatistics();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.active_count).toBeGreaterThanOrEqual(2);
      expect(stats.inactive_count).toBeGreaterThanOrEqual(1);
      expect(stats.departments.some(d => d.name === "A部")).toBe(true);
      expect(stats.departments.some(d => d.name === "B部")).toBe(true);
    });
  });
});
