import http, { setToken, removeToken } from './http'

export interface LoginParams { username: string; password: string }
export interface RegisterParams { username: string; password: string }
export interface UserInfo { id: string; username: string; role: string; createdAt: string }

export const authApi = {
  login(params: LoginParams) {
    return http.post<any, { success: boolean; message: string; data: { user: UserInfo; token: string } }>('/auth/login', params)
  },
  register(params: RegisterParams) {
    return http.post<any, { success: boolean; message: string; data: { user: UserInfo; token: string } }>('/auth/register', params)
  },
  getMe() {
    return http.get<any, { success: boolean; data: UserInfo }>('/auth/me')
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
