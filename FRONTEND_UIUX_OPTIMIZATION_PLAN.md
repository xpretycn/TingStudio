# TingStudio 前端 UI/UX 优化规划

> **原则**：保持现有核心业务逻辑不变，不修改后端接口和功能实现。仅针对前端视觉表现、交互体验和代码规范进行优化。

---

## 一、现状诊断摘要

### 1.1 已有基础（做得好的部分）

| 维度 | 现状 |
|------|------|
| **设计令牌** | `design-tokens.scss` 已建立完善的色彩、排版、间距、阴影、动效规范 |
| **组件库** | 使用 TDesign Vue Next，组件生态完整 |
| **登录页** | 视觉精良：SVG 猫咪插画、浮动爱心/星光动画、玻璃态卡片、完整的响应式断点 |
| **主布局** | 左侧导航 + 右侧内容双栏布局，侧边栏渐变背景、导航折叠动画、用户卡片 |
| **路由切换** | `fade-slide` 过渡动画已实现 |
| **骨架屏** | `PageSkeleton.vue` 支持 table / cards / detail 三种模式，多数页面已接入 |
| **全局搜索** | 顶栏搜索框 + CustomEvent 机制，已与列表页联动 |

### 1.2 待改进的问题

| 维度 | 问题 |
|------|------|
| **硬编码色值** | 多数子页面（14/19 文件）大量使用 `rgba(...)` 和 `#hex` 硬编码，未引用 design tokens |
| **无障碍** | 全部 19 个页面中 `aria-*` / `role` / `tabindex` 使用量为 **0** |
| **动效不均** | 登录页/主框架动效丰富，子页面几乎无过渡动画（表格、表单、卡片均无 hover 微交互） |
| **代码重复** | Home.vue 中大量 `:deep(.t-button)` 样式与各子页面独立定义的 TDesign 覆盖样式重复 |
| **空闲目录** | `views/customers/` 为空目录，`components/Layout/AppLayout.vue` 与 `Home.vue` 布局职责重叠 |

---

## 二、优化规划总览

共 **4 大板块**，按优先级从高到低排列：

```
P0（紧急）  →  色值统一 & 代码清理
P1（体验）  →  微交互动效增强
P2（品质）  →  无障碍可访问性
P3（进阶）  →  主题系统 & 性能优化
```

---

## 三、P0 — 色值统一 & 代码清理

### 3.1 目标

消除所有页面中的硬编码颜色值，统一使用 `design-tokens.scss` 中定义的变量。

### 3.2 现状数据

通过代码扫描，各文件硬编码色值出现次数：

| 文件 | 硬编码次数 | 说明 |
|------|-----------|------|
| Home.vue | 88 | 最多，但部分是合理的局部动画装饰色 |
| Login.vue | 80 | 登录页独立设计，局部色值偏多 |
| NutritionAnalysis.vue | 31 | 营养分析图表色 |
| Register.vue | 27 | 注册页 |
| FormulaList.vue | 16 | 配方列表 |
| Tools.vue | 15 | 工具箱 |
| MaterialList.vue | 12 | 原料列表 |
| FormulaForm.vue | 9 | 配方表单 |
| MaterialDetail.vue | 9 | 原料详情 |
| NutritionProfiles.vue | 3 | 营养标准 |
| 其他文件 | < 5 | 零散 |

### 3.3 执行方案

#### Step 1：补充 design-tokens.scss 缺失的语义色变量

```scss
// 新增：图表专用色板
$chart-color-1: #FF6B8A;
$chart-color-2: #FFB5C8;
$chart-color-3: #1890FF;
$chart-color-4: #7BC67E;
$chart-color-5: #F0A040;
$chart-color-6: #9B8FA0;

// 新增：装饰色（登录页/插画专用）
$decor-pink-200: #FFD6E0;
$decor-lavender: #F0E6FF;
$decor-mauve: #E8D5F5;

// 新增：覆盖层/遮罩色
$overlay-light: rgba(255, 255, 255, 0.6);
$overlay-medium: rgba(255, 255, 255, 0.92);
$overlay-pink-light: rgba(255, 143, 171, 0.08);
$overlay-pink-medium: rgba(255, 143, 171, 0.15);
$overlay-pink-strong: rgba(255, 143, 171, 0.25);

// 新增：功能色变体
$color-success-light: rgba(123, 198, 126, 0.1);
$color-warning-light: rgba(240, 160, 64, 0.1);
$color-danger-light: rgba(227, 77, 89, 0.08);
```

