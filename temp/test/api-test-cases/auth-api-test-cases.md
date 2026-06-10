# 认证（Auth）接口测试用例文档

## 文档信息

| 项 | 值 |
|----|-----|
| 文档ID | ATC-AUTH-20260607-001 |
| 路由文件 | backend/src/routes/auth.ts |
| 控制器文件 | backend/src/controllers/authController.ts |
| 端点数 | 7 |
| 测试用例数 | 89 |

---

## 一、接口清单

| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| A01 | POST | /api/auth/register | 否 | 用户注册 |
| A02 | POST | /api/auth/login | 否 | 用户登录 |
| A03 | GET | /api/auth/me | 是 | 获取当前用户信息 |
| A04 | PUT | /api/auth/profile | 是 | 更新个人资料 |
| A05 | PUT | /api/auth/password | 是 | 修改密码 |
| A06 | GET | /api/auth/preferences | 是 | 获取偏好设置 |
| A07 | PUT | /api/auth/preferences | 是 | 更新偏好设置 |

---

## 二、测试用例

### A01 POST /api/auth/register — 用户注册

**请求参数**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| username | string | 是 | minLength:2, maxLength:50 |
| password | string | 是 | minLength:6 |

**关联表**：`users`

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-P01 | 标准注册成功 | 数据库无同名用户 | `{ username: "testuser01", password: "123456" }` | 201, `{ success: true, data: { user: { id, username, role:"formulist", displayName, email, phone, createdAt }, token } }` |
| A01-P02 | 注册后自动生成昵称和邮箱 | 数据库无同名用户 | `{ username: "newuser02", password: "abcdef" }` | 201, user.displayName 非空, user.email 包含 @, user.phone 为11位数字 |
| A01-P03 | 注册默认角色为 formulist | 数据库无同名用户 | `{ username: "rolecheck", password: "123456" }` | 201, `user.role === "formulist"` |
| A01-P04 | 注册返回有效JWT Token | 数据库无同名用户 | `{ username: "tokencheck", password: "123456" }` | 201, token 可被 jwt.verify 解码，包含 userId/username/role |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-E01 | 用户名已存在 | 数据库已有 username="existuser" | `{ username: "existuser", password: "123456" }` | 409, `{ success: false, message: "用户名已存在" }` |
| A01-E02 | 数据库写入失败 | 模拟数据库异常 | `{ username: "dberror", password: "123456" }` | 500, `{ success: false, message: "注册失败" }` |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-B01 | 用户名恰好2字符 | — | `{ username: "ab", password: "123456" }` | 201, 注册成功 |
| A01-B02 | 用户名恰好50字符 | — | `{ username: "a"*50, password: "123456" }` | 201, 注册成功 |
| A01-B03 | 密码恰好6字符 | — | `{ username: "minpwd", password: "123456" }` | 201, 注册成功 |
| A01-B04 | 用户名1字符（低于最小长度） | — | `{ username: "a", password: "123456" }` | 400, VALIDATION_ERROR |
| A01-B05 | 用户名51字符（超过最大长度） | — | `{ username: "a"*51, password: "123456" }` | 400, VALIDATION_ERROR |
| A01-B06 | 密码5字符（低于最小长度） | — | `{ username: "shortpwd", password: "12345" }` | 400, VALIDATION_ERROR |
| A01-B07 | 用户名包含SQL注入 | — | `{ username: "admin'; DROP TABLE users;--", password: "123456" }` | 201 或 409, 不执行SQL注入，数据库不受影响 |
| A01-B08 | 用户名包含特殊字符 | — | `{ username: "<script>alert(1)</script>", password: "123456" }` | 201 或 400, 不执行XSS |
| A01-B09 | 用户名为纯空格 | — | `{ username: "   ", password: "123456" }` | 400, VALIDATION_ERROR（trim后为空） |
| A01-B10 | 密码为纯空格 | — | `{ username: "spacepwd", password: "      " }` | 400, VALIDATION_ERROR（长度不足6有效字符） |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-R01 | 注册无需认证 | 无Token | `{ username: "noauth", password: "123456" }` | 201, 注册成功 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-V01 | 缺少username | — | `{ password: "123456" }` | 400, VALIDATION_ERROR |
| A01-V02 | 缺少password | — | `{ username: "nopwd" }` | 400, VALIDATION_ERROR |
| A01-V03 | username为null | — | `{ username: null, password: "123456" }` | 400, VALIDATION_ERROR |
| A01-V04 | password为null | — | `{ username: "nullpwd", password: null }` | 400, VALIDATION_ERROR |
| A01-V05 | username为数字类型 | — | `{ username: 12345, password: "123456" }` | 400, VALIDATION_ERROR |
| A01-V06 | password为数字类型 | — | `{ username: "numtype", password: 123456 }` | 400, VALIDATION_ERROR |
| A01-V07 | 请求体为空 | — | `{}` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-S01 | 重复注册同一用户名 | 第一次注册成功后 | `{ username: "dupuser", password: "123456" }` | 第二次 409, "用户名已存在" |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-DC01 | 注册后数据库记录正确 | — | `{ username: "dbcheck", password: "123456" }` | users 表新增记录, username="dbcheck", role="formulist", password 为 bcrypt 哈希, created_at/updated_at 非空 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-I01 | 重复提交相同注册请求 | — | `{ username: "idemuser", password: "123456" }` | 第一次201, 第二次409, 数据库仅一条记录 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A01-DI01 | 注册不涉及数据隔离 | — | — | 注册为公开接口，无数据隔离问题 |

