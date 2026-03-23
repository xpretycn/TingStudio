import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Material, MaterialForm, MaterialQuery, MaterialUsage } from '@/types/material'
import { storageService } from '@/api/storage'
import { useAuthStore } from './auth'

export const useMaterialStore = defineStore('material', () => {
  const authStore = useAuthStore()
  const materials = ref<Material[]>([])
  const loading = ref(false)
  const query = ref<MaterialQuery>({
    keyword: '',
    page: 1,
    pageSize: 10
  })

  const filteredMaterials = computed(() => {
    let result = materials.value

    if (query.value.keyword) {
      const keyword = query.value.keyword.toLowerCase()
      result = result.filter(
        m =>
          m.name.toLowerCase().includes(keyword) ||
          m.code.toLowerCase().includes(keyword)
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
      return materials.value.filter(
        m =>
          m.name.toLowerCase().includes(keyword) ||
          m.code.toLowerCase().includes(keyword)
      ).length
    }
    return materials.value.length
  })

  const materialUsage = computed<MaterialUsage[]>(() => {
    const userId = authStore.user?.id
    if (!userId) return []
    return storageService.getMaterialUsage(userId)
  })

  const fetchMaterials = async () => {
    loading.value = true
    try {
      const userId = authStore.user?.id
      if (userId) {
        materials.value = storageService.getMaterials(userId)
      }
    } catch (error) {
      console.error('获取原料列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getMaterial = (id: string): Material | null => {
    return storageService.getMaterial(id)
  }

  const createMaterial = async (form: MaterialForm) => {
    loading.value = true
    try {
      const userId = authStore.user?.id
      if (!userId) throw new Error('用户未登录')

      const newMaterial = storageService.createMaterial(userId, form)
      materials.value.push(newMaterial)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '创建失败' }
    } finally {
      loading.value = false
    }
  }

  const updateMaterial = async (id: string, form: Partial<MaterialForm>) => {
    loading.value = true
    try {
      const updatedMaterial = storageService.updateMaterial(id, form)
      if (updatedMaterial) {
        const index = materials.value.findIndex(m => m.id === id)
        if (index !== -1) {
          materials.value[index] = updatedMaterial
        }
        return { success: true }
      }
      return { success: false, message: '原料不存在' }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteMaterial = async (id: string) => {
    loading.value = true
    try {
      const success = storageService.deleteMaterial(id)
      if (success) {
        materials.value = materials.value.filter(m => m.id !== id)
        return { success: true }
      }
      return { success: false, message: '删除失败' }
    } catch (error: any) {
      return { success: false, message: error.message || '删除失败' }
    } finally {
      loading.value = false
    }
  }

  const setQuery = (newQuery: Partial<MaterialQuery>) => {
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
    materials,
    loading,
    query,
    filteredMaterials,
    total,
    materialUsage,
    fetchMaterials,
    getMaterial,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    setQuery,
    resetQuery
  }
})
