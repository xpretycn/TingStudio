# 接口文档：快速配方录入功能

## 1. 配方模板 API

基础路径：`/api/formula-templates`

所有接口需 `authMiddleware` 认证。

---

### 1.1 获取模板列表

```
GET /api/formula-templates
```

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索模板名称 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "tpl-uuid-001",
        "name": "清热解毒基础方",
        "description": "适用于清热解毒类配方的基础模板",
        "ratioFactor": 0.18,
        "supplementRatioFactor": 1.0,
        "finishedWeight": 3000,
        "materials": [
          {
            "materialId": "mat-uuid-001",
            "materialName": "金银花",
            "quantity": 150,
            "materialType": "herb"
          }
        ],
        "packagingPrice": 5.0,
        "otherPrice": 2.0,
        "profitMargin": 20,
        "createdBy": "user-uuid-001",
        "createdByName": "张三",
        "createdAt": "2026-05-24T10:00:00.000Z",
        "updatedAt": "2026-05-24T10:00:00.000Z"
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

**权限规则**：
- admin：可见所有模板
- formulist：仅可见自己创建的模板

---

### 1.2 获取模板详情

```
GET /api/formula-templates/:id
```

**Path Parameters**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 模板 ID |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "id": "tpl-uuid-001",
    "name": "清热解毒基础方",
    "description": "适用于清热解毒类配方的基础模板",
    "ratioFactor": 0.18,
    "supplementRatioFactor": 1.0,
    "finishedWeight": 3000,
    "materials": [
      {
        "materialId": "mat-uuid-001",
        "materialName": "金银花",
        "quantity": 150,
        "materialType": "herb"
      }
    ],
    "packagingPrice": 5.0,
    "otherPrice": 2.0,
    "profitMargin": 20,
    "createdBy": "user-uuid-001",
    "createdByName": "张三",
    "createdAt": "2026-05-24T10:00:00.000Z",
    "updatedAt": "2026-05-24T10:00:00.000Z"
  }
}
```

**Error 404**:

```json
{
  "success": false,
  "error": {
    "message": "模板不存在",
    "code": "NOT_FOUND",
    "timestamp": "2026-05-24T10:00:00.000Z"
  }
}
```

---

### 1.3 创建模板

```
POST /api/formula-templates
```

**Request Body**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 模板名称，最长 50 字符 |
| description | string | 否 | 模板描述 |
| ratioFactor | number | 是 | 主料系数，范围 0.15-0.25 |
| supplementRatioFactor | number | 是 | 辅料系数，范围 0.5-1.5 |
| finishedWeight | number | 是 | 成品重量(g)，> 0 |
| materials | array | 是 | 原料列表，至少 1 项 |
| materials[].materialId | string | 是 | 原料 ID |
| materials[].materialName | string | 是 | 原料名称 |
| materials[].quantity | number | 是 | 用量(g)，> 0 |
| materials[].materialType | string | 是 | 原料类型 herb/supplement |
| packagingPrice | number | 否 | 包材费用，默认 0 |
| otherPrice | number | 否 | 其他费用，默认 0 |
| profitMargin | number | 否 | 利润率(%)，默认 20 |

**Request Example**:

```json
{
  "name": "清热解毒基础方",
  "description": "适用于清热解毒类配方的基础模板",
  "ratioFactor": 0.18,
  "supplementRatioFactor": 1.0,
  "finishedWeight": 3000,
  "materials": [
    {
      "materialId": "mat-uuid-001",
      "materialName": "金银花",
      "quantity": 150,
      "materialType": "herb"
    },
    {
      "materialId": "mat-uuid-002",
      "materialName": "麦冬",
      "quantity": 100,
      "materialType": "supplement"
    }
  ],
  "packagingPrice": 5.0,
  "otherPrice": 2.0,
  "profitMargin": 20
}
```

**Response 201**:

```json
{
  "success": true,
  "data": {
    "id": "tpl-uuid-new",
    "name": "清热解毒基础方",
    "description": "适用于清热解毒类配方的基础模板",
    "ratioFactor": 0.18,
    "supplementRatioFactor": 1.0,
    "finishedWeight": 3000,
    "materials": [...],
    "packagingPrice": 5.0,
    "otherPrice": 2.0,
    "profitMargin": 20,
    "createdBy": "user-uuid-001",
    "createdByName": "张三",
    "createdAt": "2026-05-24T10:00:00.000Z",
    "updatedAt": "2026-05-24T10:00:00.000Z"
  }
}
```

**Error 400** (VALIDATION_ERROR):

```json
{
  "success": false,
  "error": {
    "message": "模板名称不能为空",
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-05-24T10:00:00.000Z"
  }
}
```

**Error 409** (DUPLICATE_ENTRY):

```json
{
  "success": false,
  "error": {
    "message": "模板名称已存在",
    "code": "DUPLICATE_ENTRY",
    "timestamp": "2026-05-24T10:00:00.000Z"
  }
}
```

---

### 1.4 更新模板

```
PUT /api/formula-templates/:id
```

**Path Parameters**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 模板 ID |

**Request Body**: 同创建模板，所有字段可选

**Response 200**: 同创建模板响应

**权限规则**：
- admin 可更新任何模板
- formulist 仅可更新自己创建的模板

**Error 403**:

```json
{
  "success": false,
  "error": {
    "message": "无权限修改该模板",
    "code": "FORBIDDEN",
    "timestamp": "2026-05-24T10:00:00.000Z"
  }
}
```

---

### 1.5 删除模板

```
DELETE /api/formula-templates/:id
```

**Path Parameters**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 模板 ID |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "message": "模板已删除"
  }
}
```

