# AI 代理接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-AGENT-20260607-001 |
| 路由文件 | backend/src/routes/agent.ts |
| 端点数 | 14 |
| 测试用例数 | 98 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| G01 | POST | /api/agent/chat | authMiddleware | AI代理对话(SSE流式/普通) |
| G02 | POST | /api/agent/submit-form | authMiddleware | 提交待确认表单 |
| G03 | GET | /api/agent/pending-form/:sessionId | authMiddleware | 获取待确认表单 |
| G04 | GET | /api/agent/sessions | authMiddleware | 获取会话列表 |
| G05 | GET | /api/agent/sessions/:sessionId | authMiddleware | 获取会话消息 |
| G06 | DELETE | /api/agent/sessions/:sessionId | authMiddleware | 删除会话 |
| G07 | GET | /api/agent/role-config | authMiddleware | 获取身份配置 |
| G08 | PUT | /api/agent/role-config | authMiddleware | 更新身份配置 |
| G09 | GET | /api/agent/float-config | authMiddleware | 获取悬浮球配置 |
| G10 | PUT | /api/agent/float-config | authMiddleware | 更新悬浮球配置(仅admin) |
| G11 | POST | /api/agent/parse-form | authMiddleware | 悬浮球表单解析 |
| G12 | POST | /api/agent/float-chat | authMiddleware | 悬浮球对话(SSE流式) |
| G13 | POST | /api/agent/generate-description | authMiddleware | 生成配方描述/制法 |
| G14 | GET | /api/agent/field-hints | authMiddleware | 获取字段提示 |
| G15 | GET | /api/agent/health | authMiddleware | 获取代理健康状态 |

## 二、测试用例

### G01 POST /api/agent/chat AI代理对话

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G01-P01 | 流式对话(stream=true) | 已登录 | {message:"你好", stream:true} | 200 | Content-Type=text/event-stream, SSE事件流 | session消息记录 |
| G01-P02 | 普通对话(stream=false) | 已登录 | {message:"你好", stream:false} | 200 | {success:true, type:"text", content:...} | session消息记录 |
| G01-P03 | 指定已有sessionId | 已登录, 会话存在 | {message:"继续", sessionId:"sid123"} | 200 | 同一sessionId | 追加消息 |
| G01-P04 | 不指定sessionId自动创建 | 已登录 | {message:"新对话"} | 200 | 返回新sessionId | 新建session |
| G01-P05 | 指定模型和版本 | 已登录 | {message:"你好", model:"deepseek", modelVersion:"deepseek-chat"} | 200 | 使用指定模型 | - |
| G01-P06 | 对话触发工具调用 | 已登录 | {message:"查询所有配方", stream:false} | 200 | type="tool_call_required", toolCalls非空 | - |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G01-E01 | 未登录 | 无Token | {message:"你好"} | 401 | error="认证信息缺失，请重新登录" |
| G01-E02 | 消息为空 | 已登录 | {message:""} | 400 | error="消息不能为空且必须是字符串" |
| G01-E03 | 消息为非字符串 | 已登录 | {message:123} | 400 | error="消息不能为空且必须是字符串" |
| G01-E04 | AI服务异常 | 已登录, AI不可用 | {message:"你好"} | 500 | error含错误信息 |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G01-B01 | 超长消息 | 已登录 | {message:"a".repeat(10000)} | 200 | 正常处理(可能截断) |
| G01-B02 | 消息含特殊字符 | 已登录 | {message:"<script>alert(1)</script>"} | 200 | 不执行脚本 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G01-R01 | admin用户对话 | admin登录 | {message:"你好"} | 200 | 正常响应 |
| G01-R02 | formulist用户对话 | formulist登录 | {message:"你好"} | 200 | 正常响应 |
| G01-R03 | Token过期 | 过期Token | {message:"你好"} | 401 | TOKEN_EXPIRED |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G01-V01 | message为null | 已登录 | {message:null} | 400 | error="消息不能为空且必须是字符串" |
| G01-V02 | message为undefined | 已登录 | {} | 400 | error="消息不能为空且必须是字符串" |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G01-S01 | 新会话首次对话 | 无已有session | {message:"你好"} | 200 | 自动创建session |
| G01-S02 | 已有会话继续对话 | session存在 | {message:"继续", sessionId:"sid"} | 200 | 追加到同一session |

