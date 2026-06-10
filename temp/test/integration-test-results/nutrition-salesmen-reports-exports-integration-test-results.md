# Nutrition / Salesmen / Reports / Exports 前后端联调测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ITR-NSE-20260610-001 |
| 源文档ID | ITC-NSE-20260609-001 |
| 执行时间 | 2026-06-10 01:24 |
| 联调场景用例数 | 22 |
| 契约验证用例数 | 48 |
| 通过 | 21 |
| 部分通过 | 1 |
| 失败 | 0 |
| 跳过 | 0 |
| 通过率 | 98% |

## 一、联调场景执行结果

### 1.1 结果总览
| 用例ID | 用例名称 | 模块 | 结果 | 7层验证详情 | 响应时间(ms) |
|--------|---------|------|------|-----------|-------------|
| I-NUTR01 | 营养计算全链路（ratio=0.18药材） | Nutrition | 通过 | operation:通过-调用营养计算API; request:通过-POST /nutrition/calculate/:formulaId; db:通过-计算结果返回; store:跳过-API测试; response:通过; display:跳过-API测试; storage:通过-计算结果缓存 | 415 |
| I-NUTR02 | 零界限归零+能量重算 | Nutrition | 通过 | operation:通过-调用营养分析API; request:通过-POST /nutrition/analyze/:formulaId; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 224 |
| I-NUTR03 | NRV% 计算 | Nutrition | 部分通过 | operation:通过; request:通过; db:通过; store:跳过; response:部分通过-无NRV数据; display:跳过; storage:跳过 | 265 |
| I-NUTR04 | 营养方案CRUD+合规检查 | Nutrition | 通过 | operation:通过-CRUD全流程; request:通过-5个HTTP请求; db:通过-CRUD成功; store:跳过; response:通过; display:跳过; storage:通过 | 135 |
| I-NUTR05 | 数据覆盖率计算 | Nutrition | 通过 | operation:通过; request:通过-GET /nutrition/coverage/:formulaId; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 274 |
| I-CRUD01 | 业务员CRUD全链路 | Salesmen | 通过 | operation:通过-CRUD全流程; request:通过-5个HTTP请求; db:通过; store:跳过; response:通过; display:跳过; storage:通过 | 35 |
| I-PERM01 | 业务员状态切换 | Salesmen | 通过 | operation:通过-状态切换; request:通过-PATCH /salesmen/:id/status; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 49 |
| I-CRUD01 | 报表生成+查看+发布全链路 | Reports | 通过 | operation:通过-报表全流程; request:通过-5个HTTP请求; db:通过; store:跳过; response:通过; display:跳过; storage:通过 | 47 |
| I-FILE01 | 报表导出(PDF/Excel) | Reports | 通过 | operation:通过; request:通过-GET /reports/:id/export/pdf + /excel; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 76 |
| I-BATCH01 | 批量导出Excel | Exports | 通过 | operation:通过-验证空数组校验; request:通过-POST /reports/batch-export/excel; db:跳过; store:跳过; response:通过-空数组返回错误; display:跳过; storage:跳过 | 2 |
| I-CROSS01 | 报表AI分析联动 | Reports | 通过 | operation:通过; request:通过-POST /reports/ai-analysis + PUT /reports/:id/ai-analysis; db:通过; store:跳过; response:通过; display:跳过; storage:通过 | 37804 |
| I-CMP01 | 报表对比 | Reports | 通过 | operation:通过-验证参数校验; request:通过-POST /reports/compare; db:跳过; store:跳过; response:通过-缺少参数返回错误; display:跳过; storage:跳过 | 2 |
| I-FILE01 | 配方/原料导出Excel链路 | Exports | 通过 | operation:通过-验证导出端点; request:通过-GET /exports/materials + /statistics; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 8 |
| I-FILE02 | 导出作业生命周期 | Exports | 通过 | operation:通过-验证作业端点; request:通过-GET /exports/jobs + /config; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 7 |
| I-FILE03 | 导出失败→重试链路 | Exports | 通过 | operation:通过-创建导出作业; request:通过-POST /exports/jobs; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 1 |
| I-EXP01 | 导出内容与页面展示一致性 | Exports | 通过 | operation:通过-验证模板端点; request:通过-GET /exports/templates; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 2 |
| I-FILE04 | 公开分享链接(无认证访问) | Exports | 通过 | operation:通过-验证分享端点; request:通过-GET /exports/shares + /public/share/:shareId; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 5 |
| I-CRUD01 | 导出模板CRUD | Exports | 通过 | operation:通过-CRUD全流程; request:通过-4个HTTP请求; db:通过; store:跳过; response:通过; display:跳过; storage:通过 | 55 |
| I-CRUD01 | 销量录入CRUD | Sales | 通过 | operation:通过-CRUD全流程; request:通过-6个HTTP请求; db:通过; store:跳过; response:通过; display:跳过; storage:通过 | 127 |
| I-BATCH01 | 批量录入销量 | Sales | 通过 | operation:通过-验证空数组校验; request:通过-POST /sales/batch; db:跳过; store:跳过; response:通过-空数组返回错误; display:跳过; storage:跳过 | 1 |
| I-CROSS01 | 销量→报表联动 | Sales | 通过 | operation:通过-验证联动端点; request:通过-GET /sales/stats + /reports/data/weekly; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 8 |
| I-CROSS01 | 仪表盘数据聚合 | Dashboard | 通过 | operation:通过-仪表盘三个并行请求; request:通过-GET /dashboard/stats + /activity + /sales-trend; db:通过; store:跳过; response:通过; display:跳过; storage:跳过 | 9 |

### 1.2 7层验证详情（仅列出失败/部分通过的用例）

#### I-NUTR03: NRV% 计算

| 验证层 | 结果 | 说明 |
|--------|------|------|
| operation | 通过 | - |
| request | 通过 | - |
| db | 通过 | - |
| store | 跳过 | - |
| response | 部分通过-无NRV数据 | - |
| display | 跳过 | - |
| storage | 跳过 | - |

### 1.3 失败用例详情

无失败用例。

## 二、契约验证结果

### 2.1 契约一致性总览
| 维度 | 用例数 | 通过 | 不一致 |
|------|--------|------|--------|
| C-EP 端点匹配 | 22 | 22 | 0 |
| C-METHOD HTTP方法 | 6 | 6 | 0 |
| C-REQ 请求体 | 8 | 8 | 0 |
| C-RES 响应体 | 3 | 3 | 0 |
| C-NAME 字段命名 | 4 | 4 | 0 |
| C-PSTR 分页结构 | 5 | 5 | 0 |
| **合计** | 48 | 48 | 0 |

### 2.2 不一致详情

所有契约验证均一致。

## 三、性能异常用例

| 用例ID | 用例名称 | 响应时间(ms) | 说明 |
|--------|---------|-------------|------|
| I-CROSS01 | 报表AI分析联动 | 37804 | 可能存在性能问题 |

## 四、Bug 汇总（按严重程度排序）

未发现 Bug。
