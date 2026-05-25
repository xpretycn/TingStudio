# 原料枚举字段管理 — 数据库设计文档

> 日期：2026-05-25 | 版本：v1.0 | 状态：待确认

---

## 1. 新建表：enum_options

### 1.1 建表 SQL

```sql
CREATE TABLE IF NOT EXISTS `enum_options` (
  `id` TEXT PRIMARY KEY,
  `category` TEXT NOT NULL CHECK(category IN ('appearance', 'taste', 'efficacy')),
  `label` TEXT NOT NULL,
  `value` TEXT NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(`category`, `value`)
);
```

### 1.2 索引

```sql
CREATE INDEX IF NOT EXISTS `idx_enum_category` ON `enum_options`(`category`);
CREATE INDEX IF NOT EXISTS `idx_enum_category_active` ON `enum_options`(`category`, `is_active`);
```

### 1.3 字段说明

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | UUID，generateId() 生成 |
| category | TEXT | NOT NULL, CHECK | 枚举分类：appearance / taste / efficacy |
| label | TEXT | NOT NULL | 显示文本，如"颗粒" |
| value | TEXT | NOT NULL | 存储值，如"颗粒"（当前与 label 一致，预留映射能力） |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 排序序号，值越小越靠前 |
| is_active | INTEGER | NOT NULL, DEFAULT 1 | 是否启用：1=启用，0=停用 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

### 1.4 唯一约束

- `UNIQUE(category, value)` — 同一分类下不允许重复值

### 1.5 CHECK 约束

- `category IN ('appearance', 'taste', 'efficacy')` — 限制分类范围

---

## 2. 修改表：materials

### 2.1 新增字段迁移 SQL

```sql
ALTER TABLE `materials` ADD COLUMN `appearance_json` TEXT DEFAULT NULL;
ALTER TABLE `materials` ADD COLUMN `taste_json` TEXT DEFAULT NULL;
ALTER TABLE `materials` ADD COLUMN `efficacy_json` TEXT DEFAULT NULL;
```

### 2.2 新增字段说明

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| appearance_json | TEXT | DEFAULT NULL | 性状多选，JSON 数组字符串 |
| taste_json | TEXT | DEFAULT NULL | 口感多选，JSON 数组字符串 |
| efficacy_json | TEXT | DEFAULT NULL | 功效多选，JSON 数组字符串 |

### 2.3 存储格式

```json
["颗粒", "粉末"]
```

- 空值：`NULL`（未填写）
- 空数组：`"[]"`（用户主动清空）
- 解析工具：`safeJsonParse<string[]>(field, [])`

### 2.4 不新增索引的原因

这三个字段为 JSON 文本，不支持直接索引查询。若未来需要按枚举值筛选原料，可通过应用层过滤或引入 JSON 查询函数。

---

## 3. 种子数据

### 3.1 性状（appearance）

| sort_order | label | value |
|------------|-------|-------|
| 1 | 颗粒 | 颗粒 |
| 2 | 膏状 | 膏状 |
| 3 | 粉末 | 粉末 |
| 4 | 块状 | 块状 |
| 5 | 液体 | 液体 |
| 6 | 澄清 | 澄清 |
| 7 | 浑浊 | 浑浊 |
| 8 | 有沉淀 | 有沉淀 |

### 3.2 口感（taste）

| sort_order | label | value |
|------------|-------|-------|
| 1 | 苦味 | 苦味 |
| 2 | 甘味 | 甘味 |
| 3 | 酸味 | 酸味 |
| 4 | 辛味 | 辛味 |
| 5 | 咸味 | 咸味 |
| 6 | 泥土味 | 泥土味 |
| 7 | 涩感 | 涩感 |
| 8 | 滑润感 | 滑润感 |
| 9 | 颗粒感 | 颗粒感 |
| 10 | 粗糙感 | 粗糙感 |
| 11 | 清凉感 | 清凉感 |
| 12 | 草本香 | 草本香 |
| 13 | 药香 | 药香 |
| 14 | 焦香 | 焦香 |
| 15 | 清香 | 清香 |
| 16 | 陈味 | 陈味 |

### 3.3 功效（efficacy）

| sort_order | label | value |
|------------|-------|-------|
| 1 | 滋补肝肾 | 滋补肝肾 |
| 2 | 补中益气 | 补中益气 |
| 3 | 养血安神 | 养血安神 |
| 4 | 清热解毒 | 清热解毒 |
| 5 | 清肝明目 | 清肝明目 |
| 6 | 泻火除烦 | 泻火除烦 |
| 7 | 健脾养胃 | 健脾养胃 |
| 8 | 利水渗湿 | 利水渗湿 |
| 9 | 化痰止咳 | 化痰止咳 |
| 10 | 活血化瘀 | 活血化瘀 |
| 11 | 行气止痛 | 行气止痛 |
| 12 | 疏肝解郁 | 疏肝解郁 |
| 13 | 敛肺止咳 | 敛肺止咳 |
| 14 | 涩肠止泻 | 涩肠止泻 |
| 15 | 生津止渴 | 生津止渴 |

---

## 4. ER 关系图

```
┌──────────────────┐          ┌──────────────────────┐
│   enum_options   │          │      materials        │
├──────────────────┤          ├──────────────────────┤
│ id (PK)          │          │ id (PK)              │
│ category         │◄─────────│ appearance_json      │  (JSON 数组引用 value)
│ label            │          │ taste_json           │  (JSON 数组引用 value)
│ value            │◄─────────│ efficacy_json        │  (JSON 数组引用 value)
│ sort_order       │          │ name                 │
│ is_active        │          │ code                 │
│ created_at       │          │ ...                  │
│ updated_at       │          │ created_at           │
└──────────────────┘          │ updated_at           │
                              └──────────────────────┘
```

**引用关系**：materials 的 JSON 字段存储 enum_options.value 的值数组，为**弱引用**（无外键约束），删除枚举值时不级联删除原料中的引用。

---

## 5. 迁移脚本设计

### 5.1 迁移脚本：`addEnumFieldsToMaterials.ts`

- 幂等执行：先检查字段是否存在再 ALTER
- 执行 ALTER TABLE 新增3字段
- 更新 init.sql 同步表结构

### 5.2 种子脚本：`seedEnumOptions.ts`

- 幂等执行：先检查表是否有数据，有则跳过
- 插入所有初始枚举值
- 可通过 `npm run seed-enums` 单独执行

---

## 6. 数据一致性策略

| 场景 | 策略 |
|------|------|
| 删除枚举值 | 不级联删除原料 JSON 中的引用，前端兜底展示原始值 |
| 修改枚举值 value | 后端同步更新所有原料 JSON 中的对应值 |
| 停用枚举值 | 原料表单中不再显示该选项，已有数据保留 |
| 原料 JSON 中存在无效值 | 前端兜底展示原始文本，不做过滤 |
