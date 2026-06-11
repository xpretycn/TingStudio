/**
 * 种子数据同步脚本
 *
 * 支持两种数据源：
 *   1. Excel 源文件（原料营养数据源.xlsx）— 自有经验证数据（C层，优先级最高）
 *   2. 聚合数据 CSV（juhe-food-nutrition.csv）— 权威文献数据（A层，次优先级）
 *
 * 数据优先级：C层(Excel) > A层(聚合数据) > B层(天行API)
 * 同名原料时，Excel 数据覆盖聚合数据。
 *
 * 用法：
 *   npm run sync-seeds                                    # 默认：Excel + 聚合数据CSV（如存在）
 *   node sync-seed-data.cjs --juhe-only                   # 仅从聚合数据CSV生成
 *   node sync-seed-data.cjs --excel 其他文件.xlsx           # 指定 Excel 文件
 *   node sync-seed-data.cjs --juhe 其他CSV.csv             # 指定聚合数据CSV文件
 *
 * 输出：
 *   - cnfct-official.json  （A层：权威来源，来自聚合数据）
 *   - herb-estimated.json  （C层：经验证数据，来自Excel）
 *
 * 维护流程：
 *   1. 编辑「原料营养数据源.xlsx」，增删改自有经验证数据
 *   2. （可选）从聚合数据下载 CSV → 放入本目录，命名为 juhe-food-nutrition.csv
 *   3. 运行本脚本：npm run sync-seeds
 *   4. 重启后端服务，新数据即生效
 */

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// ============================================================
// Excel 列名映射（全部27种营养素 + 基础字段）
// ============================================================
const EXCEL_COLUMNS = {
  name: "原料名称",
  type: "类型",
  // 27种营养素（与 nutritionHelpers.ts 一致）
  energy: "能量(kJ/100g)",
  protein: "蛋白质(g/100g)",
  fat: "脂肪(g/100g)",
  carbohydrate: "碳水化合物(g/100g)",
  fiber: "膳食纤维(g/100g)",
  sugars: "糖(g/100g)",
  sodium: "钠(mg/100g)",
  potassium: "钾(mg/100g)",
  calcium: "钙(mg/100g)",
  iron: "铁(mg/100g)",
  zinc: "锌(mg/100g)",
  magnesium: "镁(mg/100g)",
  phosphorus: "磷(mg/100g)",
  vitaminA: "维生素A(μg/100g)",
  vitaminC: "维生素C(mg/100g)",
  vitaminD: "维生素D(μg/100g)",
  vitaminE: "维生素E(mg/100g)",
  vitaminK: "维生素K(μg/100g)",
  vitaminB1: "维生素B1(mg/100g)",
  vitaminB2: "维生素B2(mg/100g)",
  vitaminB3: "维生素B3(mg/100g)",
  vitaminB6: "维生素B6(mg/100g)",
  vitaminB12: "维生素B12(μg/100g)",
  folate: "叶酸(μg/100g)",
  cholesterol: "胆固醇(mg/100g)",
  transFat: "反式脂肪(g/100g)",
  saturatedFat: "饱和脂肪(g/100g)",
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

// ============================================================
// 工具函数
// ============================================================

/**
 * 从 Excel 行读取数值（空字符串返回 undefined）
 */
function readExcelNumber(row, columnName) {
  const val = row[columnName];
  if (val === undefined || val === null || val === "") return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}

/**
 * 从 Excel 行构建 per100g 对象
 */
function buildPer100gFromExcel(row) {
  const per100g = {};
  for (const [field, columnName] of Object.entries(EXCEL_COLUMNS)) {
    if (field === "name" || field === "type") continue;
    const val = readExcelNumber(row, columnName);
    if (val !== undefined) {
      per100g[field] = val;
    }
  }
  // 如果能量为空但有三大营养素，自动计算能量
  if (per100g.energy == null) {
    const protein = per100g.protein ?? 0;
    const fat = per100g.fat ?? 0;
    const carbohydrate = per100g.carbohydrate ?? 0;
    if (protein > 0 || fat > 0 || carbohydrate > 0) {
      per100g.energy = Math.round((protein * 17 + fat * 37 + carbohydrate * 17) * 100) / 100;
    }
  }
  return per100g;
}

/**
 * 解析聚合数据 CSV 中的数值字段
 * 聚合数据中 "—" 表示未检测，"Tr" 表示未检出，"un" 表示不能得出结果
 * 字段值可能带单位后缀（如 "1497kJ"、"11.2g"、"0.28mg"），自动剥离
 */
function parseJuheNumber(value) {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  if (str === "" || str === "—" || str === "Tr" || str === "un" || str === "-") return undefined;
  // 剥离单位后缀：kJ, g, mg, μg
  const numStr = str.replace(/(kJ|kCal|kcal|g|mg|μg|µg|%|μgRAE)$/i, "").trim();
  const num = Number(numStr);
  return isNaN(num) ? undefined : num;
}

/**
 * 手动解析 CSV 行（支持引号包裹的字段）
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
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

if (!excelPath) excelPath = path.join(seedsDir, "原料营养数据源.xlsx");
if (!juhePath) juhePath = path.join(seedsDir, "juhe-food-nutrition.csv");

// ============================================================
// 1. 读取聚合数据 CSV（如果存在）
// ============================================================

let juheData = [];
const hasJuheCSV = fs.existsSync(juhePath);

if (hasJuheCSV) {
  console.log(`[1/5] 读取聚合数据 CSV: ${juhePath}`);
  const raw = fs.readFileSync(juhePath, "utf-8");
  const lines = raw.split("\n").filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  juheData = lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  }).filter(r => r.food_name);
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
// 优先级：C层(Excel) > A层(聚合数据) > B层(天行API)
// 同名原料时，Excel 数据覆盖聚合数据
// ============================================================

const layerA = [];
const layerC = [];
const processedNames = new Set(); // 避免重复

// 4.1 先处理 Excel 数据（C层，优先级最高）
const excelNames = new Set();
for (const row of excelData) {
  const name = String(row[EXCEL_COLUMNS.name] || "").trim();
  if (!name) continue;
  excelNames.add(name);

  const materialType = String(row[EXCEL_COLUMNS.type] || "").trim() === "辅料" ? "supplement" : "herb";
  const per100g = buildPer100gFromExcel(row);

  // 查找现有数据中的匹配条目（保留别名）
  const existingEntry = existingMap.get(name);
  const aliases = existingEntry ? existingEntry.aliases : [name];

  const entry = {
    aliases,
    per100g,
    source: "经验证数据",
    dataVersion: "1.0",
    confidence: "medium",
    layer: "C",
    materialType,
  };

  layerC.push(entry);
  processedNames.add(name);
  for (const a of aliases) processedNames.add(a);
}
if (excelData.length > 0) {
  console.log(`      Excel 数据（C层）: ${layerC.length} 条`);
}

// 4.2 再处理聚合数据（A层，次优先级）
// 只添加 Excel 中没有的原料
if (juheData.length > 0) {
  let juheAdded = 0;
  for (const row of juheData) {
    const name = String(row.food_name || "").trim();
    if (!name || processedNames.has(name)) continue;

    const aliases = buildAliasesFromJuhe(row);
    const per100g = buildPer100gFromJuhe(row);

    const entry = {
      aliases,
      per100g,
      source: "《中国食物成分表》（聚合数据）",
      dataVersion: "6.0",
      confidence: "high",
      layer: "A",
      materialType: "herb",
    };

    // 如果现有数据有 materialType，保留
    const existingEntry = existingMap.get(name);
    if (existingEntry && existingEntry.materialType) {
      entry.materialType = existingEntry.materialType;
    }

    layerA.push(entry);
    processedNames.add(name);
    for (const a of aliases) processedNames.add(a);
    juheAdded++;
  }
  console.log(`      聚合数据（A层）: ${juheAdded} 条（仅 Excel 中无对应数据的原料）`);
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
console.log(`      A 层（聚合数据）: ${layerA.length} 条`);
console.log(`      C 层（经验证数据）: ${layerC.length} 条` + (unmatched.length > 0 ? `（含 ${unmatched.length} 条无数据源条目）` : ""));

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
