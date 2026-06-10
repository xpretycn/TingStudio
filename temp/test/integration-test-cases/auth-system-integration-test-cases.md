# Auth + System 模块前后端联调测试用例

## 文档信息

| 字段 | 值 |
|------|-----|
| 文档ID | ITC-AUTH-20260609-001 |
| 模块 | Auth（认证）+ System（系统管理：用户/角色/权限） |
| 版本 | v1.0 |
| 编写日期 | 2026-06-09 |
| 编写方式 | 基于源码扫描自动生成 |

---

## 1. 模块接口映射

### 1.1 前端 API → 后端路由 对照表

| 前端 API 函数 | HTTP 方法 | 前端路径 | 后端路由 | 认证 | 权限 | validateBody |
|---------------|-----------|----------|----------|------|------|-------------|
| `authApi.login()` | POST | `/auth/login` | `POST /api/auth/login` | 无 | 无 | **无** |
| `authApi.register()` | POST | `/auth/register` | `POST /api/auth/register` | 无 | 无 | username(2-50), password(≥6) |
| `authApi.getMe()` | GET | `/auth/me` | `GET /api/auth/me` | authMiddleware | 无 | 无 |
| `authApi.updateProfile()` | PUT | `/auth/profile` | `PUT /api/auth/profile` | authMiddleware | 无 | email, phone(11), display_name(≤50), bio(≤500) |
| `authApi.changePassword()` | PUT | `/auth/password` | `PUT /api/auth/password` | authMiddleware | 无 | oldPassword, newPassword(≥6) |
| `authApi.getPreferences()` | GET | `/auth/preferences` | `GET /api/auth/preferences` | authMiddleware | 无 | 无 |
| `authApi.updatePreferences()` | PUT | `/auth/preferences` | `PUT /api/auth/preferences` | authMiddleware | 无 | preferences(object) |
| `userManageApi.getList()` | GET | `/users` | `GET /api/users` | authMiddleware | `user:read` | 无 |
| `userManageApi.updateRole()` | PUT | `/users/:id/role` | `PUT /api/users/:id/role` | authMiddleware | `user:write` | roleId(string,≥1) |
| `userManageApi.updateStatus()` | PUT | `/users/:id/status` | `PUT /api/users/:id/status` | authMiddleware | `user:write` | isActive(number) |
| `roleApi.getList()` | GET | `/roles` | `GET /api/roles` | authMiddleware | 无 | 无 |
| `roleApi.getDetail()` | GET | `/roles/:id` | `GET /api/roles/:id` | authMiddleware | 无 | 无 |
| `roleApi.create()` | POST | `/roles` | `POST /api/roles` | authMiddleware | `permission:write` | name(≥1), roleKey(≥1) |
| `roleApi.update()` | PUT | `/roles/:id` | `PUT /api/roles/:id` | authMiddleware | `permission:write` | name(≥1) |
| `roleApi.delete()` | DELETE | `/roles/:id` | `DELETE /api/roles/:id` | authMiddleware | `permission:write` | 无 |
| `roleApi.getPermissions()` | GET | `/roles/:id/permissions` | `GET /api/roles/:id/permissions` | authMiddleware | 无 | 无 |
| `roleApi.updatePermissions()` | PUT | `/roles/:id/permissions` | `PUT /api/roles/:id/permissions` | authMiddleware | `permission:write` | permissionIds(array) |
| `permissionApi.getList()` | GET | `/permissions` | `GET /api/permissions` | authMiddleware | 无 | 无 |

### 1.2 数据流图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3 + Pinia)                        │
│                                                                     │
│  Login.vue ──→ authStore.login() ──→ authApi.login()               │
│                   │                         │                       │
│                   ├── saveAuthData()         ├── http.post          │
│                   │   ├── setToken()         │   (自动注入 Bearer)  │
│                   │   ├── sessionStorage     │                       │
│                   │   └── localStorage       │                       │
│                   │                                                 │
│                   └── syncUserPreferences()                        │
│                       ├── preferencesStore.fetchPreferences()      │
│                       └── themeStore.applyPreferences()            │
│                                                                     │
│  路由守卫 ←── authStore.isAuthenticated                             │
│  http拦截器 ←── 401自动清token+跳转 / 403提示权限不足               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     后端 (Express + JWT)                            │
│                                                                     │
│  authMiddleware → jwt.verify → req.user = {userId, role,           │
│                                          roleId, permissions}       │
│       │                                                             │
│       ├── requirePermission("xxx")                                  │
│       │   ├── admin → 直接放行                                      │
│       │   └── 非admin → permissions.includes("xxx")                │
│       │                                                             │
│  generateToken()                                                    │
│   ├── admin → permissions = ["*"]                                   │
│   └── 非admin → getPermissionsByRoleId(roleId)                     │
│                                                                     │
│  validateBody() → 400 VALIDATION_ERROR + {details: [...]}          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ SQL (参数化)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              数据库 (users / roles / permissions / user_preferences)│
│                                                                     │
│  users: id, username, password(bcrypt), role, role_id,             │
│         display_name, avatar, bio, email, phone,                   │
│         is_active, created_at, updated_at                          │
│                                                                     │
│  roles: id, name, role_key, description, is_system, ...            │
│  role_permissions: role_id, permission_id                           │
│  permissions: id, module, action, permission_key, label, ...       │
│  user_preferences: user_id, preferences_json, updated_at           │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 认证时序图

