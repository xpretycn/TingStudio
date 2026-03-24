import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nutritionApi } from '@/api/nutrition'
import type { NutritionProfile } from '@/api/nutrition'

export const useNutritionStore = defineStore('nutrition', () => {
  const loading = ref(false)
  const profiles = ref<NutritionProfile[]>([])
  const materialNutrition = ref<any>(null)
  const formulaNutrition = ref<any>(null)
  const complianceResult = ref<any>(null)

  const getMaterialNutrition = async (materialId: string) => {
    loading.value = true
    try {
      const res = await nutritionApi.getMaterialNutrition(materialId)
      materialNutrition.value = res.data
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '获取营养成分失败' }
    } finally {
      loading.value = false
    }
  }

  const setMaterialNutrition = async (materialId: string, data: { per100g: Record<string, number>; dataSource?: string; notes?: string }) => {
    loading.value = true
    try {
      await nutritionApi.setMaterialNutrition(materialId, data)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '设置营养成分失败' }
    } finally {
      loading.value = false
    }
  }

  const calculateFormulaNutrition = async (formulaId: string) => {
    loading.value = true
    try {
      const res = await nutritionApi.calculateFormulaNutrition(formulaId)
      formulaNutrition.value = res.data
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '计算营养成分失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchProfiles = async (params?: { category?: string }) => {
    loading.value = true
    try {
      const res = await nutritionApi.getProfiles(params)
      profiles.value = res.data
    } catch (error) {
      console.error('获取营养标准失败:', error)
    } finally {
      loading.value = false
    }
  }

  const createProfile = async (data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: any[]; mandatoryFields?: string[] }) => {
    try {
      await nutritionApi.createProfile(data)
      await fetchProfiles()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '创建营养标准失败' }
    }
  }

  const checkCompliance = async (formulaId: string, profileId?: string) => {
    loading.value = true
    try {
      const res = await nutritionApi.checkCompliance(formulaId, profileId)
      complianceResult.value = res.data
      return { success: true, data: res.data }
    } catch (error: any) {
      return { success: false, message: error.message || '合规检查失败' }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    profiles,
    materialNutrition,
    formulaNutrition,
    complianceResult,
    getMaterialNutrition,
    setMaterialNutrition,
    calculateFormulaNutrition,
    fetchProfiles,
    createProfile,
    checkCompliance,
  }
})
