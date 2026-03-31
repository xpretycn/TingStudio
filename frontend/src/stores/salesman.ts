import { defineStore } from 'pinia'
import { ref } from 'vue'
import { salesmanApi } from '@/api/salesman'
import type { Salesman, SalesmanForm } from '@/api/salesman'
import { formatTimestamp } from '@/utils/timeFormat'
import { usePaginationStore } from '@/stores/pagination'

export const useSalesmanStore = defineStore('salesman', () => {
  const salesmen = ref<Salesman[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const keyword = ref('')
  const statusFilter = ref('')

  const fetchSalesmen = async () => {
    loading.value = true
    try {
      const { dynamicPageSize } = usePaginationStore()
      pageSize.value = dynamicPageSize
      const res = await salesmanApi.getList({
        keyword: keyword.value || undefined,
        status: statusFilter.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      salesmen.value = res.list.map((s: Salesman) => ({
        ...s,
        createdAt: formatTimestamp(s.createdAt),
        updatedAt: formatTimestamp(s.updatedAt),
      }))
      total.value = res.pagination.total
    } catch (error) {
      console.error('获取业务员列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getSalesman = async (id: string): Promise<Salesman | null> => {
    try {
      const res = await salesmanApi.getById(id)
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      return res
    } catch {
      return null
    }
  }

  const createSalesman = async (form: SalesmanForm) => {
    loading.value = true
    try {
      await salesmanApi.create(form)
      await fetchSalesmen()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '创建失败' }
    } finally {
      loading.value = false
    }
  }

  const updateSalesman = async (id: string, form: Partial<SalesmanForm & { status?: string }>) => {
    loading.value = true
    try {
      await salesmanApi.update(id, form)
      await fetchSalesmen()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteSalesman = async (id: string) => {
    loading.value = true
    try {
      await salesmanApi.delete(id)
      await fetchSalesmen()
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

  const setStatusFilter = (val: string) => {
    statusFilter.value = val
    currentPage.value = 1
  }

  const setPage = (page: number) => {
    currentPage.value = page
  }

  return {
    salesmen,
    loading,
    total,
    currentPage,
    pageSize,
    keyword,
    statusFilter,
    fetchSalesmen,
    getSalesman,
    createSalesman,
    updateSalesman,
    deleteSalesman,
    setKeyword,
    setStatusFilter,
    setPage,
  }
})
