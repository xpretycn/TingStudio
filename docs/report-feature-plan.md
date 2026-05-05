# TingStudio 周报与月报功能规划文档

> 版本: v1.0 | 日期: 2026-04-30 | 状态: 规划中

---

## 一、报告入口设计方案

### 1.1 方案对比

| 维度 | 方案A：独立报告页面 | 方案B：集成于现有配方页面 |
|------|---------------------|--------------------------|
| **路径** | `/reports` 独立路由 | 嵌入 `/formulas` 或 `/sales` 页面内 |
| **导航层级** | 侧边栏一级导航「报告中心」 | 配方/销量页面内的 Tab 或抽屉 |
| **权限控制** | 路由级 meta.role 控制 | 组件内 v-if 按角色显隐 |
| **扩展性** | 高，可独立迭代报告类型 | 低，受宿主页面布局约束 |
| **数据聚合** | 独立 Store，可聚合全业务数据 | 依赖宿主页面 Store，数据范围受限 |
| **用户体验** | 专注报告场景，无干扰 | 切换成本低，但页面信息密度大 |
| **历史报告** | 独立列表页，检索方便 | 需在宿主页面内嵌入列表，空间局促 |
| **开发成本** | 中等（新增路由+页面+Store） | 较低（复用现有组件） |

### 1.2 推荐方案：方案A — 独立报告页面

**推荐理由：**

1. **数据聚合需求**：周报/月报需要跨模块聚合配方、销量、业务员、营养等多维数据，独立页面可建立专用 Store 统一管理
2. **权限差异化**：admin 可查看全公司报告，formulist 仅查看个人报告，独立路由便于实现路由级权限守卫
3. **历史报告管理**：报告需要版本化存储和检索，独立页面可提供完整的报告列表、搜索、对比功能
4. **导出体验**：报告导出（PDF/Excel）是核心功能，独立页面可提供全屏预览和批量导出
5. **未来扩展**：季度报、年报、自定义报告等可自然扩展，不受宿主页面约束

### 1.3 页面路径与导航设计

```
/reports                    → 报告中心（报告列表+快捷入口）
/reports/weekly             → 周报详情（默认显示最新一期）
/reports/weekly/:id         → 历史周报详情
/reports/monthly            → 月报详情（默认显示最新一期）
/reports/monthly/:id        → 历史月报详情
/reports/generate           → 生成报告（选择类型+时间范围）
```

侧边栏导航新增：

```typescript
{ path: '/reports', label: '报告中心', icon: 'file-icon' }
```

位于「销量分析」与「导出中心」之间。

---

## 二、周报内容规范

### 2.1 报告结构

```
┌─────────────────────────────────────────────────┐
│  周报标题：TingStudio 第 N 周工作报告             │
│  报告周期：2026-04-21 ~ 2026-04-27               │
│  生成时间：2026-04-28 09:00                      │
│  生成方式：自动 / 手动                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  一、配方完成情况                                 │
│  ┌──────────────────────────────────────┐       │
│  │ 📊 本周新增配方: 5 个                 │       │
│  │ 📊 本周完成配方: 3 个                 │       │
│  │ 📊 完成率: 60%                        │       │
│  │ 📊 累计配方总数: 42 个                │       │
│  │                                      │       │
│  │ [柱状图] 本周每日配方新增/完成趋势     │       │
│  │ [饼图]   配方状态分布（进行中/已完成）  │       │
│  │                                      │       │
│  │ 未完成原因分析:                       │       │
│  │  - 原料缺货: 1 个                     │       │
│  │  - 价格调整中: 1 个                   │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  二、销售数据统计                                 │
│  ┌──────────────────────────────────────┐       │
│  │ 📊 本周销售总量: 1,200 盒             │       │
│  │ 📊 本周销售额: ¥85,000               │       │
│  │ 📊 环比上周: +12.5% / +8.3%          │       │
│  │                                      │       │
│  │ [柱状图] 本周每日销量/销售额趋势       │       │
│  │ [横向柱状图] 热销配方 TOP5            │       │
│  │ [折线图]   近4周销量趋势对比           │       │
│  │                                      │       │
│  │ 热销配方排行:                         │       │
│  │  1. 甘绪理膏 - 350盒 (¥24,500)       │       │
│  │  2. 荣华天晞膏 - 280盒 (¥19,600)     │       │
│  │  3. 正阳御湿膏 - 220盒 (¥15,400)     │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  三、未来规划                                     │
│  ┌──────────────────────────────────────┐       │
│  │ 下周工作计划:                         │       │
│  │  - 完成酸枣仁灵芝石斛膏配方调整        │       │
│  │  - 新增佛手玫苓膏配方                  │       │
│  │                                      │       │
│  │ 资源需求:                             │       │
│  │  - 需采购: 枸杞子 50kg, 酸枣仁 30kg   │       │
│  │                                      │       │
│  │ 预期目标:                             │       │
│  │  - 完成配方 4 个                      │       │
│  │  - 销售目标 ¥100,000                  │       │
│  │                                      │       │
│  │ 风险评估:                             │       │
│  │  - 原料供应: 枸杞子价格波动风险(中)    │       │
│  │  - 市场需求: 佛手玫苓膏需求不确定(低)  │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  [导出 PDF] [导出 Excel]                         │
└─────────────────────────────────────────────────┘
```

### 2.2 数据字段定义

#### 配方完成情况

| 字段名 | 类型 | 说明 | 数据来源 |
|--------|------|------|----------|
| `newFormulaCount` | number | 本周新增配方数 | formulas WHERE created_at BETWEEN |
| `completedFormulaCount` | number | 本周完成配方数 | formulas WHERE updated_at BETWEEN AND status='completed' |
| `completionRate` | number | 完成率(%) | completedFormulaCount / newFormulaCount * 100 |
| `totalFormulaCount` | number | 累计配方总数 | COUNT(formulas) |
| `dailyFormulaTrend` | Array<{date, new, completed}> | 每日新增/完成趋势 | 按日聚合 |
| `statusDistribution` | Array<{status, count}> | 配方状态分布 | GROUP BY status |
| `incompleteReasons` | Array<{reason, count}> | 未完成原因分析 | 手动填写 + AI 分析 |