---

### G02 POST /api/agent/submit-form 提交待确认表单

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G02-P01 | 提交有效表单 | 已登录, 有pending form | {sessionId:"sid", formId:"fid", formData:{name:"测试"}} | 200 | success=true, data含工具执行结果 | agent_pending_forms删除记录 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G02-E01 | 未登录 | 无Token | 完整参数 | 401 | error="认证信息缺失" |
| G02-E02 | 缺少必要参数 | 已登录 | {sessionId:"sid"} | 400 | error="缺少必要参数" |
| G02-E03 | 表单已过期 | 已登录, 无pending form | {sessionId:"sid", formId:"fid", formData:{}} | 400 | error="表单已过期或不存在" |
| G02-E04 | 表单校验失败 | 已登录, 必填字段为空 | {sessionId:"sid", formId:"fid", formData:{name:""}} | 200 | success=false, validationErrors非空 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G02-V01 | formData中数值字段传非数字 | 已登录 | formData中数值字段传字符串 | 200 | validationErrors含"必须是数字" |
| G02-V02 | formData中数值字段小于最小值 | 已登录 | formData中数值字段<min | 200 | validationErrors含"不能小于" |

---

### G03 GET /api/agent/pending-form/:sessionId 获取待确认表单

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G03-P01 | 获取存在的待确认表单 | 已登录, 有pending form | sessionId=valid | 200 | success=true, data含表单schema |
| G03-P02 | 无待确认表单 | 已登录, 无pending form | sessionId=valid | 200 | success=true, data=null |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G03-E01 | 未登录 | 无Token | sessionId=valid | 401 | error="认证信息缺失" |

---

### G04 GET /api/agent/sessions 获取会话列表

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G04-P01 | 获取自己的会话列表 | 已登录 | 无 | 200 | success=true, data数组 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G04-E01 | 未登录 | 无Token | 无 | 401 | error="认证信息缺失" |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G04-DI01 | 只能看自己的会话 | 已登录 | 无 | 200 | 仅含user_id=当前用户的会话 |

---

### G05 GET /api/agent/sessions/:sessionId 获取会话消息

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G05-P01 | 获取自己会话的消息 | 已登录, 会话属于当前用户 | sessionId=valid | 200 | success=true, data含session和messages |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G05-E01 | 会话不存在 | 已登录 | sessionId=notexist | 404 | error="会话不存在" |
| G05-E02 | 访问他人会话 | 已登录, 会话属于他人 | sessionId=other_user | 403 | error="无权访问此会话" |

#### 2.9 数据隔离
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G05-DI01 | 不能查看他人会话 | 已登录 | sessionId=other_user | 403 | error="无权访问此会话" |

---

### G06 DELETE /api/agent/sessions/:sessionId 删除会话

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 | 预期数据库变化 |
|--------|---------|---------|---------|-----------|---------|-------------|
| G06-P01 | 删除自己的会话 | 已登录, 会话属于当前用户 | sessionId=valid | 200 | success=true, message="会话已删除" | 删除session及pending form/confirmation |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G06-E01 | 会话不存在 | 已登录 | sessionId=notexist | 404 | error="会话不存在" |
| G06-E02 | 删除他人会话 | 已登录, 会话属于他人 | sessionId=other_user | 403 | error="无权删除此会话" |

#### 2.8 幂等性
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G06-I01 | 重复删除同一会话 | 已删除一次 | sessionId=deleted | 404 | error="会话不存在" |

---

### G07 GET /api/agent/role-config 获取身份配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G07-P01 | 获取已有配置 | 已登录, 有配置记录 | 无 | 200 | success=true, data含agent_name/user_title等 |
| G07-P02 | 首次获取自动创建默认配置 | 已登录, 无配置记录 | 无 | 200 | success=true, data含默认值(agent_name="小听") |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G07-E01 | 未登录 | 无Token | 无 | 401 | error="认证信息缺失" |

---

