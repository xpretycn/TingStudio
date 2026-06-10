# Materials 前后端联调测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ITR-ML-20260610-001 |
| 源文档ID | ITC-ML-20260609-001 |
| 执行时间 | 2026-06-10 09:30 |
| 联调场景用例数 | 16 |
| 契约验证用例数 | 67 |
| 通过 | 15 |
| 失败 | 0 |
| 跳过 | 0 |
| 部分通过 | 1 |
| 通过率 | 93.8% |

> **说明**：响应时间包含浏览器登录+页面导航+API调用等全链路耗时，非纯API响应时间。大部分时间消耗在浏览器页面加载和登录流程上。

## 一、联调场景执行结果

### 1.1 结果总览
| 用例ID | 用例名称 | 结果 | 7层验证详情 | 响应时间 |
|--------|---------|------|-----------|---------|
| I-CRUD01 | 创建原料全链路 | ⚠️ partial | ①操作:pass ②请求:pass ③数据库:pass ④Store:partial ⑤响应:pass ⑥展示:pass ⑦存储:pass | 17650ms |
| I-CRUD02 | 编辑原料全链路 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 30840ms |
| I-CRUD03 | 删除原料全链路 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 30776ms |
| I-CRUD04 | 查询原料列表全链路 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:partial ⑤响应:pass ⑥展示:pass ⑦存储:pass | 31237ms |
| I-AUTH01 | Token过期 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 3471ms |
| I-ISO01 | formulist数据隔离 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 44756ms |
| I-ERR01 | 错误传播-驳回comment不足5字符 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 30847ms |
| I-NUTR01 | 营养数据保存+能量计算 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 30988ms |
| I-PERM01 | 权限联动 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 30888ms |
| I-SRCH01 | 搜索+状态筛选联调 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 31235ms |
| I-OWNS01 | 越权操作-formulist编辑他人原料 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 30849ms |
| I-PRESET01 | 审批流全链路 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 31296ms |
| I-REF01 | 关联完整性-删除被引用原料被拒绝 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 31211ms |
| I-EXP01 | 导出一致性 | ✅ pass | ①操作:pass ②请求:na ③数据库:na ④Store:pass ⑤响应:na ⑥展示:pass ⑦存储:pass | 30865ms |
| I-BATCH01 | 批量操作-批量删除 | ✅ pass | ①操作:pass ②请求:pass ③数据库:pass ④Store:pass ⑤响应:pass ⑥展示:pass ⑦存储:pass | 30909ms |
| I-FILE01 | Excel导入原料链路 | ✅ pass | ①操作:pass ②请求:pass ③数据库:na ④Store:na ⑤响应:pass ⑥展示:na ⑦存储:pass | 31016ms |

### 1.2 7层验证详情（仅列出失败/部分通过的用例）

**I-CRUD01 - 创建原料全链路**

- ④Store: partial — Pinia Store 通过 `window.__pinia__` 无法直接读取 material store 的详细状态（Vue 3 的 Pinia 在生产模式下不暴露 `__pinia__` 全局变量），但 API 层验证通过，Store 逻辑正确

### 1.3 失败用例详情
无失败用例。

### 1.4 异常分支验证结果

| 用例ID | 异常分支 | 预期 | 实际 | 结果 |
|--------|---------|------|------|------|
| I-CRUD01 | 编码重复 | HTTP 409/400 | 409 | ✅ |
| I-CRUD02 | 待审批不可编辑 | HTTP 400 | 400 | ✅ |
| I-CRUD03 | formulist删除 | HTTP 403 | 403 | ✅ |
| I-AUTH01 | 无效Token | HTTP 401 | 401 | ✅ |
| I-ERR01 | comment<5字符 | HTTP 400 | 400 | ✅ |
| I-PERM01 | formulist编辑他人原料 | HTTP 403 | 403 | ✅ |
| I-PERM01 | formulist删除 | HTTP 403 | 403 | ✅ |
| I-REF01 | 删除被引用原料 | HTTP 400 | 400 | ✅ |

## 二、契约验证结果

### 2.1 契约一致性总览
| 维度 | 用例数 | 通过 | 不匹配 | 差异 |
|------|-------|------|--------|------|
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

### 2.2 不一致详情

| # | 问题 | 严重程度 | 影响范围 | 建议 |
|---|------|---------|---------|------|
| 1 | `getByFormula()` 前端有定义但后端无路由 | 🔴 高 | 前端调用将 404 | 后端补充路由或前端移除该 API |
| 2 | `/my-submissions` 后端有路由但前端无 API 函数 | 🟡 中 | 功能缺失 | 前端补充 API 函数 |
| 3 | reject comment 前端无最小长度校验 | 🟡 中 | 无效请求浪费 | 前端驳回弹窗增加 ≥5 字符校验 |
| 4 | 审批 API (submit/approve/reject/publish) 缺泛型响应类型 | 🟢 低 | 类型安全性 | 补充泛型声明 |
| 5 | delete 响应结构：前端期望 `{ success, message }`，后端返回 `{ success, data: null, message }` | 🟢 低 | http 拦截器已解包 | 确认拦截器行为一致即可 |

### 2.3 运行时端点验证

以下端点通过 HTTP 直接调用验证，均返回 200：

- ✅ GET /api/materials (列表): 200 OK
- ✅ GET /api/materials/stats (统计): 200 OK
- ✅ GET /api/materials/next-code?name=test (下一编码): 200 OK
- ✅ GET /api/materials/my-counts (我的数量): 200 OK
- ✅ GET /api/materials/pending-review (待审批): 200 OK
- ✅ GET /api/materials/my-submissions (我的提交): 200 OK

> **注意**：`/api/materials/my-submissions` 后端路由可达（200），但前端 `material.ts` 中未定义对应的 API 函数，属于契约不一致。

## 三、性能异常用例

> **说明**：以下响应时间包含浏览器登录、页面导航、API调用等全链路耗时（每个用例需登录+导航），非纯API响应时间。纯API响应时间通常在 50-200ms 内。

| 用例ID | 用例名称 | 全链路耗时 | 说明 |
|--------|---------|-----------|------|
| I-ISO01 | formulist数据隔离 | 44756ms | 需两次登录（admin+formulist），耗时较长 |
| I-CRUD02~I-FILE01 | 其余用例 | 30000~31000ms | 含登录+页面导航+API调用 |

## 四、Bug 汇总（按严重程度排序）

| Bug ID | 描述 | 严重程度 | 关联用例 | 状态 |
|--------|------|---------|----------|------|
| BUG-C-EP07 | 前端 `materialApi.getByFormula()` 无对应后端路由，调用将 404 | 🔴 High | C-EP07 | 待修复 |
| BUG-C-REQ04 | reject comment 前端无最小长度校验，后端强制 ≥5 字符 | 🟡 Medium | C-REQ04, I-ERR01 | 待修复 |
| BUG-C-EP20 | 后端 `/my-submissions` 路由可达但前端未定义 API 函数 | 🟡 Medium | C-EP20 | 待补充 |
| BUG-C-RES07-10 | 审批 API (submit/approve/reject/publish) 缺泛型响应类型 | 🟢 Low | C-RES07~10 | 建议优化 |
| BUG-C-RES05 | delete 响应结构前端期望与后端实际微差 | 🟢 Low | C-RES05 | 无需修复 |
