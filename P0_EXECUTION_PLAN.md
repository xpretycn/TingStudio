# P0 阶段详细执行规划 — 色值统一 & 代码清理

> **阶段定位**：基础夯实，为后续 P1~P3 提供干净的设计令牌体系
> **预估总工时**：6 小时（原计划 6h，含缓冲）
> **执行原则**：每次提交保持应用可运行，不改变任何业务逻辑

---

## 一、核心目标与关键里程碑

### 1.1 核心目标

| # | 目标 | 可量化指标 |
|---|------|-----------|
| G1 | 消除子页面硬编码色值 | views/ 硬编码色值从 ~284 降至 < 50（仅保留 SVG 装饰色） |
| G2 | 补全 design-tokens 语义变量 | 新增 ~30 个 token，覆盖所有高频硬编码色值 |
| G3 | 提取全局 TDesign 样式覆盖 | 从 Home.vue 中提取 ~180 行重复样式到 main.scss |
| G4 | 统一认证页局部变量 | Login.vue / Register.vue 中的 `$pink-*` 改为引用全局 token |

### 1.2 关键里程碑

```
M1 ████████░░  Token 体系补全           ── 0.5h  ── design-tokens.scss 可编译
M2 ██████████████░░░░░░░░░░░  全局 TDesign 覆盖提取  ── 1.5h  ── Home.vue :deep 样式缩减 60%
M3 ████████████████████████░░  列表页色值替换      ── 1.5h  ── 3 个 List 页面零硬编码
M4 ████████████████████████████████████  表单/详情/工具页  ── 1.5h  ── 6 个页面硬编码清除
M5 ██████████████████████████████████████████  Home.vue + Auth  ── 1.0h  ── 主框架/认证页统一
```

---

## 二、当前基线数据（精确扫描结果）

### 2.1 硬编码色值分布

| 文件 | rgba | #hex | 合计 | 类别 |
|------|------|------|------|------|
| **Home.vue** | 68 | 22 | **90** | 主框架（布局壳） |
| **Login.vue** | 15 | 72 | **87** | 认证页（含 SVG 插画） |
| **NutritionAnalysis.vue** | 15 | 17 | **32** | 图表页（含 JS 动态色） |
| **Register.vue** | 8 | 22 | **30** | 认证页（含 SVG 插画） |
| **AppLayout.vue** | 5 | 11 | **16** | 旧版布局组件 |
| **FormulaList.vue** | 16 | 0 | **16** | 配方列表 |
| **Tools.vue** | 5 | 10 | **15** | 工具箱 |
| **MaterialList.vue** | 12 | 0 | **12** | 原料列表 |
| **SalesmanList.vue** | 9 | 0 | **9** | 销售员列表 |
| **FormulaDetail.vue** | 8 | 1 | **9** | 配方详情 |
| **RecentFormulas.vue** | 7 | 0 | **7** | 最近配方 |
| **MaterialForm.vue** | 4 | 1 | **5** | 原料表单 |
| **NutritionProfiles.vue** | 3 | 0 | **3** | 营养标准 |
| **PageSkeleton.vue** | 0 | 6 | **6** | 骨架屏组件 |
| **VersionList.vue** | 1 | 0 | **1** | 版本列表 |
| **FormulaForm.vue** | 0 | 1 | **1** | 配方表单 |
| **SalesmanForm.vue** | 2 | 0 | **2** | 销售员表单 |
| **合计** | **178** | **163** | **~337** | |

> **说明**：hex 统计包含 SVG 属性中的 `fill="#FFB5C8"` 等，这些属于插画装饰色，不纳入本次替换范围。实际需要替换的 CSS/JS 硬编码约 **~200 处**。

### 2.2 已存在的 token 变量

`design-tokens.scss` 已定义 **142 行**，涵盖：
- 品牌色 6 级（primary / primary-light~darkest）
- 背景色 5 种（page / container / hover 等）
- 文字色 6 种（primary / regular / secondary / placeholder / white-*）
- 边框色 2 种
- 状态色 5 种（success / warning / danger / info / info-dark）
- 装饰色 6 种（blush / ear / skin / lavender / cream）
- 渐变 5 种
- 阴影 10 种
- 动效 4 种

### 2.3 缺失的 token 变量（需要新增）

| 类别 | 缺失的 token | 对应的硬编码值 | 出现频次 |
|------|-------------|---------------|---------|
| **覆盖层** | `$overlay-light` | `rgba(255, 255, 255, 0.6~0.98)` | ~20 次 |
| **覆盖层-粉** | `$overlay-pink-*` | `rgba(255, 143, 171, 0.08~0.45)` | ~25 次 |
| **覆盖层-边框** | `$overlay-pink-border-*` | `rgba(255, 181, 200, 0.15~0.3)` | ~15 次 |
| **覆盖层-功能色** | `$color-*-light` | `rgba($color-success, 0.06~0.3)` | ~12 次 |
| **图表色** | `$chart-color-*` | `#FFE066` `#A8E6CF` `#B8D4E3` 等 | ~10 次 |
| **装饰渐变** | `$gradient-tool-*` | `linear-gradient(135deg, #E8D5F5, #D4B8F0)` | ~6 次 |
| **骨架屏** | `$skeleton-shimmer` | `#FFF5F7` | 5 次 |
| **表格** | `$bg-table-row-hover` | `#FFFBFA` | 1 次 |
| **表格** | `$bg-table-row-stripe` | `#FFFDFC` | 1 次 |
| **提示** | `$color-warning-orange` | `#E8703A` / `#FAAD14` | 3 次 |
| **文字** | `$text-caption-muted` | `#C8AAB8` / `#C8C0CC` | 3 次 |
| **背景** | `$bg-cool-gray` | `#F8F9FA~#F1F3F4` | 2 次 |
| **背景** | `$bg-pink-warm` | `#FFF5FB` / `#FFF5EE` | 3 次 |

---

## 三、任务分解与时间表

### Task 1：补充 design-tokens.scss 变量（0.5h）

**目标**：补全所有缺失的语义 token，作为后续替换的"词汇表"。

**执行内容**：

在 `design-tokens.scss` 末尾新增以下分组：

