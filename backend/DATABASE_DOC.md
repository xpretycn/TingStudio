# TingStudio 数据库设计文档

> 数据库：SQLite（better-sqlite3）
> 文件路径：`./data/tingstudio.db`
> 初始化脚本：`backend/src/scripts/init.sql`

---

## 一、数据库概览

系统共包含 **17 张表**，分为 5 个功能模块：

| 模块 | 表数量 | 说明 |
|------|--------|------|
| 基础模块 | 4 | users, customers, materials, formulas |
| 业务员管理 | 3 | salesmen, salesman_customer_relations, salesman_formulist_relations |
| 版本控制 | 1 | formula_versions |
| 导出管理 | 4 | export_templates, export_jobs, api_data_interfaces, share_configs |
| 营养分析 | 4 | material_nutrition, formula_nutrition_summaries, nutrition_profiles, nutrition_analysis_reports |
| 辅助表 | 1 | communication_logs |

---

## 二、表结构详解

### 2.1 用户表 `users`

存储系统用户信息（管理员、配方师、业务员、生产人员）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 用户唯一标识（自动生成） |
| `username` | TEXT | NOT NULL, UNIQUE | 用户名，登录凭证 |
| `password` | TEXT | NOT NULL | 密码（bcrypt 哈希） |
| `role` | TEXT | NOT NULL, DEFAULT 'formulist' | 角色：`admin` / `formulist` / `salesman` / `production` |
| `created_at` | TEXT | NOT NULL | 创建时间（ISO 8601） |
| `updated_at` | TEXT | NOT NULL | 更新时间（ISO 8601） |

**业务含义**：
- `admin`：系统管理员，拥有所有权限
- `formulist`：配方师，负责配方创建和营养分析
- `salesman`：业务员，负责客户管理和配方对接
- `production`：生产人员

---

### 2.2 客户表 `customers`

存储客户（企业/组织）信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 客户唯一标识 |
| `name` | TEXT | NOT NULL | 客户名称 |
| `contact` | TEXT | NULL | 联系人姓名 |
| `phone` | TEXT | NULL | 联系电话 |
| `email` | TEXT | NULL | 邮箱 |
| `address` | TEXT | NULL | 地址 |
| `created_by` | TEXT | NOT NULL | 创建人（用户 ID） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

**索引**：
- `idx_customer_name`：按客户名称
- `idx_customer_created_by`：按创建人

**业务含义**：配方服务的企业客户，每个配方关联一个客户。

---

### 2.3 原料表 `materials`

存储配方所需的原料信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 原料唯一标识 |
| `name` | TEXT | NOT NULL | 原料名称 |
| `code` | TEXT | NOT NULL, UNIQUE | 原料编码（如 MAT001） |
| `unit` | TEXT | NOT NULL, DEFAULT 'g' | 计量单位 |
| `stock` | REAL | NOT NULL, DEFAULT 0 | 库存数量 |
| `created_by` | TEXT | NOT NULL | 创建人（用户 ID） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

**索引**：
- `idx_material_name`：按原料名称
- `idx_material_code`：按原料编码

---

### 2.4 配方表 `formulas`

存储配方基本信息，原料列表以 JSON 格式存储。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 配方唯一标识 |
| `name` | TEXT | NOT NULL | 配方名称 |
| `customer_id` | TEXT | NOT NULL, FK → customers.id | 所属客户 |
| `customer_name` | TEXT | NOT NULL | 客户名称（冗余） |
| `materials_json` | TEXT | NOT NULL | 原料列表 JSON |
| `description` | TEXT | NULL | 配方描述 |
| `created_by` | TEXT | NOT NULL | 创建人（用户 ID） |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

**外键**：`customer_id` → `customers(id)` ON DELETE RESTRICT

**索引**：
- `idx_formula_name`：按配方名称
- `idx_formula_customer_id`：按客户 ID
- `idx_formula_created_by`：按创建人

