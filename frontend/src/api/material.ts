import http from './http'

export interface Material {
  id: string
  name: string
  code: string
  unit: string
  stock: number
  materialType: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface MaterialForm {
  name: string
  code: string
  unit?: string
  stock?: number
  materialType?: string
}

export const materialApi = {
  getList(params?: { keyword?: string; page?: number; pageSize?: number }) {
    return http.get<any, { success: boolean; data: { list: Material[]; pagination: any } }>('/materials', { params })
  },
  getById(id: string) {
    return http.get<any, { success: boolean; data: Material }>(`/materials/${id}`)
  },
  create(data: MaterialForm) {
    return http.post<any, { success: boolean; message: string; data: Material }>('/materials', data)
  },
  update(id: string, data: Partial<MaterialForm>) {
    return http.put<any, { success: boolean; message: string; data: Material }>(`/materials/${id}`, data)
  },
  delete(id: string) {
    return http.delete<any, { success: boolean; message: string }>(`/materials/${id}`)
  },
  getByFormula(formulaId: string) {
    return http.get<any, { success: boolean; data: Material[] }>(`/materials/by-formula/${formulaId}`)
  },
}
