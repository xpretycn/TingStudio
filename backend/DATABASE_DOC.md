# TingStudio 数据库设计文档

> 数据库：SQLite（better-sqlite3）/ 腾讯云 MySQL（CynosDB）
> SQLite 文件路径：`./data/tingstudio.db`
> 运行时初始化：`backend/src/config/database-better-sqlite3.ts`
> 参考脚本：`backend/src/scripts/init.sql`
> 最后更新：2026-06-01

---

## 一、数据库概览

系统共包含 **46 张表**，分为 19 个功能模块：

| 模块           | 表数量 | 表名                                                                                                   |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| 基础模块       | 3      | users, materials, formulas                                                                             |
| 业务员管理     | 1      | salesmen                                                                                               |
| 销量数据       | 1      | formula_sales                                                                                          |
| 版本控制       | 1      | formula_versions                                                                                       |
| 导出管理       | 4      | export_templates, export_jobs, api_data_interfaces, share_configs                                      |
| 营养分析       | 4      | material_nutrition, formula_nutrition_summaries, nutrition_profiles, nutrition_analysis_reports        |
| 报表管理       | 2      | reports, report_targets                                                                                |
| 文件管理       | 3      | uploaded_files, file_audit_log, file_relations                                                         |
| AI 模型管理    | 7      | ai_models, ai_usage_logs, ai_alert_configs, ai_alert_records, ai_health_records, ai_fallback_configs, model_applications |
| AI 助手        | 5      | agent_sessions, agent_messages, agent_pending_confirmations, agent_pending_forms, agent_role_config    |
| AI 助手扩展    | 3      | agent_float_config, agent_provider_health, agent_session_cleanup_log                                   |
| 搜索导出       | 1      | search_export_cache                                                                                    |
| 审核管理       | 2      | formula_review_logs, material_review_logs                                                              |
| 解析与模板     | 4      | parse_results, parse_result_configs, parse_templates, ai_prompt_templates                             |
| 含量比配置     | 1      | ratio_threshold_configs                                                                                |
| 枚举管理       | 2      | enum_options, enum_exclusions                                                                 |
| 配方模板       | 1      | formula_templates                                                            |
| 快速配方       | 1      | quick_formulas                                                               |
| RBAC 权限      | 3      | roles, permissions, role_permissions                                        |

---

## 二、表结构详解

### 2.1 用户表 `users`

存储系统用户信息（管理员、配方师）。

| 字段           | 类型 | 约束                          | 说明                                             |
| -------------- | ---- | ----------------------------- | ------------------------------------------------ |
| `id`           | TEXT | PRIMARY KEY                   | 用户唯一标识（自动生成）                         |
| `username`     | TEXT | NOT NULL, UNIQUE              | 用户名，登录凭证                                 |
| `password`     | TEXT | NOT NULL                      | 密码（bcrypt 哈希）                              |
| `role`         | TEXT | NOT NULL, DEFAULT 'formulist' | 角色：`admin` / `formulist`                      |
| `display_name` | TEXT | DEFAULT NULL                  | 昵称/显示名称                                    |
| `avatar`       | TEXT | DEFAULT NULL                  | 头像 URL                                         |
| `bio`          | TEXT | DEFAULT NULL                  | 个人简介                                         |
| `email`        | TEXT | DEFAULT NULL                  | 邮箱（唯一，应用层校验）                         |
| `phone`        | TEXT | DEFAULT NULL                  | 手机号（唯一，应用层校验）                       |
| `created_at`   | TEXT | NOT NULL                      | 创建时间（ISO 8601）                             |
| `updated_at`   | TEXT | NOT NULL                      | 更新时间（ISO 8601）                             |
| `data_source`  | TEXT | NOT NULL, DEFAULT 'manual'    | 数据来源：`manual` / `batch_import` / `api_sync` |

**业务含义**：

- `admin`：系统管理员，拥有所有权限，可查看所有用户的配方
- `formulist`：配方师，负责配方创建和营养分析，仅可查看自己的配方
- `display_name`、`avatar`、`bio`、`email`、`phone`：个人资料字段，通过 `PUT /api/auth/profile` 更新
- `data_source`：标识数据录入方式，`batch_import` 表示 Excel 批量导入，`api_sync` 表示 API 同步

---

### 2.2 原料表 `materials`

存储配方所需的原料信息，支持版本化管理。

| 字段                  | 类型    | 约束                                                    | 说明                                                   |
| --------------------- | ------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `id`                  | TEXT    | PRIMARY KEY                                              | 原料唯一标识                                           |
| `name`                | TEXT    | NOT NULL                                                 | 原料名称                                               |
| `code`                | TEXT    | NOT NULL                                                 | 原料编码（如 MAT001）                                  |
| `unit`                | TEXT    | NOT NULL, DEFAULT 'g'                                    | 计量单位                                               |
| `stock`               | REAL    | NOT NULL, DEFAULT 0                                      | 库存数量                                               |
| `material_type`       | TEXT    | NOT NULL, DEFAULT 'herb'                                 | 原料类型：`herb`（中药材）/ `supplement`（营养补充剂） |
| `unit_price`          | REAL    | DEFAULT NULL                                             | 单价（元/kg），可为空                                  |
| `data_source`         | TEXT    | NOT NULL, DEFAULT 'manual'                               | 数据来源：`manual` / `batch_import` / `api_sync`       |
| `version`             | INTEGER | NOT NULL, DEFAULT 1                                      | **新增** 版本号                                        |
| `previous_version_id` | TEXT    | DEFAULT NULL                                             | **新增** 上一版本原料 ID                               |
| `is_latest`           | INTEGER | NOT NULL, DEFAULT 1                                      | **新增** 是否为最新版本（1/0）                         |
| `is_deleted`          | INTEGER | NOT NULL, DEFAULT 0                                      | **新增** 是否已删除（1/0）                             |
| `changes_json`        | TEXT    | DEFAULT NULL                                             | **新增** 版本变更记录 JSON                             |
| `status`              | TEXT    | NOT NULL, DEFAULT 'draft'                                | **新增** 状态：`draft` / `pending_review` / `published` |
| `parse_result_id`     | TEXT    | DEFAULT NULL                                             | **新增** 关联解析结果 ID                               |
| `appearance_json` | TEXT    | DEFAULT NULL                                             | **新增** 外观/性状枚举值 JSON         |
| `taste_json`      | TEXT    | DEFAULT NULL                                             | **新增** 性味/口感枚举值 JSON         |
| `efficacy_json`   | TEXT    | DEFAULT NULL                                             | **新增** 功效枚举值 JSON              |
| `created_by`          | TEXT    | NOT NULL                                                 | 创建人（用户 ID）                                      |
| `created_at`          | TEXT    | NOT NULL                                                 | 创建时间                                               |
| `updated_at`          | TEXT    | NOT NULL                                                 | 更新时间                                               |

**索引**：

- `idx_material_name`：按原料名称
- `idx_material_code`：按原料编码
- `idx_material_version`：按版本号
- `idx_material_previous_version`：按上一版本 ID
- `idx_material_is_latest`：按是否最新版本
- `idx_material_is_deleted`：按是否删除
- `idx_material_status`：按状态
- `idx_materials_parse_result_id`：按解析结果 ID
- `idx_materials_appearance_json`：按外观枚举
- `idx_materials_taste_json`：按口感枚举
- `idx_materials_efficacy_json`：按功效枚举

**新增字段说明**：

- `version`：原料版本号，每次升版自增。同一 `code` 可存在多个版本记录（`code` 的 UNIQUE 约束已移除）
- `previous_version_id`：指向上一版本原料的 `id`，形成版本链
- `is_latest`：标记当前 `code` 下最新版本，查询时用于快速定位
- `is_deleted`：软删除标记，删除时置 1 而非物理删除
- `changes_json`：记录本次版本变更的具体字段差异
- `status`：审核流程状态，`draft` → `pending_review` → `published`
- `parse_result_id`：关联 `parse_results.id`，标识该原料由哪次解析结果创建
- `appearance_json`：原料外观/性状枚举值，JSON 数组格式，如 `["粉末","颗粒"]`
- `taste_json`：原料性味/口感枚举值，JSON 数组格式，如 `["甘","平"]`
- `efficacy_json`：原料功效枚举值，JSON 数组格式，如 `["清热","解毒"]`

**`changes_json` 结构**：

```json
[
  {
    "field": "unit_price",
    "oldValue": 55,
    "newValue": 60,
    "changeType": "modify"
  }
]
```

**业务含义**：

- `unit_price`：原料库基价，用于配方成本计算；配方中可通过 `adjustedPrice` 覆盖
- `data_source`：标识数据录入方式，`batch_import` 表示 Excel 批量导入，`api_sync` 表示 API 同步
- 版本化后，同一原料编码可存在多条记录，通过 `is_latest` 筛选当前有效版本

---

### 2.3 配方表 `formulas`

存储配方基本信息，原料列表以 JSON 格式存储，关联业务员。

| 字段                      | 类型 | 约束                       | 说明                        |
| ------------------------- | ---- | -------------------------- | --------------------------- |
| `id`                      | TEXT | PRIMARY KEY                | 配方唯一标识                |
| `code`                    | TEXT | NOT NULL, UNIQUE           | 配方编码（如 FP001）        |
| `name`                    | TEXT | NOT NULL                   | 配方名称                    |
| `salesman_id`             | TEXT | NOT NULL, FK → salesmen.id | 所属业务员                  |
| `salesman_name`           | TEXT | NOT NULL                   | 业务员名称（冗余）          |
| `materials_json`          | TEXT | NOT NULL                   | 原料列表 JSON               |
| `finished_weight`         | REAL | NOT NULL, DEFAULT 0        | 成品重量                    |
| `ratio_factor`            | REAL | NOT NULL, DEFAULT 0.18     | 主料含量比系数（0.15-0.25） |
| `supplement_ratio_factor` | REAL | NOT NULL, DEFAULT 1.0      | 辅料含量比系数（0.5-1.5）   |
| `packaging_price`         | REAL | NOT NULL, DEFAULT 0        | 包装价格（元）              |
| `other_price`             | REAL | NOT NULL, DEFAULT 0        | 其他价格（元）              |
| `profit_margin`           | REAL | NOT NULL, DEFAULT 20       | 利润率（%）                 |
| `description`             | TEXT | DEFAULT NULL               | 配方描述                    |
| `preparation_method`      | TEXT | DEFAULT NULL               | 制作方法                    |
| `original_name`           | TEXT | DEFAULT NULL               | 原始配方名称（文件导入时）  |
| `original_weight`         | REAL | DEFAULT NULL               | 原始配方重量（文件导入时）  |
| `parse_result_id`         | TEXT | DEFAULT NULL               | **新增** 关联解析结果 ID    |
| `created_by`              | TEXT | NOT NULL                   | 创建人（用户 ID）           |
| `created_at`              | TEXT | NOT NULL                   | 创建时间                    |
| `updated_at`              | TEXT | NOT NULL                   | 更新时间                    |

**外键**：`salesman_id` → `salesmen(id)` ON DELETE RESTRICT

**索引**：

- `idx_formula_name`：按配方名称
- `idx_formula_code`：按配方编码
- `idx_formula_salesman_id`：按业务员 ID
- `idx_formula_created_by`：按创建人
- `idx_formulas_parse_result_id`：按解析结果 ID

**新增字段说明**：

- `original_name` / `original_weight`：文件导入配方时保留的原始信息，便于溯源
- `parse_result_id`：关联 `parse_results.id`，标识该配方由哪次解析结果创建

**`materials_json` 结构**：

```json
[
  {
    "materialId": "xxx",
    "materialName": "白砂糖",
    "quantity": 200,
    "adjustedPrice": 15.5
  },
  {
    "materialId": "yyy",
    "materialName": "全脂奶粉",
    "quantity": 300
  }
]
```

> `adjustedPrice`：可选字段，原料单价微调值（覆盖原料库基价 `unit_price`），用于配方定价系统

**业务含义**：