### G08 PUT /api/agent/role-config 更新身份配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G08-P01 | 更新身份配置 | 已登录 | {agent_name:"小智", user_title:"经理", tone_style:"casual"} | 200 | success=true, data含更新后配置 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G08-E01 | 未登录 | 无Token | 完整参数 | 401 | error="认证信息缺失" |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G08-S01 | 首次更新(无已有配置) | 已登录, 无配置 | {agent_name:"小智"} | 200 | 自动创建并更新 |
| G08-S02 | 更新后缓存失效 | 已登录 | {agent_name:"小智"} | 200 | invalidateChatSystemPromptCache被调用 |

---

### G09 GET /api/agent/float-config 获取悬浮球配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G09-P01 | 获取已有配置 | 已登录, 有配置 | 无 | 200 | success=true, data含enabled/model/position等 |
| G09-P02 | 首次获取自动创建默认 | 已登录, 无配置 | 无 | 200 | data含默认值(enabled=true, model="deepseek") |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G09-E01 | 未登录 | 无Token | 无 | 401 | error="认证信息缺失" |

---

### G10 PUT /api/agent/float-config 更新悬浮球配置

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G10-P01 | admin更新悬浮球配置 | admin登录 | {enabled:true, model:"deepseek", position:"right"} | 200 | success=true, data含更新后配置 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G10-E01 | formulist无权更新 | formulist登录 | {enabled:false} | 403 | error="仅管理员可修改悬浮球配置" |
| G10-E02 | 未登录 | 无Token | 完整参数 | 401 | error="认证信息缺失" |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G10-B01 | enabled_pages为空数组 | admin登录 | {enabled_pages:[]} | 200 | 所有页面不启用 |
| G10-B02 | enabled_pages含多个页面 | admin登录 | {enabled_pages:["formula-add","material-add"]} | 200 | 指定页面启用 |

#### 2.4 权限认证
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G10-R01 | admin可更新 | admin登录 | 完整参数 | 200 | success=true |
| G10-R02 | formulist不可更新 | formulist登录 | 完整参数 | 403 | FORBIDDEN |

---

### G11 POST /api/agent/parse-form 悬浮球表单解析

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G11-P01 | 解析配方表单 | 已登录, 悬浮球启用 | {pageId:"formula-add", utterance:"创建一个叫测试的配方，成品重量300g"} | 200 | code=0, data.fields含name/finished_weight |
| G11-P02 | 解析原料表单 | 已登录 | {pageId:"material-add", utterance:"添加原料枸杞，编码GQ001"} | 200 | code=0, data.fields含name/code |
| G11-P03 | 指定已有sessionId | 已登录 | {pageId:"formula-add", utterance:"继续", sessionId:"sid"} | 200 | 同一sessionId |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G11-E01 | 未登录 | 无Token | 完整参数 | 401 | error="认证信息缺失" |
| G11-E02 | pageId为空 | 已登录 | {utterance:"测试"} | 400 | code=1, error="pageId 和 utterance 不能为空" |
| G11-E03 | utterance为空 | 已登录 | {pageId:"formula-add"} | 400 | code=1, error="pageId 和 utterance 不能为空" |
| G11-E04 | 悬浮球已禁用 | 已登录, enabled=false | {pageId:"formula-add", utterance:"测试"} | 200 | code=1, error="悬浮球 Agent 已禁用" |
| G11-E05 | 当前页面未启用Agent | 已登录, enabled_pages不含当前pageId | {pageId:"other-page", utterance:"测试"} | 200 | code=1, error="当前页面未启用 Agent" |
| G11-E06 | AI服务异常 | 已登录, AI不可用 | {pageId:"formula-add", utterance:"测试"} | 500 | code=1 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G11-V01 | 不支持的pageId | 已登录 | {pageId:"unknown-page", utterance:"测试"} | 200 | fields为空对象 |

---

