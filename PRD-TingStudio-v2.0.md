# 产品需求文档 (PRD) - TingStudio v2.0

> 版本：v2.0 | 更新日期：2026-03-25

---

## 1. 产品概述

TingStudio 是一款面向食品配方行业的专业配方管理系统，主要服务于中草药功效配方（固体饮料、口服液等产品类型）的研发与管理。系统帮助配方师高效管理配方全生命周期，包括原料管理、配方研发与版本迭代、营养成分分析与合规检查、业务员对接、以及多元化的配方输出（PDF/Excel/API/打印）。

### 1.1 技术架构

| 层级 | 技术选型 |
|------|---------|
| 前端 | Vue 3 + TypeScript + Vite + TDesign Vue Next + Pinia |
| 后端 | Express.js + TypeScript |
| 数据库 | SQLite (better-sqlite3) + WAL 模式 |
| 认证 | JWT Bearer Token |
| 通信 | RESTful API，前后端分离 |

### 1.2 系统环境

- 后端服务默认端口：`3000`
- 前端开发服务端口：`5173`，Vite 代理 `/api` → `http://localhost:3000`
- API 统一前缀：`/api`
- 健康检查端点：`GET /health`

---

## 2. 用户角色与权限

### 2.1 角色定义

系统包含两种用户角色：

| 角色 | 标识 | 说明 |
|------|------|------|
| **管理员** | `admin` | 系统最高权限，管理用户、系统配置、数据维护，可查看所有配方 |
| **配方师** | `formulist` | 核心业务用户，负责配方研发、原料管理、营养分析 |

> 默认管理员账号：`admin` / `admin123`

### 2.2 配方师工作职责与流程

#### 2.2.1 核心职责

- **配方研发**：根据业务员传递的需求，选择合适的中草药原料，设计配方比例和添加量
- **原料管理**：维护原料库，录入原料编码、名称、单位、库存、营养成分等基础信息
- **版本控制**：管理配方的多版本迭代，记录每次修改的原料变更等详细信息
- **营养分析**：对配方进行营养成分计算，进行合规性检查，生成分析报告
- **配方输出**：将配方导出为 PDF/Excel 格式，或通过 API 推送至外部系统（MES/ERP/WMS）

#### 2.2.2 典型工作流程

```
1. 接收需求
   └── 业务员传递配方需求（功效需求、产品类型、规格要求）

2. 原料选型
   ├── 查询原料库（搜索、筛选）
   ├── 查看原料营养成分数据
   └── 确定原料清单及配比

3. 配方创建
   ├── 选择关联业务员
   ├── 输入配方名称
   ├── 添加原料及用量（克数）
   ├── 填写产品类型（固体饮料/口服液）、规格（4g/袋 或 15g/支）、功效描述
   └── 系统自动计算原料报价与总价

4. 版本管理
   ├── 创建初始版本（v1.0）
   ├── 配方修改后自动生成新版本
   ├── 手动创建快照版本
   ├── 版本对比（查看两次版本间的原料、描述变更）
   └── 版本发布（将草稿版本发布为正式版本）

5. 营养分析
   ├── 自动计算配方营养汇总（基于各原料 per 100g 营养数据 × 用量）
   ├── 生成配方营养报告（总重量、per 100g 营养含量、原料贡献占比）
   ├── 选择营养标准进行合规检查（婴儿/儿童/成人/老年/孕妇/特殊）
   └── 生成优化建议

6. 配方输出
   ├── 选择导出模板（PDF/Excel/API/打印）
   ├── 创建导出任务
   ├── 查看导出进度和结果
   ├── 生成分享链接（支持密码、过期时间、下载次数限制）
   └── 配置 API 数据接口推送至外部系统
```

#### 2.2.3 配方师权限范围

| 模块 | 权限 |
|------|------|
| 配方管理 | 增删改查自己创建的配方（admin 可查看全部） |
| 原料管理 | 增删改查自己创建的原料 |
| 业务员管理 | 查看全部业务员，增删改查 |
| 版本管理 | 对自己负责的配方进行版本操作 |
| 营养分析 | 计算与分析自己负责的配方 |
| 导出中心 | 创建导出任务、管理分享链接 |

### 2.3 管理员工作职责与流程

#### 2.3.1 核心职责

