# 导出中心 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-EXP-20260607-001 |
| 路由文件 | backend/src/routes/exports.ts |
| 控制器文件 | backend/src/controllers/exportController.ts |
| 服务文件 | backend/src/services/exportService.ts |
| 端点数 | 16 |
| 测试用例数 | 152 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| A01 | GET | /api/exports/public/share/:shareId | 否 | 获取公开分享信息 |
| A02 | GET | /api/exports/statistics | 是 | 获取导出统计 |
| A03 | GET | /api/exports/config | 是 | 获取导出配置 |
| A04 | PUT | /api/exports/config | 是 | 更新导出配置 |
| A05 | GET | /api/exports/materials | 是 | 获取可导出原料列表 |
| A06 | GET | /api/exports/reports | 是 | 获取可导出报告列表 |
| A07 | GET | /api/exports/templates | 是 | 获取导出模板列表 |
| A08 | POST | /api/exports/templates | 是 | 创建导出模板 |
| A09 | PUT | /api/exports/templates/:templateId | 是 | 更新导出模板 |
| A10 | DELETE | /api/exports/templates/:templateId | 是 | 删除导出模板 |
| A11 | POST | /api/exports/jobs | 是 | 创建导出任务 |
| A12 | GET | /api/exports/jobs | 是 | 获取导出任务列表 |
| A13 | GET | /api/exports/jobs/:jobId | 是 | 获取导出任务详情 |
| A14 | GET | /api/exports/jobs/:jobId/download | 是 | 下载导出文件 |
| A15 | POST | /api/exports/jobs/:jobId/retry | 是 | 重试失败任务 |
| A16 | POST | /api/exports/jobs/:jobId/re-export | 是 | 重新导出任务 |
| A17 | GET | /api/exports/shares | 是 | 获取分享列表 |
| A18 | POST | /api/exports/share | 是 | 创建分享 |
| A19 | DELETE | /api/exports/share/:shareId | 是 | 删除分享 |

> 注：路由文件中 `getShare` 控制器映射到 `/api/exports/shares` 路由（GET /share/:shareId 未在路由中单独定义，`getShare` 实际被 `getShares` 覆盖；公开分享通过 A01 访问）。实际端点按路由定义共 16 个。

## 二、测试用例

### A01 GET /api/exports/public/share/:shareId — 获取公开分享信息

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A01-P01 | 正向流程 | 获取有效的公开分享 | 存在有效分享记录 shareId=share001，关联配方 formulaId=f001 | GET /api/exports/public/share/share001 | 200, `{success:true, data:{shareId,formulaId,formula:{...},allowedEmails:[],downloadCount}}` |
| A01-E01 | 异常流程 | 分享ID不存在 | 无对应分享记录 | GET /api/exports/public/share/nonexist | 404, `{success:false, error:{message:"分享不存在", code:"NOT_FOUND"}}` |
| A01-E02 | 异常流程 | 分享链接已过期 | 存在分享记录但 expire_date < 当前日期 | GET /api/exports/public/share/expired001 | 410, `{success:false, error:{message:"分享链接已过期", code:"GONE"}}` |
| A01-E03 | 异常流程 | 下载次数已达上限 | 存在分享记录且 download_count >= download_limit | GET /api/exports/public/share/limit001 | 410, `{success:false, error:{message:"下载次数已达上限", code:"GONE"}}` |
| A01-B01 | 边界条件 | shareId为空字符串 | 无 | GET /api/exports/public/share/ | 404（路由不匹配） |
| A01-B02 | 边界条件 | shareId含特殊字符 | 无 | GET /api/exports/public/share/<script>alert(1)</script> | 404 或安全响应，不执行脚本 |
| A01-R01 | 权限认证 | 无需认证即可访问 | 存在有效分享 | 不带 Authorization 头请求 | 200, 正常返回分享数据 |
| A01-DC01 | 数据一致性 | 访问后下载计数+1 | 分享记录 download_count=5 | GET /api/exports/public/share/share001 | 200, 数据库中 download_count 变为 6 |
| A01-I01 | 幂等性 | 重复访问同一分享 | 有效分享 | 连续2次 GET /api/exports/public/share/share001 | 两次均200，download_count 累加2次 |
| A01-X-SE01 | 错误信息安全 | 过期分享不暴露内部信息 | 过期分享 | GET /api/exports/public/share/expired001 | 响应不包含数据库表名、SQL语句 |

