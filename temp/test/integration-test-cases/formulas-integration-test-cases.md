# 配方模块（Formulas）前后端联调测试用例

| 字段 | 值 |
|------|-----|
| 文档ID | ITC-FM-20260609-001 |
| 模块 | formulas（配方） |
| 版本 | v1.0 |
| 创建日期 | 2026-06-10 |
| 最后更新 | 2026-06-10 |

---

## 前后端文件清单

| 层级 | 文件路径 | Hash（占位） |
|------|---------|-------------|
| 前端 API | `frontend/src/api/formula.ts` | `<hash>` |
| 前端 HTTP | `frontend/src/api/http.ts` | `<hash>` |
| 前端 Store | `frontend/src/stores/formula.ts` | `<hash>` |
| 前端视图-列表 | `frontend/src/views/formulas/FormulaList.vue` | `<hash>` |
| 前端视图-表单 | `frontend/src/views/formulas/FormulaForm.vue` | `<hash>` |
| 前端视图-详情 | `frontend/src/views/formulas/FormulaDetail.vue` | `<hash>` |
| 前端视图-对比 | `frontend/src/views/formulas/FormulaCompare.vue` | `<hash>` |
| 后端路由 | `backend/src/routes/formulas.ts` | `<hash>` |
| 后端控制器 | `backend/src/controllers/formulaController.ts` | `<hash>` |
| 后端校验服务 | `backend/src/services/ratioFactorValidator.ts` | `<hash>` |
| 后端认证中间件 | `backend/src/middleware/auth.ts` | `<hash>` |
| 后端验证中间件 | `backend/src/middleware/validate.ts` | `<hash>` |
| 后端工具函数 | `backend/src/utils/helpers.ts` | `<hash>` |

---

## 1. 模块接口映射

### 1.1 前端 API → 后端路由对照表

| # | 前端 API 函数 | HTTP 方法 | 前端请求 URL | 后端路由 | 后端控制器 | 认证 | 请求验证 |
|---|-------------|----------|-------------|---------|-----------|------|---------|
| 1 | `getList()` | GET | `/formulas` | `GET /formulas` | `getFormulas` | authMiddleware | — |
| 2 | `getById()` | GET | `/formulas/:id` | `GET /formulas/:id` | `getFormula` | authMiddleware | — |
| 3 | `create()` | POST | `/formulas` | `POST /formulas` | `createFormula` | authMiddleware | validateBody(6字段) |
| 4 | `update()` | PUT | `/formulas/:id` | `PUT /formulas/:id` | `updateFormula` | authMiddleware | validateBody(4字段) |
| 5 | `delete()` | DELETE | `/formulas/:id` | `DELETE /formulas/:id` | `deleteFormula` | authMiddleware | — |
| 6 | `publish()` | PUT | `/formulas/:id/publish` | `PUT /formulas/:id/publish` | `publishFormula` | authMiddleware | — |
| 7 | `getByMaterial()` | GET | `/formulas/by-material/:materialId` | `GET /formulas/by-material/:materialId` | `getFormulasByMaterial` | authMiddleware | — |
| 8 | `getPriceQuote()` | GET | `/formulas/:id/price-quote` | `GET /formulas/:id/price-quote` | `getPriceQuote` | authMiddleware | — |
| 9 | `validateRatio()` | POST | `/formulas/validate-ratio` | `POST /formulas/validate-ratio` | `validateFormulaRatio` | authMiddleware | validateBody(4字段) |

### 1.2 数据流图

```
用户操作 (FormulaList / FormulaForm / FormulaDetail / FormulaCompare)
    │
    ▼
Pinia Store (useFormulaStore)
    │  fetchFormulas / createFormula / updateFormula / deleteFormula / getFormula
    ▼
前端 API 层 (formulaApi)
    │  http.get / http.post / http.put / http.delete
    ▼
Axios 实例 (http.ts)
    │  请求拦截: 注入 Bearer Token
    │  响应拦截: 解包 res.data → res.data.data / 401跳登录 / 错误弹 MessagePlugin
    ▼
Vite 代理 (/api → localhost:3000)
    │
    ▼
Express 路由 (formulas.ts)
    │  authMiddleware → validateBody → Controller
    ▼
控制器 (formulaController.ts)
    │  参数提取 → 业务逻辑 → 事务
    ▼
数据库适配层 (database-better-sqlite3.ts)
    │  query() / transaction()
    ▼
SQLite / MySQL
```

---

## 2. 联调场景用例

> 每个用例包含 7 层验证：①前端操作层 → ②API请求层 → ③DB状态层 → ④Store状态层 → ⑤API响应层 → ⑥前端展示层 → ⑦浏览器存储层

---

### I-CRUD01: 创建配方全链路

