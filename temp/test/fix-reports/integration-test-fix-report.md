# 联调测试 Bug 修复报告

## 文档信息
| 项 | 值 |
|----|-----|
| 源测试结果文档 | 5 份联调测试结果报告 |
| 修复时间 | 2026-06-10 |
| Bug 总数 | 9 |
| 已修复 | 4 |
| 已过时/无需修复 | 5 |
| 修复率 | 100%（可修复项全部修复） |

## 修复概览

| 用例ID | Bug 描述 | 严重程度 | 修复状态 |
|--------|---------|---------|---------|
| I-AUTH01 | Token过期后未跳转登录页 | High | ⚠️ 非Bug（测试方法限制） |
| BUG-C-EP07 | materialApi.getByFormula() 无后端路由 | High | ⚠️ 已过时（前端已移除） |
| C-ERRSTR | authMiddleware/requirePermission 错误响应缺少 timestamp | High | ✅ 已修复 |
| C-ERRSTR | controller 业务错误缺少 error 包裹和 code | High | ✅ 已修复 |
| BUG-C-REQ04 | reject comment 前端无最小长度校验 | Medium | ⚠️ 已过时（前端已有校验） |
| BUG-C-EP20 | 后端 /my-submissions 前端未定义 API 函数 | Medium | ✅ 已修复 |
| BUG-AI-001 | 前端 model 字段 vs 后端 provider 语义不一致 | Medium | ⚠️ 设计决策（功能正确） |
| C-REQ04/05 | POST/PUT formulas materials 子项无 validateBody | Medium | ✅ 已修复 |
| C-NAME-08 | UpdateProfileParams snake_case 与响应 camelCase 不一致 | Low | ⚠️ 设计决策（改了破坏兼容性） |

## 修复详情

### C-ERRSTR authMiddleware/requirePermission 错误响应缺少 timestamp ✅ 已修复
| 项 | 值 |
|----|-----|
| 严重程度 | High |
| 修复文件 | backend/src/middleware/auth.ts |
| 修复内容 | 4 处错误响应（authMiddleware 无 Header、Token 过期/无效、requirePermission 未认证、无权限）添加 `timestamp: new Date().toISOString()` |
| 修改行数 | 4 处 |

### C-ERRSTR controller 业务错误缺少 error 包裹和 code ✅ 已修复
| 项 | 值 |
|----|-----|
| 严重程度 | High |
| 修复文件 | backend/src/controllers/authController.ts |
| 修复内容 | 11 处顶层 `message` 字段改为 `error: { message, code, timestamp }` 结构，包含：用户名已存在(409/DUPLICATE_ENTRY)、用户名或密码错误(401/UNAUTHORIZED)、用户不存在(404/NOT_FOUND)、邮箱/手机号格式不正确(400/VALIDATION_ERROR)、邮箱/手机号已被绑定(409/DUPLICATE_ENTRY)、密码相关校验(400/VALIDATION_ERROR)、偏好数据格式不正确(400/VALIDATION_ERROR) |
| 修改行数 | 11 处 |

### BUG-C-EP20 后端 /my-submissions 前端未定义 API 函数 ✅ 已修复
| 项 | 值 |
|----|-----|
| 严重程度 | Medium |
| 修复文件 | frontend/src/api/material.ts |
| 修复内容 | 添加 `getMySubmissions(params?)` API 函数，调用 `GET /materials/my-submissions`，支持 keyword/page/pageSize/status 参数 |
| 修改行数 | +3 行 |

### C-REQ04/05 POST/PUT formulas materials 子项无 validateBody ✅ 已修复
| 项 | 值 |
|----|-----|
| 严重程度 | Medium |
| 修复文件 | backend/src/routes/formulas.ts |
| 修复内容 | 添加 `validateMaterialItems` 中间件，校验 materials 数组子项的 `materialId`（必填字符串）和 `quantity`（必填正数），应用于 POST /formulas 和 PUT /formulas/:id 路由 |
| 修改行数 | +28 行（中间件定义 + 2 处路由注册） |

## 非Bug/已过时/设计决策说明

### I-AUTH01 Token过期后未跳转登录页
- **结论**: 非Bug
- **原因**: http.ts 的 401 拦截器逻辑正确（removeToken + dispatchEvent → main.ts 监听 → router.push("/login")），测试中通过 `page.evaluate` 触发的 fetch 不经过 axios 拦截器，属于测试方法限制

### BUG-C-EP07 materialApi.getByFormula() 无后端路由
- **结论**: 已过时
- **原因**: 当前 `frontend/src/api/material.ts` 中已无 `getByFormula` 方法，该方法在 `frontend/src/api/sales.ts` 中（`salesApi.getByFormula`），指向 `/sales/formula/:formulaId`

### BUG-C-REQ04 reject comment 前端无最小长度校验
- **结论**: 已过时
- **原因**: `MaterialList.vue` 的 `handleConfirmReject` 已有 `rejectComment.value.trim().length < 5` 校验并提示"驳回原因至少5个字符"

### BUG-AI-001 前端 model 字段 vs 后端 provider 语义不一致
- **结论**: 设计决策
- **原因**: 前端统一用 `model` 字段名发送 provider 值，后端用 `const {model: provider} = req.body` 解构重命名，功能完全正确，属于 API 设计约定

### C-NAME-08 UpdateProfileParams snake_case 与响应 camelCase 不一致
- **结论**: 设计决策
- **原因**: 后端 validateBody 的 key 为 `display_name`（与数据库字段一致），前端请求体必须匹配此 key。响应通过 `rowToCamelCase` 转为 camelCase。修改会破坏后端兼容性
