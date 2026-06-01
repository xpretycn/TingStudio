import { connectDatabase, getDb, closeDatabase } from "../config/database-better-sqlite3.js";

console.log("=" .repeat(60));
console.log("验证营养数据补充结果");
console.log("=" .repeat(60));

connectDatabase();
const db = getDb();

const results = db.prepare(`
  SELECT m.name, m.id, mn.per_100g_json, mn.data_source
  FROM materials m 
  LEFT JOIN material_nutrition mn ON m.id = mn.material_id AND mn.is_latest = 1
  WHERE mn.per_100g_json IS NOT NULL AND mn.per_100g_json != '{}'
  LIMIT 20
`).all() as Array<{name: string; id: string; per_100g_json: string; data_source: string}>;

console.log(`\n数据库中已有营养数据的原料数量: ${results.length}`);

if (results.length > 0) {
  console.log("\n前 5 条数据示例：");
  console.log("-".repeat(60));
  
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i];
    const nutrition = JSON.parse(r.per_100g_json);
    console.log(`\n${i + 1}. ${r.name}`);
    console.log(`   ID: ${r.id.substring(0, 8)}...`);
    console.log(`   数据来源: ${r.data_source}`);
    console.log(`   营养数据:`, nutrition);
  }
  
  const totalWithNutrition = db.prepare(`
    SELECT COUNT(*) as count FROM materials m 
    JOIN material_nutrition mn ON m.id = mn.material_id AND mn.is_latest = 1
    WHERE mn.per_100g_json IS NOT NULL AND mn.per_100g_json != '{}'
  `).get() as { count: number };
  
  const totalMaterials = db.prepare(`SELECT COUNT(*) as count FROM materials`).get() as { count: number };
  
  console.log("\n" + "=".repeat(60));
  console.log("统计汇总：");
  console.log("-".repeat(60));
  console.log(`原料总数: ${totalMaterials.count}`);
  console.log(`已有营养数据: ${totalWithNutrition.count}`);
  console.log(`缺失营养数据: ${totalMaterials.count - totalWithNutrition.count}`);
  console.log(`完整率: ${((totalWithNutrition.count / totalMaterials.count) * 100).toFixed(1)}%`);
}

const emptyResults = db.prepare(`
  SELECT m.name, m.id
  FROM materials m 
  LEFT JOIN material_nutrition mn ON m.id = mn.material_id AND mn.is_latest = 1
  WHERE mn.per_100g_json IS NULL OR mn.per_100g_json = '{}'
`).all() as Array<{name: string; id: string}>;

if (emptyResults.length > 0) {
  console.log("\n仍缺失营养数据的原料：");
  for (const r of emptyResults) {
    console.log(`  - ${r.name}`);
  }
}

closeDatabase();
console.log("\n" + "=".repeat(60));
