# AI 助手接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-AI-20260607-001 |
| 路由文件 | backend/src/routes/ai.ts |
| 端点数 | 30 |
| 测试用例数 | 312 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| A01 | POST | /api/ai/parse-formula | authMiddleware | 上传文件+AI解析配方 |
| A02 | POST | /api/ai/parse-material-nutrition | authMiddleware | 上传文件+AI解析原料营养 |
| A03 | POST | /api/ai/natural-search | authMiddleware | 自然语言转SQL查询 |
| A04 | GET | /api/ai/export/:filename | authMiddleware | 下载导出的CSV文件 |
| A05 | GET | /api/ai/models | authMiddleware | 获取可用AI模型列表 |
| A06 | POST | /api/ai/chat | authMiddleware | AI对话(SSE流式) |
| A07 | GET | /api/ai/models-manage | authMiddleware | 获取模型管理列表 |
| A08 | POST | /api/ai/models-manage | authMiddleware | 创建AI模型(仅admin) |
| A09 | PUT | /api/ai/models-manage/:id | authMiddleware | 更新AI模型(仅admin) |
| A10 | DELETE | /api/ai/models-manage/:id | authMiddleware | 删除AI模型(仅admin) |
| A11 | POST | /api/ai/models-manage/:id/test | authMiddleware | 测试模型连接(仅admin) |
| A12 | GET | /api/ai/models-manage/:id/versions | authMiddleware | 获取模型版本列表 |
| A13 | GET | /api/ai/models/:provider/versions | authMiddleware | 按供应商获取模型版本 |
| A14 | PUT | /api/ai/models/:provider/version | authMiddleware | 切换模型版本(仅admin) |
| A15 | PUT | /api/ai/models-manage/:id/fallback | authMiddleware | 设置故障转移(仅admin) |
| A16 | GET | /api/ai/usage | authMiddleware | 获取使用量统计 |
| A17 | GET | /api/ai/usage/logs | authMiddleware | 获取使用量日志 |
| A18 | GET | /api/ai/alerts/configs | authMiddleware | 获取告警配置 |
| A19 | PUT | /api/ai/alerts/configs/:id | authMiddleware | 更新告警配置(仅admin) |
| A20 | GET | /api/ai/alerts/records | authMiddleware | 获取告警记录 |
| A21 | GET | /api/ai/health | authMiddleware | 获取健康状态 |
| A22 | GET | /api/ai/health/:provider/history | authMiddleware | 获取健康历史 |
| A23 | GET | /api/ai/model-applications | authMiddleware | 获取模型应用配置(仅admin) |
| A24 | POST | /api/ai/model-applications | authMiddleware | 创建模型应用配置(仅admin) |
| A25 | PUT | /api/ai/model-applications/:id | authMiddleware | 更新模型应用配置(仅admin) |
| A26 | PATCH | /api/ai/model-applications/:id | authMiddleware | 部分更新模型应用(仅admin) |
| A27 | DELETE | /api/ai/model-applications/:id | authMiddleware | 删除模型应用配置(仅admin) |
| A28 | GET | /api/ai/recent-activity | authMiddleware | 获取最近活动 |
| A29 | GET | /api/ai/smart-tool-history | authMiddleware | 获取智能工具历史 |
| A30 | DELETE | /api/ai/smart-tool-history/:id | authMiddleware | 删除智能工具历史 |
| A31 | GET | /api/ai/prompt-templates | authMiddleware | 获取提示词模板 |
| A32 | POST | /api/ai/prompt-templates | authMiddleware | 创建提示词模板 |
| A33 | PUT | /api/ai/prompt-templates/:id | authMiddleware | 更新提示词模板 |
| A34 | DELETE | /api/ai/prompt-templates/:id | authMiddleware | 删除提示词模板 |
| A35 | GET | /api/ai/parse-results | authMiddleware | 获取解析结果列表 |
| A36 | GET | /api/ai/parse-results/statistics | authMiddleware | 获取解析结果统计 |
| A37 | GET | /api/ai/parse-results/config | authMiddleware | 获取解析结果配置 |
| A38 | GET | /api/ai/parse-results/degradation | authMiddleware | 获取降级状态 |
| A39 | GET | /api/ai/parse-results/metrics | authMiddleware | 获取监控指标 |
| A40 | GET | /api/ai/parse-results/alerts | authMiddleware | 获取解析告警(仅admin) |
| A41 | GET | /api/ai/parse-results/performance | authMiddleware | 获取性能统计 |
| A42 | GET | /api/ai/parse-results/:id | authMiddleware | 获取解析结果详情 |
| A43 | GET | /api/ai/parse-results/:id/linked-formula | authMiddleware | 获取关联配方 |
| A44 | GET | /api/ai/parse-results/:id/linked-material | authMiddleware | 获取关联原料 |
| A45 | GET | /api/ai/formulas/:formulaId/parse-results | authMiddleware | 获取配方关联解析结果 |
| A46 | GET | /api/ai/materials/:materialId/parse-results | authMiddleware | 获取原料关联解析结果 |
| A47 | POST | /api/ai/parse-results | authMiddleware | 保存解析结果 |
| A48 | POST | /api/ai/parse-results/check | authMiddleware | 检查解析结果是否存在 |
| A49 | PUT | /api/ai/parse-results/config | authMiddleware | 更新解析结果配置(仅admin) |
| A50 | POST | /api/ai/parse-results/cleanup | authMiddleware | 清理解析结果(仅admin) |
| A51 | POST | /api/ai/parse-results/manual-cleanup | authMiddleware | 手动清理(仅admin) |
| A52 | POST | /api/ai/parse-results/:id/mark-used | authMiddleware | 标记解析结果已使用 |
| A53 | DELETE | /api/ai/parse-results/:id | authMiddleware | 删除解析结果 |

## 二、测试用例

### A01 POST /api/ai/parse-formula 解析配方

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A01-P01 | 上传Excel文件解析配方 | 已登录用户，AI模型已配置 | file=test.xlsx, model=deepseek | 200 | success=true, data包含name/materials/model/usage | parse_results表新增一条记录 |
| A02-P02 | 上传图片文件解析配方(支持视觉模型) | 已登录用户，选择支持视觉的模型 | file=test.png, model=qwen | 200 | success=true, data包含解析结果 | parse_results表新增一条记录 |
| A03-P03 | 上传CSV文件解析配方 | 已登录用户 | file=test.csv, model=deepseek | 200 | success=true, data包含解析结果 | parse_results表新增一条记录 |
| A01-P04 | 命中缓存时返回缓存结果 | 同一用户上传相同文件(相同hash) | file=same.xlsx, model=deepseek | 200 | data.cached=true | parse_results表used_count+1 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-E01 | 未上传文件 | 已登录 | 不传file字段 | 400 | success=false, message="请上传文件" |
| A01-E02 | 未选择AI模型 | 已登录，上传文件 | file=test.xlsx, 不传model | 400 | success=false, message="请选择 AI 模型" |
| A01-E03 | 图片文件但模型不支持视觉 | 已登录 | file=test.png, model=deepseek(不支持视觉) | 400 | success=false, message含"不支持图片解析" |
| A01-E04 | 上传不支持的文件格式 | 已登录 | file=test.pdf | 400 | multer拒绝，message含"不支持的文件格式" |
| A01-E05 | 文件内容为空(Excel) | 已登录 | file=empty.xlsx, model=deepseek | 400 | success=false, message="文件内容为空" |
| A01-E06 | AI返回内容无法解析为JSON | 已登录 | file=test.xlsx, model=deepseek | 422 | success=false, message含"无法解析为 JSON" |
| A01-E07 | AI解析结果不完整 | 已登录 | file=test.xlsx, model=deepseek | 422 | success=false, message含"缺少配方名称或原料列表" |
| A01-E08 | AI服务不可用 | 已登录，AI服务异常 | file=test.xlsx, model=deepseek | 500 | success=false, message含"AI 解析失败" |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-B01 | 上传最大10MB文件 | 已登录 | file=10mb.xlsx, model=deepseek | 200 | 正常解析 |
| A01-B02 | 上传超过10MB文件 | 已登录 | file=11mb.xlsx, model=deepseek | 400 | multer拒绝，文件大小超限 |
| A01-B03 | 文件名含特殊字符 | 已登录 | file=测试(1).xlsx, model=deepseek | 200 | 正常解析 |
| A01-B04 | Excel文件含多个Sheet | 已登录 | file=multisheet.xlsx, model=deepseek | 200 | 所有Sheet数据合并解析 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-R01 | 未登录访问 | 无Token | file=test.xlsx, model=deepseek | 401 | UNAUTHORIZED |
| A01-R02 | Token过期 | 过期Token | file=test.xlsx, model=deepseek | 401 | TOKEN_EXPIRED |
| A01-R03 | admin用户解析 | admin登录 | file=test.xlsx, model=deepseek | 200 | 正常解析 |
| A01-R04 | formulist用户解析 | formulist登录 | file=test.xlsx, model=deepseek | 200 | 正常解析 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-V01 | model为空字符串 | 已登录 | file=test.xlsx, model="" | 400 | success=false, message="请选择 AI 模型" |
| A01-V02 | version参数传递 | 已登录 | file=test.xlsx, model=deepseek, version=deepseek-chat | 200 | 使用指定版本模型 |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-S01 | 首次上传同一文件 | 无缓存 | file=new.xlsx, model=deepseek | 200 | data.cached不存在或为false |
| A01-S02 | 重复上传同一文件 | 已有缓存 | file=same.xlsx, model=deepseek | 200 | data.cached=true |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|-------------|
| A01-DC01 | 解析结果保存到parse_results | 已登录 | file=test.xlsx, model=deepseek | 200 | parse_results新增记录，call_type=parse_formula，status=success |
| A01-DC02 | 原料名称标准化后匹配 | 已登录，数据库有对应原料 | file=test.xlsx, model=deepseek | 200 | materials中matched=true，materialId非空 |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-I01 | 重复上传相同文件 | 已有缓存记录 | file=same.xlsx, model=deepseek | 200 | 返回缓存结果，used_count递增 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A01-DI01 | 用户A的缓存不影响用户B | 用户A已上传文件 | 用户B上传相同文件 | 200 | 用户B不命中A的缓存，重新解析 |

---

