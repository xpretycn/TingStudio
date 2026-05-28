import { defineStore } from "pinia";
import { ref } from "vue";
import { enumApi } from "@/api/enum";
import type { EnumOption, EnumCategoryMap, ExclusionRule } from "@/api/enum";

export const useEnumStore = defineStore("enum", () => {
  const enumMap = ref<EnumCategoryMap>({
    appearance: [],
    taste: [],
    efficacy: [],
  });
  const loaded = ref(false);
  const loading = ref(false);
  const exclusionMap = ref<Map<string, Map<string, Set<string>>>>(new Map());

  const buildExclusionMap = (rules: ExclusionRule[]) => {
    const map = new Map<string, Map<string, Set<string>>>();
    for (const rule of rules) {
      const { category, valueA, valueB } = rule;
      if (!map.has(category)) {
        map.set(category, new Map());
      }
      const categoryMap = map.get(category)!;
      // valueA -> 排除 valueB
      if (!categoryMap.has(valueA)) {
        categoryMap.set(valueA, new Set());
      }
      categoryMap.get(valueA)!.add(valueB);
      // valueB -> 排除 valueA（双向映射）
      if (!categoryMap.has(valueB)) {
        categoryMap.set(valueB, new Set());
      }
      categoryMap.get(valueB)!.add(valueA);
    }
    return map;
  };

  const fetchEnums = async (force = false) => {
    if (loaded.value && !force) return enumMap.value;
    loading.value = true;
    try {
      const data = await enumApi.getAll();
      enumMap.value = data;
      // 同时加载互斥规则
      try {
        const exclusions = await enumApi.getExclusions();
        const allRules = [...(exclusions.appearance || []), ...(exclusions.taste || [])];
        exclusionMap.value = buildExclusionMap(allRules);
      } catch (exclusionError) {
        console.error("获取互斥规则失败:", exclusionError);
        exclusionMap.value = new Map();
      }
      loaded.value = true;
      return data;
    } catch (error) {
      console.error("获取枚举数据失败:", error);
      return enumMap.value;
    } finally {
      loading.value = false;
    }
  };

  const getOptionsByCategory = (category: keyof EnumCategoryMap): EnumOption[] => {
    return enumMap.value[category] || [];
  };

  const getActiveOptionsByCategory = (category: keyof EnumCategoryMap): EnumOption[] => {
    return (enumMap.value[category] || []).filter((o) => o.isActive);
  };

  const createOption = async (data: { category: string; label: string; value: string }) => {
    const result = await enumApi.create(data);
    await fetchEnums(true);
    return result;
  };

  const updateOption = async (id: string, data: Partial<Pick<EnumOption, "label" | "value" | "isActive">>) => {
    const result = await enumApi.update(id, data);
    await fetchEnums(true);
    return result;
  };

  const deleteOption = async (id: string) => {
    const result = await enumApi.delete(id);
    await fetchEnums(true);
    return result;
  };

  const getExcludedValues = (category: string, value: string): Set<string> => {
    const categoryMap = exclusionMap.value.get(category);
    if (!categoryMap) return new Set();
    return categoryMap.get(value) || new Set();
  };

  const fetchExclusions = async () => {
    try {
      const exclusions = await enumApi.getExclusions();
      const allRules = [...(exclusions.appearance || []), ...(exclusions.taste || [])];
      exclusionMap.value = buildExclusionMap(allRules);
    } catch (error) {
      console.error("刷新互斥规则失败:", error);
    }
  };

  return {
    enumMap,
    loaded,
    loading,
    exclusionMap,
    fetchEnums,
    getOptionsByCategory,
    getActiveOptionsByCategory,
    createOption,
    updateOption,
    deleteOption,
    getExcludedValues,
    fetchExclusions,
  };
});
