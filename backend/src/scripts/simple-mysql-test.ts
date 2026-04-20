// 简单的MySQL连接测试脚本
import mysql from 'mysql2/promise';

async function testMySQLConnection() {
  try {
    console.log('🔌 正在测试腾讯MySQL连接...');
    
    const config = {
      host: 'sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com',
      port: 23996,
      user: 'xprety',
      password: '3680xyq3680@',
      database: 'tingstudio',
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 60000,
    };
    
    console.log('连接配置:', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database
    });
    
    // 创建连接
    const connection = await mysql.createConnection(config);
    console.log('✅ MySQL连接成功');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 查询测试成功:', rows);
    
    // 检查数据库是否存在
    const [databases] = await connection.execute('SHOW DATABASES LIKE "tingstudio"');
    const dbExists = (databases as any[]).length > 0;
    
    if (dbExists) {
      console.log('✅ 数据库 "tingstudio" 已存在');
      
      // 检查表
      const [tables] = await connection.execute('SHOW TABLES');
      console.log('✅ 数据库表检查完成，表数量:', (tables as any[]).length);
      
      // 显示表列表
      (tables as any[]).forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`  ${index + 1}. ${tableName}`);
      });
    } else {
      console.log('⚠️ 数据库 "tingstudio" 不存在，需要初始化');
    }
    
    // 关闭连接
    await connection.end();
    console.log('🔌 MySQL连接已关闭');
    console.log('\n🎉 腾讯MySQL连接测试完成！');
    
  } catch (error: any) {
    console.error('❌ MySQL连接测试失败:', error.message);
    console.error('错误代码:', error.code);
    console.error('错误详情:', error);
  }
}

// 命令行执行
testMySQLConnection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });