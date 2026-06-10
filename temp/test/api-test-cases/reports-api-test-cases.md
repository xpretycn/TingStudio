# 报表 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-RPT-20260607-001 |
| 路由文件 | backend/src/routes/reports.ts |
| 控制器文件 | backend/src/controllers/reportController.ts |
| 服务文件 | backend/src/services/reportGenerator.ts |
| 端点数 | 14 |
| 测试用例数 | 146 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| D01 | POST | /api/reports/check-period | 是 | 检查报告周期是否已存在 |
| D02 | GET | /api/reports/data/weekly | 是 | 获取周报聚合数据 |
| D03 | GET | /api/reports/data/monthly | 是 | 获取月报聚合数据 |
| D04 | GET | /api/reports/targets | 是 | 获取目标列表 |
| D05 | POST | /api/reports/targets | 是 | 创建目标 |
| D06 | PUT | /api/reports/targets/:id | 是 | 更新目标 |
| D07 | DELETE | /api/reports/targets/:id | 是 | 删除目标 |
| D08 | POST | /api/reports/compare | 是 | 对比两个报告 |
| D09 | POST | /api/reports/ai-analysis | 是 | 获取AI分析 |
| D10 | PUT | /api/reports/:id/ai-analysis | 是 | 保存AI分析 |
| D11 | POST | /api/reports/generate | 是 | 生成报告 |
| D12 | GET | /api/reports | 是 | 获取报告列表 |
| D13 | GET | /api/reports/:id | 是 | 获取报告详情 |
| D14 | GET | /api/reports/:id/export/pdf | 是 | 导出PDF |
| D15 | GET | /api/reports/:id/export/excel | 是 | 导出Excel |
| D16 | POST | /api/reports/batch-export/excel | 是 | 批量导出Excel |
| D17 | PUT | /api/reports/:id | 是 | 更新报告 |
| D18 | DELETE | /api/reports/:id | 是 | 删除报告 |
| D19 | POST | /api/reports/:id/publish | 是 | 发布报告 |

> 注：路由文件实际定义了19个端点（含check-period），超出任务描述的14个。此处按实际代码列出全部端点。

## 二、测试用例

### D01 POST /api/reports/check-period — 检查报告周期是否已存在

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D01-P01 | 正向流程 | 检查不存在的周期 | 用户已登录，该周期无报告 | POST, `{type:"weekly",periodStart:"2026-06-02"}` | 200, `{success:true, data:{exists:false,existingReport:null}}` |
| D01-P02 | 正向流程 | 检查已存在的周期 | 用户已登录，该周期已有报告 | POST, `{type:"weekly",periodStart:"2026-06-02"}` | 200, `{data:{exists:true,existingReport:{id,title,status,createdAt}}}` |
| D01-E01 | 异常流程 | 缺少type | 用户已登录 | POST, `{periodStart:"2026-06-02"}` | 400, `{success:false, code:"INVALID_PARAMS", message:"缺少必要参数: type, periodStart"}` |
| D01-E02 | 异常流程 | 缺少periodStart | 用户已登录 | POST, `{type:"weekly"}` | 400 |
| D01-E03 | 异常流程 | type为非法值 | 用户已登录 | POST, `{type:"daily",periodStart:"2026-06-02"}` | 400, `{message:"type 必须是 weekly 或 monthly"}` |
| D01-V01 | 参数校验 | periodStart格式不合法 | 用户已登录 | POST, `{type:"weekly",periodStart:"invalid-date"}` | 500 或返回exists:false |
| D01-R01 | 权限认证 | 未登录访问 | 无Token | POST, `{type:"weekly",periodStart:"2026-06-02"}` | 401 |
| D01-DI01 | 数据隔离 | 不同用户的同周期独立检查 | 用户A已有该周期报告，用户B没有 | 分别以A和B请求 | A返回exists:true，B返回exists:false |