#### Step 2：逐文件替换硬编码色值

按文件分组，逐个替换为对应 token：

- **Home.vue**：`rgba(255, 143, 171, ...)` → `$overlay-pink-*`；`rgba(255, 255, 255, ...)` → `$overlay-*`；`rgba(93, 78, 96, ...)` → `$text-primary` 相关
- **Login.vue**：保持局部变量（`$pink-100~500`）不变，仅替换独立散落的 `#hex` 值
- **NutritionAnalysis.vue**：图表色 → `$chart-color-*`
- **FormulaList.vue / MaterialList.vue / SalesmanList.vue**：hover 态色 → `$overlay-pink-*` + `$brand-primary-light-*`
- **Form 类页面**：边框/focus 色 → `$border-color` + `$brand-primary-light` 变体

#### Step 3：清理重复的 TDesign 样式覆盖

Home.vue 中约 **180 行** `:deep(.t-button)` 样式覆盖应在以下两个层面处理：

1. **全局层（main.scss）**：提取按钮/表格/分页的 TDesign 主题覆盖，避免子页面重复声明
2. **组件层**：子页面中删除重复的按钮样式覆盖，继承全局定义

```scss
// main.scss 新增全局 TDesign 覆盖
@layer components {
  .t-button--theme-primary { /* 渐变主题 */ }
  .t-button--theme-default { /* 边框主题 */ }
  .t-table { /* 表格主题 */ }
  .t-pagination { /* 分页主题 */ }
}
```

### 3.4 预期效果

- 硬编码色值出现次数：**344 → < 30**（仅保留必要的局部装饰色）
- 全局 TDesign 覆盖重复代码减少 **~60%**

---

## 四、P1 — 微交互动效增强

### 4.1 目标

为子页面添加 hover 态、过渡动画、列表项入场动画等微交互，提升操作感知反馈。

### 4.2 现状

- 登录页动效：丰富（浮动爱心、星光闪烁、猫咪弹跳、按钮涟漪）✅
- Home.vue 动效：丰富（导航折叠、卡片 hover、按钮按压、路由切换）✅
- 子页面动效：几乎为零 ❌（除少数 hover 变色外无过渡）

### 4.3 优化方案

#### 4.3.1 列表页表格行入场动画

```scss
// 表格行依次入场
:deep(.t-table__body .t-table__row) {
  animation: rowFadeIn 0.3s ease both;

  @for $i from 1 through 20 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.03}s;
    }
  }
}

@keyframes rowFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

#### 4.3.2 表单输入框 focus 微动效

```scss
// 输入框 focus 时标签上浮 + 边框色过渡（已有部分实现，统一规范）
:deep(.t-input),
:deep(.t-textarea__inner),
:deep(.t-select-input) {
  transition: border-color $transition-normal, box-shadow $transition-normal;
}
```

#### 4.3.3 操作按钮反馈增强

```scss
// 操作按钮统一 hover / active 效果
.action-btn {
  transition: all $transition-smooth;

  &:hover {
    transform: translateY(-1px);
    box-shadow: $shadow-brand;
  }

  &:active {
    transform: translateY(0) scale(0.97);
  }
}
```

#### 4.3.4 页面切换时内容渐入

```scss
// 在 router-view transition 中增加缩放感
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.99);
}
```

#### 4.3.5 空状态插画呼吸动画

```scss
:deep(.t-empty__image) {
  svg {
    animation: emptyFloat 3s ease-in-out infinite;
  }
}

@keyframes emptyFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

### 4.4 无障碍动效

所有动画需尊重用户偏好：

