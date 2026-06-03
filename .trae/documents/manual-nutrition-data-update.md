# 手动更新种子库数据 / API 模拟数据 — 操作手册

> 本文件为「计划文档」形式交付，不含代码变更，仅描述**当前系统**下手动更新营养数据来源的操作步骤、原理与注意事项。
> 项目根目录：`d:\Program Data\workspace-codebd\TingStudio`

***

## 1. 现状速览（基于代码探索结果）

营养数据来源共**三类**，每类更新方式不同：

| 数据源类型                  | 物理位置                                                                                                                | 加载时机                                  | 入库方式                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **种子库** (Seed)         | `backend/src/data/nutrition-seeds/yao-shi-tong-yuan-seed.json` + `alias-map.json`                                   | 首次 `SeedDataAdapter.search()` 调用时按需读取 | 通过 `POST /api/nutrition-sources/material/:id/enrich-nutrition` 入库到 `material_nutrition_sources` 表 |
| **Mock API**（天行API 模拟） | `backend/src/services/externalNutrition/adapters/NutritionAdapters.ts` 中的 `MOCK_NUTRITION_DB` / `MOCK_ALIAS_MAP` 常量 | `MockNutritionAdapter.search()` 内联访问  | 同上，`source_type='tianapi'`                                                                        |
| **真实天行 API**           | 不在代码内，通过环境变量 `TIANAPI_KEY` 启用 `TianApiAdapter`                                                                      | `getTianApiAdapter()` 检测到 Key 后初始化    | 同上，`source_type='tianapi'`                                                                        |

**核心数据流向**：

```
JSON 种子库 / Mock 常量 / 真实 API  →  Adapter.search(foodName)
                                       ↓
                          AggregateNutritionService.enrichMaterialNutrition()
                                       ↓
                          addNutritionSource()  (写入 material_nutrition_sources)
                                       ↓
                          用户在前端"营养来源对比"页可见
```

**重要事实**（直接影响更新策略）：

* JSON 与 Mock 常量都是**进程内缓存**（`SeedDataAdapter.loaded` / `MOCK_NUTRITION_DB` 常量），**修改后必须重启后端进程**才能生效。

* 写入数据库后，前端页面读到的是 `material_nutrition_sources` 表中的快照，**不会**自动同步 JSON/常量变更。

* 若要"刷新"已有数据到新值，需要删除/失效旧记录（`is_active=0`）或调用 `bulk-enrich-nutrition` 重跑。

***

## 2. 更新种子库数据（推荐路径）

### 2.1 文件位置

```
backend/src/data/nutrition-seeds/
├── yao-shi-tong-yuan-seed.json   ← 主数据：每 100g 营养成分
└── alias-map.json                ← 别名映射：原料标准名 → 多个别名
```

### 2.2 JSON 字段说明

**`yao-shi-tong-yuan-seed.json`**：数组，每条记录结构：

```json
{
  "aliases": ["标准名", "别名1", "别名2"],
  "per100g": {
    "energy": 1436,         // 单位 kJ/100g
    "protein": 10.5,        // 单位 g/100g
    "fat": 5.0,
    "carbohydrate": 63.1,
    "fiber": 1.7,           // 可选
    "sodium": 460,
    "calcium": 120,
    "iron": 8.8,
    "zinc": 2.3,
    "potassium": 260,
    "magnesium": 45,
    "phosphorus": 180,
    "vitaminC": 5,          // 可选
    "vitaminA": 1625        // 可选（单位 μg/100g）
  },
  "source": "中国食物成分表",
  "dataVersion": "1.0"
}
```

**`alias-map.json`**：对象，键为「主标准名」，值为**该原料的所有额外别名**数组：

```json
{
  "阿胶": ["驴皮胶"],
  "山药": ["薯蓣", "大薯"],
  "大枣": ["红枣", "干枣"]
}
```

### 2.3 三种典型更新场景

#### 场景 A：新增一个原料

1. 打开 `yao-shi-tong-yuan-seed.json`，在数组末尾追加：

   ```json
   {
     "aliases": ["新原料名", "别名A", "别名B"],
     "per100g": { "energy": 1000, "protein": 5, "fat": 2, "carbohydrate": 30, "sodium": 20 },
     "source": "中国食物成分表",
     "dataVersion": "1.0"
   }
   ```
2. （可选）若 `aliases[0]` 与已有原料不同，把新名作为键加入 `alias-map.json`：

   ```json
   "新原料名": ["别名A", "别名B"]
   ```
3. **保存文件，重启后端**（`Ctrl+C` 终止 `npm run dev`，再启动）。
4. 调用 API 让新原料入库（按 `materialId` 触发）：

   ```http
   POST /api/nutrition-sources/material/{materialId}/enrich-nutrition
   Content-Type: application/json
   Authorization: Bearer <admin_token>

   { "sources": ["seed"] }
   ```

   或一次性给所有未入库的原料补全：

   ```http
   POST /api/nutrition-sources/bulk-enrich-nutrition
   { "sources": ["seed"], "overwriteExisting": false }
   ```
