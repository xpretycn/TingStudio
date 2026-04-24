from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture console logs and network errors
    errors = []
    page.on('console', lambda msg: print(f'[CONSOLE {msg.type}] {msg.text}') if msg.type == 'error' else None)
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('requestfailed', lambda req: print(f'[REQ FAILED] {req.url} - {req.failure}'))
    
    # Navigate to login page
    print('=== Navigating to login page ===')
    resp = page.goto('https://tingstudio-frontend-jnvxqqcv.edgeone.cool/login', wait_until='networkidle', timeout=30000)
    print(f'Status: {resp.status if resp else "No response"}')
    print(f'URL after nav: {page.url}')
    
    # Take screenshot
    page.screenshot(path='d:/Program Data/workspace-codebd/TingStudio/test-login-1.png', full_page=True)
    print('Screenshot saved: test-login-1.png')
    
    # Check page content
    title = page.title()
    print(f'Page title: {title}')
    
    body_text = page.evaluate('() => document.body?.innerText?.substring(0, 500) || "EMPTY"')
    print(f'Body text (first 500 chars): {body_text}')
    
    # Check if it's 401 error page
    if '401' in body_text or 'UNAUTHORIZED' in body_text:
        print('\n!!! PAGE SHOWS 401 UNAUTHORIZED - EdgeOne auth issue !!!')
        print('This is an EdgeOne Pages configuration issue, not app code issue.')
        
        # Try accessing index.html directly
        print('\n=== Trying direct index.html access ===')
        resp2 = page.goto('https://tingstudio-frontend-jnvxqqcv.edgeone.cool/index.html', wait_until='domcontentloaded', timeout=15000)
        print(f'Direct index.html status: {resp2.status if resp2 else "No response"}')
        page.screenshot(path='d:/Program Data/workspace-codebd/TingStudio/test-login-2-direct.png', full_page=True)
        body2 = page.evaluate('() => document.body?.innerText?.substring(0, 300) || "EMPTY"')
        print(f'Direct access body: {body2}')
    else:
        # Try to find login form elements
        print('\n=== Looking for login form ===')
        inputs = page.locator('input').all()
        print(f'Found {len(inputs)} input elements')
        for i, inp in enumerate(inputs):
            print(f'  Input[{i}]: type={inp.get_attribute("type")}, placeholder={inp.get_attribute("placeholder")}, name={inp.get_attribute("name")}')
        
        buttons = page.locator('button').all()
        print(f'Found {len(buttons)} button elements')
        for i, btn in enumerate(buttons):
            print(f'  Button[{i}]: text="{btn.inner_text()}"')
        
        # Try to fill in admin credentials and login
        if len(inputs) >= 2:
            print('\n=== Attempting login with admin/admin123 ===')
            inputs[0].fill('admin')
            inputs[1].fill('admin123')
            
            # Click login button
            if buttons:
                buttons[0].click()
                page.wait_for_timeout(3000)
                page.screenshot(path='d:/Program Data/workspace-codebd/TingStudio/test-login-3-after.png', full_page=True)
                print(f'URL after login attempt: {page.url}')
                body_after = page.evaluate('() => document.body?.innerText?.substring(0, 300) || "EMPTY"')
                print(f'Body after login: {body_after}')
                print(f'Page errors: {errors}')
    
    browser.close()
    print('\n=== Test complete ===')
