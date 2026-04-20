// MySQL 数据库配置
import mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
}

let pool: mysql.Pool | null = null;

export function getMySQLConfig(): MySQLConfig {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'tingstudio',
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
    acquireTimeout: parseInt(process.env.MYSQL_ACQUIRE_TIMEOUT || '60000', 10),
    timeout: parseInt(process.env.MYSQL_TIMEOUT || '60000', 10),
  };
}

export async function connectMySQL(): Promise<void> {
  try {
    if (pool) {
      return;
    }

    const config = getMySQLConfig();
    pool = mysql.createPool(config);

    // 测试连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    logger.info(`MySQL 数据库已连接: ${config.host}:${config.port}/${config.database}`);
  } catch (error) {
    logger.error('MySQL 数据库连接失败:', error);
    throw error;
  }
}

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    throw new Error('MySQL 数据库未初始化，请先调用 connectMySQL()');
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const poolInstance = getMySQLPool();
  
  try {
    const [rows] = await poolInstance.execute(sql, params);
    return rows as T;
  } catch (error) {
    logger.error('MySQL 查询错误:', { sql, params, error });
    throw error;
  }
}

export async function closeMySQL(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL 数据库连接已关闭');
  }
}