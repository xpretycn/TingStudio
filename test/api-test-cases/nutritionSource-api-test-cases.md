# 营养来源 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-NS-20260607-001 |
| 路由文件 | backend/src/routes/nutritionSource.ts |
| 控制器文件 | backend/src/controllers/nutritionSourceController.ts |
| Service文件 | backend/src/services/nutritionSourceService.ts |
| 端点数 | 8 |
| 测试用例数 | 98 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| B01 | GET | /api/nutrition/material/:materialId/sources | 必须 | 获取原料营养来源列表 |
| B02 | POST | /api/nutrition/material/:materialId/sources | 必须 | 添加营养来源 |
| B03 | GET | /api/nutrition/material/:materialId/sources/compare | 必须 | 获取来源对比数据 |
| B04 | PUT | /api/nutrition/material/:materialId/sources/:sourceId | 必须 | 更新来源数据 |
| B05 | DELETE | /api/nutrition/material/:materialId/sources/:sourceId | 必须 | 删除来源数据（软删除） |
| B06 | PUT | /api/nutrition/material/:materialId/authoritative | 必须 | 设定权威数据 |
| B07 | POST | /api/nutrition/material/:materialId/enrich-nutrition | 必须 | 智能补全营养数据 |
| B08 | POST | /api/nutrition/bulk-enrich-nutrition | 必须 | 批量智能补全 |

## 二、测试用例

### B01 GET /api/nutrition/material/:materialId/sources — 获取原料营养来源列表

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B01-P01 | 获取活跃来源列表 | 1. 已登录用户<br>2. materialId=mat-001存在且有活跃来源 | GET /api/nutrition/material/mat-001/sources | 200, `{success:true, data:[{sourceId, sourceType, per100g, confidence, isActive:1}]}` |
| B01-P02 | 获取包含非活跃来源 | 已登录用户 | GET /api/nutrition/material/mat-001/sources?includeInactive=true | 200, 返回含is_active=0的来源 |
| B01-P03 | 原料无来源数据 | 已登录用户 | GET /api/nutrition/material/mat-002/sources | 200, `{success:true, data:[]}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B01-E01 | 数据库查询异常 | 模拟数据库异常 | GET /api/nutrition/material/mat-001/sources | 500, `{success:false, message:"获取来源数据失败"}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B01-B01 | includeInactive非布尔值 | 已登录用户 | GET /api/nutrition/material/mat-001/sources?includeInactive=abc | 200, 默认不包含非活跃来源 |
| B01-B02 | 不存在的materialId | 已登录用户 | GET /api/nutrition/material/nonexistent/sources | 200, `{success:true, data:[]}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B01-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/material/mat-001/sources | 401 |
| B01-R02 | formulist角色访问 | 已登录formulist | GET /api/nutrition/material/mat-001/sources | 200, 正常返回 |

---

### B02 POST /api/nutrition/material/:materialId/sources — 添加营养来源

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B02-P01 | 添加manual来源 | 已登录用户 | POST Body: `{sourceType:"manual",per100g:{protein:5,fat:2,carbohydrate:10}}` | 200, `{success:true, data:{sourceId, materialId, sourceType:"manual"}}` |
| B02-P02 | 添加seed来源 | 已登录用户 | POST Body: `{sourceType:"seed",per100g:{protein:4.8,fat:1.9}}` | 200, 返回sourceId |
| B02-P03 | 添加ai来源含confidence | 已登录用户 | POST Body: `{sourceType:"ai",per100g:{protein:5},confidence:"high"}` | 200, confidence正确保存 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B02-E01 | 无效的sourceType | 已登录用户 | POST Body: `{sourceType:"invalid",per100g:{protein:5}}` | 400, 验证失败（enum校验） |
| B02-E02 | 原料不存在 | 已登录用户 | POST /api/nutrition/material/nonexistent/sources<br>Body: `{sourceType:"manual",per100g:{}}` | 400, `{success:false, message:"原料不存在"}` |
| B02-E03 | 数据库写入异常 | 模拟异常 | POST Body: `{sourceType:"manual",per100g:{protein:5}}` | 500, `{success:false, message:"添加来源数据失败"}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B02-B01 | per100g为空对象 | 已登录用户 | POST Body: `{sourceType:"manual",per100g:{}}` | 200, 创建成功（per100g为空） |
| B02-B02 | confidence为非法值 | 已登录用户 | POST Body: `{sourceType:"manual",per100g:{protein:5},confidence:"invalid"}` | 200, confidence默认为"medium" |
| B02-B03 | 同类型来源旧记录自动停用 | 1. 已有sourceType=manual的活跃来源 | POST Body: `{sourceType:"manual",per100g:{protein:6}}` | 200, 旧manual来源is_active变为0 |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B02-V01 | 缺少sourceType | 已登录用户 | POST Body: `{per100g:{protein:5}}` | 400, 验证失败 |
| B02-V02 | 缺少per100g | 已登录用户 | POST Body: `{sourceType:"manual"}` | 400, 验证失败 |
| B02-V03 | sourceType不在枚举中 | 已登录用户 | POST Body: `{sourceType:"custom",per100g:{}}` | 400, 验证失败 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B02-R01 | 未登录添加 | 不携带Token | POST /api/nutrition/material/mat-001/sources | 401 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B02-DC01 | 添加后数据库记录正确 | 已登录用户 | POST添加来源 | material_nutrition_sources表新增记录，is_active=1, created_by=userId |