- **用户管理**：创建用户账号，分配角色，管理用户权限
- **系统监控**：监控系统运行状态，处理异常
- **数据管理**：数据库维护，种子数据管理
- **全局查看**：查看所有用户创建的配方、原料等数据
- **系统配置**：配置 JWT 密钥、CORS 策略、数据库路径等参数

#### 2.3.2 典型工作流程

```
1. 系统初始化
   ├── 配置环境变量（.env）
   ├── 初始化数据库（执行 init.sql）
   ├── 插入种子数据（执行 seedData）
   └── 验证系统运行（/health 检查）

2. 用户管理
   ├── 查看所有用户列表
   ├── 创建新用户并分配角色
   └── 维护账号信息

3. 数据管理
   ├── 查看全局配方数据
   ├── 查看各模块数据统计
   └── 管理导出任务和分享链接

4. 系统维护
   ├── 监控服务运行状态
   ├── 查看错误日志
   └── 数据备份与恢复
```

#### 2.3.3 管理员权限范围

| 模块 | 权限 |
|------|------|
| 所有模块 | 拥有全部增删改查权限，不受 `created_by` 限制 |
| 配方查看 | 可查看所有用户创建的配方 |
| 用户管理 | 创建用户、分配角色 |
| 系统配置 | 配置系统参数 |

---

## 3. 核心功能模块

### 3.1 认证模块

支持用户注册、登录、身份验证。

- 注册时默认角色为 `formulist`
- 登录返回 JWT Token，前端存储后通过 `Authorization: Bearer <token>` 请求头携带
- Token 过期后需重新登录
- 路由守卫：未认证用户自动跳转至登录页

### 3.2 配方管理

#### 3.2.1 配方列表

- 分页展示，支持按配方名称、业务员名称关键词搜索
- 支持按业务员 ID 筛选
- 管理员可查看所有配方，普通用户仅查看自己创建的配方
- 每条配方展示：名称、业务员名称、产品类型标签、规格、功效标签、总价
- 配方描述以 JSON 存储，包含：`productType`（产品类型）、`dosage`（规格）、`efficacy`（功效）、`totalQuote`（总报价）、`materials`（原料明细列表）

#### 3.2.2 配方创建与编辑

- 必填：配方名称、业务员（下拉选择）、原料列表
- 原料列表字段：原料 ID、原料名称、用量（克）
- 创建时自动生成 v1.0 初始版本（状态为 `published`）
- 编辑时若原料有变更，自动创建新版本（状态为 `draft`），记录变更详情

#### 3.2.3 配方详情

- 展示配方基本信息、原料组成、配方描述
- 提供跳转到版本管理、营养分析的入口

#### 3.2.4 原料反查

- 支持根据原料 ID 查询使用了该原料的所有配方

### 3.3 原材料管理

#### 3.3.1 原料列表

- 分页展示，支持按名称、编码关键词搜索
- 仅展示当前用户创建的原料
- 展示字段：名称、编码、单位、库存、创建时间

#### 3.3.2 原料 CRUD

- 创建时编码不可重复（唯一约束）
- 更新时编码不可重复
- 删除时检查是否被配方引用，被引用的原料不可删除
- 默认单位为 `g`

### 3.4 业务员管理

#### 3.4.1 业务员列表

- 分页展示，支持关键词搜索、状态筛选（active/inactive）、部门筛选
- 全部业务员对所有用户可见（无 `created_by` 限制）
- 展示字段：姓名、工号、部门、电话、邮箱、状态

#### 3.4.2 业务员 CRUD

- 必填：姓名、工号
- 工号不可重复
- 删除为软删除（将状态设为 `inactive`）

### 3.5 版本控制

#### 3.5.1 版本列表

- 展示指定配方的所有版本，按创建时间倒序
- 支持按状态筛选（draft/published/archived）
- 每个版本包含：版本号、版本名称、状态、是否当前版本、变更详情、配方快照

#### 3.5.2 版本创建

- 手动创建快照版本，自动递增大版本号（v1.0 → v2.0）
- 创建时将旧版本标记为非当前版本
- 保存当前配方的完整快照（名称、业务员、原料、描述）

#### 3.5.3 版本发布

- 将指定版本发布为正式版本
- 发布时将同一配方的所有其他版本归档为 `archived`
- 发布版本标记为 `is_current = 1`

#### 3.5.4 版本对比

- 选择同一配方的两个版本进行对比
- 对比维度：
  - 业务员变更
  - 描述变更
  - 原料新增/删除/用量变更
