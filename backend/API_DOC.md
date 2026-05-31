# TingStudio API 接口文档

> 基础地址：`http://localhost:3000/api`
> 认证方式：Bearer Token（JWT）
> Content-Type：`application/json`
> 最后更新：2026-06-01

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
| `status`   | string | 按状态筛选：`draft` / `pending_review` / `published` |
| `page`     | number | 页码                                             |
| `pageSize` | number | 每页数量                                        |

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
| `status`       | string         | 状态：`draft` / `pending_review` / `published`                      |
| `version`      | number         | 版本号                                                              |
| `createdBy`    | string         | 创建人                                                              |
| `createdAt`    | string         | 创建时间                                                            |
| `updatedAt`    | string         | 更新时间                                                            |

### 2.2 获取原料详情

**GET** `/api/materials/:id`

### 2.3 获取下一个原料编码

**GET** `/api/materials/next-code`

需认证。返回当前用户下一个可用的 MAT 序列编码。

| 参数   | 类型   | 必填 | 说明     |
| ------ | ------ | ---- | -------- |
| `name` | string | 是   | 原料名称 |

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

### 2.5.1 获取当前用户原料状态计数

**GET** `/api/materials/my-counts`

需认证。返回当前用户各状态的原料数量统计。

#### 响应字段

| 字段              | 类型   | 说明                       |
| ----------------- | ------ | -------------------------- |
| `draft`           | number | 草稿状态数量               |
| `pendingReview`   | number | 待审核状态数量             |
| `published`       | number | 已发布状态数量             |

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

### 3.8 发布配方

**PUT** `/api/formulas/:id/publish`

需认证。将配方状态设为已发布。

> 仅管理员或配方创建者可操作。

### 3.9 校验含量比

**POST** `/api/formulas/validate-ratio`

需认证。实时校验配方的含量比系数是否在合理范围内。

#### 请求参数

| 字段                    | 类型   | 必填 | 说明                        |
| ----------------------- | ------ | ---- | --------------------------- |
| `materials`             | array  | 是   | 原料列表                    |
| `finishedWeight`        | number | 是   | 成品重量                    |
| `ratioFactor`           | number | 是   | 主料含量比系数（0.15-0.25） |
| `supplementRatioFactor` | number | 是   | 辅料含量比系数（0.5-1.5）   |

#### 响应字段

| 字段       | 类型    | 说明                       |
| ---------- | ------- | -------------------------- |
| `valid`    | boolean | 是否通过校验               |
| `ratio`    | number  | 实际含量比                 |
| `level`    | string  | 预警级别：`normal` / `warning` / `high_warning` |
| `message`  | string  | 校验结果描述               |

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

### 5.6 获取待审核版本列表

**GET** `/api/versions/pending-review`

需认证。**仅管理员**可查看。返回待审核的配方版本列表。

### 5.7 获取我的提交列表

**GET** `/api/versions/my-submissions`

需认证。返回当前用户提交的版本审核列表。

### 5.7.1 获取我的提交状态计数

**GET** `/api/versions/my-submissions/counts`

需认证。返回当前用户提交的版本审核状态计数。

#### 响应字段

| 字段              | 类型   | 说明                       |
| ----------------- | ------ | -------------------------- |
| `draft`           | number | 草稿状态数量               |
| `pendingReview`   | number | 待审核状态数量             |
| `published`       | number | 已发布状态数量             |
| `archived`        | number | 已归档状态数量             |

### 5.8 获取我审核过的历史

**GET** `/api/versions/reviewed-by-me`

需认证。**仅管理员**可查看。返回当前用户审核过的版本历史。

### 5.9 获取版本审核日志

**GET** `/api/versions/review-logs/:versionId`

需认证。返回指定版本的审核操作日志。

### 5.10 获取原料更新信息

**GET** `/api/versions/material-updates/:formulaId`

需认证。返回指定配方的原料版本更新信息。

### 5.11 提交版本审核

**POST** `/api/versions/submit/:versionId`

需认证。将版本状态从 `draft` 提交审核，变为 `pending_review`。

### 5.12 刷新配方快照

**POST** `/api/versions/refresh-snapshot/:formulaId`

需认证。刷新指定配方的版本快照数据。

### 5.13 审批通过版本

**PUT** `/api/versions/approve/:versionId`

需认证。**仅管理员**可操作。将版本状态设为 `published`。

### 5.14 驳回版本

**PUT** `/api/versions/reject/:versionId`

需认证。**仅管理员**可操作。将版本状态回退为 `draft`。

#### 请求参数

| 字段      | 类型   | 必填 | 说明     |
| --------- | ------ | ---- | -------- |
| `comment` | string | 否   | 驳回原因 |

### 5.15 设为当前版本

**PUT** `/api/versions/set-current/:versionId`

需认证。将指定版本设为当前版本，其他版本设为非当前。

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

### 6.10 重新导出任务

**POST** `/api/exports/jobs/:jobId/re-export`

需认证。基于原任务参数重新执行导出。

> 与 `retry` 不同，`re-export` 会创建新的导出任务而非重试失败任务。

### 6.11 创建分享链接

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

### 6.12 获取分享列表

**GET** `/api/exports/shares`

需认证。返回当前用户创建的所有分享链接。

### 6.13 获取分享内容（公开）

**GET** `/api/exports/share/:shareId`

> ⚠️ **注意**：该端点控制器已实现但路由暂未注册，当前不可访问。无需认证。会检查过期和下载次数限制。

### 6.14 删除分享

**DELETE** `/api/exports/share/:shareId`

需认证。删除指定的分享链接。

### 6.15 获取 API 接口列表

**GET** `/api/exports/api-interfaces`

### 6.16 创建 API 接口

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

### 9.5 AI 对话

**POST** `/api/ai/chat`

需认证。与 AI 模型进行对话，支持 SSE 流式响应。

#### 请求参数

| 字段      | 类型    | 必填 | 说明                          |
| --------- | ------- | ---- | ----------------------------- |
| `message` | string  | 是   | 用户消息                      |
| `model`   | string  | 否   | AI 模型标识                   |
| `stream`  | boolean | 否   | 是否流式响应，默认 `true`     |

### 9.6 下载检索导出文件

**GET** `/api/ai/export/:filename`

需认证。下载自然语言检索导出的 CSV 文件。

### 9.7 模型管理 — 列表

**GET** `/api/ai/models-manage`

需认证。返回所有 AI 模型配置列表（含 API Key 等敏感信息，仅管理员可查看完整信息）。

### 9.8 模型管理 — 创建

**POST** `/api/ai/models-manage`

需认证。**仅管理员**可创建模型配置。

#### 请求参数

| 字段               | 类型    | 必填 | 说明                     |
| ------------------ | ------- | ---- | ------------------------ |
| `provider`         | string  | 是   | 供应商标识（唯一）       |
| `name`             | string  | 是   | 显示名称                 |
| `baseUrl`          | string  | 是   | API 基础 URL             |
| `apiKey`           | string  | 否   | API 密钥                 |
| `model`            | string  | 是   | 文本模型名称             |
| `visionModel`      | string  | 否   | 视觉模型名称             |
| `supportsVision`   | boolean | 否   | 是否支持视觉             |
| `description`      | string  | 否   | 描述                     |
| `sortOrder`        | number  | 否   | 排序序号                 |

### 9.9 模型管理 — 更新

**PUT** `/api/ai/models-manage/:id`

需认证。**仅管理员**可更新。参数同创建。

### 9.10 模型管理 — 删除

**DELETE** `/api/ai/models-manage/:id`

需认证。**仅管理员**可删除模型配置。

### 9.11 模型管理 — 测试连接

**POST** `/api/ai/models-manage/:id/test`

需认证。测试指定模型配置的连接是否正常。

#### 响应字段

| 字段       | 类型    | 说明               |
| ---------- | ------- | ------------------ |
| `success`  | boolean | 是否连接成功       |
| `latency`  | number  | 响应延迟（ms）     |
| `model`    | string  | 测试的模型名称     |

### 9.12 模型管理 — 版本列表

**GET** `/api/ai/models-manage/:id/versions`

需认证。获取指定模型配置的可用版本列表。

### 9.13 按提供者获取模型版本

**GET** `/api/ai/models/:provider/versions`

需认证。获取指定提供者的可用模型版本列表。

### 9.14 切换模型版本

**PUT** `/api/ai/models/:provider/version`

需认证。**仅管理员**可切换模型版本。

#### 请求参数

| 字段     | 类型   | 必填 | 说明         |
| -------- | ------ | ---- | ------------ |
| `model`  | string | 是   | 新模型版本名 |

### 9.15 设置备用模型

**PUT** `/api/ai/models-manage/:id/fallback`

需认证。**仅管理员**可设置备用降级模型。

#### 请求参数

| 字段              | 类型   | 必填 | 说明             |
| ----------------- | ------ | ---- | ---------------- |
| `fallbackProvider` | string | 是  | 降级供应商标识   |
| `fallbackPriority` | number | 否  | 降级优先级       |

### 9.16 AI 用量统计

**GET** `/api/ai/usage`

需认证。返回 AI 模型用量汇总统计。

#### 请求参数

| 参数       | 类型   | 说明         |
| ---------- | ------ | ------------ |
| `period`   | string | 统计周期     |
| `provider` | string | 按供应商标识 |

### 9.17 AI 用量日志

**GET** `/api/ai/usage/logs`

需认证。分页查询 AI 调用日志。

#### 请求参数

| 参数           | 类型   | 说明                     |
| -------------- | ------ | ------------------------ |
| `provider`     | string | 按供应商标识             |
| `callType`     | string | 按调用类型               |
| `startDate`    | string | 起始日期                 |
| `endDate`      | string | 结束日期                 |
| `page`         | number | 页码                     |
| `pageSize`     | number | 每页数量                 |