```scss
// ─── 9. 覆盖层/半透明色 ──────────────────────────────────
$overlay-white-60:    rgba(255, 255, 255, 0.6);
$overlay-white-70:    rgba(255, 255, 255, 0.7);
$overlay-white-80:    rgba(255, 255, 255, 0.8);
$overlay-white-82:    rgba(255, 255, 255, 0.82);
$overlay-white-90:    rgba(255, 255, 255, 0.9);
$overlay-white-92:    rgba(255, 255, 255, 0.92);
$overlay-white-98:    rgba(255, 255, 255, 0.98);

$overlay-pink-05:     rgba(255, 143, 171, 0.05);
$overlay-pink-08:     rgba(255, 143, 171, 0.08);
$overlay-pink-10:     rgba(255, 143, 171, 0.1);
$overlay-pink-12:     rgba(255, 143, 171, 0.12);
$overlay-pink-15:     rgba(255, 143, 171, 0.15);
$overlay-pink-20:     rgba(255, 143, 171, 0.2);
$overlay-pink-25:     rgba(255, 143, 171, 0.25);
$overlay-pink-30:     rgba(255, 143, 171, 0.3);
$overlay-pink-35:     rgba(255, 143, 171, 0.35);
$overlay-pink-40:     rgba(255, 143, 171, 0.4);
$overlay-pink-45:     rgba(255, 143, 171, 0.45);

$overlay-pink-lighter-15: rgba(255, 181, 200, 0.15);
$overlay-pink-lighter-20: rgba(255, 181, 200, 0.2);
$overlay-pink-lighter-25: rgba(255, 181, 200, 0.25);
$overlay-pink-lighter-30: rgba(255, 181, 200, 0.3);

// 品牌色阴影系列
$shadow-brand-xs:   0 2px 8px rgba(255, 107, 138, 0.15);
$shadow-brand-sm:   0 4px 12px rgba(255, 107, 138, 0.25);
$shadow-brand-md:   0 4px 16px rgba(255, 107, 138, 0.3);
$shadow-brand-lg:   0 8px 24px rgba(255, 107, 138, 0.4);
$shadow-danger-sm:  0 4px 12px rgba(227, 77, 89, 0.35);
$shadow-danger-xs:  0 0 0 2px rgba(227, 77, 89, 0.12);
$shadow-danger-xxs: 0 0 0 4px rgba(227, 77, 89, 0.08);

// 功能色覆盖层
$color-success-light:   rgba(123, 198, 126, 0.06);
$color-success-medium:  rgba(123, 198, 126, 0.1);
$color-success-strong:  rgba(123, 198, 126, 0.3);
$color-warning-light:   rgba(240, 160, 64, 0.06);
$color-warning-medium:  rgba(240, 160, 64, 0.1);
$color-danger-light:    rgba(227, 77, 89, 0.04);
$color-danger-medium:   rgba(227, 77, 89, 0.06);
$color-danger-strong:   rgba(227, 77, 89, 0.1);
$color-info-light:      rgba(24, 144, 255, 0.06);
$color-info-medium:     rgba(24, 144, 255, 0.1);
$color-info-strong:     rgba(24, 144, 255, 0.3);

// ─── 10. 图表专用色板 ───────────────────────────────────
$chart-energy:    #FFE066;
$chart-energy-deep: #FFD700;
$chart-protein:   #FF8FAB;
$chart-protein-deep: #FF6B8A;
$chart-fat:       #A8E6CF;
$chart-fat-deep:  #7BC96F;
$chart-carb:      #B8D4E3;
$chart-carb-deep: #7EB6D9;
$chart-sodium:    #DDA0DD;
$chart-sodium-deep: #BA55D3;
$chart-progress-good:   #52C41A;
$chart-progress-warn:   #FAAD14;
$chart-progress-bad:    #FF4D4F;

// ─── 11. 附加背景/文字色 ────────────────────────────────
$bg-table-row-hover:  #FFFBFA;
$bg-table-row-stripe: #FFFDFC;
$bg-pink-warm:        #FFF5FB;
$bg-pink-peach:       #FFF5EE;
$bg-cool-gray:        #F8F9FA;
$bg-cool-gray-deep:   #F1F3F4;
$skeleton-shimmer:    #FFF5F7;
$skeleton-border:     #FFF5F3;

$text-caption-muted:  #C8AAB8;
$text-dim:            #C8C0CC;
$text-dark:           #2D2D2D;

$color-warning-orange: #E8703A;
$decor-mauve:         #E8D5F5;
$decor-mauve-deep:    #D4B8F0;

// 工具箱渐变色
$gradient-tool-pink:    linear-gradient(135deg, #FFB5C8, #FF8FAB);
$gradient-tool-purple:  linear-gradient(135deg, #E8D5F5, #D4B8F0);
$gradient-tool-blue:    linear-gradient(135deg, #B8D8F0, #9BC5F0);
$gradient-tool-orange:  linear-gradient(135deg, #F5D8B8, #F0C5A0);
$gradient-tool-green:   linear-gradient(135deg, #D8F5D8, #C5F0C5);
$gradient-tool-gray:    linear-gradient(135deg, #F0F0F0, #E0E0E0);
$gradient-danger:       linear-gradient(135deg, #FF6B8A, #E34D59);
$gradient-brand-warm:   linear-gradient(135deg, rgba(255, 248, 245, 0.98), rgba(255, 240, 243, 0.98));
```

**依赖**：无
**验收**：`npm run build` 编译通过，无新错误
**风险**：极低（纯新增，不修改已有变量）

---

### Task 2：提取全局 TDesign 覆盖样式（1.5h）

**目标**：将 Home.vue 中重复的 `:deep(.t-*)` 样式提取到 `main.scss`，减少 ~60% 冗余代码。

**问题分析**：

Home.vue 中存在 **5 个独立的 TDesign 组件样式覆盖区域**：

| 区域 | 行号 | 选择器 | 当前硬编码 |
|------|------|--------|-----------|
| A. 引导区按钮 | 1060-1079 | `.guide-action :deep(.t-button--theme-primary)` | 渐变使用 `$pink-400/$pink-500` |
| B. 头部默认按钮 | 1147-1159 | `.header-actions .t-button--theme-default` | `rgba(255,255,255,0.9)` |
| C. 工具栏按钮 | 1320-1347 | `.toolbar .t-button--theme-*` | `rgba(255,255,255,0.9)` |
| D. 快捷操作按钮 | 1360-1378 | `.toolbar-right .t-button--theme-primary` | `rgba(255,107,138,0.3~0.4)` |
| E. 全局按钮 | 1482-1560 | `:deep(.t-button)` | 最完整的覆盖块 |

**同时覆盖**：
- `:deep(.t-table)` 表格样式（1399-1448）
- `:deep(.t-pagination)` 分页样式（1589+）
- `:deep(.t-empty)` 空状态样式
- `:deep(.t-card)` 表单卡片样式（1473-1478）

**执行步骤**：

