# TingStudio 前端 UI/UX 优化规划（2026年更新版）

> **原则**：保持现有核心业务逻辑不变，不修改后端接口和功能实现。仅针对前端视觉表现、交互体验和代码规范进行优化。
>
> **更新日期**：2026-04-19
>
> **基于实际代码扫描结果**，本计划反映项目当前真实状态，聚焦于**未完成**的优化项。

---

## 一、现状诊断摘要（2026年实际状态）

### 1.1 ✅ 已完成的基础设施

| 维度                 |      状态       | 详情                                                                                                                                                              |
| -------------------- | :-------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **设计令牌系统**     |   ✅ **完善**   | `design-tokens.scss` 包含 200+ 行完整定义：品牌色、背景色、文字色、边框色、语义色、覆盖层变量（白色/粉色 30+个）、阴影系列、动效规范                              |
| **样式文件架构**     |  ✅ **已建立**  | 完整的 SCSS 模块化结构：`main.scss` → `variables.scss` → `design-tokens.scss` → `_td-overrides.scss` → `_a11y.scss` → `transitions.scss` → `theme-variables.scss` |
| **TDesign 全局覆盖** |  ✅ **已实现**  | `_td-overrides.scss` 已使用 token 定义按钮/卡片的全局样式，包含 hover/active 动效                                                                                 |
| **无障碍基础框架**   | ✅ **部分完成** | `_a11y.scss` 包含 focus-visible 焦点环、reduced-motion 媒体查询、主题切换过渡                                                                                     |
| **CSS 变量系统**     |  ✅ **已建立**  | `theme-variables.scss` 支持运行时主题切换，Home.vue 已开始使用 CSS 变量                                                                                           |

### 1.2 当前待改进问题（基于代码扫描）

#### 🔴 问题 1：硬编码色值严重（P0 紧急）

**扫描结果**：20 个 Vue 文件中共发现 **2,191 处**硬编码色值（`rgba()` / `#hex`）

| 文件                      | 硬编码次数 | 优先级 | 说明                 |
| ------------------------- | ---------- | :----: | -------------------- |
| **FormulaList.vue**       | **220**    | 🔴 高  | 配方列表页，最多     |
| **AiAssistant.vue**       | **180**    | 🔴 高  | AI 助手页面          |
| **NutritionAnalysis.vue** | **127**    | 🟡 中  | 营养分析图表色       |
| **MaterialForm.vue**      | **231**    | 🔴 高  | 原料表单             |
| **FormulaForm.vue**       | **246**    | 🔴 高  | 配方表单             |
| **MaterialList.vue**      | **197**    | 🟡 中  | 原料列表             |
| **SalesmanList.vue**      | **181**    | 🟡 中  | 业务员列表           |
| **ExportCenter.vue**      | **105**    | 🟡 中  | 导出中心             |
| **SalesmanDetail.vue**    | **86**     | 🟢 低  | 业务员详情           |
| **SalesmanForm.vue**      | **69**     | 🟢 低  | 业务员表单           |
| **MaterialDetail.vue**    | **109**    | 🟢 低  | 原料详情             |
| **NutritionProfiles.vue** | **80**     | 🟢 低  | 营养标准             |
| **VersionList.vue**       | **78**     | 🟢 低  | 版本列表             |
| **VersionCompare.vue**    | **83**     | 🟢 低  | 版本对比             |
| **FormulaDetail.vue**     | **84**     | 🟢 低  | 配方详情             |
| **Home.vue**              | **40**     | 🟢 低  | 主布局（已部分优化） |
| **Login.vue**             | **62**     | 🟢 低  | 登录页（独立设计）   |
| **Register.vue**          | **11**     | 🟢 低  | 注册页               |
| **Tools.vue**             | **1**      | 🟢 低  | 工具箱               |
| **AccountSettings.vue**   | **1**      | 🟢 低  | 账户设置             |

**问题根因**：

- 多数页面直接写死 `rgba(255, 143, 171, 0.15)` 而非使用 `$overlay-pink-15`
- 部分页面重复定义相同的颜色值
- 图表库（ECharts）配置中大量硬编码色值

#### 🟡 问题 2：动效实现不均衡（P1 体验）

**扫描结果**：各页面动效实现情况差异显著

| 动效等级    | 页面数量 | 代表页面                                                                                                     | 说明                                             |
| ----------- | :------: | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| ⭐⭐⭐ 丰富 |   3 个   | AiAssistant, FormulaList, MaterialForm                                                                       | 有完整的入场动画、hover 微交互、过渡效果         |
| ⭐⭐ 中等   |   5 个   | NutritionAnalysis, SalesmanDetail/Form, VersionList, ExportCenter                                            | 有基础 fadeInUp/fadeInDown 入场动画 + 部分 hover |
| ⭐ 基础     |   4 个   | MaterialDetail, FormulaDetail, FormulaForm, VersionCompare                                                   | 仅简单的入场动画，缺少交互反馈                   |
| ❌ 缺失     |   8 个   | MaterialList, SalesmanList, NutritionProfiles, Tools, Home(子区域), Register, Login(子区域), AccountSettings | 几乎无自定义动效                                 |

