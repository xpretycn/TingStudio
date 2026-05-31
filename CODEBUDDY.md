# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Project Overview

TingStudio is a food formula (herbal medicine) recipe data management platform. Monorepo with separate frontend (Vue 3) and backend (Express + SQLite). Authentication uses JWT with two roles: `admin` and `formulist`. Data isolation: regular users only see their own formulas/materials; admins see all.

## Common Commands

### Root (monorepo orchestration)
- `npm run dev` — Start both frontend and backend concurrently (concurrently)
- `npm run build` — Build both backend (`tsc`) and frontend (`vue-tsc && vite build`)
- `npm run init-db` — Initialize SQLite database schema (runs backend initDatabase.ts)
- `npm run seed` — Populate seed data (30 test users, sample formulas/materials/salesmen)
- `npm run start` — Run production backend (`node dist/index.js`, port 3000)

### Backend (backend/)
- `npm run dev` — Dev server with hot reload (tsx watch, port 3000)
- `npm run build` — Compile TypeScript to dist/
- `npm run build:deploy` — esbuild 打包（部署用）
- `npm run build:scf` — esbuild 打包（云函数用）
- `npm run init-db` — Initialize DB tables (13 tables via init.sql)
- `npm run seed` — Seed data
- `npm run import-nutrition` — Import nutrition data from Excel
- `npm run test` — vitest 单元测试
- `npm run test:coverage` — vitest 覆盖率报告

### Frontend (frontend/)
- `npm run dev` — Vite dev server (port 5173, proxies /api to localhost:3000)
- `npm run build` — Type-check then build (`vue-tsc && vite build`)
- `npm run build:deploy` — vite 构建（跳过类型检查，部署用）
- `npm run preview` — Preview production build
- `npm run test` — vitest 单元测试
- `npm run test:e2e` — Playwright E2E 测试

### 代码质量验证（可选）
- `cd frontend && npm run lint` — ESLint 检查（可选）
- `cd frontend && npm run lint:fix` — 自动修复（可选）
- `cd frontend && npm run typecheck` — vue-tsc 类型检查（可选）

> **注意**：代码质量验证（lint / typecheck）**不作为任务完成的强制要求**，以任务完成速度优先。仅在用户明确要求、提交/合入 PR 前、或构建/部署前发现明显错误时按需运行。

## Architecture

### Backend (Express + better-sqlite3)

Entry: `backend/src/index.ts` — Bootstrap Express with helmet, cors, compression, morgan. All routes mounted under `/api`.

**Database layer** (`config/database.ts`): Uses `better-sqlite3` with WAL mode. The `query()` helper wraps `prepare().all()` for SELECTs (returns `[rows]` array destructurable pattern) and `prepare().run()` for mutations. Use `transaction()` for multi-statement atomicity. Schema defined in `scripts/init.sql` (13 tables).

**AI service layer** (`services/ai/AIService.ts`): Unified OpenAI-compatible chat completion interface supporting three providers: DashScope (Alibaba Qwen), Zhipu GLM, and DeepSeek. Each provider has a text model and optional vision model (`visionModel` field). The `chatCompletion()` method handles provider-specific logic (e.g., skipping `response_format` for Zhipu vision models). Configuration via environment variables: `AI_DASHSCOPE_API_KEY`, `AI_ZHIPU_API_KEY`, `AI_DEEPSEEK_API_KEY`. The AI controller (`controllers/aiController.ts`) provides three endpoints: `POST /api/ai/parse-formula` (file upload + AI parsing with material fuzzy matching), `POST /api/ai/natural-search` (NL2SQL with safety validation via `sqlValidator.ts`), and `GET /api/ai/models` (available model list).

**Route pattern**: 9 route modules registered in `routes/index.ts`: auth, materials, formulas, salesmen, versions, exports, nutrition, import, ai. Routes apply `authMiddleware` for protected endpoints.

**Controller pattern**: Each controller imports `query` and `transaction` from database config. Controllers use `const [rows] = query(sql, params)` for SELECTs. All responses follow `{ success: true/false, data?, message? }` format.

**Key files**: `middleware/auth.ts` (JWT verify + `AuthRequest` type extension), `middleware/errorHandler.ts`, `middleware/validate.ts`, `utils/formulaExporter.ts` (Excel export), `utils/formulaPdfExporter.ts` (PDF via pdfkit), `utils/sqlValidator.ts` (SQL whitelist for AI NL2SQL), `services/ai/AIService.ts` (unified OpenAI-compatible AI service with multi-provider switching), `services/ai/prompts.ts` (formula parsing + NL2SQL prompt templates).

