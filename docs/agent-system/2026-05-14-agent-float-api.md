# 接口文档 — 悬浮球Agent增强（多轮对话+意图路由+工具调用）

> 版本: 1.0.0 | 日期: 2026-05-14 | 范围: 悬浮球AI助手FloatAgent

---

## 1. 接口变更总览

| 接口 | 变更类型 | 说明 |
|------|----------|------|
| POST /api/agent/float-chat | **新增** | 悬浮球Agent流式对话（SSE） |
| POST /api/agent/generate-description | **新增** | 智能生成配方描述/制法 |
| GET /api/agent/field-hints | **新增** | 获取页面漏字段提示 |
| GET /api/agent/health | **新增** | 模型健康状态检查 |
| POST /api/agent/parse-form | 保留 | 表单字段解析（原有，不改） |
| GET/PUT /api/agent/float-config | 保留 | 悬浮球配置（原有，不改） |
| POST /api/agent/chat | 不变 | AIDashboard Agent对话（不改） |

---

## 2. POST /api/agent/float-chat（新增）

悬浮球Agent流式对话接口。根据意图路由结果，非fill意图走ReAct+工具调用SSE流程。

### 2.1 请求

```
POST /api/agent/float-chat
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "pageId": "formula-add",
  "utterance": "帮我对比佛手玫苓膏和健脾养胃膏",
  "context": [
    { "role": "user", "content": "previous message" },
    { "role": "assistant", "content": "previous reply" }
  ],
  "sessionId": "session_xxx"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageId | string | ✅ | 当前页面标识（formula-add/edit, material-add/edit, salesman-add/edit） |
| utterance | string | ✅ | 用户输入文本 |
| context | Array | ❌ | 最近N条历史消息（用于多轮对话） |
| sessionId | string | ❌ | 会话ID，空则自动创建新会话 |

### 2.2 SSE响应事件

响应为SSE流式，`Content-Type: text/event-stream`。

#### 2.2.1 chunk — LLM流式文本

```
data: {"type":"chunk","content":"好的"}

data: {"type":"chunk","content":"，我来查"}

data: {"type":"chunk","content":"询一下"}

