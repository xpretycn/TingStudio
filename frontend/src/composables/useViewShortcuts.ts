// 全局快捷键 composable
// 支持快捷键 1-4 切换视图

import { onMounted, onUnmounted } from 'vue'

export type ShortcutHandler = (event: KeyboardEvent) => void

export function useViewShortcuts(handlers: Record<string, ShortcutHandler>) {
  const isInputFocused = () => {
    const active = document.activeElement
    if (!active) return false
    const tag = active.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    if ((active as HTMLElement).isContentEditable) return true
    return false
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.repeat) return
    if (isInputFocused()) return
    if (e.metaKey || e.ctrlKey || e.altKey) return

    const handler = handlers[e.key]
    if (handler) {
      e.preventDefault()
      handler(e)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
  })
}
