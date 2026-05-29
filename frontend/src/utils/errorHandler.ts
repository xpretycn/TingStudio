import { MessagePlugin } from 'tdesign-vue-next'
import type { App } from 'vue'

const KNOWN_NON_CRITICAL = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed',
  'Script error',
  'Chrome sent a frame',
  'insertBefore',
  'Failed to load resource',
]

let lastErrorTime = 0
let lastErrorMessage = ''

function isDuplicateError(message: string): boolean {
  const now = Date.now()
  if (message === lastErrorMessage && now - lastErrorTime < 3000) {
    return true
  }
  lastErrorMessage = message
  lastErrorTime = now
  return false
}

function shouldSuppress(message: string): boolean {
  return KNOWN_NON_CRITICAL.some(k => message.includes(k))
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    return typeof obj.message === 'string' ? obj.message : String(error)
  }
  return String(error)
}

function formatVueError(error: unknown, info: string): string {
  const msg = extractMessage(error)
  if (msg.includes('insertBefore') || msg.includes('insertBefore')) {
    return '页面渲染异常，请刷新后重试'
  }
  if (msg.includes('Cannot read') || msg.includes('is undefined') || msg.includes('is null')) {
    return '页面数据异常，请刷新后重试'
  }
  if (msg.includes('Failed to mount') || msg.includes('Unknown component')) {
    return '页面组件加载失败'
  }
  if (msg.includes('Maximum recursive updates')) {
    return '页面更新过于频繁，请稍后操作'
  }
  if (msg.includes('RangeError') || msg.includes('Maximum call stack')) {
    return '页面处理异常，请刷新后重试'
  }
  return '页面出现异常，请刷新后重试'
}

function logDevError(type: string, error: unknown, extra?: string) {
  if (import.meta.env.DEV) {
    const msg = extractMessage(error)
    console.error(`[${type}]`, msg, extra || '', error instanceof Error ? error.stack : '')
  }
}

export function installGlobalErrorHandler(app: App) {
  app.config.errorHandler = (error: unknown, _instance, info: string) => {
    const msg = extractMessage(error)
    if (shouldSuppress(msg)) return
    if (isDuplicateError(msg)) return

    logDevError('Vue-Error', error, info)

    const friendly = formatVueError(error, info)
    MessagePlugin.error(friendly)
  }

  app.config.warnHandler = (msg: string, _instance, _trace: string) => {
    if (shouldSuppress(msg)) return
    logDevError('Vue-Warn', msg, _trace)
  }
}

export function installWindowErrorHandler() {
  window.onerror = (_event: Event | string, _source?: string, _lineno?: number, _colno?: number, error?: Error) => {
    const msg = error ? extractMessage(error) : String(_event)
    if (shouldSuppress(msg)) return
    if (isDuplicateError(msg)) return

    logDevError('Window-Error', error || _event)

    MessagePlugin.error('页面出现意外错误，已自动恢复')
    return true
  }

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const msg = extractMessage(event.reason)
    if (shouldSuppress(msg)) return
    if (isDuplicateError(msg)) return

    logDevError('Unhandled-Promise', event.reason)

    MessagePlugin.error('操作异常，请稍后重试')
    event.preventDefault()
  }
}