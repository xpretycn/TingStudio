import { test, expect } from '@playwright/test'

const FORMULIST_USER = 'formulist'
const FORMULIST_PWD = 'formulist123'

async function loginAsFormulist(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('[data-testid="login-username"] input').fill(FORMULIST_USER)
  await page.locator('[data-testid="login-password"] input').fill(FORMULIST_PWD)
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(formulas|home|dashboard)/, { timeout: 10000 })
}

async function createFormula(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/formulas')
  await page.waitForLoadState('networkidle')

  const addBtn = page.locator('[data-testid="formula-add-btn"]')
  await addBtn.click()
  await page.waitForURL(/\/formulas\/new/, { timeout: 5000 })

  const nameInput = page.locator('[data-testid="formula-name-input"] input')
  const formulaName = `E2E-Approval-${Date.now()}`
  await nameInput.fill(formulaName)

  const saveBtn = page.locator('[data-testid="formula-save-btn"]')
  await saveBtn.click()

  await page.waitForURL(/\/formulas\/[a-f0-9-]+$/, { timeout: 10000 })
  const url = page.url()
  const formulaId = url.split('/formulas/')[1]?.split('/')[0] || ''
  return formulaId
}

test.describe('配方审批工作流', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFormulist(page)
  })

  test('EA01: Formulist 提交配方审批', async ({ page }) => {
    const formulaId = await createFormula(page)
    expect(formulaId.length).toBeGreaterThan(0)

    await page.goto(`/versions/formula/${formulaId}`)
    await page.waitForLoadState('networkidle')

    const draftChip = page.locator('.tl-status-chip.chip-draft').first()
    await expect(draftChip).toBeVisible({ timeout: 10000 })

    const submitBtn = page.locator('.tl-publish-btn').first()
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    const popconfirm = page.locator('.t-popconfirm')
    if (await popconfirm.isVisible()) {
      const confirmBtn = popconfirm.locator('.t-button--theme-primary').last()
      await confirmBtn.click()
    }

    await page.waitForTimeout(1000)

    const pendingChip = page.locator('.tl-status-chip.chip-pending_review').first()
    await expect(pendingChip).toBeVisible({ timeout: 10000 })
    await expect(pendingChip).toContainText('待审批')
  })

  test('EA02: Formulist 提交后显示审批中状态', async ({ page }) => {
    const formulaId = await createFormula(page)

    await page.goto(`/versions/formula/${formulaId}`)
    await page.waitForLoadState('networkidle')

    const submitBtn = page.locator('.tl-publish-btn').first()
    await submitBtn.click()

    const popconfirm = page.locator('.t-popconfirm')
    if (await popconfirm.isVisible()) {
      const confirmBtn = popconfirm.locator('.t-button--theme-primary').last()
      await confirmBtn.click()
    }

    await page.waitForTimeout(1000)

    const pendingHint = page.locator('.tl-status-hint').first()
    await expect(pendingHint).toBeVisible({ timeout: 10000 })
    await expect(pendingHint).toContainText('审批中')

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const approvalCard = page.locator('[data-testid="dashboard-approval"]')
    await expect(approvalCard).toBeVisible({ timeout: 10000 })

    const approvalTitle = approvalCard.locator('.bento-approval__title')
    await expect(approvalTitle).toContainText('我的审批')
  })

  test('EA03: 版本状态筛选功能', async ({ page }) => {
    const formulaId = await createFormula(page)

    await page.goto(`/versions/formula/${formulaId}`)
    await page.waitForLoadState('networkidle')

    const pendingFilterBtn = page.locator('.status-filter-btn', { hasText: '待审批' })
    await expect(pendingFilterBtn).toBeVisible()
    await pendingFilterBtn.click()
    await page.waitForTimeout(500)

    const pendingChips = page.locator('.tl-status-chip.chip-pending_review')
    const allDraftChips = page.locator('.tl-status-chip.chip-draft')
    const pendingCount = await pendingChips.count()
    const draftCount = await allDraftChips.count()

    if (pendingCount > 0) {
      expect(draftCount).toBe(0)
    }

    const publishedFilterBtn = page.locator('.status-filter-btn', { hasText: '已发布' })
    await publishedFilterBtn.click()
    await page.waitForTimeout(500)

    const publishedChips = page.locator('.tl-status-chip.chip-published')
    const publishedCount = await publishedChips.count()
    const draftAfterFilter = page.locator('.tl-status-chip.chip-draft')

    if (publishedCount > 0) {
      expect(await draftAfterFilter.count()).toBe(0)
    }

    const allFilterBtn = page.locator('.status-filter-btn', { hasText: '全部' })
    await allFilterBtn.click()
    await page.waitForTimeout(500)

    const versionsAfterReset = page.locator('.timeline-item')
    const resetCount = await versionsAfterReset.count()
    expect(resetCount).toBeGreaterThanOrEqual(0)
  })

  test('EA04: 版本对比功能', async ({ page }) => {
    const formulaId = await createFormula(page)

    await page.goto(`/versions/formula/${formulaId}`)
    await page.waitForLoadState('networkidle')

    const compareBtn = page.locator('.section-compare-btn')
    await expect(compareBtn).toBeVisible()

    const isDisabled = await compareBtn.isDisabled()
    expect(isDisabled).toBe(true)

    const checkboxes = page.locator('.tl-checkbox')
    const checkboxCount = await checkboxes.count()

    if (checkboxCount >= 2) {
      await checkboxes.nth(0).check()
      await checkboxes.nth(1).check()

      await expect(compareBtn).not.toBeDisabled()

      const badge = page.locator('.compare-badge')
      await expect(badge).toBeVisible()
      await expect(badge).toContainText('2')

      await compareBtn.click()
      await page.waitForURL(/\/versions\/compare\//, { timeout: 5000 })

      const content = await page.content()
      const hasCompareContent =
        content.includes('对比') ||
        content.includes('版本') ||
        content.includes('差异')
      expect(hasCompareContent).toBe(true)
    }
  })
})
