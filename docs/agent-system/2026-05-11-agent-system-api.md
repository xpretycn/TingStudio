# 接口文档：TingStudio Agent 智能对话系统

## 1. Agent 对话接口

### 1.1 POST /api/agent/chat

Agent 智能对话（SSE 流式响应）

**请求**：

```json
{
  "message": "查看含有黄芪的配方",
  "sessionId": "session_1715400000000_abc123",
  "stream": true,
  "confirmed": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息 |
| sessionId | string | 否 | 会话ID，不传则新建 |
| stream | boolean | 否 | 是否流式响应，默认 true |
| confirmed | boolean | 否 | 是否确认执行（用于写操作确认流程） |

**响应（SSE 流式）**：

```
event: message
data: {"type":"intent","intent":"query_data","params":{"keyword":"黄芪","targetTable":"formulas"},"confidence":0.95}

event: message
data: {"type":"chunk","content":"正在"}

event: message
data: {"type":"chunk","content":"查询含有黄芪的配方..."}

event: message
data: {"type":"tool_calls","calls":[{"name":"query_formulas","arguments":"{\"keyword\":\"黄芪\"}"}]}

event: message
data: {"type":"tool_result","name":"query_formulas","success":true,"data":{"rows":[...],"rowCount":3},"displayType":"table"}

event: message
data: {"type":"chunk","content":"找到了3个含有黄芪的配方，结果如下："}

event: message
data: {"type":"done","sessionId":"session_1715400000000_abc123"}
```

**追问场景**：

```
event: message
data: {"type":"intent","intent":"create_data","params":{},"confidence":0.9,"missingParams":["name","salesman_name"]}

event: message
data: {"type":"follow_up","message":"请提供以下信息：配方名称、业务员","missingParams":["name","salesman_name"]}

event: message
data: {"type":"done","sessionId":"session_1715400000000_abc123"}
```

**确认场景**：

```
event: message
data: {"type":"intent","intent":"delete_data","params":{"id":"f_001","name":"测试配方"},"confidence":0.95}

event: message
data: {"type":"confirm","message":"确认删除配方「测试配方」(ID: f_001)？此操作不可撤销。","toolName":"delete_formula","params":{"id":"f_001"}}

event: message
data: {"type":"done","sessionId":"session_1715400000000_abc123"}
```

**用户确认后**：

```
POST /api/agent/chat
{ "message": "确认", "sessionId": "...", "confirmed": true }

event: message
data: {"type":"tool_result","name":"delete_formula","success":true,"data":{"deletedId":"f_001"},"displayType":"toast"}

event: message
data: {"type":"chunk","content":"已成功删除配方「测试配方」。"}

event: message
data: {"type":"done","sessionId":"session_1715400000000_abc123"}
```

**错误响应**：

```
event: message
data: {"type":"error","message":"AI 服务暂时不可用，请稍后重试"}
```

---

### 1.2 GET /api/agent/sessions

获取用户的所有会话列表

**请求**：无请求体，通过 Authorization Header 识别用户

**响应**：

```json
{
  "success": true,
  "data": [
    {
      "id": "session_1715400000000_abc123",
      "title": "查看含有黄芪的配方",
      "messageCount": 6,
      "createdAt": "2026-05-11T10:00:00.000Z",
      "lastActiveAt": "2026-05-11T10:05:00.000Z"
    }
  ]
}
```

---

### 1.3 GET /api/agent/sessions/:sessionId

获取指定会话的消息历史

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "session_1715400000000_abc123",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "查看含有黄芪的配方",
        "timestamp": "2026-05-11T10:00:00.000Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "找到了3个含有黄芪的配方...",
        "timestamp": "2026-05-11T10:00:05.000Z",
        "toolCalls": [
          { "name": "query_formulas", "arguments": "{\"keyword\":\"黄芪\"}", "result": {...} }
        ]
      }
    ]
  }
}
```

---

### 1.4 DELETE /api/agent/sessions/:sessionId

删除指定会话及其所有消息

**响应**：

```json
{
  "success": true,
  "message": "Session deleted"
}
```

---

## 2. 智能检索接口（已有，增强）

### 2.1 POST /api/ai/natural-search

自然语言转 SQL 查询（增强版）

**请求**：

```json
{
  "query": "按业务员统计配方数量",
  "model": "deepseek",
  "version": "deepseek-chat",
  "exportFormat": "csv"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 自然语言查询 |
| model | string | 是 | AI 模型 provider |
| version | string | 否 | 模型版本 |
| exportFormat | string | 否 | 导出格式：csv / null |

**响应（增强版）**：

```json
{
  "success": true,
  "data": {
    "sql": "SELECT s.name AS 业务员, COUNT(f.id) AS 配方数量 FROM formulas f JOIN salesmen s ON f.salesman_id = s.id GROUP BY s.name ORDER BY 配方数量 DESC LIMIT 50",
    "originalSQL": "```sql\nSELECT ...```",
    "rows": [
      { "业务员": "张三", "配方数量": 15 },
      { "业务员": "李四", "配方数量": 8 }
    ],
    "rowCount": 2,
    "model": "deepseek",
    "queryType": "aggregate",
    "exportUrl": "/api/ai/export/result_1715400000000.csv",
    "usage": { "promptTokens": 500, "completionTokens": 80, "totalTokens": 580 }
  }
}
```

新增字段说明：
| 字段 | 说明 |
|------|------|
| queryType | 查询类型：`simple` / `join` / `aggregate` |
| exportUrl | 导出文件 URL（仅当 exportFormat 不为空时返回） |

---

### 2.2 GET /api/ai/export/:filename

下载导出文件

**响应**：CSV 文件流

---

## 3. 错误码

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | MISSING_MESSAGE | message 字段缺失 |
| 400 | INVALID_SESSION | sessionId 无效 |
| 401 | UNAUTHORIZED | 未认证 |
| 403 | FORBIDDEN | 无权限执行此操作 |
| 422 | UNSAFE_SQL | 生成的 SQL 不安全 |
| 422 | INTENT_UNRECOGNIZED | 意图无法识别 |
| 422 | PARAMS_INSUFFICIENT | 参数不完整（需追问） |
| 429 | RATE_LIMITED | 请求频率超限 |
| 500 | LLM_UNAVAILABLE | 所有 LLM 服务不可用 |
| 500 | TOOL_EXECUTION_FAILED | 工具执行失败 |