**Step 2a**：将 main.scss 中已有的 TDesign 覆盖与 Home.vue 的覆盖合并
- main.scss 已有完整的按钮/表格/分页覆盖（103-308行）
- Home.vue 中 1482-1560 的按钮覆盖与 main.scss **完全重复**

**Step 2b**：Home.vue 中的 `:deep(.t-button)` 块（1482-1560）全部删除，因为 main.scss 已有等效覆盖

**Step 2c**：将 Home.vue 中 `:deep(.t-table)` 的特有样式（表格边框、表头渐变背景、行 hover）合并到 main.scss 的 `.t-table` 块中

**Step 2d**：将 Home.vue 中的认证页局部变量 `$pink-100~500` 替换为 `design-tokens.scss` 中的 `$brand-primary-*` 系列变量

**Step 2e**：将区域 A-D 中的局部按钮覆盖精简为仅保留布局特殊尺寸差异，颜色/阴影全部由全局继承

**涉及文件**：
| 文件 | 操作 | 预估改动量 |
|------|------|-----------|
| `main.scss` | 扩展 TDesign 覆盖块 | +30 行 |
| `Home.vue` | 删除重复 :deep 块，替换 $pink-* | -150 行，净减 ~120 行 |
| `design-tokens.scss` | 新增 `$gradient-danger` 等 | +2 行 |

**依赖**：Task 1 完成
**验收**：Home.vue 在浏览器中视觉无变化
**风险**：中 — 删除 Home.vue 中的 `:deep()` 可能影响子组件内的 TDesign 组件样式优先级。需逐个区域验证。

---

### Task 3：列表页色值替换（1.5h）

**目标**：将 3 个核心列表页 + 2 个辅助列表页的硬编码色值全部替换为 token。

**涉及文件**（按工作量排序）：

| 文件 | rgba | #hex | 替换策略 |
|------|------|------|---------|
| FormulaList.vue | 16 | 0 | `rgba(255,107,138,...)` → `$shadow-brand-*`；`rgba($color-*...)` → `$color-*-light/medium/strong`；`rgba(255,255,255,...)` → `$overlay-white-*` |
| MaterialList.vue | 12 | 0 | 同上 |
| SalesmanList.vue | 9 | 0 | 同上 |
| RecentFormulas.vue | 7 | 0 | `rgba($color-*)` 已使用 SCSS 变量，仅需确保命名一致 |
| VersionList.vue | 1 | 0 | `rgba(255,107,138,0.06)` → `$shadow-xs` |
| NutritionProfiles.vue | 3 | 0 | 同 FormulaList |

**通用替换映射表**：

```
rgba(255, 107, 138, 0.06)  → $shadow-xs
rgba(255, 107, 138, 0.1)   → (合并到 shadow 需新定义，用 $shadow-brand-xs 或 inline)
rgba(255, 143, 171, 0.2)   → $overlay-pink-20
rgba(227, 77, 89, 0.4)     → (新 token $shadow-danger-strong)
rgba(255, 255, 255, 0.9)   → $overlay-white-90
rgba($color-info, 0.3)      → $color-info-strong
rgba($color-info, 0.06)     → $color-info-light
rgba($color-info, 0.1)      → $color-info-medium
rgba($color-success, 0.3)   → $color-success-strong
rgba($color-success, 0.06)  → $color-success-light
rgba($color-success, 0.08)  → (新 token $color-success-light-2 或直接用 0.1)
rgba($color-danger, 0.2)    → (新 token $color-danger-strong-2)
rgba($color-danger, 0.06)   → $color-danger-medium
rgba($color-danger, 0.1)    → $color-danger-strong
```

**依赖**：Task 1 完成
**验收**：每个文件替换后 `grep -c "rgba\|#hex"` 结果为 0（CSS style 部分）
**风险**：低 — 纯样式替换，不涉及业务逻辑

---

### Task 4：表单页、详情页、工具箱色值替换（1.5h）

**涉及文件**：

| 文件 | 改动量 | 特殊说明 |
|------|--------|---------|
| FormulaDetail.vue | 9处 | 含 1 个内联 style `color: #E8703A` → 需改为 class |
| MaterialForm.vue | 5处 | 含 1 个 `#FFF5FB` 渐变终点 |
| SalesmanForm.vue | 2处 | 已使用 `rgba($color-danger,...)` 格式 |
| Tools.vue | 15处 | 含 JS 对象中的 `bgColor` 硬编码渐变 → 提取为常量 |
| PageSkeleton.vue | 6处 | `#FFF5F7` 骨架屏闪烁色 |
| NutritionAnalysis.vue | 32处 | 最复杂：含 JS 动态 `progressColor` 和模板中的 `iconBg` 硬编码 |
| FormulaForm.vue | 1处 | 内联 `color: #999` |
| AppLayout.vue | 16处 | 旧版布局组件，含 SVG 装饰色 |

