import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { TianApiAdapter, SeedDataAdapter, MockNutritionAdapter } from "./adapters/NutritionAdapters.js";
import { addNutritionSource } from "../nutritionSourceService.js";
import { query } from "../../config/database-adapter.js";

type DbRow = Record<string, unknown>;

interface EnrichResult {
  sourceType: string;
  sourceId: string;
  found: boolean;
  matchScore: number;
  confidence: string;
  sourceDetail: string | null;
  per100g: Record<string, number>;
}

interface EnrichSummary {
  totalAttempted: number;
  totalFound: number;
  totalNotFound: number;
  totalFailed: number;
}

let tianApiAdapter: TianApiAdapter | MockNutritionAdapter | null = null;
const seedDataAdapter = new SeedDataAdapter();

function getTianApiAdapter(): TianApiAdapter | MockNutritionAdapter | null {
  const apiKey = process.env.TIANAPI_KEY;
  if (!apiKey) {
    if (!tianApiAdapter) {
      tianApiAdapter = new MockNutritionAdapter();
      console.log("[AggregateNutritionService] 未配置 TIANAPI_KEY，使用模拟数据适配器");
    }
    return tianApiAdapter;
  }
  if (!tianApiAdapter) {
    tianApiAdapter = new TianApiAdapter(apiKey);
  }
  return tianApiAdapter;
}

function isExternalNutritionEnabled(): boolean {
  return process.env.EXTERNAL_NUTRITION_ENABLED === "true";
}

export async function enrichMaterialNutrition(
  materialId: string,
  materialName: string,
  userId?: string,
  requestedSources?: string[],
): Promise<{
  results: EnrichResult[];
  summary: EnrichSummary;
}> {
  const results: EnrichResult[] = [];
  const summary: EnrichSummary = { totalAttempted: 0, totalFound: 0, totalNotFound: 0, totalFailed: 0 };
  const sources = requestedSources || ["seed", "tianapi"];

  const aliasMap: Record<string, string[]> = {};
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const aliasPath = join(__dirname, "..", "..", "data", "nutrition-seeds", "alias-map.json");
    const raw = readFileSync(aliasPath, "utf-8");
    Object.assign(aliasMap, JSON.parse(raw) as Record<string, string[]>);
  } catch { /* empty */ }

  const searchNames = [materialName, ...(aliasMap[materialName] || [])];

  for (const sourceType of sources) {
    summary.totalAttempted++;

    let result: { source: string; per100g: Record<string, number>; rawName: string; confidence: string; matchScore: number } | null = null;

    try {
      if (sourceType === "seed") {
        result = await seedDataAdapter.search(materialName);
      } else if (sourceType === "tianapi") {
        const adapter = getTianApiAdapter();
        for (const name of searchNames) {
          result = await adapter.search(name);
          if (result) break;
        }
      }
    } catch {
      summary.totalFailed++;
      continue;
    }

    if (!result) {
      summary.totalNotFound++;
      continue;
    }

    const addResult = await addNutritionSource(
      materialId,
      sourceType,
      result.per100g,
      `${sourceType === "tianapi" ? "天行数据" : "种子库"}-${result.rawName}`,
      result.confidence,
      result.matchScore,
      undefined,
      userId,
    );

    results.push({
      sourceType,
      sourceId: addResult.sourceId || "",
      found: true,
      matchScore: result.matchScore,
      confidence: result.confidence,
      sourceDetail: `${sourceType === "tianapi" ? "天行数据" : "种子库"}-${result.rawName}`,
      per100g: result.per100g,
    });
    summary.totalFound++;
  }

  return { results, summary };
}

export async function bulkEnrichNutrition(
  materialIds: string[],
  userId: string,
  requestedSources?: string[],
  overwriteExisting = false,
): Promise<{
  totalProcessed: number;
  totalFound: number;
  totalNotFound: number;
  totalFailed: number;
  results: Array<{ materialId: string; materialName: string; found: boolean; sourcesAdded: number }>;
}> {
  if (!isExternalNutritionEnabled()) {
    throw new Error("外部营养数据功能未启用");
  }

  const ids = materialIds.length > 0 ? materialIds : (
    (await query(`SELECT id FROM materials WHERE is_deleted = 0 OR is_deleted IS NULL`)).rows as DbRow[]
  ).map((r) => r.id as string);

  const totalProcessed = ids.length;
  let totalFound = 0;
  let totalNotFound = 0;
  let totalFailed = 0;
  const results: Array<{ materialId: string; materialName: string; found: boolean; sourcesAdded: number }> = [];

  for (const matId of ids) {
    const mat = (await query(`SELECT id, name FROM materials WHERE id = ?`, [matId])).rows[0] as DbRow | undefined;
    if (!mat) {
      totalFailed++;
      continue;
    }

    if (!overwriteExisting) {
      const existing = (await query(
        `SELECT COUNT(*) as cnt FROM material_nutrition_sources WHERE material_id = ? AND is_active = 1`,
        [matId],
      )).rows[0] as DbRow;
      if ((existing.cnt as number) > 0) {
        results.push({ materialId: matId, materialName: mat.name as string, found: true, sourcesAdded: 0 });
        totalFound++;
        continue;
      }
    }

    try {
      const enrichResult = await enrichMaterialNutrition(matId, mat.name as string, userId, requestedSources);
      const found = enrichResult.summary.totalFound > 0;
      results.push({
        materialId: matId,
        materialName: mat.name as string,
        found,
        sourcesAdded: enrichResult.summary.totalFound,
      });
      if (found) totalFound++;
      else totalNotFound++;
    } catch {
      totalFailed++;
      results.push({ materialId: matId, materialName: mat.name as string, found: false, sourcesAdded: 0 });
    }
  }

  return { totalProcessed, totalFound, totalNotFound, totalFailed, results };
}

export { isExternalNutritionEnabled };
