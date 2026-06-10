# AI + Agent 模块前后端联调测试用例

## 文档信息

| 字段 | 值 |
|------|-----|
| 文档ID | ITC-AI-20260609-001 |
| 模块 | AI（智能服务）+ Agent（智能助手） |
| 版本 | v1.0 |
| 编写日期 | 2026-06-09 |
| 编写方式 | 基于源码扫描自动生成 |

---

## 1. 模块接口映射

### 1.1 前端 API → 后端路由 对照表

#### AI 核心 API（ai.ts）

| 前端 API 函数 | HTTP 方法 | 前端路径 | 后端路由 | 认证 | Content-Type | 超时 |
|---------------|-----------|----------|----------|------|-------------|------|
| `aiApi.getModels()` | GET | `/ai/models` | `GET /api/ai/models` | authMiddleware | application/json | 默认 |
| `aiApi.parseFormula()` | POST | `/ai/parse-formula` | `POST /api/ai/parse-formula` | authMiddleware | multipart/form-data | 120s |
| `aiApi.parseMaterial()` | POST | `/ai/parse-material-nutrition` | `POST /api/ai/parse-material-nutrition` | authMiddleware | multipart/form-data | 120s |
| `aiApi.naturalSearch()` | POST | `/ai/natural-search` | `POST /api/ai/natural-search` | authMiddleware | application/json | 60s |

#### AI 对话（SSE 流式）

| 前端调用 | HTTP 方法 | 后端路由 | 认证 | Content-Type | 响应类型 |
|---------|-----------|----------|------|-------------|---------|
| AiOverview.vue fetchEventSource | POST | `/api/ai/chat` | authMiddleware | application/json | text/event-stream |

#### 模型管理 API（model.ts，28个函数）

| 前端 API 函数 | HTTP 方法 | 前端路径 | 后端路由 | 认证 |
|---------------|-----------|----------|----------|------|
| `modelApi.getModels()` | GET | `/ai/models-manage` | `GET /api/ai/models-manage` | authMiddleware |
| `modelApi.createModel()` | POST | `/ai/models-manage` | `POST /api/ai/models-manage` | authMiddleware |
| `modelApi.updateModel()` | PUT | `/ai/models-manage/:id` | `PUT /api/ai/models-manage/:id` | authMiddleware |
| `modelApi.deleteModel()` | DELETE | `/ai/models-manage/:id` | `DELETE /api/ai/models-manage/:id` | authMiddleware |
| `modelApi.testConnection()` | POST | `/ai/models-manage/:id/test` | `POST /api/ai/models-manage/:id/test` | authMiddleware |
| `modelApi.getVersions()` | GET | `/ai/models-manage/:id/versions` | `GET /api/ai/models-manage/:id/versions` | authMiddleware |
| `modelApi.getVersionsByProvider()` | GET | `/ai/models/:provider/versions` | `GET /api/ai/models/:provider/versions` | authMiddleware |
| `modelApi.switchVersion()` | PUT | `/ai/models/:provider/version` | `PUT /api/ai/models/:provider/version` | authMiddleware |
| `modelApi.setFallback()` | PUT | `/ai/models-manage/:id/fallback` | `PUT /api/ai/models-manage/:id/fallback` | authMiddleware |
| `modelApi.getUsageStats()` | GET | `/ai/usage` | `GET /api/ai/usage` | authMiddleware |
| `modelApi.getUsageLogs()` | GET | `/ai/usage/logs` | `GET /api/ai/usage/logs` | authMiddleware |
| `modelApi.getAlertConfigs()` | GET | `/ai/alerts/configs` | `GET /api/ai/alerts/configs` | authMiddleware |
| `modelApi.updateAlertConfig()` | PUT | `/ai/alerts/configs/:id` | `PUT /api/ai/alerts/configs/:id` | authMiddleware |
| `modelApi.getAlertRecords()` | GET | `/ai/alerts/records` | `GET /api/ai/alerts/records` | authMiddleware |
| `modelApi.getHealthStatus()` | GET | `/ai/health` | `GET /api/ai/health` | authMiddleware |
| `modelApi.getHealthHistory()` | GET | `/ai/health/:provider/history` | `GET /api/ai/health/:provider/history` | authMiddleware |
| `modelApi.getRecentActivity()` | GET | `/ai/recent-activity` | `GET /api/ai/recent-activity` | authMiddleware |
| `modelApi.getSmartToolHistory()` | GET | `/ai/smart-tool-history` | `GET /api/ai/smart-tool-history` | authMiddleware |
| `modelApi.deleteSmartToolHistory()` | DELETE | `/ai/smart-tool-history/:id` | `DELETE /api/ai/smart-tool-history/:id` | authMiddleware |
| `modelApi.getModelApplications()` | GET | `/ai/model-applications` | `GET /api/ai/model-applications` | authMiddleware |
| `modelApi.createModelApplication()` | POST | `/ai/model-applications` | `POST /api/ai/model-applications` | authMiddleware |
| `modelApi.updateModelApplication()` | PUT | `/ai/model-applications/:id` | `PUT /api/ai/model-applications/:id` | authMiddleware |
| `modelApi.patchModelApplication()` | PATCH | `/ai/model-applications/:id` | `PATCH /api/ai/model-applications/:id` | authMiddleware |
| `modelApi.deleteModelApplication()` | DELETE | `/ai/model-applications/:id` | `DELETE /api/ai/model-applications/:id` | authMiddleware |
| `modelApi.getPromptTemplates()` | GET | `/ai/prompt-templates` | `GET /api/ai/prompt-templates` | authMiddleware |
| `modelApi.createPromptTemplate()` | POST | `/ai/prompt-templates` | `POST /api/ai/prompt-templates` | authMiddleware |
| `modelApi.updatePromptTemplate()` | PUT | `/ai/prompt-templates/:id` | `PUT /api/ai/prompt-templates/:id` | authMiddleware |
| `modelApi.deletePromptTemplate()` | DELETE | `/ai/prompt-templates/:id` | `DELETE /api/ai/prompt-templates/:id` | authMiddleware |

#### Agent API（13端点）

| 前端调用 | HTTP 方法 | 后端路由 | 认证 | 响应类型 |
|---------|-----------|----------|------|---------|
| AiAssistantFloat | POST | `/api/agent/chat` | authMiddleware | text/event-stream |
| AiAssistantFloat | POST | `/api/agent/float-chat` | authMiddleware | text/event-stream |
| AiAssistantFloat | GET | `/api/agent/sessions` | authMiddleware | application/json |
| AiAssistantFloat | GET | `/api/agent/sessions/:sessionId` | authMiddleware | application/json |
| AiAssistantFloat | DELETE | `/api/agent/sessions/:sessionId` | authMiddleware | application/json |
| AiAssistantFloat | GET | `/api/agent/role-config` | authMiddleware | application/json |
| AiAssistantFloat | PUT | `/api/agent/role-config` | authMiddleware | application/json |
| AiAssistantFloat | GET | `/api/agent/float-config` | authMiddleware | application/json |
| AiAssistantFloat | PUT | `/api/agent/float-config` | authMiddleware | application/json |
| AiAssistantFloat | POST | `/api/agent/parse-form` | authMiddleware | application/json |
| AiAssistantFloat | POST | `/api/agent/generate-description` | authMiddleware | application/json |
| AiAssistantFloat | GET | `/api/agent/field-hints` | authMiddleware | application/json |
| AiAssistantFloat | GET | `/api/agent/health` | authMiddleware | application/json |

