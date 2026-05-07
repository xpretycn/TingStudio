import http from "./http";

// ─── 类型定义 ───

export interface AIModel {
  provider: string;
  name: string;
  model: string;
  description: string;
  supportsVision: boolean;
  configured?: boolean;
}

export interface AIModelList {
  available: AIModel[];
  all: AIModel[];
}

export interface ParsedMaterial {
  name: string;
  quantity: number;
  unit: string;
  ratioFormula?: string;
  ratioDivisor?: number;
  protein?: number | null;
  fat?: number | null;
  carbohydrate?: number | null;
  sodium?: number | null;
  materialId?: string;
  matched?: boolean;
  unitPrice?: number | null;
  confidence?: number;
  fieldConfidence?: { name?: number; quantity?: number; unit?: number };
  missingFields?: string[];
}

export interface ParsedFormula {
  name: string;
  salesmanName?: string;
  formulaDate?: string;
  materials: ParsedMaterial[];
  finishedWeight?: number;
  description?: string;
  confidence?: number;
  fieldConfidence?: { name?: number; salesmanName?: number; materials?: number; finishedWeight?: number };
  missingFields?: string[];
  model?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface MaterialNutritionItem {
  name: string;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
  sodium: number | null;
  materialType?: string;
  unitPrice?: number | null;
  dataSource?: string;
  confidence?: number;
  fieldConfidence?: { protein?: number; fat?: number; carbohydrate?: number; sodium?: number };
  missingFields?: string[];
  isRecorded?: boolean;
  materialId?: string | null;
}

export interface ParsedMaterialNutrition {
  materials: MaterialNutritionItem[];
  confidence?: number;
  missingFields?: string[];
  model?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface SearchResult {
  sql: string;
  originalSQL: string;
  rows: Record<string, any>[];
  rowCount: number;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// ─── API 接口 ───

export const aiApi = {
  /** 获取可用模型列表 */
  getModels() {
    return http.get<any, AIModelList>("/ai/models");
  },

  /** AI 解析配方文件 */
  parseFormula(file: File, provider: string, version?: string, options?: { signal?: AbortSignal }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", provider);
    if (version) formData.append("version", version);
    return http.post<any, ParsedFormula>("/ai/parse-formula", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
      signal: options?.signal,
    });
  },

  /** AI 解析原料营养文件（Excel/PDF/图片） */
  parseMaterial(file: File, provider: string, version?: string, options?: { signal?: AbortSignal }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", provider);
    if (version) formData.append("version", version);
    return http.post<any, ParsedMaterialNutrition>("/ai/parse-material-nutrition", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
      signal: options?.signal,
    });
  },

  /** 自然语言检索 */
  naturalSearch(queryText: string, provider: string, version?: string) {
    return http.post<any, SearchResult>(
      "/ai/natural-search",
      {
        query: queryText,
        model: provider,
        version: version || undefined,
      },
      {
        timeout: 60_000,
      },
    );
  },
};
