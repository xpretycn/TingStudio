from playwright.sync_api import sync_playwright
import time
import json
import urllib.request

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})

    req = urllib.request.Request(
        "http://localhost:3000/api/auth/login",
        data=json.dumps({"username": "admin", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        login_data = json.loads(resp.read().decode())
    token = login_data["data"]["token"]
    user_data = login_data["data"]

    page = context.new_page()

    page.goto("http://localhost:5174/login")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    inputs = page.locator("input").all()
    inputs[0].fill("admin")
    inputs[1].fill("admin123")

    page.locator('button[type="submit"]').click()
    time.sleep(5)
    page.wait_for_load_state("networkidle")

    current_url = page.url
    print(f"After login attempt URL: {current_url}")

    if "/login" in current_url:
        print("UI login failed, setting localStorage directly...")
        page.goto("http://localhost:5174/")
        page.evaluate(f"""() => {{
            localStorage.setItem('tingstudio_token', '{token}');
            localStorage.setItem('tingstudio_user', JSON.stringify({json.dumps(user_data)}));
        }}""")

    page.goto("http://localhost:5174/ai-assistant")
    page.wait_for_load_state("networkidle")
    time.sleep(8)

    current_url = page.url
    print(f"AI page URL: {current_url}")

    if "/server-error" in current_url or "/login" in current_url:
        print("ERROR: Could not reach AI page")
        page.screenshot(path="/tmp/e2e_error.png", full_page=True)

        ls_token = page.evaluate("() => localStorage.getItem('tingstudio_token')")
        ls_user = page.evaluate("() => localStorage.getItem('tingstudio_user')")
        print(f"localStorage token: {'set' if ls_token else 'null'}")
        print(f"localStorage user: {'set' if ls_user else 'null'}")

        page.goto("http://localhost:5174/")
        page.evaluate(f"""() => {{
            localStorage.setItem('tingstudio_token', '{token}');
            localStorage.setItem('tingstudio_user', JSON.stringify({json.dumps(user_data)}));
        }}""")

        page.goto("http://localhost:5174/ai-assistant")
        page.wait_for_load_state("networkidle")
        time.sleep(8)
        current_url = page.url
        print(f"Second attempt AI page URL: {current_url}")

    page.screenshot(path="/tmp/e2e_ai_page.png", full_page=True)

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
    else:
        print("❌ FAIL: No history sessions after navigation")

    if messages.count() > 0:
        print("✅ PASS: Messages restored after navigation!")
    else:
        print("⚠️ No messages visible (may need to click session)")

    browser.close()
