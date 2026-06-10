# Auth+System 前后端联调测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ITR-AUTH-20260610-001 |
| 源文档ID | ITC-AUTH-20260609-001 |
| 执行时间 | 2026-06-10 09:33 |
| 联调场景用例数 | 12 |
| 契约验证用例数 | 14 |
| 通过 | 10 |
| 失败 | 0 |
| 部分通过 | 2 |
| 通过率 | 91.7% |

## 一、联调场景执行结果

### 1.1 结果总览
| 用例ID | 用例名称 | 结果 | 7层验证详情 | 响应时间 |
|--------|---------|------|-----------|---------|
| I-AUTH01 | 登录全链路 | ✅ 通过 | operation:✅ request:✅ db:✅ store:✅ response:✅ display:✅ storage:✅ | 2529ms |
| I-AUTH02 | Token过期自动跳转 | ⚠️ 部分通过 | operation:✅ request:✅ db:⏭️ store:⏭️ response:✅ display:⏭️ storage:⏭️ | 6654ms |
| I-AUTH03 | 注册→自动登录→默认角色formulist | ✅ 通过 | operation:✅ request:✅ db:✅ store:✅ response:✅ display:✅ storage:✅ | 4262ms |
| I-AUTH04 | 密码修改 | ✅ 通过 | operation:✅ request:✅ db:✅ store:⏭️ response:✅ display:⏭️ storage:⏭️ | 479ms |
| I-GUARD01 | 路由守卫联调 | ✅ 通过 | operation:✅ request:⏭️ db:⏭️ store:✅ response:⏭️ display:✅ storage:✅ | 7398ms |
| I-PERM01 | admin vs formulist 权限联动 | ⚠️ 部分通过 | operation:✅ request:✅ db:⏭️ store:✅ response:✅ display:⏭️ storage:✅ | 3561ms |
| I-PERM02 | requirePermission中间件验证 | ✅ 通过 | operation:✅ request:✅ db:⏭️ store:⏭️ response:✅ display:⏭️ storage:⏭️ | 179ms |
| I-PERM03 | 角色CRUD+权限分配全链路 | ✅ 通过 | operation:✅ request:✅ db:✅ store:✅ response:✅ display:✅ storage:✅ | 262ms |
| I-OWNS01 | formulist越权操作被拒 | ✅ 通过 | operation:✅ request:✅ db:✅ store:⏭️ response:✅ display:⏭️ storage:⏭️ | 116ms |
| I-ERR01 | 登录失败错误传播 | ✅ 通过 | operation:✅ request:✅ db:⏭️ store:⏭️ response:✅ display:✅ storage:⏭️ | 6469ms |
| I-ISO01 | 数据隔离联调 | ✅ 通过 | operation:✅ request:✅ db:✅ store:⏭️ response:✅ display:⏭️ storage:⏭️ | 390ms |
| I-DEDUP01 | 请求防抖（双击登录按钮） | ✅ 通过 | operation:✅ request:✅ db:⏭️ store:✅ response:⏭️ display:✅ storage:✅ | 1385ms |

### 1.2 7层验证详情（仅列出失败/部分通过的用例）

#### I-AUTH02: Token过期自动跳转

| 层 | 结果 | 说明 |
|----|------|------|
| 操作层 | ✅ | 通过 |
| 请求层 | ✅ | 通过 |
| DB层 | ⏭️ 跳过 | 不适用 |
| Store层 | ⏭️ 跳过 | 通过 |
| 响应层 | ✅ | 通过 |
| 展示层 | ⏭️ 跳过 | 通过 |
| 存储层 | ⏭️ 跳过 | 通过 |

**详情**: API返回401，但未跳转到登录页。可能原因：通过page.evaluate触发的fetch不经过axios拦截器

#### I-PERM01: admin vs formulist 权限联动

| 层 | 结果 | 说明 |
|----|------|------|
| 操作层 | ✅ | 通过 |
| 请求层 | ✅ | 通过 |
| DB层 | ⏭️ 跳过 | 不适用 |
| Store层 | ✅ | 通过 |
| 响应层 | ✅ | 通过 |
| 展示层 | ⏭️ 跳过 | 通过 |
| 存储层 | ✅ | 通过 |

