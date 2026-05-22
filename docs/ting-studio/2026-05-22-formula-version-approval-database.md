# 数据库设计文档 — 配方版本审批流程优化

> 版本: 1.0.0 | 日期: 2026-05-22 | 范围: formula_versions 审批状态扩展 + formula_review_logs 审批日志

---

## 1. 变更总览

| 变更类型 | 表名 | 说明 |
|----------|------|------|
| **修改** | formula_versions | status CHECK 约束新增 `pending_review` 值 |
| **新增** | formula_review_logs | 配方版本审批操作日志表 |
| **新增** | 索引 | formula_versions(status)、formula_versions(formula_id, status) |
| **新增** | 索引 | formula_review_logs(version_id)、formula_review_logs(reviewer_id)、formula_review_logs(action) |

### 1.1 状态流转变更

**变更前**:

```
draft ──→ published ──→ archived
```

**变更后**:

```
draft ──→ pending_review ──→ published ──→ archived
              │
              └──→ draft（驳回后回到草稿状态）
```

| 状态 | 说明 | 变更 |
|------|------|------|
| `draft` | 草稿，编辑中 | 不变 |
| `pending_review` | 待审核，已提交审批 | **新增** |
| `published` | 已发布，当前生效版本 | 不变 |
| `archived` | 已归档，历史版本 | 不变 |

---

## 2. 修改表: formula_versions

### 2.1 变更内容

仅修改 `status` 字段的 CHECK 约束，新增 `pending_review` 可选值。其余字段不变。

### 2.2 修改后完整表定义（SQLite）

```sql
CREATE TABLE IF NOT EXISTS formula_versions (
  version_id              TEXT PRIMARY KEY,
  formula_id              TEXT NOT NULL,
  version_number          TEXT NOT NULL,
  version_name            TEXT DEFAULT NULL,
  version_reason          TEXT DEFAULT NULL,
  changes_json            TEXT DEFAULT NULL,
  snapshot_json           TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
  is_current              INTEGER NOT NULL DEFAULT 0,
  ratio_factor            REAL NOT NULL DEFAULT 0.18
                          CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0
                          CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  created_by              TEXT NOT NULL,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
```

### 2.3 修改后完整表定义（MySQL）

