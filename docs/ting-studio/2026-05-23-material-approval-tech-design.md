# 技术方案：原料审批工作流与发布/草稿状态管理

| 字段 | 值 |
|------|-----|
| 文档编号 | TS-TECH-20260523-001 |
| 版本 | v1.0 |
| 创建日期 | 2026-05-23 |
| 关联 PRD | TS-PRD-20260523-001 |

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MaterialList.vue  ·  MaterialForm.vue               │   │
│  │  ApprovalCard.vue (增强)                              │   │
│  │  AdminReviewPanel.vue (增强)                          │   │
│  │  MyApprovalPanel.vue (增强)                           │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │ Pinia                              │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  materialStore.ts (增强) + approvalStore.ts (增强)    │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP /api/materials/*
┌─────────────────────────┼───────────────────────────────────┐
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes: /api/materials                              │   │
│  │    POST   /:id/submit-review  → 提交审批              │   │
│  │    PUT    /:id/approve        → 审批通过              │   │
│  │    PUT    /:id/reject         → 审批驳回              │   │
│  │    PUT    /:id/publish        → 直接发布              │   │
│  │    GET    /pending-review     → 待审批列表             │   │
│  │    GET    /:id/review-logs    → 审批日志              │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  Controllers: materialController.ts (增强)            │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  Services: materialService.ts (增强)                  │   │
│  │           materialReviewService.ts (新增)             │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  Database (SQLite/MySQL)                              │   │
│  │    materials 表 (新增 status 字段)                     │   │
│  │    material_review_logs 表 (新增)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 后端设计

### 2.1 新增文件

| 文件 | 说明 |
|------|------|
| `backend/src/services/materialReviewService.ts` | 原料审批业务逻辑 |
| `backend/src/scripts/migrations/addStatusToMaterials.ts` | 数据库迁移脚本 |

### 2.2 修改文件

| 文件 | 变更说明 |
|------|---------|
| `backend/src/controllers/materialController.ts` | 新增审批相关控制器函数 |
| `backend/src/routes/materials.ts` | 注册审批相关路由 |
| `backend/src/services/materialService.ts` | 修改创建/更新逻辑，增加 status 处理 |
| `backend/src/scripts/init.sql` | materials 表增加 status 字段，新增 material_review_logs 表 |
| `backend/src/config/database-better-sqlite3.ts` | 同步建表语句 |

### 2.3 materialReviewService.ts 设计

```typescript
import { query } from "../config/database-adapter.js";
import { generateId, now } from "../utils/helpers.js";
import { rowsToCamelCase, rowToCamelCase } from "../utils/helpers.js";

interface ReviewLogRow {
  review_log_id: string;
  material_id: string;
  reviewer_id: string;
  reviewer_name: string | null;
  action: "submit" | "approve" | "reject" | "publish";
  comment: string | null;
  created_at: string;
}

export async function createReviewLog(params: {
  materialId: string;
  reviewerId: string;
  action: "submit" | "approve" | "reject" | "publish";
  comment?: string;
}): Promise<string> {
  const logId = generateId();
  const reviewerName = await getReviewerName(params.reviewerId);
  await query(
    `INSERT INTO material_review_logs
     (review_log_id, material_id, reviewer_id, reviewer_name, action, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [logId, params.materialId, params.reviewerId, reviewerName, params.action, params.comment || null, now()]
  );
  return logId;
}

export async function getReviewLogs(materialId: string): Promise<any[]> {
  const [logs] = await query(
    `SELECT mrl.*, u.display_name as reviewer_display_name
     FROM material_review_logs mrl
     LEFT JOIN users u ON mrl.reviewer_id = u.id
     WHERE mrl.material_id = ?
     ORDER BY mrl.created_at DESC`,
    [materialId]
  );
  return rowsToCamelCase(logs);
}

export async function getPendingReviewList(params: {
  keyword?: string;
  page: number;
  pageSize: number;
}): Promise<any> {
  const { keyword, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  let whereClause = "WHERE m.status = 'pending_review' AND m.is_deleted = 0 AND m.is_latest = 1";
  const queryParams: any[] = [];

  if (keyword) {
    whereClause += " AND (m.name LIKE ? OR m.code LIKE ?)";
    queryParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM materials m ${whereClause}`,
    queryParams
  );

  const [list] = await query(
    `SELECT m.*, u.display_name as submitter_name
     FROM materials m
     LEFT JOIN users u ON m.created_by = u.id
     ${whereClause}
     ORDER BY m.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );

  return {
    list: rowsToCamelCase(list),
    pagination: {
      page,
      pageSize,
      total: countResult[0]?.total || 0,
      totalPages: Math.ceil((countResult[0]?.total || 0) / pageSize),
    },
  };
}

async function getReviewerName(userId: string): Promise<string | null> {
  const [rows] = await query("SELECT display_name FROM users WHERE id = ?", [userId]);
  return rows?.[0]?.display_name || null;
}
```

### 2.4 materialController.ts 新增函数

```typescript
export async function submitMaterialReview(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { comment } = req.body || {};
    const userId = req.user.userId;
    const isAdmin = req.user.role === "admin";

    const [rows] = await query(
      "SELECT id, status, created_by FROM materials WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (!rows || rows.length === 0) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    const material = rows[0];
    if (material.status !== "draft") {
      res.status(400).json({ success: false, error: { message: "仅草稿状态的原料可提交审批", code: "VALIDATION_ERROR" } });
      return;
    }

    if (!isAdmin && material.created_by !== userId) {
      res.status(403).json({ success: false, error: { message: "仅创建者或管理员可提交审批", code: "FORBIDDEN" } });
      return;
    }

    await query("UPDATE materials SET status = 'pending_review', updated_at = ? WHERE id = ?", [now(), id]);
    await materialReviewService.createReviewLog({
      materialId: id, reviewerId: userId, action: "submit", comment
    });

    res.json(success({ id, status: "pending_review" }));
  } catch (error: any) {
    console.error("[MaterialController] submitReview error:", error);
    res.status(500).json({ success: false, error: { message: "操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function approveMaterial(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { comment } = req.body || {};
    const userId = req.user.userId;

    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, error: { message: "仅管理员可审批", code: "FORBIDDEN" } });
      return;
    }

    const [rows] = await query(
      "SELECT id, status, code FROM materials WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (!rows || rows.length === 0) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    if (rows[0].status !== "pending_review") {
      res.status(400).json({ success: false, error: { message: "仅待审批状态的原料可审批", code: "VALIDATION_ERROR" } });
      return;
    }

    await query("UPDATE materials SET status = 'published', updated_at = ? WHERE id = ?", [now(), id]);
    await materialReviewService.createReviewLog({
      materialId: id, reviewerId: userId, action: "approve", comment
    });

    res.json(success({ id, status: "published" }));
  } catch (error: any) {
    console.error("[MaterialController] approve error:", error);
    res.status(500).json({ success: false, error: { message: "操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function rejectMaterial(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { comment } = req.body || {};
    const userId = req.user.userId;

    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, error: { message: "仅管理员可驳回", code: "FORBIDDEN" } });
      return;
    }

    if (!comment || !comment.trim() || comment.trim().length < 5) {
      res.status(400).json({ success: false, error: { message: "驳回原因至少5个字符", code: "VALIDATION_ERROR" } });
      return;
    }

    const [rows] = await query(
      "SELECT id, status FROM materials WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (!rows || rows.length === 0) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    if (rows[0].status !== "pending_review") {
      res.status(400).json({ success: false, error: { message: "仅待审批状态的原料可驳回", code: "VALIDATION_ERROR" } });
      return;
    }

    await query("UPDATE materials SET status = 'draft', updated_at = ? WHERE id = ?", [now(), id]);
    await materialReviewService.createReviewLog({
      materialId: id, reviewerId: userId, action: "reject", comment
    });

    res.json(success({ id, status: "draft" }));
  } catch (error: any) {
    console.error("[MaterialController] reject error:", error);
    res.status(500).json({ success: false, error: { message: "操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function publishMaterial(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { comment } = req.body || {};
    const userId = req.user.userId;

    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, error: { message: "仅管理员可直接发布", code: "FORBIDDEN" } });
      return;
    }

    const [rows] = await query(
      "SELECT id, status FROM materials WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (!rows || rows.length === 0) {
      res.status(404).json({ success: false, error: { message: "原料不存在", code: "NOT_FOUND" } });
      return;
    }

    if (rows[0].status !== "draft" && rows[0].status !== "pending_review") {
      res.status(400).json({ success: false, error: { message: "仅草稿或待审批状态的原料可发布", code: "VALIDATION_ERROR" } });
      return;
    }

    await query("UPDATE materials SET status = 'published', updated_at = ? WHERE id = ?", [now(), id]);
    await materialReviewService.createReviewLog({
      materialId: id, reviewerId: userId, action: "publish", comment
    });

    res.json(success({ id, status: "published" }));
  } catch (error: any) {
    console.error("[MaterialController] publish error:", error);
    res.status(500).json({ success: false, error: { message: "操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function getMaterialPendingReviews(req: AuthRequest, res: Response) {
  try {
    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, error: { message: "仅管理员可查看待审批列表", code: "FORBIDDEN" } });
      return;
    }

    const keyword = req.query.keyword as string || "";
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

    const result = await materialReviewService.getPendingReviewList({ keyword, page, pageSize });
    res.json(successWithPagination(result.list, result.pagination));
  } catch (error: any) {
    console.error("[MaterialController] getPendingReviews error:", error);
    res.status(500).json({ success: false, error: { message: "操作失败", code: "INTERNAL_ERROR" } });
  }
}

export async function getMaterialReviewLogs(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const logs = await materialReviewService.getReviewLogs(id);
    res.json(success(logs));
  } catch (error: any) {
    console.error("[MaterialController] getReviewLogs error:", error);
    res.status(500).json({ success: false, error: { message: "操作失败", code: "INTERNAL_ERROR" } });
  }
}
```

### 2.5 materialService.ts 变更

**createMaterial 修改**：
- 新建原料默认 `status = 'draft'`
- INSERT 语句增加 status 字段

**updateMaterial 修改**：
- 检查原料 status，pending_review 状态不可编辑
- 已发布原料编辑时，新版本 status = 'draft'
- 草稿原料编辑保持 draft 状态

**getMaterialList 修改**：
- 增加 status 查询参数支持
- 默认查询条件增加 status 过滤

### 2.6 路由注册

```typescript
// materials.ts 新增路由
materialRoutes.post("/:id/submit-review", submitMaterialReview);
materialRoutes.put("/:id/approve", approveMaterial);
materialRoutes.put("/:id/reject", rejectMaterial);
materialRoutes.put("/:id/publish", publishMaterial);
materialRoutes.get("/pending-review", getMaterialPendingReviews);
materialRoutes.get("/:id/review-logs", getMaterialReviewLogs);
```

注意：`/pending-review` 路由需注册在 `/:id` 参数路由之前，避免路径冲突。

---

## 3. 前端设计

### 3.1 API 层变更

**frontend/src/api/material.ts 新增**：

```typescript
export interface MaterialReviewLog {
  reviewLogId: string;
  materialId: string;
  reviewerId: string;
  reviewerName: string | null;
  reviewerDisplayName?: string;
  action: "submit" | "approve" | "reject" | "publish";
  comment: string | null;
  createdAt: string;
}

export const materialApi = {
  // ... 既有接口

  submitReview(id: string, comment?: string) {
    return http.post(`/materials/${id}/submit-review`, { comment });
  },
  approve(id: string, comment?: string) {
    return http.put(`/materials/${id}/approve`, { comment });
  },
  reject(id: string, comment: string) {
    return http.put(`/materials/${id}/reject`, { comment });
  },
  publish(id: string, comment?: string) {
    return http.put(`/materials/${id}/publish`, { comment });
  },
  getPendingReviews(params?: { keyword?: string; page?: number; pageSize?: number }) {
    return http.get("/materials/pending-review", { params });
  },
  getReviewLogs(id: string) {
    return http.get(`/materials/${id}/review-logs`);
  },
};
```

### 3.2 Store 层变更

**frontend/src/stores/material.ts 增强**：

```typescript
// 新增状态
const statusFilter = ref<string>("all")

// 新增操作
async function submitReview(id: string, comment?: string) {
  const res = await materialApi.submitReview(id, comment);
  return res;
}

async function approveMaterial(id: string, comment?: string) {
  const res = await materialApi.approve(id, comment);
  return res;
}

async function rejectMaterial(id: string, comment: string) {
  const res = await materialApi.reject(id, comment);
  return res;
}

async function publishMaterial(id: string, comment?: string) {
  const res = await materialApi.publish(id, comment);
  return res;
}
```

**frontend/src/stores/approval.ts 增强**：

```typescript
// 新增状态
const materialPendingReviews = ref<any[]>([])
const materialPendingCount = ref(0)

// 新增操作
async function fetchMaterialPendingReviews() {
  const res = await materialApi.getPendingReviews();
  materialPendingReviews.value = res.list || [];
  materialPendingCount.value = res.pagination?.total || 0;
}
```

### 3.3 页面变更

#### 3.3.1 MaterialList.vue 增强

- 表格新增"状态"列，显示状态标签
- 筛选栏新增状态筛选 Tab：全部/草稿/待审批/已发布
- 操作列根据状态和角色显示不同按钮：
  - draft + 自己的/admin → 显示"编辑"+"提交审批"
  - pending_review + admin → 显示"通过"+"驳回"
  - published → 显示"编辑"（创建新版本）

状态标签样式：

| 状态 | 标签文案 | TDesign 主题 |
|------|---------|-------------|
| draft | "草稿" | `theme="default"` |
| pending_review | "待审批" | `theme="warning"` |
| published | "已发布" | `theme="success"` |

#### 3.3.2 MaterialForm.vue 增强

- 新建原料：顶部提示"新建原料为草稿状态，完成编辑后需提交审批"
- 编辑草稿原料：正常编辑模式
- 编辑已发布原料：版本化模式 + 新版本为草稿状态提示
- 新增"提交审批"按钮（草稿状态时显示）
- 新增"保存为草稿"按钮（草稿状态时显示）

#### 3.3.3 ApprovalCard.vue 增强

- 增加 Tab 切换：配方审批 / 原料审批
- admin 视角：两个 Tab 各自展示待审批列表
- formulist 视角：两个 Tab 各自展示提交追踪

#### 3.3.4 AdminReviewPanel.vue 增强

- 增加"原料审批"分区
- 展示待审批原料列表：名称、编码、类型、提交人、提交时间
- 每行提供"通过"/"驳回"操作

#### 3.3.5 MyApprovalPanel.vue 增强

- 增加"原料提交"分区
- 展示当前用户的原料提交记录及审批状态

---

## 4. 数据迁移方案

### 4.1 迁移脚本

文件：`backend/src/scripts/migrations/addStatusToMaterials.ts`

```typescript
import { query } from "../../config/database-adapter.js";

export async function migrateAddStatusToMaterials() {
  console.log("[Migration] 开始原料审批状态迁移...");

  // 1. 检查 status 字段是否已存在
  const tableInfo = await query("PRAGMA table_info(materials)");
  const hasStatus = tableInfo.some((col: any) => col.name === "status");

  if (!hasStatus) {
    // SQLite: ALTER TABLE ADD COLUMN
    await query("ALTER TABLE materials ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published'))");

    // 将所有现有原料设为 published（它们已经是可用状态）
    await query("UPDATE materials SET status = 'published' WHERE is_latest = 1 AND is_deleted = 0");
    // 历史版本（is_latest=0）也设为 published
    await query("UPDATE materials SET status = 'published' WHERE is_latest = 0 AND is_deleted = 0");

    // 创建索引
    await query("CREATE INDEX IF NOT EXISTS idx_material_status ON materials(status)");

    console.log("[Migration] ✅ materials 表 status 字段已添加");
  } else {
    console.log("[Migration] ⏭️ materials 表 status 字段已存在，跳过");
  }

  // 2. 创建 material_review_logs 表
  const tables = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='material_review_logs'");
  if (!tables || tables.length === 0) {
    await query(`
      CREATE TABLE IF NOT EXISTS material_review_logs (
        review_log_id TEXT PRIMARY KEY,
        material_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        reviewer_name TEXT DEFAULT NULL,
        action TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject', 'publish')),
        comment TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await query("CREATE INDEX IF NOT EXISTS idx_mrl_material ON material_review_logs(material_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_mrl_reviewer ON material_review_logs(reviewer_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_mrl_action ON material_review_logs(action)");
    await query("CREATE INDEX IF NOT EXISTS idx_mrl_created_at ON material_review_logs(created_at)");

    console.log("[Migration] ✅ material_review_logs 表已创建");
  } else {
    console.log("[Migration] ⏭️ material_review_logs 表已存在，跳过");
  }

  console.log("[Migration] ✅ 原料审批状态迁移完成");
}
```

### 4.2 init.sql 变更

materials 表建表语句增加：

```sql
`status` TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published')),
```

新增建表语句：

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
CREATE INDEX IF NOT EXISTS `idx_material_status` ON `materials`(`status`);
```

---

## 5. 权限检查矩阵

| 操作 | admin | 创建者 (formulist) | 其他用户 | 检查方式 |
|------|-------|-------------------|---------|---------|
| 创建草稿原料 | ✅ | ✅ | ❌ | authMiddleware |
| 编辑草稿原料 | ✅ | ✅ | ❌ | created_by 校验 |
| 提交审批 | ✅ | ✅ | ❌ | created_by 校验 |
| 审批通过 | ✅ | ❌ | ❌ | role === 'admin' |
| 审批驳回 | ✅ | ❌ | ❌ | role === 'admin' |
| 直接发布 | ✅ | ❌ | ❌ | role === 'admin' |
| 编辑已发布原料 | ✅ | ✅（创建新版本） | ❌ | created_by 校验 |
| 删除原料 | ✅ | ❌ | ❌ | role === 'admin' |
| 查看待审批列表 | ✅ | ❌ | ❌ | role === 'admin' |
| 查看审批日志 | ✅ | ✅ | ✅ | authMiddleware |

---

## 6. 状态转换规则

| 当前状态 | 操作 | 目标状态 | 允许角色 |
|---------|------|---------|---------|
| draft | 提交审批 | pending_review | 创建者、admin |
| draft | 直接发布 | published | admin |
| draft | 编辑 | draft | 创建者、admin |
| pending_review | 审批通过 | published | admin |
| pending_review | 审批驳回 | draft | admin |
| pending_review | 直接发布 | published | admin |
| published | 编辑（创建新版本） | 新版本=draft | 创建者、admin |

**禁止的状态转换**：
- published → draft（不允许直接降级，需通过编辑创建新版本）
- pending_review → 编辑（待审批状态不可编辑）
- published → pending_review（已发布不可回退到待审批）

---

## 7. 文件变更清单

### 后端

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `backend/src/services/materialReviewService.ts` | 新增 | 审批业务逻辑 |
| `backend/src/scripts/migrations/addStatusToMaterials.ts` | 新增 | 数据库迁移脚本 |
| `backend/src/controllers/materialController.ts` | 修改 | 新增审批控制器函数 |
| `backend/src/routes/materials.ts` | 修改 | 注册审批路由 |
| `backend/src/services/materialService.ts` | 修改 | 创建/更新逻辑增加 status 处理 |
| `backend/src/scripts/init.sql` | 修改 | 建表语句增加 status + review_logs |
| `backend/src/config/database-better-sqlite3.ts` | 修改 | 同步建表语句 |

### 前端

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `frontend/src/api/material.ts` | 修改 | 新增审批 API 方法 |
| `frontend/src/stores/material.ts` | 修改 | 新增审批状态和操作 |
| `frontend/src/stores/approval.ts` | 修改 | 新增原料审批数据 |
| `frontend/src/views/materials/MaterialList.vue` | 修改 | 状态标签、筛选、审批按钮 |
| `frontend/src/views/materials/MaterialForm.vue` | 修改 | 草稿提示、提交审批按钮 |
| `frontend/src/components/dashboard/ApprovalCard.vue` | 修改 | 集成原料审批 Tab |
| `frontend/src/components/dashboard/AdminReviewPanel.vue` | 修改 | 增加原料审批区 |
| `frontend/src/components/dashboard/MyApprovalPanel.vue` | 修改 | 增加原料提交追踪 |
