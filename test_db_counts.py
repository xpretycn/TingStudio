from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)

    inputs = page.query_selector_all('input')
    for inp in inputs:
        itype = inp.get_attribute('type') or ''
        placeholder = inp.get_attribute('placeholder') or ''
        if '用户名' in placeholder or itype == 'text':
            inp.fill('admin')
        elif '密码' in placeholder or itype == 'password':
            inp.fill('admin123')

    buttons = page.query_selector_all('button')
    for btn in buttons:
        text = btn.inner_text()
        if '登录' in text or '登 录' in text:
            btn.click()
            break

    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    result = page.evaluate('''async () => {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': 'Bearer ' + token };
        
        const [formulas, sales, salesmen, materials] = await Promise.all([
            fetch('http://localhost:3000/api/formulas?pageSize=1', { headers }).then(r => r.json()),
            fetch('http://localhost:3000/api/sales?pageSize=1', { headers }).then(r => r.json()),
            fetch('http://localhost:3000/api/salesmen?pageSize=1', { headers }).then(r => r.json()),
            fetch('http://localhost:3000/api/materials?pageSize=1', { headers }).then(r => r.json()),
        ]);

        return {
            formulas_total: formulas.data?.total || formulas.total || 0,
            sales_total: sales.data?.total || sales.total || 0,
            salesmen_total: salesmen.data?.total || salesmen.total || 0,
            materials_total: materials.data?.total || materials.total || 0,
        };
    }''')

    print(f"Database counts: {result}", flush=True)

    browser.close()
