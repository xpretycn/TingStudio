# 用户（Users）接口测试用例文档

## 文档信息

| 项 | 值 |
|----|-----|
| 文档ID | ATC-USERS-20260607-001 |
| 路由文件 | backend/src/routes/users.ts |
| 控制器文件 | backend/src/controllers/userController.ts |
| Service文件 | backend/src/services/userService.ts |
| 端点数 | 3 |
| 测试用例数 | 63 |

---

## 一、接口清单

| 编号 | 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|------|
| U01 | GET | /api/users | 是 | user:read | 获取用户列表 |
| U02 | PUT | /api/users/:id/role | 是 | user:write | 更新用户角色 |
| U03 | PUT | /api/users/:id/status | 是 | user:write | 更新用户状态 |

---

## 二、测试用例

### U01 GET /api/users — 获取用户列表

**请求参数（Query）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索关键词（匹配 username/display_name/email） |
| roleId | string | 否 | 角色ID筛选 |
| isActive | number | 否 | 状态筛选（0=禁用，1=启用） |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页条数，默认20 |

**认证**：需要 Bearer Token + user:read

**关联表**：`users`、`roles`

**业务逻辑**：支持关键词搜索、角色筛选、状态筛选、分页；返回用户列表含角色名称；按 created_at DESC 排序

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-P01 | 获取用户列表成功 | admin用户登录，数据库有用户 | GET /api/users | 200, `{ success: true, data: { list: [...], pagination: { page, pageSize, total, totalPages } } }` |
| U01-P02 | 空数据库返回空列表 | 数据库无用户 | GET /api/users | 200, data.list: [], data.pagination.total: 0 |
| U01-P03 | 关键词搜索 | admin用户登录 | GET /api/users?keyword=test | 200, list 中 username/display_name/email 包含 "test" |
| U01-P04 | 角色筛选 | admin用户登录 | GET /api/users?roleId={roleId} | 200, list 中所有用户的 roleId 匹配 |
| U01-P05 | 状态筛选 | admin用户登录 | GET /api/users?isActive=1 | 200, list 中所有用户 is_active=1 |
| U01-P06 | 分页查询 | admin用户登录 | GET /api/users?page=2&pageSize=10 | 200, data.pagination.page=2, data.pagination.pageSize=10 |
| U01-P07 | 列表包含角色名称 | 用户已关联角色 | GET /api/users | 200, list 中每项包含 roleName 字段 |
| U01-P08 | 列表不含密码字段 | 数据库有用户 | GET /api/users | 200, list 中每项不包含 password 字段 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-E01 | 数据库查询异常 | 模拟数据库异常 | GET /api/users | 500, "获取用户列表失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-B01 | keyword为空字符串 | admin用户登录 | GET /api/users?keyword= | 200, 返回所有用户（空关键词不过滤） |
| U01-B02 | page=0 | admin用户登录 | GET /api/users?page=0 | 200, 使用默认页码1 |
| U01-B03 | pageSize=0 | admin用户登录 | GET /api/users?pageSize=0 | 200, 使用默认pageSize |
| U01-B04 | page为负数 | admin用户登录 | GET /api/users?page=-1 | 200, 使用默认页码1 |
| U01-B05 | pageSize为超大值 | admin用户登录 | GET /api/users?pageSize=99999 | 200, 返回所有用户（当前无上限限制） |
| U01-B06 | keyword含SQL注入 | admin用户登录 | GET /api/users?keyword=' OR 1=1 -- | 200, 不执行注入，返回空或匹配结果 |
| U01-B07 | isActive为非数字 | admin用户登录 | GET /api/users?isActive=abc | 200, isActive 为 NaN，不作为筛选条件 |
| U01-B08 | roleId为不存在的ID | admin用户登录 | GET /api/users?roleId=nonexist | 200, list 为空 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-R01 | 无Token请求 | — | GET /api/users | 401, UNAUTHORIZED |
| U01-R02 | Token过期 | 使用过期Token | GET /api/users | 401, TOKEN_EXPIRED |
| U01-R03 | admin用户访问 | admin登录 | GET /api/users | 200, 正常返回 |
| U01-R04 | formulist用户无user:read | formulist用户无权限 | GET /api/users | 403, FORBIDDEN |
| U01-R05 | formulist用户有user:read | formulist用户有权限 | GET /api/users | 200, 正常返回 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-V01 | 无请求参数 | admin用户登录 | GET /api/users | 200, 返回默认分页数据 |
| U01-V02 | page为字符串 | admin用户登录 | GET /api/users?page=abc | 200, 使用默认页码1 |
| U01-V03 | pageSize为字符串 | admin用户登录 | GET /api/users?pageSize=abc | 200, 使用默认pageSize |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-S01 | 更新用户角色后列表反映变化 | 先更新用户角色 | GET /api/users | 列表中用户角色已更新 |
| U01-S02 | 禁用用户后列表反映变化 | 先禁用用户 | GET /api/users?isActive=1 | 被禁用的用户不在列表中 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-DC01 | 列表数据与数据库一致 | 数据库有用户 | GET /api/users | 返回的用户数量与 users 表一致，字段值正确，roleName 与 roles 表关联正确 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-I01 | 多次请求结果一致 | admin用户登录 | 连续3次 GET /api/users | 3次响应完全一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U01-DI01 | admin可见全部用户 | admin用户登录 | GET /api/users | 返回所有用户 |
| U01-DI02 | formulist有权限可见全部用户 | formulist用户有user:read权限 | GET /api/users | 返回所有用户（用户列表无数据隔离） |

