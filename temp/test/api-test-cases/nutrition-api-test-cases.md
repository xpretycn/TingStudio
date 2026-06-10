# 营养数据 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-NUT-20260607-001 |
| 路由文件 | backend/src/routes/nutrition.ts |
| 控制器文件 | backend/src/controllers/nutritionController.ts |
| Service文件 | backend/src/services/nutritionService.ts |
| 端点数 | 9 |
| 测试用例数 | 131 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| A01 | GET | /api/nutrition/material/:materialId | 必须 | 获取原料营养成分 |
| A02 | PUT | /api/nutrition/material/:materialId | 必须 | 设置原料营养成分 |
| A03 | POST | /api/nutrition/calculate/:formulaId | 必须 | 计算配方营养 |
| A04 | GET | /api/nutrition/tables/:formulaId | 必须 | 获取配方营养表格 |
| A05 | GET | /api/nutrition/profiles | 必须 | 获取营养标准列表 |
| A06 | POST | /api/nutrition/profiles | 必须 | 创建营养标准 |
| A07 | PUT | /api/nutrition/profiles/:profileId | 必须 | 更新营养标准 |
| A08 | DELETE | /api/nutrition/profiles/:profileId | 必须 | 删除营养标准 |
| A09 | POST | /api/nutrition/compliance/:formulaId | 必须 | 营养合规检查 |
| A10 | POST | /api/nutrition/analyze/:formulaId | 必须 | 营养分析 |
| A11 | GET | /api/nutrition/coverage/:formulaId | 必须 | 获取营养覆盖度 |

## 二、测试用例

### A01 GET /api/nutrition/material/:materialId — 获取原料营养成分

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A01-P01 | 获取已有营养成分的原料 | 1. 已登录admin用户<br>2. 数据库存在materialId=mat-001，且有material_nutrition记录 | GET /api/nutrition/material/mat-001 | 200, `{success:true, data:{materialId, per100g:{energy:...,protein:...}, sourceType, fieldSources}}` |
| A01-P02 | 获取无营养成分的原料 | 1. 已登录用户<br>2. 数据库存在materialId=mat-002，但无material_nutrition记录 | GET /api/nutrition/material/mat-002 | 200, `{success:true, data:null}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A01-E01 | 不存在的materialId | 已登录用户 | GET /api/nutrition/material/nonexistent-id | 200, `{success:true, data:null}` |
| A01-E02 | 数据库查询异常 | 已登录用户，模拟数据库异常 | GET /api/nutrition/material/mat-001 | 500, `{success:false, message:"获取营养成分失败"}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A01-B01 | materialId为空字符串 | 已登录用户 | GET /api/nutrition/material/ | 路由不匹配，404 |
| A01-B02 | materialId含特殊字符 | 已登录用户 | GET /api/nutrition/material/test%27OR1%3D1 | 200, `{success:true, data:null}`（SQL注入无效） |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A01-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/material/mat-001 | 401, `{success:false, error:{code:"UNAUTHORIZED"}}` |
| A01-R02 | Token过期 | 携带过期Token | GET /api/nutrition/material/mat-001 | 401, `{success:false, error:{code:"TOKEN_EXPIRED"}}` |
| A01-R03 | formulist角色访问 | 已登录formulist用户 | GET /api/nutrition/material/mat-001 | 200, 正常返回数据 |

#### 数据隔离
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A01-DI01 | formulist查看他人原料的营养数据 | 1. formulist用户A<br>2. materialId为用户B创建的原料 | GET /api/nutrition/material/mat-other | 200, 正常返回（营养成分无数据隔离） |

---

