# P1 微交互动效增强 — 实施方案

> 基于 `FRONTEND_UIUX_OPTIMIZATION_PLAN.md` 第四章制定，详细技术方案与执行步骤。

---

## 一、现状分析

### 1.1 动效分布极不均衡

| 区域 | 动效丰富度 | 典型动效 |
|------|-----------|---------|
| **Login / Register** | 丰富 | 浮动爱心、星光闪烁、猫咪弹跳、按钮涟漪、卡片入场 |
| **Home.vue（侧边栏）** | 丰富 | 导航折叠、卡片 hover、按钮按压、路由 fade-slide |
| **Tools.vue** | 中等 | 卡片 hover 上浮 + 阴影、箭头位移 |
| **其他 14 个子页面** | 几乎为零 | 仅 FormulaList/VersionList 有 1~2 处 box-shadow transition |

### 1.2 现有动效基础设施

- `design-tokens.scss` 已定义 4 个动效变量：`$transition-fast`(0.15s)、`$transition-normal`(0.25s)、`$transition-slow`(0.35s)、`$transition-smooth`(0.3s cubic-bezier)
- `main.scss` 已全局覆盖 `.t-button` 的 hover/active 动效（translateY + scale + box-shadow）
- `main.scss` 已定义 `.t-table__row--hover td` 背景色切换
- `Home.vue` 已实现 `fade-slide` 路由过渡（0.3s cubic-bezier, translateY 20px）
- **缺失**：`prefers-reduced-motion` 媒体查询（0 处）
- **缺失**：表格行入场动画、表单焦点微动效、空状态呼吸动画、列表项 stagger 入场

### 1.3 核心问题

1. **子页面与框架页的体感断层**：从动效丰富的 Home 侧边栏进入子页面后，页面像"死"了一样
2. **操作反馈缺失**：表格行点击、按钮操作、状态变更等无视觉反馈
3. **数据加载切换生硬**：骨架屏 → 内容之间无过渡，产生"闪白"
4. **无障碍动效**：未尊重 `prefers-reduced-motion` 用户偏好

---

## 二、技术选型

### 2.1 动画方案：纯 CSS 优先

| 方案 | 选型 | 理由 |
|------|------|------|
| **入场/退场动画** | CSS `@keyframes` + `animation` | 无需 JS 介入，GPU 加速，浏览器自动优化 |
| **hover/active 微交互** | CSS `transition` | 已有 `design-tokens` 变量支持，零依赖 |
| **列表项 stagger 延迟** | SCSS `@for` 循环生成 `animation-delay` | 编译期展开，运行时零开销 |
| **骨架屏 → 内容切换** | Vue `<Transition>` + CSS opacity/transform | 利用现有 `fade-slide` 机制扩展 |
| **滚动触发动画** | 不引入 | 项目页面均为固定高度容器内滚动，无长页面场景 |
| **JS 动画库** | 不引入 | 避免增加 bundle 体积，CSS 能力已足够 |

### 2.2 性能准则

- **仅动画 `transform` 和 `opacity`**：这两项属性不触发 layout/paint，仅触发 composite，保证 60fps
- **避免动画 `width`/`height`/`top`/`left`/`margin`/`padding`**：这些属性触发 layout reflow
- **使用 `will-change` 谨慎声明**：仅在确实有性能问题时使用，不全局滥用
- **动画持续时间 < 300ms**：微交互响应阈值，超过会感觉"卡"

---

## 三、实施方案（5 个子任务）

### 3.1 Task 1：全局动效基础设施搭建

**目标**：创建独立动效样式文件，定义所有 `@keyframes` 和 `prefers-reduced-motion`，供全局复用。

**新建文件**：`frontend/src/assets/styles/transitions.scss`