### A02 POST /api/ai/parse-material-nutrition 解析原料营养

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A02-P01 | 上传Excel解析原料营养 | 已登录 | file=nutrition.xlsx, model=deepseek | 200 | success=true, data.materials数组 | parse_results新增记录 |
| A02-P02 | 上传图片解析原料营养 | 已登录，视觉模型 | file=nutrition.png, model=qwen | 200 | success=true | parse_results新增记录 |
| A02-P03 | 命中缓存 | 同一用户相同文件 | file=same.xlsx, model=deepseek | 200 | data.cached=true | used_count+1 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A02-E01 | 未上传文件 | 已登录 | 不传file | 400 | success=false, message="请上传文件" |
| A02-E02 | 未选择模型 | 已登录 | file=test.xlsx | 400 | success=false, message="请选择 AI 模型" |
| A02-E03 | 图片+不支持视觉的模型 | 已登录 | file=test.png, model=deepseek | 400 | message含"不支持图片解析" |
| A02-E04 | AI返回缺少materials数组 | 已登录 | file=test.xlsx, model=deepseek | 422 | message含"缺少原料列表" |
| A02-E05 | AI服务异常 | 已登录 | file=test.xlsx, model=invalid | 500 | message含"AI 解析失败" |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A02-B01 | 文件内容为空 | 已登录 | file=empty.xlsx, model=deepseek | 400 | message="文件内容为空" |
| A02-B02 | 超大文件上传 | 已登录 | file=10mb.xlsx, model=deepseek | 200 | 正常解析 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A02-R01 | 未登录访问 | 无Token | file=test.xlsx, model=deepseek | 401 | UNAUTHORIZED |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A02-V01 | model为空 | 已登录 | file=test.xlsx, model="" | 400 | message="请选择 AI 模型" |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A02-S01 | 营养数据智能修正触发 | AI返回数据列错位 | file=test.xlsx, model=deepseek | 200 | 修正后的数据返回 |

#### 2.7 数据一致性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|-------------|
| A02-DC01 | 解析结果保存 | 已登录 | file=test.xlsx, model=deepseek | 200 | parse_results新增，call_type=parse_nutrition |
| A02-DC02 | 已有原料标记isRecorded | 已登录，数据库有对应原料 | file=test.xlsx, model=deepseek | 200 | materials中isRecorded=true |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A02-I01 | 重复上传相同文件 | 已有缓存 | file=same.xlsx, model=deepseek | 200 | 返回缓存结果 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A02-DI01 | 不同用户缓存隔离 | 用户A已上传 | 用户B上传相同文件 | 200 | 用户B重新解析 |

---

### A03 POST /api/ai/natural-search 自然语言检索

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A03-P01 | admin用户自然语言查询 | admin登录 | {query:"查询所有配方", model:"deepseek"} | 200 | success=true, data含sql/rows/rowCount | ai_usage_logs新增记录 |
| A03-P02 | formulist用户查询(自动注入created_by) | formulist登录 | {query:"查询我的配方", model:"deepseek"} | 200 | data.sql含created_by过滤 | ai_usage_logs新增记录 |
| A03-P03 | 导出CSV格式 | 已登录 | {query:"查询配方", model:"deepseek", exportFormat:"csv"} | 200 | data.exportUrl非空 | search_export_cache新增记录 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A03-E01 | 查询内容为空 | 已登录 | {query:"", model:"deepseek"} | 400 | message="请输入查询内容" |
| A03-E02 | 未选择模型 | 已登录 | {query:"查询配方"} | 400 | message="请选择 AI 模型" |
| A03-E03 | 生成的SQL不安全 | 已登录 | {query:"删除所有配方", model:"deepseek"} | 422 | message含"不安全" |
| A03-E04 | SQL执行失败 | 已登录 | {query:"查询不存在的表", model:"deepseek"} | 422 | code="SQL_EXECUTION_ERROR" |
| A03-E05 | AI服务请求失败 | 已登录，AI异常 | {query:"查询", model:"invalid"} | 502 | code="AI_SERVICE_ERROR" |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A03-B01 | 查询内容含SQL注入 | 已登录 | {query:"'; DROP TABLE users;--", model:"deepseek"} | 422 | SQL验证不通过 |
| A03-B02 | 查询结果为空 | 已登录 | {query:"查询不存在的配方名", model:"deepseek"} | 200 | data.rows=[], rowCount=0 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A03-R01 | 未登录访问 | 无Token | {query:"查询", model:"deepseek"} | 401 | UNAUTHORIZED |
| A03-R02 | admin查询无created_by过滤 | admin登录 | {query:"查询配方", model:"deepseek"} | 200 | data.sql不含created_by |
| A03-R03 | formulist查询自动注入过滤 | formulist登录 | {query:"查询配方", model:"deepseek"} | 200 | data.sql含created_by |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A03-V01 | query为纯空格 | 已登录 | {query:"   ", model:"deepseek"} | 400 | message="请输入查询内容" |

#### 2.6 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A03-DI01 | formulist只能查自己的数据 | formulist登录 | {query:"查询所有配方", model:"deepseek"} | 200 | rows仅含created_by=当前用户的数据 |

---

### A04 GET /api/ai/export/:filename 下载导出文件

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A04-P01 | 下载有效的CSV导出文件 | search_export_cache有记录且未过期 | filename=export_xxx.csv | 200 | Content-Type=text/csv, 返回文件流 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A04-E01 | 文件不存在(记录不存在) | 无对应记录 | filename=notexist.csv | 404 | message="导出文件不存在或已过期" |
| A04-E02 | 文件已过期 | 记录存在但expires_at已过 | filename=expired.csv | 410 | message="导出文件已过期" |
| A04-E03 | 物理文件不存在 | 记录存在但文件被删 | filename=deleted.csv | 404 | message="文件不存在" |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A04-R01 | 未登录访问 | 无Token | filename=export.csv | 401 | UNAUTHORIZED |

