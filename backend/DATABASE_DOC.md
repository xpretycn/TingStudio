# TingStudio 数据库设计文档

> 数据库：SQLite（better-sqlite3）/ 腾讯云 MySQL（CynosDB）
> SQLite 文件路径：`./data/tingstudio.db`
> 运行时初始化：`backend/src/config/database-better-sqlite3.ts`
> 参考脚本：`backend/src/scripts/init.sql`
> 最后更新：2026-05-13

---

## 一、数据库概览

系统共包含 **32 张表**，分为 11 个功能模块：

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
| 搜索导出       | 1      | search_export_cache                                                                                    |

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

存储配方所需的原料信息。

| 字段            | 类型 | 约束                       | 说明                                                   |
| --------------- | ---- | -------------------------- | ------------------------------------------------------ |
| `id`            | TEXT | PRIMARY KEY                | 原料唯一标识                                           |
| `name`          | TEXT | NOT NULL                   | 原料名称                                               |
| `code`          | TEXT | NOT NULL, UNIQUE           | 原料编码（如 MAT001）                                  |
| `unit`          | TEXT | NOT NULL, DEFAULT 'g'      | 计量单位                                               |
| `stock`         | REAL | NOT NULL, DEFAULT 0        | 库存数量                                               |
| `material_type` | TEXT | NOT NULL, DEFAULT 'herb'   | 原料类型：`herb`（中药材）/ `supplement`（营养补充剂） |
| `unit_price`    | REAL | DEFAULT NULL               | 单价（元/kg），可为空                                  |
| `data_source`   | TEXT | NOT NULL, DEFAULT 'manual' | 数据来源：`manual` / `batch_import` / `api_sync`       |
| `created_by`    | TEXT | NOT NULL                   | 创建人（用户 ID）                                      |
| `created_at`    | TEXT | NOT NULL                   | 创建时间                                               |
| `updated_at`    | TEXT | NOT NULL                   | 更新时间                                               |

**索引**：

- `idx_material_name`：按原料名称
- `idx_material_code`：按原料编码

**业务含义**：

- `unit_price`：原料库基价，用于配方成本计算；配方中可通过 `adjustedPrice` 覆盖
- `data_source`：标识数据录入方式，`batch_import` 表示 Excel 批量导入，`api_sync` 表示 API 同步

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
| `created_by`              | TEXT | NOT NULL                   | 创建人（用户 ID）           |
| `created_at`              | TEXT | NOT NULL                   | 创建时间                    |
| `updated_at`              | TEXT | NOT NULL                   | 更新时间                    |

**外键**：`salesman_id` → `salesmen(id)` ON DELETE RESTRICT

**索引**：

- `idx_formula_name`：按配方名称
- `idx_formula_code`：按配方编码
- `idx_formula_salesman_id`：按业务员 ID
- `idx_formula_created_by`：按创建人

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

| 字段                      | 类型    | 约束                       | 说明                                     |
| ------------------------- | ------- | -------------------------- | ---------------------------------------- |
| `version_id`              | TEXT    | PRIMARY KEY                | 版本 ID                                  |
| `formula_id`              | TEXT    | NOT NULL, FK → formulas.id | 配方 ID                                  |
| `version_number`          | TEXT    | NOT NULL                   | 版本号（如 v1.0）                        |
| `version_name`            | TEXT    | DEFAULT NULL               | 版本名称                                 |
| `version_reason`          | TEXT    | DEFAULT NULL               | 升版原因                                 |
| `changes_json`            | TEXT    | DEFAULT NULL               | 变更记录 JSON                            |
| `snapshot_json`           | TEXT    | NOT NULL                   | 完整配方快照 JSON                        |
| `status`                  | TEXT    | NOT NULL, DEFAULT 'draft'  | 状态：`draft` / `published` / `archived` |
| `is_current`              | INTEGER | NOT NULL, DEFAULT 0        | 是否为当前版本（1/0）                    |
| `ratio_factor`            | REAL    | NOT NULL, DEFAULT 0.18     | 主料含量比系数（0.15-0.25）              |
| `supplement_ratio_factor` | REAL    | NOT NULL, DEFAULT 1.0      | 辅料含量比系数（0.5-1.5）                |
| `created_by`              | TEXT    | NOT NULL                   | 创建人                                   |
| `created_at`              | TEXT    | NOT NULL                   | 创建时间                                 |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**索引**：

- `idx_fv_formula`：按配方
- `idx_fv_version_number`：按配方+版本号（复合）

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

存储每种原料的营养成分数据（每100g含量）。

