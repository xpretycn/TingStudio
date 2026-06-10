# Materials（原料）模块前后端联调测试用例

## 文档信息

| 字段 | 值 |
|------|-----|
| 文档ID | ITC-ML-20260609-001 |
| 模块 | Materials（原料管理） |
| 版本 | v1.0 |
| 编写日期 | 2026-06-10 |
| 编写方式 | 基于源码扫描自动生成 |

---

## 1. 模块接口映射

### 1.1 前端 API → 后端路由 对照表

| # | 前端 API 函数 | HTTP 方法 | 前端路径 | 后端路由 | 认证 | 权限 | validateBody |
|---|---------------|-----------|----------|----------|------|------|-------------|
| 1 | `materialApi.getList()` | GET | `/materials` | `GET /api/materials` | authMiddleware | admin全量/formulist仅自己 | 无 |
| 2 | `materialApi.getById()` | GET | `/materials/:id` | `GET /api/materials/:id` | authMiddleware | 无 | 无 |
| 3 | `materialApi.create()` | POST | `/materials` | `POST /api/materials` | authMiddleware | 已认证 | name(必填,≥1), code(必填,≥1) |
| 4 | `materialApi.update()` | PUT | `/materials/:id` | `PUT /api/materials/:id` | authMiddleware | 创建者或admin | name(可选,≥1), code(可选,≥1) |
| 5 | `materialApi.delete()` | DELETE | `/materials/:id` | `DELETE /api/materials/:id` | authMiddleware | **仅admin** | 无 |
| 6 | `materialApi.getNextCode()` | GET | `/materials/next-code` | `GET /api/materials/next-code` | authMiddleware | 无 | query: name(必填) |
| 7 | `materialApi.getByFormula()` | GET | `/materials/by-formula/:formulaId` | ⚠️ **后端无对应路由** | — | — | — |
| 8 | `materialApi.getStats()` | GET | `/materials/stats` | `GET /api/materials/stats` | authMiddleware | 无 | 无 |
| 9 | `materialApi.getVersions()` | GET | `/materials/:id/versions` | `GET /api/materials/:id/versions` | authMiddleware | 无 | 无 |
| 10 | `materialApi.getVersionDetail()` | GET | `/materials/:id/versions/:versionId` | `GET /api/materials/:id/versions/:versionId` | authMiddleware | 无 | 无 |
| 11 | `materialApi.getReferences()` | GET | `/materials/:id/references` | `GET /api/materials/:id/references` | authMiddleware | 无 | 无 |
| 12 | `materialApi.compareVersions()` | GET | `/materials/:id/versions/compare` | `GET /api/materials/:id/versions/compare` | authMiddleware | 无 | query: v1, v2(必填) |
| 13 | `materialApi.submitReview()` | POST | `/materials/:id/submit-review` | `POST /api/materials/:id/submit-review` | authMiddleware | 创建者或admin | 无 |
| 14 | `materialApi.approve()` | PUT | `/materials/:id/approve` | `PUT /api/materials/:id/approve` | authMiddleware | **仅admin** | 无 |
| 15 | `materialApi.reject()` | PUT | `/materials/:id/reject` | `PUT /api/materials/:id/reject` | authMiddleware | **仅admin** | comment(≥5字符,后端校验) |
| 16 | `materialApi.publish()` | PUT | `/materials/:id/publish` | `PUT /api/materials/:id/publish` | authMiddleware | **仅admin** | 无 |
| 17 | `materialApi.getPendingReviews()` | GET | `/materials/pending-review` | `GET /api/materials/pending-review` | authMiddleware | admin返回数据/formulist返回空 | 无 |
| 18 | `materialApi.getReviewLogs()` | GET | `/materials/:id/review-logs` | `GET /api/materials/:id/review-logs` | authMiddleware | 无 | 无 |
| 19 | `materialApi.getMyMaterialCounts()` | GET | `/materials/my-counts` | `GET /api/materials/my-counts` | authMiddleware | 无 | 无 |
| 20 | ⚠️ **前端未定义** | — | — | `GET /api/materials/my-submissions` | authMiddleware | 仅当前用户 | 无 |

### 1.2 营养源子路由对照表

| # | 后端路由 | HTTP 方法 | 认证 | validateBody |
|---|----------|-----------|------|-------------|
| 21 | `/api/nutrition-source/material/:materialId/sources` | GET | authMiddleware | 无 |
| 22 | `/api/nutrition-source/material/:materialId/sources` | POST | authMiddleware | sourceType(必填,enum), per100g(必填,object) |
| 23 | `/api/nutrition-source/material/:materialId/sources/compare` | GET | authMiddleware | 无 |
| 24 | `/api/nutrition-source/material/:materialId/sources/:sourceId` | PUT | authMiddleware | 无 |
| 25 | `/api/nutrition-source/material/:materialId/sources/:sourceId` | DELETE | authMiddleware | 无 |
| 26 | `/api/nutrition-source/material/:materialId/authoritative` | PUT | authMiddleware | fieldSelections(必填,object) |
| 27 | `/api/nutrition-source/material/:materialId/enrich-nutrition` | POST | authMiddleware | 无 |
| 28 | `/api/nutrition-source/bulk-enrich-nutrition` | POST | authMiddleware | 无 |
| 29 | `/api/nutrition-source/material/:materialId/sources/scored` | GET | authMiddleware | 无 |
| 30 | `/api/nutrition-source/material/:materialId/sources/recommendation` | GET | authMiddleware | 无 |
| 31 | `/api/nutrition-source/material/:materialId/sources/batch-set-authoritative` | POST | authMiddleware | strategy/sourceIds/fieldSelections(可选) |
| 32 | `/api/nutrition-source/material/:materialId/sources/batch-archive` | POST | authMiddleware | sourceIds(必填,array) |
| 33 | `/api/nutrition-source/material/:materialId/sources/batch-restore` | POST | authMiddleware | sourceIds(必填,array) |
| 34 | `/api/nutrition-source/material/:materialId/sources/export` | GET | authMiddleware | 无 |
| 35 | `/api/nutrition-source/material/:materialId/snapshots` | GET | authMiddleware | 无 |
| 36 | `/api/nutrition-source/snapshots/:snapshotId` | GET | authMiddleware | 无 |

### 1.3 Excel导入路由对照表

