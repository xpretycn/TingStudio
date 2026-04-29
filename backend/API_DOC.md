# TingStudio API 接口文档

> 基础地址：`http://localhost:3000/api`
> 认证方式：Bearer Token（JWT）
> Content-Type：`application/json`
> 最后更新：2026-04-29

---

## 通用说明

### 请求头

| Header          | 说明                          | 示例                             |
| --------------- | ----------------------------- | -------------------------------- |
| `Authorization` | JWT 令牌（除登录/注册外均需） | `Bearer eyJhbGciOiJIUzI1NiIs...` |
| `Content-Type`  | 请求体格式                    | `application/json`               |

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
  "errors": ["详细错误列表"]
}
```

### HTTP 状态码

| 状态码 | 说明                 |
| ------ | -------------------- |
| 200    | 成功                 |
| 201    | 创建成功             |
| 400    | 请求参数错误         |
| 401    | 未认证或令牌无效     |
| 404    | 资源不存在           |
| 409    | 资源冲突（唯一约束） |
| 410    | 资源已过期           |
| 413    | 文件大小超限         |
| 500    | 服务器内部错误       |

### 通用查询参数（分页列表接口）

| 参数       | 类型   | 默认值 | 说明                |
| ---------- | ------ | ------ | ------------------- |
| `page`     | number | 1      | 页码                |
| `pageSize` | number | 20     | 每页数量（最大100） |
| `keyword`  | string | -      | 关键词搜索          |

---

## 一、认证模块 `/api/auth`

### 1.1 用户注册

**POST** `/api/auth/register`

#### 请求参数

| 字段       | 类型   | 必填 | 约束        | 说明   |
| ---------- | ------ | ---- | ----------- | ------ |
| `username` | string | 是   | 2-50 字符   | 用户名 |
| `password` | string | 是   | 最少 6 字符 | 密码   |

#### 响应示例

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "lq8k2m5x",
      "username": "testuser",
      "role": "formulist",
      "displayName": null,
      "avatar": null,
      "bio": null,
      "email": null,
      "phone": null,
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 1.2 用户登录

**POST** `/api/auth/login`

#### 请求参数

| 字段       | 类型   | 必填 | 说明   |
| ---------- | ------ | ---- | ------ |
| `username` | string | 是   | 用户名 |
| `password` | string | 是   | 密码   |

#### 响应示例

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "lq8k2m5x",
      "username": "admin",
      "role": "admin",
      "displayName": "管理员",
      "avatar": null,
      "bio": null,
      "email": "admin@tingstudio.com",
      "phone": "13800138000",
      "createdAt": "2026-01-01T00:00:00.000Z"
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
    "displayName": "管理员",
    "avatar": null,
    "bio": null,
    "email": "admin@tingstudio.com",
    "phone": "13800138000",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 1.4 更新个人资料

**PUT** `/api/auth/profile`

需认证。

#### 请求参数

| 字段          | 类型   | 必填 | 约束              | 说明     |
| ------------- | ------ | ---- | ----------------- | -------- |
| `displayName` | string | 否   | 最长 50 字符      | 昵称     |
| `avatar`      | string | 否   | -                 | 头像 URL |
| `bio`         | string | 否   | 最长 500 字符     | 个人简介 |
| `email`       | string | 否   | 邮箱格式，唯一    | 邮箱     |
| `phone`       | string | 否   | 11 位手机号，唯一 | 手机号   |

> 邮箱和手机号会校验唯一性（排除自身）。

### 1.5 修改密码

**PUT** `/api/auth/password`

需认证。

#### 请求参数

| 字段          | 类型   | 必填 | 约束        | 说明     |
| ------------- | ------ | ---- | ----------- | -------- |
| `oldPassword` | string | 是   | -           | 当前密码 |
| `newPassword` | string | 是   | 最少 6 字符 | 新密码   |

---

## 二、原料管理 `/api/materials`

> 所有接口需认证。默认按 `created_by` 过滤，`scope=all` 时返回全部。

### 2.1 获取原料列表

**GET** `/api/materials`

| 参数       | 类型   | 说明                                             |
| ---------- | ------ | ------------------------------------------------ |
| `keyword`  | string | 搜索原料名称/编码                                |
| `scope`    | string | `all` 返回全部（不过滤创建人），默认按创建人过滤 |
| `page`     | number | 页码                                             |
| `pageSize` | number | 每页数量                                         |

#### 响应字段

| 字段           | 类型           | 说明                                                                |
| -------------- | -------------- | ------------------------------------------------------------------- |
| `id`           | string         | 主键                                                                |
| `name`         | string         | 原料名称                                                            |
| `code`         | string         | 原料编码（唯一）                                                    |
| `unit`         | string         | 单位（默认 g）                                                      |
| `stock`        | number         | 库存                                                                |
| `materialType` | string         | 原料类型：`herb`（中药材）/ `supplement`（营养补充剂），默认 `herb` |
| `unitPrice`    | number \| null | 单价（元/kg），可为空                                               |
| `dataSource`   | string         | 数据来源：`manual` / `batch_import` / `api_sync`，默认 `manual`     |
| `createdBy`    | string         | 创建人                                                              |
| `createdAt`    | string         | 创建时间                                                            |
| `updatedAt`    | string         | 更新时间                                                            |

### 2.2 获取原料详情

**GET** `/api/materials/:id`

### 2.3 获取下一个原料编码

**GET** `/api/materials/next-code`

需认证。返回当前用户下一个可用的 MAT 序列编码。

#### 响应示例

```json
{
  "success": true,
  "data": { "code": "MAT005" }
}
```

### 2.4 获取原料统计数据

**GET** `/api/materials/stats`

需认证。返回原料数据看板统计。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "total": 30,
    "herbCount": 22,
    "supplementCount": 8,
    "nutritionCount": 15
  }
}
```

