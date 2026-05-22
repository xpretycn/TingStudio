# 工作台配方审批交互功能 — 交付文档

> 日期: 2026-05-22 | 版本: v1.0

## 1. 变更清单

### 新增文件
| 文件 | 说明 |
|------|------|
| `frontend/src/api/approval.ts` | 审批 API 层（6 个接口） |
| `frontend/src/stores/approval.ts` | 审批 Pinia Store |
| `frontend/src/components/dashboard/ApprovalCard.vue` | 审批卡片主组件（角色路由） |
| `frontend/src/components/dashboard/MyApprovalPanel.vue` | 配方师视角面板（Tab 切换 + 进度条 + 驳回详情） |
| `frontend/src/components/dashboard/AdminReviewPanel.vue` | 管理员视角面板（批量审批 + 弹窗驳回） |
| `backend/tests/reviewService.test.ts` | 后端审批服务单元测试（14 用例） |
| `docs/ting-studio/2026-05-22-formula-approval-dashboard-spec.md` | 完整开发文档（PRD + 技术方案 + 接口 + 数据库） |

### 修改文件
| 文件 | 变更 |
|------|------|
| `frontend/src/views/dashboard/Dashboard.vue` | 添加审批卡片 + admin 统计卡片 + 数据初始化 |
| `backend/src/services/reviewService.ts` | 新增 `getMySubmissions()` 函数 |
| `backend/src/controllers/versionController.ts` | 新增 `getMySubmissionList()` 控制器 |
| `backend/src/routes/versions.ts` | 新增 `GET /my-submissions` 路由 |

### 已有基础设施（无需变更）
| 资源 | 说明 |
|------|------|
| `formula_versions.status` | 已有 `pending_review` CHECK 约束 |
| `formula_review_logs` 表 + 3 索引 | 审批日志已就绪 |
| `POST/approve, PUT/reject, GET/pending-review` 等 | 后端 API 已存在 |

## 2. 测试报告

### 后端单元测试
```
Test Files: 1 passed (1)
Tests:      14 passed (14)
Duration:   2.06s
```

| 测试模块 | 用例数 | 状态 |
|----------|--------|------|
| `getMySubmissions` (新增) | 4 | ✅ 全部通过 |
| `createReviewLog` | 2 | ✅ 全部通过 |
| `getReviewLogs` | 3 | ✅ 全部通过 |
| `getPendingReviewList` | 3 | ✅ 全部通过 |
| `isFormulaOwner` | 2 | ✅ 全部通过 |

### 前端验证
- TypeScript 编译: ✅ 零错误（7 个文件）
- 页面渲染: ✅ Dashboard 正确显示审批卡片
- 角色切换: ✅ admin 显示"审核中心"，非 admin 显示"提交追踪"
- 空状态: ✅ "暂无待审核配方" 正确展示
- 控制台: ✅ 零 JS 错误

## 3. 部署说明

### 环境要求
- Node.js 20+
- pnpm（包管理器）
- 后端已通过数据库迁移（formula_review_logs 表 + pending_review 状态）

### 启动命令
```bash
# 安装依赖（如需要）
cd backend && npm install
cd frontend && npm install

# 启动开发环境
cd backend && npm run dev     # 后端 :3000
cd frontend && npm run dev    # 前端 :5173

# 或使用根目录统一启动
npm run dev

# 运行测试
cd backend && npm test
```

### 数据库迁移确认
```bash
# 检查 formula_versions 是否有 pending_review
cd backend && npx tsx -e "
import { getDb, connectDatabase } from './src/config/database-better-sqlite3.js';
connectDatabase();
const db = getDb();
const sql = db.prepare(\"SELECT sql FROM sqlite_master WHERE name='formula_versions'\").get() as any;
console.log(sql.sql.includes('pending_review') ? 'OK' : 'NEEDS MIGRATION');
"
```

## 4. 功能验证清单

- [x] 配方师视角：我的审批卡片显示 Tab 切换
- [x] 配方师视角：进度条展示审批阶段
- [x] 配方师视角：驳回意见可展开查看
- [x] 配方师视角：点击配方名跳转详情页
- [x] 管理员视角：待审核列表 + 角标数量
- [x] 管理员视角：通过/驳回操作 + 意见填写
- [x] 管理员视角：空状态友好提示
- [x] 响应式布局适配
- [x] 加载状态 + 空状态 + 错误处理
- [x] 角色权限控制（隐藏非法操作）
- [x] 30s 轮询刷新（管理员视角）