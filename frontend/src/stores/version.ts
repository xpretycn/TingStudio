import { defineStore } from 'pinia'
import { ref } from 'vue'
import { versionApi } from '@/api/version'
import type { FormulaVersion, MaterialUpdatesResult, VersionReviewLog, VersionCompareResult } from '@/api/version'

export const useVersionStore = defineStore('version', () => {
  const versions = ref<FormulaVersion[]>([])
  const loading = ref(false)
  const currentVersion = ref<FormulaVersion | null>(null)
  const compareResult = ref<VersionCompareResult | null>(null)
  const materialUpdates = ref<MaterialUpdatesResult | null>(null)
  const reviewLogs = ref<VersionReviewLog[]>([])

  const fetchVersions = async (formulaId: string, params?: { status?: string }) => {
    loading.value = true
    try {
      const res = await versionApi.getList(formulaId, params)
      versions.value = res || []
    } catch (error) {
      console.error('获取版本列表失败:', error)
      versions.value = []
    } finally {
      loading.value = false
    }
  }

  const getVersion = async (versionId: string): Promise<FormulaVersion | null> => {
    try {
      const res = await versionApi.getById(versionId)
      return res
    } catch {
      return null
    }
  }

  const createVersion = async (formulaId: string, data?: { versionName?: string; versionReason?: string; status?: string }) => {
    loading.value = true
    try {
      const res = await versionApi.create(formulaId, data)
      await fetchVersions(formulaId)
      return { success: true, data: res || null }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '创建版本失败', data: null }
    } finally {
      loading.value = false
    }
  }

  const publishVersion = async (versionId: string) => {
    loading.value = true
    try {
      await versionApi.publish(versionId)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '发布失败' }
    } finally {
      loading.value = false
    }
  }

  const compareVersions = async (formulaId: string, versionA: string, versionB: string) => {
    loading.value = true
    try {
      const res = await versionApi.compare(formulaId, versionA, versionB)
      compareResult.value = res || null
      return { success: true, data: res || null }
    } catch (error: unknown) {
      compareResult.value = null
      return { success: false, message: error instanceof Error ? error.message : '版本对比失败' }
    } finally {
      loading.value = false
    }
  }

  const submitVersion = async (versionId: string, data?: { comment?: string }) => {
    loading.value = true
    try {
      await versionApi.submit(versionId, data)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '提交审批失败' }
    } finally {
      loading.value = false
    }
  }

  const approveVersion = async (versionId: string, data?: { comment?: string }) => {
    loading.value = true
    try {
      await versionApi.approve(versionId, data)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '批准失败' }
    } finally {
      loading.value = false
    }
  }

  const rejectVersion = async (versionId: string, comment: string) => {
    loading.value = true
    try {
      await versionApi.reject(versionId, { comment })
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '驳回失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchPendingReviews = async (params?: { page?: number; pageSize?: number; keyword?: string }) => {
    loading.value = true
    try {
      const res = await versionApi.getPendingReview(params)
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '获取待审核列表失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchReviewLogs = async (versionId: string) => {
    try {
      const res = await versionApi.getReviewLogs(versionId)
      reviewLogs.value = Array.isArray(res) ? res : []
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '获取审核日志失败' }
    }
  }

  const fetchMaterialUpdates = async (formulaId: string) => {
    try {
      const res = await versionApi.getMaterialUpdates(formulaId)
      materialUpdates.value = res || null
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '检查原料更新失败' }
    }
  }

  const refreshSnapshot = async (formulaId: string, data?: { materialIds?: string[] }) => {
    loading.value = true
    try {
      const res = await versionApi.refreshSnapshot(formulaId, data)
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '刷新原料数据失败' }
    } finally {
      loading.value = false
    }
  }

  const setCurrentVersion = async (versionId: string) => {
    loading.value = true
    try {
      await versionApi.setCurrentVersion(versionId)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '切换当前版本失败' }
    } finally {
      loading.value = false
    }
  }

  return {
    versions,
    loading,
    currentVersion,
    compareResult,
    materialUpdates,
    reviewLogs,
    fetchVersions,
    getVersion,
    createVersion,
    publishVersion,
    compareVersions,
    submitVersion,
    approveVersion,
    rejectVersion,
    fetchPendingReviews,
    fetchReviewLogs,
    fetchMaterialUpdates,
    refreshSnapshot,
    setCurrentVersion,
  }
})
