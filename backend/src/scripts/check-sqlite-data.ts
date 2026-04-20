// 检查本地SQLite数据库结构和数据
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, getDb } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkSQLiteData() {
  try {
    console.log('🔍 检查本地SQLite数据库...\n');

    // 连接到 SQLite 数据库
    await connectDatabase();
    const db = getDb();

    // 1. 检查所有表
    console.log('1. 数据库表列表:');
    const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    if (tablesResult && tablesResult.length > 0) {
      const tables = tablesResult[0].values.map((row: any[]) => row[0]);
      console.log(`   发现 ${tables.length} 个表: ${tables.join(', ')}\n`);

      // 2. 检查每个表的数据
      for (const tableName of tables) {
        console.log(`2. 检查表: ${tableName}`);
        
        // 检查表结构
        const schemaResult = db.exec(`PRAGMA table_info(${tableName})`);
        if (schemaResult && schemaResult.length > 0) {
          console.log(`   表结构:`);
          schemaResult[0].values.forEach((row: any[]) => {
            console.log(`     - ${row[1]} (${row[2]})`);
          });
        }

        // 检查数据量
        const countResult = db.exec(`SELECT COUNT(*) as count FROM ${tableName}`);
        if (countResult && countResult.length > 0) {
          const count = countResult[0].values[0][0];
          console.log(`   数据量: ${count} 条记录`);
        }

        // 显示前几条数据
        const dataResult = db.exec(`SELECT * FROM ${tableName} LIMIT 3`);
        if (dataResult && dataResult.length > 0 && dataResult[0].values.length > 0) {
          console.log(`   示例数据:`);
          const columns = dataResult[0].columns;
          dataResult[0].values.forEach((row: any[]) => {
            const rowData: Record<string, any> = {};
            columns.forEach((col: string, index: number) => {
              rowData[col] = row[index];
            });
            console.log(`     ${JSON.stringify(rowData)}`);
          });
        }
        console.log('');
      }
    } else {
      console.log('   未找到任何表\n');
    }

    // 3. 检查数据库文件大小
    const dbPath = path.join(__dirname, '../../tingstudio.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`3. 数据库文件信息:`);
      console.log(`   路径: ${dbPath}`);
      console.log(`   大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   修改时间: ${stats.mtime}`);
    }

    console.log('\n✅ SQLite数据库检查完成');

  } catch (error: any) {
    console.error('❌ 检查SQLite数据库失败:', error.message);
  }
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  checkSQLiteData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('检查脚本执行失败:', error);
      process.exit(1);
    });
}