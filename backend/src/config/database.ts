// SQLite 数据库连接管理
import Database from 'better-sqlite3'
import { config } from './index.js'
import { logger } from '../utils/logger.js'
import fs from 'fs'
import path from 'path'

let db: Database.Database | null = null

export async function connectDatabase(): Promise<void> {
  try {
    // 确保数据目录存在
    const dbDir = path.dirname(config.database.path)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // 创建/打开数据库
    db = new Database(config.database.path)

    // 启用 WAL 模式和外键约束
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    logger.info(`SQLite 数据库已连接: ${config.database.path}`)
  } catch (error) {
    logger.error('数据库连接失败:', error)
    throw error
  }
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 connectDatabase()')
  }
  return db
}

/**
 * 执行查询，返回行数组（兼容 MySQL mysql2 的 [rows] 模式）
 * - SELECT 语句：返回行数组
 * - INSERT/UPDATE/DELETE：返回 RunResult（含 changes, lastInsertRowid）
 */
export function query<T = any>(sql: string, params?: any[]): T {
  const dbInstance = getDb()
  const stmt = dbInstance.prepare(sql)
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT') ||
                   sql.trim().toUpperCase().startsWith('PRAGMA')

  if (isSelect) {
    // 兼容 mysql2 的 [rows] 解构模式，控制器使用 const [list] = await query(...)
    return [stmt.all(...(params || []))] as T
  }
  return stmt.run(...(params || [])) as unknown as T
}

/** 执行事务 */
export function transaction<T>(fn: () => T): T {
  const dbInstance = getDb()
  return dbInstance.transaction(fn)()
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close()
    db = null
    logger.info('数据库连接已关闭')
  }
}