**ESM project**: Backend uses `"type": "module"` in package.json. All internal imports must include `.js` extension (e.g., `import { query } from '../config/database.js'`).

### Frontend (Vue 3 + Pinia + TDesign)

Entry: `frontend/src/main.ts`. Layout: `Home.vue` provides left-sidebar navigation + right content area. All authenticated routes are children of Home.

**API layer** (`src/api/`): `http.ts` creates an Axios instance with `baseURL: '/api'`. The response interceptor **unwraps `response.data.data`** — API calls receive the actual data directly, not the `{ success, data }` wrapper. 401 errors clear tokens and redirect to `/login`. Each domain has its own API module (auth.ts, formula.ts, material.ts, etc.) exporting typed functions. **Exception**: `weather.ts` uses its own independent Axios instance (via Vite proxy `/amap`) to call **Gaode (AMap) Map** Web API directly from the browser — it does NOT go through the backend.

**State management** (`src/stores/`): Pinia stores mirror backend modules. Each store manages loading state, data, and async fetch/create/update/delete actions. Stores call API modules and assign results directly (no `.data` unwrapping needed — the interceptor handles it). **Exception**: `weather.ts` store manages weather state (loading/error/rate-limit), 30-minute in-memory cache, Geolocation auto-positioning (10s timeout), and city persistence via localStorage (`ting-weather-city`). Call `weatherStore.init()` in `onMounted` to trigger auto-location + cached weather fetch.

**Router** (`src/router/index.ts`): All authenticated routes nested under Home.vue. Route guard checks `authStore.isAuthenticated`, redirects to `/login` if not. Lazy-loaded components throughout.

**Path alias**: `@` resolves to `frontend/src/` (configured in both `vite.config.ts` and `tsconfig.json`).

**Styling system**:
- `assets/styles/design-tokens.scss` — 250+ SCSS variables (colors, spacing, shadows, etc.). Auto-injected globally via Vite `additionalData`. These are **compile-time constants** and do NOT change at runtime.
- `assets/styles/variables.scss` — Compatibility entry that `@forward`s design-tokens.scss + provides backward-compatible aliases (`$primary-color` → `$brand-primary`, etc.) + stagger mixin. Also auto-injected via Vite `additionalData`.
- `assets/styles/theme-variables.scss` — **CSS custom properties** for runtime theming. Defines 4 brand colors x 2 modes = 8 variable sets via `[data-brand="pink|yellow|blue|green"][data-theme="dark"]` selectors.
- `assets/styles/tokens.ts` — JS-importable color constants for charts/gradients. Also exports `getThemeTokens(isDark, brandColor)` and `getTDesignTokens(isDark, brandColor)` utility functions.
- `assets/styles/_a11y.scss` — Theme transition animations (300ms smooth transition on theme/brand switch).
- `assets/styles/main.scss` — Global TDesign style overrides (`::v-deep` selectors for buttons, inputs, tables, etc.)

**Theme & Brand Color system** (`stores/theme.ts`):
- Two independent dimensions: `mode` (auto/light/dark) and `brandColor` (pink/yellow/blue/green).
- `auto` mode listens to `prefers-color-scheme` via `matchMedia` and resolves to `light` or `dark`.
- `applyToDOM()` sets `<html data-theme="dark" data-brand="blue" data-theme-transitioning>` attributes.
- Both values persisted in `localStorage`: `ting-theme` (mode) and `ting-brand-color` (brand color).
- `index.html` has an inline blocking script to set these attributes before DOM render (FOUT prevention).
- `App.vue` passes dynamic brand color token to `<t-config-provider>` via `getTDesignTokens()`.
- **Convention**: Use CSS `var(--color-primary)` instead of SCSS `$brand-primary` for brand-color-dependent styles in `.vue` files. SCSS variables are compile-time constants and won't switch at runtime. Only Home.vue has been migrated so far; other files still use hardcoded pink SCSS variables (acceptable degradation for non-pink brand colors).

**Component patterns**: Pages follow List → Detail → Form structure. List pages use `t-table` with `table-layout="auto"`. Forms use TDesign `t-form` with `vee-validate` + `yup` rules including `trigger: 'blur'`. All pages use `PageSkeleton` component for loading states.

