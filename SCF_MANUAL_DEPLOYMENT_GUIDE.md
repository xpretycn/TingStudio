# TingStudio 云函数手动部署指南

## 🎯 部署目标

将 TingStudio 后端服务从 SQLite 迁移到腾讯 MySQL，并重新部署到现有的腾讯云函数平台。

## ✅ 已完成的工作

1. **数据库迁移**：从 SQLite 迁移到腾讯 MySQL
2. **代码适配**：后端代码已适配 MySQL 数据库
3. **配置更新**：生产环境配置已更新
4. **项目构建**：云函数版本已构建完成

## 📋 部署文件清单

需要上传到云函数的文件：

```
backend/scf/
├── index.js                    # 云函数入口文件
├── package.json               # 依赖配置
├── .env.production            # 生产环境配置
└── dist/
    └── index.js.js            # 构建后的应用代码
```

## 🚀 手动部署步骤

### 第一步：登录腾讯云控制台

1. 访问 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云函数 SCF** 服务
3. 找到现有的函数：`tingstudio-api`

### 第二步：更新函数代码

1. **上传代码文件**：
   - 将 `backend/scf/index.js` 上传到云函数
   - 将 `backend/scf/dist/index.js.js` 上传到云函数

2. **上传依赖配置**：
   - 将 `backend/scf/package.json` 上传到云函数

### 第三步：配置环境变量

在云函数控制台设置以下环境变量：

```bash
# 基础配置
NODE_ENV=production
PORT=9000

# 数据库配置
DB_TYPE=mysql
MYSQL_HOST=sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com
MYSQL_PORT=23996
MYSQL_USER=xprety
MYSQL_PASSWORD=3680xyq3680@
MYSQL_DATABASE=tingstudio

# JWT 配置
JWT_SECRET=tingstudio_jwt_secret_key_2024_production
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=https://tingstudio-frontend-e3hnbwbu.edgeone.cool

# AI 服务配置
AI_DASHSCOPE_API_KEY=sk-681bcbef68de4509a8e3ac0f2f861d7e
AI_DASHSCOPE_MODEL=qwen-plus
AI_DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

AI_ZHIPU_API_KEY=e71fbf9b28144226a0daadce3d7a272b.gqQqIAJJ9As3C2dL
AI_ZHIPU_MODEL=glm-4v-flash
AI_ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4

AI_DEEPSEEK_API_KEY=sk-8c7e4f9ad9034f2d97d43a9ec2905775
AI_DEEPSEEK_MODEL=deepseek-chat
AI_DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

AI_TIMEOUT=120000
```

### 第四步：配置函数设置

1. **执行方法**：`index.main_handler`
2. **运行环境**：Node.js 18.15
3. **超时时间**：120秒
4. **内存配置**：512MB

### 第五步：部署和测试

1. **点击部署**：保存并部署函数
2. **等待生效**：通常需要1-2分钟
3. **测试连接**：访问以下地址验证服务状态

## 🔗 测试地址

- **健康检查**：`https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health`
- **前端地址**：`https://tingstudio-frontend-e3hnbwbu.edgeone.cool/login`

## 📊 验证步骤

### 1. 健康检查验证
```bash
curl https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health

# 预期响应：{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 2. 数据库连接验证
```bash
# 测试登录接口（应该返回401而不是500）
curl -X POST https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 预期响应：{"success":false,"message":"用户名或密码错误"}
```

### 3. 前端功能验证
1. 访问 `https://tingstudio-frontend-e3hnbwbu.edgeone.cool/login`
2. 尝试登录（应该显示"用户名或密码错误"）
3. 尝试注册新用户

## 🚨 故障排除

### 常见问题及解决方案

#### 1. 数据库连接失败
- **症状**：返回500错误
- **解决**：检查MySQL连接信息是否正确

#### 2. CORS错误
- **症状**：前端无法调用API
- **解决**：确认CORS_ORIGIN配置正确

#### 3. 函数启动失败
- **症状**：函数状态异常
- **解决**：检查函数日志，确认依赖安装正确

#### 4. 内存不足
- **症状**：函数执行超时或崩溃
- **解决**：增加内存配置到1024MB

### 查看日志

在云函数控制台查看实时日志：
1. 进入函数详情页
2. 点击"日志查询"
3. 查看错误信息和调试日志

## 🔧 快速部署命令（如果支持CLI）

如果已经配置了cloudbase-cli，可以尝试以下命令：

```bash
# 进入后端目录
cd backend

# 登录腾讯云（需要交互式登录）
cloudbase login

# 部署云函数
cloudbase framework deploy
```

## 📞 技术支持

如果遇到部署问题，请检查：
1. 腾讯云函数控制台的错误日志
2. MySQL数据库连接状态
3. 前端控制台的网络请求

## 🎉 部署完成标志

- ✅ 健康检查接口返回正常
- ✅ 前端可以正常加载登录页面
- ✅ 登录功能返回正确的错误信息（401）
- ✅ 用户注册功能正常
- ✅ 所有API接口可以正常调用

---

**注意**：部署完成后，前端会自动使用新的MySQL数据库，所有数据将持久化存储在腾讯云MySQL中。

**部署时间**：整个手动部署过程大约需要10-15分钟。