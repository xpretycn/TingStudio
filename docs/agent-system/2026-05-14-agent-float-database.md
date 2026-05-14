# 数据库设计文档 — 悬浮球Agent增强（多轮对话+意图路由+工具调用）

> 版本: 1.0.0 | 日期: 2026-05-14 | 范围: 悬浮球AI助手FloatAgent

---

## 1. 变更总览

| 变更类型 | 表名 | 说明 |
|----------|------|------|
| 无变更 | agent_float_config | 已有，字段已满足需求 |
| 无变更 | agent_sessions | 悬浮球Agent复用现有会话表 |
| 无变更 | agent_messages | 悬浮球Agent复用现有消息表 |
| 无变更 | agent_role_config | 角色配置（悬浮球复用） |
| 无变更 | agent_provider_health | 健康检查复用此表 |
| 无变更 | ai_health_records | 智能检索状态记录 |

本项目不需新增任何数据库表或字段，现有表结构完全覆盖需求。

---

## 2. 现有表使用说明

### 2.1 agent_float_config — 悬浮球配置

悬浮球所有可配置项（位置、尺寸、模型、自动填充策略等）均存储在此表。

```sql
CREATE TABLE agent_float_config (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  model TEXT DEFAULT 'deepseek',
  model_name TEXT DEFAULT '',
  fallback_model TEXT DEFAULT '',
  fallback_model_name TEXT DEFAULT '',
  position TEXT DEFAULT 'right',
  drawer_width INTEGER DEFAULT 400,
  theme_color TEXT DEFAULT '',
  show_pulse INTEGER DEFAULT 1,
  enabled_pages TEXT DEFAULT '[]',
  max_rounds INTEGER DEFAULT 10,
  fill_strategy TEXT DEFAULT 'overwrite',
  context_mode TEXT DEFAULT 'page',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**本增强项目涉及的配置项**:

| 字段 | 新增使用方式 | 说明 |
|------|-------------|------|
| model | ✅ 前端sendAgentMessage时读取 | 指定Agent对话使用的LLM模型 |
| model_name | ✅ 传递给LLM | 用于选择模型版本 |
| max_rounds | ✅ 控制ReAct迭代数 | 限制工具调用轮数，默认5 |
| context_mode | ✅ 切换页面时清空消息 | "page"=换页清空，"clear"=不清 |
| fill_strategy | ✅ 同现有 | 回填策略：overwrite/preserve |
| enabled_pages | ✅ 控制是否显示 | 空数组=全部显示 |
| enabled | ✅ 总开关 | 控制悬浮球是否渲染 |
| position/drawer_width | ✅ UI布局 | 气泡位置和抽屉宽度 |

### 2.2 agent_sessions — 会话表

悬浮球Agent的对话复用此表，与AIDashboard Agent隔离（不同sessionId前缀）。

```sql
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '新会话',
  message_count INTEGER NOT NULL DEFAULT 0,
  last_intent TEXT DEFAULT NULL,
  last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**使用说明**:
- 悬浮球创建的session以 `session_float_` 为前缀（通过sessionStore.createSession自动生成）
- share同一user_id但不与其他页面Agent混淆
- 切换页面时（contextMode=page），清空当前sessionId

### 2.3 agent_messages — 消息表

```sql
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls TEXT DEFAULT NULL,
  tool_results TEXT DEFAULT NULL,
  display_type TEXT DEFAULT NULL,
  metadata TEXT DEFAULT '{}',
  intent TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
);
```

**本增强项目新增的metadata字段**:

```json
{
  "model": "deepseek",
  "latency": 3500,
  "tokenUsage": {
    "prompt_tokens": 500,
    "completion_tokens": 200,
    "total_tokens": 700
  }
}
```

**display_type新增取值**:
- `compare` — 配方对比结果
- `quotation` — 报价单结果
- `substitute` — 替代建议结果

### 2.4 agent_role_config — 角色配置

悬浮球Agent的角色定义复用此表，包括称呼、语气风格等。

### 2.5 agent_provider_health — Provider熔断

```
POST /api/agent/float-chat → 内部的handleFloatReActStream
→ 调用callLLMWithTools → 通过llmAgentService
→ llmAgentService内部检查agent_provider_health表
→ 如果熔断开启则降级/切换
```

### 2.6 ai_health_records — 智能检索健康状态

```sql
CREATE TABLE IF NOT EXISTS ai_health_records (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  message TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**使用**:
- `GET /api/agent/health` 从中读取最新一条记录
- `status` 映射：healthy→online, degraded→loading, error→error/offline

---

## 3. 数据流说明

### 3.1 悬浮球Agent对话存储流程

```
用户输入 "对比两个配方"
  → 前端分类: agent意图
  → POST /agent/float-chat (SSE)
  → 后端: sessionStore.createSession() → agent_sessions新增记录
  → sessionStore.addMessage("user", content) → agent_messages新增记录
  → ReAct循环...
  → sessionStore.addMessage("assistant", content, {toolCalls, toolResults, metadata}) → agent_messages新增记录
  → SSE "done" 事件
```

### 3.2 漏字段轮询流程

```
页面切换 → setPageId()
  → fetchFieldHints() → GET /agent/field-hints
  → 服务端读取 fieldMap 静态配置（不查数据库）
  → 返回 missingFields list
  → 前端更新 badgeCount → FloatBubble角标
```

### 3.3 健康检查流程

```
FloatBubble挂载 → fetchHealth() → GET /agent/health
  → 服务端查 ai_health_records 表最新记录
  → 返回 status: "online"|"loading"|"error"
  → 前端更新 agentHealthStatus → 状态灯颜色
```

---

## 4. 索引

现有索引已满足需求，无需新增。

---

## 5. 数据清理

现有清理策略（7天历史会话清理）覆盖悬浮球Agent的会话数据。