### A02 GET /api/exports/statistics — 获取导出统计

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A02-P01 | 正向流程 | admin获取统计 | admin用户登录，存在导出任务和分享 | GET /api/exports/statistics | 200, `{success:true, data:{totalJobs,completedJobs,failedJobs,processingJobs,activeShares,templateCount,recentActivities}}` |
| A02-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/statistics | 401, `{success:false, error:{code:"UNAUTHORIZED"}}` |
| A02-R02 | 权限认证 | formulist仅看自己的统计 | formulist用户，存在其他用户的任务 | GET /api/exports/statistics | 200, data.totalJobs 仅包含自己创建的任务数 |
| A02-DI01 | 数据隔离 | admin可见全部统计 | admin用户，存在多个用户的任务 | GET /api/exports/statistics | 200, data.totalJobs 包含所有用户的任务 |
| A02-DI02 | 数据隔离 | formulist仅可见自己的统计 | formulist用户A，用户B也有任务 | GET /api/exports/statistics | 200, recentActivities 仅包含自己的操作 |
| A02-V01 | 参数校验 | 无额外查询参数 | admin用户 | GET /api/exports/statistics | 200, 返回默认统计 |

### A03 GET /api/exports/config — 获取导出配置

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A03-P01 | 正向流程 | admin获取配置 | admin用户，export_center_config 表有数据 | GET /api/exports/config | 200, `{success:true, data:[{configKey,configValue,configType,description,updatedBy,updatedAt}]}` |
| A03-P02 | 正向流程 | formulist获取配置 | formulist用户 | GET /api/exports/config | 200, 返回默认配置（不从数据库读取） |
| A03-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/config | 401 |
| A03-R02 | 权限认证 | formulist看到的是默认值 | formulist用户 | GET /api/exports/config | 200, 返回4项默认配置，updatedBy为空 |
| A03-DI01 | 数据隔离 | admin与formulist看到不同配置 | admin修改过配置 | 分别以admin和formulist请求 | admin返回数据库实际值，formulist返回默认值 |

### A04 PUT /api/exports/config — 更新导出配置

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A04-P01 | 正向流程 | admin更新配置 | admin用户 | PUT, `{configs:[{configKey:"export_rate_limit",configValue:"20"}]}` | 200, `{success:true, data:{updatedCount:1}}` |
| A04-E01 | 异常流程 | formulist更新配置 | formulist用户 | PUT, `{configs:[{configKey:"export_rate_limit",configValue:"20"}]}` | 200, `{success:true, data:{updatedCount:0}}`（静默忽略） |
| A04-V01 | 参数校验 | 缺少configs字段 | admin用户 | PUT, `{}` | 400, `{success:false, error:{code:"VALIDATION_ERROR"}}` |
| A04-V02 | 参数校验 | configs不是数组 | admin用户 | PUT, `{configs:"invalid"}` | 400, `{success:false, error:{code:"VALIDATION_ERROR"}}` |
| A04-V03 | 参数校验 | configKey不存在 | admin用户 | PUT, `{configs:[{configKey:"nonexistent_key",configValue:"test"}]}` | 200, `{success:true, data:{updatedCount:0}}` |
| A04-V04 | 参数校验 | number类型配置传入非数字 | admin用户 | PUT, `{configs:[{configKey:"export_rate_limit",configValue:"abc"}]}` | 200, `{updatedCount:0}`（跳过无效值） |
| A04-V05 | 参数校验 | boolean类型配置传入非法值 | admin用户 | PUT, `{configs:[{configKey:"some_bool_key",configValue:"maybe"}]}` | 200, `{updatedCount:0}`（跳过无效值） |
| A04-R01 | 权限认证 | 未登录访问 | 无Token | PUT, `{configs:[...]}` | 401 |
| A04-DC01 | 数据一致性 | 更新后数据库值正确 | admin用户 | PUT, `{configs:[{configKey:"export_rate_limit",configValue:"20"}]}` | 数据库 export_center_config 中 export_rate_limit = "20" |
| A04-I01 | 幂等性 | 重复更新相同配置 | admin用户 | 连续2次 PUT 相同配置 | 两次均200，updatedCount一致 |