### G12 POST /api/agent/float-chat 悬浮球对话

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G12-P01 | 填表意图(fill) | 已登录 | {pageId:"formula-add", utterance:"创建配方测试"} | 200 | 走parseForm逻辑 |
| G12-P02 | 计算意图(calculate) | 已登录 | {pageId:"formula-add", utterance:"帮我算一下营养含量"} | 200 | SSE流式返回 |
| G12-P03 | 对比意图(compare) | 已登录 | {pageId:"formula-add", utterance:"对比配方A和配方B"} | 200 | SSE流式返回 |
| G12-P04 | 生成意图(generate) | 已登录 | {pageId:"formula-add", utterance:"生成描述"} | 200 | SSE流式返回 |
| G12-P05 | 咨询意图(consult) | 已登录 | {pageId:"formula-add", utterance:"含量比是什么意思"} | 200 | SSE流式返回 |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G12-E01 | 未登录 | 无Token | 完整参数 | 401 | error="认证信息缺失" |
| G12-E02 | pageId为空 | 已登录 | {utterance:"测试"} | 400 | error="pageId 和 utterance 不能为空" |
| G12-E03 | utterance为空 | 已登录 | {pageId:"formula-add"} | 400 | error="pageId 和 utterance 不能为空" |

#### 2.6 状态流转
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G12-S01 | 写操作意图在非表单页 | 已登录, pageId非表单页 | {pageId:"dashboard", utterance:"删除配方"} | 200 | SSE返回write_guidance事件 |
| G12-S02 | 写操作意图在表单页 | 已登录, pageId为表单页 | {pageId:"formula-add", utterance:"删除配方"} | 200 | 正常走ReAct流程 |

---

### G13 POST /api/agent/generate-description 生成配方描述/制法

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G13-P01 | 生成配方描述 | 已登录 | {formulaName:"养生膏", type:"description"} | 200 | success=true, data.content非空 |
| G13-P02 | 生成配方制法 | 已登录 | {formulaName:"养生膏", type:"preparation"} | 200 | success=true, data.content非空 |
| G13-P03 | 修订描述 | 已登录 | {formulaName:"养生膏", revisionReason:"增加原料", existingDescription:"旧描述"} | 200 | data.content含修订后描述 |
| G13-P04 | 使用prompt模板生成 | 已登录, 有smart-generate模板 | {formulaName:"养生膏", type:"description"} | 200 | 使用模板的system/user prompt |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G13-E01 | 未登录 | 无Token | 完整参数 | 401 | error="认证信息缺失" |
| G13-E02 | formulaName为空 | 已登录 | {formulaName:""} | 400 | error="配方名称不能为空" |
| G13-E03 | AI服务异常 | 已登录, AI不可用 | {formulaName:"测试"} | 500 | error含错误信息 |

#### 2.5 参数校验
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G13-V01 | formulaName缺失 | 已登录 | {type:"description"} | 400 | error="配方名称不能为空" |

---

### G14 GET /api/agent/field-hints 获取字段提示

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G14-P01 | 获取配方表单字段提示 | 已登录 | pageId=formula-add | 200 | data含missingFields/hints/count |
| G14-P02 | 获取原料表单字段提示 | 已登录 | pageId=material-add | 200 | data含missingFields/hints |

#### 2.2 异常流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G14-E01 | 未登录 | 无Token | pageId=formula-add | 401 | error="认证信息缺失" |

#### 2.3 边界条件
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G14-B01 | pageId为空 | 已登录 | 不传pageId | 200 | data.missingFields=[], count=0 |
| G14-B02 | 不支持的pageId | 已登录 | pageId=unknown | 200 | data.missingFields=[], count=0 |

---

### G15 GET /api/agent/health 获取代理健康状态

#### 2.1 正向流程
| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期状态码 | 预期响应 |
|--------|---------|---------|---------|-----------|---------|
| G15-P01 | 获取健康状态 | 已登录 | 无 | 200 | success=true, data.status为online/loading/error |
| G15-P02 | 无健康记录时返回默认 | 已登录, 无ai_health_records | 无 | 200 | data.status="online" |

## 三、特殊场景测试

### 3.1 SSE连接管理 (X-SSE)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-SSE-01 | SSE心跳保活 | 已登录, 长时间对话 | 观察SSE事件流 | 每8秒收到heartbeat注释 |
| X-SSE-02 | SSE连接超时 | 已登录, 连接超过5分钟 | 等待超时 | 收到error事件后连接关闭 |
| X-SSE-03 | 客户端断开连接 | 已登录, SSE连接中 | 客户端主动断开 | 服务端AbortController触发，停止AI调用 |
| X-SSE-04 | SSE事件类型完整性 | 已登录, 触发工具调用 | 检查事件序列 | 依次收到chunk/tool_calls/tool_result/done事件 |

