# TingStudio v2.0 开发计划

> 更新日期：2026-03-31（阶段十已完成）

---

## 一、项目现状

### 1.1 已完成模块

| 模块 | 后端 API | 前端页面 | Store | 完成度 |
|------|---------|---------|-------|--------|
| 认证（登录/注册） | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 配方管理 CRUD | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 原料管理 CRUD | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 业务员管理 CRUD | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 版本管理 | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 导出中心 | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 营养分析 | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 营养标准 | ✅ 完整 | ✅ 完整 | ✅ | 100% |
| 首页/主布局 | - | ✅ 完整 | - | 100% |
| 工具箱 | - | ⚠️ 占位页 | - | 10% |

### 1.2 已完成的基础设施

- [x] 数据库 13 张表（SQLite + WAL 模式）
- [x] 种子数据脚本（seedData.ts）
- [x] JWT 认证中间件 + 角色权限控制
- [x] 前端路由守卫
- [x] TDesign UI 组件库集成
- [x] 真实原料营养数据已导入
- [x] 营养数据 Excel 导入工具
- [x] 首页左右分栏布局 + 导航系统
- [x] 全局搜索、分页、新增按钮统一工具栏
- [x] 用户头像下拉菜单、锁屏功能
- [x] 通用骨架屏组件（PageSkeleton）
- [x] 全局响应式断点变量
- [x] 统一设计令牌体系（design-tokens.scss，250+ 变量）
- [x] 全局 TDesign 样式覆盖提取（main.scss）

---

## 二、已完成阶段

### ✅ 阶段一：数据库与后端重构（v2.1.0）
- 移除客户管理模块，配方关联改为业务员
- 数据库从 17 张表精简为 13 张表
- 用户角色精简为 admin / formulist

### ✅ 阶段二：核心业务功能（v2.2.0）
- 配方成品重量 + 含量比系数
- 营养成分计算重构
- 能量公式实现

### ✅ 阶段三：版本管理与数据修复（v2.3.0）
- 配方列表展开行版本记录
- 种子数据 ID 关联修复
- 版本发布接口增强

### ✅ 阶段四：首页与 UI 优化（v2.4.0）
- header 布局重构（导航按钮、搜索工具栏、用户菜单）
- 按钮样式统一（粉色主题）
- 原料/业务员列表优化

### ✅ 阶段五：版本控制增强与数据一致性（v2.5.0）
- 辅料含量比系数字段与 ratio_factor 迁移
- 全字段变更记录（配方名/业务员/参数/描述/原料）
- 发布版本同步配方主表数据
- 升版原因校验与语义化版本名称
- 版本对比全字段可视化与动态列标题

### ✅ 阶段六：导出中心功能完善（v2.7.0）
- Excel 导出引擎（配方信息 + 原料清单 + 营养数据三个 Sheet）
- PDF 导出引擎（pdfkit 生成 A4 PDF，含表格和合计行）
- 导出任务同步执行 + 下载/重试功能
- 配方列表一键导出跳转（自动填充配方选择器）
- 分享管理完善（历史列表、复制链接、删除）
- 导出模板管理增强（编辑、删除）
- API 数据接口管理面板
- Excel 导入模板精简为两列 + 导入后校验修复
- 版本状态逻辑修复（状态显示、发布按钮、数据一致性自修复）

---

## 三、开发阶段

### ✅ 阶段七：营养分析功能增强（v2.8.0）

> 已完成，详见 [STAGE7_SUMMARY.md](./STAGE7_SUMMARY.md)

### 🔄 阶段八：用户体验优化与代码质量提升（v2.9.0）

> 详细规划见下方"待开发阶段"章节

### 阶段七：营养分析功能增强（P1）

> 预估工时：1.5-2 天 | 版本号：v2.8.0

#### 7.1 原料营养数据编辑增强（0.5天）

**目标**：将 25+ 营养字段按类别分组，提升录入体验

| 子任务 | 技术方案 | 涉及文件 |
|--------|----------|----------|
| 7.1.1 营养字段分组展示 | 使用 t-collapse 折叠面板，分为基础营养/矿物质/维生素/其他四组 | `MaterialForm.vue` |
| 7.1.2 营养数据来源管理 | 新增 confidence 字段记录数据可信度（high/medium/low） | `init.sql`, `MaterialDetail.vue` |
| 7.1.3 快捷操作 | 添加一键清空、批量导入功能 | `MaterialForm.vue` |