### 1.2 数据流图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3 + Pinia)                                 │
│                                                                             │
│  AiOverview.vue ──→ fetchEventSource ──→ POST /api/ai/chat (SSE)           │
│       │                    │                                                │
│       │                    ├── type=token → 追加渲染                        │
│       │                    ├── type=complete → 结束+统计                    │
│       │                    └── type=error → 错误提示                        │
│       │                                                                     │
│  SmartTools.vue ──→ aiStore ──→ aiApi ──→ http (axios)                     │
│       │              │           │                                          │
│       │              ├── parseFormula()  ──→ POST /ai/parse-formula         │
│       │              │   (AbortController, 120s, multipart/form-data)       │
│       │              ├── parseMaterial() ──→ POST /ai/parse-material-...    │
│       │              │   (AbortController, 120s, multipart/form-data)       │
│       │              └── naturalSearch()  ──→ POST /ai/natural-search       │
│       │                  (60s timeout, application/json)                    │
│       │                                                                     │
│  DataSearchTab.vue ──→ aiStore.naturalSearch() ──→ NL2SQL                  │
│       │                    ├── searchResult.sql → SQL展示区                  │
│       │                    ├── searchResult.rows → 结果表格                  │
│       │                    └── searchResult.exportUrl → CSV导出              │
│       │                                                                     │
│  AiAssistantFloat ──→ POST /api/agent/chat (SSE ReAct)                     │
│       │              POST /api/agent/float-chat (SSE+意图分类)              │
│       │                    ├── type=chunk → 流式文本追加                    │
│       │                    ├── type=tool_calls → 工具调用展示               │
│       │                    ├── type=tool_result → 工具结果展示              │
│       │                    ├── type=content_clear → 清空中间文本            │
│       │                    ├── type=done → 结束+统计                        │
│       │                    └── type=error → 错误提示                        │
│       │                                                                     │
│  ModelManagement.vue ──→ modelApi ──→ 28个模型管理端点                     │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ HTTP / SSE
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     后端 (Express + AIService + LLMAgentService)            │
│                                                                             │
│  POST /api/ai/chat ── chatStream ── AIService.chatCompletion               │
│    SSE: {type:token,content} / {type:complete,...} / {type:error}          │
│                                                                             │
│  POST /api/ai/parse-formula ── multer ── AIService.chatCompletion          │
│    FormData: file + model + version → 视觉模型解析 → ParsedFormula         │
│                                                                             │
│  POST /api/ai/natural-search ── AIService.chatCompletion                   │
│    → NL2SQL_SYSTEM_PROMPT → validateSQL → query() → rows                  │
│    → 非admin: injectCreatedByFilter → 数据隔离                              │
│                                                                             │
│  POST /api/agent/chat ── AgentChatController.handleChat                    │
│    SSE ReAct循环 (MAX_REACT_ITERATIONS=5):                                  │
│    1. callLLMWithTools → llmAgentService.streamChat                        │
│    2. tool_calls? → toolRegistry.execute → SSE tool_result                │
│    3. 无tool_calls? → break → 最终回复                                     │
│    心跳: 8s / 连接超时: 300s                                               │
│                                                                             │
│  POST /api/agent/float-chat ── AIAgentController.floatChat                 │
│    1. checkWriteIntentFromText → 写操作守卫                                 │
│    2. classifyFloatIntent → 意图分类 (fill/generate/chat)                   │
│    3. fill → parseForm / generate → handleGenerateIntent                   │
│    4. chat → handleFloatReActStream (ReAct+页面上下文)                      │
│                                                                             │
│  降级机制:                                                                  │
│    AIService: chatCompletion失败 → getFallbackProvider → 备用接管          │
│    LLMAgentService: 熔断器(3次失败→熔断300s), 降级链                       │
│      ["deepseek","dashscope","zhipu"], 429重试3次                           │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ SQL (参数化) / HTTP (AI Provider API)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│     数据库 + 外部 AI 供应商 (DashScope / Zhipu / DeepSeek)                  │
│  ai_models / ai_usage_logs / ai_fallback_configs / parse_results /         │
│  agent_role_config / agent_float_config / agent_sessions (内存)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 SSE 流式响应时序图

#### AI 对话流（POST /api/ai/chat）

```
前端AiOverview     fetchEventSource      后端chatStream    AIService
    │                      │                     │                │
    │──POST /api/ai/chat──→│                     │                │
    │  {message, model}    │──req.body──────────→│                │
    │                      │                     │──chatCompletion→│
    │                      │                     │  (stream:true)  │
    │                      │                     │←──onToken──────│
    │←──SSE {type:token}──│←──res.write────────│  content:"..."  │
    │  追加渲染             │                     │←──onToken──────│
    │←──SSE {type:token}──│←──res.write────────│  ...            │
    │                      │                     │←──完成─────────│
    │←──SSE {type:complete}│←──res.write────────│  content,model,│
    │  显示统计             │                     │  tokens,latency│
    │←──SSE [DONE]────────│←──res.write────────│                │
    │  连接关闭             │                     │                │
```

#### Agent ReAct 循环（POST /api/agent/chat）

```
前端AiAssistantFloat    后端AgentChatController    LLMAgentService    ToolRegistry
    │                          │                          │                 │
    │──POST /api/agent/chat──→│                          │                 │
    │  {message,sessionId,     │──setupSSE()──────────→  │                 │
    │   model,modelVersion}    │  (心跳8s,超时300s)       │                 │
    │                          │                          │                 │
    │  ┌─── ReAct 迭代 1 ──────┼──────────────────────────┼─────────────────┤
    │                          │──callLLMWithTools()──→   │                 │
    │                          │                          │──streamChat()──→│
    │←──SSE {type:chunk}──────│←──onChunk───────────────│  (流式文本)      │
    │  追加渲染                │                          │                 │
    │                          │←──tool_calls────────────│                 │
    │←──SSE {type:content_    │  (清空中间文本)          │                 │
    │   clear}                 │                          │                 │
    │←──SSE {type:tool_calls} │  (展示工具调用)          │                 │
    │                          │──toolRegistry.execute───→│──execute()─────→│
    │←──SSE {type:tool_result}│←──ToolResult────────────│←──result───────│
    │  显示工具结果            │                          │                 │
    │  ┌─── ReAct 迭代 2 ──────┼──────────────────────────┼─────────────────┤
    │←──SSE {type:chunk}──────│←──onChunk───────────────│  (无tool_calls)  │
    │←──SSE {type:done,       │──cleanupSSE+res.end()   │                 │
    │   sessionId,usage,      │                          │                 │
    │   model,latency}        │                          │                 │
    │  连接关闭                │                          │                 │
```

---

## 2. 联调场景用例

### I-SSE01: AI 对话流式渲染

