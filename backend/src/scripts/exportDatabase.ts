import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../data/tingstudio.db");
const OUTPUT_DIR = path.resolve(__dirname, "../../data/backup");

interface TableSchema {
  name: string;
  sql: string;
  columns: { name: string; type: string; notnull: number; dflt_value: any; pk: number }[];
}

interface ExportData {
  version: string;
  exportedAt: string;
  dbPath: string;
  tables: {
    schema: TableSchema;
    rows: Record<string, any>[];
    rowCount: number;
  }[];
}

function getDb(): Database.Database {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ 数据库文件不存在: ${DB_PATH}`);
    process.exit(1);
  }
  return new Database(DB_PATH, { readonly: true });
}

async function main() {
  console.log("════════════════════════════════════════════════════════");
  console.log(" TingStudio 数据库完整导出工具");
  console.log("════════════════════════════════════════════════════════\n");

  const db = getDb();

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputFile = path.join(OUTPUT_DIR, `tingstudio_backup_${timestamp}.json`);

  // 1. 获取所有表
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤1: 扫描数据库表结构");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const tables = db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as { name: string; sql: string }[];

  console.log(`  发现 ${tables.length} 张数据表:`);
  for (const t of tables) {
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get() as { cnt: number };
    console.log(`    - ${t.name} (${count.cnt} 条记录)`);
  }
  console.log("");

  // 2. 导出每张表的结构和数据
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤2: 导出表结构 + 全部数据");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    dbPath: DB_PATH,
    tables: [],
  };

  let totalRows = 0;

  for (const table of tables) {
    const tableName = table.name;

    // 获取列信息
    const columns = db.pragma(`table_info("${tableName}")`) as {
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }[];

    // 获取所有行数据
    const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();

    exportData.tables.push({
      schema: {
        name: tableName,
        sql: table.sql,
        columns,
      },
      rows: rows as Record<string, any>[],
      rowCount: rows.length,
    });

    totalRows += rows.length;
    console.log(`  ✓ ${tableName}: ${rows.length} 条记录, ${columns.length} 个字段`);
  }

  // 3. 写入JSON文件
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤3: 写入备份文件");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const jsonStr = JSON.stringify(exportData, null, 2);
  fs.writeFileSync(outputFile, jsonStr, "utf-8");

  const fileSize = (fs.statSync(outputFile).size / 1024).toFixed(1);

  console.log("\n════════════════════════════════════════════════════════");
  console.log(" ✅ 导出完成!");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  📁 文件路径: ${outputFile}`);
  console.log(`  📦 文件大小: ${fileSize} KB`);
  console.log(`  📊 数据表数: ${tables.length}`);
  console.log(`  📝 总记录数: ${totalRows}`);
  console.log(`  🕐 导出时间: ${exportData.exportedAt}`);
  console.log("\n💡 恢复方法:");
  console.log(`   npx tsx src/scripts/restoreDatabase.ts --file "${path.basename(outputFile)}"`);
  console.log("");

  db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("导出失败:", err);
  process.exit(1);
});
