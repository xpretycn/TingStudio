# 解析模板接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-PT-20260607-001 |
| 路由文件 | backend/src/routes/parseTemplates.ts |
| 端点数 | 5 |
| 测试用例数 | 47 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| P01 | GET | /api/parse-templates | authMiddleware | 获取解析模板列表 |
| P02 | GET | /api/parse-templates/:id | authMiddleware | 获取解析模板详情 |
| P03 | POST | /api/parse-templates | authMiddleware + validateBody | 创建解析模板 |
| P04 | PUT | /api/parse-templates/:id | authMiddleware + validateBody | 更新解析模板 |
| P05 | DELETE | /api/parse-templates/:id | authMiddleware | 删除解析模板 |

## 二、测试用例

### P01 GET /api/parse-templates 获取解析模板列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| P01-P01 | 获取模板列表 | 已登录, 有模板数据 | 无 | 200 | success=true, data含list和pagination | 无 |
| P01-P02 | 按关键词搜索 | 已登录 | keyword=营养 | 200 | data.list中name含"营养" |
| P01-P03 | 按分类过滤 | 已登录 | category=nutrition | 200 | data.list中category=nutrition |
| P01-P04 | 自定义分页 | 已登录 | page=2&pageSize=5 | 200 | data.pagination.page=2 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P01-E01 | 未登录访问 | 无Token | 无 | 401 | UNAUTHORIZED |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P01-B01 | 无模板数据 | 已登录, 数据库无模板 | 无 | 200 | data.list=[], pagination.total=0 |
| P01-B02 | pageSize超过100 | 已登录 | pageSize=200 | 200 | 最多100条/页 |
| P01-B03 | keyword含特殊字符 | 已登录 | keyword=%'; DROP TABLE--; | 200 | 安全处理，无SQL注入 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P01-R01 | admin获取列表 | admin登录 | 无 | 200 | 仅含created_by=admin的模板 |
| P01-R02 | formulist获取列表 | formulist登录 | 无 | 200 | 仅含created_by=当前用户的模板 |
| P01-R03 | Token过期 | 过期Token | 无 | 401 | TOKEN_EXPIRED |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P01-DI01 | 只能看自己创建的模板 | 已登录 | 无 | 200 | WHERE created_by=当前用户 |
| P01-DI02 | 不同用户模板互不可见 | 用户A有模板 | 用户B请求 | 200 | 用户B看不到用户A的模板 |

---

### P02 GET /api/parse-templates/:id 获取解析模板详情

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| P02-P01 | 获取存在的模板 | 已登录, 模板存在 | id=valid | 200 | success=true, data含id/name/category等完整字段 | 无 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P02-E01 | 模板不存在 | 已登录 | id=notexist | 404 | success=false, error.code=NOT_FOUND |
| P02-E02 | 未登录访问 | 无Token | id=valid | 401 | UNAUTHORIZED |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P02-B01 | id为无效UUID格式 | 已登录 | id=abc123 | 404 | success=false, error.code=NOT_FOUND |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P02-DC01 | field_mapping和validation_rules正确解析 | 已登录, 模板含JSON字段 | id=valid | 200 | data.fieldMapping为对象, data.validationRules为对象 |

---

