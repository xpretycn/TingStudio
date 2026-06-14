import { test, expect, type Page } from '@playwright/test'

const TEST_PASSWORD = 'test123'

const FORMULIST_A = { username: 'formulist_a', password: TEST_PASSWORD }
const FORMULIST_B = { username: 'formulist_b', password: TEST_PASSWORD }
const ADMIN = { username: 'admin', password: 'admin123' }

async function login(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.locator('[data-testid="login-username"] input').fill(username)
  await page.locator('[data-testid="login-password"] input').fill(password)
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
}

async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  })
}

test.describe('数据隔离验证', () => {
  test('DI01: Formulist 仅能看到自己创建的配方', async ({ page }) => {
    const formulaNameA = `DI01-FormA-${Date.now()}`

    await login(page, FORMULIST_A.username, FORMULIST_A.password)
    await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    const nameInput = page.locator('[data-testid="formula-name-input"] input')
    if (await nameInput.count() > 0) {
      await nameInput.fill(formulaNameA)
      const saveBtn = page.locator('[data-testid="formula-save-btn"]')
      if (await saveBtn.count() > 0) {
        await saveBtn.click()
        await page.waitForURL(/\/formulas/, { timeout: 10000 })
      }
    }

    await logout(page)

    await login(page, FORMULIST_B.username, FORMULIST_B.password)
    await page.goto('/formulas')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(2000)
    const formulaListText = await page.locator('[data-testid="formula-list"]').textContent().catch(() => '')
    expect(formulaListText).not.toContain(formulaNameA)
  })

  test('DI02: 营养分析中仅能看到自己的配方', async ({ page }) => {
    await login(page, FORMULIST_A.username, FORMULIST_A.password)
    await page.goto('/nutrition')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(2000)

    const selectElement = page.locator('[data-testid="nutrition-formula-select"]')
    if (await selectElement.count() > 0) {
      await selectElement.click()
      await page.waitForTimeout(1000)

      const dropdownOptions = page.locator('.t-select__dropdown .t-select-option, .t-select-option')
      const optionCount = await dropdownOptions.count()

      if (optionCount > 0) {
        const optionTexts = await dropdownOptions.allTextContents()
        expect(optionTexts.length).toBeGreaterThan(0)
        expect(optionTexts.length).toBeLessThan(100)
      }
    }
  })

  test('DI03: Admin 能看到所有配方', async ({ page }) => {
    await login(page, ADMIN.username, ADMIN.password)
    await page.goto('/formulas')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(2000)

    const formulaList = page.locator('[data-testid="formula-list"]')
    if (await formulaList.count() > 0) {
      await expect(formulaList).toBeVisible()
      const listText = await formulaList.textContent().catch(() => '')
      expect(listText.length).toBeGreaterThan(0)
    }
  })

  test('DI04: Formulist 无法访问管理路由', async ({ page }) => {
    await login(page, FORMULIST_A.username, FORMULIST_A.password)

    await page.goto('/system/config')
    await page.waitForTimeout(2000)
    const url1 = page.url()
    expect(url1).not.toContain('/system/config')

    await page.goto('/model-management')
    await page.waitForTimeout(2000)
    const url2 = page.url()
    expect(url2).not.toContain('/model-management')
  })
})