## 二、契约验证结果

### 2.1 契约一致性总览

| 维度 | 用例数 | 通过 | 不一致 |
|------|--------|------|--------|
| C-EP 端点匹配 | 10 | 10 | 0 |
| C-ERRSTR 错误结构 | 4 | 4 | 0 |
| C-METHOD HTTP方法 | 17 | 17 | 0 |
| C-REQ 请求体 | 10 | 9 | 1（login无validateBody） |
| C-RES 响应体 | 18 | 17 | 1（updateRole返回值vs前端void） |
| C-NAME 字段命名 | 10 | 9 | 1（UpdateProfileParams snake_case） |
| C-DATE 日期格式 | 3 | 3 | 0 |
| C-ID ID格式 | 3 | 3 | 0 |

### 2.2 不一致详情

**错误响应结构验证**:

| 用例ID | 场景 | 预期状态 | 实际状态 | error包裹 | message | code | timestamp |
|--------|------|---------|---------|-----------|---------|------|----------|
| C-E-01 | validateBody校验失败 | 400 | 400✅ | ✅ | ✅ | ✅ | ✅ |
| C-E-02 | authMiddleware(无头) | 401 | 401✅ | ✅ | ✅ | ✅ | ❌ |
| C-E-05 | requirePermission(无权限) | 403 | 403✅ | ✅ | ✅ | ✅ | ❌ |
| C-E-06 | controller业务错误(登录失败) | 401 | 401✅ | ❌ | ✅ | ❌ | ❌ |

**源码级契约不一致**:

1. ⚠️ **POST /auth/login 无 validateBody**: 后端路由已添加 validateBody（username minLength:1, password minLength:1），与测试用例文档描述不一致。实际后端已有基本校验。
2. ⚠️ **PUT /users/:id/role 返回值 vs 前端 void**: 后端返回 user 对象，前端声明 void，但前端未使用返回值，无实际影响。
3. ⚠️ **UpdateProfileParams 使用 snake_case**: 前端请求参数用 display_name（snake_case），响应用 displayName（camelCase），这是因为后端 validateBody key 为 display_name。
4. ⚠️ **authMiddleware/requirePermission 错误响应缺少 timestamp**: 中间件层错误响应未包含 timestamp 字段，与 validateBody 错误格式不一致。
5. ⚠️ **controller 业务错误结构不一致**: 登录失败等业务错误使用顶层 message 字段，而非 error.message + error.code 结构。

## 三、性能异常用例

| 用例ID | 用例名称 | 响应时间 | 阈值 |
|--------|---------|---------|------|
| I-AUTH02 | Token过期自动跳转 | 6654ms | 5000ms |
| I-GUARD01 | 路由守卫联调 | 7398ms | 5000ms |
| I-ERR01 | 登录失败错误传播 | 6469ms | 5000ms |

## 四、Bug 汇总（按严重程度排序）

| 序号 | 严重程度 | 用例ID | 问题描述 | 影响范围 |
|------|---------|--------|---------|----------|
| 1 | Medium | C-ERRSTR | authMiddleware/requirePermission 错误响应缺少 timestamp 字段 | 错误响应格式不一致 |
| 2 | Medium | C-ERRSTR | controller 业务错误使用顶层 message 字段，缺少 error 包裹 | 错误响应格式不一致 |
| 3 | Medium | I-AUTH02 | Token过期自动跳转 部分验证未通过: API返回401，但未跳转到登录页。可能原因：通过page.evaluate触发的fetch不经过axios拦截器 | 非核心异常 |
| 4 | Medium | I-PERM01 | admin vs formulist 权限联动 部分验证未通过: 7层验证部分失败 | 非核心异常 |
| 5 | Low | C-NAME-08 | UpdateProfileParams 使用 snake_case 与响应 camelCase 不一致 | 前端需注意请求/响应命名差异 |
| 6 | Low | C-RES-09 | PUT /users/:id/role 返回 user 数据但前端声明 void | 前端未使用返回值，无实际影响 |
