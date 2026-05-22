# 配方版本审批优化 — API 接口文档

> 版本：v1.0
> 日期：2026-05-22
> 模块：配方版本审批流程 + 原料快照刷新
> 路由前缀：`/api/versions`

---

## 1. 概述

### 1.1 背景

当前配方版本状态仅有 `draft` / `published` / `archived` 三种，发布操作由配方师（formulist）直接执行，缺少管理员审核环节。本次优化新增 `pending_review` 状态和审批流程，同时新增原料快照刷新机制，使配方中引用的原料数据可随原料版本升级而更新。

### 1.2 版本状态流转

```
draft ──(提交审核)──→ pending_review ──(审批通过)──→ published
                          │
                          └──(审批驳回)──→ draft
```

| 状态 | 说明 | 可执行操作 |
|------|------|-----------|
| `draft` | 草稿，可编辑 | 提交审核、删除 |
| `pending_review` | 待审核，不可编辑 | 审批通过、审批驳回 |
| `published` | 已发布，为当前生效版本 | 设为当前版本 |
| `archived` | 已归档的历史版本 | 无 |

### 1.3 权限矩阵

| 操作 | formulist | admin |
|------|-----------|-------|
| 提交审核 | 仅自己创建的配方 | 所有配方 |
| 审批通过 | - | 所有 |
| 审批驳回 | - | 所有 |
| 查看待审核列表 | - | 所有 |
| 查看审核日志 | 仅自己创建的配方 | 所有 |
| 检查原料更新 | 仅自己创建的配方 | 所有 |
| 刷新快照 | 仅自己创建的配方 | 所有 |
| 设为当前版本 | 仅自己创建的配方 | 所有 |

### 1.4 通用响应格式

**成功响应**

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**分页响应**

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

**错误响应**

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "timestamp": "2026-05-22T08:00:00.000Z"
  }
}
```

### 1.5 认证方式

所有接口需在请求头携带 JWT Token：

```
Authorization: Bearer <token>
```

Token 解码后 `req.user` 包含：

```typescript
{
  userId: string;
  role: "admin" | "formulist";
  permissions: string[];
}
```

### 1.6 错误码一览

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未认证，缺少或无效的 Token |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `FORBIDDEN` | 403 | 无权限执行此操作 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `DUPLICATE_ENTRY` | 409 | 数据重复（如重复提交审核） |
| `INVALID_STATUS` | 409 | 版本状态不允许此操作 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 2. 数据库变更

### 2.1 formula_versions 表 — 状态扩展

现有 `status` 字段的 CHECK 约束需从：

```sql
CHECK(status IN ('draft', 'published', 'archived'))
```

扩展为：

```sql
CHECK(status IN ('draft', 'pending_review', 'published', 'archived'))
```

**迁移脚本**（SQLite 需重建表，MySQL 可直接 ALTER）：

```sql
-- MySQL
ALTER TABLE formula_versions
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft'
  CHECK(status IN ('draft', 'pending_review', 'published', 'archived'));