### 2.5 创建原料

**POST** `/api/materials`

| 字段           | 类型   | 必填 | 说明                    |
| -------------- | ------ | ---- | ----------------------- |
| `name`         | string | 是   | 原料名称                |
| `code`         | string | 是   | 原料编码（唯一）        |
| `unit`         | string | 否   | 单位，默认 g            |
| `stock`        | number | 否   | 库存，默认 0            |
| `materialType` | string | 否   | 原料类型，默认 `herb`   |
| `unitPrice`    | number | 否   | 单价（元/kg）           |
| `dataSource`   | string | 否   | 数据来源，默认 `manual` |

### 2.6 更新原料

**PUT** `/api/materials/:id`

参数同创建。

### 2.7 删除原料

**DELETE** `/api/materials/:id`

> 如果原料被配方引用，返回 400 错误。

---

## 三、配方管理 `/api/formulas`

> 所有接口需认证。普通用户按 `created_by` 过滤，admin 可查看所有配方。

### 3.1 获取配方列表

**GET** `/api/formulas`

| 参数         | 类型   | 说明                    |
| ------------ | ------ | ----------------------- |
| `keyword`    | string | 搜索配方名称/业务员名称 |
| `salesmanId` | string | 按业务员筛选            |
| `page`       | number | 页码                    |
| `pageSize`   | number | 每页数量                |

#### 响应字段

| 字段                    | 类型           | 说明                                   |
| ----------------------- | -------------- | -------------------------------------- |
| `id`                    | string         | 主键                                   |
| `code`                  | string         | 配方编码（唯一，自动生成）             |
| `name`                  | string         | 配方名称                               |
| `salesmanId`            | string         | 业务员 ID                              |
| `salesmanName`          | string         | 业务员名称                             |
| `materialsJson`         | string         | 原料列表 JSON 字符串                   |
| `finishedWeight`        | number         | 成品重量                               |
| `ratioFactor`           | number         | 主料含量比系数（0.15-0.25），默认 0.18 |
| `supplementRatioFactor` | number         | 辅料含量比系数（0.5-1.5），默认 1.0    |
| `packagingPrice`        | number         | 包装价格（元），默认 0                 |
| `otherPrice`            | number         | 其他价格（元），默认 0                 |
| `profitMargin`          | number         | 利润率（%），默认 20                   |
| `description`           | string         | 配方描述                               |
| `preparationMethod`     | string \| null | 制作方法                               |
| `costSubtotal`          | number         | 成本小计（自动计算）                   |
| `totalPrice`            | number         | 报价（含利润，自动计算）               |
| `missingPrices`         | string[]       | 缺少单价的原料名称列表                 |
| `versions`              | array          | 版本列表（包含版本详情）               |
| `createdBy`             | string         | 创建人                                 |
| `createdAt`             | string         | 创建时间                               |
| `updatedAt`             | string         | 更新时间                               |

> `materialsJson` 解析后为：`[{ materialId, materialName, quantity, adjustedPrice? }]`
>
> - `adjustedPrice`：原料单价微调值（覆盖原料库基价），非必填

### 3.2 获取配方详情

**GET** `/api/formulas/:id`

### 3.3 创建配方

**POST** `/api/formulas`