| # | 后端路由 | HTTP 方法 | 认证 | 文件限制 |
|---|----------|-----------|------|---------|
| 37 | `/api/excel-import/formula/template` | GET | authMiddleware | 无 |
| 38 | `/api/excel-import/formula/parse` | POST | authMiddleware | multer: 5MB, .xlsx/.xls |

### 1.4 数据流图

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3 + Pinia)                             │
│                                                                          │
│  MaterialList.vue ──→ materialStore.fetchMaterials()                    │
│       │                      │                                           │
│       ├── 数据看板 ────────→ materialApi.getStats()                      │
│       ├── 状态筛选 ────────→ materialStore.setStatusFilter()            │
│       ├── 搜索 ───────────→ materialStore.setKeyword()                  │
│       ├── 新增 ───────────→ materialStore.createMaterial()              │
│       ├── 编辑 ───────────→ materialStore.updateMaterial()              │
│       ├── 删除 ───────────→ materialStore.deleteMaterial()              │
│       ├── 提交审批 ───────→ materialStore.submitReview()                │
│       ├── 审批/驳回/发布 → materialStore.approveMaterial/rejectMaterial │
│       ├── 批量删除 ───────→ 循环 deleteMaterial                         │
│       └── 导出 ───────────→ 前端本地导出                                 │
│                                                                          │
│  MaterialForm.vue ──→ materialApi.create() / update()                   │
│       ├── name(必填) / code(必填) / materialType / unit                  │
│       ├── 26项营养成分输入                                                │
│       ├── 能量自动计算                                                    │
│       └── Excel导入营养 ──→ /api/excel-import/formula/parse             │
│                                                                          │
│  MaterialDetail.vue ──→ materialApi.getById()                           │
│  MaterialVersions.vue ──→ materialApi.getVersions()                     │
│  MaterialVersionCompare.vue ──→ materialApi.compareVersions()           │
│                                                                          │
│  缓存策略: 30min TTL + 并发锁(pendingFetch) + invalidateCache()          │
│  http拦截器: 401→清token跳登录 / success:false→MessagePlugin.error()    │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ HTTP (Bearer Token)
┌────────────────────────────▼─────────────────────────────────────────────┐
│                     后端 (Express + TypeScript)                          │
│                                                                          │
│  materialRoutes (authMiddleware 全局)                                    │
│       │                                                                  │
│       ├── GET /          → materialController.getMaterials               │
│       │                     → materialService.getMaterialList()          │
│       │                     → 数据隔离: admin全量, formulist仅自己        │
│       │                                                                  │
│       ├── POST /         → materialController.createMaterial             │
│       │                     → validateBody(name,code)                    │
│       │                     → 编码唯一性检查 → INSERT materials           │
│       │                                                                  │
│       ├── PUT /:id       → materialController.updateMaterial             │
│       │                     → canEdit() 权限校验                         │
│       │                     → pending_review不可编辑                      │
│       │                     → 版本化更新(被引用时创建新版本)              │
│       │                                                                  │
│       ├── DELETE /:id    → materialController.deleteMaterial             │
│       │                     → canDelete() 仅admin                        │
│       │                     → checkReference() 被引用不可删               │
│       │                     → softDeleteMaterial() 软删除                │
│       │                                                                  │
│       ├── 审批流:                                                       │
│       │   POST /:id/submit-review → draft→pending_review                │
│       │   PUT  /:id/approve       → pending_review→published (admin)    │
│       │   PUT  /:id/reject        → pending_review→draft (admin,≥5字符) │
│       │   PUT  /:id/publish       → draft/pending_review→published(admin)│
│       │                                                                  │
│       └── nutritionSourceRoutes / excelImportRoutes                      │
│             → nutritionSourceController / excelImportController          │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────────────┐
│                   数据库 (SQLite dev / MySQL prod)                       │
│                                                                          │
│  materials: id, name, code, unit, stock, material_type, unit_price,     │
│             data_source, created_by, version, is_latest, is_deleted,    │
│             status, created_at, updated_at,                              │
│             appearance_json, taste_json, efficacy_json                   │
│                                                                          │
│  material_nutrition: id, material_id, nutrient_name, value, unit,       │
│                      source_type, is_latest, created_at                  │
│                                                                          │
│  material_review_logs: id, material_id, reviewer_id, action,            │
│                        comment, created_at                               │
│                                                                          │
│  nutrition_sources: id, material_id, source_type, per100g_json,         │
│                     is_authoritative, is_archived, created_at            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 联调场景用例

> **7层验证说明**：每个用例验证以下7层闭环：
> ① 操作（用户行为）→ ② 请求（HTTP）→ ③ 数据库（SQL）→ ④ Store（Pinia状态）→ ⑤ 响应（HTTP Response）→ ⑥ 展示（UI渲染）→ ⑦ 存储（localStorage/sessionStorage）

---

### I-CRUD01: 创建原料全链路

| 字段 | 内容 |
|------|------|
| 用例ID | I-CRUD01 |
| 场景 | 用户在 MaterialForm 填写原料信息并提交创建 |
| 前置条件 | 已登录（formulist 或 admin），数据库中不存在同名/同code原料 |
| 测试数据 | `{ name: "测试黄芪", code: "CS-HQ-001", materialType: "herb", unit: "g", stock: 100, unitPrice: 25.50 }` |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 点击"新增原料"按钮 → 填写表单 → 点击"保存" | MaterialForm 弹窗打开，表单可填写 |
| ② 请求 | `POST /api/materials` | Request Body 包含 name, code, materialType 等；Headers 包含 `Authorization: Bearer <token>` |
| ③ 数据库 | `INSERT INTO materials (id, name, code, ..., status, created_at) VALUES (...)` | 新增一行，status='draft', version=1, is_latest=1, is_deleted=0, created_by=当前userId |
| ④ Store | `materialStore.createMaterial()` 返回 `{ success: true, data: Material }` | materials 列表缓存失效（invalidateCache），下次 fetch 从后端拉取 |
| ⑤ 响应 | HTTP 201, `{ success: true, data: { id, name, code, status: "draft", ... }, message: "原料创建成功，当前为草稿状态" }` | 响应字段为 camelCase，id 为 UUID |
| ⑥ 展示 | MaterialList 表格新增一行 | 新原料出现在列表中，状态标签显示"草稿"，创建人显示当前用户名 |
| ⑦ 存储 | localStorage `tingstudio_token` 存在 | Token 未被清除，用户保持登录态 |

