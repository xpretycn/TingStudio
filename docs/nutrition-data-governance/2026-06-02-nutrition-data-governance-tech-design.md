# 营养数据治理 - 技术方案

## 1. 架构概述

### 1.1 三层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         前端 (Vue 3 + TDesign)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ MaterialDetail│  │ MaterialForm │  │ 来源对比面板              │  │
│  │ 来源标签+溯源  │  │ 来源选择器    │  │ 字段级对比+选定           │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼────────────────┼───────────────────────┼────────────────┘
          │                │                       │
┌─────────▼────────────────▼───────────────────────▼────────────────┐
│                     后端 API 层 (Express)                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  /api/nutrition/material/:id/sources     (来源 CRUD)        │  │
│  │  /api/nutrition/material/:id/sources/compare  (来源对比)     │  │
│  │  /api/nutrition/material/:id/authoritative (权威选定)        │  │
│  │  /api/materials/:id/enrich-nutrition     (外部API获取)      │  │
│  │  /api/materials/bulk-enrich-nutrition    (批量补全)          │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │                    Service 层                                 │  │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ │  │
│  │  │ nutritionSource-  │  │ externalNutrition/               │ │  │
│  │  │ Service.ts        │  │ ├─ AggregateNutritionService.ts  │ │  │
│  │  │ (来源CRUD+对比    │  │ ├─ adapters/TianApiAdapter.ts    │ │  │
│  │  │  +权威选定)       │  │ └─ adapters/SeedDataAdapter.ts   │ │  │
│  │  └──────────────────┘  └──────────────────────────────────┘ │  │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ │  │
│  │  │ nutritionService  │  │ nutritionSnapshotService.ts      │ │  │
│  │  │ .ts (现有,不改)   │  │ (配方快照读写)                    │ │  │
│  │  └──────────────────┘  └──────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │                    数据层                                     │  │
│  │  ┌────────────────────┐  ┌────────────────────────────────┐ │  │
│  │  │ material_nutrition │  │ material_nutrition_sources     │ │  │
│  │  │ (权威层,增强)       │  │ (来源层,新增)                   │ │  │
│  │  └────────────────────┘  └────────────────────────────────┘ │  │
│  │  ┌────────────────────┐  ┌────────────────────────────────┐ │  │
│  │  │ formula_nutrition_ │  │ formula_nutrition_snapshots    │ │  │
│  │  │ summaries (现有)    │  │ (快照层,新增)                   │ │  │
│  │  └────────────────────┘  └────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **计算逻辑零改动**：`nutritionService` 和 `nutritionEngine` 不修改，仍从 `material_nutrition` 读取
2. **新增表不修改现有表结构**：`material_nutrition_sources` 和 `formula_nutrition_snapshots` 为全新表
3. **`material_nutrition` 仅追加字段**：通过 ALTER TABLE 添加 `field_sources_json`、`source_type`、`source_detail`，不影响现有查询
4. **向后兼容**：现有 API `GET/PUT /api/nutrition/material/:id` 保持不变

---

## 2. 模块设计

### 2.1 来源层 Service (`nutritionSourceService.ts`)

**文件位置**：`backend/src/services/nutritionSourceService.ts`

**职责**：
- 来源数据的 CRUD 操作
- 来源对比计算
- 字段级权威数据组合

**核心函数**：

```typescript
interface NutritionSource {
  sourceId: string;
  materialId: string;
  sourceType: "manual" | "tianapi" | "seed" | "ai" | "excel_import" | "other";
  sourceDetail: string | null;
  per100g: Record<string, number>;
  confidence: "high" | "medium" | "low";
  matchScore: number | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  isActive: number;
}

interface SourceComparison {
  nutrients: {
    field: string;
    label: string;
    unit: string;
    authoritative: number;
    sources: {
      sourceId: string;
      sourceType: string;
      sourceDetail: string | null;
      confidence: string;
      value: number;
      diff: number;
      diffPercent: number;
    }[];
  }[];
}

async function addNutritionSource(
  materialId: string,
  sourceType: string,
  per100g: Record<string, number>,
  sourceDetail?: string,
  confidence?: string,
  matchScore?: number,
  notes?: string,
  userId?: string,
): Promise<{ success: boolean; sourceId?: string; message?: string }>

async function getNutritionSources(materialId: string): Promise<NutritionSource[]>

async function getNutritionSourcesCompare(materialId: string): Promise<SourceComparison>

async function softDeleteNutritionSource(
  sourceId: string,
  materialId: string,
): Promise<{ success: boolean; message?: string }>

async function setAuthoritativeFromSources(
  materialId: string,
  fieldSelections: Record<string, string>,
  userId: string,
): Promise<{ success: boolean; message?: string }>
```

