import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1400, "height": 900})
    page = context.new_page()

    page.goto("http://localhost:5173/login")
    time.sleep(1)
    page.fill('input[type="text"], input[placeholder*="用户"]', "admin")
    page.fill('input[type="password"], input[placeholder*="密码"]', "admin123")
    page.click('button:has-text("登录")')
    time.sleep(2)

    page.goto("http://localhost:5173/models")
    time.sleep(2)

    float_tab = page.locator(".nav-tab").filter(has_text="悬浮助手")
    if float_tab.count() > 0:
        float_tab.first.click()
        time.sleep(2)
        print("Clicked float assistant tab")
    else:
        print("Float assistant tab not found")
        tabs = page.locator(".nav-tab")
        for i in range(tabs.count()):
            print(f"Tab {i}: {tabs.nth(i).text_content()}")

    page.screenshot(path="float_model_select.png")
    print("Screenshot saved")

    model_field = page.locator(".fa-field").filter(has_text="AI 模型")
    if model_field.count() > 0:
        print("Found AI model field")
        select = model_field.first.locator(".t-select")
        print(f"Found {select.count()} t-select elements in AI model field")
    else:
        print("AI model field not found")

    fallback_field = page.locator(".fa-field").filter(has_text="备用模型")
    if fallback_field.count() > 0:
        print("Found fallback model field")
        select = fallback_field.first.locator(".t-select")
        print(f"Found {select.count()} t-select elements in fallback model field")
    else:
        print("Fallback model field not found")

    # Click the AI model select to open dropdown
    if model_field.count() > 0:
        select_el = model_field.first.locator(".t-select")
        if select_el.count() > 0:
            select_el.first.click()
            time.sleep(1)
            page.screenshot(path="float_model_dropdown.png")
            print("Dropdown screenshot saved")

            # Check for option groups
            groups = page.locator(".t-select-option-group")
            print(f"Found {groups.count()} option groups")

            options = page.locator(".t-select-option")
            print(f"Found {options.count()} options total")

            # List first few options
            for i in range(min(options.count(), 15)):
                text = options.nth(i).text_content()
                print(f"  Option {i}: {text.strip() if text else 'N/A'}")

    browser.close()
    print("Done")
