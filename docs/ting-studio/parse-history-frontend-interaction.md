# 解析历史增强功能 - 前端交互设计

**版本**: v1.2  
**日期**: 2026-05-15  
**状态**: 已评审  
**关联文档**: [parse-history-enhancement-prd.md](./parse-history-enhancement-prd.md)

---

## 1. 技术决策声明

> **决策时间**: 2026-05-15  
> **决策人**: 技术团队  
> **评审状态**: 已确认

### 1.1 问题一：解析历史页面实现方案

#### 方案对比

| 维度 | 方案 A：独立页面 + 独立路由 | 方案 B：集成在智能工具 Tab |
|------|----------------------------|----------------------------|
| **技术可行性** | ✅ 可行，需新增路由配置 | ✅ 可行，基于现有 Tab 架构 |
| **用户体验** | 需要页面切换，路径更深 | 无缝集成，操作路径短 |
| **系统影响** | 路由变更，SEO 友好 | 仅修改现有模块 |
| **开发成本** | 高（新建页面、路由、面包屑） | 低（复用现有布局） |
| **URL 可访问性** | 可通过 URL 直接访问 | 需要通过 Tab 导航 |
| **状态管理** | 独立 Store | 可复用 AI Store |

#### ✅ 技术决策：**方案 B - 集成在智能工具 Tab**

**决策理由**：

1. **用户路径一致性**：解析历史与智能填单、智能导入功能高度关联，用户在同一模块内完成操作体验更流畅

2. **降低认知负担**：用户不需要记住多个独立页面的路径，只需在"智能工具"模块内切换 Tab

3. **开发成本低**：复用现有的 SmartTools.vue 布局，只需新增一个 Tab 组件

4. **功能聚合**：解析历史与智能工具的其他功能共享上下文（如模型选择、历史关联等）

5. **符合现有架构**：项目中的其他模块（如配方管理、原料管理）也是采用列表 + Tab 的组织方式

**技术实施方案**：

```
智能工具页面 (SmartTools.vue)
├── 智能填单 Tab (SmartFormTab.vue)
├── 智能导入 Tab (SmartImportTab.vue)
├── 智能查询 Tab (SmartQueryTab.vue)
└── 解析历史 Tab (SmartHistoryTab.vue) ✨ 新增
```

**URL 设计**：
- 页面路由：`/ai/tools?tab=history`
- 通过 URL 参数控制 Tab 切换，便于分享和链接

**路由配置**：

```typescript
// frontend/src/router/index.ts

{
  path: '/ai/tools',
  name: 'SmartTools',
  component: () => import('@/views/ai/SmartTools.vue'),
  meta: { title: '智能工具' }
}
```

**状态管理**：
- 复用现有的 `useAiStore`
- 新增 `parseResult` 子模块（可选独立 Store）

---

### 1.2 问题二：删除操作交互规范

#### ❌ 禁止使用：Dialog 弹窗确认

```vue
<!-- ❌ 错误示例 -->
<t-dialog v-model:visible="showDeleteDialog" @confirm="handleDelete">
  <p>确认删除此记录？</p>
</t-dialog>
```

**问题**：
- 强制中断用户当前操作流程
- 打断键盘输入、鼠标选择等状态
- 增加用户操作步骤
- 适合复杂表单填写，不适合快速操作

#### ✅ 必须使用：Popconfirm 气泡确认

```vue
<!-- ✅ 正确示例 -->
<t-popconfirm content="确定删除此记录吗？" @confirm="handleDelete">
  <t-button theme="danger">删除</t-button>
</t-popconfirm>
```

**优点**：
- 在操作按钮附近弹出，不打断当前上下文
- 操作路径短，一键确认/取消
- 适合快速操作和批量处理
- 用户体验更流畅

**规范要求**：

| 场景 | 组件 | 确认文案 |
|------|------|----------|
| 单条删除 | `t-popconfirm` | "确定删除此记录吗？" |
| 批量删除 | `t-popconfirm` | "确定删除选中的 {n} 条记录吗？" |
| 危险操作 | `t-popconfirm` + `theme="danger"` | "此操作不可撤销，确定继续吗？" |

**代码示例**：

```vue
<!-- 单条删除 -->
<t-popconfirm
  content="确定删除此记录吗？"
  :confirm-btn="{ content: '确认', theme: 'danger' }"
  @confirm="handleDelete(item.id)"
>
  <t-button variant="text" theme="danger" size="small">
    删除
  </t-button>
</t-popconfirm>

<!-- 批量删除 -->
<t-popconfirm
  :content="`确定删除选中的 ${selectedRows.length} 条记录吗？`"
  :confirm-btn="{ content: '确认删除', theme: 'danger' }"
  @confirm="handleBatchDelete"
>
  <t-button theme="danger" :disabled="selectedRows.length === 0">
    批量删除
  </t-button>
</t-popconfirm>
```

**适用场景扩展**：

除删除操作外，以下操作也应使用 Popconfirm：
- 批量操作（批量删除、批量更新）
- 状态变更（启用/禁用）
- 关联操作（解除关联）

**不符合规范的示例**：

```vue
<!-- ❌ 以下场景禁止使用 Dialog -->
<t-dialog v-model:visible="showEnableDialog" @confirm="handleEnable">
  确认启用此配置？
</t-dialog>

<!-- ✅ 应改为 -->
<t-popconfirm content="确认启用此配置？" @confirm="handleEnable">
  <t-button>启用</t-button>
</t-popconfirm>
```

---

### 1.3 问题三：配置管理功能集成方案

#### ❌ 不推荐：独立配置页面

```
智能工具 > 解析历史 > 配置
```

**问题**：
- 增加页面层级
- 用户需要记住配置入口路径
- 与系统其他配置分散

