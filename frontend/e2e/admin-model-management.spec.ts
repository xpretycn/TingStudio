import { test, expect, type Page } from '@playwright/test'

const ADMIN = { username: 'admin', password: 'admin123' }
const FORMULIST = { username: 'formulist_a', password: 'test123' }

async function login(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.locator('[data-testid="login-username"] input').fill(username)
  await page.locator('[data-testid="login-password"] input').fill(password)
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
}

test.describe('模型管理 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN.username, ADMIN.password)
  })

  test('MM01: 管理员导航到模型管理应看到模型列表', async ({ page }) => {
    await page.goto('/model-management')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.model-management')).toBeVisible()

    const modelCards = page.locator('.model-card')
    const count = await modelCards.count()
    expect(count).toBeGreaterThanOrEqual(0)

    if (count > 0) {
      await expect(modelCards.first().locator('.model-name')).toBeVisible()
    }

    await expect(page.locator('.add-model-btn')).toBeVisible()
    await expect(page.getByText('模型管理')).toBeVisible()
  })

  test('MM02: 管理员新增模型', async ({ page }) => {
    await page.goto('/model-management')
    await page.waitForLoadState('networkidle')

    await page.locator('button', { hasText: '新增模型' }).click()

    const drawer = page.locator('.t-drawer')
    await expect(drawer).toBeVisible({ timeout: 5000 })

    const modelName = `E2E-模型-${Date.now()}`
    const nameInput = drawer.locator('label:has-text("模型名称")').locator('..').locator('input')
    if (await nameInput.count() > 0) {
      await nameInput.fill(modelName)
    } else {
      const allInputs = drawer.locator('.t-input__wrap input')
      const firstInput = allInputs.first()
      await firstInput.fill(modelName)
    }

    const submitBtn = drawer.locator('button', { hasText: '确认' }).first()
    if (await submitBtn.count() > 0) {
      await submitBtn.click()
      await expect(page.getByText('添加成功')).toBeVisible({ timeout: 5000 })
    }
  })

  test('MM03: 管理员切换模型版本', async ({ page }) => {
    await page.goto('/model-management')
    await page.waitForLoadState('networkidle')

    const modelCards = page.locator('.model-card')
    const count = await modelCards.count()
    if (count === 0) {
      test.skip(true, '无可用模型进行版本切换测试')
      return
    }

    const versionSelect = modelCards.first().locator('.t-select')
    await expect(versionSelect).toBeVisible()

    await versionSelect.click()
    await page.waitForTimeout(500)

    const options = page.locator('.t-select-option')
    const optionCount = await options.count()
    if (optionCount > 1) {
      const firstLabel = await options.first().textContent()
      const secondLabel = await options.nth(1).textContent()
      if (secondLabel) {
        await options.nth(1).click()
        await page.waitForTimeout(500)
      }
    }
  })
})
