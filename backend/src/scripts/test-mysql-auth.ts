// 测试MySQL认证系统脚本
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function testMySQLAuth() {
  let connection;
  
  try {
    console.log('🔐 正在测试MySQL认证系统...');
    
    const config = {
      host: 'sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com',
      port: 23996,
      user: 'xprety',
      password: '3680xyq3680@',
      database: 'tingstudio',
    };
    
    // 创建连接
    connection = await mysql.createConnection(config);
    console.log('✅ MySQL连接成功');
    
    // 1. 创建测试用户
    console.log('👤 创建测试用户...');
    const testUserId = 'test-user-' + Date.now();
    const testUsername = 'testuser';
    const testPassword = 'testpassword123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    await connection.query(
      'INSERT INTO users (id, username, password, role, created_at) VALUES (?, ?, ?, "formulist", NOW())',
      [testUserId, testUsername, hashedPassword]
    );
    console.log('✅ 测试用户创建成功');
    
    // 2. 测试用户登录验证
    console.log('🔑 测试用户登录验证...');
    const [users] = await connection.query(
      'SELECT id, username, password, role FROM users WHERE username = ?',
      [testUsername]
    );
    
    if ((users as any[]).length === 0) {
      throw new Error('用户查询失败');
    }
    
    const user = (users as any[])[0];
    console.log('✅ 用户查询成功:', { id: user.id, username: user.username, role: user.role });
    
    // 3. 验证密码
    const validPassword = await bcrypt.compare(testPassword, user.password);
    if (!validPassword) {
      throw new Error('密码验证失败');
    }
    console.log('✅ 密码验证成功');
    
    // 4. 测试错误密码
    const invalidPassword = await bcrypt.compare('wrongpassword', user.password);
    if (invalidPassword) {
      throw new Error('错误密码验证逻辑异常');
    }
    console.log('✅ 错误密码验证逻辑正常');
    
    // 5. 清理测试数据
    console.log('🧹 清理测试数据...');
    await connection.query('DELETE FROM users WHERE id = ?', [testUserId]);
    console.log('✅ 测试数据清理完成');
    
    console.log('\n🎉 MySQL认证系统测试完成！所有功能正常！');
    
  } catch (error: any) {
    console.error('❌ 认证系统测试失败:', error.message);
  } finally {
    // 关闭连接
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL连接已关闭');
    }
  }
}

// 命令行执行
testMySQLAuth()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });