import { describe, it, expect } from 'vitest';
import { costCalculator, type CostCalculationInput, type MaterialCost } from '../src/services/formula/costCalculator.js';

describe('CostCalculator - 成本计算器', () => {
  const sampleMaterials: MaterialCost[] = [
    { name: '人参', quantity: 500, unitPrice: 200 },
    { name: '枸杞', quantity: 300, unitPrice: 60 },
    { name: '红枣', quantity: 400, unitPrice: 25 },
    { name: '蜂蜜', quantity: 800, unitPrice: 35 },
  ];

  describe('基础成本计算', () => {
    it('应该正确计算原料小计', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
      };

      const result = costCalculator.calculate(input);

      const expectedSubtotal =
        (500 / 1000) * 200 +
        (300 / 1000) * 60 +
        (400 / 1000) * 25 +
        (800 / 1000) * 35;

      expect(result.material_subtotal).toBeCloseTo(expectedSubtotal, 2);
    });

    it('应该包含包装和其他成本', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
        packaging_cost: 5.5,
        other_costs: 3.2,
      };

      const result = costCalculator.calculate(input);

      expect(result.packaging_cost).toBe(5.5);
      expect(result.other_costs).toBe(3.2);
      expect(result.cost_subtotal).toBeCloseTo(
        result.material_subtotal + 5.5 + 3.2,
        2
      );
    });

    it('应该应用利润率计算总价', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
        profit_margin_percent: 25,
      };

      const result = costCalculator.calculate(input);

      const expectedTotal = result.cost_subtotal * 1.25;
      expect(result.total_price).toBeCloseTo(expectedTotal, 2);
      expect(result.profit_amount).toBeCloseTo(result.cost_subtotal * 0.25, 2);
    });
  });

  describe('明细分解', () => {
    it('应该提供每个原料的成本明细', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
      };

      const result = costCalculator.calculate(input);

      expect(result.breakdown).toHaveLength(4);

      result.breakdown.forEach(item => {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('unit_price');
        expect(item).toHaveProperty('subtotal');
        expect(item).toHaveProperty('percentage_of_total');
        expect(item.subtotal).toBeCloseTo((item.quantity / 1000) * item.unit_price, 2);
      });
    });

    it('应该正确计算各原料占总成本的百分比', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
      };

      const result = costCalculator.calculate(input);
      const totalPercentage = result.breakdown.reduce((sum, item) => sum + item.percentage_of_total, 0);

      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });

  describe('汇总信息', () => {
    it('应该提供正确的汇总统计信息', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
        profit_margin_percent: 20,
      };

      const result = costCalculator.calculate(input);

      expect(result.summary.total_materials).toBe(4);
      expect(result.summary.average_unit_price).toBeGreaterThan(0);
      expect(result.summary.profit_rate_applied).toBe(20);
    });
  });

  describe('单位成本计算', () => {
    it('应该正确计算每公斤和每100克成本', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
      };

      const result = costCalculator.calculate(input);
      const unitCost = costCalculator.calculatePerUnit(result, 2000);

      expect(unitCost.per_kg_cost).toBeCloseTo(result.cost_subtotal / 2, 2);
      expect(unitCost.per_100g_cost).toBeCloseTo(unitCost.per_kg_cost / 10, 2);
    });
  });

  describe('边界情况', () => {
    it('应该处理空材料列表', () => {
      const input: CostCalculationInput = {
        materials: [],
      };

      const result = costCalculator.calculate(input);

      expect(result.material_subtotal).toBe(0);
      expect(result.cost_subtotal).toBe(0);
      expect(result.total_price).toBe(0);
      expect(result.breakdown).toEqual([]);
    });

    it('应该处理零利润率', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
        profit_margin_percent: 0,
      };

      const result = costCalculator.calculate(input);

      expect(result.profit_amount).toBe(0);
      expect(result.total_price).toBe(result.cost_subtotal);
    });

    it('应该处理高利润率', () => {
      const input: CostCalculationInput = {
        materials: sampleMaterials,
        profit_margin_percent: 100,
      };

      const result = costCalculator.calculate(input);

      expect(result.total_price).toBe(result.cost_subtotal * 2);
    });

    it('应该处理只有包装成本的情况', () => {
      const input: CostCalculationInput = {
        materials: [],
        packaging_cost: 10,
        other_costs: 5,
      };

      const result = costCalculator.calculate(input);

      expect(result.material_subtotal).toBe(0);
      expect(result.packaging_cost).toBe(10);
      expect(result.other_costs).toBe(5);
      expect(result.cost_subtotal).toBe(15);
    });
  });

  describe('数值精度', () => {
    it('应该保留两位小数精度', () => {
      const input: CostCalculationInput = {
        materials: [
          { name: '精密原料', quantity: 333, unitPrice: 33.333 },
        ],
      };

      const result = costCalculator.calculate(input);

      expect(result.material_subtotal.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
      expect(result.cost_subtotal.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
      expect(result.total_price.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
    });
  });
});
