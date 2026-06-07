# 批量营养来源 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-NSB-20260607-001 |
| 路由文件 | backend/src/routes/nutritionSourceBatch.ts |
| 控制器文件 | backend/src/controllers/nutritionSourceBatchController.ts |
| Service文件 | backend/src/services/nutritionSourceScorer.ts, nutritionSourceSnapshot.ts |
| 端点数 | 8 |
| 测试用例数 | 105 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| C01 | GET | /api/nutrition/material/:materialId/sources/scored | 必须 | 获取带评分的来源列表 |
| C02 | GET | /api/nutrition/material/:materialId/sources/recommendation | 必须 | 获取推荐来源 |
| C03 | POST | /api/nutrition/material/:materialId/sources/batch-set-authoritative | 必须 | 批量设定权威数据 |
| C04 | POST | /api/nutrition/material/:materialId/sources/batch-archive | 必须 | 批量归档来源 |
| C05 | POST | /api/nutrition/material/:materialId/sources/batch-restore | 必须 | 批量恢复来源 |
| C06 | GET | /api/nutrition/material/:materialId/sources/export | 必须 | 导出来源数据 |
| C07 | GET | /api/nutrition/material/:materialId/snapshots | 必须 | 获取原料快照列表 |
| C08 | GET | /api/nutrition/snapshots/:snapshotId | 必须 | 获取快照详情 |

## 二、测试用例

