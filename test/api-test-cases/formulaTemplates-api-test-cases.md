# 配方模板 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-FT-20260607-001 |
| 路由文件 | backend/src/routes/formulaTemplates.ts |
| 控制器文件 | backend/src/controllers/formulaTemplateController.ts |
| 端点数 | 5 |
| 测试用例数 | 52 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| G01 | GET | /api/formula-templates | 是 | 获取模板列表（分页、关键词搜索） |
| G02 | GET | /api/formula-templates/:id | 是 | 获取模板详情 |
| G03 | POST | /api/formula-templates | 是 | 创建模板 |
| G04 | PUT | /api/formula-templates/:id | 是 | 更新模板 |
| G05 | DELETE | /api/formula-templates/:id | 是 | 删除模板 |

## 二、测试用例

### G01 GET /api/formula-templates 获取模板列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G01-P01 | admin查询全部模板 | 存在多个用户的模板 | 无 | 200 | `{success:true, data:{list:[...], pagination:{...}}}` | 无 |
| G01-P02 | 按关键词搜索 | 存在名称含"感冒"的模板 | `keyword=感冒` | 200 | 返回匹配的模板 | 无 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G01-E01 | 数据库异常 | 数据库连接异常 | 无 | 500 | `{success:false, error:{code:"INTERNAL_ERROR"}}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G01-B01 | 空数据库查询 | 模板表为空 | 无 | 200 | 返回空列表，total=0 | 无 |
| G01-B02 | 关键词无匹配 | 无匹配数据 | `keyword=不存在的名称` | 200 | 返回空列表 | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G01-R01 | 未携带Token | 无 | 无Token | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G01-DI01 | admin可见全部模板 | 用户A和用户B各创建了模板 | 无 | 200 | admin可看到所有用户的模板 | 无 |
| G01-DI02 | formulist仅见自己模板 | 用户A(formulist)创建了模板 | 无 | 200 | 仅返回用户A创建的模板 | 无 |

---

### G02 GET /api/formula-templates/:id 获取模板详情

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G02-P01 | 查询自己创建的模板 | tid001由当前用户创建 | `id=tid001` | 200 | `{success:true, data:{id:"tid001", name:..., materialsJson:...}}` | 无 |
| G02-P02 | admin查询任何模板 | tid001由其他用户创建 | `id=tid001` | 200 | 返回详情数据 | 无 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G02-E01 | 模板不存在 | 无 | `id=nonexist` | 404 | `{success:false, error:{message:"模板不存在", code:"NOT_FOUND"}}` | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G02-R01 | 未携带Token | 无 | 无Token | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |
| G02-R02 | formulist查看他人模板 | tid001由用户B创建 | `id=tid001` | 403 | `{success:false, error:{message:"无权查看该模板", code:"FORBIDDEN"}}` | 无 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G02-DI01 | formulist无权查看他人模板 | 用户A查看用户B的模板 | `id=tid001` | 403 | `{success:false, error:{code:"FORBIDDEN"}}` | 无 |

---

### G03 POST /api/formula-templates 创建模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G03-P01 | 创建完整模板 | 无 | `{name:"感冒方模板", ratioFactor:0.18, supplementRatioFactor:1.0, finishedWeight:500, materials:[{materialId:"mid001", quantity:100}], packagingPrice:5, otherPrice:3, profitMargin:20}` | 201 | `{success:true, data:{id:..., name:"感冒方模板"}, message:"模板创建成功"}` | formula_templates新增1条 |
| G03-P02 | 创建带描述的模板 | 无 | `{name:"模板2", ratioFactor:0.18, supplementRatioFactor:1.0, finishedWeight:300, materials:[{materialId:"mid001", quantity:50}], description:"测试描述"}` | 201 | 返回数据包含description | 新增1条 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G03-E01 | 同用户下名称重复 | 当前用户已创建同名模板 | `{name:"已存在的名称", ratioFactor:0.18, supplementRatioFactor:1.0, finishedWeight:500, materials:[...]}` | 409 | `{success:false, error:{message:"模板名称已存在", code:"DUPLICATE_ENTRY"}}` | 无 |
| G03-E02 | 数据库写入异常 | 数据库异常 | 合法参数 | 500 | `{success:false, error:{code:"INTERNAL_ERROR"}}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G03-B01 | ratioFactor为最小值0.15 | 无 | `{..., ratioFactor:0.15}` | 201 | 创建成功 | 无 |
| G03-B02 | ratioFactor为最大值0.25 | 无 | `{..., ratioFactor:0.25}` | 201 | 创建成功 | 无 |
| G03-B03 | supplementRatioFactor为最小值0.5 | 无 | `{..., supplementRatioFactor:0.5}` | 201 | 创建成功 | 无 |
| G03-B04 | supplementRatioFactor为最大值1.5 | 无 | `{..., supplementRatioFactor:1.5}` | 201 | 创建成功 | 无 |
| G03-B05 | finishedWeight为0.01 | 无 | `{..., finishedWeight:0.01}` | 201 | 创建成功 | 无 |
| G03-B06 | materials只有1种原料 | 无 | `{..., materials:[{materialId:"mid001", quantity:1}]}` | 201 | 创建成功 | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G03-R01 | 未携带Token | 无 | 合法参数 | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G03-V01 | name缺失 | 无 | `{ratioFactor:0.18, supplementRatioFactor:1.0, finishedWeight:500, materials:[...]}` | 400 | `{success:false, message:"请输入模板名称"}` | 无 |
| G03-V02 | name为空字符串 | 无 | `{name:"", ratioFactor:0.18, ...}` | 400 | `{success:false, message:"请输入模板名称"}` | 无 |
| G03-V03 | ratioFactor缺失 | 无 | `{name:"测试", supplementRatioFactor:1.0, finishedWeight:500, materials:[...]}` | 400 | `{success:false, message:"主料含量比系数范围为0.15-0.25"}` | 无 |
| G03-V04 | ratioFactor小于0.15 | 无 | `{..., ratioFactor:0.10}` | 400 | `{success:false, error:{message:"主料含量比系数范围为0.15-0.25", code:"VALIDATION_ERROR"}}` | 无 |
| G03-V05 | ratioFactor大于0.25 | 无 | `{..., ratioFactor:0.30}` | 400 | `{success:false, error:{message:"主料含量比系数范围为0.15-0.25", code:"VALIDATION_ERROR"}}` | 无 |
| G03-V06 | supplementRatioFactor小于0.5 | 无 | `{..., supplementRatioFactor:0.3}` | 400 | `{success:false, error:{message:"辅料含量比系数范围为0.5-1.5", code:"VALIDATION_ERROR"}}` | 无 |
| G03-V07 | supplementRatioFactor大于1.5 | 无 | `{..., supplementRatioFactor:2.0}` | 400 | `{success:false, error:{message:"辅料含量比系数范围为0.5-1.5", code:"VALIDATION_ERROR"}}` | 无 |
| G03-V08 | finishedWeight缺失 | 无 | `{name:"测试", ratioFactor:0.18, supplementRatioFactor:1.0, materials:[...]}` | 400 | validateBody校验失败 | 无 |
| G03-V09 | finishedWeight为0 | 无 | `{..., finishedWeight:0}` | 400 | `{success:false, error:{message:"成品重量必须大于0", code:"VALIDATION_ERROR"}}` | 无 |
| G03-V10 | finishedWeight为负数 | 无 | `{..., finishedWeight:-100}` | 400 | validateBody校验失败 | 无 |
| G03-V11 | materials缺失 | 无 | `{name:"测试", ratioFactor:0.18, supplementRatioFactor:1.0, finishedWeight:500}` | 400 | `{success:false, message:"请添加至少一种原料"}` | 无 |
| G03-V12 | materials为空数组 | 无 | `{..., materials:[]}` | 400 | `{success:false, error:{message:"原料列表不能为空", code:"VALIDATION_ERROR"}}` | 无 |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G03-DC01 | 名称唯一性按用户隔离 | 用户A和用户B各创建同名模板 | `{name:"同名模板", ...}` | 201 | 不同用户可创建同名模板 | 无冲突 |
| G03-DC02 | 创建后默认值正确 | 无 | `{name:"测试", ratioFactor:0.18, supplementRatioFactor:1.0, finishedWeight:500, materials:[...]}` | 201 | packagingPrice=0, otherPrice=0, profitMargin=20 | 默认值正确 |

