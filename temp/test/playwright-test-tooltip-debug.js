const { chromium } = require('playwright');

const FRONTEND_URL = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder*="用户名"], input[name="username"]', 'admin');
  await page.fill('input[placeholder*="密码"], input[name="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("登录")');
  await page.waitForTimeout(2000);
  console.log('[LOGIN] Success');

  await page.goto(`${FRONTEND_URL}/materials`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Find tag with tooltips - check all t-tag elements
  const tags = await page.locator('.t-tag').all();
  console.log(`[DEBUG] Found ${tags.length} t-tag elements`);

  // Try each tag with longer hover
  for (let i = 0; i < Math.min(tags.length, 10); i++) {
    const tag = tags[i];
    const tagText = await tag.textContent().catch(() => '');
    await tag.hover();
    await page.waitForTimeout(1500);

    // Check if any tooltip appeared
    const hasPopup = await page.evaluate(() => {
      return document.querySelectorAll('.t-popup, .t-tooltip, [class*="popup"]').length;
    });

    if (hasPopup > 0) {
      console.log(`[DEBUG] Tag ${i} (text: ${tagText?.trim()}) triggered popup, count: ${hasPopup}`);
      await page.screenshot({ path: `d:/tmp/screenshots/tooltip-tag-${i}.png`, fullPage: false });
      break;
    }
  }

  // Also check for popup directly after hover
  const popups = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('[class*="popup"], [class*="tooltip"]').forEach(el => {
      const className = typeof el.className === 'string' ? el.className : '';
      const style = window.getComputedStyle(el);
      results.push({
        class: className.substring(0, 80),
        visibility: style.visibility,
        opacity: style.opacity,
        backdropFilter: style.backdropFilter,
        text: el.textContent?.substring(0, 60).trim()
      });
    });
    return results;
  });
  console.log('[DEBUG] All popup/tooltip elements:', JSON.stringify(popups, null, 2));

  await browser.close();
})();
