/**
 * Excel导入API
 */
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

export const excelImportApi = {
  downloadTemplate() {
    return http.get('/import/formula/template', { responseType: 'blob' })
  },

  async parseFormulaExcel(file: File): Promise<{ success: boolean; data: ParseResult; message?: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await http.post('/import/formula/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response as any
  },
}

// ─── 营养素 Excel 导入（专用） ──────────────────────

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

    return await http.post('/import/nutrition/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as any
  },
}
