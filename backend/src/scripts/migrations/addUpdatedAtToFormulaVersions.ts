import { query, execute, closeDatabase } from '../../config/database-adapter.js';

console.log("迁移脚本：添加 updated_at 列到 formula_versions 表");
console.log("=".repeat(50));

connectDatabase();


function now(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

try {
  const result = (await query("PRAGMA table_info(formula_versions)", [])).rows as Array<{name: string}>;
  const columns = result.map(r => r.name);
  
  console.log(`当前 formula_versions 表的列: ${columns.join(", ")}`);
  
  if (!columns.includes("updated_at")) {
    console.log("\n添加 updated_at 列...");
    await execute(`ALTER TABLE formula_versions ADD COLUMN updated_at TEXT`);
    console.log("✅ updated_at 列已添加（无默认值）");
    
    console.log("\n更新现有记录的 updated_at 为 created_at 值...");
    const updateResult = await execute("UPDATE formula_versions SET updated_at = created_at WHERE updated_at IS NULL", []);
    console.log(`✅ 已更新 ${updateResult.changes} 条记录`);
  } else {
    console.log("\n⚠️ updated_at 列已存在，无需迁移");
  }
  
  const resultAfter = (await query("PRAGMA table_info(formula_versions)", [])).rows as Array<{name: string}>;
  const columnsAfter = resultAfter.map(r => r.name);
  console.log(`\n迁移后 formula_versions 表的列: ${columnsAfter.join(", ")}`);
  
} catch (err: any) {
  console.error("❌ 迁移失败:", err.message);
  process.exit(1);
}

closeDatabase();
console.log("\n" + "=".repeat(50));
console.log("迁移完成!");
