# 接口文档：配方营养分析功能重构

## 1. 新增接口

### 1.1 一键营养分析

**POST** `/api/nutrition/analyze/:formulaId`

对指定配方执行完整营养分析，返回：营养标签、原料贡献、数据覆盖度、含量声称判定、强化剂合规检查。

#### 请求

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| formulaId | path | string | 是 | 配方ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "formulaId": "uuid",
    "formulaName": "枸杞红枣茶",
    "finishedWeight": 500,
    "ratioFactor": 0.18,
    "supplementRatioFactor": 1.0,

    "coverage": {
      "totalMaterials": 5,
      "withNutrition": 4,
      "coverageRate": 0.8,
      "missingMaterials": [
        {
          "materialId": "uuid",
          "materialName": "桂花",
          "materialType": "herb"
        }
      ]
    },

    "nutritionLabel": {
      "items": [
        {
          "field": "energy",
          "label": "能量",
          "value": 850,
          "unit": "kJ",
          "nrvPercent": 10,
          "isZero": false,
          "isCore": true
        },
        {
          "field": "protein",
          "label": "蛋白质",
          "value": 15.2,
          "unit": "g",
          "nrvPercent": 25,
          "isZero": false,
          "isCore": true
        }
      ]
    },

    "materialContributions": [
      {
        "materialId": "uuid",
        "materialName": "枸杞",
        "materialType": "herb",
        "quantity": 50,
        "ratio": 0.018,
        "hasNutritionData": true,
        "contributions": {
          "energy": 102,
          "protein": 1.8,
          "fat": 0.3,
          "carbohydrate": 12.5,
          "sodium": 15
        },
        "contributionPercent": {
          "energy": 12,
          "protein": 8,
          "fat": 5,
          "carbohydrate": 15,
          "sodium": 4
        }
      }
    ],

    "claims": [
      {
        "claim": "高蛋白质",
        "field": "protein",
        "currentValue": 15.2,
        "threshold": 12,
        "unit": "g",
        "satisfied": true,
        "gap": 3.2,
        "standard": "GB 28050 附录C.1"
      },
      {
        "claim": "低脂肪",
        "field": "fat",
        "currentValue": 2.1,
        "threshold": 3,
        "unit": "g",
        "satisfied": true,
        "gap": -0.9,
        "standard": "GB 28050 附录C.1"
      },
      {
        "claim": "低钠",
        "field": "sodium",
        "currentValue": 350,
        "threshold": 120,
        "unit": "mg",
        "satisfied": false,
        "gap": 230,
        "standard": "GB 28050 附录C.1"
      }
    ],

    "fortificationChecks": [
      {
        "materialId": "uuid",
        "materialName": "维生素C",
        "nutrient": "vitaminC",
        "usageAmountPerKg": 1500,
        "unit": "mg/kg",
        "minAllowed": 1000,
        "maxAllowed": 2250,
        "status": "compliant",
        "standard": "GB 14880 附录A 固体饮料类"
      },
      {
        "materialId": "uuid",
        "materialName": "乳酸钙",
        "nutrient": "calcium",
        "usageAmountPerKg": 12000,
        "unit": "mg/kg",
        "minAllowed": 2500,
        "maxAllowed": 10000,
        "status": "exceeded",
        "standard": "GB 14880 附录A 固体饮料类"
      }
    ],

    "summary": {
      "coverageLevel": "warning",
      "complianceLevel": "good",
      "claimsCount": 3,
      "fortificationStatus": "warning",
      "oneLineSummary": "该配方蛋白质含量丰富，可声称\"高蛋白质\"；钙强化剂使用量偏高，建议调整"
    },

    "calculatedAt": "2026-05-28T10:00:00.000Z"
  }
}
```

#### 错误响应

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 401 | UNAUTHORIZED | 未认证 |
| 403 | FORBIDDEN | 无权分析该配方（formulist 非自己创建） |
| 404 | NOT_FOUND | 配方不存在 |
| 400 | VALIDATION_ERROR | 配方无原料或成品重量为0 |

---

### 1.2 数据覆盖度检查

**GET** `/api/nutrition/coverage/:formulaId`

获取指定配方的原料营养数据覆盖度。

#### 请求

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| formulaId | path | string | 是 | 配方ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "formulaId": "uuid",
    "totalMaterials": 5,
    "withNutrition": 4,
    "coverageRate": 0.8,
    "missingMaterials": [
      {
        "materialId": "uuid",
        "materialName": "桂花",
        "materialType": "herb"
      }
    ],
    "weightCoverage": 0.92,
    "confidenceLevel": "medium"
  }
}
```

