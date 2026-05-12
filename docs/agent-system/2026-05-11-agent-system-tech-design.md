# 技术方案：TingStudio Agent 智能对话系统

## 1. 架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3 + TDesign)                    │
├──────────────┬──────────────────────────────┬───────────────────┤
│ AIDashboard  │  SmartTools                  │  共享组件          │
│ (Agent对话)  │  (填单/导入/检索)             │                   │
│              │                              │ ToolConfirmDialog │
│ SSE流式渲染  │  SmartSearchTab(新)          │ ResultTable       │
│ 工具确认弹窗 │  NL2SQL检索+导出             │ ResultCard        │
│ 结果可视化   │                              │ ExportButton      │
└──────┬───────┴──────────────┬───────────────┴───────────────────┘
       │ /api/agent/chat      │ /api/ai/natural-search
       ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端 (Express + TypeScript)                │
├─────────────────────────────────────────────────────────────────┤
│                        API 路由层                                 │
│  agentRouter (新挂载)          aiRouter (已有)                    │
├─────────────────────────────────────────────────────────────────┤
│                     Agent 控制器层                                │
│  agentController (已有，修复)   aiController (已有)               │
├─────────────────────────────────────────────────────────────────┤
│                  ★ 意图处理层 (新增) ★                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 意图识别模块  │  │ 对话管理模块  │  │ 参数校验模块  │          │
│  │ intentEngine │  │ dialogManager│  │ paramValidator│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
├─────────┼─────────────────┼─────────────────┼───────────────────┤
│         │          Agent 服务层              │                    │
│  ┌──────┴─────────────────┴─────────────────┴──────┐            │
│  │              LLMAgentService (修复)              │            │
│  │  streamChat() → AIService.streamChat() (新增)   │            │
│  └──────────────────────┬──────────────────────────┘            │
│                         │                                        │
│  ┌──────────────────────┴──────────────────────────┐            │
│  │              PromptEngine (增强)                  │            │
│  │  意图识别 prompt + 工具调用 prompt + 追问 prompt  │            │
│  └──────────────────────┬──────────────────────────┘            │
│                         │                                        │
│  ┌──────────────────────┴──────────────────────────┐            │
│  │              ToolRegistry (扩展)                  │            │
│  │  现有9个工具 + 新增NL2SQL工具 + 导出工具          │            │
│  └─────────────────────────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                     数据持久层                                    │
│  agent_sessions (新)  agent_messages (新)  现有业务表             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 意图处理层设计（核心新增）

#### 1.2.1 意图识别模块 (intentEngine.ts)

**设计思路**：利用现有 LLM 的 Function Calling 能力，将"意图识别"本身定义为一个特殊的工具调用。

```typescript
// 意图标签枚举
enum IntentType {
  QUERY_DATA = 'query_data',
  CREATE_DATA = 'create_data',
  UPDATE_DATA = 'update_data',
  DELETE_DATA = 'delete_data',
  CALCULATE = 'calculate',
  CHAT = 'chat',
  UNCLEAR = 'unclear',
}

// 意图识别结果
interface IntentResult {
  intent: IntentType;
  params: Record<string, any>;      // 提取的关键参数
  confidence: number;                // 置信度 0-1
  missingParams: string[];           // 缺失的必填参数
  targetTable?: string;              // 目标表名
  targetAction?: string;             // 目标工具名
}

// 意图识别 Prompt
const INTENT_PROMPT = `
分析用户输入，识别意图并提取参数。

## 意图类型
- query_data: 查询/检索数据
- create_data: 新增/创建数据
- update_data: 修改/更新数据
- delete_data: 删除数据
- calculate: 计算/分析（营养值/成本等）
- chat: 普通聊天/问答
- unclear: 意图不明确

## 可操作的业务对象
- formula: 配方 (字段: name, salesman_name, finished_weight, ratio_factor, materials)
- material: 原料 (字段: name, code, unit, stock, material_type)
- salesperson: 业务员 (字段: name, phone, region)

## 输出格式 (JSON)
{
  "intent": "意图标签",
  "params": { 提取的参数 },
  "confidence": 0.95,
  "missingParams": ["缺失的参数名"],
  "targetTable": "表名",
  "targetAction": "工具名"
}
`;
```

