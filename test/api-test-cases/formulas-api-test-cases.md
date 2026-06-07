# 配方 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-FM-20260607-001 |
| 路由文件 | backend/src/routes/formulas.ts |
| 控制器文件 | backend/src/controllers/formulaController.ts |
| 端点数 | 8 |
| 测试用例数 | 92 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| A01 | GET | /api/formulas | 是 | 获取配方列表（分页） |
| A02 | GET | /api/formulas/:id | 是 | 获取单个配方详情 |
| A03 | POST | /api/formulas | 是 | 创建配方 |
| A04 | PUT | /api/formulas/:id | 是 | 更新配方（含升版） |
| A05 | DELETE | /api/formulas/:id | 是 | 删除配方 |
| A06 | PUT | /api/formulas/:id/publish | 是 | 发布配方 |
| A07 | GET | /api/formulas/by-material/:materialId | 是 | 根据原料查找配方 |
| A08 | POST | /api/formulas/validate-ratio | 是 | ratioFactor 实时校验 |

## 二、测试用例

### A01 GET /api/formulas 获取配方列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A01-P01 | 基本查询配方列表 | 存在至少1条配方数据 | 无 | 200 | `{success:true, data:{list:[...], pagination:{page:1, pageSize:20, total:N, totalPages:M}}}` | 无 |
| A01-P02 | 按关键词搜索 | 存在名称含"感冒"的配方 | `keyword=感冒` | 200 | 返回列表中配方名称或业务员名称包含"感冒" | 无 |
| A01-P03 | 按业务员筛选 | 存在业务员ID为sid001的配方 | `salesmanId=sid001` | 200 | 返回列表中所有配方的salesmanId为sid001 | 无 |
| A01-P04 | 组合筛选 | 存在符合条件的数据 | `keyword=感冒&salesmanId=sid001` | 200 | 返回同时满足关键词和业务员条件的配方 | 无 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A01-E01 | 数据库查询异常 | 数据库连接异常 | 无 | 500 | `{success:false, message:"获取配方列表失败"}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A01-B01 | 空数据库查询 | 配方表为空 | 无 | 200 | `{success:true, data:{list:[], pagination:{page:1, pageSize:20, total:0, totalPages:0}}}` | 无 |
| A01-B02 | 关键词搜索无匹配 | 无匹配数据 | `keyword=不存在的配方名` | 200 | 返回空列表，total=0 | 无 |
| A01-B03 | 不存在的业务员ID | 无 | `salesmanId=nonexist` | 200 | 返回空列表，total=0 | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A01-R01 | 未携带Token | 无 | 无Token | 401 | `{success:false, error:{message:..., code:"UNAUTHORIZED"}}` | 无 |
| A01-R02 | Token过期 | Token已过期 | 过期Token | 401 | `{success:false, error:{code:"TOKEN_EXPIRED"}}` | 无 |
| A01-R03 | admin用户查询 | admin用户登录 | 无 | 200 | 返回全部配方列表 | 无 |
| A01-R04 | formulist用户查询 | formulist用户登录 | 无 | 200 | 返回配方列表（含全部数据，列表不做数据隔离） | 无 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A01-V01 | page为0 | 无 | `page=0` | 200 | 使用默认分页参数 | 无 |
| A01-V02 | page为负数 | 无 | `page=-1` | 200 | 使用默认分页参数 | 无 |
| A01-V03 | pageSize超大 | 无 | `pageSize=99999` | 200 | 返回所有数据 | 无 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A01-DI01 | formulist查看列表 | 用户A(formulist)和用户B各创建了配方 | 无 | 200 | 列表接口返回全部配方（列表不做数据隔离过滤） | 无 |

---

### A02 GET /api/formulas/:id 获取单个配方详情

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A02-P01 | 查询存在的配方 | 配方ID为fid001存在 | `id=fid001` | 200 | `{success:true, data:{id:"fid001", name:..., currentVersionNumber:...}}` | 无 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A02-E01 | 查询不存在的配方 | 无 | `id=nonexist` | 404 | `{success:false, message:"配方不存在"}` | 无 |
| A02-E02 | 数据库异常 | 数据库连接异常 | `id=fid001` | 500 | `{success:false, message:"获取配方失败"}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A02-B01 | ID为空字符串 | 无 | `id=""` | 404 | `{success:false, message:"配方不存在"}` | 无 |
| A02-B02 | ID含特殊字符 | 无 | `id=<script>` | 404 | `{success:false, message:"配方不存在"}` | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A02-R01 | 未携带Token | 无 | 无Token | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |

---

### A03 POST /api/formulas 创建配方

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-P01 | formulist创建配方 | 业务员sid001存在，原料mid001存在 | `{name:"测试配方", salesmanId:"sid001", materials:[{materialId:"mid001", materialName:"人参", quantity:100, materialType:"herb"}], finishedWeight:500, ratioFactor:0.18, supplementRatioFactor:1.0}` | 201 | `{success:true, data:{id:..., name:"测试配方"}, message:"配方创建成功"}` | formulas表新增1条，formula_versions表新增1条(status=draft) |
| A03-P02 | admin创建配方直接发布 | admin用户，业务员sid001存在 | 同P01 | 201 | `{success:true, data:{...}}` | formulas表新增1条，formula_versions表新增1条(status=published) |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-E01 | 业务员不存在 | salesmanId不存在 | `{name:"测试", salesmanId:"nonexist", materials:[...], finishedWeight:500, ratioFactor:0.18, supplementRatioFactor:1.0}` | 400 | `{success:false, message:"业务员不存在"}` | 无 |
| A03-E02 | ratioFactor校验不通过 | 原料配比超出阈值 | `{name:"测试", salesmanId:"sid001", materials:[...], finishedWeight:500, ratioFactor:0.18, supplementRatioFactor:1.0}` | 400 | `{success:false, message:..., validation:{allowed:false}}` | 无 |
| A03-E03 | 数据库写入异常 | 数据库连接异常 | 合法参数 | 500 | `{success:false, message:"创建配方失败"}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-B01 | ratioFactor为最小值0.15 | 业务员存在 | `{..., ratioFactor:0.15, supplementRatioFactor:1.0}` | 201 | 创建成功 | 新增记录ratio_factor=0.15 |
| A03-B02 | ratioFactor为最大值0.25 | 业务员存在 | `{..., ratioFactor:0.25, supplementRatioFactor:1.0}` | 201 | 创建成功 | 新增记录ratio_factor=0.25 |
| A03-B03 | supplementRatioFactor为最小值0.5 | 业务员存在 | `{..., ratioFactor:0.18, supplementRatioFactor:0.5}` | 201 | 创建成功 | 新增记录supplement_ratio_factor=0.5 |
| A03-B04 | supplementRatioFactor为最大值1.5 | 业务员存在 | `{..., ratioFactor:0.18, supplementRatioFactor:1.5}` | 201 | 创建成功 | 新增记录supplement_ratio_factor=1.5 |
| A03-B05 | finishedWeight为0 | 业务员存在 | `{..., finishedWeight:0}` | 201 | 创建成功（finishedWeight=0） | 新增记录finished_weight=0 |
| A03-B06 | materials为空数组 | 业务员存在 | `{..., materials:[]}` | 400 | validateBody校验失败 | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-R01 | 未携带Token | 无 | 合法参数 | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |
| A03-R02 | Token过期 | 过期Token | 合法参数 | 401 | `{success:false, error:{code:"TOKEN_EXPIRED"}}` | 无 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-V01 | name缺失 | 无 | `{salesmanId:"sid001", materials:[...], finishedWeight:500, ratioFactor:0.18, supplementRatioFactor:1.0}` | 400 | `{success:false, message:"请输入配方名称"}` | 无 |
| A03-V02 | name为空字符串 | 无 | `{name:"", ...}` | 400 | `{success:false, message:"请输入配方名称"}` | 无 |
| A03-V03 | salesmanId缺失 | 无 | `{name:"测试", materials:[...], ...}` | 400 | `{success:false, message:"请选择业务员"}` | 无 |
| A03-V04 | materials缺失 | 无 | `{name:"测试", salesmanId:"sid001", ...}` | 400 | `{success:false, message:"请添加原料"}` | 无 |
| A03-V05 | finishedWeight缺失 | 无 | `{name:"测试", salesmanId:"sid001", materials:[...], ratioFactor:0.18, supplementRatioFactor:1.0}` | 400 | `{success:false, message:"请输入成品重量"}` | 无 |
| A03-V06 | ratioFactor缺失 | 无 | `{..., ratioFactor:未传}` | 400 | `{success:false, message:"请提供主料含量比系数"}` | 无 |
| A03-V07 | supplementRatioFactor缺失 | 无 | `{..., supplementRatioFactor:未传}` | 400 | `{success:false, message:"请提供辅料含量比系数"}` | 无 |
| A03-V08 | ratioFactor小于0.15 | 无 | `{..., ratioFactor:0.10}` | 400 | `{success:false, message:"主料含量比系数范围为0.15-0.25"}` | 无 |
| A03-V09 | ratioFactor大于0.25 | 无 | `{..., ratioFactor:0.30}` | 400 | `{success:false, message:"主料含量比系数范围为0.15-0.25"}` | 无 |
| A03-V10 | supplementRatioFactor小于0.5 | 无 | `{..., supplementRatioFactor:0.3}` | 400 | `{success:false, message:"辅料含量比系数范围为0.5-1.5"}` | 无 |
| A03-V11 | supplementRatioFactor大于1.5 | 无 | `{..., supplementRatioFactor:2.0}` | 400 | `{success:false, message:"辅料含量比系数范围为0.5-1.5"}` | 无 |
| A03-V12 | name类型错误(数字) | 无 | `{name:12345, ...}` | 400 | validateBody校验失败 | 无 |
| A03-V13 | materials类型错误(字符串) | 无 | `{materials:"not_array", ...}` | 400 | validateBody校验失败 | 无 |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-S01 | formulist创建后版本为draft | formulist用户 | 合法参数 | 201 | formula_versions.status="draft" | 版本状态为draft |
| A03-S02 | admin创建后版本为published | admin用户 | 合法参数 | 201 | formula_versions.status="published" | 版本状态为published |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-DC01 | 创建后配方与版本关联一致 | 业务员存在 | 合法参数 | 201 | 返回的配方ID与版本中的formula_id一致 | formulas和formula_versions数据关联正确 |
| A03-DC02 | 创建后业务员名称同步 | 业务员sid001名称为"张三" | 合法参数 | 201 | 返回数据中salesmanName="张三" | formulas.salesman_name正确 |

---

### A04 PUT /api/formulas/:id 更新配方

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-P01 | 仅更新名称 | 配方fid001存在 | `{name:"新名称", versionReason:"修改名称"}` | 200 | `{success:true, data:{name:"新名称"}, message:"配方更新成功"}` | formulas.name更新 |
| A04-P02 | 更新原料（升版） | 配方fid001存在 | `{materials:[...新原料], versionReason:"调整原料"}` | 200 | 返回更新后的配方数据 | formulas更新，formula_versions新增版本 |
| A04-P03 | 更新ratioFactor | 配方fid001存在 | `{ratioFactor:0.20}` | 200 | 返回更新后的数据 | formulas.ratio_factor更新 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-E01 | 配方不存在 | 无 | `{name:"新名称"}` | 404 | `{success:false, message:"配方不存在"}` | 无 |
| A04-E02 | 更新原料未填升版原因 | 配方fid001存在 | `{materials:[...], versionReason:""}` | 400 | `{success:false, message:"请填写升版原因"}` | 无 |
| A04-E03 | 更新时业务员不存在 | 配方存在，salesmanId不存在 | `{salesmanId:"nonexist"}` | 400 | `{success:false, message:"业务员不存在"}` | 无 |
| A04-E04 | ratioFactor校验不通过 | 配方存在 | `{materials:[...], ratioFactor:0.18, versionReason:"调整"}` | 400 | `{success:false, validation:{allowed:false}}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-B01 | name为1个字符 | 配方存在 | `{name:"A"}` | 200 | 更新成功 | 无 |
| A04-B02 | ratioFactor边界值0.15 | 配方存在 | `{ratioFactor:0.15}` | 200 | 更新成功 | ratio_factor=0.15 |
| A04-B03 | ratioFactor边界值0.25 | 配方存在 | `{ratioFactor:0.25}` | 200 | 更新成功 | ratio_factor=0.25 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-R01 | 未携带Token | 无 | 合法参数 | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-V01 | name为空字符串 | 配方存在 | `{name:""}` | 400 | `{success:false, message:"请输入配方名称"}` | 无 |
| A04-V02 | ratioFactor小于0.15 | 配方存在 | `{ratioFactor:0.10}` | 400 | `{success:false, message:"主料含量比系数范围为0.15-0.25"}` | 无 |
| A04-V03 | ratioFactor大于0.25 | 配方存在 | `{ratioFactor:0.30}` | 400 | `{success:false, message:"主料含量比系数范围为0.15-0.25"}` | 无 |
| A04-V04 | supplementRatioFactor小于0.5 | 配方存在 | `{supplementRatioFactor:0.3}` | 400 | `{success:false, message:"辅料含量比系数范围为0.5-1.5"}` | 无 |
| A04-V05 | supplementRatioFactor大于1.5 | 配方存在 | `{supplementRatioFactor:2.0}` | 400 | `{success:false, message:"辅料含量比系数范围为0.5-1.5"}` | 无 |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-S01 | 更新原料后新版本为draft | 配方当前版本为published | `{materials:[...], versionReason:"调整"}` | 200 | 新版本status=draft，旧版本is_current=0 | 新增draft版本 |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-DC01 | 升版后版本号递增 | 配方当前最新版本为v1.0 | `{materials:[...], versionReason:"调整"}` | 200 | 新版本号为v1.1 | formula_versions新增v1.1 |
| A04-DC02 | 升版后变更记录正确 | 配方存在 | `{materials:[...新增原料], versionReason:"新增原料"}` | 200 | changes_json中包含新增原料的变更记录 | changes_json正确 |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A04-I01 | 重复更新相同名称 | 配方fid001存在 | 两次`{name:"相同名称"}` | 200 | 两次均成功，第二次值不变 | 第二次无实质变化 |