### D02 GET /api/reports/data/weekly — 获取周报聚合数据

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D02-P01 | 正向流程 | 获取周报数据 | 存在配方和销售数据 | GET /api/reports/data/weekly?periodStart=2026-06-01&periodEnd=2026-06-07 | 200, `{success:true, data:{formula:{newFormulaCount,completedFormulaCount,...},sales:{weeklyQuantity,...},plans:{...}}}` |
| D02-E01 | 异常流程 | 缺少时间范围参数 | 用户已登录 | GET /api/reports/data/weekly | 400, `{message:"缺少时间范围参数"}` |
| D02-E02 | 异常流程 | 缺少periodStart | 用户已登录 | GET /api/reports/data/weekly?periodEnd=2026-06-07 | 400 |
| D02-B01 | 边界条件 | 无数据的时间范围 | 该时间段无配方和销售 | GET /api/reports/data/weekly?periodStart=2020-01-01&periodEnd=2020-01-07 | 200, 各计数值为0 |
| D02-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/reports/data/weekly?periodStart=...&periodEnd=... | 401 |
| D02-V01 | 参数校验 | 日期格式不合法 | 用户已登录 | GET /api/reports/data/weekly?periodStart=abc&periodEnd=def | 500（SQL查询异常） |

### D03 GET /api/reports/data/monthly — 获取月报聚合数据

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D03-P01 | 正向流程 | 获取月报数据 | 存在数据 | GET /api/reports/data/monthly?periodStart=2026-05-01&periodEnd=2026-05-31 | 200, `{data:{formula:{...},sales:{...},monthlySummary:{...},trend:{...},targets:{...},team:{...},issues:{...}}}` |
| D03-E01 | 异常流程 | 缺少时间范围参数 | 用户已登录 | GET /api/reports/data/monthly | 400 |
| D03-B01 | 边界条件 | 无数据的时间范围 | 无 | GET /api/reports/data/monthly?periodStart=2020-01-01&periodEnd=2020-01-31 | 200, 各计数值为0 |
| D03-R01 | 权限认证 | 未登录访问 | 无Token | GET | 401 |
| D03-DC01 | 数据一致性 | 月报数据包含额外字段 | 存在数据 | GET | data 包含 monthlySummary、trend、targets、team、issues（周报不含） |

### D04 GET /api/reports/targets — 获取目标列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D04-P01 | 正向流程 | 获取全部目标 | 存在目标数据 | GET /api/reports/targets | 200, `{success:true, data:[{id,periodType,periodStart,periodEnd,targetsJson,createdBy,createdAt}]}` |
| D04-P02 | 正向流程 | 按周期类型筛选 | 存在quarterly和yearly类型 | GET /api/reports/targets?periodType=quarterly | 200, 仅返回quarterly类型 |
| D04-B01 | 边界条件 | 无目标数据 | report_targets表为空 | GET /api/reports/targets | 200, `{data:[]}` |
| D04-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/reports/targets | 401 |

### D05 POST /api/reports/targets — 创建目标

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D05-P01 | 正向流程 | 创建季度目标 | 用户已登录 | POST, `{periodType:"quarterly",periodStart:"2026-04-01",periodEnd:"2026-06-30",targetsJson:{targets:[{metric:"配方完成",target:50}]}}` | 201, `{success:true, data:{id,periodType,...,targetsJson}}` |
| D05-P02 | 正向流程 | 创建年度目标 | 用户已登录 | POST, `{periodType:"yearly",periodStart:"2026-01-01",periodEnd:"2026-12-31",targetsJson:{}}` | 201 |
| D05-E01 | 异常流程 | 缺少periodType | 用户已登录 | POST, `{periodStart:"2026-04-01",periodEnd:"2026-06-30"}` | 400, `{error:{code:"VALIDATION_ERROR"}}` |
| D05-E02 | 异常流程 | 缺少periodStart | 用户已登录 | POST, `{periodType:"quarterly",periodEnd:"2026-06-30"}` | 400 |
| D05-E03 | 异常流程 | 缺少periodEnd | 用户已登录 | POST, `{periodType:"quarterly",periodStart:"2026-04-01"}` | 400 |
| D05-V01 | 参数校验 | periodType为非法值 | 用户已登录 | POST, `{periodType:"weekly",periodStart:"2026-04-01",periodEnd:"2026-06-30"}` | 201（数据库CHECK约束可能拒绝） |
| D05-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| D05-DC01 | 数据一致性 | 创建后数据库记录正确 | 用户已登录 | POST 创建目标 | report_targets 表存在对应记录 |
| D05-I01 | 幂等性 | 创建相同周期的多个目标 | 用户已登录 | 连续2次 POST 相同周期 | 两次均201，生成不同ID |

