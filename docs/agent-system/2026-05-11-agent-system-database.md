# 数据库设计：TingStudio Agent 智能对话系统

## 1. 新增表

### 1.1 agent_sessions — Agent 会话表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | 会话ID，格式 `session_{timestamp}_{random}` |
| user_id | TEXT | NOT NULL | 用户ID（关联 users 表） |
| title | TEXT | DEFAULT '' | 会话标题（取首条用户消息前20字） |
| message_count | INTEGER | DEFAULT 0 | 消息数量 |
| last_intent | TEXT | DEFAULT NULL | 最近一次意图标签 |
| last_active_at | TEXT | NOT NULL | 最后活跃时间（ISO 8601） |
| created_at | TEXT | NOT NULL | 创建时间（ISO 8601） |

**索引**：

```sql
CREATE INDEX idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_last_active ON agent_sessions(user_id, last_active_at DESC);
```

**建表 SQL**：

```sql
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  message_count INTEGER DEFAULT 0,
  last_intent TEXT DEFAULT NULL,
  last_active_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_active ON agent_sessions(user_id, last_active_at DESC);
```

---

### 1.2 agent_messages — Agent 消息表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | 消息ID，格式 `msg_{timestamp}_{random}` |
| session_id | TEXT | NOT NULL | 会话ID（关联 agent_sessions 表） |
| role | TEXT | NOT NULL | 角色：`user` / `assistant` / `system` / `tool` |
| content | TEXT | DEFAULT '' | 消息内容 |
| intent | TEXT | DEFAULT NULL | 意图标签（仅 assistant 消息） |
| tool_calls | TEXT | DEFAULT NULL | 工具调用信息（JSON 字符串） |
| tool_results | TEXT | DEFAULT NULL | 工具执行结果（JSON 字符串） |
| display_type | TEXT | DEFAULT NULL | 展示类型：`table` / `card` / `toast` / `chart` |
| metadata | TEXT | DEFAULT NULL | 元数据（JSON 字符串，含 model/tokens/latency） |
| created_at | TEXT | NOT NULL | 创建时间（ISO 8601） |

**索引**：

```sql
CREATE INDEX idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX idx_agent_messages_session_created ON agent_messages(session_id, created_at);
```

**建表 SQL**：

```sql
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT DEFAULT '',
  intent TEXT DEFAULT NULL,
  tool_calls TEXT DEFAULT NULL,
  tool_results TEXT DEFAULT NULL,
  display_type TEXT DEFAULT NULL CHECK(display_type IS NULL OR display_type IN ('table', 'card', 'toast', 'chart')),
  metadata TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session_created ON agent_messages(session_id, created_at);
```

---

### 1.3 search_export_cache — 检索导出缓存表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | 导出ID |
| user_id | TEXT | NOT NULL | 用户ID |
| filename | TEXT | NOT NULL | 文件名 |
| sql | TEXT | NOT NULL | 原始 SQL |
| row_count | INTEGER | DEFAULT 0 | 数据行数 |
| file_path | TEXT | NOT NULL | 文件存储路径 |
| expires_at | TEXT | NOT NULL | 过期时间（24h后自动清理） |
| created_at | TEXT | NOT NULL | 创建时间 |

**建表 SQL**：

```sql
CREATE TABLE IF NOT EXISTS search_export_cache (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  sql TEXT NOT NULL,
  row_count INTEGER DEFAULT 0,
  file_path TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_export_user ON search_export_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_search_export_expires ON search_export_cache(expires_at);
```

---

## 2. 数据关系图

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│   users      │     │  agent_sessions  │     │   agent_messages      │
│──────────────│     │──────────────────│     │───────────────────────│
│ id (PK)      │◄────│ user_id (FK)     │     │ id (PK)               │
│ username     │     │ id (PK)          │◄────│ session_id (FK)       │
│ role         │     │ title            │     │ role                  │
│              │     │ message_count    │     │ content               │
│              │     │ last_intent      │     │ intent                │
│              │     │ last_active_at   │     │ tool_calls (JSON)     │
│              │     │ created_at       │     │ tool_results (JSON)   │
│              │     │                  │     │ display_type          │
└──────────────┘     └──────────────────┘     │ metadata (JSON)       │
                                              │ created_at            │
                                              └───────────────────────┘

┌───────────────────────┐
│ search_export_cache   │
│───────────────────────│
│ id (PK)               │
│ user_id (FK → users)  │
│ filename              │
│ sql                   │
│ row_count             │
│ file_path             │
│ expires_at            │
│ created_at            │
└───────────────────────┘
```

---

## 3. JSON 字段结构定义

### 3.1 tool_calls (JSON)

```json
[
  {
    "id": "call_001",
    "name": "query_formulas",
    "arguments": "{\"keyword\":\"黄芪\"}"
  }
]
```

### 3.2 tool_results (JSON)

```json
[
  {
    "name": "query_formulas",
    "success": true,
    "data": {
      "rows": [...],
      "rowCount": 3
    }
  }
]
```

### 3.3 metadata (JSON)

```json
{
  "model": "deepseek",
  "provider": "deepseek",
  "tokens": {
    "prompt": 500,
    "completion": 80,
    "total": 580
  },
  "latency": 2500,
  "intentCallLatency": 800
}
```

---

## 4. 数据生命周期

| 数据 | 保留策略 | 清理方式 |
|------|---------|---------|
| agent_sessions | 永久保留 | 用户手动删除 |
| agent_messages | 永久保留 | 随 session 删除级联删除 |
| search_export_cache | 24小时 | 定时任务清理 expires_at < NOW() |

---

## 5. 数据隔离

- 业务员只能访问 `user_id = 自身ID` 的 sessions
- 管理员可访问所有 sessions
- NL2SQL 查询自动注入 `created_by` 条件（业务员角色）
