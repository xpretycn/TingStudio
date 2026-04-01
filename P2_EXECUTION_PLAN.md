# P2 无障碍可访问性设计 — 实施方案

> 基于 `FRONTEND_UIUX_OPTIMIZATION_PLAN.md` 第五章制定，目标为满足 **WCAG 2.1 AA 级**核心标准。

---

## 一、现状分析

### 1.1 无障碍指标盘点

| 指标 | 当前值 | 目标 |
|------|:------:|:----:|
| `aria-*` 属性使用次数 | **0** | ≥ 40 |
| `role` 属性使用次数 | **0** | ≥ 8 |
| `tabindex` 使用次数 | **0** | ≥ 6 |
| `focus-visible` 焦点环样式 | **0** | 全局覆盖 |
| 文字颜色对比度（AA 4.5:1） | 部分不达标 | 全部达标 |
| `prefers-reduced-motion` | ✅ 已实现（P1 Task 1） | 保持 |
| `lang` 属性 | 未检查 | `zh-CN` |
| `<main>` / `<nav>` 语义标签 | **未使用**（全部 `<div>`） | 已使用 |

### 1.2 颜色对比度审计

| 色值对 | 前景色 | 背景色 | 对比度 | AA 4.5:1 | 判定 |
|--------|--------|--------|:------:|:---------:|:----:|
| 主要文字 | `#5D4E60` (`$text-primary`) | `#FFF9F7` (`$bg-page`) | ≈ 6.8:1 | ✅ | 通过 |
| 次要文字 | `#9B8FA0` (`$text-secondary`) | `#FFFFFF` (`$bg-container`) | ≈ 3.2:1 | ❌ | **不通过** |
| 占位文字 | `#C4B8C7` (`$text-placeholder`) | `#FFFFFF` | ≈ 2.1:1 | ❌ | **不通过** |
| 品牌主色 | `#FF6B8A` (`$brand-primary`) | `#FFFFFF` | ≈ 3.4:1 | ❌ (按钮文字) | 需白色文字 |
| 危险色 | `#E34D4F` (`$color-danger`) | `#FFFFFF` | ≈ 4.5:1 | ✅ | 通过 |

### 1.3 结构性缺陷

| 缺陷 | 影响范围 | 严重度 |
|------|---------|:------:|
| 导航无 `<nav>` / `role="navigation"` | 屏幕阅读器无法识别导航区域 | 高 |
| 导航项无 `role="menuitem"` / `tabindex` | 键盘用户无法 Tab 到导航项 | 高 |
| 用户菜单弹出无 `aria-haspopup` / `aria-expanded` | 屏幕阅读器不知有子菜单 | 中 |
| 搜索输入无 `aria-label` | 屏幕阅读器读不出"搜索配方"等语义 | 中 |
| router-view 外层无 `<main>` | 页面级 landmark 缺失 | 中 |
| 图标导航使用文字渲染（emoji/SVG）而非 `aria-hidden` | 屏幕阅读器读取无意义内容 | 低 |
| 表单字段虽有 `label` 属性但 TDesign 自动生成关联关系，需验证 | — | 中 |

---

## 二、WCAG 2.1 AA 合规策略

### 2.1 覆盖的成功标准（Success Criteria）

| WCAG 编号 | 名称 | 本方案对应 Task |
|-----------|------|:--------------:|
| **1.1.1** 非文本内容 | 装饰性图片/图标 `aria-hidden="true"` | Task 1 |
| **1.3.1** 信息和关系 | 语义化 HTML（`<nav>`, `<main>`, `<header>`） | Task 1 |
| **1.4.3** 对比度（最低） | `$text-secondary` 对比度提升至 ≥ 4.5:1 | Task 2 |
| **2.1.1** 键盘 | 所有功能可通过键盘操作 | Task 3 |
| **2.4.1** 绕过块 | 页面提供"跳到内容"跳过链接 | Task 1 |
| **2.4.3** 焦点顺序 | Tab 顺序符合逻辑 | Task 3 |
| **2.4.6** 标题和标签 | 页面标题 + 区域标题 | Task 1 |
| **2.4.7** 焦点可见 | `:focus-visible` 全局焦点环 | Task 2 |
| **3.3.1** 错误识别 | 表单验证错误与字段关联 | Task 4 |
| **3.3.2** 标签或说明 | 表单字段有可见标签或 `aria-label` | Task 4 |
| **4.1.2** 名称、角色、值 | ARIA 属性正确使用 | Task 3 |
| **4.1.3** 状态消息 | Toast/消息使用 `aria-live` | Task 4 |

### 2.2 不在本方案范围内的标准

