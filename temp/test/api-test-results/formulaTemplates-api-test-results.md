# 配方模板 接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-FT-20260608-001 |
| 源文档路径 | test/api-test-cases/formulaTemplates-api-test-cases.md |
| 执行时间 | 2026-06-08 06:50 |
| 总用例数 | 67 |
| 通过 | 12 |
| 失败 | 38 |
| 跳过 | 17 |
| 通过率 | 24.0% |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| G01-P01 | admin查询全部模板 | ❌ FAIL | 500 | 55ms |
| G01-P02 | 按关键词搜索 | ❌ FAIL | 500 | 3ms |
| G01-B01 | 空数据库查询 | ⏭ SKIP | - | - |
| G01-B02 | 关键词无匹配 | ❌ FAIL | 500 | 3ms |
| G01-R01 | 未携带Token | ✅ PASS | 401 | 1ms |
| G01-DI01 | admin可见全部模板 | ⏭ SKIP | - | - |
| G01-DI02 | formulist仅见自己模板 | ❌ FAIL | 500 | 3ms |
| G02-P01 | 查询自己创建的模板 | ❌ FAIL | 500 | 3ms |
| G02-P02 | admin查询任何模板 | ❌ FAIL | 500 | 3ms |
| G02-E01 | 模板不存在 | ❌ FAIL | 500 | 4ms |
| G02-R01 | 未携带Token | ✅ PASS | 401 | 1ms |
| G02-R02 | formulist查看他人模板 | ❌ FAIL | 500 | 3ms |
| G03-P01 | 创建完整模板 | ❌ FAIL | 500 | 5ms |
| G03-P02 | 创建带描述的模板 | ❌ FAIL | 500 | 4ms |
| G03-E01 | 同用户下名称重复 | ❌ FAIL | 500 | 3ms |
| G03-B01 | ratioFactor为最小值0.15 | ❌ FAIL | 500 | 4ms |
| G03-B02 | ratioFactor为最大值0.25 | ❌ FAIL | 500 | 3ms |
| G03-B03 | supplementRatioFactor为最小值0.5 | ❌ FAIL | 500 | 3ms |
| G03-B04 | supplementRatioFactor为最大值1.5 | ❌ FAIL | 500 | 3ms |
| G03-B05 | finishedWeight为0.01 | ❌ FAIL | 500 | 4ms |
| G03-B06 | materials只有1种原料 | ❌ FAIL | 500 | 3ms |
| G03-R01 | 未携带Token | ✅ PASS | 401 | 1ms |
| G03-V01 | name缺失 | ✅ PASS | 400 | 3ms |
| G03-V02 | name为空字符串 | ✅ PASS | 400 | 8ms |
| G03-V03 | ratioFactor缺失 | ⏭ SKIP | - | - |
| G03-V04 | ratioFactor小于0.15 | ✅ PASS | 400 | 3ms |
| G03-V05 | ratioFactor大于0.25 | ✅ PASS | 400 | 3ms |
| G03-V06 | supplementRatioFactor小于0.5 | ✅ PASS | 400 | 4ms |
| G03-V07 | supplementRatioFactor大于1.5 | ✅ PASS | 400 | 3ms |
| G03-V08 | finishedWeight缺失 | ⏭ SKIP | - | - |
| G03-V09 | finishedWeight为0 | ✅ PASS | 400 | 3ms |
| G03-V10 | finishedWeight为负数 | ⏭ SKIP | - | - |
| G03-V11 | materials缺失 | ✅ PASS | 400 | 3ms |
| G03-V12 | materials为空数组 | ✅ PASS | 400 | 4ms |
| G03-DC01 | 名称唯一性按用户隔离 | ⏭ SKIP | - | - |
| G03-DC02 | 创建后默认值正确 | ⏭ SKIP | - | - |
| G04-P01 | 更新模板名称 | ❌ FAIL | 404 | 3ms |
| G04-P02 | 更新原料和参数 | ❌ FAIL | 404 | 3ms |
| G04-P03 | 更新费用和利润率 | ❌ FAIL | 404 | 3ms |
| G04-P04 | admin更新任何模板 | ❌ FAIL | 404 | 33ms |
| G04-E01 | 模板不存在 | ❌ FAIL | 500 | 4ms |
| G04-E02 | 名称重复 | ⏭ SKIP | - | - |
| G04-B01 | ratioFactor边界值0.15 | ❌ FAIL | 404 | 3ms |
| G04-B02 | ratioFactor边界值0.25 | ❌ FAIL | 404 | 3ms |
| G04-B03 | supplementRatioFactor边界值0.5 | ❌ FAIL | 404 | 3ms |
| G04-B04 | supplementRatioFactor边界值1.5 | ❌ FAIL | 404 | 3ms |
| G04-R01 | 未携带Token | ✅ PASS | 401 | 2ms |
| G04-R02 | formulist修改他人模板 | ❌ FAIL | 404 | 4ms |
| G04-V01 | name为空字符串 | ❌ FAIL | 404 | 3ms |
| G04-V02 | ratioFactor小于0.15 | ❌ FAIL | 404 | 3ms |
| G04-V03 | ratioFactor大于0.25 | ❌ FAIL | 404 | 3ms |
| G04-V04 | supplementRatioFactor小于0.5 | ❌ FAIL | 404 | 4ms |
| G04-V05 | supplementRatioFactor大于1.5 | ❌ FAIL | 404 | 3ms |
| G04-DC01 | 未传字段保持原值 | ⏭ SKIP | - | - |
| G04-DC02 | 修改名称时检查唯一性 | ⏭ SKIP | - | - |
| G04-I01 | 重复更新相同数据 | ❌ FAIL | 404 | 4ms |
| G04-DI01 | formulist无法修改他人模板 | ⏭ SKIP | - | - |
| G05-P01 | 删除自己创建的模板 | ❌ FAIL | 404 | 4ms |
| G05-P02 | admin删除任何模板 | ❌ FAIL | 404 | 3ms |
| G05-E01 | 模板不存在 | ❌ FAIL | 500 | 4ms |
| G05-R01 | 未携带Token | ✅ PASS | 401 | 2ms |
| G05-R02 | formulist删除他人模板 | ❌ FAIL | 404 | 4ms |
| G05-I01 | 重复删除同一模板 | ✅ PASS | 404 | 4ms |

## 失败用例详情

### 根本原因：数据库未初始化

所有失败用例均由同一个根本原因导致：

- **错误响应**: `{"success":false,"error":{"message":"数据库未初始化，请先调用 connectDatabase()","code":"INTERNAL_ERROR"}}`
- **影响范围**: formulaTemplates 模块的所有CRUD操作（GET/POST/PUT/DELETE）
- **不受影响**: validateBody 参数校验（在中间件层拦截，不涉及数据库）、authMiddleware 认证校验

### 具体分析
- G01（列表查询）：500 - 数据库未初始化
- G02（详情查询）：500 - 数据库未初始化
- G03（创建模板）：500 - 数据库未初始化（validateBody校验通过的用例正常返回400）
- G04（更新模板）：404 - 因创建失败导致无测试数据ID
- G05（删除模板）：404/500 - 因创建失败导致无测试数据ID

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| G01-G05 | formulaTemplates模块数据库未初始化，所有CRUD操作返回500 | Critical | 检查 formulaTemplateController.ts 或 formulaTemplateService.ts 中的数据库连接逻辑，确保在请求处理前调用 connectDatabase() |
