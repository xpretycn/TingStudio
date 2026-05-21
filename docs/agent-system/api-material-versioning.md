# 接口文档：原料管理版本化系统

## 通用说明

- **基础路径**：`/api/materials`
- **认证方式**：所有接口需要 `Authorization: Bearer <token>`（authMiddleware）
- **响应格式**：统一 `{ success: boolean, data: ... }` 或 `{ success: boolean, error: { message, code } }`
- **字段命名**：响应字段使用 camelCase（`rowToCamelCase()` 转换）
- **请求体**：使用 snake_case（数据库直接存储）
- **版本号**：从 1 开始递增，`v1, v2, v3, ...`

---

## 1. 增强接口

### 1.1 获取原料列表

```
GET /api/materials?keyword=&page=&pageSize=&scope=
```

**增强说明**：响应中增加版本字段。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "mat_001",
        "name": "当归",
        "code": "DG001",
        "unit": "g",
        "stock": 500,
        "materialType": "herb",
        "unitPrice": 28.00,
        "dataSource": "manual",
        "createdBy": "user_001",
        "createdAt": "2026-05-15T09:00:00.000Z",
        "updatedAt": "2026-05-21T14:30:00.000Z",
        "version": 2,
        "isLatest": 1,
        "isDeleted": 0,
        "totalVersions": 2,
        "isOwner": true,
        "referenceCount": 3,
        "hasNewerVersion": false
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

**新增字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | number | 当前版本号 |
| `isLatest` | 0\|1 | 是否为最新版本 |
| `isDeleted` | 0\|1 | 是否已软删除 |
| `totalVersions` | number | 版本总数（用于前端展示） |
| `isOwner` | boolean | 当前用户是否为创建者（前端权限判断用） |
| `referenceCount` | number | 被多少配方引用 |
| `hasNewerVersion` | boolean | 是否有更新版本（用于提示用户） |

**查询参数变更**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `isLatest` | 0\|1 | 可选，筛选最新版本（默认仅返回最新版本） |
| `includeDeleted` | 0\|1 | 可选，是否包含已删除记录（默认否） |

---

### 1.2 获取单个原料

```
GET /api/materials/:id
```

**增强说明**：响应增加版本信息和引用信息。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001",
    "name": "当归",
    "code": "DG001",
    "unit": "g",
    "stock": 500,
    "materialType": "herb",
    "unitPrice": 28.00,
    "dataSource": "manual",
    "createdBy": "user_001",
    "createdAt": "2026-05-15T09:00:00.000Z",
    "updatedAt": "2026-05-21T14:30:00.000Z",
    "version": 2,
    "previousVersionId": "mat_001_v1",
    "isLatest": 1,
    "isDeleted": 0,
    "totalVersions": 2,
    "isOwner": true,
    "referenceCount": 3,
    "referencedFormulas": [
      { "id": "f_001", "name": "温补气血方" },
      { "id": "f_002", "name": "四物汤改良方" }
    ],
    "hasNewerVersion": false,
    "nutrition": {
      "protein": 3.5,
      "fat": 1.2,
      "carbohydrate": 10.0,
      "sodium": 0.05,
      "calories": 68.0,
      "dietaryFiber": 5.0
    }
  }
}
```

---

### 1.3 更新原料

```
PUT /api/materials/:id
```

**增强说明**：根据原料引用状态决定原地更新还是创建新版本。

**请求体**：

```json
{
  "name": "当归",
  "code": "DG001",
  "unit": "g",
  "stock": 800,
  "materialType": "herb",
  "unitPrice": 30.00,
  "dataSource": "manual"
}
```

**响应 - 原地更新（未引用）**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001",
    "version": 2,
    "isLatest": 1,
    "versionAction": "updated",
    "message": "原料更新成功"
  }
}
```

**响应 - 创建新版本（已被引用）**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001_v3",
    "version": 3,
    "isLatest": 1,
    "previousVersionId": "mat_001",
    "versionAction": "created",
    "message": "原料版本已升级至 v3，旧版本 v2 已存档"
  }
}
```

**响应 - 权限不足**：

```json
{
  "success": false,
  "error": {
    "message": "您没有权限编辑此原料",
    "code": "FORBIDDEN",
    "timestamp": "2026-05-21T14:30:00.000Z"
  }
}
```

---

### 1.4 删除原料

```
DELETE /api/materials/:id
```

**增强说明**：改为软删除，且仅 admin 可执行。

**响应 - 删除成功**：

```json
{
  "success": true,
  "data": {
    "message": "原料已软删除"
  }
}
```

**响应 - 已被引用**：

```json
{
  "success": false,
  "error": {
    "message": "该原料正在被 3 个配方引用，无法删除",
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-05-21T14:30:00.000Z"
  }
}
```

---

## 2. 新增接口

### 2.1 获取版本历史列表

```
GET /api/materials/:id/versions
```

**说明**：获取指定原料的所有版本记录，按版本号降序排列。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "materialName": "当归",
    "materialCode": "DG001",
    "currentVersion": 2,
    "versions": [
      {
        "id": "mat_001_v2",
        "version": 2,
        "isLatest": 1,
        "changesSummary": "单价从 ¥25.00 改为 ¥28.00，库存从 300g 改为 500g",
        "createdBy": "user_001",
        "createdByName": "张三",
        "createdByRole": "admin",
        "createdAt": "2026-05-21T14:30:00.000Z"
      },
      {
        "id": "mat_001_v1",
        "version": 1,
        "isLatest": 0,
        "changesSummary": "初始创建",
        "createdBy": "user_002",
        "createdByName": "李四",
        "createdByRole": "formulist",
        "createdAt": "2026-05-15T09:00:00.000Z"
      }
    ]
  }
}
```

