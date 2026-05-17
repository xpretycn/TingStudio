# AGENTS.md

This file provides guidance to AI agents when working with this repository.

***

## 1. 项目概述

**TingStudio** 是一个食品配方（草本药材）工作数据管理平台。

### 技术栈

| 层级    | 技术                           | 说明                           |
| ----- | ---------------------------- | ---------------------------- |
| 前端    | Vue 3 + Pinia + TDesign      | 单页应用，端口 5173                 |
| 后端    | Express + TypeScript (ESM)   | REST API，端口 3000             |
| 数据库   | SQLite (开发) / MySQL (生产)     | 通过 database-adapter.ts 统一封装  |
| 认证    | JWT                          | 7 天过期，双角色：admin / formulist  |
| AI 服务 | DashScope / Zhipu / DeepSeek | 统一 AIService，支持多 provider 切换 |
| 部署    | 腾讯云 SCF + EdgeOne            | Serverless 架构                |

### 数据隔离规则

- **admin**：可查看所有配方/原料/业务员
- **formulist（普通用户）**：只能查看和操作自己创建的配方/原料/业务员

***

## 2. 项目目录结构

```
ting-studio/                          # Monorepo 根目录
├── frontend/                          # 前端 Vue 3 应用
│   ├── src/
│   │   ├── api/                      # API 调用层（按业务模块分文件）
│   │   │   ├── http.ts               # Axios 封装（响应自动解包）
│   │   │   ├── auth.ts               # 认证 API
│   │   │   ├── material.ts           # 原料 API
│   │   │   ├── formula.ts            # 配方 API
│   │   │   └── ...
│   │   ├── stores/                   # Pinia 状态管理
│   │   │   ├── auth.ts               # 认证状态
│   │   │   ├── material.ts           # 原料状态
│   │   │   └── ...
│   │   ├── views/                    # 页面组件（按模块分目录）
│   │   │   ├── Home.vue              # 主布局（含侧边栏导航）
│   │   │   ├── materials/            # 原料管理页面
│   │   │   ├── formulas/             # 配方管理页面
│   │   │   ├── ai/                   # AI 助手页面
│   │   │   └── ...
│   │   ├── components/               # 通用组件
│   │   ├── router/index.ts           # 路由配置（懒加载）
│   │   ├── assets/styles/            # 样式系统
│   │   │   ├── design-tokens.scss    # 250+ SCSS 变量
│   │   │   ├── variables.scss        # 兼容性入口
│   │   │   └── theme-variables.scss  # CSS 运行时主题变量
│   │   └── main.ts                   # 应用入口
│   ├── .env.development              # 开发环境变量
│   └── .env.production               # 生产环境变量
│
├── backend/                          # 后端 Express 应用
│   ├── src/
│   │   ├── config/
│   │   │   ├── database-adapter.ts   # 数据库统一适配层
│   │   │   ├── database-better-sqlite3.ts  # SQLite 实现
│   │   │   ├── mysql.ts              # MySQL 实现
│   │   │   ├── security.ts           # 安全配置（helmet/CORS）
│   │   │   └── rateLimit.ts          # 速率限制配置
│   │   ├── controllers/              # 控制器层
│   │   │   ├── authController.ts     # 认证
│   │   │   ├── materialController.ts  # 原料
│   │   │   ├── formulaController.ts  # 配方
│   │   │   └── ...
│   │   ├── routes/                   # 路由定义
│   │   │   ├── index.ts              # 路由汇总注册
│   │   │   ├── auth.ts               # 认证路由
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT 认证中间件
│   │   │   ├── errorHandler.ts       # 全局错误处理
│   │   │   └── validate.ts           # 请求参数验证
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── ai/                   # AI 服务
│   │   │   │   ├── AIService.ts      # 统一 AI 接口
│   │   │   │   └── agent/            # AI Agent 实现
│   │   │   ├── formula/              # 配方相关服务
│   │   │   └── business/             # 业务分析服务
│   │   ├── utils/                    # 工具函数
│   │   │   ├── helpers.ts            # 数据库辅助函数
│   │   │   ├── formulaExporter.ts    # Excel 导出
│   │   │   └── logger.ts              # 日志
│   │   ├── types/                    # TypeScript 类型定义
│   │   └── scripts/                  # 数据库脚本
│   │       ├── init.sql              # 数据库初始化
│   │       └── migrations/           # 迁移脚本
│   ├── tests/                        # 测试文件
│   ├── .env.example                  # 环境变量模板
│   └── ecosystem.config.js           # PM2 配置
│
├── docs/                              # 项目文档
│   └── agent-system/                 # AI Agent 相关设计文档
├── data/                              # 测试数据
└── test/                              # 临时测试文件（按项目规范存放）
```