---

### A02 POST /api/auth/login — 用户登录

**请求参数**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| username | string | 是 | 无validateBody校验 |
| password | string | 是 | 无validateBody校验 |

**关联表**：`users`

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-P01 | 标准登录成功 | 数据库已有用户 testuser/123456 | `{ username: "testuser", password: "123456" }` | 200, `{ success: true, data: { user: { id, username, role, displayName, avatar, bio, email, phone, createdAt }, token } }` |
| A02-P02 | admin角色登录 | 数据库已有admin用户 | `{ username: "admin", password: "admin123" }` | 200, `user.role === "admin"`, token 中 permissions 包含 "*" |
| A02-P03 | formulist角色登录 | 数据库已有formulist用户 | `{ username: "formulist", password: "123456" }` | 200, `user.role === "formulist"` |
| A02-P04 | 登录响应不含密码字段 | 数据库已有用户 | `{ username: "testuser", password: "123456" }` | 200, 响应体中不包含 password 字段 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-E01 | 用户名不存在 | 数据库无该用户 | `{ username: "nouser", password: "123456" }` | 401, `{ success: false, message: "用户名或密码错误" }` |
| A02-E02 | 密码错误 | 数据库已有用户 testuser | `{ username: "testuser", password: "wrongpwd" }` | 401, `{ success: false, message: "用户名或密码错误" }` |
| A02-E03 | 数据库查询异常 | 模拟数据库异常 | `{ username: "testuser", password: "123456" }` | 500, `{ success: false, message: "登录失败" }` |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-B01 | 用户名为空字符串 | — | `{ username: "", password: "123456" }` | 401, "用户名或密码错误" |
| A02-B02 | 密码为空字符串 | — | `{ username: "testuser", password: "" }` | 401, "用户名或密码错误" |
| A02-B03 | 用户名含SQL注入 | — | `{ username: "' OR 1=1 --", password: "123456" }` | 401, 不执行注入 |
| A02-B04 | 密码含特殊字符 | 数据库已有用户，密码含特殊字符 | `{ username: "specialpwd", password: "P@$$w0rd!" }` | 200, 登录成功 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-R01 | 登录无需认证 | 无Token | `{ username: "testuser", password: "123456" }` | 200, 登录成功 |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-V01 | 缺少username | — | `{ password: "123456" }` | 401, "用户名或密码错误" |
| A02-V02 | 缺少password | — | `{ username: "testuser" }` | 401, "用户名或密码错误" |
| A02-V03 | 请求体为空 | — | `{}` | 401, "用户名或密码错误" |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-S01 | 已禁用用户登录 | 数据库已有用户 is_active=0 | `{ username: "disabled", password: "123456" }` | 200（当前实现未检查 is_active），或应返回403 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-DC01 | 登录返回用户信息与数据库一致 | 数据库已有用户 | `{ username: "testuser", password: "123456" }` | 响应中 user.id/user.username/user.role 与数据库记录一致 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-I01 | 多次登录返回不同Token | 数据库已有用户 | 连续3次相同请求 | 每次200, token不同（JWT含时间戳），用户信息一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A02-DI01 | 登录不涉及数据隔离 | — | — | 登录为公开接口，无数据隔离问题 |

---

### A03 GET /api/auth/me — 获取当前用户信息

**请求参数**：无（通过Token识别用户）

**认证**：需要 Bearer Token

**关联表**：`users`

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-P01 | 获取当前用户信息成功 | 已登录用户 | GET /api/auth/me, Header: Authorization: Bearer {token} | 200, `{ success: true, data: { id, username, role, displayName, avatar, bio, email, phone, createdAt } }` |
| A03-P02 | 响应不含密码字段 | 已登录用户 | GET /api/auth/me | 200, 响应体中不包含 password 字段 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-E01 | Token对应用户已被删除 | 用户注册后从数据库删除 | GET /api/auth/me | 404, `{ success: false, message: "用户不存在" }` |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-B01 | Token即将过期（6天23小时） | Token有效期7天，已过6天23小时 | GET /api/auth/me | 200, 正常返回用户信息 |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-R01 | 无Token请求 | — | GET /api/auth/me, 无Authorization头 | 401, UNAUTHORIZED |
| A03-R02 | Token格式错误 | — | Authorization: Bearer invalidtoken | 401, INVALID_TOKEN |
| A03-R03 | Token已过期 | 使用已过期的Token | GET /api/auth/me | 401, TOKEN_EXPIRED |
| A03-R04 | admin用户获取信息 | admin用户登录 | GET /api/auth/me | 200, role="admin" |
| A03-R05 | formulist用户获取信息 | formulist用户登录 | GET /api/auth/me | 200, role="formulist" |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-V01 | Authorization头缺少Bearer前缀 | — | Authorization: {token} | 401, UNAUTHORIZED |
| A03-V02 | Authorization头为空字符串 | — | Authorization: Bearer  | 401, INVALID_TOKEN |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-S01 | 修改资料后获取最新信息 | 先调用 PUT /profile 修改资料 | GET /api/auth/me | 200, 返回更新后的资料 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-DC01 | 返回信息与数据库一致 | 已登录用户 | GET /api/auth/me | 响应字段与 users 表记录一致（camelCase） |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-I01 | 多次请求结果一致 | 已登录用户 | 连续3次 GET /api/auth/me | 3次响应完全一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A03-DI01 | 只返回自己的信息 | 已登录用户A | GET /api/auth/me (用户A的Token) | 仅返回用户A的信息，不包含其他用户 |

---

### A04 PUT /api/auth/profile — 更新个人资料

**请求参数**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| email | string | 否 | 邮箱格式校验 |
| phone | string | 否 | minLength:11, maxLength:11, 手机号格式 /^1[3-9]\d{9}$/ |
| display_name | string | 否 | maxLength:50 |
| bio | string | 否 | maxLength:500 |

**认证**：需要 Bearer Token

