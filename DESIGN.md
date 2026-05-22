---
version: alpha
name: TingStudio
description: 支持四套品牌色动态切换的食品配方管理平台。品牌色系（pink/yellow/blue/green）、中性色、排版、间距、圆角、阴影等一切视觉令牌的唯一定义源。
brands:
  pink:
    primary: "#FF6B8A"
    primary-light: "#FF8FAB"
    primary-lighter: "#FFB5C8"
    primary-lightest: "#FFD6E0"
    primary-bg: "#FFF0F3"
    primary-dark: "#E8A0B0"
    primary-deep: "#C94D6A"
  yellow:
    primary: "#F5A623"
    primary-light: "#FFBE4F"
    primary-lighter: "#FFD68A"
    primary-lightest: "#FFF0CC"
    primary-bg: "#FFF8E8"
    primary-dark: "#D9901A"
    primary-deep: "#B07A15"
  blue:
    primary: "#4A90D9"
    primary-light: "#6BA8E8"
    primary-lighter: "#A3C8F0"
    primary-lightest: "#C8E0F8"
    primary-bg: "#EDF4FD"
    primary-dark: "#3570B0"
    primary-deep: "#2A5C96"
  green:
    primary: "#10B981"
    primary-light: "#34D399"
    primary-lighter: "#6EE7B7"
    primary-lightest: "#A7F3D0"
    primary-bg: "#D1FAE5"
    primary-dark: "#059669"
    primary-deep: "#047857"
colors:
  white: "#FFFFFF"
  bg-page-light: "#F5F7FA"
  bg-container-light: "#FFFFFF"
  bg-hover-light: "#F2F4F7"
  bg-page-dark: "#1A1520"
  bg-container-dark: "#241E2B"
  bg-hover-dark: "#2D1525"
  text-primary-light: "#5D4E60"
  text-regular-light: "#6E6178"
  text-secondary-light: "#756A7C"
  text-placeholder-light: "#D4C5D0"
  text-primary-dark: "#E8DFE8"
  text-regular-dark: "#B8AEC0"
  text-secondary-dark: "#A99BB0"
  text-placeholder-dark: "#6B5F70"
  border-light: "#E4E7ED"
  border-light-alt: "#F2F4F7"
  border-dark: "#3D3445"
  border-dark-alt: "#2D2535"
  success: "#7BC67E"
  warning: "#F0A040"
  danger: "#E34D59"
  info: "#1890FF"
  info-dark: "#3DA1FF"
  emerald: "#10B981"
typography:
  fontFamily: "'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  display:
    fontSize: 28px
    fontWeight: 700
    letterSpacing: 0.5px
  h1:
    fontSize: 24px
    fontWeight: 700
    letterSpacing: 0.5px
  h2:
    fontSize: 20px
    fontWeight: 600
    letterSpacing: 0.3px
  h3:
    fontSize: 16px
    fontWeight: 600
    letterSpacing: 0.3px
  h4:
    fontSize: 14px
    fontWeight: 600
  body:
    fontSize: 14px
    fontWeight: 400
  body-sm:
    fontSize: 13px
    fontWeight: 400
  caption:
    fontSize: 12px
    fontWeight: 400
    letterSpacing: 0.2px
rounded:
  2xs: 2px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
  2xl: 14px
  3xl: 16px
  pill: 20px
  4xl: 24px
  5xl: 32px
  circle: 50%
spacing:
  0-5: 2px
  1: 4px
  1-25: 5px
  1-5: 6px
  2: 8px
  2-5: 10px
  3: 12px
  3-5: 14px
  4: 16px
  4-5: 18px
  5: 20px
  6: 24px
  7: 28px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
shadows:
  xs-light: "0 1px 3px rgba(0, 0, 0, 0.06)"
  sm-light: "0 1px 4px rgba(0, 0, 0, 0.06)"
  xs-dark: "0 1px 3px rgba(0, 0, 0, 0.20)"
  card: "0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)"
  card-dark: "0 1px 2px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.18)"
  float: "0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.08)"
  modal: "0 4px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)"
components:
  button-primary:
    backgroundColor: "{brands.*.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{brands.*.primary-light}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.bg-container-light}"
    rounded: "{rounded.xl}"
  page:
    backgroundColor: "{colors.bg-page-light}"
  input:
    backgroundColor: "{colors.bg-container-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
    borderColor: "{colors.border-light}"
  badge-success:
    backgroundColor: "rgba(123, 198, 126, 0.08)"
    textColor: "{colors.success}"
    rounded: "{rounded.xs}"
  badge-danger:
    backgroundColor: "rgba(227, 77, 89, 0.06)"
    textColor: "{colors.danger}"
    rounded: "{rounded.xs}"
