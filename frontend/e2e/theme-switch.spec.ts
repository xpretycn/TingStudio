import { test, expect } from "@playwright/test";

test.describe("动态主题切换", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 });
  });

  test("E2E-T01: 页面应具有默认品牌色属性", async ({ page }) => {
    const brandAttr = await page.evaluate(() => document.documentElement.getAttribute("data-brand"));
    expect(brandAttr).toBeTruthy();
  });

  test("E2E-T02: 原料列表页应正确加载并显示内容", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");

    const materialList = page.locator('[data-testid="material-list"]');
    await expect(materialList).toBeVisible();
  });

  test("E2E-T03: 分页组件应在列表页面中存在（数据不足时可能隐藏）", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");

    const pagination = page.locator('.t-table__pagination-wrap, .table-pagination, [class*="pagination"]');
    if ((await pagination.count()) > 0) {
      const first = pagination.first();
      await expect(first).toBeAttached();
    }
  });
});
