# 解析历史增强功能 PRD

**版本**: v1.3\
**日期**: 2026-05-15\
**状态**: 已评审\
**作者**: AI Assistant
**关联文档**: [parse-history-frontend-interaction.md](./parse-history-frontend-interaction.md)

***

## 1. Executive Summary

### 1.1 Problem Statement

当前解析历史功能存在以下问题：

- **重复解析浪费资源**：同一文件多次上传时，每次都需要重新调用 AI API，浪费 Token 成本
- **历史记录无法复用**：解析结果未持久化，用户刷新页面或切换页面后需要重新解析
- **历史数据膨胀**：长期使用后解析历史过多，缺乏检索和清理机制
- **数据生命周期不清晰**：解析结果应该有一定的生命周期管理，避免无限存储

### 1.2 Proposed Solution

构建智能解析结果缓存系统，实现以下能力：

1. **解析结果持久化**：将 AI 解析的完整结果（JSON + 原始响应）存储到数据库
2. **文件去重检测**：通过文件内容哈希识别相同文件，自动复用历史解析结果
3. **历史检索功能**：支持按文件名、时间、状态等维度检索解析历史
4. **智能清理机制**：基于存储上限的自动清理策略，支持管理员配置
5. **双向业务关联**：追踪解析结果与配方/原料的关联关系

### 1.3 Success Criteria

| 指标            | 目标值     | 说明                  |
| ------------- | ------- | ------------------- |
| **Token 节省率** | >= 60%  | 相同文件重复解析时跳过的比例      |
| **解析响应时间**    | < 500ms | 命中缓存时的结果返回时间        |
| **存储利用率**     | 60%-95% | 存储上限内的合理占用区间        |
| **清理准确率**     | 100%    | 清理任务不误删正在使用的解析结果    |
| **关联追溯率**     | 100%    | 所有被使用的解析结果都能追溯到业务记录 |

***

## 2. User Experience & Functionality

### 2.1 User Personas

| 角色        | 描述              | 使用场景                         |
| --------- | --------------- | ---------------------------- |
| **配方工程师** | 频繁使用智能填单功能的专业用户 | 上传配方 Excel，快速查看解析结果，可能需要多次调整 |
| **营养分析师** | 使用智能导入导入原料营养数据  | 批量导入营养成分表，需要查看和管理导入历史        |
| **系统管理员** | 配置和管理系统参数       | 设置存储上限、监控使用情况、处理异常数据         |

### 2.2 User Stories

#### 2.2.1 核心功能

| #     | 用户故事                                           | 验收标准                                       |
| ----- | ---------------------------------------------- | ------------------------------------------ |
| US-01 | **作为配方工程师，我希望能自动复用之前的解析结果**，这样可以节省 Token 成本和时间 | 当上传的文件与历史文件内容哈希相同时，系统自动展示之前的解析结果，无需重新调用 AI |
| US-02 | **作为配方工程师，我希望能检索历史解析记录**，这样可以快速找到之前的解析         | 支持按文件名、时间范围、解析状态等条件检索解析历史                  |
| US-03 | **作为配方工程师，我希望解析结果能持久化保存**，这样刷新页面不会丢失           | 解析结果保存到数据库，可跨会话访问                          |
| US-04 | **作为配方工程师，我希望能查看解析结果与配方的关联关系**，这样可以追溯数据来源      | 在配方详情页显示解析来源，支持跳转到原始解析记录                   |

#### 2.2.2 管理功能

| #     | 用户故事                                | 验收标准                          |
| ----- | ----------------------------------- | ----------------------------- |
| US-05 | **作为系统管理员，我希望配置存储上限**，这样可以控制存储成本    | 支持在管理界面设置存储上限（默认 5000 条）和清理阈值 |
| US-06 | **作为系统管理员，我希望查看存储使用统计**，这样可以监控资源消耗  | 显示当前存储数量、上限、占用百分比             |
| US-07 | **作为系统管理员，我希望能手动清理历史记录**，这样可以处理特殊情况 | 支持按条件批量删除解析记录                 |

#### 2.2.3 生命周期管理

| #     | 用户故事                                     | 验收标准                       |
| ----- | ---------------------------------------- | -------------------------- |
| US-08 | **系统应该在存储达到阈值时自动清理最老的记录**，这样保持存储在可控范围    | 存储占用超过 95% 时，自动清理最老的 5% 记录 |
| US-09 | **解析结果被应用到配方或原料时，应该标记为已使用**，这样可以优先保留重要数据 | 创建/更新配方/原料时，自动标记关联的解析结果    |

### 2.3 Non-Goals

- **不实现**文件版本管理（同一文件不同版本的区分）
- **不实现**跨用户共享解析结果（每个用户的解析结果独立存储）
- **不实现**解析结果的导出功能
- **不实现**解析结果的手动编辑功能

***

