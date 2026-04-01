# P3 主题系统与性能优化 — 实施方案

> 基于 `FRONTEND_UIUX_OPTIMIZATION_PLAN.md` 第六章制定。P3 阶段聚焦于 **CSS 变量化**（为暗色模式铺路）、**性能优化**（路由预加载/构建产物）和 **代码结构优化**（样式分层/冗余清理）。与 P0~P2 无强依赖，但需在 P0 色值统一和 P2 无障碍完成后执行以获得最佳效果。

---

## 一、现状分析

### 1.1 CSS 变量现状

| 维度 | 状态 | 说明 |
|------|:----:|------|
| `theme.css` — CSS 自定义属性 | ⚠️ 部分完成 | 已有 `:root` 定义 40+ 变量，但与 `design-tokens.scss` 的 **260+ SCSS 变量**不同步 |
| SCSS → CSS 映射 | ❌ 手动维护 | 无自动化映射，新增 token 需人工同步到 `theme.css` |
| 运行时主题切换 | ❌ 未实现 | 无 `data-theme` 属性切换逻辑，无暗色模式变量定义 |
| TDesign 主题适配 | ❌ 未对接 | TDesign 组件仍使用其默认 CSS 变量，未接入 TingStudio 自定义色板 |
| `tokens.ts` JS 导出 | ⚠️ 部分完成 | 仅导出 36 个图表色常量，未覆盖品牌色/文字色/背景色等 |

### 1.2 性能现状

| 维度 | 当前值 | 目标 |
|------|:------:|:----:|
| 路由懒加载 | 100%（全部 `() => import()`） | 保持 + 高频路由 prefetch |
| `webpackPrefetch` | **0 处** | 高频页面 ≥ 5 处 |
| Vite 构建优化 | 默认配置 | 启用 chunk 分割 + gzip + CSS 代码分割 |
| `:deep()` 样式泄漏风险 | 18 个文件 × 1~14 处 | 审计并消除不必要的穿透 |
| 冗余组件 | `AppLayout.vue`（14 处 `:deep`），未使用 | 删除 |
| 硬编码色值残留 | 11 处 `rgba(...)` / `#hex` | ≤ 3 处（仅 SVG 内联装饰） |
| 重复样式代码 | Home.vue `:deep` 5 处 + 多子页面重复声明 | 提取至全局 |

### 1.3 样式架构现状

```
当前结构：
styles/
├── design-tokens.scss    ← 260+ SCSS 变量（唯一定义来源）✅
├── variables.scss       ← @forward tokens + 兼容别名 + stagger mixin ✅
├── theme.css             ← 40+ CSS 变量（手动维护，不同步）⚠️
├── main.scss             ← 入口：reset + utilities + TDesign 覆盖 + a11y
└── transitions.scss      ← @keyframes + 路由过渡 + prefers-reduced-motion ✅
```

**问题**：
- `main.scss` 已膨胀至 **454 行**，承担了 reset + utilities + TDesign 覆盖 + a11y 四种职责
- `theme.css` CSS 变量与 SCSS token 不同步，维护成本高
- `tokens.ts` 仅覆盖图表色，JS 无法动态获取品牌色/背景色等

---

## 二、WCAG/性能/架构 覆盖范围

### 2.1 本方案直接覆盖的改进

| 维度 | 改进项 | 预期收益 |
|------|--------|---------|
| **可维护性** | SCSS→CSS 变量自动同步 | 新增 token 时零人工操作 |
| **可维护性** | 样式文件职责拆分 | main.scss 从 454 行降至 ~100 行 |
| **可维护性** | 冗余组件清理 | 删除 AppLayout.vue（14 处 `:deep` 死代码） |
| **性能** | 路由预加载 | 高频页面首次点击零延迟 |
| **性能** | Vite 构建优化 | chunk 体积更小，缓存命中率更高 |
| **性能** | `:deep` 审计 | 消除潜在的运行时样式冲突 |
| **体验** | TDesign 主题对接 | 组件视觉与自定义设计系统完全统一 |