**异常分支**：

| 分支 | 操作 | 预期响应 | 前端表现 |
|------|------|---------|---------|
| 编码重复 | 提交已存在的 code | HTTP 409, `{ success: false, error: { message: "原料编码已存在", code: "DUPLICATE_ENTRY" } }` | MessagePlugin.error 提示"原料编码已存在" |
| 缺少必填字段 | name 或 code 为空 | HTTP 400, `{ success: false, message: "请输入原料名称" }` | 表单校验提示，请求不发 |
| 未认证 | Token 无效/缺失 | HTTP 401 | 拦截器清 token，跳转登录页 |

---

### I-CRUD02: 编辑原料全链路

| 字段 | 内容 |
|------|------|
| 用例ID | I-CRUD02 |
| 场景 | 创建者编辑自己 draft 状态的原料 |
| 前置条件 | 已登录，存在一条 draft 状态且 created_by 为当前用户的原料 |
| 测试数据 | 修改 `{ name: "测试黄芪-修改", unitPrice: 30.00 }` |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 在列表中点击原料行 → 点击"编辑" → 修改字段 → 保存 | 进入编辑模式，表单预填原值 |
| ② 请求 | `PUT /api/materials/:id` | Request Body 包含修改字段；Headers 含 Bearer token |
| ③ 数据库 | 未被配方引用: `UPDATE materials SET ... WHERE id = ?`；被配方引用: `INSERT INTO materials (...)` 创建新版本 | 未引用: version 不变，versionAction="updated"；被引用: 新 id, version+1, versionAction="created" |
| ④ Store | `materialStore.updateMaterial()` 返回 `{ success: true, result: UpdateResult }` | 缓存失效 + updateMaterialItem() 即时更新本地单项 |
| ⑤ 响应 | HTTP 200, `{ success: true, data: { id, version, isLatest, versionAction: "updated"/"created" } }` | 返回 UpdateResult 结构 |
| ⑥ 展示 | 列表中该原料信息更新 | 名称/单价即时刷新，若版本升级则显示版本号变化 |
| ⑦ 存储 | Token 不变 | 用户保持登录态 |

**异常分支**：

| 分支 | 操作 | 预期响应 | 前端表现 |
|------|------|---------|---------|
| 待审批不可编辑 | 编辑 pending_review 状态原料 | HTTP 400, `{ success: false, error: { message: "待审批状态的原料不可编辑", code: "VALIDATION_ERROR" } }` | MessagePlugin.error 提示 |
| 非创建者编辑 | formulist 编辑他人原料 | HTTP 403, `{ success: false, error: { message: "您没有权限编辑此原料", code: "FORBIDDEN" } }` | MessagePlugin.error 提示 |
| 原料不存在 | 编辑已删除的原料 ID | HTTP 404, `{ success: false, message: "原料不存在" }` | 提示不存在 |

---

### I-CRUD03: 删除原料全链路

| 字段 | 内容 |
|------|------|
| 用例ID | I-CRUD03 |
| 场景 | admin 删除未被配方引用的原料 |
| 前置条件 | 以 admin 登录，目标原料未被任何配方引用 |
| 测试数据 | 选择一条 draft 状态原料执行删除 |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 勾选原料 → 点击"删除" → t-popconfirm 确认 | 弹出二次确认 |
| ② 请求 | `DELETE /api/materials/:id` | Headers 含 Bearer token |
| ③ 数据库 | `UPDATE materials SET is_deleted = 1, updated_at = ? WHERE id = ?` | 软删除，is_deleted=1，物理记录保留 |
| ④ Store | `materialStore.deleteMaterial()` 返回 `{ success: true }` | 从 materials 数组中移除该条目，total-1，缓存失效 |
| ⑤ 响应 | HTTP 200, `{ success: true, data: null, message: "原料已删除" }` | — |
| ⑥ 展示 | 列表中该原料消失 | 无闪烁，总数减少 |
| ⑦ 存储 | Token 不变 | — |

**异常分支**：

| 分支 | 操作 | 预期响应 | 前端表现 |
|------|------|---------|---------|
| formulist 删除 | 非 admin 尝试删除 | HTTP 403, `{ success: false, error: { message: "仅管理员可删除原料", code: "FORBIDDEN" } }` | Store 返回 `{ success: false, message: "仅管理员可删除原料" }` |
| 被配方引用 | 删除被引用的原料 | HTTP 400, `{ success: false, error: { message: "该原料正在被 N 个配方引用，无法删除", code: "VALIDATION_ERROR" } }` | Store 提取 backendMsg 展示 |

---

### I-CRUD04: 查询原料列表全链路

| 字段 | 内容 |
|------|------|
| 用例ID | I-CRUD04 |
| 场景 | 用户进入原料列表页，自动加载列表数据 |
| 前置条件 | 已登录，数据库中存在多条原料数据 |
| 测试数据 | 默认 page=1, pageSize=8 |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 导航到原料列表页 | 页面加载，触发 fetchMaterials() |
| ② 请求 | `GET /api/materials?page=1&pageSize=8` | Headers 含 Bearer token |
| ③ 数据库 | `SELECT ... FROM materials WHERE is_deleted=0 AND is_latest=1 ...` | admin 无 created_by 过滤；formulist 加 `AND created_by = ?` |
| ④ Store | `materials.value = res.list; total.value = res.pagination.total` | 列表数据填充 Store，缓存标记有效（非空数据时） |
| ⑤ 响应 | HTTP 200, `{ success: true, data: { list: Material[], pagination: { page, pageSize, total, totalPages } } }` | 分页结构完整 |
| ⑥ 展示 | 表格渲染原料列表 | 每行显示名称、编码、类型、状态、创建人、时间等；时间用 formatTimestamp 格式化 |
| ⑦ 存储 | Token 不变 | — |

**缓存验证**：

| 场景 | 操作 | 预期 |
|------|------|------|
| 30min 内重复访问 | 再次进入列表页 | 不发请求，使用缓存 |
| 强制刷新 | 调用 refreshMaterials(true) | 重新发请求 |
| 并发请求 | 快速连续触发 fetchMaterials | 仅发一次请求（pendingFetch 锁） |

---