**数据库变更**：
```sql
ALTER TABLE material_nutrition ADD COLUMN `confidence` TEXT DEFAULT 'medium'
  CHECK(confidence IN ('high', 'medium', 'low'));
```

#### 7.2 营养计算结果可视化（0.5天）

**目标**：将表格展示改为卡片式布局，直观展示各项营养素

| 子任务 | 技术方案 | 涉及文件 |
|--------|----------|----------|
| 7.2.1 核心营养素卡片 | 使用 t-card + t-progress 展示能量/蛋白质/脂肪/碳水/钠五大核心指标 | `NutritionAnalysis.vue` |
| 7.2.2 NRV 占比进度条 | 每个营养素显示占营养素参考值百分比，进度条颜色随占比变化 | `NutritionAnalysis.vue` |
| 7.2.3 原料贡献明细 | 展示各原料对营养总量的贡献占比，缺少数据的原料高亮提醒 | `NutritionAnalysis.vue` |

**核心营养素展示配置**：
| 营养素 | 单位 | NRV 参考值 | 进度条阈值 |
|--------|------|-----------|-----------|
| 能量 | kJ | 8400 | 绿<80%, 黄80-120%, 红>120% |
| 蛋白质 | g | 60 | 绿≥80%, 黄50-80%, 红<50% |
| 脂肪 | g | 60 | 绿<80%, 黄80-120%, 红>120% |
| 碳水化合物 | g | 300 | 绿≥80%, 黄50-80%, 红<50% |
| 钠 | mg | 2000 | 绿<80%, 黄80-120%, 红>120% |

#### 7.3 合规检查结果优化（0.3天）

**目标**：将合规检查结果分为三级，配合视觉反馈和操作建议

| 子任务 | 技术方案 | 涉及文件 |
|--------|----------|----------|
| 7.3.1 检查结果分级 | pass(达标)/warning(警告)/fail(超标) 三级状态，配合颜色标签 | `nutritionController.ts` |
| 7.3.2 建议列表优化 | 返回结构化建议，包含 type/priority/title/description/actionable/suggestedActions | `nutritionController.ts` |
| 7.3.3 汇总统计 | 顶部展示达标/警告/超标数量汇总 | `NutritionAnalysis.vue` |

**UI 设计规范**：
```
┌─────────────────────────────────────────────────────────────┐
│  合规检查结果                                                │
├─────────────────────────────────────────────────────────────┤
│  🟢 达标 (3项)  🟡 警告 (1项)  🔴 超标 (0项)                │
├─────────────────────────────────────────────────────────────┤
│  营养成分    实际值    标准范围      状态      操作建议       │
│  能量        1520kJ   1200-1800    🟢 达标   -              │
│  蛋白质      8.5g     ≥10g         🔴 不足   建议增加蛋白源  │
└─────────────────────────────────────────────────────────────┘
```

#### 7.4 预置营养标准（0.3天）

**目标**：预置 6 类人群的基础营养标准

| 子任务 | 技术方案 | 涉及文件 |
|--------|----------|----------|
| 7.4.1 国标数据准备 | 整理 GB 10765/10767/28050 等国家标准数据 | `seedNutritionProfiles.ts` |
| 7.4.2 标准管理增强 | 新增编辑/删除 API，预置标准标识不可删除 | `nutritionController.ts`, `nutrition.ts` |
| 7.4.3 前端 CRUD 完善 | 营养标准编辑弹窗、删除确认 | `NutritionProfiles.vue` |

**预置营养标准清单**：
| 标准名称 | 适用类别 | 数据来源 |
|----------|----------|----------|
| GB 10765-2021 婴儿配方食品 | infant | 国标 |
| GB 10767-2021 较大婴儿配方食品 | child | 国标 |
| GB 28050-2011 成人营养标签 | adult | 国标 |
| 老年人营养标准 | elderly | 中国居民膳食指南 |
| 孕妇营养标准 | pregnant | 中国居民膳食指南 |
| 特殊医学用途配方食品 | special | GB 29922 |

**数据库变更**：
```sql
ALTER TABLE nutrition_profiles ADD COLUMN `is_preset` INTEGER DEFAULT 0;
```