| 字段 | 值 |
|------|-----|
| 用例ID | I-CRUD01 |
| 场景 | 用户在 FormulaForm 页面填写完整配方信息并提交创建 |
| 前置条件 | 已登录 admin 账户；至少存在1个业务员和2个原料 |
| 测试数据 | name="测试配方A", salesmanId=已有业务员ID, materials=[{materialId, materialName, quantity:500}], finishedWeight=1000, ratioFactor=0.18, supplementRatioFactor=1.0 |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 点击"创建新配方"按钮 | ①操作层 | 路由跳转至 `/formulas/new`，FormulaForm 组件挂载，isEdit=false |
| 2. 填写配方名称、选择业务员、输入成品重量、设置系数 | ①操作层 | 表单字段双向绑定正确，ratioFactor 输入框 min=0.15 max=0.25 |
| 3. 添加原料行并输入数量 | ①操作层 | MaterialTableCore 组件渲染原料行，数量可编辑 |
| 4. 点击"创建"按钮 | ②请求层 | 浏览器 Network 面板可见 `POST /api/formulas`，请求体包含 name/salesmanId/materials/finishedWeight/ratioFactor/supplementRatioFactor |
| | ②请求层 | 请求头包含 `Authorization: Bearer <token>` |
| | ⑤响应层 | 响应状态码 201，响应体 `{ success: true, data: { id, name, code, ... } }` |
| 5. 后端处理 | ③DB状态层 | `formulas` 表新增1条记录，id 为 generateId() 生成，code 为 generateFormulaCode(name) 生成 |
| | ③DB状态层 | `formula_versions` 表新增1条记录，version_number="v1.0"，is_current=1，status="published"（admin创建） |
| | ③DB状态层 | materials_json 字段为 JSON 字符串，包含 materialId/materialName/quantity/materialType |
| 6. 前端处理 | ④Store状态层 | `createFormula()` 返回 `{ success: true, data }`，随后调用 `fetchFormulas(true)` 强制刷新缓存 |
| | ④Store状态层 | `formulas` 数组包含新创建的配方，`total` 值+1 |
| | ⑥展示层 | FormulaList 表格新增一行，显示配方名称、业务员名称、成品重量 |
| | ⑥展示层 | createdAt 字段经 `formatTimestamp()` 格式化为本地时间（如 `2026-06-10 14:30:00`） |
| 7. Token 存储 | ⑦存储层 | sessionStorage/localStorage 中 `tingstudio_token` 存在且有效 |

**异常分支：**

| 分支 | 预期行为 |
|------|---------|
| ratioFactor 超出 [0.15, 0.25] | 后端 validateBody 返回 400 + VALIDATION_ERROR，前端 MessagePlugin.error 提示 |
| 含量比校验 level=error | 后端返回 400 + 校验失败消息，前端提示"含量比校验失败" |
| 业务员不存在 | 后端返回 400 + "业务员不存在"，前端提示 |
| name 为空 | 后端 validateBody 返回 400 + "请输入配方名称" |

---

### I-CRUD02: 编辑配方全链路

| 字段 | 值 |
|------|-----|
| 用例ID | I-CRUD02 |
| 场景 | 用户在 FormulaForm 页面编辑已有配方，修改原料并保存 |
| 前置条件 | 已登录且存在至少1条配方数据 |
| 测试数据 | 修改配方名称为"测试配方A-修改"，新增1种原料，versionReason="调整配方比例" |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 在列表页点击"编辑"操作 | ①操作层 | 路由跳转至 `/formulas/:id/edit`，FormulaForm 挂载，isEdit=true |
| 2. 表单自动填充已有数据 | ⑥展示层 | name/salesmanId/finishedWeight/ratioFactor/supplementRatioFactor 等字段回显正确 |
| | ⑥展示层 | 原料表回显已有原料行，数量正确 |
| | ⑥展示层 | 显示"升版原因"字段（仅编辑模式可见） |
| 3. 修改名称、新增原料、填写升版原因 | ①操作层 | 表单字段更新，原料行增加 |
| 4. 点击"保存"按钮 | ②请求层 | `PUT /api/formulas/:id`，请求体包含修改字段 + versionReason |
| | ⑤响应层 | 响应 200，`{ success: true, data: { ...更新后配方 } }` |
| 5. 后端处理 | ③DB状态层 | `formulas` 表对应记录已更新（name/materials_json/finished_weight 等） |
| | ③DB状态层 | `formula_versions` 表新增1条记录，version_number 自增（如 v1.0→v1.1），is_current=1 |
| | ③DB状态层 | 旧版本 is_current 被设为 0 |
| | ③DB状态层 | changes_json 记录变更明细（新增原料、名称变更等） |
| 6. 前端处理 | ④Store状态层 | `updateFormula()` 返回 `{ success: true }`，缓存被失效 |
| | ④Store状态层 | `updateFormulaItem()` 被调用，本地数组中对应配方更新 |
| | ⑥展示层 | 列表页该配方行显示更新后的名称和时间 |

**异常分支：**

| 分支 | 预期行为 |
|------|---------|
| 修改原料但未填 versionReason | 后端返回 400 + "请填写升版原因" |
| 配方不存在 | 后端返回 404 + "配方不存在" |
| 含量比校验失败 | 后端返回 400 + 校验消息，前端提示 |

---

### I-CRUD03: 删除配方全链路

| 字段 | 值 |
|------|-----|
| 用例ID | I-CRUD03 |
| 场景 | 用户删除一条自己创建的配方 |
| 前置条件 | 已登录 formulist 账户，存在该用户创建的配方 |
| 测试数据 | 删除目标配方的 id |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 点击操作菜单"删除" | ①操作层 | 弹出 t-popconfirm 二次确认 |
| 2. 确认删除 | ②请求层 | `DELETE /api/formulas/:id`，请求头含 Bearer Token |
| | ⑤响应层 | 响应 200，`{ success: true, message: "配方删除成功", data: null }` |
| 3. 后端处理 | ③DB状态层 | `formulas` 表中该记录被删除 |
| 4. 前端处理 | ④Store状态层 | `deleteFormula()` 从 `formulas` 数组中移除该配方 |
| | ④Store状态层 | `total` 值-1，缓存被失效 |
| | ④Store状态层 | 若当前页数据删空且页码超出范围，自动回退到有效页码 |
| | ⑥展示层 | 列表中该配方行消失，分页器更新 |

