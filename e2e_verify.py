import asyncio
from playwright.sync_api import sync_playwright

def test_session_persistence():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            storage_state={
                "cookies": [],
                "origins": [
                    {
                        "origin": "http://localhost:5174",
                        "localStorage": [
                            {"name": "tingstudio_token", "value": "test_token_placeholder"},
                            {"name": "tingstudio_user", "value": '{"id":1,"username":"admin","role":"admin"}'},
                        ],
                    }
                ],
            },
        )
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("1. Logging in via API...")
        page.goto("http://localhost:5174/login")
        page.wait_for_load_state("networkidle", timeout=10000)

        login_result = page.evaluate("""async () => {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin123' })
            });
            const data = await res.json();
            if (data.success && data.data?.token) {
                localStorage.setItem('tingstudio_token', data.data.token);
                localStorage.setItem('tingstudio_user', JSON.stringify(data.data.user));
                return { success: true, token: data.data.token };
            }
            return { success: false, error: data.message };
        }""")
        print(f"   Login: {login_result}")

        if not login_result.get("success"):
            print("   Login failed, aborting test")
            browser.close()
            return

        print("2. Navigating to AI Dashboard...")
        page.goto("http://localhost:5174/ai-assistant")
        page.wait_for_load_state("networkidle", timeout=15000)
        page.wait_for_timeout(3000)

        print("3. Checking sessions API directly...")
        api_result = page.evaluate("""async () => {
            const token = localStorage.getItem('tingstudio_token');
            const res = await fetch('/api/agent/sessions', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            return { status: res.status, success: data.success, sessionsCount: data.data?.length, rawType: typeof data.data };
        }""")
        print(f"   API result: {api_result}")

        print("4. Checking history sidebar...")
        history_items = page.query_selector_all(".history-item")
        empty_sessions = page.query_selector(".empty-sessions")
        print(f"   History items count: {len(history_items)}")
        print(f"   Empty sessions visible: {empty_sessions is not None}")

        if history_items:
            for i, item in enumerate(history_items):
                title = item.query_selector(".session-title")
                time_el = item.query_selector(".session-time")
                print(f"   Session {i+1}: {title.inner_text() if title else 'N/A'} ({time_el.inner_text() if time_el else 'N/A'})")

        print("5. Checking Vue component sessions state...")
        vue_state = page.evaluate("""() => {
            const app = document.querySelector('#app').__vue_app__;
            return { hasVueApp: !!app };
        }""")
        print(f"   Vue state: {vue_state}")

        print("6. Console logs related to agent/sessions:")
        for log in console_logs:
            if any(kw in log.lower() for kw in ['agent', 'session', 'restore', 'loadsession', 'error']):
                print(f"   {log}")

        print("7. Testing: Click on a session if available...")
        if history_items:
            first_item = history_items[0]
            first_item.click()
            page.wait_for_timeout(2000)

            messages = page.query_selector_all(".message-item")
            print(f"   After clicking session: {len(messages)} messages loaded")

            if messages:
                for i, msg in enumerate(messages[:3]):
                    role_el = msg.evaluate("el => el.className")
                    print(f"   Message {i+1}: class={role_el}")
        else:
            print("   No sessions to click on")

        print("8. Testing navigation away and back...")
        page.goto("http://localhost:5174/dashboard")
        page.wait_for_load_state("networkidle", timeout=10000)
        page.wait_for_timeout(1000)

        page.goto("http://localhost:5174/ai-assistant")
        page.wait_for_load_state("networkidle", timeout=15000)
        page.wait_for_timeout(3000)

        history_items_after = page.query_selector_all(".history-item")
        print(f"   After navigation: {len(history_items_after)} history items")

        if history_items_after:
            print("   SUCCESS: Sessions persist after navigation!")
        else:
            empty_after = page.query_selector(".empty-sessions")
            print(f"   FAIL: Sessions still empty after navigation. Empty element: {empty_after is not None}")

        print("\n9. Final console logs:")
        for log in console_logs[-20:]:
            print(f"   {log}")

        browser.close()
        print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_session_persistence()
