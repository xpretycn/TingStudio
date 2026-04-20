// 详细数据迁移脚本 - 从 SQLite 迁移到 MySQL
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase as connectSqlite, query as sqliteQuery, getDb } from '../config/database.js';
import { connectMySQL, query as mysqlQuery, closeMySQL } from '../config/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MigrationResult {
  success: boolean;
  message: string;
  migratedTables: string[];
  migratedRecords: number;
  errors: string[];
  details: Record<string, any>;
}

async function checkMySQLTables(mysqlPool: any): Promise<string[]> {
  try {
    const result = await mysqlQuery(`SHOW TABLES`);
    return result.map((row: any) => Object.values(row)[0]);
  } catch (error) {
    console.error('检查MySQL表失败:', error);
    return [];
  }
}

async function checkSQLiteTables(sqliteDb: any): Promise<string[]> {
  try {
    const result = sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    if (result && result.length > 0) {
      return result[0].values.map((row: any[]) => row[0]);
    }
    return [];
  } catch (error) {
    console.error('检查SQLite表失败:', error);
    return [];
  }
}

async function getTableDataCount(sqliteDb: any, tableName: string): Promise<number> {
  try {
    const result = sqliteDb.exec(`SELECT COUNT(*) as count FROM ${tableName}`);
    if (result && result.length > 0 && result[0].values) {
      return result[0].values[0][0];
    }
    return 0;
  } catch (error) {
    console.error(`获取表 ${tableName} 数据量失败:`, error);
    return 0;
  }
}

async function migrateTable(tableName: string, sqliteDb: any, mysqlPool: any): Promise<{ success: boolean; records: number; error?: string }> {
  try {
    console.log(`\n📊 开始迁移表: ${tableName}`);
    
    // 从 SQLite 读取数据
    const sqliteResult = sqliteDb.exec(`SELECT * FROM ${tableName}`);
    if (!sqliteResult || sqliteResult.length === 0 || !sqliteResult[0].values) {
      console.log(`表 ${tableName} 没有数据，跳过迁移`);
      return { success: true, records: 0 };
    }

    const columns = sqliteResult[0].columns;
    const rows = sqliteResult[0].values;

    console.log(`表 ${tableName} 有 ${rows.length} 条记录`);
    console.log(`列: ${columns.join(', ')}`);

    if (rows.length === 0) {
      console.log(`表 ${tableName} 为空，跳过迁移`);
      return { success: true, records: 0 };
    }

    // 检查MySQL表是否存在
    try {
      await mysqlQuery(`SELECT 1 FROM ${tableName} LIMIT 1`);
    } catch (error) {
      console.error(`MySQL表 ${tableName} 不存在，跳过迁移`);
      return { success: false, records: 0, error: `表 ${tableName} 不存在` };
    }

    // 构建插入语句
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    // 批量插入到 MySQL
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      try {
        await mysqlQuery(sql, row);
        migratedCount++;
        if (migratedCount % 100 === 0) {
          console.log(`已迁移 ${migratedCount} 条记录...`);
        }
      } catch (error: any) {
        // 如果是重复键错误，跳过
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`跳过重复记录: ${tableName} - ${row[0]}`);
          continue;
        }
        errorCount++;
        console.error(`迁移记录失败 (表 ${tableName}):`, error.message);
        if (errorCount > 10) {
          console.error('错误过多，停止迁移此表');
          break;
        }
      }
    }

    console.log(`✅ 表 ${tableName} 迁移完成: ${migratedCount}/${rows.length} 条记录`);
    return { success: true, records: migratedCount };
  } catch (error: any) {
    console.error(`迁移表 ${tableName} 失败:`, error.message);
    return { success: false, records: 0, error: error.message };
  }
}

async function detailedMigrateToMySQL(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    migratedTables: [],
    migratedRecords: 0,
    errors: [],
    details: {}
  };

  try {
    console.log('🚀 开始详细数据迁移: SQLite → MySQL\n');

    // 1. 连接到 SQLite 数据库
    console.log('1. 连接到 SQLite 数据库...');
    await connectSqlite();
    const sqliteDb = getDb();
    console.log('✅ SQLite 数据库连接成功\n');

    // 2. 连接到 MySQL 数据库
    console.log('2. 连接到 MySQL 数据库...');
    await connectMySQL();
    console.log('✅ MySQL 数据库连接成功\n');

    // 3. 检查 SQLite 中的所有表
    console.log('3. 检查 SQLite 数据库表...');
    const sqliteTables = await checkSQLiteTables(sqliteDb);
    console.log(`SQLite 中发现 ${sqliteTables.length} 个表: ${sqliteTables.join(', ')}\n`);

    // 4. 检查 MySQL 中的所有表
    console.log('4. 检查 MySQL 数据库表...');
    const mysqlTables = await checkMySQLTables(mysqlQuery);
    console.log(`MySQL 中发现 ${mysqlTables.length} 个表: ${mysqlTables.join(', ')}\n`);

    // 5. 检查每个表的数据量
    console.log('5. 检查 SQLite 表数据量...');
    const tableDataCounts: Record<string, number> = {};
    for (const tableName of sqliteTables) {
      const count = await getTableDataCount(sqliteDb, tableName);
      tableDataCounts[tableName] = count;
      console.log(`   ${tableName}: ${count} 条记录`);
    }
    console.log('');

    // 6. 迁移每个表的数据
    console.log('6. 开始数据迁移...\n');
    
    for (const tableName of sqliteTables) {
      if (mysqlTables.includes(tableName)) {
        const migrationResult = await migrateTable(tableName, sqliteDb, mysqlQuery);
        
        if (migrationResult.success) {
          result.migratedTables.push(tableName);
          result.migratedRecords += migrationResult.records;
          result.details[tableName] = {
            expected: tableDataCounts[tableName],
            migrated: migrationResult.records,
            status: 'success'
          };
        } else {
          result.errors.push(`表 ${tableName} 迁移失败: ${migrationResult.error}`);
          result.details[tableName] = {
            expected: tableDataCounts[tableName],
            migrated: 0,
            status: 'failed',
            error: migrationResult.error
          };
        }
      } else {
        console.log(`⚠️  MySQL中不存在表 ${tableName}，跳过迁移`);
        result.errors.push(`MySQL中不存在表 ${tableName}`);
        result.details[tableName] = {
          expected: tableDataCounts[tableName],
          migrated: 0,
          status: 'skipped',
          error: '表不存在于MySQL中'
        };
      }
    }

    // 7. 关闭数据库连接
    await closeMySQL();

    result.success = result.errors.length === 0;
    result.message = result.success 
      ? `数据迁移完成！成功迁移 ${result.migratedRecords} 条记录到 ${result.migratedTables.length} 个表`
      : `数据迁移完成，但有 ${result.errors.length} 个错误`;

    console.log('\n🎉 数据迁移完成！');
    console.log(`迁移结果: ${result.message}`);
    console.log(`成功迁移的表: ${result.migratedTables.join(', ')}`);
    console.log(`总迁移记录数: ${result.migratedRecords}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ 迁移错误:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n📋 详细迁移报告:');
    for (const [tableName, detail] of Object.entries(result.details)) {
      console.log(`  ${tableName}: ${detail.migrated}/${detail.expected} 条记录 (${detail.status})`);
    }

  } catch (error: any) {
    console.error('❌ 数据迁移失败:', error.message);
    result.message = `数据迁移失败: ${error.message}`;
    result.errors.push(error.message);
  }

  return result;
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  detailedMigrateToMySQL()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

export { detailedMigrateToMySQL };