data: {"type":"chunk","content":"这两个配方"}
```

#### 2.2.2 content_clear — 清空预回复

```
data: {"type":"content_clear"}
```

触发时机: LLM返回了tool_calls，需要清除LLM在调用工具前输出的预回复文本。

#### 2.2.3 tool_calls — 工具调用通知

```
data: {"type":"tool_calls","calls":[{"name":"compare_formulas","arguments":{"formula_a":"佛手玫苓膏","formula_b":"健脾养胃膏"}}]}
```

#### 2.2.4 tool_result — 工具执行结果

```
data: {"type":"tool_result","name":"compare_formulas","toolName":"compare_formulas","data":{...},"success":true,"displayType":"compare"}
```

**displayType含义**:

| 值 | 说明 | 对应前端组件 |
|----|------|------------|
| nl2sql | NL2SQL查询结果 | AgentResultRenderer（表格） |
| aggregate | 聚合分析结果 | AgentResultRenderer（图表） |
| compare | 配方对比 | CompareCard |
| quotation | 报价单 | QuotationCard |
| substitute | 替代建议 | SubstituteCard |
| nutrition | 营养成分 | 默认渲染 |
| cost | 成本计算 | 默认渲染 |
| default | 默认 | 纯文本 |

#### 2.2.5 write_guidance — 写入操作被拦截

```
data: {"type":"write_guidance","toolName":"create_formula","params":{...},"message":"📋 创建配方请前往配方管理页面操作。","navigationLink":"/formula/add"}
```

#### 2.2.6 done — 流式响应完成

```
data: {"type":"done","sessionId":"session_xxx","usage":{"prompt_tokens":500,"completion_tokens":200,"total_tokens":700},"model":"deepseek","latency":3500}
```

#### 2.2.7 error — 错误信息

```
data: {"type":"error","message":"模型响应超时，请稍后重试"}
```

### 2.3 SSE中止

- 客户端断开连接 → 自动终止
- 服务端8秒心跳保活
- 超时时间300秒

---

## 3. POST /api/agent/generate-description（新增）

智能生成配方描述或制法，不经过Agent ReAct流程。

### 3.1 请求

```
POST /api/agent/generate-description
Content-Type: application/json
Authorization: Bearer <token>
```

#### 新建模式

```json
{
  "formulaName": "佛手玫苓膏",
  "materials": [
    { "name": "佛手", "quantity": 50 },
    { "name": "茯苓", "quantity": 30 },
    { "name": "蜂蜜", "quantity": 20, "type": "supplement" }
  ],
  "finishedWeight": 200,
  "type": "description"
}
```

#### 升版模式

```json
{
  "formulaName": "佛手玫苓膏",
  "materials": [...],
  "finishedWeight": 200,
  "existingDescription": "原有描述内容...",
  "revisionReason": "调整佛手用量从50g增加到80g，增强疏肝理气功效",
  "type": "description"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| formulaName | string | ✅ | 配方名称 |
| materials | Array | ❌ | 原料列表[{name, quantity?, type?}] |
| finishedWeight | number | ❌ | 成品重量(克) |
| revisionReason | string | ❌ | 有值=升版模式，无值=新建模式 |
| existingDescription | string | ❌ | 升版时传递现有描述 |
| type | string | ❌ | "description"(默认) 或 "preparation" |

### 3.2 响应

```json
{
  "success": true,
  "data": {
    "content": "以佛手、茯苓为主要原料，辅以蜂蜜调和，具有疏肝理气、健脾祛湿的功效。佛手疏肝解郁，茯苓健脾渗湿，蜂蜜润肺和中，三者配伍共奏调理肝脾之功。",
    "type": "description"
  }
}
```

---

## 4. GET /api/agent/field-hints（新增）

获取当前页面的必填字段提示，用于悬浮球角标显示。

### 4.1 请求

```
GET /api/agent/field-hints?pageId=formula-add
Authorization: Bearer <token>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageId | string | ✅ | 页面标识 |

### 4.2 响应

```json
{
  "success": true,
  "data": {
    "missingFields": ["name", "finished_weight", "salesman_name"],
    "hints": [
      { "field": "name", "label": "配方名称", "hint": "请提供配方名称" },
      { "field": "finished_weight", "label": "成品重量(g)", "hint": "请提供成品重量(g)" },
      { "field": "salesman_name", "label": "业务员", "hint": "请提供业务员" }
    ],
    "count": 3
  }
}
```

### 4.3 各页面必填字段定义

| pageId | 必填字段 |
|--------|---------|
| formula-add | name, finished_weight, salesman_name |
| formula-edit | name, finished_weight, salesman_name |
| material-add | name, material_type, unit |
| material-edit | name, material_type, unit |
| salesman-add | name, phone |
| salesman-edit | name, phone |

---

## 5. GET /api/agent/health（新增）

模型健康状态检查。

### 5.1 请求

```
GET /api/agent/health
Authorization: Bearer <token>
```

### 5.2 响应

```json
{
  "success": true,
  "data": {
    "status": "online"
  }
}
```

**status取值**:

| 值 | 含义 | 对应状态灯颜色 |
|----|------|--------------|
| online | 模型服务正常 | 绿色 |
| loading | 降级（部分可用） | 黄色 |
| error | 模型不可用 | 红色 |

---

## 6. POST /api/agent/parse-form（保留，不改）

表单字段解析，仅用于fill意图。

### 6.1 请求

```
POST /api/agent/parse-form
Authorization: Bearer <token>
```

```json
{
  "pageId": "formula-add",
  "utterance": "名称叫佛手玫苓膏，成品重量200g",
  "context": [],
  "sessionId": null
}
```

### 6.2 响应

```json
{
  "code": 0,
  "data": {
    "fields": { "name": "佛手玫苓膏", "finished_weight": 200 },
    "missingFields": ["salesman_name"],
    "message": "已解析 2 个字段，缺少 salesman_name",
    "sessionId": "session_xxx"
  }
}
```

---

## 7. 已有接口（不变）

| 接口 | 参考文档 |
|------|---------|
| POST /api/agent/chat | 2026-05-13-agent-optimize-api.md |
| POST /api/agent/submit-form | 同上 |
| GET /api/agent/pending-form/:sessionId | 同上 |
| GET /api/agent/sessions | 同上 |
| GET /api/agent/sessions/:sessionId | 同上 |
| DELETE /api/agent/sessions/:sessionId | 同上 |
| GET /api/agent/role-config | 同上 |
| PUT /api/agent/role-config | 同上 |
| GET /api/agent/float-config | 同上 |
| PUT /api/agent/float-config | 同上 |
