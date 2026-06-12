# 种子营养数据维护说明

## 目录结构

```
nutrition-seeds/
├── 原料营养数据源.xlsx          ← 自有经验证数据（在此维护，C层）
├── juhe-food-nutrition.csv      ← 聚合数据CSV（下载后放入，A层，可选）
├── sync-seed-data.cjs           ← 同步脚本（勿手动编辑）
├── cnfct-official.json          ← A层输出（自动生成，勿手动编辑）
├── herb-estimated.json          ← C层输出（自动生成，勿手动编辑）
├── alias-map.json               ← 别名映射
└── README.md                    ← 本文件
```

## 数据分层与优先级

| 层级 | 文件 | 来源 | 可信度 | 优先级 | 说明 |
|------|------|------|--------|--------|------|
| **C层** | `herb-estimated.json` | Excel 经验证数据 | medium | **最高** | 自有经验证的药材/辅料数据，优先使用 |
| **A层** | `cnfct-official.json` | 聚合数据/《中国食物成分表》 | high | 次之 | 权威文献数据，C层没有时使用 |
| **B层** | 天行API（运行时） | 天行API实时查询 | medium | 最低 | 前两层都没有时，运行时调用API兜底 |

**优先级规则**：C层 > A层 > B层

- 同名原料时，**C层（Excel）数据完全覆盖A层（聚合数据）**，确保自有经验证数据优先
- A层只包含 C层中没有的原料，避免重复
- B层（天行API）在运行时按需调用，不作为种子数据文件存储

### 运行时补全流程

用户点击"从种子库填充"时：

```
1. 查 C 层（herb-estimated.json）→ 命中则返回（标记为"经验证数据"）
2. 未命中 → 查 A 层（cnfct-official.json）→ 命中则返回（标记为"《中国食物成分表》"）
3. 未命中 → 调天行API实时查询 → 命中则返回（标记为"天行API"）
4. 都未命中 → 提示"无可用种子数据，请手动录入"
```

## 数据源

### 数据源1：自有 Excel（C层，必选）

`原料营养数据源.xlsx` — 自有经验证数据，优先级最高。

Excel 包含以下列（29列）：

#### 基础字段

| 列名 | 说明 | 示例 | 必填 |
|------|------|------|------|
| 原料名称 | 原料标准名称 | 黄芪 | 是 |
| 类型 | 药材 或 辅料 | 药材 | 是 |

#### 27种营养素（与系统 nutritionHelpers.ts 一致）

| 列名 | JSON字段 | 单位 | 说明 |
|------|---------|------|------|
| 能量(kJ/100g) | energy | kJ | 如为空且有三大营养素，自动计算 |
| 蛋白质(g/100g) | protein | g | |
| 脂肪(g/100g) | fat | g | |
| 碳水化合物(g/100g) | carbohydrate | g | |
| 膳食纤维(g/100g) | fiber | g | |
| 糖(g/100g) | sugars | g | |
| 钠(mg/100g) | sodium | mg | |
| 钾(mg/100g) | potassium | mg | |
| 钙(mg/100g) | calcium | mg | |
| 铁(mg/100g) | iron | mg | |
| 锌(mg/100g) | zinc | mg | |
| 镁(mg/100g) | magnesium | mg | |
| 磷(mg/100g) | phosphorus | mg | |
| 维生素A(μg/100g) | vitaminA | μg | |
| 维生素C(mg/100g) | vitaminC | mg | |
| 维生素D(μg/100g) | vitaminD | μg | |
| 维生素E(mg/100g) | vitaminE | mg | |
| 维生素K(μg/100g) | vitaminK | μg | |
| 维生素B1(mg/100g) | vitaminB1 | mg | |
| 维生素B2(mg/100g) | vitaminB2 | mg | |
| 维生素B3(mg/100g) | vitaminB3 | mg | |
| 维生素B6(mg/100g) | vitaminB6 | mg | |
| 维生素B12(μg/100g) | vitaminB12 | μg | |
| 叶酸(μg/100g) | folate | μg | |
| 胆固醇(mg/100g) | cholesterol | mg | |
| 反式脂肪(g/100g) | transFat | g | |
| 饱和脂肪(g/100g) | saturatedFat | g | |

**注意事项**：
- 所有营养素列均为可选，空值留空即可
- 能量(kJ/100g)如留空，脚本会根据蛋白质×17 + 脂肪×37 + 碳水×17 自动计算
- 如需拓展新的营养素，需同步修改 `sync-seed-data.cjs` 中的 `EXCEL_COLUMNS` 和 `nutritionHelpers.ts` 中的 `NUTRIENT_KEY_MAP`

### 数据源2：聚合数据 CSV（A层，可选，推荐）

