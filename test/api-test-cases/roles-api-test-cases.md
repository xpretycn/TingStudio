# 角色（Roles）接口测试用例文档

## 文档信息

| 项 | 值 |
|----|-----|
| 文档ID | ATC-ROLES-20260607-001 |
| 路由文件 | backend/src/routes/roles.ts |
| 控制器文件 | backend/src/controllers/roleController.ts |
| Service文件 | backend/src/services/roleService.ts |
| 端点数 | 7 |
| 测试用例数 | 94 |

---

## 一、接口清单

| 编号 | 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|------|
| R01 | GET | /api/roles | 是 | — | 获取所有角色 |
| R02 | GET | /api/roles/:id | 是 | — | 获取角色详情 |
| R03 | POST | /api/roles | 是 | permission:write | 创建角色 |
| R04 | PUT | /api/roles/:id | 是 | permission:write | 更新角色 |
| R05 | DELETE | /api/roles/:id | 是 | permission:write | 删除角色 |
| R06 | GET | /api/roles/:id/permissions | 是 | — | 获取角色权限 |
| R07 | PUT | /api/roles/:id/permissions | 是 | permission:write | 更新角色权限 |

---

## 二、测试用例

### R01 GET /api/roles — 获取所有角色

**请求参数**：无

**认证**：需要 Bearer Token（authMiddleware，路由级）

**关联表**：`roles`、`role_permissions`、`users`

**业务逻辑**：返回所有角色列表，包含每个角色的 permissionCount 和 userCount，按 is_system DESC、created_at ASC 排序

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-P01 | 获取角色列表成功 | 数据库有角色数据 | GET /api/roles | 200, `{ success: true, data: [{ id, name, roleKey, description, isSystem, permissionCount, userCount, createdAt, updatedAt }] }` |
| R01-P02 | 空数据库返回空数组 | 数据库无角色 | GET /api/roles | 200, `{ success: true, data: [] }` |
| R01-P03 | 系统角色排在前面 | 同时有系统角色和自定义角色 | GET /api/roles | is_system=1 的角色排在前面 |
| R01-P04 | 列表包含权限数和用户数 | 角色已关联权限和用户 | GET /api/roles | permissionCount 和 userCount 正确 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-E01 | 数据库查询异常 | 模拟数据库异常 | GET /api/roles | 500, "获取角色列表失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-B01 | 大量角色分页 | 数据库有100+角色 | GET /api/roles | 返回所有角色（当前实现无分页） |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-R01 | 无Token请求 | — | GET /api/roles | 401, UNAUTHORIZED |
| R01-R02 | Token过期 | 使用过期Token | GET /api/roles | 401, TOKEN_EXPIRED |
| R01-R03 | admin用户访问 | admin登录 | GET /api/roles | 200, 正常返回 |
| R01-R04 | formulist用户访问（有权限） | formulist用户有permission:read | GET /api/roles | 200, 正常返回 |
| R01-R05 | formulist用户访问（无权限） | formulist用户无任何权限 | GET /api/roles | 200, 正常返回（GET无需permission:write） |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-V01 | 无请求参数 | 已登录用户 | GET /api/roles | 200, 正常返回 |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-S01 | 创建角色后列表更新 | 先创建新角色 | GET /api/roles | 列表包含新创建的角色 |
| R01-S02 | 删除角色后列表更新 | 先删除角色 | GET /api/roles | 列表不包含已删除的角色 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-DC01 | 列表数据与数据库一致 | 数据库有角色数据 | GET /api/roles | 返回的角色数量、字段值与 roles 表一致 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-I01 | 多次请求结果一致 | 已登录用户 | 连续3次 GET /api/roles | 3次响应完全一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R01-DI01 | 角色数据无隔离 | admin和formulist用户 | GET /api/roles | 两种角色看到相同的角色列表 |

---

### R02 GET /api/roles/:id — 获取角色详情

**请求参数**

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | params | string | 是 | 角色ID |

**认证**：需要 Bearer Token

**关联表**：`roles`、`role_permissions`、`permissions`