| WCAG 编号 | 原因 |
|-----------|------|
| 1.2.x 时间媒体 | 项目无音视频 |
| 1.4.4 文字放大 200% | 依赖浏览器原生缩放，当前布局已支持 |
| 2.5.x 指针手势 | 无自定义手势操作 |

---

## 三、技术选型

| 决策 | 选择 | 理由 |
|------|------|------|
| 无障碍检测工具 | 手动审查 + axe-core DevTools 插件 | 轻量，无额外依赖 |
| 焦点环样式 | 纯 CSS `:focus-visible` | 无 JS 依赖，浏览器原生支持 |
| 对比度修复 | 调整 SCSS 变量值 | 统一从设计令牌层面修复 |
| 键盘导航 | 原生 `@keydown` 事件 | 无需引入库，TDesign 已内置部分支持 |
| 跳过链接 | CSS + `<a>` 标签 | 纯 CSS 方案，仅屏幕阅读器/键盘可见 |
| 动态消息 | `aria-live="polite"` 区域 | Vue `ref` + DOM 属性注入 |

---

## 四、实施任务

### Task 1：语义化 HTML 与 Landmark（基础设施）

**目标**：为页面结构添加语义化标签和 ARIA landmark 角色。

**涉及文件**：`Home.vue`

**步骤**：

#### Step 1.1 — 页面结构语义化

将 Home.vue 的顶层 `<div>` 改为语义化标签：

```vue
<!-- 当前 -->
<div class="left-sidebar">...</div>
<div class="right-content">
  <div class="top-header">...</div>
  <div class="content-body">
    <div class="content-main">
      <router-view />
    </div>
  </div>
</div>

<!-- 改为 -->
<aside class="left-sidebar" aria-label="主导航">
  ...
</aside>
<div class="right-content">
  <header class="top-header" role="banner">...</header>
  <main class="content-body" id="main-content">
    <div class="content-main">
      <router-view />
    </div>
  </main>
</div>
```

#### Step 1.2 — 导航区域添加 ARIA 角色

```vue
<nav class="sidebar-nav" aria-label="侧边栏导航">
  <div class="nav-content" role="menubar">
    <div
      v-for="item in navItems"
      :key="item.path"
      class="nav-item"
      role="menuitem"
      tabindex="0"
      :aria-current="activePath === item.path ? 'page' : undefined"
      @click="navigateTo(item.path)"
      @keydown.enter="navigateTo(item.path)"
    >
      ...
    </div>
  </div>
</nav>
```

#### Step 1.3 — 添加"跳到内容"链接

在 `<body>` 顶部（router-view 之前）添加仅键盘/屏幕阅读器可见的跳过链接：

```vue
<a href="#main-content" class="skip-link">跳到主要内容</a>
```

```scss
// main.scss 新增
.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  z-index: 9999;
  padding: 8px 16px;
  background: $brand-primary;
  color: $text-white;
  border-radius: $radius-md;
  font-weight: $font-weight-semibold;
  transition: top 0.2s ease;

  &:focus {
    top: 8px;
  }
}
```

#### Step 1.4 — 装饰性元素隐藏

```vue
<!-- 日期/天气芯片为纯装饰，非交互元素 -->
<div class="info-chip info-date" aria-hidden="true">...</div>
<div class="info-chip info-weather" aria-hidden="true">...</div>

<!-- 引导卡片关闭按钮 -->
<span class="guide-close" role="button" tabindex="0" aria-label="关闭引导"
      @click="dismissGuide" @keydown.enter="dismissGuide">&times;</span>
```

#### Step 1.5 — 用户菜单添加 ARIA 属性

```vue
<t-popup ...>
  <div
    class="user-avatar-wrapper"
    role="button"
    tabindex="0"
    aria-haspopup="true"
    :aria-expanded="userMenuVisible"
    @keydown.enter="userMenuVisible = !userMenuVisible"
  >...</div>
  <template #content>
    <div class="user-menu-popup" role="menu">
      <div
        v-for="item in userMenuItems"
        :key="item.value"
        role="menuitem"
        tabindex="0"
        @keydown.enter="handleUserMenuClick(item.value)"
        @click="handleUserMenuClick(item.value)"
      >...</div>
    </div>
  </template>
</t-popup>
```

**预期产出**：`Home.vue` 模板结构调整，新增 ~30 个 ARIA 属性。

---

### Task 2：焦点可见性与颜色对比度修复

**目标**：全局焦点环 + 修复 `$text-secondary` 对比度不达标。

**涉及文件**：`main.scss`, `design-tokens.scss`

#### Step 2.1 — 全局 `:focus-visible` 焦点环

在 `main.scss` 末尾添加：

