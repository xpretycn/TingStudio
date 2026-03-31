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
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, { list: Material[]; pagination: any }>('/materials', { params })
  },
  getById(id: string) {
    return http.get<any, Material>(`/materials/${id}`)
  },
  create(data: MaterialForm) {
    return http.post<any, Material>('/materials', data)
  },
  update(id: string, data: Partial<MaterialForm>) {
    return http.put<any, Material>(`/materials/${id}`, data)
  },
  delete(id: string) {
    return http.delete<any, { success: boolean; message: string }>(`/materials/${id}`)
  },
  getByFormula(formulaId: string) {
    return http.get<any, { success: boolean; data: Material[] }>(`/materials/by-formula/${formulaId}`)
  },
}
