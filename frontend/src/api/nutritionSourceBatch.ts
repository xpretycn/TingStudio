import http from './http'

export interface ScoredSource {
  sourceId: string
  confidence: 'high' | 'medium' | 'low'
  createdAt: string
  matchScore: number | null
  isActive: number
  totalScore: number
  confScore: number
  recencyScore: number
  matchScoreNorm: number
  rank: number
  /** 来源类型（与 getSourcesWithScores 保持一致） */
  sourceType?: string
  /** 来源详情描述（如"种子库-阿胶"） */
  sourceDetail?: string | null
}

export interface SourceWithScore {
  sourceId: string
  sourceType: string
  sourceDetail: string | null
  confidence: string
  matchScore: number | null
  notes: string | null
  createdAt: string
  createdBy: string | null
  isActive: number
  totalScore: number
  rank: number
}

export interface BatchStrategy {
  strategy: 'best-deviation' | 'manual' | 'highest-confidence' | 'newest'
  sourceIds?: string[]
  fieldSelections?: Record<string, string>
}

export const nutritionSourceBatchApi = {
  getScoredSources(materialId: string) {
    return http.get<{ materialId: string; sources: SourceWithScore[] }>(
      `/nutrition/material/${materialId}/sources/scored`,
    )
  },

  getRecommendation(materialId: string) {
    return http.get<{
      materialId: string
      sources: ScoredSource[]
      recommendation: ScoredSource | null
    }>(`/nutrition/material/${materialId}/sources/recommendation`)
  },

  batchSetAuthoritative(materialId: string, data: { strategy: BatchStrategy; sourceIds?: string[]; fieldSelections?: Record<string, string> }) {
    return http.post<{
      materialId: string
      updatedFields: number
      strategy: string
      fieldSources: Record<string, { sourceId: string; sourceType: string; sourceDetail: string | null }>
    }>(`/nutrition/material/${materialId}/sources/batch-set-authoritative`, data)
  },

  batchArchive(materialId: string, sourceIds: string[]) {
    return http.post<{
      materialId: string
      archivedCount: number
      sourceIds: string[]
    }>(`/nutrition/material/${materialId}/sources/batch-archive`, { sourceIds })
  },

  batchRestore(materialId: string, sourceIds: string[]) {
    return http.post<{
      materialId: string
      restoredCount: number
    }>(`/nutrition/material/${materialId}/sources/batch-restore`, { sourceIds })
  },

  exportSources(materialId: string, format: 'excel' | 'pdf' = 'excel') {
    return http.get<Blob>(
      `/nutrition/material/${materialId}/sources/export?format=${format}`,
      { responseType: 'blob' as const },
    )
  },

  listSnapshots(materialId: string, limit = 50) {
    return http.get<{
      materialId: string
      snapshots: Array<{
        snapshotId: string
        materialId: string
        action: string
        actionLabel: string
        operatorId: string
        operatorName: string | null
        affectedSourceIds: string[]
        payload: Record<string, unknown>
        note: string | null
        createdAt: string
      }>
    }>(`/nutrition/material/${materialId}/snapshots?limit=${limit}`)
  },

  getSnapshot(snapshotId: string) {
    return http.get<{
      snapshotId: string
      materialId: string
      action: string
      actionLabel: string
      operatorId: string
      operatorName: string | null
      affectedSourceIds: string[]
      payload: Record<string, unknown>
      note: string | null
      createdAt: string
    }>(`/nutrition/snapshots/${snapshotId}`)
  },
}