### A05 GET /api/exports/materials — 获取可导出原料列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A05-P01 | 正向流程 | 获取原料列表 | 存在原料数据 | GET /api/exports/materials | 200, 分页响应 `{list:[{id,name,code,unit,materialType,version,isLatest,totalVersions}],pagination}` |
| A05-P02 | 正向流程 | 按关键词搜索 | 存在原料"佛手" | GET /api/exports/materials?keyword=佛手 | 200, list 中包含名称或编码匹配的原料 |
| A05-B01 | 边界条件 | 无原料数据 | materials表为空 | GET /api/exports/materials | 200, `{list:[], pagination:{total:0}}` |
| A05-B02 | 边界条件 | 关键词为空字符串 | 存在原料 | GET /api/exports/materials?keyword= | 200, 返回全部原料 |
| A05-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/materials | 401 |
| A05-V01 | 参数校验 | page为负数 | 存在原料 | GET /api/exports/materials?page=-1 | 200, 默认使用page=1 |
| A05-V02 | 参数校验 | pageSize超大 | 存在原料 | GET /api/exports/materials?pageSize=9999 | 200, 按请求pageSize返回 |

### A06 GET /api/exports/reports — 获取可导出报告列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A06-P01 | 正向流程 | 获取周报列表 | 存在weekly类型报告 | GET /api/exports/reports?type=weekly | 200, 分页响应 `{list:[{id,title,type,periodStart,periodEnd,status}]}` |
| A06-P02 | 正向流程 | 按时间范围筛选 | 存在报告 | GET /api/exports/reports?type=monthly&periodStart=2026-01-01&periodEnd=2026-06-30 | 200, 返回时间范围内的报告 |
| A06-V01 | 参数校验 | 缺少type参数 | 无 | GET /api/exports/reports | 500（service层SQL缺少type条件导致异常） |
| A06-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/reports?type=weekly | 401 |
| A06-B01 | 边界条件 | 无匹配报告 | type=weekly但无数据 | GET /api/exports/reports?type=weekly | 200, `{list:[], pagination:{total:0}}` |

### A07 GET /api/exports/templates — 获取导出模板列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A07-P01 | 正向流程 | 获取全部模板 | 存在模板数据 | GET /api/exports/templates | 200, 分页响应 `{list:[{templateId,name,type,category,formatConfig,isDefault}]}` |
| A07-P02 | 正向流程 | 按type筛选 | 存在pdf和excel类型模板 | GET /api/exports/templates?type=pdf | 200, list 仅包含 type=pdf 的模板 |
| A07-P03 | 正向流程 | 按category筛选 | 存在formula和material分类模板 | GET /api/exports/templates?category=formula | 200, list 仅包含 formula 分类的模板 |
| A07-B01 | 边界条件 | 无模板数据 | export_templates表为空 | GET /api/exports/templates | 200, `{list:[], pagination:{total:0}}` |
| A07-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/templates | 401 |

### A08 POST /api/exports/templates — 创建导出模板

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A08-P01 | 正向流程 | 创建标准模板 | admin用户 | POST, `{name:"测试模板",type:"excel",formatConfig:{selectedFields:["name","code"]}}` | 201, `{success:true, data:{templateId}}` |
| A08-P02 | 正向流程 | 创建默认模板 | admin用户 | POST, `{name:"默认模板",type:"pdf",formatConfig:{},isDefault:true,category:"formula"}` | 201, 同分类下其他模板的 isDefault 被置为0 |
| A08-E01 | 异常流程 | 缺少name | admin用户 | POST, `{type:"excel",formatConfig:{}}` | 400, `{success:false, error:{code:"VALIDATION_ERROR"}}` |
| A08-E02 | 异常流程 | 缺少type | admin用户 | POST, `{name:"测试",formatConfig:{}}` | 400, `{success:false, error:{code:"VALIDATION_ERROR"}}` |
| A08-E03 | 异常流程 | 缺少formatConfig | admin用户 | POST, `{name:"测试",type:"excel"}` | 400, `{success:false, error:{code:"VALIDATION_ERROR"}}` |
| A08-V01 | 参数校验 | name为空字符串 | admin用户 | POST, `{name:"",type:"excel",formatConfig:{}}` | 400 或创建成功（视validateBody实现） |
| A08-V02 | 参数校验 | type为非法值 | admin用户 | POST, `{name:"测试",type:"invalid",formatConfig:{}}` | 400 或创建成功（视数据库CHECK约束） |
| A08-R01 | 权限认证 | 未登录访问 | 无Token | POST, `{name:"测试",type:"excel",formatConfig:{}}` | 401 |
| A08-DC01 | 数据一致性 | 创建后数据库记录正确 | admin用户 | POST, `{name:"测试模板",type:"excel",formatConfig:{fields:["name"]},category:"formula"}` | 数据库 export_templates 存在对应记录，format_config_json 正确 |
| A08-S01 | 状态流转 | 设为默认模板时旧默认被取消 | 已有 isDefault=1 的同类型模板 | POST, `{name:"新默认",type:"excel",isDefault:true,category:"formula",formatConfig:{}}` | 旧模板 isDefault=0，新模板 isDefault=1 |

