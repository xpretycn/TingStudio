# 技术方案：快速配方录入交互流程优化

## 1. 架构设计

### 1.1 整体架构

本方案在现有快速配方录入模块基础上进行扩展，新增「快速配方」数据实体和左侧可折叠面板交互。

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend                                  │
│                                                                   │
│  QuickFormulaPanel.vue (改造)                                     │
│  ├── QuickFormulaSidebar.vue (新增) ← 可折叠左侧面板              │
│  │   ├── 折叠/展开按钮                                            │
│  │   ├── 新建快速配方按钮                                          │
│  │   └── 快速配方列表                                             │
│  ├── QuickFormulaEntry.vue (保留，作为新建入口)                    │
│  ├── FormulaDashboard.vue (保留)                                  │
│  ├── FormulaWorkspace.vue (保留)                                  │
│  └── PublishDrawer.vue (新增) ← 发布抽屉                         │
│                                                                   │
│  Stores:                                                          │
│  ├── quickFormula.ts (改造) ← 增加快速配方 CRUD 方法              │
│  └── quickFormulaList.ts (新增) ← 快速配方列表状态管理            │
│                                                                   │
│  API:                                                             │
│  └── quickFormula.ts (新增) ← /api/quick-formulas 封装           │
├──────────────────────────────────────────────────────────────────┤
│                         Backend                                   │
│                                                                   │
│  Routes:                                                          │
│  └── quickFormulas.ts (新增) ← /api/quick-formulas 路由定义      │
│                                                                   │
│  Controllers:                                                     │
│  └── quickFormulaController.ts (新增) ← 请求处理                  │
│                                                                   │
│  Services:                                                        │
│  └── quickFormulaService.ts (新增) ← 业务逻辑                     │
│                                                                   │
│  Database:                                                        │
│  └── quick_formulas (新增表)                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
QuickFormulaPanel
  ├── QuickFormulaSidebar → quickFormulaList Store → quickFormula API
  ├── FormulaWorkspace → quickFormula Store (现有)
  └── PublishDrawer → quickFormula API + formula API (现有)
```

---

## 2. 前端模块设计

### 2.1 QuickFormulaPanel.vue 改造

**改动点：**

1. 移除 `phase === 'entry'` 判断逻辑，改为始终显示左侧面板 + 工作区
2. 左侧面板参照 AiWorkspace.vue 的 `history-sidebar` 折叠方案
3. 新增 `PublishDrawer` 组件
4. 路由 meta 增加 `hideHeader: true`

**布局结构：**

```
┌────────────────────────────────────────────────────────┐
│ panel-header (毛玻璃顶部栏，保留)                        │
├──────┬─────────────────────────────────────────────────┤
│      │                                                 │
│ 左侧 │  FormulaDashboard                               │
│ 面板 │                                                 │
│      ├─────────────────────────────────────────────────┤
│      │                                                 │
│      │  FormulaWorkspace                               │
│      │                                                 │
└──────┴─────────────────────────────────────────────────┘
```

### 2.2 QuickFormulaSidebar.vue（新增）

**功能：**
- 可折叠侧边栏，展开宽度 260px，折叠宽度 52px
- 展开态：显示标题「快速配方」、新建按钮、配方列表
- 折叠态：仅显示图标按钮
- 列表项显示：配方名称 + 状态标签（编辑中/已发布）
- 列表项操作：点击选中加载、删除按钮

**参照实现：** AiWorkspace.vue 的 `history-sidebar` 方案

**核心状态：**
```typescript
const sidebarCollapsed = ref(false)
const selectedQuickFormulaId = ref<string | null>(null)
const quickFormulaList = ref<QuickFormulaItem[]>([])
const loading = ref(false)
```

**折叠交互：**
```scss
.quick-formula-sidebar {
  width: 260px;
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &.collapsed {
    width: 52px;
  }

  .sidebar-inner {
    width: 260px; // 固定内部宽度，防止内容重排
    height: 100%;
  }
}
```

### 2.3 PublishDrawer.vue（新增）

**功能：**
- 右侧抽屉弹出，补充发布必填信息
- 必填字段：业务员（t-select）、配方描述（t-textarea）
- 可选字段：制备方法（t-textarea）
- 底部操作栏：取消 + 确认发布

**核心状态：**
```typescript
const visible = ref(false)
const publishing = ref(false)
const publishForm = reactive({
  salesmanId: '',
  description: '',
  preparationMethod: '',
})
```

**发布流程：**
1. 用户点击「发布」按钮 → 打开抽屉
2. 填写必填字段 → 点击「确认发布」
3. 调用 `POST /api/quick-formulas/:id/publish`
4. 成功后：关闭抽屉 → 提示成功 → 跳转工作台

### 2.4 quickFormulaList Store（新增）

**职责：** 管理快速配方列表状态

```typescript
export const useQuickFormulaListStore = defineStore('quickFormulaList', () => {
  const list = ref<QuickFormulaItem[]>([])
  const loading = ref(false)
  const selectedId = ref<string | null>(null)

  async function fetchList()
  async function createQuickFormula(name: string)
  async function deleteQuickFormula(id: string)
  async function saveQuickFormula(id: string, data: QuickFormulaData)
  async function publishQuickFormula(id: string, publishData: PublishData)
  async function loadQuickFormula(id: string)

  return { list, loading, selectedId, fetchList, createQuickFormula, deleteQuickFormula, saveQuickFormula, publishQuickFormula, loadQuickFormula }
})
```

### 2.5 quickFormula API（新增）

**文件：** `frontend/src/api/quickFormula.ts`

```typescript
import http from '@/api/http'