### 2.2 暗色模式（Phase 2 预留）

本方案 **不实现** 暗色模式 UI，仅完成 CSS 变量化基础设施。暗色模式的 `[data-theme="dark"]` 变量集和切换 UI 将作为独立迭代。

---

## 三、技术选型

| 决策 | 选择 | 理由 |
|------|------|------|
| CSS 变量生成方式 | SCSS `@function` + 编译时插值 | 零运行时依赖，与现有 SCSS 工作流无缝集成 |
| TDesign 主题接入 | CSS 变量覆盖 `tdesign-vue-next/es/style/index.css` 后声明 | 利用 CSS 级联优先级覆盖，无需额外配置 |
| 路由预加载 | Vite 魔法注释 `/* webpackChunkName: "xxx" */` + `webpackPrefetch` | 标准方案，Vite 内置支持 |
| 构建优化 | Vite `build.rollupOptions` chunk 分割 | 减少 main bundle 体积，提升缓存命中率 |
| 主题切换 API | Pinia store + `document.documentElement.setAttribute` | 响应式，可在任意组件中读取/切换主题 |
| `:deep` 审计方式 | 逐文件静态分析 + 重构为全局覆盖 | 避免运行时冲突 |

---

## 四、实施任务

### Task 1：CSS 变量化 — SCSS Token → CSS Custom Property 同步

**目标**：让 `theme.css` 与 `design-tokens.scss` 自动保持同步，新增/修改 token 无需手动维护两份。

**涉及文件**：`theme.css`, `variables.scss`, `design-tokens.scss`, `tokens.ts`

#### Step 1.1 — 重建 `theme.css` 为 SCSS 生成

将 `theme.css` 重构为 SCSS 文件，利用 SCSS 变量自动输出 CSS 自定义属性：

```scss
// theme-variables.scss（新建，由 main.scss 导入）
// ═══════════════════════════════════════════════════
// TingStudio CSS Custom Properties — 从 SCSS Token 自动生成
// 此文件是 design-tokens.scss 的 CSS 变量映射层
// ═══════════════════════════════════════════════════

:root {
  // ─── 品牌色 ───
  --color-primary:            #{$brand-primary};
  --color-primary-light:      #{$brand-primary-light};
  --color-primary-lighter:    #{$brand-primary-lighter};
  --color-primary-lightest:   #{$brand-primary-lightest};
  --color-primary-bg:         #{$brand-primary-bg};
  --color-primary-dark:       #{$brand-primary-dark};

  // ─── 背景色 ───
  --color-bg-page:            #{$bg-page};
  --color-bg-container:       #{$bg-container};
  --color-bg-container-alt:   #{$bg-container-alt};
  --color-bg-hover:           #{$bg-hover};

  // ─── 文字色 ───
  --color-text-primary:       #{$text-primary};
  --color-text-regular:       #{$text-regular};
  --color-text-secondary:     #{$text-secondary};
  --color-text-placeholder:   #{$text-placeholder};

  // ─── 边框色 ───
  --color-border:             #{$border-color};
  --color-border-light:       #{$border-color-light};

  // ─── 状态色 ───
  --color-success:            #{$color-success};
  --color-warning:            #{$color-warning};
  --color-danger:             #{$color-danger};
  --color-info:               #{$color-info};

  // ─── 圆角 ───
  --radius-xs:    #{$radius-xs};
  --radius-sm:    #{$radius-sm};
  --radius-md:    #{$radius-md};
  --radius-lg:    #{$radius-lg};
  --radius-xl:    #{$radius-xl};
  --radius-2xl:   #{$radius-2xl};
  --radius-3xl:   #{$radius-3xl};
  --radius-pill:  #{$radius-pill};

  // ─── 阴影 ───
  --shadow-xs:    #{$shadow-xs};
  --shadow-sm:    #{$shadow-sm};
  --shadow-md:    #{$shadow-md};
  --shadow-brand: #{$shadow-brand};
  --shadow-lg:    #{$shadow-lg};
  --shadow-xl:    #{$shadow-xl};

  // ─── 过渡 ───
  --transition-fast:   #{$transition-fast};
  --transition-normal: #{$transition-normal};
  --transition-slow:   #{$transition-slow};

  // ─── 布局 ───
  --header-height:   #{$header-height};
  --aside-width:     #{$aside-width};
  --content-padding: #{$content-padding};
}
```

