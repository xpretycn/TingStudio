# 前后端联调测试用例文档

| 字段 | 值 |
|------|-----|
| 文档ID | ITC-NSE-20260609-001 |
| 模块 | Nutrition / Salesmen / Reports / Exports / Sales / Dashboard |
| 版本 | v1.0 |
| 日期 | 2026-06-10 |
| 状态 | 待执行 |

---

## 1. 模块接口映射

### 1.1 Nutrition 模块

| # | 前端API函数 | HTTP方法 | 前端URL | 后端路由 | 后端控制器 | 认证 | 验证 |
|---|------------|---------|---------|---------|-----------|------|------|
| N-01 | `nutritionApi.getMaterialNutrition` | GET | `/nutrition/material/:materialId` | `GET /material/:materialId` | `getMaterialNutrition` | authMiddleware | - |
| N-02 | `nutritionApi.setMaterialNutrition` | PUT | `/nutrition/material/:materialId` | `PUT /material/:materialId` | `setMaterialNutrition` | authMiddleware | validateBody(per100g必填) |
| N-03 | `nutritionApi.calculateFormulaNutrition` | POST | `/nutrition/calculate/:formulaId` | `POST /calculate/:formulaId` | `calculateFormulaNutrition` | authMiddleware | - |
| N-04 | `nutritionApi.getFormulaNutritionTables` | GET | `/nutrition/tables/:formulaId` | `GET /tables/:formulaId` | `getFormulaNutritionTables` | authMiddleware | - |
| N-05 | `nutritionApi.getProfiles` | GET | `/nutrition/profiles` | `GET /profiles` | `getNutritionProfiles` | authMiddleware | - |
| N-06 | `nutritionApi.createProfile` | POST | `/nutrition/profiles` | `POST /profiles` | `createNutritionProfile` | authMiddleware | validateBody(name必填1-100字, targetValues必填) |
| N-07 | `nutritionApi.updateProfile` | PUT | `/nutrition/profiles/:profileId` | `PUT /profiles/:profileId` | `updateNutritionProfile` | authMiddleware | validateBody |
| N-08 | `nutritionApi.deleteProfile` | DELETE | `/nutrition/profiles/:profileId` | `DELETE /profiles/:profileId` | `deleteNutritionProfile` | authMiddleware | - |
| N-09 | `nutritionApi.checkCompliance` | POST | `/nutrition/compliance/:formulaId` | `POST /compliance/:formulaId` | `checkCompliance` | authMiddleware | - |
| N-10 | `nutritionApi.analyzeFormula` | POST | `/nutrition/analyze/:formulaId` | `POST /analyze/:formulaId` | `analyzeFormula` | authMiddleware | - |
| N-11 | `nutritionApi.getCoverage` | GET | `/nutrition/coverage/:formulaId` | `GET /coverage/:formulaId` | `getCoverage` | authMiddleware | - |

### 1.2 Salesmen 模块

| # | 前端API函数 | HTTP方法 | 前端URL | 后端路由 | 后端控制器 | 认证 | 验证 |
|---|------------|---------|---------|---------|-----------|------|------|
| S-01 | `salesmanApi.getList` | GET | `/salesmen` | `GET /` | `getSalesmen` | authMiddleware | - |
| S-02 | `salesmanApi.getById` | GET | `/salesmen/:id` | `GET /:id` | `getSalesman` | authMiddleware | - |
| S-03 | `salesmanApi.create` | POST | `/salesmen` | `POST /` | `createSalesman` | authMiddleware | validateBody(name必填) |
| S-04 | `salesmanApi.update` | PUT | `/salesmen/:id` | `PUT /:id` | `updateSalesman` | authMiddleware | - |
| S-05 | `salesmanApi.delete` | DELETE | `/salesmen/:id` | `DELETE /:id` | `deleteSalesman` | authMiddleware | - |
| S-06 | `salesmanApi.toggleStatus` | PATCH | `/salesmen/:id/status` | `PATCH /:id/status` | `toggleSalesmanStatus` | authMiddleware | - |

### 1.3 Reports 模块

| # | 前端API函数 | HTTP方法 | 前端URL | 后端路由 | 后端控制器 | 认证 | 验证 |
|---|------------|---------|---------|---------|-----------|------|------|
| R-01 | `reportApi.getList` | GET | `/reports` | `GET /` | `getReportList` | authMiddleware | - |
| R-02 | `reportApi.getById` | GET | `/reports/:id` | `GET /:id` | `getReportById` | authMiddleware | - |
| R-03 | `reportApi.generate` | POST | `/reports/generate` | `POST /generate` | `generateReport` | authMiddleware | validateBody(type/periodStart/periodEnd必填) |
| R-04 | `reportApi.update` | PUT | `/reports/:id` | `PUT /:id` | `updateReport` | authMiddleware | - |
| R-05 | `reportApi.delete` | DELETE | `/reports/:id` | `DELETE /:id` | `deleteReport` | authMiddleware | - |
| R-06 | `reportApi.publish` | POST | `/reports/:id/publish` | `POST /:id/publish` | `publishReport` | authMiddleware | - |
| R-07 | `reportApi.getWeeklyData` | GET | `/reports/data/weekly` | `GET /data/weekly` | `getWeeklyData` | authMiddleware | - |
| R-08 | `reportApi.getMonthlyData` | GET | `/reports/data/monthly` | `GET /data/monthly` | `getMonthlyData` | authMiddleware | - |
| R-09 | `reportApi.getTargetList` | GET | `/reports/targets` | `GET /targets` | `getTargetList` | authMiddleware | - |
| R-10 | `reportApi.createTarget` | POST | `/reports/targets` | `POST /targets` | `createTarget` | authMiddleware | validateBody(periodType/periodStart/periodEnd必填) |
| R-11 | `reportApi.updateTarget` | PUT | `/reports/targets/:id` | `PUT /targets/:id` | `updateTarget` | authMiddleware | - |
| R-12 | `reportApi.deleteTarget` | DELETE | `/reports/targets/:id` | `DELETE /targets/:id` | `deleteTarget` | authMiddleware | - |
| R-13 | `reportApi.exportPdf` | GET | `/reports/:id/export/pdf` | `GET /:id/export/pdf` | `exportReportPdf` | authMiddleware | - |
| R-14 | `reportApi.exportExcel` | GET | `/reports/:id/export/excel` | `GET /:id/export/excel` | `exportReportExcel` | authMiddleware | - |
| R-15 | `reportApi.checkPeriodExists` | POST | `/reports/check-period` | `POST /check-period` | `checkPeriodExists` | authMiddleware | validateBody(type/periodStart必填) |
| R-16 | `reportApi.batchExportExcel` | POST | `/reports/batch-export/excel` | `POST /batch-export/excel` | `batchExportExcel` | authMiddleware | validateBody(reportIds必填) |
| R-17 | `reportApi.compareReports` | POST | `/reports/compare` | `POST /compare` | `compareReports` | authMiddleware | - |
| R-18 | `reportApi.getAIAnalysis` | POST | `/reports/ai-analysis` | `POST /ai-analysis` | `getAIAnalysis` | authMiddleware | - |
| R-19 | `reportApi.saveAIAnalysis` | PUT | `/reports/:id/ai-analysis` | `PUT /:id/ai-analysis` | `saveAIAnalysis` | authMiddleware | - |

### 1.4 Exports 模块

| # | 前端API函数 | HTTP方法 | 前端URL | 后端路由 | 后端控制器 | 认证 | 验证 |
|---|------------|---------|---------|---------|-----------|------|------|
| E-01 | `exportApi.getStatistics` | GET | `/exports/statistics` | `GET /statistics` | `getExportStatistics` | authMiddleware | - |
| E-02 | `exportApi.getConfig` | GET | `/exports/config` | `GET /config` | `getExportConfig` | authMiddleware | - |
| E-03 | `exportApi.updateConfig` | PUT | `/exports/config` | `PUT /config` | `updateExportConfig` | authMiddleware | validateBody(configs必填) |
| E-04 | `exportApi.getMaterials` | GET | `/exports/materials` | `GET /materials` | `getExportMaterials` | authMiddleware | - |
| E-05 | `exportApi.getReports` | GET | `/exports/reports` | `GET /reports` | `getExportReports` | authMiddleware | - |
| E-06 | `exportApi.getTemplates` | GET | `/exports/templates` | `GET /templates` | `getExportTemplates` | authMiddleware | - |
| E-07 | `exportApi.createTemplate` | POST | `/exports/templates` | `POST /templates` | `createExportTemplate` | authMiddleware | validateBody(name/type/formatConfig必填) |
| E-08 | `exportApi.updateTemplate` | PUT | `/exports/templates/:templateId` | `PUT /templates/:templateId` | `updateExportTemplate` | authMiddleware | - |
| E-09 | `exportApi.deleteTemplate` | DELETE | `/exports/templates/:templateId` | `DELETE /templates/:templateId` | `deleteExportTemplate` | authMiddleware | - |
| E-10 | `exportApi.createJob` | POST | `/exports/jobs` | `POST /jobs` | `createExportJob` | authMiddleware | validateBody(dataCategory/exportType必填) |
| E-11 | `exportApi.getJobs` | GET | `/exports/jobs` | `GET /jobs` | `getExportJobs` | authMiddleware | - |
| E-12 | `exportApi.getJob` | GET | `/exports/jobs/:jobId` | `GET /jobs/:jobId` | `getExportJob` | authMiddleware | - |
| E-13 | `exportApi.retryJob` | POST | `/exports/jobs/:jobId/retry` | `POST /jobs/:jobId/retry` | `retryExportJob` | authMiddleware | - |
| E-14 | `exportApi.reExportJob` | POST | `/exports/jobs/:jobId/re-export` | `POST /jobs/:jobId/re-export` | `reExportJob` | authMiddleware | - |
| E-15 | `exportApi.downloadFile` | GET | `/exports/jobs/:jobId/download` | `GET /jobs/:jobId/download` | `downloadExportFile` | authMiddleware | - |
| E-16 | `exportApi.createShare` | POST | `/exports/share` | `POST /share` | `createShare` | authMiddleware | - |
| E-17 | `exportApi.getShares` | GET | `/exports/shares` | `GET /shares` | `getShares` | authMiddleware | - |
| E-18 | `exportApi.deleteShare` | DELETE | `/exports/share/:shareId` | `DELETE /share/:shareId` | `deleteShare` | authMiddleware | - |
| E-19 | (公开访问) | GET | `/exports/public/share/:shareId` | `GET /public/share/:shareId` | `getPublicShare` | **无认证** | - |

