import { defineStore } from 'pinia'
import { ref } from 'vue'
import { formulaApi } from '@/api/formula'
import type { Formula, FormulaForm, MaterialItem } from '@/api/formula'
import { formatTimestamp } from '@/utils/timeFormat'
import { MessagePlugin } from 'tdesign-vue-next'

// 缓存有效期：30分钟（毫秒）
const CACHE_DURATION = 30 * 60 * 1000

export const useFormulaStore = defineStore('formula', () => {
  const formulas = ref<Formula[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(8)
  const keyword = ref('')
  const salesmanId = ref('')
  
  // 缓存相关状态
  const lastFetchTime = ref(0)
  const isCacheValid = ref(false)
  const lastQueryKey = ref('')

  // 计算当前查询条件键值
  const getQueryKey = () => `${keyword.value}-${salesmanId.value}-${currentPage.value}-${pageSize.value}`

  // 检查缓存是否有效（需要同时满足：时间有效 + 查询条件一致）
  const checkCacheValid = (): boolean => {
    const now = Date.now()
    return isCacheValid.value && 
           (now - lastFetchTime.value) < CACHE_DURATION && 
           getQueryKey() === lastQueryKey.value
  }

  const fetchFormulas = async (forceRefresh = false) => {
    const currentQueryKey = getQueryKey()
    
    // 如果不是强制刷新且缓存有效（时间未过期 + 查询条件一致），则直接使用缓存
    if (!forceRefresh && checkCacheValid()) {
      return
    }
    
    loading.value = true
    try {
      const res = await formulaApi.getList({
        keyword: keyword.value || undefined,
        salesmanId: salesmanId.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      // 解析 materialsJson、description 并格式化时间
      formulas.value = res.list.map((f: Formula) => ({
        ...f,
        materials: parseMaterials(f),
        description: parseDescription(f.description),
        createdAt: formatTimestamp(f.createdAt),
        updatedAt: formatTimestamp(f.updatedAt),
      }))
      total.value = res.pagination.total
      
      // 更新缓存信息
      lastFetchTime.value = Date.now()
      isCacheValid.value = true
      lastQueryKey.value = currentQueryKey
    } catch (error: unknown) {
      console.error('获取配方列表失败:', error)
      MessagePlugin.error(error instanceof Error ? error.message : '获取配方数据失败，请检查网络连接')
    } finally {
      loading.value = false
    }
  }

  // 强制刷新缓存
  const refreshFormulas = async () => {
    await fetchFormulas(true)
  }

  // 失效缓存（同步，组件刷新前调用，确保重新挂载时从 API 拉取）
  const invalidateCache = (): void => {
    isCacheValid.value = false
    lastFetchTime.value = 0
    lastQueryKey.value = ''
  }

  // 获取缓存年龄（毫秒）
  const getCacheAge = (): number => {
    if (!isCacheValid.value) return 0
    return Date.now() - lastFetchTime.value
  }

  // 更新单个配方项
  const updateFormulaItem = async (id: string, updatedFormula?: Formula) => {
    // 如果提供了更新后的配方，直接更新缓存
    if (updatedFormula) {
      const index = formulas.value.findIndex(f => f.id === id)
      if (index !== -1) {
        formulas.value[index] = {
          ...updatedFormula,
          materials: parseMaterials(updatedFormula),
          description: parseDescription(updatedFormula.description),
          createdAt: formatTimestamp(updatedFormula.createdAt),
          updatedAt: formatTimestamp(updatedFormula.updatedAt),
        }
      }
    } else {
      // 否则重新获取该配方详情更新缓存
      try {
        const formula = await formulaApi.getById(id)
        const index = formulas.value.findIndex(f => f.id === id)
        if (index !== -1) {
          formulas.value[index] = {
            ...formula,
            materials: parseMaterials(formula),
            description: parseDescription(formula.description),
            createdAt: formatTimestamp(formula.createdAt),
            updatedAt: formatTimestamp(formula.updatedAt),
          }
        }
      } catch (error: unknown) {
        console.error('更新配方缓存失败:', error)
      }
    }
  }

  const getFormula = async (id: string): Promise<Formula | null> => {
    try {
      const res = await formulaApi.getById(id)
      const formula = res
      return {
        ...formula,
        materials: parseMaterials(formula),
        description: parseDescription(formula.description),
        createdAt: formatTimestamp(formula.createdAt),
        updatedAt: formatTimestamp(formula.updatedAt),
      }
    } catch (error: unknown) {
      console.error('获取配方详情失败:', error)
      MessagePlugin.error(error instanceof Error ? error.message : '获取配方详情失败')
      return null
    }
  }

  const createFormula = async (form: FormulaForm) => {
    loading.value = true
    try {
      const data = await formulaApi.create(form)
      // 创建新配方后强制刷新缓存
      await fetchFormulas(true)
      return { success: true, data }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '创建失败' }
    } finally {
      loading.value = false
    }
  }

  const updateFormula = async (id: string, form: Partial<FormulaForm>) => {
    loading.value = true
    try {
      await formulaApi.update(id, form)
      // 更新后失效缓存，确保下次 fetch 从后端拉最新数据
      isCacheValid.value = false
      lastFetchTime.value = 0
      lastQueryKey.value = ''
      // 同时更新本地单项，提供即时反馈
      await updateFormulaItem(id)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteFormula = async (id: string) => {
    loading.value = true
    try {
      await formulaApi.delete(id)
      // 删除后清除缓存，下次 fetchFormulas 会重新请求后端
      isCacheValid.value = false
      lastFetchTime.value = 0
      lastQueryKey.value = ''

      // 从本地数组移除该配方（创建新引用触发 sortedFormulas watch）
      formulas.value = formulas.value.filter(f => f.id !== id)
      total.value = Math.max(0, total.value - 1)

      // 如果当前页数据被删空且页码超出范围，自动回退到有效页码
      const totalPages = Math.ceil(total.value / pageSize.value) || 1
      if (formulas.value.length === 0 && currentPage.value > totalPages) {
        currentPage.value = Math.max(1, totalPages)
      }

      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '删除失败' }
    } finally {
      loading.value = false
    }
  }

  const setKeyword = (val: string) => {
    keyword.value = val
    currentPage.value = 1
  }

  const clearKeyword = (): void => {
    keyword.value = ''
    currentPage.value = 1
  }

  const setSalesmanId = (val: string) => {
    salesmanId.value = val
    currentPage.value = 1
  }

  const setPage = (page: number) => {
    currentPage.value = page
  }

  return {
    formulas,
    loading,
    total,
    currentPage,
    pageSize,
    keyword,
    salesmanId,
    fetchFormulas,
    getFormula,
    createFormula,
    updateFormula,
    deleteFormula,
    setKeyword,
    clearKeyword,
    setSalesmanId,
    setPage,
    refreshFormulas,
    invalidateCache,
    updateFormulaItem,
    getCacheAge,
  }
})

/** 解析配方的 materialsJson 字段（防御双重序列化） */
function parseMaterials(formula: Formula): MaterialItem[] {
  if (formula.materials) return formula.materials
  if (!formula.materialsJson) return []

  try {
    const parsed = JSON.parse(formula.materialsJson)
    // 防御双重序列化：解析结果可能是字符串（如 "[[{...}]]"）
    if (typeof parsed === 'string') {
      return JSON.parse(parsed)
    }
    // 确保返回数组
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 解析 description 字段（可能是 JSON 字符串或纯文本） */
export function parseDescription(raw: string | null | undefined): string {
  if (!raw) return ''
  if (typeof raw !== 'string') return String(raw)
  // 尝试解析 JSON，提取可读摘要
  try {
    const obj = JSON.parse(raw)
    if (typeof obj === 'object' && obj !== null) {
      const parts: string[] = []
      if (obj.productType) parts.push(obj.productType)
      if (obj.dosage) parts.push(obj.dosage)
      if (obj.efficacy) parts.push(obj.efficacy)
      if (obj.totalQuote != null) parts.push(`报价: ¥${obj.totalQuote.toFixed(4)}`)
      return parts.length > 0 ? parts.join(' | ') : raw
    }
    return raw
  } catch {
    return raw
  }
}