```
用户          Login.vue        authStore        authApi        后端/auth/login
 │               │                │               │                │
 │──输入账密──→  │                │               │                │
 │               │──login()────→ │               │                │
 │               │               │──login()────→ │                │
 │               │               │               │──POST /login─→ │
 │               │               │               │                │──bcrypt.compare
 │               │               │               │                │──generateToken
 │               │               │               │                │──rowToCamelCase
 │               │               │               │←─{user,token}─│
 │               │               │←─{user,token}─│                │
 │               │               │──saveAuthData()               │
 │               │               │   (token双写)                  │
 │               │               │──syncUserPreferences()        │
 │               │←─{success}─── │               │                │
 │←─跳转首页─── │                │               │                │
```

---

## 2. 联调场景用例

### I-AUTH01: 登录全链路

**场景**：用户从登录页输入账密到成功进入首页的完整流程

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 打开 `/login` 页面 | 展示 | 登录表单渲染，包含用户名、密码输入框和登录按钮 |
| 2 | 输入用户名 `admin` | 展示 | 输入框聚焦动画，AnimatedCharacters 联动 |
| 3 | 输入密码 `123456` | 展示 | 密码掩码显示，点击眼睛图标可切换明文 |
| 4 | 点击"登录"按钮 | 操作 | 触发 `handleSubmit` → TDesign 表单校验 |
| 5 | 前端表单校验通过 | 前端 | `validateResult === true`，loading 状态开启 |
| 6 | `authStore.login()` 调用 | Store | 内部调用 `authApi.login()` |
| 7 | HTTP 请求发出 | 请求 | `POST /api/auth/login`，Content-Type: application/json |
| 8 | 后端接收请求 | 后端 | 解构 `{username, password}`（无 validateBody） |
| 9 | 数据库查询用户 | DB | `SELECT id, username, password, role, role_id, ... FROM users WHERE username = ?` |
| 10 | bcrypt.compare 校验密码 | 后端 | 密码匹配通过 |
| 11 | generateToken 签发 JWT | 后端 | admin→permissions=["*"]；formulist→getPermissionsByRoleId |
| 12 | 响应返回 | 响应 | `{success:true, data:{user:{id,username,role,...}, token}}` |
| 13 | axios 拦截器解包 | Store | `res.data` = `{user, token}`，解包后直接返回 |
| 14 | saveAuthData 执行 | 存储 | `setToken(token)` → sessionStorage + localStorage 双写 `tingstudio_token` |
| 15 | saveUser 执行 | 存储 | `tingstudio_user` 双写 sessionStorage + localStorage |
| 16 | syncUserPreferences | Store | 加载偏好设置 → 应用主题（admin默认绿色，formulist默认粉色） |
| 17 | authStore.user 更新 | 状态 | `isAuthenticated` 变为 `true` |
| 18 | MessagePlugin.success | 展示 | 提示"登录成功啦~ 欢迎回来！" |
| 19 | router.push("/") | 导航 | 跳转首页，路由守卫 `isAuthenticated === true` 放行 |
| 20 | 后续请求 | 请求 | 自动注入 `Authorization: Bearer {token}` |

**7层闭环验证**：
| 层 | 验证点 |
|----|--------|
| 操作 | 输入账密→点击登录按钮 |
| 请求 | POST /api/auth/login，body含username+password |
| DB | users表查到记录，bcrypt校验通过 |
| Store | authStore.user有值，isAuthenticated=true |
| 响应 | {success:true, data:{user, token}} |
| 展示 | 登录页消失→首页出现，欢迎提示 |
| 存储 | sessionStorage/localStorage双写token和user |

---

### I-AUTH02: Token过期自动跳转

**场景**：用户Token过期后，前端自动感知并跳转登录页

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 用户已登录，停留在首页 | 状态 | sessionStorage有有效token |
| 2 | Token过期（7天后或手动篡改） | - | - |
| 3 | 用户触发需认证操作（如刷新配方列表） | 操作 | 发出 GET /api/formulas |
| 4 | 后端 authMiddleware 校验 | 后端 | `jwt.verify` 抛出 `TokenExpiredError` |
| 5 | 后端返回 401 | 响应 | `{success:false, error:{message:"Token has expired", code:"TOKEN_EXPIRED"}}` |
| 6 | axios 响应拦截器捕获 401 | 前端 | `status === 401` 分支执行 |
| 7 | 清除认证信息 | 存储 | `removeToken()` + `clearUser()` → 清空 sessionStorage + localStorage |
| 8 | 事件解耦跳转 | 导航 | `window.dispatchEvent(new CustomEvent("app:navigate", {detail:{path:"/login"}}))` |
| 9 | 提示用户 | 展示 | `MessagePlugin.error("登录已过期，请重新登录")` |
| 10 | 登录页渲染 | 展示 | `/login` 页面加载，表单空白待输入 |
| 11 | 非login页面时才跳转 | 边界 | `!window.location.pathname.startsWith("/login")` 防止循环跳转 |

**7层闭环验证**：
| 层 | 验证点 |
|----|--------|
| 操作 | Token过期后触发API调用 |
| 请求 | 请求携带过期Token → 后端返回401 |
| DB | 无DB操作（纯JWT校验） |
| Store | authStore.user被清空 |
| 响应 | 401 + TOKEN_EXPIRED |
| 展示 | 提示"登录已过期"+跳转登录页 |
| 存储 | token和user均从sessionStorage/localStorage清除 |

---

### I-AUTH03: 注册→自动登录→默认角色formulist

