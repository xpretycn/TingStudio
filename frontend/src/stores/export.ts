import { defineStore } from 'pinia'
import { ref } from 'vue'
import { exportApi } from '@/api/export'
import type { ExportTemplate, ExportJob, ShareItem, ExportStatistics, ExportConfigItem, ExportMaterial, ExportReport } from '@/api/export'

export const useExportStore = defineStore('export', () => {
  const templates = ref<ExportTemplate[]>([])
  const jobs = ref<ExportJob[]>([])
  const shares = ref<ShareItem[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const templateTotal = ref(0)
  const templateCurrentPage = ref(1)
  const templatePageSize = ref(10)
  const statistics = ref<ExportStatistics | null>(null)
  const configList = ref<ExportConfigItem[]>([])
  const materialList = ref<ExportMaterial[]>([])
  const reportList = ref<ExportReport[]>([])

  const fetchTemplates = async (params?: { type?: string; category?: string; page?: number; pageSize?: number }) => {
    loading.value = true
    try {
      const res = await exportApi.getTemplates(params)
      templates.value = res.list
      templateTotal.value = res.pagination.total
      templateCurrentPage.value = res.pagination.page
      templatePageSize.value = res.pagination.pageSize
    } catch (error) {
      console.error('获取导出模板失败:', error)
    } finally {
      loading.value = false
    }
  }

  const createTemplate = async (data: { name: string; description?: string; type: string; category: string; formatConfig: Record<string, unknown>; isDefault?: boolean }) => {
    try {
      await exportApi.createTemplate(data)
      await fetchTemplates({ page: templateCurrentPage.value, pageSize: templatePageSize.value })
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '创建模板失败' }
    }
  }

  const updateTemplate = async (templateId: string, data: { name?: string; description?: string; type?: string; category?: string; formatConfig?: Record<string, unknown>; isDefault?: boolean }) => {
    try {
      await exportApi.updateTemplate(templateId, data)
      await fetchTemplates({ page: templateCurrentPage.value, pageSize: templatePageSize.value })
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '更新模板失败' }
    }
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      await exportApi.deleteTemplate(templateId)
      await fetchTemplates({ page: templateCurrentPage.value, pageSize: templatePageSize.value })
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '删除模板失败' }
    }
  }

  const createJob = async (data: {
    dataCategory: 'formula' | 'material' | 'weekly-report' | 'monthly-report'
    exportType: 'excel' | 'pdf'
    formulaIds?: string[]
    materialIds?: string[]
    includeVersionInfo?: boolean
    periodStart?: string
    periodEnd?: string
    templateId?: string
  }) => {
    loading.value = true
    try {
      const res = await exportApi.createJob(data)
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '创建导出任务失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchJobs = async (params?: { status?: string; dataCategory?: string; page?: number; pageSize?: number }) => {
    loading.value = true
    try {
      const res = await exportApi.getJobs(params)
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '重试失败' }
    }
  }

  const reExportJob = async (jobId: string) => {
    try {
      await exportApi.reExportJob(jobId)
      await fetchJobs({ page: currentPage.value, pageSize: pageSize.value })
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '重新导出失败' }
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '下载失败' }
    }
  }

  const createShare = async (data: { formulaId: string; versionId?: string; shareType?: string; password?: string; expireDate?: string; downloadLimit?: number }) => {
    try {
      const res = await exportApi.createShare(data)
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '创建分享失败' }
    }
  }

  const fetchShares = async () => {
    try {
      const res = await exportApi.getShares()
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '删除分享失败' }
    }
  }

  const fetchStatistics = async () => {
    try {
      const res = await exportApi.getStatistics()
      statistics.value = res
      return res
    } catch (error) {
      console.error('[ExportStore] 获取统计失败:', error)
      return null
    }
  }

  const fetchConfig = async () => {
    try {
      const res = await exportApi.getConfig()
      configList.value = res
      return res
    } catch (error) {
      console.error('[ExportStore] 获取配置失败:', error)
      return null
    }
  }

  const updateConfig = async (configs: Array<{ configKey: string; configValue: string }>) => {
    try {
      await exportApi.updateConfig(configs)
      await fetchConfig()
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '更新配置失败' }
    }
  }

  const fetchMaterials = async (params?: { keyword?: string; page?: number; pageSize?: number }) => {
    try {
      const res = await exportApi.getMaterials(params)
      materialList.value = res.list
      return res
    } catch (error) {
      console.error('[ExportStore] 获取原料列表失败:', error)
      return null
    }
  }

  const fetchReports = async (params: { type: 'weekly' | 'monthly'; periodStart?: string; periodEnd?: string; page?: number; pageSize?: number }) => {
    try {
      const res = await exportApi.getReports(params)
      reportList.value = res.list
      return res
    } catch (error) {
      console.error('[ExportStore] 获取报告列表失败:', error)
      return null
    }
  }

  const setPage = (page: number) => {
    currentPage.value = page
  }
  const setTemplatePage = (page: number) => {
    templateCurrentPage.value = page
  }

  return {
    templates, jobs, shares,
    loading, total, currentPage, pageSize,
    templateTotal, templateCurrentPage, templatePageSize,
    statistics, configList, materialList, reportList,
    fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
    createJob, fetchJobs, getJob, retryJob, reExportJob, downloadFile,
    createShare, fetchShares, deleteShare,
    fetchStatistics, fetchConfig, updateConfig, fetchMaterials, fetchReports,
    setPage, setTemplatePage,
  }
})