**`materials_json` 结构**：
```json
[
  { "materialId": "xxx", "materialName": "白砂糖", "quantity": 200 },
  { "materialId": "yyy", "materialName": "全脂奶粉", "quantity": 300 }
]
```

---

### 2.5 业务员表 `salesmen`

存储业务员基本信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 业务员唯一标识 |
| `name` | TEXT | NOT NULL | 姓名 |
| `code` | TEXT | NOT NULL, UNIQUE | 工号（如 SM001） |
| `department` | TEXT | NULL | 所属部门 |
| `phone` | TEXT | NULL | 联系电话 |
| `email` | TEXT | NULL | 邮箱 |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | 状态：`active` / `inactive` |
| `created_by` | TEXT | NOT NULL | 创建人 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

**索引**：
- `idx_salesman_name`：按姓名
- `idx_salesman_code`：按工号
- `idx_salesman_status`：按状态

---

### 2.6 业务员-客户关联表 `salesman_customer_relations`

记录业务员与客户的关联关系。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 关联记录 ID |
| `salesman_id` | TEXT | NOT NULL, FK → salesmen.id | 业务员 ID |
| `customer_id` | TEXT | NOT NULL, FK → customers.id | 客户 ID |
| `relation_type` | TEXT | NOT NULL, DEFAULT 'primary' | 关系类型：`primary`（主要）/ `secondary`（次要） |
| `start_date` | TEXT | NOT NULL | 关联开始日期 |
| `end_date` | TEXT | NULL | 关联结束日期（NULL 表示有效） |
| `notes` | TEXT | NULL | 备注 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**外键**：
- `salesman_id` → `salesmen(id)` ON DELETE CASCADE
- `customer_id` → `customers(id)` ON DELETE CASCADE

**唯一约束**：`UNIQUE(salesman_id, customer_id, start_date)`

**索引**：
- `idx_scm_salesman`：按业务员
- `idx_scm_customer`：按客户

**业务含义**：一个业务员可关联多个客户，通过 `end_date` IS NULL 判断当前有效关联。

---

### 2.7 业务员-配方师对接表 `salesman_formulist_relations`

记录业务员与配方师的合作对接关系。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 对接记录 ID |
| `salesman_id` | TEXT | NOT NULL, FK → salesmen.id | 业务员 ID |
| `formulist_id` | TEXT | NOT NULL | 配方师（用户 ID） |
| `cooperation_mode` | TEXT | NOT NULL, DEFAULT 'direct' | 合作方式：`direct`（直接）/ `indirect`（间接） |
| `priority` | INTEGER | NOT NULL, DEFAULT 3 | 优先级（1-5） |
| `notes` | TEXT | NULL | 备注 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**外键**：`salesman_id` → `salesmen(id)` ON DELETE CASCADE

**唯一约束**：`UNIQUE(salesman_id, formulist_id)`

**索引**：
- `idx_sfr_salesman`：按业务员
- `idx_sfr_formulist`：按配方师

---

### 2.8 沟通记录表 `communication_logs`

记录业务员与配方师之间的沟通日志。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PRIMARY KEY | 记录 ID |
| `relation_id` | TEXT | NOT NULL, FK → salesman_formulist_relations.id | 对接关系 ID |
| `type` | TEXT | NOT NULL | 沟通类型：`email` / `phone` / `meeting` / `message` |
| `content` | TEXT | NOT NULL | 沟通内容 |
| `attachment_urls` | TEXT | NULL | 附件 URL 列表（JSON 数组） |
| `created_by` | TEXT | NOT NULL | 创建人 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**外键**：`relation_id` → `salesman_formulist_relations(id)` ON DELETE CASCADE

**索引**：`idx_cl_relation`：按对接关系

---

### 2.9 配方版本表 `formula_versions`

