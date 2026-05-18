# CLAUDE.md

此文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指导。

## 项目概览

**TingStudio v2.9.0** — 食品配方工作数据管理平台（中草药功效配方行业）。前后端分离架构：Vue 3 + Express + SQLite。

## 常用命令

### 开发

```bash
npm run dev                          # 同时启动前后端（concurrently）
cd backend && npm run dev            # tsx watch，端口 3000
cd frontend && npm run dev           # Vite，端口 5173
```

### 构建

```bash
npm run build                        # 后端 tsc + 前端 vite build
cd backend && npm run build          # 仅后端编译到 dist/
cd frontend && npm run build         # 仅前端构建
```

### 数据库

```bash
cd backend && npm run init-db        # 初始化表结构
cd backend && npm run seed           # 填充示例数据
cd backend && npx tsx src/scripts/migrations/createParseResultTables.ts  # 迁移脚本
```

### 测试

```bash
cd backend && npm run test           # Vitest
cd frontend && npm run test:run      # Vitest
cd frontend && npm run test:e2e      # Playwright
cd frontend && npm run test:coverage
```

### 开发注意事项

- 后端用 `tsx watch` 运行 TypeScript 源码，修改自动重启
- 生产部署用 `node dist/index.js`（需先 `npm run build`）
- 如果修改了后端代码但生产环境未生效，先检查 `dist/` 是否已重新编译

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite 5, Composition API + `<script setup>` |
| UI 组件库 | TDesign Vue Next v1.9 |
| 状态管理 | Pinia（18 个 Store） |
| 路由 | Vue Router 4（懒加载） |
| 后端框架 | Express + TypeScript（ESM） |
| 数据库 | SQLite（better-sqlite3）WAL 模式，或 MySQL（mysql2） |
| 认证 | JWT Bearer Token（jsonwebtoken + bcryptjs），双角色 admin / formulist |
| AI 集成 | DeepSeek / 通义千问 / 智谱 GLM，SSE 流式 + 非流式 |
| 图表 | ECharts 6 |
| 测试 | Vitest + Playwright + vue-test-utils + supertest + MSW |

## 数据隔离

- **admin**：可查看所有配方/原料/业务员
- **formulist（普通用户）**：只能查看和操作自己创建的数据

## 架构要点

### 分层

```
后端：routes → controllers（轻量）→ services（业务逻辑）→ database
前端：View (Vue page) → Store (Pinia action) → API (axios) → 后端
```

### 后端中间件顺序

`helmet → cors → compression → morgan → express.json → requestLogger → optionalAuth`

- `optionalAuth`：全局，可选解析 Token；`authMiddleware`：路由级，强制要求
- 所有 Controller 使用 `try/catch` + `next(error)` 模式

### AI Agent 系统（核心特色）

位于 `backend/src/services/ai/agent/`，12 个子模块：

- `agentChatController.ts` — ReAct 流式聊天控制器（SSE）
- `agentController.ts` — 意图路由、对话管理
- `intentEngine.ts` — 意图识别（查询/创建/修改/删除）
- `toolRegistration.ts` — 工具注册（配方/原料 CRUD）
- `llmService.ts` — LLM 流式调用
- `promptEngine.ts` — 提示词引擎 v3.0.0
- `agentWriteGuard.ts` — 写操作权限守卫
- `sessionStore.ts` — SQLite 持久化会话
- 前端对应：`frontend/src/components/AiAssistantFloat/`（8 个组件）

### 解析结果缓存

智能填单（配方解析 + 原料营养解析）使用文件 MD5 哈希做缓存去重：

1. 上传文件 → 计算 `crypto.createHash("md5").update(fileContent).digest("hex")`
2. 查询 `parse_results WHERE user_id + file_hash + status='success' + call_type`
3. 命中则直接返回缓存结果，不调用 AI API
4. 未命中则调用 AI → 保存结果到 `parse_results` → 返回

后端修改后务必重新编译 `dist/`，否则可能运行过时代码。

## 关键约定

### 数据库查询

```typescript
// SELECT 返回数组，需解构
const [rows] = query("SELECT * FROM formulas WHERE id = ?", [id]);

// INSERT/UPDATE/DELETE
query("INSERT INTO formulas (...) VALUES (...)", [values]);
```

### ESM 模块

后端 `package.json` 设置 `"type": "module"`，所有内部 import **必须包含 `.js` 扩展名**：

- ✅ `import { query } from '../config/database.js'`
- ❌ `import { query } from '../config/database'`

### API 响应格式

```json
{ "success": true, "data": { ... } }
```

前端 Axios 拦截器自动解开 `data` 包装，API 调用直接返回数据体。401 自动清除 Token 并跳转登录页。

### 时间处理

- 后端存储/返回：ISO 8601 UTC（带 `Z`），如 `2026-05-03T14:21:47.611Z`
- 前端展示：本地时区可读格式，使用 `@/utils/timeFormat.ts` 中的 `formatTimestamp()`
- 禁止使用 `toISOString()` 展示时间（返回 UTC）
- 禁止直接渲染原始 UTC 字符串

### 数据展示规范

| 场景 | 规则 |
|------|------|
| 金额/价格 | 保留 2 位小数，null 显示"暂未录入" |
| 百分比 | 分子为 0 时显示 `0%`，非 0 时保留 1-2 位 |
| 空值/null | 价格用"暂未录入"，普通文本用 `--`，无操作用"暂无" |
| 数字缩略 | 使用 `formatCompact()`：`1234` → `1.2K`，`12340000` → `1234万` |
| 日期（无时间） | 使用 `formatDate()`：`2026-05-03T14:21:47.611Z` → `2026-05-03` |

### 二次确认交互

所有删除/批量/危险操作使用 `t-popconfirm` 气泡确认框，禁止使用 `t-dialog` 弹窗。

### TDesign 组件避坑

- 禁止使用 `fixed` 列（与全局 `position: sticky` 顶栏冲突），用 `table-layout="auto"`
- 卡片内的 `t-select` / `t-date-picker` 必须加 `:popup-props="{ appendToBody: true }"`，防止被 `overflow: hidden` 裁剪

## 环境变量

### 后端必填

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 3000 |
| `JWT_SECRET` | JWT 签名密钥 |
| `CORS_ORIGIN` | 允许的跨域源，开发环境 `http://localhost:5173` |

### 后端可选

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_TYPE` | 数据库类型 | `sqlite`（可选 `mysql`） |
| `AI_DASHSCOPE_API_KEY` | 阿里云 DashScope | 空 |
| `AI_ZHIPU_API_KEY` | 智谱 GLM | 空 |
| `AI_DEEPSEEK_API_KEY` | DeepSeek | 空 |

### 前端

| 变量 | 说明 |
|------|------|
| `VITE_AMAP_KEY` | 高德地图 Web 服务 API Key（天气功能，可选） |

### AI Provider Base URL

| Provider | Base URL |
|----------|----------|
| DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Zhipu | `https://open.bigmodel.cn/api/paas/v4` |
| DeepSeek | `https://api.deepseek.com/v1` |
