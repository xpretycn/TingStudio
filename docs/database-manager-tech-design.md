# 技术方案：数据库可视化管理模块

## 1. 架构设计

### 1.1 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                    前端 (Vue 3)                           │
│                                                          │
│  Toolbox.vue                                             │
│  ├── DbOverview.vue        概览 Tab                      │
│  ├── DbTableBrowser.vue    数据浏览 Tab                   │
│  ├── DbBackup.vue          备份与恢复 Tab                  │
│  └── DbScripts.vue         脚本执行 Tab                   │
│                                                          │
│  components/db/                                          │
│  ├── DbInfoCards.vue       信息卡片区                     │
│  ├── DbTableList.vue       表列表                        │
│  ├── DbStructureDrawer.vue 表结构 Drawer                  │
│  ├── DbDataToolbar.vue     数据浏览工具栏                  │
│  ├── DbJsonViewer.vue      JSON 查看器弹窗                │
│  ├── DbBackupList.vue      备份列表                       │
│  ├── DbScriptCard.vue      脚本卡片                       │
│  └── DbScriptLog.vue       脚本执行日志                   │
│                                                          │
│  api/db.ts               前端 API 层                     │
│  stores/db.ts             Pinia Store（可选，轻量场景直接调 API）│
└──────────────────────────────────────────────────────────┘
                          │
                     axios (http.ts)
                          │
