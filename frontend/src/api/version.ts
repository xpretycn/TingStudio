import http from './http'
import type { Pagination } from './http'

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
  changes?: Record<string, unknown>[]
  snapshot?: Record<string, unknown>
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

export interface VersionReviewLog {
  reviewLogId: string
  versionId: string
  reviewerId: string
  reviewerName?: string
  action: 'submit' | 'approve' | 'reject'
  comment: string | null
  createdAt: string
}

export interface VersionCompareResult {
  formulaId: string
  versionA: string
  versionB: string
  diff: Record<string, unknown>
}

interface VersionActionResult {
  success: boolean
  message?: string
  versionId?: string
  status?: string
}

export interface PendingReviewResult {
  list: Record<string, unknown>[]
  pagination: Pagination
}

export const versionApi = {
  getList(formulaId: string, params?: { status?: string }) {
    return http.get<unknown, FormulaVersion[]>(`/versions/formula/${formulaId}`, { params })
  },
  getById(versionId: string) {
    return http.get<unknown, FormulaVersion>(`/versions/detail/${versionId}`)
  },
  create(formulaId: string, data?: { versionName?: string; versionReason?: string; status?: string }) {
    return http.post<unknown, { versionId: string; versionNumber: string }>(`/versions/formula/${formulaId}`, data)
  },
  publish(versionId: string) {
    return http.put<unknown, { message: string }>(`/versions/publish/${versionId}`)
  },
  compare(formulaId: string, versionA: string, versionB: string) {
    return http.get<unknown, VersionCompareResult>(`/versions/compare/${formulaId}`, { params: { versionA, versionB } })
  },

  submit(versionId: string, data?: { comment?: string }) {
    return http.post<unknown, VersionActionResult>(`/versions/submit/${versionId}`, data)
  },
  approve(versionId: string, data?: { comment?: string }) {
    return http.put<unknown, VersionActionResult>(`/versions/approve/${versionId}`, data)
  },
  reject(versionId: string, data: { comment: string }) {
    return http.put<unknown, VersionActionResult>(`/versions/reject/${versionId}`, data)
  },
  getPendingReview(params?: { page?: number; pageSize?: number; keyword?: string }) {
    return http.get<unknown, PendingReviewResult>('/versions/pending-review', { params })
  },
  getReviewLogs(versionId: string) {
    return http.get<unknown, VersionReviewLog[]>(`/versions/review-logs/${versionId}`)
  },
  getMaterialUpdates(formulaId: string) {
    return http.get<unknown, MaterialUpdatesResult>(`/versions/material-updates/${formulaId}`)
  },
  refreshSnapshot(formulaId: string, data?: { materialIds?: string[] }) {
    return http.post<unknown, VersionActionResult>(`/versions/refresh-snapshot/${formulaId}`, data)
  },
  setCurrentVersion(versionId: string) {
    return http.put<unknown, VersionActionResult>(`/versions/set-current/${versionId}`)
  },
}
