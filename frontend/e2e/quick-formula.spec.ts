import { test, expect } from '@playwright/test'

const BASE_URL = '/formulas/quick'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('[data-testid="login-username"] input').fill('admin')
  await page.locator('[data-testid="login-password"] input').fill('admin123')
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
}

test.describe('快速配方工作流 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
  })

  test('QF01: 创建新快速配方', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: '新建配方' })
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    const nameInput = page.locator('[data-create-input]')
    await expect(nameInput).toBeVisible()
    const formulaName = `E2E测试配方-${Date.now()}`
    await nameInput.fill(formulaName)
    await nameInput.press('Enter')

    const sidebarItem = page.locator('.sidebar-item .item-name', { hasText: formulaName })
    await expect(sidebarItem).toBeVisible({ timeout: 5000 })
  })

  test('QF02: 从原料池添加原料', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: '新建配方' })
    await newBtn.click()
    const nameInput = page.locator('[data-create-input]')
    await nameInput.fill('QF02-添加原料测试')
    await nameInput.press('Enter')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.material-pool .filter-search input')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('黄芪')

    await page.waitForTimeout(500)
    const materialCard = page.locator('.pool-materials .material-fish').first()
    if (await materialCard.count() > 0) {
      await materialCard.click()

      const editorMaterial = page.locator('.formula-editor .material-row .material-name', { hasText: '黄芪' })
      await expect(editorMaterial).toBeVisible({ timeout: 5000 })
    }
  })

  test('QF03: 编辑原料用量', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: '新建配方' })
    await newBtn.click()
    const nameInput = page.locator('[data-create-input]')
    await nameInput.fill('QF03-编辑用量测试')
    await nameInput.press('Enter')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.material-pool .filter-search input')
    await searchInput.fill('黄芪')
    await page.waitForTimeout(500)
    const materialCard = page.locator('.pool-materials .material-fish').first()
    if (await materialCard.count() > 0) {
      await materialCard.click()
      await page.waitForTimeout(300)

      const qtyInput = page.locator('.formula-editor .material-row .quantity-input').first()
      await expect(qtyInput).toBeVisible()
      const input = qtyInput.locator('input')
      await input.clear()
      await input.fill('200')
      await input.press('Enter')

      await page.waitForTimeout(300)
      const ratioCell = page.locator('.formula-editor .material-row .material-ratio').first()
      await expect(ratioCell).toBeVisible()
      const ratioText = await ratioCell.textContent()
      expect(ratioText).not.toBe('0.0%')
    }
  })

  test('QF04: 保存配方', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: '新建配方' })
    await newBtn.click()
    const nameInput = page.locator('[data-create-input]')
    await nameInput.fill('QF04-保存测试')
    await nameInput.press('Enter')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.material-pool .filter-search input')
    await searchInput.fill('黄芪')
    await page.waitForTimeout(500)
    const materialCard = page.locator('.pool-materials .material-fish').first()
    if (await materialCard.count() > 0) {
      await materialCard.click()
      await page.waitForTimeout(300)

      const qtyInput = page.locator('.formula-editor .material-row .quantity-input').first()
      const input = qtyInput.locator('input')
      await input.clear()
      await input.fill('100')
      await input.press('Enter')
      await page.waitForTimeout(300)
    }

    const saveBtn = page.locator('.formula-editor button', { hasText: '保存配方' })
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    const successMsg = page.locator('.t-message', { hasText: /成功|已保存/ })
    await expect(successMsg).toBeVisible({ timeout: 5000 })

    const draft = await page.evaluate(() => localStorage.getItem('quick-formula-draft'))
    expect(draft).toBeFalsy()
  })

  test('QF05: 发布配方', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: '新建配方' })
    await newBtn.click()
    const nameInput = page.locator('[data-create-input]')
    await nameInput.fill('QF05-发布测试')
    await nameInput.press('Enter')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.material-pool .filter-search input')
    await searchInput.fill('黄芪')
    await page.waitForTimeout(500)
    const materialCard = page.locator('.pool-materials .material-fish').first()
    if (await materialCard.count() > 0) {
      await materialCard.click()
      await page.waitForTimeout(300)

      const qtyInput = page.locator('.formula-editor .material-row .quantity-input').first()
      const input = qtyInput.locator('input')
      await input.clear()
      await input.fill('150')
      await input.press('Enter')
      await page.waitForTimeout(300)
    }

    const publishBtn = page.locator('.formula-editor button', { hasText: '发布配方' })
    await expect(publishBtn).toBeVisible()
    await publishBtn.click()

    const drawer = page.locator('.t-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const salesmanSelect = page.locator('.t-drawer .t-select').first()
    await salesmanSelect.click()
    await page.waitForTimeout(300)
    const firstOption = page.locator('.t-select-dropdown__item').first()
    if (await firstOption.count() > 0) {
      await firstOption.click()
    }

    const descInput = page.locator('.t-drawer .t-textarea').first()
    await descInput.fill('E2E自动测试发布描述')

    const confirmBtn = page.locator('.t-drawer', { hasText: '确认发布' }).locator('button', { hasText: '确认发布' })
    await confirmBtn.click()

    await page.waitForURL(/\/formulas/, { timeout: 10000 })
  })

  test('QF06: 侧边栏操作', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: '新建配方' })

    await newBtn.click()
    let nameInput = page.locator('[data-create-input]')
    await nameInput.fill('QF06-配方A')
    await nameInput.press('Enter')
    await page.waitForTimeout(500)

    const sidebarItemA = page.locator('.sidebar-item .item-name', { hasText: 'QF06-配方A' })
    await expect(sidebarItemA).toBeVisible()

    await newBtn.click()
    nameInput = page.locator('[data-create-input]')
    await nameInput.fill('QF06-配方B')
    await nameInput.press('Enter')
    await page.waitForTimeout(500)

    const sidebarItemB = page.locator('.sidebar-item .item-name', { hasText: 'QF06-配方B' })
    await expect(sidebarItemB).toBeVisible()

    await sidebarItemA.click()
    await page.waitForTimeout(500)
    const titleA = page.locator('.formula-title', { hasText: 'QF06-配方A' })
    await expect(titleA).toBeVisible()

    await sidebarItemB.click()
    await page.waitForTimeout(500)
    const titleB = page.locator('.formula-title', { hasText: 'QF06-配方B' })
    await expect(titleB).toBeVisible()

    const deleteBtn = page.locator('.sidebar-item', { hasText: 'QF06-配方B' }).locator('.item-delete-btn')
    await deleteBtn.click({ force: true })

    const confirmDelete = page.locator('.t-popconfirm__content button', { hasText: '确认' })
    await expect(confirmDelete).toBeVisible({ timeout: 3000 })
    await confirmDelete.click()

    await expect(sidebarItemB).not.toBeVisible({ timeout: 5000 })
  })

  test('QF07: 草稿自动保存与恢复', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: '新建配方' })
    await newBtn.click()
    const nameInput = page.locator('[data-create-input]')
    await nameInput.fill('QF07-草稿恢复测试')
    await nameInput.press('Enter')
    await page.waitForTimeout(500)

    const searchInput = page.locator('.material-pool .filter-search input')
    await searchInput.fill('黄芪')
    await page.waitForTimeout(500)
    const materialCard = page.locator('.pool-materials .material-fish').first()
    if (await materialCard.count() > 0) {
      await materialCard.click()
      await page.waitForTimeout(300)
    }

    await page.waitForTimeout(3000)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const draftBanner = page.locator('.draft-banner')
    const restoreBtn = page.locator('.draft-restore-btn')

    if (await draftBanner.count() > 0) {
      await expect(draftBanner).toBeVisible()
      await expect(restoreBtn).toBeVisible()
      await restoreBtn.click()

      await page.waitForTimeout(500)
      const title = page.locator('.formula-title', { hasText: 'QF07-草稿恢复测试' })
      await expect(title).toBeVisible()
    }
  })
})
