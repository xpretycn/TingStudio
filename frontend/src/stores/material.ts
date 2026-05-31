import { defineStore } from "pinia";
import { ref } from "vue";
import { materialApi } from "@/api/material";
import type { Material, MaterialForm, UpdateResult, MaterialVersion, MaterialReviewLog } from "@/api/material";

// 缓存有效期：30分钟（毫秒）
const CACHE_DURATION = 30 * 60 * 1000

export const useMaterialStore = defineStore("material", () => {
  const materials = ref<Material[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(8);
  const keyword = ref("");
  const statusFilter = ref<string>("all");
  const reviewLogs = ref<MaterialReviewLog[]>([]);

  // 缓存状态（无需响应式，仅内部逻辑使用）
  let lastFetchTime = 0
  let isCacheValid = false
  let lastQueryKey = ''
  /** 并发锁：防止快速连续调用导致多个并行请求 */
  let pendingFetch: { promise: Promise<void>; queryKey: string } | null = null

  // 计算当前查询条件键值
  const getQueryKey = (): string => `${keyword.value}-${statusFilter.value}-${currentPage.value}-${pageSize.value}`

  // 检查缓存是否有效
  const checkCacheValid = (): boolean => {
    const now = Date.now()
    return isCacheValid &&
           (now - lastFetchTime) < CACHE_DURATION &&
           getQueryKey() === lastQueryKey
  }

  // 失效缓存
  const invalidateCache = (): void => {
    isCacheValid = false
    lastFetchTime = 0
    lastQueryKey = ''
  }

  const versions = ref<MaterialVersion[]>([]);
  const versionsLoading = ref(false);
  const versionMaterialName = ref("");
  const versionMaterialCode = ref("");
  const versionCurrentVersion = ref(0);

  const fetchMaterials = async (forceRefresh = false): Promise<void> => {
    const currentQueryKey = getQueryKey()

    // 缓存有效且非强制刷新则跳过 API
    if (!forceRefresh && checkCacheValid()) {
      return
    }

    // 复用进行中的请求——仅当查询条件相同时，防止并发重复请求
    if (pendingFetch && pendingFetch.queryKey === currentQueryKey && !forceRefresh) {
      return pendingFetch.promise
    }

    loading.value = true;
    const chain = materialApi.getList({
      keyword: keyword.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
      status: statusFilter.value !== "all" ? statusFilter.value : undefined,
    }).then((res) => {
      materials.value = res.list
      total.value = res.pagination.total

      // 更新缓存信息
      lastFetchTime = Date.now()
      isCacheValid = true
      lastQueryKey = currentQueryKey
    }).catch((error: unknown) => {
      console.error("获取原料列表失败:", error);
    }).finally(() => {
      loading.value = false;
      // 仅当此 promise 仍是当前 pending 请求时才清空锁
      if (pendingFetch?.promise === chain) {
        pendingFetch = null
      }
    })

    pendingFetch = { promise: chain, queryKey: currentQueryKey }
    return chain
  };

  // 强制刷新缓存
  const refreshMaterials = async (): Promise<void> => {
    await fetchMaterials(true)
  }

  // 更新单个原料项（用于更新后即时反馈）
  const updateMaterialItem = async (id: string, updatedMaterial?: Material): Promise<void> => {
    if (updatedMaterial) {
      const index = materials.value.findIndex(m => m.id === id)
      if (index !== -1) {
        // 保持原始 ISO 字符串，不移除格式化
        materials.value[index] = { ...updatedMaterial }
      }
    } else {
      try {
        const material = await materialApi.getById(id)
        const index = materials.value.findIndex(m => m.id === id)
        if (index !== -1) {
          materials.value[index] = { ...material }
        }
      } catch (error: unknown) {
        console.error('更新原料缓存失败:', error)
      }
    }
  }

  const getMaterial = async (id: string): Promise<Material | null> => {
    try {
      const res = await materialApi.getById(id);
      return res;
    } catch (error: unknown) {
      return null;
    }
  };

  const createMaterial = async (form: MaterialForm): Promise<{ success: boolean; data?: Material; message?: string }> => {
    loading.value = true;
    try {
      const created = await materialApi.create(form);
      // 失效缓存，下次 fetch 走 API
      invalidateCache()
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
      // 失效缓存，确保下次 fetch 从后端拉最新数据
      invalidateCache()
      // 同时更新本地单项，提供即时反馈（不阻塞当前流程）
      updateMaterialItem(id).catch((err: unknown) => console.error('更新本地单项失败:', err))
      return { success: true, message: undefined, result };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "更新失败" };
    } finally {
      loading.value = false;
    }
  };

  const deleteMaterial = async (id: string): Promise<{ success: boolean; message?: string }> => {
    loading.value = true;
    try {
      await materialApi.delete(id);
      // 失效缓存
      invalidateCache()
      // 从本地数组移除该原料（创建新引用触发 watch）
      materials.value = materials.value.filter(m => m.id !== id)
      total.value = Math.max(0, total.value - 1)
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "删除失败" };
    } finally {
      loading.value = false;
    }
  };

  const fetchVersions = async (materialId: string): Promise<void> => {
    versionsLoading.value = true;
    try {
      const res = await materialApi.getVersions(materialId);
      versionMaterialName.value = res.materialName;
      versionMaterialCode.value = res.materialCode;
      versionCurrentVersion.value = res.currentVersion;
      versions.value = res.versions;
    } catch (error: unknown) {
      console.error("获取版本历史失败:", error);
    } finally {
      versionsLoading.value = false;
    }
  };

  const setKeyword = (val: string): void => {
    keyword.value = val;
    currentPage.value = 1;
  };

  const clearKeyword = (): void => {
    keyword.value = "";
    currentPage.value = 1;
  };

  const setPage = (page: number): void => {
    currentPage.value = page;
  };

  const submitReview = async (id: string, comment?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await materialApi.submitReview(id, comment);
      invalidateCache()
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "提交审批失败" };
    }
  };

  const approveMaterial = async (id: string, comment?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await materialApi.approve(id, comment);
      invalidateCache()
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "审批失败" };
    }
  };

  const rejectMaterial = async (id: string, comment: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await materialApi.reject(id, comment);
      invalidateCache()
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "驳回失败" };
    }
  };

  const publishMaterial = async (id: string, comment?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await materialApi.publish(id, comment);
      invalidateCache()
      return { success: true };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : "发布失败" };
    }
  };

  const fetchReviewLogs = async (id: string): Promise<void> => {
    try {
      const logs = await materialApi.getReviewLogs(id);
      reviewLogs.value = logs;
    } catch (error: unknown) {
      console.error("获取审批日志失败:", error);
      reviewLogs.value = [];
    }
  };

  const setStatusFilter = (val: string): void => {
    statusFilter.value = val;
    currentPage.value = 1;
  };

  const allMaterials = ref<Material[]>([]);
  let allMaterialsLastFetch = 0

  const fetchAllForSelect = async (force = false): Promise<void> => {
    // TTL 缓存：30分钟内已加载且不强制刷新则跳过
    if (!force && allMaterials.value.length > 0 && Date.now() - allMaterialsLastFetch < CACHE_DURATION) {
      return
    }
    loading.value = true;
    try {
      const res = await materialApi.getList({ page: 1, pageSize: 9999, scope: 'all' });
      allMaterials.value = res.list
      allMaterialsLastFetch = Date.now()
    } catch (error: unknown) {
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
    refreshMaterials,
    invalidateCache,
    updateMaterialItem,
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