---

### A05 GET /api/ai/models 获取可用模型列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A05-P01 | 获取模型列表 | 已登录 | 无 | 200 | success=true, data含available和all数组 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A05-R01 | 未登录访问 | 无Token | 无 | 401 | UNAUTHORIZED |

---

### A06 POST /api/ai/chat AI对话(SSE流式)

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A06-P01 | 正常流式对话 | 已登录 | {message:"你好", model:"deepseek"} | 200 | Content-Type=text/event-stream, 返回SSE事件流 |
| A06-P02 | 指定模型版本 | 已登录 | {message:"你好", model:"deepseek", modelVersion:"deepseek-chat"} | 200 | SSE流正常 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A06-E01 | 消息为空 | 已登录 | {message:""} | 400 | message="消息内容不能为空" |
| A06-E02 | 消息为非字符串 | 已登录 | {message:123} | 400 | message="消息内容不能为空" |
| A06-E03 | AI服务错误 | 已登录，AI异常 | {message:"你好", model:"invalid"} | 200(SSE) | SSE事件type=error |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A06-R01 | 未登录访问 | 无Token | {message:"你好"} | 401 | UNAUTHORIZED |

---

### A07 GET /api/ai/models-manage 获取模型管理列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A07-P01 | 获取模型管理列表 | 已登录 | 无 | 200 | success=true, data含models数组和stats对象 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A07-R01 | 未登录访问 | 无Token | 无 | 401 | UNAUTHORIZED |

---

### A08 POST /api/ai/models-manage 创建AI模型

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A08-P01 | admin创建新模型 | admin登录 | {provider:"test", name:"测试", baseUrl:"http://...", model:"test-model"} | 200 | success=true, data含id | ai_models新增, ai_alert_configs新增 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A08-E01 | formulist无权创建 | formulist登录 | 同上 | 403 | message="仅管理员可操作" |
| A08-E02 | provider已存在 | admin登录, provider已存在 | {provider:"deepseek", ...} | 400 | message含"已存在" |
| A08-E03 | 缺少必填字段 | admin登录 | {provider:"test"} | 400 | message含"缺少必填字段" |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A08-R01 | 未登录访问 | 无Token | 完整参数 | 401 | UNAUTHORIZED |
| A08-R02 | formulist角色 | formulist登录 | 完整参数 | 403 | FORBIDDEN |

---

### A09 PUT /api/ai/models-manage/:id 更新AI模型

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A09-P01 | admin更新模型 | admin登录, 模型存在 | {name:"新名称"} | 200 | success=true, data.updatedAt非空 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A09-E01 | 模型不存在 | admin登录 | id=notexist | 404 | message="模型不存在" |
| A09-E02 | formulist无权更新 | formulist登录 | 完整参数 | 403 | message="仅管理员可操作" |

---

### A10 DELETE /api/ai/models-manage/:id 删除AI模型

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A10-P01 | admin删除无调用记录的模型 | admin登录, 无usage_logs | id=valid_id | 200 | success=true | ai_models/ai_fallback_configs/ai_alert_configs删除 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A10-E01 | 模型不存在 | admin登录 | id=notexist | 404 | message="模型不存在" |
| A10-E02 | 有调用记录无法删除 | admin登录, 有usage_logs | id=with_logs | 400 | message="存在调用记录，无法移除" |
| A10-E03 | formulist无权删除 | formulist登录 | id=valid | 403 | message="仅管理员可操作" |

---

### A11 POST /api/ai/models-manage/:id/test 测试模型连接

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A11-P01 | 连接成功 | admin登录, 模型配置正确 | id=valid_id | 200 | data.status="healthy", data.latencyMs>0 | ai_models.health_status=healthy, ai_health_records新增 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A11-E01 | 模型不存在 | admin登录 | id=notexist | 404 | message="模型不存在" |
| A11-E02 | 连接失败 | admin登录, 模型配置错误 | id=invalid_config | 200 | success=false, data.status="unhealthy" |
| A11-E03 | formulist无权测试 | formulist登录 | id=valid | 403 | message="仅管理员可操作" |

---

### A12 GET /api/ai/models-manage/:id/versions 获取模型版本列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A12-P01 | 获取模型版本 | 已登录, 模型存在 | id=valid_id | 200 | data含provider/currentModel/versions |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A12-E01 | 模型不存在 | 已登录 | id=notexist | 404 | message="模型不存在" |

---

### A13 GET /api/ai/models/:provider/versions 按供应商获取模型版本

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A13-P01 | 按供应商获取版本 | 已登录 | provider=deepseek | 200 | data含provider/currentModel/versions |

---

### A14 PUT /api/ai/models/:provider/version 切换模型版本

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A14-P01 | admin切换版本 | admin登录 | {provider:"deepseek", model:"deepseek-v3"} | 200 | data含provider和model |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A14-E01 | model参数缺失 | admin登录 | {provider:"deepseek"} | 400 | message="请提供有效的模型版本" |
| A14-E02 | 模型不存在 | admin登录 | {provider:"notexist", model:"x"} | 404 | message="模型不存在" |
| A14-E03 | formulist无权切换 | formulist登录 | 完整参数 | 403 | message="仅管理员可操作" |