export function getQuickFormulaList(params?: { keyword?: string; page?: number; pageSize?: number })
export function getQuickFormulaById(id: string)
export function createQuickFormula(data: { name: string })
export function updateQuickFormula(id: string, data: Record<string, unknown>)
export function deleteQuickFormula(id: string)
export function publishQuickFormula(id: string, data: { salesmanId: string; description: string; preparationMethod?: string })
```

### 2.6 类型定义扩展

**文件：** `frontend/src/types/quickFormula.ts`（扩展）

```typescript
export interface QuickFormulaItem {
  id: string
  name: string
  status: 'draft' | 'published'
  ratioFactor: number
  supplementRatioFactor: number
  finishedWeight: number
  materials: QuickFormulaMaterial[]
  packagingPrice: number
  otherPrice: number
  profitMargin: number
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface PublishData {
  salesmanId: string
  description: string
  preparationMethod?: string
}
```

---

## 3. 后端模块设计

### 3.1 路由定义

**文件：** `backend/src/routes/quickFormulas.ts`

| 方法 | 路径 | 中间件 | 说明 |
|------|------|--------|------|
| GET | `/api/quick-formulas` | authMiddleware | 获取快速配方列表 |
| GET | `/api/quick-formulas/:id` | authMiddleware | 获取快速配方详情 |
| POST | `/api/quick-formulas` | authMiddleware + validateBody | 创建快速配方 |
| PUT | `/api/quick-formulas/:id` | authMiddleware + validateBody | 更新快速配方 |
| DELETE | `/api/quick-formulas/:id` | authMiddleware | 删除快速配方 |
| POST | `/api/quick-formulas/:id/publish` | authMiddleware + validateBody | 发布快速配方 |

### 3.2 控制器设计

**文件：** `backend/src/controllers/quickFormulaController.ts`

| 函数 | 说明 |
|------|------|
| `getQuickFormulas` | 获取列表，admin 见全部，formulist 仅见自己 |
| `getQuickFormulaById` | 获取详情，含权限校验 |
| `createQuickFormula` | 创建快速配方，仅 name 必填 |
| `updateQuickFormula` | 更新快速配方，仅 draft 状态可编辑 |
| `deleteQuickFormula` | 删除快速配方，含权限校验 |
| `publishQuickFormula` | 发布为正式配方草稿，创建 formulas + formula_versions 记录 |

### 3.3 服务层设计

**文件：** `backend/src/services/quickFormulaService.ts`

| 函数 | 说明 |
|------|------|
| `findAll(userId, role)` | 查询快速配方列表 |
| `findById(id)` | 根据 ID 查询 |
| `findByName(name, userId)` | 根据名称+用户查询（唯一性校验） |
| `create(data)` | 创建快速配方 |
| `update(id, data)` | 更新快速配方 |
| `remove(id)` | 删除快速配方 |
| `publish(id, publishData, userId, role)` | 发布为正式配方 |

### 3.4 发布逻辑详细设计

`publishQuickFormula` 是核心函数，流程如下：

```
1. 查询 quick_formulas 记录，校验存在且 status = 'draft'
2. 校验发布数据：salesmanId 必填、description 必填
3. 查询 salesmen 表验证 salesmanId 有效
4. 合并数据：快速配方数据 + 发布补充数据 → 完整配方数据
5. 生成配方编码：generateFormulaCode(name)
6. INSERT INTO formulas (...) VALUES (...)
7. INSERT INTO formula_versions (...) VALUES (...) — status 根据角色决定
8. UPDATE quick_formulas SET status = 'published' WHERE id = ?
9. 返回新配方 ID
```

---

## 4. 路由改造

### 4.1 QuickFormulaPanel 路由

**文件：** `frontend/src/router/index.ts`

```typescript
// 改造前
{
  path: "formulas/quick",
  name: "QuickFormula",
  component: () => import("@/views/dashboard/quick-formula/QuickFormulaPanel.vue"),
  meta: { title: "快速录入", hideHeader: true, fullBleed: true, extraBottom: true },
}

// 改造后
{
  path: "formulas/quick",
  name: "QuickFormula",
  component: () => import("@/views/dashboard/quick-formula/QuickFormulaPanel.vue"),
  meta: { title: "快速录入", hideHeader: true, fullBleed: true, extraBottom: true },
  // hideHeader: true 已存在，需确认 Home.vue 是否正确处理
}
```

### 4.2 Home.vue Header 隐藏逻辑

需确认 Home.vue 中是否已根据 `route.meta.hideHeader` 隐藏顶部 header。如果未实现，需在 Home.vue 中增加：

```vue
<header v-if="!$route.meta.hideHeader" class="home-header">
  ...
</header>
```

---

## 5. 数据迁移

### 5.1 新建 quick_formulas 表

**文件：** `backend/src/scripts/migrations/addQuickFormulasTable.ts`

- 幂等执行：先检查表是否存在
- 同时更新 SQLite 和 MySQL 初始化脚本

---

## 6. 关键技术决策

| 决策项 | 方案 | 理由 |
|--------|------|------|
| 左侧面板折叠方案 | CSS width 过渡 + overflow: hidden | 与 AI 助手历史对话面板一致，动画流畅 |
| 发布交互方式 | 右侧抽屉 (t-drawer) | 不打断用户操作流，符合 TDesign 设计规范 |
| 快速配方草稿持久化 | 从 localStorage 迁移到数据库 | 支持多设备访问、数据隔离、列表管理 |
| 发布后原配方处理 | 标记 status=published 保留 | 可复用创建新配方，避免数据丢失 |
| 配方名称唯一性 | 同一 created_by 下名称不重复 | 避免混淆，不同用户可同名 |