#### Step 1.2 — 删除旧 `theme.css`，更新导入链

```scss
// main.scss 修改
// BEFORE:
@import './theme.css';

// AFTER:
@use './theme-variables.scss'; // 替换 @import './theme.css'
```

删除 `theme.css` 文件。

#### Step 1.3 — 完善 `tokens.ts` JS 导出

补充品牌色、背景色、文字色、状态色的 JS 导出，供 `<script>` 中动态绑定使用：

```typescript
// tokens.ts — 补充
export const brandPrimary = '#FF6B8A'
export const brandPrimaryLight = '#FF8FAB'
export const brandPrimaryLighter = '#FFB5C8'
export const brandPrimaryLightest = '#FFD6E0'
export const brandPrimaryBg = '#FFF0F3'

export const bgPage = '#FFF9F7'
export const bgContainer = '#FFFFFF'
export const bgHover = '#FFF0F3'

export const textPrimary = '#5D4E60'
export const textSecondary = '#7B7080'
export const textPlaceholder = '#D4C5D0'

export const colorSuccess = '#7BC67E'
export const colorWarning = '#F0A040'
export const colorDanger = '#E34D59'
export const colorInfo = '#1890FF'

// TDesign 主题覆盖对象（可直接传给 TDesign ConfigProvider）
export const tdesignTheme = {
  brandColor: brandPrimary,
  brandColorHover: brandPrimaryLight,
  brandColorActive: brandPrimaryDark ?? '#E8A0B0',
  brandColorLight: brandPrimaryBg,
}
```

#### Step 1.4 — TDesign 组件主题对接（可选增强）

在 `App.vue` 或 `main.ts` 中使用 TDesign `ConfigProvider` 注入自定义主题：

```vue
<!-- App.vue -->
<template>
  <t-config-provider :theme="customTheme">
    <router-view />
  </t-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const customTheme = computed(() => ({
  brandColor: '#FF6B8A',
  brandColorHover: '#FF8FAB',
  brandColorActive: '#E8A0B0',
  brandColorLight: '#FFF0F3',
}))
</script>
```

**预期产出**：
- `theme.css` → `theme-variables.scss`（SCSS 生成，与 token 同步）
- `tokens.ts` 扩展（覆盖 40+ 颜色常量）
- TDesign 组件视觉与 TingStudio 设计系统统一

---

### Task 2：样式架构重构 — 文件职责拆分

**目标**：将 `main.scss` 从 454 行单体拆分为职责清晰的模块文件。

**涉及文件**：新建 `_td-overrides.scss`, `_reset.scss`, `_utilities.scss`；修改 `main.scss`

#### Step 2.1 — 新建模块文件

**`_reset.scss`** — CSS Reset（~30 行）：
```scss
// 提取自 main.scss L1~43
*,
*::before,
*::after { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  height: 100%;
  font-family: $font-family;
  font-size: $font-size-body;
  line-height: $line-height-normal;
  background-color: $bg-page;
  color: $text-primary;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app { height: 100%; }

a {
  color: $brand-primary;
  text-decoration: none;
  transition: color $transition-fast;
  &:hover { color: $brand-primary-light; }
}
```

**`_utilities.scss`** — 工具类（~40 行）：
```scss
// 提取自 main.scss L70~103
// text-center, flex, gap-xs, mt-xs, mb-sm, p-md 等
```

**`_td-overrides.scss`** — TDesign 全局覆盖（~250 行）：
```scss
// 提取自 main.scss L104~417
// Card, Button, Input, Table, Tag, Link, Pagination, Form, Dialog, Collapse, Empty
```

