# TingStudio v2.32.0

食品配方工作数据管理平台 — 前后端分离架构

## 项目简介

TingStudio 是一个专业的食品配方工作数据管理平台，面向食品配方行业（中草药功效配方），提供配方管理、原料管理、业务员管理、销量分析、报告中心、文件管理、营养成分分析、导出分享、配比阈值配置等完整功能链路。采用 **Vue 3 + Express + SQLite** 前后端分离架构，支持 JWT 认证、RESTful API、配方版本控制、营养合规检查、AI 智能解析、AI Agent 对话助手、悬浮助手等企业级特性。

---

## 📋 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue 3 + TypeScript + Vite | Composition API + `<script setup>` |
| **UI 组件库** | TDesign Vue Next (v1.9) | 企业级组件库 |
| **状态管理** | Pinia (17个 Store) | 模块化 Store |
| **路由** | Vue Router 4 | 懒加载路由 |
| **样式方案** | SCSS + Design Tokens | 模块化变量系统 + CSS 变量 |
| **图表** | ECharts 6 | 数据可视化 |
| **Markdown** | marked | 富文本渲染 |
| **表单校验** | vee-validate + Yup | 声明式表单验证 |
| **构建优化** | vite-plugin-compression | Gzip 压缩 |
| **后端框架** | Express + TypeScript | ESM 模块 |
| **数据库** | SQLite (better-sqlite3) | 本地文件数据库，WAL 模式 |
| **ORM** | 原生 SQL | 手写 + PRAGMA 优化 |
| **认证** | JWT (jsonwebtoken + bcryptjs) | Bearer Token |
| **AI 对接** | DeepSeek / 通义千问 / 智谱GLM | SSE 流式 + 非流式 |
| **文件解析** | xlsx + pdfkit + multer | Excel/PDF/图片解析 |
| **安全** | Helmet + CORS + compression + rate-limit | 安全中间件组合 |
| **定时任务** | node-cron | 会话清理等定时任务 |
| **拼音处理** | pinyin-pro | 原料编码自动生成 |
| **校验** | zod | 后端参数校验 |
| **测试** | Vitest + Playwright + vue-test-utils | 单元 + E2E 测试 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装 & 运行

```bash
# 1. 克隆项目
git clone <repo-url>
cd TingStudio

# 2. 安装后端依赖
cd backend
cp .env.example .env       # 配置环境变量（API Key 等）
npm install
npm run dev                # 启动后端（默认 3000 端口）

# 3. 安装前端依赖
cd ../frontend
npm install
npm run dev                # 启动前端（默认 5173 端口）
```

### 数据库初始化

```bash
cd backend
npm run init-db            # 初始化数据库表结构
npm run seed               # 填充示例数据（可选）
```

### 常用命令

| 命令 | 位置 | 说明 |
|------|------|------|
| `npm run dev` | backend / frontend | 开发模式热重载 |
| `npm run build` | backend / frontend | 生产构建 |
| `npm run test` | backend / frontend | 运行单元测试 |
| `npm run test:e2e` | frontend | 运行 Playwright E2E 测试 |
| `npm run test:coverage` | frontend | 测试覆盖率报告 |
| `npm run init-db` | backend | 初始化数据库 |
| `npm run seed` | backend | 填充示例数据 |

### 数据库迁移脚本

数据库迁移脚本位于 `backend/src/scripts/migrations/` 目录，用于修复数据问题和数据库 Schema 变更。

```bash
cd backend

# 修复文件名乱码（智能工具解析历史）
npx tsx src/scripts/migrations/fixGarbledFilenames.ts

# 修复 request_summary 乱码（旧版本）
npx tsx src/scripts/migrations/fixGarbledRequestSummary.ts
```

#### 文件名乱码修复脚本

**使用场景：** 当用户上传包含中文文件名的文件后，解析历史记录中文件名显示为乱码（如 `ÐÐâÂ¼þ.xlsx` 而不是 `测试文件.xlsx`）

**功能说明：**

- 自动扫描 `ai_usage_logs` 表中的乱码记录
- 智能提取 `request_summary` 中的文件名
- 尝试多种编码方式修复（latin1、binary、win1252、iso-8859-1、cp1252）
- 保留原有前缀（如"解析配方文件:"、"解析原料营养文件:"）
- 提供详细的修复日志输出

**常见乱码原因：**

- 不同浏览器对中文文件名的编码处理不一致
- multipart/form-data 编码传输问题
- Multer 接收文件名时的编码转换问题

**运行示例：**

```bash
cd backend
npx tsx src/scripts/migrations/fixGarbledFilenames.ts

# 预期输出：
# 开始迁移：修复 ai_usage_logs 中 request_summary 的中文文件名乱码...
# 
# 找到 5 条含 request_summary 的记录
# 
# ✅ 修复:
#    原: "解析配方文件: ÐÐâÂ¼þ.xlsx"
#    新: "解析配方文件: 测试文件.xlsx"
# 
# 成功修复 5 条乱码记录！
# 
# 迁移完成！
```

---

## 📁 项目结构

```
TingStudio/
├── backend/                          # 后端服务
│   ├── src/
│   │   ├── config/                   # 数据库配置、安全配置、限流、营养常量
│   │   ├── controllers/              # 控制器层（14个模块）
│   │   ├── middleware/               # 认证、错误处理、日志、校验
│   │   ├── routes/                   # 路由定义（15+ Agent端点 + 20+ 其他端点）
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── ai/                   # AI 服务（Agent/LLM/意图引擎）
│   │   │   │   └── agent/            # Agent 系统（12个模块）
│   │   │   │       ├── agentController.ts      # Agent 主控制器
│   │   │   │       ├── agentChatController.ts  # Agent 聊天控制器（ReAct 流式）
│   │   │   │       ├── agentWriteGuard.ts      # 写入权限守卫
│   │   │   │       ├── sessionCleaner.ts       # 过期会话清理器
│   │   │   │       ├── promptEngine.ts         # 提示词引擎 v3.0.0
│   │   │   │       ├── toolRegistration.ts     # 工具注册（查询/创建/修改/删除）
│   │   │   │       ├── llmService.ts           # LLM 流式调用服务
│   │   │   │       ├── sessionStore.ts         # 会话持久化（SQLite）
│   │   │   │       ├── dialogManager.ts        # 对话管理器
│   │   │   │       ├── intentEngine.ts         # 意图识别引擎
│   │   │   │       ├── toolRegistry.ts         # 工具注册表
│   │   │   │       └── index.ts                # 模块入口
│   │   │   ├── business/             # 业务服务（销售/业务员）
│   │   │   ├── file/                 # 文件解析服务
│   │   │   └── formula/              # 配方服务（营养/成本/含量比）
│   │   ├── scripts/                  # 数据库迁移和工具脚本
│   │   ├── types/                    # TypeScript 类型定义
│   │   └── utils/                    # 工具函数（导出/日志/校验）
│   ├── data/                         # SQLite 数据库文件 + 备份
│   └── exports/                      # 导出文件输出目录
│
├── frontend/                         # 前端应用
│   ├── src/
│   │   ├── api/                      # API 客户端（axios 封装，17个模块）
│   │   ├── assets/                   # 样式（Design Tokens/变量/主题）
│   │   ├── components/               # 公共组件
│   │   │   ├── AiAssistantFloat/     # 悬浮助手组件体系（8 Vue + 2 TS）
│   │   │   └── ...                   # 其他公共组件（18个）
│   │   ├── router/                   # Vue Router 配置
│   │   ├── stores/                   # Pinia 状态管理（17个 Store）
│   │   ├── utils/                    # 工具函数（时间格式化/图表/模拟数据）
│   │   ├── views/                    # 页面视图（40个 .vue 文件）
│   │   │   ├── ai/                   # AI 助手工作台 + 智能工具
│   │   │   │   └── tabs/             # 智能填单/导入/检索/历史
│   │   │   ├── formulas/             # 配方管理（列表/表单/详情/对比）
│   │   │   ├── materials/            # 原料管理（列表/表单/详情）
│   │   │   ├── salesmen/             # 业务员管理（列表/表单/详情）
│   │   │   ├── sales/                # 销量分析
│   │   │   ├── reports/              # 报告中心（周报/月报/生成/对比）
│   │   │   ├── nutrition/            # 营养分析（分析/标准）
│   │   │   ├── models/               # 模型管理
│   │   │   ├── files/                # 文件管理（列表/详情）
│   │   │   ├── exports/              # 导出中心
│   │   │   ├── versions/             # 版本管理（列表/对比）
│   │   │   ├── settings/             # 账号设置
│   │   │   └── errors/               # 错误页面
│   │   ├── App.vue                   # 根组件
│   │   └── main.ts                   # 入口文件
│   └── __tests__/                    # 测试文件
│
├── docs/                             # 项目文档
│   ├── agent-system/                 # AI Agent 系统设计文档
│   ├── ting-studio/                  # 功能模块设计文档
│   └── *.md                          # 历史 PRD/验收报告
│
└── .github/workflows/                # CI/CD 流水线
```