**场景**：用户在 AiOverview 页面发送消息，AI 流式返回响应并实时渲染

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 打开 `/ai` 页面 | 展示 | AiOverview 渲染，AI 对话区域可见 |
| 2 | 输入消息"你好" | 操作 | 文本输入框可输入 |
| 3 | 点击发送按钮 | 操作 | 触发 `fetchEventSource` |
| 4 | HTTP 请求发出 | 请求 | `POST /api/ai/chat`，Content-Type: application/json，body: `{message:"你好", model:"deepseek"}` |
| 5 | 后端设置 SSE 头 | 响应 | Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive |
| 6 | 后端构建消息 | 后端 | `[{role:"system", content:DASHBOARD_SYSTEM_PROMPT}, {role:"user", content:"你好"}]` |
| 7 | 调用 AIService.chatCompletion | 后端 | stream=true, callType="dashboard_chat" |
| 8 | AI 返回第一个 token | 响应 | SSE: `data: {"type":"token","content":"你"}\n\n` |
| 9 | 前端接收 token | 展示 | 消息气泡开始出现文字"你" |
| 10 | 持续接收 tokens | 展示 | 文字逐字追加渲染，形成流式打字效果 |
| 11 | AI 流式完成 | 响应 | SSE: `data: {"type":"complete","content":"完整回复","model":"deepseek-chat","tokens":42,"latency":1234}\n\n` |
| 12 | 接收结束标记 | 响应 | SSE: `data: [DONE]\n\n` |
| 13 | 前端关闭连接 | 展示 | 消息气泡渲染完成，显示 token 数和延迟统计 |
| 14 | 用量记录 | DB | ai_usage_logs 插入一条记录，callType="dashboard_chat"，status="success" |

**7层闭环验证**：
| 层 | 验证点 |
|----|--------|
| 操作 | 输入消息→点击发送 |
| 请求 | POST /api/ai/chat，body含message+model |
| DB | ai_usage_logs记录调用信息 |
| Store | 无（SSE不经过Pinia） |
| 响应 | SSE流：token→complete→[DONE] |
| 展示 | 消息逐字渲染，完成后显示统计 |
| 存储 | 无持久化存储（对话历史未持久化到前端） |

---

### I-SSE02: AI 流式中途断开+重试

**场景**：AI 对话流式传输过程中网络断开或 AI 服务出错

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 发送消息触发 AI 对话 | 操作 | 正常开始流式接收 |
| 2 | 模拟网络断开 | 操作 | 浏览器断网或关闭连接 |
| 3 | 后端检测连接关闭 | 后端 | `res.on("close")` 触发，AbortController.abort() |
| 4 | 后端清理资源 | 后端 | clearInterval(heartbeat), clearTimeout(connectionTimeout) |
| 5 | 前端检测连接断开 | 前端 | fetchEventSource onerror 回调触发 |
| 6 | 前端展示错误状态 | 展示 | 已接收的部分内容保留，显示连接断开提示 |
| 7 | 恢复网络后重新发送 | 操作 | 新的 POST /api/ai/chat 请求 |
| 8 | 新对话正常流式 | 响应 | SSE 流正常工作 |

**AI 服务内部错误分支**：
| 分支 | 触发条件 | 后端行为 | SSE 事件 |
|------|---------|---------|---------|
| AI 服务不可用 | API Key 未配置 | catch 块 | `{"type":"error","message":"AI 模型未配置 API Key"}` |
| AI 服务超时 | 120s 无响应 | AbortController | `{"type":"error","message":"AI 服务暂时不可用"}` |
| headers 未发送时出错 | 请求参数错误 | res.status(500) | JSON: `{success:false, message:"对话处理失败"}` |
| headers 已发送时出错 | 流式中途异常 | res.write | `{"type":"error","message":"服务器内部错误"}` |

---

### I-SSE03: Agent ReAct 循环（含工具调用）

**场景**：用户通过 Agent 发送需要工具调用的消息，验证 ReAct 循环完整流程

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 打开悬浮 AI 助手 | 展示 | AiAssistantFloat 组件渲染 |
| 2 | 输入"查询含有黄芪的配方" | 操作 | 发送消息 |
| 3 | HTTP 请求发出 | 请求 | `POST /api/agent/chat`，body: `{message:"查询含有黄芪的配方", model:"deepseek", stream:true}` |
| 4 | 后端创建/获取会话 | 后端 | sessionStore.createSession 或 getSession |
| 5 | 添加用户消息 | 后端 | sessionStore.addMessage(sessionId, "user", message) |
| 6 | 设置 SSE | 响应 | Content-Type: text/event-stream, 心跳8s, 超时300s |
| 7 | ReAct 迭代 1 开始 | 后端 | callLLMWithTools → llmAgentService.streamChat |
| 8 | LLM 返回 tool_calls | 后端 | 返回 `query_formulas` 工具调用 |
| 9 | 前端收到 chunk | 展示 | SSE: `{"type":"chunk","content":"让我帮你..."}` |
| 10 | 前端收到 content_clear | 展示 | SSE: `{"type":"content_clear"}` → 清空中间文本 |
| 11 | 前端收到 tool_calls | 展示 | SSE: `{"type":"tool_calls","calls":[{"name":"query_formulas","arguments":"{...}"}]}` |
| 12 | 工具执行 | 后端 | toolRegistry.execute("query_formulas", params, context) |
| 13 | 前端收到 tool_result | 展示 | SSE: `{"type":"tool_result","name":"query_formulas","toolName":"query_formulas","success":true,"data":{...},"displayType":"table"}` |
| 14 | ReAct 迭代 2 开始 | 后端 | 将工具结果加入 messages，再次调用 LLM |
| 15 | LLM 返回纯文本（无 tool_calls） | 后端 | break 退出循环 |
| 16 | 前端收到最终 chunk | 展示 | SSE: `{"type":"chunk","content":"根据查询结果..."}` |
| 17 | 前端收到 done | 响应 | SSE: `{"type":"done","sessionId":"xxx","usage":{...},"model":"deepseek","latency":2345}` |
| 18 | 会话保存 | 后端 | sessionStore.addMessage(sessionId, "assistant", finalContent, metadata) |
| 19 | 连接关闭 | 响应 | cleanupSSE + res.end() |

**7层闭环验证**：
| 层 | 验证点 |
|----|--------|
| 操作 | 输入需要工具调用的消息 |
| 请求 | POST /api/agent/chat，含message+model |
| DB | 工具内部可能查询数据库（如query_formulas查formulas表） |
| Store | 前端AiAssistantFloat状态更新（消息列表+工具结果） |
| 响应 | SSE流：chunk→content_clear→tool_calls→tool_result→chunk→done |
| 展示 | 工具调用过程可视化+最终回复渲染 |
| 存储 | sessionStore保存会话消息（内存） |

**多轮工具调用边界**：
| 场景 | 预期行为 |
|------|---------|
| 工具调用次数达到 MAX_REACT_ITERATIONS(5) | 退出循环，发送已有内容 |
| 工具执行失败 | toolResult.success=false，继续下一轮迭代 |
| 工具参数解析失败 | params={}，工具自行处理缺失参数 |
| 客户端中途断开 | abortController.signal.aborted=true，停止迭代 |

---

### I-SSE04: 悬浮球对话+意图分类

**场景**：用户通过悬浮球发送消息，验证意图分类和页面上下文注入

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 在配方列表页打开悬浮球 | 操作 | AiAssistantFloat 打开 |
| 2 | 输入"帮我填一下配方名称" | 操作 | 发送 float-chat 请求 |
| 3 | HTTP 请求发出 | 请求 | `POST /api/agent/float-chat`，body: `{pageId:"formula-list", utterance:"帮我填一下配方名称", context:[...]}` |
| 4 | 写操作守卫检查 | 后端 | checkWriteIntentFromText → 检测到写意图 |
| 5 | 意图分类 | 后端 | classifyFloatIntent("帮我填一下配方名称") → "fill" |
| 6 | 路由到 parseForm | 后端 | 调用 aiAgentController.parseForm |
| 7 | 返回解析结果 | 响应 | SSE 或 JSON 返回填充字段 |

