# TingStudio v2.23

食品配方工作数据管理平台 — 前后端分离架构

## 项目简介

TingStudio 是一个专业的食品配方工作数据管理平台，面向食品配方行业（中草药功效配方），提供配方管理、原料管理、业务员管理、营养成分分析、导出分享等完整功能链路。采用 **Vue 3 + Express + SQLite** 前后端分离架构，支持 JWT 认证、RESTful API、配方版本控制、营养合规检查、AI 智能解析等企业级特性。

## 🚀 最新更新 (2026-05-06)

### ✅ 配方原料含量比校验系统 + AI 解析面板交互重构 + 容错恢复

#### 📐 配方原料含量比(ratioFactor)分级校验系统

实现了配方创建时对原料含量比总和的严格校验，前后端双重保障：

| 校验级别             | 范围                           | 行为                |
| ---------------- | ---------------------------- | ----------------- |
| 🟢 normal        | \[0.98, 1.02]                | 校验通过，正常创建         |
| 🟡 warning       | \[0.95, 0.98) ∪ (1.02, 1.05] | 弹出确认对话框，用户确认后继续   |
| 🟠 high\_warning | \[0.92, 0.95) ∪ (1.05, 1.08] | 弹出确认对话框 + 标记需人工审核 |
| 🔴 error         | <0.92 or >1.08               | **拒绝创建**，提示修正原料用量 |

**设计特点**：

- 🔧 **阈值可配置**：`DEFAULT_THRESHOLDS` 常量（normalLow/High, warningLow/High, highWarningLow/High），支持未来调整
- 🎯 **精度 5 位小数**：`Math.round(x * 100000) / 100000`，超过需求要求的 3 位
- ⚡ **实时计算**：前端 `ratioValidation` computed 属性，随表单数据即时更新
- 🛡️ **双重校验**：前端实时反馈 + 后端 `createFormula`/`updateFormula` 服务端拦截
- 📊 **可视化反馈**：颜色编码卡片 + 渐变进度条 + 偏差百分比 + 明细展开表
- 🧬 **原料类型感知**：自动区分药材(herb)与辅料(supplement)，应用不同的含量比系数

**后端文件**：

| 文件                                                                      | 说明                                           |
| ----------------------------------------------------------------------- | -------------------------------------------- |
| [ratioFactorValidator.ts](backend/src/services/ratioFactorValidator.ts) | 核心校验服务（类型定义 + 分级判定 + 消息生成）                   |
| [formulaController.ts](backend/src/controllers/formulaController.ts)    | `validateFormulaRatio` 端点 + create/update 拦截 |
| [formulas.ts (routes)](backend/src/routes/formulas.ts)                  | `POST /validate-ratio` 校验端点                  |

**前端文件**：

| 文件                                                             | 说明                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| [formula.ts (api)](frontend/src/api/formula.ts)                | `RatioFactorValidationResult` 类型 + `validateRatio()` API |
| [FormulaForm.vue](frontend/src/views/formulas/FormulaForm.vue) | 实时校验 UI + 提交拦截 + 确认对话框                                   |

#### 🎨 AI 智能配方解析 Panel 交互重构（配方管理页）

| 变更        | 说明                                                     |
| --------- | ------------------------------------------------------ |
| 🔘 手动解析   | 移除文件上传后自动解析，改为「开始解析」+「取消」按钮                            |
| 📊 进度指示器  | 头部居右显示解析状态（解析中🔵/完成🟢/就绪🟠/失败🔴），含脉冲动画                 |
| 📈 进度条优化  | 显示文件名 + 模型标签 + 百分比，完全参照 AI 助手页 SmartImportTab          |
| 🖥 模型信息   | 解析进度下方展示模型名称、版本号、「支持图片识别」标签                            |
| 🐛 Bug 修复 | AI 回填原料时显示原料名称而非 ID（修复 `backfillData` 取值逻辑）            |
| 🏷 未匹配标识  | `getFilteredMaterials` 支持 materialId 为空时仍显示名称（标注"未匹配"） |

