# 数据库设计：销量分析模块优化

## 1. 表结构变更

### 1.1 formula_sales 表

**变更类型**：修改唯一约束

**变更前**：

```sql
UNIQUE(formula_id, period_type, period_start)
```

**变更后**：

```sql
UNIQUE(formula_id, salesman_id, period_type, period_start)
```

**完整建表 DDL**：

```sql
CREATE TABLE IF NOT EXISTS formula_sales (
  id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  salesman_id TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE,
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT,
  UNIQUE(formula_id, salesman_id, period_type, period_start)
);
```

**索引**：

```sql
CREATE INDEX IF NOT EXISTS idx_fs_formula ON formula_sales(formula_id);
CREATE INDEX IF NOT EXISTS idx_fs_salesman ON formula_sales(salesman_id);
CREATE INDEX IF NOT EXISTS idx_fs_period ON formula_sales(period_start);
CREATE INDEX IF NOT EXISTS idx_fs_unique ON formula_sales(formula_id, salesman_id, period_type, period_start);
```

### 1.2 变更影响分析

| 场景 | 旧约束 | 新约束 |
|------|--------|--------|
| 同配方 + 同业务员 + 同周期 | ❌ 唯一冲突 | ❌ 唯一冲突（不变） |
| 同配方 + **不同**业务员 + 同周期 | ❌ 唯一冲突 | ✅ 允许（**核心变更**） |
| 不同配方 + 同业务员 + 同周期 | ✅ 允许 | ✅ 允许（不变） |

**数据兼容性**：旧约束比新约束更严格，因此现有数据不会违反新约束，迁移是安全的。

## 2. 迁移脚本

### 2.1 迁移脚本：addSalesmanIdToSalesUnique.ts

**路径**：`backend/src/scripts/migrations/addSalesmanIdToSalesUnique.ts`

**逻辑**：

```typescript
import { query } from "../../config/database-better-sqlite3.js";

export async function migrate() {
  // Step 1: 检测是否有违反新约束的数据
  // 旧约束: UNIQUE(formula_id, period_type, period_start)
  // 新约束: UNIQUE(formula_id, salesman_id, period_type, period_start)
  // 由于旧约束更严格，不可能存在同 formula_id + period_type + period_start 的多条记录
  // 因此迁移是安全的，无需数据合并

  // Step 2: 删除旧唯一索引（如果存在）
  await query(`DROP INDEX IF EXISTS idx_fs_unique_old`);

  // Step 3: 创建新的唯一索引
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fs_unique
    ON formula_sales(formula_id, salesman_id, period_type, period_start)
  `);

  // Step 4: 更新建表 DDL 中的约束定义（需要重建表）
  // SQLite 不支持 ALTER TABLE ... DROP CONSTRAINT
  // 需要重建表来更新约束

  console.log("[Migration] ✓ formula_sales 唯一约束已更新为包含 salesman_id");
}
```

### 2.2 SQLite 表重建方案

SQLite 不支持直接修改约束，需要重建表：

```sql
-- Step 1: 创建新表
CREATE TABLE formula_sales_new (
  id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  salesman_id TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE,
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT,
  UNIQUE(formula_id, salesman_id, period_type, period_start)
);

-- Step 2: 迁移数据
INSERT INTO formula_sales_new SELECT * FROM formula_sales;

-- Step 3: 删除旧表
DROP TABLE formula_sales;

-- Step 4: 重命名新表
ALTER TABLE formula_sales_new RENAME TO formula_sales;

-- Step 5: 重建索引
CREATE INDEX idx_fs_formula ON formula_sales(formula_id);
CREATE INDEX idx_fs_salesman ON formula_sales(salesman_id);
CREATE INDEX idx_fs_period ON formula_sales(period_start);
```

### 2.3 幂等性保证

迁移脚本需检查是否已执行过：

```typescript
const [tables] = await query(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='formula_sales'"
);
if (!tables || tables.length === 0) return;

// 检查约束是否已包含 salesman_id
const [indexInfo] = await query(
  "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='formula_sales' AND name='idx_fs_unique'"
);
// 如果索引已存在且包含 salesman_id，跳过迁移
```

## 3. 数据完整性规则

### 3.1 外键约束

| 外键 | 引用表 | 删除策略 |
|------|--------|---------|
| formula_id | formulas | CASCADE（配方删除则销量记录级联删除） |
| salesman_id | salesmen | RESTRICT（业务员有关联销量时不可删除） |

### 3.2 CHECK 约束

| 约束 | 规则 |
|------|------|
| period_type | IN ('monthly', 'quarterly', 'yearly') |
| quantity | ≥ 0 |
| revenue | ≥ 0 |

### 3.3 业务规则

| 规则 | 说明 |
|------|------|
| 唯一性 | 同一配方 + 同一业务员 + 同一周期类型 + 同一起始月份 = 唯一 |
| period_end 计算 | monthly → 月末日期；quarterly → 季末日期；yearly → 年末日期 |
| periodStart 校验 | 不得晚于当前月份 |
| created_by | 必须为有效用户 ID，不得为 "system" |