**`setAuthoritativeFromSources` 核心逻辑**：

```
1. 接收 fieldSelections: { "protein": "source-id-1", "fat": "source-id-2", ... }
2. 从 material_nutrition_sources 查询所有指定 sourceId 的数据
3. 逐字段从对应 source 取值，组合为新的 per100g
4. 构建 field_sources_json: { "protein": { sourceId, sourceType, sourceDetail }, ... }
5. UPDATE material_nutrition SET per_100g_json, field_sources_json, source_type='composite', source_detail, last_updated
6. 返回成功
```

### 2.2 外部营养数据服务 (`externalNutrition/`)

**文件位置**：`backend/src/services/externalNutrition/`

#### 2.2.1 适配器接口

```typescript
interface NutritionSourceAdapter {
  name: string;
  search(foodName: string): Promise<ExternalNutritionResult | null>;
}

interface ExternalNutritionResult {
  source: string;
  per100g: Record<string, number>;
  rawName: string;
  confidence: "high" | "medium" | "low";
  matchScore: number;
}
```

#### 2.2.2 TianApiAdapter

**文件位置**：`backend/src/services/externalNutrition/adapters/TianApiAdapter.ts`

**核心逻辑**：
1. 调用 `https://apis.tianapi.com/nutrient/index?key={apiKey}&mode=0&word={foodName}`
2. 解析返回字段，映射为项目标准键名（使用 `NUTRIENT_KEY_MAP` 反向映射）
3. 能量换算：`kcal × 4.184 = kJ`
4. 名称匹配：先精确匹配，再尝试别名映射（`alias-map.json`）
5. 返回 `ExternalNutritionResult`，`matchScore` 基于名称相似度

**字段映射**（天行 → 项目标准键名）：

| 天行字段 | 项目标准键名 | 换算 |
|---------|------------|------|
| `rl` | `energy` | × 4.184 (kcal→kJ) |
| `dbz` | `protein` | 无 |
| `zf` | `fat` | 无 |
| `shhf` | `carbohydrate` | 无 |
| `ssxw` | `fiber` | 无 |
| `la` | `sodium` | 无 |
| `gai` | `calcium` | 无 |
| `tei` | `iron` | 无 |
| `xin` | `zinc` | 无 |
| `mei` | `magnesium` | 无 |
| `jia` | `potassium` | 无 |
| `ling` | `phosphorus` | 无 |
| `wsfc` | `vitaminC` | 无 |
| `wssa` | `vitaminA` | 无 |
| `wsse` | `vitaminE` | 无 |
| `las` | `vitaminB1` | 无 |
| `su` | `vitaminB2` | 无 |
| `ys` | `vitaminB3` | 无 |

#### 2.2.3 SeedDataAdapter

**文件位置**：`backend/src/services/externalNutrition/adapters/SeedDataAdapter.ts`

**核心逻辑**：
1. 加载 `backend/src/data/nutrition-seeds/yao-shi-tong-yuan-seed.json`
2. 按 `aliases` 数组匹配原料名称
3. 返回种子库数据，`confidence` 固定为 `high`，`matchScore` 固定为 `1.0`

#### 2.2.4 AggregateNutritionService

**文件位置**：`backend/src/services/externalNutrition/AggregateNutritionService.ts`

**核心逻辑**：
1. 按优先级依次尝试：SeedDataAdapter → TianApiAdapter
2. 每个适配器返回结果后，将数据写入 `material_nutrition_sources`
3. 返回所有获取到的来源数据列表