#### 🎨 AI 智能营养解析 Panel 交互重构（原料管理页）

与配方管理页的 AI 卡片保持完全一致的交互逻辑和视觉风格：

| 变更       | 说明                                  |
| -------- | ----------------------------------- |
| 🔘 手动解析  | 移除文件上传后自动解析，改为「开始解析」+「取消」按钮         |
| 📊 进度指示器 | 头部居右显示解析状态，含 dot-pulse/dot-blink 动画 |
| 📈 进度条优化 | 显示文件名 + 模型标签 + 百分比，完全参照 AI 助手页      |
| 🖥 模型信息  | 解析进度下方展示模型名称、版本号、图片识别标签             |
| 🎨 按钮样式  | 绿渐变异形按钮 + 白底灰框取消按钮，hover 上浮 + 阴影    |

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

| 文件                                                                      | 改动                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| [ratioFactorValidator.ts](backend/src/services/ratioFactorValidator.ts) | **新建** — 含量比校验服务                                  |
| [formulaController.ts](backend/src/controllers/formulaController.ts)    | +validateFormulaRatio + create/update 拦截          |
| [formulas.ts (routes)](backend/src/routes/formulas.ts)                  | +POST /validate-ratio                             |
| [formula.ts (api)](frontend/src/api/formula.ts)                         | +RatioFactorValidationResult 类型 + validateRatio() |
| [FormulaForm.vue](frontend/src/views/formulas/FormulaForm.vue)          | 含量比校验UI + AI面板重构 + 容错恢复                           |
| [MaterialForm.vue](frontend/src/views/materials/MaterialForm.vue)       | AI营养解析面板重构 + 容错恢复                                 |
| [SmartImportTab.vue](frontend/src/views/ai/tabs/SmartImportTab.vue)     | 容错恢复按钮                                            |

***

## 🚀 更新 (2026-05-05)

### ✅ AI 智能助手全面升级 + Bug 修复

#### 🤖 AI 解析标签页加载异常修复

| 问题           | 根因                                                                                 | 修复方案                                                          |
| ------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| AI 解析标签页持续加载 | `onMounted` 中调用已重命名的 `loadModelVersions`，抛出 ReferenceError，阻止 `initialized = true` | 改为 `loadModelVersionsWithLoading` + try-catch-finally 确保初始化完成 |
| 未使用的导入导致编译警告 | `modelApi` 和 `ModelVersionOption` 已移至 store 但未清理导入                                 | 移除冗余 import 声明                                                |

#### 🧠 AI 助手模型选择一致性修复

| 问题              | 根因                                             | 修复方案                                                 |
| --------------- | ---------------------------------------------- | ---------------------------------------------------- |
| 切换模型后版本显示不一致    | `handleReparseWithModel` 未重置 `selectedVersion` | 添加 `selectedVersion = ''` + `loadModelVersions` 重置逻辑 |
| 版本显示技术标识符而非友好名称 | 进度条直接显示 `qwen-max` 等技术 ID                      | 使用 `getVersionLabel()` 渲染可读标签                        |
| 版本数据未跨组件共享      | `modelVersions` 仅在 `AiAssistant.vue` 局部维护      | 提升到 Pinia store 层，子组件通过 store 访问                     |

#### 💰 原料单价显示异常修复

| 问题           | 根因                                                          | 修复方案                                                                    |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| 炒白扁豆、草果单价未录入 | 后端匹配成功但 `unitPrice` 未显式设置，前端 computed 未追踪 `allMaterials` 依赖 | 后端 `applyMatch` 显式设置 `unitPrice = null`；前端 `quoteItems` 引入 `allMats` 依赖 |
| 解析前原料数据未加载   | `materialStore.allMaterials` 加载时序问题                         | `handleParse` 中解析前确保 `fetchAllForSelect()` 完成                           |

#### 📊 模型用量监控数据同步修复

