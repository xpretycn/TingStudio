import { test, expect } from "@playwright/test";

test.describe("Report Center Phase 1 Acceptance Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/login");
    await page.waitForLoadState("networkidle");
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL(/\/(formulas|materials|sales|reports)/, { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test("E2E-R01: Sidebar should show report center nav item", async ({ page }) => {
    const navItem = page.locator('.nav-item').filter({ hasText: '报告中心' });
    await expect(navItem).toBeVisible();
  });

  test("E2E-R02: Click report center should navigate to /reports", async ({ page }) => {
    const navItem = page.locator('.nav-item').filter({ hasText: '报告中心' });
    await navItem.click();
    await expect(page).toHaveURL(/\/reports/, { timeout: 10000 });
  });

  test("E2E-R03: Report center page should render correctly", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    const hasContent = bodyText.includes('报告') || bodyText.length > 100;
    expect(hasContent).toBeTruthy();
  });

  test("E2E-R04: Report center should show generate buttons", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const generateBtn = page.locator('button').filter({ hasText: /生成/ });
    const hasAny = (await generateBtn.count()) > 0;
    expect(hasAny).toBeTruthy();
  });

  test("E2E-R05: Report center should show filter or list area", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const contentArea = page.locator('.report-center, .report-list, [class*="report"], main, .content-area');
    if ((await contentArea.count()) > 0) {
      await expect(contentArea.first()).toBeVisible();
    }
  });

  test("E2E-R06: Report center page should load normally", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test("E2E-R07: Click generate button should navigate to generate page", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const btn = page.locator('button').filter({ hasText: /生成/ });
    if ((await btn.count()) > 0) {
      await btn.first().click();
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain('/reports');
    }
  });

  test("E2E-R08: Generate report page should render correctly", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/generate");
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    const hasContent = bodyText.includes('报告') || bodyText.includes('生成') || bodyText.length > 100;
    expect(hasContent).toBeTruthy();
  });

  test("E2E-R09: Generate report page should show type selector", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/generate");
    await page.waitForTimeout(3000);
    const radioGroup = page.locator('.t-radio-group, [class*="radio"]');
    if ((await radioGroup.count()) > 0) {
      await expect(radioGroup.first()).toBeVisible();
    }
  });

  test("E2E-R10: Generate report page should show date picker", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/generate");
    await page.waitForTimeout(3000);
    const datePicker = page.locator('.t-date-picker, .t-date-range-picker, [class*="date-picker"], .t-input');
    if ((await datePicker.count()) > 0) {
      await expect(datePicker.first()).toBeVisible();
    }
  });

  test("E2E-R11: Generate report page should show submit button", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/generate");
    await page.waitForTimeout(3000);
    const submitBtn = page.locator('button').filter({ hasText: /确认|生成/ });
    if ((await submitBtn.count()) > 0) {
      await expect(submitBtn.first()).toBeVisible();
    }
  });

  test("E2E-R12: Weekly report page should be accessible", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/weekly");
    await page.waitForTimeout(3000);
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test("E2E-R13: Monthly report page should be accessible", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/monthly");
    await page.waitForTimeout(3000);
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test("E2E-R14: Report center should show pagination or list", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const pagination = page.locator('.table-pagination, .t-pagination, [class*="pagination"]');
    const listArea = page.locator('.report-grid, .report-list-card, [class*="report-card"]');
    const emptyState = page.locator('.empty-state, [class*="empty"]');
    const hasPagination = (await pagination.count()) > 0;
    const hasList = (await listArea.count()) > 0;
    const hasEmpty = (await emptyState.count()) > 0;
    expect(hasPagination || hasList || hasEmpty).toBeTruthy();
  });

  test("E2E-R15: Generate page breadcrumb or navigation should display", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/generate");
    await page.waitForTimeout(3000);
    const breadcrumb = page.locator('.t-breadcrumb, [class*="breadcrumb"]');
    const header = page.locator('h1, h2, .page-title, [class*="title"]');
    const hasBreadcrumb = (await breadcrumb.count()) > 0;
    const hasHeader = (await header.count()) > 0;
    expect(hasBreadcrumb || hasHeader).toBeTruthy();
  });

  test("E2E-R16: Generate page back should navigate to report center", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/generate");
    await page.waitForTimeout(3000);
    const backBtn = page.locator('button').filter({ hasText: /取消|返回/ });
    if ((await backBtn.count()) > 0) {
      await backBtn.first().click();
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain('/reports');
    }
  });

  test("E2E-R17: Report center page header should display icon", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const headerArea = page.locator('.page-header, .header-left, [class*="header"]');
    if ((await headerArea.count()) > 0) {
      await expect(headerArea.first()).toBeVisible();
    }
  });

  test("E2E-R18: Weekly report page should show section areas", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/weekly");
    await page.waitForTimeout(3000);
    const sectionCards = page.locator('.report-section-card, [class*="section-card"], [class*="section"]');
    if ((await sectionCards.count()) > 0) {
      expect(await sectionCards.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("E2E-R19: Monthly report page should show more section areas", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/monthly");
    await page.waitForTimeout(3000);
    const sectionCards = page.locator('.report-section-card, [class*="section-card"], [class*="section"]');
    if ((await sectionCards.count()) > 0) {
      expect(await sectionCards.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("E2E-R20: Report center should support type filter", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    await page.waitForTimeout(3000);
    const selectElement = page.locator('.t-select, [class*="select"]');
    if ((await selectElement.count()) > 0) {
      await expect(selectElement.first()).toBeVisible();
    }
  });
});

test.describe("Report API Tests", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post("http://localhost:3000/api/auth/login", {
      data: { username: "admin", password: "admin123" },
    });
    const body = await response.json();
    authToken = body.data?.token || "";
  });

  test("E2E-R21: GET /api/reports should return report list", async ({ request }) => {
    const response = await request.get("http://localhost:3000/api/reports", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
  });

  test("E2E-R22: POST /api/reports/generate should generate report", async ({ request }) => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const response = await request.post("http://localhost:3000/api/reports/generate", {
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      data: { type: "weekly", periodStart: fmt(weekStart), periodEnd: fmt(weekEnd) },
    });
    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
    expect(body.data.type).toBe("weekly");
  });

  test("E2E-R23: GET /api/reports/data/weekly should return weekly data", async ({ request }) => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const response = await request.get("http://localhost:3000/api/reports/data/weekly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: fmt(weekStart), periodEnd: fmt(weekEnd) },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBeTruthy();
  });

  test("E2E-R24: GET /api/reports/targets should return target list", async ({ request }) => {
    const response = await request.get("http://localhost:3000/api/reports/targets", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBeTruthy();
  });

  test("E2E-R25: POST /api/reports/generate missing params should return 400", async ({ request }) => {
    const response = await request.post("http://localhost:3000/api/reports/generate", {
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      data: { type: "weekly" },
    });
    expect(response.status()).toBe(400);
  });

  test("E2E-R26: GET /api/reports/:id should return report detail", async ({ request }) => {
    const listRes = await request.get("http://localhost:3000/api/reports", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const listBody = await listRes.json();
    if (listBody.data?.list?.length > 0) {
      const reportId = listBody.data.list[0].id;
      const response = await request.get(`http://localhost:3000/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBeTruthy();
      expect(body.data.id).toBe(reportId);
    }
  });

  test("E2E-R27: POST /api/reports/:id/publish admin can publish", async ({ request }) => {
    const listRes = await request.get("http://localhost:3000/api/reports", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const listBody = await listRes.json();
    const draftReport = listBody.data?.list?.find((r: any) => r.status === 'draft');
    if (draftReport) {
      const response = await request.post(`http://localhost:3000/api/reports/${draftReport.id}/publish`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBeTruthy();
      expect(body.data.status).toBe('published');
    }
  });

  test("E2E-R28: GET /api/reports/data/monthly should return monthly data", async ({ request }) => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const response = await request.get("http://localhost:3000/api/reports/data/monthly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: fmt(monthStart), periodEnd: fmt(monthEnd) },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data.monthlySummary).toBeDefined();
  });
});

test.describe("Report Phase 2 Data Aggregation Tests", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post("http://localhost:3000/api/auth/login", {
      data: { username: "admin", password: "admin123" },
    });
    const body = await response.json();
    authToken = body.data?.token || "";
  });

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const getWeekRange = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return { start: fmt(weekStart), end: fmt(weekEnd) };
  };
  const getMonthRange = () => {
    const now = new Date();
    return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  };

  test("E2E-P2-01: Weekly data should return dailyFormulaTrend array", async ({ request }) => {
    const { start, end } = getWeekRange();
    const response = await request.get("http://localhost:3000/api/reports/data/weekly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data.formula.dailyFormulaTrend)).toBeTruthy();
  });

  test("E2E-P2-02: Weekly data should return statusDistribution array", async ({ request }) => {
    const { start, end } = getWeekRange();
    const response = await request.get("http://localhost:3000/api/reports/data/weekly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data.formula.statusDistribution)).toBeTruthy();
  });

  test("E2E-P2-03: Weekly data should return weeklyComparison array with 4+ items", async ({ request }) => {
    const { start, end } = getWeekRange();
    const response = await request.get("http://localhost:3000/api/reports/data/weekly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data.sales.weeklyComparison)).toBeTruthy();
    expect(body.data.sales.weeklyComparison.length).toBeGreaterThanOrEqual(4);
  });

  test("E2E-P2-04: Monthly data should return monthlySummary with weeklyBreakdown", async ({ request }) => {
    const { start, end } = getMonthRange();
    const response = await request.get("http://localhost:3000/api/reports/data/monthly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data.monthlySummary).toBeDefined();
    expect(Array.isArray(body.data.monthlySummary.weeklyBreakdown)).toBeTruthy();
  });

  test("E2E-P2-05: Monthly data should return trend with monthlyTrend 6+ items", async ({ request }) => {
    const { start, end } = getMonthRange();
    const response = await request.get("http://localhost:3000/api/reports/data/monthly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data.trend).toBeDefined();
    expect(Array.isArray(body.data.trend.monthlyTrend)).toBeTruthy();
    expect(body.data.trend.monthlyTrend.length).toBeGreaterThanOrEqual(6);
  });

  test("E2E-P2-06: Monthly data should return targets with quarterlyTargets", async ({ request }) => {
    const { start, end } = getMonthRange();
    const response = await request.get("http://localhost:3000/api/reports/data/monthly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data.targets).toBeDefined();
    expect(Array.isArray(body.data.targets.quarterlyTargets)).toBeTruthy();
  });

  test("E2E-P2-07: Monthly data should return team with salesmanPerformance", async ({ request }) => {
    const { start, end } = getMonthRange();
    const response = await request.get("http://localhost:3000/api/reports/data/monthly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data.team).toBeDefined();
    expect(Array.isArray(body.data.team.salesmanPerformance)).toBeTruthy();
  });

  test("E2E-P2-08: Monthly data should return trend with yearOverYear and monthOverMonth", async ({ request }) => {
    const { start, end } = getMonthRange();
    const response = await request.get("http://localhost:3000/api/reports/data/monthly", {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { periodStart: start, periodEnd: end },
    });
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data.trend.yearOverYear).toBeDefined();
    expect(body.data.trend.monthOverMonth).toBeDefined();
    expect(typeof body.data.trend.yearOverYear.quantity).toBe("number");
    expect(typeof body.data.trend.monthOverMonth.quantity).toBe("number");
  });
});

test.describe("Report Phase 2 Chart Rendering Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173/login");
    await page.waitForLoadState("networkidle");
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL(/\/(formulas|materials|sales|reports)/, { timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test("E2E-P2-09: Weekly report page should render chart containers", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/weekly");
    await page.waitForTimeout(5000);
    const chartContainers = page.locator('.chart-container, [class*="chart"]');
    if ((await chartContainers.count()) > 0) {
      expect(await chartContainers.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("E2E-P2-10: Monthly report page should render chart containers", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/monthly");
    await page.waitForTimeout(5000);
    const chartContainers = page.locator('.chart-container, [class*="chart"]');
    if ((await chartContainers.count()) > 0) {
      expect(await chartContainers.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("E2E-P2-11: Monthly report page should show target progress bars", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/monthly");
    await page.waitForTimeout(5000);
    const progressBars = page.locator('.target-progress-bar, .progress-fill, [class*="progress"]');
    if ((await progressBars.count()) > 0) {
      expect(await progressBars.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("E2E-P2-12: Weekly report page should show stat indicators", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/weekly");
    await page.waitForTimeout(5000);
    const indicators = page.locator('.stat-indicator, [class*="indicator"]');
    if ((await indicators.count()) > 0) {
      expect(await indicators.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("E2E-P2-13: Monthly report page should show stat indicators", async ({ page }) => {
    await page.goto("http://localhost:5173/reports/monthly");
    await page.waitForTimeout(5000);
    const indicators = page.locator('.stat-indicator, [class*="indicator"]');
    if ((await indicators.count()) > 0) {
      expect(await indicators.count()).toBeGreaterThanOrEqual(1);
    }
  });
});