### A09 PUT /api/exports/templates/:templateId — 更新导出模板

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A09-P01 | 正向流程 | 更新模板名称 | 存在模板 templateId=tpl001 | PUT, `{name:"更新后名称"}` | 200, `{success:true, data:null}` |
| A09-P02 | 正向流程 | 更新formatConfig | 存在模板 | PUT, `{formatConfig:{selectedFields:["name","code","unit"]}}` | 200 |
| A09-B01 | 边界条件 | templateId不存在 | 无 | PUT /api/exports/templates/nonexist, `{name:"测试"}` | 200（无报错，但数据库无变化） |
| A09-R01 | 权限认证 | 未登录访问 | 无Token | PUT, `{name:"测试"}` | 401 |
| A09-V01 | 参数校验 | 无更新字段 | 存在模板 | PUT, `{}` | 200（service层 setClauses 为空直接 return） |
| A09-I01 | 幂等性 | 重复更新相同内容 | 存在模板 | 连续2次 PUT 相同内容 | 两次均200，数据一致 |

### A10 DELETE /api/exports/templates/:templateId — 删除导出模板

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A10-P01 | 正向流程 | 删除存在的模板 | 存在模板 templateId=tpl001 | DELETE /api/exports/templates/tpl001 | 200, `{success:true, data:null}` |
| A10-B01 | 边界条件 | 删除不存在的模板 | 无 | DELETE /api/exports/templates/nonexist | 200（无报错） |
| A10-R01 | 权限认证 | 未登录访问 | 无Token | DELETE /api/exports/templates/tpl001 | 401 |
| A10-DC01 | 数据一致性 | 删除后数据库记录消失 | 存在模板 | DELETE /api/exports/templates/tpl001 | 数据库 export_templates 中无该记录 |
| A10-I01 | 幂等性 | 重复删除同一模板 | 存在模板 | 连续2次 DELETE | 两次均200 |

