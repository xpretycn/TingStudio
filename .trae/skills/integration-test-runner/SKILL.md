---
name: integration-test-runner
description: 读取前后端联调测试用例文档，用Playwright驱动浏览器执行全链路操作，验证7层闭环（操作→请求→DB→Store→响应→展示→存储），输出联调测试结果报告。当用户要求跑联调测试、执行集成测试、前后端联调验证时触发。
---

# 前后端联调测试执行器

读取联调测试用例文档，用 Playwright 驱动浏览器执行全链路操作，验证 7 层闭环，输出联调测试结果报告。

## 触发词

跑联调测试、执行集成测试、前后端联调验证、联调测试、集成测试

## 与上游的关联

| 关联字段 | 来源 | 用途 |
|---------|------|------|
| 文档ID | integration-test-cases 文档头部 | 唯一标识，写入结果文档头部 |
| 用例ID | integration-test-cases 中每条用例 | 直接透传，不做二次编号 |
| 前端文件hash | integration-test-cases 文档头部 | 校验前端代码是否变更 |
| 后端文件hash | integration-test-cases 文档头部 | 校验后端代码是否变更 |

## 执行流程

```
读取测试用例 → 变更校验 → 启动前后端服务 → 准备测试数据 → 逐条执行(7层验证) → 契约验证 → 输出报告
```

### 阶段 1：读取测试用例

1. 确定目标文档：
   - 用户指定了文档路径 → 直接使用
   - 用户指定了模块名称 → 查找 `test/integration-test-cases/{模块名}-integration-test-cases.md`
   - 用户未指定 → 扫描 `test/integration-test-cases/` 目录列出选择
   - 对话上下文中刚执行过 integration-test-generator → 自动使用其输出

2. 解析文档，提取文档ID、文件hash、所有联调场景用例和契约验证用例

### 阶段 2：变更校验

1. 计算前端和后端文件的当前 hash
2. 与文档中记录的 hash 对比：
   - 一致 → 正常执行
   - 不一致 → 警告用户"代码已变更，用例可能过时"，建议重新生成
3. 已有结果文档时增量执行（只执行新增/变更的用例）

### 阶段 3：启动前后端服务

1. 检查后端服务是否运行（默认 `http://localhost:3000`）
   - 未运行 → 启动 `npm run dev`（后端）
   - 等待健康检查 `/health` 返回 200

2. 检查前端服务是否运行（默认 `http://localhost:5173`）
   - 未运行 → 启动 `npm run dev`（前端）
   - 等待首页可访问

3. 准备认证 Token：
   - 使用测试账号登录获取 Token
   - admin Token + formulist Token（权限联调需要）

### 阶段 4：准备测试数据

1. 清理残留测试数据（DELETE WHERE name LIKE '[test]%'）
2. Seed 基础数据：
   - 测试用户（admin + formulist）
   - 测试原料（[test]当归、[test]枸杞等）
   - 测试配方（[test]测试配方A等）
   - 测试营养方案
3. 每条用例的前置条件中要求的数据，通过 API 或直接操作 DB 准备

### 阶段 5：逐条执行联调场景用例

对每条联调场景用例，执行 **7 层验证**：

#### 7 层验证策略

| 层级 | 验证方式 | 工具 |
|------|---------|------|
| 1.前端操作层 | 模拟用户操作（点击/输入/导航），验证操作可执行 | Playwright |
| 2.API请求层 | 拦截请求，验证方法/URL/Headers/Body | Playwright `page.route()` |
| 3.DB状态层 | 操作后查询数据库，验证数据正确性 | 直接查询 DB |
| 4.Store状态层 | 读取 Pinia Store 状态，验证与预期一致 | `page.evaluate()` |
| 5.API响应层 | 拦截响应，验证状态码/响应体/格式 | Playwright `page.route()` |
| 6.前端展示层 | 断言 UI 元素文本/可见性/状态 | Playwright assertions |
| 7.浏览器存储层 | 读取 localStorage，验证 Token 等存储状态 | `page.evaluate(() => localStorage)` |

#### 执行模式

```typescript
// 伪代码：7层验证执行模式
async function executeIntegrationTest(testCase) {
  const results = {}

  // 层1：前端操作
  await page.click(testCase.triggerElement)
  results.layer1 = { action: 'click', success: true }

  // 层2+5：拦截请求和响应
  const [request, response] = await page.route('**/api/**', async route => {
    const req = route.request()
    results.layer2 = { method: req.method(), url: req.url(), body: req.postData() }
    const res = await route.fetch()
    results.layer5 = { status: res.status(), body: await res.json() }
    await route.fulfill({ response: res })
  })

  // 层3：DB状态验证
  const dbState = await query(testCase.dbQuery)
  results.layer3 = { actual: dbState, expected: testCase.expectedDbState }

  // 层4：Store状态验证
  const storeState = await page.evaluate(() => {
    const pinia = window.__pinia__
    return pinia.state.value[testCase.storeName]
  })
  results.layer4 = { actual: storeState, expected: testCase.expectedStoreState }

  // 层6：前端展示验证
  const uiText = await page.locator(testCase.uiSelector).textContent()
  results.layer6 = { actual: uiText, expected: testCase.expectedUiText }

  // 层7：浏览器存储验证
  const storage = await page.evaluate(() => ({
    token: localStorage.getItem('tingstudio_token')
  }))
  results.layer7 = { actual: storage, expected: testCase.expectedStorage }

  return results
}
```

#### 27 种联调场景执行策略

**CRUD 基础（7 种）**

| 场景 | 执行策略 |
|------|---------|
| I-CRUD | 完整CRUD循环：创建→验证7层→编辑→验证7层→删除→验证7层 |
| I-AUTH | 登录→操作→手动设置过期Token→操作→验证401跳转→重新登录 |
| I-ISO | formulist登录→列表断言→用admin Token直接请求formulist数据→验证403 |
| I-ERR | 触发各种后端错误→验证前端MessagePlugin提示→验证UI状态回滚 |
| I-ASYNC | 触发AI请求→验证Loading→等待完成/模拟超时→验证UI恢复 |
| I-CONC | 两个BrowserContext同时操作→验证冲突处理 |
| I-CROSS | 在模块A执行操作→导航到模块B→验证模块B数据已更新 |

**业务核心（8 种）**

| 场景 | 执行策略 |
|------|---------|
| I-FILE | 上传测试Excel→验证解析→验证部分导入→下载导出→验证内容 |
| I-NUTR | 创建含药材/辅料配方→查看营养→验证ratio计算→验证归零→验证能量重算 |
| I-PERM | admin登录→验证按钮可见→formulist登录→验证按钮隐藏→直接URL访问→验证拦截 |
| I-SRCH | 输入搜索→验证请求参数→验证结果→操作一条→验证搜索状态保持 |
| I-OWNS | formulist登录→获取admin资源ID→直接调API→验证403 |
| I-BATCH | 批量导入含错误数据→验证部分成功→验证错误提示 |
| I-SSE | 发送AI问题→监听SSE→验证逐字渲染→模拟断开→验证重试 |
| I-FMT | 查看列表→验证日期格式→验证数值精度→验证空值兜底 |

**边界场景（2 种）**

| 场景 | 执行策略 |
|------|---------|
| I-TAB | 两个标签页→Tab A操作→Tab B操作→验证冲突处理 |
| I-GUARD | 未登录直接访问URL→验证跳转登录→登录后验证回原页 |

**业务特有（4 种）**

| 场景 | 执行策略 |
|------|---------|
| I-CMP | 选择两个配方→点击对比→验证差异展示 |
| I-NL2SQL | 输入自然语言→验证SQL生成→验证白名单校验→验证结果展示 |
| I-PRESET | 查看预设配方→验证编辑按钮隐藏→直接调API编辑→验证403 |
| I-REF | 删除被引用原料→验证拒绝→修改原料价格→验证配方成本更新 |

**请求生命周期（1 种）**

| 场景 | 执行策略 |
|------|---------|
| I-LIFE | 快速切换页面→验证请求取消；短时间大量请求→验证429提示；断网→恢复→验证同步 |

**数据一致性（3 种）**

