# TingStudio API 接口文档

> 基础地址：`http://localhost:3000/api`
> 认证方式：Bearer Token（JWT）
> Content-Type：`application/json`

---

## 通用说明

### 请求头

| Header | 说明 | 示例 |
|--------|------|------|
| `Authorization` | JWT 令牌（除登录/注册外均需） | `Bearer eyJhbGciOiJIUzI1NiIs...` |
| `Content-Type` | 请求体格式 | `application/json` |

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

#### 分页列表响应

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 30,
      "totalPages": 2
    }
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "message": "错误描述",
  "errors": ["详细错误列表"]  // 仅参数验证失败时存在
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或令牌无效 |
| 404 | 资源不存在 |
| 409 | 资源冲突（唯一约束） |
| 410 | 资源已过期 |
| 413 | 文件大小超限 |
| 500 | 服务器内部错误 |

### 通用查询参数（分页列表接口）

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 20 | 每页数量（最大100） |
| `keyword` | string | - | 关键词搜索 |

---

## 一、认证模块 `/api/auth`

### 1.1 用户注册

**POST** `/api/auth/register`

#### 请求参数

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `username` | string | 是 | 2-50 字符 | 用户名 |
| `password` | string | 是 | 最少 6 字符 | 密码 |

#### 响应示例

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "lq8k2m5x",
      "username": "testuser",
      "role": "formulist"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 1.2 用户登录

**POST** `/api/auth/login`

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |

#### 响应示例

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "lq8k2m5x",
      "username": "admin",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 1.3 获取当前用户信息

**GET** `/api/auth/me`

需认证。

#### 响应示例

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "id": "lq8k2m5x",
    "username": "admin",
    "role": "admin",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 二、原料管理 `/api/materials`

> 所有接口需认证。列表按 `created_by` 过滤。

### 2.1 获取原料列表

**GET** `/api/materials`

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索原料名称/编码 |
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 主键 |
| `name` | string | 原料名称 |
| `code` | string | 原料编码（唯一） |
| `unit` | string | 单位（默认 g） |
| `stock` | number | 库存 |
| `createdBy` | string | 创建人 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### 2.2 获取原料详情

**GET** `/api/materials/:id`

### 2.3 创建原料

**POST** `/api/materials`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 原料名称 |
| `code` | string | 是 | 原料编码（唯一） |
| `unit` | string | 否 | 单位，默认 g |
| `stock` | number | 否 | 库存，默认 0 |

### 2.4 更新原料

**PUT** `/api/materials/:id`

参数同创建。

### 2.5 删除原料

**DELETE** `/api/materials/:id`

> 如果原料被配方引用，返回 400 错误。

---

## 三、配方管理 `/api/formulas`

> 所有接口需认证。列表按 `created_by` 过滤。

### 3.1 获取配方列表

**GET** `/api/formulas`

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索配方名称/业务员名称 |
| `salesmanId` | string | 按业务员筛选 |
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 主键 |
| `name` | string | 配方名称 |
| `salesmanId` | string | 业务员 ID |
| `salesmanName` | string | 业务员名称 |
| `materialsJson` | string | 原料列表 JSON 字符串 |
| `description` | string | 配方描述 |
| `createdBy` | string | 创建人 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

> `materialsJson` 解析后为：`[{ materialId, materialName, quantity }]`

### 3.2 获取配方详情

**GET** `/api/formulas/:id`

### 3.3 创建配方

**POST** `/api/formulas`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 配方名称 |
| `salesmanId` | string | 是 | 业务员 ID |
| `materials` | array | 是 | 原料列表 |
| `description` | string | 否 | 描述 |

`materials` 数组元素结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `materialId` | string | 原料 ID |
| `materialName` | string | 原料名称 |
| `quantity` | number | 用量 |

> 创建配方时会自动创建 `v1.0` 初始版本。

### 3.4 更新配方

**PUT** `/api/formulas/:id`

参数同创建。如果原料列表发生变化，会自动创建新版本。

### 3.5 删除配方

**DELETE** `/api/formulas/:id`

> 会级联删除关联的版本数据。

### 3.6 根据原料查找配方

**GET** `/api/formulas/by-material/:materialId`

返回包含该原料的所有配方。

---

## 四、业务员管理 `/api/salesmen`

> 所有接口需认证。列表不过滤创建人（全员可见）。

### 4.1 获取业务员列表

**GET** `/api/salesmen`

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索姓名/工号/电话 |
| `status` | string | 筛选状态：`active` / `inactive` |
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |

### 4.2 获取业务员详情