---

## ✨ 核心功能

| 功能模块 | 说明 |
|----------|------|
| **📋 配方管理** | 配方 CRUD、原料配比表、含量比校验（三级预警阈值配置）、版本控制、升版管理、定价系统 |
| **🧪 原料管理** | 原料 CRUD、材质分类（药材/辅料）、营养成分管理、单价管理 |
| **👤 业务员管理** | 业务员 CRUD、状态管理、区域/部门分群 |
| **📊 销量分析** | 多维聚合分析（日月/业务员/区域）、趋势图、TOP 排行 |
| **📄 报告中心** | 周报/月报 AI 自动分析、Markdown 渲染、报告对比、指标管理 |
| **🥗 营养分析** | 7 步法营养成分计算、NRV%、合规校验、营养档案管理 |
| **📎 文件管理** | 文件上传/预览、Excel/PDF/图片解析、批量导入、审计日志 |
| **📦 导出中心** | Excel/PDF 导出、自定义模板、API 接口管理 |
| **🤖 AI 助手** | Agent 对话（ReAct 循环）、意图识别、工具调用、写操作守卫、身份定义、悬浮助手（双模路由/SSE流式/结果卡片） |
| **🔮 悬浮助手** | 表单字段解析、智能对话、配方对比/成本/替代建议、指令模板、双模路由（fill/agent）、模型配置（位置/主题色/轮次/策略） |
| **🔍 智能检索** | NL2SQL 自然语言查询、跨表关联查询、聚合分析 |
| **📝 智能填单** | AI 解析配方/原料文件（Excel/PDF/图片），带模型选择器（Logo + 能力标签），含量比自动校验 |
| **📜 解析历史** | 解析结果管理（统计卡片/搜索/筛选/分页）、缓存命中（文件MD5去重）、关联配方/原料、存储监控（上限/清理阈值/降级熔断） |
| **📋 解析模板** | AI 解析模板配置（类别/模型/Prompt/字段映射）、预设模板、CRUD 管理 |
| **⚖️ 配比阈值** | 含量比校验三级预警阈值配置（正常/预警/高级预警）、实时验证、变更追踪 |
| **🛠️ 模型管理** | AI 模型配置、功能模块分配（模型应用）、用量监控、告警/健康/降级、悬浮助手配置 |
| **🔐 权限系统** | JWT 认证、角色控制（admin/user）、数据隔离 |
| **📁 版本管理** | 版本快照、版本对比（含量/报价双模式）、变更追踪 |
| **⚙️ 账号设置** | 个人资料管理（昵称/头像/简介/邮箱/手机号） |

---

## 🧪 测试体系

```bash
# 前端单元测试
cd frontend && npm run test

# 后端单元测试
cd backend && npm run test

# E2E 测试（Playwright）
cd frontend && npm run test:e2e

# 测试覆盖率
cd frontend && npm run test:coverage
```

---

## 📚 文档索引

| 文档 | 位置 |
|------|------|
| API 接口文档 | `backend/API_DOC.md` |
| 数据库设计 | `backend/DATABASE_DOC.md` |
| 部署方案 | `DEPLOY_PLAN.md` |
| 开发计划 | `DEVELOPMENT_PLAN.md` |
| 产品需求文档 | `PRD-TingStudio-v2.0.md` |
| Agent 系统设计 | `docs/agent-system/` |
| 功能模块设计文档 | `docs/ting-studio/` |
| 解析历史验证手册 | `docs/ting-studio/parse-history-verification-manual.md` |
| 生产部署指南 | `PRODUCTION_DEPLOYMENT_GUIDE.md` |
| EdgeOne 修复指南 | `EDGEONE_DEPLOYMENT_FIX.md` |
| SCF 部署指南 | `SCF_MANUAL_DEPLOYMENT_GUIDE.md` |

---

## 🗄️ 数据库概览

SQLite (better-sqlite3) + WAL 模式，共 **37 张表**：

| 分类 | 表名 | 说明 |
|------|------|------|
| **核心业务** | users, materials, formulas, salesmen, formula_versions | 用户/原料/配方/业务员/版本 |
| **营养体系** | material_nutrition, formula_nutrition_summaries, nutrition_profiles | 营养数据/汇总/标准 |
| **销量报告** | formula_sales, reports, report_targets | 销量/报告/指标 |
| **文件管理** | uploaded_files, file_audit_log, file_relations | 文件/审计/关联 |
| **导出系统** | export_templates, export_jobs | 模板/任务 |
| **解析系统** | parse_results, parse_result_configs, parse_templates | 解析结果/配置/模板 |
| **阈值配置** | ratio_threshold_configs | 含量比校验阈值配置 |
| **AI 模型** | ai_models, ai_usage_logs, ai_alert_configs, ai_alert_records, ai_health_records, ai_fallback_configs, model_applications | 模型/用量/告警/健康/降级/应用 |
| **Agent 系统** | agent_sessions, agent_messages, agent_pending_confirmations, agent_pending_forms, agent_role_config, agent_float_config, agent_provider_health, agent_session_cleanup_log | 会话/消息/确认/表单/身份/浮窗/健康/清理 |
| **其他** | search_export_cache | 缓存 |

备份/恢复工具：

```bash
cd backend
npx tsx src/scripts/exportDatabase.ts    # 导出完整备份
npx tsx src/scripts/restoreDatabase.ts    # 恢复数据库
```

---

<!-- ====================================================================== -->
<!-- 以下为历史版本更新日志，保留已有内容，自动补全 2026-07-03 最新更新 -->
<!-- ====================================================================== -->---

## 🚀 最新更新 (2026-05-19)

### ✅ 配比阈值配置功能

新增含量比校验阈值配置功能，支持自定义配比范围的预警阈值，用于智能导入和配方管理。

**功能特性**：

- 📊 **三级预警体系**：
  - 正常范围：[0.98, 1.02]（默认）
  - 预警范围：[0.95, 1.05]（默认）
  - 高级预警范围：[0.92, 1.08]（默认）
- 🛠️ **管理员专属**：仅管理员可修改阈值配置
- ✅ **实时验证**：配置时自动验证阈值嵌套关系（高级预警范围 ⊃ 预警范围 ⊃ 正常范围）
- 📅 **变更追踪**：记录最后更新时间和更新人
- 💾 **缓存机制**：阈值变更后自动刷新服务缓存，实时生效

