# TingStudio v2.28

食品配方工作数据管理平台 — 前后端分离架构

## 项目简介

TingStudio 是一个专业的食品配方工作数据管理平台，面向食品配方行业（中草药功效配方），提供配方管理、原料管理、业务员管理、营养成分分析、导出分享等完整功能链路。采用 **Vue 3 + Express + SQLite** 前后端分离架构，支持 JWT 认证、RESTful API、配方版本控制、营养合规检查、AI 智能解析等企业级特性。

## 🚀 最新更新 (2026-05-11)

### ✅ AI智能录入功能整合 + AI对话SSE流式修复 + UI优化

#### 🎯 智能填单/智能导入功能整合到AI助手工作台

将原来独立的 `AiAssistant.vue` 页面的**智能填单**和**智能导入**功能整合到 **AIDashboard.vue** 中，实现统一入口：

**新增Tab导航系统：**

| Tab | 图标 | 功能 | 组件 |
|-----|------|------|------|
| 💬 AI 对话 | 💬 | 与AI助手自由对话（SSE流式响应） | 内置聊天界面 |
| 📝 智能填单 | 📝 | AI辅助填写表单（配方、原料） | [SmartFormTab.vue](frontend/src/views/ai/tabs/SmartFormTab.vue) |
| 📥 智能导入 | 📥 | AI解析Excel/文件导入数据 | [SmartImportTab.vue](frontend/src/views/ai/tabs/SmartImportTab.vue) |

**快捷方式入口调整：**

左侧栏快捷操作区域新增两个AI功能入口：

```
┌─────────────────────────────────────┐
│  [+ 新建配方] [+ 添加原料]           │
│  [生成周报]   [导出数据]             │
│  📝 智能填单(AI) 📥 智能导入(AI)  ← 新 │
└─────────────────────────────────────┘
```

- 点击后自动切换到对应Tab（无需页面跳转）
- 带 **AI** 标识突出显示为AI功能
- 使用 `handleQuickAction()` 统一处理点击事件

---

#### 🔧 AI对话SSE流式响应修复

**问题现象：**
- 和AI对话没有回应
- 前端控制台报警：`[未找到 IL] 非法 DeepSeek V3`
- SSE解析警告

**根本原因分析：**

| 问题点 | 详情 |
|--------|------|
| 模型名称不匹配 | 前端发送 `DeepSeek V3`（显示名），后端期望 `deepseek`（provider标识） |
| 环境变量未加载 | 后端 `index.ts` 未导入 `dotenv/config`，API Key无法读取 |
| 流式响应缺失 | `_doChatCompletion()` 未处理 `stream: true` 参数 |

**修复方案：**

1. **模型名称映射系统**

```typescript
// AIDashboard.vue - 新增映射表
const modelDisplayNames = {
  'deepseek': 'DeepSeek V3',    // 实际发送 deepseek，显示 DeepSeek V3
  'dashscope': '通义千问',
  'zhipu': '智谱GLM'
};

const displayModelName = computed(() => 
  modelDisplayNames[currentModel.value] || currentModel.value
);
```

2. **环境变量加载**

```typescript
// index.ts - 顶部添加
import "dotenv/config";
```

3. **SSE流式响应实现**

```typescript
// AIService.ts - 新增 _handleStreamResponse() 方法
private async _handleStreamResponse(response, model, onToken?) {
  const reader = response.body?.getReader();
  // 解析 data: {"choices":[{"delta":{"content":"token"}}]} 格式
  // 逐个调用 onToken(token) 回调转发给前端
}
```

---

#### 🎨 UI优化改进

**1. Logo位置修正**

将品牌Logo从标题上方移到与标题同行显示：

```html
<!-- 修改前 -->
<div class="welcome-logo">🐱</div>   <!-- 单独一行 -->
<h3>你好！我是TingStudio AI助手</h3>

<!-- 修改后 -->
<div class="welcome-header">          <!-- 同行显示 -->
  <div class="welcome-logo">🐱</div>
  <h3>你好！我是TingStudio AI助手</h3>
</div>
```

**2. 背景色统一**

将"最近访问/待办区域"背景色调整为与"AI推荐操作区域"一致：

```css
/* 统一样式 */
background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
border: 2px solid #bae6fd;
border-radius: 16px;
```

**3. 欢迎消息功能列表可点击**

```html
<ul class="welcome-features">
  <li @click="handleQuickQuestion('分析销售数据和趋势')">
    ✨ 分析销售数据和趋势
  </li>
  <!-- ... 其他3项 -->
</ul>
```

交互效果：
- 🖱️ Hover：蓝色渐变背景 + 右移4px + 阴影
- 👆 点击：自动填充输入框并发送消息

**4. 销售数字格式化**

大数自动以"万"为单位显示：

```typescript
const formatNumber = (num) => {
  if (num >= 10000) {
    const wan = (num / 10000).toFixed(num % 10000 === 0 ? 0 : 1);
    return `${wan}万`;  // 例：2400000 → 240万
  }
  return num.toLocaleString('zh-CN');
};
```

---

#### 🛠️ 模板结构错误修复

**问题：** 多次出现 `Element is missing end tag` 编译错误

**根因：** `<template>` 标签嵌套结构混乱，`.chat-container` 的 `</div>` 提前关闭

**修复后的正确结构：**

```html
<div class="chat-container">
  <template v-if="activeTab === 'chat'">
    <!-- 所有聊天内容... -->
    <div class="messages-wrapper">...</div>
    <div class="quick-tags-bar">...</div>
    <div class="chat-input-bar">...</div>
  </template>                          <!-- 正确闭合 -->

  <div v-if="smart-form">...</div>   <!-- 智能填单 Tab -->
  <div v-if="smart-import">...</div> <!-- 智能导入 Tab -->
</div>                                <!-- 关闭 chat-container -->
```

---

### 影响范围总览

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) | 重构+优化 | Tab导航 + 智能填单/导入整合 + Logo位置 + 可点击功能列表 + 背景色统一 + 数字格式化 + 模板修复 |
| [AIService.ts](backend/src/services/ai/AIService.ts) | 功能增强 | SSE流式响应 `_handleStreamResponse()` 方法 |
| [index.ts](backend/src/index.ts) | 配置修复 | 添加 `import "dotenv/config"` 加载环境变量 |
| [aiController.ts](backend/src/controllers/aiController.ts) | 优化 | SSE响应头设置 + 流式数据转发 |

---

## 🚀 历史更新 (2026-05-09)

### ✅ AI助手工作台UI优化 + 仪表盘样式统一 + 俏皮话优化

#### 🎨 左侧导航栏俏皮话优化

**修改内容：**

- 删除"AI提示："前缀，直接显示内容
- 文本首行缩进2字符（`text-indent: 2em`）
- 保留点击换一条功能
- 优化显示效果，提升阅读体验

**修改文件：**

- [Home.vue](frontend/src/views/Home.vue) — `WITTY_FALLBACK_POOL` 数据源 + `.witty-text` 样式

---

#### 🎯 仪表盘卡片 Hover 效果统一

将所有页面的仪表盘数据卡片的 hover 效果统一为与 **AI助手工作台** 一致的交互体验：

**统一后的 Hover 效果规范：**

| 属性           | 值                                      | 说明           |
| -------------- | --------------------------------------- | -------------- |
| `transform`    | `translateY(-4px)`                      | 上浮4px动画    |
| `box-shadow`   | `0 12px 30px rgba(0, 0, 0, 0.1)`        | 柔和阴影效果   |
| `border-color` | `transparent`                           | 无边框颜色变化 |
| `transition`   | `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` | 平滑过渡动画   |

**影响的页面：**

| 页面         | 组件      | 文件路径                                                             |
| ------------ | --------- | -------------------------------------------------------------------- |
| 配方管理     | stat-card | [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)       |
| 原料管理     | stat-card | [MaterialList.vue](frontend/src/views/materials/MaterialList.vue)    |
| 业务员管理   | stat-card | [SalesmanList.vue](frontend/src/views/salesmen/SalesmanList.vue)     |
| AI助手工作台 | data-card | [AIDashboard.vue](frontend/src/views/ai/AIDashboard.vue) ✅ 参考标准 |

**设计理念：**

- 🎯 **一致性**：所有页面使用相同的 hover 动画参数
- 🎯 **流畅性**：使用 cubic-bezier 缓动函数实现自然过渡
- 🎯 **视觉层次**：上浮 + 阴影组合增强空间感
- 🎯 **简洁性**：移除边框颜色变化，保持界面清爽

---

#### 🔧 SCSS 编译错误修复

修复了 Home.vue 中 SCSS 样式的括号匹配问题：

**问题原因：**

- 在 `.info-card-witty` 样式块中存在多余的闭合大括号 `}`
- 导致 SASS 编译器报错：`unmatched "}"`

**修复方案：**

- 删除第1278行的多余 `}`
- 验证所有样式块的括号匹配正确
- 确保嵌套层级清晰

**验证结果：**

- ✅ SCSS 编译通过
- ✅ 样式渲染正常
- ✅ 无语法错误

---

### 影响范围总览

| 文件                                                              | 改动类型 | 说明                                 |
| ----------------------------------------------------------------- | -------- | ------------------------------------ |
| [Home.vue](frontend/src/views/Home.vue)                           | UI优化   | 俏皮话文本处理 + 首行缩进 + SCSS修复 |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)    | 样式统一 | stat-card hover 效果对齐 AIDashboard |
| [MaterialList.vue](frontend/src/views/materials/MaterialList.vue) | 样式统一 | stat-card hover 效果对齐 AIDashboard |
| [SalesmanList.vue](frontend/src/views/salesmen/SalesmanList.vue)  | 样式统一 | stat-card hover 效果对齐 AIDashboard |

---

## 🚀 历史更新 (2026-05-08)

### ✅ 模型管理新增"模型应用"功能模块配置 + UI对齐优化

#### 🎯 新增"模型应用"Tab（模型管理页面）

