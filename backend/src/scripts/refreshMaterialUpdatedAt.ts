import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(import.meta.dirname, "../../data/tingstudio.db");
const db = new Database(dbPath);

const rows: any[] = db.prepare("SELECT id, name, code, unit_price, updated_at FROM materials WHERE unit_price IS NOT NULL AND unit_price > 0").all();
console.log(`找到 ${rows.length} 条有单价的原料记录：\n`);

for (const r of rows) {
  console.log(`  ${r.name} | ${r.code} | ¥${r.unit_price}/kg | updated_at: ${r.updated_at}`);
}

const result = db.prepare("UPDATE materials SET updated_at = datetime('now') WHERE unit_price IS NOT NULL AND unit_price > 0").run();
console.log(`\n✅ 已刷新 ${result.changes} 条记录的 updated_at 为当前时间`);

db.close();
