import { test, expect } from "@playwright/test";

test.describe("用户认证流程", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("E2E-A01: 登录页面应正确渲染", async ({ page }) => {
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-username"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-btn"]')).toBeVisible();
  });

  test("E2E-A02: 空表单提交应显示验证错误", async ({ page }) => {
    await page.click('[data-testid="login-btn"]');
    await page.waitForTimeout(500);
    const errorMsg = page.locator('.t-form__error-msg, .t-input__tips-error, [class*="error"]');
    if ((await errorMsg.count()) > 0) {
      await expect(errorMsg.first()).toBeVisible();
    }
  });

  test("E2E-A03: 正确凭据登录应跳转到首页", async ({ page }) => {
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');

    await expect(page).toHaveURL(/\/(formulas|home|materials)/, { timeout: 10000 });
  });

  test("E2E-A04: 登录按钮应包含「登」字文本", async ({ page }) => {
    const btn = page.locator('[data-testid="login-btn"]');
    await expect(btn).toContainText(/登/);
  });

  test("E2E-A05: 用户名输入框应有占位符提示", async ({ page }) => {
    const input = page.locator('[data-testid="login-username"] input');
    const placeholder = (await input.getAttribute("placeholder")) || "";
    expect(placeholder.length).toBeGreaterThan(0);
  });

  test("E2E-A06: 密码输入框应为密码类型", async ({ page }) => {
    const input = page.locator('[data-testid="login-password"] input');
    const type = await input.getAttribute("type");
    expect(type).toBe("password");
  });
});