### 1.5 Sales 模块

| # | 前端API函数 | HTTP方法 | 前端URL | 后端路由 | 后端控制器 | 认证 | 验证 |
|---|------------|---------|---------|---------|-----------|------|------|
| SA-01 | `salesApi.getList` | GET | `/sales` | `GET /` | `getSalesList` | authMiddleware | - |
| SA-02 | `salesApi.getByFormula` | GET | `/sales/formula/:formulaId` | `GET /formula/:formulaId` | `getSalesByFormula` | authMiddleware | - |
| SA-03 | `salesApi.getStats` | GET | `/sales/stats` | `GET /stats` | `getSalesStats` | authMiddleware | - |
| SA-04 | `salesApi.create` | POST | `/sales` | `POST /` | `createSale` | authMiddleware | - |
| SA-05 | `salesApi.update` | PUT | `/sales/:id` | `PUT /:id` | `updateSale` | authMiddleware | - |
| SA-06 | `salesApi.delete` | DELETE | `/sales/:id` | `DELETE /:id` | `deleteSale` | authMiddleware | - |
| SA-07 | `salesApi.batchCreate` | POST | `/sales/batch` | `POST /batch` | `batchCreateSales` | authMiddleware | - |

### 1.6 Dashboard 模块

| # | 前端API函数 | HTTP方法 | 前端URL | 后端路由 | 后端控制器 | 认证 | 验证 |
|---|------------|---------|---------|---------|-----------|------|------|
| D-01 | `dashboardApi.getStats` | GET | `/dashboard/stats` | `GET /stats` | `getDashboardStats` | authMiddleware | - |
| D-02 | `dashboardApi.getRecentActivity` | GET | `/dashboard/activity` | `GET /activity` | `getRecentActivity` | authMiddleware | - |
| D-03 | `dashboardApi.getSalesTrend` | GET | `/dashboard/sales-trend` | `GET /sales-trend` | `getSalesTrend` | authMiddleware | - |

---

## 2. 联调场景用例

### 2.1 Nutrition 模块

#### I-NUTR01: 营养计算全链路（ratio=0.18药材）

| 项目 | 内容 |
|------|------|
| 用例ID | I-NUTR01 |
| 场景 | 药材类原料使用 ratioFactor=0.18 计算营养贡献 |
| 前置条件 | 已登录admin账户；存在含药材原料的配方；药材原料已设置per100g营养数据 |
| 测试步骤 | 1. 前端调用 `nutritionApi.calculateFormulaNutrition(formulaId)` <br> 2. 后端路由 `POST /nutrition/calculate/:formulaId` → `calculateFormulaNutrition` <br> 3. 后端查询配方原料列表，获取每种原料的per100g营养数据 <br> 4. 对药材类原料计算 ratio = (quantity / finishedWeight) × 0.18 <br> 5. 对辅料类原料计算 ratio = (quantity / finishedWeight) × 1.0 <br> 6. 累加 Σ(per100g营养素 × ratio) <br> 7. 返回 `FormulaNutritionResult` |
| 7层验证 | **操作**: 前端点击"计算营养"按钮 <br> **请求**: `POST /api/nutrition/calculate/{formulaId}` 无请求体 <br> **DB**: 查询 `formula_ingredients` + `material_nutrition` 表 <br> **Store**: `nutritionStore` 更新 `formulaNutrition` 状态 <br> **响应**: `{ success: true, data: { formulaId, per100g, nrv, energy, ingredients[] } }` <br> **展示**: 营养成分表格显示各营养素值 <br> **存储**: 计算结果缓存到 `nutrition_summaries` 表 |
| 预期结果 | 1. 药材原料的 ratio = (quantity / finishedWeight) × 0.18 <br> 2. 辅料原料的 ratio = (quantity / finishedWeight) × 1.0 <br> 3. per100g 各营养素值 = Σ(原料per100g × ratio) <br> 4. energy_kJ = protein×17 + fat×37 + carbohydrate×17 <br> 5. 前端表格展示值与后端计算值一致 |
| 优先级 | P0 |

#### I-NUTR02: 零界限归零 + 能量重算

| 项目 | 内容 |
|------|------|
| 用例ID | I-NUTR02 |
| 场景 | 营养素低于零界限时归零，归零后重新计算能量 |
| 前置条件 | 已登录；存在配方，其计算结果中某营养素低于零界限 |
| 测试步骤 | 1. 前端调用 `nutritionApi.analyzeFormula(formulaId)` <br> 2. 后端 `nutritionEngine.analyze()` 执行完整分析 <br> 3. 零界限判定：energy≤17kJ → 归零, protein≤0.5g → 归零, fat≤0.5g → 归零, carbohydrate≤0.5g → 归零, sodium≤5mg → 归零 <br> 4. 归零后**必须**重新计算能量：energy_kJ = protein×17 + fat×37 + carbohydrate×17 <br> 5. 返回 `NutritionAnalysisResult` 含 `nutritionLabel` |
| 7层验证 | **操作**: 前端点击"营养分析"按钮 <br> **请求**: `POST /api/nutrition/analyze/{formulaId}` <br> **DB**: 读取配方原料+营养数据 <br> **Store**: `nutritionStore` 更新分析结果 <br> **响应**: `{ success: true, data: { nutritionLabel: { per100g, nrvPercent, energyKj, calories }, ... } }` <br> **展示**: 营养标签中归零项显示"0"，能量值已重算 <br> **存储**: 分析结果含 `isZero` 标记 |
| 预期结果 | 1. protein=0.3g → 归零后 protein=0, isZero=true <br> 2. 归零后 energy_kJ = 0×17 + fat×37 + 0×17 (重新计算) <br> 3. 前端标签表 isZero=true 的行显示"0" <br> 4. 能量值与重算后一致，不是归零前的旧值 |
| 优先级 | P0 |

#### I-NUTR03: NRV% 计算

| 项目 | 内容 |
|------|------|
| 用例ID | I-NUTR03 |
| 场景 | 营养素 NRV% 参考值计算 |
| 前置条件 | 已登录；存在已计算营养的配方 |
| 测试步骤 | 1. 前端调用 `nutritionApi.calculateFormulaNutrition(formulaId)` <br> 2. 后端计算 NRV% = (营养素值 / NRV参考值) × 100 <br> 3. NRV参考值来自 `NRV_REFERENCE` 常量 <br> 4. 返回结果含 `nrv` 字段 |
| 7层验证 | **操作**: 前端查看营养成分表 <br> **请求**: `POST /api/nutrition/calculate/{formulaId}` <br> **DB**: 读取NRV参考值配置 <br> **Store**: `nutritionStore` 保存 nrv 数据 <br> **响应**: `nrv: { protein: 15.2, fat: 8.3, ... }` (百分比数值) <br> **展示**: NRV% 列显示 `15.2%`、`8.3%` 等 <br> **存储**: nrv 数据随计算结果一起存储 |
| 预期结果 | 1. NRV% = (营养素值 / NRV参考值) × 100 <br> 2. 无NRV参考值的营养素，nrv值为null <br> 3. 前端无NRV的行显示 `--` <br> 4. 精度：NRV% 保留1位小数 |
| 优先级 | P1 |

#### I-NUTR04: 营养方案 CRUD + 合规检查

