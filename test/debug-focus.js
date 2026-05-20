const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:5178/login', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);

  // Click username, fill it, then click away
  const u = p.locator('input').first();
  await u.click();
  await u.fill('testuser');
  await p.waitForTimeout(500);

  // Click password
  const pw = p.locator('input').nth(1);
  await pw.click();
  await pw.fill('testpassword');
  await p.waitForTimeout(500);

  // Click outside to blur
  await p.click('.form-header');
  await p.waitForTimeout(500);

  await p.screenshot({ path: 'test/screenshots/login-focus-debug.png' });
  console.log('Screenshot saved');

  // Also check computed styles
  const bgColor = await u.evaluate(el => {
    return window.getComputedStyle(el).backgroundColor;
  });
  console.log('Input background-color:', bgColor);

  const innerBg = await u.evaluate(el => {
    const inner = el.closest('.t-input');
    return inner ? window.getComputedStyle(inner).backgroundColor : 'no .t-input found';
  });
  console.log('.t-input background-color:', innerBg);

  await b.close();
})();
