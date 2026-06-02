# 营养数据治理功能 — 页面验收指南

> 版本：v1.0 | 日期：2026-06-02 | 编写依据：PRD + 技术方案 + 前端交互方案

---

## 一、验收前置条件

### 1.1 环境准备

| 项目 | 要求 |
|------|------|
| 后端服务 | `npm run dev` 正常运行，端口 3000 |
| 前端服务 | `npm run dev` 正常运行，端口 5173 |
| 数据库 | 迁移脚本 `addNutritionSourceLayer.ts` 已执行 |
| 登录账号 | admin 角色账号（权威选定需要管理员权限） |
| 测试数据 | 至少有 1 个原料已录入营养数据（如"阿胶"） |

### 1.2 可选配置（影响部分功能）

| 环境变量 | 作用 | 默认值 | 影响 |
|----------|------|--------|------|
| `EXTERNAL_NUTRITION_ENABLED` | 启用外部营养数据获取 | 未设置 | 设为 `true` 后"智能获取"按钮可用 |
| `TIANAPI_KEY` | 天行数据 API 密钥 | 未设置 | 启用天行数据适配器 |

### 1.3 验收角色说明

| 角色 | 用途 | 权限差异 |
|------|------|---------|
| admin | 全功能验收 | 可使用权威选定、删除来源 |
| formulist | 基础功能验收 | 仅可查看来源、智能获取，不可权威选定 |

---

## 二、原料列表页验收

**页面路径**：`/materials`

### 2.1 来源列显示

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 2.1.1 | 来源列存在 | 打开原料列表页 | 表头中存在"来源"列 | | ☐ |
| 2.1.2 | 有营养数据的原料显示来源标签 | 查看已录入营养数据的原料行（如"阿胶"） | 来源列显示"📊 Excel导入"标签 | | ☐ |
| 2.1.3 | 无营养数据的原料显示占位符 | 查看未录入营养数据的原料行 | 来源列显示"--" | | ☐ |
| 2.1.4 | 来源标签悬停提示 | 鼠标悬停在来源标签上 | 显示 sourceDetail 的 tooltip 提示 | | ☐ |

### 2.2 营养数据来源筛选

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 2.2.1 | 筛选条件存在 | 查看原料列表页筛选区域 | 存在"营养数据来源"筛选条件 | | ☐ |
| 2.2.2 | 筛选选项 | 点击"营养数据来源"下拉 | 选项包含：全部 / 仅手动录入 / 仅外部API / 仅种子库 / 无营养数据 | | ☐ |
| 2.2.3 | 筛选生效-手动录入 | 选择"仅手动录入" | 列表仅显示 source_type='manual' 的原料 | | ☐ |
| 2.2.4 | 筛选生效-外部API | 选择"仅外部API" | 列表仅显示 source_type='tianapi' 的原料 | | ☐ |
| 2.2.5 | 筛选生效-种子库 | 选择"仅种子库" | 列表仅显示 source_type='seed' 的原料 | | ☐ |
| 2.2.6 | 筛选生效-无营养数据 | 选择"无营养数据" | 列表仅显示无营养数据的原料 | | ☐ |
| 2.2.7 | 筛选重置 | 选择筛选条件后点击"重置" | 筛选条件恢复为"全部"，列表显示所有原料 | | ☐ |

### 2.3 来源类型对照表

验证不同来源类型显示正确的标签：

| source_type | 图标 | 标签文字 | 主题色 |
|-------------|------|---------|--------|
| `excel_import` | 📊 | Excel导入 | primary (蓝) |
| `manual` | ✏️ | 手动录入 | default (灰) |
| `seed` | 📚 | 种子库 | success (绿) |
| `tianapi` | 🌐 | 天行数据 | primary (蓝) |
| `ai` | 🤖 | AI估算 | warning (橙) |
| `other` | 📎 | 其他 | default (灰) |

---

## 三、原料详情页验收

**页面路径**：`/materials/:id`（从列表页点击原料行进入）