```

### 2.2 新增 version_review_logs 表

```sql
CREATE TABLE IF NOT EXISTS `version_review_logs` (
  `log_id` TEXT PRIMARY KEY,
  `version_id` TEXT NOT NULL,
  `formula_id` TEXT NOT NULL,
  `action` TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
  `comment` TEXT DEFAULT NULL,
  `operator_id` TEXT NOT NULL,
  `operator_name` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`version_id`) REFERENCES `formula_versions`(`version_id`) ON DELETE CASCADE,
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_vrl_version` ON `version_review_logs`(`version_id`);
CREATE INDEX IF NOT EXISTS `idx_vrl_formula` ON `version_review_logs`(`formula_id`);
CREATE INDEX IF NOT EXISTS `idx_vrl_action` ON `version_review_logs`(`action`);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `log_id` | TEXT PK | 日志 ID，由 `generateId()` 生成 |
| `version_id` | TEXT FK | 关联版本 ID |
| `formula_id` | TEXT FK | 关联配方 ID（冗余，便于按配方查询） |
| `action` | TEXT | 操作类型：`submit` / `approve` / `reject` |
| `comment` | TEXT | 审批意见（驳回时必填） |
| `operator_id` | TEXT | 操作人 ID |
| `operator_name` | TEXT | 操作人姓名 |
| `created_at` | TEXT | 操作时间 |

---

## 3. API 接口详情

---

### 3.1 提交审核

将配方版本从 `draft` 状态提交为 `pending_review`，等待管理员审批。

**请求**

```
POST /api/versions/submit/:versionId
```

**认证**：必须（formulist 或 admin）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `versionId` | string | 版本 ID |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `comment` | string | 否 | 提交说明，如"修改了山楂用量" |

**请求示例**

```bash
curl -X POST http://localhost:3000/api/versions/submit/v_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"comment": "调整了炒山楂和决明子的用量比例"}'
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "提交审核成功",
  "data": {
    "versionId": "v_abc123",
    "status": "pending_review",
    "formulaId": "f_xyz789",
    "versionNumber": "v2.0"
  }
}
```

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 版本不存在 | 404 | `NOT_FOUND` | 版本不存在 |
| 版本非 draft 状态 | 409 | `INVALID_STATUS` | 仅草稿版本可提交审核 |
| formulist 非创建人 | 403 | `FORBIDDEN` | 只能提交自己创建的配方版本 |
| 重复提交 | 409 | `DUPLICATE_ENTRY` | 该版本已提交审核，请勿重复操作 |

---

### 3.2 审批通过

管理员审核通过，将版本状态从 `pending_review` 变更为 `published`，同时设为当前版本并同步到 formulas 表。

**请求**

```
PUT /api/versions/approve/:versionId
```

**认证**：必须（admin only）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `versionId` | string | 版本 ID |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `comment` | string | 否 | 审批意见 |

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/versions/approve/v_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"comment": "用量调整合理，审批通过"}'
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "审批通过",
  "data": {
    "versionId": "v_abc123",
    "status": "published",
    "isCurrent": 1,
    "formulaId": "f_xyz789",
    "versionNumber": "v2.0"
  }
}
```

**业务逻辑**

1. 验证版本存在且状态为 `pending_review`
2. 将同一配方的其他 `published` 版本归档（`status → archived`, `is_current → 0`）
3. 将当前版本设为 `published` + `is_current = 1`
4. 将快照数据回写到 `formulas` 表（与现有 `publishVersion` 逻辑一致）
5. 写入审核日志（`action: approve`）

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 版本不存在 | 404 | `NOT_FOUND` | 版本不存在 |
| 版本非 pending_review 状态 | 409 | `INVALID_STATUS` | 仅待审核版本可审批通过 |
| 非 admin 角色 | 403 | `FORBIDDEN` | 仅管理员可审批 |

---

### 3.3 审批驳回

管理员驳回审核，将版本状态从 `pending_review` 退回为 `draft`，配方师可修改后重新提交。

**请求**

```
PUT /api/versions/reject/:versionId
```

**认证**：必须（admin only）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `versionId` | string | 版本 ID |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `comment` | string | **是** | 驳回原因（必填） |

**验证规则**

