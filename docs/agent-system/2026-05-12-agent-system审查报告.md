# TingStudio AI Agent 功能模块审查报告

## 📋 模块概览

AI Agent 模块采用 **意图识别 → 对话管理 → 工具执行 → 流式响应** 的架构，包含以下核心组件：

| 组件             | 文件                                                                                                                           | 职责                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| AgentController  | [agentController.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts)   | 请求入口、SSE 流式推送、会话管理 |
| IntentEngine     | [intentEngine.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/intentEngine.ts)         | LLM 驱动的意图识别与参数提取     |
| DialogManager    | [dialogManager.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/dialogManager.ts)       | 对话流程控制（追问/确认/执行）   |
| LLMAgentService  | [llmService.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/llmService.ts)             | LLM 调用封装与 fallback 链       |
| PromptEngine     | [promptEngine.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/promptEngine.ts)         | 系统 Prompt 模板管理             |
| SessionStore     | [sessionStore.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/sessionStore.ts)         | 会话与消息持久化（SQLite）       |
| ToolRegistry     | [toolRegistry.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/toolRegistry.ts)         | 工具注册/校验/限流/审计          |
| ToolRegistration | [toolRegistration.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/toolRegistration.ts) | 17 个业务工具的具体注册          |

---

## 🔴 严重问题（P0 — 必须修复）

### 1. 路由层缺少认证中间件

[agent.ts:6-9](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/routes/agent.ts#L6-L9) — Agent 路由未挂载 `auth` 中间件，任何人都可以调用 `/agent/chat` 执行创建/删除操作：

```typescript
agentRouter.post("/chat", (req, res) => aiAgentController.handleChat(req, res));
agentRouter.get("/sessions", (req, res) => aiAgentController.getSessions(req, res));
// 缺少 auth 中间件保护
```

**风险**：未认证用户可通过 Agent 工具直接操作数据库（创建配方、删除原料等）。

**建议**：在路由上挂载认证中间件，并在工具执行前校验 `userId` 权限。

---

### 2. `parse_file` 工具存在路径遍历漏洞

[toolRegistration.ts:106-107](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/toolRegistration.ts#L106-L107) — 直接读取用户传入的文件路径，无任何校验：

```typescript
const fs = await import("fs");
const buffer = fs.readFileSync(params.file_path); // 路径遍历！
```

**风险**：攻击者可传入 `../../../etc/passwd` 等路径读取服务器任意文件。

**建议**：限制文件路径必须在 `uploads/` 目录下，使用 `path.resolve` + 白名单校验。

---

### 3. 会话归属未校验（越权访问）

[agentController.ts:416-425](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts#L416-L425) — `getSessionMessages` 和 `deleteSession` 只检查 sessionId 是否存在，不验证是否属于当前用户：

```typescript
async getSessionMessages(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);
    // 缺少: if (session.user_id !== userId) return 403
```

**风险**：用户可遍历 sessionId 查看或删除其他用户的会话。

---

### 4. `nl2sql_query` 工具是空壳，存在设计缺陷

[toolRegistration.ts:506-522](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/toolRegistration.ts#L506-L522) — 该工具仅返回提示信息，不执行实际查询：

```typescript
handler: async params => {
    return { success: true, data: { message: "NL2SQL查询需要通过AI服务生成SQL，请使用 /api/ai/natural-search 接口", ... } };
},
```

**问题**：意图引擎会将复杂查询路由到此工具，但工具无法执行，用户体验断裂。若未来实现直接执行生成的 SQL，则存在 **SQL 注入** 风险。

**建议**：要么完整实现 NL2SQL（含 SQL 安全校验），要么从工具列表中移除，将复杂查询路由到已有的 `/api/ai/natural-search`。

---

## 🟠 重要问题（P1 — 强烈建议修复）

### 5. 双重 LLM 调用导致延迟翻倍

当前流程：**意图识别（LLM调用1）→ 对话管理 → 响应生成（LLM调用2）**

[agentController.ts:136](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts#L136) 和 [agentController.ts:158](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts#L158) — 每次用户消息都触发两次 LLM 调用，延迟叠加。

**建议**：

- **方案A**：合并为单次 LLM 调用，使用 Function Calling 让模型直接选择工具，省去独立的意图识别步骤。
- **方案B**：对意图识别结果做本地缓存，相似查询直接复用。

---

### 6. 缺少 Agent 循环（ReAct Loop）

当前架构是 **单步执行**：识别意图 → 执行一个工具 → 生成回复。无法处理需要多步推理的场景，例如：

> "查找含有黄芪的配方，计算其中最贵的那个的成本"

这需要：query_formulas → 筛选 → calculate_cost，但当前只能执行一步。

**建议**：实现 ReAct（Reasoning + Acting）循环，允许 LLM 在一次对话中多次调用工具，直到得出最终答案。

---

### 7. SSE 连接未处理客户端断开

[agentController.ts:125-128](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts#L125-L128) — 设置了 SSE headers 但未监听 `req.on('close')` 事件：

```typescript
res.setHeader("Content-Type", "text/event-stream");
// 缺少: req.on('close', () => { abortController.abort(); });
```

**风险**：客户端断开后，服务端仍继续执行 LLM 调用和工具执行，浪费资源。

---

### 8. `create_formula` 自动创建业务员记录

[toolRegistration.ts:322-331](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/toolRegistration.ts#L322-L331) — 当传入的 `salesman_name` 在数据库中不存在时，会自动创建：

```typescript
if (salesman) {
  salesmanId = salesman.id;
} else {
  const sId = generateId();
  db.prepare("INSERT INTO salesmen ...").run(sId, params.salesman_name, sCode, "agent");
  salesmanId = sId;
}
```

**风险**：LLM 幻觉可能生成错误的业务员姓名，导致数据库中出现大量脏数据。

**建议**：业务员不存在时返回错误，要求用户先确认或创建业务员。

---

### 9. 限流追踪器内存泄漏

[toolRegistry.ts:15](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/toolRegistry.ts#L15) — `rateLimitTracker` 是内存中的 Map，永不清理过期条目：

```typescript
private rateLimitTracker = new Map<string, number[]>();
```

虽然 `checkRateLimit` 会过滤过期时间戳，但 Map 的 key 本身永不删除。长期运行后内存持续增长。

**建议**：定期清理空数组或长时间未访问的 key，或改用 Redis 等外部存储。

---

## 🟡 一般问题（P2 — 建议优化）

### 10. 前端 Agent Store 未实现 SSE 流式接收

[agent.ts (frontend)](file:///d:/Program%20Data/workspace-codebd/TingStudio/frontend/src/api/agent.ts#L62-L69) — 前端 `chat()` 方法使用普通 POST 请求，但后端默认 `stream=true`：

```typescript
chat(params: ChatRequest) {
    return http.post<any, ChatResponse>("/agent/chat", {
        stream: params.stream ?? false, // 默认 false
    });
}
```

后端默认 `stream = true`，但前端默认 `false`，导致流式能力未使用。

**建议**：前端实现 `EventSource` 或 `fetch + ReadableStream` 接收 SSE，实现打字机效果。

---

### 11. 系统 Prompt 每次请求重建

[agentController.ts:148-150](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts#L148-L150) — 每次请求都调用 `promptEngine.buildSystemPrompt()` 并序列化工具定义：

```typescript
const systemPrompt = promptEngine.buildSystemPrompt(JSON.stringify(toolRegistry.getToolsForLLM(), null, 2));
```

工具列表在运行时几乎不变，可以缓存。

**建议**：在工具注册完成后预生成 systemPrompt，仅在工具变更时重新构建。

---

### 12. 大量 `as any` 类型断言

代码中存在多处 `as any` 强制类型转换，例如：

- [agentController.ts:63](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts#L63): `const aiService = (llmAgentService as any).aiService as AIService`
- [sessionStore.ts:35](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/sessionStore.ts#L35): `.get(sessionId) as any`
- [toolRegistration.ts:252](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/toolRegistration.ts#L252): `.get(...sqlParams) as any`

**建议**：定义精确的数据库行类型，减少 `as any` 使用。

---

### 13. 已废弃的 `substr` 方法

多处使用 `String.prototype.substr()`（已废弃）：

- [agentController.ts:305](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/agentController.ts#L305): `Math.random().toString(36).substr(2, 9)`
- [sessionStore.ts:30](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/services/ai/agent/sessionStore.ts#L30): 同上

**建议**：替换为 `substring(2, 11)` 或使用 `crypto.randomUUID()`。

---

### 14. 硬编码的魔法数字

- `slice(-18)` — 上下文消息截取长度（出现 3 次）
- `slice(-6)` — 意图上下文截取长度
- `slice(0, 500)` — 工具结果截取长度
- `slice(0, 20)` — 会话标题长度

**建议**：提取为命名常量，如 `MAX_CONTEXT_MESSAGES = 18`。

---

### 15. 混合语言的错误消息

工具返回的错误消息中英文混杂：

- `"Salesperson with ID ${id} not found"` (英文)
- `"配方 ${id} 不存在"` (中文)
- `"查询配方失败"` (中文)

**建议**：统一使用中文错误消息（与用户界面语言一致），或建立 i18n 机制。

---

### 16. 测试覆盖严重不足

| 模块                | 测试状态      |
| ------------------- | ------------- |
| ToolRegistry        | ✅ 有单测     |
| ToolRegistration    | ✅ 有集成测试 |
| PromptEngine        | ✅ 有单测     |
| **AgentController** | ❌ 无测试     |
| **IntentEngine**    | ❌ 无测试     |
| **DialogManager**   | ❌ 无测试     |
| **SessionStore**    | ❌ 无测试     |
| **LLMAgentService** | ❌ 无测试     |

**建议**：优先为 AgentController、IntentEngine、DialogManager 补充单元测试，尤其是意图识别的边界情况。

---

## 📊 优先级总结

| 优先级 | 编号   | 问题                          | 影响范围  |
| ------ | ------ | ----------------------------- | --------- |
| **P0** | #1     | 路由缺少认证中间件            | 安全      |
| **P0** | #2     | parse_file 路径遍历           | 安全      |
| **P0** | #3     | 会话越权访问                  | 安全      |
| **P0** | #4     | nl2sql_query 空壳/SQL注入风险 | 安全+功能 |
| **P1** | #5     | 双重 LLM 调用延迟             | 性能      |
| **P1** | #6     | 缺少 ReAct 循环               | 功能      |
| **P1** | #7     | SSE 未处理断开                | 资源泄漏  |
| **P1** | #8     | 自动创建业务员                | 数据质量  |
| **P1** | #9     | 限流内存泄漏                  | 稳定性    |
| **P2** | #10    | 前端未实现 SSE                | 用户体验  |
| **P2** | #11    | Prompt 重复构建               | 性能      |
| **P2** | #12-16 | 类型安全/代码规范/测试        | 代码质量  |

---

## 🏗️ 架构级优化建议

1. **引入 Function Calling 替代独立意图识别**：让 LLM 通过标准 Function Calling 协议直接选择工具和参数，消除独立的意图识别步骤，减少一次 LLM 调用，同时提高工具选择的准确性。
2. **实现 ReAct Agent 循环**：支持多步工具调用，让 Agent 能处理复杂的多步推理任务。核心循环：`Thought → Action → Observation → ... → Final Answer`。
3. **统一 LLM 调用层**：当前 `AIService`、`LLMAgentService`、`IntentEngine` 各自管理 LLM 调用，应统一为一个带 fallback、重试、限流、审计的 LLM Gateway。
4. **工具执行增加沙箱**：对数据库写操作的工具（create/update/delete）增加事务包裹和回滚机制，避免部分执行导致数据不一致。
5. **前端实现完整的 SSE 流式交互**：包括打字机效果、工具调用实时展示、确认/取消交互，让 Agent 对话体验达到 ChatGPT 级别。

---

以上就是完整的审查结果。**最紧迫的是 P0 级的 4 个安全问题**，建议优先修复。如果需要我针对某个具体问题编写修复代码，请告诉我。