```typescript
async function enrichMaterialNutrition(
  materialId: string,
  materialName: string,
  userId?: string,
): Promise<{
  sources: NutritionSource[];
  totalFound: number;
  totalAttempted: number;
}>
```

### 2.3 配方快照服务 (`nutritionSnapshotService.ts`)

**文件位置**：`backend/src/services/nutritionSnapshotService.ts`

**核心函数**：

```typescript
async function saveNutritionSnapshot(
  formulaId: string,
  formulaVersionId: string | null,
  nutritionRefs: Record<string, {
    nutritionId: string;
    dataVersion: string;
    sourceType: string;
    per100gSnapshot: Record<string, number>;
  }>,
  totalNutrition: Record<string, number>,
  per100gNutrition: Record<string, number>,
  materialBreakdown: Record<string, unknown> | null,
  calculatedBy: string,
): Promise<string>

async function getNutritionSnapshot(
  formulaId: string,
  formulaVersionId?: string,
): Promise<DbRow | null>
```

**快照写入时机**：在 `nutritionService.calculateFormulaNutritionData()` 和 `getFormulaNutritionTablesData()` 计算完成后，追加调用 `saveNutritionSnapshot()`。

**快照读取策略**：
- 查看配方营养数据时，优先检查快照是否存在
- 快照存在 → 直接返回快照数据
- 快照不存在 → 重新计算并保存快照

### 2.4 现有 Service 改动点

#### `nutritionService.ts` 改动

**改动 1**：`setMaterialNutritionData` 保存时同步写入来源层

```typescript
// 在现有 UPDATE/INSERT material_nutrition 后，追加：
await addNutritionSource(materialId, "manual", merged, dataSource || "manual", confidence, null, notes, userId);
```

**改动 2**：`calculateFormulaNutritionData` 计算完成后保存快照

```typescript
// 在现有写入 formula_nutrition_summaries 后，追加：
await saveNutritionSnapshot(formulaId, versionId, nutritionRefs, totalNutrition, per100gNutrition, materialBreakdown, userId);
```

**改动 3**：`getFormulaNutritionTablesData` 优先读快照

```typescript
// 在函数开头，追加快照检查：
const snapshot = await getNutritionSnapshot(formulaId, versionId);
if (snapshot) return snapshot;
```

**改动 4**：`getMaterialNutritionData` 返回增强字段

```typescript
// 在返回对象中追加 fieldSources, sourceType, sourceDetail
return {
  ...rowToCamelCase(nutrition),
  per100g: normalizePer100g(safeJsonParse(nutrition.per_100g_json as string, {})),
  fieldSources: safeJsonParse(nutrition.field_sources_json as string, null),
  sourceType: nutrition.source_type || "manual",
  sourceDetail: nutrition.source_detail || null,
};
```

---

## 3. 别名映射

**文件位置**：`backend/src/data/nutrition-seeds/alias-map.json`

```json
{
  "薏苡仁": ["薏米", "苡仁"],
  "昆布": ["海带"],
  "大枣": ["红枣", "干枣"],
  "阿胶": ["驴皮胶"],
  "西红花": ["藏红花", "番红花"],
  "山药": ["薯蓣", "大薯"],
  "银耳": ["白木耳"],
  "百合": ["蒜脑薯"],
  "决明子": ["草决明"],
  "肉桂": ["桂皮", "官桂"],
  "丁香": ["公丁香"],
  "鲜芦根": ["芦根"],
  "橘红": ["化橘红"],
  "鱼腥草": ["蕺菜"],
  "鲜白茅根": ["白茅根"]
}
```

---

## 4. 环境变量

| 变量 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| `TIANAPI_KEY` | 天行数据 API Key | 空 | 否（不填则禁用天行数据） |
| `EXTERNAL_NUTRITION_ENABLED` | 外部营养数据功能开关 | `false` | 否 |

---

## 5. 错误处理

### 5.1 外部 API 调用错误