### 9.18 告警配置列表

**GET** `/api/ai/alerts/configs`

需认证。返回所有模型的告警配置列表。

### 9.19 更新告警配置

**PUT** `/api/ai/alerts/configs/:id`

需认证。**仅管理员**可更新告警配置。

### 9.20 告警记录列表

**GET** `/api/ai/alerts/records`

需认证。分页查询告警记录。

#### 请求参数

| 参数       | 类型   | 说明             |
| ---------- | ------ | ---------------- |
| `level`    | string | 按告警级别筛选   |
| `isRead`   | string | 按已读状态筛选   |
| `page`     | number | 页码             |
| `pageSize` | number | 每页数量         |

### 9.21 AI 服务健康状态

**GET** `/api/ai/health`

需认证。返回所有 AI 服务的健康状态概览。

### 9.22 按提供者获取健康历史

**GET** `/api/ai/health/:provider/history`

需认证。返回指定提供者的健康检查历史记录。

### 9.23 模型应用列表

**GET** `/api/ai/model-applications`

需认证。返回所有功能模块的模型分配配置。

### 9.24 创建模型应用

**POST** `/api/ai/model-applications`

需认证。**仅管理员**可创建。

#### 请求参数

| 字段          | 类型    | 必填 | 说明             |
| ------------- | ------- | ---- | ---------------- |
| `module`      | string  | 是   | 功能模块标识     |
| `moduleName`  | string  | 是   | 模块显示名称     |
| `provider`    | string  | 是   | 供应商标识       |
| `model`       | string  | 是   | 模型名称         |
| `description` | string  | 否   | 描述             |
| `enabled`     | boolean | 否   | 是否启用         |

### 9.25 更新模型应用

**PUT** `/api/ai/model-applications/:id`

需认证。**仅管理员**可更新。参数同创建。

### 9.26 部分更新模型应用

**PATCH** `/api/ai/model-applications/:id`

需认证。**仅管理员**可部分更新（如切换启用状态）。

### 9.27 删除模型应用

**DELETE** `/api/ai/model-applications/:id`

需认证。**仅管理员**可删除。

### 9.28 最近活动

**GET** `/api/ai/recent-activity`

需认证。返回最近的 AI 调用活动记录。

### 9.29 智能工具历史

**GET** `/api/ai/smart-tool-history`

需认证。返回智能工具的使用历史记录。

### 9.30 删除智能工具历史

**DELETE** `/api/ai/smart-tool-history/:id`

需认证。删除指定的智能工具历史记录。

### 9.31 提示词模板列表

**GET** `/api/ai/prompt-templates`

需认证。返回所有 AI 提示词模板。

### 9.32 创建提示词模板

**POST** `/api/ai/prompt-templates`

需认证。**仅管理员**可创建。

#### 请求参数

| 字段                 | 类型    | 必填 | 说明                                                |
| -------------------- | ------- | ---- | --------------------------------------------------- |
| `module`             | string  | 是   | 所属模块                                            |
| `name`               | string  | 是   | 模板名称                                            |
| `type`               | string  | 否   | 模板类型：`description` / `preparation` / `version_reason` / `revision` |
| `systemPrompt`       | string  | 否   | 系统提示词                                          |
| `userPromptTemplate` | string  | 否   | 用户提示词模板                                      |
| `variables`          | array   | 否   | 模板变量列表                                        |
| `isDefault`          | boolean | 否   | 是否为默认模板                                      |
| `enabled`            | boolean | 否   | 是否启用                                            |
| `sortOrder`          | number  | 否   | 排序序号                                            |

### 9.33 更新提示词模板

**PUT** `/api/ai/prompt-templates/:id`

需认证。**仅管理员**可更新。参数同创建。

### 9.34 删除提示词模板

**DELETE** `/api/ai/prompt-templates/:id`

需认证。**仅管理员**可删除。

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

### 11.2 服务器运行状态

**GET** `/api/status`

无需认证。返回服务器运行状态信息。

#### 响应字段

| 字段            | 类型   | 说明                |
| --------------- | ------ | ------------------- |
| `uptime`        | number | 运行时长（秒）      |
| `memory`        | object | 内存使用信息        |
| `nodeVersion`   | string | Node.js 版本        |
| `environment`   | string | 运行环境            |

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

---

## 十三、仪表盘 `/api/dashboard`

> 所有接口需认证。formulist 仅可见自己创建的数据，admin 可见全部。

### 13.1 获取仪表盘统计数据

**GET** `/api/dashboard/stats`

需认证。返回仪表盘概览数据。

#### 响应字段

| 字段              | 类型   | 说明                   |
| ----------------- | ------ | ---------------------- |
| `formulas`        | number | 配方总数               |
| `materials`       | number | 原料总数               |
| `sales.quantity`  | number | 本月销售数量           |
| `sales.revenue`   | number | 本月销售金额（元）     |
| `sales.formulaCount` | number | 本月有销量的配方数  |
| `pendingTasks`    | number | 待办任务数（预留字段） |

### 13.2 获取最近活动

**GET** `/api/dashboard/activity`

需认证。返回最近更新的配方和原料活动记录。

#### 请求参数

| 参数    | 类型   | 默认值 | 说明               |
| ------- | ------ | ------ | ------------------ |
| `limit` | number | 10     | 返回条数（最大20） |

#### 响应字段

| 字段       | 类型   | 说明                              |
| ---------- | ------ | --------------------------------- |
| `id`       | string | 记录 ID                           |
| `name`     | string | 名称                              |
| `code`     | string | 编码                              |
| `updatedAt` | string | 更新时间                         |
| `type`     | string | 类型：`formula` / `material`      |

### 13.3 获取销量趋势

**GET** `/api/dashboard/sales-trend`

需认证。返回近12个月的销量趋势数据。

#### 请求参数

| 参数     | 类型   | 默认值  | 说明                                   |
| -------- | ------ | ------- | -------------------------------------- |
| `period` | string | `month` | 聚合周期：`week` / `month` / `year`    |

#### 响应字段

| 字段         | 类型   | 说明           |
| ------------ | ------ | -------------- |
| `period`     | string | 周期标识       |
| `quantity`   | number | 销售数量       |
| `revenue`    | number | 销售金额（元） |
| `orderCount` | number | 订单数         |

---

## 十四、文件管理 `/api/files`

> 所有接口需认证。支持文件上传、预览、下载、关联、审计等操作。

### 14.1 获取文件列表

**GET** `/api/files`

需认证。分页查询已上传文件列表。

#### 请求参数

| 参数           | 类型   | 说明                                       |
| -------------- | ------ | ------------------------------------------ |
| `keyword`      | string | 搜索文件名                                 |
| `fileType`     | string | 按文件类型筛选：`formula` / `other`        |
| `status`       | string | 按状态筛选：`uploaded` / `parsed` / `linked` / `archived` / `orphaned` |
| `relatedStatus` | string | 关联状态：`linked` / `unlinked`           |
| `startDate`    | string | 上传起始日期                               |
| `endDate`      | string | 上传结束日期                               |
| `page`         | number | 页码                                       |
| `pageSize`     | number | 每页数量                                   |

#### 响应字段

| 字段               | 类型   | 说明                                  |
| ------------------ | ------ | ------------------------------------- |
| `list`             | array  | 文件列表                              |
| `total`            | number | 总数                                  |
| `stats.total`      | number | 文件总数                              |
| `stats.parsed`     | number | 已解析数                              |
| `stats.linked`     | number | 已关联数                              |
| `stats.pending`    | number | 待处理数                              |

### 14.2 获取文件统计

**GET** `/api/files/stats`

需认证。返回文件管理统计概览。

#### 响应字段

| 字段         | 类型   | 说明         |
| ------------ | ------ | ------------ |
| `total`      | number | 文件总数     |
| `parsed`     | number | 已解析数     |
| `linked`     | number | 已关联数     |
| `pending`    | number | 待处理数     |
| `totalSize`  | number | 文件总大小   |

### 14.3 上传文件

**POST** `/api/files/upload`

需认证。上传文件到服务器。

#### 请求格式

- Content-Type: `multipart/form-data`
- 文件字段名: `file`
- 附加字段: `fileType`（可选，默认 `formula`）
- 支持格式: `.xlsx`, `.xls`, `.csv`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- 文件大小限制: 10MB

#### 响应字段

| 字段            | 类型   | 说明         |
| --------------- | ------ | ------------ |
| `fileId`        | string | 文件 ID      |
| `originalName`  | string | 原始文件名   |
| `storagePath`   | string | 存储路径     |
| `fileSize`      | number | 文件大小     |
| `mimeType`      | string | MIME 类型    |
| `fileType`      | string | 文件类型     |
| `status`        | string | 状态         |
| `uploadedBy`    | string | 上传人       |
| `uploadedAt`    | string | 上传时间     |

### 14.4 获取文件详情

**GET** `/api/files/:fileId`

需认证。返回文件详情及关联关系。

#### 响应字段

| 字段            | 类型   | 说明                          |
| --------------- | ------ | ----------------------------- |
| `fileId`        | string | 文件 ID                       |
| `originalName`  | string | 原始文件名                    |
| `storagePath`   | string | 存储路径                      |
| `fileSize`      | number | 文件大小                      |
| `mimeType`      | string | MIME 类型                     |
| `fileType`      | string | 文件类型                      |
| `status`        | string | 状态                          |
| `relatedId`     | string | 关联资源 ID                   |
| `relatedType`   | string | 关联类型：`formula` / `material` |
| `relatedName`   | string | 关联资源名称                  |
| `uploadedBy`    | string | 上传人                        |
| `uploadedAt`    | string | 上传时间                      |
| `relations`     | array  | 关联关系列表                  |

