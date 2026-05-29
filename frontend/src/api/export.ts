import http from './http'
import type { Pagination } from './http'

export interface ExportStatistics {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  processingJobs: number
  activeShares: number
  templateCount: number
  recentActivities: Array<{
    type: string
    title: string
    desc: string
    time: string
  }>
}

export interface ExportConfigItem {
  configKey: string
  configValue: string
  configType: string
  description: string | null
}

export interface ExportMaterial {
  id: string
  name: string
  code: string
  unit: string
  materialType: string
  version: number
  isLatest: boolean
  totalVersions: number
}

export interface ExportReport {
  id: string
  title: string
  type: 'weekly' | 'monthly'
  periodStart: string
  periodEnd: string
  status: 'draft' | 'published' | 'archived'
}

export interface ExportTemplate {
  templateId: string
  name: string
  description: string | null
  category: string
  type: 'pdf' | 'excel'
  formatConfig: Record<string, unknown>
  isDefault: number
  createdBy: string
  createdAt: string
  updatedAt?: string
}

export interface ExportJob {
  jobId: string
  formulaId: string | null
  formulaName?: string
  versionId: string | null
  templateId: string | null
  dataCategory: string
  exportType: 'pdf' | 'excel'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  fileUrl: string | null
  fileName: string | null
  progress: number
  errorMessage: string | null
  createdBy: string
  createdAt: string
  updatedAt?: string
  completedAt: string | null
}

export interface ShareItem {
  shareId: string
  formulaId: string
  formulaName?: string
  versionId: string | null
  shareType: string
  shareUrl: string
  password: string | null
  expireDate: string | null
  allowedEmails: string[]
  downloadLimit: number | null
  downloadCount: number
  createdBy: string
  createdAt: string
}

export const exportApi = {
  getStatistics() {
    return http.get<unknown, ExportStatistics>('/exports/statistics')
  },
  getConfig() {
    return http.get<unknown, ExportConfigItem[]>('/exports/config')
  },
  updateConfig(configs: Array<{ configKey: string; configValue: string }>) {
    return http.put<unknown, { updatedCount: number }>('/exports/config', { configs })
  },
  getMaterials(params?: { keyword?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: ExportMaterial[]; pagination: Pagination }>('/exports/materials', { params })
  },
  getReports(params: { type: 'weekly' | 'monthly'; periodStart?: string; periodEnd?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: ExportReport[]; pagination: Pagination }>('/exports/reports', { params })
  },
  getTemplates(params?: { type?: string; category?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: ExportTemplate[]; pagination: Pagination }>('/exports/templates', { params })
  },
  createTemplate(data: { name: string; description?: string; type: string; category: string; formatConfig: Record<string, unknown>; isDefault?: boolean }) {
    return http.post<unknown, { templateId: string }>('/exports/templates', data)
  },
  updateTemplate(templateId: string, data: { name?: string; description?: string; type?: string; category?: string; formatConfig?: Record<string, unknown>; isDefault?: boolean }) {
    return http.put<unknown, { success: boolean; message: string }>(`/exports/templates/${templateId}`, data)
  },
  deleteTemplate(templateId: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/exports/templates/${templateId}`)
  },
  createJob(data: {
    dataCategory: 'formula' | 'material' | 'weekly-report' | 'monthly-report'
    exportType: 'excel' | 'pdf'
    formulaIds?: string[]
    materialIds?: string[]
    includeVersionInfo?: boolean
    periodStart?: string
    periodEnd?: string
    templateId?: string
  }) {
    return http.post<unknown, { jobId: string; status: string; fileName?: string; errorMessage?: string }>('/exports/jobs', data)
  },
  getJobs(params?: { status?: string; dataCategory?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: ExportJob[]; pagination: Pagination }>('/exports/jobs', { params })
  },
  getJob(jobId: string) {
    return http.get<unknown, ExportJob>(`/exports/jobs/${jobId}`)
  },
  retryJob(jobId: string) {
    return http.post<unknown, { jobId: string; status: string }>(`/exports/jobs/${jobId}/retry`)
  },
  reExportJob(jobId: string) {
    return http.post<unknown, { jobId: string; status: string; fileName?: string }>(`/exports/jobs/${jobId}/re-export`)
  },
  downloadFile(jobId: string) {
    return http.get(`/exports/jobs/${jobId}/download`, {
      responseType: 'blob',
    })
  },
  createShare(data: { formulaId: string; versionId?: string; shareType?: string; password?: string; expireDate?: string; downloadLimit?: number }) {
    return http.post<unknown, { shareId: string; shareUrl: string }>('/exports/share', data)
  },
  getShares() {
    return http.get<unknown, ShareItem[]>('/exports/shares')
  },
  deleteShare(shareId: string) {
    return http.delete<unknown, { message: string }>(`/exports/share/${shareId}`)
  },
}
