# 药食同源原料营养数据公开接口整合方案

## 1. 执行摘要

**结论：方案可行，但需采用「外部 API + 本地种子库 + 人工兜底」的三层混合策略，不可完全依赖单一公开接口。**

项目现有 77 种原料，绝大多数属于国家卫健委公布的 106 种药食同源目录。调研发现：
- 国内公开营养接口覆盖的是「常见食材」，对中药材/药食同源 specialty ingredients 覆盖不足。
- 部分原料（如 平卧菊三七、显脉旋覆花、地龙蛋白肽粉）在公开数据库中几乎不可能找到标准营养数据。
- 天行数据 API 是性价比最高的可接入源，可作为补充手段，但无法覆盖全部 77 种原料。

**推荐策略：**
1. 接入天行数据 API，为能在库中命中的原料自动填充营养数据。
2. 建立本地 `yao-shi-tong-yuan-seed.json` 种子库，收录药食同源原料的权威营养数据。
3. 前端提供「一键补全」+「手动录入」双通道，无法自动填充时由用户/管理员兜底。

---

## 2. 项目现有数据结构分析

### 2.1 原料表 (`materials`)
- 77 条记录，名称均为中文。
- 药食同源原料占比极高（山药、山楂、甘草、当归、陈皮、枸杞、黄芪、黄精等）。
- 部分为原料深加工品（酸枣蜜炼、黄精蜜炼、地龙蛋白肽粉、竹叶黄酮），这类在公开食物成分表中几乎无数据。

### 2.2 营养成分表 (`material_nutrition`)
```sql
CREATE TABLE material_nutrition (
  nutrition_id VARCHAR(36) PRIMARY KEY,
  material_id VARCHAR(36) NOT NULL,
  per_100g_json JSON NOT NULL,        -- 营养数据存储格式
  data_version VARCHAR(20) DEFAULT '1.0',
  data_source VARCHAR(255) DEFAULT NULL,  -- 数据来源标记
  notes TEXT DEFAULT NULL,
  ...
);
```
- `per_100g_json` 为 JSON 格式，当前键名经 `normalizePer100g` 处理后为 camelCase。
- `data_source` 字段已存在，可直接标记数据来源（`tianapi`、`usda`、`seed`、`manual` 等）。
- 表支持版本化（`is_latest`），新增营养数据版本不会影响历史配方计算。

### 2.3 当前数据缺口
- 部分原料 `per_100g_json` 为空或全零（如 r-氨基丁酸、竹叶黄酮等深加工品）。
- 现有数据主要来源于用户手动录入或批量导入，缺乏权威第三方验证。

---

## 3. 公开营养数据接口调研与评估

### 3.1 候选接口对比

| 接口 | 数据量 | 药食同源覆盖 | 费用 | 中文支持 | 推荐指数 |
|------|--------|-------------|------|---------|---------|
| **天行数据 营养成分表** | ~2000 种 | 中（常见食材有，稀有药材无） | 免费/29元/月 | ✅ | ⭐⭐⭐⭐ |
| **唤醒食物 API** | 1780 种 + 类黄酮库 | 中 | 需询价 | ✅ | ⭐⭐⭐ |
| **NutriData** | 多国数据源 | 未知 | 需询价 | ✅ | ⭐⭐⭐ |
| **好轻开放平台** | 150万+ | 高（但需商务合作） | 需商务 | ✅ | ⭐⭐ |
| **USDA FoodData Central** | 37万+ | 极低（无中文药材） | 免费 | ❌ | ⭐ |
| **CnOpenData** | 1700+ | 中 | 购买数据集 | ✅ | ⭐⭐ |
| **Open Food Facts** | 300万+ | 低（预包装食品为主） | 免费 | 有限 | ⭐ |

### 3.2 天行数据 API 详细分析（首选方案）

**接口地址：** `https://apis.tianapi.com/nutrient/index?key={apiKey}`

**请求参数：**
- `mode=0`：按食品名称搜索营养成分
- `word`：食品名称（如 山药、大枣）
- `num`：返回数量（最大 20）

