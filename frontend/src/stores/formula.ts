import { defineStore } from 'pinia'
import { ref } from 'vue'
import { formulaApi } from '@/api/formula'
import type { Formula, FormulaForm, MaterialItem } from '@/api/formula'
import { formatTimestamp } from '@/utils/timeFormat'
import { MessagePlugin } from 'tdesign-vue-next'

export const useFormulaStore = defineStore('formula', () => {
  const formulas = ref<Formula[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(8)
  const keyword = ref('')
  const salesmanId = ref('')

  const fetchFormulas = async () => {
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
    } catch (error: any) {
      console.error('获取配方列表失败:', error)
      MessagePlugin.error(error.message || '获取配方数据失败，请检查网络连接')
    } finally {
      loading.value = false
    }
  }

  const getFormula = async (id: string): Promise<Formula | null> => {
    try {
      const res = await formulaApi.getById(id)
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      const formula = res
      return {
        ...formula,
        materials: parseMaterials(formula),
        description: parseDescription(formula.description),
        createdAt: formatTimestamp(formula.createdAt),
        updatedAt: formatTimestamp(formula.updatedAt),
      }
    } catch (error: any) {
      console.error('获取配方详情失败:', error)
      MessagePlugin.error(error.message || '获取配方详情失败')
      return null
    }
  }

  const createFormula = async (form: FormulaForm) => {
    loading.value = true
    try {
      await formulaApi.create(form)
      await fetchFormulas()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '创建失败' }
    } finally {
      loading.value = false
    }
  }

  const updateFormula = async (id: string, form: Partial<FormulaForm>) => {
    loading.value = true
    try {
      await formulaApi.update(id, form)
      await fetchFormulas()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteFormula = async (id: string) => {
    loading.value = true
    try {
      await formulaApi.delete(id)
      await fetchFormulas()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '删除失败' }
    } finally {
      loading.value = false
    }
  }

  const setKeyword = (val: string) => {
    keyword.value = val
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
    setSalesmanId,
    setPage,
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
