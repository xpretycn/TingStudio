# 技术方案：配方营养分析功能重构

## 1. 架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (Vue 3 + TDesign)                │
│  NutritionAnalysis.vue (重构)                            │
│  ├─ FormulaSelector          配方选择器                   │
│  ├─ NutritionLabelTable      营养标签表(GB 28050格式)      │
│  ├─ MaterialContribution     原料贡献分析                  │
│  ├─ DataCoverageCard         数据覆盖度                    │
│  ├─ NutritionClaimsCard      含量声称判定                  │
│  ├─ FortificationCheckCard   强化剂合规检查                │
│  └─ AnalysisSummaryCard      分析摘要                     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP API
┌──────────────────────▼──────────────────────────────────┐
│                    后端 (Express + TypeScript)            │
│  nutritionController.ts (重构)                            │
│  ├─ analyzeFormula()         一键分析入口                  │
│  ├─ getCoverage()            数据覆盖度                    │
│  └─ (现有接口保持兼容)                                     │
│                                                          │
│  NutritionEngine (统一计算引擎，重构)                       │
│  ├─ prepareData()            数据准备                     │
│  ├─ calculateRatios()        含量比计算                    │
│  ├─ aggregateNutrition()     营养贡献汇总                  │
│  ├─ calculateAtwater()       Atwater能量计算               │
│  ├─ calculateNRV()           NRV%计算                     │
│  ├─ applyZeroThreshold()     0界限归零                     │
│  ├─ recalculateEnergy()      归零后重算能量                 │
│  ├─ evaluateClaims()         含量声称判定(新增)             │
│  └─ checkFortification()     强化剂合规检查(新增)           │
│                                                          │
│  nutritionConstants.ts (扩展)                              │
│  ├─ NRV_REFERENCE            NRV参考值(GB 28050)          │
│  ├─ ZERO_THRESHOLD           0界限值(GB 28050)            │
│  ├─ CONTENT_CLAIMS           含量声称条件(GB 28050 C.1)    │
│  └─ FORTIFICATION_LIMITS     强化剂使用量(GB 14880 A.1)    │
└──────────────────────┬──────────────────────────────────┘
                       │ query()
┌──────────────────────▼──────────────────────────────────┐
│                    数据库 (SQLite/MySQL)                   │
│  material_nutrition    原料营养数据                        │
│  formula_nutrition_summaries  配方营养汇总(复用)           │
│  formulas             配方数据                            │
│  materials            原料数据                            │
└─────────────────────────────────────────────────────────┘
```

### 1.2 模块划分

| 模块 | 文件 | 职责 |
|------|------|------|
| 计算引擎 | `backend/src/services/formula/nutritionEngine.ts` | 统一营养计算入口 |
| 常量配置 | `backend/src/config/nutritionConstants.ts` | NRV、0界限、声称条件、强化剂标准 |
| 控制器 | `backend/src/controllers/nutritionController.ts` | API 入口，调用引擎 |
| 路由 | `backend/src/routes/nutrition.ts` | 路由定义 |
| 前端页面 | `frontend/src/views/nutrition/NutritionAnalysis.vue` | 重构主页面 |
| 前端组件 | `frontend/src/components/nutrition/` | 可复用子组件 |
| 前端API | `frontend/src/api/nutrition.ts` | API 调用层 |
| 前端Store | `frontend/src/stores/nutrition.ts` | 状态管理 |

### 1.3 依赖关系

```
NutritionAnalysis.vue
  → useNutritionStore()
    → nutrition API (http.ts)
      → /api/nutrition/analyze/:formulaId
        → nutritionController.analyzeFormula()
          → NutritionEngine.calculate()
            → nutritionConstants (NRV, thresholds, claims)
            → database query (material_nutrition, formulas, materials)
```

---

## 2. 计算引擎设计

### 2.1 NutritionEngine 类重构

```typescript
class NutritionEngine {
  // 输入
  private formula: FormulaInput;
  private materialsNutrition: Map<string, MaterialNutritionData>;

  // 中间结果
  private ratios: Map<string, number>;
  private aggregatedNutrition: Record<string, number>;
  private per100g: Record<string, number>;
  private nrvPercentages: Record<string, number>;

  // 最终输出
  private result: NutritionAnalysisResult;