在模型管理页面的**用量监控**Tab上方新增**"模型应用"**Tab，用于管理系统中的AI功能模块的专属模型配置：

**核心功能：**

| 特性             | 说明                                                  |
| ---------------- | ----------------------------------------------------- |
| **功能模块管理** | 为周报、月报、智能配方解析等5个AI功能模块配置专属模型 |
| **完整CRUD操作** | 支持添加、查看、编辑、删除、启用/禁用配置             |
| **实时生效**     | 配置变更立即保存到数据库                              |
| **权限控制**     | 仅管理员可进行增删改操作                              |

**支持的功能模块：**

| 模块ID           | 显示名称     | 用途                   |
| ---------------- | ------------ | ---------------------- |
| `weekly-report`  | 周报AI分析   | 周工作报告的AI智能分析 |
| `monthly-report` | 月报AI分析   | 月度报告的AI智能分析   |
| `smart-form`     | 智能配方解析 | AI智能配方解析功能     |
| `smart-import`   | 智能原料导入 | AI智能原料导入功能     |
| `smart-search`   | 智能数据检索 | AI自然语言检索功能     |

**UI设计特点：**

- 🎨 卡片式布局（响应式网格，最小380px自动填充）
- 🎨 彩色图标系统（每个模块独特渐变色背景）
- 🎨 状态徽章（绿色=启用，红色=禁用）
- 🎨 完整对话框表单（带验证和确认机制）

**技术实现：**

```
前端: ModelManagement.vue
  ├── tabs数组新增 "applications" 项
  ├── 完整UI模板（列表/空状态/对话框）
  ├── CRUD方法（fetch/create/update/delete/toggle）
  └── SCSS样式（250+行响应式布局）

后端:
  ├── modelController.ts — 5个API端点
  ├── routes/ai.ts — 路由注册 (/api/ai/model-applications)
  └── database-better-sqlite3.ts — model_applications表定义

数据库表: model_applications
  ├── id (TEXT, PK)
  ├── module (TEXT, UNIQUE) — 功能模块标识
  ├── module_name (TEXT) — 显示名称
  ├── provider (TEXT) — 模型厂商
  ├── model (TEXT) — 模型类型
  ├── description (TEXT) — 描述说明
  ├── enabled (INTEGER) — 启用状态 (0/1)
  ├── created_by / created_at / updated_at
```

---

#### 🔧 报告中心按钮与复选框垂直对齐优化

修复了报告中心列表中操作按钮与复选框高度不一致的问题：

**调整内容：**

- 按钮容器 top位置：14px → **16px**（与复选框对齐）
- 单个按钮高度：18px（保持不变）
- 图标尺寸：16×16px（未改变）
- 复选框尺寸：18×18px（未改变）

**修改文件：**

- [ReportCenter.vue](frontend/src/views/reports/ReportCenter.vue) — `.card-actions` 和 `.card-action-btn` 样式调整

---

### ✅ AI智能分析自动化 + 智谱GLM默认模型 + Markdown格式优化

#### 🤖 报告AI分析完全自动化（发布即触发）

实现了月报/周报发布时**自动生成AI分析**的完整流程，无需手动点击：

**核心改进**：

| 特性           | 说明                                             |
| -------------- | ------------------------------------------------ |
| **发布即分析** | 点击"发布"按钮后，系统后台自动调用AI生成分析报告 |
| **异步非阻塞** | AI分析在后台执行（30-120秒），不阻塞用户操作     |
| **持久化存储** | 分析结果自动保存到数据库，下次查看直接展示       |
| **即时加载**   | 打开已发布的报告，AI分析区域立即显示完整结果     |

**数据流架构**：

```
┌─────────────────────────────────────────────────────────────┐
│  用户点击"发布" → publishReport(id, data, type)            │
│       ↓                                                     │
│  后端发布API成功 → 异步触发 generateAndSaveAIAnalysis()     │
│       ↓                                                     │
│  调用智谱GLM AI模型 → 生成分析报告（30-120秒）              │
│       ↓                                                     │
│  saveAIAnalysis() → 保存到 reports.dataJson.aiAnalysis      │
│       ↓                                                     │
│  下次打开报告 → fetchReportById() 自动加载 → UI直接展示     │
└─────────────────────────────────────────────────────────────┘
```

**修改文件**：

- [report.ts (store)](frontend/src/stores/report.ts) — `publishReport()` 支持异步AI分析 + `generateAndSaveAIAnalysis()` 新增 + `fetchReportById()` 自动加载已保存的分析
- [report.ts (api)](frontend/src/api/report.ts) — 新增 `saveAIAnalysis()` API方法
- [MonthlyReport.vue](frontend/src/views/reports/MonthlyReport.vue) — `handlePublish()` 传递完整报告数据用于AI分析
- [WeeklyReport.vue](frontend/src/views/reports/WeeklyReport.vue) — 同步修改发布逻辑
- [AIAnalysisPanel.vue](frontend/src/components/AIAnalysisPanel.vue) — 移除手动按钮，改为自动展示 + 状态指示器（loading/pending/complete）

---

#### 🎯 默认使用智谱GLM模型进行报告分析

将AI分析报告的默认模型从通义千问切换为**智谱GLM (glm-4-flash)**：

**模型选择逻辑**：

```
请求到达 → 检查 provider 参数
              ↓
        ┌─────────────────┐
        │ 传入了 provider? │
        └────┬────────┬───┘
             是 ↓    ↓ 否
        使用指定值  优先查找 zhipu (智谱GLM)
                     ↓
               ┌──────────┐
               │ 找到了?   │
               └───┬───┬───┘
                  是↓   ↓否
              使用 zhipu  使用第一个可用模型（降级）
```

**配置信息**：

- **默认模型**: `glm-4-flash`（快速版）
- **备选模型**: `glm-4-air` / `glm-4-plus` / `glm-5`
- **降级策略**: 智谱不可用时自动降级到通义千问 qwen-plus

**修改文件**：

- [reportController.ts](backend/src/controllers/reportController.ts) — `getAIAnalysis()` 优先选择智谱GLM模型 + 日志输出当前使用的模型信息

---

#### ✨ AI分析结果Markdown格式清理

修复了AI分析结果显示大量Markdown符号（`##`、`**`、`*`）的问题：

**清理规则**：

| Markdown语法   | 清理后   |
| -------------- | -------- |
| `### 标题`     | 标题     |
| `**粗体**`     | 粗体     |
| `*斜体*`       | 斜体     |
| `` `代码` ``   | 代码     |
| `[链接](url)`  | 链接     |
| `![图片](url)` | （图片） |
| `- 列表项`     | • 列表项 |
| `1. 有序列表`  | 列表项   |

**关键修复**：

- 修复了 `cleanMarkdown()` 函数中的语法错误（缺少 `.replace(` 方法调用）
- 移除了800字符截断限制，显示完整的AI分析内容
- 保留段落结构和语义完整性

---

#### 影响范围总览

| 文件                                                               | 改动类型 | 说明                                   |
| ------------------------------------------------------------------ | -------- | -------------------------------------- |
| [report.ts (store)](frontend/src/stores/report.ts)                 | 功能增强 | 发布时自动生成AI分析 + 加载时自动读取  |
| [report.ts (api)](frontend/src/api/report.ts)                      | 功能增强 | 新增保存AI分析的API接口                |
| [AIAnalysisPanel.vue](frontend/src/components/AIAnalysisPanel.vue) | 重构     | 移除手动按钮 + 自动展示 + Markdown清理 |
| [MonthlyReport.vue](frontend/src/views/reports/MonthlyReport.vue)  | 功能增强 | 发布时传递完整数据给AI分析             |
| [WeeklyReport.vue](frontend/src/views/reports/WeeklyReport.vue)    | 功能增强 | 同步修改发布逻辑                       |
| [reportController.ts](backend/src/controllers/reportController.ts) | 配置优化 | 默认使用智谱GLM模型                    |

---

### 🎯 核心成果总结

✅ **完全自动化**: 发布报告后AI分析自动生成，无需人工干预  
✅ **智谱GLM优先**: 默认使用国产大模型，响应快速且中文理解优秀  
✅ **持久化存储**: 分析结果永久保存，刷新页面不丢失  
✅ **用户体验提升**: 无需等待，下次查看即时展示  
✅ **格式清晰**: Markdown符号完全清理，阅读体验友好

---

### ✅ AI 解析终止功能完善 + 异步防泄漏机制 + 模型用量监控修复 + ESM/CJS 全面兼容

#### 🛡️ AI 解析异步终止四层防护体系

构建了完整的防泄漏机制，彻底解决异步操作延迟导致终止后结果渲染的问题：

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: 组件层本地状态清理（立即清除所有本地数据）          │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: 组件层 Watch 防护（二次验证 abort 状态）           │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Store 层请求锁 + AbortController（取消 HTTP 请求） │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: API 层 Signal 支持（原生取消机制）                 │
└─────────────────────────────────────────────────────────────┘
```

**核心改进**:

| 特性                | 说明                                                 |
| ------------------- | ---------------------------------------------------- |
| **AbortController** | 浏览器层面真正中断 HTTP 连接                         |
| **请求 ID 锁**      | 每次请求递增 ID，abort 时使当前 ID 失效              |
| **双重检查**        | 响应时同时验证 `currentRequestId` 和 `!parseAborted` |
| **日志追踪**        | 关键节点输出调试信息 `[AI-Usage]`                    |

**修改文件**:

- [ai.ts (store)](frontend/src/stores/ai.ts) — 新增 `parseRequestId`/`parseAbortController` 变量
- [api/ai.ts](frontend/src/api/ai.ts) — 新增 `signal` 参数支持
- [SmartFormTab.vue](frontend/src/views/ai/tabs/SmartFormTab.vue) — 本地状态清理 + Watch 防护
- [SmartImportTab.vue](frontend/src/views/ai/tabs/SmartImportTab.vue) — 同步防护逻辑

---

#### ⏱️ AI 解析终止状态延时切换（2秒平滑过渡）

实现了用户友好的终止后状态管理：

**时间线**:

```
点击"终止" → [0s] 显示"已终止"（红色主题）→ [2s] 自动切换到"待解析"
```

**Store 层实现** ([ai.ts](frontend/src/stores/ai.ts)):

```typescript
abortParseFormula() {
  parseAborted.value = true;
  parseResult.value = null;        // 立即清除解析结果
  parseLoading.value = false;

  // 启动2秒延时定时器
  parseAbortTimer = setTimeout(() => {
    parseAborted.value = false;   // 清除终止状态
    parseError.value = "";        // 清除错误信息
  }, 2000);
}
```

**UI 层优化** ([AiAssistant.vue](frontend/src/views/ai/AiAssistant.vue)):

- 终止状态卡片：红色边框 + 12px 顶部间距 + 脉冲动画
- 子组件指示器：24px margin-top + 平滑过渡效果
- 2秒后自动隐藏或恢复默认样式

---

#### 📊 模型用量数据显示修复（ESM/CJS 兼容性）

**根本原因**: 后端 `AIService.recordUsage()` 在 ESM 环境中使用 `require()` 导致运行时错误：

```
❌ ReferenceError: require is not defined
   at AIService.recordUsage (AIService.ts:208)