**新增 API 端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/ratio-thresholds` | 获取当前阈值配置 |
| PUT | `/ratio-thresholds` | 更新阈值配置（仅管理员） |

**新增数据库表**：

| 表名 | 说明 |
|------|------|
| ratio_threshold_configs | 含量比校验阈值配置表 |

**新增文件**：

| 文件 | 说明 |
|------|------|
| backend/src/controllers/ratioThresholdController.ts | 阈值配置控制器 |
| backend/src/routes/ratioThresholds.ts | 阈值配置路由 |
| frontend/src/api/ratioThreshold.ts | 阈值配置 API 客户端 |
| backend/src/scripts/migrations/createRatioThresholdConfigs.ts | 阈值配置表迁移脚本 |

**其他更新**：

- 优化了 Home.vue 侧边栏日期天气卡片显示
- 增强了 SmartFormTab.vue 和 SmartImportTab.vue 的配比校验功能
- 新增 ParseResultConfig.vue 配置页面
- 更新了 router/index.ts 路由配置

---

## 🚀 最新更新 (2026-07-03)

### ✅ 智能工具重构 + 解析历史管理系统 + 解析模板系统

#### 🎯 SmartTools 页面重构

将智能工具入口页面重构为 **4-Tab 布局**，集成模型选择器与完整的工作流：

| Tab | 图标 | 功能 | 组件 |
|------|------|------|------|
| 💬 智能填单 | 📝 | AI 解析配方文件（Excel/PDF/图片） | [SmartFormTab.vue](frontend/src/views/ai/tabs/SmartFormTab.vue) |
| 📥 智能导入 | 📥 | AI 解析原料营养文件 | [SmartImportTab.vue](frontend/src/views/ai/tabs/SmartImportTab.vue) |
| 🔍 智能检索 | 🔍 | NL2SQL 自然语言查询 | [SmartSearchTab.vue](frontend/src/views/ai/tabs/SmartSearchTab.vue) |
| 📜 解析历史 | 📜 | 解析结果管理与追溯 | [SmartHistoryTab.vue](frontend/src/views/ai/tabs/SmartHistoryTab.vue) |

**模型选择器增强**：
- 支持按 provider 分组的模型下拉框（含 **Logo 图标** + 模型名称 + 数据类型标签）
- 输入框内显示选中模型 Logo + 名称 + 文本/图片能力标签
- 选中态 ✓ 指示

#### 📜 解析结果管理系统（全新）

**数据库表**：
| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `parse_results` | 解析结果存储 | id, user_id, call_type, file_hash, file_name, file_size, parsed_result, raw_response, model_provider, model_name, tokens_used, status, used_count, is_linked, linked_formula_id, expires_at |
| `parse_result_configs` | 存储配置 | id, config_key, config_value, description |

**已有表新增字段**：
| 表名 | 新增字段 | 说明 |
|------|---------|------|
| `formulas` | `parse_result_id` | 关联解析结果 |
| `materials` | `parse_result_id` | 关联解析结果 |

**核心功能**：
- **缓存命中**：文件 MD5 去重，相同文件二次上传命中缓存，不调用 AI API
- **智能填单关联**：解析结果 → 创建配方时自动传递 `parse_result_id`，配方详情页显示解析来源链接
- **搜索与筛选**：关键字搜索、状态过滤（成功/失败/处理中）、日期范围、模型筛选
- **统计卡片**：总数/存储状态/待处理/已关联 四个统计卡片
- **分页器**：仿文件管理列表的圆角分页按钮 + 缩略号 + 总条数显示
- **详情抽屉**：文件信息、原始 AI 响应、解析结果 JSON 预览
- **批量操作**：全选/取消全选、批量删除
- **存储监控**：存储上限配置、存储使用率环形进度条、降级/熔断自动告警

**API 端点**（17 条，挂载在 `/api/ai/parse-results`）：
- `GET /api/ai/parse-results` — 分页查询（支持 callType/status/keyword/日期/模型/关联状态过滤）
- `GET /api/ai/parse-results/statistics` — 统计信息
- `GET /api/ai/parse-results/config` — 获取配置
- `GET /api/ai/parse-results/degradation` — 降级状态判断
- `GET /api/ai/parse-results/:id` — 解析详情
- `POST /api/ai/parse-results` — 保存解析结果
- `PUT /api/ai/parse-results/config` — 更新配置
- `POST /api/ai/parse-results/cleanup` — 清理过期数据
- `DELETE /api/ai/parse-results/:id` — 删除单条记录

**后端服务**：
| 服务 | 说明 |
|------|------|
| [parseResultCleanupService.ts](backend/src/services/parseResultCleanupService.ts) | 定时清理（cron）+ 降级检测 + 熔断保护（存储使用率 > 95% 自动清理最旧 5%） |
| [parseResultMonitoringService.ts](backend/src/services/parseResultMonitoringService.ts) | 指标采集（请求数/成功率/Token用量/缓存命中率/存储使用率）+ 告警规则引擎 |

**前端页面**：
| 页面 | 说明 |
|------|------|
| [SmartTools.vue](frontend/src/views/ai/SmartTools.vue) | 4-Tab 布局入口，集成模型选择器 |
| [SmartHistoryTab.vue](frontend/src/views/ai/tabs/SmartHistoryTab.vue) | 解析历史管理页面（卡片列表/搜索/筛选/分页/详情抽屉/批量操作） |
| [ParseResultConfig.vue](frontend/src/views/ai/ParseResultConfig.vue) | 管理员配置页（存储上限/清理阈值/降级告警） |
| [DegradationBanner.vue](frontend/src/components/DegradationBanner.vue) | 全局降级状态横幅 |

#### 📋 解析模板系统（全新）

支持 AI 解析模板的 CRUD 管理，预设/自定义模板配置：

**新增数据库表 `parse_templates`**：
| 字段 | 说明 |
|------|------|
| id | 主键 |
| name | 模板名称 |
| category | 类别（formula/nutrition/general） |
| default_provider / default_model | 默认模型 |
| custom_prompt | 自定义提示词 |
| field_mapping | 字段映射 JSON |
| validation_rules | 校验规则 JSON |
| is_preset | 是否为预设模板 |
| is_active | 启用状态 |

**API 端点**（5 条，挂载在 `/api/parse-templates`）：
- `GET /api/parse-templates` — 列表（支持 keyword/category 过滤）
- `GET /api/parse-templates/:id` — 详情
- `POST /api/parse-templates` — 创建
- `PUT /api/parse-templates/:id` — 更新
- `DELETE /api/parse-templates/:id` — 删除

#### 🧪 含量比校验修复

修复智能填单创建配方时含量比校验失败的问题（偏差 -59.22%）：
- **根因**：前端未传递 `materialType` 字段，后端 `validateRatioFactor` 把所有原料当作药材（ratioFactor 0.18）计算
- **修复**：前端传递 `materialType: 'supplement' | 'herb'`，后端在 `materialItems` 构建时复制该字段
- **效果**：辅料使用 `supplementRatioFactor`（默认 1.0），含量比校验通过

### 影响范围总览

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| [SmartTools.vue](frontend/src/views/ai/SmartTools.vue) | 重构 | 4-Tab 布局 + 模型选择器（Logo/能力标签/分组/✓指示） |
| [SmartHistoryTab.vue](frontend/src/views/ai/tabs/SmartHistoryTab.vue) | 新增 | 解析历史完整管理页面 |
| [ParseResultConfig.vue](frontend/src/views/ai/ParseResultConfig.vue) | 新增 | 管理员配置页 |
| [DegradationBanner.vue](frontend/src/components/DegradationBanner.vue) | 新增 | 降级状态横幅组件 |
| [parseResult.ts](frontend/src/api/parseResult.ts) | 新增 | 19 个 API 方法 |
| [parseTemplate.ts](frontend/src/api/parseTemplate.ts) | 新增 | 5 个 API 方法 |
| [parseResultController.ts](backend/src/controllers/parseResultController.ts) | 新增 | ~20 个处理函数 |
| [parseTemplateController.ts](backend/src/controllers/parseTemplateController.ts) | 新增 | 5 个 CRUD 处理函数 |
| [parseResultCleanupService.ts](backend/src/services/parseResultCleanupService.ts) | 新增 | 定时清理 + 降级熔断 |
| [parseResultMonitoringService.ts](backend/src/services/parseResultMonitoringService.ts) | 新增 | 监控指标 + 告警规则引擎 |
| [aiController.ts](backend/src/controllers/aiController.ts) | 功能增强 | 解析缓存检测（MD5 hash）+ 保存解析结果 + 返回 id 字段 |
| [formulaController.ts](backend/src/controllers/formulaController.ts) | 功能增强 | 接收 parseResultId + 更新解析关联状态 |
| [nutritionController.ts](backend/src/controllers/nutritionController.ts) | 功能增强 | 返回 parseResultId 字段 |
| [database-better-sqlite3.ts](backend/src/config/database-better-sqlite3.ts) | 新增表 | parse_results + parse_result_configs + parse_templates |
| [routes/ai.ts](backend/src/routes/ai.ts) | 新增路由 | 17 条 parse-results 端点 |
| [routes/parseTemplates.ts](backend/src/routes/parseTemplates.ts) | 新增 | 5 条 parse-templates CRUD |
| [routes/index.ts](backend/src/routes/index.ts) | 路由注册 | 挂载 parse-templates |
| [FormulaForm.vue](frontend/src/views/formulas/FormulaForm.vue) | 功能增强 | AI 预填提示 + 智能生成描述/制法 + 快速创建业务员 |
| [FormulaDetail.vue](frontend/src/views/formulas/FormulaDetail.vue) | 功能增强 | 显示解析来源 + 跳转链接 |
| [api/ai.ts](frontend/src/api/ai.ts) | 功能增强 | ParsedFormula 接口新增 id 字段 |
| [api/formula.ts](frontend/src/api/formula.ts) | 功能增强 | FormulaForm 新增 parseResultId 字段 |
| 迁移脚本 | 新增 | createParseResultTables + addTokensUsedToParseResults |

---

## 🚀 最新更新 (2026-05-14)

### ✅ 悬浮球Agent增强 — 多轮对话 + 意图路由 + 工具调用

在悬浮助手中集成完整的 Agent 工具调用能力，实现表单填字段与智能对话双模路由：

#### 🎯 核心变更

| 变更 | 说明 |
|------|------|
| **双模路由** | 输入文本自动分类：`fill`（表单填字段）或 `agent`（工具调用对话） |
| **7类意图识别** | compare/substitute/quotation/generate/calculate/consult/fill 关键词匹配 |
| **SSE 流式对话** | 悬浮球中的 Agent 对话复用 AIDashboard 的 SSE 协议 |
| **3个新工具** | `compare_formulas` / `suggest_material_substitute` / `generate_quotation` |
| **3个结果卡片** | CompareCard / QuotationCard / SubstituteCard 可视化渲染 |
| **F2 智能生成** | 表单描述/制法区增加"✨智能生成"按钮，调用独立接口 |

#### 🔵 前端 UI 增强

| 组件 | 增强项 |
|------|--------|
| [FloatBubble](frontend/src/components/AiAssistantFloat/FloatBubble.vue) | 状态指示灯（绿/黄/红）+ 角标（红点数字）+ 悬停快捷命令（含量比/对比/报价） |
| [FloatDrawer](frontend/src/components/AiAssistantFloat/FloatDrawer.vue) | 动态标题（如"新增配方"） |
| [ChatInput](frontend/src/components/AiAssistantFloat/ChatInput.vue) | 指令模板栏（含量比校验/营养成分/成本计算/配方对比） |
| [ChatMessages](frontend/src/components/AiAssistantFloat/ChatMessages.vue) | 根据 displayType 渲染 CompareCard / QuotationCard / SubstituteCard |
| **CompareCard** 🆕 | 配方对比结果卡片（原料差异表 + 营养成分并列对比） |
| **QuotationCard** 🆕 | 报价单卡片（成本明细网格 + 建议售价 + 单位成本） |
| **SubstituteCard** 🆕 | 替代建议卡片（原料排行 + 相似度标签 + 价格/库存） |

#### 🛠️ 后端新增能力

| 文件 | 变更 |
|------|------|
| [agentController.ts](backend/src/services/ai/agent/agentController.ts) | + `classifyFloatIntent` + `floatChat` + `handleGenerateIntent` + `generateDescription` + `getFieldHints` + `getHealth` |
| [agentChatController.ts](backend/src/services/ai/agent/agentChatController.ts) | + `handleFloatReActStream` + `buildPageContext` |
| [toolRegistration.ts](backend/src/services/ai/agent/toolRegistration.ts) | + `compare_formulas` + `suggest_material_substitute` + `generate_quotation` |
| [promptEngine.ts](backend/src/services/ai/agent/promptEngine.ts) | + 字段咨询知识库（系数/含量比/命名规范等 8 条） |
| [routes/agent.ts](backend/src/routes/agent.ts) | + 4 条路由: float-chat, generate-description, field-hints, health |

#### 📡 新增 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/agent/float-chat` | 悬浮球 SSE 流式对话 |
| POST | `/api/agent/generate-description` | 智能生成配方描述/制法 |
| GET | `/api/agent/field-hints` | 页面漏字段提示 |
| GET | `/api/agent/health` | 模型健康状态 |