**返回字段（与项目字段映射）：**
```json
{
  "rl": 243,      // 热量(千卡) -> energy_kj (需换算: kcal * 4.184)
  "dbz": 1.9,     // 蛋白质(g) -> protein_g
  "zf": 0.2,      // 脂肪(g) -> fat_g
  "shhf": 12.4,   // 碳水化合物(g) -> carbohydrate_g
  "ssxw": 0,      // 膳食纤维(g) -> dietary_fiber_g
  "gai": 16,      // 钙(mg) -> calcium_mg
  "tei": 0.3,     // 铁(mg) -> iron_mg
  "xin": 0.27,    // 锌(mg) -> zinc_mg
  "wsfc": 5.0,    // 维生素C(mg) -> vitamin_c_mg
  "la": 18.6,     // 钠(mg) -> sodium_mg
  "jia": 213,     // 钾(mg) -> potassium_mg
  "mei": 20,      // 镁(mg) -> magnesium_mg
  ...
}
```

**费用：**
- 普通会员：100 次/天（免费）
- 高级会员：1 万次/天，29 元/月
- 对于 77 种原料，免费额度已足够初始填充；后续增量更新建议购买高级会员。

**局限性：**
- 返回的是「千卡」，项目使用「千焦(kJ)」，需要换算（1 kcal = 4.184 kJ）。
- 部分药食同源原料使用「药材名」而非「食材名」，可能导致搜索失败（如 薏苡仁 vs 薏米、昆布 vs 海带）。
- 深加工品（蜜炼、肽粉、黄酮提取物）不在数据库中。

---

## 4. 技术架构方案

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 原料详情页    │  │ 原料列表页    │  │ 批量补全按钮      │  │
│  │ [自动获取营养] │  │ [筛选无数据]  │  │ [一键补全77种]   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼──────────────────┼────────────┘
          │                │                  │
          └────────────────┴──────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   后端 (Express + TypeScript)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  POST /api/materials/:id/enrich-nutrition             │  │
│  │  POST /api/materials/bulk-enrich-nutrition            │  │
│  │  GET  /api/materials/:id/nutrition-suggestions        │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │        externalNutritionService.ts                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ 天行数据适配器 │  │ 本地种子库    │  │ 多源聚合器   │   │  │
│  │  │ (TianApiAdapter)│  │ (SeedLoader) │  │ (Aggregator)│   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │              materialService.ts                        │  │
│  │         (写入 material_nutrition 表)                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心模块设计

#### 4.2.1 外部数据源适配层 (`backend/src/services/externalNutrition/`)

```typescript
// adapters/TianApiAdapter.ts
interface NutritionSourceAdapter {
  name: string;
  search(foodName: string): Promise<ExternalNutritionResult | null>;
}

interface ExternalNutritionResult {
  source: string;
  per100g: Record<string, number>;
  rawName: string;    // 接口返回的原始名称
  confidence: number; // 匹配置信度 0-1
}
```

**实现清单：**
1. `TianApiAdapter.ts` — 天行数据适配器
2. `SeedDataAdapter.ts` — 本地种子库适配器
3. `AggregateNutritionService.ts` — 多源聚合服务（按优先级尝试多个源）

#### 4.2.2 本地种子库 (`backend/src/data/nutrition-seeds/`)

```json
// yao-shi-tong-yuan-seed.json
[
  {
    "aliases": ["山药", "薯蓣", "大薯"],
    "per100g": {
      "energy_kj": 243,
      "protein_g": 1.9,
      "fat_g": 0.2,
      "carbohydrate_g": 12.4,
      "dietary_fiber_g": 0,
      "sodium_mg": 18.6,
      "calcium_mg": 16,
      "iron_mg": 0.3,
      "vitamin_c_mg": 5.0
    },
    "source": "《中国食物成分表》标准版第6版",
    "dataVersion": "1.0"
  }
]
```