**API 变更**：
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/nutrition/profiles/:id` | PUT | 更新营养标准 |
| `/api/nutrition/profiles/:id` | DELETE | 删除营养标准（预置标准不可删） |

#### 时间安排

| 时间 | 任务 |
|------|------|
| Day 1 上午 | 任务 7.1 原料营养数据编辑增强 |
| Day 1 下午 | 任务 7.2 营养计算结果可视化 |
| Day 2 上午 | 任务 7.3 合规检查结果优化 + 任务 7.4 预置营养标准 |
| Day 2 下午 | 联调测试 + 文档更新 |

#### 验收标准

- [ ] 原料营养编辑支持分组折叠，录入效率提升
- [ ] 营养计算结果以卡片 + 进度条形式直观展示
- [ ] 合规检查结果支持达标/警告/超标三级状态
- [ ] 预置 6 类人群的基础营养标准
- [ ] 营养标准支持完整 CRUD 操作
- [ ] 营养计算响应时间 < 500ms
- [ ] 页面首屏加载时间 < 1.5s

### 阶段八：用户体验优化与代码质量提升（P1）— ✅ 已完成

> 版本号：v2.9.0 | 完成日期：2026-03-31

#### 现状分析

| 维度 | 当前状态 | 问题 |
|------|----------|------|
| 加载状态 | 仅 `MaterialDetail.vue` 使用 `t-loading`，其余页面依赖 TDesign 表格内置 loading | 页面初始渲染时无骨架屏，首屏白屏闪烁 |
| 空状态 | 所有表格均有 `<t-empty>` 占位 | 缺少新用户引导，空状态无操作建议按钮 |
| 表单验证 | 4 个表单均配置 `rules`，但仅 Login/Register 设置了 `trigger: 'blur'` | 配方/原料/业务员表单仅在提交时校验，无实时反馈 |
| 响应式 | `Home.vue` 有 1024px/768px 断点，Login/Register 有适配 | 列表页、表单页、详情页均无移动端适配 |
| 代码质量 | 存在多处 `res.data` 重复解包 Bug | 已在阶段七后修复 8 处拦截器相关 Bug |

---

#### 8.1 加载状态优化（0.5天）

**目标**：为所有页面级数据加载添加骨架屏，消除首屏白屏闪烁

##### 8.1.1 创建通用骨架屏组件（0.15天）

**技术方案**：基于 TDesign `t-skeleton` 封装通用骨架屏组件，支持多种布局模式

**组件接口设计**：
```typescript
// components/Skeleton/PageSkeleton.vue
interface Props {
  type: 'table' | 'form' | 'detail' | 'cards'  // 布局类型
  rows?: number    // 表格行数，默认 5
  columns?: number // 表格列数，默认 4
  showAvatar?: boolean  // 详情页是否显示头像区
  showActions?: boolean // 是否显示操作栏骨架
}
```

**布局模式**：
| type | 适用页面 | 骨架结构 |
|------|----------|----------|
| `table` | FormulaList, MaterialList, SalesmanList, VersionList, ExportCenter | 工具栏 + 表头 + N 行表格行 |
| `form` | FormulaForm, MaterialForm, SalesmanForm | 表单标题 + 分组表单项 |
| `detail` | FormulaDetail, MaterialDetail | 标题区 + 信息卡 + 标签页 |
| `cards` | NutritionAnalysis, RecentFormulas, NutritionProfiles | 卡片网格布局 |

**涉及文件**：
| 操作 | 文件 |
|------|------|
| 新建 | `components/Skeleton/PageSkeleton.vue` |

##### 8.1.2 页面集成骨架屏（0.2天）

**技术方案**：在各页面首次加载时展示骨架屏，数据加载完成后切换为真实内容

**实现模式**：
```vue
<template>
  <PageSkeleton v-if="!initialized" type="table" :rows="5" />
  <t-card v-else class="content-card" bordered>
    <t-table ... />
  </t-card>
</template>

<script setup>
const initialized = ref(false)