**`_a11y.scss`** — 无障碍样式（~35 行）：
```scss
// 提取自 main.scss L419~453
// Skip Link, Focus Visible, TDesign 焦点环兼容
```

#### Step 2.2 — 重构 `main.scss` 入口

```scss
// main.scss — 瘦身为纯导入入口
@use './variables.scss' as *;
@use './transitions.scss' as *;
@use './theme-variables.scss';
@use './reset.scss';
@use './utilities.scss';
@use './td-overrides.scss';
@use './a11y.scss';
```

#### Step 2.3 — 滚动条样式保留在入口

滚动条样式（`::-webkit-scrollbar` 等）保留在 `main.scss` 或移至 `_reset.scss`，因为它属于全局基础样式。

**预期产出**：
- `main.scss`：从 454 行降至 ~15 行
- 新增 4 个职责清晰的模块文件
- 文件职责可读性大幅提升

---

### Task 3：性能优化 — 路由预加载与构建优化

**目标**：高频页面预加载 + 构建产物体积优化。

**涉及文件**：`router/index.ts`, `vite.config.ts`

#### Step 3.1 — 高频路由添加 `webpackPrefetch`

```typescript
// router/index.ts — 修改 component 导入

// 高频页面（登录后必经）：预加载
const RecentFormulas = () => import(/* webpackPrefetch: true */ '@/views/formulas/RecentFormulas.vue')
const FormulaList = () => import(/* webpackPrefetch: true */ '@/views/formulas/FormulaList.vue')
const MaterialList = () => import(/* webpackPrefetch: true */ '@/views/materials/MaterialList.vue')
const SalesmanList = () => import(/* webpackPrefetch: true */ '@/views/salesmen/SalesmanList.vue')

// 中频页面：预加载
const NutritionAnalysis = () => import(/* webpackPrefetch: true */ '@/views/nutrition/NutritionAnalysis.vue')
const ExportCenter = () => import(/* webpackPrefetch: true */ '@/views/exports/ExportCenter.vue')

// 低频页面：保持懒加载
// VersionList, VersionCompare, MaterialDetail, FormulaDetail 等保持原样
```

> **注意**：`webpackPrefetch` 在空闲时加载，不影响首屏性能。预加载 6 个页面预计增加 ~50KB 网络请求（gzip 后 ~15KB），可接受的权衡。

#### Step 3.2 — Vite 构建优化

```typescript
// vite.config.ts — 添加 build 配置
export default defineConfig({
  // ... 现有配置
  build: {
    // CSS 代码分割：将 CSS 提取为独立文件
    cssCodeSplit: true,

    // chunk 分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // TDesign 单独分包（~200KB，变更频率低）
          'vendor-tdesign': ['tdesign-vue-next'],
          // Vue 核心分包
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
```

#### Step 3.3 — 添加 gzip 压缩插件（可选）

```bash
npm install -D vite-plugin-compression
```

```typescript
// vite.config.ts
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    vue(),
    compression({
      algorithm: 'gzip',
      threshold: 1024, // 仅压缩 > 1KB 的文件
    }),
  ],
})
```

**预期产出**：
- 首次点击高频页面：0ms 加载延迟（已预加载）
- 主 bundle 体积：减少 ~200KB（TDesign 分包）
- 构建产物支持 gzip 压缩

---

### Task 4：代码清理 — 冗余组件与硬编码残留

**目标**：消除死代码、残留硬编码色值、不必要的 `:deep` 穿透。

**涉及文件**：`AppLayout.vue`(删除), 各 Vue 文件（`rgba` 替换）

#### Step 4.1 — 删除 `AppLayout.vue`

`components/Layout/AppLayout.vue` 包含 14 处 `:deep` 样式覆盖，且未被任何路由或组件引用（已在 P0 阶段被 `Home.vue` 替代）。

**操作**：
1. 全局搜索确认无引用（已验证：0 结果）
2. 删除 `components/Layout/AppLayout.vue`
3. 若 `Layout/` 目录为空则一并删除

