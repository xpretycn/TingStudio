from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto("http://localhost:5174/login")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    inputs = page.locator("input").all()
    inputs[0].fill("admin")
    inputs[1].fill("admin123")

    page.locator('button[type="submit"]').click()

    time.sleep(8)
    page.wait_for_load_state("networkidle")

    current_url = page.url
    print(f"After login URL: {current_url}")

    if "/login" not in current_url and "/server-error" not in current_url:
        print("Login successful!")

        page.goto("http://localhost:5174/ai-assistant")
        page.wait_for_load_state("networkidle")
        time.sleep(8)

        page.screenshot(path="/tmp/e2e_ai_page.png", full_page=True)

        history_items = page.locator(".history-item")
        print(f"History items: {history_items.count()}")

        messages = page.locator(".message-item")
        print(f"Messages: {messages.count()}")
    else:
        print(f"Login failed, still on: {current_url}")

        page.screenshot(path="/tmp/e2e_login_fail.png", full_page=True)

        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

        page.goto("http://localhost:5174/login")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        inputs = page.locator("input").all()
        inputs[0].fill("admin")
        inputs[1].fill("admin123")

        page.evaluate("""() => {
            const form = document.querySelector('form');
            if (form) {
                const event = new Event('submit', { cancelable: true, bubbles: true });
                form.dispatchEvent(event);
            }
        }""")

        time.sleep(8)
        page.wait_for_load_state("networkidle")
        print(f"After form dispatch URL: {page.url}")

        if console_errors:
            print("Console errors:")
            for e in console_errors[-10:]:
                print(f"  {e}")

    browser.close()