  // 9步计算流程
  calculate(): NutritionAnalysisResult {
    this.prepareData();        // 1. 数据准备
    this.calculateRatios();    // 2. 含量比
    this.aggregateNutrition(); // 3. 营养汇总
    this.calculateAtwater();   // 4. Atwater能量
    this.calculateNRV();       // 5. NRV%
    this.applyZeroThreshold(); // 6. 0界限归零
    this.recalculateEnergy();  // 7. 归零后重算能量
    this.evaluateClaims();     // 8. 含量声称判定(新增)
    this.checkFortification(); // 9. 强化剂合规(新增)
    return this.result;
  }
}
```

### 2.2 新增方法详细设计

#### evaluateClaims() — 含量声称判定

```typescript
evaluateClaims(): ClaimResult[] {
  // 遍历 CONTENT_CLAIMS 配置
  // 对每项声称，检查 per100g[field] 是否满足条件
  // 返回 { claim, field, currentValue, threshold, satisfied, gap }
}
```

#### checkFortification() — 强化剂合规检查

```typescript
checkFortification(): FortificationResult[] {
  // 筛选 supplement 类型的原料
  // 对照 FORTIFICATION_LIMITS 检查使用量
  // 返回 { materialName, nutrient, usageAmount, minAllowed, maxAllowed, status }
}
```

### 2.3 数据覆盖度计算

```typescript
calculateCoverage(): CoverageResult {
  const totalMaterials = this.formula.materials.length;
  const withNutrition = this.formula.materials.filter(
    m => this.materialsNutrition.has(m.materialId)
  ).length;
  const coverageRate = withNutrition / totalMaterials;
  const missingMaterials = this.formula.materials.filter(
    m => !this.materialsNutrition.has(m.materialId)
  );
  return { totalMaterials, withNutrition, coverageRate, missingMaterials };
}
```

---

## 3. 前端重构设计

### 3.1 页面布局

```
┌─────────────────────────────────────────────────────────┐
│ 配方营养分析                                              │
├─────────────────────────────────────────────────────────┤
│ [配方选择器]  配方下拉 + 开始分析按钮                       │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 数据覆盖度 │ │ 达标率    │ │ 可用声称  │ │ 合规状态  │    │
│ │   85%    │ │   72%    │ │   3项    │ │   合规   │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────────────────┤
│ 分析摘要：该配方蛋白质含量丰富，可声称"高蛋白质"；            │
│ 钠含量偏高，建议关注。                                      │
├─────────────────────────────────────────────────────────┤
│ 营养成分表 (GB 28050 格式)                                │
│ ┌─────────────┬──────────┬────────┐                     │
│ │ 项目         │ 每100g   │ NRV%   │                     │
│ ├─────────────┼──────────┼────────┤                     │
│ │ 能量         │ 850 kJ   │ 10%    │                     │
│ │ 蛋白质       │ 15.2 g   │ 25%    │                     │
│ │ 脂肪         │ 2.1 g    │ 4%     │                     │
│ │ 碳水化合物    │ 68.5 g   │ 23%    │                     │
│ │ 钠           │ 350 mg   │ 18%    │                     │
│ │ ─────────── │ ──────── │ ────── │                     │
│ │ 膳食纤维     │ 3.2 g    │ 13%    │                     │
│ │ 钙           │ 180 mg   │ 23%    │                     │
│ │ ...          │ ...      │ ...    │                     │
│ └─────────────┴──────────┴────────┘                     │
├─────────────────────────────────────────────────────────┤
│ 含量声称判定                                              │
│ ✅ 高蛋白质 (15.2g ≥ 12g)   ✅ 低脂肪 (2.1g ≤ 3g)       │
│ ❌ 低钠 (350mg > 120mg)     ✅ 钙来源 (180mg ≥ 120mg)    │
├─────────────────────────────────────────────────────────┤
│ 原料贡献分析 (可展开/收起)                                  │
│ ┌──────────┬──────┬──────┬──────────────────────┐       │
│ │ 原料      │ 类型  │ 用量  │ 营养贡献(可展开)      │       │
│ ├──────────┼──────┼──────┼──────────────────────┤       │
│ │ 枸杞      │ 药材  │ 50g  │ 能量:12% 蛋白:8% ... │       │
│ │ 红枣      │ 药材  │ 30g  │ 能量:8%  蛋白:5% ... │       │
│ │ 冰糖      │ 辅料  │ 20g  │ 能量:15% 碳水:25%... │       │
│ └──────────┴──────┴──────┴──────────────────────┘       │
├─────────────────────────────────────────────────────────┤
│ 强化剂合规检查 (仅辅料)                                    │
│ ┌──────────┬──────────┬──────────┬──────────┐           │
│ │ 原料      │ 营养素    │ 使用量    │ 状态      │           │
│ ├──────────┼──────────┼──────────┼──────────┤           │
│ │ 维生素C   │ 维生素C   │ 1500mg/kg│ ✅ 合规   │           │
│ │ 乳酸钙    │ 钙       │ 8000mg/kg│ ⚠️ 偏高   │           │
│ └──────────┴──────────┴──────────┴──────────┘           │
└─────────────────────────────────────────────────────────┘
```

### 3.2 组件拆分

| 组件 | 文件 | 职责 |
|------|------|------|
| NutritionLabelTable | `components/nutrition/NutritionLabelTable.vue` | GB 28050 方框表格式 |
| MaterialContribution | `components/nutrition/MaterialContribution.vue` | 原料贡献分析表格 |
| DataCoverageCard | `components/nutrition/DataCoverageCard.vue` | 数据覆盖度卡片 |
| NutritionClaimsCard | `components/nutrition/NutritionClaimsCard.vue` | 含量声称判定 |
| FortificationCheckCard | `components/nutrition/FortificationCheckCard.vue` | 强化剂合规检查 |
| AnalysisSummaryCard | `components/nutrition/AnalysisSummaryCard.vue` | 分析摘要 |

### 3.3 状态管理

```typescript
// stores/nutrition.ts (重构)
export const useNutritionStore = defineStore('nutrition', () => {
  const analysisResult = ref<NutritionAnalysisResult | null>(null)
  const loading = ref(false)

  async function analyzeFormula(formulaId: string) {
    loading.value = true
    try {
      const res = await nutritionApi.analyzeFormula(formulaId)
      analysisResult.value = res
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: (error as Error).message || '分析失败' }
    } finally {
      loading.value = false
    }
  }

  return { analysisResult, loading, analyzeFormula }
})
```

---

## 4. 迁移策略

### 4.1 计算引擎统一

**当前问题**：
- `nutritionController.ts` 中 `calculateFormulaNutrition()` 和 `getFormulaNutritionTables()` 各自内联计算逻辑
- `nutritionEngine.ts` 有独立 7 步计算但未被调用

**迁移方案**：
1. 重构 `NutritionEngine` 为唯一计算入口，新增 `evaluateClaims()` 和 `checkFortification()`
2. 控制器中 `calculateFormulaNutrition()` 改为调用 `NutritionEngine.calculate()`
3. 控制器中 `getFormulaNutritionTables()` 改为调用 `NutritionEngine.calculate()` + 格式化输出
4. 新增 `analyzeFormula()` 控制器方法，返回完整分析结果（计算 + 声称 + 合规 + 覆盖度）
5. 保留现有 API 接口签名不变，确保向后兼容

### 4.2 前端页面重构

**当前问题**：
- NutritionAnalysis.vue 约 800+ 行，仪表盘风格，实用性差
- 统计卡片、助手提示等占位大但信息密度低

**重构方案**：
1. 重写 NutritionAnalysis.vue，聚焦"分析+解读"
2. 拆分为 6 个子组件
3. 移除不实用的仪表盘元素（统计卡片改为摘要卡片）
4. 移除"营养分析助手"动态提示
5. 移除"分析历史记录"（不在 MVP 范围）

### 4.3 常量配置扩展

**当前**：`nutritionConstants.ts` 已有 NRV_REFERENCE、ZERO_THRESHOLD、DEFAULT_RATIO_FACTORS

**新增**：
- `CONTENT_CLAIMS`：GB 28050 附录C.1 含量声称条件
- `FORTIFICATION_LIMITS`：GB 14880 附录A 强化剂使用量范围
- `NUTRIENT_LABELS`：营养素中文名称映射
- `NUTRIENT_UNITS`：营养素单位映射
- `NUTRIENT_ORDER`：营养素在标签中的显示顺序

---

## 5. 关键技术决策

| 决策 | 方案 | 理由 |
|------|------|------|
| 计算引擎 | 统一为 NutritionEngine 类 | 消除重复实现，便于测试和维护 |
| 营养标准 | 内置常量，不依赖 nutrition_profiles 表 | GB 28050/14880 是国标固定值，无需用户自定义 |
| 前端组件 | 拆分为 6 个子组件 | 降低单组件复杂度，提高可维护性 |
| API 设计 | 新增 /analyze 一键接口 | 减少前端多次请求，一次返回完整结果 |
| 向后兼容 | 保留现有 API 签名 | 不影响其他页面（NutritionProfiles 等）的调用 |
