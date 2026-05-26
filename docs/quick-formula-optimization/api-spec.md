# 接口文档：快速配方 API

## 基础信息

- 基础路径：`/api/quick-formulas`
- 认证方式：Bearer Token（JWT）
- 响应格式：统一 `{ success: boolean, data?: any, error?: { message, code, timestamp } }`

---

## 1. GET /api/quick-formulas

获取快速配方列表

### 请求

#### Query Parameters

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 否 | — | 按配方名称模糊搜索 |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页条数（最大 100） |

#### Headers

```
Authorization: Bearer <token>
```

### 响应

#### 200 OK

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "qf_abc123",
        "name": "清热解毒方",
        "status": "draft",
        "ratioFactor": 0.18,
        "supplementRatioFactor": 1.0,
        "finishedWeight": 3000,
        "materials": [
          {
            "materialId": "mat_001",
            "materialName": "金银花",
            "quantity": 500,
            "materialType": "herb"
          }
        ],
        "packagingPrice": 0,
        "otherPrice": 0,
        "profitMargin": 20,
        "createdBy": "user_001",
        "createdByName": "张三",
        "createdAt": "2026-05-26T08:00:00.000Z",
        "updatedAt": "2026-05-26T08:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 权限

- admin：可见全部快速配方
- formulist：仅可见自己创建的快速配方

---

## 2. GET /api/quick-formulas/:id

获取快速配方详情

### 请求

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 快速配方 ID |

#### Headers

```
Authorization: Bearer <token>
```

### 响应

#### 200 OK

```json
{
  "success": true,
  "data": {
    "id": "qf_abc123",
    "name": "清热解毒方",
    "status": "draft",
    "ratioFactor": 0.18,
    "supplementRatioFactor": 1.0,
    "finishedWeight": 3000,
    "materials": [
      {
        "materialId": "mat_001",
        "materialName": "金银花",
        "quantity": 500,
        "materialType": "herb",
        "unitPrice": 120.00
      }
    ],
    "packagingPrice": 0,
    "otherPrice": 0,
    "profitMargin": 20,
    "description": null,
    "preparationMethod": null,
    "salesmanId": null,
    "salesmanName": null,
    "createdBy": "user_001",
    "createdByName": "张三",
    "createdAt": "2026-05-26T08:00:00.000Z",
    "updatedAt": "2026-05-26T08:30:00.000Z"
  }
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": {
    "message": "快速配方不存在",
    "code": "NOT_FOUND",
    "timestamp": "2026-05-26T08:00:00.000Z"
  }
}
```

### 权限

- admin：可查看任意快速配方
- formulist：仅可查看自己创建的快速配方

---

## 3. POST /api/quick-formulas

创建快速配方

### 请求

#### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 是 | 1-100 字符，同用户下不重复 | 配方名称 |

```json
{
  "name": "清热解毒方"
}
```

### 响应

#### 201 Created

```json
{
  "success": true,
  "data": {
    "id": "qf_abc123",
    "name": "清热解毒方",
    "status": "draft",
    "ratioFactor": 0.18,
    "supplementRatioFactor": 1.0,
    "finishedWeight": 0,
    "materials": [],
    "packagingPrice": 0,
    "otherPrice": 0,
    "profitMargin": 20,
    "description": null,
    "preparationMethod": null,
    "salesmanId": null,
    "salesmanName": null,
    "createdBy": "user_001",
    "createdByName": "张三",
    "createdAt": "2026-05-26T08:00:00.000Z",
    "updatedAt": "2026-05-26T08:00:00.000Z"
  }
}
```

#### 409 Conflict

```json
{
  "success": false,
  "error": {
    "message": "配方名称已存在",
    "code": "DUPLICATE_ENTRY",
    "timestamp": "2026-05-26T08:00:00.000Z"
  }
}
```

#### 400 Validation Error

```json
{
  "success": false,
  "error": {
    "message": "配方名称不能为空",
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-05-26T08:00:00.000Z"
  }
}
```

---

## 4. PUT /api/quick-formulas/:id

更新快速配方（仅 draft 状态可更新）

### 请求

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 快速配方 ID |

#### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| name | string | 否 | 1-100 字符，同用户下不重复 | 配方名称 |
| ratioFactor | number | 否 | 0.15 ~ 0.25 | 主料含量比系数 |
| supplementRatioFactor | number | 否 | 0.5 ~ 1.5 | 辅料含量比系数 |
| finishedWeight | number | 否 | ≥ 0 | 成品重量(g) |
| materials | array | 否 | — | 原料列表 |
| packagingPrice | number | 否 | ≥ 0 | 包装费用 |
| otherPrice | number | 否 | ≥ 0 | 其他费用 |
| profitMargin | number | 否 | ≥ 0 | 利润率(%) |