5. 在前端"原料管理 → 营养来源对比"页验证：左侧应出现新的"种子库"来源卡片，且 `sourceDetail` 形如 `种子库·中国食物成分表 v1.0·新原料名`。

#### 场景 B：修正某个原料的某项营养数值

1. 打开 `yao-shi-tong-yuan-seed.json`，定位到 `aliases[0]` 匹配的目标记录。
2. 直接修改 `per100g` 对象内的字段值。**保持键名一致**（`energy` / `protein` / `fat` / `carbohydrate` / `sodium` / `fiber` / `calcium` / `iron` / `zinc` / `potassium` / `magnesium` / `phosphorus` / `vitaminC` / `vitaminA` / `vitaminE` / `vitaminB1` / `vitaminB2` / `vitaminB3` / `vitaminB12` / `vitaminK` / `iodine`）。
3. 建议同步把 `dataVersion` 提升（如 `1.0` → `1.1`），便于审计。
4. **保存，重启后端**。
5. 数据库中**已有**的 `seed` 来源记录是历史快照，不会自动更新。两条路：

   * **推荐**：调 `setAuthoritative` 或在 UI 上"应用此候选为主用"重新生成一份（参考 `nutritionSourceController.setAuthoritative`）。

   * **直接替换**：执行 SQL 把对应原料的 `is_active=0`，再调 `enrich-nutrition` 重跑：

     ```sql
     UPDATE material_nutrition_sources
        SET is_active = 0
      WHERE material_id = '<id>' AND source_type = 'seed';
     ```

     然后调：

     ```http
     POST /api/nutrition-sources/material/{materialId}/enrich-nutrition
     { "sources": ["seed"] }
     ```

#### 场景 C：添加别名（原料在库但匹配不上）

1. 打开 `alias-map.json`，在对象中加一行：

   ```json
   "已有原料标准名": ["新别名1", "新别名2"]
   ```
2. 保存并重启后端。
3. 调 `enrich-nutrition` 重跑入库（参考 2.3-B 的"直接替换"流程）。

### 2.4 关键约束

* 数值单位**必须是每 100g**，与 `per_100g` 字段名含义一致。

* `aliases` 内**首项**会被用作 `rawName` 展示，应选最规范的中文名。

* `aliases` 元素做的是**精确匹配或子串包含**（见 `SeedDataAdapter.search` 内的 `aliases.some(...)`），模糊匹配有限。

* 不要在 `aliases` 中使用 `中国食物成分表` 这类来源名（会污染 `rawName`）。

***

## 3. 更新 Mock API 数据（演示用天行API）

> 当前所有天行API来源的数据均来自 `MOCK_NUTRITION_DB`（**演示/占位**），不会调用真实接口。要修改这些演示数据：

### 3.1 文件位置

```
backend/src/services/externalNutrition/adapters/NutritionAdapters.ts
```

### 3.2 两个常量区域

* **L117–138**：`MOCK_NUTRITION_DB` — 主键为原料名，值为 `per100g` 营养数据对象。

* **L140–160**：`MOCK_ALIAS_MAP` — 主键为原料名，值为别名数组。

* **L190–213**：`MockNutritionAdapter.generateFallback()` — 当原料**不在** `MOCK_NUTRITION_DB` 时，根据 `foodName` 字符串哈希生成的"伪数据"逻辑。

### 3.3 三种典型场景

#### 场景 A：新增或修改某个原料的 Mock 数据

1. 打开 `NutritionAdapters.ts`。
2. 找到 `MOCK_NUTRITION_DB`（约 117 行），按字母/笔画位置**新增或修改**：

   ```typescript
   const MOCK_NUTRITION_DB: Record<string, Record<string, number>> = {
     "新原料": { energy: 1000, protein: 5, fat: 2, carbohydrate: 30, sodium: 20 },
     // ... 已有数据
   }
   ```
3. 同步在 `MOCK_ALIAS_MAP` 添加别名（如需要）。
4. 保存并**重启后端**。
5. 调 `enrich-nutrition`（`source_type='tianapi'`）入库；或参考 2.3-B 的 SQL 方式失效旧记录后重跑。

#### 场景 B：让 Mock 数据带"演示/水印"标签

当前 `MockNutritionAdapter.search()` 返回的 `source` 字段固定为 `"tianapi"`，但**没有标识是 Mock**。要明显提示：

