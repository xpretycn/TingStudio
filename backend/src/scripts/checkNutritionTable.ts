import { query, execute, closeDatabase } from '../config/database-adapter.js';

console.log("检查 material_nutrition 表状态...");

connectDatabase();


const totalNutrition = (await query(`SELECT COUNT(*) as count FROM material_nutrition`).get() as { count: number };
const latestNutrition = (await query(`SELECT COUNT(*) as count FROM material_nutrition WHERE is_latest = 1`, [])).rows[0] as { count: number };

console.log(`\nmaterial_nutrition 表总记录数: ${totalNutrition.count}`);
console.log(`其中 is_latest = 1 的记录数: ${latestNutrition.count}`);

if (totalNutrition.count > 0) {
  const sample = db.prepare(`SELECT * FROM material_nutrition LIMIT 3`, [])).rows;
  console.log("\n示例记录：");
  console.log(JSON.stringify(sample, null, 2));
}

closeDatabase();