### 14.5 预览文件

**GET** `/api/files/:fileId/preview`

需认证。返回文件预览数据。

#### 请求参数

| 参数      | 类型   | 默认值 | 说明               |
| --------- | ------ | ------ | ------------------ |
| `sheet`   | number | 0      | Excel 工作表索引   |
| `maxRows` | number | 500    | 最大行数           |
| `maxCols` | number | 50     | 最大列数           |

#### 响应字段（Excel 类型）

| 字段          | 类型     | 说明                   |
| ------------- | -------- | ---------------------- |
| `type`        | string   | `excel`                |
| `sheets`      | array    | 工作表数据             |
| `activeSheet` | number   | 当前工作表索引         |
| `sheetNames`  | string[] | 所有工作表名称         |
| `totalRows`   | number   | 总行数                 |
| `truncated`   | boolean  | 是否被截断             |

#### 响应字段（图片类型）

| 字段          | 类型   | 说明                     |
| ------------- | ------ | ------------------------ |
| `type`        | string | `image`                  |
| `url`         | string | 下载地址                 |
| `thumbnailUrl` | string | 缩略图地址              |

### 14.6 获取文件缩略图

**GET** `/api/files/:fileId/thumbnail`

需认证。返回图片缩略图（200×200 JPEG），仅图片文件支持。

### 14.7 下载文件

**GET** `/api/files/:fileId/download`

需认证。下载原始文件。

### 14.8 获取文件审计日志

**GET** `/api/files/:fileId/audit`

需认证。返回文件的操作审计日志。

#### 响应字段

| 字段        | 类型   | 说明                                         |
| ----------- | ------ | -------------------------------------------- |
| `logId`     | string | 日志 ID                                      |
| `fileId`    | string | 文件 ID                                      |
| `action`    | string | 操作：`upload` / `download` / `delete` / `link` / `unlink` / `archive` / `reparse` |
| `operator`  | string | 操作人 ID                                    |
| `timestamp` | string | 操作时间                                     |
| `detailJson` | object | 操作详情                                    |
| `ipAddress` | string | IP 地址                                      |

### 14.9 关联文件

**POST** `/api/files/:fileId/link`

需认证。将文件关联到配方或原料。

#### 请求参数

| 字段          | 类型   | 必填 | 说明                          |
| ------------- | ------ | ---- | ----------------------------- |
| `relatedId`   | string | 是   | 关联资源 ID                   |
| `relatedType` | string | 是   | 关联类型：`formula` / `material` |

### 14.10 取消文件关联

**POST** `/api/files/:fileId/unlink`

需认证。取消文件与资源的关联。

#### 请求参数

| 字段          | 类型   | 必填 | 说明                              |
| ------------- | ------ | ---- | --------------------------------- |
| `relatedId`   | string | 否   | 取消指定关联（不传则取消全部关联） |
| `relatedType` | string | 否   | 关联类型                           |

### 14.11 获取文件关联关系

**GET** `/api/files/:fileId/relations`

需认证。返回文件的所有关联关系。

### 14.12 重新解析文件

**POST** `/api/files/:fileId/reparse`

需认证。触发文件重新解析。

#### 请求参数

| 字段    | 类型   | 必填 | 说明               |
| ------- | ------ | ---- | ------------------ |
| `model` | string | 否   | 指定解析模型       |

### 14.13 删除文件

**DELETE** `/api/files/:fileId`

需认证。**仅管理员**可删除文件。同时删除磁盘上的物理文件。

### 14.14 批量删除文件

**POST** `/api/files/batch-delete`

需认证。**仅管理员**可批量删除文件。

#### 请求参数

| 字段      | 类型     | 必填 | 说明           |
| --------- | -------- | ---- | -------------- |
| `fileIds` | string[] | 是   | 文件 ID 列表   |

#### 响应字段

| 字段      | 类型   | 说明         |
| --------- | ------ | ------------ |
| `deleted` | number | 成功删除数   |
| `failed`  | number | 失败数       |

### 14.15 批量归档文件

**POST** `/api/files/batch-archive`

需认证。批量归档文件。

#### 请求参数

| 字段      | 类型     | 必填 | 说明         |
| --------- | -------- | ---- | ------------ |
| `fileIds` | string[] | 是   | 文件 ID 列表 |

#### 响应字段

| 字段       | 类型   | 说明         |
| ---------- | ------ | ------------ |
| `archived` | number | 成功归档数   |
| `failed`   | number | 失败数       |

### 14.16 修复乱码文件名

**POST** `/api/files/fix-garbled`

需认证。修复因编码问题导致的文件名乱码。

#### 响应字段

| 字段    | 类型   | 说明           |
| ------- | ------ | -------------- |
| `total` | number | 总记录数       |
| `fixed` | number | 修复的记录数   |

---

## 十五、报告中心 `/api/reports`

> 所有接口需认证。formulist 仅可见自己创建的和已发布的报告，admin 可见全部。

### 15.1 获取报告列表

**GET** `/api/reports`

需认证。分页查询报告列表。

#### 请求参数

| 参数          | 类型   | 说明                                             |
| ------------- | ------ | ------------------------------------------------ |
| `type`        | string | 报告类型：`weekly` / `monthly`                   |
| `status`      | string | 状态：`draft` / `published`                      |
| `startDate`   | string | 统计起始日期                                     |
| `endDate`     | string | 统计结束日期                                     |
| `generatedBy` | string | 生成方式筛选                                     |
| `page`        | number | 页码                                             |
| `pageSize`    | number | 每页数量                                         |

#### 响应字段

| 字段          | 类型   | 说明                           |
| ------------- | ------ | ------------------------------ |
| `id`          | string | 报告 ID                        |
| `type`        | string | 类型：`weekly` / `monthly`     |
| `title`       | string | 标题                           |
| `periodStart` | string | 统计起始日期                   |
| `periodEnd`   | string | 统计结束日期                   |
| `status`      | string | 状态                           |
| `dataJson`    | object | 报告数据（解析自 JSON）        |
| `generatedBy` | string | 生成方式                       |
| `createdBy`   | string | 创建人                         |
| `creatorName` | string | 创建人名称                     |
| `createdAt`   | string | 创建时间                       |
| `updatedAt`   | string | 更新时间                       |

### 15.2 获取报告详情

**GET** `/api/reports/:id`

需认证。返回报告完整数据。

### 15.3 生成报告

**POST** `/api/reports/generate`

需认证。**仅管理员**可生成报告。自动聚合指定周期的数据。

#### 请求参数

| 字段               | 类型    | 必填 | 说明                        |
| ------------------ | ------- | ---- | --------------------------- |
| `type`             | string  | 是   | 报告类型：`weekly` / `monthly` |
| `periodStart`      | string  | 是   | 统计起始日期                |
| `periodEnd`        | string  | 是   | 统计结束日期                |
| `includePlans`     | boolean | 否   | 是否包含计划数据            |
| `includeAIAnalysis` | boolean | 否   | 是否包含 AI 分析           |

### 15.4 更新报告

**PUT** `/api/reports/:id`

需认证。更新报告标题、数据或状态。

#### 请求参数

| 字段       | 类型   | 必填 | 说明                      |
| ---------- | ------ | ---- | ------------------------- |
| `title`    | string | 否   | 标题                      |
| `dataJson` | object | 否   | 报告数据                  |
| `status`   | string | 否   | 状态                      |

> formulist 仅可修改 `plans` 字段。

### 15.5 删除报告

**DELETE** `/api/reports/:id`

需认证。仅管理员或报告创建者可删除。

### 15.6 发布报告

**POST** `/api/reports/:id/publish`

需认证。**仅管理员**可发布报告。

### 15.7 获取周报数据

**GET** `/api/reports/data/weekly`

需认证。获取指定周期的周报聚合数据。

#### 请求参数

| 参数          | 类型   | 必填 | 说明         |
| ------------- | ------ | ---- | ------------ |
| `periodStart` | string | 是   | 起始日期     |
| `periodEnd`   | string | 是   | 结束日期     |

### 15.8 获取月报数据

**GET** `/api/reports/data/monthly`

需认证。获取指定周期的月报聚合数据。

#### 请求参数

| 参数          | 类型   | 必填 | 说明         |
| ------------- | ------ | ---- | ------------ |
| `periodStart` | string | 是   | 起始日期     |
| `periodEnd`   | string | 是   | 结束日期     |

### 15.9 获取目标列表

**GET** `/api/reports/targets`

需认证。返回报告目标列表。

#### 请求参数

| 参数         | 类型   | 说明                            |
| ------------ | ------ | ------------------------------- |
| `periodType` | string | 周期类型：`monthly` / `quarterly` / `yearly` |

### 15.10 创建目标

**POST** `/api/reports/targets`

需认证。创建报告目标。

#### 请求参数

| 字段          | 类型   | 必填 | 说明                            |
| ------------- | ------ | ---- | ------------------------------- |
| `periodType`  | string | 是   | 周期类型                        |
| `periodStart` | string | 是   | 起始日期                        |
| `periodEnd`   | string | 是   | 结束日期                        |
| `targetsJson` | object | 否   | 目标数据                        |

### 15.11 更新目标

**PUT** `/api/reports/targets/:id`

需认证。参数同创建。

### 15.12 删除目标

**DELETE** `/api/reports/targets/:id`

需认证。

### 15.13 报告对比

**POST** `/api/reports/compare`

需认证。对比两份报告的数据差异。

#### 请求参数

| 字段         | 类型   | 必填 | 说明     |
| ------------ | ------ | ---- | -------- |
| `reportId1`  | string | 是   | 报告1 ID |
| `reportId2`  | string | 是   | 报告2 ID |

#### 响应字段