**意图分类分支**：
| 输入示例 | 意图 | 路由目标 | 响应类型 |
|---------|------|---------|---------|
| "帮我填一下配方名称" | fill | parseForm | JSON/SSE |
| "生成一段配方描述" | generate | handleGenerateIntent | SSE |
| "查询含有黄芪的配方" | chat | handleFloatReActStream | SSE |

**写操作守卫分支**：
| 场景 | pageId | 守卫结果 | 行为 |
|------|--------|---------|------|
| 在表单页说"帮我填写" | formula-add | blocked=false | 正常执行 parseForm |
| 在列表页说"帮我填写" | formula-list | blocked=true | 返回 write_guidance + 导航链接 |
| 查询类消息 | 任意 | blocked=false | 正常路由到 chat |

**页面上下文注入**：
| pageId | 注入上下文 |
|--------|----------|
| formula-add / formula-edit | 配方表单字段映射 |
| material-add / material-edit | 原料表单字段映射 |
| salesman-add / salesman-edit | 业务员表单字段映射 |
| 其他页面 | 无特殊字段映射，走通用 ReAct |

---

### I-FAILOVER01: AI 供应商故障转移

**场景**：主模型调用失败，自动切换到备用模型

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 配置 deepseek 的备用模型为 dashscope | 操作 | PUT /api/ai/models-manage/:id {fallbackProvider:"dashscope"} |
| 2 | 写入 ai_fallback_configs | DB | INSERT fallback_provider="dashscope", priority=1, enabled=1 |
| 3 | 发起 AI 对话，指定 model=deepseek | 操作 | POST /api/ai/chat {message:"...", model:"deepseek"} |
| 4 | deepseek API 调用失败 | 后端 | AIService._doChatCompletion 抛出异常 |
| 5 | 查询备用模型 | 后端 | getFallbackProvider("deepseek") → "dashscope" |
| 6 | 切换到 dashscope | 后端 | _doChatCompletion(dashscopeConfig, messages, options) |
| 7 | dashscope 调用成功 | 后端 | 返回结果，fallbackFrom="deepseek" |
| 8 | 记录用量 | DB | ai_usage_logs: status="fallback", fallbackFrom="deepseek" |
| 9 | 返回结果 | 响应 | result.fallbackFrom="deepseek" |

**故障转移边界**：
| 分支 | 条件 | 预期行为 |
|------|------|---------|
| 备用模型也失败 | dashscope 也抛异常 | 抛出原始错误（primaryError） |
| 无备用配置 | ai_fallback_configs 无记录 | 直接抛出原始错误 |
| 备用模型与主模型相同 | fallbackProvider=deepseek | 跳过，直接抛出原始错误 |
| 备用模型无 API Key | dashscope.apiKey 为空 | 跳过，直接抛出原始错误 |

---

### I-FAILOVER02: 熔断器机制验证

**场景**：LLMAgentService 的熔断器在连续失败后开启，阻止请求到已熔断的供应商

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 初始状态 | 后端 | providerHealth: 所有供应商 consecutiveFailures=0, circuitOpen=false |
| 2 | deepseek 第 1 次失败 | 后端 | recordFailure → consecutiveFailures=1 |
| 3 | deepseek 第 2 次失败 | 后端 | recordFailure → consecutiveFailures=2 |
| 4 | deepseek 第 3 次失败 | 后端 | recordFailure → consecutiveFailures=3 → circuitOpen=true, circuitOpenUntil=now+300000 |
| 5 | 下次请求 | 后端 | getHealthyProviders() → 跳过 deepseek（circuitOpen=true 且未到恢复时间） |
| 6 | 降级到 dashscope | 后端 | 使用降级链下一个健康供应商 |
| 7 | 300 秒后 | 后端 | circuitOpenUntil 已过 → circuitOpen 自动恢复为 false |
| 8 | deepseek 成功调用 | 后端 | recordSuccess → consecutiveFailures=0, circuitOpen=false |

**降级链遍历**：
| 降级顺序 | 供应商 | 条件 |
|---------|--------|------|
| 1 | 用户首选 provider | circuitOpen=false 且有 apiKey |
| 2 | deepseek | 同上 |
| 3 | dashscope | 同上 |
| 4 | zhipu | 同上 |
| 全部不可用 | - | 抛出 "所有LLM服务暂不可用，请稍后重试" |

**429 重试机制**：
| 场景 | 行为 |
|------|------|
| 第 1 次 429 | 重试 attempt=1 |
| 第 2 次 429 | 重试 attempt=2 |
| 第 3 次 429 | 超过 MAX_RETRIES=2，break 到下一个 provider |
| 超时错误 | 同 429，重试最多 2 次 |

---

### I-NL2SQL01: 自然语言查询全链路

**场景**：用户在 DataSearchTab 输入自然语言，AI 生成 SQL 并执行返回结果

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 打开智能工具→数据查询 Tab | 展示 | DataSearchTab 渲染，搜索框+8个快速示例标签 |
| 2 | 点击快速示例"查找含有黄芪的配方" | 操作 | searchQuery 填充，自动触发搜索 |
| 3 | aiStore.naturalSearch() 调用 | Store | searchLoading=true, searchResult=null |
| 4 | HTTP 请求发出 | 请求 | `POST /api/ai/natural-search`，body: `{query:"查找含有黄芪的配方", model:"deepseek", version:"deepseek-chat"}` |
| 5 | 后端构建 NL2SQL 消息 | 后端 | `[{role:"system", content:NL2SQL_SYSTEM_PROMPT}, {role:"user", content:NL2SQL_USER_PROMPT(query)}]` |
| 6 | 调用 AIService.chatCompletion | 后端 | temperature=0.1, callType="natural_search" |
| 7 | AI 返回 SQL | 后端 | content 包含 SQL（可能被 ```sql``` 包裹） |
| 8 | 提取 SQL | 后端 | 正则匹配提取纯 SQL |
| 9 | SQL 安全校验 | 后端 | validateSQL(sql) → 白名单校验（仅允许 SELECT） |
| 10 | 数据隔离处理（formulist） | 后端 | injectCreatedByFilter(sql, userId) → 添加 WHERE created_by=? |
| 11 | 执行 SQL | DB | query(finalSQL, params) → 返回 rows |
| 12 | 检测查询类型 | 后端 | detectQueryType → "select"/"aggregate" 等 |
| 13 | 返回结果 | 响应 | `{success:true, data:{sql, originalSQL, rows, rowCount, model, usage, queryType}}` |
| 14 | axios 解包 | Store | searchResult = {sql, rows, rowCount, model, ...} |
| 15 | SQL 展示区渲染 | 展示 | 可折叠的 SQL 代码块，显示 queryType 标签 |
| 16 | 结果表格渲染 | 展示 | 动态列名+数据行，显示"共找到 N 条结果" |
| 17 | 搜索历史更新 | 存储 | searchHistory 数组头部插入查询文本，最多保留 10 条 |

**7层闭环验证**：
| 层 | 验证点 |
|----|--------|
| 操作 | 点击快速示例/输入自然语言→点击查询 |
| 请求 | POST /api/ai/natural-search，含query+model |
| DB | validateSQL通过→query()执行SQL→返回rows |
| Store | aiStore.searchResult有值，searchLoading=false |
| 响应 | {success:true, data:{sql,rows,rowCount,...}} |
| 展示 | SQL展示+结果表格+统计信息 |
| 存储 | searchHistory本地保存（Pinia内存） |