**场景**：新用户注册后自动登录，默认角色为formulist

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 打开 `/register` 页面 | 展示 | 注册表单渲染 |
| 2 | 输入用户名 `testuser01`、密码 `test123` | 操作 | 填写注册信息 |
| 3 | 提交注册 | 操作 | `authStore.register()` |
| 4 | HTTP请求 | 请求 | `POST /api/auth/register`，body: `{username, password}` |
| 5 | validateBody校验 | 后端 | username(2-50字符) + password(≥6字符) 通过 |
| 6 | 查重 | DB | `SELECT id FROM users WHERE username = ?` → 无重复 |
| 7 | 创建用户 | DB | `INSERT INTO users (..., role='formulist', ...)` |
| 8 | generateToken | 后端 | role='formulist'，无roleId → permissions=[] |
| 9 | 响应 | 响应 | 201 Created，`{success:true, data:{user:{role:"formulist"}, token}}` |
| 10 | 前端saveAuthData | 存储 | token和user双写 |
| 11 | syncUserPreferences | Store | 默认品牌色=粉色（非admin） |
| 12 | 自动跳转首页 | 导航 | 无需再次登录 |
| 13 | 验证角色 | Store | `authStore.user.role === 'formulist'`，`permissions` 为空数组 |

**7层闭环验证**：
| 层 | 验证点 |
|----|--------|
| 操作 | 填写注册信息→提交 |
| 请求 | POST /api/auth/register，含username+password |
| DB | users表插入新记录，role='formulist' |
| Store | authStore.user.role='formulist'，permissions=[] |
| 响应 | 201 + {user, token} |
| 展示 | 注册成功提示→跳转首页 |
| 存储 | token+user双写，默认品牌色粉色 |

**异常分支**：
| 分支 | 触发条件 | 预期响应 | 前端表现 |
|------|---------|---------|---------|
| 用户名已存在 | username重复 | 409 `{message:"用户名已存在"}` | formError显示"用户名已存在" |
| 用户名过短 | username<2字符 | 400 VALIDATION_ERROR | TDesign表单校验拦截 |
| 密码过短 | password<6字符 | 400 VALIDATION_ERROR | TDesign表单校验拦截 |
| 缺少必填字段 | body为空 | 400 VALIDATION_ERROR + details | formError显示具体错误 |

---

### I-AUTH04: 密码修改

**场景**：已登录用户修改密码

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 进入账号设置页 | 展示 | 密码修改表单 |
| 2 | 输入当前密码 `old123` 和新密码 `new456` | 操作 | 填写密码 |
| 3 | 提交修改 | 操作 | `authStore.changePassword()` |
| 4 | HTTP请求 | 请求 | `PUT /api/auth/password`，含 Authorization 头 |
| 5 | validateBody校验 | 后端 | oldPassword(required) + newPassword(≥6) 通过 |
| 6 | authMiddleware | 后端 | token校验通过，req.user.userId |
| 7 | 查询用户密码 | DB | `SELECT password FROM users WHERE id = ?` |
| 8 | bcrypt.compare | 后端 | 旧密码校验通过 |
| 9 | 更新密码 | DB | `UPDATE users SET password = bcrypt(newPassword), updated_at = ?` |
| 10 | 响应 | 响应 | `{success:true, data:null, message:"密码修改成功"}` |
| 11 | 前端处理 | Store | `changePassword` 返回 `{success:true}` |
| 12 | 用旧密码登录 | 验证 | 登录失败，返回401 |
| 13 | 用新密码登录 | 验证 | 登录成功 |

**异常分支**：
| 分支 | 触发条件 | 预期响应 | 前端表现 |
|------|---------|---------|---------|
| 旧密码错误 | bcrypt.compare失败 | 400 `{message:"当前密码不正确"}` | 提示"当前密码不正确" |
| 新密码过短 | newPassword<6 | 400 VALIDATION_ERROR | 表单校验拦截 |
| 未登录 | 无Authorization头 | 401 UNAUTHORIZED | 自动跳转登录页 |

---

### I-GUARD01: 路由守卫联调（未登录→登录→回原页）

**场景**：未登录用户访问受保护页面，被守卫拦截→登录后回到原页面

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 未登录状态，直接访问 `/formulas` | 操作 | 地址栏输入URL |
| 2 | 路由守卫触发 | 前端 | `beforeEach` → `authStore.isAuthenticated === false` |
| 3 | 重定向登录页 | 导航 | `next("/login")`，当前路由信息丢失 |
| 4 | 用户登录成功 | 操作 | 正常登录流程 |
| 5 | 登录后跳转 | 导航 | `router.push("/")` → 默认跳转首页 |
| 6 | 登录后再次访问 `/formulas` | 操作 | 直接访问，`isAuthenticated === true` |
| 7 | 路由守卫放行 | 导航 | 正常渲染配方列表页 |
| 8 | 已登录状态访问 `/login` | 导航 | `next("/")` 重定向首页 |
| 9 | 已登录状态访问 `/register` | 导航 | `next("/")` 重定向首页 |

> **注意**：当前实现中 `router.push("/")` 是硬编码跳转首页，不回原页。若需"登录后回到原页"，需额外实现 redirect 参数。

---

### I-PERM01: admin vs formulist 权限联动（UI按钮+API双重校验）

**场景**：admin和formulist看到不同UI、调用不同API、后端二次校验权限

