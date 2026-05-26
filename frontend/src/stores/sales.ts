import { defineStore } from 'pinia'
import { ref } from 'vue'
import { salesApi } from '@/api/sales'
import type { SaleRecord, SaleStats, DuplicateEntryData } from '@/api/sales'
import { MessagePlugin } from 'tdesign-vue-next'

export const useSalesStore = defineStore('sales', () => {
  const sales = ref<SaleRecord[]>([])
  const stats = ref<SaleStats | null>(null)
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(8)

  const fetchSales = async (params?: {
    formulaId?: string;
    salesmanId?: string;
    periodStart?: string;
    periodEnd?: string;
    keyword?: string;
    sortBy?: string;
    order?: string;
    page?: number;
    pageSize?: number;
  }) => {
    loading.value = true
    try {
      const res = await salesApi.getList({
        ...params,
        page: params?.page ?? currentPage.value,
        pageSize: params?.pageSize ?? pageSize.value,
      })
      sales.value = res.list
      total.value = res.pagination.total
    } catch (error: unknown) {
      console.error('获取销量列表失败:', error)
      MessagePlugin.error(error instanceof Error ? error.message : '获取销量数据失败')
    } finally {
      loading.value = false
    }
  }

  const fetchStats = async (params?: { periodStart?: string; periodEnd?: string }) => {
    try {
      const res = await salesApi.getStats(params)
      stats.value = res
    } catch (error: unknown) {
      console.error('获取销量统计失败:', error)
      MessagePlugin.error(error instanceof Error ? error.message : '获取销量统计失败')
    }
  }

  const createSale = async (data: {
    formulaId: string;
    salesmanId?: string;
    periodType?: 'monthly' | 'quarterly' | 'yearly';
    periodStart: string;
    quantity: number;
    revenue: number;
    notes?: string;
    mergeMode?: 'accumulate' | 'replace';
  }) => {
    try {
      const res = await salesApi.create(data, { _silent: true })
      MessagePlugin.success('销量记录创建成功')
      return { success: true as const, data: res }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { code?: string; data?: unknown } } }
      if (err.response?.status === 409 && err.response?.data?.code === 'DUPLICATE_ENTRY') {
        return { success: false as const, code: 'DUPLICATE_ENTRY' as const, data: err.response.data.data as DuplicateEntryData }
      }
      console.error('创建销量记录失败:', error)
      MessagePlugin.error(error instanceof Error ? error.message : '创建销量记录失败')
      return { success: false as const, code: 'UNKNOWN' as const, data: null }
    }
  }

  const updateSale = async (id: string, data: { quantity?: number; revenue?: number; notes?: string }) => {
    try {
      const res = await salesApi.update(id, data)
      MessagePlugin.success('销量记录更新成功')
      return res
    } catch (error: unknown) {
      console.error('更新销量记录失败:', error)
      MessagePlugin.error(error instanceof Error ? error.message : '更新销量记录失败')
      return null
    }
  }

  const deleteSale = async (id: string) => {
    try {
      await salesApi.delete(id)
      MessagePlugin.success('销量记录删除成功')
      return true
    } catch (error: unknown) {
      console.error('删除销量记录失败:', error)
      MessagePlugin.error(error instanceof Error ? error.message : '删除销量记录失败')
      return false
    }
  }

  const getSalesByFormula = async (formulaId: string) => {
    try {
      const res = await salesApi.getByFormula(formulaId)
      return res
    } catch (error: unknown) {
      console.error('获取配方销量历史失败:', error)
      return []
    }
  }

  return {
    sales,
    stats,
    loading,
    total,
    currentPage,
    pageSize,
    fetchSales,
    fetchStats,
    createSale,
    updateSale,
    deleteSale,
    getSalesByFormula,
  }
})
