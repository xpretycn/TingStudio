// 初始化腾讯MySQL数据库脚本
import { connectMySQL, closeMySQL, getMySQLPool } from '../config/mysql.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initMySQLDatabase() {
  let pool;
  
  try {
    console.log('🚀 开始初始化腾讯MySQL数据库...');
    
    // 连接到MySQL
    await connectMySQL();
    pool = getMySQLPool();
    console.log('✅ MySQL连接成功');
    
    // 读取SQL初始化脚本
    const initSqlPath = path.join(__dirname, 'mysql-init.sql');
    if (!fs.existsSync(initSqlPath)) {
      throw new Error(`初始化SQL文件不存在: ${initSqlPath}`);
    }
    
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    console.log('📄 读取初始化SQL脚本完成');
    
    // 分割SQL语句并执行
    const sqlStatements = initSql
      .split(';')
      .map(sql => sql.trim())
      .filter(sql => sql.length > 0 && !sql.startsWith('--'));
    
    console.log(`📊 准备执行 ${sqlStatements.length} 条SQL语句`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i] + ';';
      
      try {
        await pool.execute(sql);
        successCount++;
        console.log(`✅ [${i + 1}/${sqlStatements.length}] SQL执行成功`);
      } catch (error: any) {
        // 如果是数据库已存在或表已存在的错误，忽略
        if (error.code === 'ER_DB_CREATE_EXISTS' || error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`⚠️ [${i + 1}/${sqlStatements.length}] SQL已存在，跳过: ${error.code}`);
          successCount++;
        } else {
          errorCount++;
          console.error(`❌ [${i + 1}/${sqlStatements.length}] SQL执行失败:`, error.message);
          console.error('失败SQL:', sql.substring(0, 200) + '...');
        }
      }
    }
    
    console.log(`\n📊 初始化结果:`);
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${errorCount} 条`);
    console.log(`📋 总计: ${sqlStatements.length} 条`);
    
    if (errorCount === 0) {
      console.log('\n🎉 腾讯MySQL数据库初始化完成！');
      
      // 验证表结构
      console.log('\n🔍 验证表结构...');
      await pool.execute('USE tingstudio');
      const [tables] = await pool.execute('SHOW TABLES');
      const tableCount = (tables as any[]).length;
      console.log(`✅ 数据库包含 ${tableCount} 个表`);
      
      // 显示表列表
      (tables as any[]).forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`  ${index + 1}. ${tableName}`);
      });
      
    } else {
      console.log('\n⚠️ 数据库初始化完成，但有部分错误');
    }
    
  } catch (error: any) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('详细错误信息:', error);
  } finally {
    // 关闭连接
    if (pool) {
      await closeMySQL();
      console.log('🔌 MySQL连接已关闭');
    }
  }
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  initMySQLDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}