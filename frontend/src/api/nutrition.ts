import http from './http'

export interface NutritionProfile {
  profileId: string
  name: string
  description: string | null
  category: 'infant' | 'child' | 'adult' | 'elderly' | 'pregnant' | 'special'
  targetValues: Record<string, number>
  toleranceRanges: any[]
  mandatoryFields: string[]
  createdAt: string
  updatedAt: string
}

export const nutritionApi = {
  getMaterialNutrition(materialId: string) {
    return http.get<any, { success: boolean; data: any }>(`/nutrition/material/${materialId}`)
  },
  setMaterialNutrition(materialId: string, data: { per100g: Record<string, number>; dataSource?: string; notes?: string }) {
    return http.put<any, { success: boolean; message: string }>(`/nutrition/material/${materialId}`, data)
  },
  calculateFormulaNutrition(formulaId: string) {
    return http.post<any, { success: boolean; data: any }>(`/nutrition/calculate/${formulaId}`)
  },
  getProfiles(params?: { category?: string }) {
    return http.get<any, { success: boolean; data: NutritionProfile[] }>('/nutrition/profiles', { params })
  },
  createProfile(data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: any[]; mandatoryFields?: string[] }) {
    return http.post<any, { success: boolean; message: string; data: { profileId: string } }>('/nutrition/profiles', data)
  },
  checkCompliance(formulaId: string, profileId?: string) {
    return http.post<any, { success: boolean; data: any }>(`/nutrition/compliance/${formulaId}`, null, { params: profileId ? { profileId } : {} })
  },
  getFormulaNutritionTables(formulaId: string) {
    return http.get<any, { success: boolean; data: any }>(`/nutrition/tables/${formulaId}`)
  },
}
