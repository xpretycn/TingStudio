# 报告中心功能优化 - API 接口文档

## 一、接口总览

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/api/reports/check-period` | **新增** 检查周期是否已存在 | 已实现 |
| POST | `/api/reports/generate` | 生成报告（增加周期校验） | 修改 |
| POST | `/api/reports/batch-export/excel` | **新增** 批量导出Excel | 已实现 |
| GET | `/api/reports/:id/export/pdf` | 导出PDF | 已存在 |
| GET | `/api/reports/:id/export/excel` | 导出Excel | 已存在 |
| GET | `/api/reports/` | 获取报告列表 | 已存在 |
| GET | `/api/reports/:id` | 获取报告详情 | 已存在 |

---

## 二、新增接口

### 2.1 检查周期是否已存在

**接口**：`POST /api/reports/check-period`

**描述**：在生成报告前检查指定周期是否已存在报告，用于前端禁用重复生成按钮。

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| type | string | ✅ | 报告类型：`weekly` / `monthly` |
| periodStart | string | ✅ | 周期开始日期：`YYYY-MM-DD` |

**请求示例**：
```json
{
  "type": "weekly",
  "periodStart": "2026-05-25"
}
```

**成功响应**（HTTP 200）：
```json
{
  "success": true,
  "data": {
    "exists": true,
    "existingReport": {
      "id": "rpt_xxxxx",
      "title": "TingStudio 第22周工作报告",
      "status": "draft",
      "createdAt": "2026-05-25T10:30:00Z"
    }
  },
  "message": "该周期报告已存在"
}
```

**周期不存在响应**（HTTP 200）：
```json
{
  "success": true,
  "data": {
    "exists": false,
    "existingReport": null
  },
  "message": "该周期报告不存在，可以生成"
}
```

**权限错误响应**（HTTP 403）：
```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "仅管理员可生成报告"
}
```

---

### 2.2 批量导出Excel

**接口**：`POST /api/reports/batch-export/excel`

**描述**：将多个报告导出为一个Excel文件，每个报告为一个Sheet。

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| reportIds | string[] | ✅ | 报告ID数组，最多20个 |

**请求示例**：
```json
{
  "reportIds": ["rpt_xxxxx", "rpt_yyyyy", "rpt_zzzzz"]
}
```

**成功响应**（HTTP 200）：
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="批量报告_20260527.xlsx"
```

**响应体**：Excel文件二进制流

**错误响应**（HTTP 400）：
```json
{
  "success": false,
  "code": "INVALID_PARAMS",
  "message": "reportIds 参数不能为空或超过20个"
}
```

---

## 三、修改接口

### 3.1 生成报告

**接口**：`POST /api/reports/generate`

**描述**：生成新报告，增加周期唯一性校验。

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| type | string | ✅ | 报告类型：`weekly` / `monthly` |
| periodStart | string | ✅ | 周期开始日期：`YYYY-MM-DD` |
| periodEnd | string | ✅ | 周期结束日期：`YYYY-MM-DD` |
| includePlans | boolean | ❌ | 是否包含计划（默认false） |
| includeAIAnalysis | boolean | ❌ | 是否包含AI分析（默认false） |

**新增校验规则**：
- 同一用户、同一周期只能生成一次报告
- 仅admin可生成报告

**请求示例**：
```json
{
  "type": "weekly",
  "periodStart": "2026-05-25",
  "periodEnd": "2026-05-31",
  "includePlans": false,
  "includeAIAnalysis": false
}
```

**成功响应**（HTTP 201）：
```json
{
  "success": true,
  "data": {
    "id": "rpt_newwwww",
    "type": "weekly",
    "title": "TingStudio 第22周工作报告",
    "periodStart": "2026-05-25",
    "periodEnd": "2026-05-31",
    "periodKey": "2026-W22",
    "status": "draft",
    "createdAt": "2026-05-27T10:00:00Z",
    "dataJson": { ... }
  },
  "message": "报告生成成功"
}
```

**周期冲突响应**（HTTP 409）：
```json
{
  "success": false,
  "code": "PERIOD_EXISTS",
  "message": "该周期的周报已存在，请勿重复生成"
}
```

---

## 四、现有接口（不变）

### 4.1 获取报告列表

**接口**：`GET /api/reports/`

**描述**：获取报告列表，支持分页和过滤。配方师仅能查看自己创建的报告和已发布报告。

**查询参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| page | number | 页码（默认1） |
| pageSize | number | 每页数量（默认10） |
| type | string | 报告类型：`weekly` / `monthly` |
| status | string | 报告状态：`draft` / `published` / `archived` |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| generatedBy | string | 生成方式：`auto` / `manual` |

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "rpt_xxxxx",
      "type": "weekly",
      "title": "TingStudio 第22周工作报告",
      "periodStart": "2026-05-25",
      "periodEnd": "2026-05-31",
      "periodKey": "2026-W22",
      "status": "draft",
      "createdBy": "user_xxxxx",
      "creatorName": "admin",
      "createdAt": "2026-05-27T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

---

### 4.2 导出PDF

**接口**：`GET /api/reports/:id/export/pdf`

**响应**：
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="周报_2026-W22_20260525.pdf"
```

---

### 4.3 导出Excel

**接口**：`GET /api/reports/:id/export/excel`

**响应**：
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="周报_2026-W22_20260525.xlsx"
```

---

## 五、错误码定义

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| `PERIOD_EXISTS` | 409 | 周期已存在，不可重复生成 |
| `FORBIDDEN` | 403 | 无权限操作 |
| `NOT_FOUND` | 404 | 报告不存在 |
| `INVALID_PARAMS` | 400 | 参数错误 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 六、数据库变更

### 6.1 reports 表新增字段

```sql
ALTER TABLE reports ADD COLUMN period_key TEXT;

CREATE INDEX idx_reports_period_key ON reports(type, created_by, period_key);
```

### 6.2 period_key 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| period_key | TEXT | 周期唯一标识，周报格式：`YYYY-Www`（如2026-W22），月报格式：`YYYY-MM`（如2026-05） |

---

## 七、前端 API 调用示例

### 7.1 检查周期是否存在

```typescript
import { reportApi } from '@/api/report';

async function checkPeriod() {
  const result = await reportApi.checkPeriodExists('weekly', '2026-05-25');
  if (result.data.exists) {
    console.log('该周期已存在报告:', result.data.existingReport);
  }
}
```

### 7.2 批量导出 Excel

```typescript
import { reportApi } from '@/api/report';

async function batchExportExcel(reportIds: string[]) {
  const blob = await reportApi.batchExportExcel(reportIds);
  const url = window.URL.createObjectURL(new Blob([blob.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `批量报告_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```
