# TingStudio v2.0

食品配方工作数据管理平台 — 前后端分离架构

## 项目简介

TingStudio 是一个专业的食品配方工作数据管理平台，提供配方管理、原料管理、业务员管理、营养成分分析、导出分享等完整功能链路。采用 Vue 3 + Express + SQLite 前后端分离架构，支持 JWT 认证、RESTful API、配方版本控制、营养合规检查等企业级特性。

## 技术栈

### 后端
- **运行时**: Node.js + TypeScript
- **Web 框架**: Express 4.21+
- **数据库**: SQLite (better-sqlite3)
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
- **表单验证**: VeeValidate + Yup
- **样式**: SCSS

## 功能特性

### 认证系统
- 用户注册/登录（JWT Token）
- 多角色支持（admin / formulist）
- Token 自动续期与过期处理

### 原料管理
- 原料信息 CRUD
- 唯一编码校验
- 配方引用检测（防误删）

### 配方管理
- 配方信息 CRUD（关联业务员 + 多原料）
- 关键词搜索与业务员过滤
- 自动版本控制（每次更新自动生成快照）
- 手动创建/发布版本
- 版本对比（原料变更可视化）

### 业务员管理
- 业务员信息 CRUD
- 关键词搜索与状态筛选
- 软删除（停用）

### 导出与分享
- 导出模板管理（PDF/Excel/API/打印）
- 导出任务创建与状态跟踪
- 分享链接（支持密码、过期时间、下载限制）

### 营养分析
- 原料营养成分录入（per 100g）
- 配方营养汇总计算
- 营养标准管理（按人群分类）
- 合规性检查（与标准对比，生成建议）

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
│   │   │   ├── init.sql              # 建表 SQL
│   │   │   ├── initDatabase.ts       # 数据库初始化
│   │   │   └── seedData.ts           # 种子数据（每表30条）
│   │   ├── utils/                    # 工具函数
│   │   └── index.ts                  # 入口文件
│   ├── data/                         # SQLite 数据库文件
│   ├── API_DOC.md                    # API 接口文档
│   ├── DATABASE_DOC.md               # 数据库文档
│   └── package.json
├── frontend/                         # 前端应用
│   ├── src/
│   │   ├── api/                      # API 接口层（HTTP 封装）
│   │   ├── stores/                   # Pinia 状态管理
│   │   ├── views/                    # 页面组件
│   │   │   ├── auth/                 # 登录/注册
│   │   │   ├── materials/            # 原料管理
│   │   │   ├── formulas/             # 配方管理
│   │   │   ├── salesmen/             # 业务员管理
│   │   │   ├── versions/             # 版本控制
│   │   │   ├── exports/              # 导出管理
│   │   │   ├── nutrition/            # 营养分析
│   │   │   ├── Home.vue              # 首页
│   │   │   └── Tools.vue             # 工具箱
│   │   ├── router/                   # 路由配置
│   │   ├── types/                    # 类型定义
│   │   └── App.vue                   # 根组件
│   ├── vite.config.ts                # Vite 配置（含 API 代理）
│   └── package.json
├── PRD-TingStudio-v2.0.md            # 产品需求文档
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

# 填充种子数据（可选，每表30条示例数据）
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

## API 文档

详细的接口文档请查看 [backend/API_DOC.md](./backend/API_DOC.md)，涵盖 7 个模块、30+ 个端点的完整说明。

## 数据库文档

数据库表结构与字段说明请查看 [backend/DATABASE_DOC.md](./backend/DATABASE_DOC.md)，覆盖全部 13 张表。

## 主要脚本

| 命令 | 位置 | 说明 |
|------|------|------|
| `npm run dev` | backend | 启动后端开发服务 |
| `npm run build` | backend | 编译后端 TypeScript |
| `npm run init-db` | backend | 初始化数据库表结构 |
| `npm run seed` | backend | 填充种子数据 |
| `npm run dev` | frontend | 启动前端开发服务 |
| `npm run build` | frontend | 构建前端生产版本 |

## 更新日志

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
- 填充完整种子数据（10 张表、共 270+ 条记录）
- 生成 API 接口文档与数据库文档

### v1.2.0 (2026-03-24)
- 新增配方详情弹窗
- 统一操作按钮样式
- 修复 WebView 定位报错

### v1.1.0 (2026-03-23)
- 新增主页（侧边栏导航、猫咪Logo动画）
- 实现天气显示与每日祝福语
- 添加锁屏功能

### v1.0.0
- 项目初始版本（LocalStorage 单体应用）
- 用户注册登录、客户/原料/配方管理

## 许可证

MIT License