```

**影响范围**: 每次 AI 调用成功后，用量数据无法写入数据库，导致前端显示"暂无"

**修复方案**:

| 文件                                                                   | 修复内容                                   |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| [AIService.ts](backend/src/services/ai/AIService.ts)                   | 移除3处 `require()`，改为顶层静态 `import` |
| [ModelHealthChecker.ts](backend/src/services/ai/ModelHealthChecker.ts) | 移除2处 `require()`，改为顶层静态 `import` |
| [AiAssistant.vue](frontend/src/views/ai/AiAssistant.vue)               | 引入 `modelApi` 获取真实累计统计数据       |

**新增功能**:

- Token 用量卡片显示月度累计统计（而非单次响应）
- 操作动态记录每次调用的 Token 消耗和模型信息
- 数据库验证脚本：[check-ai-usage.ts](backend/src/scripts/check-ai-usage.ts)

---

#### 🔍 CommonJS/ESM 全面兼容性检查

对整个后端项目进行了系统性模块兼容性排查：

**项目配置确认**:

- ✅ `"type": "module"` (ESM 模式)
- ✅ `"module": "ESNext"` (TypeScript 配置)
- ✅ `"esModuleInterop": true` (互操作支持)

**排查结果**:

| 类型                                | 数量          | 状态                     |
| ----------------------------------- | ------------- | ------------------------ |
| ESM 静态导入 (`import`)             | ~150+ 处      | ✅ 全部正确              |
| CJS `require()` (.ts 文件)          | **5处 → 0处** | ✅ 已全部修复            |
| CJS `require()` (.cjs 文件)         | 5 处          | ✅ 合理保留              |
| `module.exports` (PM2 配置)         | 1 处          | ✅ 低风险                |
| `__dirname` / `__filename` 替代方案 | 39 处         | ✅ 全部使用 ESM 兼容方式 |

**修复文件清单**:

1. [AIService.ts](backend/src/services/ai/AIService.ts) — +2 import, -3 require
2. [ModelHealthChecker.ts](backend/src/services/ai/ModelHealthChecker.ts) — +1 import, -2 require
3. [AiAssistant.vue](frontend/src/views/ai/AiAssistant.vue) — 引入 modelApi + 用量统计逻辑

**代码规范**:

- 所有 `.ts` 文件禁止使用 `require()`
- 所有 `.ts` 文件禁止使用 `module.exports`
- `.cjs` 文件可继续使用 CommonJS（明确标识）
- 动态加载使用 `import()` 而非 `require()`

---

### 影响范围总览

| 文件                                                                   | 改动类型 | 说明                                   |
| ---------------------------------------------------------------------- | -------- | -------------------------------------- |
| [ai.ts (store)](frontend/src/stores/ai.ts)                             | 功能增强 | 请求锁 + AbortController + 2秒延时重置 |
| [AIService.ts](backend/src/services/ai/AIService.ts)                   | Bug 修复 | ESM 导入 + 详细调试日志                |
| [ModelHealthChecker.ts](backend/src/services/ai/ModelHealthChecker.ts) | Bug 修复 | ESM 导入                               |
| [api/ai.ts](frontend/src/api/ai.ts)                                    | 功能增强 | AbortSignal 支持                       |
| [AiAssistant.vue](frontend/src/views/ai/AiAssistant.vue)               | 功能增强 | 用量统计获取 + 终止卡片样式            |
| [SmartFormTab.vue](frontend/src/views/ai/tabs/SmartFormTab.vue)        | 功能增强 | 终止状态 UI + 本地清理                 |
| [SmartImportTab.vue](frontend/src/views/ai/tabs/SmartImportTab.vue)    | 功能增强 | 同步终止状态处理                       |
| [check-ai-usage.ts](backend/src/scripts/check-ai-usage.ts)             | 新增工具 | 数据库状态验证脚本                     |

---

### 🎯 核心成果总结

✅ **100% ESM 兼容**: 所有 `.ts` 文件完全符合 ES Module 规范  
✅ **零 require() 调用**: 开发环境不再有任何 CommonJS 语法  
✅ **AI 用量记录正常**: 数据成功写入数据库，前端正确显示  
✅ **终止功能完善**: 四层防护 + 2秒延时 + 平滑过渡  
✅ **用户体验提升**: 状态指示清晰，数据展示准确

---

### ✅ 配方原料含量比校验系统 + AI 解析面板交互重构 + 容错恢复

#### 📐 配方原料含量比(ratioFactor)分级校验系统

实现了配方创建时对原料含量比总和的严格校验，前后端双重保障：

| 校验级别        | 范围                         | 行为                            |
| --------------- | ---------------------------- | ------------------------------- |
| 🟢 normal       | \[0.98, 1.02]                | 校验通过，正常创建              |
| 🟡 warning      | \[0.95, 0.98) ∪ (1.02, 1.05] | 弹出确认对话框，用户确认后继续  |
| 🟠 high_warning | \[0.92, 0.95) ∪ (1.05, 1.08] | 弹出确认对话框 + 标记需人工审核 |
| 🔴 error        | <0.92 or >1.08               | **拒绝创建**，提示修正原料用量  |

**设计特点**：

- 🔧 **阈值可配置**：`DEFAULT_THRESHOLDS` 常量（normalLow/High, warningLow/High, highWarningLow/High），支持未来调整
- 🎯 **精度 5 位小数**：`Math.round(x * 100000) / 100000`，超过需求要求的 3 位
- ⚡ **实时计算**：前端 `ratioValidation` computed 属性，随表单数据即时更新
- 🛡️ **双重校验**：前端实时反馈 + 后端 `createFormula`/`updateFormula` 服务端拦截
- 📊 **可视化反馈**：颜色编码卡片 + 渐变进度条 + 偏差百分比 + 明细展开表
- 🧬 **原料类型感知**：自动区分药材(herb)与辅料(supplement)，应用不同的含量比系数

**后端文件**：

| 文件                                                                    | 说明                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| [ratioFactorValidator.ts](backend/src/services/ratioFactorValidator.ts) | 核心校验服务（类型定义 + 分级判定 + 消息生成）   |
| [formulaController.ts](backend/src/controllers/formulaController.ts)    | `validateFormulaRatio` 端点 + create/update 拦截 |
| [formulas.ts (routes)](backend/src/routes/formulas.ts)                  | `POST /validate-ratio` 校验端点                  |

**前端文件**：

| 文件                                                           | 说明                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [formula.ts (api)](frontend/src/api/formula.ts)                | `RatioFactorValidationResult` 类型 + `validateRatio()` API |
| [FormulaForm.vue](frontend/src/views/formulas/FormulaForm.vue) | 实时校验 UI + 提交拦截 + 确认对话框                        |

#### 🎨 AI 智能配方解析 Panel 交互重构（配方管理页）

| 变更          | 说明                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| 🔘 手动解析   | 移除文件上传后自动解析，改为「开始解析」+「取消」按钮                   |
| 📊 进度指示器 | 头部居右显示解析状态（解析中🔵/完成🟢/就绪🟠/失败🔴），含脉冲动画       |
| 📈 进度条优化 | 显示文件名 + 模型标签 + 百分比，完全参照 AI 助手页 SmartImportTab       |
| 🖥 模型信息   | 解析进度下方展示模型名称、版本号、「支持图片识别」标签                  |
| 🐛 Bug 修复   | AI 回填原料时显示原料名称而非 ID（修复 `backfillData` 取值逻辑）        |
| 🏷 未匹配标识 | `getFilteredMaterials` 支持 materialId 为空时仍显示名称（标注"未匹配"） |

#### 🎨 AI 智能营养解析 Panel 交互重构（原料管理页）

与配方管理页的 AI 卡片保持完全一致的交互逻辑和视觉风格：

| 变更          | 说明                                                  |
| ------------- | ----------------------------------------------------- |
| 🔘 手动解析   | 移除文件上传后自动解析，改为「开始解析」+「取消」按钮 |
| 📊 进度指示器 | 头部居右显示解析状态，含 dot-pulse/dot-blink 动画     |
| 📈 进度条优化 | 显示文件名 + 模型标签 + 百分比，完全参照 AI 助手页    |
| 🖥 模型信息   | 解析进度下方展示模型名称、版本号、图片识别标签        |
| 🎨 按钮样式   | 绿渐变异形按钮 + 白底灰框取消按钮，hover 上浮 + 阴影  |

#### 🔄 AI 解析失败容错恢复机制

**三个页面统一**（AI 助手页、配方管理页、原料管理页）的 AI 解析失败区域新增恢复功能：

```
┌──────────────────────────────────────────────────┐
│ ⛔ AI 请求失败：Connection timeout    ✕ [🔄 切换模型重试] │
└──────────────────────────────────────────────────┘
```

- 🔀 **自动切换**：点击「切换模型重试」自动循环到下一个可用 AI 模型
- 🔄 **重新解析**：切换后自动使用已选文件重新发起解析请求
- 🎨 **视觉标识**：渐变橙按钮 `#f59e0b → #d97706`，hover 上浮 + 阴影

