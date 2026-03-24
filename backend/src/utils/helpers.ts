// 通用工具函数

/** 生成唯一 ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

/** 获取当前时间 ISO 字符串 */
export function now(): string {
  return new Date().toISOString()
}

/** 构建分页参数 */
export function buildPagination(page?: number, pageSize?: number) {
  const p = Math.max(1, page || 1)
  const size = Math.min(100, Math.max(1, pageSize || 20))
  const offset = (p - 1) * size
  return { page: p, pageSize: size, offset }
}

/** 构建模糊搜索 LIKE 条件 */
export function buildLike(keyword: string): string {
  return `%${keyword.replace(/[%_\\]/g, '\\$&')}%`
}

/** 构建成功响应 */
export function success<T = any>(data: T, message = '操作成功') {
  return { success: true, message, data }
}

/** 构建分页成功响应 */
export function successWithPagination<T = any>(
  list: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return {
    success: true,
    message: '查询成功',
    data: {
      list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  }
}

/** 将下划线命名转为驼峰 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** 将驼峰转为下划线命名 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
}

/** 将数据库行（下划线）转换为对象（驼峰） */
export function rowToCamelCase<T = any>(row: Record<string, any>): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value
  }
  return result as T
}

/** 批量转换数据库行 */
export function rowsToCamelCase<T = any>(rows: Record<string, any>[]): T[] {
  return rows.map(row => rowToCamelCase<T>(row))
}

/** 安全解析 JSON */
export function safeJsonParse<T = any>(str: string | null | undefined, defaultValue: T): T {
  if (!str) return defaultValue
  try {
    return JSON.parse(str) as T
  } catch {
    return defaultValue
  }
}
