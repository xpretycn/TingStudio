import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, saveAuthData, saveUserOnly, clearAuthData, getCachedUser } from '@/api/auth'
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '登录失败' }
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '注册失败' }
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
      const currentUserId = user.value?.id
      const updatedUser = await authApi.updateProfile(params)
      if (updatedUser.id === currentUserId) {
        user.value = updatedUser
        saveUserOnly(updatedUser)
      }
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '更新失败' }
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (params: ChangePasswordParams) => {
    loading.value = true
    try {
      await authApi.changePassword(params)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '修改密码失败' }
    } finally {
      loading.value = false
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const currentUserId = user.value?.id
      const currentUser = await authApi.getMe()
      if (currentUser.id === currentUserId) {
        user.value = currentUser
        saveUserOnly(currentUser)
      }
    } catch {
      // ignore refresh failure
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
