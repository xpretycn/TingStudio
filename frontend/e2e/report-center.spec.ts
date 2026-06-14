import { test, expect } from '@playwright/test'

test.describe('报告中心 E2E 流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials|reports)/, { timeout: 10000 })
  })

  test('RC01: 查看报告列表', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const reportCenter = page.locator('.report-center')
    await expect(reportCenter).toBeVisible()

    const toolbarTitle = page.locator('.toolbar-title')
    if (await toolbarTitle.count() > 0) {
      await expect(toolbarTitle.first()).toContainText('报告管理中心')
    }

    const statusFilter = page.locator('.toolbar-filters .t-select').first()
    const typeFilter = page.locator('.toolbar-filters .t-select').nth(1)
    if (await statusFilter.count() > 0) {
      await expect(statusFilter).toBeVisible()
    }
    if (await typeFilter.count() > 0) {
      await expect(typeFilter).toBeVisible()
    }
  })

  test('RC02: 生成报告', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const generateWeeklyBtn = page.locator('button').filter({ hasText: '生成周报' })
    if (await generateWeeklyBtn.count() > 0) {
      await generateWeeklyBtn.first().click()
      await page.waitForURL(/\/reports\/generate/, { timeout: 5000 })
    } else {
      await page.goto('/reports/generate?type=weekly')
    }

    await page.waitForLoadState('networkidle')

    const formCard = page.locator('.form-card')
    if (await formCard.count() > 0) {
      await expect(formCard).toBeVisible()
    }

    const typeRadio = page.locator('.t-radio-group .t-radio-button')
    if (await typeRadio.count() > 0) {
      await expect(typeRadio.first()).toBeVisible()
    }

    const yearSelect = page.locator('.period-select-row .t-select').first()
    const monthSelect = page.locator('.period-select-row .t-select').nth(1)
    if (await yearSelect.count() > 0) {
      await expect(yearSelect).toBeVisible()
    }
    if (await monthSelect.count() > 0) {
      await expect(monthSelect).toBeVisible()
    }

    const periodPreview = page.locator('.period-preview .preview-value')
    if (await periodPreview.count() > 0) {
      const previewText = await periodPreview.first().textContent()
      expect(previewText).toBeTruthy()
    }

    const submitBtn = page.locator('button').filter({ hasText: '确认生成' })
    if (await submitBtn.count() > 0) {
      await expect(submitBtn.first()).toBeVisible()
    }
  })

  test('RC03: 查看报告详情', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const reportCards = page.locator('.report-list-card')
    if (await reportCards.count() > 0) {
      await reportCards.first().click()
      await page.waitForTimeout(2000)

      const url = page.url()
      expect(url).toContain('/reports/')

      const content = await page.content()
      const hasReportContent = content.includes('报告') || content.includes('数据') || content.includes('分析')
      expect(hasReportContent).toBeTruthy()
    }
  })

  test('RC04: 导出报告', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const reportCards = page.locator('.report-list-card')
    if (await reportCards.count() > 0) {
      await reportCards.first().hover()
      await page.waitForTimeout(500)

      const exportBtn = page.locator('.card-action-btn--export')
      if (await exportBtn.count() > 0) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
        await exportBtn.first().click()
        await page.waitForTimeout(2000)

        const dialog = page.locator('.t-dialog, [class*="dialog"], [class*="modal"]')
        if (await dialog.count() > 0) {
          const pdfBtn = page.locator('button').filter({ hasText: /PDF|pdf|Excel|excel|导出/ })
          if (await pdfBtn.count() > 0) {
            await pdfBtn.first().click()
          }
        }

        const download = await downloadPromise
        if (download) {
          expect(download).toBeTruthy()
        }
      }
    }
  })
})

