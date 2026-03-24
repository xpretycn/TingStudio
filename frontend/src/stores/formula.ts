import { defineStore } from 'pinia'
import { ref } from 'vue'
import { formulaApi } from '@/api/formula'
import type { Formula, FormulaForm, MaterialItem } from '@/api/formula'

export const useFormulaStore = defineStore('formula', () => {
  const formulas = ref<Formula[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const keyword = ref('')
  const customerId = ref('')

  const fetchFormulas = async () => {
    loading.value = true
    try {
      const res = await formulaApi.getList({
        keyword: keyword.value || undefined,
        customerId: customerId.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      // 解析 materialsJson
      formulas.value = res.data.list.map((f: Formula) => ({
        ...f,
        materials: parseMaterials(f),
      }))
      total.value = res.data.pagination.total
    } catch (error) {
      console.error('获取配方列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getFormula = async (id: string): Promise<Formula | null> => {
    try {
      const res = await formulaApi.getById(id)
      const formula = res.data
      return { ...formula, materials: parseMaterials(formula) }
    } catch {
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

  const setCustomerId = (val: string) => {
    customerId.value = val
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
    customerId,
    fetchFormulas,
    getFormula,
    createFormula,
    updateFormula,
    deleteFormula,
    setKeyword,
    setCustomerId,
    setPage,
  }
})

/** 解析配方的 materialsJson 字段 */
function parseMaterials(formula: Formula): MaterialItem[] {
  if (formula.materials) return formula.materials
  try {
    return formula.materialsJson ? JSON.parse(formula.materialsJson) : []
  } catch {
    return []
  }
}