### I-AUTH01: Token过期

| 字段 | 内容 |
|------|------|
| 用例ID | I-AUTH01 |
| 场景 | 用户 Token 过期后操作原料模块 |
| 前置条件 | 用户已登录但 Token 已过期（超过7天） |
| 测试数据 | 使用过期 Token 调用任意原料 API |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 在列表页执行任意操作（搜索/翻页等） | — |
| ② 请求 | `GET /api/materials` (带过期 Token) | — |
| ③ 数据库 | 无查询执行 | authMiddleware 拦截 |
| ④ Store | catch 分支执行 | loading 恢复 false |
| ⑤ 响应 | HTTP 401, `{ success: false, error: { message: "...", code: "TOKEN_EXPIRED" } }` | — |
| ⑥ 展示 | http 拦截器自动处理 | 清除 localStorage token → 跳转 /login → MessagePlugin.error("登录已过期") |
| ⑦ 存储 | localStorage `tingstudio_token` 被清除 | — |

---

### I-ISO01: formulist数据隔离

| 字段 | 内容 |
|------|------|
| 用例ID | I-ISO01 |
| 场景 | formulist 只能看到自己创建的原料，admin 可见全部 |
| 前置条件 | 数据库中存在 admin 和 formulist_A 各创建的原料 |
| 测试数据 | admin 创建3条，formulist_A 创建2条 |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 分别以 admin 和 formulist_A 登录，查看原料列表 | — |
| ② 请求 | `GET /api/materials` | 同一 URL，不同 Token |
| ③ 数据库 | admin: `WHERE is_deleted=0 AND is_latest=1`；formulist: `AND created_by = 'formulist_A_id'` | SQL 条件不同 |
| ④ Store | admin: materials 含5条；formulist_A: materials 含2条 | 数据量不同 |
| ⑤ 响应 | admin: total=5；formulist_A: total=2 | 分页 total 不同 |
| ⑥ 展示 | admin 列表5条数据；formulist_A 列表2条数据 | — |
| ⑦ 存储 | 各自 Token 独立 | — |

---

### I-ERR01: 错误传播（驳回comment不足5字符）

| 字段 | 内容 |
|------|------|
| 用例ID | I-ERR01 |
| 场景 | admin 驳回原料时 comment 少于5字符 |
| 前置条件 | 以 admin 登录，存在 pending_review 状态原料 |
| 测试数据 | `{ comment: "不好" }`（仅2字符） |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 点击"驳回" → 输入"不好" → 确认 | — |
| ② 请求 | `PUT /api/materials/:id/reject` | Body: `{ comment: "不好" }` |
| ③ 数据库 | 无 UPDATE 执行 | 校验在 SQL 之前 |
| ④ Store | `materialStore.rejectMaterial()` 返回 `{ success: false, message: "驳回原因至少5个字符" }` | — |
| ⑤ 响应 | HTTP 400, `{ success: false, error: { message: "驳回原因至少5个字符", code: "VALIDATION_ERROR" } }` | — |
| ⑥ 展示 | MessagePlugin.error 提示"驳回原因至少5个字符" | 原料状态不变，仍为 pending_review |
| ⑦ 存储 | Token 不变 | — |

**契约差异标注**：前端 `materialApi.reject(id, comment)` 的 TypeScript 签名仅要求 `comment: string`，无最小长度约束；后端强制 `comment.trim().length >= 5`。前端应在提交前增加前端校验，避免无效请求。

---

### I-NUTR01: 营养数据保存+能量计算

| 字段 | 内容 |
|------|------|
| 用例ID | I-NUTR01 |
| 场景 | 创建原料时填写26项营养成分，验证能量自动计算与保存 |
| 前置条件 | 已登录，在 MaterialForm 中 |
| 测试数据 | protein=10g, fat=5g, carbohydrate=20g → 能量 = 10×17 + 5×37 + 20×17 = 720kJ |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 填写营养成分字段 | 能量字段自动计算显示 720kJ |
| ② 请求 | `POST /api/materials` | Body 包含营养数据（通过 nutrition_source 或直接字段） |
| ③ 数据库 | `INSERT INTO material_nutrition (...)` 或 nutrition_sources 表 | 营养数据持久化 |
| ④ Store | createMaterial 返回成功 | 缓存失效 |
| ⑤ 响应 | HTTP 201, 返回含 nutrition 字段的 Material 对象 | — |
| ⑥ 展示 | MaterialDetail 营养网格显示各营养素值，能量显示 720kJ | NRV% 正确计算 |
| ⑦ 存储 | Token 不变 | — |

**能量计算规则验证**：

| 输入 | 计算 | 预期能量 |
|------|------|---------|
| protein=10, fat=5, carb=20 | 10×17 + 5×37 + 20×17 | 720 kJ |
| protein=0.3, fat=0.2, carb=0.4 | 0界限归零 → 全部归零 | 0 kJ |
| protein=0, fat=0, carb=0 | 全零 | 0 kJ |

---

### I-PERM01: 权限联动（admin vs formulist / 创建者 vs 非创建者）

| 字段 | 内容 |
|------|------|
| 用例ID | I-PERM01 |
| 场景 | 不同角色对原料的操作权限差异 |
| 前置条件 | admin 和 formulist 各登录一次；formulist_A 创建的原料 |

**权限矩阵验证**：

| 操作 | admin | formulist(创建者) | formulist(非创建者) |
|------|-------|-------------------|-------------------|
| 查看列表 | ✅ 全量 | ✅ 仅自己 | ✅ 仅自己 |
| 查看详情 | ✅ | ✅ 自己的 | ✅ 自己的 |
| 创建 | ✅ | ✅ | ✅ |
| 编辑(draft) | ✅ 任意 | ✅ 自己的 | ❌ 403 |
| 编辑(pending_review) | ❌ 不可编辑 | ❌ 不可编辑 | ❌ 不可编辑 |
| 删除 | ✅ | ❌ 403 | ❌ 403 |
| 提交审批 | ✅ 任意draft | ✅ 自己的draft | ❌ 403 |
| 审批通过 | ✅ | ❌ 403 | ❌ 403 |
| 驳回 | ✅ | ❌ 403 | ❌ 403 |
| 直接发布 | ✅ | ❌ 403 | ❌ 403 |