**异常分支**：
| 分支 | 触发条件 | 后端响应 | 前端表现 |
|------|---------|---------|---------|
| SQL 不安全 | validateSQL 失败 | 422 `{message:"生成的 SQL 不安全: ..."}` | searchError显示，提示"SQL不安全" |
| SQL 执行失败 | SQLITE_ERROR | 422 `{message:"SQL 执行失败...", code:"SQL_EXECUTION_ERROR"}` | searchError显示，isSqlError=true，提示换说法 |
| AI 服务不可用 | API Key 未配置 | 500/503 | searchError显示，isAiError=true，提示切换模型 |
| 查询内容为空 | query 为空 | 400 `{message:"请输入查询内容"}` | 前端校验拦截（按钮disabled） |
| 未选择模型 | model 为空 | 400 `{message:"请选择 AI 模型"}` | 前端校验拦截 |

**数据隔离验证**：
| 角色 | SQL 注入行为 | 预期 |
|------|------------|------|
| admin | 无注入，直接执行 | 返回全部数据 |
| formulist | injectCreatedByFilter 添加 WHERE | 仅返回自己创建的数据 |

---

### I-ASYNC01: 文件解析超长操作（AbortController 取消）

**场景**：用户上传文件进行 AI 解析，解析时间过长时主动取消

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 打开智能工具→智能导入 Tab | 展示 | FormulaParseTab 渲染，文件拖拽上传区可见 |
| 2 | 选择模型为 dashscope | 操作 | aiStore.selectedModel="dashscope" |
| 3 | 拖拽上传配方图片 | 操作 | 触发 aiStore.parseFormula(file) |
| 4 | 创建 AbortController | Store | parseAbortController = new AbortController() |
| 5 | parseLoading=true | 展示 | 上传进度/loading 状态显示 |
| 6 | HTTP 请求发出 | 请求 | `POST /api/ai/parse-formula`，Content-Type: multipart/form-data，signal: AbortController.signal，timeout: 120000 |
| 7 | FormData 构建 | 请求 | formData.append("file", file) + formData.append("model", "dashscope") + formData.append("version", ...) |
| 8 | 后端 multer 处理 | 后端 | multer.single("file") 解析上传文件 |
| 9 | 解析进行中（耗时较长） | - | - |
| 10 | 用户点击"取消"按钮 | 操作 | 触发 aiStore.abortParseFormula() |
| 11 | AbortController.abort() | Store | parseAbortController.abort()，++parseRequestId |
| 12 | axios 取消请求 | 请求 | 浏览器发送 RST，HTTP 请求中止 |
| 13 | 前端捕获 AbortError | Store | error.name==="AbortError" → return（不设置 parseError） |
| 14 | 状态更新 | Store | parseAborted=true, parseError="解析已终止", parseLoading=false |
| 15 | 2 秒后自动清除 | Store | parseAborted=false, parseError="" |

**7层闭环验证**：
| 层 | 验证点 |
|----|--------|
| 操作 | 上传文件→点击取消 |
| 请求 | POST /api/ai/parse-formula (multipart/form-data)，signal触发取消 |
| DB | 无（请求已取消） |
| Store | parseAborted=true, parseResult=null |
| 响应 | 无（请求被中止） |
| 展示 | "解析已终止"提示，2秒后自动消失 |
| 存储 | 无 |

**原料营养解析取消**：
| 步骤 | 差异 |
|------|------|
| 调用 | aiStore.parseMaterial(file) → POST /api/ai/parse-material-nutrition |
| 取消 | aiStore.abortParseMaterial() → materialAbortController.abort() |
| 状态 | materialParseAborted=true, materialParseError="解析已终止" |

---

### I-ERR01: AI 服务不可用错误传播

**场景**：各种 AI 服务不可用场景的错误消息从前端到后端的完整传播

| 用例ID | 场景 | 后端处理 | 后端响应 | 前端拦截器 | Store/组件表现 |
|--------|------|---------|---------|-----------|---------------|
| ERR-01 | API Key 未配置 | modelConfig.apiKey 为空 | 500 `{message:"AI 模型未配置 API Key"}` | MessagePlugin.error | parseError/searchError 显示 |
| ERR-02 | 模型不存在 | getModel(provider) 返回 null | 500 `{message:"未知的 AI 模型: xxx"}` | 同上 | 同上 |
| ERR-03 | AI 供应商超时 | 120s 无响应 | SSE: `{type:"error",message:"..."}` | SSE onerror | 对话区显示错误 |
| ERR-04 | 所有供应商不可用 | 降级链全部失败 | 500 `{message:"所有LLM服务暂不可用"}` | MessagePlugin.error | 悬浮球显示错误 |
| ERR-05 | NL2SQL 生成不安全 SQL | validateSQL 失败 | 422 `{message:"生成的 SQL 不安全"}` | 不弹提示（非5xx） | DataSearchTab 显示 isSqlError |
| ERR-06 | SQL 执行失败 | SQLITE_ERROR | 422 `{message:"SQL 执行失败...",code:"SQL_EXECUTION_ERROR"}` | 同上 | DataSearchTab 显示错误+建议 |
| ERR-07 | 文件上传格式错误 | multer 拒绝 | 400 | MessagePlugin.error | parseError 显示 |
| ERR-08 | 消息为空 | message 为空/非字符串 | 400 `{success:false,error:"消息不能为空且必须是字符串"}` | MessagePlugin.error | 对话区提示 |

**SSE 错误 vs JSON 错误**：
| 错误类型 | 响应格式 | 前端处理 |
|---------|---------|---------|
| SSE 流中错误 | `data: {"type":"error","message":"..."}\n\n` | fetchEventSource onmessage 处理 |
| headers 未发送时错误 | `res.status(500).json({success:false,...})` | axios 拦截器处理 |
| headers 已发送时错误 | `data: {"type":"error","message":"..."}\n\n` | 同 SSE 流中错误 |

---

### I-CROSS01: AI 解析结果→配方创建联动

**场景**：用户通过 AI 解析配方文件后，将解析结果应用到配方创建表单

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 上传配方图片并解析成功 | 操作 | aiStore.parseResult 有值（ParsedFormula） |
| 2 | 解析结果展示 | 展示 | FormulaParseTab 显示解析出的配方名、原料列表、置信度 |
| 3 | 点击"应用到表单"按钮 | 操作 | 触发结果应用逻辑 |
| 4 | 解析结果映射到表单字段 | Store | 配方名称→formulaStore.name, 原料列表→formulaStore.materials |
| 5 | 跳转到配方创建页 | 导航 | router.push("/formulas/add") |
| 6 | 表单预填充 | 展示 | 配方名称、原料列表等字段已填充 |
| 7 | 用户修改后提交 | 操作 | 正常配方创建流程 |
| 8 | 配方创建成功 | 请求 | POST /api/formulas → 201 |

**解析结果字段映射**：
| ParsedFormula 字段 | 配方表单字段 |
|-------------------|------------|
| name | 配方名称 |
| salesmanName | 业务员名称（需匹配） |
| formulaDate | 配方日期 |
| materials[] | 原料列表 |
| materials[].name | 原料名称 |
| materials[].quantity | 用量 |
| materials[].unit | 单位 |
| finishedWeight | 成品重量 |
| confidence | 置信度（展示用） |

