# TingStudio 云端部署计划 — 腾讯云专版

> **项目**: tingstudio v2.0.0  
> **架构**: 前后端分离 (Vue 3 + Express) → Serverless 迁移  
> **前端托管**: 腾讯云 EdgeOne Pages (边缘静态)  
> **后端运行**: 腾讯云开发 TCB (Serverless 云函数)  
> **数据库**: TCB MySQL / SQLite (持久化存储)  
> **定位**: 国内用户 · 24h 常驻 · AI 功能 · 高性价比  
> **文档版本**: v4.0 (腾讯云 EdgeOne+TCB 版)  
> **编制日期**: 2026-04-20

---

## 一、方案总览与架构图

### 1.1 为什么选择 EdgeOne + TCB？

| 维度           |    EdgeOne Pages + TCB    | 传统轻量服务器  |
| :------------- | :-----------------------: | :-------------: |
| **月费用**     |       **¥0~18** ⭐        |      ¥3~7       |
| **冷启动**     | 边缘 <100ms / 函数 ~500ms |       0s        |
| **国内速度**   |     ★★★★★ (边缘节点)      |      ★★★★★      |
| **运维复杂度** |   **极低 (自动扩缩容)**   | 中 (需手动维护) |
| **SSL/CDN**    |       **自动内置**        |     需配置      |
| **AI 适配性**  |    ✅ 支持长超时(120s)    |       ✅        |
| **备案要求**   |         需要 ICP          |    需要 ICP     |
| **免费额度**   |       ** generous**       |       无        |