| 项目 | 内容 |
|------|------|
| 用例ID | I-NUTR04 |
| 场景 | 创建/读取/更新/删除营养方案，并基于方案进行合规检查 |
| 前置条件 | 已登录admin账户；存在已计算营养的配方 |
| 测试步骤 | 1. **创建**: `nutritionApi.createProfile({ name, category, targetValues })` → `POST /nutrition/profiles` → 201 <br> 2. **读取**: `nutritionApi.getProfiles({ category })` → `GET /nutrition/profiles` → 200 <br> 3. **更新**: `nutritionApi.updateProfile(profileId, { name, targetValues })` → `PUT /nutrition/profiles/:profileId` → 200 <br> 4. **合规检查**: `nutritionApi.checkCompliance(formulaId, profileId)` → `POST /nutrition/compliance/:formulaId?profileId=xxx` → 200 <br> 5. **删除**: `nutritionApi.deleteProfile(profileId)` → `DELETE /nutrition/profiles/:profileId` → 200 |
| 7层验证 | **操作**: 前端营养方案管理页面 <br> **请求**: 5个HTTP请求依次发出 <br> **DB**: `nutrition_profiles` 表 CRUD + `compliance_reports` 表插入 <br> **Store**: `nutritionStore` 维护 profiles 列表 <br> **响应**: 创建返回 `{ profileId }`; 合规返回 `{ reportId, complianceCheck[], recommendations[], summary }` <br> **展示**: 合规结果展示 pass/warning/fail 状态 <br> **存储**: 合规报告持久化 |
| 预期结果 | 1. 创建成功返回 profileId，DB 有新记录 <br> 2. 列表包含新建的 profile <br> 3. 更新后 targetValues 已变更 <br> 4. 合规检查返回 pass/warning/fail 状态及建议 <br> 5. 预置方案(isPreset=true)不可修改/删除，返回 403 <br> 6. 删除后列表不再包含该 profile |
| 优先级 | P0 |

#### I-NUTR05: 数据覆盖率计算

| 项目 | 内容 |
|------|------|
| 用例ID | I-NUTR05 |
| 场景 | 配方原料的营养数据覆盖率统计 |
| 前置条件 | 已登录；存在含多个原料的配方，部分原料有营养数据、部分没有 |
| 测试步骤 | 1. 前端调用 `nutritionApi.getCoverage(formulaId)` <br> 2. 后端查询配方所有原料，统计有/无营养数据的原料数 <br> 3. 计算 coverageRate = withNutrition / totalMaterials × 100 <br> 4. 列出 missingMaterials <br> 5. 返回 `CoverageResult` |
| 7层验证 | **操作**: 前端查看营养覆盖率 <br> **请求**: `GET /api/nutrition/coverage/{formulaId}` <br> **DB**: 查询 `formula_ingredients` LEFT JOIN `material_nutrition` <br> **Store**: `nutritionStore` 保存 coverage 数据 <br> **响应**: `{ totalMaterials, withNutrition, coverageRate, missingMaterials[], weightCoverage?, confidenceLevel? }` <br> **展示**: 覆盖率百分比 + 缺失原料列表 <br> **存储**: 无额外存储（实时计算） |
| 预期结果 | 1. totalMaterials = 配方原料总数 <br> 2. withNutrition ≤ totalMaterials <br> 3. coverageRate = withNutrition / totalMaterials × 100 <br> 4. missingMaterials 列出所有无营养数据的原料 <br> 5. confidenceLevel 根据数据来源可信度判定 <br> 6. formulist 只能查看自己创建的配方的覆盖率 |
| 优先级 | P1 |

---

### 2.2 Salesmen 模块

#### I-CRUD01: 业务员 CRUD 全链路

| 项目 | 内容 |
|------|------|
| 用例ID | I-CRUD01 |
| 场景 | 业务员创建→查看→更新→删除完整流程 |
| 前置条件 | 已登录admin账户 |
| 测试步骤 | 1. **创建**: `salesmanApi.create({ name: "测试业务员", department: "华东区", phone: "13800000001" })` → `POST /salesmen` → 201 <br> 2. **列表**: `salesmanApi.getList({ keyword: "测试" })` → `GET /salesmen?keyword=测试` → 200 <br> 3. **详情**: `salesmanApi.getById(id)` → `GET /salesmen/:id` → 200 <br> 4. **更新**: `salesmanApi.update(id, { phone: "13800000002" })` → `PUT /salesmen/:id` → 200 <br> 5. **删除**: `salesmanApi.delete(id)` → `DELETE /salesmen/:id` → 200 |
| 7层验证 | **操作**: 前端业务员管理页面 <br> **请求**: 5个HTTP请求 <br> **DB**: `salesmen` 表 CRUD <br> **Store**: `salesmanStore` 维护列表 <br> **响应**: 创建返回完整 Salesman 对象(含自动生成的code: YWxxxxx); 列表返回分页结构; 删除返回 `{ success: true, message }` <br> **展示**: 列表刷新显示新业务员; 更新后电话号码已变更 <br> **存储**: DB记录完整 |
| 预期结果 | 1. 创建成功返回 Salesman 对象，code 自动生成(YW+5位数字) <br> 2. 列表可按 keyword/status/department 筛选 <br> 3. 详情返回完整字段(camelCase) <br> 4. 更新后字段已变更 <br> 5. 已被配方引用的业务员无法删除，返回 400 + 提示 <br> 6. 删除后列表不再包含该业务员 |
| 优先级 | P0 |

#### I-PERM01: 状态切换 (toggleStatus)

| 项目 | 内容 |
|------|------|
| 用例ID | I-PERM01 |
| 场景 | 业务员启用/停用状态切换 |
| 前置条件 | 已登录admin账户；存在 status=active 的业务员 |
| 测试步骤 | 1. 前端调用 `salesmanApi.toggleStatus(id, 'inactive')` → `PATCH /salesmen/:id/status` body: `{ status: 'inactive' }` <br> 2. 后端校验 status 值必须为 active/inactive <br> 3. 更新 DB <br> 4. 再次调用 `salesmanApi.toggleStatus(id, 'active')` 恢复 |
| 7层验证 | **操作**: 前端点击启用/停用按钮 <br> **请求**: `PATCH /api/salesmen/:id/status` <br> **DB**: `UPDATE salesmen SET status = ? WHERE id = ?` <br> **Store**: `salesmanStore` 更新列表中对应项的 status <br> **响应**: `{ success: true, data: { message: "业务员已停用" } }` <br> **展示**: 列表中该业务员状态标签变为"停用" <br> **存储**: DB status 字段已更新 |
| 预期结果 | 1. 停用成功返回 message "业务员已停用" <br> 2. 启用成功返回 message "业务员已启用" <br> 3. 传入非法 status 值返回 400 "无效的状态值" <br> 4. 前端列表状态标签实时更新 |
| 优先级 | P1 |

---

### 2.3 Reports 模块

#### I-CRUD01: 报表生成 + 查看 + 发布全链路

| 项目 | 内容 |
|------|------|
| 用例ID | I-CRUD01 |
| 场景 | 周报/月报生成→查看详情→发布完整流程 |
| 前置条件 | 已登录admin账户；存在销量数据和配方数据 |
| 测试步骤 | 1. **周期检查**: `reportApi.checkPeriodExists('weekly', '2026-06-01')` → `POST /reports/check-period` → 200 <br> 2. **生成**: `reportApi.generate({ type: 'weekly', periodStart: '2026-06-01', periodEnd: '2026-06-07' })` → `POST /reports/generate` → 201 <br> 3. **列表**: `reportApi.getList({ type: 'weekly' })` → `GET /reports?type=weekly` → 200 <br> 4. **详情**: `reportApi.getById(id)` → `GET /reports/:id` → 200 <br> 5. **发布**: `reportApi.publish(id)` → `POST /reports/:id/publish` → 200 |
| 7层验证 | **操作**: 前端报表管理页面 <br> **请求**: 5个HTTP请求 <br> **DB**: `reports` 表 INSERT + SELECT + UPDATE <br> **Store**: `reportStore` 维护报表列表和详情 <br> **响应**: 生成返回完整 Report(含 dataJson); 发布返回 status='published' + publishedAt <br> **展示**: 报表列表显示新报表; 详情页展示数据图表; 发布后状态标签变更 <br> **存储**: DB status 从 draft → published |
| 预期结果 | 1. 周期检查返回 `{ exists: false }` 允许生成 <br> 2. 生成成功返回 Report 对象，status='draft'，dataJson 含聚合数据 <br> 3. 重复生成同一周期返回 409 PERIOD_EXISTS <br> 4. 详情 dataJson 包含 formula/sales/plans 等聚合数据 <br> 5. 仅 admin 可发布，formulist 发布返回 403 <br> 6. 发布后 status='published'，publishedAt 有值 |
| 优先级 | P0 |

#### I-FILE01: 报表导出 (PDF/Excel) 链路

