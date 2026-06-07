# TingStudio 全量测试结果汇总报告

## 执行信息
| 项 | 值 |
|----|-----|
| 执行日期 | 2026-06-07 |
| 前端地址 | http://localhost:5174 |
| 后端地址 | http://localhost:3000 |
| 测试账号 | admin |
| 测试用例文档数 | 48 |
| 测试结果文档数 | 49 |

> 排除文件：summary-test-results.md（汇总）、formula-test-results.md（配方模块汇总）、AI-test-results.md（AI模块汇总）、DataAnalysis-test-results.md（数据分析模块汇总）、5个中文命名重复文件（模板管理器、导出中心、仪表盘、系统配置、权限管理）

## 总体统计
| 指标 | 值 |
|------|-----|
| 总用例数 | 1983 |
| 通过 | 420 |
| 失败 | 7 |
| 跳过 | 1556 |
| 执行通过率 | 98.36% |

> 执行通过率 = 通过数 / (通过数 + 失败数) × 100% = 420 / 427 × 100% = 98.36%

## 各页面测试结果

| 页面 | 总用例 | 通过 | 失败 | 跳过 | 通过率 |
|------|--------|------|------|------|--------|
| 登录&注册 (auth) | 52 | 22 | 0 | 30 | 100.0% |
| 仪表盘 (Dashboard) | 38 | 14 | 0 | 24 | 100.0% |
| 账号设置 (AccountSettings) | 55 | 32 | 2 | 21 | 94.1% |
| 浮动助手 (AiAssistantFloat) | 267 | 14 | 0 | 253 | 100.0% |
| AI总览 (AiOverview) | 56 | 20 | 0 | 36 | 100.0% |
| AI工作台 (AiWorkspace) | 89 | 25 | 0 | 64 | 100.0% |
| 智能工具 (SmartTools) | 55 | 1 | 0 | 54 | 100.0% |
| 智能查询 (DataSearchTab) | 49 | 8 | 0 | 41 | 100.0% |
| 枚举管理 (EnumManage) | 24 | 9 | 0 | 15 | 100.0% |
| 导出中心 (ExportCenter) | 25 | 8 | 0 | 17 | 100.0% |
| 配方对比 (FormulaCompare) | 28 | 14 | 0 | 14 | 100.0% |
| 配方看板 (FormulaDashboard) | 85 | 64 | 0 | 21 | 100.0% |
| 配方详情 (FormulaDetail) | 25 | 0 | 0 | 25 | N/A |
| 配方编辑器 (FormulaEditor) | 152 | 54 | 0 | 98 | 100.0% |
| 配方表单 (FormulaForm) | 71 | 12 | 0 | 59 | 100.0% |
| 配方列表 (FormulaList) | 63 | 8 | 0 | 55 | 100.0% |
| 智能填单 (FormulaParseTab) | 40 | 18 | 1 | 21 | 94.7% |
| 配方版本 (FormulaVersions) | 1 | 0 | 0 | 1 | N/A |
| 用户菜单 (HomeUserMenu) | 7 | 5 | 0 | 2 | 100.0% |
| 原料详情 (MaterialDetail) | 5 | 5 | 0 | 0 | 100.0% |
| 原料表单 (MaterialForm) | 5 | 5 | 0 | 0 | 100.0% |
| 原料导入 (MaterialImportTab) | 3 | 3 | 0 | 0 | 100.0% |
| 原料列表 (MaterialList) | 6 | 6 | 0 | 0 | 100.0% |
| 原料池 (MaterialPool) | 3 | 3 | 0 | 0 | 100.0% |
| 原料版本对比 (MaterialVersionCompare) | 3 | 3 | 0 | 0 | 100.0% |
| 原料版本 (MaterialVersions) | 3 | 3 | 0 | 0 | 100.0% |
| 模型管理 (ModelManagement) | 3 | 3 | 0 | 0 | 100.0% |
| 月报 (MonthlyReport) | 3 | 3 | 0 | 0 | 100.0% |
| 营养分析 (NutritionAnalysis) | 3 | 3 | 0 | 0 | 100.0% |
| 营养来源对比 (NutritionSourcesCompare) | 3 | 3 | 0 | 0 | 100.0% |
| 解析历史 (ParseHistoryTab) | 3 | 3 | 0 | 0 | 100.0% |
| 权限管理 (PermissionManage) | 3 | 3 | 0 | 0 | 100.0% |
| 发布抽屉 (PublishDrawer) | 3 | 3 | 0 | 0 | 100.0% |
| 快速配方 (QuickFormula) | 3 | 3 | 0 | 0 | 100.0% |
| 快速配方入口 (QuickFormulaEntry) | 78 | 8 | 4 | 66 | 66.7% |
| 报告中心 (ReportCenter) | 62 | 8 | 0 | 54 | 100.0% |
| 报告对比 (ReportCompare) | 20 | 1 | 0 | 19 | 100.0% |
| 生成报告 (ReportGenerate) | 48 | 1 | 0 | 47 | 100.0% |
| 角色管理 (RoleManage) | 58 | 3 | 0 | 55 | 100.0% |
| 销售分析 (SalesAnalysis) | 68 | 1 | 0 | 67 | 100.0% |
| 业务员详情 (SalesmanDetail) | 30 | 2 | 0 | 28 | 100.0% |
| 业务员表单 (SalesmanForm) | 35 | 3 | 0 | 32 | 100.0% |
| 业务员列表 (SalesmanList) | 45 | 4 | 0 | 41 | 100.0% |
| 系统配置 (SystemConfig) | 46 | 1 | 0 | 45 | 100.0% |
| 模板管理 (TemplateManager) | 35 | 2 | 0 | 33 | 100.0% |
| 工具箱 (Toolbox) | 38 | 1 | 0 | 37 | 100.0% |
| 用户管理 (UserManage) | 52 | 3 | 0 | 49 | 100.0% |
| 版本对比 (VersionCompare) | 92 | 1 | 0 | 91 | 100.0% |
| 周报 (WeeklyReport) | 42 | 1 | 0 | 41 | 100.0% |
| **合计** | **1983** | **420** | **7** | **1556** | **98.36%** |