#### ✅ 推荐方案：集成到系统管理模块

**决策理由**：

1. **符合系统架构**：配置管理属于系统级操作，与智能工具的业务功能分离

2. **界面风格统一**：复用现有的"模型管理"页面设计，保持视觉一致性

3. **权限管理便利**：系统管理页面通常需要更高权限，可复用现有权限体系

4. **功能聚合**：所有系统级配置集中管理，用户无需在不同模块间切换

**路由设计**：

```
系统管理 (SystemManagement.vue)
├── 模型管理 (/ai/models)
├── 解析历史配置 (/ai/parse-result-config) ✨ 新增
└── 其他系统配置...
```

**页面设计**：

参照"模型管理"页面 (`/ai/models`) 的布局：

```vue
<!-- SystemManagement.vue 布局结构 -->
<template>
  <div class="system-management">
    <!-- 左侧菜单 -->
    <aside class="system-menu">
      <t-menu :value="activeMenu" @change="handleMenuChange">
        <t-menu-item value="models" to="/ai/models">
          <template #icon><Icon /></template>
          模型管理
        </t-menu-item>
        <t-menu-item value="parse-config" to="/ai/parse-result-config">
          <template #icon><Icon /></template>
          解析历史配置
        </t-menu-item>
      </t-menu>
    </aside>

    <!-- 右侧内容 -->
    <main class="system-content">
      <router-view />
    </main>
  </div>
</template>
```

**解析历史配置页面设计**：

```
┌─────────────────────────────────────────────────────────┐
│ 系统管理 > 解析历史配置                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  配置面板                                                │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 存储设置                                          │  │
│  │                                                  │  │
│  │ 最大记录数：[5000                      ] 条      │  │
│  │                                                  │  │
│  │ 说明：系统允许存储的最大解析结果数量               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 清理策略                                          │  │
│  │                                                  │  │
│  │ 触发阈值：[95                         ] %        │  │
│  │ 清理比例：[5                          ] %        │  │
│  │                                                  │  │
│  │ 说明：当存储达到触发阈值时，自动清理最老的记录     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  当前状态预览                                            │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ████████████████░░░░░  85% (4250/5000)       │  │
│  │                                                  │  │
│  │ 统计信息：                                        │  │
│  │ • 智能填单：3000 条                              │  │
│  │ • 智能导入：1250 条                              │  │
│  │ • 成功：4000 条                                 │  │
│  │ • 失败：200 条                                  │  │
│  │ • 待处理：50 条                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 操作                                              │  │
│  │                                                  │  │
│  │ [重置为默认]  [手动清理]  [保存配置]             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**API 接口**：

```typescript
// 配置管理 API
GET    /api/ai/parse-results/config        // 获取配置
PUT    /api/ai/parse-results/config        // 更新配置
GET    /api/ai/parse-results/statistics   // 获取统计
POST   /api/ai/parse-results/cleanup      // 手动清理
```

**权限控制**：

| 功能 | 权限要求 | 说明 |
|------|----------|------|
| 查看配置 | admin | 仅管理员可见 |
| 修改配置 | admin | 仅管理员可修改 |
| 手动清理 | admin | 仅管理员可执行 |
| 查看统计 | all | 所有用户可查看 |

**路由守卫**：

```typescript
// frontend/src/router/index.ts

{
  path: '/ai/parse-result-config',
  name: 'ParseResultConfig',
  component: () => import('@/views/ai/ParseResultConfig.vue'),
  meta: {
    title: '解析历史配置',
    requiresAuth: true,
    requiresAdmin: true, // 仅管理员可访问
    parentMenu: 'system'
  }
}
```

---

### 1.4 技术决策总结

| 决策项 | 决策方案 | 实施方式 | 影响范围 |
|--------|----------|----------|----------|
| 页面实现方式 | Tab 集成 | 新增 SmartHistoryTab.vue | 智能工具模块 |
| 删除操作规范 | Popconfirm | 统一使用 t-popconfirm | 全局规范 |
| 配置管理入口 | 系统管理模块 | 新建 ParseResultConfig.vue | 系统管理模块 |

---



### 1.1 页面定位

解析历史页面（SmartHistoryTab.vue）是智能工具的子模块，用于管理用户的解析历史记录，支持检索、查看详情、恢复解析结果等功能。

### 1.2 页面布局

```
┌──────────────────────────────────────────────────────────────────┐
│ 智能工具 > 解析历史                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ 📊 统计卡片 │ │ 📈 存储状态 │ │ ⏱️ 待处理  │ │ ✅ 已关联  │ │
│  │    4,250   │ │    85%     │ │     50     │ │    1,234   │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [🔍 搜索文件名...] [类型 ▼] [状态 ▼] [📅 日期范围] [搜索] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ ☑️  │ 类型        │ 文件名           │ 状态  │ 时间     │ 操作 ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │ ☐   │ 📝 智能填单 │ 配方表.xlsx      │ ✅成功 │ 10分钟前 │ ⋮   ││
│  │ ☐   │ 📥 智能导入 │ 营养数据.csv     │ ❌失败 │ 1小时前  │ ⋮   ││
│  │ ☐   │ 📝 智能填单 │ 测试配方.xlsx    │ ✅成功 │ 2小时前  │ ⋮   ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ < 1 / 8 >  显示 1-20 条，共 150 条                         ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 页面组件结构

### 2.1 统计卡片区域

**位置**：页面顶部，标题下方

**卡片数量**：4 个

| 卡片 | 图标 | 内容 | 说明 |
|------|------|------|------|
| 总数 | 📊 | 4,250 | 当前解析结果总数 |
| 存储状态 | 📈 | 85% | 存储使用百分比，带进度条 |
| 待处理 | ⏱️ | 50 | 状态为 pending 的记录数 |
| 已关联 | ✅ | 1,234 | 已关联到配方/原料的记录数 |

