from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    
    # 登录
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.fill('input[placeholder*="用户名"]', 'admin')
    page.fill('input[placeholder*="密码"]', 'admin123')
    page.click('button:has-text("登 录")')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    # 检查配方管理页面的分页间距
    page.goto('http://localhost:5173/formulas')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    formula_result = page.evaluate('''() => {
        const pagination = document.querySelector(".table-pagination");
        const card = pagination?.closest(".content-card") || pagination?.closest(".t-card");
        if (!pagination || !card) return { error: "no pagination or card found" };
        
        const pagCs = window.getComputedStyle(pagination);
        const cardCs = window.getComputedStyle(card);
        
        const pagRect = pagination.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        
        return {
            pagination: {
                paddingTop: pagCs.paddingTop,
                paddingBottom: pagCs.paddingBottom,
                marginTop: pagCs.marginTop,
                marginBottom: pagCs.marginBottom,
                bottomToCard: cardRect.bottom - pagRect.bottom,
            },
            card: {
                paddingBottom: cardCs.paddingBottom,
                paddingTop: cardCs.paddingTop,
            },
            distanceFromPagBottomToCardBottom: cardRect.bottom - pagRect.bottom,
        };
    }''')
    print("=== 配方管理页面分页间距 ===")
    print(json.dumps(formula_result, indent=2, ensure_ascii=False))
    
    # 检查销量分析页面的分页间距
    page.goto('http://localhost:5173/sales')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    sales_result = page.evaluate('''() => {
        const pagination = document.querySelector(".table-pagination");
        const card = pagination?.closest(".content-card") || pagination?.closest(".t-card");
        if (!pagination || !card) return { error: "no pagination or card found" };
        
        const pagCs = window.getComputedStyle(pagination);
        const cardCs = window.getComputedStyle(card);
        
        const pagRect = pagination.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        
        return {
            pagination: {
                paddingTop: pagCs.paddingTop,
                paddingBottom: pagCs.paddingBottom,
                marginTop: pagCs.marginTop,
                marginBottom: pagCs.marginBottom,
            },
            card: {
                paddingBottom: cardCs.paddingBottom,
                paddingTop: cardCs.paddingTop,
            },
            distanceFromPagBottomToCardBottom: cardRect.bottom - pagRect.bottom,
        };
    }''')
    print("\n=== 销量分析页面分页间距 ===")
    print(json.dumps(sales_result, indent=2, ensure_ascii=False))
    
    browser.close()