| 场景 | 处理方式 |
|------|---------|
| `TIANAPI_KEY` 未配置 | `enrichMaterialNutrition` 跳过 TianApiAdapter，仅尝试 SeedDataAdapter |
| `EXTERNAL_NUTRITION_ENABLED=false` | enrich API 返回 `{ success: false, message: "外部营养数据功能未启用" }` |
| 天行 API 返回非 200 | 记录日志，跳过该适配器，返回已获取的其他来源 |
| 天行 API 超时（>5s） | 跳过该适配器 |
| 天行 API 限流（429） | 记录日志，返回已获取的其他来源 |

### 5.2 来源数据冲突

| 场景 | 处理方式 |
|------|---------|
| 同一原料同一 source_type 已存在 | 软删除旧记录（`is_active=0`），插入新记录 |
| 来源数据与权威数据完全一致 | 仍写入来源层，标记为"已确认" |
| 管理员选定不存在的 sourceId | 返回 400 `VALIDATION_ERROR` |

---

## 6. 性能考量

### 6.1 查询性能

| 操作 | 预估耗时 | 优化措施 |
|------|---------|---------|
| 获取来源列表 | < 50ms | `idx_mns_material` 索引 |
| 来源对比 | < 100ms | 内存中计算差异，无额外查询 |
| 权威选定 | < 100ms | 批量查询 sourceId，单次 UPDATE |
| 快照写入 | < 50ms | `idx_fns_formula` 索引 |
| 快照读取 | < 30ms | 索引 + 单行查询 |

### 6.2 存储预估

| 表 | 每原料行数 | 77 种原料总行数 | 单行大小 | 总存储 |
|------|----------|---------------|---------|--------|
| `material_nutrition_sources` | 2-5 | 150-385 | ~1KB | ~400KB |
| `formula_nutrition_snapshots` | 1/配方 | 100-500 | ~3KB | ~1.5MB |

---

## 7. 文件变更清单

### 7.1 新增文件

| 文件 | 说明 |
|------|------|
| `backend/src/services/nutritionSourceService.ts` | 来源层 Service |
| `backend/src/services/nutritionSnapshotService.ts` | 快照 Service |
| `backend/src/services/externalNutrition/AggregateNutritionService.ts` | 多源聚合 |
| `backend/src/services/externalNutrition/adapters/TianApiAdapter.ts` | 天行数据适配器 |
| `backend/src/services/externalNutrition/adapters/SeedDataAdapter.ts` | 种子库适配器 |
| `backend/src/controllers/nutritionSourceController.ts` | 来源层控制器 |
| `backend/src/routes/nutritionSource.ts` | 来源层路由 |
| `backend/src/data/nutrition-seeds/alias-map.json` | 别名映射 |
| `backend/src/data/nutrition-seeds/yao-shi-tong-yuan-seed.json` | 种子库数据 |
| `backend/src/scripts/migrations/addNutritionSourceLayer.ts` | 迁移脚本 |
| `frontend/src/api/nutritionSource.ts` | 前端来源 API |
| `frontend/src/stores/nutritionSource.ts` | 前端来源 Store |
| `frontend/src/components/nutrition/NutritionSourceCompare.vue` | 来源对比面板 |
| `frontend/src/components/nutrition/NutritionSourceTag.vue` | 来源标签组件 |

### 7.2 修改文件

| 文件 | 改动内容 |
|------|---------|
| `backend/src/scripts/init.sql` | 新增 `material_nutrition_sources`、`formula_nutrition_snapshots` 建表语句 |
| `backend/src/scripts/mysql-init.sql` | 同上 MySQL 版本 |
| `backend/src/services/nutritionService.ts` | 4 处改动（见 2.4 节） |
| `backend/src/routes/index.ts` | 注册 `nutritionSourceRoutes` |
| `backend/src/routes/materials.ts` | 新增 enrich-nutrition 路由 |
| `backend/src/controllers/materialController.ts` | 新增 enrich 控制器函数 |
| `frontend/src/api/nutrition.ts` | `MaterialNutrition` 类型增强 |
| `frontend/src/views/materials/MaterialDetail.vue` | 来源标签 + 来源对比入口 |
| `frontend/src/views/materials/MaterialForm.vue` | 来源选择器 |
