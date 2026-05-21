# AGENTS.md

This file provides guidance to AI agents when working with this repository.

---

## 1. 项目概述

**TingStudio** — 食品配方（草本药材）工作数据管理平台。

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + Pinia + TDesign | SPA，端口 5173 |
| 后端 | Express + TypeScript (ESM) | REST API，端口 3000 |
| 数据库 | SQLite (dev) / MySQL (prod) | 通过 database-adapter.ts 统一 |
| 认证 | JWT | 7 天过期，admin / formulist |
| AI | DashScope / Zhipu / DeepSeek | 统一 AIService |
| 部署 | 腾讯云 SCF + EdgeOne | Serverless |

**数据隔离**：admin 可见全部数据，formulist 仅见自己创建的数据。

---

## 2. 目录结构（关键路径）

```
ting-studio/
├── frontend/src/
│   ├── api/           # Axios 封装（http.ts 响应自动解包）+ 业务模块
│   ├── stores/        # Pinia（useMaterialStore 等）
│   ├── views/         # 页面组件（materials/ formulas/ ai/ 等）
│   ├── components/    # 通用组件
│   ├── router/        # 懒加载路由
│   ├── utils/         # timeFormat.ts（时间格式化 + 数字缩略）
│   └── assets/styles/ # design-tokens.scss（设计令牌唯一定义源）
├── backend/src/
│   ├── config/        # database-adapter / security / rateLimit
│   ├── controllers/   # 控制器层
│   ├── routes/        # 路由定义（index.ts 汇总注册）
│   ├── middleware/     # auth / errorHandler / validate
│   ├── services/      # 业务逻辑（ai/ formula/ business/）
│   ├── utils/         # helpers / formulaExporter / logger
│   └── scripts/       # init.sql + migrations/
├── test/              # 临时测试文件
└── DESIGN.md          # 视觉设计令牌（颜色/字体/间距/组件）
```

---

## 3. 环境变量

### 后端

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 端口 | `3000` |
| `NODE_ENV` | 环境 | `development` |
| `JWT_SECRET` | JWT 密钥 | 生产必须强随机 |
| `CORS_ORIGIN` | 跨域源 | `http://localhost:5173` |
| `DB_TYPE` | 数据库类型 | `sqlite`（可选 `mysql`） |
| `AI_*_API_KEY` | DashScope/Zhipu/DeepSeek | 空 |

### 前端

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | API 路径（`/api`） |
| `VITE_AMAP_KEY` | 高德地图 Key（天气，可选） |

### Vite 代理

| 路径 | 目标 |
|------|------|
| `/api` | `localhost:3000` |
| `/amap` | `restapi.amap.com` |
| `/ip-api` | `ip-api.com` |

---

## 4. 模块依赖

```
Views → Stores → API Layer (http.ts) → Backend Routes → Controllers → Services → Config Layer → DB
```

- Controllers 禁止直连 DB，必须通过 Services
- 数据库统一 `database-adapter.ts` → `query()` 函数
- 前端禁止直调 axios，必须通过 `@/api/` 层

---

## 5. 关键约定

### 数据库查询

```ts
const [rows] = query("SELECT * FROM formulas WHERE id = ?", [id]);  // SELECT
query("INSERT INTO formulas (...) VALUES (...)", [values]);         // INSERT/UPDATE/DELETE
```

### 时间处理

后端返回 ISO 8601 UTC（`2026-05-03T14:21:47.611Z`），前端**禁止**直接渲染，**必须**用 `timeFormat.ts`：

```typescript
import { formatTimestamp, formatDate, formatCompact } from '@/utils/timeFormat'

formatTimestamp('2026-05-03T14:21:47.611Z') // → '2026-05-03 22:21:47'（本地时区）
formatDate('2026-05-03T14:21:47.611Z')      // → '2026-05-03'
formatCompact(12340000)                     // → '1234万'
```

紧凑布局可拆两行：第一行 `2026-05-05`，第二行 `16:19:12`。

**禁止** `toISOString()` 展示时间（返回 UTC）。

### 数据展示

| 场景 | 兜底文案 | 精度 |
|------|---------|------|
| 金额 | `'暂未录入'` | `.toFixed(2)` |
| 空值 | `'--'` | — |
| 偏差 | — | `.toFixed(1)`% |
| 营养占比 | — | `.toFixed(2)`% |

**禁止**：直接渲染 null/undefined、碍用 `t-dialog` 做二次确认（改用 `t-popconfirm`）。

### 营养成分计算

1. `ratio = (quantity / finishedWeight) × ratioFactor`（药材 0.18，辅料 1.0）
2. `Σ(per100g营养素 × ratio)`
3. 能量 = 蛋白质×17 + 脂肪×37 + 碳水×17
4. NRV% = (营养素 / NRV参考值) × 100
5. **0 界限归零**：能量 ≤17kJ、蛋白质≤0.5g、脂肪≤0.5g、碳水≤0.5g、钠≤5mg → 归零
6. 归零后**必须**重新计算能量

**禁止**跳过归零、混淆药材/辅料 ratio_factor。

### API 响应

```json
{ "success": true, "data": { ... } }
```

**前端 Axios 拦截器已自动解包**：API 调用直接返回 `data`。401 自动跳登录。`_silent: true` 禁用错误提示。

### ESM 模块

后端 `"type": "module"`，**所有 import 必须加 `.js`**：`import { query } from '../config/database.js'`

---

## 6. 样式控制 — 见 DESIGN.md

本项目使用 **DESIGN.md**（Google 设计令牌规范）锁死视觉风格。所有颜色、字体、间距、圆角、阴影、动效、组件样式**以 DESIGN.md 为唯一权威来源**。

文件：`./DESIGN.md`
校验：`npx @google/design.md lint DESIGN.md`

核心规则：
- **颜色**：必须用 CSS 变量 `var(--color-primary)` 或 SCSS 变量 `$brand-primary`，禁止硬编码 hex
- **圆角/间距**：必须用令牌 `var(--radius-md)` / `$space-4`，禁止任意值
- **字体大小**：必须用令牌 `var(--font-size-body)` / `$font-size-body`
- **设计令牌定义源**：`frontend/src/assets/styles/design-tokens.scss`

---

## 7. 已知限制与坑点

### 表格
- **禁止 `fixed` 列**（与 sticky header 冲突），用 `table-layout="auto"`
- `t-select` / `t-date-picker` 在卡片内 **必须** `:popup-props="{ appendToBody: true }"`

### 天气
- 高德地图 API，Vite 代理 `/amap` → `restapi.amap.com`
- 定位：高德IP → ip-api.com → 默认武汉

### AI
- 三 provider 可并存，NL2SQL 有 `sqlValidator.ts` 白名单校验

### 部署
- 开发: `npm run dev`（前后端同时启动），`npm run init-db` + `npm run seed`
- 构建: `npm run build`（含 vue-tsc 类型检查）
- 生产: PM2 (`npm run start`)
- 测试: `npm run test`（Vitest），`npm run test:e2e`（Playwright）

---

## 8. 参考

| 文档 | 路径 |
|------|------|
| 设计令牌 | `./DESIGN.md` |
| 代码规范 | `.trae/rules/code-style.md` |
| Git 规范 | `.trae/rules/git-commit.md` |
| 安全规范 | `.trae/rules/security.md` |
| API 规范 | `.trae/rules/api-design.md` |
| 数据库规范 | `.trae/rules/database-rules.md` |
| Vue 组件规范 | `.trae/rules/vue-component.md` |
| 构建部署 | `.trae/rules/build-deploy.md` |
| 错误处理 | `.trae/rules/error-handling.md` |
| PRD Skill | `github/awesome-copilot@prd`（已安装） |