---

### A15 PUT /api/ai/models-manage/:id/fallback 设置故障转移

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A15-P01 | 设置故障转移 | admin登录, 模型存在 | {id:valid, fallbackProvider:"qwen"} | 200 | data含fallbackProvider |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A15-E01 | 模型不存在 | admin登录 | id=notexist | 404 | message="模型不存在" |
| A15-E02 | formulist无权设置 | formulist登录 | 完整参数 | 403 | message="仅管理员可操作" |

---

### A16 GET /api/ai/usage 获取使用量统计

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A16-P01 | 获取默认7天统计 | 已登录 | 无 | 200 | data含summary/trend/distribution |
| A16-P02 | 指定日期范围 | 已登录 | startDate=2026-01-01&endDate=2026-06-07 | 200 | data.summary含指定范围数据 |
| A16-P03 | 按供应商过滤 | 已登录 | provider=deepseek | 200 | data仅含deepseek数据 |

---

### A17 GET /api/ai/usage/logs 获取使用量日志

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A17-P01 | 获取日志列表 | 已登录 | 无 | 200 | data含logs/total/page/pageSize |
| A17-P02 | 分页查询 | 已登录 | page=2&pageSize=10 | 200 | data.page=2 |
| A17-P03 | 按条件过滤 | 已登录 | provider=deepseek&callType=parse_formula | 200 | 过滤后结果 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A17-DI01 | formulist只能看自己的日志 | formulist登录 | 无 | 200 | logs中user_id=当前用户 |
| A17-DI02 | admin可看所有日志 | admin登录 | 无 | 200 | logs包含所有用户 |

---

### A18 GET /api/ai/alerts/configs 获取告警配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A18-P01 | 获取告警配置列表 | 已登录 | 无 | 200 | data.configs数组含daily_call_limit/monthly_token_limit等 |

---

### A19 PUT /api/ai/alerts/configs/:id 更新告警配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A19-P01 | admin更新告警配置 | admin登录 | {dailyCallLimit:1000, warningThreshold:80} | 200 | success=true, data.updatedAt非空 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A19-E01 | formulist无权更新 | formulist登录 | 同上 | 403 | message="仅管理员可操作" |

---

### A20 GET /api/ai/alerts/records 获取告警记录

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A20-P01 | 获取告警记录 | 已登录 | 无 | 200 | data含records/total/activeAlerts |
| A20-P02 | 按级别过滤 | 已登录 | level=critical | 200 | 仅含critical级别 |

---

### A21 GET /api/ai/health 获取健康状态

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A21-P01 | 获取所有模型健康状态 | 已登录 | 无 | 200 | data.models数组含provider/health_status/latencyMs |

---

### A22 GET /api/ai/health/:provider/history 获取健康历史

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A22-P01 | 获取7天健康历史 | 已登录 | provider=deepseek | 200 | data.history数组含date/checks/healthy/unhealthy |
| A22-P02 | 自定义天数 | 已登录 | provider=deepseek&days=30 | 200 | 返回30天历史 |

---

### A23 GET /api/ai/model-applications 获取模型应用配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A23-P01 | admin获取应用配置 | admin登录 | 无 | 200 | data数组含module/provider/model |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A23-E01 | formulist无权访问 | formulist登录 | 无 | 403 | message="仅管理员可访问" |

---

### A24 POST /api/ai/model-applications 创建模型应用配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A24-P01 | admin创建应用配置 | admin登录 | {module:"smart-search", provider:"deepseek", model:"deepseek-chat"} | 201 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A24-E01 | 缺少必要字段 | admin登录 | {module:"smart-search"} | 400 | message="缺少必要字段" |
| A24-E02 | 模块已存在配置 | admin登录, 已有配置 | {module:"smart-search", ...} | 400 | message="该功能模块已存在配置" |
| A24-E03 | formulist无权 | formulist登录 | 完整参数 | 403 | message="仅管理员可操作" |

---

### A25 PUT /api/ai/model-applications/:id 更新模型应用配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A25-P01 | admin更新配置 | admin登录, 配置存在 | {provider:"qwen", model:"qwen-plus"} | 200 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A25-E01 | 配置不存在 | admin登录 | id=notexist | 404 | message="配置不存在" |
| A25-E02 | 缺少provider或model | admin登录 | {provider:"qwen"} | 400 | message="缺少必要字段" |

---

### A26 PATCH /api/ai/model-applications/:id 部分更新模型应用

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A26-P01 | admin切换启用状态 | admin登录 | {enabled:false} | 200 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A26-E01 | 配置不存在 | admin登录 | id=notexist | 404 | message="配置不存在" |

---

### A27 DELETE /api/ai/model-applications/:id 删除模型应用配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A27-P01 | admin删除配置 | admin登录, 配置存在 | id=valid | 200 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A27-E01 | 配置不存在 | admin登录 | id=notexist | 404 | message="配置不存在" |

---

### A28 GET /api/ai/recent-activity 获取最近活动

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A28-P01 | 获取最近活动 | 已登录 | 无 | 200 | data.items数组含type/title/desc/time |
| A28-P02 | 自定义数量 | 已登录 | limit=10 | 200 | 最多10条 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A28-B01 | limit超过50 | 已登录 | limit=100 | 200 | 最多返回50条 |

