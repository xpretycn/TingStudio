# 数据库设计：原料审批工作流

| 字段 | 值 |
|------|-----|
| 文档编号 | TS-DB-20260523-001 |
| 版本 | v1.0 |
| 创建日期 | 2026-05-23 |
| 关联 PRD | TS-PRD-20260523-001 |

---

## 1. materials 表变更

### 1.1 新增字段

```sql
ALTER TABLE materials ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
  CHECK(status IN ('draft', 'pending_review', 'published'));
```

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | TEXT | NOT NULL, CHECK | `'draft'` | 原料审批状态 |

**status 枚举值**：

| 值 | 中文 | 说明 |
|-----|------|------|
| `draft` | 草稿 | 初始状态，可编辑 |
| `pending_review` | 待审批 | 已提交审批，等待管理员审核 |
| `published` | 已发布 | 审批通过，正式可用 |

### 1.2 新增索引

```sql
CREATE INDEX IF NOT EXISTS idx_material_status ON materials(status);
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
  `version` INTEGER NOT NULL DEFAULT 1,
  `previous_version_id` TEXT DEFAULT NULL,
  `is_latest` INTEGER NOT NULL DEFAULT 1,
  `is_deleted` INTEGER NOT NULL DEFAULT 0,
  `changes_json` TEXT DEFAULT NULL,
  `status` TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published')),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

CREATE INDEX IF NOT EXISTS `idx_material_name` ON `materials`(`name`);
CREATE INDEX IF NOT EXISTS `idx_material_code` ON `materials`(`code`);
CREATE INDEX IF NOT EXISTS `idx_material_type` ON `materials`(`material_type`);
CREATE INDEX IF NOT EXISTS `idx_material_version` ON `materials`(`version`);
CREATE INDEX IF NOT EXISTS `idx_material_previous_version` ON `materials`(`previous_version_id`);
CREATE INDEX IF NOT EXISTS `idx_material_is_latest` ON `materials`(`is_latest`);
CREATE INDEX IF NOT EXISTS `idx_material_is_deleted` ON `materials`(`is_deleted`);
CREATE INDEX IF NOT EXISTS `idx_material_status` ON `materials`(`status`);
CREATE INDEX IF NOT EXISTS `idx_material_created_by` ON `materials`(`created_by`);
```

---

## 2. material_review_logs 表（新增）

### 2.1 建表语句

```sql
CREATE TABLE IF NOT EXISTS `material_review_logs` (
  `review_log_id` TEXT PRIMARY KEY,
  `material_id` TEXT NOT NULL,
  `reviewer_id` TEXT NOT NULL,
  `reviewer_name` TEXT DEFAULT NULL,
  `action` TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject', 'publish')),
  `comment` TEXT DEFAULT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS `idx_mrl_material` ON `material_review_logs`(`material_id`);
CREATE INDEX IF NOT EXISTS `idx_mrl_reviewer` ON `material_review_logs`(`reviewer_id`);
CREATE INDEX IF NOT EXISTS `idx_mrl_action` ON `material_review_logs`(`action`);
CREATE INDEX IF NOT EXISTS `idx_mrl_created_at` ON `material_review_logs`(`created_at`);
```

### 2.2 字段说明

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `review_log_id` | TEXT | PRIMARY KEY | 日志唯一 ID，使用 `generateId()` 生成 |
| `material_id` | TEXT | NOT NULL, FK | 关联原料 ID |
| `reviewer_id` | TEXT | NOT NULL, FK | 操作人 ID |
| `reviewer_name` | TEXT | DEFAULT NULL | 操作人姓名（冗余存储，避免 JOIN） |
| `action` | TEXT | NOT NULL, CHECK | 操作类型：submit/approve/reject/publish |
| `comment` | TEXT | DEFAULT NULL | 审批意见/提交说明 |
| `created_at` | TEXT | NOT NULL | 操作时间 |

### 2.3 action 枚举值

| 值 | 中文 | 触发场景 | 对应状态变更 |
|-----|------|---------|-------------|
| `submit` | 提交审批 | formulist/admin 提交草稿 | draft → pending_review |
| `approve` | 审批通过 | admin 批准 | pending_review → published |
| `reject` | 审批驳回 | admin 驳回 | pending_review → draft |
| `publish` | 直接发布 | admin 直接发布 | draft/pending_review → published |

### 2.4 与 formula_review_logs 对比

| 维度 | formula_review_logs | material_review_logs |
|------|---------------------|---------------------|
| 关联表 | formula_versions | materials |
| action 枚举 | submit/approve/reject | submit/approve/reject/publish |
| 主键字段名 | review_log_id | review_log_id |
| 外键字段 | version_id | material_id |
| 额外字段 | 无 | 无 |

**关键差异**：material_review_logs 的 action 枚举增加了 `publish`，因为原料支持 admin 直接发布操作。

---

## 3. 关键查询

### 3.1 按状态查询原料

```sql
SELECT * FROM materials
WHERE status = ? AND is_deleted = 0 AND is_latest = 1
ORDER BY updated_at DESC
LIMIT ? OFFSET ?;
```

### 3.2 查询待审批原料（含提交人信息）

