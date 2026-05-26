# API 接口文档：销量分析模块优化

## 1. 接口总览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/sales` | 销量列表（分页） | ✅ |
| GET | `/api/sales/stats` | 销量统计 | ✅ |
| GET | `/api/sales/formula/:formulaId` | 配方销量历史 | ✅ |
| POST | `/api/sales` | 创建销量记录 | ✅ |
| PUT | `/api/sales/:id` | 更新销量记录 | ✅ |
| DELETE | `/api/sales/:id` | 删除销量记录 | ✅ |

## 2. 接口详情

### 2.1 GET /api/sales — 销量列表

**Query Parameters**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10 |
| formulaId | string | 否 | 按配方 ID 筛选 |
| salesmanId | string | 否 | 按业务员 ID 筛选 |
| periodStart | string | 否 | 起始月份（YYYY-MM-01） |
| periodEnd | string | 否 | 结束月份（YYYY-MM-01） |
| keyword | string | 否 | 搜索配方名称或业务员名称 |
| sortBy | string | 否 | 排序字段：quantity / revenue / period，默认 quantity |
| order | string | 否 | 排序方向：asc / desc，默认 desc |

**Response 200**：

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "sale_xxx",
        "formulaId": "f_xxx",
        "formulaName": "人参养荣汤",
        "formulaCode": "FP-001",
        "salesmanId": "sm_xxx",
        "salesmanName": "张三",
        "periodType": "monthly",
        "periodStart": "2026-05-01",
        "periodEnd": "2026-05-31",
        "quantity": 150,
        "revenue": 125000,
        "notes": "数据来自财务统计",
        "createdBy": "user_xxx",
        "createdAt": "2026-05-20T10:00:00.000Z",
        "updatedAt": "2026-05-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 50
    }
  }
}
```

### 2.2 GET /api/sales/stats — 销量统计

**Query Parameters**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| periodStart | string | 否 | 起始月份 |
| periodEnd | string | 否 | 结束月份 |

**Response 200**：

```json
{
  "success": true,
  "data": {
    "totalQuantity": 5000,
    "totalRevenue": 3500000,
    "topFormulas": [
      {
        "formulaId": "f_xxx",
        "formulaName": "人参养荣汤",
        "totalQuantity": 500,
        "totalRevenue": 400000
      }
    ],
    "topSalesmen": [
      {
        "salesmanId": "sm_xxx",
        "salesmanName": "张三",
        "totalQuantity": 800,
        "totalRevenue": 600000
      }
    ],
    "monthlyTrend": [
      {
        "month": "2026-05-01",
        "quantity": 500,
        "revenue": 350000
      }
    ],
    "periodComparison": {
      "current": { "quantity": 500, "revenue": 350000, "month": "2026-05-01" },
      "previous": { "quantity": 450, "revenue": 320000, "month": "2026-04-01" },
      "quantityGrowthRate": 11.1,
      "revenueGrowthRate": 9.4
    }
  }
}
```

### 2.3 GET /api/sales/formula/:formulaId — 配方销量历史

**Path Parameters**：

| 参数 | 类型 | 说明 |
|------|------|------|
| formulaId | string | 配方 ID |

**Response 200**：

```json
{
  "success": true,
  "data": [
    {
      "id": "sale_xxx",
      "formulaId": "f_xxx",
      "formulaName": "人参养荣汤",
      "salesmanId": "sm_xxx",
      "salesmanName": "张三",
      "periodType": "monthly",
      "periodStart": "2026-05-01",
      "periodEnd": "2026-05-31",
      "quantity": 150,
      "revenue": 125000,
      "notes": null,
      "createdBy": "user_xxx",
      "createdAt": "2026-05-20T10:00:00.000Z",
      "updatedAt": "2026-05-20T10:00:00.000Z"
    }
  ]
}
```

### 2.4 POST /api/sales — 创建销量记录（⭐ 核心变更）

**Request Body**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| formulaId | string | ✅ | 配方 ID |
| salesmanId | string | ✅ | 业务员 ID |
| periodType | string | ✅ | 周期类型：monthly / quarterly / yearly |
| periodStart | string | ✅ | 周期起始日期（YYYY-MM-01） |
| quantity | number | ✅ | 销售数量（件），≥0 |
| revenue | number | ✅ | 销售金额（元），≥0 |
| notes | string | 否 | 备注 |
| mergeMode | string | 否 | 合并模式：accumulate / replace。不传则在重复时返回 409 |

**Response 201**（新建成功）：

```json
{
  "success": true,
  "data": {
    "id": "sale_xxx",
    "formulaId": "f_xxx",
    "salesmanId": "sm_xxx",
    "periodType": "monthly",
    "periodStart": "2026-05-01",
    "periodEnd": "2026-05-31",
    "quantity": 150,
    "revenue": 125000,
    "notes": null,
    "createdBy": "user_xxx",
    "createdAt": "2026-05-20T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  }
}
```

**Response 200**（合并成功）：

```json
{
  "success": true,
  "data": {
    "id": "sale_existing",
    "formulaId": "f_xxx",
    "salesmanId": "sm_xxx",
    "periodType": "monthly",
    "periodStart": "2026-05-01",
    "periodEnd": "2026-05-31",
    "quantity": 230,
    "revenue": 187000,
    "notes": null,
    "createdBy": "user_xxx",
    "createdAt": "2026-05-15T10:00:00.000Z",
    "updatedAt": "2026-05-20T10:00:00.000Z"
  }
}
```

**Response 409**（重复记录，未指定 mergeMode）：

```json
{
  "success": false,
  "message": "该配方在此周期已有销量记录",
  "code": "DUPLICATE_ENTRY",
  "data": {
    "id": "sale_existing",
    "formulaId": "f_xxx",
    "salesmanId": "sm_xxx",
    "periodType": "monthly",
    "periodStart": "2026-05-01",
    "quantity": 150,
    "revenue": 125000,
    "notes": null
  }
}
```

**Response 400**（未来月份）：

```json
{
  "success": false,
  "message": "不能录入未来月份的销量数据",
  "code": "VALIDATION_ERROR"
}
```

### 2.5 PUT /api/sales/:id — 更新销量记录

**Path Parameters**：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 销量记录 ID |

**Request Body**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| quantity | number | 否 | 销售数量 |
| revenue | number | 否 | 销售金额 |
| notes | string | 否 | 备注 |

**Response 200**：

```json
{
  "success": true,
  "data": {
    "id": "sale_xxx",
    "quantity": 200,
    "revenue": 150000,
    "notes": "更新备注",
    "updatedAt": "2026-05-20T12:00:00.000Z"
  }
}
```

**Response 404**：

```json
{
  "success": false,
  "message": "销量记录不存在",
  "code": "NOT_FOUND"
}
```

### 2.6 DELETE /api/sales/:id — 删除销量记录

**Path Parameters**：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 销量记录 ID |

**Response 200**：

```json
{
  "success": true,
  "data": { "id": "sale_xxx" }
}
```

**Response 404**：

```json
{
  "success": false,
  "message": "销量记录不存在",
  "code": "NOT_FOUND"
}
```

## 3. 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| UNAUTHORIZED | 401 | 未认证 |
| VALIDATION_ERROR | 400 | 参数验证失败（含未来月份） |
| DUPLICATE_ENTRY | 409 | 重复记录（未指定 mergeMode） |
| NOT_FOUND | 404 | 记录不存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 4. 变更对比

| 接口 | 变更点 |
|------|--------|
| POST /api/sales | 新增 mergeMode 参数；重复时返回 409 + 已有记录数据；新增未来月份校验 |
| POST /api/sales | created_by 从 "system" 改为 req.user.userId |
| POST /api/sales | period_end 根据 periodType 正确计算 |
| GET /api/sales | 响应字段从 snake_case 别名改为 camelCase（Controller 层 rowsToCamelCase） |
| GET /api/sales/stats | 响应字段从 snake_case 别名改为 camelCase |
| 所有接口 | 新增 authMiddleware 认证要求 |
