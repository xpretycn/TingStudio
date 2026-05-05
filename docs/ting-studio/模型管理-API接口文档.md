# 模型管理功能 — API 接口文档

> 版本：v1.0 | 日期：2026-05-05 | Base Path: `/api/ai`

---

## 1. 模型管理

### 1.1 获取模型列表

```
GET /models-manage
```

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "model_dashscope",
        "provider": "dashscope",
        "name": "通义千问",
        "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "apiKeyConfigured": true,
        "model": "qwen-plus",
        "visionModel": "qwen-vl-plus",
        "visionMaxTokens": null,
        "description": "阿里云通义千问大模型",
        "supportsVision": true,
        "healthStatus": "healthy",
        "healthCheckIntervalDays": 1,
        "fallbackProvider": "zhipu",
        "todayCalls": 42,
        "todayTokens": 125000,
        "monthTokens": 3200000,
        "sortOrder": 0,
        "createdAt": "2026-05-01T00:00:00.000Z",
        "updatedAt": "2026-05-05T00:00:00.000Z"
      }
    ],
    "stats": {
      "totalModels": 3,
      "configuredModels": 3,
      "todayCalls": 128,
      "todayTokens": 450000,
      "monthTokens": 8500000,
      "activeAlerts": 2
    }
  }
}
```

### 1.2 新增模型

```
POST /models-manage
```

**Body:**
```json
{
  "provider": "deepseek",
  "name": "DeepSeek",
  "baseUrl": "https://api.deepseek.com/v1",
  "apiKey": "sk-xxx",
  "model": "deepseek-chat",
  "visionModel": "",
  "description": "DeepSeek 大模型",
  "supportsVision": false,
  "fallbackProvider": "dashscope"
}
```

### 1.3 更新模型

```
PUT /models-manage/:id
```

**Body:** 同新增，所有字段可选。`apiKey` 留空则不修改。

### 1.4 删除模型

```
DELETE /models-manage/:id
```

### 1.5 测试连通性

```
POST /models-manage/:id/test
```

**Response:**
```json
{
  "success": true,
  "data": {
    "healthy": true,
    "latencyMs": 230,
    "error": null
  }
}
```

### 1.6 获取模型版本列表

```
GET /models-manage/:id/versions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "dashscope",
    "currentModel": "qwen-plus",
    "versions": [
      { "value": "qwen-plus", "label": "Qwen Plus（通用）" },
      { "value": "qwen-turbo", "label": "Qwen Turbo（快速）" },
      { "value": "qwen-max", "label": "Qwen Max（旗舰）" }
    ]
  }
}
```

### 1.7 设置备用模型

```
PUT /models-manage/:id/fallback
```

**Body:**
```json
{
  "fallbackProvider": "zhipu"
}
```

---

## 2. 用量监控

### 2.1 获取用量统计

```
GET /usage?startDate=2026-05-01&endDate=2026-05-05&provider=dashscope
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "provider": "dashscope",
        "name": "通义千问",
        "total_calls": 1200,
        "total_tokens": 5000000,
        "today_calls": 42,
        "today_tokens": 125000,
        "month_calls": 800,
        "month_tokens": 3200000,
        "avg_latency_ms": 350
      }
    ],
    "trend": [
      { "date": "2026-05-01", "dashscope": 50000, "zhipu": 30000 },
      { "date": "2026-05-02", "dashscope": 60000, "zhipu": 25000 }
    ],
    "distribution": [
      { "provider": "dashscope", "name": "通义千问", "tokens": 3200000, "calls": 800 },
      { "provider": "zhipu", "name": "智谱清言", "tokens": 1800000, "calls": 400 }
    ]
  }
}
```

### 2.2 获取调用日志

```
GET /usage/logs?page=1&pageSize=20&provider=dashscope&callType=parse_formula&status=success&startDate=2026-05-01&endDate=2026-05-05
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_xxx",
        "provider": "dashscope",
        "modelName": "通义千问",
        "model": "qwen-plus",
        "callType": "parse_formula",
        "promptTokens": 1200,
        "completionTokens": 800,
        "totalTokens": 2000,
        "latencyMs": 350,
        "status": "success",
        "errorMessage": null,
        "requestSummary": "解析配方文件: 配方A.xlsx",
        "userId": "user_001",
        "fallbackFrom": null,
        "createdAt": "2026-05-05T10:30:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 3. 预警管理

### 3.1 获取预警配置

```
GET /alerts/configs
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configs": [
      {
        "id": "alert_dashscope",
        "model_id": "model_dashscope",
        "provider": "dashscope",
        "model_name": "通义千问",
        "daily_call_limit": 500,
        "monthly_token_limit": 5000000,
        "warning_threshold": 80,
        "critical_threshold": 95,
        "enabled": 1
      }
    ]
  }
}
```

### 3.2 更新预警配置

```
PUT /alerts/configs/:id
```

**Body:**
```json
{
  "dailyCallLimit": 1000,
  "monthlyTokenLimit": 10000000,
  "warningThreshold": 75,
  "criticalThreshold": 90,
  "enabled": true
}
```

### 3.3 获取预警记录

```
GET /alerts/records?page=1&pageSize=20&level=warning
```

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "rec_xxx",
        "provider": "dashscope",
        "model_name": "通义千问",
        "alert_type": "daily_call",
        "level": "warning",
        "threshold": 80,
        "current_value": 420,
        "limit_value": 500,
        "message": "通义千问 日调用已达 84.0%（420/500）",
        "is_read": 0,
        "created_at": "2026-05-05T14:00:00.000Z"
      }
    ],
    "total": 5,
    "activeAlerts": 2,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 4. 健康检测

### 4.1 获取健康状态

```
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "provider": "dashscope",
        "name": "通义千问",
        "health_status": "healthy",
        "lastCheckAt": "2026-05-05T12:00:00.000Z",
        "latencyMs": 230
      }
    ]
  }
}
```

### 4.2 获取健康历史

```
GET /health/:provider/history?days=7
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "dashscope",
    "history": [
      {
        "date": "2026-05-05",
        "checks": 2,
        "healthy": 2,
        "degraded": 0,
        "unhealthy": 0,
        "avg_latency_ms": 245
      }
    ]
  }
}
```

---

## 5. 状态码说明

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权限（非 admin） |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 6. 通用响应格式

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

```json
{
  "success": false,
  "message": "错误描述"
}
```
