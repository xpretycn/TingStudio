/**
 * 统一时间格式化工具
 * 将任意日期字符串（ISO 8601、yyyy-mm-dd hh:mm:ss 等）统一格式化为 yyyy-mm-dd hh:mm:ss
 */

/**
 * 将日期字符串格式化为 yyyy-mm-dd hh:mm:ss
 * 兼容 ISO 8601 (2026-03-25T08:30:00.000Z) 和自定义格式
 * 使用 getHours/getMonth 等本地时间方法，自动按用户时区展示
 */
export function formatTimestamp(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 将日期字符串格式化为 yyyy-mm-dd（纯日期，无时间）
 * 使用本地时间方法，自动按用户时区展示
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 获取当前时间戳字符串 yyyy-mm-dd hh:mm:ss
 */
export function getTimestamp(): string {
  return formatTimestamp(new Date().toISOString())
}

/**
 * 将日期字符串拆分为日期部分和时间部分（两行展示）
 * 使用本地时间方法，自动按用户时区展示
 */
export function splitDateTime(dateStr: string | undefined | null): { date: string; time: string } {
  if (!dateStr) return { date: '-', time: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) {
    return { date: dateStr.substring(0, 10), time: dateStr.substring(11, 19) }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  }
}

/**
 * 大数字缩略格式化（K / M / 万 / 亿）
 * @param value 数值
 * @returns 缩略后的字符串，如 '1.2K'、'12.3亿'
 */
export function formatCompact(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '--'

  const absVal = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absVal >= 1_0000_0000) {
    return sign + (absVal / 1_0000_0000).toFixed(1) + '亿'
  }
  if (absVal >= 1_0000) {
    return sign + (absVal / 1_0000).toFixed(1) + '万'
  }
  if (absVal >= 1_000_000) {
    return sign + (absVal / 1_000_000).toFixed(1) + 'M'
  }
  if (absVal >= 1_000) {
    return sign + (absVal / 1_000).toFixed(1) + 'K'
  }
  return sign + String(absVal)
}