| 字段                    | 类型   | 必填 | 说明                        |
| ----------------------- | ------ | ---- | --------------------------- |
| `name`                  | string | 是   | 配方名称                    |
| `salesmanId`            | string | 是   | 业务员 ID                   |
| `materials`             | array  | 是   | 原料列表                    |
| `finishedWeight`        | number | 是   | 成品重量                    |
| `ratioFactor`           | number | 是   | 主料含量比系数（0.15-0.25） |
| `supplementRatioFactor` | number | 是   | 辅料含量比系数（0.5-1.5）   |
| `packagingPrice`        | number | 否   | 包装价格（元），默认 0      |
| `otherPrice`            | number | 否   | 其他价格（元），默认 0      |
| `profitMargin`          | number | 否   | 利润率（%），默认 20        |
| `description`           | string | 否   | 描述                        |
| `preparationMethod`     | string | 否   | 制作方法                    |

`materials` 数组元素结构：

| 字段            | 类型   | 说明                               |
| --------------- | ------ | ---------------------------------- |
| `materialId`    | string | 原料 ID                            |
| `materialName`  | string | 原料名称                           |
| `quantity`      | number | 用量                               |
| `adjustedPrice` | number | 可选，单价微调值（覆盖原料库基价） |

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

### 3.7 获取配方报价

**GET** `/api/formulas/:id/price-quote`

需认证。根据配方原料单价、包装费、其他费用和利润率计算报价。

#### 响应字段

| 字段             | 类型   | 说明           |
| ---------------- | ------ | -------------- |
| `formulaId`      | string | 配方 ID        |
| `materialTotal`  | number | 原料总成本     |
| `packagingPrice` | number | 包装费         |
| `otherPrice`     | number | 其他费用       |
| `costSubtotal`   | number | 成本小计       |
| `profitMargin`   | number | 利润率（%）    |
| `totalPrice`     | number | 最终报价       |
| `details`        | array  | 各原料成本明细 |

---

## 四、业务员管理 `/api/salesmen`

> 所有接口需认证。列表不过滤创建人（全员可见）。

### 4.1 获取业务员列表

**GET** `/api/salesmen`

| 参数         | 类型   | 说明                            |
| ------------ | ------ | ------------------------------- |
| `keyword`    | string | 搜索姓名/工号/电话              |
| `status`     | string | 筛选状态：`active` / `inactive` |
| `department` | string | 按部门筛选                      |
| `page`       | number | 页码                            |
| `pageSize`   | number | 每页数量                        |

### 4.2 获取业务员详情

**GET** `/api/salesmen/:id`

#### 响应字段

| 字段         | 类型   | 说明      |
| ------------ | ------ | --------- |
| `id`         | string | 业务员 ID |
| `name`       | string | 姓名      |
| `code`       | string | 工号      |
| `department` | string | 部门      |
| `phone`      | string | 电话      |
| `email`      | string | 邮箱      |
| `status`     | string | 状态      |
| `createdAt`  | string | 创建时间  |

### 4.3 创建业务员

**POST** `/api/salesmen`

| 字段         | 类型   | 必填 | 说明         |
| ------------ | ------ | ---- | ------------ |
| `name`       | string | 是   | 姓名         |
| `code`       | string | 是   | 工号（唯一） |
| `department` | string | 否   | 部门         |
| `phone`      | string | 否   | 电话         |
| `email`      | string | 否   | 邮箱         |

> 新建业务员默认状态为 `active`。

### 4.4 更新业务员

**PUT** `/api/salesmen/:id`

| 字段         | 类型   | 说明                                                |
| ------------ | ------ | --------------------------------------------------- |
| `name`       | string | 姓名                                                |
| `code`       | string | 工号                                                |
| `department` | string | 部门                                                |
| `phone`      | string | 电话                                                |
| `email`      | string | 邮箱                                                |
| `status`     | string | 状态：`active` / `inactive`（可选，不传则保持原值） |

### 4.5 删除业务员

**DELETE** `/api/salesmen/:id`

> 物理删除，直接从数据库移除记录。

### 4.6 切换业务员状态

**PATCH** `/api/salesmen/:id/status`

| 字段     | 类型   | 必填 | 说明                   |
| -------- | ------ | ---- | ---------------------- |
| `status` | string | 是   | `active` 或 `inactive` |

> 用于停用/启用业务员，不删除数据。

---

## 五、配方版本管理 `/api/versions`

> 所有接口需认证。

### 5.1 获取配方版本列表

**GET** `/api/versions/formula/:formulaId`

| 参数     | 类型   | 说明                                         |
| -------- | ------ | -------------------------------------------- |
| `status` | string | 筛选状态：`draft` / `published` / `archived` |

#### 响应字段

| 字段                    | 类型   | 说明                    |
| ----------------------- | ------ | ----------------------- |
| `versionId`             | string | 版本 ID                 |
| `formulaId`             | string | 配方 ID                 |
| `versionNumber`         | string | 版本号，如 `v1.0`       |
| `versionName`           | string | 版本名称                |
| `changes`               | array  | 变更记录（解析自 JSON） |
| `snapshot`              | object | 版本快照（解析自 JSON） |
| `status`                | string | 状态                    |
| `isCurrent`             | number | 是否为当前版本（1/0）   |
| `ratioFactor`           | number | 主料含量比系数          |
| `supplementRatioFactor` | number | 辅料含量比系数          |
| `createdBy`             | string | 创建人                  |
| `createdAt`             | string | 创建时间                |