---

### ✅ 悬浮助手配置模块 + 模型管理 UI 优化

#### 🔵 悬浮助手配置 Tab（模型管理页面）

在模型管理页面新增**悬浮助手**Tab（位于"模型应用"与"用量监控"之间），支持完整的悬浮助手行为与外观配置：

**配置项一览**：

| 分类 | 配置项 | 类型 | 说明 |
|------|--------|------|------|
| 基本配置 | AI 模型 | 下拉框（含模型 Logo） | 选择悬浮助手使用的 AI 模型 |
| 基本配置 | 备用模型 | 下拉框（含模型 Logo） | 主模型不可用时的降级模型 |
| 基本配置 | 启用状态 | 开关 | 全局启用/禁用悬浮助手 |
| 外观设置 | 悬浮球位置 | Toggle 按钮 | 左侧/右侧 |
| 外观设置 | 抽屉宽度 | 数字输入 | 300-800px |
| 外观设置 | 主题色 | 颜色选择器 | 自定义悬浮球/抽屉主题色 |
| 外观设置 | 呼吸脉冲 | 开关 | 悬浮球呼吸动画效果 |
| 行为策略 | 启用页面 | 复选框组 | 限定悬浮助手出现的页面 |
| 行为策略 | 最大对话轮次 | 数字输入 | 单次对话最大轮数 |
| 行为策略 | 回填策略 | Toggle 按钮 | 覆盖/追加/仅预览 |
| 行为策略 | 上下文模式 | Toggle 按钮 | 页面级/全局/无上下文 |

**UI 设计特点**：

- 🎨 白色卡片布局（`.fa-card`），20px 圆角 + 柔和阴影 + hover 上浮效果
- 🎨 Toggle 按钮组（`.fa-toggle-group`），灰色底 + 白色激活态 + 绿色文字
- 🎨 下拉框内模型 Logo 展示（`<img>` + inline style，兼容 TDesign teleport 机制）
- 🎨 所有输入控件统一 180px 宽度

**新增数据库表 `agent_float_config`**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 主键 |
| user_id | TEXT UNIQUE | 用户 ID（每用户唯一） |
| enabled | INTEGER | 启用状态 |
| model / model_name | TEXT | AI 模型标识/显示名 |
| fallback_model / fallback_model_name | TEXT | 备用模型标识/显示名 |
| position | TEXT | 悬浮球位置（left/right） |
| drawer_width | INTEGER | 抽屉宽度 |
| theme_color | TEXT | 主题色 |
| show_pulse | INTEGER | 呼吸脉冲 |
| enabled_pages | TEXT | 启用页面 JSON 数组 |
| max_rounds | INTEGER | 最大对话轮次 |
| fill_strategy | TEXT | 回填策略（overwrite/append/preview） |
| context_mode | TEXT | 上下文模式（page/global/none） |

**新增 API 端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agent/float-config` | 获取当前用户的悬浮助手配置 |
| PUT | `/api/agent/float-config` | 更新当前用户的悬浮助手配置 |

***

#### 🛡️ Agent 写入守卫 + 会话清理 + 熔断保护

**写入守卫 (`agentWriteGuard.ts`)**：

对 Agent 的创建/修改/删除操作增加写入权限校验，防止未授权操作。

**会话清理器 (`sessionCleaner.ts`)**：

自动清理过期 Agent 会话及相关数据（消息、待确认、待表单），并记录清理日志到 `agent_session_cleanup_log` 表。

**熔断保护 (`agent_provider_health` 表)**：

跟踪各 AI Provider 的连续失败次数，当超过阈值时自动开启熔断，避免持续请求不可用的 Provider。

**新增数据库表**：

| 表名 | 说明 |
|------|------|
| agent_provider_health | AI Provider 熔断状态（连续失败次数、熔断开关、恢复时间） |
| agent_session_cleanup_log | 会话清理日志（清理会话数、消息数、确认数、表单数） |

***

### 影响范围总览

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue) | 新增 Tab | 悬浮助手配置面板（基本配置/外观设置/行为策略） |
| [AiAssistantFloat/](frontend/src/components/AiAssistantFloat/) | 新增组件体系 | FloatBubble / FloatDrawer / ChatInput / ChatMessages / CompareCard / QuotationCard / SubstituteCard + formFillAdapter |
| [floatAgent.ts](frontend/src/stores/floatAgent.ts) | 新增 Store | 悬浮助手状态管理 |
| [agent.ts (api)](frontend/src/api/agent.ts) | 新增方法 | `getFloatConfig()` / `updateFloatConfig()` / `parseForm()` / `floatChat()` / `generateDescription()` / `getFieldHints()` / `getHealth()` |
| [agent.ts (routes)](backend/src/routes/agent.ts) | 新增路由 | 15 个端点：chat / sessions / role-config / float-config / parse-form / float-chat / generate-description / field-hints / health 等 |
| [agentController.ts](backend/src/services/ai/agent/agentController.ts) | 功能增强 | 悬浮助手配置 API + 意图路由 + 智能生成 + 缓存失效 |
| [agentChatController.ts](backend/src/services/ai/agent/agentChatController.ts) | 新增 | Agent 聊天控制器（ReAct 流式 + 页面上下文） |
| [agentWriteGuard.ts](backend/src/services/ai/agent/agentWriteGuard.ts) | 新增 | Agent 写入权限校验 |
| [sessionCleaner.ts](backend/src/services/ai/agent/sessionCleaner.ts) | 新增 | 过期会话自动清理 |
| [toolRegistration.ts](backend/src/services/ai/agent/toolRegistration.ts) | 功能增强 | +3 工具：compare_formulas / suggest_material_substitute / generate_quotation |
| [promptEngine.ts](backend/src/services/ai/agent/promptEngine.ts) | 功能增强 | +字段咨询知识库（8条） |
| [database-better-sqlite3.ts](backend/src/config/database-better-sqlite3.ts) | 新增表 | `agent_float_config` + `agent_provider_health` + `agent_session_cleanup_log` |

***

## 🚀 历史更新 (2026-05-13)

### ✅ AI Agent 身份定义系统 + 聊天交互优化 + 数据真实性保障

#### 🤖 AI Agent 身份定义系统

为 AI Agent 增加完整的身份定义功能，支持自定义助手称呼、用户称呼、语气风格、开场问候语和自定义指令：

**新增数据库表 `agent_role_config`**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 主键 |
| user_id | TEXT UNIQUE | 用户ID（每用户唯一） |
| agent_name | TEXT | 助手称呼（默认：小听） |
| user_title | TEXT | 对用户的称呼（默认：老板） |
| greeting | TEXT | 开场问候语 |
| tone_style | TEXT | 语气风格（professional/friendly/respectful/casual） |
| custom_instructions | TEXT | 自定义行为指令 |
| updated_at / created_at | TEXT | 时间戳 |

**新增 API 端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agent/role-config` | 获取当前用户的身份配置 |
| PUT | `/api/agent/role-config` | 更新当前用户的身份配置 |