```scss
// ═══════════════════════════════════════════════════════════════
// TingStudio Transitions — 动效定义
// 所有 @keyframes 和过渡类唯一定义处
// ═══════════════════════════════════════════════════════════════

// ─── 1. 入场动画 ───────────────────────────────────────────

// 淡入上浮（通用元素入场）
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 淡入缩放（卡片/面板入场）
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// 表格行依次入场
@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// 空状态呼吸浮动
@keyframes emptyFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}

// 成功状态弹跳
@keyframes successPop {
  0%   { transform: scale(0.8); opacity: 0; }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

// 脉冲（用于状态指示点）
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

// ─── 2. 通用过渡类 ─────────────────────────────────────────

// 淡入上浮（class 方式调用）
.anim-fade-in-up {
  animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

// 淡入缩放（class 方式调用）
.anim-fade-in-scale {
  animation: fadeInScale 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
}

// ─── 3. Stagger 延迟 Mixin ────────────────────────────────

// 列表项依次入场延迟（传入最大项数和间隔时间）
// 用法：@include stagger-rows(20, 0.03s);
@mixin stagger-rows($count, $interval) {
  @for $i from 1 through $count {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * $interval};
    }
  }
}

// ─── 4. 路由过渡增强 ─────────────────────────────────────

// 升级现有 fade-slide，增加轻微缩放感
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.99);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.99);
}

// ─── 5. 内容切换淡入 ─────────────────────────────────────

// 用于骨架屏 → 实际内容的平滑过渡
.content-fade-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.content-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

// ─── 6. 无障碍动效偏好 ───────────────────────────────────

// 尊重用户系统级动画偏好设置
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**修改文件**：`frontend/src/assets/styles/main.scss`

在文件末尾追加导入：

```scss
// ─── Transitions ───────────────────────────────────────────
@use './transitions.scss' as *;
```

**修改文件**：`frontend/src/views/Home.vue`

将 `Home.vue` 中现有的 `.fade-slide-*` 样式**删除**（约 1399~1411 行），迁移到 `transitions.scss` 统一管理，避免重复定义。

---

### 3.2 Task 2：列表页表格行入场 + 交互增强

**目标**：6 个列表页的表格行添加 stagger 入场动画，增强 hover 反馈。

**涉及文件**（6 个）：

| 文件 | 说明 |
|------|------|
| `views/formulas/RecentFormulas.vue` | 最近配方 |
| `views/formulas/FormulaList.vue` | 配方列表 |
| `views/materials/MaterialList.vue` | 原料列表 |
| `views/salesmen/SalesmanList.vue` | 业务员列表 |
| `views/versions/VersionList.vue` | 版本列表 |
| `views/nutrition/NutritionProfiles.vue` | 营养标准 |

**实现方案**：

在每个列表页的 `<style lang="scss" scoped>` 中添加统一的表格行动效样式：

```scss
// ─── 表格行入场动画 ─────────────────────────────────────
.content-card {
  // ... 现有样式保持不变

  :deep(.t-table__body .t-table__row) {
    animation: rowFadeIn 0.3s ease both;
    @include stagger-rows(20, 0.03s);
  }
}
```

**关键帧设计说明**：

| 参数 | 值 | 理由 |
|------|-----|------|
| 动画方向 | `translateX(-8px)` → 0 | 从左侧滑入，符合阅读方向 |
| 时长 | 0.3s | 感知上有反馈但不拖沓 |
| 缓动 | `ease` | 自然减速感 |
| Stagger 间隔 | 0.03s × 项数 | 20 行内总延迟 0.6s，视觉节奏感好 |
| 最大行数 | 20 | 超过 20 行的后续行共用 0.6s 延迟，避免过长等待 |

**交互增强 — 表格 hover 反馈升级**：

在 `main.scss` 的 `.t-table` 全局覆盖中增强现有 hover 效果：

```scss
// 现有代码（保留）
.t-table__row--hover td {
  background-color: $bg-table-row-hover !important;
}