**业务逻辑**：返回角色详情，包含关联的权限列表

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-P01 | 获取角色详情成功 | 数据库有该角色 | GET /api/roles/{roleId} | 200, `{ success: true, data: { id, name, roleKey, description, isSystem, permissions: [...], createdAt, updatedAt } }` |
| R02-P02 | 详情包含权限列表 | 角色已关联权限 | GET /api/roles/{roleId} | data.permissions 包含 { id, permissionKey, label, module, action } |
| R02-P03 | 无权限的角色详情 | 角色未关联权限 | GET /api/roles/{roleId} | data.permissions 为空数组 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-E01 | 角色不存在 | 数据库无该ID | GET /api/roles/{nonExistId} | 404, `{ success: false, message: "角色不存在", code: "NOT_FOUND" }` |
| R02-E02 | 数据库查询异常 | 模拟数据库异常 | GET /api/roles/{roleId} | 500, "获取角色详情失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-B01 | id为空字符串 | — | GET /api/roles/ | 404（路由不匹配） |
| R02-B02 | id含特殊字符 | — | GET /api/roles/abc;DROP%20TABLE | 404, 不执行SQL注入 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-R01 | 无Token请求 | — | GET /api/roles/{roleId} | 401, UNAUTHORIZED |
| R02-R02 | Token过期 | 使用过期Token | GET /api/roles/{roleId} | 401, TOKEN_EXPIRED |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-V01 | id格式为非UUID | — | GET /api/roles/not-a-uuid | 404, "角色不存在" |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-S01 | 更新角色后获取详情 | 先更新角色名称 | GET /api/roles/{roleId} | 返回更新后的名称 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-DC01 | 详情数据与数据库一致 | 数据库有该角色 | GET /api/roles/{roleId} | 字段值与 roles 表记录一致，permissions 与 role_permissions 关联一致 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-I01 | 多次请求结果一致 | 已登录用户 | 连续3次 GET /api/roles/{roleId} | 3次响应完全一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R02-DI01 | 角色详情无隔离 | admin和formulist用户 | GET /api/roles/{roleId} | 两种角色看到相同的详情 |

---

### R03 POST /api/roles — 创建角色

**请求参数**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| name | string | 是 | minLength:1 |
| roleKey | string | 是 | minLength:1 |
| description | string | 否 | 无 |

**认证**：需要 Bearer Token + permission:write

**关联表**：`roles`

**业务逻辑**：检查 roleKey 唯一性，创建非系统角色（is_system=0）

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-P01 | 创建角色成功 | admin用户登录，roleKey不存在 | `{ name: "测试角色", roleKey: "test_role" }` | 201, `{ success: true, data: { id, name: "测试角色", roleKey: "test_role", isSystem: 0 }, message: "角色创建成功" }` |
| R03-P02 | 创建角色带描述 | admin用户登录 | `{ name: "带描述角色", roleKey: "desc_role", description: "这是一个测试角色" }` | 201, data.description === "这是一个测试角色" |
| R03-P03 | 新建角色为非系统角色 | admin用户登录 | `{ name: "自定义角色", roleKey: "custom" }` | 201, data.isSystem === 0 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-E01 | roleKey已存在 | 数据库已有 roleKey="admin" | `{ name: "重复", roleKey: "admin" }` | 409, `{ success: false, message: "角色标识已存在", code: "DUPLICATE_ENTRY" }` |
| R03-E02 | 数据库写入失败 | 模拟数据库异常 | `{ name: "测试", roleKey: "test" }` | 500, "创建角色失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-B01 | name恰好1字符 | admin用户登录 | `{ name: "A", roleKey: "a" }` | 201, 创建成功 |
| R03-B02 | name为空字符串 | admin用户登录 | `{ name: "", roleKey: "test" }` | 400, VALIDATION_ERROR |
| R03-B03 | roleKey为空字符串 | admin用户登录 | `{ name: "测试", roleKey: "" }` | 400, VALIDATION_ERROR |
| R03-B04 | name含SQL注入 | admin用户登录 | `{ name: "'; DROP TABLE roles;--", roleKey: "inject" }` | 201 或 500, 不执行SQL注入 |
| R03-B05 | roleKey含特殊字符 | admin用户登录 | `{ name: "测试", roleKey: "<script>alert(1)</script>" }` | 201, 原样存储 |
| R03-B06 | description为超长文本 | admin用户登录 | `{ name: "测试", roleKey: "longdesc", description: "a"*10000 }` | 201, 存储成功（无长度限制） |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-R01 | 无Token请求 | — | `{ name: "测试", roleKey: "test" }` | 401, UNAUTHORIZED |
| R03-R02 | Token过期 | 使用过期Token | `{ name: "测试", roleKey: "test" }` | 401, TOKEN_EXPIRED |
| R03-R03 | admin用户创建 | admin登录 | `{ name: "测试", roleKey: "admin_test" }` | 201, 创建成功 |
| R03-R04 | formulist用户无permission:write | formulist用户无权限 | `{ name: "测试", roleKey: "test" }` | 403, FORBIDDEN |
| R03-R05 | formulist用户有permission:write | formulist用户有权限 | `{ name: "测试", roleKey: "form_test" }` | 201, 创建成功 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-V01 | 缺少name | admin用户登录 | `{ roleKey: "test" }` | 400, VALIDATION_ERROR |
| R03-V02 | 缺少roleKey | admin用户登录 | `{ name: "测试" }` | 400, VALIDATION_ERROR |
| R03-V03 | name为null | admin用户登录 | `{ name: null, roleKey: "test" }` | 400, VALIDATION_ERROR |
| R03-V04 | roleKey为null | admin用户登录 | `{ name: "测试", roleKey: null }` | 400, VALIDATION_ERROR |
| R03-V05 | name为数字类型 | admin用户登录 | `{ name: 123, roleKey: "test" }` | 400, VALIDATION_ERROR |
| R03-V06 | 请求体为空 | admin用户登录 | `{}` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-S01 | 创建后可查询到 | 创建成功 | GET /api/roles/{newRoleId} | 200, 返回新创建的角色 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-DC01 | 创建后数据库记录正确 | admin用户登录 | `{ name: "DB测试", roleKey: "db_test" }` | roles 表新增记录, name="DB测试", role_key="db_test", is_system=0, created_at/updated_at 非空 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-I01 | 相同roleKey重复创建 | admin用户登录 | 两次 `{ name: "测试", roleKey: "idem" }` | 第一次201, 第二次409 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R03-DI01 | 角色创建无数据隔离 | 有权限的用户 | `{ name: "测试", roleKey: "test" }` | 角色为全局资源，所有用户可见 |

