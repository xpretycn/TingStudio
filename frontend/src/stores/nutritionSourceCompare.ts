import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { nutritionSourceApi } from '@/api/nutritionSource'
import type { NutritionSource, SourceComparison } from '@/api/nutritionSource'
import {
  nutritionSourceBatchApi,
  type ScoredSource,
  type SourceWithScore,
  type BatchStrategy,
} from '@/api/nutritionSourceBatch'

export type CompareViewType = 'overview' | 'value' | 'deviation' | 'history'

export interface SourceFilters {
  sourceTypes: string[]
  confidences: string[]
  diffRange: [number, number]
  dateRange: [string, string]
}

/**
 * 多数投票：根据 material_nutrition.field_sources_json 推断"当前主用来源 ID"。
 * 27 个营养素字段中，出现频次最高的 sourceId 视为"当前主用"。
 * - 返回 null 当无 fieldSources 数据或所有 sourceId 各只出现 1 次且不为单一 source
 */
function computeMajorityAuthoritative(
  fieldSources: Record<string, { sourceId: string; sourceType: string; sourceDetail: string }> | undefined | null,
): string | null {
  if (!fieldSources) return null
  const entries = Object.values(fieldSources)
  if (entries.length === 0) return null
  const counts = new Map<string, number>()
  for (const e of entries) {
    counts.set(e.sourceId, (counts.get(e.sourceId) ?? 0) + 1)
  }
  let maxId: string | null = null
  let maxCount = 0
  for (const [id, c] of counts) {
    if (c > maxCount) {
      maxCount = c
      maxId = id
    }
  }
  // 仅当该 sourceId 覆盖了超过 50% 的字段才认作主用，避免误判
  if (maxCount / entries.length < 0.5) return null
  return maxId
}