### 5.2 获取版本详情

**GET** `/api/versions/detail/:versionId`

### 5.3 创建新版本

**POST** `/api/versions/formula/:formulaId`

| 字段          | 类型   | 说明                   |
| ------------- | ------ | ---------------------- |
| `versionName` | string | 版本名称               |
| `status`      | string | 版本状态，默认 `draft` |

> 自动生成版本号（主版本号 +1），并将新版本设为当前版本。

### 5.4 发布版本

**PUT** `/api/versions/publish/:versionId`

> 将指定版本设为 `published` + `is_current`，其他版本设为 `archived`。

### 5.5 版本对比

**GET** `/api/versions/compare/:formulaId`

| 参数       | 类型   | 必填 | 说明         |
| ---------- | ------ | ---- | ------------ |
| `versionA` | string | 是   | 版本 A 的 ID |
| `versionB` | string | 是   | 版本 B 的 ID |

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

> 除公开分享路由外，所有接口需认证。

### 6.1 获取导出模板列表

**GET** `/api/exports/templates`

| 参数   | 类型   | 说明                                        |
| ------ | ------ | ------------------------------------------- |
| `type` | string | 筛选类型：`pdf` / `excel` / `api` / `print` |

### 6.2 创建导出模板

**POST** `/api/exports/templates`

| 字段           | 类型    | 必填 | 说明           |
| -------------- | ------- | ---- | -------------- |
| `name`         | string  | 是   | 模板名称       |
| `description`  | string  | 否   | 描述           |
| `type`         | string  | 是   | 类型           |
| `formatConfig` | object  | 是   | 格式配置       |
| `isDefault`    | boolean | 否   | 是否为默认模板 |

### 6.3 更新导出模板

**PUT** `/api/exports/templates/:templateId`

参数同创建。

### 6.4 删除导出模板

**DELETE** `/api/exports/templates/:templateId`

### 6.5 创建导出任务

**POST** `/api/exports/jobs`

| 字段         | 类型   | 必填 | 说明                              |
| ------------ | ------ | ---- | --------------------------------- |
| `formulaId`  | string | 是   | 配方 ID                           |
| `versionId`  | string | 否   | 版本 ID                           |
| `templateId` | string | 否   | 模板 ID                           |
| `exportType` | string | 是   | 导出类型：`pdf` / `excel` / `api` |

### 6.6 获取导出任务列表

**GET** `/api/exports/jobs`

| 参数       | 类型   | 说明                                                        |
| ---------- | ------ | ----------------------------------------------------------- |
| `status`   | string | 筛选状态：`pending` / `processing` / `completed` / `failed` |
| `page`     | number | 页码                                                        |
| `pageSize` | number | 每页数量                                                    |

### 6.7 获取导出任务详情

**GET** `/api/exports/jobs/:jobId`

### 6.8 下载导出文件

**GET** `/api/exports/jobs/:jobId/download`

需认证。下载已完成的导出文件。

### 6.9 重试导出任务

**POST** `/api/exports/jobs/:jobId/retry`

需认证。重新执行失败的导出任务。

### 6.10 创建分享链接

**POST** `/api/exports/share`

| 字段            | 类型   | 必填 | 说明                                  |
| --------------- | ------ | ---- | ------------------------------------- |
| `formulaId`     | string | 是   | 配方 ID                               |
| `versionId`     | string | 否   | 版本 ID                               |
| `shareType`     | string | 否   | 类型：`link`（默认）/ `email` / `api` |
| `password`      | string | 否   | 访问密码                              |
| `expireDate`    | string | 否   | 过期日期                              |
| `allowedEmails` | array  | 否   | 允许的邮箱列表                        |
| `downloadLimit` | number | 否   | 下载次数限制                          |

### 6.11 获取分享列表

**GET** `/api/exports/shares`

需认证。返回当前用户创建的所有分享链接。

### 6.12 获取分享内容（公开）

**GET** `/api/exports/share/:shareId`

> 无需认证。会检查过期和下载次数限制。

### 6.13 删除分享

**DELETE** `/api/exports/share/:shareId`

需认证。删除指定的分享链接。

### 6.14 获取 API 接口列表

**GET** `/api/exports/api-interfaces`

### 6.15 创建 API 接口

**POST** `/api/exports/api-interfaces`

