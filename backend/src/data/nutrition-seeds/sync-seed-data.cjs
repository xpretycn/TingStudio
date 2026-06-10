/**
 * 种子数据同步脚本
 *
 * 支持两种数据源：
 *   1. Excel 源文件（原料营养数据源.xlsx）— 自有经验证数据
 *   2. 聚合数据 CSV（juhe-food-nutrition.csv）— 权威文献数据
 *
 * 用法：
 *   node sync-seed-data.cjs                              # 默认：Excel + 聚合数据CSV（如存在）
 *   node sync-seed-data.cjs --juhe-only                  # 仅从聚合数据CSV生成
 *   node sync-seed-data.cjs --excel 其他文件.xlsx          # 指定 Excel 文件
 *   node sync-seed-data.cjs --juhe 其他CSV.csv            # 指定聚合数据CSV文件
 *
 * 输出：
 *   - cnfct-official.json  （A层：权威来源，来自聚合数据）
 *   - herb-estimated.json  （C层：经验证数据 + 参考估算）
 *
 * 维护流程：
 *   1. 从聚合数据下载 CSV → 放入本目录，命名为 juhe-food-nutrition.csv
 *   2. 编辑「原料营养数据源.xlsx」，增删改自有经验证数据
 *   3. 运行本脚本：npm run sync-seeds
 *   4. 重启后端服务，新数据即生效
 */

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// ============================================================
// A 层名单：常见食物，数据来源为《中国食物成分表》
// 这些食物确实能在权威文献中查到，confidence=high
// ============================================================
const A_LAYER_NAMES = new Set([
  "山药", "枸杞", "枸杞子", "红枣", "大枣", "薏苡仁", "薏米",
  "百合", "莲子", "蜂蜜", "银耳", "昆布", "海带", "鲜藕", "藕",
  "葛根", "山楂", "麦芽", "芡实", "佛手", "桑椹", "马齿苋",
  "赤小豆", "红小豆", "小麦", "纳豆",
]);

// Excel 列名映射
const EXCEL_COLUMNS = {
  name: "原料名称",
  type: "类型",
  protein: "蛋白质(g/100g)",
  fat: "脂肪(g/100g)",
  carbohydrate: "碳水化合物(g/100g)",
  sodium: "钠(mg/100g)",
};

// 聚合数据 CSV 字段 → 项目种子字段映射
const JUHE_FIELD_MAP = {
  food_name: "food_name",
  alias_name: "alias_name",
  energy: "energy",
  protein: "protein",
  fat: "fat",
  carbohydrate: "carbohydrate",
  dietary_fiber: "fiber",
  cholesterol: "cholesterol",
  carotene: "carotene",
  vitamin_a: "vitaminA",
  vitamin_e: "vitaminE",
  thiamin: "vitaminB1",
  riboflavin: "vitaminB2",
  niacin: "vitaminB3",
  vitamin_c: "vitaminC",
  calcium: "calcium",
  phosphorus: "phosphorus",
  potassium: "potassium",
  sodium: "sodium",
  magnesium: "magnesium",
  iron: "iron",
  zinc: "zinc",
  selenium: "selenium",
  copper: "copper",
  manganese: "manganese",
  iodine: "iodine",
};

// 聚合数据中需要排除的分类（非食物类目）
const JUHE_EXCLUDE_CATEGORIES = new Set([
  "油脂类", "调味品", "饮料", "酒类", "糖蜜饯", "小吃甜饼",
]);

// ============================================================
// 工具函数
// ============================================================

/**
 * 解析聚合数据 CSV 中的数值字段
 * 聚合数据中 "—" 表示未检测，"Tr" 表示未检出，"un" 表示不能得出结果
 */
function parseJuheNumber(value) {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  if (str === "" || str === "—" || str === "Tr" || str === "un" || str === "-") return undefined;
  const num = Number(str);
  return isNaN(num) ? undefined : num;
}

/**
 * 从聚合数据行构建 per100g 对象
 */
function buildPer100gFromJuhe(row) {
  const per100g = {};
  for (const [csvField, jsonField] of Object.entries(JUHE_FIELD_MAP)) {
    if (csvField === "food_name" || csvField === "alias_name") continue;
    const val = parseJuheNumber(row[csvField]);
    if (val !== undefined) {
      per100g[jsonField] = val;
    }
  }
  return per100g;
}