**具体缺失项**：

- 列表页表格行缺少依次入场动画（rowFadeIn）
- 表单输入框缺少统一的 focus 微动效
- 操作按钮缺少 hover 上浮 + 阴影增强效果
- 空状态插画缺少呼吸浮动动画
- 部分页面 transition 使用硬编码值（如 `0.2s ease`）而非 `$transition-fast`

#### 🟢 问题 3：无障碍支持不完整（P2 品质）

**扫描结果**：共发现 **56 处** ARIA 属性使用（较原计划的 0 处有改善）

**已完成的无障碍**：

- ✅ Home.vue：完整的导航语义化（role="menubar", role="menuitem", aria-label, aria-current）
- ✅ 所有页面：基础容器有 `aria-busy` 属性
- ✅ 大多数空状态组件：`role="status"`
- ✅ AiAssistant.vue：Tab 组件有 role="tab" + tabindex
- ✅ 全局：`:focus-visible` 焦点环 + `prefers-reduced-motion` 支持

**仍需改进**：

- ❌ 表单字段缺少 `<label>` 关联或 `aria-label`
- ❌ 搜索框缺少语义描述
- ❌ 表格操作列（编辑/删除按钮）缺少 aria-label
- ❌ 弹窗/对话框缺少焦点陷阱说明
- ❌ Toast 消息缺少 `role="alert"` / `aria-live="polite"`

#### 🔵 问题 4：代码规范 & 性能（P3 进阶）

- 部分页面存在重复的 `@keyframes` 定义（fadeInUp, fadeInDown, dashboard-fade-in 在多个文件中重复）
- Home.vue 仍有部分内联 TDesign 样式覆盖（虽然比原计划减少）
- 未实施路由预加载（webpackPrefetch）
- 图片/SVG 资源未统一懒加载策略

---

## 二、优化规划总览（调整后）

基于当前真实状态，重新排列优先级：

```
🔴 P0（紧急 - 预计减少 80% 硬编码）
   └── 高频页面色值替换（6 个核心业务页面）

🟡 P1（体验 - 统一动效标准）
   ├── 提取公共动画 mixin（消除重复 @keyframes）
   ├── 补齐缺失页面的微交互
   └── 统一 transition 值为 token 引用

🟢 P2（品质 - 无障碍完善）
   ├── 表单字段 label / aria-label 补全
   ├── 操作按钮语义化
   └── 键盘导航增强

🔵 P3（进阶 - 性能与主题）
   ├── 路由预加载
   ├── 图片懒加载
   └── 暗色模式 CSS 变量补全
```

---

## 三、P0 — 色值统一 & 代码清理（紧急）

### 3.1 目标

将 2,191 处硬编码色值降至 **< 400 处**（仅保留图表库必需的配置色值 + 登录页局部装饰色）

### 3.2 执行方案（分批进行）

#### 批次 1：高优先级页面（预计减少 ~900 处）

这些页面是用户最高频访问的核心业务页面：

| 序号 | 文件                 | 当前硬编码 | 目标 | 主要替换规则                                                                                                    |
| :--: | -------------------- | ---------- | :--: | --------------------------------------------------------------------------------------------------------------- |
|  1   | **FormulaForm.vue**  | 246        | < 30 | `rgba(255,...)` → `$overlay-white-*`; `rgba(255,143,171,...)` → `$overlay-pink-*`; `#FF6B8A` → `$brand-primary` |
|  2   | **MaterialForm.vue** | 231        | < 30 | 同上 + 表单特定边框色 → `$border-color`                                                                         |
|  3   | **FormulaList.vue**  | 220        | < 40 | 表格行 hover 色 → `$bg-hover`; 按钮/标签色 → `$brand-primary-*`                                                 |
|  4   | **MaterialList.vue** | 197        | < 35 | 同 FormulaList                                                                                                  |
|  5   | **AiAssistant.vue**  | 180        | < 50 | 卡片背景渐变 → `$gradient-*`; 徽章色 → `$overlay-pink-*`                                                        |
|  6   | **SalesmanList.vue** | 181        | < 35 | 同上                                                                                                            |

**执行步骤**：