```sql
SELECT m.*, u.display_name as submitter_name
FROM materials m
LEFT JOIN users u ON m.created_by = u.id
WHERE m.status = 'pending_review' AND m.is_deleted = 0 AND m.is_latest = 1
ORDER BY m.updated_at DESC;
```

### 3.3 查询原料审批日志（含审核人信息）

```sql
SELECT mrl.*, u.display_name as reviewer_display_name
FROM material_review_logs mrl
LEFT JOIN users u ON mrl.reviewer_id = u.id
WHERE mrl.material_id = ?
ORDER BY mrl.created_at DESC;
```

### 3.4 统计各状态原料数量

```sql
SELECT status, COUNT(*) as count
FROM materials
WHERE is_deleted = 0 AND is_latest = 1
GROUP BY status;
```

### 3.5 查询用户的原料提交记录

```sql
SELECT m.*, mrl.action as latest_action, mrl.created_at as latest_action_at
FROM materials m
LEFT JOIN material_review_logs mrl ON mrl.material_id = m.id
  AND mrl.review_log_id = (
    SELECT review_log_id FROM material_review_logs
    WHERE material_id = m.id
    ORDER BY created_at DESC LIMIT 1
  )
WHERE m.created_by = ? AND m.is_deleted = 0
ORDER BY m.updated_at DESC;
```

### 3.6 查询已发布原料（配方选择用）

```sql
SELECT id, name, code, unit, stock, material_type, unit_price
FROM materials
WHERE status = 'published' AND is_deleted = 0 AND is_latest = 1
ORDER BY name;
```

---

## 4. 数据迁移

### 4.1 迁移策略

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | 检查 status 字段 | 若已存在则跳过 |
| 2 | ALTER TABLE ADD COLUMN | 添加 status 字段，默认值 'draft' |
| 3 | 更新现有数据 | 所有 is_latest=1 且 is_deleted=0 的原料设为 published |
| 4 | 更新历史版本 | is_latest=0 的原料也设为 published |
| 5 | 创建索引 | idx_material_status |
| 6 | 创建 review_logs 表 | material_review_logs |
| 7 | 创建 review_logs 索引 | 4 个索引 |

### 4.2 迁移后数据状态

| 原料类型 | 迁移后 status | 说明 |
|---------|--------------|------|
| is_latest=1, is_deleted=0 | published | 当前可用原料 |
| is_latest=0, is_deleted=0 | published | 历史版本 |
| is_deleted=1 | draft | 已删除原料（不影响业务） |

### 4.3 MySQL 兼容

MySQL 版本迁移脚本需额外处理：

```sql
-- MySQL 不支持 ALTER TABLE ADD COLUMN 带 CHECK 约束
-- 需通过应用层校验 status 枚举值

ALTER TABLE materials ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';
CREATE INDEX idx_material_status ON materials(status);

-- 创建 material_review_logs 表
CREATE TABLE IF NOT EXISTS material_review_logs (
  review_log_id VARCHAR(36) PRIMARY KEY,
  material_id VARCHAR(36) NOT NULL,
  reviewer_id VARCHAR(36) NOT NULL,
  reviewer_name VARCHAR(100) DEFAULT NULL,
  action VARCHAR(20) NOT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_mrl_material (material_id),
  INDEX idx_mrl_reviewer (reviewer_id),
  INDEX idx_mrl_action (action),
  INDEX idx_mrl_created_at (created_at)
);
```

---

## 5. 数据关系图

```
materials (增强)
  id (PK)
  code
  name, unit, stock, ...
  version
  previous_version_id (FK → materials.id)
  is_latest
  is_deleted
  changes_json
  status ← 新增 (draft/pending_review/published)
       │
       │ 1:N
       ▼
material_review_logs ← 新增表
  review_log_id (PK)
  material_id (FK → materials.id)
  reviewer_id (FK → users.id)
  reviewer_name
  action (submit/approve/reject/publish)
  comment
  created_at
       │
       │ N:1
       ▼
users
  id (PK)
  username
  display_name
  role
```

---

## 6. 约束与注意事项

| 约束 | 说明 |
|------|------|
| status 合法性 | 仅允许 draft/pending_review/published 三种值 |
| 新版本默认 draft | 创建新版本时 status 必须为 draft |
| 审批日志不可变 | 已创建的 material_review_logs 记录不可修改或删除 |
| 状态转换规则 | 仅允许定义的状态转换路径（见状态机图） |
| 配方选择限制 | 仅 status=published 的原料可出现在配方原料选择列表中 |
| 删除不受 status 限制 | 软删除操作不检查 status，仅检查权限（admin） |

### 状态转换约束（代码层面保证）

| 当前状态 | 允许转换 | 操作 |
|---------|---------|------|
| draft | pending_review | 提交审批 |
| draft | published | 直接发布（admin） |
| pending_review | published | 审批通过（admin） |
| pending_review | draft | 审批驳回（admin） |
| pending_review | published | 直接发布（admin） |
| published | draft（新版本） | 编辑创建新版本 |

**禁止的转换**：
- published → draft（同一条记录，不允许直接降级）
- published → pending_review（已发布不可回退）
- draft → draft（无意义，编辑保持 draft 不算状态转换）
