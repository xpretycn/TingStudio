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

    agent_msgs = [m for m in console_msgs if any(kw in m.lower() for kw in ['agent', 'session', 'restore', 'loadsession'])]
    if agent_msgs:
        print("Agent-related console messages:")
        for m in agent_msgs:
            print(f"  {m}")
    else:
        print("No agent-related console messages found")

    error_msgs = [m for m in console_msgs if 'error' in m.lower()]
    if error_msgs:
        print("\nError messages:")
        for m in error_msgs[-10:]:
            print(f"  {m}")

    result = page.evaluate("""async () => {
        try {
            const token = localStorage.getItem('tingstudio_token');
            const resp = await fetch('/api/agent/sessions', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await resp.json();
            return { status: resp.status, sessionsCount: data.data?.length, firstSession: data.data?.[0]?.title };
        } catch (e) {
            return { error: e.message };
        }
    }""")
    print(f"\nDirect API call result: {result}")

    browser.close()