**异常分支：**

| 分支 | 预期行为 |
|------|---------|
| 删除他人配方（formulist） | 后端返回 403 + "无权删除他人配方"，前端 MessagePlugin.warning 提示"权限不足" |
| 删除不存在的配方 | 后端返回 404 + "配方不存在" |

---

### I-CRUD04: 查询配方列表全链路

| 字段 | 值 |
|------|-----|
| 用例ID | I-CRUD04 |
| 场景 | 用户进入配方列表页，数据自动加载并展示 |
| 前置条件 | 已登录，数据库中存在多条配方数据 |
| 测试数据 | 默认分页 page=1, pageSize=8 |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 进入配方列表页 | ②请求层 | `GET /api/formulas?page=1&pageSize=8` |
| | ⑤响应层 | 响应 200，`{ success: true, data: { list: [...], pagination: { page, pageSize, total, totalPages } } }` |
| 2. 后端处理 | ③DB状态层 | 查询 `formulas` 表（含 LEFT JOIN users 获取 created_by_name/avatar） |
| | ③DB状态层 | 批量查询 materials 表获取 unit_price，计算 costSubtotal/totalPrice |
| | ③DB状态层 | 批量查询 formula_versions 获取版本信息 |
| | ③DB状态层 | 批量查询 formula_sales 获取当月销量 |
| 3. 前端处理 | ④Store状态层 | `formulas` 数组填充，每项的 materialsJson 被 parseMaterials() 解析 |
| | ④Store状态层 | createdAt/updatedAt 经 `formatTimestamp()` 格式化 |
| | ④Store状态层 | 缓存标记 isCacheValid=true，lastFetchTime 更新 |
| | ⑥展示层 | 表格渲染配方列表，显示名称、业务员、成品重量、报价、版本号、当月销量 |
| | ⑥展示层 | 金额字段 `.toFixed(2)` 格式，空值显示 `'--'` |
| 4. 30分钟内再次进入 | ④Store状态层 | 缓存有效，不发送 API 请求，直接使用本地数据 |
| 5. 超过30分钟或切换筛选条件 | ②请求层 | 重新发送 API 请求 |

---

### I-AUTH01: Token过期自动跳转

| 字段 | 值 |
|------|-----|
| 用例ID | I-AUTH01 |
| 场景 | 用户 Token 过期后操作配方，前端自动跳转登录页 |
| 前置条件 | 已登录但 Token 已过期（超过7天） |
| 测试数据 | 过期的 JWT Token |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 在列表页触发任意 API 请求 | ②请求层 | 请求头含过期 Token |
| | ⑤响应层 | 后端 authMiddleware 返回 401，`{ success: false, error: { message: "Token has expired", code: "TOKEN_EXPIRED" } }` |
| 2. 前端拦截器处理 | ⑥展示层 | MessagePlugin.error 弹出"登录已过期，请重新登录" |
| | ⑦存储层 | sessionStorage/localStorage 中 `tingstudio_token` 和 `tingstudio_user` 被清除 |
| | ①操作层 | 路由跳转至 `/login` 页面 |
| 3. 静默模式 | ②请求层 | 若 API 调用配置 `_silent: true`，不弹消息不跳转 |

---

### I-ISO01: formulist数据隔离联调

| 字段 | 值 |
|------|-----|
| 用例ID | I-ISO01 |
| 场景 | formulist 角色用户只能看到自己创建的配方 |
| 前置条件 | 数据库中存在 admin 和 formulistA 各创建的配方 |
| 测试数据 | formulistA 登录，其 userId 对应的 created_by |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. formulistA 登录并进入列表 | ②请求层 | `GET /api/formulas`，Token 中 role="formulist" |
| | ③DB状态层 | ⚠️ 注意：当前 `getFormulas` 控制器**未实现**数据隔离过滤（无 WHERE created_by = userId 条件） |
| | ⑤响应层 | 当前行为：返回所有配方（含他人创建的） |
| | ⑥展示层 | formulistA 可见全部配方列表 |
| 2. 预期行为（如已修复） | ③DB状态层 | 查询应添加 `WHERE f.created_by = ?`（formulist）或不添加（admin） |
| | ⑥展示层 | formulistA 仅可见自己创建的配方 |

> ⚠️ **发现**：当前 `getFormulas` 控制器代码中未根据 `req.user.role` 添加数据隔离条件，formulist 可见全部数据。这是一个数据隔离缺陷。

---

### I-ERR01: 后端错误传播到前端提示

| 字段 | 值 |
|------|-----|
| 用例ID | I-ERR01 |
| 场景 | 后端返回错误时，前端正确展示错误信息 |
| 前置条件 | 已登录 |
| 测试数据 | 触发各种后端错误场景 |

**操作步骤与7层验证：**

| 错误场景 | 后端响应 | 前端行为 |
|---------|---------|---------|
| 400 VALIDATION_ERROR | `{ success: false, error: { message: "参数验证失败", code: "VALIDATION_ERROR", details: [...] } }` | http.ts 拦截器检测 `success: false`，MessagePlugin.error("参数验证失败") |
| 400 业务错误 | `{ success: false, message: "业务员不存在" }` | MessagePlugin.error("业务员不存在") |
| 401 TOKEN_EXPIRED | `{ success: false, error: { message: "Token has expired", code: "TOKEN_EXPIRED" } }` | 清除 Token，跳转 /login，提示"登录已过期" |
| 403 FORBIDDEN | `{ success: false, message: "无权删除他人配方" }` | MessagePlugin.warning("权限不足，无法访问该资源") |
| 404 NOT_FOUND | `{ success: false, message: "配方不存在" }` | MessagePlugin.error("配方不存在") |
| 500 INTERNAL_ERROR | `{ success: false, message: "获取配方列表失败" }` | MessagePlugin.error("获取配方列表失败") |
| 网络错误 | 无响应 | 跳转 /server-error，提示"后端服务未启动或网络连接失败" |

