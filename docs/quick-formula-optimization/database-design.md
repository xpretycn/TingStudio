# 数据库设计：快速配方

## 1. 新增表：quick_formulas

### 1.1 SQLite 建表 SQL

```sql
CREATE TABLE IF NOT EXISTS `quick_formulas` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  `ratio_factor` REAL NOT NULL DEFAULT 0.18,
  `supplement_ratio_factor` REAL NOT NULL DEFAULT 1.0,
  `finished_weight` REAL NOT NULL DEFAULT 0,
  `materials_json` TEXT NOT NULL DEFAULT '[]',
  `packaging_price` REAL NOT NULL DEFAULT 0,
  `other_price` REAL NOT NULL DEFAULT 0,
  `profit_margin` REAL NOT NULL DEFAULT 20,
  `description` TEXT DEFAULT NULL,
  `preparation_method` TEXT DEFAULT NULL,
  `salesman_id` TEXT DEFAULT NULL,
  `salesman_name` TEXT DEFAULT NULL,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `idx_qf_name` ON `quick_formulas`(`name`);
CREATE INDEX IF NOT EXISTS `idx_qf_status` ON `quick_formulas`(`status`);
CREATE INDEX IF NOT EXISTS `idx_qf_created_by` ON `quick_formulas`(`created_by`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_qf_name_user` ON `quick_formulas`(`name`, `created_by`);
```

### 1.2 MySQL 建表 SQL

```sql
CREATE TABLE IF NOT EXISTS `quick_formulas` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `ratio_factor` DECIMAL(5,3) NOT NULL DEFAULT 0.18,
  `supplement_ratio_factor` DECIMAL(5,3) NOT NULL DEFAULT 1.0,
  `finished_weight` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `materials_json` JSON NOT NULL,
  `packaging_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `other_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `profit_margin` DECIMAL(5,2) NOT NULL DEFAULT 20,
  `description` TEXT DEFAULT NULL,
  `preparation_method` TEXT DEFAULT NULL,
  `salesman_id` VARCHAR(36) DEFAULT NULL,
  `salesman_name` VARCHAR(255) DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_qf_name` (`name`),
  INDEX `idx_qf_status` (`status`),
  INDEX `idx_qf_created_by` (`created_by`),
  UNIQUE INDEX `idx_qf_name_user` (`name`, `created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.3 字段说明

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | VARCHAR(36) | 是 | UUID | 主键，使用 generateId() 生成 |
| name | VARCHAR(255) | 是 | — | 配方名称，同用户下唯一 |
| status | ENUM | 是 | 'draft' | 状态：draft（编辑中）/ published（已发布） |
| ratio_factor | DECIMAL(5,3) | 是 | 0.18 | 主料含量比系数 |
| supplement_ratio_factor | DECIMAL(5,3) | 是 | 1.0 | 辅料含量比系数 |
| finished_weight | DECIMAL(10,2) | 是 | 0 | 成品重量(g) |
| materials_json | JSON/TEXT | 是 | [] | 原料列表 JSON |
| packaging_price | DECIMAL(10,2) | 是 | 0 | 包装费用 |
| other_price | DECIMAL(10,2) | 是 | 0 | 其他费用 |
| profit_margin | DECIMAL(5,2) | 是 | 20 | 利润率(%) |
| description | TEXT | 否 | NULL | 配方描述（发布时补充） |
| preparation_method | TEXT | 否 | NULL | 制备方法（发布时补充） |
| salesman_id | VARCHAR(36) | 否 | NULL | 业务员 ID（发布时补充） |
| salesman_name | VARCHAR(255) | 否 | NULL | 业务员姓名（发布时自动填充） |
| created_by | VARCHAR(36) | 是 | — | 创建人 ID |
| created_at | TIMESTAMP | 是 | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 是 | CURRENT_TIMESTAMP | 更新时间 |

### 1.4 索引说明

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| idx_qf_name | name | 普通索引 | 加速按名称搜索 |
| idx_qf_status | status | 普通索引 | 加速按状态筛选 |
| idx_qf_created_by | created_by | 普通索引 | 加速数据隔离查询 |
| idx_qf_name_user | name + created_by | 唯一索引 | 同用户下名称唯一 |

### 1.5 与 formulas 表的对比

| 维度 | quick_formulas | formulas |
|------|---------------|----------|
| 配方名称 | 必填，同用户唯一 | 必填，全局唯一 |
| 业务员 | 可为空 | 必填 |
| 描述 | 可为空 | 可为空 |
| 原料 | 可为空数组 | 必填非空 |
| 成品重量 | 可为 0 | 必填 > 0 |
| 状态 | draft / published | 无（由 formula_versions 管理） |
| 版本管理 | 无 | 有 formula_versions |
| 审核流程 | 无 | 有完整审核流程 |
| 外键约束 | 无 | salesman_id 外键关联 salesmen |

### 1.6 materials_json 结构

```json
[
  {
    "materialId": "mat_001",
    "materialName": "金银花",
    "quantity": 500,
    "materialType": "herb",
    "unitPrice": 120.00,
    "version": 1
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| materialId | string | 原料 ID |
| materialName | string | 原料名称 |
| quantity | number | 用量(g) |
| materialType | string | 原料类型：herb / supplement |
| unitPrice | number | 单价（元/kg），可为 null |
| version | number | 原料版本号，可为 null |

---

## 2. 迁移脚本

### 2.1 文件位置

`backend/src/scripts/migrations/addQuickFormulasTable.ts`

### 2.2 迁移逻辑

1. 检查 `quick_formulas` 表是否已存在
2. 若不存在，执行建表 SQL
3. 创建索引
4. 输出日志：`[Migration] ✓ quick_formulas table created`

### 2.3 幂等性

- 使用 `CREATE TABLE IF NOT EXISTS`
- 使用 `CREATE INDEX IF NOT EXISTS`
- 可重复执行不出错

---

## 3. 数据关系图

```
quick_formulas                    formulas
┌──────────────────┐             ┌──────────────────┐
│ id               │             │ id               │
│ name             │             │ name             │
│ status           │             │ salesman_id ─────┼──→ salesmen.id
│ ratio_factor     │             │ salesman_name    │
│ supplement_ratio │             │ materials_json   │
│ finished_weight  │             │ finished_weight  │
│ materials_json   │             │ ratio_factor     │
│ packaging_price  │             │ supplement_ratio │
│ other_price      │             │ description      │
│ profit_margin    │             │ preparation_method│
│ description      │   publish   │ packaging_price  │
│ preparation_method│ ────────→  │ other_price      │
│ salesman_id      │             │ profit_margin    │
│ salesman_name    │             │ code             │
│ created_by       │             │ created_by       │
│ created_at       │             │ created_at       │
│ updated_at       │             │ updated_at       │
└──────────────────┘             └──────────────────┘
                                          │
                                          │ 1:N
                                          ▼
                                 formula_versions
                                 ┌──────────────────┐
                                 │ id               │
                                 │ formula_id       │
                                 │ version_number   │
                                 │ status           │
                                 │ ...              │
                                 └──────────────────┘
```

发布流程：quick_formulas 记录 → 创建 formulas 记录 + formula_versions 记录 → 更新 quick_formulas.status = 'published'
