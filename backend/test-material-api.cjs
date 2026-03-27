const http = require('http');

// 先登录获取 token
function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            resolve(result.data.token);
          } else {
            reject(result.message);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

// 获取原料列表
function getMaterials(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/materials?page=1&pageSize=5',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            resolve(result.data.list);
          } else {
            reject(result.message);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

// 执行测试
async function runTest() {
  try {
    console.log('=== 检查原料 API 返回数据格式 ===\n');
    
    const token = await login();
    console.log('✓ 登录成功\n');
    
    const materials = await getMaterials(token);
    console.log('原料数据示例:');
    materials.slice(0, 3).forEach((mat, index) => {
      console.log(`${index + 1}. ${mat.name}`);
      console.log(`   ID: ${mat.id}`);
      console.log(`   materialType: ${mat.materialType}`);
      console.log(`   所有字段: ${Object.keys(mat).join(', ')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

runTest();