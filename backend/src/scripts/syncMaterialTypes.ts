import XLSX from "xlsx";
import path from "path";

const TEST_DIR = path.join("..", "test");
const SUMMARY_PATH = path.join(TEST_DIR, "原料营养汇总_输出.xlsx");
const DB_EXCEL_PATH = path.join(TEST_DIR, "原料数据库导入_完整版_已清理.xlsx");

console.log("=== 对比并更新Excel数据 ===\n");

// 1. 读取营养汇总文件
console.log("📄 读取 原料营养汇总_输出.xlsx...");
const summaryWb = XLSX.readFile(SUMMARY_PATH);
const summarySheetName = summaryWb.SheetNames[0];
const summaryData: any[] = XLSX.utils.sheet_to_json(summaryWb.Sheets[summarySheetName]);
console.log(`   记录数: ${summaryData.length}`);
if (summaryData.length > 0) {
  console.log(`   列名: ${Object.keys(summaryData[0]).join(", ")}`);
}

// 2. 读取数据库导入文件
console.log("\n📄 读取 原料数据库导入_完整版_已清理.xlsx...");
const dbWb = XLSX.readFile(DB_EXCEL_PATH);
const dbSheetName = dbWb.SheetNames[0];
const dbData: any[] = XLSX.utils.sheet_to_json(dbWb.Sheets[dbSheetName]);
console.log(`   记录数: ${dbData.length}`);
if (dbData.length > 0) {
  console.log(`   列名: ${Object.keys(dbData[0]).join(", ")}`);
}

// 3. 显示汇总文件的类型数据
console.log("\n=== 汇总文件数据预览 ===\n");
for (let i = 0; i < Math.min(5, summaryData.length); i++) {
  const r = summaryData[i];
  console.log(
    `   ${i + 1}. ${r["原料名称"]} | 类型:${r["原料类型"]} | 蛋白质:${r["蛋白质(g/100g)"]} | 脂肪:${r["脂肪(g/100g)"]} | 碳水:${r["碳水化合物(g/100g)"]} | 钠:${r["钠(mg/100g)"]}`,
  );
}

// 4. 建立名称到类型的映射
const typeMap: Record<string, { type: string; protein?: number; fat?: number; carb?: number; sodium?: number }> = {};
for (const row of summaryData) {
  const name = String(row["原料名称"] || "").trim();
  if (!name) continue;

  const type = String(row["原料类型"] || "").trim();
  const protein = parseFloat(row["蛋白质(g/100g)"]);
  const fat = parseFloat(row["脂肪(g/100g)"]);
  const carb = parseFloat(row["碳水化合物(g/100g)"]);
  const sodium = parseFloat(row["钠(mg/100g)"]);

  typeMap[name] = {
    type,
    protein: isNaN(protein) ? undefined : protein,
    fat: isNaN(fat) ? undefined : fat,
    carb: isNaN(carb) ? undefined : carb,
    sodium: isNaN(sodium) ? undefined : sodium,
  };
}

console.log(`\n类型映射数量: ${Object.keys(typeMap).length}`);

// 统计类型
const typeStats: Record<string, number> = {};
for (const [, v] of Object.entries(typeMap)) {
  if (v.type) {
    typeStats[v.type] = (typeStats[v.type] || 0) + 1;
  }
}
console.log("类型分布:", typeStats);

// 5. 更新数据库Excel
console.log("\n=== 更新数据库Excel ===\n");
let updatedType = 0;
let updatedNutrition = 0;
let matchedCount = 0;

for (const dbRow of dbData) {
  const dbName = String(dbRow["原料名称"] || "").trim();
  if (!dbName) continue;

  // 在映射中查找（精确匹配或包含匹配）
  let matchedKey = "";
  if (typeMap[dbName]) {
    matchedKey = dbName;
  } else {
    // 尝试包含匹配
    for (const key of Object.keys(typeMap)) {
      if (dbName.includes(key) || key.includes(dbName)) {
        matchedKey = key;
        break;
      }
    }
  }

  if (matchedKey) {
    matchedCount++;
    const source = typeMap[matchedKey];

    // 更新类型
    if (source.type && source.type !== "") {
      dbRow["分类"] = source.type;
      dbRow["类型"] = source.type; // 同时更新类型列
      updatedType++;
    }

    // 更新营养数据
    if (source.protein !== undefined) {
      dbRow["蛋白质"] = source.protein;
      updatedNutrition++;
    }
    if (source.fat !== undefined) {
      dbRow["脂肪"] = source.fat;
      updatedNutrition++;
    }
    if (source.carb !== undefined) {
      dbRow["碳水化合物"] = source.carb;
      updatedNutrition++;
    }
    if (source.sodium !== undefined) {
      dbRow["钠"] = source.sodium;
      updatedNutrition++;
    }
  }
}

console.log(`匹配记录: ${matchedCount}/${dbData.length}`);
console.log(`更新分类: ${updatedType} 条`);
console.log(`更新营养字段: ${updatedNutrition} 处`);

// 6. 输出更新后的Excel
const newWb = XLSX.utils.book_new();
const newSheet = XLSX.utils.json_to_sheet(dbData);
XLSX.utils.book_append_sheet(newWb, newSheet, "原料数据");
XLSX.writeFile(newWb, DB_EXCEL_PATH);

console.log(`\n✅ Excel已更新: ${DB_EXCEL_PATH}`);

// 7. 显示部分更新后的数据
console.log("\n📋 更新后的数据（前15条）:");
for (let i = 0; i < Math.min(15, dbData.length); i++) {
  const r = dbData[i];
  console.log(
    `   ${i + 1}. ${r["原料名称"]?.toString().padEnd(10)} | 分类:${String(r["分类"] || r["类型"] || "-").padEnd(8)} | 蛋白质:${r["蛋白质"]} | 脂肪:${r["脂肪"]} | 碳水:${r["碳水化合物"]} | 钠:${r["钠"]}`,
  );
}

console.log("\n=== 完成 ===");
