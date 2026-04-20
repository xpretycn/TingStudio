import { test, expect } from "@playwright/test";

test.describe("原料管理页面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 });
  });

  test("E2E-M01: 原料列表页面应正确渲染", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-testid="material-list"]')).toBeVisible();
  });

  test("E2E-M02: Dashboard 网格区域应可见", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");
    const dashboard = page.locator('[data-testid="dashboard-grid"]');
    await expect(dashboard).toBeVisible();
  });

  test("E2E-M03: 工具栏应包含搜索和新增按钮", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");
    const toolbar = page.locator('[data-testid="material-toolbar"]');
    await expect(toolbar).toBeVisible();

    const searchInput = page.locator('[data-testid="material-search"]');
    const addBtn = page.locator('[data-testid="material-add-btn"]');

    await expect(searchInput).toBeVisible();
    await expect(addBtn).toBeVisible();
  });

  test("E2E-M04: 搜索输入框应接受文本输入", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");
    const searchInput = page.locator('[data-testid="material-search"] input');
    await searchInput.fill("测试原料");
    const value = await searchInput.inputValue();
    expect(value).toContain("测试原料");
  });

  test("E2E-M05: 点击新增按钮应跳转到新建表单页", async ({ page }) => {
    await page.goto("/materials");
    await page.waitForLoadState("networkidle");
    await page.click('[data-testid="material-add-btn"]');
    await page.waitForURL(/\/materials\/new/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/materials\/new/);
  });
});

test.describe("原料表单页面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 });
    await page.goto("/materials/new");
    await page.waitForLoadState("networkidle");
  });

  test("E2E-F01: 新建表单页面应正确渲染", async ({ page }) => {
    await expect(page.locator('[data-testid="material-form"]')).toBeVisible();
  });

  test("E2E-F02: 原料名称输入框应存在并可输入", async ({ page }) => {
    const nameInput = page.locator('[data-testid="material-name-input"] input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(`E2E-Test-${Date.now()}`);
    const value = await nameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("E2E-F03: 保存按钮和取消按钮都应存在", async ({ page }) => {
    await expect(page.locator('[data-testid="material-save-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="material-cancel-btn"]')).toBeVisible();
  });

  test("E2E-F04: 点击取消按钮应返回列表页", async ({ page }) => {
    await page.click('[data-testid="material-cancel-btn"]');
    await page.waitForURL(/\/materials/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/materials/);
  });
});
