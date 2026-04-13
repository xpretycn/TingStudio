from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    user_section = page.locator('.header-user-section')
    if user_section.count() > 0:
        avatar = page.locator('.user-avatar-wrapper')
        if avatar.count() > 0:
            avatar.hover()
            page.wait_for_timeout(500)

            popup_content = page.evaluate('''() => {
                const el = document.querySelector('.header-user-section .t-popup__content');
                if (!el) return { error: 'no t-popup__content found' };
                const computed = window.getComputedStyle(el);
                const children = [];
                for (const child of el.children) {
                    const cc = window.getComputedStyle(child);
                    children.push({
                        tag: child.tagName,
                        className: child.className,
                        border: cc.border,
                        borderWidth: cc.borderWidth,
                        borderStyle: cc.borderStyle,
                        borderColor: cc.borderColor,
                        outline: cc.outline,
                        boxShadow: cc.boxShadow,
                    });
                }
                return {
                    tag: el.tagName,
                    className: el.className,
                    border: computed.border,
                    borderWidth: computed.borderWidth,
                    borderStyle: computed.borderStyle,
                    borderColor: computed.borderColor,
                    outline: computed.outline,
                    boxShadow: computed.boxShadow,
                    innerHTML: el.innerHTML.substring(0, 300),
                    children: children
                };
            }''')

            print(json.dumps(popup_content, indent=2, ensure_ascii=False))

            page.screenshot(path='/tmp/popup_inspect.png', full_page=False)

    browser.close()