- `code`：配方编码，创建时自动生成（基于配方名称拼音首字母 + 序号），全局唯一
- `packaging_price` / `other_price` / `profit_margin`：报价计算参数，`报价 = (原料总成本 + 包装费 + 其他费) × (1 + 利润率%)`
- `ratio_factor`：主料（中药材）含量比系数，用于营养计算中原料有效成分占比
- `supplement_ratio_factor`：辅料（营养补充剂）含量比系数
- `original_name` / `original_weight`：文件导入配方时保留的原始信息
- `parse_result_id`：关联解析结果，用于追踪配方的 AI 解析来源

---

### 2.4 业务员表 `salesmen`

存储业务员基本信息。

| 字段         | 类型 | 约束                       | 说明                        |
| ------------ | ---- | -------------------------- | --------------------------- |
| `id`         | TEXT | PRIMARY KEY                | 业务员唯一标识              |
| `name`       | TEXT | NOT NULL                   | 姓名                        |
| `code`       | TEXT | NOT NULL, UNIQUE           | 工号（如 YW7959123）        |
| `department` | TEXT | DEFAULT NULL               | 所属部门                    |
| `phone`      | TEXT | DEFAULT NULL               | 联系电话                    |
| `email`      | TEXT | DEFAULT NULL               | 邮箱                        |
| `status`     | TEXT | NOT NULL, DEFAULT 'active' | 状态：`active` / `inactive` |
| `created_by` | TEXT | NOT NULL                   | 创建人                      |
| `created_at` | TEXT | NOT NULL                   | 创建时间                    |
| `updated_at` | TEXT | NOT NULL                   | 更新时间                    |

**索引**：

- `idx_salesman_name`：按姓名
- `idx_salesman_code`：按工号
- `idx_salesman_status`：按状态

**业务含义**：

- 列表不过滤创建人（全员可见）
- 支持按 `department` 筛选
- 删除为物理删除（`DELETE`），停用通过 `PATCH /:id/status` 设置 `inactive`

---

### 2.5 销量数据表 `formula_sales`

存储配方销量记录，支持按月/季/年统计周期。

| 字段           | 类型    | 约束                                           | 说明                                         |
| -------------- | ------- | ---------------------------------------------- | -------------------------------------------- |
| `id`           | TEXT    | PRIMARY KEY                                    | 销量记录主键                                 |
| `formula_id`   | TEXT    | NOT NULL, FK → formulas(id) ON DELETE CASCADE  | 配方 ID                                      |
| `salesman_id`  | TEXT    | NOT NULL, FK → salesmen(id) ON DELETE RESTRICT | 业务员 ID                                    |
| `period_type`  | TEXT    | NOT NULL, DEFAULT 'monthly'                    | 周期类型：`monthly` / `quarterly` / `yearly` |
| `period_start` | TEXT    | NOT NULL                                       | 周期起始日期（格式：YYYY-MM-DD）             |
| `period_end`   | TEXT    | NOT NULL                                       | 周期结束日期                                 |
| `quantity`     | INTEGER | NOT NULL, DEFAULT 0                            | 销售数量（件）                               |
| `revenue`      | REAL    | NOT NULL, DEFAULT 0                            | **销售金额（元）**，前端录入万元后×10000     |
| `notes`        | TEXT    | DEFAULT NULL                                   | 备注                                         |
| `created_by`   | TEXT    | NOT NULL                                       | 创建人                                       |
| `created_at`   | TEXT    | NOT NULL                                       | 创建时间                                     |
| `updated_at`   | TEXT    | NOT NULL                                       | 更新时间                                     |

**唯一约束**：`UNIQUE(formula_id, period_type, period_start)` — 同一配方在同一周期类型+起始日期下不可重复录入

**索引**：

- `idx_fs_formula`：按配方 ID
- `idx_fs_salesman`：按业务员 ID
- `idx_fs_period`：按周期起始日期

**业务含义**：

- 前端录入时金额单位为「万元」，提交时自动 ×10000 转为元存储
- 创建时若未指定 salesman_id，自动取配方的默认负责人
- 统计接口支持按时间段筛选，返回 TOP 排行、月度趋势、环比对比

---

### 2.6 配方版本表 `formula_versions`

存储配方的版本快照和变更记录。

| 字段                      | 类型    | 约束                       | 说明                                              |
| ------------------------- | ------- | -------------------------- | ------------------------------------------------- |
| `version_id`              | TEXT    | PRIMARY KEY                | 版本 ID                                           |
| `formula_id`              | TEXT    | NOT NULL, FK → formulas.id | 配方 ID                                           |
| `version_number`          | TEXT    | NOT NULL                   | 版本号（如 v1.0）                                 |
| `version_name`            | TEXT    | DEFAULT NULL               | 版本名称                                          |
| `version_reason`          | TEXT    | DEFAULT NULL               | 升版原因                                          |
| `changes_json`            | TEXT    | DEFAULT NULL               | 变更记录 JSON                                     |
| `snapshot_json`           | TEXT    | NOT NULL                   | 完整配方快照 JSON                                 |
| `status`                  | TEXT    | NOT NULL, DEFAULT 'draft'  | 状态：`draft` / `pending_review` / `published` / `archived` |
| `is_current`              | INTEGER | NOT NULL, DEFAULT 0        | 是否为当前版本（1/0）                             |
| `ratio_factor`            | REAL    | NOT NULL, DEFAULT 0.18     | 主料含量比系数（0.15-0.25）                       |
| `supplement_ratio_factor` | REAL    | NOT NULL, DEFAULT 1.0      | 辅料含量比系数（0.5-1.5）                         |
| `created_by`              | TEXT    | NOT NULL                   | 创建人                                            |
| `created_at`              | TEXT    | NOT NULL                   | 创建时间                                          |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**索引**：

- `idx_fv_formula`：按配方
- `idx_fv_version_number`：按配方+版本号（复合）
- `idx_fv_status`：按状态
- `idx_fv_formula_status`：按配方+状态（复合）

**新增字段说明**：

- `status` CHECK 约束新增 `pending_review` 值：版本提交审核后状态变为 `pending_review`，审核通过后变为 `published`

**`snapshot_json` 结构**：

```json
{
  "name": "婴儿配方奶粉1段",
  "salesmanId": "xxx",
  "salesmanName": "张明",
  "materials": [...],
  "description": "...",
  "formulaData": { ... }
}
```

**`changes_json` 结构**：

```json
[
  {
    "field": "materials",
    "fieldLabel": "原料: 白砂糖",
    "oldValue": 200,
    "newValue": 180,
    "changeType": "modify"
  },
  {
    "field": "adjustedPrice",
    "fieldLabel": "原料: 肉豆蔻 基价",
    "oldValue": null,
    "newValue": 25.0,
    "changeType": "modify"
  }
]
```

> `changes_json` 支持 `adjustedPrice` 字段对比检测，旧值为 null 时显示「基价」，新值显示具体单价

---

### 2.7 导出模板表 `export_templates`

存储配方导出的模板配置。

| 字段                 | 类型    | 约束                | 说明                                    |
| -------------------- | ------- | ------------------- | --------------------------------------- |
| `template_id`        | TEXT    | PRIMARY KEY         | 模板 ID                                 |
| `name`               | TEXT    | NOT NULL            | 模板名称                                |
| `description`        | TEXT    | DEFAULT NULL        | 描述                                    |
| `type`               | TEXT    | NOT NULL            | 类型：`pdf` / `excel` / `api` / `print` |
| `format_config_json` | TEXT    | NOT NULL            | 格式配置 JSON                           |
| `is_default`         | INTEGER | NOT NULL, DEFAULT 0 | 是否为默认模板                          |
| `created_by`         | TEXT    | NOT NULL            | 创建人                                  |
| `created_at`         | TEXT    | NOT NULL            | 创建时间                                |

**索引**：`idx_et_type`：按类型

---

### 2.8 导出任务表 `export_jobs`

存储配方导出的任务记录。

| 字段            | 类型    | 约束                        | 说明                                                    |
| --------------- | ------- | --------------------------- | ------------------------------------------------------- |
| `job_id`        | TEXT    | PRIMARY KEY                 | 任务 ID                                                 |
| `formula_id`    | TEXT    | NOT NULL, FK → formulas.id  | 配方 ID                                                 |
| `version_id`    | TEXT    | DEFAULT NULL                | 版本 ID                                                 |
| `template_id`   | TEXT    | DEFAULT NULL                | 模板 ID                                                 |
| `export_type`   | TEXT    | NOT NULL                    | 导出类型：`pdf` / `excel` / `api`                       |
| `status`        | TEXT    | NOT NULL, DEFAULT 'pending' | 状态：`pending` / `processing` / `completed` / `failed` |
| `file_url`      | TEXT    | DEFAULT NULL                | 文件路径                                                |
| `file_name`     | TEXT    | DEFAULT NULL                | 文件名                                                  |
| `api_endpoint`  | TEXT    | DEFAULT NULL                | API 推送端点                                            |
| `progress`      | INTEGER | NOT NULL, DEFAULT 0         | 进度百分比（0-100）                                     |
| `error_message` | TEXT    | DEFAULT NULL                | 错误信息                                                |
| `created_by`    | TEXT    | NOT NULL                    | 创建人                                                  |
| `created_at`    | TEXT    | NOT NULL                    | 创建时间                                                |
| `completed_at`  | TEXT    | DEFAULT NULL                | 完成时间                                                |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**索引**：

- `idx_ej_formula`：按配方
- `idx_ej_status`：按状态

---

### 2.9 API 数据接口表 `api_data_interfaces`

存储外部 API 对接配置。

| 字段                 | 类型 | 约束                     | 说明                                            |
| -------------------- | ---- | ------------------------ | ----------------------------------------------- |
| `interface_id`       | TEXT | PRIMARY KEY              | 接口 ID                                         |
| `name`               | TEXT | NOT NULL                 | 接口名称                                        |
| `description`        | TEXT | DEFAULT NULL             | 描述                                            |
| `endpoint`           | TEXT | NOT NULL, UNIQUE         | 端点地址                                        |
| `method`             | TEXT | NOT NULL, DEFAULT 'GET'  | HTTP 方法：`GET` / `POST` / `PUT` / `DELETE`    |
| `authentication`     | TEXT | NOT NULL, DEFAULT 'none' | 认证方式：`none` / `basic` / `apiKey` / `oauth` |
| `auth_config_json`   | TEXT | DEFAULT NULL             | 认证配置 JSON                                   |
| `data_format`        | TEXT | NOT NULL, DEFAULT 'json' | 数据格式：`json` / `xml`                        |
| `field_mapping_json` | TEXT | DEFAULT NULL             | 字段映射 JSON                                   |
| `rate_limit_json`    | TEXT | DEFAULT NULL             | 限流配置 JSON                                   |
| `retry_config_json`  | TEXT | DEFAULT NULL             | 重试配置 JSON                                   |
| `created_by`         | TEXT | NOT NULL                 | 创建人                                          |
| `created_at`         | TEXT | NOT NULL                 | 创建时间                                        |
| `updated_at`         | TEXT | NOT NULL                 | 更新时间                                        |

**索引**：`idx_adi_endpoint`：按端点

---

### 2.10 分享配置表 `share_configs`

存储配方分享链接配置。

| 字段                  | 类型    | 约束                       | 说明                           |
| --------------------- | ------- | -------------------------- | ------------------------------ |
| `share_id`            | TEXT    | PRIMARY KEY                | 分享 ID                        |
| `formula_id`          | TEXT    | NOT NULL, FK → formulas.id | 配方 ID                        |
| `version_id`          | TEXT    | DEFAULT NULL               | 版本 ID                        |
| `share_type`          | TEXT    | NOT NULL, DEFAULT 'link'   | 类型：`link` / `email` / `api` |
| `share_url`           | TEXT    | DEFAULT NULL               | 分享 URL                       |
| `password`            | TEXT    | DEFAULT NULL               | 访问密码                       |
| `expire_date`         | TEXT    | DEFAULT NULL               | 过期日期                       |
| `allowed_emails_json` | TEXT    | DEFAULT NULL               | 允许的邮箱列表 JSON            |
| `download_limit`      | INTEGER | DEFAULT NULL               | 下载次数限制                   |
| `download_count`      | INTEGER | NOT NULL, DEFAULT 0        | 已下载次数                     |
| `created_by`          | TEXT    | NOT NULL                   | 创建人                         |
| `created_at`          | TEXT    | NOT NULL                   | 创建时间                       |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**索引**：`idx_sc_formula`：按配方

