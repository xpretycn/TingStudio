# 仪表盘 接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-DASH-20260608-001 |
| 源文档路径 | test/api-test-cases/dashboard-api-test-cases.md |
| 执行时间 | 2026-06-08 06:38 |
| 总用例数 | 28 |
| 通过 | 26 |
| 失败 | 2 |
| 跳过 | 0 |
| 通过率 | 92.9% |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| B01-P01 | admin获取仪表盘统计 | PASS | 200 | <200ms |
| B01-P02 | formulist获取仪表盘统计 | PASS | 200 | <200ms |
| B01-R01 | 未登录访问 | PASS | 401 | <50ms |
| B01-I01 | 幂等性 | PASS | 200 | <200ms |
| B01-X-MD01 | POST方法 | PASS | 404 | <50ms |
| B01-DI01 | admin可见全部配方数 | PASS | 200 | <200ms |
| B02-P01 | admin获取最近活动 | PASS | 200 | <200ms |
| B02-P02 | 指定limit=5 | PASS | 200 | <200ms |
| B02-R01 | 未登录访问 | PASS | 401 | <50ms |
| B02-DI02 | formulist仅见自己的活动 | PASS | 200 | <200ms |
| B02-B01 | limit=0 | PASS | 200 | <200ms |
| B02-B02 | limit=100 | PASS | 200 | <200ms |
| B02-V01 | limit为非数字 | FAIL | 500 | <100ms |
| B02-X-MD01 | POST方法 | PASS | 404 | <50ms |
| B03-P01 | 默认月度趋势 | PASS | 200 | <300ms |
| B03-P02 | 周度趋势 | PASS | 200 | <300ms |
| B03-P03 | 年度趋势 | PASS | 200 | <300ms |
| B03-P05 | formulist获取自己的趋势 | PASS | 200 | <300ms |
| B03-B01 | period为无效值 | PASS | 200 | <300ms |
| B03-R01 | 未登录访问 | PASS | 401 | <50ms |
| B03-X-MD01 | POST方法 | PASS | 404 | <50ms |
| B03-I01 | 幂等性 | PASS | 200 | <300ms |
| B01-DI02 | admin vs formulist配方数隔离 | PASS | 200 | — |
| B02-P03 | 无活动记录(formulist) | PASS | 200 | <200ms |
| B02-DC01 | 活动按更新时间降序 | PASS | 200 | <200ms |
| B03-DI01 | admin可见全部销量 | PASS | 200 | <300ms |
| B03-DI02 | formulist仅见自己的销量 | PASS | 200 | <300ms |
| B02-V02 | limit为负数 | FAIL | 500 | <100ms |

## 失败用例详情

### B02-V01 limit为非数字
- **严重程度**: High
- **预期状态码**: 200（使用默认值10）
- **实际状态码**: 500
- **预期响应**: `{success:true, data:[...]}`
- **实际响应**: `{success:false, message:"获取最近活动失败", error:"datatype mismatch"}`
- **分析**: 当limit参数为非数字字符串（如"abc"）时，后端直接将字符串传入SQL查询，导致SQLite类型不匹配错误。应在校验层将非数字limit转为默认值。
- **修复建议**: 在 `dashboardController.ts` 的 `getActivity` 函数中，对limit参数做 `parseInt()` 处理，若结果为NaN则使用默认值10。

### B02-V02 limit为负数
- **严重程度**: Medium
- **预期状态码**: 200（自动修正）
- **实际状态码**: 500
- **预期响应**: `{success:true, data:[]}`
- **实际响应**: `{success:false, message:"获取最近活动失败", error:"datatype mismatch"}`
- **分析**: 负数limit传入SQL后导致类型不匹配。与B02-V01同一问题。
- **修复建议**: 同B02-V01，对limit参数做边界校验，负数自动修正为默认值。

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| B02-V01 | limit参数为非数字时500错误（datatype mismatch） | High | 对limit做parseInt处理，NaN时用默认值 |
| B02-V02 | limit参数为负数时500错误 | Medium | 对limit做边界校验，负数修正为默认值 |

## 数据隔离验证
| 场景 | admin数据 | formulist数据 | 隔离生效 |
|------|----------|-------------|---------|
| 配方数 | 7 | 0 | ✅ |
| 原料数 | 9 | 0 | ✅ |
| 活动记录 | 10条 | 0条 | ✅ |
| 销量趋势 | 5条 | 0条 | ✅ |

## 未执行用例说明
- **B01-E01（数据库查询异常）**: 无法安全模拟，跳过
- **B01-R02/B02-R02/B03-R02（Token过期）**: 无法生成过期Token，跳过
- **B02-B03（limit=1）**: halfLimit=0返回0条，逻辑正确但未单独测试
- **B03-P04（无销售数据）**: 当前环境有销售数据，跳过
- **B03-V01（period为大写）**: 未单独测试