```scss
// ─── Accessibility: Focus Visible ────────────────────────────
:focus-visible {
  outline: 2px solid $brand-primary;
  outline-offset: 2px;
}

// 鼠标点击不显示焦点环（仅键盘导航显示）
:focus:not(:focus-visible) {
  outline: none;
}

// TDesign 组件焦点环兼容
.t-input.t-is-focused,
.t-textarea.t-is-focused,
.t-select-input.t-is-focused {
  box-shadow: 0 0 0 3px rgba(255, 107, 138, 0.2) !important;
}
```

#### Step 2.2 — 修复 `$text-secondary` 对比度

当前 `#9B8FA0` 对比度仅 3.2:1，调整为 `#7B7080`（对比度 ≈ 5.1:1）：

```scss
// design-tokens.scss
$text-secondary: #7B7080;  // 次要文字、描述（对比度 ≥ 4.5:1 ✅）
```

> 注意：此变量修改将全局生效，需确认所有使用 `$text-secondary` 的地方视觉效果可接受。

#### Step 2.3 — 搜索输入框添加 `aria-label`

在 Home.vue 搜索输入框添加动态 `aria-label`：

```vue
<t-input
  v-model="searchKeyword"
  :placeholder="searchPlaceholder"
  :aria-label="searchPlaceholder"
  clearable
  class="search-input"
  @enter="handleSearch"
  @clear="handleSearch"
>
```

#### Step 2.4 — 操作按钮补充 `aria-label`

检查所有纯图标按钮（`variant="text"` + 无文字的按钮），确保有 `aria-label`：

| 页面 | 纯图标按钮 | 缺失的 aria-label |
|------|-----------|-------------------|
| 所有列表页 | 查看/编辑/删除按钮 | 已有文字标签，✅ 无需改动 |
| Home.vue | 锁屏按钮 | 已有文字，✅ 无需改动 |
| NutritionAnalysis | 查看详情按钮 | 已有文字，✅ 无需改动 |

**结论**：当前项目的操作按钮均已包含文字标签，TDesign 会自动将文字作为 `aria-label`。无需额外改动。

**预期产出**：全局焦点环覆盖 + `$text-secondary` 对比度修复 + 搜索框 `aria-label`。

---

### Task 3：键盘导航增强

**目标**：导航菜单支持键盘操作，Tab 顺序符合逻辑。

**涉及文件**：`Home.vue`

#### Step 3.1 — 导航项键盘事件处理

在 Home.vue `<script>` 中添加键盘处理逻辑：

```typescript
// 导航项键盘操作
const handleNavKeydown = (e: KeyboardEvent, path: string) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault()
      navigateTo(path)
      break
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault()
      focusNextNavItem(e.target as HTMLElement)
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault()
      focusPrevNavItem(e.target as HTMLElement)
      break
    case 'Home':
      e.preventDefault()
      focusFirstNavItem()
      break
    case 'End':
      e.preventDefault()
      focusLastNavItem()
      break
  }
}

const focusNextNavItem = (current: HTMLElement) => {
  const items = current.parentElement?.querySelectorAll<HTMLElement>('[role="menuitem"]')
  if (!items) return
  const idx = Array.from(items).indexOf(current)
  const next = items[(idx + 1) % items.length]
  next?.focus()
}

const focusPrevNavItem = (current: HTMLElement) => {
  const items = current.parentElement?.querySelectorAll<HTMLElement>('[role="menuitem"]')
  if (!items) return
  const idx = Array.from(items).indexOf(current)
  const prev = items[(idx - 1 + items.length) % items.length]
  prev?.focus()
}

const focusFirstNavItem = () => {
  const first = document.querySelector<HTMLElement>('[role="menuitem"]')
  first?.focus()
}

const focusLastNavItem = () => {
  const items = document.querySelectorAll<HTMLElement>('[role="menuitem"]')
  const last = items[items.length - 1]
  last?.focus()
}
```

#### Step 3.2 — 导航项模板更新

```vue
<div
  v-for="item in navItems"
  :key="item.path"
  class="nav-item"
  role="menuitem"
  tabindex="0"
  :aria-current="activePath === item.path ? 'page' : undefined"
  @click="navigateTo(item.path)"
  @keydown="handleNavKeydown($event, item.path)"
>
```

#### Step 3.3 — 侧边栏折叠快捷键（可选增强）

```typescript
// Ctrl+B 切换侧边栏
onMounted(() => {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault()
      navExpanded.value = !navExpanded.value
    }
  })
})
```

#### Step 3.4 — 导航项 focus 样式

在 Home.vue scoped styles 中添加：