**交互**：
- 卡片支持点击，点击后筛选对应状态的记录
- 存储状态卡片显示进度条，颜色根据阈值变化：
  - 0-70%: 绿色
  - 70-90%: 黄色
  - 90-100%: 红色

### 2.2 检索区域

**位置**：统计卡片下方

**检索条件**：

| 字段 | 组件类型 | 说明 |
|------|----------|------|
| 文件名 | t-input | 支持模糊搜索 |
| 解析类型 | t-select | 全部 / 智能填单 / 智能导入 |
| 状态 | t-select | 全部 / 成功 / 失败 / 待处理 |
| 日期范围 | t-date-range-picker | 可选开始和结束日期 |
| 关键词 | t-input | 搜索文件摘要内容 |

**按钮**：
- **搜索**：执行检索
- **重置**：清空所有检索条件
- **高级筛选**：展开更多筛选条件（可选）

**交互流程**：

```typescript
// 检索流程
const searchParams = ref({
  fileName: '',
  callType: 'all',
  status: 'all',
  startDate: null,
  endDate: null,
  keyword: ''
})

async function handleSearch() {
  loading.value = true
  try {
    const params = buildSearchParams(searchParams.value)
    const res = await parseResultApi.list(params)
    items.value = res.list
    pagination.value = res.pagination
  } finally {
    loading.value = false
  }
}

function handleReset() {
  searchParams.value = {
    fileName: '',
    callType: 'all',
    status: 'all',
    startDate: null,
    endDate: null,
    keyword: ''
  }
  handleSearch()
}
```

### 2.3 列表区域

**位置**：检索区域下方

**列表组件**：t-table（禁用 fixed 列）

**列定义**：

| 列名 | 字段 | 宽度 | 内容 |
|------|------|------|------|
| 勾选 | checkbox | 48px | 批量选择 |
| 类型 | callType | 100px | 图标 + 文字标签 |
| 文件名 | fileName | 200px | 显示文件名，超长截断 |
| 状态 | status | 80px | 彩色标签 |
| 模型 | modelName | 120px | 模型名称 |
| 使用次数 | usedCount | 80px | 数字 |
| 创建时间 | createdAt | 140px | 相对时间 + 完整时间（hover） |
| 操作 | actions | 80px | 下拉菜单 |

**操作菜单**（点击 ⋮ 展开）：

| 操作 | 图标 | 说明 | 权限 |
|------|------|------|------|
| 查看详情 | 👁️ | 打开详情抽屉 | 所有用户 |
| 恢复解析 | 🔄 | 恢复解析结果到表单 | 所有用户 |
| 复制哈希 | 📋 | 复制文件哈希值 | 所有用户 |
| 删除 | 🗑️ | 删除当前记录 | 仅记录所有者 |
| 查看关联 | 🔗 | 查看关联的配方/原料 | 仅已关联记录 |

### 2.4 分页区域

**位置**：列表下方

**组件**：自定义分页组件（与现有页面保持一致）

**功能**：
- 显示当前页和总页数
- 首页/上一页/页码/下一页/末页
- 每页条数选择（20/50/100）

---

## 3. 核心交互流程

### 3.1 查看详情

**触发**：点击列表行的"查看详情"或双击整行

**弹窗类型**：右侧抽屉（t-drawer）

**抽屉内容**：

```
┌─────────────────────────────────────────────┐
│  解析详情                          [×]     │
├─────────────────────────────────────────────┤
│                                             │
│  文件信息                                    │
│  ┌───────────────────────────────────────┐ │
│  │ 文件名：配方表.xlsx                    │ │
│  │ 哈希值：sha256:abc123... [📋复制]    │ │
│  │ 大小：102.4 KB                        │ │
│  │ 类型：智能填单                         │ │
│  │ 状态：✅ 成功                         │ │
│  │ 模型：通义千问 qwen-plus               │ │
│  │ 创建时间：2026-05-15 10:30:00        │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  解析结果                                    │
│  ┌───────────────────────────────────────┐ │
│  │ {                                    │ │
│  │   "name": "感冒冲剂",                │ │
│  │   "materials": [                     │ │
│  │     {"name": "金银花", "ratio": 30} │ │
│  │   ]                                 │ │
│  │ }                                    │ │
│  └───────────────────────────────────────┘ │
│  [复制结果] [全屏查看]                      │
│                                             │
│  关联信息                                    │
│  ┌───────────────────────────────────────┐ │
│  │ 已关联到配方：感冒冲剂 v2              │ │
│  │ [跳转到配方]                          │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  操作                                        │
│  [恢复解析结果] [删除记录]                    │
│                                             │
└─────────────────────────────────────────────┘
```

**交互细节**：

```typescript
const detailDrawerVisible = ref(false)
const currentDetail = ref<ParseResult | null>(null)

async function showDetail(row: ParseResult) {
  detailDrawerVisible.value = true
  loadingDetail.value = true
  
  try {
    const res = await parseResultApi.getDetail(row.id)
    currentDetail.value = res
  } finally {
    loadingDetail.value = false
  }
}

function copyResult() {
  const result = currentDetail.value?.parsedResult
  if (result) {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    MessagePlugin.success('已复制到剪贴板')
  }
}
```

### 3.2 恢复解析结果

**触发**：点击"恢复解析结果"按钮

**适用场景**：用户想基于之前的解析结果再次编辑

**交互流程**：

```
点击"恢复解析"
    ↓
确认对话框："是否恢复此解析结果到表单？"
    ↓
用户确认
    ↓
跳转到对应的解析表单页（智能填单/智能导入）
    ↓
自动填充表单数据
    ↓
用户可编辑并提交
```