| 步骤 | 角色 | 操作 | 前端UI | API调用 | 后端校验 | 预期结果 |
|------|------|------|--------|---------|---------|---------|
| 1 | admin | 访问系统管理 | 侧边栏可见"系统管理" | - | - | 菜单可见 |
| 2 | formulist | 访问系统管理 | 侧边栏不可见（无`user:read`） | - | - | 菜单隐藏 |
| 3 | admin | 用户列表 | 用户管理表格渲染 | GET /api/users | authMiddleware + requirePermission("user:read") | admin直接放行 |
| 4 | formulist | 手动调用户列表API | - | GET /api/users | requirePermission("user:read") | 403 FORBIDDEN |
| 5 | admin | 修改用户角色 | 角色下拉可操作 | PUT /api/users/:id/role | requirePermission("user:write") | admin放行，操作成功 |
| 6 | formulist | 手动调修改角色API | - | PUT /api/users/:id/role | requirePermission("user:write") | 403 FORBIDDEN |
| 7 | admin | 创建角色 | 新建角色按钮可见 | POST /api/roles | requirePermission("permission:write") | admin放行 |
| 8 | formulist | 手动调创建角色API | - | POST /api/roles | requirePermission("permission:write") | 403 FORBIDDEN |

**前端权限判断逻辑**：
```typescript
// authStore.hasPermission(permission)
if (user.role === 'admin') return true           // admin全通
return user.permissions?.includes(permission)     // 非admin逐项检查
```

**后端权限判断逻辑**：
```typescript
// requirePermission(permission)
if (req.user.permissions.includes(permission) || req.user.role === "admin") next()
else 403 FORBIDDEN
```

**双重校验一致性验证**：
| 权限键 | 前端hasPermission | 后端requirePermission | 一致性 |
|--------|-------------------|----------------------|--------|
| `user:read` | ✅ | ✅ | 一致 |
| `user:write` | ✅ | ✅ | 一致 |
| `permission:write` | ✅ | ✅ | 一致 |
| admin通配 | role==='admin'→true | role==='admin'→放行 | 一致 |

---

### I-PERM02: requirePermission中间件验证

**场景**：逐个验证各权限中间件的行为

| 用例ID | 权限 | 用户角色 | 用户permissions | 请求路径 | 预期状态码 | 预期错误码 |
|--------|------|---------|----------------|---------|-----------|-----------|
| P02-01 | `user:read` | admin | ["*"] | GET /api/users | 200 | - |
| P02-02 | `user:read` | formulist(无权限) | [] | GET /api/users | 403 | FORBIDDEN |
| P02-03 | `user:read` | 自定义角色(有权限) | ["user:read"] | GET /api/users | 200 | - |
| P02-04 | `user:write` | admin | ["*"] | PUT /api/users/:id/role | 200 | - |
| P02-05 | `user:write` | formulist(无权限) | [] | PUT /api/users/:id/role | 403 | FORBIDDEN |
| P02-06 | `permission:write` | admin | ["*"] | POST /api/roles | 201 | - |
| P02-07 | `permission:write` | formulist(无权限) | [] | POST /api/roles | 403 | FORBIDDEN |
| P02-08 | 无 | 未认证 | - | GET /api/users | 401 | UNAUTHORIZED |

**无Bearer头**：
| 用例ID | Authorization头 | 预期状态码 | 预期错误码 |
|--------|----------------|-----------|-----------|
| P02-09 | 无 | 401 | UNAUTHORIZED |
| P02-10 | `Bearer invalid_token` | 401 | INVALID_TOKEN |
| P02-11 | `Bearer expired_token` | 401 | TOKEN_EXPIRED |

---

### I-PERM03: 角色CRUD+权限分配全链路

**场景**：admin创建角色→分配权限→用户绑定角色→权限生效

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | admin登录 | 认证 | 获取admin token |
| 2 | 获取权限列表 | 请求 | GET /api/permissions → 返回分组权限列表 |
| 3 | 创建角色 | 请求 | POST /api/roles `{name:"配方审核员", roleKey:"reviewer", description:"..."}` |
| 4 | 创建成功 | 响应 | 201 Created，返回角色对象含id |
| 5 | 查看角色列表 | 请求 | GET /api/roles → 列表包含新建角色 |
| 6 | 获取角色详情 | 请求 | GET /api/roles/:id → 返回角色+permissions |
| 7 | 分配权限 | 请求 | PUT /api/roles/:id/permissions `{permissionIds:["perm-1","perm-2"]}` |
| 8 | 权限分配成功 | 响应 | 200 `{message:"权限分配成功"}` |
| 9 | 验证权限已保存 | 请求 | GET /api/roles/:id/permissions → 返回已分配权限 |
| 10 | 修改用户角色 | 请求 | PUT /api/users/:userId/role `{roleId:"新角色id"}` |
| 11 | 用户重新登录 | 操作 | 重新获取token，permissions包含新角色权限 |
| 12 | 验证权限生效 | 请求 | 用户访问受新权限保护的API → 200 |
| 13 | 修改角色名称 | 请求 | PUT /api/roles/:id `{name:"高级审核员"}` |
| 14 | 删除角色（有用户） | 请求 | DELETE /api/roles/:id → 400 ROLE_HAS_USERS |
| 15 | 解绑用户后删除 | 请求 | 解绑用户→DELETE /api/roles/:id → 200 |

