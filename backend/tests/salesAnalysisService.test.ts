import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import { SalesAnalysisService } from "../src/services/business/salesAnalysisService.js";

let testDb: Database.Database;

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: () => testDb,
  connectDatabase: vi.fn(),
  closeDatabase: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(<T>(fn: () => T): T => fn()),
}));

function seedTestData() {
  // Insert salesmen
  testDb.prepare(
    "INSERT INTO salesmen (id, name, code, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run("s-001", "业务员A", "YW001", "active", "agent");
  testDb.prepare(
    "INSERT INTO salesmen (id, name, code, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run("s-002", "业务员B", "YW002", "active", "agent");
  testDb.prepare(
    "INSERT INTO salesmen (id, name, code, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run("s-003", "业务员C", "YW003", "active", "agent");

  // Insert formulas
  testDb.prepare(
    "INSERT INTO formulas (id, name, salesman_id, salesman_name, materials_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run("f-001", "甘绪理膏", "s-001", "业务员A", "[]", "agent");
  testDb.prepare(
    "INSERT INTO formulas (id, name, salesman_id, salesman_name, materials_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run("f-002", "荣华天晞膏", "s-001", "业务员A", "[]", "agent");
  testDb.prepare(
    "INSERT INTO formulas (id, name, salesman_id, salesman_name, materials_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run("f-003", "正阳御湿膏", "s-002", "业务员B", "[]", "agent");

  // Insert sales records
  const salesRecords = [
    { id: "fs-001", formula_id: "f-001", salesman_id: "s-001", period_type: "monthly", period_start: "2026-05-01", period_end: "2026-05-31", quantity: 10, revenue: 2000, created_by: "agent" },
    { id: "fs-002", formula_id: "f-002", salesman_id: "s-001", period_type: "monthly", period_start: "2026-05-01", period_end: "2026-05-31", quantity: 8, revenue: 1440, created_by: "agent" },
    { id: "fs-003", formula_id: "f-003", salesman_id: "s-002", period_type: "monthly", period_start: "2026-04-01", period_end: "2026-04-30", quantity: 15, revenue: 3300, created_by: "agent" },
    { id: "fs-004", formula_id: "f-001", salesman_id: "s-002", period_type: "monthly", period_start: "2026-04-01", period_end: "2026-04-30", quantity: 12, revenue: 2400, created_by: "agent" },
    { id: "fs-005", formula_id: "f-002", salesman_id: "s-003", period_type: "monthly", period_start: "2026-03-01", period_end: "2026-03-31", quantity: 20, revenue: 3600, created_by: "agent" },
  ];

  const insertStmt = testDb.prepare(
    "INSERT INTO formula_sales (id, formula_id, salesman_id, period_type, period_start, period_end, quantity, revenue, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  );
  for (const r of salesRecords) {
    insertStmt.run(r.id, r.formula_id, r.salesman_id, r.period_type, r.period_start, r.period_end, r.quantity, r.revenue, r.created_by);
  }
}

describe("SalesAnalysisService - 销量分析", () => {
  let service: SalesAnalysisService;

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
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE formulas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        salesman_id TEXT NOT NULL,
        salesman_name TEXT NOT NULL,
        materials_json TEXT NOT NULL,
        finished_weight REAL NOT NULL DEFAULT 0,
        ratio_factor REAL NOT NULL DEFAULT 0.18,
        supplement_ratio_factor REAL NOT NULL DEFAULT 1.0,
        packaging_price REAL NOT NULL DEFAULT 0,
        other_price REAL NOT NULL DEFAULT 0,
        profit_margin REAL NOT NULL DEFAULT 20,
        description TEXT DEFAULT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE formula_sales (
        id TEXT PRIMARY KEY,
        formula_id TEXT NOT NULL,
        salesman_id TEXT NOT NULL,
        period_type TEXT NOT NULL DEFAULT 'monthly',
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        revenue REAL NOT NULL DEFAULT 0,
        notes TEXT DEFAULT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });

  afterAll(() => {
    testDb.close();
  });

  beforeEach(() => {
    service = new SalesAnalysisService();
    seedTestData();
  });

  afterEach(() => {
    testDb.exec("DELETE FROM formula_sales");
    testDb.exec("DELETE FROM formulas");
    testDb.exec("DELETE FROM salesmen");
  });

  describe("analyze() - 基础分析", () => {
    it("应该计算正确的汇总统计数据", async () => {
      const result = await service.analyze({});

      expect(result.summary.total_records).toBe(5);
      expect(result.summary.total_quantity).toBeGreaterThan(0);
      expect(result.summary.total_amount).toBeGreaterThan(0);
      expect(result.summary.avg_quantity_per_order).toBeGreaterThan(0);
      expect(result.summary.avg_amount_per_order).toBeGreaterThan(0);
      expect(result.has_data).toBe(true);
    });

    it("无数据时应返回空结果", async () => {
      testDb.exec("DELETE FROM formula_sales");
      const result = await service.analyze({});

      expect(result.has_data).toBe(false);
      expect(result.summary.total_records).toBe(0);
      expect(result.trends).toEqual([]);
      expect(result.top_formulas).toEqual([]);
      expect(result.top_salespersons).toEqual([]);
    });
  });

  describe("analyze() - 趋势分析", () => {
    it("应该按月分组生成趋势数据", async () => {
      const result = await service.analyze({ group_by: "month" });

      expect(result.trends.length).toBeGreaterThan(0);
      result.trends.forEach(trend => {
        expect(trend.period).toBeDefined();
        expect(trend.total_quantity).toBeGreaterThanOrEqual(0);
        expect(trend.total_amount).toBeGreaterThanOrEqual(0);
        expect(trend.order_count).toBeGreaterThanOrEqual(0);
        expect(trend.avg_order_value).toBeGreaterThanOrEqual(0);
      });
    });

    it("应该按业务员分组生成趋势数据", async () => {
      const result = await service.analyze({ group_by: "salesperson" });

      expect(result.trends.length).toBeGreaterThan(0);
      result.trends.forEach(trend => {
        expect(trend.period).toBeDefined();
      });
    });
  });

  describe("analyze() - TOP排行", () => {
    it("应该返回TOP配方排行", async () => {
      const result = await service.analyze({});

      expect(result.top_formulas.length).toBeGreaterThan(0);
      expect(result.top_formulas[0].name).toBeDefined();
      expect(result.top_formulas[0].quantity).toBeGreaterThanOrEqual(0);
      expect(result.top_formulas[0].amount).toBeGreaterThanOrEqual(0);
    });

    it("应该返回TOP业务员排行", async () => {
      const result = await service.analyze({});

      expect(result.top_salespersons.length).toBeGreaterThan(0);
      result.top_salespersons.forEach(sp => {
        expect(sp.id).toBeDefined();
        expect(sp.name).toBeDefined();
        expect(sp.total_amount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("analyze() - 期间分布", () => {
    it("应该返回期间分布数据", async () => {
      const result = await service.analyze({});

      expect(result.period_breakdown.length).toBeGreaterThan(0);
      result.period_breakdown.forEach(period => {
        expect(period.period_type).toBeDefined();
        expect(period.count).toBeGreaterThan(0);
        expect(period.amount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("analyze() - 筛选条件", () => {
    it("应该按日期范围筛选", async () => {
      const result = await service.analyze({
        start_date: "2026-05-01",
        end_date: "2026-05-31",
      });

      expect(result.summary.total_records).toBeLessThanOrEqual(2);
    });
  });
});
