import { getDb, connectDatabase } from "../backend/src/config/database-better-sqlite3.js";

connectDatabase();
const db = getDb();
const rows = db.prepare("SELECT config_key, config_value, description FROM parse_result_configs ORDER BY config_key").all();

console.log("=== parse_result_configs ===");
for (const row of rows as any[]) {
  console.log(`key: ${row.config_key}, value: ${row.config_value}, desc: ${row.description}`);
}
console.log("=== end ===");