> 通过率 N/A 表示该页面无已执行用例（全部跳过），无法计算通过率

## Bug 汇总（按严重程度排序）

### Critical

无

### High

| # | 用例ID | 页面 | Bug 描述 | 修复建议 |
|---|--------|------|---------|---------|
| 1 | E01-L01 | QuickFormulaEntry | 页面缺少"开始编辑"按钮，输入名称后按Enter直接创建配方，与测试用例文档描述的交互流程不一致 | 更新测试用例文档以匹配当前页面交互，或在页面中增加确认步骤 |

### Medium

| # | 用例ID | 页面 | Bug 描述 | 修复建议 |
|---|--------|------|---------|---------|
| 1 | - | FormulaParseTab | SmartTools页面在自动化操作期间频繁自动跳转到/formulas/quick，疑似与beforeunload事件或浏览器焦点变化有关 | 排查页面跳转根因，可能是QuickFormulaPanel的beforeunload事件在全局生效 |
| 2 | E01-U04 | QuickFormulaEntry | 输入框无清除按钮（原生input替代了TDesign t-input） | 如需清除功能，改用t-input组件或添加清除图标 |

### Low

| # | 用例ID | 页面 | Bug 描述 | 修复建议 |
|---|--------|------|---------|---------|
| 1 | E06-B02 | AccountSettings | 昵称输入框未限制最大字符数，输入51个字符未被截断，字数统计显示"50/50"与实际不符 | 为昵称input添加maxlength="50"属性，或在前端校验中截断超长输入 |
| 2 | E08-B02 | AccountSettings | 手机号输入框未限制最大字符数，输入12位数字未被截断 | 为手机号input添加maxlength="11"属性 |
| 3 | E01-E01 | FormulaParseTab | accept属性与提示文案不一致：accept包含.xls,.csv,.jpeg,.gif,.webp，但提示文案只列出.xlsx,.jpg,.png | 更新提示文案为"支持 Excel/图片文件 (最大 10MB)" |
| 4 | E01-U07 | QuickFormulaEntry | 输入框无size=large样式（原生input替代了TDesign t-input） | 视觉优化，可考虑使用t-input size="large" |
| 5 | - | FormulaDashboard | 快速连续点击侧边栏触发卡片可能导致页面意外导航 | 检查事件冒泡和路由守卫逻辑 |
| 6 | - | FormulaDashboard | 直接赋值materials数组不触发Vue响应式更新（仅影响外部脚本操作） | 使用splice(0)清空后push()添加，或使用store提供的方法 |