**Build optimization**: Vite config splits vendor chunks into three groups: `vendor-tdesign`, `vendor-vue` (vue/vue-router/pinia), and `vendor-utils` (all other node_modules). Gzip compression enabled for assets > 1KB.

### Key Conventions

- **No `fixed` columns in tables**: The global sticky header (`position: sticky` on `.t-table__header` in Home.vue) conflicts with TDesign's `getBoundingClientRect` for fixed columns. Use `table-layout="auto"` instead.
- **Database queries return `[rows]`**: The `query()` helper wraps SELECT results in an array for destructuring (`const [list] = query(...)`).
- **API responses auto-unwrapped**: Frontend API calls receive `response.data.data` directly due to Axios interceptor.
- **SCSS variables are global**: Any `.vue` file can use `$brand-primary`, `$text-primary`, `$space-4`, etc. directly without imports. But these are compile-time constants.
- **CSS variables for runtime theming**: For brand-color-dependent styles, prefer `var(--color-primary)` over `$brand-primary`. CSS custom properties resolve at runtime and respect `data-brand`/`data-theme` attributes.
- **TDesign select dropdown z-index**: Always use `:popup-props="{ appendToBody: true }"` on `t-select` and `t-date-picker` inside cards to prevent dropdown being clipped by card overflow.
- **Workspace is npm workspaces**: Root `package.json` uses `--workspace=backend/frontend` for script delegation.
- **No test framework configured**: There are no unit or integration tests. Use `npm run build` (vue-tsc + tsc) as the primary validation.
- **Weather API**: Uses **Gaode (AMap) Map** Web Service API. Env var: `VITE_AMAP_KEY`. Weather query path: `/v3/weather/weatherInfo`. Geo path: `/v3/geocode/regeo`. Keyword search path: `/v3/place/text`. IP location: `/v3/ip`. Fallback: ip-api.com → default city Wuhan.
- **Auth profile API**: `PUT /api/auth/me` updates user profile fields (display_name, avatar, bio, email, phone) with uniqueness validation. `PUT /api/auth/change-password` verifies old password before updating. `GET /api/auth/me` returns full user info including profile fields.

---

## API 设计规范

### 1. 路由结构

- 所有 API 路由挂载在 `/api` 前缀下
- 路由按业务模块分文件：`auth.ts`、`formulas.ts`、`materials.ts` 等
- 路由文件统一在 `backend/src/routes/index.ts` 中注册
- 新增模块**必须**在 `createAppRouter()` 中注册

### 路由命名规则

```
GET    /api/{resource}          — 列表查询
GET    /api/{resource}/:id      — 详情查询
POST   /api/{resource}          — 新增
PUT    /api/{resource}/:id      — 更新
DELETE /api/{resource}/:id      — 删除
```

- 资源名使用复数形式：`/materials`、`/formulas`、`/salesmen`
- 路径使用 kebab-case：`/excel-import`、`/nutrition-profiles`

### 2. 响应格式

**成功响应**：`{ "success": true, "data": { ... } }`

**分页响应**：
```json
{
  "success": true,
  "data": {
    "list": [...],
    "pagination": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 }
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "error": { "message": "Error description", "code": "ERROR_CODE", "timestamp": "2026-05-14T00:00:00.000Z" }
}
```

### 3. 错误码规范

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `TOKEN_EXPIRED` | 401 | Token 过期 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `DUPLICATE_ENTRY` | 409 | 重复数据 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 4. 控制器结构

- 控制器文件放在 `backend/src/controllers/` 下
- 每个控制器函数**必须**用 try-catch 包裹
- 使用项目已有的 `success()`、`successWithPagination()` 工具函数返回成功响应
- 错误通过 `next(error)` 传递给错误中间件，或直接设置 `res.status()` 返回

### 5. 请求验证

- 使用 `validateBody()` 中间件验证请求体
- 验证规则定义在路由层，不在控制器中
- 必填字段和类型**必须**声明验证规则

### 6. 前端 API 调用

- 前端统一使用 `@/api/http.ts` 封装的 axios 实例
- API 文件按模块分文件：`@/api/material.ts`、`@/api/formula.ts`
- Token 自动通过请求拦截器注入
- 401 响应自动跳转登录页
- 使用 `_silent: true` 配置可静默请求（不弹出错误提示）

### 7. API 禁止行为

- 禁止在控制器中直接操作数据库，应通过 service 层
- 禁止跳过 `validateBody` 直接使用未校验的用户输入
- 禁止在响应中返回数据库原始字段名（snake_case），应转换为 camelCase
- 禁止新增 API 时不注册到路由汇总文件