- 输出变更摘要：总变更数、新增数、修改数、删除数

### 3.6 导出中心

#### 3.6.1 导出模板管理

- 模板类型：PDF、Excel、API、打印
- 模板配置（JSON）：列设置、方向、字体大小等
- 支持设置默认模板（同类型仅一个默认）

#### 3.6.2 导出任务

- 创建导出任务：选择配方、版本、模板、导出类型
- 任务状态流转：pending → processing → completed/failed
- 查看导出进度、下载文件
- 仅展示当前用户创建的导出任务

#### 3.6.3 分享功能

- 创建分享链接：选择配方、版本、分享方式（链接/邮件/API）
- 安全控制：密码保护、过期时间、允许访问邮箱列表、下载次数限制
- 公开访问端点无需认证（`GET /api/exports/share/:shareId`）
- 自动记录下载次数

#### 3.6.4 API 数据接口

- 配置外部 API 接口，用于将配方数据推送至外部系统
- 支持认证方式：无认证（none）、Basic Auth、API Key、OAuth
- 支持数据格式：JSON、XML
- 支持字段映射、速率限制、重试配置

### 3.7 营养分析

#### 3.7.1 原料营养数据

- 每种原料可录入 per 100g 营养成分数据（JSON 格式）
- 支持的营养字段：energy（能量）、protein（蛋白质）、fat（脂肪）、carbohydrate（碳水化合物）、fiber（膳食纤维）、sugars（糖）、sodium（钠）、potassium（钾）、calcium（钙）、iron（铁）、zinc（锌）、magnesium（镁）、phosphorus（磷）、维生素 A/C/D/E/K、维生素B族、cholesterol（胆固醇）、transFat（反式脂肪）、saturatedFat（饱和脂肪）
- 支持数据版本管理，更新时自动递增版本号
- 记录数据来源和备注

#### 3.7.2 配方营养计算

- 根据配方中各原料的用量及其 per 100g 营养数据，自动计算：
  - **总重量**：所有原料用量之和
  - **总营养含量**：各原料贡献的营养素累加
  - **per 100g 营养含量**：按配方总重量换算
  - **原料贡献占比**：每种原料的重量占比
- 计算结果自动保存至 `formula_nutrition_summaries` 表

#### 3.7.3 营养标准管理

- 标准分类：infant（婴儿）、child（儿童）、adult（成人）、elderly（老年）、pregnant（孕妇）、special（特殊医学用途）
- 每个标准包含：
  - 目标值（target_values）：各营养素的推荐摄入量
  - 容差范围（tolerance_ranges）：可接受的上下限
  - 必填字段（mandatory_fields）：必须检测的营养指标

#### 3.7.4 合规性检查

- 将配方营养计算结果与选定的营养标准进行对比
- 检查结果状态：pass（通过）、warning（警告）、fail（不合格）
- 自动生成优化建议（如存在不达标项）
- 保存分析报告至 `nutrition_analysis_reports` 表

### 3.8 首页

- 登录后默认展示「最近配方」页面
- 展示用户最近创建/更新的配方列表
- 支持配方详情弹窗查看

### 3.9 工具箱

- 系统工具集成页面（预留功能）

---

## 4. 前端页面与路由

| 路由路径 | 页面名称 | 需要认证 | 说明 |
|---------|---------|---------|------|
| `/login` | 登录页 | 否 | 用户登录 |
| `/register` | 注册页 | 否 | 用户注册 |
| `/` | 主布局 | 是 | 包含侧边栏导航 |
| `/recent-formulas` | 最近配方 | 是 | 默认首页 |
| `/formulas` | 配方管理 | 是 | 配方列表 |
| `/formulas/new` | 新增配方 | 是 | 创建配方表单 |
| `/formulas/:id/edit` | 编辑配方 | 是 | 编辑配方表单 |
| `/materials` | 原料管理 | 是 | 原料列表 |
| `/materials/new` | 新增原料 | 是 | 创建原料表单 |
| `/materials/:id/edit` | 编辑原料 | 是 | 编辑原料表单 |
| `/salesmen` | 业务员管理 | 是 | 业务员列表 |
| `/salesmen/new` | 新增业务员 | 是 | 创建业务员表单 |
| `/salesmen/:id/edit` | 编辑业务员 | 是 | 编辑业务员表单 |
| `/salesmen/:id` | 业务员详情 | 是 | 业务员详情页 |
| `/versions/formula/:formulaId` | 版本管理 | 是 | 配方版本列表 |
| `/versions/compare/:formulaId` | 版本对比 | 是 | 版本对比页面 |
| `/exports` | 导出中心 | 是 | 导出任务和模板管理 |
| `/nutrition` | 营养分析 | 是 | 营养成分计算 |
| `/nutrition/profiles` | 营养标准 | 是 | 营养标准管理 |
| `/tools` | 工具箱 | 是 | 系统工具 |

