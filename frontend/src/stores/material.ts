import { defineStore } from "pinia";
import { ref } from "vue";
import { materialApi } from "@/api/material";
import type { Material, MaterialForm } from "@/api/material";
import { formatTimestamp } from "@/utils/timeFormat";

export const useMaterialStore = defineStore("material", () => {
  const materials = ref<Material[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(8);
  const keyword = ref("");

  const fetchMaterials = async () => {
    loading.value = true;
    try {
      console.log("[MaterialStore] fetchMaterials START, keyword=", JSON.stringify(keyword.value));
      const res = await materialApi.getList({
        keyword: keyword.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      });
      materials.value = res.list.map((m: Material) => ({
        ...m,
        createdAt: formatTimestamp(m.createdAt),
        updatedAt: formatTimestamp(m.updatedAt),
      }));
      total.value = res.pagination.total;
    } catch (error) {
      console.error("获取原料列表失败:", error);
    } finally {
      loading.value = false;
    }
  };

  const getMaterial = async (id: string): Promise<Material | null> => {
    try {
      const res = await materialApi.getById(id);
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      return res;
    } catch {
      return null;
    }
  };

  const createMaterial = async (form: MaterialForm) => {
    loading.value = true;
    try {
      const created = await materialApi.create(form);
      await fetchMaterials();
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, message: error.message || "创建失败" };
    } finally {
      loading.value = false;
    }
  };

  const updateMaterial = async (id: string, form: Partial<MaterialForm>) => {
    loading.value = true;
    try {
      await materialApi.update(id, form);
      await fetchMaterials();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || "更新失败" };
    } finally {
      loading.value = false;
    }
  };

  const deleteMaterial = async (id: string) => {
    loading.value = true;
    try {
      await materialApi.delete(id);
      await fetchMaterials();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || "删除失败" };
    } finally {
      loading.value = false;
    }
  };

  const setKeyword = (val: string) => {
    keyword.value = val;
    currentPage.value = 1;
  };

  const setPage = (page: number) => {
    currentPage.value = page;
  };

  /** 获取全部原料（用于下拉选择，不分页） */
  const allMaterials = ref<Material[]>([]);

  const fetchAllForSelect = async () => {
    loading.value = true;
    try {
      const res = await materialApi.getList({ page: 1, pageSize: 9999, scope: 'all' });
      allMaterials.value = res.list.map((m: Material) => ({
        ...m,
        createdAt: formatTimestamp(m.createdAt),
        updatedAt: formatTimestamp(m.updatedAt),
      }));
    } catch (error) {
      console.error("获取全部原料失败:", error);
    } finally {
      loading.value = false;
    }
  };

  return {
    materials,
    allMaterials,
    loading,
    total,
    currentPage,
    pageSize,
    keyword,
    fetchMaterials,
    fetchAllForSelect,
    getMaterial,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    setKeyword,
    setPage,
  };
});