#### 影响范围

| 文件                                                                    | 改动                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| [ratioFactorValidator.ts](backend/src/services/ratioFactorValidator.ts) | **新建** — 含量比校验服务                           |
| [formulaController.ts](backend/src/controllers/formulaController.ts)    | +validateFormulaRatio + create/update 拦截          |
| [formulas.ts (routes)](backend/src/routes/formulas.ts)                  | +POST /validate-ratio                               |
| [formula.ts (api)](frontend/src/api/formula.ts)                         | +RatioFactorValidationResult 类型 + validateRatio() |
| [FormulaForm.vue](frontend/src/views/formulas/FormulaForm.vue)          | 含量比校验UI + AI面板重构 + 容错恢复                |
| [MaterialForm.vue](frontend/src/views/materials/MaterialForm.vue)       | AI营养解析面板重构 + 容错恢复                       |
| [SmartImportTab.vue](frontend/src/views/ai/tabs/SmartImportTab.vue)     | 容错恢复按钮                                        |

#### 🎨 UI 组件标准化统一

##### 📄 文件详情页审计日志分页

| 变更        | 说明                                                   |
| ----------- | ------------------------------------------------------ |
| 📄 分页机制 | 审计日志新增分页控件，`pageSize = 8`                   |
| 📐 布局优化 | 分页控件与标题置于同一水平行（标题左对齐，分页右对齐） |
| 🎨 视觉统一 | 分页按钮样式参照 FileManagement "近期动态" 区域        |

##### 🔧 操作列图标标准化

所有管理列表页的操作列按钮统一为标准规格，严格参照 [SalesmanList.vue](frontend/src/views/salesmen/SalesmanList.vue) ：

| 规范        | 说明                                                                  |
| ----------- | --------------------------------------------------------------------- |
| 📏 统一尺寸 | `32×32px`，圆角 `10px`                                                |
| 🎨 统一配色 | 默认 `#64748B`，hover 按语义区分（编辑→🟢绿、删除→🔴红、查看→🟣紫）   |
| 🔤 统一图标 | 相同语义使用完全一致的 TDesign 图标（`edit-1`、`poweroff`、`delete`） |

| 文件                                                              | 改动                                          |
| ----------------------------------------------------------------- | --------------------------------------------- |
| [FileManagement.vue](frontend/src/views/files/FileManagement.vue) | 替换自定义 SVG 为 `edit-1` 图标，更新按钮样式 |
| [MaterialList.vue](frontend/src/views/materials/MaterialList.vue) | 更新 action-btn 样式匹配规范                  |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)    | 标准化按钮尺寸 + 修复重复 `.version-btn` 样式 |

##### 🎨 抽屉组件样式重构

以下 4 个抽屉重构为与 [SalesRecordDrawer.vue](frontend/src/components/SalesRecordDrawer.vue) 一致的视觉模式（保留所有业务逻辑不变）：

| 抽屉           | 文件                                                                                   | 变更                                                      |
| -------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 新增模型       | [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue)                   | `#header` 插槽 + `drawer-card` 卡片布局（info/api/param） |
| 编辑模型       | [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue)                   | 同上 + API 字段分行 + 备用模型 Logo                       |
| 快速创建业务员 | [QuickCreateSalesmanDrawer.vue](frontend/src/components/QuickCreateSalesmanDrawer.vue) | 完整重构，确认按钮移至 header                             |
| 快速录入原料   | [QuickCreateMaterialDrawer.vue](frontend/src/components/QuickCreateMaterialDrawer.vue) | 完整重构，清理已废弃全局 footer 样式                      |

**统一后的布局模式**：

```
┌─────────────────────────────────────────┐
│ Header: 🔹 SVG图标 + 标题  [确认按钮]   │ ← #header 插槽
├─────────────────────────────────────────┤
│ 🟢 info-card (绿色左边框)               │
│   card-header (SVG + 标签)             │
│   card-body (表单字段)                  │
├─────────────────────────────────────────┤
│ 🔵 data-card (蓝色左边框)               │
│   ...                                  │
└─────────────────────────────────────────┘
```

##### 📐 抽屉宽度统一规范

所有页面抽屉组件宽度统一为 `520px`（参照 SalesRecordDrawer）：

| 文件                                                                                   | 原宽度  | 新宽度  |
| -------------------------------------------------------------------------------------- | ------- | ------- |
| [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue) — 新增模型        | `920px` | `520px` |
| [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue) — 编辑模型        | `920px` | `520px` |
| [QuickCreateSalesmanDrawer.vue](frontend/src/components/QuickCreateSalesmanDrawer.vue) | `680px` | `520px` |
| [QuickCreateMaterialDrawer.vue](frontend/src/components/QuickCreateMaterialDrawer.vue) | `680px` | `520px` |
| [VersionList.vue](frontend/src/views/versions/VersionList.vue) — 快照抽屉              | `600px` | `520px` |

##### 🔧 Bug 修复

| 问题                                  | 根因                                                 | 修复方案                               |
| ------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| AIService.ts `require is not defined` | ESM 模式 (`"type": "module"`) 中混用 CJS `require()` | `import { getDb }` 改为顶层静态 import |

##### 影响范围

| 文件                                                                                   | 改动                             |
| -------------------------------------------------------------------------------------- | -------------------------------- |
| [AIService.ts](backend/src/services/ai/AIService.ts)                                   | ESM/CJS 兼容修复                 |
| [FileDetail.vue](frontend/src/views/files/FileDetail.vue)                              | 审计日志分页 + 分页/标题同行布局 |
| [FileManagement.vue](frontend/src/views/files/FileManagement.vue)                      | 操作图标标准化                   |
| [MaterialList.vue](frontend/src/views/materials/MaterialList.vue)                      | 操作图标标准化                   |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)                         | 操作图标标准化 + 重复样式修复    |
| [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue)                   | 抽屉重构 + 布局优化 + Logo       |
| [QuickCreateSalesmanDrawer.vue](frontend/src/components/QuickCreateSalesmanDrawer.vue) | 抽屉重构                         |
| [QuickCreateMaterialDrawer.vue](frontend/src/components/QuickCreateMaterialDrawer.vue) | 抽屉重构 + 全局样式清理          |
| [VersionList.vue](frontend/src/views/versions/VersionList.vue)                         | 抽屉宽度统一                     |

---

## 🚀 更新 (2026-05-05)

### ✅ AI 智能助手全面升级 + Bug 修复

#### 🤖 AI 解析标签页加载异常修复

| 问题                     | 根因                                                                                             | 修复方案                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| AI 解析标签页持续加载    | `onMounted` 中调用已重命名的 `loadModelVersions`，抛出 ReferenceError，阻止 `initialized = true` | 改为 `loadModelVersionsWithLoading` + try-catch-finally 确保初始化完成 |
| 未使用的导入导致编译警告 | `modelApi` 和 `ModelVersionOption` 已移至 store 但未清理导入                                     | 移除冗余 import 声明                                                   |

#### 🧠 AI 助手模型选择一致性修复

| 问题                           | 根因                                              | 修复方案                                                   |
| ------------------------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| 切换模型后版本显示不一致       | `handleReparseWithModel` 未重置 `selectedVersion` | 添加 `selectedVersion = ''` + `loadModelVersions` 重置逻辑 |
| 版本显示技术标识符而非友好名称 | 进度条直接显示 `qwen-max` 等技术 ID               | 使用 `getVersionLabel()` 渲染可读标签                      |
| 版本数据未跨组件共享           | `modelVersions` 仅在 `AiAssistant.vue` 局部维护   | 提升到 Pinia store 层，子组件通过 store 访问               |

#### 💰 原料单价显示异常修复

| 问题                     | 根因                                                                            | 修复方案                                                                             |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 炒白扁豆、草果单价未录入 | 后端匹配成功但 `unitPrice` 未显式设置，前端 computed 未追踪 `allMaterials` 依赖 | 后端 `applyMatch` 显式设置 `unitPrice = null`；前端 `quoteItems` 引入 `allMats` 依赖 |
| 解析前原料数据未加载     | `materialStore.allMaterials` 加载时序问题                                       | `handleParse` 中解析前确保 `fetchAllForSelect()` 完成                                |

#### 📊 模型用量监控数据同步修复

| 问题               | 根因                                    | 修复方案                                            |
| ------------------ | --------------------------------------- | --------------------------------------------------- |
| 用量统计不实时更新 | 数据仅在 tab 切换时加载一次，无定时刷新 | 用量 tab 每 15s 自动刷新 + 模型 tab 每 60s 自动刷新 |
| 无手动刷新入口     | 用户调用模型后无法主动查看最新用量      | 新增刷新按钮 + `refreshUsageStats` 函数             |

#### 🎨 模型管理刷新按钮 UI 美化

- **专属样式类**: `refresh-usage-btn` 替代通用 `action-btn action-btn--ghost`
- **视觉优化**: 圆角 10px、柔和边框 + 微阴影、hover 上浮效果、active 按压反馈
- **加载动画**: 刷新期间图标旋转 + 蓝色主题 + 禁止重复点击
- **布局改进**: flex gap 布局替代内联 margin，与日期选择器对齐

#### 📄 文件详情页全屏预览优化

- **全屏预览对话框**: 新增 `FilePreviewDialog` 组件，支持文件内容全屏查看
- **预览入口**: 文件详情页预览区域添加全屏按钮（TDesign `fullscreen` 图标）
- **文件管理列表**: 预览按钮同样接入全屏对话框

#### 📋 模型管理告警设置 Tab UI 优化

- 告警设置标签页视觉风格与用量统计、模型列表统一
- 优化表单布局和交互体验

