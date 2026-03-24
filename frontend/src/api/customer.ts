import http from './http'

export interface Customer {
  id: string
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CustomerForm {
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

export interface PageResult<T> {
  list: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export const customerApi = {
  getList(params?: { keyword?: string; page?: number; pageSize?: number }) {
    return http.get<any, { success: boolean; data: PageResult<Customer> }>('/customers', { params })
  },
  getById(id: string) {
    return http.get<any, { success: boolean; data: Customer }>(`/customers/${id}`)
  },
  create(data: CustomerForm) {
    return http.post<any, { success: boolean; message: string; data: Customer }>('/customers', data)
  },
  update(id: string, data: Partial<CustomerForm>) {
    return http.put<any, { success: boolean; message: string; data: Customer }>(`/customers/${id}`, data)
  },
  delete(id: string) {
    return http.delete<any, { success: boolean; message: string }>(`/customers/${id}`)
  },
}