transitions:
  fast: 0.15s ease
  normal: 0.25s ease
  slow: 0.35s ease
  smooth: "0.3s cubic-bezier(0.4, 0, 0.2, 1)"
layout:
  headerHeight: 64px
  sidebarWidth: 220px
  contentPadding: 24px
---

## Overview

**TingStudio** 支持**四套品牌色**动态切换（`data-brand="pink|yellow|blue|green"`），并支持亮/暗双主题（`data-theme="light|dark"`）。

品牌色通过 CSS 变量 `var(--color-primary)` 运行时切换，中性色（文字/背景/边框）随主题变化。排版、间距、圆角、动效全主题统一。

## Brand Themes

品牌色通过 `<html data-brand="...">` 属性动态切换，每个品牌色系包含 primary + 5 级渐变 + bg + deep 共 7 个色阶。

### Pink（默认）

柔和少女感，粉色主调配合暖白背景。

| Token              | Hex       | Use                      |
| ------------------ | --------- | ------------------------ |
| `primary`          | `#FF6B8A` | 按钮、链接、高亮、选中态 |
| `primary-light`    | `#FF8FAB` | 悬停/激活态              |
| `primary-lighter`  | `#FFB5C8` | 背景装饰、图表           |
| `primary-lightest` | `#FFD6E0` | 极淡装饰                 |
| `primary-bg`       | `#FFF0F3` | 选中行背景、hover 底色   |
| `primary-dark`     | `#E8A0B0` | 特殊强调                 |
| `primary-deep`     | `#C94D6A` | 深色强调                 |

### Yellow

温暖活泼，金色主调。

| Token              | Hex       |
| ------------------ | --------- |
| `primary`          | `#F5A623` |
| `primary-light`    | `#FFBE4F` |
| `primary-lighter`  | `#FFD68A` |
| `primary-lightest` | `#FFF0CC` |
| `primary-bg`       | `#FFF8E8` |
| `primary-dark`     | `#D9901A` |
| `primary-deep`     | `#B07A15` |

### Blue

沉稳专业，蓝色主调。

| Token              | Hex       |
| ------------------ | --------- |
| `primary`          | `#4A90D9` |
| `primary-light`    | `#6BA8E8` |
| `primary-lighter`  | `#A3C8F0` |
| `primary-lightest` | `#C8E0F8` |
| `primary-bg`       | `#EDF4FD` |
| `primary-dark`     | `#3570B0` |
| `primary-deep`     | `#2A5C96` |

### Green

自然清新，绿色主调。

| Token              | Hex       |
| ------------------ | --------- |
| `primary`          | `#10B981` |
| `primary-light`    | `#34D399` |
| `primary-lighter`  | `#6EE7B7` |
| `primary-lightest` | `#A7F3D0` |
| `primary-bg`       | `#D1FAE5` |
| `primary-dark`     | `#059669` |
| `primary-deep`     | `#047857` |

## Neutral Colors（中性色 — 跨品牌共享）

中性色通过 `<html data-theme="light|dark">` 切换，品牌色不影响中性色。

### Light Theme

| Token              | Hex       | Use                  |
| ------------------ | --------- | -------------------- |
| `bg-page`          | `#F5F7FA` | 页面背景             |
| `bg-container`     | `#FFFFFF` | 卡片/面板/弹窗背景   |
| `bg-hover`         | `#F2F4F7` | 菜单/列表项 hover    |
| `text-primary`     | `#5D4E60` | 标题文字             |
| `text-regular`     | `#6E6178` | 正文（对比度 ≥ 4.5） |
| `text-secondary`   | `#756A7C` | 次要文字             |
| `text-placeholder` | `#D4C5D0` | 占位符/禁用文字      |
| `border`           | `#E4E7ED` | 主边框               |
| `border-light`     | `#F2F4F7` | 分割线               |

### Dark Theme

| Token              | Hex       | Use                |
| ------------------ | --------- | ------------------ |
| `bg-page`          | `#1A1520` | 页面背景           |
| `bg-container`     | `#241E2B` | 卡片/面板/弹窗背景 |
| `bg-hover`         | `#2D1525` | 菜单/列表项 hover  |
| `text-primary`     | `#E8DFE8` | 标题文字           |
| `text-regular`     | `#B8AEC0` | 正文               |
| `text-secondary`   | `#A99BB0` | 次要文字           |
| `text-placeholder` | `#6B5F70` | 占位符/禁用文字    |
| `border`           | `#3D3445` | 主边框             |
| `border-light`     | `#2D2535` | 分割线             |

## Semantic Colors（语义色 — 跨品牌共享）