### 3.1 来源标签显示

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 3.1.1 | 来源标签位置 | 进入有营养数据的原料详情页 | 营养成分区域右侧显示"数据源："标签 + NutritionSourceTag | | ☐ |
| 3.1.2 | 来源标签内容 | 查看标签文字 | 显示对应来源类型（如"📊 Excel导入"） | | ☐ |
| 3.1.3 | 无重复标签 | 检查"数据源："后面 | 只有一个 NutritionSourceTag，不应出现"标准参考"硬编码标签 | | ☐ |
| 3.1.4 | 可信度标签 | 查看来源标签右侧 | 当有 dataSource 时显示可信度标签（高/中/低） | | ☐ |

### 3.1a 字段级来源图标（PRD US-1）

> 注：每个营养素数值旁显示该字段的数据来源小图标，悬停显示来源详情 tooltip

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 3.1a.1 | 字段级图标存在 | 进入有营养数据的原料详情页 | 营养成分表格中每个数值旁显示来源小图标（🌐/📚/🤖/✏️/📊） | | ☐ |
| 3.1a.2 | 图标 tooltip | 鼠标悬停在某个字段的来源图标上 | tooltip 显示该字段的 sourceDetail（如"天行数据-山药"、"中国食物成分表第6版"） | | ☐ |
| 3.1a.3 | 无来源的旧数据 | 查看迁移前录入的营养数据 | 字段旁显示"❓来源未知"或默认图标 | | ☐ |
| 3.1a.4 | 复合来源 | 查看经过权威选定后包含多来源的数据 | 不同字段显示各自对应的来源图标（如蛋白质显示🌐，脂肪显示📚） | | ☐ |

### 3.1b 权威数据来源构成摘要（PRD US-1）

> 注：营养数据区域顶部显示当前权威数据的来源构成统计

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 3.1b.1 | 摘要显示 | 进入有营养数据的原料详情页 | 营养成分区域顶部显示来源构成摘要，如"3项来自种子库，2项来自天行数据，1项来自手动录入" | | ☐ |
| 3.1b.2 | 单来源摘要 | 查看仅有一个来源的原料 | 摘要显示为单一来源，如"全部来自 Excel导入" | | ☐ |
| 3.1b.3 | 无来源摘要 | 查看无营养数据的原料 | 不显示来源构成摘要 | | ☐ |

### 3.2 来源对比面板

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 3.2.1 | "查看所有来源"按钮 | 进入有营养数据的原料详情页 | 营养成分区域右侧显示"查看所有来源 ▼"按钮 | | ☐ |
| 3.2.2 | 展开对比面板 | 点击"查看所有来源 ▼" | 面板展开，按钮文字变为"收起来源对比 ▲" | | ☐ |
| 3.2.3 | 无多源数据时的空状态 | 展开对比面板（仅有一个来源的原料） | 显示"暂无多源数据"提示 + "🌐 智能获取营养数据"按钮 | | ☐ |
| 3.2.4 | 智能获取按钮（面板内） | 点击空状态中的"智能获取营养数据" | 按钮显示 loading 状态；功能未启用时提示"外部营养数据功能未启用"；启用后获取外部数据 | | ☐ |
| 3.2.5 | 智能获取按钮（头部） | 查看对比面板头部右侧 | 显示"🌐 智能获取"按钮 | | ☐ |

### 3.3 权威选定交互（管理员）

