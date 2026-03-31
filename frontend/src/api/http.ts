import axios from 'axios'
import { MessagePlugin } from 'tdesign-vue-next'

const TOKEN_KEY = 'tingstudio_token'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：附加 JWT token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一错误处理
http.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.success === false) {
      MessagePlugin.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    // 返回实际的 data 字段，而不是整个响应对象
    return res.data
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('tingstudio_user')
      window.location.href = '/login'
      MessagePlugin.error('登录已过期，请重新登录')
    } else {
      MessagePlugin.error(msg)
    }
    return Promise.reject(error)
  }
)

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export default http
