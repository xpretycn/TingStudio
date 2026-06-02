import http from './http'

export interface NutritionSource {
  sourceId: string
  materialId: string
  sourceType: 'manual' | 'tianapi' | 'seed' | 'ai' | 'excel_import' | 'other'
  sourceDetail: string | null
  per100g: Record<string, number>
  confidence: 'high' | 'medium' | 'low'
  matchScore: number | null
  notes: string | null
  createdAt: string
  createdBy: string | null
  isActive: number
}

export interface SourceComparisonNutrient {
  field: string
  label: string
  unit: string
  authoritativeValue: number
  sources: {
    sourceId: string
    sourceType: string
    sourceDetail: string | null
    confidence: string
    value: number
    diff: number
    diffPercent: number
  }[]
}

export interface SourceComparison {
  materialId: string
  materialName: string
  authoritative: {
    sourceType: string
    sourceDetail: string | null
    per100g: Record<string, number>
  }
  nutrients: SourceComparisonNutrient[]
  summary: {
    totalSources: number
    totalNutrients: number
    diffCount: number
    maxDiffPercent: number
    avgDiffPercent: number
  }
}

export interface EnrichResult {
  sourceType: string
  sourceId: string
  found: boolean
  matchScore: number
  confidence: string
  sourceDetail: string | null
  per100g: Record<string, number>
}

export const nutritionSourceApi = {
  getSources(materialId: string, params?: { includeInactive?: boolean }) {
    return http.get<NutritionSource[]>(`/nutrition/material/${materialId}/sources`, { params })
  },

  addSource(materialId: string, data: {
    sourceType: string
    per100g: Record<string, number>
    sourceDetail?: string
    confidence?: string
    matchScore?: number
    notes?: string
  }) {
    return http.post<NutritionSource>(`/nutrition/material/${materialId}/sources`, data)
  },

  getSourcesCompare(materialId: string) {
    return http.get<SourceComparison>(`/nutrition/material/${materialId}/sources/compare`)
  },

  updateSource(materialId: string, sourceId: string, data: {
    sourceDetail?: string
    confidence?: string
    notes?: string
  }) {
    return http.put(`/nutrition/material/${materialId}/sources/${sourceId}`, data)
  },

  deleteSource(materialId: string, sourceId: string) {
    return http.delete(`/nutrition/material/${materialId}/sources/${sourceId}`)
  },

  setAuthoritative(materialId: string, fieldSelections: Record<string, string>) {
    return http.put<{
      updatedFields: number
      sourceType: string
      fieldSources: Record<string, { sourceId: string; sourceType: string; sourceDetail: string }>
    }>(`/nutrition/material/${materialId}/authoritative`, { fieldSelections })
  },

  enrichNutrition(materialId: string, sources?: string[]) {
    return http.post<{
      materialId: string
      materialName: string
      results: EnrichResult[]
      summary: { totalAttempted: number; totalFound: number; totalNotFound: number; totalFailed: number }
    }>(`/nutrition/material/${materialId}/enrich-nutrition`, { sources })
  },

  bulkEnrichNutrition(data: {
    materialIds?: string[]
    sources?: string[]
    overwriteExisting?: boolean
  }) {
    return http.post<{
      totalProcessed: number
      totalFound: number
      totalNotFound: number
      totalFailed: number
      results: Array<{ materialId: string; materialName: string; found: boolean; sourcesAdded: number }>
    }>('/nutrition/bulk-enrich-nutrition', data)
  },
}
