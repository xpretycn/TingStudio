import { chromium, expect } from "@playwright/test";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    await page.goto("http://localhost:5173/login", { waitUntil: "networkidle", timeout: 15000 });

    await page.fill('input[type="text"], input[placeholder*="用户"]', "admin");
    await page.fill('input[type="password"], input[placeholder*="密码"]', "admin123");
    await page.click('button:has-text("登录")');
    await page.waitForURL("**/dashboard**", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await page.goto("http://localhost:5173/models", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    const floatTab = page.locator('.nav-tab:has-text("悬浮助手")');
    await floatTab.click();
    await page.waitForTimeout(2000);

    console.log("=== Testing float assistant model selection ===");

    const modelProviderSelect = page.locator('.fa-card-body .t-select').first();
    await modelProviderSelect.click();
    await page.waitForTimeout(500);

    const providerOptions = await page.locator('.t-select-option').count();
    console.log(`Provider options count: ${providerOptions}`);

    const deepseekOption = page.locator('.t-select-option:has-text("DeepSeek")');
    if (await deepseekOption.isVisible()) {
      await deepseekOption.click();
      await page.waitForTimeout(2000);
      console.log("Selected DeepSeek provider");
    }

    const modelNameSelect = page.locator('.fa-field:has-text("AI 模型") .t-select').nth(1);
    const isModelNameDisabled = await modelNameSelect.locator('input').isDisabled().catch(() => true);
    console.log(`Model name select disabled: ${isModelNameDisabled}`);

    if (!isModelNameDisabled) {
      await modelNameSelect.click();
      await page.waitForTimeout(500);

      const versionOptions = await page.locator('.t-select-option').count();
      console.log(`Model version options count: ${versionOptions}`);

      const firstVersion = page.locator('.t-select-option').first();
      if (await firstVersion.isVisible()) {
        const versionText = await firstVersion.textContent();
        console.log(`First model version: ${versionText}`);
        await firstVersion.click();
        await page.waitForTimeout(2000);
        console.log("Selected specific model version");
      }
    }

    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.goto("http://localhost:5173/models", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    await floatTab.click();
    await page.waitForTimeout(2000);

    const savedProvider = await page.locator('.fa-field:has-text("AI 模型") .t-select').first().locator('input').inputValue().catch(() => "");
    console.log(`Restored provider value: ${savedProvider}`);

    const savedModelName = await page.locator('.fa-field:has-text("AI 模型") .t-select').nth(1).locator('input').inputValue().catch(() => "");
    console.log(`Restored model name value: ${savedModelName}`);

    if (savedProvider && savedModelName) {
      console.log("✅ PASS: Two-level model selection works - provider and model name are persisted and restored");
    } else if (savedProvider) {
      console.log("⚠️ PARTIAL: Provider is saved but model name may not be restored");
    } else {
      console.log("❌ FAIL: Model selection not persisted");
    }

    if (consoleErrors.length > 0) {
      console.log("\nConsole errors:");
      consoleErrors.forEach(e => console.log(`  - ${e}`));
    }

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
