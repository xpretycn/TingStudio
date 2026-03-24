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
  linkedCustomers?: any[]
  linkedFormulists?: any[]
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
  linkCustomer(salesmanId: string, data: { customerId: string; relationType?: string; startDate?: string; notes?: string }) {
    return http.post<any, { success: boolean; message: string; data: { id: string } }>(`/salesmen/${salesmanId}/customers`, data)
  },
  unlinkCustomer(relationId: string) {
    return http.delete<any, { success: boolean; message: string }>(`/salesmen/customers/${relationId}`)
  },
  linkFormulist(salesmanId: string, data: { formulistId: string; cooperationMode?: string; priority?: number; notes?: string }) {
    return http.post<any, { success: boolean; message: string; data: { id: string } }>(`/salesmen/${salesmanId}/formulists`, data)
  },
  addCommunicationLog(relationId: string, data: { type: string; content: string; attachmentUrls?: string[] }) {
    return http.post<any, { success: boolean; message: string }>(`/salesmen/relations/${relationId}/communications`, data)
  },
  getCommunicationLogs(relationId: string) {
    return http.get<any, { success: boolean; data: any[] }>(`/salesmen/relations/${relationId}/communications`)
  },
}
