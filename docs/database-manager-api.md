# 接口文档：数据库可视化管理模块

## 基础信息

- **Base URL**: `/api/db`
- **认证方式**: Bearer Token（Authorization Header）
- **权限要求**: 所有接口需要 `admin` 角色
- **响应格式**: 统一 `{ success: boolean, data?: any, error?: { message, code } }`

---

## 1. 数据库概览

### 1.1 GET /api/db/info

获取数据库基本信息。

**请求参数**：无

**响应示例**：

```json
{
  "success": true,
  "data": {
    "dbType": "sqlite",
    "dbVersion": "3.45.1",
    "dbSize": 12582912,
    "dbSizeFormatted": "12.0 MB",
    "tableCount": 32,
    "totalRows": 15420,
    "dbPath": "data/tingstudio.db",
    "lastUpdated": "2026-05-29T14:30:22.000Z"
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| dbType | string | 数据库类型：`sqlite` / `mysql` |
| dbVersion | string | 数据库版本号 |
| dbSize | number | 数据库文件大小（字节） |
| dbSizeFormatted | string | 格式化大小（如 `12.0 MB`） |
| tableCount | number | 数据表总数 |
| totalRows | number | 所有表总行数 |
| dbPath | string | 数据库文件路径 |
| lastUpdated | string | 最后更新时间（ISO 8601） |

---

### 1.2 GET /api/db/tables

获取所有数据表列表。

**请求参数**：无

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "name": "materials",
      "rowCount": 1234,
      "columnCount": 18,
      "indexCount": 3,
      "createdAt": "2026-01-15T08:00:00.000Z",
      "sql": "CREATE TABLE materials (...)"
    },
    {
      "name": "formulas",
      "rowCount": 567,
      "columnCount": 15,
      "indexCount": 2,
      "createdAt": "2026-01-15T08:00:00.000Z",
      "sql": "CREATE TABLE formulas (...)"
    }
  ]
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 表名 |
| rowCount | number | 行数 |
| columnCount | number | 字段数 |
| indexCount | number | 索引数 |
| createdAt | string | 创建时间（ISO 8601） |
| sql | string | 建表 SQL |

---

### 1.3 GET /api/db/tables/:tableName/schema

获取指定表的完整结构信息。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| tableName | string | 表名（仅允许 `[a-zA-Z0-9_]`） |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "name": "materials",
    "sql": "CREATE TABLE materials (...)",
    "columns": [
      {
        "cid": 0,
        "name": "id",
        "type": "TEXT",
        "notnull": 1,
        "defaultValue": null,
        "pk": 1
      },
      {
        "cid": 1,
        "name": "name",
        "type": "TEXT",
        "notnull": 1,
        "defaultValue": null,
        "pk": 0
      }
    ],
    "indexes": [
      {
        "name": "idx_materials_name",
        "tableName": "materials",
        "unique": false,
        "columns": ["name"],
        "sql": "CREATE INDEX idx_materials_name ON materials(name)"
      }
    ],
    "foreignKeys": [
      {
        "from": "created_by",
        "table": "users",
        "to": "id"
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| columns | ColumnInfo[] | 字段列表 |
| columns[].cid | number | 字段序号 |
| columns[].name | string | 字段名 |
| columns[].type | string | 字段类型 |
| columns[].notnull | number | 是否非空（1=是，0=否） |
| columns[].defaultValue | string/null | 默认值 |
| columns[].pk | number | 是否主键（1=是，0=否） |
| indexes | IndexInfo[] | 索引列表 |
| indexes[].name | string | 索引名 |
| indexes[].tableName | string | 所属表名 |
| indexes[].unique | boolean | 是否唯一索引 |
| indexes[].columns | string[] | 索引包含的列 |
| indexes[].sql | string | 创建索引 SQL |
| foreignKeys | ForeignKeyInfo[] | 外键列表 |
| foreignKeys[].from | string | 本表字段 |
| foreignKeys[].table | string | 引用表 |
| foreignKeys[].to | string | 引用字段 |

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | VALIDATION_ERROR | 表名格式不合法 |
| 404 | NOT_FOUND | 表不存在 |

---

## 2. 表数据浏览

### 2.1 GET /api/db/tables/:tableName/data

获取指定表的数据（分页 + 搜索 + 排序）。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| tableName | string | 表名（仅允许 `[a-zA-Z0-9_]`） |

**查询参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数（最大 100） |
| search | string | "" | 搜索关键词（模糊匹配所有文本字段） |
| sort | string | "" | 排序列名（仅允许 `[a-zA-Z0-9_]`） |
| order | string | "ASC" | 排序方向：`ASC` / `DESC` |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "columns": [
      { "name": "id", "type": "TEXT", "isJson": false },
      { "name": "name", "type": "TEXT", "isJson": false },
      { "name": "per_100g_json", "type": "TEXT", "isJson": true }
    ],
    "rows": [
      {
        "id": "m001abc",
        "name": "佛手",
        "per_100g_json": "{\"energy\":123.4}"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1234,
      "totalPages": 62
    }
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| columns | ColumnMeta[] | 列元信息（含 isJson 标识） |
| columns[].name | string | 列名 |
| columns[].type | string | 列类型 |
| columns[].isJson | boolean | 是否 JSON 字段（自动检测 `_json` 后缀） |
| rows | Record<string, unknown>[] | 数据行 |
| pagination | Pagination | 分页信息 |

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | VALIDATION_ERROR | 表名/排序字段格式不合法 |
| 404 | NOT_FOUND | 表不存在 |

---

## 3. 备份与恢复

### 3.1 GET /api/db/backups

获取备份文件列表。

**请求参数**：无

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "fileName": "tingstudio_backup_2026-05-29T14-30-22.json",
      "fileSize": 8652800,
      "fileSizeFormatted": "8.2 MB",
      "createdAt": "2026-05-29T14:30:22.000Z",
      "tableCount": 32,
      "totalRows": 15420,
      "hash": "a1b2c3d4e5f6..."
    }
  ]
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| fileName | string | 文件名 |
| fileSize | number | 文件大小（字节） |
| fileSizeFormatted | string | 格式化大小 |
| createdAt | string | 创建时间（ISO 8601） |
| tableCount | number | 备份中表数量 |
| totalRows | number | 备份中总行数 |
| hash | string | SHA256 校验码 |

---

### 3.2 POST /api/db/backups

创建新备份。

**请求参数**：无（Body 为空）

**响应示例**：

```json
{
  "success": true,
  "data": {
    "fileName": "tingstudio_backup_2026-05-29T14-30-22.json",
    "fileSize": 8652800,
    "fileSizeFormatted": "8.2 MB",
    "tableCount": 32,
    "totalRows": 15420,
    "hash": "a1b2c3d4e5f6..."
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 500 | INTERNAL_ERROR | 备份创建失败 |
| 429 | RATE_LIMITED | 操作过于频繁 |

---

### 3.3 GET /api/db/backups/:fileName/download

下载备份文件。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| fileName | string | 备份文件名（仅允许 `tingstudio_backup_*.json`） |

**响应**：文件流（Content-Type: application/json, Content-Disposition: attachment）

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | VALIDATION_ERROR | 文件名格式不合法 |
| 404 | NOT_FOUND | 文件不存在 |

---

### 3.4 POST /api/db/backups/:fileName/restore

从指定备份文件恢复数据库。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| fileName | string | 备份文件名（仅允许 `tingstudio_backup_*.json`） |

**请求参数**：无（Body 为空）

**响应示例**：

```json
{
  "success": true,
  "data": {
    "restoredTables": 32,
    "restoredRows": 15420,
    "duration": "3.2s"
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | VALIDATION_ERROR | 文件名格式不合法 |
| 404 | NOT_FOUND | 备份文件不存在 |
| 500 | INTERNAL_ERROR | 恢复失败（已自动回滚） |
| 429 | RATE_LIMITED | 操作过于频繁 |

---

### 3.5 DELETE /api/db/backups/:fileName

删除指定备份文件。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| fileName | string | 备份文件名（仅允许 `tingstudio_backup_*.json`） |

**响应示例**：

```json
{
  "success": true,
  "data": null,
  "message": "备份已删除"
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | VALIDATION_ERROR | 文件名格式不合法 |
| 404 | NOT_FOUND | 文件不存在 |

---

### 3.6 POST /api/db/backups/upload-restore

上传备份文件并恢复数据库。

**请求格式**：`multipart/form-data`

| 字段 | 类型 | 说明 |
|------|------|------|
| backup | File | `.json` 备份文件（最大 100MB） |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "fileName": "uploaded_restore_20260529.json",
    "restoredTables": 32,
    "restoredRows": 15420,
    "duration": "4.1s"
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | VALIDATION_ERROR | 文件格式不正确 / 非法文件 |
| 413 | PAYLOAD_TOO_LARGE | 文件超过 100MB |
| 500 | INTERNAL_ERROR | 恢复失败 |
| 429 | RATE_LIMITED | 操作过于频繁 |

---

## 4. 脚本执行

### 4.1 GET /api/db/scripts

获取可用脚本列表。

**请求参数**：无

**响应示例**：

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "fix",
        "name": "数据修复",
        "icon": "🔧",
        "scripts": [
          {
            "id": "fix-materials",
            "name": "修复原料数据",
            "description": "修复原料数据中的异常值和缺失字段",
            "dangerLevel": "medium",
            "estimatedTime": "< 5s",
            "details": [
              "检查 name 为空的记录",
              "补全 material_code 编码",
              "更新 updated_at 时间戳"
            ],
            "lastExecutedAt": "2026-05-28T14:30:00.000Z",
            "lastStatus": "success"
          }
        ]
      }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| categories | ScriptCategory[] | 脚本分类列表 |
| categories[].id | string | 分类 ID |
| categories[].name | string | 分类名称 |
| categories[].icon | string | 分类图标 |
| categories[].scripts | ScriptDefinition[] | 该分类下的脚本列表 |
| scripts[].id | string | 脚本 ID |
| scripts[].name | string | 脚本名称 |
| scripts[].description | string | 脚本描述 |
| scripts[].dangerLevel | string | 危险等级：`low` / `medium` / `high` |
| scripts[].estimatedTime | string | 预计耗时 |
| scripts[].details | string[] | 详细说明 |
| scripts[].lastExecutedAt | string/null | 最近执行时间 |
| scripts[].lastStatus | string/null | 最近执行状态 |

---

### 4.2 POST /api/db/scripts/:scriptId/execute

执行指定脚本。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| scriptId | string | 脚本 ID（仅允许 `[a-zA-Z0-9_-]`） |

**请求参数**：无（Body 为空）

**响应示例**：

```json
{
  "success": true,
  "data": {
    "logId": "log_abc123",
    "scriptId": "fix-materials",
    "status": "success",
    "startedAt": "2026-05-29T15:00:00.000Z",
    "finishedAt": "2026-05-29T15:00:02.300Z",
    "durationMs": 2300,
    "output": "开始修复原料数据...\n检查 name 为空的记录: 0 条\n补全 material_code: 5 条\n更新 updated_at: 5 条\n修复完成!",
    "error": null
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | VALIDATION_ERROR | 脚本 ID 不合法 |
| 404 | NOT_FOUND | 脚本不存在 |
| 409 | CONFLICT | 已有脚本正在执行中 |
| 500 | INTERNAL_ERROR | 脚本执行失败 |
| 504 | GATEWAY_TIMEOUT | 脚本执行超时（30s） |

---

### 4.3 GET /api/db/scripts/:scriptId/history

获取脚本执行历史。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| scriptId | string | 脚本 ID |

**查询参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number | 10 | 返回条数（最大 50） |

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": "log_abc123",
      "scriptId": "fix-materials",
      "scriptName": "修复原料数据",
      "status": "success",
      "startedAt": "2026-05-29T15:00:00.000Z",
      "finishedAt": "2026-05-29T15:00:02.300Z",
      "durationMs": 2300,
      "output": "开始修复原料数据...\n修复完成!",
      "error": null,
      "triggeredBy": "admin"
    }
  ]
}
```

---

## 5. 通用错误响应

所有接口在非业务错误时返回统一格式：

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "timestamp": "2026-05-29T15:00:00.000Z"
  }
}
```

### 错误码汇总

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| UNAUTHORIZED | 401 | 未认证 |
| TOKEN_EXPIRED | 401 | Token 过期 |
| FORBIDDEN | 403 | 非管理员角色 |
| NOT_FOUND | 404 | 资源不存在（表/文件/脚本） |
| VALIDATION_ERROR | 400 | 参数验证失败（表名/文件名格式） |
| CONFLICT | 409 | 脚本已在执行中 |
| PAYLOAD_TOO_LARGE | 413 | 上传文件过大 |
| RATE_LIMITED | 429 | 操作过于频繁 |
| GATEWAY_TIMEOUT | 504 | 脚本执行超时 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