---

### 2.11 原料营养成分表 `material_nutrition`

存储每种原料的营养成分数据（每100g含量），支持版本化。

| 字段               | 类型    | 约束                                | 说明                                  |
| ------------------ | ------- | ----------------------------------- | ------------------------------------- |
| `nutrition_id`     | TEXT    | PRIMARY KEY                         | 营养记录 ID                           |
| `material_id`      | TEXT    | NOT NULL, FK → materials.id         | 原料 ID                               |
| `per_100g_json`    | TEXT    | NOT NULL                            | 每100g营养成分 JSON                   |
| `data_version`     | TEXT    | NOT NULL, DEFAULT '1.0'             | 数据版本号                            |
| `data_source`      | TEXT    | DEFAULT NULL                        | 数据来源                              |
| `notes`            | TEXT    | DEFAULT NULL                        | 备注                                  |
| `confidence`       | TEXT    | DEFAULT 'medium'                    | 数据可信度：`high` / `medium` / `low` |
| `last_updated`     | TEXT    | NOT NULL                            | 最后更新时间                          |
| `material_version` | INTEGER | NOT NULL, DEFAULT 1                 | **新增** 对应原料版本号               |
| `is_latest`        | INTEGER | NOT NULL, DEFAULT 1                 | **新增** 是否为最新版本（1/0）        |

**外键**：`material_id` → `materials(id)` ON DELETE CASCADE

**索引**：

- `idx_mn_material_version`：按原料+版本（复合：material_id, material_version）
- `idx_mn_is_latest`：按是否最新版本

**新增字段说明**：

- `material_version`：对应 `materials.version`，标识该营养数据属于哪个原料版本
- `is_latest`：标记当前原料版本下最新营养数据，查询时用于快速定位
- `material_id` 的 UNIQUE 约束已移除，同一原料可存在多条营养记录（对应不同版本）

**`per_100g_json` 示例**：

```json
{
  "energy": 1500,
  "protein": 5.0,
  "fat": 1.0,
  "carbohydrate": 70.0,
  "fiber": 0.5,
  "sugars": 0,
  "sodium": 50.0,
  "potassium": 100,
  "calcium": 20.0,
  "iron": 0.5,
  "zinc": 0.3,
  "magnesium": 10,
  "phosphorus": 50,
  "vitaminA": 200,
  "vitaminC": 0.1,
  "vitaminD": 0,
  "vitaminE": 0.5,
  "vitaminK": 0,
  "vitaminB1": 0.01,
  "vitaminB2": 0.02,
  "vitaminB3": 0.1,
  "vitaminB6": 0.01,
  "vitaminB12": 0,
  "folate": 5,
  "cholesterol": 0,
  "transFat": 0,
  "saturatedFat": 0.3
}
```

**`confidence` 字段说明**：

- `high`：权威数据源（国标/行业数据库）
- `medium`：一般数据源（文献/估算）
- `low`：不确定数据（AI 推断/待验证）

---

### 2.12 配方营养汇总表 `formula_nutrition_summaries`

存储配方的营养成分计算结果。

| 字段                      | 类型 | 约束                       | 说明                |
| ------------------------- | ---- | -------------------------- | ------------------- |
| `summary_id`              | TEXT | PRIMARY KEY                | 汇总 ID             |
| `formula_id`              | TEXT | NOT NULL, FK → formulas.id | 配方 ID             |
| `version_id`              | TEXT | DEFAULT NULL               | 版本 ID             |
| `total_weight`            | REAL | NOT NULL, DEFAULT 0        | 配方总重量          |
| `total_nutrition_json`    | TEXT | NOT NULL                   | 总营养成分 JSON     |
| `per_100g_nutrition_json` | TEXT | NOT NULL                   | 每100g营养 JSON     |
| `material_breakdown_json` | TEXT | DEFAULT NULL               | 各原料贡献明细 JSON |
| `calculated_by`           | TEXT | NOT NULL                   | 计算人              |
| `calculated_at`           | TEXT | NOT NULL                   | 计算时间            |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**唯一约束**：`uk_fns_version`：`UNIQUE(version_id)`（一个版本只能有一个汇总）

**索引**：`idx_fns_formula`：按配方

---

### 2.13 营养标准/档案表 `nutrition_profiles`

存储不同人群的营养标准值。

| 字段                    | 类型    | 约束                | 说明                                                                    |
| ----------------------- | ------- | ------------------- | ----------------------------------------------------------------------- |
| `profile_id`            | TEXT    | PRIMARY KEY         | 标准 ID                                                                 |
| `name`                  | TEXT    | NOT NULL            | 标准名称                                                                |
| `description`           | TEXT    | DEFAULT NULL        | 描述                                                                    |
| `category`              | TEXT    | NOT NULL            | 分类：`infant` / `child` / `adult` / `elderly` / `pregnant` / `special` |
| `target_values_json`    | TEXT    | NOT NULL            | 目标营养值 JSON                                                         |
| `tolerance_ranges_json` | TEXT    | DEFAULT NULL        | 容差范围 JSON                                                           |
| `mandatory_fields_json` | TEXT    | DEFAULT NULL        | 必填字段列表 JSON                                                       |
| `is_preset`             | INTEGER | NOT NULL, DEFAULT 0 | 是否为预置标准（1=系统预置，0=用户自定义）                              |
| `created_at`            | TEXT    | NOT NULL            | 创建时间                                                                |
| `updated_at`            | TEXT    | NOT NULL            | 更新时间                                                                |

**索引**：`idx_np_category`：按分类

**业务含义**：

- `is_preset = 1`：系统预置的国标数据（如"婴儿配方奶GB10765标准"），不可删除
- `is_preset = 0`：用户自定义标准，可修改/删除

---

### 2.14 营养分析报告表 `nutrition_analysis_reports`

存储配方的合规性检查报告。

| 字段                    | 类型 | 约束                                                  | 说明              |
| ----------------------- | ---- | ----------------------------------------------------- | ----------------- |
| `report_id`             | TEXT | PRIMARY KEY                                           | 报告 ID           |
| `formula_id`            | TEXT | NOT NULL, FK → formulas.id                            | 配方 ID           |
| `version_id`            | TEXT | DEFAULT NULL                                          | 版本 ID           |
| `summary_id`            | TEXT | NOT NULL, FK → formula_nutrition_summaries.summary_id | 营养汇总 ID       |
| `compliance_check_json` | TEXT | DEFAULT NULL                                          | 合规检查结果 JSON |
| `recommendations_json`  | TEXT | DEFAULT NULL                                          | 建议列表 JSON     |
| `generated_by`          | TEXT | NOT NULL                                              | 生成人            |
| `generated_at`          | TEXT | NOT NULL                                              | 生成时间          |

**外键**：

- `formula_id` → `formulas(id)` ON DELETE CASCADE
- `summary_id` → `formula_nutrition_summaries(summary_id)` ON DELETE CASCADE

**索引**：`idx_nar_formula`：按配方

---

### 2.15 报表表 `reports`

存储系统生成的周报/月报数据。

| 字段            | 类型    | 约束                       | 说明                                      |
| --------------- | ------- | -------------------------- | ----------------------------------------- |
| `id`            | TEXT    | PRIMARY KEY                | 报表 ID                                   |
| `type`          | TEXT    | NOT NULL                   | 报表类型：`weekly` / `monthly`            |
| `title`         | TEXT    | NOT NULL                   | 报表标题                                  |
| `period_start`  | TEXT    | NOT NULL                   | 统计周期起始日期                          |
| `period_end`    | TEXT    | NOT NULL                   | 统计周期结束日期                          |
| `status`        | TEXT    | NOT NULL, DEFAULT 'draft'  | 状态：`draft` / `published` / `archived`  |
| `data_json`     | TEXT    | NOT NULL, DEFAULT '{}'     | 报表数据 JSON                             |
| `generated_by`  | TEXT    | NOT NULL, DEFAULT 'manual' | 生成方式：`auto` / `manual`               |
| `created_by`    | TEXT    | NOT NULL, FK → users.id    | 创建人                                    |
| `created_at`    | TEXT    | NOT NULL                   | 创建时间                                  |
| `updated_at`    | TEXT    | NOT NULL                   | 更新时间                                  |
| `published_at`  | TEXT    | DEFAULT NULL               | 发布时间                                  |

**外键**：`created_by` → `users(id)`

**索引**：

- `idx_reports_type`：按报表类型
- `idx_reports_period`：按统计周期（复合：period_start, period_end）
- `idx_reports_status`：按状态
- `idx_reports_created_by`：按创建人

---

### 2.16 报表目标表 `report_targets`

存储季度/年度业务目标值。

| 字段            | 类型 | 约束                       | 说明                                   |
| --------------- | ---- | -------------------------- | -------------------------------------- |
| `id`            | TEXT | PRIMARY KEY                | 目标 ID                                |
| `period_type`   | TEXT | NOT NULL                   | 周期类型：`quarterly` / `yearly`       |
| `period_start`  | TEXT | NOT NULL                   | 周期起始日期                           |
| `period_end`    | TEXT | NOT NULL                   | 周期结束日期                           |
| `targets_json`  | TEXT | NOT NULL, DEFAULT '{}'     | 目标值 JSON                            |
| `created_by`    | TEXT | NOT NULL, FK → users.id    | 创建人                                 |
| `created_at`    | TEXT | NOT NULL                   | 创建时间                               |
| `updated_at`    | TEXT | NOT NULL                   | 更新时间                               |

**外键**：`created_by` → `users(id)`

---

### 2.17 上传文件表 `uploaded_files`

存储用户上传的文件元数据及解析状态。

| 字段                | 类型    | 约束                                              | 说明                                                              |
| ------------------- | ------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `file_id`           | TEXT    | PRIMARY KEY                                       | 文件 ID                                                           |
| `original_name`     | TEXT    | NOT NULL                                          | 原始文件名                                                        |
| `storage_path`      | TEXT    | NOT NULL                                          | 存储路径                                                          |
| `file_size`         | INTEGER | NOT NULL                                          | 文件大小（字节）                                                  |
| `mime_type`         | TEXT    | NOT NULL                                          | MIME 类型                                                         |
| `file_type`         | TEXT    | NOT NULL                                          | 文件类型：`formula` / `material`                                  |
| `status`            | TEXT    | NOT NULL, DEFAULT 'uploaded'                      | 状态：`uploaded` / `parsed` / `linked` / `orphaned` / `archived` |
| `related_id`        | TEXT    | DEFAULT NULL                                      | 关联业务对象 ID                                                   |
| `related_type`      | TEXT    | DEFAULT NULL                                      | 关联类型：`formula` / `material`（NULL 时无关联）                 |
| `parse_result_json` | TEXT    | DEFAULT NULL                                      | AI 解析结果 JSON                                                  |
| `parse_model`       | TEXT    | DEFAULT NULL                                      | 解析使用的 AI 模型                                                |
| `parse_confidence`  | REAL    | DEFAULT NULL                                      | 解析置信度（0-1）                                                 |
| `parse_usage_json`  | TEXT    | DEFAULT NULL                                      | AI 调用用量 JSON                                                  |
| `version`           | INTEGER | NOT NULL, DEFAULT 1                               | 文件版本号                                                        |
| `uploaded_by`       | TEXT    | NOT NULL, FK → users.id                           | 上传人                                                            |
| `uploaded_at`       | TEXT    | NOT NULL                                          | 上传时间                                                          |
| `last_accessed_at`  | TEXT    | DEFAULT NULL                                      | 最后访问时间                                                      |

**索引**：

- `idx_uploaded_files_related`：按关联对象（复合：related_id, related_type）
- `idx_uploaded_files_type`：按文件类型
- `idx_uploaded_files_status`：按状态
- `idx_uploaded_files_uploaded_by`：按上传人
- `idx_uploaded_files_uploaded_at`：按上传时间

---

### 2.18 文件审计日志表 `file_audit_log`

存储文件操作的审计日志。