| 项目 | 内容 |
|------|------|
| 用例ID | I-FILE01 |
| 场景 | 单个报表导出为 PDF 和 Excel 文件 |
| 前置条件 | 已登录；存在已生成的报表 |
| 测试步骤 | 1. **导出PDF**: `reportApi.exportPdf(id)` → `GET /reports/:id/export/pdf` → Blob <br> 2. **导出Excel**: `reportApi.exportExcel(id)` → `GET /reports/:id/export/excel` → Blob <br> 3. 前端使用 `responseType: 'blob'` 接收 <br> 4. 前端创建下载链接触发浏览器下载 |
| 7层验证 | **操作**: 前端点击导出按钮 <br> **请求**: `GET /api/reports/:id/export/pdf` / `GET /api/reports/:id/export/excel` <br> **DB**: 查询 reports 表获取报表数据 <br> **Store**: 无状态变更 <br> **响应**: PDF → `Content-Type: application/pdf`; Excel → `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` <br> **展示**: 浏览器下载对话框弹出 <br> **存储**: 临时文件在服务端生成后发送 |
| 预期结果 | 1. PDF 响应 Content-Type 为 `application/pdf` <br> 2. Excel 响应 Content-Type 为 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` <br> 3. Content-Disposition 含文件名 <br> 4. 下载的文件可正常打开 <br> 5. 报表不存在返回 404 |
| 优先级 | P0 |

#### I-BATCH01: 批量导出 Excel

| 项目 | 内容 |
|------|------|
| 用例ID | I-BATCH01 |
| 场景 | 多个报表批量导出为一个 Excel 文件 |
| 前置条件 | 已登录admin；存在多个已生成的报表 |
| 测试步骤 | 1. 前端调用 `reportApi.batchExportExcel([id1, id2, id3])` → `POST /reports/batch-export/excel` body: `{ reportIds: [id1, id2, id3] }` → Blob <br> 2. 后端校验 reportIds 非空数组，最多20个 <br> 3. 后端查询所有报表数据，合并导出 <br> 4. 返回合并后的 Excel Blob |
| 7层验证 | **操作**: 前端选择多个报表点击批量导出 <br> **请求**: `POST /api/reports/batch-export/excel` <br> **DB**: 批量查询 reports 表 <br> **Store**: 无状态变更 <br> **响应**: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` <br> **展示**: 浏览器下载合并的 Excel 文件 <br> **存储**: 临时文件 |
| 预期结果 | 1. reportIds 为空返回 400 "reportIds 参数不能为空" <br> 2. reportIds 超过20个返回 400 "最多支持20个报告批量导出" <br> 3. formulist 只能导出自己创建或已发布的报表 <br> 4. 合并的 Excel 包含所有选中报表数据 <br> 5. 无可导出报表返回 404 |
| 优先级 | P1 |

#### I-CROSS01: 报表 AI 分析联动

| 项目 | 内容 |
|------|------|
| 用例ID | I-CROSS01 |
| 场景 | 报表生成后进行 AI 分析，分析结果保存回报表 |
| 前置条件 | 已登录admin；存在已生成的报表；AI 服务已配置 API Key |
| 测试步骤 | 1. **AI分析**: `reportApi.getAIAnalysis(reportData, 'weekly')` → `POST /reports/ai-analysis` body: `{ reportData, type }` → 200 (timeout: 120s) <br> 2. 后端调用 `aiService.chatCompletion()` 生成分析 <br> 3. **保存**: `reportApi.saveAIAnalysis(reportId, aiAnalysisData)` → `PUT /reports/:id/ai-analysis` body: `{ aiAnalysis }` → 200 |
| 7层验证 | **操作**: 前端点击"AI分析"按钮 <br> **请求**: `POST /api/reports/ai-analysis` (timeout: 120s) <br> **DB**: 无直接DB操作(分析); 更新 reports.data_json(保存) <br> **Store**: `reportStore` 保存 AI 分析结果 <br> **响应**: 分析返回 `{ analysis, model, usage, provider }`; 保存返回更新后的 Report <br> **展示**: AI 分析文本展示在报表详情页 <br> **存储**: AI 分析结果写入 dataJson.aiAnalysis |
| 预期结果 | 1. AI 分析返回中文分析文本 <br> 2. 未配置 AI Key 返回 503 "未配置AI模型" <br> 3. 保存后报表 dataJson 含 aiAnalysis 字段 <br> 4. formulist 只能保存自己创建的报表的 AI 分析 <br> 5. 前端展示分析结果含整体评估、关键指标、建议等 |
| 优先级 | P1 |

#### I-CMP01: 报表对比

| 项目 | 内容 |
|------|------|
| 用例ID | I-CMP01 |
| 场景 | 两个报表数据对比，计算差异 |
| 前置条件 | 已登录；存在两个不同周期的报表 |
| 测试步骤 | 1. 前端调用 `reportApi.compareReports(id1, id2)` → `POST /reports/compare` body: `{ reportId1, reportId2 }` → 200 <br> 2. 后端查询两个报表，计算 formula/sales/monthlySummary 差异 <br> 3. 返回 `CompareResult` |
| 7层验证 | **操作**: 前端选择两个报表进行对比 <br> **请求**: `POST /api/reports/compare` <br> **DB**: 查询2条 reports 记录 <br> **Store**: `reportStore` 保存对比结果 <br> **响应**: `{ report1, report2, diff: { formula: { newFormulaCount: { report1, report2, diff } }, sales: {...}, monthlySummary: {...} } }` <br> **展示**: 对比页面展示差异值(增减/百分比) <br> **存储**: 无额外存储 |
| 预期结果 | 1. diff 中各指标含 report1/report2/diff 三个值 <br> 2. diff = report2值 - report1值 <br> 3. 缺少 reportId1 或 reportId2 返回 400 <br> 4. 报表不存在返回 404 <br> 5. 前端对比图表正确展示增减趋势 |
| 优先级 | P2 |

---

### 2.4 Exports 模块

#### I-FILE01: 配方/原料导出 Excel 链路

| 项目 | 内容 |
|------|------|
| 用例ID | I-FILE01 |
| 场景 | 选择配方或原料，创建导出作业并下载 Excel 文件 |
| 前置条件 | 已登录；存在配方和原料数据 |
| 测试步骤 | 1. **获取可选数据**: `exportApi.getMaterials({ keyword })` → `GET /exports/materials` → 200 <br> 2. **创建作业**: `exportApi.createJob({ dataCategory: 'formula', exportType: 'excel', formulaIds: [id1] })` → `POST /exports/jobs` → 201 <br> 3. **查询作业状态**: `exportApi.getJob(jobId)` → `GET /exports/jobs/:jobId` → 200 <br> 4. **下载文件**: `exportApi.downloadFile(jobId)` → `GET /exports/jobs/:jobId/download` → Blob |
| 7层验证 | **操作**: 前端导出中心选择数据→创建导出→下载 <br> **请求**: 4个HTTP请求 <br> **DB**: `export_jobs` 表 INSERT + SELECT; `export_files` 临时文件 <br> **Store**: `exportStore` 维护作业列表 <br> **响应**: 创建返回 `{ jobId, status, fileName }`; 下载返回 Blob <br> **展示**: 作业列表显示进度; 完成后出现下载按钮 <br> **存储**: 导出文件存储在服务端 |
| 预期结果 | 1. getMaterials 返回分页的原料列表 <br> 2. 创建作业返回 jobId，status='processing' 或 'completed' <br> 3. 作业完成后 status='completed'，fileUrl 有值 <br> 4. 下载的 Excel 文件可正常打开 <br> 5. 配方不存在返回 404 |
| 优先级 | P0 |

#### I-FILE02: 导出作业生命周期 (创建→完成→下载)

| 项目 | 内容 |
|------|------|
| 用例ID | I-FILE02 |
| 场景 | 导出作业完整生命周期：创建 → processing → completed → 下载 |
| 前置条件 | 已登录；存在可导出的数据 |
| 测试步骤 | 1. **创建**: `exportApi.createJob({ dataCategory: 'material', exportType: 'excel', materialIds: [id1, id2] })` → 201 <br> 2. **轮询状态**: `exportApi.getJob(jobId)` → status='processing' → 继续轮询 <br> 3. **完成**: `exportApi.getJob(jobId)` → status='completed', progress=100, fileUrl 有值 <br> 4. **下载**: `exportApi.downloadFile(jobId)` → Blob <br> 5. **作业列表**: `exportApi.getJobs({ status: 'completed' })` → 列表含该作业 |
| 7层验证 | **操作**: 前端创建导出→等待→下载 <br> **请求**: 多次 GET 查询状态 + 最终 GET 下载 <br> **DB**: `export_jobs` 表状态流转 <br> **Store**: `exportStore` 轮询更新作业状态 <br> **响应**: 各阶段 status 不同: pending→processing→completed <br> **展示**: 进度条从 0→100%; 完成后显示下载按钮 <br> **存储**: 文件生成后存储路径写入 DB |
| 预期结果 | 1. 作业状态流转: pending → processing → completed <br> 2. processing 阶段 progress 递增 <br> 3. completed 时 fileUrl 和 fileName 有值 <br> 4. 下载的文件 Content-Type 正确 <br> 5. 作业列表可按 status 筛选 |
| 优先级 | P0 |

#### I-FILE03: 导出失败 → 重试链路

