# PRD：配方版本审批与升级管理

| 字段 | 值 |
|------|-----|
| 文档编号 | TS-PRD-20260522-001 |
| 版本 | v1.0 |
| 创建日期 | 2026-05-22 |
| 状态 | Draft |
| 作者 | Product Team |

---

## 1. 概述

### 1.1 问题陈述

当前 TingStudio 配方版本管理存在三个核心缺陷：

1. **无审批流程**：`publishVersion` 接口直接将草稿发布为正式版本，任何 formulist 均可自行发布，缺少质量把关环节，已发布配方可能存在数据错误。
2. **原料版本脱节**：配方通过 `materials_json` 存储原料快照，当原料数据更新（如营养数据修正、单价调整）后，配方仍引用旧版本数据，无法感知和追踪原料变更，导致营养成分计算和成本核算不准确。
3. **当前版本切换受限**：`is_current` 字段仅在发布时自动设置，管理员和配方师无法手动切换当前版本，无法灵活回退到历史已发布版本。

### 1.2 解决方案

在现有 `formula_versions` 体系上，新增三级审批流、原料版本感知与配方升级、当前版本手动切换三大功能，形成完整的配方生命周期管理闭环。

### 1.3 成功指标

| 指标 | 目标值 | 衡量方式 |
|------|--------|----------|
| 审批流程覆盖率 | 100% 配方发布必须经过审批 | 线上无直接发布记录 |
| 原料版本感知率 | 配方详情页 100% 展示原料版本标签 | UI 验收 |
| 快照刷新响应时间 | <= 2s（含新版本创建） | API 响应时间监控 |
| 当前版本切换成功率 | >= 99% | 操作日志统计 |
| 数据一致性 | `formulas` 主表与 `is_current` 版本数据 100% 同步 | 数据校验脚本 |

---

## 2. 用户角色与权限

### 2.1 角色定义

| 角色 | 说明 | 系统字段 |
|------|------|----------|
| admin | 管理员，拥有全部权限 | `users.role = 'admin'` |
| formulist | 配方师，仅可操作自己创建的数据 | `users.role = 'formulist'` |

### 2.2 权限矩阵

| 操作 | admin | formulist | 权限检查方式 |
|------|-------|-----------|-------------|
| 创建草稿版本 | YES | YES | `authMiddleware` |
| 提交审批（draft -> pending_review） | YES | YES | `authMiddleware` + 创建人校验 |
| 审批通过（pending_review -> published） | YES | NO | `authMiddleware` + `role === 'admin'` |
| 审批驳回（pending_review -> draft） | YES | NO | `authMiddleware` + `role === 'admin'` |
| 直接发布 | YES | NO | `authMiddleware` + `role === 'admin'` |
| 切换当前版本 | YES | YES（仅自己创建的配方） | `authMiddleware` + 创建人校验 |
| 刷新快照/升级配方 | YES | YES（仅自己创建的配方） | `authMiddleware` + 创建人校验 |
| 查看审批列表 | YES | NO | `authMiddleware` + `role === 'admin'` |

### 2.3 数据隔离

- admin 可查看所有配方的所有版本
- formulist 仅可查看自己创建的配方（`created_by = req.user.userId`）
- 审批操作不受数据隔离限制（admin 可审批任何人的配方）

---

## 3. 用户故事

### 3.1 审批流程

#### US-1.1：配方师提交审批

> 作为配方师，我希望将草稿版本的配方提交审批，以便管理员审核后正式发布。

**验收标准**：
- AC-1.1.1：草稿版本（`status = 'draft'`）显示"提交审批"按钮
- AC-1.1.2：点击后状态变为 `pending_review`，按钮消失
- AC-1.1.3：已提交审批的版本不可编辑
- AC-1.1.4：仅版本创建人或 admin 可提交审批
- AC-1.1.5：提交时可选填提交说明（`submit_comment`）

#### US-1.2：管理员审批通过

> 作为管理员，我希望审批通过待审核的配方版本，使其成为正式发布版本。