#### 销售数据统计

| 字段名 | 类型 | 说明 | 数据来源 |
|--------|------|------|----------|
| `weeklyQuantity` | number | 本周销售总量 | SUM(formula_sales.quantity) |
| `weeklyRevenue` | number | 本周销售额 | SUM(formula_sales.revenue) |
| `quantityGrowthRate` | number | 销量环比增长率(%) | (本周-上周)/上周*100 |
| `revenueGrowthRate` | number | 销售额环比增长率(%) | 同上 |
| `dailySalesTrend` | Array<{date, quantity, revenue}> | 每日销量/销售额 | 按日聚合 |
| `topFormulas` | Array<{formulaId, name, quantity, revenue}> | 热销配方TOP5 | ORDER BY quantity DESC LIMIT 5 |
| `weeklyComparison` | Array<{week, quantity, revenue}> | 近4周趋势 | 近4周数据 |

#### 未来规划

| 字段名 | 类型 | 说明 | 数据来源 |
|--------|------|------|----------|
| `nextWeekPlans` | Array<{task, assignee, deadline}> | 下周工作计划 | 手动填写 |
| `resourceNeeds` | Array<{item, quantity, unit, urgency}> | 资源需求 | 手动填写 + 原料库存预警 |
| `expectedTargets` | Array<{metric, target, confidence}> | 预期目标 | 手动填写 |
| `riskAssessment` | Array<{risk, level, mitigation}> | 风险评估 | 手动填写 + AI 分析 |

### 2.3 可视化图表

| 图表位置 | 图表类型 | 数据维度 | 建议组件 |
|----------|----------|----------|----------|
| 配方每日趋势 | 分组柱状图 | 日期 × (新增/完成) | ECharts bar |
| 配方状态分布 | 饼图 | 状态 × 数量 | ECharts pie |
| 每日销量趋势 | 双轴柱状图 | 日期 × (销量/销售额) | ECharts bar |
| 热销配方排行 | 横向柱状图 | 配方 × 销量 | ECharts bar |
| 近4周趋势 | 折线图 | 周 × (销量/销售额) | ECharts line |

### 2.4 导出功能

- **PDF 导出**：复用现有 pdfkit 方案，生成 A4 报告文档（含图表截图）
- **Excel 导出**：复用现有 xlsx 方案，多 Sheet 结构（概览/配方/销售/规划）

---

## 三、月报内容规范

### 3.1 报告结构

在周报基础上增加以下章节：

```
┌─────────────────────────────────────────────────┐
│  月报标题：TingStudio 2026年4月工作报告           │
│  报告周期：2026-04-01 ~ 2026-04-30               │
├─────────────────────────────────────────────────┤
│                                                 │
│  一~三、（同周报，时间范围扩展为月度）              │
│                                                 │
│  四、月度汇总分析                                 │
│  ┌──────────────────────────────────────┐       │
│  │ 📊 本月新增配方: 18 个                │       │
│  │ 📊 本月完成配方: 12 个                │       │
│  │ 📊 月度完成率: 66.7%                  │       │
│  │ 📊 月度销售总量: 5,200 盒             │       │
│  │ 📊 月度销售额: ¥380,000              │       │
│  │                                      │       │
│  │ [折线图] 本月每日销量趋势              │       │
│  │ [柱状图] 各周销量对比                  │       │
│  │ [饼图]   配方类型销售占比              │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  五、趋势变化分析                                 │
│  ┌──────────────────────────────────────┐       │
│  │ [折线图] 近6个月销量/销售额趋势        │       │
│  │ [折线图] 近6个月配方新增趋势           │       │
│  │                                      │       │
│  │ 同比分析:                             │       │
│  │  - 销量同比: +25.3%                   │       │
│  │  - 销售额同比: +18.7%                 │       │
│  │  - 新增配方同比: +12.5%               │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  六、季度目标达成率                               │
│  ┌──────────────────────────────────────┐       │
│  │ Q2 目标:                              │       │
│  │  - 配方完成: 30/40 (75%)              │       │
│  │  - 销售额: ¥1,200,000/¥1,500,000     │       │
│  │  - 达成率: 80%                        │       │
│  │                                      │       │
│  │ [进度条] 各项目标达成进度              │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  七、部门/团队协作情况                            │
│  ┌──────────────────────────────────────┐       │
│  │ 业务员业绩排行:                       │       │
│  │  1. 丘处机 - 销售额 ¥120,000         │       │
│  │  2. 公孙绿萼 - 销售额 ¥95,000        │       │
│  │  3. 周伯通 - 销售额 ¥78,000          │       │
│  │                                      │       │
│  │ [横向柱状图] 业务员业绩对比            │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  八、问题反馈与改进建议                           │
│  ┌──────────────────────────────────────┐       │
│  │ 本月主要问题:                         │       │
│  │  1. 枸杞子供应不稳定，影响3个配方      │       │
│  │  2. 酸枣仁价格涨幅15%，成本压力增大    │       │
│  │                                      │       │
│  │ 改进建议:                             │       │
│  │  1. 建立枸杞子备用供应商机制           │       │
│  │  2. 评估酸枣仁替代方案                │       │
│  │  3. 优化配方定价策略应对原料波动       │       │
│  └──────────────────────────────────────┘       │
│                                                 │
│  [导出 PDF] [导出 Excel]                         │
└─────────────────────────────────────────────────┘
```

### 3.2 月报额外数据字段

#### 月度汇总分析

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `monthlyNewFormulas` | number | 本月新增配方数 |
| `monthlyCompletedFormulas` | number | 本月完成配方数 |
| `monthlyCompletionRate` | number | 月度完成率(%) |
| `monthlyQuantity` | number | 月度销售总量 |
| `monthlyRevenue` | number | 月度销售额 |
| `weeklyBreakdown` | Array<{week, quantity, revenue, formulaCount}> | 各周数据对比 |
| `formulaTypeDistribution` | Array<{type, quantity, revenue}> | 配方类型销售占比 |

