import http from './http'

export interface Salesman {
  id: string
  name: string
  code: string
  department: string | null
  phone: string | null
  email: string | null
  status: 'active' | 'inactive'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SalesmanForm {
  name: string
  code: string
  department?: string
  phone?: string
  email?: string
}

export const salesmanApi = {
  getList(params?: { keyword?: string; status?: string; department?: string; page?: number; pageSize?: number }) {
    return http.get<any, { success: boolean; data: { list: Salesman[]; pagination: any } }>('/salesmen', { params })
  },
  getById(id: string) {
    return http.get<any, { success: boolean; data: Salesman }>(`/salesmen/${id}`)
  },
  create(data: SalesmanForm) {
    return http.post<any, { success: boolean; message: string; data: Salesman }>('/salesmen', data)
  },
  update(id: string, data: Partial<SalesmanForm & { status?: string }>) {
    return http.put<any, { success: boolean; message: string; data: Salesman }>(`/salesmen/${id}`, data)
  },
  delete(id: string) {
    return http.delete<any, { success: boolean; message: string }>(`/salesmen/${id}`)
  },
}