| 场景 | 执行策略 |
|------|---------|
| I-EXP | 页面记录数据→导出Excel→读取验证内容一致 |
| I-FAILOVER | 设置主provider不可用→发送AI请求→验证自动切换→验证前端无感知 |
| I-OPT | 删除操作→验证UI立即移除→模拟API失败→验证UI回滚 |

**可靠性保障（2 种）**

| 场景 | 执行策略 |
|------|---------|
| I-DEDUP | 快速双击提交按钮→验证只创建一条数据 |
| I-TXN | 触发多步操作→模拟中途失败→验证DB无半完成状态→验证前端提示 |

#### 性能阈值

| 操作类型 | 默认阈值 |
|---------|---------|
| 页面加载 | 3000ms |
| CRUD 操作 | 1000ms（含 UI 更新） |
| 列表查询+渲染 | 2000ms |
| AI 请求 | 30000ms |
| 文件上传 | 10000ms |
| 导出下载 | 15000ms |
| 营养计算 | 5000ms |

### 阶段 6：契约验证

契约维度通过**代码扫描对比**验证，不需要运行时操作：

1. 读取前端 API 层代码（`api/*.ts`）中的接口定义
2. 读取后端路由代码（`routes/*.ts`）中的路由定义
3. 逐项对比 19 个契约维度
4. 标记一致性判定

对于需要运行时验证的契约（如 C-NULL、C-PREC），在阶段 5 中一并验证。

### 阶段 7：输出报告

输出到 `test/integration-test-results/{模块名}-integration-test-results.md`。

## 文档结构

```markdown
# {模块名} 前后端联调测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ITR-{模块缩写}-{YYYYMMDD}-{序号} |
| 源文档ID | ITC-{模块缩写}-{YYYYMMDD}-{序号} |
| 源文档路径 | test/integration-test-cases/formulas-integration-test-cases.md |
| 前端文件hash | {hash}（当前 / 文档记录） |
| 后端文件hash | {hash}（当前 / 文档记录） |
| 执行时间 | YYYY-MM-DD HH:mm |
| 联调场景用例数 | N |
| 契约验证用例数 | N |
| 总用例数 | N |
| 通过 | N |
| 失败 | N |
| 跳过 | N |
| 通过率 | N% |

## 一、联调场景执行结果

### 1.1 结果总览
| 用例ID | 用例名称 | 结果 | 7层验证详情 | 响应时间 |
|--------|---------|------|-----------|---------|
| I-CRUD01 | 创建配方全链路 | ✅ | 7/7层通过 | 850ms |
| I-CRUD02 | 编辑配方全链路 | ❌ | 5/7层通过 | 720ms |
| I-AUTH01 | Token过期跳转 | ✅ | 7/7层通过 | 1200ms |
| I-NUTR01 | 药材营养计算 | ❌ | 6/7层通过 | 650ms |

### 1.2 7层验证详情

#### I-CRUD02 编辑配方全链路（5/7层通过）
| 验证层 | 结果 | 预期 | 实际 |
|--------|------|------|------|
| 1.前端操作层 | ✅ | 编辑表单打开 | 编辑表单打开 |
| 2.API请求层 | ✅ | PUT /api/formulas/:id | PUT /api/formulas/:id |
| 3.DB状态层 | ✅ | name更新 | name已更新 |
| 4.Store状态层 | ❌ | Store.list中名称更新 | Store.list中名称未更新（响应式丢失） |
| 5.API响应层 | ✅ | 200, name=newName | 200, name=newName |
| 6.前端展示层 | ❌ | 列表显示新名称 | 列表仍显示旧名称 |
| 7.浏览器存储层 | ✅ | Token不变 | Token不变 |

**根因分析**：Store 更新时直接赋值属性而非使用响应式方法，导致 Vue 未检测到变化。

### 1.3 失败用例详情

#### I-NUTR01 药材营养计算（6/7层通过）
| 项 | 值 |
|----|-----|
| 用例ID | I-NUTR01 |
| 严重程度 | High |
| 失败层 | 6.前端展示层 |
| 预期 | 蛋白质显示 0g（归零后） |
| 实际 | 蛋白质显示 0.03g（未归零） |
| 修复建议 | 检查前端是否正确实现了零界限归零逻辑，或后端归零后前端又重新计算覆盖 |

## 二、契约验证结果

### 2.1 契约一致性总览
| 契约分类 | 维度数 | 一致 | 不一致 | 待确认 |
|---------|--------|------|--------|--------|
| 基础契约 | 6 | 5 | 1 | 0 |
| 数据契约 | 6 | 4 | 1 | 1 |
| 结构契约 | 5 | 5 | 0 | 0 |
| 一致性契约 | 2 | 2 | 0 | 0 |
| **合计** | **19** | **16** | **2** | **1** |

### 2.2 不一致详情

#### C-EP02 端点不匹配
| 项 | 值 |
|----|-----|
| 用例ID | C-EP02 |
| 前端定义 | formula.ts: getFormulaVersions → GET /api/formulas/:id/versions |
| 后端定义 | 无对应路由 |
| 影响 | 前端调用返回 404，功能不可用 |
| 修复建议 | 后端补充 /formulas/:id/versions 路由，或前端移除未使用的 API 调用 |

#### C-NAME03 字段命名不一致
| 项 | 值 |
|----|-----|
| 用例ID | C-NAME03 |
| 前端定义 | interface Formula { formulaCode: string } |
| 后端定义 | rowToCamelCase 转换后为 formulaCode，但 init.sql 中字段名为 code |
| 影响 | 后端返回 code 而非 formulaCode，前端读取 undefined |
| 修复建议 | 后端 SELECT 中添加 AS formula_code，或前端改为 code |

## 三、性能异常用例
| 用例ID | 操作 | 响应时间 | 阈值 | 建议 |
|--------|------|---------|------|------|
| I-CRUD01 | 创建配方 | 3500ms | 1000ms | 检查配方创建是否含不必要的同步计算 |

## 四、Bug 汇总（按严重程度排序）
| 用例ID | Bug 描述 | 严重程度 | 失败层 | 修复建议 |
|--------|---------|---------|--------|---------|
| I-NUTR01 | 蛋白质未归零显示0.03g | Critical | 展示层 | 检查零界限归零逻辑 |
| I-CRUD02 | Store响应式丢失导致UI不更新 | High | Store+展示层 | 使用Vue.set或替换整个对象 |
| C-EP02 | 前端调用不存在的端点 | High | 契约 | 补充后端路由或移除前端调用 |
| C-NAME03 | 字段命名不一致导致undefined | High | 契约 | 统一字段命名 |
| I-CRUD01 | 创建配方响应3.5s | Medium | 性能 | 优化创建逻辑 |
```