### D06 PUT /api/reports/targets/:id — 更新目标

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D06-P01 | 正向流程 | 更新目标内容 | 存在目标 id=t001 | PUT, `{targetsJson:{targets:[{metric:"配方完成",target:100}]}}` | 200, `{success:true, data:{id,...,targetsJson}}` |
| D06-P02 | 正向流程 | 更新周期类型 | 存在目标 | PUT, `{periodType:"yearly"}` | 200 |
| D06-E01 | 异常流程 | 目标不存在 | 无 | PUT /api/reports/targets/nonexist, `{targetsJson:{}}` | 404, `{message:"目标不存在"}` |
| D06-E02 | 异常流程 | 无更新字段 | 存在目标 | PUT, `{}` | 400, `{message:"没有需要更新的字段"}` |
| D06-R01 | 权限认证 | 未登录访问 | 无Token | PUT | 401 |
| D06-DC01 | 数据一致性 | 更新后数据库值正确 | 存在目标 | PUT, `{targetsJson:{targets:[...]}}` | 数据库中 targets_json 被更新 |
| D06-I01 | 幂等性 | 重复更新相同内容 | 存在目标 | 连续2次 PUT 相同内容 | 两次均200，数据一致 |

### D07 DELETE /api/reports/targets/:id — 删除目标

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D07-P01 | 正向流程 | 删除存在的目标 | 存在目标 id=t001 | DELETE /api/reports/targets/t001 | 200, `{success:true, data:{id:"t001"}, message:"删除成功"}` |
| D07-E01 | 异常流程 | 目标不存在 | 无 | DELETE /api/reports/targets/nonexist | 404, `{message:"目标不存在"}` |
| D07-R01 | 权限认证 | 未登录访问 | 无Token | DELETE | 401 |
| D07-DC01 | 数据一致性 | 删除后数据库记录消失 | 存在目标 | DELETE | report_targets 表中无该记录 |
| D07-I01 | 幂等性 | 重复删除同一目标 | 存在目标 | 连续2次 DELETE | 第一次200，第二次404 |

### D08 POST /api/reports/compare — 对比两个报告

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D08-P01 | 正向流程 | 对比两个周报 | 存在两个周报 | POST, `{reportId1:"r001",reportId2:"r002"}` | 200, `{success:true, data:{report1:{...},report2:{...},diff:{formula:{...},sales:{...}}}}` |
| D08-P02 | 正向流程 | 对比两个月报 | 存在两个月报 | POST, `{reportId1:"r003",reportId2:"r004"}` | 200, diff 包含 monthlySummary |
| D08-E01 | 异常流程 | 缺少reportId1 | 用户已登录 | POST, `{reportId2:"r002"}` | 400, `{message:"请提供两个报告ID"}` |
| D08-E02 | 异常流程 | 缺少reportId2 | 用户已登录 | POST, `{reportId1:"r001"}` | 400 |
| D08-E03 | 异常流程 | 报告不存在 | reportId1不存在 | POST, `{reportId1:"nonexist",reportId2:"r002"}` | 404, `{message:"报告不存在"}` |
| D08-B01 | 边界条件 | 对比相同报告 | 存在报告r001 | POST, `{reportId1:"r001",reportId2:"r001"}` | 200, diff 中各字段差值为0 |
| D08-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| D08-DC01 | 数据一致性 | 差值计算正确 | 两个报告数据已知 | POST compare | diff.formula.newFormulaCount.diff = report2 - report1 |

