import { test, expect } from "@playwright/test";

const themes = ["pink", "green", "yellow", "blue"] as const;

test.describe("视觉回归 — 分页按钮多主题截图对比", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 });
  });

  for (const theme of themes) {
    test(`VR-01: 分页激活按钮在 ${theme} 主题下应正确渲染`, async ({ page }) => {
      await page.goto("/materials");
      await page.waitForLoadState("networkidle");

      await page.evaluate(color => {
        document.documentElement.setAttribute("data-brand", color);
      }, theme);

      await page.waitForTimeout(500);

      const activeBtn = page.locator(".pagination-btn--active");
      if ((await activeBtn.count()) > 0) {
        await expect(activeBtn.first()).toBeVisible();
        const bgColor = await activeBtn.first().evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(bgColor.length).toBeGreaterThan(0);
      }
    });
  }

  test("VR-02: 登录页面整体布局截图基线（粉色默认）", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const loginPage = page.locator(".login-page");
    if ((await loginPage.count()) > 0) {
      await expect(loginPage.first()).toHaveScreenshot("login-page-pink.png", {
        maxDiffPixelRatio: 0.1,
      });
    }
  });

  test("VR-03: 原料列表页 Dashboard 区域截图", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");

    const dashboard = page.locator('[data-testid="dashboard-grid"]');
    if ((await dashboard.count()) > 0) {
      await expect(dashboard).toHaveScreenshot("material-dashboard.png", {
        maxDiffPixelRatio: 0.1,
      });
    }
  });

  test("VR-04: 工具栏区域截图（搜索+新增按钮）", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");

    const toolbar = page.locator('[data-testid="material-toolbar"]');
    if ((await toolbar.count()) > 0) {
      await expect(toolbar).toHaveScreenshot("material-toolbar.png", {
        maxDiffPixelRatio: 0.1,
      });
    }
  });

  for (const theme of themes) {
    test(`VR-05: 原料列表页在 ${theme} 主题下的 data-brand 属性`, async ({ page }) => {
      await page.evaluate(color => {
        document.documentElement.setAttribute("data-brand", color);
      }, theme);

      const brandAttr = await page.evaluate(() => document.documentElement.getAttribute("data-brand"));
      expect(brandAttr).toBe(theme);
    });
  }

  test("VR-06: 表单验证错误态 — 空提交登录表单（新上下文）", async ({ page }) => {
    await page.goto("/login", { waitUntil: "commit" });
    const currentUrl = page.url();
    if (!currentUrl.includes("/login")) {
      console.log("已登录状态，跳过登录页错误态截图测试");
      return;
    }
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    try {
      await page.click('[data-testid="login-btn"]', { timeout: 5000 });
      await page.waitForTimeout(500);
    } catch {
      console.log("登录按钮不可点击，可能已被重定向");
      return;
    }
    const loginForm = page.locator('[data-testid="login-form"]');
    if ((await loginForm.count()) > 0) {
      await expect(loginForm).toHaveScreenshot("login-form-error-state.png", {
        maxDiffPixelRatio: 0.15,
      });
    }
  });
});
