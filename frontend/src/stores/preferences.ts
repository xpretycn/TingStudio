import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, getCachedUser } from '@/api/auth'
import type { UserPreferences } from '@/api/auth'

const PREFS_STORAGE_KEY = 'ting-preferences'
const PREFS_KEY_PREFIX = 'ting-preferences'

function getUserId(): string | null {
  return getCachedUser()?.id || null
}

function getPrefsKey(userId?: string | null): string {
  const uid = userId || getUserId()
  return uid ? `${PREFS_KEY_PREFIX}-${uid}` : `${PREFS_KEY_PREFIX}-guest`
}

/** 迁移旧的全局 key 数据到 user-specific key */
function migrateOldPrefs(userId?: string | null): void {
  try {
    const oldData = localStorage.getItem(PREFS_STORAGE_KEY)
    if (!oldData) return
    const newKey = getPrefsKey(userId)
    if (localStorage.getItem(newKey)) return
    localStorage.setItem(newKey, oldData)
    localStorage.removeItem(PREFS_STORAGE_KEY)
  } catch { /* ignore */ }
}

const defaultPreferences: UserPreferences = {
  themeMode: 'auto',
  brandColor: 'pink',
  sidebarDefaultCollapsed: false,
  defaultHomePage: '/formulas',
  defaultPageSize: 8,
  formulaDefaultView: 'card',
  defaultExportFormat: 'excel',
  formulaDefaultSort: 'updatedAt',
}

export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = ref<UserPreferences>({ ...defaultPreferences })
  const loading = ref(false)

  function loadFromLocal(userId?: string): UserPreferences {
    migrateOldPrefs(userId)
    try {
      const stored = localStorage.getItem(getPrefsKey(userId))
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) }
      }
    } catch { /* ignore */ }
    return { ...defaultPreferences }
  }

  function saveToLocal(prefs: UserPreferences, userId?: string) {
    try {
      localStorage.setItem(getPrefsKey(userId), JSON.stringify(prefs))
    } catch { /* ignore */ }
  }

  /** 清理指定用户或所有用户的偏好设置本地缓存 */
  function clearLocal(userId?: string) {
    try {
      if (userId) {
        localStorage.removeItem(getPrefsKey(userId))
      } else {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key && key.startsWith(PREFS_KEY_PREFIX)) {
            localStorage.removeItem(key)
          }
        }
        localStorage.removeItem(PREFS_STORAGE_KEY)
      }
    } catch { /* ignore */ }
  }

  const fetchPreferences = async () => {
    loading.value = true
    try {
      const res = await authApi.getPreferences()
      const merged = { ...defaultPreferences, ...res }
      preferences.value = merged
      saveToLocal(merged)
      return { success: true }
    } catch (error: unknown) {
      const localPrefs = loadFromLocal()
      preferences.value = localPrefs
      return { success: false, message: error instanceof Error ? error.message : '获取偏好失败' }
    } finally {
      loading.value = false
    }
  }

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const merged = { ...preferences.value, ...newPrefs }
    preferences.value = merged
    saveToLocal(merged)

    try {
      await authApi.updatePreferences(merged)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '保存偏好失败' }
    }
  }

  const resetToDefault = async () => {
    preferences.value = { ...defaultPreferences }
    saveToLocal(defaultPreferences)
    try {
      await authApi.updatePreferences(defaultPreferences)
      return { success: true }
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '重置偏好失败' }
    }
  }

  // 初始化时尝试加载当前用户的本地缓存
  const localPrefs = loadFromLocal()
  preferences.value = localPrefs

  return {
    preferences,
    loading,
    defaultPreferences,
    fetchPreferences,
    updatePreferences,
    resetToDefault,
    clearLocal,
    loadFromLocal,
    saveToLocal,
  }
})