```bash
# 示例：FormulaForm.vue 的替换规则
# 1. 在 <style> 中添加 @use 语句（如果尚未引入）
@use '@/assets/styles/variables.scss' as *;

# 2. 全局替换常见模式
rgba(255, 255, 255, 0.9)  → $overlay-white-90
rgba(255, 255, 255, 0.6)  → $overlay-white-60
rgba(255, 143, 171, 0.08) → $overlay-pink-08
rgba(255, 143, 171, 0.15) → $overlay-pink-15
rgba(255, 143, 171, 0.25) → $overlay-pink-25
#FF6B8A                    → $brand-primary
#FF8FAB                    → $brand-primary-light
#FFE0E8                   → $border-color
#FFF9F7                   → $bg-page
#5D4E60                   → $text-primary
```

#### 批次 2：中等优先级页面（预计减少 ~400 处）

| 序号 | 文件                      | 当前硬编码 | 目标 | 说明                                                         |
| :--: | ------------------------- | ---------- | :--: | ------------------------------------------------------------ |
|  7   | **NutritionAnalysis.vue** | 127        | < 60 | 图表色可保留硬编码（ECharts 配置需要），但 UI 装饰色必须替换 |
|  8   | **ExportCenter.vue**      | 105        | < 30 | 导出任务卡片、标签色                                         |
|  9   | **MaterialDetail.vue**    | 109        | < 25 | 详情页装饰色                                                 |
|  10  | **FormulaDetail.vue**     | 84         | < 25 | 同上                                                         |
|  11  | **VersionCompare.vue**    | 83         | < 25 | 对比视图色                                                   |
|  12  | **VersionList.vue**       | 78         | < 25 | 版本标签色                                                   |
|  13  | **NutritionProfiles.vue** | 80         | < 20 | 营养标准列表                                                 |
|  14  | **SalesmanDetail.vue**    | 86         | < 25 | 业务员详情                                                   |

#### 批次 3：低优先级页面（预计减少 ~100 处）

| 序号 | 文件                    | 当前硬编码 | 目标 | 说明                                   |
| :--: | ----------------------- | ---------- | :--: | -------------------------------------- |
|  15  | **Login.vue**           | 62         | < 40 | 登录页独立设计，仅替换明显可复用的色值 |
|  16  | **Home.vue**            | 40         | < 20 | 已部分优化，继续精简剩余硬编码         |
|  17  | **SalesmanForm.vue**    | 69         | < 20 | 表单页                                 |
|  18  | **Register.vue**        | 11         | < 5  | 注册页                                 |
|  19  | **Tools.vue**           | 1          |  0   | 工具箱（几乎无需改动）                 |
|  20  | **AccountSettings.vue** | 1          |  0   | 设置页（几乎无需改动）                 |

### 3.3 design-tokens.scss 补充需求

当前 token 库已非常完善，但建议补充以下专用变量以加速替换：

```scss
// ═══ 新增：功能态浅色背景 ═══
$color-success-bg: rgba(123, 198, 126, 0.08); // 成功状态背景
$color-warning-bg: rgba(240, 160, 64, 0.08); // 警告状态背景
$color-danger-bg: rgba(227, 77, 89, 0.06); // 危险状态背景
$color-info-bg: rgba(24, 144, 255, 0.06); // 信息状态背景

// ═══ 新增：图表色板（供 ECharts 使用） ═══
$chart-palette: (
  "primary": $brand-primary,
  "secondary": $brand-primary-light,
  "tertiary": $color-info,
  "success": $color-success,
  "warning": $color-warning,
  "danger": $color-danger,
);

// ═══ 新增：遮罩层 ═══
$overlay-dark: rgba(0, 0, 0, 0.35); // 移动端侧边栏遮罩
$overlay-dark-heavy: rgba(0, 0, 0, 0.55); // 弹窗遮罩
```

### 3.4 预期效果

- **批次 1 完成后**：硬编码总数从 2,191 → ~1,291（减少 41%）
- **批次 2 完成后**：硬编码总数 → ~891（减少 59%）
- **批次 3 完成后**：硬编码总数 → ~791（减少 64%）
- **最终目标**：< 400 处（减少 82%），剩余主要为 ECharts 图表配置 + 登录页装饰

---

## 四、P1 — 微交互动效增强（体验提升）

### 4.1 目标

统一所有页面的动效标准，消除"动效贫富差距"，确保用户在每个页面都有一致的交互体验。

### 4.2 当前问题

#### 问题 A：@keyframes 重复定义

以下动画在多个文件中重复定义（应提取到 `transitions.scss` 作为公共 mixin）：