**实现方式**：两次 LLM 调用

```
第一次调用: 意图识别
  输入: system=intentPrompt, user=用户消息+上下文
  输出: IntentResult JSON

第二次调用: 执行/追问 (根据意图结果)
  - 参数完整 + 读操作 → 直接调用工具
  - 参数完整 + 写操作 → 生成确认话术
  - 参数不完整 → 生成追问话术
  - chat/unclear → 普通聊天回复
```

#### 1.2.2 对话管理模块 (dialogManager.ts)

```typescript
interface DialogState {
  sessionId: string;
  intentHistory: IntentResult[];     // 意图历史
  pendingConfirmation: {             // 待确认的操作
    toolName: string;
    params: Record<string, any>;
    confirmMessage: string;
  } | null;
  collectedParams: Record<string, any>; // 已收集的参数
}

class DialogManager {
  // 处理意图识别结果，决定下一步
  processIntent(intent: IntentResult, state: DialogState): DialogAction {
    if (intent.intent === 'chat' || intent.intent === 'unclear') {
      return { type: 'chat', message: '...' };
    }

    if (intent.missingParams.length > 0) {
      return {
        type: 'follow_up',
        message: this.generateFollowUp(intent.missingParams, intent.targetTable),
        missingParams: intent.missingParams,
      };
    }

    if (['create_data', 'update_data', 'delete_data'].includes(intent.intent)) {
      return {
        type: 'confirm',
        message: this.generateConfirmMessage(intent),
        toolName: intent.targetAction,
        params: intent.params,
      };
    }

    return { type: 'execute', toolName: intent.targetAction, params: intent.params };
  }

  private generateFollowUp(missing: string[], table?: string): string {
    const fieldLabels: Record<string, string> = {
      name: '名称', salesman_name: '业务员', finished_weight: '成品重量(g)',
      materials: '原料列表', phone: '手机号', region: '区域',
    };
    const labels = missing.map(f => fieldLabels[f] || f).join('、');
    return `请提供以下信息：${labels}`;
  }

  private generateConfirmMessage(intent: IntentResult): string {
    const actionLabels: Record<string, string> = {
      create_data: '创建', update_data: '修改', delete_data: '删除',
    };
    return `确认${actionLabels[intent.intent]}？参数：${JSON.stringify(intent.params)}`;
  }
}
```

---

### 1.3 Agent 对话流程（完整）

```
前端 POST /api/agent/chat
  { message, sessionId, stream: true }
       │
       ▼
agentController.handleChat()
       │
       ├── 1. 获取/创建会话 (从数据库)
       ├── 2. 加载会话历史 (最近20轮)
       ├── 3. 意图识别 (第一次LLM调用)
       │     输入: system=intentPrompt + user=消息+上下文
       │     输出: IntentResult
       │
       ├── 4. 对话管理 (dialogManager.processIntent)
       │     ├── chat/unclear → 第二次LLM调用(普通聊天) → SSE流式返回
       │     ├── 参数不完整 → 生成追问 → SSE返回 { type:'follow_up', message }
       │     ├── 参数完整+写操作 → 生成确认 → SSE返回 { type:'confirm', message, tool, params }
       │     └── 参数完整+读操作 → 执行工具 → 格式化结果 → SSE返回
       │
       ├── 5. 用户确认流程
       │     前端发送: { message: "确认", sessionId, confirmed: true }
       │     后端: 执行工具 → 格式化结果 → SSE返回
       │
       └── 6. 持久化
             写入 agent_messages 表
```

---

### 1.4 SSE 事件协议（扩展）

| 事件类型 | 方向 | 数据格式 | 说明 |
|---------|------|---------|------|
| `chunk` | S→C | `{ content: string }` | 流式文本片段 |
| `intent` | S→C | `{ intent, params, confidence }` | 意图识别结果 |
| `follow_up` | S→C | `{ message, missingParams }` | 追问 |
| `confirm` | S→C | `{ message, toolName, params }` | 确认请求 |
| `tool_calls` | S→C | `{ calls: [{name, arguments}] }` | 工具调用通知 |
| `tool_result` | S→C | `{ name, success, data, displayType }` | 工具执行结果 |
| `done` | S→C | `{ sessionId }` | 对话完成 |
| `error` | S→C | `{ message }` | 错误 |

