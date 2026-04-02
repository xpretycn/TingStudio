import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, saveAuthData, clearAuthData, getCachedUser } from '@/api/auth'
import type { UserInfo, LoginParams, RegisterParams, UpdateProfileParams, ChangePasswordParams } from '@/api/auth'

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

  const updateProfile = async (params: UpdateProfileParams) => {
    loading.value = true
    try {
      const updatedUser = await authApi.updateProfile(params)
      user.value = updatedUser
      saveAuthData(updatedUser, localStorage.getItem('tingstudio_token') || '')
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (params: ChangePasswordParams) => {
    loading.value = true
    try {
      await authApi.changePassword(params)
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '修改密码失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const currentUser = await authApi.getMe()
      user.value = currentUser
      saveAuthData(currentUser, localStorage.getItem('tingstudio_token') || '')
    } catch {
      // 静默失败，不影响用户体验
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    initAuth,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    fetchCurrentUser
  }
})