| 字段           | 类型 | 约束                                              | 说明                                                                   |
| -------------- | ---- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `log_id`       | TEXT | PRIMARY KEY                                       | 日志 ID                                                                |
| `file_id`      | TEXT | NOT NULL, FK → uploaded_files.file_id ON DELETE CASCADE | 文件 ID                                                          |
| `action`       | TEXT | NOT NULL                                          | 操作类型：`upload` / `parse` / `link` / `unlink` / `reparse` / `download` / `delete` / `archive` |
| `operator`     | TEXT | NOT NULL                                          | 操作人                                                                 |
| `timestamp`    | TEXT | NOT NULL                                          | 操作时间                                                               |
| `detail_json`  | TEXT | DEFAULT NULL                                      | 操作详情 JSON                                                          |
| `ip_address`   | TEXT | DEFAULT NULL                                      | 操作 IP 地址                                                           |

**外键**：`file_id` → `uploaded_files(file_id)` ON DELETE CASCADE

**索引**：

- `idx_file_audit_file`：按文件 ID
- `idx_file_audit_operator`：按操作人
- `idx_file_audit_timestamp`：按操作时间

---

### 2.19 文件关联表 `file_relations`

存储文件与业务对象（配方/原料）的多对多关联。

| 字段            | 类型 | 约束                                              | 说明                          |
| --------------- | ---- | ------------------------------------------------- | ----------------------------- |
| `relation_id`   | TEXT | PRIMARY KEY                                       | 关联 ID                       |
| `file_id`       | TEXT | NOT NULL, FK → uploaded_files.file_id ON DELETE CASCADE | 文件 ID                 |
| `related_id`    | TEXT | NOT NULL                                          | 关联业务对象 ID               |
| `related_type`  | TEXT | NOT NULL                                          | 关联类型：`formula` / `material` |
| `related_name`  | TEXT | NOT NULL                                          | 关联对象名称                  |
| `created_by`    | TEXT | NOT NULL                                          | 创建人                        |
| `created_at`    | TEXT | NOT NULL                                          | 创建时间                      |

**唯一约束**：`UNIQUE(file_id, related_id, related_type)` — 同一文件与同一对象的关联不可重复

**索引**：

- `idx_fr_file`：按文件 ID
- `idx_fr_related`：按关联对象（复合：related_id, related_type）

---

### 2.20 AI 模型配置表 `ai_models`

存储 AI 模型供应商及模型配置。

| 字段                         | 类型    | 约束                | 说明                              |
| ---------------------------- | ------- | ------------------- | --------------------------------- |
| `id`                         | TEXT    | PRIMARY KEY         | 模型配置 ID                       |
| `provider`                   | TEXT    | NOT NULL, UNIQUE    | 供应商标识（如 dashscope, zhipu） |
| `name`                       | TEXT    | NOT NULL            | 显示名称                          |
| `base_url`                   | TEXT    | NOT NULL            | API 基础 URL                      |
| `api_key`                    | TEXT    | DEFAULT ''          | API 密钥                          |
| `model`                      | TEXT    | NOT NULL            | 文本模型名称                      |
| `vision_model`               | TEXT    | DEFAULT ''          | 视觉模型名称                      |
| `vision_max_tokens`          | INTEGER | DEFAULT NULL        | 视觉模型最大 token 数             |
| `description`                | TEXT    | DEFAULT ''          | 模型描述                          |
| `supports_vision`            | INTEGER | NOT NULL, DEFAULT 0 | 是否支持视觉（1/0）               |
| `health_status`              | TEXT    | NOT NULL, DEFAULT 'unknown' | 健康状态                   |
| `last_health_check`          | TEXT    | DEFAULT NULL        | 最后健康检查时间                  |
| `last_health_latency`        | INTEGER | DEFAULT NULL        | 最后健康检查延迟（ms）            |
| `health_check_interval_days` | INTEGER | NOT NULL, DEFAULT 1 | 健康检查间隔天数                  |
| `sort_order`                 | INTEGER | NOT NULL, DEFAULT 0 | 排序序号                          |
| `created_at`                 | TEXT    | NOT NULL            | 创建时间                          |
| `updated_at`                 | TEXT    | NOT NULL            | 更新时间                          |

**索引**：

- `idx_ai_models_provider`：按供应商
- `idx_ai_models_health`：按健康状态

---

### 2.21 AI 调用日志表 `ai_usage_logs`

存储 AI 模型调用的详细日志。

| 字段                 | 类型    | 约束                | 说明                     |
| -------------------- | ------- | ------------------- | ------------------------ |
| `id`                 | TEXT    | PRIMARY KEY         | 日志 ID                  |
| `provider`           | TEXT    | NOT NULL            | 供应商标识               |
| `model`              | TEXT    | NOT NULL            | 模型名称                 |
| `call_type`          | TEXT    | NOT NULL            | 调用类型                 |
| `prompt_tokens`      | INTEGER | NOT NULL, DEFAULT 0 | Prompt token 数          |
| `completion_tokens`  | INTEGER | NOT NULL, DEFAULT 0 | Completion token 数      |
| `total_tokens`       | INTEGER | NOT NULL, DEFAULT 0 | 总 token 数              |
| `latency_ms`         | INTEGER | DEFAULT NULL        | 响应延迟（ms）           |
| `status`             | TEXT    | NOT NULL, DEFAULT 'success' | 调用状态          |
| `error_message`      | TEXT    | DEFAULT NULL        | 错误信息                 |
| `request_summary`    | TEXT    | DEFAULT NULL        | 请求摘要                 |
| `fallback_from`      | TEXT    | DEFAULT NULL        | 降级来源供应商           |
| `user_id`            | TEXT    | DEFAULT NULL        | 调用用户 ID              |
| `application_name`   | TEXT    | DEFAULT NULL        | **新增** 应用名称        |
| `application_location` | TEXT  | DEFAULT NULL        | **新增** 应用位置        |
| `created_at`         | TEXT    | NOT NULL            | 调用时间                 |

**索引**：

- `idx_ai_usage_provider_date`：按供应商+日期（复合：provider, created_at）
- `idx_ai_usage_call_type`：按调用类型
- `idx_ai_usage_user`：按用户+日期（复合：user_id, created_at）
- `idx_ai_usage_status`：按状态

**新增字段说明**：

- `application_name`：标识 AI 调用的应用来源（如 `smart-generate`、`nl2sql`、`parse` 等）
- `application_location`：标识 AI 调用的页面或功能位置（如 `formula-detail`、`material-list` 等）

---

### 2.22 AI 告警配置表 `ai_alert_configs`

存储 AI 模型的用量告警阈值配置。

| 字段                   | 类型    | 约束                        | 说明                  |
| ---------------------- | ------- | --------------------------- | --------------------- |
| `id`                   | TEXT    | PRIMARY KEY                 | 告警配置 ID           |
| `model_id`             | TEXT    | NOT NULL, UNIQUE, FK → ai_models.id | 模型配置 ID   |
| `provider`             | TEXT    | NOT NULL                    | 供应商标识            |
| `daily_call_limit`     | INTEGER | NOT NULL, DEFAULT 0         | 每日调用上限          |
| `monthly_token_limit`  | INTEGER | NOT NULL, DEFAULT 0         | 每月 token 上限       |
| `warning_threshold`    | INTEGER | NOT NULL, DEFAULT 80        | 预警阈值（%）         |
| `critical_threshold`   | INTEGER | NOT NULL, DEFAULT 95        | 临界阈值（%）         |
| `enabled`              | INTEGER | NOT NULL, DEFAULT 1         | 是否启用（1/0）       |
| `created_at`           | TEXT    | NOT NULL                    | 创建时间              |
| `updated_at`           | TEXT    | NOT NULL                    | 更新时间              |

**外键**：`model_id` → `ai_models(id)` ON DELETE CASCADE

**索引**：`idx_ai_alert_model`：按模型 ID

---

### 2.23 AI 告警记录表 `ai_alert_records`

存储 AI 模型触发的告警记录。

| 字段             | 类型    | 约束                | 说明           |
| ---------------- | ------- | ------------------- | -------------- |
| `id`             | TEXT    | PRIMARY KEY         | 告警记录 ID    |
| `provider`       | TEXT    | NOT NULL            | 供应商标识     |
| `model_name`     | TEXT    | NOT NULL            | 模型名称       |
| `alert_type`     | TEXT    | NOT NULL            | 告警类型       |
| `level`          | TEXT    | NOT NULL            | 告警级别       |
| `threshold`      | INTEGER | NOT NULL            | 触发阈值       |
| `current_value`  | INTEGER | NOT NULL            | 当前值         |
| `limit_value`    | INTEGER | NOT NULL            | 限制值         |
| `message`        | TEXT    | NOT NULL            | 告警消息       |
| `is_read`        | INTEGER | NOT NULL, DEFAULT 0 | 是否已读（1/0）|
| `created_at`     | TEXT    | NOT NULL            | 告警时间       |

**索引**：

- `idx_ai_alert_rec_provider`：按供应商+时间（复合：provider, created_at）
- `idx_ai_alert_rec_level`：按级别+已读（复合：level, is_read）

---

### 2.24 AI 健康检查记录表 `ai_health_records`

存储 AI 模型健康检查的历史记录。

| 字段            | 类型    | 约束                | 说明               |
| --------------- | ------- | ------------------- | ------------------ |
| `id`            | TEXT    | PRIMARY KEY         | 记录 ID            |
| `provider`      | TEXT    | NOT NULL            | 供应商标识         |
| `status`        | TEXT    | NOT NULL            | 健康状态           |
| `latency_ms`    | INTEGER | DEFAULT NULL        | 响应延迟（ms）     |
| `error_message` | TEXT    | DEFAULT NULL        | 错误信息           |
| `checked_at`    | TEXT    | NOT NULL            | 检查时间           |

**索引**：`idx_ai_health_provider_date`：按供应商+时间（复合：provider, checked_at）

---

### 2.25 AI 降级配置表 `ai_fallback_configs`

存储 AI 模型的降级/备用策略配置。

| 字段               | 类型    | 约束                        | 说明                  |
| ------------------ | ------- | --------------------------- | --------------------- |
| `id`               | TEXT    | PRIMARY KEY                 | 降级配置 ID           |
| `model_id`         | TEXT    | NOT NULL, FK → ai_models.id | 主模型 ID             |
| `provider`         | TEXT    | NOT NULL                    | 主供应商标识          |
| `fallback_provider` | TEXT   | NOT NULL                    | 降级供应商标识        |
| `fallback_priority` | INTEGER | NOT NULL, DEFAULT 1         | 降级优先级（数值越小越优先） |
| `enabled`          | INTEGER | NOT NULL, DEFAULT 1         | 是否启用（1/0）       |
| `created_at`       | TEXT    | NOT NULL                    | 创建时间              |
| `updated_at`       | TEXT    | NOT NULL                    | 更新时间              |

**外键**：`model_id` → `ai_models(id)` ON DELETE CASCADE

**唯一约束**：`UNIQUE(model_id, fallback_provider)` — 同一主模型对同一降级供应商只配一条

**索引**：`idx_ai_fallback_model`：按模型 ID

---

### 2.26 模型应用配置表 `model_applications`

存储各业务模块使用的 AI 模型分配。

| 字段           | 类型    | 约束                | 说明                          |
| -------------- | ------- | ------------------- | ----------------------------- |
| `id`           | TEXT    | PRIMARY KEY         | 配置 ID                       |
| `module`       | TEXT    | NOT NULL, UNIQUE    | 业务模块标识                  |
| `module_name`  | TEXT    | NOT NULL            | 模块显示名称                  |
| `provider`     | TEXT    | NOT NULL            | 供应商标识                    |
| `model`        | TEXT    | NOT NULL            | 模型名称                      |
| `description`  | TEXT    | DEFAULT ''          | 描述                          |
| `enabled`      | INTEGER | NOT NULL, DEFAULT 1 | 是否启用（1/0）               |
| `created_by`   | TEXT    | DEFAULT NULL        | 创建人                        |
| `created_at`   | TEXT    | NOT NULL            | 创建时间                      |
| `updated_at`   | TEXT    | NOT NULL            | 更新时间                      |

**索引**：

- `idx_model_app_module`：按模块标识
- `idx_model_app_provider`：按供应商

---