---

### A29 GET /api/ai/smart-tool-history 获取智能工具历史

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A29-P01 | 获取智能工具历史 | 已登录 | 无 | 200 | data含list和pagination |
| A29-P02 | 按类型过滤 | 已登录 | callType=parse_formula | 200 | 仅含parse_formula类型 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A29-B01 | pageSize超过100 | 已登录 | pageSize=200 | 200 | 最多100条/页 |

---

### A30 DELETE /api/ai/smart-tool-history/:id 删除智能工具历史

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A30-P01 | 删除自己的历史记录 | 已登录, 记录属于当前用户 | id=valid | 200 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A30-E01 | 记录不存在 | 已登录 | id=notexist | 404 | message="记录不存在" |
| A30-E02 | 删除他人记录(非admin) | formulist登录, 记录属于他人 | id=other_user | 403 | message="无权删除该记录" |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A30-R01 | admin可删除任何记录 | admin登录 | id=other_user | 200 | success=true |

---

### A31 GET /api/ai/prompt-templates 获取提示词模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A31-P01 | 获取所有模板 | 已登录 | 无 | 200 | success=true, data数组 |
| A31-P02 | 按模块过滤 | 已登录 | module=smart-generate | 200 | 仅含该模块模板 |
| A31-P03 | 按类型过滤 | 已登录 | type=description | 200 | 仅含该类型模板 |

---

### A32 POST /api/ai/prompt-templates 创建提示词模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A32-P01 | 创建模板 | 已登录 | {module:"smart-generate", name:"测试模板"} | 200 | success=true, data含id |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A32-E01 | module为空 | 已登录 | {name:"测试"} | 400 | message="模块和名称不能为空" |
| A32-E02 | name为空 | 已登录 | {module:"smart-generate"} | 400 | message="模块和名称不能为空" |

---

### A33 PUT /api/ai/prompt-templates/:id 更新提示词模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A33-P01 | 更新模板 | 已登录, 模板存在 | {name:"新名称"} | 200 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A33-E01 | 模板不存在 | 已登录 | id=notexist | 404 | message="模板不存在" |

---

### A34 DELETE /api/ai/prompt-templates/:id 删除提示词模板

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A34-P01 | 删除模板 | 已登录, 模板存在 | id=valid | 200 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A34-E01 | 模板不存在 | 已登录 | id=notexist | 404 | message="模板不存在" |

---

### A35 GET /api/ai/parse-results 获取解析结果列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A35-P01 | 获取解析结果列表 | 已登录 | 无 | 200 | success=true, data含list和pagination |
| A35-P02 | 按类型过滤 | 已登录 | callType=parse_formula | 200 | 仅含parse_formula |
| A35-P03 | 按状态过滤 | 已登录 | status=success | 200 | 仅含success状态 |
| A35-P04 | 关键词搜索 | 已登录 | keyword=测试 | 200 | 匹配文件名或解析结果 |
| A35-P05 | 排序 | 已登录 | sortBy=file_name&sortOrder=asc | 200 | 按文件名升序 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A35-B01 | pageSize超过100 | 已登录 | pageSize=200 | 200 | 最多100条/页 |
| A35-B02 | 无效排序字段 | 已登录 | sortBy=invalid_field | 200 | 默认按created_at排序 |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A35-DI01 | 只能看自己的解析结果 | 已登录 | 无 | 200 | WHERE user_id=当前用户 |

---

### A36 GET /api/ai/parse-results/statistics 获取解析结果统计

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A36-P01 | 获取统计 | 已登录 | 无 | 200 | data含totalCount/storageLimit/usagePercent/statsByType/statsByStatus |

---

### A37 GET /api/ai/parse-results/config 获取解析结果配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A37-P01 | 获取配置 | 已登录 | 无 | 200 | data含storage_limit/cleanup_threshold_percent等 |

---

### A38 GET /api/ai/parse-results/degradation 获取降级状态

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A38-P01 | 获取降级信息 | 已登录 | 无 | 200 | data含level/reason/recommendations/systemStatus |

---

### A39 GET /api/ai/parse-results/metrics 获取监控指标

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A39-P01 | 获取监控指标 | 已登录 | 无 | 200 | success=true |
| A39-P02 | 指定日期范围 | 已登录 | startDate=2026-01-01&endDate=2026-06-07 | 200 | 指定范围指标 |

---

### A40 GET /api/ai/parse-results/alerts 获取解析告警

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A40-P01 | admin获取告警 | admin登录 | 无 | 200 | data含total和alerts |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A40-E01 | formulist无权查看 | formulist登录 | 无 | 403 | code=FORBIDDEN |

---

### A41 GET /api/ai/parse-results/performance 获取性能统计

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A41-P01 | 获取性能统计 | 已登录 | 无 | 200 | success=true |

---

### A42 GET /api/ai/parse-results/:id 获取解析结果详情

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A42-P01 | 获取自己的解析详情 | 已登录, 记录属于当前用户 | id=valid | 200 | data含parsedResult/rawResponse等完整信息 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A42-E01 | 记录不存在 | 已登录 | id=notexist | 404 | code=PARSE_RESULT_NOT_FOUND |
| A42-E02 | 访问他人记录 | 已登录, 记录属于他人 | id=other_user | 404 | code=PARSE_RESULT_NOT_FOUND |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A42-DI01 | 只能查看自己的详情 | 已登录 | id=other_user_id | 404 | WHERE user_id=当前用户 |