```sql
CREATE TABLE IF NOT EXISTS formula_versions (
  version_id              VARCHAR(36) PRIMARY KEY,
  formula_id              VARCHAR(36) NOT NULL,
  version_number          VARCHAR(50) NOT NULL,
  version_name            VARCHAR(255) DEFAULT NULL,
  version_reason          TEXT DEFAULT NULL,
  changes_json            JSON DEFAULT NULL,
  snapshot_json           JSON NOT NULL,
  status                  VARCHAR(20) NOT NULL DEFAULT 'draft',
  is_current              TINYINT(1) NOT NULL DEFAULT 0,
  ratio_factor            DECIMAL(5,3) NOT NULL DEFAULT 0.18,
  supplement_ratio_factor DECIMAL(5,3) NOT NULL DEFAULT 1.0,
  created_by              VARCHAR(36) NOT NULL,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_formula_id (formula_id),
  INDEX idx_status (status),
  INDEX idx_is_current (is_current),
  INDEX idx_formula_status (formula_id, status),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.4 字段变更明细

| 字段 | 变更类型 | 变更前 | 变更后 |
|------|----------|--------|--------|
| status | CHECK 约束修改 | `IN ('draft', 'published', 'archived')` | `IN ('draft', 'pending_review', 'published', 'archived')` |

> 注意: MySQL 不支持列级 CHECK 约束（项目 adaptSQL 函数会移除 CHECK），状态校验由应用层保证。

---

## 3. 新增表: formula_review_logs

### 3.1 表定义（SQLite）

```sql
CREATE TABLE IF NOT EXISTS formula_review_logs (
  review_log_id  TEXT PRIMARY KEY,
  version_id     TEXT NOT NULL,
  reviewer_id    TEXT NOT NULL,
  reviewer_name  TEXT DEFAULT NULL,
  action         TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
  comment        TEXT DEFAULT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_frl_version  ON formula_review_logs(version_id);
CREATE INDEX IF NOT EXISTS idx_frl_reviewer ON formula_review_logs(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_frl_action   ON formula_review_logs(action);
```

### 3.2 表定义（MySQL）

```sql
CREATE TABLE IF NOT EXISTS formula_review_logs (
  review_log_id  VARCHAR(36) PRIMARY KEY,
  version_id     VARCHAR(36) NOT NULL,
  reviewer_id    VARCHAR(36) NOT NULL,
  reviewer_name  VARCHAR(255) DEFAULT NULL,
  action         VARCHAR(20) NOT NULL,
  comment        TEXT DEFAULT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_frl_version  (version_id),
  INDEX idx_frl_reviewer (reviewer_id),
  INDEX idx_frl_action   (action),
  FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 字段说明

| 字段 | SQLite 类型 | MySQL 类型 | 必填 | 默认值 | 说明 |
|------|-------------|------------|------|--------|------|
| review_log_id | TEXT PK | VARCHAR(36) PK | 是 | — | 审批日志 ID，UUID，使用 `generateId()` 生成 |
| version_id | TEXT | VARCHAR(36) | 是 | — | 关联配方版本 ID，FK → formula_versions.version_id，CASCADE 删除 |
| reviewer_id | TEXT | VARCHAR(36) | 是 | — | 审批人用户 ID，FK → users.id，SET NULL 删除 |
| reviewer_name | TEXT | VARCHAR(255) | 否 | NULL | 审批人姓名（冗余存储，避免联表查询） |
| action | TEXT | VARCHAR(20) | 是 | — | 审批动作：submit=提交审批、approve=审批通过、reject=审批驳回 |
| comment | TEXT | TEXT | 否 | NULL | 审批意见/备注 |
| created_at | TEXT | TIMESTAMP | 是 | 当前时间 | 操作时间 |

### 3.4 action 枚举值说明

| action 值 | 说明 | 触发场景 | formula_versions.status 变更 |
|------------|------|----------|------------------------------|
| `submit` | 提交审批 | 配方师完成编辑后提交 | draft → pending_review |
| `approve` | 审批通过 | 管理员审核通过 | pending_review → published |
| `reject` | 审批驳回 | 管理员审核驳回 | pending_review → draft |

### 3.5 数据示例

```sql
-- 配方师提交审批
INSERT INTO formula_review_logs (review_log_id, version_id, reviewer_id, reviewer_name, action, comment, created_at)
VALUES ('rl_001', 'v_abc123', 'u_formulist01', '张三', 'submit', '新增枸杞原料，调整配比', '2026-05-22 10:00:00');

-- 管理员审批通过
INSERT INTO formula_review_logs (review_log_id, version_id, reviewer_id, reviewer_name, action, comment, created_at)
VALUES ('rl_002', 'v_abc123', 'u_admin01', '李管理', 'approve', '配比合理，批准发布', '2026-05-22 14:30:00');

-- 管理员审批驳回
INSERT INTO formula_review_logs (review_log_id, version_id, reviewer_id, reviewer_name, action, comment, created_at)
VALUES ('rl_003', 'v_def456', 'u_admin01', '李管理', 'reject', '枸杞用量超标，请调整后重新提交', '2026-05-22 15:00:00');
```

---

## 4. 索引设计

### 4.1 新增索引

| 索引名 | 表 | 列 | 类型 | 用途 |
|--------|-----|-----|------|------|
| idx_fv_status | formula_versions | status | 单列 | 按状态筛选版本（如查询所有待审核版本） |
| idx_fv_formula_status | formula_versions | formula_id, status | 联合 | 按配方+状态组合查询（如某配方的待审核版本） |
| idx_frl_version | formula_review_logs | version_id | 单列 | 查询某版本的全部审批记录 |
| idx_frl_reviewer | formula_review_logs | reviewer_id | 单列 | 查询某审批人的操作记录 |
| idx_frl_action | formula_review_logs | action | 单列 | 按动作类型筛选（如统计驳回率） |

### 4.2 已有索引（不变）

| 索引名 | 表 | 列 |
|--------|-----|-----|
| idx_fv_formula | formula_versions | formula_id |
| idx_fv_version_number | formula_versions | formula_id, version_number |

---

## 5. 迁移脚本

### 5.1 文件位置

`backend/src/scripts/migrations/addPendingReviewStatus.ts`

### 5.2 完整脚本

```typescript
import { query, connectDatabase, getDatabaseType } from "../../config/database.js";
import { generateId } from "../../utils/helpers.js";

connectDatabase();

/**
 * 迁移：配方版本审批流程优化
 * 1. 修改 formula_versions.status CHECK 约束，新增 pending_review
 * 2. 创建 formula_review_logs 审批日志表
 * 3. 创建相关索引
 *
 * 幂等性：所有操作均使用 IF NOT EXISTS 或先检查后执行，可重复运行
 */
async function migrateAddPendingReviewStatus() {
  console.log("[Migration] 开始配方版本审批流程迁移...");
  const dbType = getDatabaseType();

  try {
    // ═══════════════════════════════════════════════════════
    // 步骤 1: 修改 formula_versions.status CHECK 约束
    // ═══════════════════════════════════════════════════════

    if (dbType === "sqlite") {
      // SQLite 不支持 ALTER COLUMN，需要重建表
      await migrateSqliteStatusConstraint();
    } else {
      // MySQL: 直接修改列定义
      await migrateMysqlStatusConstraint();
    }

    // ═══════════════════════════════════════════════════════
    // 步骤 2: 创建 formula_review_logs 表
    // ═══════════════════════════════════════════════════════

    await createReviewLogsTable(dbType);

    // ═══════════════════════════════════════════════════════
    // 步骤 3: 创建索引
    // ═══════════════════════════════════════════════════════

    await createIndexes(dbType);

    // ═══════════════════════════════════════════════════════
    // 步骤 4: 验证
    // ═══════════════════════════════════════════════════════

    await verifyMigration(dbType);

    console.log("[Migration] 配方版本审批流程迁移完成");
  } catch (error: any) {
    console.error("[Migration] 迁移失败:", error.message);
    throw error;
  }
}

/**
 * SQLite: 通过重建表修改 CHECK 约束
 * SQLite 不支持 ALTER COLUMN，标准做法是：
 * 1. 创建新表（含新约束）
 * 2. 复制数据
 * 3. 删除旧表
 * 4. 重命名新表
 */
async function migrateSqliteStatusConstraint() {
  console.log("[Migration] SQLite: 检查 formula_versions.status 约束...");

  // 检查当前约束是否已包含 pending_review
  const [tableInfo]: any[] = await query(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='formula_versions'"
  );

  if (tableInfo.length > 0) {
    const createSQL = tableInfo[0].sql as string;
    if (createSQL.includes("pending_review")) {
      console.log("[Migration] SQLite: status 约束已包含 pending_review，跳过");
      return;
    }
  }

  console.log("[Migration] SQLite: 重建 formula_versions 表以更新 CHECK 约束...");

  // 在事务中执行重建
  await query("BEGIN TRANSACTION");

  try {
    // 1. 创建临时新表
    await query(`
      CREATE TABLE IF NOT EXISTS formula_versions_new (
        version_id              TEXT PRIMARY KEY,
        formula_id              TEXT NOT NULL,
        version_number          TEXT NOT NULL,
        version_name            TEXT DEFAULT NULL,
        version_reason          TEXT DEFAULT NULL,
        changes_json            TEXT DEFAULT NULL,
        snapshot_json           TEXT NOT NULL,
        status                  TEXT NOT NULL DEFAULT 'draft'
                                CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
        is_current              INTEGER NOT NULL DEFAULT 0,
        ratio_factor            REAL NOT NULL DEFAULT 0.18
                                CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
        supplement_ratio_factor REAL NOT NULL DEFAULT 1.0
                                CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
        created_by              TEXT NOT NULL,
        created_at              TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
      )
    `);

    // 2. 复制数据
    await query(`
      INSERT INTO formula_versions_new
        (version_id, formula_id, version_number, version_name, version_reason,
         changes_json, snapshot_json, status, is_current,
         ratio_factor, supplement_ratio_factor, created_by, created_at)
      SELECT
        version_id, formula_id, version_number, version_name, version_reason,
        changes_json, snapshot_json, status, is_current,
        ratio_factor, supplement_ratio_factor, created_by, created_at
      FROM formula_versions
    `);

    // 3. 删除旧表
    await query("DROP TABLE formula_versions");

    // 4. 重命名新表
    await query("ALTER TABLE formula_versions_new RENAME TO formula_versions");

    // 5. 重建原有索引
    await query("CREATE INDEX IF NOT EXISTS idx_fv_formula ON formula_versions(formula_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_fv_version_number ON formula_versions(formula_id, version_number)");

    await query("COMMIT");
    console.log("[Migration] SQLite: formula_versions 表重建完成");
  } catch (error) {
    await query("ROLLBACK");
    console.error("[Migration] SQLite: 表重建失败，已回滚:", error);
    throw error;
  }
}

/**
 * MySQL: 直接修改列定义
 */
async function migrateMysqlStatusConstraint() {
  console.log("[Migration] MySQL: 修改 formula_versions.status 列...");

  // MySQL 不支持列级 CHECK（项目 adaptSQL 会移除），但修改 VARCHAR 长度以容纳新值
  // status 列已为 VARCHAR(20)，'pending_review' 为 14 字符，无需扩展
  // 仅需确认列定义正确，应用层负责枚举校验

  // 检查是否已存在 pending_review 值的数据（说明已迁移过）
  const { rows }: any = await query(
    "SELECT COUNT(*) as cnt FROM formula_versions WHERE status = 'pending_review'"
  );

  if (rows[0]?.cnt > 0) {
    console.log("[Migration] MySQL: 已存在 pending_review 状态数据，跳过");
    return;
  }

  console.log("[Migration] MySQL: status 列定义无需修改（VARCHAR(20) 足够），应用层负责枚举校验");
}

/**
 * 创建 formula_review_logs 表
 */
async function createReviewLogsTable(dbType: string) {
  console.log("[Migration] 创建 formula_review_logs 表...");

  if (dbType === "sqlite") {
    await query(`
      CREATE TABLE IF NOT EXISTS formula_review_logs (
        review_log_id  TEXT PRIMARY KEY,
        version_id     TEXT NOT NULL,
        reviewer_id    TEXT NOT NULL,
        reviewer_name  TEXT DEFAULT NULL,
        action         TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
        comment        TEXT DEFAULT NULL,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS formula_review_logs (
        review_log_id  VARCHAR(36) PRIMARY KEY,
        version_id     VARCHAR(36) NOT NULL,
        reviewer_id    VARCHAR(36) NOT NULL,
        reviewer_name  VARCHAR(255) DEFAULT NULL,
        action         VARCHAR(20) NOT NULL,
        comment        TEXT DEFAULT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_frl_version  (version_id),
        INDEX idx_frl_reviewer (reviewer_id),
        INDEX idx_frl_action   (action),
        FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  console.log("[Migration] formula_review_logs 表创建完成");
}

/**
 * 创建索引（SQLite 的 review_logs 索引需单独创建，MySQL 已在建表时创建）
 */
async function createIndexes(dbType: string) {
  console.log("[Migration] 创建索引...");

  // formula_versions 新增索引
  await query("CREATE INDEX IF NOT EXISTS idx_fv_status ON formula_versions(status)");
  await query("CREATE INDEX IF NOT EXISTS idx_fv_formula_status ON formula_versions(formula_id, status)");

  // formula_review_logs 索引（SQLite 需单独创建）
  if (dbType === "sqlite") {
    await query("CREATE INDEX IF NOT EXISTS idx_frl_version ON formula_review_logs(version_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_frl_reviewer ON formula_review_logs(reviewer_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_frl_action ON formula_review_logs(action)");
  }

  console.log("[Migration] 索引创建完成");
}

/**
 * 验证迁移结果
 */
async function verifyMigration(dbType: string) {
  console.log("[Migration] 验证迁移结果...");

  // 验证 formula_versions 表结构
  if (dbType === "sqlite") {
    const [tableInfo]: any[] = await query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='formula_versions'"
    );
    if (tableInfo.length > 0) {
      const sql = tableInfo[0].sql as string;
      if (sql.includes("pending_review")) {
        console.log("[Migration] 验证通过: formula_versions.status 约束已包含 pending_review");
      } else {
        console.error("[Migration] 验证失败: formula_versions.status 约束未包含 pending_review");
      }
    }
  } else {
    console.log("[Migration] MySQL: 应用层负责 status 枚举校验");
  }

  // 验证 formula_review_logs 表存在
  if (dbType === "sqlite") {
    const [tableInfo]: any[] = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='formula_review_logs'"
    );
    if (tableInfo.length > 0) {
      console.log("[Migration] 验证通过: formula_review_logs 表已创建");
    } else {
      console.error("[Migration] 验证失败: formula_review_logs 表未创建");
    }
  } else {
    const { rows }: any = await query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'formula_review_logs'"
    );
    if (rows[0]?.cnt > 0) {
      console.log("[Migration] 验证通过: formula_review_logs 表已创建");
    } else {
      console.error("[Migration] 验证失败: formula_review_logs 表未创建");
    }
  }

  // 验证索引
  if (dbType === "sqlite") {
    const [indexes]: any[] = await query(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='formula_versions' AND name LIKE 'idx_fv_%'"
    );
    console.log(`[Migration] formula_versions 索引数: ${indexes.length}`);

    const [logIndexes]: any[] = await query(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='formula_review_logs'"
    );
    console.log(`[Migration] formula_review_logs 索引数: ${logIndexes.length}`);
  }

  // 统计现有数据
  const { rows: fvCount }: any = await query("SELECT COUNT(*) as total FROM formula_versions");
  console.log(`[Migration] formula_versions 现有记录: ${fvCount[0]?.total || 0} 条`);

  const { rows: rlCount }: any = await query("SELECT COUNT(*) as total FROM formula_review_logs");
  console.log(`[Migration] formula_review_logs 现有记录: ${rlCount[0]?.total || 0} 条`);
}

// 执行迁移
migrateAddPendingReviewStatus()
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("迁移失败:", err);
    process.exit(1);
  });