1. 在 `MockNutritionAdapter` 中追加 `dataSource: "演示数据（未对接真实天行API）"`、`dataVersion: "mock-1.0"` 字段返回（参考 `SeedDataAdapter` 的相同返回结构，L257–267）。
2. 后端 `AggregateNutritionService.enrichMaterialNutrition()` 会自动把它拼到 `sourceDetail`（如 `天行数据·演示数据（未对接真实天行API） vmock-1.0·<rawName>`），前端**无需改动**即可看到。
3. 重启后端生效。

#### 场景 C：彻底关闭 Mock（让没有 Key 的请求直接失败）

* 方案 1：环境变量中加 `TIANAPI_KEY=""`（即空），`getTianApiAdapter()` 仍会走 Mock。要真正禁用，改 `getTianApiAdapter()` 让 `apiKey` 为空时 `return null`。

* 方案 2：在 `nutritionSourceController.enrichNutrition` 中加判断：若 `process.env.TIANAPI_KEY === ''` 或 `EXTERNAL_NUTRITION_MOCK=false`，直接返回 503。

### 3.4 关键约束

* 改动 `MOCK_NUTRITION_DB` 是**全代码改动**，必须通过 Git 提交；JSON 文件改动则可被外行人员编辑。

* 重启后端是**必要条件**。

* 当前 Mock 数据**与种子库高度重复**（约 20 个原料，数值几乎一致）——这正是用户提出"演示数据"标识的原因之一。

***

## 4. 切换到真实天行 API（可选）

### 4.1 启用步骤

1. 申请天行 API Key：<https://www.tianapi.com/（"营养成分"接口）。>
2. 在 `backend/.env` 中添加：

   ```
   TIANAPI_KEY=your_tianapi_key_here
   EXTERNAL_NUTRITION_ENABLED=true
   ```
3. 重启后端。日志会出现：

   ```
   [AggregateNutritionService] 使用真实天行API适配器
   ```

   （当前代码仅在 `TIANAPI_KEY` 缺失时打印 Mock 提示，启用后无显式日志——可通过 `getTianApiAdapter()` 加日志确认分支。）

### 4.2 字段映射参考

`TianApiAdapter` 内置 `TIANAPI_FIELD_MAP`（`NutritionAdapters.ts` L23–42）：

| 天行API字段 | 项目内部字段         |
| ------- | -------------- |
| `rl`    | `energy`       |
| `dbz`   | `protein`      |
| `zf`    | `fat`          |
| `shhf`  | `carbohydrate` |
| `ssxw`  | `fiber`        |
| `la`    | `sodium`       |
| `gai`   | `calcium`      |
| `tei`   | `iron`         |
| `xin`   | `zinc`         |
| `mei`   | `magnesium`    |
| `jia`   | `potassium`    |
| `ling`  | `phosphorus`   |
| `wsfc`  | `vitaminC`     |
| `wssa`  | `vitaminA`     |
| `wsse`  | `vitaminE`     |
| `las`   | `vitaminB1`    |
| `su`    | `vitaminB2`    |
| `ys`    | `vitaminB3`    |

若天行API新增/重命名字段，需要同步修改 `TIANAPI_FIELD_MAP`。

### 4.3 单位换算

* `energy`：天行返回 kcal，代码 `* 4.184` 转 kJ（`L80`）。

* 其他营养素：天行返回 g/100g，代码 `* 1000` 转 mg/100g（`L81`）。

* 若天行接口的实际单位与假设不一致，需要在 `TIANAPI_FIELD_MAP` 后处理或加注释。

***

## 5. 数据刷新到数据库的几种方法

| 方法          | API / 命令                                                                                                                   | 适用场景                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 单原料刷新       | `POST /api/nutrition-sources/material/:id/enrich-nutrition` `{ "sources": ["seed"] \| ["tianapi"] \| ["seed","tianapi"] }` | 临时修正某一原料                 |
| 批量刷新（仅未入库的） | `POST /api/nutrition-sources/bulk-enrich-nutrition` `{ "sources": ["seed"], "overwriteExisting": false }`                  | 首次导入                     |
| 批量刷新（覆盖已有）  | 同上，`overwriteExisting: true`                                                                                               | 重大数据源升级                  |
| 直接 SQL      | `UPDATE material_nutrition_sources SET is_active=0 WHERE material_id=? AND source_type=?` + 上面任一 API                       | 精细控制                     |
| 全量重新种子化     | `cd backend && npm run seed`                                                                                               | **注意**：会重建所有表数据，可能影响其他模块 |

> ⚠️ `bulk-enrich-nutrition` 需要 `role='admin'`，`enrich-nutrition` 任意已认证用户可调（开发环境或 `EXTERNAL_NUTRITION_ENABLED=true`）。

***

## 6. 验证清单

每次手动更新数据后，按以下顺序验证：

