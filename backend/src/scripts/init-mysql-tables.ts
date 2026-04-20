// 初始化MySQL表结构脚本
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initMySQLTables() {
  let connection;
  
  try {
    console.log('🚀 正在初始化腾讯MySQL表结构...');
    
    const config = {
      host: 'sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com',
      port: 23996,
      user: 'xprety',
      password: '3680xyq3680@',
      database: 'tingstudio',
      multipleStatements: true, // 允许执行多条SQL语句
    };
    
    console.log('连接配置:', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database
    });
    
    // 创建连接
    connection = await mysql.createConnection(config);
    console.log('✅ MySQL连接成功');
    
    // 读取SQL初始化脚本
    const initSqlPath = path.join(__dirname, 'mysql-init.sql');
    if (!fs.existsSync(initSqlPath)) {
      throw new Error(`初始化SQL文件不存在: ${initSqlPath}`);
    }
    
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    console.log('📄 读取初始化SQL脚本完成');
    
    // 执行SQL脚本
    console.log('📊 正在执行表结构初始化...');
    await connection.query(initSql);
    console.log('✅ 表结构初始化完成');
    
    // 验证表结构
    console.log('🔍 验证表结构...');
    const [tables] = await connection.query('SHOW TABLES');
    const tableCount = (tables as any[]).length;
    console.log(`✅ 数据库包含 ${tableCount} 个表`);
    
    // 显示表列表
    console.log('\n📋 表列表:');
    (tables as any[]).forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });
    
    // 检查关键表的结构
    const keyTables = ['users', 'formulas', 'materials', 'salesmen'];
    console.log('\n🔍 检查关键表结构...');
    
    for (const tableName of keyTables) {
      try {
        const [columns] = await connection.query(`DESCRIBE ${tableName}`);
        console.log(`✅ ${tableName} 表结构正常，包含 ${(columns as any[]).length} 个字段`);
      } catch (error) {
        console.log(`❌ ${tableName} 表不存在或结构异常`);
      }
    }
    
    console.log('\n🎉 腾讯MySQL表结构初始化完成！');
    
  } catch (error: any) {
    console.error('❌ 表结构初始化失败:', error.message);
    console.error('错误代码:', error.code);
  } finally {
    // 关闭连接
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL连接已关闭');
    }
  }
}

// 命令行执行
initMySQLTables()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('初始化失败:', error);
    process.exit(1);
  });