| 动画名称            | 出现次数 | 所在文件                                                                                                    |
| ------------------- | :------: | ----------------------------------------------------------------------------------------------------------- |
| `fadeInUp`          |   8 次   | AiAssistant, MaterialForm(x2), SalesmanDetail, SalesmanForm, VersionList, VersionCompare, NutritionAnalysis |
| `fadeInDown`        |   6 次   | MaterialForm, SalesmanDetail, SalesmanForm, VersionList(x2), VersionCompare                                 |
| `dashboard-fade-in` |   4 次   | AiAssistant, FormulaList, NutritionAnalysis, ExportCenter                                                   |
| `rowFadeIn`         |   2 次   | AiAssistant, FormulaList, ExportCenter                                                                      |
| `dialog-pop-in`     |   1 次   | FormulaList                                                                                                 |
| `expandRowFadeIn`   |   1 次   | FormulaList                                                                                                 |
| `progressBarFill`   |   1 次   | NutritionAnalysis                                                                                           |
| `progressSlide`     |   1 次   | MaterialForm                                                                                                |

**解决方案**：提取到 `transitions.scss`：

```scss
// ═══ 公共动画 mixin ═══
@mixin animation-fadeInUp($duration: 0.35s, $delay: 0s) {
  animation: fadeInUp $duration cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: $delay;
}

@mixin animation-fadeInDown($duration: 0.3s, $delay: 0s) {
  animation: fadeInDown $duration cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: $delay;
}

@mixin animation-dashboardFadeIn($duration: 0.5s) {
  animation: dashboard-fade-in $duration ease forwards;
}

@mixin animation-rowFadeIn($index: 1, $step: 0.03s) {
  animation: rowFadeIn 0.3s ease both;
  animation-delay: calc(#{$index} * #{$step});
}
```

#### 问题 B：transition 值不统一

当前页面混用多种 transition 写法：

| 当前写法                     | 出现次数 | 应替换为                                      |
| ---------------------------- | :------: | --------------------------------------------- |
| `transition: all 0.2s ease`  |  ~50 处  | `transition: all $transition-fast` 或具体属性 |
| `transition: all 0.25s ease` |  ~15 处  | `transition: all $transition-normal`          |
| `transition: all 0.3s ease`  |  ~10 处  | `transition: all $transition-slow`            |
| `transition: all 0.15s ease` |  ~5 处   | 自定义或保持                                  |

**解决方案**：全局搜索替换 + 建立 transition 使用规范

#### 问题 C：8 个页面缺少动效

以下页面几乎无自定义动效，需要补充：

1. **MaterialList.vue** - 原料列表
2. **SalesmanList.vue** - 业务员列表
3. **NutritionProfiles.vue** - 营养标准
4. **Tools.vue** - 工具箱
5. **FormulaDetail.vue** - 配方详情（仅有基础入场）
6. **MaterialDetail.vue** - 原料详情（仅有基础入场）
7. **FormulaForm.vue** - 配方表单（仅有基础入场）
8. **VersionCompare.vue** - 版本对比（仅有基础入场）

### 4.3 执行方案

#### Step 1：提取公共动画到 transitions.scss（0.5h）

将重复的 @keyframes 和 mixin 统一提取。

#### Step 2：补充缺失页面动效（2h，按优先级）

##### 2.1 列表页通用增强（MaterialList, SalesmanList, NutritionProfiles）

```scss
// 表格行依次入场
:deep(.t-table__body .t-table__row) {
  @include animation-rowFadeIn();
  @for $i from 1 through 20 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.03}s;
    }
  }
}

// 操作列按钮 hover 效果
.action-btn-group {
  .t-button {
    @include btn-hover-feedback(); // 上浮 + 阴影
  }
}

// 筛选器/搜索框 focus 效果
.filter-input {
  &:focus-within {
    @include input-focus-glow(); // 边框发光
  }
}
```

##### 2.2 详情页通用增强（FormulaDetail, MaterialDetail）

```scss
// 信息卡片入场
.info-card {
  @include animation-fadeInUp(0.4s);

  @for $i from 1 through 6 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.08}s;
    }
  }

  &:hover {
    box-shadow: $shadow-elevation-2; // 浮起效果
    transform: translateY(-2px);
  }
}

// 返回按钮 hover
.back-btn:hover {
  transform: translateX(-3px);
}
```

##### 2.3 表单页通用增强（FormulaForm）

```scss
// 表单项依次入场
.form-section {
  @include animation-fadeInUp(0.35s);
}

// 输入框 focus 动效
:deep(.t-input.t-is-focused),
:deep(.t-textarea.t-is-focused),
:deep(.t-select-input.t-is-focused) {
  @include input-focus-glow();
}

// 提交按钮按压效果
.submit-btn {
  &:active {
    transform: scale(0.98);
  }
}
```

##### 2.4 工具箱页面增强（Tools）