> **交互方式说明**：PRD US-3 原始描述为"每个营养素行提供下拉选择器"，实际实现为"单元格点击选中"模式。以下验收项基于实际实现方案。
>
> 前提：需要有多个来源数据才能测试此功能。可通过以下方式创建多源数据：
> 1. 启用 `EXTERNAL_NUTRITION_ENABLED=true`，点击"智能获取"获取外部数据
> 2. 或通过 API 手动添加来源：`POST /api/nutrition/material/:id/sources`

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 3.3.1 | 单元格可点击 | admin 登录，展开有多源数据的对比面板 | 来源单元格鼠标悬停有手型光标，背景微变蓝 | | ☐ |
| 3.3.2 | 选中单元格 | 点击某个来源单元格 | 单元格显示蓝色边框 + ✓ 图标 | | ☐ |
| 3.3.3 | 取消选中 | 再次点击已选中的单元格 | 选中状态取消，蓝色边框和 ✓ 图标消失 | | ☐ |
| 3.3.4 | 多字段选择 | 分别点击不同营养素行的不同来源单元格 | 每个字段独立选择，互不影响 | | ☐ |
| 3.3.5 | "应用选定"按钮出现 | 选择至少一个字段 | 对比面板底部出现"✅ 应用选定（N项）"按钮；头部同步出现快捷按钮 | | ☐ |
| 3.3.6 | 提交权威选定 | 点击"应用选定"按钮 | 按钮显示 loading；成功后提示"已更新 N 个字段的权威数据"；选择状态清空；对比面板自动刷新 | | ☐ |
| 3.3.7 | "清除选择"按钮 | 选择字段后点击"清除选择" | 所有选择状态清空 | | ☐ |
| 3.3.8 | 非管理员无选择交互 | 使用 formulist 角色登录 | 来源单元格无手型光标，不可点击；无"应用选定"和"清除选择"按钮 | | ☐ |
| 3.3.9 | 差异高亮 | 查看有多源差异的对比面板 | 差异 >30% 的单元格背景深黄；>10% 中黄；≤10% 浅黄；无差异无背景 | | ☐ |

### 3.4 对比面板数据展示

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 3.4.1 | 差异摘要 | 展开对比面板 | 显示"差异摘要: N项营养素有差异, 最大差异 X%" | | ☐ |
| 3.4.2 | 来源列标题 | 查看对比表格表头 | 每个来源列显示 NutritionSourceTag + 可信度标签 | | ☐ |
| 3.4.3 | 权威值列 | 查看对比表格 | "权威值"列显示当前 material_nutrition 中的值 | | ☐ |
| 3.4.4 | 差异标记 | 查看有差异的来源单元格 | 差异值后显示 ⚠️ 标记 | | ☐ |

---

## 四、原料编辑页验收

**页面路径**：`/materials/:id/edit`

### 4.1 来源标签显示

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 4.1.1 | 来源标签位置 | 进入有营养数据的原料编辑页 | 营养成分区域标题"营养成分（每100g）"旁显示"已录入"标签 + NutritionSourceTag | | ☐ |
| 4.1.2 | 来源标签内容 | 查看标签文字 | 显示对应来源类型（如"📊 Excel导入"） | | ☐ |
| 4.1.3 | 无营养数据时不显示 | 进入无营养数据的原料编辑页 | 不显示 NutritionSourceTag（"已录入"标签也不显示） | | ☐ |
| 4.1.4 | 保存后来源更新 | 修改营养数据并保存 | 保存后：①在 `material_nutrition_sources` 表创建/更新一条 source_type='manual' 的来源记录；②若所有字段均来自同一来源，标签显示该单一来源（如"✏️ 手动录入"）；③若字段来自多个来源，标签显示"🔀 复合来源"，source_type 为 "composite" | | ☐ |

---

## 五、配方营养表快照验收

**页面路径**：`/formulas/:id`（配方详情页的营养成分表标签页）

### 5.1 快照保存

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 5.1.1 | 计算触发快照保存 | 打开配方详情页，点击"计算营养成分" | 计算成功后，后台自动保存快照到 formula_nutrition_snapshots 表 | | ☐ |
| 5.1.2 | 快照内容完整 | 通过 API 验证 | 快照包含 nutrition_refs_json、total_nutrition_json、per_100g_json、material_breakdown_json | | ☐ |

### 5.2 快照读取

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 5.2.1 | 优先读取快照 | 再次打开同一配方的营养成分表 | 返回数据包含 `fromSnapshot: true` 和 `snapshotCalculatedAt` 字段 | | ☐ |
| 5.2.2 | 快照数据一致性 | 对比实时计算和快照数据 | 总营养素、每100g营养素、原料分解数据应与实时计算一致 | | ☐ |
| 5.2.3 | 快照更新 | 修改配方原料后重新计算 | 旧快照被更新（同一 formula_id + formula_version_id 仅保留一条） | | ☐ |
| 5.2.4 | 快照失败回退 | 模拟快照读取失败（如删表） | 自动回退到实时计算，不影响正常展示 | | ☐ |

