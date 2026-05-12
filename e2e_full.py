from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:5174/login")
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    page.evaluate("""async () => {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const data = await resp.json();
        if (data.success && data.data && data.data.token) {
            localStorage.setItem('tingstudio_token', data.data.token);
            localStorage.setItem('tingstudio_user', JSON.stringify(data.data));
        }
    }""")

    page.goto("http://localhost:5174/ai-assistant", wait_until="domcontentloaded")
    time.sleep(12)

    current_url = page.url
    print(f"Step 1 - AI page URL: {current_url}")

    if "/server-error" in current_url or "/login" in current_url:
        print("ERROR: Redirected away from AI page")
        relevant = [m for m in console_msgs if 'error' in m.lower() or 'cors' in m.lower()]
        for m in relevant[-10:]:
            print(f"  {m}")
    else:
        print("SUCCESS: On AI page!")

        page.screenshot(path="/tmp/e2e_step1.png", full_page=True)

        history_sidebar = page.locator(".history-sidebar")
        history_items = page.locator(".history-item")
        messages = page.locator(".message-item")

        print(f"  History sidebar: {history_sidebar.count()}")
        print(f"  History items: {history_items.count()}")
        print(f"  Messages: {messages.count()}")

        if history_items.count() > 0:
            print("  ✅ History sessions loaded!")
            for i in range(min(history_items.count(), 5)):
                title = history_items.nth(i).locator(".session-title").text_content()
                print(f"    Session {i+1}: {title}")

            history_items.first.click()
            time.sleep(3)
            messages = page.locator(".message-item")
            print(f"  Messages after clicking first session: {messages.count()}")
            if messages.count() > 0:
                print("  ✅ Messages loaded from session!")

        print("\nStep 2 - Navigate away and back...")
        page.goto("http://localhost:5174/materials")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        page.goto("http://localhost:5174/ai-assistant", wait_until="domcontentloaded")
        time.sleep(12)

        current_url = page.url
        print(f"  URL after navigate back: {current_url}")

        if "/server-error" not in current_url and "/login" not in current_url:
            page.screenshot(path="/tmp/e2e_step2.png", full_page=True)

            history_items = page.locator(".history-item")
            messages = page.locator(".message-item")

            print(f"  History items after navigate back: {history_items.count()}")
            print(f"  Messages after navigate back: {messages.count()}")

            if history_items.count() > 0:
                print("  ✅ PASS: History sessions persist after navigation!")
            if messages.count() > 0:
                print("  ✅ PASS: Messages restored after navigation!")
        else:
            print("  ❌ FAIL: Redirected away after navigate back")

    browser.close()