### A11 POST /api/exports/jobs — 创建导出任务

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A11-P01 | 正向流程 | 导出单个配方Excel | 存在配方 formulaId=f001 | POST, `{dataCategory:"formula",exportType:"excel",formulaIds:["f001"]}` | 201, `{success:true, data:{jobId,status:"completed",fileName}}` |
| A11-P02 | 正向流程 | 导出单个配方PDF | 存在配方 | POST, `{dataCategory:"formula",exportType:"pdf",formulaIds:["f001"]}` | 201, `{data:{jobId,status:"completed",fileName}}` |
| A11-P03 | 正向流程 | 批量导出配方 | 存在多个配方 | POST, `{dataCategory:"formula",exportType:"excel",formulaIds:["f001","f002"]}` | 201, `{data:{jobId,status:"completed",fileName}}` |
| A11-P04 | 正向流程 | 导出原料 | 存在原料 | POST, `{dataCategory:"material",exportType:"excel",materialIds:["m001"]}` | 201 |
| A11-P05 | 正向流程 | 导出周报 | 存在周报数据 | POST, `{dataCategory:"weekly-report",exportType:"excel",periodStart:"2026-05-31",periodEnd:"2026-06-06"}` | 201 |
| A11-P06 | 正向流程 | 使用模板导出 | 存在模板 templateId=tpl001 | POST, `{dataCategory:"formula",exportType:"excel",formulaIds:["f001"],templateId:"tpl001"}` | 201, 按模板配置导出 |
| A11-E01 | 异常流程 | 缺少dataCategory | admin用户 | POST, `{exportType:"excel"}` | 400, `{error:{code:"VALIDATION_ERROR"}}` |
| A11-E02 | 异常流程 | 缺少exportType | admin用户 | POST, `{dataCategory:"formula"}` | 400, `{error:{code:"VALIDATION_ERROR"}}` |
| A11-E03 | 异常流程 | 不支持的exportType | admin用户 | POST, `{dataCategory:"formula",exportType:"csv"}` | 201, `{data:{status:"failed",errorMessage:"当前仅支持 Excel 和 PDF 格式导出"}}` |
| A11-E04 | 异常流程 | 配方ID不存在 | admin用户 | POST, `{dataCategory:"formula",exportType:"excel",formulaIds:["nonexist"]}` | 201, `{data:{status:"failed",errorMessage:"配方数据不存在..."}}` |
| A11-E05 | 异常流程 | 未指定配方ID | admin用户 | POST, `{dataCategory:"formula",exportType:"excel",formulaIds:[]}` | 201, `{data:{status:"failed",errorMessage:"未指定配方ID"}}` |
| A11-E06 | 异常流程 | 未指定原料ID | admin用户 | POST, `{dataCategory:"material",exportType:"excel",materialIds:[]}` | 201, `{data:{status:"failed",errorMessage:"未指定原料ID"}}` |
| A11-B01 | 边界条件 | formulaIds为空数组 | admin用户 | POST, `{dataCategory:"formula",exportType:"excel",formulaIds:[]}` | 201, status:"failed" |
| A11-R01 | 权限认证 | 未登录访问 | 无Token | POST, `{dataCategory:"formula",exportType:"excel"}` | 401 |
| A11-DC01 | 数据一致性 | 成功导出后数据库记录正确 | 存在配方 | POST 创建任务 | export_jobs 表存在记录，status="completed"，file_name 有值 |
| A11-DC02 | 数据一致性 | 失败导出后数据库记录正确 | 配方不存在 | POST 创建任务 | export_jobs 表存在记录，status="failed"，error_message 有值 |
| A11-X-AS01 | 异步任务 | 任务创建后状态从processing变为completed | 存在配方 | POST 创建任务 | 返回时 status 已为 "completed"（同步执行） |
| A11-X-BT01 | 批量操作 | 批量导出多个配方 | 存在3个配方 | POST, `{formulaIds:["f001","f002","f003"]}` | 201, 生成合并文件 |

### A12 GET /api/exports/jobs — 获取导出任务列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A12-P01 | 正向流程 | 获取全部任务 | admin用户，存在任务 | GET /api/exports/jobs | 200, 分页响应 |
| A12-P02 | 正向流程 | 按状态筛选 | 存在不同状态任务 | GET /api/exports/jobs?status=completed | 200, 仅返回已完成的任务 |
| A12-P03 | 正向流程 | 按数据类别筛选 | 存在不同类别任务 | GET /api/exports/jobs?dataCategory=formula | 200, 仅返回配方导出任务 |
| A12-P04 | 正向流程 | 按关键词搜索 | 存在任务 | GET /api/exports/jobs?keyword=配方 | 200, file_name 或 data_category 匹配 |
| A12-B01 | 边界条件 | 无任务数据 | export_jobs表为空 | GET /api/exports/jobs | 200, `{list:[], pagination:{total:0}}` |
| A12-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/jobs | 401 |
| A12-DI01 | 数据隔离 | formulist仅见自己的任务 | formulist用户A，用户B也有任务 | GET /api/exports/jobs | 200, list 仅包含 created_by=自己 的任务 |
| A12-DI02 | 数据隔离 | admin可见全部任务 | admin用户 | GET /api/exports/jobs | 200, list 包含所有用户的任务 |