┌──────────────────────────────────────────────────────────┐
│                    后端 (Express)                         │
│                                                          │
│  routes/db.ts             路由定义（/api/db/*）            │
│  controllers/dbController.ts  控制器                      │
│  services/dbService.ts    服务层                          │
│                                                          │
│  依赖：                                                  │
│  ├── config/database-adapter.ts   统一查询接口             │
│  ├── config/database-better-sqlite3.ts  SQLite 驱动       │
│  ├── middleware/auth.ts    认证中间件                      │
│  └── utils/helpers.ts      工具函数                       │
└──────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
Toolbox.vue
  ├── @/api/db.ts
  │     └── http.ts (axios)
  ├── @/stores/auth.ts (角色判断)
  ├── @/utils/timeFormat.ts (时间格式化)
  ├── @/components/db/*.vue (子组件)
  └── tdesign-vue-next (UI 组件)

routes/db.ts
  ├── middleware/auth.ts (authMiddleware)
  ├── controllers/dbController.ts
  │     └── services/dbService.ts
  │           ├── config/database-adapter.ts (query/execute)
  │           ├── config/database-better-sqlite3.ts (getDb)
  │           └── utils/helpers.ts (success/rowToCamelCase/buildPagination)
  └── middleware/validate.ts (validateBody)
```

---

## 2. 后端实现方案

### 2.1 文件结构

```
backend/src/
├── routes/
│   └── db.ts                    新增：数据库管理路由
├── controllers/
│   └── dbController.ts          新增：数据库管理控制器
├── services/
│   └── dbService.ts             新增：数据库管理服务层
└── routes/
    └── index.ts                 修改：注册 /db 路由
```

### 2.2 路由设计（routes/db.ts）

```typescript
import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as dbController from "../controllers/dbController.js";

export const dbRoutes = Router();

// 全局中间件：认证 + 管理员权限
dbRoutes.use(authMiddleware);
dbRoutes.use((req: AuthRequest, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({
      success: false,
      error: { message: "仅管理员可访问数据库管理功能", code: "FORBIDDEN" },
    });
    return;
  }
  next();
});

// 概览
dbRoutes.get("/info", dbController.getDbInfo);
dbRoutes.get("/tables", dbController.getTableList);
dbRoutes.get("/tables/:tableName/schema", dbController.getTableSchema);

// 数据浏览
dbRoutes.get("/tables/:tableName/data", dbController.getTableData);

// 备份与恢复
dbRoutes.get("/backups", dbController.getBackupList);
dbRoutes.post("/backups", dbController.createBackup);
dbRoutes.get("/backups/:fileName/download", dbController.downloadBackup);
dbRoutes.post("/backups/:fileName/restore", dbController.restoreBackup);
dbRoutes.delete("/backups/:fileName", dbController.deleteBackup);
dbRoutes.post("/backups/upload-restore", dbController.uploadAndRestore);

// 脚本执行
dbRoutes.get("/scripts", dbController.getScriptList);
dbRoutes.post("/scripts/:scriptId/execute", dbController.executeScript);
dbRoutes.get("/scripts/:scriptId/history", dbController.getScriptHistory);
```

### 2.3 服务层核心逻辑（services/dbService.ts）

#### 2.3.1 数据库信息获取

```typescript
// 使用 database-adapter 的 getDatabaseType() 获取类型
// 使用 better-sqlite3 的 getDb() 直接执行 PRAGMA 查询
// SQLite: PRAGMA table_list / PRAGMA table_info / PRAGMA index_list
// MySQL:  SHOW TABLES / DESCRIBE table / SHOW INDEX
```

**关键实现**：
- `getDbInfo()`：获取数据库类型、文件大小（fs.statSync）、表总数
- `getTableList()`：查询 sqlite_master 获取所有用户表 + 每张表的行数（COUNT(*)）
- `getTableSchema()`：PRAGMA table_info + PRAGMA index_list + PRAGMA foreign_key_list
- `getTableData()`：SELECT * FROM table LIMIT ? OFFSET ? + WHERE 搜索 + ORDER BY 排序

#### 2.3.2 备份与恢复

**复用现有脚本逻辑**：
- 导出：参考 `exportDatabase.ts` 的核心逻辑，封装为 `dbService.exportDatabase()`
- 恢复：参考 `restoreDatabase.ts` 的核心逻辑，封装为 `dbService.restoreDatabase()`
- 备份目录：`backend/data/backup/`
- 文件命名：`tingstudio_backup_{timestamp}.json`

**关键差异**：
- 现有脚本是 CLI 独立运行（直接 new Database），API 版本需通过 `getDb()` 获取已连接实例
- 导出使用只读连接副本，避免阻塞主连接
- 恢复操作需在事务中执行，失败自动回滚

#### 2.3.3 脚本执行

**脚本注册表设计**：

```typescript
interface ScriptDefinition {
  id: string;
  name: string;
  description: string;
  category: "fix" | "seed" | "import" | "clean" | "verify" | "migrate";
  dangerLevel: "low" | "medium" | "high";
  scriptPath: string;
  estimatedTime: string;
  details: string[];
}

const SCRIPT_REGISTRY: ScriptDefinition[] = [
  {
    id: "fix-materials",
    name: "修复原料数据",
    description: "修复原料数据中的异常值和缺失字段",
    category: "fix",
    dangerLevel: "medium",
    scriptPath: "src/scripts/fixMaterials.ts",
    estimatedTime: "< 5s",
    details: ["检查 name 为空的记录", "补全 material_code 编码", "更新 updated_at 时间戳"],
  },
  // ... 更多脚本
];
```

**执行机制**：
- 使用 `child_process.fork()` 在子进程中执行脚本，避免阻塞主进程
- 超时控制：30 秒超时自动终止
- 日志收集：通过 IPC 通道收集 stdout/stderr
- 执行记录：写入 `db_script_logs` 表（新增）

### 2.4 新增数据表

仅新增 1 张表用于记录脚本执行历史：

```sql
CREATE TABLE IF NOT EXISTS db_script_logs (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  script_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at DATETIME NOT NULL,
  finished_at DATETIME,
  duration_ms INTEGER,
  output TEXT,
  error TEXT,
  triggered_by TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
```

---

## 3. 前端实现方案

### 3.1 文件结构

```
frontend/src/
├── api/
│   └── db.ts                    新增：数据库管理 API
├── views/system/
│   └── Toolbox.vue              修改：集成数据库管理区域
└── components/db/
    ├── DbOverview.vue           新增：概览 Tab 内容
    ├── DbTableBrowser.vue       新增：数据浏览 Tab 内容
    ├── DbBackup.vue             新增：备份与恢复 Tab 内容
    ├── DbScripts.vue            新增：脚本执行 Tab 内容
    ├── DbInfoCards.vue          新增：信息卡片区
    ├── DbTableList.vue          新增：表列表
    ├── DbStructureDrawer.vue    新增：表结构 Drawer
    ├── DbDataToolbar.vue        新增：数据浏览工具栏
    ├── DbJsonViewer.vue         新增：JSON 查看器弹窗
    ├── DbBackupList.vue         新增：备份列表
    ├── DbScriptCard.vue         新增：脚本卡片
    └── DbScriptLog.vue          新增：脚本执行日志
```

### 3.2 Toolbox.vue 改造方案

**改造要点**：
1. 引入 `useAuthStore()` 判断用户角色
2. 在工具卡片和天气之间插入数据库管理区域
3. 使用 `t-tabs` 组件实现 Tab 切换
4. 仅 `admin` 角色渲染数据库管理区域

```vue
<!-- 数据库管理区域（仅管理员可见） -->
<div v-if="isAdmin" class="db-management-section">
  <div class="section-header">
    <h3 class="section-title">🗄️ 数据库管理</h3>
    <t-tag theme="primary" variant="light" size="small">仅管理员</t-tag>
  </div>
  <t-tabs v-model="activeDbTab" class="db-tabs">
    <t-tab-panel value="overview" label="概览">
      <DbOverview />
    </t-tab-panel>
    <t-tab-panel value="browser" label="数据浏览">
      <DbTableBrowser />
    </t-tab-panel>
    <t-tab-panel value="backup" label="备份">
      <DbBackup />
    </t-tab-panel>
    <t-tab-panel value="scripts" label="脚本">
      <DbScripts />
    </t-tab-panel>
  </t-tabs>
</div>
```

### 3.3 前端 API 层（api/db.ts）

```typescript
import http from "./http";

// 概览
export function getDbInfo() {
  return http.get("/db/info", { _logLabel: "数据库信息" });
}
export function getTableList() {
  return http.get("/db/tables", { _logLabel: "表列表" });
}
export function getTableSchema(tableName: string) {
  return http.get(`/db/tables/${tableName}/schema`, { _logLabel: "表结构" });
}

// 数据浏览
export function getTableData(tableName: string, params: {
  page?: number; pageSize?: number; search?: string; sort?: string; order?: string;
}) {
  return http.get(`/db/tables/${tableName}/data`, { params, _logLabel: "表数据" });
}

// 备份与恢复
export function getBackupList() {
  return http.get("/db/backups", { _logLabel: "备份列表" });
}
export function createBackup() {
  return http.post("/db/backups", {}, { _logLabel: "创建备份" });
}
export function downloadBackup(fileName: string) {
  return http.get(`/db/backups/${fileName}/download`, {
    responseType: "blob", _logLabel: "下载备份",
  });
}
export function restoreBackup(fileName: string) {
  return http.post(`/db/backups/${fileName}/restore`, {}, { _logLabel: "恢复备份" });
}
export function deleteBackup(fileName: string) {
  return http.delete(`/db/backups/${fileName}`, { _logLabel: "删除备份" });
}
export function uploadAndRestore(file: File) {
  const formData = new FormData();
  formData.append("backup", file);
  return http.post("/db/backups/upload-restore", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    _logLabel: "上传恢复", timeout: 60000,
  });
}

// 脚本执行
export function getScriptList() {
  return http.get("/db/scripts", { _logLabel: "脚本列表" });
}
export function executeScript(scriptId: string) {
  return http.post(`/db/scripts/${scriptId}/execute`, {}, {
    _logLabel: "执行脚本", timeout: 60000,
  });
}
export function getScriptHistory(scriptId: string) {
  return http.get(`/db/scripts/${scriptId}/history`, { _logLabel: "脚本历史" });
}
```

### 3.4 关键交互实现

#### 3.4.1 表名跳转（概览 → 数据浏览）

```typescript
// Toolbox.vue 中通过 provide/inject 或事件总线
const activeDbTab = ref("overview");
const selectedTable = ref("");

function navigateToTable(tableName: string) {
  selectedTable.value = tableName;
  activeDbTab.value = "browser";
}
provide("navigateToTable", navigateToTable);
provide("selectedTable", selectedTable);
```

#### 3.4.2 JSON 字段查看器

```typescript
// DbJsonViewer.vue - 弹窗展示格式化 JSON
// 使用 JSON.stringify(parsed, null, 2) 格式化
// 支持语法高亮（简单的 key/value 颜色区分）
```

#### 3.4.3 脚本执行日志

```typescript
// DbScriptLog.vue - 模拟终端效果
// 使用 pre 标签 + 等宽字体
// 自动滚动到底部
// 颜色区分：成功绿色、错误红色、信息灰色
```

---

## 4. 安全方案

### 4.1 后端安全

| 措施 | 实现 |
|------|------|
| 认证 | 所有 `/api/db/*` 路由使用 `authMiddleware` |
| 授权 | 路由级中间件校验 `req.user.role === 'admin'` |
| 表名白名单 | `getTableData()` 校验 tableName 只允许 `[a-zA-Z0-9_]`，防止 SQL 注入 |
| 参数化查询 | 所有 SQL 使用 `?` 占位符 |
| 文件名校验 | 备份文件名只允许 `tingstudio_backup_*.json` 格式 |
| 上传限制 | multer 限制文件类型 `.json`，大小 100MB |
| 脚本执行隔离 | `child_process.fork()` 子进程执行，超时 30s |
| 速率限制 | 备份/恢复/脚本执行接口添加 rate limit |

### 4.2 前端安全

| 措施 | 实现 |
|------|------|
| 角色判断 | `v-if="isAdmin"` 控制渲染 |
| 危险确认 | 恢复/清空/高危脚本使用 t-popconfirm 二次确认 |
| 敏感数据 | 不在前端展示密码/token 等字段 |

---

## 5. 性能方案

### 5.1 大表优化

| 场景 | 优化策略 |
|------|---------|
| 表行数统计 | 缓存 COUNT 结果，5 分钟过期 |
| 数据浏览 | 强制 LIMIT + OFFSET 分页，最大 100 条/页 |
| 搜索 | 仅搜索文本类型字段，使用 LIKE + 索引 |
| 排序 | 仅允许按索引列排序 |

### 5.2 备份优化

| 场景 | 优化策略 |
|------|---------|
| 大库备份 | 使用只读连接副本，避免阻塞主连接 |
| 文件下载 | 流式传输，不全部加载到内存 |
| 恢复操作 | 事务包裹，失败自动回滚 |

---

## 6. 实现顺序

```
Phase 1: 后端核心（概览 + 数据浏览）
  ├── dbService.ts (getDbInfo, getTableList, getTableSchema, getTableData)
  ├── dbController.ts
  ├── routes/db.ts
  └── routes/index.ts (注册)

Phase 2: 前端核心（概览 + 数据浏览）
  ├── api/db.ts
  ├── DbOverview.vue + DbInfoCards.vue + DbTableList.vue + DbStructureDrawer.vue
  ├── DbTableBrowser.vue + DbDataToolbar.vue + DbJsonViewer.vue
  └── Toolbox.vue (集成)

Phase 3: 备份与恢复
  ├── 后端: dbService (exportDatabase, restoreDatabase, backupList)
  ├── 前端: DbBackup.vue + DbBackupList.vue
  └── Toolbox.vue (集成)

Phase 4: 脚本执行
  ├── 后端: dbService (scriptRegistry, executeScript, scriptHistory) + db_script_logs 表
  ├── 前端: DbScripts.vue + DbScriptCard.vue + DbScriptLog.vue
  └── Toolbox.vue (集成)
```