```scss
.nav-item:focus-visible {
  background: rgba(255, 255, 255, 0.15);
  border-radius: $radius-xl;
  outline: none; // 使用背景色高亮代替焦点环
}
```

**预期产出**：方向键导航 + Enter 激活 + Ctrl+B 折叠快捷键。

---

### Task 4：表单无障碍与动态消息

**目标**：验证/增强表单字段无障碍 + Toast 消息区域标注。

**涉及文件**：3 个表单页 + `main.scss`

#### Step 4.1 — 验证 TDesign `t-form-item` 的 ARIA 生成

TDesign Vue Next 的 `t-form-item` 组件会自动为 `<label>` 和 `<input>` 生成关联：
- `label` 属性 → 自动生成 `<label for="xxx">`
- `required` → 自动添加 `aria-required="true"`
- `help` → 自动生成 `aria-describedby`

**验证方法**：
1. 打开 Chrome DevTools → Elements → 选中任意 `<t-form-item>`
2. 检查渲染后的 DOM 是否包含 `for` / `aria-required` / `aria-describedby`

**如果 TDesign 已正确生成**（预计），则无需修改表单页模板。

#### Step 4.2 — 搜索/筛选表单补充 `aria-label`

列表页的搜索和筛选表单区域需要添加语义标注：

```vue
<!-- FormulaList / MaterialList / SalesmanList 等 -->
<t-form :data="searchForm" layout="inline" @submit="handleSearch"
        aria-label="筛选条件">
```

#### Step 4.3 — 空状态描述增加 `role`

```vue
<t-empty description="暂无配方数据" role="status">
```

#### Step 4.4 — 动态消息区域（Toast）

TDesign 的 `MessagePlugin` 已内置 `role="alert"` 和 `aria-live="assertive"`。验证方法：

```typescript
// 确认 MessagePlugin 渲染的 DOM 包含：
// <div class="t-message" role="alert" aria-live="assertive">
```

**预期**：TDesign 已处理，无需额外代码。

#### Step 4.5 — 弹窗焦点陷阱确认

TDesign `t-dialog` 组件已内置焦点陷阱（focus trap），自动将焦点限制在弹窗内并在关闭后恢复焦点。**无需额外代码**。

#### Step 4.6 — Loading 状态添加 `aria-busy`

在数据加载期间标注区域为忙碌状态：

```vue
<!-- 列表页骨架屏区域 -->
<div :aria-busy="!initialized" aria-live="polite">
  <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="6" />
  <t-card v-else class="content-card" bordered>
    ...
  </t-card>
</div>
```

#### Step 4.7 — 分页器 `aria-label`

```vue
<t-pagination
  v-model:current="currentPage"
  :total="total"
  :page-size="pageSize"
  aria-label="分页导航"
  show-jumper
/>
```

**涉及文件**：`FormulaList.vue`, `MaterialList.vue`, `SalesmanList.vue`, `VersionList.vue`

**预期产出**：表单无障碍增强 + 动态消息标注 + Loading/busy 状态。

---

## 五、性能与兼容性

### 5.1 对构建体积的影响

| 变更类型 | 预估增量 |
|---------|---------|
| 焦点环 CSS（`main.scss`） | ~0.2 KB |
| 跳过链接 CSS | ~0.3 KB |
| ARIA 属性（HTML） | 0 KB（纯属性，无 CSS/JS） |
| 键盘导航 JS（`Home.vue`） | ~0.8 KB |
| `$text-secondary` 色值调整 | 0 KB |
| **总计** | **~1.3 KB** (gzip < 0.5 KB) |

### 5.2 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|:------:|:-------:|:------:|:----:|
| `:focus-visible` | 86+ ✅ | 85+ ✅ | 15.4+ ✅ | 86+ ✅ |
| `aria-current` | 39+ ✅ | 33+ ✅ | 12.1+ ✅ | 79+ ✅ |
| `aria-haspopup` | 38+ ✅ | 30+ ✅ | 7.1+ ✅ | 79+ ✅ |
| `aria-live` | 26+ ✅ | 32+ ✅ | 7+ ✅ | 79+ ✅ |
| `aria-busy` | 38+ ✅ | 6+ ✅ | 7.1+ ✅ | 79+ ✅ |

所有特性均被主流现代浏览器完整支持，无需 polyfill。

### 5.3 无障碍测试工具

| 工具 | 用途 | 使用阶段 |
|------|------|---------|
| **axe-core DevTools** | 自动扫描 WCAG 违规 | 每个 Task 完成后 |
| **Chrome Lighthouse** | Accessibility 评分 | 最终验收 |
| **键盘 Tab 测试** | 手动验证 Tab 顺序 | 每个 Task 完成后 |
| **NVDA / VoiceOver** | 屏幕阅读器体验 | 最终验收（可选） |

