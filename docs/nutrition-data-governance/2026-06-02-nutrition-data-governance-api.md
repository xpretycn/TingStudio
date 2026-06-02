# 营养数据治理 - 接口文档

## 1. 来源数据 API

### 1.1 添加来源数据

**POST** `/api/nutrition/material/:materialId/sources`

为指定原料添加一条来源营养数据。

**权限**：admin / formulist(own)

**请求体**：

```json
{
  "sourceType": "tianapi",
  "sourceDetail": "天行数据-山药",
  "per100g": {
    "energy": 1018,
    "protein": 1.9,
    "fat": 0.2,
    "carbohydrate": 12.4,
    "fiber": 0,
    "sodium": 18.6
  },
  "confidence": "medium",
  "matchScore": 0.95,
  "notes": "API返回的第一个匹配结果"
}
```

**请求参数说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sourceType` | string | ✅ | 来源类型：manual/tianapi/seed/ai/excel_import/other |
| `sourceDetail` | string | ❌ | 来源详细描述，最大 500 字符 |
| `per100g` | object | ✅ | 每100g营养成分，键名使用项目标准格式 |
| `confidence` | string | ❌ | 可信度：high/medium/low，默认 medium |
| `matchScore` | number | ❌ | 匹配置信度 0-1，API 来源时建议填写 |
| `notes` | string | ❌ | 备注 |

**成功响应** (200)：

```json
{
  "success": true,
  "data": {
    "sourceId": "uuid-xxx",
    "materialId": "uuid-yyy",
    "sourceType": "tianapi",
    "sourceDetail": "天行数据-山药",
    "confidence": "medium",
    "matchScore": 0.95,
    "createdAt": "2026-06-02T10:00:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | 错误码 | 场景 |
|--------|--------|------|
| 404 | NOT_FOUND | 原料不存在 |
| 400 | VALIDATION_ERROR | sourceType 不在枚举范围内 |
| 403 | FORBIDDEN | formulist 操作非自己创建的原料 |

---

### 1.2 获取来源数据列表

**GET** `/api/nutrition/material/:materialId/sources`

获取指定原料的所有活跃来源数据。

**权限**：admin / formulist

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `includeInactive` | boolean | ❌ | 是否包含软删除的来源，默认 false |

**成功响应** (200)：

```json
{
  "success": true,
  "data": [
    {
      "sourceId": "src-uuid-1",
      "materialId": "mat-uuid-1",
      "sourceType": "seed",
      "sourceDetail": "中国食物成分表第6版",
      "per100g": {
        "energy": 1018,
        "protein": 1.9,
        "fat": 0.2,
        "carbohydrate": 12.4,
        "fiber": 0,
        "sodium": 18.6
      },
      "confidence": "high",
      "matchScore": null,
      "notes": null,
      "createdAt": "2026-05-01T08:00:00.000Z",
      "createdBy": null,
      "isActive": 1
    },
    {
      "sourceId": "src-uuid-2",
      "materialId": "mat-uuid-1",
      "sourceType": "tianapi",
      "sourceDetail": "天行数据-山药",
      "per100g": {
        "energy": 980,
        "protein": 2.1,
        "fat": 0.3,
        "carbohydrate": 11.8,
        "sodium": 20.0
      },
      "confidence": "medium",
      "matchScore": 0.95,
      "notes": null,
      "createdAt": "2026-06-02T10:00:00.000Z",
      "createdBy": "user-uuid-1",
      "isActive": 1
    }
  ]
}
```

---

### 1.3 来源数据字段级对比

**GET** `/api/nutrition/material/:materialId/sources/compare`

获取指定原料所有来源数据的字段级对比结果。

**权限**：admin / formulist

**成功响应** (200)：

```json
{
  "success": true,
  "data": {
    "materialId": "mat-uuid-1",
    "materialName": "山药",
    "authoritative": {
      "sourceType": "seed",
      "sourceDetail": "中国食物成分表第6版",
      "per100g": {
        "energy": 1018,
        "protein": 1.9,
        "fat": 0.2,
        "carbohydrate": 12.4
      }
    },
    "nutrients": [
      {
        "field": "protein",
        "label": "蛋白质",
        "unit": "g",
        "authoritativeValue": 1.9,
        "sources": [
          {
            "sourceId": "src-uuid-1",
            "sourceType": "seed",
            "sourceDetail": "中国食物成分表第6版",
            "confidence": "high",
            "value": 1.9,
            "diff": 0,
            "diffPercent": 0
          },
          {
            "sourceId": "src-uuid-2",
            "sourceType": "tianapi",
            "sourceDetail": "天行数据-山药",
            "confidence": "medium",
            "value": 2.1,
            "diff": 0.2,
            "diffPercent": 10.5
          }
        ]
      },
      {
        "field": "fat",
        "label": "脂肪",
        "unit": "g",
        "authoritativeValue": 0.2,
        "sources": [
          {
            "sourceId": "src-uuid-1",
            "sourceType": "seed",
            "sourceDetail": "中国食物成分表第6版",
            "confidence": "high",
            "value": 0.2,
            "diff": 0,
            "diffPercent": 0
          },
          {
            "sourceId": "src-uuid-2",
            "sourceType": "tianapi",
            "sourceDetail": "天行数据-山药",
            "confidence": "medium",
            "value": 0.3,
            "diff": 0.1,
            "diffPercent": 50
          }
        ]
      }
    ],
    "summary": {
      "totalSources": 2,
      "totalNutrients": 28,
      "diffCount": 5,
      "maxDiffPercent": 50,
      "avgDiffPercent": 12.3
    }
  }
}
```

**`diff` 计算规则**：
- `diff = sourceValue - authoritativeValue`
- `diffPercent = |diff| / max(authoritativeValue, 0.001) × 100`
- 权威值为 0 时，`diffPercent` 固定为 0（避免除零）

---

### 1.4 更新来源数据

**PUT** `/api/nutrition/material/:materialId/sources/:sourceId`

更新指定来源数据的元信息（不修改营养数据本身）。

**权限**：admin / formulist(own)

**请求体**：

```json
{
  "sourceDetail": "更新后的来源描述",
  "confidence": "high",
  "notes": "经核实确认"
}
```

**说明**：`per100g` 不可通过此接口修改。如需更新营养数据，应新增一条同类型来源（旧记录自动软删除）。

**成功响应** (200)：

```json
{
  "success": true,
  "data": null,
  "message": "来源数据已更新"
}
```

---

### 1.5 软删除来源数据

**DELETE** `/api/nutrition/material/:materialId/sources/:sourceId`

软删除指定来源数据（`is_active` 设为 0）。

**权限**：admin only

**成功响应** (200)：

```json
{
  "success": true,
  "data": null,
  "message": "来源数据已删除"
}
```

**错误响应**：

| 状态码 | 错误码 | 场景 |
|--------|--------|------|
| 404 | NOT_FOUND | 来源数据不存在 |
| 403 | FORBIDDEN | 非 admin 用户 |
| 400 | VALIDATION_ERROR | 来源数据已被软删除 |

---

### 1.6 字段级权威数据选定

**PUT** `/api/nutrition/material/:materialId/authoritative`

从来源数据中逐字段选择值，组合为权威数据。

**权限**：admin only

**请求体**：

```json
{
  "fieldSelections": {
    "protein": "src-uuid-1",
    "fat": "src-uuid-1",
    "carbohydrate": "src-uuid-2",
    "sodium": "src-uuid-2",
    "energy": "src-uuid-1"
  }
}
```

**请求参数说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fieldSelections` | object | ✅ | 键=营养素字段名，值=来源 sourceId |

**处理逻辑**：
1. 验证所有 sourceId 存在且 `is_active=1`
2. 从对应 source 取值，组合为新的 `per100g`
3. 能量字段：如果未指定来源，自动计算 `protein×17 + fat×37 + carbohydrate×17`
4. 更新 `material_nutrition`：`per_100g_json`、`field_sources_json`、`source_type`、`source_detail`
5. 如果所有字段来自同一来源，`source_type` 设为该来源类型；否则设为 `composite`

**成功响应** (200)：

```json
{
  "success": true,
  "data": {
    "materialId": "mat-uuid-1",
    "updatedFields": 5,
    "sourceType": "composite",
    "fieldSources": {
      "protein": { "sourceId": "src-uuid-1", "sourceType": "seed", "sourceDetail": "中国食物成分表第6版" },
      "fat": { "sourceId": "src-uuid-1", "sourceType": "seed", "sourceDetail": "中国食物成分表第6版" },
      "carbohydrate": { "sourceId": "src-uuid-2", "sourceType": "tianapi", "sourceDetail": "天行数据-山药" },
      "sodium": { "sourceId": "src-uuid-2", "sourceType": "tianapi", "sourceDetail": "天行数据-山药" }
    }
  },
  "message": "权威数据已更新"
}
```

**错误响应**：

| 状态码 | 错误码 | 场景 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | sourceId 不存在或不活跃 |
| 403 | FORBIDDEN | 非 admin 用户 |
| 404 | NOT_FOUND | 原料不存在 |

---

## 2. 外部营养数据获取 API

### 2.1 单原料智能获取

**POST** `/api/materials/:materialId/enrich-nutrition`

从外部数据源（天行 API、种子库）获取指定原料的营养数据，写入来源层。

**权限**：admin / formulist(own)

**请求体**：

```json
{
  "sources": ["seed", "tianapi"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sources` | string[] | ❌ | 指定尝试的数据源，默认 ["seed", "tianapi"] |

**成功响应** (200)：

```json
{
  "success": true,
  "data": {
    "materialId": "mat-uuid-1",
    "materialName": "山药",
    "results": [
      {
        "sourceType": "seed",
        "sourceId": "src-uuid-new-1",
        "found": true,
        "matchScore": 1.0,
        "confidence": "high",
        "sourceDetail": "中国食物成分表第6版",
        "per100g": {
          "energy": 1018,
          "protein": 1.9,
          "fat": 0.2,
          "carbohydrate": 12.4
        }
      },
      {
        "sourceType": "tianapi",
        "sourceId": "src-uuid-new-2",
        "found": true,
        "matchScore": 0.95,
        "confidence": "medium",
        "sourceDetail": "天行数据-山药",
        "per100g": {
          "energy": 980,
          "protein": 2.1,
          "fat": 0.3,
          "carbohydrate": 11.8
        }
      }
    ],
    "summary": {
      "totalAttempted": 2,
      "totalFound": 2,
      "totalNotFound": 0,
      "totalFailed": 0
    }
  }
}
```

**错误响应**：

| 状态码 | 错误码 | 场景 |
|--------|--------|------|
| 404 | NOT_FOUND | 原料不存在 |
| 503 | SERVICE_UNAVAILABLE | 外部营养数据功能未启用 |
| 403 | FORBIDDEN | formulist 操作非自己创建的原料 |

---

### 2.2 批量补全

**POST** `/api/materials/bulk-enrich-nutrition`

为所有缺失营养数据或指定原料批量从外部数据源获取营养数据。

**权限**：admin only

**请求体**：

```json
{
  "materialIds": ["mat-uuid-1", "mat-uuid-2"],
  "sources": ["seed", "tianapi"],
  "overwriteExisting": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `materialIds` | string[] | ❌ | 指定原料 ID 列表，为空则处理所有原料 |
| `sources` | string[] | ❌ | 指定数据源，默认 ["seed", "tianapi"] |
| `overwriteExisting` | boolean | ❌ | 是否覆盖已有来源数据，默认 false |

**成功响应** (200)：

```json
{
  "success": true,
  "data": {
    "totalProcessed": 77,
    "totalFound": 45,
    "totalNotFound": 25,
    "totalFailed": 7,
    "results": [
      {
        "materialId": "mat-uuid-1",
        "materialName": "山药",
        "found": true,
        "sourcesAdded": 2
      },
      {
        "materialId": "mat-uuid-2",
        "materialName": "地龙蛋白肽粉",
        "found": false,
        "sourcesAdded": 0
      }
    ]
  }
}
```

---

## 3. 现有 API 变更

### 3.1 `GET /api/nutrition/material/:materialId` 响应增强

**变更内容**：响应 `data` 新增 3 个字段。

```json
{
  "success": true,
  "data": {
    "nutritionId": "nutr-uuid-1",
    "materialId": "mat-uuid-1",
    "per100g": { "protein": 1.9, "fat": 0.2 },
    "dataSource": "中国食物成分表第6版",
    "notes": null,
    "confidence": "high",
    "fieldSources": {
      "protein": { "sourceId": "src-1", "sourceType": "seed", "sourceDetail": "中国食物成分表第6版" },
      "fat": { "sourceId": "src-1", "sourceType": "seed", "sourceDetail": "中国食物成分表第6版" }
    },
    "sourceType": "seed",
    "sourceDetail": "中国食物成分表第6版",
    "lastUpdated": "2026-06-01T10:00:00.000Z"
  }
}
```

**新增字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `fieldSources` | object \| null | 字段级溯源，旧数据为 null |
| `sourceType` | string | 权威数据来源类型，旧数据为 "manual" |
| `sourceDetail` | string \| null | 来源详细描述 |

**向后兼容**：新增字段均为可选，旧数据返回 null/"manual"/null，不影响现有前端。

### 3.2 `PUT /api/nutrition/material/:materialId` 行为增强

**变更内容**：保存营养数据时，自动同步写入 `material_nutrition_sources`（source_type='manual'）。

**请求体**：不变。

**新增行为**：
1. 保存到 `material_nutrition` 后，调用 `addNutritionSource(materialId, "manual", per100g, dataSource, confidence)`
2. 如果同类型来源已存在，旧记录自动软删除
3. 更新 `material_nutrition.source_type` 和 `material_nutrition.field_sources_json`

**向后兼容**：调用方无感知，行为透明。