---

## 代码风格规范

### 1. TypeScript 配置

- 后端 `tsconfig.json` 已启用 `strict: true`，新增代码应尽量避免类型错误
- 前端 `vue-tsc --noEmit` 为构建前置检查（CI 执行），开发阶段不强求
- **禁止使用 `any` 类型**：所有代码中**不允许出现 `any`**，必须使用具体类型

| 场景 | 替代 `any` 的方案 |
|------|------------------|
| 任意对象 | `Record<string, unknown>` |
| 未知类型 | `unknown`（需要类型守卫后才能使用） |
| 确定的接口 | 定义具体的 `interface` 或 `type` |
| 第三方库缺失类型 | 在 `types/` 下补充 `.d.ts` 声明文件 |

- 目标编译版本：ES2022

### 2. 命名约定

**变量与函数**：camelCase — `getUserInfo`、`formulaList`；常量：UPPER_SNAKE_CASE — `JWT_SECRET`；布尔变量：is/has/can 前缀 — `isLoading`

**类与接口**：PascalCase — `AIService`、`UserInfo`；类型文件统一放在 `types/` 目录下

**文件命名**：
- 后端源文件：camelCase — `formulaController.ts`
- 前端 Vue 组件：PascalCase — `MaterialList.vue`
- 前端工具/API/Store：camelCase — `timeFormat.ts`、`auth.ts`
- 测试文件：与源文件同名 + `.test.ts` / `.spec.ts`

### 3. Import 顺序

按以下分组排列，组间空一行：
1. Node 内置模块（path, crypto, fs...）
2. 第三方库（express, axios, jwt...）
3. 项目内部模块（使用 @/ 或相对路径）

### 4. 路径别名

- 后端：`@/*` → `./src/*`（tsconfig paths 已配置）
- 前端：`@/*` → `./src/*`（vite resolve.alias 已配置）
- 优先使用别名路径，避免深层 `../../../` 相对路径

### 5. 代码格式

- 缩进：2 空格
- 字符串：优先双引号 `"`（与项目现有代码一致）
- 末尾分号：不强制，与周围代码保持一致
- 行宽：建议 120 字符以内
- 尾随逗号：多行结构使用尾随逗号

### 6. 代码风格禁止行为

- 禁止使用 `// @ts-ignore`，应通过正确类型定义解决问题（可用 `@ts-expect-error` 并注释原因）
- 禁止在业务逻辑中使用 `console.log`，使用项目已有的 `logger` 工具
- **禁止声明但未使用**：禁止存在已声明但未使用的变量、函数、import、类型定义
- 禁止硬编码魔法数字，应提取为命名常量
- 禁止使用 `any` 类型，必须定义具体类型

---

## 数据库规范

### 1. 数据库选型

- 开发环境：SQLite（better-sqlite3 / sql.js）
- 生产环境：MySQL（mysql2）
- 数据库适配层：`backend/src/config/database-adapter.ts` 统一封装
- **禁止**直接使用特定数据库的 API，必须通过适配层的 `query()` 函数

### 2. 表命名规范

- 表名：snake_case 复数形式 — `users`、`formulas`、`materials`、`nutrition_profiles`
- 字段名：snake_case — `created_at`、`salesman_id`、`formula_code`
- 关联字段：`{关联表单数}_id` — `salesman_id`、`formula_id`
- 布尔字段：`is_` 前缀 — `is_preset`、`is_active`

### 3. 必备字段

每张表**必须**包含：`id VARCHAR(36) PRIMARY KEY`（UUID，使用 generateId() 生成）、`created_at DATETIME NOT NULL`、`updated_at DATETIME NOT NULL`。业务表还应包含 `created_by VARCHAR(36)`。

### 4. 数据库迁移

- 迁移脚本放在 `backend/src/scripts/migrations/` 目录下
- 迁移脚本命名：`add{描述}To{表名}.ts` — 如 `addIsPresetToProfiles.ts`
- **禁止**直接修改生产数据库表结构，必须通过迁移脚本
- 迁移脚本**必须**是幂等的（可重复执行不出错）

### 5. 查询规范

- **必须**使用参数化查询，禁止字符串拼接 SQL
- 分页查询使用 `buildPagination()` 和 `successWithPagination()` 工具
- 模糊搜索使用 `buildLike()` 工具
- 查询结果字段名转换使用 `rowToCamelCase()` / `rowsToCamelCase()`
- 大批量查询**必须**使用分页，默认每页 20 条，最大 100 条

