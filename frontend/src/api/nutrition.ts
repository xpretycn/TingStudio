import http from './http'

export interface NutritionProfile {
  profileId: string
  name: string
  description: string | null
  category: 'infant' | 'child' | 'adult' | 'elderly' | 'pregnant' | 'special'
  targetValues: Record<string, number>
  toleranceRanges: any[]
  mandatoryFields: string[]
  isPreset?: boolean
  createdAt: string
  updatedAt: string
}

export const nutritionApi = {
  getMaterialNutrition(materialId: string) {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, any>(`/nutrition/material/${materialId}`)
  },
  setMaterialNutrition(materialId: string, data: { per100g: Record<string, number>; dataSource?: string; notes?: string; confidence?: 'high' | 'medium' | 'low' }) {
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
  updateProfile(profileId: string, data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: any[]; mandatoryFields?: string[] }) {
    return http.put<any, { success: boolean; message: string }>(`/nutrition/profiles/${profileId}`, data)
  },
  deleteProfile(profileId: string) {
    return http.delete<any, { success: boolean; message: string }>(`/nutrition/profiles/${profileId}`)
  },
  checkCompliance(formulaId: string, profileId?: string) {
    // 构建完整的 URL，包含 query 参数
    const url = profileId 
      ? `/nutrition/compliance/${formulaId}?profileId=${profileId}`
      : `/nutrition/compliance/${formulaId}`
    
    // 使用空对象作为请求体，避免传递 null 被序列化为字符串 "null"
    return http.post<any, { success: boolean; data: any }>(url, {})
  },
  getFormulaNutritionTables(formulaId: string) {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, any>(`/nutrition/tables/${formulaId}`)
  },
}
