import { defineStore } from "pinia";
import { ref } from "vue";
import { aiApi } from "@/api/ai";
import { modelApi, type ModelVersionOption } from "@/api/model";
import type { AIModel, ParsedFormula, ParsedMaterialNutrition, SearchResult } from "@/api/ai";

export const useAiStore = defineStore("ai", () => {
  const models = ref<AIModel[]>([]);
  const allModels = ref<AIModel[]>([]);
  const selectedModel = ref("");
  const selectedVersion = ref("");
  const modelVersions = ref<ModelVersionOption[]>([]);

  // ─── 智能填单（配方） ───
  const parseLoading = ref(false);
  const parseResult = ref<ParsedFormula | null>(null);
  const parseError = ref("");

  // ─── 智能填单（原料营养） ───
  const materialParseLoading = ref(false);
  const materialParseResult = ref<ParsedMaterialNutrition | null>(null);
  const materialParseError = ref("");

  // ─── 智能检索 ───
  const searchLoading = ref(false);
  const searchResult = ref<SearchResult | null>(null);
  const searchError = ref("");
  const searchHistory = ref<string[]>([]);

  /** 加载模型列表 */
  const fetchModels = async () => {
    try {
      const res = await aiApi.getModels();
      models.value = res.available;
      allModels.value = res.all;
      if (!selectedModel.value && res.available.length > 0) {
        selectedModel.value = res.available[0].provider;
      }
    } catch (error: any) {
      console.error("[AI Store] 获取模型列表失败:", error);
    }
  };

  const loadModelVersions = async (provider: string) => {
    try {
      const res = await modelApi.getVersionsByProvider(provider);
      modelVersions.value = res.versions || [];
      selectedVersion.value = res.currentModel || "";
    } catch {
      modelVersions.value = [];
      const model = models.value.find(m => m.provider === provider);
      selectedVersion.value = model?.model || "";
    }
  };

  const getVersionLabel = (versionValue?: string): string => {
    if (!versionValue) return "";
    const found = modelVersions.value.find(v => v.value === versionValue);
    return found ? found.label : versionValue;
  };

  /** AI 解析配方文件 */
  const parseFormula = async (file: File) => {
    if (!selectedModel.value) return;
    parseLoading.value = true;
    parseResult.value = null;
    parseError.value = "";
    try {
      const res = await aiApi.parseFormula(file, selectedModel.value, selectedVersion.value || undefined);
      parseResult.value = res;
    } catch (error: any) {
      parseError.value = error?.response?.data?.message || error.message || "AI 解析失败";
    } finally {
      parseLoading.value = false;
    }
  };

  /** 自然语言检索 */
  const naturalSearch = async (queryText: string) => {
    if (!selectedModel.value || !queryText.trim()) return;
    searchLoading.value = true;
    searchResult.value = null;
    searchError.value = "";
    try {
      const res = await aiApi.naturalSearch(queryText, selectedModel.value, selectedVersion.value || undefined);
      searchResult.value = res;
      // 记录搜索历史（最多保留 10 条）
      const history = [queryText, ...searchHistory.value.filter(h => h !== queryText)];
      searchHistory.value = history.slice(0, 10);
    } catch (error: any) {
      searchError.value = error?.response?.data?.message || error.message || "AI 检索失败";
    } finally {
      searchLoading.value = false;
    }
  };

  /** 清空解析结果 */
  const clearParseResult = () => {
    parseResult.value = null;
    parseError.value = "";
  };

  /** AI 解析原料营养文件（Excel/PDF/图片） */
  const parseMaterial = async (file: File) => {
    if (!selectedModel.value) return;
    materialParseLoading.value = true;
    materialParseResult.value = null;
    materialParseError.value = "";
    try {
      const res = await aiApi.parseMaterial(file, selectedModel.value, selectedVersion.value || undefined);
      materialParseResult.value = res;
    } catch (error: any) {
      materialParseError.value = error?.response?.data?.message || error.message || "AI 解析失败";
    } finally {
      materialParseLoading.value = false;
    }
  };

  /** 清空原料营养解析结果 */
  const clearMaterialParseResult = () => {
    materialParseResult.value = null;
    materialParseError.value = "";
  };

  /** 清空检索结果 */
  const clearSearchResult = () => {
    searchResult.value = null;
    searchError.value = "";
  };

  return {
    models,
    allModels,
    selectedModel,
    selectedVersion,
    modelVersions,
    parseLoading,
    parseResult,
    parseError,
    materialParseLoading,
    materialParseResult,
    materialParseError,
    searchLoading,
    searchResult,
    searchError,
    searchHistory,
    fetchModels,
    loadModelVersions,
    getVersionLabel,
    parseFormula,
    parseMaterial,
    naturalSearch,
    clearParseResult,
    clearMaterialParseResult,
    clearSearchResult,
  };
});