| 字段    | 类型   | 说明             |
| ------- | ------ | ---------------- |
| `report1` | object | 报告1 完整数据 |
| `report2` | object | 报告2 完整数据 |
| `diff`    | object | 差异对比数据   |

### 15.14 AI 分析报告

**POST** `/api/reports/ai-analysis`

需认证。使用 AI 分析报告数据。

#### 请求参数

| 字段          | 类型   | 必填 | 说明               |
| ------------- | ------ | ---- | ------------------ |
| `reportData`  | object | 是   | 报告数据           |
| `provider`    | string | 否   | AI 模型提供者      |

#### 响应字段

| 字段       | 类型   | 说明         |
| ---------- | ------ | ------------ |
| `analysis` | string | AI 分析结果  |
| `model`    | string | 使用的模型   |
| `usage`    | object | Token 用量   |
| `provider` | string | 提供者       |

### 15.15 保存 AI 分析

**PUT** `/api/reports/:id/ai-analysis`

需认证。将 AI 分析结果保存到报告数据中。

#### 请求参数

| 字段          | 类型   | 必填 | 说明         |
| ------------- | ------ | ---- | ------------ |
| `aiAnalysis`  | string | 是   | AI 分析内容  |

### 15.16 导出报告 PDF

**GET** `/api/reports/:id/export/pdf`

需认证。导出报告为 PDF 文件。

### 15.17 导出报告 Excel

**GET** `/api/reports/:id/export/excel`

需认证。导出报告为 Excel 文件。

---

## 十六、AI Agent 助手 `/api/agent`

> 所有接口需认证。支持 ReAct 多轮对话、工具调用、表单自动填充等。

### 16.1 Agent 对话

**POST** `/api/agent/chat`

需认证。与 AI Agent 进行对话，支持 SSE 流式响应。

#### 请求参数

| 字段           | 类型    | 必填 | 说明                                    |
| -------------- | ------- | ---- | --------------------------------------- |
| `message`      | string  | 是   | 用户消息                                |
| `sessionId`    | string  | 否   | 会话 ID（不传则创建新会话）             |
| `stream`       | boolean | 否   | 是否流式响应，默认 `true`               |
| `model`        | string  | 否   | AI 模型标识，默认 `deepseek`            |
| `modelVersion` | string  | 否   | 模型版本                                |

#### SSE 事件类型

| 事件类型         | 说明                           |
| ---------------- | ------------------------------ |
| `chunk`          | 流式文本片段                   |
| `tool_calls`     | 工具调用通知                   |
| `tool_result`    | 工具执行结果                   |
| `write_guidance` | 写操作引导（需跳转页面完成）   |
| `content_clear`  | 清除当前显示内容               |
| `done`           | 对话完成                       |
| `error`          | 错误信息                       |

### 16.2 提交表单

**POST** `/api/agent/submit-form`

需认证。提交 Agent 生成的待确认表单。

#### 请求参数

| 字段       | 类型   | 必填 | 说明         |
| ---------- | ------ | ---- | ------------ |
| `sessionId` | string | 是  | 会话 ID      |
| `formId`   | string | 是   | 表单 ID      |
| `formData` | object | 是   | 表单数据     |

### 16.3 获取待提交表单

**GET** `/api/agent/pending-form/:sessionId`

需认证。获取指定会话中待提交的表单。

### 16.4 获取会话列表

**GET** `/api/agent/sessions`

需认证。返回当前用户的所有 Agent 会话。

### 16.5 获取会话消息

**GET** `/api/agent/sessions/:sessionId`

需认证。返回指定会话的完整消息历史。

### 16.6 删除会话

**DELETE** `/api/agent/sessions/:sessionId`

需认证。删除指定会话及其待确认状态。

### 16.7 获取角色配置

**GET** `/api/agent/role-config`

需认证。返回当前用户的 Agent 角色配置。

#### 响应字段

| 字段               | 类型   | 说明                                    |
| ------------------ | ------ | --------------------------------------- |
| `agentName`        | string | Agent 名称，默认 `小听`                 |
| `userTitle`        | string | 用户称呼，默认 `老板`                   |
| `greeting`         | string | 问候语                                  |
| `toneStyle`        | string | 语气风格：`professional` / `casual` 等  |
| `customInstructions` | string | 自定义指令                            |

### 16.8 更新角色配置

**PUT** `/api/agent/role-config`

需认证。更新 Agent 角色配置。

#### 请求参数

| 字段               | 类型   | 必填 | 说明           |
| ------------------ | ------ | ---- | -------------- |
| `agent_name`       | string | 否   | Agent 名称     |
| `user_title`       | string | 否   | 用户称呼       |
| `greeting`         | string | 否   | 问候语         |
| `tone_style`       | string | 否   | 语气风格       |
| `custom_instructions` | string | 否 | 自定义指令   |

### 16.9 获取悬浮球配置

**GET** `/api/agent/float-config`

需认证。返回当前用户的悬浮球 Agent 配置。

#### 响应字段

| 字段              | 类型     | 说明                                      |
| ----------------- | -------- | ----------------------------------------- |
| `enabled`         | boolean  | 是否启用                                  |
| `model`           | string   | AI 模型标识                               |
| `modelName`       | string   | 模型名称                                  |
| `fallbackModel`   | string   | 备用模型                                  |
| `fallbackModelName` | string | 备用模型名称                            |
| `position`        | string   | 位置：`left` / `right`                    |
| `drawerWidth`     | number   | 抽屉宽度                                  |
| `themeColor`      | string   | 主题颜色                                  |
| `showPulse`       | boolean  | 是否显示脉冲动画                          |
| `enabledPages`    | string[] | 启用页面列表                              |
| `maxRounds`       | number   | 最大对话轮数                              |
| `fillStrategy`    | string   | 填充策略：`overwrite` / `merge`           |
| `contextMode`     | string   | 上下文模式：`page` / `global`             |

### 16.10 更新悬浮球配置

**PUT** `/api/agent/float-config`

需认证。**仅管理员**可修改悬浮球配置。

#### 请求参数

| 字段              | 类型     | 必填 | 说明               |
| ----------------- | -------- | ---- | ------------------ |
| `enabled`         | boolean  | 否   | 是否启用           |
| `model`           | string   | 否   | AI 模型标识        |
| `model_name`      | string   | 否   | 模型名称           |
| `fallback_model`  | string   | 否   | 备用模型           |
| `fallback_model_name` | string | 否 | 备用模型名称    |
| `position`        | string   | 否   | 位置               |
| `drawer_width`    | number   | 否   | 抽屉宽度           |
| `theme_color`     | string   | 否   | 主题颜色           |
| `show_pulse`      | boolean  | 否   | 脉冲动画           |
| `enabled_pages`   | string[] | 否   | 启用页面           |
| `max_rounds`      | number   | 否   | 最大对话轮数       |
| `fill_strategy`   | string   | 否   | 填充策略           |
| `context_mode`    | string   | 否   | 上下文模式         |

### 16.11 悬浮球表单解析

**POST** `/api/agent/parse-form`

需认证。悬浮球场景下的表单字段解析。

#### 请求参数

| 字段       | 类型   | 必填 | 说明                                            |
| ---------- | ------ | ---- | ----------------------------------------------- |
| `pageId`   | string | 是   | 页面标识，如 `formula-add` / `material-add` 等  |
| `utterance` | string | 是  | 用户自然语言描述                                |
| `context`  | array  | 否   | 对话上下文                                      |
| `sessionId` | string | 否  | 会话 ID                                         |

#### 响应字段

| 字段           | 类型     | 说明                   |
| -------------- | -------- | ---------------------- |
| `fields`       | object   | 解析出的字段键值对     |
| `missingFields` | string[] | 未提供的必填字段列表 |
| `message`      | string   | 解析说明               |
| `sessionId`    | string   | 会话 ID                |

### 16.12 悬浮球对话

**POST** `/api/agent/float-chat`

需认证。悬浮球场景下的多意图对话，支持 SSE 流式响应。

#### 请求参数

| 字段       | 类型   | 必填 | 说明           |
| ---------- | ------ | ---- | -------------- |
| `pageId`   | string | 是   | 页面标识       |
| `utterance` | string | 是  | 用户消息       |
| `context`  | array  | 否   | 对话上下文     |
| `sessionId` | string | 否  | 会话 ID        |

> 自动识别意图：`fill`（填表）/ `consult`（咨询）/ `calculate`（计算）/ `compare`（对比）/ `substitute`（替代）/ `quotation`（报价）/ `generate`（生成）。

### 16.13 智能生成描述

**POST** `/api/agent/generate-description`

需认证。使用 AI 生成配方描述或制法。

#### 请求参数

| 字段                | 类型   | 必填 | 说明                                         |
| ------------------- | ------ | ---- | -------------------------------------------- |
| `formulaName`       | string | 是   | 配方名称                                     |
| `materials`         | array  | 否   | 原料列表 `[{name, quantity}]`                |
| `finishedWeight`    | number | 否   | 成品重量                                     |
| `type`              | string | 否   | 生成类型：`description` / `preparation` / `version_reason` |
| `revisionReason`    | string | 否   | 升版原因                                     |
| `existingDescription` | string | 否 | 现有描述（升版时使用）                      |

#### 响应字段

| 字段      | 类型   | 说明         |
| --------- | ------ | ------------ |
| `content` | string | 生成的文本   |
| `type`    | string | 生成类型     |

### 16.14 获取字段提示

**GET** `/api/agent/field-hints`

需认证。返回指定页面的必填字段提示。

#### 请求参数

| 参数     | 类型   | 必填 | 说明           |
| -------- | ------ | ---- | -------------- |
| `pageId` | string | 是   | 页面标识       |

#### 响应字段

