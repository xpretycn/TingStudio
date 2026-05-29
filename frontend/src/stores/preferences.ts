import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import type { UserPreferences } from '@/api/auth'

const PREFS_STORAGE_KEY = 'ting-preferences'

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

  function loadFromLocal(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY)
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) }
      }
    } catch { /* ignore */ }
    return { ...defaultPreferences }
  }

  function saveToLocal(prefs: UserPreferences) {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
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

  const localPrefs = loadFromLocal()
  preferences.value = localPrefs

  return {
    preferences,
    loading,
    defaultPreferences,
    fetchPreferences,
    updatePreferences,
    resetToDefault,
  }
})
