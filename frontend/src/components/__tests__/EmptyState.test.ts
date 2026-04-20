import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '@/components/EmptyState.vue'

describe('EmptyState 组件', () => {
  it('E01: 默认渲染应显示「暂无数据」标题', () => {
    const wrapper = mount(EmptyState)
    expect(wrapper.find('.empty-title').text()).toBe('暂无数据')
  })

  it('E02: 自定义 title prop 应正确显示', () => {
    const wrapper = mount(EmptyState, { props: { title: '没有找到配方' } })
    expect(wrapper.find('.empty-title').text()).toBe('没有找到配方')
  })

  it('E03: 有 description 时应渲染描述文本', () => {
    const wrapper = mount(EmptyState, {
      props: { description: '请尝试调整搜索条件' },
    })
    expect(wrapper.find('.empty-description').exists()).toBe(true)
    expect(wrapper.find('.empty-description').text()).toBe('请尝试调整搜索条件')
  })

  it('E04: 无 description 时不应渲染描述元素', () => {
    const wrapper = mount(EmptyState, { props: { description: '' } })
    expect(wrapper.find('.empty-description').exists()).toBe(false)
  })

  it('E05: action 插槽应正确渲染操作按钮', () => {
    const wrapper = mount(EmptyState, {
      slots: { action: '<button class="test-action">新建</button>' },
    })
    expect(wrapper.find('.empty-action').exists()).toBe(true)
    expect(wrapper.find('.test-action').exists()).toBe(true)
    expect(wrapper.find('.test-action').text()).toBe('新建')
  })

  it('E06: 无 action 插槽时不渲染操作区域', () => {
    const wrapper = mount(EmptyState)
    expect(wrapper.find('.empty-action').exists()).toBe(false)
  })

  it('E07: SVG 插图应存在且包含猫咪动画 class', () => {
    const wrapper = mount(EmptyState)
    const svg = wrapper.find('.empty-cat')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('viewBox')).toBe('0 0 120 120')
  })
})