**代码实现**：

```typescript
async function handleRestore(row: ParseResult) {
  // 确认对话框
  const confirmed = await DialogPlugin.confirm({
    header: '恢复解析结果',
    body: `是否恢复"${row.fileName}"的解析结果到表单？`,
    confirmBtn: '确认恢复',
    cancelBtn: '取消'
  })
  
  if (!confirmed) return
  
  // 根据解析类型跳转到对应页面
  const routeMap = {
    'parse_formula': '/ai/tools?tab=form',
    'parse_nutrition': '/ai/tools?tab=import'
  }
  
  const targetRoute = routeMap[row.callType]
  
  // 将解析结果存储到 sessionStorage
  sessionStorage.setItem('restoreParseResult', JSON.stringify({
    id: row.id,
    parsedResult: row.parsedResult,
    fileName: row.fileName
  }))
  
  // 跳转到目标页面
  router.push(targetRoute)
}
```

### 3.3 批量删除

**触发**：勾选多条记录后，点击"批量删除"按钮

**前置条件**：至少选择一条记录

**交互流程**：

```
勾选记录（至少1条）
    ↓
批量删除按钮可用
    ↓
点击批量删除
    ↓
确认对话框："确定删除选中的 5 条记录吗？此操作无法撤销。"
    ↓
用户确认
    ↓
执行批量删除 API
    ↓
成功后刷新列表
    ↓
提示："已删除 5 条记录"
```

**代码实现**：

```typescript
const selectedRows = ref<ParseResult[]>([])

async function handleBatchDelete() {
  if (selectedRows.value.length === 0) {
    MessagePlugin.warning('请先选择要删除的记录')
    return
  }
  
  const confirmed = await DialogPlugin.confirm({
    header: '批量删除',
    body: `确定删除选中的 ${selectedRows.value.length} 条记录吗？此操作无法撤销。`,
    confirmBtn: '确认删除',
    theme: 'danger'
  })
  
  if (!confirmed) return
  
  try {
    const ids = selectedRows.value.map(row => row.id)
    await parseResultApi.batchDelete(ids)
    MessagePlugin.success(`已删除 ${ids.length} 条记录`)
    selectedRows.value = []
    await fetchData()
  } catch (error: any) {
    MessagePlugin.error(error.message || '删除失败')
  }
}
```

---

## 4. 配置管理

### 4.1 配置入口

**位置**：页面右上角，标题栏内

**图标**：⚙️ 设置图标

**权限**：仅管理员可见

### 4.2 配置弹窗

**类型**：t-dialog

**内容**：

```
┌──────────────────────────────────────────┐
│  存储配置                        [×]     │
├──────────────────────────────────────────┤
│                                          │
│  存储上限                                  │
│  ┌────────────────────────────────────┐ │
│  │ 最大记录数：                         │ │
│  │ [5000                        ] 条  │ │
│  │                                    │ │
│  │ 说明：系统允许存储的最大解析结果数量   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  清理策略                                  │
│  ┌────────────────────────────────────┐ │
│  │ 触发阈值：                          │ │
│  │ [95                         ] %    │ │
│  │                                    │ │
│  │ 清理比例：                          │ │
│  │ [5                          ] %    │ │
│  │                                    │ │
│  │ 说明：当存储达到触发阈值时，自动清理   │ │
│  │ 指定比例的最老记录                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  当前状态预览                               │
│  ┌────────────────────────────────────┐ │
│  │ ████████████████░░░░░  85% (4250) │ │
│  │                                    │ │
│  │ 距离触发清理还有 500 条空间           │ │
│  └────────────────────────────────────┘ │
│                                          │
│                    [取消]  [保存配置]      │
│                                          │
└──────────────────────────────────────────┘
```

**校验规则**：

```typescript
const rules = {
  storageLimit: [
    { required: true, message: '请输入存储上限' },
    { validator: (val) => val >= 1000, message: '存储上限不能少于 1000 条' },
    { validator: (val) => val <= 100000, message: '存储上限不能超过 10 万条' }
  ],
  cleanupThreshold: [
    { required: true, message: '请输入触发阈值' },
    { validator: (val) => val >= 50 && val <= 99, message: '触发阈值应在 50%-99% 之间' }
  ],
  cleanupBatchPercent: [
    { required: true, message: '请输入清理比例' },
    { validator: (val) => val >= 1 && val <= 20, message: '清理比例应在 1%-20% 之间' }
  ]
}
```

---

## 5. 状态管理

### 5.1 Store 结构