**关联表**：`users`

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-P01 | 更新昵称成功 | 已登录用户 | `{ display_name: "新昵称" }` | 200, `{ success: true, data: { displayName: "新昵称", ... } }` |
| A04-P02 | 更新邮箱成功 | 已登录用户 | `{ email: "new@example.com" }` | 200, data.email === "new@example.com" |
| A04-P03 | 更新手机号成功 | 已登录用户 | `{ phone: "13800138000" }` | 200, data.phone === "13800138000" |
| A04-P04 | 更新简介成功 | 已登录用户 | `{ bio: "这是我的简介" }` | 200, data.bio === "这是我的简介" |
| A04-P05 | 同时更新多个字段 | 已登录用户 | `{ display_name: "新名", email: "a@b.com", phone: "13900139000", bio: "简介" }` | 200, 所有字段更新成功 |
| A04-P06 | 响应不含密码字段 | 已登录用户 | `{ display_name: "测试" }` | 200, 响应体中不包含 password 字段 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-E01 | 邮箱已被其他用户绑定 | 数据库已有其他用户使用该邮箱 | `{ email: "taken@example.com" }` | 409, "该邮箱已被其他账号绑定" |
| A04-E02 | 手机号已被其他用户绑定 | 数据库已有其他用户使用该手机号 | `{ phone: "13800138000" }` | 409, "该手机号已被其他账号绑定" |
| A04-E03 | 数据库更新失败 | 模拟数据库异常 | `{ display_name: "测试" }` | 500, "更新资料失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-B01 | display_name恰好50字符 | 已登录用户 | `{ display_name: "a"*50 }` | 200, 更新成功 |
| A04-B02 | display_name超过50字符 | 已登录用户 | `{ display_name: "a"*51 }` | 400, VALIDATION_ERROR |
| A04-B03 | bio恰好500字符 | 已登录用户 | `{ bio: "a"*500 }` | 200, 更新成功 |
| A04-B04 | bio超过500字符 | 已登录用户 | `{ bio: "a"*501 }` | 400, VALIDATION_ERROR |
| A04-B05 | phone为10位数字 | 已登录用户 | `{ phone: "1380013800" }` | 400, VALIDATION_ERROR |
| A04-B06 | phone为12位数字 | 已登录用户 | `{ phone: "138001380000" }` | 400, VALIDATION_ERROR |
| A04-B07 | email格式不合法 | 已登录用户 | `{ email: "notanemail" }` | 400, "邮箱格式不正确" |
| A04-B08 | phone格式不合法（非1开头） | 已登录用户 | `{ phone: "23800138000" }` | 400, "手机号格式不正确" |
| A04-B09 | 保留自己的邮箱不变 | 已登录用户，当前邮箱为 a@b.com | `{ email: "a@b.com" }` | 200, 更新成功（不触发唯一性冲突） |
| A04-B10 | 保留自己的手机号不变 | 已登录用户，当前手机为13800138000 | `{ phone: "13800138000" }` | 200, 更新成功（不触发唯一性冲突） |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-R01 | 无Token请求 | — | `{ display_name: "测试" }` | 401, UNAUTHORIZED |
| A04-R02 | Token过期 | 使用过期Token | `{ display_name: "测试" }` | 401, TOKEN_EXPIRED |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-V01 | 请求体为空对象 | 已登录用户 | `{}` | 200, 字段置为null |
| A04-V02 | email类型为数字 | 已登录用户 | `{ email: 12345 }` | 400, VALIDATION_ERROR |
| A04-V03 | phone类型为数字 | 已登录用户 | `{ phone: 13800138000 }` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-S01 | 修改后再次修改 | 第一次修改成功 | 第二次 `{ display_name: "再次修改" }` | 200, 显示最新值 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-DC01 | 更新后数据库记录正确 | 已登录用户 | `{ display_name: "DB测试" }` | users 表对应记录 display_name="DB测试", updated_at 已更新 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-I01 | 相同请求重复提交 | 已登录用户 | 两次 `{ display_name: "幂等测试" }` | 两次均200, 数据库最终状态一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A04-DI01 | 只能修改自己的资料 | 用户A登录 | `{ display_name: "A的昵称" }` | 仅修改用户A的记录，不影响用户B |

---

### A05 PUT /api/auth/password — 修改密码

**请求参数**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| oldPassword | string | 是 | 必填 |
| newPassword | string | 是 | minLength:6 |

**认证**：需要 Bearer Token

