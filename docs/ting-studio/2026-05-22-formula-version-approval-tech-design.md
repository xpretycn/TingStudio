# 技术方案：配方版本审批流程与原料版本感知优化

> 日期：2026-05-22 | 模块：versions / materials | 优先级：高

---

## 1. 架构概述

### 1.1 现状分析

当前配方版本模块（`versionController.ts`）支持三个状态：`draft`、`published`、`archived`。发布操作由创建者直接执行，无审批环节。原料（`materials`）已具备版本化能力（`is_latest`、`previous_version_id`、`version` 字段），但配方版本快照中的原料数据不会随原料升级而更新。

**核心痛点**：

| 痛点 | 影响 | 涉及模块 |
|------|------|----------|
| 无审批流程，任何 formulist 可直接发布 | 生产配方数据风险高 | versionController |
| 原料升版后配方快照仍引用旧版原料 | 营养计算、成本报价不准确 | materialService + versionController |
| 无法切换"当前版本"到已发布的历史版本 | 只能重新发布，无法回滚 | versionController |

### 1.2 变更范围

```
后端
├── controllers/versionController.ts    — 新增 submitVersion / approveVersion / rejectVersion / getMaterialUpdates / refreshSnapshot / setCurrentVersion
├── routes/versions.ts                  — 新增 6 个端点
├── middleware/auth.ts                  — 复用现有 requirePermission（无变更）
├── services/reviewService.ts           — 新建：审批逻辑 + 审计日志
├── scripts/migrations/                 — 新增迁移脚本
│   ├── addPendingReviewToVersions.ts
│   └── createFormulaReviewLogs.ts
└── scripts/init.sql                    — 更新 formula_versions CHECK 约束 + 新增 formula_review_logs 建表

前端
├── api/version.ts                      — 新增 6 个 API 调用 + FormulaVersion.status 扩展
├── stores/version.ts                   — 新增 6 个 action
└── views/formulas/versions/VersionList.vue — 审批按钮 + 原料版本标签
```

### 1.3 状态机变更

```
变更前：  draft ──发布──→ published ──归档──→ archived

变更后：  draft ──提交──→ pending_review ──批准──→ published ──归档──→ archived
                                        └──驳回──→ draft
```

- `publishVersion` 保留为管理员直接发布（跳过审批），仅 admin 可调用
- `submitVersion` 为 formulist 提交审批入口，将 `draft` 变为 `pending_review`
- `approveVersion` 为 admin 批准，`pending_review` 变为 `published`
- `rejectVersion` 为 admin 驳回，`pending_review` 变回 `draft`

---

## 2. 模块设计

### 2.1 审批流程模块

#### 2.1.1 新增表：formula_review_logs

