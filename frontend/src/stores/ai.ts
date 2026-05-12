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
  const parseAborted = ref(false);
  let parseAbortTimer: ReturnType<typeof setTimeout> | null = null;
  let parseRequestId: number = 0;
  let parseAbortController: AbortController | null = null;

  // ─── 智能填单（原料营养） ───
  const materialParseLoading = ref(false);
  const materialParseResult = ref<ParsedMaterialNutrition | null>(null);
  const materialParseError = ref("");
  const materialParseAborted = ref(false);
  let materialAbortTimer: ReturnType<typeof setTimeout> | null = null;
  let materialRequestId: number = 0;
  let materialAbortController: AbortController | null = null;

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

  const switchVersion = async (version: string) => {
    if (!selectedModel.value || !version) return;
    try {
      await modelApi.switchVersion(selectedModel.value, version);
      selectedVersion.value = version;
    } catch (error: any) {
      console.error("[AI Store] 切换模型版本失败:", error);
      throw error;
    }
  };

  /** AI 解析配方文件 */
  const parseFormula = async (file: File) => {
    if (!selectedModel.value) return;

    const currentRequestId = ++parseRequestId;
    parseLoading.value = true;
    parseResult.value = null;
    parseError.value = "";
    parseAborted.value = false;

    if (parseAbortTimer) clearTimeout(parseAbortTimer);
    parseAbortController = new AbortController();

    try {
      const res = await aiApi.parseFormula(file, selectedModel.value, selectedVersion.value || undefined, {
        signal: parseAbortController.signal,
      });

      if (currentRequestId === parseRequestId && !parseAborted.value) {
        parseResult.value = res;
      } else {
        console.log("[AI Store] 配方解析结果已丢弃（请求已过期或被终止）");
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[AI Store] 配方解析请求已被取消");
        return;
      }

      if (currentRequestId === parseRequestId && !parseAborted.value) {
        parseError.value = error?.response?.data?.message || error.message || "AI 解析失败";
      }
    } finally {
      if (currentRequestId === parseRequestId) {
        parseLoading.value = false;
      }
    }
  };

  /** 终止配方解析 */
  const abortParseFormula = () => {
    if (!parseLoading.value && !parseAbortController) return;

    if (parseAbortTimer) clearTimeout(parseAbortTimer);
    if (parseAbortController) {
      parseAbortController.abort();
      parseAbortController = null;
    }

    ++parseRequestId;
    parseAborted.value = true;
    parseError.value = "解析已终止";
    parseResult.value = null;
    parseLoading.value = false;

    console.log("[AI Store] 配方解析已终止，后续结果将被丢弃");

    parseAbortTimer = setTimeout(() => {
      parseAborted.value = false;
      parseError.value = "";
      parseAbortTimer = null;
      console.log("[AI Store] 终止状态已重置");
    }, 2000);
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
      const history = [queryText, ...searchHistory.value.filter(h => h !== queryText)];
      searchHistory.value = history.slice(0, 10);
      return res;
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

    const currentRequestId = ++materialRequestId;
    materialParseLoading.value = true;
    materialParseResult.value = null;
    materialParseError.value = "";
    materialParseAborted.value = false;

    if (materialAbortTimer) clearTimeout(materialAbortTimer);
    materialAbortController = new AbortController();

    try {
      const res = await aiApi.parseMaterial(file, selectedModel.value, selectedVersion.value || undefined, {
        signal: materialAbortController.signal,
      });

      if (currentRequestId === materialRequestId && !materialParseAborted.value) {
        materialParseResult.value = res;
      } else {
        console.log("[AI Store] 原料解析结果已丢弃（请求已过期或被终止）");
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[AI Store] 原料解析请求已被取消");
        return;
      }

      if (currentRequestId === materialRequestId && !materialParseAborted.value) {
        materialParseError.value = error?.response?.data?.message || error.message || "AI 解析失败";
      }
    } finally {
      if (currentRequestId === materialRequestId) {
        materialParseLoading.value = false;
      }
    }
  };

  /** 终止原料解析 */
  const abortParseMaterial = () => {
    if (!materialParseLoading.value && !materialAbortController) return;

    if (materialAbortTimer) clearTimeout(materialAbortTimer);
    if (materialAbortController) {
      materialAbortController.abort();
      materialAbortController = null;
    }

    ++materialRequestId;
    materialParseAborted.value = true;
    materialParseError.value = "解析已终止";
    materialParseResult.value = null;
    materialParseLoading.value = false;

    console.log("[AI Store] 原料解析已终止，后续结果将被丢弃");

    materialAbortTimer = setTimeout(() => {
      materialParseAborted.value = false;
      materialParseError.value = "";
      materialAbortTimer = null;
      console.log("[AI Store] 终止状态已重置");
    }, 2000);
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
    parseAborted,
    materialParseLoading,
    materialParseResult,
    materialParseError,
    materialParseAborted,
    searchLoading,
    searchResult,
    searchError,
    searchHistory,
    fetchModels,
    loadModelVersions,
    getVersionLabel,
    switchVersion,
    parseFormula,
    abortParseFormula,
    parseMaterial,
    abortParseMaterial,
    naturalSearch,
    clearParseResult,
    clearMaterialParseResult,
    clearSearchResult,
  };
});