export const useNutritionSourceCompareStore = defineStore('nutritionSourceCompare', () => {
  const materialId = ref<string>('')
  const sources = ref<NutritionSource[]>([])
  const scoredSources = ref<SourceWithScore[]>([])
  const comparison = ref<SourceComparison | null>(null)
  const recommendation = ref<ScoredSource | null>(null)
  /** top N 主用推荐候选（默认取前 3） */
  const recommendCandidates = ref<ScoredSource[]>([])
  /**
   * 当前主用来源 ID：通过对 authoritative.fieldSources 做多数投票计算。
   * 27 个营养素字段中如果 100% 来自同一个 sourceId，则该 sourceId 即为"当前主用"。
   * 如果来自多个 source，则取出现频次最高者（"字段主用" source）。
   */
  const currentAuthoritativeSourceId = ref<string | null>(null)
  const loading = ref(false)
  const exportLoading = ref(false)

  const selectedSourceIds = ref<string[]>([])
  const activeView = ref<CompareViewType>('overview')
  const selectedNutrientField = ref<string | null>(null)

  const filters = ref<SourceFilters>({
    sourceTypes: [],
    confidences: [],
    diffRange: [0, 20],
    dateRange: ['', ''],
  })

  const activeSources = computed(() => sources.value.filter((s) => s.isActive === 1))

  const filteredSources = computed(() => {
    return scoredSources.value.filter((s) => {
      if (filters.value.sourceTypes.length > 0 && !filters.value.sourceTypes.includes(s.sourceType)) {
        return false
      }
      if (filters.value.confidences.length > 0 && !filters.value.confidences.includes(s.confidence)) {
        return false
      }
      if (filters.value.dateRange[0] && new Date(s.createdAt) < new Date(filters.value.dateRange[0])) {
        return false
      }
      if (filters.value.dateRange[1] && new Date(s.createdAt) > new Date(filters.value.dateRange[1])) {
        return false
      }
      return true
    })
  })

  const filteredSourceIds = computed(() => new Set(filteredSources.value.map((s) => s.sourceId)))

  const visibleNutrients = computed(() => {
    if (!comparison.value) return []
    return comparison.value.nutrients
  })

  const summary = computed(() => comparison.value?.summary ?? null)

  function resetForNewMaterial(id: string) {
    materialId.value = id
    sources.value = []
    scoredSources.value = []
    comparison.value = null
    recommendation.value = null
    recommendCandidates.value = []
    currentAuthoritativeSourceId.value = null
    selectedSourceIds.value = []
    activeView.value = 'overview'
    selectedNutrientField.value = null
    filters.value = {
      sourceTypes: [],
      confidences: [],
      diffRange: [0, 20],
      dateRange: ['', ''],
    }
  }

  async function fetchAll(materialIdParam: string) {
    if (!materialIdParam) return
    loading.value = true
    try {
      const [sourcesRes, scoredRes, compareRes, recommendRes] = await Promise.all([
        nutritionSourceApi.getSources(materialIdParam),
        nutritionSourceBatchApi.getScoredSources(materialIdParam),
        nutritionSourceApi.getSourcesCompare(materialIdParam),
        nutritionSourceBatchApi.getRecommendation(materialIdParam).catch(() => null),
      ])
      sources.value = sourcesRes
      scoredSources.value = scoredRes.sources
      comparison.value = compareRes
      recommendation.value = recommendRes?.recommendation ?? null
      // 多数投票：计算 currentAuthoritativeSourceId
      currentAuthoritativeSourceId.value = computeMajorityAuthoritative(compareRes?.authoritative?.fieldSources)
      // 取后端返回的 top 候选，默认 3 个；后端若未排序则按 totalScore 降序
      const sortedCandidates = (recommendRes?.sources ?? []).slice()
      sortedCandidates.sort((a, b) => b.totalScore - a.totalScore)
      recommendCandidates.value = sortedCandidates.slice(0, 3)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '加载营养数据来源失败'
      MessagePlugin.error(msg)
    } finally {
      loading.value = false
    }
  }

  function setView(view: CompareViewType) {
    activeView.value = view
  }

  function setSelectedNutrient(field: string | null) {
    selectedNutrientField.value = field
  }

  function toggleSourceSelection(sourceId: string) {
    const idx = selectedSourceIds.value.indexOf(sourceId)
    if (idx >= 0) {
      selectedSourceIds.value.splice(idx, 1)
    } else {
      selectedSourceIds.value.push(sourceId)
    }
  }

  function clearSelection() {
    selectedSourceIds.value = []
  }

  function setFilters(next: Partial<SourceFilters>) {
    filters.value = { ...filters.value, ...next }
  }

  function resetFilters() {
    filters.value = {
      sourceTypes: [],
      confidences: [],
      diffRange: [0, 20],
      dateRange: ['', ''],
    }
  }

  async function batchSetAuthoritative(payload: { strategy: BatchStrategy; sourceIds?: string[]; fieldSelections?: Record<string, string> }) {
    if (!materialId.value) return { success: false, message: '原料ID为空' }
    try {
      const result = await nutritionSourceBatchApi.batchSetAuthoritative(materialId.value, payload)
      MessagePlugin.success('已批量设为主用值')
      await fetchAll(materialId.value)
      return { success: true, data: result }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '批量设为主用失败'
      MessagePlugin.error(msg)
      return { success: false, message: msg }
    }
  }

  async function batchArchive(sourceIds: string[]) {
    if (!materialId.value || sourceIds.length === 0) return { success: false, message: '参数无效' }
    try {
      await nutritionSourceBatchApi.batchArchive(materialId.value, sourceIds)
      MessagePlugin.success(`已归档 ${sourceIds.length} 个来源`)
      selectedSourceIds.value = []
      await fetchAll(materialId.value)
      return { success: true }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '批量归档失败'
      MessagePlugin.error(msg)
      return { success: false, message: msg }
    }
  }

  async function batchRestore(sourceIds: string[]) {
    if (!materialId.value || sourceIds.length === 0) return { success: false, message: '参数无效' }
    try {
      await nutritionSourceBatchApi.batchRestore(materialId.value, sourceIds)
      MessagePlugin.success(`已恢复 ${sourceIds.length} 个来源`)
      selectedSourceIds.value = []
      await fetchAll(materialId.value)
      return { success: true }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '批量恢复失败'
      MessagePlugin.error(msg)
      return { success: false, message: msg }
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function exportAs(format: 'excel' | 'pdf') {
    if (!materialId.value) return
    exportLoading.value = true
    try {
      const blob = (await nutritionSourceBatchApi.exportSources(materialId.value, format)) as Blob
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const filename = `nutrition-sources-${materialId.value}-${Date.now()}.${ext}`
      downloadBlob(blob, filename)
      MessagePlugin.success(`已导出 ${format.toUpperCase()} 报告`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '导出失败'
      MessagePlugin.error(msg)
    } finally {
      exportLoading.value = false
    }
  }

  return {
    materialId,
    sources,
    scoredSources,
    comparison,
    recommendation,
    recommendCandidates,
    currentAuthoritativeSourceId,
    loading,
    exportLoading,
    selectedSourceIds,
    activeView,
    selectedNutrientField,
    filters,
    activeSources,
    filteredSources,
    filteredSourceIds,
    visibleNutrients,
    summary,
    resetForNewMaterial,
    fetchAll,
    setView,
    setSelectedNutrient,
    toggleSourceSelection,
    clearSelection,
    setFilters,
    resetFilters,
    batchSetAuthoritative,
    batchArchive,
    batchRestore,
    exportAs,
  }
})