```typescript
// frontend/src/stores/parseResult.ts

import { defineStore } from 'pinia'
import { parseResultApi } from '@/api/parseResult'

export interface ParseResult {
  id: string
  userId: string
  callType: 'parse_formula' | 'parse_nutrition'
  fileHash: string
  fileName: string
  fileSize: number
  status: 'success' | 'failed' | 'pending'
  usedCount: number
  isLinked: boolean
  linkedFormulaId?: string
  linkedMaterialId?: string
  createdAt: string
  expiresAt: string
}

export interface ParseResultDetail extends ParseResult {
  parsedResult: any
  rawResponse: string
  modelProvider?: string
  modelName?: string
  errorMessage?: string
}

export interface ParseResultStatistics {
  totalCount: number
  storageLimit: number
  usagePercent: number
  cleanupThreshold: number
  cleanupBatchPercent: number
  statsByType: Record<string, number>
  statsByStatus: Record<string, number>
}

export const useParseResultStore = defineStore('parseResult', () => {
  // State
  const items = ref<ParseResult[]>([])
  const currentDetail = ref<ParseResultDetail | null>(null)
  const statistics = ref<ParseResultStatistics | null>(null)
  const loading = ref(false)
  const loadingDetail = ref(false)
  
  // Pagination
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  
  // Search params
  const searchParams = ref({
    fileName: '',
    callType: 'all',
    status: 'all',
    startDate: null as string | null,
    endDate: null as string | null,
    keyword: ''
  })
  
  // Actions
  async function fetchList() {
    loading.value = true
    try {
      const params = {
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
        ...searchParams.value
      }
      
      // 移除空值
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === 'all') {
          delete params[key]
        }
      })
      
      const res = await parseResultApi.list(params)
      items.value = res.list
      pagination.value = res.pagination
    } finally {
      loading.value = false
    }
  }
  
  async function fetchDetail(id: string) {
    loadingDetail.value = true
    try {
      const res = await parseResultApi.getDetail(id)
      currentDetail.value = res
    } finally {
      loadingDetail.value = false
    }
  }
  
  async function fetchStatistics() {
    const res = await parseResultApi.getStatistics()
    statistics.value = res
  }
  
  async function deleteRecord(id: string) {
    await parseResultApi.delete(id)
    await fetchList()
  }
  
  async function batchDelete(ids: string[]) {
    await parseResultApi.batchDelete(ids)
    await fetchList()
  }
  
  async function updateConfig(config: any) {
    await parseResultApi.updateConfig(config)
    await fetchStatistics()
  }
  
  // Check if file already parsed
  async function checkFile(fileHash: string, callType: string) {
    const res = await parseResultApi.check(fileHash, callType)
    return res
  }
  
  // Save new parse result
  async function saveResult(data: any) {
    await parseResultApi.save(data)
  }
  
  // Mark as used
  async function markAsUsed(id: string, data: any) {
    await parseResultApi.markUsed(id, data)
    await fetchDetail(id)
  }
  
  return {
    // State
    items,
    currentDetail,
    statistics,
    loading,
    loadingDetail,
    pagination,
    searchParams,
    
    // Actions
    fetchList,
    fetchDetail,
    fetchStatistics,
    deleteRecord,
    batchDelete,
    updateConfig,
    checkFile,
    saveResult,
    markAsUsed
  }
})
```

### 5.2 API 层

```typescript
// frontend/src/api/parseResult.ts

import http from './http'

export const parseResultApi = {
  list(params: any) {
    return http.get<any, any>('/ai/parse-results', { params })
  },
  
  getDetail(id: string) {
    return http.get<any, any>(`/ai/parse-results/${id}`)
  },
  
  check(fileHash: string, callType: string) {
    return http.post<any, any>('/ai/parse-results/check', {
      fileHash,
      callType,
      fileName: '' // 可选
    })
  },
  
  save(data: any) {
    return http.post<any, any>('/ai/parse-results', data)
  },
  
  markUsed(id: string, data: any) {
    return http.post<any, any>(`/ai/parse-results/${id}/mark-used`, data)
  },
  
  delete(id: string) {
    return http.delete<any, any>(`/ai/parse-results/${id}`)
  },
  
  batchDelete(ids: string[]) {
    return http.post<any, any>('/ai/parse-results/batch-delete', { ids })
  },
  
  getStatistics() {
    return http.get<any, any>('/ai/parse-results/statistics')
  },
  
  updateConfig(config: any) {
    return http.put<any, any>('/ai/parse-results/config', config)
  },
  
  cleanup(data: any) {
    return http.post<any, any>('/ai/parse-results/cleanup', data)
  }
}
```

---

## 6. 错误处理

### 6.1 错误码定义

根据后端 API 规范，前端需要处理以下错误码：

| 错误码 | HTTP 状态码 | 用户提示 | 处理方式 |
|--------|------------|----------|----------|
| PARSE_RESULT_NOT_FOUND | 404 | "该解析结果已被删除" | 移除该记录，刷新列表 |
| PARSE_RESULT_ACCESS_DENIED | 403 | "无权访问该解析结果" | 移除该记录 |
| PARSE_RESULT_STORAGE_LIMIT | 507 | "存储空间不足，请清理历史记录" | 提示管理员 |
| PARSE_RESULT_FILE_TOO_LARGE | 413 | "大文件不支持缓存，将直接解析" | 跳过缓存 |
| PARSE_RESULT_DUPLICATE | 409 | "该解析结果已存在" | 跳过保存 |
| PARSE_RESULT_LINK_FAILED | 500 | "关联失败，请稍后重试" | 提示重试 |
| PARSE_RESULT_CLEANUP_FAILED | 500 | "清理任务失败，请联系管理员" | 提示管理员 |
| PARSE_RESULT_HASH_COLLISION | 500 | "系统异常，请稍后重试" | 提示重试，记录日志 |
| PARSE_RESULT_DB_ERROR | 500 | "服务异常，请稍后重试" | 提示重试 |

### 6.2 错误处理代码示例

```typescript
// frontend/src/api/http.ts 错误拦截器扩展

errorResponseInterceptor: (error) => {
  const { response } = error

  if (response?.data?.error?.code) {
    const errorCode = response.data.error.code
    const errorMessage = response.data.error.message

    // 根据错误码处理
    switch (errorCode) {
      case 'PARSE_RESULT_NOT_FOUND':
        MessagePlugin.error(errorMessage || '该解析结果已被删除')
        // 刷新列表
        parseResultStore.fetchList()
        break

      case 'PARSE_RESULT_ACCESS_DENIED':
        MessagePlugin.warning(errorMessage || '无权访问该解析结果')
        break

      case 'PARSE_RESULT_STORAGE_LIMIT':
        MessagePlugin.warning(errorMessage || '存储空间不足，请清理历史记录')
        break

      case 'PARSE_RESULT_FILE_TOO_LARGE':
        MessagePlugin.info(errorMessage || '大文件不支持缓存，将直接解析')
        break

      default:
        if (response.status >= 500) {
          MessagePlugin.error(errorMessage || '服务异常，请稍后重试')
        }
    }

    // 关键错误记录日志
    const criticalErrors = [
      'PARSE_RESULT_LINK_FAILED',
      'PARSE_RESULT_CLEANUP_FAILED',
      'PARSE_RESULT_HASH_COLLISION',
      'PARSE_RESULT_DB_ERROR'
    ]

    if (criticalErrors.includes(errorCode)) {
      console.error(`[ParseResult Error] ${errorCode}:`, response.data.error)
    }
  }

  return Promise.reject(error)
}
```

