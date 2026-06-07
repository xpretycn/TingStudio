---
trigger: always_on
---
# 错误处理规范

## 1. 后端错误处理

### 全局错误中间件

项目已配置 `errorHandler` 中间件（`backend/src/middleware/errorHandler.ts`），统一处理所有未捕获的错误：

- 500 错误：返回通用消息 `"Internal server error"`，不暴露内部细节
- 非 500 错误：返回实际错误消息
- 开发环境：附加 `stack` 信息
- 生产环境：**禁止**暴露堆栈信息

### 控制器错误处理模式

```typescript
export async function getXxx(req: any, res: Response) {
  try {
    // 业务逻辑
    res.json(success(data));
  } catch (error: any) {
    // 已知业务错误，返回具体状态码
    if (error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: { message: error.message, code: "NOT_FOUND" }
      });
      return;
    }
    // 未知错误，交给全局中间件
    console.error("[Controller] Error:", error);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR" }
    });
  }
}
```

### 错误码使用

| 场景 | 错误码 | HTTP 状态码 |
|------|--------|------------|
| 未认证 | `UNAUTHORIZED` | 401 |
| Token 过期 | `TOKEN_EXPIRED` | 401 |
| 无权限 | `FORBIDDEN` | 403 |
| 资源不存在 | `NOT_FOUND` | 404 |
| 参数验证失败 | `VALIDATION_ERROR` | 400 |
| 重复数据 | `DUPLICATE_ENTRY` | 409 |

## 2. 前端错误处理

### HTTP 拦截器

项目已在 `frontend/src/api/http.ts` 中配置全局拦截器：

- **401 响应**：自动清除 Token，跳转登录页，提示"登录已过期"
- **网络错误**：跳转服务器故障页 `/server-error`
- **业务错误**（`success: false`）：自动弹出 `MessagePlugin.error()`
- **静默模式**：设置 `_silent: true` 可禁用自动错误提示

### 组件内错误处理模式

```typescript
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const res = await someApi.getData()
    // 处理数据
  } catch (error: any) {
    // 拦截器已自动提示，此处仅做额外处理
    // 如需要自定义提示，API 调用时加 _silent: true
  } finally {
    loading.value = false
  }
}
```

### Store 内错误处理模式

```typescript
const someAction = async (params: any) => {
  loading.value = true
  try {
    const res = await someApi.action(params)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || '操作失败' }
  } finally {
    loading.value = false
  }
}
```

## 3. 日志规范

### 后端日志

- 使用 `console.error()` 记录错误，格式：`[模块名] Error: {message}`
- 使用 `console.log()` 记录启动信息，格式：`[Startup] ✓/✗ {message}`
- 使用 `morgan` 中间件记录 HTTP 请求日志（非测试环境）
- **禁止**在日志中记录敏感信息（Token、密码、个人数据）

### 前端日志

- HTTP 请求日志：`[HTTP] GET /api/xxx (label)`
- HTTP 错误日志：`[HTTP-ERR] POST /api/xxx [401]: message`
- **禁止**在生产环境保留 `console.log`，调试日志应在提交前移除

## 4. 禁止行为

- 禁止 `catch` 空块吞掉错误（至少记录日志）
- 禁止在错误响应中暴露数据库表名、字段名、SQL 语句
- 禁止在前端展示后端原始错误消息（可能包含技术细节）
- 禁止使用 `try-catch` 包裹不需要错误处理的同步代码
