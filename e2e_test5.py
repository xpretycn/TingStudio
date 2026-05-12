from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto("http://localhost:5174/login")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    result = page.evaluate("""async () => {
        try {
            const resp = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin123' })
            });
            const data = await resp.json();
            if (data.success && data.data && data.data.token) {
                localStorage.setItem('tingstudio_token', data.data.token);
                localStorage.setItem('tingstudio_user', JSON.stringify(data.data));
                return { success: true, token: data.data.token.substring(0, 30) };
            }
            return { success: false, error: 'No token in response' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }""")
    print(f"Login via fetch: {result}")

    page.goto("http://localhost:5174/ai-assistant")
    page.wait_for_load_state("networkidle")
    time.sleep(8)

    current_url = page.url
    print(f"AI page URL: {current_url}")
    page.screenshot(path="/tmp/e2e_ai_page.png", full_page=True)

    if "/server-error" in current_url or "/login" in current_url:
        print("ERROR: Could not reach AI page")

        ls_token = page.evaluate("() => localStorage.getItem('tingstudio_token')")
        ls_user = page.evaluate("() => localStorage.getItem('tingstudio_user')")
        print(f"localStorage token: {'set' if ls_token else 'null'}")
        print(f"localStorage user: {'set' if ls_user else 'null'}")

        page.screenshot(path="/tmp/e2e_debug.png", full_page=True)
    else:
        print("SUCCESS: Reached AI page!")

        history_sidebar = page.locator(".history-sidebar")
        print(f"History sidebar: {history_sidebar.count()}")

        history_items = page.locator(".history-item")
        print(f"History items: {history_items.count()}")

        messages = page.locator(".message-item")
        print(f"Messages: {messages.count()}")

        if history_items.count() > 0:
            print("✅ History sessions loaded!")
            for i in range(min(history_items.count(), 5)):
                title = history_items.nth(i).locator(".session-title").text_content()
                print(f"  Session {i+1}: {title}")

            history_items.first.click()
            time.sleep(3)
            messages = page.locator(".message-item")
            print(f"Messages after clicking first session: {messages.count()}")

        print("\n--- Test: Navigate away and back ---")
        page.goto("http://localhost:5174/materials")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        page.goto("http://localhost:5174/ai-assistant")
        page.wait_for_load_state("networkidle")
        time.sleep(8)

        page.screenshot(path="/tmp/e2e_navigate_back.png", full_page=True)

        history_items = page.locator(".history-item")
        print(f"History items after navigate back: {history_items.count()}")

        messages = page.locator(".message-item")
        print(f"Messages after navigate back: {messages.count()}")

        if history_items.count() > 0:
            print("✅ PASS: History sessions persist after navigation!")
        if messages.count() > 0:
            print("✅ PASS: Messages restored after navigation!")

    browser.close()