| 项目 | 内容 |
|------|------|
| 用例ID | I-FILE03 |
| 场景 | 导出作业失败后重试或重新导出 |
| 前置条件 | 已登录；存在 status='failed' 的导出作业 |
| 测试步骤 | 1. **查看失败作业**: `exportApi.getJob(failedJobId)` → status='failed', errorMessage 有值 <br> 2. **重试**: `exportApi.retryJob(failedJobId)` → `POST /exports/jobs/:jobId/retry` → 200 <br> 3. **重新导出**: `exportApi.reExportJob(jobId)` → `POST /exports/jobs/:jobId/re-export` → 200 <br> 4. **验证新作业**: `exportApi.getJob(jobId)` → status='processing' 或 'completed' |
| 7层验证 | **操作**: 前端点击重试/重新导出按钮 <br> **请求**: `POST /api/exports/jobs/:jobId/retry` 或 `POST /api/exports/jobs/:jobId/re-export` <br> **DB**: `export_jobs` 表状态更新 <br> **Store**: `exportStore` 更新作业状态 <br> **响应**: `{ jobId, status: 'processing' }` <br> **展示**: 作业状态从 failed → processing; 进度条重新开始 <br> **存储**: 原作业记录更新 |
| 预期结果 | 1. retry 只能对 failed 状态的作业执行，否则返回 400 "只能重试失败的任务" <br> 2. re-export 可对 completed 或 failed 作业执行 <br> 3. 重试/重新导出后作业重新进入 processing <br> 4. 作业不存在返回 404 <br> 5. 成功后可正常下载 |
| 优先级 | P1 |

#### I-EXP01: 导出内容与页面展示一致性

| 项目 | 内容 |
|------|------|
| 用例ID | I-EXP01 |
| 场景 | 导出的 Excel/PDF 内容与前端页面展示的数据一致 |
| 前置条件 | 已登录；存在已完成的导出作业 |
| 测试步骤 | 1. 前端查看配方详情页的原料列表和营养数据 <br> 2. 导出该配方为 Excel <br> 3. 打开 Excel 文件，对比数据 <br> 4. 同样测试 PDF 导出 |
| 7层验证 | **操作**: 前端查看数据→导出→对比 <br> **请求**: `POST /api/exports/jobs` + `GET /api/exports/jobs/:jobId/download` <br> **DB**: 同源数据查询 <br> **Store**: 导出数据与页面 Store 数据来源一致 <br> **响应**: 文件内容 <br> **展示**: 页面展示值与文件内容一致 <br> **存储**: 同一 DB 数据源 |
| 预期结果 | 1. Excel 中的原料名称、数量、单位与页面一致 <br> 2. 营养数据值与页面展示一致（精度相同） <br> 3. PDF 布局合理，数据完整 <br> 4. 数字格式（小数位数）与页面一致 |
| 优先级 | P1 |

#### I-FILE04: 公开分享链接 (无认证访问)

| 项目 | 内容 |
|------|------|
| 用例ID | I-FILE04 |
| 场景 | 创建分享链接，无认证用户通过公开链接访问 |
| 前置条件 | 已登录；存在可分享的配方 |
| 测试步骤 | 1. **创建分享**: `exportApi.createShare({ formulaId, shareType: 'link', expireDate: '2026-12-31', downloadLimit: 10 })` → `POST /exports/share` → 201 <br> 2. **获取分享列表**: `exportApi.getShares()` → `GET /exports/shares` → 200 <br> 3. **公开访问**: 无 Token 访问 `GET /api/exports/public/share/:shareId` → 200 <br> 4. **删除分享**: `exportApi.deleteShare(shareId)` → `DELETE /exports/share/:shareId` → 200 <br> 5. **验证删除**: 再次公开访问 → 404 |
| 7层验证 | **操作**: 前端创建分享→复制链接→无认证访问 <br> **请求**: `POST /api/exports/share` + `GET /api/exports/public/share/:shareId` (无Token) <br> **DB**: `export_shares` 表 CRUD <br> **Store**: `exportStore` 维护分享列表 <br> **响应**: 创建返回 `{ shareId, shareUrl }`; 公开访问返回分享内容 <br> **展示**: 分享链接可复制; 公开页面展示配方数据 <br> **存储**: 分享记录含下载计数 |
| 预期结果 | 1. 创建分享返回 shareId 和 shareUrl <br> 2. 公开链接无需 Token 即可访问 <br> 3. 过期链接返回 410 "分享链接已过期" <br> 4. 超出下载次数返回 410 "下载次数已达上限" <br> 5. 不存在的 shareId 返回 404 "分享不存在" <br> 6. 删除后公开访问返回 404 |
| 优先级 | P0 |

#### I-CRUD01: 导出模板 CRUD

| 项目 | 内容 |
|------|------|
| 用例ID | I-CRUD01 |
| 场景 | 导出模板的创建、查询、更新、删除 |
| 前置条件 | 已登录admin账户 |
| 测试步骤 | 1. **创建**: `exportApi.createTemplate({ name: '自定义模板', type: 'excel', category: 'formula', formatConfig: {...} })` → `POST /exports/templates` → 201 <br> 2. **列表**: `exportApi.getTemplates({ type: 'excel' })` → `GET /exports/templates?type=excel` → 200 <br> 3. **更新**: `exportApi.updateTemplate(templateId, { name: '更新模板名' })` → `PUT /exports/templates/:templateId` → 200 <br> 4. **删除**: `exportApi.deleteTemplate(templateId)` → `DELETE /exports/templates/:templateId` → 200 |
| 7层验证 | **操作**: 前端模板管理页面 <br> **请求**: 4个HTTP请求 <br> **DB**: `export_templates` 表 CRUD <br> **Store**: `exportStore` 维护模板列表 <br> **响应**: 创建返回 `{ templateId }`; 列表返回分页结构 <br> **展示**: 模板列表刷新; 更新后名称变更 <br> **存储**: DB 记录完整 |
| 预期结果 | 1. 创建成功返回 templateId <br> 2. 列表可按 type/category 筛选 <br> 3. 更新后模板属性已变更 <br> 4. 删除后列表不再包含该模板 <br> 5. 非admin用户获取配置时返回默认配置(不可修改) |
| 优先级 | P2 |

---

### 2.5 Sales 模块

#### I-CRUD01: 销量录入 CRUD

| 项目 | 内容 |
|------|------|
| 用例ID | I-CRUD01 |
| 场景 | 销量记录的创建、查询、更新、删除 |
| 前置条件 | 已登录admin账户；存在配方和业务员 |
| 测试步骤 | 1. **创建**: `salesApi.create({ formulaId, salesmanId, periodStart: '2026-06-01', quantity: 100, revenue: 5000 })` → `POST /sales` → 201 <br> 2. **列表**: `salesApi.getList({ formulaId })` → `GET /sales?formulaId=xxx` → 200 <br> 3. **按配方查询**: `salesApi.getByFormula(formulaId)` → `GET /sales/formula/:formulaId` → 200 <br> 4. **更新**: `salesApi.update(id, { quantity: 150, revenue: 7500 })` → `PUT /sales/:id` → 200 <br> 5. **删除**: `salesApi.delete(id)` → `DELETE /sales/:id` → 200 |
| 7层验证 | **操作**: 前端销量管理页面 <br> **请求**: 5个HTTP请求 <br> **DB**: `formula_sales` 表 CRUD <br> **Store**: `salesStore` 维护销量列表 <br> **响应**: 创建返回完整 SaleRecord(含 formulaName, salesmanName); 重复记录返回 409 DUPLICATE_ENTRY <br> **展示**: 列表显示销量记录; 更新后数值变更 <br> **存储**: DB 记录含 created_by |
| 预期结果 | 1. 创建成功返回 SaleRecord，含关联的 formulaName/salesmanName <br> 2. 同一配方+业务员+周期已有记录时，无 mergeMode 返回 409 <br> 3. mergeMode='accumulate' 时累加已有记录 <br> 4. mergeMode='replace' 时替换已有记录 <br> 5. periodStart 不得晚于当前月份 <br> 6. 删除成功返回 `{ id }` |
| 优先级 | P0 |

#### I-BATCH01: 批量录入销量

| 项目 | 内容 |
|------|------|
| 用例ID | I-BATCH01 |
| 场景 | 批量创建销量记录，含累加/替换模式 |
| 前置条件 | 已登录admin；存在多个配方和业务员 |
| 测试步骤 | 1. 前端调用 `salesApi.batchCreate({ records: [...], mergeMode: 'accumulate' })` → `POST /sales/batch` → 200 <br> 2. 后端逐条处理，返回 `BatchResult` |
| 7层验证 | **操作**: 前端批量录入弹窗 <br> **请求**: `POST /api/sales/batch` <br> **DB**: `formula_sales` 表批量 INSERT/UPDATE <br> **Store**: `salesStore` 更新列表 <br> **响应**: `{ total, succeeded, failed, skipped, results: [{ index, status, action, message }] }` <br> **展示**: 批量结果弹窗显示成功/失败/跳过数量 <br> **存储**: DB 记录含每条结果 |
| 预期结果 | 1. records 为空数组返回 400 "records必须是非空数组" <br> 2. 超过200条返回 400 "单次批量录入不得超过200条" <br> 3. 缺少必填字段(formulaId/salesmanId/periodStart)的记录 status='failed' <br> 4. quantity=0 且 revenue=0 的记录 status='skipped' <br> 5. 已有记录时按 mergeMode 处理: accumulate=累加, replace=替换 <br> 6. formulist 无权操作他人配方的记录 <br> 7. 返回结果中每条记录含 index/status/action/message |
| 优先级 | P0 |

