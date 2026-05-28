# 变更日志：配方营养分析功能重构

## 项目信息

| 项目 | 值 |
|------|-----|
| 项目名称 | TingStudio 配方营养分析重构 |
| 版本 | v1.0 |
| 日期 | 2026-05-28 |
| 范围 | 后端 + 前端全栈 |

---

## 变更概要

将营养分析从"数据展示仪表盘"重构为"分析决策工具"，对标 GB 28050-2011 和 GB 14880-2012 国标。

---

## 后端变更

### 新增/重构文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `backend/src/config/nutritionConstants.ts` | 重构 | NRV 扩展至26项，新增 CONTENT_CLAIMS(16条)、FORTIFICATION_LIMITS(13条)、NUTRIENT_META(26项) |
| `backend/src/services/formula/nutritionEngine.ts` | 重构 | 统一计算引擎，新增 analyze()、evaluateClaims()、checkFortification()、calculateCoverage() |
| `backend/src/types/nutrition.ts` | 扩展 | 新增 NutritionAnalysisResult 等9个类型定义 |
| `backend/src/controllers/nutritionController.ts` | 扩展 | 新增 analyzeFormula()、getCoverage() 控制器函数 |
| `backend/src/routes/nutrition.ts` | 扩展 | 新增 POST /analyze/:formulaId、GET /coverage/:formulaId 路由 |
| `backend/src/services/formula/index.ts` | 扩展 | 导出新增类型 |

### API 变更

| 方法 | 路径 | 状态 | 说明 |
|------|------|------|------|
| POST | `/api/nutrition/analyze/:formulaId` | 新增 | 一键营养分析 |
| GET | `/api/nutrition/coverage/:formulaId` | 新增 | 数据覆盖度检查 |
| POST | `/api/nutrition/calculate/:formulaId` | 兼容 | 内部改用 NutritionEngine |
| GET | `/api/nutrition/tables/:formulaId` | 兼容 | 内部改用 NutritionEngine |
| POST | `/api/nutrition/compliance/:formulaId` | 兼容 | 内部改用 NutritionEngine |

---

## 前端变更

### 新增文件

| 文件 | 说明 |
|------|------|
| `frontend/src/components/nutrition/NutritionLabelTable.vue` | GB 28050 营养标签方框表 |
| `frontend/src/components/nutrition/MaterialContribution.vue` | 原料贡献分析表格 |
| `frontend/src/components/nutrition/DataCoverageCard.vue` | 数据覆盖度卡片 |
| `frontend/src/components/nutrition/NutritionClaimsCard.vue` | 含量声称判定卡片 |
| `frontend/src/components/nutrition/FortificationCheckCard.vue` | 强化剂合规检查卡片 |
| `frontend/src/components/nutrition/AnalysisSummaryCard.vue` | 分析摘要卡片 |

### 重构文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `frontend/src/views/nutrition/NutritionAnalysis.vue` | 重写 | 从仪表盘改为分析决策页面 |
| `frontend/src/api/nutrition.ts` | 扩展 | 新增9个类型定义 + 2个API方法 |
| `frontend/src/stores/nutrition.ts` | 扩展 | 新增 analysisResult 状态 + analyzeFormula action |

---

## 数据库变更

**无表结构变更**。国标数据以代码常量形式内置，不依赖数据库表。

---

## 测试结果

| 测试 | 结果 |
|------|------|
| nutritionEngine.test.ts | 15/15 通过 |
| nutritionConstants.test.ts | 8/8 通过 |
| API 接口测试 (POST /analyze) | 通过 |
| API 接口测试 (GET /coverage) | 通过 |
| 后端 TypeScript 编译 | 通过（无新增错误） |

---

## 部署说明

### 环境要求

- Node.js 20+
- 现有数据库无需迁移

### 启动命令

```bash
# 后端
cd backend && npm run dev

# 前端
cd frontend && npm run dev

# 生产构建
cd backend && npm run build:deploy
cd frontend && npm run build:deploy
```

### 注意事项

- 新增的 `/analyze` 和 `/coverage` 路由需要认证（authMiddleware）
- 现有 API 接口保持向后兼容
- 原料营养数据覆盖率取决于 `material_nutrition` 表中的数据完整度