**原料营养解析联动**：
| ParsedMaterialNutrition 字段 | 原料表单字段 |
|------------------------------|------------|
| materials[].name | 原料名称 |
| materials[].protein | 蛋白质 |
| materials[].fat | 脂肪 |
| materials[].carbohydrate | 碳水化合物 |
| materials[].sodium | 钠 |

---

## 3. 契约验证用例

### C-EP: 端点匹配

| 用例ID | 前端调用路径 | 后端实际端点 | 匹配 |
|--------|------------|------------|------|
| C-EP-01 | `/ai/models` | `GET /api/ai/models` | ✅ |
| C-EP-02 | `/ai/parse-formula` | `POST /api/ai/parse-formula` | ✅ |
| C-EP-03 | `/ai/parse-material-nutrition` | `POST /api/ai/parse-material-nutrition` | ✅ |
| C-EP-04 | `/ai/natural-search` | `POST /api/ai/natural-search` | ✅ |
| C-EP-05 | `/ai/chat` | `POST /api/ai/chat` | ✅ |
| C-EP-06 | `/ai/models-manage` | `GET /api/ai/models-manage` | ✅ |
| C-EP-07 | `/ai/models-manage` | `POST /api/ai/models-manage` | ✅ |
| C-EP-08 | `/ai/models-manage/:id` | `PUT /api/ai/models-manage/:id` | ✅ |
| C-EP-09 | `/ai/models-manage/:id` | `DELETE /api/ai/models-manage/:id` | ✅ |
| C-EP-10 | `/ai/models-manage/:id/test` | `POST /api/ai/models-manage/:id/test` | ✅ |
| C-EP-11 | `/ai/models-manage/:id/versions` | `GET /api/ai/models-manage/:id/versions` | ✅ |
| C-EP-12 | `/ai/models/:provider/versions` | `GET /api/ai/models/:provider/versions` | ✅ |
| C-EP-13 | `/ai/models/:provider/version` | `PUT /api/ai/models/:provider/version` | ✅ |
| C-EP-14 | `/ai/models-manage/:id/fallback` | `PUT /api/ai/models-manage/:id/fallback` | ✅ |
| C-EP-15 | `/ai/usage` | `GET /api/ai/usage` | ✅ |
| C-EP-16 | `/ai/usage/logs` | `GET /api/ai/usage/logs` | ✅ |
| C-EP-17 | `/ai/alerts/configs` | `GET /api/ai/alerts/configs` | ✅ |
| C-EP-18 | `/ai/alerts/configs/:id` | `PUT /api/ai/alerts/configs/:id` | ✅ |
| C-EP-19 | `/ai/alerts/records` | `GET /api/ai/alerts/records` | ✅ |
| C-EP-20 | `/ai/health` | `GET /api/ai/health` | ✅ |
| C-EP-21 | `/ai/health/:provider/history` | `GET /api/ai/health/:provider/history` | ✅ |
| C-EP-22 | `/ai/recent-activity` | `GET /api/ai/recent-activity` | ✅ |
| C-EP-23 | `/ai/smart-tool-history` | `GET /api/ai/smart-tool-history` | ✅ |
| C-EP-24 | `/ai/smart-tool-history/:id` | `DELETE /api/ai/smart-tool-history/:id` | ✅ |
| C-EP-25 | `/ai/model-applications` | `GET /api/ai/model-applications` | ✅ |
| C-EP-26 | `/ai/model-applications` | `POST /api/ai/model-applications` | ✅ |
| C-EP-27 | `/ai/model-applications/:id` | `PUT /api/ai/model-applications/:id` | ✅ |
| C-EP-28 | `/ai/model-applications/:id` | `PATCH /api/ai/model-applications/:id` | ✅ |
| C-EP-29 | `/ai/model-applications/:id` | `DELETE /api/ai/model-applications/:id` | ✅ |
| C-EP-30 | `/ai/prompt-templates` | `GET /api/ai/prompt-templates` | ✅ |
| C-EP-31 | `/ai/prompt-templates` | `POST /api/ai/prompt-templates` | ✅ |
| C-EP-32 | `/ai/prompt-templates/:id` | `PUT /api/ai/prompt-templates/:id` | ✅ |
| C-EP-33 | `/ai/prompt-templates/:id` | `DELETE /api/ai/prompt-templates/:id` | ✅ |
| C-EP-34 | `/agent/chat` | `POST /api/agent/chat` | ✅ |
| C-EP-35 | `/agent/float-chat` | `POST /api/agent/float-chat` | ✅ |
| C-EP-36 | `/agent/sessions` | `GET /api/agent/sessions` | ✅ |
| C-EP-37 | `/agent/sessions/:sessionId` | `GET /api/agent/sessions/:sessionId` | ✅ |
| C-EP-38 | `/agent/sessions/:sessionId` | `DELETE /api/agent/sessions/:sessionId` | ✅ |
| C-EP-39 | `/agent/role-config` | `GET /api/agent/role-config` | ✅ |
| C-EP-40 | `/agent/role-config` | `PUT /api/agent/role-config` | ✅ |
| C-EP-41 | `/agent/float-config` | `GET /api/agent/float-config` | ✅ |
| C-EP-42 | `/agent/float-config` | `PUT /api/agent/float-config` | ✅ |
| C-EP-43 | `/agent/parse-form` | `POST /api/agent/parse-form` | ✅ |
| C-EP-44 | `/agent/generate-description` | `POST /api/agent/generate-description` | ✅ |
| C-EP-45 | `/agent/field-hints` | `GET /api/agent/field-hints` | ✅ |
| C-EP-46 | `/agent/health` | `GET /api/agent/health` | ✅ |

### C-METHOD: HTTP 方法

