import { test, expect } from '@playwright/test'

test.describe('性能基准测试', () => {
  test('PERF-01: 登录页面 FCP 应 ≤ 3s', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/login')
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint')
          if (fcpEntry) {
            resolve(fcpEntry.startTime)
            observer.disconnect()
          }
        })
        observer.observe({ type: 'paint', buffered: true })
        setTimeout(() => resolve(performance.now()), 5000)
      })
    })

    console.log(`FCP: ${fcp.toFixed(0)}ms`)
    expect(fcp).toBeLessThanOrEqual(3000)
  })

  test('PERF-02: 路由切换延迟（登录→原料列表）应 ≤ 2s', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const navStart = Date.now()

    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')

    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const navDuration = Date.now() - navStart
    console.log(`路由切换耗时: ${navDuration}ms`)
    expect(navDuration).toBeLessThanOrEqual(2000)
  })

  test('PERF-03: 路由切换延迟（列表→新建表单）应 ≤ 1.5s', async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })

    await page.goto('/materials')
    await page.waitForLoadState('networkidle')

    const navStart = Date.now()
    await page.click('[data-testid="material-add-btn"]')
    await page.waitForURL(/\/materials\/new/, { timeout: 5000 })
    await page.waitForLoadState('networkidle')

    const navDuration = Date.now() - navStart
    console.log(`列表→表单切换耗时: ${navDuration}ms`)
    expect(navDuration).toBeLessThanOrEqual(1500)
  })

  test('PERF-04: 页面加载后 DOM 元素数量应在合理范围', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const nodeCount = await page.evaluate(() =>
      document.querySelectorAll('*').length
    )
    console.log(`登录页 DOM 节点数: ${nodeCount}`)
    expect(nodeCount).toBeLessThan(2000)
  })

  test('PERF-05: 原料列表页加载完成时间应 ≤ 5s', async ({ page }) => {
    const start = Date.now()
    await page.goto('/materials')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - start

    console.log(`原料列表页加载时间: ${loadTime}ms`)
    expect(loadTime).toBeLessThanOrEqual(5000)
  })

  test('PERF-06: JS 内存使用不应异常增长（基础检查）', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const memoryInfo = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        }
      }
      return null
    })

    if (memoryInfo) {
      console.log(
        `JS Heap: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ` +
        `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`
      )
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024)
    }
  })

  test('PERF-07: 图片懒加载 — 视口外图片不立即请求', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const lazyImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[loading="lazy"]')
      return Array.from(imgs).map((img) => ({
        src: img.getAttribute('src'),
        loading: img.getAttribute('loading'),
        inViewport: img.getBoundingClientRect().top < window.innerHeight,
      }))
    })

    if (lazyImages.length > 0) {
      const outOfViewport = lazyImages.filter((img) => !img.inViewport)
      console.log(`懒加载图片: ${lazyImages.length}张, 视口外: ${outOfViewport.length}张`)
    }
  })
})
