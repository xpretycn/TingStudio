import { defineStore } from 'pinia'
import { ref } from 'vue'
import { materialApi } from '@/api/material'
import type { Material, MaterialForm } from '@/api/material'
import { formatTimestamp } from '@/utils/timeFormat'
import { usePaginationStore } from '@/stores/pagination'

export const useMaterialStore = defineStore('material', () => {
  const materials = ref<Material[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const keyword = ref('')

  const fetchMaterials = async () => {
    loading.value = true
    try {
      const { dynamicPageSize } = usePaginationStore()
      pageSize.value = dynamicPageSize
      const res = await materialApi.getList({
        keyword: keyword.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      materials.value = res.data.list.map((m: Material) => ({
        ...m,
        createdAt: formatTimestamp(m.createdAt),
        updatedAt: formatTimestamp(m.updatedAt),
      }))
      total.value = res.data.pagination.total
    } catch (error) {
      console.error('获取原料列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const getMaterial = async (id: string): Promise<Material | null> => {
    try {
      const res = await materialApi.getById(id)
      return res.data
    } catch {
      return null
    }
  }

  const createMaterial = async (form: MaterialForm) => {
    loading.value = true
    try {
      const res = await materialApi.create(form)
      await fetchMaterials()
      return { success: true, data: res.data?.data }
    } catch (error: any) {
      return { success: false, message: error.message || '创建失败' }
    } finally {
      loading.value = false
    }
  }

  const updateMaterial = async (id: string, form: Partial<MaterialForm>) => {
    loading.value = true
    try {
      await materialApi.update(id, form)
      await fetchMaterials()
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const deleteMaterial = async (id: string) => {
    loading.value = true
    try {
      await materialApi.delete(id)
      await fetchMaterials()
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

  /** 获取全部原料（用于下拉选择，不分页） */
  const allMaterials = ref<Material[]>([])

  const fetchAllForSelect = async () => {
    if (allMaterials.value.length > 0) return
    loading.value = true
    try {
      const res = await materialApi.getList({ page: 1, pageSize: 9999 })
      allMaterials.value = res.data.list
    } catch (error) {
      console.error('获取全部原料失败:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    materials,
    allMaterials,
    loading,
    total,
    currentPage,
    pageSize,
    keyword,
    fetchMaterials,
    fetchAllForSelect,
    getMaterial,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    setKeyword,
    setPage,
  }
})