---

## 5. 数据结构定义

### 5.1 用户表 `users`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 用户唯一 ID |
| `username` | TEXT | UNIQUE, NOT NULL | 用户名 |
| `password` | TEXT | NOT NULL | bcrypt 哈希密码 |
| `role` | TEXT | NOT NULL, DEFAULT 'formulist' | 角色：admin / formulist |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

### 5.2 原料表 `materials`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 原料唯一 ID |
| `name` | TEXT | NOT NULL | 原料名称（如：炒山楂、茯苓） |
| `code` | TEXT | UNIQUE, NOT NULL | 原料编码（如：MAT001） |
| `unit` | TEXT | NOT NULL, DEFAULT 'g' | 计量单位 |
| `stock` | REAL | NOT NULL, DEFAULT 0 | 库存量 |
| `created_by` | TEXT | FK → users.id, NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

### 5.3 配方表 `formulas`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 配方唯一 ID |
| `name` | TEXT | NOT NULL | 配方名称 |
| `salesman_id` | TEXT | FK → salesmen.id, NOT NULL | 业务员 ID |
| `salesman_name` | TEXT | NOT NULL | 业务员名称（冗余） |
| `materials_json` | TEXT | NOT NULL | 原料列表 JSON（见下方格式） |
| `description` | TEXT | | 配方描述 JSON（见下方格式） |
| `created_by` | TEXT | FK → users.id, NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

**`materials_json` 格式：**
```json
[
  { "materialId": "xxx", "materialName": "炒山楂", "quantity": 0.31 },
  { "materialId": "yyy", "materialName": "茯苓", "quantity": 0.465 }
]
```

**`description` 格式：**
```json
{
  "productType": "固体饮料",
  "dosage": "4g/袋",
  "efficacy": "消积、通便",
  "totalQuote": 0.0235,
  "materials": [
    {
      "name": "炒山楂",
      "ratio": "6%",
      "amount": "0.31g",
      "unitPrice": "60元/kg",
      "quote": 0.0186
    }
  ]
}
```

### 5.4 配方版本表 `formula_versions`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `version_id` | TEXT | PK | 版本唯一 ID |
| `formula_id` | TEXT | FK → formulas.id, NOT NULL | 所属配方 |
| `version_number` | TEXT | NOT NULL | 版本号（如 v1.0、v1.1） |
| `version_name` | TEXT | | 版本名称（如"初始版本"） |
| `changes_json` | TEXT | | 变更详情 JSON |
| `snapshot_json` | TEXT | NOT NULL | 配方完整快照 JSON |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' | 状态：draft/published/archived |
| `is_current` | INTEGER | NOT NULL, DEFAULT 0 | 是否为当前版本（0/1） |
| `created_by` | TEXT | NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

**`changes_json` 格式：**
```json
[
  {
    "field": "materials",
    "fieldLabel": "原料: 炒山楂",
    "oldValue": 0.31,
    "newValue": 0.28,
    "changeType": "modify"
  }
]
```

### 5.5 业务员表 `salesmen`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | TEXT | PK | 业务员唯一 ID |
| `name` | TEXT | NOT NULL | 姓名 |
| `code` | TEXT | UNIQUE, NOT NULL | 工号 |
| `department` | TEXT | | 所属部门 |
| `phone` | TEXT | | 联系电话 |
| `email` | TEXT | | 电子邮箱 |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | 状态：active/inactive |
| `created_by` | TEXT | NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

### 5.6 导出模板表 `export_templates`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `template_id` | TEXT | PK | 模板唯一 ID |
| `name` | TEXT | NOT NULL | 模板名称 |
| `description` | TEXT | | 模板描述 |
| `type` | TEXT | NOT NULL | 类型：pdf/excel/api/print |
| `format_config_json` | TEXT | NOT NULL | 格式配置 JSON |
| `is_default` | INTEGER | NOT NULL, DEFAULT 0 | 是否为默认模板（0/1） |
| `created_by` | TEXT | NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

