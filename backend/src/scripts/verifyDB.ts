import Database from "better-sqlite3";

const db = new Database("data/tingstudio.db");

console.log("=== 数据库验证 ===");
const total = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as any).c;
console.log("原料总数:", total);

console.log("\n类型分布:");
const types = db.prepare(
  "SELECT material_type, COUNT(*) as c FROM materials GROUP BY material_type"
).all() as any[];
types.forEach((t) => console.log(`  ${t.material_type}: ${t.c}条`));

console.log("\n前15条原料:");
const rows = db
  .prepare("SELECT name, material_type, code FROM materials LIMIT 15")
  .all() as any[];
rows.forEach((r) => console.log(`  - ${r.name} | ${r.material_type} | ${r.code}`));

db.close();
