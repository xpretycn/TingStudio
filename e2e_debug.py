from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    failed_requests = []
    page.on("requestfailed", lambda req: failed_requests.append(f"FAILED: {req.method} {req.url} - {req.failure}"))
    page.on("response", lambda resp: None if resp.status < 400 else failed_requests.append(f"HTTP {resp.status}: {resp.url}"))

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)

    page.goto("http://localhost:5174/login")
    page.wait_for_load_state("networkidle")
    time.sleep(1)

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
                return { success: true };
            }
            return { success: false };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }""")
    print(f"Login: {result}")

    ls = page.evaluate("() => ({ token: localStorage.getItem('tingstudio_token')?.substring(0,30), user: localStorage.getItem('tingstudio_user')?.substring(0,50) })")
    print(f"localStorage after login: {ls}")

    page.goto("http://localhost:5174/ai-assistant")
    time.sleep(10)

    print(f"Current URL: {page.url}")

    ls = page.evaluate("() => ({ token: localStorage.getItem('tingstudio_token')?.substring(0,30), user: localStorage.getItem('tingstudio_user')?.substring(0,50) })")
    print(f"localStorage after navigate: {ls}")

    if failed_requests:
        print("\nFailed requests:")
        for r in failed_requests[:20]:
            print(f"  {r}")

    if console_msgs:
        print("\nConsole messages:")
        for m in console_msgs[-20:]:
            print(f"  {m}")

    browser.close()