**验收标准**：
- AC-1.2.1：审批通过后版本状态变为 `published`，自动设置 `is_current = 1`
- AC-1.2.2：同一配方的其他已发布版本自动归档（`status = 'archived'`，`is_current = 0`）
- AC-1.2.3：快照数据自动同步到 `formulas` 主表
- AC-1.2.4：审批通过时可选填审批意见（`review_comment`）
- AC-1.2.5：仅 admin 角色可执行审批通过操作

#### US-1.3：管理员审批驳回

> 作为管理员，我希望驳回不符合要求的配方版本，并注明驳回原因，以便配方师修改后重新提交。

**验收标准**：
- AC-1.3.1：驳回后版本状态回退为 `draft`
- AC-1.3.2：驳回时**必须**填写驳回原因（`review_comment`，最少 5 个字符）
- AC-1.3.3：配方师在版本详情中可查看驳回原因
- AC-1.3.4：驳回后配方师可修改并重新提交审批
- AC-1.3.5：仅 admin 角色可执行驳回操作

#### US-1.4：管理员审批列表

> 作为管理员，我希望在一个专门的页面查看所有待审批的配方版本，以便高效处理审批任务。

**验收标准**：
- AC-1.4.1：审批列表页展示所有 `status = 'pending_review'` 的版本
- AC-1.4.2：支持按配方名称、提交人、提交时间筛选
- AC-1.4.3：列表显示：配方名称、版本号、提交人、提交时间、提交说明
- AC-1.4.4：每行提供"查看详情"、"通过"、"驳回"操作
- AC-1.4.5：待审批数量在导航栏显示角标提醒

### 3.2 原料版本感知与配方升级

#### US-2.1：原料版本标签展示

> 作为配方师/管理员，我希望在配方详情页看到每个原料的版本状态标签，以便了解哪些原料已有新版本。

**验收标准**：
- AC-2.1.1：原料行显示版本号（如 `v2`）
- AC-2.1.2：最新版本原料显示绿色"最新"标签
- AC-2.1.3：非最新版本原料显示黄色"历史"标签，hover 提示"此原料已更新至 v{N}"
- AC-2.1.4：标签在配方详情页和配方列表页（展开版本原料时）均可见
- AC-2.1.5：版本标签基于 `materials.is_latest` 字段判断

#### US-2.2：原料有新版本提示

> 作为配方师/管理员，我希望在配方详情和列表中看到"原料有新版本"的提示，以便及时更新配方。

**验收标准**：
- AC-2.2.1：配方详情页顶部显示提示条："该配方中有 N 种原料已有新版本"
- AC-2.2.2：配方列表页中，存在原料新版本的配方行显示"原料有新版本"标签
- AC-2.2.3：提示仅在有非最新版本原料时显示
- AC-2.2.4：提示信息通过 `/api/versions/:versionId/check-material-updates` 接口获取

#### US-2.3：刷新快照升级配方

> 作为配方师/管理员，我希望点击"刷新快照"按钮后，系统自动创建新版本配方并使用最新原料数据，以便配方数据与原料保持同步。

**验收标准**：
- AC-2.3.1：点击"刷新快照"后，系统自动创建新版本（版本号递增，如 `v1.0` -> `v2.0`）
- AC-2.3.2：新版本的 `materials_json` 中所有原料替换为最新版本数据
- AC-2.3.3：新版本的 `snapshotNutrition` 更新为最新营养数据
- AC-2.3.4：新版本状态为 `draft`，需走审批流程
- AC-2.3.5：旧版本自动归档（`status = 'archived'`）
- AC-2.3.6：升级时自动生成变更摘要（`changes_json`），记录哪些原料版本发生了变化
- AC-2.3.7：操作前弹出确认对话框，展示变更摘要（哪些原料将从 vN 升级到 vM）
- AC-2.3.8：formulist 仅可对自己创建的配方执行升级

### 3.3 当前版本管理

#### US-3.1：手动切换当前版本

> 作为管理员/配方师，我希望手动切换配方的当前版本到另一个已发布版本，以便灵活回退或选择不同版本作为当前生效版本。

