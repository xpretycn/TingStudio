import { connectDatabase, getDb, closeDatabase } from "../../config/database-better-sqlite3.js";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  迁移：添加 tokens_used 列到 parse_results");
  console.log("═══════════════════════════════════════════════════════════════\n");

  await connectDatabase();
  const db = getDb();

  try {
    const columns = db.prepare("PRAGMA table_info(parse_results)").all() as any[];
    const columnNames = columns.map(c => c.name);

    console.log("当前列:");
    columnNames.forEach(name => console.log(`  - ${name}`));

    if (!columnNames.includes('tokens_used')) {
      console.log("\n添加 tokens_used 列...");
      db.exec("ALTER TABLE parse_results ADD COLUMN tokens_used INTEGER NOT NULL DEFAULT 0");
      console.log("✅ tokens_used 列添加成功");
    } else {
      console.log("\n✅ tokens_used 列已存在");
    }

    if (!columnNames.includes('prompt_tokens')) {
      console.log("添加 prompt_tokens 列...");
      db.exec("ALTER TABLE parse_results ADD COLUMN prompt_tokens INTEGER NOT NULL DEFAULT 0");
      console.log("✅ prompt_tokens 列添加成功");
    } else {
      console.log("✅ prompt_tokens 列已存在");
    }

    if (!columnNames.includes('completion_tokens')) {
      console.log("添加 completion_tokens 列...");
      db.exec("ALTER TABLE parse_results ADD COLUMN completion_tokens INTEGER NOT NULL DEFAULT 0");
      console.log("✅ completion_tokens 列添加成功");
    } else {
      console.log("✅ completion_tokens 列已存在");
    }

    console.log("\n验证最终表结构:");
    const finalColumns = db.prepare("PRAGMA table_info(parse_results)").all() as any[];
    finalColumns.forEach(c => console.log(`  - ${c.name} (${c.type})`));

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  ✅ 迁移完成");
    console.log("═══════════════════════════════════════════════════════════════");

  } catch (err: any) {
    console.error("\n❌ 迁移失败:", err.message);
    throw err;
  }

  await closeDatabase();
}

main().catch(err => {
  console.error("迁移失败:", err);
  process.exit(1);
});