### A02 PUT /api/nutrition/material/:materialId — 设置原料营养成分

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A02-P01 | 首次设置原料营养成分 | 1. 已登录admin用户<br>2. materialId=mat-001存在且无营养记录 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:5.2,fat:1.3,carbohydrate:10.5,sodium:50},confidence:"high"}` | 200, `{success:true, data:null, message:"营养成分已保存"}` |
| A02-P02 | 更新已有营养成分 | 1. 已登录用户<br>2. materialId=mat-001已有营养记录 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:6.0},confidence:"medium"}` | 200, 成功更新，旧值与新值合并 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A02-E01 | 原料不存在 | 已登录用户 | PUT /api/nutrition/material/nonexistent<br>Body: `{per100g:{protein:5}}` | 404, `{success:false, message:"原料不存在"}` |
| A02-E02 | per100g非对象 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:"invalid"}` | 400, 验证失败 |
| A02-E03 | 数据库写入异常 | 已登录用户，模拟数据库异常 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:5}}` | 500, `{success:false, message:"保存营养成分失败"}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A02-B01 | per100g为空对象 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{}}` | 400, 验证失败（per100g为必填对象） |
| A02-B02 | per100g含负数值 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:-5}}` | 200, 负值字段被删除（代码逻辑：val<0时delete） |
| A02-B03 | per100g含0值 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:0}}` | 200, protein被设为0 |
| A02-B04 | per100g含超大值 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:999999999}}` | 200, 正常保存 |
| A02-B05 | per100g含非数值字段 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:"abc"}}` | 200, 非number字段被删除 |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A02-V01 | 缺少per100g | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{confidence:"high"}` | 400, `{success:false, error:{code:"VALIDATION_ERROR"}}` |
| A02-V02 | confidence非字符串 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:5},confidence:123}` | 400, 验证失败 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A02-R01 | 未登录设置 | 不携带Token | PUT /api/nutrition/material/mat-001 | 401 |
| A02-R02 | formulist角色设置 | 已登录formulist用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:5}}` | 200, 允许操作 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A02-DC01 | 设置后数据库记录正确 | 1. 已登录用户<br>2. materialId=mat-001存在 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:5.2,fat:1.3}}` | 数据库material_nutrition表新增记录，per_100g_json包含对应值 |
| A02-DC02 | 更新后旧值保留，新值覆盖 | 1. 已有protein:5.2的记录 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{fat:2.0}}` | 数据库中protein仍为5.2，fat更新为2.0 |
| A02-DC03 | 设置后自动创建来源记录 | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Body: `{per100g:{protein:5}}` | material_nutrition_sources表新增一条source_type=manual的记录 |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A02-I01 | 重复设置相同数据 | 已登录用户 | 连续两次PUT相同body | 200, 第二次更新per_100g_json不变 |

---

### A03 POST /api/nutrition/calculate/:formulaId — 计算配方营养

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A03-P01 | 正常计算配方营养 | 1. 已登录admin用户<br>2. formulaId=f-001存在，含原料且均有营养数据<br>3. finishedWeight=100, ratioFactor=0.18 | POST /api/nutrition/calculate/f-001 | 200, `{success:true, data:{formulaId, totalWeight, totalNutrition, per100gNutrition, materialBreakdown}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A03-E01 | 配方不存在 | 已登录用户 | POST /api/nutrition/calculate/nonexistent | 404, `{success:false, message:"配方不存在"}` |
| A03-E02 | 计算过程异常 | 已登录用户，模拟数据库异常 | POST /api/nutrition/calculate/f-001 | 500, `{success:false, message:"营养计算失败"}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A03-B01 | 配方无原料 | 1. 已登录用户<br>2. formulaId=f-empty，materials_json=[] | POST /api/nutrition/calculate/f-empty | 200, totalWeight=0, 所有营养素为0 |
| A03-B02 | 配方成品重量为0 | 1. 已登录用户<br>2. formulaId=f-zero，finishedWeight=0 | POST /api/nutrition/calculate/f-zero | 200, ratio=0, per100gNutrition全为0 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A03-R01 | 未登录计算 | 不携带Token | POST /api/nutrition/calculate/f-001 | 401 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A03-DC01 | 计算后保存汇总到数据库 | 已登录用户 | POST /api/nutrition/calculate/f-001 | formula_nutrition_summaries表有对应记录 |
| A03-DC02 | 重复计算更新汇总 | 已登录用户 | 连续两次POST | formula_nutrition_summaries表仅一条记录，值已更新 |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A03-I01 | 重复计算结果一致 | 已登录用户 | 连续两次POST相同请求 | 两次返回的totalNutrition和per100gNutrition数值一致 |

---

### A04 GET /api/nutrition/tables/:formulaId — 获取配方营养表格

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A04-P01 | 获取已有快照的配方表格 | 1. 已登录用户<br>2. formulaId=f-001存在且有营养快照 | GET /api/nutrition/tables/f-001 | 200, `{success:true, data:{formulaId, formulaName, calcRows, summaryRow, nrvRow, nrvPercentRow, labelRows, fromSnapshot:true}}` |
| A04-P02 | 无快照时实时计算 | 1. 已登录用户<br>2. formulaId=f-002存在但无快照 | GET /api/nutrition/tables/f-002 | 200, `{success:true, data:{..., fromSnapshot:undefined}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A04-E01 | 配方不存在 | 已登录用户 | GET /api/nutrition/tables/nonexistent | 404, `{success:false, message:"配方不存在"}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A04-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/tables/f-001 | 401 |

---

### A05 GET /api/nutrition/profiles — 获取营养标准列表

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A05-P01 | 无筛选获取全部 | 已登录用户 | GET /api/nutrition/profiles | 200, `{success:true, data:[{profileId, name, category, targetValues, toleranceRanges, isPreset}]}` |
| A05-P02 | 按category筛选 | 已登录用户 | GET /api/nutrition/profiles?category=infant | 200, 返回category=infant的标准 |
| A05-P03 | 按keyword搜索 | 已登录用户 | GET /api/nutrition/profiles?keyword=婴儿 | 200, 返回名称含"婴儿"的标准 |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A05-B01 | keyword为空字符串 | 已登录用户 | GET /api/nutrition/profiles?keyword= | 200, 返回全部标准 |
| A05-B02 | category为无效值 | 已登录用户 | GET /api/nutrition/profiles?category=invalid | 200, 返回空列表 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A05-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/profiles | 401 |

---

### A06 POST /api/nutrition/profiles — 创建营养标准

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A06-P01 | 正常创建营养标准 | 已登录admin用户 | POST /api/nutrition/profiles<br>Body: `{name:"成人标准",targetValues:{protein:60,fat:60}}` | 201, `{success:true, data:{profileId}, message:"营养标准创建成功"}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A06-E01 | 数据库写入异常 | 已登录用户，模拟异常 | POST /api/nutrition/profiles<br>Body: `{name:"测试",targetValues:{}}` | 500, `{success:false, message:"创建营养标准失败"}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A06-B01 | name为1字符 | 已登录用户 | Body: `{name:"A",targetValues:{protein:60}}` | 201, 创建成功 |
| A06-B02 | name为100字符 | 已登录用户 | Body: `{name:"A"*100,targetValues:{protein:60}}` | 201, 创建成功 |
| A06-B03 | name为101字符 | 已登录用户 | Body: `{name:"A"*101,targetValues:{protein:60}}` | 400, 验证失败（maxLength:100） |
| A06-B04 | targetValues为空对象 | 已登录用户 | Body: `{name:"测试",targetValues:{}}` | 201, 创建成功 |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A06-V01 | 缺少name | 已登录用户 | Body: `{targetValues:{protein:60}}` | 400, 验证失败 |
| A06-V02 | 缺少targetValues | 已登录用户 | Body: `{name:"测试"}` | 400, 验证失败 |
| A06-V03 | name为空字符串 | 已登录用户 | Body: `{name:"",targetValues:{}}` | 400, 验证失败（minLength:1） |
| A06-V04 | targetValues非对象 | 已登录用户 | Body: `{name:"测试",targetValues:"invalid"}` | 400, 验证失败 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A06-R01 | 未登录创建 | 不携带Token | POST /api/nutrition/profiles | 401 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A06-DC01 | 创建后数据库记录正确 | 已登录用户 | POST创建 | nutrition_profiles表新增记录，is_preset=0, created_by=当前userId |

---

### A07 PUT /api/nutrition/profiles/:profileId — 更新营养标准

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A07-P01 | 更新自定义营养标准 | 1. 已登录用户<br>2. profileId=pf-001，is_preset=0 | PUT /api/nutrition/profiles/pf-001<br>Body: `{name:"更新名称",targetValues:{protein:65}}` | 200, `{success:true, message:"营养标准更新成功"}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A07-E01 | 更新预置标准 | 1. 已登录用户<br>2. profileId=pf-preset，is_preset=1 | PUT /api/nutrition/profiles/pf-preset<br>Body: `{name:"尝试修改"}` | 403, `{success:false, message:"预置营养标准不可修改"}` |
| A07-E02 | 标准不存在 | 已登录用户 | PUT /api/nutrition/profiles/nonexistent | 404, `{success:false, message:"营养标准不存在"}` |

#### 状态流转
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A07-S01 | 预置标准不可修改 | is_preset=1 | PUT更新 | 403, 禁止修改 |
| A07-S02 | 自定义标准可修改 | is_preset=0 | PUT更新 | 200, 修改成功 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A07-R01 | 未登录更新 | 不携带Token | PUT /api/nutrition/profiles/pf-001 | 401 |

---

### A08 DELETE /api/nutrition/profiles/:profileId — 删除营养标准

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A08-P01 | 删除自定义营养标准 | 1. 已登录用户<br>2. profileId=pf-001，is_preset=0 | DELETE /api/nutrition/profiles/pf-001 | 200, `{success:true, message:"营养标准删除成功"}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A08-E01 | 删除预置标准 | is_preset=1 | DELETE /api/nutrition/profiles/pf-preset | 403, `{success:false, message:"预置营养标准不可删除"}` |
| A08-E02 | 标准不存在 | 已登录用户 | DELETE /api/nutrition/profiles/nonexistent | 404, `{success:false, message:"营养标准不存在"}` |

#### 状态流转
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A08-S01 | 预置标准不可删除 | is_preset=1 | DELETE | 403, 禁止删除 |
| A08-S02 | 自定义标准可删除 | is_preset=0 | DELETE | 200, 删除成功 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A08-DC01 | 删除后数据库记录移除 | 已登录用户 | DELETE /api/nutrition/profiles/pf-001 | nutrition_profiles表对应记录已删除 |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A08-I01 | 重复删除同一标准 | 已登录用户 | 连续两次DELETE | 第二次404, "营养标准不存在" |

---

### A09 POST /api/nutrition/compliance/:formulaId — 营养合规检查

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A09-P01 | 合规检查通过 | 1. 已登录用户<br>2. formulaId=f-001已计算营养汇总<br>3. 营养值在标准范围内 | POST /api/nutrition/compliance/f-001<br>Body: `{profileId:"pf-001"}` | 200, `{success:true, data:{reportId, complianceCheck:[...], recommendations, summary:{passed:N,failed:0}}}` |
| A09-P02 | 合规检查不通过 | 1. 已登录用户<br>2. 营养值超出标准范围 | POST /api/nutrition/compliance/f-001<br>Body: `{profileId:"pf-strict"}` | 200, complianceCheck中有status="fail"项，recommendations中有priority="high" |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A09-E01 | 未计算营养汇总 | 已登录用户，配方无汇总记录 | POST /api/nutrition/compliance/f-nocalc | 404, `{success:false, message:"请先计算配方营养汇总"}` |
| A09-E02 | 不带profileId | 已登录用户 | POST /api/nutrition/compliance/f-001<br>Body: `{}` | 200, 无profile则无tolerance检查，仅返回pass状态 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A09-R01 | 未登录访问 | 不携带Token | POST /api/nutrition/compliance/f-001 | 401 |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A09-DC01 | 检查后保存报告 | 已登录用户 | POST合规检查 | nutrition_analysis_reports表新增记录 |

---

### A10 POST /api/nutrition/analyze/:formulaId — 营养分析

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A10-P01 | admin分析任意配方 | 1. 已登录admin用户<br>2. formulaId=f-001存在 | POST /api/nutrition/analyze/f-001 | 200, `{success:true, data:{...分析结果}}` |
| A10-P02 | formulist分析自己的配方 | 1. 已登录formulist用户A<br>2. f-001的created_by=用户A | POST /api/nutrition/analyze/f-001 | 200, 分析成功 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A10-E01 | 配方不存在 | 已登录用户 | POST /api/nutrition/analyze/nonexistent | 404, `{success:false, error:{code:"NOT_FOUND"}}` |
| A10-E02 | 配方无原料 | 1. 已登录用户<br>2. f-empty的materials_json=[] | POST /api/nutrition/analyze/f-empty | 400, `{success:false, error:{code:"VALIDATION_ERROR",message:"配方无原料"}}` |
| A10-E03 | 成品重量为0 | 1. 已登录用户<br>2. f-zero的finishedWeight=0 | POST /api/nutrition/analyze/f-zero | 400, `{success:false, error:{code:"VALIDATION_ERROR",message:"成品重量为0"}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A10-R01 | 未登录分析 | 不携带Token | POST /api/nutrition/analyze/f-001 | 401 |
| A10-R02 | formulist分析他人配方 | 1. 已登录formulist用户A<br>2. f-002的created_by=用户B | POST /api/nutrition/analyze/f-002 | 403, `{success:false, error:{code:"FORBIDDEN",message:"无权分析该配方"}}` |

#### 数据隔离
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A10-DI01 | admin可见全部配方 | 已登录admin | POST /api/nutrition/analyze/f-other | 200, 正常分析 |
| A10-DI02 | formulist仅可见自己的 | 已登录formulist用户A | POST /api/nutrition/analyze/f-other | 403, FORBIDDEN |

---

### A11 GET /api/nutrition/coverage/:formulaId — 获取营养覆盖度

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A11-P01 | 全部原料有营养数据 | 1. 已登录admin用户<br>2. f-001所有原料均有营养记录 | GET /api/nutrition/coverage/f-001 | 200, `{success:true, data:{coverageRate:1.0, confidenceLevel:"high", withNutrition:N, missingMaterials:[]}}` |
| A11-P02 | 部分原料缺失营养 | 已登录用户 | GET /api/nutrition/coverage/f-partial | 200, coverageRate<1.0, missingMaterials非空 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A11-E01 | 配方不存在 | 已登录用户 | GET /api/nutrition/coverage/nonexistent | 404, `{success:false, error:{code:"NOT_FOUND"}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A11-R01 | 未登录访问 | 不携带Token | GET /api/nutrition/coverage/f-001 | 401 |
| A11-R02 | formulist访问他人配方 | 已登录formulist用户A | GET /api/nutrition/coverage/f-other | 403, `{success:false, error:{code:"FORBIDDEN"}}` |

#### 数据隔离
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| A11-DI01 | admin可查看全部 | 已登录admin | GET /api/nutrition/coverage/f-other | 200, 正常返回 |
| A11-DI02 | formulist仅可查看自己的 | 已登录formulist用户A | GET /api/nutrition/coverage/f-other | 403, FORBIDDEN |

## 三、特殊场景测试

### X-C 计算准确性
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-C01 | 药材ratio计算 | 1. 原料material_type=herb<br>2. quantity=50g, finishedWeight=200g, ratioFactor=0.18 | POST /api/nutrition/calculate/:formulaId | ratio = (50/200) × 0.18 = 0.045 |
| X-C02 | 辅料ratio计算 | 1. 原料material_type=supplement<br>2. quantity=10g, finishedWeight=200g, supplementRatioFactor=1.0 | POST /api/nutrition/calculate/:formulaId | ratio = (10/200) × 1.0 = 0.05 |
| X-C03 | 能量计算 | 1. protein=5g, fat=3g, carbohydrate=20g | 计算能量 | energy = 5×17 + 3×37 + 20×17 = 85+111+340 = 536 kJ |
| X-C04 | NRV%计算 | 1. sodium=500mg | 计算NRV% | NRV% = (500/2000) × 100 = 25% |
| X-C05 | 0界限归零-蛋白质 | 1. 蛋白质=0.3g（≤0.5g） | 获取营养表格 | labelRows中蛋白质值归零 |
| X-C06 | 0界限归零-脂肪 | 1. 脂肪=0.4g（≤0.5g） | 获取营养表格 | labelRows中脂肪值归零 |
| X-C07 | 0界限归零-碳水 | 1. 碳水=0.3g（≤0.5g） | 获取营养表格 | labelRows中碳水值归零 |
| X-C08 | 0界限归零-钠 | 1. 钠=3mg（≤5mg） | 获取营养表格 | labelRows中钠值归零 |
| X-C09 | 0界限归零-能量 | 1. 能量=15kJ（≤17kJ） | 获取营养表格 | labelRows中能量值归零 |
| X-C10 | 归零后重新计算能量 | 1. 蛋白质归零后，碳水=10g, 脂肪=2g | 获取营养表格 | energy = 0×17 + 2×37 + 10×17 = 244 kJ（蛋白质贡献为0） |
| X-C11 | 混合药材辅料配方计算 | 1. 配方含herb(100g)和supplement(20g)<br>2. finishedWeight=300g<br>3. herb ratioFactor=0.18, supplement=1.0 | POST /api/nutrition/calculate | herb ratio=(100/300)×0.18=0.06, supplement ratio=(20/300)×1.0=0.0667 |

### X-MD 请求方法限制
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-MD01 | GET请求到POST端点 | 已登录用户 | GET /api/nutrition/calculate/f-001 | 404, 路由不匹配 |
| X-MD02 | POST请求到GET端点 | 已登录用户 | POST /api/nutrition/material/mat-001 | 404, 路由不匹配 |

### X-SE 错误信息安全
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-SE01 | 500错误不暴露堆栈 | 已登录用户，触发服务端异常 | 任意触发500的请求 | 响应中不包含堆栈信息、SQL语句、表名 |

### X-RF 响应格式一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-RF01 | 成功响应格式 | 已登录用户 | GET /api/nutrition/material/mat-001 | `{success:true, data:{...}}` |
| X-RF02 | 错误响应格式 | 已登录用户 | GET /api/nutrition/material/nonexistent | `{success:true, data:null}` 或 `{success:false, ...}` |

### X-CT Content-Type校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CT01 | PUT请求非JSON Content-Type | 已登录用户 | PUT /api/nutrition/material/mat-001<br>Content-Type: text/plain | 400 或 解析失败 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| A01 | 2 | 2 | 2 | 3 | 0 | 0 | 0 | 0 | 1 | 10 |
| A02 | 2 | 3 | 5 | 2 | 2 | 0 | 3 | 1 | 0 | 18 |
| A03 | 1 | 2 | 2 | 1 | 0 | 0 | 2 | 1 | 0 | 9 |
| A04 | 2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| A05 | 3 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 6 |
| A06 | 1 | 1 | 4 | 1 | 4 | 0 | 1 | 0 | 0 | 12 |
| A07 | 1 | 2 | 0 | 1 | 0 | 2 | 0 | 0 | 0 | 6 |
| A08 | 1 | 2 | 0 | 1 | 0 | 2 | 1 | 1 | 0 | 8 |
| A09 | 2 | 2 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 6 |
| A10 | 2 | 3 | 0 | 2 | 0 | 0 | 0 | 0 | 2 | 9 |
| A11 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 2 | 7 |
| **合计** | **19** | **18** | **15** | **16** | **6** | **4** | **8** | **3** | **5** | **95** |

特殊场景：X-C(11) + X-MD(2) + X-SE(1) + X-RF(2) + X-CT(1) = 17

**总用例数：95 + 17 = 112**（含11个端点，修正端点数为11）