### 6. 数据备份

- 备份文件存放在 `backend/data/backup/` 目录
- 备份文件命名：`tingstudio_backup_{时间戳}.json`
- **禁止**将 `.db` 数据库文件提交到 Git

### 7. 数据库禁止行为

- 禁止在控制器中直接写 SQL，应通过 service 层或工具函数
- 禁止使用 `SELECT *`，应明确列出所需字段
- 禁止在生产环境执行 `DROP TABLE` 或 `DELETE` 不带 WHERE
- 禁止将数据库连接信息硬编码在代码中
- 禁止提交 `.db`、`.db-wal`、`.db-shm` 文件到版本库

---

## 设计令牌规范

- 所有颜色、字体、间距、圆角、阴影、动效、组件样式**必须**以 `DESIGN.md` 中的令牌为准
- 新增样式时**必须**引用设计令牌，禁止硬编码任意值
- 颜色：使用 `var(--color-primary)` 或 SCSS `$brand-primary`
- 间距：使用 `var(--space-4)` 或 SCSS `$space-4`
- 圆角：使用 `var(--radius-md)` 或 SCSS `$radius-md`

---

## 错误处理规范

### 1. 后端错误处理

**全局错误中间件**（`backend/src/middleware/errorHandler.ts`）：
- 500 错误：返回通用消息 `"Internal server error"`，不暴露内部细节
- 非 500 错误：返回实际错误消息
- 开发环境：附加 `stack` 信息
- 生产环境：**禁止**暴露堆栈信息

**控制器错误处理模式**：try-catch 包裹，已知业务错误返回具体状态码，未知错误交给全局中间件或返回 500。

### 2. 前端错误处理

**HTTP 拦截器**（`frontend/src/api/http.ts`）：
- **401 响应**：自动清除 Token，跳转登录页，提示"登录已过期"
- **网络错误**：跳转服务器故障页 `/server-error`
- **业务错误**（`success: false`）：自动弹出 `MessagePlugin.error()`
- **静默模式**：设置 `_silent: true` 可禁用自动错误提示

**组件内错误处理模式**：`loading` ref + try/catch/finally，拦截器已自动提示。

**Store 内错误处理模式**：返回 `{ success, message? }` 格式。

### 3. 日志规范

- 后端：`console.error()` 记录错误 `[模块名] Error: {message}`；`console.log()` 记录启动信息 `[Startup] ✓/✗ {message}`
- 前端：`[HTTP] GET /api/xxx (label)` 请求日志；`[HTTP-ERR] POST /api/xxx [401]: message` 错误日志
- **禁止**在日志中记录敏感信息（Token、密码、个人数据）
- **禁止**在生产环境保留 `console.log`

### 4. 错误处理禁止行为

- 禁止 `catch` 空块吞掉错误（至少记录日志）
- 禁止在错误响应中暴露数据库表名、字段名、SQL 语句
- 禁止在前端展示后端原始错误消息（可能包含技术细节）
- 禁止使用 `try-catch` 包裹不需要错误处理的同步代码

---

## 安全规范

### 1. 密钥与凭证管理
- **禁止**在代码中硬编码密钥、密码、Token、API Key
- 所有敏感配置**必须**通过环境变量（`.env`）注入
- `.env` 文件已在 `.gitignore` 中，**禁止**提交到版本库
- 使用 `.env.example` 提供配置模板，不含真实值
- JWT Secret **必须**在生产环境使用强随机字符串，禁止使用默认值

### 2. SQL 注入防护
- **禁止**拼接 SQL 字符串，必须使用参数化查询
- 用户输入**必须**经过验证中间件（`validateBody`）校验后才可使用

### 3. 认证与授权
- 需要认证的接口**必须**使用 `authMiddleware`
- 可选认证使用 `optionalAuth`
- 权限检查使用 `requirePermission()`
- Token 存储在前端 `localStorage`，key 为 `tingstudio_token`
- Token 过期时间：7 天（`JWT_EXPIRES_IN = "7d"`）

### 4. HTTP 安全头
- 项目已启用 `helmet` 中间件，新增路由自动受保护
- **禁止**在路由中单独关闭安全头

### 5. CORS 配置
- 允许的源由 `CORS_ORIGIN` 环境变量控制
- 生产环境**必须**配置为实际域名，禁止使用 `*`