从 [聚合数据-食物营养成分表](https://www.juhe.cn/market/product/id/11087) 免费下载。

- 注册登录后，选择 CSV 格式下载
- 下载后重命名为 `juhe-food-nutrition.csv`，放入本目录
- 聚合数据包含 1346+ 条食物营养数据，来源为中国疾病预防控制中心营养与健康所 & 中国营养学会
- 导入后全部归入 A 层，作为 C 层数据的补充

聚合数据 CSV 字段与项目字段的映射关系：

| 聚合数据字段 | 项目种子字段 | 单位 | 说明 |
|-------------|-------------|------|------|
| food_name | aliases[0] | — | 食物名称 |
| alias_name | aliases[1..n] | — | 别名（逗号分隔） |
| energy | per100g.energy | kJ | 能量 |
| protein | per100g.protein | g | 蛋白质 |
| fat | per100g.fat | g | 脂肪 |
| carbohydrate | per100g.carbohydrate | g | 碳水化合物 |
| dietary_fiber | per100g.fiber | g | 膳食纤维 |
| sodium | per100g.sodium | mg | 钠 |
| potassium | per100g.potassium | mg | 钾 |
| calcium | per100g.calcium | mg | 钙 |
| iron | per100g.iron | mg | 铁 |
| zinc | per100g.zinc | mg | 锌 |
| vitamin_a | per100g.vitaminA | μg | 维生素A |
| vitamin_c | per100g.vitaminC | mg | 维生素C |
| vitamin_e | per100g.vitaminE | mg | 维生素E |
| thiamin | per100g.vitaminB1 | mg | 硫胺素(B1) |
| riboflavin | per100g.vitaminB2 | mg | 核黄素(B2) |
| niacin | per100g.vitaminB3 | mg | 烟酸(B3) |

聚合数据特殊值说明：
- `"—"` 表示未检测 → 脚本自动跳过该字段
- `"Tr"` 表示未检出 → 脚本自动跳过该字段
- `"un"` 表示不能得出结果 → 脚本自动跳过该字段
- 字段值带单位后缀（如 `"1497kJ"`、`"11.2g"`、`"0.28mg"`）→ 脚本自动剥离单位

## 维护步骤

### 1. 编辑数据源

- **编辑 Excel**：打开 `原料营养数据源.xlsx`，增删改原料及营养数据。所有27种营养素列均可填写，空值留空。
- **（可选）更新聚合数据**：从聚合数据下载最新 CSV，替换 `juhe-food-nutrition.csv`

### 2. 运行同步

```bash
cd backend
npm run sync-seeds
```

高级用法：

```bash
# 仅从聚合数据CSV生成（不读取Excel）
node src/data/nutrition-seeds/sync-seed-data.cjs --juhe-only

# 指定其他 Excel 文件
node src/data/nutrition-seeds/sync-seed-data.cjs --excel 其他文件.xlsx

# 指定其他聚合数据CSV文件
node src/data/nutrition-seeds/sync-seed-data.cjs --juhe 其他CSV.csv
```

### 3. 重启后端

新数据在重启后端服务后生效。

## 同步脚本逻辑

1. **读取聚合数据 CSV**（如存在）→ 暂存为 A 层候选
2. **读取 Excel** → 解析全部27种营养素，构建 C 层数据
3. **优先级处理**：
   - Excel 中存在的原料 → 归入 C 层（优先级最高）
   - 聚合数据中 Excel 没有的原料 → 归入 A 层（次优先级）
   - 两个数据源都没有但 JSON 中已有的条目 → 保留原数据
4. **能量自动计算**：Excel 中能量为空但有三大营养素时，按 `蛋白质×17 + 脂肪×37 + 碳水×17` 自动计算
5. **别名保留**：Excel 中没有别名列，别名从现有 JSON 中继承；聚合数据自动解析别名

## 运行时适配层

种子数据在运行时通过 `SeedDataAdapter`（位于 `backend/src/services/externalNutrition/adapters/NutritionAdapters.ts`）加载和使用：

- 启动时加载 `cnfct-official.json`（A层）和 `herb-estimated.json`（C层）到内存
- 搜索时先查 C 层，再查 A 层
- 搜索结果携带 `layer` 字段（"A"/"C"），前端据此展示层级标签
- A 层标记为 `confidence: "high"`，显示绿色"权威"标签
- C 层标记为 `confidence: "medium"`，显示橙色"经验证"标签

## 注意事项

- **不要手动编辑** `cnfct-official.json` 和 `herb-estimated.json`，所有修改通过数据源 + 同步脚本完成
- Excel 中新增原料时，别名信息不会自动生成，需在同步后手动补充到 JSON 中（后续可优化脚本支持 Excel 别名列）
- 聚合数据无"药材/辅料"类型字段，默认归为药材；如需修改类型，在 Excel 中添加同名原料并设置类型，同步后 Excel 数据会覆盖
- 聚合数据 CSV 必须为 UTF-8 编码，无 BOM
- `yao-shi-tong-yuan-seed.json` 为旧文件，已废弃，可删除

## 常见问题

**Q: Excel 中某些营养素列留空会怎样？**
A: 留空的列在生成的 JSON 中不会出现该字段，运行时按无数据处理。

**Q: Excel 和聚合数据中有同名原料，以哪个为准？**
A: Excel（C层）优先。同名原料时，Excel 数据完全覆盖聚合数据。

**Q: 如何新增一种营养素？**
A: 三步：1）在 Excel 中新增列；2）在 `sync-seed-data.cjs` 的 `EXCEL_COLUMNS` 中添加映射；3）在 `nutritionHelpers.ts` 的 `NUTRIENT_KEY_MAP` 中添加映射。

**Q: 聚合数据 CSV 下载后乱码怎么办？**
A: 确保下载的是 UTF-8 编码的 CSV。脚本使用 `fs.readFileSync(path, "utf-8")` 直接读取，不使用 XLSX 库解析 CSV，避免编码问题。