#### 影响范围

| 文件                                                                 | 改动                                             |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| [AiAssistant.vue](frontend/src/views/ai/AiAssistant.vue)             | 修复加载异常 + 清理导入 + 版本数据从 store 读取  |
| [SmartFormTab.vue](frontend/src/views/ai/tabs/SmartFormTab.vue)      | 模型版本一致性 + 原料单价依赖追踪 + 价格计算修复 |
| [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue) | 刷新按钮 UI + 自动刷新定时器 + 手动刷新函数      |
| [ai.ts (store)](frontend/src/stores/ai.ts)                           | 版本管理提升到 store + getVersionLabel           |
| [aiController.ts](backend/src/controllers/aiController.ts)           | unitPrice 显式设置 + 匹配失败时清空              |
| [FileDetail.vue](frontend/src/views/files/FileDetail.vue)            | 全屏预览对话框                                   |
| [FileManagement.vue](frontend/src/views/files/FileManagement.vue)    | 预览按钮接入全屏对话框                           |

---

## 🚀 更新 (2026-04-30)

### ✅ UI 统一优化：助手组件 + 近期动态布局重构

#### 🎨 四页面助手样式统一（参照配方师小助手）

所有管理页面的助手组件统一为**白色主体 + 绿色Header**的配方师小助手风格：

| 页面       | 助手名称     | 状态        |
| ---------- | ------------ | ----------- |
| 配方管理   | 配方师小助手 | ✅ 参照标准 |
| 销量分析   | 销量管理助手 | ✅ 已统一   |
| 业务员管理 | 业务员小助手 | ✅ 已统一   |
| 原料管理   | 原料管理助手 | ✅ 已统一   |

**统一后的样式规范**：

```
┌─────────────────────────────────────┐
│  🟢 绿色渐变 Header (负边距拉伸)     │ ← linear-gradient(135deg, #10B981, #059669)
│  标题 + 分页按钮 (白色文字)          │
├─────────────────────────────────────┤
│  ⬜ 白色主体背景                      │
│                                     │
│  🟡 黄色卡片 - 高优先级 (#FFFBEB)    │
│  🔵 蓝色卡片 - 中优先级 (#EFF6FF)    │
│  🟣 紫色卡片 - 低优先级 (#F5F3FF)    │
│                                     │
├─────────────────────────────────────┤
│  Footer: 灰色分隔线 + 提示文字        │
│                        💚 装饰图标   │
└─────────────────────────────────────┘
```

#### 📐 底部近期动态区域布局

三个管理页面底部新增/调整 **activity-section**，采用 **2:1 Grid 布局**（左侧近期动态 + 右侧助手）：

| 页面       | 左侧内容           | 右侧内容             |
| ---------- | ------------------ | -------------------- |
| 销量分析   | 近期动态（时间线） | 销量管理助手（待办） |
| 业务员管理 | 近期业务员动态     | 业务员小助手（待办） |
| 配方管理   | 近期动态           | 配方师小助手（待办） |

**响应式设计**：

- 大屏（≥1024px）：`grid-template-columns: 2fr 1fr`
- 小屏（<1024px）：单列堆叠

#### 🔧 Bug 修复

| 问题                      | 根因                                                 | 修复方案                       |
| ------------------------- | ---------------------------------------------------- | ------------------------------ |
| MaterialList.vue 编译错误 | 模拟数据中使用中文引号「」代替英文引号               | 改为标准英文单引号包裹字符串   |
| 助手背景色未生效          | 存在重复的 `&--assistant` 样式定义，旧样式覆盖新样式 | 删除重复定义，保留白色背景版本 |

#### 📄 ServerError 页面优化

- **布局调整**：左右面板比例从 `45:55` 改为 `30:70`（与登录页一致）
- **返回按钮增强**：新增登录图标 SVG（箭头进入门框样式）

#### 影响范围

| 文件                                                              | 改动内容                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| [SalesAnalysis.vue](frontend/src/views/sales/SalesAnalysis.vue)   | 新增 activity-section（近期动态+助手）、录入按钮右对齐 |
| [SalesmanList.vue](frontend/src/views/salesmen/SalesmanList.vue)  | 助手样式统一为配方师风格、移除 dashboard 内助手        |
| [MaterialList.vue](frontend/src/views/materials/MaterialList.vue) | 助手样式统一为配方师风格、修复中文引号语法错误         |
| [ServerError.vue](frontend/src/views/errors/ServerError.vue)      | 布局 3:7 调整、返回登录按钮增加图标                    |

---

### ✅ AI 解析匹配全面升级 + 数据库完整备份工具 (2026-04-29)

#### 🔧 Bug 修复（3项）

| 问题                  | 根因                                                                    | 修复方案                                                 |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| 配方列表搜索失效      | TDesign `t-input` 的 `@input` 在 `v-model` 更新前触发，keyword 始终为空 | 改为 `watch(searchKeyword)` 响应式监听（与原料管理一致） |
| AI 回填原料名称未显示 | `backfillData()` 缺少按名称二次匹配逻辑                                 | 新增 `allMats.find(x => x.name === m.name)` 兜底查找     |
| 营养接口重复日志      | `getMaterialNutrition` 的 `_logLabel` 参数导致每次调用打印日志          | 移除 `_logLabel` 参数                                    |

#### 📦 原料数据库全面补全

从 `test/` 目录全部 **14 个 Excel 营养成分表** 批量导入：

- **新增 70 种原料** → 数据库总计 **132 种原料**（全部含营养数据）
- 覆盖截图未匹配的 6 种：**芦根、化橘红、乌药叶、黄芥子、蒲公英、西洋参**
- 新增脚本：[importAllTestMaterials.ts](backend/src/scripts/importAllTestMaterials.ts)

#### 🤖 AI 别名映射扩展

[aiController.ts](backend/src/controllers/aiController.ts) 别名表从 **12 条 → 150+ 条**：

```
芦根 ← 干芦根/鲜芦根/芦茅根
化橘红 ← 化州橘红/橘红/毛橘红
西洋参 ← 西洋人参/美国参/花旗参
蒲公英 ← 蒲公草/黄花地丁
... (40+ 种原料的常见变体)
```

#### 💾 数据库备份/恢复工具（v2.0）

换电脑后一键完整同步数据库，包含表结构、索引、触发器及全量数据，并自动校验一致性：

| 脚本                                                         | 用途                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [exportDatabase.ts](backend/src/scripts/exportDatabase.ts)   | 导出全部表结构 + 索引 + 触发器 + 全量数据 → JSON（含 SHA-256 数据哈希 + 结构哈希）   |
| [restoreDatabase.ts](backend/src/scripts/restoreDatabase.ts) | 从 JSON 恢复完整数据库（自动拓扑排序建表 → 数据迁移 → 索引/触发器重建 → 一致性校验） |

**v2.0 新增能力：**

- 🏗️ **自动拓扑排序建表**：根据外键依赖自动计算建表顺序，无需硬编码，新增表时脚本自动适配
- 🔑 **索引完整导出/恢复**：导出所有索引定义，恢复时自动重建（`CREATE INDEX IF NOT EXISTS`）
- ⚡ **触发器导出/恢复**：支持触发器的完整迁移
- 🔒 **SHA-256 数据哈希校验**：每张表数据生成哈希，恢复后逐表比对，确保零差异
- 🧬 **结构哈希校验**：整体表结构生成哈希，验证表结构一致性
- 🔄 **自增序列重置**：恢复后自动重置 SQLite rowid 序列
- 🔙 **v1 向后兼容**：自动识别 v1/v2 备份格式，v1 备份仍可正常恢复（不含索引/哈希校验）

```bash
# ─── 导出备份 ───
cd backend && npx tsx src/scripts/exportDatabase.ts

# ─── 恢复数据库 ───
# 自动使用最新备份
cd backend && npx tsx src/scripts/restoreDatabase.ts

# 指定备份文件
npx tsx src/scripts/restoreDatabase.ts -f tingstudio_backup_2026-04-28.json

# 强制覆盖已有数据库（旧库自动备份为 .before_restore）
npx tsx src/scripts/restoreDatabase.ts --force

# 仅预览不写入
npx tsx src/scripts/restoreDatabase.ts --dry-run

# 跳过一致性校验（加速恢复，不推荐）
npx tsx src/scripts/restoreDatabase.ts --force --skip-verify
```

**依赖条件：**

- Node.js ≥ 18，项目依赖已安装（`npm install`）
- `better-sqlite3`、`crypto`（Node.js 内置）
- 导出时需存在源数据库文件 `backend/data/tingstudio.db`

**注意事项：**

- 恢复时若数据库已存在，必须加 `--force`，旧库会自动备份为 `tingstudio.db.before_restore`
- 备份文件为纯 JSON，可通过 Git 管理，但含用户密码哈希，**勿公开分享**
- 不同 SQLite 版本间 SQL 格式可能微有差异，结构哈希不一致时属正常现象，不影响数据正确性
- 换电脑流程：① 旧电脑执行导出 → ② 将 `backend/data/backup/` 下的 JSON 文件复制到新电脑同目录 → ③ 新电脑执行恢复

备份文件位置：`backend/data/backup/tingstudio_backup_时间戳.json`

#### 📊 当前数据库快照

| 表名                                                                                   | 记录数  | 说明                          |
| -------------------------------------------------------------------------------------- | ------- | ----------------------------- |
| users                                                                                  | 20      | 用户表（含 admin/admin123）   |
| materials                                                                              | **132** | 原料表（药材 + 辅料）         |
| material_nutrition                                                                     | **132** | 营养数据（蛋白/脂肪/碳水/钠） |
| formulas                                                                               | 6       | 配方表                        |
| formula_versions                                                                       | 13      | 版本快照                      |
| salesmen                                                                               | 29      | 业务员表                      |
| nutrition_profiles                                                                     | 20      | 营养档案模板                  |
| export_templates                                                                       | 20      | 导出模板                      |
| api_data_interfaces                                                                    | 20      | API 接口配置                  |
| export_jobs / formula_nutrition_summaries / nutrition_analysis_reports / share_configs | 0       | 空表（已建结构）              |
| **合计**                                                                               | **392** | 13 张表                       |