**Prompt Engine v3.0.0**：

- 系统提示词模板新增 `{{ROLE_CONFIG}}` 占位符
- `buildSystemPrompt(toolsDefinition, roleConfig?)` 支持注入身份配置
- 4 种语气风格映射：专业·简洁高效 / 亲切·温暖活泼 / 恭敬·礼貌正式 / 轻松·随意自然
- 首次对话时引导用户确认 Agent 身份设置

**前端身份设置弹窗**：

- 历史会话侧边栏新增身份设置按钮（`user-circle` 图标）
- 表单包含：助手称呼、对您的称呼、语气风格选择、开场问候语、自定义指令
- 保存后即时生效，自动刷新系统提示词缓存

***

#### 🔽 聊天区域一键回到底部按钮

当用户向上滚动查看历史消息时，聊天区域右下角显示圆形「回到底部」按钮：

| 特性 | 说明 |
|------|------|
| 触发条件 | 滚动位置距底部超过 300px 时自动显示 |
| 按钮位置 | 聊天区域右下角（距底部 80px），`position: absolute` |
| 按钮样式 | 40×40px 圆形，白底灰边框，hover 变绿色 + 上浮 |
| 加载指示 | Agent 回复中时，按钮右上角显示绿色脉冲动画小圆点 |
| 动画效果 | `Transition` 组件淡入淡出 + 上移 |
| 点击行为 | 一键滚动到底部并隐藏按钮 |

***

#### 🛡️ Agent 数据真实性保障

全面审查 Agent 工具，确保所有数据查询和写入操作基于真实数据库，杜绝 AI 编造数据：

**查询工具增强**：

| 工具 | 修复前 | 修复后 |
|------|--------|--------|
| `query_salespersons` | 使用内存 Map | ✅ 查询 SQLite `salesmen` 表 |
| `analyze_sales` | 使用内存 Map | ✅ 查询 SQLite `formula_sales` 表 |
| 所有查询工具 | 空数据时编造示例 | ✅ 返回空数据提示信息，引导用户录入 |

**写入工具增强**：

| 工具 | 修复前 | 修复后 |
|------|--------|--------|
| `create_formula` | 无业务员时写入空字符串导致 NOT NULL 错误 | ✅ 自动分配第一个活跃业务员 |
| 所有写入工具 | 失败时无明确提示 | ✅ 具体 try/catch 错误信息 + 用户引导 |

**Prompt Engine v2.2.0 → v3.0.0 数据约束**：

- 新增「数据真实性约束」：禁止编造任何配方、原料、业务员、报告、营养数据
- 新增「写入操作约束」：写入失败必须明确告知用户并引导下一步操作
- 系统提示词版本从 v2.2.0 升级到 v3.0.0

***

#### 🎨 其他修复与优化

| 修复项 | 说明 |
|--------|------|
| Agent 自动滚动 | `autoScrollToBottom` 包裹 `nextTick()`，阈值从 100px 调整到 300px |
| 默认模型切换 | Agent 聊天默认模型从 DeepSeek V3 改为 **DeepSeek V4 Flash** |
| 助手消息区域 padding | `.assistant-bubble` padding 从 `16px 20px` 调整为 `26px 30px` |
| 身份设置弹窗样式 | 修复 `.role-config-modal` 背景色消失问题（`modal-content` → `modal-container`） |

***

### 影响范围总览

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| [database-better-sqlite3.ts](backend/src/config/database-better-sqlite3.ts) | 新增表 | `agent_role_config` 表定义 |
| [agentController.ts](backend/src/services/ai/agent/agentController.ts) | 功能增强 | 身份配置 API + 按用户注入 roleConfig + 缓存失效 |
| [promptEngine.ts](backend/src/services/ai/agent/promptEngine.ts) | 重大升级 | v3.0.0 + `{{ROLE_CONFIG}}` + 数据真实性约束 |
| [toolRegistration.ts](backend/src/services/ai/agent/toolRegistration.ts) | 功能增强 | 查询工具空数据提示 + 写入工具错误处理 + 业务员自动分配 |
| [salespersonService.ts](backend/src/services/business/salespersonService.ts) | 重写 | 内存 Map → SQLite 查询 |
| [salesAnalysisService.ts](backend/src/services/business/salesAnalysisService.ts) | 重写 | 内存 Map → SQLite 查询 |
| [agent.ts (routes)](backend/src/routes/agent.ts) | 新增路由 | GET/PUT `/role-config` |
| [agent.ts (api)](frontend/src/api/agent.ts) | 新增方法 | `getRoleConfig()` / `updateRoleConfig()` |
| [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) | 多项增强 | 身份设置弹窗 + 回到底部按钮 + 自动滚动修复 + 默认模型 + padding |

***

### ✅ AI Agent 功能模块审查与修复

#### 🔒 配方创建数据校验增强

修复 AI Agent 创建配方时原料不匹配导致垃圾数据的问题：

| 校验项 | 修复前 | 修复后 |
|--------|--------|--------|
| 原料存在性 | ❌ 不校验，LLM幻觉直接写入 | ✅ 必须匹配数据库已有原料，否则返回错误并列出可用原料 |
| 业务员存在性 | ❌ 不存在时自动创建（脏数据） | ✅ 不存在时返回错误，要求先确认或创建 |
| 含量比校验 | ❌ 不校验 | ✅ 调用 `ratioFactorValidator.validate()` 校验，不通过拒绝创建 |

**修改文件**：
- [toolRegistration.ts](backend/src/services/ai/agent/toolRegistration.ts) — `create_formula` 和 `update_formula` 工具增加完整校验逻辑

***

#### 💬 对话信息持久化修复

修复切换会话后对话内容丢失的问题：

| 问题 | 根因 | 修复 |
|------|------|------|
| 恢复会话缺少工具结果 | `switchToSession` 未解析 `tool_results`、`display_type` 字段 | 增加 `toolResultData` 映射，正确恢复工具执行结果 |

**修改文件**：
- [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) — `switchToSession` 增加扩展字段解析

***

#### 📊 Agent 调用日志优化

| 问题 | 修复 |
|------|------|
| 类型显示 `intent_recognition` 英文 | `callType` 映射表增加 `intent_recognition: "意图识别"` 等中文翻译 |
| 摘要内容缺失 | `llmService.streamChat` 增加 `recordUsage` 调用，记录成功/失败日志 |
| 摘要重复前缀 | 优化显示逻辑，去除 `[Agent对话] Agent对话: xxx` 重复 |

**修改文件**：
- [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue) — 类型映射 + 摘要显示优化
- [llmService.ts](backend/src/services/ai/agent/llmService.ts) — 流式调用日志记录
- [AIService.ts](backend/src/services/ai/AIService.ts) — `recordUsage` 改为 `public`

***

#### 🔍 智能检索搜索修复

| 问题 | 根因 | 修复 |
|------|------|------|
| 搜索无结果 | `aiStore.naturalSearch` 没有 `return res` | 添加 `return res`，调用方正确获取搜索结果 |

**修改文件**：
- [ai.ts](frontend/src/stores/ai.ts) — `naturalSearch` 函数返回结果

***

#### 🎨 智能检索结果 Markdown 格式展示

将搜索结果从简陋的 `t-table` 替换为美观的 Markdown 表格渲染：

| 改进项 | 说明 |
|--------|------|
| 表格样式 | 绿色渐变表头 + 斑马纹 + 悬停高亮 + 10px圆角 |
| SQL 折叠 | 可折叠展示，默认收起，点击标题栏切换 |
| 结果摘要 | 带图标 + 数字高亮 + 模型标签 |
| 空结果 | 虚线边框卡片 + SVG 图标 |
| 导出功能 | 不受影响，仍使用原始 `rows` 数据 |

**修改文件**：
- [SmartSearchTab.vue](frontend/src/views/ai/tabs/SmartSearchTab.vue) — Markdown 渲染 + 样式优化

***

### 影响范围总览

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| [toolRegistration.ts](backend/src/services/ai/agent/toolRegistration.ts) | 功能增强 | 配方创建校验 + 原料匹配 |
| [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) | Bug修复 | 会话恢复扩展字段解析 |
| [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue) | UI优化 | 类型中文映射 + 摘要显示优化 |
| [llmService.ts](backend/src/services/ai/agent/llmService.ts) | 功能增强 | 流式调用日志记录 |
| [AIService.ts](backend/src/services/ai/AIService.ts) | 权限调整 | `recordUsage` 改为 public |
| [ai.ts](frontend/src/stores/ai.ts) | Bug修复 | `naturalSearch` 返回结果 |
| [SmartSearchTab.vue](frontend/src/views/ai/tabs/SmartSearchTab.vue) | UI重构 | Markdown 表格渲染 + 样式优化 |

