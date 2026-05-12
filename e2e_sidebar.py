from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

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

    if "/server-error" not in current_url and "/login" not in current_url:
        result = page.evaluate("""() => {
            const app = document.querySelector('#app');
            const sidebar = document.querySelector('.history-sidebar');
            const historyItems = document.querySelectorAll('.history-item');
            const historyList = document.querySelector('.history-list');
            const allDivs = document.querySelectorAll('.history-sidebar div');

            return {
                sidebarExists: !!sidebar,
                sidebarClass: sidebar?.className,
                sidebarCollapsed: sidebar?.classList.contains('collapsed'),
                historyItemsCount: historyItems.length,
                historyListExists: !!historyList,
                historyListHTML: historyList?.innerHTML?.substring(0, 500),
                childDivCount: allDivs.length,
            };
        }""")
        print(f"Sidebar info: {result}")

        page.screenshot(path="/tmp/e2e_sidebar.png", full_page=True)

    browser.close()