---

### ✅ 销量录入 UI 全面重构 + 页面样式统一 (2026-04-29)

#### 🎨 销量录入抽屉（SalesRecordDrawer）全面改造

- **Card 卡片布局**: 内部信息按功能分区为 4 张卡片
  - 配方信息 Card（蓝色左边框）— 选择配方 + 关联业务员（同行展示）
  - 统计周期 Card（橙色左边框）— 统计月份 + 周期类型
  - 销售数据 Card（绿色左边框）— 销售数量 + **销售金额（万元）**
  - 备注信息 Card（灰色左边框）— 备注文本域
- **按钮位置调整**: 取消/确认按钮从底部移至标题行右侧，仅保留「确认录入」绿色按钮 + 关闭 X
- **金额单位优化**: 销售金额输入单位从「元」改为「**万元**」，提交时自动 ×10000 转元存储
- **保存功能修复**: 表单校验逻辑重写（try/catch），确保数值类型转换正确

#### 📐 配方列表列宽微调

| 列       | 调整     | 新宽度        |
| -------- | -------- | ------------- |
| 版本状态 | +20px    | 170px         |
| 更新时间 | -15px    | 165px         |
| 操作     | -5px     | 155px         |
| 负责人   | 居中对齐 | align: center |

#### 📊 销量分析页样式对齐

- **底部边距**: 添加 `padding-bottom: 32px`，与配方管理页一致
- **录入销量按钮**: 蓝色渐变 → **深色 #1e293b 实心**（与「创建新配方」按钮统一）
- **空状态**: 简单文字 → `<t-empty>` + 操作按钮（点击打开抽屉录入）
- **按钮样式提升**: `.add-formula-btn` 从嵌套作用域提升到组件根级，确保空状态按钮样式生效

#### 影响范围

| 文件                                                                   | 改动                                        |
| ---------------------------------------------------------------------- | ------------------------------------------- |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)         | 列宽调整 + 负责人居中                       |
| [SalesRecordDrawer.vue](frontend/src/components/SalesRecordDrawer.vue) | Card布局 + 按钮右上角 + 万元单位 + 保存修复 |
| [SalesAnalysis.vue](frontend/src/views/sales/SalesAnalysis.vue)        | 底部边距 + 按钮样式 + 空状态                |

---

### ✅ P1 阶段 — 配方定价系统（可调整原料单价）

#### 💰 核心功能

- **原料单价微调**: 配方编辑时支持单独调整每个原料的单价，覆盖原料库基价
- **微调标记**: 调整后的原料显示橙色「**调**」文字 badge，清晰标识
- **成本自动重算**: 单价变更后实时更新原料小计、配方总成本、报价
- **版本快照记录**: 保存时将 adjustedPrice 写入 snapshot_json，永久保留

#### 📋 版本历史增强

- **基价调整追踪**: `buildChanges()` 新增 `adjustedPrice` 字段对比检测
  - 旧值显示为「**基价**」（表示使用原始库价）
  - 新值显示为「**¥xx.xx/kg**」
- **版本名称智能生成**: `buildVersionName()` 新增基价分支
  - 例：修改肉豆蔻基价、修改藿香基价
- **变更明细展示**: 版本详情右侧面板展示完整的单价变更前后值

#### 📡 近期动态增强

- **基价变动事件**: 近期动态新增独立的「**原料单价调整**」warning 类型条目
  - 显示格式：`正阳御湿膏 v1.7 调整了 肉豆蔻 的单价`
  - 支持多原料批量调整合并展示
- **排序修复**: 移除类型优先级排序（success > warning > info），改为纯时间倒序
  - 确保最新变动（含基价调整）始终在第 1 页可见
- **路由监听**: 列表页新增路由变化 watch，保存后跳转回列表时强制刷新数据

#### 🔄 版本多维对比视图升级

- **含量/报价双模式切换**: 重置按钮旁新增切换按钮
  - 含量模式：显示原料名称 + 百分比 + 进度条（原有）
  - 报价模式：显示原料名称 + 单价(¥/kg) + 用量(g) + 小计成本(¥)
- **差异高亮**: 报价模式下与基准版本的差异同样高亮
  - 🟢 绿色 — 新增原料 | 🟡 黄色 — 单价有变 | 🔴 虚线 — 缺失
- **微调标识**: 报价模式下调整过的单价显示橙色 + 「**调**」badge
- **按钮风格统一**: 切换按钮与重置按钮统一采用边框+浅底风格
  - 含量/报价: 绿/橙主题 | 重置: 红色主题

#### 🔧 修复清单

| 问题                                        | 根因                                        | 方案                 |
| ------------------------------------------- | ------------------------------------------- | -------------------- |
| ⚡ 图标不显示 (FormulaForm / FormulaDetail) | TDesign 图标名渲染异常                      | 改为文字 badge「调」 |
| 近期动态不显示基价调整                      | 类型优先级排序把 warning 挤到后面           | 改为时间倒序         |
| 保存后列表数据不刷新                        | 组件复用时不触发 onMounted                  | 添加路由 watch 监听  |
| 切换按钮图标不显示 (VersionCompare)         | TDesign `money-circle` / `chart-bar` 不存在 | 改为 ¥ / % 符号      |

#### 影响范围

| 文件                                                                 | 改动                                     |
| -------------------------------------------------------------------- | ---------------------------------------- |
| [FormulaForm.vue](frontend/src/views/formulas/FormulaForm.vue)       | 「调」badge + 路由监听                   |
| [FormulaDetail.vue](frontend/src/views/formulas/FormulaDetail.vue)   | 「调」badge                              |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)       | 近期动态排序修复 + 路由监听              |
| [VersionCompare.vue](frontend/src/views/versions/VersionCompare.vue) | 含量/报价双模式切换                      |
| [formulaController.ts](backend/src/controllers/formulaController.ts) | buildChanges + buildVersionName 基价处理 |

---

### ✅ 业务员模块 UI 修复与测试便利性优化 (2026-04-27)

#### 🎨 添加业务员按钮颜色修复

- **问题诊断**: 空数据状态下按钮使用 `<t-button theme="primary">`，走 TDesign 默认粉色主题，与配方列表的绿色渐变风格不一致
- **解决方案**: 改为原生 `<button class="add-formula-btn">`，统一复用绿色渐变样式
- **样式穿透**: 在非 scoped `<style>` 中添加 `.salesman-list .add-formula-btn` 规则
  - `background: linear-gradient(135deg, #10b981, #059669)` — 绿色渐变
  - hover 时上浮 2px + 绿色光晕阴影
- **影响文件**: `SalesmanList.vue`（模板 + 样式穿透规则）

#### 🧪 新增业务员表单自动填充

- **工号自动生成**: `YW` + 时间戳后5位 + 2位随机数（共8位），避免手动输入
- **部门**: 默认填充「销售部」
- **电话**: 自动生成 `138` 开头的 11 位手机号
- **邮箱**: 自动生成 `salesman` + 时间戳 + `@tingstudio.com` 格式
- **影响文件**: `SalesmanForm.vue`（onMounted 新增分支）

---

### ✅ 数据库驱动修复与本地调试优化 (2026-04-24)

#### 🔧 后端数据库问题修复

- **问题诊断**: 发现 `sql.js` 包导入失败导致数据库连接异常
- **解决方案**: 切换到 `better-sqlite3` 作为默认数据库驱动
- **修复文件**:
  - `src/config/database-better-sqlite3.ts` - 新的数据库连接实现
  - `src/config/database-adapter.ts` - 更新导入路径
  - `src/index.ts` - 修复数据库初始化导入
- **表结构修复**: 手动添加缺失列（display_name、avatar、bio、email、phone）
- **测试验证**: 本地登录功能完全正常

#### 🎨 前端界面优化

- **登录页面布局**: 左右面板宽度比例调整为 3:7
  - 左侧品牌展示区：30% 宽度
  - 右侧登录表单区：70% 宽度
  - CSS 调整：`flex: 0 0 30%` / `flex: 0 0 70%`
- **用户体验**: 登录表单区域更宽敞，视觉效果更佳

#### 🐛 问题解决记录

- **EdgeOne Pages 401 错误**: 确认是预览链接过期问题，需要重新发布
- **本地调试数据库错误**: 修复数据库驱动和表结构问题
- **构建稳定性**: 确保前后端服务稳定运行

### ✅ 前端构建修复完成 (2026-04-22)

- **类型错误修复**: 修复 68+ TypeScript 类型错误，涵盖 22 个文件
- **依赖补全**: 安装缺失的 xlsx 包，解决模块解析问题
- **类型声明**: 新增 `src/env.d.ts` Vite 环境类型声明文件
- **API 层优化**:
  - `http.ts`: 添加 axios 模块扩展声明，修复 `import.meta.env` 类型问题
  - `weather.ts`: 扩展 `CityLocation` 接口，添加 `rateLimited` 状态导出
- **组件层修复**:
  - `ExcelImportPanel.vue`: 修复解析结果类型处理
  - `NutritionExcelImport.vue`: 添加 `NutritionParseResult` 接口定义
- **视图层优化**:
  - 移除未使用的变量和函数（`userInitial`、`searchPlaceholder`、`showAddBtn` 等）
  - 修复参数类型断言（`ctx: any`、`fileInputRef.value` 赋值）
  - 修复重复属性（SalesmanList 的 `label` 字段）
  - 扩展 `ActivityItem` 类型支持 `'warning'`
- **构建验证**: `vue-tsc --noEmit && vite build` 通过，零错误

### v2.18.1 (2026-04-17)

#### 原料列表删除交互优化