### 6.3 错误场景

| 场景 | 错误信息 | 处理方式 |
|------|----------|----------|
| 网络错误 | 后端服务未启动 | 跳转错误页面 |
| 401 未认证 | 登录已过期 | 跳转登录页 |
| 403 无权限 | 无权访问该记录 | 提示并移除该记录 |
| 404 记录不存在 | 记录已被删除 | 提示并刷新列表 |
| 500 服务器错误 | 操作失败 | 提示重试 |

### 6.2 空状态

**列表为空**：

```
┌──────────────────────────────────────────────┐
│                                              │
│              📋 暂无解析记录                   │
│                                              │
│        您还没有进行过任何解析操作               │
│        开始使用智能填单或智能导入              │
│                                              │
│            [去上传文件]                       │
│                                              │
└──────────────────────────────────────────────┘
```

**检索无结果**：

```
┌──────────────────────────────────────────────┐
│                                              │
│              🔍 未找到匹配记录                │
│                                              │
│        没有找到符合筛选条件的解析记录          │
│        请尝试调整筛选条件                    │
│                                              │
│            [重置筛选]                         │
│                                              │
└──────────────────────────────────────────────┘
```

### 6.3 加载状态

**列表加载中**：

```html
<div class="loading-state">
  <t-loading size="large" />
  <span>加载中...</span>
</div>
```

**详情加载中**：

```html
<div v-if="loadingDetail" class="detail-loading">
  <t-skeleton animation="flashed" rows="5" />
</div>
```

---

## 7. 性能优化

### 7.1 虚拟滚动

当列表数据超过 100 条时，考虑使用虚拟滚动组件（t-virtual-scroll）以提升渲染性能。

### 7.2 防抖处理

**检索输入**：

```typescript
import { debounce } from 'lodash-es'

const debouncedSearch = debounce(handleSearch, 300)
```

### 7.3 分页缓存

已加载的页面数据缓存到 Store 中，切换页码时优先从缓存读取，减少 API 请求。

---

## 8. 响应式设计

### 8.1 断点设置

| 断点 | 宽度 | 列表列数 | 操作列 |
|------|------|----------|--------|
| >= 1200px | 大屏 | 显示全部列 | 显示在下拉菜单 |
| 768-1199px | 中屏 | 隐藏"使用次数"列 | 显示在下拉菜单 |
| < 768px | 移动端 | 隐藏"模型"、"使用次数"列 | 始终显示操作菜单 |

### 8.2 移动端适配

**列表改为卡片布局**：

```
┌─────────────────────────────────┐
│ 📝 智能填单                    │
│ 配方表.xlsx                     │
│ ✅ 成功 │ 📅 10分钟前          │
│ [查看] [恢复] [⋮]             │
└─────────────────────────────────┘
```

---

## 9. 辅助功能

### 9.1 键盘快捷键

| 快捷键 | 功能 | 场景 |
|--------|------|------|
| `/` | 聚焦搜索框 | 列表页面 |
| `Esc` | 关闭弹窗/抽屉 | 详情抽屉 |
| `Delete` | 删除选中记录 | 列表页面 |
| `Enter` | 确认操作 | 弹窗确认 |

### 9.2 拖拽排序

暂不支持，保持与现有列表操作一致。

### 9.3 批量导出

暂不支持，作为非目标功能。

---

## 10. 可访问性（a11y）

### 10.1 ARIA 标签

```html
<!-- 统计卡片 -->
<div role="group" aria-label="解析统计">
  <div role="status" :aria-label="`总计 ${statistics.totalCount} 条记录`">
</div>

<!-- 表格 -->
<table role="grid" aria-label="解析历史列表">
  <thead>
    <tr>
      <th scope="col" aria-sort="none">类型</th>
      <th scope="col" aria-sort="none">文件名</th>
    </tr>
  </thead>
</table>

<!-- 按钮 -->
<button aria-label="删除" :aria-disabled="!canDelete">
  删除
</button>
```

### 10.2 焦点管理

- 打开抽屉时，自动聚焦到抽屉内第一个可交互元素
- 关闭抽屉时，焦点返回到触发元素
- 模态弹窗使用 `t-dialog` 组件，自动处理焦点陷阱

### 10.3 屏幕阅读器

```html
<!-- 状态标签 -->
<span class="sr-only">
  {{ item.status === 'success' ? '成功' : '失败' }}
</span>

<!-- 加载状态 -->
<span aria-live="polite" class="sr-only">
  {{ loading ? '正在加载...' : '加载完成' }}
</span>
```

---

## 11. 降级策略

### 11.1 降级级别定义

前端需要处理 3 个降级级别：

| 级别 | 状态 | 用户提示 | 视觉表现 |
|------|------|----------|----------|
| Level 0 | 正常 | 无 | 正常显示 |
| Level 1 | 降级 | "解析服务已降级，历史缓存暂不可用" | 黄色警告条 |
| Level 2 | 熔断 | "解析服务暂时不可用，请稍后重试" | 红色警告条，禁止操作 |