---

## 六、后端 API 验收

> 使用浏览器 DevTools Console 或 Postman/curl 测试

### 6.1 来源数据 API

| 序号 | API | 方法 | 路径 | 验收要点 | 通过 |
|------|-----|------|------|---------|------|
| 6.1.1 | 获取来源列表 | GET | `/api/nutrition/material/:id/sources` | 返回 `success: true`，data 为数组 | ☐ |
| 6.1.2 | 包含不活跃来源 | GET | `/api/nutrition/material/:id/sources?includeInactive=true` | 返回包含 is_active=0 的来源 | ☐ |
| 6.1.3 | 添加来源 | POST | `/api/nutrition/material/:id/sources` | body 含 sourceType + per100g，返回 sourceId | ☐ |
| 6.1.4 | 无效来源类型 | POST | `/api/nutrition/material/:id/sources` | sourceType 为非法值时返回 400 | ☐ |
| 6.1.5 | 更新来源 | PUT | `/api/nutrition/material/:id/sources/:sourceId` | 可更新 sourceDetail、confidence、notes | ☐ |
| 6.1.6 | 删除来源（软删除） | DELETE | `/api/nutrition/material/:id/sources/:sourceId` | 仅 admin 可操作；is_active 置为 0 | ☐ |
| 6.1.7 | 非管理员删除 | DELETE | `/api/nutrition/material/:id/sources/:sourceId` | formulist 角色返回 403 | ☐ |

### 6.2 来源对比 API

| 序号 | API | 方法 | 路径 | 验收要点 | 通过 |
|------|-----|------|------|---------|------|
| 6.2.1 | 获取对比数据 | GET | `/api/nutrition/material/:id/sources/compare` | 返回 nutrients 数组 + summary | ☐ |
| 6.2.2 | 对比摘要 | GET | `/api/nutrition/material/:id/sources/compare` | summary 含 totalSources、diffCount、maxDiffPercent、avgDiffPercent | ☐ |
| 6.2.3 | 字段级差异 | GET | `/api/nutrition/material/:id/sources/compare` | 每个营养素含 authoritativeValue + sources 差异信息 | ☐ |

### 6.3 权威选定 API

| 序号 | API | 方法 | 路径 | 验收要点 | 通过 |
|------|-----|------|------|---------|------|
| 6.3.1 | 设定权威 | PUT | `/api/nutrition/material/:id/authoritative` | body 含 fieldSelections，返回 updatedFields + sourceType | ☐ |
| 6.3.2 | 非管理员设定 | PUT | `/api/nutrition/material/:id/authoritative` | formulist 角色返回 403 | ☐ |
| 6.3.3 | 能量自动重算 | PUT | `/api/nutrition/material/:id/authoritative` | 选定 protein/fat/carbohydrate 后 energy 自动按公式重算 | ☐ |
| 6.3.4 | field_sources 记录 | PUT | `/api/nutrition/material/:id/authoritative` | material_nutrition 表的 field_sources_json 记录每个字段的来源 | ☐ |
| 6.3.5 | 复合来源类型 | PUT | `/api/nutrition/material/:id/authoritative` | 多个来源类型字段组合时 source_type 为 "composite" | ☐ |

### 6.4 智能获取 API

| 序号 | API | 方法 | 路径 | 验收要点 | 通过 |
|------|-----|------|------|---------|------|
| 6.4.1 | 单原料获取 | POST | `/api/nutrition/material/:id/enrich-nutrition` | 返回 results + summary | ☐ |
| 6.4.2 | 功能未启用 | POST | `/api/nutrition/material/:id/enrich-nutrition` | EXTERNAL_NUTRITION_ENABLED 未设置时返回 503 | ☐ |
| 6.4.3 | 批量获取 | POST | `/api/nutrition/bulk-enrich-nutrition` | 仅 admin 可操作；支持 materialIds、sources、overwriteExisting | ☐ |

### 6.4a 别名映射（PRD US-4）

> 注：当原料名称与 API 搜索词不匹配时，系统应尝试别名映射