### A13 GET /api/exports/jobs/:jobId — 获取导出任务详情

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A13-P01 | 正向流程 | 获取存在的任务详情 | 存在任务 jobId=job001 | GET /api/exports/jobs/job001 | 200, `{success:true, data:{jobId,dataCategory,exportType,status,fileName,...}}` |
| A13-E01 | 异常流程 | 任务不存在 | 无 | GET /api/exports/jobs/nonexist | 404, `{success:false, error:{message:"导出任务不存在", code:"NOT_FOUND"}}` |
| A13-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/jobs/job001 | 401 |
| A13-B01 | 边界条件 | jobId为空字符串 | 无 | GET /api/exports/jobs/ | 404（路由不匹配） |

### A14 GET /api/exports/jobs/:jobId/download — 下载导出文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A14-P01 | 正向流程 | 下载Excel文件 | 存在 completed 状态的 Excel 导出任务 | GET /api/exports/jobs/job001/download | 200, Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, 返回文件流 |
| A14-P02 | 正向流程 | 下载PDF文件 | 存在 completed 状态的 PDF 导出任务 | GET /api/exports/jobs/job002/download | 200, Content-Type: application/pdf |
| A14-E01 | 异常流程 | 任务未完成 | 存在 processing 状态任务 | GET /api/exports/jobs/job003/download | 404, `{error:{message:"导出文件不存在或任务未完成"}}` |
| A14-E02 | 异常流程 | 文件已过期 | 任务已完成但文件被删除 | GET /api/exports/jobs/job004/download | 404, `{error:{message:"导出文件已过期或不存在"}}` |
| A14-E03 | 异常流程 | 任务不存在 | 无 | GET /api/exports/jobs/nonexist/download | 404 |
| A14-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/jobs/job001/download | 401 |
| A14-X-CT01 | Content-Type | Excel文件Content-Type正确 | Excel导出任务 | GET download | Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| A14-X-CT02 | Content-Type | PDF文件Content-Type正确 | PDF导出任务 | GET download | Content-Type: application/pdf |
| A14-X-RF01 | 响应格式 | 下载响应包含Content-Disposition | 完成任务 | GET download | Content-Disposition: attachment; filename=... |

### A15 POST /api/exports/jobs/:jobId/retry — 重试失败任务

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A15-P01 | 正向流程 | 重试失败任务 | 存在 status="failed" 的任务 | POST /api/exports/jobs/job001/retry | 200, `{success:true, data:{jobId,status:"completed",fileName}}` |
| A15-E01 | 异常流程 | 重试不存在的任务 | 无 | POST /api/exports/jobs/nonexist/retry | 404, `{error:{message:"任务不存在", code:"NOT_FOUND"}}` |
| A15-E02 | 异常流程 | 重试非失败任务 | 存在 status="completed" 的任务 | POST /api/exports/jobs/job002/retry | 400, `{error:{message:"只能重试失败的任务", code:"VALIDATION_ERROR"}}` |
| A15-S01 | 状态流转 | 重试中状态变化 | 失败任务 | POST retry | 任务状态: failed → processing → completed/failed |
| A15-R01 | 权限认证 | 未登录访问 | 无Token | POST /api/exports/jobs/job001/retry | 401 |
| A15-DI01 | 数据隔离 | 只能重试自己创建的任务 | 用户A创建的失败任务，用户B请求 | POST retry by userB | 404（service层按 created_by 过滤） |
| A15-I01 | 幂等性 | 重试成功后再次重试 | 已重试成功的任务 | POST retry again | 400, "只能重试失败的任务" |

### A16 POST /api/exports/jobs/:jobId/re-export — 重新导出任务

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A16-P01 | 正向流程 | 重新导出已完成任务 | 存在 status="completed" 的任务 | POST /api/exports/jobs/job001/re-export | 200, `{data:{jobId,status:"completed",fileName}}` |
| A16-P02 | 正向流程 | 重新导出失败任务 | 存在 status="failed" 的任务 | POST /api/exports/jobs/job002/re-export | 200 |
| A16-E01 | 异常流程 | 重新导出不存在的任务 | 无 | POST /api/exports/jobs/nonexist/re-export | 404, `{error:{message:"任务不存在", code:"NOT_FOUND"}}` |
| A16-E02 | 异常流程 | 重新导出进行中的任务 | 存在 status="processing" 的任务 | POST /api/exports/jobs/job003/re-export | 400, `{error:{message:"只能重新导出已完成或失败的任务", code:"VALIDATION_ERROR"}}` |
| A16-S01 | 状态流转 | 重新导出状态变化 | 已完成任务 | POST re-export | 任务状态: completed → processing → completed |
| A16-R01 | 权限认证 | 未登录访问 | 无Token | POST re-export | 401 |
| A16-DI01 | 数据隔离 | 只能重新导出自己的任务 | 用户A的任务，用户B请求 | POST re-export by userB | 404 |

