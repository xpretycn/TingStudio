# 接口文档：原料审批工作流

| 字段 | 值 |
|------|-----|
| 文档编号 | TS-API-20260523-001 |
| 版本 | v1.0 |
| 创建日期 | 2026-05-23 |
| 关联 PRD | TS-PRD-20260523-001 |

---

## 通用说明

- **基础路径**：`/api/materials`
- **认证方式**：所有接口需要 `Authorization: Bearer <token>`（authMiddleware）
- **响应格式**：统一 `{ success: boolean, data: ... }` 或 `{ success: boolean, error: { message, code } }`
- **字段命名**：响应字段使用 camelCase（`rowToCamelCase()` 转换）

---

## 1. 新增接口

### 1.1 提交审批

```
POST /api/materials/:id/submit-review
```

将草稿原料提交审批。

**权限**：创建者或 admin

**请求体**：

```json
{
  "comment": "新增原料当归，营养数据已核实"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `comment` | string | 否 | 提交说明，最大 500 字符 |

**前置条件**：
- 原料存在且未删除
- 原料状态为 `draft`
- 操作人为创建者或 admin

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001",
    "status": "pending_review"
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 场景 |
|-------------|--------|------|
| 404 | NOT_FOUND | 原料不存在 |
| 400 | VALIDATION_ERROR | 原料状态不是 draft |
| 403 | FORBIDDEN | 非创建者且非 admin |

---

### 1.2 审批通过

```
PUT /api/materials/:id/approve
```

审批通过待审批原料，状态变为 published。

**权限**：仅 admin

**请求体**：

```json
{
  "comment": "数据核实无误，批准发布"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `comment` | string | 否 | 审批意见，最大 500 字符 |

**前置条件**：
- 原料存在且未删除
- 原料状态为 `pending_review`
- 操作人为 admin

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001",
    "status": "published"
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 场景 |
|-------------|--------|------|
| 404 | NOT_FOUND | 原料不存在 |
| 400 | VALIDATION_ERROR | 原料状态不是 pending_review |
| 403 | FORBIDDEN | 非 admin |

---

### 1.3 审批驳回

```
PUT /api/materials/:id/reject
```

驳回待审批原料，状态回退为 draft。

**权限**：仅 admin

**请求体**：

```json
{
  "comment": "营养数据不完整，请补充蛋白质和脂肪数据后重新提交"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `comment` | string | **是** | 驳回原因，最少 5 个字符，最大 500 字符 |

**前置条件**：
- 原料存在且未删除
- 原料状态为 `pending_review`
- 操作人为 admin
- `comment` 必填且至少 5 个字符

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001",
    "status": "draft"
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 场景 |
|-------------|--------|------|
| 404 | NOT_FOUND | 原料不存在 |
| 400 | VALIDATION_ERROR | 原料状态不是 pending_review / comment 为空或不足 5 字符 |
| 403 | FORBIDDEN | 非 admin |

---

### 1.4 直接发布

```
PUT /api/materials/:id/publish
```

管理员直接发布原料，跳过审批流程。

**权限**：仅 admin

**请求体**：

```json
{
  "comment": "紧急上线，直接发布"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `comment` | string | 否 | 发布说明，最大 500 字符 |

**前置条件**：
- 原料存在且未删除
- 原料状态为 `draft` 或 `pending_review`
- 操作人为 admin

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001",
    "status": "published"
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 场景 |
|-------------|--------|------|
| 404 | NOT_FOUND | 原料不存在 |
| 400 | VALIDATION_ERROR | 原料状态不是 draft 或 pending_review |
| 403 | FORBIDDEN | 非 admin |

---

### 1.5 获取待审批列表

```
GET /api/materials/pending-review
```

获取所有待审批的原料列表（分页）。

**权限**：仅 admin

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `keyword` | string | 否 | 按原料名称或编码模糊搜索 |
| `page` | number | 否 | 页码，默认 1 |
| `pageSize` | number | 否 | 每页条数，默认 20，最大 100 |

**响应**：

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "mat_001",
        "name": "当归",
        "code": "DG001",
        "materialType": "herb",
        "status": "pending_review",
        "version": 1,
        "createdBy": "user_002",
        "submitterName": "李四",
        "createdAt": "2026-05-23T09:00:00.000Z",
        "updatedAt": "2026-05-23T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

**错误响应**：

| HTTP 状态码 | 错误码 | 场景 |
|-------------|--------|------|
| 403 | FORBIDDEN | 非 admin |

---

### 1.6 获取审批日志

```
GET /api/materials/:id/review-logs
```

获取指定原料的审批日志列表。

**权限**：认证用户

**响应**：

```json
{
  "success": true,
  "data": [
    {
      "reviewLogId": "log_001",
      "materialId": "mat_001",
      "reviewerId": "user_001",
      "reviewerName": "张三",
      "reviewerDisplayName": "管理员张三",
      "action": "submit",
      "comment": "新增原料当归，营养数据已核实",
      "createdAt": "2026-05-23T10:00:00.000Z"
    },
    {
      "reviewLogId": "log_002",
      "materialId": "mat_001",
      "reviewerId": "user_001",
      "reviewerName": "张三",
      "reviewerDisplayName": "管理员张三",
      "action": "approve",
      "comment": "数据核实无误，批准发布",
      "createdAt": "2026-05-23T11:00:00.000Z"
    }
  ]
}
```

**action 枚举说明**：

| action | 中文含义 | 触发场景 |
|--------|---------|---------|
| `submit` | 提交审批 | draft → pending_review |
| `approve` | 审批通过 | pending_review → published |
| `reject` | 审批驳回 | pending_review → draft |
| `publish` | 直接发布 | draft/pending_review → published |

---

## 2. 增强接口

### 2.1 获取原料列表（增强）

```
GET /api/materials?keyword=&page=&pageSize=&status=
```

**新增查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `status` | string | 否 | 按状态筛选：`draft`/`pending_review`/`published`，不传则返回全部 |

**响应增强**：

列表项新增 `status` 字段：

```json
{
  "id": "mat_001",
  "name": "当归",
  "code": "DG001",
  "status": "published",
  ...
}
```

### 2.2 获取单个原料（增强）

```
GET /api/materials/:id
```

**响应增强**：

详情新增 `status` 字段和 `reviewLogs` 字段：

```json
{
  "id": "mat_001",
  "name": "当归",
  "status": "published",
  "reviewLogs": [
    {
      "reviewLogId": "log_001",
      "action": "submit",
      "reviewerName": "张三",
      "comment": "新增原料当归",
      "createdAt": "2026-05-23T10:00:00.000Z"
    }
  ],
  ...
}
```

### 2.3 创建原料（增强）

```
POST /api/materials
```

**行为变更**：

- 新建原料默认 `status = 'draft'`
- 响应中包含 `status` 字段

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "mat_new",
    "status": "draft",
    "message": "原料创建成功，当前为草稿状态"
  }
}
```

### 2.4 更新原料（增强）

```
PUT /api/materials/:id
```

**行为变更**：

- `pending_review` 状态的原料不可编辑，返回 400 错误
- `published` 状态的原料编辑时，创建新版本且 `status = 'draft'`
- `draft` 状态的原料正常编辑

**错误响应新增**：

| HTTP 状态码 | 错误码 | 场景 |
|-------------|--------|------|
| 400 | VALIDATION_ERROR | 原料处于待审批状态，不可编辑 |

---

## 3. 错误码汇总

| 错误码 | HTTP 状态码 | 场景 |
|--------|-------------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `TOKEN_EXPIRED` | 401 | Token 过期 |
| `FORBIDDEN` | 403 | 无权限（非 admin 审批、非创建者提交） |
| `NOT_FOUND` | 404 | 原料不存在 |
| `VALIDATION_ERROR` | 400 | 状态不合法 / 驳回原因为空 / 待审批不可编辑 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 4. 前端 API 层变更

```typescript
// frontend/src/api/material.ts

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

// Material 接口新增
export interface Material {
  // ... 既有字段
  status: "draft" | "pending_review" | "published";
  reviewLogs?: MaterialReviewLog[];
}

// 新增 API 方法
submitReview(id: string, comment?: string): Promise<any>;
approve(id: string, comment?: string): Promise<any>;
reject(id: string, comment: string): Promise<any>;
publish(id: string, comment?: string): Promise<any>;
getPendingReviews(params?: { keyword?: string; page?: number; pageSize?: number }): Promise<any>;
getReviewLogs(id: string): Promise<MaterialReviewLog[]>;
```
