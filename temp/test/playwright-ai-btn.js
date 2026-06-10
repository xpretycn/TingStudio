const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5174';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-testid="login-username"] input').fill('admin');
  await page.locator('[data-testid="login-password"] input').fill('admin123');
  await page.locator('[data-testid="login-btn"]').click();
  await page.waitForTimeout(3000);

  // Go to formulas list
  await page.goto(`${TARGET_URL}/formulas`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const rows = page.locator('table tbody tr');
  if (await rows.count() > 0) {
    await rows.first().click();
    await page.waitForTimeout(2000);

    const editBtn = page.locator('button:has-text("编辑")').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(3000);

      // Check all AI buttons on edit page
      const allBtns = await page.evaluate(() => {
        const btns = document.querySelectorAll('.btn-ai-generate');
        return Array.from(btns).map((btn, i) => ({
          index: i,
          disabled: btn.disabled,
          text: btn.textContent?.trim(),
          parentLabel: btn.closest('.field-label')?.textContent?.trim().substring(0, 30),
        }));
      });

      console.log('Edit page AI buttons:', JSON.stringify(allBtns, null, 2));

      // Check if name is filled
      const nameValue = await page.evaluate(() => {
        const input = document.querySelector('[data-testid="formula-name-input"] input');
        return input ? input.value : 'not found';
      });
      console.log('Formula name value:', nameValue);
    }
  }

  await browser.close();
})();