---

### G04 PUT /api/formula-templates/:id 更新模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-P01 | 更新模板名称 | tid001由当前用户创建 | `{name:"新名称"}` | 200 | `{success:true, data:{name:"新名称"}, message:"模板更新成功"}` | formula_templates更新 |
| G04-P02 | 更新原料和参数 | tid001由当前用户创建 | `{materials:[{materialId:"mid002", quantity:200}], finishedWeight:600, ratioFactor:0.20}` | 200 | 返回更新后数据 | 更新 |
| G04-P03 | 更新费用和利润率 | tid001由当前用户创建 | `{packagingPrice:10, otherPrice:5, profitMargin:30}` | 200 | 返回更新后数据 | 更新 |
| G04-P04 | admin更新任何模板 | admin用户更新用户B的模板 | `{name:"新名称"}` | 200 | 更新成功 | 无 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-E01 | 模板不存在 | 无 | `{name:"新名称"}` | 404 | `{success:false, error:{code:"NOT_FOUND"}}` | 无 |
| G04-E02 | 名称重复 | 同用户已有同名模板 | `{name:"已存在的名称"}` | 409 | `{success:false, error:{message:"模板名称已存在", code:"DUPLICATE_ENTRY"}}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-B01 | ratioFactor边界值0.15 | tid001存在 | `{ratioFactor:0.15}` | 200 | 更新成功 | 无 |
| G04-B02 | ratioFactor边界值0.25 | tid001存在 | `{ratioFactor:0.25}` | 200 | 更新成功 | 无 |
| G04-B03 | supplementRatioFactor边界值0.5 | tid001存在 | `{supplementRatioFactor:0.5}` | 200 | 更新成功 | 无 |
| G04-B04 | supplementRatioFactor边界值1.5 | tid001存在 | `{supplementRatioFactor:1.5}` | 200 | 更新成功 | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-R01 | 未携带Token | 无 | 合法参数 | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |
| G04-R02 | formulist修改他人模板 | tid001由用户B创建 | `{name:"新名称"}` | 403 | `{success:false, error:{message:"无权修改该模板", code:"FORBIDDEN"}}` | 无 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-V01 | name为空字符串 | tid001存在 | `{name:""}` | 400 | `{success:false, error:{message:"模板名称不能为空", code:"VALIDATION_ERROR"}}` | 无 |
| G04-V02 | ratioFactor小于0.15 | tid001存在 | `{ratioFactor:0.10}` | 400 | `{success:false, error:{message:"主料含量比系数范围为0.15-0.25", code:"VALIDATION_ERROR"}}` | 无 |
| G04-V03 | ratioFactor大于0.25 | tid001存在 | `{ratioFactor:0.30}` | 400 | `{success:false, error:{message:"主料含量比系数范围为0.15-0.25", code:"VALIDATION_ERROR"}}` | 无 |
| G04-V04 | supplementRatioFactor小于0.5 | tid001存在 | `{supplementRatioFactor:0.3}` | 400 | `{success:false, error:{message:"辅料含量比系数范围为0.5-1.5", code:"VALIDATION_ERROR"}}` | 无 |
| G04-V05 | supplementRatioFactor大于1.5 | tid001存在 | `{supplementRatioFactor:2.0}` | 400 | `{success:false, error:{message:"辅料含量比系数范围为0.5-1.5", code:"VALIDATION_ERROR"}}` | 无 |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-DC01 | 未传字段保持原值 | tid001存在 | `{name:"新名称"}` | 200 | ratioFactor等未传字段保持原值 | 仅更新name |
| G04-DC02 | 修改名称时检查唯一性 | 同用户已有同名模板 | `{name:"已存在的名称"}` | 409 | 名称重复 | 无 |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-I01 | 重复更新相同数据 | tid001存在 | 两次相同PUT请求 | 200 | 两次均成功，数据一致 | 第二次无实质变化 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G04-DI01 | formulist无法修改他人模板 | tid001由用户B创建 | `{name:"新名称"}` | 403 | `{success:false, error:{code:"FORBIDDEN"}}` | 无 |

---

### G05 DELETE /api/formula-templates/:id 删除模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G05-P01 | 删除自己创建的模板 | tid001由当前用户创建 | `id=tid001` | 200 | `{success:true, message:"模板删除成功"}` | formula_templates物理删除 |
| G05-P02 | admin删除任何模板 | tid001由其他用户创建 | `id=tid001` | 200 | 删除成功 | 物理删除 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G05-E01 | 模板不存在 | 无 | `id=nonexist` | 404 | `{success:false, error:{code:"NOT_FOUND"}}` | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G05-R01 | 未携带Token | 无 | 无Token | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |
| G05-R02 | formulist删除他人模板 | tid001由用户B创建 | `id=tid001` | 403 | `{success:false, error:{message:"无权删除该模板", code:"FORBIDDEN"}}` | 无 |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G05-I01 | 重复删除同一模板 | tid001已删除 | `id=tid001` | 404 | `{success:false, error:{code:"NOT_FOUND"}}` | 无 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G05-DI01 | formulist无法删除他人模板 | tid001由用户B创建 | `id=tid001` | 403 | `{success:false, error:{code:"FORBIDDEN"}}` | 无 |

## 三、特殊场景测试

### X-PG 分页排序
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G01-XPG01 | 模板列表分页 | 存在30条模板 | `page=1&pageSize=20` | 200 | 返回20条 |
| G01-XPG02 | 模板列表第2页 | 存在30条模板 | `page=2&pageSize=20` | 200 | 返回10条 |

### X-SE 错误信息安全
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G03-XSE01 | 创建失败不暴露SQL | 数据库异常 | 合法参数 | 500 | 错误消息不包含SQL语句 |

### X-CT Content-Type校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G03-XCT01 | 使用form-data提交 | 无 | Content-Type: multipart/form-data | 400 | 参数解析失败 |

### X-RF 响应格式一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G01-XRF01 | 列表与详情响应格式一致 | tid001存在 | GET列表和GET详情 | 200 | 两者均返回`{success:true, data:{...}}`格式 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| G01 | 2 | 1 | 2 | 1 | 0 | 0 | 0 | 0 | 2 | 8 |
| G02 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 6 |
| G03 | 2 | 2 | 6 | 1 | 12 | 0 | 2 | 0 | 0 | 25 |
| G04 | 4 | 2 | 4 | 2 | 5 | 0 | 2 | 1 | 1 | 21 |
| G05 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 1 | 1 | 7 |
| **合计** | **12** | **7** | **12** | **8** | **17** | **0** | **4** | **2** | **5** | **67** |
