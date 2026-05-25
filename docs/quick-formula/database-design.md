# 数据库设计：快速配方录入功能

## 1. 新增表：formula_templates

### 1.1 建表 SQL

```sql
CREATE TABLE formula_templates (
  id TEXT PRIMARY KEY,                              -- UUID，generateId() 生成
  name TEXT NOT NULL,                               -- 模板名称
  description TEXT DEFAULT NULL,                    -- 模板描述
  ratio_factor REAL NOT NULL DEFAULT 0.18,          -- 主料系数 (0.15-0.25)
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0,-- 辅料系数 (0.5-1.5)
  finished_weight REAL NOT NULL DEFAULT 0,          -- 成品重量(g)
  materials_json TEXT NOT NULL,                     -- 原料列表 JSON
  packaging_price REAL NOT NULL DEFAULT 0,          -- 包材费用
  other_price REAL NOT NULL DEFAULT 0,              -- 其他费用
  profit_margin REAL NOT NULL DEFAULT 20,           -- 利润率(%)
  created_by TEXT NOT NULL,                         -- 创建人 ID
  created_at TEXT NOT NULL DEFAULT (datetime('now')),// 创建时间
  updated_at TEXT NOT NULL DEFAULT (datetime('now')) // 更新时间
);
```

### 1.2 索引

```sql
CREATE INDEX idx_template_name ON formula_templates(name);
CREATE INDEX idx_template_created_by ON formula_templates(created_by);
```

### 1.3 字段说明

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID，使用 `generateId()` 生成 |
| name | TEXT | NOT NULL | 模板名称，最长 50 字符，同一创建人下唯一 |
| description | TEXT | | 模板描述 |
| ratio_factor | REAL | NOT NULL, DEFAULT 0.18 | 主料含量比系数，范围 0.15-0.25 |
| supplement_ratio_factor | REAL | NOT NULL, DEFAULT 1.0 | 辅料含量比系数，范围 0.5-1.5 |
| finished_weight | REAL | NOT NULL, DEFAULT 0 | 成品重量(g) |
| materials_json | TEXT | NOT NULL | 原料列表 JSON，结构见下方 |
| packaging_price | REAL | DEFAULT 0 | 包材费用(元) |
| other_price | REAL | DEFAULT 0 | 其他费用(元) |
| profit_margin | REAL | DEFAULT 20 | 利润率(%) |
| created_by | TEXT | NOT NULL | 创建人 ID，关联 users 表 |
| created_at | TEXT | NOT NULL | 创建时间，ISO 8601 UTC |
| updated_at | TEXT | NOT NULL | 更新时间，ISO 8601 UTC |

### 1.4 materials_json 结构

```json
[
  {
    "materialId": "uuid-xxx",
    "materialName": "金银花",
    "quantity": 150,
    "materialType": "herb"
  },
  {
    "materialId": "uuid-yyy",
    "materialName": "麦冬",
    "quantity": 100,
    "materialType": "supplement"
  }
]
```

与 `formulas.materials_json` 结构一致（不含 `adjustedPrice`，模板使用原料库默认单价）。

---

## 2. 迁移脚本

### 2.1 迁移文件

路径：`backend/src/scripts/migrations/addFormulaTemplatesTable.ts`

```typescript
import { query } from '../config/database.js'

export async function up() {
  await query(`
    CREATE TABLE IF NOT EXISTS formula_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT NULL,
      ratio_factor REAL NOT NULL DEFAULT 0.18,
      supplement_ratio_factor REAL NOT NULL DEFAULT 1.0,
      finished_weight REAL NOT NULL DEFAULT 0,
      materials_json TEXT NOT NULL,
      packaging_price REAL NOT NULL DEFAULT 0,
      other_price REAL NOT NULL DEFAULT 0,
      profit_margin REAL NOT NULL DEFAULT 20,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_template_name ON formula_templates(name)
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_template_created_by ON formula_templates(created_by)
  `)

  console.log('[Migration] ✓ formula_templates table created')
}

export async function down() {
  await query('DROP TABLE IF EXISTS formula_templates')
  console.log('[Migration] ✓ formula_templates table dropped')
}
```

### 2.2 幂等性

- 使用 `CREATE TABLE IF NOT EXISTS` 和 `CREATE INDEX IF NOT EXISTS`
- 可重复执行不出错

---

## 3. 数据隔离规则

| 角色 | 可见范围 | 操作权限 |
|------|---------|---------|
| admin | 所有模板 | CRUD 全部模板 |
| formulist | 仅自己创建的模板 | CRUD 自己的模板 |

查询条件：
- admin：`SELECT * FROM formula_templates WHERE name LIKE ?`
- formulist：`SELECT * FROM formula_templates WHERE created_by = ? AND name LIKE ?`

---

## 4. 与现有表的关系

```
formula_templates.created_by → users.id (逻辑关联，无 FK)
formula_templates.materials_json[].materialId → materials.id (逻辑关联，无 FK)
```

模板与配方、原料均为**逻辑关联**，不建立外键约束。理由：
1. 与现有 `formulas.materials_json` 设计保持一致
2. 模板中的原料可能被删除，不应阻止模板存在
3. 加载模板时重新查询原料最新数据，自动处理不存在的情况
