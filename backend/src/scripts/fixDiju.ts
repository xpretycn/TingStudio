

const DB_PATH = "data/tingstudio.db";

const db = new Database(DB_PATH);

console.log("=== 修正低聚异麦芽糖数据 ===\n");

const material = db
  .prepare("SELECT id, name FROM materials WHERE name LIKE '%低聚异麦芽糖%'")
  .get() as any;

if (!material) {
  console.log("未找到低聚异麦芽糖");
  db.close();
  process.exit(1);
}

console.log(`原料: ${material.name} (ID: ${material.id})`);

// 正确的营养数据（来自原始文件）
const correctData = JSON.stringify({
  protein: 0,
  fat: 0,
  carbohydrate: 90,
  sodium: 0,
  unit: "per_100g",
});

console.log("\n修正后数据:", correctData);

const result = db
  .prepare(
    "UPDATE material_nutrition SET per_100g_json = ?, last_updated = datetime('now') WHERE material_id = ?"
  )
  .run(correctData, material.id);

console.log(`\n更新结果: ${result.changes} 条`);

// 验证
const updated = db
  .prepare("SELECT per_100g_json FROM material_nutrition WHERE material_id = ?")
  .get(material.id) as any;
console.log("\n验证:", updated.per_100g_json);

db.close();
console.log("\n=== 完成 ===");