| 字段             | 类型   | 必填 | 说明                                                   |
| ---------------- | ------ | ---- | ------------------------------------------------------ |
| `name`           | string | 是   | 接口名称                                               |
| `description`    | string | 否   | 描述                                                   |
| `endpoint`       | string | 是   | 端点地址（唯一）                                       |
| `method`         | string | 否   | HTTP 方法：`GET`（默认）/ `POST` / `PUT` / `DELETE`    |
| `authentication` | string | 否   | 认证方式：`none`（默认）/ `basic` / `apiKey` / `oauth` |
| `authConfig`     | object | 否   | 认证配置                                               |
| `dataFormat`     | string | 否   | 数据格式：`json`（默认）/ `xml`                        |
| `fieldMapping`   | array  | 否   | 字段映射                                               |
| `rateLimit`      | object | 否   | 限流配置                                               |
| `retryConfig`    | object | 否   | 重试配置                                               |

---

## 七、营养成分管理 `/api/nutrition`

> 所有接口需认证。

### 7.1 获取原料营养成分

**GET** `/api/nutrition/material/:materialId`

#### 响应字段

| 字段          | 类型   | 说明                                  |
| ------------- | ------ | ------------------------------------- |
| `nutritionId` | string | 营养记录 ID                           |
| `materialId`  | string | 原料 ID                               |
| `per100g`     | object | 每100g营养成分（解析自 JSON）         |
| `dataVersion` | string | 数据版本号                            |
| `dataSource`  | string | 数据来源                              |
| `notes`       | string | 备注                                  |
| `confidence`  | string | 数据可信度：`high` / `medium` / `low` |
| `lastUpdated` | string | 最后更新时间                          |

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

| 字段         | 类型   | 必填 | 说明           |
| ------------ | ------ | ---- | -------------- |
| `per100g`    | object | 是   | 每100g营养成分 |
| `dataSource` | string | 否   | 数据来源       |
| `notes`      | string | 否   | 备注           |

> 如果记录已存在则更新版本号（+1.0），否则新建。

### 7.3 计算配方营养汇总

**POST** `/api/nutrition/calculate/:formulaId`

> 遍历配方所有原料，汇总营养成分，计算总重和每100g营养值。

#### 响应字段

| 字段                | 类型   | 说明           |
| ------------------- | ------ | -------------- |
| `formulaId`         | string | 配方 ID        |
| `formulaName`       | string | 配方名称       |
| `totalWeight`       | number | 总重量         |
| `totalNutrition`    | object | 总营养成分     |
| `per100gNutrition`  | object | 每100g营养成分 |
| `materialBreakdown` | array  | 各原料贡献明细 |

> 计算结果会保存到 `formula_nutrition_summaries` 表。

### 7.4 获取营养标准列表

**GET** `/api/nutrition/profiles`

| 参数       | 类型   | 说明                                                                        |
| ---------- | ------ | --------------------------------------------------------------------------- |
| `category` | string | 筛选分类：`infant` / `child` / `adult` / `elderly` / `pregnant` / `special` |

### 7.5 创建营养标准

**POST** `/api/nutrition/profiles`

| 字段              | 类型   | 必填 | 说明         |
| ----------------- | ------ | ---- | ------------ |
| `name`            | string | 是   | 标准名称     |
| `description`     | string | 否   | 描述         |
| `category`        | string | 是   | 分类         |
| `targetValues`    | object | 是   | 目标营养值   |
| `toleranceRanges` | array  | 否   | 容差范围     |
| `mandatoryFields` | array  | 否   | 必填字段列表 |

### 7.6 更新营养标准

**PUT** `/api/nutrition/profiles/:profileId`

参数同创建。

### 7.7 删除营养标准

**DELETE** `/api/nutrition/profiles/:profileId`

### 7.8 合规性检查

**POST** `/api/nutrition/compliance/:formulaId`

| 参数                | 类型   | 说明                |
| ------------------- | ------ | ------------------- |
| `profileId` (Query) | string | 营养标准 ID（可选） |

> 需要先执行营养计算。检查结果会保存为报告。

#### 响应字段

| 字段              | 类型   | 说明                        |
| ----------------- | ------ | --------------------------- |
| `reportId`        | string | 报告 ID                     |
| `complianceCheck` | array  | 合规检查结果列表            |
| `recommendations` | array  | 建议列表                    |
| `summary`         | object | 汇总（总数/通过/失败/警告） |

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

### 7.9 获取配方营养表格数据

**GET** `/api/nutrition/tables/:formulaId`

> 返回配方营养计算表格所需的完整数据，与 XLS 格式一致。包括原料明细行、营养成分汇总行、NRV 参考值、标签合规行等。

#### 响应字段

