# TingStudio UI/UX 高级感优化实施方案

> 以资深 UI 设计师视角，基于对当前代码库的全面审查，制定以下视觉与交互优化方案。
> 目标：提升页面高级感、操作流畅度、全站视觉一致性。

---

## 一、现状诊断

### 1.1 已有优势
- **设计令牌体系完善**：`design-tokens.scss` 含 270+ 变量（品牌色、背景、文字、阴影、动效、间距等），`tokens.ts` JS 导出同步
- **TDesign 主题覆盖成熟**：`_td-overrides.scss` 统一覆盖 Button / Input / Table / Card / Tag / Dialog 等核心组件
- **登录页设计精致**：双栏布局 + SVG 猫咪插画 + 浮动爱心 + 星光动画，品牌调性鲜明
- **骨架屏与加载态**：`PageSkeleton` 组件 + 表格行 stagger 入场动画
- **样式分层清晰**：`main.scss`（12 行入口）→ `_reset.scss` / `_utilities.scss` / `_td-overrides.scss` / `_a11y.scss`

### 1.2 待改进项
| 类别 | 问题 | 影响等级 |
|------|------|:--------:|
| **排版** | 缺少统一 Type Scale，页面标题与正文的字号/字重/行高使用不一致 | P0 |
| **图标** | 导航菜单使用 emoji（🕐📝🧪），与 TDesign 图标体系不一致；侧边栏/表头内嵌大量重复 SVG | P0 |
| **卡片** | 仅 `t-card bordered` 一种形态，缺乏信息层级区分（统计卡片 / 数据卡片 / 操作卡片） | P1 |
| **微交互** | 表格行 hover 缺反馈动效；表单提交无按钮涟漪；操作成功/失败缺少全局 Toast 动效 | P1 |
| **布局密度** | 列表页内容区 padding=20px 过于宽松；表格单元格 td font-size=12px 偏小，信息密度不均 | P1 |
| **暗色模式** | `theme-variables.scss` 暗色变量仅占位，`stores/theme.ts` 已就绪但无实际样式 | P2 |
| **无障碍** | 部分页面缺 ARIA label；色彩对比度（$text-secondary: #7B7080 on $bg-page: #FFF9F7）≈ 4.5:1 刚好达标 | P2 |
| **响应式** | 768px 以下侧边栏直接隐藏而非抽屉式；工具栏在小屏下缺少搜索收起逻辑 | P2 |

---

## 二、设计规范定义

### 2.1 字体规范（Typography Scale）

当前 `$font-family` 已定义 PingFang SC 优先，但缺少严格的层级规范。

| 层级 | Token | 字号 | 字重 | 行高 | 用途 |
|------|-------|------|------|------|------|
| **Display** | `$font-size-display` | 28px | 700 | 1.2 | 仅登录页品牌标题 |
| **H1** | `$font-size-h1` | 24px | 700 | 1.3 | 页面主标题（Home.vue content-title） |
| **H2** | `$font-size-h2` | 20px | 600 | 1.35 | 区块标题（expanded section header） |
| **H3** | `$font-size-h3` | 16px | 600 | 1.4 | 子区块标题 |
| **Body** | `$font-size-body` | 14px | 400 | 1.5 | 正文、表格内容 |
| **Body Small** | `$font-size-body-sm` | 13px | 400 | 1.5 | 次要正文、导航文字 |
| **Caption** | `$font-size-caption` | 12px | 400 | 1.5 | 辅助说明、时间戳、Badge |
| **Micro** | `$font-size-micro` | 11px | 500 | 1.4 | 标签内部文字 |

**Letter-spacing 规范：**
- Display / H1：`+0.5px`
- H2 / H3：`+0.3px`
- Body / Body-sm：`0`
- Caption / Micro：`+0.2px`

### 2.2 控件规范（Component Specs）

#### Button

| 变体 | 圆角 | 高度 | 内边距 | 字号 | 字重 |
|------|------|------|--------|------|------|
| **Large** (主操作) | `$radius-xl` (14px) | 44px | 0 24px | 15px | 600 |
| **Medium** (标准) | `$radius-lg` (10px) | 36px | 0 16px | 14px | 600 |
| **Small** (紧凑) | `$radius-lg` (10px) | 30px | 0 10px | 13px | 600 |
| **Text** (文字链接) | - | auto | - | 14px | 500 |

当前问题：全局覆盖中 `medium=32px` 偏矮，`small=28px` 偏小。**调整为 medium=36px, small=30px** 以提升触控舒适度。

