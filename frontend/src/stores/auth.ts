import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { authApi, saveAuthData, saveUserOnly, clearAuthData, getCachedUser } from '@/api/auth'
import type { UserInfo, LoginParams, RegisterParams, UpdateProfileParams, ChangePasswordParams } from '@/api/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { useThemeStore } from '@/stores/theme'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const err = error as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string }
    return err.response?.data?.message || err.response?.data?.error?.message || err.message || fallback
  }
  return fallback
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(getCachedUser())
  const loading = ref(false)
  let preferencesInitialized = false

  const isAuthenticated = computed(() => !!user.value)

  /** 加载当前用户的偏好设置到相关 store */
  const syncUserPreferences = async () => {
    if (!user.value) return
    try {
      const preferencesStore = usePreferencesStore()
      const themeStore = useThemeStore()

      await preferencesStore.fetchPreferences()
      themeStore.applyPreferences({
        themeMode: preferencesStore.preferences.themeMode,
        brandColor: preferencesStore.preferences.brandColor,
      })
    } catch {
      // 偏好同步失败不应阻塞应用：使用默认主题即可
    }
  }

  /** 清理当前用户的本地偏好缓存 */
  const clearUserPreferences = () => {
    const currentUserId = user.value?.id
    if (!currentUserId) return
    usePreferencesStore().clearLocal(currentUserId)
    useThemeStore().clearLocal(currentUserId)
  }

  const initAuth = () => {
    const cached = getCachedUser()
    if (cached) {
      user.value = cached
      if (!preferencesInitialized) {
        preferencesInitialized = true
        syncUserPreferences()
      }
    }
  }

  const login = async (params: LoginParams) => {
    loading.value = true
    try {
      const res = await authApi.login(params)
      const { user: userInfo, token } = res
      user.value = userInfo
      saveAuthData(userInfo, token)
      preferencesInitialized = true
      await syncUserPreferences()
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, '登录失败') }
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
      preferencesInitialized = true
      await syncUserPreferences()
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: extractErrorMessage(error, '注册失败') }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    clearUserPreferences()
    clearAuthData()
    user.value = null
    preferencesInitialized = false
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

  const hasPermission = (permission: string): boolean => {
    if (!user.value) return false
    if (user.value.role === 'admin') return true
    const permissions = (user.value as UserInfo & { permissions?: string[] }).permissions
    return permissions?.includes(permission) ?? false
  }

  // 监听用户变化，自动重载对应用户的主题设置，防止品牌色跨用户污染
  watch(() => user.value?.id, (newUserId, oldUserId) => {
    if (newUserId && newUserId !== oldUserId) {
      const themeStore = useThemeStore()
      const cachedUser = getCachedUser()
      // admin 默认绿色，其他角色默认粉色
      const defaultBrand = cachedUser?.role === 'admin' ? 'green' : 'pink'
      themeStore.loadForUserWithDefault(newUserId, defaultBrand)
    }
  })

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
    fetchCurrentUser,
    hasPermission
  }
})