**7层验证**（以 formulist 非创建者编辑为例）：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | formulist_B 点击 formulist_A 的原料 → 编辑 | — |
| ② 请求 | `PUT /api/materials/:id` | — |
| ③ 数据库 | 无 UPDATE | canEdit() 返回 false |
| ④ Store | 返回 `{ success: false, message: "您没有权限编辑此原料" }` | — |
| ⑤ 响应 | HTTP 403 | — |
| ⑥ 展示 | MessagePlugin.error 提示权限不足 | 编辑表单不提交 |
| ⑦ 存储 | Token 不变 | — |

---

### I-SRCH01: 搜索+状态筛选联调

| 字段 | 内容 |
|------|------|
| 用例ID | I-SRCH01 |
| 场景 | 用户在列表页使用关键词搜索和状态筛选 |
| 前置条件 | 已登录，数据库中存在多条不同状态的原料 |
| 测试数据 | 关键词="黄芪"，statusFilter="draft" |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 输入搜索词 → 点击状态筛选"草稿" | 搜索框输入，筛选按钮高亮 |
| ② 请求 | `GET /api/materials?keyword=黄芪&status=draft&page=1&pageSize=8` | 参数正确传递 |
| ③ 数据库 | `WHERE name LIKE '%黄芪%' AND status = 'draft' AND is_deleted=0 AND is_latest=1` | SQL 条件组合 |
| ④ Store | `setKeyword("黄芪")` → `setStatusFilter("draft")` → `fetchMaterials()` | currentPage 重置为1 |
| ⑤ 响应 | HTTP 200, 返回筛选后的列表 | 仅包含名称含"黄芪"且状态为 draft 的原料 |
| ⑥ 展示 | 表格仅显示筛选结果 | 状态筛选按钮"草稿"高亮，搜索框显示"黄芪" |
| ⑦ 存储 | Token 不变 | — |

**筛选组合验证**：

| 筛选条件 | 预期请求参数 | 预期结果 |
|---------|-------------|---------|
| 仅搜索 | `keyword=黄芪` | 名称含"黄芪"的所有状态原料 |
| 仅状态 | `status=published` | 所有已发布原料 |
| 搜索+状态 | `keyword=黄芪&status=draft` | 交集 |
| 全部 | 无 keyword 和 status | 全量列表 |

---

### I-OWNS01: 越权操作（formulist编辑他人原料）

| 字段 | 内容 |
|------|------|
| 用例ID | I-OWNS01 |
| 场景 | formulist 尝试编辑其他用户创建的原料 |
| 前置条件 | 以 formulist_B 登录，formulist_A 创建了一条 draft 原料 |
| 测试数据 | 直接调用 `PUT /api/materials/:id` (formulist_A 的原料 ID) |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | formulist_B 尝试编辑 formulist_A 的原料 | UI 上编辑按钮可能隐藏/禁用 |
| ② 请求 | `PUT /api/materials/:id` (formulist_B 的 token) | — |
| ③ 数据库 | 无 UPDATE 执行 | canEdit() 校验 created_by ≠ userId 且 role ≠ admin |
| ④ Store | 返回 `{ success: false, message: "您没有权限编辑此原料" }` | — |
| ⑤ 响应 | HTTP 403, `{ success: false, error: { message: "您没有权限编辑此原料", code: "FORBIDDEN" } }` | — |
| ⑥ 展示 | MessagePlugin.error 提示 | 数据不变 |
| ⑦ 存储 | Token 不变 | — |

---

### I-FILE01: Excel导入原料链路

| 字段 | 内容 |
|------|------|
| 用例ID | I-FILE01 |
| 场景 | 用户通过 Excel 文件导入原料营养数据 |
| 前置条件 | 已登录，准备了合法的 .xlsx 文件 |
| 测试数据 | 包含原料营养数据的 .xlsx 文件（≤5MB） |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 在 MaterialForm 中点击"Excel导入" → 选择文件 → 上传 | 文件选择器打开 |
| ② 请求 | `POST /api/excel-import/formula/parse` (multipart/form-data, field: file) | Content-Type: multipart/form-data |
| ③ 数据库 | 解析后数据暂存（不入库，返回给前端预览） | — |
| ④ Store | 解析结果填充表单营养字段 | — |
| ⑤ 响应 | HTTP 200, `{ success: true, data: { 营养数据 } }` | — |
| ⑥ 展示 | 表单营养字段自动填充 | 各营养素值显示 |
| ⑦ 存储 | Token 不变 | — |

**异常分支**：

| 分支 | 操作 | 预期响应 | 前端表现 |
|------|------|---------|---------|
| 文件过大 | 上传 >5MB 文件 | multer 拦截，返回错误 | 提示文件过大 |
| 格式错误 | 上传 .txt 文件 | multer fileFilter 拦截 | 提示只支持 Excel |
| 空文件 | 上传空 .xlsx | 解析失败 | 提示解析错误 |

---

### I-PRESET01: 审批流（draft → pending_review → published / draft）

| 字段 | 内容 |
|------|------|
| 用例ID | I-PRESET01 |
| 场景 | 完整审批流程：创建→提交→审批通过/驳回 |
| 前置条件 | admin 和 formulist 各登录一次 |

**审批流全链路验证**：

#### 步骤1: 创建（formulist 创建原料）

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ② 请求 | `POST /api/materials` | — |
| ③ 数据库 | INSERT status='draft' | — |
| ⑤ 响应 | status: "draft" | — |
| ⑥ 展示 | 状态标签"草稿" | — |

#### 步骤2: 提交审批（formulist 提交自己的原料）

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ② 请求 | `POST /api/materials/:id/submit-review` | — |
| ③ 数据库 | `UPDATE materials SET status='pending_review'` + INSERT review_log(action='submit') | — |
| ⑤ 响应 | HTTP 200, `{ success: true, message: "原料已提交审批" }` | — |
| ⑥ 展示 | 状态标签变为"待审批" | — |

#### 步骤3a: 审批通过（admin 操作）

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ② 请求 | `PUT /api/materials/:id/approve` | — |
| ③ 数据库 | `UPDATE materials SET status='published'` + INSERT review_log(action='approve') | — |
| ⑤ 响应 | HTTP 200, `{ success: true, message: "原料已审批通过并发布" }` | — |
| ⑥ 展示 | 状态标签变为"已发布" | — |