---

### R04 PUT /api/roles/:id — 更新角色

**请求参数**

| 字段 | 位置 | 类型 | 必填 | 校验规则 |
|------|------|------|------|----------|
| id | params | string | 是 | 角色ID |
| name | body | string | 是 | minLength:1 |
| description | body | string | 否 | 无 |

**认证**：需要 Bearer Token + permission:write

**关联表**：`roles`

**业务逻辑**：不允许修改系统管理员角色（is_system=1 且 role_key="admin"）

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-P01 | 更新自定义角色成功 | admin用户登录，角色is_system=0 | `{ name: "更新后名称" }` | 200, `{ success: true, data: { name: "更新后名称" }, message: "角色更新成功" }` |
| R04-P02 | 更新角色描述 | admin用户登录 | `{ name: "测试", description: "新描述" }` | 200, data.description === "新描述" |
| R04-P03 | 更新系统非admin角色 | 系统角色role_key!="admin" | `{ name: "修改名" }` | 200, 更新成功（仅admin角色被保护） |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-E01 | 角色不存在 | 数据库无该ID | `{ name: "测试" }` | 404, `{ success: false, message: "角色不存在", code: "NOT_FOUND" }` |
| R04-E02 | 修改系统管理员角色 | 角色is_system=1且role_key="admin" | `{ name: "修改admin" }` | 403, `{ success: false, message: "不允许修改系统管理员角色", code: "FORBIDDEN" }` |
| R04-E03 | 数据库更新失败 | 模拟数据库异常 | `{ name: "测试" }` | 500, "更新角色失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-B01 | name为空字符串 | admin用户登录 | `{ name: "" }` | 400, VALIDATION_ERROR |
| R04-B02 | name含特殊字符 | admin用户登录 | `{ name: "<script>alert(1)</script>" }` | 200, 原样存储 |
| R04-B03 | description为空字符串 | admin用户登录 | `{ name: "测试", description: "" }` | 200, description 为空 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-R01 | 无Token请求 | — | `{ name: "测试" }` | 401, UNAUTHORIZED |
| R04-R02 | formulist用户无permission:write | formulist用户无权限 | `{ name: "测试" }` | 403, FORBIDDEN |
| R04-R03 | admin用户更新 | admin登录 | `{ name: "测试" }` | 200, 更新成功 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-V01 | 缺少name | admin用户登录 | `{ description: "描述" }` | 400, VALIDATION_ERROR |
| R04-V02 | name为null | admin用户登录 | `{ name: null }` | 400, VALIDATION_ERROR |
| R04-V03 | name为数字类型 | admin用户登录 | `{ name: 123 }` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-S01 | 更新后再次更新 | 第一次更新成功 | 第二次 `{ name: "再次更新" }` | 200, 显示最新名称 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-DC01 | 更新后数据库记录正确 | admin用户登录 | `{ name: "DB验证" }` | roles 表对应记录 name="DB验证", updated_at 已更新 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-I01 | 相同请求重复提交 | admin用户登录 | 两次 `{ name: "幂等测试" }` | 两次均200, 数据库最终状态一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R04-DI01 | 角色更新无数据隔离 | 有权限的用户 | `{ name: "测试" }` | 角色为全局资源，更新后所有用户可见 |

