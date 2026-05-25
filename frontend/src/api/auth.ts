import http, { setToken, removeToken, USER_KEY } from './http'

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
    return http.post<unknown, { user: UserInfo; token: string }>('/auth/login', params)
  },
  register(params: RegisterParams) {
    return http.post<unknown, { user: UserInfo; token: string }>('/auth/register', params)
  },
  getMe() {
    return http.get<unknown, UserInfo>('/auth/me')
  },
  updateProfile(params: UpdateProfileParams) {
    return http.put<unknown, UserInfo>('/auth/profile', params)
  },
  changePassword(params: ChangePasswordParams) {
    return http.put<unknown, null>('/auth/password', params)
  },
}

function saveUser(user: UserInfo) {
  const json = JSON.stringify(user)
  sessionStorage.setItem(USER_KEY, json)
  localStorage.setItem(USER_KEY, json)
}

function clearUser() {
  sessionStorage.removeItem(USER_KEY)
  localStorage.removeItem(USER_KEY)
}

/** 登录后保存 token 和用户信息（双写 sessionStorage + localStorage） */
export function saveAuthData(user: UserInfo, token: string) {
  setToken(token)
  saveUser(user)
}

/** 仅更新用户信息缓存，不动 token */
export function saveUserOnly(user: UserInfo) {
  saveUser(user)
}

/** 清除认证信息（清除 sessionStorage + localStorage） */
export function clearAuthData() {
  removeToken()
  clearUser()
}

/** 获取缓存的用户信息（优先 sessionStorage，fallback localStorage） */
export function getCachedUser(): UserInfo | null {
  const data = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY)
  return data ? JSON.parse(data) : null
}
