// 测试前端到后端API连接脚本
import axios from 'axios';

async function testAPIConnection() {
  try {
    console.log('🔗 正在测试前端到后端API连接...');
    
    const baseURL = 'http://localhost:3000/api';
    console.log('后端API地址:', baseURL);
    
    // 1. 测试健康检查接口
    console.log('\n🏥 测试健康检查接口...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ 健康检查成功:', healthResponse.data);
    
    // 2. 测试认证接口
    console.log('\n🔐 测试认证接口...');
    try {
      const authResponse = await axios.post(`${baseURL}/auth/login`, {
        username: 'testuser',
        password: 'testpassword'
      });
      console.log('✅ 认证接口连接成功');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ 认证接口连接正常 (返回预期的401错误)');
        console.log('错误信息:', error.response.data);
      } else {
        console.error('❌ 认证接口连接失败:', error.message);
      }
    }
    
    // 3. 测试其他API接口
    console.log('\n📊 测试其他API接口...');
    const endpoints = [
      '/salesmen?page=1&pageSize=10',
      '/formulas?page=1&pageSize=10',
      '/materials?page=1&pageSize=10'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseURL}${endpoint}`);
        console.log(`✅ ${endpoint} 连接成功`);
      } catch (error: any) {
        console.log(`⚠️ ${endpoint} 连接失败:`, error.response?.status || error.message);
      }
    }
    
    // 4. 测试CORS配置
    console.log('\n🌐 测试CORS配置...');
    try {
      const corsResponse = await axios.options(baseURL);
      console.log('✅ CORS预检请求成功');
      console.log('CORS头信息:', corsResponse.headers);
    } catch (error: any) {
      console.log('⚠️ CORS测试:', error.message);
    }
    
    console.log('\n🎉 API连接测试完成！');
    
  } catch (error: any) {
    console.error('❌ API连接测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 命令行执行
testAPIConnection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });