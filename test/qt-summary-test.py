from playwright.sync_api import sync_playwright
import time, json, urllib.request

def main():
    browser, pw = None, None
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        page.goto("http://localhost:5173/login", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=10000)
        page.wait_for_selector('input[type="text"]', timeout=5000)
        page.fill('input[type="text"]', "admin")
        page.fill('input[type="password"]', "admin123")
        page.click('button[type="submit"]')
        time.sleep(3)

        token = None
        for _ in range(5):
            token = page.evaluate("localStorage.getItem('tingstudio_token')")
            if token: break
            time.sleep(1)

        if not token: return

        req = urllib.request.Request(
            "http://localhost:3000/api/formulas?page=1&pageSize=100",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())

        target = None
        for f in data.get("data", {}).get("list", []):
            if "荣华天晞膏" in f.get("name", ""):
                target = f; break
        if not target: return

        page.goto(f"http://localhost:5173/formulas/{target['id']}", timeout=30000)
        time.sleep(5)

        # Check the qt-summary area
        summary = page.locator(".qt-summary")
        if summary.count() == 0:
            print("[ERROR] qt-summary not found"); return

        # Get bounding boxes for all label spans
        spans = summary.locator(".qts-label-group > span")
        count = spans.count()
        print(f"[INFO] Found {count} label spans in qt-summary")

        positions = []
        for i in range(count):
            box = spans.nth(i).bounding_box()
            text = spans.nth(i).text_content().strip()
            if box:
                positions.append((text, box["x"], box["width"]))
                print(f"  [{i}] '{text}' x={box['x']:.1f} width={box['width']:.1f}")

        # Check if all spans have the same x position (±1px tolerance)
        if positions:
            ref_x = positions[0][1]
            all_aligned = all(abs(x - ref_x) <= 1 for _, x, _ in positions)
            if all_aligned:
                print(f"[PASS] All labels left-aligned at x={ref_x:.1f}")
            else:
                print(f"[FAIL] Labels have inconsistent x positions")
                for text, x, _ in positions:
                    diff = abs(x - ref_x)
                    status = "OK" if diff <= 1 else "OFF"
                    print(f"  {text}: x={x:.1f} (diff={diff:.1f}) [{status}]")

        page.screenshot(path="test/screenshots/qt-summary-alignment.png")
        print("[OK] Screenshot saved")

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback; traceback.print_exc()
    finally:
        if browser: browser.close()
        if pw:
            try: pw.stop()
            except: pass

if __name__ == "__main__":
    main()