| 问题        | 根因                     | 修复方案                                  |
| --------- | ---------------------- | ------------------------------------- |
| 用量统计不实时更新 | 数据仅在 tab 切换时加载一次，无定时刷新 | 用量 tab 每 15s 自动刷新 + 模型 tab 每 60s 自动刷新 |
| 无手动刷新入口   | 用户调用模型后无法主动查看最新用量      | 新增刷新按钮 + `refreshUsageStats` 函数       |

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

| 文件                                                                   | 改动                              |
| -------------------------------------------------------------------- | ------------------------------- |
| [AiAssistant.vue](frontend/src/views/ai/AiAssistant.vue)             | 修复加载异常 + 清理导入 + 版本数据从 store 读取  |
| [SmartFormTab.vue](frontend/src/views/ai/tabs/SmartFormTab.vue)      | 模型版本一致性 + 原料单价依赖追踪 + 价格计算修复     |
| [ModelManagement.vue](frontend/src/views/models/ModelManagement.vue) | 刷新按钮 UI + 自动刷新定时器 + 手动刷新函数      |
| [ai.ts (store)](frontend/src/stores/ai.ts)                           | 版本管理提升到 store + getVersionLabel |
| [aiController.ts](backend/src/controllers/aiController.ts)           | unitPrice 显式设置 + 匹配失败时清空        |
| [FileDetail.vue](frontend/src/views/files/FileDetail.vue)            | 全屏预览对话框                         |
| [FileManagement.vue](frontend/src/views/files/FileManagement.vue)    | 预览按钮接入全屏对话框                     |

***

## 🚀 更新 (2026-04-30)

### ✅ UI 统一优化：助手组件 + 近期动态布局重构

#### 🎨 四页面助手样式统一（参照配方师小助手）

所有管理页面的助手组件统一为**白色主体 + 绿色Header**的配方师小助手风格：

| 页面    | 助手名称   | 状态     |
| ----- | ------ | ------ |
| 配方管理  | 配方师小助手 | ✅ 参照标准 |
| 销量分析  | 销量管理助手 | ✅ 已统一  |
| 业务员管理 | 业务员小助手 | ✅ 已统一  |
| 原料管理  | 原料管理助手 | ✅ 已统一  |

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

| 页面    | 左侧内容      | 右侧内容       |
| ----- | --------- | ---------- |
| 销量分析  | 近期动态（时间线） | 销量管理助手（待办） |
| 业务员管理 | 近期业务员动态   | 业务员小助手（待办） |
| 配方管理  | 近期动态      | 配方师小助手（待办） |

**响应式设计**：

- 大屏（≥1024px）：`grid-template-columns: 2fr 1fr`
- 小屏（<1024px）：单列堆叠

#### 🔧 Bug 修复

| 问题                    | 根因                                 | 修复方案            |
| --------------------- | ---------------------------------- | --------------- |
| MaterialList.vue 编译错误 | 模拟数据中使用中文引号「」代替英文引号                | 改为标准英文单引号包裹字符串  |
| 助手背景色未生效              | 存在重复的 `&--assistant` 样式定义，旧样式覆盖新样式 | 删除重复定义，保留白色背景版本 |

#### 📄 ServerError 页面优化

- **布局调整**：左右面板比例从 `45:55` 改为 `30:70`（与登录页一致）
- **返回按钮增强**：新增登录图标 SVG（箭头进入门框样式）

#### 影响范围

| 文件                                                                | 改动内容                                 |
| ----------------------------------------------------------------- | ------------------------------------ |
| [SalesAnalysis.vue](frontend/src/views/sales/SalesAnalysis.vue)   | 新增 activity-section（近期动态+助手）、录入按钮右对齐 |
| [SalesmanList.vue](frontend/src/views/salesmen/SalesmanList.vue)  | 助手样式统一为配方师风格、移除 dashboard 内助手        |
| [MaterialList.vue](frontend/src/views/materials/MaterialList.vue) | 助手样式统一为配方师风格、修复中文引号语法错误              |
| [ServerError.vue](frontend/src/views/errors/ServerError.vue)      | 布局 3:7 调整、返回登录按钮增加图标                 |

***

### ✅ AI 解析匹配全面升级 + 数据库完整备份工具 (2026-04-29)

#### 🔧 Bug 修复（3项）

| 问题           | 根因                                                          | 修复方案                                           |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------- |
| 配方列表搜索失效     | TDesign `t-input` 的 `@input` 在 `v-model` 更新前触发，keyword 始终为空 | 改为 `watch(searchKeyword)` 响应式监听（与原料管理一致）       |
| AI 回填原料名称未显示 | `backfillData()` 缺少按名称二次匹配逻辑                                | 新增 `allMats.find(x => x.name === m.name)` 兜底查找 |
| 营养接口重复日志     | `getMaterialNutrition` 的 `_logLabel` 参数导致每次调用打印日志           | 移除 `_logLabel` 参数                              |

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

| 脚本                                                           | 用途                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| [exportDatabase.ts](backend/src/scripts/exportDatabase.ts)   | 导出全部表结构 + 索引 + 触发器 + 全量数据 → JSON（含 SHA-256 数据哈希 + 结构哈希） |
| [restoreDatabase.ts](backend/src/scripts/restoreDatabase.ts) | 从 JSON 恢复完整数据库（自动拓扑排序建表 → 数据迁移 → 索引/触发器重建 → 一致性校验）      |

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

| 表名                                                                                           | 记录数     | 说明                    |
| -------------------------------------------------------------------------------------------- | ------- | --------------------- |
| users                                                                                        | 20      | 用户表（含 admin/admin123） |
| materials                                                                                    | **132** | 原料表（药材 + 辅料）          |
| material\_nutrition                                                                          | **132** | 营养数据（蛋白/脂肪/碳水/钠）      |
| formulas                                                                                     | 6       | 配方表                   |
| formula\_versions                                                                            | 13      | 版本快照                  |
| salesmen                                                                                     | 29      | 业务员表                  |
| nutrition\_profiles                                                                          | 20      | 营养档案模板                |
| export\_templates                                                                            | 20      | 导出模板                  |
| api\_data\_interfaces                                                                        | 20      | API 接口配置              |
| export\_jobs / formula\_nutrition\_summaries / nutrition\_analysis\_reports / share\_configs | 0       | 空表（已建结构）              |
| **合计**                                                                                       | **392** | 13 张表                 |

***

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

| 列    | 调整    | 新宽度           |
| ---- | ----- | ------------- |
| 版本状态 | +20px | 170px         |
| 更新时间 | -15px | 165px         |
| 操作   | -5px  | 155px         |
| 负责人  | 居中对齐  | align: center |

#### 📊 销量分析页样式对齐

- **底部边距**: 添加 `padding-bottom: 32px`，与配方管理页一致
- **录入销量按钮**: 蓝色渐变 → **深色 #1e293b 实心**（与「创建新配方」按钮统一）
- **空状态**: 简单文字 → `<t-empty>` + 操作按钮（点击打开抽屉录入）
- **按钮样式提升**: `.add-formula-btn` 从嵌套作用域提升到组件根级，确保空状态按钮样式生效

#### 影响范围

| 文件                                                                     | 改动                           |
| ---------------------------------------------------------------------- | ---------------------------- |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)         | 列宽调整 + 负责人居中                 |
| [SalesRecordDrawer.vue](frontend/src/components/SalesRecordDrawer.vue) | Card布局 + 按钮右上角 + 万元单位 + 保存修复 |
| [SalesAnalysis.vue](frontend/src/views/sales/SalesAnalysis.vue)        | 底部边距 + 按钮样式 + 空状态            |

***

### ✅ P1 阶段 — 配方定价系统（可调整原料单价）

#### 💰 核心功能

- **原料单价微调**: 配方编辑时支持单独调整每个原料的单价，覆盖原料库基价
- **微调标记**: 调整后的原料显示橙色「**调**」文字 badge，清晰标识
- **成本自动重算**: 单价变更后实时更新原料小计、配方总成本、报价
- **版本快照记录**: 保存时将 adjustedPrice 写入 snapshot\_json，永久保留

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

