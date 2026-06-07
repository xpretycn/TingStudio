# 排除规则 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-EXC-20260607-001 |
| 路由文件 | backend/src/routes/exclusions.ts |
| 控制器文件 | backend/src/controllers/exclusionController.ts |
| Service文件 | backend/src/services/exclusionService.ts |
| 端点数 | 3 |
| 测试用例数 | 47 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|------|
| D01 | GET | /api/enums/exclusions | 必须 | 任意角色 | 获取全部互斥规则 |
| D02 | POST | /api/enums/exclusions | 必须 | admin | 创建互斥规则 |
| D03 | DELETE | /api/enums/exclusions/:id | 必须 | admin | 删除互斥规则 |

## 二、测试用例

### D01 GET /api/enums/exclusions — 获取全部互斥规则

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D01-P01 | 获取全部互斥规则 | 1. 已登录用户<br>2. 数据库有appearance和taste类型的规则 | GET /api/enums/exclusions | 200, `{success:true, data:{appearance:[{id,category,valueA,valueB,labelA,labelB}], taste:[...]}}` |
| D01-P02 | 无互斥规则 | 已登录用户，数据库无规则 | GET /api/enums/exclusions | 200, `{success:true, data:{appearance:[], taste:[]}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D01-E01 | 数据库查询异常 | 模拟异常 | GET /api/enums/exclusions | 500, `{success:false, error:{message:"获取互斥规则失败", code:"INTERNAL_ERROR"}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D01-R01 | 未登录访问 | 不携带Token | GET /api/enums/exclusions | 401 |
| D01-R02 | formulist角色访问 | 已登录formulist | GET /api/enums/exclusions | 200, 正常返回 |

#### 数据隔离
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D01-DI01 | 所有角色可见全部规则 | 已登录任意角色 | GET /api/enums/exclusions | 200, 返回全部规则（无数据隔离） |

---

### D02 POST /api/enums/exclusions — 创建互斥规则

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D02-P01 | 创建appearance互斥规则 | 1. 已登录admin用户<br>2. enum_options表存在appearance类型的valueA和valueB | POST Body: `{category:"appearance",valueA:"红色",valueB:"绿色"}` | 201, `{success:true, data:{id,category:"appearance",valueA:"红色",valueB:"绿色",labelA:"红色",labelB:"绿色"}}` |
| D02-P02 | 创建taste互斥规则 | 1. 已登录admin<br>2. enum_options表存在taste类型的选项 | POST Body: `{category:"taste",valueA:"甜",valueB:"苦"}` | 201, 创建成功 |
| D02-P03 | valueA>valueB时自动交换 | 已登录admin | POST Body: `{category:"appearance",valueA:"绿色",valueB:"红色"}` | 201, 数据库中valueA="红色", valueB="绿色"（字典序） |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D02-E01 | 无效的category | 已登录admin | POST Body: `{category:"invalid",valueA:"a",valueB:"b"}` | 400, `{success:false, error:{message:"互斥规则分类必须为 appearance 或 taste", code:"VALIDATION_ERROR"}}` |
| D02-E02 | valueA与valueB相同 | 已登录admin | POST Body: `{category:"appearance",valueA:"红色",valueB:"红色"}` | 400, `{success:false, error:{message:"valueA 和 valueB 不能相同", code:"VALIDATION_ERROR"}}` |
| D02-E03 | valueA不存在于enum_options | 已登录admin | POST Body: `{category:"appearance",valueA:"不存在",valueB:"红色"}` | 400, `{success:false, error:{message:"选项 \"不存在\" 在枚举表中不存在或未启用", code:"VALIDATION_ERROR"}}` |
| D02-E04 | valueB不存在于enum_options | 已登录admin | POST Body: `{category:"appearance",valueA:"红色",valueB:"不存在"}` | 400, `{success:false, error:{message:"选项 \"不存在\" 在枚举表中不存在或未启用", code:"VALIDATION_ERROR"}}` |
| D02-E05 | 重复创建相同规则 | 1. 已登录admin<br>2. 已存在appearance/红色/绿色的规则 | POST Body: `{category:"appearance",valueA:"红色",valueB:"绿色"}` | 409, `{success:false, error:{message:"该互斥规则已存在", code:"DUPLICATE_ENTRY"}}` |
| D02-E06 | 数据库写入异常 | 模拟异常 | POST Body: `{category:"appearance",valueA:"红色",valueB:"绿色"}` | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D02-B01 | valueA和valueB含特殊字符 | 已登录admin，enum_options含特殊字符选项 | POST Body: `{category:"appearance",valueA:"test'OR",valueB:"正常值"}` | 400或201，取决于enum_options是否存在 |
| D02-B02 | valueA和valueB含SQL注入 | 已登录admin | POST Body: `{category:"appearance",valueA:"';DROP TABLE--;valueB":"正常"}` | 400, 选项不存在于枚举表 |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D02-V01 | 缺少category | 已登录admin | POST Body: `{valueA:"红色",valueB:"绿色"}` | 400, 验证失败 |
| D02-V02 | 缺少valueA | 已登录admin | POST Body: `{category:"appearance",valueB:"绿色"}` | 400, 验证失败 |
| D02-V03 | 缺少valueB | 已登录admin | POST Body: `{category:"appearance",valueA:"红色"}` | 400, 验证失败 |
| D02-V04 | category非字符串 | 已登录admin | POST Body: `{category:123,valueA:"红色",valueB:"绿色"}` | 400, 验证失败 |
| D02-V05 | valueA非字符串 | 已登录admin | POST Body: `{category:"appearance",valueA:123,valueB:"绿色"}` | 400, 验证失败 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D02-R01 | 未登录创建 | 不携带Token | POST /api/enums/exclusions | 401 |
| D02-R02 | formulist角色创建 | 已登录formulist | POST Body: `{category:"appearance",valueA:"红色",valueB:"绿色"}` | 403, 无权限（requirePermission("admin")） |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D02-DC01 | 创建后数据库记录正确 | 已登录admin | POST创建 | enum_exclusions表新增记录，valueA≤valueB（字典序） |
| D02-DC02 | 创建后返回含label | 已登录admin | POST创建 | 返回数据含labelA和labelB（从enum_options关联查询） |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D02-I01 | 重复创建相同规则 | 已登录admin | 连续两次POST相同body | 第二次409, DUPLICATE_ENTRY |

---

### D03 DELETE /api/enums/exclusions/:id — 删除互斥规则

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D03-P01 | 删除存在的规则 | 1. 已登录admin<br>2. id=exc-001存在 | DELETE /api/enums/exclusions/exc-001 | 200, `{success:true, data:{deletedId:"exc-001"}, message:"互斥规则删除成功"}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D03-E01 | 规则不存在 | 已登录admin | DELETE /api/enums/exclusions/nonexistent | 404, `{success:false, error:{message:"互斥规则不存在", code:"NOT_FOUND"}}` |
| D03-E02 | 数据库删除异常 | 模拟异常 | DELETE /api/enums/exclusions/exc-001 | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D03-B01 | id含特殊字符 | 已登录admin | DELETE /api/enums/exclusions/test'OR1=1 | 404, 规则不存在 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D03-R01 | 未登录删除 | 不携带Token | DELETE /api/enums/exclusions/exc-001 | 401 |
| D03-R02 | formulist角色删除 | 已登录formulist | DELETE /api/enums/exclusions/exc-001 | 403, 无权限 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D03-DC01 | 删除后数据库记录移除 | 已登录admin | DELETE | enum_exclusions表对应记录已删除 |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| D03-I01 | 重复删除同一规则 | 已登录admin | 连续两次DELETE | 第二次404, "互斥规则不存在" |

## 三、特殊场景测试

### X-CS 级联操作
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CS01 | 删除规则后列表不再包含 | 1. 已登录admin<br>2. exc-001存在 | 1. DELETE /api/enums/exclusions/exc-001<br>2. GET /api/enums/exclusions | 列表中不再包含exc-001 |

### X-MD 请求方法限制
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-MD01 | PUT请求到POST端点 | 已登录admin | PUT /api/enums/exclusions | 404 |
| X-MD02 | POST请求到DELETE端点 | 已登录admin | POST /api/enums/exclusions/exc-001 | 404 |

### X-SE 错误信息安全
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-SE01 | 500错误不暴露堆栈 | 触发服务端异常 | 任意触发500的请求 | 响应不包含堆栈信息、SQL语句 |
| X-SE02 | 409错误含DUPLICATE_ENTRY码 | 已登录admin，重复创建 | POST创建已存在的规则 | `{success:false, error:{code:"DUPLICATE_ENTRY"}}` |

### X-RF 响应格式一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-RF01 | 成功响应格式 | 已登录用户 | GET /api/enums/exclusions | `{success:true, data:{appearance:[...], taste:[...]}}` |
| X-RF02 | 创建成功响应格式 | 已登录admin | POST创建 | 201, `{success:true, data:{id, category, valueA, valueB, labelA, labelB}}` |
| X-RF03 | 删除成功响应格式 | 已登录admin | DELETE | 200, `{success:true, data:{deletedId}, message:"互斥规则删除成功"}` |

### X-CT Content-Type校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CT01 | POST请求非JSON | 已登录admin | POST Content-Type: text/plain | 400 或 解析失败 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| D01 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 6 |
| D02 | 3 | 6 | 2 | 2 | 5 | 0 | 2 | 1 | 0 | 21 |
| D03 | 1 | 2 | 1 | 2 | 0 | 0 | 1 | 1 | 0 | 8 |
| **合计** | **6** | **9** | **3** | **6** | **5** | **0** | **3** | **2** | **1** | **35** |

特殊场景：X-CS(1) + X-MD(2) + X-SE(2) + X-RF(3) + X-CT(1) = 9

**总用例数：35 + 9 = 44**（含3个端点，修正端点数为3）