**修改点：** `_td-overrides.scss` L103-113
```scss
// 调整前
&--size-medium { height: 32px !important; }
&--size-small  { height: 28px !important; }

// 调整后
&--size-medium { height: 36px !important; }
&--size-small  { height: 30px !important; }
```

#### Input

| 状态 | 圆角 | 高度 | 边框 | 聚焦阴影 |
|------|------|------|------|----------|
| Default | `$radius-lg` (10px) | 40px | 1.5px solid `$border-color` | 0 0 0 3px `$overlay-pink-10` |
| Hover | 同上 | 同上 | `$brand-primary-lighter` | - |
| Focus | 同上 | 同上 | `$brand-primary-light` | 0 0 0 4px `$overlay-pink-12` |
| Error | 同上 | 同上 | `$color-danger` | 0 0 0 3px `$color-danger-light` |
| Disabled | 同上 | 同上 | `$border-color-light` | - |

当前问题：表单页面中 Input 未统一高度。**建议表单 Input 统一 40px**（当前全局覆盖未指定 height，仅 border-radius）。

#### Table

| 元素 | 当前 | 优化 |
|------|------|------|
| Header 背景 | `$bg-page` + 毛玻璃 | 保持，增加 `font-size: 13px` + `letter-spacing: 0.3px` |
| Header 文字 | `$font-size-caption` (12px) | 调为 `$font-size-body-sm` (13px) |
| Body 单元格 | `font-size: 12px` | 调为 `$font-size-body-sm` (13px) |
| Body 行高 | 默认 | `padding: 10px 12px`（当前 8px 12px 偏紧凑） |
| Hover 行 | `box-shadow: inset 3px 0 0` | 增加 `transition: background 0.15s` |
| 展开行 | 纯白底 | 加 `$bg-page` + 微妙左阴影 |
| 空状态 | TDesign default | 加品牌色猫插画（与登录页呼应） |

#### Card

新增三级卡片规范：

| 级别 | 圆角 | 阴影 | 边框 | 用途 |
|------|------|------|------|------|
| **Elevated** | `$radius-2xl` (14px) | `$shadow-md` | 无 | 统计概览、重点信息卡片 |
| **Flat** | `$radius-xl` (12px) | `$shadow-xs` | 1px `$border-color` | 数据列表容器（当前 t-card bordered） |
| **Interactive** | `$radius-xl` (12px) | `$shadow-xs` → hover `$shadow-md` | 1px `$border-color` | 可点击卡片、导航卡片 |

### 2.3 间距规范（Spacing System）

当前 4px 基数系统已完整，需要定义**页面级间距语义**：

| 语义 | Token | 值 | 用途 |
|------|-------|-----|------|
| **页面内边距** | `$content-padding` | 24px → **20px** | 右侧内容区 wrapper（Home.vue L1315） |
| **区块间距** | `$space-6` | 24px | 卡片与卡片之间 |
| **卡片内边距** | `$space-4` | 16px | t-card 内部 padding（当前 0） |
| **表单项间距** | `$space-4` | 16px | t-form-item 之间 |
| **行内元素间距** | `$space-2` | 8px | tag / button / icon 之间 |
| **紧凑间距** | `$space-1` | 4px | label 与 input 之间 |

### 2.4 色彩对比度审查

