import XLSX from "xlsx";
import { getDb, connectDatabase } from "../backend/src/config/database-better-sqlite3.js";
import { generateId, now } from "../backend/src/utils/helpers.js";

connectDatabase();
const db = getDb();

const wb = XLSX.readFile("./test/原料数据库导入_完整版_已清理.xlsx");
const ws = wb.Sheets["原料数据"];
const excelData = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
const headers = excelData[0] as string[];

const nameCol = headers.indexOf("原料名称");
const proteinCol = headers.indexOf("蛋白质(g/100g)");
const fatCol = headers.indexOf("脂肪(g/100g)");
const carbCol = headers.indexOf("碳水化合物(g/100g)");
const sodiumCol = headers.indexOf("钠(mg/100g)");

const excelNutritionMap: Record<string, any> = {};
for (let i = 1; i < excelData.length; i++) {
  const row = excelData[i];
  const name = row[nameCol]?.trim();
  if (!name) continue;
  const protein = Number(row[proteinCol]) || 0;
  const fat = Number(row[fatCol]) || 0;
  const carbohydrate = Number(row[carbCol]) || 0;
  const sodium = Number(row[sodiumCol]) || 0;
  const energy = Math.round((protein * 17 + fat * 37 + carbohydrate * 17) * 10) / 10;

  excelNutritionMap[name] = {
    energy,
    protein,
    fat,
    carbohydrate,
    sodium,
  };
}

const materials = db.prepare(`
  SELECT id, name, code FROM materials
  WHERE is_latest = 1 AND is_deleted = 0
  ORDER BY name
`).all() as any[];

let insertedCount = 0;
let skippedCount = 0;
let errorCount = 0;

const insertStmt = db.prepare(
  `INSERT OR IGNORE INTO material_nutrition
   (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, last_updated)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const transaction = db.transaction(() => {
  for (const mat of materials) {
    const excel = excelNutritionMap[mat.name];
    if (!excel) {
      console.log(`  ✗ 未匹配: ${mat.name}`);
      skippedCount++;
      continue;
    }

    const existing = db.prepare(
      "SELECT nutrition_id FROM material_nutrition WHERE material_id = ?"
    ).get(mat.id) as any;

    if (existing) {
      console.log(`  - 已存在: ${mat.name}`);
      skippedCount++;
      continue;
    }

    try {
      const nid = generateId();
      const per100gJson = JSON.stringify(excel);
      insertStmt.run(
        nid,
        mat.id,
        per100gJson,
        "1.0",
        "中国食物成分表/原料营养标签",
        `原料[${mat.name}]营养成分数据`,
        now()
      );
      console.log(`  ✓ 导入: ${mat.name} (能量=${excel.energy}kJ, 蛋白=${excel.protein}g, 脂肪=${excel.fat}g, 碳水=${excel.carbohydrate}g, 钠=${excel.sodium}mg)`);
      insertedCount++;
    } catch (e: any) {
      console.log(`  ✗ 失败: ${mat.name} - ${e.message}`);
      errorCount++;
    }
  }
});

transaction();

console.log(`\n===== 导入完成 =====`);
console.log(`  导入: ${insertedCount} 条`);
console.log(`  跳过: ${skippedCount} 条`);
console.log(`  失败: ${errorCount} 条`);

const totalNutrition = db.prepare("SELECT COUNT(*) as cnt FROM material_nutrition").get() as any;
console.log(`  material_nutrition 总记录: ${totalNutrition.cnt}`);

process.exit(0);