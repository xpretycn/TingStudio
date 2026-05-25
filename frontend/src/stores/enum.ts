import { defineStore } from "pinia";
import { ref } from "vue";
import { enumApi } from "@/api/enum";
import type { EnumOption, EnumCategoryMap } from "@/api/enum";

export const useEnumStore = defineStore("enum", () => {
  const enumMap = ref<EnumCategoryMap>({
    appearance: [],
    taste: [],
    efficacy: [],
  });
  const loaded = ref(false);
  const loading = ref(false);

  const fetchEnums = async (force = false) => {
    if (loaded.value && !force) return enumMap.value;
    loading.value = true;
    try {
      const data = await enumApi.getAll();
      enumMap.value = data;
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

  return {
    enumMap,
    loaded,
    loading,
    fetchEnums,
    getOptionsByCategory,
    getActiveOptionsByCategory,
    createOption,
    updateOption,
    deleteOption,
  };
});