```

---

## 6. 数据完整性规则

### 6.1 外键约束

| 子表 | 外键字段 | 父表 | 父表字段 | 删除策略 |
|------|----------|------|----------|----------|
| formula_review_logs | version_id | formula_versions | version_id | CASCADE（版本删除时级联删除审批日志） |
| formula_review_logs | reviewer_id | users | id | SET NULL（用户删除时保留日志，审批人置空） |

### 6.2 状态流转约束（应用层强制）

```
+----------+    submit     +-----------------+    approve    +-----------+
|  draft   | ──────────→  | pending_review  | ──────────→  | published |
+----------+              +-----------------+              +-----------+
     ↑                           │                              │
     │          reject           │                          archive
     +───────────────────────────+                              │
                                                             ↓
                                                        +-----------+
                                                        | archived  |
                                                        +-----------+
```

**应用层必须校验的规则**:

| 当前状态 | 允许转换 | 操作人 | 说明 |
|----------|----------|--------|------|
| draft | pending_review | 配方师（formulist） | 提交审批 |
| pending_review | published | 管理员（admin） | 审批通过 |
| pending_review | draft | 管理员（admin） | 审批驳回 |
| published | archived | 管理员（admin） | 归档旧版本 |
| draft | draft | 配方师（formulist） | 保存草稿（不产生审批日志） |

**禁止的转换**:

- draft → published（必须经过审批）
- archived → 任何状态（归档不可逆）
- published → draft（已发布不可回退为草稿）

### 6.3 审批日志一致性规则

1. **每次状态变更必须记录**: 当 formula_versions.status 从一个值变更为另一个值时（draft → pending_review、pending_review → published、pending_review → draft），必须在 formula_review_logs 中插入对应记录
2. **submit 操作**: reviewer_id 为提交人（配方师本人）
3. **approve/reject 操作**: reviewer_id 必须为管理员（admin 角色），不允许配方师审批自己的提交
4. **comment 可选但建议填写**: reject 操作强烈建议填写驳回原因
5. **时间顺序**: 同一 version_id 的审批日志 created_at 必须严格递增

### 6.4 并发安全

- 同一版本同一时刻只允许一条 pending_review 状态记录
- 审批操作应使用乐观锁或数据库事务保证原子性
- 示例: 审批通过时，应在同一事务中完成:
  1. 更新 formula_versions.status = 'published'
  2. 插入 formula_review_logs(action = 'approve')

---

## 7. 回滚方案

### 7.1 回滚步骤

若需回滚本次迁移，按以下顺序执行:

**步骤 1: 处理 pending_review 状态数据**

```sql
-- 将所有 pending_review 状态回退为 draft
UPDATE formula_versions SET status = 'draft' WHERE status = 'pending_review';
```

**步骤 2: 删除 formula_review_logs 表**

```sql
-- SQLite
DROP INDEX IF EXISTS idx_frl_version;
DROP INDEX IF EXISTS idx_frl_reviewer;
DROP INDEX IF EXISTS idx_frl_action;
DROP TABLE IF EXISTS formula_review_logs;

