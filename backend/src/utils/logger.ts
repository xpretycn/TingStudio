// 日志工具
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const LOG_COLORS: Record<LogLevel, string> = {
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[90m',   // gray
}

const RESET = '\x1b[0m'

function formatMessage(level: LogLevel, message: string, meta?: any): string {
  const timestamp = new Date().toISOString()
  const color = LOG_COLORS[level]
  const prefix = `${color}[${level.toUpperCase()}]${RESET} [${timestamp}]`

  if (meta !== undefined) {
    return `${prefix} ${message} ${typeof meta === 'object' ? JSON.stringify(meta) : meta}`
  }
  return `${prefix} ${message}`
}

export const logger = {
  info(message: string, meta?: any) {
    console.log(formatMessage('info', message, meta))
  },
  warn(message: string, meta?: any) {
    console.warn(formatMessage('warn', message, meta))
  },
  error(message: string, meta?: any) {
    console.error(formatMessage('error', message, meta))
  },
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage('debug', message, meta))
    }
  },
}