**权限规则**：同更新模板

---

## 2. 复用现有接口

### 2.1 创建配方（已有）

```
POST /api/formulas
```

快速录入提交时复用此接口，请求体与现有 `FormulaForm` 一致。

### 2.2 含量比实时校验（已有）

```
POST /api/formulas/validate-ratio
```

提交前调用此接口校验含量比。

### 2.3 获取原料列表（已有）

```
GET /api/materials
```

原料池数据来源。使用 `scope=all` 获取全部已发布原料。

### 2.4 获取业务员列表（已有）

```
GET /api/salesmen
```

提交对话框中业务员选择的数据来源。

---

## 3. 前端 API 封装

### 3.1 formulaTemplate.ts

```typescript
// api/formulaTemplate.ts

import http from './http'

export interface TemplateMaterial {
  materialId: string
  materialName: string
  quantity: number
  materialType: string
}

export interface FormulaTemplate {
  id: string
  name: string
  description: string | null
  ratioFactor: number
  supplementRatioFactor: number
  finishedWeight: number
  materials: TemplateMaterial[]
  packagingPrice: number
  otherPrice: number
  profitMargin: number
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface TemplateListParams {
  keyword?: string
  page?: number
  pageSize?: number
}

export function getTemplateList(params?: TemplateListParams) {
  return http.get<FormulaTemplate[]>('/formula-templates', { params })
}

export function getTemplateById(id: string) {
  return http.get<FormulaTemplate>(`/formula-templates/${id}`)
}

export function createTemplate(data: Omit<FormulaTemplate, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedAt'>) {
  return http.post<FormulaTemplate>('/formula-templates', data)
}

export function updateTemplate(id: string, data: Partial<FormulaTemplate>) {
  return http.put<FormulaTemplate>(`/formula-templates/${id}`, data)
}

export function deleteTemplate(id: string) {
  return http.delete(`/formula-templates/${id}`)
}
```

---

## 4. 错误码汇总

| HTTP | 错误码 | 说明 |
|------|--------|------|
| 400 | VALIDATION_ERROR | 参数校验失败 |
| 401 | UNAUTHORIZED | 未认证 |
| 403 | FORBIDDEN | 无权限操作该模板 |
| 404 | NOT_FOUND | 模板不存在 |
| 409 | DUPLICATE_ENTRY | 模板名称重复 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
