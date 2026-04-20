# TingStudio 环境配置指南

## 📋 概述

本文档详细说明 TingStudio 项目的所有环境配置，包括开发环境、测试环境和生产环境的设置。

## 🎯 环境分类

| 环境 | 用途 | 数据库 | 部署方式 |
|------|------|--------|----------|
| **Development** | 本地开发 | SQLite | `npm run dev` |
| **Staging** | 测试预发布 | MySQL (测试实例) | SCF / CVM |
| **Production** | 生产运行 | MySQL (腾讯云) | SCF + EdgeOne |

## 📁 配置文件位置

```
ting-studio/
├── backend/
│   ├── .env                          # 开发环境变量 (Git 忽略)
│   ├── .env.production               # 生产环境变量 (Git 忽略)
│   ├── .env.example                  # 环境变量示例 (提交到 Git)
│   └── cloudbaserc.json              # 云函数配置
│
├── frontend/
│   ├── .env.development              # 开发环境前端变量
│   ├── .env.production               # 生产环境前端变量
│   └── .edgeone/
│       └── project.json              # EdgeOne 项目配置
│
└── scf/                              # 云函数部署包
    └── .env.production               # 云函数环境变量
```

## ⚙️ 后端环境配置

### 开发环境 (.env)

**文件路径**: [backend/.env](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env)

```bash
# ===========================================
# TingStudio 后端 - 开发环境配置
# ===========================================

# 基础配置
NODE_ENV=development
PORT=3000
HOST=localhost

# 数据库配置 (SQLite)
DB_TYPE=sqlite
DB_PATH=./data/tingstudio.db

# JWT 认证配置
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS 配置 (允许本地开发服务器)
CORS_ORIGIN=http://localhost:5174

# 日志级别
LOG_LEVEL=debug

# AI 服务配置 (可选, 用于本地测试)
# AI_DASHSCOPE_API_KEY=
# AI_DASHSCOPE_MODEL=qwen-plus
# AI_ZHIPU_API_KEY=
# AI_ZHIPU_MODEL=glm-4v-flash
# AI_DEEPSEEK_API_KEY=
# AI_DEEPSEEK_MODEL=deepseek-chat
```

**特点**:
- ✅ 使用 SQLite 本地数据库，无需外部依赖
- ✅ 调试模式开启，详细日志输出
- ✅ 允许跨域访问本地前端
- ✅ JWT 密钥使用默认值（仅用于开发）

### 生产环境 (.env.production)

**文件路径**: [backend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env.production)

```bash
# ===========================================
# TingStudio 后端 - 生产环境配置
# ===========================================

# 基础配置
NODE_ENV=production
PORT=9000
HOST=0.0.0.0

# 数据库配置 (MySQL - 腾讯云 CynosDB)
DB_TYPE=mysql
MYSQL_HOST=sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com
MYSQL_PORT=23996
MYSQL_USER=xprety
MYSQL_PASSWORD=your-secure-password-here
MYSQL_DATABASE=tingstudio
MYSQL_CHARSET=utf8mb4
MYSQL_TIMEZONE=+08:00
MYSQL_CONNECTION_LIMIT=10
MYSQL_CONNECTION_TIMEOUT=10000
MYSQL_ACQUIRE_TIMEOUT=30000

# JWT 认证配置 (生产环境必须使用强密钥)
JWT_SECRET=tingstudio_jwt_secret_key_2024_production_change_me
JWT_EXPIRES_IN=7d

# CORS 配置 (仅允许 EdgeOne 域名)
CORS_ORIGIN=https://tingstudio-frontend-e3hnbwbu.edgeone.cool

# 日志级别
LOG_LEVEL=info

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
HELMET_ENABLED=true

# AI 服务配置 (可选)
# AI_DASHSCOPE_API_KEY=sk-your-production-key
# AI_DASHSCOPE_MODEL=qwen-plus
# AI_ZHIPU_API_KEY=sk-your-production-key
# AI_ZHIPU_MODEL=glm-4v-flash
# AI_DEEPSEEK_API_KEY=sk-your-production-key
# AI_DEEPSEEK_MODEL=deepseek-chat
```