**NutritionAnalysis.vue 特殊处理**：

JS 中的动态颜色赋值：
```javascript
// Before（硬编码）
let progressColor = '#FF8FAB'
progressColor = '#52C41A'
progressColor = '#FAAD14'
progressColor = '#FF4D4F'

// After（引用常量）
import { chartProgressGood, chartProgressWarn, chartProgressBad, chartProtein } from '@/assets/styles/design-tokens'
let progressColor = chartProtein
progressColor = chartProgressGood
progressColor = chartProgressWarn
progressColor = chartProgressBad
```

模板中的 `iconBg` 数组：
```javascript
// Before
iconBg: 'linear-gradient(135deg, #FFE066, #FFD700)'

// After
iconBg: chartEnergyGradient  // 或直接在 design-tokens 中定义
```

**依赖**：Task 1 完成
**验收**：所有文件 CSS 中无硬编码 rgba/hex（SVG fill/stroke 除外）
**风险**：低-中 — NutritionAnalysis.vue 的 JS 颜色值需确保运行时正确

---

### Task 5：Home.vue + Auth 页面统一（1.0h）

**目标**：统一 Home.vue 和 Login.vue / Register.vue 的样式变量引用。

**Home.vue 改动**：
- 替换所有 `rgba(255,107,138,...)` → `$shadow-brand-*` / `$overlay-pink-*`
- 替换所有 `rgba(255,255,255,...)` → `$overlay-white-*`
- 替换所有 `rgba(255,181,200,...)` → `$overlay-pink-lighter-*`
- 替换 `$pink-*` 局部变量 → `$brand-primary-*`
- 替换 `$text-main` / `$text-sub` → `$text-primary` / `$text-secondary`
- 保留 SVG 装饰色（`fill="#FFE8D6"` 等）不替换

**Login.vue 改动**：
- 将 `$pink-100~500` 等 12 个局部变量定义替换为 `@use` 引入 `design-tokens.scss`
- 将 CSS 中的 `$pink-*` 引用改为 `$brand-primary-*`
- 将 CSS 中的 `$text-main` / `$text-sub` 改为 `$text-primary` / `$text-secondary`
- 保留 SVG 装饰色和独立设计的局部装饰变量（如 `$peach`、`$mauve`）
- 替换散落的 `#C8C0CC` → `$text-dim`、`#C8AAB8` → `$text-caption-muted`

**Register.vue 改动**：
- 同 Login.vue 处理策略
- 将 `#FFF5EE` → `$bg-pink-peach`
- 将 `#C8AAB8` → `$text-caption-muted`

**依赖**：Task 2 完成（避免变量冲突）
**验收**：Login / Register 视觉无变化；Home.vue 所有功能正常
**风险**：中 — Login.vue 有大量局部 SCSS 变量和复杂的动画样式，替换需谨慎

---

## 四、依赖关系图

```
Task 1 (Token 补全)
  ├─→ Task 2 (TDesign 覆盖提取) ─→ Task 5 (Home + Auth)
  ├─→ Task 3 (列表页替换)
  └─→ Task 4 (表单/详情/工具替换)
```

> Task 2 和 Task 3/4 之间无依赖，可并行执行。Task 5 依赖 Task 2 完成。

---

## 五、资源需求

| 资源 | 说明 |
|------|------|
| **开发环境** | Node.js + Vite 前端开发服务器 |
| **浏览器** | Chrome DevTools（Elements 面板对比替换前后样式） |
| **设计参考** | `design-tokens.scss` 作为唯一定义来源 |
| **测试数据** | 后端 API 返回的示例数据（用于验证列表/详情/表单渲染） |

---