---

### I-NUTR01: 营养计算全链路（ratio=0.18药材）

| 字段 | 值 |
|------|-----|
| 用例ID | I-NUTR01 |
| 场景 | 创建含药材原料的配方，验证含量比计算使用 ratioFactor=0.18 |
| 前置条件 | 已登录，存在 herb 类型原料 |
| 测试数据 | 药材A: quantity=500g, materialType="herb"; 成品重量=1000g; ratioFactor=0.18; supplementRatioFactor=1.0 |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 在 FormulaForm 填写原料并触发校验 | ②请求层 | `POST /api/formulas/validate-ratio`，body 含 materials/finishedWeight/ratioFactor/supplementRatioFactor |
| | ⑤响应层 | 响应 `{ success: true, data: { level, totalRatio, breakdown, thresholds, message, description, allowed, requiresManualReview } }` |
| 2. 后端计算 | ③DB状态层 | 查询 materials 表获取 materialType |
| | ⑤响应层 | 药材 ratio = (500/1000) × 0.18 = 0.09，totalRatio = 0.09 |
| | ⑤响应层 | level="error"（0.09 < 0.92），allowed=false |
| 3. 前端展示 | ⑥展示层 | FormulaForm 含量比校验区域显示"异常"状态，提交按钮禁用 |
| | ⑥展示层 | 总和显示 `0.09000`，偏差显示百分比 |
| 4. 调整原料使总比在正常范围 | ①操作层 | 增加原料数量使 totalRatio ∈ [0.98, 1.02] |
| | ⑥展示层 | 状态变为"通过"，提交按钮可用 |

---

### I-NUTR02: 零界限归零+能量重算

| 字段 | 值 |
|------|-----|
| 用例ID | I-NUTR02 |
| 场景 | 营养成分计算中，低于零界限的营养素归零后能量重新计算 |
| 前置条件 | 已登录，存在配方和营养数据 |
| 测试数据 | 配方中某原料蛋白质贡献 ≤0.5g，脂肪 ≤0.5g |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 进入 FormulaDetail 页面 | ②请求层 | `GET /api/formulas/:id` 获取配方详情 |
| | ⑥展示层 | 右侧栏显示营养计算表 |
| 2. 营养计算逻辑 | ⑥展示层 | 蛋白质 ≤0.5g → 归零显示 0.0g |
| | ⑥展示层 | 脂肪 ≤0.5g → 归零显示 0.0g |
| | ⑥展示层 | 碳水 ≤0.5g → 归零显示 0.0g |
| | ⑥展示层 | 钠 ≤5mg → 归零显示 0mg |
| | ⑥展示层 | 能量 ≤17kJ → 归零显示 0kJ |
| 3. 能量重算 | ⑥展示层 | 归零后能量 = 蛋白质×17 + 脂肪×37 + 碳水×17（使用归零后数值） |
| | ⑥展示层 | NRV% = (营养素 / NRV参考值) × 100，使用归零后数值 |

---

### I-PERM01: 权限联动联调（admin vs formulist）

| 字段 | 值 |
|------|-----|
| 用例ID | I-PERM01 |
| 场景 | 不同角色用户操作配方的权限差异 |
| 前置条件 | admin 和 formulist 账户各1个 |
| 测试数据 | 同一配方ID |

**操作步骤与7层验证：**

| 操作 | admin | formulist |
|------|-------|-----------|
| 创建配方 | ✅ 成功，初始版本 status="published" | ✅ 成功，初始版本 status="draft" |
| 查看全部配方 | ✅ 可见全部 | ⚠️ 当前可见全部（隔离缺陷） |
| 删除他人配方 | ✅ 可删除 | ❌ 403 "无权删除他人配方" |
| 发布配方 | ✅ 可发布 | ✅ 可发布自己的 |
| 编辑他人配方 | ✅ 可编辑 | ⚠️ 当前可编辑（隔离缺陷） |

**验证步骤：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. admin 创建配方 | ③DB状态层 | formula_versions.status = "published" |
| 2. formulist 创建配方 | ③DB状态层 | formula_versions.status = "draft" |
| 3. formulist 删除 admin 的配方 | ②请求层 | `DELETE /api/formulas/:id`，Token role="formulist" |
| | ⑤响应层 | 403 `{ success: false, message: "无权删除他人配方" }` |
| | ⑥展示层 | MessagePlugin.warning("权限不足，无法访问该资源") |

---

### I-SRCH01: 搜索筛选联调