***

### ✅ 智能工具页面UI优化 + 图标语义化

#### 📐 页面底部间距修复

修复 SmartTools 页面底部内容紧贴边缘的问题，添加 `padding-bottom: 24px` 确保页面底部留有合理间距。

#### 🎨 图标语义化更换

将智能工具相关图标更换为与"智能工具"语义更匹配的 TDesign `ai-tool` 图标：

| 位置 | 修改前 | 修改后 | 说明 |
| -- | ----- | ----- | --- |
| 左侧导航栏 | `control-platform` | `ai-tool` | 侧边栏"智能工具"入口图标 |
| 页面顶部标题 | 无图标 | `ai-tool` | 工具栏标题旁新增图标 |
| 图标映射表 | `control-platform` | `ai-tool` | 路由图标映射同步更新 |

**图标样式：**

- 标题图标尺寸：22px
- 标题图标颜色：`#10B981`（品牌绿色）
- 与标题文字 flex 对齐，间距 8px

### 影响范围总览

| 文件 | 改动类型 | 说明 |
| --- | ------ | --- |
| [SmartTools.vue](frontend/src/views/ai/SmartTools.vue) | UI优化 | 底部间距修复 + 标题图标新增 |
| [Home.vue](frontend/src/views/Home.vue) | 图标更换 | 侧边栏图标 + 图标映射表更新 |

***

## 🚀 历史更新 (2026-05-11)

### ✅ AI助手界面布局重构 + 聊天区域优化

#### 🔄 左右栏位置互换

将 AI 助手工作台的左右栏布局进行互换，聊天区域移至左侧，数据卡片/快捷操作栏移至右侧：

**修改前：**

```
┌──────────────┬──────────────────────────┐
│ 数据卡片     │   💬 AI 智能助手          │
│ 快捷操作     │   [历史记录] [新对话]      │
│              │   ┌─────────────────┐    │
│              │   │  聊天消息区域    │    │
│              │   └─────────────────┘    │
│              │   ┌─────────────────┐    │
│              │   │  输入框          │    │
│              │   └─────────────────┘    │
└──────────────┴──────────────────────────┘
```

**修改后：**

```
┌──────────────────────────┬──────────────┐
│   💬 AI 智能助手         │ 数据卡片     │
│   [🕐] 历史触发器        │ 快捷操作     │
│   ┌─────────────────┐   │              │
│   │  聊天消息区域    │   │              │
│   └─────────────────┘   │              │
│   ┌─────────────────┐   │              │
│   │[模型▼][输入框]   │   │              │
│   │[+][📎][发送]     │   │              │
│   └─────────────────┘   │              │
└──────────────────────────┴──────────────┘
```

**CSS Grid 布局变更：**

```scss
// 修改前
grid-template-columns: 260px 1fr;

// 修改后
grid-template-columns: 1fr 260px;
```

响应式断点同步更新（1400px / 1200px）。

***

#### 🗑️ 移除聊天区域顶部导航栏

删除了原有的 `chat-header` 导航栏，释放约 **60px** 垂直空间给聊天内容区。

**被移除的元素：**

| 元素 | 说明 |
| ---- | --------------- |
| `chat-title` | "💬 AI 智能助手" 标题 |
| `model-indicator` | 当前模型显示标签 |
| `history-btn` | 历史记录按钮 |
| `new-chat-btn` | 新对话按钮 |

这些功能已重新分配到其他位置（见下方）。

***

#### 🕐 历史记录触发器组件

将原来的"历史记录"按钮优化为**固定触发器**，位于聊天区域左上角：

**设计规格：**

| 属性 | 值 |
| -- | -------------------------------------------------------- |
| 尺寸 | 36×36px 圆形 |
| 位置 | `position: absolute; top: 12px; left: 12px; z-index: 20` |
| 样式 | 白色背景 + 灰色边框 + 阴影 |
| 图标 | `t-icon name="history"` size=18px |

**交互行为：**

| 状态 | 样式变化 |
| -- | ------------------------ |
| 默认 | 白底灰字，hover 变浅灰底绿字 |
| 激活 | 绿色背景 + 白色文字 (`&.active`) |

**历史面板改为覆盖层模式：**

```scss
.history-sidebar {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 280px;
  z-index: 15;
  box-shadow: 4px 0 16px rgba(0,0,0,0.08);
}
```

- 从左侧平滑滑入（`slide` Transition）
- 不再占用 flex 布局空间，覆盖在消息区域上方
- 点击触发器或关闭按钮可收起

***

#### ➕ 新建对话按钮迁移至输入框区域

将"新建对话"按钮从顶部导航栏移动到输入框内部，位于文件上传按钮左侧：

**布局结构：**

```
输入框内部（从左到右）：
┌──────────────────────────────────────────────┐
│ [模型选择▼] [文本输入区域........] [+][📎][➤] │
│  model-selector  textarea       new-chat send │
└──────────────────────────────────────────────┘
```

**样式统一：**

新建对话按钮与文件上传按钮使用相同的基类 `.action-circle-btn`：

| 属性 | 值 |
| ----- | ----------------------------- |
| 尺寸 | 36×36px 圆形 |
| 背景 | 透明（`background: transparent`） |
| Hover | 浅灰底 + 绿色文字 |
| 图标 | `t-icon name="add"` size=18px |

***

#### 🔽 模型选择下拉框集成至输入框

将原来顶部导航栏中的模型信息展示优化为**可交互的下拉选择框**，嵌入输入框左侧：

**使用 TDesign `<t-select>` 组件：**

```html
<div class="model-selector">
  <t-select v-model="currentModel"
            :options="modelOptions"
            size="small"
            style="width: 110px;" />
</div>
```

**可选模型列表：**

| value | label |
| ----------- | ----------- |
| `deepseek` | DeepSeek V3 |
| `dashscope` | 通义千问 |
| `zhipu` | 智谱GLM |

**样式特点：**

- 无边框、透明背景，融入输入框设计
- 小尺寸（28px 高度 / 12px 字号）
- 通过 `:deep()` 穿透 TDesign 内部样式

**数据源：**

```typescript
const modelOptions = computed(() =>
  Object.entries(modelDisplayNames).map(([value, label]) => ({ value, label }))
);
```

***

### 影响范围总览

| 文件 | 改动类型 | 说明 |
| -------------------------------------------------------- | ---- | -------------------------------------------------- |
| [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) | 布局重构 | 左右栏互换 + 移除顶栏 + 历史触发器 + 新对话按钮迁移 + 模型下拉选择器 + CSS全面调整 |

### 验证结果（Playwright 自动化测试）

| 验证项 | 结果 | 期望 |
| ---------------------------- | ------------------------- | --------- |
| chat-header 存在 | false | ✅ 已移除 |
| history-trigger 存在 | true | ✅ 新增 |
| history-trigger 位置 | top=27, left=253, 36×36px | ✅ 左上角 |
| history-sidebar 点击前 | false | ✅ 隐藏 |
| history-sidebar 点击后 | true | ✅ 展开 |
| new-chat-btn 存在 | true | ✅ 迁移完成 |
| new-chat-btn 与 attach-btn 对齐 | 同一行 y=828 | ✅ 样式一致 |
| t-select 组件存在 | true | ✅ 模型选择器就绪 |
| layout-main 在左侧 | left=240 < sidebar=1160 | ✅ 互换成功 |
| messages-wrapper 高度 | 790px | ✅ 增加60px |

***

### ✅ AI智能录入功能整合 + AI对话SSE流式修复 + UI优化

#### 🎯 智能填单/智能导入功能整合到AI助手工作台

将原来独立的 `AiAssistant.vue` 页面的**智能填单**和**智能导入**功能整合到 **AIDashboard.vue** 中，实现统一入口：

**新增Tab导航系统：**

| Tab | 图标 | 功能 | 组件 |
| -------- | -- | ------------------ | ------------------------------------------------------------------- |
| 💬 AI 对话 | 💬 | 与AI助手自由对话（SSE流式响应） | 内置聊天界面 |
| 📝 智能填单 | 📝 | AI辅助填写表单（配方、原料） | [SmartFormTab.vue](frontend/src/views/ai/tabs/SmartFormTab.vue) |
| 📥 智能导入 | 📥 | AI解析Excel/文件导入数据 | [SmartImportTab.vue](frontend/src/views/ai/tabs/SmartImportTab.vue) |

**快捷方式入口调整：**