| 组合 | 当前对比度 | WCAG AA 要求 | 状态 |
|------|-----------|-------------|------|
| `$text-primary` (#5D4E60) on `$bg-page` (#FFF9F7) | 6.2:1 | 4.5:1 | PASS |
| `$text-secondary` (#7B7080) on `$bg-page` (#FFF9F7) | 4.5:1 | 4.5:1 | 勉强 PASS |
| `$text-secondary` on `$bg-container` (#FFFFFF) | 4.6:1 | 4.5:1 | 勉强 PASS |
| `$text-caption-muted` (#C8AAB8) on `$bg-page` | 2.4:1 | 4.5:1 | FAIL |
| `$text-placeholder` (#D4C5D0) on white | 2.2:1 | 4.5:1 | FAIL（但占位符可豁免） |

**建议：** 将 `$text-secondary` 微调至 `#6B5E72`（对比度 5.2:1），将 `$text-caption-muted` 调至 `#9E8FA0`（对比度 3.5:1，大字可用）。

---

## 三、交互优化方案

### 3.1 导航体验升级

#### 3.1.1 图标替换（P0）
**现状：** 导航项使用 emoji（🕐📝🧪🤝📤🥗🛠️），在不同 OS/浏览器渲染不一致。

**方案：** 替换为 TDesign 内置图标 + 自定义 SVG 图标。

| 导航项 | 当前 emoji | 替换为 TDesign 图标 |
|--------|-----------|-------------------|
| 最近配方 | 🕐 | `time` |
| 配方管理 | 📝 | `edit` |
| 原材管理 | 🧪 | `chart-bar` |
| 业务员管理 | 🤝 | `usergroup` |
| 导出中心 | 📤 | `download` |
| 营养分析 | 🥗 | `chart-pie` |
| 工具箱 | 🛠️ | `setting` |

**修改点：** `Home.vue` L385-393 `navItems` 数组
```ts
const navItems = [
  { path: '/recent-formulas', label: '最近配方', icon: 'time' },
  { path: '/formulas',       label: '配方管理', icon: 'edit' },
  { path: '/materials',      label: '原材管理', icon: 'chart-bar' },
  { path: '/salesmen',       label: '业务员管理', icon: 'usergroup' },
  { path: '/exports',        label: '导出中心', icon: 'download' },
  { path: '/nutrition',      label: '营养分析', icon: 'chart-pie' },
  { path: '/tools',          label: '工具箱', icon: 'setting' },
]
```

模板中 `.nav-item-icon` 改为 `<t-icon :name="item.icon" size="18px" />`，同步移除页面标题 emoji 图标映射（L348-363）。

#### 3.1.2 侧边栏折叠动画（P1）
**现状：** `navExpanded` 仅切换 `max-height`，无宽度变化。侧边栏始终 300px。

**方案：** 增加折叠态（72px 图标模式），点击 Logo 区折叠/展开。

```
展开态 (300px)                    折叠态 (72px)
┌──────────────┐                ┌────┐
│ 🐱 Logo 文字 │                │ 🐱 │
│ 用户卡片     │                │ 👤 │
│ 日期 | 天气  │                │    │
│ ─────────── │                │ ── │
│ 导航列表... │                │ 📝 │
│              │                │ 🧪 │
│              │                │ 🤝 │
│              │                │ ...│
└──────────────┘                └────┘
```

**技术要点：**
- 新增 `sidebarCollapsed: boolean` 响应式状态
- 折叠时文字、祝福语、日期天气隐藏，仅保留图标
- `width` 使用 `transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
- 折叠态导航 hover 时显示 tooltip

#### 3.1.3 面包屑导航（P1）
**现状：** 无面包屑，用户在子页面（配方详情/编辑）中缺少路径感知。

**方案：** 在 `content-header` 的 `.header-left` 中，标题左侧添加面包屑。

```html
<t-breadcrumb :max-item-width="200">
  <t-breadcrumb-item @click="router.push('/')">首页</t-breadcrumb-item>
  <t-breadcrumb-item @click="router.push('/formulas')">配方管理</t-breadcrumb-item>
  <t-breadcrumb-item>编辑配方</t-breadcrumb-item>
</t-breadcrumb>
```

**实现方式：** 在 `Home.vue` 中通过 `route.matched` 自动生成面包屑数据。

### 3.2 页面过渡动效

#### 3.2.1 路由切换动画增强（P1）
**现状：** `fade-slide` 仅 opacity + translateY。

**方案：** 根据路由 meta 定义不同过渡方向：
- 列表→详情：`slide-left`
- 详情→列表：`slide-right`
- 同级切换：`fade-slide`

```scss
// transitions.scss 新增
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-left-enter-from { opacity: 0; transform: translateX(20px); }
.slide-left-leave-to   { opacity: 0; transform: translateX(-20px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-20px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(20px); }
```

#### 3.2.2 全局操作反馈（P1）
**现状：** 使用 TDesign `MessagePlugin`，但默认样式是顶部通知条。

**方案：** 在右下角添加全局 Toast 区域，带进入/退出动画 + 图标。

```scss
.t-message--placement-top-right {
  .t-message {
    border-radius: $radius-lg;
    backdrop-filter: blur(12px);
    animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

### 3.3 表格交互优化

#### 3.3.1 行点击涟漪（P1）
**方案：** 利用 CSS `::after` 伪元素实现 Material Design 风格涟漪。

#### 3.3.2 展开行动画（P2）
**现状：** `expandedRow` 直接显示，无过渡。

**方案：** 使用 Vue `<Transition>` + `max-height` 过渡。

#### 3.3.3 批量操作栏（P2）
**方案：** 表格增加 checkbox 列，选中时顶部浮出操作栏（批量删除 / 批量导出）。

### 3.4 表单体验优化

#### 3.4.1 实时校验反馈（P1）
**现状：** 仅 `trigger: 'blur'`，用户填完所有字段才发现第一个错误。

**方案：** 对关键字段（配方名称、原料选择）增加 `trigger: 'change'`，并在字段右侧显示实时验证状态图标。

```scss
// 实时校验状态
.t-form-item {
  &.t-is-success .t-input { border-color: $color-success; }
  &.t-is-success::after {
    content: '';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $color-success;
  }
}
```

#### 3.4.2 表单分步引导（P2）
**方案：** 配方表单较长时（名称 + 业务员 + 重量 + 原料列表 + 描述），使用 `t-steps` 组件分步。

### 3.5 空状态设计（P1）
**现状：** 使用 TDesign 默认空状态（通用插图）。

**方案：** 定制品牌化空状态 — 带猫咪角色的场景插画。

```
┌─────────────────────────────┐
│                             │
│        🐱💤                 │
│    暂无配方数据              │
│    点击下方按钮创建你的       │
│    第一个配方吧~             │
│                             │
│    [ ✨ 创建第一个配方 ]     │
│                             │
└─────────────────────────────┘
```

---

## 四、视觉高级感提升

### 4.1 玻璃态效果统一（Glassmorphism）

**现状：** 部分元素使用 `backdrop-filter: blur()`，但参数不统一。

**规范：**
| 层级 | `backdrop-filter` | `background` | `border` |
|------|-------------------|-------------|----------|
| **Level 1** (Header/Footer) | `blur(12px)` | `rgba(255,255,255,0.92)` | `1.5px solid $overlay-pink-lighter-20` |
| **Level 2** (Sidebar cards) | `blur(10px)` | `rgba(255,255,255,0.60)` | `1px solid $overlay-pink-lighter-15` |
| **Level 3** (Dropdowns/Popups) | `blur(16px)` | `rgba(255,255,255,0.98)` | `1.5px solid $overlay-pink-lighter-25` |

### 4.2 阴影层级增强

**新增阴影 Token：**
```scss
// 设计规范中的阴影层级
$shadow-elevation-1:  0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06);  // 卡片
$shadow-elevation-2:  0 2px 4px rgba(255,107,138,0.06), 0 4px 12px rgba(255,107,138,0.08);  // 浮起
$shadow-elevation-3:  0 4px 8px rgba(255,107,138,0.08), 0 8px 24px rgba(255,107,138,0.12);  // 弹窗
$shadow-elevation-4:  0 8px 16px rgba(255,107,138,0.10), 0 16px 48px rgba(255,107,138,0.16); // 模态
```

### 4.3 渐变与装饰元素

**规范原则：**
- 渐变角度统一为 `135deg`（品牌主渐变）或 `180deg`（垂直渐变）
- 避免超过 3 个色停点
- 装饰元素（blob / glow）使用 CSS 伪元素 + `filter: blur()`，禁止使用图片
- `::before` / `::after` 必须设置 `pointer-events: none`

### 4.4 数据可视化风格

**现状：** 营养分析图表已有专用色板（`$chart-*`），但图表背景与页面割裂。

**方案：**
- 图表卡片使用 `$bg-container` + `$shadow-elevation-1`
- 图表标题使用 H3 规范（16px / 600）
- 数值使用 Display 字号（28px / 700）+ 品牌色
- 图表 tooltip 使用 Level 3 玻璃态

### 4.5 骨架屏增强

**现状：** `PageSkeleton` 基础骨架。

**方案：** 增加渐变微光动画（shimmer），使用品牌色。

```scss
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}

.skeleton-item {
  background: linear-gradient(
    90deg,
    $skeleton-border 25%,
    $skeleton-shimmer 50%,
    $skeleton-border 75%
  );
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 五、实施步骤（优先级排序）

### Phase 1：基础规范对齐（P0，预计 2 天）

| 步骤 | 任务 | 涉及文件 | 预期效果 |
|------|------|----------|----------|
| 1.1 | 新增阴影 Token `$shadow-elevation-*` | `design-tokens.scss` | 建立统一阴影层级 |
| 1.2 | 调整 Button 高度（medium=36px, small=30px） | `_td-overrides.scss` | 触控舒适度提升 |
| 1.3 | 调整 Table Header/Body 字号至 13px | `_td-overrides.scss` + `Home.vue` | 信息可读性提升 |
| 1.4 | 导航 emoji → TDesign 图标替换 | `Home.vue` | 视觉一致性 + 跨平台一致性 |
| 1.5 | 页面标题 emoji → TDesign 图标 | `Home.vue` L348-363 | 同上 |
| 1.6 | 新增 Letter-spacing Token | `design-tokens.scss` | 标题精致度提升 |

### Phase 2：交互体验升级（P1，预计 3 天）

| 步骤 | 任务 | 涉及文件 | 预期效果 |
|------|------|----------|----------|
| 2.1 | 侧边栏折叠/展开功能 | `Home.vue` | 空间利用率提升 |
| 2.2 | 面包屑自动生成 | `Home.vue` | 路径感知增强 |
| 2.3 | 路由过渡方向感知 | `Home.vue` + `transitions.scss` | 导航流畅感 |
| 2.4 | Toast 动效增强 | `_td-overrides.scss` | 操作反馈感提升 |
| 2.5 | 表单实时校验 | `FormulaForm.vue` + `MaterialForm.vue` | 表单填写效率提升 |
| 2.6 | 品牌化空状态组件 | `components/EmptyState.vue`（新建） | 空页面不再冷漠 |
| 2.7 | 玻璃态参数统一 | `Home.vue` + `_td-overrides.scss` | 视觉层次清晰 |

### Phase 3：视觉细节打磨（P2，预计 2 天）

| 步骤 | 任务 | 涉及文件 | 预期效果 |
|------|------|----------|----------|
| 3.1 | 色彩对比度修正（$text-secondary） | `design-tokens.scss` | 无障碍合规 |
| 3.2 | 表格展开行过渡动画 | `FormulaList.vue` + `RecentFormulas.vue` | 展开收起丝滑 |
| 3.3 | 批量操作栏 | `FormulaList.vue` + `MaterialList.vue` | 批量操作效率提升 |
| 3.4 | 骨架屏 shimmer 动画 | `PageSkeleton.vue` | 加载态高级感 |
| 3.5 | 移动端侧边栏抽屉模式 | `Home.vue` | 小屏体验优化 |
| 3.6 | 暗色模式基础样式 | `theme-variables.scss` | 暗色模式可用 |

---

## 六、设计验收标准

### 6.1 自动化检查项

| 检查项 | 通过条件 |
|--------|----------|
| 全局 0 emoji 图标 | `grep -r "emoji\|🕐\|📝\|🧪" Home.vue` 返回 0 |
| Button 高度一致 | medium=36px, small=30px |
| Table 字号一致 | header=13px, body=13px |
| 阴影 Token 使用 | 无硬编码 `box-shadow` 值（允许 `rgba` overlay token） |
| 骨架屏 shimmer | `animation: shimmer` 存在于 PageSkeleton |
| 色彩对比度 | $text-secondary ≥ 4.5:1 on $bg-page |
| Vue-tsc 零错误 | `vue-tsc --noEmit` 通过 |
| Vite build 成功 | `vite build` 无错误 |

### 6.2 人工检查项

| 检查项 | 验收标准 |
|--------|----------|
| 视觉一致性 | 全站卡片圆角、阴影、间距统一 |
| 操作流畅感 | 页面切换、表格展开、表单提交均有动效 |
| 品牌调性 | 登录页→主页→列表→详情，风格连贯无割裂 |
| 移动端适配 | 768px 以下所有功能可用 |
| 无障碍 | Tab 键可遍历所有交互元素，焦点指示清晰 |

---

## 七、附录：文件改动清单

| 文件 | Phase | 改动类型 | 改动量 |
|------|-------|----------|--------|
| `design-tokens.scss` | 1, 3 | 修改（新增 shadow-elevation + letter-spacing + 色彩微调） | ~15 行 |
| `_td-overrides.scss` | 1, 2 | 修改（Button 高度 + Table 字号 + Toast 样式 + Glass 参数） | ~25 行 |
| `Home.vue` | 1, 2, 3 | 修改（图标替换 + 折叠 + 面包屑 + 过渡 + 响应式） | ~120 行 |
| `transitions.scss` | 2 | 修改（新增 slide-left/right） | ~15 行 |
| `FormulaList.vue` | 3 | 修改（展开动画 + 批量操作） | ~40 行 |
| `MaterialList.vue` | 3 | 修改（批量操作） | ~30 行 |
| `FormulaForm.vue` | 2 | 修改（实时校验） | ~15 行 |
| `PageSkeleton.vue` | 3 | 修改（shimmer 动画） | ~10 行 |
| `components/EmptyState.vue` | 2 | 新建（品牌化空状态） | ~80 行 |
| `components/BreadcrumbNav.vue` | 2 | 新建（面包屑组件） | ~50 行 |

**总改动量：** 修改 ~9 个文件，新建 ~2 个组件，约 400 行代码。