**关联表**：`users`

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-P01 | 修改密码成功 | 已登录用户，当前密码为"123456" | `{ oldPassword: "123456", newPassword: "654321" }` | 200, `{ success: true, data: null, message: "密码修改成功" }` |
| A05-P02 | 修改密码后可用新密码登录 | 密码已修改为"654321" | 登录请求 `{ username, password: "654321" }` | 200, 登录成功 |
| A05-P03 | 修改密码后旧密码不可用 | 密码已从"123456"改为"654321" | 登录请求 `{ username, password: "123456" }` | 401, "用户名或密码错误" |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-E01 | 旧密码错误 | 当前密码为"123456" | `{ oldPassword: "wrongpwd", newPassword: "654321" }` | 400, "当前密码不正确" |
| A05-E02 | 数据库更新失败 | 模拟数据库异常 | `{ oldPassword: "123456", newPassword: "654321" }` | 500, "密码修改失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-B01 | newPassword恰好6字符 | 当前密码为"123456" | `{ oldPassword: "123456", newPassword: "abcdef" }` | 200, 修改成功 |
| A05-B02 | newPassword为5字符 | 当前密码为"123456" | `{ oldPassword: "123456", newPassword: "abcde" }` | 400, "新密码长度至少6个字符" |
| A05-B03 | newPassword含特殊字符 | 当前密码为"123456" | `{ oldPassword: "123456", newPassword: "P@$$w0rd!" }` | 200, 修改成功 |
| A05-B04 | oldPassword与newPassword相同 | 当前密码为"123456" | `{ oldPassword: "123456", newPassword: "123456" }` | 200, 允许（当前实现未禁止） |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-R01 | 无Token请求 | — | `{ oldPassword: "123456", newPassword: "654321" }` | 401, UNAUTHORIZED |
| A05-R02 | Token过期 | 使用过期Token | `{ oldPassword: "123456", newPassword: "654321" }` | 401, TOKEN_EXPIRED |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-V01 | 缺少oldPassword | 已登录用户 | `{ newPassword: "654321" }` | 400, VALIDATION_ERROR |
| A05-V02 | 缺少newPassword | 已登录用户 | `{ oldPassword: "123456" }` | 400, VALIDATION_ERROR |
| A05-V03 | oldPassword为空字符串 | 已登录用户 | `{ oldPassword: "", newPassword: "654321" }` | 400, "请输入当前密码和新密码" |
| A05-V04 | newPassword为空字符串 | 已登录用户 | `{ oldPassword: "123456", newPassword: "" }` | 400, "新密码长度至少6个字符" |
| A05-V05 | 请求体为空 | 已登录用户 | `{}` | 400, VALIDATION_ERROR |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-S01 | 连续修改密码两次 | 第一次修改成功 | 第二次 `{ oldPassword: "654321", newPassword: "111111" }` | 200, 第二次也成功 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-DC01 | 修改后数据库密码为bcrypt哈希 | 已登录用户 | `{ oldPassword: "123456", newPassword: "654321" }` | users 表 password 字段为 bcrypt 哈希, bcrypt.compare("654321", hash) === true |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-I01 | 相同修改密码请求重复提交 | 当前密码为"123456" | 两次 `{ oldPassword: "123456", newPassword: "654321" }` | 第一次200, 第二次400（旧密码已变） |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A05-DI01 | 只能修改自己的密码 | 用户A登录 | `{ oldPassword: "...", newPassword: "..." }` | 仅修改用户A的密码，不影响用户B |

---

### A06 GET /api/auth/preferences — 获取偏好设置

**请求参数**：无（通过Token识别用户）

**认证**：需要 Bearer Token

**关联表**：`user_preferences`

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-P01 | 获取已有偏好设置 | 用户已有偏好记录 | GET /api/auth/preferences | 200, `{ success: true, data: { ...偏好对象 } }` |
| A06-P02 | 无偏好记录时返回空对象 | 用户无偏好记录 | GET /api/auth/preferences | 200, `{ success: true, data: {} }` |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-E01 | 数据库查询异常 | 模拟数据库异常 | GET /api/auth/preferences | 500, "获取偏好设置失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-B01 | 偏好数据为空JSON | 偏好记录 preferences_json="{}" | GET /api/auth/preferences | 200, data: {} |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-R01 | 无Token请求 | — | GET /api/auth/preferences | 401, UNAUTHORIZED |
| A06-R02 | Token过期 | 使用过期Token | GET /api/auth/preferences | 401, TOKEN_EXPIRED |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-V01 | 无请求参数 | 已登录用户 | GET /api/auth/preferences | 200, 正常返回 |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-S01 | 更新偏好后获取最新值 | 先调用 PUT /preferences | GET /api/auth/preferences | 200, 返回更新后的偏好 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-DC01 | 返回数据与数据库一致 | 用户已有偏好记录 | GET /api/auth/preferences | 响应 data 与 user_preferences 表 preferences_json 解析后一致 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-I01 | 多次请求结果一致 | 已登录用户 | 连续3次 GET /api/auth/preferences | 3次响应完全一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A06-DI01 | 只返回自己的偏好 | 用户A登录 | GET /api/auth/preferences | 仅返回用户A的偏好，不包含用户B |

