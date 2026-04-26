from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})

    # Capture console logs
    console_logs = []
    def handle_console(msg):
        console_logs.append(f"{msg.type}: {msg.text}")
    page.on("console", handle_console)

    # Capture errors
    errors = []
    def handle_error(err):
        errors.append(str(err))
    page.on("pageerror", handle_error)

    page.goto('http://localhost:5174')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)

    # Login
    page.fill('input[placeholder*="用户名"], input[type="text"]', 'admin')
    page.fill('input[placeholder*="密码"], input[type="password"]', 'admin123')
    page.click('button:has-text("登录"), button[type="submit"]')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Navigate to formula list first, then click a formula
    page.goto('http://localhost:5174/formulas')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    print(f"Formula list URL: {page.url}")

    # Try to find and click on a formula card/link
    formula_links = page.locator('.formula-card, [class*="formula"] a, .t-table tbody tr').all()
    print(f"Found {len(formula_links)} potential formula elements")

    if len(formula_links) > 0:
        # Click the first one
        formula_links[0].click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
    else:
        # Try direct URL with different IDs
        for fid in ['1', '2', '3']:
            page.goto(f'http://localhost:5174/formulas/{fid}')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)

            # Check if we have content (not just sidebar)
            content = page.locator('.detail-main, .formula-detail, .info-card')
            if content.count() > 3:
                print(f"Found detail content for formula ID {fid}")
                break

    print(f"Final URL: {page.url}")
    page.screenshot(path='d:/ProgramData/workspace-codeby/ting-studio/test/debug_detail.png', full_page=True)
    print("Screenshot saved")

    # Check if quote card exists
    quote_card = page.locator('.quote-card')
    print(f"Quote card found: {quote_card.count() > 0}")

    info_cards = page.locator('.info-card')
    print(f"Info cards found: {info_cards.count()}")

    if quote_card.count() > 0:
        mat_list = page.locator('.qt-mat-list')
        print(f"Mat list found: {mat_list.count() > 0}")

        summary = page.locator('.qt-summary')
        print(f"Summary found: {summary.count() > 0}")

    # Print console logs
    if console_logs:
        print("\n--- Console Logs ---")
        for log in console_logs[-20:]:
            print(log)

    # Print errors
    if errors:
        print("\n--- Page Errors ---")
        for err in errors[:10]:
            print(err)

    browser.close()