| 用例ID | 前端方法 | 后端路由方法 | 匹配 |
|--------|---------|------------|------|
| C-M-01 | `http.get('/ai/models')` | `router.get('/models')` | ✅ GET |
| C-M-02 | `http.post('/ai/parse-formula', formData)` | `router.post('/parse-formula', multer)` | ✅ POST |
| C-M-03 | `http.post('/ai/parse-material-nutrition', formData)` | `router.post('/parse-material-nutrition', multer)` | ✅ POST |
| C-M-04 | `http.post('/ai/natural-search', body)` | `router.post('/natural-search')` | ✅ POST |
| C-M-05 | fetchEventSource POST | `router.post('/chat')` | ✅ POST |
| C-M-06 | `http.get('/ai/models-manage')` | `router.get('/models-manage')` | ✅ GET |
| C-M-07 | `http.post('/ai/models-manage', data)` | `router.post('/models-manage')` | ✅ POST |
| C-M-08 | `http.put('/ai/models-manage/:id', data)` | `router.put('/models-manage/:id')` | ✅ PUT |
| C-M-09 | `http.delete('/ai/models-manage/:id')` | `router.delete('/models-manage/:id')` | ✅ DELETE |
| C-M-10 | `http.post('/ai/models-manage/:id/test')` | `router.post('/models-manage/:id/test')` | ✅ POST |
| C-M-11 | `http.get('/ai/models/:provider/versions')` | `router.get('/models/:provider/versions')` | ✅ GET |
| C-M-12 | `http.put('/ai/models/:provider/version', body)` | `router.put('/models/:provider/version')` | ✅ PUT |
| C-M-13 | `http.put('/ai/models-manage/:id/fallback', body)` | `router.put('/models-manage/:id/fallback')` | ✅ PUT |
| C-M-14 | `http.get('/ai/usage')` | `router.get('/usage')` | ✅ GET |
| C-M-15 | `http.get('/ai/usage/logs')` | `router.get('/usage/logs')` | ✅ GET |
| C-M-16 | `http.get('/ai/alerts/configs')` | `router.get('/alerts/configs')` | ✅ GET |
| C-M-17 | `http.put('/ai/alerts/configs/:id', data)` | `router.put('/alerts/configs/:id')` | ✅ PUT |
| C-M-18 | `http.get('/ai/alerts/records')` | `router.get('/alerts/records')` | ✅ GET |
| C-M-19 | `http.get('/ai/health')` | `router.get('/health')` | ✅ GET |
| C-M-20 | `http.get('/ai/health/:provider/history')` | `router.get('/health/:provider/history')` | ✅ GET |
| C-M-21 | `http.get('/ai/model-applications')` | `router.get('/model-applications')` | ✅ GET |
| C-M-22 | `http.post('/ai/model-applications', data)` | `router.post('/model-applications')` | ✅ POST |
| C-M-23 | `http.put('/ai/model-applications/:id', data)` | `router.put('/model-applications/:id')` | ✅ PUT |
| C-M-24 | `http.patch('/ai/model-applications/:id', data)` | `router.patch('/model-applications/:id')` | ✅ PATCH |
| C-M-25 | `http.delete('/ai/model-applications/:id')` | `router.delete('/model-applications/:id')` | ✅ DELETE |
| C-M-26 | `http.get('/ai/prompt-templates')` | `router.get('/prompt-templates')` | ✅ GET |
| C-M-27 | `http.post('/ai/prompt-templates', data)` | `router.post('/prompt-templates')` | ✅ POST |
| C-M-28 | `http.put('/ai/prompt-templates/:id', data)` | `router.put('/prompt-templates/:id')` | ✅ PUT |
| C-M-29 | `http.delete('/ai/prompt-templates/:id')` | `router.delete('/prompt-templates/:id')` | ✅ DELETE |

### C-REQ: 请求体

| 用例ID | 接口 | 前端发送 | 后端接收 | Content-Type | 一致性 |
|--------|------|---------|---------|-------------|--------|
| C-R-01 | POST /ai/parse-formula | FormData: file + model + version | multer.single("file") + req.body.model + req.body.version | multipart/form-data | ✅ |
| C-R-02 | POST /ai/parse-material-nutrition | FormData: file + model + version | multer.single("file") + req.body.model + req.body.version | multipart/form-data | ✅ |
| C-R-03 | POST /ai/natural-search | `{query, model, version}` | req.body.query + req.body.model + req.body.version | application/json | ✅ |
| C-R-04 | POST /ai/chat | `{message, conversationId, model, modelVersion}` | req.body.message + req.body.model(provider) + req.body.modelVersion | application/json | ✅ 前端model映射后端provider |
| C-R-05 | POST /agent/chat | `{message, sessionId, stream, model, modelVersion}` | req.body.message + req.body.sessionId + req.body.stream + req.body.model + req.body.modelVersion | application/json | ✅ |
| C-R-06 | POST /agent/float-chat | `{pageId, utterance, context, sessionId}` | req.body.pageId + req.body.utterance + req.body.context + req.body.sessionId | application/json | ✅ |
| C-R-07 | PUT /ai/models/:provider/version | `{model}` | req.body.model | application/json | ✅ |
| C-R-08 | PUT /ai/models-manage/:id/fallback | `{fallbackProvider}` | req.body.fallbackProvider | application/json | ✅ |
| C-R-09 | POST /ai/models-manage | `{provider, name, baseUrl, apiKey, model, ...}` | req.body 各字段 | application/json | ✅ |

**⚠️ 注意**：POST /ai/chat 前端字段名 `model` 映射到后端变量名 `provider`（`const {message, conversationId, model: provider, modelVersion} = req.body`），存在语义不一致但功能正确。

### C-RES: 响应体

#### JSON 响应

| 用例ID | 接口 | 成功响应格式 | 前端类型声明 | 一致性 |
|--------|------|------------|------------|--------|
| C-RS-01 | GET /ai/models | `{success:true, data:{available:AIModel[], all:AIModel[]}}` | `AIModelList` | ✅ |
| C-RS-02 | POST /ai/parse-formula | `{success:true, data:ParsedFormula}` | `ParsedFormula` | ✅ |
| C-RS-03 | POST /ai/parse-material-nutrition | `{success:true, data:ParsedMaterialNutrition}` | `ParsedMaterialNutrition` | ✅ |
| C-RS-04 | POST /ai/natural-search | `{success:true, data:{sql,originalSQL,rows,rowCount,model,usage,queryType,exportUrl}}` | `SearchResult` | ✅ |
| C-RS-05 | GET /ai/models-manage | `{success:true, data:{models:ModelItem[], stats:ModelStats}}` | `ModelListResponse` | ✅ |
| C-RS-06 | GET /ai/usage | `{success:true, data:{summary,trend,distribution}}` | `{summary,trend,distribution}` | ✅ |
| C-RS-07 | GET /ai/health | `{success:true, data:{models:[...]}}` | `{models:[...]}` | ✅ |
| C-RS-08 | GET /agent/sessions | `{success:true, data:sessions[]}` | - | ✅ |
| C-RS-09 | GET /agent/role-config | `{success:true, data:roleConfig}` | - | ✅ |
| C-RS-10 | POST /agent/parse-form | JSON 或 SSE | - | ✅ |

#### SSE 响应

| 用例ID | 接口 | SSE 事件类型 | 数据格式 | 前端处理 |
|--------|------|------------|---------|---------|
| C-RS-11 | POST /ai/chat | `token` | `{type:"token", content:string}` | 追加渲染 |
| C-RS-12 | POST /ai/chat | `complete` | `{type:"complete", content:string, model:string, tokens:number, latency:number}` | 显示统计 |
| C-RS-13 | POST /ai/chat | `error` | `{type:"error", message:string}` | 错误提示 |
| C-RS-14 | POST /ai/chat | `[DONE]` | 结束标记 | 关闭连接 |
| C-RS-15 | POST /agent/chat | `chunk` | `{type:"chunk", content:string}` | 追加渲染 |
| C-RS-16 | POST /agent/chat | `tool_calls` | `{type:"tool_calls", calls:[{name,arguments}]}` | 工具调用展示 |
| C-RS-17 | POST /agent/chat | `tool_result` | `{type:"tool_result", name,toolName,success,data,displayType}` | 工具结果展示 |
| C-RS-18 | POST /agent/chat | `content_clear` | `{type:"content_clear"}` | 清空中间文本 |
| C-RS-19 | POST /agent/chat | `done` | `{type:"done", sessionId,usage,model,latency}` | 结束+统计 |
| C-RS-20 | POST /agent/chat | `error` | `{type:"error", message:string}` | 错误提示 |
| C-RS-21 | POST /agent/float-chat | `write_guidance` | `{type:"write_guidance", toolName,message,navigationLink}` | 导航提示 |
| C-RS-22 | Agent SSE 心跳 | `: heartbeat` | SSE注释行 | 保持连接 |

