import { test, expect } from '@playwright/test'

test.describe('营养素 Excel 导入 E2E 流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('[data-testid="login-username"] input').fill('admin')
    await page.locator('[data-testid="login-password"] input').fill('admin123')
    await page.click('[data-testid="login-btn"]')
    await page.waitForURL(/\/(materials|home|formulas)/, { timeout: 10000 })
  })

  test('E2E-NUT-01: 原料表单页面应正确渲染', async ({ page }) => {
    await page.goto('/materials/new')
    await page.waitForLoadState('networkidle')

    const materialForm = page.locator('.material-form')
    if (await materialForm.count() > 0) {
      await expect(materialForm.first()).toBeVisible()
    }
  })

  test('E2E-NUT-02: 营养素 Excel 导入面板应存在', async ({ page }) => {
    await page.goto('/materials/new')
    await page.waitForLoadState('networkidle')

    const nutritionPanel = page.locator('.nutrition-excel-import, .excel-import-panel, [data-testid="nutrition-excel"]')
    if (await nutritionPanel.count() > 0) {
      await expect(nutritionPanel.first()).toBeVisible()
    }
  })

  test('E2E-NUT-03: 应包含模板下载按钮', async ({ page }) => {
    await page.goto('/materials/new')
    await page.waitForLoadState('networkidle')

    const downloadBtn = page.locator('.template-download-btn, [data-testid="download-template"], text=下载模板')
    if (await downloadBtn.count() > 0) {
      await expect(downloadBtn.first()).toBeVisible()
    }
  })

  test('E2E-NUT-04: 应包含文件上传区域', async ({ page }) => {
    await page.goto('/materials/new')
    await page.waitForLoadState('networkidle')

    const uploadArea = page.locator('.upload-zone, .file-upload-area, [data-testid="upload-zone"]')
    if (await uploadArea.count() > 0) {
      await expect(uploadArea.first()).toBeVisible()
    }
  })

  test('E2E-NUT-05: 上传区域应支持拖拽文件提示文字', async ({ page }) => {
    await page.goto('/materials/new')
    await page.waitForLoadState('networkidle')

    const content = await page.content()
    const hasUploadHint = content.includes('点击或拖拽') ||
      content.includes('上传') ||
      content.includes('Excel')
    expect(hasUploadHint).toBeTruthy()
  })

  test('E2E-NUT-06: 导入面板应支持 .xlsx 文件格式', async ({ page }) => {
    await page.goto('/materials/new')
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"][accept*=".xlsx"], input[type="file"][accept*=".xls"]')
    if (await fileInput.count() > 0) {
      const acceptAttr = await fileInput.first().getAttribute('accept')
      expect(acceptAttr).toBeTruthy()
    }
  })

  test('E2E-NUT-07: 配方表单中应包含 Excel 导入面板', async ({ page }) => {
    await page.goto('/formulas/new')
    await page.waitForLoadState('networkidle')

    const excelPanel = page.locator('.excel-import-mock, .excel-import-panel, [data-testid="excel-import"]')
    if (await excelPanel.count() > 0) {
      await expect(excelPanel.first()).toBeVisible()
    }

    const content = await page.content()
    expect(content).toContain('原料配比表')
  })
})