---

### A05 DELETE /api/formulas/:id 删除配方

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A05-P01 | 删除自己创建的配方 | 用户A创建了配方fid001 | `id=fid001` | 200 | `{success:true, message:"配方删除成功"}` | formulas表删除该记录 |
| A05-P02 | admin删除他人配方 | admin用户，配方fid001由用户B创建 | `id=fid001` | 200 | `{success:true, message:"配方删除成功"}` | formulas表删除该记录 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A05-E01 | 配方不存在 | 无 | `id=nonexist` | 404 | `{success:false, message:"配方不存在"}` | 无 |
| A05-E02 | 数据库删除异常 | 数据库异常 | `id=fid001` | 500 | `{success:false, message:"删除配方失败"}` | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A05-R01 | 未携带Token | 无 | 无Token | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |
| A05-R02 | formulist删除他人配方 | 用户A(formulist)删除用户B的配方 | `id=fid001` | 403 | `{success:false, message:"无权删除他人配方"}` | 无 |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A05-I01 | 重复删除同一配方 | 配方fid001已删除 | `id=fid001` | 404 | `{success:false, message:"配方不存在"}` | 无 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A05-DI01 | formulist无法删除他人配方 | 用户B的配方 | `id=fid001` | 403 | `{success:false, message:"无权删除他人配方"}` | 无 |

