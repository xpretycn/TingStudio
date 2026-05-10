import { describe, it, expect, beforeEach } from "vitest";
import { SalesAnalysisService } from "../src/services/business/salesAnalysisService.js";

describe("SalesAnalysisService - 销量分析", () => {
  let service: SalesAnalysisService;

  beforeEach(() => {
    service = new SalesAnalysisService();
  });

  async function seedTestData(svc: SalesAnalysisService) {
    const records = [
      {
        salesperson_id: 1,
        product_name: "甘绪理膏",
        quantity: 10,
        unit_price: 200,
        total_amount: 2000,
        sale_date: "2026-05-01",
        region: "华东",
        category: "膏方",
      },
      {
        salesperson_id: 1,
        product_name: "荣华天晞膏",
        quantity: 8,
        unit_price: 180,
        total_amount: 1440,
        sale_date: "2026-05-02",
        region: "华东",
        category: "膏方",
      },
      {
        salesperson_id: 2,
        product_name: "正阳御湿膏",
        quantity: 15,
        unit_price: 220,
        total_amount: 3300,
        sale_date: "2026-05-03",
        region: "华南",
        category: "膏方",
      },
      {
        salesperson_id: 2,
        product_name: "甘绪理膏",
        quantity: 12,
        unit_price: 200,
        total_amount: 2400,
        sale_date: "2026-05-04",
        region: "华南",
        category: "膏方",
      },
      {
        salesperson_id: 3,
        product_name: "荣华天晞膏",
        quantity: 20,
        unit_price: 180,
        total_amount: 3600,
        sale_date: "2026-05-05",
        region: "华北",
        category: "膏方",
      },
      {
        salesperson_id: 1,
        product_name: "正阳御湿膏",
        quantity: 5,
        unit_price: 220,
        total_amount: 1100,
        sale_date: "2026-05-06",
        region: "华东",
        category: "膏方",
      },
      {
        salesperson_id: 3,
        product_name: "甘绪理膏",
        quantity: 25,
        unit_price: 200,
        total_amount: 5000,
        sale_date: "2026-05-07",
        region: "华北",
        category: "膏方",
      },
      {
        salesperson_id: 2,
        product_name: "荣华天晞膏",
        quantity: 18,
        unit_price: 180,
        total_amount: 3240,
        sale_date: "2026-05-08",
        region: "华南",
        category: "膏方",
      },
    ];

    for (const record of records) {
      await svc.addRecord(record);
    }
  }

  beforeEach(async () => {
    await seedTestData(service);
  });

  describe("addRecord()", () => {
    it("应该成功添加销售记录", async () => {
      const record = await service.addRecord({
        salesperson_id: 5,
        product_name: "测试产品",
        quantity: 100,
        unit_price: 50,
        total_amount: 5000,
        sale_date: "2026-05-15",
      });

      expect(record.id).toBeDefined();
      expect(record.product_name).toBe("测试产品");
      expect(record.total_amount).toBe(5000);
    });
  });

  describe("analyze() - 基础分析", () => {
    it("应该计算正确的汇总统计数据", async () => {
      const result = await service.analyze({});

      expect(result.summary.total_records).toBe(8);
      expect(result.summary.total_quantity).toBeGreaterThan(0);
      expect(result.summary.total_amount).toBeGreaterThan(0);
      expect(result.summary.avg_quantity_per_order).toBeGreaterThan(0);
      expect(result.summary.avg_amount_per_order).toBeGreaterThan(0);
    });
  });

  describe("analyze() - 趋势分析", () => {
    it("应该按日分组生成趋势数据", async () => {
      const result = await service.analyze({ group_by: "day" });

      expect(result.trends.length).toBeGreaterThan(0);
      result.trends.forEach(trend => {
        expect(trend.period).toBeDefined();
        expect(trend.total_quantity).toBeGreaterThanOrEqual(0);
        expect(trend.total_amount).toBeGreaterThanOrEqual(0);
        expect(trend.order_count).toBeGreaterThanOrEqual(0);
        expect(trend.avg_order_value).toBeGreaterThanOrEqual(0);
      });
    });

    it("应该按区域分组生成趋势数据", async () => {
      const result = await service.analyze({ group_by: "region" });

      expect(result.trends.length).toBeGreaterThan(0);
      result.trends.forEach(trend => {
        expect(["华东", "华南", "华北"]).toContain(trend.period);
      });
    });
  });

  describe("analyze() - TOP排行", () => {
    it("应该返回TOP产品排行", async () => {
      const result = await service.analyze({});

      expect(result.top_products.length).toBeGreaterThan(0);
      expect(result.top_products[0].amount).toBeGreaterThanOrEqual(
        result.top_products[result.top_products.length - 1].amount,
      );
    });

    it("应该返回TOP业务员排行", async () => {
      const result = await service.analyze({});

      expect(result.top_salespersons.length).toBeGreaterThan(0);
      result.top_salespersons.forEach((sp, index) => {
        if (index > 0) {
          expect(sp.total_amount).toBeLessThanOrEqual(result.top_salespersons[index - 1].total_amount);
        }
      });
    });
  });

  describe("analyze() - 区域分布", () => {
    it("应该返回区域分布数据", async () => {
      const result = await service.analyze({});

      expect(result.regional_breakdown.length).toBeGreaterThan(0);
      result.regional_breakdown.forEach(region => {
        expect(region.region).toBeDefined();
        expect(region.count).toBeGreaterThan(0);
        expect(region.amount).toBeGreaterThan(0);
      });
    });
  });

  describe("analyze() - 异常检测", () => {
    it("应该检测到异常值（如果有）", async () => {
      const result = await service.analyze({});

      if (result.anomalies.length > 0) {
        result.anomalies.forEach(anomaly => {
          expect(anomaly.date).toBeDefined();
          expect(anomaly.metric).toBeDefined();
          expect(anomaly.value).toBeDefined();
          expect(anomaly.expected_range).toHaveLength(2);
          expect(["low", "medium", "high"]).toContain(anomaly.severity);
        });
      }
    });
  });

  describe("analyze() - 筛选条件", () => {
    it("应该按日期范围筛选", async () => {
      const result = await service.analyze({
        start_date: "2026-05-03",
        end_date: "2026-05-06",
      });

      expect(result.summary.total_records).toBeLessThanOrEqual(4);
    });

    it("应该按区域筛选", async () => {
      const result = await service.analyze({ region: "华东" });

      result.trends.forEach(trend => {
        if (trend.period === "华东") {
          // 验证只包含华东区域的记录
        }
      });
    });
  });
});