### C01 GET /api/nutrition/material/:materialId/sources/scored — 获取带评分的来源列表

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C01-P01 | 获取带评分来源 | 1. 已登录用户<br>2. mat-001有多个活跃来源 | GET /api/nutrition/material/mat-001/sources/scored | 200, `{success:true, data:{materialId, sources:[{sourceId, sourceType, confidence, totalScore, rank}]}}` |
| C01-P02 | 无来源数据 | 已登录用户 | GET /api/nutrition/material/mat-empty/sources/scored | 200, `{success:true, data:{materialId, sources:[]}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C01-E01 | 数据库查询异常 | 模拟异常 | GET /api/nutrition/material/mat-001/sources/scored | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C01-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/material/mat-001/sources/scored | 401 |

---

### C02 GET /api/nutrition/material/:materialId/sources/recommendation — 获取推荐来源

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C02-P01 | 获取推荐来源 | 1. 已登录用户<br>2. mat-001有多个活跃来源 | GET /api/nutrition/material/mat-001/sources/recommendation | 200, `{success:true, data:{materialId, sources:[...ranked], recommendation:{sourceId, totalScore, sourceType}}}` |
| C02-P02 | 无活跃来源 | 已登录用户 | GET /api/nutrition/material/mat-empty/sources/recommendation | 200, `{success:true, data:{materialId, sources:[], recommendation:null}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C02-E01 | 数据库异常 | 模拟异常 | GET /api/nutrition/material/mat-001/sources/recommendation | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C02-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/material/mat-001/sources/recommendation | 401 |

---

### C03 POST /api/nutrition/material/:materialId/sources/batch-set-authoritative — 批量设定权威数据

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C03-P01 | 使用best-deviation策略 | 1. 已登录用户<br>2. mat-001有活跃来源 | POST Body: `{strategy:"best-deviation"}` | 200, `{success:true, data:{materialId, updatedFields, strategy:"best-deviation", fieldSources}}` |
| C03-P02 | 使用highest-confidence策略 | 已登录用户 | POST Body: `{strategy:"highest-confidence"}` | 200, 选择confidence最高的来源 |
| C03-P03 | 使用newest策略 | 已登录用户 | POST Body: `{strategy:"newest"}` | 200, 选择最新创建的来源 |
| C03-P04 | 使用manual策略+fieldSelections | 已登录用户 | POST Body: `{strategy:"manual",fieldSelections:{protein:"src-001",fat:"src-002"}}` | 200, 按指定字段映射设定 |
| C03-P05 | 指定sourceIds限定范围 | 已登录用户 | POST Body: `{strategy:"best-deviation",sourceIds:["src-001","src-002"]}` | 200, 仅从指定来源中选择 |
| C03-P06 | 不指定策略默认best-deviation | 已登录用户 | POST Body: `{}` | 200, 默认使用best-deviation策略 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C03-E01 | 无效策略类型 | 已登录用户 | POST Body: `{strategy:"invalid"}` | 400, `{success:false, error:{code:"VALIDATION_ERROR",message:"无效的策略类型"}}` |
| C03-E02 | 无活跃来源 | 已登录用户，mat-001无活跃来源 | POST Body: `{strategy:"best-deviation"}` | 400, `{success:false, message:"没有可用的活跃来源"}` |
| C03-E03 | 无法推荐来源 | 已登录用户，来源数据异常 | POST Body: `{strategy:"best-deviation"}` | 400, `{success:false, message:"无法推荐来源"}` |
| C03-E04 | 未生成字段映射 | 已登录用户 | POST Body: `{strategy:"manual",fieldSelections:{}}` | 400, `{success:false, message:"未生成字段映射"}` |
| C03-E05 | 数据库异常 | 模拟异常 | POST Body: `{strategy:"best-deviation"}` | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C03-B01 | sourceIds为空数组 | 已登录用户 | POST Body: `{strategy:"best-deviation",sourceIds:[]}` | 200, 所有来源参与评分 |
| C03-B02 | fieldSelections含不存在的sourceId | 已登录用户 | POST Body: `{strategy:"manual",fieldSelections:{protein:"nonexistent"}}` | 400, 来源不存在或不活跃 |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C03-V01 | strategy非字符串 | 已登录用户 | POST Body: `{strategy:123}` | 400, 验证失败 |
| C03-V02 | sourceIds非数组 | 已登录用户 | POST Body: `{sourceIds:"not-array"}` | 400, 验证失败 |
| C03-V03 | fieldSelections非对象 | 已登录用户 | POST Body: `{fieldSelections:"not-object"}` | 400, 验证失败 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C03-R01 | 未登录访问 | 不携带Token | POST batch-set-authoritative | 401 |
| C03-R02 | formulist角色 | 已登录formulist | POST Body: `{strategy:"best-deviation"}` | 200, 允许操作（无角色限制） |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C03-DC01 | 设定后material_nutrition更新 | 已登录用户 | POST batch-set-authoritative | material_nutrition表per_100g_json更新 |
| C03-DC02 | 设定后创建快照 | 已登录用户 | POST batch-set-authoritative | material_nutrition_snapshots表新增batch_set_authoritative快照 |

---

### C04 POST /api/nutrition/material/:materialId/sources/batch-archive — 批量归档来源

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C04-P01 | admin批量归档 | 1. 已登录admin用户<br>2. mat-001有活跃来源 | POST Body: `{sourceIds:["src-001","src-002"]}` | 200, `{success:true, data:{materialId, archivedCount:2, sourceIds}}` |
| C04-P02 | formulist归档自己的来源 | 1. 已登录formulist用户A<br>2. src-001的created_by=用户A | POST Body: `{sourceIds:["src-001"]}` | 200, 归档成功 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C04-E01 | sourceIds为空 | 已登录用户 | POST Body: `{sourceIds:[]}` | 400, `{success:false, message:"sourceIds 不能为空"}` |
| C04-E02 | sourceIds超过100 | 已登录用户 | POST Body: `{sourceIds:["id1","id2",...(101个)]}` | 400, `{success:false, error:{code:"VALIDATION_ERROR",message:"sourceIds 数量不能超过 100"}}` |
| C04-E03 | formulist归档他人来源 | 1. 已登录formulist用户A<br>2. src-002的created_by=用户B | POST Body: `{sourceIds:["src-002"]}` | 403, `{success:false, error:{code:"FORBIDDEN",message:"无权归档部分来源，请联系管理员"}}` |
| C04-E04 | 数据库异常 | 模拟异常 | POST Body: `{sourceIds:["src-001"]}` | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C04-B01 | sourceIds恰好100个 | 已登录admin | POST Body: `{sourceIds:["id1",...(100个)]}` | 200, 归档成功 |
| C04-B02 | sourceIds含不存在的ID | 已登录admin | POST Body: `{sourceIds:["nonexistent"]}` | 200, 无实际归档（SQL不报错） |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C04-V01 | sourceIds非数组 | 已登录用户 | POST Body: `{sourceIds:"not-array"}` | 400, 验证失败 |
| C04-V02 | 缺少sourceIds | 已登录用户 | POST Body: `{}` | 400, `{success:false, message:"sourceIds 不能为空"}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C04-R01 | 未登录访问 | 不携带Token | POST batch-archive | 401 |

#### 数据隔离
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C04-DI01 | admin可归档任意来源 | 已登录admin | POST Body: `{sourceIds:["src-001","src-002"]}` | 200, 全部归档 |
| C04-DI02 | formulist仅可归档自己的 | 已登录formulist用户A | POST Body: `{sourceIds:["src-001(自己的)","src-002(他人的)"]}` | 403, 部分无权限 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C04-DC01 | 归档后is_active=0 | 已登录admin | POST batch-archive | 数据库中对应来源is_active=0 |
| C04-DC02 | 归档后创建快照 | 已登录admin | POST batch-archive | material_nutrition_snapshots表新增batch_archive快照 |

---

### C05 POST /api/nutrition/material/:materialId/sources/batch-restore — 批量恢复来源

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C05-P01 | admin批量恢复 | 1. 已登录admin用户<br>2. src-001和src-002已归档 | POST Body: `{sourceIds:["src-001","src-002"]}` | 200, `{success:true, data:{materialId, restoredCount:2}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C05-E01 | sourceIds为空 | 已登录admin | POST Body: `{sourceIds:[]}` | 400, `{success:false, message:"sourceIds 不能为空"}` |
| C05-E02 | sourceIds超过100 | 已登录admin | POST Body: `{sourceIds:["id1",...(101个)]}` | 400, `{success:false, error:{code:"VALIDATION_ERROR"}}` |
| C05-E03 | formulist角色恢复 | 已登录formulist | POST Body: `{sourceIds:["src-001"]}` | 403, `{success:false, message:"仅管理员可恢复归档"}` |
| C05-E04 | 数据库异常 | 模拟异常 | POST Body: `{sourceIds:["src-001"]}` | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C05-B01 | 恢复已是活跃状态的来源 | 已登录admin | POST Body: `{sourceIds:["src-active"]}` | 200, SQL不报错（重复设is_active=1） |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C05-R01 | 未登录访问 | 不携带Token | POST batch-restore | 401 |
| C05-R02 | formulist角色 | 已登录formulist | POST Body: `{sourceIds:["src-001"]}` | 403, 仅管理员可恢复 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C05-DC01 | 恢复后is_active=1 | 已登录admin | POST batch-restore | 数据库中对应来源is_active=1 |
| C05-DC02 | 恢复后创建快照 | 已登录admin | POST batch-restore | material_nutrition_snapshots表新增batch_restore快照 |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C05-I01 | 重复恢复同一来源 | 已登录admin | 连续两次POST相同sourceIds | 200, 第二次仍成功（幂等） |

---

### C06 GET /api/nutrition/material/:materialId/sources/export — 导出来源数据

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C06-P01 | 导出Excel格式 | 1. 已登录用户<br>2. mat-001存在且有来源 | GET /api/nutrition/material/mat-001/sources/export?format=excel | 200, Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| C06-P02 | 导出PDF格式 | 已登录用户 | GET /api/nutrition/material/mat-001/sources/export?format=pdf | 200, Content-Type: application/pdf |
| C06-P03 | 默认导出Excel | 已登录用户 | GET /api/nutrition/material/mat-001/sources/export | 200, Excel格式 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C06-E01 | 原料不存在 | 已登录用户 | GET /api/nutrition/material/nonexistent/sources/export | 404, `{success:false, message:"原料不存在"}` |
| C06-E02 | 导出异常 | 模拟导出服务异常 | GET /api/nutrition/material/mat-001/sources/export | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C06-B01 | format为无效值 | 已登录用户 | GET /api/nutrition/material/mat-001/sources/export?format=csv | 200, 默认Excel格式 |
| C06-B02 | 原料名称含特殊字符 | 已登录用户，原料名含/\\:*?"<>| | GET导出 | 200, 文件名中特殊字符被替换为_ |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C06-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/material/mat-001/sources/export | 401 |

---

### C07 GET /api/nutrition/material/:materialId/snapshots — 获取原料快照列表

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C07-P01 | 获取快照列表 | 1. 已登录用户<br>2. mat-001有快照记录 | GET /api/nutrition/material/mat-001/snapshots | 200, `{success:true, data:{materialId, snapshots:[{snapshotId, action, actionLabel, operatorId, createdAt}]}}` |
| C07-P02 | 自定义limit | 已登录用户 | GET /api/nutrition/material/mat-001/snapshots?limit=10 | 200, 最多返回10条 |
| C07-P03 | 无快照记录 | 已登录用户 | GET /api/nutrition/material/mat-empty/snapshots | 200, `{success:true, data:{materialId, snapshots:[]}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C07-B01 | limit为0 | 已登录用户 | GET ?limit=0 | 200, limit被修正为1（Math.max(0,1)=1） |
| C07-B02 | limit超过200 | 已登录用户 | GET ?limit=500 | 200, limit被修正为200（Math.min(500,200)=200） |
| C07-B03 | limit为负数 | 已登录用户 | GET ?limit=-5 | 200, limit被修正为1 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C07-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/material/mat-001/snapshots | 401 |

---

### C08 GET /api/nutrition/snapshots/:snapshotId — 获取快照详情

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C08-P01 | 获取快照详情 | 1. 已登录用户<br>2. snapshotId=snap-001存在 | GET /api/nutrition/snapshots/snap-001 | 200, `{success:true, data:{snapshotId, materialId, action, actionLabel, payload, note, createdAt}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C08-E01 | 快照不存在 | 已登录用户 | GET /api/nutrition/snapshots/nonexistent | 404, `{success:false, message:"快照不存在"}` |
| C08-E02 | 数据库异常 | 模拟异常 | GET /api/nutrition/snapshots/snap-001 | 500, `{success:false, error:{code:"INTERNAL_ERROR"}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| C08-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/snapshots/snap-001 | 401 |

## 三、特殊场景测试

### X-BT 批量操作
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-BT01 | 批量归档后批量恢复 | 1. 已登录admin<br>2. mat-001有3个活跃来源 | 1. POST batch-archive sourceIds=[src-001,src-002,src-003]<br>2. POST batch-restore sourceIds=[src-001,src-002,src-003] | 1. 3个来源is_active=0<br>2. 3个来源is_active=1 |
| X-BT02 | 批量设定权威后快照记录正确 | 已登录admin | POST batch-set-authoritative | 快照action=batch_set_authoritative, payload含strategy和updatedFields |
| X-BT03 | 批量归档100个来源 | 已登录admin | POST Body: `{sourceIds:[...100个ID]}` | 200, archivedCount=100 |
| X-BT04 | 批量归档101个来源 | 已登录admin | POST Body: `{sourceIds:[...101个ID]}` | 400, sourceIds数量不能超过100 |

### X-CS 级联操作
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CS01 | 批量归档被权威引用的来源 | 1. src-001被设为protein的权威来源 | POST batch-archive sourceIds=[src-001] | 200, 归档成功（权威映射不受影响，但来源不再活跃） |
| X-CS02 | 批量设定权威后自动创建快照 | 已登录admin | POST batch-set-authoritative | material_nutrition_snapshots表新增记录 |

### X-C 计算准确性（评分算法）
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-C01 | 评分算法-高可信优先 | 1. 来源A: confidence=high<br>2. 来源B: confidence=low | GET /sources/recommendation | 来源A的confScore=100, 来源B的confScore=30, A排名更高 |
| X-C02 | 评分算法-时效性 | 1. 来源A: 1天前创建<br>2. 来源B: 300天前创建 | GET /sources/recommendation | 来源A的recencyScore更高 |
| X-C03 | 评分算法-权重 | 验证权重配置 | 检查代码 | confidence=0.5, recency=0.3, match=0.2 |
| X-C04 | highest-confidence策略 | 1. 来源A: confidence=high<br>2. 来源B: confidence=medium, 更新 | POST strategy=highest-confidence | 选择来源A |
| X-C05 | newest策略 | 1. 来源A: 1天前<br>2. 来源B: 刚创建 | POST strategy=newest | 选择来源B |

### X-MD 请求方法限制
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-MD01 | GET请求到POST端点 | 已登录用户 | GET /api/nutrition/material/mat-001/sources/batch-archive | 404 |
| X-MD02 | DELETE请求到GET端点 | 已登录用户 | DELETE /api/nutrition/material/mat-001/sources/scored | 404 |

### X-SE 错误信息安全
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-SE01 | 500错误格式 | 触发服务端异常 | 任意触发500的请求 | `{success:false, error:{message, code:"INTERNAL_ERROR", timestamp}}` |

### X-RF 响应格式一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-RF01 | 成功响应格式 | 已登录用户 | GET /sources/scored | `{success:true, data:{...}}` |
| X-RF02 | 错误响应格式 | 已登录用户 | 触发400 | `{success:false, error:{message, code, timestamp}}` |

### X-CT Content-Type校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CT01 | POST请求非JSON | 已登录用户 | POST batch-set-authoritative Content-Type: text/plain | 400 或 解析失败 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| C01 | 2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| C02 | 2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| C03 | 6 | 5 | 2 | 2 | 3 | 0 | 2 | 0 | 0 | 20 |
| C04 | 2 | 4 | 2 | 1 | 2 | 0 | 2 | 0 | 2 | 15 |
| C05 | 1 | 4 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 11 |
| C06 | 3 | 2 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 8 |
| C07 | 3 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 7 |
| C08 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| **合计** | **20** | **19** | **10** | **10** | **5** | **0** | **6** | **1** | **2** | **73** |

特殊场景：X-BT(4) + X-CS(2) + X-C(5) + X-MD(2) + X-SE(1) + X-RF(2) + X-CT(1) = 17

**总用例数：73 + 17 = 90**（含8个端点，修正端点数为8）