---

### A06 PUT /api/formulas/:id/publish 发布配方

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A06-P01 | 发布草稿版本配方 | 配方fid001当前版本为draft | `id=fid001` | 200 | `{success:true, data:{status:"published"}, message:"配方发布成功"}` | formula_versions.status更新为published |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A06-E01 | 配方不存在 | 无 | `id=nonexist` | 404 | `{success:false, message:"配方不存在"}` | 无 |
| A06-E02 | 配方无当前版本 | 配方存在但无版本 | `id=fid001` | 400 | `{success:false, message:"配方没有当前版本"}` | 无 |
| A06-E03 | 重复发布已发布版本 | 配方当前版本已为published | `id=fid001` | 400 | `{success:false, message:"当前版本已发布，无需重复发布"}` | 无 |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A06-S01 | draft→published | 当前版本为draft | `id=fid001` | 200 | 版本状态变为published | status: draft→published |

---

### A07 GET /api/formulas/by-material/:materialId 根据原料查找配方

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A07-P01 | 查找使用某原料的配方 | mid001被配方fid001引用 | `materialId=mid001` | 200 | `{success:true, data:[{id:"fid001", ...}]}` | 无 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A07-B01 | 原料未被任何配方使用 | mid002未被引用 | `materialId=mid002` | 200 | `{success:true, data:[]}` | 无 |
| A07-B02 | 不存在的原料ID | 无 | `materialId=nonexist` | 200 | `{success:true, data:[]}` | 无 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A07-R01 | 未携带Token | 无 | 无Token | 401 | `{success:false, error:{code:"UNAUTHORIZED"}}` | 无 |

