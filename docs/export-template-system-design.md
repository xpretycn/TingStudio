# 导出模板动态渲染功能 — 技术方案

> 版本: v1.0 | 日期: 2026-06-01 | 状态: 待确认后实施

---

## 一、背景与目标

### 1.1 当前问题

TingStudio 的配方/原料/报告导出功能中，**导出模板下拉框已存在但未生效**。无论选择哪个模板，导出结果完全相同。

**根本原因**：`templateId` 虽然从前端传递到后端并存储在 `export_jobs` 表中，但**从未传递给 PDF/Excel 导出引擎**，导致所有模板输出统一内容。

### 1.2 目标

| 目标 | 说明 |
|------|------|
| **动态渲染** | 根据所选模板的 `selectedFields` 配置，动态决定导出内容包含哪些区块/字段 |
| **Admin 管理** | 提供完整的模板 CRUD + 复制功能 |
| **三级覆盖** | 同时支持配方、原料、报告三类数据的模板化导出 |
| **字段级粒度** | 支持到单个字段级别的选择（非仅区块级别） |

---

## 二、整体架构

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   前端选择    │────▶│  后端接收     │────▶│  字段注册表解析    │
│  templateId  │     │  读取配置     │     │  selectedFields  │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                          ┌──────────────────────────┼──────────────────────────┐
                          ▼                          ▼                          ▼
                   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
                   │ PDF 引擎     │           │ Excel 引擎   │           │ (未来扩展)   │
                   │ 按字段渲染   │           │ 按字段渲染   │           │             │
                   └─────────────┘           └─────────────┘           └─────────────┘
```

**数据流**：

```
用户点击「开始导出」
  → 前端发送 { formulaIds, exportType, templateId }
  → 后端 createJob() 接收
  → 如果 templateId 非空 → 查询 export_templates 表获取 format_config_json
  → 将 format_config_json 作为 templateConfig 传给 executeFormulaExport()
  → executeFormulaExport() 将 templateConfig 传给 exportFormulaToPdf/Excel()
  → 导出引擎根据 selectedFields 决定渲染哪些内容
  → 返回 buffer