#### Step 4.2 — 消除硬编码色值残留

当前残留 11 处 `rgba(...)` 硬编码：

| 文件 | 行号 | 当前值 | 替换为 |
|------|:----:|--------|--------|
| NutritionAnalysis.vue | 539 | `rgba(255, 107, 138, 0.1)` | `$overlay-pink-10` |
| NutritionAnalysis.vue | 605 | `rgba(255, 107, 138, 0.15)` | `$overlay-pink-15` |
| NutritionAnalysis.vue | 609 | `rgba(82, 196, 26, 0.3)` | 新增 `$color-success-alpha: rgba(82, 196, 26, 0.3)` 或使用 `$color-success-strong` |
| NutritionAnalysis.vue | 610 | `rgba(82, 196, 26, 0.25)` | 新增或近似 |
| NutritionAnalysis.vue | 613 | `rgba(250, 173, 20, 0.3)` | 新增 `$color-warning-alpha` |
| NutritionAnalysis.vue | 614 | `rgba(250, 173, 20, 0.25)` | 新增或近似 |
| NutritionAnalysis.vue | 617 | `rgba(255, 77, 79, 0.3)` | 新增 `$color-danger-alpha` |
| NutritionAnalysis.vue | 618 | `rgba(255, 77, 79, 0.25)` | 新增或近似 |
| FormulaDetail.vue | 250 | `rgba($color-warning, 0.25)` | `$color-warning-medium` |
| Home.vue | 977 | `rgba(255, 255, 255, 0.15)` | `$overlay-white-15` |
| Register.vue | 279 | `rgba(0, 0, 0, 0.04)` | 新增 `$overlay-black-05: rgba(0, 0, 0, 0.04)` 或保留 |

**Token 补充**（design-tokens.scss）：
```scss
// 11.7 功能色 alpha 变体（供营养卡片边框/阴影使用）
$color-success-alpha:  rgba(82, 196, 26, 0.3);
$color-success-alpha-light: rgba(82, 196, 26, 0.25);
$color-warning-alpha:  rgba(250, 173, 20, 0.3);
$color-warning-alpha-light: rgba(250, 173, 20, 0.25);
$color-danger-alpha:   rgba(255, 77, 79, 0.3);
$color-danger-alpha-light: rgba(255, 77, 79, 0.25);
$overlay-black-05:     rgba(0, 0, 0, 0.04);
```

> **例外**：`Login.vue:19` 的 `fill="rgba(255,255,255,0.15)"` 为 SVG 内联属性，SCSS 变量无法插入，可保留或改用 CSS `fill: var(--color-white-15)` + `--color-white-15: rgba(255,255,255,0.15)`。

#### Step 4.3 — `:deep()` 审计与优化

对 18 个文件共 67 处 `:deep` 进行分类处理：

| 类别 | 处理方式 | 预计数量 |
|------|---------|:--------:|
| **全局通用**（如 `:deep(.t-button)` 重复覆盖） | 提取到 `_td-overrides.scss` | ~15 处 |
| **页面局部且合理**（如特定表格列样式） | 保留 | ~40 处 |
| **可替换方案**（如 `:deep(.t-table)` 全局已有） | 删除冗余 | ~12 处 |

**审计重点文件**：
- `SalesmanList.vue`（7 处）、`MaterialList.vue`（7 处）、`FormulaList.vue`（9 处）— 检查是否有与 `main.scss` 重复的 TDesign 覆盖
- `Home.vue`（5 处）— 检查是否可提取为全局

**预期产出**：
- 删除 `AppLayout.vue`（-14 处 `:deep`）
- 消除 ~12 处冗余 `:deep`
- 硬编码色值从 11 处降至 ≤ 3 处

---

### Task 5：主题切换基础设施（预留暗色模式）

**目标**：实现主题切换的 Store + API 层，不实现暗色模式 UI 但预留完整接口。

**涉及文件**：新建 `stores/theme.ts`, `theme-variables.scss`(扩展)

#### Step 5.1 — 创建主题 Store

```typescript
// stores/theme.ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(
    (localStorage.getItem('ting-theme') as ThemeMode) || 'light'
  )

  // 应用主题到 DOM
  const applyTheme = (newMode: ThemeMode) => {
    document.documentElement.setAttribute('data-theme', newMode)
    localStorage.setItem('ting-theme', newMode)
    mode.value = newMode
  }

  // 初始化时应用
  applyTheme(mode.value)

  // 切换主题
  const toggleTheme = () => {
    applyTheme(mode.value === 'light' ? 'dark' : 'light')
  }

  return { mode, toggleTheme, applyTheme }
})
```

#### Step 5.2 — 扩展 `theme-variables.scss` 预留暗色变量

```scss
// theme-variables.scss — 在 :root 之后添加暗色模式占位
// ⚠️ 暗色模式值需在后续 Phase 2 中精心调校
// 当前仅作为结构预留，不启用

// [data-theme="dark"] {
//   --color-primary:            #FF8FAB;
//   --color-bg-page:            #1A1520;
//   --color-bg-container:       #241E2B;
//   --color-text-primary:       #E8DFE8;
//   --color-text-secondary:     #A99BB0;
//   --color-text-placeholder:   #6B5F70;
//   --color-border:             #3D3445;
//   --color-border-light:       #2D2535;
//   // ... 其余变量
// }
```

#### Step 5.3 — 暗色模式全局过渡（预留）

```scss
// _a11y.scss 中添加（与现有 focus-visible 共存）
// 主题切换时的全局颜色过渡（避免闪烁）
// html[data-theme-transitioning] * {
//   transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
// }
```

**预期产出**：
- `stores/theme.ts` — 可用的主题切换 API
- 暗色模式变量结构预留（注释状态）
- 切换逻辑已接入 `localStorage` 持久化

---

## 五、依赖关系与执行顺序

```
Task 2 (样式拆分) ─┐
                    ├──→ Task 1 (CSS 变量化)
Task 4.2 (Token 补充)┘
                          │
                          ▼
                   Task 4 (代码清理)
                          │
                          ▼
                   Task 3 (性能优化)
                          │
                          ▼
                   Task 5 (主题基础设施)
```

**建议执行顺序**：

| 序号 | Task | 依赖 | 预估时间 | 改动范围 |
|:----:|------|------|:--------:|---------|
| 1 | Task 2：样式架构重构 | 无 | 1.0h | 新建 4 个 SCSS 文件，修改 `main.scss` |
| 2 | Task 4.2：Token 补充 | 无（可与 Task 1 并行） | 0.5h | `design-tokens.scss`, `tokens.ts` |
| 3 | Task 1：CSS 变量化 | Task 2 | 1.0h | `theme.css`→`theme-variables.scss` |
| 4 | Task 4：代码清理 | Task 2, 4.2 | 1.5h | 删除 AppLayout + 色值替换 + `:deep` 审计 |
| 5 | Task 3：性能优化 | Task 4 | 0.5h | `router/index.ts`, `vite.config.ts` |
| 6 | Task 5：主题基础设施 | Task 1 | 0.5h | 新建 `stores/theme.ts` |
| | **总计** | | **5.0h** | **1 新 Store + 改 10 文件** |

---

## 六、性能与兼容性

### 6.1 对构建体积的影响

| 变更类型 | 预估变化 |
|---------|---------|
| `theme-variables.scss` 替代 `theme.css` | 0 KB（同等体积，编译后一致） |
| `tokens.ts` 扩展 | +0.5 KB（tree-shakable，仅使用部分被打包） |
| `stores/theme.ts` | +0.3 KB |
| Vite chunk 分割 | main bundle **-200KB**，新增 `vendor-tdesign` chunk |
| gzip 压缩 | 所有产物体积 ×0.3 |
| 删除 AppLayout.vue | -2 KB |

**净效果**：首屏 JS 体积减少 ~200KB（TDesign 分包按需加载）

