# 数据库变更文档 — AI助手Agent功能优化（查询专注模式）

> 版本: 1.0.0 | 日期: 2026-05-13 | 范围: AIDashboard页面Agent

---

## 1. 变更总览

| 变更类型 | 表名 | 说明 |
|----------|------|------|
| 无变更 | agent_sessions | 结构不变 |
| 无变更 | agent_messages | 结构不变 |
| 无变更 | agent_pending_confirmations | 保留（悬浮球仍使用） |
| 无变更 | agent_pending_forms | 保留（悬浮球仍使用） |
| 无变更 | agent_role_config | 不变 |
| 无变更 | agent_float_config | 不变 |
| **新增** | agent_provider_health | LLM Provider熔断状态 |
| **新增** | agent_session_cleanup_log | 清理日志 |

---

## 2. 新增表

### 2.1 agent_provider_health — Provider熔断状态

```sql
CREATE TABLE IF NOT EXISTS agent_provider_health (
  provider TEXT PRIMARY KEY,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  circuit_open INTEGER NOT NULL DEFAULT 0,
  circuit_open_until TEXT DEFAULT NULL,
  last_error TEXT DEFAULT NULL,
  last_success_at TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | TEXT PK | Provider标识（deepseek/dashscope/zhipu） |
| consecutive_failures | INTEGER | 连续失败次数 |
| circuit_open | INTEGER | 熔断状态：0=关闭，1=开启 |
| circuit_open_until | TEXT | 熔断恢复时间（ISO8601） |
| last_error | TEXT | 最近一次错误信息 |
| last_success_at | TEXT | 最近一次成功时间 |
| updated_at | TEXT | 更新时间 |

**数据示例**:

```sql
INSERT INTO agent_provider_health (provider, consecutive_failures, circuit_open, circuit_open_until, last_error)
VALUES ('deepseek', 3, 1, '2026-05-13T15:30:00.000Z', 'Connection timeout');
```

### 2.2 agent_session_cleanup_log — 清理日志

```sql
CREATE TABLE IF NOT EXISTS agent_session_cleanup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaned_sessions INTEGER NOT NULL DEFAULT 0,
  cleaned_messages INTEGER NOT NULL DEFAULT 0,
  cleaned_confirmations INTEGER NOT NULL DEFAULT 0,
  cleaned_forms INTEGER NOT NULL DEFAULT 0,
  ran_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增ID |
| cleaned_sessions | INTEGER | 清理的会话数 |
| cleaned_messages | INTEGER | 清理的消息数 |
| cleaned_confirmations | INTEGER | 清理的确认记录数 |
| cleaned_forms | INTEGER | 清理的表单记录数 |
| ran_at | TEXT | 执行时间 |

---

## 3. 索引

```sql
CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_active_cutoff
  ON agent_sessions(last_active_at);

CREATE INDEX IF NOT EXISTS idx_agent_pending_confirmations_created
  ON agent_pending_confirmations(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_pending_forms_created
  ON agent_pending_forms(created_at);
```

---

## 4. 数据清理策略

### 4.1 定时清理规则

| 目标表 | 条件 | 频率 |
|--------|------|------|
| agent_sessions + agent_messages | `last_active_at < NOW() - 7天` | 每小时 |
| agent_pending_confirmations | `created_at < NOW() - 1小时` | 每小时 |
| agent_pending_forms | `created_at < NOW() - 1小时` | 每小时 |
| agent_provider_health | `circuit_open = 1 AND circuit_open_until < NOW()` | 每小时（重置熔断） |

### 4.2 清理SQL

```sql
-- 清理过期会话（7天）
DELETE FROM agent_messages WHERE session_id IN (
  SELECT id FROM agent_sessions WHERE last_active_at < datetime('now', '-7 days')
);
DELETE FROM agent_pending_confirmations WHERE session_id IN (
  SELECT id FROM agent_sessions WHERE last_active_at < datetime('now', '-7 days')
);
DELETE FROM agent_pending_forms WHERE session_id IN (
  SELECT id FROM agent_sessions WHERE last_active_at < datetime('now', '-7 days')
);
DELETE FROM agent_sessions WHERE last_active_at < datetime('now', '-7 days');

-- 清理过期待确认/表单（1小时）
DELETE FROM agent_pending_confirmations WHERE created_at < datetime('now', '-1 hour');
DELETE FROM agent_pending_forms WHERE created_at < datetime('now', '-1 hour');

-- 重置已恢复的熔断状态
UPDATE agent_provider_health
SET circuit_open = 0, circuit_open_until = NULL
WHERE circuit_open = 1 AND circuit_open_until < datetime('now');
```

---

## 5. 兼容性说明

- 所有现有表结构不变，仅新增2张表和3个索引
- agent_pending_confirmations 和 agent_pending_forms 虽然Dashboard不再使用，但保留供悬浮球Agent使用
- 清理操作通过CASCADE和显式DELETE保证数据一致性
- 无需数据迁移