| 字段           | 类型    | 说明             |
| -------------- | ------- | ---------------- |
| `missingFields` | string[] | 必填字段列表  |
| `hints`        | array   | 字段提示列表     |
| `count`        | number  | 必填字段数量     |

### 16.15 获取 Agent 健康状态

**GET** `/api/agent/health`

需认证。返回 AI Agent 服务健康状态。

#### 响应字段

| 字段     | 类型   | 说明                                    |
| -------- | ------ | --------------------------------------- |
| `status` | string | 状态：`online` / `loading` / `error`    |

---

## 十七、解析模板 `/api/parse-templates`

> 所有接口需认证。按创建人过滤，预设模板不可删除。

### 17.1 获取解析模板列表

**GET** `/api/parse-templates`

需认证。分页查询解析模板。

#### 请求参数

| 参数       | 类型   | 说明         |
| ---------- | ------ | ------------ |
| `keyword`  | string | 搜索模板名称 |
| `category` | string | 按分类筛选   |
| `page`     | number | 页码         |
| `pageSize` | number | 每页数量     |

#### 响应字段

| 字段              | 类型    | 说明                                |
| ----------------- | ------- | ----------------------------------- |
| `id`              | string  | 模板 ID                             |
| `name`            | string  | 模板名称                            |
| `category`        | string  | 分类，默认 `nutrition`              |
| `defaultProvider` | string  | 默认 AI 提供者                      |
| `defaultModel`    | string  | 默认模型                            |
| `customPrompt`    | string  | 自定义提示词                        |
| `fieldMapping`    | object  | 字段映射（解析自 JSON）             |
| `validationRules` | object  | 验证规则（解析自 JSON）             |
| `isPreset`        | number  | 是否为系统预设（1/0）               |
| `isActive`        | number  | 是否启用（1/0）                     |
| `createdBy`       | string  | 创建人                              |
| `createdAt`       | string  | 创建时间                            |
| `updatedAt`       | string  | 更新时间                            |

### 17.2 获取解析模板详情

**GET** `/api/parse-templates/:id`

需认证。

### 17.3 创建解析模板

**POST** `/api/parse-templates`

需认证。创建自定义解析模板。

#### 请求参数

| 字段              | 类型   | 必填 | 说明                |
| ----------------- | ------ | ---- | ------------------- |
| `name`            | string | 是   | 模板名称            |
| `category`        | string | 否   | 分类，默认 `nutrition` |
| `defaultProvider` | string | 否   | 默认 AI 提供者      |
| `defaultModel`    | string | 否   | 默认模型            |
| `customPrompt`    | string | 否   | 自定义提示词        |
| `fieldMapping`    | object | 否   | 字段映射            |
| `validationRules` | object | 否   | 验证规则            |

> 模板名称不可重复（同一用户下）。

### 17.4 更新解析模板

**PUT** `/api/parse-templates/:id`

需认证。参数同创建，所有字段均为可选。

### 17.5 删除解析模板

**DELETE** `/api/parse-templates/:id`

需认证。系统预设模板不可删除。

---

## 十八、含量比阈值 `/api/ratio-thresholds`

> 所有接口需认证。管理系统含量比校验的阈值配置。

### 18.1 获取阈值配置

**GET** `/api/ratio-thresholds`

需认证。返回当前含量比阈值配置。

#### 响应字段

| 字段              | 类型   | 说明                 |
| ----------------- | ------ | -------------------- |
| `normalLow`       | number | 正常范围下限，默认 0.98  |
| `normalHigh`      | number | 正常范围上限，默认 1.02  |
| `warningLow`      | number | 预警范围下限，默认 0.95  |
| `warningHigh`     | number | 预警范围上限，默认 1.05  |
| `highWarningLow`  | number | 高级预警下限，默认 0.92  |
| `highWarningHigh` | number | 高级预警上限，默认 1.08  |
| `updatedAt`       | string | 最后更新时间         |
| `updatedBy`       | string | 最后更新人           |

### 18.2 更新阈值配置

**PUT** `/api/ratio-thresholds`

需认证。**仅管理员**可修改阈值配置。

#### 请求参数

| 字段              | 类型   | 必填 | 说明                   |
| ----------------- | ------ | ---- | ---------------------- |
| `normalLow`       | number | 是   | 正常范围下限           |
| `normalHigh`      | number | 是   | 正常范围上限           |
| `warningLow`      | number | 是   | 预警范围下限           |
| `warningHigh`     | number | 是   | 预警范围上限           |
| `highWarningLow`  | number | 是   | 高级预警下限           |
| `highWarningHigh` | number | 是   | 高级预警上限           |

> 校验规则：`highWarningLow < warningLow < normalLow < normalHigh < warningHigh < highWarningHigh`，且高级预警上限不超过 2.0。

---

## 十九、配方模板 `/api/formula-templates`

> 所有接口需认证。admin 可见全部模板，formulist 仅可见自己创建的。

### 19.1 获取配方模板列表

**GET** `/api/formula-templates`

需认证。分页查询配方模板。

#### 请求参数

| 参数       | 类型   | 说明         |
| ---------- | ------ | ------------ |
| `keyword`  | string | 搜索模板名称 |
| `page`     | number | 页码         |
| `pageSize` | number | 每页数量     |

#### 响应字段

| 字段                    | 类型   | 说明                    |
| ----------------------- | ------ | ----------------------- |
| `id`                    | string | 模板 ID                 |
| `name`                  | string | 模板名称                |
| `description`           | string | 描述                    |
| `ratioFactor`           | number | 主料含量比系数          |
| `supplementRatioFactor` | number | 辅料含量比系数          |
| `finishedWeight`        | number | 成品重量                |
| `materialsJson`         | string | 原料列表 JSON           |
| `packagingPrice`        | number | 包装价格（元）          |
| `otherPrice`            | number | 其他价格（元）          |
| `profitMargin`          | number | 利润率（%）             |
| `createdBy`             | string | 创建人                  |
| `createdAt`             | string | 创建时间                |
| `updatedAt`             | string | 更新时间                |

### 19.2 获取配方模板详情

**GET** `/api/formula-templates/:id`

需认证。

### 19.3 创建配方模板

**POST** `/api/formula-templates`

需认证。创建配方模板。

#### 请求参数

| 字段                    | 类型   | 必填 | 说明                        |
| ----------------------- | ------ | ---- | --------------------------- |
| `name`                  | string | 是   | 模板名称                    |
| `ratioFactor`           | number | 是   | 主料含量比系数（0.15-0.25） |
| `supplementRatioFactor` | number | 是   | 辅料含量比系数（0.5-1.5）   |
| `finishedWeight`        | number | 是   | 成品重量（>0）              |
| `materials`             | array  | 是   | 原料列表（至少1项）         |
| `packagingPrice`        | number | 否   | 包装价格（元）              |
| `otherPrice`            | number | 否   | 其他价格（元）              |
| `profitMargin`          | number | 否   | 利润率（%），默认 20        |
| `description`           | string | 否   | 描述                        |

> 同一用户下模板名称不可重复。

### 19.4 更新配方模板

**PUT** `/api/formula-templates/:id`

需认证。参数同创建，所有字段均为可选。formulist 仅可修改自己创建的模板。

### 19.5 删除配方模板

**DELETE** `/api/formula-templates/:id`

需认证。formulist 仅可删除自己创建的模板。

---

## 二十、枚举管理 `/api/enums`

> 所有接口需认证。增删改操作仅管理员可执行。

### 20.1 获取全部枚举

**GET** `/api/enums`

需认证。返回系统中所有枚举分类及其选项。

### 20.2 获取指定分类枚举

**GET** `/api/enums/:category`

需认证。返回指定分类的枚举选项列表。

#### 请求参数

| 参数         | 类型    | 说明                           |
| ------------ | ------- | ------------------------------ |
| `activeOnly` | string  | 是否仅返回启用项：`true` / `false` |

#### 响应字段

| 字段       | 类型    | 说明               |
| ---------- | ------- | ------------------ |
| `id`       | string  | 枚举选项 ID        |
| `category` | string  | 分类               |
| `label`    | string  | 显示文本           |
| `value`    | string  | 存储值             |
| `isActive` | boolean | 是否启用           |
| `sortOrder` | number | 排序序号          |

### 20.3 创建枚举选项

**POST** `/api/enums`

需认证。**仅管理员**可创建。

#### 请求参数

| 字段       | 类型   | 必填 | 约束       | 说明     |
| ---------- | ------ | ---- | ---------- | -------- |
| `category` | string | 是   | -          | 枚举分类 |
| `label`    | string | 是   | 1-20 字符  | 显示文本 |
| `value`    | string | 是   | 1-20 字符  | 存储值   |

> 同一分类下 label 或 value 不可重复。

### 20.4 更新枚举选项

**PUT** `/api/enums/:id`

需认证。**仅管理员**可更新。

### 20.5 删除枚举选项

**DELETE** `/api/enums/:id`

需认证。**仅管理员**可删除。

### 20.6 获取互斥规则列表

**GET** `/api/enums/exclusions`

需认证。返回所有枚举互斥规则。

#### 响应字段

| 字段       | 类型   | 说明                                  |
| ---------- | ------ | ------------------------------------- |
| `id`       | string | 规则 ID                               |
| `category` | string | 分类：`appearance` / `taste`          |
| `valueA`   | string | 选项 A                                |
| `valueB`   | string | 选项 B                                |
| `createdAt` | string | 创建时间                             |

### 20.7 创建互斥规则

**POST** `/api/enums/exclusions`

需认证。**仅管理员**可创建。

#### 请求参数

| 字段       | 类型   | 必填 | 约束                       | 说明     |
| ---------- | ------ | ---- | -------------------------- | -------- |
| `category` | string | 是   | `appearance` 或 `taste`    | 分类     |
| `valueA`   | string | 是   | -                          | 选项 A   |
| `valueB`   | string | 是   | -                          | 选项 B   |

