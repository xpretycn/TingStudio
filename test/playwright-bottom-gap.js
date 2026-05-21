const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5174';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-testid="login-username"] input').fill('admin');
  await page.locator('[data-testid="login-password"] input').fill('admin123');
  await page.locator('[data-testid="login-btn"]').click();
  await page.waitForTimeout(3000);

  // Hard refresh to ensure latest code
  await page.goto(`${TARGET_URL}/formulas/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check computed styles
  const checkResult = await page.evaluate(() => {
    const ff = document.querySelector('.formula-form');
    const rc = document.querySelector('.right-content');
    if (!ff || !rc) return { error: 'Elements not found' };

    const ffStyle = getComputedStyle(ff);
    const rcStyle = getComputedStyle(rc);

    // Check all relevant styles
    return {
      formulaForm: {
        paddingBottom: ffStyle.paddingBottom,
        marginBottom: ffStyle.marginBottom,
        minHeight: ffStyle.minHeight,
        height: ffStyle.height,
        display: ffStyle.display,
        flexGrow: ffStyle.flexGrow,
        flexShrink: ffStyle.flexShrink,
        flexBasis: ffStyle.flexBasis,
        boxSizing: ffStyle.boxSizing,
        overflow: ffStyle.overflow,
      },
      rightContent: {
        paddingBottom: rcStyle.paddingBottom,
        classList: Array.from(rc.classList),
      },
      // Check if padding-bottom is actually applied by checking the element's attribute
      hasDataV: ff.hasAttribute('data-v-') || Object.keys(ff.attributes).some(a => a.name && a.name.startsWith('data-v-')),
    };
  });

  console.log('=== Style Check ===');
  console.log(JSON.stringify(checkResult, null, 2));

  // Now test edit page with scrolling
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

      // Scroll to absolute bottom
      await page.evaluate(() => {
        const rc = document.querySelector('.right-content');
        if (rc) rc.scrollTop = rc.scrollHeight;
      });
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({ path: 'd:/Program Data/workspace-codebd/TingStudio/test/screenshots/formula-edit-final-check.png' });

      // Measure the actual visible gap at the bottom
      const gapCheck = await page.evaluate(() => {
        const rc = document.querySelector('.right-content');
        const ff = document.querySelector('.formula-form');

        // The gap at the bottom = rightContent bottom - formulaForm bottom
        const rcRect = rc.getBoundingClientRect();
        const ffRect = ff.getBoundingClientRect();

        // Also check the last visible content element
        const allEls = ff.querySelectorAll('*');
        let maxBottom = 0;
        for (const el of allEls) {
          const r = el.getBoundingClientRect();
          if (r.height > 0 && r.bottom > maxBottom && !el.classList.contains('t-dialog__ctx') && !el.closest('.t-dialog__ctx')) {
            maxBottom = r.bottom;
          }
        }

        return {
          rightContentBottom: Math.round(rcRect.bottom),
          formulaFormBottom: Math.round(ffRect.bottom),
          formulaFormPaddingBottom: getComputedStyle(ff).paddingBottom,
          rightContentPaddingBottom: getComputedStyle(rc).paddingBottom,
          rightContentClassList: Array.from(rc.classList),
          lastContentBottom: Math.round(maxBottom),
          viewportHeight: window.innerHeight,
          gap_formulaForm_to_viewport: Math.round(window.innerHeight - ffRect.bottom),
          gap_lastContent_to_viewport: Math.round(window.innerHeight - maxBottom),
          gap_formulaForm_to_rightContent: Math.round(rcRect.bottom - ffRect.bottom),
          scrollTop: rc.scrollTop,
          scrollHeight: rc.scrollHeight,
          clientHeight: rc.clientHeight,
        };
      });

      console.log('=== Gap Check (Edit Page, Scrolled to Bottom) ===');
      console.log(JSON.stringify(gapCheck, null, 2));
    }
  }

  await browser.close();
})();