---

### U02 PUT /api/users/:id/role — 更新用户角色

**请求参数**

| 字段 | 位置 | 类型 | 必填 | 校验规则 |
|------|------|------|------|----------|
| id | params | string | 是 | 用户ID |
| roleId | body | string | 是 | minLength:1 |

**认证**：需要 Bearer Token + user:write

**关联表**：`users`、`roles`

**业务逻辑**：验证目标角色存在，更新用户的 role_id 和 role 字段

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-P01 | 更新用户角色成功 | admin用户登录，目标角色存在 | `{ roleId: "{targetRoleId}" }` | 200, `{ success: true, data: { id, username, role, roleId, ... }, message: "用户角色更新成功" }` |
| U02-P02 | 更新角色后role字段同步 | admin用户登录 | `{ roleId: "{adminRoleId}" }` | 200, data.role === "admin", data.roleId === adminRoleId |
| U02-P03 | 响应不含密码字段 | admin用户登录 | `{ roleId: "{roleId}" }` | 200, 响应体中不包含 password 字段 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-E01 | 目标角色不存在 | admin用户登录 | `{ roleId: "nonexist-role-id" }` | 404, `{ success: false, message: "目标角色不存在", code: "NOT_FOUND" }` |
| U02-E02 | 数据库更新失败 | 模拟数据库异常 | `{ roleId: "{roleId}" }` | 500, "更新用户角色失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-B01 | 将用户设为admin角色 | admin用户登录 | `{ roleId: "{adminRoleId}" }` | 200, 用户角色变为admin |
| U02-B02 | 将admin用户降为formulist | admin用户登录 | `{ roleId: "{formulistRoleId}" }` | 200, 用户角色变为formulist |
| U02-B03 | id为不存在的用户 | admin用户登录 | PUT /api/users/nonexist-id/role | 数据库更新0行，无报错（当前实现不校验用户存在性） |
| U02-B04 | roleId含SQL注入 | admin用户登录 | `{ roleId: "'; DROP TABLE users;--" }` | 404, 不执行注入 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-R01 | 无Token请求 | — | `{ roleId: "{roleId}" }` | 401, UNAUTHORIZED |
| U02-R02 | Token过期 | 使用过期Token | `{ roleId: "{roleId}" }` | 401, TOKEN_EXPIRED |
| U02-R03 | admin用户操作 | admin登录 | `{ roleId: "{roleId}" }` | 200, 更新成功 |
| U02-R04 | formulist用户无user:write | formulist用户无权限 | `{ roleId: "{roleId}" }` | 403, FORBIDDEN |
| U02-R05 | formulist用户有user:write | formulist用户有权限 | `{ roleId: "{roleId}" }` | 200, 更新成功 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-V01 | 缺少roleId | admin用户登录 | `{}` | 400, VALIDATION_ERROR |
| U02-V02 | roleId为空字符串 | admin用户登录 | `{ roleId: "" }` | 400, VALIDATION_ERROR |
| U02-V03 | roleId为null | admin用户登录 | `{ roleId: null }` | 400, VALIDATION_ERROR |
| U02-V04 | roleId为数字类型 | admin用户登录 | `{ roleId: 12345 }` | 400, VALIDATION_ERROR |
| U02-V05 | 请求体为空 | admin用户登录 | `{}` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-S01 | 更新角色后再更新 | 第一次更新成功 | 第二次 `{ roleId: "{anotherRoleId}" }` | 200, 角色变为最新值 |
| U02-S02 | 更新角色后用户权限变化 | 用户从formulist变为admin | 用户重新登录 | Token中permissions包含"*" |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-DC01 | 更新后数据库记录正确 | admin用户登录 | `{ roleId: "{roleId}" }` | users 表对应记录 role_id 和 role 字段已更新, updated_at 已更新 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-I01 | 相同请求重复提交 | admin用户登录 | 两次 `{ roleId: "{roleId}" }` | 两次均200, 数据库最终状态一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U02-DI01 | 用户角色更新无隔离 | 有权限的用户 | `{ roleId: "{roleId}" }` | 可更新任意用户的角色（无数据隔离限制） |