### 1.2 最终架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                   │
│                    https://ting.yourdomain.com                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS (EdgeOne 自动)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              腾讯云 EdgeOne (边缘加速网络)                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  EdgeOne Pages — Vue3 SPA 静态托管                            │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  dist/ (Vite 构建产物)                                  │  │   │
│  │  │  - index.html + SPA Router                             │  │   │
│  │  │  - assets/*.js *.css (长期缓存)                         │  │   │
│  │  │  - 自动 Gzip/Brotli 压缩                               │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  边缘节点: 北京/上海/广州/成都/香港...                       │   │
│  │  缓存策略: HTML no-cache / Assets immutable                 │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
├─────────────────────────┤ /api/* (回源)                              │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  腾讯云开发 TCB (Serverless 云函数)                           │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ Web 函数入口  │→│ Express App   │→│ 业务路由          │  │   │
│  │  │ (scf-entry)  │  │ (原后端代码)  │  │ /api/auth/*     │  │   │
│  │  └──────────────┘  └──────────────┘  │ /api/materials/* │  │   │
│  │                                       │ /api/formulas/*  │  │   │
│  │  ┌──────────────┐                     │ /api/ai/*        │  │   │
│  │  │ TCB MySQL    │ ← ORM 查询         │ ...              │  │   │
│  │  │ (或 SQLite)  │                     └──────────────────┘  │   │
│  │  └──────────────┘                                            │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐                         │   │
│  │  │ COS 存储桶   │←│ 文件上传      │                         │   │
│  │  │ (uploads/)   │  │ (Excel/PDF)  │                         │   │
│  │  └──────────────┘  └──────────────┘                         │   │
│  │                                                              │   │
│  │  环境变量: JWT_SECRET / AI_*_API_KEY / DB_*                  │   │
│  │  超时时间: 120s (支持 AI 长耗时请求)                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

CI/CD: GitHub Push → 自动触发 EdgeOne + TCB 同步部署
```

### 1.3 核心优势总结

```
✅ EdgeOne 全球 3200+ 边缘节点，国内访问 <50ms
✅ TCB Serverless 按量计费，个人项目基本免费
✅ 自动 HTTPS、自动 CDN、自动 DDoS 防护
✅ 无需管理服务器，零运维负担
✅ AI 接口超时可配 120s，完美支持长耗时推理
✅ Git Push 即上线，与 GitHub Actions 完美集成
```

---

## 二、服务选型与定价详解

### 2.1 EdgeOne Pages 定价

| 项目         |   免费额度    | 个人用量预估  | 月费用 |
| :----------- | :-----------: | :-----------: | :----: |
| 请求数       |  10 万次/月   |   ~3~5 万次   | **¥0** |
| 流量         |    10GB/月    |    ~2~5 GB    | **¥0** |
| CDN 回源流量 |  含在流量内   |       -       | **¥0** |
| 自定义域名   |     支持      |     1 个      | **¥0** |
| SSL 证书     |     自动      | Let's Encrypt | **¥0** |
| **超出部分** | ¥0.15/GB 流量 |       -       |  ¥<5   |

> 💡 **结论**: 个人项目完全在免费额度内，**月费 ¥0**

### 2.2 TCB 定价

| 项目                |    免费额度    | 个人用量预估 | 月费用 |
| :------------------ | :------------: | :----------: | :----: |
| 云函数调用次数      |  100 万次/月   |  ~5~10 万次  | **¥0** |
| 云函数资源量 (GB-s) | 400 万 GB-s/月 |  ~20~50 万   | **¥0** |
| 外网出流量          |     5GB/月     |   ~1~3 GB    | **¥0** |
| MySQL 存储          |    5GB 免费    |  ~100MB~1GB  | **¥0** |
| MySQL 读 CU         |  100 万次/月   | ~10~30 万次  | **¥0** |
| MySQL 写 CU         |  100 万次/月   |  ~1~5 万次   | **¥0** |
| COS 存储            |   50GB 免费    | ~100MB~500MB | **¥0** |
| COS 请求            |  500 万次/月   |  ~1~5 万次   | **¥0** |
| **超出部分**        |    按量付费    |      -       |  ¥<18  |

> 💡 **结论**: 个人项目完全在免费额度内，**月费 ¥0**
>
> 📊 **最坏情况** (高频使用): 月费约 **¥8~18**

### 2.3 年度成本汇总

| 项目          |     年费用     | 说明                  |
| :------------ | :------------: | :-------------------- |
| EdgeOne Pages |     **¥0**     | 在免费额度内          |
| TCB (基础版)  |   **¥0~216**   | 大概率 ¥0             |
| 域名 (.com)   |    **¥55**     | Namesilo / 腾讯云域名 |
| **合计**      | **¥55~271/年** | 日均 **¥0.15~0.74**   |

---

## 三、前置准备（Day 0）

### 3.1 注册账号与服务开通

```bash
# 1. 注册腾讯云账号
# 访问: https://cloud.tencent.com/register
# 完成实名认证 (个人: 身份证 + 人脸识别)

# 2. 开通 EdgeOne 服务
# 访问: https://console.cloud.tencent.com/edgeone
# 选择「标准版」(有免费额度)

# 3. 开通腾讯云开发 TCB
# 访问: https://console.cloud.tencent.com/tcb/env/index
# 创建新环境:
#   - 环境名称: tingstudio-prod
#   - 地域: 华南-广州 (推荐, 速度快)
#   - 后端运行环境: Node.js 18
#   - 包含: 云函数 + MySQL + 对象存储(COS)
```

### 3.2 备案准备（如需自定义域名）

```
⚠️ 使用 EdgeOne 绑定自定义域名需要 ICP 备案

临时方案 (无需备案):
  - 使用 EdgeOne 提供的默认域名: xxx.tedge.cn
  - 格式: {env-id}.ap-guangzhou.app.tcloudbase.com (TCB)
  - 适合开发测试阶段

正式方案 (需要备案):
  Day 1: 购买域名 (腾讯云/Namesilo, .com 约 ¥55/年)
  Day 2: 在腾讯云控制台提交 ICP 备案申请
  Day 7~15: 管局审核通过
  Day 16+: 绑定自定义域名到 EdgeOne
```

### 3.3 本地环境检查

```bash
# 确认本地项目可以正常构建
cd d:\ProgramData\workspace-codeby\ting-studio

# 前端构建验证
cd frontend && pnpm install && pnpm build
ls -la dist/

# 后端构建验证
cd ../backend && pnpm install && pnpm build
ls -la dist/
```

---

## 四、详细部署步骤

### 阶段一：TCB 后端部署（40 分钟）

#### 4.1 安装 TCB CLI 工具

```bash
# 全局安装 @cloudbase/cli
npm install -g @cloudbase/cli

# 验证安装成功
tcb --version

# 登录腾讯云 (会打开浏览器授权)
tcb login
```

#### 4.2 初始化 TCB 项目结构

```bash
cd d:\ProgramData\workspace-codeby\ting-studio

# 初始化 TCB 配置 (选择已有项目)
tcb init --env tingstudio-prod

# 这会创建 cloudbaserc.json 配置文件
```

创建 `backend/cloudbaserc.json`：

```json
{
  "envId": "tingstudio-prod",
  "$schema": "https://framework-1258016615.tcloudbase.com/v2/schema.json",
  "functionRoot": "./",
  "functions": [
    {
      "name": "tingstudio-api",
      "timeout": 120,
      "runtime": "Nodejs18.15",
      "installDependency": true,
      "handler": "index.main_handler",
      "envVariables": {
        "NODE_ENV": "production",
        "PORT": "9000"
      },
      "path": "/",
      "memorySize": 512,
      "triggers": [
        {
          "type": "http",
          "config": {
            "path": "/",
            "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
          }
        }
      ]
    }
  ],
  "framework": {
    "name": "express",
    "plugins": {
      "client": {
        "use": "@cloudbase/framework-plugin-client",
        "inputs": {
          "outputPath": "../frontend/dist"
        }
      },
      "database": {
        "use": "@cloudbase/framework-plugin-database",
        "inputs": {}
      },
      "storage": {
        "use": "@cloudbase/framework-plugin-storage",
        "inputs": {}
      },
      "auth": {
        "use": "@cloudbase/framework-plugin-auth",
        "inputs": {}
      }
    }
  }
}
```

#### 4.3 创建云函数入口文件

创建 `backend/scf/index.js`（云函数入口）：

```javascript
const express = require("express");
const path = require("path");
const serverless = require("express-ws-serverless");

const app = express();

app.use(serverless({ app }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 9000;

async function bootstrap() {
  const cors = require("cors");
  const helmet = require("helmet");
  const compression = require("compression");
  const morgan = require("morgan");
  const { createAppRouter } = require("./dist/routes/index.js");
  const { errorHandler } = require("./dist/middleware/errorHandler.js");

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(morgan("combined"));

  app.use("/api", createAppRouter());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "接口不存在" });
  });

  app.use(errorHandler);

  return app;
}

let cachedApp = null;

exports.main_handler = async (event, context) => {
  if (!cachedApp) {
    cachedApp = await bootstrap();
  }

  return new Promise((resolve, reject) => {
    cachedApp(event, context, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};
```

> ⚠️ **注意**: 云函数环境下不能使用 `app.listen()`，需用 `serverless` 适配器。

#### 4.4 修改数据库配置（适配 TCB）

创建 `backend/src/config/database-tcb.ts`：

```typescript
import Database from "better-sqlite3";
import path from "path";
import os from "os";

export function getDatabase(): Database.Database {
  const dbPath = process.env.DB_PATH || path.join(os.tmpdir(), "tingstudio.db");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function connectDatabase(): Promise<void> {
  try {
    const db = getDatabase();

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    console.log(`[DB] 连接成功: ${dbPath}`);
  } catch (error) {
    console.error("[DB] 连接失败:", error);
    throw error;
  }
}
```

> 💡 **说明**: TCB 云函数的 `/tmp` 目录最大 512MB 且持久化（同一实例复用），适合存放 SQLite。
> 如数据量大，建议升级到 TCB MySQL（见下方 4.4.1）。

##### 4.4.1 可选：升级到 TCB MySQL（推荐生产环境）

```bash
# 1. 在 TCB 控制台创建 MySQL 实例
# 控制台: https://console.cloud.tencent.com/tcb/env/database
# - 实例名: tingstudio-mysql
# - 规格: 基础版 1核2G (免费额度内)
# - 字符集: utf8mb4

# 2. 获取连接信息
# 主机: tingstudio-mysql-shard0.sql.tencentcdb.com
# 端口: 20306
# 用户名: root
# 密码: (控制台生成)

# 3. 安装 mysql2 并修改数据库模块
cd backend
pnpm add mysql2
pnpm add -D @types/mysql2
```

创建 `backend/src/config/database-mysql.ts`：

```typescript
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export async function getPool(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TCB_MYSQL_HOST || "shard0.mysql.tencentcdb.com",
      port: parseInt(process.env.TCB_MYSQL_PORT || "20306"),
      user: process.env.TCB_MYSQL_USER || "root",
      password: process.env.TCB_MYSQL_PASSWORD || "",
      database: process.env.TCB_MYSQL_DATABASE || "tingstudio",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "+08:00",
    });

    await pool
      .getConnection()
      .then(conn => {
        console.log("[MySQL] 连接成功");
        conn.release();
      })
      .catch(err => {
        console.error("[MySQL] 连接失败:", err);
        throw err;
      });
  }

  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = await getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}
```

#### 4.5 修改文件上传配置（适配 COS）

创建 `backend/src/utils/cosUpload.ts`：

```typescript
import COS from "cos-nodejs-sdk-v5";
import fs from "fs";
import path from "path";

let cosClient: COS | null = null;

function getCOSClient(): COS {
  if (!cosClient) {
    cosClient = new COS({
      SecretId: process.env.TC_SECRET_ID || "",
      SecretKey: process.env.TC_SECRET_KEY || "",
    });
  }
  return cosClient;
}

interface UploadResult {
  url: string;
  key: string;
}

export async function uploadToCOS(localFilePath: string, folder: string = "uploads"): Promise<UploadResult> {
  const client = getCOSClient();
  const bucket = process.env.TC_COS_BUCKET || "tingstudio-xxx";
  const region = process.env.TC_COS_REGION || "ap-guangzhou";

  const fileName = path.basename(localFilePath);
  const key = `${folder}/${Date.now()}_${fileName}`;

  return new Promise((resolve, reject) => {
    client.uploadFile(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        FilePath: localFilePath,
        onProgress: progressData => {
          console.log(`[COS] 上传进度: ${Math.round(progressData.percent * 100)}%`);
        },
      },
      (err, data) => {
        if (err) reject(err);
        else
          resolve({
            url: `https://${bucket}.cos.${region}.myqcloud.com/${key}`,
            key,
          });
      },
    );
  });
}

export async function deleteFromCOS(key: string): Promise<void> {
  const client = getCOSClient();
  const bucket = process.env.TC_COS_BUCKET || "";
  const region = process.env.TC_COS_REGION || "";

  return new Promise((resolve, reject) => {
    client.deleteObject({ Bucket: bucket, Region: region, Key: key }, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}
```

```bash
# 安装 COS SDK
cd backend
pnpm add cos-nodejs-sdk-v5
```

#### 4.6 更新 package.json（添加 TCB 依赖）

更新 `backend/package.json` 的 dependencies：

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^12.8.0",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "cos-nodejs-sdk-v5": "^2.13.0",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.18.0",
    "xlsx": "^0.18.5",
    "express-ws-serverless": "^1.0.4"
  }
}
```

#### 4.7 配置 TCB 环境变量

在 TCB 控制台 → 环境 → 环境配置 → 环境变量：

| 变量名                 | 值                   | 说明                      |
| :--------------------- | :------------------- | :------------------------ |
| `NODE_ENV`             | `production`         | 生产模式                  |
| `PORT`                 | `9000`               | 监听端口 (TCB 固定)       |
| `JWT_SECRET`           | `<随机生成>`         | `openssl rand -base64 32` |
| `JWT_EXPIRES_IN`       | `7d`                 | Token 有效期              |
| `CORS_ORIGIN`          | `https://你的域名`   | 前端地址                  |
| `DB_PATH`              | `/tmp/tingstudio.db` | SQLite 路径               |
| `UPLOAD_DIR`           | `/tmp/uploads`       | 上传目录 (临时)           |
| `MAX_FILE_SIZE`        | `10485760`           | 10MB                      |
| `LOG_LEVEL`            | `info`               | 日志级别                  |
| `AI_DASHSCOPE_API_KEY` | `<你的 Key>`         | 阿里通义千问              |
| `AI_DASHSCOPE_MODEL`   | `qwen-plus`          | 默认模型                  |
| `AI_ZHIPU_API_KEY`     | `<你的 Key>`         | 智谱 GLM                  |
| `AI_DEEPSEEK_API_KEY`  | `<你的 Key>`         | DeepSeek                  |
| `AI_TIMEOUT`           | `120000`             | AI 超时 (ms)              |
| `TC_SECRET_ID`         | `<从 CAM 获取>`      | 腾讯云密钥 ID             |
| `TC_SECRET_KEY`        | `<从 CAM 获取>`      | 腾讯云密钥 Key            |
| `TC_COS_BUCKET`        | `tingstudio-xxx`     | COS 存储桶名              |
| `TC_COS_REGION`        | `ap-guangzhou`       | COS 地域                  |

> 🔑 **获取 TC_SECRET_ID/KEY**:
> 访问 https://console.cloud.tencent.com/cam/capi → 新建密钥

#### 4.8 部署云函数到 TCB

```bash
cd d:\ProgramData\workspace-codeby\ting-studio\backend

# 方式 A: 使用 tcb cli 部署
tcb fn deploy tingstudio-api ./scf

# 方式 B: 使用 cloudbase framework 一键部署
tcb framework deploy

# 部署完成后获取访问路径:
# https://{env-id}.ap-guangzhou.app.tcloudbase.com
```

#### 4.9 验证后端部署

```bash
# 测试健康检查
curl https://tingstudio-prod.ap-guangzhou.app.tcloudbase.com/health
# 预期: {"status":"ok","timestamp":"..."}

# 测试 API (替换实际 URL)
curl https://tingstudio-prod.ap-guangzhou.app.tcloudbase.com/api/materials?page=1&pageSize=10
```

---

### 阶段二：EdgeOne Pages 前端部署（15 分钟）

#### 4.10 构建前端产物

```bash
cd d:\ProgramData\workspace-codeby\ting-studio\frontend

# 确保 API 地址指向 TCB
# 编辑 vite.config.ts 或 .env.production
```

创建 `frontend/.env.production`：

```env
VITE_API_BASE_URL=https://tingstudio-prod.ap-guangzhou.app.tcloudbase.com
VITE_APP_TITLE=TingStudio
```

```bash
# 构建
pnpm install
pnpm build

# 验证产物
ls -la dist/
# 应包含 index.html, assets/ 目录
```

#### 4.11 配置 EdgeOne Pages

**方式 A: 通过控制台操作**

1. 打开 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone/site)
2. 点击 **"新建站点"**
3. 选择 **"静态站点"**
4. 配置参数：

| 参数             | 值                           |
| :--------------- | :--------------------------- |
| **站点名称**     | `tingstudio-frontend`        |
| **接入方式**     | GitHub 关联仓库              |
| **GitHub 仓库**  | 选择 `tingstudio` 仓库       |
| **根目录**       | `frontend`                   |
| **构建命令**     | `pnpm install && pnpm build` |
| **输出目录**     | `dist`                       |
| **Node.js 版本** | `20`                         |
| **框架预设**     | `Vite` (自动检测)            |

5. 点击 **"开始部署"**

**方式 B: 使用 EdgeOne CLI**

```bash
# 安装 EdgeOne CLI
npm install -g @tencent/edgeone-cli

# 登录
eo login

# 初始化配置
eo init

# 部署
eo deploy frontend/dist
```

#### 4.12 配置 SPA 路由和缓存规则

在 EdgeOne 控制台 → 站点 → 规则引擎：

**规则 1: API 代理到 TCB**

```
匹配条件: 请求路径以 /api/ 开头
执行动作: 回源重写 → 目标 URL: https://tingstudio-prod.ap-guangzhou.app.tcloudbase.com/api/*
```

**规则 2: SPA Fallback**

```
匹配条件: 请求路径不是静态资源 (排除 .js/.css/.png 等)
执行动作: 重定向 → /index.html
```

**规则 3: 静态资源缓存**

```
匹配条件: 请求路径包含 assets/ 目录
执行动作: 缓存 TTL = 30 天, Cache-Control: public, immutable
```

**规则 4: HTML 不缓存**

```
匹配条件: 请求路径是 index.html
执行动作: 缓存 TTL = 0 (no-cache), 强制回源
```

#### 4.13 绑定自定义域名（可选）

```bash
# 1. 在 EdgeOne 控制台添加自定义域名
# 站点设置 → 域名管理 → 添加域名
# 输入: ting.yourdomain.com

# 2. DNS 解析记录 (在域名服务商处添加):
# 类型: CNAME
# 主机记录: ting (或 @)
# 记录值: xxx.cdn.dnsv1.com (EdgeOne 提供)

# 3. EdgeOne 会自动申请 Let's Encrypt SSL 证书
# 等待证书签发完成 (通常 5~10 分钟)

# 4. 验证 HTTPS 访问
curl -I https://ting.yourdomain.com
# 预期: HTTP/2 200
```

#### 4.14 验证前端部署

```bash
# 访问默认域名
https://xxx.tedge.cn

# 或访问自定义域名 (已备案)
https://ting.yourdomain.com

# 检查项:
# ✅ 页面正常加载
# ✅ SPA 路由切换不刷新页面
# ✅ API 请求正常返回数据
# ✅ 登录功能可用
# ✅ 文件上传/下载正常
```

---

### 阶段三：联调与优化（15 分钟）

#### 4.15 CORS 配置确认

确保 TCB 云函数的 CORS 设置正确：

```typescript
// backend/src/index.ts 或中间件中确认:
app.use(
  cors({
    origin: [
      "https://xxx.tedge.cn", // EdgeOne 默认域名
      "https://ting.yourdomain.com", // 自定义域名
      "http://localhost:5173", // 本地开发
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
```

#### 4.16 性能优化配置

**EdgeOne 优化项**:

| 优化项        | 配置值  | 效果                   |
| :------------ | :-----: | :--------------------- |
| Brotli 压缩   |  启用   | JS/CSS 体积减少 15~25% |
| HTTP/2        |  启用   | 多路复用，提升并发     |
| HTTP/3 (QUIC) |  启用   | 弱网环境加速明显       |
| HSTS          |  启用   | 安全增强               |
| 最小 TLS 版本 | TLS 1.2 | 兼容性与安全平衡       |
| 智能压缩图片  |  启用   | WebP/AVIF 自动转换     |

**TCB 优化项**:

| 优化项          | 配置值 | 效果                     |
| :-------------- | :----: | :----------------------- |
| 函数内存        | 512MB  | 平衡性能与成本           |
| 函数超时        |  120s  | 支持 AI 长请求           |
| 预置并发        |  1~2   | 降低冷启动概率           |
| 实例预留 (付费) |  可选  | 彻底消除冷启动 (~¥30/月) |

#### 4.17 AI 功能专项验证

```bash
# 测试 AI 接口 (确保超时足够)
curl -X POST https://tingstudio-prod.ap-guangzhou.app.tcloudbase.com/api/ai/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"content":"测试配方内容"}' \
  --max-time 120

# 如果遇到超时错误:
# 1. 检查 TCB 函数超时设置是否 ≥120s
# 2. 检查 AI_TIMEOUT 环境变量是否设置
# 3. 检查 AI API Key 是否正确
```

---

## 五、CI/CD 自动化部署

### 5.1 GitHub Actions 工作流

更新 `.github/workflows/deploy-tencent.yml`：

```yaml
name: Deploy to TencentCloud (EdgeOne + TCB)

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  test-and-build:
    name: 测试 & 构建
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
          cache-dependency-path: '**/pnpm-lock.yaml'

      - name: Install dependencies & Test
        run: |
          cd frontend && pnpm install --frozen-lockfile && pnpm test:run
          cd ../backend && pnpm install --frozen-lockfile

      - name: Build Frontend
        run: cd frontend && pnpm build

      - name: Build Backend
        run: cd backend && pnpm build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            frontend/dist/
            backend/dist/
            backend/scf/
          retention-days: 1

  deploy-tcb:
    name: 部署后端到 TCB
    needs: test-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .

      - name: Install TencentCloud CLI
        run: npm install -g @cloudbase/cli @tencent/edgeone-cli

      - name: Configure TencentCloud Credentials
        env:
          TC_SECRET_ID: ${{ secrets.TC_SECRET_ID }}
          TC_SECRET_KEY: ${{ secrets.TC_SECRET_KEY }}
        run: |
          cat > ~/.tccli.default.configure.json << EOF
          {
            "secretId": "${TC_SECRET_ID}",
            "secretKey": "${TC_SECRET_KEY}"
          }
          EOF

      - name: Deploy to TCB
        env:
          TCB_ENV_ID: ${{ secrets.TCB_ENV_ID }}
        run: |
          cd backend
          tcb fn deploy tingstudio-api ./scf --env ${TCB_ENV_ID}

  deploy-edgeone:
    name: 部署前端到 EdgeOne
    needs: test-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .

      - name: Deploy to EdgeOne Pages
        env:
          EDGEONE_TOKEN: ${{ secrets.EDGEONE_TOKEN }}
          EDGEONE_ZONE_ID: ${{ secrets.EDGEONE_ZONE_ID }}
        run: |
          npm install -g @tencent/edgeone-cli
          eo login --token ${EDGEONE_TOKEN}
          eo deploy frontend/dist --zone-id ${EDGEONE_ZONE_ID}

  notify:
    name: 部署通知
    needs: [deploy-tcb, deploy-edgeone]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        env:
          JOB_STATUS: ${{ job.status }}
        run: echo "部署状态: ${JOB_STATUS}"
