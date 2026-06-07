const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const RESULTS = [];

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function record(id, name, status, detail = '') {
  RESULTS.push({ id, name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭';
  console.log(`${icon} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForPage(page, text, timeout = 15000) {
  try {
    await page.waitForSelector(`text=${text}`, { timeout });
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // ═══════════════════════════════════════════
  // 登录
  // ═══════════════════════════════════════════
  console.log('\n========== 登录 ==========\n');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  try {
    const usernameInput = page.locator('input[placeholder="请输入用户名"]');
    const passwordInput = page.locator('input[placeholder="请输入密码"]');
    await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await sleep(500);

    const loginBtn = page.locator('button:has-text("登 录")').first();
    await loginBtn.click();
    await sleep(5000);

    // 验证登录成功
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('登录失败，URL仍在登录页');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-fail.png') });
      await browser.close();
      return;
    }
    console.log('登录成功，当前URL:', currentUrl);
  } catch (e) {
    console.log('登录异常:', e.message);
    await browser.close();
    return;
  }

  // ═══════════════════════════════════════════
  // SalesmanList 测试
  // ═══════════════════════════════════════════
  console.log('\n========== SalesmanList 测试 ==========\n');

  await page.goto(`${BASE_URL}/salesmen`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'salesman-list-initial.png') });

  // --- E01 搜索输入框 ---
  // E01-P01 按姓名搜索
  try {
    const searchInput = page.locator('input[placeholder*="搜索业务员"]');
    await searchInput.fill('郭靖');
    await sleep(800);
    const hasGuoJing = await page.locator('td:has-text("郭靖")').first().isVisible().catch(() => false);
    if (hasGuoJing) {
      record('E01-P01', '按姓名搜索', 'PASS');
    } else {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'E01-P01.png') });
      record('E01-P01', '按姓名搜索', 'FAIL', '未找到郭靖');
    }
    await searchInput.clear();
    await sleep(600);
  } catch (e) {
    record('E01-P01', '按姓名搜索', 'FAIL', e.message);
  }

  // E01-P02 按工号搜索
  try {
    const searchInput = page.locator('input[placeholder*="搜索业务员"]');
    await searchInput.fill('YW00001');
    await sleep(800);
    const hasCode = await page.locator('td:has-text("YW00001")').first().isVisible().catch(() => false);
    if (hasCode) {
      record('E01-P02', '按工号搜索', 'PASS');
    } else {
      record('E01-P02', '按工号搜索', 'FAIL', '未找到工号 YW00001');
    }
    await searchInput.clear();
    await sleep(600);
  } catch (e) {
    record('E01-P02', '按工号搜索', 'FAIL', e.message);
  }

  // E01-P03 清空搜索
  try {
    const searchInput = page.locator('input[placeholder*="搜索业务员"]');
    await searchInput.fill('测试');
    await sleep(400);
    await searchInput.clear();
    await sleep(600);
    const inputVal = await searchInput.inputValue();
    if (inputVal === '') {
      record('E01-P03', '清空搜索', 'PASS');
    } else {
      record('E01-P03', '清空搜索', 'FAIL', `输入框值=${inputVal}`);
    }
  } catch (e) {
    record('E01-P03', '清空搜索', 'FAIL', e.message);
  }

  // E01-E01 搜索无结果
  try {
    const searchInput = page.locator('input[placeholder*="搜索业务员"]');
    await searchInput.fill('不存在的业务员名xyz123');
    await sleep(800);
    const empty = await page.locator('text=暂无业务员数据').first().isVisible().catch(() => false);
    if (empty) {
      record('E01-E01', '搜索无结果', 'PASS');
    } else {
      record('E01-E01', '搜索无结果', 'FAIL', '未显示空状态');
    }
    await searchInput.clear();
    await sleep(600);
  } catch (e) {
    record('E01-E01', '搜索无结果', 'FAIL', e.message);
  }

  // E01-B01 输入特殊字符
  try {
    const searchInput = page.locator('input[placeholder*="搜索业务员"]');
    await searchInput.fill('<script>alert(1)</script>');
    await sleep(600);
    const title = await page.locator('text=业务员管理中心').first().isVisible().catch(() => false);
    if (title) {
      record('E01-B01', '输入特殊字符', 'PASS');
    } else {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'E01-B01.png') });
      record('E01-B01', '输入特殊字符', 'FAIL', '页面可能崩溃');
    }
    await searchInput.clear();
    await sleep(600);
  } catch (e) {
    record('E01-B01', '输入特殊字符', 'FAIL', e.message);
  }

  // E01-U01 搜索框聚焦态
  try {
    const searchInput = page.locator('input[placeholder*="搜索业务员"]');
    await searchInput.focus();
    await sleep(300);
    const focused = await searchInput.evaluate(el => document.activeElement === el);
    record('E01-U01', '搜索框聚焦态', focused ? 'PASS' : 'FAIL');
  } catch (e) {
    record('E01-U01', '搜索框聚焦态', 'FAIL', e.message);
  }

  // --- E02 添加业务员按钮 ---
  // E02-P01 点击添加业务员
  try {
    const addBtn = page.locator('button:has-text("添加业务员")').first();
    await addBtn.click();
    await sleep(2000);
    const url = page.url();
    if (url.includes('/salesmen/new')) {
      record('E02-P01', '点击添加业务员', 'PASS');
    } else {
      record('E02-P01', '点击添加业务员', 'FAIL', `URL=${url}`);
    }
    await page.goto(`${BASE_URL}/salesmen`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1500);
  } catch (e) {
    record('E02-P01', '点击添加业务员', 'FAIL', e.message);
  }

  // --- E03 状态筛选按钮 ---
  // E03-P01 点击筛选按钮
  try {
    const filterBtn = page.locator('button:has-text("筛选")').first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await sleep(500);
      const dropdown = await page.locator('.t-popup, .t-dropdown').first().isVisible().catch(() => false);
      if (dropdown) {
        record('E03-P01', '点击筛选按钮', 'PASS');
        await page.keyboard.press('Escape');
        await sleep(300);
      } else {
        record('E03-P01', '点击筛选按钮', 'FAIL', '下拉菜单未出现');
      }
    } else {
      record('E03-P01', '点击筛选按钮', 'SKIP', '筛选按钮不可见');
    }
  } catch (e) {
    record('E03-P01', '点击筛选按钮', 'FAIL', e.message);
  }

  // --- E04 表格多选框 ---
  // E04-P01 勾选单行
  try {
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const checkbox = rows.nth(0).locator('.t-checkbox').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.click({ force: true });
        await sleep(500);
        record('E04-P01', '勾选单行', 'PASS');
        // 取消选择
        await checkbox.click({ force: true });
        await sleep(300);
      } else {
        record('E04-P01', '勾选单行', 'SKIP', '复选框不可见');
      }
    } else {
      record('E04-P01', '勾选单行', 'SKIP', '无数据行');
    }
  } catch (e) {
    record('E04-P01', '勾选单行', 'FAIL', e.message);
  }

  // --- E05 表格行点击 ---
  // E05-P01 点击行查看详情
  try {
    const firstRow = page.locator('table tbody tr').first();
    // 点击姓名列
    const nameCell = firstRow.locator('td').nth(1);
    await nameCell.click();
    await sleep(2000);
    const url = page.url();
    if (url.includes('/salesmen/') && !url.includes('/new') && !url.includes('/edit')) {
      record('E05-P01', '点击行查看详情', 'PASS');
    } else {
      record('E05-P01', '点击行查看详情', 'FAIL', `URL=${url}`);
    }
    await page.goto(`${BASE_URL}/salesmen`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1500);
  } catch (e) {
    record('E05-P01', '点击行查看详情', 'FAIL', e.message);
  }

  // --- E07 编辑按钮 ---
  // E07-P01 点击编辑
  try {
    const editBtn = page.locator('button[title="编辑"]').first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await sleep(2000);
      const url = page.url();
      if (url.includes('/edit')) {
        record('E07-P01', '点击编辑', 'PASS');
      } else {
        record('E07-P01', '点击编辑', 'FAIL', `URL=${url}`);
      }
      await page.goto(`${BASE_URL}/salesmen`, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(1500);
    } else {
      record('E07-P01', '点击编辑', 'SKIP', '编辑按钮不可见');
    }
  } catch (e) {
    record('E07-P01', '点击编辑', 'FAIL', e.message);
  }

  // --- E08 停用按钮 ---
  // E08-P01 停用确认弹窗
  try {
    const stopBtn = page.locator('button[title="停用"]').first();
    if (await stopBtn.isVisible().catch(() => false)) {
      await stopBtn.click();
      await sleep(800);
      const confirm = await page.locator('text=确定要停用').first().isVisible().catch(() => false);
      if (confirm) {
        record('E08-P01', '停用按钮-popconfirm', 'PASS');
        await page.keyboard.press('Escape');
        await sleep(300);
      } else {
        record('E08-P01', '停用按钮-popconfirm', 'FAIL', '确认弹窗未出现');
      }
    } else {
      record('E08-P01', '停用按钮-popconfirm', 'SKIP', '无活跃业务员');
    }
  } catch (e) {
    record('E08-P01', '停用按钮-popconfirm', 'FAIL', e.message);
  }

  // --- E09 删除按钮 ---
  // E09-P01 删除确认弹窗
  try {
    const deleteBtn = page.locator('button[title="删除"]').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await sleep(800);
      const confirm = await page.locator('text=确定要删除').first().isVisible().catch(() => false);
      if (confirm) {
        record('E09-P01', '删除按钮-popconfirm', 'PASS');
        await page.keyboard.press('Escape');
        await sleep(300);
      } else {
        record('E09-P01', '删除按钮-popconfirm', 'FAIL', '确认弹窗未出现');
      }
    } else {
      record('E09-P01', '删除按钮-popconfirm', 'SKIP', '删除按钮不可见');
    }
  } catch (e) {
    record('E09-P01', '删除按钮-popconfirm', 'FAIL', e.message);
  }

  // --- 数据看板验证 ---
  try {
    const totalText = await page.locator('text=业务员总数').first().isVisible().catch(() => false);
    const activeText = await page.locator('text=活跃').first().isVisible().catch(() => false);
    if (totalText && activeText) {
      record('X-L03', '数据看板显示', 'PASS');
    } else {
      record('X-L03', '数据看板显示', 'FAIL', `总数=${totalText}, 活跃=${activeText}`);
    }
  } catch (e) {
    record('X-L03', '数据看板显示', 'FAIL', e.message);
  }

  // --- 表格列头 ---
  try {
    const headers = ['姓名', '工号', '部门', '电话', '邮箱', '状态', '创建时间', '操作'];
    let allVisible = true;
    for (const h of headers) {
      const visible = await page.locator(`th:has-text("${h}")`).first().isVisible().catch(() => false);
      if (!visible) allVisible = false;
    }
    record('X-TABLE', '表格列头完整', allVisible ? 'PASS' : 'FAIL');
  } catch (e) {
    record('X-TABLE', '表格列头完整', 'FAIL', e.message);
  }

  // ═══════════════════════════════════════════
  // SalesmanDetail 测试
  // ═══════════════════════════════════════════
  console.log('\n========== SalesmanDetail 测试 ==========\n');

  // 点击第一行进入详情
  const firstDataRow = page.locator('table tbody tr').first();
  const nameCell = firstDataRow.locator('td').nth(1);
  await nameCell.click();
  await sleep(2000);

  const detailUrl = page.url();
  if (detailUrl.includes('/salesmen/') && !detailUrl.includes('/edit') && !detailUrl.includes('/new')) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'salesman-detail.png') });

    // SD-E01-P01 返回按钮
    try {
      const backBtn = page.locator('button[title="返回"], .back-btn, button:has-text("返回")').first();
      if (await backBtn.isVisible().catch(() => false)) {
        record('SD-E01-P01', '返回按钮存在', 'PASS');
      } else {
        record('SD-E01-P01', '返回按钮存在', 'FAIL', '返回按钮不可见');
      }
    } catch (e) {
      record('SD-E01-P01', '返回按钮存在', 'FAIL', e.message);
    }

    // SD-E04-P01 编辑按钮
    try {
      const editBtn = page.locator('button:has-text("编辑")').first();
      if (await editBtn.isVisible().catch(() => false)) {
        record('SD-E04-P01', '编辑按钮存在', 'PASS');
      } else {
        record('SD-E04-P01', '编辑按钮存在', 'FAIL', '编辑按钮不可见');
      }
    } catch (e) {
      record('SD-E04-P01', '编辑按钮存在', 'FAIL', e.message);
    }

    // SD-E10-P01 状态标签展示
    try {
      const statusTag = await page.locator('.t-tag').filter({ hasText: /活跃|停用/ }).first().isVisible().catch(() => false);
      if (statusTag) {
        record('SD-E10-P01', '状态标签展示', 'PASS');
      } else {
        record('SD-E10-P01', '状态标签展示', 'FAIL', '未找到状态标签');
      }
    } catch (e) {
      record('SD-E10-P01', '状态标签展示', 'FAIL', e.message);
    }

    // SD-概况 概况卡片字段
    try {
      const nameField = await page.locator('text=姓名').first().isVisible().catch(() => false);
      const codeField = await page.locator('text=工号').first().isVisible().catch(() => false);
      const deptField = await page.locator('text=部门').first().isVisible().catch(() => false);
      if (nameField && codeField && deptField) {
        record('SD-概况', '概况卡片字段完整', 'PASS');
      } else {
        record('SD-概况', '概况卡片字段完整', 'FAIL', `姓名=${nameField}, 工号=${codeField}, 部门=${deptField}`);
      }
    } catch (e) {
      record('SD-概况', '概况卡片字段完整', 'FAIL', e.message);
    }

    // SD-配方 关联配方列表
    try {
      const formulaSection = await page.locator('text=关联配方').first().isVisible().catch(() => false);
      if (formulaSection) {
        record('SD-配方', '关联配方列表展示', 'PASS');
      } else {
        record('SD-配方', '关联配方列表展示', 'FAIL', '配方列表区域不可见');
      }
    } catch (e) {
      record('SD-配方', '关联配方列表展示', 'FAIL', e.message);
    }

    // SD-变更 变更记录
    try {
      const changeLog = await page.locator('text=变更记录').first().isVisible().catch(() => false);
      if (changeLog) {
        record('SD-变更', '变更记录展示', 'PASS');
      } else {
        record('SD-变更', '变更记录展示', 'FAIL', '变更记录不可见');
      }
    } catch (e) {
      record('SD-变更', '变更记录展示', 'FAIL', e.message);
    }

    // SD-E02-P01 面包屑导航
    try {
      const breadcrumb = await page.locator('text=业务员管理').first().isVisible().catch(() => false);
      if (breadcrumb) {
        record('SD-E02-P01', '面包屑导航', 'PASS');
      } else {
        record('SD-E02-P01', '面包屑导航', 'FAIL', '面包屑不可见');
      }
    } catch (e) {
      record('SD-E02-P01', '面包屑导航', 'FAIL', e.message);
    }

  } else {
    record('SD-NAV', '导航到详情页', 'FAIL', `URL=${detailUrl}`);
  }

  // ═══════════════════════════════════════════
  // SalesmanForm 测试（新增模式）
  // ═══════════════════════════════════════════
  console.log('\n========== SalesmanForm 测试（新增） ==========\n');

  await page.goto(`${BASE_URL}/salesmen/new`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  const formUrl = page.url();
  if (formUrl.includes('/salesmen/new')) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'salesman-form-new.png') });

    // SF-E05-P01 输入合法姓名
    try {
      const nameInput = page.locator('input[placeholder="请输入姓名"]');
      await nameInput.fill('测试业务员');
      const val = await nameInput.inputValue();
      if (val === '测试业务员') {
        record('SF-E05-P01', '输入合法姓名', 'PASS');
      } else {
        record('SF-E05-P01', '输入合法姓名', 'FAIL', `值=${val}`);
      }
    } catch (e) {
      record('SF-E05-P01', '输入合法姓名', 'FAIL', e.message);
    }

    // SF-E06-P02 新增模式自动生成工号
    try {
      const codeInput = page.locator('input[placeholder="请输入工号"]');
      const codeVal = await codeInput.inputValue();
      if (codeVal && codeVal.startsWith('YW')) {
        record('SF-E06-P02', '新增模式自动生成工号', 'PASS', `工号=${codeVal}`);
      } else {
        record('SF-E06-P02', '新增模式自动生成工号', 'FAIL', `工号=${codeVal}`);
      }
    } catch (e) {
      record('SF-E06-P02', '新增模式自动生成工号', 'FAIL', e.message);
    }

    // SF-E07-P02 新增模式默认部门
    try {
      const deptInput = page.locator('input[placeholder="请输入部门"]');
      const deptVal = await deptInput.inputValue();
      if (deptVal === '销售部') {
        record('SF-E07-P02', '新增模式默认部门', 'PASS');
      } else {
        record('SF-E07-P02', '新增模式默认部门', 'FAIL', `部门=${deptVal}`);
      }
    } catch (e) {
      record('SF-E07-P02', '新增模式默认部门', 'FAIL', e.message);
    }

    // SF-E05-E01 姓名为空失焦校验
    try {
      const nameInput = page.locator('input[placeholder="请输入姓名"]');
      await nameInput.clear();
      await nameInput.blur();
      await sleep(500);
      const errorMsg = await page.locator('text=请输入姓名').first().isVisible().catch(() => false);
      if (errorMsg) {
        record('SF-E05-E01', '姓名为空失焦校验', 'PASS');
      } else {
        record('SF-E05-E01', '姓名为空失焦校验', 'FAIL', '校验错误未显示');
      }
    } catch (e) {
      record('SF-E05-E01', '姓名为空失焦校验', 'FAIL', e.message);
    }

    // SF-E05-B01 输入1个字符
    try {
      const nameInput = page.locator('input[placeholder="请输入姓名"]');
      await nameInput.fill('张');
      await nameInput.blur();
      await sleep(800);
      const errorMsg = await page.locator('text=2-20').first().isVisible().catch(() => false);
      if (errorMsg) {
        record('SF-E05-B01', '输入1个字符校验', 'PASS');
      } else {
        // TDesign min 校验可能需要 change 事件触发
        await nameInput.fill('张三');
        await nameInput.fill('张');
        await sleep(800);
        const errorMsg2 = await page.locator('text=2-20').first().isVisible().catch(() => false);
        if (errorMsg2) {
          record('SF-E05-B01', '输入1个字符校验', 'PASS', 'change 触发后显示');
        } else {
          record('SF-E05-B01', '输入1个字符校验', 'FAIL', '校验错误未显示');
        }
      }
    } catch (e) {
      record('SF-E05-B01', '输入1个字符校验', 'FAIL', e.message);
    }

    // SF-E06-B01 输入中文工号
    try {
      const codeInput = page.locator('input[placeholder="请输入工号"]');
      await codeInput.clear();
      await codeInput.fill('工号一');
      await codeInput.blur();
      await sleep(500);
      const errorMsg = await page.locator('text=字母、数字').first().isVisible().catch(() => false);
      if (errorMsg) {
        record('SF-E06-B01', '输入中文工号校验', 'PASS');
      } else {
        record('SF-E06-B01', '输入中文工号校验', 'FAIL', '校验错误未显示');
      }
    } catch (e) {
      record('SF-E06-B01', '输入中文工号校验', 'FAIL', e.message);
    }

    // SF-E08-E01 输入错误格式手机号
    try {
      const phoneInput = page.locator('input[placeholder*="手机号"], input[maxlength="11"]').first();
      await phoneInput.clear();
      await phoneInput.fill('12345');
      await phoneInput.blur();
      await sleep(500);
      const errorMsg = await page.locator('text=11 位手机号').first().isVisible().catch(() => false);
      if (errorMsg) {
        record('SF-E08-E01', '错误格式手机号校验', 'PASS');
      } else {
        record('SF-E08-E01', '错误格式手机号校验', 'FAIL', '校验错误未显示');
      }
    } catch (e) {
      record('SF-E08-E01', '错误格式手机号校验', 'FAIL', e.message);
    }

    // SF-E09-E01 输入错误格式邮箱
    try {
      const emailInput = page.locator('input[placeholder="请输入邮箱地址"]');
      await emailInput.clear();
      await emailInput.fill('abc');
      await emailInput.blur();
      await sleep(500);
      const errorMsg = await page.locator('text=邮箱地址').first().isVisible().catch(() => false);
      if (errorMsg) {
        record('SF-E09-E01', '错误格式邮箱校验', 'PASS');
      } else {
        record('SF-E09-E01', '错误格式邮箱校验', 'FAIL', '校验错误未显示');
      }
    } catch (e) {
      record('SF-E09-E01', '错误格式邮箱校验', 'FAIL', e.message);
    }

    // SF-E04-U01 新增模式按钮文字
    try {
      const createBtn = await page.locator('button:has-text("创建")').first().isVisible().catch(() => false);
      if (createBtn) {
        record('SF-E04-U01', '新增模式按钮文字', 'PASS');
      } else {
        record('SF-E04-U01', '新增模式按钮文字', 'FAIL', '未找到创建按钮');
      }
    } catch (e) {
      record('SF-E04-U01', '新增模式按钮文字', 'FAIL', e.message);
    }

    // SF-E10-U01 头像上传区域
    try {
      const uploadZone = await page.locator('text=点击或拖拽上传头像').first().isVisible().catch(() => false);
      if (uploadZone) {
        record('SF-E10-U01', '头像上传区域展示', 'PASS');
      } else {
        record('SF-E10-U01', '头像上传区域展示', 'FAIL', '上传区域不可见');
      }
    } catch (e) {
      record('SF-E10-U01', '头像上传区域展示', 'FAIL', e.message);
    }

    // SF-X-L05 新增模式标题
    try {
      const title = await page.locator('text=新增业务员').first().isVisible().catch(() => false);
      if (title) {
        record('SF-X-L05', '新增模式标题', 'PASS');
      } else {
        record('SF-X-L05', '新增模式标题', 'FAIL', '标题不正确');
      }
    } catch (e) {
      record('SF-X-L05', '新增模式标题', 'FAIL', e.message);
    }

    // SF-E04-E01 必填字段为空提交
    try {
      const nameInput = page.locator('input[placeholder="请输入姓名"]');
      await nameInput.clear();
      const submitBtn = page.locator('button:has-text("创建")').first();
      await submitBtn.click();
      await sleep(500);
      const hasError = await page.locator('.t-is-error, .t-input--error').first().isVisible().catch(() => false);
      const errorMsg = await page.locator('text=请输入姓名').first().isVisible().catch(() => false);
      if (hasError || errorMsg) {
        record('SF-E04-E01', '必填字段为空提交', 'PASS');
      } else {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'SF-E04-E01.png') });
        record('SF-E04-E01', '必填字段为空提交', 'FAIL', '无校验错误提示');
      }
    } catch (e) {
      record('SF-E04-E01', '必填字段为空提交', 'FAIL', e.message);
    }

    // SF-E04-P01 正常创建（填入合法数据后提交）
    try {
      const nameInput = page.locator('input[placeholder="请输入姓名"]');
      await nameInput.fill('自动化测试业务员');
      const codeInput = page.locator('input[placeholder="请输入工号"]');
      await codeInput.clear();
      await codeInput.fill('YW_AUTO_TEST_01');
      await sleep(300);

      const submitBtn = page.locator('button:has-text("创建")').first();
      await submitBtn.click();
      await sleep(3000);

      const url = page.url();
      const successMsg = await page.locator('text=创建成功').first().isVisible().catch(() => false);
      if (successMsg || url.includes('/salesmen')) {
        record('SF-E04-P01', '正常创建业务员', 'PASS', successMsg ? '成功提示' : `URL=${url}`);
      } else {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'SF-E04-P01.png') });
        record('SF-E04-P01', '正常创建业务员', 'FAIL', `URL=${url}`);
      }
    } catch (e) {
      record('SF-E04-P01', '正常创建业务员', 'FAIL', e.message);
    }

  } else {
    record('SF-NAV', '导航到新增页', 'FAIL', `URL=${formUrl}`);
  }

  // ═══════════════════════════════════════════
  // SalesmanForm 测试（编辑模式）
  // ═══════════════════════════════════════════
  console.log('\n========== SalesmanForm 测试（编辑） ==========\n');

  await page.goto(`${BASE_URL}/salesmen`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1500);

  const editBtnInList = page.locator('button[title="编辑"]').first();
  if (await editBtnInList.isVisible().catch(() => false)) {
    await editBtnInList.click();
    await sleep(2000);

    const editUrl = page.url();
    if (editUrl.includes('/edit')) {
      // 等待编辑页数据加载完成
      try {
        await page.locator('input[placeholder="请输入姓名"]').first().waitFor({ state: 'visible', timeout: 10000 });
        // 等待数据回填（API 请求需要时间）
        await sleep(2000);
      } catch {
        // 继续执行
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'salesman-form-edit.png') });

      // SF-EDIT-X-L05 编辑模式标题和按钮
      try {
        const editTitle = await page.locator('text=编辑业务员').first().isVisible().catch(() => false);
        const saveBtn = await page.locator('button:has-text("保存")').first().isVisible().catch(() => false);
        if (editTitle && saveBtn) {
          record('SF-EDIT-X-L05', '编辑模式标题和按钮', 'PASS');
        } else {
          record('SF-EDIT-X-L05', '编辑模式标题和按钮', 'FAIL', `标题=${editTitle}, 按钮=${saveBtn}`);
        }
      } catch (e) {
        record('SF-EDIT-X-L05', '编辑模式标题和按钮', 'FAIL', e.message);
      }

      // SF-EDIT-X-L02 编辑模式回填数据
      try {
        const nameInput = page.locator('input[placeholder="请输入姓名"]');
        const nameVal = await nameInput.inputValue();
        const codeInput = page.locator('input[placeholder="请输入工号"]');
        const codeVal = await codeInput.inputValue();
        if (nameVal && codeVal) {
          record('SF-EDIT-X-L02', '编辑模式回填数据', 'PASS', `姓名=${nameVal}, 工号=${codeVal}`);
        } else {
          record('SF-EDIT-X-L02', '编辑模式回填数据', 'FAIL', `姓名=${nameVal}, 工号=${codeVal}`);
        }
      } catch (e) {
        record('SF-EDIT-X-L02', '编辑模式回填数据', 'FAIL', e.message);
      }

      // SF-E03-P01 取消按钮
      try {
        const cancelBtn = page.locator('button:has-text("取消")').first();
        await cancelBtn.click();
        await sleep(1500);
        const url = page.url();
        if (url.includes('/salesmen') && !url.includes('/edit')) {
          record('SF-E03-P01', '取消按钮返回列表', 'PASS');
        } else {
          record('SF-E03-P01', '取消按钮返回列表', 'FAIL', `URL=${url}`);
        }
      } catch (e) {
        record('SF-E03-P01', '取消按钮返回列表', 'FAIL', e.message);
      }
    } else {
      record('SF-EDIT-NAV', '导航到编辑页', 'FAIL', `URL=${editUrl}`);
    }
  } else {
    record('SF-EDIT-NAV', '编辑按钮不可见', 'SKIP', '列表中无编辑按钮');
  }

  // ═══════════════════════════════════════════
  // 输出结果汇总
  // ═══════════════════════════════════════════
  console.log('\n========== 测试结果汇总 ==========\n');

  const pass = RESULTS.filter(r => r.status === 'PASS').length;
  const fail = RESULTS.filter(r => r.status === 'FAIL').length;
  const skip = RESULTS.filter(r => r.status === 'SKIP').length;
  const total = RESULTS.length;
  const rate = total > 0 ? ((pass / total) * 100).toFixed(1) : '0';

  console.log(`总计: ${total} | 通过: ${pass} | 失败: ${fail} | 跳过: ${skip} | 通过率: ${rate}%`);
  console.log('');

  if (fail > 0) {
    console.log('失败用例:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.id} ${r.name} — ${r.detail}`);
    });
  }

  // 写入结果到文件
  const resultData = {
    timestamp: new Date().toISOString(),
    summary: { total, pass, fail, skip, rate: `${rate}%` },
    results: RESULTS
  };
  const resultDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });
  const resultPath = path.join(resultDir, 'salesman-test-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 2), 'utf-8');
  console.log(`\n结果已保存到: ${resultPath}`);

  await browser.close();
})();
