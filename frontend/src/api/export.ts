import http from './http'
import type { Pagination } from './http'

const TOKEN_KEY = 'tingstudio_token'

export interface ExportTemplate {
  templateId: string
  name: string
  description: string | null
  type: 'pdf' | 'excel' | 'api' | 'print'
  formatConfig: Record<string, unknown>
  isDefault: number
  createdBy: string
  createdAt: string
}

export interface ExportJob {
  jobId: string
  formulaId: string
  formulaName?: string
  versionId: string | null
  templateId: string | null
  exportType: 'pdf' | 'excel' | 'api'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  fileUrl: string | null
  fileName: string | null
  progress: number
  errorMessage: string | null
  createdBy: string
  createdAt: string
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

export interface ApiInterface {
  interfaceId: string
  name: string
  description: string | null
  endpoint: string
  method: string
  authentication: string
  authConfig: Record<string, unknown>
  dataFormat: string
  fieldMapping: Record<string, unknown>[]
  rateLimit: Record<string, unknown>
  retryConfig: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface CreateApiInterfaceData {
  name: string
  description?: string
  endpoint: string
  method: string
  authentication: string
  authConfig?: Record<string, unknown>
  dataFormat?: string
  fieldMapping?: Record<string, unknown>[]
  rateLimit?: Record<string, unknown>
  retryConfig?: Record<string, unknown>
}

export const exportApi = {
  getTemplates(params?: { type?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: ExportTemplate[]; pagination: Pagination }>('/exports/templates', { params })
  },
  createTemplate(data: { name: string; description?: string; type: string; formatConfig: Record<string, unknown>; isDefault?: boolean }) {
    return http.post<unknown, { templateId: string }>('/exports/templates', data)
  },
  updateTemplate(templateId: string, data: { name: string; description?: string; type: string; formatConfig: Record<string, unknown>; isDefault?: boolean }) {
    return http.put<unknown, { success: boolean; message: string }>(`/exports/templates/${templateId}`, data)
  },
  deleteTemplate(templateId: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/exports/templates/${templateId}`)
  },
  createJob(data: { formulaId: string; versionId?: string; templateId?: string; exportType: string }) {
    return http.post<unknown, { jobId: string; status: string; fileName?: string; errorMessage?: string }>('/exports/jobs', data)
  },
  getJobs(params?: { status?: string; page?: number; pageSize?: number }) {
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
    return http.get(`/api/exports/jobs/${jobId}/download`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` },
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
  getApiInterfaces(params?: { page?: number; pageSize?: number }) {
    return http.get<unknown, { list: ApiInterface[]; pagination: Pagination }>('/exports/api-interfaces', { params })
  },
  createApiInterface(data: CreateApiInterfaceData) {
    return http.post<unknown, { interfaceId: string }>('/exports/api-interfaces', data)
  },
}