| 字段                        | 类型           | 说明                                            |
| --------------------------- | -------------- | ----------------------------------------------- |
| `formulaId`                 | string         | 配方 ID                                         |
| `formulaName`               | string         | 配方名称                                        |
| `finishedWeight`            | number         | 成品重量                                        |
| `ratioFactor`               | number         | 主料含量比系数                                  |
| `salesmanName`              | string         | 业务员名称                                      |
| `salesmanDept`              | string         | 业务员部门                                      |
| `demandTitle`               | string \| null | 需求标题                                        |
| `demandCode`                | string         | 需求编码                                        |
| `demandDesc`                | string \| null | 需求描述                                        |
| `totalWeight`               | number         | 原料总重量                                      |
| `calcRows`                  | array          | 原料营养计算明细行                              |
| `summaryRow`                | object         | 营养成分汇总行（含能量计算）                    |
| `nrvRow`                    | object         | 营养素参考值（NRV）行                           |
| `nrvPercentRow`             | object         | NRV 占比行                                      |
| `labelRows`                 | array          | 标签合规行（含技术处理：0界限值归零、能量重算） |
| `missingNutritionMaterials` | string[]       | 缺少营养数据的原料名称列表                      |
| `versionHistory`            | array          | 版本历史（最近3条非当前版本）                   |

`calcRows` 元素结构：

| 字段                | 类型    | 说明                   |
| ------------------- | ------- | ---------------------- |
| `name`              | string  | 原料名称               |
| `quantity`          | number  | 用量（g）              |
| `ratio`             | number  | 含量比                 |
| `energy`            | string  | 能量（由换算系数计算） |
| `protein`           | number  | 蛋白质（g/100g）       |
| `fat`               | number  | 脂肪（g/100g）         |
| `carbohydrate`      | number  | 碳水化合物（g/100g）   |
| `sodium`            | number  | 钠（mg/100g）          |
| `hasEmptyNutrition` | boolean | 是否缺少营养数据       |

`labelRows` 元素结构：

| 字段            | 类型   | 说明                 |
| --------------- | ------ | -------------------- |
| `item`          | string | 营养素名称           |
| `value`         | number | 标示值（经技术处理） |
| `unit`          | string | 单位                 |
| `nrvPercent`    | number | NRV 百分比           |
| `zeroThreshold` | string | 0 界限值说明         |
| `tolerance`     | string | 允许误差范围         |

---

## 八、Excel 导入模块 `/api/import`

### 8.1 下载配方导入模板

**GET** `/api/import/formula/template`

需认证。下载 Excel 模板文件用于批量导入配方原料。

#### 响应

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename=formula-import-template.xlsx`

#### 模板字段说明

| 列名               | 必填 | 说明                       |
| ------------------ | ---- | -------------------------- |
| 原料名称\*         | 是   | 用于匹配系统中的原料       |
| 原料编码           | 否   | 可选，辅助匹配             |
| 原料类型\*         | 是   | 药材 或 辅料               |
| 数量(g)\*          | 是   | 配方中该原料的用量         |
| 单位               | 否   | 默认 g                     |
| 蛋白质(g/100g)     | 否   | 每100g原料中蛋白质含量     |
| 脂肪(g/100g)       | 否   | 每100g原料中脂肪含量       |
| 碳水化合物(g/100g) | 否   | 每100g原料中碳水化合物含量 |
| 钠(mg/100g)        | 否   | 每100g原料中钠含量         |
| 备注               | 否   | 备注信息                   |

### 8.2 解析配方 Excel 文件

**POST** `/api/import/formula/parse`

需认证。上传 Excel 文件并解析配方原料数据。

#### 请求格式

- Content-Type: `multipart/form-data`
- 文件字段名: `file`
- 支持格式: `.xlsx`, `.xls`
- 文件大小限制: 5MB

#### 响应示例

```json
{
  "success": true,
  "data": {
    "materials": [
      {
        "materialId": "mncvfpifo3l4q5po",
        "materialName": "佛手",
        "materialCode": "MAT001",
        "materialType": "herb",
        "quantity": 108,
        "unit": "g",
        "nutrition": { "protein": 1.2, "fat": 7.7, "carbohydrate": 92, "sodium": 0 },
        "isNew": false
      }
    ],
    "errors": [],
    "warnings": [],
    "missingMaterials": [],
    "summary": {
      "total": 1,
      "existing": 1,
      "new": 0,
      "hasErrors": false,
      "hasMissingMaterials": false
    }
  }
}
```

#### 响应字段说明

| 字段                       | 说明                         |
| -------------------------- | ---------------------------- |
| `materials`                | 解析出的原料列表             |
| `materials[].materialId`   | 原料ID（已匹配时存在）       |
| `materials[].materialName` | 原料名称                     |
| `materials[].materialType` | 原料类型（herb/supplement）  |
| `materials[].quantity`     | 数量（克）                   |
| `materials[].isNew`        | 是否为新原料（系统中不存在） |
| `errors`                   | 解析错误列表                 |
| `warnings`                 | 解析警告列表                 |
| `missingMaterials`         | 缺失原料名称列表             |
| `summary`                  | 解析汇总信息                 |

---

## 九、AI 智能助手 `/api/ai`

> 所有接口需认证。支持多模型（通义千问 / 智谱 GLM / DeepSeek）。

### 9.1 AI 解析配方文档

**POST** `/api/ai/parse-formula`

上传文件（Excel / 图片 / 文本），AI 解析为结构化配方数据。

#### 请求格式

- Content-Type: `multipart/form-data`
- 文件字段名: `file`
- 模型选择字段: `model`（必填，如 `qwen` / `glm` / `deepseek`）
- 支持格式: `.xlsx`, `.xls`, `.csv`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- 文件大小限制: 10MB

> 图片解析需选择支持视觉的模型（通义千问或智谱GLM）。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "name": "正阳御湿膏",
    "salesmanName": "张明",
    "formulaDate": "2026-04-27",
    "materials": [
      { "name": "佛手", "quantity": 108, "unit": "g", "matched": true, "materialId": "xxx" },
      { "name": "藿香", "quantity": 90, "unit": "g", "matched": true, "materialId": "yyy" }
    ],
    "finishedWeight": 3000,
    "description": "..."
  }
}
```

