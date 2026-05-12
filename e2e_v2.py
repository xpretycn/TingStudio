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
    print(f"URL: {current_url}")

    page.screenshot(path="/tmp/e2e_ai_v2.png", full_page=True)

    all_classes = page.evaluate("""() => {
        const elements = document.querySelectorAll('*');
        const classes = new Set();
        elements.forEach(el => {
            el.classList.forEach(c => {
                if (c.includes('history') || c.includes('session') || c.includes('chat') || c.includes('message') || c.includes('sidebar') || c.includes('ai-') || c.includes('dashboard')) {
                    classes.add(c);
                }
            });
        });
        return Array.from(classes).sort();
    }""")
    print(f"Relevant CSS classes: {all_classes}")

    relevant_msgs = [m for m in console_msgs if any(kw in m.lower() for kw in ['session', 'history', 'agent', 'error', 'fail', 'dashboard', 'restore'])]
    if relevant_msgs:
        print("\nRelevant console messages:")
        for m in relevant_msgs[-20:]:
            print(f"  {m}")

    browser.close()
