# 接口文档 — AI助手Agent功能优化（查询专注模式）

> 版本: 1.0.0 | 日期: 2026-05-13 | 范围: AIDashboard页面Agent

---

## 1. 接口变更总览

| 接口 | 变更类型 | 说明 |
|------|----------|------|
| POST /api/agent/chat | **修改** | SSE事件类型变更，移除confirm/form，新增write_guidance |
| POST /api/agent/submit-form | 保留 | 悬浮球仍可使用，Dashboard不再调用 |
| GET /api/agent/pending-form/:sessionId | 保留 | 同上 |
| GET /api/agent/sessions | 不变 | — |
| GET /api/agent/sessions/:sessionId | 不变 | — |
| DELETE /api/agent/sessions/:sessionId | 不变 | — |
| GET /api/agent/role-config | 不变 | — |
| PUT /api/agent/role-config | 不变 | — |
| GET /api/agent/float-config | 不变 | — |
| PUT /api/agent/float-config | 不变 | — |
| POST /api/agent/parse-form | 不变 | 悬浮球专用 |

---

## 2. POST /api/agent/chat（修改）

### 2.1 请求

```json
{
  "message": "查看含有黄芪的配方",
  "sessionId": "session_xxx",
  "stream": true,
  "confirmed": false,
  "model": "deepseek",
  "modelVersion": "deepseek-v4-flash"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | ✅ | 用户消息 |
| sessionId | string | ❌ | 会话ID，空则新建 |
| stream | boolean | ❌ | 默认true，是否流式 |
| confirmed | boolean | ❌ | 默认false（不再使用，保留兼容） |
| model | string | ❌ | 指定LLM Provider，默认deepseek |
| modelVersion | string | ❌ | 指定模型版本 |

### 2.2 SSE响应事件

#### 2.2.1 chunk — 流式文本片段（不变）

```
data: {"type":"chunk","content":"根据查询结果"}
```

#### 2.2.2 intent — 意图识别（不变）

```
data: {"type":"intent","intent":"query_data","params":{"keyword":"黄芪"},"confidence":0.95}
```

#### 2.2.3 tool_calls — 工具调用通知（不变）

```
data: {"type":"tool_calls","calls":[{"name":"query_formulas","arguments":"{\"keyword\":\"黄芪\"}"}]}
```

#### 2.2.4 tool_result — 工具执行结果（不变）

```
data: {"type":"tool_result","name":"query_formulas","success":true,"data":{"rows":[...],"total":5},"displayType":"table"}
```

#### 2.2.5 write_guidance — 写入意图拦截（新增）

当LLM调用写入类Tool时，WriteGuard拦截并返回导航指引：

```
data: {"type":"write_guidance","toolName":"create_formula","params":{"name":"黄芪配方"},"message":"📋 创建配方请前往**配方管理**页面操作。\n\n👉 [前往创建配方](/formula/add)","navigationLink":"/formula/add"}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 固定值 "write_guidance" |
| toolName | string | 被拦截的Tool名称 |
| params | object | LLM传入的参数 |
| message | string | 导航指引消息（Markdown格式） |
| navigationLink | string | 导航链接 |

#### 2.2.6 done — 流式完成（不变）

```
data: {"type":"done","sessionId":"session_xxx","usage":{"prompt_tokens":100,"completion_tokens":200,"total_tokens":300},"model":"deepseek","latency":1500}
```

#### 2.2.7 error — 错误通知（不变）

```
data: {"type":"error","message":"所有LLM服务暂不可用，请稍后重试"}
```

#### 2.2.8 : heartbeat — 心跳（间隔变更）

```
: heartbeat
```

间隔从15s缩短为8s。

### 2.3 移除的SSE事件

| 事件类型 | 原格式 | 处理方式 |
|----------|--------|----------|
| confirm | `{"type":"confirm","message":"...","toolName":"...","params":{}}` | Dashboard前端不再监听此事件 |
| form | `{"type":"form","formSchema":{...},"message":""}` | Dashboard前端不再监听此事件 |

---

## 3. 前端SSE解析变更

### 3.1 AIDashboard.vue handleSend变更

```typescript
// SSE事件处理switch新增:
case 'write_guidance':
  // 写入意图被拦截，将指引消息追加到流式内容
  fullContent += parsed.message;
  streamingContent.value += parsed.message;
  autoScrollToBottom();
  break;

// 移除以下case:
// case 'confirm': ... (不再处理)
// case 'form': ... (不再处理)
```

### 3.2 心跳检测新增

```typescript
// 在SSE读取循环中:
let lastDataTime = Date.now();
const HEARTBEAT_TIMEOUT_MS = 20000;

// 每收到数据更新时间戳
if (line.startsWith("data: ") || line.startsWith(": ")) {
  lastDataTime = Date.now();
}

// 定时检测心跳超时
const heartbeatChecker = setInterval(() => {
  if (isLoading.value && Date.now() - lastDataTime > HEARTBEAT_TIMEOUT_MS) {
    console.warn("[SSE] 心跳超时");
    clearInterval(heartbeatChecker);
    // 尝试重连或提示用户
  }
}, 5000);
```

### 3.3 导航链接点击处理

Dashboard中AI消息的Markdown渲染需要支持内部链接点击：

```typescript
// 在消息渲染区域增加链接拦截
function handleMarkdownClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const anchor = target.closest('a');
  if (anchor) {
    const href = anchor.getAttribute('href');
    if (href && href.startsWith('/')) {
      e.preventDefault();
      router.push(href);
    }
  }
}
```

---

## 4. 错误码

| HTTP状态码 | 错误信息 | 说明 |
|------------|----------|------|
| 401 | 认证信息缺失 | Token无效或过期 |
| 400 | 消息不能为空 | message字段为空 |
| 500 | 所有LLM服务暂不可用 | 所有Provider均失败（含重试） |
| SSE error | 连接超时 | 5分钟无数据主动关闭 |
| SSE error | LLM调用超时 | 单次调用30s超时 |
