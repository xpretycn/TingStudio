# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: formula-crud.spec.ts >> 配方管理 E2E 流程 >> E2E-FM-03: 工具栏应包含搜索框和创建按钮
- Location: e2e\formula-crud.spec.ts:30:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:5173/login"
  navigated to "http://localhost:5173/ai-assistant"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "跳到主要内容" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - complementary "主导航" [ref=e5]:
    - generic [ref=e6]:
      - generic "折叠/展开侧边栏" [ref=e7] [cursor=pointer]:
        - img [ref=e9]
        - heading "TingStudio" [level=1] [ref=e21]
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]:
            - paragraph [ref=e25]: "20"
            - paragraph [ref=e26]: 05月 · 周三
          - img [ref=e29]
        - generic "点击换一条" [ref=e32] [cursor=pointer]:
          - generic [ref=e33]: 💬
          - generic [ref=e34]: 库存不足预警比闹钟还准时呢 ⏰
    - navigation "侧边栏导航" [ref=e35]:
      - menubar [ref=e36]:
        - menuitem "AI 助手" [ref=e37] [cursor=pointer]:
          - generic [ref=e38]:
            - img [ref=e39]
            - generic [ref=e41]: NEW
          - generic [ref=e42]: AI 助手
          - img [ref=e44]
        - menuitem "智能工具" [ref=e46] [cursor=pointer]:
          - img [ref=e48]
          - generic [ref=e50]: 智能工具
          - img [ref=e52]
        - button "业务管理" [ref=e56] [cursor=pointer]:
          - img [ref=e57]
          - generic [ref=e59]: 业务管理
          - img [ref=e60]
        - button "数据分析" [ref=e63] [cursor=pointer]:
          - img [ref=e64]
          - generic [ref=e66]: 数据分析
          - img [ref=e67]
        - button "系统工具" [ref=e70] [cursor=pointer]:
          - img [ref=e71]
          - generic [ref=e73]: 系统工具
          - img [ref=e74]
    - generic [ref=e76]:
      - generic [ref=e77]:
        - generic [ref=e78]: 🚀
        - generic [ref=e79]: 快速开始
        - button "关闭引导" [ref=e80] [cursor=pointer]: ×
      - generic [ref=e81]:
        - generic [ref=e82] [cursor=pointer]:
          - generic [ref=e83]: "1"
          - generic [ref=e84]: 录入原料库
          - img [ref=e85]
        - generic [ref=e87] [cursor=pointer]:
          - generic [ref=e88]: "2"
          - generic [ref=e89]: 创建配方
          - img [ref=e90]
        - generic [ref=e92] [cursor=pointer]:
          - generic [ref=e93]: "3"
          - generic [ref=e94]: 分析营养成分
          - img [ref=e95]
      - button "开始引导" [ref=e98] [cursor=pointer]:
        - img [ref=e99]
        - generic [ref=e101]: 开始引导
    - generic [ref=e102]:
      - button "系统版本" [ref=e103] [cursor=pointer]:
        - img [ref=e104]
      - generic [ref=e117]:
        - generic [ref=e118]:
          - paragraph [ref=e119]: 系统版本
          - paragraph [ref=e120]: v2.4.5 企业版
        - img [ref=e121]
  - main [ref=e124]:
    - main "AI 助手工作台" [ref=e126]:
      - generic [ref=e127]:
        - main [ref=e128]:
          - generic [ref=e131]:
            - complementary [ref=e132]:
              - button "历史记录" [ref=e135] [cursor=pointer]:
                - img [ref=e136]
            - generic [ref=e138]:
              - generic [ref=e139]:
                - generic [ref=e140]:
                  - img "admin" [ref=e142]
                  - generic [ref=e143]:
                    - generic [ref=e144]: 生成配方描述
                    - generic [ref=e145]: 11:09
                    - generic [ref=e146]:
                      - button "复制" [ref=e147] [cursor=pointer]:
                        - img [ref=e148]
                      - button "删除" [ref=e150] [cursor=pointer]:
                        - img [ref=e151]
                - generic [ref=e153]:
                  - img [ref=e155]
                  - generic [ref=e167]:
                    - paragraph [ref=e170]: 用户未提供任何配方信息，请补充必要字段。
                    - generic [ref=e171]:
                      - button "复制" [ref=e172] [cursor=pointer]:
                        - img [ref=e173]
                      - button "重试" [ref=e175] [cursor=pointer]:
                        - img [ref=e176]
                - generic [ref=e178]:
                  - img "admin" [ref=e180]
                  - generic [ref=e181]:
                    - generic [ref=e182]: 请帮我查看配方详情，佛手玫苓膏
                    - generic [ref=e183]: 09:15
                    - generic [ref=e184]:
                      - button "复制" [ref=e185] [cursor=pointer]:
                        - img [ref=e186]
                      - button "删除" [ref=e188] [cursor=pointer]:
                        - img [ref=e189]
                - generic [ref=e191]:
                  - img [ref=e193]
                  - generic [ref=e205]:
                    - generic [ref=e206]:
                      - generic [ref=e207]:
                        - paragraph [ref=e208]: 好的老登，稍等，我来查一下"佛手玫苓膏"的配方详情。
                        - paragraph [ref=e209]: <｜DSML｜tool_calls> <｜DSML｜invoke name="query_formulas"> <｜DSML｜parameter name="keyword" string="true">佛手膏</｜DSML｜parameter> <｜DSML｜parameter name="page" string="false">1</｜DSML｜parameter> <｜DSML｜parameter> <｜DSML｜parameter name="limit" string="false">10</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>
                      - generic [ref=e210]:
                        - img "deepseek" [ref=e211]
                        - generic [ref=e212]: deepseek
                        - generic [ref=e213]: ·
                        - generic [ref=e214]: 5.2s
                        - generic [ref=e215]: ·
                        - 'generic "输入: 18731 / 输出: 280" [ref=e216]': Token：19011
                    - generic [ref=e217]:
                      - button "复制" [ref=e218] [cursor=pointer]:
                        - img [ref=e219]
                      - button "重试" [ref=e221] [cursor=pointer]:
                        - img [ref=e222]
                - generic [ref=e224]:
                  - img "admin" [ref=e226]
                  - generic [ref=e227]:
                    - generic [ref=e228]: 请帮我查看配方详情，佛手玫苓膏
                    - generic [ref=e229]: 11:03
                    - generic [ref=e230]:
                      - button "复制" [ref=e231] [cursor=pointer]:
                        - img [ref=e232]
                      - button "删除" [ref=e234] [cursor=pointer]:
                        - img [ref=e235]
                - generic [ref=e237]:
                  - img [ref=e239]
                  - generic [ref=e251]:
                    - generic [ref=e252]:
                      - paragraph [ref=e254]: 好的老登，我已经在查询"佛手玫苓膏"的配方信息，请稍等片刻，马上为你呈现详细内容！
                      - generic [ref=e255]:
                        - img "deepseek" [ref=e256]
                        - generic [ref=e257]: deepseek
                        - generic [ref=e258]: ·
                        - generic [ref=e259]: 7.1s
                        - generic [ref=e260]: ·
                        - 'generic "输入: 19000 / 输出: 531" [ref=e261]': Token：19531
                    - generic [ref=e262]:
                      - button "复制" [ref=e263] [cursor=pointer]:
                        - img [ref=e264]
                      - button "重试" [ref=e266] [cursor=pointer]:
                        - img [ref=e267]
              - generic [ref=e270]:
                - textbox "输入问题或 / 调用指令... (Shift+Enter换行)" [ref=e271]
                - generic [ref=e272]:
                  - button "V4 Flash（快速） V4 Flash（快速）" [ref=e275] [cursor=pointer]:
                    - img "V4 Flash（快速）" [ref=e276]
                    - generic [ref=e277]: V4 Flash（快速）
                    - img [ref=e278]
                  - generic "上传图片" [ref=e280] [cursor=pointer]:
                    - img [ref=e281]
                  - button [disabled] [ref=e283]:
                    - img [ref=e284]
        - complementary [ref=e286]:
          - generic [ref=e288]:
            - generic [ref=e289] [cursor=pointer]:
              - generic [ref=e290]:
                - img [ref=e291]
                - generic [ref=e293]: 配方总数
              - generic [ref=e294]: "53"
              - generic [ref=e295]:
                - img [ref=e296]
                - generic [ref=e298]: +12%
            - generic [ref=e299] [cursor=pointer]:
              - generic [ref=e300]:
                - img [ref=e301]
                - generic [ref=e303]: 原料种类
              - generic [ref=e304]: "102"
              - generic [ref=e305]:
                - img [ref=e306]
                - generic [ref=e308]: +5新增
            - generic [ref=e309] [cursor=pointer]:
              - generic [ref=e310]:
                - img [ref=e311]
                - generic [ref=e313]: 本月销量
              - generic [ref=e314]: 131万
              - generic [ref=e315]:
                - img [ref=e316]
                - generic [ref=e318]: +18%
            - generic [ref=e319] [cursor=pointer]:
              - generic [ref=e320]:
                - img [ref=e321]
                - generic [ref=e323]: 待处理任务
              - generic [ref=e324]: "0"
          - generic [ref=e326]:
            - button "+ 新建配方" [ref=e327] [cursor=pointer]:
              - img [ref=e328]
              - generic [ref=e330]: + 新建配方
            - button "+ 添加原料" [ref=e331] [cursor=pointer]:
              - img [ref=e332]
              - generic [ref=e334]: + 添加原料
            - button "生成周报" [ref=e335] [cursor=pointer]:
              - img [ref=e336]
              - generic [ref=e338]: 生成周报
            - button "导出数据" [ref=e339] [cursor=pointer]:
              - img [ref=e340]
              - generic [ref=e342]: 导出数据
            - button "📝 智能填单 AI ✨" [ref=e343] [cursor=pointer]:
              - img [ref=e344]
              - generic [ref=e346]: 📝 智能填单
              - generic [ref=e347]: AI
              - text: ✨
            - button "📥 智能导入 AI ✨" [ref=e348] [cursor=pointer]:
              - img [ref=e349]
              - generic [ref=e351]: 📥 智能导入
              - generic [ref=e352]: AI
              - text: ✨
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('配方管理 E2E 流程', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/login')
  6   |     await page.locator('[data-testid="login-username"] input').fill('admin')
  7   |     await page.locator('[data-testid="login-password"] input').fill('admin123')
  8   |     await page.click('[data-testid="login-btn"]')
> 9   |     await page.waitForURL(/\/(formulas|home|materials)/, { timeout: 10000 })
      |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  10  |   })
  11  | 
  12  |   test('E2E-FM-01: 配方列表页面应正确渲染', async ({ page }) => {
  13  |     await page.goto('/formulas')
  14  |     await page.waitForLoadState('networkidle')
  15  | 
  16  |     const formulaList = page.locator('[data-testid="formula-list"]')
  17  |     await expect(formulaList).toBeVisible()
  18  |   })
  19  | 
  20  |   test('E2E-FM-02: Dashboard 数据看板应存在', async ({ page }) => {
  21  |     await page.goto('/formulas')
  22  |     await page.waitForLoadState('networkidle')
  23  | 
  24  |     const dashboard = page.locator('[data-testid="formula-dashboard"]')
  25  |     if (await dashboard.count() > 0) {
  26  |       await expect(dashboard.first()).toBeVisible()
  27  |     }
  28  |   })
  29  | 
  30  |   test('E2E-FM-03: 工具栏应包含搜索框和创建按钮', async ({ page }) => {
  31  |     await page.goto('/formulas')
  32  |     await page.waitForLoadState('networkidle')
  33  | 
  34  |     const searchInput = page.locator('[data-testid="formula-search"]')
  35  |     const addBtn = page.locator('[data-testid="formula-add-btn"]')
  36  | 
  37  |     if (await searchInput.count() > 0) {
  38  |       await expect(searchInput).toBeVisible()
  39  |     }
  40  |     if (await addBtn.count() > 0) {
  41  |       await expect(addBtn).toBeVisible()
  42  |     }
  43  |   })
  44  | 
  45  |   test('E2E-FM-04: 搜索框应可输入文本', async ({ page }) => {
  46  |     await page.goto('/formulas')
  47  |     await page.waitForLoadState('networkidle')
  48  | 
  49  |     const searchInput = page.locator('[data-testid="formula-search"] input')
  50  |     if (await searchInput.count() > 0) {
  51  |       await searchInput.fill('测试配方')
  52  |       const value = await searchInput.inputValue()
  53  |       expect(value.length).toBeGreaterThan(0)
  54  |     }
  55  |   })
  56  | 
  57  |   test('E2E-FM-05: 点击创建按钮应导航到新建表单', async ({ page }) => {
  58  |     await page.goto('/formulas')
  59  |     await page.waitForLoadState('networkidle')
  60  | 
  61  |     const addBtn = page.locator('[data-testid="formula-add-btn"]')
  62  |     if (await addBtn.count() > 0) {
  63  |       await addBtn.click()
  64  |       await page.waitForURL(/\/formulas\/new/, { timeout: 5000 })
  65  |       await expect(page).toHaveURL(/\/formulas\//)
  66  |     }
  67  |   })
  68  | 
  69  |   test('E2E-FM-06: 新建表单页面应正确渲染', async ({ page }) => {
  70  |     await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
  71  |     await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  72  | 
  73  |     const formContainer = page.locator('[data-testid="formula-form"]')
  74  |     if (await formContainer.count() > 0) {
  75  |       await expect(formContainer).toBeVisible()
  76  |     }
  77  |   })
  78  | 
  79  |   test('E2E-FM-07: 表单应包含基础信息区域', async ({ page }) => {
  80  |     await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
  81  |     await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  82  | 
  83  |     const content = await page.content()
  84  |     expect(content).toContain('基础信息录入')
  85  |   })
  86  | 
  87  |   test('E2E-FM-08: 表单应包含原料管理表格区域', async ({ page }) => {
  88  |     await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
  89  |     await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  90  | 
  91  |     const content = await page.content()
  92  |     expect(content).toContain('原料管理')
  93  |   })
  94  | 
  95  |   test('E2E-FM-09: 配方名称输入框应存在并可输入', async ({ page }) => {
  96  |     await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
  97  |     await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  98  | 
  99  |     const nameInput = page.locator('[data-testid="formula-name-input"] input')
  100 |     if (await nameInput.count() > 0) {
  101 |       await expect(nameInput).toBeVisible()
  102 |       await nameInput.fill(`E2E-Formula-${Date.now()}`)
  103 |       const value = await nameInput.inputValue()
  104 |       expect(value.length).toBeGreaterThan(0)
  105 |     }
  106 |   })
  107 | 
  108 |   test('E2E-FM-10: 保存按钮和取消按钮应可见', async ({ page }) => {
  109 |     await page.goto('/formulas/new', { waitUntil: 'domcontentloaded' })
```