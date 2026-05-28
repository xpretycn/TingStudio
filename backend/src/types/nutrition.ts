export interface MaterialInput {
  name: string;
  type: "herb" | "supplement";
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

export interface AnalyzeMaterial {
  materialId: string;
  materialName: string;
  materialType: "herb" | "supplement";
  quantity: number;
  per100g: Record<string, number>;
  hasNutritionData: boolean;
}

export interface AnalyzeInput {
  formulaId: string;
  formulaName: string;
  finishedWeight: number;
  ratioFactor: number;
  supplementRatioFactor: number;
  materials: AnalyzeMaterial[];
}

export interface CoverageResult {
  totalMaterials: number;
  withNutrition: number;
  coverageRate: number;
  missingMaterials: Array<{
    materialId: string;
    materialName: string;
    materialType: string;
  }>;
  weightCoverage: number;
  confidenceLevel: "high" | "medium" | "low";
}

export interface NutritionLabelResult {
  per100g: Record<string, number>;
  nrvPercent: Record<string, number>;
  energyKj: number;
  calories: number;
}

export interface MaterialContributionItem {
  materialId: string;
  materialName: string;
  materialType: string;
  quantity: number;
  ratio: number;
  contribution: Record<string, number>;
}

export interface ClaimResult {
  claim: string;
  field: string;
  currentValue: number;
  threshold: number;
  unit: string;
  satisfied: boolean;
  gap: number;
  standard: string;
}

export interface FortificationCheckItem {
  materialId: string;
  materialName: string;
  nutrient: string;
  usageAmountPerKg: number;
  unit: string;
  minAllowed: number;
  maxAllowed: number;
  status: "compliant" | "below_min" | "exceeded" | "not_in_standard";
  standard: string;
}

export interface AnalysisSummary {
  coverageLevel: "good" | "warning" | "poor";
  complianceLevel: "good" | "warning" | "poor";
  claimsCount: number;
  fortificationStatus: "compliant" | "warning" | "non_compliant";
  oneLineSummary: string;
}

export interface NutritionAnalysisResult {
  formulaId: string;
  formulaName: string;
  finishedWeight: number;
  ratioFactor: number;
  supplementRatioFactor: number;
  coverage: CoverageResult;
  nutritionLabel: NutritionLabelResult;
  materialContributions: MaterialContributionItem[];
  claims: ClaimResult[];
  fortificationChecks: FortificationCheckItem[];
  summary: AnalysisSummary;
  calculatedAt: string;
}