**种子库数据来源：**
- 《中国食物成分表》标准版第6版（中国疾病预防控制中心营养与健康所）
- 国家食物成分查询平台 (https://nlc.chinanutri.cn/)
- 人工录入权威文献数据

#### 4.2.3 新增后端 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/materials/:id/enrich-nutrition` | 为指定原料自动获取营养数据 | admin/formulist(own) |
| POST | `/api/materials/bulk-enrich-nutrition` | 批量为所有原料补全营养数据 | admin only |
| GET | `/api/materials/:id/nutrition-suggestions` | 获取候选营养数据源列表 | admin/formulist(own) |

#### 4.2.4 前端交互

1. **原料详情页 / 编辑页**
   - 新增「智能获取营养数据」按钮
   - 点击后调用 `enrich-nutrition`，显示加载态
   - 返回后展示获取到的数据，用户可确认或取消
   - 若未命中外部接口，提示「未找到权威数据，请手动录入」

2. **原料列表页（管理员）**
   - 新增筛选条件：「营养数据缺失」
   - 新增批量操作：「为选中原料获取营养数据」

3. **快速录入页面**
   - 原料池 hover 卡片中，若营养数据来自外部接口，显示小图标（如 🌐）

---

## 5. 字段映射与单位换算

### 5.1 天行数据 → 项目字段映射

| 天行字段 | 项目字段 | 单位换算 |
|---------|---------|---------|
| `rl` (热量) | `energy_kj` | kcal × 4.184 = kJ |
| `dbz` (蛋白质) | `protein_g` | 无 |
| `zf` (脂肪) | `fat_g` | 无 |
| `shhf` (碳水化合物) | `carbohydrate_g` | 无 |
| `ssxw` (膳食纤维) | `dietary_fiber_g` | 无 |
| `gai` (钙) | `calcium_mg` | 无 |
| `tei` (铁) | `iron_mg` | 无 |
| `xin` (锌) | `zinc_mg` | 无 |
| `mei` (镁) | `magnesium_mg` | 无 |
| `la` (钠) | `sodium_mg` | 无 |
| `jia` (钾) | `potassium_mg` | 无 |
| `ling` (磷) | `phosphorus_mg` | 无 |
| `wsfc` (维生素C) | `vitamin_c_mg` | 无 |
| `wssa` (维生素A) | `vitamin_a_ug` | 无 |
| `wsse` (维生素E) | `vitamin_e_mg` | 无 |
| `las` (硫胺素/B1) | `vitamin_b1_mg` | 无 |
| `su` (核黄素/B2) | `vitamin_b2_mg` | 无 |
| `ys` (烟酸/B3) | `niacin_mg` | 无 |

### 5.2 能量计算校验

根据项目现有逻辑，若接口未返回能量或能量为 0，但蛋白质/脂肪/碳水有值，则自动计算：
```
energy_kj = (protein_g × 17 + fat_g × 37 + carbohydrate_g × 17) / 1000
```
（注：项目当前逻辑为 kJ 级别计算，需确认是否为天行数据 kcal 输入后的换算逻辑。）

---

## 6. 名称匹配策略

### 6.1 别名映射表

建立 `nutrition_alias_map.json`：
```json
{
  "薏苡仁": ["薏米", "苡仁"],
  "昆布": ["海带"],
  "大枣": ["红枣", "干枣"],
  "阿胶": ["驴皮胶"],
  "西红花": ["藏红花", "番红花"],
  "山药": ["薯蓣", "大薯"],
  "银耳": ["白木耳"],
  "百合": ["蒜脑薯"]
}
```

### 6.2 匹配优先级

1. **精确匹配**：原料名称与接口返回名称完全一致
2. **别名匹配**：使用别名映射表尝试匹配
3. **模糊匹配**：使用字符串相似度（如 Levenshtein distance）推荐候选
4. **人工确认**：前端展示候选列表，由用户选择确认

---

## 7. 实施步骤

### Phase 1：基础设施搭建（1-2 天）

1. **添加环境变量**
   - `TIANAPI_KEY` — 天行数据 API Key
   - `EXTERNAL_NUTRITION_ENABLED=true` — 功能开关

2. **创建适配层**
   - `backend/src/services/externalNutrition/adapters/TianApiAdapter.ts`
   - `backend/src/services/externalNutrition/adapters/SeedDataAdapter.ts`
   - `backend/src/services/externalNutrition/AggregateNutritionService.ts`

3. **创建种子库**
   - `backend/src/data/nutrition-seeds/yao-shi-tong-yuan-seed.json`
   - 初始填充 20-30 种核心药食同源原料数据

4. **创建别名映射**
   - `backend/src/data/nutrition-seeds/alias-map.json`

### Phase 2：后端 API 开发（2-3 天）

1. **实现 `POST /api/materials/:id/enrich-nutrition`**
   - 调用 AggregateNutritionService 尝试多源获取
   - 写入 material_nutrition 表（新增版本）
   - 标记 data_source
   - 返回获取结果（成功/失败/未命中）

2. **实现 `POST /api/materials/bulk-enrich-nutrition`**
   - 仅 admin 可用
   - 遍历所有原料，批量调用 enrich
   - 返回统计报告（成功数/失败数/未命中数）

3. **实现 `GET /api/materials/:id/nutrition-suggestions`**
   - 返回候选数据源列表（供用户预览选择）

### Phase 3：前端交互开发（2-3 天）

1. **原料详情页新增「智能获取」按钮**
   - 调用 enrich-nutrition API
   - 展示结果对比（原数据 vs 新数据）
   - 用户确认后保存

2. **原料列表页新增「营养数据缺失」筛选 + 批量补全**

3. **快速录入页原料卡片标记数据来源**
   - 外部数据：🌐 图标
   - 种子库：📚 图标
   - 手动录入：✏️ 图标

### Phase 4：数据填充与验证（1-2 天）

1. **对 77 种原料执行批量补全**
2. **人工核对补全结果**，修正异常值
3. **生成数据质量报告**

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 天行数据 API 停机或限流 | 自动获取功能中断 | 本地种子库作为 fallback；添加熔断机制 |
| 接口返回数据与实物不符 | 配方计算误差 | 标记 data_source，人工复核机制；置信度低于 0.8 时强制人工确认 |
| 原料名称无法匹配 | 大量原料无法自动填充 | 建立别名映射表；前端提供候选列表供用户选择 |
| 深加工品无标准营养数据 | 数据持续缺失 | 允许用户手动录入；标记为「custom」数据源 |
| 单位换算误差 | 能量值偏差 | 统一换算逻辑封装在适配器中；单元测试覆盖 |
| 第三方 API 费用上涨 | 运营成本增加 | 接入层抽象化，可随时切换数据源；种子库持续积累减少对 API 依赖 |

---

## 9. 成本估算

| 项目 | 费用 | 说明 |
|------|------|------|
| 天行数据高级会员 | 29 元/月 | 1 万次/天，足够日常增量更新 |
| 开发人力 | ~7 天 | Phase 1-4 合计 |
| 数据人工校对 | ~1-2 天 | 对 77 种原料进行抽样核对 |

---

## 10. 替代方案（若不接入外部 API）

若评估后决定暂不接入外部接口，可采用以下替代方案：

1. **纯本地种子库方案**
   - 从《中国食物成分表》官方网站 (https://nlc.chinanutri.cn/) 人工查询并录入 77 种原料数据。
   - 优点：零外部依赖、数据权威、一次录入永久使用。
   - 缺点：初期工作量较大（约 2-3 天人工查询录入）。

2. **AI 辅助生成方案**
   - 使用项目已有的 AI 服务（DashScope/DeepSeek），让 AI 根据原料名称生成营养数据估算值。
   - 优点：快速、无需外部 API 费用。
   - 缺点：数据准确性无法保证，必须标记为「AI 估算」并提示用户。

---

## 11. 决策建议

**推荐执行「三层混合策略」：**

1. **短期（本周）**：Phase 1 + Phase 2（后端 API + 适配层 + 种子库初版）。
2. **中期（下周）**：Phase 3（前端交互）+ 对 77 种原料执行批量补全。
3. **长期（持续）**：积累本地种子库，逐步降低对外部 API 的依赖；对新增原料自动尝试补全。

**若资源紧张，可优先实施「纯本地种子库方案」**：直接从《中国食物成分表》官网查询 77 种原料数据，一次性录入数据库，零外部依赖、零持续费用。
