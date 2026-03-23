import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Customer, CustomerForm, CustomerQuery } from '@/types/customer'
import { storageService } from '@/api/storage'
import { useAuthStore } from './auth'

export const useCustomerStore = defineStore('customer', () => {
  const authStore = useAuthStore()
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const query = ref<CustomerQuery>({
    keyword: '',
    page: 1,
    pageSize: 10
  })

  const filteredCustomers = computed(() => {
    let result = customers.value

    if (query.value.keyword) {
      const keyword = query.value.keyword.toLowerCase()
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(keyword) ||
          c.contact?.toLowerCase().includes(keyword) ||
          c.phone?.toLowerCase().includes(keyword) ||
          c.email?.toLowerCase().includes(keyword)
      )
    }

    const { page, pageSize } = query.value
    const start = ((page || 1) - 1) * (pageSize || 10)
    const end = start + (pageSize || 10)

    return result.slice(start, end)
  })

  const total = computed(() => {
    if (query.value.keyword) {
      const keyword = query.value.keyword.toLowerCase()
      return customers.value.filter(
        c =>
          c.name.toLowerCase().includes(keyword) ||
          c.contact?.toLowerCase().includes(keyword) ||
          c.phone?.toLowerCase().includes(keyword) ||
          c.email?.toLowerCase().includes(keyword)
      ).length
    }
    return customers.value.length
  })

  const fetchCustomers = async () => {
    loading.value = true
    try {
      const userId = authStore.user?.id
      if (userId) {
        customers.value = storageService.getCustomers(userId)
      }
    } catch (error) {
      console.error('获取客户列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getCustomer = (id: string): Customer | null => {
    return storageService.getCustomer(id)
  }

  const createCustomer = async (form: CustomerForm) => {
    loading.value = true
    try {
      const userId = authStore.user?.id
      if (!userId) throw new Error('用户未登录')

      const newCustomer = storageService.createCustomer(userId, form)
      customers.value.push(newCustomer)
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
      const updatedCustomer = storageService.updateCustomer(id, form)
      if (updatedCustomer) {
        const index = customers.value.findIndex(c => c.id === id)
        if (index !== -1) {
          customers.value[index] = updatedCustomer
        }
        return { success: true }
      }
      return { success: false, message: '客户不存在' }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteCustomer = async (id: string) => {
    loading.value = true
    try {
      const success = storageService.deleteCustomer(id)
      if (success) {
        customers.value = customers.value.filter(c => c.id !== id)
        return { success: true }
      }
      return { success: false, message: '删除失败' }
    } catch (error: any) {
      return { success: false, message: error.message || '删除失败' }
    } finally {
      loading.value = false
    }
  }

  const setQuery = (newQuery: Partial<CustomerQuery>) => {
    query.value = { ...query.value, ...newQuery }
  }

  const resetQuery = () => {
    query.value = {
      keyword: '',
      page: 1,
      pageSize: 10
    }
  }

  return {
    customers,
    loading,
    query,
    filteredCustomers,
    total,
    fetchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setQuery,
    resetQuery
  }
})
