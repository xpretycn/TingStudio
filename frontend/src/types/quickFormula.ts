export interface QuickFormulaMaterial {
  materialId: string
  materialName: string
  quantity: number
  materialType: "herb" | "supplement"
  unitPrice?: number | null
  nutrition?: Record<string, number>
  version?: number
}

export interface QuickFormulaData {
  ratioFactor: number
  supplementRatioFactor: number
  finishedWeight: number
  packagingPrice: number
  otherPrice: number
  profitMargin: number
  materials: QuickFormulaMaterial[]
}

export interface QuickFormulaDraft {
  formulaName: string
  formulaData: QuickFormulaData
  savedAt: string
}

export interface TemplateMaterial {
  materialId: string
  materialName: string
  quantity: number
  materialType: string
}

export interface FormulaTemplate {
  id: string
  name: string
  description: string | null
  ratioFactor: number
  supplementRatioFactor: number
  finishedWeight: number
  materials: TemplateMaterial[]
  packagingPrice: number
  otherPrice: number
  profitMargin: number
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface TemplateListParams {
  keyword?: string
  page?: number
  pageSize?: number
}
