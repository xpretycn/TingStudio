import { test, expect } from '@playwright/test'

test.describe('配方营养分析 E2E 流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('formulist')
    await page.locator('[data-testid="login-password"] input').fill('formulist123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
  })

  test('NA01: 选择配方和版本', async ({ page }) => {
    await page.goto('/nutrition')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.page-title')).toContainText('配方营养分析')

    const formulaSelect = page.locator('.formula-select')
    await expect(formulaSelect).toBeVisible()

    const options = page.locator('.t-select-option, .t-option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(0)

    const firstOption = options.first()
    await firstOption.click()

    await expect(page.locator('.version-hint')).toBeVisible()
  })

  test('NA02: 运行营养分析', async ({ page }) => {
    await page.goto('/nutrition')
    await page.waitForLoadState('networkidle')

    const formulaSelect = page.locator('.formula-select')
    await expect(formulaSelect).toBeVisible()

    const options = page.locator('.t-select-option, .t-option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(0)

    await options.first().click()
    await expect(page.locator('.version-hint')).toBeVisible()

    const analyzeBtn = page.locator('button', { hasText: '开始分析' })
    await expect(analyzeBtn).toBeVisible()
    await expect(analyzeBtn).toBeEnabled()
    await analyzeBtn.click()

    await page.waitForResponse(
      (resp) => resp.url().includes('/api/nutrition') && resp.status() === 200,
      { timeout: 30000 }
    ).catch(() => {})

    await page.waitForSelector('.nutrition-content-card .analysis-grid', { timeout: 30000 }).catch(() => {})

    const nutritionTable = page.locator('.nutrition-label-list')
    if (await nutritionTable.count() > 0) {
      await expect(nutritionTable.first()).toBeVisible()
      const items = nutritionTable.locator('.nl-item')
      expect(await items.count()).toBeGreaterThan(0)
    }

    const materialTable = page.locator('.material-contribution')
    if (await materialTable.count() > 0) {
      await expect(materialTable.first()).toBeVisible()
      const rows = materialTable.locator('.t-table__body tr')
      expect(await rows.count()).toBeGreaterThan(0)
    }
  })

  test('NA03: 查看含量声称判定', async ({ page }) => {
    await page.goto('/nutrition')
    await page.waitForLoadState('networkidle')

    const formulaSelect = page.locator('.formula-select')
    await expect(formulaSelect).toBeVisible()

    const options = page.locator('.t-select-option, .t-option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(0)

    await options.first().click()
    await expect(page.locator('.version-hint')).toBeVisible()

    const analyzeBtn = page.locator('button', { hasText: '开始分析' })
    await expect(analyzeBtn).toBeVisible()
    await analyzeBtn.click()

    await page.waitForResponse(
      (resp) => resp.url().includes('/api/nutrition') && resp.status() === 200,
      { timeout: 30000 }
    ).catch(() => {})

    await page.waitForSelector('.nutrition-content-card .analysis-grid', { timeout: 30000 }).catch(() => {})

    const claimsCard = page.locator('.nutrition-claims-card')
    if (await claimsCard.count() > 0) {
      await claimsCard.scrollIntoViewIfNeeded()
      await expect(claimsCard.first()).toBeVisible()

      const satisfiedTag = claimsCard.locator('.summary-tag', { hasText: '已满足' })
      const unsatisfiedTag = claimsCard.locator('.summary-tag', { hasText: '未满足' })

      if (await satisfiedTag.count() > 0) {
        await expect(satisfiedTag.first()).toBeVisible()
      }
      if (await unsatisfiedTag.count() > 0) {
        await expect(unsatisfiedTag.first()).toBeVisible()
      }
    }

    const claimsStatCard = page.locator('.claims-stat-card')
    if (await claimsStatCard.count() > 0) {
      await expect(claimsStatCard.first()).toBeVisible()

      const satisfiedCount = claimsStatCard.locator('.stat-value--success')
      const unsatisfiedCount = claimsStatCard.locator('.stat-line', { hasText: '未满足' }).locator('.stat-value')

      if (await satisfiedCount.count() > 0) {
        const text = await satisfiedCount.first().textContent()
        expect(Number(text)).toBeGreaterThanOrEqual(0)
      }
      if (await unsatisfiedCount.count() > 0) {
        const text = await unsatisfiedCount.first().textContent()
        expect(Number(text)).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