> 同一分类下 valueA 和 valueB 的组合不可重复。

### 20.8 删除互斥规则

**DELETE** `/api/enums/exclusions/:id`

需认证。**仅管理员**可删除。

---

## 二十一、AI 解析结果 `/api/ai/parse-results`

> 所有接口需认证。管理 AI 解析历史记录，支持查询、关联、清理和监控。

### 21.1 获取解析结果列表

**GET** `/api/ai/parse-results`

需认证。分页查询当前用户的解析结果。

#### 请求参数

| 参数           | 类型   | 说明                                                    |
| -------------- | ------ | ------------------------------------------------------- |
| `callType`     | string | 解析类型：`parse_formula` / `parse_nutrition`           |
| `status`       | string | 状态：`success` / `failed` / `pending`                  |
| `fileName`     | string | 搜索文件名                                              |
| `startDate`    | string | 起始日期                                                |
| `endDate`      | string | 结束日期                                                |
| `keyword`      | string | 搜索文件名或解析内容                                    |
| `modelProvider` | string | 按模型提供者筛选                                       |
| `modelName`    | string | 按模型名称筛选                                          |
| `isLinked`     | string | 关联状态：`true` / `false`                              |
| `sortBy`       | string | 排序字段：`created_at` / `updated_at` / `file_name` / `file_size` / `used_count`，默认 `created_at` |
| `sortOrder`    | string | 排序方向：`asc` / `desc`，默认 `desc`                   |
| `page`         | number | 页码                                                    |
| `pageSize`     | number | 每页数量                                                |

#### 响应字段

| 字段             | 类型    | 说明                                       |
| ---------------- | ------- | ------------------------------------------ |
| `id`             | string  | 解析结果 ID                                |
| `callType`       | string  | 解析类型                                   |
| `callTypeLabel`  | string  | 解析类型标签：`智能填单` / `智能导入`      |
| `fileName`       | string  | 文件名                                     |
| `fileHash`       | string  | 文件哈希                                   |
| `fileSize`       | number  | 文件大小                                   |
| `status`         | string  | 状态                                       |
| `modelProvider`  | string  | 模型提供者                                 |
| `modelName`      | string  | 模型名称                                   |
| `usedCount`      | number  | 使用次数                                   |
| `isLinked`       | boolean | 是否已关联                                 |
| `linkedFormulaId` | string | 关联配方 ID                               |
| `linkedMaterialId` | string | 关联原料 ID                              |
| `createdAt`      | string  | 创建时间                                   |
| `expiresAt`      | string  | 过期时间                                   |

### 21.2 获取解析结果详情

**GET** `/api/ai/parse-results/:id`

需认证。返回解析结果完整数据。

#### 响应字段

| 字段             | 类型    | 说明               |
| ---------------- | ------- | ------------------ |
| `id`             | string  | 解析结果 ID        |
| `callType`       | string  | 解析类型           |
| `callTypeLabel`  | string  | 解析类型标签       |
| `fileName`       | string  | 文件名             |
| `fileHash`       | string  | 文件哈希           |
| `fileSize`       | number  | 文件大小           |
| `parsedResult`   | object  | 解析结果（JSON）   |
| `rawResponse`    | string  | AI 原始响应        |
| `status`         | string  | 状态               |
| `errorMessage`   | string  | 错误信息           |
| `modelProvider`  | string  | 模型提供者         |
| `modelName`      | string  | 模型名称           |
| `usedCount`      | number  | 使用次数           |
| `isLinked`       | boolean | 是否已关联         |
| `linkedFormulaId` | string | 关联配方 ID       |
| `linkedMaterialId` | string | 关联原料 ID     |
| `createdAt`      | string  | 创建时间           |
| `updatedAt`      | string  | 更新时间           |

### 21.3 保存解析结果

**POST** `/api/ai/parse-results`

需认证。保存一条解析结果记录。

#### 请求参数

| 字段            | 类型   | 必填 | 说明                                    |
| --------------- | ------ | ---- | --------------------------------------- |
| `callType`      | string | 是   | 解析类型：`parse_formula` / `parse_nutrition` |
| `fileHash`      | string | 是   | 文件哈希                                |
| `fileName`      | string | 是   | 文件名                                  |
| `fileSize`      | number | 是   | 文件大小                                |
| `parsedResult`  | object | 是   | 解析结果                                |
| `rawResponse`   | string | 是   | AI 原始响应                             |
| `modelProvider` | string | 否   | 模型提供者                              |
| `modelName`     | string | 否   | 模型名称                                |
| `status`        | string | 否   | 状态，默认 `success`                    |
| `errorMessage`  | string | 否   | 错误信息                                |

> 存储空间不足时返回 507 错误。

### 21.4 删除解析结果

**DELETE** `/api/ai/parse-results/:id`

需认证。删除指定解析结果。普通用户仅可删除自己的记录，管理员可删除任意记录。

### 21.5 获取解析结果统计

**GET** `/api/ai/parse-results/statistics`

需认证。返回当前用户的解析结果统计。

#### 响应字段

| 字段                 | 类型      | 说明                     |
| -------------------- | --------- | ------------------------ |
| `totalCount`         | number    | 总记录数                 |
| `storageLimit`       | number    | 存储上限                 |
| `usagePercent`       | number    | 使用率百分比             |
| `cleanupThreshold`   | number    | 自动清理阈值百分比       |
| `cleanupBatchPercent` | number   | 清理批次百分比           |
| `statsByType`        | object    | 按类型统计               |
| `statsByStatus`      | object    | 按状态统计               |

### 21.6 检查解析结果是否存在

**POST** `/api/ai/parse-results/check`

需认证。检查指定文件是否已有解析结果。

#### 请求参数

| 字段       | 类型   | 必填 | 说明         |
| ---------- | ------ | ---- | ------------ |
| `fileHash` | string | 是   | 文件哈希     |
| `callType` | string | 是   | 解析类型     |

#### 响应字段

| 字段            | 类型    | 说明               |
| --------------- | ------- | ------------------ |
| `exists`        | boolean | 是否存在           |
| `parseResultId` | string  | 已有记录 ID        |
| `status`        | string  | 已有记录状态       |

### 21.7 标记解析结果已使用

**POST** `/api/ai/parse-results/:id/mark-used`

需认证。标记解析结果为已使用，并关联配方或原料。

#### 请求参数

| 字段             | 类型    | 必填 | 说明               |
| ---------------- | ------- | ---- | ------------------ |
| `linkedFormulaId` | string | 否  | 关联配方 ID        |
| `linkedMaterialId` | string | 否 | 关联原料 ID       |
| `incrementCount` | boolean | 否  | 是否增加使用计数   |

### 21.8 获取解析结果配置

**GET** `/api/ai/parse-results/config`

需认证。返回解析结果系统配置。

#### 响应字段

| 字段                      | 类型   | 说明                  |
| ------------------------- | ------ | --------------------- |
| `storage_limit`           | object | 存储上限配置          |
| `cleanup_threshold_percent` | object | 清理阈值配置       |
| `cleanup_batch_percent`   | object | 清理批次配置          |
| `max_file_size_bytes`     | object | 文件大小限制配置      |
| `file_retention_days`     | object | 文件保留天数配置      |
| `file_storage_limit_bytes` | object | 文件存储上限配置   |
| `file_storage_alert_percent` | object | 磁盘告警阈值配置  |

### 21.9 更新解析结果配置

**PUT** `/api/ai/parse-results/config`

需认证。**仅管理员**可修改配置。

#### 请求参数

| 字段                      | 类型   | 必填 | 说明                      |
| ------------------------- | ------ | ---- | ------------------------- |
| `storageLimit`            | number | 否   | 存储上限（1000-100000）   |
| `cleanupThresholdPercent` | number | 否   | 清理阈值（50%-99%）       |
| `cleanupBatchPercent`     | number | 否   | 清理比例（1%-20%）        |
| `maxFileSizeBytes`        | number | 否   | 文件大小限制（1MB-50MB）  |
| `fileRetentionDays`       | number | 否   | 文件保留天数（7-365）     |
| `fileStorageLimitBytes`   | number | 否   | 文件存储上限（1GB-100GB） |
| `fileStorageAlertPercent` | number | 否   | 磁盘告警阈值（50%-99%）   |

### 21.10 清理解析结果

**POST** `/api/ai/parse-results/cleanup`

需认证。**仅管理员**可执行清理。

#### 请求参数

| 字段         | 类型    | 必填 | 说明                       |
| ------------ | ------- | ---- | -------------------------- |
| `beforeDate` | string  | 否   | 清理此日期之前的记录       |
| `status`     | string  | 否   | 按状态筛选                 |
| `dryRun`     | boolean | 否   | 预览模式，不实际删除       |

#### 响应字段

| 字段           | 类型   | 说明                 |
| -------------- | ------ | -------------------- |
| `deletedCount` | number | 删除数量             |
| `freedSpace`   | number | 释放空间（估算）     |

### 21.11 手动触发清理

**POST** `/api/ai/parse-results/manual-cleanup`

需认证。**仅管理员**可执行。

#### 请求参数

| 字段     | 类型    | 必填 | 说明                 |
| -------- | ------- | ---- | -------------------- |
| `dryRun` | boolean | 否   | 预览模式             |

#### 响应字段

| 字段              | 类型   | 说明               |
| ----------------- | ------ | ------------------ |
| `deletedCount`    | number | 删除数量           |
| `triggerReason`   | string | 触发原因           |
| `degradationLevel` | string | 降级等级         |

### 21.12 获取降级状态

**GET** `/api/ai/parse-results/degradation`