```typescript
validateBody({
  comment: { type: "string", required: true, minLength: 1, maxLength: 500, message: "请填写驳回原因" }
})
```

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/versions/reject/v_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"comment": "山楂用量超出安全范围，请调整后重新提交"}'
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "已驳回",
  "data": {
    "versionId": "v_abc123",
    "status": "draft",
    "comment": "山楂用量超出安全范围，请调整后重新提交",
    "formulaId": "f_xyz789",
    "versionNumber": "v2.0"
  }
}
```

**业务逻辑**

1. 验证版本存在且状态为 `pending_review`
2. 将版本状态改回 `draft`
3. 写入审核日志（`action: reject`，记录驳回原因）

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 版本不存在 | 404 | `NOT_FOUND` | 版本不存在 |
| 版本非 pending_review 状态 | 409 | `INVALID_STATUS` | 仅待审核版本可驳回 |
| comment 为空 | 400 | `VALIDATION_ERROR` | 请填写驳回原因 |
| 非 admin 角色 | 403 | `FORBIDDEN` | 仅管理员可驳回 |

---

### 3.4 获取待审核列表

管理员查看所有待审核的配方版本列表。

**请求**

```
GET /api/versions/pending-review
```

**认证**：必须（admin only）

**查询参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | number | 否 | 1 | 页码 |
| `pageSize` | number | 否 | 20 | 每页条数（最大 100） |
| `keyword` | string | 否 | - | 按配方名称或业务员名称模糊搜索 |

**请求示例**

```bash
curl -X GET "http://localhost:3000/api/versions/pending-review?page=1&pageSize=10&keyword=山楂" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "versionId": "v_abc123",
        "formulaId": "f_xyz789",
        "formulaName": "消积通便方",
        "versionNumber": "v2.0",
        "versionName": "调整山楂用量",
        "status": "pending_review",
        "isCurrent": 0,
        "submittedBy": "u_formulist01",
        "submittedByName": "张三",
        "submittedAt": "2026-05-22T10:30:00.000Z",
        "submitComment": "调整了炒山楂和决明子的用量比例"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `versionId` | string | 版本 ID |
| `formulaId` | string | 配方 ID |
| `formulaName` | string | 配方名称（来自快照） |
| `versionNumber` | string | 版本号 |
| `versionName` | string | 版本名称 |
| `status` | string | 状态（固定为 `pending_review`） |
| `isCurrent` | number | 是否当前版本 |
| `submittedBy` | string | 提交人 ID |
| `submittedByName` | string | 提交人姓名 |
| `submittedAt` | string | 提交时间（ISO 8601） |
| `submitComment` | string | 提交时附带的说明 |

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 非 admin 角色 | 403 | `FORBIDDEN` | 仅管理员可查看待审核列表 |

---

### 3.5 获取审核日志

获取某个版本的全部审核操作记录。

**请求**

```
GET /api/versions/review-logs/:versionId
```

**认证**：必须（formulist 仅可查看自己创建的配方，admin 可查看所有）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `versionId` | string | 版本 ID |

**请求示例**

```bash
curl -X GET http://localhost:3000/api/versions/review-logs/v_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "versionId": "v_abc123",
    "formulaId": "f_xyz789",
    "versionNumber": "v2.0",
    "logs": [
      {
        "logId": "log_001",
        "action": "submit",
        "comment": "调整了炒山楂和决明子的用量比例",
        "operatorId": "u_formulist01",
        "operatorName": "张三",
        "createdAt": "2026-05-22T10:30:00.000Z"
      },
      {
        "logId": "log_002",
        "action": "reject",
        "comment": "山楂用量超出安全范围，请调整后重新提交",
        "operatorId": "u_admin01",
        "operatorName": "管理员",
        "createdAt": "2026-05-22T11:00:00.000Z"
      },
      {
        "logId": "log_003",
        "action": "submit",
        "comment": "已调整山楂用量至安全范围",
        "operatorId": "u_formulist01",
        "operatorName": "张三",
        "createdAt": "2026-05-22T14:00:00.000Z"
      },
      {
        "logId": "log_004",
        "action": "approve",
        "comment": "用量调整合理，审批通过",
        "operatorId": "u_admin01",
        "operatorName": "管理员",
        "createdAt": "2026-05-22T14:30:00.000Z"
      }
    ]
  }
}
```

**日志 action 说明**

| action | 说明 |
|--------|------|
| `submit` | 提交审核 |
| `approve` | 审批通过 |
| `reject` | 审批驳回 |

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 版本不存在 | 404 | `NOT_FOUND` | 版本不存在 |
| formulist 非创建人 | 403 | `FORBIDDEN` | 只能查看自己创建的配方的审核日志 |

---

### 3.6 检查原料更新

解析配方快照中的 `materials_json`，逐一检查每个原料的 `is_latest` 标志，返回存在更新版本的原料列表。

**请求**

```
GET /api/versions/material-updates/:formulaId
```

**认证**：必须（formulist 仅可查看自己创建的配方，admin 可查看所有）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `formulaId` | string | 配方 ID |

**请求示例**

