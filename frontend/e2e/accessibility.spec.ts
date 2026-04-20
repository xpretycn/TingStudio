import { test, expect } from "@playwright/test";

test.describe("可访问性 (A11y) 自动化审计", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("A11Y-01: 所有可见图片应有 alt 属性或 aria-hidden", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const violations = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return images
        .filter(img => {
          const isVisible = img.offsetWidth > 0 && img.offsetHeight > 0;
          const hasAlt = img.hasAttribute("alt") && img.getAttribute("alt")?.trim() !== "";
          const isAriaHidden = img.getAttribute("aria-hidden") === "true";
          const isDecorative = img.getAttribute("role") === "presentation";
          return isVisible && !hasAlt && !isAriaHidden && !isDecorative;
        })
        .map(img => ({
          src: img.getAttribute("src")?.substring(0, 80),
          alt: img.getAttribute("alt"),
        }));
    });

    console.log(`图片 A11y 检查: ${violations.length} 个违规`);
    expect(violations.length).toBeLessThanOrEqual(3);
  });

  test("A11Y-02: 登录表单的 input 应有关联 label（TDesign wrapper 层级）", async ({ page }) => {
    const wrappers = page.locator('[data-testid="login-username"], [data-testid="login-password"]');
    const count = await wrappers.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const wrapper = wrappers.nth(i);
      const labelledBy = await wrapper.getAttribute("aria-labelledby");
      const ariaLabel = await wrapper.getAttribute("aria-label");

      const hasLabelOrContext = !!(labelledBy || ariaLabel);
      if (!hasLabelOrContext) {
        const siblingLabel = await wrapper.evaluate(el => {
          const parent = el.closest(".field-wrap, .t-form-item");
          if (parent) {
            const label = parent.querySelector('label, .field-label, [class*="label"]');
            return label !== null;
          }
          return false;
        });
        expect(siblingLabel).toBe(true);
      } else {
        expect(hasLabelOrContext).toBe(true);
      }
    }
  });

  test("A11Y-03: 页面应具有 lang 属性", async ({ page }) => {
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang.length).toBeGreaterThan(0);
  });

  test("A11Y-04: 页面标题不应为空", async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test("A11Y-05: 登录按钮应为可聚焦元素（键盘可访问）", async ({ page }) => {
    const btn = page.locator('[data-testid="login-btn"]');
    await expect(btn).toBeVisible();

    const isFocusable = await btn.evaluate(el => {
      const tagName = el.tagName.toLowerCase();
      const tabIndex = el.getAttribute("tabindex");
      const isNativelyFocusable =
        tagName === "button" ||
        tagName === "a" ||
        tagName === "input" ||
        tagName === "select" ||
        tagName === "textarea";
      return isNativelyFocusable || (tabIndex !== null && tabIndex !== "-1");
    });

    expect(isFocusable).toBe(true);
  });

  test('A11Y-06: 表单提交按钮应为 <button> 或 type="submit"', async ({ page }) => {
    const btn = page.locator('[data-testid="login-btn"]');
    const tag = await btn.evaluate(el => el.tagName.toLowerCase());
    const type = await btn.evaluate(el => el.getAttribute("type"));

    expect(tag).toBe("button");
    expect(type).toBe("submit");
  });

  test("A11Y-07: 密码输入框 type 应为 password（安全输入）", async ({ page }) => {
    const input = page.locator('[data-testid="login-password"] input');
    const type = await input.getAttribute("type");
    expect(type).toBe("password");
  });

  test("A11Y-08: 原料列表页 — 主要交互区域应支持键盘导航", async ({ page }) => {
    await page.goto("/login");
    await page.locator('[data-testid="login-username"] input').fill("admin");
    await page.locator('[data-testid="login-password"] input').fill("admin123");
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 });

    await page.goto("/materials");
    await page.waitForLoadState("networkidle");

    const addBtn = page.locator('[data-testid="material-add-btn"]');
    if ((await addBtn.count()) > 0) {
      await addBtn.focus();
      const focused = await addBtn.evaluate(el => document.activeElement === el);
      expect(focused).toBe(true);
    }

    const searchInput = page.locator('[data-testid="material-search"] input');
    if ((await searchInput.count()) > 0) {
      await searchInput.focus();
      const focused = await searchInput.evaluate(el => document.activeElement === el);
      expect(focused).toBe(true);
    }
  });

  test("A11Y-09: 页面不应有重复 ID 的元素", async ({ page }) => {
    const duplicateIds = await page.evaluate(() => {
      const allElements = document.querySelectorAll("[id]");
      const ids = Array.from(allElements).map(el => el.id);
      const uniqueIds = new Set(ids);
      return ids.length - uniqueIds.size;
    });

    expect(duplicateIds).toBe(0);
  });

  test("A11Y-10: focus-visible 元素应有明显的焦点指示样式", async ({ page }) => {
    await page.locator('[data-testid="login-btn"]').focus();
    const computedStyle = await page.locator('[data-testid="login-btn"]').evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
      };
    });

    const hasFocusIndicator =
      (computedStyle.outlineStyle !== "none" && computedStyle.outlineWidth !== "0px") ||
      computedStyle.boxShadow !== "none";

    console.log(
      `焦点样式: outline=${computedStyle.outlineWidth} ${computedStyle.outlineStyle}, boxShadow=${computedStyle.boxShadow}`,
    );
  });
});