---

### A43 GET /api/ai/parse-results/:id/linked-formula 获取关联配方

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A43-P01 | 获取已关联的配方 | 已登录, 有linked_formula_id | id=linked | 200 | data.linked=true, data.data含配方信息 |
| A43-P02 | 未关联配方 | 已登录, 无linked_formula_id | id=unlinked | 200 | data.linked=false |
| A43-P03 | 关联配方已被删除 | 已登录, linked_formula_id指向已删配方 | id=deleted_link | 200 | data.linked=false, message="关联的配方已被删除" |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A43-DI01 | admin可查看他人关联 | admin登录 | id=other_user | 200 | 正常返回 |

---

### A44 GET /api/ai/parse-results/:id/linked-material 获取关联原料

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A44-P01 | 获取已关联的原料 | 已登录, 有linked_material_id | id=linked | 200 | data.linked=true |
| A44-P02 | 未关联原料 | 已登录 | id=unlinked | 200 | data.linked=false |

---

### A45 GET /api/ai/formulas/:formulaId/parse-results 获取配方关联解析结果

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A45-P01 | 获取配方关联解析 | 已登录 | formulaId=valid | 200 | data含formulaId和parseResults |

---

### A46 GET /api/ai/materials/:materialId/parse-results 获取原料关联解析结果

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A46-P01 | 获取原料关联解析 | 已登录 | materialId=valid | 200 | data含materialId和parseResults |

---

### A47 POST /api/ai/parse-results 保存解析结果

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A47-P01 | 保存解析结果 | 已登录 | {callType, fileHash, fileName, fileSize, parsedResult, rawResponse} | 200 | success=true, data.id非空 | parse_results新增记录 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A47-E01 | 缺少必填参数 | 已登录 | {callType:"parse_formula"} | 400 | code=VALIDATION_ERROR |
| A47-E02 | 无效的callType | 已登录 | {callType:"invalid", ...} | 400 | code=VALIDATION_ERROR |
| A47-E03 | 存储空间不足 | 已登录, 达到storage_limit | 完整参数 | 507 | code=PARSE_RESULT_STORAGE_LIMIT |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A47-V01 | callType不在允许列表 | 已登录 | callType="dashboard_chat" | 400 | code=VALIDATION_ERROR |

---

### A48 POST /api/ai/parse-results/check 检查解析结果是否存在

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A48-P01 | 检查存在的解析结果 | 已登录, 有对应记录 | {fileHash:"abc", callType:"parse_formula"} | 200 | data.exists=true, data.parseResultId非空 |
| A48-P02 | 检查不存在的解析结果 | 已登录, 无对应记录 | {fileHash:"notexist", callType:"parse_formula"} | 200 | data.exists=false |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A48-E01 | 缺少必填参数 | 已登录 | {fileHash:"abc"} | 400 | code=VALIDATION_ERROR |

---

### A49 PUT /api/ai/parse-results/config 更新解析结果配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A49-P01 | admin更新配置 | admin登录 | {storageLimit:10000} | 200 | success=true |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A49-E01 | formulist无权更新 | formulist登录 | {storageLimit:10000} | 403 | code=FORBIDDEN |
| A49-E02 | storageLimit超出范围 | admin登录 | {storageLimit:100} | 400 | code=VALIDATION_ERROR |
| A49-E03 | 无有效更新字段 | admin登录 | {} | 400 | code=VALIDATION_ERROR |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A49-B01 | storageLimit=1000(最小值) | admin登录 | {storageLimit:1000} | 200 | success=true |
| A49-B02 | storageLimit=100000(最大值) | admin登录 | {storageLimit:100000} | 200 | success=true |
| A49-B03 | cleanupThresholdPercent=50(最小) | admin登录 | {cleanupThresholdPercent:50} | 200 | success=true |
| A49-B04 | cleanupThresholdPercent=99(最大) | admin登录 | {cleanupThresholdPercent:99} | 200 | success=true |

---

### A50 POST /api/ai/parse-results/cleanup 清理解析结果

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A50-P01 | admin执行清理 | admin登录 | {} | 200 | data.deletedCount>=0 |
| A50-P02 | 预览模式(dryRun) | admin登录 | {dryRun:true} | 200 | data.wouldDelete非空, 未实际删除 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A50-E01 | formulist无权清理 | formulist登录 | {} | 403 | code=FORBIDDEN |

---

### A51 POST /api/ai/parse-results/manual-cleanup 手动清理

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A51-P01 | admin手动清理 | admin登录 | {} | 200 | data含deletedCount/triggerReason |
| A51-P02 | dryRun模式 | admin登录 | {dryRun:true} | 200 | 未实际删除 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A51-E01 | formulist无权 | formulist登录 | {} | 403 | code=FORBIDDEN |

---

### A52 POST /api/ai/parse-results/:id/mark-used 标记解析结果已使用

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A52-P01 | 标记已使用并关联配方 | 已登录, 记录存在 | {linkedFormulaId:"fid", incrementCount:true} | 200 | success=true | is_linked=1, linked_formula_id更新, used_count+1 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A52-E01 | 记录不存在 | 已登录 | id=notexist | 404 | code=PARSE_RESULT_NOT_FOUND |

---

