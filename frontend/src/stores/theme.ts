import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { getCachedUser } from '@/api/auth'

// ─── 类型定义 ───
export type ThemeMode = 'auto' | 'light' | 'dark'
export type BrandColor = 'pink' | 'yellow' | 'blue' | 'green'

const THEME_STORAGE_KEY = 'ting-theme'
const BRAND_STORAGE_KEY = 'ting-brand-color'
const THEME_KEY_PREFIX = 'ting-theme'
const BRAND_KEY_PREFIX = 'ting-brand-color'

function getUserId(): string | null {
  return getCachedUser()?.id || null
}

function getThemeKey(userId?: string | null): string {
  const uid = userId || getUserId()
  return uid ? `${THEME_KEY_PREFIX}-${uid}` : `${THEME_KEY_PREFIX}-guest`
}

function getBrandKey(userId?: string | null): string {
  const uid = userId || getUserId()
  return uid ? `${BRAND_KEY_PREFIX}-${uid}` : `${BRAND_KEY_PREFIX}-guest`
}

/** 迁移旧的全局 key 数据到 user-specific key */
function migrateOldTheme(userId?: string | null): void {
  try {
    const oldTheme = localStorage.getItem(THEME_STORAGE_KEY)
    const oldBrand = localStorage.getItem(BRAND_STORAGE_KEY)
    const newThemeKey = getThemeKey(userId)
    const newBrandKey = getBrandKey(userId)
    if (oldTheme && !localStorage.getItem(newThemeKey)) {
      localStorage.setItem(newThemeKey, oldTheme)
      localStorage.removeItem(THEME_STORAGE_KEY)
    }
    if (oldBrand && !localStorage.getItem(newBrandKey)) {
      localStorage.setItem(newBrandKey, oldBrand)
      localStorage.removeItem(BRAND_STORAGE_KEY)
    }
  } catch { /* ignore */ }
}

// ─── matchMedia 声明（SSR 安全）───
const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function'

export const useThemeStore = defineStore('theme', () => {
  migrateOldTheme()

  // ─── 状态 ───
  const mode = ref<ThemeMode>(
    (localStorage.getItem(getThemeKey()) as ThemeMode) || 'auto'
  )
  const brandColor = ref<BrandColor>(
    (localStorage.getItem(getBrandKey()) as BrandColor) || 'pink'
  )

  // ─── 系统暗色偏好 ───
  const prefersDark = ref(false)

  // ─── 计算属性 ───
  const resolvedMode = computed<'light' | 'dark'>(() => {
    if (mode.value === 'auto') return prefersDark.value ? 'dark' : 'light'
    return mode.value
  })

  const isDark = computed(() => resolvedMode.value === 'dark')

  // ─── 过渡动画控制 ───
  let transitionTimer: ReturnType<typeof setTimeout> | null = null

  const enableTransition = () => {
    document.documentElement.setAttribute('data-theme-transitioning', '')
    if (transitionTimer) clearTimeout(transitionTimer)
    transitionTimer = setTimeout(() => {
      document.documentElement.removeAttribute('data-theme-transitioning')
      transitionTimer = null
    }, 300)
  }

  // ─── DOM 应用 ───
  const applyToDOM = () => {
    enableTransition()
    document.documentElement.setAttribute('data-theme', resolvedMode.value)
    document.documentElement.setAttribute('data-brand', brandColor.value)
  }

  // ─── 持久化 ───
  const persist = (userId?: string) => {
    localStorage.setItem(getThemeKey(userId), mode.value)
    localStorage.setItem(getBrandKey(userId), brandColor.value)
  }

  // ─── 系统主题监听 ───
  let mediaQuery: MediaQueryList | null = null
  let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null

  const setupMediaListener = () => {
    if (!hasMatchMedia) return
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    prefersDark.value = mediaQuery.matches
    mediaHandler = (e: MediaQueryListEvent) => {
      prefersDark.value = e.matches
    }
    mediaQuery.addEventListener('change', mediaHandler)
  }

  const removeMediaListener = () => {
    if (mediaQuery && mediaHandler) {
      mediaQuery.removeEventListener('change', mediaHandler)
      mediaQuery = null
      mediaHandler = null
    }
  }

  // mode 变化时切换 matchMedia 监听
  watch(mode, (newMode) => {
    if (newMode === 'auto') {
      setupMediaListener()
    } else {
      removeMediaListener()
    }
    persist()
    applyToDOM()
  })

  // brandColor 变化时同步 DOM
  watch(brandColor, () => {
    persist()
    applyToDOM()
  })

  // ─── 公开方法 ───
  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode
  }

  const setBrandColor = (newColor: BrandColor) => {
    brandColor.value = newColor
  }

  /** 从 localStorage 重新加载指定用户的设置 */
  const loadForUser = (userId?: string) => {
    migrateOldTheme(userId)
    const loadedMode = (localStorage.getItem(getThemeKey(userId)) as ThemeMode) || 'auto'
    const loadedBrand = (localStorage.getItem(getBrandKey(userId)) as BrandColor) || 'pink'
    mode.value = loadedMode
    brandColor.value = loadedBrand
    applyToDOM()
  }

  /** 从偏好设置对象应用 */
  const applyPreferences = (prefs: { themeMode?: ThemeMode; brandColor?: BrandColor }) => {
    if (prefs.themeMode) {
      mode.value = prefs.themeMode
    }
    if (prefs.brandColor) {
      brandColor.value = prefs.brandColor
    }
    persist()
    applyToDOM()
  }

  // 明暗模式循环切换：auto -> light -> dark -> auto
  const cycleTheme = () => {
    const order: ThemeMode[] = ['auto', 'light', 'dark']
    const idx = order.indexOf(mode.value)
    mode.value = order[(idx + 1) % order.length]
  }

  // 品牌色循环切换：pink -> yellow -> blue -> green -> pink
  const cycleBrandColor = () => {
    const order: BrandColor[] = ['pink', 'yellow', 'blue', 'green']
    const idx = order.indexOf(brandColor.value)
    brandColor.value = order[(idx + 1) % order.length]
  }

  // 向后兼容别名
  const toggleTheme = () => {
    cycleTheme()
  }

  /** 清理指定用户或所有用户的主题本地缓存 */
  const clearLocal = (userId?: string) => {
    try {
      if (userId) {
        localStorage.removeItem(getThemeKey(userId))
        localStorage.removeItem(getBrandKey(userId))
      } else {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key && (key.startsWith(THEME_KEY_PREFIX) || key.startsWith(BRAND_KEY_PREFIX))) {
            localStorage.removeItem(key)
          }
        }
        localStorage.removeItem(THEME_STORAGE_KEY)
        localStorage.removeItem(BRAND_STORAGE_KEY)
      }
    } catch { /* ignore */ }
  }

  // ─── 初始化 ───
  if (mode.value === 'auto') {
    setupMediaListener()
  }
  applyToDOM()

  return {
    mode,
    brandColor,
    resolvedMode,
    isDark,
    prefersDark,
    setMode,
    setBrandColor,
    cycleTheme,
    cycleBrandColor,
    toggleTheme,
    loadForUser,
    applyPreferences,
    clearLocal,
  }
})
