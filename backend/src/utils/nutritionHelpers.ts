import { safeJsonParse } from "./helpers.js";

const NUTRIENT_KEY_MAP: Record<string, string> = {
  energy_kj: "energy",
  protein_g: "protein",
  fat_g: "fat",
  carbohydrate_g: "carbohydrate",
  dietary_fiber_g: "fiber",
  sugars_g: "sugars",
  sodium_mg: "sodium",
  potassium_mg: "potassium",
  calcium_mg: "calcium",
  iron_mg: "iron",
  zinc_mg: "zinc",
  magnesium_mg: "magnesium",
  phosphorus_mg: "phosphorus",
  vitaminA_ug: "vitaminA",
  vitaminC_mg: "vitaminC",
  vitaminD_ug: "vitaminD",
  vitaminE_mg: "vitaminE",
  vitaminK_ug: "vitaminK",
  vitaminB1_mg: "vitaminB1",
  vitaminB2_mg: "vitaminB2",
  vitaminB3_mg: "vitaminB3",
  vitaminB6_mg: "vitaminB6",
  vitaminB12_ug: "vitaminB12",
  folate_ug: "folate",
  cholesterol_mg: "cholesterol",
  transFat_g: "transFat",
  saturatedFat_g: "saturatedFat",
};

export function normalizeNutrientKey(key: string): string {
  if (NUTRIENT_KEY_MAP[key]) return NUTRIENT_KEY_MAP[key];
  const cleaned = key.replace(/_(mg|g|ug|μg|kj|kcal)$/, "");
  return NUTRIENT_KEY_MAP[cleaned] || key;
}

export function normalizePer100g(raw: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number") {
      result[normalizeNutrientKey(k)] = v;
    }
  }
  if (result.energy == null || isNaN(result.energy)) {
    const protein = result.protein ?? 0;
    const fat = result.fat ?? 0;
    const carbohydrate = result.carbohydrate ?? 0;
    if (protein > 0 || fat > 0 || carbohydrate > 0) {
      result.energy = Math.round((protein * 17 + fat * 37 + carbohydrate * 17) * 100) / 100;
    }
  }
  return result;
}

export function normalizeMaterialName(name: string): string {
  if (!name) return name;
  return name.replace(/[\uFEFF\u200B\u200C\u200D\u00A0\u3000]/g, "").trim();
}

export function parseMaterialsJson(materialsJson: unknown): Array<Record<string, unknown>> {
  let materials = safeJsonParse(materialsJson as string, []);
  if (typeof materials === "string") {
    try {
      materials = JSON.parse(materials);
    } catch {
      materials = [];
    }
  }
  if (!Array.isArray(materials)) materials = [];
  return materials;
}
