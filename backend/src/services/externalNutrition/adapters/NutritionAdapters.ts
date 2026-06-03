import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { normalizePer100g } from "../../../utils/nutritionHelpers.js";

export interface ExternalNutritionResult {
  source: string;
  per100g: Record<string, number>;
  rawName: string;
  confidence: "high" | "medium" | "low";
  matchScore: number;
  /** 标准来源名称（如《中国食物成分表》v1.0） */
  dataSource?: string;
  /** 数据版本号 */
  dataVersion?: string;
}

export interface NutritionSourceAdapter {
  name: string;
  search(foodName: string): Promise<ExternalNutritionResult | null>;
}

const TIANAPI_FIELD_MAP: Record<string, string> = {
  rl: "energy",
  dbz: "protein",
  zf: "fat",
  shhf: "carbohydrate",
  ssxw: "fiber",
  la: "sodium",
  gai: "calcium",
  tei: "iron",
  xin: "zinc",
  mei: "magnesium",
  jia: "potassium",
  ling: "phosphorus",
  wsfc: "vitaminC",
  wssa: "vitaminA",
  wsse: "vitaminE",
  las: "vitaminB1",
  su: "vitaminB2",
  ys: "vitaminB3",
};

export class TianApiAdapter implements NutritionSourceAdapter {
  name = "tianapi";
  private apiKey: string;
  private baseUrl = "https://apis.tianapi.com/nutrient/index";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(foodName: string): Promise<ExternalNutritionResult | null> {
    if (!this.apiKey) return null;

    try {
      const url = `${this.baseUrl}?key=${this.apiKey}&mode=0&word=${encodeURIComponent(foodName)}&num=5`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!response.ok) return null;

      const json = await response.json() as Record<string, unknown>;
      if (json.code !== 200 || !json.result) return null;

      const result = json.result as Record<string, unknown>;
      const list = result.list as Array<Record<string, unknown>> | undefined;
      if (!list || list.length === 0) return null;

      const bestMatch = list[0];
      const rawName = (bestMatch.name as string) || foodName;
      const matchScore = this.calculateMatchScore(foodName, rawName);

      const per100g: Record<string, number> = {};
      for (const [apiField, projectField] of Object.entries(TIANAPI_FIELD_MAP)) {
        const value = bestMatch[apiField];
        if (value !== undefined && value !== null && value !== "") {
          const numValue = Number(value);
          if (!isNaN(numValue) && numValue >= 0) {
            per100g[projectField] = projectField === "energy"
              ? Math.round(numValue * 4.184 * 100) / 100
              : Math.round(numValue * 1000) / 1000;
          }
        }
      }

      const normalized = normalizePer100g(per100g);

      return {
        source: "tianapi",
        per100g: normalized,
        rawName,
        confidence: matchScore >= 0.8 ? "medium" : "low",
        matchScore,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[TianApiAdapter] search failed for "${foodName}": ${msg}`);
      return null;
    }
  }

  private calculateMatchScore(query: string, result: string): number {
    const q = query.trim().toLowerCase();
    const r = result.trim().toLowerCase();
    if (q === r) return 1.0;
    if (r.includes(q) || q.includes(r)) return 0.9;
    const maxLen = Math.max(q.length, r.length);
    if (maxLen === 0) return 0;
    let matches = 0;
    for (let i = 0; i < Math.min(q.length, r.length); i++) {
      if (q[i] === r[i]) matches++;
    }
    return Math.round(matches / maxLen * 100) / 100;
  }
}

const MOCK_NUTRITION_DB: Record<string, Record<string, number>> = {
  "阿胶": { energy: 1436, protein: 10.5, fat: 5.0, carbohydrate: 63.1, sodium: 460, calcium: 120, iron: 8.8, zinc: 2.3, potassium: 260, magnesium: 45, phosphorus: 180 },
  "山药": { energy: 234, protein: 1.9, fat: 0.2, carbohydrate: 12.4, fiber: 0.8, sodium: 18, potassium: 213, calcium: 16, iron: 0.3, zinc: 0.27, magnesium: 20, phosphorus: 34, vitaminC: 5 },
  "枸杞": { energy: 1078, protein: 12.4, fat: 3.2, carbohydrate: 46.3, fiber: 7.8, sodium: 252, potassium: 434, calcium: 60, iron: 5.4, zinc: 1.48, magnesium: 96, phosphorus: 209, vitaminA: 1625, vitaminC: 48 },
  "红枣": { energy: 1105, protein: 3.2, fat: 0.5, carbohydrate: 67.8, fiber: 6.2, sodium: 6, potassium: 524, calcium: 64, iron: 2.3, zinc: 0.65, magnesium: 36, phosphorus: 51, vitaminC: 14 },
  "薏米": { energy: 1494, protein: 12.8, fat: 3.3, carbohydrate: 69.1, fiber: 2.0, sodium: 3, potassium: 238, calcium: 42, iron: 3.6, zinc: 1.68, magnesium: 88, phosphorus: 217 },
  "百合": { energy: 1431, protein: 6.7, fat: 0.5, carbohydrate: 77.4, fiber: 1.7, sodium: 4, potassium: 344, calcium: 32, iron: 1.5, zinc: 1.31, magnesium: 42, phosphorus: 92, vitaminC: 8 },
  "莲子": { energy: 1439, protein: 17.2, fat: 1.9, carbohydrate: 64.2, fiber: 3.0, sodium: 5, potassium: 846, calcium: 97, iron: 3.6, zinc: 2.78, magnesium: 242, phosphorus: 550, vitaminC: 5 },
  "蜂蜜": { energy: 1343, protein: 0.4, fat: 1.9, carbohydrate: 75.6, sodium: 26, potassium: 28, calcium: 4, iron: 1.0, zinc: 0.37, magnesium: 2, phosphorus: 3 },
  "银耳": { energy: 837, protein: 10.0, fat: 1.4, carbohydrate: 36.9, fiber: 30.4, sodium: 82, potassium: 1588, calcium: 36, iron: 4.1, zinc: 3.03, magnesium: 54, phosphorus: 287 },
  "决明子": { energy: 1130, protein: 10.6, fat: 3.8, carbohydrate: 35.2, fiber: 18.4, sodium: 8, potassium: 264, calcium: 146, iron: 4.8, zinc: 2.12, magnesium: 128, phosphorus: 245, vitaminA: 35 },
  "肉桂": { energy: 967, protein: 11.7, fat: 2.5, carbohydrate: 49.3, fiber: 39.6, sodium: 26, potassium: 431, calcium: 882, iron: 8.4, zinc: 1.42, magnesium: 60, phosphorus: 99, vitaminK: 15.3 },
  "罗汉果": { energy: 686, protein: 13.4, fat: 0.8, carbohydrate: 27.0, fiber: 38.6, sodium: 12, potassium: 134, calcium: 40, iron: 0.8, zinc: 0.62, magnesium: 22, phosphorus: 50, vitaminC: 5 },
  "蒲公英": { energy: 205, protein: 4.8, fat: 1.1, carbohydrate: 5.0, fiber: 2.1, sodium: 88, potassium: 327, calcium: 216, iron: 4.0, zinc: 0.35, magnesium: 54, phosphorus: 93, vitaminA: 735, vitaminC: 47 },
  "鱼腥草": { energy: 105, protein: 2.1, fat: 0.3, carbohydrate: 3.8, fiber: 1.2, sodium: 5, potassium: 298, calcium: 72, iron: 2.8, zinc: 0.42, magnesium: 23, phosphorus: 38, vitaminC: 21 },
  "陈皮": { energy: 1167, protein: 8.0, fat: 1.4, carbohydrate: 58.3, fiber: 20.7, sodium: 21, potassium: 186, calcium: 82, iron: 3.5, zinc: 0.92, magnesium: 52, phosphorus: 65, vitaminA: 68, vitaminC: 7 },
  "菊花": { energy: 816, protein: 6.4, fat: 3.3, carbohydrate: 35.4, fiber: 15.9, sodium: 36, potassium: 332, calcium: 234, iron: 6.7, zinc: 2.32, magnesium: 104, phosphorus: 145, vitaminA: 42, vitaminC: 19 },
  "黄芪": { energy: 1155, protein: 10.8, fat: 2.4, carbohydrate: 49.2, fiber: 16.2, sodium: 18, potassium: 378, calcium: 146, iron: 7.2, zinc: 2.76, magnesium: 156, phosphorus: 286, vitaminC: 4 },
  "当归": { energy: 1260, protein: 9.6, fat: 4.4, carbohydrate: 52.8, fiber: 18.6, sodium: 24, potassium: 312, calcium: 118, iron: 8.4, zinc: 1.84, magnesium: 84, phosphorus: 198, vitaminB12: 0.8 },
  "党参": { energy: 1092, protein: 8.4, fat: 1.6, carbohydrate: 50.2, fiber: 14.8, sodium: 16, potassium: 296, calcium: 94, iron: 5.6, zinc: 1.52, magnesium: 72, phosphorus: 168, vitaminC: 3 },
  "甘草": { energy: 907, protein: 7.6, fat: 1.2, carbohydrate: 38.4, fiber: 22.6, sodium: 12, potassium: 256, calcium: 168, iron: 4.8, zinc: 1.28, magnesium: 138, phosphorus: 198, vitaminC: 2 },
};

const MOCK_ALIAS_MAP: Record<string, string[]> = {
  "阿胶": ["驴皮胶"],
  "山药": ["薯蓣", "大薯"],
  "枸杞": ["枸杞子", "宁夏枸杞"],
  "红枣": ["大枣", "干枣"],
  "薏米": ["薏苡仁", "苡仁"],
  "百合": ["蒜脑薯"],
  "莲子": ["莲实"],
  "蜂蜜": ["蜜糖"],
  "银耳": ["白木耳"],
  "决明子": ["草决明"],
  "肉桂": ["桂皮", "官桂"],
  "罗汉果": ["拉汗果"],
  "蒲公英": ["黄花地丁"],
  "鱼腥草": ["蕺菜"],
  "陈皮": ["橘皮"],
  "黄芪": ["绵芪"],
  "当归": ["秦归"],
  "党参": ["潞党"],
  "甘草": ["国老"],
};

export class MockNutritionAdapter implements NutritionSourceAdapter {
  name = "tianapi";

  async search(foodName: string): Promise<ExternalNutritionResult | null> {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    const searchNames = [foodName, ...(MOCK_ALIAS_MAP[foodName] || [])];

    for (const name of searchNames) {
      if (MOCK_NUTRITION_DB[name]) {
        const per100g = normalizePer100g(MOCK_NUTRITION_DB[name]);
        const matchScore = name === foodName ? 1.0 : 0.9;
        return {
          source: "tianapi",
          per100g,
          rawName: name,
          confidence: matchScore >= 0.9 ? "medium" : "low",
          matchScore,
        };
      }
    }

    const fallback = this.generateFallback(foodName);
    if (fallback) return fallback;

    return null;
  }

  private generateFallback(foodName: string): ExternalNutritionResult | null {
    const hash = foodName.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const seed = (hash % 1000) / 1000;
    if (seed < 0.3) return null;

    const per100g = normalizePer100g({
      energy: 400 + (hash % 800),
      protein: Math.round((2 + (hash % 15)) * 10) / 10,
      fat: Math.round((0.5 + (hash % 8)) * 10) / 10,
      carbohydrate: Math.round((10 + (hash % 50)) * 10) / 10,
      sodium: 10 + (hash % 300),
      potassium: 100 + (hash % 500),
      calcium: 20 + (hash % 200),
      iron: Math.round((0.5 + (hash % 8)) * 10) / 10,
    });

    return {
      source: "tianapi",
      per100g,
      rawName: foodName,
      confidence: "low",
      matchScore: 0.6,
    };
  }
}

export class SeedDataAdapter implements NutritionSourceAdapter {
  name = "seed";
  private seedData: Array<{
    aliases: string[];
    per100g: Record<string, number>;
    source: string;
    dataVersion: string;
  }> = [];
  private aliasMap: Record<string, string[]> = {};
  private loaded = false;

  private __dirname = dirname(fileURLToPath(import.meta.url));

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const seedPath = join(this.__dirname, "..", "..", "..", "data", "nutrition-seeds", "yao-shi-tong-yuan-seed.json");
      const raw = readFileSync(seedPath, "utf-8");
      this.seedData = JSON.parse(raw) as typeof this.seedData;
    } catch {
      this.seedData = [];
    }

    try {
      const aliasPath = join(this.__dirname, "..", "..", "..", "data", "nutrition-seeds", "alias-map.json");
      const raw = readFileSync(aliasPath, "utf-8");
      this.aliasMap = JSON.parse(raw) as typeof this.aliasMap;
    } catch {
      this.aliasMap = {};
    }

    this.loaded = true;
  }

  async search(foodName: string): Promise<ExternalNutritionResult | null> {
    await this.load();
    if (this.seedData.length === 0) return null;

    const searchNames = [foodName, ...(this.aliasMap[foodName] || [])];

    for (const seed of this.seedData) {
      for (const name of searchNames) {
        if (seed.aliases.some((alias) => alias === name || alias.includes(name) || name.includes(alias))) {
          return {
            source: "seed",
            per100g: normalizePer100g(seed.per100g),
            rawName: seed.aliases[0],
            confidence: "high",
            matchScore: 1.0,
            dataSource: seed.source,
            dataVersion: seed.dataVersion,
          };
        }
      }
    }

    return null;
  }
}
