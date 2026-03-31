import { defineStore } from 'pinia'
import { ref } from 'vue'
import { exportApi } from '@/api/export'
import type { ExportTemplate, ExportJob, ShareItem, ApiInterface } from '@/api/export'

export const useExportStore = defineStore('export', () => {
  const templates = ref<ExportTemplate[]>([])
  const jobs = ref<ExportJob[]>([])
  const shares = ref<ShareItem[]>([])
  const apiInterfaces = ref<ApiInterface[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  // ===== 模板 =====
  const fetchTemplates = async (params?: { type?: string }) => {
    loading.value = true
    try {
      const res = await exportApi.getTemplates(params)
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      templates.value = res
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

  const updateTemplate = async (templateId: string, data: { name: string; description?: string; type: string; formatConfig: any; isDefault?: boolean }) => {
    try {
      await exportApi.updateTemplate(templateId, data)
      await fetchTemplates()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '更新模板失败' }
    }
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      await exportApi.deleteTemplate(templateId)
      await fetchTemplates()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '删除模板失败' }
    }
  }

  // ===== 导出任务 =====
  const createJob = async (data: { formulaId: string; versionId?: string; templateId?: string; exportType: string }) => {
    loading.value = true
    try {
      const res = await exportApi.createJob(data)
      return { success: true, data: res }
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
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      jobs.value = res.list
      total.value = res.pagination.total
    } catch (error) {
      console.error('获取导出任务失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getJob = async (jobId: string): Promise<ExportJob | null> => {
    try {
      const res = await exportApi.getJob(jobId)
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      return res
    } catch {
      return null
    }
  }

  const retryJob = async (jobId: string) => {
    try {
      await exportApi.retryJob(jobId)
      await fetchJobs({ page: currentPage.value, pageSize: pageSize.value })
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '重试失败' }
    }
  }

  const downloadFile = async (jobId: string, fileName: string, exportType: string = 'excel') => {
    try {
      const res = await exportApi.downloadFile(jobId)
      const contentType = exportType === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const blob = new Blob([res.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '下载失败' }
    }
  }

  // ===== 分享 =====
  const createShare = async (data: { formulaId: string; versionId?: string; shareType?: string; password?: string; expireDate?: string; downloadLimit?: number }) => {
    try {
      const res = await exportApi.createShare(data)
      return { success: true, data: res }
    } catch (error: any) {
      return { success: false, message: error.message || '创建分享失败' }
    }
  }
  
  const fetchShares = async () => {
    try {
      const res = await exportApi.getShares()
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      shares.value = res
    } catch (error) {
      console.error('获取分享列表失败:', error)
    }
  }
  
  const deleteShare = async (shareId: string) => {
    try {
      await exportApi.deleteShare(shareId)
      await fetchShares()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '删除分享失败' }
    }
  }
  
  // ===== API 接口 =====
  const fetchApiInterfaces = async () => {
    try {
      const res = await exportApi.getApiInterfaces()
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      apiInterfaces.value = res
    } catch (error) {
      console.error('获取 API 接口列表失败:', error)
    }
  }
  
  const createApiInterface = async (data: any) => {
    try {
      await exportApi.createApiInterface(data)
      await fetchApiInterfaces()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '创建 API 接口失败' }
    }
  }

  // ===== 分页 =====
  const setPage = (page: number) => {
    currentPage.value = page
  }

  return {
    templates, jobs, shares, apiInterfaces,
    loading, total, currentPage, pageSize,
    fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
    createJob, fetchJobs, getJob, retryJob, downloadFile,
    createShare, fetchShares, deleteShare,
    fetchApiInterfaces, createApiInterface,
    setPage,
  }
})
