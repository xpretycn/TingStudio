# TingStudio v2.16

食品配方工作数据管理平台 — 前后端分离架构

## 项目简介

TingStudio 是一个专业的食品配方工作数据管理平台，面向食品配方行业（中草药功效配方），提供配方管理、原料管理、业务员管理、营养成分分析、导出分享等完整功能链路。采用 Vue 3 + Express + SQLite 前后端分离架构，支持 JWT 认证、RESTful API、配方版本控制、营养合规检查等企业级特性。

## 技术栈

### 后端

- **运行时**: Node.js + TypeScript
- **Web 框架**: Express 4.21+
- **数据库**: SQLite (better-sqlite3) + WAL 模式
- **认证**: JWT (jsonwebtoken + bcryptjs)
- **安全**: Helmet + CORS + express-rate-limit
- **日志**: Morgan
- **Excel**: xlsx
- **PDF**: pdfkit

### 前端

- **框架**: Vue 3.4+ (Composition API)
- **语言**: TypeScript 5.4+
- **构建工具**: Vite 5.1+
- **路由**: Vue Router 4.3+
- **状态管理**: Pinia 2.1+
- **UI 组件库**: TDesign Vue Next 1.9+
- **HTTP 客户端**: Axios
- **样式**: SCSS

## 功能特性

### 首页与导航

- 左右分栏布局：左侧固定导航 + 右侧动态内容区
- 猫咪 Logo 动画、用户信息卡片、**实时天气**（和风天气 API，自动定位）、每日祝福语
- 可折叠功能导航栏（最近配方、配方管理、原材料管理、业务员管理、营养分析、版本管理、导出中心、工具箱、AI 助手）
- 内容区顶部工具栏：后退/前进/刷新导航、全局搜索、新增按钮
- 用户头像下拉菜单（hover 子菜单切换外观/品牌色、账号设置、切换账号、退出登录）
- 锁屏功能
- **多品牌色换肤**：4 种品牌色（樱花粉/暖阳黄/天空蓝/清新绿）一键切换
- **亮暗色主题切换**：支持跟随系统/亮色/暗色三种模式，自动检测系统偏好

### 认证系统

- 用户注册/登录（JWT Token）
- 多角色支持（admin / formulist）
- Token 自动续期与过期处理
- 路由守卫（未认证自动跳转登录页）
- **个人资料管理**：修改昵称/头像/简介/邮箱/手机号，修改密码，邮箱手机号唯一性校验

### 原料管理

- 原料信息 CRUD
- 唯一编码校验
- 配方引用检测（防误删）
- 原料类型 Tag 区分（药材/辅料）

### 配方管理

- 配方信息 CRUD（关联业务员 + 多原料）
- 成品重量与主料/辅料含量比系数设置
- 原料级别含量比系数覆盖
- **Excel 批量导入配方原料**（模板下载、文件解析、数据验证、缺失原料提示）
- 关键词搜索与业务员过滤
- 自动版本控制（每次更新自动生成全字段变更快照）
- 手动创建/发布版本（非当前版本均可发布为当前版本）
- 发布版本时自动同步快照数据到配方主表
- 升版原因强制校验与展示
- 语义化版本名称（自动根据变更内容生成描述性名称）
- 版本对比（配方名/业务员/参数/原料等全字段差异可视化）
- 版本对比页旧值/新值列标题动态显示版本号+版本名称
- 配方列表展开行展示完整版本记录与变更详情
- **配方表单双栏布局**：左侧表单区域（基础信息 + 原料配比）+ 右侧 AI 助手面板
- **AI 智能填单交互**：文件上传、解析进度动画、结果预览、一键回填

### 业务员管理

- 业务员信息 CRUD
- 关键词搜索与状态筛选
- 软删除（停用）

### 营养分析

- 原料营养成分录入（per 100g，25+ 营养字段按组分类）
- 配方营养汇总计算（含量比 = 原料量 / 成品重量 \* 系数）
- 能量计算：蛋白质×17 + 脂肪×37 + 碳水化合物×17
- 核心营养素卡片可视化 + NRV 占比进度条
- 原料贡献明细展示
- 营养标准管理（预置 6 类人群国标数据，支持自定义）
- 合规性检查（三级状态：达标/警告/超标 + 结构化建议）
- 营养数据导入（Excel）

### 导出与分享

- **Excel 导出**：一键将配方导出为 Excel（含配方信息、原料清单、营养数据三个 Sheet，含配方合计行）
- **PDF 导出**：一键将配方导出为 PDF（配方信息 + 原料清单表格 + 营养数据表格，含合计行）
- 导出模板管理（PDF/Excel/API/打印），支持编辑和删除
- 导出任务创建与状态跟踪，支持下载、失败重试
- 配方列表一键导出跳转（自动填充配方选择）
- 分享链接创建、历史列表、复制链接、删除管理
- API 数据接口管理面板（创建、查看接口配置）
- Excel 模板精简为两列（原料名称 + 数量），简化导入流程

### AI 智能助手

- **智能填单**：上传配方文档（Excel/文本/图片），AI 自动解析为结构化配方数据，原料自动匹配系统已有原料
- **智能检索**：自然语言查询配方/原料/业务员数据，AI 生成安全 SQL 查询并执行返回结果
- 多模型支持：通义千问、智谱 GLM、DeepSeek 三厂商模型切换，统一 OpenAI 兼容接口
- 文件上传解析：支持 Excel/文本文件读取和图片（Base64）多模态解析
- SQL 安全校验：白名单机制仅允许 SELECT 查询，自动注入数据隔离条件
- 解析结果一键填入配方表单，支持 AI 预填提示和人工校对

### 天气服务

- **实时天气**：侧边栏展示当前城市天气 emoji + 温度，基于浏览器 Geolocation 自动定位
- **天气详情卡片**：工具箱页面展示完整天气信息（温度/状况/体感温度/湿度/风向风力/风速/更新时间）
- **城市搜索**：300ms 防抖输入 + 下拉候选列表，支持全球城市模糊搜索
- **和风天气 API**：免费订阅版（devapi.qweather.com），独立 axios 实例直连，不走后端代理
- **智能缓存**：30 分钟内存缓存避免频繁请求，429 限流指数退避重试（2s → 4s）
- **城市持久化**：定位成功后城市信息存入 localStorage，下次打开直接使用缓存城市
- 天气图标 emoji 自动映射（晴/多云/雨/雪/雾等 50+ 图标码）

## 项目结构

```
ting-studio/
├── backend/                          # 后端服务
│   ├── src/
│   │   ├── config/                   # 配置（数据库、JWT、应用）
│   │   ├── controllers/              # 控制器（8个模块）
│   │   │   ├── authController.ts
│   │   │   ├── materialController.ts
│   │   │   ├── formulaController.ts
│   │   │   ├── salesmanController.ts
│   │   │   ├── versionController.ts
│   │   │   ├── exportController.ts
│   │   │   ├── nutritionController.ts
│   │   │   └── aiController.ts
│   │   ├── middleware/                # 中间件（认证、校验、错误处理）
│   │   ├── routes/                   # 路由定义（8个模块）
│   │   ├── scripts/                  # 数据库脚本
│   │   │   ├── init.sql              # 建表 SQL（13张表）
│   │   │   ├── initDatabase.ts       # 数据库初始化
│   │   │   └── seedData.ts           # 种子数据
│   │   ├── services/                 # 业务服务层
│   │   │   └── ai/                   # AI 服务（统一 OpenAI 兼容接口）
│   │   │       ├── AIService.ts      # AI 服务核心（多模型切换）
│   │   │       └── prompts.ts        # 提示词模板（配方解析/NL2SQL）
│   │   ├── utils/                    # 工具函数
│   │   │   ├── helpers.ts            # 通用工具
│   │   │   ├── formulaExporter.ts    # Excel 导出引擎
│   │   │   ├── formulaPdfExporter.ts # PDF 导出引擎
│   │   │   └── sqlValidator.ts       # SQL 白名单安全校验
│   │   └── index.ts                  # 入口文件
│   ├── data/                         # SQLite 数据库文件
│   ├── API_DOC.md                    # API 接口文档
│   ├── DATABASE_DOC.md               # 数据库文档
│   └── package.json
├── frontend/                         # 前端应用
│   ├── src/
│   │   ├── api/                      # API 接口层（Axios 封装）
│   │   │   ├── auth.ts               # 认证/个人资料
│   │   │   ├── weather.ts            # 和风天气 API（独立实例）
│   │   │   └── ...                   # 其他业务模块
│   │   ├── stores/                   # Pinia 状态管理
│   │   │   ├── auth.ts               # 认证 + 个人资料
│   │   │   ├── weather.ts            # 天气缓存/定位/城市持久化
│   │   │   └── ...                   # 其他业务模块
│   │   ├── views/                    # 页面组件
│   │   │   ├── auth/                 # 登录/注册
│   │   │   ├── materials/            # 原料管理
│   │   │   ├── formulas/             # 配方管理
│   │   │   ├── salesmen/             # 业务员管理
│   │   │   ├── versions/             # 版本控制
│   │   │   ├── exports/              # 导出管理
│   │   │   ├── nutrition/            # 营养分析
│   │   │   ├── ai/                   # AI 智能助手
│   │   │   ├── settings/             # 账号设置
│   │   │   ├── Home.vue              # 首页（左右分栏布局）
│   │   │   └── Tools.vue             # 工具箱
│   │   ├── components/               # 公共组件
│   │   │   ├── Skeleton/              # 骨架屏组件
│   │   │   └── Layout/               # 布局组件
│   │   ├── assets/styles/            # 样式体系
│   │   │   ├── design-tokens.scss    # 统一设计令牌（色彩/排版/间距/阴影）
│   │   │   ├── theme-variables.scss  # CSS 自定义属性（4品牌色 x 2明暗 = 8套变量）
│   │   │   ├── tokens.ts             # JS 可导入颜色常量 + 品牌色色板 + getThemeTokens()
│   │   │   ├── _a11y.scss            # 无障碍与主题过渡动画
│   │   │   └── variables.scss        # 额外 SCSS 变量
│   │   ├── router/                   # 路由配置
│   │   ├── types/                    # 类型定义
│   │   └── App.vue                   # 根组件
│   ├── vite.config.ts                # Vite 配置（含 API 代理）
│   └── package.json
├── PRD-TingStudio-v2.0.md            # 产品需求文档
├── DEVELOPMENT_PLAN.md               # 开发计划
└── README.md
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- 和风天气 API Key（免费订阅，用于实时天气功能）

### 一键启动（推荐）

```bash
# 安装根目录依赖
npm install

# 初始化数据库 + 填充种子数据
npm run init-db
npm run seed

# 同时启动前后端开发服务
npm run dev
```

### 后端单独启动

```bash
cd backend
npm install
npm run init-db        # 初始化数据库
npm run seed           # 填充种子数据（可选）
npm run dev            # 启动开发服务（端口 3000）
```

### 前端单独启动

```bash
cd frontend
npm install
npm run dev            # 启动开发服务（端口 5173，API 代理到 localhost:3000）
```

启动后访问 http://localhost:5173

### 生产部署

```bash
# 构建前后端
npm run build

# 启动后端生产服务
npm run start          # 后端监听端口 3000，提供 API 服务
```

前端构建产物位于 `frontend/dist/`，可部署至任意静态服务器（Nginx / EdgeOne Pages 等），后端 API 地址需在 Vite 配置中修改代理目标或通过反向代理统一入口。

### 测试账号

| 用户名    | 密码       | 角色   |
| --------- | ---------- | ------ |
| `admin`   | `admin123` | 管理员 |
| `user002` | `user002`  | 配方师 |

> 其他测试账号：`user003` ~ `user030`，密码与用户名相同，角色在 admin/formulist 间循环。

## 数据库表结构

共 13 张表：

| 表名                          | 说明           |
| ----------------------------- | -------------- |
| `users`                       | 用户表         |
| `materials`                   | 原料表         |
| `material_nutrition`          | 原料营养成分表 |
| `formulas`                    | 配方表         |
| `formula_versions`            | 配方版本表     |
| `formula_nutrition_summaries` | 配方营养汇总表 |
| `salesmen`                    | 业务员表       |
| `export_templates`            | 导出模板表     |
| `export_jobs`                 | 导出任务表     |
| `api_data_interfaces`         | API 数据接口表 |
| `share_configs`               | 分享配置表     |
| `nutrition_profiles`          | 营养标准表     |
| `nutrition_analysis_reports`  | 营养分析报告表 |

详见 [backend/DATABASE_DOC.md](./backend/DATABASE_DOC.md)。

## API 文档

详细的接口文档请查看 [backend/API_DOC.md](./backend/API_DOC.md)，涵盖 8 个模块、30+ 个端点的完整说明。

## 数据隔离规则

| 数据模块 | 普通用户 (formulist) | 管理员 (admin) |
| -------- | -------------------- | -------------- |
| 配方     | 仅查看自己创建的     | 可查看所有     |
| 原料     | 仅查看自己创建的     | 可查看所有     |
| 业务员   | 可查看全部           | 可查看全部     |
| 版本     | 对自己的配方操作     | 可操作所有     |
| 导出任务 | 仅查看自己创建的     | 可查看所有     |

## 主要脚本

### 根目录统一脚本

| 命令              | 说明                   |
| ----------------- | ---------------------- |
| `npm run dev`     | 同时启动前后端开发服务 |
| `npm run build`   | 构建前后端生产版本     |
| `npm run init-db` | 初始化数据库表结构     |
| `npm run seed`    | 填充种子数据           |
| `npm run start`   | 启动后端生产服务       |

### 后端脚本（backend/）

| 命令                       | 说明                       |
| -------------------------- | -------------------------- |
| `npm run dev`              | 启动后端开发服务（热重载） |
| `npm run build`            | 编译后端 TypeScript        |
| `npm run start`            | 运行编译后的生产版本       |
| `npm run init-db`          | 初始化数据库表结构         |
| `npm run seed`             | 填充种子数据               |
| `npm run import-nutrition` | 导入营养数据 (Excel)       |

### 前端脚本（frontend/）

| 命令              | 说明                                              |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | 启动前端开发服务                                  |
| `npm run build`   | 构建前端生产版本（vue-tsc 类型检查 + vite build） |
| `npm run preview` | 预览构建产物                                      |

## 更新日志

### v2.16.0 (2026-04-07)

- **品牌色统一更新**："绿清新"品牌色更新为 RGB(16, 185, 129)，所有品牌应用场景统一使用新色号
- **配方表单 UI 重构**：
  - 采用 `grid grid-cols-12 gap-8` 双栏布局，左侧 7 列表单区域 + 右侧 5 列 AI 助手区域
  - 左侧表单分为两个 Section：基础信息录入（配方名称/业务员/成品重量/系数/描述）+ 原料配比表
  - 右侧 AI 助手面板完整还原设计规范：模型选择、文件上传区、解析进度动画、结果预览、操作提示
- **AI 智能填单交互增强**：
  - 支持 DeepFormulate v2 和通用 OCR 解析两种模型切换
  - 拖拽上传文件支持，hover/drag-over 状态视觉反馈
  - 解析进度条动画（动态百分比 + 状态提示）
  - 解析结果预览卡片（配方名称、原料数量、置信度）
  - 一键回填按钮将 AI 解析数据自动填充到表单
  - 操作提示面板（5 条使用指南）
- **配方表单 Header 统一**：新增与 FormulaDetail.vue 相同的 header 区域（面包屑导航、标题、操作按钮）

### v2.15.0 (2026-04-06)

- **配方详情页 UI 优化**：关联业务员与需求信息从接口获取真实数据（salesmanName/salesmanDept/demandDesc），不再显示为空
- **配方详情页布局调整**：营养成分计算表格（配比实时计算器）与技术处理依据/使用说明采用 6:4 列比例
- **成品总重样式还原**：按照 recipe-detail.html 参考设计，成品总重移至表头右侧，白底圆角徽章卡片样式
- **营养成分表列合并**：每100克数值和单位合并为单列"每100克含量"，表头统一
- **变更记录数据驱动**：版本历史时间线从 formula_versions 表查询真实数据（最近 3 条），替代硬编码空数组
- **导出配方导航**：点击导出按钮跳转至导出中心并回填配方名称（formulaId + formulaName 查询参数）
- **间距优化**：calc-table 底部内边距、detail-main 底部内边距增加，避免内容被截断
- **FormulaList 版本标签主题色**：t-tag 状态标签按品牌主题色适配（var(--color-primary)）
- **FormulaList version-reason 样式**：移除背景色，字体颜色跟随品牌主题色

### v2.14.0 (2026-04-02)

- **实时天气功能**：集成和风天气免费订阅 API，侧边栏展示当前城市天气 emoji + 温度
- **天气详情卡片**：工具箱页面新增天气详情区域（温度/状况/体感温度/湿度/风向风力/更新时间）
- **浏览器自动定位**：Geolocation API 获取用户位置，10s 超时降级，城市信息 localStorage 持久化
- **城市搜索**：300ms 防抖输入 + 下拉候选列表，支持全球城市模糊搜索
- **天气 API 模块**：`api/weather.ts` 独立 axios 实例（不走后端代理），30min 内存缓存，429 指数退避重试
- **天气 Store**：`stores/weather.ts` 管理加载/错误/限流状态，天气图标码 → emoji 自动映射（50+ 图标）
- **个人资料管理后端**：新增 `PUT /api/auth/me` 更新资料（昵称/头像/简介/邮箱/手机号）+ `PUT /api/auth/change-password` 修改密码
- **用户表扩展**：users 表新增 display_name、avatar、bio、email、phone 字段
- **Auth Store 增强**：新增 `updateProfile`、`changePassword`、`fetchCurrentUser` 方法
- **用户菜单优化**：头像下拉菜单改为 hover 触发，外观/品牌色切换改为 hover 子菜单
- **导出中心 UI 打磨**：按钮样式从 text 改为 outline，表格添加 `table-layout="auto"`，间距优化
- **移除假天气数据**：侧边栏天气从随机生成改为真实 API 数据

### v2.13.0 (2026-04-01)

- **AI 智能助手模块**：新增 AI 集成功能，支持智能填单和智能检索两大场景
- **智能填单**：上传配方文档（Excel/文本/图片），AI 自动解析为结构化配方数据，原料模糊匹配系统已有原料，解析结果一键填入配方表单
- **智能检索**：自然语言查询数据，AI 生成安全 SQL 查询并执行返回结果，支持数据隔离
- **多模型支持**：通义千问、智谱 GLM、DeepSeek 三厂商模型切换，统一 OpenAI 兼容接口封装
- **后端 AI 服务**：`services/ai/AIService.ts` 核心服务 + `prompts.ts` 提示词模板，支持文本/多模态输入
- **SQL 安全校验**：`sqlValidator.ts` 白名单机制仅允许 SELECT 查询，非 admin 用户自动注入数据隔离条件
- **AI 助手页面**：新增 `AiAssistant.vue` 页面（智能填单 + 智能检索双 Tab），侧边栏新增导航入口
- **账号设置页**：新增 `AccountSettings.vue` 个人信息管理页面
- **配方表单 AI 预填**：`FormulaForm.vue` 支持 `route.query` 接收 AI 解析数据，显示预填提示
- **多品牌色换肤系统**：支持 4 种品牌色（樱花粉/暖阳黄/天空蓝/清新绿）运行时切换，通过 CSS 自定义属性实现 4 色 x 2 明暗 = 8 种视觉组合
- **亮暗色主题切换**：三模式切换（跟随系统/亮色/暗色），`matchMedia` 实时监听系统偏好，`localStorage` 持久化
- **Theme Store 重写**：双维度状态管理（`brandColor` + `mode`），支持循环切换品牌色和主题模式
- **CSS 变量体系扩展**：`theme-variables.scss` 定义完整的 8 套品牌色 CSS 变量（品牌色 6 级 + alpha 系列 + 阴影 + 渐变）
- **Home.vue 品牌色迁移**：40+ 处 SCSS 硬编码粉色引用迁移为 `CSS var()`，支持运行时品牌色切换
- **TDesign 组件适配**：`ConfigProvider` 动态传入品牌色 token，暗色模式下配色一致
- **主题切换过渡动画**：300ms 平滑过渡（背景色/文字色/边框色/阴影）
- **防闪烁脚本**：`index.html` 内联脚本在 DOM 渲染前设置 `data-theme` + `data-brand`
- **JS Token 工具**：`tokens.ts` 新增 `getThemeTokens()` / `getTDesignTokens()` 函数，供图表/渐变等场景使用
- **导出中心布局修复**：下拉菜单 `appendToBody` 防止被卡片遮挡，创建任务与列表卡片间距优化
- **Bug 修复**：Home.vue 主题切换从直接 DOM 操作改为调用 themeStore 方法

### v2.11.0 (2026-03-31)

- **设计令牌体系建立**：新增 `design-tokens.scss`，统一定义 250+ 设计变量（品牌色、背景色、文字色、边框色、语义色、覆盖层、阴影、间距、圆角、动效、布局常量等）
- **全局 TDesign 样式覆盖提取**：从 Home.vue 中提取 ~180 行重复的 `:deep()` 样式到 `main.scss`，统一按钮/输入框/表格/分页/标签/弹窗组件样式
- **全局组件主题覆盖**：通过 `theme.css` 覆盖 TDesign CSS 变量，实现全局圆角、字体、品牌色等视觉统一
- **色值统一（Task 1-5）**：20+ 个 Vue 组件中 ~200 处硬编码色值（rgba/hex）替换为设计令牌变量
- **列表页色值替换**：FormulaList/MaterialList/SalesmanList/RecentFormulas/VersionList 中所有 rgba 硬编码 → 语义 token
- **表单/详情页色值替换**：FormulaDetail/FormulaForm/MaterialForm/SalesmanForm/PageSkeleton/Tools/NutritionAnalysis 中色值统一
- **Home.vue 主框架色值统一**：删除 15 个局部变量别名，90 处硬编码色值 → 全局 token（rgba/hex 全部清零）
- **认证页色值统一**：Login.vue/Register.vue 删除局部 `$pink-*` 变量定义，改用全局 design-tokens
- **新增 JS 设计令牌**：`tokens.ts` 提供图表色、工具箱渐变、核心营养素渐变等 JS 可导入常量
- **Vite 配置优化**：SCSS additionalData 自动注入 design-tokens，所有 .vue 文件可直接使用全局变量

### v2.10.0 (2026-03-31)

- **阶段九：测试、部署与交付**
- 前后端 TypeScript 编译检查通过，构建产物验证完整
- 根目录新增统一管理脚本（`npm run dev/build/start`）
- 新增 `concurrently` 依赖，支持前后端同时启动
- 修正 `.env.example` 模板（MySQL → SQLite 配置同步）
- README.md 添加生产部署说明和统一脚本文档
- 项目版本号更新至 v2.9.0

### v2.9.0 (2026-03-31)

- **阶段八：用户体验优化与代码质量提升**
- 新增通用骨架屏组件（`PageSkeleton.vue`），支持 table/form/detail/cards 四种布局
- 8 个页面集成骨架屏，消除首屏白屏闪烁
- 6 个页面空状态增加 CTA 行动按钮，引导用户快速开始
- 侧边栏新增"快速开始"引导卡片（三步引导流程，localStorage 记忆关闭状态）
- 3 个表单（配方/原料/业务员）rules 添加 `trigger: 'blur'/'change'` 实时校验
- 全局必填星号红色标识 + 校验失败字段红色边框高亮
- 3 个表单添加 `scroll-to-first-error` + 提交防抖
- 全局响应式断点变量（`$breakpoint-tablet/mobile/small`）
- 5 个列表页表格添加 `table-layout="auto"` + `table-content-width` 横向滚动
- 移动端表单标签顶部显示（全局样式）
- 配方/原料详情页 header 响应式堆叠 + 表格横向滚动
- 原料详情页 `t-descriptions` 响应式列数
- 移动端侧边栏抽屉模式（汉堡菜单 + 遮罩层 + 滑入动画）
- 合规检查结果独立为单独 Card，修复嵌套条件渲染问题
- 清理调试日志

### v2.8.0 (2026-03-31)

- **阶段七：营养分析功能增强**
- 原料营养数据编辑增强：25+ 营养字段按四组分类（基础/矿物质/维生素/其他），t-collapse 折叠面板
- 营养数据来源管理：confidence 字段记录数据可信度（high/medium/low）
- 营养计算结果可视化：五大核心营养素卡片 + NRV 占比进度条 + 原料贡献明细
- 合规检查结果优化：pass/warning/fail 三级状态 + 结构化建议 + 汇总统计
- 预置 6 类人群营养标准（婴儿/较大婴儿/成人/老年人/孕妇/特殊医学用途）
- 营养标准管理增强：编辑/删除 API + 预置标准保护

### v2.7.0 (2026-03-30)

- **阶段六：导出中心功能完善**（Excel + PDF 双格式导出引擎）
- 新增配方 Excel 导出引擎（formulaExporter.ts）：配方信息、原料清单、营养数据三个 Sheet，含配方营养合计行
- 新增配方 PDF 导出引擎（formulaPdfExporter.ts）：pdfkit 生成 A4 PDF，含标题、信息表、原料表格、营养表格
- 导出任务同步执行：创建任务后立即生成文件，completed 状态自动触发下载
- 导出任务列表增加「下载」和「重试」按钮，分页联动正确工作
- 配方列表点击导出自动跳转导出中心并填充配方选择（route.query.formulaId）
- 配方选择从输入 ID 改为下拉选择器（t-select 展示配方名称）
- 分享管理新增分享历史列表、复制链接、删除/失效操作
- 导出模板管理增加编辑、删除操作（后端 PUT/DELETE 接口）
- 新增 API 数据接口管理 Tab 面板（创建接口、查看列表）
- 后端新增路由：下载文件、重试任务、分享列表/删除、模板更新/删除
- Excel 导入模板精简为两列（原料名称 + 数量），移除原料编码、类型、营养列
- ExcelImportPanel 修复 t-table-column 组件报错（改为 TDesign 标准 :columns 方式）
- ExcelImportPanel 新增取消导入按钮
- 修复 Excel 导入后表单校验不触发（splice 替代直接赋值保持 reactive 响应式）
- 配方编辑页原料清单标记为必填项，手动添加按钮移至列表末尾
- 配方编辑页 ExcelImportPanel 移至手动添加原料按钮下方
- 版本管理状态逻辑修复：状态列严格依据数据库 status 字段显示
- 版本管理发布按钮条件改为除已发布外均可发布
- 版本管理数据一致性自修复：多 is_current 或多 published 自动归档
- 编辑配方创建新版本时旧版本保留原始状态（仅取消 is_current 标记）
- 导出中心页面隐藏全局搜索框和新增按钮
- 新增 pdfkit 依赖用于 PDF 生成

### v2.6.0 (2026-03-30)

- **新增 Excel 批量导入配方功能**：模板下载、文件解析、数据验证、原料自动匹配
- 新增配方导入面板组件（ExcelImportPanel），支持一键下载模板和上传解析
- 导入时自动匹配系统已有原料，未录入原料高亮提示并引导用户先录入
- 数据验证：必填字段检查、类型验证、数量验证
- 解析结果预览：显示匹配状态、原料类型、数量等
- 修复配方保存报错（数据库缺少 supplement_ratio_factor、version_reason 字段）
- 修复营养计算表格报错（nutritionController 中 ratio_factor 字段迁移问题）

### v2.5.1 (2026-03-27)

**核心重构**: Axios 响应拦截器优化，统一数据访问模式

#### 核心改进

- ✅ **Axios 响应拦截器重构**: 修改为返回 `response.data` 而不是整个响应对象，简化 API 调用
- ✅ **统一数据访问模式**: 所有 API 类型定义、Store 数据访问、组件数据绑定统一使用解包后的数据结构
- ✅ **类型定义优化**: 移除 `{ success, data }` 包装类型，直接使用实际数据类型

#### 功能完善

- ✅ **营养分析功能增强**:
  - 原料列表营养列批量检查与状态展示（显示营养项数量）
  - 原料详情页营养成分表格正确渲染
  - 配方详情页营养计算表格数据显示修复
  - 合规检查结果显示优化
  - 营养数据来源和可信度标签展示
- ✅ **导出中心功能完善**:
  - Excel 导出支持三个 Sheet（配方信息、原料清单、营养数据）
  - PDF 导出中文支持和排版优化
  - 导出任务状态跟踪和失败重试
  - 分享链接管理和复制功能
- ✅ **版本管理优化**: 全字段变更记录、发布同步配方数据、对比页优化

#### Bug 修复

- ❌ ~~登录成功后配方列表显示失败~~ → ✅ 已修复（axios 拦截器数据访问逻辑）
- ❌ ~~原料管理页面营养状态全部显示"未录入"~~ → ✅ 已修复（API 类型定义和数据访问）
- ❌ ~~原料详情页营养成分无法显示~~ → ✅ 已修复（Store 数据访问逻辑）
- ❌ ~~配方详情页营养计算表格数据获取失败~~ → ✅ 已修复（nutritionApi 类型定义）
- ❌ ~~版本管理页面无数据显示~~ → ✅ 已修复（versionStore 数据访问）
- ❌ ~~合规检查报错 400 Bad Request~~ → ✅ 已修复（POST 请求传递 null 改为空对象）

#### 技术优化

- ✅ 营养数据批量并行请求优化
- ✅ 组件按需加载和懒加载
- ✅ 数据库查询优化（索引、JOIN）
- ✅ 错误提示和日志优化

#### 影响范围

- **后端**: 6 个控制器优化（exportController、nutritionController、versionController 等）
- **前端 API**: 8 个模块类型定义更新（auth、export、formula、http、material、nutrition、salesman、version）
- **前端 Store**: 7 个状态管理修复（auth、export、formula、material、nutrition、salesman、version）
- **前端视图**: 8 个组件优化（Home、ExportCenter、FormulaDetail、MaterialDetail、MaterialForm、MaterialList、NutritionAnalysis、NutritionProfiles）

#### 代码统计

- 修改文件：37 个文件
- 新增行数：+2,610 行
- 删除行数：-690 行
- 净增：+1,920 行

### v2.5.0 (2026-03-29)

- 新增辅料含量比系数字段（supplement_ratio_factor），支持主料/辅料独立系数
- ratio_factor 字段迁移与配方表单界面优化
- 版本管理增强：buildChanges 扩展记录配方名/业务员/参数/描述等全部字段变更
- 发布版本时将快照数据回写到 formulas 表，确保配方数据与当前版本一致
- 非当前版本均可发布（不仅限草稿状态），新增发布确认弹窗
- 新增升版原因强制校验，版本管理页和配方编辑页均需填写
- 版本名称优化：自动根据变更内容生成语义化描述（如"新增肉桂、枸杞"）
- 版本对比新增配方名称、业务员、成品重量、主料/辅料系数、描述等字段
- 版本对比页旧值/新值列标题改为动态显示版本号+版本名称
- 版本管理页变更列展示全部变更项并添加 tooltip 详情提示
- 修复业务员管理页面全局搜索功能无效
- 修复版本对比页 onExpandChange 事件签名兼容问题
- 修复 stores/version.ts 中 TypeError 防御性 null 检查

### v2.4.0 (2026-03-28)

首页布局重构：header-actions 移至 content-header 和 content-toolbar
后退/前进/刷新按钮移至页面标题后，统一粉色按钮样式
锁屏和用户头像下拉菜单移至 content-header 右侧
全局搜索框固定 220px 宽度，新增按钮居右
用户头像下拉菜单（账号设置、主题、切换账号、退出）
刷新改为仅刷新内容区（router-view key 刷新，非全页刷新）
原料列表库存列去掉 Tag 样式，改为纯文本
原料类型列增加 Tag 样式区分药材/辅料
业务员列表邮箱列固定 160px 宽度，支持文本换行
修复业务员停用报错（DELETE 请求 + SQLite 字符串参数修正）
修复配方表单帮助文本被 input-number 按钮遮挡
清理过时的开发文档，更新 README

### v2.3.0 (2026-03-26)

- 配方列表展开行改为展示版本记录（版本号、状态、创建时间、变更详情）
- 配方列表新增"状态"列，直观展示发布/草稿/未发布状态
- 版本变更展示从原始 JSON 改为直观的标签列表（新增/删除/修改，旧值→新值）
- 最近配方查看页改为与配方管理页一致，跳转至完整详情页
- 配方编辑页原料 ID 校正：种子数据重跑后通过名称匹配修复 ID 错位
- 营养计算备选查找：materialId 匹配不到时通过原料名称查找营养数据
- 版本管理页新增配方名称显示
- 发布版本接口增强：配方存在性检查、错误日志、SQL 兼容性修复
- 种子脚本修复：重跑时正确获取已有原料 ID 避免关联错位

### v2.2.0 (2026-03-26)

- 配方管理新增成品重量（finished_weight）和含量比系数（ratio_factor，默认0.18）
- 含量比计算公式：`含量比 = 原料quantity / 成品重量 * 含量比系数`
- 支持原料级别含量比系数覆盖（不同原料可单独设置 ratioFactor）
- 营养成分计算表格重构：营养成分汇总 = Σ(per100g × 含量比)
- 能量计算：`能量 = 蛋白质×17 + 脂肪×37 + 碳水化合物×17`
- 配方详情页增加返回按钮、成品重量/含量比系数展示
- 技术处理依据列橙色着色区分于营养成分表
- 含量比显示格式优化为百分比（如 2.16%）
- 数据库表结构文档同步更新

### v2.1.0 (2026-03-25)

- 移除客户管理模块，简化业务模型
- 配方关联由客户改为业务员（salesman_id / salesman_name）
- 用户角色精简为 admin / formulist
- 删除业务员-客户关联、业务员-配方师对接、沟通记录功能
- 数据库从 17 张表精简为 13 张表
- 后端从 8 个控制器精简为 7 个，路由同步调整
- 前端移除客户相关视图、API、Store、类型定义

### v2.0.0 (2026-03-25)

- 架构升级为前后端分离（Vue 3 + Express + SQLite）
- 新增 JWT 认证体系与多角色权限
- 新增配方版本控制（自动/手动版本、版本对比）
- 新增导出管理（模板管理、任务跟踪、分享链接）
- 新增营养分析（成分录入、配方汇总、合规检查）
- 新增 RESTful API（7 个模块、30+ 个端点）
- 填充完整种子数据
- 生成 API 接口文档与数据库文档

### v1.2.0 (2026-03-24)

- 新增配方详情弹窗
- 统一操作按钮样式

### v1.1.0 (2026-03-23)

- 新增主页（侧边栏导航、猫咪Logo动画）
- 实现天气显示与每日祝福语
- 添加锁屏功能

### v1.0.0

- 项目初始版本（LocalStorage 单体应用）

## 许可证

MIT License
