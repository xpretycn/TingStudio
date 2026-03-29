# TingStudio v2.0

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
- 猫咪 Logo 动画、用户信息卡片、日期天气、每日祝福语
- 可折叠功能导航栏（最近配方、配方管理、原材料管理、业务员管理、营养分析、版本管理、导出中心、工具箱）
- 内容区顶部工具栏：后退/前进/刷新导航、全局搜索、新增按钮
- 用户头像下拉菜单（账号设置、主题切换、切换账号、退出登录）
- 锁屏功能

### 认证系统
- 用户注册/登录（JWT Token）
- 多角色支持（admin / formulist）
- Token 自动续期与过期处理
- 路由守卫（未认证自动跳转登录页）

### 原料管理
- 原料信息 CRUD
- 唯一编码校验
- 配方引用检测（防误删）
- 原料类型 Tag 区分（药材/辅料）

### 配方管理
- 配方信息 CRUD（关联业务员 + 多原料）
- 成品重量与主料/辅料含量比系数设置
- 原料级别含量比系数覆盖
- 关键词搜索与业务员过滤
- 自动版本控制（每次更新自动生成全字段变更快照）
- 手动创建/发布版本（非当前版本均可发布为当前版本）
- 发布版本时自动同步快照数据到配方主表
- 升版原因强制校验与展示
- 语义化版本名称（自动根据变更内容生成描述性名称）
- 版本对比（配方名/业务员/参数/原料等全字段差异可视化）
- 版本对比页旧值/新值列标题动态显示版本号+版本名称
- 配方列表展开行展示完整版本记录与变更详情

### 业务员管理
- 业务员信息 CRUD
- 关键词搜索与状态筛选
- 软删除（停用）

### 营养分析
- 原料营养成分录入（per 100g）
- 配方营养汇总计算（含量比 = 原料量 / 成品重量 * 系数）
- 能量计算：蛋白质×17 + 脂肪×37 + 碳水化合物×17
- 营养标准管理（按人群分类）
- 合规性检查（与标准对比，生成建议）
- 营养数据导入（Excel）

### 导出与分享
- 导出模板管理（PDF/Excel/API/打印）
- 导出任务创建与状态跟踪
- 分享链接（支持密码、过期时间、下载限制）

## 项目结构

```
ting-studio/
├── backend/                          # 后端服务
│   ├── src/
│   │   ├── config/                   # 配置（数据库、JWT、应用）
│   │   ├── controllers/              # 控制器（7个模块）
│   │   │   ├── authController.ts
│   │   │   ├── materialController.ts
│   │   │   ├── formulaController.ts
│   │   │   ├── salesmanController.ts
│   │   │   ├── versionController.ts
│   │   │   ├── exportController.ts
│   │   │   └── nutritionController.ts
│   │   ├── middleware/                # 中间件（认证、校验、错误处理）
│   │   ├── routes/                   # 路由定义（7个模块）
│   │   ├── scripts/                  # 数据库脚本
│   │   │   ├── init.sql              # 建表 SQL（13张表）
│   │   │   ├── initDatabase.ts       # 数据库初始化
│   │   │   └── seedData.ts           # 种子数据
│   │   ├── utils/                    # 工具函数
│   │   └── index.ts                  # 入口文件
│   ├── data/                         # SQLite 数据库文件
│   ├── API_DOC.md                    # API 接口文档
│   ├── DATABASE_DOC.md               # 数据库文档
│   └── package.json
├── frontend/                         # 前端应用
│   ├── src/
│   │   ├── api/                      # API 接口层（Axios 封装）
│   │   ├── stores/                   # Pinia 状态管理
│   │   ├── views/                    # 页面组件
│   │   │   ├── auth/                 # 登录/注册
│   │   │   ├── materials/            # 原料管理
│   │   │   ├── formulas/             # 配方管理
│   │   │   ├── salesmen/             # 业务员管理
│   │   │   ├── versions/             # 版本控制
│   │   │   ├── exports/              # 导出管理
│   │   │   ├── nutrition/            # 营养分析
│   │   │   ├── Home.vue              # 首页（左右分栏布局）
│   │   │   └── Tools.vue             # 工具箱
│   │   ├── components/               # 公共组件
│   │   │   └── Layout/               # 布局组件
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

### 后端

```bash
cd backend
npm install

# 初始化数据库
npm run init-db

# 填充种子数据（可选）
npm run seed

# 启动开发服务（端口 3000）
npm run dev
```

### 前端

```bash
cd frontend
npm install

# 启动开发服务（端口 5173，API 代理到 localhost:3000）
npm run dev
```

启动后访问 http://localhost:5173

### 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `admin123` | 管理员 |
| `user002` | `user002` | 配方师 |

> 其他测试账号：`user003` ~ `user030`，密码与用户名相同，角色在 admin/formulist 间循环。

## 数据库表结构

共 13 张表：

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `materials` | 原料表 |
| `material_nutrition` | 原料营养成分表 |
| `formulas` | 配方表 |
| `formula_versions` | 配方版本表 |
| `formula_nutrition_summaries` | 配方营养汇总表 |
| `salesmen` | 业务员表 |
| `export_templates` | 导出模板表 |
| `export_jobs` | 导出任务表 |
| `api_data_interfaces` | API 数据接口表 |
| `share_configs` | 分享配置表 |
| `nutrition_profiles` | 营养标准表 |
| `nutrition_analysis_reports` | 营养分析报告表 |

详见 [backend/DATABASE_DOC.md](./backend/DATABASE_DOC.md)。

## API 文档

详细的接口文档请查看 [backend/API_DOC.md](./backend/API_DOC.md)，涵盖 7 个模块、30+ 个端点的完整说明。

## 数据隔离规则

| 数据模块 | 普通用户 (formulist) | 管理员 (admin) |
|---------|---------------------|---------------|
| 配方 | 仅查看自己创建的 | 可查看所有 |
| 原料 | 仅查看自己创建的 | 可查看所有 |
| 业务员 | 可查看全部 | 可查看全部 |
| 版本 | 对自己的配方操作 | 可操作所有 |
| 导出任务 | 仅查看自己创建的 | 可查看所有 |

## 主要脚本

| 命令 | 位置 | 说明 |
|------|------|------|
| `npm run dev` | backend | 启动后端开发服务 |
| `npm run build` | backend | 编译后端 TypeScript |
| `npm run init-db` | backend | 初始化数据库表结构 |
| `npm run seed` | backend | 填充种子数据 |
| `npm run import-nutrition` | backend | 导入营养数据 (Excel) |
| `npm run dev` | frontend | 启动前端开发服务 |
| `npm run build` | frontend | 构建前端生产版本 |

## 更新日志

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