---

### R05 DELETE /api/roles/:id — 删除角色

**请求参数**

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | params | string | 是 | 角色ID |

**认证**：需要 Bearer Token + permission:write

**关联表**：`roles`、`role_permissions`、`users`

**业务逻辑**：不允许删除系统角色（is_system=1）；角色下有用户时不允许删除；删除时同时清除 role_permissions 关联

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-P01 | 删除自定义角色成功 | admin用户登录，角色is_system=0，无关联用户 | DELETE /api/roles/{roleId} | 200, `{ success: true, data: null, message: "角色删除成功" }` |
| R05-P02 | 删除时清除权限关联 | 角色已关联权限 | DELETE /api/roles/{roleId} | 200, role_permissions 表中该角色的记录也被删除 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-E01 | 角色不存在 | 数据库无该ID | DELETE /api/roles/{nonExistId} | 404, `{ success: false, message: "角色不存在", code: "NOT_FOUND" }` |
| R05-E02 | 删除系统角色 | 角色is_system=1 | DELETE /api/roles/{systemRoleId} | 403, `{ success: false, message: "不允许删除系统角色", code: "FORBIDDEN" }` |
| R05-E03 | 角色下有用户 | 角色关联了用户 | DELETE /api/roles/{roleIdWithUsers} | 400, `{ success: false, message: "该角色下还有用户，无法删除", code: "ROLE_HAS_USERS" }` |
| R05-E04 | 数据库删除失败 | 模拟数据库异常 | DELETE /api/roles/{roleId} | 500, "删除角色失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-B01 | 删除admin系统角色 | admin角色is_system=1, role_key="admin" | DELETE /api/roles/{adminRoleId} | 403, FORBIDDEN |
| R05-B02 | 删除formulist系统角色 | formulist角色is_system=1 | DELETE /api/roles/{formulistRoleId} | 403, FORBIDDEN |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-R01 | 无Token请求 | — | DELETE /api/roles/{roleId} | 401, UNAUTHORIZED |
| R05-R02 | formulist用户无permission:write | formulist用户无权限 | DELETE /api/roles/{roleId} | 403, FORBIDDEN |
| R05-R03 | admin用户删除 | admin登录 | DELETE /api/roles/{roleId} | 200, 删除成功 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-V01 | id为无效格式 | admin用户登录 | DELETE /api/roles/invalid-id | 404, "角色不存在" |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-S01 | 删除后查询返回404 | 删除成功 | GET /api/roles/{deletedRoleId} | 404, "角色不存在" |
| R05-S02 | 删除后重新创建同名角色 | 删除成功 | POST `{ name: "同名", roleKey: "same_key" }` | 201, 创建成功（roleKey已释放） |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-DC01 | 删除后数据库记录已清除 | admin用户登录 | DELETE /api/roles/{roleId} | roles 表无该记录, role_permissions 表无该角色的关联记录 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-I01 | 重复删除同一角色 | 第一次删除成功 | 第二次 DELETE /api/roles/{roleId} | 404, "角色不存在" |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R05-DI01 | 角色删除无数据隔离 | 有权限的用户 | DELETE /api/roles/{roleId} | 角色为全局资源，删除后所有用户不可见 |

---

### R06 GET /api/roles/:id/permissions — 获取角色权限

**请求参数**

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | params | string | 是 | 角色ID |

**认证**：需要 Bearer Token

**关联表**：`role_permissions`、`permissions`