```scss
// main.scss 全局添加
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 五、P2 — 无障碍可访问性

### 5.1 目标

满足 WCAG 2.1 AA 级核心标准，让应用对键盘导航用户和屏幕阅读器用户可用。

### 5.2 现状

- `aria-*` 属性使用：**0 次**
- `role` 属性使用：**0 次**
- `tabindex` 使用：**0 次**
- 键盘导航：仅依赖浏览器默认 + TDesign 组件内置

### 5.3 执行方案

#### 5.3.1 语义化 HTML 增强

| 位置 | 当前 | 改进 |
|------|------|------|
| 导航菜单 | `<div class="nav-item">` | `<nav><ul><li role="menuitem" tabindex="0">` |
| 搜索输入 | 仅有 `placeholder` | 添加 `aria-label="搜索配方"` |
| 表格 | TDesign 默认 | 确保排序/筛选按钮有 `aria-label` |
| 表单字段 | 仅有 `placeholder` | 添加关联的 `<label for="...">` 或 `aria-label` |
| 弹窗/抽屉 | TDesign 默认 | 确保焦点陷阱正确工作 |
| Toast 消息 | TDesign MessagePlugin | 确保有 `role="alert"` / `aria-live="polite"` |

#### 5.3.2 焦点可见性

```scss
// 全局焦点环
:focus-visible {
  outline: 2px solid $brand-primary;
  outline-offset: 2px;
  border-radius: $radius-sm;
}

// 移除鼠标点击时的焦点环（保留键盘导航时的焦点环）
:focus:not(:focus-visible) {
  outline: none;
}
```

#### 5.3.3 键盘导航

- 导航菜单：支持 `↑` / `↓` / `Enter` / `Escape` 键操作
- 列表页：支持 `Tab` 在搜索框、表格行、分页器之间切换
- 侧边栏折叠：支持快捷键（如 `Ctrl+B`）切换

#### 5.3.4 颜色对比度

- 当前 `$text-primary: #5D4E60` 在 `$bg-page: #FFF9F7` 上的对比度 ≈ 6.8:1 ✅（AA 达标）
- `$text-secondary: #9B8FA0` 在白色背景上的对比度 ≈ 3.2:1 ❌（未达 AA 4.5:1）
  - 建议调整为 `#7B7080`（对比度 ≈ 5.1:1）

### 5.4 优先级

1. 焦点可见性 + 颜色对比度（快速见效）
2. 表单字段 aria-label
3. 导航语义化
4. 键盘快捷键

---

## 六、P3 — 主题系统 & 性能优化

### 6.1 CSS 变量化（为暗色模式铺路）

将 `design-tokens.scss` 中的 SCSS 变量同步输出为 CSS 自定义属性，使运行时切换主题成为可能。

```scss
// theme.css 中定义 CSS 变量
:root {
  --color-brand-primary: #FF6B8A;
  --color-bg-page: #FFF9F7;
  --color-text-primary: #5D4E60;
  // ... 所有 token
}

// 暗色模式（预留，暂不实现）
// [data-theme="dark"] {
//   --color-brand-primary: #FF8FAB;
//   --color-bg-page: #1A1520;
//   --color-text-primary: #E8DFE8;
// }
```

### 6.2 性能优化

| 优化项 | 说明 | 预期收益 |
|--------|------|---------|
| **路由预加载** | 对高频页面添加 `webpackPrefetch: true` | 首次点击无延迟 |
| **图片/资源懒加载** | 空状态图片、装饰性 SVG 使用 lazy | 减少首屏负载 |
| **CSS 作用域检查** | 确保 `:deep()` 选择器不造成样式泄漏 | 避免运行时冲突 |
| **骨架屏过渡** | 数据加载完成后骨架屏 → 实际内容添加淡入过渡 | 消除"闪白"感 |

### 6.3 代码结构优化

```
建议的样式文件分层：
styles/
├── design-tokens.scss    ← 所有 token 定义（唯一定义来源）
├── _variables.scss       ← @forward tokens（向后兼容）
├── theme.css             ← CSS 变量 + :root 定义
├── _td-overrides.scss    ← TDesign 全局样式覆盖
├── main.scss             ← 入口：导入上述所有 + 全局样式
└── transitions.scss      ← 路由/组件过渡动画定义
```

---

## 七、执行路线图

### Phase 1：基础夯实（P0）

| 任务 | 涉及文件 | 预估工作量 |
|------|---------|-----------|
| 补充 design-tokens 变量 | `design-tokens.scss` | 0.5h |
| 提取全局 TDesign 覆盖 | 新建 `_td-overrides.scss`，修改 `main.scss` | 1.5h |
| 列表页色值替换 | MaterialList, FormulaList, SalesmanList | 2h |
| Home.vue 样式精简 | Home.vue, main.scss | 2h |

### Phase 2：体验提升（P1 微交互动效）

