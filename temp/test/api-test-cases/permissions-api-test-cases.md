# 权限（Permissions）接口测试用例文档

## 文档信息

| 项 | 值 |
|----|-----|
| 文档ID | ATC-PERM-20260607-001 |
| 路由文件 | backend/src/routes/permissions.ts |
| 控制器文件 | backend/src/controllers/permissionController.ts |
| Service文件 | backend/src/services/permissionService.ts |
| 端点数 | 1 |
| 测试用例数 | 19 |

---

## 一、接口清单

| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| P01 | GET | /api/permissions | 是 | 获取所有权限（按模块分组） |

---

## 二、测试用例

### P01 GET /api/permissions — 获取所有权限（按模块分组）

**请求参数**：无

**认证**：需要 Bearer Token（authMiddleware，路由级）

**关联表**：`permissions`

**业务逻辑**：查询所有权限记录，按 module 字段分组，每组包含 moduleLabel（中文模块名），权限按 sort_order 排序

**模块标签映射**：

| module | moduleLabel |
|--------|-------------|
| material | 原料管理 |
| formula | 配方管理 |
| ai | AI助手 |
| nutrition | 营养分析 |
| file | 文件管理 |
| export | 数据导出 |
| system | 系统配置 |
| user | 用户管理 |
| permission | 权限管理 |

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-P01 | 获取权限列表成功 | 数据库有权限数据 | GET /api/permissions | 200, `{ success: true, data: [{ module: "material", moduleLabel: "原料管理", permissions: [{ id, module, action, permissionKey, label, description, sortOrder, createdAt }] }] }` |
| P01-P02 | 空数据库返回空数组 | 数据库无权限 | GET /api/permissions | 200, `{ success: true, data: [] }` |
| P01-P03 | 权限按模块分组 | 数据库有多个模块的权限 | GET /api/permissions | data 中每个对象的 module 不同，permissions 数组包含该模块下的所有权限 |
| P01-P04 | 权限按sort_order排序 | 同一模块有多个权限 | GET /api/permissions | 每组内 permissions 按 sortOrder 升序排列 |
| P01-P05 | 未知模块使用原始module值 | 数据库有 module="unknown" 的权限 | GET /api/permissions | moduleLabel 为 "unknown"（回退到 module 值） |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-E01 | 数据库查询异常 | 模拟数据库异常 | GET /api/permissions | 500, "获取权限列表失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-B01 | 单模块单权限 | 数据库仅有一个权限 | GET /api/permissions | data 长度为1, permissions 长度为1 |
| P01-B02 | 大量权限数据 | 数据库有100+权限 | GET /api/permissions | 正常返回所有分组数据 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-R01 | 无Token请求 | — | GET /api/permissions | 401, UNAUTHORIZED |
| P01-R02 | Token过期 | 使用过期Token | GET /api/permissions | 401, TOKEN_EXPIRED |
| P01-R03 | admin用户访问 | admin登录 | GET /api/permissions | 200, 正常返回 |
| P01-R04 | formulist用户访问 | formulist用户登录 | GET /api/permissions | 200, 正常返回（GET无需特殊权限） |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-V01 | 无请求参数 | 已登录用户 | GET /api/permissions | 200, 正常返回 |
| P01-V02 | 忽略query参数 | 已登录用户 | GET /api/permissions?foo=bar | 200, 忽略无关参数 |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-S01 | 权限数据变更后获取最新 | 数据库权限被修改 | GET /api/permissions | 返回最新的权限数据 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-DC01 | 返回数据与数据库一致 | 数据库有权限数据 | GET /api/permissions | 分组数量、权限数量与 permissions 表一致，字段值正确 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-I01 | 多次请求结果一致 | 已登录用户 | 连续3次 GET /api/permissions | 3次响应完全一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| P01-DI01 | 权限数据无隔离 | admin和formulist用户 | GET /api/permissions | 两种角色看到相同的权限列表 |

---

## 三、特殊场景测试

### X-MD 请求方法限制

| 用例ID | 用例名称 | 请求方法 | 路径 | 预期结果 |
|--------|---------|----------|------|----------|
| X-MD01 | 用POST访问权限列表 | POST | /api/permissions | 404 或 405 |
| X-MD02 | 用PUT访问权限列表 | PUT | /api/permissions | 404 或 405 |
| X-MD03 | 用DELETE访问权限列表 | DELETE | /api/permissions | 404 或 405 |

### X-SE 错误信息安全

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-SE01 | 500错误不泄露堆栈 | 模拟数据库异常 | 响应不包含 stack trace、SQL语句 |
| X-SE02 | 500错误不泄露数据库表名 | 模拟数据库异常 | 响应不包含 permissions 等表名 |

### X-RF 响应格式一致性

| 用例ID | 用例名称 | 预期结果 |
|--------|---------|----------|
| X-RF01 | 成功响应包含 success:true 和 data | `{ success: true, data: [...] }` |
| X-RF02 | 错误响应包含 success:false 和 message | `{ success: false, message: "..." }` |
| X-RF03 | 分组结构一致 | 每个分组包含 module, moduleLabel, permissions 三个字段 |

### X-CT Content-Type校验

| 用例ID | 用例名称 | 请求Content-Type | 预期结果 |
|--------|---------|------------------|----------|
| X-CT01 | GET请求无Content-Type | — | 正常返回 |

### X-AL 审计日志

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-AL01 | 权限列表查询审计 | 用户查询权限列表 | 当前为只读操作，审计需求较低（建议补充查询日志） |

---

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| P01 GET / | 5 | 1 | 2 | 4 | 2 | 1 | 1 | 1 | 1 | 18 |

> 注：特殊场景测试 9 条未计入上表维度统计。