### A17 GET /api/exports/shares — 获取分享列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A17-P01 | 正向流程 | admin获取全部分享 | admin用户，存在分享 | GET /api/exports/shares | 200, `{success:true, data:[{shareId,formulaId,formulaName,shareType,shareUrl,...}]}` |
| A17-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/exports/shares | 401 |
| A17-DI01 | 数据隔离 | formulist仅见自己的分享 | formulist用户A，用户B也有分享 | GET /api/exports/shares | 200, data 仅包含 created_by=自己 的分享 |
| A17-DI02 | 数据隔离 | admin可见全部分享 | admin用户 | GET /api/exports/shares | 200, data 包含所有用户的分享 |

### A18 POST /api/exports/share — 创建分享

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A18-P01 | 正向流程 | 创建链接分享 | 存在配方 formulaId=f001 | POST, `{formulaId:"f001",shareType:"link"}` | 201, `{data:{shareId,shareUrl}}` |
| A18-P02 | 正向流程 | 创建带密码分享 | 存在配方 | POST, `{formulaId:"f001",shareType:"link",password:"abc123"}` | 201 |
| A18-P03 | 正向流程 | 创建带过期时间分享 | 存在配方 | POST, `{formulaId:"f001",shareType:"link",expireDate:"2026-12-31"}` | 201 |
| A18-P04 | 正向流程 | 创建带下载限制分享 | 存在配方 | POST, `{formulaId:"f001",shareType:"link",downloadLimit:10}` | 201 |
| A18-P05 | 正向流程 | 创建邮件分享 | 存在配方 | POST, `{formulaId:"f001",shareType:"email",allowedEmails:["a@test.com"]}` | 201 |
| A18-R01 | 权限认证 | 未登录访问 | 无Token | POST, `{formulaId:"f001"}` | 401 |
| A18-DC01 | 数据一致性 | 创建后数据库记录正确 | 存在配方 | POST 创建分享 | share_configs 表存在对应记录 |
| A18-I01 | 幂等性 | 对同一配方重复创建分享 | 存在配方 | 连续2次 POST | 两次均201，生成不同 shareId |

### A19 DELETE /api/exports/share/:shareId — 删除分享

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| A19-P01 | 正向流程 | 删除存在的分享 | 存在分享 shareId=s001 | DELETE /api/exports/share/s001 | 200, `{success:true, data:null}` |
| A19-B01 | 边界条件 | 删除不存在的分享 | 无 | DELETE /api/exports/share/nonexist | 200（无报错） |
| A19-R01 | 权限认证 | 未登录访问 | 无Token | DELETE /api/exports/share/s001 | 401 |
| A19-DC01 | 数据一致性 | 删除后数据库记录消失 | 存在分享 | DELETE | share_configs 表中无该记录 |
| A19-I01 | 幂等性 | 重复删除同一分享 | 存在分享 | 连续2次 DELETE | 两次均200 |

## 三、特殊场景测试

### X-UP 文件上传（导出模块不涉及直接文件上传，跳过）

### X-AS 异步任务

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-AS-01 | 异步任务 | 导出任务状态流转完整链路 | 存在配方 | POST 创建任务 → GET 任务详情 | 任务从 processing → completed |
| X-AS-02 | 异步任务 | 导出任务失败后重试成功 | 配方先不存在后恢复 | 创建任务(失败) → 重试 | status: failed → completed |
| X-AS-03 | 异步任务 | 重新导出覆盖旧文件 | 已完成任务 | POST re-export | 新文件覆盖旧文件，fileName 更新 |

### X-BT 批量操作

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-BT-01 | 批量操作 | 批量导出多个配方为Excel | 存在3个配方 | POST, formulaIds含3个ID | 201, 生成合并的Excel文件 |
| X-BT-02 | 批量操作 | 批量导出多个配方为PDF | 存在3个配方 | POST, formulaIds含3个ID, exportType=pdf | 201, 生成合并的PDF文件 |
| X-BT-03 | 批量操作 | 批量导出原料 | 存在多个原料 | POST, materialIds含多个ID | 201, 生成合并文件 |