**SSE 格式规范**：
- 每个事件格式：`data: {JSON}\n\n`
- 心跳格式：`: heartbeat\n\n`（SSE 注释行）
- 结束标记：`data: [DONE]\n\n`（仅 AI 对话）
- Agent 对话无 `[DONE]` 标记，以 `done` 事件结束
- AI 对话和 Agent 对话的 SSE 事件类型不同（token vs chunk）

### C-CT: Content-Type

| 用例ID | 接口 | 请求 Content-Type | 响应 Content-Type | 一致性 |
|--------|------|-------------------|-------------------|--------|
| C-CT-01 | POST /ai/parse-formula | multipart/form-data | application/json | ✅ |
| C-CT-02 | POST /ai/parse-material-nutrition | multipart/form-data | application/json | ✅ |
| C-CT-03 | POST /ai/natural-search | application/json | application/json | ✅ |
| C-CT-04 | POST /ai/chat | application/json | text/event-stream | ✅ SSE |
| C-CT-05 | POST /agent/chat | application/json | text/event-stream | ✅ SSE |
| C-CT-06 | POST /agent/float-chat | application/json | text/event-stream 或 application/json | ✅ 依意图而定 |
| C-CT-07 | GET /ai/models | 无 | application/json | ✅ |
| C-CT-08 | GET /ai/health | 无 | application/json | ✅ |

### C-NAME: 字段命名

| 用例ID | 场景 | DB字段 | 后端返回（rowToCamelCase后） | 前端接口 | 一致性 |
|--------|------|--------|---------------------------|---------|--------|
| C-N-01 | 模型ID | `id` | `id` | `id` | ✅ |
| C-N-02 | 供应商 | `provider` | `provider` | `provider` | ✅ |
| C-N-03 | 模型名 | `model` | `model` | `model` | ✅ |
| C-N-04 | 视觉模型 | `vision_model` | `visionModel` | `visionModel` | ✅ |
| C-N-05 | 支持视觉 | `supports_vision` | `supportsVision` | `supportsVision` | ✅ |
| C-N-06 | 健康状态 | `health_status` | `healthStatus` | `healthStatus` | ✅ |
| C-N-07 | API Key已配置 | - | `apiKeyConfigured` | `apiKeyConfigured` | ✅ |
| C-N-08 | 备用供应商 | `fallback_provider` | `fallbackProvider` | `fallbackProvider` | ✅ |
| C-N-09 | 今日调用 | - | `todayCalls` | `todayCalls` | ✅ |
| C-N-10 | 今日Token | - | `todayTokens` | `todayTokens` | ✅ |
| C-N-11 | 创建时间 | `created_at` | `createdAt` | `createdAt` | ✅ |
| C-N-12 | 更新时间 | `updated_at` | `updatedAt` | `updatedAt` | ✅ |
| C-N-13 | 用量日志-延迟 | `latency_ms` | `latencyMs` | `latencyMs` | ✅ |
| C-N-14 | 用量日志-错误消息 | `error_message` | `errorMessage` | `errorMessage` | ✅ |
| C-N-15 | 用量日志-回退来源 | `fallback_from` | `fallbackFrom` | `fallbackFrom` | ✅ |
| C-N-16 | 告警配置-日调用限制 | `daily_call_limit` | `dailyCallLimit` | `dailyCallLimit` | ✅ |
| C-N-17 | 告警配置-月Token限制 | `monthly_token_limit` | `monthlyTokenLimit` | `monthlyTokenLimit` | ✅ |
| C-N-18 | 模型应用-模块名 | `module_name` | `moduleName` | `moduleName` | ✅ |

**⚠️ 注意**：model.ts 中多处使用 `toCamelCase()` 手动转换后端返回的 snake_case 字段，这是因为部分后端接口未使用 `rowToCamelCase()` 工具函数，前端自行做了兼容。

---

## 4. 测试覆盖率统计

### 4.1 联调场景覆盖

| 模块 | 场景数 | 用例ID |
|------|--------|--------|
| SSE 流式 (SSE) | 4 | I-SSE01 ~ I-SSE04 |
| 故障转移 (FAILOVER) | 2 | I-FAILOVER01 ~ I-FAILOVER02 |
| 自然语言查询 (NL2SQL) | 1 | I-NL2SQL01 |
| 异步操作 (ASYNC) | 1 | I-ASYNC01 |
| 错误传播 (ERR) | 1 | I-ERR01 |
| 跨模块联动 (CROSS) | 1 | I-CROSS01 |
| **合计** | **10** | - |

### 4.2 契约验证覆盖

| 维度 | 用例数 | 发现不一致 |
|------|--------|-----------|
| C-EP 端点匹配 | 46 | 0 |
| C-METHOD HTTP方法 | 29 | 0 |
| C-REQ 请求体 | 9 | 1（model vs provider 语义不一致） |
| C-RES 响应体 | 22 | 0 |
| C-CT Content-Type | 8 | 0 |
| C-NAME 字段命名 | 18 | 0 |
| **合计** | **132** | **1** |

### 4.3 7层闭环覆盖率

| 场景 | 操作 | 请求 | DB | Store | 响应 | 展示 | 存储 |
|------|------|------|-----|-------|------|------|------|
| I-SSE01 AI对话 | ✅ | ✅ | ✅ | - | ✅ | ✅ | - |
| I-SSE02 流式断开 | ✅ | ✅ | - | - | ✅ | ✅ | - |
| I-SSE03 Agent ReAct | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| I-SSE04 悬浮球意图 | ✅ | ✅ | - | ✅ | ✅ | ✅ | - |
| I-FAILOVER01 故障转移 | ✅ | ✅ | ✅ | - | ✅ | - | - |
| I-FAILOVER02 熔断器 | - | - | - | - | ✅ | - | - |
| I-NL2SQL01 自然查询 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| I-ASYNC01 文件解析取消 | ✅ | ✅ | - | ✅ | - | ✅ | - |
| I-ERR01 错误传播 | - | ✅ | - | ✅ | ✅ | ✅ | - |
| I-CROSS01 解析→创建 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| **覆盖率** | **8/10** | **9/10** | **5/10** | **6/10** | **9/10** | **9/10** | **2/10** |

### 4.4 关键风险项

| 等级 | 风险描述 | 涉及场景 | 建议 |
|------|---------|---------|------|
| 🔴 高 | POST /ai/chat 前端字段 `model` 映射后端变量 `provider`，语义不一致 | I-SSE01, C-REQ | 建议统一命名，避免后续维护混淆 |
| 🔴 高 | SSE 流中错误无统一错误码，仅靠 message 区分 | I-SSE02, I-ERR01 | 建议 SSE error 事件增加 code 字段 |
| 🟡 中 | Agent 会话存储在内存（sessionStore），服务重启后丢失 | I-SSE03 | 考虑持久化到数据库或 Redis |
| 🟡 中 | model.ts 多处手动 toCamelCase()，后端部分接口未用 rowToCamelCase | C-NAME | 统一后端返回格式，减少前端转换 |
| 🟡 中 | NL2SQL 对 formulist 的 injectCreatedByFilter 可能被复杂 SQL 绕过 | I-NL2SQL01 | 加强 SQL 解析和注入防护 |
| 🟢 低 | AI 对话历史未持久化到前端，刷新页面丢失 | I-SSE01 | 可考虑 localStorage 缓存 |
| 🟢 低 | Agent SSE 心跳 8s 间隔较长，弱网环境可能误判断连 | I-SSE03 | 可根据网络状况动态调整 |