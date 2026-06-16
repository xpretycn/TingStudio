// 数据库适配器 - MySQL 唯一驱动
import { query as mysqlQuery, execute as mysqlExecute, connectMySQL, closeMySQL, transaction as mysqlTransaction, getMySQLPool } from './mysql.js';
import { logger } from '../utils/logger.js';

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  changes?: number;
  lastInsertId?: number;
}

export async function connectDatabase(): Promise<void> {
  await connectMySQL();
  logger.info('数据库已连接 (类型: mysql)');
}

export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
  try {
    const rows = await mysqlQuery<T[]>(sql, params);
    return { rows };
  } catch (error) {
    logger.error('数据库查询错误:', { sql, params, error });
    throw error;
  }
}

export async function execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertId?: number }> {
  try {
    return await mysqlExecute(sql, params);
  } catch (error) {
    logger.error('数据库执行错误:', { sql, params, error });
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await closeMySQL();
  logger.info('数据库连接已关闭');
}

export function getDatabaseType(): string {
  return 'mysql';
}

export async function transactionAsync<T>(fn: () => Promise<T>): Promise<T> {
  return mysqlTransaction(async () => fn());
}

// 兼容旧代码的同步事务入口（MySQL 下抛错提示使用异步版本）
export function transaction<T>(_fn: () => T): T {
  throw new Error('MySQL 不支持同步事务，请使用 transactionAsync()');
}

// SQL 适配（MySQL 原生，无需转换）
export function adaptSQL(sql: string): string {
  return sql;
}

// 重新导出 MySQL 的 query/execute 供直接使用
export { mysqlQuery as rawQuery, mysqlExecute as rawExecute, getMySQLPool };