**业务逻辑**：返回角色关联的权限列表，按 sort_order 排序

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-P01 | 获取角色权限成功 | 角色已关联权限 | GET /api/roles/{roleId}/permissions | 200, `{ success: true, data: [{ id, permissionKey, label, module, action }] }` |
| R06-P02 | 无权限的角色返回空数组 | 角色未关联权限 | GET /api/roles/{roleId}/permissions | 200, `{ success: true, data: [] }` |
| R06-P03 | 权限按sort_order排序 | 角色关联多个权限 | GET /api/roles/{roleId}/permissions | 权限按 sort_order 升序排列 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-E01 | 数据库查询异常 | 模拟数据库异常 | GET /api/roles/{roleId}/permissions | 500, "获取角色权限失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-B01 | 角色ID不存在 | 数据库无该ID | GET /api/roles/{nonExistId}/permissions | 200, data: []（当前实现不校验角色存在性） |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-R01 | 无Token请求 | — | GET /api/roles/{roleId}/permissions | 401, UNAUTHORIZED |
| R06-R02 | Token过期 | 使用过期Token | GET /api/roles/{roleId}/permissions | 401, TOKEN_EXPIRED |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-V01 | id为无效格式 | 已登录用户 | GET /api/roles/invalid/permissions | 200, data: [] |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-S01 | 更新权限后获取最新列表 | 先更新角色权限 | GET /api/roles/{roleId}/permissions | 返回更新后的权限列表 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-DC01 | 权限列表与数据库一致 | 角色已关联权限 | GET /api/roles/{roleId}/permissions | 返回的权限与 role_permissions + permissions 表关联查询一致 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-I01 | 多次请求结果一致 | 已登录用户 | 连续3次 GET /api/roles/{roleId}/permissions | 3次响应完全一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R06-DI01 | 角色权限无隔离 | admin和formulist用户 | GET /api/roles/{roleId}/permissions | 两种角色看到相同的权限列表 |

---

### R07 PUT /api/roles/:id/permissions — 更新角色权限

**请求参数**

| 字段 | 位置 | 类型 | 必填 | 校验规则 |
|------|------|------|------|----------|
| id | params | string | 是 | 角色ID |
| permissionIds | body | array | 是 | 权限ID列表 |

**认证**：需要 Bearer Token + permission:write

**关联表**：`role_permissions`

**业务逻辑**：先删除角色所有权限，再批量插入新权限（全量替换）

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-P01 | 更新角色权限成功 | admin用户登录 | `{ permissionIds: ["perm1", "perm2"] }` | 200, `{ success: true, data: null, message: "权限分配成功" }` |
| R07-P02 | 清空角色权限 | admin用户登录 | `{ permissionIds: [] }` | 200, 角色无任何权限 |
| R07-P03 | 全量替换权限 | 角色已有权限A、B | `{ permissionIds: ["permC", "permD"] }` | 200, 权限变为C、D，A、B被移除 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-E01 | 角色不存在 | 数据库无该ID | `{ permissionIds: ["perm1"] }` | 404, `{ success: false, message: "角色不存在", code: "NOT_FOUND" }` |
| R07-E02 | 数据库写入失败 | 模拟数据库异常 | `{ permissionIds: ["perm1"] }` | 500, "权限分配失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-B01 | permissionIds为空数组 | admin用户登录 | `{ permissionIds: [] }` | 200, 清空权限 |
| R07-B02 | permissionIds含不存在的ID | admin用户登录 | `{ permissionIds: ["nonexist_perm"] }` | 200, 插入可能成功（无外键约束）或数据库报错 |
| R07-B03 | permissionIds含大量ID | admin用户登录 | `{ permissionIds: ["id1","id2",...,"id100"] }` | 200, 批量插入成功 |
| R07-B04 | permissionIds含重复ID | admin用户登录 | `{ permissionIds: ["perm1", "perm1"] }` | 可能500（PRIMARY KEY冲突）或自动去重 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-R01 | 无Token请求 | — | `{ permissionIds: ["perm1"] }` | 401, UNAUTHORIZED |
| R07-R02 | formulist用户无permission:write | formulist用户无权限 | `{ permissionIds: ["perm1"] }` | 403, FORBIDDEN |
| R07-R03 | admin用户更新 | admin登录 | `{ permissionIds: ["perm1"] }` | 200, 更新成功 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-V01 | 缺少permissionIds | admin用户登录 | `{}` | 400, VALIDATION_ERROR |
| R07-V02 | permissionIds为null | admin用户登录 | `{ permissionIds: null }` | 400, VALIDATION_ERROR |
| R07-V03 | permissionIds为字符串 | admin用户登录 | `{ permissionIds: "perm1" }` | 400, VALIDATION_ERROR |
| R07-V04 | permissionIds为数字 | admin用户登录 | `{ permissionIds: 123 }` | 400, VALIDATION_ERROR |
| R07-V05 | 请求体为空 | admin用户登录 | `{}` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-S01 | 更新权限后再更新 | 第一次更新成功 | 第二次 `{ permissionIds: ["perm3"] }` | 200, 权限被替换为最新值 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-DC01 | 更新后数据库权限关联正确 | admin用户登录 | `{ permissionIds: ["perm1", "perm2"] }` | role_permissions 表仅包含 (roleId, perm1) 和 (roleId, perm2) 两条记录 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-I01 | 相同请求重复提交 | admin用户登录 | 两次 `{ permissionIds: ["perm1"] }` | 两次均200, 数据库最终状态一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| R07-DI01 | 角色权限更新无隔离 | 有权限的用户 | `{ permissionIds: ["perm1"] }` | 角色权限为全局资源，更新后所有用户可见 |