存储配方的版本快照和变更记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `version_id` | TEXT | PRIMARY KEY | 版本 ID |
| `formula_id` | TEXT | NOT NULL, FK → formulas.id | 配方 ID |
| `version_number` | TEXT | NOT NULL | 版本号（如 v1.0） |
| `version_name` | TEXT | NULL | 版本名称 |
| `changes_json` | TEXT | NULL | 变更记录 JSON |
| `snapshot_json` | TEXT | NOT NULL | 完整配方快照 JSON |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' | 状态：`draft` / `published` / `archived` |
| `is_current` | INTEGER | NOT NULL, DEFAULT 0 | 是否为当前版本（1/0） |
| `created_by` | TEXT | NOT NULL | 创建人 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**索引**：
- `idx_fv_formula`：按配方
- `idx_fv_version_number`：按配方+版本号（复合）

**`snapshot_json` 结构**：
```json
{
  "name": "婴儿配方奶粉1段",
  "customerId": "xxx",
  "customerName": "甜蜜食品",
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
  }
]
```

---

### 2.10 导出模板表 `export_templates`

存储配方导出的模板配置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `template_id` | TEXT | PRIMARY KEY | 模板 ID |
| `name` | TEXT | NOT NULL | 模板名称 |
| `description` | TEXT | NULL | 描述 |
| `type` | TEXT | NOT NULL | 类型：`pdf` / `excel` / `api` / `print` |
| `format_config_json` | TEXT | NOT NULL | 格式配置 JSON |
| `is_default` | INTEGER | NOT NULL, DEFAULT 0 | 是否为默认模板 |
| `created_by` | TEXT | NOT NULL | 创建人 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**索引**：`idx_et_type`：按类型

---

### 2.11 导出任务表 `export_jobs`

存储配方导出的任务记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `job_id` | TEXT | PRIMARY KEY | 任务 ID |
| `formula_id` | TEXT | NOT NULL, FK → formulas.id | 配方 ID |
| `version_id` | TEXT | NULL | 版本 ID |
| `template_id` | TEXT | NULL | 模板 ID |
| `export_type` | TEXT | NOT NULL | 导出类型：`pdf` / `excel` / `api` |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | 状态：`pending` / `processing` / `completed` / `failed` |
| `file_url` | TEXT | NULL | 文件路径 |
| `file_name` | TEXT | NULL | 文件名 |
| `api_endpoint` | TEXT | NULL | API 推送端点 |
| `progress` | INTEGER | NOT NULL, DEFAULT 0 | 进度百分比（0-100） |
| `error_message` | TEXT | NULL | 错误信息 |
| `created_by` | TEXT | NOT NULL | 创建人 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `completed_at` | TEXT | NULL | 完成时间 |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**索引**：
- `idx_ej_formula`：按配方
- `idx_ej_status`：按状态

---

### 2.12 API 数据接口表 `api_data_interfaces`

存储外部 API 对接配置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `interface_id` | TEXT | PRIMARY KEY | 接口 ID |
| `name` | TEXT | NOT NULL | 接口名称 |
| `description` | TEXT | NULL | 描述 |
| `endpoint` | TEXT | NOT NULL, UNIQUE | 端点地址 |
| `method` | TEXT | NOT NULL, DEFAULT 'GET' | HTTP 方法：`GET` / `POST` / `PUT` / `DELETE` |
| `authentication` | TEXT | NOT NULL, DEFAULT 'none' | 认证方式：`none` / `basic` / `apiKey` / `oauth` |
| `auth_config_json` | TEXT | NULL | 认证配置 JSON |
| `data_format` | TEXT | NOT NULL, DEFAULT 'json' | 数据格式：`json` / `xml` |
| `field_mapping_json` | TEXT | NULL | 字段映射 JSON |
| `rate_limit_json` | TEXT | NULL | 限流配置 JSON |
| `retry_config_json` | TEXT | NULL | 重试配置 JSON |
| `created_by` | TEXT | NOT NULL | 创建人 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

**索引**：`idx_adi_endpoint`：按端点

---

