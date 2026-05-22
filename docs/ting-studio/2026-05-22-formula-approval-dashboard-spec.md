# 工作台配方审批交互功能 — 阶段2开发文档

> 日期: 2026-05-22 | 状态: 已确认，进入编码

---

## 1. PRD 文档

### 1.1 功能概述

在 Dashboard 工作台页面新增「配方审批」区域，实现配方师提交→管理员审核→驳回修改的完整审批闭环。

### 1.2 用户流程

**配方师流程：** 打开工作台 → 看到"我的审批"卡片 → 查看各状态配方数量（待审核/已通过/已驳回）→ 点击卡片展开审批列表 → 查看详细状态和驳回意见 → 点击配方名称跳转编辑

**管理员流程：** 打开工作台 → 看到"待审核"红点提示 → 点击展开待审核列表 → 查看配方详情 → 点击"通过"填写意见并确认 / 点击"驳回"填写驳回原因 → 审核完成，列表自动刷新

### 1.3 功能详情

**Dashboard 布局变更：**
- 统计卡片区新增「待审核」统计卡片（仅 admin 可见），带红色角标数量
- Bento Grid 内新增「配方审批」卡片，角色自适应

**配方师视角 — 我的审批卡片：**
- Tab 切换：全部 / 待审核 / 已通过 / 已驳回
- 列表展示：配方名称 + 版本号 + 提交时间 + 当前状态标签
- 进度指示：三步进度条（已提交 → 审核中 → 已完成/已驳回）
- 驳回详情：点击已驳回项展开驳回意见
- 快速跳转：点击配方名跳转详情页

**管理员视角 — 待审核卡片：**
- 待审核池：所有 `status = 'pending_review'` 的配方版本
- 列表信息：配方名称 + 版本号 + 提交人 + 提交时间
- 通过操作：点击通过 → 确认框填写可选意见 → 确认
- 驳回操作：点击驳回 → 对话框填写原因(必填) → 确认
- 历史记录：已审核列表展示审批结果和时间

### 1.4 状态标签映射

| 后端状态 | 前端显示 | 颜色 | TDesign Theme |
|----------|----------|------|---------------|
| draft | 草稿 | 灰 | default |
| pending_review | 待审核 | 橙 | warning |
| published | 已通过 | 绿 | success |
| archived | 已归档 | 暗灰 | default |
| 驳回(draft+记录) | 已驳回 | 红 | danger |

### 1.5 验收标准

- [x] Dashboard 审批卡片按角色显示正确内容
- [x] 配方师可看到自己提交的审批状态列表
- [x] 管理员可看到所有待审核配方列表
- [x] 管理员可通过/驳回配方，操作后状态即时更新
- [x] 驳回意见以红色高亮展示在配方师视角
- [x] 空状态、加载状态、错误状态均有对应 UI
- [x] 响应式布局适配
- [x] 操作有确认步骤

---

## 2. 技术方案

### 2.1 组件架构

```
Dashboard.vue (修改)
├── bento-grid
│   ├── bento-welcome          (不变)
│   ├── bento-stat × 4         (admin 新增第5个「待审核」卡片)
│   ├── bento-chart            (不变)
│   ├── bento-formulas         (不变)
│   ├── bento-activity         (不变)
│   ├── bento-quick            (不变)
│   └── bento-approval  ← 新增审批卡片（角色自适应）
│       ├── 配方师视角：MyApprovalPanel
│       └── 管理员视角：AdminReviewPanel
```

### 2.2 目录结构

```
frontend/src/
├── api/approval.ts                          ← 新增
├── stores/approval.ts                       ← 新增
├── views/dashboard/Dashboard.vue            ← 修改
├── components/dashboard/
│   ├── ApprovalCard.vue                     ← 新增
│   ├── MyApprovalPanel.vue                  ← 新增
│   └── AdminReviewPanel.vue                 ← 新增

backend/src/
├── routes/versions.ts                       ← 修改（新增 my-submissions）
├── controllers/versionController.ts         ← 修改（新增 getMySubmissions）
└── services/reviewService.ts                ← 修改（新增 getMySubmissions）
```

### 2.3 技术选型

| 需求 | 方案 |
|------|------|
| 角色判断 | `authStore.user.role === 'admin'` |
| 审批列表 | `t-table` (TDesign) |
| 状态标签 | `t-tag` variant + theme |
| 驳回弹窗 | `t-dialog` + `t-textarea` |
| 红点通知 | `t-badge` count 属性 |
| 实时刷新 | `setInterval` 30s 轮询 |
| 状态管理 | Pinia `useApprovalStore` |
| 错误处理 | 现有拦截器 + 前端校验 |

---

## 3. 接口文档

### 通用说明

| 项目 | 值 |
|------|-----|
| 基础路径 | `/api` |
| 认证方式 | `Authorization: Bearer <token>` |
| 成功响应 | `{ success: true, data: {...} }` |
| 前端解包 | axios 拦截器自动提取 data |

### 3.1 接口清单

| # | 方法 | 路径 | 权限 | 状态 |
|---|------|------|------|------|
| 1 | GET | `/versions/pending-review` | admin | ✅ 已有 |
| 2 | PUT | `/versions/approve/:versionId` | admin | ✅ 已有 |
| 3 | PUT | `/versions/reject/:versionId` | admin | ✅ 已有 |
| 4 | GET | `/versions/review-logs/:versionId` | 所有人 | ✅ 已有 |
| 5 | POST | `/versions/submit/:versionId` | 所有人 | ✅ 已有 |
| 6 | GET | `/versions/my-submissions` | 所有人 | 🆕 需新增 |

### 3.2 接口详情

#### GET /api/versions/pending-review (admin)

Query: `page, pageSize, keyword`

Response:
```json
{
  "success": true,
  "data": {
    "list": [{"versionId","formulaId","formulaName","formulaCode","versionNumber","status","submittedBy","submittedByName","createdAt"}],
    "pagination": {"page","pageSize","total","totalPages"}
  }
}
```

#### PUT /api/versions/approve/:versionId (admin)

Body: `{ comment?: string }`

Response: `{ versionId, status: "published", isCurrent: 1, formulaId, versionNumber }`

#### PUT /api/versions/reject/:versionId (admin)

Body: `{ comment: string }` (必填)

Response: `{ versionId, status: "draft", comment, formulaId, versionNumber }`

#### GET /api/versions/review-logs/:versionId

Response: `{ versionId, logs: [{ reviewLogId, action, reviewerName, comment, createdAt }] }`

#### POST /api/versions/submit/:versionId

Response: `{ versionId, status: "pending_review", formulaId, versionNumber }`

#### 🆕 GET /api/versions/my-submissions

Query: `page, pageSize`

Response:
```json
{
  "success": true,
  "data": {
    "list": [{
      "versionId","formulaId","formulaName","formulaCode",
      "versionNumber","status","createdAt",
      "latestReview": { "action","reviewerName","comment","createdAt" }
    }],
    "pagination": {"page","pageSize","total","totalPages"}
  }
}
```

---

## 4. 数据库设计

**状态：已完成。** 无新增表或字段。

| 表 | 用途 | 状态 |
|----|------|------|
| `formula_versions` | 版本表，status 含 pending_review | ✅ |
| `formula_review_logs` | 审批日志表 | ✅ + 3个索引 |

### formula_versions 审批相关字段

| 字段 | 类型 | 约束 |
|------|------|------|
| status | TEXT | CHECK(status IN ('draft','pending_review','published','archived')) |
| created_by | TEXT | 提交人 |

索引: `idx_fv_status`, `idx_fv_formula_status`

### formula_review_logs

| 字段 | 类型 | 约束 |
|------|------|------|
| review_log_id | TEXT PK | |
| version_id | TEXT FK | → formula_versions |
| reviewer_id | TEXT FK | → users |
| reviewer_name | TEXT | |
| action | TEXT | CHECK(action IN ('submit','approve','reject')) |
| comment | TEXT | |
| created_at | TEXT | |

索引: `idx_frl_version`, `idx_frl_reviewer`, `idx_frl_action`