需认证。返回解析结果存储降级状态信息。

#### 响应字段

| 字段                    | 类型   | 说明               |
| ----------------------- | ------ | ------------------ |
| `level`                 | string | 降级等级           |
| `reason`                | string | 降级原因           |
| `recommendations`       | array  | 建议               |
| `systemStatus`          | object | 系统状态           |
| `lastCleanup`           | object | 上次清理结果       |

### 21.13 获取关联配方

**GET** `/api/ai/parse-results/:id/linked-formula`

需认证。返回解析结果关联的配方信息。

#### 响应字段

| 字段      | 类型    | 说明                     |
| --------- | ------- | ------------------------ |
| `linked`  | boolean | 是否已关联               |
| `type`    | string  | 关联类型：`formula`      |
| `data`    | object  | 配方数据（未关联时为 null） |

### 21.14 获取关联原料

**GET** `/api/ai/parse-results/:id/linked-material`

需认证。返回解析结果关联的原料信息。

#### 响应字段

| 字段      | 类型    | 说明                     |
| --------- | ------- | ------------------------ |
| `linked`  | boolean | 是否已关联               |
| `type`    | string  | 关联类型：`material`     |
| `data`    | object  | 原料数据（未关联时为 null） |

### 21.15 获取配方的解析结果

**GET** `/api/ai/formulas/:formulaId/parse-results`

需认证。返回关联到指定配方的所有解析结果。

### 21.16 获取原料的解析结果

**GET** `/api/ai/materials/:materialId/parse-results`

需认证。返回关联到指定原料的所有解析结果。

### 21.17 获取监控指标

**GET** `/api/ai/parse-results/metrics`

需认证。返回解析结果监控指标数据。

#### 请求参数

| 参数        | 类型   | 说明     |
| ----------- | ------ | -------- |
| `startDate` | string | 起始日期 |
| `endDate`   | string | 结束日期 |

### 21.18 获取告警列表

**GET** `/api/ai/parse-results/alerts`

需认证。**仅管理员**可查看。返回解析结果告警信息。

### 21.19 获取性能统计

**GET** `/api/ai/parse-results/performance`

需认证。返回解析结果性能统计数据。

---

## 二十二、原料审核与版本 `/api/materials` 扩展端点

> 以下端点为原料管理模块的扩展接口，所有接口需认证。

### 22.1 获取原料版本历史

**GET** `/api/materials/:id/versions`

需认证。返回指定原料的版本历史列表。

#### 响应字段

| 字段       | 类型   | 说明               |
| ---------- | ------ | ------------------ |
| `id`       | string | 版本记录 ID        |
| `version`  | number | 版本号             |
| `isLatest` | number | 是否为最新版本（1/0） |
| `status`   | string | 状态               |
| `name`     | string | 原料名称           |
| `code`     | string | 原料编码           |
| `createdBy` | string | 创建人           |
| `createdAt` | string | 创建时间         |

### 22.2 获取原料版本详情

**GET** `/api/materials/:id/versions/:versionId`

需认证。返回指定版本的原料详情。

### 22.3 获取原料引用信息

**GET** `/api/materials/:id/references`

需认证。返回原料被配方引用的情况。

#### 响应字段

| 字段              | 类型   | 说明               |
| ----------------- | ------ | ------------------ |
| `materialId`      | string | 原料 ID            |
| `currentVersion`  | number | 当前版本号         |
| `referenceCount`  | number | 引用数量           |
| `referencedFormulas` | array | 引用该原料的配方列表 |

`referencedFormulas` 元素结构：

| 字段          | 类型   | 说明     |
| ------------- | ------ | -------- |
| `formulaId`   | string | 配方 ID  |
| `formulaName` | string | 配方名称 |

### 22.4 版本对比

**GET** `/api/materials/:id/versions/compare`

需认证。对比两个版本的原料数据差异。

#### 请求参数

| 参数 | 类型   | 必填 | 说明        |
| ---- | ------ | ---- | ----------- |
| `v1` | string | 是   | 版本1 ID    |
| `v2` | string | 是   | 版本2 ID    |

### 22.5 提交原料审批

**POST** `/api/materials/:id/submit-review`

需认证。将草稿状态的原料提交审批。

> 仅创建者或管理员可提交。原料状态须为 `draft`。

#### 状态流转

`draft` → `pending_review`

### 22.6 审批通过

**PUT** `/api/materials/:id/approve`

需认证。**仅管理员**可审批通过。

> 原料状态须为 `pending_review`。

#### 状态流转

`pending_review` → `published`

### 22.7 驳回原料

**PUT** `/api/materials/:id/reject`

需认证。**仅管理员**可驳回。

#### 请求参数

| 字段      | 类型   | 必填 | 说明               |
| --------- | ------ | ---- | ------------------ |
| `comment` | string | 是   | 驳回原因（至少5字符） |

#### 状态流转

`pending_review` → `draft`

### 22.8 直接发布原料

**PUT** `/api/materials/:id/publish`

需认证。**仅管理员**可直接发布。

> 原料状态须为 `draft` 或 `pending_review`。

#### 状态流转

`draft` / `pending_review` → `published`

### 22.9 获取待审批列表

**GET** `/api/materials/pending-review`

需认证。**仅管理员**可查看。返回待审批的原料列表。

#### 请求参数

| 参数       | 类型   | 说明         |
| ---------- | ------ | ------------ |
| `keyword`  | string | 搜索原料名称 |
| `page`     | number | 页码         |
| `pageSize` | number | 每页数量     |

### 22.10 获取审批日志

**GET** `/api/materials/:id/review-logs`

需认证。返回指定原料的审批操作日志。

#### 响应字段

| 字段        | 类型   | 说明                                                    |
| ----------- | ------ | ------------------------------------------------------- |
| `id`        | string | 日志 ID                                                 |
| `materialId` | string | 原料 ID                                               |
| `reviewerId` | string | 审批人 ID                                              |
| `action`    | string | 操作：`submit` / `approve` / `reject` / `publish`       |
| `comment`   | string | 审批意见                                                |
| `createdAt` | string | 操作时间                                                |

---

## 二十三、快速配方 `/api/quick-formulas`

所有接口需认证。admin 可见全部数据，formulist 仅见自己创建的数据。

### 23.1 获取快速配方列表

**GET** `/api/quick-formulas`

需认证。返回分页列表，admin 可见全部，formulist 仅见自己创建的。

#### 请求参数（Query）

| 参数       | 类型   | 必填 | 说明         |
| ---------- | ------ | ---- | ------------ |
| `keyword`  | string | 否   | 搜索配方名称 |
| `page`     | number | 否   | 页码（默认 1）|
| `pageSize` | number | 否   | 每页数量（默认 20）|

#### 响应字段

| 字段                       | 类型   | 说明                        |
| -------------------------- | ------ | --------------------------- |
| `id`                       | string | 快速配方 ID                 |
| `name`                     | string | 配方名称                    |
| `status`                   | string | 状态：`draft` / `published` |
| `ratioFactor`              | number | 主料含量比系数（0.15-0.25） |
| `supplementRatioFactor`    | number | 辅料含量比系数（0.5-1.5）   |
| `finishedWeight`           | number | 成品重量                    |
| `materials`                | array  | 原料列表（JSON 解析后）     |
| `packagingPrice`           | number | 包装价格（元）              |
| `otherPrice`               | number | 其他价格（元）              |
| `profitMargin`             | number | 利润率（%）                 |
| `description`              | string | 描述                        |
| `preparationMethod`        | string | 制法                        |
| `salesmanId`               | string | 业务员 ID                   |
| `salesmanName`             | string | 业务员名称                  |
| `createdBy`                | string | 创建人 ID                   |
| `createdAt`                | string | 创建时间                    |
| `updatedAt`                | string | 更新时间                    |

### 23.2 获取快速配方详情

**GET** `/api/quick-formulas/:id`

需认证。formulist 只能查看自己创建的快速配方。

#### 路径参数

| 参数 | 类型   | 说明         |
| ---- | ------ | ------------ |
| `id` | string | 快速配方 ID  |

#### 错误码

| HTTP 状态码 | 错误码         | 说明             |
| ----------- | -------------- | ---------------- |
| 404         | `NOT_FOUND`    | 快速配方不存在   |
| 403         | `FORBIDDEN`    | 无权查看该配方   |

### 23.3 创建快速配方

**POST** `/api/quick-formulas`

需认证。创建草稿状态的快速配方，默认值：ratioFactor=0.18, supplementRatioFactor=1.0, profitMargin=20。

#### 请求体

| 字段   | 类型   | 必填 | 约束               | 说明         |
| ------ | ------ | ---- | ------------------ | ------------ |
| `name` | string | 是   | 1-100 字符         | 配方名称     |

#### 响应

返回创建的快速配方对象（含默认值），HTTP 状态码 201。

#### 错误码

| HTTP 状态码 | 错误码            | 说明                 |
| ----------- | ----------------- | -------------------- |
| 409         | `DUPLICATE_ENTRY` | 配方名称已存在        |

### 23.4 更新快速配方

**PUT** `/api/quick-formulas/:id`

需认证。仅 `draft` 状态可更新。formulist 只能修改自己创建的快速配方。

#### 路径参数

| 参数 | 类型   | 说明         |
| ---- | ------ | ------------ |
| `id` | string | 快速配方 ID  |

#### 请求体

