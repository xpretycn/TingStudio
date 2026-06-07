---
trigger: always_on
---
# 安全规范

## 1. 密钥与凭证管理

- **禁止**在代码中硬编码密钥、密码、Token、API Key
- 所有敏感配置**必须**通过环境变量（`.env`）注入
- `.env` 文件已在 `.gitignore` 中，**禁止**提交到版本库
- 使用 `.env.example` 提供配置模板，不含真实值
- JWT Secret **必须**在生产环境使用强随机字符串，禁止使用默认值

## 2. SQL 注入防护

- **禁止**拼接 SQL 字符串，必须使用参数化查询
- 正确：`query("SELECT * FROM users WHERE id = ?", [userId])`
- 错误：`query("SELECT * FROM users WHERE id = " + userId)`
- 用户输入**必须**经过验证中间件（`validateBody`）校验后才可使用

## 3. 认证与授权

- 需要认证的接口**必须**使用 `authMiddleware`
- 可选认证使用 `optionalAuth`
- 权限检查使用 `requirePermission()`
- Token 存储在前端 `localStorage`，key 为 `tingstudio_token`
- Token 过期时间：7 天（`JWT_EXPIRES_IN = "7d"`）

## 4. HTTP 安全头

- 项目已启用 `helmet` 中间件，新增路由自动受保护
- CSP、HSTS、X-Frame-Options 等安全头由 helmet 统一管理
- **禁止**在路由中单独关闭安全头

## 5. CORS 配置

- 允许的源由 `CORS_ORIGIN` 环境变量控制
- 开发环境默认：`localhost:5173`、`localhost:5174`、`localhost:3000`
- 生产环境**必须**配置为实际域名，禁止使用 `*`

## 6. 请求限制

- 项目已启用 `express-rate-limit`
- 请求体大小限制：10MB（JSON / URL-encoded）
- 新增高频接口**必须**配置速率限制

## 7. 数据脱敏

- API 响应中**禁止**返回用户密码（即使是哈希值）
- 错误响应在生产环境**禁止**暴露堆栈信息（`errorHandler` 已处理）
- 日志中**禁止**记录 Token、密码等敏感字段

## 8. 文件上传安全

- 使用 `multer` 处理文件上传
- **必须**限制文件类型和大小
- 上传文件**禁止**使用用户原始文件名，应生成唯一文件名
