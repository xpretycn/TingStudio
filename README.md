# TingStudio v2.18

食品配方工作数据管理平台 — 前后端分离架构

## 项目简介

TingStudio 是一个专业的食品配方工作数据管理平台，面向食品配方行业（中草药功效配方），提供配方管理、原料管理、业务员管理、营养成分分析、导出分享等完整功能链路。采用 **Vue 3 + Express + 腾讯MySQL** 前后端分离架构，支持 JWT 认证、RESTful API、配方版本控制、营养合规检查等企业级特性。

## 🚀 最新更新 (2026-04-20)

### ✅ 生产环境升级完成
- **数据库迁移**：从 SQLite 迁移到腾讯云 MySQL（企业级数据库）
- **后端服务**：部署到腾讯云函数 SCF
- **前端托管**：部署到 EdgeOne Pages
- **数据完整性**：成功迁移 153 条业务记录到云端数据库
- **系统稳定性**：显著提升，支持高并发访问

## 技术栈

### 后端 (Production)

- **运行时**: Node.js 18+ (TypeScript)
- **Web 框架**: Express 4.21+
- **数据库**: 
  - **生产环境**: 腾讯云 MySQL (CynosDB)
  - **开发环境**: SQLite (better-sqlite3) + WAL 模式
  - **双模式支持**: 自动适配开发/生产环境
- **云服务**: 腾讯云函数 SCF (Serverless)
- **认证**: JWT (jsonwebtoken + bcryptjs)
- **安全**: Helmet + CORS + express-rate-limit
- **日志**: Morgan
- **Excel**: xlsx | **PDF**: pdfkit
- **AI 服务**: 通义千问 / 智谱 GLM / DeepSeek 多模型支持

### 前端 (Production)

- **框架**: Vue 3.4+ (Composition API, TypeScript 5.4+)
- **构建工具**: Vite 5.1+
- **路由**: Vue Router 4.3+
- **状态管理**: Pinia 2.1+
- **UI 组件库**: TDesign Vue Next 1.9+
- **HTTP 客户端**: Axios
- **样式**: SCSS + CSS 自定义属性
- **托管服务**: EdgeOne Pages (CDN 加速)

### 基础设施

| 服务 | 提供商 | 用途 |
|------|--------|------|
| 云函数 | 腾讯云 SCF | 后端 API 服务 |
| 数据库 | 腾讯云 CynosDB (MySQL) | 数据持久化存储 |
| 前端托管 | EdgeOne Pages | 静态资源 CDN 分发 |
| 对象存储 | 腾讯云 COS (可选) | 文件上传存储 |

## 🌐 访问地址

### 生产环境

- **前端地址**: `https://tingstudio-frontend-e3hnbwbu.edgeone.cool/login`
- **后端 API**: `https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api`
- **健康检查**: `https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health`

### 开发环境

- **前端地址**: `http://localhost:5174`
- **后端 API**: `http://localhost:3000/api`
- **健康检查**: `http://localhost:3000/health`

## 📦 快速开始

### 环境要求

- Node.js >= 18.x
- npm 或 pnpm
- Git

### 本地开发

#### 1. 克隆项目
```bash
git clone <repository-url>
cd ting-studio
```

#### 2. 安装依赖
```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

#### 3. 配置环境变量

**后端配置** ([backend/.env](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env)):
```bash
# 开发环境使用 SQLite
DB_TYPE=sqlite
DB_PATH=./data/tingstudio.db

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=http://localhost:5174
```

**前端配置** ([frontend/.env.development](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.development)):
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

#### 4. 启动服务

**启动后端**:
```bash
cd backend
npm run dev
# 服务运行在 http://localhost:3000
```

**启动前端**:
```bash
cd frontend
npm run dev
# 服务运行在 http://localhost:5174
```

#### 5. 初始化数据库
```bash
cd backend
npm run init-db      # 初始化数据库表结构
npm run seed         # 导入种子数据（可选）
```

## 🏗️ 项目架构

### 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                   用户浏览器                          │
│         (Vue 3 + TDesign UI + Pinia)                │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────┐
│              EdgeOne Pages (CDN)                     │
│          静态资源分发 + 全球加速                      │
└──────────────────┬──────────────────────────────────┘
                   │ API 调用
┌──────────────────▼──────────────────────────────────┐
│           腾讯云函数 SCF (Serverless)                 │
│        Express + TypeScript + JWT 认证               │
└──────────────────┬──────────────────────────────────┘
                   │ 数据库连接
┌──────────────────▼──────────────────────────────────┐
│           腾讯云 CynosDB (MySQL)                      │
│            企业级关系型数据库                         │
│     (12张表 · 153条记录 · 自动备份)                  │
└─────────────────────────────────────────────────────┘
```