### X-MD 请求方法限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-MD-01 | 方法限制 | GET端点不支持POST | 存在模板 | POST /api/exports/templates | 404 或 405 |
| X-MD-02 | 方法限制 | POST端点不支持GET | admin用户 | GET /api/exports/jobs (创建) | 返回列表而非创建任务 |
| X-MD-03 | 方法限制 | DELETE端点不支持GET | 存在分享 | GET /api/exports/share/s001 | 404 或 405 |

### X-SE 错误信息安全

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SE-01 | 错误安全 | 导出失败不暴露数据库信息 | 配方不存在 | POST 创建导出任务 | 错误消息为"配方数据不存在，请检查配方是否已被删除"，不包含SQL或表名 |
| X-SE-02 | 错误安全 | 下载失败不暴露文件路径 | 文件不存在 | GET download | 错误消息为"导出文件已过期或不存在"，不包含服务器路径 |
| X-SE-03 | 错误安全 | 数据库异常不暴露内部信息 | 数据库连接异常 | 任意导出请求 | 错误消息为"系统数据库连接异常，请稍后重试或联系管理员" |

### X-RF 响应格式一致性

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-RF-01 | 响应格式 | 成功响应包含success字段 | 存在模板 | GET /api/exports/templates | `{success:true, data:{...}}` |
| X-RF-02 | 响应格式 | 分页响应包含pagination | 存在任务 | GET /api/exports/jobs | `{success:true, data:{list, pagination}}` |
| X-RF-03 | 响应格式 | 错误响应包含error对象 | 任务不存在 | GET /api/exports/jobs/nonexist | `{success:false, error:{message, code}}` |

### X-CT Content-Type校验

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-CT-01 | Content-Type | JSON响应Content-Type正确 | 任意API | GET /api/exports/statistics | Content-Type: application/json |
| X-CT-02 | Content-Type | 文件下载Content-Type正确 | Excel任务 | GET download | Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |

### X-LB 请求体大小限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-LB-01 | 大小限制 | 超大请求体被拒绝 | admin用户 | POST 创建模板，formatConfig 超过10MB | 413 Payload Too Large |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| A01 | 1 | 3 | 2 | 1 | 0 | 0 | 1 | 1 | 0 | 9 |
| A02 | 1 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 2 | 6 |
| A03 | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 5 |
| A04 | 1 | 1 | 0 | 1 | 5 | 0 | 1 | 1 | 0 | 10 |
| A05 | 2 | 0 | 2 | 1 | 2 | 0 | 0 | 0 | 0 | 7 |
| A06 | 2 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 5 |
| A07 | 3 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 5 |
| A08 | 2 | 3 | 0 | 1 | 2 | 1 | 1 | 0 | 0 | 10 |
| A09 | 2 | 0 | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 6 |
| A10 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 5 |
| A11 | 6 | 6 | 1 | 1 | 0 | 0 | 2 | 0 | 0 | 16 |
| A12 | 4 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 8 |
| A13 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| A14 | 2 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 6 |
| A15 | 1 | 2 | 0 | 1 | 0 | 1 | 0 | 1 | 1 | 7 |
| A16 | 2 | 2 | 0 | 1 | 0 | 1 | 0 | 0 | 1 | 7 |
| A17 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 4 |
| A18 | 5 | 0 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 8 |
| A19 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 5 |
| 特殊 | - | - | - | - | - | 3 | - | - | - | 3 |
| 特殊 | - | - | - | - | - | - | - | - | - | 3 |
| 特殊 | - | - | - | - | - | - | - | - | - | 3 |
| 特殊 | - | - | - | - | - | - | - | - | - | 3 |
| 特殊 | - | - | - | - | - | - | - | - | - | 3 |
| 特殊 | - | - | - | - | - | - | - | - | - | 2 |
| 特殊 | - | - | - | - | - | - | - | - | - | 1 |
| **合计** | **40** | **21** | **12** | **21** | **12** | **6** | **8** | **8** | **9** | **152** |
