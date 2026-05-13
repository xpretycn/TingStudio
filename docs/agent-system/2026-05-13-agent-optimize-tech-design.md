# 技术方案 — AI助手Agent功能优化（查询专注模式）

> 版本: 1.0.0 | 日期: 2026-05-13 | 范围: AIDashboard页面Agent

---

## 1. 架构变更总览

### 1.1 变更前后对比

```
【变更前】agentController.ts (1548行，全功能)
├── handleChat          → 入口分发
├── handleReActStream   → ReAct循环 + 工具调用 + 确认流程 + 表单生成
├── handleConfirmedAction → 确认后执行写入
├── tryGenerateFormFromResponse → 后置表单生成
├── submitForm          → 表单提交执行
├── getPendingForm      → 获取待填表单
├── parseForm           → 悬浮球表单解析
├── getFloatConfig      → 悬浮球配置
├── updateFloatConfig   → 悬浮球配置更新
├── getRoleConfig       → 身份配置
├── updateRoleConfig    → 身份配置更新
└── 辅助方法 ×8

【变更后】拆分为4个模块
├── agentChatController.ts    → 聊天入口 + ReAct循环（查询专用）
├── agentConfigController.ts  → 配置管理（身份+悬浮球，不动）
├── agentSessionController.ts → 会话管理（不动）
└── agentWriteGuard.ts        → 写入意图拦截器（新增）
```

### 1.2 核心变更原则

1. **写入拦截在Tool调用之前**: ReAct循环中，LLM返回tool_calls时，先经过WriteGuard过滤
2. **查询Tool照常执行**: query_*/calculate_*/validate_*/analyze_*/nl2sql_query 直接执行
3. **写入Tool被拦截**: create_*/update_*/delete_* 被WriteGuard拦截，返回导航指引
4. **移除确认流程**: 不再有confirm/form SSE事件类型
5. **移除表单生成**: tryGenerateFormFromResponse、submitForm、getPendingForm 不再被Dashboard调用

---

## 2. 模块详细设计

### 2.1 agentWriteGuard.ts — 写入意图拦截器（新增）

```typescript
// 位置: backend/src/services/ai/agent/agentWriteGuard.ts

interface WriteGuardResult {
  blocked: boolean;
  toolName: string;
  params: Record<string, any>;
  guidanceMessage?: string;
  navigationLink?: string;
}

const WRITE_TOOLS = new Set([
  "create_formula", "update_formula", "delete_formula",
  "create_material", "update_material", "delete_material",
  "create_salesperson", "update_salesperson", "delete_salesperson",
]);

const TOOL_NAVIGATION_MAP: Record<string, {
  action: string;
  listRoute: string;
  addRoute: string;
  editRoute: string;
  resourceName: string;
}> = {
  create_formula:    { action: "创建配方", listRoute: "/formula", addRoute: "/formula/add", editRoute: "/formula/edit", resourceName: "配方" },
  update_formula:    { action: "编辑配方", listRoute: "/formula", addRoute: "/formula/add", editRoute: "/formula/edit", resourceName: "配方" },
  delete_formula:    { action: "删除配方", listRoute: "/formula", addRoute: "", editRoute: "", resourceName: "配方" },
  create_material:   { action: "创建原料", listRoute: "/material", addRoute: "/material/add", editRoute: "/material/edit", resourceName: "原料" },
  update_material:   { action: "编辑原料", listRoute: "/material", addRoute: "/material/add", editRoute: "/material/edit", resourceName: "原料" },
  delete_material:   { action: "删除原料", listRoute: "/material", addRoute: "", editRoute: "", resourceName: "原料" },
  create_salesperson:{ action: "创建业务员", listRoute: "/salesman", addRoute: "/salesman/add", editRoute: "/salesman/edit", resourceName: "业务员" },
  update_salesperson:{ action: "编辑业务员", listRoute: "/salesman", addRoute: "/salesman/add", editRoute: "/salesman/edit", resourceName: "业务员" },
  delete_salesperson:{ action: "删除业务员", listRoute: "/salesman", addRoute: "", editRoute: "", resourceName: "业务员" },
};

function checkAndBlock(toolName: string, params: Record<string, any>): WriteGuardResult {
  if (!WRITE_TOOLS.has(toolName)) {
    return { blocked: false, toolName, params };
  }

  const nav = TOOL_NAVIGATION_MAP[toolName];
  if (!nav) {
    return { blocked: false, toolName, params };
  }

  const isDelete = toolName.startsWith("delete");
  const isCreate = toolName.startsWith("create");
  const isUpdate = toolName.startsWith("update");

  let link = nav.listRoute;
  let linkText = `${nav.resourceName}管理页面`;

  if (isCreate && nav.addRoute) {
    link = nav.addRoute;
    linkText = `创建${nav.resourceName}`;
  } else if ((isUpdate || isDelete) && (params.id || params.name)) {
    const id = params.id;
    const name = params.name;
    if (id) {
      link = `${nav.editRoute}/${id}`;
      linkText = `编辑${nav.resourceName}`;
    }
  }

  const icon = isDelete ? "⚠️" : "📋";
  const message = `${icon} ${nav.action}请前往**${nav.resourceName}管理**页面操作。\n\n👉 [前往${linkText}](${link})`;

  return {
    blocked: true,
    toolName,
    params,
    guidanceMessage: message,
    navigationLink: link,
  };
}
```

### 2.2 agentChatController.ts — 查询专用聊天控制器

**从agentController.ts中提取并改造的核心逻辑**:

```
handleChat (入口)
  ├── confirmed=false → handleReActStream (查询模式)
  │   ├── ReAct循环 (最多5轮)
  │   │   ├── LLM调用 → 获取tool_calls
  │   │   ├── WriteGuard检查 → 写入拦截
  │   │   │   ├── 查询Tool → 正常执行 → SSE tool_result
  │   │   │   └── 写入Tool → 拦截 → SSE write_guidance
  │   │   └── 无tool_calls → 生成最终回复
  │   └── SSE done
  └── confirmed=true → 不再处理（移除确认流程）
```

**关键变更点**:

| 原逻辑 | 新逻辑 | 原因 |
|--------|--------|------|
| `requiresConfirmation` → 发confirm事件 | WriteGuard拦截 → 发write_guidance事件 | 写入不执行 |
| `tryGenerateFormFromResponse` → 发form事件 | 移除 | 不再生成表单 |
| `handleConfirmedAction` → 执行写入 | 移除 | 不再执行写入 |
| `submitForm` / `getPendingForm` | 保留路由但Dashboard不再调用 | 兼容悬浮球 |

### 2.3 llmService.ts — LLM调用容错增强

**新增重试+超时+熔断**:

```typescript
interface ProviderHealth {
  provider: string;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenUntil: number; // timestamp
  lastError?: string;
}

class LLMAgentService {
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private readonly MAX_RETRIES = 2;       // 同Provider最多重试2次(共3次)
  private readonly TIMEOUT_MS = 30000;    // 30秒超时
  private readonly CIRCUIT_THRESHOLD = 3; // 连续3次失败熔断
  private readonly CIRCUIT_RESET_MS = 300000; // 5分钟熔断恢复

  async streamChatWithRetry(
    request: LLMRequest,
    onChunk: (chunk: string) => void,
    onToolCall?: (toolCall: { id: string; name: string; arguments: string }) => void,
    preferredProvider?: string,
    modelVersion?: string,
  ): Promise<LLMResponse> {
    const providers = this.getHealthyProviders(preferredProvider);

    for (const provider of providers) {
      const health = this.getOrCreateHealth(provider);
      if (health.circuitOpen && Date.now() < health.circuitOpenUntil) {
        continue; // 熔断中，跳过
      }

      for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const result = await this.streamChatWithTimeout(
            provider, request, onChunk, onToolCall, modelVersion,
          );
          this.recordSuccess(provider);
          return result;
        } catch (error) {
          const isTimeout = error instanceof TimeoutError;
          this.recordFailure(provider, error);

          if (attempt < this.MAX_RETRIES && isTimeout) {
            continue; // 超时重试
          }
          break; // 非超时错误或重试耗尽，换Provider
        }
      }
    }

    throw new Error("所有LLM服务暂不可用，请稍后重试");
  }

  private getHealthyProviders(preferred?: string): string[] {
    const all = preferred
      ? [preferred, ...this.fallbackChain.filter(p => p !== preferred)]
      : [...this.fallbackChain];

    return all.filter(p => {
      const health = this.providerHealth.get(p);
      if (!health) return true;
      if (health.circuitOpen && Date.now() < health.circuitOpenUntil) return false;
      return true;
    });
  }

  private recordSuccess(provider: string): void {
    const health = this.getOrCreateHealth(provider);
    health.consecutiveFailures = 0;
    health.circuitOpen = false;
  }

  private recordFailure(provider: string, error: any): void {
    const health = this.getOrCreateHealth(provider);
    health.consecutiveFailures++;
    health.lastError = error?.message;
    if (health.consecutiveFailures >= this.CIRCUIT_THRESHOLD) {
      health.circuitOpen = true;
      health.circuitOpenUntil = Date.now() + this.CIRCUIT_RESET_MS;
    }
  }
}
```

### 2.4 SSE稳定性增强

**后端变更**:

```typescript
// setupSSE变更
private setupSSE(res: Response): AbortController {
  // ... 原有header设置 ...

  // 心跳从15s缩短到8s
  const heartbeat = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) {
      res.write(": heartbeat\n\n");
    } else {
      clearInterval(heartbeat);
    }
  }, 8000); // 15s → 8s

  // 增加连接超时（5分钟无数据则主动关闭）
  const connectionTimeout = setTimeout(() => {
    if (!res.writableEnded) {
      this.sendSSEEvent(res, "error", { message: "连接超时" });
      res.end();
    }
  }, 300000);

  (res as any)._sseHeartbeat = heartbeat;
  (res as any)._sseConnectionTimeout = connectionTimeout;

  // 清理
  const cleanup = () => {
    clearInterval(heartbeat);
    clearTimeout(connectionTimeout);
  };
  res.on("close", cleanup);

  return abortController;
}
```

**前端变更（AIDashboard.vue）**:

```typescript
// handleSend中SSE读取逻辑增加:
// 1. 心跳检测：20s无数据则认为断开
// 2. 自动重连：断开后重试3次
// 3. 错误chunk跳过：JSON.parse失败不中断流

let lastDataTime = Date.now();
const HEARTBEAT_TIMEOUT = 20000;

const heartbeatChecker = setInterval(() => {
  if (Date.now() - lastDataTime > HEARTBEAT_TIMEOUT && isLoading.value) {
    console.warn("[SSE] 心跳超时，尝试重连...");
    clearInterval(heartbeatChecker);
    // 重连逻辑
  }
}, 5000);

// 在chunk处理中更新
for (const line of lines) {
  if (line.startsWith(": ")) continue; // 跳过心跳注释
  if (line.startsWith("data: ")) {
    lastDataTime = Date.now();
    // ... 原有解析逻辑 ...
  }
}
```

### 2.5 会话过期清理

**新增定时清理模块**:

```typescript
// 位置: backend/src/services/ai/agent/sessionCleaner.ts

export class SessionCleaner {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    // 每小时执行一次清理
    this.intervalId = setInterval(() => this.clean(), 3600000);
    // 启动时立即执行一次
    this.clean();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private clean(): void {
    const db = getDb();
    const now = new Date();

    // 1. 清理7天未活动的会话
    const sessionCutoff = new Date(now.getTime() - 7 * 24 * 3600000).toISOString();
    const expiredSessions = db.prepare(
      "SELECT id FROM agent_sessions WHERE last_active_at < ?"
    ).all(sessionCutoff) as any[];

    for (const session of expiredSessions) {
      db.prepare("DELETE FROM agent_messages WHERE session_id = ?").run(session.id);
      db.prepare("DELETE FROM agent_pending_confirmations WHERE session_id = ?").run(session.id);
      db.prepare("DELETE FROM agent_pending_forms WHERE session_id = ?").run(session.id);
      db.prepare("DELETE FROM agent_sessions WHERE id = ?").run(session.id);
    }

    // 2. 清理1小时前的待确认/待填表单
    const formCutoff = new Date(now.getTime() - 3600000).toISOString();
    db.prepare("DELETE FROM agent_pending_confirmations WHERE created_at < ?").run(formCutoff);
    db.prepare("DELETE FROM agent_pending_forms WHERE created_at < ?").run(formCutoff);

    console.log(`[SessionCleaner] 清理完成: ${expiredSessions.length}个过期会话`);
  }
}
```

---

## 3. Prompt优化

### 3.1 System Prompt变更

**移除写入相关描述，增加导航指引规则**:

```diff
 ## 角色定位
-你是一个**确定性业务执行器**，不是通用聊天机器人。你的职责是：
+你是一个**数据查询助手**，专注于帮助用户查询和分析数据。你的职责是：
 1. 理解用户的自然语言输入
 2. 识别业务意图并提取参数
-3. 调用对应的 Tool 执行具体操作
-4. 将结果以清晰的结构化格式返回给用户
+3. 对于查询类意图，调用对应的 Tool 获取数据
+4. 对于写入类意图（创建/修改/删除），提供操作指引和导航链接
+5. 将查询结果以清晰的 Markdown 格式返回给用户

-## 核心原则
-- **确定性优先**: 所有数值必须来自固定公式或数据库，绝不能编造数据
-- **工具驱动**: 你只能通过调用已注册的 Tool 来完成操作，不能自行"想象"结果
-- **直接执行**: 收到用户请求后，应立即调用对应的Tool执行操作
-- **参数不完整时也必须调用工具**: ...
+## 核心原则
+- **查询优先**: 专注于数据查询和分析，以 Markdown 格式清晰展示结果
+- **确定性优先**: 所有数值必须来自固定公式或数据库，绝不能编造数据
+- **工具驱动**: 查询类操作通过调用 Tool 获取真实数据
+- **写入指引**: 当用户表达创建/修改/删除意图时，不要调用写入类Tool，而是提供操作指引和导航链接

+## 写入意图处理规则
+当用户表达创建/修改/删除意图时：
+1. 不要调用 create_*/update_*/delete_* 类Tool
+2. 理解用户意图，用友好语气回复
+3. 提供导航链接引导用户前往对应管理页面操作
+4. 如果用户提到了具体ID或名称，在链接中包含该信息
+5. 示例回复："📋 创建配方请前往**配方管理**页面操作。\n\n👉 [前往创建配方](/formula/add)"

-## 写入操作约束
-1. **写入失败时必须告知**：...
-2. **写入前确认**：...
-3. **写入后验证**：...
+## 查询结果展示规范
+1. **表格数据**: 使用 Markdown 表格，列名使用中文
+2. **单条详情**: 使用 ### 标题 + key: value 列表
+3. **计算结果**: 使用结构化格式展示
+4. **空结果**: 明确告知"数据库中暂无相关数据"，并引导如何添加
+5. **分页数据**: 展示当前页数据，提示总条数和翻页方式
```

---

## 4. SSE事件类型变更

### 4.1 新增事件类型

| 事件类型 | 方向 | 说明 |
|----------|------|------|
| `write_guidance` | Server→Client | 写入意图被拦截，返回导航指引 |

### 4.2 移除事件类型（Dashboard不再处理）

| 事件类型 | 原用途 | 处理方式 |
|----------|--------|----------|
| `confirm` | 写入确认弹窗 | Dashboard前端不再监听 |
| `form` | 动态表单渲染 | Dashboard前端不再监听 |

### 4.3 保留事件类型

| 事件类型 | 说明 |
|----------|------|
| `chunk` | 流式文本片段 |
| `intent` | 意图识别结果 |
| `tool_calls` | 工具调用通知 |
| `tool_result` | 工具执行结果 |
| `done` | 流式完成 |
| `error` | 错误通知 |
| `: heartbeat` | 心跳（8s间隔） |

---

## 5. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/src/services/ai/agent/agentWriteGuard.ts` | 新增 | 写入意图拦截器 |
| `backend/src/services/ai/agent/agentChatController.ts` | 新增 | 从agentController拆出，查询专用 |
| `backend/src/services/ai/agent/sessionCleaner.ts` | 新增 | 会话过期清理 |
| `backend/src/services/ai/agent/agentController.ts` | 修改 | 保留配置/会话/悬浮球方法，移除聊天相关 |
| `backend/src/services/ai/agent/llmService.ts` | 修改 | 增加重试/超时/熔断 |
| `backend/src/services/ai/agent/promptEngine.ts` | 修改 | 更新System Prompt |
| `backend/src/routes/agent.ts` | 修改 | 路由指向新Controller |
| `frontend/src/views/ai/AIDashboard.vue` | 修改 | SSE解析增加write_guidance，移除confirm/form，增加心跳检测 |

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LLM仍可能调用写入Tool | 写入被拦截但用户体验差 | Prompt明确禁止+WriteGuard双重保障 |
| 拆分Controller引入bug | 聊天功能异常 | 逐步拆分，每步验证 |
| SSE重连可能丢失消息 | 用户看到不完整回复 | 重连后从最后一条消息续传 |
| 会话清理误删活跃会话 | 用户丢失对话历史 | 7天阈值足够宽裕，清理前记录日志 |
