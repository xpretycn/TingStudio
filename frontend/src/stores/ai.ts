import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aiApi } from '@/api/ai'
import type { AIModel, ParsedFormula, SearchResult } from '@/api/ai'

export const useAiStore = defineStore('ai', () => {
  // ─── 模型列表 ───
  const models = ref<AIModel[]>([])
  const allModels = ref<AIModel[]>([])
  const selectedModel = ref('')

  // ─── 智能填单 ───
  const parseLoading = ref(false)
  const parseResult = ref<ParsedFormula | null>(null)
  const parseError = ref('')

  // ─── 智能检索 ───
  const searchLoading = ref(false)
  const searchResult = ref<SearchResult | null>(null)
  const searchError = ref('')
  const searchHistory = ref<string[]>([])

  /** 加载模型列表 */
  const fetchModels = async () => {
    try {
      const res = await aiApi.getModels()
      models.value = res.available
      allModels.value = res.all
      // 默认选中第一个可用模型
      if (!selectedModel.value && res.available.length > 0) {
        selectedModel.value = res.available[0].provider
      }
    } catch (error: any) {
      console.error('[AI Store] 获取模型列表失败:', error)
    }
  }

  /** AI 解析配方文件 */
  const parseFormula = async (file: File) => {
    if (!selectedModel.value) return
    parseLoading.value = true
    parseResult.value = null
    parseError.value = ''
    try {
      const res = await aiApi.parseFormula(file, selectedModel.value)
      parseResult.value = res
    } catch (error: any) {
      parseError.value = error?.response?.data?.message || error.message || 'AI 解析失败'
    } finally {
      parseLoading.value = false
    }
  }

  /** 自然语言检索 */
  const naturalSearch = async (queryText: string) => {
    if (!selectedModel.value || !queryText.trim()) return
    searchLoading.value = true
    searchResult.value = null
    searchError.value = ''
    try {
      const res = await aiApi.naturalSearch(queryText, selectedModel.value)
      searchResult.value = res
      // 记录搜索历史（最多保留 10 条）
      const history = [queryText, ...searchHistory.value.filter(h => h !== queryText)]
      searchHistory.value = history.slice(0, 10)
    } catch (error: any) {
      searchError.value = error?.response?.data?.message || error.message || 'AI 检索失败'
    } finally {
      searchLoading.value = false
    }
  }

  /** 清空解析结果 */
  const clearParseResult = () => {
    parseResult.value = null
    parseError.value = ''
  }

  /** 清空检索结果 */
  const clearSearchResult = () => {
    searchResult.value = null
    searchError.value = ''
  }

  return {
    models,
    allModels,
    selectedModel,
    parseLoading,
    parseResult,
    parseError,
    searchLoading,
    searchResult,
    searchError,
    searchHistory,
    fetchModels,
    parseFormula,
    naturalSearch,
    clearParseResult,
    clearSearchResult,
  }
})