---

### A07 PUT /api/auth/preferences — 更新偏好设置

**请求参数**

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| preferences | object | 是 | 必须为对象 |

**认证**：需要 Bearer Token

**关联表**：`user_preferences`

#### 正向流程 (P)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-P01 | 更新偏好设置成功 | 已登录用户 | `{ preferences: { theme: "dark", language: "zh-CN" } }` | 200, `{ success: true, data: { theme: "dark", language: "zh-CN" }, message: "偏好设置已保存" }` |
| A07-P02 | 首次设置偏好 | 用户无偏好记录 | `{ preferences: { theme: "light" } }` | 200, 偏好创建成功 |
| A07-P03 | 覆盖更新偏好 | 用户已有偏好 | `{ preferences: { theme: "dark" } }` | 200, 旧偏好被完全覆盖 |

#### 异常流程 (E)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-E01 | 数据库写入失败 | 模拟数据库异常 | `{ preferences: { theme: "dark" } }` | 500, "保存偏好设置失败" |

#### 边界条件 (B)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-B01 | preferences为空对象 | 已登录用户 | `{ preferences: {} }` | 200, 保存成功 |
| A07-B02 | preferences包含嵌套对象 | 已登录用户 | `{ preferences: { ui: { sidebar: true } } }` | 200, 保存成功 |
| A07-B03 | preferences值含特殊字符 | 已登录用户 | `{ preferences: { note: "<script>alert(1)</script>" } }` | 200, 原样存储（前端需XSS防护） |

#### 权限认证 (R)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-R01 | 无Token请求 | — | `{ preferences: { theme: "dark" } }` | 401, UNAUTHORIZED |
| A07-R02 | Token过期 | 使用过期Token | `{ preferences: { theme: "dark" } }` | 401, TOKEN_EXPIRED |

#### 参数校验 (V)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-V01 | 缺少preferences字段 | 已登录用户 | `{}` | 400, VALIDATION_ERROR |
| A07-V02 | preferences为null | 已登录用户 | `{ preferences: null }` | 400, "偏好数据格式不正确" |
| A07-V03 | preferences为字符串 | 已登录用户 | `{ preferences: "dark" }` | 400, VALIDATION_ERROR |
| A07-V04 | preferences为数组 | 已登录用户 | `{ preferences: [1,2,3] }` | 400, VALIDATION_ERROR |
| A07-V05 | preferences为数字 | 已登录用户 | `{ preferences: 123 }` | 400, "偏好数据格式不正确" |

#### 状态流转 (S)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-S01 | 从无到有创建偏好 | 用户无偏好记录 | `{ preferences: { theme: "dark" } }` | 200, 创建成功 |
| A07-S02 | 从有到覆盖更新 | 用户已有偏好 | `{ preferences: { newKey: "newVal" } }` | 200, 旧偏好被覆盖 |

#### 数据一致性 (DC)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-DC01 | 更新后数据库记录正确 | 已登录用户 | `{ preferences: { theme: "dark" } }` | user_preferences 表 preferences_json 为 '{"theme":"dark"}', updated_at 已更新 |

#### 幂等性 (I)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-I01 | 相同请求重复提交 | 已登录用户 | 两次 `{ preferences: { theme: "dark" } }` | 两次均200, 数据库最终状态一致 |

#### 数据隔离 (DI)

| 用例ID | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|---------|----------|----------|----------|
| A07-DI01 | 只能修改自己的偏好 | 用户A登录 | `{ preferences: { theme: "dark" } }` | 仅修改用户A的偏好，不影响用户B |

---

## 三、特殊场景测试

### X-MD 请求方法限制