| 序号 | API | 方法 | 路径 | 验收要点 | 通过 |
|------|-----|------|------|---------|------|
| 6.4a.1 | 别名映射命中 | POST | `/api/nutrition/material/:id/enrich-nutrition` | 原料名称为"薏苡仁"时，API 能通过别名"薏米"命中并返回营养数据 | ☐ |
| 6.4a.2 | 别名映射未命中 | POST | `/api/nutrition/material/:id/enrich-nutrition` | 原料名称为系统无映射的陌生名称时，返回"未找到匹配的营养数据" | ☐ |
| 6.4a.3 | 别名映射日志 | 查看后端日志 | 别名映射过程有日志记录，包含原始名称、映射后的名称、是否命中 | ☐ |

### 6.5 营养数据 API 增强

| 序号 | API | 方法 | 路径 | 验收要点 | 通过 |
|------|-----|------|------|---------|------|
| 6.5.1 | 获取营养数据含来源 | GET | `/api/nutrition/material/:id` | 返回含 sourceType、sourceDetail、fieldSources 字段 | ☐ |
| 6.5.2 | 保存营养数据同步来源 | POST/PUT | `/api/nutrition/material/:id` | 保存后自动在 material_nutrition_sources 表创建一条 manual 来源记录 | ☐ |

---

## 七、数据层验收

### 7.1 数据库表结构

| 序号 | 表名 | 验收要点 | 通过 |
|------|------|---------|------|
| 7.1.1 | material_nutrition_sources | 表存在，含 source_id、material_id、source_type、per_100g_json、confidence、match_score、is_active 等字段 | ☐ |
| 7.1.2 | formula_nutrition_snapshots | 表存在，含 snapshot_id、formula_id、formula_version_id、nutrition_refs_json、total_nutrition_json 等字段 | ☐ |
| 7.1.3 | material_nutrition 新增字段 | source_type、source_detail、field_sources_json 字段已添加 | ☐ |

### 7.2 数据迁移验证

| 序号 | 验收项 | 验证 SQL | 预期结果 | 通过 |
|------|--------|---------|----------|------|
| 7.2.1 | 现有营养数据已迁移到来源层 | `SELECT COUNT(*) FROM material_nutrition_sources WHERE source_type = 'excel_import'` | 大于 0（与原有营养数据条数一致） | ☐ |
| 7.2.2 | 现有营养数据 source_type 已填充 | `SELECT COUNT(*) FROM material_nutrition WHERE source_type IS NOT NULL AND is_latest = 1` | 大于 0 | ☐ |
| 7.2.3 | 迁移后数据一致性 | 对比 material_nutrition.per_100g_json 与对应 material_nutrition_sources.per_100g_json | 数据内容一致 | ☐ |

---

## 八、边界场景验收

| 序号 | 场景 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|------|---------|----------|---------|------|
| 8.1 | 原料无营养数据 | 进入无营养数据的原料详情页 | 不显示来源标签和"查看所有来源"按钮 | | ☐ |
| 8.2 | 原料仅一个来源 | 展开对比面板 | 显示"暂无多源数据"空状态 | | ☐ |
| 8.3 | 删除唯一来源 | 删除原料仅有的一个来源 | 对比面板显示空状态；原料营养数据不受影响（权威层数据独立） | | ☐ |
| 8.4 | 权威选定空字段 | 提交空的 fieldSelections | 返回 400 错误"未指定来源" | | ☐ |
| 8.5 | 权威选定不存在的 sourceId | 提交不存在的 sourceId | 返回 400 错误"来源数据不存在或不活跃" | | ☐ |
| 8.6 | 配方无原料 | 计算无原料配方的营养 | 返回 null 或空数据，不报错 | | ☐ |
| 8.7 | 快照保存失败 | 模拟快照表不可用 | 配方计算正常完成，快照保存失败不影响主流程 | | ☐ |
| 8.8 | 快照读取失败 | 模拟快照表不可用 | 自动回退到实时计算，营养成分表正常展示 | | ☐ |

---

## 九、向后兼容性验收