## 六、潜在风险与应对策略

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|---------|
| **R1: SCSS `@use` 与 `@import` 冲突** | 中 | 高 | Login.vue 当前使用 `<style lang="scss">` 无显式 import，依赖 vite 全局注入。改为显式 `@use '@/assets/styles/design-tokens.scss' as *` 即可 |
| **R2: `:deep()` 选择器删除后样式丢失** | 中 | 高 | 逐区域删除，每个区域删除后在浏览器中验证。若 main.scss 的全局覆盖因特异性不足而未生效，保留必要的 `:deep()` |
| **R3: JS 动态颜色值编译报错** | 低 | 中 | JS 不能直接使用 SCSS 变量，需额外创建 `tokens.ts` 导出常量文件，或使用 CSS 变量 `var(--chart-progress-good)` |
| **R4: SVG fill/stroke 色值误替换** | 低 | 中 | 仅替换 `<style>` 块内的色值，严格不触碰 `<template>` 中 SVG 属性 |
| **R5: `rgba($color-info, 0.3)` 格式替换为变量后 alpha 丢失** | 低 | 低 | 保留 SCSS 的 `rgba()` 函数用法，只替换纯数字 rgba 如 `rgba(255,107,138,0.06)` |
| **R6: Home.vue 删除大量样式后 diff 过大难以 review** | 中 | 低 | 每个 Task 独立提交，Task 2 内按区域分多次 commit |

---

## 七、验收标准（按 Task）

### Task 1 验收
- [ ] `design-tokens.scss` 新增 token 分组 9~11
- [ ] `npm run build` 编译通过
- [ ] 新增 token 无命名冲突（与 variables.scss 别名不冲突）

### Task 2 验收
- [ ] `main.scss` 中 TDesign 覆盖包含按钮/表格/分页/空状态/表单卡片
- [ ] Home.vue `:deep(.t-button)` 全局块已删除（1482-1560 行区域）
- [ ] Home.vue 子页面内按钮/表格/分页样式视觉不变
- [ ] Home.vue 净减代码 ≥ 100 行

### Task 3 验收
- [ ] FormulaList.vue CSS 中 0 个 `rgba(...)` 硬编码
- [ ] MaterialList.vue CSS 中 0 个 `rgba(...)` 硬编码
- [ ] SalesmanList.vue CSS 中 0 个 `rgba(...)` 硬编码
- [ ] 上述 3 个文件 `:deep(.t-button)` 覆盖已删除（由 main.scss 继承）

### Task 4 验收
- [ ] NutritionAnalysis.vue 中 JS 动态颜色已使用常量或 CSS 变量
- [ ] Tools.vue 中 6 个 `bgColor` 渐变已使用 token 变量
- [ ] PageSkeleton.vue 中 `#FFF5F7` → `$skeleton-shimmer`
- [ ] FormulaDetail.vue 内联 style `#E8703A` 已提取为 class

### Task 5 验收
- [ ] Home.vue 中 `$pink-*` 变量引用为 0
- [ ] Login.vue `$pink-*` 局部变量定义已删除，改为引用 `design-tokens.scss`
- [ ] Register.vue 同上
- [ ] 三文件在浏览器中视觉无变化

### 整体验收
- [ ] `grep -r "rgba(" src/views/ | grep -v "\.vue.*<template>" | wc -l` < 50
- [ ] `grep -r "rgba(" src/components/ | wc -l` < 10
- [ ] 所有页面功能正常（导航、列表 CRUD、表单提交、详情查看）

---

## 八、协作机制

### 8.1 分支策略
- 从 `main` 创建 `feature/p0-color-unification` 分支
- 每个 Task 独立 commit，格式：`p0(task-N): 简要描述`
- Task 2 完成后发起 PR，请求视觉回归验证

### 8.2 代码审查要点
- 确认无 `rgba()` 纯数字硬编码遗漏
- 确认 SVG 装饰色未被误替换
- 确认 `:deep()` 删除后子组件样式正常
- 确认无引入未定义的 SCSS 变量

### 8.3 回滚方案
- 每个 Task 为独立 commit，可 `git revert` 单独回滚
- Task 2 风险最高，如出现问题可先 revert 该 commit，保留 main.scss 原有覆盖

---

## 九、后续衔接

P0 完成后的代码库状态：
- `design-tokens.scss` 包含完整的 ~170+ 个 token
- `main.scss` 包含全局 TDesign 样式覆盖
- 所有子页面样式引用 token 而非硬编码

这为 P1（微交互动效增强）提供了干净的基础：
- P1 可直接使用 `$transition-*`、`$shadow-brand-*` 等 token 添加动效
- 无需关心色值一致性问题
- 可在 main.scss 中集中定义动效 mixin

---

*文档版本：v1.0 | 创建时间：2026-03-31*