---

### 2.2 获取指定版本的详情

```
GET /api/materials/:id/versions/:versionId
```

**说明**：获取某个特定版本的完整数据。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "mat_001_v1",
    "name": "当归",
    "code": "DG001",
    "unit": "g",
    "stock": 300,
    "materialType": "herb",
    "unitPrice": 25.00,
    "dataSource": "manual",
    "version": 1,
    "isLatest": 0,
    "previousVersionId": null,
    "createdBy": "user_002",
    "createdByName": "李四",
    "createdByRole": "formulist",
    "createdAt": "2026-05-15T09:00:00.000Z",
    "nutrition": {
      "protein": 3.2,
      "fat": 1.0,
      "carbohydrate": 8.5,
      "sodium": 0.03,
      "calories": 55.0,
      "dietaryFiber": 4.2
    }
  }
}
```

---

### 2.3 获取原料引用信息（辅助接口）

```
GET /api/materials/:id/references
```

**说明**：获取哪些配方引用了该原料，用于前端确认提示。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "materialId": "mat_001",
    "currentVersion": 2,
    "referenceCount": 3,
    "referencedFormulas": [
      {
        "formulaId": "f_001",
        "formulaName": "温补气血方",
        "referencedVersion": 2,
        "isLatestVersion": true
      },
      {
        "formulaId": "f_002",
        "formulaName": "四物汤改良方",
        "referencedVersion": 1,
        "isLatestVersion": false
      }
    ]
  }
}
```

---

## 3. 营养数据版本化接口

### 3.1 获取原料营养数据（增强）

```
GET /api/nutrition/material/:materialId?version=
```

**增强说明**：支持按版本查询营养数据。不传 version 默认返回最新版本的营养。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "materialId": "mat_001",
    "version": 2,
    "per100g": {
      "protein": 3.5,
      "fat": 1.2,
      "carbohydrate": 10.0,
      "sodium": 0.05,
      "calories": 68.0,
      "dietaryFiber": 5.0
    },
    "dataSource": "manual",
    "confidence": "high",
    "lastUpdated": "2026-05-21T14:30:00.000Z"
  }
}
```

---

## 4. 配方快照相关接口

### 4.1 刷新配方中的原料快照

```
POST /api/formulas/:formulaId/refresh-snapshots
```

**说明**：将配方中所有原料的快照更新到最新版本。

**请求体**（可选）：

```json
{
  "materialIds": ["mat_001", "mat_003"]
}
```

**请求体为空时，刷新全部原料的快照。**

**响应示例**：

```json
{
  "success": true,
  "data": {
    "formulaId": "f_001",
    "refreshedCount": 2,
    "unchangedCount": 1,
    "details": [
      {
        "materialId": "mat_001",
        "materialName": "当归",
        "fromVersion": 2,
        "toVersion": 3,
        "nutritionChanged": true
      }
    ]
  }
}
```

### 4.2 检查配方原料是否有新版本

```
GET /api/formulas/:formulaId/check-material-updates
```

**说明**：检测配方中引用的原料是否有更新的版本。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "hasUpdates": true,
    "updates": [
      {
        "materialId": "mat_001",
        "materialName": "当归",
        "currentVersion": 2,
        "latestVersion": 3,
        "changedFields": ["unitPrice", "stock"],
        "nutritionChanged": false
      }
    ]
  }
}
```

---

## 5. 错误码

| 错误码 | HTTP 状态码 | 场景 |
|--------|-------------|------|
| `NOT_FOUND` | 404 | 原料/版本不存在 |
| `FORBIDDEN` | 403 | 不是创建者且不是 admin |
| `DUPLICATE_ENTRY` | 409 | 原料编码重复 |
| `VALIDATION_ERROR` | 400 | 参数校验失败 / 已引用无法删除 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 6. 前端 API 层变更

```typescript
// frontend/src/api/material.ts 新增

export interface MaterialVersion {
  id: string;
  version: number;
  isLatest: number;
  changesSummary: string;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
}

export interface MaterialReference {
  materialId: string;
  currentVersion: number;
  referenceCount: number;
  referencedFormulas: Array<{
    formulaId: string;
    formulaName: string;
    referencedVersion: number;
    isLatestVersion: boolean;
  }>;
}

export const materialApi = {
  // 既有接口增强：返回字段增加 version/isLatest/isOwner/referenceCount
  getList(params?),       // 增强
  getById(id),           // 增强
  create(data),          // 不变
  update(id, data),      // 增强：返回 versionAction

  // 新增接口
  getVersions(id): Promise<{ materialName: string; materialCode: string; currentVersion: number; versions: MaterialVersion[] }>,
  getVersionDetail(id: string, versionId: string): Promise<Material>,
  getReferences(id: string): Promise<MaterialReference>,
};

// frontend/src/api/formula.ts 新增
export const formulaApi = {
  refreshSnapshots(formulaId: string, materialIds?: string[]),
  checkMaterialUpdates(formulaId: string),
};
```