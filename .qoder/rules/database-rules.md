---
trigger: always_on
---
# 数据库规范

## 1. 数据库选型

- 开发环境：SQLite（better-sqlite3 / sql.js）
- 生产环境：MySQL（mysql2）
- 数据库适配层：`backend/src/config/database-adapter.ts` 统一封装
- **禁止**直接使用特定数据库的 API，必须通过适配层的 `query()` 函数

## 2. 表命名规范

- 表名：snake_case 复数形式 — `users`、`formulas`、`materials`、`nutrition_profiles`
- 字段名：snake_case — `created_at`、`salesman_id`、`formula_code`
- 关联字段：`{关联表单数}_id` — `salesman_id`、`formula_id`
- 布尔字段：`is_` 前缀 — `is_preset`、`is_active`

## 3. 必备字段

每张表**必须**包含以下字段：

```sql
id VARCHAR(36) PRIMARY KEY,       -- UUID，使用 generateId() 生成
created_at DATETIME NOT NULL,     -- 创建时间，使用 now() 生成
updated_at DATETIME NOT NULL      -- 更新时间
```

业务表还应包含：

```sql
created_by VARCHAR(36),           -- 创建人 ID
```

## 4. 数据库迁移

- 迁移脚本放在 `backend/src/scripts/migrations/` 目录下
- 迁移脚本命名：`add{描述}To{表名}.ts` — 如 `addIsPresetToProfiles.ts`
- **禁止**直接修改生产数据库表结构，必须通过迁移脚本
- 迁移脚本**必须**是幂等的（可重复执行不出错）

## 5. 查询规范

- **必须**使用参数化查询，禁止字符串拼接 SQL
- 分页查询使用 `buildPagination()` 和 `successWithPagination()` 工具
- 模糊搜索使用 `buildLike()` 工具
- 查询结果字段名转换使用 `rowToCamelCase()` / `rowsToCamelCase()`
- 大批量查询**必须**使用分页，默认每页 20 条，最大 100 条

## 6. 数据备份

- 备份文件存放在 `backend/data/backup/` 目录
- 备份文件命名：`tingstudio_backup_{时间戳}.json`
- **禁止**将 `.db` 数据库文件提交到 Git

## 7. 禁止行为

- 禁止在控制器中直接写 SQL，应通过 service 层或工具函数
- 禁止使用 `SELECT *`，应明确列出所需字段
- 禁止在生产环境执行 `DROP TABLE` 或 `DELETE` 不带 WHERE
- 禁止将数据库连接信息硬编码在代码中
- 禁止提交 `.db`、`.db-wal`、`.db-shm` 文件到版本库
