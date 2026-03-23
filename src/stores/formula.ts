import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Formula, FormulaForm, FormulaQuery } from '@/types/formula'
import { storageService } from '@/api/storage'
import { useAuthStore } from './auth'

export const useFormulaStore = defineStore('formula', () => {
  const authStore = useAuthStore()
  const formulas = ref<Formula[]>([])
  const loading = ref(false)
  const query = ref<FormulaQuery>({
    keyword: '',
    customerId: '',
    materialId: '',
    page: 1,
    pageSize: 10
  })

  const filteredFormulas = computed(() => {
    let result = formulas.value

    if (query.value.keyword) {
      const keyword = query.value.keyword.toLowerCase()
      result = result.filter(
        f =>
          f.name.toLowerCase().includes(keyword) ||
          f.customerName.toLowerCase().includes(keyword)
      )
    }

    if (query.value.customerId) {
      result = result.filter(f => f.customerId === query.value.customerId)
    }

    if (query.value.materialId) {
      result = result.filter(f =>
        f.materials.some(m => m.materialId === query.value.materialId)
      )
    }

    const { page, pageSize } = query.value
    const start = ((page || 1) - 1) * (pageSize || 10)
    const end = start + (pageSize || 10)

    return result.slice(start, end)
  })

  const total = computed(() => {
    let result = formulas.value

    if (query.value.keyword) {
      const keyword = query.value.keyword.toLowerCase()
      result = result.filter(
        f =>
          f.name.toLowerCase().includes(keyword) ||
          f.customerName.toLowerCase().includes(keyword)
      )
    }

    if (query.value.customerId) {
      result = result.filter(f => f.customerId === query.value.customerId)
    }

    if (query.value.materialId) {
      result = result.filter(f =>
        f.materials.some(m => m.materialId === query.value.materialId)
      )
    }

    return result.length
  })

  const fetchFormulas = async () => {
    loading.value = true
    try {
      const userId = authStore.user?.id
      if (userId) {
        formulas.value = storageService.getFormulas(userId)
      }
    } catch (error) {
      console.error('获取配方列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getFormula = (id: string): Formula | null => {
    return storageService.getFormula(id)
  }

  const createFormula = async (form: FormulaForm) => {
    loading.value = true
    try {
      const userId = authStore.user?.id
      if (!userId) throw new Error('用户未登录')

      const newFormula = storageService.createFormula(userId, form)
      formulas.value.push(newFormula)
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
      const updatedFormula = storageService.updateFormula(id, form)
      if (updatedFormula) {
        const index = formulas.value.findIndex(f => f.id === id)
        if (index !== -1) {
          formulas.value[index] = updatedFormula
        }
        return { success: true }
      }
      return { success: false, message: '配方不存在' }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteFormula = async (id: string) => {
    loading.value = true
    try {
      const success = storageService.deleteFormula(id)
      if (success) {
        formulas.value = formulas.value.filter(f => f.id !== id)
        return { success: true }
      }
      return { success: false, message: '删除失败' }
    } catch (error: any) {
      return { success: false, message: error.message || '删除失败' }
    } finally {
      loading.value = false
    }
  }

  const getFormulasByCustomer = (customerId: string): Formula[] => {
    return storageService.getFormulasByCustomer(customerId)
  }

  const setQuery = (newQuery: Partial<FormulaQuery>) => {
    query.value = { ...query.value, ...newQuery }
  }

  const resetQuery = () => {
    query.value = {
      keyword: '',
      customerId: '',
      materialId: '',
      page: 1,
      pageSize: 10
    }
  }

  return {
    formulas,
    loading,
    query,
    filteredFormulas,
    total,
    fetchFormulas,
    getFormula,
    createFormula,
    updateFormula,
    deleteFormula,
    getFormulasByCustomer,
    setQuery,
    resetQuery
  }
})