### 5.7 导出任务表 `export_jobs`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `job_id` | TEXT | PK | 任务唯一 ID |
| `formula_id` | TEXT | FK → formulas.id, NOT NULL | 配方 |
| `version_id` | TEXT | | 版本 |
| `template_id` | TEXT | | 模板 |
| `export_type` | TEXT | NOT NULL | 导出类型：pdf/excel/api |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' | 状态：pending/processing/completed/failed |
| `file_url` | TEXT | | 生成文件路径 |
| `file_name` | TEXT | | 文件名 |
| `api_endpoint` | TEXT | | API 推送地址 |
| `progress` | INTEGER | NOT NULL, DEFAULT 0 | 进度（0-100） |
| `error_message` | TEXT | | 错误信息 |
| `created_by` | TEXT | NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `completed_at` | TEXT | | 完成时间 |

### 5.8 API 数据接口表 `api_data_interfaces`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `interface_id` | TEXT | PK | 接口唯一 ID |
| `name` | TEXT | NOT NULL | 接口名称 |
| `description` | TEXT | | 描述 |
| `endpoint` | TEXT | UNIQUE, NOT NULL | 接口地址 |
| `method` | TEXT | NOT NULL, DEFAULT 'GET' | HTTP 方法：GET/POST/PUT/DELETE |
| `authentication` | TEXT | NOT NULL, DEFAULT 'none' | 认证方式：none/basic/apiKey/oauth |
| `auth_config_json` | TEXT | | 认证配置 JSON |
| `data_format` | TEXT | NOT NULL, DEFAULT 'json' | 数据格式：json/xml |
| `field_mapping_json` | TEXT | | 字段映射 JSON |
| `rate_limit_json` | TEXT | | 速率限制配置 JSON |
| `retry_config_json` | TEXT | | 重试配置 JSON |
| `created_by` | TEXT | NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

### 5.9 分享配置表 `share_configs`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `share_id` | TEXT | PK | 分享唯一 ID |
| `formula_id` | TEXT | FK → formulas.id, NOT NULL | 配方 |
| `version_id` | TEXT | | 版本 |
| `share_type` | TEXT | NOT NULL, DEFAULT 'link' | 分享方式：link/email/api |
| `share_url` | TEXT | | 分享链接 |
| `password` | TEXT | | 访问密码 |
| `expire_date` | TEXT | | 过期日期 |
| `allowed_emails_json` | TEXT | | 允许访问邮箱列表 JSON |
| `download_limit` | INTEGER | | 下载次数上限 |
| `download_count` | INTEGER | NOT NULL, DEFAULT 0 | 已下载次数 |
| `created_by` | TEXT | NOT NULL | 创建者 |
| `created_at` | TEXT | NOT NULL | 创建时间 |

### 5.10 原料营养成分表 `material_nutrition`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `nutrition_id` | TEXT | PK | 记录唯一 ID |
| `material_id` | TEXT | FK → materials.id, UNIQUE, NOT NULL | 原料 |
| `per_100g_json` | TEXT | NOT NULL | per 100g 营养数据 JSON |
| `data_version` | TEXT | NOT NULL, DEFAULT '1.0' | 数据版本 |
| `data_source` | TEXT | | 数据来源 |
| `notes` | TEXT | | 备注 |
| `last_updated` | TEXT | NOT NULL | 最后更新时间 |

**`per_100g_json` 格式：**
```json
{
  "energy_kj": 1500,
  "protein_g": 5.0,
  "fat_g": 1.0,
  "carbohydrate_g": 70.0,
  "dietary_fiber_g": 0.5,
  "sodium_mg": 50,
  "calcium_mg": 20,
  "iron_mg": 0.5,
  "vitaminC_mg": 0.1
}
```

### 5.11 配方营养汇总表 `formula_nutrition_summaries`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `summary_id` | TEXT | PK | 汇总唯一 ID |
| `formula_id` | TEXT | FK → formulas.id, NOT NULL | 配方 |
| `version_id` | TEXT | UNIQUE | 版本（可选） |
| `total_weight` | REAL | NOT NULL, DEFAULT 0 | 配方总重量（g） |
| `total_nutrition_json` | TEXT | NOT NULL | 总营养含量 JSON |
| `per_100g_nutrition_json` | TEXT | NOT NULL | per 100g 营养含量 JSON |
| `material_breakdown_json` | TEXT | | 原料贡献明细 JSON |
| `calculated_by` | TEXT | NOT NULL | 计算人 |
| `calculated_at` | TEXT | NOT NULL | 计算时间 |

