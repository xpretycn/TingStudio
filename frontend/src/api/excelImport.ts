import http from './http'

export interface ParsedMaterial {
  materialId: string | null
  materialName: string
  materialCode: string
  materialType: string
  quantity: number
  unit: string
  nutrition: {
    protein: number
    fat: number
    carbohydrate: number
    sodium: number
  }
  isNew: boolean
}

export interface ParseResult {
  materials: ParsedMaterial[]
  errors: string[]
  warnings: string[]
  missingMaterials: string[]
  summary: {
    total: number
    existing: number
    new: number
    hasErrors: boolean
    hasMissingMaterials: boolean
  }
}

interface ParseFormulaResponse {
  success: boolean
  data: ParseResult
  message?: string
}

export const excelImportApi = {
  downloadTemplate() {
    return http.get('/import/formula/template', { responseType: 'blob' })
  },

  async parseFormulaExcel(file: File): Promise<ParseFormulaResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await http.post<unknown, ParseResult>('/import/formula/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return { success: true, data: response }
  },
}

export interface NutritionParseResult {
  nutritionData: Record<string, number>
  dataSource: string
  confidence: string
  notes: string
}

export const nutritionExcelApi = {
  downloadTemplate() {
    return http.get('/import/nutrition/template', { responseType: 'blob' })
  },

  async parse(file: File): Promise<NutritionParseResult> {
    const formData = new FormData()
    formData.append('file', file)

    return await http.post<unknown, NutritionParseResult>('/import/nutrition/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
