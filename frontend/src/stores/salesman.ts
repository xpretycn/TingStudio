import { defineStore } from 'pinia'
import { ref } from 'vue'
import { salesmanApi } from '@/api/salesman'
import type { Salesman, SalesmanForm } from '@/api/salesman'

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
      const res = await salesmanApi.getList({
        keyword: keyword.value || undefined,
        status: statusFilter.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      salesmen.value = res.data.list
      total.value = res.data.pagination.total
    } catch (error) {
      console.error('获取业务员列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getSalesman = async (id: string): Promise<Salesman | null> => {
    try {
      const res = await salesmanApi.getById(id)
      return res.data
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

  const linkCustomer = async (salesmanId: string, data: { customerId: string; relationType?: string; startDate?: string; notes?: string }) => {
    try {
      await salesmanApi.linkCustomer(salesmanId, data)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '关联失败' }
    }
  }

  const unlinkCustomer = async (relationId: string) => {
    try {
      await salesmanApi.unlinkCustomer(relationId)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '取消关联失败' }
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
    linkCustomer,
    unlinkCustomer,
    setKeyword,
    setStatusFilter,
    setPage,
  }
})
