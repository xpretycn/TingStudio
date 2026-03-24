import { defineStore } from 'pinia'
import { ref } from 'vue'
import { customerApi } from '@/api/customer'
import type { Customer, CustomerForm } from '@/api/customer'

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const keyword = ref('')

  const fetchCustomers = async () => {
    loading.value = true
    try {
      const res = await customerApi.getList({
        keyword: keyword.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      customers.value = res.data.list
      total.value = res.data.pagination.total
    } catch (error) {
      console.error('获取客户列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getCustomer = async (id: string): Promise<Customer | null> => {
    try {
      const res = await customerApi.getById(id)
      return res.data
    } catch {
      return null
    }
  }

  const createCustomer = async (form: CustomerForm) => {
    loading.value = true
    try {
      await customerApi.create(form)
      await fetchCustomers()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '创建失败' }
    } finally {
      loading.value = false
    }
  }

  const updateCustomer = async (id: string, form: Partial<CustomerForm>) => {
    loading.value = true
    try {
      await customerApi.update(id, form)
      await fetchCustomers()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteCustomer = async (id: string) => {
    loading.value = true
    try {
      await customerApi.delete(id)
      await fetchCustomers()
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

  const setPage = (page: number) => {
    currentPage.value = page
  }

  return {
    customers,
    loading,
    total,
    currentPage,
    pageSize,
    keyword,
    fetchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setKeyword,
    setPage,
  }
})
