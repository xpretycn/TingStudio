import Database from "better-sqlite3";
import path from "path";
import { generateFormulaCode } from "../utils/helpers.js";

const DB_PATH = path.join(process.cwd(), "data", "tingstudio.db");
const db = new Database(DB_PATH);

console.log("=== 为现有配方生成拼音CODE ===\n");

try {
  const formulas: any[] = db.prepare("SELECT id, name, code FROM formulas").all();
  console.log(`共 ${formulas.length} 条配方\n`);

  let updated = 0;
  let unchanged = 0;
  for (const f of formulas) {
    const newCode = generateFormulaCode(f.name);
    if (f.code !== newCode) {
      db.prepare("UPDATE formulas SET code = ? WHERE id = ?").run(newCode, f.id);
      console.log(`✅ ${f.name}: ${f.code || '(空)'} → ${newCode}`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`更新: ${updated} 条, 未变: ${unchanged} 条`);

  // 显示结果
  const samples: any[] = db.prepare("SELECT name, code FROM formulas ORDER BY rowid LIMIT 10").all();
  console.log("\n当前配方CODE示例:");
  for (const s of samples) {
    console.log(`   ${s.name} → ${s.code}`);
  }
} catch (error: any) {
  console.error("❌ 错误:", error.message);
} finally {
  db.close();
}