### D09 POST /api/reports/ai-analysis — 获取AI分析

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D09-P01 | 正向流程 | 获取AI分析 | AI服务可用 | POST, `{reportData:{type:"weekly",periodStart:"2026-06-01",periodEnd:"2026-06-07",dataJson:{formula:{newFormulaCount:5},sales:{weeklyQuantity:100}}}}` | 200, `{success:true, data:{analysis,model,usage,provider}}` |
| D09-P02 | 正向流程 | 指定AI provider | AI服务可用 | POST, `{reportData:{...},provider:"zhipu"}` | 200, data.provider="zhipu" |
| D09-E01 | 异常流程 | 缺少reportData | 用户已登录 | POST, `{}` | 400, `{message:"请提供报告数据"}` |
| D09-E02 | 异常流程 | AI服务不可用 | 无AI API Key配置 | POST, `{reportData:{...}}` | 503, `{message:"未配置AI模型，请在环境变量中设置API Key"}` |
| D09-E03 | 异常流程 | AI调用失败 | AI服务异常 | POST, `{reportData:{...}}` | 500, `{message:"AI分析失败"}` |
| D09-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| D09-V01 | 参数校验 | reportData为空对象 | 用户已登录 | POST, `{reportData:{}}` | 200 或 500（AI无法分析空数据） |

### D10 PUT /api/reports/:id/ai-analysis — 保存AI分析

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D10-P01 | 正向流程 | 保存AI分析到报告 | 存在报告，admin用户 | PUT, `{aiAnalysis:"AI分析结果文本..."}` | 200, `{success:true, data:{...dataJson:{...,aiAnalysis:"AI分析结果文本..."}}}` |
| D10-E01 | 异常流程 | 缺少aiAnalysis | 存在报告 | PUT, `{}` | 400, `{message:"请提供AI分析数据"}` |
| D10-E02 | 异常流程 | 报告不存在 | 无 | PUT, `{aiAnalysis:"..."}` | 404 |
| D10-E03 | 异常流程 | formulist编辑他人报告 | formulist用户，报告非自己创建 | PUT, `{aiAnalysis:"..."}` | 403, `{message:"无权编辑此报告"}` |
| D10-R01 | 权限认证 | 未登录访问 | 无Token | PUT | 401 |
| D10-DC01 | 数据一致性 | AI分析保存到dataJson | 存在报告 | PUT | data_json 中包含 aiAnalysis 字段 |
| D10-DI01 | 数据隔离 | formulist只能编辑自己的报告 | formulist用户A，报告由用户B创建 | PUT | 403 |

### D11 POST /api/reports/generate — 生成报告

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D11-P01 | 正向流程 | 生成周报 | 用户已登录，该周期无报告 | POST, `{type:"weekly",periodStart:"2026-06-02",periodEnd:"2026-06-08"}` | 201, `{success:true, data:{id,type,title,status:"draft",dataJson:{...}}, message:"报告生成成功"}` |
| D11-P02 | 正向流程 | 生成月报 | 用户已登录 | POST, `{type:"monthly",periodStart:"2026-05-01",periodEnd:"2026-05-31"}` | 201 |
| D11-P03 | 正向流程 | 周报标题格式正确 | 用户已登录 | POST 生成周报 | title 包含 "第N周工作报告" |
| D11-P04 | 正向流程 | 月报标题格式正确 | 用户已登录 | POST 生成月报 | title 包含 "年X月工作报告" |
| D11-E01 | 异常流程 | 缺少type | 用户已登录 | POST, `{periodStart:"2026-06-02",periodEnd:"2026-06-08"}` | 400, `{message:"缺少必要参数: type, periodStart, periodEnd"}` |
| D11-E02 | 异常流程 | 缺少periodStart | 用户已登录 | POST, `{type:"weekly",periodEnd:"2026-06-08"}` | 400 |
| D11-E03 | 异常流程 | 缺少periodEnd | 用户已登录 | POST, `{type:"weekly",periodStart:"2026-06-02"}` | 400 |
| D11-E04 | 异常流程 | type为非法值 | 用户已登录 | POST, `{type:"daily",periodStart:"2026-06-02",periodEnd:"2026-06-08"}` | 400, `{message:"type 必须是 weekly 或 monthly"}` |
| D11-E05 | 异常流程 | 同周期重复生成 | 用户已登录，该周期已有报告 | POST, `{type:"weekly",periodStart:"2026-06-02",periodEnd:"2026-06-08"}` | 409, `{success:false, code:"PERIOD_EXISTS", message:"该周期的周报已存在，请勿重复生成"}` |
| D11-V01 | 参数校验 | periodStart格式不合法 | 用户已登录 | POST, `{type:"weekly",periodStart:"abc",periodEnd:"2026-06-08"}` | 500（SQL查询异常） |
| D11-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| D11-DC01 | 数据一致性 | 生成后数据库记录正确 | 用户已登录 | POST 生成 | reports 表存在记录，status='draft'，generated_by='manual' |
| D11-S01 | 状态流转 | 新生成报告状态为draft | 用户已登录 | POST 生成 | status='draft' |
| D11-DI01 | 数据隔离 | 不同用户可生成同周期报告 | 用户A和B分别生成同周期周报 | 分别POST | 两人均201，各自独立 |

### D12 GET /api/reports — 获取报告列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D12-P01 | 正向流程 | 获取全部报告 | 存在报告数据 | GET /api/reports | 200, 分页响应 `{list:[{id,type,title,periodStart,periodEnd,status,dataJson,createdBy,creatorName}],pagination}` |
| D12-P02 | 正向流程 | 按类型筛选 | 存在weekly和monthly报告 | GET /api/reports?type=weekly | 200, 仅返回周报 |
| D12-P03 | 正向流程 | 按状态筛选 | 存在draft和published报告 | GET /api/reports?status=published | 200, 仅返回已发布报告 |
| D12-P04 | 正向流程 | 按日期范围筛选 | 存在不同日期报告 | GET /api/reports?startDate=2026-01-01&endDate=2026-06-30 | 200 |
| D12-P05 | 正向流程 | 按生成人筛选 | 存在不同用户生成的报告 | GET /api/reports?generatedBy=manual | 200 |
| D12-B01 | 边界条件 | 无报告数据 | reports表为空 | GET /api/reports | 200, `{list:[], pagination:{total:0}}` |
| D12-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/reports | 401 |
| D12-DI01 | 数据隔离 | formulist仅见自己的和已发布的 | formulist用户A，用户B有draft报告 | GET /api/reports | list 不包含用户B的draft报告 |
| D12-DI02 | 数据隔离 | admin可见全部报告 | admin用户 | GET /api/reports | list 包含所有用户的报告 |

### D13 GET /api/reports/:id — 获取报告详情

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D13-P01 | 正向流程 | 获取存在的报告 | 存在报告 id=r001 | GET /api/reports/r001 | 200, `{success:true, data:{id,type,title,periodStart,periodEnd,status,dataJson,createdBy,creatorName}}` |
| D13-E01 | 异常流程 | 报告不存在 | 无 | GET /api/reports/nonexist | 404, `{message:"报告不存在"}` |
| D13-E02 | 异常流程 | formulist查看他人draft报告 | formulist用户A，报告由用户B创建且status=draft | GET /api/reports/r002 | 403, `{message:"无权查看此报告"}` |
| D13-P02 | 正向流程 | formulist查看已发布报告 | formulist用户A，报告由用户B创建且status=published | GET /api/reports/r003 | 200 |
| D13-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/reports/r001 | 401 |
| D13-DI01 | 数据隔离 | formulist可见自己的draft | formulist用户A，自己的报告 | GET | 200 |
| D13-DI02 | 数据隔离 | formulist不可见他人draft | formulist用户A，他人draft | GET | 403 |

