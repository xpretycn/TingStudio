// 创建MySQL数据库脚本
import mysql from 'mysql2/promise';

async function createMySQLDatabase() {
  let connection;
  
  try {
    console.log('🚀 正在创建腾讯MySQL数据库...');
    
    const config = {
      host: 'sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com',
      port: 23996,
      user: 'xprety',
      password: '3680xyq3680@',
      // 不指定数据库，先连接到默认数据库
    };
    
    console.log('连接配置:', {
      host: config.host,
      port: config.port,
      user: config.user
    });
    
    // 创建连接
    connection = await mysql.createConnection(config);
    console.log('✅ MySQL连接成功');
    
    // 创建数据库
    console.log('📊 正在创建数据库 "tingstudio"...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS `tingstudio` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ 数据库 "tingstudio" 创建成功');
    
    // 使用新创建的数据库
    await connection.execute('USE tingstudio');
    console.log('✅ 已切换到数据库 "tingstudio"');
    
    // 验证数据库
    const [databases] = await connection.execute('SHOW DATABASES LIKE "tingstudio"');
    const dbExists = (databases as any[]).length > 0;
    
    if (dbExists) {
      console.log('✅ 数据库验证成功');
      
      // 显示当前数据库信息
      const [currentDb] = await connection.execute('SELECT DATABASE() as current_db');
      console.log('📋 当前数据库:', (currentDb as any[])[0].current_db);
      
      console.log('\n🎉 腾讯MySQL数据库创建完成！');
    } else {
      console.error('❌ 数据库创建失败');
    }
    
  } catch (error: any) {
    console.error('❌ 数据库创建失败:', error.message);
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
createMySQLDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('创建失败:', error);
    process.exit(1);
  });