#### 趋势变化分析

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `monthlyTrend` | Array<{month, quantity, revenue, formulaCount}> | 近6个月趋势 |
| `yearOverYear` | {quantity, revenue, formulaCount} | 同比增长率 |
| `monthOverMonth` | {quantity, revenue, formulaCount} | 环比增长率 |

#### 季度目标达成率

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `quarterlyTargets` | Array<{metric, target, actual, rate}> | 季度目标达成 |
| `quarterlyProgress` | number | 季度整体达成率(%) |

#### 部门/团队协作

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `salesmanPerformance` | Array<{salesmanId, name, quantity, revenue, formulaCount}> | 业务员业绩 |
| `collaborationMetrics` | {crossTeamProjects, avgResponseTime} | 协作指标 |

#### 问题反馈与改进

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `issues` | Array<{id, title, severity, status, description}> | 问题列表 |
| `suggestions` | Array<{id, title, priority, description}> | 改进建议 |

---

## 四、技术实现方案

### 4.1 前端架构

#### 新增文件

```
frontend/src/
  views/reports/
    ReportCenter.vue          → 报告中心主页（列表+快捷入口）
    WeeklyReport.vue          → 周报详情页
    MonthlyReport.vue         → 月报详情页
    ReportGenerate.vue        → 生成报告页
  stores/
    report.ts                 → 报告 Store
  api/
    report.ts                 → 报告 API
  components/
    ReportChart.vue           → 报告图表封装组件
    ReportExport.vue          → 报告导出组件
    ReportSection.vue         → 报告章节通用组件
```

#### 路由配置

```typescript
// router/index.ts 新增
{ path: 'reports', name: 'ReportCenter', component: () => import('views/reports/ReportCenter.vue') },
{ path: 'reports/weekly', name: 'WeeklyReport', component: () => import('views/reports/WeeklyReport.vue') },
{ path: 'reports/weekly/:id', name: 'WeeklyReportDetail', component: () => import('views/reports/WeeklyReport.vue') },
{ path: 'reports/monthly', name: 'MonthlyReport', component: () => import('views/reports/MonthlyReport.vue') },
{ path: 'reports/monthly/:id', name: 'MonthlyReportDetail', component: () => import('views/reports/MonthlyReport.vue') },
{ path: 'reports/generate', name: 'ReportGenerate', component: () => import('views/reports/ReportGenerate.vue'), meta: { roles: ['admin'] } },
```

#### 图表库选型

**推荐：ECharts**

理由：
- 项目当前无专业图表库，SalesAnalysis.vue 中的图表为自定义 CSS 实现
- ECharts 功能全面，支持柱状图/折线图/饼图/仪表盘等所有需求
- 支持 SVG 渲染，便于 PDF 导出时截图
- 中文文档完善，社区活跃

安装：`npm install echarts vue-echarts`

#### 报告 Store 设计

```typescript
// stores/report.ts
interface ReportState {
  reports: Report[];
  currentReport: Report | null;
  weeklyData: WeeklyReportData | null;
  monthlyData: MonthlyReportData | null;
  loading: boolean;
  total: number;
  filters: ReportFilters;
}

interface ReportFilters {
  type: 'weekly' | 'monthly' | 'all';
  startDate: string;
  endDate: string;
  status: 'auto' | 'manual' | 'all';
}
```

### 4.2 后端架构

#### 新增文件

```
backend/src/
  controllers/reportController.ts    → 报告控制器
  routes/report.ts                   → 报告路由
  utils/reportPdfExporter.ts         → 报告PDF导出
  utils/reportExcelExporter.ts       → 报告Excel导出
  services/reportGenerator.ts        → 报告自动生成服务
```

#### 数据库新增表

```sql
-- 报告主表
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('weekly', 'monthly')),
  title TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  data_json TEXT NOT NULL,           -- 报告完整数据（JSON）
  generated_by TEXT NOT NULL,        -- auto / manual
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 报告目标表（季度/年度目标设定）
CREATE TABLE report_targets (
  id TEXT PRIMARY KEY,
  period_type TEXT NOT NULL CHECK(period_type IN ('quarterly', 'yearly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  targets_json TEXT NOT NULL,        -- 目标数据（JSON）
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 报告索引
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_period ON reports(period_start, period_end);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_by ON reports(created_by);
```

### 4.3 接口设计规范

#### 报告 CRUD

```
GET    /api/reports                    → 获取报告列表（分页+筛选）
GET    /api/reports/:id                → 获取报告详情
POST   /api/reports/generate           → 生成报告（手动触发）
PUT    /api/reports/:id                → 更新报告（手动调整内容）
DELETE /api/reports/:id                → 删除报告
POST   /api/reports/:id/publish        → 发布报告
GET    /api/reports/:id/export/pdf     → 导出PDF
GET    /api/reports/:id/export/excel   → 导出Excel
```

#### 报告数据聚合

```
GET    /api/reports/data/weekly        → 获取周报聚合数据（实时计算）
GET    /api/reports/data/monthly       → 获取月报聚合数据（实时计算）
```

#### 目标管理

```
GET    /api/reports/targets            → 获取目标列表
POST   /api/reports/targets            → 创建目标
PUT    /api/reports/targets/:id        → 更新目标
DELETE /api/reports/targets/:id        → 删除目标
```

#### 请求/响应示例

**POST /api/reports/generate**

```typescript
// Request
{
  type: 'weekly',
  periodStart: '2026-04-21',
  periodEnd: '2026-04-27',
  includePlans: true,        // 是否包含未来规划
  includeAIAnalysis: true    // 是否包含AI分析
}

// Response
{
  success: true,
  data: {
    id: 'rpt_xxx',
    type: 'weekly',
    title: 'TingStudio 第17周工作报告',
    periodStart: '2026-04-21',
    periodEnd: '2026-04-27',
    status: 'draft',
    generatedBy: 'manual',
    dataJson: {
      formula: { newFormulaCount: 5, completedFormulaCount: 3, ... },
      sales: { weeklyQuantity: 1200, weeklyRevenue: 85000, ... },
      plans: { nextWeekPlans: [...], resourceNeeds: [...], ... }
    }
  }
}
```

**GET /api/reports/data/weekly?periodStart=2026-04-21&periodEnd=2026-04-27**

```typescript
// Response
{
  success: true,
  data: {
    formula: {
      newFormulaCount: 5,
      completedFormulaCount: 3,
      completionRate: 60,
      totalFormulaCount: 42,
      dailyFormulaTrend: [
        { date: '2026-04-21', new: 1, completed: 0 },
        { date: '2026-04-22', new: 0, completed: 1 },
        ...
      ],
      statusDistribution: [
        { status: '进行中', count: 2 },
        { status: '已完成', count: 3 }
      ],
      incompleteReasons: [
        { reason: '原料缺货', count: 1 },
        { reason: '价格调整中', count: 1 }
      ]
    },
    sales: {
      weeklyQuantity: 1200,
      weeklyRevenue: 85000,
      quantityGrowthRate: 12.5,
      revenueGrowthRate: 8.3,
      dailySalesTrend: [...],
      topFormulas: [...],
      weeklyComparison: [...]
    },
    plans: {
      nextWeekPlans: [...],
      resourceNeeds: [...],
      expectedTargets: [...],
      riskAssessment: [...]
    }
  }
}
```

### 4.4 数据采集范围与频率

| 数据类型 | 采集来源 | 采集频率 | 说明 |
|----------|----------|----------|------|
| 配方数据 | formulas 表 | 实时 | created_at/updated_at 判断新增/完成 |
| 销量数据 | formula_sales 表 | 实时 | period_start 落在报告周期内 |
| 业务员数据 | salesmen 表 | 实时 | 关联销量统计 |
| 原料数据 | materials 表 | 实时 | 库存预警、价格变动 |
| 营养数据 | material_nutrition 表 | 实时 | 配方营养达标率 |
| 未来规划 | 手动填写 | 每次生成报告时 | 存储在 dataJson.plans 中 |
| 季度目标 | report_targets 表 | 手动设定 | 每季度初设定 |

### 4.5 权限控制机制

#### 路由级权限

```typescript
// router/index.ts
{
  path: 'reports/generate',
  meta: { roles: ['admin'] }  // 仅管理员可手动生成
}
```

#### 数据级权限

| 角色 | 查看范围 | 操作权限 |
|------|----------|----------|
| admin | 全公司报告 | 生成/编辑/删除/发布/导出 |
| formulist | 仅个人相关报告 | 查看/导出/编辑个人规划部分 |

后端实现：

```typescript
// 报告列表查询
if (req.user.role === 'formulist') {
  // formulist 只能看自己创建的或包含自己业务员数据的报告
  query += ' WHERE r.created_by = ? OR r.data_json LIKE ?';
}
```

#### JWT 扩展

当前 JWT payload 仅含 `userId` 和 `username`，需扩展加入 `role`：

```typescript
// 登录时生成 token
const token = jwt.sign(
  { userId: user.id, username: user.username, role: user.role },
  config.jwt.secret,
  { expiresIn: '7d' }
);
```

### 4.6 自动化生成与手动调整

#### 自动生成策略

```
触发方式: node-cron 定时任务
周报: 每周一 09:00 自动生成上周报告
月报: 每月1日 09:00 自动生成上月报告
```

```typescript
// services/reportGenerator.ts
import cron from 'node-cron';

// 每周一 09:00 生成周报
cron.schedule('0 9 * * 1', async () => {
  const lastWeek = getLastWeekRange();
  await generateReport('weekly', lastWeek.start, lastWeek.end);
});

// 每月1日 09:00 生成月报
cron.schedule('0 9 1 * *', async () => {
  const lastMonth = getLastMonthRange();
  await generateReport('monthly', lastMonth.start, lastMonth.end);
});
```

#### 手动调整方案

1. 自动生成的报告状态为 `draft`
2. 管理员可编辑 `dataJson` 中的任何字段
3. 「未来规划」章节需手动填写
4. 编辑后保存为新的 `dataJson` 版本
5. 确认无误后发布（status → `published`）

### 4.7 历史报告存储与检索

#### 存储策略

- 报告数据以 JSON 存储在 `reports.data_json` 字段
- PDF/Excel 文件存储在 `data/exports/` 目录，路径记录在 `export_jobs` 表
- 报告列表支持按类型/时间范围/状态筛选

#### 检索接口

```
GET /api/reports?type=weekly&startDate=2026-01-01&endDate=2026-04-30&status=published&page=1&pageSize=20
```

#### 报告对比

支持选择两期报告进行数据对比（如本周 vs 上周），前端以并排或差异高亮方式展示。

---

## 五、样式设计规范

### 5.1 设计原则

报告功能的视觉样式必须与 TingStudio 现有功能模块保持一致，遵循以下核心原则：

1. **双色彩体系对齐**：品牌色（可切换 pink/yellow/blue/green）用于导航激活、装饰元素；Emerald 语义色（`#10b981` 系列）用于数据交互反馈
2. **大圆角卡片风格**：延续 24-32px 超大圆角 + 柔和阴影的温暖视觉风格
3. **分段式内容组织**：复用 Drawer 中的左侧彩色边框卡片模式区分报告章节
4. **品牌猫咪 IP**：空状态使用统一的猫咪 SVG 插画
5. **骨架屏先行**：加载时使用 shimmer 动画骨架屏，`content-fade` 过渡切换

### 5.2 颜色方案

#### 报告章节色彩映射

复用 SalesRecordDrawer 的左侧彩色边框模式，为报告各章节分配语义色：

