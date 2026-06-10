from playwright.sync_api import sync_playwright
import time
import json
import urllib.request

def main():
    browser = None
    pw = None
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        # Login
        page.goto("http://localhost:5173/login", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=10000)
        page.wait_for_selector('input[type="text"]', timeout=5000)
        page.fill('input[type="text"]', "admin")
        page.fill('input[type="password"]', "admin123")
        page.click('button[type="submit"]')
        time.sleep(3)
        page.wait_for_load_state("networkidle", timeout=10000)

        token = None
        for attempt in range(5):
            token = page.evaluate("localStorage.getItem('tingstudio_token')")
            if token:
                break
            time.sleep(1)
        
        if not token:
            print("[ERROR] No token found after login")
            return

        # Find formula
        req = urllib.request.Request(
            "http://localhost:3000/api/formulas?page=1&pageSize=100",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        
        target_formula = None
        for f in data.get("data", {}).get("list", []):
            if "荣华天晞膏" in f.get("name", ""):
                target_formula = f
                break
        
        if not target_formula:
            print("[ERROR] Formula not found")
            return
        
        formula_id = target_formula["id"]
        print(f"[OK] Formula: {target_formula['name']}")

        # Navigate to detail page
        page.goto(f"http://localhost:5173/formulas/{formula_id}", timeout=30000)
        time.sleep(5)

        calc_table = page.locator(".calc-table")
        if calc_table.count() == 0:
            print("[ERROR] Calc table not found")
            return
        print("[OK] Calc table found")

        # Test 1: Full missing nutrition (测试66) - error-circle icon
        missing_icon = page.locator(".missing-nutrition-icon")
        print(f"[INFO] Missing-nutrition icons: {missing_icon.count()}")
        
        if missing_icon.count() > 0:
            missing_icon.first.hover()
            time.sleep(1.5)
            
            tooltip_popup = page.locator(".t-popup:visible")
            found = False
            for i in range(tooltip_popup.count()):
                text = tooltip_popup.nth(i).text_content().strip()
                if "缺失营养数据" in text:
                    print(f"[TEST1 PASS] Full missing tooltip: '{text}'")
                    found = True
                    break
            if not found:
                print("[TEST1 FAIL] No tooltip for fully missing nutrition")
        
        # Move away to dismiss tooltip
        page.mouse.move(0, 0)
        time.sleep(0.5)

        # Test 2: Partial missing nutrition (淡竹叶 etc) - info-circle icon
        partial_icon = page.locator(".partial-nutrition-icon")
        print(f"[INFO] Partial-nutrition icons: {partial_icon.count()}")
        
        if partial_icon.count() > 0:
            partial_icon.first.hover()
            time.sleep(1.5)
            
            tooltip_popup = page.locator(".t-popup:visible")
            found = False
            for i in range(tooltip_popup.count()):
                text = tooltip_popup.nth(i).text_content().strip()
                if "部分营养数据缺失" in text:
                    print(f"[TEST2 PASS] Partial missing tooltip: '{text}'")
                    found = True
                    break
            if not found:
                print("[TEST2 FAIL] No tooltip for partially missing nutrition")
                # Debug
                for i in range(tooltip_popup.count()):
                    text = tooltip_popup.nth(i).text_content().strip()
                    print(f"  Popup {i}: '{text}'")
        else:
            print("[TEST2 SKIP] No partial-nutrition icons found")

        # Take final screenshot
        page.screenshot(path="test/screenshots/nutrition-tooltip-final.png")
        print("[OK] Screenshot saved")

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        if browser:
            browser.close()
        if pw:
            try:
                pw.stop()
            except:
                pass

if __name__ == "__main__":
    main()
