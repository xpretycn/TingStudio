# 数据库设计文档：数据库可视化管理模块

## 1. 概述

本模块主要**读取**现有数据库元信息，不修改现有表结构。仅新增 1 张表用于记录脚本执行历史。

---

## 2. 新增表

### 2.1 db_script_logs（脚本执行日志）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | 日志 ID（generateId()） |
| script_id | TEXT | NOT NULL | 脚本 ID（如 `fix-materials`） |
| script_name | TEXT | NOT NULL | 脚本名称（如 `修复原料数据`） |
| status | TEXT | NOT NULL DEFAULT 'running' | 执行状态：`running` / `success` / `failed` / `timeout` |
| started_at | DATETIME | NOT NULL | 开始时间 |
| finished_at | DATETIME | | 结束时间 |
| duration_ms | INTEGER | | 执行耗时（毫秒） |
| output | TEXT | | 标准输出内容 |
| error | TEXT | | 错误信息 |
| triggered_by | TEXT | NOT NULL | 触发者用户 ID |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**建表 SQL（SQLite）**：

```sql
CREATE TABLE IF NOT EXISTS db_script_logs (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  script_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at DATETIME NOT NULL,
  finished_at DATETIME,
  duration_ms INTEGER,
  output TEXT,
  error TEXT,
  triggered_by TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_db_script_logs_script_id ON db_script_logs(script_id);
CREATE INDEX IF NOT EXISTS idx_db_script_logs_status ON db_script_logs(status);
CREATE INDEX IF NOT EXISTS idx_db_script_logs_created_at ON db_script_logs(created_at);
```

**建表 SQL（MySQL）**：

```sql
CREATE TABLE IF NOT EXISTS db_script_logs (
  id VARCHAR(36) PRIMARY KEY,
  script_id VARCHAR(100) NOT NULL,
  script_name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  duration_ms INT NULL,
  output TEXT NULL,
  error TEXT NULL,
  triggered_by VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_db_script_logs_script_id (script_id),
  INDEX idx_db_script_logs_status (status),
  INDEX idx_db_script_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. 读取的现有表（仅查询，不修改）

| 表名 | 查询方式 | 用途 |
|------|---------|------|
| sqlite_master | PRAGMA / SELECT | 获取表列表、索引、触发器 |
| 各业务表 | PRAGMA table_info | 获取表结构 |
| 各业务表 | SELECT ... LIMIT OFFSET | 数据浏览 |

---

## 4. 文件系统结构

### 4.1 备份目录

```
backend/data/backup/
├── tingstudio_backup_2026-05-29T14-30-22.json
├── tingstudio_backup_2026-05-28T09-15-00.json
└── ...
```

**备份文件格式**（复用 exportDatabase.ts 的 ExportData V2 格式）：

```json
{
  "version": "2.0",
  "exportedAt": "2026-05-29T14:30:22.000Z",
  "dbPath": "data/tingstudio.db",
  "sqliteVersion": "3.45.1",
  "tables": [
    {
      "schema": {
        "name": "materials",
        "sql": "CREATE TABLE ...",
        "columns": [...],
        "foreignKeys": [...],
        "rowCount": 1234,
        "dataHash": "a1b2c3..."
      },
      "rows": [...]
    }
  ],
  "indexes": [...],
  "triggers": [...],
  "meta": {
    "totalRows": 15420,
    "totalTables": 32,
    "totalIndexes": 15,
    "totalTriggers": 3,
    "schemaHash": "d4e5f6..."
  }
}
```

---

## 5. 迁移脚本

迁移脚本路径：`backend/src/scripts/migrations/createDbScriptLogs.ts`

该迁移脚本需：
1. 检查 `db_script_logs` 表是否已存在
2. 若不存在，执行建表 SQL + 创建索引
3. 幂等设计：可重复执行不出错
