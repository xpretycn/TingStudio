# TingStudio 生产环境部署指南

## 🎯 部署方案概述

本指南提供将 TingStudio 系统部署到生产环境的完整方案。

### 当前部署架构 (2026-04-20 更新)

**已完成的部署：**
- ✅ **后端服务**: 腾讯云函数 SCF (Serverless)
- ✅ **数据库**: 腾讯云 CynosDB (MySQL)
- ✅ **前端托管**: EdgeOne Pages (CDN)
- ✅ **数据迁移**: 153 条业务记录已迁移至云端
- ✅ **系统状态**: Production Ready

### 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                   用户浏览器                          │
│         (Vue 3 + TDesign UI + Pinia)                │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────┐
│              EdgeOne Pages (CDN)                     │
│          静态资源分发 + 全球加速                      │
│   URL: tingstudio-frontend-e3hnbwbu.edgeone.cool    │
└──────────────────┬──────────────────────────────────┘
                   │ API 调用
┌──────────────────▼──────────────────────────────────┐
│           腾讯云函数 SCF (Serverless)                 │
│        Express + TypeScript + JWT 认证               │
│   URL: tingstudio-prod-d2f6fhumc0432c48...          │
└──────────────────┬──────────────────────────────────┘
                   │ 数据库连接
┌──────────────────▼──────────────────────────────────┐
│           腾讯云 CynosDB (MySQL)                      │
│            企业级关系型数据库                         │
│     (12张表 · 153条记录 · 自动备份)                  │
└─────────────────────────────────────────────────────┘
```

## 🌐 访问地址

### 生产环境 (当前)

| 服务 | 地址 | 状态 |
|------|------|------|
| **前端页面** | `https://tingstudio-frontend-e3hnbwbu.edgeone.cool/login` | ⚠️ 需修复 EdgeOne 401 |
| **后端 API** | `https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api` | ✅ 正常 |
| **健康检查** | `https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health` | ✅ 返回 ok |

### 开发环境 (本地)

| 服务 | 地址 |
|------|------|
| 前端页面 | `http://localhost:5174` |
| 后端 API | `http://localhost:3000/api` |
| 健康检查 | `http://localhost:3000/health` |

## 📋 云服务配置详情

### 1. 腾讯云函数 SCF 配置

**函数名称**: `tingstudio-api`

**配置文件**: [backend/cloudbaserc.json](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/cloudbaserc.json)

**环境变量**:
```json
{
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
```

**部署包位置**: `backend/scf/`

**入口文件**: `backend/scf/index.js`

### 2. 腾讯云 MySQL (CynosDB) 配置

**实例信息**:
- **主机地址**: `sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com`
- **端口**: `23996`
- **用户名**: `xprety`
- **数据库名**: `tingstudio`
- **字符集**: utf8mb4

**表结构**:
| 表名 | 记录数 | 说明 |
|------|--------|------|
| users | 12 | 用户账户 |
| materials | 12 | 材料信息 |
| formulas | 12 | 配方信息 |
| salesmen | 12 | 销售员信息 |
| formula_versions | 36 | 版本快照 |
| material_nutrition | 56 | 营养成分 |
| nutrition_profiles | 6 | 营养标准 |
| export_templates | 6 | 导出模板 |
| export_jobs | 10 | 导出任务 |
| share_configs | 2 | 分享链接 |
| formula_nutrition_summaries | 5 | 营养汇总 |
| **总计** | **153** | - |

**备份策略**: 腾讯云自动备份（保留7天）

### 3. EdgeOne Pages 配置

**项目名称**: `tingstudio-frontend`

**项目ID**: `pages-zeg2qv2ptbrb`

**配置文件**: [frontend/.edgeone/project.json](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.edgeone/project.json)

**构建输出目录**: `frontend/dist/`

**当前问题**: 
- ❌ 访问返回 **401 UNAUTHORIZED**
- 🔧 解决方案: 见 [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)

## 🚀 快速部署流程

### 场景一：首次部署（已完成）

如果需要重新部署或在新环境部署：

#### 1. 准备工作

**安装工具**:
```bash
# 安装腾讯云 CLI
npm install -g @tencent/cli-tcb

# 安装 EdgeOne CLI (可选)
npm install -g @tencent/edgeone-cli
```