**验收标准**：
- AC-3.1.1：已发布版本（`status = 'published'`）显示"设为当前"操作
- AC-3.1.2：切换后新版本 `is_current = 1`，原当前版本 `is_current = 0`（状态保持 `published`）
- AC-3.1.3：切换后自动同步快照数据到 `formulas` 主表
- AC-3.1.4：配方列表和销售报表始终基于 `is_current` 版本数据
- AC-3.1.5：formulist 仅可对自己创建的配方切换当前版本
- AC-3.1.6：切换前弹出确认对话框，提示"切换后配方数据将更新为该版本快照"

#### US-3.2：当前版本标识

> 作为用户，我希望在版本列表中清晰看到哪个是当前版本，以便快速识别。

**验收标准**：
- AC-3.2.1：当前版本显示"当前"标签（已有，保持不变）
- AC-3.2.2：非当前已发布版本显示"已发布"标签
- AC-3.2.3：草稿版本显示"草稿"标签
- AC-3.2.4：待审批版本显示"待审批"标签
- AC-3.2.5：归档版本显示"已归档"标签

---

## 4. 功能需求

### 4.1 Feature 1：配方审批流程

#### 4.1.1 状态机变更

**当前状态机**：

```
draft ──publishVersion()──> published ──(自动)──> archived
```

**新状态机**：

```
draft ──submitReview()──> pending_review ──approve()──> published ──(自动)──> archived
                                        ──reject()──> draft
```

**状态定义**：

| 状态 | 值 | 说明 | 可执行操作 |
|------|-----|------|-----------|
| 草稿 | `draft` | 初始状态，可编辑 | 提交审批、编辑、删除 |
| 待审批 | `pending_review` | 已提交等待审核 | 管理员审批通过/驳回 |
| 已发布 | `published` | 审批通过正式发布 | 设为当前版本、归档 |
| 已归档 | `archived` | 历史版本 | 查看 |

#### 4.1.2 数据库变更

**`formula_versions` 表新增字段**：

```sql
-- 审批流程字段
ALTER TABLE formula_versions ADD COLUMN submit_comment TEXT DEFAULT NULL;
ALTER TABLE formula_versions ADD COLUMN review_comment TEXT DEFAULT NULL;
ALTER TABLE formula_versions ADD COLUMN reviewed_by TEXT DEFAULT NULL;
ALTER TABLE formula_versions ADD COLUMN reviewed_at TEXT DEFAULT NULL;
ALTER TABLE formula_versions ADD COLUMN submitted_at TEXT DEFAULT NULL;

-- 状态约束变更：draft -> draft/published/archived/pending_review
-- 需通过迁移脚本修改 CHECK 约束
```

**迁移脚本**：`backend/src/scripts/migrations/addApprovalFieldsToFormulaVersions.ts`

```sql
-- SQLite 不支持 ALTER TABLE ... ALTER COLUMN，需重建表
-- 1. 创建新表（含 pending_review 状态）
-- 2. 复制数据
-- 3. 删除旧表
-- 4. 重命名新表
```

**新增索引**：

```sql
CREATE INDEX IF NOT EXISTS idx_fv_status ON formula_versions(status);
CREATE INDEX IF NOT EXISTS idx_fv_reviewed_by ON formula_versions(reviewed_by);
```

