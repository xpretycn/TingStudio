---
trigger: always_on
---
# 构建部署规范

## 1. 构建命令

### 根目录（monorepo）
```bash
npm run dev            # 同时启动前后端开发服务器
npm run build          # 构建前后端
```

### 后端
```bash
npm run dev            # tsx watch 热重载开发
npm run build          # tsc 编译
npm run build:deploy   # esbuild 打包（部署用）
npm run build:scf      # esbuild 打包（云函数用）
npm run test           # vitest 单元测试
npm run test:coverage  # vitest 覆盖率报告
```

### 前端
```bash
npm run dev            # vite 开发服务器 (port 5173)
npm run build          # vue-tsc 类型检查 + vite 构建
npm run build:deploy   # vite 构建（跳过类型检查，部署用）
npm run test           # vitest 单元测试
npm run test:e2e       # Playwright E2E 测试
```

## 2. 构建前检查清单

部署前**必须**通过以下检查：

- [ ] 后端 `npm run build` 无 TypeScript 错误
- [ ] 前端 `npm run build` 无 TypeScript 和构建错误
- [ ] 后端 `npm run test` 所有测试通过
- [ ] 前端 `npm run test:run` 所有测试通过
- [ ] 前端 E2E 测试通过（可选，CI 自动执行）

## 3. 环境变量

### 后端 `.env` 必填项

```
PORT=3000
NODE_ENV=production
JWT_SECRET=<强随机字符串>
CORS_ORIGIN=<生产域名>
```

### 前端 `.env.production` 必填项

```
VITE_API_BASE_URL=/api
```

- **禁止**在 `.env.production` 中包含开发环境配置
- **禁止**提交包含真实密钥的 `.env` 文件

## 4. 部署方式

### 腾讯云 SCF（云函数）
- 配置文件：`backend/scf/` 目录
- 构建命令：`npm run build:scf`
- 部署脚本：`backend/deploy-scf.sh`

### 腾讯云 EdgeOne（前端）
- 配置文件：`frontend/.edgeone/project.json`
- 构建命令：`npm run build:deploy`

### 传统服务器部署
- 后端使用 PM2 管理：`backend/ecosystem.config.js`
- 部署脚本：`backend/deploy-production.sh`

## 5. CI/CD

- CI 配置：`.github/workflows/ci-cd.yml`
- 触发条件：push 到 `main` / `develop`，或 PR 到这两个分支
- 流水线：单元测试 → E2E 测试 → 构建检查
- Node 版本：20，包管理器：pnpm

## 6. 禁止行为

- 禁止跳过类型检查直接部署（`build:deploy` 仅在 CI 已通过类型检查后使用）
- 禁止在构建产物中包含 source map（生产环境）
- 禁止部署未通过测试的代码
- 禁止手动修改服务器上的构建产物
