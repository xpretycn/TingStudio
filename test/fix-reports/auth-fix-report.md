# 登录 & 注册页面 Bug 修复报告

## 文档信息
| 项 | 值 |
|----|-----|
| 源文档ID | TR-AUTH-20260521-001 |
| 源测试用例文档ID | TC-AUTH-20260521-001 |
| 测试结果文档 | test/test-results/auth-test-results.md |
| 修复时间 | 2026-05-21 |
| Bug 总数 | 2 |
| 已修复 | 2 |
| 修复未生效 | 0 |
| 需手动处理 | 0 |
| 修复率 | 100% |

## 修复概览

| 用例ID | Bug 描述 | 严重程度 | 修复状态 |
|--------|---------|---------|---------|
| E04-E02 | 登录网络异常未捕获 | High | ✅ 已修复 |
| E11-E02 | 注册网络异常未捕获 | High | ✅ 已修复 |

## 修复详情

### E04-E02 登录网络异常未捕获 ✅ 已修复
| 项 | 值 |
|----|-----|
| 用例ID | E04-E02 |
| 严重程度 | High |
| 修复文件 | frontend/src/views/auth/Login.vue |
| 修复内容 | 在 handleSubmit 的 try-finally 中添加 catch 块，捕获网络异常后设置 formError 提示 |
| 修改行数 | +2 行 |
| 验证方式 | Playwright 离线模式重测 |
| 验证结果 | ✅ 通过 — Stayed on login page, loading stopped |

### E11-E02 注册网络异常未捕获 ✅ 已修复
| 项 | 值 |
|----|-----|
| 用例ID | E11-E02 |
| 严重程度 | High |
| 修复文件 | frontend/src/views/auth/Register.vue |
| 修复内容 | 在 handleSubmit 的 try-finally 中添加 catch 块，捕获网络异常后弹出 MessagePlugin.error 提示 |
| 修改行数 | +2 行 |
| 验证方式 | Playwright 离线模式重测 |
| 验证结果 | ✅ 通过 — Stayed on register page, loading stopped |

## 补充验证：E11-E01 用户名已存在

| 用例ID | 验证结果 | 说明 |
|--------|---------|------|
| E11-E01 | ✅ 通过 | Stayed on register page - duplicate rejected |
