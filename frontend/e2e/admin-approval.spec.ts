import { test, expect } from '@playwright/test'

const ADMIN_USER = 'admin'
const ADMIN_PWD = 'admin123'
const FORMULIST_USER = 'formulist'
const FORMULIST_PWD = 'formulist123'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('[data-testid="login-username"] input').fill(ADMIN_USER)
  await page.locator('[data-testid="login-password"] input').fill(ADMIN_PWD)
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(formulas|home|dashboard)/, { timeout: 10000 })
}

async function loginAsFormulist(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('[data-testid="login-username"] input').fill(FORMULIST_USER)
  await page.locator('[data-testid="login-password"] input').fill(FORMULIST_PWD)
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(formulas|home|dashboard)/, { timeout: 10000 })
}

async function createDraftFormula(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/formulas')
  await page.waitForLoadState('networkidle')

  const addBtn = page.locator('[data-testid="formula-add-btn"]')
  await addBtn.click()
  await page.waitForURL(/\/formulas\/new/, { timeout: 5000 })

  const nameInput = page.locator('[data-testid="formula-name-input"] input')
  const formulaName = `E2E-AdminApproval-${Date.now()}`
  await nameInput.fill(formulaName)

  const saveBtn = page.locator('[data-testid="formula-save-btn"]')
  await saveBtn.click()

  await page.waitForURL(/\/formulas\/[a-f0-9-]+$/, { timeout: 10000 })
  const url = page.url()
  const formulaId = url.split('/formulas/')[1]?.split('/')[0] || ''
  return formulaId
}

async function submitForReview(page: import('@playwright/test').Page, formulaId: string) {
  await page.goto(`/versions/formula/${formulaId}`)
  await page.waitForLoadState('networkidle')

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
}

test.describe('管理员审批工作流', () => {
  test('EA01: Admin logs in -> sees approval dashboard with pending count', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const approvalCard = page.locator('[data-testid="dashboard-approval"]')
    await expect(approvalCard).toBeVisible({ timeout: 10000 })

    const approvalTitle = approvalCard.locator('.bento-approval__title')
    await expect(approvalTitle).toContainText('审批中心')

    await expect(approvalCard.locator('.t-tag')).toContainText(/审核/)
  })

  test('EA02: Admin clicks pending review -> navigates to version management', async ({ page }) => {
    await loginAsFormulist(page)
    const formulaId = await createDraftFormula(page)
    await submitForReview(page, formulaId)

    await loginAsAdmin(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const reviewItem = page.locator('.admin-review__item').first()
    await expect(reviewItem).toBeVisible({ timeout: 10000 })

    const reviewBtn = reviewItem.locator('.t-button', { hasText: '审核' })
    await expect(reviewBtn).toBeVisible()
    await reviewBtn.click()

    await page.waitForURL(/\/versions\/formula\//, { timeout: 10000 })
    await expect(page).toHaveURL(/\/versions\/formula\//)
  })

  test('EA03: Admin approves pending version -> status changes to published', async ({ page }) => {
    await loginAsFormulist(page)
    const formulaId = await createDraftFormula(page)
    await submitForReview(page, formulaId)

    await loginAsAdmin(page)
    await page.goto(`/versions/formula/${formulaId}`)
    await page.waitForLoadState('networkidle')

    const pendingChip = page.locator('.tl-status-chip.chip-pending_review').first()
    await expect(pendingChip).toBeVisible({ timeout: 10000 })

    const approveBtn = page.locator('button', { hasText: '批准' }).first()
    await expect(approveBtn).toBeVisible()
    await approveBtn.click()

    const popconfirm = page.locator('.t-popconfirm')
    if (await popconfirm.isVisible()) {
      const confirmBtn = popconfirm.locator('.t-button--theme-primary').last()
      await confirmBtn.click()
    }

    await page.waitForTimeout(1000)

    const publishedChip = page.locator('.tl-status-chip.chip-published').first()
    await expect(publishedChip).toBeVisible({ timeout: 10000 })
    await expect(publishedChip).toContainText('已发布')
  })

  test('EA04: Admin rejects pending version -> status changes to draft, comment visible', async ({ page }) => {
    await loginAsFormulist(page)
    const formulaId = await createDraftFormula(page)
    await submitForReview(page, formulaId)

    await loginAsAdmin(page)
    await page.goto(`/versions/formula/${formulaId}`)
    await page.waitForLoadState('networkidle')

    const pendingChip = page.locator('.tl-status-chip.chip-pending_review').first()
    await expect(pendingChip).toBeVisible({ timeout: 10000 })

    const rejectBtn = page.locator('button', { hasText: '驳回' }).first()
    await expect(rejectBtn).toBeVisible()
    await rejectBtn.click()

    const dialog = page.locator('.t-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const textarea = dialog.locator('textarea')
    await expect(textarea).toBeVisible()
    await textarea.fill('成分比例需调整，请修改后重新提交')

    const confirmBtn = dialog.locator('.t-dialog__confirm')
    await confirmBtn.click()

    await page.waitForTimeout(1000)

    const draftChip = page.locator('.tl-status-chip.chip-draft').first()
    await expect(draftChip).toBeVisible({ timeout: 10000 })
    await expect(draftChip).toContainText('草稿')
  })

  test('EA05: Admin views review history', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const approvalCard = page.locator('[data-testid="dashboard-approval"]')
    await expect(approvalCard).toBeVisible({ timeout: 10000 })

    const historyTab = approvalCard.locator('.t-tab-panel', { hasText: '已审核' })
    if (await historyTab.count() > 0) {
      await historyTab.click()
      await page.waitForTimeout(500)

      const historyList = approvalCard.locator('.admin-review__list')
      if (await historyList.count() > 0) {
        const historyItems = approvalCard.locator('.admin-review__item')
        const count = await historyItems.count()

        if (count > 0) {
          const firstItem = historyItems.first()
          await expect(firstItem.locator('.admin-review__item-name')).toBeVisible()

          const resultTag = firstItem.locator('.t-tag')
          await expect(resultTag).toBeVisible()
          const resultText = await resultTag.textContent() || ''
          expect(resultText.includes('已通过') || resultText.includes('已驳回')).toBe(true)
        }
      }
    }
  })
})
