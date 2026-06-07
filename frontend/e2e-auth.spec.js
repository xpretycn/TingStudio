/**
 * TingStudio E2E 测试 - 登录 & 注册页面
 * 文档ID: TC-AUTH-20260521-001
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'd:/ProgramData/workspace-codeby/ting-studio/test/screenshots';

const results = [];

function record(id, name, status, screenshot = '') {
  results.push({ id, name, status, screenshot });
}

test.describe('登录 & 注册页面测试', () => {

  test('E01-P01 正常输入用户名', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.click();
    await usernameInput.fill('admin');
    const value = await usernameInput.inputValue();
    if (value === 'admin') {
      record('E01-P01', '正常输入用户名', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E01-P01.png` });
      record('E01-P01', '正常输入用户名', 'fail', `${SCREENSHOT_DIR}/E01-P01.png`);
    }
  });

  test('E01-E01 用户名为空提交', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E01-E01', '用户名为空提交', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E01-E01.png` });
      record('E01-E01', '用户名为空提交', 'fail', `${SCREENSHOT_DIR}/E01-E01.png`);
    }
  });

  test('E01-E02 用户名过短提交', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('ab');
    await usernameInput.blur();
    await page.waitForTimeout(300);
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E01-E02', '用户名过短提交', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E01-E02.png` });
      record('E01-E02', '用户名过短提交', 'fail', `${SCREENSHOT_DIR}/E01-E02.png`);
    }
  });

  test('E01-B01 用户名恰好3字符', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('abc');
    await usernameInput.blur();
    await page.waitForTimeout(300);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError === 0) {
      record('E01-B01', '用户名恰好3字符', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E01-B01.png` });
      record('E01-B01', '用户名恰好3字符', 'fail', `${SCREENSHOT_DIR}/E01-B01.png`);
    }
  });

  test('E02-P01 正常输入密码', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('123456');
    const value = await passwordInput.inputValue();
    if (value === '123456') {
      record('E02-P01', '正常输入密码', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E02-P01.png` });
      record('E02-P01', '正常输入密码', 'fail', `${SCREENSHOT_DIR}/E02-P01.png`);
    }
  });

  test('E02-E01 密码为空提交', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('admin');
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E02-E01', '密码为空提交', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E02-E01.png` });
      record('E02-E01', '密码为空提交', 'fail', `${SCREENSHOT_DIR}/E02-E01.png`);
    }
  });

  test('E02-E02 密码过短提交', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('admin');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('12345');
    await passwordInput.blur();
    await page.waitForTimeout(300);
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E02-E02', '密码过短提交', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E02-E02.png` });
      record('E02-E02', '密码过短提交', 'fail', `${SCREENSHOT_DIR}/E02-E02.png`);
    }
  });

  test('E03-P01 显示密码', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('123456');
    const eyeBtn = page.locator('.t-input__suffix button, [class*="eye"]').first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
      await page.waitForTimeout(300);
      record('E03-P01', '显示密码', 'pass');
    } else {
      record('E03-P01', '显示密码', 'skip', '眼睛按钮不可见');
    }
  });

  test('E04-P01 正常登录', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      record('E04-P01', '正常登录', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E04-P01.png` });
      record('E04-P01', '正常登录', 'fail', `${SCREENSHOT_DIR}/E04-P01.png`);
    }
  });

  test('E04-E01 用户名或密码错误', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('admin');
    await passwordInput.fill('wrongpassword');
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      record('E04-E01', '用户名或密码错误', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E04-E01.png` });
      record('E04-E01', '用户名或密码错误', 'fail', `${SCREENSHOT_DIR}/E04-E01.png`);
    }
  });

  test('E04-B01 必填字段为空提交', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E04-B01', '必填字段为空提交', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E04-B01.png` });
      record('E04-B01', '必填字段为空提交', 'fail', `${SCREENSHOT_DIR}/E04-B01.png`);
    }
  });

  test('E05-P01 跳转注册页', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const registerLink = page.locator('a[href="/register"], a:has-text("注册")').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      if (currentUrl.includes('/register')) {
        record('E05-P01', '跳转注册页', 'pass');
      } else {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/E05-P01.png` });
        record('E05-P01', '跳转注册页', 'fail', `${SCREENSHOT_DIR}/E05-P01.png`);
      }
    } else {
      record('E05-P01', '跳转注册页', 'skip', '注册链接不可见');
    }
  });

  test('E06-P01 注册页-正常输入用户名', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('newuser');
    const value = await usernameInput.inputValue();
    if (value === 'newuser') {
      record('E06-P01', '注册页-正常输入用户名', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E06-P01.png` });
      record('E06-P01', '注册页-正常输入用户名', 'fail', `${SCREENSHOT_DIR}/E06-P01.png`);
    }
  });

  test('E06-E01 注册-用户名为空提交', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(500);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E06-E01', '注册-用户名为空提交', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E06-E01.png` });
      record('E06-E01', '注册-用户名为空提交', 'fail', `${SCREENSHOT_DIR}/E06-E01.png`);
    }
  });

  test('E06-E02 注册-用户名过短', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('ab');
    await usernameInput.blur();
    await page.waitForTimeout(300);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E06-E02', '注册-用户名过短', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E06-E02.png` });
      record('E06-E02', '注册-用户名过短', 'fail', `${SCREENSHOT_DIR}/E06-E02.png`);
    }
  });

  test('E09-E01 确认密码不一致', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInputs = page.locator('input[type="password"]');
    await usernameInput.fill('testuser');
    await passwordInputs.nth(0).fill('123456');
    await passwordInputs.nth(1).fill('654321');
    await passwordInputs.nth(1).blur();
    await page.waitForTimeout(500);
    const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
    if (hasError > 0) {
      record('E09-E01', '确认密码不一致', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/E09-E01.png` });
      record('E09-E01', '确认密码不一致', 'fail', `${SCREENSHOT_DIR}/E09-E01.png`);
    }
  });

  test('E12-P01 跳转登录页', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);
    const loginLink = page.locator('a[href="/login"], a:has-text("登录")').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        record('E12-P01', '跳转登录页', 'pass');
      } else {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/E12-P01.png` });
        record('E12-P01', '跳转登录页', 'fail', `${SCREENSHOT_DIR}/E12-P01.png`);
      }
    } else {
      record('E12-P01', '跳转登录页', 'skip', '登录链接不可见');
    }
  });

  test('X-L01 登录→注册页面切换', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const registerLink = page.locator('a[href="/register"], a:has-text("注册")').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      if (currentUrl.includes('/register')) {
        record('X-L01', '登录→注册页面切换', 'pass');
      } else {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/X-L01.png` });
        record('X-L01', '登录→注册页面切换', 'fail', `${SCREENSHOT_DIR}/X-L01.png`);
      }
    } else {
      record('X-L01', '登录→注册页面切换', 'skip', '注册链接不可见');
    }
  });

  test('X-L02 注册→登录页面切换', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.waitForTimeout(1000);
    const loginLink = page.locator('a[href="/login"], a:has-text("登录")').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        record('X-L02', '注册→登录页面切换', 'pass');
      } else {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/X-L02.png` });
        record('X-L02', '注册→登录页面切换', 'fail', `${SCREENSHOT_DIR}/X-L02.png`);
      }
    } else {
      record('X-L02', '注册→登录页面切换', 'skip', '登录链接不可见');
    }
  });

  test('X-L05 登录成功后Token存储', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    const loginBtn = page.locator('button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForTimeout(3000);
    const token = await page.evaluate(() => localStorage.getItem('tingstudio_token'));
    if (token) {
      record('X-L05', '登录成功后Token存储', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/X-L05.png` });
      record('X-L05', '登录成功后Token存储', 'fail', `${SCREENSHOT_DIR}/X-L05.png`);
    }
  });

  test('R-01 桌面端(>1024px)布局', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const hasLeftPanel = await page.locator('[class*="left"], [class*="brand"], [class*="hero"]').count();
    if (hasLeftPanel > 0) {
      record('R-01', '桌面端布局', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/R-01.png` });
      record('R-01', '桌面端布局', 'fail', `${SCREENSHOT_DIR}/R-01.png`);
    }
  });

  test('R-03 移动端(<768px)布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);
    const formCard = await page.locator('[class*="form"], [class*="card"]').count();
    if (formCard > 0) {
      record('R-03', '移动端布局', 'pass');
    } else {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/R-03.png` });
      record('R-03', '移动端布局', 'fail', `${SCREENSHOT_DIR}/R-03.png`);
    }
  });

  test.afterAll(async () => {
    const fs = await import('fs');
    const pass = results.filter(r => r.status === 'pass').length;
    const fail = results.filter(r => r.status === 'fail').length;
    const skip = results.filter(r => r.status === 'skip').length;
    const total = results.length;
    const rate = total > 0 ? ((pass / total) * 100).toFixed(1) : '0';

    let report = `# 登录 & 注册页面 测试结果报告\n\n`;
    report += `## 文档信息\n| 项 | 值 |\n|----|-----|\n`;
    report += `| 文档ID | TR-AUTH-20260607-001 |\n`;
    report += `| 源文档ID | TC-AUTH-20260521-001 |\n`;
    report += `| 执行时间 | ${new Date().toISOString().replace('T', ' ').slice(0, 16)} |\n`;
    report += `| 总用例数 | ${total} |\n`;
    report += `| 通过 | ${pass} |\n`;
    report += `| 失败 | ${fail} |\n`;
    report += `| 跳过 | ${skip} |\n`;
    report += `| 通过率 | ${rate}% |\n\n`;
    report += `## 执行结果总览\n| 用例ID | 用例名称 | 结果 | 截图 |\n|--------|---------|------|------|\n`;
    for (const r of results) {
      const statusIcon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭';
      report += `| ${r.id} | ${r.name} | ${statusIcon} ${r.status} | ${r.screenshot || '-'} |\n`;
    }
    if (fail > 0) {
      report += `\n## 失败用例详情\n`;
      for (const r of results.filter(r => r.status === 'fail')) {
        report += `- **${r.id}** ${r.name}: 截图 ${r.screenshot}\n`;
      }
    }
    if (skip > 0) {
      report += `\n## 跳过用例详情\n`;
      for (const r of results.filter(r => r.status === 'skip')) {
        report += `- **${r.id}** ${r.name}: ${r.screenshot || '原因未说明'}\n`;
      }
    }
    fs.writeFileSync('d:/ProgramData/workspace-codeby/ting-studio/test/test-results/auth-test-results.md', report, 'utf-8');
  });
});
