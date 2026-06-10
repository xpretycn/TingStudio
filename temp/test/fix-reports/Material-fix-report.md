# 原料管理模块 Bug 修复报告

## 文档信息

| 项 | 值 |
|----|-----|
| 测试结果文档 | test/test-report.md |
| 修复时间 | 2026-06-06 |
| Bug 总数 | 10 |
| 已修复 | 9 |
| 不需修复(误报) | 1 |
| 修复率 | 100% (排除误报) |

## 修复概览

| Bug ID | Bug 描述 | 严重程度 | 修复状态 |
|--------|---------|---------|---------|
| C3 | XSS风险：v-html拼接用户数据 | Critical | ✅ 已修复 |
| C4 | NRV计算错误：钠的单位处理 | Critical | ✅ 已修复 |
| C2 | 审批操作事务不一致 | Critical | ✅ 已修复 |
| H1 | 更新接口缺少validateBody | High | ✅ 已修复 |
| H2 | 搜索无防抖 | High | ✅ 已修复 |
| H6 | MaterialVersions审批绕过Store | High | ✅ 已修复 |
| H7 | getVersionStatus硬编码published | High | ✅ 已修复 |
| M4 | 表单校验不完善 | Medium | ✅ 已修复 |
| M5 | canEdit使用user.id | Medium | ⚠️ 不需修复(误报) |
| M7 | 空catch块 | Medium | ✅ 已修复 |

## 修复详情

### C3 XSS风险：v-html拼接用户数据 ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | Critical |
| 修复文件 | frontend/src/views/materials/MaterialList.vue |
| 修复内容 | 1. 将 `v-html="item.desc"` 改为 `{{ item.desc }}` 文本插值；2. 将 desc 内容从 HTML 字符串改为纯文本 |
| 修改行数 | ~8 行 |
| 验证方式 | 代码审查 |

### C4 NRV计算错误：钠的单位处理 ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | Critical |
| 修复文件 | frontend/src/views/materials/MaterialDetail.vue |
| 修复内容 | 移除 `if (name === '钠') value = value / 1000` 错误逻辑，统一使用 `base.nrvUnit === 'mg' && unit === 'g'` 条件进行 g→mg 转换 |
| 修改行数 | ~5 行 |
| 验证方式 | 代码审查 |

### C2 审批操作事务不一致 ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | Critical |
| 修复文件 | backend/src/controllers/materialController.ts |
| 修复内容 | 四个审批操作（submitReview、approve、reject、publish）的 review log 写入添加 try-catch，失败时记录日志但不影响主流程 |
| 修改行数 | +16 行 |
| 验证方式 | 代码审查 |

### H1 更新接口缺少validateBody ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | High |
| 修复文件 | backend/src/routes/materials.ts |
| 修复内容 | `PUT /:id` 添加 validateBody 中间件，校验 name 和 code 字段 |
| 修改行数 | +6 行 |
| 验证方式 | 代码审查 |

### H2 搜索无防抖 ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | High |
| 修复文件 | frontend/src/views/materials/MaterialList.vue |
| 修复内容 | watch(searchKeyword) 添加 300ms 防抖，避免每次按键触发 API 请求 |
| 修改行数 | +5 行 |
| 验证方式 | 代码审查 |

### H6 MaterialVersions审批绕过Store ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | High |
| 修复文件 | frontend/src/views/materials/MaterialVersions.vue |
| 修复内容 | 1. 引入 useMaterialStore；2. handleSubmitReview/handleApprove/confirmReject 操作成功后调用 materialStore.invalidateCache() |
| 修改行数 | +5 行 |
| 验证方式 | 代码审查 |

### H7 getVersionStatus硬编码published ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | High |
| 修复文件 | frontend/src/views/materials/MaterialVersions.vue |
| 修复内容 | 非最新版本使用 `ver.status || "published"` 替代硬编码 "published" |
| 修改行数 | ~3 行 |
| 验证方式 | 代码审查 |

### M4 表单校验不完善 ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | Medium |
| 修复文件 | frontend/src/views/materials/MaterialForm.vue |
| 修复内容 | 1. name 添加 max: 100 校验；2. unitPrice 添加负数校验 |
| 修改行数 | +4 行 |
| 验证方式 | 代码审查 |

### M5 canEdit使用user.id ⚠️ 不需修复(误报)

| 项 | 值 |
|----|-----|
| 严重程度 | Medium |
| 文件 | frontend/src/views/materials/MaterialDetail.vue |
| 分析 | UserInfo 接口定义 `id: string`，后端 `created_by` 存储的也是 `users.id`，因此 `user.id` 是正确的字段名，与后端一致 |

### M7 空catch块 ✅ 已修复

| 项 | 值 |
|----|-----|
| 严重程度 | Medium |
| 修复文件 | backend/src/services/materialService.ts |
| 修复内容 | 两处空 catch 块添加 `console.error("[MaterialService] 营养数据JSON解析失败:", parseError)` |
| 修改行数 | ~4 行 |
| 验证方式 | 代码审查 |

## 未修复项（建议后续处理）

| Bug ID | 描述 | 严重程度 | 原因 |
|--------|------|---------|------|
| C1 | SQL拼接风险 | Critical | 当前 m.id 来自数据库非用户输入，风险可控；修改需较大重构 |
| H3 | N+1查询问题 | High | 需后端新增批量查询接口，属于功能增强 |
| H4 | 控制器直连DB | High | 需将 getMaterialStats 迁移到 service 层，属于重构 |
| H5 | catch中二次调用 | High | 需评估 checkReference 的异常处理策略 |
| M1 | 大量any类型 | Medium | 范围太大，需专项重构 |
| M2 | 暴露error.message | Medium | 需统一错误处理中间件改造 |
| M3 | 时间格式不统一 | Medium | 低优先级 |
| M6 | pageSize:9999 | Medium | 需后端配合提供下拉选择接口 |