### P03 POST /api/parse-templates 创建解析模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| P03-P01 | 创建完整模板 | 已登录 | {name:"营养解析模板", category:"nutrition", defaultProvider:"deepseek", defaultModel:"deepseek-chat", customPrompt:"自定义提示词", fieldMapping:{name:"原料名称"}, validationRules:{name:{required:true}}} | 201 | success=true, data含完整模板数据 | parse_templates新增一条记录 |
| P03-P02 | 仅传必填字段 | 已登录 | {name:"最小模板"} | 201 | success=true, data.name="最小模板", data.category="nutrition"(默认) | parse_templates新增 |
| P03-P03 | 传入fieldMapping和validationRules | 已登录 | {name:"测试", fieldMapping:{key:"value"}, validationRules:{field:{type:"string"}}} | 201 | data.fieldMapping为对象 | field_mapping/validation_rules以JSON存储 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P03-E01 | 未登录 | 无Token | {name:"测试"} | 401 | UNAUTHORIZED |
| P03-E02 | name为空 | 已登录 | {name:""} | 400 | VALIDATION_ERROR, message="请输入模板名称" |
| P03-E03 | name缺失 | 已登录 | {category:"nutrition"} | 400 | VALIDATION_ERROR |
| P03-E04 | 模板名称重复(UNIQUE约束) | 已登录, 同名模板已存在 | {name:"已存在的模板名"} | 409 | DUPLICATE_ENTRY, message="模板名称已存在" |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P03-B01 | name为1个字符 | 已登录 | {name:"a"} | 201 | 正常创建 |
| P03-B02 | name为超长字符串 | 已登录 | {name:"a".repeat(200)} | 201 | 正常创建(数据库允许) |
| P03-B03 | fieldMapping为空对象 | 已登录 | {name:"测试", fieldMapping:{}} | 201 | field_mapping存储为"{}" |
| P03-B04 | customPrompt为超长文本 | 已登录 | {name:"测试", customPrompt:"很长的提示词..."} | 201 | 正常创建 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P03-R01 | admin创建模板 | admin登录 | {name:"admin模板"} | 201 | created_by=admin_id |
| P03-R02 | formulist创建模板 | formulist登录 | {name:"用户模板"} | 201 | created_by=formulist_id |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P03-V01 | name类型错误(数字) | 已登录 | {name:123} | 400 | VALIDATION_ERROR |
| P03-V02 | fieldMapping类型错误(字符串) | 已登录 | {name:"测试", fieldMapping:"not_object"} | 400 | VALIDATION_ERROR |
| P03-V03 | validationRules类型错误(字符串) | 已登录 | {name:"测试", validationRules:"not_object"} | 400 | VALIDATION_ERROR |
| P03-V04 | category类型错误(数字) | 已登录 | {name:"测试", category:123} | 400 | VALIDATION_ERROR |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|-------------|
| P03-DC01 | is_preset默认为0 | 已登录 | {name:"测试"} | 201 | is_preset=0 |
| P03-DC02 | is_active默认为1 | 已登录 | {name:"测试"} | 201 | is_active=1 |
| P03-DC03 | created_by为当前用户ID | 已登录 | {name:"测试"} | 201 | created_by=当前userId |

---

### P04 PUT /api/parse-templates/:id 更新解析模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| P04-P01 | 更新模板名称 | 已登录, 模板存在 | {name:"新名称"} | 200 | success=true, data.name="新名称" | name字段更新 |
| P04-P02 | 更新多个字段 | 已登录, 模板存在 | {name:"新名称", category:"formula", customPrompt:"新提示词"} | 200 | data含更新后所有字段 | 多个字段更新 |
| P04-P03 | 更新isActive状态 | 已登录, 模板存在 | {isActive:false} | 200 | data.isActive=false | is_active=0 |
| P04-P04 | 更新fieldMapping | 已登录, 模板存在 | {fieldMapping:{newKey:"newValue"}} | 200 | data.fieldMapping含新值 | field_mapping更新 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P04-E01 | 模板不存在 | 已登录 | id=notexist, {name:"新名称"} | 404 | NOT_FOUND, message="模板不存在" |
| P04-E02 | 未登录 | 无Token | id=valid, {name:"新名称"} | 401 | UNAUTHORIZED |
| P04-E03 | 没有需要更新的字段 | 已登录, 模板存在 | {} | 400 | VALIDATION_ERROR, message="没有需要更新的字段" |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P04-B01 | name为空字符串 | 已登录, 模板存在 | {name:""} | 200 | name更新为空字符串(允许) |
| P04-B02 | isActive为true | 已登录, 模板存在 | {isActive:true} | 200 | is_active=1 |
| P04-B03 | isActive为false | 已登录, 模板存在 | {isActive:false} | 200 | is_active=0 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P04-V01 | fieldMapping类型错误 | 已登录 | {fieldMapping:"not_object"} | 400 | VALIDATION_ERROR |
| P04-V02 | validationRules类型错误 | 已登录 | {validationRules:123} | 400 | VALIDATION_ERROR |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|-------------|
| P04-DC01 | updated_at自动更新 | 已登录, 模板存在 | {name:"新名称"} | 200 | updated_at更新为当前时间 |
| P04-DC02 | fieldMapping序列化为JSON | 已登录 | {fieldMapping:{key:"val"}} | 200 | field_mapping存储为JSON字符串 |