onMounted(async () => {
  await store.fetchData()
  initialized.value = true
})
</script>
```

**需集成的页面**：
| 页面 | 类型 | 文件 |
|------|------|------|
| 配方列表 | table | `FormulaList.vue` |
| 最近配方 | table | `RecentFormulas.vue` |
| 原料列表 | table | `MaterialList.vue` |
| 业务员列表 | table | `SalesmanList.vue` |
| 版本列表 | table | `VersionList.vue` |
| 导出中心 | table | `ExportCenter.vue` |
| 营养标准 | table | `NutritionProfiles.vue` |
| 营养分析 | cards | `NutritionAnalysis.vue` |

##### 8.1.3 细节页加载状态增强（0.15天）

**技术方案**：
- 配方详情页：展开行版本数据异步加载时显示骨架行
- 原料详情页：营养数据加载保留现有 `t-loading`，增加内容过渡动画
- 导出中心：下载中增加文件类型图标 + 进度提示
- 路由切换过渡：统一 `fade-slide` 动画已存在，确认所有 `<router-view>` 均使用

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `FormulaList.vue` | 展开行加载骨架 |
| `MaterialDetail.vue` | 营养区域过渡动画 |
| `ExportCenter.vue` | 下载状态增强 |
| `Home.vue` | 确认 router-view 过渡动画 |

---

#### 8.2 空状态与引导优化（0.4天）

**目标**：为关键空状态添加操作建议按钮，新用户首次登录展示引导流程

##### 8.2.1 空状态增强（0.2天）

**技术方案**：为各列表页的 `<t-empty>` 添加行动按钮（CTA），引导用户快速开始

**各页面空状态设计**：
| 页面 | 当前文案 | 增强 CTA |
|------|----------|----------|
| 配方列表 | "暂无配方数据" | "创建第一个配方" → 跳转创建页 |
| 最近配方 | 已有 CTA | 保留现有实现，样式统一 |
| 原料列表 | "暂无原料数据" | "录入原料" → 跳转创建页 |
| 业务员列表 | "暂无业务员数据" | "添加业务员" → 跳转创建页 |
| 版本列表 | "暂无版本数据" | "请先在配方管理中创建配方"（仅提示） |
| 导出任务 | "暂无导出任务" | "前往导出" → 切换到导出 Tab |
| 营养标准 | "暂无营养标准" | 已有系统预置数据，保持纯展示 |
| 营养分析 | "请选择一个配方进行营养分析" | "前往配方管理" → 跳转配方列表 |

**UI 规范**：
```vue
<t-empty description="暂无配方数据">
  <template #action>
    <t-button theme="primary" @click="router.push('/formulas/new')">
      <template #icon><t-icon name="add" /></template>
      创建第一个配方
    </t-button>
  </template>