## 3. Technical Specifications

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vue 3)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ SmartFormTab│  │SmartImportTab│ │  SmartHistoryTab.vue   │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│          │                │                     │                 │
│          └────────────────┼─────────────────────┘                 │
│                           ▼                                       │
│                    ┌─────────────┐                               │
│                    │  AI Store   │                               │
│                    └──────┬──────┘                               │
└───────────────────────────┼───────────────────────────────────────┘
                            │ HTTP /api/*
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                         Backend (Express)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ aiController │  │parseResultCntlr│ │  modelController.ts  │  │
│  │ - parseFormula│  │- getHistory   │  │  - getStatistics    │  │
│  │ - parseNutrition│ │- search      │  │  - updateConfig     │  │
│  └──────┬───────┘  │- cleanup     │  │  - manualDelete     │  │
│         │           └──────┬───────┘  └────────────────────────┘  │
│         │                  │                                       │
│         ▼                  ▼                                       │
│  ┌──────────────────────────────────────┐                          │
│  │         ParseResultService            │                          │
│  │  - hashFile()                       │                          │
│  │  - saveResult()                     │                          │
│  │  - findByHash()                    │                          │
│  │  - markAsUsed()                     │                          │
│  │  - cleanup()                        │                          │
│  └──────────────────────────────────────┘                          │
│                           │                                        │
│                           ▼                                        │
│  ┌──────────────────────────────────────┐                         │
│  │      Database (SQLite / MySQL)        │                         │
│  │  - parse_results                     │                         │
│  │  - parse_result_configs              │                         │
│  │  - formulas (parse_result_id FK)     │                         │
│  │  - materials (parse_result_id FK)    │                         │
│  └──────────────────────────────────────┘                         │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema

#### 3.2.1 parse\_results 表（解析结果主表）

| 字段                   | 类型      | 约束        | 说明                                      |
| -------------------- | ------- | --------- | --------------------------------------- |
| id                   | TEXT    | PK        | UUID 主键                                 |
| user\_id             | TEXT    | NOT NULL  | 用户 ID（数据隔离）                             |
| call\_type           | TEXT    | NOT NULL  | 解析类型（parse\_formula / parse\_nutrition） |
| file\_hash           | TEXT    | NOT NULL  | 文件内容 SHA-256 哈希                         |
| file\_name           | TEXT    | NOT NULL  | 原始文件名                                   |
| file\_size           | INTEGER | NOT NULL  | 文件大小（字节）                                |
| parsed\_result       | TEXT    | NOT NULL  | AI 解析后的结构化 JSON                         |
| raw\_response        | TEXT    | NOT NULL  | AI 原始响应文本                               |
| model\_provider      | TEXT    | <br />    | 使用的模型提供商                                |
| model\_name          | TEXT    | <br />    | 使用的模型名称                                 |
| status               | TEXT    | NOT NULL  | 状态（pending / success / failed）          |
| error\_message       | TEXT    | <br />    | 失败时的错误信息                                |
| used\_count          | INTEGER | DEFAULT 0 | 被引用次数                                   |
| is\_linked           | INTEGER | DEFAULT 0 | 是否已关联到业务数据（0/1）                         |
| linked\_formula\_id  | TEXT    | <br />    | 关联的配方 ID（可为空）                           |
| linked\_material\_id | TEXT    | <br />    | 关联的原料 ID（可为空）                           |
| expires\_at          | TEXT    | NOT NULL  | 过期时间（存储上限清理时更新）                         |
| created\_at          | TEXT    | NOT NULL  | 创建时间                                    |
| updated\_at          | TEXT    | NOT NULL  | 更新时间                                    |

**索引**：

```sql
CREATE INDEX idx_parse_results_user_id ON parse_results(user_id);
CREATE INDEX idx_parse_results_file_hash ON parse_results(file_hash);
CREATE INDEX idx_parse_results_call_type ON parse_results(call_type);
CREATE INDEX idx_parse_results_status ON parse_results(status);
CREATE INDEX idx_parse_results_created_at ON parse_results(created_at);
CREATE INDEX idx_parse_results_expires_at ON parse_results(expires_at);
```

#### 3.2.2 parse\_result\_configs 表（配置表）

| 字段            | 类型   | 约束              | 说明           |
| ------------- | ---- | --------------- | ------------ |
| id            | TEXT | PK              | UUID 主键      |
| config\_key   | TEXT | UNIQUE NOT NULL | 配置键          |
| config\_value | TEXT | NOT NULL        | 配置值（JSON 格式） |
| description   | TEXT | <br />          | 配置说明         |
| updated\_at   | TEXT | NOT NULL        | 更新时间         |

**预设配置**：

| 配置键                         | 默认值     | 说明             |
| --------------------------- | ------- | -------------- |
| storage\_limit              | 5000    | 最大解析结果数量       |
| cleanup\_threshold\_percent | 95      | 触发自动清理的阈值（百分比） |
| cleanup\_batch\_percent     | 5       | 每次清理的比例（百分比）   |
| retention\_days             | 30      | 保留天数（预留字段）     |
| max\_file\_size\_bytes      | 5242880 | 可缓存文件大小上限（5MB） |

#### 3.2.3 配方表扩展（formulas）

新增字段：

| 字段                | 类型   | 约束                     | 说明           |
| ----------------- | ---- | ---------------------- | ------------ |
| parse\_result\_id | TEXT | FK → parse\_results.id | 解析结果 ID（可为空） |

#### 3.2.4 原料表扩展（materials）

新增字段：

| 字段                | 类型   | 约束                     | 说明           |
| ----------------- | ---- | ---------------------- | ------------ |
| parse\_result\_id | TEXT | FK → parse\_results.id | 解析结果 ID（可为空） |

### 3.3 API Specification

#### 3.3.1 解析结果查询

```
GET /api/ai/parse-results
```

**Query Parameters**：

| 参数        | 类型     | 必填 | 说明                               |
| --------- | ------ | -- | -------------------------------- |
| page      | int    | 否  | 页码，默认 1                          |
| pageSize  | int    | 否  | 每页数量，默认 20                       |
| callType  | string | 否  | 解析类型筛选                           |
| fileName  | string | 否  | 文件名模糊搜索                          |
| status    | string | 否  | 状态筛选（success / failed / pending） |
| startDate | string | 否  | 开始日期（YYYY-MM-DD）                 |
| endDate   | string | 否  | 结束日期（YYYY-MM-DD）                 |
| keyword   | string | 否  | 关键词搜索（文件名/摘要）                    |

**Response**：

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "pr_abc123",
        "callType": "parse_formula",
        "callTypeLabel": "智能填单",
        "fileName": "配方表.xlsx",
        "fileHash": "sha256:xxxxx",
        "fileSize": 102400,
        "status": "success",
        "modelProvider": "dashscope",
        "modelName": "qwen-plus",
        "usedCount": 3,
        "isLinked": true,
        "linkedFormulaId": "fm_xxx",
        "createdAt": "2026-05-15T10:30:00Z",
        "expiresAt": "2026-06-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### 3.3.2 解析结果详情

```
GET /api/ai/parse-results/:id
```

**Response**：

```json
{
  "success": true,
  "data": {
    "id": "pr_abc123",
    "callType": "parse_formula",
    "fileName": "配方表.xlsx",
    "fileHash": "sha256:xxxxx",
    "parsedResult": {
      "name": "感冒冲剂",
      "materials": [...]
    },
    "rawResponse": "原始 AI 响应...",
    "status": "success",
    "usedCount": 3,
    "isLinked": true,
    "linkedFormulaId": "fm_xxx",
    "linkedMaterialId": null,
    "createdAt": "2026-05-15T10:30:00Z"
  }
}
```

#### 3.3.3 检查文件是否已解析

```
POST /api/ai/parse-results/check
```

**Request Body**：

```json
{
  "fileHash": "sha256:xxxxx",
  "fileName": "配方表.xlsx",
  "callType": "parse_formula"
}
```

**Response**：

```json
{
  "success": true,
  "data": {
    "exists": true,
    "parseResultId": "pr_abc123",
    "status": "success"
  }
}
```

#### 3.3.4 保存解析结果

```
POST /api/ai/parse-results
```

**Request Body**：

```json
{
  "callType": "parse_formula",
  "fileHash": "sha256:xxxxx",
  "fileName": "配方表.xlsx",
  "fileSize": 102400,
  "parsedResult": {...},
  "rawResponse": "...",
  "modelProvider": "dashscope",
  "modelName": "qwen-plus",
  "status": "success",
  "errorMessage": null
}
```

#### 3.3.5 标记解析结果已使用

```
POST /api/ai/parse-results/:id/mark-used
```

**Request Body**：

```json
{
  "linkedFormulaId": "fm_xxx",
  "incrementCount": true
}
```

#### 3.3.6 获取存储统计

```
GET /api/ai/parse-results/statistics
```

**Response**：

```json
{
  "success": true,
  "data": {
    "totalCount": 4250,
    "storageLimit": 5000,
    "usagePercent": 85,
    "cleanupThreshold": 95,
    "cleanupBatchPercent": 5,
    "statsByType": {
      "parse_formula": 3000,
      "parse_nutrition": 1250
    },
    "statsByStatus": {
      "success": 4000,
      "failed": 200,
      "pending": 50
    }
  }
}
```

#### 3.3.7 更新存储配置（仅管理员）

```
PUT /api/ai/parse-results/config
```

**Request Body**：

```json
{
  "storageLimit": 15000,
  "cleanupThresholdPercent": 90,
  "cleanupBatchPercent": 10
}
```

#### 3.3.8 手动清理（仅管理员）

```
POST /api/ai/parse-results/cleanup
```

**Request Body**：

```json
{
  "beforeDate": "2026-04-01",
  "status": "failed",
  "dryRun": false
}
```

**Response**：

```json
{
  "success": true,
  "data": {
    "deletedCount": 156,
    "freedSpace": 52428800
  }
}
```

### 3.4 Core Algorithms

#### 3.4.1 文件哈希计算

```typescript
async function calculateFileHash(fileBuffer: Buffer): Promise<string> {
  const hash = crypto.createHash('sha256');
  hash.update(fileBuffer);
  return `sha256:${hash.digest('hex')}`;
}
```

#### 3.4.2 存储上限清理算法

```typescript
async function cleanupIfNeeded(): Promise<number> {
  const config = await getConfig();
  const { storageLimit, cleanupThresholdPercent, cleanupBatchPercent } = config;
  
  const currentCount = await getTotalCount();
  const threshold = Math.floor(storageLimit * cleanupThresholdPercent / 100);
  
  if (currentCount < threshold) {
    return 0; // 不需要清理
  }
  
  // 计算需要清理的数量
  const cleanupCount = Math.ceil(storageLimit * cleanupBatchPercent / 100);
  
  // 查询最老的记录（优先清理：未被关联、使用次数少、创建时间早）
  const toDelete = await db.prepare(`
    SELECT id FROM parse_results 
    WHERE is_linked = 0 AND used_count = 0
    ORDER BY created_at ASC, used_count ASC
    LIMIT ?
  `).all(cleanupCount);
  
  // 执行删除
  const ids = toDelete.map((r: any) => r.id);
  await db.prepare(`DELETE FROM parse_results WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  
  return ids.length;
}
```

#### 3.4.3 重复文件检测流程

```
用户上传文件
    ↓
计算文件哈希 (SHA-256)
    ↓
查询数据库：SELECT * FROM parse_results WHERE file_hash = ? AND user_id = ? AND status = 'success'
    ↓
    ├─ 找到记录 → 返回缓存结果，跳过 AI 调用
    │
    └─ 未找到记录 → 调用 AI 解析 → 保存结果到数据库
```

### 3.5 Integration Points

#### 3.5.1 配方创建/更新时

```typescript
// 在 formulaController.ts 中
async function createFormula(req, res, next) {
  try {
    const formula = await formulaService.create(req.body);
    
    // 如果指定了 parse_result_id，标记解析结果已使用
    if (req.body.parseResultId) {
      await parseResultService.markAsUsed(req.body.parseResultId, {
        linkedFormulaId: formula.id,
        incrementCount: true
      });
    }
    
    res.json(success(formula));
  } catch (error) {
    next(error);
  }
}
```

#### 3.5.2 原料创建/更新时

```typescript
// 在 materialController.ts 中
async function createMaterial(req, res, next) {
  try {
    const material = await materialService.create(req.body);
    
    // 如果指定了 parse_result_id，标记解析结果已使用
    if (req.body.parseResultId) {
      await parseResultService.markAsUsed(req.body.parseResultId, {
        linkedMaterialId: material.id,
        incrementCount: true
      });
    }
    
    res.json(success(material));
  } catch (error) {
    next(error);
  }
}
```

#### 3.5.3 定时清理任务

```typescript
// 使用 node-cron 执行定时清理
import cron from 'node-cron';

// 每天凌晨 3 点检查存储状态
cron.schedule('0 3 * * *', async () => {
  console.log('[ParseResult] 开始定时存储检查...');
  
  try {
    const deletedCount = await cleanupIfNeeded();
    
    if (deletedCount > 0) {
      console.log(`[ParseResult] 定时清理完成，删除了 ${deletedCount} 条记录`);
      
      // 发送告警通知管理员
      await sendCleanupAlert(deletedCount);
    }
  } catch (error) {
    console.error('[ParseResult] 定时清理失败:', error);
  }
});
```

***

## 4. Error Handling

### 4.1 Error Code Definition

| 错误码                             | HTTP 状态码 | 错误信息      | 说明                 |
| ------------------------------- | -------- | --------- | ------------------ |
| PARSE\_RESULT\_NOT\_FOUND       | 404      | 解析结果不存在   | 请求的解析结果 ID 不存在或已删除 |
| PARSE\_RESULT\_ACCESS\_DENIED   | 403      | 无权访问该解析结果 | 当前用户无权访问该记录        |
| PARSE\_RESULT\_STORAGE\_LIMIT   | 507      | 存储空间不足    | 存储已达到上限，无法保存新的解析结果 |
| PARSE\_RESULT\_FILE\_TOO\_LARGE | 413      | 文件大小超出限制  | 超过 5MB 限制，不进行缓存    |
| PARSE\_RESULT\_DUPLICATE        | 409      | 解析结果已存在   | 相同哈希的解析结果已存在       |
| PARSE\_RESULT\_LINK\_FAILED     | 500      | 关联失败      | 标记解析结果为已使用时发生错误    |
| PARSE\_RESULT\_CLEANUP\_FAILED  | 500      | 清理失败      | 自动清理任务执行失败         |
| PARSE\_RESULT\_HASH\_COLLISION  | 500      | 哈希冲突      | 检测到可能的哈希碰撞，需人工排查   |
| PARSE\_RESULT\_DB\_ERROR        | 500      | 数据库错误     | 数据库操作失败            |

### 4.2 Error Response Format

**错误响应统一格式**：

```json
{
  "success": false,
  "error": {
    "code": "PARSE_RESULT_NOT_FOUND",
    "message": "解析结果不存在",
    "timestamp": "2026-05-15T10:30:00.000Z",
    "details": {
      "id": "pr_abc123",
      "suggestion": "请检查解析结果 ID 是否正确"
    }
  }
}
```

**错误响应字段说明**：

| 字段        | 类型     | 说明               |
| --------- | ------ | ---------------- |
| code      | string | 错误码（见上表）         |
| message   | string | 用户友好的错误描述        |
| timestamp | string | 错误发生时间（ISO 8601） |
| details   | object | 附加信息（可选）         |

### 4.3 Frontend Error Handling

**前端错误处理策略**：

| 错误码                             | 处理方式       | 用户提示             |
| ------------------------------- | ---------- | ---------------- |
| PARSE\_RESULT\_NOT\_FOUND       | 移除该记录，刷新列表 | "该解析结果已被删除"      |
| PARSE\_RESULT\_ACCESS\_DENIED   | 移除该记录      | "无权访问该解析结果"      |
| PARSE\_RESULT\_STORAGE\_LIMIT   | 提示管理员      | "存储空间不足，请清理历史记录" |
| PARSE\_RESULT\_FILE\_TOO\_LARGE | 跳过缓存       | "大文件不支持缓存，将直接解析" |
| PARSE\_RESULT\_DUPLICATE        | 跳过保存       | "该解析结果已存在"       |
| 其他 5xx 错误                       | 提示重试       | "服务异常，请稍后重试"     |

**错误日志记录**：

```typescript
// 错误日志格式
interface ErrorLog {
  timestamp: string;
  code: string;
  message: string;
  userId: string;
  requestId?: string;
  stack?: string;
}

// 仅记录关键错误
const criticalErrors = [
  'PARSE_RESULT_LINK_FAILED',
  'PARSE_RESULT_CLEANUP_FAILED',
  'PARSE_RESULT_HASH_COLLISION',
  'PARSE_RESULT_DB_ERROR'
];
```

***

## 5. Monitoring & Alerting

### 5.1 Monitoring Metrics

**核心业务指标**：

| 指标名称      | 指标类型    | 计算方式                  | 目标值     | 告警阈值          |
| --------- | ------- | --------------------- | ------- | ------------- |
| 缓存命中率     | Gauge   | 命中次数 / 总解析次数          | >= 60%  | < 50%         |
| 存储使用率     | Gauge   | 当前数量 / 存储上限           | 60%-95% | > 95% 或 < 50% |
| 解析请求量     | Counter | 每日解析次数                | -       | 突增/突降 50%     |
| 缓存复用率     | Gauge   | 缓存命中次数 / 总请求次数        | >= 60%  | < 40%         |
| Token 节省率 | Gauge   | 缓存跳过的 Token / 总 Token | >= 60%  | < 50%         |

**系统性能指标**：

| 指标名称         | 指标类型      | 目标值           | 告警阈值    |
| ------------ | --------- | ------------- | ------- |
| API 响应时间 P95 | Histogram | < 200ms       | > 500ms |
| API 响应时间 P99 | Histogram | < 500ms       | > 1s    |
| 哈希计算耗时       | Histogram | < 100ms (5MB) | > 1s    |
| 数据库查询耗时      | Histogram | < 50ms        | > 200ms |
| 清理任务耗时       | Histogram | < 10s         | > 60s   |

**资源使用指标**：

| 指标名称     | 指标类型   | 告警阈值        |
| -------- | ------ | ----------- |
| 数据库连接数   | Gauge  | > 80% 最大连接数 |
| 存储使用量    | Gauge  | > 存储上限 95%  |
| 定时任务执行状态 | Status | 失败          |

### 5.2 Alert Rules

**告警规则定义**：

| 告警名称       | 触发条件                  | 严重程度        | 通知方式       | 处理措施          |
| ---------- | --------------------- | ----------- | ---------- | ------------- |
| 存储即将满      | usagePercent > 95%    | ⚠️ Warning  | 管理员邮件      | 检查并调整存储上限     |
| 存储严重不足     | usagePercent > 99%    | 🔴 Critical | 管理员短信 + 邮件 | 立即执行手动清理      |
| 缓存命中率低     | hitRate < 40% 持续 1 小时 | ⚠️ Warning  | 管理员邮件      | 分析哈希算法，排查问题   |
| 清理任务失败     | 连续失败 3 次              | 🔴 Critical | 管理员短信 + 邮件 | 立即人工介入        |
| API 响应慢    | P95 > 500ms 持续 5 分钟   | ⚠️ Warning  | 管理员邮件      | 检查数据库索引，排查慢查询 |
| Token 异常增长 | Token 使用量突增 100%      | ⚠️ Warning  | 管理员邮件      | 检查是否有异常请求     |

**告警通知模板**：

````markdown
## 告警通知 - [告警名称]

**严重程度**: ⚠️ Warning / 🔴 Critical
**触发时间**: 2026-05-15 10:30:00
**当前状态**: [具体数值]

### 详细信息

- 指标名称: [指标名称]
- 当前值: [当前值]
- 目标值: [目标值]
- 触发阈值: [告警阈值]

### 可能原因

1. [原因1]
2. [原因2]

### 建议处理措施

1. [措施1]
2. [措施2]

### 处理记录

| 时间 | 处理人 | 操作 | 结果 |
|------|--------|------|------|
| | | | |

---

## 6. Degradation Strategy

### 6.1 Service Degradation Levels

**系统降级分为 3 个级别**：

| 级别 | 状态 | 影响范围 | 降级条件 |
|------|------|----------|----------|
| **Level 0** | 正常 | 无 | 所有功能正常 |
| **Level 1** | 降级 | 缓存功能暂停 | 数据库连接超时 / 存储接近满 |
| **Level 2** | 熔断 | 缓存和关联暂停 | 数据库不可用 / 存储已满 |

### 6.2 Degradation Behavior

**Level 1 降级 - 缓存暂停**：

```typescript
interface DegradeL1Config {
  cacheEnabled: false,           // 禁用缓存
  recordSavingEnabled: true,    // 允许保存新记录
  autoCleanupEnabled: false,    // 禁用自动清理
  correlationEnabled: true       // 允许关联追踪
}

// 降级行为：
// - 相同文件重新解析，不复用缓存
// - 仍然保存解析结果到数据库
// - 仍然追踪配方/原料关联
// - 禁用定时清理任务
````

**Level 2 降级 - 熔断**：

```typescript
interface DegradeL2Config {
  cacheEnabled: false,           // 禁用缓存
  recordSavingEnabled: false,     // 禁止保存新记录
  autoCleanupEnabled: false,     // 禁用自动清理
  correlationEnabled: false,      // 禁用关联追踪
  historyViewEnabled: true       // 仍然允许查看历史
}

// 降级行为：
// - 相同文件重新解析
// - 禁止保存新的解析结果
// - 禁止标记关联
// - 仍然允许查看历史记录
// - 返回降级提示给用户
```

### 6.3 Automatic Recovery

**降级恢复机制**：

```typescript
interface RecoveryConfig {
  // Level 1 恢复条件
  level1RecoveryConditions: [
    { metric: 'dbConnectionHealth', operator: '==', value: 'healthy', duration: '5m' },
    { metric: 'storageUsage', operator: '<', value: 95, duration: '10m' }
  ],
  
  // Level 2 恢复条件
  level2RecoveryConditions: [
    { metric: 'dbConnectionHealth', operator: '==', value: 'healthy', duration: '5m' },
    { metric: 'storageUsage', operator: '<', value: 90, duration: '30m' }
  ],
  
  // 恢复确认机制
  confirmationRequired: true,     // 需要确认才能完全恢复
  confirmationTimeout: '10s',     // 确认超时时间
  fallbackToL1: true            // 超时回退到 Level 1
}
```

### 6.4 User Communication

**降级状态用户提示**：

| 降级级别    | 用户提示               | 说明         |
| ------- | ------------------ | ---------- |
| Level 0 | 无提示                | 正常服务       |
| Level 1 | "解析服务已降级，历史缓存暂不可用" | 提示用户解析可能稍慢 |
| Level 2 | "解析服务暂时不可用，请稍后重试"  | 提示用户服务熔断   |

**降级通知模板**：

```typescript
const degradeNotifications = {
  level1: {
    title: '缓存服务降级',
    message: '历史缓存功能暂时不可用，将直接解析文件。',
    action: '了解'
  },
  level2: {
    title: '解析服务暂时不可用',
    message: '由于系统负载过高，解析功能暂时关闭。请稍后再试。',
    action: '稍后重试'
  }
}
```

### 6.5 Monitoring During Degradation

**降级期间监控项**：

```typescript
const degradeMonitoringMetrics = {
  // 降级状态
  degradationLevel: 'gauge',           // 0, 1, 2
  
  // 降级持续时间
  degradationDuration: 'gauge',         // 秒
  
  // 降级触发次数
  degradationCount: 'counter',          // 累计次数
  
  // 降级期间请求失败数
  degradeRequestFailures: 'counter',    // 累计
  
  // 降级恢复尝试次数
  recoveryAttempts: 'counter',          // 累计
  
  // 恢复成功次数
  recoverySuccesses: 'counter'          // 累计
};
```

***

## 7. AI System Requirements

### 8.2 Hash Collision Prevention

| 要求          | 说明                       |
| ----------- | ------------------------ |
| **缓存命中率目标** | >= 60% 的重复文件请求命中缓存       |
| **缓存有效性**   | 相同哈希值的文件始终返回相同解析结构       |
| **更新策略**    | 不更新旧记录，新解析生成新记录（保持历史可追溯） |

### 8.1 Parsing Result Caching

- 使用 SHA-256 算法，碰撞概率极低（2^-256）
- 额外使用 (文件名 + 文件大小) 作为辅助验证
- 日志记录哈希冲突情况供人工排查

***

## 9. Security & Privacy

### 9.1 Data Isolation

- **用户隔离**：每个用户只能访问自己的解析结果
- **Token 关联**：所有查询必须包含 userId 验证
- **管理员权限**：统计、手动清理等操作需要 admin 角色

### 9.2 Sensitive Data Handling

| 数据类型      | 处理方式               |
| --------- | ------------------ |
| 解析结果 JSON | 完整存储，包含配方/原料敏感信息   |
| 原始 AI 响应  | 完整存储，用于审计追溯        |
| 文件内容      | 不存储，只存储哈希值         |
| 用户信息      | 通过 userId 关联，不重复存储 |

***

## 10. Risks & Mitigation

### 10.1 Technical Risks

| 风险             | 概率 | 影响 | 缓解措施                                  |
| -------------- | -- | -- | ------------------------------------- |
| 哈希碰撞导致错误复用     | 低  | 高  | 增加文件名+文件大小辅助验证；日志监控异常复用               |
| 存储上限配置过低导致频繁清理 | 中  | 中  | 默认 5000 条；UI 显示预警；配置建议值               |
| 双向关联导致数据不一致    | 中  | 中  | 使用事务保证原子性；定期校验一致性                     |
| 清理任务误删正在使用的记录  | 低  | 高  | 优先保留 is\_linked=1 或 used\_count>0 的记录 |

### 10.2 Performance Risks

| 风险           | 缓解措施                                |
| ------------ | ----------------------------------- |
| 文件哈希计算影响上传速度 | 大文件（>5MB）异步计算，前端显示进度；限制可缓存文件大小为 5MB |
| 大量历史记录查询慢    | 合理索引；分页查询；时间范围筛选                    |
| 定时清理占用数据库资源  | 错峰执行；限制单次清理数量                       |

***

## 11. Test Strategy

### 11.1 Test Scope

| 测试类型      | 覆盖范围               | 优先级 |
| --------- | ------------------ | --- |
| **单元测试**  | 文件哈希计算、清理算法、哈希冲突检测 | P0  |
| **集成测试**  | API 端点、数据库操作、服务间调用 | P0  |
| **端到端测试** | 完整解析流程、缓存命中验证、关联追踪 | P1  |
| **性能测试**  | 大文件哈希计算、批量查询、定时清理  | P1  |
| **安全测试**  | 数据隔离、权限验证、SQL 注入防护 | P0  |

### 11.2 Test Cases

#### 11.2.1 核心功能测试

| TC ID | 测试场景       | 预期结果                          | 测试类型 |
| ----- | ---------- | ----------------------------- | ---- |
| TC-01 | 上传相同文件两次   | 第二次直接返回缓存结果，跳过 AI 调用          | E2E  |
| TC-02 | 上传不同文件     | 生成新的解析结果，哈希值不同                | E2E  |
| TC-03 | 修改文件后上传    | 生成新的解析结果，缓存未命中                | E2E  |
| TC-04 | 文件名相同但内容不同 | 根据哈希判断为不同文件                   | 单元   |
| TC-05 | 存储达到上限触发清理 | 最老且未关联的记录被删除                  | 集成   |
| TC-06 | 已关联的记录不被清理 | 设置 is\_linked=1 的记录优先保留       | 单元   |
| TC-07 | 配方创建时标记关联  | 解析结果的 used\_count +1，关联 ID 正确 | 集成   |
| TC-08 | 统计接口返回正确数据 | totalCount、usagePercent 等指标准确 | 集成   |

#### 11.2.2 边界条件测试

| TC ID | 测试场景         | 预期结果          | 测试类型 |
| ----- | ------------ | ------------- | ---- |
| TC-09 | 空文件上传        | 返回错误提示，不保存哈希  | E2E  |
| TC-10 | 超大文件（>100MB） | 异步计算哈希，前端显示进度 | 性能   |
| TC-11 | 并发上传相同文件     | 只创建一个解析结果     | 集成   |
| TC-12 | 存储上限设为 0     | 拒绝保存任何解析结果    | 单元   |
| TC-13 | 清理阈值设为 100%  | 清理任务不执行       | 单元   |

### 11.3 Test Environments

| 环境        | 用途        | 数据特征                  |
| --------- | --------- | --------------------- |
| **开发环境**  | 本地开发调试    | 小规模测试数据（<100 条）       |
| **测试环境**  | 功能验证、回归测试 | 中等规模数据（1000 条），模拟真实场景 |
| **预生产环境** | 性能测试、极限测试 | 大规模数据（10000 条），压力测试   |

### 11.4 Test Data Requirements

- **测试文件集**：
  - 不同类型的配方 Excel（10-50 个样本）
  - 不同大小的文件（1KB - 100MB）
  - 相同内容不同文件名（验证哈希算法）
  - 相同文件名不同内容（验证哈希算法）
  - 边界文件（空文件、损坏文件）
- **测试用户**：
  - 普通用户（user\_id: test\_user\_001）
  - 管理员用户（user\_id: test\_admin\_001）
  - 无关联用户（user\_id: test\_user\_002）

### 11.5 测试成功标准

| 指标           | 目标值          | 测量方法                           |
| ------------ | ------------ | ------------------------------ |
| **功能测试通过率**  | 100%         | 所有 TC-01 至 TC-13 测试通过          |
| **缓存命中率**    | >= 60%       | 重复文件上传场景下命中次数/总重复次数            |
| **API 响应时间** | < 200ms（P95） | 缓存命中时 /api/ai/parse-results 查询 |
| **清理准确率**    | 100%         | 已关联记录零误删                       |
| **数据隔离验证**   | 100%         | 用户 A 无法访问用户 B 的解析结果            |

***

## 12. Phased Rollout

### Phase 1: MVP（1-2 周）

#### 后端任务

- [ ] 数据库表创建（parse\_results、parse\_result\_configs）
- [ ] 基础 CRUD API
- [ ] 文件哈希计算和重复检测
- [ ] 解析结果保存和查询
- [ ] 手动清理功能
- [ ] 后端错误码定义和错误处理

#### 前端任务

- [ ] 新增 SmartHistoryTab.vue 组件（Tab 集成方案）
- [ ] 统计卡片区域开发（4 个指标卡片）
- [ ] 基础列表展示（t-table）
- [ ] 列表项详情查看（抽屉组件）
- [ ] 单条删除功能（Popconfirm）
- [ ] 分页组件

#### 前端技术决策

- **页面实现方式**：Tab 集成（`/ai/tools?tab=history`）
- **交互规范**：所有删除操作使用 Popconfirm
- **组件库**：TDesign Vue Next
- **状态管理**：Pinia Store

#### 里程碑检查点

- [ ] 后端 API 可正常调用
- [ ] 前端列表展示正确
- [ ] 单条删除功能正常
- [ ] 单元测试覆盖率 >= 80%

### Phase 2: v1.1（1 周）

#### 后端任务

- [ ] 存储配置 API（GET/PUT /config）
- [ ] 存储统计 API（/statistics）
- [ ] 定时自动清理任务（node-cron）
- [ ] 配方/原料关联接口（双向关联）
- [ ] 降级策略实现（3 个级别）
- [ ] 监控指标埋点

#### 前端任务

- [ ] 配置管理页面开发（系统管理模块）
- [ ] 存储上限配置 UI（参照模型管理页面）
- [ ] 清理阈值配置 UI
- [ ] 存储统计可视化（进度条、趋势）
- [ ] 批量删除功能（Popconfirm）
- [ ] 恢复解析结果功能（跳转表单页）
- [ ] 关联记录查看（配方/原料跳转）
- [ ] 降级状态 Banner 组件

#### 前端技术决策

- **配置管理入口**：系统管理模块（`/ai/parse-result-config`）
- **权限控制**：仅 admin 可修改配置
- **界面风格**：参照模型管理页面布局
- **降级 UI**：DegradationBanner.vue 组件

#### 里程碑检查点

- [ ] 配置页面可正常访问和保存
- [ ] 自动清理任务正常执行
- [ ] 配方/原料关联正常
- [ ] 降级状态可正确展示
- [ ] 集成测试全部通过

### Phase 3: v1.2（1 周）

#### 后端任务

- [ ] 历史检索增强（文件名搜索、时间范围筛选）
- [ ] 告警规则引擎
- [ ] 管理员通知（邮件/短信）
- [ ] API 性能优化（索引优化）
- [ ] 监控告警 API
- [ ] 降级恢复机制

#### 前端任务

- [ ] 高级检索功能（多条件筛选）
- [ ] 关键词全文搜索
- [ ] 告警通知组件（AlertNotification）
- [ ] 性能指标展示（PerformanceIndicator）
- [ ] 用户行为埋点（8 个事件）
- [ ] 响应式设计优化（3 个断点）
- [ ] 可访问性优化（ARIA 标签）

#### 前端技术决策

- **检索组件**：t-date-range-picker + t-select
- **防抖处理**：lodash-es debounce（300ms）
- **性能监控**：列表加载 < 500ms，详情 < 300ms
- **埋点方案**：事件 + 参数 + 时间戳

#### 里程碑检查点

- [ ] 检索功能完善
- [ ] 告警通知正常
- [ ] E2E 测试全部通过
- [ ] 性能测试达标
- [ ] 可访问性评分 >= 90%

### Phase 4: v2.0（规划中）

#### 高级功能

- [ ] 解析结果版本管理
- [ ] 跨用户缓存共享（团队版）
- [ ] AI 模型版本控制
- [ ] 自定义清理策略
- [ ] 缓存预热机制
- [ ] 多语言文件名支持

#### 技术升级

- [ ] Redis 缓存层（可选）
- [ ] 数据库分表（按用户）
- [ ] 异步任务队列（Bull/BullMQ）
- [ ] 微服务拆分

***

### 实施优先级矩阵

| 功能模块    | Phase 1 | Phase 2 | Phase 3 | 优先级 |
| ------- | ------- | ------- | ------- | --- |
| 基础 CRUD | ✅       | <br />  | <br />  | P0  |
| 文件哈希检测  | ✅       | <br />  | <br />  | P0  |
| 列表展示    | ✅       | <br />  | <br />  | P0  |
| 单条删除    | ✅       | <br />  | <br />  | P0  |
| 存储配置    | <br />  | ✅       | <br />  | P0  |
| 定时清理    | <br />  | ✅       | <br />  | P0  |
| 配方关联    | <br />  | ✅       | <br />  | P1  |
| 降级策略    | <br />  | ✅       | <br />  | P1  |
| 高级检索    | <br />  | <br />  | ✅       | P1  |
| 告警通知    | <br />  | <br />  | ✅       | P2  |
| 性能优化    | <br />  | <br />  | ✅       | P2  |

### 前端开发资源估算

| 阶段      | 组件数    | 页面数   | API 数  | 预计工时      |
| ------- | ------ | ----- | ------ | --------- |
| Phase 1 | 5      | 1     | 3      | 3 人天      |
| Phase 2 | 8      | 2     | 5      | 5 人天      |
| Phase 3 | 4      | 1     | 3      | 3 人天      |
| **总计**  | **17** | **4** | **11** | **11 人天** |

### 前端依赖关系

```
Phase 1 (基础功能)
├── SmartHistoryTab.vue (新增)
├── 统计卡片组件
├── 列表组件
└── 删除功能 (Popconfirm)
    ↓
Phase 2 (配置管理)
├── ParseResultConfig.vue (系统管理)
├── DegradationBanner.vue (降级状态)
└── 恢复解析功能
    ↓
Phase 3 (高级功能)
├── AlertNotification.vue (告警)
├── PerformanceIndicator.vue (性能)
└── 高级检索组件
```

***

***

## 13. Appendix

### 13.1 Glossary

| 术语   | 定义                        |
| ---- | ------------------------- |
| 文件哈希 | 使用 SHA-256 算法对文件内容计算的唯一标识 |
| 解析结果 | AI 解析后的结构化数据（配方/原料信息）     |
| 原始响应 | AI API 的完整原始返回            |
| 关联记录 | 已被应用到配方或原料的解析结果           |
| 存储上限 | 系统允许存储的最大解析结果数量           |

### 13.2 Related Documents

- [智能工具页面 PRD](./smart-tools-prd.md) - 智能工具整体功能设计
- [AI Agent 系统设计](../agent-system/) - Agent 系统架构文档

***

## 15. Review Checklist

- [x] 用户故事覆盖所有核心场景
- [x] 验收标准可测试、可量化
- [x] API 设计符合 RESTful 规范
- [x] 数据库表设计合理，索引完备
- [x] 安全隔离机制完整
- [x] 错误处理和边界条件考虑周全
- [x] 非目标明确，避免范围蔓延
- [x] 测试策略详细，覆盖单元/集成/E2E/性能测试
- [x] 前端实施规划完整（Phase 1-4）
- [x] 技术决策已明确（Tab 集成、Popconfirm、系统管理模块）
- [x] 实施优先级矩阵和依赖关系完整

***

**已确认事项**：

- ✅ 存储上限：默认 5000 条
- ✅ 文件大小限制：限制 5MB 以内的文件
- ✅ 版本策略：不保留历史版本
- ✅ 测试策略：需要详细测试策略

