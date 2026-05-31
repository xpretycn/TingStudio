export const NUTRIENT_FIELDS = [
  "energy",
  "protein",
  "fat",
  "carbohydrate",
  "fiber",
  "sugars",
  "sodium",
  "potassium",
  "calcium",
  "iron",
  "zinc",
  "magnesium",
  "phosphorus",
  "vitaminA",
  "vitaminC",
  "vitaminD",
  "vitaminE",
  "vitaminK",
  "vitaminB1",
  "vitaminB2",
  "vitaminB3",
  "vitaminB6",
  "vitaminB12",
  "folate",
  "cholesterol",
  "transFat",
  "saturatedFat",
] as const;

export type NutrientField = (typeof NUTRIENT_FIELDS)[number];

export const NRV_REFERENCE: Record<string, number> = {
  energy: 8400,
  protein: 60,
  fat: 60,
  carbohydrate: 300,
  fiber: 25,
  sugars: 300,
  sodium: 2000,
  potassium: 2000,
  calcium: 800,
  iron: 15,
  zinc: 15,
  magnesium: 300,
  phosphorus: 700,
  vitaminA: 800,
  vitaminC: 100,
  vitaminD: 5,
  vitaminE: 14,
  vitaminK: 80,
  vitaminB1: 1.4,
  vitaminB2: 1.4,
  vitaminB3: 14,
  vitaminB6: 1.4,
  vitaminB12: 2.4,
  folate: 400,
  cholesterol: 300,
};

export const ATWATER_COEFFICIENTS = {
  protein_kJ_per_g: 17,
  fat_kJ_per_g: 37,
  carb_kJ_per_g: 17,
  kJ_to_kcal: 0.239,
} as const;

export const ZERO_THRESHOLD: Record<string, number> = {
  energy: 17,
  protein: 0.5,
  fat: 0.5,
  carbohydrate: 0.5,
  fiber: 0.5,
  sugars: 0.5,
  sodium: 5,
  cholesterol: 5,
};

export const DEFAULT_RATIO_FACTORS = {
  herb: 0.18,
  supplement: 1.0,
} as const;

export const RATIO_VALIDATION_THRESHOLDS = {
  normal: { low: 0.98, high: 1.02 },
  warning: { low: 0.95, high: 1.05 },
  highWarning: { low: 0.92, high: 1.08 },
} as const;

export const NUTRIENT_META: Record<
  string,
  { name: string; unit: string; decimals: number }
> = {
  energy: { name: "能量", unit: "kJ", decimals: 0 },
  protein: { name: "蛋白质", unit: "g", decimals: 1 },
  fat: { name: "脂肪", unit: "g", decimals: 1 },
  carbohydrate: { name: "碳水化合物", unit: "g", decimals: 1 },
  fiber: { name: "膳食纤维", unit: "g", decimals: 1 },
  sugars: { name: "糖", unit: "g", decimals: 1 },
  sodium: { name: "钠", unit: "mg", decimals: 0 },
  potassium: { name: "钾", unit: "mg", decimals: 0 },
  calcium: { name: "钙", unit: "mg", decimals: 0 },
  iron: { name: "铁", unit: "mg", decimals: 1 },
  zinc: { name: "锌", unit: "mg", decimals: 1 },
  magnesium: { name: "镁", unit: "mg", decimals: 0 },
  phosphorus: { name: "磷", unit: "mg", decimals: 0 },
  vitaminA: { name: "维生素A", unit: "μg", decimals: 0 },
  vitaminC: { name: "维生素C", unit: "mg", decimals: 1 },
  vitaminD: { name: "维生素D", unit: "μg", decimals: 1 },
  vitaminE: { name: "维生素E", unit: "mg", decimals: 1 },
  vitaminK: { name: "维生素K", unit: "μg", decimals: 1 },
  vitaminB1: { name: "维生素B1", unit: "mg", decimals: 2 },
  vitaminB2: { name: "维生素B2", unit: "mg", decimals: 2 },
  vitaminB3: { name: "烟酸", unit: "mg", decimals: 1 },
  vitaminB6: { name: "维生素B6", unit: "mg", decimals: 2 },
  vitaminB12: { name: "维生素B12", unit: "μg", decimals: 1 },
  folate: { name: "叶酸", unit: "μg", decimals: 0 },
  cholesterol: { name: "胆固醇", unit: "mg", decimals: 0 },
  transFat: { name: "反式脂肪", unit: "g", decimals: 1 },
  saturatedFat: { name: "饱和脂肪", unit: "g", decimals: 1 },
};