```scss
// 天气卡片呼吸动画
.weather-card {
  &:hover {
    .weather-icon-lg {
      animation: iconBounce 0.6s ease;
    }
  }
}

// 工具卡片 hover
.tool-card {
  transition: all $transition-smooth;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-elevation-3;
  }
}
```

#### Step 3：统一 transition 值引用（1h）

批量替换硬编码 transition 为 SCSS 变量。

### 4.4 无障碍动效保障

✅ **已完成**：`transitions.scss` 第 137 行已有 `@media (prefers-reduced-motion: reduce)` 规则。

**需确认**：所有新增动画是否被此规则覆盖（通过 `animation-duration: 0.01ms !important` 禁用）。

---

## 五、P2 — 无障碍可访问性完善（品质保障）

### 5.1 当前进度

- ✅ **基础设施**：\_a11y.scss 已建立 focus-visible + reduced-motion
- ✅ **主布局**：Home.vue 有完整的 ARIA 导航语义
- ✅ **页面容器**：所有页面有 aria-busy
- ✅ **空状态**：多数 t-empty 有 role="status"
- **进度估算**：约 **30%** 完成（相比原计划的 0% 有显著进步）

### 5.2 待完成任务

#### 任务 1：表单字段语义化（影响 6 个表单页）

**涉及文件**：MaterialForm, FormulaForm, SalesmanForm, Register, AccountSettings, Tools(天气搜索)

**执行清单**：

| 元素类型    | 当前状态         | 改进方案                                                |
| ----------- | ---------------- | ------------------------------------------------------- |
| 文本输入框  | 仅有 placeholder | 添加关联的 `<label :for="id">` 或 `aria-label="字段名"` |
| 下拉选择    | 仅有 placeholder | 添加 `aria-label="请选择XX"`                            |
| 数字输入    | 仅有 placeholder | 添加 `aria-label="XX数值"` 或 `<label>`                 |
| 开关/复选框 | TDesign 默认     | 确保有 `aria-labelledby`                                |
| 必填标识    | 红色 \* 号       | 添加 `aria-required="true"`                             |
| 错误提示    | 红色文字         | 添加 `role="alert"` + `aria-describedby`                |

**示例**：

```vue
<!-- 改进前 -->
<t-input v-model="form.name" placeholder="配方名称" />

<!-- 改进后 -->
<div class="form-item">
  <label for="formula-name" class="sr-only">配方名称</label>
  <t-input
    id="formula-name"
    v-model="form.name"
    placeholder="请输入配方名称"
    aria-required="true"
    aria-describedby="name-error"
  />
  <div v-if="errors.name" id="name-error" role="alert" class="error-msg">
    {{ errors.name }}
  </div>
</div>
```

#### 任务 2：操作按钮语义化（影响 12 个页面）

**涉及文件**：所有列表页 + 详情页

**执行清单**：

| 按钮 | 当前状态                    | 改进方案                                                      |
| ---- | --------------------------- | ------------------------------------------------------------- |
| 编辑 | `<t-button>编辑</t-button>` | 添加 `aria-label="编辑 XX"`                                   |
| 删除 | `<t-button>删除</t-button>` | 添加 `aria-label="删除 XX"` + 确认弹窗有 `role="alertdialog"` |
| 查看 | `<t-button>查看</t-button>` | 添加 `aria-label="查看 XX 详情"`                              |
| 导出 | `<t-button>导出</t-button>` | 添加 `aria-label="导出 XX 数据"`                              |
| 新建 | `<t-button>新建</t-button>` | 添加 `aria-label="新建 XX"`（通常已有明确文案，优先级低）     |

**快速实施方案**：在 `_td-overrides.scss` 中为 `.action-btn` 类添加通用的 `aria-label` 生成规则，或在各个页面逐一添加。

#### 任务 3：搜索与筛选区域语义化（影响 5 个列表页）

**涉及文件**：MaterialList, FormulaList, SalesmanList, NutritionProfiles, ExportCenter

**改进内容**：

- 搜索框：`<label for="search-input">搜索</label>` + `aria-label="搜索XX关键词"`
- 筛选下拉：`aria-label="按XX筛选"`
- 清除筛选按钮：`aria-label="清除筛选条件"`
- 结果计数：`<span aria-live="polite">找到 N 条结果</span>`

#### 任务 4：键盘导航增强（影响 Home.vue + 各列表页）

**当前状态**：

- ✅ Home.vue 导航菜单支持 ↑↓←→ 方向键 + Enter + Escape
- ❌ 列表页表格不支持键盘快捷操作（如 J/K 上下移动行、E 编辑、D 删除）

**可选增强**（P2 低优先级）：

- 为高级用户提供键盘快捷键提示
- 在列表页添加 `@keydown` 监听，支持 J/K/E/D 快捷键

### 5.3 验收标准

