export interface MaterialInput {
  name: string;
  type: 'herb' | 'supplement';
  quantity: number;
  nutrition_per_100g: {
    protein?: number;
    fat?: number;
    carbohydrate?: number;
    sodium?: number;
  };
  ratioFactor?: number;
}

export interface FormulaInput {
  finishedWeight: number;
  materials: MaterialInput[];
}

export interface CalculationResult {
  calculation_steps: {
    step1_data_preparation: Record<string, unknown>;
    step2_ratio_calculation: Array<Record<string, unknown>>;
    step3_nutrition_contribution: Record<string, number>;
    step4_atwater_energy: Record<string, unknown>;
    step5_nrv_percentage: Record<string, number>;
    step6_zero_threshold: Array<Record<string, unknown>>;
    step7_final_energy: Record<string, unknown>;
  };
  result: {
    raw_values: Record<string, number>;
    label_values: Record<string, number>;
    nrv_percentages: Record<string, number>;
    per100g: Record<string, number>;
    details: Array<Record<string, unknown>>;
  };
}