| 字段 | 值 |
|------|-----|
| 用例ID | I-SRCH01 |
| 场景 | 用户在列表页通过关键词和业务员筛选配方 |
| 前置条件 | 已登录，存在多条不同名称/业务员的配方 |
| 测试数据 | keyword="佛手", salesmanId=特定业务员ID |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 输入搜索关键词 | ①操作层 | 搜索框输入"佛手"，触发 setKeyword() |
| | ④Store状态层 | keyword="佛手"，currentPage 重置为 1 |
| | ②请求层 | `GET /api/formulas?keyword=%25佛手%25&page=1&pageSize=8` |
| 2. 后端处理 | ③DB状态层 | SQL: `WHERE (f.name LIKE '%佛手%' OR f.salesman_name LIKE '%佛手%')` |
| | ⑤响应层 | 返回匹配的配方列表 |
| 3. 选择业务员筛选 | ①操作层 | 下拉选择业务员，触发 setSalesmanId() |
| | ②请求层 | `GET /api/formulas?salesmanId=xxx&page=1&pageSize=8` |
| 4. 组合筛选 | ②请求层 | `GET /api/formulas?keyword=佛手&salesmanId=xxx&page=1&pageSize=8` |
| | ③DB状态层 | SQL: `WHERE (f.name LIKE '%佛手%' OR f.salesman_name LIKE '%佛手%') AND f.salesman_id = 'xxx'` |
| 5. 清空搜索 | ①操作层 | 点击搜索框清除按钮 |
| | ④Store状态层 | keyword=""，currentPage=1，缓存失效 |
| | ②请求层 | 重新请求无 keyword 参数 |

---

### I-OWNS01: 越权操作联调

| 字段 | 值 |
|------|-----|
| 用例ID | I-OWNS01 |
| 场景 | formulist 用户尝试操作他人创建的配方 |
| 前置条件 | formulistA 登录，存在 formulistB 创建的配方 |
| 测试数据 | formulistB 创建的配方 ID |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. formulistA 删除 formulistB 的配方 | ②请求层 | `DELETE /api/formulas/:id` |
| | ⑤响应层 | 403 `{ success: false, message: "无权删除他人配方" }` |
| | ⑥展示层 | MessagePlugin.warning("权限不足") |
| 2. formulistA 编辑 formulistB 的配方 | ②请求层 | `PUT /api/formulas/:id` |
| | ⑤响应层 | ⚠️ 当前后端 updateFormula **未检查** created_by，编辑成功 |
| | ③DB状态层 | 配方被修改（越权漏洞） |

> ⚠️ **发现**：`updateFormula` 控制器未检查 `created_by` 是否为当前用户，formulist 可编辑他人配方。

---

### I-CMP01: 配方对比链路

| 字段 | 值 |
|------|-----|
| 用例ID | I-CMP01 |
| 场景 | 用户选择2-3个配方进行对比 |
| 前置条件 | 已登录，存在至少3条配方 |
| 测试数据 | 选择3个配方进行对比 |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 在列表页勾选2-3个配方 | ①操作层 | 批量操作栏出现，显示"配方对比(N)"按钮 |
| 2. 点击"配方对比" | ①操作层 | 选中的配方数据写入 localStorage key `compare_formulas` |
| | ⑦存储层 | localStorage.getItem('compare_formulas') 包含选中配方的 JSON 数组 |
| 3. 跳转对比页面 | ①操作层 | 路由跳转至 `/formulas/compare` |
| 4. 对比页面加载 | ⑦存储层 | 从 localStorage 读取 compare_formulas 数据 |
| | ⑥展示层 | 渲染2-3个对比卡片，第一个为基准 |
| 5. content 模式 | ⑥展示层 | 显示各原料含量百分比，差异项高亮 |
| 6. price 模式 | ①操作层 | 点击切换按钮 |
| | ⑥展示层 | 显示各原料报价，差异项高亮 |
| 7. 超过3个选择 | ①操作层 | "配方对比"按钮 disabled，title 提示"最多选择3个" |
| 8. 重置对比 | ①操作层 | 点击"重置对比"，确认后清空 |
| | ⑦存储层 | localStorage 中 compare_formulas 被清除 |

---

### I-REF01: 关联完整性（删除被引用原料/修改原料价格→配方成本联动）

| 字段 | 值 |
|------|-----|
| 用例ID | I-REF01 |
| 场景 | 原料价格变更后，配方报价是否联动更新 |
| 前置条件 | 存在配方引用了某原料，该原料有 unit_price |
| 测试数据 | 原料A unit_price=100，配方引用原料A quantity=500g |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 查看配方报价 | ②请求层 | `GET /api/formulas/:id/price-quote` |
| | ⑤响应层 | 原料A: unitPrice=100, subtotal=(500/1000)*100=50.00 |
| 2. 修改原料A单价为120 | ③DB状态层 | materials 表 unit_price 更新为 120 |
| 3. 再次查看配方报价 | ②请求层 | `GET /api/formulas/:id/price-quote` |
| | ⑤响应层 | 原料A: unitPrice=120, subtotal=(500/1000)*120=60.00 |
| | ⑥展示层 | FormulaDetail 报价区域显示更新后的价格 |
| 4. 删除原料A | ③DB状态层 | materials 表中原料A被删除 |
| 5. 查看配方报价 | ⑤响应层 | 原料A: unitPrice=null, missingPrices 包含原料A名称 |
| | ⑥展示层 | 报价区域显示"未录入单价"警告 |

> **说明**：配方通过 materials_json 存储原料快照（含 materialId/materialName/quantity），不存储价格。价格每次从 materials 表实时查询，因此价格变更自动联动。但原料删除后配方仍引用其 materialId，只是查不到价格。

---

### I-EXP01: 导出内容一致性

| 字段 | 值 |
|------|-----|
| 用例ID | I-EXP01 |
| 场景 | 用户导出配方数据，验证导出内容与页面展示一致 |
| 前置条件 | 已登录，存在配方数据 |
| 测试数据 | 选择配方进行导出 |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 在详情页点击"导出配方" | ①操作层 | 触发导出操作 |
| 2. 导出文件生成 | ②请求层 | 发送导出 API 请求（如有）或前端本地生成 |
| | ⑥展示层 | 导出文件包含配方名称、原料列表、报价明细、营养成分表 |
| 3. 内容一致性 | ⑥展示层 | 导出中的金额精度与页面一致（.toFixed(2)） |
| | ⑥展示层 | 导出中的时间格式与页面一致（formatTimestamp 本地时间） |
| | ⑥展示层 | 导出中的空值显示为 `'--'` 或 `'暂未录入'` |

