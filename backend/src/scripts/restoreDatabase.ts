import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../data/tingstudio.db");
const BACKUP_DIR = path.resolve(__dirname, "../../data/backup");

interface ExportData {
  version: string;
  exportedAt: string;
  dbPath: string;
  tables: {
    schema: {
      name: string;
      sql: string;
      columns: { name: string; type: string; notnull: number; dflt_value: any; pk: number }[];
    };
    rows: Record<string, any>[];
    rowCount: number;
  }[];
}

function parseArgs(): { inputFile: string; force: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  let inputFile = "";
  let force = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" || args[i] === "-f") {
      inputFile = args[++i];
    } else if (args[i] === "--force") {
      force = true;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!inputFile) {
    // 自动查找最新的备份文件
    const files = fs.readdirSync(BACKUP_DIR)
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
    inputFile = path.resolve(BACKUP_DIR, inputFile);
  }

  return { inputFile, force, dryRun };
}

function printUsage() {
  console.log(`
╔══════════════════════════════════════════════════╗
║   TingStudio 数据库恢复工具                       ║
╚══════════════════════════════════════════════════╝

用法:
  npx tsx src/scripts/restoreDatabase.ts [选项]

选项:
  -f, --file <文件名>   指定备份文件名 (默认使用最新备份)
  --force               强制覆盖现有数据库
  --dry-run             仅预览，不实际写入
  -h, --help            显示帮助信息

示例:
  # 使用最新备份恢复
  npx tsx tsx src/scripts/restoreDatabase.ts

  # 指定备份文件恢复
  npx tsx src/scripts/restoreDatabase.ts -f tingstudio_backup_2026-04-28.json

  # 预览模式（不实际写入）
  npx tsx src/scripts/restoreDatabase.ts --dry-run

  # 强制覆盖
  npx tsx src/scripts/restoreDatabase.ts --force
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

  // 如果强制模式且存在旧库，先删除
  if (force && fs.existsSync(DB_PATH)) {
    const backupOld = DB_PATH + ".before_restore";
    fs.renameSync(DB_PATH, backupOld);
    console.log(`  📦 已将旧数据库备份为: ${backupOld}`);
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF");
  return db;
}

// 按外键依赖顺序排列表名（无依赖的表优先插入）
function getInsertOrder(tables: ExportData["tables"]): ExportData["tables"] {
  const tableNames = new Set(tables.map(t => t.schema.name));
  const order: string[] = [];
  const remaining = new Set(tables.map(t => t.schema.name));

  // 无外键依赖的基础表优先
  const baseTables = ["users", "materials", "salesmen", "nutrition_profiles", "export_templates"];
  for (const name of baseTables) {
    if (remaining.has(name)) {
      order.push(name);
      remaining.delete(name);
    }
  }
  // 其余按原始顺序
  for (const t of tables) {
    if (remaining.has(t.schema.name)) {
      order.push(t.schema.name);
      remaining.delete(t.schema.name);
    }
  }

  const map = new Map(tables.map(t => [t.schema.name, t]));
  return order.map(name => map.get(name)!);
}

async function main() {
  console.log("════════════════════════════════════════════════════════");
  console.log(" TingStudio 数据库恢复工具");
  console.log("════════════════════════════════════════════════════════\n");

  const { inputFile, force, dryRun } = parseArgs();

  // 1. 读取备份文件
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤1: 读取备份文件");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ 备份文件不存在: ${inputFile}`);
    process.exit(1);
  }

  const backupData: ExportData = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  console.log(`  📁 文件: ${inputFile}`);
  console.log(`  🕐 导出时间: ${backupData.exportedAt}`);
  console.log(`  📊 版本: ${backupData.version}`);
  console.log(`  📋 数据表: ${backupData.tables.length} 张`);

  let totalRows = 0;
  for (const t of backupData.tables) {
    totalRows += t.rowCount;
    console.log(`    - ${t.schema.name}: ${t.rowCount} 条记录`);
  }
  console.log(`  📝 总记录数: ${totalRows}\n`);

  if (dryRun) {
    console.log("🔍 [DRY RUN] 以上为预览内容，未执行任何操作。");
    console.log("   去掉 --dry-run 参数即可实际恢复。");
    process.exit(0);
  }

  // 2. 创建/连接数据库
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤2: 初始化数据库");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const db = getOrCreateDb(force);
  console.log(`  📦 数据库: ${DB_PATH}\n`);

  // 3. 按顺序创建表并导入数据
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤3: 建表 + 导入数据");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const orderedTables = getInsertOrder(backupData.tables);
  let insertedTotal = 0;

  const tx = db.transaction(() => {
    for (const tableInfo of orderedTables) {
      const { schema, rows } = tableInfo;
      const tableName = schema.name;

      // 创建表
      if (schema.sql) {
        try {
          db.exec(schema.sql.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS"));
        } catch (e: any) {
          console.log(`  ⚠ 建表 ${tableName}: ${e.message} (尝试继续)`);
        }
      }

      // 创建索引
      try {
        const indexes = db
          .prepare(
            `SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`
          )
          .all(tableName) as { sql: string }[];
        for (const idx of indexes) {
          try {
            const idxSql = idx.sql.replace(/CREATE\s+INDEX/i, "CREATE INDEX IF NOT EXISTS");
            db.exec(idxSql);
          } catch {}
        }
      } catch {}

      if (rows.length === 0) {
        console.log(`  ✓ ${tableName}: 表已创建 (空表)`);
        continue;
      }

      // 清空已有数据后插入
      db.prepare(`DELETE FROM "${tableName}"`).run();

      // 构建INSERT语句
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const colNames = columns.map(c => `"${c}"`).join(", ");
        const insertSql = `INSERT OR IGNORE INTO "${tableName}" (${colNames}) VALUES (${placeholders})`;
        const stmt = db.prepare(insertSql);

        let inserted = 0;
        for (const row of rows) {
          const values = columns.map(col => row[col] ?? null);
          const result = stmt.run(...values);
          inserted += result.changes;
        }

        insertedTotal += inserted;
        console.log(`  ✓ ${tableName}: 插入 ${inserted}/${rows.length} 条记录`);
      }
    }
  });

  tx();

  // 4. 重新启用外键约束并验证
  db.pragma("foreign_keys = ON");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤4: 验证数据完整性");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  for (const tableInfo of backupData.tables) {
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${tableInfo.schema.name}"`).get() as {
      cnt: number;
    };
    const expected = tableInfo.rowCount;
    const status = count.cnt >= expected ? "✅" : "⚠️";
    console.log(`  ${status} ${tableInfo.schema.name}: ${count.cnt}/${expected}`);
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

main().catch((err) => {
  console.error("恢复失败:", err);
  process.exit(1);
});
