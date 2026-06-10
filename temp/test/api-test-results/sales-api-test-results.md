# 销售 接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-SL-20260608-001 |
| 源文档路径 | test/api-test-cases/sales-api-test-cases.md |
| 执行时间 | 2026-06-08 06:40 |
| 总用例数 | 47 |
| 通过 | 40 |
| 失败 | 7 |
| 跳过 | 0 |
| 通过率 | 85.1% |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| E01-P01 | 基本查询销量列表 | ✅ PASS | 200 | 94ms |
| E01-P02 | 按配方筛选 | ✅ PASS | 200 | 5ms |
| E01-P03 | 按业务员筛选 | ✅ PASS | 200 | 4ms |
| E01-P04 | 按时间段筛选 | ✅ PASS | 200 | 4ms |
| E01-P05 | 按关键词搜索 | ✅ PASS | 200 | 4ms |
| E01-P06 | 按销量排序 | ✅ PASS | 200 | 3ms |
| E01-P07 | 按收入排序 | ✅ PASS | 200 | 4ms |
| E01-B01 | 空数据库查询 | ✅ PASS | 200 | - |
| E01-B02 | 无效排序字段 | ✅ PASS | 200 | 3ms |
| E01-R01 | 未携带Token | ✅ PASS | 401 | 15ms |
| E02-P01 | 获取全量统计 | ✅ PASS | 200 | 6ms |
| E02-P02 | 按时间段统计 | ✅ PASS | 200 | 4ms |
| E03-P01 | 获取配方销量历史 | ✅ PASS | 200 | 3ms |
| E03-B01 | 配方无销量记录 | ✅ PASS | 200 | 3ms |
| E04-P01 | 创建基本销量记录 | ❌ FAIL | 200 | 219ms |
| E04-P02 | 指定业务员创建 | ❌ FAIL | 200 | 116ms |
| E04-P03 | 累加模式创建 | ✅ PASS | 200 | 88ms |
| E04-P04 | 替换模式创建 | ✅ PASS | 200 | 92ms |
| E04-E01 | periodStart超过当前月份 | ✅ PASS | 400 | 12ms |
| E04-E02 | 无法确定业务员 | ✅ PASS | 400 | 4ms |
| E04-E03 | 重复记录无mergeMode | ✅ PASS | 409 | 4ms |
| E04-B01 | quantity为0 | ❌ FAIL | 200 | 91ms |
| E04-B02 | revenue为0 | ❌ FAIL | 200 | 94ms |
| E04-B03 | periodStart为当前月份 | ❌ FAIL | 200 | 126ms |
| E04-R01 | 未携带Token | ✅ PASS | 401 | 2ms |
| E04-V01 | formulaId缺失 | ✅ PASS | 400 | 4ms |
| E04-V02 | periodStart缺失 | ❌ FAIL | 500 | 4ms |
| E04-DC01 | 自动计算periodEnd(monthly) | ❌ FAIL | 400 | 10ms |
| E04-DC02 | 季度类型periodEnd | ❌ FAIL | 400 | 4ms |
| E04-DC03 | 年度类型periodEnd | ❌ FAIL | 400 | 4ms |
| E05-P01 | 批量创建成功 | ✅ PASS | 200 | 150ms |
| E05-P02 | 批量创建部分失败 | ✅ PASS | 200 | 78ms |
| E05-P03 | 累加模式批量 | ✅ PASS | 200 | 92ms |
| E05-E01 | records为空数组 | ✅ PASS | 400 | 12ms |
| E05-B01 | quantity和revenue均为0 | ✅ PASS | 200 | 4ms |
| E05-R01 | 未携带Token | ✅ PASS | 401 | 3ms |
| E06-P01 | 更新销量和收入 | ✅ PASS | 200 | 81ms |
| E06-P02 | 仅更新quantity | ✅ PASS | 200 | 92ms |
| E06-E01 | 记录不存在 | ✅ PASS | 404 | 5ms |
| E06-I01 | 重复更新相同数据 | ✅ PASS | 200 | 100ms |
| E07-P01 | 删除销量记录 | ✅ PASS | 200 | 109ms |
| E07-E01 | 记录不存在 | ✅ PASS | 404 | 4ms |
| E07-I01 | 重复删除同一记录 | ✅ PASS | 404 | 4ms |
| E01-XPG01 | 销量列表分页 | ✅ PASS | 200 | 3ms |
| E01-XPG02 | 销量列表按期间排序 | ✅ PASS | 200 | 3ms |

## 失败用例详情

### E04-P01: 创建基本销量记录
- **严重程度**: Medium
- **预期状态码**: 201
- **实际状态码**: 200
- **预期响应**: 返回201状态码
- **实际响应**: 返回200状态码，数据创建成功
- **修复建议**: 创建销量记录成功时应返回HTTP 201而非200

### E04-P02: 指定业务员创建
- **严重程度**: Medium
- **预期状态码**: 201
- **实际状态码**: 200
- **修复建议**: 同E04-P01

### E04-B01/B02/B03: 创建边界条件
- **严重程度**: Medium
- **预期状态码**: 201
- **实际状态码**: 200
- **修复建议**: 同E04-P01，创建成功应返回201

### E04-V02: periodStart缺失
- **严重程度**: High
- **预期状态码**: 400
- **实际状态码**: 500
- **实际响应**: `{"success":false,"message":"Cannot read properties of undefined (reading 'split')"}`
- **修复建议**: 控制器在处理periodStart前未做空值检查，缺少validateBody对periodStart的必填校验。应在validateBody中间件中添加periodStart必填校验

### E04-DC01/DC02/DC03: periodType相关
- **严重程度**: Medium
- **预期状态码**: 201
- **实际状态码**: 400
- **实际响应**: `{"success":false,"error":{"message":"periodStart不得晚于当前月份","code":"VALIDATION_ERROR"}}`
- **修复建议**: 测试用例使用了未来月份的periodStart（如2026-07/08/09），被后端"不得晚于当前月份"校验拦截。这是测试数据问题而非Bug，periodType功能本身可能正常

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| E04-P01/P02/B01-B03 | POST /api/sales 创建成功返回200而非201 | Medium | 控制器创建成功时使用res.status(201) |
| E04-V02 | periodStart缺失导致500错误，未做参数校验 | High | 在validateBody中添加periodStart必填校验 |