**异常分支**：
| 分支 | 触发条件 | 预期响应 |
|------|---------|---------|
| 角色标识重复 | roleKey已存在 | 409 DUPLICATE_ENTRY |
| 修改系统角色 | is_system=true的角色 | 403 FORBIDDEN |
| 删除系统角色 | is_system=true的角色 | 403 FORBIDDEN |
| 角色不存在 | id无效 | 404 NOT_FOUND |
| 角色下有用户 | user_count>0 | 400 ROLE_HAS_USERS |

---

### I-OWNS01: formulist越权操作被拒

**场景**：formulist用户尝试操作他人数据，被后端数据隔离拦截

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | formulist-A 登录 | 认证 | 获取formulist-A token |
| 2 | 访问自己的配方 | 请求 | GET /api/formulas → 只返回created_by=A的记录 |
| 3 | 尝试修改admin的配方 | 请求 | PUT /api/formulas/:adminFormulaId → 后端校验created_by≠当前用户 |
| 4 | 后端拒绝 | 响应 | 403 FORBIDDEN 或业务层返回无权限 |
| 5 | 前端提示 | 展示 | "权限不足"提示 |

> **数据隔离规则**：admin可见全部数据，formulist仅见自己创建的数据（`created_by = userId`）

---

### I-ERR01: 登录失败错误传播

**场景**：各种登录失败场景的错误消息从前端到后端的完整传播

| 用例ID | 输入 | 后端处理 | 后端响应 | 前端拦截器 | Store返回 | Login.vue展示 |
|--------|------|---------|---------|-----------|----------|--------------|
| ERR-01 | 用户名不存在 | 查无此人 | 401 `{message:"用户名或密码错误"}` | 不弹MessagePlugin（login用_silent） | `{success:false, message:"用户名或密码错误"}` | formError显示 |
| ERR-02 | 密码错误 | bcrypt校验失败 | 401 `{message:"用户名或密码错误"}` | 同上 | 同上 | formError显示 |
| ERR-03 | 用户名为空 | 前端校验拦截 | - | - | - | TDesign校验"请输入用户名哦~" |
| ERR-04 | 密码为空 | 前端校验拦截 | - | - | - | TDesign校验"请输入密码哦~" |
| ERR-05 | 用户名<3字符 | 前端校验拦截 | - | - | - | TDesign校验"用户名至少3个字符呢" |
| ERR-06 | 密码<6字符 | 前端校验拦截 | - | - | - | TDesign校验"密码至少6个字符呢" |
| ERR-07 | 后端服务未启动 | 网络错误 | 无响应 | 检测ERR_CONNECTION_REFUSED | catch→"网络异常" | formError显示"网络异常" |

**关键细节**：
- `authApi.login()` 使用 `{_silent: true}` → 拦截器不自动弹 MessagePlugin
- `authStore.login()` 用 `extractErrorMessage()` 提取错误消息 → 返回 `{success:false, message}`
- Login.vue 通过 `formError` 展示内联错误，带 shake 动画

---

### I-ISO01: 数据隔离联调

**场景**：admin和formulist看到不同数据范围

| 步骤 | 角色 | 操作 | API调用 | DB查询 | 返回数据 |
|------|------|------|---------|--------|---------|
| 1 | admin | 配方列表 | GET /api/formulas | 无created_by过滤 | 全部配方 |
| 2 | formulist-A | 配方列表 | GET /api/formulas | `WHERE created_by = A_id` | 仅A创建的 |
| 3 | admin | 原料列表 | GET /api/materials | 无created_by过滤 | 全部原料 |
| 4 | formulist-A | 原料列表 | GET /api/materials | `WHERE created_by = A_id` | 仅A创建的 |
| 5 | admin | 业务员列表 | GET /api/salesmen | 无created_by过滤 | 全部业务员 |
| 6 | formulist-A | 业务员列表 | GET /api/salesmen | `WHERE created_by = A_id` | 仅A创建的 |
| 7 | admin | 用户列表 | GET /api/users | 无过滤 | 全部用户 |
| 8 | formulist-A | 用户列表 | GET /api/users | 403 FORBIDDEN | 无权限 |

**品牌色联动**：
| 角色 | 默认品牌色 | 触发逻辑 |
|------|-----------|---------|
| admin | green | `watch(user.id)` → `cachedUser?.role === 'admin' ? 'green' : 'pink'` |
| formulist | pink | 同上，非admin走粉色 |

---

### I-DEDUP01: 请求防抖（双击登录按钮）

**场景**：用户快速双击登录按钮，防止重复提交

| 步骤 | 操作 | 验证层 | 验证内容 |
|------|------|--------|----------|
| 1 | 输入正确账密 | 操作 | 表单填写完成 |
| 2 | 第一次点击登录按钮 | 操作 | loading=true，按钮显示loading状态 |
| 3 | 第二次点击登录按钮 | 操作 | 按钮disabled（`<t-button :loading="loading">`），无法再次触发 |
| 4 | 请求完成 | 状态 | loading=false |
| 5 | 网络请求次数 | 请求 | 仅1次 POST /api/auth/login |

**防抖机制**：
- TDesign `<t-button :loading="loading">` → loading状态下自动disabled
- `authStore.loading` 全局状态控制
- 无额外debounce/throttle，依赖按钮disabled机制

---

## 3. 契约验证用例

### C-EP: 端点匹配

