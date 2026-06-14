import http, { type Pagination } from "./http";

export interface UserManageItem {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  roleId: string | null;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

export const userManageApi = {
  getList(params?: { keyword?: string; roleId?: string; isActive?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: UserManageItem[]; pagination: Pagination }>("/users", { params });
  },
  createUser(params: { username: string; password: string; role?: string; displayName?: string }) {
    return http.post<unknown, UserManageItem>("/users", params);
  },
  updateRole(userId: string, roleId: string) {
    return http.put<unknown, void>(`/users/${userId}/role`, { roleId });
  },
  updateStatus(userId: string, isActive: boolean) {
    return http.put<unknown, void>(`/users/${userId}/status`, { isActive });
  },
};
