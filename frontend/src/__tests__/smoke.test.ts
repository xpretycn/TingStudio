import { describe, it, expect } from 'vitest'

describe('P0 基础设施冒烟测试', () => {
  it('Vitest 基础断言应正常工作', () => {
    expect(1 + 1).toBe(2)
    expect({ a: 1 }).toEqual({ a: 1 })
    expect([1, 2, 3]).toContain(2)
  })

  it('全局 API (describe/it/expect) 已注入', () => {
    expect(typeof describe).toBe('function')
    expect(typeof it).toBe('function')
    expect(typeof expect).toBe('function')
  })

  it('jsdom 环境已就绪', () => {
    expect(document.createElement('div').tagName).toBe('DIV')
    expect(window.localStorage).toBeDefined()
    expect(window.sessionStorage).toBeDefined()
  })

  it('localStorage mock 应正常工作', () => {
    localStorage.setItem('test-key', 'test-value')
    expect(localStorage.getItem('test-key')).toBe('test-value')
    expect(localStorage.getItem('nonexistent')).toBeNull()
    localStorage.clear()
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('matchMedia mock 已注册', () => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    expect(mq.matches).toBe(false)
    expect(mq.media).toBe('(prefers-color-scheme: dark)')
  })
})