| 用例ID | 前端调用路径 | 后端实际端点 | 匹配 |
|--------|------------|------------|------|
| C-EP-01 | `/auth/login` | `POST /api/auth/login` | ✅ |
| C-EP-02 | `/auth/register` | `POST /api/auth/register` | ✅ |
| C-EP-03 | `/auth/me` | `GET /api/auth/me` | ✅ |
| C-EP-04 | `/auth/profile` | `PUT /api/auth/profile` | ✅ |
| C-EP-05 | `/auth/password` | `PUT /api/auth/password` | ✅ |
| C-EP-06 | `/auth/preferences` | `GET /api/auth/preferences` | ✅ |
| C-EP-07 | `/auth/preferences` | `PUT /api/auth/preferences` | ✅ |
| C-EP-08 | `/users` | `GET /api/users` | ✅ |
| C-EP-09 | `/users/:id/role` | `PUT /api/users/:id/role` | ✅ |
| C-EP-10 | `/users/:id/status` | `PUT /api/users/:id/status` | ✅ |
| C-EP-11 | `/roles` | `GET /api/roles` | ✅ |
| C-EP-12 | `/roles/:id` | `GET /api/roles/:id` | ✅ |
| C-EP-13 | `/roles` | `POST /api/roles` | ✅ |
| C-EP-14 | `/roles/:id` | `PUT /api/roles/:id` | ✅ |
| C-EP-15 | `/roles/:id` | `DELETE /api/roles/:id` | ✅ |
| C-EP-16 | `/roles/:id/permissions` | `GET /api/roles/:id/permissions` | ✅ |
| C-EP-17 | `/roles/:id/permissions` | `PUT /api/roles/:id/permissions` | ✅ |
| C-EP-18 | `/permissions` | `GET /api/permissions` | ✅ |

### C-METHOD: HTTP方法

| 用例ID | 前端方法 | 后端路由方法 | 匹配 |
|--------|---------|------------|------|
| C-M-01 | `http.post('/auth/login')` | `authRoutes.post('/login')` | ✅ POST |
| C-M-02 | `http.post('/auth/register')` | `authRoutes.post('/register')` | ✅ POST |
| C-M-03 | `http.get('/auth/me')` | `authRoutes.get('/me')` | ✅ GET |
| C-M-04 | `http.put('/auth/profile')` | `authRoutes.put('/profile')` | ✅ PUT |
| C-M-05 | `http.put('/auth/password')` | `authRoutes.put('/password')` | ✅ PUT |
| C-M-06 | `http.get('/auth/preferences')` | `authRoutes.get('/preferences')` | ✅ GET |
| C-M-07 | `http.put('/auth/preferences')` | `authRoutes.put('/preferences')` | ✅ PUT |
| C-M-08 | `http.get('/users')` | `userRoutes.get('/')` | ✅ GET |
| C-M-09 | `http.put('/users/:id/role')` | `userRoutes.put('/:id/role')` | ✅ PUT |
| C-M-10 | `http.put('/users/:id/status')` | `userRoutes.put('/:id/status')` | ✅ PUT |
| C-M-11 | `http.get('/roles')` | `roleRoutes.get('/')` | ✅ GET |
| C-M-12 | `http.post('/roles')` | `roleRoutes.post('/')` | ✅ POST |
| C-M-13 | `http.put('/roles/:id')` | `roleRoutes.put('/:id')` | ✅ PUT |
| C-M-14 | `http.delete('/roles/:id')` | `roleRoutes.delete('/:id')` | ✅ DELETE |
| C-M-15 | `http.get('/roles/:id/permissions')` | `roleRoutes.get('/:id/permissions')` | ✅ GET |
| C-M-16 | `http.put('/roles/:id/permissions')` | `roleRoutes.put('/:id/permissions')` | ✅ PUT |
| C-M-17 | `http.get('/permissions')` | `permissionRoutes.get('/')` | ✅ GET |

### C-REQ: 请求体

| 用例ID | 接口 | 前端发送 | 后端validateBody | 一致性 |
|--------|------|---------|-----------------|--------|
| C-R-01 | POST /auth/login | `{username, password}` | **无validateBody** | ⚠️ 前端有TDesign校验(≥3,≥6)，后端无校验 |
| C-R-02 | POST /auth/register | `{username, password}` | `username(2-50,required), password(≥6,required)` | ✅ |
| C-R-03 | PUT /auth/profile | `{display_name, avatar, bio, email, phone}` | `email,phone(11),display_name(≤50),bio(≤500)` | ✅ |
| C-R-04 | PUT /auth/password | `{oldPassword, newPassword}` | `oldPassword(required), newPassword(≥6,required)` | ✅ |
| C-R-05 | PUT /auth/preferences | `{preferences}` | `preferences(object,required)` | ✅ |
| C-R-06 | PUT /users/:id/role | `{roleId}` | `roleId(string,≥1,required)` | ✅ |
| C-R-07 | PUT /users/:id/status | `{isActive}` | `isActive(number,required)` | ✅ |
| C-R-08 | POST /roles | `{name, roleKey, description}` | `name(≥1), roleKey(≥1)` | ✅ description无校验但非必填 |
| C-R-09 | PUT /roles/:id | `{name, description}` | `name(≥1,required)` | ✅ |
| C-R-10 | PUT /roles/:id/permissions | `{permissionIds}` | `permissionIds(array,required)` | ✅ |

**⚠️ 风险标注**：`POST /auth/login` 后端无 validateBody，恶意请求可发送空/异常body，后端在 controller 中手动解构 `{username, password}`，若缺失则 `username` 为 undefined，SQL查询返回空结果，最终返回401。虽然不会崩溃，但缺少统一校验。

### C-RES: 响应体