### 5.12 营养标准表 `nutrition_profiles`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `profile_id` | TEXT | PK | 标准唯一 ID |
| `name` | TEXT | NOT NULL | 标准名称 |
| `description` | TEXT | | 描述 |
| `category` | TEXT | NOT NULL | 分类：infant/child/adult/elderly/pregnant/special |
| `target_values_json` | TEXT | NOT NULL | 目标营养值 JSON |
| `tolerance_ranges_json` | TEXT | | 容差范围 JSON |
| `mandatory_fields_json` | TEXT | | 必填字段列表 JSON |
| `created_at` | TEXT | NOT NULL | 创建时间 |
| `updated_at` | TEXT | NOT NULL | 更新时间 |

### 5.13 营养分析报告表 `nutrition_analysis_reports`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `report_id` | TEXT | PK | 报告唯一 ID |
| `formula_id` | TEXT | FK → formulas.id, NOT NULL | 配方 |
| `version_id` | TEXT | | 版本 |
| `summary_id` | TEXT | FK → formula_nutrition_summaries.summary_id, NOT NULL | 营养汇总 |
| `compliance_check_json` | TEXT | | 合规检查结果 JSON |
| `recommendations_json` | TEXT | | 优化建议 JSON |
| `generated_by` | TEXT | NOT NULL | 生成人 |
| `generated_at` | TEXT | NOT NULL | 生成时间 |

---

## 6. 接口规范

### 6.1 通用规范

**基础 URL**：`/api`

**认证方式**：所有需要认证的接口需在请求头携带 JWT Token
```
Authorization: Bearer <token>
```

**请求格式**：`Content-Type: application/json`

**统一响应格式**：

成功响应：
```json
{ "success": true, "message": "操作成功", "data": { ... } }
```

分页响应：
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "list": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

错误响应：
```json
{ "success": false, "message": "错误描述", "error": "详细错误信息" }
```

**分页参数**：所有列表接口支持 `page`（页码，默认 1）和 `pageSize`（每页条数，默认 20，最大 100）查询参数。

### 6.2 认证接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 否 | 用户注册 |
| POST | `/api/auth/login` | 否 | 用户登录 |
| GET | `/api/auth/me` | 是 | 获取当前用户信息 |

#### POST `/api/auth/register`

请求体：
```json
{ "username": "string (2-50字符)", "password": "string (≥6字符)" }
```

响应（201）：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": { "id": "xxx", "username": "xxx", "role": "formulist" },
    "token": "jwt_token_string"
  }
}
```

#### POST `/api/auth/login`

请求体：
```json
{ "username": "string", "password": "string" }
```

响应（200）：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": { "id": "xxx", "username": "xxx", "role": "admin" },
    "token": "jwt_token_string"
  }
}
```

#### GET `/api/auth/me`

响应（200）：
```json
{
  "success": true,
  "message": "操作成功",
  "data": { "id": "xxx", "username": "admin", "role": "admin", "createdAt": "..." }
}
```

### 6.3 配方接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/formulas` | 是 | 获取配方列表 |
| GET | `/api/formulas/:id` | 是 | 获取配方详情 |
| POST | `/api/formulas` | 是 | 创建配方 |
| PUT | `/api/formulas/:id` | 是 | 更新配方 |
| DELETE | `/api/formulas/:id` | 是 | 删除配方 |
| GET | `/api/formulas/by-material/:materialId` | 是 | 按原料查找配方 |

#### GET `/api/formulas`

查询参数：`keyword`（关键词）、`salesmanId`（业务员 ID）、`page`、`pageSize`

#### POST `/api/formulas`

请求体（必填校验）：
```json
{
  "name": "string (必填)",
  "salesmanId": "string (必填)",
  "materials": [
    { "materialId": "string", "materialName": "string", "quantity": "number" }
  ],
  "description": "string (可选，JSON 字符串)"
}
```

响应（201）：创建成功后自动生成 v1.0 初始版本。

