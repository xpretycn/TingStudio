# TingStudio v2.0 实施计划

> 基于 `PRD-TingStudio-v2.0.md` 与现有代码的差异分析，制定以下分阶段实施计划。

---

## 差异总览

| 维度 | PRD 要求 | 现有代码状态 | 工作量 |
|------|---------|------------|--------|
| 用户角色 | `admin` / `formulist` | `admin` / `formulist` / `salesman` / `production` | 小 |
| 客户模块 | **删除** | 完整实现（controller/route/store/api/views） | 中 |
| 配方-客户关联 | 改为配方-业务员关联 | `customer_id` / `customer_name` | 大 |
| 业务员详情 | 去掉客户关联、配方师对接、沟通记录 | 有完整实现 | 中 |
| init.sql | 删除 customers 等 4 张表，修改 formulas 表 | 旧表结构 | 中 |
| seedData | 删除客户种子，配方关联业务员 | 含 30 条客户、关联等数据 | 中 |
| 前端客户页面 | 删除 | CustomerList / CustomerForm | 小 |
| 业务员管理-原料 | `getMaterials` 无 admin 全量查看 | 仅 `created_by` 过滤 | 小 |
| 导出中心 | 仅基础框架 | ExportCenter.vue 存在但功能不完整 | 大 |
| 营养分析 | 基础实现 | 后端完整，前端页面需完善 | 中 |
| 版本控制 | 后端完整 | VersionList / VersionCompare 页面存在 | 小 |

---

## 阶段一：数据库与后端重构（去掉客户，配方改关联业务员）

> 优先级：P0 | 预估：1-2 天

### 1.1 修改 `init.sql`

- [ ] **删除** `customers` 表及相关索引
- [ ] **删除** `salesman_customer_relations` 表及索引
- [ ] **删除** `salesman_formulist_relations` 表及索引
- [ ] **删除** `communication_logs` 表及索引
- [ ] **修改** `users.role` CHECK 约束：`CHECK(role IN ('admin', 'formulist'))`
- [ ] **修改** `formulas` 表：
  - `customer_id` → `salesman_id`，外键指向 `salesmen(id)`
  - `customer_name` → `salesman_name`
  - 索引 `idx_formula_customer_id` → `idx_formula_salesman_id`

### 1.2 修改 `seedData.ts`

- [ ] **删除** 第 3 节「客户表 customers（30条）」全部代码及 `customerIds` 变量
- [ ] **修改** 用户角色分配：`roles` 改为 `['admin', 'formulist']`，去掉 `salesman` / `production`
- [ ] **修改** 配方创建（第 5 节）：
  - `customer_id` → `salesman_id`，`customer_name` → `salesman_name`
  - INSERT 语句字段列表同步修改
  - 版本快照中 `customerId` → `salesmanId`，`customerName` → `salesmanName`
- [ ] **删除** 第 11 节「业务员-客户关联表」
- [ ] **删除** 第 12 节「业务员-配方师对接表」
- [ ] **修改** 导出模板 `format_config_json` 中 `客户名称` → `业务员名称`
- [ ] **更新** 末尾统计输出，去掉客户、关联相关行

### 1.3 修改 `formulaController.ts`

- [ ] **修改** `getFormulas`：查询参数 `customerId` → `salesmanId`，搜索条件 `customer_name LIKE` → `salesman_name LIKE`
- [ ] **修改** `createFormula`：
  - `customerId` → `salesmanId`
  - 从 `salesmen` 表查询业务员名称（替代 customers）
  - INSERT 字段 `customer_id` → `salesman_id`，`customer_name` → `salesman_name`
  - 版本快照中同步修改
- [ ] **修改** `updateFormula`：
  - `customerId` → `salesmanId`
  - 从 `salesmen` 表查询（替代 customers）
  - UPDATE / 版本快照中同步修改

### 1.4 修改 `versionController.ts`

- [ ] **修改** `createVersion`：快照中 `customerId` → `salesmanId`，`customerName` → `salesmanName`
- [ ] **修改** `compareVersions`：客户变更对比 → 业务员变更对比，`customerId` → `salesmanId`，`fieldLabel` 改为「业务员」

### 1.5 修改 `salesmanController.ts`

- [ ] **删除** `getSalesman` 中的「关联客户」查询（`salesman_customer_relations`）
- [ ] **删除** `getSalesman` 中的「对接配方师」查询（`salesman_formulist_relations`）
- [ ] **删除** 返回值中的 `linkedCustomers` / `linkedFormulists`
- [ ] **删除** `linkCustomer` 函数
- [ ] **删除** `unlinkCustomer` 函数
- [ ] **删除** `linkFormulist` 函数
- [ ] **删除** `addCommunicationLog` 函数
- [ ] **删除** `getCommunicationLogs` 函数

### 1.6 修改 `salesmen.ts` 路由

- [ ] **删除** `POST /salesmen/:salesmanId/customers`（linkCustomer）
- [ ] **删除** `PUT /salesmen/relations/:relationId`（unlinkCustomer）
- [ ] **删除** `POST /salesmen/:salesmanId/formulists`（linkFormulist）
- [ ] **删除** `POST /salesmen/relations/:relationId/communications`（addCommunicationLog）
- [ ] **删除** `GET /salesmen/relations/:relationId/communications`（getCommunicationLogs）

### 1.7 删除 `customerController.ts`

- [ ] **删除** 整个文件

### 1.8 修改 `routes/index.ts`

- [ ] **删除** `import { customerRoutes }` 和 `router.use('/customers', customerRoutes)`

### 1.9 修改 `materialController.ts`（可选优化）

- [ ] `getMaterials` 增加 admin 角色判断，admin 可查看全部原料（与配方列表一致）

---

## 阶段二：前端重构（去掉客户，配方改关联业务员）

> 优先级：P0 | 预估：1-2 天

### 2.1 删除客户相关前端文件

- [ ] **删除** `frontend/src/api/customer.ts`
- [ ] **删除** `frontend/src/stores/customer.ts`
- [ ] **删除** `frontend/src/views/customers/CustomerList.vue`
- [ ] **删除** `frontend/src/views/customers/CustomerForm.vue`
- [ ] **删除** `frontend/src/views/customers/` 目录

### 2.2 修改前端路由

- [ ] **删除** `customers`、`customers/new`、`customers/:id/edit` 路由定义

### 2.3 修改侧边栏导航（`Home.vue`）

- [ ] **删除** 「客户管理」菜单项

### 2.4 修改 `api/formula.ts`

- [ ] 接口参数 `customerId` → `salesmanId`

### 2.5 修改 `stores/formula.ts`

- [ ] `createFormula` / `updateFormula` 中 `customerId` → `salesmanId`

### 2.6 修改 `FormulaList.vue`

- [ ] 搜索/筛选中「客户」→「业务员」
- [ ] 列表中显示 `salesmanName` 替代 `customerName`

### 2.7 修改 `FormulaForm.vue`

- [ ] 创建/编辑表单中「选择客户」→「选择业务员」
- [ ] 提交参数 `customerId` → `salesmanId`
- [ ] 调用业务员 API 获取业务员列表作为下拉选项

### 2.8 修改 `RecentFormulas.vue`

- [ ] 显示 `salesmanName` 替代 `customerName`

### 2.9 修改 `SalesmanDetail.vue`

- [ ] **删除** 关联客户展示区域
- [ ] **删除** 对接配方师展示区域
- [ ] **删除** 沟通记录区域

### 2.10 修改 `api/salesman.ts`

- [ ] **删除** `linkCustomer` / `unlinkCustomer` / `linkFormulist` / `addCommunicationLog` / `getCommunicationLogs` 接口定义

### 2.11 修改 `stores/salesman.ts`

- [ ] **删除** 对应的 store 方法

---

## 阶段三：前端功能完善

> 优先级：P1 | 预估：2-3 天

### 3.1 导出中心 `ExportCenter.vue`

- [ ] 导出模板管理（列表展示 + 创建模板表单）
- [ ] 导出任务管理（创建任务 + 任务列表 + 进度展示）
- [ ] 分享功能（创建分享链接 + 配置密码/过期/下载限制）
- [ ] API 数据接口管理（创建/列表展示）

### 3.2 营养分析 `NutritionAnalysis.vue`

- [ ] 原料营养成分编辑表单（per 100g 各字段输入）
- [ ] 配方营养计算触发 + 结果展示（总重量、per 100g、原料贡献占比表格/图表）
- [ ] 合规性检查结果展示（pass/warning/fail 标签 + 优化建议）

### 3.3 营养标准 `NutritionProfiles.vue`

- [ ] 营养标准列表（分类筛选：infant/child/adult/elderly/pregnant/special）
- [ ] 创建营养标准表单（目标值、容差范围、必填字段配置）

### 3.4 版本管理 `VersionList.vue` / `VersionCompare.vue`

- [ ] 验证版本列表展示是否完整（版本号、状态标签、变更详情）
- [ ] 验证版本对比页面展示（差异高亮、变更统计摘要）
- [ ] 业务员变更替代客户变更的展示

### 3.5 业务员 `SalesmanList.vue`

- [ ] 确认筛选功能完整（关键词、状态、部门）
- [ ] 确认软删除功能正常

---

## 阶段四：数据迁移与清理

> 优先级：P0 | 预估：0.5 天

### 4.1 数据库重建

- [ ] 删除旧 SQLite 数据库文件
- [ ] 执行新的 `init.sql` 建表
- [ ] 执行新的 `seedData.ts` 插入种子数据

### 4.2 验证

- [ ] 管理员登录可查看所有配方
- [ ] 配方师登录仅看到自己创建的配方
- [ ] 配方创建时选择业务员（非客户）
- [ ] 版本快照中包含 salesmanId / salesmanName
- [ ] 无客户相关路由/API 报错

---

## 阶段五：测试与优化（可选）

> 优先级：P2 | 预估：1-2 天

### 5.1 功能测试

- [ ] 配方 CRUD 全流程（创建→编辑→版本→删除）
- [ ] 原料 CRUD + 配方引用检查
- [ ] 业务员 CRUD + 软删除
- [ ] 版本创建/发布/对比
- [ ] 营养计算 + 合规检查
- [ ] 导出任务创建 + 分享链接

### 5.2 UI 优化

- [ ] 响应式布局适配
- [ ] 空状态提示
- [ ] 加载状态骨架屏
- [ ] 错误状态友好提示

---

## 实施顺序建议

```
阶段一（后端重构）──→ 阶段四（数据库重建+验证）──→ 阶段二（前端重构）
                                                       │
                                                       ▼
                                                  阶段三（功能完善）
                                                       │
                                                       ▼
                                                  阶段五（测试优化）
```

> **注意**：阶段一和阶段四必须在阶段二之前完成，否则前端请求会因数据库字段不匹配而报错。阶段三可以并行推进。
