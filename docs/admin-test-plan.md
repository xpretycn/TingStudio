# 管理员工作流测试计划

> 基于 `docs/admin-workflow.md` 的 17 个章节制定

---

## 一、测试分层策略

| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| 单元测试 | Vitest | Store 逻辑、工具函数、组件渲染 |
| 集成测试 | Vitest + supertest | 后端 API 路由 |
| E2E 测试 | Playwright | 管理员关键流程 |

---

## 二、单元测试计划

### 2.1 Store 测试

| 测试文件 | 测试内容 | 对应章节 |
|---------|---------|---------|
| `stores/__tests__/approval.test.ts`（新建） | 审批状态管理：fetchPendingReviews、approveVersion、rejectVersion、材料审批 | §3-§5 |
| `stores/__tests__/model.test.ts`（新建） | 模型管理：CRUD、版本切换、预警配置、用量统计 | §8 |

### 2.2 组件测试

| 测试文件 | 测试内容 | 对应章节 |
|---------|---------|---------|
| `components/dashboard/__tests__/AdminReviewPanel.test.ts`（新建） | 审批面板：三标签页、筛选、排序、分页 | §3 |
| `views/system/__tests__/SystemConfig.test.ts`（新建） | 系统配置：缓存编辑、阈值配置、枚举管理 | §6-§7 |
| `views/system/__tests__/ModelManagement.test.ts`（新建） | 模型管理：6 个标签页、模型 CRUD、预警 | §8 |
| `views/system/__tests__/ExportCenter.test.ts`（新建） | 导出中心：任务列表、模板管理、分享、配置 | §12 |
| `views/system/__tests__/PermissionManage.test.ts`（新建） | 权限管理：角色 CRUD、用户 CRUD、权限分配 | §13-§14 |
| `views/ai/__tests__/AiWorkspace.test.ts`（新建） | AI 助手：会话管理、模型选择、消息发送 | §9 |
| `views/ai/__tests__/SmartTools.test.ts`（新建） | 智能工具：4 个标签页切换 | §10 |

---

## 三、后端集成测试计划

| 测试文件 | 测试内容 | 对应章节 |
|---------|---------|---------|
| `tests/approvalController.test.ts`（新建） | 审批 API：提交/批准/驳回/列表 | §3-§5 |
| `tests/modelController.test.ts`（新建） | 模型管理 API：CRUD/版本/预警/日志 | §8 |
| `tests/permissionController.test.ts`（新建） | 权限 API：角色/用户/权限 CRUD | §13-§14 |
| `tests/dbController.test.ts`（新建） | 数据库 API：概览/浏览/备份/脚本 | §15 |
| `tests/exportController.test.ts`（已有，需补充） | 导出 API：任务/模板/分享/配置 | §12 |

---

## 四、E2E 测试计划

| 测试文件 | 测试场景 | 对应章节 |
|---------|---------|---------|
| `e2e/admin-approval.spec.ts`（新建） | 审批全流程：待审列表→批准/驳回→历史记录 | §3-§5 |
| `e2e/admin-system-config.spec.ts`（新建） | 系统配置：缓存编辑→阈值配置→枚举管理 | §6-§7 |
| `e2e/admin-model-management.spec.ts`（新建） | 模型管理：CRUD→版本切换→预警配置→日志 | §8 |
| `e2e/admin-ai-assistant.spec.ts`（新建） | AI 助手：创建会话→选择模型→发送消息 | §9 |
| `e2e/admin-export-center.spec.ts`（新建） | 导出中心：创建任务→模板配置→分享链接 | §12 |
| `e2e/admin-permission.spec.ts`（新建） | 权限管理：角色 CRUD→用户管理→权限分配 | §13-§14 |
| `e2e/admin-database.spec.ts`（新建） | 数据库管理：概览→浏览→备份→脚本执行 | §15 |

---

## 五、关键测试场景

### 5.1 审批流程（§3-§5）

| 用例 ID | 场景 | 步骤 | 预期 |
|---------|------|------|------|
| A01 | 配方师提交→管理员批准 | 配方师提交审批→管理员登录→批准 | 状态变为 published |
| A02 | 配方师提交→管理员驳回 | 配方师提交→管理员驳回（填意见） | 状态变为 draft，意见可见 |
| A03 | 管理员直接发布草稿 | 管理员选择草稿版本→发布 | 直接变为 published |
| A04 | 审批面板筛选 | 按时间/提交人/状态筛选 | 正确过滤结果 |
| A05 | 审批面板自动刷新 | 等待 30 秒 | 列表自动更新 |

### 5.2 系统配置（§6-§7）

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| C01 | 编辑缓存参数 | 保存成功，参数持久化 |
| C02 | 执行缓存清理 | 预览→确认→清理完成 |
| C03 | 修改含量比阈值 | 保存后前端校验使用新阈值 |
| C04 | 管理枚举值 | 新增/编辑/删除枚举 |
| C05 | 配置互斥规则 | 创建规则后原料筛选互斥生效 |

### 5.3 模型管理（§8）

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| M01 | 新增模型 | 填写信息→测试连接→保存 |
| M02 | 切换模型版本 | 选择版本→确认→版本切换成功 |
| M03 | 配置预警阈值 | 设置每日/月度限制→自动保存 |
| M04 | 查看调用日志 | 按提供商/类型/状态筛选 |
| M05 | 配置悬浮助手 | 选择模型→设置外观→保存 |

### 5.4 权限管理（§13-§14）

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| P01 | 创建角色 | 填写名称→分配权限→保存 |
| P02 | 创建用户 | 填写信息→分配角色→保存 |
| P03 | 切换用户角色 | 修改角色→立即生效 |
| P04 | 禁用用户 | 禁用后用户无法登录 |
| P05 | 系统角色保护 | admin/formulist 不可删除 |

### 5.5 数据隔离（§15）

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| D01 | 管理员看到全部配方 | 列表显示所有用户的数据 |
| D02 | 配方师只看到自己的 | 列表仅显示 own 数据 |
| D03 | 非管理员访问系统配置 | 被重定向到首页 |
| D04 | 非管理员访问模型管理 | 被重定向到首页 |

---

## 六、测试文件清单

### 新建文件（14 个）

```
frontend/src/stores/__tests__/approval.test.ts
frontend/src/stores/__tests__/model.test.ts
frontend/src/components/dashboard/__tests__/AdminReviewPanel.test.ts
frontend/src/views/system/__tests__/SystemConfig.test.ts
frontend/src/views/system/__tests__/ModelManagement.test.ts
frontend/src/views/system/__tests__/ExportCenter.test.ts
frontend/src/views/system/__tests__/PermissionManage.test.ts
frontend/src/views/ai/__tests__/AiWorkspace.test.ts
frontend/src/views/ai/__tests__/SmartTools.test.ts
backend/tests/approvalController.test.ts
backend/tests/modelController.test.ts
backend/tests/permissionController.test.ts
backend/tests/dbController.test.ts
frontend/e2e/admin-approval.spec.ts
frontend/e2e/admin-system-config.spec.ts
frontend/e2e/admin-model-management.spec.ts
frontend/e2e/admin-ai-assistant.spec.ts
frontend/e2e/admin-export-center.spec.ts
frontend/e2e/admin-permission.spec.ts
frontend/e2e/admin-database.spec.ts
```
