import http from './http'
import axios from 'axios'

const TOKEN_KEY = 'tingstudio_token'

export interface ExportTemplate {
  templateId: string
  name: string
  description: string | null
  type: 'pdf' | 'excel' | 'api' | 'print'
  formatConfig: any
  isDefault: number
  createdBy: string
  createdAt: string
}

export interface ExportJob {
  jobId: string
  formulaId: string
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
  authConfig: any
  dataFormat: string
  fieldMapping: any[]
  rateLimit: any
  retryConfig: any
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const exportApi = {
  getTemplates(params?: { type?: string }) {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, ExportTemplate[]>('/exports/templates', { params })
  },
  createTemplate(data: { name: string; description?: string; type: string; formatConfig: any; isDefault?: boolean }) {
    return http.post<any, { success: boolean; message: string; data: { templateId: string } }>('/exports/templates', data)
  },
  updateTemplate(templateId: string, data: { name: string; description?: string; type: string; formatConfig: any; isDefault?: boolean }) {
    return http.put<any, { success: boolean; message: string }>(`/exports/templates/${templateId}`, data)
  },
  deleteTemplate(templateId: string) {
    return http.delete<any, { success: boolean; message: string }>(`/exports/templates/${templateId}`)
  },
  createJob(data: { formulaId: string; versionId?: string; templateId?: string; exportType: string }) {
    return http.post<any, { success: boolean; message: string; data: { jobId: string; status: string; fileName?: string; errorMessage?: string } }>('/exports/jobs', data)
  },
  getJobs(params?: { status?: string; page?: number; pageSize?: number }) {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, { list: ExportJob[]; pagination: any }>('/exports/jobs', { params })
  },
  getJob(jobId: string) {
    return http.get<any, ExportJob>(`/exports/jobs/${jobId}`)
  },
  retryJob(jobId: string) {
    return http.post<any, { success: boolean; message: string; data: { jobId: string; status: string } }>(`/exports/jobs/${jobId}/retry`)
  },
  downloadFile(jobId: string) {
    // 文件下载单独处理，不走 http 拦截器（blob 响应没有 success 字段）
    return axios.get(`/api/exports/jobs/${jobId}/download`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` },
    })
  },
  createShare(data: { formulaId: string; versionId?: string; shareType?: string; password?: string; expireDate?: string; downloadLimit?: number }) {
    return http.post<any, { success: boolean; message: string; data: { shareId: string; shareUrl: string } }>('/exports/share', data)
  },
  getShares() {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, ShareItem[]>('/exports/shares')
  },
  deleteShare(shareId: string) {
    return http.delete<any, { message: string }>(`/exports/share/${shareId}`)
  },
  getApiInterfaces() {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, ApiInterface[]>('/exports/api-interfaces')
  },
  createApiInterface(data: any) {
    return http.post<any, { success: boolean; message: string; data: { interfaceId: string } }>('/exports/api-interfaces', data)
  },
}