---

### A08 POST /api/formulas/validate-ratio ratioFactor实时校验

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A08-P01 | 校验通过 | 原料mid001存在 | `{materials:[{materialId:"mid001", quantity:100}], finishedWeight:500, ratioFactor:0.18, supplementRatioFactor:1.0}` | 200 | `{success:true, data:{allowed:true, ...}}` | 无 |
| A08-P02 | 校验不通过 | 原料配比超阈值 | `{materials:[...], finishedWeight:500, ratioFactor:0.18, supplementRatioFactor:1.0}` | 200 | `{success:true, data:{allowed:false, message:...}}` | 无 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A08-V01 | materials缺失 | 无 | `{finishedWeight:500, ratioFactor:0.18, supplementRatioFactor:1.0}` | 400 | `{success:false, message:"请提供原料列表"}` | 无 |
| A08-V02 | finishedWeight缺失 | 无 | `{materials:[...], ratioFactor:0.18, supplementRatioFactor:1.0}` | 400 | `{success:false, message:"请提供成品重量"}` | 无 |
| A08-V03 | ratioFactor缺失 | 无 | `{materials:[...], finishedWeight:500, supplementRatioFactor:1.0}` | 400 | `{success:false, message:"请提供主料含量比系数"}` | 无 |
| A08-V04 | supplementRatioFactor缺失 | 无 | `{materials:[...], finishedWeight:500, ratioFactor:0.18}` | 400 | `{success:false, message:"请提供辅料含量比系数"}` | 无 |

## 三、特殊场景测试

### X-PG 分页排序
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-XPG01 | 第1页查询 | 存在30条配方 | `page=1&pageSize=20` | 200 | 返回20条，pagination.total=30 |
| A01-XPG02 | 第2页查询 | 存在30条配方 | `page=2&pageSize=20` | 200 | 返回10条 |
| A01-XPG03 | 默认分页 | 存在数据 | 无分页参数 | 200 | 使用默认page=1, pageSize=20 |

### X-CC 并发冲突
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A04-XCC01 | 并发更新同一配方 | 两个请求同时更新fid001 | 两个PUT请求 | 200 | 后执行的请求覆盖先执行的，版本号递增正确 |

### X-CS 级联操作
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A05-XCS01 | 删除配方后版本级联删除 | 配方fid001有多个版本 | DELETE fid001 | 200 | formula_versions中关联记录也被删除（ON DELETE CASCADE） |

### X-C 计算准确性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-XC01 | 配方列表成本计算 | 原料单价为100元/kg，用量200g | GET /api/formulas | 200 | costSubtotal=(200/1000)*100=20 |
| A01-XC02 | 配方列表总价计算 | costSubtotal=20, packagingPrice=5, otherPrice=3, profitMargin=20 | GET /api/formulas | 200 | totalPrice=(20+5+3)*(1+20/100)=33.6 |

### X-MD 请求方法限制
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-XMD01 | POST /api/formulas/ | 无 | POST请求 | 201或400 | 正常处理 |
| A01-XMD02 | PATCH /api/formulas/:id | 无 | PATCH请求 | 404 | 路由不支持PATCH |

### X-SE 错误信息安全
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A03-XSE01 | 创建失败不暴露SQL | 数据库异常 | 合法参数 | 500 | 错误消息不包含SQL语句或表名 |

### X-CT Content-Type校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A03-XCT01 | 使用form-data提交 | 无 | Content-Type: multipart/form-data | 400 | 参数解析失败 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| A01 | 4 | 1 | 3 | 4 | 3 | 0 | 0 | 0 | 1 | 16 |
| A02 | 1 | 2 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 6 |
| A03 | 2 | 3 | 6 | 2 | 13 | 2 | 2 | 0 | 0 | 30 |
| A04 | 3 | 4 | 3 | 1 | 5 | 1 | 2 | 1 | 0 | 20 |
| A05 | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 1 | 1 | 8 |
| A06 | 1 | 3 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 5 |
| A07 | 1 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| A08 | 2 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 6 |
| **合计** | **16** | **15** | **16** | **11** | **25** | **4** | **4** | **2** | **2** | **95** |
