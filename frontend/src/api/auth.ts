import http, { setToken, removeToken } from './http'

export interface LoginParams { username: string; password: string }
export interface RegisterParams { username: string; password: string }
export interface UserInfo {
  id: string
  username: string
  role: string
  displayName?: string | null
  avatar?: string | null
  bio?: string | null
  email?: string | null
  phone?: string | null
  createdAt: string
}
export interface UpdateProfileParams {
  display_name?: string
  avatar?: string
  bio?: string
  email?: string
  phone?: string
}
export interface ChangePasswordParams {
  oldPassword: string
  newPassword: string
}

export const authApi = {
  login(params: LoginParams) {
    return http.post<any, { user: UserInfo; token: string }>('/auth/login', params)
  },
  register(params: RegisterParams) {
    return http.post<any, { user: UserInfo; token: string }>('/auth/register', params)
  },
  getMe() {
    return http.get<any, UserInfo>('/auth/me')
  },
  updateProfile(params: UpdateProfileParams) {
    return http.put<any, UserInfo>('/auth/profile', params)
  },
  changePassword(params: ChangePasswordParams) {
    return http.put<any, null>('/auth/password', params)
  },
}

/** 登录后保存 token 和用户信息 */
export function saveAuthData(user: UserInfo, token: string) {
  setToken(token)
  localStorage.setItem('tingstudio_user', JSON.stringify(user))
}

/** 清除认证信息 */
export function clearAuthData() {
  removeToken()
  localStorage.removeItem('tingstudio_user')
}

/** 从 localStorage 获取缓存的用户信息 */
export function getCachedUser(): UserInfo | null {
  const data = localStorage.getItem('tingstudio_user')
  return data ? JSON.parse(data) : null
}
