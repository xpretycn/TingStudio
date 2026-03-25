import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PaginationState {
  current: number
  pageSize: number
  total: number
  showJumper: boolean
  showSizeChanger: boolean
  pageSizeOptions: number[]
  onChange: (pageInfo: { current: number; pageSize: number }) => void
}

export const usePaginationStore = defineStore('pagination', () => {
  const current = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const visible = ref(false)
  let onChangeCallback: ((pageInfo: { current: number; pageSize: number }) => void) | null = null

  const showJumper = ref(true)
  const showSizeChanger = ref(true)
  const pageSizeOptions = ref([10, 20, 50, 100])

  // 由 Home.vue 根据可视区域高度动态计算
  const dynamicPageSize = ref(10)

  const paginationConfig = computed<PaginationState>(() => ({
    current: current.value,
    pageSize: pageSize.value,
    total: total.value,
    showJumper: showJumper.value,
    showSizeChanger: showSizeChanger.value,
    pageSizeOptions: pageSizeOptions.value,
    onChange: (pageInfo: { current: number; pageSize: number }) => {
      if (onChangeCallback) {
        onChangeCallback(pageInfo)
      }
    }
  }))

  const register = (state: {
    current: number
    pageSize: number
    total: number
    onChange: (pageInfo: { current: number; pageSize: number }) => void
  }) => {
    current.value = state.current
    pageSize.value = state.pageSize
    total.value = state.total
    onChangeCallback = state.onChange
    visible.value = true
  }

  const unregister = () => {
    visible.value = false
    onChangeCallback = null
  }

  const update = (partial: { current?: number; pageSize?: number; total?: number }) => {
    if (partial.current !== undefined) current.value = partial.current
    if (partial.pageSize !== undefined) pageSize.value = partial.pageSize
    if (partial.total !== undefined) total.value = partial.total
  }

  const setDynamicPageSize = (size: number) => {
    const clamped = Math.max(1, Math.floor(size))
    if (dynamicPageSize.value !== clamped) {
      dynamicPageSize.value = clamped
    }
  }

  return {
    current,
    pageSize,
    total,
    visible,
    showJumper,
    showSizeChanger,
    pageSizeOptions,
    dynamicPageSize,
    paginationConfig,
    register,
    unregister,
    update,
    setDynamicPageSize,
  }
})