| 任务 | 涉及文件 | 预估工作量 |
|------|---------|-----------|
| 表单页色值替换 | MaterialForm, FormulaForm, SalesmanForm | 1.5h |
| 详情页色值替换 | MaterialDetail, FormulaDetail, SalesmanDetail | 1.5h |
| 其他页面色值替换 | Nutrition*, ExportCenter, Tools, Versions | 2h |
| 微交互动效添加 | 全局 mixin + 各页面 | 2h |

### Phase 3：品质保障（P2 无障碍 + P3 主题系统）

| 任务 | 涉及文件 | 预估工作量 |
|------|---------|-----------|
| 无障碍基础 | main.scss, Home.vue, 各表单页 | 2h |
| CSS 变量化 | theme.css, design-tokens.scss | 1.5h |
| 性能优化 | vite.config.ts, 各路由 | 1h |
| 代码清理 | 删除空目录、冗余组件 | 0.5h |

**总预估工作量：约 15.5 小时**

---

## 八、验收标准

### 8.1 色值统一

- [ ] `grep -r "rgba\|#[0-9a-fA-F]\{6\}" src/views/` 的硬编码色值数量 < 30
- [ ] 所有 `#hex` 色值均可追溯到 `design-tokens.scss` 或合理的局部装饰变量

### 8.2 动效

- [ ] 列表页有行入场动画
- [ ] 按钮 hover/active 有视觉反馈
- [ ] 页面切换有过渡动画
- [ ] `prefers-reduced-motion` 媒体查询已添加

### 8.3 无障碍

- [ ] 所有表单输入有关联 label 或 aria-label
- [ ] 焦点环在所有交互元素上可见
- [ ] `$text-secondary` 对比度 ≥ 4.5:1

---

## 附录：文件清单

### A. 现有页面（19 个）

| 路径 | 类型 | 响应式 | 硬编码 | 动效 |
|------|------|:------:|:------:|:----:|
| `views/auth/Login.vue` | 认证 | ✅ | 高 | ✅ |
| `views/auth/Register.vue` | 认证 | ❌ | 高 | ✅ |
| `views/Home.vue` | 布局壳 | ✅ | 高 | ✅ |
| `views/formulas/RecentFormulas.vue` | 列表 | ❌ | 低 | ❌ |
| `views/formulas/FormulaList.vue` | 列表 | ❌ | 中 | ❌ |
| `views/formulas/FormulaDetail.vue` | 详情 | ❌ | 低 | ❌ |
| `views/formulas/FormulaForm.vue` | 表单 | ❌ | 低 | ❌ |
| `views/materials/MaterialList.vue` | 列表 | ❌ | 中 | ❌ |
| `views/materials/MaterialDetail.vue` | 详情 | ❌ | 低 | ❌ |
| `views/materials/MaterialForm.vue` | 表单 | ❌ | 低 | ❌ |
| `views/salesmen/SalesmanList.vue` | 列表 | ❌ | 中 | ❌ |
| `views/salesmen/SalesmanDetail.vue` | 详情 | ❌ | 低 | ❌ |
| `views/salesmen/SalesmanForm.vue` | 表单 | ❌ | 低 | ❌ |
| `views/nutrition/NutritionAnalysis.vue` | 图表 | ❌ | 高 | ❌ |
| `views/nutrition/NutritionProfiles.vue` | 列表 | ❌ | 低 | ❌ |
| `views/exports/ExportCenter.vue` | 列表 | ❌ | 中 | ❌ |
| `views/versions/VersionList.vue` | 列表 | ❌ | 低 | ❌ |
| `views/versions/VersionCompare.vue` | 详情 | ❌ | 低 | ❌ |
| `views/Tools.vue` | 工具 | ❌ | 高 | 低 |

### B. 现有组件（3 个）

| 路径 | 用途 |
|------|------|
| `components/Layout/AppLayout.vue` | 旧版布局（与 Home.vue 重叠，建议评估保留） |
| `components/Skeleton/PageSkeleton.vue` | 骨架屏（已完善，需添加色值 token） |
| `components/ExcelImportPanel.vue` | Excel 导入面板 |

### C. 现有样式文件（5 个）

| 路径 | 用途 |
|------|------|
| `assets/styles/design-tokens.scss` | 设计令牌定义（核心） |
| `assets/styles/variables.scss` | 向后兼容变量别名 |
| `assets/styles/main.scss` | 全局入口样式 |
| `assets/styles/theme.css` | CSS 变量定义 |
| `assets/styles/_td-cover.scss` | （建议新建）TDesign 全局覆盖 |