左侧栏快捷操作区域新增两个AI功能入口：

```
┌─────────────────────────────────────┐
│  [+ 新建配方] [+ 添加原料]           │
│  [生成周报]   [导出数据]             │
│  📝 智能填单(AI) 📥 智能导入(AI)  ← 新 │
└─────────────────────────────────────┘
```

- 点击后自动切换到对应Tab（无需页面跳转）
- 带 **AI** 标识突出显示为AI功能
- 使用 `handleQuickAction()` 统一处理点击事件

***

#### 🔧 AI对话SSE流式响应修复

**问题现象：**

- 和AI对话没有回应
- 前端控制台报警：`[未找到 IL] 非法 DeepSeek V3`
- SSE解析警告

**根本原因分析：**

| 问题点 | 详情 |
| ------- | --------------------------------------------------- |
| 模型名称不匹配 | 前端发送 `DeepSeek V3`（显示名），后端期望 `deepseek`（provider标识） |
| 环境变量未加载 | 后端 `index.ts` 未导入 `dotenv/config`，API Key无法读取 |
| 流式响应缺失 | `_doChatCompletion()` 未处理 `stream: true` 参数 |

**修复方案：**

1. **模型名称映射系统**

```typescript
// AIDashboard.vue - 新增映射表
const modelDisplayNames = {
  'deepseek': 'DeepSeek V3',    // 实际发送 deepseek，显示 DeepSeek V3
  'dashscope': '通义千问',
  'zhipu': '智谱GLM'
};

const displayModelName = computed(() => 
  modelDisplayNames[currentModel.value] || currentModel.value
);
```

2. **环境变量加载**

```typescript
// index.ts - 顶部添加
import "dotenv/config";
```

3. **SSE流式响应实现**

```typescript
// AIService.ts - 新增 _handleStreamResponse() 方法
private async _handleStreamResponse(response, model, onToken?) {
  const reader = response.body?.getReader();
  // 解析 data: {"choices":[{"delta":{"content":"token"}}]} 格式
  // 逐个调用 onToken(token) 回调转发给前端
}
```

***

#### 🎨 UI优化改进

**1. Logo位置修正**

将品牌Logo从标题上方移到与标题同行显示：

```html
<!-- 修改前 -->
<div class="welcome-logo">🐱</div>   <!-- 单独一行 -->
<h3>你好！我是TingStudio AI助手</h3>

<!-- 修改后 -->
<div class="welcome-header">          <!-- 同行显示 -->
  <div class="welcome-logo">🐱</div>
  <h3>你好！我是TingStudio AI助手</h3>
</div>
```

**2. 背景色统一**

将"最近访问/待办区域"背景色调整为与"AI推荐操作区域"一致：

```css
/* 统一样式 */
background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
border: 2px solid #bae6fd;
border-radius: 16px;
```

**3. 欢迎消息功能列表可点击**

```html
<ul class="welcome-features">
  <li @click="handleQuickQuestion('分析销售数据和趋势')">
    ✨ 分析销售数据和趋势
  </li>
  <!-- ... 其他3项 -->
</ul>
```

交互效果：

- 🖱️ Hover：蓝色渐变背景 + 右移4px + 阴影
- 👆 点击：自动填充输入框并发送消息

**4. 销售数字格式化**

大数自动以"万"为单位显示：

```typescript
const formatNumber = (num) => {
  if (num >= 10000) {
    const wan = (num / 10000).toFixed(num % 10000 === 0 ? 0 : 1);
    return `${wan}万`;  // 例：2400000 → 240万
  }
  return num.toLocaleString('zh-CN');
};
```

***

#### 🛠️ 模板结构错误修复

**问题：** 多次出现 `Element is missing end tag` 编译错误

**根因：** `<template>` 标签嵌套结构混乱，`.chat-container` 的 `</div>` 提前关闭

**修复后的正确结构：**

```html
<div class="chat-container">
  <template v-if="activeTab === 'chat'">
    <!-- 所有聊天内容... -->
    <div class="messages-wrapper">...</div>
    <div class="quick-tags-bar">...</div>
    <div class="chat-input-bar">...</div>
  </template>                          <!-- 正确闭合 -->

  <div v-if="smart-form">...</div>   <!-- 智能填单 Tab -->
  <div v-if="smart-import">...</div> <!-- 智能导入 Tab -->
</div>                                <!-- 关闭 chat-container -->
```

***

### 影响范围总览

| 文件 | 改动类型 | 说明 |
| ---------------------------------------------------------- | ----- | ----------------------------------------------------------- |
| [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) | 重构+优化 | Tab导航 + 智能填单/导入整合 + Logo位置 + 可点击功能列表 + 背景色统一 + 数字格式化 + 模板修复 |
| [AIService.ts](backend/src/services/ai/AIService.ts) | 功能增强 | SSE流式响应 `_handleStreamResponse()` 方法 |
| [index.ts](backend/src/index.ts) | 配置修复 | 添加 `import "dotenv/config"` 加载环境变量 |
| [aiController.ts](backend/src/controllers/aiController.ts) | 优化 | SSE响应头设置 + 流式数据转发 |

***

## 🚀 历史更新 (2026-05-09)

### ✅ AI助手工作台UI优化 + 仪表盘样式统一 + 俏皮话优化

#### 🎨 左侧导航栏俏皮话优化

**修改内容：**

- 删除"AI提示："前缀，直接显示内容
- 文本首行缩进2字符（`text-indent: 2em`）
- 保留点击换一条功能
- 优化显示效果，提升阅读体验

**修改文件：**

- [Home.vue](frontend/src/views/Home.vue) — `WITTY_FALLBACK_POOL` 数据源 + `.witty-text` 样式

***

#### 🎯 仪表盘卡片 Hover 效果统一

将所有页面的仪表盘数据卡片的 hover 效果统一为与 **AI助手工作台** 一致的交互体验：

**统一后的 Hover 效果规范：**

| 属性 | 值 | 说明 |
| -------------- | --------------------------------------- | ------- |
| `transform` | `translateY(-4px)` | 上浮4px动画 |
| `box-shadow` | `0 12px 30px rgba(0, 0, 0, 0.1)` | 柔和阴影效果 |
| `border-color` | `transparent` | 无边框颜色变化 |
| `transition` | `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` | 平滑过渡动画 |

**影响的页面：**

| 页面 | 组件 | 文件路径 |
| ---- | --------- | ----------------------------------------------------------------- |
| 配方管理 | stat-card | [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue) |
| 原料管理 | stat-card | [MaterialList.vue](frontend/src/views/materials/MaterialList.vue) |
| 业务员管理 | stat-card | [SalesmanList.vue](frontend/src/views/salesmen/SalesmanList.vue) |
| AI助手工作台 | data-card | [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) ✅ 参考标准 |

**设计理念：**

- 🎯 **一致性**：所有页面使用相同的 hover 动画参数
- 🎯 **流畅性**：使用 cubic-bezier 缓动函数实现自然过渡
- 🎯 **视觉层次**：上浮 + 阴影组合增强空间感
- 🎯 **简洁性**：移除边框颜色变化，保持界面清爽

***

#### 🔧 SCSS 编译错误修复

修复了 Home.vue 中 SCSS 样式的括号匹配问题：

**问题原因：**

- 在 `.info-card-witty` 样式块中存在多余的闭合大括号 `}`
- 导致 SASS 编译器报错：`unmatched "}"`

**修复方案：**

- 删除第1278行的多余 `}`
- 验证所有样式块的括号匹配正确
- 确保嵌套层级清晰

**验证结果：**

- ✅ SCSS 编译通过
- ✅ 样式渲染正常
- ✅ 无语法错误

***

### 影响范围总览

| 文件 | 改动类型 | 说明 |
| ----------------------------------------------------------------- | ---- | -------------------------------- |
| [Home.vue](frontend/src/views/Home.vue) | UI优化 | 俏皮话文本处理 + 首行缩进 + SCSS修复 |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue) | 样式统一 | stat-card hover 效果对齐 AIDashboard |
| [MaterialList.vue](frontend/src/views/materials/MaterialList.vue) | 样式统一 | stat-card hover 效果对齐 AIDashboard |
| [SalesmanList.vue](frontend/src/views/salesmen/SalesmanList.vue) | 样式统一 | stat-card hover 效果对齐 AIDashboard |

***

## 🚀 历史更新 (2026-05-08)

### ✅ 模型管理新增"模型应用"功能模块配置 + UI对齐优化

#### 🎯 新增"模型应用"Tab（模型管理页面）

在模型管理页面的**用量监控**Tab上方新增"模型应用"Tab，用于管理系统中的AI功能模块的专属模型配置：

**核心功能：**