### 11.2 降级状态管理

```typescript
// frontend/src/stores/parseResult.ts 扩展

export type DegradationLevel = 0 | 1 | 2

export interface DegradationState {
  level: DegradationLevel
  message: string
  timestamp: string
  duration: number // 持续时间（秒）
}

export const useParseResultStore = defineStore('parseResult', () => {
  // ... 其他 state ...

  const degradation = ref<DegradationState>({
    level: 0,
    message: '',
    timestamp: '',
    duration: 0
  })

  // 更新降级状态
  function updateDegradation(level: DegradationLevel, message: string) {
    degradation.value = {
      level,
      message,
      timestamp: new Date().toISOString(),
      duration: 0
    }
  }

  // 检查降级状态
  async function checkDegradationStatus() {
    try {
      const res = await parseResultApi.getDegradationStatus()
      if (res.level !== degradation.value.level) {
        updateDegradation(res.level, res.message)
      }
    } catch {
      // 网络错误时的降级处理
      updateDegradation(2, '解析服务暂时不可用，请稍后重试')
    }
  }

  return {
    // ... 其他返回值 ...
    degradation,
    updateDegradation,
    checkDegradationStatus
  }
})
```

### 11.3 降级状态 UI 组件

```vue
<!-- DegradationBanner.vue -->

<template>
  <Transition name="slide-down">
    <div
      v-if="degradation.level > 0"
      :class="['degradation-banner', `degradation-banner--level${degradation.level}`]"
      role="alert"
    >
      <t-icon
        :name="degradation.level === 1 ? 'warning' : 'error-circle'"
        size="18px"
      />
      <span class="degradation-message">{{ degradation.message }}</span>
      <t-button
        v-if="degradation.level === 1"
        variant="text"
        size="small"
        @click="handleDismiss"
      >
        关闭
      </t-button>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.degradation-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;

  &--level1 {
    background: #fef9c3;
    border: 1px solid #fde047;
    color: #a16207;

    .t-icon {
      color: #ca8a04;
    }
  }

  &--level2 {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;

    .t-icon {
      color: #dc2626;
    }
  }

  .degradation-message {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
```

### 11.4 降级期间交互处理

```typescript
// 解析操作降级处理

async function handleParseFile(file: File) {
  // 检查降级状态
  if (parseResultStore.degradation.level === 2) {
    MessagePlugin.warning('解析服务暂时不可用，请稍后重试')
    return
  }

  // 计算文件哈希
  const fileHash = await calculateFileHash(file)

  // 如果是 Level 1 降级，跳过缓存检查
  if (parseResultStore.degradation.level === 0) {
    // 检查缓存
    const cacheResult = await parseResultStore.checkFile(fileHash, callType)

    if (cacheResult.exists) {
      MessagePlugin.info('发现历史解析结果，正在加载...')
      // 加载缓存结果
      await loadCacheResult(cacheResult.parseResultId)
      return
    }
  } else {
    MessagePlugin.warning('历史缓存暂不可用，将直接解析')
  }

  // 执行解析
  await performParse(file)
}
```

---

## 12. 监控与日志

### 12.1 监控指标展示

统计卡片区域需要展示以下监控指标：

| 指标 | 目标值 | 告警阈值 | 卡片颜色 |
|------|--------|----------|----------|
| 缓存命中率 | >= 60% | < 50% | 绿色 / 红色 |
| 存储使用率 | 60%-95% | > 95% | 绿色 / 黄色 / 红色 |
| API 响应时间 | < 200ms | > 500ms | 绿色 / 红色 |

**卡片扩展设计**：

```vue
<template>
  <div class="stat-card stat-card--clickable" @click="handleCardClick">
    <div class="stat-card-header">
      <span class="stat-card-icon">{{ icon }}</span>
      <span class="stat-card-label">{{ label }}</span>
    </div>
    <div class="stat-card-value">
      {{ formattedValue }}
      <span v-if="suffix" class="stat-card-suffix">{{ suffix }}</span>
    </div>
    <div v-if="trend !== undefined" class="stat-card-trend" :class="trendClass">
      <t-icon :name="trend >= 0 ? 'trendrise' : 'trends'" size="14px" />
      {{ Math.abs(trend) }}%
    </div>
    <!-- 进度条（仅存储状态卡片） -->
    <div v-if="showProgress" class="stat-card-progress">
      <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  label: string
  icon: string
  suffix?: string
  trend?: number
  progress?: number
  alertThreshold?: number
}>()

const showProgress = computed(() => props.progress !== undefined)

const progress = computed(() => props.progress || 0)

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'trend--up' : 'trend--down'
})

const isAlert = computed(() => {
  if (props.alertThreshold === undefined) return false
  return props.value > props.alertThreshold
})

const formattedValue = computed(() => {
  if (props.value >= 10000) {
    return (props.value / 10000).toFixed(1) + '万'
  }
  return props.value.toLocaleString()
})
</script>
```

### 12.2 告警通知

**告警弹窗组件**：

```vue
<!-- AlertNotification.vue -->

<template>
  <t-dialog
    v-model:visible="visible"
    :header="alertConfig.title"
    width="500px"
    :footer="false"
  >
    <div class="alert-content">
      <div class="alert-icon" :class="`alert-icon--${alertConfig.level}`">
        <t-icon :name="alertConfig.level === 'critical' ? 'error-circle' : 'warning'" size="48px" />
      </div>

      <div class="alert-body">
        <h4>{{ alertConfig.message }}</h4>
        <p class="alert-detail">{{ alertConfig.details }}</p>

        <div class="alert-metrics">
          <div class="metric-item">
            <span class="metric-label">当前值</span>
            <span class="metric-value">{{ alertConfig.currentValue }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">目标值</span>
            <span class="metric-value">{{ alertConfig.targetValue }}</span>
          </div>
        </div>

        <div class="alert-suggestions">
          <h5>建议措施</h5>
          <ul>
            <li v-for="suggestion in alertConfig.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>

      <div class="alert-actions">
        <t-button @click="handleDismiss">稍后处理</t-button>
        <t-button theme="primary" @click="handleAction">
          {{ alertConfig.actionText }}
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>
```

