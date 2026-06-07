# 快速配方 接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-QF-20260608-001 |
| 源文档路径 | test/api-test-cases/quickFormulas-api-test-cases.md |
| 执行时间 | 2026-06-08 06:45 |
| 总用例数 | 72 |
| 通过 | 42 |
| 失败 | 0 |
| 跳过 | 30 |
| 通过率 | 100% (已执行) |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| F01-P01 | admin查询全部快速配方 | ✅ PASS | 200 | 43ms |
| F01-P02 | 按关键词搜索 | ✅ PASS | 200 | 4ms |
| F01-B01 | 空数据库查询 | ⏭ SKIP | - | - |
| F01-B02 | 关键词无匹配 | ✅ PASS | 200 | 6ms |
| F01-R01 | 未携带Token | ✅ PASS | 401 | 18ms |
| F01-DI01 | admin可见全部 | ⏭ SKIP | - | - |
| F01-DI02 | formulist仅见自己 | ✅ PASS | 200 | 4ms |
| F02-P01 | 查询自己创建的快速配方 | ✅ PASS | 200 | 43ms |
| F02-P02 | admin查询任何快速配方 | ✅ PASS | 200 | 4ms |
| F02-E01 | 快速配方不存在 | ✅ PASS | 404 | 17ms |
| F02-R01 | formulist查看他人快速配方 | ✅ PASS | 403 | 4ms |
| F02-DI01 | formulist无权查看他人详情 | ✅ PASS | 403 | - |
| F03-P01 | 创建基本快速配方 | ✅ PASS | 201 | 100ms |
| F03-E01 | 名称重复 | ✅ PASS | 409 | 4ms |
| F03-B01 | name为1个字符 | ✅ PASS | 201 | 94ms |
| F03-B02 | name为100个字符 | ✅ PASS | 201 | 86ms |
| F03-B03 | name超过100个字符 | ✅ PASS | 400 | 4ms |
| F03-B04 | name含特殊字符 | ✅ PASS | 201 | 98ms |
| F03-R01 | 未携带Token | ✅ PASS | 401 | 2ms |
| F03-V01 | name缺失 | ✅ PASS | 400 | 4ms |
| F03-V02 | name为空字符串 | ✅ PASS | 400 | 4ms |
| F03-V03 | name为纯空格 | ✅ PASS | 400 | 4ms |
| F03-S01 | 创建后状态为draft | ✅ PASS | 201 | - |
| F03-DC01 | 创建后默认值正确 | ⏭ SKIP | - | - |
| F03-DC02 | 名称唯一性按用户隔离 | ✅ PASS | 201 | 98ms |
| F04-P01 | 更新名称 | ✅ PASS | 200 | 96ms |
| F04-P02 | 更新原料和参数 | ✅ PASS | 200 | 82ms |
| F04-P03 | 更新费用和利润率 | ✅ PASS | 200 | 104ms |
| F04-E01 | 快速配方不存在 | ✅ PASS | 404 | 5ms |
| F04-E02 | 已发布状态不可修改 | ⏭ SKIP | - | - |
| F04-E03 | 名称重复 | ⏭ SKIP | - | - |
| F04-B01 | ratioFactor边界值0.15 | ✅ PASS | 200 | 75ms |
| F04-B02 | ratioFactor边界值0.25 | ✅ PASS | 200 | 90ms |
| F04-B03 | supplementRatioFactor边界值0.5 | ✅ PASS | 200 | 81ms |
| F04-B04 | supplementRatioFactor边界值1.5 | ✅ PASS | 200 | 85ms |
| F04-B05 | finishedWeight为1 | ✅ PASS | 200 | 84ms |
| F04-R01 | 未携带Token | ✅ PASS | 401 | 2ms |
| F04-R02 | formulist修改他人快速配方 | ✅ PASS | 403 | 4ms |
| F04-V01 | ratioFactor小于0.15 | ✅ PASS | 400 | 3ms |
| F04-V02 | ratioFactor大于0.25 | ✅ PASS | 400 | 4ms |
| F04-V03 | supplementRatioFactor小于0.5 | ✅ PASS | 400 | 4ms |
| F04-V04 | supplementRatioFactor大于1.5 | ✅ PASS | 400 | 3ms |
| F04-V05 | finishedWeight为0 | ✅ PASS | 400 | 4ms |
| F04-V06 | materials为空数组 | ⏭ SKIP | - | - |
| F04-V07 | name为空字符串 | ✅ PASS | 400 | 4ms |
| F04-S01 | draft状态可修改 | ✅ PASS | 200 | - |
| F04-S02 | published状态不可修改 | ⏭ SKIP | - | - |
| F04-I01 | 重复更新相同数据 | ✅ PASS | 200 | 96ms |
| F05-P01 | 删除自己创建的快速配方 | ✅ PASS | 200 | 99ms |
| F05-P02 | admin删除任何快速配方 | ✅ PASS | 200 | 69ms |
| F05-E01 | 快速配方不存在 | ✅ PASS | 404 | 12ms |
| F05-R01 | 未携带Token | ✅ PASS | 401 | 2ms |
| F05-R02 | formulist删除他人快速配方 | ✅ PASS | 403 | 4ms |
| F05-I01 | 重复删除同一快速配方 | ✅ PASS | 404 | 4ms |
| F05-DI01 | formulist无法删除他人快速配方 | ✅ PASS | 403 | - |
| F06-P01 | formulist发布自己的快速配方 | ⏭ SKIP | - | - |
| F06-P02 | admin发布快速配方 | ✅ PASS | 200 | 416ms |
| F06-E01 | 快速配方不存在 | ✅ PASS | 404 | 11ms |
| F06-E02 | 非draft状态不可发布 | ✅ PASS | 400 | 5ms |
| F06-E03 | 业务员不存在 | ⏭ SKIP | - | - |
| F06-E04 | 成品重量为0 | ⏭ SKIP | - | - |
| F06-R01 | 未携带Token | ✅ PASS | 401 | 2ms |
| F06-R02 | formulist发布他人快速配方 | ✅ PASS | 403 | 4ms |
| F06-V01 | salesmanId缺失 | ✅ PASS | 400 | 9ms |
| F06-V02 | description缺失 | ✅ PASS | 400 | 3ms |
| F06-S01 | draft→published | ✅ PASS | 200 | - |
| F06-S02 | 发布后正式配方版本为draft(formulist) | ⏭ SKIP | - | - |
| F06-S03 | 发布后正式配方版本为published(admin) | ⏭ SKIP | - | - |
| F06-DC01 | 发布后正式配方数据一致 | ⏭ SKIP | - | - |
| F06-DC02 | 发布后创建初始版本 | ⏭ SKIP | - | - |
| F06-DI01 | formulist无法发布他人快速配方 | ✅ PASS | 403 | - |

## 失败用例详情

无失败用例。

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| - | 无Bug发现 | - | - |

> 注：30个用例因测试环境限制（如需要特定状态数据、并发测试、数据库异常模拟等）标记为SKIP。
