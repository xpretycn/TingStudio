# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-auth.spec.js >> 登录 & 注册页面测试 >> E03-P01 显示密码
- Location: e2e-auth.spec.js:135:3

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.t-input__suffix button, [class*="eye"]').first()
    - locator resolved to <div class="eyes" data-v-7e671b92="">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 100ms
    18 × waiting for element to be visible, enabled and stable
       - element is not stable
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  42  |     } else {
  43  |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E01-E01.png` });
  44  |       record('E01-E01', '用户名为空提交', 'fail', `${SCREENSHOT_DIR}/E01-E01.png`);
  45  |     }
  46  |   });
  47  | 
  48  |   test('E01-E02 用户名过短提交', async ({ page }) => {
  49  |     await page.goto(`${BASE_URL}/login`);
  50  |     await page.waitForTimeout(1000);
  51  |     const usernameInput = page.locator('input[type="text"]').first();
  52  |     await usernameInput.fill('ab');
  53  |     await usernameInput.blur();
  54  |     await page.waitForTimeout(300);
  55  |     const loginBtn = page.locator('button[type="submit"]').first();
  56  |     await loginBtn.click();
  57  |     await page.waitForTimeout(500);
  58  |     const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
  59  |     if (hasError > 0) {
  60  |       record('E01-E02', '用户名过短提交', 'pass');
  61  |     } else {
  62  |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E01-E02.png` });
  63  |       record('E01-E02', '用户名过短提交', 'fail', `${SCREENSHOT_DIR}/E01-E02.png`);
  64  |     }
  65  |   });
  66  | 
  67  |   test('E01-B01 用户名恰好3字符', async ({ page }) => {
  68  |     await page.goto(`${BASE_URL}/login`);
  69  |     await page.waitForTimeout(1000);
  70  |     const usernameInput = page.locator('input[type="text"]').first();
  71  |     await usernameInput.fill('abc');
  72  |     await usernameInput.blur();
  73  |     await page.waitForTimeout(300);
  74  |     const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
  75  |     if (hasError === 0) {
  76  |       record('E01-B01', '用户名恰好3字符', 'pass');
  77  |     } else {
  78  |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E01-B01.png` });
  79  |       record('E01-B01', '用户名恰好3字符', 'fail', `${SCREENSHOT_DIR}/E01-B01.png`);
  80  |     }
  81  |   });
  82  | 
  83  |   test('E02-P01 正常输入密码', async ({ page }) => {
  84  |     await page.goto(`${BASE_URL}/login`);
  85  |     await page.waitForTimeout(1000);
  86  |     const passwordInput = page.locator('input[type="password"]').first();
  87  |     await passwordInput.fill('123456');
  88  |     const value = await passwordInput.inputValue();
  89  |     if (value === '123456') {
  90  |       record('E02-P01', '正常输入密码', 'pass');
  91  |     } else {
  92  |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E02-P01.png` });
  93  |       record('E02-P01', '正常输入密码', 'fail', `${SCREENSHOT_DIR}/E02-P01.png`);
  94  |     }
  95  |   });
  96  | 
  97  |   test('E02-E01 密码为空提交', async ({ page }) => {
  98  |     await page.goto(`${BASE_URL}/login`);
  99  |     await page.waitForTimeout(1000);
  100 |     const usernameInput = page.locator('input[type="text"]').first();
  101 |     await usernameInput.fill('admin');
  102 |     const loginBtn = page.locator('button[type="submit"]').first();
  103 |     await loginBtn.click();
  104 |     await page.waitForTimeout(500);
  105 |     const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
  106 |     if (hasError > 0) {
  107 |       record('E02-E01', '密码为空提交', 'pass');
  108 |     } else {
  109 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E02-E01.png` });
  110 |       record('E02-E01', '密码为空提交', 'fail', `${SCREENSHOT_DIR}/E02-E01.png`);
  111 |     }
  112 |   });
  113 | 
  114 |   test('E02-E02 密码过短提交', async ({ page }) => {
  115 |     await page.goto(`${BASE_URL}/login`);
  116 |     await page.waitForTimeout(1000);
  117 |     const usernameInput = page.locator('input[type="text"]').first();
  118 |     await usernameInput.fill('admin');
  119 |     const passwordInput = page.locator('input[type="password"]').first();
  120 |     await passwordInput.fill('12345');
  121 |     await passwordInput.blur();
  122 |     await page.waitForTimeout(300);
  123 |     const loginBtn = page.locator('button[type="submit"]').first();
  124 |     await loginBtn.click();
  125 |     await page.waitForTimeout(500);
  126 |     const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
  127 |     if (hasError > 0) {
  128 |       record('E02-E02', '密码过短提交', 'pass');
  129 |     } else {
  130 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E02-E02.png` });
  131 |       record('E02-E02', '密码过短提交', 'fail', `${SCREENSHOT_DIR}/E02-E02.png`);
  132 |     }
  133 |   });
  134 | 
  135 |   test('E03-P01 显示密码', async ({ page }) => {
  136 |     await page.goto(`${BASE_URL}/login`);
  137 |     await page.waitForTimeout(1000);
  138 |     const passwordInput = page.locator('input[type="password"]').first();
  139 |     await passwordInput.fill('123456');
  140 |     const eyeBtn = page.locator('.t-input__suffix button, [class*="eye"]').first();
  141 |     if (await eyeBtn.isVisible()) {
> 142 |       await eyeBtn.click();
      |                    ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  143 |       await page.waitForTimeout(300);
  144 |       record('E03-P01', '显示密码', 'pass');
  145 |     } else {
  146 |       record('E03-P01', '显示密码', 'skip', '眼睛按钮不可见');
  147 |     }
  148 |   });
  149 | 
  150 |   test('E04-P01 正常登录', async ({ page }) => {
  151 |     await page.goto(`${BASE_URL}/login`);
  152 |     await page.waitForTimeout(1000);
  153 |     const usernameInput = page.locator('input[type="text"]').first();
  154 |     const passwordInput = page.locator('input[type="password"]').first();
  155 |     await usernameInput.fill('admin');
  156 |     await passwordInput.fill('admin123');
  157 |     const loginBtn = page.locator('button[type="submit"]').first();
  158 |     await loginBtn.click();
  159 |     await page.waitForTimeout(3000);
  160 |     const currentUrl = page.url();
  161 |     if (!currentUrl.includes('/login')) {
  162 |       record('E04-P01', '正常登录', 'pass');
  163 |     } else {
  164 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E04-P01.png` });
  165 |       record('E04-P01', '正常登录', 'fail', `${SCREENSHOT_DIR}/E04-P01.png`);
  166 |     }
  167 |   });
  168 | 
  169 |   test('E04-E01 用户名或密码错误', async ({ page }) => {
  170 |     await page.goto(`${BASE_URL}/login`);
  171 |     await page.waitForTimeout(1000);
  172 |     const usernameInput = page.locator('input[type="text"]').first();
  173 |     const passwordInput = page.locator('input[type="password"]').first();
  174 |     await usernameInput.fill('admin');
  175 |     await passwordInput.fill('wrongpassword');
  176 |     const loginBtn = page.locator('button[type="submit"]').first();
  177 |     await loginBtn.click();
  178 |     await page.waitForTimeout(3000);
  179 |     const currentUrl = page.url();
  180 |     if (currentUrl.includes('/login')) {
  181 |       record('E04-E01', '用户名或密码错误', 'pass');
  182 |     } else {
  183 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E04-E01.png` });
  184 |       record('E04-E01', '用户名或密码错误', 'fail', `${SCREENSHOT_DIR}/E04-E01.png`);
  185 |     }
  186 |   });
  187 | 
  188 |   test('E04-B01 必填字段为空提交', async ({ page }) => {
  189 |     await page.goto(`${BASE_URL}/login`);
  190 |     await page.waitForTimeout(1000);
  191 |     const loginBtn = page.locator('button[type="submit"]').first();
  192 |     await loginBtn.click();
  193 |     await page.waitForTimeout(500);
  194 |     const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
  195 |     if (hasError > 0) {
  196 |       record('E04-B01', '必填字段为空提交', 'pass');
  197 |     } else {
  198 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E04-B01.png` });
  199 |       record('E04-B01', '必填字段为空提交', 'fail', `${SCREENSHOT_DIR}/E04-B01.png`);
  200 |     }
  201 |   });
  202 | 
  203 |   test('E05-P01 跳转注册页', async ({ page }) => {
  204 |     await page.goto(`${BASE_URL}/login`);
  205 |     await page.waitForTimeout(1000);
  206 |     const registerLink = page.locator('a[href="/register"], a:has-text("注册")').first();
  207 |     if (await registerLink.isVisible()) {
  208 |       await registerLink.click();
  209 |       await page.waitForTimeout(1000);
  210 |       const currentUrl = page.url();
  211 |       if (currentUrl.includes('/register')) {
  212 |         record('E05-P01', '跳转注册页', 'pass');
  213 |       } else {
  214 |         await page.screenshot({ path: `${SCREENSHOT_DIR}/E05-P01.png` });
  215 |         record('E05-P01', '跳转注册页', 'fail', `${SCREENSHOT_DIR}/E05-P01.png`);
  216 |       }
  217 |     } else {
  218 |       record('E05-P01', '跳转注册页', 'skip', '注册链接不可见');
  219 |     }
  220 |   });
  221 | 
  222 |   test('E06-P01 注册页-正常输入用户名', async ({ page }) => {
  223 |     await page.goto(`${BASE_URL}/register`);
  224 |     await page.waitForTimeout(1000);
  225 |     const usernameInput = page.locator('input[type="text"]').first();
  226 |     await usernameInput.fill('newuser');
  227 |     const value = await usernameInput.inputValue();
  228 |     if (value === 'newuser') {
  229 |       record('E06-P01', '注册页-正常输入用户名', 'pass');
  230 |     } else {
  231 |       await page.screenshot({ path: `${SCREENSHOT_DIR}/E06-P01.png` });
  232 |       record('E06-P01', '注册页-正常输入用户名', 'fail', `${SCREENSHOT_DIR}/E06-P01.png`);
  233 |     }
  234 |   });
  235 | 
  236 |   test('E06-E01 注册-用户名为空提交', async ({ page }) => {
  237 |     await page.goto(`${BASE_URL}/register`);
  238 |     await page.waitForTimeout(1000);
  239 |     const submitBtn = page.locator('button[type="submit"]').first();
  240 |     await submitBtn.click();
  241 |     await page.waitForTimeout(500);
  242 |     const hasError = await page.locator('.t-input__tips, .t-form__status, [class*="error"]').count();
```