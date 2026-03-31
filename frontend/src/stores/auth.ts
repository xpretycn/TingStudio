import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, saveAuthData, clearAuthData, getCachedUser } from '@/api/auth'
import type { UserInfo, LoginParams, RegisterParams } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(getCachedUser())
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  const initAuth = () => {
    const cached = getCachedUser()
    if (cached) {
      user.value = cached
    }
  }

  const login = async (params: LoginParams) => {
    loading.value = true
    try {
      const res = await authApi.login(params)
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      const { user: userInfo, token } = res
      user.value = userInfo
      saveAuthData(userInfo, token)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '登录失败' }
    } finally {
      loading.value = false
    }
  }

  const register = async (params: RegisterParams) => {
    loading.value = true
    try {
      const res = await authApi.register(params)
      // axios 拦截器已经提取了 res.data，所以这里直接使用 res
      const { user: userInfo, token } = res
      user.value = userInfo
      saveAuthData(userInfo, token)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '注册失败' }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    clearAuthData()
    user.value = null
  }

  return {
    user,
    loading,
    isAuthenticated,
    initAuth,
    login,
    register,
    logout
  }
})
