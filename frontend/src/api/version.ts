import http from './http'

export interface FormulaVersion {
  versionId: string
  formulaId: string
  versionNumber: string
  versionName: string | null
  versionReason: string | null
  changesJson: string | null
  snapshotJson: string
  status: 'draft' | 'pending_review' | 'published' | 'archived'
  isCurrent: number
  createdBy: string
  createdByName: string | null
  createdAt: string
  changes?: any[]
  snapshot?: any
}

export interface MaterialUpdateInfo {
  materialId: string
  materialName: string
  isLatest: boolean
  currentVersion: number | null
  latestVersion: number | null
  latestMaterialId: string | null
  latestVersionName: string | null
  latestUnitPrice: number | null
  currentUnitPrice: number | null
  priceChanged: boolean
}

export interface MaterialUpdatesResult {
  formulaId: string
  formulaName: string
  versionId: string
  versionNumber: string
  materials: MaterialUpdateInfo[]
  hasUpdates: boolean
  hasPriceChanges: boolean
  totalMaterials: number
  outdatedCount: number
  priceChangedCount: number
}

export interface ReviewLog {
  reviewLogId: string
  versionId: string
  reviewerId: string
  reviewerName?: string
  action: 'submit' | 'approve' | 'reject'
  comment: string | null
  createdAt: string
}

export const versionApi = {
  getList(formulaId: string, params?: { status?: string }) {
    return http.get<any, FormulaVersion[]>(`/versions/formula/${formulaId}`, { params })
  },
  getById(versionId: string) {
    return http.get<any, FormulaVersion>(`/versions/detail/${versionId}`)
  },
  create(formulaId: string, data?: { versionName?: string; versionReason?: string; status?: string }) {
    return http.post<any, { versionId: string; versionNumber: string }>(`/versions/formula/${formulaId}`, data)
  },
  publish(versionId: string) {
    return http.put<any, { message: string }>(`/versions/publish/${versionId}`)
  },
  compare(formulaId: string, versionA: string, versionB: string) {
    return http.get<any, any>(`/versions/compare/${formulaId}`, { params: { versionA, versionB } })
  },

  submit(versionId: string, data?: { comment?: string }) {
    return http.post<any, any>(`/versions/submit/${versionId}`, data)
  },
  approve(versionId: string, data?: { comment?: string }) {
    return http.put<any, any>(`/versions/approve/${versionId}`, data)
  },
  reject(versionId: string, data: { comment: string }) {
    return http.put<any, any>(`/versions/reject/${versionId}`, data)
  },
  getPendingReview(params?: { page?: number; pageSize?: number; keyword?: string }) {
    return http.get<any, any>('/versions/pending-review', { params })
  },
  getReviewLogs(versionId: string) {
    return http.get<any, any>(`/versions/review-logs/${versionId}`)
  },
  getMaterialUpdates(formulaId: string) {
    return http.get<any, MaterialUpdatesResult>(`/versions/material-updates/${formulaId}`)
  },
  refreshSnapshot(formulaId: string, data?: { materialIds?: string[] }) {
    return http.post<any, any>(`/versions/refresh-snapshot/${formulaId}`, data)
  },
  setCurrentVersion(versionId: string) {
    return http.put<any, any>(`/versions/set-current/${versionId}`)
  },
}