- 删除确认从 `t-dialog` 全屏弹窗改为 `t-popconfirm` 气泡确认（theme="danger" 红色警告风格）
- 点击删除按钮后弹出气泡浮层，显示「确定要删除原料「xxx」吗？删除后无法恢复。」
- 用户确认后直接执行删除，无需额外弹窗遮罩层，交互更轻量流畅
- 移除 `deleteDialogVisible`、`deleteLoading`、`deleteTarget` 三个冗余 ref 变量
- `handleDelete` 函数简化为直接调用 `materialStore.deleteMaterial()` 的 async 函数
- 移除独立的 `confirmDelete` 函数

#### 影响范围

- **前端视图**: MaterialList.vue（模板 + script 双向精简）

## 🚀 生产环境升级完成 (2026-04-20)

- **数据库迁移**：从 SQLite 迁移到腾讯云 MySQL（企业级数据库）
- **后端服务**：部署到腾讯云函数 SCF
- **前端托管**：部署到 EdgeOne Pages
- **数据完整性**：成功迁移 153 条业务记录到云端数据库
- **系统稳定性**：显著提升，支持高并发访问

## 技术栈

### 后端 (Development)

- **运行时**: Node.js 18+ (TypeScript)
- **Web 框架**: Express 4.21+
- **数据库**: SQLite (better-sqlite3) + WAL 模式
- **认证**: JWT (jsonwebtoken + bcryptjs)
- **安全**: Helmet + CORS + express-rate-limit
- **日志**: Morgan
- **Excel**: xlsx | **PDF**: pdfkit
- **AI 服务**: 通义千问 / 智谱 GLM / DeepSeek 多模型支持

### 前端 (Production)

- **框架**: Vue 3.4+ (Composition API, TypeScript 5.4+)
- **构建工具**: Vite 5.1+
- **路由**: Vue Router 4.3+
- **状态管理**: Pinia 2.1+
- **UI 组件库**: TDesign Vue Next 1.9+
- **HTTP 客户端**: Axios
- **样式**: SCSS + CSS 自定义属性
- **托管服务**: EdgeOne Pages (CDN 加速)

### 基础设施

| 服务     | 技术选型                  | 用途                  |
| -------- | ------------------------- | --------------------- |
| 前端构建 | Vite 5.1                  | 开发服务器 + 生产构建 |
| 后端框架 | Express 4.21              | RESTful API 服务      |
| 数据库   | SQLite (better-sqlite3)   | 数据持久化 (WAL 模式) |
| AI 服务  | 通义千问 / GLM / DeepSeek | 配方解析 + 营养分析   |
| 天气服务 | 和风天气 API              | 实时天气展示          |

## 🌐 访问地址

### 开发环境

- **前端地址**: `http://localhost:5174` (或 5173)
- **后端 API**: `http://localhost:3000/api`
- **健康检查**: `http://localhost:3000/api/health`
- **测试账号**: `admin` / `admin123`

## 📊 项目状态

| 组件         | 状态                    | 说明                                    |
| ------------ | ----------------------- | --------------------------------------- |
| **后端服务** | ✅ 正常运行             | Express + SQLite (better-sqlite3)       |
| **前端应用** | ✅ 正常运行             | Vue 3 + TDesign + Vite                  |
| **数据库**   | ✅ 13 张表 / 392 条记录 | SQLite WAL 模式，含 132 种原料+营养数据 |
| **AI 解析**  | ✅ 匹配率显著提升       | 150+ 别名映射 + 模糊匹配 + 名称标准化   |
| **配方搜索** | ✅ 已修复               | watch 响应式监听模式                    |
| **数据备份** | ✅ 可用                 | exportDatabase / restoreDatabase 脚本   |

---

**TingStudio** - 用心记录每一天 ♡

## 📦 快速开始

### 环境要求

- Node.js >= 18.x
- npm 或 pnpm
- Git

### 本地开发

#### 1. 克隆项目

```bash
git clone <repository-url>
cd ting-studio
```

#### 2. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

#### 3. 配置环境变量

**后端配置** ([backend/.env](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env)):

```bash
# 开发环境使用 SQLite
DB_TYPE=sqlite
DB_PATH=./data/tingstudio.db

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=http://localhost:5174
```

**前端配置** ([frontend/.env.development](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.development)):

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

#### 4. 启动服务

**启动后端**:

```bash
cd backend
npm run dev
# 服务运行在 http://localhost:3000
```

**启动前端**:

```bash
cd frontend
npm run dev
# 服务运行在 http://localhost:5174
```

#### 5. 初始化数据库

```bash
cd backend
npm run init-db      # 初始化数据库表结构
npm run seed         # 导入种子数据（可选）
```

## 🏗️ 项目架构

### 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                   用户浏览器                          │
│         (Vue 3 + TDesign UI + Pinia)                │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP
┌──────────────────▼──────────────────────────────────┐
│              前端开发服务器 (Vite)                     │
│          热更新 + TypeScript 编译                     │
└──────────────────┬──────────────────────────────────┘
                   │ API 调用
┌──────────────────▼──────────────────────────────────┐
│           后端服务 (Express + TypeScript)             │
│        JWT 认证 + RESTful API + 中间件               │
└──────────────────┬──────────────────────────────────┘
                   │ 数据库连接
┌──────────────────▼──────────────────────────────────┐
│           SQLite 数据库 (better-sqlite3)              │
│            WAL 模式 + 外键约束                       │
│     (14张表 · 392条记录 · 132种原料+销量数据)                 │
└─────────────────────────────────────────────────────┘

数据备份: backend/data/backup/tingstudio_backup_*.json
恢复工具: npx tsx src/scripts/restoreDatabase.ts
```

### 目录结构

```
ting-studio/
├── backend/                              # 后端服务
│   ├── src/
│   │   ├── config/                       # 配置模块
│   │   │   ├── database.ts              # SQLite 连接配置
│   │   │   ├── mysql.ts                 # MySQL 连接配置
│   │   │   └── database-adapter.ts      # 双模式数据库适配器
│   │   ├── controllers/                  # 控制器层 (8个模块)
│   │   ├── middleware/                   # 中间件 (认证/校验/错误处理)
│   │   ├── routes/                       # 路由定义 (8个模块)
│   │   ├── scripts/                      # 工具脚本
│   │   │   ├── seedData.ts              # 种子数据（52种原料 + 4个配方）
│   │   │   ├── importRealData.ts        # 真实Excel配方导入
│   │   │   ├── importAllTestMaterials.ts # test/目录全部原料批量导入
│   │   │   ├── exportDatabase.ts        # 数据库完整导出（表结构+数据→JSON）
│   │   │   ├── restoreDatabase.ts       # 数据库恢复（JSON→数据库）
│   │   │   └── test-api.cjs            # API 测试脚本
│   │   ├── services/                     # 业务服务层
│   │   │   └── ai/                       # AI 服务 (多模型)
│   │   └── utils/                        # 工具函数
│   ├── scf/                             # 云函数部署包
│   │   ├── index.js                     # 函数入口
│   │   ├── package.json                 # 云函数依赖
│   │   └── .env.production              # 生产环境配置
│   ├── data/                            # SQLite 数据库 (开发环境)
│   ├── cloudbaserc.json                  # 云函数配置
│   ├── ecosystem.config.js              # PM2 生产配置
│   └── package.json
│
├── frontend/                            # 前端应用
│   ├── src/
│   │   ├── api/                         # API 接口层
│   │   ├── stores/                      # Pinia 状态管理
│   │   ├── views/                       # 页面组件
│   │   ├── components/                  # 公共组件
│   │   ├── assets/styles/               # 样式体系
│   │   └── router/                      # 路由配置
│   ├── edgeone/                        # EdgeOne 配置
│   ├── dist/                           # 构建输出
│   └── package.json
│
├── PRODUCTION_DEPLOYMENT_GUIDE.md       # 生产环境部署指南
├── EDGEONE_DEPLOYMENT_FIX.md           # EdgeOne 故障修复指南
├── SCF_MANUAL_DEPLOYMENT_GUIDE.md      # 云函数手动部署指南
└── README.md                           # 项目文档 (本文件)
```

## 🎯 核心功能特性

### 🔐 认证与权限

- 用户注册/登录 (JWT Token)
- 多角色支持 (admin / formulist)
- Token 自动续期与过期处理
- 个人资料管理 (昵称/头像/简介/邮箱/手机号)

### 📊 原料管理

- 原料信息 CRUD (自动生成编码 MAT 序列)
- 原料类型区分 (药材/辅料)
- 营养成分录入 (25+ 营养字段)
- 能量自动计算 (蛋白质×17+脂肪×37+碳水化合物×17)
- AI 智能营养解析 (文档上传 → 结构化数据)

### 🧪 配方管理

- 配方信息 CRUD (关联业务员 + 多原料)
- 成品重量与含量比系数设置
- Excel 批量导入配方原料
- 自动版本控制 (每次更新生成变更快照)
- 手动创建/发布版本
- 版本对比 (全字段差异可视化)
- AI 智能填单 (文档解析 → 一键回填)

### 👥 业务员管理

- 业务员信息 CRUD
- 关键词搜索与状态筛选
- 软删除 (停用)

### 🥗 营养分析

- 配方营养汇总计算
- 核心营养素卡片可视化
- NRV 占比进度条展示
- 营养标准管理 (预置 6 类人群国标数据)
- 合规性检查 (三级状态: 达标/警告/超标)
- 营养数据 Excel 导入

### 📤 导出与分享

- **Excel 导出**: 配方信息 + 原料清单 + 营养数据 (三 Sheet)
- **PDF 导出**: 专业排版配方报告
- 导出模板管理 (PDF/Excel/API/打印)
- 导出任务创建与状态跟踪
- 分享链接创建与管理
- API 数据接口管理面板

### 🤖 AI 智能助手

- **智能填单**: 上传配方文档 → AI 解析为结构化数据
- **智能营养解析**: 上传营养文档 → 解析核心营养素
- **智能检索**: 自然语言查询 → SQL 安全执行
- **多模型支持**: 通义千问 / 智谱 GLM / DeepSeek
- **文件格式**: Excel / 文本 / 图片 (多模态解析)
- **安全机制**: SQL 白名单校验 + 数据隔离

### 🌤️ 天气服务

- 实时天气展示 (基于浏览器 Geolocation 定位)
- 和风天气 API (免费订阅版)
- 城市搜索 (全球城市模糊匹配)
- 智能缓存 (30分钟内存缓存)
- 天况图标 emoji 映射 (50+ 图标)

## 🗄️ 数据库设计

### 表结构概览

| 表名                        | 说明         | 记录数  | 关键字段                                                    |
| --------------------------- | ------------ | ------- | ----------------------------------------------------------- |
| users                       | 用户表       | 20      | id, username, password, role (admin/formulist)              |
| materials                   | 原料表       | **132** | id, name, code, material_type (herb/supplement), unit_price |
| material_nutrition          | 营养数据表   | **132** | nutrition_id, material_id(FK), per_100g_json                |
| formulas                    | 配方表       | 6       | id, name, salesman_id(FK), materials_json, finished_weight  |
| formula_versions            | 版本快照表   | 13      | version_id, formula_id(FK), snapshot_json, status           |
| salesmen                    | 业务员表     | 29      | id, name, code, department, status                          |
| nutrition_profiles          | 营养档案模板 | 20      | profile_id, name, category, target_values_json              |
| export_templates            | 导出模板     | 20      | template_id, name, type (pdf/excel/api/print)               |
| export_jobs                 | 导出任务     | 0       | job_id, formula_id(FK), status, file_url                    |
| formula_nutrition_summaries | 营养汇总     | 0       | summary_id, formula_id(FK), total_nutrition_json            |
| nutrition_analysis_reports  | 营养分析报告 | 0       | report_id, formula_id(FK)                                   |
| share_configs               | 分享配置     | 0       | config_id, share_code, expires_at                           |
| api_data_interfaces         | API 接口配置 | 20      | interface_id, name, endpoint                                |

### ER 关系核心链路

```
users ──1:N──→ formulas ──1:N──→ formula_versions
                    │