### 6.4 原料接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/materials` | 是 | 获取原料列表 |
| GET | `/api/materials/:id` | 是 | 获取原料详情 |
| POST | `/api/materials` | 是 | 创建原料 |
| PUT | `/api/materials/:id` | 是 | 更新原料 |
| DELETE | `/api/materials/:id` | 是 | 删除原料 |

#### POST `/api/materials`

请求体（必填校验）：
```json
{
  "name": "string (必填)",
  "code": "string (必填，唯一)",
  "unit": "string (可选，默认 g)",
  "stock": "number (可选，默认 0)"
}
```

**业务规则**：
- 编码唯一，重复返回 409
- 删除时检查配方引用，被引用返回 400

### 6.5 业务员接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/salesmen` | 是 | 获取业务员列表 |
| GET | `/api/salesmen/:id` | 是 | 获取业务员详情 |
| POST | `/api/salesmen` | 是 | 创建业务员 |
| PUT | `/api/salesmen/:id` | 是 | 更新业务员 |
| DELETE | `/api/salesmen/:id` | 是 | 停用业务员（软删除） |

#### GET `/api/salesmen`

查询参数：`keyword`、`status`（active/inactive）、`department`、`page`、`pageSize`

> 注意：业务员列表对所有用户可见，不受 `created_by` 限制。

### 6.6 版本接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/versions/formula/:formulaId` | 是 | 获取配方版本列表 |
| GET | `/api/versions/detail/:versionId` | 是 | 获取版本详情 |
| POST | `/api/versions/formula/:formulaId` | 是 | 创建新版本 |
| PUT | `/api/versions/publish/:versionId` | 是 | 发布版本 |
| GET | `/api/versions/compare/:formulaId` | 是 | 版本对比 |

#### GET `/api/versions/formula/:formulaId`

查询参数：`status`（draft/published/archived）

响应中每个版本包含解析后的 `changes` 和 `snapshot` 对象。

#### POST `/api/versions/formula/:formulaId`

请求体：
```json
{
  "versionName": "string (可选)",
  "status": "string (可选，默认 draft)"
}
```

自动递增大版本号（v1.0 → v2.0），将旧版本标记为非当前。

#### PUT `/api/versions/publish/:versionId`

将指定版本发布为正式版本，同时将同一配方的所有其他版本归档。

#### GET `/api/versions/compare/:formulaId`

查询参数：`versionA`（版本 ID A）、`versionB`（版本 ID B），均必填。

响应：
```json
{
  "success": true,
  "data": {
    "diffId": "xxx",
    "versionA": { ... },
    "versionB": { ... },
    "differences": [
      {
        "fieldId": "material_xxx",
        "fieldLabel": "原料: 炒山楂",
        "fieldType": "materialQuantity",
        "changes": {
          "oldValue": 0.31,
          "newValue": 0.28,
          "changeType": "modify",
          "highlighted": true
        }
      }
    ],
    "summary": {
      "totalChanges": 5,
      "addedCount": 1,
      "modifiedCount": 3,
      "deletedCount": 1,
      "materialChanges": 4,
      "descriptionChanges": 0,
      "nutritionChanges": 0
    }
  }
}
```

### 6.7 导出接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/exports/templates` | 是 | 获取导出模板列表 |
| POST | `/api/exports/templates` | 是 | 创建导出模板 |
| POST | `/api/exports/jobs` | 是 | 创建导出任务 |
| GET | `/api/exports/jobs` | 是 | 获取导出任务列表 |
| GET | `/api/exports/jobs/:jobId` | 是 | 获取导出任务详情 |
| POST | `/api/exports/share` | 是 | 创建分享链接 |
| GET | `/api/exports/share/:shareId` | **否** | 访问分享内容（公开） |
| GET | `/api/exports/api-interfaces` | 是 | 获取 API 接口列表 |
| POST | `/api/exports/api-interfaces` | 是 | 创建 API 接口 |

#### GET `/api/exports/templates`

查询参数：`type`（pdf/excel/api/print）

#### POST `/api/exports/share`

请求体：
```json
{
  "formulaId": "string",
  "versionId": "string (可选)",
  "shareType": "link (link/email/api)",
  "password": "string (可选)",
  "expireDate": "string (可选)",
  "allowedEmails": ["string"],
  "downloadLimit": "number (可选)"
}
```

