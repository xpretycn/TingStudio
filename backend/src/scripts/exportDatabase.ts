import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../data/tingstudio.db");
const OUTPUT_DIR = path.resolve(__dirname, "../../data/backup");

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

interface ForeignKeyInfo {
  from: string;
  table: string;
  to: string;
}

interface TableSchema {
  name: string;
  sql: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  rowCount: number;
  dataHash: string;
}

interface IndexInfo {
  name: string;
  tbl_name: string;
  sql: string;
}

interface TriggerInfo {
  name: string;
  tbl_name: string;
  sql: string;
}

interface ExportData {
  version: string;
  exportedAt: string;
  dbPath: string;
  sqliteVersion: string;
  tables: {
    schema: TableSchema;
    rows: Record<string, any>[];
  }[];
  indexes: IndexInfo[];
  triggers: TriggerInfo[];
  meta: {
    totalRows: number;
    totalTables: number;
    totalIndexes: number;
    totalTriggers: number;
    schemaHash: string;
  };
}

function computeHash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
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
  console.log(" TingStudio 数据库完整导出工具 v2.0");
  console.log("════════════════════════════════════════════════════════\n");

  const db = getDb();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputFile = path.join(OUTPUT_DIR, `tingstudio_backup_${timestamp}.json`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤1: 扫描数据库表结构");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const tables = db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string; sql: string }[];

  console.log(`  发现 ${tables.length} 张数据表:`);
  for (const t of tables) {
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get() as { cnt: number };
    console.log(`    - ${t.name} (${count.cnt} 条记录)`);
  }
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤2: 扫描索引和触发器");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const indexes = db
    .prepare(
      "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as IndexInfo[];

  console.log(`  发现 ${indexes.length} 个索引:`);
  for (const idx of indexes) {
    console.log(`    - ${idx.name} (表: ${idx.tbl_name})`);
  }

  const triggers = db
    .prepare(
      "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as TriggerInfo[];

  console.log(`  发现 ${triggers.length} 个触发器:`);
  for (const trg of triggers) {
    console.log(`    - ${trg.name} (表: ${trg.tbl_name})`);
  }
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤3: 导出表结构 + 全部数据 + 校验哈希");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const exportData: ExportData = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    dbPath: DB_PATH,
    sqliteVersion: db.prepare("SELECT sqlite_version() as v").get() as any,
    tables: [],
    indexes,
    triggers,
    meta: {
      totalRows: 0,
      totalTables: tables.length,
      totalIndexes: indexes.length,
      totalTriggers: triggers.length,
      schemaHash: "",
    },
  };

  let totalRows = 0;
  const schemaHashParts: string[] = [];

  for (const table of tables) {
    const tableName = table.name;

    const columns = db.pragma(`table_info("${tableName}")`) as ColumnInfo[];

    const fkList = db.pragma(`foreign_key_list("${tableName}")`) as {
      from: string;
      table: string;
      to: string;
      id: number;
      seq: number;
    }[];
    const foreignKeys: ForeignKeyInfo[] = fkList.map(fk => ({
      from: fk.from,
      table: fk.table,
      to: fk.to,
    }));

    const rows = db.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, any>[];

    const rowsJson = JSON.stringify(rows);
    const dataHash = computeHash(rowsJson);

    schemaHashParts.push(table.sql || "");

    exportData.tables.push({
      schema: {
        name: tableName,
        sql: table.sql,
        columns,
        foreignKeys,
        rowCount: rows.length,
        dataHash,
      },
      rows,
    });

    totalRows += rows.length;
    console.log(`  ✓ ${tableName}: ${rows.length} 条记录, ${columns.length} 个字段, 哈希: ${dataHash.slice(0, 12)}...`);
  }

  exportData.meta.totalRows = totalRows;
  exportData.meta.schemaHash = computeHash(schemaHashParts.join("|"));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤4: 写入备份文件");
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
  console.log(`  🔑 索引数量: ${indexes.length}`);
  console.log(`  ⚡ 触发器数: ${triggers.length}`);
  console.log(`  🔒 结构哈希: ${exportData.meta.schemaHash.slice(0, 16)}...`);
  console.log(`  🕐 导出时间: ${exportData.exportedAt}`);
  console.log("\n💡 恢复方法:");
  console.log(`   npx tsx src/scripts/restoreDatabase.ts --file "${path.basename(outputFile)}"`);
  console.log("");

  db.close();
  process.exit(0);
}

main().catch(err => {
  console.error("导出失败:", err);
  process.exit(1);
});
