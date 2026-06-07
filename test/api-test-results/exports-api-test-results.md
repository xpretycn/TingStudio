# 导出中心 接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-EXP-20260608-001 |
| 源文档路径 | test/api-test-cases/exports-api-test-cases.md |
| 执行时间 | 2026-06-08 06:55 |
| 总用例数 | 152 |
| 通过 | 40 |
| 失败 | 2 |
| 跳过 | 110 |
| 通过率 | 95.2% (已执行) |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| A01-E01 | 分享ID不存在 | ✅ PASS | 404 | 48ms |
| A01-R01 | 无需认证即可访问 | ✅ PASS | 404 | 2ms |
| A02-P01 | admin获取统计 | ✅ PASS | 200 | 19ms |
| A02-R01 | 未登录访问 | ✅ PASS | 401 | 2ms |
| A02-R02 | formulist仅看自己的统计 | ✅ PASS | 200 | 13ms |
| A03-P01 | admin获取配置 | ✅ PASS | 200 | 11ms |
| A03-P02 | formulist获取配置 | ✅ PASS | 200 | 10ms |
| A03-R01 | 未登录访问 | ✅ PASS | 401 | 2ms |
| A04-P01 | admin更新配置 | ✅ PASS | 200 | 111ms |
| A04-E01 | formulist更新配置 | ✅ PASS | 200 | 13ms |
| A04-V01 | 缺少configs字段 | ✅ PASS | 400 | 4ms |
| A04-V02 | configs不是数组 | ✅ PASS | 400 | 4ms |
| A04-V03 | configKey不存在 | ✅ PASS | 200 | 12ms |
| A04-R01 | 未登录访问 | ✅ PASS | 401 | 2ms |
| A05-P01 | 获取原料列表 | ✅ PASS | 200 | 15ms |
| A05-P02 | 按关键词搜索 | ✅ PASS | 200 | 10ms |
| A05-R01 | 未登录访问 | ✅ PASS | 401 | 1ms |
| A06-P01 | 获取周报列表 | ✅ PASS | 200 | 10ms |
| A06-P02 | 按时间范围筛选 | ✅ PASS | 200 | 11ms |
| A06-V01 | 缺少type参数 | ❌ FAIL | 200 | 11ms |
| A06-R01 | 未登录访问 | ✅ PASS | 401 | 2ms |
| A07-P01 | 获取全部模板 | ✅ PASS | 200 | 10ms |
| A07-P02 | 按type筛选 | ✅ PASS | 200 | 12ms |
| A07-P03 | 按category筛选 | ✅ PASS | 200 | 13ms |
| A07-R01 | 未登录访问 | ✅ PASS | 401 | 1ms |
| A08-P01 | 创建标准模板 | ✅ PASS | 201 | 180ms |
| A08-P02 | 创建默认模板 | ✅ PASS | 201 | 188ms |
| A08-E01 | 缺少name | ✅ PASS | 400 | 4ms |
| A08-E02 | 缺少type | ✅ PASS | 400 | 3ms |
| A08-E03 | 缺少formatConfig | ✅ PASS | 400 | 3ms |
| A08-R01 | 未登录访问 | ✅ PASS | 401 | 1ms |
| A11-P01 | 导出单个配方Excel | ✅ PASS | 201 | 293ms |
| A11-P02 | 导出单个配方PDF | ✅ PASS | 201 | 455ms |
| A11-E01 | 缺少dataCategory | ✅ PASS | 400 | 4ms |
| A11-E02 | 缺少exportType | ✅ PASS | 400 | 3ms |
| A11-E03 | 不支持的exportType(csv) | ✅ PASS | 201 | 15ms |
| A11-E04 | 配方ID不存在 | ❌ FAIL | 500 | 3ms |
| A11-E05 | 未指定配方ID(空数组) | ✅ PASS | 201 | 330ms |
| A11-R01 | 未登录访问 | ✅ PASS | 401 | 1ms |
| A12-P01 | 获取全部任务 | ✅ PASS | 200 | 35ms |
| A12-P02 | 按状态筛选 | ✅ PASS | 200 | 15ms |
| A12-P03 | 按数据类别筛选 | ✅ PASS | 200 | 15ms |
| A12-R01 | 未登录访问 | ✅ PASS | 401 | 1ms |
| A12-DI01 | formulist仅见自己的任务 | ✅ PASS | 200 | 12ms |
| A17-P01 | admin获取全部分享 | ✅ PASS | 200 | 15ms |
| A17-R01 | 未登录访问 | ✅ PASS | 401 | 1ms |
| A17-DI01 | formulist仅见自己的分享 | ✅ PASS | 200 | 13ms |
| A18-P01 | 创建链接分享 | ✅ PASS | 201 | 143ms |
| A18-P02 | 创建带密码分享 | ✅ PASS | 201 | 169ms |
| A18-R01 | 未登录访问 | ✅ PASS | 401 | 1ms |

## 失败用例详情

### A06-V01: 缺少type参数
- **严重程度**: Medium
- **预期状态码**: 500
- **实际状态码**: 200
- **预期响应**: service层SQL缺少type条件导致异常
- **实际响应**: 返回200成功，空列表
- **修复建议**: 测试用例预期缺少type参数时返回500，但实际接口做了容错处理返回空列表。建议在service层对缺少type参数时返回400校验错误，而非静默返回空数据

### A11-E04: 配方ID不存在
- **严重程度**: High
- **预期状态码**: 201（status=failed）
- **实际状态码**: 500
- **实际响应**: 服务器内部错误
- **修复建议**: 导出任务创建时，如果配方ID不存在，应创建一个status=failed的任务记录并返回201，而非抛出500错误。检查exportService中对不存在配方的异常处理逻辑

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| A06-V01 | 缺少type参数时未返回错误，静默返回空列表 | Medium | 在service层或validateBody中添加type参数必填校验 |
| A11-E04 | 配方ID不存在时导出任务创建返回500 | High | 在exportService中捕获配方不存在异常，创建failed状态任务并返回201 |
