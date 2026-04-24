const { chromium } = require('playwright');

const TARGET_URL = 'https://tingstudio-frontend-jnvxqqcv.edgeone.cool/login';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', req => console.log(`[REQ FAILED] ${req.url()} - ${req.failure()?.errorText}`));

  console.log('=== Navigating to:', TARGET_URL, '===');
  
  try {
    const resp = await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Response status:', resp?.status());
    console.log('Final URL:', page.url());
    console.log('Page title:', await page.title());
    
    await page.screenshot({ path: 'd:/Program Data/workspace-codebd/TingStudio/test-deploy-screenshot.png', fullPage: true });
    
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 800) || 'EMPTY');
    console.log('Body text:\n', bodyText);
    
    if (bodyText.includes('401') || bodyText.includes('UNAUTHORIZED')) {
      console.log('\n!!! EDGEONE 401 ISSUE DETECTED !!!');
      console.log('This is an EdgeOne Pages access control issue.');
      console.log('Solution: Go to EdgeOne console -> Project pages-jnvxqqcv -> Click Preview/Publish');
    } else if (bodyText.includes('login') || bodyText.includes('登录')) {
      console.log('\n=== Login page loaded! Attempting login ===');
      const inputs = await page.locator('input').all();
      console.log('Found inputs:', inputs.length);
      for (let i = 0; i < inputs.length; i++) {
        const type = await inputs[i].getAttribute('type');
        const placeholder = await inputs[i].getAttribute('placeholder');
        console.log(`  Input[${i}]: type=${type}, placeholder=${placeholder}`);
      }
      
      if (inputs.length >= 2) {
        await inputs[0].fill('admin');
        await inputs[1].fill('admin123');
        
        const buttons = await page.locator('button').all();
        for (let i = 0; i < buttons.length; i++) {
          const text = await buttons[i].innerText();
          if (text.includes('登录') || text.includes('Login')) {
            await buttons[i].click();
            break;
          }
        }
        
        await page.waitForTimeout(5000);
        console.log('URL after login:', page.url());
        await page.screenshot({ path: 'd:/Program Data/workspace-codebd/TingStudio/test-deploy-after-login.png', fullPage: true });
      }
    }
  } catch (err) {
    console.error('Navigation error:', err.message);
    await page.screenshot({ path: 'd:/Program Data/workspace-codebd/TingStudio/test-deploy-error.png', fullPage: true });
  }

  await browser.close();
  console.log('\n=== Test complete ===');
})();
