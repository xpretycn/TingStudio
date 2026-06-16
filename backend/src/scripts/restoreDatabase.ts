
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../data/tingstudio.db");
const BACKUP_DIR = path.resolve(__dirname, "../../data/backup");

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

interface ExportDataV2 {
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

interface ExportDataV1 {
  version: string;
  exportedAt: string;
  dbPath: string;
  tables: {
    schema: {
      name: string;
      sql: string;
      columns: { name: string; type: string; notnull: number; dflt_value: any; pk: number }[];
      foreignKeys?: ForeignKeyInfo[];
      rowCount?: number;
      dataHash?: string;
    };
    rows: Record<string, any>[];
    rowCount: number;
  }[];
  indexes?: IndexInfo[];
  triggers?: TriggerInfo[];
  meta?: ExportDataV2["meta"];
}

type ExportData = ExportDataV2 | ExportDataV1;

function isV2(data: ExportData): data is ExportDataV2 {
  return data.version === "2.0" && Array.isArray((data as ExportDataV2).indexes);
}

function computeHash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
}

function parseArgs(): { inputFile: string; force: boolean; dryRun: boolean; skipVerify: boolean } {
  const args = process.argv.slice(2);
  let inputFile = "";
  let force = false;
  let dryRun = false;
  let skipVerify = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" || args[i] === "-f") {
      inputFile = args[++i];
    } else if (args[i] === "--force") {
      force = true;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--skip-verify") {
      skipVerify = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!inputFile) {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("tingstudio_backup_") && f.endsWith(".json"))
      .sort()
      .reverse();
    if (files.length > 0) {
      inputFile = path.join(BACKUP_DIR, files[0]);
      console.log(`  📂 未指定文件，自动使用最新备份: ${files[0]}`);
    } else {
      console.error("❌ 未找到备份文件，请使用 --file 指定");
      console.error(`   备份目录: ${BACKUP_DIR}`);
      process.exit(1);
    }
  } else if (!path.isAbsolute(inputFile)) {
    if (fs.existsSync(inputFile)) {
      inputFile = path.resolve(inputFile);
    } else {
      inputFile = path.resolve(BACKUP_DIR, inputFile);
    }
  }

  return { inputFile, force, dryRun, skipVerify };
}

function printUsage() {
  console.log(`
╔══════════════════════════════════════════════════╗
║   TingStudio 数据库恢复工具 v2.0                  ║
╚══════════════════════════════════════════════════╝

用法:
  npx tsx src/scripts/restoreDatabase.ts [选项]

选项:
  -f, --file <文件名>     指定备份文件名 (默认使用最新备份)
  --force                 强制覆盖现有数据库
  --dry-run               仅预览，不实际写入
  --skip-verify           跳过数据一致性校验
  -h, --help              显示帮助信息

示例:
  # 使用最新备份恢复
  npx tsx src/scripts/restoreDatabase.ts

  # 指定备份文件恢复
  npx tsx src/scripts/restoreDatabase.ts -f tingstudio_backup_2026-04-28.json

  # 预览模式（不实际写入）
  npx tsx src/scripts/restoreDatabase.ts --dry-run

  # 强制覆盖
  npx tsx src/scripts/restoreDatabase.ts --force

  # 跳过校验（加速恢复，不推荐）
  npx tsx src/scripts/restoreDatabase.ts --force --skip-verify
`);
}

function getOrCreateDb(force: boolean): Database.Database {
  const dbDir = path.dirname(DB_PATH);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH) && !force) {
    console.error(`❌ 数据库文件已存在: ${DB_PATH}`);
    console.error("   请先删除或重命名现有数据库，或使用 --force 强制覆盖");
    process.exit(1);
  }

  if (force && fs.existsSync(DB_PATH)) {
    const backupOld = DB_PATH + ".before_restore";
    if (fs.existsSync(backupOld)) {
      fs.unlinkSync(backupOld);
    }
    fs.renameSync(DB_PATH, backupOld);
    console.log(`  📦 已将旧数据库备份为: ${backupOld}`);
  }

  const db = new Database(DB_PATH);
  return db;
}

function topologicalSort(tables: ExportDataV2["tables"]): ExportDataV2["tables"] {
  const tableMap = new Map(tables.map(t => [t.schema.name, t]));
  const allNames = new Set(tables.map(t => t.schema.name));
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(name: string, visiting: Set<string>) {
    if (visited.has(name)) return;
    if (visiting.has(name)) return;
    visiting.add(name);

    const table = tableMap.get(name);
    if (table && table.schema.foreignKeys) {
      for (const fk of table.schema.foreignKeys) {
        if (allNames.has(fk.table) && fk.table !== name) {
          visit(fk.table, visiting);
        }
      }
    }

    visiting.delete(name);
    visited.add(name);
    order.push(name);
  }

  for (const name of allNames) {
    visit(name, new Set());
  }

  return order.map(name => tableMap.get(name)!).filter(Boolean);
}