### 6. 请求限制
- 项目已启用 `express-rate-limit`
- 请求体大小限制：10MB
- 新增高频接口**必须**配置速率限制

### 7. 数据脱敏
- API 响应中**禁止**返回用户密码（即使是哈希值）
- 错误响应在生产环境**禁止**暴露堆栈信息
- 日志中**禁止**记录 Token、密码等敏感字段

### 8. 文件上传安全
- 使用 `multer` 处理文件上传
- **必须**限制文件类型和大小
- 上传文件**禁止**使用用户原始文件名，应生成唯一文件名

---

## Git 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>
```

**type 类型（必填）**：`feat`（新功能）、`fix`（修复 Bug）、`docs`（文档变更）、`style`（代码格式）、`refactor`（重构）、`perf`（性能优化）、`test`（测试）、`chore`（构建/工具/依赖）、`ci`（CI/CD 配置）

**scope 范围（可选）**：`auth`、`formula`、`material`、`salesman`、`nutrition`、`export`、`ai`、`agent`、`frontend`、`backend`、`db`、`deploy`

**subject 主题（必填）**：中文或英文均可，不超过 50 个字符，不加句号。

### 提交粒度

- 每次提交只做一件事，避免混合多种变更
- 新功能 + 对应测试可以放在同一提交
- 重构和功能变更分开提交

### Git 禁止行为

- 禁止提交 `node_modules/`、`dist/`、`.env`、`*.db` 等文件
- 禁止使用无意义的提交信息（如 `update`、`fix bug`、`wip`）
- 禁止在提交中包含密钥、密码、Token 等敏感信息
- 禁止强制推送到 `main` 分支

---

## 构建部署规范

### 1. 构建前检查清单

部署前**必须**通过以下检查：
- [ ] 后端 `npm run build` 无 TypeScript 错误
- [ ] 前端 `npm run build` 无 TypeScript 和构建错误
- [ ] 后端 `npm run test` 所有测试通过
- [ ] 前端 `npm run test:run` 所有测试通过
- [ ] 前端 E2E 测试通过（可选，CI 自动执行）

### 2. 环境变量

**后端 `.env` 必填项**：`PORT=3000`、`NODE_ENV=production`、`JWT_SECRET=<强随机字符串>`、`CORS_ORIGIN=<生产域名>`

**前端 `.env.production` 必填项**：`VITE_API_BASE_URL=/api`

- **禁止**在 `.env.production` 中包含开发环境配置
- **禁止**提交包含真实密钥的 `.env` 文件

### 3. 部署方式

- **腾讯云 SCF（云函数）**：配置文件 `backend/scf/`，构建 `npm run build:scf`，部署 `backend/deploy-scf.sh`
- **腾讯云 EdgeOne（前端）**：配置文件 `frontend/.edgeone/project.json`，构建 `npm run build:deploy`
- **传统服务器部署**：PM2 管理 `backend/ecosystem.config.js`，部署 `backend/deploy-production.sh`

### 4. CI/CD

- CI 配置：`.github/workflows/ci-cd.yml`
- 触发条件：push 到 `main` / `develop`，或 PR 到这两个分支
- 流水线：单元测试 → E2E 测试 → 构建检查
- Node 版本：20，包管理器：pnpm

### 5. 构建部署禁止行为

- 禁止跳过类型检查直接部署（`build:deploy` 仅在 CI 已通过类型检查后使用）
- 禁止在构建产物中包含 source map（生产环境）
- 禁止部署未通过测试的代码
- 禁止手动修改服务器上的构建产物

---

## Vue 组件规范

### 1. 组件文件组织

- 页面级组件放在 `frontend/src/views/` 下（按业务模块分目录）
- 通用可复用组件放在 `frontend/src/components/` 下
- 页面组件命名模式：`{Module}List.vue`、`{Module}Detail.vue`、`{Module}Form.vue`、`{Module}Compare.vue`

### 2. 组件结构顺序

```vue
<script setup lang="ts">
// 1. Vue API imports
// 2. 第三方库 imports
// 3. 项目内部 imports
// 4. Props & Emits
// 5. Composables & Stores
// 6. Reactive state
// 7. Computed
// 8. Methods
// 9. Lifecycle
</script>

<template>...</template>