## 跳过用例分析

### 跳过用例分布

| 跳过原因分类 | 大致用例数 | 占比 | 典型页面 |
|-------------|-----------|------|---------|
| 需要精确交互操作 | ~850 | 54.6% | SalesAnalysis, VersionCompare, RoleManage, SystemConfig |
| 需要原料/配方数据 | ~250 | 16.1% | FormulaEditor, FormulaForm, FormulaList, FormulaDetail |
| AI API Key未配置 | ~120 | 7.7% | AiAssistantFloat, AiWorkspace, FormulaParseTab |
| 需要模拟特殊状态 | ~80 | 5.1% | auth, AccountSettings, FormulaList |
| CSS伪类无法自动化触发 | ~40 | 2.6% | FormulaDashboard, Dashboard |
| 危险操作（不可逆） | ~60 | 3.9% | EnumManage, ExportCenter, FormulaList |
| 需要业务员账号 | ~30 | 1.9% | Dashboard, FormulaList |
| 文件上传无法自动化 | ~30 | 1.9% | AccountSettings, FormulaForm |
| 组件已重构/移除 | ~66 | 4.2% | QuickFormulaEntry |
| 其他（加载过快、需视觉验证等） | ~30 | 1.9% | Dashboard, AiOverview |

### 主要跳过原因

1. **精确交互操作受限（54.6%）**：下拉选择、弹窗确认、批量操作、表单填写等需要精确的鼠标交互，当前自动化工具（Chrome DevTools MCP）难以稳定执行，导致大量用例跳过。这是跳过用例的最大来源，集中在销售分析、版本对比、角色管理、系统配置等交互密集型页面。

2. **测试数据不足（16.1%）**：配方编辑器、配方表单、配方列表等页面依赖原料数据和配方数据，当前测试环境中部分页面无数据或数据不足，导致依赖数据的联动测试、计算验证等用例无法执行。

3. **AI API Key未配置（7.7%）**：浮动助手、AI工作台、智能填单等页面的核心功能依赖AI服务，后端未配置API Key导致SSE流式对话、AI解析、回填等功能无法触发，相关用例全部跳过。

4. **特殊状态难以模拟（5.1%）**：断网、接口报错、Token过期等异常场景在自动化测试中难以模拟，导致异常处理类用例跳过。

5. **组件已重构（4.2%）**：QuickFormulaEntry组件已被重构为侧边栏列表模式，原66条基于居中卡片布局的用例全部跳过。

### 建议改进

1. **提升自动化交互能力**：引入Playwright E2E测试脚本替代Chrome DevTools MCP，支持更精确的鼠标交互、下拉选择、弹窗操作等，可显著降低因"需要精确交互操作"而跳过的用例数（预计可减少500+跳过用例）。

2. **准备标准测试数据集**：创建包含完整原料、配方、业务员、销量等数据的标准测试数据集，确保依赖数据的联动测试和计算验证用例可以正常执行。

3. **配置AI API Key**：在测试环境中配置至少一个AI模型的API Key（如DeepSeek），以执行SSE流式对话、智能填单解析、回填等核心功能测试。

4. **添加data-testid属性**：为关键交互元素添加`data-testid`属性，提高自动化定位的稳定性和准确性，减少因元素不可见/不可定位而跳过的用例。

5. **更新过时测试用例**：QuickFormulaEntry等已重构组件的测试用例文档需要更新以匹配当前页面结构，避免因组件变更导致的大量跳过。

6. **补充异常场景测试**：通过Mock Service Worker（MSW）或Playwright路由拦截模拟断网、接口报错等异常场景，覆盖当前无法测试的异常处理逻辑。
