import { test, expect, type Page } from '@playwright/test'

const ADMIN = { username: 'admin', password: 'admin123' }

async function login(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.locator('[data-testid="login-username"] input').fill(username)
  await page.locator('[data-testid="login-password"] input').fill(password)
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
}

async function navigateToPermissionTab(page: Page) {
  await page.goto('/system/config')
  await page.waitForLoadState('networkidle')
  await page.locator('[role="tab"]', { hasText: '权限管理' }).click()
  await page.waitForTimeout(600)
}

test.describe('权限管理 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN.username, ADMIN.password)
  })

  test('PM01: 管理员创建角色', async ({ page }) => {
    await navigateToPermissionTab(page)

    await page.locator('button', { hasText: '新增角色' }).click()

    const dialog = page.locator('.t-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const roleName = `E2E角色-${Date.now()}`
    await dialog.locator('label:has-text("角色名称")').locator('..').locator('input').fill(roleName)

    const roleKeyInput = dialog.locator('label:has-text("角色标识")').locator('..').locator('input')
    await roleKeyInput.fill(`e2e_role_${Date.now()}`)

    const descInput = dialog.locator('label:has-text("角色描述")').locator('..').locator('input')
    await descInput.fill('E2E测试自动创建的角色')

    await dialog.locator('button', { hasText: '确定' }).click()
    await expect(page.getByText('角色创建成功')).toBeVisible({ timeout: 5000 })
  })

  test('PM02: 管理员创建用户', async ({ page }) => {
    await navigateToPermissionTab(page)

    await page.locator('button', { hasText: '新建用户' }).click()

    const dialog = page.locator('.t-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const username = `e2e_user_${Date.now()}`
    await dialog.locator('label:has-text("用户名")').locator('..').locator('input').fill(username)
    await dialog.locator('label:has-text("初始密码")').locator('..').locator('input').fill('e2etest123')

    const roleSelect = dialog.locator('.t-select')
    if (await roleSelect.count() > 0) {
      await roleSelect.first().click()
      await page.waitForTimeout(300)
      const roleOption = page.locator('.t-select-option').first()
      if (await roleOption.count() > 0) {
        await roleOption.click()
      }
    }

    await dialog.locator('button', { hasText: '确定' }).click()
    await expect(page.getByText('创建成功')).toBeVisible({ timeout: 5000 })
  })

  test('PM03: 管理员切换用户角色', async ({ page }) => {
    await navigateToPermissionTab(page)
    await page.waitForTimeout(500)

    const switchBtn = page.locator('button', { hasText: '切换角色' }).first()
    await expect(switchBtn).toBeVisible({ timeout: 10000 })
    await switchBtn.click()

    const dialog = page.locator('.t-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const select = dialog.locator('.t-select')
    await expect(select).toBeVisible()
    await select.click()
    await page.waitForTimeout(300)

    const roleOption = page.locator('.t-select-option').first()
    if (await roleOption.count() > 0) {
      await roleOption.click()
    }

    await dialog.locator('button', { hasText: '确定' }).click()
    await expect(page.getByText('角色切换成功')).toBeVisible({ timeout: 5000 })
  })
})