**GET** `/api/salesmen/:id`

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 业务员 ID |
| `name` | string | 姓名 |
| `code` | string | 工号 |
| `department` | string | 部门 |
| `phone` | string | 电话 |
| `email` | string | 邮箱 |
| `status` | string | 状态 |
| `createdAt` | string | 创建时间 |

### 4.3 创建业务员

**POST** `/api/salesmen`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 姓名 |
| `code` | string | 是 | 工号（唯一） |
| `department` | string | 否 | 部门 |
| `phone` | string | 否 | 电话 |
| `email` | string | 否 | 邮箱 |

> 新建业务员默认状态为 `active`。

### 4.4 更新业务员

**PUT** `/api/salesmen/:id`

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 姓名 |
| `department` | string | 部门 |
| `phone` | string | 电话 |
| `email` | string | 邮箱 |
| `status` | string | 状态：`active` / `inactive` |

### 4.5 删除业务员（软删除）

**DELETE** `/api/salesmen/:id`

> 将状态设为 `inactive`，不做物理删除。

---

## 五、配方版本管理 `/api/versions`

> 所有接口需认证。

### 5.1 获取配方版本列表

**GET** `/api/versions/formula/:formulaId`

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 筛选状态：`draft` / `published` / `archived` |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `versionId` | string | 版本 ID |
| `formulaId` | string | 配方 ID |
| `versionNumber` | string | 版本号，如 `v1.0` |
| `versionName` | string | 版本名称 |
| `changes` | array | 变更记录（解析自 JSON） |
| `snapshot` | object | 版本快照（解析自 JSON） |
| `status` | string | 状态 |
| `isCurrent` | number | 是否为当前版本（1/0） |
| `createdBy` | string | 创建人 |
| `createdAt` | string | 创建时间 |

### 5.2 获取版本详情

**GET** `/api/versions/detail/:versionId`

### 5.3 创建新版本

**POST** `/api/versions/formula/:formulaId`

| 字段 | 类型 | 说明 |
|------|------|------|
| `versionName` | string | 版本名称 |
| `status` | string | 版本状态，默认 `draft` |

> 自动生成版本号（主版本号 +1），并将新版本设为当前版本。

### 5.4 发布版本

**PUT** `/api/versions/publish/:versionId`

> 将指定版本设为 `published` + `is_current`，其他版本设为 `archived`。

### 5.5 版本对比

**GET** `/api/versions/compare/:formulaId`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `versionA` | string | 是 | 版本 A 的 ID |
| `versionB` | string | 是 | 版本 B 的 ID |

#### 响应结构

```json
{
  "diffId": "xxx",
  "versionA": { ... },
  "versionB": { ... },
  "differences": [
    {
      "fieldId": "material_qty_xxx",
      "fieldLabel": "白砂糖 数量",
      "fieldType": "materialQuantity",
      "changes": {
        "oldValue": 200,
        "newValue": 180,
        "changeType": "modify",
        "highlighted": true
      }
    },
    {
      "fieldId": "salesman",
      "fieldLabel": "业务员",
      "fieldType": "salesman",
      "changes": {
        "oldValue": "张明",
        "newValue": "李华",
        "changeType": "modify",
        "highlighted": true
      }
    }
  ],
  "summary": {
    "totalChanges": 6,
    "addedCount": 1,
    "modifiedCount": 3,
    "deletedCount": 2,
    "materialChanges": 5,
    "descriptionChanges": 0,
    "nutritionChanges": 0,
    "salesmanChanges": 1
  }
}
```

---

## 六、导出管理 `/api/exports`

> 除 `/share/:shareId` 外，所有接口需认证。

### 6.1 获取导出模板列表

**GET** `/api/exports/templates`

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | 筛选类型：`pdf` / `excel` / `api` / `print` |

### 6.2 创建导出模板

**POST** `/api/exports/templates`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 模板名称 |
| `description` | string | 否 | 描述 |
| `type` | string | 是 | 类型 |
| `formatConfig` | object | 是 | 格式配置 |
| `isDefault` | boolean | 否 | 是否为默认模板 |

### 6.3 创建导出任务

