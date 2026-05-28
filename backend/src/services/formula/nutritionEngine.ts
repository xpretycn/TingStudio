import {
  NRV_REFERENCE,
  ATWATER_COEFFICIENTS,
  ZERO_THRESHOLD,
  CONTENT_CLAIMS,
  FORTIFICATION_LIMITS,
  NUTRIENT_META,
  NUTRIENT_FIELDS,
} from "../../config/nutritionConstants.js";
import type {
  MaterialInput,
  FormulaInput,
  CalculationResult,
  AnalyzeInput,
  AnalyzeMaterial,
  NutritionAnalysisResult,
  CoverageResult,
  NutritionLabelResult,
  MaterialContributionItem,
  ClaimResult,
  FortificationCheckItem,
  AnalysisSummary,
} from "../../types/nutrition.js";

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
        step2_ratio_calculation: step2Ratios.map((r) => ({
          name: r.name,
          type: r.type,
          quantity: r.quantity,
          ratio_factor: r.ratioFactor,
          calculated_ratio: parseFloat(r.ratio.toFixed(5)),
        })),
        step3_nutrition_contribution: {
          total_protein: parseFloat(step3Nutrition.total_protein.toFixed(4)),
          total_fat: parseFloat(step3Nutrition.total_fat.toFixed(4)),
          total_carbohydrate: parseFloat(
            step3Nutrition.total_carbohydrate.toFixed(4)
          ),
          total_sodium: Math.round(step3Nutrition.total_sodium),
        },
        step4_atwater_energy: step4Energy,
        step5_nrv_percentage: {
          energy_percent: parseFloat(step5NRV.energy_percent.toFixed(1)),
          protein_percent: parseFloat(step5NRV.protein_percent.toFixed(1)),
          fat_percent: parseFloat(step5NRV.fat_percent.toFixed(1)),
          carbohydrate_percent: parseFloat(
            step5NRV.carbohydrate_percent.toFixed(1)
          ),
          sodium_percent: parseFloat(step5NRV.sodium_percent.toFixed(1)),
        },
        step6_zero_threshold: this.getThresholdRulesApplied(
          step3Nutrition,
          step4Energy
        ),
        step7_final_energy: step7FinalEnergy,
      },

      result: {
        raw_values: {
          weight: finishedWeight,
          energy_kJ: step4Energy.energy_kJ_raw,
          calories: step4Energy.calories_raw,
          protein: parseFloat(step3Nutrition.total_protein.toFixed(1)),
          fat: parseFloat(step3Nutrition.total_fat.toFixed(1)),
          carbohydrate: parseFloat(
            step3Nutrition.total_carbohydrate.toFixed(1)
          ),
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
          carbohydrate: parseFloat(
            step5NRV.carbohydrate_percent.toFixed(1)
          ),
          sodium: parseFloat(step5NRV.sodium_percent.toFixed(1)),
        },
        per100g: this.calculatePer100g(
          step6LabelValues,
          step7FinalEnergy,
          finishedWeight
        ),
        details,
      },
    };
  }

  analyze(input: AnalyzeInput): NutritionAnalysisResult {
    const {
      formulaId,
      formulaName,
      finishedWeight,
      ratioFactor,
      supplementRatioFactor,
      materials,
    } = input;

    const coverage = this.calculateCoverage(materials, finishedWeight);

    const contributions = this.computeAllContributions(
      materials,
      finishedWeight,
      ratioFactor,
      supplementRatioFactor
    );

    const totals = this.sumContributions(contributions);

    const rawEnergy = this.computeEnergyFromMacros(totals);

    const labelValues = this.applyAllZeroThresholds(totals, rawEnergy);

    const finalEnergy = this.computeEnergyFromMacros(labelValues);

    const nrvPercent = this.computeAllNRV(labelValues, finalEnergy);

    const per100g = this.computePer100g(labelValues, finalEnergy, finishedWeight);

    const nutritionLabel: NutritionLabelResult = {
      per100g,
      nrvPercent,
      energyKj: finalEnergy.energy,
      calories: Math.round(finalEnergy.energy * ATWATER_COEFFICIENTS.kJ_to_kcal),
    };

    const materialContributions: MaterialContributionItem[] = contributions.map(
      (c) => ({
        materialId: c.materialId,
        materialName: c.materialName,
        materialType: c.materialType,
        quantity: c.quantity,
        ratio: c.ratio,
        contribution: c.contribution,
      })
    );

    const claims = this.evaluateClaims(per100g, nrvPercent);

    const fortificationChecks = this.checkFortification(
      materials,
      finishedWeight
    );

    const summary = this.buildSummary(
      coverage,
      nrvPercent,
      claims,
      fortificationChecks
    );

    return {
      formulaId,
      formulaName,
      finishedWeight,
      ratioFactor,
      supplementRatioFactor,
      coverage,
      nutritionLabel,
      materialContributions,
      claims,
      fortificationChecks,
      summary,
      calculatedAt: new Date().toISOString(),
    };
  }

  evaluateClaims(
    per100g: Record<string, number>,
    nrvPercent: Record<string, number>
  ): ClaimResult[] {
    const results: ClaimResult[] = [];

    for (const claimDef of CONTENT_CLAIMS) {
      let currentValue: number;
      if (claimDef.unit === "%NRV") {
        currentValue = nrvPercent[claimDef.field] ?? 0;
      } else {
        currentValue = per100g[claimDef.field] ?? 0;
      }

      const satisfied =
        claimDef.operator === "<="
          ? currentValue <= claimDef.threshold
          : currentValue >= claimDef.threshold;

      let gap: number;
      if (satisfied) {
        gap =
          claimDef.operator === "<="
            ? claimDef.threshold - currentValue
            : currentValue - claimDef.threshold;
      } else {
        gap =
          claimDef.operator === "<="
            ? currentValue - claimDef.threshold
            : claimDef.threshold - currentValue;
      }

      results.push({
        claim: claimDef.claim,
        field: claimDef.field,
        currentValue: Math.round(currentValue * 1000) / 1000,
        threshold: claimDef.threshold,
        unit: claimDef.unit,
        satisfied,
        gap: Math.round(gap * 1000) / 1000,
        standard: claimDef.standard,
      });
    }

    return results;
  }

  checkFortification(
    materials: AnalyzeMaterial[],
    finishedWeight: number
  ): FortificationCheckItem[] {
    const results: FortificationCheckItem[] = [];
    const supplements = materials.filter(
      (m) => m.materialType === "supplement"
    );

    for (const supplement of supplements) {
      const usageAmountPerKg =
        finishedWeight > 0
          ? (supplement.quantity / finishedWeight) * 1000000
          : 0;

      for (const limit of FORTIFICATION_LIMITS) {
        const nutrientValue = supplement.per100g[limit.nutrient];
        if (nutrientValue === undefined || nutrientValue === null || nutrientValue <= 0) {
          continue;
        }

        let status: FortificationCheckItem["status"];
        if (usageAmountPerKg < limit.minPerKg) {
          status = "below_min";
        } else if (usageAmountPerKg > limit.maxPerKg) {
          status = "exceeded";
        } else {
          status = "compliant";
        }

        results.push({
          materialId: supplement.materialId,
          materialName: supplement.materialName,
          nutrient: limit.nutrient,
          usageAmountPerKg: Math.round(usageAmountPerKg * 100) / 100,
          unit: limit.unit,
          minAllowed: limit.minPerKg,
          maxAllowed: limit.maxPerKg,
          status,
          standard: limit.standard,
        });
      }
    }

    return results;
  }

  calculateCoverage(
    materials: AnalyzeMaterial[],
    finishedWeight: number
  ): CoverageResult {
    const totalMaterials = materials.length;
    const withNutrition = materials.filter((m) => m.hasNutritionData).length;
    const coverageRate =
      totalMaterials > 0 ? withNutrition / totalMaterials : 0;

    const missingMaterials = materials
      .filter((m) => !m.hasNutritionData)
      .map((m) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        materialType: m.materialType,
      }));

    const totalQuantity = materials.reduce((sum, m) => sum + m.quantity, 0);
    const nutritionQuantity = materials
      .filter((m) => m.hasNutritionData)
      .reduce((sum, m) => sum + m.quantity, 0);
    const weightCoverage =
      totalQuantity > 0 ? nutritionQuantity / totalQuantity : 0;

    let confidenceLevel: CoverageResult["confidenceLevel"];
    if (coverageRate >= 0.9) {
      confidenceLevel = "high";
    } else if (coverageRate >= 0.7) {
      confidenceLevel = "medium";
    } else {
      confidenceLevel = "low";
    }

    return {
      totalMaterials,
      withNutrition,
      coverageRate: Math.round(coverageRate * 10000) / 10000,
      missingMaterials,
      weightCoverage: Math.round(weightCoverage * 10000) / 10000,
      confidenceLevel,
    };
  }

  private computeAllContributions(
    materials: AnalyzeMaterial[],
    finishedWeight: number,
    ratioFactor: number,
    supplementRatioFactor: number
  ): Array<{
    materialId: string;
    materialName: string;
    materialType: string;
    quantity: number;
    ratio: number;
    contribution: Record<string, number>;
  }> {
    return materials.map((m) => {
      const effectiveRatioFactor =
        m.materialType === "supplement" ? supplementRatioFactor : ratioFactor;
      const ratio =
        finishedWeight > 0
          ? (m.quantity / finishedWeight) * effectiveRatioFactor
          : 0;

      const contribution: Record<string, number> = {};
      for (const field of NUTRIENT_FIELDS) {
        if (field === "energy") continue;
        const val = m.per100g[field] ?? 0;
        contribution[field] = val * ratio;
      }

      return {
        materialId: m.materialId,
        materialName: m.materialName,
        materialType: m.materialType,
        quantity: m.quantity,
        ratio: Math.round(ratio * 100000) / 100000,
        contribution,
      };
    });
  }

  private sumContributions(
    contributions: Array<{ contribution: Record<string, number> }>
  ): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const field of NUTRIENT_FIELDS) {
      if (field === "energy") continue;
      totals[field] = 0;
    }
    for (const c of contributions) {
      for (const field of NUTRIENT_FIELDS) {
        if (field === "energy") continue;
        totals[field] += c.contribution[field] ?? 0;
      }
    }
    return totals;
  }

  private computeEnergyFromMacros(
    values: Record<string, number>
  ): Record<string, number> & { energy: number } {
    const energy =
      (values.protein ?? 0) * ATWATER_COEFFICIENTS.protein_kJ_per_g +
      (values.fat ?? 0) * ATWATER_COEFFICIENTS.fat_kJ_per_g +
      (values.carbohydrate ?? 0) * ATWATER_COEFFICIENTS.carb_kJ_per_g;
    return { ...values, energy: Math.round(energy * 100) / 100 };
  }

  private applyAllZeroThresholds(
    totals: Record<string, number>,
    rawEnergy: Record<string, number> & { energy: number }
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const field of NUTRIENT_FIELDS) {
      if (field === "energy") {
        result[field] = rawEnergy.energy;
        continue;
      }

      const value = totals[field] ?? 0;
      const threshold = ZERO_THRESHOLD[field];

      if (threshold !== undefined && Math.abs(value) <= threshold) {
        result[field] = 0;
      } else {
        const meta = NUTRIENT_META[field];
        const decimals = meta ? meta.decimals : 2;
        const factor = Math.pow(10, decimals);
        result[field] = Math.round(value * factor) / factor;
      }
    }

    return result;
  }

  private computeAllNRV(
    labelValues: Record<string, number>,
    finalEnergy: Record<string, number> & { energy: number }
  ): Record<string, number> {
    const nrvPercent: Record<string, number> = {};

    for (const field of NUTRIENT_FIELDS) {
      const nrv = NRV_REFERENCE[field];
      if (nrv === undefined) {
        nrvPercent[field] = 0;
        continue;
      }

      const value =
        field === "energy" ? finalEnergy.energy : (labelValues[field] ?? 0);
      nrvPercent[field] =
        nrv > 0
          ? Math.round((value / nrv) * 1000) / 10
          : 0;
    }

    return nrvPercent;
  }

  private computePer100g(
    labelValues: Record<string, number>,
    finalEnergy: Record<string, number> & { energy: number },
    finishedWeight: number
  ): Record<string, number> {
    const factor = 100 / finishedWeight;
    const per100g: Record<string, number> = {};

    for (const field of NUTRIENT_FIELDS) {
      const value =
        field === "energy" ? finalEnergy.energy : (labelValues[field] ?? 0);
      const meta = NUTRIENT_META[field];
      const decimals = meta ? meta.decimals : 2;
      const roundFactor = Math.pow(10, decimals);
      per100g[field] = Math.round(value * factor * roundFactor) / roundFactor;
    }

    return per100g;
  }

  private buildSummary(
    coverage: CoverageResult,
    nrvPercent: Record<string, number>,
    claims: ClaimResult[],
    fortificationChecks: FortificationCheckItem[]
  ): AnalysisSummary {
    let coverageLevel: AnalysisSummary["coverageLevel"];
    if (coverage.coverageRate >= 0.9) {
      coverageLevel = "good";
    } else if (coverage.coverageRate >= 0.7) {
      coverageLevel = "warning";
    } else {
      coverageLevel = "poor";
    }

    const coreFields = ["protein", "fat", "carbohydrate", "sodium"];
    let poorCount = 0;
    let warningCount = 0;
    for (const field of coreFields) {
      const pct = nrvPercent[field] ?? 0;
      if (pct < 5 || pct > 50) {
        poorCount++;
      } else if (pct < 10 || pct > 30) {
        warningCount++;
      }
    }

    let complianceLevel: AnalysisSummary["complianceLevel"];
    if (poorCount > 0) {
      complianceLevel = "poor";
    } else if (warningCount > 0) {
      complianceLevel = "warning";
    } else {
      complianceLevel = "good";
    }

    const claimsCount = claims.filter((c) => c.satisfied).length;

    let fortificationStatus: AnalysisSummary["fortificationStatus"];
    const hasExceeded = fortificationChecks.some(
      (f) => f.status === "exceeded"
    );
    const hasBelowMin = fortificationChecks.some(
      (f) => f.status === "below_min"
    );
    if (hasExceeded) {
      fortificationStatus = "non_compliant";
    } else if (hasBelowMin) {
      fortificationStatus = "warning";
    } else if (fortificationChecks.length > 0) {
      fortificationStatus = "compliant";
    } else {
      fortificationStatus = "compliant";
    }

    const parts: string[] = [];
    if (coverageLevel === "good") {
      parts.push("数据覆盖良好");
    } else if (coverageLevel === "warning") {
      parts.push("数据覆盖一般");
    } else {
      parts.push("数据覆盖不足");
    }

    if (complianceLevel === "good") {
      parts.push("核心营养素NRV%合理");
    } else if (complianceLevel === "warning") {
      parts.push("部分核心营养素NRV%偏离");
    } else {
      parts.push("核心营养素NRV%严重偏离");
    }

    if (claimsCount > 0) {
      parts.push(`满足${claimsCount}项含量声称`);
    }

    if (fortificationChecks.length > 0) {
      if (fortificationStatus === "compliant") {
        parts.push("强化剂合规");
      } else if (fortificationStatus === "warning") {
        parts.push("强化剂用量偏低");
      } else {
        parts.push("强化剂超标");
      }
    }

    const oneLineSummary = parts.join("，");

    return {
      coverageLevel,
      complianceLevel,
      claimsCount,
      fortificationStatus,
      oneLineSummary,
    };
  }

  private prepareData(
    materials: MaterialInput[],
    finishedWeight: number
  ) {
    return {
      finished_weight: finishedWeight,
      materials_count: materials.length,
      herb_count: materials.filter((m) => m.type === "herb").length,
      supplement_count: materials.filter((m) => m.type === "supplement")
        .length,
    };
  }

  private calculateRatios(
    materials: MaterialInput[],
    finishedWeight: number
  ): Array<MaterialInput & { ratio: number; ratioFactor: number }> {
    return materials.map((m) => {
      const ratioFactor =
        m.ratioFactor ?? (m.type === "herb" ? 0.18 : 1.0);
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
    const {
      protein_kJ_per_g,
      fat_kJ_per_g,
      carb_kJ_per_g,
      kJ_to_kcal,
    } = ATWATER_COEFFICIENTS;

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

  private calculateNRV(
    nutrition: {
      total_protein: number;
      total_fat: number;
      total_carbohydrate: number;
      total_sodium: number;
    },
    energy: { energy_kJ_raw: number }
  ) {
    return {
      energy_percent:
        Math.round((energy.energy_kJ_raw / NRV_REFERENCE.energy) * 1000) / 10,
      protein_percent:
        Math.round((nutrition.total_protein / NRV_REFERENCE.protein) * 1000) /
        10,
      fat_percent:
        Math.round((nutrition.total_fat / NRV_REFERENCE.fat) * 1000) / 10,
      carbohydrate_percent:
        Math.round(
          (nutrition.total_carbohydrate / NRV_REFERENCE.carbohydrate) * 1000
        ) / 10,
      sodium_percent:
        Math.round((nutrition.total_sodium / NRV_REFERENCE.sodium) * 1000) /
        10,
    };
  }

  private applyZeroThreshold(
    nutrition: {
      total_protein: number;
      total_fat: number;
      total_carbohydrate: number;
      total_sodium: number;
    },
    _energy: Record<string, unknown>
  ) {
    const {
      protein_g,
      fat_g,
      carbohydrate_g,
      sodium_mg,
    } = {
      protein_g: ZERO_THRESHOLD.protein,
      fat_g: ZERO_THRESHOLD.fat,
      carbohydrate_g: ZERO_THRESHOLD.carbohydrate,
      sodium_mg: ZERO_THRESHOLD.sodium,
    };

    return {
      protein:
        nutrition.total_protein <= protein_g
          ? 0
          : Math.round(nutrition.total_protein * 10) / 10,
      fat:
        nutrition.total_fat <= fat_g
          ? 0
          : Math.round(nutrition.total_fat * 10) / 10,
      carbohydrate:
        nutrition.total_carbohydrate <= carbohydrate_g
          ? 0
          : Math.round(nutrition.total_carbohydrate * 10) / 10,
      sodium:
        nutrition.total_sodium <= sodium_mg
          ? 0
          : Math.round(nutrition.total_sodium),
    };
  }

  private recalculateEnergy(labelValues: {
    protein: number;
    fat: number;
    carbohydrate: number;
  }) {
    const {
      protein_kJ_per_g,
      fat_kJ_per_g,
      carb_kJ_per_g,
      kJ_to_kcal,
    } = ATWATER_COEFFICIENTS;

    const final_energy_kJ =
      Math.round(
        (labelValues.protein * protein_kJ_per_g +
          labelValues.fat * fat_kJ_per_g +
          labelValues.carbohydrate * carb_kJ_per_g) *
          100
      ) / 100;

    return {
      final_energy_kJ,
      final_calories: Math.round(final_energy_kJ * kJ_to_kcal),
      recalculation_note: "基于归零后的宏量营养素重新计算",
    };
  }

  private calculatePer100g(
    labelValues: { protein: number; fat: number; carbohydrate: number; sodium: number },
    finalEnergy: { final_energy_kJ: number; final_calories: number },
    finishedWeight: number
  ) {
    const factor = 100 / finishedWeight;
    return {
      energy_kJ:
        Math.round(finalEnergy.final_energy_kJ * factor * 100) / 100,
      calories:
        Math.round(finalEnergy.final_calories * factor * 10) / 10,
      protein:
        Math.round(labelValues.protein * factor * 10) / 10,
      fat: Math.round(labelValues.fat * factor * 10) / 10,
      carbohydrate:
        Math.round(labelValues.carbohydrate * factor * 10) / 10,
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
        protein:
          Math.round(
            (m.nutrition_per_100g.protein || 0) * ratios[i].ratio * 100
          ) / 100,
        fat:
          Math.round(
            (m.nutrition_per_100g.fat || 0) * ratios[i].ratio * 100
          ) / 100,
        carbohydrate:
          Math.round(
            (m.nutrition_per_100g.carbohydrate || 0) * ratios[i].ratio * 100
          ) / 100,
        sodium: Math.round(
          (m.nutrition_per_100g.sodium || 0) * ratios[i].ratio
        ),
        energy_kJ:
          Math.round(
            ((m.nutrition_per_100g.protein || 0) *
              ATWATER_COEFFICIENTS.protein_kJ_per_g +
              (m.nutrition_per_100g.fat || 0) *
                ATWATER_COEFFICIENTS.fat_kJ_per_g +
              (m.nutrition_per_100g.carbohydrate || 0) *
                ATWATER_COEFFICIENTS.carb_kJ_per_g) *
              ratios[i].ratio *
              100
          ) / 100,
      },
    }));
  }

  private getThresholdRulesApplied(
    nutrition: {
      total_protein: number;
      total_fat: number;
      total_carbohydrate: number;
      total_sodium: number;
    },
    energy: { energy_kJ_raw: number }
  ) {
    const rules = [];
    const {
      energy_kJ,
      protein_g,
      fat_g,
      carbohydrate_g,
      sodium_mg,
    } = {
      energy_kJ: ZERO_THRESHOLD.energy,
      protein_g: ZERO_THRESHOLD.protein,
      fat_g: ZERO_THRESHOLD.fat,
      carbohydrate_g: ZERO_THRESHOLD.carbohydrate,
      sodium_mg: ZERO_THRESHOLD.sodium,
    };

    const checks = [
      {
        nutrient: "能量(kJ)",
        raw: energy.energy_kJ_raw,
        threshold: energy_kJ,
      },
      {
        nutrient: "蛋白质(g)",
        raw: nutrition.total_protein,
        threshold: protein_g,
      },
      {
        nutrient: "脂肪(g)",
        raw: nutrition.total_fat,
        threshold: fat_g,
      },
      {
        nutrient: "碳水化合物(g)",
        raw: nutrition.total_carbohydrate,
        threshold: carbohydrate_g,
      },
      {
        nutrient: "钠(mg)",
        raw: nutrition.total_sodium,
        threshold: sodium_mg,
      },
    ];

    for (const check of checks) {
      rules.push({
        nutrient: check.nutrient,
        raw_value: parseFloat(check.raw.toFixed(4)),
        threshold: check.threshold,
        is_zeroed: check.raw <= check.threshold,
        display_value:
          check.raw <= check.threshold ? 0 : parseFloat(check.raw.toFixed(4)),
      });
    }

    return rules;
  }
}

export const nutritionEngine = new NutritionEngine();
