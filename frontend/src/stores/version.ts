import { defineStore } from 'pinia'
import { ref } from 'vue'
import { versionApi } from '@/api/version'
import type { FormulaVersion } from '@/api/version'

export const useVersionStore = defineStore('version', () => {
  const versions = ref<FormulaVersion[]>([])
  const loading = ref(false)
  const currentVersion = ref<FormulaVersion | null>(null)
  const compareResult = ref<any>(null)

  const fetchVersions = async (formulaId: string, params?: { status?: string }) => {
    loading.value = true
    try {
      const res = await versionApi.getList(formulaId, params)
      versions.value = res.data
    } catch (error) {
      console.error('获取版本列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getVersion = async (versionId: string): Promise<FormulaVersion | null> => {
    try {
      const res = await versionApi.getById(versionId)
      return res.data
    } catch {
      return null
    }
  }

  const createVersion = async (formulaId: string, data?: { versionName?: string; status?: string }) => {
    loading.value = true
    try {
      const res = await versionApi.create(formulaId, data)
      await fetchVersions(formulaId)
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '创建版本失败' }
    } finally {
      loading.value = false
    }
  }

  const publishVersion = async (versionId: string) => {
    loading.value = true
    try {
      await versionApi.publish(versionId)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '发布失败' }
    } finally {
      loading.value = false
    }
  }

  const compareVersions = async (formulaId: string, versionA: string, versionB: string) => {
    loading.value = true
    try {
      const res = await versionApi.compare(formulaId, versionA, versionB)
      compareResult.value = res.data
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '版本对比失败' }
    } finally {
      loading.value = false
    }
  }

  return {
    versions,
    loading,
    currentVersion,
    compareResult,
    fetchVersions,
    getVersion,
    createVersion,
    publishVersion,
    compareVersions,
  }
})