```sql
CREATE TABLE IF NOT EXISTS `formula_review_logs` (
  `review_log_id` TEXT PRIMARY KEY,           -- UUID, generateId()
  `version_id` TEXT NOT NULL,                 -- 关联 formula_versions.version_id
  `reviewer_id` TEXT NOT NULL,                -- 审批人 user.id
  `action` TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),  -- 操作类型
  `comment` TEXT DEFAULT NULL,                -- 审批意见（驳回时必填）
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`version_id`) REFERENCES `formula_versions`(`version_id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS `idx_frl_version` ON `formula_review_logs`(`version_id`);
CREATE INDEX IF NOT EXISTS `idx_frl_reviewer` ON `formula_review_logs`(`reviewer_id`);
CREATE INDEX IF NOT EXISTS `idx_frl_action` ON `formula_review_logs`(`action`);
```

MySQL 对应：

```sql
CREATE TABLE IF NOT EXISTS `formula_review_logs` (
  `review_log_id` VARCHAR(36) PRIMARY KEY,
  `version_id` VARCHAR(36) NOT NULL,
  `reviewer_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_version_id` (`version_id`),
  INDEX `idx_reviewer_id` (`reviewer_id`),
  INDEX `idx_action` (`action`),
  FOREIGN KEY (`version_id`) REFERENCES `formula_versions`(`version_id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.1.2 迁移脚本：addPendingReviewToVersions.ts

SQLite 不支持 `ALTER TABLE ... ALTER COLUMN` 修改 CHECK 约束，需采用重建表策略：

```typescript
// backend/src/scripts/migrations/addPendingReviewToVersions.ts
import { query, connectDatabase } from "../../config/database.js";

connectDatabase();

async function migrate() {
  console.log("[Migration] 开始 formula_versions 状态扩展迁移...");

  try {
    // SQLite: 检查当前 CHECK 约束是否已包含 pending_review
    const [tableInfo]: any[] = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='formula_versions'");
    const createSql = tableInfo?.[0]?.sql || "";

    if (createSql.includes("pending_review")) {
      console.log("[Migration] formula_versions 已包含 pending_review 状态，跳过");
      return;
    }

    // 1. 重命名旧表
    await query("ALTER TABLE formula_versions RENAME TO formula_versions_old");

    // 2. 创建新表（含扩展 CHECK 约束）
    await query(`
      CREATE TABLE formula_versions (
        version_id TEXT PRIMARY KEY,
        formula_id TEXT NOT NULL,
        version_number TEXT NOT NULL,
        version_name TEXT DEFAULT NULL,
        version_reason TEXT DEFAULT NULL,
        changes_json TEXT DEFAULT NULL,
        snapshot_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
        is_current INTEGER NOT NULL DEFAULT 0,
        ratio_factor REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
        supplement_ratio_factor REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
      )
    `);

    // 3. 迁移数据
    await query(`
      INSERT INTO formula_versions
      SELECT version_id, formula_id, version_number, version_name, version_reason,
             changes_json, snapshot_json, status, is_current, ratio_factor,
             supplement_ratio_factor, created_by, created_at
      FROM formula_versions_old
    `);

    // 4. 重建索引
    await query("CREATE INDEX idx_fv_formula ON formula_versions(formula_id)");
    await query("CREATE INDEX idx_fv_version_number ON formula_versions(formula_id, version_number)");
    await query("CREATE INDEX idx_fv_status ON formula_versions(status)");

    // 5. 删除旧表
    await query("DROP TABLE formula_versions_old");

    console.log("[Migration] formula_versions 状态扩展完成 (新增 pending_review)");
  } catch (error) {
    console.error("[Migration] 迁移失败:", error);
    throw error;
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
```

#### 2.1.3 新建 Service：reviewService.ts

```typescript
// backend/src/services/reviewService.ts
import { query } from "../config/database-better-sqlite3.js";
import { generateId, now, rowToCamelCase, rowsToCamelCase } from "../utils/helpers.js";

/** 记录审批日志 */
export async function createReviewLog(params: {
  versionId: string;
  reviewerId: string;
  action: "submit" | "approve" | "reject";
  comment?: string;
}): Promise<void> {
  const { versionId, reviewerId, action, comment } = params;
  await query(
    `INSERT INTO formula_review_logs (review_log_id, version_id, reviewer_id, action, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId(), versionId, reviewerId, action, comment || null, now()]
  );
}

/** 获取版本的审批日志 */
export async function getReviewLogs(versionId: string): Promise<any[]> {
  const [logs]: any[] = await query(
    `SELECT rl.*, u.display_name AS reviewer_name, u.role AS reviewer_role
     FROM formula_review_logs rl
     LEFT JOIN users u ON rl.reviewer_id = u.id
     WHERE rl.version_id = ?
     ORDER BY rl.created_at ASC`,
    [versionId]
  );
  return rowsToCamelCase(logs || []);
}

/** 检查版本是否属于当前用户（formulist 数据隔离） */
export async function isVersionOwner(versionId: string, userId: string): Promise<boolean> {
  const [[version]]: any[][] = await query(
    "SELECT created_by FROM formula_versions WHERE version_id = ?",
    [versionId]
  );
  return version?.created_by === userId;
}
```

#### 2.1.4 控制器新增函数

**submitVersion** — 提交审批

```typescript
/** 提交版本审批 */
export async function submitVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params;
    const userId = req.user.userId;

    const [[version]]: any[][] = await query(
      "SELECT * FROM formula_versions WHERE version_id = ?",
      [versionId]
    );
    if (!version) {
      res.status(404).json({ success: false, error: { message: "版本不存在", code: "NOT_FOUND" } });
      return;
    }

    if (version.status !== "draft") {
      res.status(400).json({ success: false, error: { message: "仅草稿版本可提交审批", code: "VALIDATION_ERROR" } });
      return;
    }

    // formulist 只能提交自己创建的版本
    if (req.user.role !== "admin" && version.created_by !== userId) {
      res.status(403).json({ success: false, error: { message: "无权提交他人版本", code: "FORBIDDEN" } });
      return;
    }

    await query(
      "UPDATE formula_versions SET status = 'pending_review' WHERE version_id = ?",
      [versionId]
    );

    await createReviewLog({
      versionId,
      reviewerId: userId,
      action: "submit",
    });

    res.json(success(null, "版本已提交审批"));
  } catch (error: any) {
    console.error("[Version] submitVersion Error:", error);
    res.status(500).json({ success: false, error: { message: "提交审批失败", code: "INTERNAL_ERROR" } });
  }
}
```

**approveVersion** — 批准版本

```typescript
/** 批准版本 */
export async function approveVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params;
    const userId = req.user.userId;
    const { comment } = req.body;

    // 仅 admin 可批准
    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, error: { message: "仅管理员可批准版本", code: "FORBIDDEN" } });
      return;
    }

    const [[version]]: any[][] = await query(
      "SELECT * FROM formula_versions WHERE version_id = ?",
      [versionId]
    );
    if (!version) {
      res.status(404).json({ success: false, error: { message: "版本不存在", code: "NOT_FOUND" } });
      return;
    }

    if (version.status !== "pending_review") {
      res.status(400).json({ success: false, error: { message: "仅待审批版本可批准", code: "VALIDATION_ERROR" } });
      return;
    }

    const formulaId = version.formula_id;

    // 将同一配方的其他版本归档
    await query(
      `UPDATE formula_versions SET is_current = 0, status = 'archived'
       WHERE formula_id = ? AND version_id <> ? AND status IN ('draft', 'pending_review', 'published')`,
      [formulaId, versionId]
    );

    // 批准当前版本
    await query(
      "UPDATE formula_versions SET status = 'published', is_current = 1 WHERE version_id = ?",
      [versionId]
    );

    // 快照回写 formulas 表（复用 publishVersion 的逻辑）
    await syncSnapshotToFormula(version, formulaId);

    // 记录审批日志
    await createReviewLog({
      versionId,
      reviewerId: userId,
      action: "approve",
      comment: comment || null,
    });

    res.json(success(null, "版本已批准并发布"));
  } catch (error: any) {
    console.error("[Version] approveVersion Error:", error);
    res.status(500).json({ success: false, error: { message: "批准版本失败", code: "INTERNAL_ERROR" } });
  }
}
```

**rejectVersion** — 驳回版本

```typescript
/** 驳回版本 */
export async function rejectVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params;
    const userId = req.user.userId;
    const { comment } = req.body;

    // 仅 admin 可驳回
    if (req.user.role !== "admin") {
      res.status(403).json({ success: false, error: { message: "仅管理员可驳回版本", code: "FORBIDDEN" } });
      return;
    }

    if (!comment?.trim()) {
      res.status(400).json({ success: false, error: { message: "驳回时必须填写意见", code: "VALIDATION_ERROR" } });
      return;
    }

    const [[version]]: any[][] = await query(
      "SELECT * FROM formula_versions WHERE version_id = ?",
      [versionId]
    );
    if (!version) {
      res.status(404).json({ success: false, error: { message: "版本不存在", code: "NOT_FOUND" } });
      return;
    }

    if (version.status !== "pending_review") {
      res.status(400).json({ success: false, error: { message: "仅待审批版本可驳回", code: "VALIDATION_ERROR" } });
      return;
    }

    // 驳回回退为草稿
    await query(
      "UPDATE formula_versions SET status = 'draft' WHERE version_id = ?",
      [versionId]
    );

    await createReviewLog({
      versionId,
      reviewerId: userId,
      action: "reject",
      comment: comment.trim(),
    });

    res.json(success(null, "版本已驳回"));
  } catch (error: any) {
    console.error("[Version] rejectVersion Error:", error);
    res.status(500).json({ success: false, error: { message: "驳回版本失败", code: "INTERNAL_ERROR" } });
  }
}
```

#### 2.1.5 快照回写提取为公共函数

当前 `publishVersion` 中的快照回写逻辑需要被 `approveVersion` 和 `setCurrentVersion` 复用，提取为独立函数：

```typescript
/** 将版本快照数据同步回 formulas 表 */
async function syncSnapshotToFormula(version: any, formulaId: string): Promise<void> {
  const snapshot = safeJsonParse(version.snapshot_json, {});
  const formulaData = snapshot.formulaData || snapshot;

  const [[formula]]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [formulaId]);
  if (!formula) return;

  if (snapshot.name || snapshot.materials || formulaData.name) {
    await query(
      `UPDATE formulas SET name=?, salesman_id=?, salesman_name=?, materials_json=?,
              finished_weight=?, ratio_factor=?, supplement_ratio_factor=?,
              packaging_price=?, other_price=?, profit_margin=?, description=? WHERE id=?`,
      [
        snapshot.name || formulaData.name || formula.name,
        snapshot.salesmanId || formulaData.salesmanId || formulaData.salesman_id || formula.salesman_id,
        snapshot.salesmanName || formulaData.salesmanName || formulaData.salesman_name || formula.salesman_name,
        JSON.stringify(snapshot.materials || formulaData.materials || []),
        formulaData.finished_weight ?? formulaData.finishedWeight ?? formula.finished_weight ?? 0,
        formulaData.ratio_factor ?? formulaData.ratioFactor ?? formula.ratio_factor ?? 0.18,
        formulaData.supplement_ratio_factor ?? formulaData.supplementRatioFactor ?? formula.supplement_ratio_factor ?? 1.0,
        snapshot.packagingPrice ?? formulaData.packaging_price ?? formulaData.packagingPrice ?? formula.packaging_price ?? 0,
        snapshot.otherPrice ?? formulaData.other_price ?? formulaData.otherPrice ?? formula.other_price ?? 0,
        snapshot.profitMargin ?? formulaData.profit_margin ?? formulaData.profitMargin ?? formula.profit_margin ?? 20,
        snapshot.description ?? formulaData.description ?? formula.description,
        formulaId,
      ]
    );
  }
}
```

同时重构现有 `publishVersion`，将回写逻辑替换为 `await syncSnapshotToFormula(version, formulaId)`。

#### 2.1.6 路由注册

```typescript
// backend/src/routes/versions.ts — 变更后
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getVersions, getVersion, createVersion, publishVersion, compareVersions,
  submitVersion, approveVersion, rejectVersion,
  getMaterialUpdates, refreshSnapshot,
  setCurrentVersion,
} from "../controllers/versionController.js";
import { validateBody } from "../middleware/validate.js";

export const versionRoutes = Router();

versionRoutes.use(authMiddleware);

// 现有端点
versionRoutes.get("/formula/:formulaId", getVersions);
versionRoutes.get("/detail/:versionId", getVersion);
versionRoutes.post("/formula/:formulaId", createVersion);
versionRoutes.put("/publish/:versionId", publishVersion);
versionRoutes.get("/compare/:formulaId", compareVersions);

// 审批流程
versionRoutes.post("/submit/:versionId", submitVersion);
versionRoutes.put("/approve/:versionId", validateBody({
  comment: { type: "string", required: false },
}), approveVersion);
versionRoutes.put("/reject/:versionId", validateBody({
  comment: { type: "string", required: true, minLength: 1, message: "驳回时必须填写意见" },
}), rejectVersion);

// 原料版本感知
versionRoutes.get("/material-updates/:formulaId", getMaterialUpdates);
versionRoutes.post("/refresh-snapshot/:versionId", refreshSnapshot);

// 当前版本切换
versionRoutes.put("/set-current/:versionId", setCurrentVersion);
```

**路由顺序注意**：`/material-updates/:formulaId` 和 `/formula/:formulaId` 不冲突，因为前缀不同。但需确保 `/detail/:versionId`、`/submit/:versionId` 等带 `:versionId` 的路由不会与 `/formula/:formulaId` 冲突——当前路径前缀已区分，无问题。

---

### 2.2 原料版本感知模块

#### 2.2.1 数据流

```
配方版本快照 (snapshot_json)
  └── materials: [{ materialId, materialName, quantity, basePriceAtSave, ... }]
        │
        │  逐一检查 materials 表
        ▼
  materials 表: id=materialId, is_latest=0 → 该原料有新版本
        │
        │  通过 code 字段查找最新版本
        ▼
  SELECT id, name, unit_price FROM materials
  WHERE code = (SELECT code FROM materials WHERE id = ?) AND is_latest = 1
```

#### 2.2.2 getMaterialUpdates 端点

```typescript
/** 检查配方版本中哪些原料有新版本 */
export async function getMaterialUpdates(req: Request, res: Response) {
  try {
    const { formulaId } = req.params;

    // 获取配方的当前版本快照
    const [[currentVersion]]: any[][] = await query(
      `SELECT * FROM formula_versions WHERE formula_id = ? AND is_current = 1 LIMIT 1`,
      [formulaId]
    );
    if (!currentVersion) {
      res.status(404).json({ success: false, error: { message: "配方无当前版本", code: "NOT_FOUND" } });
      return;
    }

    const snapshot = safeJsonParse(currentVersion.snapshot_json, {});
    const materials = snapshot.materials || snapshot.formulaData?.materials || [];

    const updates: Array<{
      materialId: string;          // 快照中引用的原料 ID（旧版本）
      materialName: string;
      isLatest: boolean;           // 是否为最新版本
      latestVersionId: string | null;  // 最新版本的 ID
      latestVersionName: string | null;
      latestUnitPrice: number | null;  // 最新版本单价
      currentUnitPrice: number | null; // 快照中记录的单价
      priceChanged: boolean;
    }> = [];

    for (const mat of materials) {
      if (!mat.materialId) continue;

      const [[materialRow]]: any[][] = await query(
        "SELECT id, name, code, is_latest, unit_price FROM materials WHERE id = ?",
        [mat.materialId]
      );

      if (!materialRow) {
        // 原料已被删除
        updates.push({
          materialId: mat.materialId,
          materialName: mat.materialName || "未知",
          isLatest: false,
          latestVersionId: null,
          latestVersionName: null,
          latestUnitPrice: null,
          currentUnitPrice: mat.basePriceAtSave ?? mat.unitPrice ?? null,
          priceChanged: false,
        });
        continue;
      }

      if (materialRow.is_latest === 1) {
        // 已是最新版本
        const oldPrice = mat.basePriceAtSave ?? mat.unitPrice ?? null;
        const newPrice = materialRow.unit_price != null ? Number(materialRow.unit_price) : null;
        updates.push({
          materialId: mat.materialId,
          materialName: materialRow.name,
          isLatest: true,
          latestVersionId: mat.materialId,
          latestVersionName: materialRow.name,
          latestUnitPrice: newPrice,
          currentUnitPrice: oldPrice,
          priceChanged: oldPrice !== null && newPrice !== null && oldPrice !== newPrice,
        });
      } else {
        // 有新版本，查找最新
        const [[latestRow]]: any[][] = await query(
          "SELECT id, name, unit_price FROM materials WHERE code = ? AND is_latest = 1 LIMIT 1",
          [materialRow.code]
        );
        const oldPrice = mat.basePriceAtSave ?? mat.unitPrice ?? null;
        const newPrice = latestRow?.unit_price != null ? Number(latestRow.unit_price) : null;
        updates.push({
          materialId: mat.materialId,
          materialName: materialRow.name,
          isLatest: false,
          latestVersionId: latestRow?.id || null,
          latestVersionName: latestRow?.name || null,
          latestUnitPrice: newPrice,
          currentUnitPrice: oldPrice,
          priceChanged: oldPrice !== null && newPrice !== null && oldPrice !== newPrice,
        });
      }
    }

    const hasUpdates = updates.some((u) => !u.isLatest);
    const hasPriceChanges = updates.some((u) => u.priceChanged);

    res.json(success({
      formulaId,
      versionId: currentVersion.version_id,
      versionNumber: currentVersion.version_number,
      materials: updates,
      hasUpdates,
      hasPriceChanges,
      totalMaterials: updates.length,
      outdatedCount: updates.filter((u) => !u.isLatest).length,
      priceChangedCount: updates.filter((u) => u.priceChanged).length,
    }));
  } catch (error: any) {
    console.error("[Version] getMaterialUpdates Error:", error);
    res.status(500).json({ success: false, error: { message: "检查原料更新失败", code: "INTERNAL_ERROR" } });
  }
}
```

#### 2.2.3 refreshSnapshot 端点

```typescript
/** 刷新版本快照中的原料数据（创建新版本） */
export async function refreshSnapshot(req: any, res: Response) {
  try {
    const { versionId } = req.params;
    const userId = req.user.userId;

    const [[version]]: any[][] = await query(
      "SELECT * FROM formula_versions WHERE version_id = ?",
      [versionId]
    );
    if (!version) {
      res.status(404).json({ success: false, error: { message: "版本不存在", code: "NOT_FOUND" } });
      return;
    }

    // 仅草稿或待审批版本可刷新
    if (!["draft", "pending_review"].includes(version.status)) {
      res.status(400).json({
        success: false,
        error: { message: "仅草稿或待审批版本可刷新原料数据", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // formulist 只能操作自己的版本
    if (req.user.role !== "admin" && version.created_by !== userId) {
      res.status(403).json({ success: false, error: { message: "无权操作他人版本", code: "FORBIDDEN" } });
      return;
    }

    const snapshot = safeJsonParse(version.snapshot_json, {});
    const materials = snapshot.materials || [];

    // 逐一替换为最新原料数据
    const updatedMaterials = [];
    const changes: any[] = [];

    for (const mat of materials) {
      if (!mat.materialId) {
        updatedMaterials.push(mat);
        continue;
      }

      const [[materialRow]]: any[][] = await query(
        "SELECT id, name, code, is_latest, unit_price FROM materials WHERE id = ?",
        [mat.materialId]
      );

      if (!materialRow || materialRow.is_latest === 1) {
        // 已是最新或已删除，保持不变
        updatedMaterials.push(mat);
        continue;
      }

      // 查找最新版本
      const [[latestRow]]: any[][] = await query(
        "SELECT id, name, unit_price FROM materials WHERE code = ? AND is_latest = 1 LIMIT 1",
        [materialRow.code]
      );

      if (!latestRow) {
        updatedMaterials.push(mat);
        continue;
      }

      const oldPrice = mat.basePriceAtSave ?? mat.unitPrice ?? null;
      const newPrice = latestRow.unit_price != null ? Number(latestRow.unit_price) : null;

      changes.push({
        field: "material_version_update",
        materialId: mat.materialId,
        materialName: mat.materialName,
        oldVersionId: mat.materialId,
        newVersionId: latestRow.id,
        oldPrice,
        newPrice,
      });

      updatedMaterials.push({
        ...mat,
        materialId: latestRow.id,
        materialName: latestRow.name,
        unitPrice: newPrice,
        basePriceAtSave: newPrice,
      });
    }

    if (changes.length === 0) {
      res.json(success(null, "所有原料已是最新版本，无需刷新"));
      return;
    }

    // 更新快照
    const updatedSnapshot = { ...snapshot, materials: updatedMaterials };
    const existingChanges = safeJsonParse(version.changes_json, []);
    const allChanges = [
      ...existingChanges,
      {
        field: "material_refresh",
        changeType: "modify",
        description: `刷新 ${changes.length} 种原料至最新版本`,
        details: changes,
        timestamp: now(),
      },
    ];

    await query(
      "UPDATE formula_versions SET snapshot_json = ?, changes_json = ? WHERE version_id = ?",
      [JSON.stringify(updatedSnapshot), JSON.stringify(allChanges), versionId]
    );

    res.json(success({
      versionId,
      refreshedCount: changes.length,
      changes,
    }, `已刷新 ${changes.length} 种原料至最新版本`));
  } catch (error: any) {
    console.error("[Version] refreshSnapshot Error:", error);
    res.status(500).json({ success: false, error: { message: "刷新原料数据失败", code: "INTERNAL_ERROR" } });
  }
}
```

---

### 2.3 当前版本切换模块

#### 2.3.1 setCurrentVersion 端点

```typescript
/** 切换当前版本 */
export async function setCurrentVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params;
    const userId = req.user.userId;

    const [[version]]: any[][] = await query(
      "SELECT * FROM formula_versions WHERE version_id = ?",
      [versionId]
    );
    if (!version) {
      res.status(404).json({ success: false, error: { message: "版本不存在", code: "NOT_FOUND" } });
      return;
    }

    // 仅已发布版本可设为当前
    if (version.status !== "published") {
      res.status(400).json({
        success: false,
        error: { message: "仅已发布版本可设为当前版本", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // formulist 只能切换自己的配方版本
    if (req.user.role !== "admin") {
      const [[formula]]: any[][] = await query(
        "SELECT created_by FROM formulas WHERE id = ?",
        [version.formula_id]
      );
      if (formula?.created_by !== userId) {
        res.status(403).json({
          success: false,
          error: { message: "无权切换他人配方的当前版本", code: "FORBIDDEN" },
        });
        return;
      }
    }

    const formulaId = version.formula_id;

    // 如果已是当前版本，无需操作
    if (version.is_current === 1) {
      res.json(success(null, "该版本已是当前版本"));
      return;
    }

    // 取消旧当前版本
    await query(
      "UPDATE formula_versions SET is_current = 0 WHERE formula_id = ? AND is_current = 1",
      [formulaId]
    );

    // 设置新当前版本
    await query(
      "UPDATE formula_versions SET is_current = 1 WHERE version_id = ?",
      [versionId]
    );

    // 快照回写 formulas 表
    await syncSnapshotToFormula(version, formulaId);

    res.json(success(null, "当前版本已切换，配方数据已同步"));
  } catch (error: any) {
    console.error("[Version] setCurrentVersion Error:", error);
    res.status(500).json({ success: false, error: { message: "切换当前版本失败", code: "INTERNAL_ERROR" } });
  }
}
```

---

### 2.4 前端变更

#### 2.4.1 FormulaVersion 接口扩展

```typescript
// frontend/src/api/version.ts
export interface FormulaVersion {
  versionId: string;
  formulaId: string;
  versionNumber: string;
  versionName: string | null;
  versionReason: string | null;
  changesJson: string | null;
  snapshotJson: string;
  status: "draft" | "pending_review" | "published" | "archived";  // 新增 pending_review
  isCurrent: number;
  createdBy: string;
  createdAt: string;
  changes?: any[];
  snapshot?: any;
}

export interface MaterialUpdateInfo {
  materialId: string;
  materialName: string;
  isLatest: boolean;
  latestVersionId: string | null;
  latestVersionName: string | null;
  latestUnitPrice: number | null;
  currentUnitPrice: number | null;
  priceChanged: boolean;
}

export interface MaterialUpdatesResult {
  formulaId: string;
  versionId: string;
  versionNumber: string;
  materials: MaterialUpdateInfo[];
  hasUpdates: boolean;
  hasPriceChanges: boolean;
  totalMaterials: number;
  outdatedCount: number;
  priceChangedCount: number;
}

export interface ReviewLog {
  reviewLogId: string;
  versionId: string;
  reviewerId: string;
  reviewerName?: string;
  action: "submit" | "approve" | "reject";
  comment: string | null;
  createdAt: string;
}
```

#### 2.4.2 API 层新增

```typescript
// frontend/src/api/version.ts — 追加到 versionApi 对象
export const versionApi = {
  // ... 现有方法保留 ...

  /** 提交审批 */
  submit(versionId: string) {
    return http.post<any, { message: string }>(`/versions/submit/${versionId}`);
  },

  /** 批准版本 */
  approve(versionId: string, comment?: string) {
    return http.put<any, { message: string }>(`/versions/approve/${versionId}`, { comment });
  },

  /** 驳回版本 */
  reject(versionId: string, comment: string) {
    return http.put<any, { message: string }>(`/versions/reject/${versionId}`, { comment });
  },

  /** 检查原料更新 */
  getMaterialUpdates(formulaId: string) {
    return http.get<any, MaterialUpdatesResult>(`/versions/material-updates/${formulaId}`);
  },

  /** 刷新快照中的原料数据 */
  refreshSnapshot(versionId: string) {
    return http.post<any, { versionId: string; refreshedCount: number; changes: any[] }>(`/versions/refresh-snapshot/${versionId}`);
  },

  /** 切换当前版本 */
  setCurrentVersion(versionId: string) {
    return http.put<any, { message: string }>(`/versions/set-current/${versionId}`);
  },
};
```

#### 2.4.3 Store 层新增

```typescript
// frontend/src/stores/version.ts — 新增 action
const submitVersion = async (versionId: string) => {
  loading.value = true;
  try {
    await versionApi.submit(versionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "提交审批失败" };
  } finally {
    loading.value = false;
  }
};

const approveVersion = async (versionId: string, comment?: string) => {
  loading.value = true;
  try {
    await versionApi.approve(versionId, comment);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "批准失败" };
  } finally {
    loading.value = false;
  }
};

const rejectVersion = async (versionId: string, comment: string) => {
  loading.value = true;
  try {
    await versionApi.reject(versionId, comment);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "驳回失败" };
  } finally {
    loading.value = false;
  }
};

const getMaterialUpdates = async (formulaId: string) => {
  try {
    const res = await versionApi.getMaterialUpdates(formulaId);
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, message: error.message || "检查原料更新失败" };
  }
};

const refreshSnapshot = async (versionId: string) => {
  loading.value = true;
  try {
    const res = await versionApi.refreshSnapshot(versionId);
    return { success: true, data: res };
  } catch (error: any) {
    return { success: false, message: error.message || "刷新原料数据失败" };
  } finally {
    loading.value = false;
  }
};

const setCurrentVersion = async (versionId: string) => {
  loading.value = true;
  try {
    await versionApi.setCurrentVersion(versionId);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "切换当前版本失败" };
  } finally {
    loading.value = false;
  }
};
```

#### 2.4.4 VersionList.vue 交互变更

**审批按钮区域**：

| 版本状态 | formulist 可见操作 | admin 可见操作 |
|----------|-------------------|---------------|
| draft | 提交审批 | 提交审批 / 直接发布 |
| pending_review | 无 | 批准 / 驳回（驳回需填写意见） |
| published | 设为当前（仅自己配方） | 设为当前 / 直接发布 |
| archived | 无 | 设为当前 |

**原料版本标签**：

在配方详情的原料列表每行末尾，根据 `getMaterialUpdates` 返回的数据显示标签：

| 条件 | 标签 | 样式 |
|------|------|------|
| `isLatest === true` | "最新" | 绿色背景 `var(--color-success)` |
| `isLatest === false` | "历史" | 黄色背景 `var(--color-warning)` |
| `priceChanged === true` | "价格变动" | 红色背景 `var(--color-error)` |

---

## 3. 数据流

### 3.1 审批流程数据流

```
formulist                     admin                       DB
   │                           │                           │
   │  POST /versions/submit    │                           │
   │──────────────────────────→│                           │
   │                           │  UPDATE status=pending    │
   │                           │──────────────────────────→│
   │                           │  INSERT review_log        │
   │                           │──────────────────────────→│
   │                           │                           │
   │                           │  PUT /versions/approve    │
   │                           │──────────────────────────→│
   │                           │  UPDATE status=published  │
   │                           │──────────────────────────→│
   │                           │  UPDATE others=archived   │
   │                           │──────────────────────────→│
   │                           │  UPDATE formulas (sync)   │
   │                           │──────────────────────────→│
   │                           │  INSERT review_log        │
   │                           │──────────────────────────→│
```

### 3.2 原料版本感知数据流

```
前端                          后端                         DB
 │                             │                            │
 │  GET /material-updates      │                            │
 │────────────────────────────→│                            │
 │                             │  SELECT current version    │
 │                             │───────────────────────────→│
 │                             │  SELECT materials (batch)  │
 │                             │───────────────────────────→│
 │                             │  SELECT latest by code     │
 │                             │───────────────────────────→│
 │                             │                            │
 │  POST /refresh-snapshot     │                            │
 │────────────────────────────→│                            │
 │                             │  UPDATE snapshot_json      │
 │                             │───────────────────────────→│
 │                             │  UPDATE changes_json       │
 │                             │───────────────────────────→│
```

### 3.3 当前版本切换数据流

```
前端                          后端                         DB
 │                             │                            │
 │  PUT /set-current           │                            │
 │────────────────────────────→│                            │
 │                             │  验证 status=published     │
 │                             │───────────────────────────→│
 │                             │  UPDATE old is_current=0   │
 │                             │───────────────────────────→│
 │                             │  UPDATE new is_current=1   │
 │                             │───────────────────────────→│
 │                             │  UPDATE formulas (sync)    │
 │                             │───────────────────────────→│
```

---

## 4. 错误处理

### 4.1 错误码映射

| 场景 | HTTP 状态码 | 错误码 | 用户提示 |
|------|------------|--------|---------|
| 版本不存在 | 404 | `NOT_FOUND` | 版本不存在 |
| 仅草稿可提交审批 | 400 | `VALIDATION_ERROR` | 仅草稿版本可提交审批 |
| 仅待审批可批准/驳回 | 400 | `VALIDATION_ERROR` | 仅待审批版本可执行此操作 |
| 驳回未填写意见 | 400 | `VALIDATION_ERROR` | 驳回时必须填写意见 |
| 非管理员批准/驳回 | 403 | `FORBIDDEN` | 仅管理员可执行此操作 |
| 操作他人版本 | 403 | `FORBIDDEN` | 无权操作他人版本 |
| 仅已发布可设为当前 | 400 | `VALIDATION_ERROR` | 仅已发布版本可设为当前版本 |
| 配方无当前版本 | 404 | `NOT_FOUND` | 配方无当前版本 |
| 快照刷新非草稿版本 | 400 | `VALIDATION_ERROR` | 仅草稿或待审批版本可刷新原料数据 |
| 服务器内部错误 | 500 | `INTERNAL_ERROR` | 操作失败 |

### 4.2 并发安全

- `setCurrentVersion` 和 `approveVersion` 中先取消旧 `is_current` 再设置新 `is_current`，在 SQLite 单写模式下天然串行化
- MySQL 生产环境建议在 `formula_versions` 表上对 `(formula_id, is_current)` 加行级锁：

```sql
SELECT * FROM formula_versions WHERE formula_id = ? AND is_current = 1 FOR UPDATE;
```

- 当前项目使用 `database-better-sqlite3.js`（同步 API），事务内操作天然原子性，无需额外处理

### 4.3 数据一致性保障

- `getVersions` 中已有数据一致性修复逻辑（多个 `is_current=1` 时仅保留最新），新增 `pending_review` 状态后需同步更新该修复逻辑中的状态过滤条件
- `publishVersion` 中归档其他版本的 `status IN ('draft', 'published')` 需扩展为 `status IN ('draft', 'pending_review', 'published')`
- `syncSnapshotToFormula` 执行前必须验证 `formulas` 表中对应记录存在

---

## 5. 迁移计划

### 5.1 迁移脚本清单

| 序号 | 脚本文件 | 说明 | 幂等性 |
|------|---------|------|--------|
| 1 | `addPendingReviewToVersions.ts` | 扩展 `formula_versions.status` CHECK 约束 | 是（检查 `pending_review` 是否已存在） |
| 2 | `createFormulaReviewLogs.ts` | 创建 `formula_review_logs` 表及索引 | 是（`CREATE TABLE IF NOT EXISTS`） |

### 5.2 迁移执行顺序

```bash
# 1. 先执行状态扩展迁移
npx tsx backend/src/scripts/migrations/addPendingReviewToVersions.ts

# 2. 再创建审批日志表
npx tsx backend/src/scripts/migrations/createFormulaReviewLogs.ts
```

### 5.3 回滚方案

- `formula_review_logs` 表：直接 `DROP TABLE formula_review_logs`
- `formula_versions` CHECK 约束：需再次重建表，将 CHECK 约束恢复为 `IN ('draft', 'published', 'archived')`，并将所有 `pending_review` 状态的记录回退为 `draft`

### 5.4 init.sql 更新

在 `backend/src/scripts/init.sql` 中同步更新：

1. `formula_versions` 表的 CHECK 约束改为 `CHECK(status IN ('draft', 'pending_review', 'published', 'archived'))`
2. 新增 `formula_review_logs` 建表语句
3. 新增 `idx_fv_status` 索引

在 `backend/src/scripts/mysql-init.sql` 中同步更新 MySQL 版本。

---

## 6. 实施顺序

### Phase 1：数据库迁移 + 后端审批流程（预计 2 天）

| 步骤 | 任务 | 涉及文件 | 依赖 |
|------|------|---------|------|
| 1.1 | 编写并执行迁移脚本 | `migrations/addPendingReviewToVersions.ts`、`migrations/createFormulaReviewLogs.ts` | 无 |
| 1.2 | 更新 init.sql / mysql-init.sql | `scripts/init.sql`、`scripts/mysql-init.sql` | 1.1 |
| 1.3 | 新建 reviewService.ts | `services/reviewService.ts` | 1.1 |
| 1.4 | 提取 syncSnapshotToFormula 公共函数 | `controllers/versionController.ts` | 无 |
| 1.5 | 重构 publishVersion 使用公共函数 | `controllers/versionController.ts` | 1.4 |
| 1.6 | 新增 submitVersion / approveVersion / rejectVersion | `controllers/versionController.ts` | 1.3, 1.4 |
| 1.7 | 更新路由注册 | `routes/versions.ts` | 1.6 |
| 1.8 | 更新 getVersions 中一致性修复逻辑 | `controllers/versionController.ts` | 1.1 |

### Phase 2：后端原料版本感知 + 当前版本切换（预计 1.5 天）

| 步骤 | 任务 | 涉及文件 | 依赖 |
|------|------|---------|------|
| 2.1 | 新增 getMaterialUpdates | `controllers/versionController.ts` | 无 |
| 2.2 | 新增 refreshSnapshot | `controllers/versionController.ts` | 2.1 |
| 2.3 | 新增 setCurrentVersion | `controllers/versionController.ts` | 1.4 |
| 2.4 | 更新路由注册 | `routes/versions.ts` | 2.1-2.3 |
| 2.5 | 单元测试 | `controllers/__tests__/versionController.test.ts` | 2.1-2.4 |

### Phase 3：前端对接（预计 2 天）

| 步骤 | 任务 | 涉及文件 | 依赖 |
|------|------|---------|------|
| 3.1 | 扩展 FormulaVersion 接口 + 新增 API 方法 | `api/version.ts` | Phase 1+2 |
| 3.2 | 扩展 version store | `stores/version.ts` | 3.1 |
| 3.3 | VersionList.vue 审批按钮交互 | `views/formulas/versions/VersionList.vue` | 3.2 |
| 3.4 | VersionList.vue 原料版本标签 | `views/formulas/versions/VersionList.vue` | 3.2 |
| 3.5 | VersionList.vue 当前版本切换 | `views/formulas/versions/VersionList.vue` | 3.2 |
| 3.6 | FormulaList.vue 状态展示适配 pending_review | `views/formulas/FormulaList.vue` | 3.2 |

### Phase 4：集成测试 + 文档更新（预计 1 天）

| 步骤 | 任务 | 涉及文件 | 依赖 |
|------|------|---------|------|
| 4.1 | 后端集成测试 | `test/` | Phase 1+2 |
| 4.2 | 前端 E2E 测试 | `test/` | Phase 3 |
| 4.3 | API_DOC.md 更新 | `backend/API_DOC.md` | Phase 1+2 |
| 4.4 | 构建验证 | 全项目 | 4.1-4.3 |

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| SQLite 重建表期间服务不可用 | 中 | 迁移脚本在部署时执行，选择低峰期；重建表操作通常 <1s |
| `pending_review` 状态被绕过（直接调用 publishVersion） | 低 | `publishVersion` 保留为管理员快捷通道，仅 admin 可调用；formulist 必须走审批 |
| 原料批量查询性能（N+1 问题） | 中 | `getMaterialUpdates` 中逐原料查询；若配方原料数 >20，考虑改为批量 `IN` 查询 |
| 快照刷新后配方数据不一致 | 高 | `refreshSnapshot` 仅更新 `formula_versions` 表的快照，不回写 `formulas` 表；需发布/设为当前后才同步 |
| 多人同时操作同一配方版本 | 低 | SQLite 同步 API 天然串行；MySQL 部署需加行级锁 |
| `publishVersion` 中归档条件遗漏 `pending_review` | 高 | Phase 1 步骤 1.8 明确更新归档条件为 `IN ('draft', 'pending_review', 'published')` |

---

## 8. API 端点汇总

### 新增端点

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/versions/submit/:versionId` | 提交版本审批 | formulist（仅自己）/ admin |
| PUT | `/api/versions/approve/:versionId` | 批准版本 | admin |
| PUT | `/api/versions/reject/:versionId` | 驳回版本（需 comment） | admin |
| GET | `/api/versions/material-updates/:formulaId` | 检查配方原料更新 | 认证用户 |
| POST | `/api/versions/refresh-snapshot/:versionId` | 刷新快照原料数据 | formulist（仅自己）/ admin |
| PUT | `/api/versions/set-current/:versionId` | 切换当前版本 | formulist（仅自己配方）/ admin |

### 现有端点变更

| 端点 | 变更内容 |
|------|---------|
| `PUT /api/versions/publish/:versionId` | 归档条件扩展为 `IN ('draft', 'pending_review', 'published')`；建议增加 admin 权限检查 |
| `GET /api/versions/formula/:formulaId` | 一致性修复逻辑中状态过滤条件扩展 |

---

## 9. 请求/响应格式

### POST /api/versions/submit/:versionId

**请求体**：无

**成功响应**：

```json
{
  "success": true,
  "data": null,
  "message": "版本已提交审批"
}
```

### PUT /api/versions/approve/:versionId

**请求体**：

```json
{
  "comment": "同意发布，配方参数合理"
}
```

`comment` 可选。

**成功响应**：

```json
{
  "success": true,
  "data": null,
  "message": "版本已批准并发布"
}
```

### PUT /api/versions/reject/:versionId

**请求体**：

```json
{
  "comment": "含量比系数超出范围，请调整后重新提交"
}
```

`comment` 必填。

**成功响应**：

```json
{
  "success": true,
  "data": null,
  "message": "版本已驳回"
}
```

### GET /api/versions/material-updates/:formulaId

**请求体**：无

**成功响应**：

```json
{
  "success": true,
  "data": {
    "formulaId": "f_001",
    "versionId": "v_001",
    "versionNumber": "v2.0",
    "materials": [
      {
        "materialId": "mat_old_001",
        "materialName": "黄芪",
        "isLatest": false,
        "latestVersionId": "mat_new_001",
        "latestVersionName": "黄芪",
        "latestUnitPrice": 85.0,
        "currentUnitPrice": 78.0,
        "priceChanged": true
      },
      {
        "materialId": "mat_002",
        "materialName": "当归",
        "isLatest": true,
        "latestVersionId": "mat_002",
        "latestVersionName": "当归",
        "latestUnitPrice": 120.0,
        "currentUnitPrice": 120.0,
        "priceChanged": false
      }
    ],
    "hasUpdates": true,
    "hasPriceChanges": true,
    "totalMaterials": 2,
    "outdatedCount": 1,
    "priceChangedCount": 1
  }
}
```

### POST /api/versions/refresh-snapshot/:versionId

**请求体**：无

**成功响应**：

```json
{
  "success": true,
  "data": {
    "versionId": "v_001",
    "refreshedCount": 1,
    "changes": [
      {
        "field": "material_version_update",
        "materialId": "mat_old_001",
        "materialName": "黄芪",
        "oldVersionId": "mat_old_001",
        "newVersionId": "mat_new_001",
        "oldPrice": 78.0,
        "newPrice": 85.0
      }
    ]
  },
  "message": "已刷新 1 种原料至最新版本"
}
```

### PUT /api/versions/set-current/:versionId

**请求体**：无

**成功响应**：

```json
{
  "success": true,
  "data": null,
  "message": "当前版本已切换，配方数据已同步"
}
```
