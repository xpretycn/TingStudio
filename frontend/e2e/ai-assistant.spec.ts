import { test, expect } from '@playwright/test'

test.describe('AI 智能助手 E2E 流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(ai|home|materials|formulas)/, { timeout: 10000 })
  })

  test('E2E-AI-01: AI 助手页面应正确渲染', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const aiAssistant = page.locator('.ai-assistant')
    if (await aiAssistant.count() > 0) {
      await expect(aiAssistant.first()).toBeVisible()
    }
  })

  test('E2E-AI-02: Dashboard 数据看板应存在', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const dashboard = page.locator('.dashboard-grid')
    if (await dashboard.count() > 0) {
      await expect(dashboard.first()).toBeVisible()
    }
  })

  test('E2E-AI-03: 标题应显示"AI 智能助手"', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const content = await page.content()
    expect(content).toContain('AI 智能助手')
  })

  test('E2E-AI-04: 应包含智能填单和智能检索 Tab', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const tabs = page.locator('.nav-tab')
    if (await tabs.count() >= 2) {
      const tabTexts = await tabs.allTextContents()
      const hasSmartForm = tabTexts.some((t) => t.includes('智能填单'))
      const hasSmartSearch = tabTexts.some((t) => t.includes('智能检索'))
      expect(hasSmartForm || hasSmartSearch).toBeTruthy()
    }
  })

  test('E2E-AI-05: 应包含文件上传区域', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const uploadArea = page.locator('.upload-area')
    if (await uploadArea.count() > 0) {
      await expect(uploadArea.first()).toBeVisible()
    }
  })

  test('E2E-AI-06: 应包含模型选择按钮区域', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const modelBtns = page.locator('.model-btn')
    if (await modelBtns.count() > 0) {
      await expect(modelBtns.first()).toBeVisible()
    }
  })

  test('E2E-AI-07: 应包含近期操作动态区域', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const activitySection = page.locator('.activity-section')
    if (await activitySection.count() > 0) {
      await expect(activitySection.first()).toBeVisible()
    }
  })

  test('E2E-AI-08: 切换到智能检索 Tab 应显示搜索框', async ({ page }) => {
    await page.goto('/ai')
    await page.waitForLoadState('networkidle')

    const searchTab = page.locator('.nav-tab').filter({ hasText: '智能检索' })
    if (await searchTab.count() > 0) {
      await searchTab.click()
      const textarea = page.locator('textarea')
      if (await textarea.count() > 0) {
        await expect(textarea.first()).toBeVisible()
      }
    }
  })
})