---

### U03 PUT /api/users/:id/status — 更新用户状态

**请求参数**

| 字段 | 位置 | 类型 | 必填 | 校验规则 |
|------|------|------|------|----------|
| id | params | string | 是 | 用户ID |
| isActive | body | number | 是 | 1=启用，0=禁用 |

**认证**：需要 Bearer Token + user:write

**关联表**：`users`

**业务逻辑**：
- 不能禁用自己（CANNOT_DISABLE_SELF）
- 不能禁用admin用户（CANNOT_DISABLE_ADMIN）
- 启用操作无限制

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-P01 | 禁用用户成功 | admin用户登录，目标用户非admin且非自己 | `{ isActive: 0 }` | 200, `{ success: true, data: null, message: "用户状态更新成功" }` |
| U03-P02 | 启用用户成功 | admin用户登录，目标用户已禁用 | `{ isActive: 1 }` | 200, 用户状态变为启用 |
| U03-P03 | 启用admin用户 | admin用户被禁用后（假设数据直接修改） | `{ isActive: 1 }` | 200, 启用成功（仅禁用admin被拦截） |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-E01 | 禁用自己 | admin用户登录 | PUT /api/users/{自己ID}/status, `{ isActive: 0 }` | 400, `{ success: false, message: "不能禁用当前登录账号", code: "CANNOT_DISABLE_SELF" }` |
| U03-E02 | 禁用admin用户 | admin用户登录，目标用户role="admin" | `{ isActive: 0 }` | 400, `{ success: false, message: "不能禁用管理员账号", code: "CANNOT_DISABLE_ADMIN" }` |
| U03-E03 | 用户不存在 | 数据库无该ID | `{ isActive: 0 }` | 404, `{ success: false, message: "用户不存在", code: "NOT_FOUND" }` |
| U03-E04 | 数据库更新失败 | 模拟数据库异常 | `{ isActive: 0 }` | 500, "更新用户状态失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-B01 | isActive=2（非0/1） | admin用户登录 | `{ isActive: 2 }` | 200, 数据库写入2（当前实现无枚举校验） |
| U03-B02 | id为不存在的UUID | admin用户登录 | PUT /api/users/nonexist-id/status | 404, "用户不存在" |
| U03-B03 | id含SQL注入 | admin用户登录 | PUT /api/users/1;DROP%20TABLE/status | 404, 不执行注入 |
| U03-B04 | 启用自己 | admin用户登录 | PUT /api/users/{自己ID}/status, `{ isActive: 1 }` | 200, 允许启用自己 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-R01 | 无Token请求 | — | `{ isActive: 0 }` | 401, UNAUTHORIZED |
| U03-R02 | Token过期 | 使用过期Token | `{ isActive: 0 }` | 401, TOKEN_EXPIRED |
| U03-R03 | admin用户操作 | admin登录 | `{ isActive: 0 }` | 200, 更新成功 |
| U03-R04 | formulist用户无user:write | formulist用户无权限 | `{ isActive: 0 }` | 403, FORBIDDEN |
| U03-R05 | formulist用户有user:write | formulist用户有权限 | `{ isActive: 0 }` | 200, 更新成功 |
| U03-R06 | 未认证用户（req.user为空） | Token无效 | `{ isActive: 0 }` | 401, UNAUTHORIZED |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-V01 | 缺少isActive | admin用户登录 | `{}` | 400, VALIDATION_ERROR |
| U03-V02 | isActive为字符串 | admin用户登录 | `{ isActive: "0" }` | 400, VALIDATION_ERROR |
| U03-V03 | isActive为null | admin用户登录 | `{ isActive: null }` | 400, VALIDATION_ERROR |
| U03-V04 | isActive为布尔值 | admin用户登录 | `{ isActive: false }` | 400, VALIDATION_ERROR |
| U03-V05 | 请求体为空 | admin用户登录 | `{}` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-S01 | 禁用后再启用 | 用户已禁用 | `{ isActive: 1 }` | 200, 用户恢复启用 |
| U03-S02 | 启用后再禁用 | 用户已启用，非admin非自己 | `{ isActive: 0 }` | 200, 用户被禁用 |
| U03-S03 | 禁用用户后该用户无法登录 | 用户被禁用 | 被禁用用户尝试登录 | 当前实现未检查 is_active，登录仍成功（建议补充） |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-DC01 | 更新后数据库记录正确 | admin用户登录 | `{ isActive: 0 }` | users 表对应记录 is_active=0, updated_at 已更新 |
| U03-DC02 | 启用后数据库记录正确 | admin用户登录 | `{ isActive: 1 }` | users 表对应记录 is_active=1, updated_at 已更新 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-I01 | 相同请求重复提交 | admin用户登录 | 两次 `{ isActive: 0 }` | 两次均200, 数据库最终状态一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| U03-DI01 | 用户状态更新无隔离 | 有权限的用户 | `{ isActive: 0 }` | 可更新任意用户的状态（仅受业务规则限制，非数据隔离） |

