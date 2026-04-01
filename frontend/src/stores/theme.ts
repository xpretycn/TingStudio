import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// ─── 类型定义 ───
export type ThemeMode = 'auto' | 'light' | 'dark'
export type BrandColor = 'pink' | 'yellow' | 'blue' | 'green'

const THEME_STORAGE_KEY = 'ting-theme'
const BRAND_STORAGE_KEY = 'ting-brand-color'

// ─── matchMedia 声明（SSR 安全）───
const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function'

export const useThemeStore = defineStore('theme', () => {
  // ─── 状态 ───
  const mode = ref<ThemeMode>(
    (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || 'auto'
  )
  const brandColor = ref<BrandColor>(
    (localStorage.getItem(BRAND_STORAGE_KEY) as BrandColor) || 'pink'
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
  const persist = () => {
    localStorage.setItem(THEME_STORAGE_KEY, mode.value)
    localStorage.setItem(BRAND_STORAGE_KEY, brandColor.value)
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
  }
})