salesmen ──1:N──────┘
materials ──1:1──→ material_nutrition
```

### 数据库工具命令

```bash
# 导出完整备份（14张表 + 392条记录）
npx tsx src/scripts/exportDatabase.ts

# 恢复数据库（自动使用最新备份）
npx tsx src/scripts/restoreDatabase.ts

# 从test/目录Excel批量导入原料+营养数据
npx tsx src/scripts/importAllTestMaterials.ts

# 初始化种子数据（首次部署）
npx tsx src/scripts/seedData.ts
```

### 数据库双模式

项目支持 **SQLite (开发)** 和 **MySQL (生产)** 双模式：

```typescript
// database-adapter.ts 自动适配
if (process.env.DB_TYPE === "mysql") {
  // 生产环境: 使用腾讯云 MySQL
详见 [PRODUCTION\_DEPLOYMENT\_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md)
  // 开发环境: 使用本地 SQLite
}
```

## 🚀 部署指南

### 生产环境部署

详见 [PRODUCTION_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md)

#### 快速部署步骤

1. **构建前端**

```bash
cd frontend
npm run build:deploy
```

1. **构建后端**

```bash
cd backend
npm run build:scf
```

1. **部署云函数**

```bash
tcb login --apiKeyId YOUR_ID --apiKey YOUR_KEY
tcb fn deploy tingstudio-api --force
```

1. **部署前端到 EdgeOne**

```bash
edgeone pages deploy \
    --project-id pages-zeg2qv2ptbrb \
    --dist-dir dist \
    --env production
```

如果遇到 **401 UNAUTHORIZED** 错误，请参考 [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)

1. **验证部署**

```bash
curl https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health
```

### EdgeOne 故障修复

如果遇到 **401 UNAUTHORIZED** 错误，请参考 [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)

**常见解决方案：**

1. 重新生成预览链接 (推荐)
2. 使用 CLI 重新部署
3. 手动上传文件
4. 清除 CDN 缓存

### 数据迁移

从 SQLite 迁移到 MySQL：

```bash
cd backend
npm run migrate-to-mysql
# 或使用手动迁移工具
node src/scripts/manual-migrate.js
```

## ⚙️ 环境配置

### 后端环境变量

**开发环境** ([backend/.env](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env)):

```bash
DB_TYPE=sqlite
DB_PATH=./data/tingstudio.db
PORT=3000
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5174
```

**生产环境** ([backend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env.production)):

```bash
NODE_ENV=production
PORT=9000
DB_TYPE=mysql
MYSQL_HOST=sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com
MYSQL_PORT=23996
MYSQL_USER=xprety
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=tingstudio
CORS_ORIGIN=https://tingstudio-frontend-e3hnbwbu.edgeone.cool
```

**AI 服务配置** (可选):

```bash
AI_DASHSCOPE_API_KEY=sk-your-key
AI_DASHSCOPE_MODEL=qwen-plus
AI_ZHIPU_API_KEY=sk-your-key
AI_ZHIPU_MODEL=glm-4v-flash
AI_DEEPSEEK_API_KEY=sk-your-key
AI_DEEPSEEK_MODEL=deepseek-chat
```

### 前端环境变量

**开发环境** ([frontend/.env.development](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.development)):

```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=TingStudio (开发环境)
```

**生产环境** ([frontend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.production)):

```bash
VITE_API_BASE_URL=https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api
VITE_APP_TITLE=TingStudio
```

## 🛠️ 开发命令

### 后端命令

```bash
# 开发模式
npm run dev                    # 启动开发服务器 (端口 3000)

# 构建命令
npm run build                  # TypeScript 编译
npm run build:deploy           # 构建 ES Module 版本 (用于云函数)
npm run build:scf              # 构建 SCF 专用版本

# 数据库命令
npm run init-db                # 初始化 SQLite 数据库
npm run init-mysql             # 初始化 MySQL 数据库
npm run seed                   # 导入种子数据
npm run migrate-to-mysql       # 迁移数据到 MySQL

# 测试命令
npm run test-mysql             # 测试 MySQL 连接
```

### 前端命令

```bash
# 开发模式
npm run dev                    # 启动开发服务器 (端口 5174)

# 构建命令
npm run build                  # 类型检查 + 构建
npm run build:deploy           # 仅构建 (跳过类型检查)

## 📚 文档

| 文档             | 说明              | 路径                                                                                                                 |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| **README**       | 项目总览 (本文件) | [README.md](file:///d:/ProgramData/workspace-codeby/ting-studio/README.md)                                           |
| **API 文档**     | 接口定义与说明    | [backend/API_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/API_DOC.md)                         |
| **数据库文档**   | 表结构与关系      | [backend/DATABASE_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/DATABASE_DOC.md)               |
| **生产部署指南** | 完整部署流程      | [PRODUCTION_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md) |
| **EdgeOne 修复** | 401 错误解决      | [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)           |
| **SCF 部署指南** | 云函数手动部署    | [SCF_MANUAL_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/SCF_MANUAL_DEPLOYMENT_GUIDE.md) |

## 🔒 安全特性

- **认证机制**: JWT Token + bcryptjs 密码加密
- **输入校验**: vee-validate + Yup schema 校验
- **SQL 注入防护**: 参数化查询 + 白名单机制
- **XSS 防护**: Helmet 中间件 + 输出转义
- **CSRF 防护**: SameSite Cookie 属性
- **速率限制**: express-rate-limit 防暴力破解
- **CORS 配置**: 严格的跨域访问控制
- **日志审计**: Morgan 请求日志记录

## 📈 性能优化

### 前端优化

- **代码分割**: 路由级懒加载
- **资源压缩**: Gzip/Brotli 压缩
- **CDN 加速**: EdgeOne 全球节点分发
- **图片优化**: SVG 图标 + 懒加载
- **缓存策略**: 浏览器缓存 + CDN 缓存

### 后端优化

- **连接池**: MySQL 连接池管理
- **查询优化**: 索引优化 + 查询缓存
- **响应压缩**: Gzip 压缩中间件
- **并发处理**: PM2 集群模式 (多核 CPU)
- **监控告警**: 健康检查 + 日志监控

## 🤝 贡献指南

### 开发规范

- 使用 TypeScript 编写代码
- 遵循 ESLint + Prettier 代码风格
- 编写单元测试覆盖核心逻辑
- 提交前运行 `npm test` 确保通过

### Git 工作流

1. 从 main 创建 feature 分支
2. 完成开发和测试
3. 提交 Pull Request
4. Code Review 通过后合并

### Commit 规范

```

feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链

```

## ❓ 常见问题

A: 参考 [EDGEONE\_DEPLOYMENT\_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)，通常重新生成预览链接即可解决。

A: 修改 `.env` 中的 `DB_TYPE` 参数:

- `sqlite` - 本地开发环境
- `mysql` - 生产环境 (需要配置 MySQL 连接信息)

### Q: EdgeOne 显示 401 UNAUTHORIZED 怎么办？

A: 参考 [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)，通常重新生成预览链接即可解决。

### Q: 如何备份数据？

A: 生产环境使用腾讯云 MySQL 自动备份。开发环境可复制 `data/tingstudio.db` 文件。

### Q: AI 功能如何配置？

A: 在 `.env` 中配置对应的 API Key:

- `AI_DASHSCOPE_API_KEY` - 通义千问
- `AI_ZHIPU_API_KEY` - 智谱 GLM
- `AI_DEEPSEEK_API_KEY` - DeepSeek

## 📄 许可证

MIT License

## 👥 致谢
***
感谢以下开源项目和服务的支持:

- Vue.js 团队
- Express 社区
- TDesign UI 组件库
- 腾讯云 (SCF / CynosDB / EdgeOne / COS)
- 通义千问 / 智谱 AI / DeepSeek

---

**最后更新**: 2026-05-08
**版本**: v2.27.0 (模型应用配置 + UI对齐优化)
**维护者**: TingStudio Team
```