***

## 3. 环境变量清单

### 后端必填变量

| 变量            | 说明           | 示例                           |
| ------------- | ------------ | ---------------------------- |
| `PORT`        | 服务端口         | `3000`                       |
| `NODE_ENV`    | 环境           | `development` / `production` |
| `JWT_SECRET`  | JWT 签名密钥     | 生产环境必须使用强随机字符串               |
| `CORS_ORIGIN` | 允许的跨域源（逗号分隔） | `http://localhost:5173`      |

### 后端可选变量

| 变量                        | 说明                    | 默认值                  |
| ------------------------- | --------------------- | -------------------- |
| `DB_TYPE`                 | 数据库类型                 | `sqlite`（可选 `mysql`） |
| `AI_DASHSCOPE_API_KEY`    | 阿里云 DashScope API Key | 空                    |
| `AI_ZHIPU_API_KEY`        | 智谱 GLM API Key        | 空                    |
| `AI_DEEPSEEK_API_KEY`     | DeepSeek API Key      | 空                    |
| `RATE_LIMIT_WINDOW_MS`    | 速率限制时间窗口              | `900000` (15min)     |
| `RATE_LIMIT_MAX_REQUESTS` | 速率限制最大请求数             | `100`                |

### 前端环境变量

| 变量                  | 说明                       |
| ------------------- | ------------------------ |
| `VITE_API_BASE_URL` | API 基础路径（`/api` 或完整 URL） |
| `VITE_AMAP_KEY` | 高德地图 Web 服务 API Key（用于天气功能，可选） |

### 前端代理配置

| 路径 | 目标 | 说明 |
|------|------|------|
| `/amap` | `https://restapi.amap.com` | 高德地图 API 代理（解决 CORS） |
| `/ip-api` | `http://ip-api.com` | 备用 IP 定位服务 |

### AI Provider Base URL

| Provider  | Base URL                                            |
| --------- | --------------------------------------------------- |
| DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Zhipu     | `https://open.bigmodel.cn/api/paas/v4`              |
| DeepSeek  | `https://api.deepseek.com/v1`                       |

***