---

## 三、特殊场景测试

### X-MD 请求方法限制

| 用例ID | 用例名称 | 请求方法 | 路径 | 预期结果 |
|--------|---------|----------|------|----------|
| X-MD01 | 用POST访问用户列表 | POST | /api/users | 404 或 405 |
| X-MD02 | 用GET访问更新用户角色 | GET | /api/users/:id/role | 404 或 405 |
| X-MD03 | 用POST访问更新用户状态 | POST | /api/users/:id/status | 404 或 405 |
| X-MD04 | 用DELETE访问更新用户角色 | DELETE | /api/users/:id/role | 404 或 405 |

### X-SE 错误信息安全

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-SE01 | 500错误不泄露堆栈 | 模拟数据库异常 | 响应不包含 stack trace、SQL语句 |
| X-SE02 | 500错误不泄露数据库表名 | 模拟数据库异常 | 响应不包含 users/roles 等表名 |
| X-SE03 | 用户列表不含密码 | 正常请求 | list 中每项不包含 password 字段 |
| X-SE04 | 更新角色响应不含密码 | 正常请求 | 响应体中不包含 password 字段 |

### X-RF 响应格式一致性

| 用例ID | 用例名称 | 预期结果 |
|--------|---------|----------|
| X-RF01 | 成功响应包含 success:true 和 data | 所有成功响应结构为 `{ success: true, data: {...} }` |
| X-RF02 | 分页响应包含 pagination | `{ success: true, data: { list: [...], pagination: { page, pageSize, total, totalPages } } }` |
| X-RF03 | 404错误包含 code:"NOT_FOUND" | `{ success: false, message: "...", code: "NOT_FOUND" }` |
| X-RF04 | 400错误包含 code | CANNOT_DISABLE_SELF / CANNOT_DISABLE_ADMIN |
| X-RF05 | 403错误包含 code:"FORBIDDEN" | `{ success: false, error: { message, code: "FORBIDDEN" } }` |

### X-CT Content-Type校验

| 用例ID | 用例名称 | 请求Content-Type | 预期结果 |
|--------|---------|------------------|----------|
| X-CT01 | 更新角色要求JSON | application/json | 正常处理 |
| X-CT02 | 更新状态要求JSON | application/json | 正常处理 |

### X-AL 审计日志

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-AL01 | 更新用户角色审计 | admin更新用户角色 | 应记录操作人、目标用户、原角色、新角色、时间（建议补充） |
| X-AL02 | 禁用用户审计 | admin禁用用户 | 应记录操作人、目标用户、时间（建议补充） |
| X-AL03 | 启用用户审计 | admin启用用户 | 应记录操作人、目标用户、时间（建议补充） |

---

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| U01 GET / | 8 | 1 | 8 | 5 | 3 | 2 | 1 | 1 | 2 | 31 |
| U02 PUT /:id/role | 3 | 2 | 4 | 5 | 5 | 2 | 1 | 1 | 1 | 24 |
| U03 PUT /:id/status | 3 | 4 | 4 | 6 | 5 | 3 | 2 | 1 | 1 | 29 |
| **合计** | **14** | **7** | **16** | **16** | **13** | **7** | **4** | **3** | **4** | **84** |

> 注：特殊场景测试 17 条未计入上表维度统计。