#### I-CROSS01: 销量 → 报表联动

| 项目 | 内容 |
|------|------|
| 用例ID | I-CROSS01 |
| 场景 | 录入销量数据后，报表聚合数据应包含新录入的销量 |
| 前置条件 | 已登录admin；存在配方和业务员 |
| 测试步骤 | 1. **录入销量**: `salesApi.create({ formulaId, salesmanId, periodStart: '2026-06-01', quantity: 100, revenue: 5000 })` → 201 <br> 2. **生成周报**: `reportApi.generate({ type: 'weekly', periodStart: '2026-06-01', periodEnd: '2026-06-07' })` → 201 <br> 3. **验证报表数据**: 检查报表 dataJson.sales.weeklyQuantity 包含新录入的销量 <br> 4. **查看统计**: `salesApi.getStats({ periodStart: '2026-06-01', periodEnd: '2026-06-30' })` → 200 |
| 7层验证 | **操作**: 前端录入销量→生成报表→查看报表数据 <br> **请求**: 3个HTTP请求 <br> **DB**: `formula_sales` INSERT → `reports` INSERT(聚合查询) <br> **Store**: `salesStore` + `reportStore` 联动 <br> **响应**: 报表 dataJson 含销量汇总 <br> **展示**: 报表页面展示的销量数据与录入一致 <br> **存储**: 两张表数据一致 |
| 预期结果 | 1. 录入的销量出现在报表的 sales 汇总中 <br> 2. weeklyQuantity 包含新录入的数量 <br> 3. weeklyRevenue 包含新录入的金额 <br> 4. topFormulas 列表包含该配方 <br> 5. salesApi.getStats 的 totalQuantity/totalRevenue 包含新数据 |
| 优先级 | P0 |

---

### 2.6 Dashboard 模块

#### I-CROSS01: 仪表盘数据聚合 (配方 + 原料 + 销量)

| 项目 | 内容 |
|------|------|
| 用例ID | I-CROSS01 |
| 场景 | 仪表盘聚合展示配方数、原料数、销量统计、最近活动、销量趋势 |
| 前置条件 | 已登录；存在配方、原料、销量数据 |
| 测试步骤 | 1. **统计概览**: `dashboardApi.getStats()` → `GET /dashboard/stats` → 200 <br> 2. **最近活动**: `dashboardApi.getRecentActivity(10)` → `GET /dashboard/activity?limit=10` → 200 <br> 3. **销量趋势**: `dashboardApi.getSalesTrend('month')` → `GET /dashboard/sales-trend?period=month` → 200 <br> 4. 验证三个接口返回的数据与实际业务数据一致 |
| 7层验证 | **操作**: 前端仪表盘页面加载 <br> **请求**: 3个并行HTTP请求 <br> **DB**: 查询 `formulas` + `materials` + `formula_sales` 表 <br> **Store**: `dashboardStore` 保存统计数据 <br> **响应**: stats: `{ formulas, materials, sales: { quantity, revenue, formulaCount }, pendingTasks }`; activity: `[{ id, name, code, updatedAt, type }]`; trend: `[{ period, quantity, revenue, orderCount }]` <br> **展示**: 统计卡片显示数字; 活动列表显示最近更新; 趋势图表展示 <br> **存储**: 无额外存储(实时查询) |
| 预期结果 | 1. stats.formulas = DB 中配方总数(admin) / 自己创建的配方数(formulist) <br> 2. stats.sales.quantity = 当月销量合计 <br> 3. stats.sales.revenue = 当月销售额合计 <br> 4. activity 列表按 updatedAt 降序，最多 limit 条 <br> 5. trend 按 period 分组聚合 <br> 6. formulist 只能看到自己创建的数据 <br> 7. period 参数支持 week/month/year |
| 优先级 | P0 |

---

## 3. 契约验证用例

### 3.1 C-EP: 端点匹配

| 用例ID | 模块 | 前端URL | 后端路由 | 预期 |
|--------|------|---------|---------|------|
| C-EP-N01 | Nutrition | `/nutrition/material/:materialId` | `GET /material/:materialId` | 匹配 |
| C-EP-N02 | Nutrition | `/nutrition/material/:materialId` | `PUT /material/:materialId` | 匹配 |
| C-EP-N03 | Nutrition | `/nutrition/calculate/:formulaId` | `POST /calculate/:formulaId` | 匹配 |
| C-EP-N04 | Nutrition | `/nutrition/profiles` | `GET/POST /profiles` | 匹配 |
| C-EP-N05 | Nutrition | `/nutrition/profiles/:profileId` | `PUT/DELETE /profiles/:profileId` | 匹配 |
| C-EP-N06 | Nutrition | `/nutrition/compliance/:formulaId` | `POST /compliance/:formulaId` | 匹配 |
| C-EP-N07 | Nutrition | `/nutrition/analyze/:formulaId` | `POST /analyze/:formulaId` | 匹配 |
| C-EP-N08 | Nutrition | `/nutrition/coverage/:formulaId` | `GET /coverage/:formulaId` | 匹配 |
| C-EP-N09 | Nutrition | `/nutrition/tables/:formulaId` | `GET /tables/:formulaId` | 匹配 |
| C-EP-S01 | Salesmen | `/salesmen` | `GET/POST /` | 匹配 |
| C-EP-S02 | Salesmen | `/salesmen/:id` | `GET/PUT/DELETE /:id` | 匹配 |
| C-EP-S03 | Salesmen | `/salesmen/:id/status` | `PATCH /:id/status` | 匹配 |
| C-EP-R01 | Reports | `/reports` | `GET /` | 匹配 |
| C-EP-R02 | Reports | `/reports/generate` | `POST /generate` | 匹配 |
| C-EP-R03 | Reports | `/reports/check-period` | `POST /check-period` | 匹配 |
| C-EP-R04 | Reports | `/reports/data/weekly` | `GET /data/weekly` | 匹配 |
| C-EP-R05 | Reports | `/reports/data/monthly` | `GET /data/monthly` | 匹配 |
| C-EP-R06 | Reports | `/reports/targets` | `GET/POST /targets` | 匹配 |
| C-EP-R07 | Reports | `/reports/targets/:id` | `PUT/DELETE /targets/:id` | 匹配 |
| C-EP-R08 | Reports | `/reports/:id/export/pdf` | `GET /:id/export/pdf` | 匹配 |
| C-EP-R09 | Reports | `/reports/:id/export/excel` | `GET /:id/export/excel` | 匹配 |
| C-EP-R10 | Reports | `/reports/batch-export/excel` | `POST /batch-export/excel` | 匹配 |
| C-EP-R11 | Reports | `/reports/compare` | `POST /compare` | 匹配 |
| C-EP-R12 | Reports | `/reports/ai-analysis` | `POST /ai-analysis` | 匹配 |
| C-EP-R13 | Reports | `/reports/:id/ai-analysis` | `PUT /:id/ai-analysis` | 匹配 |
| C-EP-E01 | Exports | `/exports/statistics` | `GET /statistics` | 匹配 |
| C-EP-E02 | Exports | `/exports/config` | `GET/PUT /config` | 匹配 |
| C-EP-E03 | Exports | `/exports/materials` | `GET /materials` | 匹配 |
| C-EP-E04 | Exports | `/exports/reports` | `GET /reports` | 匹配 |
| C-EP-E05 | Exports | `/exports/templates` | `GET/POST /templates` | 匹配 |
| C-EP-E06 | Exports | `/exports/templates/:templateId` | `PUT/DELETE /templates/:templateId` | 匹配 |
| C-EP-E07 | Exports | `/exports/jobs` | `GET/POST /jobs` | 匹配 |
| C-EP-E08 | Exports | `/exports/jobs/:jobId` | `GET /jobs/:jobId` | 匹配 |
| C-EP-E09 | Exports | `/exports/jobs/:jobId/download` | `GET /jobs/:jobId/download` | 匹配 |
| C-EP-E10 | Exports | `/exports/jobs/:jobId/retry` | `POST /jobs/:jobId/retry` | 匹配 |
| C-EP-E11 | Exports | `/exports/jobs/:jobId/re-export` | `POST /jobs/:jobId/re-export` | 匹配 |
| C-EP-E12 | Exports | `/exports/share` | `POST /share` | 匹配 |
| C-EP-E13 | Exports | `/exports/shares` | `GET /shares` | 匹配 |
| C-EP-E14 | Exports | `/exports/share/:shareId` | `DELETE /share/:shareId` | 匹配 |
| C-EP-E15 | Exports | `/exports/public/share/:shareId` | `GET /public/share/:shareId` | 匹配(无认证) |
| C-EP-SA01 | Sales | `/sales` | `GET/POST /` | 匹配 |
| C-EP-SA02 | Sales | `/sales/stats` | `GET /stats` | 匹配 |
| C-EP-SA03 | Sales | `/sales/formula/:formulaId` | `GET /formula/:formulaId` | 匹配 |
| C-EP-SA04 | Sales | `/sales/batch` | `POST /batch` | 匹配 |
| C-EP-SA05 | Sales | `/sales/:id` | `PUT/DELETE /:id` | 匹配 |
| C-EP-D01 | Dashboard | `/dashboard/stats` | `GET /stats` | 匹配 |
| C-EP-D02 | Dashboard | `/dashboard/activity` | `GET /activity` | 匹配 |
| C-EP-D03 | Dashboard | `/dashboard/sales-trend` | `GET /sales-trend` | 匹配 |

