// 模拟浏览器中 axios 发送请求，检查 keyword 是否正确传递到后端
const axios = require('axios');

async function main() {
  // Login
  const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
    username: 'admin', password: 'admin123'
  });
  const token = loginRes.data.data.token;
  console.log('Token OK');

  // Test: 模拟前端 axios 请求（和浏览器完全一样）
  const res = await axios.get('http://localhost:3000/api/materials', {
    params: { keyword: '山', page: 1, pageSize: 10 },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('\n=== axios GET with params keyword=山 ===');
  console.log('Request URL:', res.config.url);
  console.log('Request params:', JSON.stringify(res.config.params));
  console.log('Response total:', res.data.pagination.total);
  console.log('Response list count:', res.data.list.length);
  console.log('Names:', res.data.list.map(m => m.name).join(', '));
}
main().catch(e => console.error(e.message));
