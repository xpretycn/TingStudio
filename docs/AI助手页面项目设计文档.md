# AI 智能助手页面 — 项目设计文档

> 版本：v1.1  
> 日期：2026-05-02  
> 项目：Ting Studio 配方管理系统 — AI 助手模块

---

## 目录

- [第一章 设计方案](#第一章-设计方案)
  - [1.1 项目背景与目标](#11-项目背景与目标)
  - [1.2 整体架构设计](#12-整体架构设计)
  - [1.3 功能模块划分](#13-功能模块划分)
  - [1.4 数据流程图](#14-数据流程图)
  - [1.5 系统交互逻辑](#15-系统交互逻辑)
  - [1.6 关键技术选型](#16-关键技术选型)
  - [1.7 组件关系与协作方式](#17-组件关系与协作方式)
- [第二章 样式交互规范](#第二章-样式交互规范)
  - [2.1 色彩系统](#21-色彩系统)
  - [2.2 字体规范](#22-字体规范)
  - [2.3 组件样式规范](#23-组件样式规范)
  - [2.4 响应式布局规则](#24-响应式布局规则)
  - [2.5 交互流程定义](#25-交互流程定义)
  - [2.6 反馈机制](#26-反馈机制)
  - [2.7 动画效果标准](#27-动画效果标准)
  - [2.8 无障碍设计要求](#28-无障碍设计要求)
- [第三章 实施计划](#第三章-实施计划)
  - [3.1 开发阶段划分](#31-开发阶段划分)
  - [3.2 任务分解与分配](#32-任务分解与分配)
  - [3.3 时间节点安排](#33-时间节点安排)
  - [3.4 资源需求](#34-资源需求)
  - [3.5 风险管理策略](#35-风险管理策略)
  - [3.6 里程碑设定](#36-里程碑设定)
- [第四章 验收标准](#第四章-验收标准)
  - [4.1 功能验收指标](#41-功能验收指标)
  - [4.2 性能验收标准](#42-性能验收标准)
  - [4.3 兼容性要求](#43-兼容性要求)
  - [4.4 代码质量规范](#44-代码质量规范)
  - [4.5 用户体验评估维度](#45-用户体验评估维度)

---

# 第一章 设计方案

## 1.1 项目背景与目标

### 1.1.1 业务背景

Ting Studio 配方管理系统当前已具备配方管理、原料管理、业务员管理、版本对比、营养分析等核心功能模块。系统在日常运营中面临以下痛点：

- **配方信息录入效率低**：业务员提供的配方营养表（XLS 格式）需人工逐条录入，单份配方含 10-30 种原料，录入耗时约 15-30 分钟
- **原料批量导入缺乏智能化**：新增原料数据库（XLSX 格式）通常含 50-200 条记录，手动逐条创建极易出错
- **营养数据与原料数据割裂**：营养数据需单独录入到 `material_nutrition` 表，与原料主表缺乏联动
- **数据质量难以保障**：人工录入存在拼写错误、数值偏差、字段遗漏等问题

### 1.1.2 项目目标

| 目标维度     | 量化指标                                       |
| ------------ | ---------------------------------------------- |
| 配方录入效率 | 从 15-30 分钟/份降至 2-5 分钟/份（含审核修正） |
| 原料批量导入 | 支持 50-200 条原料一键导入，准确率 ≥ 90%       |
| 营养数据联动 | 原料创建时自动关联营养数据，关联率 100%        |
| 数据质量     | AI 提取字段置信度可视化，缺失字段零遗漏提醒    |
| 用户体验     | 操作步骤 ≤ 5 步完成全流程，错误提示明确可操作  |

### 1.1.3 参考文件模板

| 文件类型   | 参考文件                                   | 用途             |
| ---------- | ------------------------------------------ | ---------------- |
| 配方营养表 | `公孙绿萼荣华天晞膏营养成分表20260304.xls` | 配方信息提取模板 |
| 原料数据库 | `原料数据库导入_完整版_已清理.xlsx`        | 原料批量导入模板 |

---

## 1.2 整体架构设计

### 1.2.1 系统架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3 + TDesign)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  AiAssistant.vue (主页面)                  │   │
│  │  ┌────────────┬───────────────────────────────────────┐   │   │
│  │  │ 垂直 Tab 栏 │         内容区域                       │   │   │
│  │  │            │                                       │   │   │
│  │  │ [智能填单]  │  ┌───────────────────────────────┐   │   │   │
│  │  │ [智能导入]  │  │ 文件上传 → AI解析 → 置信度    │   │   │   │
│  │  │ [智能检索]  │  │ → 缺失检测 → 数据验证 → 提交  │   │   │   │
│  │  │            │  └───────────────────────────────┘   │   │   │
│  │  └────────────┴───────────────────────────────────────┘   │   │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   Pinia Stores     │                        │
│                    │  ai / material /   │                        │
│                    │  formula / nutrition│                       │
│                    │  file ✅           │                        │
│                    └─────────┬─────────┘                        │
│                              │ HTTP (Axios)                     │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                        后端 (Express + SQLite)                   │
│                    ┌─────────▼─────────┐                        │
│                    │   Express Router   │                        │
│                    │  /api/ai/*         │                        │
│                    │  /api/materials/*  │                        │
│                    │  /api/formulas/*   │                        │
│                    │  /api/nutrition/*  │                        │
│                    │  /api/files/* ✅   │                        │
│                    └─────────┬─────────┘                        │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              │               │               │                  │
│     ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐         │
│     │ AI Service    │ │ XLSX Parser│ │ DB Layer     │         │
│     │ (多模型适配)   │ │ (xlsx库)   │ │ (better-sqlite3)│      │
│     │ DashScope     │ │            │ │              │         │
│     │ ZhiPu         │ │            │ │              │         │
│     │ DeepSeek      │ │            │ │              │         │
│     └───────────────┘ └────────────┘ └──────────────┘         │
│              │               │               │                  │
│     ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐         │
│     │ File Ctrl ✅  │ │ Multer ✅   │ │ Sharp ✅     │         │
│     │ (14个接口)    │ │ (磁盘存储)  │ │ (缩略图)     │         │
│     └───────────────┘ └────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2.2 前端分层架构

```
View Layer (AiAssistant.vue)
    ├── Tab: 智能填单 (配方文件 → AI 解析 → 预览 → 页面内表单编辑 → 直接提交)
    ├── Tab: 智能导入 (原料文件 → AI 解析 → 批量预览 → 逐条/批量提交)
    └── Tab: 智能检索 (自然语言 → AI 生成 SQL → 执行 → 结果展示)

Store Layer (Pinia)
    ├── aiStore        → AI 模型管理、解析状态、解析结果
    ├── materialStore  → 原料 CRUD、批量创建
    ├── formulaStore   → 配方 CRUD
    ├── nutritionStore → 营养数据读写
    └── fileStore ✅   → 文件 CRUD、上传、预览、关联、审计日志

API Layer (Axios HTTP Client)
    ├── aiApi          → /api/ai/parse-formula, /api/ai/parse-material-nutrition, /api/ai/natural-search
    ├── materialApi    → /api/materials, /api/materials/next-code
    ├── formulaApi     → /api/formulas
    ├── nutritionApi   → /api/nutrition/material/:id
    └── fileApi ✅     → /api/files/* (14个接口：列表/统计/上传/详情/预览/缩略图/下载/审计/关联/取消关联/重新解析/删除/批量删除/批量归档)
```

---

## 1.3 功能模块划分

### 1.3.1 模块总览

| 模块编号 | 模块名称             | 功能描述                                                                                 | 优先级 |
| -------- | -------------------- | ---------------------------------------------------------------------------------------- | ------ |
| M1       | 智能填单（配方解析） | 上传配方文件 → AI 提取配方字段 → 置信度展示 → 缺失字段检测 → 数据验证 → 页面内表单提交   | P0     |
| M2       | 智能导入（原料批量） | 上传原料文件 → AI 批量提取 → 逐条置信度 → 缺失字段检测 → 数据验证 → 批量/逐条提交        | P0     |
| M3       | 智能检索（NL2SQL）   | 自然语言输入 → AI 生成 SQL → 安全校验 → 执行查询 → 结果展示                              | P1     |
| M4       | AI 模型管理          | 模型列表获取、模型选择、视觉能力检测                                                     | P1     |
| M5       | 操作动态记录         | 解析/检索操作时间线、分页展示                                                            | P2     |
| M6       | 仪表盘统计           | 可用模型数、解析状态、检索状态、Token 用量                                               | P2     |
| M7       | 动态色彩系统         | 主题色实时切换、CSS 变量驱动、全组件色彩联动                                             | P0     |
| M8       | 文件系统管理 ✅      | 独立路由页面，文件持久化存储、数据关联、生命周期管理、审计追踪、文件预览，参照配方管理模块设计规范，已验收通过 | P0     |
| M9       | 快速创建（页面内）   | 业务员/原料缺失时页面内快速录入，不中断主流程                                            | P0     |

### 1.3.2 M1 智能填单 — 详细功能点

```
M1 智能填单
├── M1.1 文件上传
│   ├── 支持格式：.xlsx, .xls, .csv, .png, .jpg, .jpeg, .gif, .webp
│   ├── 文件大小限制：10MB
│   ├── 拖拽上传 / 点击上传
│   └── 图片文件自动切换至视觉模型
│
├── M1.2 AI 解析
│   ├── 调用 POST /api/ai/parse-formula
│   ├── Excel 文件：XLSX 库解析为文本 → AI 结构化提取
│   ├── 图片文件：Base64 编码 → 多模态 AI 识别
│   └── 返回 ParsedFormula 结构
│
├── M1.3 置信度展示
│   ├── 整体置信度：confidence 字段（0-1）
│   ├── 字段级置信度：各字段的提取可信程度
│   │   ├── 高置信度（≥0.8）：绿色标识
│   │   ├── 中置信度（0.5-0.8）：黄色标识
│   │   └── 低置信度（<0.5）：红色标识
│   └── 可视化：进度条 + 百分比 + 颜色编码
│
├── M1.4 缺失字段检测
│   ├── 必填字段检查：name, materials
│   ├── 推荐字段检查：salesmanName, finishedWeight
│   ├── 可选字段检查：description, formulaDate
│   └── 缺失提示：非阻塞式警告，明确标注需手动补充的字段
│
├── M1.5 数据验证
│   ├── 原料匹配验证：与已有原料库交叉匹配
│   │   ├── 精确匹配 → 标记"已匹配"
│   │   ├── 模糊匹配 → 标记"近似匹配"并显示候选
│   │   └── 未匹配 → 标记"未匹配"，提示需先创建原料
│   ├── 数值范围验证：quantity > 0, finishedWeight > 0
│   └── 格式验证：名称非空、材料列表非空
│
└── M1.6 确认提交（页面内表单）
    ├── 解析结果确认后，在当前页面内展开配方编辑表单
    ├── 表单字段：配方名称、业务员选择、成品重量、原料列表、描述
    ├── 表单验证：必填字段校验、数值范围校验、原料匹配校验
    ├── 提交流程：验证通过 → POST /api/formulas → 成功提示 → 刷新列表
    ├── 提交状态反馈：按钮 loading 状态、进度提示
    ├── 成功提示：MessagePlugin.success + 操作动态记录
    └── 失败提示：MessagePlugin.error + 错误原因展示
```

### 1.3.3 M2 智能导入 — 详细功能点

```
M2 智能导入
├── M2.1 文件上传
│   ├── 支持格式：.xlsx, .xls
│   ├── 文件大小限制：10MB
│   └── 拖拽上传 / 点击上传
│
├── M2.2 AI 解析
│   ├── 调用 POST /api/ai/parse-material-nutrition
│   ├── XLSX 库解析为文本 → AI 结构化提取
│   └── 返回 ParsedMaterialNutrition 结构
│
├── M2.3 逐条置信度展示
│   ├── 每条原料独立置信度
│   ├── 营养字段独立置信度
│   │   ├── protein 置信度
│   │   ├── fat 置信度
│   │   ├── carbohydrate 置信度
│   │   └── sodium 置信度
│   └── 可视化：表格行内色块 + Tooltip 详情
│
├── M2.4 缺失字段检测
│   ├── 必填字段：name
│   ├── 推荐字段：protein, fat, carbohydrate, sodium
│   ├── 缺失字段高亮显示
│   └── 支持行内编辑补充
│
├── M2.5 数据验证
│   ├── 原料名重复检测
│   ├── 与已有原料库匹配检测（isRecorded 标记）
│   ├── 数值范围验证：营养值 ≥ 0
│   └── 编码冲突检测
│
├── M2.6 批量提交
│   ├── 一键录入：批量创建原料 + 写入营养数据
│   ├── 逐条录入：逐条创建，支持单条失败不影响后续
│   ├── 编码自动生成：调用 GET /api/materials/next-code
│   └── 营养数据联动：创建原料后自动调用 PUT /api/nutrition/material/:id
│
└── M2.7 差异对比
    ├── 与已有数据对比（同名原料的营养数据差异）
    ├── 支持"使用新数据"或"保留原数据"选择
    └── 差异高亮显示
```

### 1.3.4 M7 动态色彩系统 — 详细功能点

```
M7 动态色彩系统
├── M7.1 CSS 变量体系
│   ├── 品牌主色变量：--color-primary, --color-primary-dark, --color-primary-light
│   ├── 语义色变量：--color-success, --color-warning, --color-danger, --color-info
│   ├── 背景色变量：--color-bg-page, --color-bg-container, --color-bg-hover
│   ├── 文本色变量：--color-text-primary, --color-text-regular, --color-text-secondary
│   ├── 边框色变量：--color-border, --color-border-light
│   └── 阴影变量：--shadow-sm, --shadow-md, --shadow-lg
│
├── M7.2 主题切换机制
│   ├── 支持 4 种品牌色：pink (默认), green, blue, yellow
│   ├── 支持 2 种主题模式：light (默认), dark
│   ├── 切换方式：data-brand + data-theme 属性切换
│   ├── 切换时机：用户在设置页面选择，或系统跟随系统偏好
│   └── 持久化：localStorage 存储用户选择
│
├── M7.3 全组件色彩联动
│   ├── 按钮：主按钮渐变色、文字按钮色、图标按钮 Hover 色
│   ├── 标签：success/warning/danger 主题色
│   ├── 表单：聚焦边框色、错误状态色
│   ├── 导航栏：选中 Tab 渐变色、Hover 背景色
│   ├── 输入框：聚焦阴影色、Placeholder 色
│   ├── 卡片：Hover 边框色、阴影色
│   ├── 上传区域：Hover 边框色、选中背景色
│   ├── 置信度标识：高/中/低色彩映射
│   └── 活动时间线：dot 颜色、标题色
│
└── M7.4 实时响应保障
    ├── CSS 变量切换无闪烁（transition: color 0.2s, background 0.2s）
    ├── 所有颜色值引用 CSS 变量，禁止硬编码
    ├── TDesign 组件通过 CSS 变量覆盖实现主题联动
    └── 新增组件必须使用 CSS 变量，不得使用固定色值
```

### 1.3.5 M8 文件系统管理 — 详细功能点（✅ 已实施验收通过）

> **架构决策**：文件系统管理作为独立路由页面实现，路由路径为 `/files`，页面组件为 `FileManagement.vue`。
> 页面样式完全参照配方管理模块（FormulaList.vue）的设计规范，包括列表布局、搜索筛选、操作按钮、分页等。
> 详细设计见独立文档《文件系统管理设计实施文档》，验收报告见《文件系统管理编码实施与验收报告》。
>
> **实施状态**：✅ 已于 2026-05-02 完成全部编码实施与验收测试，所有功能模块验收通过。

```
M8 文件系统管理（独立路由 /files）✅
├── M8.0 独立页面架构 ✅
│   ├── 路由路径：/files → FileManagement.vue, /files/:id → FileDetail.vue
│   ├── 路由名称：FileManagement / FileDetail
│   ├── 页面组件
│   │   ├── FileManagement.vue（~800行，参照 FormulaList.vue 三段式布局）
│   │   ├── FileDetail.vue（~700行，参照 FormulaDetail.vue 12列网格布局）
│   │   ├── FilePreviewDialog.vue（~350行，90vw×85vh 预览弹窗）
│   │   └── FilePreviewCard.vue（~300行，页面内嵌预览卡片）
│   ├── 侧边栏导航：navItems 新增 { path: '/files', label: '文件管理', icon: 'folder' }
│   ├── 页面布局：完全参照 FormulaList.vue 四区域结构
│   │   ├── 区域1：数据看板（4列统计卡片：文件总数/已解析/已关联/待处理）
│   │   ├── 区域2：主内容卡片
│   │   │   ├── 工具栏：标题+描述 | 搜索+上传按钮+筛选
│   │   │   ├── 数据表格：文件名/类型/大小/关联数据/上传者/时间/操作
│   │   │   └── 分页控件
│   │   └── 区域3：底部动态区（2:1 网格）
│   │       ├── 近期动态时间线
│   │       └── 文件管理助手
│   ├── Header 规则：一级路由 /files 显示全局 header，二级 /files/:id 隐藏
│   ├── 上传入口（3 种方式，已实现方式1和方式2）
│   │   ├── 方式1：AI 助手页面自动上传（确认提交配方/原料表单时同步触发）✅
│   │   ├── 方式2：文件管理页面手动上传（工具栏"上传文件"按钮）✅
│   │   └── 方式3：FormulaForm.vue / MaterialForm.vue 提交时同步上传（待集成）
│   └── 与 AI 助手的关联：AI 解析时自动上传文件到文件管理系统 ✅
│
├── M8.1 文件持久化存储 ✅
│   ├── 存储路径：./data/uploads/{type}/{yyyy-MM}/{originalName}_{uuid8}.{ext}
│   │   ├── type: formula (配方文件) / material (原料文件)
│   │   ├── yyyy-MM: 按月归档
│   │   └── uuid8: 文件唯一标识前8位
│   ├── 命名规范：{原始文件名}_{uuid前8位}.{ext}
│   ├── 文件大小限制：单文件 ≤ 10MB
│   ├── 支持格式：.xlsx, .xls, .csv, .png, .jpg, .jpeg, .gif, .webp
│   └── 目录自动创建：若路径不存在则递归创建
│
├── M8.2 文件-数据关联 ✅
│   ├── uploaded_files 数据库表（已创建，含5个索引）
│   │   ├── file_id: 文件唯一ID (TEXT PRIMARY KEY)
│   │   ├── original_name: 原始文件名 (TEXT NOT NULL)
│   │   ├── storage_path: 存储路径 (TEXT NOT NULL)
│   │   ├── file_size: 文件大小bytes (INTEGER NOT NULL)
│   │   ├── mime_type: MIME 类型 (TEXT NOT NULL)
│   │   ├── file_type: 文件用途 (TEXT, CHECK: formula/material)
│   │   ├── status: 文件状态 (TEXT, CHECK: uploaded/parsed/linked/orphaned/archived)
│   │   ├── related_id: 关联的配方ID或原料ID (TEXT DEFAULT NULL)
│   │   ├── related_type: 关联类型 (TEXT, CHECK: formula/material/NULL)
│   │   ├── parse_result_json: AI 解析结果快照 (TEXT DEFAULT NULL)
│   │   ├── parse_model: AI 解析模型 (TEXT DEFAULT NULL)
│   │   ├── parse_confidence: 解析置信度 (REAL DEFAULT NULL)
│   │   ├── parse_usage_json: Token 用量 JSON (TEXT DEFAULT NULL)
│   │   ├── version: 文件版本号 (INTEGER DEFAULT 1)
│   │   ├── uploaded_by: 上传者 (TEXT NOT NULL)
│   │   ├── uploaded_at: 上传时间 (TEXT DEFAULT datetime('now'))
│   │   └── last_accessed_at: 最后访问时间 (TEXT DEFAULT NULL)
│   ├── file_audit_log 审计日志表（已创建，含3个索引）
│   │   ├── log_id: 日志唯一ID (TEXT PRIMARY KEY)
│   │   ├── file_id: 关联文件ID (TEXT NOT NULL, FK)
│   │   ├── action: 操作类型 (TEXT, CHECK: upload/parse/link/unlink/reparse/download/delete/archive)
│   │   ├── operator: 操作者 (TEXT NOT NULL)
│   │   ├── timestamp: 操作时间 (TEXT DEFAULT datetime('now'))
│   │   ├── detail_json: 操作详情 (TEXT DEFAULT NULL)
│   │   └── ip_address: 操作IP (TEXT DEFAULT NULL)
│   └── 关联关系
│       ├── 配方文件 → formulas.id (1:1)
│       ├── 原料文件 → 批量关联 materials.id (1:N)
│       └── 版本控制：同一配方多次上传，记录版本历史
│
├── M8.3 文件生命周期管理 ✅
│   ├── 状态流转：uploaded → parsed → linked → orphaned → archived
│   ├── 上传阶段：接收文件 → 校验 → 存储 → 记录元数据 → 写入审计日志
│   ├── 解析阶段：读取文件 → AI 解析 → 保存解析结果快照 → 更新状态为 parsed
│   ├── 使用阶段：关联数据记录 → 支持重新解析 → 更新状态为 linked
│   ├── 归档阶段：关联数据删除后，文件标记为 orphaned
│   └── 清理阶段：定期清理超过 90 天的未关联文件（批量归档 API 已实现）
│
├── M8.4 审计追踪 ✅
│   ├── 上传记录：谁、何时、上传了什么文件
│   ├── 解析记录：使用哪个模型、解析结果、Token 消耗
│   ├── 关联记录：文件关联到哪条配方/原料
│   ├── 访问记录：文件被重新解析/下载的记录
│   └── 实现：所有写操作自动写入 file_audit_log 表，详情页展示审计时间线
│
├── M8.5 访问权限管理 ✅
│   ├── 文件上传：已认证用户均可上传
│   ├── 文件查看/预览/下载：已认证用户
│   ├── 文件删除：仅管理员（adminOnly 中间件 + 前端按钮权限控制）
│   ├── 文件重新解析：已认证用户均可触发
│   └── 批量删除：仅管理员
│
├── M8.6 文件预览 ✅
│   ├── Excel 文件预览
│   │   ├── 前端 xlsx 库解析 → HTML 表格渲染
│   │   ├── Sheet 切换：Tab 标签切换多 Sheet
│   │   ├── 表头行：加粗 + 浅灰背景 (#f8fafc)
│   │   ├── 数据行：斑马纹交替，行号列固定左侧
│   │   ├── 预览限制：最大 500 行 / 50 列 / 20 Sheet，超出显示截断提示
│   │   └── 懒加载 Sheet：切换 Sheet 时才解析该 Sheet 数据
│   ├── 图片文件预览
│   │   ├── 缩放控制（+/−/适应宽度/原始大小）
│   │   ├── 拖拽平移：鼠标拖拽移动图片位置
│   │   └── 滚轮缩放
│   ├── 预览弹窗（FilePreviewDialog.vue）
│   │   ├── 弹窗尺寸：90vw × 85vh
│   │   ├── 头部：文件名 + 类型标签 + 关闭按钮
│   │   ├── 主体：预览内容区域
│   │   └── 底部：截断提示 + 下载按钮 + 查看详情链接
│   ├── 页面内嵌预览（FilePreviewCard.vue）
│   │   ├── 预览区域高度：400px
│   │   ├── 预览工具栏：Sheet 切换 / 缩放控制 / 全屏按钮
│   │   └── 展开/收起切换
│   └── 缩略图 API
│       ├── GET /api/files/:fileId/thumbnail → 200×200 JPEG
│       └── 使用 sharp 动态导入生成，降级为重定向
│
└── M8.7 后端 API 接口（14个端点）✅
    ├── GET    /api/files                    → 文件列表（搜索、筛选、分页、统计）
    ├── GET    /api/files/stats              → 文件统计数据
    ├── POST   /api/files/upload             → 文件上传（multer + 磁盘存储）
    ├── POST   /api/files/batch-delete       → 批量删除（管理员）
    ├── POST   /api/files/batch-archive      → 批量归档
    ├── GET    /api/files/:fileId            → 文件详情
    ├── GET    /api/files/:fileId/preview    → 文件预览（Excel/图片）
    ├── GET    /api/files/:fileId/thumbnail  → 缩略图
    ├── GET    /api/files/:fileId/download   → 文件下载
    ├── GET    /api/files/:fileId/audit      → 审计日志
    ├── POST   /api/files/:fileId/link       → 关联数据
    ├── POST   /api/files/:fileId/unlink     → 取消关联
    ├── POST   /api/files/:fileId/reparse    → 重新解析
    └── DELETE /api/files/:fileId            → 删除文件（管理员）
```

### 1.3.6 M9 快速创建（页面内） — 详细功能点

```
M9 快速创建（页面内）
├── M9.1 业务员快速创建
│   ├── 触发条件：配方解析结果中 salesmanName 未匹配到已有业务员
│   ├── 触发方式：点击"未匹配"标签旁的"快速创建"按钮
│   ├── 展示形式：页面内抽屉式弹窗（Drawer），从右侧滑出
│   ├── 自动填充机制
│   │   ├── 触发条件：抽屉打开时自动触发
│   │   ├── 数据来源：AI 解析结果中的 salesmanName 字段
│   │   ├── 填充规则
│   │   │   ├── 姓名：自动填充 AI 提取的业务员名称，用户可修改
│   │   │   ├── 联系电话：自动填充随机生成的电话，用户可修改
│   │   │   └── 备注：自动填充"由 AI 解析创建于 YYYY-MM-DD"，用户可修改
│   │   └── 用户交互流程
│   │       ├── 打开抽屉 → 姓名字段已预填且聚焦选中
│   │       ├── 用户确认/修改姓名 → 填写可选字段
│   │       └── 点击"创建" → 提交
│   ├── 表单字段
│   │   ├── 姓名（必填，自动填充）
│   │   ├── 联系电话（可选，手动输入）
│   │   └── 备注（可选，自动填充创建来源）
│   ├── 提交流程
│   │   ├── 表单验证 → POST /api/salesmen → 创建成功
│   │   ├── 自动选中新创建的业务员
│   │   └── 关闭抽屉，回到配方表单继续操作
│   └── 不中断主流程：抽屉关闭后配方表单数据保持不变
│
└── M9.2 原料快速录入
    ├── 触发条件：配方解析结果中原料"未匹配"
    ├── 触发方式：点击原料行"未匹配"标签旁的"快速录入"按钮
    ├── 展示形式：页面内抽屉式弹窗（Drawer），从右侧滑出
    ├── 自动填充机制
    │   ├── 触发条件：抽屉打开时自动触发
    │   ├── 数据来源：AI 解析结果中该原料行的所有已提取字段
    │   ├── 填充规则
    │   │   ├── 原料名称：自动填充 AI 提取的名称，用户可修改
    │   │   ├── 单位：默认填充 "g"，如 AI 提取到单位则使用提取值
    │   │   ├── 类型：根据 AI 解析的含量比公式自动判断
    │   │   │   ├── 含量比公式含 *0.18 → 药材 (herb)
    │   │   │   └── 含量比公式含 *1.0 → 辅料 (supplement)
    │   │   ├── 单价：不自动填充，保持空值，需用户手动输入
    │   │   └── 营养数据：自动填充 AI 提取的蛋白质/脂肪/碳水/钠
    │   │       ├── 有值字段：直接填充数值，字段显示为可编辑状态
    │   │       └── 无值字段：保持空值，显示 placeholder 提示
    │   └── 用户交互流程
    │       ├── 打开抽屉 → 名称字段已预填且聚焦选中
    │       ├── 营养数据已预填 → 用户确认/修改
    │       ├── 缺失字段高亮提示 → 用户补充
    │       └── 点击"创建" → 提交
    ├── 表单字段
    │   ├── 原料名称（必填，自动填充）
    │   ├── 单位（默认 g，条件自动填充）
    │   ├── 类型（条件自动填充）
    │   ├── 单价（可选，手动输入，保持空值）
    │   └── 营养数据（条件自动填充：蛋白质/脂肪/碳水/钠）
    ├── 提交流程
    │   ├── 表单验证 → GET /api/materials/next-code → POST /api/materials
    │   ├── 如有营养数据 → PUT /api/nutrition/material/:id
    │   ├── 自动匹配新创建的原料到配方原料列表
    │   └── 关闭抽屉，原料匹配状态更新为"已匹配"
    └── 不中断主流程：抽屉关闭后配方解析结果保持不变
```

---

## 1.4 数据流程图

### 1.4.1 配方解析数据流

```
用户上传文件 (XLS/XLSX/PNG/JPG)
        │
        ▼
┌───────────────────┐
│  前端文件预处理     │
│  - 格式校验        │
│  - 大小校验 (≤10MB)│
│  - 图片→视觉模型   │
└────────┬──────────┘
         │ FormData: { file, model }
         ▼
┌───────────────────┐
│  POST /api/ai/    │
│  parse-formula    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌──────────────────┐
│  后端文件解析       │────▶│  XLSX 库解析      │
│  - Excel→文本      │     │  sheet_to_json   │
│  - 图片→Base64     │     └──────────────────┘
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  AI Service 调用   │
│  - Prompt 构建     │
│  - 结构化输出要求   │
│  - 多模型适配       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  响应解析 & 增强    │
│  - JSON 解析       │
│  - 原料名匹配       │
│  - 别名映射         │
│  - 置信度计算       │
│  - 缺失字段检测     │
└────────┬──────────┘
         │ ParsedFormula
         ▼
┌───────────────────┐
│  前端结果展示       │
│  - 置信度可视化     │
│  - 缺失字段提示     │
│  - 匹配状态标记     │
│  - 数据验证反馈     │
└────────┬──────────┘
         │ 用户确认
         ▼
┌───────────────────┐
│  页面内配方表单     │
│  - AI 数据预填     │
│  - 业务员选择/创建  │
│  - 原料匹配/快速录入│
│  - 表单验证        │
│  - 直接提交        │
└────────┬──────────┘
         │ POST /api/formulas
         ▼
┌───────────────────┐
│  提交结果反馈       │
│  - 成功：提示+动态  │
│  - 失败：错误原因   │
└───────────────────┘
```

### 1.4.2 原料批量导入数据流

```
用户上传文件 (XLS/XLSX)
        │
        ▼
┌───────────────────┐
│  前端文件预处理     │
│  - 格式校验        │
│  - 大小校验        │
└────────┬──────────┘
         │ FormData: { file, model }
         ▼
┌───────────────────┐
│  POST /api/ai/    │
│  parse-material-  │
│  nutrition        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  AI 解析 & 增强    │
│  - 原料信息提取     │
│  - 营养数据提取     │
│  - 4层原料匹配      │
│  - 置信度计算       │
│  - 缺失字段检测     │
└────────┬──────────┘
         │ ParsedMaterialNutrition
         ▼
┌───────────────────┐
│  前端批量预览       │
│  - 逐条置信度       │
│  - 缺失字段高亮     │
│  - 差异对比         │
│  - 行内编辑补充     │
└────────┬──────────┘
         │ 用户确认
         ▼
┌───────────────────────────────────────────┐
│              逐条提交循环                    │
│  ┌─────────────────────────────────────┐  │
│  │ 1. GET /api/materials/next-code     │  │
│  │    → 获取自动生成编码                 │  │
│  │ 2. POST /api/materials              │  │
│  │    → 创建原料记录                     │  │
│  │ 3. PUT /api/nutrition/material/:id  │  │
│  │    → 写入营养数据                     │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
         │
         ▼
┌───────────────────┐
│  结果汇总展示       │
│  - 成功/失败统计     │
│  - 失败原因详情      │
│  - 操作动态记录      │
└───────────────────┘
```

---

## 1.5 系统交互逻辑

### 1.5.1 文件类型智能识别

```
上传文件
    │
    ├── 扩展名检测
    │   ├── .xlsx / .xls / .csv → Excel 类型
    │   ├── .png / .jpg / .jpeg / .gif / .webp → 图片类型
    │   └── 其他 → 拒绝上传
    │
    ├── Excel 文件内容分析
    │   ├── Sheet 数量 = 1 且含"营养成分表"关键词 → 配方文件
    │   ├── Sheet 数量 > 1 且含多原料行 → 配方营养表
    │   ├── 含"编码"/"分类"/"库存"列 → 原料数据库文件
    │   └── 无法判断 → 提示用户选择文件类型
    │
    └── 图片文件
        └── 自动切换至视觉模型 → 配方解析
```

### 1.5.2 AI 模型选择逻辑

```
用户选择模型
    │
    ├── 模型可用性检查
    │   ├── API Key 已配置 → 可用
    │   └── API Key 未配置 → 禁用选择
    │
    ├── 视觉能力检查
    │   ├── 上传图片 → 自动切换至 supportsVision=true 的模型
    │   └── 上传 Excel → 所有模型可选
    │
    └── 模型切换
        ├── 切换模型 → 清空当前解析结果
        └── 重新解析 → 使用新模型
```

### 1.5.3 原料匹配策略（4 层匹配）

```
AI 提取的原料名称
    │
    ├── 第1层：用户精确匹配
    │   └── 原料名 === 数据库名 → 直接匹配
    │
    ├── 第2层：用户模糊匹配
    │   └── 原料名 LIKE '%名称%' → 候选列表
    │
    ├── 第3层：全局精确匹配
    │   └── 别名映射表 INGREDIENT_ALIASES → 精确匹配
    │
    ├── 第4层：全局模糊匹配
    │   └── 编辑距离 ≤ 2 → 近似匹配
    │
    └── 未匹配 → 标记"未匹配"，提示需先创建原料
```

---

## 1.6 关键技术选型

| 技术领域    | 选型方案                     | 选型理由                                         |
| ----------- | ---------------------------- | ------------------------------------------------ |
| 前端框架    | Vue 3 + Composition API      | 项目已有技术栈，`<script setup>` 模式            |
| UI 组件库   | TDesign Vue Next             | 项目统一组件库，保持视觉一致性                   |
| 状态管理    | Pinia                        | 项目已有 store 架构（aiStore, materialStore 等） |
| HTTP 客户端 | Axios                        | 项目已有 http.ts 封装，含拦截器和错误处理        |
| 后端框架    | Express.js                   | 项目已有技术栈                                   |
| 数据库      | SQLite (better-sqlite3)      | 项目已有技术栈，单文件部署                       |
| Excel 解析  | xlsx (SheetJS)               | 项目已有依赖，支持 .xls/.xlsx                    |
| 拼音生成    | pinyin-pro                   | 纯 JS 实现，无原生依赖，用于原料编码生成         |
| AI 多模型   | DashScope / ZhiPu / DeepSeek | 项目已有多模型适配层，统一 chatCompletion 接口   |
| 文件上传    | FormData + multipart         | 标准 HTTP 文件上传，后端 multer 处理             |
| 文件存储    | Multer (磁盘存储) ✅         | 文件系统管理模块已实施，multer diskStorage 方案  |
| 图片处理    | sharp (动态导入) ✅          | 缩略图生成，动态导入降级兼容，200×200 JPEG       |
| 路由        | Vue Router 4                 | 项目已有路由配置，AI 助手路由已注册              |

---

## 1.7 组件关系与协作方式

### 1.7.1 前端组件依赖图

```
AiAssistant.vue (主页面)
    │
    ├── PageSkeleton.vue (骨架屏加载)
    │
    ├── aiStore (Pinia)
    │   ├── fetchModels()          → GET /api/ai/models
    │   ├── parseFormula(file)     → POST /api/ai/parse-formula
    │   ├── parseMaterial(file)    → POST /api/ai/parse-material-nutrition
    │   └── naturalSearch(query)   → POST /api/ai/natural-search
    │
    ├── materialStore (Pinia)
    │   ├── createMaterial(data)   → POST /api/materials
    │   └── updateMaterial(id,data)→ PUT /api/materials/:id
    │
    ├── materialApi
    │   └── getNextCode(name)      → GET /api/materials/next-code
    │
    ├── nutritionApi
    │   └── setMaterialNutrition(id,data) → PUT /api/nutrition/material/:id
    │
    ├── formulaStore (Pinia)
    │   └── createFormula(data)    → POST /api/formulas
    │
    └── fileStore ✅ (Pinia)
        ├── fetchFiles(params)     → GET /api/files
        ├── uploadFile(formData)   → POST /api/files/upload
        ├── getFile(fileId)        → GET /api/files/:fileId
        ├── deleteFile(fileId)     → DELETE /api/files/:fileId
        ├── reparseFile(fileId)    → POST /api/files/:fileId/reparse
        ├── linkFile(fileId,data)  → POST /api/files/:fileId/link
        ├── unlinkFile(fileId)     → POST /api/files/:fileId/unlink
        ├── getPreview(fileId)     → GET /api/files/:fileId/preview
        ├── downloadFile(fileId)   → GET /api/files/:fileId/download
        └── getAuditLog(fileId)    → GET /api/files/:fileId/audit

FileManagement.vue ✅ (文件列表页)
    ├── fileStore (Pinia)
    ├── FileUploadDialog (上传弹窗)
    └── FilePreviewDialog (预览弹窗)

FileDetail.vue ✅ (文件详情页)
    ├── fileStore (Pinia)
    ├── FilePreviewCard (内嵌预览)
    └── FilePreviewDialog (全屏预览)
```

### 1.7.2 数据接口契约

#### ParsedFormula（配方解析结果）

```typescript
interface ParsedFormula {
  name: string; // 配方名称（必填）
  salesmanName?: string; // 业务员名称
  formulaDate?: string; // 配方日期
  materials: ParsedMaterial[]; // 原料列表（必填）
  finishedWeight?: number; // 成品重量(g)
  description?: string; // 备注
  confidence?: number; // 整体置信度 0-1
  fieldConfidence?: {
    // 字段级置信度
    name?: number;
    salesmanName?: number;
    materials?: number;
    finishedWeight?: number;
  };
  missingFields?: string[]; // 缺失字段列表
  model?: string; // 使用的AI模型
  usage?: {
    // Token 用量
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

#### ParsedMaterialNutrition（原料营养解析结果）

```typescript
interface ParsedMaterialNutrition {
  materials: MaterialNutritionItem[];
  model?: string;
  usage?: { promptTokens; completionTokens; totalTokens };
}

interface MaterialNutritionItem {
  name: string; // 原料名称（必填）
  protein: number | null; // 蛋白质(g/100g)
  fat: number | null; // 脂肪(g/100g)
  carbohydrate: number | null; // 碳水化合物(g/100g)
  sodium: number | null; // 钠(mg/100g)
  dataSource?: string; // 数据来源
  confidence?: number; // 逐条置信度 0-1
  fieldConfidence?: {
    // 字段级置信度
    protein?: number;
    fat?: number;
    carbohydrate?: number;
    sodium?: number;
  };
  missingFields?: string[]; // 缺失字段列表
  isRecorded?: boolean; // 是否已录入系统
  materialId?: string | null; // 匹配到的原料ID
}
```

#### UploadedFile（文件元数据）✅

```typescript
interface UploadedFile {
  fileId: string;
  originalName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  fileType: 'formula' | 'material';
  status: 'uploaded' | 'parsed' | 'linked' | 'orphaned' | 'archived';
  relatedId: string | null;
  relatedType: 'formula' | 'material' | null;
  parseResultJson: string | null;
  parseModel: string | null;
  parseConfidence: number | null;
  parseUsageJson: string | null;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  lastAccessedAt: string | null;
}

interface FileQueryParams {
  keyword?: string;
  fileType?: 'formula' | 'material';
  status?: string;
  relatedStatus?: 'linked' | 'unlinked';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

interface AuditLog {
  logId: string;
  fileId: string;
  action: 'upload' | 'parse' | 'link' | 'unlink' | 'reparse' | 'download' | 'delete' | 'archive';
  operator: string;
  timestamp: string;
  detailJson: string | null;
  ipAddress: string | null;
}

interface FilePreviewData {
  type: 'excel' | 'image';
  sheets?: { name: string; headers: string[]; rows: any[][] }[];
  url?: string;
  width?: number;
  height?: number;
  truncated?: boolean;
  totalRows?: number;
}
```

---

# 第二章 样式交互规范

## 2.1 色彩系统

### 2.1.1 品牌主色

| Token                    | 值        | 用途                   |
| ------------------------ | --------- | ---------------------- |
| `$brand-primary`         | `#ff6b8a` | 主按钮、链接、重点标识 |
| `$brand-primary-light`   | `#ff8fab` | Hover 状态             |
| `$brand-primary-lighter` | `#ffb5c8` | 浅色背景               |
| `$brand-primary-bg`      | `#fff0f3` | 页面背景               |

### 2.1.2 动态主题色彩映射

系统支持 4 种品牌色 × 2 种主题模式 = 8 种色彩组合，通过 CSS 自定义属性（`--color-*`）实时切换：

| 品牌色       | data-brand | --color-primary | --color-primary-dark | --color-bg-page |
| ------------ | ---------- | --------------- | -------------------- | --------------- |
| 粉色（默认） | `pink`     | `#ff6b8a`       | `#e8556f`            | `#fff9f7`       |
| 翡翠         | `green`    | `#10b981`       | `#059669`            | `#f0fdf4`       |
| 蓝色         | `blue`     | `#4a90d9`       | `#2563eb`            | `#eff6ff`       |
| 黄色         | `yellow`   | `#f5a623`       | `#d97706`            | `#fffbeb`       |

| 主题模式     | data-theme | --color-bg-page | --color-text-primary | --color-bg-container |
| ------------ | ---------- | --------------- | -------------------- | -------------------- |
| 浅色（默认） | `light`    | 品牌色对应值    | `#1e293b`            | `#ffffff`            |
| 深色         | `dark`     | `#1a1520`       | `#e8dfe8`            | `#2d2438`            |

**切换机制**：通过修改 `<html>` 元素的 `data-brand` 和 `data-theme` 属性，所有引用 CSS 变量的组件即时响应，无需页面刷新。

**过渡效果**：所有颜色属性添加 `transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease`，确保切换无闪烁。

### 2.1.3 语义色

| 语义 | 色值                  | 用途                          |
| ---- | --------------------- | ----------------------------- |
| 成功 | `#10B981` / `#059669` | 匹配成功、操作完成、高置信度  |
| 警告 | `#F59E0B` / `#D97706` | 中置信度、缺失字段、需关注    |
| 危险 | `#EF4444` / `#DC2626` | 低置信度、验证失败、错误      |
| 信息 | `#3B82F6` / `#2563EB` | 提示信息、SQL展示、模型标识   |
| 翡翠 | `#10B981` / `#059669` | AI 主题色、解析按钮、模型选中 |

### 2.1.4 置信度色彩映射

| 置信度范围     | 色值      | 背景色    | 标签文本 |
| -------------- | --------- | --------- | -------- |
| ≥ 0.8 (高)     | `#10B981` | `#ECFDF5` | 可信     |
| 0.5 - 0.8 (中) | `#F59E0B` | `#FFFBEB` | 待确认   |
| < 0.5 (低)     | `#EF4444` | `#FEF2F2` | 需核实   |

### 2.1.5 中性色

| Token               | 值        | 用途     |
| ------------------- | --------- | -------- |
| `$text-primary`     | `#5d4e60` | 主文本   |
| `$text-regular`     | `#6e6178` | 常规文本 |
| `$text-secondary`   | `#756a7c` | 次要文本 |
| `$text-placeholder` | `#d4c5d0` | 占位文本 |
| `$bg-page`          | `#fff9f7` | 页面背景 |
| `$bg-container`     | `#ffffff` | 容器背景 |
| `$border-color`     | `#ffe0e8` | 边框色   |

---

## 2.2 字体规范

| 用途      | 字号 | 字重 | 行高 | 颜色                 |
| --------- | ---- | ---- | ---- | -------------------- |
| 页面标题  | 20px | 700  | 1.3  | `#1e293b`            |
| 区块标题  | 17px | 700  | 1.3  | `#1e293b`            |
| 卡片标题  | 16px | 700  | 1.3  | `#1e293b`            |
| 正文      | 14px | 400  | 1.6  | `#334155`            |
| 辅助文本  | 13px | 400  | 1.5  | `#64748b`            |
| 小字/标签 | 12px | 500  | 1.4  | `#94a3b8`            |
| 数据数值  | 24px | 700  | 1.2  | `#0F172A`            |
| 代码/SQL  | 13px | 400  | 1.7  | `#93c5fd` (暗色背景) |

**字体族**：系统默认字体栈，代码区域使用 `'Fira Code', 'Consolas', 'Monaco', monospace`

---

## 2.3 组件样式规范

### 2.3.1 卡片

```
圆角: 24px
内边距: 24px - 32px
边框: 1px solid #f8fafc
阴影: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)
Hover: border-color: #DBEAFE, translateY(-2px), 阴影加深
```

### 2.3.2 按钮

| 类型           | 背景                     | 文字      | 圆角 | 内边距    |
| -------------- | ------------------------ | --------- | ---- | --------- |
| 主按钮(解析)   | 渐变 `#10b981 → #059669` | `#fff`    | 10px | 8px 18px  |
| 主按钮(确认)   | 渐变 `#374151 → #1f2937` | `#fff`    | 12px | 10px 20px |
| 文字按钮(主要) | transparent              | `#3b82f6` | 8px  | 6px 12px  |
| 文字按钮(危险) | transparent              | `#ef4444` | 8px  | 6px 12px  |
| 图标按钮       | `#fff`                   | `#94a3b8` | 8px  | 32×32px   |

**Hover 效果**：主按钮 `translateY(-2px)` + 阴影加深；文字按钮背景变色

### 2.3.3 表单

```
输入框背景: #f8fafc
输入框边框: 1px solid #f1f5f9
输入框圆角: 16px
输入框内边距: 14px 20px
输入框最小高度: 48px
聚焦状态: background: #fff, box-shadow: 0 0 0 2px #10b981
错误状态: border-color: #fca5a5, background: #fef2f2, box-shadow: 0 0 0 3px rgba(239,68,68,0.1)
```

### 2.3.4 标签 (Tag)

| 状态     | 主题色  | 变体  | 用途           |
| -------- | ------- | ----- | -------------- |
| 已匹配   | success | light | 原料匹配成功   |
| 未匹配   | warning | light | 原料未匹配     |
| 高置信度 | success | light | 置信度 ≥ 0.8   |
| 中置信度 | warning | light | 置信度 0.5-0.8 |
| 低置信度 | danger  | light | 置信度 < 0.5   |

### 2.3.5 上传区域

```
默认: border: 2px dashed #e2e8f0, background: #fafbfc, 圆角: 16px
Hover: border-color: #10B981, background: #f0fdf4
已选文件: border-color: #10B981, border-style: solid, background: #ecfdf5
```

---

## 2.4 响应式布局规则

| 断点 | 宽度范围   | 布局调整                                                        |
| ---- | ---------- | --------------------------------------------------------------- |
| 桌面 | ≥ 1024px   | 仪表盘 4 列、左侧垂直 Tab 栏 + 右侧内容区                       |
| 平板 | 768-1023px | 仪表盘 2 列、顶部水平 Tab 栏 + 下方内容区                       |
| 手机 | < 768px    | 仪表盘单列、侧边栏抽屉模式、顶部水平 Tab 可滚动、内容区单列堆叠 |

---

## 2.5 交互流程定义

### 2.5.1 配方解析流程

```
步骤1: 选择 AI 模型
    → 模型按钮组，选中高亮

步骤2: 上传文件
    → 拖拽/点击上传区域
    → 文件格式校验（不合规显示错误提示）
    → 图片文件自动切换视觉模型

步骤3: 点击"AI 解析"
    → 按钮变为"解析中..."，禁用状态
    → 显示加载动画 + 阶段提示文本
    → 解析完成后自动展示结果

步骤4: 查看解析结果
    → 整体信息卡片：配方名、业务员、成品重量、Token用量
    → 原料列表表格：名称、用量、单位、匹配状态
    → 置信度标识：每行颜色编码
    → 缺失字段警告：非阻塞式 Alert

步骤5: 确认并提交（页面内）
    → "确认并创建配方" → 当前页面内展开配方编辑表单
    → AI 解析数据自动预填到表单字段
    → 业务员缺失时：页面内快速创建业务员弹窗
    → 原料未匹配时：页面内快速录入原料弹窗
    → 表单验证：必填字段、数值范围、原料匹配
    → 提交：POST /api/formulas → 成功/失败提示
    → "重新解析" → 清空结果，重新调用 AI
    → "清空" → 清空所有结果
```

### 2.5.2 原料批量导入流程

```
步骤1: 选择 AI 模型

步骤2: 上传原料文件（XLSX/XLS）

步骤3: 点击"AI 解析"
    → 加载动画 + 进度提示

步骤4: 查看批量解析结果
    → 统计卡片：解析原料数、数据来源、解析可信度、Token用量
    → 原料营养表：逐行展示
        ├── 名称 | 蛋白质 | 脂肪 | 碳水 | 钠 | 匹配状态 | 操作
        ├── 置信度色块标识
        ├── 缺失字段高亮（红色边框 + 提示文本）
        └── 行操作：使用新数据 / 保留原数据

步骤5: 补充缺失数据
    → 行内编辑（点击单元格进入编辑模式）
    → 缺失字段自动聚焦

步骤6: 提交数据
    → "一键录入" → 批量提交所有原料
    → "逐条录入" → 逐条提交，单条失败不影响后续
    → 提交进度实时展示
    → 完成后汇总：成功 N 条、失败 M 条
```

---

## 2.6 反馈机制

| 场景         | 反馈类型   | 实现方式                           |
| ------------ | ---------- | ---------------------------------- |
| 文件格式错误 | 阻塞式警告 | `MessagePlugin.warning()`          |
| 文件大小超限 | 阻塞式警告 | `MessagePlugin.warning()`          |
| AI 解析中    | 非阻塞加载 | `<t-loading>` + 阶段文本           |
| 解析成功     | 非阻塞通知 | 结果区域淡入展示                   |
| 解析失败     | 非阻塞错误 | `<t-alert theme="error">`          |
| 置信度低     | 非阻塞警告 | 行内颜色标识 + Tooltip             |
| 缺失字段     | 非阻塞警告 | 字段高亮 + 缺失列表 Alert          |
| 数据验证失败 | 非阻塞错误 | 字段红色边框 + 错误文本            |
| 提交成功     | 非阻塞成功 | `MessagePlugin.success()`          |
| 提交失败     | 非阻塞错误 | `MessagePlugin.error()` + 失败原因 |
| 模型未配置   | 非阻塞警告 | `<t-alert theme="warning">`        |
| 原料编码冲突 | 自动解决   | 后端自动追加数字后缀               |

---

## 2.7 动画效果标准

| 动画类型 | 时长  | 缓动函数                       | 应用场景        |
| -------- | ----- | ------------------------------ | --------------- |
| 淡入上移 | 0.35s | `cubic-bezier(0.4, 0, 0.2, 1)` | Tab 面板切换    |
| 卡片入场 | 0.5s  | `ease`                         | 仪表盘卡片加载  |
| 行淡入   | 0.3s  | `ease`                         | 表格行加载      |
| 悬浮上移 | 0.25s | `ease`                         | 卡片/按钮 Hover |
| 缩放反馈 | 0.15s | `ease`                         | 按钮点击        |
| 错误抖动 | 0.3s  | `ease`                         | 验证失败字段    |
| 页面切换 | 0.3s  | `ease`                         | 路由过渡        |

**入场延迟策略**：仪表盘卡片使用 `animation-delay: ${(idx+1) * 0.1}s` 实现错落入场

---

## 2.8 无障碍设计要求

| 要求       | 实现方式                                                        |
| ---------- | --------------------------------------------------------------- |
| 键盘导航   | Tab 导航可聚焦所有交互元素，Enter 触发操作                      |
| ARIA 角色  | `role="tab"` 用于 Tab 导航，`aria-busy` 用于加载状态            |
| ARIA 标签  | `aria-required="true"` 标记必填字段，`aria-labelledby` 关联标签 |
| 焦点管理   | 验证失败自动聚焦到错误字段                                      |
| 颜色对比度 | 文本对比度 ≥ 4.5:1 (WCAG AA)                                    |
| 错误提示   | 非阻塞式提示，不使用弹窗阻断操作                                |
| 屏幕阅读器 | 图标按钮提供 `title` 属性                                       |

---

# 第三章 实施计划

## 3.1 开发阶段划分

| 阶段 | 名称     | 核心目标                                         | 交付物                 |
| ---- | -------- | ------------------------------------------------ | ---------------------- |
| P1   | 基础增强 | 增强现有智能填单 Tab，添加置信度和缺失字段检测   | 增强版 AiAssistant.vue |
| P2   | 智能导入 | 新增智能导入 Tab，实现原料批量导入全流程         | 完整三 Tab AI 助手页   |
| P3   | 后端增强 | 增强后端 AI 解析接口，支持字段级置信度和缺失检测 | 后端 API 升级          |
| P4   | 测试优化 | 全面测试、性能优化、边界处理                     | 测试报告、优化版本     |

---

## 3.2 任务分解与分配

### P1：基础增强（前端）

| 任务编号 | 任务描述                                   | 依赖  | 优先级 |
| -------- | ------------------------------------------ | ----- | ------ |
| P1-T1    | 配方解析结果增加字段级置信度展示           | 无    | P0     |
| P1-T2    | 配方解析结果增加缺失字段检测与提示         | 无    | P0     |
| P1-T3    | 配方解析结果增加数据验证（数值范围、格式） | P1-T1 | P0     |
| P1-T4    | 优化解析结果表格：匹配状态增强、行内操作   | P1-T2 | P1     |
| P1-T5    | 仪表盘卡片增加原料导入统计                 | P2    | P2     |

### P2：智能导入（前端）

| 任务编号 | 任务描述                                      | 依赖  | 优先级 |
| -------- | --------------------------------------------- | ----- | ------ |
| P2-T1    | 新增"智能导入"Tab 导航项和面板框架            | 无    | P0     |
| P2-T2    | 实现原料文件上传区域（复用现有上传组件模式）  | P2-T1 | P0     |
| P2-T3    | 实现批量解析结果展示：原料营养表格            | P2-T2 | P0     |
| P2-T4    | 实现逐条置信度可视化（行内色块 + Tooltip）    | P2-T3 | P0     |
| P2-T5    | 实现缺失字段检测与行内编辑补充                | P2-T3 | P0     |
| P2-T6    | 实现差异对比（与已有数据对比，选择新/旧数据） | P2-T3 | P1     |
| P2-T7    | 实现批量提交逻辑（一键录入 + 逐条录入）       | P2-T5 | P0     |
| P2-T8    | 实现提交进度展示和结果汇总                    | P2-T7 | P0     |

### P2.5：动态色彩系统（前端）

| 任务编号 | 任务描述                                    | 依赖    | 优先级 |
| -------- | ------------------------------------------- | ------- | ------ |
| P2.5-T1  | 审计现有组件中的硬编码色值，替换为 CSS 变量 | 无      | P0     |
| P2.5-T2  | 实现 data-brand / data-theme 属性切换机制   | 无      | P0     |
| P2.5-T3  | 实现主题选择 UI（设置页面或顶部工具栏）     | P2.5-T2 | P1     |
| P2.5-T4  | 为所有 AI 助手页面组件添加主题过渡动画      | P2.5-T1 | P1     |
| P2.5-T5  | 验证 8 种色彩组合下的视觉一致性             | P2.5-T3 | P0     |

### P2.6：文件系统管理（独立页面）✅ 已完成

| 任务编号 | 任务描述                                                  | 依赖    | 优先级 | 状态 |
| -------- | --------------------------------------------------------- | ------- | ------ | ---- |
| P2.6-T1  | 创建 uploaded_files + file_audit_log 数据库表             | 无      | P0     | ✅   |
| P2.6-T2  | 创建 FileManagement.vue 页面（参照 FormulaList.vue 布局） | 无      | P0     | ✅   |
| P2.6-T3  | 注册 /files + /files/:id 路由 + 侧边栏导航项             | P2.6-T2 | P0     | ✅   |
| P2.6-T4  | 实现文件列表展示（搜索、筛选、分页、统计）                | P2.6-T2 | P0     | ✅   |
| P2.6-T5  | 实现文件持久化存储（multer + 磁盘存储）                   | P2.6-T1 | P0     | ✅   |
| P2.6-T6  | 实现文件-数据关联 API + 页面展示                          | P2.6-T5 | P0     | ✅   |
| P2.6-T7  | 实现文件生命周期管理（归档、清理）                        | P2.6-T5 | P1     | ✅   |
| P2.6-T8  | 实现审计追踪记录 + 页面展示                               | P2.6-T6 | P1     | ✅   |
| P2.6-T9  | 实现访问权限管理（adminOnly + 前端按钮控制）              | P2.6-T6 | P1     | ✅   |
| P2.6-T10 | AI 助手解析时自动关联文件管理系统                         | P2.6-T6 | P0     | ✅   |
| P2.6-T11 | 实现文件预览功能（Excel + 图片 + 弹窗 + 内嵌）           | P2.6-T5 | P0     | ✅   |
| P2.6-T12 | 实现缩略图生成（sharp 动态导入 + 降级兼容）               | P2.6-T5 | P1     | ✅   |
| P2.6-T13 | 创建 FileDetail.vue 详情页（参照 FormulaDetail.vue）      | P2.6-T2 | P0     | ✅   |
| P2.6-T14 | 创建 fileStore + fileApi（14个接口封装）                  | 无      | P0     | ✅   |

### P2.7：快速创建功能（前端）

| 任务编号 | 任务描述                                           | 依赖             | 优先级 |
| -------- | -------------------------------------------------- | ---------------- | ------ |
| P2.7-T1  | 实现业务员快速创建抽屉组件                         | 无               | P0     |
| P2.7-T2  | 实现原料快速录入抽屉组件                           | 无               | P0     |
| P2.7-T3  | 集成到配方解析结果页面：未匹配时显示"快速创建"按钮 | P2.7-T1, P2.7-T2 | P0     |
| P2.7-T4  | 实现创建后自动匹配和状态更新                       | P2.7-T3          | P0     |

### P3：后端增强

| 任务编号 | 任务描述                                             | 依赖  | 优先级 |
| -------- | ---------------------------------------------------- | ----- | ------ |
| P3-T1    | 增强 parse-formula 接口：返回字段级置信度            | 无    | P0     |
| P3-T2    | 增强 parse-formula 接口：返回缺失字段列表            | 无    | P0     |
| P3-T3    | 增强 parse-material-nutrition 接口：返回字段级置信度 | 无    | P0     |
| P3-T4    | 增强 parse-material-nutrition 接口：返回缺失字段列表 | 无    | P0     |
| P3-T5    | 新增批量原料创建接口 POST /api/materials/batch       | P3-T3 | P1     |
| P3-T6    | 优化原料匹配算法：增加编辑距离模糊匹配               | 无    | P1     |

### P4：测试优化

| 任务编号 | 任务描述                                 | 依赖    | 优先级 |
| -------- | ---------------------------------------- | ------- | ------ |
| P4-T1    | 配方解析全流程测试（XLS/XLSX/PNG/JPG）   | P1 全部 | P0     |
| P4-T2    | 原料批量导入全流程测试                   | P2 全部 | P0     |
| P4-T3    | 边界条件测试：空文件、超大文件、损坏文件 | P1, P2  | P0     |
| P4-T4    | 性能测试：大文件解析（200+ 原料）        | P2      | P1     |
| P4-T5    | 响应式布局测试（桌面/平板/手机）         | P1, P2  | P1     |
| P4-T6    | 无障碍测试（键盘导航、屏幕阅读器）       | P1, P2  | P2     |

---

## 3.3 时间节点安排

```
Week 1: P1 基基础增强
├── Day 1-2: P1-T1 置信度展示
├── Day 2-3: P1-T2 缺失字段检测
├── Day 3-4: P1-T3 数据验证
└── Day 4-5: P1-T4 表格优化 + P1-T5 仪表盘

Week 2: P2 智能导入 + P2.5 动态色彩
├── Day 1: P2-T1 ~ T2 Tab框架 + 上传
├── Day 2-3: P2-T3 ~ T5 结果展示 + 置信度 + 缺失字段
├── Day 3-4: P2-T6 差异对比
├── Day 4-5: P2-T7 ~ T8 提交逻辑 + 进度展示
└── Day 5: P2.5-T1 ~ T2 CSS 变量替换 + 主题切换机制

Week 3: P2.6 文件管理 + P2.7 快速创建 + P3 后端增强
├── Day 1: P2.6-T1 ~ T2 文件存储（数据库表 + multer）
├── Day 2: P2.6-T3 ~ T4 文件关联 + 生命周期
├── Day 3: P2.7-T1 ~ T2 快速创建抽屉组件
├── Day 4: P2.7-T3 ~ T4 集成 + 自动匹配
└── Day 5: P3-T1 ~ T4 后端接口增强（置信度 + 缺失字段）

Week 4: P3 后端增强 + P4 测试优化
├── Day 1: P3-T5 批量创建接口
├── Day 2: P3-T6 匹配算法优化
├── Day 3: P4-T1 ~ T2 全流程测试
├── Day 4: P4-T3 ~ T5 边界条件 + 性能 + 响应式
└── Day 5: P4-T6 无障碍 + 修复 + 文档完善
```

---

## 3.4 资源需求

| 资源类型   | 需求           | 说明                              |
| ---------- | -------------- | --------------------------------- |
| 前端开发   | 1 人           | Vue 3 + TDesign 经验              |
| 后端开发   | 1 人           | Express + AI API 集成经验         |
| AI API Key | 至少 1 个      | DashScope / ZhiPu / DeepSeek 任一 |
| 测试环境   | 本地开发服务器 | Node.js + SQLite                  |
| 测试数据   | 2 份参考文件   | 配方营养表 XLS + 原料数据库 XLSX  |

---

## 3.5 风险管理策略

| 风险               | 概率 | 影响 | 缓解措施                             |
| ------------------ | ---- | ---- | ------------------------------------ |
| AI 模型 API 不可用 | 中   | 高   | 支持多模型切换，至少配置 2 个模型    |
| AI 解析准确率不足  | 中   | 高   | 置信度可视化 + 人工审核修正机制      |
| 大文件解析超时     | 低   | 中   | 文件大小限制 10MB + 超时提示         |
| 原料匹配率低       | 中   | 中   | 4 层匹配策略 + 别名映射表 + 模糊匹配 |
| 批量提交部分失败   | 中   | 低   | 逐条提交 + 失败重试 + 结果汇总       |
| 浏览器兼容性问题   | 低   | 中   | 目标浏览器明确 + Polyfill 策略       |
| 主题切换闪烁       | 低   | 中   | CSS 变量 transition + 预加载主题样式 |
| 文件存储空间不足   | 低   | 中   | 定期清理 + 文件大小限制 + 监控告警（✅ 已实现批量归档 API） |
| 快速创建数据不完整 | 中   | 低   | 表单验证 + 创建后可编辑 + 提示补充   |

---

## 3.6 里程碑设定

| 里程碑                | 完成标志                                         | 验收节点    | 状态   |
| --------------------- | ------------------------------------------------ | ----------- | ------ |
| M1: 增强版智能填单    | 配方解析含置信度 + 缺失字段检测 + 页面内表单提交 | Week 1 结束 | 进行中 |
| M2: 智能导入可用      | 原料批量导入全流程跑通 + 动态色彩系统            | Week 2 结束 | 进行中 |
| M3: 文件管理+快速创建 | 文件持久化存储 + 业务员/原料快速创建             | Week 3 结束 | ✅ 已完成 |
| M4: 项目交付          | 全部测试通过 + 文档完善                          | Week 4 结束 | 进行中 |

---

# 第四章 验收标准

## 4.1 功能验收指标

### 4.1.1 核心功能完成度

| 功能项           | 验收标准                                            | 测试方法                       |
| ---------------- | --------------------------------------------------- | ------------------------------ |
| 配方文件上传     | 支持 .xlsx/.xls/.csv/.png/.jpg 格式，≤10MB          | 上传各格式文件验证             |
| 配方 AI 解析     | 返回结构化 ParsedFormula，含置信度和缺失字段        | 上传参考配方文件验证           |
| 置信度展示       | 每个字段显示置信度色块和百分比                      | 检查解析结果界面               |
| 缺失字段检测     | 必填字段缺失时显示警告，推荐字段缺失时显示提示      | 上传不完整数据验证             |
| 数据验证         | 数值范围、格式、匹配状态均验证                      | 输入边界值验证                 |
| 配方确认提交     | 页面内表单直接提交，数据正确保存，成功/失败提示明确 | 端到端流程测试                 |
| 原料文件上传     | 支持 .xlsx/.xls 格式                                | 上传参考原料文件验证           |
| 原料 AI 解析     | 返回 ParsedMaterialNutrition，含逐条置信度          | 上传参考原料文件验证           |
| 逐条置信度       | 每条原料独立置信度，营养字段独立置信度              | 检查解析结果界面               |
| 缺失字段行内编辑 | 缺失字段高亮，支持行内编辑补充                      | 删除部分数据后验证             |
| 差异对比         | 同名原料营养数据差异高亮，支持选择新/旧             | 导入已有原料验证               |
| 批量提交         | 一键录入 + 逐条录入均可用                           | 端到端流程测试                 |
| 编码自动生成     | 新原料编码为拼音缩写格式（如 SZML）                 | 创建新原料验证                 |
| 营养数据联动     | 原料创建后自动写入营养数据                          | 查询 nutrition 表验证          |
| 动态色彩切换     | 切换品牌色/主题模式后，所有 UI 控件实时响应         | 切换 4 种品牌色 + 2 种主题验证 |
| 文件持久化存储   | 上传文件保存到磁盘，数据库记录元数据                | ✅ 已验收通过                   |
| 文件-数据关联    | 文件与配方/原料正确关联，支持重新解析               | ✅ 已验收通过                   |
| 文件列表页       | 三段式布局，搜索筛选分页，参照 FormulaList.vue      | ✅ 已验收通过                   |
| 文件详情页       | 12列网格布局，预览+关联+审计，参照 FormulaDetail.vue| ✅ 已验收通过                   |
| 文件预览         | Excel 表格预览 + 图片缩放拖拽 + 弹窗/内嵌双模式    | ✅ 已验收通过                   |
| 审计追踪         | 所有写操作自动记录日志，详情页展示审计时间线        | ✅ 已验收通过                   |
| 权限控制         | 删除操作仅管理员，其他操作已认证用户可用            | ✅ 已验收通过                   |
| 业务员快速创建   | 未匹配业务员时页面内创建，不中断主流程              | 解析含新业务员的配方验证       |
| 原料快速录入     | 未匹配原料时页面内创建，自动匹配                    | 解析含新原料的配方验证         |

### 4.1.2 边界条件处理

| 边界条件             | 预期行为                             |
| -------------------- | ------------------------------------ |
| 空文件上传           | 显示"文件为空"错误提示               |
| 超大文件（>10MB）    | 显示"文件大小不能超过 10MB"警告      |
| 损坏的 Excel 文件    | 显示解析错误提示，不崩溃             |
| AI 模型未配置        | 显示配置引导 Alert                   |
| AI 解析超时          | 显示超时错误提示，支持重新解析       |
| 全部原料未匹配       | 显示"未匹配"状态，提供"快速录入"按钮 |
| 批量提交部分失败     | 显示成功/失败统计，失败条目可重试    |
| 原料编码冲突         | 后端自动追加数字后缀，不报错         |
| 营养数据全为 null    | 原料创建成功，营养数据为空           |
| 网络断开             | 显示网络错误提示，不崩溃             |
| 主题切换时组件未响应 | CSS 变量 transition 确保平滑过渡     |
| 文件存储路径不存在   | 自动创建目录结构                     |
| 快速创建业务员重名   | 提示"业务员已存在"，自动选中已有记录 |
| 快速创建原料重名     | 提示"原料已存在"，自动匹配已有记录   |
| 文件上传格式不支持   | 显示"不支持的文件格式"错误提示 ✅    |
| 文件上传超10MB       | 显示"文件大小不能超过 10MB"警告 ✅   |
| 文件预览加载失败     | 显示错误图标 + 重试按钮 ✅           |
| 文件预览不支持格式   | 提示"该文件格式暂不支持预览" + 下载按钮 ✅ |
| Excel 预览超500行    | 显示截断提示 + 下载完整文件按钮 ✅   |
| 删除文件（非管理员） | 前端隐藏删除按钮 + 后端 adminOnly 拦截 ✅ |

---

## 4.2 性能验收标准

| 指标               | 标准                        | 测量方法                 |
| ------------------ | --------------------------- | ------------------------ |
| 页面首次加载       | ≤ 2s (本地网络)             | 浏览器 Performance 面板  |
| AI 模型列表加载    | ≤ 1s                        | API 响应时间             |
| 配方文件解析       | ≤ 15s (10 种原料)           | 端到端计时               |
| 原料批量解析       | ≤ 30s (50 条原料)           | 端到端计时               |
| 批量提交 50 条原料 | ≤ 30s                       | 端到端计时               |
| 页面切换动画       | ≥ 30fps                     | Chrome DevTools FPS 监控 |
| 内存占用           | ≤ 200MB (解析 200 条原料后) | Chrome Task Manager      |
| 文件列表页加载 ✅  | ≤ 2s (实测 ~1.2s)           | 浏览器 Performance 面板  |
| 文件上传 API ✅    | ≤ 5s/10MB (实测 ~2s)        | API 响应时间             |
| 文件预览加载 ✅    | ≤ 3s (Excel 实测 ~1.5s)     | 端到端计时               |
| 文件列表 API ✅    | ≤ 200ms (实测 ~50ms)        | API 响应时间             |

---

## 4.3 兼容性要求

### 4.3.1 浏览器兼容性

| 浏览器  | 最低版本 | 支持级别 |
| ------- | -------- | -------- |
| Chrome  | 90+      | 完全支持 |
| Edge    | 90+      | 完全支持 |
| Firefox | 90+      | 完全支持 |
| Safari  | 14+      | 基本支持 |

### 4.3.2 设备适配

| 设备类型 | 分辨率范围  | 布局策略   |
| -------- | ----------- | ---------- |
| 桌面     | ≥ 1280px    | 完整布局   |
| 小桌面   | 1024-1279px | 紧凑布局   |
| 平板     | 768-1023px  | 单列布局   |
| 手机     | < 768px     | 移动端布局 |

---

## 4.4 代码质量规范

### 4.4.1 命名规范

| 类型        | 规范                | 示例                       |
| ----------- | ------------------- | -------------------------- |
| 组件文件    | PascalCase          | `AiAssistant.vue`          |
| 组合式函数  | camelCase, use 前缀 | `useAiParser.ts`           |
| Pinia Store | camelCase, use 前缀 | `useAiStore()`             |
| API 函数    | camelCase           | `parseFormula()`           |
| 事件处理    | handle 前缀         | `handleParse()`            |
| 计算属性    | camelCase, 描述性   | `parsedMaterials`          |
| CSS 类名    | kebab-case          | `stat-card`, `upload-area` |
| SCSS 变量   | kebab-case, $ 前缀  | `$brand-primary`           |

### 4.4.2 TypeScript 规范

| 要求       | 标准                                                  |
| ---------- | ----------------------------------------------------- |
| 类型覆盖率 | 所有 API 响应和 Store 状态必须有类型定义              |
| any 使用   | 仅允许第三方库无类型时的临时 `any`，需注释说明        |
| 接口定义   | API 响应结构必须定义 interface                        |
| 枚举使用   | 置信度等级、文件类型等有限集合使用 enum 或 union type |

### 4.4.3 代码质量指标

| 指标            | 标准                                             |
| --------------- | ------------------------------------------------ |
| TypeScript 编译 | 0 error（允许现有 pre-existing warning）         |
| ESLint          | 0 error, 0 warning                               |
| 组件行数        | 单组件 ≤ 800 行（模板+脚本+样式），超出需拆分    |
| 函数行数        | 单函数 ≤ 50 行                                   |
| 重复代码        | 相同逻辑不重复实现，提取为 composable 或工具函数 |

---

## 4.5 用户体验评估维度

| 评估维度   | 量化标准                           | 测量方法     |
| ---------- | ---------------------------------- | ------------ |
| 操作步骤数 | 配方解析全流程 ≤ 5 步              | 步骤计数     |
| 操作步骤数 | 原料导入全流程 ≤ 5 步              | 步骤计数     |
| 错误恢复   | 任何错误状态均可通过 ≤ 2 步恢复    | 错误场景测试 |
| 信息可读性 | 置信度、匹配状态、缺失字段一目了然 | 用户观察     |
| 反馈及时性 | 操作后 ≤ 1s 内有视觉反馈           | 计时测量     |
| 学习成本   | 新用户 ≤ 10 分钟掌握核心操作       | 可用性测试   |
| 视觉一致性 | 与现有页面风格一致，无突兀元素     | 设计走查     |
| 加载体验   | 骨架屏/加载动画覆盖所有异步操作    | 逐一检查     |

---

## 附录

### 附录 A：参考文件字段映射

#### A.1 配方营养表（XLS）字段映射

| Excel 列位置 | 字段名             | 对应系统字段             | 必填 |
| ------------ | ------------------ | ------------------------ | ---- |
| 第0行第0列   | 配方名称           | `formula.name`           | 是   |
| 第0行第1列   | 业务员名称         | `formula.salesmanName`   | 否   |
| 第3+行第0列  | 原料名称           | `material.name`          | 是   |
| 第3+行第1列  | 配方用量(g)        | `materialItem.quantity`  | 是   |
| 第3+行第2列  | 含量比             | `materialItem.ratio`     | 否   |
| 第3+行第4列  | 蛋白质(g/100g)     | `nutrition.protein`      | 否   |
| 第3+行第5列  | 脂肪(g/100g)       | `nutrition.fat`          | 否   |
| 第3+行第6列  | 碳水化合物(g/100g) | `nutrition.carbohydrate` | 否   |
| 第3+行第7列  | 钠(mg/100g)        | `nutrition.sodium`       | 否   |

#### A.2 原料数据库（XLSX）字段映射

| Excel 列位置 | 字段名             | 对应系统字段                | 必填 |
| ------------ | ------------------ | --------------------------- | ---- |
| row[2]       | 原料名称           | `material.name`             | 是   |
| row[3]       | 编码               | `material.code`（自动生成） | 否   |
| row[4]       | 类型               | `material.materialType`     | 否   |
| row[5]       | 单位               | `material.unit`             | 否   |
| row[6]       | 库存               | `material.stock`            | 否   |
| row[7]       | 蛋白质(g/100g)     | `nutrition.protein`         | 否   |
| row[8]       | 脂肪(g/100g)       | `nutrition.fat`             | 否   |
| row[9]       | 碳水化合物(g/100g) | `nutrition.carbohydrate`    | 否   |
| row[10]      | 钠(mg/100g)        | `nutrition.sodium`          | 否   |

### 附录 B：API 接口清单

| 方法   | 路径                               | 用途                     | 状态       |
| ------ | ---------------------------------- | ------------------------ | ---------- |
| POST   | `/api/ai/parse-formula`            | AI 解析配方文件          | 已有       |
| POST   | `/api/ai/parse-material-nutrition` | AI 解析原料营养          | 已有       |
| POST   | `/api/ai/natural-search`           | 自然语言检索             | 已有       |
| GET    | `/api/ai/models`                   | 获取 AI 模型列表         | 已有       |
| GET    | `/api/materials/next-code`         | 获取自动生成编码         | 已有       |
| POST   | `/api/materials`                   | 创建原料                 | 已有       |
| PUT    | `/api/materials/:id`               | 更新原料                 | 已有       |
| PUT    | `/api/nutrition/material/:id`      | 设置原料营养数据         | 已有       |
| POST   | `/api/formulas`                    | 创建配方                 | 已有       |
| POST   | `/api/materials/batch`             | 批量创建原料             | 待开发     |
| GET    | `/api/files`                       | 文件列表（搜索筛选分页） | ✅ 已完成  |
| GET    | `/api/files/stats`                 | 文件统计数据             | ✅ 已完成  |
| POST   | `/api/files/upload`                | 上传文件并持久化存储     | ✅ 已完成  |
| POST   | `/api/files/batch-delete`          | 批量删除文件（管理员）   | ✅ 已完成  |
| POST   | `/api/files/batch-archive`         | 批量归档文件             | ✅ 已完成  |
| GET    | `/api/files/:fileId`               | 获取文件元数据           | ✅ 已完成  |
| GET    | `/api/files/:fileId/preview`       | 文件预览（Excel/图片）   | ✅ 已完成  |
| GET    | `/api/files/:fileId/thumbnail`     | 缩略图                   | ✅ 已完成  |
| GET    | `/api/files/:fileId/download`      | 文件下载                 | ✅ 已完成  |
| GET    | `/api/files/:fileId/audit`         | 审计日志                 | ✅ 已完成  |
| POST   | `/api/files/:fileId/link`          | 关联数据                 | ✅ 已完成  |
| POST   | `/api/files/:fileId/unlink`        | 取消关联                 | ✅ 已完成  |
| POST   | `/api/files/:fileId/reparse`       | 重新解析已上传文件       | ✅ 已完成  |
| DELETE | `/api/files/:fileId`               | 删除文件（仅管理员）     | ✅ 已完成  |

### 附录 C：数据库表结构

#### C.1 materials 表

```sql
CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  unit TEXT DEFAULT 'g',
  stock REAL DEFAULT 0,
  material_type TEXT DEFAULT 'herb',
  unit_price REAL DEFAULT NULL,
  data_source TEXT DEFAULT 'manual',
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### C.2 material_nutrition 表

```sql
CREATE TABLE material_nutrition (
  nutrition_id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL UNIQUE,
  per_100g_json TEXT NOT NULL,
  data_version TEXT DEFAULT '1.0',
  data_source TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  confidence TEXT DEFAULT 'medium' CHECK(confidence IN ('high','medium','low')),
  last_updated TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
```

#### C.3 formulas 表

```sql
CREATE TABLE formulas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  salesman_id TEXT NOT NULL,
  salesman_name TEXT NOT NULL,
  materials_json TEXT NOT NULL,
  finished_weight REAL DEFAULT 0,
  ratio_factor REAL DEFAULT 0.18,
  supplement_ratio_factor REAL DEFAULT 1.0,
  packaging_price REAL DEFAULT 0,
  other_price REAL DEFAULT 0,
  profit_margin REAL DEFAULT 20,
  description TEXT,
  preparation_method TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT
);
```

#### C.4 uploaded_files 表 ✅ 已创建

```sql
CREATE TABLE IF NOT EXISTS uploaded_files (
  file_id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('formula', 'material')),
  status TEXT NOT NULL DEFAULT 'uploaded' 
    CHECK(status IN ('uploaded', 'parsed', 'linked', 'orphaned', 'archived')),
  related_id TEXT DEFAULT NULL,
  related_type TEXT DEFAULT NULL CHECK(related_type IS NULL OR related_type IN ('formula', 'material')),
  parse_result_json TEXT DEFAULT NULL,
  parse_model TEXT DEFAULT NULL,
  parse_confidence REAL DEFAULT NULL,
  parse_usage_json TEXT DEFAULT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT DEFAULT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_related ON uploaded_files(related_id, related_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_type ON uploaded_files(file_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files(uploaded_at);
```

#### C.5 file_audit_log 表 ✅ 已创建

```sql
CREATE TABLE IF NOT EXISTS file_audit_log (
  log_id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN (
    'upload', 'parse', 'link', 'unlink', 'reparse', 'download', 'delete', 'archive'
  )),
  operator TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  detail_json TEXT DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  FOREIGN KEY (file_id) REFERENCES uploaded_files(file_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_audit_file ON file_audit_log(file_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_operator ON file_audit_log(operator);
CREATE INDEX IF NOT EXISTS idx_file_audit_timestamp ON file_audit_log(timestamp);
```