### 3.2 C-METHOD: HTTP 方法

| 用例ID | 前端方法 | 预期HTTP方法 | 后端实际方法 | 预期 |
|--------|---------|-------------|-------------|------|
| C-METHOD-N01 | `nutritionApi.setMaterialNutrition` | PUT | PUT | 匹配 |
| C-METHOD-N02 | `nutritionApi.calculateFormulaNutrition` | POST | POST | 匹配 |
| C-METHOD-N03 | `nutritionApi.checkCompliance` | POST | POST | 匹配 |
| C-METHOD-N04 | `nutritionApi.analyzeFormula` | POST | POST | 匹配 |
| C-METHOD-S01 | `salesmanApi.toggleStatus` | PATCH | PATCH | 匹配 |
| C-METHOD-R01 | `reportApi.generate` | POST | POST | 匹配 |
| C-METHOD-R02 | `reportApi.publish` | POST | POST | 匹配 |
| C-METHOD-R03 | `reportApi.checkPeriodExists` | POST | POST | 匹配 |
| C-METHOD-R04 | `reportApi.compareReports` | POST | POST | 匹配 |
| C-METHOD-R05 | `reportApi.getAIAnalysis` | POST | POST | 匹配 |
| C-METHOD-R06 | `reportApi.saveAIAnalysis` | PUT | PUT | 匹配 |
| C-METHOD-E01 | `exportApi.retryJob` | POST | POST | 匹配 |
| C-METHOD-E02 | `exportApi.reExportJob` | POST | POST | 匹配 |
| C-METHOD-SA01 | `salesApi.batchCreate` | POST | POST | 匹配 |

### 3.3 C-REQ: 请求体

| 用例ID | 接口 | 前端发送字段 | 后端验证规则 | 预期 |
|--------|------|------------|-------------|------|
| C-REQ-N01 | `PUT /nutrition/material/:materialId` | `{ per100g, dataSource?, notes?, confidence? }` | per100g必填(object) | 匹配 |
| C-REQ-N02 | `POST /nutrition/profiles` | `{ name, description?, category, targetValues, toleranceRanges?, mandatoryFields? }` | name必填(1-100字), targetValues必填(object) | 匹配 |
| C-REQ-N03 | `PUT /nutrition/profiles/:profileId` | `{ name?, targetValues?, ... }` | name(1-100字), targetValues(object) | 匹配 |
| C-REQ-N04 | `POST /nutrition/compliance/:formulaId` | `{ profileId? }` (query) | 无validateBody | 匹配 |
| C-REQ-S01 | `POST /salesmen` | `{ name, code?, department?, phone?, email? }` | name必填(string) | 匹配 |
| C-REQ-S02 | `PATCH /salesmen/:id/status` | `{ status }` | 后端校验 active/inactive | 匹配 |
| C-REQ-R01 | `POST /reports/generate` | `{ type, periodStart, periodEnd, includePlans?, includeAIAnalysis? }` | type/periodStart/periodEnd必填 | 匹配 |
| C-REQ-R02 | `POST /reports/check-period` | `{ type, periodStart }` | type/periodStart必填 | 匹配 |
| C-REQ-R03 | `POST /reports/targets` | `{ periodType, periodStart, periodEnd, targetsJson? }` | periodType/periodStart/periodEnd必填 | 匹配 |
| C-REQ-R04 | `POST /reports/batch-export/excel` | `{ reportIds }` | reportIds必填(array) | 匹配 |
| C-REQ-E01 | `POST /exports/templates` | `{ name, type, category?, formatConfig, isDefault? }` | name/type/formatConfig必填 | 匹配 |
| C-REQ-E02 | `POST /exports/jobs` | `{ dataCategory, exportType, formulaIds?, materialIds?, ... }` | dataCategory/exportType必填 | 匹配 |
| C-REQ-E03 | `PUT /exports/config` | `{ configs: [{ configKey, configValue }] }` | configs必填(array) | 匹配 |
| C-REQ-SA01 | `POST /sales` | `{ formulaId, salesmanId?, periodType?, periodStart, quantity?, revenue?, notes?, mergeMode? }` | 后端校验 periodStart 必填 | 匹配 |
| C-REQ-SA02 | `POST /sales/batch` | `{ records: [...], mergeMode? }` | 后端校验 records 非空数组, ≤200条 | 匹配 |

### 3.4 C-RES: 响应体

| 用例ID | 接口 | 前端期望类型 | 后端实际返回 | 预期 |
|--------|------|------------|-------------|------|
| C-RES-N01 | `GET /nutrition/material/:materialId` | `MaterialNutrition \| null` | `success(data) \| { success: true, data: null }` | 匹配 |
| C-RES-N02 | `PUT /nutrition/material/:materialId` | `{ success, message }` | `success(null, "营养成分已保存")` | 匹配 |
| C-RES-N03 | `POST /nutrition/calculate/:formulaId` | `FormulaNutritionResult` | `success(result)` | 匹配 |
| C-RES-N04 | `POST /nutrition/profiles` | `{ profileId }` | `success(result, "营养标准创建成功")` 201 | 匹配 |
| C-RES-N05 | `POST /nutrition/compliance/:formulaId` | `ComplianceResult` | `success({ reportId, complianceCheck, recommendations, summary })` | 匹配 |
| C-RES-N06 | `POST /nutrition/analyze/:formulaId` | `NutritionAnalysisResult` | `success(result)` | 匹配 |
| C-RES-S01 | `POST /salesmen` | `Salesman` | `success(rowToCamelCase(salesman), "业务员创建成功")` 201 | 匹配 |
| C-RES-S02 | `GET /salesmen` | `{ list: Salesman[], pagination }` | `successWithPagination(...)` | 匹配 |
| C-RES-R01 | `POST /reports/generate` | `Report` | `success({...rowToCamelCase(created), dataJson}, "报告生成成功")` 201 | 匹配 |
| C-RES-R02 | `GET /reports/:id/export/pdf` | `Blob` | `Content-Type: application/pdf` + Buffer | 匹配 |
| C-RES-R03 | `GET /reports/:id/export/excel` | `Blob` | `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` + Buffer | 匹配 |
| C-RES-R04 | `POST /reports/compare` | `CompareResult` | `success({ report1, report2, diff })` | 匹配 |
| C-RES-R05 | `POST /reports/ai-analysis` | `AIAnalysisData` | `success({ analysis, model, usage, provider })` | 匹配 |
| C-RES-E01 | `GET /exports/jobs/:jobId/download` | `Blob` | `Content-Type` + sendFile | 匹配 |
| C-RES-E02 | `POST /exports/share` | `{ shareId, shareUrl }` | `success(result)` 201 | 匹配 |
| C-RES-SA01 | `POST /sales` | `SaleRecord` | `success(rowToCamelCase(created))` 201 | 匹配 |
| C-RES-SA02 | `POST /sales/batch` | `BatchResult` | `success({ total, succeeded, failed, skipped, results })` | 匹配 |
| C-RES-D01 | `GET /dashboard/stats` | `DashboardStats` | `success(stats)` | 匹配 |

### 3.5 C-CT: Content-Type

| 用例ID | 接口 | 请求CT | 响应CT | 预期 |
|--------|------|--------|--------|------|
| C-CT-01 | `GET /reports/:id/export/pdf` | - | `application/pdf` | 匹配 |
| C-CT-02 | `GET /reports/:id/export/excel` | - | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 匹配 |
| C-CT-03 | `POST /reports/batch-export/excel` | `application/json` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 匹配 |
| C-CT-04 | `GET /exports/jobs/:jobId/download` (excel) | - | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 匹配 |
| C-CT-05 | `GET /exports/jobs/:jobId/download` (pdf) | - | `application/pdf` | 匹配 |
| C-CT-06 | 所有JSON接口 | `application/json` | `application/json` | 匹配 |
| C-CT-07 | `GET /exports/public/share/:shareId` | - | `application/json` | 匹配 |

### 3.6 C-NAME: 字段命名