---

### I-TXN01: 事务完整性（创建配方+关联原料中途失败）

| 字段 | 值 |
|------|-----|
| 用例ID | I-TXN01 |
| 场景 | 创建配方过程中，版本插入失败时配方记录是否回滚 |
| 前置条件 | 已登录 |
| 测试数据 | 构造使版本插入失败的场景（如超长 version_name） |

**操作步骤与7层验证：**

| 步骤 | 层级 | 验证内容 |
|------|------|---------|
| 1. 提交创建配方 | ②请求层 | `POST /api/formulas` |
| 2. 后端事务处理 | ③DB状态层 | `createFormula` 使用 `transaction()` 包裹 INSERT formulas + INSERT formula_versions |
| 3. 版本插入失败 | ③DB状态层 | 事务回滚，formulas 表中无新增记录 |
| | ⑤响应层 | 返回 500 错误 |
| | ④Store状态层 | `createFormula()` 返回 `{ success: false, message: "创建失败" }` |
| | ⑥展示层 | MessagePlugin.error 提示错误信息 |
| 4. 验证数据一致性 | ③DB状态层 | 查询 formulas 表确认无孤立记录（无配方但无版本的情况） |

> **说明**：当前 `createFormula` 使用 `transaction()` 同步事务，若版本插入失败，整个事务回滚，不会产生孤立配方记录。

---

## 3. 契约验证用例

### 3.1 端点匹配（C-EP）

| ID | 前端定义 | 后端定义 | 一致性 | 说明 |
|----|---------|---------|--------|------|
| C-EP01 | `GET /formulas` | `GET /formulas` | ✅ | 一致 |
| C-EP02 | `GET /formulas/:id` | `GET /formulas/:id` | ✅ | 一致 |
| C-EP03 | `POST /formulas` | `POST /formulas` | ✅ | 一致 |
| C-EP04 | `PUT /formulas/:id` | `PUT /formulas/:id` | ✅ | 一致 |
| C-EP05 | `DELETE /formulas/:id` | `DELETE /formulas/:id` | ✅ | 一致 |
| C-EP06 | `PUT /formulas/:id/publish` | `PUT /formulas/:id/publish` | ✅ | 一致 |
| C-EP07 | `GET /formulas/by-material/:materialId` | `GET /formulas/by-material/:materialId` | ❌ | **路由冲突**：后端路由定义中 `GET /formulas/:id`（第22行）在 `GET /formulas/by-material/:materialId`（第60行）之前，"by-material" 会被 `/:id` 参数匹配，导致 `getFormula` 而非 `getFormulasByMaterial` 被调用 |
| C-EP08 | `GET /formulas/:id/price-quote` | `GET /formulas/:id/price-quote` | ✅ | 一致 |
| C-EP09 | `POST /formulas/validate-ratio` | `POST /formulas/validate-ratio` | ❌ | **路由冲突**：后端路由定义中 `POST /formulas`（第23行）在 `POST /formulas/validate-ratio`（第63行）之前，但 Express 路由匹配是精确路径优先，`/formulas/validate-ratio` 不会匹配 `/formulas`，此条实际**无冲突**。但需注意 `POST /formulas` 的 validateBody 会校验 name 必填，如果先匹配到 `/formulas` 则 validate-ratio 请求会因缺少 name 字段而 400 |

> **C-EP07 路由冲突详情**：Express 按注册顺序匹配，`/:id` 是动态参数，会匹配任意字符串包括 "by-material"。当请求 `GET /formulas/by-material/xxx` 时，先匹配到 `GET /formulas/:id`，id="by-material"，后续的 `/xxx` 无法匹配，导致 404 或错误响应。

> **C-EP07 修复建议**：将 `GET /formulas/by-material/:materialId` 移到 `GET /formulas/:id` 之前注册。

### 3.2 HTTP方法匹配（C-METHOD）

| ID | 端点 | 前端方法 | 后端方法 | 一致性 |
|----|------|---------|---------|--------|
| C-METHOD01 | `/formulas` (列表) | GET | GET | ✅ |
| C-METHOD02 | `/formulas/:id` (详情) | GET | GET | ✅ |
| C-METHOD03 | `/formulas` (创建) | POST | POST | ✅ |
| C-METHOD04 | `/formulas/:id` (更新) | PUT | PUT | ✅ |
| C-METHOD05 | `/formulas/:id` (删除) | DELETE | DELETE | ✅ |
| C-METHOD06 | `/formulas/:id/publish` | PUT | PUT | ✅ |
| C-METHOD07 | `/formulas/by-material/:materialId` | GET | GET | ✅ |
| C-METHOD08 | `/formulas/:id/price-quote` | GET | GET | ✅ |
| C-METHOD09 | `/formulas/validate-ratio` | POST | POST | ✅ |

### 3.3 请求体格式（C-REQ）