---

## 2. 现有接口（保持兼容）

以下接口签名不变，内部实现改为调用 NutritionEngine：

| 方法 | 路径 | 变更说明 |
|------|------|---------|
| GET | `/nutrition/material/:materialId` | 无变更 |
| PUT | `/nutrition/material/:materialId` | 无变更 |
| POST | `/nutrition/calculate/:formulaId` | 内部改用 NutritionEngine，响应格式不变 |
| GET | `/nutrition/tables/:formulaId` | 内部改用 NutritionEngine，响应格式不变 |
| GET | `/nutrition/profiles` | 无变更 |
| POST | `/nutrition/profiles` | 无变更 |
| PUT | `/nutrition/profiles/:profileId` | 无变更 |
| DELETE | `/nutrition/profiles/:profileId` | 无变更 |
| POST | `/nutrition/compliance/:formulaId` | 内部改用 NutritionEngine + 新声称判定逻辑 |

---

## 3. 前端 API 层

### 3.1 新增方法

```typescript
// frontend/src/api/nutrition.ts

export function analyzeFormula(formulaId: string): Promise<NutritionAnalysisResult> {
  return http.post(`/nutrition/analyze/${formulaId}`)
}

export function getCoverage(formulaId: string): Promise<CoverageResult> {
  return http.get(`/nutrition/coverage/${formulaId}`)
}
```

### 3.2 新增类型定义

```typescript
export interface NutritionAnalysisResult {
  formulaId: string
  formulaName: string
  finishedWeight: number
  ratioFactor: number
  supplementRatioFactor: number
  coverage: CoverageResult
  nutritionLabel: NutritionLabelResult
  materialContributions: MaterialContributionItem[]
  claims: ClaimResult[]
  fortificationChecks: FortificationCheckItem[]
  summary: AnalysisSummary
  calculatedAt: string
}

export interface CoverageResult {
  totalMaterials: number
  withNutrition: number
  coverageRate: number
  missingMaterials: MissingMaterial[]
  weightCoverage?: number
  confidenceLevel?: "high" | "medium" | "low"
}

export interface MissingMaterial {
  materialId: string
  materialName: string
  materialType: string
}

export interface NutritionLabelItem {
  field: string
  label: string
  value: number
  unit: string
  nrvPercent: number | null
  isZero: boolean
  isCore: boolean
}

export interface NutritionLabelResult {
  items: NutritionLabelItem[]
}

export interface MaterialContributionItem {
  materialId: string
  materialName: string
  materialType: string
  quantity: number
  ratio: number
  hasNutritionData: boolean
  contributions: Record<string, number>
  contributionPercent: Record<string, number>
}

export interface ClaimResult {
  claim: string
  field: string
  currentValue: number
  threshold: number
  unit: string
  satisfied: boolean
  gap: number
  standard: string
}

export interface FortificationCheckItem {
  materialId: string
  materialName: string
  nutrient: string
  usageAmountPerKg: number
  unit: string
  minAllowed: number | null
  maxAllowed: number | null
  status: "compliant" | "below_min" | "exceeded" | "not_in_standard"
  standard: string
}

export interface AnalysisSummary {
  coverageLevel: "good" | "warning" | "poor"
  complianceLevel: "good" | "warning" | "poor"
  claimsCount: number
  fortificationStatus: "compliant" | "warning" | "non_compliant"
  oneLineSummary: string
}
```
