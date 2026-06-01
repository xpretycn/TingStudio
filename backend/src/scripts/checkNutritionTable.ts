import { connectDatabase, getDb, closeDatabase } from "../config/database-better-sqlite3.js";

console.log("检查 material_nutrition 表状态...");

connectDatabase();
const db = getDb();

const totalNutrition = db.prepare(`SELECT COUNT(*) as count FROM material_nutrition`).get() as { count: number };
const latestNutrition = db.prepare(`SELECT COUNT(*) as count FROM material_nutrition WHERE is_latest = 1`).get() as { count: number };

console.log(`\nmaterial_nutrition 表总记录数: ${totalNutrition.count}`);
console.log(`其中 is_latest = 1 的记录数: ${latestNutrition.count}`);

if (totalNutrition.count > 0) {
  const sample = db.prepare(`SELECT * FROM material_nutrition LIMIT 3`).all();
  console.log("\n示例记录：");
  console.log(JSON.stringify(sample, null, 2));
}

closeDatabase();
