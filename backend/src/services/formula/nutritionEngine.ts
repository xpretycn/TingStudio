import {
  NRV_REFERENCE,
  ATWATER_COEFFICIENTS,
  ZERO_THRESHOLD,
} from '../../config/nutritionConstants.js';
import type { MaterialInput, FormulaInput, CalculationResult } from '../../types/nutrition.js';

type MaterialType = 'herb' | 'supplement';

class NutritionEngine {

  calculate(formulaInput: FormulaInput): CalculationResult {
    const { finishedWeight, materials } = formulaInput;

    const step1Data = this.prepareData(materials, finishedWeight);
    const step2Ratios = this.calculateRatios(materials, finishedWeight);
    const step3Nutrition = this.aggregateNutrition(materials, step2Ratios);
    const step4Energy = this.calculateAtwaterEnergy(step3Nutrition);
    const step5NRV = this.calculateNRV(step3Nutrition, step4Energy);
    const step6LabelValues = this.applyZeroThreshold(step3Nutrition, step4Energy);
    const step7FinalEnergy = this.recalculateEnergy(step6LabelValues);
    const details = this.buildDetails(materials, step2Ratios);

    return {
      calculation_steps: {
        step1_data_preparation: step1Data,
        step2_ratio_calculation: step2Ratios.map(r => ({
          name: r.name,
          type: r.type,
          quantity: r.quantity,
          ratio_factor: r.ratioFactor,
          calculated_ratio: parseFloat(r.ratio.toFixed(5)),
        })),
        step3_nutrition_contribution: {
          total_protein: parseFloat(step3Nutrition.total_protein.toFixed(4)),
          total_fat: parseFloat(step3Nutrition.total_fat.toFixed(4)),
          total_carbohydrate: parseFloat(step3Nutrition.total_carbohydrate.toFixed(4)),
          total_sodium: Math.round(step3Nutrition.total_sodium),
        },
        step4_atwater_energy: step4Energy,
        step5_nrv_percentage: {
          energy_percent: parseFloat(step5NRV.energy_percent.toFixed(1)),
          protein_percent: parseFloat(step5NRV.protein_percent.toFixed(1)),
          fat_percent: parseFloat(step5NRV.fat_percent.toFixed(1)),
          carbohydrate_percent: parseFloat(step5NRV.carbohydrate_percent.toFixed(1)),
          sodium_percent: parseFloat(step5NRV.sodium_percent.toFixed(1)),
        },
        step6_zero_threshold: this.getThresholdRulesApplied(step3Nutrition, step4Energy),
        step7_final_energy: step7FinalEnergy,
      },

      result: {
        raw_values: {
          weight: finishedWeight,
          energy_kJ: step4Energy.energy_kJ_raw,
          calories: step4Energy.calories_raw,
          protein: parseFloat(step3Nutrition.total_protein.toFixed(1)),
          fat: parseFloat(step3Nutrition.total_fat.toFixed(1)),
          carbohydrate: parseFloat(step3Nutrition.total_carbohydrate.toFixed(1)),
          sodium: Math.round(step3Nutrition.total_sodium),
        },
        label_values: {
          energy_kJ: step7FinalEnergy.final_energy_kJ,
          calories: step7FinalEnergy.final_calories,
          protein: step6LabelValues.protein,
          fat: step6LabelValues.fat,
          carbohydrate: step6LabelValues.carbohydrate,
          sodium: step6LabelValues.sodium,
        },
        nrv_percentages: {
          energy: parseFloat(step5NRV.energy_percent.toFixed(1)),
          protein: parseFloat(step5NRV.protein_percent.toFixed(1)),
          fat: parseFloat(step5NRV.fat_percent.toFixed(1)),
          carbohydrate: parseFloat(step5NRV.carbohydrate_percent.toFixed(1)),
          sodium: parseFloat(step5NRV.sodium_percent.toFixed(1)),
        },
        per100g: this.calculatePer100g(step6LabelValues, step7FinalEnergy, finishedWeight),
        details,
      },
    };
  }