```bash
curl -X GET http://localhost:3000/api/versions/material-updates/f_xyz789 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "formulaId": "f_xyz789",
    "formulaName": "消积通便方",
    "hasUpdates": true,
    "materials": [
      {
        "materialId": "m_hawthorn_v1",
        "materialName": "炒山楂",
        "currentVersion": 1,
        "latestVersion": 2,
        "latestMaterialId": "m_hawthorn_v2"
      },
      {
        "materialId": "m_cassia_v1",
        "materialName": "决明子",
        "currentVersion": 1,
        "latestVersion": 3,
        "latestMaterialId": "m_cassia_v3"
      }
    ]
  }
}
```

**无更新时的响应**

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "formulaId": "f_xyz789",
    "formulaName": "消积通便方",
    "hasUpdates": false,
    "materials": []
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `formulaId` | string | 配方 ID |
| `formulaName` | string | 配方名称 |
| `hasUpdates` | boolean | 是否存在原料更新 |
| `materials` | array | 有更新的原料列表 |
| `materials[].materialId` | string | 当前引用的原料 ID |
| `materials[].materialName` | string | 原料名称 |
| `materials[].currentVersion` | number | 当前引用的原料版本号 |
| `materials[].latestVersion` | number | 最新原料版本号 |
| `materials[].latestMaterialId` | string | 最新版本原料的 ID |

**业务逻辑**

1. 获取配方的当前版本快照
2. 解析 `snapshot_json.materials`，提取每个原料的 `materialId`
3. 查询 `materials` 表，检查每个原料的 `is_latest` 标志
4. 若 `is_latest = 0`，则通过 `previous_version_id` 链找到最新版本
5. 仅返回存在更新的原料

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 配方不存在 | 404 | `NOT_FOUND` | 配方不存在 |
| 配方无版本 | 404 | `NOT_FOUND` | 该配方暂无版本数据 |
| formulist 非创建人 | 403 | `FORBIDDEN` | 只能查看自己创建的配方的原料更新 |

---

### 3.7 刷新快照（升级原料）

基于最新原料版本数据创建新的配方版本，状态为 `draft`，配方师可确认后提交审核。

**请求**

```
POST /api/versions/refresh-snapshot/:formulaId
```

**认证**：必须（formulist 仅可操作自己创建的配方，admin 可操作所有）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `formulaId` | string | 配方 ID |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `materialIds` | string[] | 否 | 仅刷新指定原料，默认刷新全部有更新的原料 |

**请求示例 — 刷新全部**

```bash
curl -X POST http://localhost:3000/api/versions/refresh-snapshot/f_xyz789 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

**请求示例 — 仅刷新指定原料**

```bash
curl -X POST http://localhost:3000/api/versions/refresh-snapshot/f_xyz789 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"materialIds": ["m_hawthorn_v1"]}'
```

**成功响应** `201`

```json
{
  "success": true,
  "message": "快照刷新成功，已创建新版本",
  "data": {
    "versionId": "v_new456",
    "formulaId": "f_xyz789",
    "versionNumber": "v2.1",
    "status": "draft",
    "updatedMaterials": [
      {
        "materialId": "m_hawthorn_v2",
        "materialName": "炒山楂",
        "oldVersion": 1,
        "newVersion": 2,
        "changes": {
          "unitPrice": { "old": 60, "new": 65 }
        }
      },
      {
        "materialId": "m_cassia_v3",
        "materialName": "决明子",
        "oldVersion": 1,
        "newVersion": 3,
        "changes": {
          "unitPrice": { "old": 45, "new": 48 }
        }
      }
    ]
  }
}
```

**业务逻辑**

1. 获取配方的当前版本快照
2. 解析 `snapshot_json.materials`
3. 若指定 `materialIds`，仅替换指定原料；否则替换全部有更新的原料
4. 对每个需刷新的原料：
   - 通过 `previous_version_id` 链找到最新版本原料
   - 用最新原料数据替换快照中的对应条目（保留 `quantity` 等配方特有字段）
   - 记录变更（价格、营养数据等差异）
5. 生成新版本号（次版本号 +1，如 `v2.0 → v2.1`）
6. 创建新版本记录，`status = draft`，`is_current = 1`
7. 旧当前版本 `is_current = 0`
8. 在 `changes_json` 中记录原料版本升级变更

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 配方不存在 | 404 | `NOT_FOUND` | 配方不存在 |
| 配方无版本 | 404 | `NOT_FOUND` | 该配方暂无版本数据 |
| 无需刷新 | 400 | `VALIDATION_ERROR` | 所有原料均为最新版本，无需刷新 |
| 指定原料不存在更新 | 400 | `VALIDATION_ERROR` | 指定的原料均为最新版本 |
| formulist 非创建人 | 403 | `FORBIDDEN` | 只能刷新自己创建的配方 |

---

### 3.8 设为当前版本

将已发布的版本设为当前生效版本，同时取消其他版本的当前标记，并同步快照到 formulas 表。

**请求**

```
PUT /api/versions/set-current/:versionId
```

**认证**：必须（formulist 仅可操作自己创建的配方，admin 可操作所有）

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `versionId` | string | 版本 ID |

**请求体**：无

**请求示例**

```bash
curl -X PUT http://localhost:3000/api/versions/set-current/v_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**成功响应** `200`

```json
{
  "success": true,
  "message": "已设为当前版本",
  "data": {
    "versionId": "v_abc123",
    "formulaId": "f_xyz789",
    "versionNumber": "v2.0",
    "isCurrent": 1,
    "status": "published"
  }
}
```

**业务逻辑**

1. 验证版本存在且状态为 `published`
2. 将同配方的其他版本 `is_current = 0`
3. 将目标版本 `is_current = 1`
4. 将快照数据回写到 `formulas` 表（与 `publishVersion` 逻辑一致）

**错误响应**

| 场景 | HTTP | code | message |
|------|------|------|---------|
| 版本不存在 | 404 | `NOT_FOUND` | 版本不存在 |
| 版本非 published 状态 | 409 | `INVALID_STATUS` | 仅已发布版本可设为当前版本 |
| formulist 非创建人 | 403 | `FORBIDDEN` | 只能操作自己创建的配方 |

---

## 4. 现有接口变更

### 4.1 GET /api/versions/formula/:formulaId — 版本列表

**变更点**：`status` 查询参数新增 `pending_review` 值。

```
GET /api/versions/formula/:formulaId?status=pending_review
```

响应中版本的 `status` 字段可能出现 `pending_review` 值，前端需适配展示。

### 4.2 PUT /api/versions/publish/:versionId — 发布版本（保留，标记废弃）

**变更点**：此接口保留向后兼容，但标记为废弃（deprecated）。新增的审批流程中，发布操作应通过 `PUT /api/versions/approve/:versionId` 完成。

| 对比项 | `PUT /versions/publish/:versionId`（旧） | `PUT /versions/approve/:versionId`（新） |
|--------|------------------------------------------|------------------------------------------|
| 权限 | 任何认证用户 | admin only |
| 前置状态 | draft | pending_review |
| 审核日志 | 不记录 | 记录 |
| 状态 | 废弃（保留兼容） | 推荐 |

### 4.3 POST /api/versions/formula/:formulaId — 创建版本

**变更点**：`status` 字段新增可选值 `pending_review`。创建版本时可直接指定 `status: "pending_review"` 以跳过草稿阶段直接进入审核（一般不推荐，保留灵活性）。

---

## 5. 路由注册

新增路由需在 [versions.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/backend/src/routes/versions.ts) 中注册：

```typescript
// 版本控制路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { requirePermission } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import {
  getVersions, getVersion, createVersion, publishVersion, compareVersions,
  submitForReview, approveVersion, rejectVersion,
  getPendingReview, getReviewLogs,
  checkMaterialUpdates, refreshSnapshot, setCurrentVersion,
} from '../controllers/versionController.js'

export const versionRoutes = Router()

versionRoutes.use(authMiddleware)

// 现有路由
versionRoutes.get('/formula/:formulaId', getVersions)
versionRoutes.get('/detail/:versionId', getVersion)
versionRoutes.post('/formula/:formulaId', createVersion)
versionRoutes.put('/publish/:versionId', publishVersion)          // 废弃，保留兼容
versionRoutes.get('/compare/:formulaId', compareVersions)

// 新增：审批流程
versionRoutes.post('/submit/:versionId', submitForReview)
versionRoutes.put('/approve/:versionId', requirePermission('approve'), approveVersion)
versionRoutes.put('/reject/:versionId', requirePermission('approve'), validateBody({
  comment: { type: 'string', required: true, minLength: 1, maxLength: 500, message: '请填写驳回原因' }
}), rejectVersion)
versionRoutes.get('/pending-review', requirePermission('approve'), getPendingReview)
versionRoutes.get('/review-logs/:versionId', getReviewLogs)

// 新增：原料快照刷新
versionRoutes.get('/material-updates/:formulaId', checkMaterialUpdates)
versionRoutes.post('/refresh-snapshot/:formulaId', refreshSnapshot)

// 新增：设为当前版本
versionRoutes.put('/set-current/:versionId', setCurrentVersion)
```

---

## 6. 前端 API 层变更

[version.ts](file:///d:/Program%20Data/workspace-codebd/TingStudio/frontend/src/api/version.ts) 需新增以下方法：

```typescript
// 提交审核
submitForReview(versionId: string, data?: { comment?: string }) {
  return http.post<any, any>(`/versions/submit/${versionId}`, data)
},

// 审批通过
approveVersion(versionId: string, data?: { comment?: string }) {
  return http.put<any, any>(`/versions/approve/${versionId}`, data)
},

// 审批驳回
rejectVersion(versionId: string, data: { comment: string }) {
  return http.put<any, any>(`/versions/reject/${versionId}`, data)
},

// 获取待审核列表
getPendingReview(params?: { page?: number; pageSize?: number; keyword?: string }) {
  return http.get<any, any>('/versions/pending-review', { params })
},

// 获取审核日志
getReviewLogs(versionId: string) {
  return http.get<any, any>(`/versions/review-logs/${versionId}`)
},

// 检查原料更新
checkMaterialUpdates(formulaId: string) {
  return http.get<any, any>(`/versions/material-updates/${formulaId}`)
},

// 刷新快照
refreshSnapshot(formulaId: string, data?: { materialIds?: string[] }) {
  return http.post<any, any>(`/versions/refresh-snapshot/${formulaId}`, data)
},

// 设为当前版本
setCurrentVersion(versionId: string) {
  return http.put<any, any>(`/versions/set-current/${versionId}`)
},
```

同时 `FormulaVersion` 接口的 `status` 类型需更新：

```typescript
status: 'draft' | 'pending_review' | 'published' | 'archived'
```

---

## 7. 完整接口汇总

| 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|
| POST | `/api/versions/submit/:versionId` | 必须 | formulist(自己) / admin | 提交审核 |
| PUT | `/api/versions/approve/:versionId` | 必须 | admin | 审批通过 |
| PUT | `/api/versions/reject/:versionId` | 必须 | admin | 审批驳回 |
| GET | `/api/versions/pending-review` | 必须 | admin | 获取待审核列表 |
| GET | `/api/versions/review-logs/:versionId` | 必须 | formulist(自己) / admin | 获取审核日志 |
| GET | `/api/versions/material-updates/:formulaId` | 必须 | formulist(自己) / admin | 检查原料更新 |
| POST | `/api/versions/refresh-snapshot/:formulaId` | 必须 | formulist(自己) / admin | 刷新快照 |
| PUT | `/api/versions/set-current/:versionId` | 必须 | formulist(自己) / admin | 设为当前版本 |
| GET | `/api/versions/formula/:formulaId` | 必须 | - | 版本列表（status 新增 pending_review） |
| GET | `/api/versions/detail/:versionId` | 必须 | - | 版本详情 |
| POST | `/api/versions/formula/:formulaId` | 必须 | - | 创建版本 |
| PUT | `/api/versions/publish/:versionId` | 必须 | - | 发布版本（废弃） |
| GET | `/api/versions/compare/:formulaId` | 必须 | - | 版本对比 |