#### 4.1.3 API 设计

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/versions/:versionId/submit-review` | 提交审批 | 创建人或 admin |
| PUT | `/api/versions/:versionId/approve` | 审批通过 | admin |
| PUT | `/api/versions/:versionId/reject` | 审批驳回 | admin |
| GET | `/api/versions/pending-review` | 待审批列表 | admin |

**接口详细设计**：

**POST /api/versions/:versionId/submit-review**

请求体：
```json
{
  "submitComment": "本次更新了3种原料的用量"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "versionId": "xxx",
    "status": "pending_review",
    "submittedAt": "2026-05-22T10:00:00.000Z"
  }
}
```

校验规则：
- `versionId` 对应版本必须存在且 `status = 'draft'`
- 操作人必须是版本创建人或 admin
- `submitComment` 可选，最大 500 字符

**PUT /api/versions/:versionId/approve**

请求体：
```json
{
  "reviewComment": "数据核实无误，批准发布"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "versionId": "xxx",
    "status": "published",
    "isCurrent": 1,
    "reviewedBy": "admin_user_id",
    "reviewedAt": "2026-05-22T11:00:00.000Z"
  }
}
```

业务逻辑：
1. 校验版本状态为 `pending_review`
2. 校验操作人为 admin
3. 同一配方的其他 `published` 版本归档（`status -> archived`，`is_current -> 0`）
4. 当前版本设为 `published` + `is_current = 1`
5. 快照数据同步到 `formulas` 主表
6. 记录 `reviewed_by`、`reviewed_at`

**PUT /api/versions/:versionId/reject**

请求体：
```json
{
  "reviewComment": "原料用量超出标准范围，请核实后重新提交"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "versionId": "xxx",
    "status": "draft",
    "reviewedBy": "admin_user_id",
    "reviewedAt": "2026-05-22T11:00:00.000Z"
  }
}
```

校验规则：
- `reviewComment` 必填，最少 5 个字符
- 版本状态必须为 `pending_review`
- 操作人必须为 admin

**GET /api/versions/pending-review**

查询参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 否 | 按配方名称模糊搜索 |
| `submittedBy` | string | 否 | 按提交人 ID 筛选 |
| `startDate` | string | 否 | 提交起始时间（ISO 8601） |
| `endDate` | string | 否 | 提交结束时间（ISO 8601） |
| `page` | number | 否 | 页码，默认 1 |
| `pageSize` | number | 否 | 每页条数，默认 20，最大 100 |

响应：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "versionId": "xxx",
        "formulaId": "xxx",
        "formulaName": "四物汤",
        "versionNumber": "v2.0",
        "versionName": "调整当归用量",
        "submitComment": "本次更新了3种原料的用量",
        "submittedAt": "2026-05-22T10:00:00.000Z",
        "submittedBy": "user_id",
        "submittedByName": "张三"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### 4.1.4 前端页面

**审批列表页**（新增路由：`/formulas/reviews`）

- 页面布局：顶部筛选区 + 主体表格
- 筛选区：配方名称搜索、提交人筛选、时间范围
- 表格列：配方名称、版本号、提交人、提交时间、提交说明、操作
- 操作列：查看详情（跳转版本详情）、通过（弹窗确认）、驳回（弹窗填原因）
- 导航栏：在"配方管理"菜单下新增"审批管理"子菜单，仅 admin 可见
- 角标：导航栏"审批管理"显示待审批数量角标

**版本详情页变更**（`FormulaDetail.vue`）

- 状态标签新增"待审批"样式（蓝色/橙色）
- 草稿版本新增"提交审批"按钮
- 待审批版本显示审批状态信息（提交人、提交时间、提交说明）
- 管理员在待审批版本详情中显示"通过"和"驳回"按钮
- 驳回原因在版本详情中展示

**版本列表变更**（`FormulaList.vue` 版本展开区域）

- 版本状态标签新增"待审批"
- 草稿版本行新增"提交审批"操作按钮
- 待审批版本行新增"通过"/"驳回"操作按钮（仅 admin 可见）

### 4.2 Feature 2：原料版本感知与配方升级

#### 4.2.1 数据模型

**`materials_json` 快照格式增强**：

当前格式：
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

增强后格式（向后兼容）：
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
    "snapshotAt": "2026-05-22T10:00:00.000Z"
  }
]
```

新增字段说明：

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `materialVersion` | number | 是 | 配方保存时的原料版本号 |
| `unitPrice` | number | 否 | 配方保存时的原料单价快照 |
| `snapshotNutrition` | object | 是 | 配方保存时的原料营养数据快照 |
| `snapshotAt` | string | 是 | 快照时间戳（ISO 8601） |

向后兼容：旧数据缺少 `materialVersion` 等字段时，前端按 `version = 1` 处理，不显示版本标签。