### 9.2 AI 解析原料营养成分

**POST** `/api/ai/parse-material-nutrition`

上传文件，AI 解析为结构化营养成分数据。

#### 请求格式

- Content-Type: `multipart/form-data`
- 文件字段名: `file`
- 模型选择字段: `model`（必填）
- 支持格式同 9.1

### 9.3 AI 自然语言检索

**POST** `/api/ai/natural-search`

用自然语言查询数据，AI 自动转换为 SQL 安全执行。

#### 请求参数

| 字段    | 类型   | 必填 | 说明         |
| ------- | ------ | ---- | ------------ |
| `query` | string | 是   | 自然语言查询 |
| `model` | string | 是   | AI 模型标识  |

> 内置 SQL 白名单校验 + 数据隔离，确保安全。

### 9.4 获取可用 AI 模型列表

**GET** `/api/ai/models`

返回当前系统配置的所有可用 AI 模型及其能力。

#### 响应示例

```json
{
  "success": true,
  "data": [
    { "id": "qwen", "name": "通义千问", "supportsVision": true },
    { "id": "glm", "name": "智谱GLM", "supportsVision": true },
    { "id": "deepseek", "name": "DeepSeek", "supportsVision": false }
  ]
}
```

---

## 十、天气服务 `/api/weather`

> 代理高德地图 API，解决前端 CORS 限制。所有接口无需认证。

### 10.1 IP 定位

**GET** `/api/weather/location`