---

### B03 GET /api/nutrition/material/:materialId/sources/compare — 获取来源对比数据

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B03-P01 | 多来源对比 | 1. 已登录用户<br>2. mat-001有2个以上活跃来源 | GET /api/nutrition/material/mat-001/sources/compare | 200, `{success:true, data:{materialId, materialName, authoritative:{...}, nutrients:[{field,label,authoritativeValue,sources:[...]}], summary:{totalSources,diffCount,maxDiffPercent}}}` |
| B03-P02 | 单来源对比 | 已登录用户，mat-002仅1个来源 | GET /api/nutrition/material/mat-002/sources/compare | 200, diffCount=0 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B03-E01 | 原料不存在 | 已登录用户 | GET /api/nutrition/material/nonexistent/sources/compare | 200, `{success:true, data:{materialId, materialName:null, authoritative:null, nutrients:[], summary:{totalSources:0}}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B03-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/material/mat-001/sources/compare | 401 |

---

### B04 PUT /api/nutrition/material/:materialId/sources/:sourceId — 更新来源数据

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B04-P01 | 更新sourceDetail和confidence | 1. 已登录用户<br>2. sourceId=src-001存在 | PUT Body: `{sourceDetail:"《中国食物成分表》v2.0",confidence:"high",notes:"更新备注"}` | 200, `{success:true, message:"来源数据已更新"}` |
| B04-P02 | 仅更新notes | 已登录用户 | PUT Body: `{notes:"新备注"}` | 200, 更新成功 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B04-E01 | 来源不存在 | 已登录用户 | PUT /api/nutrition/material/mat-001/sources/nonexistent<br>Body: `{notes:"test"}` | 400, `{success:false, message:"来源数据不存在"}` |
| B04-E02 | materialId与sourceId不匹配 | 已登录用户 | PUT /api/nutrition/material/mat-002/sources/src-001<br>Body: `{notes:"test"}` | 400, "来源数据不存在" |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B04-B01 | 无更新字段 | 已登录用户 | PUT Body: `{}` | 200, `{success:true}`（无实际更新） |
| B04-B02 | confidence非法值 | 已登录用户 | PUT Body: `{confidence:"invalid"}` | 200, confidence不更新（非法值被忽略） |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B04-R01 | 未登录更新 | 不携带Token | PUT /api/nutrition/material/mat-001/sources/src-001 | 401 |

---

### B05 DELETE /api/nutrition/material/:materialId/sources/:sourceId — 删除来源数据

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B05-P01 | admin删除来源 | 1. 已登录admin用户<br>2. sourceId=src-001存在且is_active=1 | DELETE /api/nutrition/material/mat-001/sources/src-001 | 200, `{success:true, message:"来源数据已删除"}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B05-E01 | 来源不存在 | 已登录admin | DELETE /api/nutrition/material/mat-001/sources/nonexistent | 400, `{success:false, message:"来源数据不存在"}` |
| B05-E02 | 来源已删除 | 1. 已登录admin<br>2. sourceId=src-001的is_active=0 | DELETE /api/nutrition/material/mat-001/sources/src-001 | 400, `{success:false, message:"来源数据已被删除"}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B05-R01 | 未登录删除 | 不携带Token | DELETE /api/nutrition/material/mat-001/sources/src-001 | 401 |
| B05-R02 | formulist角色删除 | 已登录formulist | DELETE /api/nutrition/material/mat-001/sources/src-001 | 200, `{success:true, message:"非管理员，跳过删除操作"}` |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B05-DC01 | 软删除后is_active=0 | 已登录admin | DELETE | 数据库中is_active=0，记录仍存在 |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B05-I01 | 重复删除同一来源 | 已登录admin | 连续两次DELETE | 第二次400, "来源数据已被删除" |

---

### B06 PUT /api/nutrition/material/:materialId/authoritative — 设定权威数据

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B06-P01 | admin设定权威数据 | 1. 已登录admin用户<br>2. mat-001存在且有活跃来源 | PUT Body: `{fieldSelections:{protein:"src-001",fat:"src-002"}}` | 200, `{success:true, data:{materialId, updatedFields:2, sourceType, fieldSources}}` |
| B06-P02 | 单字段设定 | 已登录admin | PUT Body: `{fieldSelections:{protein:"src-001"}}` | 200, updatedFields=1 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B06-E01 | 原料不存在 | 已登录admin | PUT /api/nutrition/material/nonexistent/authoritative<br>Body: `{fieldSelections:{protein:"src-001"}}` | 400, `{success:false, message:"原料不存在"}` |
| B06-E02 | 来源不存在或不活跃 | 已登录admin | PUT Body: `{fieldSelections:{protein:"nonexistent-src"}}` | 400, `{success:false, message:"来源数据不存在或不活跃"}` |
| B06-E03 | fieldSelections为空 | 已登录admin | PUT Body: `{fieldSelections:{}}` | 400, `{success:false, message:"未指定来源"}` |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B06-V01 | 缺少fieldSelections | 已登录admin | PUT Body: `{}` | 400, 验证失败 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B06-R01 | 未登录设定 | 不携带Token | PUT /api/nutrition/material/mat-001/authoritative | 401 |
| B06-R02 | formulist角色设定 | 已登录formulist | PUT Body: `{fieldSelections:{protein:"src-001"}}` | 200, `{success:true, message:"非管理员，跳过设定操作"}` |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B06-DC01 | 设定后material_nutrition更新 | 已登录admin | PUT设定权威 | material_nutrition表per_100g_json、field_sources_json、source_type更新 |
| B06-DC02 | 多来源组合sourceType为composite | 已登录admin | PUT Body: `{fieldSelections:{protein:"src-001(manual)",fat:"src-002(seed)"}}` | sourceType="composite" |
| B06-DC03 | 能量自动重算 | 已登录admin | PUT Body: `{fieldSelections:{protein:"src-001",fat:"src-002",carbohydrate:"src-003"}}` | energy = protein×17 + fat×37 + carb×17 |

---

### B07 POST /api/nutrition/material/:materialId/enrich-nutrition — 智能补全营养数据

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B07-P01 | 正常补全 | 1. 已登录用户<br>2. EXTERNAL_NUTRITION_ENABLED=true或NODE_ENV=development<br>3. mat-001存在 | POST /api/nutrition/material/mat-001/enrich-nutrition | 200, `{success:true, data:{materialId, materialName, results, summary}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B07-E01 | 外部功能未启用 | 1. EXTERNAL_NUTRITION_ENABLED!=true<br>2. NODE_ENV=production | POST /api/nutrition/material/mat-001/enrich-nutrition | 503, `{success:false, message:"外部营养数据功能未启用"}` |
| B07-E02 | 原料不存在 | 已登录用户，功能已启用 | POST /api/nutrition/material/nonexistent/enrich-nutrition | 404, `{success:false, message:"原料不存在"}` |
| B07-E03 | 外部服务异常 | 已登录用户，外部API超时 | POST /api/nutrition/material/mat-001/enrich-nutrition | 500, `{success:false, message:"获取外部营养数据失败"}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B07-R01 | 未登录访问 | 不携带Token | POST /api/nutrition/material/mat-001/enrich-nutrition | 401 |

---

### B08 POST /api/nutrition/bulk-enrich-nutrition — 批量智能补全

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B08-P01 | admin批量补全 | 1. 已登录admin用户<br>2. 功能已启用 | POST Body: `{materialIds:["mat-001","mat-002"],sources:["tianapi","seed"]}` | 200, `{success:true, data:{successCount, failedCount, results}}` |
| B08-P02 | 带overwriteExisting | 已登录admin | POST Body: `{materialIds:["mat-001"],overwriteExisting:true}` | 200, 已有营养数据的原料也被覆盖 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B08-E01 | 外部功能未启用 | NODE_ENV=production | POST Body: `{materialIds:["mat-001"]}` | 503, `{success:false, message:"外部营养数据功能未启用"}` |
| B08-E02 | 批量补全异常 | 已登录admin，外部服务异常 | POST Body: `{materialIds:["mat-001"]}` | 500, `{success:false, message:"批量补全失败"}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B08-B01 | materialIds为空数组 | 已登录admin | POST Body: `{materialIds:[]}` | 200, successCount=0 |
| B08-B02 | 不带materialIds | 已登录admin | POST Body: `{}` | 200, 默认为空数组 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| B08-R01 | 未登录访问 | 不携带Token | POST /api/nutrition/bulk-enrich-nutrition | 401 |
| B08-R02 | formulist角色 | 已登录formulist | POST Body: `{materialIds:["mat-001"]}` | 200, `{success:true, data:{successCount:0, failedCount:0}, message:"非管理员，跳过批量补全操作"}` |

## 三、特殊场景测试

### X-CS 级联操作
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CS01 | 添加同类型来源时旧来源自动停用 | 1. mat-001已有sourceType=manual的活跃来源 | POST添加新的manual来源 | 旧manual来源is_active变为0 |
| X-CS02 | 设定权威后material_nutrition同步更新 | 1. mat-001有多个来源 | PUT设定权威 | material_nutrition表per_100g_json更新为选定来源的值 |

### X-BT 批量操作
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-BT01 | 批量补全多个原料 | 已登录admin，3个原料 | POST Body: `{materialIds:["mat-001","mat-002","mat-003"]}` | 200, 返回每个原料的补全结果 |

### X-MD 请求方法限制
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-MD01 | DELETE请求到GET端点 | 已登录用户 | DELETE /api/nutrition/material/mat-001/sources | 404 |
| X-MD02 | GET请求到POST端点 | 已登录用户 | GET /api/nutrition/material/mat-001/enrich-nutrition | 404 |

### X-SE 错误信息安全
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-SE01 | 500错误不暴露堆栈 | 触发服务端异常 | 任意触发500的请求 | 响应不包含堆栈信息、SQL语句 |

### X-RF 响应格式一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-RF01 | 成功响应格式 | 已登录用户 | GET /api/nutrition/material/mat-001/sources | `{success:true, data:[...]}` |
| X-RF02 | 错误响应格式 | 已登录用户 | POST无效sourceType | `{success:false, message:"..."}` |

### X-CT Content-Type校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CT01 | POST请求非JSON | 已登录用户 | POST Content-Type: text/plain | 400 或 解析失败 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| B01 | 3 | 1 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 8 |
| B02 | 3 | 3 | 3 | 1 | 3 | 0 | 1 | 0 | 0 | 14 |
| B03 | 2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| B04 | 2 | 2 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 7 |
| B05 | 1 | 2 | 0 | 2 | 0 | 0 | 1 | 1 | 0 | 7 |
| B06 | 2 | 3 | 0 | 2 | 1 | 0 | 3 | 0 | 0 | 11 |
| B07 | 1 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 5 |
| B08 | 2 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 8 |
| **合计** | **16** | **17** | **9** | **12** | **4** | **0** | **5** | **1** | **0** | **64** |

特殊场景：X-CS(2) + X-BT(1) + X-MD(2) + X-SE(1) + X-RF(2) + X-CT(1) = 9

**总用例数：64 + 9 = 73**（含8个端点，修正端点数为8）