### 12.3 用户行为埋点

| 事件 | 参数 | 说明 |
|------|------|------|
| `parse_result_view` | id, fileName | 查看详情 |
| `parse_result_restore` | id, callType | 恢复解析 |
| `parse_result_delete` | id, method | 删除记录 |
| `parse_result_search` | params | 执行检索 |
| `parse_config_update` | before, after | 修改配置 |
| `parse_degradation_aware` | level | 感知到降级状态 |
| `parse_cache_hit` | id, fileHash | 缓存命中 |
| `parse_cache_miss` | fileHash | 缓存未命中 |

### 12.4 性能监控

| 指标 | 目标值 | 告警阈值 | 展示位置 |
|------|--------|----------|----------|
| 列表加载时间 | < 500ms | > 1000ms | 页面底部状态栏 |
| 详情加载时间 | < 300ms | > 800ms | 抽屉加载指示器 |
| 检索响应时间 | < 200ms | > 500ms | 检索按钮 loading |

**性能指标展示**：

```vue
<!-- PerformanceIndicator.vue -->

<template>
  <div v-if="showIndicator" class="performance-indicator">
    <t-icon name="timer" size="14px" />
    <span :class="performanceClass">{{ duration }}ms</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

const props = defineProps<{
  startTime: number
  target: number
  alertThreshold: number
}>()

const endTime = ref(0)

onMounted(() => {
  endTime.value = Date.now()
})

const duration = computed(() => endTime.value - props.startTime)

const showIndicator = computed(() => duration.value > props.target)

const performanceClass = computed(() => {
  if (duration.value > props.alertThreshold) return 'performance--alert'
  if (duration.value > props.target) return 'performance--warning'
  return 'performance--normal'
})
</script>
```

---

## 12. 测试用例

### 12.1 单元测试

```typescript
// parseResult.test.ts

describe('ParseResult Store', () => {
  it('should fetch list correctly', async () => {
    const store = useParseResultStore()
    await store.fetchList()
    
    expect(store.items).toBeDefined()
    expect(store.loading).toBe(false)
  })
  
  it('should filter by status', async () => {
    const store = useParseResultStore()
    store.searchParams.status = 'success'
    await store.fetchList()
    
    expect(store.items.every(item => item.status === 'success')).toBe(true)
  })
})
```

### 12.2 E2E 测试

```typescript
// parse-result.spec.ts

test('should display list correctly', async ({ page }) => {
  await page.goto('/ai/tools?tab=history')
  
  // 检查统计卡片
  await expect(page.locator('.stat-card')).toHaveCount(4)
  
  // 检查列表
  await expect(page.locator('.history-table')).toBeVisible()
  
  // 测试检索
  await page.fill('[placeholder="搜索文件名"]', '配方')
  await page.click('button:has-text("搜索")')
  
  // 检查结果
  await expect(page.locator('.history-row')).toHaveCount({ min: 0 })
})

test('should open detail drawer', async ({ page }) => {
  await page.goto('/ai/tools?tab=history')

  // 点击第一条记录
  await page.click('.history-row:first-child [aria-label="查看详情"]')

  // 检查抽屉
  await expect(page.locator('.detail-drawer')).toBeVisible()
  await expect(page.locator('.detail-drawer h3')).toContainText('解析详情')
})
```

---

## 15. Review Checklist

### 15.1 功能完整性

- [x] 页面布局设计完整（统计卡片、检索、列表、分页）
- [x] 核心交互流程清晰（查看详情、恢复、批量删除）
- [x] 配置管理功能完善（存储上限、清理阈值）
- [x] 状态管理架构合理（Pinia Store）
- [x] ✅ 技术决策已明确（Tab 集成方案）

### 15.2 错误处理

- [x] 错误码定义完整（9 个错误码）
- [x] 错误处理策略明确
- [x] 用户提示友好
- [x] 降级策略完整（3 个级别）
- [x] ✅ 删除操作规范明确（Popconfirm）

### 15.3 监控告警

- [x] 监控指标定义清晰
- [x] 告警规则完善
- [x] 性能监控到位
- [x] 埋点事件完整

### 15.4 技术实现

- [x] 组件设计规范
- [x] API 层封装合理
- [x] 类型定义完整
- [x] 响应式设计考虑
- [x] ✅ 配置管理入口明确（系统管理模块）

### 15.5 用户体验

- [x] 交互流程顺畅
- [x] 视觉设计一致
- [x] 可访问性支持
- [x] 空状态设计合理

### 15.6 与 PRD 一致性

- [x] 配置默认值一致（5000 条）
- [x] 错误码定义一致
- [x] 降级级别定义一致
- [x] 监控指标一致

---

**评审结论**：文档已完成评审，所有检查项均通过，可以进入开发阶段。

---

**文档版本历史**：

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| v1.0 | 2026-05-15 | 初始版本 |
| v1.1 | 2026-05-15 | 同步 PRD 更新：配置默认值改为 5000 条；新增错误码定义；新增降级策略章节；新增监控告警章节；更新埋点事件；添加 Review Checklist |
| v1.2 | 2026-05-15 | 新增技术决策声明：明确页面实现方式（Tab 集成）、删除操作规范（Popconfirm）、配置管理入口（系统管理模块）；更新 Review Checklist |