| 字段            | 类型 | 约束                                | 说明                                  |
| --------------- | ---- | ----------------------------------- | ------------------------------------- |
| `nutrition_id`  | TEXT | PRIMARY KEY                         | 营养记录 ID                           |
| `material_id`   | TEXT | NOT NULL, UNIQUE, FK → materials.id | 原料 ID（一对一）                     |
| `per_100g_json` | TEXT | NOT NULL                            | 每100g营养成分 JSON                   |
| `data_version`  | TEXT | NOT NULL, DEFAULT '1.0'             | 数据版本号                            |
| `data_source`   | TEXT | DEFAULT NULL                        | 数据来源                              |
| `notes`         | TEXT | DEFAULT NULL                        | 备注                                  |
| `confidence`    | TEXT | DEFAULT 'medium'                    | 数据可信度：`high` / `medium` / `low` |
| `last_updated`  | TEXT | NOT NULL                            | 最后更新时间                          |

**外键**：`material_id` → `materials(id)` ON DELETE CASCADE

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

| 字段              | 类型    | 约束                | 说明                     |
| ----------------- | ------- | ------------------- | ------------------------ |
| `id`              | TEXT    | PRIMARY KEY         | 日志 ID                  |
| `provider`        | TEXT    | NOT NULL            | 供应商标识               |
| `model`           | TEXT    | NOT NULL            | 模型名称                 |
| `call_type`       | TEXT    | NOT NULL            | 调用类型                 |
| `prompt_tokens`   | INTEGER | NOT NULL, DEFAULT 0 | Prompt token 数          |
| `completion_tokens` | INTEGER | NOT NULL, DEFAULT 0 | Completion token 数    |
| `total_tokens`    | INTEGER | NOT NULL, DEFAULT 0 | 总 token 数              |
| `latency_ms`      | INTEGER | DEFAULT NULL        | 响应延迟（ms）           |
| `status`          | TEXT    | NOT NULL, DEFAULT 'success' | 调用状态          |
| `error_message`   | TEXT    | DEFAULT NULL        | 错误信息                 |
| `request_summary` | TEXT    | DEFAULT NULL        | 请求摘要                 |
| `fallback_from`   | TEXT    | DEFAULT NULL        | 降级来源供应商           |
| `user_id`         | TEXT    | DEFAULT NULL        | 调用用户 ID              |
| `created_at`      | TEXT    | NOT NULL            | 调用时间                 |

**索引**：

- `idx_ai_usage_provider_date`：按供应商+日期（复合：provider, created_at）
- `idx_ai_usage_call_type`：按调用类型
- `idx_ai_usage_user`：按用户+日期（复合：user_id, created_at）
- `idx_ai_usage_status`：按状态

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
  └── 1:N → search_export_cache (user_id)

materials
  ├── 1:1 → material_nutrition (material_id)
  └── 被引用 → formulas.materials_json (JSON 内 materialId)

formulas
  ├── N:1 → salesmen (salesman_id)
  ├── 1:N → formula_sales (formula_id)
  ├── 1:N → formula_versions (formula_id)
  ├── 1:N → export_jobs (formula_id)
  ├── 1:N → formula_nutrition_summaries (formula_id)
  ├── 1:N → share_configs (formula_id)
  └── 1:N → nutrition_analysis_reports (formula_id)

formula_sales
  ├── N:1 → formulas (formula_id) ON DELETE CASCADE
  └── N:1 → salesmen (salesman_id) ON DELETE RESTRICT

formula_versions
  └── 1:1 → formula_nutrition_summaries (version_id, UNIQUE)

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
| agent_sessions             | 0          | 会话数据（运行时生成）           |
| agent_messages             | 0          | 消息数据（运行时生成）           |
| agent_pending_confirmations | 0         | 待确认数据（运行时生成）         |
| agent_pending_forms        | 0          | 待填报表单（运行时生成）         |
| agent_role_config          | 0          | 角色配置（运行时配置）           |
| search_export_cache        | 0          | 导出缓存（运行时生成）           |

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
| formulas                 | ratio_factor            | >= 0.15 AND <= 0.25                                               |
| formulas                 | supplement_ratio_factor | >= 0.5 AND <= 1.5                                                 |
| salesmen                 | status                  | IN ('active', 'inactive')                                         |
| formula_sales            | period_type             | IN ('monthly', 'quarterly', 'yearly')                             |
| formula_versions         | status                  | IN ('draft', 'published', 'archived')                             |
| formula_versions         | ratio_factor            | >= 0.15 AND <= 0.25                                               |
| formula_versions         | supplement_ratio_factor | >= 0.5 AND <= 1.5                                                 |
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