**特点**:
- ✅ 使用企业级 MySQL 数据库
- ✅ 强密码和安全的 JWT 密钥
- ✅ 严格的 CORS 白名单
- ✅ 启用安全中间件 (Helmet, Rate Limiting)
- ✅ 生产级日志级别

### 环境变量示例 (.env.example)

**文件路径**: [backend/.env.example](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env.example) (应提交到 Git)

```bash
# ===========================================
# TingStudio 后端 - 环境变量示例
# 复制此文件为 .env 或 .env.production 并填入实际值
# ===========================================

# 基础配置
NODE_ENV=development
PORT=3000

# 数据库类型: sqlite | mysql
DB_TYPE=sqlite

# SQLite 配置 (DB_TYPE=sqlite 时使用)
DB_PATH=./data/tingstudio.db

# MySQL 配置 (DB_TYPE=mysql 时使用)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=tingstudio

# JWT 配置
JWT_SECRET=change-this-to-a-secure-random-string
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=http://localhost:5174

# 日志级别: debug | info | warn | error
LOG_LEVEL=debug

# AI 服务 (可选)
# AI_DASHSCOPE_API_KEY=
# AI_ZHIPU_API_KEY=
# AI_DEEPSEEK_API_KEY=
```

## 🌐 前端环境配置

### 开发环境 (.env.development)

**文件路径**: [frontend/.env.development](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.development)

```bash
# ===========================================
# TingStudio 前端 - 开发环境配置
# ===========================================

# API 基础地址 (指向本地后端)
VITE_API_BASE_URL=http://localhost:3000/api

# 应用标题 (显示在浏览器标签页)
VITE_APP_TITLE=TingStudio (开发环境)

# 是否启用调试模式
VITE_DEBUG_MODE=true

# 天气 API Key (和风天气, 可选)
# VITE_QWEATHER_KEY=

# 是否启用性能监控 (开发环境关闭)
VITE_ENABLE_PERFORMANCE_MONITOR=false
```

### 生产环境 (.env.production)

**文件路径**: [frontend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.production)

```bash
# ===========================================
# TingStudio 前端 - 生产环境配置
# ===========================================

# API 基础地址 (指向云函数后端)
VITE_API_BASE_URL=https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api

# 应用标题
VITE_APP_TITLE=TingStudio

# 关闭调试模式
VITE_DEBUG_MODE=false

# 天气 API Key (生产环境建议使用付费版)
# VITE_QWEATHER_KEY=

# 启用性能监控
VITE_ENABLE_PERFORMANCE_MONITOR=true
```

## ☁️ 云函数配置

### CloudBase 配置 (cloudbaserc.json)

**文件路径**: [backend/cloudbaserc.json](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/cloudbaserc.json)

```json
{
  "envId": "your-env-id",
  "functionRoot": "./scf",
  "functions": [
    {
      "name": "tingstudio-api",
      "timeout": 30,
      "runtime": "Nodejs16.13",
      "handler": "index.main",
      "installDependency": true,
      "envVariables": {
        "NODE_ENV": "production",
        "PORT": "9000",
        "DB_TYPE": "mysql",
        "MYSQL_HOST": "sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com",
        "MYSQL_PORT": "23996",
        "MYSQL_USER": "xprety",
        "MYSQL_PASSWORD": "***",
        "MYSQL_DATABASE": "tingstudio",
        "JWT_SECRET": "tingstudio_jwt_secret_key_2024_production",
        "JWT_EXPIRES_IN": "7d",
        "CORS_ORIGIN": "https://tingstudio-frontend-e3hnbwbu.edgeone.cool"
      }
    }
  ]
}
```

**重要说明**:
- `envVariables` 中的配置会覆盖 `.env.production` 文件
- 密码等敏感信息不要明文存储，使用腾讯云 SecretManager 更安全
- 函数超时时间建议设置为 30s 以上

### EdgeOne 项目配置

**文件路径**: [frontend/.edgeone/project.json](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.edgeone/project.json)

```json
{
  "Name": "tingstudio-frontend",
  "ProjectId": "pages-zeg2qv2ptbrb"
}
```

## 🔧 数据库双模式切换