### 2.13 分享配置表 `share_configs`

存储配方分享链接配置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `share_id` | TEXT | PRIMARY KEY | 分享 ID |
| `formula_id` | TEXT | NOT NULL, FK → formulas.id | 配方 ID |
| `version_id` | TEXT | NULL | 版本 ID |
| `share_type` | TEXT | NOT NULL, DEFAULT 'link' | 类型：`link` / `email` / `api` |
| `share_url` | TEXT | NULL | 分享 URL |
| `password` | TEXT | NULL | 访问密码 |
| `expire_date` | TEXT | NULL | 过期日期 |
| `allowed_emails_json` | TEXT | NULL | 允许的邮箱列表 JSON |
| `download_limit` | INTEGER | NULL | 下载次数限制 |
| `download_count` | INTEGER | NOT NULL, DEFAULT 0 | 已下载次数 |
| `created_by` | TEXT | NOT NULL | 创建人 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**索引**：`idx_sc_formula`：按配方

---

### 2.14 原料营养成分表 `material_nutrition`

存储每种原料的营养成分数据（每100g含量）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `nutrition_id` | TEXT | PRIMARY KEY | 营养记录 ID |
| `material_id` | TEXT | NOT NULL, UNIQUE, FK → materials.id | 原料 ID（一对一） |
| `per_100g_json` | TEXT | NOT NULL | 每100g营养成分 JSON |
| `data_version` | TEXT | NOT NULL, DEFAULT '1.0' | 数据版本号 |
| `data_source` | TEXT | NULL | 数据来源 |
| `notes` | TEXT | NULL | 备注 |
| `last_updated` | TEXT | NOT NULL | 最后更新时间 |

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

---

### 2.15 配方营养汇总表 `formula_nutrition_summaries`

存储配方的营养成分计算结果。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `summary_id` | TEXT | PRIMARY KEY | 汇总 ID |
| `formula_id` | TEXT | NOT NULL, FK → formulas.id | 配方 ID |
| `version_id` | TEXT | NULL | 版本 ID |
| `total_weight` | REAL | NOT NULL, DEFAULT 0 | 配方总重量 |
| `total_nutrition_json` | TEXT | NOT NULL | 总营养成分 JSON |
| `per_100g_nutrition_json` | TEXT | NOT NULL | 每100g营养 JSON |
| `material_breakdown_json` | TEXT | NULL | 各原料贡献明细 JSON |
| `calculated_by` | TEXT | NOT NULL | 计算人 |
| `calculated_at` | TEXT | NOT NULL | 计算时间 |

**外键**：`formula_id` → `formulas(id)` ON DELETE CASCADE

**唯一约束**：`uk_fns_version`：`UNIQUE(version_id)`（一个版本只能有一个汇总）

**索引**：`idx_fns_formula`：按配方

---

### 2.16 营养标准/档案表 `nutrition_profiles`

存储不同人群的营养标准值。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `profile_id` | TEXT | PRIMARY KEY | 标准 ID |
| `name` | TEXT | NOT NULL | 标准名称 |
| `description` | TEXT | NULL | 描述 |
| `category` | TEXT | NOT NULL | 分类：`infant` / `child` / `adult` / `elderly` / `pregnant` / `special` |
| `target_values_json` | TEXT | NOT NULL | 目标营养值 JSON |
| `tolerance_ranges_json` | TEXT | NULL | 容差范围 JSON |
| `mandatory_fields_json` | TEXT | NULL | 必填字段列表 JSON |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

**索引**：`idx_np_category`：按分类

**业务含义**：如"婴儿配方奶GB10765标准"、"成人基础营养标准"等，用于合规性检查。

---

### 2.17 营养分析报告表 `nutrition_analysis_reports`

存储配方的合规性检查报告。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `report_id` | TEXT | PRIMARY KEY | 报告 ID |
| `formula_id` | TEXT | NOT NULL, FK → formulas.id | 配方 ID |
| `version_id` | TEXT | NULL | 版本 ID |
| `summary_id` | TEXT | NOT NULL, FK → formula_nutrition_summaries.summary_id | 营养汇总 ID |
| `compliance_check_json` | TEXT | NULL | 合规检查结果 JSON |
| `recommendations_json` | TEXT | NULL | 建议列表 JSON |
| `generated_by` | TEXT | NOT NULL | 生成人 |
| `generated_at` | TEXT | NOT NULL | 生成时间 |

**外键**：
- `formula_id` → `formulas(id)` ON DELETE CASCADE
- `summary_id` → `formula_nutrition_summaries(summary_id)` ON DELETE CASCADE

**索引**：`idx_nar_formula`：按配方

---

## 三、ER 关系图（文字描述）

```
users
  ├── 1:N → customers (created_by)
  ├── 1:N → materials (created_by)
  ├── 1:N → formulas (created_by)
  ├── 1:N → salesmen (created_by)
  ├── 1:N → salesman_formulist_relations (formulist_id)
  ├── 1:N → formula_versions (created_by)
  ├── 1:N → export_templates (created_by)
  ├── 1:N → export_jobs (created_by)
  ├── 1:N → api_data_interfaces (created_by)
  ├── 1:N → share_configs (created_by)
  ├── 1:N → formula_nutrition_summaries (calculated_by)
  └── 1:N → nutrition_analysis_reports (generated_by)

customers
  ├── 1:N → formulas (customer_id)
  ├── 1:N → salesman_customer_relations (customer_id)

materials
  ├── 1:1 → material_nutrition (material_id)

formulas
  ├── 1:N → formula_versions (formula_id)
  ├── 1:N → export_jobs (formula_id)
  ├── 1:N → formula_nutrition_summaries (formula_id)
  ├── 1:N → share_configs (formula_id)
  └── 1:N → nutrition_analysis_reports (formula_id)

salesmen
  ├── 1:N → salesman_customer_relations (salesman_id)
  └── 1:N → salesman_formulist_relations (salesman_id)

salesman_customer_relations
  └── (被 communication_logs 间接引用)

salesman_formulist_relations
  ├── 1:N → communication_logs (relation_id)

formula_versions
  └── 1:1 → formula_nutrition_summaries (version_id, UNIQUE)

formula_nutrition_summaries
  └── 1:N → nutrition_analysis_reports (summary_id)

nutrition_profiles
  └── (独立表，被合规检查引用)
```

---

## 四、数据量参考（种子数据）

| 表名 | 种子数据量 | 说明 |
|------|-----------|------|
| users | 30 | 含 1 个 admin，29 个普通用户 |
| materials | 30 | 食品行业常用原料 |
| customers | 30 | 食品/乳品行业企业客户 |
| salesmen | 30 | 6 个部门，27 active + 3 inactive |
| formulas | 30 | 覆盖婴幼儿到特殊医学配方 |
| formula_versions | 30 | 每个配方 1 个版本 |
| export_templates | 30 | pdf/excel/api/print 各类型 |
| export_jobs | 30 | 多种状态的任务记录 |
| nutrition_profiles | 30 | 6 个分类的营养标准 |
| material_nutrition | 30 | 每种原料对应营养数据 |
| salesman_customer_relations | 30 | 业务员-客户关联 |
| salesman_formulist_relations | 20 | 业务员-配方师对接 |

---

## 五、数据库配置

- **存储引擎**：SQLite (WAL 模式)
- **外键约束**：已启用（`PRAGMA foreign_keys = ON`）
- **ID 生成策略**：`Date.now().toString(36) + Math.random().toString(36)` (非 UUID)
- **时间格式**：ISO 8601 (`new Date().toISOString()`)
- **JSON 字段**：SQLite TEXT 类型，应用层解析
- **密码存储**：bcrypt (10 rounds)
- **默认端口**：3000
- **默认数据库路径**：`./data/tingstudio.db`
