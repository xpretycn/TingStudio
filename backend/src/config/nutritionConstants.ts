export const NRV_REFERENCE = {
  energy: 8400,
  protein: 60,
  fat: 60,
  carbohydrate: 300,
  sodium: 2000,
} as const;

export const ATWATER_COEFFICIENTS = {
  protein_kJ_per_g: 17,
  fat_kJ_per_g: 37,
  carb_kJ_per_g: 17,
  kJ_to_kcal: 0.239,
} as const;

export const ZERO_THRESHOLD = {
  energy_kJ: 17,
  protein_g: 0.5,
  fat_g: 0.5,
  carbohydrate_g: 0.5,
  sodium_mg: 5,
} as const;

export const DEFAULT_RATIO_FACTORS = {
  herb: 0.18,
  supplement: 1.0,
} as const;

export const RATIO_VALIDATION_THRESHOLDS = {
  normal: { low: 0.98, high: 1.02 },
  warning: { low: 0.95, high: 1.05 },
  highWarning: { low: 0.92, high: 1.08 },
} as const;
