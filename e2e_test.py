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
    time.sleep(1)

    page.locator('input[placeholder*="用户名"]').fill("admin")
    page.locator('input[placeholder*="密码"]').fill("admin123")
    page.locator('button').click()
    time.sleep(5)
    page.wait_for_load_state("networkidle")
    print(f"After login URL: {page.url}")

    if "/login" in page.url:
        page.goto("http://localhost:5174/")
        page.evaluate(f"""() => {{
            localStorage.setItem('tingstudio_token', '{token}');
            localStorage.setItem('tingstudio_user', '{json.dumps(user_data)}');
        }}""")

    page.goto("http://localhost:5174/ai-assistant")
    page.wait_for_load_state("networkidle")
    time.sleep(8)

    print(f"AI page URL: {page.url}")
    page.screenshot(path="/tmp/e2e_step1.png", full_page=True)

    history_sidebar = page.locator(".history-sidebar")
    print(f"History sidebar: {history_sidebar.count()}")

    history_items = page.locator(".history-item")
    print(f"History items: {history_items.count()}")

    messages = page.locator(".message-item")
    print(f"Messages: {messages.count()}")

    welcome = page.locator(".welcome-message")
    print(f"Welcome visible: {welcome.count() > 0 and welcome.is_visible()}")

    if history_items.count() > 0:
        print("✅ History sessions loaded!")
        for i in range(min(history_items.count(), 5)):
            title = history_items.nth(i).locator(".session-title").text_content()
            print(f"  Session {i+1}: {title}")

    if messages.count() > 0:
        print("✅ Messages restored from previous session!")
    elif history_items.count() > 0:
        history_items.first.click()
        time.sleep(3)
        messages = page.locator(".message-item")
        print(f"Messages after clicking first session: {messages.count()}")
        if messages.count() > 0:
            print("✅ Messages loaded after clicking session!")
        page.screenshot(path="/tmp/e2e_step2.png", full_page=True)

    print("\nNavigating away...")
    page.goto("http://localhost:5174/materials")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    print("Navigating back...")
    page.goto("http://localhost:5174/ai-assistant")
    page.wait_for_load_state("networkidle")
    time.sleep(8)

    page.screenshot(path="/tmp/e2e_step3.png", full_page=True)

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
        print("⚠️ No messages (might need to click a session)")

    browser.close()