function normalizeSchemaForHash(sql: string): string {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*/g, "(")
    .replace(/\s*\)\s*/g, ")")
    .replace(/`/g, "")
    .trim()
    .toLowerCase();
}

async function main() {
  console.log("════════════════════════════════════════════════════════");
  console.log(" TingStudio 数据库恢复工具 v2.0");
  console.log("════════════════════════════════════════════════════════\n");

  const { inputFile, force, dryRun, skipVerify } = parseArgs();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤1: 读取备份文件");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ 备份文件不存在: ${inputFile}`);
    process.exit(1);
  }

  const backupData: ExportData = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  const isV2Format = isV2(backupData);

  console.log(`  📁 文件: ${inputFile}`);
  console.log(`  🕐 导出时间: ${backupData.exportedAt}`);
  console.log(`  📊 版本: ${backupData.version}`);
  console.log(`  📋 数据表: ${backupData.tables.length} 张`);

  let totalRows = 0;
  for (const t of backupData.tables) {
    const rc = "rowCount" in t.schema ? t.schema.rowCount : (t as ExportDataV1["tables"][0]).rowCount;
    totalRows += rc;
    console.log(`    - ${t.schema.name}: ${rc} 条记录`);
  }
  console.log(`  📝 总记录数: ${totalRows}`);

  if (isV2Format) {
    const v2 = backupData as ExportDataV2;
    console.log(`  🔑 索引数量: ${v2.indexes.length}`);
    console.log(`  ⚡ 触发器数: ${v2.triggers.length}`);
    console.log(`  🔒 结构哈希: ${v2.meta.schemaHash.slice(0, 16)}...`);
  }
  console.log("");

  if (dryRun) {
    console.log("🔍 [DRY RUN] 以上为预览内容，未执行任何操作。");
    console.log("   去掉 --dry-run 参数即可实际恢复。");
    process.exit(0);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤2: 初始化数据库");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const db = getOrCreateDb(force);
  console.log(`  📦 数据库: ${DB_PATH}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤3: 创建表结构");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const orderedTables = isV2Format
    ? topologicalSort((backupData as ExportDataV2).tables)
    : backupData.tables;

  for (const tableInfo of orderedTables) {
    const { schema } = tableInfo;
    const tableName = schema.name;

    if (schema.sql) {
      try {
        db.exec(schema.sql.replace(/CREATE\s+TABLE(\s+IF\s+NOT\s+EXISTS)?\s+/i, "CREATE TABLE IF NOT EXISTS "));
        console.log(`  ✓ 创建表: ${tableName}`);
      } catch (e: any) {
        console.log(`  ⚠ 建表 ${tableName}: ${e.message} (尝试继续)`);
      }
    } else {
      console.log(`  ⚠ 跳过表 ${tableName}: 无建表SQL`);
    }
  }
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤4: 导入数据");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let insertedTotal = 0;
  let skippedTotal = 0;

  const tx = db.transaction(() => {
    for (const tableInfo of orderedTables) {
      const { schema, rows } = tableInfo;
      const tableName = schema.name;

      if (rows.length === 0) {
        console.log(`  ✓ ${tableName}: 空表 (无数据)`);
        continue;
      }

      (await query(`DELETE FROM "${tableName}"`).run();

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => "?").join(", ");
      const colNames = columns.map(c => `"${c}"`).join(", ");
      const insertSql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`;
      const stmt = db.prepare(insertSql);

      let inserted = 0;
      let skipped = 0;
      for (const row of rows) {
        try {
          const values = columns.map(col => row[col] ?? null);
          const result = stmt.run(...values);
          inserted += result.changes;
        } catch (rowErr: any) {
          skipped++;
          if (skipped <= 3) {
            console.log(`    ⚠ 跳过行 ${tableName}: ${rowErr.message}`);
          }
        }
      }
      if (skipped > 3) {
        console.log(`    ⚠ ... 共跳过 ${skipped} 行`);
      }

      insertedTotal += inserted;
      skippedTotal += skipped;
      console.log(
        `  ✓ ${tableName}: 插入 ${inserted}/${rows.length} 条记录${skipped > 0 ? ` (跳过 ${skipped} 条)` : ""}`,
      );
    }
  });

  tx();
  console.log(`\n  📊 总计插入: ${insertedTotal} 条, 跳过: ${skippedTotal} 条\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤5: 创建索引");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (isV2Format) {
    const v2 = backupData as ExportDataV2;
    for (const idx of v2.indexes) {
      try {
        const idxSql = idx.sql.replace(/CREATE\s+UNIQUE\s+INDEX\s+/i, "CREATE UNIQUE INDEX IF NOT EXISTS ").replace(/CREATE\s+INDEX\s+/i, "CREATE INDEX IF NOT EXISTS ");
        db.exec(idxSql);
        console.log(`  ✓ 索引: ${idx.name}`);
      } catch (e: any) {
        console.log(`  ⚠ 索引 ${idx.name}: ${e.message}`);
      }
    }
  } else {
    console.log("  ℹ v1 备份格式不含索引，跳过索引恢复");
  }
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤6: 创建触发器");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (isV2Format) {
    const v2 = backupData as ExportDataV2;
    for (const trg of v2.triggers) {
      try {
        await execute(`DROP TRIGGER IF EXISTS "${trg.name}"`);
        db.exec(trg.sql);
        console.log(`  ✓ 触发器: ${trg.name}`);
      } catch (e: any) {
        console.log(`  ⚠ 触发器 ${trg.name}: ${e.message}`);
      }
    }
    if (v2.triggers.length === 0) {
      console.log("  ℹ 无触发器需要恢复");
    }
  } else {
    console.log("  ℹ v1 备份格式不含触发器，跳过触发器恢复");
  }
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤7: 重置自增序列");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  for (const tableInfo of orderedTables) {
    const tableName = tableInfo.schema.name;
    try {
      const maxResult = (await query(`SELECT MAX(rowid) as maxid FROM "${tableName}"`, [])).rows[0] as { maxid: number | null };
      if (maxResult.maxid !== null && maxResult.maxid > 0) {
        console.log(`  ✓ ${tableName}: 序列重置为 ${maxResult.maxid + 1}`);
      }
    } catch {}
  }
  console.log("");


  if (!skipVerify) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("步骤8: 数据一致性校验");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let allPass = true;

    for (const tableInfo of backupData.tables) {
      const tableName = tableInfo.schema.name;
      const expectedCount = isV2Format
        ? (tableInfo.schema as ExportDataV2["tables"][0]["schema"]).rowCount
        : (tableInfo as ExportDataV1["tables"][0]).rowCount;

      const countResult = (await query(`SELECT COUNT(*) as cnt FROM "${tableName}"`, [])).rows[0] as { cnt: number };
      const countMatch = countResult.cnt === expectedCount;

      let hashMatch = true;
      let hashInfo = "";
      if (isV2Format && tableInfo.schema.dataHash) {
        const currentRows = db.prepare(`SELECT * FROM "${tableName}"`, [])).rows;
        const currentHash = computeHash(JSON.stringify(currentRows));
        hashMatch = currentHash === tableInfo.schema.dataHash;
        hashInfo = hashMatch ? ", 哈希 ✅" : `, 哈希 ❌ (期望: ${tableInfo.schema.dataHash.slice(0, 12)}..., 实际: ${currentHash.slice(0, 12)}...)`;
      }

      const pass = countMatch && hashMatch;
      if (!pass) allPass = false;

      const status = pass ? "✅" : "❌";
      console.log(`  ${status} ${tableName}: ${countResult.cnt}/${expectedCount} 条${hashInfo}`);
    }

    if (isV2Format) {
      const v2 = backupData as ExportDataV2;
      console.log("\n  🔒 结构哈希校验:");
      const currentTables = db
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as { sql: string }[];
      const currentSchemaHash = computeHash(currentTables.map(t => t.sql || "").join("|"));
      const schemaMatch = currentSchemaHash === v2.meta.schemaHash;
      if (schemaMatch) {
        console.log(`  ✅ 结构哈希一致: ${currentSchemaHash.slice(0, 16)}...`);
      } else {
        console.log(`  ⚠️ 结构哈希不一致 (可能因 SQLite 版本差异导致 SQL 格式化不同)`);
        console.log(`     期望: ${v2.meta.schemaHash.slice(0, 16)}...`);
        console.log(`     实际: ${currentSchemaHash.slice(0, 16)}...`);
      }

      console.log("\n  🔑 索引校验:");
      const currentIndexes = db
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];
      const currentIndexNames = new Set(currentIndexes.map(i => i.name));
      for (const idx of v2.indexes) {
        const exists = currentIndexNames.has(idx.name);
        console.log(`  ${exists ? "✅" : "❌"} 索引: ${idx.name}`);
      }
    }

    if (!allPass) {
      console.log("\n  ⚠️ 部分表数据校验未通过，请检查上述标记为 ❌ 的项目");
    }
  } else {
    console.log("  ℹ 已跳过数据一致性校验 (--skip-verify)");
  }

  db.close();

  console.log("\n════════════════════════════════════════════════════════");
  console.log(" ✅ 数据库恢复完成!");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  📁 数据库路径: ${DB_PATH}`);
  console.log(`  📝 总计恢复: ${insertedTotal} 条记录`);
  console.log("\n💡 现在可以启动后端服务:");
  console.log("   cd backend && npm run dev\n");
}

main().catch(err => {
  console.error("恢复失败:", err);
  process.exit(1);
});