基于请求 IP 返回所在城市信息。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "province": "上海",
    "city": "上海市",
    "adcode": "310000"
  }
}
```

### 10.2 高德 API 通用代理

**GET** `/api/weather/amap/*`

代理高德 REST API 请求，自动附加 Key。

#### 用法示例

- 天气查询: `/api/weather/amap/v3/weather/weatherInfo?city=310000`
- 地理编码: `/api/weather/amap/v3/geocode/geo?address=上海`
- 关键词搜索: `/api/weather/amap/v3/place/text?keywords=广州`

> 超时时间: 10 秒。高德 Key 从环境变量 `AMAP_KEY` 读取。

---

## 十一、健康检查

### 11.1 服务状态

**GET** `/health`

无需认证。

```json
{ "status": "ok", "timestamp": "2026-01-01T00:00:00.000Z" }
```

---

## 十二、销量数据管理 `/api/sales`

> 所有接口需认证。支持按配方、业务员、时间周期筛选和统计分析。

### 12.1 获取销量列表

**GET** `/api/sales`

| 参数          | 类型   | 说明                                                         |
| ------------- | ------ | ------------------------------------------------------------ |
| `formulaId`   | string | 按配方 ID 筛选                                               |
| `salesmanId`  | string | 按业务员 ID 筛选                                             |
| `periodStart` | string | 起始周期（格式：YYYY-MM-01）                                 |
| `periodEnd`   | string | 结束周期（格式：YYYY-MM-01）                                 |
| `keyword`     | string | 搜索配方名称/业务员名称                                      |
| `sortBy`      | string | 排序字段：`quantity` / `revenue` / `period`（默认 quantity） |
| `order`       | string | 排序方向：`asc` / `desc`（默认 desc）                        |
| `page`        | number | 页码                                                         |
| `pageSize`    | number | 每页数量                                                     |

#### 响应字段

| 字段           | 类型   | 说明                                         |
| -------------- | ------ | -------------------------------------------- |
| `id`           | string | 销量记录主键                                 |
| `formulaId`    | string | 配方 ID                                      |
| `formulaName`  | string | 配方名称（关联查询）                         |
| `formulaCode`  | string | 配方编码（关联查询）                         |
| `salesmanId`   | string | 业务员 ID                                    |
| `salesmanName` | string | 业务员名称（关联查询）                       |
| `periodType`   | string | 周期类型：`monthly` / `quarterly` / `yearly` |
| `periodStart`  | string | 周期起始日期                                 |
| `periodEnd`    | string | 周期结束日期                                 |
| `quantity`     | number | 销售数量（件）                               |
| `revenue`      | number | 销售金额（元）                               |
| `notes`        | string | 备注                                         |
| `createdBy`    | string | 创建人                                       |
| `createdAt`    | string | 创建时间                                     |
| `updatedAt`    | string | 更新时间                                     |

#### 响应示例

```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": "abc123",
        "formulaId": "fp001",
        "formulaName": "正阳御湿膏",
        "formulaCode": "FP001",
        "salesmanId": "yw001",
        "salesmanName": "黄蓉",
        "periodType": "monthly",
        "periodStart": "2026-04-01",
        "periodEnd": "2026-04-30",
        "quantity": 150,
        "revenue": 45000.0,
        "notes": null,
        "createdBy": "admin",
        "createdAt": "2026-04-29T10:30:00.000Z",
        "updatedAt": "2026-04-29T10:30:00.000Z"
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
  }
}
```

### 12.2 获取销量统计

**GET** `/api/sales/stats`

| 参数          | 类型   | 说明         |
| ------------- | ------ | ------------ |
| `periodStart` | string | 统计起始周期 |
| `periodEnd`   | string | 统计结束周期 |

#### 响应字段

| 字段               | 类型   | 说明                         |
| ------------------ | ------ | ---------------------------- |
| `totalQuantity`    | number | 总销售数量                   |
| `totalRevenue`     | number | 总销售金额（元）             |
| `topFormulas`      | array  | TOP10 配方销量排行           |
| `topSalesmen`      | array  | TOP10 业务员销量排行         |
| `monthlyTrend`     | array  | 月度销量趋势                 |
| `periodComparison` | object | 本月 vs 上月对比（含增长率） |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "totalQuantity": 500,
    "totalRevenue": 150000.0,
    "topFormulas": [{ "formulaId": "fp001", "formulaName": "正阳御湿膏", "totalQuantity": 300, "totalRevenue": 90000 }],
    "topSalesmen": [{ "salesmanId": "yw001", "salesmanName": "黄蓉", "totalQuantity": 200, "totalRevenue": 60000 }],
    "monthlyTrend": [
      { "month": "2026-03-01", "quantity": 350, "revenue": 105000 },
      { "month": "2026-04-01", "quantity": 150, "revenue": 45000 }
    ],
    "periodComparison": {
      "current": { "quantity": 150, "revenue": 45000, "month": "2026-04-01" },
      "previous": { "quantity": 350, "revenue": 105000, "month": "2026-03-01" },
      "quantityGrowthRate": -57.1,
      "revenueGrowthRate": -57.1
    }
  }
}
```

### 12.3 获取配方销量历史

**GET** `/api/sales/formula/:formulaId`

返回指定配方的全部销量记录，按周期倒序。

### 12.4 创建销量记录

**POST** `/api/sales`

> 前端录入单位为**万元**，提交时自动 ×10000 转为元存储。

| 字段          | 类型   | 必填 | 说明                                               |
| ------------- | ------ | ---- | -------------------------------------------------- |
| `formulaId`   | string | 是   | 配方 ID                                            |
| `salesmanId`  | string | 否   | 业务员 ID（不传则取配方默认负责人）                |
| `periodType`  | string | 否   | 周期类型：`monthly`(默认) / `quarterly` / `yearly` |
| `periodStart` | string | 是   | 周期起始日期（格式：YYYY-MM 或 YYYY-MM-01）        |
| `quantity`    | number | 是   | 销售数量                                           |
| `revenue`     | number | 是   | **销售金额（万元）**，后端存为元                   |
| `notes`       | string | 否   | 备注                                               |

> 同一配方在同一周期类型+起始日期下不可重复创建（409 冲突错误）。

### 12.5 更新销量记录

**PUT** `/api/sales/:id`

| 字段       | 类型   | 必填 | 说明           |
| ---------- | ------ | ---- | -------------- |
| `quantity` | number | 否   | 销售数量       |
| `revenue`  | number | 否   | 销售金额（元） |
| `notes`    | string | 否   | 备注           |

### 12.6 删除销量记录

**DELETE** `/api/sales/:id`

物理删除。
