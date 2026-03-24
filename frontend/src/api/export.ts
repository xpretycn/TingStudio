import http from './http'

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

export const exportApi = {
  getTemplates(params?: { type?: string }) {
    return http.get<any, { success: boolean; data: ExportTemplate[] }>('/exports/templates', { params })
  },
  createTemplate(data: { name: string; description?: string; type: string; formatConfig: any; isDefault?: boolean }) {
    return http.post<any, { success: boolean; message: string; data: { templateId: string } }>('/exports/templates', data)
  },
  createJob(data: { formulaId: string; versionId?: string; templateId?: string; exportType: string }) {
    return http.post<any, { success: boolean; message: string; data: { jobId: string; status: string } }>('/exports/jobs', data)
  },
  getJobs(params?: { status?: string; page?: number; pageSize?: number }) {
    return http.get<any, { success: boolean; data: { list: ExportJob[]; pagination: any } }>('/exports/jobs', { params })
  },
  getJob(jobId: string) {
    return http.get<any, { success: boolean; data: ExportJob }>(`/exports/jobs/${jobId}`)
  },
  createShare(data: { formulaId: string; versionId?: string; shareType?: string; password?: string; expireDate?: string; downloadLimit?: number }) {
    return http.post<any, { success: boolean; message: string; data: { shareId: string; shareUrl: string } }>('/exports/share', data)
  },
  getApiInterfaces() {
    return http.get<any, { success: boolean; data: any[] }>('/exports/api-interfaces')
  },
  createApiInterface(data: any) {
    return http.post<any, { success: boolean; message: string; data: { interfaceId: string } }>('/exports/api-interfaces', data)
  },
}