### A53 DELETE /api/ai/parse-results/:id 删除解析结果

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| A53-P01 | 删除自己的解析结果 | 已登录, 记录属于当前用户 | id=valid | 200 | success=true | parse_results删除对应记录 |
| A53-P02 | admin删除他人记录 | admin登录 | id=other_user | 200 | success=true | parse_results删除 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| A53-E01 | 记录不存在 | 已登录 | id=notexist | 404 | code=PARSE_RESULT_NOT_FOUND |
| A53-E02 | formulist删除他人记录 | formulist登录 | id=other_user | 403 | code=PARSE_RESULT_ACCESS_DENIED |

## 三、特殊场景测试

### 3.1 缓存行为 (X-CH)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-CH-01 | parse_formula缓存命中 | 同一用户上传相同文件(相同MD5)两次 | 第二次请求 | 返回cached=true，不调用AI |
| X-CH-02 | parse_nutrition缓存命中 | 同一用户上传相同营养文件两次 | 第二次请求 | 返回cached=true |
| X-CH-03 | 不同用户相同文件不共享缓存 | 用户A上传文件后，用户B上传相同文件 | 用户B请求 | 不命中缓存，重新解析 |
| X-CH-04 | 缓存记录更新used_count | 已有缓存记录时重复上传 | 重复请求 | parse_results.used_count递增 |

### 3.2 异步任务 (X-AS)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-AS-01 | CSV导出异步生成 | natural-search指定exportFormat=csv | 查询返回exportUrl | search_export_cache新增记录 |
| X-AS-02 | 导出文件24小时过期 | 导出文件创建超过24小时 | GET /api/ai/export/:filename | 返回410状态码 |

### 3.3 限流/频率控制 (X-RL)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-RL-01 | daily_call_limit告警触发 | 调用次数达到warning阈值 | 检查ai_alert_records | 新增warning级别记录 |
| X-RL-02 | daily_call_limit严重告警 | 调用次数达到critical阈值 | 检查ai_alert_records | 新增critical级别记录 |
| X-RL-03 | monthly_token_limit告警 | 月Token用量达到阈值 | 检查ai_alert_records | 新增对应级别记录 |

### 3.4 AI供应商故障转移 (X-AF)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-AF-01 | 设置fallback配置 | admin设置模型A的fallback为模型B | PUT /api/ai/models-manage/:id/fallback | ai_fallback_configs新增记录 |
| X-AF-02 | 清除fallback配置 | admin设置fallbackProvider为空 | PUT fallbackProvider="" | ai_fallback_configs对应记录被删除 |
| X-AF-03 | 健康检测标记unhealthy | 模型连接测试失败 | POST /api/ai/models-manage/:id/test | ai_models.health_status=unhealthy |

### 3.5 请求方法限制 (X-MD)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-MD-01 | GET请求到POST端点 | 对POST端点使用GET方法 | GET /api/ai/parse-formula | 404或405 |
| X-MD-02 | POST请求到GET端点 | 对GET端点使用POST方法 | POST /api/ai/models | 404或405 |

### 3.6 错误信息安全 (X-SE)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-SE-01 | AI解析失败不暴露内部细节 | AI服务异常 | POST /api/ai/parse-formula | 错误消息不包含堆栈信息 |
| X-SE-02 | SQL执行失败不暴露表结构 | SQL语法错误 | POST /api/ai/natural-search | 错误消息不含完整SQL语句 |

### 3.7 响应格式一致性 (X-RF)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-RF-01 | 成功响应格式 | 所有GET/POST成功请求 | 检查响应体 | 均为{success:true, data:{...}} |
| X-RF-02 | 错误响应格式 | 所有失败请求 | 检查响应体 | 均为{success:false, error/message:...} |

### 3.8 Content-Type校验 (X-CT)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-CT-01 | 文件上传Content-Type | 上传.xlsx文件 | 检查multer处理 | 正确识别为Excel |
| X-CT-02 | 不支持的文件类型 | 上传.pdf文件 | 检查multer | 拒绝并返回错误 |
| X-CT-03 | SSE响应Content-Type | POST /api/ai/chat | 检查响应头 | Content-Type=text/event-stream |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| A01 | 4 | 8 | 4 | 4 | 2 | 2 | 2 | 1 | 1 | 28 |
| A02 | 3 | 5 | 2 | 1 | 1 | 1 | 2 | 1 | 1 | 17 |
| A03 | 3 | 5 | 2 | 3 | 1 | 0 | 0 | 0 | 1 | 15 |
| A04 | 1 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 5 |
| A05 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 |
| A06 | 2 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 6 |
| A07 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 |
| A08 | 1 | 3 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 6 |
| A09 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A10 | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| A11 | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| A12 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A13 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A14 | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| A15 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A16 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A17 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 5 |
| A18 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A19 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A20 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A21 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A22 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A23 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A24 | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| A25 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A26 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A27 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A28 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A29 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A30 | 1 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 4 |
| A31 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A32 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A33 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A34 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A35 | 5 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 8 |
| A36 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A37 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A38 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A39 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A40 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A41 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A42 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 |
| A43 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 |
| A44 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A45 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A46 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| A47 | 1 | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 5 |
| A48 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A49 | 1 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 8 |
| A50 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A51 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| A52 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| A53 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| **合计** | **72** | **63** | **16** | **16** | **5** | **3** | **4** | **2** | **8** | **189** |
