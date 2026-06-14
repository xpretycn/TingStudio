import { describe, it, expect } from 'vitest';
import { nutritionEngine } from '../src/services/formula/nutritionEngine.js';
import type { FormulaInput, AnalyzeInput } from '../src/types/nutrition.js';

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

// ============================================================
// 边界值与边缘用例测试
// ============================================================

describe('NutritionEngine - 边界值与边缘用例测试', () => {
  // 辅助函数：创建单一辅料配方，quantity = finishedWeight 使 ratio = 1.0
  function makeSingleSupplementFormula(
    nutrition: { protein?: number; fat?: number; carbohydrate?: number; sodium?: number },
    finishedWeight = 100,
  ): FormulaInput {
    return {
      finishedWeight,
      materials: [{
        name: '测试原料',
        type: 'supplement',
        quantity: finishedWeight,
        nutrition_per_100g: nutrition,
      }],
    };
  }

  // 辅助函数：创建 AnalyzeInput（用于 analyze 方法测试）
  function makeAnalyzeInput(
    per100g: Record<string, number>,
    finishedWeight = 100,
    quantity = 100,
  ): AnalyzeInput {
    return {
      formulaId: 'test-formula',
      formulaName: '测试配方',
      finishedWeight,
      ratioFactor: 0.18,
      supplementRatioFactor: 1.0,
      materials: [{
        materialId: 'mat-1',
        materialName: '测试辅料',
        materialType: 'supplement',
        quantity,
        per100g,
        hasNutritionData: true,
      }],
    };
  }

  // ----------------------------------------------------------
  // A. 0界限值边界测试
  // ----------------------------------------------------------
  describe('A. 0界限值边界测试', () => {
    it('能量恰好等于17kJ阈值 → step6显示归零', () => {
      // protein=1g → raw energy = 1×17 = 17kJ
      const formula = makeSingleSupplementFormula({ protein: 1, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      const energyRule = result.calculation_steps.step6_zero_threshold.find(
        (r: Record<string, unknown>) => r.nutrient === '能量(kJ)',
      );
      expect(energyRule).toBeDefined();
      expect(energyRule?.is_zeroed).toBe(true);
      expect(energyRule?.raw_value).toBe(17);
    });

    it('能量略高于17kJ → step6显示不归零', () => {
      // protein=1.01g → raw energy = 1.01×17 = 17.17kJ
      const formula = makeSingleSupplementFormula({ protein: 1.01, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      const energyRule = result.calculation_steps.step6_zero_threshold.find(
        (r: Record<string, unknown>) => r.nutrient === '能量(kJ)',
      );
      expect(energyRule).toBeDefined();
      expect(energyRule?.is_zeroed).toBe(false);
    });

    it('蛋白质恰好等于0.5g阈值 → 应归零', () => {
      const formula = makeSingleSupplementFormula({ protein: 0.5, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
    });

    it('蛋白质略高于0.5g(0.51g) → 不应归零', () => {
      const formula = makeSingleSupplementFormula({ protein: 0.51, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBeGreaterThan(0);
    });

    it('脂肪恰好等于0.5g阈值 → 应归零', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 0.5, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.fat).toBe(0);
    });

    it('碳水化合物恰好等于0.5g阈值 → 应归零', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 0, carbohydrate: 0.5, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.carbohydrate).toBe(0);
    });

    it('钠恰好等于5mg阈值 → 应归零', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 0, carbohydrate: 0, sodium: 5 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.sodium).toBe(0);
    });

    it('钠略高于5mg(5.01mg) → 不应归零', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 0, carbohydrate: 0, sodium: 5.01 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.sodium).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------
  // B. 归零后能量重算
  // ----------------------------------------------------------
  describe('B. 归零后能量重算', () => {
    it('蛋白质归零后，能量应不包含蛋白质贡献', () => {
      // protein=0.5(归零), fat=1, carb=0
      // 原始能量 = 0.5×17 + 1×37 = 45.5
      // 归零后能量 = 0×17 + 1×37 = 37
      const formula = makeSingleSupplementFormula({ protein: 0.5, fat: 1, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
      expect(result.result.label_values.fat).toBe(1);
      expect(result.calculation_steps.step7_final_energy.final_energy_kJ).toBe(37);
    });

    it('蛋白质和脂肪都归零后，能量仅包含碳水化合物贡献', () => {
      // protein=0.5(归零), fat=0.5(归零), carb=2
      // 归零后能量 = 0 + 0 + 2×17 = 34
      const formula = makeSingleSupplementFormula({ protein: 0.5, fat: 0.5, carbohydrate: 2, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
      expect(result.result.label_values.fat).toBe(0);
      expect(result.result.label_values.carbohydrate).toBe(2);
      expect(result.calculation_steps.step7_final_energy.final_energy_kJ).toBe(34);
    });

    it('所有宏量营养素归零后，能量应为0', () => {
      // protein=0.5(归零), fat=0.5(归零), carb=0.5(归零), sodium=5(归零)
      const formula = makeSingleSupplementFormula({ protein: 0.5, fat: 0.5, carbohydrate: 0.5, sodium: 5 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
      expect(result.result.label_values.fat).toBe(0);
      expect(result.result.label_values.carbohydrate).toBe(0);
      expect(result.calculation_steps.step7_final_energy.final_energy_kJ).toBe(0);
      expect(result.calculation_steps.step7_final_energy.final_calories).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // C. 含量比系数校验
  // ----------------------------------------------------------
  describe('C. 含量比系数校验', () => {
    it('药材(herb)默认ratioFactor 0.18 → 正确计算含量比', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '人参',
          type: 'herb',
          quantity: 10,
          nutrition_per_100g: { protein: 10, fat: 0, carbohydrate: 0, sodium: 0 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      const ginseng = result.calculation_steps.step2_ratio_calculation.find(m => m.name === '人参');
      expect(ginseng?.ratio_factor).toBe(0.18);
      // ratio = (10/100) × 0.18 = 0.018
      expect(ginseng?.calculated_ratio).toBeCloseTo(0.018, 3);
    });

    it('辅料(supplement)默认ratioFactor 1.0 → 正确计算含量比', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '枸杞',
          type: 'supplement',
          quantity: 20,
          nutrition_per_100g: { protein: 10, fat: 0, carbohydrate: 0, sodium: 0 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      const goji = result.calculation_steps.step2_ratio_calculation.find(m => m.name === '枸杞');
      expect(goji?.ratio_factor).toBe(1.0);
      // ratio = (20/100) × 1.0 = 0.2
      expect(goji?.calculated_ratio).toBeCloseTo(0.2, 3);
    });

    it('自定义ratioFactor → 使用自定义值计算', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '特殊原料',
          type: 'herb',
          quantity: 10,
          ratioFactor: 0.25,
          nutrition_per_100g: { protein: 10, fat: 0, carbohydrate: 0, sodium: 0 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      const special = result.calculation_steps.step2_ratio_calculation.find(m => m.name === '特殊原料');
      expect(special?.ratio_factor).toBe(0.25);
      // ratio = (10/100) × 0.25 = 0.025
      expect(special?.calculated_ratio).toBeCloseTo(0.025, 3);
    });

    it('多种原料含量比之和恰好1.0 → 正常计算', () => {
      // herb: 50g × 0.18 / 100 = 0.09, supplement: 91g × 1.0 / 100 = 0.91
      // 总 ratio = 0.09 + 0.91 = 1.0
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [
          {
            name: '药材A',
            type: 'herb',
            quantity: 50,
            nutrition_per_100g: { protein: 1, fat: 0, carbohydrate: 0, sodium: 0 },
          },
          {
            name: '辅料B',
            type: 'supplement',
            quantity: 91,
            nutrition_per_100g: { protein: 1, fat: 0, carbohydrate: 0, sodium: 0 },
          },
        ],
      };
      const result = nutritionEngine.calculate(formula);
      const ratios = result.calculation_steps.step2_ratio_calculation;
      const totalRatio = ratios.reduce((sum, r) => sum + (r.calculated_ratio as number), 0);
      expect(totalRatio).toBeCloseTo(1.0, 1);
      expect(result).toHaveProperty('result');
    });

    it('多种原料含量比之和略超1.0 → 仍可正常计算', () => {
      // herb: 60g × 0.18 / 100 = 0.108, supplement: 91g × 1.0 / 100 = 0.91
      // 总 ratio = 1.018
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [
          {
            name: '药材A',
            type: 'herb',
            quantity: 60,
            nutrition_per_100g: { protein: 1, fat: 0, carbohydrate: 0, sodium: 0 },
          },
          {
            name: '辅料B',
            type: 'supplement',
            quantity: 91,
            nutrition_per_100g: { protein: 1, fat: 0, carbohydrate: 0, sodium: 0 },
          },
        ],
      };
      const result = nutritionEngine.calculate(formula);
      const ratios = result.calculation_steps.step2_ratio_calculation;
      const totalRatio = ratios.reduce((sum, r) => sum + (r.calculated_ratio as number), 0);
      expect(totalRatio).toBeGreaterThan(1.0);
      expect(result).toHaveProperty('result');
    });
  });

  // ----------------------------------------------------------
  // D. Atwater能量计算
  // ----------------------------------------------------------
  describe('D. Atwater能量计算', () => {
    it('纯蛋白质 → 能量 = 蛋白质 × 17', () => {
      const formula = makeSingleSupplementFormula({ protein: 10, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step4_atwater_energy.energy_kJ_raw).toBe(170);
    });

    it('纯脂肪 → 能量 = 脂肪 × 37', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 10, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step4_atwater_energy.energy_kJ_raw).toBe(370);
    });

    it('纯碳水化合物 → 能量 = 碳水 × 17', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 0, carbohydrate: 10, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step4_atwater_energy.energy_kJ_raw).toBe(170);
    });

    it('混合宏量营养素 → 正确加总', () => {
      // protein=5, fat=3, carb=20
      // energy = 5×17 + 3×37 + 20×17 = 85 + 111 + 340 = 536
      const formula = makeSingleSupplementFormula({ protein: 5, fat: 3, carbohydrate: 20, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step4_atwater_energy.energy_kJ_raw).toBe(536);
    });
  });

  // ----------------------------------------------------------
  // E. NRV百分比计算
  // ----------------------------------------------------------
  describe('E. NRV百分比计算', () => {
    it('营养素恰好等于NRV参考值 → NRV%应为100%', () => {
      // NRV protein = 60g
      const formula = makeSingleSupplementFormula({ protein: 60, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step5_nrv_percentage.protein_percent).toBe(100);
    });

    it('营养素为0 → NRV%应为0%', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step5_nrv_percentage.protein_percent).toBe(0);
      expect(result.calculation_steps.step5_nrv_percentage.fat_percent).toBe(0);
      expect(result.calculation_steps.step5_nrv_percentage.carbohydrate_percent).toBe(0);
      expect(result.calculation_steps.step5_nrv_percentage.sodium_percent).toBe(0);
    });

    it('营养素超过NRV参考值 → NRV%应大于100%', () => {
      // protein=90 > NRV 60 → 150%
      const formula = makeSingleSupplementFormula({ protein: 90, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step5_nrv_percentage.protein_percent).toBeGreaterThan(100);
    });
  });

  // ----------------------------------------------------------
  // F. 含量声称评估（使用 analyze 方法）
  // ----------------------------------------------------------
  describe('F. 含量声称评估', () => {
    it('"低脂肪" - 脂肪≤3g/100g → 应通过', () => {
      const input = makeAnalyzeInput({ protein: 5, fat: 2, carbohydrate: 10, sodium: 50 });
      const result = nutritionEngine.analyze(input);
      const lowFatClaim = result.claims.find(c => c.claim === '低脂肪');
      expect(lowFatClaim).toBeDefined();
      expect(lowFatClaim?.satisfied).toBe(true);
    });

    it('"低脂肪" - 脂肪>3g/100g → 应不通过', () => {
      const input = makeAnalyzeInput({ protein: 5, fat: 5, carbohydrate: 10, sodium: 50 });
      const result = nutritionEngine.analyze(input);
      const lowFatClaim = result.claims.find(c => c.claim === '低脂肪');
      expect(lowFatClaim).toBeDefined();
      expect(lowFatClaim?.satisfied).toBe(false);
    });

    it('"高蛋白质" - 蛋白质NRV%≥10% → 应通过', () => {
      // protein=6g → NRV% = (6/60)×100 = 10%，达到阈值
      const input = makeAnalyzeInput({ protein: 6, fat: 2, carbohydrate: 10, sodium: 50 });
      const result = nutritionEngine.analyze(input);
      const highProteinClaim = result.claims.find(c => c.claim === '高蛋白质');
      expect(highProteinClaim).toBeDefined();
      expect(highProteinClaim?.satisfied).toBe(true);
    });

    it('"无糖" - 糖≤0.5g/100g → 应通过', () => {
      // sugars=0.3 会被0界限归零，per100g.sugars=0，0≤0.5 → 满足"无糖"
      const input = makeAnalyzeInput({ protein: 5, fat: 2, carbohydrate: 10, sugars: 0.3, sodium: 50 });
      const result = nutritionEngine.analyze(input);
      const noSugarClaim = result.claims.find(c => c.claim === '无糖');
      expect(noSugarClaim).toBeDefined();
      expect(noSugarClaim?.satisfied).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // G. 强化剂合规检查（使用 analyze 方法）
  // ----------------------------------------------------------
  describe('G. 强化剂合规检查', () => {
    it('维生素C在GB 14880限量内 → 应合规', () => {
      // vitaminC: minPerKg=100, maxPerKg=500 mg/kg
      // usageAmountPerKg = (quantity / finishedWeight) × 1000000
      // quantity=0.02, finishedWeight=100 → usageAmountPerKg = 200 (在100~500范围内)
      const input: AnalyzeInput = {
        formulaId: 'test-formula',
        formulaName: '测试配方',
        finishedWeight: 100,
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        materials: [{
          materialId: 'mat-1',
          materialName: '维生素C强化剂',
          materialType: 'supplement',
          quantity: 0.02,
          per100g: { protein: 0, fat: 0, carbohydrate: 0, sodium: 0, vitaminC: 50 },
          hasNutritionData: true,
        }],
      };
      const result = nutritionEngine.analyze(input);
      const vitaminCCheck = result.fortificationChecks.find(f => f.nutrient === 'vitaminC');
      expect(vitaminCCheck).toBeDefined();
      expect(vitaminCCheck?.status).toBe('compliant');
    });

    it('维生素C超过GB 14880上限 → 应不合规', () => {
      // quantity=0.06, finishedWeight=100 → usageAmountPerKg = 600 (> 500)
      const input: AnalyzeInput = {
        formulaId: 'test-formula',
        formulaName: '测试配方',
        finishedWeight: 100,
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        materials: [{
          materialId: 'mat-1',
          materialName: '维生素C强化剂(过量)',
          materialType: 'supplement',
          quantity: 0.06,
          per100g: { protein: 0, fat: 0, carbohydrate: 0, sodium: 0, vitaminC: 100 },
          hasNutritionData: true,
        }],
      };
      const result = nutritionEngine.analyze(input);
      const vitaminCCheck = result.fortificationChecks.find(f => f.nutrient === 'vitaminC');
      expect(vitaminCCheck).toBeDefined();
      expect(vitaminCCheck?.status).toBe('exceeded');
    });
  });

  // ----------------------------------------------------------
  // H. 空值与零值边缘用例
  // ----------------------------------------------------------
  describe('H. 空值与零值边缘用例', () => {
    it('空原料数组 → 应正常处理，产出全零结果', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
      expect(result.result.label_values.fat).toBe(0);
      expect(result.result.label_values.carbohydrate).toBe(0);
      expect(result.result.label_values.sodium).toBe(0);
      expect(result.calculation_steps.step7_final_energy.final_energy_kJ).toBe(0);
    });

    it('成品重量为0 → 不应抛出异常', () => {
      const formula: FormulaInput = {
        finishedWeight: 0,
        materials: [{
          name: '测试原料',
          type: 'supplement',
          quantity: 10,
          nutrition_per_100g: { protein: 5, fat: 2, carbohydrate: 10, sodium: 50 },
        }],
      };
      expect(() => nutritionEngine.calculate(formula)).not.toThrow();
    });

    it('原料所有营养值为0 → 应产生全零结果', () => {
      const formula = makeSingleSupplementFormula({ protein: 0, fat: 0, carbohydrate: 0, sodium: 0 });
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
      expect(result.result.label_values.fat).toBe(0);
      expect(result.result.label_values.carbohydrate).toBe(0);
      expect(result.result.label_values.sodium).toBe(0);
      expect(result.result.label_values.energy_kJ).toBe(0);
      expect(result.result.label_values.calories).toBe(0);
    });
  });
});

// ============================================================
// 计算引擎核心逻辑测试 (N01-N42)
// ============================================================

describe('NutritionEngine - 计算引擎核心逻辑测试', () => {
  function makeAnalyzeInput(
    materials: Array<{
      materialId: string;
      materialName: string;
      materialType: string;
      quantity: number;
      per100g: Record<string, number>;
      hasNutritionData?: boolean;
    }>,
    finishedWeight = 100,
    ratioFactor = 0.18,
    supplementRatioFactor = 1.0,
  ): AnalyzeInput {
    return {
      formulaId: 'test-formula',
      formulaName: '测试配方',
      finishedWeight,
      ratioFactor,
      supplementRatioFactor,
      materials,
    };
  }

  function singleHerbAnalyze(
    per100g: Record<string, number>,
    quantity = 10,
    finishedWeight = 100,
    ratioFactor = 0.18,
  ): AnalyzeInput {
    return makeAnalyzeInput(
      [{ materialId: 'h1', materialName: '药材', materialType: 'herb', quantity, per100g, hasNutritionData: true }],
      finishedWeight,
      ratioFactor,
    );
  }

  function singleSuppAnalyze(
    per100g: Record<string, number>,
    quantity = 100,
    finishedWeight = 100,
    supplementRatioFactor = 1.0,
  ): AnalyzeInput {
    return makeAnalyzeInput(
      [{ materialId: 's1', materialName: '辅料', materialType: 'supplement', quantity, per100g, hasNutritionData: true }],
      finishedWeight,
      0.18,
      supplementRatioFactor,
    );
  }

  // ----------------------------------------------------------
  // Ratio calculation
  // ----------------------------------------------------------
  describe('Ratio calculation', () => {
    it('N01: Correct ratio for herb material', () => {
      const input = singleHerbAnalyze({ protein: 10 }, 10, 100, 0.18);
      const result = nutritionEngine.analyze(input);
      const herb = result.materialContributions[0];
      // ratio = (10/100) × 0.18 = 0.018
      expect(herb.materialType).toBe('herb');
      expect(herb.ratio).toBeCloseTo(0.018, 5);
    });

    it('N02: Correct ratio for supplement material', () => {
      const input = singleSuppAnalyze({ protein: 10 }, 20, 100, 1.0);
      const result = nutritionEngine.analyze(input);
      const supp = result.materialContributions[0];
      // ratio = (20/100) × 1.0 = 0.2
      expect(supp.materialType).toBe('supplement');
      expect(supp.ratio).toBeCloseTo(0.2, 5);
    });

    it('N03: Materials with quantity=0 produce zero ratio and zero contribution', () => {
      const input = singleSuppAnalyze({ protein: 10, fat: 5 }, 0, 100);
      const result = nutritionEngine.analyze(input);
      const mat = result.materialContributions[0];
      expect(mat.quantity).toBe(0);
      expect(mat.ratio).toBe(0);
      expect(mat.contribution.protein).toBe(0);
      expect(mat.contribution.fat).toBe(0);
    });

    it('N04: Handles zero finishedWeight gracefully', () => {
      const input = singleSuppAnalyze({ protein: 10 }, 50, 0);
      expect(() => nutritionEngine.analyze(input)).not.toThrow();
      const result = nutritionEngine.analyze(input);
      const mat = result.materialContributions[0];
      expect(mat.ratio).toBe(0);
      expect(mat.contribution.protein).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // Nutrition contribution per material
  // ----------------------------------------------------------
  describe('Nutrition contribution', () => {
    it('N10: Correct protein contribution per material', () => {
      const input = singleSuppAnalyze({ protein: 20, fat: 0, carbohydrate: 0, sodium: 0 }, 50, 100);
      const result = nutritionEngine.analyze(input);
      // ratio = 50/100 × 1.0 = 0.5, contribution = 20 × 0.5 = 10
      expect(result.materialContributions[0].contribution.protein).toBeCloseTo(10, 2);
    });

    it('N11: Correct fat contribution per material', () => {
      const input = singleSuppAnalyze({ protein: 0, fat: 30, carbohydrate: 0, sodium: 0 }, 25, 100);
      const result = nutritionEngine.analyze(input);
      // ratio = 25/100 × 1.0 = 0.25, contribution = 30 × 0.25 = 7.5
      expect(result.materialContributions[0].contribution.fat).toBeCloseTo(7.5, 2);
    });

    it('N12: Correct carbohydrate contribution per material', () => {
      const input = singleSuppAnalyze({ protein: 0, fat: 0, carbohydrate: 60, sodium: 0 }, 10, 100);
      const result = nutritionEngine.analyze(input);
      // ratio = 10/100 × 1.0 = 0.1, contribution = 60 × 0.1 = 6
      expect(result.materialContributions[0].contribution.carbohydrate).toBeCloseTo(6, 2);
    });

    it('N13: Correct sodium contribution per material', () => {
      const input = singleSuppAnalyze({ protein: 0, fat: 0, carbohydrate: 0, sodium: 200 }, 10, 100);
      const result = nutritionEngine.analyze(input);
      // ratio = 10/100 × 1.0 = 0.1, contribution = 200 × 0.1 = 20
      expect(result.materialContributions[0].contribution.sodium).toBeCloseTo(20, 2);
    });
  });

  // ----------------------------------------------------------
  // Energy calculation
  // ----------------------------------------------------------
  describe('Energy calculation', () => {
    it('N20: Energy = protein×17 + fat×37 + carbohydrate×17', () => {
      // protein=5, fat=3, carb=10 → 5×17 + 3×37 + 10×17 = 85 + 111 + 170 = 366
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 5, fat: 3, carbohydrate: 10, sodium: 0 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.calculation_steps.step4_atwater_energy.energy_kJ_raw).toBe(366);
    });

    it('N21: Energy rounds to 2 decimal places', () => {
      // protein=1.23, fat=5.67, carb=9.01
      // energy = 1.23×17 + 5.67×37 + 9.01×17 = 20.91 + 209.79 + 153.17 = 383.87
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 1.23, fat: 5.67, carbohydrate: 9.01, sodium: 0 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      const energy = result.calculation_steps.step4_atwater_energy.energy_kJ_raw;
      expect(energy).toBe(383.87);
      const decimalPart = Math.round((energy % 1) * 100);
      expect(decimalPart).toBeLessThanOrEqual(99);
    });
  });

  // ----------------------------------------------------------
  // 0-boundary zeroing
  // ----------------------------------------------------------
  describe('0-boundary zeroing', () => {
    it('N30: Energy <= 17kJ is zeroed in step6', () => {
      // protein=1 → energy = 1×17 = 17 (exactly at threshold)
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 1, fat: 0, carbohydrate: 0, sodium: 0 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      const energyRule = result.calculation_steps.step6_zero_threshold.find(
        (r: Record<string, unknown>) => r.nutrient === '能量(kJ)',
      );
      expect(energyRule?.is_zeroed).toBe(true);
    });

    it('N31: Protein <= 0.5g is zeroed', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 0.5, fat: 1, carbohydrate: 1, sodium: 10 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
    });

    it('N32: Fat <= 0.5g is zeroed', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 1, fat: 0.5, carbohydrate: 1, sodium: 10 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.fat).toBe(0);
    });

    it('N33: Carbohydrate <= 0.5g is zeroed', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 1, fat: 1, carbohydrate: 0.5, sodium: 10 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.carbohydrate).toBe(0);
    });

    it('N34: Sodium <= 5mg is zeroed', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 1, fat: 1, carbohydrate: 1, sodium: 5 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.sodium).toBe(0);
    });

    it('N35: Energy is RECALCULATED after zeroing protein/fat/carb', () => {
      // protein=0.5(→0), fat=0.5(→0), carb=2 → 归零后 energy = 0 + 0 + 2×17 = 34
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 0.5, fat: 0.5, carbohydrate: 2, sodium: 0 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBe(0);
      expect(result.result.label_values.fat).toBe(0);
      expect(result.result.label_values.carbohydrate).toBe(2);
      expect(result.calculation_steps.step7_final_energy.final_energy_kJ).toBe(34);
    });

    it('N36: Values above thresholds are NOT zeroed', () => {
      const formula: FormulaInput = {
        finishedWeight: 100,
        materials: [{
          name: '测试', type: 'supplement', quantity: 100,
          nutrition_per_100g: { protein: 5, fat: 3, carbohydrate: 10, sodium: 50 },
        }],
      };
      const result = nutritionEngine.calculate(formula);
      expect(result.result.label_values.protein).toBeGreaterThan(0);
      expect(result.result.label_values.fat).toBeGreaterThan(0);
      expect(result.result.label_values.carbohydrate).toBeGreaterThan(0);
      expect(result.result.label_values.sodium).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------
  describe('Edge cases', () => {
    it('N40: Empty materials returns zeros', () => {
      const result = nutritionEngine.analyze({
        formulaId: 'empty',
        formulaName: '空配方',
        finishedWeight: 100,
        ratioFactor: 0.18,
        supplementRatioFactor: 1.0,
        materials: [],
      });
      expect(result.nutritionLabel.per100g.protein).toBe(0);
      expect(result.nutritionLabel.per100g.fat).toBe(0);
      expect(result.nutritionLabel.per100g.carbohydrate).toBe(0);
      expect(result.nutritionLabel.per100g.sodium).toBe(0);
      expect(result.nutritionLabel.energyKj).toBe(0);
      expect(result.materialContributions).toHaveLength(0);
    });

    it('N41: NaN quantity handled gracefully (no throw)', () => {
      const input = singleSuppAnalyze({ protein: 10 }, NaN, 100);
      expect(() => nutritionEngine.analyze(input)).not.toThrow();
    });

    it('N42: Infinity quantity handled gracefully (no throw)', () => {
      const input = singleSuppAnalyze({ protein: 10 }, Infinity, 100);
      expect(() => nutritionEngine.analyze(input)).not.toThrow();
    });
  });
});