### D14 GET /api/reports/:id/export/pdf — 导出PDF

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D14-P01 | 正向流程 | 导出PDF | 存在报告 | GET /api/reports/r001/export/pdf | 200, Content-Type: application/pdf, Content-Disposition: attachment, 返回PDF二进制数据 |
| D14-E01 | 异常流程 | 报告不存在 | 无 | GET /api/reports/nonexist/export/pdf | 404, `{message:"报告不存在"}` |
| D14-E02 | 异常流程 | PDF生成失败 | 报告数据异常 | GET /api/reports/r002/export/pdf | 500, `{message:"导出PDF失败"}` |
| D14-R01 | 权限认证 | 未登录访问 | 无Token | GET | 401 |
| D14-X-CT01 | Content-Type | PDF响应Content-Type正确 | 存在报告 | GET export/pdf | Content-Type: application/pdf |
| D14-X-RF01 | 响应格式 | 响应包含Content-Disposition | 存在报告 | GET export/pdf | Content-Disposition: attachment; filename=... |
| D14-X-LB01 | 大小限制 | 大报告导出PDF | 存在大数据量报告 | GET export/pdf | 正常返回或超时 |

### D15 GET /api/reports/:id/export/excel — 导出Excel

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D15-P01 | 正向流程 | 导出Excel | 存在报告 | GET /api/reports/r001/export/excel | 200, Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| D15-E01 | 异常流程 | 报告不存在 | 无 | GET /api/reports/nonexist/export/excel | 404 |
| D15-E02 | 异常流程 | Excel生成失败 | 报告数据异常 | GET export/excel | 500 |
| D15-R01 | 权限认证 | 未登录访问 | 无Token | GET | 401 |
| D15-X-CT01 | Content-Type | Excel响应Content-Type正确 | 存在报告 | GET export/excel | Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |

### D16 POST /api/reports/batch-export/excel — 批量导出Excel

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D16-P01 | 正向流程 | 批量导出多个报告 | admin用户，存在多个报告 | POST, `{reportIds:["r001","r002","r003"]}` | 200, Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, 返回合并Excel |
| D16-P02 | 正向流程 | 批量导出单个报告 | admin用户 | POST, `{reportIds:["r001"]}` | 200, 返回单个报告Excel |
| D16-E01 | 异常流程 | reportIds为空数组 | 用户已登录 | POST, `{reportIds:[]}` | 400, `{code:"INVALID_PARAMS", message:"reportIds 参数不能为空"}` |
| D16-E02 | 异常流程 | reportIds超过20个 | 用户已登录 | POST, `{reportIds:[...21个ID]}` | 400, `{message:"最多支持20个报告批量导出"}` |
| D16-E03 | 异常流程 | reportIds不是数组 | 用户已登录 | POST, `{reportIds:"r001"}` | 400 |
| D16-E04 | 异常流程 | 缺少reportIds | 用户已登录 | POST, `{}` | 400 |
| D16-E05 | 异常流程 | 无可导出的报告 | reportIds中的报告不存在 | POST, `{reportIds:["nonexist"]}` | 404, `{message:"没有找到可导出的报告"}` |
| D16-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| D16-DI01 | 数据隔离 | formulist仅可导出自己的和已发布的 | formulist用户A | POST, `{reportIds:["r001(自己的)","r002(他人draft)","r003(他人published)"]}` | 仅导出r001和r003 |
| D16-X-BT01 | 批量操作 | 批量导出20个报告 | admin用户 | POST, reportIds含20个ID | 200, 正常导出 |
| D16-X-BT02 | 批量操作 | 批量导出21个报告 | admin用户 | POST, reportIds含21个ID | 400 |