1. **后端日志**：`npm run dev` 输出无 `Adapter search failed`、无 `MockNutritionAdapter` 异常。
2. **数据库**：

   ```sql
   SELECT source_type, source_detail, is_active, created_at
     FROM material_nutrition_sources
    WHERE material_id = '<目标 id>'
    ORDER BY created_at DESC;
   ```

   确认新记录存在、旧记录 `is_active=0`。
3. **前端**：访问 `原料详情 → 营养来源对比`，左侧列表应显示新版本；卡片 `dataSource` 与 `dataVersion` 与 JSON 同步。
4. **数据一致性**：切换主用来源后，`material_nutrition.field_sources_json` 应记录所选 `sourceId`（参考前端 store `computeMajorityAuthoritative()` 逻辑）。
5. **PDF 导出**：在对比页点"导出报告 → PDF"，检查 `sourceDetail` 列是否带新版次（如 `v1.1`）。

***

## 7. 常见踩坑

| 现象                          | 原因                                                          | 解决                                               |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| 改了 JSON 但前端没变化              | 没重启后端，`SeedDataAdapter` 仍在内存中读旧文件                           | 重启                                               |
| 改了 JSON 但数据库没刷新             | 数据库是历史快照                                                    | 调 `enrich-nutrition` 重跑                          |
| 原料匹配不上种子库                   | `aliases` 数组里没有当前原料名或其别名                                    | 改 `aliases` 或加 `alias-map.json` 条目               |
| Mock 数据显示为"天行数据"            | 业务层未区分真/假 API                                               | 按 3.3-B 给 Mock 加 `dataSource` 水印                 |
| `bulk-enrich-nutrition` 返回空 | `EXTERNAL_NUTRITION_ENABLED !== "true"` 且非 `development` 环境 | 临时 `EXTERNAL_NUTRITION_ENABLED=true npm run dev` |
| Excel 导入钠数据异常               | 用户已明确**忽略**该问题                                              | 暂不处理（详见上一轮对话结论）                                  |
| `TianApiAdapter` 报超时        | 真实接口慢或网络限制                                                  | `AbortSignal.timeout(5000)`，失败返回 null 不影响整体流程    |

***

## 8. 推荐的"日常维护节奏"

| 周期              | 动作                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------- |
| **每次增加/修改原料**   | 改 `yao-shi-tong-yuan-seed.json` → 重启 → 调 `enrich-nutrition` 入库                            |
| **每季度**         | 与最新《中国食物成分表》纸质/电子版比对，批量提升 `dataVersion`                                                   |
| **首次启用真实天行API** | 设 `TIANAPI_KEY` + `EXTERNAL_NUTRITION_ENABLED=true` → 小范围测试 → `bulk-enrich-nutrition` 全量刷 |
| **数据治理审计**      | 用 `auditAndSupplementNutrition.ts`（已有）发现缺数据的原料，补充到种子库                                     |
| **数据导出/备份**     | 走 `backend/src/scripts/exportDatabase.ts`，备份包含 `material_nutrition_sources` 表             |

***

## 9. 相关文件索引

| 路径                                                                     | 角色                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `backend/src/data/nutrition-seeds/yao-shi-tong-yuan-seed.json`         | 种子库主数据                                                     |
| `backend/src/data/nutrition-seeds/alias-map.json`                      | 种子库别名                                                      |
| `backend/src/services/externalNutrition/adapters/NutritionAdapters.ts` | 三个 Adapter（Seed / Mock / Tian）                             |
| `backend/src/services/externalNutrition/AggregateNutritionService.ts`  | 总入口：选择 Adapter 并入库                                         |
| `backend/src/services/nutritionSourceService.ts`                       | `addNutritionSource` / `setAuthoritativeFromSources` 等核心服务 |
| `backend/src/controllers/nutritionSourceController.ts`                 | REST API 端点                                                |
| `backend/src/routes/nutritionSource.ts`                                | 路由表（`/api/nutrition-sources/...`）                          |
| `backend/src/scripts/seedData.ts`                                      | 首次种子化脚本（`npm run seed`）                                    |
| `backend/src/scripts/importNutritionData.ts`                           | Excel 导入脚本（`npm run import-nutrition`）                     |
| `frontend/src/views/materials/NutritionSourcesCompare.vue`             | 前端"营养来源对比"页面                                               |
| `frontend/src/components/nutrition-sources/SourceListItem.vue`         | 单条来源卡片（含"演示数据"标识）                                          |
| `backend/.env` / `.env.example`                                        | 环境变量（`TIANAPI_KEY`, `EXTERNAL_NUTRITION_ENABLED`）          |

***

## 10. 不在本次范围内的项

* 暂不实现 Web 管理界面（用户已选"纯文档说明"）。

* 暂不动 Excel 导入的钠数据问题。

* 暂不修改 `TianApiAdapter` 的超时/重试逻辑。

* 暂不实现"种子库差异比对"工具（仅给出人工比对流程）。

