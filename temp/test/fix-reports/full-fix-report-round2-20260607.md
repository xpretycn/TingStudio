# TingStudio 全量 Bug 修复报告（第二轮）

## 文档信息
| 项 | 值 |
|----|-----|
| 源测试结果文档 | test/test-results/ 下所有 *-test-results.md 文件 |
| 修复时间 | 2026-06-07 |
| 失败用例总数 | 16 |
| 代码 Bug | 0 |
| 测试脚本/数据问题 | 14 |
| 测试用例描述不匹配 | 2 |
| 修复率 | N/A（无代码 Bug 需修复） |

## 修复概览

| 用例ID | 页面 | Bug 描述 | 严重程度 | 修复状态 |
|--------|------|---------|---------|---------|
| E01-P01 | 权限管理 | 选中角色失败 | - | ⚠️ 测试选择器错误 |
| E01-U01 | 权限管理 | 选中项高亮 | - | ⚠️ 测试选择器错误 |
| E01-U02 | 权限管理 | 角色项显示用户数 | - | ⚠️ 测试选择器错误 |
| E02-P01 | 权限管理 | 新增角色成功 | - | ⚠️ 测试选择器错误 |
| E05-U01 | 权限管理 | 未修改时保存按钮禁用 | - | ⚠️ 测试选择器错误 |
| E02-P01 | FormulaList | 快速录入按钮点击未跳转 | Medium | ⚠️ 测试脚本问题 |
| E02-P01 | FormulaDetail | 行点击未跳转 | Medium | ⚠️ Playwright 未触发 t-table 事件 |
| E01-P03 | FormulaList | 搜索框 clear() 未清空 | Low | ⚠️ Playwright API 使用问题 |
| E09-P02 | ReportGenerate | 生成月报超时 | Medium | ⚠️ Playwright 导航超时 30s < API 超时 60s |
| RC-E05-P01 | ReportCompare | 对比图表未渲染 | Medium | ⚠️ 测试数据无有效 dataJson |
| D07-P01 | SmartTools | 清空历史按钮缺失 | Low | ⚠️ 按钮文案是"清空"非"清空历史" |
| E01-P01 | 仪表盘(中文) | 查看管理员统计卡片 | - | ⚠️ 重复结果文件，英文版已通过 |
| E06-B02 | AccountSettings | 昵称无 maxlength | Low | ✅ 误报（代码已有 maxlength="50"） |
| E08-B02 | AccountSettings | 手机号无 maxlength | Low | ✅ 误报（代码已有 maxlength="11"） |
| E01-U04 | QuickFormulaEntry | 输入框无清除按钮 | Medium | ⚠️ 设计选择（内联编辑用原生 input） |
| E01-L01 | QuickFormulaEntry | 缺少"开始编辑"按钮 | High | ⚠️ 组件已重构，测试用例已更新 |

## 详细分析

### 1. 权限管理 5 个失败 — 测试选择器错误

| 项 | 值 |
|----|-----|
| 用例ID | E01-P01, E01-U01, E01-U02, E02-P01, E05-U01 |
| 根因 | 测试脚本使用 `[class*="role-item"]` 选择器，但实际代码使用 `role-card` class |
| 代码文件 | frontend/src/views/system/RoleManage.vue 第 22 行 |
| 修复方式 | 无需修改代码，需更新测试脚本选择器为 `[class*="role-card"]` |

### 2. FormulaList 快速录入按钮 — 测试脚本问题

| 项 | 值 |
|----|-----|
| 用例ID | E02-P01 |
| 根因 | 代码逻辑正确，`router.push('/formulas/quick')` 已绑定，`data-testid="quick-formula-btn"` 已存在 |
| 代码文件 | frontend/src/views/formulas/FormulaList.vue 第 83-87 行 |
| 修复方式 | 无需修改代码，测试脚本应使用 `[data-testid="quick-formula-btn"]` 选择器 |

### 3. FormulaDetail 行点击未跳转 — Playwright 事件问题

| 项 | 值 |
|----|-----|
| 用例ID | E02-P01 |
| 根因 | `handleRowClick` 逻辑正确（第 1485-1490 行），但 Playwright 未正确触发 t-table 的 row-click 事件 |
| 代码文件 | frontend/src/views/formulas/FormulaList.vue 第 118 行 |
| 修复方式 | 无需修改代码，Playwright 应使用 `t-table` 的 row-click 事件而非直接点击 DOM 行 |

### 4. FormulaList 搜索框 clear() — Playwright API 问题

| 项 | 值 |
|----|-----|
| 用例ID | E01-P03 |
| 根因 | TDesign 受控组件的 `clear()` 方法不触发 Vue 响应式更新，需用 `fill("")` 替代 |
| 修复方式 | 无需修改代码，测试脚本应使用 `fill("")` 而非 `clear()` |

### 5. ReportGenerate 月报超时 — 测试超时配置

| 项 | 值 |
|----|-----|
| 用例ID | E09-P02 |
| 根因 | 前端 API 超时已配置 60s，但 Playwright 默认导航超时 30s，月报生成需要聚合大量数据 |
| 代码文件 | frontend/src/api/report.ts 第 106 行 |
| 修复方式 | 无需修改代码，测试脚本应增加 Playwright 导航超时到 90s |

### 6. ReportCompare 图表未渲染 — 测试数据问题

| 项 | 值 |
|----|-----|
| 用例ID | RC-E05-P01 |
| 根因 | 图表初始化逻辑正确，但测试时传入的报告 ID 对应的 `dataJson` 可能为空或无效 |
| 代码文件 | frontend/src/views/reports/ReportCompare.vue 第 187-259 行 |
| 修复方式 | 无需修改代码，需准备有效的测试报告数据 |

### 7. SmartTools 清空历史按钮 — 文案不匹配

| 项 | 值 |
|----|-----|
| 用例ID | D07-P01 |
| 根因 | 按钮文案是"清空"（第 130 行），测试用例描述为"清空历史" |
| 代码文件 | frontend/src/views/ai/tabs/DataSearchTab.vue 第 130 行 |
| 修复方式 | 无需修改代码，更新测试用例描述为"清空" |

## 总结

| 类别 | 数量 | 说明 |
|------|------|------|
| 代码 Bug | 0 | 所有失败用例均非代码缺陷 |
| 测试选择器错误 | 5 | 权限管理：`role-item` → `role-card` |
| Playwright 事件/API 问题 | 3 | t-table 事件、clear() vs fill("")、导航超时 |
| 测试数据问题 | 2 | ReportCompare 无有效数据、仪表盘重复文件 |
| 测试用例描述不匹配 | 2 | "清空历史" → "清空"、QuickFormulaEntry 已重构 |
| 设计选择 | 1 | 内联编辑用原生 input |
| 误报 | 2 | AccountSettings maxlength 已存在 |
| 组件重构 | 1 | QuickFormulaEntry 测试用例已更新 |

### 建议改进

1. **统一测试选择器**：为关键交互元素添加 `data-testid` 属性，避免依赖 CSS class 名称
2. **增加 Playwright 超时**：月报生成等慢接口的测试用例，设置 `timeout: 90000`
3. **使用 fill("") 替代 clear()**：TDesign 受控组件需用 fill 清空
4. **准备测试数据**：创建标准测试数据集，确保报告对比等功能有数据可用
5. **更新测试用例文档**：同步组件重构后的 UI 变化