## 4. 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                   │
│  │  Views  │   │ Stores  │   │  Router │                   │
│  └────┬────┘   └────┬────┘   └────┬────┘                   │
│       │              │             │                        │
│       └──────────────┼─────────────┘                        │
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │   API Layer   │                              │
│              │  (http.ts)    │                              │
│              └───────┬───────┘                              │
└──────────────────────┼──────────────────────────────────────┘
                       │ HTTP /api/*
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                         Backend                               │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │   Routes    │   │ Middleware  │   │ Controllers │        │
│  │  (index.ts) │   │ (auth/etc) │   │             │        │
│  └──────┬──────┘   └─────────────┘   └──────┬──────┘        │
│         │                                    │                │
│         └──────────────┬────────────────────┘                │
│                        ▼                                      │
│              ┌─────────────────────┐                          │
│              │      Services       │                          │
│              │ (formula/ai/business)                         │
│              └──────────┬──────────┘                          │
│                         │                                     │
│                         ▼                                     │
│              ┌─────────────────────┐                          │
│              │   Config Layer      │                          │
│              │ (database-adapter)  │                          │
│              └──────────┬──────────┘                          │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    Database      │
                 │ SQLite / MySQL   │
                 └─────────────────┘
```

### 依赖规则

- **Views** → Stores → API → Backend
- **Controllers** 禁止直接操作数据库，必须通过 Services 层
- **数据库操作** 统一通过 `database-adapter.ts` 封装的 `query()` 函数
- **前端** 禁止直接调用 axios，必须通过 `@/api/` 层

***

## 5. 关键约定

### 数据库查询约定

```typescript
// SELECT 返回数组，需解构
const [rows] = query("SELECT * FROM formulas WHERE id = ?", [id]);

// INSERT/UPDATE/DELETE
query("INSERT INTO formulas (...) VALUES (...)", [values]);
```

### 时间处理约定

**后端返回 ISO 8601 UTC 时间字符串**，前端**必须**自动解析为本地时区时间展示。

| 场景 | 要求 | 示例 |
|------|------|------|
| 后端存储/返回 | ISO 8601 UTC（带 `Z`） | `2026-05-03T14:21:47.611Z` |
| 前端展示 | 本地时区可读格式 | `2026-05-03 22:21:47`（UTC+8） |

**前端时间展示规则：**

- **禁止**在前端直接渲染 `2026-05-03T14:21:47.611Z` 这样的原始 UTC 字符串
- **必须**使用 `timeFormat.ts` 中的 `formatTimestamp()` 工具函数，或自行用 `getHours()` / `getMonth()` 等本地时间方法拼接
- **禁止**使用 `date.toISOString()` 展示时间（返回的是 UTC，不是本地时间）
- **正确做法**：`new Date(dateStr).getHours()` 获取本地小时，`getMonth()` + 1 获取本地月份

**现有工具函数（`@/utils/timeFormat.ts`）：**

```typescript
// 格式化任意日期字符串为 yyyy-mm-dd hh:mm:ss（自动按本地时区解析）
formatTimestamp('2026-05-03T14:21:47.611Z')  // → '2026-05-03 22:21:47'（UTC+8）
formatTimestamp(undefined)  // → '-'

// 纯日期 yyyy-mm-dd（无时间）
formatDate('2026-05-03T14:21:47.611Z')  // → '2026-05-03'
```

**时间换行展示规则：**

如果时间在表格列或紧凑布局中一行展示不下，可以拆分为两行展示：

```vue
<!-- 第一行：日期，第二行：时间 -->
<div class="time-cell">
  <span>2026-05-05</span>
  <span>16:19:12</span>
</div>
```

```typescript
// 工具函数签名（可自行实现或复用）
function splitDateTime(dateStr: string): { date: string; time: string }
```

**新页面接入方式：**

```typescript
import { formatTimestamp } from '@/utils/timeFormat'

// 在模板中
{{ formatTimestamp(item.createdAt) }}
```

### 数据展示约定

前端展示数据时，**必须**遵循以下规范，保证界面信息一致、易读。

#### 1. 金额 / 价格

- **保留 2 位小数**，单位通常为"元/kg"或"元/份"
- 金额为 `null` / `undefined` 时展示 `'暂未录入'`（不是 `'--'` 或 `'-'`）

```vue
<!-- 推荐写法 -->
¥{{ (item.price ?? 0).toFixed(2) }}/kg
{{ item.price != null ? `¥${Number(item.price).toFixed(2)}/kg` : '暂未录入' }}
```

#### 2. 百分比

- 分子为 0 时展示 `'0%'`，无需特殊处理
- **小数为 0 时保留 1 位**（如 `0.0%`），**非 0 时保留 1-2 位**

```vue
<!-- 比值 × 100 后格式化 -->
{{ ((item.ratio - 1) * 100).toFixed(1) }}%  <!-- 偏差用 1 位 -->
{{ (item.ratio * 100).toFixed(2) }}%         <!-- 营养占比用 2 位 -->
```

#### 3. 空值 / null / undefined

| 场景 | 兜底文案 | 说明 |
|------|---------|------|
| 价格/金额 | `'暂未录入'` | 明确告知用户未录入 |
| 普通文本/数值 | `'--'` | 通用占位符 |
| 操作状态 | `'暂无'` | 无操作记录等 |
| 日期（无时间） | `'-'` | `formatTimestamp()` 已自动处理 |

```vue
{{ value ?? '--' }}
{{ value != null ? value : '暂未录入' }}
```

#### 4. 数字缩略（K / M / 万 / 亿）

统一使用 `timeFormat.ts` 中的 `formatCompact()` 函数：

```typescript
import { formatCompact } from '@/utils/timeFormat'

// 示例
formatCompact(1234)           // → '1.2K'
formatCompact(12345678)      // → '12.3M'
formatCompact(12340000)       // → '1234万'
formatCompact(123400000000)   // → '12.3亿'
formatCompact(undefined)     // → '--'
```

#### 5. 纯日期展示（无时间）

使用 `timeFormat.ts` 中的 `formatDate()` 函数：

```typescript
import { formatDate } from '@/utils/timeFormat'

// 示例
formatDate('2026-05-03T14:21:47.611Z')  // → '2026-05-03'（本地时区）
formatDate(undefined)  // → '-'
```

#### 6. 禁止行为

- **禁止**直接渲染 `null` / `undefined`（必须兜底）
- **禁止**在模板中直接拼接金额：`{{ '¥' + value }}`（应用模板字符串或计算属性）
- **禁止**使用 `toISOString()` 展示时间（返回 UTC，不是本地时间）
- **禁止**金额不保留小数或保留超过 2 位（除非业务明确要求）

#### 7. 二次确认交互

所有**二次确认操作**（如删除、批量操作、危险操作）**禁止使用 `t-dialog` 弹窗**，统一使用 `t-popconfirm` 气泡确认框：

```vue
<!-- ✅ 推荐：Popconfirm 气泡确认 -->
<t-popconfirm content="确认删除此配方？" @confirm="handleDelete">
  <t-button theme="danger">删除</t-button>
</t-popconfirm>

<!-- ❌ 禁止：Dialog 弹窗确认 -->
<t-dialog v-model:visible="showDeleteDialog" @confirm="handleDelete">
  <p>确认删除此配方？</p>
</t-dialog>
```

**理由**：`t-popconfirm` 直接在操作按钮附近弹出，不打断当前页面上下文，用户体验更流畅；`t-dialog` 会强制中断用户操作，适合复杂表单填写或重要信息展示。

### API 响应约定

**后端统一响应格式：**

```json
{
  "success": true,
  "data": { ... }
}
```

**前端 Axios 拦截器已自动解开包：**

- API 调用直接返回 `data`，不是 `{ success, data }` 包装
- 401 响应自动清除 Token 并跳转登录页
- 使用 `_silent: true` 可禁用自动错误提示

### ESM 模块约定

- 后端 `package.json` 设置 `"type": "module"`
- **所有内部 import 必须包含** **`.js`** **扩展名**
- 正确：`import { query } from '../config/database.js'`
- 错误：`import { query } from '../config/database'`

### 样式系统约定

| 类型                            | 使用场景       | 说明                  |
| ----------------------------- | ---------- | ------------------- |
| SCSS 变量 `$brand-primary`      | 编译时固定的品牌色  | 不会随运行时主题切换          |
| CSS 变量 `var(--color-primary)` | 需要运行时切换的样式 | 随 `data-brand` 属性变化 |

***

## 6. 常见问题与已知限制

### 数据库

- **开发环境**：使用 SQLite (`better-sqlite3`)，WAL 模式，文件在 `backend/data/tingstudio.db`
- **生产环境**：切换为 MySQL (`mysql2`)，通过 `DB_TYPE=mysql` 环境变量控制
- `.db`、`.db-wal`、`.db-shm` 文件已在 `.gitignore` 中，**禁止提交到 Git**

### 表格组件

- **禁止使用** **`fixed`** **列**：TDesign 的 `fixed` 列与 `position: sticky` 全局顶栏冲突
- 使用 `table-layout="auto"` 代替

### TDesign 下拉框

- 所有 `t-select` 和 `t-date-picker` 放在卡片内时，**必须**添加 `:popup-props="{ appendToBody: true }"`，否则下拉框会被卡片 `overflow: hidden` 裁剪

### 天气功能

- 天气 API 使用**高德地图** Web 服务 API，可选配置，不影响核心功能
- 环境变量：`VITE_AMAP_KEY`（在高德地图开放平台申请）
- 定位策略：优先高德 IP 定位 → 备用 ip-api.com → 默认城市武汉
- 地理编码路径：`/v3/geocode/regeo`（经纬度 → 城市信息）
- 天气查询路径：`/v3/weather/weatherInfo`（城市 adcode → 实时天气）
- 关键词搜索路径：`/v3/place/text`（城市名 → adcode + 经纬度）

### AI 功能

- 三种 AI Provider 可同时配置，通过 `AI_PROVIDER` 环境变量切换
- 每个 Provider 都有 `textModel` 和可选的 `visionModel`
- NL2SQL 查询有 `sqlValidator.ts` 白名单校验，禁止危险 SQL

### 测试

- **无框架配置**：项目早期未配置 Vitest，现已启用
- 运行 `npm run test`（前端）或 `npm run test`（后端）执行测试
- 临时测试文件应放在 `test/` 目录（详见 `.trae/rules/test-files-management.md`）

***

## 7. 常用命令

### 根目录（Monorepo）

```bash
npm run dev          # 同时启动前后端开发服务器
npm run build        # 构建前后端（vue-tsc 类型检查 + vite 构建）
npm run init-db      # 初始化 SQLite 数据库
npm run seed         # 填充测试数据（30 用户 + 示例数据）
npm run start        # 生产环境启动后端（PM2）
```

### 前端

```bash
cd frontend
npm run dev          # Vite 开发服务器 (端口 5173，代理 /api 到 localhost:3000)
npm run build        # 类型检查 + 构建
npm run test         # Vitest 单元测试
npm run test:e2e     # Playwright E2E 测试
```

### 后端

```bash
cd backend
npm run dev          # tsx watch 热重载开发（端口 3000）
npm run build        # tsc 编译到 dist/
npm run init-db      # 初始化数据库表（13 张表）
npm run seed         # 填充种子数据
npm run import-nutrition  # 从 Excel 导入营养数据
npm run test         # Vitest 单元测试
```

***

## 8. 参考文档

| 文档            | 路径                                     | 说明                      |
| ------------- | -------------------------------------- | ----------------------- |
| 代码规范          | `.trae/rules/code-style.md`            | TypeScript 命名/格式规范      |
| Git 提交规范      | `.trae/rules/git-commit.md`            | feat/fix/refactor 等提交类型 |
| 安全规范          | `.trae/rules/security.md`              | 密钥/注入/认证规范              |
| API 设计规范      | `.trae/rules/api-design.md`            | RESTful 路由/响应格式         |
| 数据库规范         | `.trae/rules/database-rules.md`        | 表设计/查询规范                |
| Vue 组件规范      | `.trae/rules/vue-component.md`         | 组件命名/TDesign 使用         |
| 构建部署规范        | `.trae/rules/build-deploy.md`          | 构建命令/部署检查清单             |
| 错误处理规范        | `.trae/rules/error-handling.md`        | 前后端错误处理模式               |
| 临时文件管理        | `.trae/rules/test-files-management.md` | test/ 和截图文件管理           |
| Playwright 规范 | `.trae/rules/playwright-no-npx.md`     | Playwright 使用强制规则       |
| PRD Skill     | `github/awesome-copilot@prd`           | 产品需求文档生成（已安装）           |

