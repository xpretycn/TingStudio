// 简单数据迁移脚本 - 从 SQLite 迁移到 MySQL
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function simpleMigrate() {
  console.log('🚀 开始简单数据迁移...\n');

  try {
    // 1. 检查 SQLite 数据库文件
    const sqlitePath = path.join(__dirname, '../../tingstudio.db');
    console.log('1. 检查 SQLite 数据库文件...');
    if (fs.existsSync(sqlitePath)) {
      const stats = fs.statSync(sqlitePath);
      console.log(`   ✅ 数据库文件存在: ${sqlitePath}`);
      console.log(`   📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log('   ❌ 数据库文件不存在');
      return;
    }

    // 2. 检查 MySQL 连接
    console.log('\n2. 检查 MySQL 连接...');
    try {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: 'sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com',
        port: 23996,
        user: 'xprety',
        password: '3680xyq3680@',
        database: 'tingstudio'
      });
      
      console.log('   ✅ MySQL 连接成功');
      
      // 检查 MySQL 表
      const [tables] = await connection.execute('SHOW TABLES');
      console.log(`   📊 MySQL 表数量: ${tables.length}`);
      
      await connection.end();
    } catch (error: any) {
      console.log('   ❌ MySQL 连接失败:', error.message);
      return;
    }

    // 3. 使用现有的迁移脚本
    console.log('\n3. 执行数据迁移脚本...');
    
    // 动态导入迁移脚本
    const { migrateToMySQL } = await import('./migrate-to-mysql.js');
    const result = await migrateToMySQL();
    
    console.log('\n📋 迁移结果:');
    console.log(`   成功: ${result.success}`);
    console.log(`   消息: ${result.message}`);
    console.log(`   迁移表数: ${result.migratedTables.length}`);
    console.log(`   迁移记录数: ${result.migratedRecords}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ 错误列表:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (result.success) {
      console.log('\n🎉 数据迁移完成！');
    } else {
      console.log('\n⚠️ 数据迁移完成，但有错误');
    }

  } catch (error: any) {
    console.error('❌ 迁移过程出错:', error.message);
  }
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleMigrate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}