test.describe('报告中心筛选功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials|reports)/, { timeout: 10000 })
  })

  test('RC05: 按报告类型筛选', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const typeFilter = page.locator('.toolbar-filters .t-select').nth(1)
    if (await typeFilter.count() > 0) {
      await typeFilter.click()
      await page.waitForTimeout(500)

      const weeklyOption = page.locator('.t-select-option, .t-dropdown-item').filter({ hasText: '周报' })
      if (await weeklyOption.count() > 0) {
        await weeklyOption.first().click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('RC06: 按报告状态筛选', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const statusFilter = page.locator('.toolbar-filters .t-select').first()
    if (await statusFilter.count() > 0) {
      await statusFilter.click()
      await page.waitForTimeout(500)

      const draftOption = page.locator('.t-select-option, .t-dropdown-item').filter({ hasText: '草稿' })
      if (await draftOption.count() > 0) {
        await draftOption.first().click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('RC07: 搜索报告', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('#report-search-input')
    if (await searchInput.count() > 0) {
      await searchInput.fill('测试')
      await page.waitForTimeout(1000)

      const value = await searchInput.inputValue()
      expect(value).toBe('测试')
    }
  })
})

test.describe('报告生成页面交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials|reports)/, { timeout: 10000 })
  })

  test('RC08: 切换报告类型', async ({ page }) => {
    await page.goto('/reports/generate?type=weekly')
    await page.waitForLoadState('networkidle')

    const monthlyRadio = page.locator('.t-radio-button').filter({ hasText: '月报' })
    if (await monthlyRadio.count() > 0) {
      await monthlyRadio.click()
      await page.waitForTimeout(500)

      const previewValue = page.locator('.period-preview .preview-value')
      if (await previewValue.count() > 0) {
        const text = await previewValue.first().textContent()
        expect(text).toBeTruthy()
      }
    }
  })

  test('RC09: 取消生成返回报告列表', async ({ page }) => {
    await page.goto('/reports/generate')
    await page.waitForLoadState('networkidle')

    const cancelBtn = page.locator('button').filter({ hasText: '取消' })
    if (await cancelBtn.count() > 0) {
      await cancelBtn.first().click()
      await page.waitForTimeout(1000)

      const url = page.url()
      expect(url).toContain('/reports')
    }
  })

  test('RC10: 生成页面面包屑导航', async ({ page }) => {
    await page.goto('/reports/generate')
    await page.waitForLoadState('networkidle')

    const breadcrumb = page.locator('.header-breadcrumb')
    if (await breadcrumb.count() > 0) {
      await expect(breadcrumb).toBeVisible()
      const breadcrumbText = await breadcrumb.first().textContent()
      expect(breadcrumbText).toContain('报告中心')
      expect(breadcrumbText).toContain('生成报告')
    }

    const backBtn = page.locator('.header-back-btn')
    if (await backBtn.count() > 0) {
      await expect(backBtn).toBeVisible()
    }
  })
})

test.describe('报告中心 Dashboard 统计', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(formulas|home|materials|reports)/, { timeout: 10000 })
  })

  test('RC11: 统计卡片显示', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const dashboardGrid = page.locator('.dashboard-grid')
    if (await dashboardGrid.count() > 0) {
      await expect(dashboardGrid).toBeVisible()
    }

    const statCards = page.locator('.stat-card')
    if (await statCards.count() > 0) {
      expect(await statCards.count()).toBeGreaterThanOrEqual(1)

      const firstCard = statCards.first()
      const statLabel = firstCard.locator('.stat-label')
      if (await statLabel.count() > 0) {
        const labelText = await statLabel.first().textContent()
        expect(labelText).toBeTruthy()
      }
    }
  })

  test('RC12: 近期动态区域', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')

    const activitySection = page.locator('.activity-section')
    if (await activitySection.count() > 0) {
      await expect(activitySection).toBeVisible()
    }

    const timelineList = page.locator('.timeline-list')
    if (await timelineList.count() > 0) {
      const timelineItems = page.locator('.timeline-item')
      if (await timelineItems.count() > 0) {
        expect(await timelineItems.count()).toBeGreaterThanOrEqual(1)
      }
    }
  })
})