| 用例ID | 接口 | DB字段 | 后端转换 | 前端字段 | 预期 |
|--------|------|--------|---------|---------|------|
| C-NAME-S01 | Salesmen | `created_at` | `rowToCamelCase` | `createdAt` | camelCase |
| C-NAME-S02 | Salesmen | `created_by` | `rowToCamelCase` | `createdBy` | camelCase |
| C-NAME-R01 | Reports | `data_json` | `safeJsonParse` + `rowToCamelCase` | `dataJson` | camelCase |
| C-NAME-R02 | Reports | `period_start` | `rowToCamelCase` | `periodStart` | camelCase |
| C-NAME-R03 | Reports | `published_at` | `rowToCamelCase` | `publishedAt` | camelCase |
| C-NAME-R04 | Reports | `creator_name` | JOIN查询 | `creatorName` | camelCase |
| C-NAME-E01 | Exports | `template_id` | service层转换 | `templateId` | camelCase |
| C-NAME-E02 | Exports | `job_id` | service层转换 | `jobId` | camelCase |
| C-NAME-E03 | Exports | `share_id` | service层转换 | `shareId` | camelCase |
| C-NAME-SA01 | Sales | `formula_name` | JOIN + `rowsToCamelCase` | `formulaName` | camelCase |
| C-NAME-SA02 | Sales | `salesman_name` | JOIN + `rowsToCamelCase` | `salesmanName` | camelCase |
| C-NAME-SA03 | Sales | `period_type` | `rowsToCamelCase` | `periodType` | camelCase |

### 3.7 C-PREC: 数值精度

| 用例ID | 场景 | 精度规则 | 预期 |
|--------|------|---------|------|
| C-PREC-01 | 营养素 per100g 值 | 保留原始精度，不做截断 | 后端返回值与前端展示一致 |
| C-PREC-02 | 能量 energy_kJ | protein×17 + fat×37 + carbohydrate×17 | 精确计算 |
| C-PREC-03 | NRV% | (营养素值 / NRV参考值) × 100 | 保留1位小数 |
| C-PREC-04 | 合规检查 actualValue | `actualValue.toFixed(2)` | 2位小数 |
| C-PREC-05 | 销量增长率 | `Math.round(rate * 10) / 10` | 1位小数 |
| C-PREC-06 | 报表增长率 | `Math.round(rate * 1000) / 10` | 1位小数(百分比) |
| C-PREC-07 | 合规检查 tolerance 计算 | `Math.round(target * range * 100) / 100` | 2位小数 |
| C-PREC-08 | 金额 revenue | 数据库原始值 | .toFixed(2) 展示 |

### 3.8 C-PSTR: 分页结构

| 用例ID | 接口 | 前端期望 | 后端实际 | 预期 |
|--------|------|---------|---------|------|
| C-PSTR-S01 | `GET /salesmen` | `{ list, pagination: { page, pageSize, total, totalPages } }` | `successWithPagination(...)` | 匹配 |
| C-PSTR-R01 | `GET /reports` | `{ list, pagination }` | `successWithPagination(...)` | 匹配 |
| C-PSTR-E01 | `GET /exports/materials` | `{ list, pagination }` | `successWithPagination(...)` | 匹配 |
| C-PSTR-E02 | `GET /exports/reports` | `{ list, pagination }` | `successWithPagination(...)` | 匹配 |
| C-PSTR-E03 | `GET /exports/templates` | `{ list, pagination }` | `successWithPagination(...)` | 匹配 |
| C-PSTR-E04 | `GET /exports/jobs` | `{ list, pagination }` | `successWithPagination(...)` | 匹配 |
| C-PSTR-SA01 | `GET /sales` | `{ list, pagination }` | `successWithPagination(...)` | 匹配 |

### 3.9 C-ATOMIC: 事务原子性

| 用例ID | 场景 | 原子性要求 | 预期 |
|--------|------|-----------|------|
| C-ATOMIC-SA01 | 销量创建(重复检测+累加/替换) | 查询+更新应为原子操作 | 不会出现重复累加 |
| C-ATOMIC-SA02 | 批量销量录入 | 逐条处理，单条失败不影响其他 | 部分成功部分失败 |
| C-ATOMIC-R01 | 报表生成(周期检查+数据聚合+插入) | 周期检查与插入应防并发 | 重复生成返回409 |
| C-ATOMIC-R02 | 报表发布(权限检查+状态更新) | 权限校验与更新一致 | 非admin无法发布 |
| C-ATOMIC-E01 | 导出作业创建(数据查询+文件生成+状态更新) | 作业状态与文件一致 | 失败时status='failed' |
| C-ATOMIC-E02 | 分享链接下载计数 | 读取+递增+校验应原子 | 不超限下载 |
| C-ATOMIC-S01 | 业务员删除(引用检查+删除) | 检查与删除一致 | 有引用时无法删除 |

---

## 4. 测试覆盖率统计

### 4.1 模块覆盖率

| 模块 | 端点总数 | 联调场景数 | 契约用例数 | 场景覆盖率 |
|------|---------|-----------|-----------|-----------|
| Nutrition | 11 | 5 | 9 | 45.5% |
| Salesmen | 6 | 2 | 3 | 33.3% |
| Reports | 19 | 5 | 13 | 26.3% |
| Exports | 19 | 6 | 15 | 31.6% |
| Sales | 7 | 3 | 5 | 42.9% |
| Dashboard | 3 | 1 | 3 | 33.3% |
| **合计** | **65** | **22** | **48** | **33.8%** |

### 4.2 场景优先级分布

| 优先级 | 数量 | 用例ID |
|--------|------|--------|
| P0 | 12 | I-NUTR01, I-NUTR02, I-NUTR04, I-CRUD01(Salesmen), I-CRUD01(Reports), I-FILE01(Reports), I-FILE01(Exports), I-FILE02(Exports), I-FILE04(Exports), I-CRUD01(Sales), I-BATCH01(Sales), I-CROSS01(Dashboard) |
| P1 | 7 | I-NUTR03, I-NUTR05, I-PERM01, I-BATCH01(Reports), I-CROSS01(Reports), I-FILE03(Exports), I-EXP01(Exports) |
| P2 | 3 | I-CMP01(Reports), I-CRUD01(Exports), I-CROSS01(Sales) |

### 4.3 契约维度覆盖率

| 契约维度 | 用例数 | 覆盖端点数 | 说明 |
|---------|--------|-----------|------|
| C-EP 端点匹配 | 48 | 65 | 全端点覆盖 |
| C-METHOD HTTP方法 | 14 | 14 | 非GET/DELETE方法 |
| C-REQ 请求体 | 15 | 15 | 含验证规则的接口 |
| C-RES 响应体 | 18 | 18 | 关键响应类型 |
| C-CT Content-Type | 7 | 7 | JSON vs Blob |
| C-NAME 字段命名 | 12 | 12 | snake_case → camelCase |
| C-PREC 数值精度 | 8 | 8 | 营养/金额/百分比 |
| C-PSTR 分页结构 | 7 | 7 | 所有分页接口 |
| C-ATOMIC 事务原子性 | 7 | 7 | 关键写操作 |
| **合计** | **136** | - | - |

### 4.4 7层验证覆盖率

| 验证层 | 覆盖场景数 | 说明 |
|--------|-----------|------|
| 操作 (前端用户操作) | 22/22 | 全覆盖 |
| 请求 (HTTP请求) | 22/22 | 全覆盖 |
| DB (数据库操作) | 22/22 | 全覆盖 |
| Store (前端状态) | 22/22 | 全覆盖 |
| 响应 (HTTP响应) | 22/22 | 全覆盖 |
| 展示 (UI渲染) | 22/22 | 全覆盖 |
| 存储 (持久化) | 22/22 | 全覆盖 |

---

## 5. 附录

### 5.1 营养计算公式参考

```
ratio = (quantity / finishedWeight) × ratioFactor
  - 药材 ratioFactor = 0.18
  - 辅料 ratioFactor = 1.0

per100g[营养素] = Σ(原料per100g[营养素] × ratio)

energy_kJ = protein × 17 + fat × 37 + carbohydrate × 17

零界限归零:
  energy ≤ 17 kJ    → 归零
  protein ≤ 0.5 g   → 归零
  fat ≤ 0.5 g       → 归零
  carbohydrate ≤ 0.5 g → 归零
  sodium ≤ 5 mg     → 归零

归零后必须重新计算能量!

NRV% = (营养素值 / NRV参考值) × 100
```

### 5.2 导出作业状态流转

```
pending → processing → completed (可下载)
                    → failed (可retry/re-export)

retry: 仅 failed → processing
re-export: completed 或 failed → processing
```

### 5.3 数据隔离规则

| 角色 | 可见范围 |
|------|---------|
| admin | 全部数据 |
| formulist | 仅自己创建的数据 + 已发布(published)的报表 |

### 5.4 前端 Axios 拦截器行为

- 自动解包: 响应 `data` 字段直接返回
- 401: 清除 Token，跳转登录页
- 网络错误: 跳转 `/server-error`
- 业务错误: `MessagePlugin.error()` 自动提示
- `_silent: true`: 禁用自动错误提示