  private prepareData(materials: MaterialInput[], finishedWeight: number) {
    return {
      finished_weight: finishedWeight,
      materials_count: materials.length,
      herb_count: materials.filter(m => m.type === 'herb').length,
      supplement_count: materials.filter(m => m.type === 'supplement').length,
    };
  }

  private calculateRatios(
    materials: MaterialInput[],
    finishedWeight: number
  ): Array<MaterialInput & { ratio: number; ratioFactor: number }> {
    return materials.map(m => {
      const ratioFactor = m.ratioFactor ?? 
        (m.type === 'herb' ? 0.18 : 1.0);
      const ratio = (m.quantity / finishedWeight) * ratioFactor;
      return { ...m, ratioFactor, ratio };
    });
  }

  private aggregateNutrition(
    materials: MaterialInput[],
    ratios: Array<{ ratio: number }>
  ) {
    let total_protein = 0;
    let total_fat = 0;
    let total_carbohydrate = 0;
    let total_sodium = 0;

    materials.forEach((m, i) => {
      const ratio = ratios[i].ratio;
      const nutrition = m.nutrition_per_100g;

      total_protein += (nutrition.protein || 0) * ratio;
      total_fat += (nutrition.fat || 0) * ratio;
      total_carbohydrate += (nutrition.carbohydrate || 0) * ratio;
      total_sodium += (nutrition.sodium || 0) * ratio;
    });

    return { total_protein, total_fat, total_carbohydrate, total_sodium };
  }

  private calculateAtwaterEnergy(nutrition: {
    total_protein: number;
    total_fat: number;
    total_carbohydrate: number;
  }) {
    const { protein_kJ_per_g, fat_kJ_per_g, carb_kJ_per_g, kJ_to_kcal } = ATWATER_COEFFICIENTS;

    const energy_kJ_raw =
      nutrition.total_protein * protein_kJ_per_g +
      nutrition.total_fat * fat_kJ_per_g +
      nutrition.total_carbohydrate * carb_kJ_per_g;

    const calories_raw = Math.round(energy_kJ_raw * kJ_to_kcal);

    return {
      energy_kJ_raw: Math.round(energy_kJ_raw * 100) / 100,
      calories_raw,
      formula_used: `P×${protein_kJ_per_g} + F×${fat_kJ_per_g} + C×${carb_kJ_per_g}`,
    };
  }

  private calculateNRV(nutrition: typeof NRV_REFERENCE, energy: { energy_kJ_raw: number }) {
    return {
      energy_percent: Math.round((energy.energy_kJ_raw / NRV_REFERENCE.energy) * 1000) / 10,
      protein_percent: Math.round((nutrition.total_protein / NRV_REFERENCE.protein) * 1000) / 10,
      fat_percent: Math.round((nutrition.total_fat / NRV_REFERENCE.fat) * 1000) / 10,
      carbohydrate_percent: Math.round((nutrition.total_carbohydrate / NRV_REFERENCE.carbohydrate) * 1000) / 10,
      sodium_percent: Math.round((nutrition.total_sodium / NRV_REFERENCE.sodium) * 1000) / 10,
    };
  }

  private applyZeroThreshold(nutrition: any, energy: any) {
    const { energy_kJ, protein_g, fat_g, carbohydrate_g, sodium_mg } = ZERO_THRESHOLD;

    return {
      protein: nutrition.total_protein <= protein_g ? 0 : Math.round(nutrition.total_protein * 10) / 10,
      fat: nutrition.total_fat <= fat_g ? 0 : Math.round(nutrition.total_fat * 10) / 10,
      carbohydrate: nutrition.total_carbohydrate <= carbohydrate_g ? 0 : Math.round(nutrition.total_carbohydrate * 10) / 10,
      sodium: nutrition.total_sodium <= sodium_mg ? 0 : Math.round(nutrition.total_sodium),
    };
  }

