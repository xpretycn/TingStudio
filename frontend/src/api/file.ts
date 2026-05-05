import http from './http'
import axios from 'axios'

const TOKEN_KEY = 'tingstudio_token'

export interface FileRelation {
  relationId: string
  fileId: string
  relatedId: string
  relatedType: 'formula' | 'material'
  relatedName: string
  createdBy: string
  createdAt: string
}

export interface UploadedFile {
  fileId: string
  originalName: string
  storagePath: string
  fileSize: number
  mimeType: string
  fileType: 'formula' | 'material'
  status: 'uploaded' | 'parsed' | 'linked' | 'orphaned' | 'archived'
  relatedId: string | null
  relatedType: 'formula' | 'material' | null
  parseResultJson: string | null
  parseModel: string | null
  parseConfidence: number | null
  parseUsageJson: string | null
  version: number
  uploadedBy: string
  uploadedAt: string
  lastAccessedAt: string | null
  relatedName?: string
  uploadedByName?: string
  relations?: FileRelation[]
}

export interface FileQueryParams {
  keyword?: string
  fileType?: 'formula' | 'material'
  status?: string
  relatedStatus?: 'linked' | 'unlinked'
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface AuditLog {
  logId: string
  fileId: string
  action: string
  operator: string
  timestamp: string
  detailJson: string | null
  ipAddress: string | null
}

export interface FilePreviewData {
  type: 'excel' | 'image'
  sheets?: { name: string; headers: string[]; rows: any[][]; mergedCells?: any[] }[]
  activeSheet?: number
  totalRows?: number
  truncated?: boolean
  url?: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

export interface FileStats {
  total: number
  parsed: number
  linked: number
  pending: number
}

export const fileApi = {
  list(params?: FileQueryParams) {
    return http.get<any, { list: UploadedFile[]; total: number; stats: FileStats }>('/files', { params })
  },

  upload(formData: FormData) {
    return http.post<any, UploadedFile>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  get(fileId: string) {
    return http.get<any, UploadedFile>(`/files/${fileId}`)
  },

  delete(fileId: string) {
    return http.delete<any, void>(`/files/${fileId}`)
  },

  reparse(fileId: string, model: string) {
    return http.post<any, any>(`/files/${fileId}/reparse`, { model })
  },

  link(fileId: string, data: { relatedId: string; relatedType: string }) {
    return http.post<any, void>(`/files/${fileId}/link`, data)
  },

  unlink(fileId: string, data?: { relatedId: string; relatedType: string }) {
    return http.post<any, void>(`/files/${fileId}/unlink`, data || {})
  },

  getAuditLog(fileId: string) {
    return http.get<any, AuditLog[]>(`/files/${fileId}/audit`)
  },

  download(fileId: string) {
    return axios.get(`/api/files/${fileId}/download`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` },
    })
  },

  preview(fileId: string, params?: { sheet?: number; maxRows?: number; maxCols?: number }) {
    return http.get<any, FilePreviewData>(`/files/${fileId}/preview`, { params })
  },

  thumbnail(fileId: string) {
    return `/api/files/${fileId}/thumbnail?token=${localStorage.getItem(TOKEN_KEY) || ''}`
  },

  getStats() {
    return http.get<any, FileStats>('/files/stats')
  },

  batchDelete(fileIds: string[]) {
    return http.post<any, { deleted: number; failed: number }>('/files/batch-delete', { fileIds })
  },

  batchArchive(fileIds: string[]) {
    return http.post<any, { archived: number; failed: number }>('/files/batch-archive', { fileIds })
  },
}