| 章节 | 左侧边框色 | 背景色 | 图标色 | 语义 |
|------|-----------|--------|--------|------|
| 配方完成情况 | `#3B82F6` (蓝) | `#F8FAFC` | `#3B82F6` | 信息 |
| 销售数据统计 | `#10B981` (绿) | `#F0FDF4` | `#10B981` | 增长 |
| 未来规划 | `#8B5CF6` (紫) | `#FAF5FF` | `#8B5CF6` | 规划 |
| 月度汇总分析 | `#F59E0B` (黄) | `#FFFBEB` | `#F59E0B` | 汇总 |
| 趋势变化分析 | `#06B6D4` (青) | `#ECFEFF` | `#06B6D4` | 趋势 |
| 季度目标达成率 | `#10B981` (绿) | `#ECFDF5` | `#10B981` | 达成 |
| 部门/团队协作 | `#6366F1` (靛) | `#EEF2FF` | `#6366F1` | 协作 |
| 问题反馈与改进 | `#EF4444` (红) | `#FEF2F2` | `#EF4444` | 警示 |

#### 统计指标卡片色彩

复用 SalesAnalysis.vue 的 stat-card 模式：

| 指标类型 | 图标背景 | 图标色 | badge 背景 | badge 文字 |
|----------|---------|--------|-----------|-----------|
| 新增/完成 | `#ECFDF5` | `#10B981` | `#D1FAE5` | `#059669` |
| 销售额/量 | `#EFF6FF` | `#3B82F6` | `#DBEAFE` | `#2563EB` |
| 环比增长(正) | `#F0FDF4` | `#10B981` | `#D1FAE5` | `#059669` |
| 环比增长(负) | `#FEF2F2` | `#EF4444` | `#FEE2E2` | `#DC2626` |
| 目标达成率 | `#ECFDF5` | `#10B981` | `#D1FAE5` | `#059669` |
| 风险等级-高 | `#FEF2F2` | `#EF4444` | `#FEE2E2` | `#DC2626` |
| 风险等级-中 | `#FFFBEB` | `#F59E0B` | `#FEF3C7` | `#D97706` |
| 风险等级-低 | `#F0FDF4` | `#10B981` | `#D1FAE5` | `#059669` |

#### 图表配色方案

ECharts 图表统一使用以下调色板，与应用整体风格协调：

```typescript
const reportChartPalette = [
  '#10B981', // emerald-500 主色
  '#3B82F6', // blue-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EF4444', // red-500
  '#06B6D4', // cyan-500
  '#6366F1', // indigo-500
  '#EC4899', // pink-500
];
```

### 5.3 排版层级

严格遵循 design-tokens.scss 的排版规范：

| 元素 | 字号 | 字重 | 颜色 | 字间距 |
|------|------|------|------|--------|
| 报告主标题 | `24px` ($font-size-h1) | 700 | `#0F172A` | 0.3px |
| 章节标题 | `16px` ($font-size-h3) | 700 | `#1E293B` | 0.3px |
| 统计数值 | `24px` ($font-size-h1) | 700 | `#0F172A` | 0 |
| 统计标签 | `12px` ($font-size-caption) | 600 | `#94A3B8` | 0.2px |
| 环比 badge | `12px` ($font-size-caption) | 700 | 语义色 | 0 |
| 正文内容 | `14px` ($font-size-body) | 400 | `#334155` | 0 |
| 描述/说明 | `13px` ($font-size-body-sm) | 400 | `#94A3B8` | 0 |
| 表格内容 | `14px` ($font-size-body) | 400-600 | `#334155` | 0 |
| 时间标注 | `12px` ($font-size-caption) | 400 | `#CBD5E1` | 0.2px |
| 金额数值 | `14px` (等宽字体) | 600 | `#0F172A` | 0 |