项目支持自动适配 SQLite 和 MySQL 两种数据库：

### 切换方法

**1. 修改 DB_TYPE 环境变量**

```bash
# 使用 SQLite (开发环境)
DB_TYPE=sqlite

# 使用 MySQL (生产环境)
DB_TYPE=mysql
```

**2. 根据数据库类型配置对应参数**

SQLite 只需配置:
```bash
DB_PATH=./data/tingstudio.db
```

MySQL 需要配置:
```bash
MYSQL_HOST=xxx
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=xxx
MYSQL_DATABASE=tingstudio
```

### 自动适配逻辑

代码位于 [backend/src/config/database-adapter.ts](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/src/config/database-adapter.ts):

```typescript
export function getDatabase() {
  if (process.env.DB_TYPE === 'mysql') {
    // 返回 MySQL 连接池
    return getMySQLConnection();
  } else {
    // 默认返回 SQLite 实例
    return getSqliteDatabase();
  }
}
```

## 🛡️ 安全配置最佳实践

### 密码和密钥管理

#### ❌ 错误做法
```bash
# 不要这样做!
JWT_SECRET=simple-password
MYSQL_PASSWORD=123456
API_KEY=sk-abc123
```

#### ✅ 正确做法

**1. 使用强随机字符串**
```bash
# 生成强密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 输出示例: a1b2c3d4e5f6... (64字符)
```

**2. 使用环境变量**
```bash
# 从系统环境变量读取
JWT_SECRET=${JWT_SECRET:-default-fallback}
```

**3. 生产环境使用密钥管理服务**
```bash
# 推荐使用腾讯云 SecretManager
# 或 AWS Secrets Manager / HashiCorp Vault
```

### Git 安全

**确保敏感文件不被提交到 Git:**

`.gitignore` 应包含:
```
.env
.env.local
.env.*.local
backend/data/*.db
backend/scf/.env.production
```

**验证 Git 忽略规则:**
```bash
git check-ignore backend/.env
# 如果输出文件路径, 说明已被正确忽略
```

### CORS 配置原则

**开发环境**:
```bash
# 允许本地开发地址
CORS_ORIGIN=http://localhost:5174
```

**生产环境**:
```bash
# 仅允许实际域名
CORS_ORIGIN=https://tingstudio-frontend-e3hnbwbu.edgeone.cool
```

**多域名支持** (逗号分隔):
```bash
CORS_ORIGIN=https://example1.com,https://example2.com
```

## 🚀 快速启动不同环境

### 本地开发环境

```bash
# 1. 复制环境变量模板
cp backend/.env.example backend/.env

# 2. 编辑配置 (使用默认值即可用于开发)
vim backend/.env

# 3. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 4. 启动后端
cd backend && npm run dev
# 服务运行在 http://localhost:3000

# 5. 启动前端 (新终端)
cd frontend && npm run dev
# 服务运行在 http://localhost:5174
```

### 连接远程 MySQL 进行本地开发

有时需要在本地连接远程 MySQL 进行测试:

```bash
# 修改 backend/.env
DB_TYPE=mysql
MYSQL_HOST=sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com
MYSQL_PORT=23996
MYSQL_USER=xprety
MYSQL_PASSWORD=3680xyq3680@
MYSQL_DATABASE=tingstudio

# 启动后端
npm run dev
```

⚠️ **注意**: 确保 IP 在 MySQL 的白名单中

### 生产环境部署

详见 [PRODUCTION_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/PRODUCTION_DEPLOYMENT_GUIDE.md)

## 🔍 环境诊断命令

### 检查当前环境配置

```bash
# 查看后端环境变量
cd backend
node -e "console.log(JSON.stringify(process.env, null, 2))" | grep -E "(NODE_ENV|DB_|PORT|JWT_)"

# 检查数据库连接
npm run test-mysql

# 查看前端环境变量
cd frontend
grep VITE_ .env.*
```

### 验证配置正确性

**后端健康检查**:
```bash
curl http://localhost:3000/health
# 期望输出: {"status":"ok","database":"sqlite"}
```

**前端 API 连接测试**:
```bash
# 在浏览器控制台执行
fetch('/api/health').then(r => r.json()).then(console.log)
```