```json
{
  "name": "清热解毒方-改良版",
  "finishedWeight": 3000,
  "materials": [
    {
      "materialId": "mat_001",
      "materialName": "金银花",
      "quantity": 500,
      "materialType": "herb"
    },
    {
      "materialId": "mat_002",
      "materialName": "菊花",
      "quantity": 300,
      "materialType": "herb"
    }
  ]
}
```

### 响应

#### 200 OK

```json
{
  "success": true,
  "data": {
    "id": "qf_abc123",
    "name": "清热解毒方-改良版",
    "status": "draft",
    "ratioFactor": 0.18,
    "supplementRatioFactor": 1.0,
    "finishedWeight": 3000,
    "materials": [
      {
        "materialId": "mat_001",
        "materialName": "金银花",
        "quantity": 500,
        "materialType": "herb"
      },
      {
        "materialId": "mat_002",
        "materialName": "菊花",
        "quantity": 300,
        "materialType": "herb"
      }
    ],
    "packagingPrice": 0,
    "otherPrice": 0,
    "profitMargin": 20,
    "createdBy": "user_001",
    "createdByName": "张三",
    "createdAt": "2026-05-26T08:00:00.000Z",
    "updatedAt": "2026-05-26T09:00:00.000Z"
  }
}
```

#### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "已发布的快速配方不可编辑",
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-05-26T08:00:00.000Z"
  }
}
```

### 权限

- admin：可更新任意快速配方
- formulist：仅可更新自己创建的 draft 状态快速配方

---

## 5. DELETE /api/quick-formulas/:id

删除快速配方

### 请求

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 快速配方 ID |

#### Headers

```
Authorization: Bearer <token>
```

### 响应

#### 200 OK

```json
{
  "success": true,
  "data": {
    "message": "删除成功"
  }
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": {
    "message": "快速配方不存在",
    "code": "NOT_FOUND",
    "timestamp": "2026-05-26T08:00:00.000Z"
  }
}
```

### 权限

- admin：可删除任意快速配方
- formulist：仅可删除自己创建的快速配方

---

## 6. POST /api/quick-formulas/:id/publish

发布快速配方为正式配方草稿

### 请求

#### Path Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 快速配方 ID |

#### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| salesmanId | string | 是 | 必须存在于 salesmen 表 | 业务员 ID |
| description | string | 是 | 1-2000 字符 | 配方描述 |
| preparationMethod | string | 否 | 最大 5000 字符 | 制备方法 |

```json
{
  "salesmanId": "sls_001",
  "description": "清热解毒，适用于风热感冒初期",
  "preparationMethod": "加水煎煮30分钟，去渣取汁"
}
```

### 响应

#### 200 OK

```json
{
  "success": true,
  "data": {
    "formulaId": "f_xyz789",
    "versionId": "v_def456",
    "quickFormulaStatus": "published"
  }
}
```

#### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "message": "已发布的快速配方不可重复发布",
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-05-26T08:00:00.000Z"
  }
}
```

```json
{
  "success": false,
  "error": {
    "message": "业务员不存在",
    "code": "NOT_FOUND",
    "timestamp": "2026-05-26T08:00:00.000Z"
  }
}
```

### 业务逻辑

1. 校验快速配方存在且 status = `draft`
2. 校验 salesmanId 在 salesmen 表中存在
3. 合并快速配方数据 + 发布补充数据 → 完整配方数据
4. 创建 formulas 记录（含自动生成 code）
5. 创建 formula_versions 记录：
   - admin 角色 → status = `published`
   - formulist 角色 → status = `draft`
6. 更新 quick_formulas.status = `published`
7. 返回新配方 ID 和版本 ID

### 权限

- admin：可发布任意快速配方
- formulist：仅可发布自己创建的快速配方

---

## 错误码汇总

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| UNAUTHORIZED | 401 | 未认证 |
| TOKEN_EXPIRED | 401 | Token 过期 |
| FORBIDDEN | 403 | 无权限操作他人快速配方 |
| NOT_FOUND | 404 | 快速配方不存在 |
| VALIDATION_ERROR | 400 | 参数验证失败 / 已发布不可编辑 |
| DUPLICATE_ENTRY | 409 | 配方名称重复 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