/**
 * 从聚合数据行构建别名列表
 */
function buildAliasesFromJuhe(row) {
  const aliases = [String(row.food_name || "").trim()];
  const aliasStr = String(row.alias_name || "").trim();
  if (aliasStr && aliasStr !== "NULL") {
    // 聚合数据别名可能是逗号分隔的
    for (const a of aliasStr.split(/[,，、]/)) {
      const trimmed = a.trim();
      if (trimmed && !aliases.includes(trimmed)) {
        aliases.push(trimmed);
      }
    }
  }
  return aliases.filter(Boolean);
}

// ============================================================
// 解析命令行参数
// ============================================================

const args = process.argv.slice(2);
let excelPath = null;
let juhePath = null;
let juheOnly = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--excel" && args[i + 1]) {
    excelPath = args[++i];
  } else if (args[i] === "--juhe" && args[i + 1]) {
    juhePath = args[++i];
  } else if (args[i] === "--juhe-only") {
    juheOnly = true;
  }
}

const seedsDir = __dirname;

// 默认路径
if (!excelPath) excelPath = path.join(seedsDir, "原料营养数据源.xlsx");
if (!juhePath) juhePath = path.join(seedsDir, "juhe-food-nutrition.csv");

// ============================================================
// 1. 读取聚合数据 CSV（如果存在）
// ============================================================

let juheData = [];
const hasJuheCSV = fs.existsSync(juhePath);