### 2.27 AI 助手会话表 `agent_sessions`

存储 AI 助手的用户会话。

| 字段             | 类型    | 约束                       | 说明               |
| ---------------- | ------- | -------------------------- | ------------------ |
| `id`             | TEXT    | PRIMARY KEY                | 会话 ID            |
| `user_id`        | TEXT    | NOT NULL, FK → users.id    | 用户 ID            |
| `title`          | TEXT    | DEFAULT ''                 | 会话标题           |
| `message_count`  | INTEGER | DEFAULT 0                  | 消息数量           |
| `last_intent`    | TEXT    | DEFAULT NULL               | 最后意图标识       |
| `last_active_at` | TEXT    | NOT NULL                   | 最后活跃时间       |
| `created_at`     | TEXT    | NOT NULL                   | 创建时间           |

**外键**：`user_id` → `users(id)` ON DELETE CASCADE

**索引**：

- `idx_agent_sessions_user_id`：按用户 ID
- `idx_agent_sessions_last_active`：按用户+活跃时间（复合：user_id, last_active_at DESC）

---

### 2.28 AI 助手消息表 `agent_messages`

存储 AI 助手会话中的消息记录。

| 字段            | 类型 | 约束                                              | 说明                                       |
| --------------- | ---- | ------------------------------------------------- | ------------------------------------------ |
| `id`            | TEXT | PRIMARY KEY                                       | 消息 ID                                    |
| `session_id`    | TEXT | NOT NULL, FK → agent_sessions.id ON DELETE CASCADE | 会话 ID                                    |
| `role`          | TEXT | NOT NULL                                          | 角色：`user` / `assistant` / `system` / `tool` |
| `content`       | TEXT | DEFAULT ''                                        | 消息内容                                   |
| `intent`        | TEXT | DEFAULT NULL                                      | 意图标识                                   |
| `tool_calls`    | TEXT | DEFAULT NULL                                      | 工具调用 JSON                              |
| `tool_results`  | TEXT | DEFAULT NULL                                      | 工具返回结果 JSON                          |
| `display_type`  | TEXT | DEFAULT NULL                                      | 展示类型                                   |
| `metadata`      | TEXT | DEFAULT NULL                                      | 元数据 JSON                                |
| `created_at`    | TEXT | NOT NULL                                          | 创建时间                                   |

**外键**：`session_id` → `agent_sessions(id)` ON DELETE CASCADE

**索引**：

- `idx_agent_messages_session_id`：按会话 ID
- `idx_agent_messages_session_created`：按会话+时间（复合：session_id, created_at）

---

### 2.29 AI 助手待确认表 `agent_pending_confirmations`

存储 AI 助手等待用户确认的操作。

| 字段              | 类型 | 约束                                              | 说明           |
| ----------------- | ---- | ------------------------------------------------- | -------------- |
| `session_id`      | TEXT | PRIMARY KEY                                       | 会话 ID        |
| `tool_name`       | TEXT | NOT NULL                                          | 工具名称       |
| `params_json`     | TEXT | NOT NULL                                          | 参数 JSON      |
| `confirm_message` | TEXT | NOT NULL                                          | 确认提示消息   |
| `created_at`      | TEXT | NOT NULL                                          | 创建时间       |

**外键**：`session_id` → `agent_sessions(id)` ON DELETE CASCADE

---

### 2.30 AI 助手待填报表 `agent_pending_forms`

存储 AI 助手等待用户填写的表单。

| 字段          | 类型 | 约束                                              | 说明         |
| ------------- | ---- | ------------------------------------------------- | ------------ |
| `session_id`  | TEXT | PRIMARY KEY                                       | 会话 ID      |
| `form_id`     | TEXT | NOT NULL                                          | 表单 ID      |
| `tool_name`   | TEXT | NOT NULL                                          | 工具名称     |
| `form_json`   | TEXT | NOT NULL                                          | 表单定义 JSON |
| `created_at`  | TEXT | NOT NULL                                          | 创建时间     |

**外键**：`session_id` → `agent_sessions(id)` ON DELETE CASCADE

---

### 2.31 AI 助手角色配置表 `agent_role_config`

存储用户对 AI 助手的个性化角色配置。

| 字段                 | 类型 | 约束                       | 说明               |
| -------------------- | ---- | -------------------------- | ------------------ |
| `id`                 | TEXT | PRIMARY KEY                | 配置 ID            |
| `user_id`            | TEXT | NOT NULL, UNIQUE, FK → users.id | 用户 ID       |
| `agent_name`         | TEXT | NOT NULL, DEFAULT '小听'   | 助手名称           |
| `user_title`         | TEXT | NOT NULL, DEFAULT '老板'   | 用户称呼           |
| `greeting`           | TEXT | DEFAULT ''                 | 问候语             |
| `tone_style`         | TEXT | DEFAULT 'professional'     | 语气风格           |
| `custom_instructions` | TEXT | DEFAULT ''                | 自定义指令         |
| `updated_at`         | TEXT | NOT NULL                   | 更新时间           |
| `created_at`         | TEXT | NOT NULL                   | 创建时间           |

**外键**：`user_id` → `users(id)` ON DELETE CASCADE

---

### 2.32 搜索导出缓存表 `search_export_cache`

存储搜索结果导出的临时文件缓存。

| 字段          | 类型    | 约束                       | 说明               |
| ------------- | ------- | -------------------------- | ------------------ |
| `id`          | TEXT    | PRIMARY KEY                | 缓存 ID            |
| `user_id`     | TEXT    | NOT NULL, FK → users.id    | 用户 ID            |
| `filename`    | TEXT    | NOT NULL                   | 导出文件名         |
| `sql`         | TEXT    | NOT NULL                   | 查询 SQL           |
| `row_count`   | INTEGER | DEFAULT 0                  | 数据行数           |
| `file_path`   | TEXT    | NOT NULL                   | 文件存储路径       |
| `expires_at`  | TEXT    | NOT NULL                   | 过期时间           |
| `created_at`  | TEXT    | NOT NULL                   | 创建时间           |

**外键**：`user_id` → `users(id)` ON DELETE CASCADE

**索引**：

- `idx_search_export_user`：按用户 ID
- `idx_search_export_expires`：按过期时间

---

### 2.33 AI 助手浮动窗配置表 `agent_float_config`

存储用户对 AI 助手浮动窗的个性化配置。

| 字段                 | 类型    | 约束                       | 说明                                      |
| -------------------- | ------- | -------------------------- | ----------------------------------------- |
| `id`                 | TEXT    | PRIMARY KEY                | 配置 ID                                   |
| `user_id`            | TEXT    | NOT NULL, UNIQUE, FK → users.id | 用户 ID                             |
| `enabled`            | INTEGER | DEFAULT 1                  | 是否启用浮动窗（1/0）                     |
| `model`              | TEXT    | DEFAULT 'deepseek'         | 使用的 AI 模型供应商标识                  |
| `model_name`         | TEXT    | DEFAULT ''                 | 模型显示名称                              |
| `fallback_model`     | TEXT    | DEFAULT ''                 | 降级模型供应商标识                        |
| `fallback_model_name` | TEXT   | DEFAULT ''                 | 降级模型显示名称                          |
| `position`           | TEXT    | DEFAULT 'right'            | 浮动窗位置：`left` / `right`              |
| `drawer_width`       | INTEGER | DEFAULT 400                | 抽屉宽度（px）                            |
| `theme_color`        | TEXT    | DEFAULT ''                 | 主题色（空则跟随系统）                    |
| `show_pulse`         | INTEGER | DEFAULT 1                  | 是否显示脉冲动画（1/0）                   |
| `enabled_pages`      | TEXT    | DEFAULT '[]'               | 启用浮动窗的页面列表 JSON                 |
| `max_rounds`         | INTEGER | DEFAULT 10                 | 最大对话轮次                              |
| `fill_strategy`      | TEXT    | DEFAULT 'overwrite'        | 填充策略：`overwrite` / `append`          |
| `context_mode`       | TEXT    | DEFAULT 'page'             | 上下文模式：`page` / `global`             |
| `updated_at`         | TEXT    | NOT NULL                   | 更新时间                                  |
| `created_at`         | TEXT    | NOT NULL                   | 创建时间                                  |

**外键**：`user_id` → `users(id)` ON DELETE CASCADE

**`enabled_pages` 结构**：

```json
["/formulas", "/materials", "/ai"]
```

**业务含义**：

- `enabled`：控制浮动窗是否在页面上显示
- `model` / `fallback_model`：指定 AI 助手使用的模型，支持降级
- `position` / `drawer_width`：控制浮动窗的布局位置和宽度
- `enabled_pages`：限定浮动窗仅在指定路由页面显示，空数组表示全部页面
- `fill_strategy`：AI 助手填充表单时的策略，`overwrite` 覆盖已有值，`append` 追加
- `context_mode`：`page` 仅携带当前页面上下文，`global` 携带全局业务上下文

---

### 2.34 AI 供应商熔断状态表 `agent_provider_health`

存储 AI 供应商的熔断器状态，用于实现服务降级和自动恢复。

| 字段                  | 类型    | 约束   | 说明                               |
| --------------------- | ------- | ------ | ---------------------------------- |
| `provider`            | TEXT    | PRIMARY KEY | 供应商标识                   |
| `consecutive_failures` | INTEGER | DEFAULT 0 | 连续失败次数                    |
| `circuit_open`        | INTEGER | DEFAULT 0 | 熔断器是否开启（1/0）             |
| `circuit_open_until`  | TEXT    | DEFAULT NULL | 熔断恢复时间                  |
| `last_error`          | TEXT    | DEFAULT NULL | 最近一次错误信息              |
| `last_failure_at`     | TEXT    | DEFAULT NULL | 最近一次失败时间              |
| `last_success_at`     | TEXT    | DEFAULT NULL | 最近一次成功时间              |
| `updated_at`          | TEXT    | NOT NULL | 更新时间                         |

**索引**：`idx_agent_provider_health_circuit`：按熔断状态+恢复时间（复合：circuit_open, circuit_open_until）

**业务含义**：

- `consecutive_failures`：连续调用失败计数，达到阈值触发熔断
- `circuit_open`：熔断器开启后，该供应商的请求将被自动跳过
- `circuit_open_until`：熔断恢复时间，到达后自动尝试半开状态
- `last_success_at` / `last_failure_at`：用于监控面板展示供应商健康趋势

---

### 2.35 会话清理日志表 `agent_session_cleanup_log`

存储 AI 助手会话定期清理的执行记录。

| 字段                  | 类型    | 约束   | 说明                   |
| --------------------- | ------- | ------ | ---------------------- |
| `id`                  | INTEGER | PRIMARY KEY AUTOINCREMENT | 自增主键      |
| `cleaned_sessions`    | INTEGER | DEFAULT 0 | 清理的会话数量       |
| `cleaned_messages`    | INTEGER | DEFAULT 0 | 清理的消息数量       |
| `cleaned_confirmations` | INTEGER | DEFAULT 0 | 清理的待确认数量   |
| `cleaned_forms`       | INTEGER | DEFAULT 0 | 清理的待填报数量     |
| `created_at`          | TEXT    | NOT NULL | 清理执行时间          |

**索引**：`idx_agent_cleanup_log_created`：按执行时间降序（created_at DESC）

**业务含义**：

- 使用 `AUTOINCREMENT` 自增主键（非 UUID），因为该表为系统自动写入的日志
- 每次清理任务执行后插入一条记录，记录本次清理的各类型数据量
- 用于监控清理任务的执行频率和效果

---

### 2.36 AI 提示词模板表 `ai_prompt_templates`

存储 AI 功能的提示词模板，支持按模块和类型管理。