  private recalculateEnergy(labelValues: { protein: number; fat: number; carbohydrate: number }) {
    const { protein_kJ_per_g, fat_kJ_per_g, carb_kJ_per_g, kJ_to_kcal } = ATWATER_COEFFICIENTS;

    const final_energy_kJ = Math.round(
      (labelValues.protein * protein_kJ_per_g +
        labelValues.fat * fat_kJ_per_g +
        labelValues.carbohydrate * carb_kJ_per_g) * 100
    ) / 100;

    return {
      final_energy_kJ,
      final_calories: Math.round(final_energy_kJ * kJ_to_kcal),
      recalculation_note: '基于归零后的宏量营养素重新计算',
    };
  }

  private calculatePer100g(labelValues: any, finalEnergy: any, finishedWeight: number) {
    const factor = 100 / finishedWeight;
    return {
      energy_kJ: Math.round(finalEnergy.final_energy_kJ * factor * 100) / 100,
      calories: Math.round(finalEnergy.final_calories * factor * 10) / 10,
      protein: Math.round(labelValues.protein * factor * 10) / 10,
      fat: Math.round(labelValues.fat * factor * 10) / 10,
      carbohydrate: Math.round(labelValues.carbohydrate * factor * 10) / 10,
      sodium: Math.round(labelValues.sodium * factor),
    };
  }

  private buildDetails(
    materials: MaterialInput[],
    ratios: Array<{ ratio: number }>
  ) {
    return materials.map((m, i) => ({
      name: m.name,
      type: m.type,
      quantity: m.quantity,
      ratio: parseFloat(ratios[i].ratio.toFixed(5)),
      contribution: {
        protein: Math.round((m.nutrition_per_100g.protein || 0) * ratios[i].ratio * 100) / 100,
        fat: Math.round((m.nutrition_per_100g.fat || 0) * ratios[i].ratio * 100) / 100,
        carbohydrate: Math.round((m.nutrition_per_100g.carbohydrate || 0) * ratios[i].ratio * 100) / 100,
        sodium: Math.round((m.nutrition_per_100g.sodium || 0) * ratios[i].ratio),
        energy_kJ: Math.round(
          ((m.nutrition_per_100g.protein || 0) * ATWATER_COEFFICIENTS.protein_kJ_per_g +
            (m.nutrition_per_100g.fat || 0) * ATWATER_COEFFICIENTS.fat_kJ_per_g +
            (m.nutrition_per_100g.carbohydrate || 0) * ATWATER_COEFFICIENTS.carb_kJ_per_g) *
          ratios[i].ratio * 100
        ) / 100,
      },
    }));
  }

  private getThresholdRulesApplied(nutrition: any, energy: any) {
    const rules = [];
    const { energy_kJ, protein_g, fat_g, carbohydrate_g, sodium_mg } = ZERO_THRESHOLD;

    const checks = [
      { nutrient: '能量(kJ)', raw: energy.energy_kJ_raw, threshold: energy_kJ },
      { nutrient: '蛋白质(g)', raw: nutrition.total_protein, threshold: protein_g },
      { nutrient: '脂肪(g)', raw: nutrition.total_fat, threshold: fat_g },
      { nutrient: '碳水化合物(g)', raw: nutrition.total_carbohydrate, threshold: carbohydrate_g },
      { nutrient: '钠(mg)', raw: nutrition.total_sodium, threshold: sodium_mg },
    ];

    for (const check of checks) {
      rules.push({
        nutrient: check.nutrient,
        raw_value: parseFloat(check.raw.toFixed(4)),
        threshold: check.threshold,
        is_zeroed: check.raw <= check.threshold,
        display_value: check.raw <= check.threshold ? 0 : parseFloat(check.raw.toFixed(4)),
      });
    }

    return rules;
  }
}

export const nutritionEngine = new NutritionEngine();