<style lang="scss" scoped>...</style>
```

### 3. UI 组件库

- 项目使用 **TDesign Vue Next**（`tdesign-vue-next`）
- **必须**优先使用 TDesign 组件，禁止自行实现已有组件
- 图标使用 TDesign 内置图标：`<t-icon name="xxx" />`
- 消息提示使用 `MessagePlugin.success()` / `MessagePlugin.error()`

### 4. 状态管理（Pinia）

- 使用 Composition API 风格（`defineStore('name', () => { ... })`）
- 每个业务模块一个 Store
- Store 命名：`use{Module}Store`
- 异步操作返回 `{ success, message? }` 格式

### 5. 路由配置

- 使用懒加载：`component: () => import("@/views/...")`
- 路由 name 使用 PascalCase：`name: "MaterialList"`
- 需要 auth 的路由设置 `meta: { requiresAuth: true }`
- 隐藏顶栏的页面设置 `meta: { hideHeader: true }`

### 6. 样式规范

- 使用 SCSS 预处理器
- 全局变量在 `@/assets/styles/variables.scss` 中定义（已通过 vite 自动注入）
- 组件样式**必须**使用 `scoped`
- 颜色、间距等使用 CSS 变量或 TDesign token，禁止硬编码

### 7. Vue 禁止行为

- 禁止在组件中直接调用 axios，应通过 `@/api/` 层
- 禁止在模板中使用复杂表达式，应提取为 computed
- 禁止在多个组件中复制粘贴相同逻辑，应提取为 composable
- 禁止使用 `v-html` 除非内容已经过 XSS 过滤
- 禁止直接操作 DOM，应使用 Vue 的响应式系统

---

## 动态主题 UI 交互规范

> 适用页面：index.html、formulas、配方列表、看板、版本管理、详情、弹窗

### 一、全局样式（动态主题驱动，禁止写死色值）

**主题变量**（由系统主题动态注入）：
- `--theme-primary`：主题主色（按钮、选中、强调）
- `--theme-primary-light`：主色浅色背景（hover、选中态）
- `--theme-primary-dark`：主色深色（按下、强调文字）
- `--success`、`--warning`、`--danger`：语义色
- `--gray-100 ~ --gray-900`：中性色阶

**全局色彩规则**：背景 `--gray-100`、卡片/面板 `#ffffff`、边框 `--gray-300`、文字主色 `--gray-800`、次要 `--gray-600`、辅助 `--gray-500`

**字体**：无衬线；标题 16–20px / font-bold；正文 14px / normal；辅助 12px

**布局**：侧边栏 fixed left-0 top-0 h-full w-64 z-50；内容区 margin-left: 64px；卡片内边距 16px；模块间距 12/16/24px；响应式 1/2/4 列自适应

**圆角与阴影**：卡片 rounded-2xl；按钮/输入框 rounded-lg；弹窗 rounded-2xl；阴影 `0 10px 30px -5px rgba(0,0,0,0.05)`

### 二、组件样式（全部动态主题色，禁止写死颜色）

- **按钮**：主按钮 `background: var(--theme-primary); color: #fff`；次按钮 `background: #fff; border: 1px solid var(--gray-300)`；文字按钮 `color: var(--theme-primary)`
- **输入框/搜索框**：高度 36–40px；聚焦 `border-color: var(--theme-primary); box-shadow: 0 0 0 2px var(--theme-primary-light)`
- **卡片**：悬浮 `border-color: var(--theme-primary-light)`
- **表格**：表头 `background: var(--gray-100)`；行悬浮 `background: var(--theme-primary-light)`
- **标签/状态**：成功 `var(--success)`；警告 `var(--warning)`；错误 `var(--danger)`；默认 `var(--theme-primary-light)` + `var(--theme-primary-dark)`
- **侧边菜单项**：选中 `background: var(--theme-primary-light); color: var(--theme-primary-dark)`

### 三、交互规范（统一、不随主题变化）

- **动画**：页面加载淡入上滑 opacity 0→1，translateY 10px→0，0.5s ease-out；卡片依次延迟 0.1/0.2/0.3s
- **表单交互**：失焦校验、提交按钮 loading、错误提示在输入框下方、禁止重复提交
- **表格交互**：支持排序/全选/批量操作、选中显示批量操作栏、空数据展示空状态
- **反馈交互**：成功绿色提示 2s、失败红色提示 2.5s、删除二次确认、加载骨架屏/按钮 loading
- **顶部导航**：后退/前进/刷新固定、用户菜单悬浮展开、退出登录标红

### 四、响应式规则

- 移动端：1列，表格横向滚动
- 平板：2列
- 桌面：4列
- 小屏自动换行

### 五、强制约束

