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
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: ☁️
              - generic [ref=e30]: 阴
              - button "刷新天气" [ref=e31] [cursor=pointer]:
                - img [ref=e32]
            - paragraph [ref=e35]: 21°C · 武昌区
        - generic "点击换一条" [ref=e36] [cursor=pointer]:
          - generic [ref=e37]: 💬
          - generic [ref=e38]: 据说周五的配方成功率最高，是真的吗？🤔
    - navigation "侧边栏导航" [ref=e39]:
      - menubar [ref=e40]:
        - menuitem "AI 助手" [ref=e41] [cursor=pointer]:
          - generic [ref=e42]:
            - img [ref=e43]
            - generic [ref=e45]: NEW
          - generic [ref=e46]: AI 助手
          - img [ref=e48]
        - menuitem "智能工具" [ref=e50] [cursor=pointer]:
          - img [ref=e52]
          - generic [ref=e54]: 智能工具
          - img [ref=e56]
        - button "业务管理" [ref=e60] [cursor=pointer]:
          - img [ref=e61]
          - generic [ref=e63]: 业务管理
          - img [ref=e64]
        - button "数据分析" [ref=e67] [cursor=pointer]:
          - img [ref=e68]
          - generic [ref=e70]: 数据分析
          - img [ref=e71]
        - button "系统工具" [ref=e74] [cursor=pointer]:
          - img [ref=e75]
          - generic [ref=e77]: 系统工具
          - img [ref=e78]
    - generic [ref=e80]:
      - generic [ref=e81]:
        - generic [ref=e82]: 🚀
        - generic [ref=e83]: 快速开始
        - button "关闭引导" [ref=e84] [cursor=pointer]: ×
      - generic [ref=e85]:
        - generic [ref=e86] [cursor=pointer]:
          - generic [ref=e87]: "1"
          - generic [ref=e88]: 录入原料库
          - img [ref=e89]
        - generic [ref=e91] [cursor=pointer]:
          - generic [ref=e92]: "2"
          - generic [ref=e93]: 创建配方
          - img [ref=e94]
        - generic [ref=e96] [cursor=pointer]:
          - generic [ref=e97]: "3"
          - generic [ref=e98]: 分析营养成分
          - img [ref=e99]
      - button "开始引导" [ref=e102] [cursor=pointer]:
        - img [ref=e103]
        - generic [ref=e105]: 开始引导
    - generic [ref=e106]:
      - button "系统版本" [ref=e107] [cursor=pointer]:
        - img [ref=e108]
      - generic [ref=e121]:
        - generic [ref=e122]:
          - paragraph [ref=e123]: 系统版本
          - paragraph [ref=e124]: v2.4.5 企业版
        - img [ref=e125]
  - main [ref=e128]:
    - main "AI 助手工作台" [ref=e130]:
      - generic [ref=e131]:
        - main [ref=e132]:
          - generic [ref=e135]:
            - complementary [ref=e136]:
              - button "历史记录" [ref=e139] [cursor=pointer]:
                - img [ref=e140]
            - generic [ref=e142]:
              - generic [ref=e143]:
                - generic [ref=e144]:
                  - img "admin" [ref=e146]
                  - generic [ref=e147]:
                    - generic [ref=e148]: 生成配方描述
                    - generic [ref=e149]: 11:09
                    - generic [ref=e150]:
                      - button "复制" [ref=e151] [cursor=pointer]:
                        - img [ref=e152]
                      - button "删除" [ref=e154] [cursor=pointer]:
                        - img [ref=e155]
                - generic [ref=e157]:
                  - img [ref=e159]
                  - generic [ref=e171]:
                    - paragraph [ref=e174]: 用户未提供任何配方信息，请补充必要字段。
                    - generic [ref=e175]:
                      - button "复制" [ref=e176] [cursor=pointer]:
                        - img [ref=e177]
                      - button "重试" [ref=e179] [cursor=pointer]:
                        - img [ref=e180]
                - generic [ref=e182]:
                  - img "admin" [ref=e184]
                  - generic [ref=e185]:
                    - generic [ref=e186]: 请帮我查看配方详情，佛手玫苓膏
                    - generic [ref=e187]: 09:15
                    - generic [ref=e188]:
                      - button "复制" [ref=e189] [cursor=pointer]:
                        - img [ref=e190]
                      - button "删除" [ref=e192] [cursor=pointer]:
                        - img [ref=e193]
                - generic [ref=e195]:
                  - img [ref=e197]
                  - generic [ref=e209]:
                    - generic [ref=e210]:
                      - generic [ref=e211]:
                        - paragraph [ref=e212]: 好的老登，稍等，我来查一下"佛手玫苓膏"的配方详情。
                        - paragraph [ref=e213]: <｜DSML｜tool_calls> <｜DSML｜invoke name="query_formulas"> <｜DSML｜parameter name="keyword" string="true">佛手膏</｜DSML｜parameter> <｜DSML｜parameter name="page" string="false">1</｜DSML｜parameter> <｜DSML｜parameter> <｜DSML｜parameter name="limit" string="false">10</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>
                      - generic [ref=e214]:
                        - img "deepseek" [ref=e215]
                        - generic [ref=e216]: deepseek
                        - generic [ref=e217]: ·
                        - generic [ref=e218]: 5.2s
                        - generic [ref=e219]: ·
                        - 'generic "输入: 18731 / 输出: 280" [ref=e220]': Token：19011
                    - generic [ref=e221]:
                      - button "复制" [ref=e222] [cursor=pointer]:
                        - img [ref=e223]
                      - button "重试" [ref=e225] [cursor=pointer]:
                        - img [ref=e226]
                - generic [ref=e228]:
                  - img "admin" [ref=e230]
                  - generic [ref=e231]:
                    - generic [ref=e232]: 请帮我查看配方详情，佛手玫苓膏
                    - generic [ref=e233]: 11:03
                    - generic [ref=e234]:
                      - button "复制" [ref=e235] [cursor=pointer]:
                        - img [ref=e236]
                      - button "删除" [ref=e238] [cursor=pointer]:
                        - img [ref=e239]
                - generic [ref=e241]:
                  - img [ref=e243]
                  - generic [ref=e255]:
                    - generic [ref=e256]:
                      - paragraph [ref=e258]: 好的老登，我已经在查询"佛手玫苓膏"的配方信息，请稍等片刻，马上为你呈现详细内容！
                      - generic [ref=e259]:
                        - img "deepseek" [ref=e260]
                        - generic [ref=e261]: deepseek
                        - generic [ref=e262]: ·
                        - generic [ref=e263]: 7.1s
                        - generic [ref=e264]: ·
                        - 'generic "输入: 19000 / 输出: 531" [ref=e265]': Token：19531
                    - generic [ref=e266]:
                      - button "复制" [ref=e267] [cursor=pointer]:
                        - img [ref=e268]
                      - button "重试" [ref=e270] [cursor=pointer]:
                        - img [ref=e271]
              - generic [ref=e274]:
                - textbox "输入问题或 / 调用指令... (Shift+Enter换行)" [ref=e275]
                - generic [ref=e276]:
                  - button "V4 Flash（快速） V4 Flash（快速）" [ref=e279] [cursor=pointer]:
                    - img "V4 Flash（快速）" [ref=e280]
                    - generic [ref=e281]: V4 Flash（快速）
                    - img [ref=e282]
                  - generic "上传图片" [ref=e284] [cursor=pointer]:
                    - img [ref=e285]
                  - button [disabled] [ref=e287]:
                    - img [ref=e288]
        - complementary [ref=e290]:
          - generic [ref=e292]:
            - generic [ref=e293] [cursor=pointer]:
              - generic [ref=e294]:
                - img [ref=e295]
                - generic [ref=e297]: 配方总数
              - generic [ref=e298]: "53"
              - generic [ref=e299]:
                - img [ref=e300]
                - generic [ref=e302]: +12%
            - generic [ref=e303] [cursor=pointer]:
              - generic [ref=e304]:
                - img [ref=e305]
                - generic [ref=e307]: 原料种类
              - generic [ref=e308]: "102"
              - generic [ref=e309]:
                - img [ref=e310]
                - generic [ref=e312]: +5新增
            - generic [ref=e313] [cursor=pointer]:
              - generic [ref=e314]:
                - img [ref=e315]
                - generic [ref=e317]: 本月销量
              - generic [ref=e318]: 131万
              - generic [ref=e319]:
                - img [ref=e320]
                - generic [ref=e322]: +18%
            - generic [ref=e323] [cursor=pointer]:
              - generic [ref=e324]:
                - img [ref=e325]
                - generic [ref=e327]: 待处理任务
              - generic [ref=e328]: "0"
          - generic [ref=e330]:
            - button "+ 新建配方" [ref=e331] [cursor=pointer]:
              - img [ref=e332]
              - generic [ref=e334]: + 新建配方
            - button "+ 添加原料" [ref=e335] [cursor=pointer]:
              - img [ref=e336]
              - generic [ref=e338]: + 添加原料
            - button "生成周报" [ref=e339] [cursor=pointer]:
              - img [ref=e340]
              - generic [ref=e342]: 生成周报
            - button "导出数据" [ref=e343] [cursor=pointer]:
              - img [ref=e344]
              - generic [ref=e346]: 导出数据
            - button "📝 智能填单 AI ✨" [ref=e347] [cursor=pointer]:
              - img [ref=e348]
              - generic [ref=e350]: 📝 智能填单
              - generic [ref=e351]: AI
              - text: ✨
            - button "📥 智能导入 AI ✨" [ref=e352] [cursor=pointer]:
              - img [ref=e353]
              - generic [ref=e355]: 📥 智能导入
              - generic [ref=e356]: AI
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