#### 步骤3b: 驳回（admin 操作，comment ≥5字符）

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ② 请求 | `PUT /api/materials/:id/reject` Body: `{ comment: "营养成分数据不完整，请补充后重新提交" }` | — |
| ③ 数据库 | `UPDATE materials SET status='draft'` + INSERT review_log(action='reject', comment=...) | — |
| ⑤ 响应 | HTTP 200, `{ success: true, message: "原料已驳回" }` | — |
| ⑥ 展示 | 状态标签回到"草稿" | — |

**状态转换矩阵**：

| 当前状态 | submit-review | approve | reject | publish |
|---------|---------------|---------|--------|---------|
| draft | → pending_review | ❌ 400 | ❌ 400 | → published (admin) |
| pending_review | ❌ 400 | → published (admin) | → draft (admin) | → published (admin) |
| published | ❌ 400 | ❌ 400 | ❌ 400 | ❌ 400 |

---

### I-REF01: 关联完整性（删除被配方引用的原料被拒绝）

| 字段 | 内容 |
|------|------|
| 用例ID | I-REF01 |
| 场景 | admin 尝试删除被配方引用的原料 |
| 前置条件 | 以 admin 登录，目标原料被至少1个配方引用 |
| 测试数据 | 原料 ID 被配方 formula_materials 表引用 |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | admin 勾选被引用的原料 → 点击删除 | — |
| ② 请求 | `DELETE /api/materials/:id` | — |
| ③ 数据库 | checkReference() 查询 formula_materials → referenced=true | 无 DELETE/UPDATE 执行 |
| ④ Store | 返回 `{ success: false, message: "该原料正在被 N 个配方引用，无法删除" }` | materials 数组不变 |
| ⑤ 响应 | HTTP 400, `{ success: false, error: { message: "该原料正在被 N 个配方引用，无法删除", code: "VALIDATION_ERROR" } }` | — |
| ⑥ 展示 | MessagePlugin.error 提示引用信息 | 原料仍在列表中 |
| ⑦ 存储 | Token 不变 | — |

---

### I-EXP01: 导出一致性

| 字段 | 内容 |
|------|------|
| 用例ID | I-EXP01 |
| 场景 | 用户导出原料列表，验证导出数据与页面展示一致 |
| 前置条件 | 已登录，列表中有数据 |
| 测试数据 | 选择多条原料导出 |

**7层验证**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 勾选原料 → 点击"导出"按钮 | — |
| ② 请求 | 无额外 HTTP 请求（前端本地导出） | — |
| ③ 数据库 | 无额外查询 | 使用 Store 中已有数据 |
| ④ Store | 读取 `materials.value` 中勾选项 | — |
| ⑤ 响应 | N/A | — |
| ⑥ 展示 | 浏览器下载 Excel/CSV 文件 | 文件内容与列表展示字段一致 |
| ⑦ 存储 | Token 不变 | — |

**一致性验证点**：
- 导出字段名与表头一致
- 数值精度与页面展示一致（金额 .toFixed(2)）
- 时间格式与 formatTimestamp 输出一致
- 状态枚举值转为中文标签

---

### I-BATCH01: 批量操作（批量删除/批量营养源操作）

| 字段 | 内容 |
|------|------|
| 用例ID | I-BATCH01 |
| 场景 | admin 批量删除多条原料；批量营养源操作 |
| 前置条件 | 以 admin 登录，列表中有多条可删除的原料 |

**7层验证（批量删除）**：

| 层级 | 验证点 | 预期结果 |
|------|--------|---------|
| ① 操作 | 勾选多条原料 → 点击"批量删除" → t-popconfirm 确认 | 批量操作栏显示已选数量 |
| ② 请求 | 循环调用 `DELETE /api/materials/:id` | 逐条发送 |
| ③ 数据库 | 每条执行 `UPDATE materials SET is_deleted=1` | 被引用的跳过（返回错误） |
| ④ Store | 逐条从 materials 数组移除成功的项 | total 相应减少 |
| ⑤ 响应 | 每条独立返回 200 或 400 | — |
| ⑥ 展示 | 成功删除的从列表消失；失败的提示原因 | 批量操作栏消失 |
| ⑦ 存储 | Token 不变 | — |

**批量营养源操作验证**：

| 操作 | 后端路由 | 预期 |
|------|---------|------|
| 批量设为权威 | `POST /api/nutrition-source/material/:materialId/sources/batch-set-authoritative` | 多个 source 同时设为权威 |
| 批量归档 | `POST /api/nutrition-source/material/:materialId/sources/batch-archive` | sourceIds 数组中所有源归档 |
| 批量恢复 | `POST /api/nutrition-source/material/:materialId/sources/batch-restore` | sourceIds 数组中所有源恢复 |
| 批量营养补充 | `POST /api/nutrition-source/bulk-enrich-nutrition` | 批量补充营养数据 |

---

## 3. 契约验证用例

### 3.1 端点匹配（C-EP）

| 用例ID | 前端路径 | 后端路由 | 匹配状态 | 备注 |
|--------|---------|---------|---------|------|
| C-EP01 | `GET /materials` | `GET /api/materials` | ✅ 匹配 | — |
| C-EP02 | `GET /materials/:id` | `GET /api/materials/:id` | ✅ 匹配 | — |
| C-EP03 | `POST /materials` | `POST /api/materials` | ✅ 匹配 | — |
| C-EP04 | `PUT /materials/:id` | `PUT /api/materials/:id` | ✅ 匹配 | — |
| C-EP05 | `DELETE /materials/:id` | `DELETE /api/materials/:id` | ✅ 匹配 | — |
| C-EP06 | `GET /materials/next-code` | `GET /api/materials/next-code` | ✅ 匹配 | — |
| C-EP07 | `GET /materials/by-formula/:formulaId` | — | ❌ **不匹配** | 前端定义了 `getByFormula()`，后端 materials 路由中无对应端点 |
| C-EP08 | `GET /materials/stats` | `GET /api/materials/stats` | ✅ 匹配 | — |
| C-EP09 | `GET /materials/:id/versions` | `GET /api/materials/:id/versions` | ✅ 匹配 | — |
| C-EP10 | `GET /materials/:id/versions/:versionId` | `GET /api/materials/:id/versions/:versionId` | ✅ 匹配 | — |
| C-EP11 | `GET /materials/:id/references` | `GET /api/materials/:id/references` | ✅ 匹配 | — |
| C-EP12 | `GET /materials/:id/versions/compare` | `GET /api/materials/:id/versions/compare` | ✅ 匹配 | — |
| C-EP13 | `POST /materials/:id/submit-review` | `POST /api/materials/:id/submit-review` | ✅ 匹配 | — |
| C-EP14 | `PUT /materials/:id/approve` | `PUT /api/materials/:id/approve` | ✅ 匹配 | — |
| C-EP15 | `PUT /materials/:id/reject` | `PUT /api/materials/:id/reject` | ✅ 匹配 | — |
| C-EP16 | `PUT /materials/:id/publish` | `PUT /api/materials/:id/publish` | ✅ 匹配 | — |
| C-EP17 | `GET /materials/pending-review` | `GET /api/materials/pending-review` | ✅ 匹配 | — |
| C-EP18 | `GET /materials/:id/review-logs` | `GET /api/materials/:id/review-logs` | ✅ 匹配 | — |
| C-EP19 | `GET /materials/my-counts` | `GET /api/materials/my-counts` | ✅ 匹配 | — |
| C-EP20 | — | `GET /api/materials/my-submissions` | ❌ **不匹配** | 后端有路由 `getMyMaterialSubmissions`，前端未定义对应 API 函数 |