### 6.8 营养分析接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/nutrition/material/:materialId` | 是 | 获取原料营养成分 |
| PUT | `/api/nutrition/material/:materialId` | 是 | 设置/更新原料营养成分 |
| POST | `/api/nutrition/calculate/:formulaId` | 是 | 计算配方营养汇总 |
| GET | `/api/nutrition/profiles` | 是 | 获取营养标准列表 |
| POST | `/api/nutrition/profiles` | 是 | 创建营养标准 |
| POST | `/api/nutrition/compliance/:formulaId` | 是 | 合规性检查 |

#### PUT `/api/nutrition/material/:materialId`

请求体：
```json
{
  "per100g": { "energy_kj": 1500, "protein_g": 5.0, ... },
  "dataSource": "string (可选)",
  "notes": "string (可选)"
}
```

支持新建和更新，更新时自动递增数据版本。

#### POST `/api/nutrition/calculate/:formulaId`

自动计算并保存配方营养汇总。

响应：
```json
{
  "success": true,
  "data": {
    "formulaId": "xxx",
    "formulaName": "消积通便固体饮料",
    "totalWeight": 3.755,
    "totalNutrition": { "energy": 2.8, "protein": 0.19, ... },
    "per100gNutrition": { "energy": 74.57, "protein": 5.06, ... },
    "materialBreakdown": [
      {
        "materialId": "xxx",
        "materialName": "炒山楂",
        "quantity": 0.31,
        "weightContribution": 0.31,
        "percentage": 8.25,
        "nutritionContribution": { "energy": 0.23, ... }
      }
    ]
  }
}
```

#### POST `/api/nutrition/compliance/:formulaId`

查询参数：`profileId`（营养标准 ID，可选）

响应：
```json
{
  "success": true,
  "data": {
    "reportId": "xxx",
    "complianceCheck": [
      {
        "field": "calcium",
        "label": "calcium",
        "actualValue": 25.0,
        "targetRange": { "min": 0.9, "max": 1.1 },
        "status": "pass",
        "deviation": 0,
        "message": "calcium: 25.0"
      }
    ],
    "recommendations": [
      {
        "type": "safety",
        "priority": "high",
        "title": "营养合规性警告",
        "description": "有 2 项营养指标不达标，建议调整配方",
        "actionable": true
      }
    ],
    "summary": {
      "totalChecked": 10,
      "passed": 8,
      "failed": 2,
      "warnings": 0
    }
  }
}
```

---

## 7. 前端状态管理

系统使用 Pinia 进行状态管理，主要 Store 包括：

| Store | 文件 | 职责 |
|-------|------|------|
| `useAuthStore` | `stores/auth.ts` | 用户认证状态、Token 管理、登录/注册/登出 |
| `useFormulaStore` | `stores/formula.ts` | 配方 CRUD、配方描述解析（`parseDescription`） |
| `useMaterialStore` | `stores/material.ts` | 原料 CRUD |
| `useSalesmanStore` | `stores/salesman.ts` | 业务员 CRUD |
| `useVersionStore` | `stores/version.ts` | 版本列表、版本对比 |
| `useExportStore` | `stores/export.ts` | 导出任务、模板管理 |
| `useNutritionStore` | `stores/nutrition.ts` | 营养计算、标准管理 |
| `usePaginationStore` | `stores/pagination.ts` | 通用分页状态 |

---

## 8. 错误处理

### 8.1 后端错误码

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 操作成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误或业务规则阻止（如：原料被配方引用） |
| 401 | 未认证或 Token 无效/过期 |
| 404 | 资源不存在 |
| 409 | 资源冲突（唯一约束违反：用户名、原料编码、业务员工号等） |
| 410 | 资源已过期或不可用（分享链接过期/下载达上限） |
| 500 | 服务器内部错误 |

### 8.2 前端错误处理

- API 请求失败时通过 TDesign `MessagePlugin.error()` 显示错误提示
- 路由守卫自动拦截未认证访问，跳转至登录页
- 表单验证失败在输入框下方显示错误信息

---

## 9. 数据隔离规则

| 数据模块 | 普通用户 | 管理员 |
|---------|---------|--------|
| 配方 | 仅查看 `created_by = 自己` 的配方 | 可查看所有配方 |
| 原料 | 仅查看 `created_by = 自己` 的原料 | 可查看所有原料 |
| 业务员 | 可查看全部 | 可查看全部 |
| 版本 | 对自己的配方进行版本操作 | 可操作所有配方的版本 |
| 导出任务 | 仅查看 `created_by = 自己` 的任务 | 可查看所有任务 |
