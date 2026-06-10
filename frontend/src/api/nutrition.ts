import http from './http'

export interface NutritionProfile {
  profileId: string
  name: string
  description: string | null
  category: 'infant' | 'child' | 'adult' | 'elderly' | 'pregnant' | 'special'
  targetValues: Record<string, number>
  toleranceRanges: Record<string, unknown>[]
  mandatoryFields: string[]
  isPreset?: boolean
  createdAt: string
  updatedAt: string
}

export interface MaterialNutrition {
  materialId: string
  per100g: Record<string, number>
  dataSource: string | null
  notes: string | null
  confidence: 'high' | 'medium' | 'low' | null
  updatedAt: string
  fieldSources: Record<string, { sourceId: string; sourceType: string; sourceDetail: string }> | null
  sourceType: 'manual' | 'tianapi' | 'seed' | 'ai' | 'excel_import' | 'other' | null
  sourceDetail: string | null
}

interface FormulaNutritionResult {
  formulaId: string
  per100g: Record<string, number>
  nrv: Record<string, number>
  energy: number
  ingredients: Array<{
    materialId: string
    materialName: string
    ratio: number
    per100g: Record<string, number>
  }>
}

interface ComplianceResult {
  formulaId: string
  profileId: string
  profileName: string
  compliant: boolean
  violations: Array<{
    nutrient: string
    value: number
    min: number | null
    max: number | null
    severity: 'warning' | 'error'
  }>
}

export interface NutritionTableData {
  formulaId: string
  formulaName: string
  per100g: Record<string, number>
  nrv: Record<string, number>
  energy: number
  ingredients: Record<string, unknown>[]
}

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
  per100g: Record<string, number>
  nrvPercent: Record<string, number>
  energyKj: number
  calories: number
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

export const nutritionApi = {
  getMaterialNutrition(materialId: string, silent = false) {
    return http.get<unknown, MaterialNutrition>(`/nutrition/material/${materialId}`, { _silent: silent })
  },
  setMaterialNutrition(materialId: string, data: { per100g: Record<string, number>; dataSource?: string; notes?: string; confidence?: 'high' | 'medium' | 'low'; sourceType?: string }) {
    return http.put<unknown, { success: boolean; message: string }>(`/nutrition/material/${materialId}`, data)
  },
  calculateFormulaNutrition(formulaId: string) {
    return http.post<unknown, FormulaNutritionResult>(`/nutrition/calculate/${formulaId}`)
  },
  getProfiles(params?: { category?: string }) {
    return http.get<unknown, NutritionProfile[]>('/nutrition/profiles', { params })
  },
  createProfile(data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: Record<string, unknown>[]; mandatoryFields?: string[] }) {
    return http.post<unknown, { profileId: string }>('/nutrition/profiles', data)
  },
  updateProfile(profileId: string, data: { name: string; description?: string; category: string; targetValues: Record<string, number>; toleranceRanges?: Record<string, unknown>[]; mandatoryFields?: string[] }) {
    return http.put<unknown, { success: boolean; message: string }>(`/nutrition/profiles/${profileId}`, data)
  },
  deleteProfile(profileId: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/nutrition/profiles/${profileId}`)
  },
  checkCompliance(formulaId: string, profileId?: string) {
    const url = profileId
      ? `/nutrition/compliance/${formulaId}?profileId=${profileId}`
      : `/nutrition/compliance/${formulaId}`

    return http.post<unknown, ComplianceResult>(url, {})
  },
  getFormulaNutritionTables(formulaId: string) {
    return http.get<unknown, NutritionTableData>(`/nutrition/tables/${formulaId}`)
  },
  analyzeFormula(formulaId: string) {
    return http.post<unknown, NutritionAnalysisResult>(`/nutrition/analyze/${formulaId}`)
  },
  getCoverage(formulaId: string) {
    return http.get<unknown, CoverageResult>(`/nutrition/coverage/${formulaId}`)
  },
}
