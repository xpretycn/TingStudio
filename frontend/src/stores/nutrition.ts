import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nutritionApi } from '@/api/nutrition'
import type { NutritionProfile } from '@/api/nutrition'

export const useNutritionStore = defineStore('nutrition', () => {
  const loading = ref(false)
  const profiles = ref<NutritionProfile[]>([])
  const materialNutrition = ref<Record<string, unknown> | null>(null)
  const formulaNutrition = ref<Record<string, unknown> | null>(null)
  const complianceResult = ref<Record<string, unknown> | null>(null)

  const getMaterialNutrition = async (materialId: string) => {
    loading.value = true
    try {
      const res = await nutritionApi.getMaterialNutrition(materialId)
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      materialNutrition.value = res
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '获取营养成分失败' }
    } finally {
      loading.value = false
    }
  }

  const setMaterialNutrition = async (materialId: string, data: { per100g: Record<string, number>; dataSource?: string; notes?: string }) => {
    loading.value = true
    try {
      await nutritionApi.setMaterialNutrition(materialId, data)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '设置营养成分失败' }
    } finally {
      loading.value = false
    }
  }

  const calculateFormulaNutrition = async (formulaId: string) => {
    loading.value = true
    try {
      const res = await nutritionApi.calculateFormulaNutrition(formulaId)
      formulaNutrition.value = res
      return { success: true, data: res }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '计算营养成分失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchProfiles = async (params?: { category?: string }) => {
    loading.value = true
    try {
      const res = await nutritionApi.getProfiles(params)
      profiles.value = Array.isArray(res) ? res : (res as Record<string, unknown>)?.data as NutritionProfile[] ?? []
    } catch (error) {
      console.error('获取营养标准失败:', error)
    } finally {
      loading.value = false
    }
  }

  const createProfile = async (data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: Record<string, unknown>[]; mandatoryFields?: string[] }) => {
    try {
      await nutritionApi.createProfile(data)
      await fetchProfiles()
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '创建营养标准失败' }
    }
  }

  const updateProfile = async (profileId: string, data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: Record<string, unknown>[]; mandatoryFields?: string[] }) => {
    try {
      await nutritionApi.updateProfile(profileId, data)
      await fetchProfiles()
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '更新营养标准失败' }
    }
  }

  const deleteProfile = async (profileId: string) => {
    try {
      await nutritionApi.deleteProfile(profileId)
      await fetchProfiles()
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '删除营养标准失败' }
    }
  }

  const checkCompliance = async (formulaId: string, profileId?: string) => {
    loading.value = true
    try {
      const res = await nutritionApi.checkCompliance(formulaId, profileId)
      complianceResult.value = res
      return { success: true, data: res }
    } catch (error: unknown) {
      console.error('[Store] complianceCheck 失败:', error)
      return { success: false, message: error instanceof Error ? error.message : '合规检查失败' }
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
    updateProfile,
    deleteProfile,
    checkCompliance,
  }
})
