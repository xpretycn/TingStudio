import http from './http'

// ─── 类型定义 ───

export interface AIModel {
  provider: string
  name: string
  model: string
  description: string
  supportsVision: boolean
  configured?: boolean
}

export interface AIModelList {
  available: AIModel[]
  all: AIModel[]
}

export interface ParsedMaterial {
  name: string
  quantity: number
  unit: string
  materialId?: string
  matched?: boolean
}

export interface ParsedFormula {
  name: string
  salesmanName?: string
  formulaDate?: string
  materials: ParsedMaterial[]
  finishedWeight?: number
  description?: string
  confidence?: number
  model?: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export interface SearchResult {
  sql: string
  originalSQL: string
  rows: Record<string, any>[]
  rowCount: number
  model: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

// ─── API 接口 ───

export const aiApi = {
  /** 获取可用模型列表 */
  getModels() {
    return http.get<any, AIModelList>('/ai/models')
  },

  /** AI 解析配方文件 */
  parseFormula(file: File, provider: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', provider)
    return http.post<any, ParsedFormula>('/ai/parse-formula', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    })
  },

  /** 自然语言检索 */
  naturalSearch(queryText: string, provider: string) {
    return http.post<any, SearchResult>('/ai/natural-search', {
      query: queryText,
      model: provider,
    }, {
      timeout: 60_000,
    })
  },
}