- **Success (#7BC67E)** / **Warning (#F0A040)** / **Danger (#E34D59)** / **Info (#1890FF)**：不随品牌色切换。
- **Emerald (#10B981)**：表单/创建页面语义主色（与品牌色区分）。
- 暗色下 Info 改为 `#3DA1FF`（提高对比度）。

## Typography

PingFang SC 优先，回退系统无衬线字体。排版令牌全主题不变。

| Token     | Size | Weight | Use                |
| --------- | ---- | ------ | ------------------ |
| `display` | 28px | 700    | 大数字、主标题     |
| `h1`      | 24px | 700    | 页面标题           |
| `h2`      | 20px | 600    | 区块标题           |
| `h3`      | 16px | 600    | 卡片标题、模态标题 |
| `h4`      | 14px | 600    | 表格列头           |
| `body`    | 14px | 400    | 正文、表格内容     |
| `body-sm` | 13px | 400    | 辅助说明           |
| `caption` | 12px | 400    | 脚注               |

## Layout & Spacing

间距以 **4px 为基数**：`2 / 4 / 5 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 40 / 48 / 64`。全主题统一。

布局常量：header 64px、sidebar 220px、content padding 24px。

## Elevation

阴影分为品牌色阴影（随 `data-brand` 切换）和中性阴影（随 `data-theme` 切换）。

### 中性阴影（跨品牌统一）

| Token   | Light                                                     | Dark                         |
| ------- | --------------------------------------------------------- | ---------------------------- |
| `xs`    | `0 1px 3px rgba(0,0,0,0.06)`                              | `0 1px 3px rgba(0,0,0,0.20)` |
| `sm`    | `0 1px 4px rgba(0,0,0,0.06)`                              | `0 1px 4px rgba(0,0,0,0.30)` |
| `card`  | `0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)`  | 加深                         |
| `float` | `0 2px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)` | 加深                         |
| `modal` | `0 4px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)` | 加深                         |

### 品牌色阴影（随 data-brand 动态切换）

品牌色阴影的 rgba 颜色值随当前品牌 primary 色同步变化。例如粉色品牌时阴影带 `rgba(255,107,138,...)`，切换蓝色品牌时自动变为 `rgba(74,144,217,...)`。用于 header、品牌色按钮、特殊浮层等需要呼应品牌色的场景。

## Shapes

| Token    | Value | Usage                            |
| -------- | ----- | -------------------------------- |
| `2xs`    | 2px   | 极小圆角、微调元素               |
| `xs`     | 4px   | Badge、Tag                       |
| `sm`     | 6px   | 小按钮                           |
| `md`     | 8px   | **默认** — Button、Input、Select |
| `lg`     | 10px  | 菜单项                           |
| `xl`     | 12px  | 卡片                             |
| `2xl`    | 14px  | 大卡片                           |
| `3xl`    | 16px  | 面板、对话框                     |
| `pill`   | 20px  | 胶囊标签                         |
| `4xl`    | 24px  | 大卡片、弹窗                     |
| `5xl`    | 32px  | 全圆角卡片、特殊容器             |
| `circle` | 50%   | 圆形头像                         |

## Components

### Button

- **品牌色按钮**：背景色 = CSS 变量 `var(--color-primary)`，白色文字，`rounded.md`（8px），padding 12px。悬停变 `var(--color-primary-light)`。
- **危险按钮**：用 `danger` 色。品牌色按钮不随语义变化。

### Card

- 背景 `var(--color-bg-container)`，`rounded.xl`（12px），使用 `card` 阴影。
- 内部 `t-select` / `t-date-picker` **必须** `:popup-props="{ appendToBody: true }"`。

### Input / Select

- 背景 `var(--color-bg-container)`，文字 `var(--color-text-primary)`，边框 `var(--color-border)`，`rounded.md`（8px）。

### Badge / Tag

- `rounded.xs`（4px），语义色浅背景（8% opacity），语义色文字。

## Do's and Don'ts

### ✅ Do

- 颜色强制使用 CSS 变量 `var(--color-*)` — 随品牌/主题自动切换
- 品牌色引用 `var(--color-primary)` / `var(--color-primary-light)` 等 — 自动适配当前品牌
- 间距用令牌 `var(--space-4)` / `$space-4`
- 圆角用 `var(--radius-md)` / `$radius-md`
- 二次确认用 `t-popconfirm`，非 `t-dialog`
- 设计令牌定义源：`frontend/src/assets/styles/design-tokens.scss` + `theme-variables.scss`

### ❌ Don't

- **禁止**硬编码 hex 颜色 — 品牌色或主题色硬编码会导致切换后视觉错乱
- **禁止**写死粉色 hex（`#FF6B8A` / `#FFF0F3` 等）— 应用 `var(--color-primary)` / `var(--color-primary-bg)` 替代
- **禁止**使用任意圆角/间距值（如 `7px` / `13px`）
- **禁止**在表格中使用 `fixed` 列（与 sticky header 冲突）
- **禁止**使用 `toISOString()` 展示时间
- **禁止**直接渲染 `null` / `undefined`