- [ ] 所有 `<t-input>` / `<t-select>` / `<t-textarea>` 都有关联的 label 或 aria-label
- [ ] 所有操作按钮（编辑/删除/查看）都有明确的 aria-label
- [ ] 表单错误信息有 `role="alert"`
- [ ] 搜索结果变化时有 `aria-live="polite"` 区域
- [ ] 焦点环在所有交互元素上可见且一致

---

## 六、P3 — 主题系统 & 性能优化（进阶）

### 6.1 CSS 变量化完善

**当前状态**：`theme-variables.scss` 已建立基础 CSS 变量，Home.vue 开始使用。

**待完善**：

- 将 `design-tokens.scss` 中所有变量同步输出为 CSS 自定义属性（为暗色模式铺路）
- 确保新页面优先使用 `var(--xxx)` 而非直接使用 `$xxx`

### 6.2 性能优化项

| 优化项             |  当前状态   | 实施难度 | 预期收益                                    |
| ------------------ | :---------: | :------: | ------------------------------------------- |
| **路由预加载**     |  ❌ 未实施  |  🟢 低   | 首次点击高频页面（配方列表/原料列表）无延迟 |
| **图片懒加载**     |  ❌ 未统一  |  🟢 低   | 减少首屏加载体积（空状态 SVG、装饰性图片）  |
| **骨架屏过渡**     | ⚠️ 部分实施 |  🟡 中   | 消除数据加载时的"闪白"感                    |
| **CSS 作用域检查** |  ⚠️ 需审查  |  🟡 中   | 确保 `:deep()` 不造成样式泄漏               |
| **Bundle 分析**    |   ❌ 未做   |  🟢 低   | 识别体积过大的依赖包                        |

### 6.3 代码清理