#### 4.2.2 API 设计

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/versions/:versionId/check-material-updates` | 检查原料是否有新版本 | 认证用户 |
| POST | `/api/versions/:versionId/refresh-snapshots` | 刷新快照升级配方 | 创建人或 admin |

**GET /api/versions/:versionId/check-material-updates**

响应：
```json
{
  "success": true,
  "data": {
    "versionId": "xxx",
    "hasUpdates": true,
    "updatedCount": 2,
    "details": [
      {
        "materialId": "mat_001",
        "materialName": "当归",
        "currentVersion": 1,
        "latestVersion": 2,
        "fields": ["unitPrice", "snapshotNutrition"]
      },
      {
        "materialId": "mat_003",
        "materialName": "甘草",
        "currentVersion": 1,
        "latestVersion": 3,
        "fields": ["snapshotNutrition"]
      }
    ]
  }
}
```

业务逻辑：
1. 解析版本 `snapshot_json` 中的 `materials` 数组
2. 对每个 `materialId`，查询 `materials` 表中 `is_latest = 1` 的记录
3. 对比 `materialVersion` 与最新版本号
4. 返回有差异的原料列表及变更字段

**POST /api/versions/:versionId/refresh-snapshots**

请求体（可选）：
```json
{
  "materialIds": ["mat_001", "mat_003"]
}
```

请求体为空时，刷新全部有更新的原料。

响应：
```json
{
  "success": true,
  "data": {
    "newVersionId": "new_version_uuid",
    "versionNumber": "v2.0",
    "status": "draft",
    "refreshedCount": 2,
    "unchangedCount": 1,
    "details": [
      {
        "materialId": "mat_001",
        "materialName": "当归",
        "fromVersion": 1,
        "toVersion": 2,
        "nutritionChanged": true,
        "priceChanged": true
      }
    ]
  }
}
```

业务逻辑：
1. 校验操作人权限（创建人或 admin）
2. 获取当前版本的快照数据
3. 对指定（或全部有更新的）原料，从 `materials` 表获取最新版本数据
4. 更新 `materials_json` 中的 `materialVersion`、`unitPrice`、`snapshotNutrition`、`snapshotAt`
5. 创建新版本（版本号递增，如 `v1.0` -> `v2.0`），状态为 `draft`
6. 旧版本归档（`status -> archived`，`is_current -> 0`）
7. 生成 `changes_json` 变更摘要
8. 新版本 `is_current = 1`（因为是唯一的草稿/活跃版本）

#### 4.2.3 前端交互

**配方详情页（`FormulaDetail.vue`）**：

1. 原料表格新增"版本"列，显示版本号 + 标签
2. 页面顶部条件显示提示条："该配方中有 N 种原料已有新版本 [刷新快照]"
3. "刷新快照"按钮点击后弹出确认对话框，展示变更摘要
4. 确认后调用 `refresh-snapshots` 接口，跳转到新版本详情页

**配方列表页（`FormulaList.vue`）**：

1. 配方行中，若当前版本有原料更新，显示"原料有新版本"标签
2. 点击标签可跳转到详情页查看

**版本标签样式规范**：

| 状态 | 标签文案 | 颜色 | TDesign 主题 |
|------|---------|------|-------------|
| 最新版本 | "最新" | 绿色 | `theme="success"` |
| 历史版本 | "历史" | 黄色 | `theme="warning"` |
| 无版本信息 | 不显示标签 | -- | -- |

### 4.3 Feature 3：当前版本管理

#### 4.3.1 API 设计

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| PUT | `/api/versions/:versionId/set-current` | 切换当前版本 | 创建人或 admin |

**PUT /api/versions/:versionId/set-current**

请求体：无

响应：
```json
{
  "success": true,
  "data": {
    "versionId": "xxx",
    "formulaId": "xxx",
    "isCurrent": 1,
    "syncedAt": "2026-05-22T12:00:00.000Z"
  }
}
```

业务逻辑：
1. 校验版本状态为 `published`（仅已发布版本可设为当前）
2. 校验操作人权限（创建人或 admin）
3. 同一配方的其他版本 `is_current -> 0`
4. 当前版本 `is_current -> 1`
5. 快照数据同步到 `formulas` 主表（复用 `publishVersion` 中的同步逻辑）

#### 4.3.2 前端交互

**版本列表区域**：

1. 已发布且非当前版本显示"设为当前"按钮
2. 当前版本显示"当前"标签（已有）
3. 点击"设为当前"弹出确认对话框
4. 确认后调用 `set-current` 接口，刷新版本列表

**配方列表页**：

1. 配方列表始终基于 `is_current` 版本的数据展示
2. 销售报表关联的配方数据始终取 `is_current` 版本

---

## 5. 非功能需求

### 5.1 性能要求

| 场景 | 指标 |
|------|------|
| 审批列表加载 | <= 1s（100 条以内） |
| 原料版本检查 | <= 500ms（单配方 20 种原料以内） |
| 刷新快照创建新版本 | <= 2s |
| 当前版本切换 | <= 1s |
| 配方列表页渲染 | <= 1.5s（含版本信息） |

### 5.2 数据一致性

| 约束 | 说明 |
|------|------|
| 单当前版本 | 每个配方最多一个 `is_current = 1` 的版本 |
| 主表同步 | `is_current` 版本的快照数据必须与 `formulas` 主表一致 |
| 原料版本引用 | `materials_json` 中的 `materialId` 必须指向 `materials` 表中存在的记录 |
| 审批不可逆 | 已通过/驳回的审批记录不可修改（`reviewed_by`、`reviewed_at` 不可变） |

### 5.3 安全要求

| 要求 | 实现方式 |
|------|---------|
| 权限校验 | 所有接口使用 `authMiddleware`，审批/驳回额外校验 admin 角色 |
| 数据隔离 | formulist 仅可操作自己创建的配方（`created_by` 校验） |
| 输入校验 | `reviewComment` 长度限制（5-500 字符），`submitComment` 长度限制（0-500 字符） |
| SQL 注入防护 | 所有查询使用参数化查询 |
| 操作日志 | 审批操作记录 `reviewed_by` 和 `reviewed_at` |

### 5.4 兼容性

| 项目 | 要求 |
|------|------|
| 旧数据兼容 | 缺少 `materialVersion` 的 `materials_json` 条目按 `version = 1` 处理 |
| 旧版本状态兼容 | 已有的 `draft`/`published`/`archived` 状态数据无需迁移 |
| API 向后兼容 | 现有 `publishVersion` 接口保留，admin 仍可直接发布 |
| 前端渐进增强 | 原料版本标签为增强功能，不影响基础配方编辑流程 |

---

## 6. 技术方案概要

### 6.1 数据库迁移

**迁移脚本**：`backend/src/scripts/migrations/addApprovalFieldsToFormulaVersions.ts`

核心变更：
1. `formula_versions` 表新增 `submit_comment`、`review_comment`、`reviewed_by`、`reviewed_at`、`submitted_at` 字段
2. 修改 `status` 的 CHECK 约束，增加 `pending_review` 值
3. 新增索引 `idx_fv_status`、`idx_fv_reviewed_by`

SQLite 迁移策略（不支持 ALTER COLUMN）：
1. 创建新表 `formula_versions_new`（含新字段和更新后的 CHECK 约束）
2. 从旧表复制数据（`pending_review` 相关字段填 NULL）
3. 删除旧表
4. 重命名新表为 `formula_versions`
5. 重建索引

### 6.2 后端架构

**新增/修改文件**：

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `backend/src/controllers/versionController.ts` | 修改 | 新增 `submitReview`、`approveVersion`、`rejectVersion`、`getPendingReviews`、`checkMaterialUpdates`、`refreshSnapshots`、`setCurrentVersion` |
| `backend/src/routes/versions.ts` | 修改 | 注册新路由 |
| `backend/src/services/versionService.ts` | 新增 | 版本审批业务逻辑（从 controller 抽取） |
| `backend/src/middleware/auth.ts` | 修改 | 新增 `requireAdmin` 中间件 |
| `backend/src/scripts/migrations/addApprovalFieldsToFormulaVersions.ts` | 新增 | 数据库迁移 |

**路由注册**：

```typescript
// versions.ts - 新增路由
versionRoutes.post('/:versionId/submit-review', submitReview)
versionRoutes.put('/:versionId/approve', requireAdmin, approveVersion)
versionRoutes.put('/:versionId/reject', requireAdmin, rejectVersion)
versionRoutes.get('/pending-review', requireAdmin, getPendingReviews)
versionRoutes.get('/:versionId/check-material-updates', checkMaterialUpdates)
versionRoutes.post('/:versionId/refresh-snapshots', refreshSnapshots)
versionRoutes.put('/:versionId/set-current', setCurrentVersion)
```

注意：`/pending-review` 路由需注册在 `/:versionId` 参数路由之前，避免路径冲突。

### 6.3 前端架构

**新增/修改文件**：

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `frontend/src/api/version.ts` | 修改 | 新增 API 调用方法 |
| `frontend/src/stores/version.ts` | 修改 | 新增审批相关状态和操作 |
| `frontend/src/views/formulas/FormulaReviewList.vue` | 新增 | 审批列表页 |
| `frontend/src/views/formulas/FormulaDetail.vue` | 修改 | 版本标签、审批按钮、原料版本提示 |
| `frontend/src/views/formulas/FormulaList.vue` | 修改 | 原料新版本提示标签、审批操作 |
| `frontend/src/router/index.ts` | 修改 | 新增审批列表路由 |

**路由配置**：

```typescript
{
  path: 'formulas/reviews',
  name: 'FormulaReviewList',
  component: () => import('@/views/formulas/FormulaReviewList.vue'),
  meta: { title: '审批管理', requiresAuth: true, requiredRole: 'admin' }
}
```

---

## 7. 验收标准

### 7.1 审批流程验收

| 编号 | 验收项 | 预期结果 |
|------|--------|---------|
| AC-01 | 配方师提交草稿审批 | 版本状态从 `draft` 变为 `pending_review`，记录 `submitted_at` |
| AC-02 | 管理员审批通过 | 版本状态变为 `published`，`is_current = 1`，主表数据同步 |
| AC-03 | 管理员审批驳回 | 版本状态回退为 `draft`，驳回原因已记录 |
| AC-04 | 驳回后重新提交 | 版本可再次提交审批，状态变为 `pending_review` |
| AC-05 | 审批列表页展示 | 仅 admin 可访问，正确展示待审批数据 |
| AC-06 | 审批列表筛选 | 按名称/提交人/时间筛选正常工作 |
| AC-07 | 审批数量角标 | 导航栏角标数字与待审批数量一致 |
| AC-08 | formulist 无法审批 | formulist 调用审批接口返回 403 |
| AC-09 | 待审批版本不可编辑 | `pending_review` 状态版本无编辑入口 |
| AC-10 | 审批通过后旧版本归档 | 同一配方的其他 `published` 版本自动归档 |

### 7.2 原料版本感知验收

| 编号 | 验收项 | 预期结果 |
|------|--------|---------|
| AC-11 | 最新版本原料标签 | 显示绿色"最新"标签 |
| AC-12 | 历史版本原料标签 | 显示黄色"历史"标签，hover 提示新版本号 |
| AC-13 | 旧数据兼容 | 无 `materialVersion` 字段的原料不显示版本标签 |
| AC-14 | 配方详情页提示 | 有原料新版本时显示提示条和数量 |
| AC-15 | 配方列表页提示 | 有原料新版本的配方行显示"原料有新版本"标签 |
| AC-16 | 刷新快照创建新版本 | 新版本使用最新原料数据，版本号递增 |
| AC-17 | 刷新快照变更摘要 | `changes_json` 记录原料版本变更 |
| AC-18 | 新版本为草稿状态 | 刷新快照后的新版本需走审批流程 |
| AC-19 | 旧版本自动归档 | 刷新快照后旧版本 `status = 'archived'` |

### 7.3 当前版本管理验收

| 编号 | 验收项 | 预期结果 |
|------|--------|---------|
| AC-20 | 切换当前版本 | 新版本 `is_current = 1`，旧版本 `is_current = 0` |
| AC-21 | 主表数据同步 | 切换后 `formulas` 主表数据与新当前版本快照一致 |
| AC-22 | 仅已发布版本可切换 | 非 `published` 版本无"设为当前"按钮 |
| AC-23 | formulist 数据隔离 | formulist 仅可切换自己创建的配方版本 |
| AC-24 | 配方列表数据一致 | 列表展示数据与当前版本快照一致 |
| AC-25 | 销售报表数据一致 | 报表关联的配方数据取当前版本 |

### 7.4 API 规范验收

| 编号 | 验收项 | 预期结果 |
|------|--------|---------|
| AC-26 | REST 路径规范 | 所有接口遵循 `/api/versions/*` 路径规范 |
| AC-27 | 响应格式规范 | 成功返回 `{ success: true, data: {...} }` |
| AC-28 | 错误码规范 | 401/403/404/400/500 使用标准错误码 |
| AC-29 | 分页规范 | 列表接口使用 `successWithPagination()` |
| AC-30 | 参数校验 | 使用 `validateBody()` 中间件校验输入 |

---

## 8. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| SQLite CHECK 约束修改需重建表 | 迁移期间服务不可用 | 高 | 迁移脚本使用事务，确保原子性；在低峰期执行 |
| `materials_json` 格式变更导致旧数据异常 | 历史配方无法正常展示 | 中 | 前端兼容处理：缺少 `materialVersion` 时按 v1 处理 |
| 审批流程增加发布周期 | 配方上线速度变慢 | 高 | admin 可通过直接发布接口跳过审批（保留 `publishVersion`） |
| 刷新快照后营养成分重新计算结果变化 | 配方师对新数据有疑问 | 中 | 变更摘要明确展示哪些字段变化，新版本为草稿可修改后再提交 |
| 多人同时操作同一配方版本 | 数据竞争 | 低 | 数据库层面通过 `is_current` 唯一性约束和事务保证一致性 |

---

## 9. 实施路线

### Phase 1：审批流程（优先级：高，预计 3 天）

1. 数据库迁移：新增审批字段和 `pending_review` 状态
2. 后端：`requireAdmin` 中间件 + 审批相关接口
3. 前端：审批列表页 + 版本详情页审批按钮 + 状态标签
4. 测试：审批流程端到端测试

### Phase 2：当前版本管理（优先级：高，预计 1 天）

1. 后端：`set-current` 接口
2. 前端：版本列表"设为当前"按钮 + 确认弹窗
3. 测试：版本切换 + 主表同步验证

### Phase 3：原料版本感知与升级（优先级：中，预计 3 天）

1. 后端：`check-material-updates` + `refresh-snapshots` 接口
2. 前端：原料版本标签 + 新版本提示 + 刷新快照交互
3. `materials_json` 格式增强（保存时写入 `materialVersion`、`snapshotNutrition` 等）
4. 测试：版本标签展示 + 快照刷新 + 新版本创建

### Phase 4：集成测试与优化（优先级：中，预计 1 天）

1. 三大功能联合测试
2. 性能优化（审批列表查询、原料版本批量检查）
3. 边界场景测试（并发操作、大数据量）
4. 数据一致性校验脚本

---

## 10. 非目标（本次不实现）

| 功能 | 说明 | 原因 |
|------|------|------|
| 批量审批 | 同时审批多个版本 | 优先保证单条审批流程稳定 |
| 审批通知 | 审批结果推送通知 | 需要消息推送基础设施，后续迭代 |
| 审批历史时间线 | 可视化审批流程图 | 优先保证核心功能，增强体验后续迭代 |
| 自动审批规则 | 满足条件自动通过 | 需要规则引擎，复杂度高 |
| 配方锁定 | 审批期间锁定配方不可编辑 | 当前通过状态控制已满足基本需求 |
| 原料版本批量升级 | 跨配方批量刷新快照 | 需要更复杂的批量操作机制，后续迭代 |