### 6.2 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|:------:|:-------:|:------:|:----:|
| CSS Custom Properties | 49+ ✅ | 31+ ✅ | 9.1+ ✅ | 79+ ✅ |
| `data-theme` 属性选择器 | 1+ ✅ | 1+ ✅ | 1+ ✅ | 79+ ✅ |
| `webpackPrefetch` | 63+ ✅ | 不支持（优雅降级为懒加载） | 11.1+ ✅ | 79+ ✅ |
| `import.meta.glob` (Vite) | 87+ ✅ | 不适用 | 不适用 | 87+ ✅ |

### 6.3 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `:deep` 提取导致样式丢失 | 高 | 逐文件审计，提取前后截图对比 |
| Vite chunk 分割影响首屏 | 低 | `vendor-vue` 仍是首屏必需 chunk |
| `theme-variables.scss` 编译失败 | 中 | 编译后验证 `:root` CSS 变量完整性 |
| TDesign ConfigProvider 主题注入不生效 | 中 | 回退到 CSS 变量覆盖方案 |
| 删除 AppLayout.vue 后发现隐藏引用 | 低 | 已全局搜索确认 0 引用 |

---

## 七、验收标准

| # | 验收项 | 通过条件 | 验证方法 |
|---|--------|---------|---------|
| 1 | CSS 变量同步 | `theme-variables.scss` 中 `:root` 变量数量 ≥ design-tokens.scss 的核心变量数（品牌色 + 背景色 + 文字色 + 边框色 + 状态色 + 圆角 + 阴影） | 对比两文件变量列表 |
| 2 | `tokens.ts` 完整性 | 覆盖品牌色 6 个 + 背景色 4 个 + 文字色 4 个 + 状态色 4 个 + TDesign 主题对象 | 检查导出数量 |
| 3 | 样式文件分层 | `main.scss` 行数 ≤ 20 行，4 个子模块文件存在且职责正确 | 代码审查 |
| 4 | 构建无错误 | `vue-tsc --noEmit` 零错误 + `vite build` 成功 | 命令行 |
| 5 | 路由预加载 | 高频页面（RecentFormulas, FormulaList, MaterialList, SalesmanList, NutritionAnalysis, ExportCenter）有 `webpackPrefetch` | 检查 `router/index.ts` |
| 6 | Chunk 分割 | 构建产物包含 `vendor-tdesign` 和 `vendor-vue` 独立 chunk | 检查 `dist/assets/` |
| 7 | 冗余清理 | `AppLayout.vue` 已删除，全局搜索 0 引用 | `grep` 搜索 |
| 8 | 硬编码色值 | `grep 'rgba\|#[0-9a-fA-F]\{6\}' src/views/` 匹配数 ≤ 3 | 命令行 |
| 9 | `:deep` 审计 | 冗余 `:deep` 已消除，重复的 TDesign 覆盖已提取至全局 | 代码审查 |
| 10 | 主题 Store | `useThemeStore` 可切换 `light`/`dark`，DOM 正确设置 `data-theme` | DevTools 检查 `document.documentElement.dataset.theme` |
| 11 | 视觉回归 | 所有页面截图与改造前无可见差异 | 目视对比 |
| 12 | TDesign 主题 | TDesign 按钮/输入框/标签等组件使用 TingStudio 品牌色（而非 TDesign 默认蓝色） | 页面检查 |

---

## 八、后续迭代预览（Phase 2）

本方案完成后，Phase 2 可实施：

| 迭代 | 内容 | 前置条件 |
|------|------|---------|
| 暗色模式 UI | 取消 `theme-variables.scss` 中暗色变量注释 + 调校对比度 + 切换按钮 | Task 1, 5 |
| 组件级主题适配 | 检查各页面内联样式是否适配暗色模式 | 暗色模式 UI |
| 系统主题跟随 | `window.matchMedia('(prefers-color-scheme: dark)')` 自动切换 | 暗色模式 UI |
| 主题色自定义 | 允许用户选择品牌主色（如粉色/蓝色/绿色） | Task 5 |
