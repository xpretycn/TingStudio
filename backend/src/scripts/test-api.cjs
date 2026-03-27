const http = require('http');

// 测试登录获取 token
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
            console.log('✅ 登录成功');
            resolve(result.data.token);
          } else {
            console.log('❌ 登录失败:', result.message);
            reject(result.message);
          }
        } catch (e) {
          console.log('❌ 解析响应失败:', e);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ 请求失败:', e);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// 测试获取原料列表
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
            console.log('✅ 获取原料列表成功，共', result.data.pagination.total, '条记录');
            resolve(result.data.list);
          } else {
            console.log('❌ 获取原料列表失败:', result.message);
            reject(result.message);
          }
        } catch (e) {
          console.log('❌ 解析响应失败:', e);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ 请求失败:', e);
      reject(e);
    });

    req.end();
  });
}

// 测试获取配方列表
function getFormulas(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/formulas?page=1&pageSize=5',
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
            console.log('✅ 获取配方列表成功，共', result.data.pagination.total, '条记录');
            // 检查是否包含 ratio_factor 字段
            if (result.data.list.length > 0) {
              const firstFormula = result.data.list[0];
              if (firstFormula.hasOwnProperty('ratioFactor')) {
                console.log('✅ 配方数据包含 ratioFactor 字段:', firstFormula.ratioFactor);
              } else {
                console.log('⚠️  配方数据缺少 ratioFactor 字段');
              }
            }
            resolve(result.data.list);
          } else {
            console.log('❌ 获取配方列表失败:', result.message);
            reject(result.message);
          }
        } catch (e) {
          console.log('❌ 解析响应失败:', e);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ 请求失败:', e);
      reject(e);
    });

    req.end();
  });
}

// 执行测试
async function runTests() {
  try {
    console.log('=== 开始 API 测试 ===\n');
    
    console.log('1. 测试用户登录...');
    const token = await login();
    
    console.log('\n2. 测试获取原料列表...');
    await getMaterials(token);
    
    console.log('\n3. 测试获取配方列表...');
    await getFormulas(token);
    
    console.log('\n✅ 所有 API 测试通过！');
    
  } catch (error) {
    console.log('\n❌ 测试失败:', error);
  }
}

runTests();