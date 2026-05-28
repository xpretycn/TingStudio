# 数据库设计：配方营养分析功能重构

## 1. 概述

本次重构**不新增数据库表**，复用现有表结构。仅新增常量配置数据和调整查询逻辑。

---

## 2. 现有表复用

### 2.1 material_nutrition（原料营养成分表）

**无变更**，继续作为原料营养数据的存储。

| 字段 | 类型 | 说明 |
|------|------|------|
| nutrition_id | TEXT PK | 营养记录ID |
| material_id | TEXT NOT NULL | 关联原料ID |
| per_100g_json | TEXT NOT NULL | 每100g营养数据(JSON) |
| data_version | TEXT DEFAULT '1.0' | 数据版本 |
| data_source | TEXT | 数据来源 |
| notes | TEXT | 备注 |
| confidence | TEXT DEFAULT 'medium' | 置信度 |
| last_updated | TEXT | 最后更新时间 |
| material_version | INTEGER DEFAULT 1 | 原料版本号 |
| is_latest | INTEGER DEFAULT 1 | 是否最新版本 |

**查询优化**：分析时仅查询 `is_latest = 1` 的记录。

### 2.2 formula_nutrition_summaries（配方营养汇总表）

**无变更**，继续存储分析结果汇总。

| 字段 | 类型 | 说明 |
|------|------|------|
| summary_id | TEXT PK | 汇总ID |
| formula_id | TEXT NOT NULL | 配方ID |
| version_id | TEXT | 版本ID |
| total_weight | REAL DEFAULT 0 | 总重量 |
| total_nutrition_json | TEXT NOT NULL | 总营养数据(JSON) |
| per_100g_nutrition_json | TEXT NOT NULL | 每100g营养数据(JSON) |
| material_breakdown_json | TEXT | 原料明细(JSON) |
| calculated_by | TEXT NOT NULL | 计算人 |
| calculated_at | TEXT | 计算时间 |

**扩展 JSON 格式**：`per_100g_nutrition_json` 和 `material_breakdown_json` 的 JSON 内容将包含新增的分析字段（claims、fortificationChecks、coverage），但表结构不变。

### 2.3 nutrition_profiles（营养标准/档案表）

**无变更**，保留现有功能。新增的 GB 28050/14880 标准以代码常量形式内置，不写入此表。

### 2.4 formulas（配方表）

**无变更**，通过 `materials_json` 获取原料组成。

关键字段：
- `materials_json`：原料组成（JSON数组）
- `finished_weight`：成品重量
- `ratio_factor`：药材含量比因子
- `supplement_ratio_factor`：辅料含量比因子

### 2.5 materials（原料表）

**无变更**，通过 `material_type` 区分药材/辅料。

关键字段：
- `material_type`：`herb`（药材）或 `supplement`（辅料）
- `unit_price`：单价

---

## 3. 常量数据设计

### 3.1 NRV 参考值（GB 28050 附录A）

以代码常量形式存储在 `nutritionConstants.ts` 中，不建表：

```typescript
export const NRV_REFERENCE: Record<string, number> = {
  energy: 8400,        // kJ
  protein: 60,         // g
  fat: 60,             // g
  saturatedFat: 20,    // g
  cholesterol: 300,    // mg
  carbohydrate: 300,   // g
  fiber: 25,           // g
  sodium: 2000,        // mg
  potassium: 2000,     // mg
  calcium: 800,        // mg
  phosphorus: 700,     // mg
  magnesium: 300,      // mg
  iron: 15,            // mg
  zinc: 15,            // mg
  vitaminA: 800,       // μg RE
  vitaminD: 5,         // μg
  vitaminE: 14,        // mg α-TE
  vitaminK: 80,        // μg
  vitaminB1: 1.4,      // mg
  vitaminB2: 1.4,      // mg
  vitaminB3: 14,       // mg
  vitaminB6: 1.4,      // mg
  vitaminB12: 2.4,     // μg
  vitaminC: 100,       // mg
  folate: 400,         // μg DFE
}
```

### 3.2 0界限值（GB 28050 表1）

```typescript
export const ZERO_THRESHOLD: Record<string, number> = {
  energy: 17,          // kJ
  protein: 0.5,        // g
  fat: 0.5,            // g
  carbohydrate: 0.5,   // g
  sugars: 0.5,         // g
  sodium: 5,           // mg
  cholesterol: 5,      // mg
  fiber: 0.5,          // g
}
```

### 3.3 含量声称条件（GB 28050 附录C.1）

```typescript
export const CONTENT_CLAIMS: ContentClaimRule[] = [
  { claim: "低能量", field: "energy", operator: "<=", threshold: 170, unit: "kJ", standard: "GB 28050 C.1" },
  { claim: "低脂肪", field: "fat", operator: "<=", threshold: 3, unit: "g", standard: "GB 28050 C.1" },
  { claim: "低饱和脂肪", field: "saturatedFat", operator: "<=", threshold: 1.5, unit: "g", standard: "GB 28050 C.1" },
  { claim: "无反式脂肪", field: "transFat", operator: "<=", threshold: 0.3, unit: "g", standard: "GB 28050 C.1" },
  { claim: "低胆固醇", field: "cholesterol", operator: "<=", threshold: 20, unit: "mg", standard: "GB 28050 C.1" },
  { claim: "低糖", field: "sugars", operator: "<=", threshold: 5, unit: "g", standard: "GB 28050 C.1" },
  { claim: "低钠", field: "sodium", operator: "<=", threshold: 120, unit: "mg", standard: "GB 28050 C.1" },
  { claim: "蛋白质来源", field: "protein", operator: ">=", threshold: 6, unit: "g", standard: "GB 28050 C.1" },
  { claim: "高蛋白质", field: "protein", operator: ">=", threshold: 12, unit: "g", standard: "GB 28050 C.1" },
  { claim: "钙来源", field: "calcium", operator: ">=", threshold: 120, unit: "mg", standard: "GB 28050 C.1" },
  { claim: "高钙", field: "calcium", operator: ">=", threshold: 240, unit: "mg", standard: "GB 28050 C.1" },
  { claim: "铁来源", field: "iron", operator: ">=", threshold: 2.25, unit: "mg", standard: "GB 28050 C.1" },
  { claim: "膳食纤维来源", field: "fiber", operator: ">=", threshold: 2.5, unit: "g", standard: "GB 28050 C.1" },
  { claim: "高膳食纤维", field: "fiber", operator: ">=", threshold: 5, unit: "g", standard: "GB 28050 C.1" },
  { claim: "维生素C来源", field: "vitaminC", operator: ">=", threshold: 15, unit: "mg", standard: "GB 28050 C.1" },
  { claim: "高维生素C", field: "vitaminC", operator: ">=", threshold: 30, unit: "mg", standard: "GB 28050 C.1" },
]
```

### 3.4 强化剂使用量范围（GB 14880 附录A，固体饮料类 14.06）

```typescript
export const FORTIFICATION_LIMITS: FortificationLimit[] = [
  { nutrient: "vitaminA", label: "维生素A", minPerKg: 4000, maxPerKg: 17000, unit: "μg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminD", label: "维生素D", minPerKg: 10, maxPerKg: 20, unit: "μg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminE", label: "维生素E", minPerKg: 76, maxPerKg: 180, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminB1", label: "维生素B1", minPerKg: 9, maxPerKg: 22, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminB2", label: "维生素B2", minPerKg: 9, maxPerKg: 22, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminB6", label: "维生素B6", minPerKg: 7, maxPerKg: 22, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminB12", label: "维生素B12", minPerKg: 10, maxPerKg: 66, unit: "μg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminC", label: "维生素C", minPerKg: 1000, maxPerKg: 2250, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "vitaminB3", label: "烟酸", minPerKg: 110, maxPerKg: 330, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "folate", label: "叶酸", minPerKg: 600, maxPerKg: 6000, unit: "μg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "calcium", label: "钙", minPerKg: 2500, maxPerKg: 10000, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "iron", label: "铁", minPerKg: 95, maxPerKg: 220, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
  { nutrient: "zinc", label: "锌", minPerKg: 110, maxPerKg: 220, unit: "mg/kg", foodCategory: "14.06 固体饮料类" },
]
```

### 3.5 营养素元数据

```typescript
export const NUTRIENT_META: Record<string, NutrientMeta> = {
  energy:        { label: "能量",       unit: "kJ",  isCore: true,  order: 1 },
  protein:       { label: "蛋白质",     unit: "g",   isCore: true,  order: 2 },
  fat:           { label: "脂肪",       unit: "g",   isCore: true,  order: 3 },
  saturatedFat:  { label: "饱和脂肪",   unit: "g",   isCore: false, order: 4 },
  transFat:      { label: "反式脂肪",   unit: "g",   isCore: false, order: 5 },
  cholesterol:   { label: "胆固醇",     unit: "mg",  isCore: false, order: 6 },
  carbohydrate:  { label: "碳水化合物", unit: "g",   isCore: true,  order: 7 },
  sugars:        { label: "糖",         unit: "g",   isCore: false, order: 8 },
  fiber:         { label: "膳食纤维",   unit: "g",   isCore: false, order: 9 },
  sodium:        { label: "钠",         unit: "mg",  isCore: true,  order: 10 },
  calcium:       { label: "钙",         unit: "mg",  isCore: false, order: 11 },
  iron:          { label: "铁",         unit: "mg",  isCore: false, order: 12 },
  zinc:          { label: "锌",         unit: "mg",  isCore: false, order: 13 },
  potassium:     { label: "钾",         unit: "mg",  isCore: false, order: 14 },
  vitaminA:      { label: "维生素A",    unit: "μg",  isCore: false, order: 15 },
  vitaminD:      { label: "维生素D",    unit: "μg",  isCore: false, order: 16 },
  vitaminE:      { label: "维生素E",    unit: "mg",  isCore: false, order: 17 },
  vitaminB1:     { label: "维生素B1",   unit: "mg",  isCore: false, order: 18 },
  vitaminB2:     { label: "维生素B2",   unit: "mg",  isCore: false, order: 19 },
  vitaminB3:     { label: "烟酸",       unit: "mg",  isCore: false, order: 20 },
  vitaminB6:     { label: "维生素B6",   unit: "mg",  isCore: false, order: 21 },
  vitaminB12:    { label: "维生素B12",  unit: "μg",  isCore: false, order: 22 },
  vitaminC:      { label: "维生素C",    unit: "mg",  isCore: false, order: 23 },
  folate:        { label: "叶酸",       unit: "μg",  isCore: false, order: 24 },
  phosphorus:    { label: "磷",         unit: "mg",  isCore: false, order: 25 },
  magnesium:     { label: "镁",         unit: "mg",  isCore: false, order: 26 },
}
```

---

## 4. 查询变更

### 4.1 分析查询流程

```sql
-- 1. 获取配方信息
SELECT id, name, materials_json, finished_weight, ratio_factor, supplement_ratio_factor, created_by
FROM formulas WHERE id = ?

-- 2. 批量获取原料营养数据（仅最新版本）
SELECT mn.material_id, mn.per_100g_json, mn.confidence
FROM material_nutrition mn
WHERE mn.material_id IN (?, ?, ...)
  AND mn.is_latest = 1

-- 3. 获取原料类型信息
SELECT id, name, material_type
FROM materials WHERE id IN (?, ?, ...)

-- 4. 保存分析汇总（可选，用户触发保存时）
INSERT INTO formula_nutrition_summaries (summary_id, formula_id, total_weight, total_nutrition_json, per_100g_nutrition_json, material_breakdown_json, calculated_by, calculated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

### 4.2 数据覆盖度查询

```sql
-- 获取配方中有营养数据的原料数
SELECT COUNT(DISTINCT mn.material_id) as with_nutrition
FROM material_nutrition mn
WHERE mn.material_id IN (?, ?, ...)
  AND mn.is_latest = 1
```

---

## 5. 数据一致性保障

### 5.1 计算结果缓存

- 分析结果通过 `formula_nutrition_summaries` 表缓存
- 缓存失效条件：配方原料变更、原料营养数据更新、ratio_factor 调整
- 每次分析前检查缓存是否有效，无效则重新计算

### 5.2 数据隔离

- formulist 用户仅能查询自己创建的配方（`created_by = userId`）
- admin 用户可查询所有配方
- 通过 SQL WHERE 条件实现，不依赖应用层过滤
