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

    page.screenshot(path="/tmp/e2e_login.png", full_page=True)

    inputs = page.locator("input").all()
    print(f"Found {len(inputs)} input elements on login page")
    for i, inp in enumerate(inputs):
        ph = inp.get_attribute("placeholder") or ""
        tp = inp.get_attribute("type") or ""
        print(f"  Input {i}: type={tp}, placeholder={ph}")

    if len(inputs) >= 2:
        inputs[0].fill("admin")
        inputs[1].fill("admin123")
        print("Filled username and password")

    submit_btn = page.locator('button[type="submit"]')
    if submit_btn.count() > 0:
        submit_btn.click()
        print("Clicked submit button")
    else:
        print("No submit button found, trying form submit")
        page.locator("form").evaluate("f => f.requestSubmit()")

    time.sleep(5)
    page.wait_for_load_state("networkidle")
    print(f"After login URL: {page.url}")
    page.screenshot(path="/tmp/e2e_after_login.png", full_page=True)

    if "/login" in page.url:
        print("Login failed via UI, using localStorage fallback")
        page.evaluate(f"""() => {{
            localStorage.setItem('tingstudio_token', '{token}');
            localStorage.setItem('tingstudio_user', '{json.dumps(user_data)}');
        }}""")

    page.goto("http://localhost:5174/ai-assistant")
    page.wait_for_load_state("networkidle")
    time.sleep(8)

    print(f"AI page URL: {page.url}")
    page.screenshot(path="/tmp/e2e_ai_page.png", full_page=True)

    if "/server-error" in page.url:
        print("ERROR: Redirected to server-error page!")
        print("Checking localStorage...")
        ls_token = page.evaluate("() => localStorage.getItem('tingstudio_token')")
        ls_user = page.evaluate("() => localStorage.getItem('tingstudio_user')")
        print(f"  token: {ls_token[:30] if ls_token else 'null'}...")
        print(f"  user: {ls_user[:50] if ls_user else 'null'}...")
    else:
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

        print("\nNavigating away and back...")
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