## 严重程度判定规则

| 条件 | 严重程度 |
|------|---------|
| 数据丢失/损坏/安全漏洞/计算错误 | Critical |
| 核心功能不可用/UI状态不一致/契约不一致 | High |
| 非核心功能异常/性能不达标 | Medium |
| 展示格式不规范/不影响功能 | Low |

## 测试数据管理

| 策略 | 说明 |
|------|------|
| 测试前 | 清理残留测试数据 + seed 基础数据 |
| 测试中 | 每条用例独立，不依赖其他用例的副作用 |
| 测试后 | 保留测试数据供排查，或按配置清理 |
| 命名规范 | 测试数据以 `[test]` 前缀标识，便于清理 |
| 多角色数据 | admin 和 formulist 各准备独立测试数据 |

## 注意事项

- **用例ID 透传**：结果文档中的用例ID 必须与 integration-test-cases 文档完全一致
- **文档ID 互引**：结果文档头部必须包含源文档ID 和前后端文件hash
- **7层验证不可省略**：每条联调用例必须执行全部7层验证，缺失任何一层都应标记为不完整
- **契约验证双模式**：静态契约通过代码扫描验证，动态契约通过运行时验证
- **测试数据隔离**：每条用例独立准备数据，不依赖执行顺序
- **不修改生产数据**：测试数据必须可辨识（[test] 前缀），测试后可清理
- **Playwright 全局命令**：使用 `playwright test` 而非 `npx playwright`，遵循 playwright-no-npx 规则
- **并发测试安全**：并发用例使用独立的 BrowserContext 和测试数据
- **截图留证**：失败用例自动截图保存到 `test/screenshots/`，命名格式 `error-{用例ID}-{日期}.png`
