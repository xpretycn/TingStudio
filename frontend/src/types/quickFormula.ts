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

export interface QuickFormulaItem {
  id: string
  name: string
  status: 'draft' | 'published'
  ratioFactor: number
  supplementRatioFactor: number
  finishedWeight: number
  materials: QuickFormulaMaterial[]
  packagingPrice: number
  otherPrice: number
  profitMargin: number
  description: string | null
  preparationMethod: string | null
  salesmanId: string | null
  salesmanName: string | null
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface PublishData {
  salesmanId: string
  description: string
  preparationMethod?: string
}