| 用例ID | 接口 | 成功响应格式 | 前端类型声明 | 一致性 |
|--------|------|------------|------------|--------|
| C-RS-01 | POST /auth/login | `{success:true, data:{user, token}, message:"登录成功"}` | `{user:UserInfo, token:string}` | ✅ axios解包后为data |
| C-RS-02 | POST /auth/register | `{success:true, data:{user, token}, message:"注册成功"}` | `{user:UserInfo, token:string}` | ✅ |
| C-RS-03 | GET /auth/me | `{success:true, data:UserInfo}` | `UserInfo` | ✅ |
| C-RS-04 | PUT /auth/profile | `{success:true, data:UserInfo, message:"资料更新成功"}` | `UserInfo` | ✅ |
| C-RS-05 | PUT /auth/password | `{success:true, data:null, message:"密码修改成功"}` | `null` | ✅ |
| C-RS-06 | GET /auth/preferences | `{success:true, data:preferences}` | `UserPreferences` | ✅ |
| C-RS-07 | PUT /auth/preferences | `{success:true, data:preferences, message:"偏好设置已保存"}` | `UserPreferences` | ✅ |
| C-RS-08 | GET /users | `{success:true, data:{list, pagination}}` | `{list:UserManageItem[], pagination:Pagination}` | ✅ |
| C-RS-09 | PUT /users/:id/role | `{success:true, data:user, message:"用户角色更新成功"}` | `void` | ⚠️ 后端返回user但前端声明void |
| C-RS-10 | PUT /users/:id/status | `{success:true, data:null, message:"用户状态更新成功"}` | `void` | ✅ |
| C-RS-11 | GET /roles | `{success:true, data:Role[]}` | `Role[]` | ✅ |
| C-RS-12 | GET /roles/:id | `{success:true, data:RoleDetail}` | `RoleDetail` | ✅ |
| C-RS-13 | POST /roles | `{success:true, data:Role, message:"角色创建成功"}` 201 | `Role` | ✅ |
| C-RS-14 | PUT /roles/:id | `{success:true, data:Role, message:"角色更新成功"}` | `Role` | ✅ |
| C-RS-15 | DELETE /roles/:id | `{success:true, data:null, message:"角色删除成功"}` | `void` | ✅ |
| C-RS-16 | GET /roles/:id/permissions | `{success:true, data:PermissionItem[]}` | `PermissionItem[]` | ✅ |
| C-RS-17 | PUT /roles/:id/permissions | `{success:true, data:null, message:"权限分配成功"}` | `void` | ✅ |
| C-RS-18 | GET /permissions | `{success:true, data:PermissionGroup[]}` | `PermissionGroup[]` | ✅ |

### C-NAME: 字段命名

| 用例ID | 场景 | DB字段 | 后端返回（rowToCamelCase后） | 前端接口 | 一致性 |
|--------|------|--------|---------------------------|---------|--------|
| C-N-01 | 用户ID | `id` | `id` | `id` | ✅ |
| C-N-02 | 用户名 | `username` | `username` | `username` | ✅ |
| C-N-03 | 显示名 | `display_name` | `displayName` | `displayName` | ✅ |
| C-N-04 | 角色ID | `role_id` | `roleId` | `roleId` | ✅ |
| C-N-05 | 是否激活 | `is_active` | `isActive` | `isActive` | ✅ |
| C-N-06 | 创建时间 | `created_at` | `createdAt` | `createdAt` | ✅ |
| C-N-07 | 更新时间 | `updated_at` | `updatedAt` | `updatedAt` | ✅ |
| C-N-08 | 更新资料请求 | - | - | `display_name`（snake_case） | ⚠️ 前端UpdateProfileParams用snake_case |
| C-N-09 | 角色标识 | `role_key` | `roleKey` | `roleKey` | ✅ |
| C-N-10 | 是否系统 | `is_system` | `isSystem` | `isSystem` | ✅ |

**⚠️ 注意**：`UpdateProfileParams` 中的字段名用 snake_case（`display_name`），这是因为后端 validateBody 定义的 key 为 `display_name`，前端直接匹配后端字段名。这与 UserInfo 中的 camelCase（`displayName`）不一致，但属于请求/响应的命名约定差异。

### C-DATE: 日期格式

| 用例ID | 场景 | 后端返回格式 | 前端处理 | 规范符合 |
|--------|------|------------|---------|---------|
| C-D-01 | createdAt | ISO 8601 UTC（`2026-05-03T14:21:47.611Z`） | `timeFormat.ts` 转本地时区 | ✅ |
| C-D-02 | updatedAt | ISO 8601 UTC | 同上 | ✅ |
| C-D-03 | 展示使用 | - | `formatTimestamp()` → `2026-05-03 22:21:47` | ✅ 禁止toISOString() |

### C-ID: ID格式

| 用例ID | 场景 | 生成方式 | 格式 | 前端类型 |
|--------|------|---------|------|---------|
| C-ID-01 | 用户ID | `generateId()` | UUID v4 (`xxxxxxxx-xxxx-4xxx-...`) | `string` |
| C-ID-02 | 角色ID | `generateId()` | UUID v4 | `string` |
| C-ID-03 | 权限ID | 数据库种子/迁移 | UUID | `string` |

### C-ERRSTR: 错误响应结构