-- MySQL
DROP TABLE IF EXISTS formula_review_logs;
```

**步骤 3: 删除新增索引**

```sql
-- SQLite / MySQL
DROP INDEX IF EXISTS idx_fv_status ON formula_versions;
DROP INDEX IF EXISTS idx_fv_formula_status ON formula_versions;
```

**步骤 4: 恢复 formula_versions.status CHECK 约束（仅 SQLite）**

SQLite 需要重建表以移除 `pending_review`:

```sql
BEGIN TRANSACTION;

CREATE TABLE formula_versions_rollback (
  version_id              TEXT PRIMARY KEY,
  formula_id              TEXT NOT NULL,
  version_number          TEXT NOT NULL,
  version_name            TEXT DEFAULT NULL,
  version_reason          TEXT DEFAULT NULL,
  changes_json            TEXT DEFAULT NULL,
  snapshot_json           TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK(status IN ('draft', 'published', 'archived')),
  is_current              INTEGER NOT NULL DEFAULT 0,
  ratio_factor            REAL NOT NULL DEFAULT 0.18
                          CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0
                          CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  created_by              TEXT NOT NULL,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);

INSERT INTO formula_versions_rollback
  (version_id, formula_id, version_number, version_name, version_reason,
   changes_json, snapshot_json, status, is_current,
   ratio_factor, supplement_ratio_factor, created_by, created_at)