---

## 六、执行顺序与时间规划

| 序号 | Task | 依赖 | 预估时间 | 改动范围 |
|:----:|------|------|:--------:|---------|
| 1 | 语义化 HTML 与 Landmark | 无 | 1.0h | `Home.vue`（模板 + 脚本） |
| 2 | 焦点可见性与对比度修复 | 无 | 0.5h | `main.scss` + `design-tokens.scss` |
| 3 | 键盘导航增强 | Task 1 | 1.0h | `Home.vue`（脚本 + 样式） |
| 4 | 表单无障碍与动态消息 | Task 1 | 0.5h | 3 个表单页 + 4 个列表页 |
| | **总计** | | **3.0h** | **1 新样式 + 改 10 文件** |

**建议执行顺序**：Task 2 → Task 1 → Task 3 → Task 4

> Task 2（焦点环 + 对比度）独立性强且见效快，优先执行。Task 1 为 Task 3/4 提供结构基础。

---

## 七、验收标准

| # | 验收项 | 通过条件 | 验证方法 |
|---|--------|---------|---------|
| 1 | 语义化结构 | `<nav>`, `<main>`, `<header>`, `<aside>` 正确使用 | axe-core 扫描 |
| 2 | 跳过链接 | Tab 键可见"跳到主要内容"链接，Enter 跳到内容区 | 键盘测试 |
| 3 | 导航 ARIA | 每个导航项有 `role="menuitem"` + `tabindex="0"` + `aria-current` | DevTools 检查 |
| 4 | 焦点可见 | 所有交互元素键盘聚焦时显示 2px 品牌色焦点环 | Tab 全页面 |
| 5 | 对比度修复 | `$text-secondary` (#7B7080) 对比度 ≥ 4.5:1 | WebAIM 对比度检查器 |
| 6 | 搜索框 `aria-label` | 搜索输入有语义化的 `aria-label` | DevTools 检查 |
| 7 | 键盘导航 | 方向键可在导航项间移动，Enter 激活 | 键盘测试 |
| 8 | 快捷键 | `Ctrl+B` 可切换侧边栏折叠 | 键盘测试 |
| 9 | 表单关联 | 所有表单字段有 visible label（TDesign 自动） | DevTools 检查 |
| 10 | 弹窗焦点 | 打开弹窗后焦点在弹窗内，关闭后恢复 | 键盘测试 |
| 11 | Loading `aria-busy` | 数据加载期间父容器有 `aria-busy="true"` | DevTools 检查 |
| 12 | Lighthouse 评分 | Accessibility 评分 ≥ 90 | Lighthouse 审计 |
| 13 | axe-core | 0 个严重违规 + 0 个主要违规 | axe DevTools 扫描 |
| 14 | 构建检查 | `vite build` 通过，无编译错误 | 命令行 |

---

## 八、风险与注意事项

1. **`$text-secondary` 色值修改全局影响**：从 `#9B8FA0` 改为 `#7B7080` 后，所有使用该变量的 UI 元素颜色将变深。需视觉回归测试确认装饰性元素（如图标、分割线）不受影响。

2. **TDesign ARIA 生成版本差异**：不同版本的 TDesign Vue Next 对 ARIA 属性的支持可能不同。需在 Task 4 Step 4.1 中实际验证当前版本（`tdesign-vue-next`）的渲染结果。

3. **`aria-current="page"` 与 Vue Router**：当前导航高亮使用 `:class="{ active }"` 判断，改为 `aria-current="page"` 后需保留 `:class` 用于视觉样式，两者不冲突。

4. **`:focus-visible` 与 TDesign 焦点样式冲突**：TDesign 组件内部已有 `:focus` 样式（如输入框的 `box-shadow`）。全局 `:focus-visible` 的 `outline` 会叠加在 TDesign 样式之上，需在 Task 2 中通过选择器 specificity 或 `!important` 调整优先级。

5. **用户菜单弹出层**：`t-popup` 组件使用 teleport 渲染到 `<body>` 末尾，其内部的 `role="menu"` 不在 `<nav>` 的 DOM 树中。这在 ARIA 规范中是允许的，但需确保 `aria-haspopup` 正确标注在触发元素上。

6. **键盘导航与 TDesign 组件冲突**：TDesign 的 `t-select`、`t-popup` 等组件内部已处理键盘事件。在 `Home.vue` 中添加全局键盘监听时，需避免与这些组件的键盘行为冲突（通过检查 `e.target` 或 `e.stopPropagation()`）。