| 用例ID | 用例名称 | 请求方法 | 路径 | 预期结果 |
|--------|---------|----------|------|----------|
| X-MD01 | 用GET访问注册接口 | GET | /api/auth/register | 404 或 405 |
| X-MD02 | 用GET访问登录接口 | GET | /api/auth/login | 404 或 405 |
| X-MD03 | 用POST访问获取用户信息 | POST | /api/auth/me | 404 或 405 |
| X-MD04 | 用POST访问更新资料 | POST | /api/auth/profile | 404 或 405 |
| X-MD05 | 用POST访问修改密码 | POST | /api/auth/password | 404 或 405 |
| X-MD06 | 用POST访问获取偏好 | POST | /api/auth/preferences | 404 或 405 |
| X-MD07 | 用GET访问更新偏好 | GET | /api/auth/preferences | 404 或 405 |

### X-SE 错误信息安全

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-SE01 | 注册500错误不泄露堆栈 | 模拟数据库异常 | 响应不包含 stack trace、SQL语句、数据库表名 |
| X-SE02 | 登录500错误不泄露堆栈 | 模拟数据库异常 | 响应不包含 stack trace、SQL语句 |
| X-SE03 | 登录响应不含密码哈希 | 正常登录 | 响应体中不包含 password 字段（含哈希值） |
| X-SE04 | 获取用户信息不含密码 | 正常请求 | 响应体中不包含 password 字段 |
| X-SE05 | 更新资料响应不含密码 | 正常请求 | 响应体中不包含 password 字段 |
| X-SE06 | 修改密码响应不含新旧密码 | 正常请求 | 响应体中不包含 oldPassword/newPassword 值 |

### X-RF 响应格式一致性

| 用例ID | 用例名称 | 预期结果 |
|--------|---------|----------|
| X-RF01 | 成功响应包含 success:true 和 data | 所有成功响应结构为 `{ success: true, data: {...} }` |
| X-RF02 | 错误响应包含 success:false 和 message | 所有错误响应结构为 `{ success: false, message: "..." }` |
| X-RF03 | 401错误响应包含 error.code | `{ success: false, error: { message, code: "UNAUTHORIZED"/"TOKEN_EXPIRED"/"INVALID_TOKEN" } }` |
| X-RF04 | 400错误响应包含 error.code | `{ success: false, error: { message, code: "VALIDATION_ERROR" } }` |
| X-RF05 | 409错误响应格式一致 | `{ success: false, message: "..." }` |

### X-CT Content-Type校验

| 用例ID | 用例名称 | 请求Content-Type | 预期结果 |
|--------|---------|------------------|----------|
| X-CT01 | 注册接口要求JSON | application/json | 正常处理 |
| X-CT02 | 注册接口发送form-data | multipart/form-data | 参数可能无法解析，返回400或401 |
| X-CT03 | 登录接口要求JSON | application/json | 正常处理 |

### X-AL 审计日志

| 用例ID | 用例名称 | 前置条件 | 预期结果 |
|--------|---------|----------|----------|
| X-AL01 | 用户登录审计 | 用户登录成功 | 应记录登录时间、IP（当前实现无显式审计日志，建议补充） |
| X-AL02 | 密码修改审计 | 用户修改密码成功 | 应记录修改时间（当前实现无显式审计日志，建议补充） |
| X-AL03 | 注册审计 | 用户注册成功 | 应记录注册时间（当前实现无显式审计日志，建议补充） |

---

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| A01 POST /register | 4 | 2 | 10 | 1 | 7 | 1 | 1 | 1 | 1 | 28 |
| A02 POST /login | 4 | 3 | 4 | 1 | 3 | 1 | 1 | 1 | 1 | 19 |
| A03 GET /me | 2 | 1 | 1 | 5 | 2 | 1 | 1 | 1 | 1 | 15 |
| A04 PUT /profile | 6 | 3 | 10 | 2 | 3 | 1 | 1 | 1 | 1 | 28 |
| A05 PUT /password | 3 | 2 | 4 | 2 | 5 | 1 | 1 | 1 | 1 | 20 |
| A06 GET /preferences | 2 | 1 | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 11 |
| A07 PUT /preferences | 3 | 1 | 3 | 2 | 5 | 2 | 1 | 1 | 1 | 19 |
| **合计** | **24** | **13** | **33** | **15** | **26** | **8** | **7** | **7** | **7** | **140** |

> 注：特殊场景测试 23 条未计入上表维度统计。