| 字段                   | 类型    | 约束                         | 说明                                      |
| ---------------------- | ------- | ---------------------------- | ----------------------------------------- |
| `id`                   | TEXT    | PRIMARY KEY                  | 模板 ID                                   |
| `module`               | TEXT    | NOT NULL                     | 所属模块（如 `smart-generate`）           |
| `name`                 | TEXT    | NOT NULL                     | 模板名称                                  |
| `type`                 | TEXT    | NOT NULL, DEFAULT 'description' | 模板类型：`description` / `preparation` / `version_reason` / `revision` |
| `system_prompt`        | TEXT    | NOT NULL, DEFAULT ''         | 系统提示词                                |
| `user_prompt_template` | TEXT    | NOT NULL, DEFAULT ''         | 用户提示词模板（支持变量插值）            |
| `variables`            | TEXT    | DEFAULT '[]'                 | 模板变量列表 JSON                         |
| `is_default`           | INTEGER | NOT NULL, DEFAULT 0          | 是否为默认模板（1/0）                     |
| `enabled`              | INTEGER | NOT NULL, DEFAULT 1          | 是否启用（1/0）                           |
| `sort_order`           | INTEGER | NOT NULL, DEFAULT 0          | 排序序号                                  |
| `created_by`           | TEXT    | DEFAULT NULL                 | 创建人                                    |
| `created_at`           | TEXT    | NOT NULL                     | 创建时间                                  |
| `updated_at`           | TEXT    | NOT NULL                     | 更新时间                                  |

**索引**：

- `idx_ai_prompt_module`：按模块
- `idx_ai_prompt_type`：按模块+类型（复合：module, type）

**`variables` 结构**：

```json
["formulaName", "materials", "finishedWeight"]
```

**`user_prompt_template` 变量插值示例**：

```
配方名称：{{formulaName}}
原料：{{materials}}
成品重量：{{finishedWeight}}g

请根据配方名称和原料信息，生成专业的配方描述。
```

**业务含义**：

- `module`：标识模板所属功能模块，如 `smart-generate`（智能生成）
- `type`：同一模块下按类型细分，如 `description`（描述）、`preparation`（制法）、`version_reason`（升版原因）、`revision`（修订）
- `is_default`：每个模块+类型组合下只能有一个默认模板
- `variables`：声明模板中使用的变量名，前端据此渲染表单
- 系统预置 4 个默认模板（描述、制法、升版原因、修订），通过 `seedDefaultPromptTemplates` 初始化

---

### 2.37 配方版本审核日志表 `formula_review_logs`

存储配方版本的审核流程记录。

| 字段              | 类型 | 约束                                                     | 说明                                      |
| ----------------- | ---- | -------------------------------------------------------- | ----------------------------------------- |
| `review_log_id`   | TEXT | PRIMARY KEY                                              | 审核日志 ID                               |
| `version_id`      | TEXT | NOT NULL, FK → formula_versions.version_id ON DELETE CASCADE | 配方版本 ID                        |
| `reviewer_id`     | TEXT | NOT NULL, FK → users.id ON DELETE SET NULL               | 审核人 ID                                 |
| `reviewer_name`   | TEXT | DEFAULT NULL                                             | 审核人名称（冗余）                        |
| `action`          | TEXT | NOT NULL                                                 | 操作：`submit` / `approve` / `reject`     |
| `comment`         | TEXT | DEFAULT NULL                                             | 审核意见                                  |
| `created_at`      | TEXT | NOT NULL                                                 | 操作时间                                  |

**外键**：

- `version_id` → `formula_versions(version_id)` ON DELETE CASCADE
- `reviewer_id` → `users(id)` ON DELETE SET NULL

**索引**：

- `idx_frl_version`：按版本 ID
- `idx_frl_reviewer`：按审核人 ID
- `idx_frl_action`：按操作类型

**业务含义**：

- `submit`：配方师提交版本审核，版本状态变为 `pending_review`
- `approve`：管理员审核通过，版本状态变为 `published`
- `reject`：管理员审核驳回，版本状态回退为 `draft`
- `reviewer_name`：冗余存储审核人名称，避免用户删除后无法查看历史审核记录

---

### 2.38 原料审核日志表 `material_review_logs`

存储原料的审核流程记录。

| 字段              | 类型 | 约束                                                     | 说明                                            |
| ----------------- | ---- | -------------------------------------------------------- | ----------------------------------------------- |
| `review_log_id`   | TEXT | PRIMARY KEY                                              | 审核日志 ID                                     |
| `material_id`     | TEXT | NOT NULL, FK → materials.id ON DELETE CASCADE            | 原料 ID                                         |
| `reviewer_id`     | TEXT | NOT NULL, FK → users.id ON DELETE SET NULL               | 审核人 ID                                       |
| `reviewer_name`   | TEXT | DEFAULT NULL                                             | 审核人名称（冗余）                              |
| `action`          | TEXT | NOT NULL                                                 | 操作：`submit` / `approve` / `reject` / `publish` |
| `comment`         | TEXT | DEFAULT NULL                                             | 审核意见                                        |
| `created_at`      | TEXT | NOT NULL                                                 | 操作时间                                        |

**外键**：

- `material_id` → `materials(id)` ON DELETE CASCADE
- `reviewer_id` → `users(id)` ON DELETE SET NULL

**索引**：

- `idx_mrl_material`：按原料 ID
- `idx_mrl_reviewer`：按审核人 ID
- `idx_mrl_action`：按操作类型
- `idx_mrl_created_at`：按操作时间

**业务含义**：

- `submit`：配方师提交原料审核，原料状态变为 `pending_review`
- `approve`：管理员审核通过
- `reject`：管理员审核驳回，原料状态回退为 `draft`
- `publish`：直接发布（管理员操作），原料状态变为 `published`
- 与 `formula_review_logs` 结构类似，但 `action` 多一个 `publish` 选项

---

### 2.39 解析结果缓存表 `parse_results`

存储 AI 文件解析的结果缓存，支持去重和关联追踪。

| 字段                | 类型    | 约束   | 说明                                      |
| ------------------- | ------- | ------ | ----------------------------------------- |
| `id`                | TEXT    | PRIMARY KEY | 解析结果 ID                         |
| `user_id`           | TEXT    | NOT NULL | 用户 ID                                  |
| `call_type`         | TEXT    | NOT NULL | 调用类型（如 `formula` / `nutrition`）    |
| `file_hash`         | TEXT    | NOT NULL | 文件哈希值（用于去重缓存）               |
| `file_name`         | TEXT    | NOT NULL | 原始文件名                               |
| `file_size`         | INTEGER | NOT NULL | 文件大小（字节）                         |
| `parsed_result`     | TEXT    | NOT NULL | 解析结果 JSON                            |
| `raw_response`      | TEXT    | NOT NULL | AI 原始响应                              |
| `model_provider`    | TEXT    | DEFAULT NULL | 使用的 AI 供应商标识                |
| `model_name`        | TEXT    | DEFAULT NULL | 使用的 AI 模型名称                  |
| `tokens_used`       | INTEGER | NOT NULL, DEFAULT 0 | 消耗的 token 总数               |
| `prompt_tokens`     | INTEGER | NOT NULL, DEFAULT 0 | Prompt token 数                 |
| `completion_tokens` | INTEGER | NOT NULL, DEFAULT 0 | Completion token 数             |
| `status`            | TEXT    | NOT NULL, DEFAULT 'pending' | 状态：`pending` / `success` / `failed` |
| `error_message`     | TEXT    | DEFAULT NULL | 错误信息                             |
| `used_count`        | INTEGER | NOT NULL, DEFAULT 0 | 被引用次数                        |
| `is_linked`         | INTEGER | NOT NULL, DEFAULT 0 | 是否已关联业务对象（1/0）        |
| `linked_formula_id` | TEXT    | DEFAULT NULL | 关联的配方 ID                        |
| `linked_material_id` | TEXT   | DEFAULT NULL | 关联的原料 ID                       |
| `expires_at`        | TEXT    | NOT NULL | 过期时间                                |
| `created_at`        | TEXT    | NOT NULL | 创建时间                                |
| `updated_at`        | TEXT    | NOT NULL | 更新时间                                |

**索引**：

- `idx_parse_results_user_id`：按用户 ID
- `idx_parse_results_file_hash`：按文件哈希
- `idx_parse_results_call_type`：按调用类型
- `idx_parse_results_status`：按状态
- `idx_parse_results_created_at`：按创建时间
- `idx_parse_results_expires_at`：按过期时间

**业务含义**：

- `file_hash`：相同文件重复上传时命中缓存，避免重复调用 AI 解析
- `used_count`：记录该解析结果被引用的次数，用于热度排序
- `is_linked` / `linked_formula_id` / `linked_material_id`：追踪解析结果是否已转化为业务数据
- `expires_at`：过期时间，由 `parse_result_configs.storage_limit` 控制自动清理
- 配方创建时，`formulas.parse_result_id` 指向该表 `id`，原料同理

---

### 2.40 解析结果配置表 `parse_result_configs`

存储解析结果缓存的全局配置参数。

| 字段           | 类型 | 约束                | 说明               |
| -------------- | ---- | ------------------- | ------------------ |
| `id`           | TEXT | PRIMARY KEY         | 配置 ID            |
| `config_key`   | TEXT | NOT NULL, UNIQUE    | 配置键名           |
| `config_value` | TEXT | NOT NULL            | 配置值（JSON 序列化） |
| `description`  | TEXT | DEFAULT NULL        | 配置说明           |
| `updated_at`   | TEXT | NOT NULL            | 更新时间           |

**默认配置**：

| config_key                | 默认值    | 说明                        |
| ------------------------- | --------- | --------------------------- |
| `storage_limit`           | 5000      | 最大解析结果数量            |
| `cleanup_threshold_percent` | 95      | 触发自动清理的阈值（百分比） |
| `cleanup_batch_percent`   | 5         | 每次清理的比例（百分比）    |
| `retention_days`          | 30        | 保留天数（预留字段）        |
| `max_file_size_bytes`     | 5242880   | 可缓存文件大小上限（5MB）   |
| `file_retention_days`     | 90        | 原文件保留天数              |
| `file_storage_limit_bytes` | 10737418240 | 文件存储空间上限（10GB） |
| `file_storage_alert_percent` | 80     | 磁盘使用率告警阈值（百分比） |

**业务含义**：

- `config_value` 以 JSON 序列化存储（如 `5000` 存为 `"5000"`）
- 管理员可通过 API 修改配置值，无需重启服务
- 清理服务定期检查 `storage_limit` 和 `cleanup_threshold_percent`，超限后按 `cleanup_batch_percent` 清理最旧记录

---

### 2.41 解析模板表 `parse_templates`

存储文件解析的模板配置，支持自定义解析策略。

| 字段               | 类型    | 约束                                                    | 说明                                            |
| ------------------ | ------- | ------------------------------------------------------- | ----------------------------------------------- |
| `id`               | TEXT    | PRIMARY KEY                                              | 模板 ID                                         |
| `name`             | TEXT    | NOT NULL                                                 | 模板名称                                        |
| `category`         | TEXT    | NOT NULL, DEFAULT 'nutrition'                            | 分类：`formula` / `nutrition` / `general`        |
| `default_provider` | TEXT    | DEFAULT NULL                                             | 默认 AI 供应商标识                              |
| `default_model`    | TEXT    | DEFAULT NULL                                             | 默认 AI 模型名称                                |
| `custom_prompt`    | TEXT    | DEFAULT NULL                                             | 自定义提示词                                    |
| `field_mapping`    | TEXT    | DEFAULT '{}'                                             | 字段映射 JSON                                   |
| `validation_rules` | TEXT    | DEFAULT '{}'                                             | 校验规则 JSON                                   |
| `is_preset`        | INTEGER | NOT NULL, DEFAULT 0                                      | 是否为系统预置（1/0）                           |
| `is_active`        | INTEGER | NOT NULL, DEFAULT 1                                      | 是否启用（1/0）                                 |
| `created_by`       | TEXT    | NOT NULL                                                 | 创建人                                          |
| `created_at`       | TEXT    | NOT NULL                                                 | 创建时间                                        |
| `updated_at`       | TEXT    | NOT NULL                                                 | 更新时间                                        |

**索引**：

- `idx_pt_category`：按分类
- `idx_pt_created_by`：按创建人

**`field_mapping` 结构**：

```json
{
  "原料名称": "name",
  "单价(元/kg)": "unitPrice",
  "类型": "materialType"
}
```

**`validation_rules` 结构**：

```json
{
  "name": { "required": true },
  "unitPrice": { "type": "number", "min": 0 }
}
```

**业务含义**：

