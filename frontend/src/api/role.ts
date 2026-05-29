import http from './http'

export interface Role {
  id: string
  name: string
  roleKey: string
  description: string
  isSystem: boolean
  permissionCount: number
  userCount: number
  createdAt: string
  updatedAt: string
}

export interface PermissionItem {
  id: string
  module: string
  action: string
  permissionKey: string
  label: string
  description: string
}

export interface RoleDetail extends Role {
  permissions: PermissionItem[]
}

export const roleApi = {
  getList() { return http.get<unknown, Role[]>('/roles') },
  getDetail(id: string) { return http.get<unknown, RoleDetail>(`/roles/${id}`) },
  create(data: { name: string; roleKey: string; description: string }) { return http.post<unknown, Role>('/roles', data) },
  update(id: string, data: { name: string; description: string }) { return http.put<unknown, Role>(`/roles/${id}`, data) },
  delete(id: string) { return http.delete<unknown, void>(`/roles/${id}`) },
  getPermissions(id: string) { return http.get<unknown, PermissionItem[]>(`/roles/${id}/permissions`) },
  updatePermissions(id: string, permissionIds: string[]) { return http.put<unknown, void>(`/roles/${id}/permissions`, { permissionIds }) },
}
