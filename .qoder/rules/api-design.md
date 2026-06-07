---
trigger: always_on
---
# API 设计规范

## 1. 路由结构

- 所有 API 路由挂载在 `/api` 前缀下
- 路由按业务模块分文件：`auth.ts`、`formulas.ts`、`materials.ts` 等
- 路由文件统一在 `backend/src/routes/index.ts` 中注册
- 新增模块**必须**在 `createAppRouter()` 中注册

### 路由命名规则

```
GET    /api/{resource}          — 列表查询
GET    /api/{resource}/:id      — 详情查询
POST   /api/{resource}          — 新增
PUT    /api/{resource}/:id      — 更新
DELETE /api/{resource}/:id      — 删除
```

- 资源名使用复数形式：`/materials`、`/formulas`、`/salesmen`
- 路径使用 kebab-case：`/excel-import`、`/nutrition-profiles`

## 2. 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 分页响应

```json
{
  "success": true,
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "timestamp": "2026-05-14T00:00:00.000Z"
  }
}
```

## 3. 错误码规范

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `TOKEN_EXPIRED` | 401 | Token 过期 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `DUPLICATE_ENTRY` | 409 | 重复数据 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 4. 控制器结构

- 控制器文件放在 `backend/src/controllers/` 下
- 每个控制器函数**必须**用 try-catch 包裹
- 使用项目已有的 `success()`、`successWithPagination()` 工具函数返回成功响应
- 错误通过 `next(error)` 传递给错误中间件，或直接设置 `res.status()` 返回

## 5. 请求验证

- 使用 `validateBody()` 中间件验证请求体
- 验证规则定义在路由层，不在控制器中
- 必填字段和类型**必须**声明验证规则

## 6. 前端 API 调用

- 前端统一使用 `@/api/http.ts` 封装的 axios 实例
- API 文件按模块分文件：`@/api/material.ts`、`@/api/formula.ts`
- Token 自动通过请求拦截器注入
- 401 响应自动跳转登录页
- 使用 `_silent: true` 配置可静默请求（不弹出错误提示）

## 7. 禁止行为

- 禁止在控制器中直接操作数据库，应通过 service 层
- 禁止跳过 `validateBody` 直接使用未校验的用户输入
- 禁止在响应中返回数据库原始字段名（snake_case），应转换为 camelCase
- 禁止新增 API 时不注册到路由汇总文件