| 序号 | 验收项 | 操作步骤 | 预期结果 | 实际结果 | 通过 |
|------|--------|---------|----------|---------|------|
| 9.1 | 现有配方计算逻辑 | 计算已有配方的营养成分 | 计算结果与改动前一致（仍从 material_nutrition 读取） | | ☐ |
| 9.2 | 现有营养数据录入 | 手动录入营养数据 | 保存成功，material_nutrition 表正常更新 | | ☐ |
| 9.3 | Excel 导入营养数据 | 通过 Excel 导入营养数据 | 导入成功，source_type 自动设为 "excel_import" | | ☐ |
| 9.4 | 原料列表营养状态 | 查看原料列表"营养"列 | 显示"X项营养"，与改动前一致 | | ☐ |
| 9.5 | 配方详情营养表 | 查看配方详情的营养成分表 | 数据展示与改动前一致（新增 fromSnapshot 标记不影响展示） | | ☐ |

---

## 十、验收结果汇总

### 验收统计

| 模块 | 总项数 | 通过 | 不通过 | 待定 |
|------|--------|------|--------|------|
| 2. 原料列表页 | 4 | | | |
| 3. 原料详情页 | 18 | | | |
| 4. 原料编辑页 | 4 | | | |
| 5. 配方快照 | 6 | | | |
| 6. 后端 API | 16 | | | |
| 7. 数据层 | 6 | | | |
| 8. 边界场景 | 8 | | | |
| 9. 向后兼容 | 5 | | | |
| **合计** | **67** | | | |

### 验收结论

- [ ] ✅ 全部通过，可发布
- [ ] ⚠️ 部分通过，需修复后复验
- [ ] ❌ 未通过，需返工

### 遗留问题记录

| 序号 | 问题描述 | 严重度 | 负责人 | 预计修复日期 |
|------|---------|--------|--------|------------|
| 1 | | | | |
| 2 | | | | |

---

## 附录 A：快速 API 测试脚本

在浏览器 DevTools Console 中执行（需先登录）：

```javascript
// 获取第一个有营养数据的原料 ID
const token = localStorage.getItem('tingstudio_token');
const matRes = await fetch('/api/materials?page=1&pageSize=5', { headers: { Authorization: `Bearer ${token}` } });
const matData = await matRes.json();
const materialId = matData.data?.list?.[0]?.id;
console.log('测试原料ID:', materialId);

// 测试获取来源列表
const srcRes = await fetch(`/api/nutrition/material/${materialId}/sources`, { headers: { Authorization: `Bearer ${token}` } });
const srcData = await srcRes.json();
console.log('来源列表:', srcData);

// 测试获取来源对比
const cmpRes = await fetch(`/api/nutrition/material/${materialId}/sources/compare`, { headers: { Authorization: `Bearer ${token}` } });
const cmpData = await cmpRes.json();
console.log('来源对比:', cmpData);

// 测试智能获取
const enrichRes = await fetch(`/api/nutrition/material/${materialId}/enrich-nutrition`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sources: ['seed'] })
});
const enrichData = await enrichRes.json();
console.log('智能获取:', enrichData);
```

## 附录 B：快照功能 API 测试

```javascript
const token = localStorage.getItem('tingstudio_token');

// 获取第一个配方 ID
const fRes = await fetch('/api/formulas?page=1&pageSize=3', { headers: { Authorization: `Bearer ${token}` } });
const fData = await fRes.json();
const formulaId = fData.data?.list?.[0]?.id;
console.log('测试配方ID:', formulaId);

// 触发计算（会保存快照）
const calcRes = await fetch(`/api/nutrition/calculate/${formulaId}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }
});
const calcData = await calcRes.json();
console.log('计算结果:', calcData.success);

// 读取营养表（应从快照返回）
const tblRes = await fetch(`/api/nutrition/tables/${formulaId}`, { headers: { Authorization: `Bearer ${token}` } });
const tblData = await tblRes.json();
console.log('快照读取:', {
  fromSnapshot: tblData.data?.fromSnapshot,
  snapshotCalculatedAt: tblData.data?.snapshotCalculatedAt
});
```