| 问题                                    | 根因                                       | 方案            |
| ------------------------------------- | ---------------------------------------- | ------------- |
| ⚡ 图标不显示 (FormulaForm / FormulaDetail) | TDesign 图标名渲染异常                          | 改为文字 badge「调」 |
| 近期动态不显示基价调整                           | 类型优先级排序把 warning 挤到后面                    | 改为时间倒序        |
| 保存后列表数据不刷新                            | 组件复用时不触发 onMounted                       | 添加路由 watch 监听 |
| 切换按钮图标不显示 (VersionCompare)            | TDesign `money-circle` / `chart-bar` 不存在 | 改为 ¥ / % 符号   |

#### 影响范围

| 文件                                                                   | 改动                                   |
| -------------------------------------------------------------------- | ------------------------------------ |
| [FormulaForm.vue](frontend/src/views/formulas/FormulaForm.vue)       | 「调」badge + 路由监听                      |
| [FormulaDetail.vue](frontend/src/views/formulas/FormulaDetail.vue)   | 「调」badge                             |
| [FormulaList.vue](frontend/src/views/formulas/FormulaList.vue)       | 近期动态排序修复 + 路由监听                      |
| [VersionCompare.vue](frontend/src/views/versions/VersionCompare.vue) | 含量/报价双模式切换                           |
| [formulaController.ts](backend/src/controllers/formulaController.ts) | buildChanges + buildVersionName 基价处理 |

***

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

***

### ✅ 数据库驱动修复与本地调试优化 (2026-04-24)

#### 🔧 后端数据库问题修复

- **问题诊断**: 发现 `sql.js` 包导入失败导致数据库连接异常
- **解决方案**: 切换到 `better-sqlite3` 作为默认数据库驱动
- **修复文件**:
  - `src/config/database-better-sqlite3.ts` - 新的数据库连接实现
  - `src/config/database-adapter.ts` - 更新导入路径
  - `src/index.ts` - 修复数据库初始化导入
- **表结构修复**: 手动添加缺失列（display\_name、avatar、bio、email、phone）
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

| 服务    | 技术选型                    | 用途             |
| ----- | ----------------------- | -------------- |
| 前端构建  | Vite 5.1                | 开发服务器 + 生产构建   |
| 后端框架  | Express 4.21            | RESTful API 服务 |
| 数据库   | SQLite (better-sqlite3) | 数据持久化 (WAL 模式) |
| AI 服务 | 通义千问 / GLM / DeepSeek   | 配方解析 + 营养分析    |
| 天气服务  | 和风天气 API                | 实时天气展示         |

## 🌐 访问地址

### 开发环境

- **前端地址**: `http://localhost:5174` (或 5173)
- **后端 API**: `http://localhost:3000/api`
- **健康检查**: `http://localhost:3000/api/health`
- **测试账号**: `admin` / `admin123`

## 📊 项目状态

| 组件        | 状态                | 说明                                  |
| --------- | ----------------- | ----------------------------------- |
| **后端服务**  | ✅ 正常运行            | Express + SQLite (better-sqlite3)   |
| **前端应用**  | ✅ 正常运行            | Vue 3 + TDesign + Vite              |
| **数据库**   | ✅ 13 张表 / 392 条记录 | SQLite WAL 模式，含 132 种原料+营养数据        |
| **AI 解析** | ✅ 匹配率显著提升         | 150+ 别名映射 + 模糊匹配 + 名称标准化            |
| **配方搜索**  | ✅ 已修复             | watch 响应式监听模式                       |
| **数据备份**  | ✅ 可用              | exportDatabase / restoreDatabase 脚本 |

***

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

