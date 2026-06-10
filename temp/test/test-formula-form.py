from playwright.sync_api import sync_playwright
import os, http.server, threading

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if '.' not in self.path.split('/')[-1]:
            self.path = '/index.html'
        return super().do_GET()
    def log_message(self, format, *args):
        pass

os.chdir(DIST_DIR)
server = http.server.HTTPServer(("127.0.0.1", 8890), SPAHandler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print(f"Serving dist on http://127.0.0.1:8890")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--disable-gpu", "--no-sandbox"])
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto("http://127.0.0.1:8890/login", wait_until="load")
    page.wait_for_timeout(3000)

    page.locator('input[placeholder="请输入用户名"]').fill("admin")
    page.locator('input[placeholder="请输入密码"]').fill("admin123")

    login_btn = page.locator("button").first
    login_btn.click()
    page.wait_for_timeout(3000)
    print(f"After login URL: {page.url}")
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02-after-login.png"), full_page=True)

    page.goto("http://127.0.0.1:8890/formulas", wait_until="load")
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "03-formula-list.png"), full_page=True)

    edit_links = page.locator('a[href*="/formulas/edit/"]')
    if edit_links.count() > 0:
        href = edit_links.first.get_attribute("href")
        print(f"Found edit link: {href}")
        page.goto("http://127.0.0.1:8890" + href, wait_until="load")
    else:
        print("No edit links found, trying new formula page")
        page.goto("http://127.0.0.1:8890/formulas/new", wait_until="load")

    page.wait_for_timeout(4000)
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04-formula-form.png"), full_page=True)

    total_row = page.locator(".total-row")
    if total_row.count() > 0:
        total_text = total_row.inner_text()
        print(f"Total row content: {total_text}")
    else:
        print("Total row not found (no materials added yet)")

    quote_section = page.locator(".quote-sec")
    if quote_section.count() > 0:
        print("Found quote section")
    else:
        print("Quote section not found")

    qm_name_link = page.locator(".qm-name--link")
    if qm_name_link.count() > 0:
        print(f"Found {qm_name_link.count()} clickable material names in quote section")
        qm_name_link.first.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "05-after-click-material-name.png"), full_page=True)

        highlighted_row = page.locator(".material-row--highlight")
        if highlighted_row.count() > 0:
            print("SUCCESS: Material row is highlighted after clicking quote name!")
        else:
            print("Highlight may have timed out (1.5s window)")
    else:
        print("No clickable material names found (may need materials with prices)")

    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "06-final-state.png"), full_page=True)

    browser.close()
    server.shutdown()
    print("Test completed. Screenshots saved to test/screenshots/")