### 目录结构

```
ting-studio/
├── backend/                              # 后端服务
│   ├── src/
│   │   ├── config/                       # 配置模块
│   │   │   ├── database.ts              # SQLite 连接配置
│   │   │   ├── mysql.ts                 # MySQL 连接配置
│   │   │   └── database-adapter.ts      # 双模式数据库适配器
│   │   ├── controllers/                  # 控制器层 (8个模块)
│   │   ├── middleware/                   # 中间件 (认证/校验/错误处理)
│   │   ├── routes/                       # 路由定义 (8个模块)
│   │   ├── scripts/                      # 工具脚本
│   │   │   ├── migrate-to-mysql.ts       # 数据迁移脚本
│   │   │   ├── init-mysql-database.ts    # MySQL 初始化
│   │   │   └── manual-migrate.js         # 手动迁移工具
│   │   ├── services/                     # 业务服务层
│   │   │   └── ai/                       # AI 服务 (多模型)
│   │   └── utils/                        # 工具函数
│   ├── scf/                             # 云函数部署包
│   │   ├── index.js                     # 函数入口
│   │   ├── package.json                 # 云函数依赖
│   │   └── .env.production              # 生产环境配置
│   ├── data/                            # SQLite 数据库 (开发环境)
│   ├── cloudbaserc.json                  # 云函数配置
│   ├── ecosystem.config.js              # PM2 生产配置
│   └── package.json
│
├── frontend/                            # 前端应用
│   ├── src/
│   │   ├── api/                         # API 接口层
│   │   ├── stores/                      # Pinia 状态管理
│   │   ├── views/                       # 页面组件
│   │   ├── components/                  # 公共组件
│   │   ├── assets/styles/               # 样式体系
│   │   └── router/                      # 路由配置
│   ├── edgeone/                        # EdgeOne 配置
│   ├── dist/                           # 构建输出
│   └── package.json
│
├── PRODUCTION_DEPLOYMENT_GUIDE.md       # 生产环境部署指南
├── EDGEONE_DEPLOYMENT_FIX.md           # EdgeOne 故障修复指南
├── SCF_MANUAL_DEPLOYMENT_GUIDE.md      # 云函数手动部署指南
└── README.md                           # 项目文档 (本文件)
```

## 🎯 核心功能特性

### 🔐 认证与权限
- 用户注册/登录 (JWT Token)
- 多角色支持 (admin / formulist)
- Token 自动续期与过期处理
- 个人资料管理 (昵称/头像/简介/邮箱/手机号)

### 📊 原料管理
- 原料信息 CRUD (自动生成编码 MAT 序列)
- 原料类型区分 (药材/辅料)
- 营养成分录入 (25+ 营养字段)
- 能量自动计算 (蛋白质×17+脂肪×37+碳水化合物×17)
- AI 智能营养解析 (文档上传 → 结构化数据)

### 🧪 配方管理
- 配方信息 CRUD (关联业务员 + 多原料)
- 成品重量与含量比系数设置
- Excel 批量导入配方原料
- 自动版本控制 (每次更新生成变更快照)
- 手动创建/发布版本
- 版本对比 (全字段差异可视化)
- AI 智能填单 (文档解析 → 一键回填)

### 👥 业务员管理
- 业务员信息 CRUD
- 关键词搜索与状态筛选
- 软删除 (停用)

### 🥗 营养分析
- 配方营养汇总计算
- 核心营养素卡片可视化
- NRV 占比进度条展示
- 营养标准管理 (预置 6 类人群国标数据)
- 合规性检查 (三级状态: 达标/警告/超标)
- 营养数据 Excel 导入

### 📤 导出与分享
- **Excel 导出**: 配方信息 + 原料清单 + 营养数据 (三 Sheet)
- **PDF 导出**: 专业排版配方报告
- 导出模板管理 (PDF/Excel/API/打印)
- 导出任务创建与状态跟踪
- 分享链接创建与管理
- API 数据接口管理面板

### 🤖 AI 智能助手
- **智能填单**: 上传配方文档 → AI 解析为结构化数据
- **智能营养解析**: 上传营养文档 → 解析核心营养素
- **智能检索**: 自然语言查询 → SQL 安全执行
- **多模型支持**: 通义千问 / 智谱 GLM / DeepSeek
- **文件格式**: Excel / 文本 / 图片 (多模态解析)
- **安全机制**: SQL 白名单校验 + 数据隔离

### 🌤️ 天气服务
- 实时天气展示 (基于浏览器 Geolocation 定位)
- 和风天气 API (免费订阅版)
- 城市搜索 (全球城市模糊匹配)
- 智能缓存 (30分钟内存缓存)
- 天况图标 emoji 映射 (50+ 图标)

## 🗄️ 数据库设计

### 表结构概览

| 表名 | 说明 | 记录数 | 关键字段 |
|------|------|--------|----------|
| users | 用户表 | 12 | id, username, password, role |
| materials | 材料表 | 12 | id, name, code, material_type |
| formulas | 配方表 | 12 | id, name, salesman_id, materials_json |
| salesmen | 销售员表 | 12 | id, name, code, department |
| formula_versions | 配方版本表 | 36 | version_id, formula_id, version_number |
| material_nutrition | 材料营养表 | 56 | nutrition_id, material_id, per_100g_json |
| nutrition_profiles | 营养配置表 | 6 | profile_id, name, category |
| export_templates | 导出模板表 | 6 | template_id, name, type |
| export_jobs | 导出任务表 | 10 | job_id, status, file_url |
| share_configs | 分享配置表 | 2 | share_id, share_url |
| formula_nutrition_summaries | 营养汇总表 | 5 | summary_id, formula_id |

**总计**: 11 张表, 153 条业务记录

### 数据库双模式

项目支持 **SQLite (开发)** 和 **MySQL (生产)** 双模式：

```typescript
// database-adapter.ts 自动适配
if (process.env.DB_TYPE === 'mysql') {
  // 生产环境: 使用腾讯云 MySQL
} else {
  // 开发环境: 使用本地 SQLite
}
```

## 🚀 部署指南

### 生产环境部署

详见 [PRODUCTION_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md)

#### 快速部署步骤

1. **构建前端**
```bash
cd frontend
npm run build:deploy
```

2. **构建后端**
```bash
cd backend
npm run build:scf
```

3. **部署云函数**
```bash
tcb login --apiKeyId YOUR_ID --apiKey YOUR_KEY
tcb fn deploy tingstudio-api --force
```

4. **部署前端到 EdgeOne**
```bash
edgeone pages deploy \
    --project-id pages-zeg2qv2ptbrb \
    --dist-dir dist \
    --env production
```

5. **验证部署**
```bash
curl https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health
```

### EdgeOne 故障修复

如果遇到 **401 UNAUTHORIZED** 错误，请参考 [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)

**常见解决方案：**
1. 重新生成预览链接 (推荐)
2. 使用 CLI 重新部署
3. 手动上传文件
4. 清除 CDN 缓存

### 数据迁移

从 SQLite 迁移到 MySQL：
```bash
cd backend
npm run migrate-to-mysql
# 或使用手动迁移工具
node src/scripts/manual-migrate.js
```

## ⚙️ 环境配置

### 后端环境变量

**开发环境** ([backend/.env](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env)):
```bash
DB_TYPE=sqlite
DB_PATH=./data/tingstudio.db
PORT=3000
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5174
```

**生产环境** ([backend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env.production)):
```bash
NODE_ENV=production
PORT=9000
DB_TYPE=mysql
MYSQL_HOST=sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com
MYSQL_PORT=23996
MYSQL_USER=xprety
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=tingstudio
CORS_ORIGIN=https://tingstudio-frontend-e3hnbwbu.edgeone.cool
```

**AI 服务配置** (可选):
```bash
AI_DASHSCOPE_API_KEY=sk-your-key
AI_DASHSCOPE_MODEL=qwen-plus
AI_ZHIPU_API_KEY=sk-your-key
AI_ZHIPU_MODEL=glm-4v-flash
AI_DEEPSEEK_API_KEY=sk-your-key
AI_DEEPSEEK_MODEL=deepseek-chat
```

### 前端环境变量

**开发环境** ([frontend/.env.development](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.development)):
```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=TingStudio (开发环境)
```

**生产环境** ([frontend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.production)):
```bash
VITE_API_BASE_URL=https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api
VITE_APP_TITLE=TingStudio
```

## 🛠️ 开发命令

### 后端命令

