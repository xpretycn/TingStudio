// 测试腾讯MySQL连接脚本
import { connectMySQL, closeMySQL, getMySQLPool } from '../config/mysql.js';
import { logger } from '../utils/logger.js';

async function testMySQLConnection() {
  try {
    console.log('正在测试腾讯MySQL连接...');
    
    // 连接到MySQL
    await connectMySQL();
    console.log('✅ MySQL连接成功');
    
    // 测试查询
    const pool = getMySQLPool();
    const [rows] = await pool.execute('SELECT 1 as test');
    console.log('✅ 查询测试成功:', rows);
    
    // 检查数据库是否存在
    const [databases] = await pool.execute('SHOW DATABASES LIKE "tingstudio"');
    const dbExists = (databases as any[]).length > 0;
    
    if (dbExists) {
      console.log('✅ 数据库 "tingstudio" 已存在');
      
      // 切换到数据库并检查表
      await pool.execute('USE tingstudio');
      const [tables] = await pool.execute('SHOW TABLES');
      console.log('✅ 数据库表检查完成，表数量:', (tables as any[]).length);
    } else {
      console.log('⚠️ 数据库 "tingstudio" 不存在，需要初始化');
    }
    
    console.log('\n🎉 腾讯MySQL连接测试完成！');
    
  } catch (error: any) {
    console.error('❌ MySQL连接测试失败:', error.message);
    console.error('详细错误信息:', error);
  } finally {
    // 关闭连接
    await closeMySQL();
    console.log('🔌 MySQL连接已关闭');
  }
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  testMySQLConnection()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}