---

## 三、特殊场景测试

### X-MD 请求方法限制

| 用例ID | 用例名称 | 请求方法 | 路径 | 预期结果 |
|--------|---------|----------|------|----------|
| X-MD01 | 用POST访问角色列表 | POST | /api/roles | 404 或 405 |
| X-MD02 | 用POST访问角色详情 | POST | /api/roles/:id | 404 或 405 |
| X-MD03 | 用GET访问创建角色 | GET | /api/roles (创建) | 路由冲突，返回列表而非创建 |
| X-MD04 | 用DELETE访问更新角色 | DELETE | /api/roles/:id | 执行删除而非更新 |
| X-MD05 | 用POST访问更新角色权限 | POST | /api/roles/:id/permissions | 404 或 405 |

### X-SE 错误信息安全

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-SE01 | 500错误不泄露堆栈 | 模拟数据库异常 | 响应不包含 stack trace、SQL语句 |
| X-SE02 | 500错误不泄露数据库表名 | 模拟数据库异常 | 响应不包含 roles/role_permissions 等表名 |
| X-SE03 | 403错误不泄露权限细节 | 无权限用户访问 | 仅返回"Insufficient permissions"，不泄露系统权限结构 |

### X-RF 响应格式一致性

| 用例ID | 用例名称 | 预期结果 |
|--------|---------|----------|
| X-RF01 | 成功响应包含 success:true 和 data | 所有成功响应结构为 `{ success: true, data: {...} }` |
| X-RF02 | 201响应包含 message | 创建成功响应包含 message 字段 |
| X-RF03 | 404错误包含 code:"NOT_FOUND" | `{ success: false, message: "...", code: "NOT_FOUND" }` |
| X-RF04 | 409错误包含 code:"DUPLICATE_ENTRY" | `{ success: false, message: "...", code: "DUPLICATE_ENTRY" }` |
| X-RF05 | 403错误包含 code:"FORBIDDEN" | `{ success: false, message: "...", code: "FORBIDDEN" }` |

### X-CT Content-Type校验

| 用例ID | 用例名称 | 请求Content-Type | 预期结果 |
|--------|---------|------------------|----------|
| X-CT01 | 创建角色要求JSON | application/json | 正常处理 |
| X-CT02 | 更新角色要求JSON | application/json | 正常处理 |

### X-AL 审计日志

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-AL01 | 创建角色审计 | admin创建角色 | 应记录操作人、角色名、时间（建议补充） |
| X-AL02 | 删除角色审计 | admin删除角色 | 应记录操作人、角色名、时间（建议补充） |
| X-AL03 | 权限变更审计 | admin更新角色权限 | 应记录操作人、角色、权限变更详情（建议补充） |

---

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| R01 GET / | 4 | 1 | 1 | 5 | 1 | 2 | 1 | 1 | 1 | 17 |
| R02 GET /:id | 3 | 2 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 14 |
| R03 POST / | 3 | 2 | 6 | 5 | 6 | 1 | 1 | 1 | 1 | 26 |
| R04 PUT /:id | 3 | 3 | 3 | 3 | 3 | 1 | 1 | 1 | 1 | 19 |
| R05 DELETE /:id | 2 | 4 | 2 | 3 | 1 | 2 | 1 | 1 | 1 | 17 |
| R06 GET /:id/permissions | 3 | 1 | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 12 |
| R07 PUT /:id/permissions | 3 | 2 | 4 | 3 | 5 | 1 | 1 | 1 | 1 | 21 |
| **合计** | **21** | **15** | **19** | **23** | **18** | **9** | **7** | **7** | **7** | **126** |

> 注：特殊场景测试 20 条未计入上表维度统计。