- `category`：按业务场景分类，不同分类使用不同的解析策略
- `is_preset`：系统预置模板不可删除，用户可基于预置模板创建自定义模板
- `field_mapping`：将 AI 解析出的字段映射到系统内部字段名
- `validation_rules`：解析结果的校验规则，不满足规则的字段将被标记为低置信度

---

### 2.42 含量比阈值配置表 `ratio_threshold_configs`

存储含量比（ratio_factor）的偏差阈值配置，用于营养分析预警。

| 字段                 | 类型 | 约束       | 说明                     |
| -------------------- | ---- | ---------- | ------------------------ |
| `id`                 | TEXT | PRIMARY KEY | 配置 ID                 |
| `normal_low`         | REAL | NOT NULL, DEFAULT 0.98 | 正常范围下限（0.98） |
| `normal_high`        | REAL | NOT NULL, DEFAULT 1.02 | 正常范围上限（1.02） |
| `warning_low`        | REAL | NOT NULL, DEFAULT 0.95 | 预警范围下限（0.95） |
| `warning_high`       | REAL | NOT NULL, DEFAULT 1.05 | 预警范围上限（1.05） |
| `high_warning_low`   | REAL | NOT NULL, DEFAULT 0.92 | 高预警下限（0.92）   |
| `high_warning_high`  | REAL | NOT NULL, DEFAULT 1.08 | 高预警上限（1.08）   |
| `updated_at`         | TEXT | NOT NULL   | 更新时间                 |
| `updated_by`         | TEXT | DEFAULT NULL | 更新人               |

**业务含义**：

- 含量比 = 实际含量比 / 设定含量比系数（ratio_factor）
- 含量比在 `normal_low` ~ `normal_high` 之间：正常（绿色）
- 含量比在 `warning_low` ~ `warning_high` 之间但超出正常范围：预警（黄色）
- 含量比超出 `high_warning_low` ~ `high_warning_high`：高预警（红色）
- 通常全局仅一条配置记录，管理员可调整阈值

---

### 2.43 枚举选项表 `enum_options`

存储原料枚举字段的可选值，支持性状/口感/功效三类分类。

| 字段         | 类型    | 约束                                          | 说明                                         |
| ------------ | ------- | --------------------------------------------- | -------------------------------------------- |
| `id`         | TEXT    | PRIMARY KEY                                   | 选项 ID                                      |
| `category`   | TEXT    | NOT NULL, CHECK IN ('appearance','taste','efficacy') | 分类：`appearance`（性状）/ `taste`（口感）/ `efficacy`（功效） |
| `label`      | TEXT    | NOT NULL                                      | 显示标签                                     |
| `value`      | TEXT    | NOT NULL                                      | 存储值                                       |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0                           | 排序序号                                     |
| `is_active`  | INTEGER | NOT NULL, DEFAULT 1                           | 是否启用（1/0）                              |
| `created_at` | TEXT    | NOT NULL                                      | 创建时间                                     |
| `updated_at` | TEXT    | NOT NULL                                      | 更新时间                                     |

**唯一约束**：`UNIQUE(category, value)` — 同一分类下存储值不可重复

**索引**：

- `idx_enum_category`：按分类
- `idx_enum_category_active`：按分类+启用状态（复合：category, is_active）

**业务含义**：

- `category`：三类枚举分类，`appearance` 对应原料外观/性状，`taste` 对应性味/口感，`efficacy` 对应功效
- `label`：前端展示的中文标签，如"粉末"、"甘"、"清热"
- `value`：存储在 `materials` 表 `appearance_json`/`taste_json`/`efficacy_json` 中的值
- `is_active`：禁用后该选项不再出现在前端筛选器中，但已使用该值的原料不受影响
- 增删改操作仅管理员可执行（`requirePermission("admin")`）

---

### 2.43.1 枚举互斥规则表 `enum_exclusions`

存储枚举选项之间的互斥规则，用于原料筛选时提示互斥组合。

| 字段         | 类型 | 约束                       | 说明                          |
| ------------ | ---- | -------------------------- | ----------------------------- |
| `id`         | TEXT | PRIMARY KEY                | 规则 ID                       |
| `category`   | TEXT | NOT NULL                   | 分类：`appearance` / `taste`  |
| `value_a`    | TEXT | NOT NULL                   | 选项 A                        |
| `value_b`    | TEXT | NOT NULL                   | 选项 B                        |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间            |

**唯一约束**：`UNIQUE(category, value_a, value_b)`

**业务含义**：

- 同一分类下 `value_a` 和 `value_b` 的组合不可重复
- 在原料筛选时，如果同时选择了互斥的两个选项，系统会提示用户
- 增删操作仅管理员可执行

---

### 2.44 配方模板表 `formula_templates`

存储配方模板，用于快速创建配方。

| 字段                      | 类型    | 约束                       | 说明                        |
| ------------------------- | ------- | -------------------------- | --------------------------- |
| `id`                      | TEXT    | PRIMARY KEY                | 模板 ID                     |
| `name`                    | TEXT    | NOT NULL                   | 模板名称                    |
| `description`             | TEXT    | DEFAULT NULL               | 描述                        |
| `ratio_factor`            | REAL    | NOT NULL, DEFAULT 0.18     | 主料含量比系数（0.15-0.25） |
| `supplement_ratio_factor` | REAL    | NOT NULL, DEFAULT 1.0      | 辅料含量比系数（0.5-1.5）   |
| `finished_weight`         | REAL    | NOT NULL, DEFAULT 0        | 成品重量                    |
| `materials_json`          | TEXT    | NOT NULL                   | 原料列表 JSON               |
| `packaging_price`         | REAL    | NOT NULL, DEFAULT 0        | 包装价格（元）              |
| `other_price`             | REAL    | NOT NULL, DEFAULT 0        | 其他价格（元）              |
| `profit_margin`           | REAL    | NOT NULL, DEFAULT 20       | 利润率（%）                 |
| `created_by`              | TEXT    | NOT NULL                   | 创建人                      |
| `created_at`              | TEXT    | NOT NULL                   | 创建时间                    |
| `updated_at`              | TEXT    | NOT NULL                   | 更新时间                    |

**索引**：

- `idx_template_name`：按模板名称
- `idx_template_created_by`：按创建人

**`materials_json` 结构**：

同 `formulas.materials_json`，格式为 `[{ materialId, materialName, quantity, adjustedPrice? }]`

**业务含义**：

- `name`：模板名称，同一用户下不可重复
- `materials_json`：预设的原料列表，创建配方时可直接复用
- admin 可见全部模板，formulist 仅可见自己创建的模板
- 系统预设模板不可删除

---

### 2.45 快速配方表 `quick_formulas`

存储快速配方草稿，用于高效创建配方。发布后状态变更为 `published`，同时生成正式配方记录。

| 字段                      | 类型    | 约束                                   | 说明                        |
| ------------------------- | ------- | -------------------------------------- | --------------------------- |
| `id`                      | TEXT    | PRIMARY KEY                            | 快速配方 ID                 |
| `name`                    | TEXT    | NOT NULL                               | 配方名称                    |
| `status`                  | TEXT    | NOT NULL, DEFAULT 'draft'              | 状态：`draft` / `published` |
| `ratio_factor`            | REAL    | NOT NULL, DEFAULT 0.18                 | 主料含量比系数（0.15-0.25） |
| `supplement_ratio_factor` | REAL    | NOT NULL, DEFAULT 1.0                  | 辅料含量比系数（0.5-1.5）   |
| `finished_weight`         | REAL    | NOT NULL, DEFAULT 0                    | 成品重量                    |
| `materials_json`          | TEXT    | NOT NULL, DEFAULT '[]'                 | 原料列表 JSON               |
| `packaging_price`         | REAL    | NOT NULL, DEFAULT 0                    | 包装价格（元）              |
| `other_price`             | REAL    | NOT NULL, DEFAULT 0                    | 其他价格（元）              |
| `profit_margin`           | REAL    | NOT NULL, DEFAULT 20                   | 利润率（%）                 |
| `description`             | TEXT    | DEFAULT NULL                           | 描述                        |
| `preparation_method`      | TEXT    | DEFAULT NULL                           | 制法                        |
| `salesman_id`             | TEXT    | DEFAULT NULL                           | 业务员 ID                   |
| `salesman_name`           | TEXT    | DEFAULT NULL                           | 业务员名称                  |
| `created_by`              | TEXT    | NOT NULL                               | 创建人                      |
| `created_at`              | TEXT    | NOT NULL                               | 创建时间                    |
| `updated_at`              | TEXT    | NOT NULL                               | 更新时间                    |

**索引**：

- `idx_qf_name`：按配方名称
- `idx_qf_status`：按状态
- `idx_qf_created_by`：按创建人
- `idx_qf_name_user`：按名称+创建人（UNIQUE）

**`materials_json` 结构**：

同 `formulas.materials_json`，格式为 `[{ materialId, materialName, quantity, adjustedPrice? }]`

**业务含义**：

- `name`：配方名称，同一用户下不可重复（UNIQUE INDEX `idx_qf_name_user`）
- `status`：`draft` 可编辑/删除/发布，`published` 不可再修改
- `materials_json`：原料列表，发布时原样写入 `formulas.materials_json`
- 发布流程：快速配方 → 生成配方编码 → INSERT `formulas` + `formula_versions` → UPDATE `quick_formulas` SET status = 'published'
- admin 可见全部快速配方，formulist 仅可见自己创建的

---

### 2.46 角色表 `roles`

存储系统角色定义。

| 字段          | 类型 | 约束                       | 说明                    |
| ------------- | ---- | -------------------------- | ----------------------- |
| `id`          | TEXT | PRIMARY KEY                | 角色 ID                 |
| `name`        | TEXT | NOT NULL                   | 角色名称                |
| `role_key`    | TEXT | NOT NULL, UNIQUE           | 角色标识（如 admin/formulist） |
| `description` | TEXT | DEFAULT NULL               | 描述                    |
| `is_system`   | INTEGER | NOT NULL, DEFAULT 0     | 是否系统角色（1/0）     |
| `created_at`  | TEXT | NOT NULL                   | 创建时间                |
| `updated_at`  | TEXT | NOT NULL                   | 更新时间                |

**索引**：

- `idx_roles_key`：按角色标识（UNIQUE）

**业务含义**：

- `is_system`：系统角色不可删除，保护 admin 和 formulist 等基础角色
- 角色标识 `role_key` 全局唯一

---

### 2.47 权限表 `permissions`

存储系统权限定义。

| 字段            | 类型 | 约束                       | 说明           |
| --------------- | ---- | -------------------------- | -------------- |
| `id`            | TEXT | PRIMARY KEY                | 权限 ID        |
| `module`        | TEXT | NOT NULL                   | 所属模块       |
| `action`        | TEXT | NOT NULL                   | 操作类型       |
| `permission_key` | TEXT | NOT NULL, UNIQUE         | 权限标识       |
| `label`         | TEXT | NOT NULL                   | 显示名称       |
| `description`   | TEXT | DEFAULT NULL               | 描述           |
| `sort_order`    | INTEGER | NOT NULL, DEFAULT 0     | 排序序号       |
| `created_at`    | TEXT | NOT NULL                   | 创建时间       |
| `updated_at`    | TEXT | NOT NULL                   | 更新时间       |

**索引**：

- `idx_permissions_key`：按权限标识（UNIQUE）

---

### 2.48 角色权限关联表 `role_permissions`

存储角色与权限的多对多关联关系。

| 字段            | 类型 | 约束                       | 说明           |
| --------------- | ---- | -------------------------- | -------------- |
| `id`            | TEXT | PRIMARY KEY                | 关联 ID        |
| `role_id`       | TEXT | NOT NULL, FOREIGN KEY      | 角色 ID        |
| `permission_id` | TEXT | NOT NULL, FOREIGN KEY      | 权限 ID        |
| `created_at`    | TEXT | NOT NULL                   | 创建时间       |

**外键**：

- `role_id` → `roles(id)` ON DELETE CASCADE
- `permission_id` → `permissions(id)` ON DELETE CASCADE

**唯一约束**：`UNIQUE(role_id, permission_id)`

---

## 三、ER 关系图（文字描述）

