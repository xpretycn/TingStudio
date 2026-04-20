import { describe, it, expect } from 'vitest'
import { formatTimestamp, getTimestamp } from '@/utils/timeFormat'

describe('formatTimestamp 时间格式化工具', () => {
  it('T01: ISO 8601 格式正确转换', () => {
    const result = formatTimestamp('2024-03-25T08:30:00.000Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(result).toContain('2024-03-25')
  })

  it('T02: yyyy-mm-dd hh:mm:ss 格式原样格式化', () => {
    const result = formatTimestamp('2024-06-15 14:22:33')
    expect(result).toBe('2024-06-15 14:22:33')
  })

  it('T03: null 输入返回 "-"', () => {
    expect(formatTimestamp(null)).toBe('-')
  })

  it('T04: undefined 输入返回 "-"', () => {
    expect(formatTimestamp(undefined)).toBe('-')
  })

  it('T05: 空字符串返回 "-"', () => {
    expect(formatTimestamp('')).toBe('-')
  })

  it('T06: 无法解析的字符串原样返回', () => {
    const invalid = 'not-a-date'
    expect(formatTimestamp(invalid)).toBe(invalid)
  })

  it('T07: getTimestamp 返回当前时间格式化结果', () => {
    const ts = getTimestamp()
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    const now = new Date()
    const year = now.getFullYear().toString()
    expect(ts).toContain(year)
  })
})
