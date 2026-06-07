# 原料（Materials）接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-ML-20260608-001 |
| 源文档路径 | test/api-test-cases/materials-api-test-cases.md |
| 执行时间 | 2026-06-08 07:00 |
| 总用例数 | 28 |
| 通过 | 26 |
| 失败 | 2 |
| 跳过 | 0 |
| 通过率 | 92.9% |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| B01-P01 | 基本查询原料列表 | ✅ PASS | 200 | <200ms |
| B01-R01 | 未携带Token | ✅ PASS | 401 | <100ms |
| B01-DI01 | admin可见全部原料 | ✅ PASS | 200 | <200ms |
| B01-DI02 | formulist仅见自己原料 | ❌ FAIL | 200 | <200ms |
| B02-P01 | 获取统计数据 | ✅ PASS | 200 | <100ms |
| B03-P01 | 获取编码 | ✅ PASS | 200 | <100ms |
| B04-P01 | 获取我的原料状态计数 | ✅ PASS | 200 | <100ms |
| B06-P01 | 查询存在的原料 | ✅ PASS | 200 | <100ms |
| B06-E01 | 查询不存在的原料 | ✅ PASS | 404 | <100ms |
| B11-P01 | 创建基本原料 | ✅ PASS | 201 | <200ms |
| B11-E01 | 编码重复 | ❌ FAIL | 201 | <200ms |
| B11-V01 | name缺失 | ✅ PASS | 400 | <100ms |
| B11-V03 | code缺失 | ✅ PASS | 400 | <100ms |
| B11-S01 | 创建后状态为draft | ✅ PASS | 201 | <200ms |
| B12-P01 | 更新原料名称 | ✅ PASS | 200 | <200ms |
| B12-E01 | 原料不存在 | ✅ PASS | 404 | <100ms |
| B12-R02 | formulist编辑他人原料 | ✅ PASS | 403 | <100ms |
| B13-R01 | formulist无权删除 | ✅ PASS | 403 | <100ms |
| B14-P01 | 创建者提交审批 | ✅ PASS | 200 | <200ms |
| B14-E02 | 非draft不可提交 | ✅ PASS | 400 | <100ms |
| B15-P01 | admin审批通过 | ✅ PASS | 200 | <200ms |
| B15-R01 | formulist不可审批 | ✅ PASS | 403 | <100ms |
| B16-P01 | admin驳回原料 | ✅ PASS | 200 | <200ms |
| B16-E01 | 驳回原因为空 | ✅ PASS | 400 | <100ms |
| B17-P01 | admin直接发布draft原料 | ✅ PASS | 200 | <200ms |
| B17-E01 | published状态不可再发布 | ✅ PASS | 400 | <100ms |
| B17-R01 | formulist不可直接发布 | ✅ PASS | 403 | <100ms |
| B18-P01 | 获取审批日志 | ✅ PASS | 200 | <100ms |

## 失败用例详情

### B11-E01 编码重复 — 201（应为409）

- **严重程度**：High
- **预期状态码**：409
- **实际状态码**：201
- **预期响应**：`{ success: false, message: "原料编码已存在，请使用其他编码" }`
- **实际响应**：`{ success: true, data: { ... } }` — 重复编码创建成功，返回201
- **修复建议**：在 `materialController.ts` 的 `createMaterial` 函数中，插入前应先查询 `code` 是否已存在。若已存在，返回 409 状态码和错误消息。当前实现缺少编码唯一性校验。

### B01-DI02 formulist仅见自己原料 — 数据隔离失效

- **严重程度**：High
- **预期状态码**：200
- **实际状态码**：200
- **预期响应**：formulist 用户只能看到自己创建的原料（total 应小于 admin 的 total）
- **实际响应**：formulist 用户看到了所有用户的原料（total=21，与 admin 的 total=21 相同）
- **修复建议**：在 `materialController.ts` 的 `getMaterials` 函数中，当用户角色为 `formulist` 时，应添加 `WHERE created_by = ?` 条件过滤数据。当前列表接口未实现数据隔离，formulist 可看到所有用户的原料数据。

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| B11-E01 | 原料编码重复时未返回409，而是创建成功返回201 | High | createMaterial 中增加 code 唯一性校验，重复时返回 409 |
| B01-DI02 | formulist 用户可看到所有用户的原料，数据隔离失效 | High | getMaterials 中对 formulist 角色添加 created_by 过滤条件 |
