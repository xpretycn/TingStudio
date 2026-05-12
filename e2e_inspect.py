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

    page.screenshot(path="/tmp/e2e_screenshot.png", full_page=True)
    print(f"URL: {page.url}")

    all_classes = page.evaluate("""() => {
        const elements = document.querySelectorAll('*');
        const classes = new Set();
        elements.forEach(el => {
            el.classList.forEach(c => {
                if (c.includes('history') || c.includes('session') || c.includes('chat') || c.includes('message') || c.includes('sidebar') || c.includes('ai-')) {
                    classes.add(c);
                }
            });
        });
        return Array.from(classes).sort();
    }""")
    print(f"Relevant CSS classes found: {all_classes}")

    if console_msgs:
        print("\nConsole messages (last 30):")
        for m in console_msgs[-30:]:
            if any(kw in m for kw in ['session', 'history', 'agent', 'error', 'fail', 'Dashboard']):
                print(f"  {m}")

    browser.close()