### D17 PUT /api/reports/:id — 更新报告

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D17-P01 | 正向流程 | 更新报告标题 | 存在报告 | PUT, `{title:"更新后的标题"}` | 200, `{success:true, data:{...title:"更新后的标题"}}` |
| D17-P02 | 正向流程 | 更新报告数据 | 存在报告 | PUT, `{dataJson:{formula:{newFormulaCount:10}}}` | 200 |
| D17-P03 | 正向流程 | 更新报告状态 | 存在报告 | PUT, `{status:"archived"}` | 200 |
| D17-P04 | 正向流程 | formulist仅可更新plans | formulist用户，自己的报告 | PUT, `{dataJson:{plans:{nextWeekPlans:["计划1"]}}}` | 200, 仅plans字段被更新 |
| D17-E01 | 异常流程 | 报告不存在 | 无 | PUT, `{title:"测试"}` | 404 |
| D17-E02 | 异常流程 | formulist编辑他人报告 | formulist用户，他人报告 | PUT, `{title:"测试"}` | 403 |
| D17-E03 | 异常流程 | 无更新字段 | 存在报告 | PUT, `{}` | 400, `{message:"没有需要更新的字段"}` |
| D17-E04 | 异常流程 | formulist修改非plans字段被忽略 | formulist用户，自己的报告 | PUT, `{dataJson:{formula:{newFormulaCount:999}}}` | 200, formula字段被过滤，仅保留plans |
| D17-R01 | 权限认证 | 未登录访问 | 无Token | PUT | 401 |
| D17-DC01 | 数据一致性 | 更新后数据库值正确 | 存在报告 | PUT, `{title:"新标题"}` | 数据库中 title 被更新 |
| D17-DI01 | 数据隔离 | formulist只能编辑自己的报告 | formulist用户A，用户B的报告 | PUT | 403 |

### D18 DELETE /api/reports/:id — 删除报告

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D18-P01 | 正向流程 | admin删除任意报告 | admin用户 | DELETE /api/reports/r001 | 200, `{success:true, data:{id:"r001"}, message:"删除成功"}` |
| D18-P02 | 正向流程 | 创建者删除自己的报告 | formulist用户，自己的报告 | DELETE | 200 |
| D18-E01 | 异常流程 | 报告不存在 | 无 | DELETE /api/reports/nonexist | 404 |
| D18-E02 | 异常流程 | formulist删除他人报告 | formulist用户A，用户B的报告 | DELETE | 403, `{message:"仅管理员或报告创建者可删除报告"}` |
| D18-R01 | 权限认证 | 未登录访问 | 无Token | DELETE | 401 |
| D18-DC01 | 数据一致性 | 删除后数据库记录消失 | admin用户 | DELETE | reports 表中无该记录 |
| D18-I01 | 幂等性 | 重复删除同一报告 | admin用户 | 连续2次 DELETE | 第一次200，第二次404 |
| D18-DI01 | 数据隔离 | admin可删除任意报告 | admin用户，他人报告 | DELETE | 200 |
| D18-DI02 | 数据隔离 | formulist只能删除自己的 | formulist用户A，用户B的报告 | DELETE | 403 |

### D19 POST /api/reports/:id/publish — 发布报告

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| D19-P01 | 正向流程 | admin发布报告 | admin用户，存在draft报告 | POST /api/reports/r001/publish | 200, `{success:true, data:{...status:"published"}, message:"报告已发布"}` |
| D19-E01 | 异常流程 | 报告不存在 | 无 | POST /api/reports/nonexist/publish | 404 |
| D19-E02 | 异常流程 | formulist无权发布 | formulist用户 | POST /api/reports/r001/publish | 403, `{message:"仅管理员可发布报告"}` |
| D19-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| D19-DC01 | 数据一致性 | 发布后status变为published | admin用户 | POST publish | status='published', published_at 有值 |
| D19-S01 | 状态流转 | draft→published | 存在draft报告 | POST publish | status 从 'draft' 变为 'published' |
| D19-I01 | 幂等性 | 重复发布已发布报告 | admin用户 | 连续2次 POST publish | 两次均200，status 保持 'published' |

## 三、特殊场景测试

### X-AS 异步任务

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-AS-01 | 异步任务 | 定时自动生成周报 | cron配置每周一9:00 | 等待定时触发 | 自动生成周报，generated_by='auto' |
| X-AS-02 | 异步任务 | 定时自动生成月报 | cron配置每月1日9:00 | 等待定时触发 | 自动生成月报 |
| X-AS-03 | 异步任务 | 自动生成不覆盖已有报告 | 同周期已有手动生成的报告 | 定时触发 | 跳过生成，日志提示"已存在" |

