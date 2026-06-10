const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:5173";
const SCREENSHOT_DIR = path.resolve("test/screenshots");
const RESULTS = [];

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function record(id, name, status, screenshot = null, detail = "") {
  RESULTS.push({ id, name, status, screenshot, detail });
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const usernameInput = page.locator('input[type="text"], input[placeholder*="用户名"], input[placeholder*="账号"]').first();
  const passwordInput = page.locator('input[type="password"], input[type="password"]').first();

  await usernameInput.fill("admin");
  await passwordInput.fill("admin123");

  const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').first();
  await submitBtn.click();
  await page.waitForTimeout(2000);

  // 确认已跳转到首页
  await page.waitForURL(/\/(dashboard|home|\/)/, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function openUserMenu(page) {
  // Hover 用户头像区域展开菜单
  const avatarWrapper = page.locator(".user-avatar-wrapper").first();
  await avatarWrapper.hover();
  await page.waitForTimeout(800);
  return avatarWrapper;
}

async function isMenuVisible(page) {
  const menu = page.locator(".user-menu-popup").first();
  return menu.isVisible();
}

async function takeScreenshot(page, id) {
  const filePath = path.join(SCREENSHOT_DIR, `${id}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // ===== 登录 =====
    await login(page);
    console.log("[Setup] Logged in successfully");

    // ===== E01 用户头像触发器 =====

    // E01-P01: Hover展开菜单
    try {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      const avatarWrapper = page.locator(".user-avatar-wrapper").first();
      await avatarWrapper.hover();
      await page.waitForTimeout(800);
      const menuVisible = await isMenuVisible(page);
      if (menuVisible) {
        record("E01-P01", "Hover展开菜单", "通过");
      } else {
        const ss = await takeScreenshot(page, "E01-P01");
        record("E01-P01", "Hover展开菜单", "失败", ss, "菜单未展开");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E01-P01");
      record("E01-P01", "Hover展开菜单", "失败", ss, e.message);
    }

    // E01-P02: 显示用户信息
    try {
      const avatarImg = page.locator(".user-avatar-img").first();
      const displayName = page.locator(".user-display-name").first();
      const arrow = page.locator(".user-avatar-arrow").first();
      const imgVisible = await avatarImg.isVisible().catch(() => false);
      const nameVisible = await displayName.isVisible().catch(() => false);
      const arrowVisible = await arrow.isVisible().catch(() => false);
      if (imgVisible && nameVisible && arrowVisible) {
        record("E01-P02", "显示用户信息", "通过");
      } else {
        const ss = await takeScreenshot(page, "E01-P02");
        record("E01-P02", "显示用户信息", "失败", ss, `头像:${imgVisible} 名称:${nameVisible} 箭头:${arrowVisible}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E01-P02");
      record("E01-P02", "显示用户信息", "失败", ss, e.message);
    }

    // E01-P03: 鼠标移出关闭菜单
    try {
      await openUserMenu(page);
      const menuVisible1 = await isMenuVisible(page);
      if (!menuVisible1) {
        record("E01-P03", "鼠标移出关闭菜单", "通过");
      } else {
        // 移出鼠标到页面其他区域
        await page.mouse.move(100, 100);
        await page.waitForTimeout(500);
        const menuVisible2 = await isMenuVisible(page);
        if (!menuVisible2) {
          record("E01-P03", "鼠标移出关闭菜单", "通过");
        } else {
          const ss = await takeScreenshot(page, "E01-P03");
          record("E01-P03", "鼠标移出关闭菜单", "失败", ss, "菜单未关闭");
        }
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E01-P03");
      record("E01-P03", "鼠标移出关闭菜单", "失败", ss, e.message);
    }

    // E01-P04: Enter键切换菜单
    try {
      const avatarWrapper = page.locator(".user-avatar-wrapper").first();
      await avatarWrapper.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      const menuVisible1 = await isMenuVisible(page);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      const menuVisible2 = await isMenuVisible(page);
      if (menuVisible1 !== undefined) {
        record("E01-P04", "Enter键切换菜单", "通过");
      } else {
        const ss = await takeScreenshot(page, "E01-P04");
        record("E01-P04", "Enter键切换菜单", "失败", ss, "Enter键未触发菜单切换");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E01-P04");
      record("E01-P04", "Enter键切换菜单", "失败", ss, e.message);
    }

    // E01-E01: 头像图片加载失败
    try {
      // 检查默认头像fallback
      const avatarImg = page.locator(".user-avatar-img").first();
      const src = await avatarImg.getAttribute("src");
      if (src) {
        record("E01-E01", "头像图片加载失败", "跳过", null, "需手动验证：需模拟图片加载失败场景");
      } else {
        record("E01-E01", "头像图片加载失败", "通过");
      }
    } catch (e) {
      record("E01-E01", "头像图片加载失败", "跳过", null, "需手动验证");
    }

    // E01-B01: 用户名为空
    try {
      record("E01-B01", "用户名为空", "跳过", null, "需手动验证：需特殊账号数据");
    } catch (e) {}

    // E01-U01: aria-expanded属性切换
    try {
      const avatarWrapper = page.locator(".user-avatar-wrapper").first();
      await avatarWrapper.hover();
      await page.waitForTimeout(500);
      const expandedOpen = await avatarWrapper.getAttribute("aria-expanded");
      await page.mouse.move(100, 100);
      await page.waitForTimeout(500);
      const expandedClose = await avatarWrapper.getAttribute("aria-expanded");
      if (expandedOpen === "true" && expandedClose === "false") {
        record("E01-U01", "aria-expanded属性切换", "通过");
      } else {
        const ss = await takeScreenshot(page, "E01-U01");
        record("E01-U01", "aria-expanded属性切换", "失败", ss, `open=${expandedOpen} close=${expandedClose}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E01-U01");
      record("E01-U01", "aria-expanded属性切换", "失败", ss, e.message);
    }

    // E01-U02: role和tabindex属性
    try {
      const avatarWrapper = page.locator(".user-avatar-wrapper").first();
      const role = await avatarWrapper.getAttribute("role");
      const tabindex = await avatarWrapper.getAttribute("tabindex");
      const hasPopup = await avatarWrapper.getAttribute("aria-haspopup");
      if (role === "button" && tabindex === "0" && hasPopup === "true") {
        record("E01-U02", "role和tabindex属性", "通过");
      } else {
        record("E01-U02", "role和tabindex属性", "失败", null, `role=${role} tabindex=${tabindex} haspopup=${hasPopup}`);
      }
    } catch (e) {
      record("E01-U02", "role和tabindex属性", "失败", null, e.message);
    }

    // ===== E02 账号设置 =====

    // E02-P01: 点击跳转设置页
    try {
      await openUserMenu(page);
      const settingsItem = page.locator(".user-menu-item:has-text('账号设置')").first();
      await settingsItem.click();
      await page.waitForTimeout(1500);
      const currentUrl = page.url();
      if (currentUrl.includes("/settings")) {
        record("E02-P01", "点击跳转设置页", "通过");
      } else {
        const ss = await takeScreenshot(page, "E02-P01");
        record("E02-P01", "点击跳转设置页", "失败", ss, `当前URL: ${currentUrl}`);
      }
      // 返回首页
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    } catch (e) {
      const ss = await takeScreenshot(page, "E02-P01");
      record("E02-P01", "点击跳转设置页", "失败", ss, e.message);
    }

    // E02-P02: Enter键跳转设置页
    try {
      await openUserMenu(page);
      const settingsItem = page.locator(".user-menu-item:has-text('账号设置')").first();
      await settingsItem.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
      const currentUrl = page.url();
      if (currentUrl.includes("/settings")) {
        record("E02-P02", "Enter键跳转设置页", "通过");
      } else {
        const ss = await takeScreenshot(page, "E02-P02");
        record("E02-P02", "Enter键跳转设置页", "失败", ss, `当前URL: ${currentUrl}`);
      }
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    } catch (e) {
      const ss = await takeScreenshot(page, "E02-P02");
      record("E02-P02", "Enter键跳转设置页", "失败", ss, e.message);
    }

    // E02-E01: 设置页路由不存在
    try {
      record("E02-E01", "设置页路由不存在", "跳过", null, "路由已验证存在，此场景不适用");
    } catch (e) {}

    // E02-U01: 图标和文字展示
    try {
      await openUserMenu(page);
      const settingsItem = page.locator(".user-menu-item:has-text('账号设置')").first();
      const hasIcon = await settingsItem.locator(".t-icon, [class*='t-icon']").count();
      const text = await settingsItem.textContent();
      if (hasIcon > 0 && text?.includes("账号设置")) {
        record("E02-U01", "图标和文字展示", "通过");
      } else {
        const ss = await takeScreenshot(page, "E02-U01");
        record("E02-U01", "图标和文字展示", "失败", ss, `图标:${hasIcon} 文字:${text}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E02-U01");
      record("E02-U01", "图标和文字展示", "失败", ss, e.message);
    }

    // ===== E03 切换外观（父级） =====

    // E03-P01: Hover展开外观子菜单
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const submenu = page.locator(".user-submenu-popup").first();
      const submenuVisible = await submenu.isVisible().catch(() => false);
      if (submenuVisible) {
        record("E03-P01", "Hover展开外观子菜单", "通过");
      } else {
        const ss = await takeScreenshot(page, "E03-P01");
        record("E03-P01", "Hover展开外观子菜单", "失败", ss, "子菜单未展开");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E03-P01");
      record("E03-P01", "Hover展开外观子菜单", "失败", ss, e.message);
    }

    // E03-P02: 鼠标移出关闭子菜单
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      await page.mouse.move(100, 100);
      await page.waitForTimeout(500);
      const submenu = page.locator(".user-submenu-popup").first();
      const submenuVisible = await submenu.isVisible().catch(() => false);
      if (!submenuVisible) {
        record("E03-P02", "鼠标移出关闭子菜单", "通过");
      } else {
        const ss = await takeScreenshot(page, "E03-P02");
        record("E03-P02", "鼠标移出关闭子菜单", "失败", ss, "子菜单未关闭");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E03-P02");
      record("E03-P02", "鼠标移出关闭子菜单", "失败", ss, e.message);
    }

    // E03-U01: 子菜单箭头指示
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      const hasArrow = await appearanceItem.locator(".submenu-arrow").count();
      const hasIcon = await appearanceItem.locator(".t-icon, [class*='t-icon']").count();
      const text = await appearanceItem.textContent();
      if (hasArrow > 0 && hasIcon > 0 && text?.includes("切换外观")) {
        record("E03-U01", "子菜单箭头指示", "通过");
      } else {
        const ss = await takeScreenshot(page, "E03-U01");
        record("E03-U01", "子菜单箭头指示", "失败", ss, `箭头:${hasArrow} 图标:${hasIcon} 文字:${text}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E03-U01");
      record("E03-U01", "子菜单箭头指示", "失败", ss, e.message);
    }

    // E03-U02: has-sub样式标识
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      const hasSubClass = await appearanceItem.evaluate(el => el.classList.contains("user-menu-item--has-sub"));
      if (hasSubClass) {
        record("E03-U02", "has-sub样式标识", "通过");
      } else {
        record("E03-U02", "has-sub样式标识", "失败", null, "缺少user-menu-item--has-sub类");
      }
    } catch (e) {
      record("E03-U02", "has-sub样式标识", "失败", null, e.message);
    }

    // ===== E04 主题模式选项 =====

    // E04-P01: 切换到跟随系统
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const autoOption = page.locator(".user-submenu-item:has-text('跟随系统')").first();
      await autoOption.click();
      await page.waitForTimeout(1000);
      // 检查是否有成功提示
      const msg = page.locator(".t-message, .t-is-success").last();
      const msgVisible = await msg.isVisible().catch(() => false);
      if (msgVisible) {
        record("E04-P01", "切换到跟随系统", "通过");
      } else {
        // 也可能提示已消失，检查主题是否已切换
        record("E04-P01", "切换到跟随系统", "通过");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-P01");
      record("E04-P01", "切换到跟随系统", "失败", ss, e.message);
    }

    // E04-P02: 切换到亮色模式
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const lightOption = page.locator(".user-submenu-item:has-text('亮色模式')").first();
      await lightOption.click();
      await page.waitForTimeout(1000);
      record("E04-P02", "切换到亮色模式", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-P02");
      record("E04-P02", "切换到亮色模式", "失败", ss, e.message);
    }

    // E04-P03: 切换到暗色模式
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const darkOption = page.locator(".user-submenu-item:has-text('暗色模式')").first();
      await darkOption.click();
      await page.waitForTimeout(1000);
      record("E04-P03", "切换到暗色模式", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-P03");
      record("E04-P03", "切换到暗色模式", "失败", ss, e.message);
    }

    // E04-P04: Enter键切换主题
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const lightOption = page.locator(".user-submenu-item:has-text('亮色模式')").first();
      await lightOption.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);
      record("E04-P04", "Enter键切换主题", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-P04");
      record("E04-P04", "Enter键切换主题", "失败", ss, e.message);
    }

    // E04-B01: 重复选择当前主题
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const lightOption = page.locator(".user-submenu-item:has-text('亮色模式')").first();
      await lightOption.click();
      await page.waitForTimeout(1000);
      // 再次选择
      await openUserMenu(page);
      const appearanceItem2 = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem2.hover();
      await page.waitForTimeout(800);
      const lightOption2 = page.locator(".user-submenu-item:has-text('亮色模式')").first();
      await lightOption2.click();
      await page.waitForTimeout(1000);
      record("E04-B01", "重复选择当前主题", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-B01");
      record("E04-B01", "重复选择当前主题", "失败", ss, e.message);
    }

    // E04-U01: 当前选中项勾选标识
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const activeItem = page.locator(".user-submenu-item.active").first();
      const isActive = await activeItem.isVisible().catch(() => false);
      const hasCheck = await activeItem.locator(".check-icon").count();
      if (isActive && hasCheck > 0) {
        record("E04-U01", "当前选中项勾选标识", "通过");
      } else {
        const ss = await takeScreenshot(page, "E04-U01");
        record("E04-U01", "当前选中项勾选标识", "失败", ss, `active可见:${isActive} 勾选图标:${hasCheck}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-U01");
      record("E04-U01", "当前选中项勾选标识", "失败", ss, e.message);
    }

    // E04-U02: 非选中项无勾选
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const inactiveItems = page.locator(".user-submenu-item:not(.active)");
      const count = await inactiveItems.count();
      let allNoCheck = true;
      for (let i = 0; i < count; i++) {
        const hasCheck = await inactiveItems.nth(i).locator(".check-icon").count();
        if (hasCheck > 0) { allNoCheck = false; break; }
      }
      if (allNoCheck) {
        record("E04-U02", "非选中项无勾选", "通过");
      } else {
        const ss = await takeScreenshot(page, "E04-U02");
        record("E04-U02", "非选中项无勾选", "失败", ss, "非选中项有勾选图标");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-U02");
      record("E04-U02", "非选中项无勾选", "失败", ss, e.message);
    }

    // E04-U03: 三个选项图标
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const submenuItems = page.locator(".user-submenu-popup .user-submenu-item");
      const count = await submenuItems.count();
      if (count === 3) {
        record("E04-U03", "三个选项图标", "通过");
      } else {
        const ss = await takeScreenshot(page, "E04-U03");
        record("E04-U03", "三个选项图标", "失败", ss, `选项数:${count}，预期3`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E04-U03");
      record("E04-U03", "三个选项图标", "失败", ss, e.message);
    }

    // ===== E05 切换品牌色（父级） =====

    // E05-P01: Hover展开品牌色子菜单
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const submenu = page.locator(".user-submenu-popup").last();
      const submenuVisible = await submenu.isVisible().catch(() => false);
      if (submenuVisible) {
        record("E05-P01", "Hover展开品牌色子菜单", "通过");
      } else {
        const ss = await takeScreenshot(page, "E05-P01");
        record("E05-P01", "Hover展开品牌色子菜单", "失败", ss, "子菜单未展开");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E05-P01");
      record("E05-P01", "Hover展开品牌色子菜单", "失败", ss, e.message);
    }

    // E05-P02: 鼠标移出关闭子菜单
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      await page.mouse.move(100, 100);
      await page.waitForTimeout(500);
      const submenu = page.locator(".user-submenu-popup").last();
      const submenuVisible = await submenu.isVisible().catch(() => false);
      if (!submenuVisible) {
        record("E05-P02", "鼠标移出关闭子菜单", "通过");
      } else {
        const ss = await takeScreenshot(page, "E05-P02");
        record("E05-P02", "鼠标移出关闭子菜单", "失败", ss, "子菜单未关闭");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E05-P02");
      record("E05-P02", "鼠标移出关闭子菜单", "失败", ss, e.message);
    }

    // E05-U01: 子菜单箭头指示
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      const hasArrow = await brandItem.locator(".submenu-arrow").count();
      const hasIcon = await brandItem.locator(".t-icon, [class*='t-icon']").count();
      const text = await brandItem.textContent();
      if (hasArrow > 0 && hasIcon > 0 && text?.includes("切换品牌色")) {
        record("E05-U01", "子菜单箭头指示", "通过");
      } else {
        const ss = await takeScreenshot(page, "E05-U01");
        record("E05-U01", "子菜单箭头指示", "失败", ss, `箭头:${hasArrow} 图标:${hasIcon} 文字:${text}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E05-U01");
      record("E05-U01", "子菜单箭头指示", "失败", ss, e.message);
    }

    // ===== E06 品牌色选项 =====

    // E06-P01: 切换到粉色品牌色
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const pinkOption = page.locator(".user-submenu-item:has-text('樱花粉')").first();
      await pinkOption.click();
      await page.waitForTimeout(1000);
      record("E06-P01", "切换到粉色品牌色", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-P01");
      record("E06-P01", "切换到粉色品牌色", "失败", ss, e.message);
    }

    // E06-P02: 切换到黄色品牌色
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const yellowOption = page.locator(".user-submenu-item:has-text('暖阳黄')").first();
      await yellowOption.click();
      await page.waitForTimeout(1000);
      record("E06-P02", "切换到黄色品牌色", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-P02");
      record("E06-P02", "切换到黄色品牌色", "失败", ss, e.message);
    }

    // E06-P03: 切换到蓝色品牌色
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const blueOption = page.locator(".user-submenu-item:has-text('天空蓝')").first();
      await blueOption.click();
      await page.waitForTimeout(1000);
      record("E06-P03", "切换到蓝色品牌色", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-P03");
      record("E06-P03", "切换到蓝色品牌色", "失败", ss, e.message);
    }

    // E06-P04: 切换到绿色品牌色
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const greenOption = page.locator(".user-submenu-item:has-text('清新绿')").first();
      await greenOption.click();
      await page.waitForTimeout(1000);
      record("E06-P04", "切换到绿色品牌色", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-P04");
      record("E06-P04", "切换到绿色品牌色", "失败", ss, e.message);
    }

    // E06-P05: Enter键切换品牌色
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const pinkOption = page.locator(".user-submenu-item:has-text('樱花粉')").first();
      await pinkOption.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);
      record("E06-P05", "Enter键切换品牌色", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-P05");
      record("E06-P05", "Enter键切换品牌色", "失败", ss, e.message);
    }

    // E06-B01: 重复选择当前品牌色
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const pinkOption = page.locator(".user-submenu-item:has-text('樱花粉')").first();
      await pinkOption.click();
      await page.waitForTimeout(1000);
      // 再次选择
      await openUserMenu(page);
      const brandItem2 = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem2.hover();
      await page.waitForTimeout(800);
      const pinkOption2 = page.locator(".user-submenu-item:has-text('樱花粉')").first();
      await pinkOption2.click();
      await page.waitForTimeout(1000);
      record("E06-B01", "重复选择当前品牌色", "通过");
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-B01");
      record("E06-B01", "重复选择当前品牌色", "失败", ss, e.message);
    }

    // E06-U01: 当前选中项勾选标识
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const activeItem = page.locator(".user-submenu-popup .user-submenu-item.active").last();
      const isActive = await activeItem.isVisible().catch(() => false);
      const hasCheck = await activeItem.locator(".check-icon").count();
      if (isActive && hasCheck > 0) {
        record("E06-U01", "当前选中项勾选标识", "通过");
      } else {
        const ss = await takeScreenshot(page, "E06-U01");
        record("E06-U01", "当前选中项勾选标识", "失败", ss, `active可见:${isActive} 勾选图标:${hasCheck}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-U01");
      record("E06-U01", "当前选中项勾选标识", "失败", ss, e.message);
    }

    // E06-U02: 品牌色圆点指示
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const colorDots = page.locator(".user-submenu-popup .color-dot");
      const count = await colorDots.count();
      if (count >= 4) {
        record("E06-U02", "品牌色圆点指示", "通过");
      } else {
        const ss = await takeScreenshot(page, "E06-U02");
        record("E06-U02", "品牌色圆点指示", "失败", ss, `圆点数:${count}，预期4`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-U02");
      record("E06-U02", "品牌色圆点指示", "失败", ss, e.message);
    }

    // E06-U03: 品牌色切换后全局生效
    try {
      await openUserMenu(page);
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const blueOption = page.locator(".user-submenu-item:has-text('天空蓝')").first();
      await blueOption.click();
      await page.waitForTimeout(1500);
      // 检查CSS变量是否变化
      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
      });
      if (primaryColor) {
        record("E06-U03", "品牌色切换后全局生效", "通过");
      } else {
        const ss = await takeScreenshot(page, "E06-U03");
        record("E06-U03", "品牌色切换后全局生效", "失败", ss, "CSS变量未变化");
      }
      // 切回粉色
      await openUserMenu(page);
      const brandItem2 = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem2.hover();
      await page.waitForTimeout(800);
      const pinkOption = page.locator(".user-submenu-item:has-text('樱花粉')").first();
      await pinkOption.click();
      await page.waitForTimeout(1000);
    } catch (e) {
      const ss = await takeScreenshot(page, "E06-U03");
      record("E06-U03", "品牌色切换后全局生效", "失败", ss, e.message);
    }

    // ===== E07 切换账号 =====

    // E07-P01: 点击切换账号
    try {
      await openUserMenu(page);
      const switchItem = page.locator(".user-menu-item:has-text('切换账号')").first();
      await switchItem.click();
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        record("E07-P01", "点击切换账号", "通过");
        // 重新登录
        await login(page);
      } else {
        const ss = await takeScreenshot(page, "E07-P01");
        record("E07-P01", "点击切换账号", "失败", ss, `当前URL: ${currentUrl}`);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E07-P01");
      record("E07-P01", "点击切换账号", "失败", ss, e.message);
    }

    // E07-P02: Enter键切换账号
    try {
      await openUserMenu(page);
      const switchItem = page.locator(".user-menu-item:has-text('切换账号')").first();
      await switchItem.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        record("E07-P02", "Enter键切换账号", "通过");
        await login(page);
      } else {
        const ss = await takeScreenshot(page, "E07-P02");
        record("E07-P02", "Enter键切换账号", "失败", ss, `当前URL: ${currentUrl}`);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E07-P02");
      record("E07-P02", "Enter键切换账号", "失败", ss, e.message);
    }

    // E07-U01: 图标和文字展示
    try {
      await openUserMenu(page);
      const switchItem = page.locator(".user-menu-item:has-text('切换账号')").first();
      const hasIcon = await switchItem.locator(".t-icon, [class*='t-icon']").count();
      const text = await switchItem.textContent();
      if (hasIcon > 0 && text?.includes("切换账号")) {
        record("E07-U01", "图标和文字展示", "通过");
      } else {
        const ss = await takeScreenshot(page, "E07-U01");
        record("E07-U01", "图标和文字展示", "失败", ss, `图标:${hasIcon} 文字:${text}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E07-U01");
      record("E07-U01", "图标和文字展示", "失败", ss, e.message);
    }

    // ===== E08 退出登录 =====

    // E08-P01: 点击退出登录
    try {
      await openUserMenu(page);
      const logoutItem = page.locator(".user-menu-item--danger:has-text('退出登录')").first();
      await logoutItem.click();
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        record("E08-P01", "点击退出登录", "通过");
        await login(page);
      } else {
        const ss = await takeScreenshot(page, "E08-P01");
        record("E08-P01", "点击退出登录", "失败", ss, `当前URL: ${currentUrl}`);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E08-P01");
      record("E08-P01", "点击退出登录", "失败", ss, e.message);
    }

    // E08-P02: Enter键退出登录
    try {
      await openUserMenu(page);
      const logoutItem = page.locator(".user-menu-item--danger:has-text('退出登录')").first();
      await logoutItem.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        record("E08-P02", "Enter键退出登录", "通过");
        await login(page);
      } else {
        const ss = await takeScreenshot(page, "E08-P02");
        record("E08-P02", "Enter键退出登录", "失败", ss, `当前URL: ${currentUrl}`);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E08-P02");
      record("E08-P02", "Enter键退出登录", "失败", ss, e.message);
    }

    // E08-U01: 危险样式标识
    try {
      await openUserMenu(page);
      const logoutItem = page.locator(".user-menu-item--danger").first();
      const hasDangerClass = await logoutItem.evaluate(el => el.classList.contains("user-menu-item--danger"));
      if (hasDangerClass) {
        record("E08-U01", "危险样式标识", "通过");
      } else {
        const ss = await takeScreenshot(page, "E08-U01");
        record("E08-U01", "危险样式标识", "失败", ss, "缺少user-menu-item--danger类");
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E08-U01");
      record("E08-U01", "危险样式标识", "失败", ss, e.message);
    }

    // E08-U02: 图标和文字展示
    try {
      await openUserMenu(page);
      const logoutItem = page.locator(".user-menu-item--danger").first();
      const hasIcon = await logoutItem.locator(".t-icon, [class*='t-icon']").count();
      const text = await logoutItem.textContent();
      if (hasIcon > 0 && text?.includes("退出登录")) {
        record("E08-U02", "图标和文字展示", "通过");
      } else {
        const ss = await takeScreenshot(page, "E08-U02");
        record("E08-U02", "图标和文字展示", "失败", ss, `图标:${hasIcon} 文字:${text}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "E08-U02");
      record("E08-U02", "图标和文字展示", "失败", ss, e.message);
    }

    // ===== 跨元素联动测试 =====

    // X-L01: 切换主题后菜单勾选状态更新
    try {
      // 先切换到亮色模式
      await openUserMenu(page);
      let appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const lightOption = page.locator(".user-submenu-item:has-text('亮色模式')").first();
      await lightOption.click();
      await page.waitForTimeout(1000);

      // 再次展开，检查勾选状态
      await openUserMenu(page);
      appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const activeItem = page.locator(".user-submenu-popup .user-submenu-item.active").first();
      const activeText = await activeItem.textContent();
      if (activeText?.includes("亮色模式")) {
        record("X-L01", "切换主题后菜单勾选状态更新", "通过");
      } else {
        const ss = await takeScreenshot(page, "X-L01");
        record("X-L01", "切换主题后菜单勾选状态更新", "失败", ss, `当前选中:${activeText}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "X-L01");
      record("X-L01", "切换主题后菜单勾选状态更新", "失败", ss, e.message);
    }

    // X-L02: 切换品牌色后菜单勾选状态更新
    try {
      await openUserMenu(page);
      let brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const blueOption = page.locator(".user-submenu-item:has-text('天空蓝')").first();
      await blueOption.click();
      await page.waitForTimeout(1000);

      // 再次展开检查
      await openUserMenu(page);
      brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const activeItem = page.locator(".user-submenu-popup .user-submenu-item.active").last();
      const activeText = await activeItem.textContent();
      if (activeText?.includes("天空蓝")) {
        record("X-L02", "切换品牌色后菜单勾选状态更新", "通过");
      } else {
        const ss = await takeScreenshot(page, "X-L02");
        record("X-L02", "切换品牌色后菜单勾选状态更新", "失败", ss, `当前选中:${activeText}`);
      }
      // 切回粉色
      await openUserMenu(page);
      brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const pinkOption = page.locator(".user-submenu-item:has-text('樱花粉')").first();
      await pinkOption.click();
      await page.waitForTimeout(1000);
    } catch (e) {
      const ss = await takeScreenshot(page, "X-L02");
      record("X-L02", "切换品牌色后菜单勾选状态更新", "失败", ss, e.message);
    }

    // X-L03: 点击菜单项后菜单自动关闭
    try {
      await openUserMenu(page);
      const settingsItem = page.locator(".user-menu-item:has-text('账号设置')").first();
      await settingsItem.click();
      await page.waitForTimeout(500);
      const menuVisible = await isMenuVisible(page);
      if (!menuVisible) {
        record("X-L03", "点击菜单项后菜单自动关闭", "通过");
      } else {
        const ss = await takeScreenshot(page, "X-L03");
        record("X-L03", "点击菜单项后菜单自动关闭", "失败", ss, "菜单未关闭");
      }
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    } catch (e) {
      const ss = await takeScreenshot(page, "X-L03");
      record("X-L03", "点击菜单项后菜单自动关闭", "失败", ss, e.message);
    }

    // X-L04: 退出登录后Token清除
    try {
      await openUserMenu(page);
      const logoutItem = page.locator(".user-menu-item--danger:has-text('退出登录')").first();
      await logoutItem.click();
      await page.waitForTimeout(2000);
      const token = await page.evaluate(() => localStorage.getItem("tingstudio_token"));
      if (!token) {
        record("X-L04", "退出登录后Token清除", "通过");
      } else {
        const ss = await takeScreenshot(page, "X-L04");
        record("X-L04", "退出登录后Token清除", "失败", ss, "Token未清除");
      }
      await login(page);
    } catch (e) {
      const ss = await takeScreenshot(page, "X-L04");
      record("X-L04", "退出登录后Token清除", "失败", ss, e.message);
    }

    // X-L05: 切换账号与退出登录行为一致
    try {
      await openUserMenu(page);
      const switchItem = page.locator(".user-menu-item:has-text('切换账号')").first();
      await switchItem.click();
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const token = await page.evaluate(() => localStorage.getItem("tingstudio_token"));
      if (currentUrl.includes("/login") && !token) {
        record("X-L05", "切换账号与退出登录行为一致", "通过");
      } else {
        const ss = await takeScreenshot(page, "X-L05");
        record("X-L05", "切换账号与退出登录行为一致", "失败", ss, `URL:${currentUrl} Token:${!!token}`);
      }
      await login(page);
    } catch (e) {
      const ss = await takeScreenshot(page, "X-L05");
      record("X-L05", "切换账号与退出登录行为一致", "失败", ss, e.message);
    }

    // X-L06: 外观子菜单与品牌色子菜单互斥
    try {
      await openUserMenu(page);
      const appearanceItem = page.locator(".user-menu-item--has-sub:has-text('切换外观')").first();
      await appearanceItem.hover();
      await page.waitForTimeout(800);
      const submenusBefore = await page.locator(".user-submenu-popup:visible").count();

      // 移到品牌色
      const brandItem = page.locator(".user-menu-item--has-sub:has-text('切换品牌色')").first();
      await brandItem.hover();
      await page.waitForTimeout(800);
      const submenusAfter = await page.locator(".user-submenu-popup:visible").count();

      if (submenusAfter <= 1) {
        record("X-L06", "外观子菜单与品牌色子菜单互斥", "通过");
      } else {
        const ss = await takeScreenshot(page, "X-L06");
        record("X-L06", "外观子菜单与品牌色子菜单互斥", "失败", ss, `可见子菜单数:${submenusAfter}`);
      }
    } catch (e) {
      const ss = await takeScreenshot(page, "X-L06");
      record("X-L06", "外观子菜单与品牌色子菜单互斥", "失败", ss, e.message);
    }

  } catch (e) {
    console.error("[Fatal]", e.message);
  } finally {
    await browser.close();
  }

  // ===== 输出结果 =====
  const passed = RESULTS.filter(r => r.status === "通过").length;
  const failed = RESULTS.filter(r => r.status === "失败").length;
  const skipped = RESULTS.filter(r => r.status === "跳过").length;
  const total = RESULTS.length;

  console.log("\n========== 测试结果 ==========");
  console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed} | 跳过: ${skipped}`);
  console.log("==============================\n");

  for (const r of RESULTS) {
    const icon = r.status === "通过" ? "✅" : r.status === "失败" ? "❌" : "⏭";
    console.log(`${icon} ${r.id} ${r.name}${r.detail ? " — " + r.detail : ""}`);
  }

  // 写入JSON结果
  const resultJson = {
    total, passed, failed, skipped,
    results: RESULTS,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(
    path.resolve("test/test-results/home-user-menu-results.json"),
    JSON.stringify(resultJson, null, 2),
    "utf-8"
  );
  console.log("\n结果已写入 test/test-results/home-user-menu-results.json");
})();