```bash
# 开发模式
npm run dev                    # 启动开发服务器 (端口 3000)

# 构建命令
npm run build                  # TypeScript 编译
npm run build:deploy           # 构建 ES Module 版本 (用于云函数)
npm run build:scf              # 构建 SCF 专用版本

# 数据库命令
npm run init-db                # 初始化 SQLite 数据库
npm run init-mysql             # 初始化 MySQL 数据库
npm run seed                   # 导入种子数据
npm run migrate-to-mysql       # 迁移数据到 MySQL

# 测试命令
npm run test-mysql             # 测试 MySQL 连接
```

### 前端命令

```bash
# 开发模式
npm run dev                    # 启动开发服务器 (端口 5174)

# 构建命令
npm run build                  # 类型检查 + 构建
npm run build:deploy           # 仅构建 (跳过类型检查)

# 测试命令
npm run test                   # 单元测试 (vitest)
npm run test:e2e               # E2E 测试 (playwright)
npm run test:coverage          # 测试覆盖率报告
```

## 📚 文档索引

| 文档 | 说明 | 路径 |
|------|------|------|
| **README** | 项目总览 (本文件) | [README.md](file:///d:/ProgramData/workspace-codeby/ting-studio/README.md) |
| **API 文档** | 接口定义与说明 | [backend/API_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/API_DOC.md) |
| **数据库文档** | 表结构与关系 | [backend/DATABASE_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/DATABASE_DOC.md) |
| **生产部署指南** | 完整部署流程 | [PRODUCTION_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md) |
| **EdgeOne 修复** | 401 错误解决 | [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md) |
| **SCF 部署指南** | 云函数手动部署 | [SCF_MANUAL_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/SCF_MANUAL_DEPLOYMENT_GUIDE.md) |

## 🔒 安全特性

- **认证机制**: JWT Token + bcryptjs 密码加密
- **输入校验**: vee-validate + Yup schema 校验
- **SQL 注入防护**: 参数化查询 + 白名单机制
- **XSS 防护**: Helmet 中间件 + 输出转义
- **CSRF 防护**: SameSite Cookie 属性
- **速率限制**: express-rate-limit 防暴力破解
- **CORS 配置**: 严格的跨域访问控制
- **日志审计**: Morgan 请求日志记录

## 📈 性能优化

### 前端优化
- **代码分割**: 路由级懒加载
- **资源压缩**: Gzip/Brotli 压缩
- **CDN 加速**: EdgeOne 全球节点分发
- **图片优化**: SVG 图标 + 懒加载
- **缓存策略**: 浏览器缓存 + CDN 缓存

### 后端优化
- **连接池**: MySQL 连接池管理
- **查询优化**: 索引优化 + 查询缓存
- **响应压缩**: Gzip 压缩中间件
- **并发处理**: PM2 集群模式 (多核 CPU)
- **监控告警**: 健康检查 + 日志监控

## 🤝 贡献指南

### 开发规范
- 使用 TypeScript 编写代码
- 遵循 ESLint + Prettier 代码风格
- 编写单元测试覆盖核心逻辑
- 提交前运行 `npm test` 确保通过

### Git 工作流
1. 从 main 创建 feature 分支
2. 完成开发和测试
3. 提交 Pull Request
4. Code Review 通过后合并

### Commit 规范
```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链
```

## ❓ 常见问题

### Q: 如何切换数据库模式？
A: 修改 `.env` 中的 `DB_TYPE` 参数:
- `sqlite` - 本地开发环境
- `mysql` - 生产环境 (需要配置 MySQL 连接信息)

### Q: EdgeOne 显示 401 UNAUTHORIZED 怎么办？
A: 参考 [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)，通常重新生成预览链接即可解决。

### Q: 如何备份数据？
A: 生产环境使用腾讯云 MySQL 自动备份。开发环境可复制 `data/tingstudio.db` 文件。

### Q: AI 功能如何配置？
A: 在 `.env` 中配置对应的 API Key:
- `AI_DASHSCOPE_API_KEY` - 通义千问
- `AI_ZHIPU_API_KEY` - 智谱 GLM
- `AI_DEEPSEEK_API_KEY` - DeepSeek

## 📄 许可证

MIT License

## 👥 致谢

感谢以下开源项目和服务的支持:
- Vue.js 团队
- Express 社区
- TDesign UI 组件库
- 腾讯云 (SCF / CynosDB / EdgeOne / COS)
- 通义千问 / 智谱 AI / DeepSeek

---

**最后更新**: 2026-04-20  
**版本**: v2.18 (Production Ready)  
**维护者**: TingStudio Team