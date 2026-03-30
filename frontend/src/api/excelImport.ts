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
  // 下载配方导入模板
  downloadTemplate() {
    return http.get('/import/formula/template', { responseType: 'blob' })
  },

  // 解析配方Excel文件
  async parseFormulaExcel(file: File): Promise<{ success: boolean; data: ParseResult; message?: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await http.post('/import/formula/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response as any
  },
}