```

---

## 三、数据库设计

### 3.1 现有表结构（无需修改）

```sql
-- 已有表，结构完整
CREATE TABLE IF NOT EXISTS export_templates (
  template_id   TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT NULL,
  category      TEXT NOT NULL CHECK(category IN ('formula', 'material', 'weekly-report', 'monthly-report')),
  type          TEXT NOT NULL CHECK(type IN ('pdf', 'excel')),
  format_config_json  TEXT NOT NULL,   -- ← 核心：JSON 格式的模板配置
  is_default     INTEGER NOT NULL DEFAULT 0,
  created_by    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2 format_config_json 结构（需标准化）

```json
{
  "selectedFields": [
    "name", "code", "salesmanName", "finishedWeight",
    "materialList", "priceInfo",
    "nutritionTable", "nrvTable",
    "usageNotes"
  ],
  "requiredFields": ["name"],
  "exportFormat": "pdf",
  "orientation": "portrait",
  "pageSize": "A4",
  "fontSize": 10,
  "includeHeader": true,
  "includeFooter": true,
  "customHeader": "",
  "customFooter": ""
}
```

---

## 四、字段注册表机制

### 4.1 新建文件：`backend/src/utils/exportFieldRegistry.ts`

中心化定义所有可导出字段，供模板编辑器和导出引擎共同使用。

#### 4.1.1 配方字段 (formula)

| 分组 | 字段 key | 显示名称 | 说明 |
|------|----------|---------|------|
| **basic** | `name` | 配方名称 | 必填 |
| | `code` | 配方编码 | 唯一标识 |
| | `salesmanName` | 业务员 | 创建人姓名 |
| | `salesmanPhone` | 业务员电话 | 联系方式 |
| | `customerName` | 客户名称 | 关联客户 |
| | `finishedWeight` | 成品重量(g) | 数值 |
| | `version` | 版本号 | V1.0 等 |
| | `versionReason` | 版本说明 | 变更原因 |
| | `createdAt` | 创建时间 | ISO 格式 |
| | `updatedAt` | 更新时间 | ISO 格式 |
| | `createdBy` | 创建人 | 用户名 |
| | `description` | 备注 | 自由文本 |
| | `preparationMethod` | 制法 | 制作方法 |
| **materials** | `materialList` | 原料清单表格 | 包含序号/名称/数量/类型/基价/调整价/状态 |
| **price** | `priceInfo` | 报价信息区域 | 原料成本+包装费+其他费+利润+总价 |
| **nutrition** | `nutritionTable` | 营养数据表 | 每原料的蛋白质/脂肪/碳水/钠/热量/纤维 |
| | `nrvTable` | 营养成分表(NRV) | 项目/每100g/单位/NRV%/0界限值/允许误差 |
| **footer** | `usageNotes` | 使用说明 | 5 条固定说明文字 |

#### 4.1.2 原料字段 (material)

| 分组 | 字段 key | 显示名称 | 说明 |
|------|----------|---------|------|
| **basic** | `name` | 原料名称 | 必填 |
| | `code` | 原料编码 | 唯一标识 |
| | `materialType` | 类型 | 药材/辅料 |
| | `spec` | 规格 | 规格描述 |
| | `unit` | 单位 | g/kg/ml 等 |
| **stock** | `stockQuantity` | 库存数量 | 当前库存 |
| | `supplierName` | 供应商 | 来源 |
| | `unitPrice` | 单价(元) | 价格 |
| | `stockStatus` | 库存状态 | 正常/不足/缺货 |
| **nutrition** | `nutrition` | 营养数据 | 蛋白质/脂肪/碳水/钠/能量/纤维 |

#### 4.1.3 报告字段 (report)

| 分组 | 字段 key | 显示名称 | 说明 |
|------|----------|---------|------|
| **basic** | `periodRange` | 统计周期 | 开始-结束日期 |
| | `generatedAt` | 生成时间 | 报告创建时间 |
| | `generatedBy` | 生成人 | 操作者 |
| **stats** | `newFormulasCount` | 新增配方数 | 本期新增 |
| | `newMaterialsCount` | 新增原料数 | 本期新增 |
| | `exportCount` | 导出次数 | 本期导出总量 |
| | `topFormulas` | 热门配方 TOP5 | 排行榜 |
| | `salesmanStats` | 业务员统计 | 各业务员数据汇总 |
| | `dataCutoffTime` | 数据截止时间 | 统计截止点 |

### 4.2 TypeScript 接口定义

```typescript
export interface ExportFieldDef {
  key: string;
  label: string;
  group: string;          // 分组名，用于 UI 分组展示
  groupName: string;      // 分组显示名
  category: 'formula' | 'material' | 'weekly-report' | 'monthly-report';
  defaultSelected?: boolean;  // 是否默认选中
  dependsOn?: string[];   // 依赖的其他字段（如 priceInfo 依赖 materialList）
}

export interface TemplateConfig {
  selectedFields: string[];
  requiredFields: string[];
  exportFormat: 'pdf' | 'excel';
  orientation: 'portrait' | 'landscape';
  pageSize: string;
  fontSize: number;
  includeHeader: boolean;
  includeFooter: boolean;
}
```

---

## 五、Admin 模板管理功能

### 5.1 入口位置

在 **导出管理中心** (`ExportCenter.vue`) 新增第四个 Tab：「**模板管理**」

路径：`前端路由 /system/export-center` → Tab 切换

### 5.2 模板列表 UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  [导出任务] [分享管理] [导出配置] [模板管理] ◄── 新增 Tab            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [+ 新建模板]                    [🔍 搜索模板...]                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 名称          │ 类别  │ 格式 │ 字段数 │ 默认 │ 操作         │   │
│  ├───────────────┼───────┼──────┼───────┼──────┼──────────────┤   │
│  │ ⭐ 标准配方PDF │ 配方  │ PDF  │ 16    │ ★   │ ✏️ 📋 🗑️     │   │
│  │ 生产配方Excel │ 配方  │ XLSX │ 12    │ —   │ ✏️ 📋 🗑️     │   │
│  │ 营养标签PDF   │ 配方  │ PDF  │ 8     │ —   │ ✏️ 📋 🗑️     │   │
│  │ 出库单模板    │ 配方  │ PDF  │ 6     │ —   │ ✏️ 📋 🗑️     │   │
│  │ 送货单模板    │ 配方  │ PDF  │ 10    │ —   │ ✏️ 📋 🗑️     │   │
│  │ 发票模板      │ 配方  │ PDF  │ 14    │ —   │ ✏️ 📋 🗑️     │   │
│  │ 客户信息模板  │ 配方  │ XLSX │ 5     │ —   │ ✏️ 📋 🗑️     │   │
│  │ 原料清单Excel │ 原料  │ XLSX │ 9     │ ★   │ ✏️ 📋 🗑️     │   │
│  │ 库存管理模板  │ 原料  │ XLSX │ 7     │ —   │ ✏️ 📋 🗑️     │   │
│  │ 质检报告模板  │ 配方  │ PDF  │ 6     │ —   │ ✏️ 📋 🗑️     │   │
│  │ 周报导出Excel │ 报告  │ XLSX │ 9     │ ★   │ ✏️ 📋 🗑️     │   │
│  │ 月报导出Excel │ 报告  │ XLSX │ 9     │ ★   │ ✏️ 📋 🗑️     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  图例: ★ = 默认模板   ✏️ = 编辑   📋 = 复制   🗑️ = 删除              │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 模板编辑弹窗

```
┌───────────────────────────────────────────────────────────────┐
│  编辑导出模板                                         [×]    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  【基本信息】                                                  │
│  ┌──────────────────┐  ┌────────────────────────────────┐     │
│  │ 模板名称 *        │  │ 分析报告模板                      │     │
│  └──────────────────┘  └────────────────────────────────┘     │
│  ┌──────────────────┐  ┌────────┐  ┌────────┐               │
│  │ 描述              │  │ 配方  ▼│  │ PDF  ▼ │               │
│  └──────────────────┘  └────────┘  └────────┘               │
│                                                               │
│  【选择导出内容】— 按 Ctrl+A 全选 / Ctrl+D 取消全选            │
│                                                               │
│  ▼ 基本信息 (9项)                                             │
│  ┌─┬─────────────────────────────────────────────────────┐   │
│  │☑│ 配方名称        ☑│ 配方编码       ☑│ 业务员          │   │
│  │☐│ 业务员电话      ☑│ 客户名称       ☐│ 成品重量        │   │
│  │☐│ 版本号          ☐│ 版本说明       ☑│ 创建时间        │   │
│  │☐│ 更新时间        ☐│ 创建人         ☐│ 备注说明        │   │
│  │☐│ 制法                                                │   │
│  └─┴─────────────────────────────────────────────────────┘   │
│                                                               │
│  ▼ 原料清单 (1项)                                              │
│  ┌─┬─────────────────────────────────────────────────────┐   │
│  │☑│ 原料清单表格（含序号/名称/数量/类型/基价/调整价/状态）│   │
│  └─┴─────────────────────────────────────────────────────┘   │
│                                                               │
│  ▼ 报价信息 (1项)                                              │
│  ┌─┬─────────────────────────────────────────────────────┐   │
│  │☑│ 报价信息（原料总成本+包装费+其他费+利润+总价）        │   │
│  └─┴─────────────────────────────────────────────────────┘   │
│                                                               │
│  ▼ 营养数据 (2项)                                              │
│  ┌─┬─────────────────────────────────────────────────────┐   │
│  │☑│ 营养数据表（各原料的蛋白质/脂肪/碳水/钠/热量/纤维）   │   │
│  │☑│ 营养成分表 NRV%（项目/每100g/NRV%/0界限值/误差范围）│   │
│  └─┴─────────────────────────────────────────────────────┘   │
│                                                               │
│  ▼ 页脚 (1项)                                                 │
│  ┌─┬─────────────────────────────────────────────────────┐   │
│  │☑│ 使用说明（5条标准说明）                               │   │
│  └─┴─────────────────────────────────────────────────────┘   │
│                                                               │
│  【格式设置】                                                  │
│  页面方向: [纵向 ▼]   纸张大小: [A4 ▼]                       │
│  正文字号: [10 ▼]     表头字号: [9 ▼]                         │
│  显示页眉:  [☑ 是]     显示页脚:  [☑ 是]                       │
│                                                               │
│                        [取消]  [保存为副本]  [保存模板]         │
└───────────────────────────────────────────────────────────────┘
```

### 5.4 操作功能详情

| 功能 | 触发方式 | 说明 |
|------|---------|------|
| **新建** | 点击「+ 新建模板」 | 弹窗，表单为空，预选默认字段 |
| **编辑** | 点击 ✏️ 图标 | 弹窗，加载现有配置 |
| **复制** | 点击 📋 图标 | 弹窗，加载源模板配置，名称自动加" (副本)" |
| **删除** | 点击 🗑️ 图标 | 二次确认弹窗，不可删除默认模板 |
| **设为默认** | 点击 ★ 列或操作菜单 | 同类别其他模板自动取消默认 |
| **预览** | 双击模板行 | 用测试数据生成预览（可选，后续迭代） |

### 5.5 权限控制

| 操作 | admin | formulist |
|------|-------|-----------|
| 查看模板列表 | ✅ | ✅（只读） |
| 选择模板导出 | ✅ | ✅ |
| 新建模板 | ✅ | ❌（隐藏新建按钮） |
| 编辑/删除/复制 | ✅ | ❌（隐藏操作列） |
| 设为默认 | ✅ | ❌ |

---

## 六、后端改造细节

### 6.1 文件改动清单

| 序号 | 文件 | 改动类型 | 说明 |
|------|------|---------|------|
| 1 | `backend/src/utils/exportFieldRegistry.ts` | **新建** | 字段注册表 |
| 2 | `backend/src/utils/formulaPdfExporter.ts` | **修改** | 接受 TemplateConfig 参数 |
| 3 | `backend/src/utils/formulaExporter.ts` | **修改** | 接受 TemplateConfig 参数 |
| 4 | `backend/src/services/exportService.ts` | **修改** | createJob 中读取并传递模板配置 |
| 5 | `frontend/src/views/system/ExportCenter.vue` | **修改** | 新增模板管理 Tab |
| 6 | `backend/src/scripts/seedData.ts` | **修改** | 更新预置模板数据 |

### 6.2 exportService.ts 改造

**当前代码问题位置** (`createJob` 函数，约 L484-L515):

```typescript
// 当前：templateId 未被使用
case "formula": {
  const result = await executeFormulaExport(ids[0], undefined, exportType);
  // ↑ 缺少 templateConfig 参数
}
```

**改造后**:

```typescript
// 1. 如果传了 templateId，从数据库读取配置
let templateConfig: TemplateConfig | undefined = undefined;
if (data.templateId) {
  const [tplRows] = query(
    "SELECT * FROM export_templates WHERE template_id = ?",
    [data.templateId]
  );
  if (tplRows.length > 0) {
    templateConfig = safeJsonParse<TemplateConfig>(
      tplRows[0].format_config_json,
      null
    );
  }
}

// 2. 传递给执行函数
case "formula": {
  const result = await executeFormulaExport(
    ids[0],
    undefined,
    exportType,
    templateConfig  // ← 新增
  );
  // ...
}
```

### 6.3 PDF 导出器接口改造

**当前签名**:
```typescript
export async function exportFormulaToPdf(
  formulaId: string,
  versionId?: string,
): Promise<{ buffer: Buffer; fileName: string }>
```

**改造后签名**:
```typescript
export async function exportFormulaToPdf(
  formulaId: string,
  versionId?: string,
  templateConfig?: TemplateConfig,  // ← 新增
): Promise<{ buffer: Buffer; fileName: string }>
```

**内部渲染逻辑改造**:

```typescript
// 根据 selectedFields 决定渲染哪些区块
const fields = templateConfig?.selectedFields || DEFAULT_FIELDS;

// 基本信息
if (fields.includes('name')) { renderBasicInfo(doc, y); }

// 原料清单表格
if (fields.includes('materialList')) { renderMaterialTable(doc, y); }

// 报价信息
if (fields.includes('priceInfo')) { renderPriceSection(doc, y); }

// 营养数据表
if (fields.includes('nutritionTable')) { renderNutritionTable(doc, y); }

// NRV 表
if (fields.includes('nrvTable')) { renderNrvTable(doc, y); }

// 使用说明
if (fields.includes('usageNotes')) { renderUsageNotes(doc, y); }
```

### 6.4 Excel 导出器同理改造

与 PDF 导出器相同的接口和逻辑改造。

---

## 七、预置模板（Seed Data）

使用**同一套标准模板引擎**，通过不同 `selectedFields` 组合实现差异化输出。

| # | 模板名 | 类别 | 格式 | 默认 | selectedFields |
|---|--------|------|------|------|-----------------|
| 1 | 标准配方PDF | formula | pdf | ✅ | 全部 16 个字段 |
| 2 | 生产配方Excel | formula | excel | ✅ | basic + materials + price |
| 3 | 营养标签PDF | formula | pdf | — | name + finishedWeight + nrvTable + usageNotes |
| 4 | 出库单模板 | formula | pdf/excel | — | name + code + materialList(简化) |
| 5 | 送货单模板 | formula | pdf/excel | — | customerName + name + materialList + priceInfo |
| 6 | 发票模板 | formula | pdf/excel | — | customerName + name + materialList + priceInfo(完整) |
| 7 | 客户信息模板 | formula | excel | — | customerName + salesmanName + salesmanPhone |
| 8 | 原料清单Excel | material | excel | ✅ | material 全部字段 |
| 9 | 库存管理模板 | material | excel | — | basic + stock 字段 |
| 10 | 质检报告模板 | formula | pdf | — | name + nutritionTable + nrvTable |
| 11 | 周报导出Excel | report | excel | ✅ | report 全部字段 |
| 12 | 月报导出Excel | report | excel | ✅ | report 全部字段 |

---

## 八、API 接口（已有，无需新增）

以下接口已在 `backend/src/routes/exports.ts` 中注册，直接复用：

| 方法 | 路径 | 功能 | 对应 Controller |
|------|------|------|-----------------|
| GET | `/api/exports/templates` | 获取模板列表 | getExportTemplates |
| POST | `/api/exports/templates` | 创建模板 | createExportTemplate |
| PUT | `/api/exports/templates/:id` | 更新模板 | updateExportTemplate |
| DELETE | `/api/exports/templates/:id` | 删除模板 | deleteExportTemplate |
| POST | `/api/exports/jobs` | 创建导出任务 | createJob |

**前端 API 层** (`frontend/src/api/export.ts`) 也已有对应封装。

---

## 九、实施步骤

### Phase 1：基础设施（预计工作量：中等）

| 步骤 | 内容 | 文件 |
|------|------|------|
| 1.1 | 新建字段注册表 `exportFieldRegistry.ts`，定义三类全部可导出字段 | backend/src/utils/ |
| 1.2 | 定义 `ExportFieldDef` 和 `TemplateConfig` TypeScript 接口 | 同上 |
| 1.3 | 导出字段枚举 API（供前端编辑器使用） | exportController + routes |

### Phase 2：后端引擎改造（预计工作量：大）

| 步骤 | 内容 | 文件 |
|------|------|------|
| 2.1 | 改造 `exportFormulaToPdf` 签名，接受 `templateConfig` | formulaPdfExporter.ts |
| 2.2 | 内部按 `selectedFields` 条件渲染各区块 | 同上 |
| 2.3 | 改造 `exportFormulaToExcel` 同上 | formulaExporter.ts |
| 2.4 | 改造 `executeFormulaExport` 透传参数 | exportService.ts |
| 2.5 | 改造 `createJob` 读取模板配置并传递 | exportService.ts |

### Phase 3：前端 Admin 管理（预计工作量：大）

| 步骤 | 内容 | 文件 |
|------|------|------|
| 3.1 | ExportCenter.vue 新增「模板管理」Tab | ExportCenter.vue |
| 3.2 | 模板列表表格（含筛选/搜索） | 同上 |
| 3.3 | 模板编辑弹窗（字段多选树/列表） | 同上 |
| 3.4 | 新建/编辑/复制/删除/设为默认操作 | 同上 |
| 3.5 | 权限控制（admin 才显示编辑按钮） | 同上 |

### Phase 4：数据初始化（预计工作量：小）

| 步骤 | 内容 | 文件 |
|------|------|------|
| 4.1 | 更新 seedData.ts，写入 12 个预置模板 | seedData.ts |
| 4.2 | 迁移脚本：更新现有模板的 format_config_json | migrations/ |

### Phase 5：测试验证（预计工作量：中）

| 步骤 | 内容 |
|------|------|
| 5.1 | 测试每个预置模板的导出结果是否符合预期 |
| 5.2 | 测试自定义模板（选择部分字段）的导出结果 |
| 5.3 | 测试复制模板功能 |
| 5.4 | 测试权限控制（formulist 无法编辑模板） |
| 5.5 | 边界测试：不选任何字段、只选必填字段等 |

---

## 十、风险与注意事项

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| **依赖字段缺失** | 如选了 priceInfo 但没选 materialList，报价无数据 | 前端联动：选中父级自动选中依赖子级；或后端兜底渲染空区块 |
| **旧模板兼容** | 现有模板的 format_config_json 可能不符合新结构 | 迁移脚本统一升级；读取时做 fallback |
| **性能** | 每次导出都查询模板表 | 模板配置可缓存；或前端一次性传入完整配置 |
| **Excel 列宽** | 不同字段组合可能导致列宽不合理 | 导出器内部根据选中字段动态计算最优列宽 |

---

## 十一、验收标准

- [ ] Admin 可在「模板管理」Tab 查看/新建/编辑/复制/删除模板
- [ ] 选择不同模板导出时，输出内容与模板的 `selectedFields` 一致
- [ ] 未选择模板时，使用默认模板（is_default=1）
- [ ] formulist 只能查看和选择模板，无法编辑
- [ ] 复制模板功能正常工作（名称带" (副本)"后缀）
- [ ] 12 个预置模板均可正常工作
- [ ] PDF 和 Excel 格式均支持动态字段渲染

---

## 附录 A：字段依赖关系图

```
基本信息 (basic)
  ├── 无依赖，始终可选

原料清单 (materials)
  ├── 无依赖，始终可选

报价信息 (price)
  └── dependsOn: [materialList]
      └── 若未选 materialList，则 priceInfo 置灰不可选 或 自动联选

营养数据表 (nutritionTable)
  └── dependsOn: [materialList]
      └── 同上

营养成分表 (nrvTable)
  └── dependsOn: [nutritionTable]
      └── 若未选 nutritionTable，nrvTable 置灰 或 自动联选

使用说明 (usageNotes)
  └── 无依赖，始终可选
```

## 附录 B：文件变更汇总

```
backend/src/
├── utils/
│   ├── exportFieldRegistry.ts      ← 新建：字段注册表
│   ├── formulaPdfExporter.ts       ← 修改：接受 templateConfig
│   └── formulaExporter.ts          ← 修改：接受 templateConfig
├── services/
│   └── exportService.ts            ← 修改：createJob 传递模板配置
├── scripts/
│   └── seedData.ts                 ← 修改：更新预置模板
└── controllers/
    └── exportController.ts         ← 修改：可能需要新增字段枚举接口

frontend/src/views/system/
└── ExportCenter.vue                ← 修改：新增模板管理 Tab
```
