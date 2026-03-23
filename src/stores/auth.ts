import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginForm, RegisterForm, AuthState } from '@/types/user'
import { storageService } from '@/api/storage'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  const initAuth = () => {
    const currentUser = storageService.getCurrentUser()
    if (currentUser) {
      user.value = currentUser
    }
  }

  const login = async (loginForm: LoginForm) => {
    loading.value = true
    try {
      const currentUser = storageService.login(loginForm)
      user.value = currentUser
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '登录失败' }
    } finally {
      loading.value = false
    }
  }

  const register = async (registerForm: RegisterForm) => {
    loading.value = true
    try {
      const newUser = storageService.register(registerForm)
      user.value = newUser
      return { success: true }
    } catch (error: any) {
      return { success: false, message: error.message || '注册失败' }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    storageService.logout()
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
