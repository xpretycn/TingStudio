import http from './http'
import type { Pagination } from './http'

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
  code?: string
  department?: string
  phone?: string
  email?: string
}

export const salesmanApi = {
  getList(params?: { keyword?: string; status?: string; department?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: Salesman[]; pagination: Pagination }>('/salesmen', { params })
  },
  getById(id: string) {
    return http.get<unknown, Salesman>(`/salesmen/${id}`)
  },
  create(data: SalesmanForm) {
    return http.post<unknown, Salesman>('/salesmen', data)
  },
  update(id: string, data: Partial<SalesmanForm & { status?: string }>) {
    return http.put<unknown, Salesman>(`/salesmen/${id}`, data)
  },
  delete(id: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/salesmen/${id}`)
  },
  toggleStatus(id: string, status: 'active' | 'inactive') {
    return http.patch<unknown, { success: boolean; message: string }>(`/salesmen/${id}/status`, { status })
  },
}