</t-empty>
```

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `FormulaList.vue` | 空状态增加 CTA |
| `MaterialList.vue` | 空状态增加 CTA |
| `SalesmanList.vue` | 空状态增加 CTA |
| `VersionList.vue` | 空状态增加引导提示 |
| `ExportCenter.vue` | 导出任务空状态增加 CTA |
| `NutritionAnalysis.vue` | 空状态增加 CTA |

##### 8.2.2 新用户引导（0.2天）

**技术方案**：在侧边栏底部增加"快速开始"引导卡片，当用户无任何数据时显示

**引导卡片设计**：
```
┌──────────────────────────┐
│  🚀 快速开始              │
│  ─────────────────────── │
│  1. 录入原料库             │
│  2. 创建配方              │
│  3. 分析营养成分           │
│                          │
│  [开始引导 →]             │
└──────────────────────────┘
```

**实现逻辑**：
- 通过 store 检测用户是否为空数据状态（配方数=0 且原料数=0 且业务员数=0）
- 空数据时在侧边栏底部显示引导卡片
- 点击"开始引导"依次跳转：原料管理 → 配方管理 → 营养分析
- 使用 `localStorage` 记录引导步骤进度
- 用户关闭引导卡片后不再显示

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `Home.vue` | 侧边栏底部引导卡片 |
| `stores/app.ts` 或新建 | 用户引导状态管理 |

---

#### 8.3 表单验证增强（0.4天）

**目标**：所有表单支持实时校验，必填字段统一显示红色星号标识

##### 8.3.1 实时校验触发器统一（0.15天）

**技术方案**：为所有表单 rules 添加 `trigger: 'blur'` 实现实时校验

**当前问题**：配方表单、原料表单、业务员表单的 rules 未设置 `trigger`，TDesign 默认为 `change`，且部分字段需要 `blur` 才校验

**修改方案**：
| 表单 | 文件 | 改动 |
|------|------|------|
| 配方表单 | `FormulaForm.vue` | 所有 rules 添加 `trigger: 'blur'` |
| 原料表单 | `MaterialForm.vue` | 所有 rules 添加 `trigger: 'blur'` |
| 业务员表单 | `SalesmanForm.vue` | 所有 rules 添加 `trigger: 'blur'` |

**rules 示例（修改后）**：
```typescript
const rules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入配方名称', trigger: 'blur' },
    { min: 2, message: '配方名称至少2个字符', trigger: 'blur' },
  ],
  salesmanId: [{ required: true, message: '请选择所属业务员', trigger: 'change' }],
  finishedWeight: [
    { required: true, message: '请输入成品重量', trigger: 'blur' },
  ],
  ratioFactor: [
    { required: true, message: '请输入主料含量比系数', trigger: 'blur' },
    { validator: validateRatioFactor, message: '含量比系数范围 0.01-99.99', trigger: 'blur' },
  ],
  materials: [{ validator: validateMaterials, message: '请至少添加一种原料', trigger: 'change' }],
}
```

##### 8.3.2 全局必填标识样式（0.1天）

**技术方案**：在全局样式中统一定制 TDesign 表单必填星号颜色

```scss
// main.scss 新增
:::v-deep(.t-form-item__required-icon) {
  color: $danger-color;  // #E34D59 红色星号
}
```

##### 8.3.3 表单提交防抖 + 错误提示优化（0.15天）

**技术方案**：
- 提交按钮增加防抖（300ms），防止重复提交
- 校验失败时自动滚动到第一个错误字段（已有 `scroll-to-first-error`）
- 错误提示使用 `MessagePlugin.warning` 替代默认的内联提示（可选）

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `FormulaForm.vue` | rules trigger + 防抖 |
| `MaterialForm.vue` | rules trigger + 防抖 |
| `SalesmanForm.vue` | rules trigger + 防抖 |
| `assets/styles/main.scss` | 必填星号样式 |

---

#### 8.4 响应式适配（0.7天）

**目标**：列表页、表单页、详情页在平板（≤1024px）和移动端（≤768px）可用

##### 8.4.1 全局响应式断点统一（0.05天）

**技术方案**：在 `variables.scss` 中定义标准断点变量，全项目统一引用

```scss
// variables.scss 新增
$breakpoint-tablet: 1024px;
$breakpoint-mobile: 768px;
$breakpoint-small: 480px;
```

##### 8.4.2 列表页响应式适配（0.25天）

**技术方案**：表格在小屏幕上切换为卡片列表模式，或使用横向滚动

**适配方案**（两种方案选一）：

**方案 A（推荐）：表格横向滚动 + 列隐藏**
```vue
<t-table
  :columns="responsiveColumns"
  :scroll="{ type: 'virtual', maxHeight: 400 }"
  table-layout="auto"
  table-content-width="800px"
