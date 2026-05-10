import { describe, it, expect } from 'vitest';
import { nutritionEngine } from '../src/services/formula/nutritionEngine.js';
import type { FormulaInput } from '../src/types/nutrition.js';

describe('NutritionEngine - 7步法营养计算', () => {
  const sampleFormula: FormulaInput = {
    finishedWeight: 100,
    materials: [
      {
        name: '人参',
        type: 'herb',
        quantity: 10,
        ratioFactor: 0.18,
        nutrition_per_100g: {
          protein: 5.2,
          fat: 1.1,
          carbohydrate: 23.4,
          sodium: 8,
        },
      },
      {
        name: '枸杞',
        type: 'supplement',
        quantity: 15,
        ratioFactor: 1.0,
        nutrition_per_100g: {
          protein: 13.6,
          fat: 1.7,
          carbohydrate: 64.1,
          sodium: 7,
        },
      },
      {
        name: '红枣',
        type: 'supplement',
        quantity: 20,
        ratioFactor: 1.0,
        nutrition_per_100g: {
          protein: 3.2,
          fat: 0.5,
          carbohydrate: 67.8,
          sodium: 15,
        },
      },
    ],
  };

  describe('Step 1: 数据准备', () => {
    it('should correctly prepare formula data', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      expect(result.calculation_steps.step1_data_preparation).toEqual({
        finished_weight: 100,
        materials_count: 3,
        herb_count: 1,
        supplement_count: 2,
      });
    });
  });

  describe('Step 2: 含量比计算', () => {
    it('should calculate ratios with correct factors', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      const step2 = result.calculation_steps.step2_ratio_calculation;

      expect(step2).toHaveLength(3);

      const ginseng = step2.find(m => m.name === '人参');
      expect(ginseng).toBeDefined();
      expect(ginseng?.ratio_factor).toBe(0.18);
      expect(parseFloat(ginseng?.calculated_ratio!.toFixed(5))).toBeCloseTo(0.018);
    });

    it('should use default ratioFactor for supplements', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      const step2 = result.calculation_steps.step2_ratio_calculation;

      const goji = step2.find(m => m.name === '枸杞');
      expect(goji?.ratio_factor).toBe(1.0);
      expect(parseFloat(goji?.calculated_ratio!.toFixed(5))).toBeCloseTo(0.15);
    });
  });

  describe('Step 3: 营养素汇总', () => {
    it('should aggregate nutrition contributions', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      const step3 = result.calculation_steps.step3_nutrition_contribution;

      expect(typeof step3.total_protein).toBe('number');
      expect(typeof step3.total_fat).toBe('number');
      expect(typeof step3.total_carbohydrate).toBe('number');
      expect(typeof step3.total_sodium).toBe('number');

      expect(step3.total_protein).toBeGreaterThan(0);
      expect(step3.total_fat).toBeGreaterThan(0);
      expect(step3.total_carbohydrate).toBeGreaterThan(0);
    });
  });

  describe('Step 4: Atwater 能量计算', () => {
    it('should calculate energy using Atwater coefficients', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      const step4 = result.calculation_steps.step4_atwater_energy;

      expect(step4.energy_kJ_raw).toBeGreaterThan(0);
      expect(step4.calories_raw).toBeGreaterThan(0);
      expect(step4.formula_used).toContain('17');
      expect(step4.formula_used).toContain('37');
    });
  });

  describe('Step 5: NRV% 计算', () => {
    it('should calculate NRV percentages for all nutrients', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      const step5 = result.calculation_steps.step5_nrv_percentage;

      expect(step5.energy_percent).toBeGreaterThanOrEqual(0);
      expect(step5.protein_percent).toBeGreaterThanOrEqual(0);
      expect(step5.fat_percent).toBeGreaterThanOrEqual(0);
      expect(step5.carbohydrate_percent).toBeGreaterThanOrEqual(0);
      expect(step5.sodium_percent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Step 6: 归零阈值处理', () => {
    it('should apply zero threshold rules correctly', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      const step6 = result.calculation_steps.step6_zero_threshold;

      expect(Array.isArray(step6)).toBe(true);
      expect(step6.length).toBe(5);

      step6.forEach(rule => {
        expect(rule).toHaveProperty('nutrient');
        expect(rule).toHaveProperty('raw_value');
        expect(rule).toHaveProperty('threshold');
        expect(rule).toHaveProperty('is_zeroed');
        expect(rule).toHaveProperty('display_value');
      });
    });

    it('should zero out values below threshold', () => {
      const minimalFormula: FormulaInput = {
        finishedWeight: 1000,
        materials: [
          {
            name: '微量原料',
            type: 'supplement',
            quantity: 1,
            nutrition_per_100g: {
              protein: 0.01,
              fat: 0.01,
              carbohydrate: 0.01,
              sodium: 0.001,
            },
          },
        ],
      };

      const result = nutritionEngine.calculate(minimalFormula);
      const labelValues = result.result.label_values;

      expect(labelValues.protein).toBe(0);
      expect(labelValues.fat).toBe(0);
      expect(labelValues.carbohydrate).toBe(0);
      expect(labelValues.sodium).toBe(0);
    });
  });

  describe('Step 7: 最终能量重新计算', () => {
    it('should recalculate energy after zero threshold', () => {
      const result = nutritionEngine.calculate(sampleFormula);
      const step7 = result.calculation_steps.step7_final_energy;

      expect(step7.final_energy_kJ).toBeGreaterThanOrEqual(0);
      expect(step7.final_calories).toBeGreaterThanOrEqual(0);
      expect(step7.recalculation_note).toContain('归零后');
    });
  });

  describe('最终结果验证', () => {
    it('should return complete calculation result structure', () => {
      const result = nutritionEngine.calculate(sampleFormula);

      expect(result).toHaveProperty('calculation_steps');
      expect(result).toHaveProperty('result');

      expect(result.result).toHaveProperty('raw_values');
      expect(result.result).toHaveProperty('label_values');
      expect(result.result).toHaveProperty('nrv_percentages');
      expect(result.result).toHaveProperty('per100g');
      expect(result.result).toHaveProperty('details');
    });

    it('should provide per100g values', () => {
      const result = nutritionEngine.calculate(sampleFormula);

      expect(result.result.per100g.energy_kJ).toBeGreaterThanOrEqual(0);
      expect(result.result.per100g.calories).toBeGreaterThanOrEqual(0);
      expect(result.result.per100g.protein).toBeGreaterThanOrEqual(0);
      expect(result.result.per100g.fat).toBeGreaterThanOrEqual(0);
      expect(result.result.per100g.carbohydrate).toBeGreaterThanOrEqual(0);
      expect(result.result.per100g.sodium).toBeGreaterThanOrEqual(0);
    });

    it('should provide detailed breakdown per material', () => {
      const result = nutritionEngine.calculate(sampleFormula);

      expect(result.result.details).toHaveLength(3);

      result.result.details.forEach(detail => {
        expect(detail).toHaveProperty('name');
        expect(detail).toHaveProperty('type');
        expect(detail).toHaveProperty('quantity');
        expect(detail).toHaveProperty('ratio');
        expect(detail).toHaveProperty('contribution');
        expect(detail.contribution).toHaveProperty('protein');
        expect(detail.contribution).toHaveProperty('fat');
        expect(detail.contribution).toHaveProperty('carbohydrate');
        expect(detail.contribution).toHaveProperty('sodium');
        expect(detail.contribution).toHaveProperty('energy_kJ');
      });
    });
  });
});
