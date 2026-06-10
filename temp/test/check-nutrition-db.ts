import { getDb, connectDatabase } from "../backend/src/config/database-better-sqlite3.js";

connectDatabase();
const db = getDb();

const nutritionCnt = db.prepare("SELECT COUNT(*) as cnt FROM material_nutrition").get() as any;
console.log("material_nutrition 记录数:", nutritionCnt.cnt);

const matCnt = db.prepare("SELECT COUNT(*) as cnt FROM materials WHERE is_latest = 1 AND is_deleted = 0").get() as any;
console.log("有效材料数:", matCnt.cnt);

if (nutritionCnt.cnt > 0) {
  const sample = db.prepare("SELECT nutrition_id, material_id, per_100g_json, data_version, confidence FROM material_nutrition LIMIT 5").all();
  console.log("\n样本数据:");
  sample.forEach((s: any) => console.log(`  - material_id=${s.material_id}, confidence=${s.confidence}, per_100g_json=${s.per_100g_json?.substring(0, 80)}...`));
} else {
  console.log("\n⚠ material_nutrition 表为空！需要导入营养数据。");
}

// 列出有 nutrition 数据的材料
const hasNutrition = db.prepare(`
  SELECT m.id, m.name, m.code, mn.nutrition_id 
  FROM materials m 
  JOIN material_nutrition mn ON m.id = mn.material_id 
  WHERE m.is_latest = 1 AND m.is_deleted = 0
`).all();
console.log(`\n有营养数据的材料数: ${hasNutrition.length}`);
if (hasNutrition.length > 0) {
  hasNutrition.forEach((m: any) => console.log(`  - ${m.name} (${m.code})`));
}

process.exit(0);