| 项目                                |       状态       | 建议                                      |
| ----------------------------------- | :--------------: | ----------------------------------------- |
| **views/customers/**                |      空目录      | 可安全删除（如确认不再需要）              |
| **components/Layout/AppLayout.vue** | 与 Home.vue 重叠 | 评估是否仍在使用，如未使用则删除          |
| **重复的 @keyframes**               | 9 个动画重复定义 | P1 阶段提取到 transitions.scss 后自动解决 |

---

## 七、执行路线图（更新版）

### Phase 1：P0 色值统一（预计 8h）

|   步骤   | 任务                                                    | 涉及文件                                                                                                                       |   时间    |
| :------: | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | :-------: |
|   1.1    | 补充 design-tokens 变量（功能色背景、图表色板、遮罩层） | design-tokens.scss                                                                                                             |   0.5h    |
|   1.2    | 批次 1：6 个核心页面色值替换                            | FormulaForm, MaterialForm, FormulaList, MaterialList, AiAssistant, SalesmanList                                                |    3h     |
|   1.3    | 批次 2：8 个中等页面色值替换                            | NutritionAnalysis, ExportCenter, MaterialDetail, FormulaDetail, VersionCompare, VersionList, NutritionProfiles, SalesmanDetail |   2.5h    |
|   1.4    | 批次 3：6 个低优先级页面                                | Login, Home, SalesmanForm, Register, Tools, AccountSettings                                                                    |    1h     |
|   1.5    | 验证：统计剩余硬编码数量                                | 全局 grep                                                                                                                      |   0.5h    |
| **合计** |                                                         |                                                                                                                                | **~7.5h** |

### Phase 2：P1 动效增强（预计 3.5h）

|   步骤   | 任务                                                 | 涉及文件                                                                                                         |   时间    |
| :------: | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | :-------: |
|   2.1    | 提取公共 @keyframes 到 transitions.scss + 创建 mixin | transitions.scss                                                                                                 |   0.5h    |
|   2.2    | 替换各页面中的重复动画定义为 mixin 引用              | 12 个页面                                                                                                        |    1h     |
|   2.3    | 补充 8 个缺失页面的微交互动效                        | MaterialList, SalesmanList, NutritionProfiles, Tools, FormulaDetail, MaterialDetail, FormulaForm, VersionCompare |   1.5h    |
|   2.4    | 统一 transition 硬编码值为 token 引用                | 全局                                                                                                             |   0.5h    |
| **合计** |                                                      |                                                                                                                  | **~3.5h** |

### Phase 3：P2 无障碍完善（预计 3h）

|   步骤   | 任务                             | 涉及文件                                                                  |  时间   |
| :------: | -------------------------------- | ------------------------------------------------------------------------- | :-----: |
|   3.1    | 表单字段 label / aria-label 补全 | MaterialForm, FormulaForm, SalesmanForm, Register, AccountSettings, Tools |  1.5h   |
|   3.2    | 操作按钮 aria-label 补全         | 所有列表页 + 详情页                                                       |   1h    |
|   3.3    | 搜索/筛选区域语义化 + aria-live  | 5 个列表页                                                                |  0.5h   |
| **合计** |                                  |                                                                           | **~3h** |

### Phase 4：P3 性能 & 主题（预计 2h）

|   步骤   | 任务                         | 涉及文件                                 |  时间   |
| :------: | ---------------------------- | ---------------------------------------- | :-----: |
|   4.1    | 路由预加载配置               | router/index.ts                          |  0.25h  |
|   4.2    | 图片懒加载策略               | 各页面                                   |  0.5h   |
|   4.3    | CSS 变量化完善               | theme-variables.scss, design-tokens.scss |  0.75h  |
|   4.4    | 代码清理（空目录、冗余组件） | 项目根目录                               |  0.5h   |
| **合计** |                              |                                          | **~2h** |

### 总时间估算

|         阶段 |   时间   |    累计进度    |
| -----------: | :------: | :------------: |
| Phase 1 (P0) |   7.5h   |  色值统一完成  |
| Phase 2 (P1) |   3.5h   | 动效标准化完成 |
| Phase 3 (P2) |    3h    |   无障碍达标   |
| Phase 4 (P3) |    2h    |  性能优化完成  |
|     **总计** | **~16h** |                |

---

## 八、验收标准（更新版）

### 8.1 色值统一验收

- [ ] `grep -r "rgba\|#hex" src/views/` 硬编码色值 **< 400 处**
- [ ] 所有页面 `<style>` 中都有 `@use '@/assets/styles/variables.scss' as *;`
- [ ] 无重复的颜色值定义（相同颜色只在一处定义）
- [ ] `design-tokens.scss` 是唯一的设计令牌来源

### 8.2 动效验收

- [ ] 所有 20 个页面至少有基础的入场动画（fadeInUp/fadeInDown）
- [ ] 列表页（MaterialList, FormulaList, SalesmanList）有 rowFadeIn 表格行动画
- [ ] 所有交互按钮有 hover/active 视觉反馈
- [ ] 无重复的 @keyframes 定义（都在 transitions.scss 中）
- [ ] 所有 transition 值都引用 SCSS 变量（$transition-\*）
- [ ] `prefers-reduced-motion` 正确禁用所有动画

### 8.3 无障碍验收

- [ ] 所有表单输入有关联 label 或 aria-label（覆盖率 100%）
- [ ] 所有操作按钮有 aria-label（编辑/删除/查看/导出）
- [ ] 表单错误信息有 `role="alert"`
- [ ] 搜索结果区域有 `aria-live="polite"`
- [ ] 焦点环在所有交互元素上可见且一致
- [ ] 键盘可完成所有核心操作（Tab 导航 + Enter 确认）

### 8.4 性能验收

- [ ] 高频页面（配方列表、原料列表）已启用路由预加载
- [ ] 装饰性图片/SVG 使用 loading="lazy"
- [ ] 骨架屏→实际内容切换有淡入过渡（无闪白）
- [ ] Bundle size 分析报告生成（可选）

---

## 九、附录

### A. 当前文件清单（20 个 Vue 页面）

| 路径                                    |    类型    | 硬编码数 | 动效等级 | 无障碍等级 | P0优先级 |
| --------------------------------------- | :--------: | :------: | :------: | :--------: | :------: |
| `views/ai/AiAssistant.vue`              |   AI助手   |   180    |  ⭐⭐⭐  |    ⭐⭐    |  🔴 高   |
| `views/formulas/FormulaForm.vue`        |  配方表单  |   246    |    ⭐    |     ⭐     |  🔴 高   |
| `views/materials/MaterialForm.vue`      |  原料表单  |   231    |  ⭐⭐⭐  |     ⭐     |  🔴 高   |
| `views/formulas/FormulaList.vue`        |  配方列表  |   220    |  ⭐⭐⭐  |    ⭐⭐    |  🔴 高   |
| `views/materials/MaterialList.vue`      |  原料列表  |   197    |    ❌    |     ⭐     |  🔴 高   |
| `views/salesmen/SalesmanList.vue`       | 业务员列表 |   181    |    ❌    |    ⭐⭐    |  🔴 高   |
| `views/nutrition/NutritionAnalysis.vue` |  营养分析  |   127    |   ⭐⭐   |    ⭐⭐    |  🟡 中   |
| `views/exports/ExportCenter.vue`        |  导出中心  |   105    |   ⭐⭐   |    ⭐⭐    |  🟡 中   |
| `views/materials/MaterialDetail.vue`    |  原料详情  |   109    |    ⭐    |     ⭐     |  🟡 中   |
| `views/formulas/FormulaDetail.vue`      |  配方详情  |    84    |    ⭐    |     ⭐     |  🟡 中   |
| `views/versions/VersionCompare.vue`     |  版本对比  |    83    |    ⭐    |     ⭐     |  🟡 中   |
| `views/versions/VersionList.vue`        |  版本列表  |    78    |   ⭐⭐   |     ⭐     |  🟡 中   |
| `views/nutrition/NutritionProfiles.vue` |  营养标准  |    80    |    ❌    |    ⭐⭐    |  🟡 中   |
| `views/salesmen/SalesmanDetail.vue`     | 业务员详情 |    86    |   ⭐⭐   |     ⭐     |  🟢 低   |
| `views/salesmen/SalesmanForm.vue`       | 业务员表单 |    69    |   ⭐⭐   |     ⭐     |  🟢 低   |
| `views/auth/Login.vue`                  |   登录页   |    62    |  ⭐⭐⭐  |     ⭐     |  🟢 低   |
| `views/Home.vue`                        |   主布局   |    40    |  ⭐⭐⭐  |   ⭐⭐⭐   |  🟢 低   |
| `views/auth/Register.vue`               |   注册页   |    11    |   ⭐⭐   |     ⭐     |  🟢 低   |
| `views/Tools.vue`                       |   工具箱   |    1     |    ❌    |     ⭐     |  🟢 低   |
| `views/settings/AccountSettings.vue`    |   设置页   |    1     |    ❌    |     ⭐     |  🟢 低   |

### B. 当前样式文件结构（9 个文件）

| 路径                                 | 用途                 | 行数（约） |    状态     |
| ------------------------------------ | -------------------- | :--------: | :---------: |
| `assets/styles/design-tokens.scss`   | 设计令牌定义（核心） |    200+    |   ✅ 完善   |
| `assets/styles/variables.scss`       | 向前兼容别名         |     20     |   ✅ 正常   |
| `assets/styles/theme-variables.scss` | CSS 变量 + :root     |    50+     |  ✅ 已建立  |
| `assets/styles/main.scss`            | 全局入口样式         |     12     | ✅ 结构清晰 |
| `assets/styles/_td-overrides.scss`   | TDesign 全局覆盖     |    150+    |  ✅ 已实现  |
| `assets/styles/_a11y.scss`           | 无障碍样式           |     56     | ✅ 基础完成 |
| `assets/styles/transitions.scss`     | 过渡动画定义         |    140+    |  ⚠️ 需扩展  |
| `assets/styles/_reset.scss`          | CSS 重置             |     30     |   ✅ 正常   |
| `assets/styles/_utilities.scss`      | 工具类               |     50     |   ✅ 正常   |

### C. 快速启动命令

```bash
# 统计当前硬编码色值数量
grep -r "rgba\|#\[0-9a-fA-F]\{3,8\}\b" frontend/src/views/ --include="*.vue" | wc -l

# 查找某个文件的硬编码细节
grep -n "rgba\|#\[0-9a-fA-F]" frontend/src/views/formulas/FormulaForm.vue

# 查找重复的 @keyframes
grep -rn "@keyframes fadeInUp" frontend/src/views/

# 检查无障碍属性覆盖情况
grep -rn "aria-label\|aria-describedby\|role=\"alert\"" frontend/src/views/ --include="*.vue" | wc -l
```

---

## 十、总结与建议

### 核心发现

1. **基础设施远超预期**：design-tokens.scss、样式架构、TDesign 覆盖、无障碍基础都已建立，这为后续优化打下了坚实基础。
2. **最大瓶颈是执行力而非规划**：P0 阶段的 token 替换工作量大但机械性强，适合批量处理。
3. **动效不均衡是体验短板**：8 个页面几乎无动效，会给人"半成品"感，建议优先补齐。
4. **无障碍已有良好开端**：从 0 到 56 处 ARIA 属性是很大进步，继续推进可达 WCAG 2.1 AA 级。

### 执行建议

1. **Phase 1（P0）可并行开发**：6 个核心页面的色值替换可分配给多人同时进行。
2. **先建立自动化检查**：在 CI 中加入硬编码色值数量监控，防止回退。
3. **动效提取优先**：先完成 Step 2.1（提取公共动画），后续页面自然受益。
4. **无障碍渐进式推进**：不必追求 100% 覆盖，先搞定表单页（对用户体验提升最明显）。

### 风险提示

- **ECharts 图表色值**：可能无法完全替换（API 限制），需接受一定量的硬编码残留。
- **登录页独立性**：Login/Register 的视觉风格特殊，过度统一可能破坏设计意图。
- **回归测试**：每次批量替换后需视觉回归测试，确保无明显样式异常。

---

_文档版本：v2.0（2026年更新版）_
_基于代码实际扫描结果生成，可直接用于指导开发_
