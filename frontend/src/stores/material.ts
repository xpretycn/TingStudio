import { defineStore } from "pinia";
import { ref } from "vue";
import { materialApi } from "@/api/material";
import type { Material, MaterialForm, UpdateResult, MaterialVersion, MaterialReviewLog } from "@/api/material";
import { formatTimestamp } from "@/utils/timeFormat";

export const useMaterialStore = defineStore("material", () => {
  const materials = ref<Material[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(8);
  const keyword = ref("");
  const statusFilter = ref<string>("all");
  const reviewLogs = ref<MaterialReviewLog[]>([]);

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
        status: statusFilter.value !== "all" ? statusFilter.value : undefined,
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "创建失败" };
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "更新失败" };
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "删除失败" };
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

  const submitReview = async (id: string, comment?: string) => {
    try {
      await materialApi.submitReview(id, comment);
      await fetchMaterials();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "提交审批失败" };
    }
  };

  const approveMaterial = async (id: string, comment?: string) => {
    try {
      await materialApi.approve(id, comment);
      await fetchMaterials();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "审批失败" };
    }
  };

  const rejectMaterial = async (id: string, comment: string) => {
    try {
      await materialApi.reject(id, comment);
      await fetchMaterials();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "驳回失败" };
    }
  };

  const publishMaterial = async (id: string, comment?: string) => {
    try {
      await materialApi.publish(id, comment);
      await fetchMaterials();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "发布失败" };
    }
  };

  const fetchReviewLogs = async (id: string) => {
    try {
      const logs = await materialApi.getReviewLogs(id);
      reviewLogs.value = logs;
    } catch (error) {
      console.error("获取审批日志失败:", error);
      reviewLogs.value = [];
    }
  };

  const setStatusFilter = (val: string) => {
    statusFilter.value = val;
    currentPage.value = 1;
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
    statusFilter,
    reviewLogs,
    fetchMaterials,
    fetchAllForSelect,
    getMaterial,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    setKeyword,
    clearKeyword,
    setPage,
    submitReview,
    approveMaterial,
    rejectMaterial,
    publishMaterial,
    fetchReviewLogs,
    setStatusFilter,
    versions,
    versionsLoading,
    versionMaterialName,
    versionMaterialCode,
    versionCurrentVersion,
    fetchVersions,
  };
});
