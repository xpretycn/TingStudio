# 原料枚举字段管理 — API 接口文档

> 日期：2026-05-25 | 版本：v1.0 | 状态：待确认

---

## 1. 枚举管理接口

基础路径：`/api/enums`

所有接口需 `authMiddleware`，写操作需 `requirePermission("admin")`。

---

### 1.1 获取所有枚举（按分类分组）

```
GET /api/enums
```

**权限**：所有已认证用户

**响应**：

```json
{
  "success": true,
  "data": {
    "appearance": [
      { "id": "xxx", "category": "appearance", "label": "颗粒", "value": "颗粒", "sortOrder": 1, "isActive": true }
    ],
    "taste": [
      { "id": "xxx", "category": "taste", "label": "苦味", "value": "苦味", "sortOrder": 1, "isActive": true }
    ],
    "efficacy": [
      { "id": "xxx", "category": "efficacy", "label": "滋补肝肾", "value": "滋补肝肾", "sortOrder": 1, "isActive": true }
    ]
  }
}
```

---

### 1.2 获取指定分类的枚举列表

```
GET /api/enums/:category
```

**权限**：所有已认证用户

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category | string | 是 | 分类名：`appearance` / `taste` / `efficacy` |

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| activeOnly | boolean | 否 | 是否仅返回启用的枚举，默认 false |

**响应**：

```json
{
  "success": true,
  "data": [
    { "id": "xxx", "category": "appearance", "label": "颗粒", "value": "颗粒", "sortOrder": 1, "isActive": true },
    { "id": "yyy", "category": "appearance", "label": "膏状", "value": "膏状", "sortOrder": 2, "isActive": true }
  ]
}
```

---

### 1.3 新增枚举值

```
POST /api/enums
```

**权限**：admin

**请求体**：

```json
{
  "category": "appearance",
  "label": "粘稠",
  "value": "粘稠"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category | string | 是 | 分类：`appearance` / `taste` / `efficacy` |
| label | string | 是 | 显示文本，1-20 字符 |
| value | string | 是 | 存储值，1-20 字符 |

**成功响应**：

```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "category": "appearance",
    "label": "粘稠",
    "value": "粘稠",
    "sortOrder": 9,
    "isActive": true
  }
}
```

**错误响应**：

| 场景 | HTTP 状态码 | 错误码 | 消息 |
|------|------------|--------|------|
| 分类不合法 | 400 | VALIDATION_ERROR | "无效的枚举分类" |
| 重复值 | 409 | DUPLICATE_ENTRY | "该分类下已存在相同选项" |

---

### 1.4 编辑枚举值

```
PUT /api/enums/:id
```

**权限**：admin

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 枚举值 ID |

**请求体**：

```json
{
  "label": "粘稠状",
  "value": "粘稠状",
  "isActive": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| label | string | 否 | 显示文本 |
| value | string | 否 | 存储值 |
| isActive | boolean | 否 | 是否启用 |

**注意**：修改 `value` 时，后端需同步更新所有引用该值的原料 JSON 字段。

**成功响应**：

```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "category": "appearance",
    "label": "粘稠状",
    "value": "粘稠状",
    "sortOrder": 9,
    "isActive": true
  }
}
```

**错误响应**：

| 场景 | HTTP 状态码 | 错误码 | 消息 |
|------|------------|--------|------|
| 枚举值不存在 | 404 | NOT_FOUND | "枚举选项不存在" |
| 修改后值重复 | 409 | DUPLICATE_ENTRY | "该分类下已存在相同选项" |

---

### 1.5 删除枚举值

```
DELETE /api/enums/:id
```

**权限**：admin

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 枚举值 ID |

**成功响应**：

```json
{
  "success": true,
  "data": {
    "deletedId": "xxx",
    "referenceCount": 3
  }
}
```

| 字段 | 说明 |
|------|------|
| referenceCount | 被多少个原料引用（0 表示无引用） |

**错误响应**：

| 场景 | HTTP 状态码 | 错误码 | 消息 |
|------|------------|--------|------|
| 枚举值不存在 | 404 | NOT_FOUND | "枚举选项不存在" |

**注意**：删除枚举值后，引用该值的原料 JSON 字段中的对应值不会被自动移除（保留历史数据完整性），前端展示时对已删除的值做兜底展示。

---

## 2. 原料接口变更

基础路径：`/api/materials`

以下接口的请求/响应新增 `appearance`、`taste`、`efficacy` 字段。

---

### 2.1 创建原料

```
POST /api/materials
```

**新增请求字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appearance | string[] | 否 | 性状枚举值数组，如 `["颗粒", "粉末"]` |
| taste | string[] | 否 | 口感枚举值数组 |
| efficacy | string[] | 否 | 功效枚举值数组 |

**示例**：

```json
{
  "name": "黄精",
  "code": "YC-001",
  "unit": "g",
  "stock": 500,
  "materialType": "herb",
  "appearance": ["块状", "粉末"],
  "taste": ["甘味", "滑润感"],
  "efficacy": ["滋补肝肾", "补中益气", "养血安神"]
}
```

---

### 2.2 更新原料

```
PUT /api/materials/:id
```

**新增请求字段**：同创建原料

---

### 2.3 获取原料列表

```
GET /api/materials
```

**新增响应字段**：每个原料对象新增：

```json
{
  "appearance": ["颗粒", "粉末"],
  "taste": ["苦味", "草本香"],
  "efficacy": ["清热解毒", "清肝明目"]
}
```

若原料未填写这些字段，返回 `null`。

---

### 2.4 获取原料详情

```
GET /api/materials/:id
```

**新增响应字段**：同列表

---

## 3. 数据类型定义

### 3.1 EnumOption（后端 → 前端）

```typescript
interface EnumOption {
  id: string;
  category: "appearance" | "taste" | "efficacy";
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
}
```

### 3.2 EnumCategoryMap（前端 Store 缓存结构）

```typescript
interface EnumCategoryMap {
  appearance: EnumOption[];
  taste: EnumOption[];
  efficacy: EnumOption[];
}
```

### 3.3 Material 接口扩展

```typescript
interface Material {
  // ... 现有字段
  appearance: string[] | null;
  taste: string[] | null;
  efficacy: string[] | null;
}
```

### 3.4 MaterialForm 接口扩展

```typescript
interface MaterialFormData {
  // ... 现有字段
  appearance: string[];
  taste: string[];
  efficacy: string[];
}
```
