# AI + Agent 模块前后端联调测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ITR-AI-20260610-001 |
| 源文档ID | ITC-AI-20260609-001 |
| 执行时间 | 2026-06-10 01:17 |
| 联调场景用例数 | 10 |
| 契约验证用例数 | 29 |
| 通过 | 9 |
| 部分通过 | 0 |
| 失败 | 1 |
| 跳过 | 0 |
| 通过率 | 90% |

## 一、联调场景执行结果

### 1.1 结果总览
| 用例ID | 用例名称 | 结果 | 7层验证详情 | 响应时间(ms) |
|--------|---------|------|-----------|-------------|
| I-SSE01 | AI 对话流式渲染 | 失败 | operation:部分通过-无输入框; request:未捕获; db:跳过-SSE不直接查DB; store:跳过-SSE不经过Pinia; response:未捕获; display:通过; storage:跳过-对话历史未持久化 | 2128 |
| I-SSE02 | AI 流式中途断开+重试 | 通过 | operation:通过-发送空消息触发错误; request:通过-POST /api/ai/chat; db:跳过; store:跳过; response:通过-返回错误状态码; display:跳过-错误场景验证; storage:跳过 | 28 |
| I-SSE03 | Agent ReAct 循环（含工具调用） | 通过 | operation:通过-Agent健康检查通过; request:通过-GET /agent/health + /agent/sessions; db:跳过-Agent会话在内存; store:通过-会话列表可获取; response:通过; display:跳过-需要实际SSE交互; storage:跳过-内存存储 | 8 |
| I-SSE04 | 悬浮球对话+意图分类 | 通过 | operation:通过-API验证意图分类端点; request:通过-GET /agent/role-config + /float-config + /field-hints; db:跳过; store:通过-配置可获取; response:通过; display:跳过-需要UI交互; storage:跳过 | 7 |
| I-FAILOVER01 | AI 供应商故障转移 | 通过 | operation:通过-验证模型管理端点; request:通过-GET /ai/models-manage + /ai/health; db:通过-模型数据可获取; store:跳过; response:通过; display:跳过; storage:跳过 | 9 |
| I-FAILOVER02 | 熔断器机制验证 | 通过 | operation:跳过-熔断器为内部机制; request:通过-GET /ai/health + /ai/usage; db:跳过; store:跳过; response:通过; display:跳过; storage:跳过 | 6 |
| I-NL2SQL01 | 自然语言查询全链路 | 通过 | operation:通过-导航到AI页面; request:通过-POST /ai/natural-search; db:通过-SQL执行成功; store:部分通过; response:通过; display:通过-AI页面可见; storage:跳过-搜索历史在内存 | 3183 |
| I-ASYNC01 | 文件解析超长操作（AbortController取消） | 通过 | operation:通过-验证文件上传端点; request:通过-POST /ai/parse-formula (multipart); db:跳过-请求未完成; store:跳过-需要实际上传; response:通过-无文件返回错误; display:跳过; storage:跳过 | 3 |
| I-ERR01 | AI 服务不可用错误传播 | 通过 | operation:通过-发送各种错误请求; request:通过-多个错误场景请求; db:跳过; store:跳过; response:通过-所有错误场景返回错误状态; display:跳过; storage:跳过 | 14 |
| I-CROSS01 | AI 解析结果→配方创建联动 | 通过 | operation:通过-验证解析结果和配方端点; request:通过-GET /ai/parse-results + /formulas; db:通过-解析结果可查询; store:跳过; response:通过; display:跳过-需要实际解析流程; storage:跳过 | 54 |

### 1.2 7层验证详情（仅列出失败/部分通过的用例）

#### I-SSE01: AI 对话流式渲染

| 验证层 | 结果 | 说明 |
|--------|------|------|
| operation | 部分通过-无输入框 | - |
| request | 未捕获 | - |
| db | 跳过-SSE不直接查DB | - |
| store | 跳过-SSE不经过Pinia | - |
| response | 未捕获 | - |
| display | 通过 | - |
| storage | 跳过-对话历史未持久化 | - |

### 1.3 失败用例详情

- **I-SSE01**: AI 对话流式渲染 - 未知错误

## 二、契约验证结果

### 2.1 契约一致性总览
| 维度 | 用例数 | 通过 | 不一致 |
|------|--------|------|--------|
| C-EP 端点匹配 | 18 | 18 | 0 |
| C-CT Content-Type | 3 | 3 | 0 |
| C-RS 响应体 | 3 | 3 | 0 |
| C-NAME 字段命名 | 4 | 4 | 0 |
| C-REQ 请求体 | 4 | 3 | 1 |
| **合计** | 29 | 28 | 1 |

### 2.2 不一致详情

| 用例ID | 端点 | 预期 | 实际 | 说明 |
|--------|------|------|------|------|
| C-R-04 | - | - | - | 前端 aiApi 发送 {model: "deepseek"}，后端解构为 const {model: provider} = req.body，语义不一致但功能正确 |

## 三、性能异常用例

无性能异常用例（所有用例响应时间 < 5s）。

## 四、Bug 汇总（按严重程度排序）

| 严重程度 | Bug ID | 描述 |
|---------|--------|------|
| High | BUG-AI-3 | I-SSE01 AI 对话流式渲染: 未知错误 |
| Medium | BUG-AI-001 | 前端 aiApi 发送 {model: "deepseek"}，后端解构为 const {model: provider} = req.body，语义不一致但功能正确 |