| 字段                    | 类型   | 必填 | 约束               | 说明                    |
| ----------------------- | ------ | ---- | ------------------ | ----------------------- |
| `name`                  | string | 否   | 1-100 字符         | 配方名称                |
| `ratioFactor`           | number | 否   | 0.15-0.25          | 主料含量比系数          |
| `supplementRatioFactor` | number | 否   | 0.5-1.5            | 辅料含量比系数          |
| `finishedWeight`        | number | 否   | —                  | 成品重量                |
| `materials`             | array  | 否   | 至少 1 种原料       | 原料列表                |
| `packagingPrice`        | number | 否   | —                  | 包装价格（元）          |
| `otherPrice`            | number | 否   | —                  | 其他价格（元）          |
| `profitMargin`          | number | 否   | —                  | 利润率（%）             |
| `description`           | string | 否   | —                  | 描述                    |
| `preparationMethod`     | string | 否   | —                  | 制法                    |
| `salesmanId`            | string | 否   | —                  | 业务员 ID               |
| `salesmanName`          | string | 否   | —                  | 业务员名称              |

#### 错误码

| HTTP 状态码 | 错误码            | 说明                     |
| ----------- | ----------------- | ------------------------ |
| 404         | `NOT_FOUND`       | 快速配方不存在            |
| 403         | `FORBIDDEN`       | 无权修改该配方            |
| 400         | `VALIDATION_ERROR`| 非草稿状态不可修改        |
| 409         | `DUPLICATE_ENTRY` | 修改后名称重复            |

### 23.5 删除快速配方

**DELETE** `/api/quick-formulas/:id`

需认证。formulist 只能删除自己创建的快速配方。

#### 路径参数

| 参数 | 类型   | 说明         |
| ---- | ------ | ------------ |
| `id` | string | 快速配方 ID  |

#### 错误码

| HTTP 状态码 | 错误码      | 说明             |
| ----------- | ----------- | ---------------- |
| 404         | `NOT_FOUND` | 快速配方不存在   |
| 403         | `FORBIDDEN` | 无权删除该配方   |

### 23.6 发布快速配方为正式配方

**POST** `/api/quick-formulas/:id/publish`

需认证。将草稿快速配方发布为正式配方，自动生成配方编码和版本记录。formulist 只能发布自己创建的快速配方。

#### 路径参数

| 参数 | 类型   | 说明         |
| ---- | ------ | ------------ |
| `id` | string | 快速配方 ID  |

#### 请求体

| 字段               | 类型   | 必填 | 说明     |
| ------------------ | ------ | ---- | -------- |
| `salesmanId`       | string | 是   | 业务员 ID|
| `description`      | string | 是   | 配方描述 |
| `preparationMethod`| string | 否   | 制法     |

#### 响应

```json
{
  "success": true,
  "message": "快速配方发布成功",
  "data": {
    "formulaId": "uuid",
    "versionId": "uuid",
    "quickFormulaStatus": "published"
  }
}
```

#### 发布流程

1. 校验快速配方存在且为 `draft` 状态
2. 校验 salesmanId 在 salesmen 表中存在
3. 合并快速配方数据与发布参数
4. 生成配方编码（`generateFormulaCode`）
5. INSERT INTO `formulas` — 创建正式配方
6. INSERT INTO `formula_versions` — 创建初始版本（admin 直接 published，formulist 为 draft）
7. UPDATE `quick_formulas` SET status = 'published'
8. 返回 formulaId、versionId、quickFormulaStatus

#### 错误码

| HTTP 状态码 | 错误码            | 说明                     |
| ----------- | ----------------- | ------------------------ |
| 404         | `NOT_FOUND`       | 快速配方不存在            |
| 403         | `FORBIDDEN`       | 无权发布该配方            |
| 400         | `VALIDATION_ERROR`| 非草稿状态不可发布        |

---

## 二十四、角色管理 `/api/roles`

> 所有接口需认证。角色增删改需要 `permission:write` 权限。

### 24.1 获取角色列表

**GET** `/api/roles`

需认证。返回所有角色列表。

#### 响应字段

| 字段          | 类型    | 说明                    |
| ------------- | ------- | ----------------------- |
| `id`          | string  | 角色 ID                 |
| `name`        | string  | 角色名称                |
| `roleKey`     | string  | 角色标识                |
| `description` | string  | 描述                    |
| `isSystem`    | number  | 是否为系统角色（1/0）   |
| `createdAt`   | string  | 创建时间                |
| `updatedAt`   | string  | 更新时间                |

### 24.2 获取角色详情

**GET** `/api/roles/:id`

需认证。

### 24.3 创建角色

**POST** `/api/roles`

需认证。需要 `permission:write` 权限。

#### 请求参数

| 字段          | 类型   | 必填 | 说明         |
| ------------- | ------ | ---- | ------------ |
| `name`        | string | 是   | 角色名称     |
| `roleKey`     | string | 是   | 角色标识     |
| `description` | string | 否   | 描述         |

### 24.4 更新角色

**PUT** `/api/roles/:id`

需认证。需要 `permission:write` 权限。

#### 请求参数

| 字段          | 类型   | 必填 | 说明         |
| ------------- | ------ | ---- | ------------ |
| `name`        | string | 是   | 角色名称     |

### 24.5 删除角色

**DELETE** `/api/roles/:id`

需认证。需要 `permission:write` 权限。

### 24.6 获取角色权限

**GET** `/api/roles/:id/permissions`

需认证。返回指定角色的权限列表。

### 24.7 更新角色权限

**PUT** `/api/roles/:id/permissions`

需认证。需要 `permission:write` 权限。

#### 请求参数

| 字段            | 类型     | 必填 | 说明         |
| --------------- | -------- | ---- | ------------ |
| `permissionIds` | string[] | 是   | 权限 ID 列表 |

---

## 二十五、权限管理 `/api/permissions`

> 所有接口需认证。

### 25.1 获取权限列表

**GET** `/api/permissions`

需认证。返回所有权限列表。

#### 响应字段

| 字段            | 类型   | 说明           |
| --------------- | ------ | -------------- |
| `id`            | string | 权限 ID        |
| `module`        | string | 所属模块       |
| `action`        | string | 操作类型       |
| `permissionKey` | string | 权限标识       |
| `label`         | string | 显示名称       |
| `description`   | string | 描述           |
| `sortOrder`     | number | 排序序号       |

---

## 二十六、用户管理 `/api/users`

> 所有接口需认证。需要 `user:read` 或 `user:write` 权限。

### 26.1 获取用户列表

**GET** `/api/users`

需认证。需要 `user:read` 权限。

#### 响应字段

| 字段         | 类型   | 说明         |
| ------------ | ------ | ------------ |
| `id`         | string | 用户 ID      |
| `username`   | string | 用户名       |
| `role`       | string | 角色         |
| `displayName` | string | 昵称        |
| `email`      | string | 邮箱         |
| `phone`      | string | 手机号       |
| `createdAt`  | string | 创建时间     |

### 26.2 更新用户角色

**PUT** `/api/users/:id/role`

需认证。需要 `user:write` 权限。

#### 请求参数

| 字段     | 类型   | 必填 | 说明     |
| -------- | ------ | ---- | -------- |
| `roleId` | string | 是   | 角色 ID  |

### 26.3 更新用户状态

**PUT** `/api/users/:id/status`

需认证。需要 `user:write` 权限。

#### 请求参数

| 字段       | 类型   | 必填 | 说明             |
| ---------- | ------ | ---- | ---------------- |
| `isActive` | number | 是   | 状态值（1/0）    |

---

## 二十七、数据库管理 `/api/db`

> 所有接口需认证。**仅管理员**可访问。

### 27.1 获取数据库信息

**GET** `/api/db/info`

需认证。返回数据库基本信息。

#### 响应字段

| 字段       | 类型   | 说明           |
| ---------- | ------ | -------------- |
| `dbType`   | string | 数据库类型     |
| `dbSize`   | string | 数据库大小     |
| `tableCount` | number | 表数量       |

### 27.2 获取数据表列表

**GET** `/api/db/tables`

需认证。返回所有数据表概要信息。

#### 响应字段

| 字段        | 类型   | 说明       |
| ----------- | ------ | ---------- |
| `name`      | string | 表名       |
| `rowCount`  | number | 行数       |
| `colCount`  | number | 列数       |

### 27.3 获取表结构

**GET** `/api/db/tables/:tableName/schema`

需认证。返回指定表的列定义。

### 27.4 获取表数据

**GET** `/api/db/tables/:tableName/data`

需认证。分页查询指定表的数据。

#### 请求参数

| 参数       | 类型   | 说明                                         |
| ---------- | ------ | -------------------------------------------- |
| `keyword`  | string | 搜索关键词                                   |
| `sortColumn` | string | 排序字段                                   |
| `page`     | number | 页码                                         |
| `pageSize` | number | 每页数量                                     |

### 27.5 获取备份列表

**GET** `/api/db/backups`

需认证。返回所有数据库备份文件列表。

### 27.6 创建备份

**POST** `/api/db/backups`

需认证。创建数据库备份。

### 27.7 下载备份

**GET** `/api/db/backups/:fileName/download`

需认证。下载指定的备份文件。

### 27.8 恢复备份

**POST** `/api/db/backups/:fileName/restore`

需认证。从指定的备份文件恢复数据库。

### 27.9 删除备份

**DELETE** `/api/db/backups/:fileName`

需认证。删除指定的备份文件。

### 27.10 上传并恢复备份

**POST** `/api/db/backups/upload-restore`

需认证。上传 JSON 备份文件并恢复数据库。

#### 请求格式

- Content-Type: `multipart/form-data`
- 文件字段名: `backup`
- 支持格式: `.json`
- 文件大小限制: 100MB

### 27.11 获取脚本列表

**GET** `/api/db/scripts`

需认证。返回可执行的数据库脚本列表。

### 27.12 执行脚本

**POST** `/api/db/scripts/:scriptId/execute`

需认证。执行指定的数据库脚本。

### 27.13 获取脚本执行历史

**GET** `/api/db/scripts/:scriptId/history`

需认证。返回指定脚本的执行历史记录。
