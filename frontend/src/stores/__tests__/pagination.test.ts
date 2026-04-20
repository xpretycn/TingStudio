import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePaginationStore } from '@/stores/pagination'

describe('usePaginationStore', () => {
  let store: ReturnType<typeof usePaginationStore>
  let mockOnChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePaginationStore()
    mockOnChange = vi.fn()
  })

  it('PG01: 初始状态 current=1, pageSize=10, total=0', () => {
    expect(store.current).toBe(1)
    expect(store.pageSize).toBe(10)
    expect(store.total).toBe(0)
    expect(store.visible).toBe(false)
  })

  it('PG02: register 注册分页状态', () => {
    store.register({
      current: 2,
      pageSize: 20,
      total: 100,
      onChange: mockOnChange,
    })

    expect(store.current).toBe(2)
    expect(store.pageSize).toBe(20)
    expect(store.total).toBe(100)
    expect(store.visible).toBe(true)
  })

  it('PG03: paginationConfig 包含 onChange 回调', () => {
    store.register({ current: 1, pageSize: 10, total: 50, onChange: mockOnChange })

    const config = store.paginationConfig
    expect(config.current).toBe(1)
    expect(config.pageSize).toBe(10)
    expect(config.total).toBe(50)
    expect(typeof config.onChange).toBe('function')
  })

  it('PG04: paginationConfig.onChange 调用注册的回调', () => {
    store.register({ current: 1, pageSize: 10, total: 50, onChange: mockOnChange })

    store.paginationConfig.onChange({ current: 3, pageSize: 10 })

    expect(mockOnChange).toHaveBeenCalledWith({ current: 3, pageSize: 10 })
  })

  it('PG05: unregister 清除状态和回调', () => {
    store.register({ current: 1, pageSize: 10, total: 50, onChange: mockOnChange })
    store.unregister()

    expect(store.visible).toBe(false)
    store.paginationConfig.onChange({ current: 5, pageSize: 20 })
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('PG06: update 部分更新字段', () => {
    store.update({ current: 5 })
    expect(store.current).toBe(5)

    store.update({ total: 200, pageSize: 20 })
    expect(store.total).toBe(200)
    expect(store.pageSize).toBe(20)
  })

  it('PG07: update 不传 undefined 字段时不改变原值', () => {
    store.current = 3
    store.update({ total: 99 })
    expect(store.current).toBe(3)
    expect(store.total).toBe(99)
  })

  it('PG08: showJumper / showSizeChanger / pageSizeOptions 默认值正确', () => {
    expect(store.showJumper).toBe(true)
    expect(store.showSizeChanger).toBe(true)
    expect(store.pageSizeOptions).toEqual([10, 20, 50, 100])
  })
})