### 3.2 ReAct循环控制 (X-REACT)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-REACT-01 | 最大迭代次数限制 | 已登录, AI反复调用工具 | 观察迭代次数 | 最多5次迭代后停止 |
| X-REACT-02 | 写操作拦截 | 已登录, 非表单页触发写操作 | 发送写操作意图 | 收到write_guidance事件，不执行写操作 |
| X-REACT-03 | 工具调用后生成总结 | 已登录, 工具调用完成 | 检查最终响应 | 有总结性文字输出 |

### 3.3 会话管理 (X-SESSION)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-SESSION-01 | 会话标题自动生成 | 已登录 | 发送消息创建新会话 | 标题为消息前20字符 |
| X-SESSION-02 | 删除会话清理关联数据 | 已登录, 有pending form | 删除会话 | pending form和confirmation也被删除 |
| X-SESSION-03 | 会话消息上下文窗口 | 已登录, 多轮对话 | 检查发送给AI的消息 | 最多包含18条上下文消息 |

### 3.4 悬浮球意图分类 (X-INTENT)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-INTENT-01 | fill意图识别 | 已登录 | utterance含"添加/创建/填写" | 走parseForm逻辑 |
| X-INTENT-02 | compare意图识别 | 已登录 | utterance含"对比/比较" | 走ReAct流程 |
| X-INTENT-03 | substitute意图识别 | 已登录 | utterance含"替代/替换" | 走ReAct流程 |
| X-INTENT-04 | quotation意图识别 | 已登录 | utterance含"报价/价格" | 走ReAct流程 |
| X-INTENT-05 | generate意图识别 | 已登录 | utterance含"生成描述/写描述" | 走handleGenerateIntent |
| X-INTENT-06 | calculate意图识别 | 已登录 | utterance含"计算/校验" | 走ReAct流程 |
| X-INTENT-07 | consult意图识别 | 已登录 | utterance含"什么意思/怎么填" | 走ReAct流程 |

### 3.5 写操作守卫 (X-GUARD)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-GUARD-01 | 非表单页写操作拦截 | 已登录, pageId非FORM_PAGE_IDS | 发送写操作意图 | 返回write_guidance事件 |
| X-GUARD-02 | 表单页写操作放行 | 已登录, pageId为formula-add | 发送写操作意图 | 正常执行ReAct流程 |

### 3.6 请求方法限制 (X-MD)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-MD-01 | GET请求到POST端点 | 已登录 | GET /api/agent/chat | 404或405 |

### 3.7 错误信息安全 (X-SE)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-SE-01 | AI服务错误不暴露堆栈 | 已登录, AI异常 | POST /api/agent/chat | 错误消息不包含堆栈信息 |

### 3.8 响应格式一致性 (X-RF)
| 用例ID | 用例名称 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|
| X-RF-01 | parse-form响应格式 | 已登录 | POST /api/agent/parse-form | {code:0, data:{fields, missingFields, message, sessionId}} |
| X-RF-02 | 非SSE端点响应格式 | 已登录 | GET /api/agent/sessions | {success:true, data:[...]} |
| X-RF-03 | SSE事件格式 | 已登录 | POST /api/agent/chat | data: {type:"chunk", content:"..."} |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| G01 | 6 | 4 | 2 | 3 | 2 | 2 | 0 | 0 | 0 | 19 |
| G02 | 1 | 4 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 7 |
| G03 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| G04 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 |
| G05 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 |
| G06 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 4 |
| G07 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| G08 | 1 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 4 |
| G09 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| G10 | 1 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 7 |
| G11 | 3 | 6 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 10 |
| G12 | 5 | 3 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 10 |
| G13 | 4 | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 8 |
| G14 | 2 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| G15 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| **合计** | **34** | **32** | **6** | **5** | **6** | **6** | **0** | **1** | **2** | **92** |
