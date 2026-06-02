# 营养数据治理 - 数据库设计

## 1. 新增表

### 1.1 `material_nutrition_sources`（来源层）

存储同一原料的多个来源营养数据，每个来源独立一条记录。

#### SQLite

```sql
CREATE TABLE IF NOT EXISTS `material_nutrition_sources` (
  `source_id`     TEXT PRIMARY KEY,
  `material_id`   TEXT NOT NULL,
  `source_type`   TEXT NOT NULL DEFAULT 'manual'
    CHECK(source_type IN ('manual', 'tianapi', 'seed', 'ai', 'excel_import', 'other')),
  `source_detail` TEXT DEFAULT NULL,
  `per_100g_json` TEXT NOT NULL,
  `confidence`    TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  `match_score`   REAL DEFAULT NULL,
  `notes`         TEXT DEFAULT NULL,
  `created_at`    TEXT NOT NULL DEFAULT (datetime('now')),
  `created_by`    TEXT DEFAULT NULL,
  `is_active`     INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_mns_material` ON `material_nutrition_sources`(`material_id`);
CREATE INDEX IF NOT EXISTS `idx_mns_source_type` ON `material_nutrition_sources`(`source_type`);
CREATE INDEX IF NOT EXISTS `idx_mns_material_type` ON `material_nutrition_sources`(`material_id`, `source_type`);
```

#### MySQL

```sql
CREATE TABLE IF NOT EXISTS `material_nutrition_sources` (
  `source_id`     VARCHAR(36) PRIMARY KEY,
  `material_id`   VARCHAR(36) NOT NULL,
  `source_type`   VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK(source_type IN ('manual', 'tianapi', 'seed', 'ai', 'excel_import', 'other')),
  `source_detail` VARCHAR(500) DEFAULT NULL,
  `per_100g_json` JSON NOT NULL,
  `confidence`    VARCHAR(20) DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  `match_score`   DECIMAL(5,4) DEFAULT NULL,
  `notes`         TEXT DEFAULT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by`    VARCHAR(36) DEFAULT NULL,
  `is_active`     TINYINT(1) NOT NULL DEFAULT 1,
  INDEX `idx_mns_material` (`material_id`),
  INDEX `idx_mns_source_type` (`source_type`),
  INDEX `idx_mns_material_type` (`material_id`, `source_type`),
  CONSTRAINT `fk_mns_material` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `source_id` | TEXT/VARCHAR(36) | ✅ | UUID，主键，使用 `generateId()` 生成 |
| `material_id` | TEXT/VARCHAR(36) | ✅ | 关联原料 ID，外键 → `materials.id`，级联删除 |
| `source_type` | TEXT/VARCHAR(20) | ✅ | 来源类型枚举：manual/tianapi/seed/ai/excel_import/other |
| `source_detail` | TEXT/VARCHAR(500) | ❌ | 来源详细描述（如"中国食物成分表第6版"、"天行数据-山药"） |
| `per_100g_json` | TEXT/JSON | ✅ | 每100g营养成分 JSON，键名使用项目标准格式（protein/fat/...） |
| `confidence` | TEXT/VARCHAR(20) | ❌ | 数据可信度：high/medium/low，默认 medium |
| `match_score` | REAL/DECIMAL(5,4) | ❌ | 名称匹配置信度 0-1，API 来源时记录 |
| `notes` | TEXT | ❌ | 备注 |
| `created_at` | TEXT/TIMESTAMP | ✅ | 创建时间 |
| `created_by` | TEXT/VARCHAR(36) | ❌ | 创建人 ID |
| `is_active` | INTEGER/TINYINT(1) | ✅ | 是否活跃：1=活跃，0=软删除，默认 1 |

#### 约束规则

1. 同一 `material_id` + `source_type` 仅保留一条 `is_active=1` 的记录
2. 新增同类型来源时，旧记录自动 `is_active=0`
3. 软删除的记录不参与对比和计算

---

### 1.2 `formula_nutrition_snapshots`（快照层）

存储配方计算时的营养数据快照，确保历史结果可复现。

#### SQLite

```sql
CREATE TABLE IF NOT EXISTS `formula_nutrition_snapshots` (
  `snapshot_id`         TEXT PRIMARY KEY,
  `formula_id`          TEXT NOT NULL,
  `formula_version_id`  TEXT DEFAULT NULL,
  `nutrition_refs_json` TEXT NOT NULL,
  `total_nutrition_json` TEXT NOT NULL,
  `per_100g_json`       TEXT NOT NULL,
  `material_breakdown_json` TEXT DEFAULT NULL,
  `calculated_at`       TEXT NOT NULL DEFAULT (datetime('now')),
  `calculated_by`       TEXT DEFAULT NULL,
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_fnss_formula` ON `formula_nutrition_snapshots`(`formula_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `uk_fnss_version` ON `formula_nutrition_snapshots`(`formula_id`, `formula_version_id`);
```

#### MySQL

```sql
CREATE TABLE IF NOT EXISTS `formula_nutrition_snapshots` (
  `snapshot_id`         VARCHAR(36) PRIMARY KEY,
  `formula_id`          VARCHAR(36) NOT NULL,
  `formula_version_id`  VARCHAR(36) DEFAULT NULL,
  `nutrition_refs_json` JSON NOT NULL,
  `total_nutrition_json` JSON NOT NULL,
  `per_100g_json`       JSON NOT NULL,
  `material_breakdown_json` JSON DEFAULT NULL,
  `calculated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calculated_by`       VARCHAR(36) DEFAULT NULL,
  INDEX `idx_fnss_formula` (`formula_id`),
  UNIQUE INDEX `uk_fnss_version` (`formula_id`, `formula_version_id`),
  CONSTRAINT `fk_fnss_formula` FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `snapshot_id` | TEXT/VARCHAR(36) | ✅ | UUID，主键 |
| `formula_id` | TEXT/VARCHAR(36) | ✅ | 关联配方 ID，级联删除 |
| `formula_version_id` | TEXT/VARCHAR(36) | ❌ | 关联配方版本 ID，NULL 表示当前版本 |
| `nutrition_refs_json` | TEXT/JSON | ✅ | 使用的营养数据引用（见下方结构） |
| `total_nutrition_json` | TEXT/JSON | ✅ | 计算结果总量 JSON |
| `per_100g_json` | TEXT/JSON | ✅ | 每100g计算结果 JSON |
| `material_breakdown_json` | TEXT/JSON | ❌ | 原料贡献分解 JSON |
| `calculated_at` | TEXT/TIMESTAMP | ✅ | 计算时间 |
| `calculated_by` | TEXT/VARCHAR(36) | ❌ | 计算人 ID |

#### `nutrition_refs_json` 结构

```json
{
  "material-uuid-1": {
    "nutritionId": "nutr-uuid-1",
    "dataVersion": "2.0",
    "sourceType": "composite",
    "per100gSnapshot": {
      "protein": 1.9,
      "fat": 0.2,
      "carbohydrate": 12.4
    }
  },
  "material-uuid-2": {
    "nutritionId": "nutr-uuid-2",
    "dataVersion": "1.0",
    "sourceType": "seed",
    "per100gSnapshot": {
      "protein": 5.0,
      "fat": 0.8,
      "carbohydrate": 72.0
    }
  }
}
```

#### 约束规则

1. 同一 `formula_id` + `formula_version_id` 仅保留一条快照（UNIQUE 约束）
2. 重新计算时覆盖旧快照
3. 快照数据不可修改，只能覆盖

---

## 2. 现有表变更

### 2.1 `material_nutrition` 新增字段

#### SQLite

```sql
ALTER TABLE `material_nutrition` ADD COLUMN `field_sources_json` TEXT DEFAULT NULL;
ALTER TABLE `material_nutrition` ADD COLUMN `source_type` TEXT DEFAULT 'manual'
  CHECK(source_type IN ('manual', 'tianapi', 'seed', 'ai', 'excel_import', 'composite', 'other'));
ALTER TABLE `material_nutrition` ADD COLUMN `source_detail` TEXT DEFAULT NULL;
ALTER TABLE `material_nutrition` ADD COLUMN `created_at` TEXT DEFAULT NULL;
ALTER TABLE `material_nutrition` ADD COLUMN `created_by` TEXT DEFAULT NULL;
```

#### MySQL

```sql
ALTER TABLE `material_nutrition` ADD COLUMN `field_sources_json` JSON DEFAULT NULL;
ALTER TABLE `material_nutrition` ADD COLUMN `source_type` VARCHAR(20) DEFAULT 'manual'
  CHECK(source_type IN ('manual', 'tianapi', 'seed', 'ai', 'excel_import', 'composite', 'other'));
ALTER TABLE `material_nutrition` ADD COLUMN `source_detail` VARCHAR(500) DEFAULT NULL;
ALTER TABLE `material_nutrition` ADD COLUMN `created_at` TIMESTAMP DEFAULT NULL;
ALTER TABLE `material_nutrition` ADD COLUMN `created_by` VARCHAR(36) DEFAULT NULL;
```

#### 新增字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `field_sources_json` | TEXT/JSON | 字段级溯源 JSON，记录每个营养素值的来源 |
| `source_type` | TEXT/VARCHAR(20) | 权威数据来源类型，新增 `composite` 值（多来源组合） |
| `source_detail` | TEXT/VARCHAR(500) | 来源详细描述 |
| `created_at` | TEXT/TIMESTAMP | 记录创建时间 |
| `created_by` | TEXT/VARCHAR(36) | 创建人 ID |

#### `field_sources_json` 结构

```json
{
  "protein": {
    "sourceId": "src-uuid-1",
    "sourceType": "seed",
    "sourceDetail": "中国食物成分表第6版"
  },
  "fat": {
    "sourceId": "src-uuid-1",
    "sourceType": "seed",
    "sourceDetail": "中国食物成分表第6版"
  },
  "carbohydrate": {
    "sourceId": "src-uuid-2",
    "sourceType": "tianapi",
    "sourceDetail": "天行数据-山药"
  },
  "sodium": {
    "sourceId": "src-uuid-3",
    "sourceType": "manual",
    "sourceDetail": "实验室检测"
  }
}
```

---

## 3. 数据迁移

### 3.1 迁移脚本

**文件位置**：`backend/src/scripts/migrations/addNutritionSourceLayer.ts`

**迁移步骤**：

1. 创建 `material_nutrition_sources` 表
2. 创建 `formula_nutrition_snapshots` 表
3. 为 `material_nutrition` 添加新字段
4. 将现有 `material_nutrition` 数据迁移到 `material_nutrition_sources`

### 3.2 现有数据迁移逻辑

```sql
INSERT INTO material_nutrition_sources (
  source_id, material_id, source_type, source_detail,
  per_100g_json, confidence, notes, created_at, created_by, is_active
)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' ||
        hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' ||
        hex(randomblob(6))),
  material_id,
  CASE
    WHEN data_source LIKE '%xls%' OR data_source LIKE '%excel%' OR data_source LIKE '%Excel%'
      THEN 'excel_import'
    WHEN data_source LIKE '%AI%' OR data_source LIKE '%智能%' OR data_source LIKE '%ai%'
      THEN 'ai'
    WHEN data_source LIKE '%API%' OR data_source LIKE '%api%' OR data_source LIKE '%天行%'
      THEN 'tianapi'
    WHEN data_source LIKE '%食物成分表%' OR data_source LIKE '%种子%' OR data_source LIKE '%标准%'
      THEN 'seed'
    ELSE 'manual'
  END,
  data_source,
  per_100g_json,
  COALESCE(confidence, 'medium'),
  notes,
  COALESCE(last_updated, datetime('now')),
  NULL,
  1
FROM material_nutrition
WHERE is_latest = 1;
```

### 3.3 迁移后更新 `material_nutrition` 新字段

```sql
UPDATE material_nutrition
SET
  source_type = CASE
    WHEN data_source LIKE '%xls%' OR data_source LIKE '%excel%' OR data_source LIKE '%Excel%'
      THEN 'excel_import'
    WHEN data_source LIKE '%AI%' OR data_source LIKE '%智能%' OR data_source LIKE '%ai%'
      THEN 'ai'
    WHEN data_source LIKE '%API%' OR data_source LIKE '%api%' OR data_source LIKE '%天行%'
      THEN 'tianapi'
    WHEN data_source LIKE '%食物成分表%' OR data_source LIKE '%种子%' OR data_source LIKE '%标准%'
      THEN 'seed'
    ELSE 'manual'
  END,
  source_detail = data_source,
  created_at = last_updated
WHERE is_latest = 1;
```

### 3.4 幂等性保证

- 建表使用 `CREATE TABLE IF NOT EXISTS`
- ALTER TABLE 前检查列是否已存在
- 数据迁移前检查 `material_nutrition_sources` 是否已有数据
- 迁移脚本可重复执行不出错

---

## 4. ER 关系图

```
materials (1) ──┬── (N) material_nutrition (权威层, 1:1 实际)
                │         ├── field_sources_json → 溯源
                │         ├── source_type
                │         └── source_detail
                │
                └── (N) material_nutrition_sources (来源层, 1:N)
                          ├── source_type (枚举)
                          ├── source_detail
                          ├── per_100g_json
                          ├── confidence
                          └── match_score

formulas (1) ──── (N) formula_nutrition_snapshots (快照层, 1:1 per version)
                          ├── nutrition_refs_json → 各原料营养数据引用
                          ├── total_nutrition_json
                          ├── per_100g_json
                          └── material_breakdown_json
```