```

### 5.2 GitHub Secrets 配置

在 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Secret 名称       | 值来源            | 说明                          |
| :---------------- | :---------------- | :---------------------------- |
| `TC_SECRET_ID`    | 腾讯云 CAM 控制台 | 密钥 ID                       |
| `TC_SECRET_KEY`   | 腾讯云 CAM 控制台 | 密钥 Key                      |
| `TCB_ENV_ID`      | TCB 控制台        | 环境ID (如 `tingstudio-prod`) |
| `EDGEONE_TOKEN`   | EdgeOne 控制台    | API Token                     |
| `EDGEONE_ZONE_ID` | EdgeOne 控制台    | 站点 Zone ID                  |

---

## 六、运维速查手册

### 6.1 日常命令

```bash
# ===== TCB 管理 =====
tcb fn list                    # 列出所有云函数
tcb fn logs tingstudio-api     # 查看函数日志
tcb fn code tingstudio-api     # 在线编辑代码
tcb fn invoke tingstudio-api   # 本地调试调用

# ===== EdgeOne 管理 =====
eo site list                   # 列出所有站点
eo deploy ./dist               # 部署新版本
eo logs                        # 查看访问日志
eo purge-cache                 # 清除 CDN 缓存

# ===== 快速重新部署 =====
cd d:\ProgramData\workspace-codeby\ting-studio
cd backend && pnpm i && pnpm build && tcb fn deploy tingstudio-api ./scf
cd ../frontend && pnpm i && pnpm build && eo deploy dist
```

### 6.2 故障排查速查表

| 现象      | 可能原因           | 解决方法                         |
| :-------- | :----------------- | :------------------------------- |
| 页面白屏  | 前端构建失败       | `cd frontend && pnpm build` 检查 |
| API 502   | 云函数未部署/超时  | `tcb fn list` 检查状态           |
| API 504   | 函数超时 (默认 3s) | 将超时改为 120s                  |
| CORS 错误 | Origin 未白名单    | 检查 TCB 环境变量 CORS_ORIGIN    |
| 上传失败  | COS 权限问题       | 检查 TC_SECRET_ID/KEY            |
| AI 超时   | 函数超时不足       | 确认超时 ≥120s                   |
| 冷启动慢  | 首次请求延迟高     | 正常现象，后续 <200ms            |
| 数据丢失  | /tmp 被清空        | 升级到 TCB MySQL                 |

### 6.3 监控告警配置

在 TCB 控制台 → 监控告警：

```yaml
推荐告警规则:
  - 指标: 云函数调用次数
    条件: 1分钟 > 1000 次
    通知: 邮件/企业微信

  - 指标: 云函数错误数
    条件: 5分钟 > 10 次
    通知: 即时通知

  - 指标: 云函数平均耗时
    条件: 5分钟 > 5s
    通知: 邮件通知

  - 指标: EdgeOne 4xx/5xx 状态码
    条件: 5分钟 > 50 次
    通知: 即时通知
