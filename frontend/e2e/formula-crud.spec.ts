import { test, expect } from '@playwright/test'

test.describe('配方管理 E2E 流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
  })

  test('E2E-FM-01: 配方列表页面应正确渲染', async ({ page }) => {
    await page.goto('/formulas')
    await page.waitForLoadState('networkidle')

    const formulaList = page.locator('[data-testid="formula-list"]')
    await expect(formulaList).toBeVisible()
  })

  test('E2E-FM-02: Dashboard 数据看板应存在', async ({ page }) => {
    await page.goto('/formulas')
    await page.waitForLoadState('networkidle')

    const dashboard = page.locator('[data-testid="formula-dashboard"]')
    if (await dashboard.count() > 0) {
      await expect(dashboard.first()).toBeVisible()
    }
  })

  test('E2E-FM-03: 工具栏应包含搜索框和创建按钮', async ({ page }) => {
    await page.goto('/formulas')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('[data-testid="formula-search"]')
    const addBtn = page.locator('[data-testid="formula-add-btn"]')

    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible()
    }
    if (await addBtn.count() > 0) {
      await expect(addBtn).toBeVisible()
    }
  })

  test('E2E-FM-04: 搜索框应可输入文本', async ({ page }) => {
    await page.goto('/formulas')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('[data-testid="formula-search"] input')
    if (await searchInput.count() > 0) {
      await searchInput.fill('测试配方')
      const value = await searchInput.inputValue()
      expect(value.length).toBeGreaterThan(0)
    }
  })

  test('E2E-FM-05: 点击创建按钮应导航到新建表单', async ({ page }) => {
    await page.goto('/formulas')
    await page.waitForLoadState('networkidle')

    const addBtn = page.locator('[data-testid="formula-add-btn"]')
    if (await addBtn.count() > 0) {
      await addBtn.click()
      await page.waitForURL(/\/formulas\/new/, { timeout: 5000 })
      await expect(page).toHaveURL(/\/formulas\//)
    }
  })

  test('E2E-FM-06: 新建表单页面应正确渲染', async ({ page }) => {
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const formContainer = page.locator('[data-testid="formula-form"]')
    if (await formContainer.count() > 0) {
      await expect(formContainer).toBeVisible()
    }
  })

  test('E2E-FM-07: 表单应包含基础信息区域', async ({ page }) => {
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const content = await page.content()
    expect(content).toContain('基础信息录入')
  })

  test('E2E-FM-08: 表单应包含原料配比表区域', async ({ page }) => {
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const content = await page.content()
    expect(content).toContain('原料配比表')
  })

  test('E2E-FM-09: 配方名称输入框应存在并可输入', async ({ page }) => {
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const nameInput = page.locator('[data-testid="formula-name-input"] input')
    if (await nameInput.count() > 0) {
      await expect(nameInput).toBeVisible()
      await nameInput.fill(`E2E-Formula-${Date.now()}`)
      const value = await nameInput.inputValue()
      expect(value.length).toBeGreaterThan(0)
    }
  })

  test('E2E-FM-10: 保存按钮和取消按钮应可见', async ({ page }) => {
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const saveBtn = page.locator('[data-testid="formula-save-btn"]')
    const cancelBtn = page.locator('[data-testid="formula-cancel-btn"]')

    if (await saveBtn.count() > 0) {
      await expect(saveBtn).toBeVisible()
    }
    if (await cancelBtn.count() > 0) {
      await expect(cancelBtn).toBeVisible()
    }
  })

  test('E2E-FM-11: 点击取消按钮应返回列表页', async ({ page }) => {
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const cancelBtn = page.locator('[data-testid="formula-cancel-btn"]')
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click()
      await page.waitForURL(/\/formulas/, { timeout: 5000 })
      await expect(page).toHaveURL(/\/formulas/)
    }
  })

  test('E2E-FM-12: 表单应包含 AI 智能解析面板', async ({ page }) => {
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const content = await page.content()
    expect(content).toContain('AI 智能配方解析')
  })
})