1. 所有颜色**必须使用 CSS 变量**，禁止写死十六进制色值
2. 主题色变化时，按钮/选中/悬浮/边框/文字强调**自动同步变色**
3. 交互、圆角、阴影、间距、字体**固定不变**
4. 所有页面视觉与交互必须与 index.html 保持一致
5. 如需修改风格，必须先更新本规范再编码

---

## 临时文件管理规则

- 所有临时测试代码文件**必须**放在项目根目录下的 `test/` 文件夹中统一管理
- 所有截图文件**必须**放在项目根目录下的 `test/screenshots/` 文件夹中统一管理
- **禁止**在项目根目录或其他非指定目录下散落临时测试文件和截图文件

**测试文件命名**：`*.test.{js,ts,py}` 或 `*.spec.{js,ts,py}`；调试脚本 `debug-*.{js,ts,py}`；临时验证 `try-*.{js,ts,py}`

**截图文件命名**：`{描述}-{日期}.png`；调试截图 `debug-{描述}.png`；错误截图 `error-{描述}.png`

**禁止行为**：禁止在 `src/` 目录下创建临时测试文件；禁止在项目根目录直接放置测试脚本或截图文件；禁止在组件/模块同级目录放置临时测试文件

---

## Playwright 调用规则

- 所有 Playwright 相关操作，**禁止使用 npx、临时安装、局部安装**
- 必须调用**系统全局已安装的 playwright 和 Chromium 命令**（已全局安装 @playwright/test）
- 浏览器（Chromium）**已全局安装缓存**，**禁止再次执行 install / install chromium**
- **正确调用方式**：直接使用全局命令 `playwright test`、`playwright open`、`playwright codegen`

---

## 工作流命令（从 Trae 迁移）

以下工作流命令在 Trae 中以斜杠命令形式使用，在 CodeBuddy 中以自然语言描述触发即可达到相同效果：

### 1. 全流程启动（双技能）

**触发意图**：启动全流程开发，使用动态主题 UI 规范
**执行流程**：需求澄清 → 输出开发文档 → 确认 → 组件化编码 → 自测 → 修复 → 交付
**核心约束**：所有样式使用 CSS 主题变量动态渲染，禁止写死色值

### 2. 需求拆解

**触发意图**：拆解需求为可执行任务
**输出内容**：1. 页面/模块清单 2. 组件划分 3. 接口与数据结构 4. 开发顺序
**要求**：只输出可执行、可验收的结构化任务，不废话

### 3. 生成页面

**触发意图**：按动态主题规范开发指定页面
**执行要求**：
1. 严格还原布局、交互、动画
2. 所有颜色使用 CSS 变量
3. 组件化、可复用、注释清晰
4. 响应式适配
5. 包含空状态、加载、错误处理

### 4. 修复 Bug

**触发意图**：定位并修复问题
**执行要求**：
1. 给出根因
2. 给出可直接替换的修复代码
3. 解释修改原因
4. 不引入新问题

### 5. 更新项目文档

**触发意图**：更新 README、API 文档、数据库文档
**执行步骤**：
1. 扫描项目全局信息（技术栈、目录结构、入口文件）
2. 扫描后端路由（`backend/src/routes/`）提取 HTTP 方法、路径、中间件
3. 扫描数据库结构（`backend/src/scripts/init.sql`、`backend/src/config/database-better-sqlite3.ts`）
4. 更新 `README.md`（保留手动修改的内容，只补全缺失部分）
5. 更新 `backend/API_DOC.md`（按模块组织接口文档）
6. 更新 `backend/DATABASE_DOC.md`（按模块组织表结构文档）
7. 输出变更摘要

**注意**：增量更新，不覆盖手动修改的内容；保持现有文档格式和章节结构；每次更新刷新"最后更新"日期

---

## 数据展示与时间处理规范

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

### 模块依赖

```
Views → Stores → API Layer (http.ts) → Backend Routes → Controllers → Services → Config Layer → DB
```

- Controllers 禁止直连 DB，必须通过 Services
- 数据库统一 `database-adapter.ts` → `query()` 函数
- 前端禁止直调 axios，必须通过 `@/api/` 层

---

## 技术选型参考文档

项目维护了以下技术选型分析文档，供开发决策参考：

- **文件预览技术方案选型**：`.trae/specs/file-preview-technology-selection/spec.md` — 对比 kkFileView、JntWord/JitViewer、OnlyOffice 四种方案的评估分析
