/**
 * 统一时间格式化工具
 * 将任意日期字符串（ISO 8601、yyyy-mm-dd hh:mm:ss 等）统一格式化为 yyyy-mm-dd hh:mm:ss
 */

/**
 * 将日期字符串格式化为 yyyy-mm-dd hh:mm:ss
 * 兼容 ISO 8601 (2026-03-25T08:30:00.000Z) 和自定义格式
 */
export function formatTimestamp(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr // 无法解析则原样返回
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 获取当前时间戳字符串 yyyy-mm-dd hh:mm:ss
 */
export function getTimestamp(): string {
  return formatTimestamp(new Date().toISOString())
}
