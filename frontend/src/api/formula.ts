import http from './http'

export interface MaterialItem {
  materialId: string
  materialName: string
  quantity: number
}

export interface FormulaVersion {
  versionId: string
  formulaId: string
  versionNumber: string
  versionName: string | null
  changesJson: string | null
  snapshotJson: string
  status: string
  isCurrent: number
  createdBy: string
  createdAt: string
}

export interface Formula {
  id: string
  name: string
  salesmanId: string
  salesmanName: string
  materialsJson: string
  finishedWeight: number
  ratioFactor: number
  supplementRatioFactor: number
  description: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  materials?: MaterialItem[]
  versions?: FormulaVersion[]
}

export interface FormulaForm {
  name: string
  salesmanId: string
  materials: { materialId: string; materialName?: string; quantity: number }[]
  finishedWeight: number
  ratioFactor?: number
  supplementRatioFactor?: number
  description?: string
}

export const formulaApi = {
  getList(params?: { keyword?: string; salesmanId?: string; page?: number; pageSize?: number }) {
    return http.get<any, { success: boolean; data: { list: Formula[]; pagination: any } }>('/formulas', { params })
  },
  getById(id: string) {
    return http.get<any, { success: boolean; data: Formula }>(`/formulas/${id}`)
  },
  create(data: FormulaForm) {
    return http.post<any, { success: boolean; message: string; data: Formula }>('/formulas', data)
  },
  update(id: string, data: Partial<FormulaForm>) {
    return http.put<any, { success: boolean; message: string; data: Formula }>(`/formulas/${id}`, data)
  },
  delete(id: string) {
    return http.delete<any, { success: boolean; message: string }>(`/formulas/${id}`)
  },
  getByMaterial(materialId: string) {
    return http.get<any, { success: boolean; data: Formula[] }>(`/formulas/by-material/${materialId}`)
  },
}