if (hasJuheCSV) {
  console.log(`[1/5] 读取聚合数据 CSV: ${juhePath}`);
  const wb = XLSX.readFile(juhePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  juheData = XLSX.utils.sheet_to_json(ws, { defval: "" });
  console.log(`      共 ${juheData.length} 条聚合数据`);
} else {
  console.log("[1/5] 聚合数据 CSV 不存在，跳过（如需使用，请下载后命名为 juhe-food-nutrition.csv）");
}

// ============================================================
// 2. 读取 Excel 数据（如果存在）
// ============================================================

let excelData = [];
const hasExcel = !juheOnly && fs.existsSync(excelPath);

if (hasExcel) {
  console.log(`[2/5] 读取 Excel: ${excelPath}`);
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  excelData = XLSX.utils.sheet_to_json(ws, { defval: "" });
  console.log(`      共 ${excelData.length} 条 Excel 数据`);
} else if (!juheOnly) {
  console.log("[2/5] Excel 文件不存在，跳过");
} else {
  console.log("[2/5] --juhe-only 模式，跳过 Excel");
}

// ============================================================
// 3. 读取现有 JSON 数据（保留额外营养素字段）
// ============================================================

const cnfctPath = path.join(seedsDir, "cnfct-official.json");
const herbPath = path.join(seedsDir, "herb-estimated.json");
const existingA = JSON.parse(fs.readFileSync(cnfctPath, "utf-8"));
const existingC = JSON.parse(fs.readFileSync(herbPath, "utf-8"));

const existingMap = new Map();
for (const entry of [...existingA, ...existingC]) {
  for (const alias of entry.aliases) {
    existingMap.set(alias, entry);
  }
}

console.log("[3/5] 合并数据源...");

// ============================================================
// 4. 构建种子数据
// ============================================================

const layerA = [];
const layerC = [];
const processedNames = new Set(); // 避免重复

// 4.1 处理聚合数据（A层主要来源）
if (juheData.length > 0) {
  for (const row of juheData) {
    const name = String(row.food_name || "").trim();
    if (!name || processedNames.has(name)) continue;

    const aliases = buildAliasesFromJuhe(row);
    const per100g = buildPer100gFromJuhe(row);
    const isALayer = A_LAYER_NAMES.has(name) || aliases.some(a => A_LAYER_NAMES.has(a));

    // 查找现有数据中的匹配条目（保留额外营养素）
    const existingEntry = existingMap.get(name);

    const entry = {
      aliases,
      per100g,
      source: "《中国食物成分表》（聚合数据）",
      dataVersion: "6.0",
      confidence: isALayer ? "high" : "high",
      layer: isALayer ? "A" : "A",
      materialType: "herb", // 聚合数据无类型字段，默认药材
    };

    // 如果现有数据有 materialType，保留
    if (existingEntry && existingEntry.materialType) {
      entry.materialType = existingEntry.materialType;
    }

    processedNames.add(name);
    for (const a of aliases) processedNames.add(a);

    if (isALayer) {
      layerA.push(entry);
    } else {
      // 聚合数据全部是权威来源，归入A层
      layerA.push(entry);
    }
  }
  console.log(`      聚合数据贡献: ${layerA.length} 条 A 层数据`);
}

// 4.2 处理 Excel 数据（C层主要来源，覆盖聚合数据中的同名字段）
const excelNames = new Set();
for (const row of excelData) {
  const name = String(row[EXCEL_COLUMNS.name] || "").trim();
  if (!name) continue;
  excelNames.add(name);

  const materialType = String(row[EXCEL_COLUMNS.type] || "").trim() === "辅料" ? "supplement" : "herb";
  const excelNutrients = {
    protein: Number(row[EXCEL_COLUMNS.protein]) || 0,
    fat: Number(row[EXCEL_COLUMNS.fat]) || 0,
    carbohydrate: Number(row[EXCEL_COLUMNS.carbohydrate]) || 0,
    sodium: Number(row[EXCEL_COLUMNS.sodium]) || 0,
  };
  const energy = Number((excelNutrients.protein * 17 + excelNutrients.fat * 37 + excelNutrients.carbohydrate * 17).toFixed(1));

  // 查找现有数据中的匹配条目
  const existingEntry = existingMap.get(name);

  // 合并营养数据
  const per100g = {};
  if (existingEntry) {
    Object.assign(per100g, existingEntry.per100g);
  }
  // Excel 数据覆盖基础字段
  per100g.energy = energy;
  per100g.protein = excelNutrients.protein;
  per100g.fat = excelNutrients.fat;
  per100g.carbohydrate = excelNutrients.carbohydrate;
  per100g.sodium = excelNutrients.sodium;

  const aliases = existingEntry ? existingEntry.aliases : [name];

  const isALayer = A_LAYER_NAMES.has(name) || aliases.some(a => A_LAYER_NAMES.has(a));

  const entry = {
    aliases,
    per100g,
    source: isALayer ? "《中国食物成分表》" : "经验证数据",
    dataVersion: isALayer ? "6.0" : "1.0",
    confidence: isALayer ? "high" : "medium",
    layer: isALayer ? "A" : "C",
    materialType,
  };

  if (isALayer) {
    layerA.push(entry);
  } else {
    layerC.push(entry);
  }
  processedNames.add(name);
  for (const a of aliases) processedNames.add(a);
}
if (excelData.length > 0) {
  console.log(`      Excel 数据贡献: ${layerC.length} 条 C 层数据`);
}

// 4.3 保留 JSON 中有但两个数据源都没有的条目
const unmatched = [];
for (const entry of existingC) {
  const mainName = entry.aliases[0];
  if (!processedNames.has(mainName)) {
    layerC.push(entry);
    unmatched.push(mainName);
    processedNames.add(mainName);
  }
}

// 4.4 保留现有A层中聚合数据没有的条目
for (const entry of existingA) {
  const mainName = entry.aliases[0];
  if (!processedNames.has(mainName)) {
    layerA.push(entry);
    processedNames.add(mainName);
  }
}

// ============================================================
// 5. 写入文件
// ============================================================

console.log("[4/5] 生成种子数据文件...");
console.log(`      A 层（权威来源）: ${layerA.length} 条`);
console.log(`      C 层（经验证/估算）: ${layerC.length} 条` + (unmatched.length > 0 ? `（含 ${unmatched.length} 条无数据源条目）` : ""));

fs.writeFileSync(cnfctPath, JSON.stringify(layerA, null, 2), "utf-8");
fs.writeFileSync(herbPath, JSON.stringify(layerC, null, 2), "utf-8");

console.log("[5/5] 完成！");
console.log(`      ${cnfctPath}`);
console.log(`      ${herbPath}`);
if (unmatched.length > 0) {
  console.log(`      未在数据源中找到的条目（保留原数据）: ${unmatched.join(", ")}`);
}
if (!hasJuheCSV) {
  console.log(`\n提示: 如需导入聚合数据，请访问 https://www.juhe.cn/market/product/id/11087`);
  console.log(`      下载 CSV 后命名为 juhe-food-nutrition.csv 放入 ${seedsDir}`);
}
console.log(`\n请重启后端服务使新数据生效。`);