SELECT
  version_id, formula_id, version_number, version_name, version_reason,
  changes_json, snapshot_json, status, is_current,
  ratio_factor, supplement_ratio_factor, created_by, created_at
FROM formula_versions;

DROP TABLE formula_versions;
ALTER TABLE formula_versions_rollback RENAME TO formula_versions;

CREATE INDEX IF NOT EXISTS idx_fv_formula ON formula_versions(formula_id);
CREATE INDEX IF NOT EXISTS idx_fv_version_number ON formula_versions(formula_id, version_number);

COMMIT;
```

**步骤 5: MySQL 恢复**

MySQL 无需恢复 CHECK 约束（项目不使用 MySQL CHECK），仅需确认应用层移除 pending_review 相关逻辑即可。

### 7.2 回滚注意事项

- 回滚前务必备份数据库（`backend/data/backup/`）
- pending_review 状态的版本回退为 draft 后，对应的审批日志随 formula_review_logs 表删除而丢失
- 如需保留审批日志数据，请在删除表前导出
- 回滚后需同步更新 init.sql 和 mysql-init.sql 中的表定义

---

## 8. init.sql / mysql-init.sql 更新说明

迁移完成后，需同步更新以下文件中的表定义:

### 8.1 init.sql（SQLite）

将 formula_versions 表的 status CHECK 约束修改为:

```sql
status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
```

在 formula_versions 表后追加 formula_review_logs 建表语句和索引。

### 8.2 mysql-init.sql（MySQL）

在 formula_versions 表后追加 formula_review_logs 建表语句（含索引）。

---

## 9. 常用查询参考

### 9.1 查询待审核版本列表

```sql
SELECT fv.*, u.display_name AS creator_name
FROM formula_versions fv
LEFT JOIN users u ON fv.created_by = u.id
WHERE fv.status = 'pending_review'
ORDER BY fv.created_at DESC;
```

### 9.2 查询某版本的完整审批记录

```sql
SELECT frl.*, u.display_name AS reviewer_display_name
FROM formula_review_logs frl
LEFT JOIN users u ON frl.reviewer_id = u.id
WHERE frl.version_id = ?
ORDER BY frl.created_at ASC;
```

### 9.3 查询某配方的版本及审批状态

```sql
SELECT fv.version_id, fv.version_number, fv.status, fv.created_at,
       (SELECT frl.action FROM formula_review_logs frl
        WHERE frl.version_id = fv.version_id
        ORDER BY frl.created_at DESC LIMIT 1) AS last_action,
       (SELECT frl.reviewer_name FROM formula_review_logs frl
        WHERE frl.version_id = fv.version_id
        ORDER BY frl.created_at DESC LIMIT 1) AS last_reviewer
FROM formula_versions fv
WHERE fv.formula_id = ?
ORDER BY fv.created_at DESC;
```

### 9.4 统计审批通过率

```sql
SELECT
  COUNT(CASE WHEN action = 'submit' THEN 1 END)  AS total_submitted,
  COUNT(CASE WHEN action = 'approve' THEN 1 END) AS total_approved,
  COUNT(CASE WHEN action = 'reject' THEN 1 END)  AS total_rejected,
  ROUND(
    COUNT(CASE WHEN action = 'approve' THEN 1 END) * 100.0 /
    NULLIF(COUNT(CASE WHEN action = 'submit' THEN 1 END), 0), 1
  ) AS approval_rate
FROM formula_review_logs;
```