#### 2. 构建项目

**构建后端**:
```bash
cd backend
npm run build:scf
# 输出: scf/ 目录
```

**构建前端**:
```bash
cd frontend
npm run build:deploy
# 输出: dist/ 目录
```

#### 3. 部署后端到云函数

**方式一: 使用腾讯云 CLI**
```bash
# 登录腾讯云
tcb login --apiKeyId YOUR_SECRET_ID --apiKey YOUR_SECRET_KEY

# 部署云函数
tcb fn deploy tingstudio-api --force
```

**方式二: 手动上传**
1. 打开 [腾讯云 SCF 控制台](https://console.cloud.tencent.com/scf)
2. 进入函数管理 → 创建函数
3. 上传 `backend/scf/` 目录的 zip 包
4. 配置环境变量（见上方配置）
5. 设置触发器为 API 网关触发

**方式三: 使用 Web 控制台**
详见 [SCF_MANUAL_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/SCF_MANUAL_DEPLOYMENT_GUIDE.md)

#### 4. 初始化数据库

**创建数据库和表结构**:
```bash
cd backend
npm run init-mysql
```

**迁移现有数据** (从 SQLite):
```bash
npm run migrate-to-mysql
# 或使用手动迁移工具
node src/scripts/manual-migrate.js
```

#### 5. 部署前端到 EdgeOne

**方式一: 使用 EdgeOne CLI**
```bash
cd frontend

# 登录 EdgeOne
edgeone login --apiKeyId YOUR_SECRET_ID --apiKey YOUR_SECRET_KEY

# 部署
edgeone pages deploy \
    --project-id pages-zeg2qv2ptbrb \
    --dist-dir dist \
    --env production
```

**方式二: 手动上传**
1. 打开 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 进入项目 `tingstudio-frontend`
3. 点击"部署"→"手动上传"
4. 选择 `frontend/dist/` 目录所有文件
5. 开始上传并等待完成

**方式三: 使用部署脚本**
```bash
chmod +x frontend/deploy-edgeone.sh
./frontend/deploy-edgeone.sh
```

#### 6. 验证部署

**测试后端 API**:
```bash
curl https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health
# 期望输出: {"status":"ok","timestamp":"...","database":"mysql"}
```

**测试前端访问**:
- 浏览器打开: `https://tingstudio-frontend-e3hnbwbu.edgeone.cool/login`
- 应该看到登录页面（如遇 401 错误，见下方故障排除）

**测试登录功能**:
- 在登录页输入任意用户名密码
- 应该调用后端 API 并返回错误信息（说明前后端连通）

### 场景二：更新部署

当有代码更新时，只需重新构建和部署对应部分：

#### 更新后端
```bash
cd backend
npm run build:scf
tcb fn deploy tingstudio-api --force
```

#### 更新前端
```bash
cd frontend
npm run build:deploy
edgeone pages deploy --project-id pages-zeg2qv2ptbrb --dist-dir dist --env production
```

#### 更新数据库结构
```bash
# 如果有新的 SQL 变更脚本
cd backend
npx ts-node src/scripts/update-mysql-schema.ts
```

## ⚙️ 环境配置详解

### 后端环境变量

**开发环境** ([backend/.env](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env)):
```bash
NODE_ENV=development
PORT=3000
DB_TYPE=sqlite
DB_PATH=./data/tingstudio.db
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5174
```

**生产环境** ([backend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/.env.production)):
```bash
NODE_ENV=production
PORT=9000
DB_TYPE=mysql
MYSQL_HOST=sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com
MYSQL_PORT=23996
MYSQL_USER=xprety
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=tingstudio
JWT_SECRET=tingstudio_jwt_secret_key_2024_production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://tingstudio-frontend-e3hnbwbu.edgeone.cool
```

**AI 服务配置** (可选，在 `.env` 中添加):
```bash
AI_DASHSCOPE_API_KEY=sk-your-key
AI_DASHSCOPE_MODEL=qwen-plus
AI_ZHIPU_API_KEY=sk-your-key
AI_ZHIPU_MODEL=glm-4v-flash
AI_DEEPSEEK_API_KEY=sk-your-key
AI_DEEPSEEK_MODEL=deepseek-chat
```

### 前端环境变量

**开发环境** ([frontend/.env.development](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.development)):
```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=TingStudio (开发环境)
```

**生产环境** ([frontend/.env.production](file:///d:/ProgramData/workspace-codeby/ting-studio/frontend/.env.production)):
```bash
VITE_API_BASE_URL=https://tingstudio-prod-df6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api
VITE_APP_TITLE=TingStudio
```

## 🔍 监控与维护

### 日志查看

**云函数日志**:
1. 登录 [SCF 控制台](https://console.cloud.tencent.com/scf)
2. 进入函数 `tingstudio-api`
3. 点击"日志查询"
4. 查看实时日志和历史日志

**EdgeOne 日志**:
1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 进入项目 `tingstudio-frontend`
3. 查看访问日志和错误日志

### 性能监控

**关键指标**:
- **API 响应时间**: < 500ms (P95)
- **错误率**: < 1%
- **并发处理能力**: SCF 自动扩缩容
- **CDN 命中率**: > 90%

**监控工具**:
- 腾讯云监控面板
- 自定义健康检查接口 (`/api/health`)
- 前端性能监控 (可选集成 Sentry)

### 数据库监控

**连接池状态**:
- 最大连接数: 10
- 连接超时: 10s
- 空闲超时: 300s

**慢查询优化**:
- 定期分析慢查询日志
- 为高频查询字段添加索引
- 考虑使用 Redis 缓存热点数据

### 备份策略

**自动备份**:
- 腾讯云 MySQL 自动每日全量备份
- 保留最近 7 天的备份
- 支持一键回滚到任意时间点

**手动备份** (可选):
```bash
# 导出数据库
mysqldump -h sh-cynosdbmysql-grp-1fwxtcew.sql.tencentcdb.com \
  -P 23996 -u xprety -p tingstudio > backup_$(date +%Y%m%d).sql
```

## 🛠️ 故障排除

### 常见问题与解决方案

#### 1. EdgeOne 401 UNAUTHORIZED

**现象**: 访问前端页面返回 401 错误

**解决方案**: 参考 [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md)

**快速修复**:
1. 登录 EdgeOne 控制台
2. 找到项目 `tingstudio-frontend`
3. 点击"预览"按钮生成新链接
4. 或清除 CDN 缓存

#### 2. 后端 API 502/503 错误

**现象**: 前端可以打开，但 API 调用失败

**可能原因**:
- 云函数冷启动延迟
- 数据库连接池耗尽
- 内存不足 (OOM)

**解决方案**:
1. 查看 SCF 函数日志
2. 检查数据库连接数
3. 增加函数内存配置 (建议 512MB+)
4. 启用预置并发减少冷启动

#### 3. 数据库连接失败

**现象**: API 返回数据库连接错误

**诊断步骤**:
```bash
# 测试数据库连接
cd backend
npm run test-mysql
```

**常见原因**:
- 密码错误或过期
- IP 白名单限制
- 数据库实例停机

**解决方案**:
1. 检查 `.env.production` 中的数据库配置
2. 确认数据库实例运行状态
3. 检查安全组是否允许 SCF 访问数据库端口

#### 4. CORS 跨域错误

**现象**: 浏览器控制台显示 CORS 相关错误

**解决方案**:
1. 检查后端 `CORS_ORIGIN` 配置是否正确
2. 确认前端域名在允许列表中
3. 检查 API 网关的 CORS 配置

#### 5. 前端样式加载异常

**现象**: 页面显示但样式错乱

**可能原因**:
- CDN 缓存了旧版本的 CSS 文件
- 构建时路径配置错误

**解决方案**:
1. 清除 CDN 缓存
2. 重新构建并部署前端
3. 检查 Vite 的 base 配置

## 📊 成本估算

### 月度费用预估 (参考)

| 服务 | 规格 | 月费用 (约) |
|------|------|------------|
| **SCF 云函数** | 128MB内存, 100万次调用 | ¥0-10 |
| **CynosDB MySQL** | 1核2G, 50GB存储 | ¥50-100 |
| **EdgeOne Pages** | 10GB流量/月 | ¥0-20 |
| **API 网关** | 100万次调用 | ¥0-10 |
| **总计** | | **¥60-140/月** |

**省钱技巧**:
- 开发环境使用本地 SQLite，节省数据库费用
- 利用 SCF 免费额度 (每月100万次免费调用)
- EdgeOne 有一定的免费额度
- 合理设置缓存策略，减少 API 调用次数

## 🔐 安全最佳实践

### 密钥管理
- ❌ 不要将密钥提交到 Git 仓库
- ✅ 使用环境变量存储敏感信息
- ✅ 定期轮换 API Key 和数据库密码
- ✅ 使用腾讯云 KMS 加密敏感配置

### 网络安全
- ✅ 所有通信强制使用 HTTPS
- ✅ 配置严格的 CORS 白名单
- ✅ 启用 WAF 防护 (可选)
- ✅ 设置 IP 黑名单防护暴力破解

### 数据安全
- ✅ 数据库启用 SSL 连接
- ✅ 敏感字段加密存储 (密码等)
- ✅ 定期备份数据
- ✅ 实施数据访问审计

## 📝 部署清单

### 新环境部署 Checklist

- [ ] 准备腾讯云账号和 API 密钥
- [ ] 创建 CynosDB MySQL 实例
- [ ] 创建 SCF 云函数并配置环境变量
- [ ] 创建 EdgeOne Pages 项目
- [ ] 构建后端代码 (`npm run build:scf`)
- [ ] 构建前端代码 (`npm run build:deploy`)
- [ ] 初始化数据库表结构
- [ ] 迁移业务数据 (如有)
- [ ] 部署后端到 SCF
- [ ] 部署前端到 EdgeOne
- [ ] 配置自定义域名 (可选)
- [ ] 配置 HTTPS 证书 (通常自动)
- [ ] 测试所有核心功能
- [ ] 配置监控告警
- [ ] 编写运维文档

### 版本发布 Checklist

- [ ] 更新版本号 (package.json)
- [ ] 更新 CHANGELOG.md
- [ ] 运行测试确保通过
- [ ] 构建生产版本
- [ ] 备份数据库
- [ ] 部署后端
- [ ] 部署前端
- [ ] 验证功能正常
- [ ] 通知团队成员

## 🔄 回滚方案

### 快速回滚

**回滚后端**:
```bash
# 使用之前的部署版本
tcb fn deploy tingstudio-api --version $PREVIOUS_VERSION_ID
```

**回滚前端**:
1. 在 EdgeOne 控制台查看部署历史
2. 选择之前的版本进行回滚
3. 或重新上传之前的 dist 包

**回滚数据库**:
1. 登录 CynosDB 控制台
2. 选择要恢复的时间点
3. 执行回滚操作 (支持恢复到7天内任意时刻)

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [README.md](file:///d:/ProgramData/workspace-codeby/ting-studio/README.md) | 项目总览 |
| [EDGEONE_DEPLOYMENT_FIX.md](file:///d:/ProgramData/workspace-codeby/ting-studio/EDGEONE_DEPLOYMENT_FIX.md) | EdgeOne 故障修复 |
| [SCF_MANUAL_DEPLOYMENT_GUIDE.md](file:///d:/ProgramData/workspace-codeby/ting-studio/SCF_MANUAL_DEPLOYMENT_GUIDE.md) | SCF 手动部署指南 |
| [backend/API_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/API_DOC.md) | API 接口文档 |
| [backend/DATABASE_DOC.md](file:///d:/ProgramData/workspace-codeby/ting-studio/backend/DATABASE_DOC.md) | 数据库设计文档 |

## 💡 最佳实践

### 开发流程
1. 本地开发使用 SQLite，快速迭代
2. 功能测试通过后再部署到测试环境
3. 使用 CI/CD 自动化部署流程
4. 发布前必须经过完整的功能测试

### 性能优化
1. 前端启用 Gzip/Brotli 压缩
2. 合理利用 CDN 缓存静态资源
3. 数据库查询添加适当索引
4. 使用连接池管理数据库连接
5. 对热点数据实施缓存策略

### 可靠性保障
1. 关键操作实现重试机制
2. 设置合理的超时时间
3. 实施优雅降级策略
4. 配置完善的监控告警

---

**文档版本**: v2.0  
**最后更新**: 2026-04-20  
**适用场景**: 生产环境部署、系统迁移、故障排查