| 特性 | 说明 |
| ------------ | ---------------------------- |
| **功能模块管理** | 为周报、月报、智能配方解析等5个AI功能模块配置专属模型 |
| **完整CRUD操作** | 支持添加、查看、编辑、删除、启用/禁用配置 |
| **实时生效** | 配置变更立即保存到数据库 |
| **权限控制** | 仅管理员可进行增删改操作 |

**支持的功能模块：**

| 模块ID | 显示名称 | 用途 |
| ---------------- | ------ | ------------ |
| `weekly-report` | 周报AI分析 | 周工作报告的AI智能分析 |
| `monthly-report` | 月报AI分析 | 月度报告的AI智能分析 |
| `smart-form` | 智能配方解析 | AI智能配方解析功能 |
| `smart-import` | 智能原料导入 | AI智能原料导入功能 |
| `smart-search` | 智能数据检索 | AI自然语言检索功能 |

**UI设计特点：**

- 🎨 卡片式布局（响应式网格，最小380px自动填充）
- 🎨 彩色图标系统（每个模块独特渐变色背景）
- 🎨 状态徽章（绿色=启用，红色=禁用）
- 🎨 完整对话框表单（带验证和确认机制）

**技术实现：**

```
前端: ModelManagement.vue
  ├── tabs数组新增 "applications" 项
  ├── 完整UI模板（列表/空状态/对话框）
  ├── CRUD方法（fetch/create/update/delete/toggle）
  └── SCSS样式（250+行响应式布局）

后端:
  ├── modelController.ts — 5个API端点
  ├── routes/ai.ts — 路由注册 (/api/ai/model-applications)
  └── database-better-sqlite3.ts — model_applications表定义

数据库表: model_applications
  ├── id (TEXT, PK)
  ├── module (TEXT, UNIQUE) — 功能模块标识
  ├── module_name (TEXT) — 显示名称
  ├── provider (TEXT) — 模型厂商
  ├── model (TEXT) — 模型类型
  ├── description (TEXT) — 描述说明
  ├── enabled (INTEGER) — 启用状态 (0/1)
  ├── created_by / created_at / updated_at
```

***

#### 🔧 报告中心按钮与复选框垂直对齐优化

修复了报告中心列表中操作按钮与复选框高度不一致的问题：

**调整内容：**

- 按钮容器 top位置：14px → **16px**（与复选框对齐）
- 单个按钮高度：18px（保持不变）
- 图标尺寸：16×16px（未改变）
- 复选框尺寸：18×18px（未改变）

**修改文件：**

- [ReportCenter.vue](frontend/src/views/reports/ReportCenter.vue) — `.card-actions` 和 `.card-action-btn` 样式调整

***

### ✅ AI智能分析自动化 + 智谱GLM默认模型 + Markdown格式优化

#### 🤖 报告AI分析完全自动化（发布即触发）

实现了月报/周报发布时**自动生成AI分析**的完整流程，无需手动点击：

**核心改进**：

| 特性 | 说明 |
| --------- | -------------------------- |
| **发布即分析** | 点击"发布"按钮后，系统后台自动调用AI生成分析报告 |
| **异步非阻塞** | AI分析在后台执行（30-120秒），不阻塞用户操作 |
| **持久化存储** | 分析结果自动保存到数据库，下次查看直接展示 |
| **即时加载** | 打开已发布的报告，AI分析区域立即显示完整结果 |

**数据流架构**：

```
┌─────────────────────────────────────────────────────────────┐
│  用户点击"发布" → publishReport(id, data, type)            │
│       ↓                                                     │
│  后端发布API成功 → 异步触发 generateAndSaveAIAnalysis()     │
│       ↓                                                     │
│  调用智谱GLM AI模型 → 生成分析报告（30-120秒）              │
│       ↓                                                     │
│  saveAIAnalysis() → 保存到 reports.dataJson.aiAnalysis      │
│       ↓                                                     │
│  下次打开报告 → fetchReportById() 自动加载 → UI直接展示     │
└─────────────────────────────────────────────────────────────┘
```

**修改文件**：

- [report.ts (store)](frontend/src/stores/report.ts) — `publishReport()` 支持异步AI分析 + `generateAndSaveAIAnalysis()` 新增 + `fetchReportById()` 自动加载已保存的分析
- [report.ts (api)](frontend/src/api/report.ts) — 新增 `saveAIAnalysis()` API方法
- [MonthlyReport.vue](frontend/src/views/reports/MonthlyReport.vue) — `handlePublish()` 传递完整报告数据用于AI分析
- [WeeklyReport.vue](frontend/src/views/reports/WeeklyReport.vue) — 同步修改发布逻辑
- [AIAnalysisPanel.vue](frontend/src/components/AIAnalysisPanel.vue) — 移除手动按钮，改为自动展示 + 状态指示器（loading/pending/complete）

***

#### 🎯 默认使用智谱GLM模型进行报告分析

将AI分析报告的默认模型从通义千问切换为**智谱GLM (glm-4-flash)**：

**模型选择逻辑**：

```
请求到达 → 检查 provider 参数
              ↓
        ┌─────────────────┐
        │ 传入了 provider? │
        └────┬────────┬───┘
             是 ↓    ↓ 否
        使用指定值  优先查找 zhipu (智谱GLM)
                     ↓
               ┌──────────┐
               │ 找到了?   │
               └───┬───┬───┘
                  是↓   ↓否
              使用 zhipu  使用第一个可用模型（降级）
```

**配置信息**：

- **默认模型**: `glm-4-flash`（快速版）
- **备选模型**: `glm-4-air` / `glm-4-plus` / `glm-5`
- **降级策略**: 智谱不可用时自动降级到通义千问 qwen-plus

**修改文件**：

- [reportController.ts](backend/src/controllers/reportController.ts) — `getAIAnalysis()` 优先选择智谱GLM模型 + 日志输出当前使用的模型信息

***

#### ✨ AI分析结果Markdown格式清理

修复了AI分析结果显示大量Markdown符号（`##`、`**`、`*`）的问题：

**清理规则**：

| Markdown语法 | 清理后 |
| ------------ | ----- |
| `### 标题` | 标题 |
| `**粗体**` | 粗体 |
| `*斜体*` | 斜体 |
| `` `代码` `` | 代码 |
| `[链接](url)` | 链接 |
| `![图片](url)` | （图片） |
| `- 列表项` | • 列表项 |
| `1. 有序列表` | 列表项 |

**关键修复**：

- 修复了 `cleanMarkdown()` 函数中的语法错误（缺少 `.replace(` 方法调用）
- 移除了800字符截断限制，显示完整的AI分析内容
- 保留段落结构和语义完整性

***

#### 影响范围总览

| 文件 | 改动类型 | 说明 |
| ------------------------------------------------------------------ | ---- | -------------------------- |
| [report.ts (store)](frontend/src/stores/report.ts) | 功能增强 | 发布时自动生成AI分析 + 加载时自动读取 |
| [report.ts (api)](frontend/src/api/report.ts) | 功能增强 | 新增保存AI分析的API接口 |
| [AIAnalysisPanel.vue](frontend/src/components/AIAnalysisPanel.vue) | 重构 | 移除手动按钮 + 自动展示 + Markdown清理 |
| [MonthlyReport.vue](frontend/src/views/reports/MonthlyReport.vue) | 功能增强 | 发布时传递完整数据给AI分析 |
| [WeeklyReport.vue](frontend/src/views/reports/WeeklyReport.vue) | 功能增强 | 同步修改发布逻辑 |
| [reportController.ts](backend/src/controllers/reportController.ts) | 配置优化 | 默认使用智谱GLM模型 |

***

### 🎯 核心成果总结

✅ **完全自动化**: 发布报告后AI分析自动生成，无需人工干预\
✅ **智谱GLM优先**: 默认使用国产大模型，响应快速且中文理解优秀\
✅ **持久化存储**: 分析结果永久保存，刷新页面不丢失\
✅ **用户体验提升**: 无需等待，下次查看即时展示\
✅ **格式清晰**: Markdown符号完全清理，阅读体验友好

---

## 🎯 核心成果总览

✅ **AI Agent 身份定义系统**：自定义助手称呼/用户称呼/语气风格/custom_instructions\
✅ **数据真实性保障**：禁止编造任何配方/原料/业务员/报告/营养数据\
✅ **Agent 写入操作安全控制**：拦截创建/修改/删除操作，引导用户前往对应管理页面\
✅ **悬浮助手配置管理系统**：完整的前后端配置 CRUD + UI\
✅ **悬浮助手 Agent 双模路由**：fill/agent 自动分类 + SSE流式ReAct + 3个新工具\
✅ **智能生成配方描述/制法**：新建模式 + 升版模式，表单内按钮一键生成\
✅ **悬浮球 UI 增强**：角标/状态指示灯/快捷命令/动态标题/指令模板栏\
✅ **结果卡片组件体系**：CompareCard / QuotationCard / SubstituteCard