| ID | 端点 | 前端发送字段 | 后端 validateBody 校验字段 | 后端控制器实际读取字段 | 一致性 |
|----|------|------------|--------------------------|---------------------|--------|
| C-REQ01 | POST /formulas (创建) | name, salesmanId, materials, finishedWeight, ratioFactor, supplementRatioFactor, packagingPrice?, otherPrice?, profitMargin?, description?, versionReason?, originalName?, originalWeight?, parseResultId? | name✅, salesmanId✅, materials✅, finishedWeight✅, ratioFactor✅, supplementRatioFactor✅ | name, salesmanId, materials, description, preparationMethod, finishedWeight, ratioFactor, supplementRatioFactor, packagingPrice, otherPrice, profitMargin, originalName, originalWeight, parseResultId | ❌ |
| C-REQ02 | PUT /formulas/:id (更新) | name?, finishedWeight?, ratioFactor?, supplementRatioFactor?, salesmanId?, materials?, description?, preparationMethod?, versionReason?, packagingPrice?, otherPrice?, profitMargin? | name✅, finishedWeight✅, ratioFactor✅, supplementRatioFactor✅ | name, salesmanId, materials, description, preparationMethod, finishedWeight, ratioFactor, supplementRatioFactor, versionReason, packagingPrice, otherPrice, profitMargin | ❌ |
| C-REQ03 | POST /formulas/validate-ratio | materials, finishedWeight, ratioFactor, supplementRatioFactor | materials✅, finishedWeight✅, ratioFactor✅, supplementRatioFactor✅ | materials, finishedWeight, ratioFactor, supplementRatioFactor | ✅ |
| C-REQ04 | POST /formulas (创建) - materials 子项 | materialId, materialName?, quantity | — (无子项校验) | materialId, materialName, quantity, materialType, adjustedPrice | ❌ |
| C-REQ05 | PUT /formulas/:id (更新) - materials 子项 | materialId, materialName?, quantity | — (无子项校验) | materialId, materialName, quantity, materialType, adjustedPrice | ❌ |

> **C-REQ01 详情**：后端 validateBody 仅校验6个字段，但控制器 `createFormula` 从 req.body 读取了14个字段（含 description, preparationMethod, packagingPrice, otherPrice, profitMargin, originalName, originalWeight, parseResultId）。未校验的字段可被注入任意值。

> **C-REQ02 详情**：后端 validateBody 仅校验4个字段（name, finishedWeight, ratioFactor, supplementRatioFactor），但控制器 `updateFormula` 从 req.body 读取了12个字段。特别是 `salesmanId`、`materials`、`versionReason` 等关键字段未被校验。

> **C-REQ04/C-REQ05 详情**：materials 数组内的子项无校验规则，materialId 可为空字符串，quantity 可为负数。

### 3.4 响应体格式（C-RES）

| ID | 端点 | 前端期望响应类型 | 后端实际响应 | 一致性 |
|----|------|----------------|------------|--------|
| C-RES01 | GET /formulas | `{ list: Formula[], pagination: Pagination }` | `successWithPagination(list, total, page, size)` → `{ success, data: { list, pagination } }` | ✅ |
| C-RES02 | GET /formulas/:id | `Formula` | `success(rowToCamelCase(formula))` → `{ success, data: Formula }` | ✅ |
| C-RES03 | POST /formulas | `Formula` | `success(rowToCamelCase(formula), "配方创建成功")` → `{ success, message, data: Formula }` | ✅ |
| C-RES04 | PUT /formulas/:id | `Formula` | `success(rowToCamelCase(formula), "配方更新成功")` → `{ success, message, data: Formula }` | ✅ |
| C-RES05 | DELETE /formulas/:id | `{ message: string }` | `success(null, "配方删除成功")` → `{ success: true, message: "配方删除成功", data: null }` | ❌ |
| C-RES06 | PUT /formulas/:id/publish | `FormulaVersion` | `success(rowToCamelCase(version))` → `{ success, data: FormulaVersion }` | ✅ |
| C-RES07 | GET /formulas/by-material/:materialId | `Formula[]` | `success(rowsToCamelCase(formulas))` → `{ success, data: Formula[] }` | ✅ |
| C-RES08 | GET /formulas/:id/price-quote | `PriceQuote` | `success(priceQuoteData)` → `{ success, data: PriceQuote }` | ✅ |
| C-RES09 | POST /formulas/validate-ratio | `RatioFactorValidationResult` | `success(result)` → `{ success, data: RatioFactorValidationResult }` | ✅ |

> **C-RES05 详情**：前端 `formulaApi.delete()` 期望响应类型为 `{ message: string }`，但后端返回 `success(null, "配方删除成功")` 即 `{ success: true, message: "配方删除成功", data: null }`。经 http.ts 拦截器解包后返回 `data`（即 `null`），前端实际得到 `null` 而非 `{ message: string }`。虽然 Store 中 `deleteFormula()` 未使用返回值，但类型定义不一致。

### 3.5 字段命名契约（C-NAME）

| ID | 字段 | 前端定义 | 后端返回（rowToCamelCase后） | 一致性 |
|----|------|---------|---------------------------|--------|
| C-NAME01 | 配方ID | `id: string` | `id: string` | ✅ |
| C-NAME02 | 原料JSON | `materialsJson: string` | `materialsJson: string` | ✅ |
| C-NAME03 | 业务员名称 | `salesmanName: string` | `salesmanName: string` | ✅ |

### 3.6 日期格式契约（C-DATE）

| ID | 场景 | 前端处理 | 后端返回 | 一致性 |
|----|------|---------|---------|--------|
| C-DATE01 | createdAt / updatedAt | Store 中 `formatTimestamp()` 转为本地时间字符串 | ISO 8601 UTC 字符串（`now()` 返回 `new Date().toISOString()`） | ✅ |
| C-DATE02 | 列表展示 | `formatTimestamp('2026-06-10T06:30:00.000Z')` → `'2026-06-10 14:30:00'` | ISO UTC | ✅ |

