import http from './http'

export interface NutritionProfile {
  profileId: string
  name: string
  description: string | null
  category: 'infant' | 'child' | 'adult' | 'elderly' | 'pregnant' | 'special'
  targetValues: Record<string, number>
  toleranceRanges: Record<string, unknown>[]
  mandatoryFields: string[]
  isPreset?: boolean
  createdAt: string
  updatedAt: string
}

export interface MaterialNutrition {
  materialId: string
  per100g: Record<string, number>
  dataSource: string | null
  notes: string | null
  confidence: 'high' | 'medium' | 'low' | null
  updatedAt: string
}

interface FormulaNutritionResult {
  formulaId: string
  per100g: Record<string, number>
  nrv: Record<string, number>
  energy: number
  ingredients: Array<{
    materialId: string
    materialName: string
    ratio: number
    per100g: Record<string, number>
  }>
}

interface ComplianceResult {
  formulaId: string
  profileId: string
  profileName: string
  compliant: boolean
  violations: Array<{
    nutrient: string
    value: number
    min: number | null
    max: number | null
    severity: 'warning' | 'error'
  }>
}

export interface NutritionTableData {
  formulaId: string
  formulaName: string
  per100g: Record<string, number>
  nrv: Record<string, number>
  energy: number
  ingredients: Record<string, unknown>[]
}

export const nutritionApi = {
  getMaterialNutrition(materialId: string, silent = false) {
    return http.get<unknown, MaterialNutrition>(`/nutrition/material/${materialId}`, { _silent: silent })
  },
  setMaterialNutrition(materialId: string, data: { per100g: Record<string, number>; dataSource?: string; notes?: string; confidence?: 'high' | 'medium' | 'low' }) {
    return http.put<unknown, { success: boolean; message: string }>(`/nutrition/material/${materialId}`, data)
  },
  calculateFormulaNutrition(formulaId: string) {
    return http.post<unknown, FormulaNutritionResult>(`/nutrition/calculate/${formulaId}`)
  },
  getProfiles(params?: { category?: string }) {
    return http.get<unknown, NutritionProfile[]>('/nutrition/profiles', { params })
  },
  createProfile(data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: Record<string, unknown>[]; mandatoryFields?: string[] }) {
    return http.post<unknown, { profileId: string }>('/nutrition/profiles', data)
  },
  updateProfile(profileId: string, data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: Record<string, unknown>[]; mandatoryFields?: string[] }) {
    return http.put<unknown, { success: boolean; message: string }>(`/nutrition/profiles/${profileId}`, data)
  },
  deleteProfile(profileId: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/nutrition/profiles/${profileId}`)
  },
  checkCompliance(formulaId: string, profileId?: string) {
    const url = profileId
      ? `/nutrition/compliance/${formulaId}?profileId=${profileId}`
      : `/nutrition/compliance/${formulaId}`

    return http.post<unknown, ComplianceResult>(url, {})
  },
  getFormulaNutritionTables(formulaId: string) {
    return http.get<unknown, NutritionTableData>(`/nutrition/tables/${formulaId}`)
  },
}