| 用例ID | 错误来源 | 响应结构 | 规范符合 |
|--------|---------|---------|---------|
| C-E-01 | validateBody校验失败 | `{success:false, error:{message:"参数验证失败", code:"VALIDATION_ERROR", timestamp:"2026-06-09T00:00:00.000Z", details:[...]}}` | ✅ 含message+code+timestamp |
| C-E-02 | authMiddleware(无头) | `{success:false, error:{message:"Missing or invalid authorization header", code:"UNAUTHORIZED"}}` | ⚠️ 缺少timestamp |
| C-E-03 | authMiddleware(token过期) | `{success:false, error:{message:"Token has expired", code:"TOKEN_EXPIRED"}}` | ⚠️ 缺少timestamp |
| C-E-04 | authMiddleware(无效token) | `{success:false, error:{message:"Invalid token", code:"INVALID_TOKEN"}}` | ⚠️ 缺少timestamp |
| C-E-05 | requirePermission(无权限) | `{success:false, error:{message:"Insufficient permissions. Required: xxx", code:"FORBIDDEN"}}` | ⚠️ 缺少timestamp |
| C-E-06 | controller业务错误(如登录失败) | `{success:false, message:"用户名或密码错误"}` | ⚠️ 无error包裹，无code |
| C-E-07 | controller业务错误(如注册重复) | `{success:false, message:"用户名已存在"}` | ⚠️ 同上 |
| C-E-08 | controller 500错误 | `{success:false, message:"登录失败", error:error.message}` | ⚠️ error直接暴露message |

**⚠️ 契约不一致标注**：
1. `authMiddleware` 和 `requirePermission` 的错误响应缺少 `timestamp` 字段
2. controller 层业务错误使用顶层 `message` 字段，而非 `error.message`，与 validateBody 的错误结构不一致
3. 500错误响应中 `error` 字段直接暴露 `error.message`，生产环境存在信息泄露风险

---

## 4. 测试覆盖率统计

### 4.1 联调场景覆盖

| 模块 | 场景数 | 用例数 |
|------|--------|--------|
| 认证流程 (AUTH) | 4 | I-AUTH01 ~ I-AUTH04 |
| 路由守卫 (GUARD) | 1 | I-GUARD01 |
| 权限联动 (PERM) | 3 | I-PERM01 ~ I-PERM03 |
| 越权操作 (OWNS) | 1 | I-OWNS01 |
| 错误传播 (ERR) | 1 | I-ERR01 |
| 数据隔离 (ISO) | 1 | I-ISO01 |
| 防抖去重 (DEDUP) | 1 | I-DEDUP01 |
| **合计** | **12** | **12** |

### 4.2 契约验证覆盖

| 维度 | 用例数 | 发现不一致 |
|------|--------|-----------|
| C-EP 端点匹配 | 18 | 0 |
| C-METHOD HTTP方法 | 17 | 0 |
| C-REQ 请求体 | 10 | 1（login无validateBody） |
| C-RES 响应体 | 18 | 1（updateRole返回值vs前端void） |
| C-NAME 字段命名 | 10 | 1（UpdateProfileParams snake_case） |
| C-DATE 日期格式 | 3 | 0 |
| C-ID ID格式 | 3 | 0 |
| C-ERRSTR 错误结构 | 8 | 3（缺timestamp/结构不一致/信息泄露） |
| **合计** | **87** | **6** |

### 4.3 7层闭环覆盖率

| 场景 | 操作 | 请求 | DB | Store | 响应 | 展示 | 存储 |
|------|------|------|-----|-------|------|------|------|
| I-AUTH01 登录 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| I-AUTH02 Token过期 | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| I-AUTH03 注册 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| I-AUTH04 改密 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| I-GUARD01 路由守卫 | ✅ | - | - | ✅ | - | ✅ | ✅ |
| I-PERM01 权限联动 | ✅ | ✅ | - | ✅ | ✅ | ✅ | - |
| I-PERM02 中间件验证 | - | ✅ | - | - | ✅ | - | - |
| I-PERM03 角色CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| I-OWNS01 越权 | ✅ | ✅ | ✅ | - | ✅ | ✅ | - |
| I-ERR01 错误传播 | ✅ | ✅ | - | ✅ | ✅ | ✅ | - |
| I-ISO01 数据隔离 | ✅ | ✅ | ✅ | - | ✅ | ✅ | - |
| I-DEDUP01 防抖 | ✅ | ✅ | - | ✅ | - | ✅ | - |
| **覆盖率** | **11/12** | **10/12** | **5/12** | **7/12** | **10/12** | **11/12** | **4/12** |

### 4.4 关键风险项

| 等级 | 风险描述 | 涉及场景 | 建议 |
|------|---------|---------|------|
| 🔴 高 | `POST /auth/login` 无 validateBody，后端不做输入校验 | I-AUTH01, C-REQ | 建议补充 validateBody |
| 🔴 高 | 500错误响应暴露 `error.message`（含堆栈信息） | C-ERRSTR-08 | 生产环境应隐藏内部错误详情 |
| 🟡 中 | authMiddleware/requirePermission 错误响应缺少 timestamp | C-ERRSTR-02~05 | 统一错误响应格式 |
| 🟡 中 | controller 业务错误结构与 validateBody 不一致 | C-ERRSTR-06~07 | 统一使用 `error.message` + `error.code` |
| 🟢 低 | UpdateProfileParams 使用 snake_case 与响应 camelCase 不一致 | C-NAME-08 | 已有模式，但前端需注意 |
| 🟢 低 | PUT /users/:id/role 返回 user 数据但前端声明 void | C-RES-09 | 前端未使用返回值，无实际影响 |