| 表名                            | 说明       | 记录数     | 关键字段                                                          |
| ----------------------------- | -------- | ------- | ------------------------------------------------------------- |
| users                         | 用户表      | 20      | id, username, password, role (admin/formulist)                |
| materials                     | 原料表      | **132** | id, name, code, material\_type (herb/supplement), unit\_price |
| material\_nutrition           | 营养数据表    | **132** | nutrition\_id, material\_id(FK), per\_100g\_json              |
| formulas                      | 配方表      | 6       | id, name, salesman\_id(FK), materials\_json, finished\_weight |
| formula\_versions             | 版本快照表    | 13      | version\_id, formula\_id(FK), snapshot\_json, status          |
| salesmen                      | 业务员表     | 29      | id, name, code, department, status                            |
| nutrition\_profiles           | 营养档案模板   | 20      | profile\_id, name, category, target\_values\_json             |
| export\_templates             | 导出模板     | 20      | template\_id, name, type (pdf/excel/api/print)                |
| export\_jobs                  | 导出任务     | 0       | job\_id, formula\_id(FK), status, file\_url                   |
| formula\_nutrition\_summaries | 营养汇总     | 0       | summary\_id, formula\_id(FK), total\_nutrition\_json          |
| nutrition\_analysis\_reports  | 营养分析报告   | 0       | report\_id, formula\_id(FK)                                   |
| share\_configs                | 分享配置     | 0       | config\_id, share\_code, expires\_at                          |
| api\_data\_interfaces         | API 接口配置 | 20      | interface\_id, name, endpoint                                 |

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

\| formula\_versions | 配方版本表 | 36 | version\_id, formula\_id, version\_number |
\| material\_nutrition | 材料营养表 | 56 | nutrition\_id, material\_id, per\_100g\_json |
\| nutrition\_profiles | 营养配置表 | 6 | profile\_id, name, category |
\| export\_templates | 导出模板表 | 6 | template\_id, name, type |
\| export\_jobs | 导出任务表 | 10 | job\_id, status, file\_url |
\| share\_configs | 分享配置表 | 2 | share\_id, share\_url |
\| formula\_nutrition\_summaries | 营养汇总表 | 5 | summary\_id, formula\_id |
\| salesmen | 业务员表 | 29 | id, name, code, department |
\| **formula\_sales** | **销量数据表** | **0** | **id, formula\_id(FK), salesman\_id(FK), quantity, revenue** |
\| nutrition\_profiles | 营养档案模板 | 20 | profile\_id, name, category |
\| export\_templates | 导出模板 | 20 | template\_id, name, type |
\| api\_data\_interfaces | API 接口配置 | 20 | interface\_id, name, endpoint |
\| export\_jobs | 导出任务 | 0 | job\_id, formula\_id(FK), status |
\| formula\_nutrition\_summaries | 营养汇总 | 0 | summary\_id, formula\_id(FK) |
\| nutrition\_analysis\_reports | 营养分析报告 | 0 | report\_id, formula\_id(FK) |
\| share\_configs | 分享配置 | 0 | config\_id, share\_code |

**总计**: 14 张表, 392 条记录

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

详见 [PRODUCTION\_DEPLOYMENT\_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md)

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

如果遇到 **401 UNAUTHORIZED** 错误，请参考 [EDGEONE\_DEPLOYMENT\_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)

1. **验证部署**

```bash
curl https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health
```

### EdgeOne 故障修复

如果遇到 **401 UNAUTHORIZED** 错误，请参考 [EDGEONE\_DEPLOYMENT\_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)

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
| 文档             | 说明         | 路径                                                                                                                      |
| -------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| **README**     | 项目总览 (本文件) | [README.md](file:///d:/ProgramData/workspace-codeby/ting-studio/README.md)                                              |
| **API 文档**     | 接口定义与说明    | [backend/API\_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/API_DOC.md)                           |
| **数据库文档**      | 表结构与关系     | [backend/DATABASE\_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/DATABASE_DOC.md)                 |
| **生产部署指南**     | 完整部署流程     | [PRODUCTION\_DEPLOYMENT\_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md)  |
| **EdgeOne 修复** | 401 错误解决   | [EDGEONE\_DEPLOYMENT\_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)            |
| **SCF 部署指南**   | 云函数手动部署    | [SCF\_MANUAL\_DEPLOYMENT\_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/SCF_MANUAL_DEPLOYMENT_GUIDE.md) |

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

**最后更新**: 2026-04-30\
**版本**: v2.21.0 (UI 统一优化)\
**维护者**: TingStudio Team
```