/>
```
- 移动端隐藏"描述/备注"等次要列
- 表格容器允许横向滚动
- 操作列固定右侧

**方案 B：小屏卡片模式**
- ≤768px 时将表格数据渲染为卡片列表
- 通过 CSS 媒体查询切换显示

**各列表页适配**：
| 页面 | 方案 | 移动端隐藏列 |
|------|------|-------------|
| `FormulaList.vue` | A | 隐藏 description 列 |
| `MaterialList.vue` | A | 隐藏 code 列 |
| `SalesmanList.vue` | A | 隐藏 phone/email 列 |
| `VersionList.vue` | A | 隐藏 description 列 |
| `NutritionProfiles.vue` | A | 隐藏 description 列 |

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `FormulaList.vue` | 响应式列配置 + 横向滚动 |
| `MaterialList.vue` | 响应式列配置 + 横向滚动 |
| `SalesmanList.vue` | 响应式列配置 + 横向滚动 |
| `VersionList.vue` | 响应式列配置 + 横向滚动 |
| `NutritionProfiles.vue` | 响应式列配置 + 横向滚动 |

##### 8.4.3 表单页响应式适配（0.2天）

**技术方案**：
- `label-width` 根据屏幕宽度自适应（100px → 80px → 顶部标签）
- 营养字段双列网格在小屏变为单列
- 操作按钮在小屏变为全宽堆叠

**实现要点**：
```scss
@media (max-width: $breakpoint-mobile) {
  .material-form, .formula-form, .salesman-form {
    :deep(.t-form) {
      .t-form-item__label {
        text-align: left;
        width: 100% !important;
        padding-bottom: 2px;
      }
      .t-form-item__controls {
        margin-left: 0 !important;
      }
    }
    // 营养字段单列
    .nutrition-grid {
      grid-template-columns: 1fr;
    }
  }
}
```

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `FormulaForm.vue` | 响应式表单布局 |
| `MaterialForm.vue` | 营养网格响应式（已部分实现） |
| `SalesmanForm.vue` | 响应式表单布局 |

##### 8.4.4 详情页响应式适配（0.1天）

**技术方案**：
- 配方详情页：标签页在小屏变为下拉切换
- 原料详情页：信息卡单列布局
- 导出中心：Tab 在小屏变为图标导航

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `FormulaDetail.vue` | 标签页响应式 |
| `MaterialDetail.vue` | 信息卡响应式 |
| `ExportCenter.vue` | Tab 响应式 |

##### 8.4.5 侧边栏移动端折叠（0.1天）

**技术方案**：
- 移动端侧边栏变为抽屉式（点击汉堡菜单展开）
- 顶部增加汉堡菜单按钮（仅移动端显示）
- 抽屉展开时覆盖内容区，带遮罩层

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `Home.vue` | 侧边栏抽屉模式 + 汉堡菜单按钮 |

---

#### 时间安排

| 时间 | 任务 | 产出 |
|------|------|------|
| Day 1 上午 | 8.1.1 通用骨架屏组件 + 8.1.2 页面集成 | `PageSkeleton.vue` + 8 个页面骨架屏 |
| Day 1 下午 | 8.2.1 空状态增强 + 8.2.2 新用户引导 | 6 个页面 CTA + 侧边栏引导卡片 |
| Day 2 上午 | 8.3.1 实时校验 + 8.3.2 必填标识 + 8.3.3 防抖 | 3 个表单验证增强 |
| Day 2 下午 | 8.4.2 列表页响应式 + 8.4.3 表单页响应式 | 5+3 个页面响应式 |
| Day 3 上午 | 8.4.4 详情页响应式 + 8.4.5 侧边栏折叠 + 8.1.3 细节优化 | 全页面响应式 |
| Day 3 下午 | 联调测试 + 回归测试 + 文档更新 | 阶段八完成 |

---

#### 验收标准

- [ ] 所有列表页首次加载展示骨架屏，数据加载后平滑过渡
- [ ] 所有空状态有操作建议按钮（CTA），新用户可一键开始
- [ ] 侧边栏空数据时显示引导卡片，引导流程可跳转
- [ ] 所有表单支持 `blur` 实时校验，必填字段显示红色星号
- [ ] 表单提交按钮有防抖，不会重复提交
- [ ] 列表页在 ≤768px 下可横向滚动查看所有列
- [ ] 表单页在 ≤768px 下标签顶部显示，字段全宽
- [ ] 侧边栏在移动端支持抽屉式展开/收起
- [ ] 页面切换过渡动画流畅，无白屏闪烁
- [ ] 全链路功能回归测试通过（配方/原料/业务员/版本/导出/营养）

---

#### 数据库变更

本阶段无数据库结构变更。

#### API 变更

本阶段无 API 变更。

#### 风险与注意事项

1. **骨架屏组件复用**：务必封装为通用组件，避免 8 个页面各自硬编码骨架结构
2. **响应式回归**：现有 Home.vue 的 1024px/768px 断点已生效，新增断点需注意与现有样式不冲突
3. **表单校验兼容**：添加 `trigger: 'blur'` 后需确认与 `scroll-to-first-error` 功能兼容
4. **性能**：骨架屏切换应避免额外的 DOM 操作开销

### 阶段九：测试、部署与交付（P2）— ✅ 已完成

> 版本号：v2.10.0 | 完成日期：2026-03-31

#### 9.1 构建验证
- ✅ 后端 TypeScript 编译检查通过（`tsc --noEmit`）
- ✅ 后端构建产物完整（`backend/dist/`，含 8 个控制器 + 中间件 + 路由 + 工具函数）
- ✅ 前端 TypeScript 类型检查通过（`vue-tsc --noEmit`）
- ✅ 前端 Vite 生产构建成功（`frontend/dist/`，含 26 个 JS + 20 个 CSS 文件）

#### 9.2 项目配置优化
- ✅ 根目录 `package.json` 新增统一管理脚本（dev/build/start/init-db/seed）
- ✅ 新增 `concurrently` 依赖，支持前后端同时启动
- ✅ 修正 `backend/.env.example` 模板（MySQL → SQLite 配置同步）

#### 9.3 文档更新
- ✅ README.md 更新至 v2.9，添加一键启动和生产部署说明
- ✅ README.md 脚本文档重构（根目录/后端/前端三层结构）
- ✅ DEVELOPMENT_PLAN.md 标记阶段九完成

#### 验收标准

- [x] 前后端 TypeScript 编译零错误
- [x] 前后端生产构建产物完整
- [x] 根目录统一脚本可用
- [x] 环境配置模板与实际一致
- [x] README 文档准确完整

---

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 9.1 | 前后端 TypeScript 编译检查 | `tsc --noEmit` + `vue-tsc --noEmit` 零错误 | ✅ |
| 9.2 | 生产构建验证 | 后端 `tsc` + 前端 `vite build` 产物完整 | ✅ |
| 9.3 | 根目录统一脚本 | `package.json` 新增 dev/build/start/init-db/seed | ✅ |
| 9.4 | 环境配置模板同步 | `.env.example` MySQL → SQLite | ✅ |
| 9.5 | README 文档更新 | 生产部署说明 + 脚本文档重构 | ✅ |

---

### 阶段十：设计令牌体系建立与色值统一（P0）— ✅ 已完成

> 版本号：v2.11.0 | 完成日期：2026-03-31

#### 10.1 设计令牌体系建立
- ✅ 新增 `design-tokens.scss`，定义 250+ 设计变量（品牌色/背景色/文字色/边框色/语义色/覆盖层/阴影/间距/圆角/动效/布局常量）
- ✅ 新增 `tokens.ts`，提供 JS 可导入的颜色常量（图表色/工具箱渐变/营养素渐变）
- ✅ 新增 `theme.css`，通过 CSS 变量覆盖 TDesign 全局主题
- ✅ Vite `additionalData` 配置 SCSS 全局注入，所有 .vue 文件可直接使用 token

#### 10.2 全局 TDesign 样式覆盖提取
- ✅ 从 Home.vue 提取 ~180 行 `:deep()` 样式到 `main.scss`
- ✅ 统一按钮/输入框/表格/分页/标签/弹窗/对话框等组件样式

#### 10.3 色值统一（5 个 Task）
- ✅ **Task 1-2**：列表页（FormulaList/MaterialList/SalesmanList/RecentFormulas/VersionList）rgba 硬编码 → token
- ✅ **Task 3**：其他页面（ExportCenter/NutritionProfiles/SalesmanDetail/MaterialDetail/VersionCompare）色值替换
- ✅ **Task 4**：表单/详情/工具页（FormulaDetail/FormulaForm/MaterialForm/SalesmanForm/Tools/PageSkeleton/NutritionAnalysis/AppLayout）色值替换
- ✅ **Task 5**：Home.vue（删除 15 个局部变量别名，90 处硬编码清零）+ Login.vue/Register.vue（删除局部变量，改用全局 token）

#### 验收标准

- [x] design-tokens.scss 包含完整的设计变量体系
- [x] views/ 目录下 CSS/JS 硬编码色值从 ~284 降至 < 50
- [x] Home.vue :deep 样式缩减 60%（提取到 main.scss）
- [x] Login.vue / Register.vue 中 $pink-* 改为引用全局 token
- [x] vite build 通过，linter 0 错误

---

## 四、注意事项

1. **营养数据字段**：当前营养数据仅含 5 个字段（能量、蛋白质、脂肪、碳水、钠），PRD 要求 25+ 字段，后续需补充维生素、矿物质等
2. **工具箱**：PRD 中标注为预留功能，低优先级
3. **前端部署**：EdgeOne Pages 已部署前端，后端 API 服务需单独部署
