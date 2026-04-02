import fs from 'node:fs'
import path from 'node:path'

// ─── SQL 白名单安全校验 ───

/** 允许查询的表名白名单 */
const ALLOWED_TABLES = [
  'formulas',
  'materials',
  'salesmen',
  'formula_versions',
  'material_nutrition',
  'material_nutrition_summaries',
  'formula_nutrition_summaries',
  'nutrition_profiles',
  'users',
]

/** 禁止的 SQL 关键字（不区分大小写） */
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'EXEC',
  'EXECUTE',
  'GRANT',
  'REVOKE',
  'ATTACH',
  'DETACH',
]

export interface SQLValidationResult {
  valid: boolean
  sql: string
  error?: string
}

/**
 * 校验 AI 生成的 SQL 是否安全
 * 1. 只允许 SELECT 语句
 * 2. 只允许查询白名单中的表
 * 3. 禁止子查询中的写操作
 */
export function validateSQL(rawSQL: string): SQLValidationResult {
  const trimmed = rawSQL.trim()

  // 去除注释（单行 -- 和多行 /* */）
  let cleaned = trimmed
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()

  // 检查是否以 SELECT 开头
  if (!/^SELECT\s+/i.test(cleaned)) {
    return { valid: false, sql: cleaned, error: '仅允许 SELECT 查询语句' }
  }

  // 检查禁止的关键字
  const upperSQL = cleaned.toUpperCase()
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(upperSQL)) {
      return { valid: false, sql: cleaned, error: `SQL 包含禁止的关键字: ${keyword}` }
    }
  }

  // 提取 FROM 和 JOIN 后面的表名
  const tableRefs = extractTableReferences(cleaned)

  for (const table of tableRefs) {
    const normalizedTable = table.replace(/[`"'\[\]]/g, '').toLowerCase()
    if (!ALLOWED_TABLES.includes(normalizedTable)) {
      return {
        valid: false,
        sql: cleaned,
        error: `不允许查询表: ${normalizedTable}，仅允许: ${ALLOWED_TABLES.join(', ')}`,
      }
    }
  }

  // 附加安全 LIMIT（如果没有的话）
  if (!/LIMIT\s+\d+/i.test(cleaned)) {
    cleaned += ' LIMIT 50'
  }

  return { valid: true, sql: cleaned }
}

/**
 * 从 SQL 语句中提取表名引用
 */
function extractTableReferences(sql: string): string[] {
  const tables: string[] = []

  // 匹配 FROM table / FROM table alias / JOIN table
  const fromJoinRegex = /\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
  let match
  while ((match = fromJoinRegex.exec(sql)) !== null) {
    tables.push(match[1])
  }

  return tables
}

/**
 * 读取文件内容为文本（用于 Excel/文本文件解析）
 */
export function readFileAsText(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
  return fs.readFileSync(filePath, encoding)
}

/**
 * 读取文件为 base64（用于图片解析）
 */
export function readFileAsBase64(filePath: string): { base64: string; mimeType: string } {
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/png',  // BMP 不被多数 AI API 支持，转为 PNG MIME
  }
  const mimeType = mimeMap[ext] || 'image/jpeg'  // 默认用 jpeg 而非 octet-stream
  const buffer = fs.readFileSync(filePath)
  const base64 = buffer.toString('base64')
  console.log(`[AI] readFileAsBase64: ext=${ext}, mimeType=${mimeType}, size=${buffer.length} bytes`)
  return { base64, mimeType }
}