### 3.2 HTTP方法（C-METHOD）

| 用例ID | 端点 | 前端方法 | 后端方法 | 匹配 |
|--------|------|---------|---------|------|
| C-METHOD01 | `/materials` (列表) | GET | GET | ✅ |
| C-METHOD02 | `/materials` (创建) | POST | POST | ✅ |
| C-METHOD03 | `/materials/:id` (详情) | GET | GET | ✅ |
| C-METHOD04 | `/materials/:id` (更新) | PUT | PUT | ✅ |
| C-METHOD05 | `/materials/:id` (删除) | DELETE | DELETE | ✅ |
| C-METHOD06 | `/materials/next-code` | GET | GET | ✅ |
| C-METHOD07 | `/materials/stats` | GET | GET | ✅ |
| C-METHOD08 | `/materials/:id/versions` | GET | GET | ✅ |
| C-METHOD09 | `/materials/:id/versions/:versionId` | GET | GET | ✅ |
| C-METHOD10 | `/materials/:id/references` | GET | GET | ✅ |
| C-METHOD11 | `/materials/:id/versions/compare` | GET | GET | ✅ |
| C-METHOD12 | `/materials/:id/submit-review` | POST | POST | ✅ |
| C-METHOD13 | `/materials/:id/approve` | PUT | PUT | ✅ |
| C-METHOD14 | `/materials/:id/reject` | PUT | PUT | ✅ |
| C-METHOD15 | `/materials/:id/publish` | PUT | PUT | ✅ |
| C-METHOD16 | `/materials/pending-review` | GET | GET | ✅ |
| C-METHOD17 | `/materials/:id/review-logs` | GET | GET | ✅ |
| C-METHOD18 | `/materials/my-counts` | GET | GET | ✅ |
| C-METHOD19 | `/materials/by-formula/:formulaId` | GET | — | ⚠️ 无后端 |

### 3.3 请求体（C-REQ）

| 用例ID | 端点 | 字段 | 前端约束 | 后端约束 | 匹配 |
|--------|------|------|---------|---------|------|
| C-REQ01 | `POST /materials` | name | MaterialForm: string | validateBody: required, minLength=1 | ✅ |
| C-REQ02 | `POST /materials` | code | MaterialForm: string | validateBody: required, minLength=1 | ✅ |
| C-REQ03 | `PUT /materials/:id` | name/code | Partial<MaterialForm>: 可选 | validateBody: required=false, minLength=1 | ✅ |
| C-REQ04 | `PUT /materials/:id/reject` | comment | TypeScript: string (无长度限制) | 后端: `comment.trim().length >= 5` | ❌ **差异** |
| C-REQ05 | `POST /materials/:id/submit-review` | comment | TypeScript: string? (可选) | 后端: 无校验（可选） | ✅ |

**C-REQ04 差异详情**：
- 前端 `materialApi.reject(id, comment: string)` — 仅类型约束 string，无最小长度
- 后端 `rejectMaterial()` — 强制 `comment.trim().length >= 5`，否则返回 400
- **建议**：前端驳回弹窗增加最少5字符的输入校验

### 3.4 响应体（C-RES）

| 用例ID | 端点 | 前端期望类型 | 后端实际响应 | 匹配 |
|--------|------|-------------|-------------|------|
| C-RES01 | `GET /materials` | `{ list: Material[], pagination: Pagination }` | `{ list, pagination: { page, pageSize, total, totalPages } }` | ✅ |
| C-RES02 | `GET /materials/:id` | `Material` | `Material` (rowToCamelCase) | ✅ |
| C-RES03 | `POST /materials` | `Material` | `Material` (rowToCamelCase, HTTP 201) | ✅ |
| C-RES04 | `PUT /materials/:id` | `UpdateResult` | `{ id, version, isLatest, versionAction, previousVersionId? }` | ✅ |
| C-RES05 | `DELETE /materials/:id` | `{ success: boolean, message: string }` | `{ success: true, data: null, message: "原料已删除" }` | ⚠️ 前端期望顶层 success/message，后端包裹在 data 中 |
| C-RES06 | `GET /materials/stats` | `{ total, herbCount, supplementCount, nutritionCount }` | 同左 | ✅ |
| C-RES07 | `POST /materials/:id/submit-review` | 无泛型 | `{ success: true, data: null, message: "原料已提交审批" }` | ⚠️ 前端未声明响应泛型 |
| C-RES08 | `PUT /materials/:id/approve` | 无泛型 | `{ success: true, data: null, message: "原料已审批通过并发布" }` | ⚠️ 前端未声明响应泛型 |
| C-RES09 | `PUT /materials/:id/reject` | 无泛型 | `{ success: true, data: null, message: "原料已驳回" }` | ⚠️ 前端未声明响应泛型 |
| C-RES10 | `PUT /materials/:id/publish` | 无泛型 | `{ success: true, data: null, message: "原料已发布" }` | ⚠️ 前端未声明响应泛型 |

**C-RES07~10 备注**：前端 `submitReview`/`approve`/`reject`/`publish` 四个审批 API 函数未声明泛型响应类型（`http.post/put` 第二个泛型参数缺失），虽然 http 拦截器会自动解包 `data`，但类型安全性不足。

### 3.5 字段命名（C-NAME）

| 用例ID | 数据库字段 | 后端转换 | 前端字段 | 匹配 |
|--------|-----------|---------|---------|------|
| C-NAME01 | `material_type` | rowToCamelCase → `materialType` | `materialType` | ✅ |
| C-NAME02 | `unit_price` | rowToCamelCase → `unitPrice` | `unitPrice` | ✅ |
| C-NAME03 | `is_latest` / `is_deleted` | rowToCamelCase → `isLatest` / `isDeleted` | `isLatest` / `isDeleted` | ✅ |

### 3.6 日期格式（C-DATE）

| 用例ID | 场景 | 后端返回 | 前端处理 | 匹配 |
|--------|------|---------|---------|------|
| C-DATE01 | createdAt / updatedAt | ISO 8601 UTC (`2026-05-03T14:21:47.611Z`) | `formatTimestamp()` → `2026-05-03 22:21:47` | ✅ |
| C-DATE02 | reviewLogs.createdAt | ISO 8601 UTC | `formatTimestamp()` 或 `formatDate()` | ✅ |

### 3.7 数值精度（C-PREC）

| 用例ID | 字段 | 后端存储 | 前端展示 | 匹配 |
|--------|------|---------|---------|------|
| C-PREC01 | unitPrice | DECIMAL/REAL | `.toFixed(2)` 或 `'暂未录入'` | ✅ |
| C-PREC02 | stock | INTEGER | 直接展示 | ✅ |
| C-PREC03 | 营养素值 | REAL | `.toFixed(2)`% (NRV) / 原始值 | ✅ |

### 3.8 分页结构（C-PSTR）

| 用例ID | 场景 | 前端期望 | 后端实际 | 匹配 |
|--------|------|---------|---------|------|
| C-PSTR01 | 列表分页 | `{ list: T[], pagination: { page, pageSize, total, totalPages } }` | `successWithPagination()` 输出同结构 | ✅ |

### 3.9 枚举值（C-ENUM）

| 用例ID | 枚举类型 | 前端定义 | 后端定义 | 匹配 |
|--------|---------|---------|---------|------|
| C-ENUM01 | status | `"draft" \| "pending_review" \| "published"` | `'draft'` / `'pending_review'` / `'published'` | ✅ |
| C-ENUM02 | materialType | `"herb"` / `"supplement"` (MaterialForm) | `'herb'` / 其他(视为supplement) | ✅ |
| C-ENUM03 | reviewLog action | `"submit" \| "approve" \| "reject" \| "publish"` | `'submit'` / `'approve'` / `'reject'` / `'publish'` | ✅ |
| C-ENUM04 | sourceType | — | `"manual" \| "tianapi" \| "seed" \| "ai" \| "excel_import" \| "other"` | ✅ (营养源) |

---

## 4. 测试覆盖率统计

### 4.1 联调场景覆盖率

| 场景类别 | 用例数 | 覆盖要点 |
|---------|-------|---------|
| CRUD 全链路 | 4 | 创建/编辑/删除/查询 |
| 认证与权限 | 3 | Token过期/数据隔离/越权操作 |
| 错误传播 | 1 | 驳回comment校验差异 |
| 业务逻辑 | 3 | 营养计算/审批流/关联完整性 |
| 搜索筛选 | 1 | 关键词+状态组合 |
| 文件操作 | 1 | Excel导入 |
| 批量操作 | 1 | 批量删除/营养源批量 |
| 导出 | 1 | 导出一致性 |
| **合计** | **15** | — |

### 4.2 契约验证覆盖率

| 契约维度 | 用例数 | 通过 | 不匹配 | 差异 |
|---------|-------|------|--------|------|
| 端点匹配 (C-EP) | 20 | 18 | 2 | getByFormula无后端路由；my-submissions前端缺失 |
| HTTP方法 (C-METHOD) | 19 | 18 | 1 | getByFormula无后端 |
| 请求体 (C-REQ) | 5 | 4 | 1 | reject comment校验差异 |
| 响应体 (C-RES) | 10 | 6 | 4 | 审批API缺泛型；delete响应结构微差 |
| 字段命名 (C-NAME) | 3 | 3 | 0 | — |
| 日期格式 (C-DATE) | 2 | 2 | 0 | — |
| 数值精度 (C-PREC) | 3 | 3 | 0 | — |
| 分页结构 (C-PSTR) | 1 | 1 | 0 | — |
| 枚举值 (C-ENUM) | 4 | 4 | 0 | — |
| **合计** | **67** | **59** | **8** | — |

### 4.3 7层验证覆盖率

| 验证层 | 覆盖用例数 | 总用例数 | 覆盖率 |
|--------|-----------|---------|-------|
| ① 操作 | 15 | 15 | 100% |
| ② 请求 | 15 | 15 | 100% |
| ③ 数据库 | 15 | 15 | 100% |
| ④ Store | 15 | 15 | 100% |
| ⑤ 响应 | 15 | 15 | 100% |
| ⑥ 展示 | 15 | 15 | 100% |
| ⑦ 存储 | 15 | 15 | 100% |

### 4.4 已发现契约问题汇总

| # | 问题 | 严重程度 | 影响范围 | 建议 |
|---|------|---------|---------|------|
| 1 | `getByFormula()` 前端有定义但后端无路由 | 🔴 高 | 前端调用将 404 | 后端补充路由或前端移除该 API |
| 2 | `/my-submissions` 后端有路由但前端无 API 函数 | 🟡 中 | 功能缺失 | 前端补充 API 函数 |
| 3 | reject comment 前端无最小长度校验 | 🟡 中 | 无效请求浪费 | 前端驳回弹窗增加 ≥5 字符校验 |
| 4 | 审批 API (submit/approve/reject/publish) 缺泛型响应类型 | 🟢 低 | 类型安全性 | 补充泛型声明如 `http.post<unknown, { success: boolean; message: string }>` |
| 5 | delete 响应结构：前端期望 `{ success, message }`，后端返回 `{ success, data: null, message }` | 🟢 低 | http 拦截器已解包 | 确认拦截器行为一致即可 |
