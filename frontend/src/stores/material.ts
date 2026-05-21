import { defineStore } from "pinia";
import { ref } from "vue";
import { materialApi } from "@/api/material";
import type { Material, MaterialForm, UpdateResult, MaterialVersion } from "@/api/material";
import { formatTimestamp } from "@/utils/timeFormat";

export const useMaterialStore = defineStore("material", () => {
  const materials = ref<Material[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(8);
  const keyword = ref("");

  const versions = ref<MaterialVersion[]>([]);
  const versionsLoading = ref(false);
  const versionMaterialName = ref("");
  const versionMaterialCode = ref("");
  const versionCurrentVersion = ref(0);

  const fetchMaterials = async () => {
    loading.value = true;
    try {
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

  const updateMaterial = async (id: string, form: Partial<MaterialForm>): Promise<{ success: boolean; message?: string; result?: UpdateResult }> => {
    loading.value = true;
    try {
      const result = await materialApi.update(id, form);
      await fetchMaterials();
      return { success: true, message: undefined, result };
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

  const fetchVersions = async (materialId: string) => {
    versionsLoading.value = true;
    try {
      const res = await materialApi.getVersions(materialId);
      versionMaterialName.value = res.materialName;
      versionMaterialCode.value = res.materialCode;
      versionCurrentVersion.value = res.currentVersion;
      versions.value = res.versions;
    } catch (error) {
      console.error("获取版本历史失败:", error);
    } finally {
      versionsLoading.value = false;
    }
  };

  const setKeyword = (val: string) => {
    keyword.value = val;
    currentPage.value = 1;
  };

  const clearKeyword = () => {
    keyword.value = "";
    currentPage.value = 1;
  };

  const setPage = (page: number) => {
    currentPage.value = page;
  };

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
    clearKeyword,
    setPage,
    versions,
    versionsLoading,
    versionMaterialName,
    versionMaterialCode,
    versionCurrentVersion,
    fetchVersions,
  };
});
