import { ref } from 'vue'
import { defineStore } from 'pinia'
import { nutritionSourceApi } from '@/api/nutritionSource'
import type { NutritionSource, SourceComparison } from '@/api/nutritionSource'
import { MessagePlugin } from 'tdesign-vue-next'

export const useNutritionSourceStore = defineStore('nutritionSource', () => {
  const loading = ref(false)
  const sources = ref<NutritionSource[]>([])
  const comparison = ref<SourceComparison | null>(null)

  async function fetchSources(materialId: string, includeInactive = false) {
    loading.value = true
    try {
      const data = await nutritionSourceApi.getSources(materialId, { includeInactive })
      sources.value = data
      return { success: true, data }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '获取来源数据失败'
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function fetchComparison(materialId: string) {
    loading.value = true
    try {
      const data = await nutritionSourceApi.getSourcesCompare(materialId)
      comparison.value = data
      return { success: true, data }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '获取来源对比失败'
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function addSource(materialId: string, data: {
    sourceType: string
    per100g: Record<string, number>
    sourceDetail?: string
    confidence?: string
    matchScore?: number
    notes?: string
  }) {
    try {
      await nutritionSourceApi.addSource(materialId, data)
      MessagePlugin.success('来源数据已添加')
      return { success: true }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '添加来源数据失败'
      return { success: false, message: msg }
    }
  }

  async function deleteSource(materialId: string, sourceId: string) {
    try {
      await nutritionSourceApi.deleteSource(materialId, sourceId)
      MessagePlugin.success('来源数据已删除')
      sources.value = sources.value.filter((s) => s.sourceId !== sourceId)
      return { success: true }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '删除来源数据失败'
      return { success: false, message: msg }
    }
  }

  async function setAuthoritative(materialId: string, fieldSelections: Record<string, string>) {
    try {
      const result = await nutritionSourceApi.setAuthoritative(materialId, fieldSelections)
      MessagePlugin.success('权威数据已更新')
      return { success: true, data: result }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '设定权威数据失败'
      return { success: false, message: msg }
    }
  }

  async function enrichNutrition(materialId: string, sources?: string[]) {
    loading.value = true
    try {
      const result = await nutritionSourceApi.enrichNutrition(materialId, sources)
      if (result.summary.totalFound > 0) {
        MessagePlugin.success(`已获取 ${result.summary.totalFound} 条来源数据`)
      } else if (result.summary.totalNotFound > 0) {
        MessagePlugin.info('未找到匹配的营养数据')
      }
      await fetchComparison(materialId)
      return { success: true, data: result }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '获取外部营养数据失败'
      MessagePlugin.error(msg)
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    sources,
    comparison,
    fetchSources,
    fetchComparison,
    addSource,
    deleteSource,
    setAuthoritative,
    enrichNutrition,
  }
})
