import { defineStore } from 'pinia'
import { ref } from 'vue'
import { exportApi } from '@/api/export'
import type { ExportTemplate, ExportJob } from '@/api/export'

export const useExportStore = defineStore('export', () => {
  const templates = ref<ExportTemplate[]>([])
  const jobs = ref<ExportJob[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  const fetchTemplates = async (params?: { type?: string }) => {
    loading.value = true
    try {
      const res = await exportApi.getTemplates(params)
      templates.value = res.data
    } catch (error) {
      console.error('获取导出模板失败:', error)
    } finally {
      loading.value = false
    }
  }

  const createTemplate = async (data: { name: string; description?: string; type: string; formatConfig: any; isDefault?: boolean }) => {
    try {
      await exportApi.createTemplate(data)
      await fetchTemplates()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '创建模板失败' }
    }
  }

  const createJob = async (data: { formulaId: string; versionId?: string; templateId?: string; exportType: string }) => {
    loading.value = true
    try {
      const res = await exportApi.createJob(data)
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '创建导出任务失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchJobs = async (params?: { status?: string; page?: number; pageSize?: number }) => {
    loading.value = true
    try {
      const res = await exportApi.getJobs(params)
      jobs.value = res.data.list
      total.value = res.data.pagination.total
    } catch (error) {
      console.error('获取导出任务失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getJob = async (jobId: string): Promise<ExportJob | null> => {
    try {
      const res = await exportApi.getJob(jobId)
      return res.data
    } catch {
      return null
    }
  }

  const createShare = async (data: { formulaId: string; versionId?: string; shareType?: string; password?: string; expireDate?: string; downloadLimit?: number }) => {
    try {
      const res = await exportApi.createShare(data)
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '创建分享失败' }
    }
  }

  const getApiInterfaces = async () => {
    try {
      const res = await exportApi.getApiInterfaces()
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '获取API接口失败' }
    }
  }

  const setPage = (page: number) => {
    currentPage.value = page
  }

  return {
    templates,
    jobs,
    loading,
    total,
    currentPage,
    pageSize,
    fetchTemplates,
    createTemplate,
    createJob,
    fetchJobs,
    getJob,
    createShare,
    getApiInterfaces,
    setPage,
  }
})
