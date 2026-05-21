# 数据库设计：原料管理版本化系统

## 1. materials 表变更

### 1.1 当前表结构

```sql
CREATE TABLE IF NOT EXISTS `materials` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `code` TEXT NOT NULL UNIQUE,
  `unit` TEXT NOT NULL DEFAULT 'g',
  `stock` REAL NOT NULL DEFAULT 0,
  `material_type` TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
  `unit_price` REAL DEFAULT NULL,
  `data_source` TEXT NOT NULL DEFAULT 'manual',
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 1.2 新增字段（迁移脚本）

```sql
-- 版本化字段
ALTER TABLE materials ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE materials ADD COLUMN `previous_version_id` TEXT DEFAULT NULL;
ALTER TABLE materials ADD COLUMN `is_latest` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE materials ADD COLUMN `is_deleted` INTEGER NOT NULL DEFAULT 0;

-- 新索引
CREATE INDEX IF NOT EXISTS `idx_material_version` ON `materials`(`version`);
CREATE INDEX IF NOT EXISTS `idx_material_previous_version` ON `materials`(`previous_version_id`);
CREATE INDEX IF NOT EXISTS `idx_material_is_latest` ON `materials`(`is_latest`);
CREATE INDEX IF NOT EXISTS `idx_material_is_deleted` ON `materials`(`is_deleted`);
```

### 1.3 完整最终表结构

```sql
CREATE TABLE IF NOT EXISTS `materials` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `code` TEXT NOT NULL,
  `unit` TEXT NOT NULL DEFAULT 'g',
  `stock` REAL NOT NULL DEFAULT 0,
  `material_type` TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
  `unit_price` REAL DEFAULT NULL,
  `data_source` TEXT NOT NULL DEFAULT 'manual',
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  -- 以下为版本化新增字段
  `version` INTEGER NOT NULL DEFAULT 1,
  `previous_version_id` TEXT DEFAULT NULL,
  `is_latest` INTEGER NOT NULL DEFAULT 1,
  `is_deleted` INTEGER NOT NULL DEFAULT 0
);

-- 索引
CREATE INDEX IF NOT EXISTS `idx_material_name` ON `materials`(`name`);
CREATE INDEX IF NOT EXISTS `idx_material_code` ON `materials`(`code`);
CREATE INDEX IF NOT EXISTS `idx_material_version` ON `materials`(`version`);
CREATE INDEX IF NOT EXISTS `idx_material_previous_version` ON `materials`(`previous_version_id`);
CREATE INDEX IF NOT EXISTS `idx_material_is_latest` ON `materials`(`is_latest`);
CREATE INDEX IF NOT EXISTS `idx_material_is_deleted` ON `materials`(`is_deleted`);
```

**注意**：`code` 字段移除了 `UNIQUE` 约束。因为同一原料的不同版本共享相同编码，版本间通过 `id` 区分。唯一性通过 `(code, version)` 逻辑保证。

---

## 2. material_nutrition 表变更

### 2.1 当前表结构

```sql
CREATE TABLE IF NOT EXISTS `material_nutrition` (
  `nutrition_id` TEXT PRIMARY KEY,
  `material_id` TEXT NOT NULL UNIQUE,
  `per_100g_json` TEXT NOT NULL,
  `data_version` TEXT NOT NULL DEFAULT '1.0',
  `data_source` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `confidence` TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  `last_updated` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
);
```

### 2.2 变更

```sql
-- 移除 UNIQUE 约束（一个原料多个版本各有营养数据）
-- 注意：SQLite 不支持 ALTER TABLE DROP CONSTRAINT
-- 迁移方案：创建新表 + 数据迁移

-- 新增字段
ALTER TABLE material_nutrition ADD COLUMN `material_version` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE material_nutrition ADD COLUMN `is_latest` INTEGER NOT NULL DEFAULT 1;

