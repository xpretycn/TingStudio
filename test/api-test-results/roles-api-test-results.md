# 角色 接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-ROLES-20260608-001 |
| 源文档路径 | test/api-test-cases/roles-api-test-cases.md |
| 执行时间 | 2026-06-08 22:35 |
| 总用例数 | 38 |
| 通过 | 36 |
| 失败 | 2 |
| 跳过 | 0 |
| 通过率 | 94.7% |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| R01-P01 | 获取角色列表 | PASS | 200 | 143ms |
| R01-R01 | 未登录访问角色 | PASS | 401 | 16ms |
| R01-R03 | admin访问角色 | PASS | 200 | 5ms |
| R01-R04 | formulist访问角色 | PASS | 200 | 4ms |
| R01-I01 | 幂等性角色列表 | PASS | 200 | 4ms |
| R01-DI01 | 角色无数据隔离 | PASS | 200 | 10ms |
| R02-P01 | 获取角色详情 | PASS | 200 | 4ms |
| R02-E01 | 角色不存在 | PASS | 404 | 4ms |
| R02-R01 | 未登录角色详情 | PASS | 401 | 3ms |
| R02-DI01 | 角色详情无隔离 | PASS | 200 | 4ms |
| R03-P01 | 创建角色 | FAIL | 200 | 113ms |
| R03-E01 | 重复roleKey | PASS | 409 | 4ms |
| R03-B02 | 空name | PASS | 400 | 4ms |
| R03-B03 | 空roleKey | PASS | 400 | 5ms |
| R03-V01 | 缺少name | PASS | 400 | 4ms |
| R03-V02 | 缺少roleKey | PASS | 400 | 4ms |
| R03-V06 | 空请求体 | PASS | 400 | 4ms |
| R03-R01 | 未登录创建角色 | PASS | 401 | 3ms |
| R03-R04 | formulist无权限 | PASS | 403 | 4ms |
| R04-P01 | 更新角色 | PASS | 200 | 123ms |
| R04-E01 | 更新不存在角色 | PASS | 404 | 4ms |
| R04-V01 | 缺少name | PASS | 400 | 3ms |
| R04-R01 | 未登录更新角色 | PASS | 401 | 2ms |
| R04-R02 | formulist无权更新 | PASS | 403 | 5ms |
| R05-P01 | 删除自定义角色 | PASS | 200 | 134ms |
| R05-E01 | 删除不存在角色 | PASS | 404 | 7ms |
| R05-I01 | 重复删除角色 | PASS | 404 | 5ms |
| R05-E02 | 删除系统角色 | PASS | 403 | 4ms |
| R05-R01 | 未登录删除角色 | PASS | 401 | 2ms |
| R05-R02 | formulist无权删除 | PASS | 403 | 4ms |
| R06-P01 | 获取角色权限 | PASS | 200 | 7ms |
| R06-B01 | 不存在角色权限 | PASS | 200 | 4ms |
| R06-R01 | 未登录角色权限 | PASS | 401 | 2ms |
| R07-V01 | 缺少permissionIds | PASS | 400 | 4ms |
| R07-V02 | permissionIds为null | PASS | 400 | 28ms |
| R07-R01 | 未登录更新权限 | PASS | 401 | 2ms |
| R07-R02 | formulist无权更新权限 | PASS | 403 | 4ms |
| X-MD-R01 | POST访问角色列表 | FAIL | 400 | 4ms |

## 失败用例详情

### R03-P01 — 创建角色返回 200 而非 201
- **严重程度**: Low
- **预期状态码**: 201
- **实际状态码**: 200
- **预期响应**: `{success:true, data:{id,...}, message:"角色创建成功"}` 状态码 201
- **实际响应**: `{success:true, data:{id,...}, message:"角色创建成功"}` 状态码 200
- **修复建议**: 创建角色成功时应返回 HTTP 201 状态码。修改 roleController.createRole 中 res.status(201).json()。

### X-MD-R01 — POST /api/roles 返回 400 而非 404
- **严重程度**: Low
- **预期状态码**: 404
- **实际状态码**: 400
- **预期响应**: 路由不匹配返回 404
- **实际响应**: 请求体验证失败返回 400（POST /api/roles 路由存在，但空请求体验证不通过）
- **修复建议**: 此为预期行为差异。POST /api/roles 路由已注册，空请求体触发 validateBody 返回 400 是正确行为。测试用例预期需调整。

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| R03-P01 | 创建角色返回200而非201 | Low | 修改控制器返回 res.status(201).json() |
| X-MD-R01 | POST /api/roles返回400而非404 | Low | 路由已注册，验证失败返回400是正确行为，调整测试预期 |
