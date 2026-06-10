# 种子营养数据维护说明

## 目录结构

```
nutrition-seeds/
├── 原料营养数据源.xlsx          ← 自有经验证数据（在此维护）
├── juhe-food-nutrition.csv      ← 聚合数据CSV（下载后放入，可选）
├── sync-seed-data.cjs           ← 同步脚本（勿手动编辑）
├── cnfct-official.json          ← A层输出（自动生成，勿手动编辑）
├── herb-estimated.json          ← C层输出（自动生成，勿手动编辑）
├── alias-map.json               ← 别名映射
└── README.md                    ← 本文件
```

## 数据分层

| 层级 | 文件 | 来源 | 可信度 | 说明 |
|------|------|------|--------|------|
| A层 | `cnfct-official.json` | 《中国食物成分表》/ 聚合数据 | high | 常见食物，权威文献可查 |
| C层 | `herb-estimated.json` | 经验证数据 / 参考估算 | medium / low | 药材及加工品 |

## 数据源

### 数据源1：自有 Excel（必选）

`原料营养数据源.xlsx` — 自有经验证数据，是 C 层的主要来源。

Excel 必须包含以下列：

| 列名 | 说明 | 示例 |
|------|------|------|
| 原料名称 | 原料标准名称 | 黄芪 |
| 类型 | 药材 或 辅料 | 药材 |
| 蛋白质(g/100g) | 蛋白质含量 | 14.9 |
| 脂肪(g/100g) | 脂肪含量 | 1.1 |
| 碳水化合物(g/100g) | 碳水化合物含量 | 33.4 |
| 钠(mg/100g) | 钠含量 | 0 |

### 数据源2：聚合数据 CSV（可选，推荐）

从 [聚合数据-食物营养成分表](https://www.juhe.cn/market/product/id/11087) 免费下载。

- 注册登录后，选择 CSV 格式下载
- 下载后重命名为 `juhe-food-nutrition.csv`，放入本目录
- 聚合数据包含 1614 条食物营养数据，来源为中国疾病预防控制中心营养与健康所 & 中国营养学会
- 导入后全部归入 A 层（权威来源），可大幅扩充种子库覆盖范围

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

## 维护步骤

### 1. 编辑数据源

- 编辑 `原料营养数据源.xlsx`，增删改自有经验证数据
- （可选）从聚合数据下载最新 CSV，替换 `juhe-food-nutrition.csv`

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

1. 读取聚合数据 CSV（如存在）→ 全部归入 A 层
2. 读取 Excel → A 层名单内的归入 A 层，其余归入 C 层
3. Excel 的 4 项基础营养素（蛋白质、脂肪、碳水化合物、钠）覆盖写入 JSON
4. 能量按 `蛋白质×17 + 脂肪×37 + 碳水×17` 自动计算
5. 现有 JSON 中的额外营养素（钙、铁、锌、维生素等）**保留不丢失**
6. 两个数据源都没有但 JSON 中已有的条目**保留原数据**

## A层名单

以下原料归入A层（权威来源），其余自动归入C层：

山药、枸杞、枸杞子、红枣、大枣、薏苡仁、薏米、百合、莲子、蜂蜜、银耳、昆布、海带、鲜藕、藕、葛根、山楂、麦芽、芡实、佛手、桑椹、马齿苋、赤小豆、红小豆、小麦、纳豆

如需调整A层名单，编辑 `sync-seed-data.cjs` 中的 `A_LAYER_NAMES` 变量。

## 注意事项

- **不要手动编辑** `cnfct-official.json` 和 `herb-estimated.json`，所有修改通过数据源 + 同步脚本完成
- Excel 中新增原料时，别名信息不会自动生成，需在同步后手动补充到 JSON 中（后续可优化脚本支持 Excel 别名列）
- 聚合数据无"药材/辅料"类型字段，默认归为药材；如需修改类型，在 Excel 中添加同名原料并设置类型，同步后 Excel 数据会覆盖
- `yao-shi-tong-yuan-seed.json` 为旧文件，已废弃，可删除