```

---

## 七、成本监控与优化建议

### 7.1 免费额度监控

```bash
# 查看当前用量 (TCB 控制台)
# https://console.cloud.tencent.com/tcb/env/usage?envId=xxx

# 关注指标:
# - 云函数调用次数: 保持 < 100万次/月
# - 云函数资源量: 保持 < 400万 GB-s/月
# - MySQL 读/写 CU: 保持 < 100万次/月
# - COS 存储: 保持 < 50GB
# - EdgeOne 流量: 保持 < 10GB/月
```

### 7.2 成本优化技巧

| 技巧           | 预估节省 | 说明                                       |
| :------------- | :------: | :----------------------------------------- |
| 函数实例预留   |    -     | 消除冷启动，但增加基础费用                 |
| 静态资源分离   | ¥5~10/月 | 图片等大文件放 COS，EdgeOne 只托管 HTML/JS |
| AI 请求限流    | ¥5~20/月 | 避免恶意刷接口消耗资源                     |
| 日志精简       | ¥2~5/月  | 减少 morgan 日志输出量                     |
| CDN 缓存命中率 | ¥5~10/月 | 合理设置缓存规则，减少回源                 |

---

## 八、部署时间线

| 阶段     | 任务                             |          时间          |
| :------- | :------------------------------- | :--------------------: |
| Day 0    | 注册腾讯云 + 开通 EdgeOne/TCB    |         30 min         |
| Day 0    | 本地环境验证 + 代码适配          |         60 min         |
| Day 1    | TCB 后端部署 (云函数+数据库+COS) |         40 min         |
| Day 1    | EdgeOne Pages 前端部署           |         15 min         |
| Day 1    | 联调测试 + AI 功能验证           |         15 min         |
| Day 1    | **小计: 默认域名可访问**         |      **~160 min**      |
| Day 2~16 | ICP 备案等待 (如需自定义域名)    |      7~15 工作日       |
| Day 16+  | 绑定自定义域名 + CI/CD 配置      |         30 min         |
| Day 16+  | **正式上线**                     |        **完成**        |
| **总计** |                                  | **~3 小时 + 备案等待** |

---

_本文档基于 TingStudio v2.0.0 项目现状制定，针对「腾讯云 EdgeOne Pages + TCB」Serverless 方案。_
_适用于国内用户、24h 常驻需求、含 AI 功能的个人项目场景。_