**displayType 枚举**（前端结果可视化）：
- `table` — 表格展示（查询结果）
- `card` — 卡片展示（计算结果）
- `toast` — 提示信息（操作成功/失败）
- `chart` — 图表展示（分析结果）

---

## 2. 模块划分

### 2.1 后端新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `routes/index.ts` | 修改 | 挂载 agentRouter |
| `services/ai/AIService.ts` | 修改 | 新增 streamChat() 方法 |
| `services/ai/agent/agentController.ts` | 修改 | 集成意图处理层 + 会话持久化 |
| `services/ai/agent/intentEngine.ts` | **新增** | 意图识别模块 |
| `services/ai/agent/dialogManager.ts` | **新增** | 对话管理模块 |
| `services/ai/agent/promptEngine.ts` | 修改 | 新增意图识别 prompt |
| `services/ai/agent/sessionStore.ts` | **新增** | 会话持久化（数据库读写） |
| `services/ai/agent/toolRegistration.ts` | 修改 | 新增 NL2SQL 工具 |
| `services/ai/prompts.ts` | 修改 | 增强 NL2SQL prompt（JOIN/聚合） |

### 2.2 前端新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `views/ai/AIDashboard.vue` | 修改 | 对接 Agent 接口 + 工具确认弹窗 + 结果可视化 |
| `views/ai/SmartTools.vue` | 修改 | 新增智能检索 Tab |
| `views/ai/tabs/SmartSearchTab.vue` | **新增** | 智能检索独立组件 |
| `components/ToolConfirmDialog.vue` | **新增** | 工具调用确认弹窗 |
| `components/AgentResultRenderer.vue` | **新增** | Agent 结果可视化渲染器 |
| `api/agent.ts` | **新增** | Agent API 接口定义 |
| `stores/agent.ts` | **新增** | Agent 状态管理 |

---

## 3. 依赖关系

```
P0-1 (挂载路由) ──→ P0-2 (修复streamChat) ──→ P0-3 (前端对接)
                                                    │
                                                    ▼
                                          P1-1 (意图处理层)
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              ▼                     ▼                     ▼
                        P1-2 (前端界面)      P1-3 (会话持久化)      P1-4 (NL2SQL扩展)
                              │                                           │
                              └──────────────────┬────────────────────────┘
                                                 ▼
                                          P1-5 (智能检索Tab)
```

---

## 4. 关键技术决策

### 4.1 意图识别：两次 LLM 调用 vs 单次调用

| 方案 | 优点 | 缺点 |
|------|------|------|
| **两次调用（选用）** | 意图识别精准，追问/确认逻辑清晰 | 延迟增加（约1-2s） |
| 单次调用（纯 Function Calling） | 延迟低 | 意图识别不可控，追问逻辑依赖 LLM 自由生成 |

**决策**：采用两次调用。第一次调用使用低 token 模型（如 deepseek-chat）快速识别意图，第二次调用根据意图结果执行。对于 `chat` 类型意图，两次调用合并为一次。

### 4.2 会话持久化：SQLite vs Redis

| 方案 | 优点 | 缺点 |
|------|------|------|
| **SQLite（选用）** | 沿用现有技术栈，零额外依赖 | 高并发写入性能有限 |
| Redis | 高性能 | 引入新依赖，增加运维复杂度 |

**决策**：采用 SQLite + WAL 模式。TingStudio 是单用户/小团队应用，并发量极低，SQLite 完全满足需求。

### 4.3 前端 SSE 解析：fetch + ReadableStream vs EventSource

| 方案 | 优点 | 缺点 |
|------|------|------|
| **fetch + ReadableStream（选用）** | 支持 POST 请求 + 自定义 Header | 需手动解析 SSE |
| EventSource | 自动解析 SSE | 仅支持 GET 请求，无法传 Authorization Header |

**决策**：沿用现有 fetch + ReadableStream 方案，与当前实现一致。
