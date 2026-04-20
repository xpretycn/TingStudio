// 手动数据迁移脚本 - 从 SQLite 迁移到 MySQL
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import sqlite3 from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function manualMigrate() {
  console.log("🚀 开始手动数据迁移...\n");

  try {
    // 1. 检查 SQLite 数据库文件
    const sqlitePath = path.join(__dirname, "../../data/tingstudio.db");
    console.log("1. 检查 SQLite 数据库文件...");

    if (!fs.existsSync(sqlitePath)) {
      console.log("   ❌ SQLite 数据库文件不存在:", sqlitePath);
      return;
    }

    const stats = fs.statSync(sqlitePath);
    console.log("   ✅ 数据库文件存在");
    console.log(`   📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // 2. 连接到 SQLite 数据库
    console.log("\n2. 连接到 SQLite 数据库...");
    const sqliteDb = sqlite3(sqlitePath, { readonly: true });
    console.log("   ✅ SQLite 连接成功");

    // 3. 获取 SQLite 表列表
    const sqliteTables = sqliteDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();
    console.log(`   📊 发现 ${sqliteTables.length} 个表: ${sqliteTables.map(t => t.name).join(", ")}`);

    // 4. 检查每个表的数据量
    console.log("\n3. 检查 SQLite 表数据量:");
    const tableCounts = {};
    for (const table of sqliteTables) {
      const count = sqliteDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      tableCounts[table.name] = count.count;
      console.log(`   ${table.name}: ${count.count} 条记录`);
    }

    // 5. 连接到 MySQL 数据库
    console.log("\n4. 连接到 MySQL 数据库...");
    const mysqlConnection = await mysql.createConnection({
      host: "sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com",
      port: 23996,
      user: "xprety",
      password: "3680xyq3680@",
      database: "tingstudio",
    });
    console.log("   ✅ MySQL 连接成功");

    // 6. 检查 MySQL 表
    const [mysqlTables] = await mysqlConnection.execute("SHOW TABLES");
    console.log(`   📊 MySQL 表数量: ${mysqlTables.length}`);

    const mysqlTableNames = mysqlTables.map(row => Object.values(row)[0]);
    console.log(`   📋 MySQL 表: ${mysqlTableNames.join(", ")}`);

    // 7. 开始数据迁移
    console.log("\n5. 开始数据迁移...");
    let totalMigrated = 0;
    let migratedTables = [];

    for (const table of sqliteTables) {
      const tableName = table.name;

      if (!mysqlTableNames.includes(tableName)) {
        console.log(`   ⚠️  跳过表 ${tableName} (MySQL中不存在)`);
        continue;
      }

      console.log(`\n   📊 迁移表: ${tableName}`);

      try {
        // 获取 SQLite 表数据
        const sqliteData = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
        console.log(`     数据量: ${sqliteData.length} 条记录`);

        if (sqliteData.length === 0) {
          console.log(`     ✅ 表 ${tableName} 为空，跳过迁移`);
          continue;
        }

        // 获取表结构
        const columns = Object.keys(sqliteData[0]);
        console.log(`     列: ${columns.join(", ")}`);

        // 迁移数据
        let migratedCount = 0;
        for (const row of sqliteData) {
          try {
            const values = columns.map(col => row[col]);
            const placeholders = columns.map(() => "?").join(", ");
            const sql = `INSERT IGNORE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

            await mysqlConnection.execute(sql, values);
            migratedCount++;
          } catch (error) {
            // 忽略重复键错误
            if (error.code !== "ER_DUP_ENTRY") {
              console.log(`     ❌ 插入记录失败:`, error.message);
            }
          }
        }

        console.log(`     ✅ 成功迁移 ${migratedCount}/${sqliteData.length} 条记录`);
        totalMigrated += migratedCount;
        migratedTables.push(tableName);
      } catch (error) {
        console.log(`     ❌ 迁移表 ${tableName} 失败:`, error.message);
      }
    }

    // 8. 关闭连接
    sqliteDb.close();
    await mysqlConnection.end();

    console.log("\n🎉 数据迁移完成！");
    console.log(`📋 迁移总结:`);
    console.log(`   成功迁移表: ${migratedTables.length} 个`);
    console.log(`   成功迁移记录: ${totalMigrated} 条`);
    console.log(`   迁移的表: ${migratedTables.join(", ")}`);
  } catch (error) {
    console.error("❌ 迁移过程出错:", error.message);
  }
}

// 执行迁移
manualMigrate().catch(console.error);
