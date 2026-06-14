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

test.describe('系统管理配置 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN.username, ADMIN.password)
  })

  test('SC01: 管理员导航到系统配置应看到选项卡', async ({ page }) => {
    await page.goto('/system/config')
    await page.waitForLoadState('networkidle')

    const tabs = page.locator('[role="tab"]')
    await expect(tabs).toHaveCount(5)

    for (const label of ['缓存配置', '含量比配置', '原料枚举值', '导出中心', '权限管理']) {
      await expect(page.locator('[role="tab"]', { hasText: label })).toBeVisible()
    }
  })

  test('SC02: 管理员编辑缓存配置并保存成功', async ({ page }) => {
    await page.goto('/system/config')
    await page.waitForLoadState('networkidle')

    await page.locator('button', { hasText: '更改参数' }).first().click()
    const saveBtn = page.locator('button', { hasText: '保存配置' }).first()
    await expect(saveBtn).toBeVisible()

    const firstInput = page.locator('.t-input-number__input input').first()
    await firstInput.fill('8000')

    await saveBtn.click()
    await expect(page.getByText('配置更新成功')).toBeVisible({ timeout: 5000 })
  })

  test('SC03: 管理员编辑含量比阈值并保存成功', async ({ page }) => {
    await page.goto('/system/config')
    await page.waitForLoadState('networkidle')

    await page.locator('[role="tab"]', { hasText: '含量比配置' }).click()
    await page.waitForTimeout(500)

    await page.locator('button', { hasText: '更改参数' }).click()
    await expect(page.locator('button', { hasText: '保存配置' })).toBeVisible()

    const normalLowInput = page.locator('.ratio-level-card--normal .t-input-number__input input').first()
    await normalLowInput.fill('0.96')

    await page.locator('button', { hasText: '保存配置' }).first().click()
    await expect(page.getByText('含量比阈值配置更新成功')).toBeVisible({ timeout: 5000 })
  })

  test('SC04: 非管理员无法访问系统配置页', async ({ page }) => {
    await login(page, FORMULIST.username, FORMULIST.password)

    await page.goto('/system/config')
    await page.waitForTimeout(2000)

    expect(page.url()).not.toContain('/system/config')
  })
})