**CORS 测试**:
```bash
# 检查响应头是否包含正确的 CORS 头
curl -I -X OPTIONS http://localhost:3000/api/auth/login \
  -H "Origin: http://localhost:5174" \
  -H "Access-Control-Request-Method: POST"
```

## 📊 环境对比表

| 配置项 | Development | Staging | Production |
|--------|-------------|---------|------------|
| **NODE_ENV** | development | staging | production |
| **PORT** | 3000 | 3000 | 9000 |
| **DB_TYPE** | sqlite | mysql | mysql |
| **数据库** | 本地 SQLite | 测试 MySQL | 腾讯云 MySQL |
| **JWT_SECRET** | dev-key | staging-key | 强随机字符串 |
| **CORS_ORIGIN** | localhost:5174 | staging.domain.com | edgeone.cool |
| **LOG_LEVEL** | debug | info | info |
| **HELMET** | disabled | enabled | enabled |
| **Rate Limit** | disabled | enabled | enabled |
| **Debug Mode** | true | false | false |

## 🔄 环境切换流程

### 从开发到测试

```bash
# 1. 创建测试环境配置
cp backend/.env backend/.env.staging
cp frontend/.env.development frontend/.env.staging

# 2. 编辑测试环境配置
vim backend/.env.staging
# 设置: NODE_ENV=staging, DB_TYPE=mysql, ...

# 3. 使用测试环境启动
NODE_ENV=staging node backend/dist/index.js
```

### 从测试到生产

```bash
# 1. 构建生产版本
cd backend && npm run build:scf
cd ../frontend && npm run build:deploy

# 2. 部署到云服务
tcb fn deploy tingstudio-api --force
edgeone pages deploy --project-id pages-zeg2qv2ptbrb --dist-dir dist --env production

# 3. 验证部署
curl https://production-url/api/health
```

## ❓ 常见问题

### Q: 如何在不重启的情况下修改环境变量？

**A**: 
- 开发环境: 修改 `.env` 后重启 `npm run dev`
- 生产环境: 修改云函数环境变量后重新部署

### Q: 环境变量不生效怎么办？

**A**: 
1. 检查文件名是否正确 (`.env` 不是 `.env.txt`)
2. 确认没有语法错误 (没有空格, 没有引号问题)
3. 重启服务
4. 检查是否有缓存: `rm -rf node_modules/.cache`

### Q: 如何在 Docker 中使用？

**A**: 创建 `Dockerfile` 和 `docker-compose.yml`:

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    env_file:
      - ./backend/.env.production
    ports:
      - "3000:3000"
```

### Q: 多人协作如何同步环境配置？

**A**: 
1. 提交 `.env.example` 到 Git
2. 新成员复制并填写: `cp .env.example .env`
3. 使用文档记录各环境的具体值 (不包含密码)
4. 敏感信息使用密钥管理服务共享

## 📝 环境配置检查清单

### 新开发者入职 Checklist

- [ ] 克隆项目代码
- [ ] 复制 `.env.example` 为 `.env`
- [ ] 安装 Node.js 18+
- [ ] 运行 `npm install` (前后端分别安装)
- [ ] 配置数据库 (默认使用 SQLite, 无需额外配置)
- [ ] 启动开发服务器 (`npm run dev`)
- [ ] 访问 `http://localhost:5174` 确认前端正常
- [ ] 访问 `http://localhost:3000/health` 确认后端正常
- [ ] 阅读 README.md 了解项目结构

### 部署前检查清单

- [ ] 所有环境变量已正确配置
- [ ] 密码和密钥已更新为生产环境值
- [ ] `DB_TYPE` 设置为 `mysql`
- [ ] `CORS_ORIGIN` 设置为生产域名
- [ ] `JWT_SECRET` 使用强随机字符串
- [ ] 日志级别设置为 `info`
- [ ] 安全中间件已启用 (Helmet, Rate Limiting)
- [ ] 已测试所有核心功能
- [ ] 数据库备份已完成
- [ ] 回滚方案已准备

---

**文档版本**: v1.0  
**最后更新**: 2026-04-20  
**维护者**: TingStudio Team