> 前端 Store 的 `fetchFormulas` 和 `getFormula` 均对 createdAt/updatedAt 调用 `formatTimestamp()`，符合项目规范。

### 3.7 数值精度契约（C-PREC）

| ID | 场景 | 前端精度 | 后端精度 | 一致性 |
|----|------|---------|---------|--------|
| C-PREC01 | 金额（costSubtotal/totalPrice） | `.toFixed(2)` 展示 | `.toFixed(4)` 计算 | ⚠️ |
| C-PREC02 | 含量比（totalRatio） | `.toFixed(5)` 展示 | `.toFixed(5)` 计算 | ✅ |
| C-PREC03 | 偏差百分比 | `.toFixed(2)%` 展示 | `.toFixed(2)%` 计算 | ✅ |

> **C-PREC01 详情**：后端计算 costSubtotal/totalPrice 时使用 `.toFixed(4)` 保留4位小数，前端展示时使用 `.toFixed(2)` 保留2位小数。这不属于不一致——后端存储高精度，前端展示低精度，符合业务惯例。

### 3.8 分页结构契约（C-PSTR）

| ID | 前端定义 | 后端返回 | 一致性 |
|----|---------|---------|--------|
| C-PSTR01 | `Pagination { page: number, pageSize: number, total: number, totalPages: number }` | `successWithPagination()` 返回 `{ page, pageSize, total, totalPages: Math.ceil(total/pageSize) }` | ✅ |

### 3.9 事务原子性（C-ATOMIC）

| ID | 操作 | 事务保证 | 一致性 |
|----|------|---------|--------|
| C-ATOMIC01 | 创建配方（INSERT formulas + INSERT formula_versions + UPDATE parse_results） | `transaction()` 同步事务包裹 | ✅ |

> 当前 `createFormula` 和 `updateFormula` 均使用 `transaction()` 包裹，确保原子性。但 `deleteFormula` 仅执行 `DELETE FROM formulas`，未删除关联的 `formula_versions` 记录，可能产生孤立版本数据。

---

## 4. 测试覆盖率统计

### 4.1 联调场景覆盖

| 场景类别 | 用例ID | 覆盖数 |
|---------|--------|--------|
| CRUD 全链路 | I-CRUD01~04 | 4 |
| 认证与授权 | I-AUTH01, I-PERM01, I-OWNS01 | 3 |
| 数据隔离 | I-ISO01 | 1 |
| 错误传播 | I-ERR01 | 1 |
| 营养计算 | I-NUTR01, I-NUTR02 | 2 |
| 搜索筛选 | I-SRCH01 | 1 |
| 配方对比 | I-CMP01 | 1 |
| 关联完整性 | I-REF01 | 1 |
| 导出一致性 | I-EXP01 | 1 |
| 事务完整性 | I-TXN01 | 1 |
| **合计** | | **16** |

### 4.2 契约维度覆盖

| 契约维度 | 用例ID | 覆盖数 | 不一致数 |
|---------|--------|--------|---------|
| 端点匹配 | C-EP01~09 | 9 | 1 (C-EP07) |
| HTTP方法 | C-METHOD01~09 | 9 | 0 |
| 请求体格式 | C-REQ01~05 | 5 | 4 (C-REQ01/02/04/05) |
| 响应体格式 | C-RES01~09 | 9 | 1 (C-RES05) |
| 字段命名 | C-NAME01~03 | 3 | 0 |
| 日期格式 | C-DATE01~02 | 2 | 0 |
| 数值精度 | C-PREC01~03 | 3 | 0 |
| 分页结构 | C-PSTR01 | 1 | 0 |
| 事务原子性 | C-ATOMIC01 | 1 | 0 |
| **合计** | | **42** | **6** |

### 4.3 发现的契约不一致汇总

| # | 严重程度 | 契约ID | 问题描述 | 影响范围 |
|---|---------|--------|---------|---------|
| 1 | 🔴 严重 | C-EP07 | `GET /formulas/by-material/:materialId` 路由被 `GET /formulas/:id` 先匹配，"by-material" 被当作 id 参数 | `getByMaterial()` 完全不可用 |
| 2 | 🟠 高 | C-REQ01 | POST /formulas validateBody 仅校验6字段，控制器读取14字段，8个字段无校验 | 可注入未校验字段 |
| 3 | 🟠 高 | C-REQ02 | PUT /formulas/:id validateBody 仅校验4字段，控制器读取12字段，8个字段无校验含 salesmanId/materials | 可越权修改业务员/原料 |
| 4 | 🟡 中 | C-REQ04 | POST /formulas materials 子项无校验，materialId 可为空、quantity 可为负 | 可创建无效原料行 |
| 5 | 🟡 中 | C-REQ05 | PUT /formulas/:id materials 子项无校验 | 可更新无效原料行 |
| 6 | 🟢 低 | C-RES05 | DELETE 响应 data=null，前端类型定义期望 `{ message: string }` | 类型不匹配但运行时无影响 |

### 4.4 发现的功能缺陷汇总

| # | 严重程度 | 用例ID | 问题描述 |
|---|---------|--------|---------|
| 1 | 🔴 严重 | I-ISO01 | `getFormulas` 控制器未实现数据隔离，formulist 可见全部配方 |
| 2 | 🟠 高 | I-OWNS01 | `updateFormula` 控制器未检查 created_by，formulist 可编辑他人配方 |
| 3 | 🟡 中 | I-TXN01 | `deleteFormula` 未删除关联的 formula_versions 记录，产生孤立版本数据 |