等宽字体族：`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### 5.4 组件风格规范

#### 5.4.1 报告章节卡片 (report-section-card)

复用 SalesRecordDrawer 的 drawer-card 模式，增加报告场景的变体：

```scss
.report-section-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  transition: all $transition-normal;

  &:hover {
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  }

  .section-header {
    padding: 14px 20px;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #1E293B;
    letter-spacing: 0.3px;
  }

  .section-body {
    padding: 20px;
  }

  // 左侧彩色边框变体
  &.section-formula  { border-left: 3px solid #3B82F6; }
  &.section-sales    { border-left: 3px solid #10B981; }
  &.section-plans    { border-left: 3px solid #8B5CF6; }
  &.section-summary  { border-left: 3px solid #F59E0B; }
  &.section-trend    { border-left: 3px solid #06B6D4; }
  &.section-target   { border-left: 3px solid #10B981; }
  &.section-team     { border-left: 3px solid #6366F1; }
  &.section-issues   { border-left: 3px solid #EF4444; }
}
```

#### 5.4.2 统计指标卡片 (stat-card)

完全复用 SalesAnalysis.vue 的 stat-card 模式：

```scss
.stat-card {
  background: #fff;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #fff;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  transition: all $transition-slow;
  animation: dashboard-fade-in 0.5s ease forwards;
  opacity: 0;

  &:hover {
    border-color: #D1FAE5;
    transform: translateY(-2px);
    box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.3;
  }

  .stat-badge {
    font-size: 12px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
  }
}
```

#### 5.4.3 图表容器 (chart-container)

```scss
.chart-container {
  background: #fff;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  padding: 20px;

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 16px;
  }
}
```

#### 5.4.4 报告列表卡片 (report-list-card)

报告中心主页的报告列表项：

```scss
.report-list-card {
  background: #fff;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  padding: 24px;
  transition: all $transition-normal;
  cursor: pointer;

  &:hover {
    border-color: #D1FAE5;
    transform: translateY(-2px);
    box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
  }

  .report-type-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &.weekly { background: #DBEAFE; color: #2563EB; }
    &.monthly { background: #FEF3C7; color: #D97706; }
  }

  .report-status {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;

    &.draft { background: #F1F5F9; color: #64748B; }
    &.published { background: #D1FAE5; color: #059669; }
    &.archived { background: #FEE2E2; color: #DC2626; }
  }
}
```

#### 5.4.5 进度条 (target-progress)

季度目标达成率的进度条：

```scss
.target-progress-bar {
  height: 8px;
  border-radius: 4px;
  background: #F1F5F9;
  overflow: hidden;

  .progress-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(135deg, #10B981, #059669);
    animation: progressBarFill 1s ease forwards;
    transform-origin: left;
  }

  &.warning .progress-fill {
    background: linear-gradient(135deg, #F59E0B, #D97706);
  }

  &.danger .progress-fill {
    background: linear-gradient(135deg, #EF4444, #DC2626);
  }
}
```

#### 5.4.6 风险等级标签 (risk-tag)

```scss
.risk-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.3px;

  &.risk-high   { background: #FEE2E2; color: #DC2626; }
  &.risk-medium { background: #FEF3C7; color: #D97706; }
  &.risk-low    { background: #D1FAE5; color: #059669; }
}
```

### 5.5 组件复用策略

| 报告功能组件 | 复用来源 | 复用方式 |
|-------------|---------|---------|
| `stat-card` | SalesAnalysis.vue | 直接复用样式类，无需修改 |
| `report-section-card` | SalesRecordDrawer.vue 的 drawer-card | 扩展左侧边框变体 |
| `chart-container` | SalesAnalysis.vue 的 chart-card | 直接复用 |
| `PageSkeleton` | components/Skeleton/PageSkeleton.vue | 直接复用，type="cards" |
| `EmptyState` | components/EmptyState.vue | 直接复用，自定义 title/description |
| `table-pagination` | FormulaList.vue / SalesAnalysis.vue | 直接复用 |
| `batch-action-bar` | FormulaList.vue | 报告批量导出时复用 |
| `action-btn` | SalesAnalysis.vue | 编辑/删除/导出按钮复用 |
| TDesign 组件 | t-card, t-table, t-pagination, t-select, t-date-picker, t-button | 全局复用 |

### 5.6 页面布局规范

#### 报告中心主页 (ReportCenter.vue)

```
┌──────────────────────────────────────────────────────────┐
│  content-padding: 24px                                   │
│                                                          │
│  ┌─ 页面标题区 ─────────────────────────────────────┐    │
│  │  标题: 24px/700, #0F172A                         │    │
│  │  描述: 13px/400, #94A3B8                         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─ 快捷操作区 ─────────────────────────────────────┐    │
│  │  [生成周报] [生成月报]  → slate-800 圆角按钮      │    │
│  │  筛选: 类型 | 时间范围 | 状态  → TDesign 组件     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─ 报告网格 ───────────────────────────────────────┐    │
│  │  grid-template-columns: repeat(auto-fill, 340px)  │    │
│  │  gap: 20px                                       │    │
│  │                                                  │    │
│  │  ┌─ report-list-card ──┐  ┌─ report-list-card ──┐│    │
│  │  │ border-radius: 24px │  │ border-radius: 24px ││    │
│  │  │ padding: 24px       │  │ padding: 24px       ││    │
│  │  └─────────────────────┘  └─────────────────────┘│    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─ 分页 ───────────────────────────────────────────┐    │
│  │  padding: 24px, background: #fff                  │    │
│  │  border-top: 1px solid #f8fafc                    │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

#### 周报/月报详情页 (WeeklyReport.vue / MonthlyReport.vue)

```
┌──────────────────────────────────────────────────────────┐
│  content-padding: 24px                                   │
│                                                          │
│  ┌─ 报告头部 ───────────────────────────────────────┐    │
│  │  border-radius: 32px, padding: 32px               │    │
│  │  background: linear-gradient(135deg, #ECFDF5,     │    │
│  │    #D1FAE5)                                       │    │
│  │                                                  │    │
│  │  报告标题: 24px/700, #0F172A                      │    │
│  │  报告周期: 14px/400, #334155                      │    │
│  │  生成信息: 12px/400, #94A3B8                      │    │
│  │  状态标签: draft/published/archived                │    │
│  │  操作按钮: [编辑] [导出PDF] [导出Excel]            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─ 统计看板 ───────────────────────────────────────┐    │
│  │  display: grid                                   │    │
│  │  grid-template-columns: repeat(4, 1fr)  (>1600px)│    │
│  │  grid-template-columns: repeat(2, 1fr)  (≤1600px)│    │
│  │  gap: 20px                                       │    │
│  │                                                  │    │
│  │  ┌─ stat-card ──┐ ┌─ stat-card ──┐              │    │
│  │  │ radius: 24px │ │ radius: 24px │              │    │
│  │  └───────────────┘ └───────────────┘              │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─ 章节内容区 ─────────────────────────────────────┐    │
│  │  display: flex, flex-direction: column            │    │
│  │  gap: 20px                                       │    │
│  │                                                  │    │
│  │  ┌─ report-section-card ──────────────────────┐  │    │
│  │  │ border-left: 3px solid [语义色]             │  │    │
│  │  │ border-radius: 12px                         │  │    │
│  │  │                                             │  │    │
│  │  │  ┌─ section-header ──────────────────────┐  │  │    │
│  │  │  │ padding: 14px 20px, bg: #F8FAFC       │  │  │    │
│  │  │  │ font: 15px/700, color: #1E293B        │  │  │    │
│  │  │  └───────────────────────────────────────┘  │  │    │
│  │  │  ┌─ section-body ────────────────────────┐  │  │    │
│  │  │  │ padding: 20px                          │  │  │    │
│  │  │  │                                         │  │  │    │
│  │  │  │  指标行: flex, gap: 24px                │  │  │    │
│  │  │  │  图表区: chart-container, mt: 16px      │  │  │    │
│  │  │  │  列表区: 排行/原因分析, mt: 16px        │  │  │    │
│  │  │  └───────────────────────────────────────┘  │  │    │
│  │  └─────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─ 底部操作栏 ─────────────────────────────────────┐    │
│  │  position: sticky, bottom: 0                      │    │
│  │  padding: 16px 24px                               │    │
│  │  background: rgba(255,255,255,0.95)               │    │
│  │  backdrop-filter: blur(12px)                      │    │
│  │  border-top: 1px solid #F1F5F9                    │    │
│  │                                                  │    │
│  │  [导出 PDF]  [导出 Excel]  [发布报告]             │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 5.7 响应式断点

与现有页面保持一致的三级断点体系：

| 断点 | 看板列数 | 章节图表 | 报告列表 |
|------|---------|---------|---------|
| `> 1600px` | 4 列 | 图表左右各 50% | 3 列网格 |
| `1024-1600px` | 2 列 | 图表上下排列 | 2 列网格 |
| `<= 1024px` | 2 列 | 图表全宽 | 1 列网格 |
| `<= 768px` | 1 列 | 图表全宽，padding 缩至 16px | 1 列网格 |

### 5.8 暗色模式适配

报告功能需支持暗色模式，通过 CSS 自定义属性自动切换：

| 属性 | 亮色 | 暗色 |
|------|------|------|
| 卡片背景 | `#ffffff` | `#241e2b` |
| 页面背景 | `#fff9f7` | `#1a1520` |
| 章节头部背景 | `#F8FAFC` | `#2d2635` |
| 边框色 | `#E2E8F0` | `#3d3445` |
| 主文字 | `#0F172A` | `#e8dfe8` |
| 次文字 | `#94A3B8` | `#8b7f94` |
| 图表背景 | `#ffffff` | `#241e2b` |
| 统计数值 | `#0F172A` | `#e8dfe8` |

ECharts 暗色模式配置：

```typescript
const darkChartTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#e8dfe8' },
  legend: { textStyle: { color: '#8b7f94' } },
  axisLine: { lineStyle: { color: '#3d3445' } },
  splitLine: { lineStyle: { color: '#3d3445' } },
};
```

---

## 六、交互逻辑规范

### 6.1 页面导航方式

#### 侧边栏导航

报告中心入口位于侧边栏「销量分析」与「导出中心」之间，使用 `file-icon` 图标：

```typescript
const navItems = [
  { path: '/ai-assistant', label: 'AI 助手', icon: 'precise-monitor' },
  { path: '/formulas', label: '配方管理', icon: 'edit' },
  { path: '/materials', label: '原料管理', icon: 'chart-bar' },
  { path: '/salesmen', label: '业务员管理', icon: 'usergroup' },
  { path: '/sales', label: '销量分析', icon: 'chart' },
  { path: '/reports', label: '报告中心', icon: 'file-icon' },  // 新增
  { path: '/exports', label: '导出中心', icon: 'download' },
  { path: '/nutrition', label: '营养分析', icon: 'chart-pie' },
  { path: '/tools', label: '工具箱', icon: 'setting' },
];
```

#### 面包屑导航

```
报告中心 > 周报详情 > 第17周工作报告
报告中心 > 月报详情 > 2026年4月工作报告
报告中心 > 生成报告
```

面包屑当前页使用固定绿色 `#10B981`，与现有页面一致。

#### 页面间跳转

| 来源 | 目标 | 触发方式 |
|------|------|----------|
| 报告中心 | 周报/月报详情 | 点击报告卡片 |
| 周报/月报详情 | 报告中心 | 面包屑返回 |
| 周报/月报详情 | 生成报告页 | 点击「重新生成」按钮 |
| 销量分析 | 周报详情 | 点击「生成周报」快捷按钮 |
| 报告详情 | 配方详情 | 点击热销配方名称链接 |

### 6.2 数据加载状态

#### 骨架屏加载

报告页面加载时使用 `PageSkeleton` 组件，type 为 `cards`：

```html
<Transition name="content-fade" mode="out-in">
  <PageSkeleton v-if="!initialized" type="cards" :rows="4" />
  <div v-else class="report-content">
    <!-- 实际内容 -->
  </div>
</Transition>
```

骨架屏 shimmer 动画：2s ease-in-out infinite，使用品牌色渐变带。

#### 图表加载态

ECharts 图表加载时显示 `t-loading`，覆盖在图表容器上：

```html
<div class="chart-container" style="position: relative;">
  <t-loading v-if="chartLoading" size="small" />
  <v-chart v-else :option="chartOption" autoresize />
</div>
```

#### 数据刷新

- 报告详情页顶部提供刷新按钮（圆形，复用 `nav-circle-btn` 样式）
- 刷新时仅重新加载当前报告数据，不刷新整个页面
- 刷新按钮点击后旋转 360°（复用 `refresh-spin` 动画，0.8s）

### 6.3 用户操作反馈

#### 按钮交互

| 按钮 | 默认态 | 悬停态 | 按下态 | 加载态 |
|------|--------|--------|--------|--------|
| 生成报告 | slate-800 背景 | slate-700 背景 | scale(0.96) | 旋转 loading 图标 |
| 导出 PDF | 白色背景+边框 | 品牌色文字+浅背景 | scale(0.96) | 进度条替换文字 |
| 导出 Excel | 白色背景+边框 | emerald 文字+浅背景 | scale(0.96) | 进度条替换文字 |
| 发布报告 | emerald 渐变 | 阴影加深 | scale(0.96) | 旋转 loading 图标 |
| 编辑报告 | 透明背景 | 蓝色文字+浅蓝背景 | scale(0.96) | — |

所有按钮过渡时间：`$transition-fast` (0.15s ease)

#### 操作成功反馈

使用 TDesign `MessagePlugin.success` 通知：

```typescript
MessagePlugin.success('报告生成成功');
MessagePlugin.success('报告已发布');
MessagePlugin.success('PDF 导出完成');
```

#### 操作确认

删除/发布等不可逆操作使用 `DialogPlugin.confirm`：

```typescript
DialogPlugin.confirm({
  header: '确认发布',
  body: '发布后报告将对所有用户可见，是否继续？',
  confirmBtn: { content: '发布', theme: 'success' },
  cancelBtn: { content: '取消' },
});
```

#### 批量操作

报告列表支持多选后批量导出，复用 FormulaList 的批量操作栏模式：

```scss
.batch-action-bar {
  background-color: #059669;
  color: #fff;
  border-radius: 32px 32px 0 0;
  box-shadow: 0 4px 18px rgba(5, 150, 105, 0.25);
}
```

### 6.4 报告生成流程

```
用户点击「生成报告」
    │
    ├─ 选择报告类型（周报/月报）
    │   → t-radio-group, variant="default-filled", size="small"
    │
    ├─ 选择时间范围
    │   → t-date-picker, mode="date"
    │   → 周报: 自动计算所在周
    │   → 月报: 自动计算所在月
    │
    ├─ 配置选项
    │   → ☑ 包含未来规划（默认勾选）
    │   → ☑ AI 智能分析（默认勾选）
    │   → ☑ 包含原料预警（月报默认勾选）
    │
    ├─ 点击「确认生成」
    │   → 按钮显示 loading
    │   → 后端聚合数据（2-5秒）
    │   → 生成完成，跳转到报告详情页
    │   → MessagePlugin.success('报告生成成功')
    │
    └─ 生成失败
        → MessagePlugin.error('生成失败：原因')
        → 保留表单，允许重试
```

### 6.5 报告编辑交互

报告编辑采用**就地编辑**模式，而非打开新页面/抽屉：

1. 点击章节右上角「编辑」图标按钮
2. 章节进入编辑态：数值字段变为 input，文本字段变为 textarea
3. 编辑态下章节边框变为品牌色 `var(--color-primary)`
4. 底部出现「保存」和「取消」按钮
5. 保存时显示 loading，成功后 MessagePlugin.success

```scss
.report-section-card.editing {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}
```

### 6.6 报告对比交互

1. 在报告中心选择两期报告（checkbox 多选）
2. 点击「对比」按钮
3. 进入对比视图：左右分栏或上下分栏
4. 差异指标高亮：增长用绿色背景，下降用红色背景
5. 图表叠加显示（本期实线 + 上期虚线）

### 6.7 导出交互

#### PDF 导出

1. 点击「导出 PDF」按钮
2. 按钮文字变为进度条（复用 `progressBarFill` 动画）
3. 后端生成 PDF（3-8秒）
4. 完成后自动下载，按钮恢复
5. MessagePlugin.success('PDF 导出完成')

#### Excel 导出

1. 点击「导出 Excel」按钮
2. 同 PDF 流程，但生成速度更快（1-3秒）
3. 多 Sheet 结构：概览 / 配方数据 / 销售数据 / 规划

### 6.8 动画规范

| 场景 | 动画 | 时长 | 缓动 |
|------|------|------|------|
| 报告卡片入场 | `dashboard-fade-in` | 0.5s | ease |
| 章节卡片入场 | `fadeInUp` | 0.4s | ease |
| 图表渲染完成 | `fadeInScale` | 0.3s | ease |
| 统计数值变化 | 数字滚动动画 | 0.6s | ease-out |
| 骨架屏→内容 | `content-fade` 过渡 | 0.3s | ease |
| 页面切换 | `fade-slide` 过渡 | 0.25s | ease |
| 按钮悬停 | translateY(-1px) | 0.15s | ease |
| 按钮按下 | scale(0.96) | 0.15s | ease |
| 章节编辑态切换 | border-color + box-shadow | 0.25s | ease |
| 进度条填充 | `progressBarFill` | 1s | ease |
| 空状态猫咪 | `emptyCatFloat` | 3s | ease-in-out infinite |

统计数值滚动动画实现：

```typescript
function animateNumber(el: HTMLElement, from: number, to: number, duration = 600) {
  const start = performance.now();
  const update = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
```

### 6.9 空状态设计

复用 `EmptyState` 组件，使用品牌猫咪 SVG：

| 场景 | 标题 | 描述 | 操作 |
|------|------|------|------|
| 无报告 | 暂无报告 | 还没有生成过报告，点击下方按钮创建第一份报告 | 「生成报告」按钮 |
| 无搜索结果 | 未找到报告 | 当前筛选条件下没有匹配的报告，请调整筛选条件 | 「清除筛选」按钮 |
| 无历史报告 | 暂无历史报告 | 该类型还没有历史报告记录 | — |

### 6.10 错误状态设计

复用 SalesAnalysis.vue 的 error-state 模式：

```scss
.error-state {
  padding: 80px 20px;
  text-align: center;

  .error-icon {
    width: 64px;
    height: 64px;
    color: #EF4444;
    margin-bottom: 16px;
  }

  .error-message {
    font-size: 16px;
    font-weight: 600;
    color: #0F172A;
    margin-bottom: 8px;
  }

  .error-description {
    font-size: 13px;
    color: #94A3B8;
    margin-bottom: 24px;
  }

  .retry-btn {
    padding: 10px 24px;
    border-radius: 12px;
    background: $brand-primary;
    color: #fff;
    font-weight: 600;
    transition: all $transition-fast;

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-brand;
    }
  }
}
```

---

## 七、实施路线图

### Phase 1：基础框架（1周）

- 新增数据库表 `reports` + `report_targets`
- 后端报告 CRUD 接口
- 前端报告中心页面 + 路由
- 报告 Store + API 层

### Phase 2：数据聚合与图表（1周）

- 后端数据聚合服务（配方+销量+业务员）
- 前端 ECharts 集成
- 周报页面完整实现
- 月报页面完整实现

### Phase 3：导出与自动化（1周）

- PDF 报告导出（复用 pdfkit）
- Excel 报告导出（复用 xlsx）
- 定时任务自动生成
- 权限控制完善

### Phase 4：增强功能（1周）

- 季度目标管理
- AI 分析建议（接入现有 AI 服务）
- 报告对比功能
- 未来规划手动编辑
