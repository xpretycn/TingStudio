// 数据库适配器 - 支持 SQLite 和 MySQL
import { config } from './index.js';
import { query as sqliteQuery, getDb as getSqliteDb, connectDatabase as connectSqlite } from './database.js';
import { query as mysqlQuery, connectMySQL, closeMySQL, getMySQLPool } from './mysql.js';
import { logger } from '../utils/logger.js';

export type DatabaseType = 'sqlite' | 'mysql';

export interface QueryResult<T = any> {
  rows: T[];
  changes?: number;
  lastInsertId?: number;
}

export async function connectDatabase(): Promise<void> {
  const dbType = config.database.type as DatabaseType;
  
  if (dbType === 'mysql') {
    await connectMySQL();
  } else {
    await connectSqlite();
  }
  
  logger.info(`数据库已连接 (类型: ${dbType})`);
}

export async function query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  const dbType = config.database.type as DatabaseType;
  
  try {
    if (dbType === 'mysql') {
      const rows = await mysqlQuery<T[]>(sql, params);
      return { rows };
    } else {
      // SQLite 查询适配
      const result = await sqliteQuery<T[]>(sql, params);
      
      // SQLite 返回格式适配
      if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
        return { rows: result[0] };
      }
      
      return { rows: result as T[] };
    }
  } catch (error) {
    logger.error('数据库查询错误:', { sql, params, dbType, error });
    throw error;
  }
}

export async function execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertId?: number }> {
  const dbType = config.database.type as DatabaseType;
  
  try {
    if (dbType === 'mysql') {
      const [result] = await getMySQLPool().execute(sql, params);
      const mysqlResult = result as any;
      return {
        changes: mysqlResult.affectedRows || 0,
        lastInsertId: mysqlResult.insertId,
      };
    } else {
      const result = await sqliteQuery(sql, params);
      return {
        changes: (result as any)?.changes || 0,
        lastInsertId: (result as any)?.lastInsertRowid,
      };
    }
  } catch (error) {
    logger.error('数据库执行错误:', { sql, params, dbType, error });
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  const dbType = config.database.type as DatabaseType;
  
  if (dbType === 'mysql') {
    await closeMySQL();
  }
  
  logger.info('数据库连接已关闭');
}

export function getDatabaseType(): DatabaseType {
  return config.database.type as DatabaseType;
}

// 数据库特定的 SQL 适配器
export function adaptSQL(sql: string): string {
  const dbType = config.database.type as DatabaseType;
  
  if (dbType === 'mysql') {
    // SQLite 到 MySQL 的 SQL 适配
    return sql
      .replace(/datetime\('now'\)/g, 'NOW()')
      .replace(/TEXT PRIMARY KEY/g, 'VARCHAR(36) PRIMARY KEY')
      .replace(/TEXT NOT NULL/g, 'VARCHAR(255) NOT NULL')
      .replace(/TEXT/g, 'VARCHAR(255)')
      .replace(/REAL/g, 'DECIMAL(10,2)')
      .replace(/INTEGER/g, 'INT')
      .replace(/CHECK\([^)]+\)/g, ''); // MySQL 不支持 SQLite 的 CHECK 约束
  }
  
  return sql;
}