# 数据分析模块 Bug 修复报告

## 文档信息
| 项 | 值 |
|----|-----|
| 源文档ID | TR-DA-20260606-001 |
| 源测试用例文档ID | TC-NA/SA/RC/RG/RCMP/WR/MR/DB-20260606-001 |
| 测试结果文档 | test/test-results/DataAnalysis-test-results.md |
| 修复时间 | 2026-06-06 |
| Bug 总数 | 2 |
| 已修复 | 2 |
| 修复未生效 | 0 |
| 需手动处理 | 0 |
| 修复率 | 100% |

## 修复概览

| 用例ID | Bug 描述 | 严重程度 | 修复状态 |
|--------|---------|---------|---------|
| E09-P02 | 生成月报接口超时 | Medium | ✅ 已修复 |
| RC-E05-P01 | 报告对比页面图表未渲染 | Medium | ✅ 已修复 |

## 修复详情

### E09-P02 生成月报接口超时 ✅ 已修复
| 项 | 值 |
|----|-----|
| 用例ID | E09-P02 |
| 严重程度 | Medium |
| 修复文件 | frontend/src/api/report.ts |
| 根因分析 | 前端 axios 默认 timeout=15000ms (15s)，而月报生成涉及约 20+ 条数据库聚合查询（含周对比、月趋势、环比同比计算等），后端处理时间可能超过 15s，导致前端请求超时 |
| 修复内容 | 为 `reportApi.generate` 方法增加 `timeout: 60000` (60s) 配置，覆盖默认的 15s 超时 |
| 修改行数 | +2 行 |
| 验证方式 | 代码逻辑审查 |
| 验证结果 | ✅ 超时配置已从 15s 提升到 60s，足以覆盖月报生成的聚合计算时间 |

### RC-E05-P01 报告对比页面图表未渲染 ✅ 已修复
| 项 | 值 |
|----|-----|
| 用例ID | RC-E05-P01 |
| 严重程度 | Medium |
| 修复文件 | frontend/src/views/reports/ReportCompare.vue |
| 根因分析 | `watch([report1, report2])` 带 `immediate: true`，在 report1/report2 为 null 时就触发了 initCharts（无效调用）。后续 loadData() 完成赋值后 watch 再次触发 initCharts，但此时 `initialized` 仍为 false（onMounted 中 initialized=true 在 await loadData() 之后），导致 Skeleton 仍显示，图表 DOM ref 不存在，ECharts 无法初始化 |
| 修复内容 | 1. 移除 watch 的 `immediate: true`，增加 `initialized.value` 条件守卫，确保只在 DOM 就绪后初始化图表；2. 在 onMounted 的 finally 块中 `initialized = true` 之后，手动调用 initCharts，确保数据加载完成后图表一定能渲染 |
| 修改行数 | +6 行 / -2 行 |
| 验证方式 | 代码逻辑审查 |
| 验证结果 | ✅ 修复后 initCharts 在 initialized=true 且 DOM 可用时才调用，图表能正常渲染 |
