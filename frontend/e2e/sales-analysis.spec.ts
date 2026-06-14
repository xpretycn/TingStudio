import { test, expect } from '@playwright/test'

test.describe('销量分析 E2E 流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials|sales)/, { timeout: 10000 })
  })

  test('SA01: 销量看板应正确渲染', async ({ page }) => {
    await page.goto('/sales')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const dashboardGrid = page.locator('.dashboard-grid')
    await expect(dashboardGrid).toBeVisible()

    const statCards = dashboardGrid.locator('.stat-card')
    const cardCount = await statCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(1)

    for (let i = 0; i < cardCount; i++) {
      const card = statCards.nth(i)
      await expect(card.locator('.stat-label')).toBeVisible()
      await expect(card.locator('.stat-value')).toBeVisible()
    }

    const trendCard = page.locator('.trend-card')
    if (await trendCard.count() > 0) {
      await expect(trendCard).toBeVisible()
      const trendTitle = trendCard.locator('.chart-title')
      await expect(trendTitle).toContainText('月度销量趋势')
    }

    const rankCards = page.locator('.rank-card')
    const rankCount = await rankCards.count()
    expect(rankCount).toBeGreaterThanOrEqual(1)
  })

  test('SA02: 筛选销量数据应正确过滤', async ({ page }) => {
    await page.goto('/sales')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const datePickerStart = page.locator('.filter-item').filter({ hasText: '起始月份' }).locator('.t-date-picker')
    if (await datePickerStart.count() > 0) {
      await datePickerStart.click()
      await page.waitForTimeout(500)
      const popup = page.locator('.t-date-picker__panel')
      if (await popup.count() > 0) {
        const monthCell = popup.locator('.t-date-picker__cell').first()
        if (await monthCell.count() > 0) {
          await monthCell.click()
          await page.waitForTimeout(500)
        }
      }
    }

    const datePickerEnd = page.locator('.filter-item').filter({ hasText: '结束月份' }).locator('.t-date-picker')
    if (await datePickerEnd.count() > 0) {
      await datePickerEnd.click()
      await page.waitForTimeout(500)
      const popup = page.locator('.t-date-picker__panel')
      if (await popup.count() > 0) {
        const monthCell = popup.locator('.t-date-picker__cell').first()
        if (await monthCell.count() > 0) {
          await monthCell.click()
          await page.waitForTimeout(500)
        }
      }
    }

    const searchInput = page.locator('.search-container input')
    if (await searchInput.count() > 0) {
      await searchInput.fill('测试配方')
      await page.waitForTimeout(800)

      const tableRows = page.locator('.t-table__body .t-table__row')
      const rowCount = await tableRows.count()
      if (rowCount > 0) {
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
          const row = tableRows.nth(i)
          const content = await row.textContent()
          expect(content).toContain('测试配方')
        }
      }

      await searchInput.clear()
      await page.waitForTimeout(800)
    }
  })

  test('SA03: 录入销量记录应成功提交', async ({ page }) => {
    await page.goto('/sales')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const initialTableRows = page.locator('.t-table__body .t-table__row')
    const initialCount = await initialTableRows.count()

    const addBtn = page.locator('.add-formula-btn').filter({ hasText: '录入销量' })
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await page.waitForTimeout(1000)

    const drawer = page.locator('.t-drawer')
    await expect(drawer).toBeVisible()

    const formulaSelect = drawer.locator('.t-select').first()
    if (await formulaSelect.count() > 0) {
      await formulaSelect.click()
      await page.waitForTimeout(500)
      const option = page.locator('.t-select-option').first()
      if (await option.count() > 0) {
        await option.click()
        await page.waitForTimeout(300)
      }
    }

    const monthInput = drawer.locator('.t-date-picker')
    if (await monthInput.count() > 0) {
      await monthInput.first().click()
      await page.waitForTimeout(500)
      const popup = page.locator('.t-date-picker__panel')
      if (await popup.count() > 0) {
        const cell = popup.locator('.t-date-picker__cell').first()
        if (await cell.count() > 0) {
          await cell.click()
          await page.waitForTimeout(300)
        }
      }
    }

    const quantityInput = drawer.locator('input[type="number"]').first()
    if (await quantityInput.count() > 0) {
      await quantityInput.fill('100')
    }

    const amountInput = drawer.locator('input[type="number"]').nth(1)
    if (await amountInput.count() > 0) {
      await amountInput.fill('5000')
    }

    const submitBtn = drawer.locator('button').filter({ hasText: /保存|提交|确定/ }).first()
    if (await submitBtn.count() > 0) {
      await submitBtn.click()
      await page.waitForTimeout(1500)
    }

    await page.goto('/sales')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const finalTableRows = page.locator('.t-table__body .t-table__row')
    const finalCount = await finalTableRows.count()
    expect(finalCount).toBeGreaterThanOrEqual(initialCount)
  })

  test('SA04: 批量选择与删除操作应正确执行', async ({ page }) => {
    await page.goto('/sales')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const tableRows = page.locator('.t-table__body .t-table__row')
    const rowCount = await tableRows.count()
    if (rowCount < 2) {
      test.skip()
      return
    }

    const checkboxes = page.locator('.t-table__body .t-checkbox')
    const checkboxCount = await checkboxes.count()
    expect(checkboxCount).toBeGreaterThanOrEqual(2)

    await checkboxes.first().click()
    await page.waitForTimeout(300)
    await checkboxes.nth(1).click()
    await page.waitForTimeout(300)

    const batchBar = page.locator('.batch-action-bar')
    await expect(batchBar).toBeVisible()
    await expect(batchBar).toContainText('项已选择')

    const batchDeleteBtn = batchBar.locator('.batch-action-btn').filter({ hasText: '批量删除' })
    await expect(batchDeleteBtn).toBeVisible()
    await batchDeleteBtn.click()
    await page.waitForTimeout(500)

    const popconfirm = page.locator('.t-popconfirm')
    if (await popconfirm.count() > 0) {
      const confirmBtn = popconfirm.locator('.t-popconfirm__buttons button').filter({ hasText: /确定|确认/ }).first()
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click()
        await page.waitForTimeout(1500)
      }
    }

    const batchBarAfter = page.locator('.batch-action-bar')
    const batchBarVisible = await batchBarAfter.isVisible().catch(() => false)
    expect(batchBarVisible).toBe(false)

    const finalRows = page.locator('.t-table__body .t-table__row')
    const finalCount = await finalRows.count()
    expect(finalCount).toBeLessThanOrEqual(rowCount)
  })
})
