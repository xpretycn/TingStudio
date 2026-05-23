import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fileApi } from '@/api/file'
import type { UploadedFile, FileQueryParams, FileStats, AuditLog, FilePreviewData } from '@/api/file'
import { MessagePlugin } from 'tdesign-vue-next'

export const useFileStore = defineStore('file', () => {
  const files = ref<UploadedFile[]>([])
  const total = ref(0)
  const loading = ref(false)
  const stats = ref<FileStats>({ total: 0, parsed: 0, linked: 0, pending: 0, totalSize: 0 })
  const currentFile = ref<UploadedFile | null>(null)
  const auditLogs = ref<AuditLog[]>([])
  const previewData = ref<FilePreviewData | null>(null)
  const previewLoading = ref(false)

  const queryParams = ref<FileQueryParams>({
    keyword: '',
    fileType: undefined,
    relatedStatus: undefined,
    startDate: undefined,
    endDate: undefined,
    page: 1,
    pageSize: 8,
  })

  async function fetchFiles(params?: FileQueryParams) {
    loading.value = true
    try {
      const merged = { ...queryParams.value, ...params }
      queryParams.value = merged
      const res = await fileApi.list(merged)
      files.value = res.list
      total.value = res.total
      if (res.stats) stats.value = res.stats
    } catch (error) {
      console.error('获取文件列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function uploadFile(file: File, fileType: string) {
    loading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', fileType)
      const res = await fileApi.upload(formData)
      MessagePlugin.success('文件上传成功')
      await fetchFiles()
      return { success: true, data: res }
    } catch (error: any) {
      MessagePlugin.error(error.message || '文件上传失败')
      return { success: false, message: error.message }
    } finally {
      loading.value = false
    }
  }

  async function getFile(fileId: string) {
    loading.value = true
    try {
      const res = await fileApi.get(fileId)
      currentFile.value = res
      return res
    } catch {
      MessagePlugin.error('获取文件详情失败')
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteFile(fileId: string) {
    try {
      await fileApi.delete(fileId)
      MessagePlugin.success('文件已删除')
      await fetchFiles()
      return { success: true }
    } catch (error: any) {
      MessagePlugin.error(error.message || '删除失败')
      return { success: false, message: error.message }
    }
  }

  async function batchDelete(fileIds: string[]) {
    try {
      const res = await fileApi.batchDelete(fileIds)
      MessagePlugin.success(`已删除 ${res.deleted} 个文件`)
      await fetchFiles()
      return { success: true, data: res }
    } catch (error: any) {
      MessagePlugin.error(error.message || '批量删除失败')
      return { success: false, message: error.message }
    }
  }

  async function batchArchive(fileIds: string[]) {
    try {
      const res = await fileApi.batchArchive(fileIds)
      MessagePlugin.success(`已归档 ${res.archived} 个文件`)
      await fetchFiles()
      return { success: true, data: res }
    } catch (error: any) {
      MessagePlugin.error(error.message || '批量归档失败')
      return { success: false, message: error.message }
    }
  }

  async function linkFile(fileId: string, relatedId: string, relatedType: string) {
    try {
      await fileApi.link(fileId, { relatedId, relatedType })
      MessagePlugin.success('关联成功')
      if (currentFile.value && currentFile.value.fileId === fileId) {
        await getFile(fileId)
      }
      return { success: true }
    } catch (error: any) {
      MessagePlugin.error(error.message || '关联失败')
      return { success: false, message: error.message }
    }
  }

  async function unlinkFile(fileId: string, relatedId?: string, relatedType?: string) {
    try {
      await fileApi.unlink(fileId, relatedId && relatedType ? { relatedId, relatedType } : undefined)
      MessagePlugin.success('已解除关联')
      if (currentFile.value && currentFile.value.fileId === fileId) {
        await getFile(fileId)
      }
      return { success: true }
    } catch (error: any) {
      MessagePlugin.error(error.message || '解除关联失败')
      return { success: false, message: error.message }
    }
  }

  async function reparseFile(fileId: string, model: string) {
    try {
      await fileApi.reparse(fileId, model)
      MessagePlugin.success('重新解析已启动')
      if (currentFile.value && currentFile.value.fileId === fileId) {
        await getFile(fileId)
      }
      return { success: true }
    } catch (error: any) {
      MessagePlugin.error(error.message || '重新解析失败')
      return { success: false, message: error.message }
    }
  }

  async function fetchAuditLog(fileId: string) {
    try {
      const res = await fileApi.getAuditLog(fileId)
      auditLogs.value = res
      return res
    } catch (error) {
      console.error('获取审计日志失败:', error)
      return []
    }
  }

  async function fetchPreview(fileId: string, params?: { sheet?: number; maxRows?: number; maxCols?: number }) {
    previewLoading.value = true
    try {
      const res = await fileApi.preview(fileId, params)
      previewData.value = res
      return res
    } catch (error: any) {
      console.error('获取预览数据失败:', error)
      previewData.value = null
      return null
    } finally {
      previewLoading.value = false
    }
  }

  async function downloadFile(fileId: string, fileName: string) {
    try {
      const res = await fileApi.download(fileId)
      const blob = new Blob([res.data])
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
      MessagePlugin.error(error.message || '下载失败')
      return { success: false, message: error.message }
    }
  }

  async function fetchStats() {
    try {
      const res = await fileApi.getStats()
      stats.value = res
      return res
    } catch (error) {
      console.error('获取文件统计失败:', error)
      return null
    }
  }

  function setPage(page: number) {
    queryParams.value.page = page
  }

  function resetQuery() {
    queryParams.value = {
      keyword: '',
      fileType: undefined,
      relatedStatus: undefined,
      startDate: undefined,
      endDate: undefined,
      page: 1,
      pageSize: 8,
    }
  }

  return {
    files, total, loading, stats, currentFile, auditLogs,
    previewData, previewLoading, queryParams,
    fetchFiles, uploadFile, getFile, deleteFile,
    batchDelete, batchArchive,
    linkFile, unlinkFile, reparseFile,
    fetchAuditLog, fetchPreview, downloadFile, fetchStats,
    setPage, resetQuery,
  }
})