```
users
  ├── 1:N → materials (created_by)
  ├── 1:N → formulas (created_by)
  ├── 1:N → salesmen (created_by)
  ├── 1:N → formula_versions (created_by)
  ├── 1:N → export_templates (created_by)
  ├── 1:N → export_jobs (created_by)
  ├── 1:N → api_data_interfaces (created_by)
  ├── 1:N → share_configs (created_by)
  ├── 1:N → formula_nutrition_summaries (calculated_by)
  ├── 1:N → nutrition_analysis_reports (generated_by)
  ├── 1:N → reports (created_by)
  ├── 1:N → report_targets (created_by)
  ├── 1:N → uploaded_files (uploaded_by)
  ├── 1:N → agent_sessions (user_id)
  ├── 1:1 → agent_role_config (user_id)
  ├── 1:1 → agent_float_config (user_id)
  ├── 1:N → search_export_cache (user_id)
  ├── 1:N → formula_review_logs (reviewer_id) ON DELETE SET NULL
  └── 1:N → material_review_logs (reviewer_id) ON DELETE SET NULL

materials
  ├── 1:N → material_nutrition (material_id) ON DELETE CASCADE
  ├── 1:N → material_review_logs (material_id) ON DELETE CASCADE
  ├── 自引用 → materials (previous_version_id) 版本链
  ├── N:1 → parse_results (parse_result_id) 关联解析来源
  ├── 被引用 → formulas.materials_json (JSON 内 materialId)
  └── 被引用 → enum_options (appearance_json/taste_json/efficacy_json 中的 value)

formulas
  ├── N:1 → salesmen (salesman_id)
  ├── 1:N → formula_sales (formula_id)
  ├── 1:N → formula_versions (formula_id)
  ├── 1:N → export_jobs (formula_id)
  ├── 1:N → formula_nutrition_summaries (formula_id)
  ├── 1:N → share_configs (formula_id)
  ├── 1:N → nutrition_analysis_reports (formula_id)
  ├── N:1 → parse_results (parse_result_id) 关联解析来源
  └── 被引用 → parse_results.linked_formula_id

formula_versions
  ├── 1:1 → formula_nutrition_summaries (version_id, UNIQUE)
  └── 1:N → formula_review_logs (version_id) ON DELETE CASCADE

formula_sales
  ├── N:1 → formulas (formula_id) ON DELETE CASCADE
  └── N:1 → salesmen (salesman_id) ON DELETE RESTRICT

formula_nutrition_summaries
  └── 1:N → nutrition_analysis_reports (summary_id)

nutrition_profiles
  └── (独立表，被合规检查引用)

uploaded_files
  ├── 1:N → file_audit_log (file_id) ON DELETE CASCADE
  ├── 1:N → file_relations (file_id) ON DELETE CASCADE
  └── 被引用 → file_relations.related_id (按 related_type 关联 formula/material)

ai_models
  ├── 1:1 → ai_alert_configs (model_id) ON DELETE CASCADE
  ├── 1:N → ai_fallback_configs (model_id) ON DELETE CASCADE
  └── 被引用 → ai_usage_logs (provider), ai_alert_records (provider), ai_health_records (provider)

agent_sessions
  ├── 1:N → agent_messages (session_id) ON DELETE CASCADE
  ├── 1:1 → agent_pending_confirmations (session_id) ON DELETE CASCADE
  └── 1:1 → agent_pending_forms (session_id) ON DELETE CASCADE

parse_results
  ├── N:1 → users (user_id)
  ├── 被引用 → formulas (parse_result_id)
  ├── 被引用 → materials (parse_result_id)
  └── 被引用 → parse_results.linked_formula_id / linked_material_id

roles
  ├── 1:N → role_permissions (role_id) ON DELETE CASCADE
  └── 1:N → users (role_id) 关联角色

permissions
  └── 1:N → role_permissions (permission_id) ON DELETE CASCADE

role_permissions
  ├── N:1 → roles (role_id) ON DELETE CASCADE
  └── N:1 → permissions (permission_id) ON DELETE CASCADE

enum_exclusions
  └── (独立表，存储枚举互斥规则)

parse_result_configs
  └── (独立配置表，被清理服务和监控服务引用)

parse_templates
  └── N:1 → users (created_by)

agent_provider_health
  └── (独立表，被 AI 助手熔断器引用)

agent_session_cleanup_log
  └── (独立日志表，无外键关联)

ratio_threshold_configs
  └── (独立配置表，被营养分析引擎引用)

enum_options
  └── (独立配置表，被 materials 的 appearance_json/taste_json/efficacy_json 引用)

formula_templates
  └── N:1 → users (created_by)

quick_formulas
  ├── N:1 → users (created_by)
  ├── N:1 → salesmen (salesman_id)
  └── 发布时生成 → formulas + formula_versions
```

---

## 四、数据量参考（种子数据）

| 表名                       | 种子数据量 | 说明                             |
| -------------------------- | ---------- | -------------------------------- |
| users                      | 30         | 含 1 个 admin，29 个普通用户     |
| materials                  | 30         | 食品行业常用原料                 |
| salesmen                   | 30         | 6 个部门，27 active + 3 inactive |
| formulas                   | 30         | 覆盖婴幼儿到特殊医学配方         |
| formula_sales              | 0          | 销量数据（运行时录入）           |
| formula_versions           | 30         | 每个配方 1 个版本                |
| formula_review_logs        | 0          | 审核日志（运行时生成）           |
| material_review_logs       | 0          | 审核日志（运行时生成）           |
| export_templates           | 30         | pdf/excel/api/print 各类型       |
| export_jobs                | 30         | 多种状态的任务记录               |
| nutrition_profiles         | 30         | 6 个分类的营养标准               |
| material_nutrition         | 30         | 每种原料对应营养数据             |
| reports                    | 0          | 报表数据（运行时生成）           |
| report_targets             | 0          | 目标数据（运行时录入）           |
| uploaded_files             | 0          | 上传文件（运行时录入）           |
| file_audit_log             | 0          | 审计日志（运行时生成）           |
| file_relations             | 0          | 文件关联（运行时生成）           |
| ai_models                  | 3          | dashscope, zhipu, deepseek       |
| ai_usage_logs              | 0          | 调用日志（运行时生成）           |
| ai_alert_configs           | 3          | 每个模型一条默认配置             |
| ai_alert_records           | 0          | 告警记录（运行时生成）           |
| ai_health_records          | 0          | 健康检查记录（运行时生成）       |
| ai_fallback_configs        | 0          | 降级配置（运行时配置）           |
| model_applications         | 0          | 模型应用配置（运行时配置）       |
| ai_prompt_templates        | 4          | 智能生成默认模板（描述/制法/升版原因/修订） |
| agent_sessions             | 0          | 会话数据（运行时生成）           |
| agent_messages             | 0          | 消息数据（运行时生成）           |
| agent_pending_confirmations | 0         | 待确认数据（运行时生成）         |
| agent_pending_forms        | 0          | 待填报表单（运行时生成）         |
| agent_role_config          | 0          | 角色配置（运行时配置）           |
| agent_float_config         | 0          | 浮动窗配置（运行时配置）         |
| agent_provider_health      | 0          | 熔断状态（运行时生成）           |
| agent_session_cleanup_log  | 0          | 清理日志（运行时生成）           |
| search_export_cache        | 0          | 导出缓存（运行时生成）           |
| parse_results              | 0          | 解析结果（运行时生成）           |
| parse_result_configs       | 8          | 默认配置项                       |
| parse_templates            | 0          | 解析模板（运行时配置）           |
| ratio_threshold_configs    | 0          | 含量比阈值（运行时配置）         |
| enum_options              | 0          | 枚举选项（运行时配置）           |
| formula_templates         | 0          | 配方模板（运行时配置）           |
| quick_formulas            | 0          | 快速配方（运行时创建）           |
| enum_exclusions           | 0          | 枚举互斥规则（运行时配置）       |
| roles                     | 2          | admin + formulist 角色           |
| permissions               | 8          | 基础权限项                       |
| role_permissions          | 8          | 角色权限关联                     |

---

## 五、数据库配置

### 双模式支持

| 环境     | 数据库                  | 配置                       |
| -------- | ----------------------- | -------------------------- |
| 开发环境 | SQLite (better-sqlite3) | `DB_TYPE=sqlite`，WAL 模式 |
| 生产环境 | 腾讯云 MySQL (CynosDB)  | `DB_TYPE=mysql`，连接池    |

### 通用配置

- **外键约束**：已启用（`PRAGMA foreign_keys = ON`）
- **ID 生成策略**：`Date.now().toString(36) + Math.random().toString(36)` (非 UUID)
- **时间格式**：ISO 8601 (`new Date().toISOString()`)
- **JSON 字段**：TEXT 类型，应用层解析
- **密码存储**：bcrypt (10 rounds)
- **默认端口**：3000
- **默认数据库路径**：`./data/tingstudio.db`
- **数据库适配器**：`database-adapter.ts` 支持 SQLite/MySQL 双模式切换

### CHECK 约束

| 表                       | 字段                    | 约束                                                              |
| ------------------------ | ----------------------- | ----------------------------------------------------------------- |
| users                    | role                    | IN ('admin', 'formulist')                                         |
| users                    | data_source             | IN ('manual', 'batch_import', 'api_sync')                         |
| materials                | material_type           | IN ('herb', 'supplement')                                         |
| materials                | status                  | IN ('draft', 'pending_review', 'published')                       |
| formulas                 | ratio_factor            | >= 0.15 AND <= 0.25                                               |
| formulas                 | supplement_ratio_factor | >= 0.5 AND <= 1.5                                                 |
| salesmen                 | status                  | IN ('active', 'inactive')                                         |
| formula_sales            | period_type             | IN ('monthly', 'quarterly', 'yearly')                             |
| formula_versions         | status                  | IN ('draft', 'pending_review', 'published', 'archived')           |
| formula_versions         | ratio_factor            | >= 0.15 AND <= 0.25                                               |
| formula_versions         | supplement_ratio_factor | >= 0.5 AND <= 1.5                                                 |
| formula_review_logs      | action                  | IN ('submit', 'approve', 'reject')                                |
| material_review_logs     | action                  | IN ('submit', 'approve', 'reject', 'publish')                     |
| export_templates         | type                    | IN ('pdf', 'excel', 'api', 'print')                               |
| export_jobs              | export_type             | IN ('pdf', 'excel', 'api')                                        |
| export_jobs              | status                  | IN ('pending', 'processing', 'completed', 'failed')               |
| api_data_interfaces      | method                  | IN ('GET', 'POST', 'PUT', 'DELETE')                               |
| api_data_interfaces      | authentication          | IN ('none', 'basic', 'apiKey', 'oauth')                           |
| api_data_interfaces      | data_format             | IN ('json', 'xml')                                                |
| share_configs            | share_type              | IN ('link', 'email', 'api')                                       |
| material_nutrition       | confidence              | IN ('high', 'medium', 'low')                                      |
| nutrition_profiles       | category                | IN ('infant', 'child', 'adult', 'elderly', 'pregnant', 'special') |
| reports                  | type                    | IN ('weekly', 'monthly')                                          |
| reports                  | status                  | IN ('draft', 'published', 'archived')                             |
| reports                  | generated_by            | IN ('auto', 'manual')                                             |
| report_targets           | period_type             | IN ('quarterly', 'yearly')                                        |
| uploaded_files           | file_type               | IN ('formula', 'material')                                        |
| uploaded_files           | status                  | IN ('uploaded', 'parsed', 'linked', 'orphaned', 'archived')       |
| uploaded_files           | related_type            | IS NULL OR IN ('formula', 'material')                             |
| file_audit_log           | action                  | IN ('upload', 'parse', 'link', 'unlink', 'reparse', 'download', 'delete', 'archive') |
| file_relations           | related_type            | IN ('formula', 'material')                                        |
| agent_messages           | role                    | IN ('user', 'assistant', 'system', 'tool')                        |
| parse_templates          | category                | IN ('formula', 'nutrition', 'general')                            |
| enum_options              | category              | IN ('appearance', 'taste', 'efficacy') |
| enum_exclusions           | category              | IN ('appearance', 'taste')            |
| quick_formulas            | status                | IN ('draft', 'published')              |
