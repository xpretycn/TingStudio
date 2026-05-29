import http from './http'
import type { PermissionItem } from './role'

export interface PermissionGroup {
  module: string
  moduleLabel: string
  permissions: PermissionItem[]
}

export const permissionApi = {
  getList() { return http.get<unknown, PermissionGroup[]>('/permissions') },
}