// 新增：hover 行左侧品牌色指示条
:deep(.t-table__row) {
  position: relative;
  transition: background-color $transition-fast;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: $brand-primary;
    border-radius: 0 2px 2px 0;
    transform: scaleY(0);
    transition: transform $transition-fast;
  }

  &:hover::before {
    transform: scaleY(1);
  }
}
```

> **注意**：hover 指示条需验证是否与 TDesign 内部 `::before` 伪元素冲突。如有冲突，改用 `box-shadow: inset 3px 0 0 $brand-primary` 方案。

---

### 3.3 Task 3：表单页焦点微动效 + 提交反馈

**目标**：3 个表单页的输入框增强 focus 状态，提交按钮增加反馈动画。

**涉及文件**（3 个）：

| 文件 | 说明 |
|------|------|
| `views/formulas/FormulaForm.vue` | 配方表单 |
| `views/materials/MaterialForm.vue` | 原料表单 |
| `views/salesmen/SalesmanForm.vue` | 业务员表单 |

**实现方案**：

在 `main.scss` 的输入框全局覆盖中补充 transition 声明：

```scss
// 现有代码已定义 border-color hover/focus 样式
// 补充 transition 声明使切换平滑
.t-input,
.t-textarea,
.t-textarea__inner,
.t-select .t-input,
.t-input-number {
  transition: border-color $transition-normal, box-shadow $transition-normal;
}
```

**表单卡片入场**：

在 3 个表单页的 `<style>` 中添加：

```scss
.content-card {
  // 表单卡片入场动画
  animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

// 折叠面板分组依次入场
:deep(.t-collapse-panel) {
  animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  @include stagger-rows(8, 0.06s);
}
```

**提交成功反馈**：

在表单提交成功后的处理逻辑中，给成功 Message 添加视觉强调（如不修改 JS，仅依赖 TDesign `MessagePlugin.success` 的默认动画即可）。

---

### 3.4 Task 4：详情页 + 卡片页入场动画

**目标**：详情页的信息卡片、Tab 面板添加入场动画。

**涉及文件**（5 个）：

| 文件 | 说明 |
|------|------|
| `views/formulas/FormulaDetail.vue` | 配方详情 |
| `views/materials/MaterialDetail.vue` | 原料详情 |
| `views/salesmen/SalesmanDetail.vue` | 业务员详情 |
| `views/nutrition/NutritionAnalysis.vue` | 营养分析（卡片布局） |
| `views/exports/ExportCenter.vue` | 导出中心 |

**详情页实现方案**：

```scss
// 详情页 header 区域入场
.detail-header {
  animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
}

// Tab 内容面板切换时的入场
:deep(.t-tabs__content) {
  .content-card,
  .t-card {
    animation: fadeInScale 0.25s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
}
```

**NutritionAnalysis 卡片布局**：

营养分析页使用 `t-card` 网格展示核心营养素，需 stagger 入场：

```scss
// 营养素卡片依次入场
.nutrient-cards-grid {
  :deep(.t-card) {
    animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
    @include stagger-rows(10, 0.05s);
  }
}
```

**NutritionAnalysis 进度条动画**：

NRV 占比进度条在数据加载后应从 0 动画填充到目标值：

```scss
// 进度条填充动画
:deep(.t-progress__bar) {
  animation: progressBarFill 0.8s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes progressBarFill {
  from { transform: scaleX(0); transform-origin: left; }
  to   { transform: scaleX(1); transform-origin: left; }
}
```

> 进度条动画需验证 TDesign `t-progress` 组件内部结构是否支持 `scaleX` 变换。如不支持，改为通过组件的 `percentage` 属性用 JS 实现 `requestAnimationFrame` 渐变。

---

### 3.5 Task 5：空状态呼吸动画 + 骨架屏过渡

**目标**：空状态插画添加呼吸浮动，骨架屏 → 内容切换添加淡入过渡。

**空状态呼吸动画**：

在 `main.scss` 的 `.t-empty` 覆盖中添加：

```scss
.t-empty {
  // ... 现有样式保持不变

  .t-empty__image svg {
    color: $brand-primary-lighter;
    animation: emptyFloat 3s ease-in-out infinite;
  }
}
```

**骨架屏 → 内容平滑过渡**：

改造现有骨架屏切换逻辑。当前模式：

```vue
<PageSkeleton v-if="!initialized" type="table" />
<t-card v-else class="content-card">
```

改为使用 Vue `<Transition>` 包裹：

```vue
<Transition name="content-fade" mode="out-in">
  <PageSkeleton v-if="!initialized" type="table" />
  <t-card v-else class="content-card">
    <!-- 内容 -->
  </t-card>
</Transition>
```

**涉及文件**（8 个使用骨架屏的页面）：

| 文件 |
|------|
| `views/formulas/RecentFormulas.vue` |
| `views/formulas/FormulaList.vue` |
| `views/materials/MaterialList.vue` |
| `views/salesmen/SalesmanList.vue` |
| `views/versions/VersionList.vue` |
| `views/exports/ExportCenter.vue` |
| `views/nutrition/NutritionProfiles.vue` |
| `views/nutrition/NutritionAnalysis.vue` |

每个页面仅修改模板层：将 `<PageSkeleton v-if>` + `<t-card v-else>` 包裹进 `<Transition name="content-fade" mode="out-in">`。`content-fade` 过渡类已在 Task 1 的 `transitions.scss` 中定义。

---

## 四、性能优化策略

### 4.1 GPU 加速

所有动画仅使用 `transform` 和 `opacity`，不触碰 layout 属性：

| 动画 | 触发属性 | Composite Only |
|------|---------|:--------------:|
| `fadeInUp` | opacity + translateY | Yes |
| `fadeInScale` | opacity + scale | Yes |
| `rowFadeIn` | opacity + translateX | Yes |
| `emptyFloat` | translateY | Yes |
| `progressBarFill` | scaleX | Yes |
| hover 指示条 `scaleY` | transform | Yes |

### 4.2 `will-change` 策略

**不全局添加 `will-change`**。仅在以下场景按需添加：

```scss
// 表格行入场期间声明（动画结束后自动清除）
:deep(.t-table__body .t-table__row) {
  will-change: transform, opacity;
  animation: rowFadeIn 0.3s ease both;
  animation-fill-mode: both; // 动画结束后 will-change 效果消失
}
```

### 4.3 Stagger 上限控制

- 表格行 stagger 最多 20 项（0.6s 总延迟）
- 折叠面板 stagger 最多 8 项（0.48s 总延迟）
- 营养卡片 stagger 最多 10 项（0.5s 总延迟）
- 超过上限的项复用最后一项的延迟值，不会无限增长

### 4.4 `prefers-reduced-motion` 兜底

`transitions.scss` 中已定义全局兜底：

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

这确保所有新增动画在用户系统设置"减少动态效果"时自动禁用。

### 4.5 CSS 包体积评估

| 新增内容 | 预估大小 |
|---------|---------|
| `transitions.scss`（@keyframes + 类 + mixin） | ~1.2 KB (minified) |
| 6 个列表页 stagger 样式（@for 展开） | ~0.6 KB × 6 = ~3.6 KB |
| 3 个表单页入场样式 | ~0.3 KB × 3 = ~0.9 KB |
| 5 个详情页入场样式 | ~0.3 KB × 5 = ~1.5 KB |
| 骨架屏 Transition 包裹（纯模板修改） | 0 KB CSS |
| **总计** | **~7.2 KB** (minified + gzip < 3 KB) |

对构建体积影响可忽略。

---

## 五、执行顺序与时间规划

| 序号 | Task | 依赖 | 预估时间 | 改动范围 |
|------|------|------|---------|---------|
| 1 | 全局动效基础设施 | 无 | 0.5h | 新建 `transitions.scss` + 改 `main.scss` + 改 `Home.vue` |
| 2 | 列表页表格行动效 | Task 1 | 1.0h | 6 个列表页 + `main.scss` 表格覆盖 |
| 3 | 表单页焦点动效 | Task 1 | 0.5h | `main.scss` + 3 个表单页 |
| 4 | 详情页/卡片入场 | Task 1 | 0.5h | 5 个页面 |
| 5 | 空状态呼吸 + 骨架屏过渡 | Task 1 | 0.5h | `main.scss` + 8 个页面（仅模板） |
| | **总计** | | **3.0h** | **新建 1 文件 + 修改 22 文件** |

---

## 六、验收标准

| # | 验收项 | 通过条件 |
|---|--------|---------|
| 1 | 列表页表格行入场 | 6 个列表页首次加载数据时，表格行从左依次滑入（stagger 0.03s） |
| 2 | 表格 hover 反馈 | hover 表格行时左侧出现 3px 品牌色指示条，过渡平滑 |
| 3 | 表单卡片入场 | 3 个表单页打开时，内容卡片从下方淡入 |
| 4 | 折叠面板 stagger | 配方/原料表单的折叠面板分组依次入场 |
| 5 | 详情页入场 | 详情页 header 区域和 Tab 内容切换时有淡入动画 |
| 6 | 营养分析进度条 | NRV 进度条从 0 填充到目标值（0.8s） |
| 7 | 空状态呼吸 | 空状态插画持续上下浮动（3s 周期） |
| 8 | 骨架屏过渡 | 8 个页面的骨架屏 → 内容切换有淡入过渡，无闪白 |
| 9 | 路由过渡升级 | 页面切换时增加 scale(0.99) 微缩放感 |
| 10 | prefers-reduced-motion | 系统开启"减少动态效果"后，所有新增动画被禁用 |
| 11 | 性能 | Chrome DevTools Performance 面板中动画帧率 ≥ 55fps |
| 12 | 构建检查 | `npm run build` 通过，无 TypeScript 或 SCSS 编译错误 |

---

## 七、风险与注意事项

1. **TDesign 内部伪元素冲突**：表格行 `::before` hover 指示条可能与 TDesign 内部样式冲突。如出现，改用 `box-shadow: inset` 方案。
2. **stagger 动画与虚拟滚动冲突**：如未来表格启用虚拟滚动，stagger 动画将不适用于可视窗口外的行。当前项目未使用虚拟滚动，暂不受影响。
3. **`@for` 编译产物体积**：`stagger-rows(20, 0.03s)` 会展开为 20 个选择器，但均在 `:deep()` scoped 内，不会污染全局。
4. **`content-fade` Transition 与骨架屏**：需确认 `mode="out-in"` 不会导致短暂空白（骨架屏退出 → 内容进入之间）。如出现，改为 `mode=""`（同时进行）。
5. **进度条 `scaleX` 兼容性**：TDesign `t-progress` 内部可能使用 `width` 而非 `transform`，需实际验证后选择 CSS 或 JS 方案。