-- 新索引
CREATE INDEX IF NOT EXISTS `idx_mn_material_version` ON `material_nutrition`(`material_id`, `material_version`);
CREATE INDEX IF NOT EXISTS `idx_mn_is_latest` ON `material_nutrition`(`is_latest`);
```

### 2.3 完整最终表结构

```sql
CREATE TABLE IF NOT EXISTS `material_nutrition` (
  `nutrition_id` TEXT PRIMARY KEY,
  `material_id` TEXT NOT NULL,
  `per_100g_json` TEXT NOT NULL,
  `data_version` TEXT NOT NULL DEFAULT '1.0',
  `data_source` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `confidence` TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  `last_updated` TEXT NOT NULL DEFAULT (datetime('now')),
  `material_version` INTEGER NOT NULL DEFAULT 1,
  `is_latest` INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_mn_material_version` ON `material_nutrition`(`material_id`, `material_version`);
CREATE INDEX IF NOT EXISTS `idx_mn_is_latest` ON `material_nutrition`(`is_latest`);
```

**注意**：`material_id` 移除了 `UNIQUE` 约束，因为同一原料的不同版本各自关联不同的营养数据行。

---

## 3. formulas.materials_json 快照格式

### 3.1 当前格式

```json
[
  {
    "materialId": "xxx",
    "materialName": "当归",
    "materialCode": "DG001",
    "quantity": 150,
    "unit": "g",
    "materialType": "herb"
  }
]
```

### 3.2 新格式（增加快照）

```json
[
  {
    "materialId": "xxx",
    "materialName": "当归",
    "materialCode": "DG001",
    "materialVersion": 2,
    "quantity": 150,
    "unit": "g",
    "materialType": "herb",
    "unitPrice": 28.00,
    "snapshotNutrition": {
      "protein": 3.5,
      "fat": 1.2,
      "carbohydrate": 10.0,
      "sodium": 0.05,
      "calories": 68.0,
      "dietaryFiber": 5.0
    },
    "snapshotAt": "2026-05-21T14:30:00.000Z"
  }
]
```

**新增字段说明**：

| 字段 | 类型 | 必需 | 说明 |
|------|------|:----:|------|
| `materialVersion` | number | ✅ | 配方保存时的原料版本号 |
| `unitPrice` | number | ❌ | 配方保存时的原料单价（可选快照） |
| `snapshotNutrition` | object | ✅ | 配方保存时的原料营养快照（用于营养计算） |
| `snapshotAt` | string (ISO 8601) | ✅ | 快照时间戳 |

---

## 4. 关键查询

### 4.1 获取最新版本列表（默认视图）

```sql
SELECT * FROM materials
WHERE is_latest = 1 AND is_deleted = 0
  AND (created_by = ? OR ?)  -- 权限过滤
ORDER BY created_at DESC
LIMIT ? OFFSET ?;
```

### 4.2 获取版本链

```sql
-- 从最新版本开始回溯
WITH RECURSIVE version_chain AS (
  SELECT * FROM materials WHERE id = ?  -- 指定版本 ID
  UNION ALL
  SELECT m.* FROM materials m
  JOIN version_chain vc ON m.id = vc.previous_version_id
)
SELECT * FROM version_chain ORDER BY version DESC;
```

### 4.3 检查原料引用

```sql
-- 通过 JSON 搜索检查原料是否被配方引用
SELECT f.id, f.name FROM formulas f
WHERE f.materials_json LIKE '%"materialId":"<原料ID>"%';
```

### 4.4 统计引用数量

```sql
SELECT COUNT(*) as reference_count FROM formulas
WHERE materials_json LIKE '%"materialId":"<原料ID>"%';
```

### 4.5 查询版本历史（带创建人信息）

```sql
SELECT
  m.id,
  m.version,
  m.is_latest,
  m.created_at,
  m.created_by,
  u.display_name as created_by_name,
  u.role as created_by_role
FROM materials m
LEFT JOIN users u ON m.created_by = u.id
WHERE (m.id = ? OR m.previous_version_id IS NOT NULL
       AND (m.id = ? OR m.previous_version_id IN (
         SELECT id FROM materials WHERE previous_version_id = ? OR id = ?
       )))
-- 实际使用 version_chain CTE
ORDER BY m.version DESC;
```

优化后的版本链查询：

```sql
-- 获取指定原料的所有版本（通过 code 关联）
SELECT * FROM materials
WHERE code = (SELECT code FROM materials WHERE id = ?)
  AND is_deleted = 0
ORDER BY version DESC;
```

---

## 5. 数据迁移脚本

### 5.1 迁移内容

迁移文件：`backend/src/scripts/migrations/addVersionToMaterials.ts`

```typescript
import { query } from "../../config/database-adapter.js";

export async function migrateAddVersionToMaterials() {
  console.log("[Migration] 开始原料版本化迁移...");

  // 1. 为 materials 表新增字段
  const tableInfo = await query("PRAGMA table_info(materials)");
  const hasVersion = tableInfo.some((col: any) => col.name === "version");

  if (!hasVersion) {
    await query("ALTER TABLE materials ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
    await query("ALTER TABLE materials ADD COLUMN previous_version_id TEXT DEFAULT NULL");
    await query("ALTER TABLE materials ADD COLUMN is_latest INTEGER NOT NULL DEFAULT 1");
    await query("ALTER TABLE materials ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0");

    // 为现有数据设置 version=1, is_latest=1
    await query("UPDATE materials SET version = 1, is_latest = 1 WHERE version IS NULL");

    // 创建索引
    await query("CREATE INDEX IF NOT EXISTS idx_material_version ON materials(version)");
    await query("CREATE INDEX IF NOT EXISTS idx_material_previous_version ON materials(previous_version_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_material_is_latest ON materials(is_latest)");
    await query("CREATE INDEX IF NOT EXISTS idx_material_is_deleted ON materials(is_deleted)");

    console.log("[Migration] ✅ materials 表版本字段已添加");
  } else {
    console.log("[Migration] ⏭️ materials 表版本字段已存在，跳过");
  }

  // 2. 为 material_nutrition 表新增字段
  const nutritionTableInfo = await query("PRAGMA table_info(material_nutrition)");
  const hasNutVersion = nutritionTableInfo.some((col: any) => col.name === "material_version");

  if (!hasNutVersion) {
    await query("ALTER TABLE material_nutrition ADD COLUMN material_version INTEGER NOT NULL DEFAULT 1");
    await query("ALTER TABLE material_nutrition ADD COLUMN is_latest INTEGER NOT NULL DEFAULT 1");

    await query("UPDATE material_nutrition SET material_version = 1, is_latest = 1 WHERE material_version IS NULL");

    await query("CREATE INDEX IF NOT EXISTS idx_mn_material_version ON material_nutrition(material_id, material_version)");
    await query("CREATE INDEX IF NOT EXISTS idx_mn_is_latest ON material_nutrition(is_latest)");

    console.log("[Migration] ✅ material_nutrition 表版本字段已添加");
  } else {
    console.log("[Migration] ⏭️ material_nutrition 表版本字段已存在，跳过");
  }

  // 3. 为已有配方补充快照（可选，延迟执行）
  console.log("[Migration] ✅ 原料版本化迁移完成");
}
```

### 5.2 迁移执行

```bash
cd backend
npx tsx src/scripts/migrations/addVersionToMaterials.ts
```

### 5.3 配方快照回填逻辑（独立脚本）

```typescript
// backend/src/scripts/backfillFormulaSnapshots.ts
// 遍历所有配方，为 materials_json 补充 snapshotNutrition 字段

import { query } from "../config/database-adapter.js";

async function backfillFormulaSnapshots() {
  const [formulas]: any[] = await query("SELECT id, materials_json FROM formulas");

  for (const formula of formulas) {
    const materials = JSON.parse(formula.materials_json);
    let changed = false;

    for (const mat of materials) {
      if (!mat.snapshotNutrition) {
        // 查询该原料的最新营养数据
        const [nutritionRows]: any[] = await query(`
          SELECT per_100g_json FROM material_nutrition
          WHERE material_id = ? AND is_latest = 1
          LIMIT 1
        `, [mat.materialId]);

        if (nutritionRows && nutritionRows.length > 0) {
          mat.snapshotNutrition = JSON.parse(nutritionRows[0].per_100g_json);
        }
        mat.materialVersion = mat.materialVersion || 1;
        mat.snapshotAt = new Date().toISOString();
        changed = true;
      }
    }

    if (changed) {
      await query("UPDATE formulas SET materials_json = ? WHERE id = ?", [
        JSON.stringify(materials),
        formula.id,
      ]);
    }
  }

  console.log("[Backfill] ✅ 配方快照回填完成");
}
```

---

## 6. 数据关系图

```
materials (版本化)
  id (PK)
  code (共享编码)
  version          ← 新增
  previous_version_id (FK → materials.id)  ← 新增
  is_latest        ← 新增
  is_deleted       ← 新增
  name, unit, stock, ...
       │
       │ 1:N (每个版本各有营养数据)
       ▼
material_nutrition
  nutrition_id (PK)
  material_id (FK → materials.id)
  material_version  ← 新增
  is_latest         ← 新增
  per_100g_json
       │
       │ (配方存储快照，不直接关联)
       ▼
formulas.materials_json[]  →  snapshotNutrition  ← 版本快照
                               materialVersion
                               snapshotAt
```

---

## 7. 约束与注意事项

| 约束 | 说明 |
|------|------|
| `code` 唯一性 | 同一原料的不同版本共享 code，不再要求全局唯一。新原料创建时仍需唯一 |
| `is_latest` | 同一 code 下只有一个版本的 is_latest=1（最新版本） |
| 删除 | 仅软删除（is_deleted=1），保留历史数据 |
| 营养数据 | 创建新版本时自动复制上一版本的营养数据，用户可修改 |
| 回滚限制 | 版本化后数据不可逆回滚到扁平结构 |

### 版本链约束（代码层面保证）

- 创建新版本时：旧版本 `is_latest ← 0`，新版本 `is_latest ← 1`
- 新版本 `previous_version_id ← 旧版本 ID`
- 新版本 `version ← 旧版本.version + 1`
- 删除时：设置 `is_deleted = 1`，不清除数据
- 不允许删除 `is_latest = 1` 的版本（只能先创建新版本，再软删除当前版本）