export const CONTENT_CLAIMS: ReadonlyArray<{
  claim: string;
  field: string;
  operator: "<=" | ">=";
  threshold: number;
  unit: string;
  standard: string;
}> = [
  { claim: "无能量", field: "energy", operator: "<=", threshold: 17, unit: "kJ", standard: "GB 28050" },
  { claim: "低能量", field: "energy", operator: "<=", threshold: 170, unit: "kJ", standard: "GB 28050" },
  { claim: "无蛋白质", field: "protein", operator: "<=", threshold: 0.5, unit: "g", standard: "GB 28050" },
  { claim: "蛋白质来源", field: "protein", operator: ">=", threshold: 5, unit: "%NRV", standard: "GB 28050" },
  { claim: "高蛋白质", field: "protein", operator: ">=", threshold: 10, unit: "%NRV", standard: "GB 28050" },
  { claim: "无脂肪", field: "fat", operator: "<=", threshold: 0.5, unit: "g", standard: "GB 28050" },
  { claim: "低脂肪", field: "fat", operator: "<=", threshold: 3, unit: "g", standard: "GB 28050" },
  { claim: "无饱和脂肪", field: "saturatedFat", operator: "<=", threshold: 0.5, unit: "g", standard: "GB 28050" },
  { claim: "低饱和脂肪", field: "saturatedFat", operator: "<=", threshold: 1.5, unit: "g", standard: "GB 28050" },
  { claim: "无糖", field: "sugars", operator: "<=", threshold: 0.5, unit: "g", standard: "GB 28050" },
  { claim: "低糖", field: "sugars", operator: "<=", threshold: 5, unit: "g", standard: "GB 28050" },
  { claim: "无钠", field: "sodium", operator: "<=", threshold: 5, unit: "mg", standard: "GB 28050" },
  { claim: "极低钠", field: "sodium", operator: "<=", threshold: 40, unit: "mg", standard: "GB 28050" },
  { claim: "低钠", field: "sodium", operator: "<=", threshold: 120, unit: "mg", standard: "GB 28050" },
  { claim: "无胆固醇", field: "cholesterol", operator: "<=", threshold: 5, unit: "mg", standard: "GB 28050" },
  { claim: "低胆固醇", field: "cholesterol", operator: "<=", threshold: 20, unit: "mg", standard: "GB 28050" },
  { claim: "膳食纤维来源", field: "fiber", operator: ">=", threshold: 1.5, unit: "g", standard: "GB 28050" },
  { claim: "高膳食纤维", field: "fiber", operator: ">=", threshold: 3, unit: "g", standard: "GB 28050" },
  { claim: "无反式脂肪", field: "transFat", operator: "<=", threshold: 0.3, unit: "g", standard: "GB 28050" },
];

export const NUTRIENT_LABELS: Record<string, string> = {
  energy: "能量",
  protein: "蛋白质",
  fat: "脂肪",
  carbohydrate: "碳水化合物",
  fiber: "膳食纤维",
  sugars: "糖",
  sodium: "钠",
  potassium: "钾",
  calcium: "钙",
  iron: "铁",
  zinc: "锌",
  magnesium: "镁",
  phosphorus: "磷",
  vitaminA: "维生素A",
  vitaminC: "维生素C",
  vitaminD: "维生素D",
  vitaminE: "维生素E",
  vitaminK: "维生素K",
  vitaminB1: "维生素B1",
  vitaminB2: "维生素B2",
  vitaminB3: "烟酸",
  vitaminB6: "维生素B6",
  vitaminB12: "维生素B12",
  folate: "叶酸",
  cholesterol: "胆固醇",
  transFat: "反式脂肪",
  saturatedFat: "饱和脂肪",
};

export const CORE_NUTRIENT_COLS = ["protein", "fat", "carbohydrate", "sodium"] as const;

export const LABEL_INFO: Record<string, { name: string; unit: string; zeroThreshold: string; tolerance: string }> = {
  energy: { name: "能量", unit: "千焦(kJ)", zeroThreshold: "≤17千焦(kJ)", tolerance: "≤120%标示值" },
  protein: { name: "蛋白质", unit: "克(g)", zeroThreshold: "≤0.5克(g)", tolerance: "≥80%标示值" },
  fat: { name: "脂肪", unit: "克(g)", zeroThreshold: "≤0.5克(g)", tolerance: "≤120%标示值" },
  carbohydrate: { name: "碳水化合物", unit: "克(g)", zeroThreshold: "≤0.5克(g)", tolerance: "≥80%标示值" },
  sodium: { name: "钠", unit: "毫克(mg)", zeroThreshold: "≤5毫克(mg)", tolerance: "≤120%标示值" },
};

export const FORTIFICATION_LIMITS: ReadonlyArray<{
  nutrient: string;
  name: string;
  minPerKg: number;
  maxPerKg: number;
  unit: string;
  standard: string;
}> = [
  { nutrient: "vitaminA", name: "维生素A", minPerKg: 1000, maxPerKg: 3000, unit: "μg/kg", standard: "GB 14880" },
  { nutrient: "vitaminC", name: "维生素C", minPerKg: 100, maxPerKg: 500, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "vitaminD", name: "维生素D", minPerKg: 10, maxPerKg: 40, unit: "μg/kg", standard: "GB 14880" },
  { nutrient: "vitaminE", name: "维生素E", minPerKg: 20, maxPerKg: 100, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "vitaminK", name: "维生素K", minPerKg: 20, maxPerKg: 100, unit: "μg/kg", standard: "GB 14880" },
  { nutrient: "vitaminB1", name: "维生素B1", minPerKg: 2, maxPerKg: 10, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "vitaminB2", name: "维生素B2", minPerKg: 2, maxPerKg: 10, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "vitaminB3", name: "烟酸", minPerKg: 20, maxPerKg: 80, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "vitaminB6", name: "维生素B6", minPerKg: 2, maxPerKg: 10, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "vitaminB12", name: "维生素B12", minPerKg: 3, maxPerKg: 15, unit: "μg/kg", standard: "GB 14880" },
  { nutrient: "folate", name: "叶酸", minPerKg: 400, maxPerKg: 1200, unit: "μg/kg", standard: "GB 14880" },
  { nutrient: "calcium", name: "钙", minPerKg: 2000, maxPerKg: 8000, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "iron", name: "铁", minPerKg: 30, maxPerKg: 100, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "zinc", name: "锌", minPerKg: 30, maxPerKg: 100, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "potassium", name: "钾", minPerKg: 1000, maxPerKg: 3000, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "magnesium", name: "镁", minPerKg: 200, maxPerKg: 800, unit: "mg/kg", standard: "GB 14880" },
  { nutrient: "phosphorus", name: "磷", minPerKg: 500, maxPerKg: 2000, unit: "mg/kg", standard: "GB 14880" },
];