**POST** `/api/exports/jobs`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formulaId` | string | 是 | 配方 ID |
| `versionId` | string | 否 | 版本 ID |
| `templateId` | string | 否 | 模板 ID |
| `exportType` | string | 是 | 导出类型：`pdf` / `excel` / `api` |

### 6.4 获取导出任务列表

**GET** `/api/exports/jobs`

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 筛选状态：`pending` / `processing` / `completed` / `failed` |
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |

### 6.5 获取导出任务详情

**GET** `/api/exports/jobs/:jobId`

### 6.6 创建分享链接

**POST** `/api/exports/share`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `formulaId` | string | 是 | 配方 ID |
| `versionId` | string | 否 | 版本 ID |
| `shareType` | string | 否 | 类型：`link`（默认）/ `email` / `api` |
| `password` | string | 否 | 访问密码 |
| `expireDate` | string | 否 | 过期日期 |
| `allowedEmails` | array | 否 | 允许的邮箱列表 |
| `downloadLimit` | number | 否 | 下载次数限制 |

### 6.7 获取分享内容（公开）

**GET** `/api/exports/share/:shareId`

> 无需认证。会检查过期和下载次数限制。

### 6.8 获取 API 接口列表

**GET** `/api/exports/api-interfaces`

### 6.9 创建 API 接口

**POST** `/api/exports/api-interfaces`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 接口名称 |
| `description` | string | 否 | 描述 |
| `endpoint` | string | 是 | 端点地址（唯一） |
| `method` | string | 否 | HTTP 方法：`GET`（默认）/ `POST` / `PUT` / `DELETE` |
| `authentication` | string | 否 | 认证方式：`none`（默认）/ `basic` / `apiKey` / `oauth` |
| `authConfig` | object | 否 | 认证配置 |
| `dataFormat` | string | 否 | 数据格式：`json`（默认）/ `xml` |
| `fieldMapping` | array | 否 | 字段映射 |
| `rateLimit` | object | 否 | 限流配置 |
| `retryConfig` | object | 否 | 重试配置 |

---

## 七、营养成分管理 `/api/nutrition`

> 所有接口需认证。

### 7.1 获取原料营养成分

**GET** `/api/nutrition/material/:materialId`

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `nutritionId` | string | 营养记录 ID |
| `materialId` | string | 原料 ID |
| `per100g` | object | 每100g营养成分（解析自 JSON） |
| `dataVersion` | string | 数据版本号 |
| `dataSource` | string | 数据来源 |
| `notes` | string | 备注 |
| `lastUpdated` | string | 最后更新时间 |

`per100g` 对象示例：
```json
{
  "energy": 1500,
  "protein": 5.0,
  "fat": 1.0,
  "carbohydrate": 70.0,
  "fiber": 0.5,
  "sodium": 50.0,
  "calcium": 20.0,
  "iron": 0.5,
  "vitaminC": 0.1
}
```

### 7.2 设置/更新原料营养成分

**PUT** `/api/nutrition/material/:materialId`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `per100g` | object | 是 | 每100g营养成分 |
| `dataSource` | string | 否 | 数据来源 |
| `notes` | string | 否 | 备注 |

> 如果记录已存在则更新版本号（+1.0），否则新建。

### 7.3 计算配方营养汇总

**POST** `/api/nutrition/calculate/:formulaId`

> 遍历配方所有原料，汇总营养成分，计算总重和每100g营养值。

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `formulaId` | string | 配方 ID |
| `formulaName` | string | 配方名称 |
| `totalWeight` | number | 总重量 |
| `totalNutrition` | object | 总营养成分 |
| `per100gNutrition` | object | 每100g营养成分 |
| `materialBreakdown` | array | 各原料贡献明细 |

> 计算结果会保存到 `formula_nutrition_summaries` 表。

### 7.4 获取营养标准列表

**GET** `/api/nutrition/profiles`

| 参数 | 类型 | 说明 |
|------|------|------|
| `category` | string | 筛选分类：`infant` / `child` / `adult` / `elderly` / `pregnant` / `special` |

### 7.5 创建营养标准

**POST** `/api/nutrition/profiles`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 标准名称 |
| `description` | string | 否 | 描述 |
| `category` | string | 是 | 分类 |
| `targetValues` | object | 是 | 目标营养值 |
| `toleranceRanges` | array | 否 | 容差范围 |
| `mandatoryFields` | array | 否 | 必填字段列表 |

### 7.6 合规性检查

**POST** `/api/nutrition/compliance/:formulaId`

| 参数 | 类型 | 说明 |
|------|------|------|
| `profileId` (Query) | string | 营养标准 ID（可选） |

> 需要先执行营养计算。检查结果会保存为报告。

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `reportId` | string | 报告 ID |
| `complianceCheck` | array | 合规检查结果列表 |
| `recommendations` | array | 建议列表 |
| `summary` | object | 汇总（总数/通过/失败/警告） |

`complianceCheck` 元素结构：
```json
{
  "field": "protein",
  "label": "蛋白质",
  "actualValue": 12.5,
  "targetRange": { "min": 10.0, "max": 15.0 },
  "status": "pass",
  "deviation": 2.5,
  "message": "蛋白质: 12.5"
}
```

---

## 八、健康检查

### 8.1 服务状态

**GET** `/health`

无需认证。

```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```