### X-BT 批量操作

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-BT-01 | 批量操作 | 批量导出Excel上限20个 | admin用户 | POST, reportIds含20个ID | 200 |
| X-BT-02 | 批量操作 | 批量导出超过上限 | admin用户 | POST, reportIds含21个ID | 400 |

### X-MD 请求方法限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-MD-01 | 方法限制 | 报告列表不支持POST | 用户已登录 | POST /api/reports (非generate) | 可能触发generate（需validateBody） |
| X-MD-02 | 方法限制 | 生成报告不支持GET | 用户已登录 | GET /api/reports/generate | 返回列表而非生成 |
| X-MD-03 | 方法限制 | 删除报告不支持GET | admin用户 | GET /api/reports/r001 (非delete) | 返回详情而非删除 |

### X-SE 错误信息安全

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SE-01 | 错误安全 | 生成报告失败不暴露SQL | 数据库异常 | POST generate | 错误消息不包含SQL语句 |
| X-SE-02 | 错误安全 | AI分析失败不暴露API Key | AI服务异常 | POST ai-analysis | 错误消息不包含API Key |
| X-SE-03 | 错误安全 | 删除报告日志不暴露敏感信息 | admin用户 | DELETE | 控制台日志不包含Token |

### X-RF 响应格式一致性

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-RF-01 | 响应格式 | 成功响应包含success字段 | 存在报告 | GET /api/reports | `{success:true, data:{list,pagination}}` |
| X-RF-02 | 响应格式 | 错误响应包含message字段 | 报告不存在 | GET /api/reports/nonexist | `{success:false, message:"报告不存在"}` |
| X-RF-03 | 响应格式 | 分页响应包含pagination | 存在报告 | GET /api/reports | data 包含 list 和 pagination |

### X-CT Content-Type校验

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-CT-01 | Content-Type | PDF导出Content-Type正确 | 存在报告 | GET export/pdf | Content-Type: application/pdf |
| X-CT-02 | Content-Type | Excel导出Content-Type正确 | 存在报告 | GET export/excel | Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| X-CT-03 | Content-Type | 批量Excel导出Content-Type正确 | 存在报告 | POST batch-export/excel | Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |

### X-LB 请求体大小限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-LB-01 | 大小限制 | AI分析请求体过大 | 用户已登录 | POST ai-analysis, reportData超大 | 413 Payload Too Large |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| D01 | 2 | 3 | 0 | 1 | 1 | 0 | 0 | 0 | 1 | 8 |
| D02 | 1 | 2 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 6 |
| D03 | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 5 |
| D04 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| D05 | 2 | 3 | 0 | 1 | 1 | 0 | 1 | 1 | 0 | 9 |
| D06 | 2 | 2 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 7 |
| D07 | 1 | 1 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 5 |
| D08 | 2 | 3 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 8 |
| D09 | 2 | 3 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 7 |
| D10 | 1 | 3 | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 7 |
| D11 | 4 | 5 | 0 | 1 | 1 | 1 | 1 | 0 | 1 | 14 |
| D12 | 5 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 9 |
| D13 | 2 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 7 |
| D14 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| D15 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| D16 | 2 | 5 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 9 |
| D17 | 4 | 4 | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 11 |
| D18 | 2 | 2 | 0 | 1 | 0 | 0 | 1 | 1 | 2 | 9 |
| D19 | 1 | 2 | 0 | 1 | 0 | 1 | 1 | 1 | 0 | 7 |
| 特殊(X-AS) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-BT) | - | - | - | - | - | - | - | - | - | 2 |
| 特殊(X-MD) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-SE) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-RF) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-CT) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-LB) | - | - | - | - | - | - | - | - | - | 1 |
| **合计** | **40** | **45** | **5** | **20** | **5** | **2** | **10** | **6** | **11** | **153** |