---

### P05 DELETE /api/parse-templates/:id 删除解析模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| P05-P01 | 删除非预设模板 | 已登录, is_preset=0的模板 | id=valid | 200 | success=true, message="模板删除成功" | parse_templates删除对应记录 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P05-E01 | 模板不存在 | 已登录 | id=notexist | 404 | NOT_FOUND, message="模板不存在或为系统预设不可删除" |
| P05-E02 | 删除系统预设模板 | 已登录, is_preset=1 | id=preset_id | 404 | NOT_FOUND, message="模板不存在或为系统预设不可删除" |
| P05-E03 | 未登录 | 无Token | id=valid | 401 | UNAUTHORIZED |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P05-B01 | id为无效格式 | 已登录 | id=abc123 | 404 | NOT_FOUND |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P05-S01 | 预设模板不可删除 | 已登录, is_preset=1 | id=preset_id | 404 | DELETE WHERE is_preset=0, changes=0 |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P05-I01 | 重复删除同一模板 | 已删除一次 | id=deleted | 404 | NOT_FOUND |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| P05-DI01 | 删除他人模板(无created_by校验) | 已登录, 模板属于他人 | id=other_user_template | 200 | 删除成功(注意: 当前实现无created_by校验) |

## 三、特殊场景测试

### 3.1 validateBody中间件校验 (X-VB)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-VB-01 | POST缺少必填字段name | 已登录 | 不传name字段 | 400, VALIDATION_ERROR |
| X-VB-02 | POST name为空字符串 | 已登录 | name="" | 400, message="请输入模板名称" |
| X-VB-03 | POST fieldMapping非对象 | 已登录 | fieldMapping="string" | 400, VALIDATION_ERROR |
| X-VB-04 | PUT所有字段均为可选 | 已登录 | 只传一个字段 | 正常更新 |

### 3.2 请求方法限制 (X-MD)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-MD-01 | PATCH请求不支持 | 已登录 | PATCH /api/parse-templates/:id | 404或405 |
| X-MD-02 | POST请求到GET端点 | 已登录 | POST /api/parse-templates/:id | 404或405 |

### 3.3 错误信息安全 (X-SE)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-SE-01 | UNIQUE约束失败不暴露表名 | 已登录 | 创建同名模板 | 错误消息不含表名parse_templates |
| X-SE-02 | 数据库错误返回通用消息 | 已登录, 数据库异常 | 创建模板 | 返回"创建模板失败"，不含SQL细节 |

### 3.4 响应格式一致性 (X-RF)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-RF-01 | 列表响应使用successWithPagination | 已登录 | GET /api/parse-templates | {success:true, data:{list:[], pagination:{...}}} |
| X-RF-02 | 详情响应使用success | 已登录 | GET /api/parse-templates/:id | {success:true, data:{...}} |
| X-RF-03 | 创建响应201状态码 | 已登录 | POST /api/parse-templates | HTTP 201 |
| X-RF-04 | 删除响应200 | 已登录 | DELETE /api/parse-templates/:id | HTTP 200 |

### 3.5 Content-Type校验 (X-CT)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-CT-01 | POST请求必须为JSON | 已登录 | Content-Type: form-urlencoded | 参数无法正确解析 |

### 3.6 数据库字段映射 (X-FM)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-FM-01 | snake_case转camelCase | 已登录 | GET /api/parse-templates | 响应字段为camelCase(defaultProvider非default_provider) |
| X-FM-02 | field_mapping JSON正确解析 | 已登录 | GET /api/parse-templates/:id | data.fieldMapping为对象非字符串 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| P01 | 4 | 1 | 3 | 3 | 0 | 0 | 0 | 0 | 2 | 13 |
| P02 | 1 | 2 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 5 |
| P03 | 3 | 4 | 4 | 2 | 4 | 0 | 3 | 0 | 0 | 20 |
| P04 | 4 | 3 | 3 | 0 | 2 | 0 | 2 | 0 | 0 | 14 |
| P05 | 1 | 3 | 1 | 0 | 0 | 1 | 0 | 1 | 1 | 8 |
| **合计** | **13** | **13** | **12** | **5** | **6** | **1** | **6** | **1** | **3** | **60** |
