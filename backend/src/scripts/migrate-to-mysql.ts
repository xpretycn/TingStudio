// 数据迁移脚本 - 从 SQLite 迁移到 MySQL
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase as connectSqlite, query as sqliteQuery, getDb } from '../config/database.js';
import { connectMySQL, query as mysqlQuery, closeMySQL } from '../config/mysql.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MigrationResult {
  success: boolean;
  message: string;
  migratedTables: string[];
  migratedRecords: number;
  errors: string[];
}

async function migrateTable(tableName: string, sqliteDb: any, mysqlPool: any): Promise<{ success: boolean; records: number; error?: string }> {
  try {
    // 从 SQLite 读取数据
    const sqliteResult = sqliteDb.exec(`SELECT * FROM ${tableName}`);
    if (!sqliteResult || sqliteResult.length === 0 || !sqliteResult[0].values) {
      return { success: true, records: 0 };
    }

    const columns = sqliteResult[0].columns;
    const rows = sqliteResult[0].values;

    if (rows.length === 0) {
      return { success: true, records: 0 };
    }

    // 构建插入语句
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    // 批量插入到 MySQL
    let migratedCount = 0;
    for (const row of rows) {
      try {
        await mysqlQuery(sql, row);
        migratedCount++;
      } catch (error: any) {
        // 如果是重复键错误，跳过
        if (error.code === 'ER_DUP_ENTRY') {
          logger.warn(`跳过重复记录: ${tableName} - ${row[0]}`);
          continue;
        }
        throw error;
      }
    }

    return { success: true, records: migratedCount };
  } catch (error: any) {
    return { success: false, records: 0, error: error.message };
  }
}

export async function migrateToMySQL(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    migratedTables: [],
    migratedRecords: 0,
    errors: [],
  };

  try {
    logger.info('开始数据迁移: SQLite → MySQL');

    // 1. 连接到 SQLite 数据库
    await connectSqlite();
    const sqliteDb = getDb();
    logger.info('SQLite 数据库连接成功');

    // 2. 连接到 MySQL 数据库
    await connectMySQL();
    logger.info('MySQL 数据库连接成功');

    // 3. 获取 SQLite 中的所有表
    const tablesResult = sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    if (!tablesResult || tablesResult.length === 0) {
      result.message = 'SQLite 数据库中没有找到表';
      return result;
    }

    const tables = tablesResult[0].values.map((row: any[]) => row[0]);
    logger.info(`发现 ${tables.length} 个表需要迁移: ${tables.join(', ')}`);

    // 4. 迁移每个表的数据
    for (const tableName of tables) {
      logger.info(`正在迁移表: ${tableName}`);
      
      const migrationResult = await migrateTable(tableName, sqliteDb, mysqlQuery);
      
      if (migrationResult.success) {
        result.migratedTables.push(tableName);
        result.migratedRecords += migrationResult.records;
        logger.info(`表 ${tableName} 迁移完成: ${migrationResult.records} 条记录`);
      } else {
        result.errors.push(`表 ${tableName} 迁移失败: ${migrationResult.error}`);
        logger.error(`表 ${tableName} 迁移失败:`, migrationResult.error);
      }
    }

    // 5. 检查迁移结果
    if (result.errors.length === 0) {
      result.success = true;
      result.message = `数据迁移完成。成功迁移 ${result.migratedTables.length} 个表，共 ${result.migratedRecords} 条记录。`;
    } else {
      result.message = `数据迁移完成，但有 ${result.errors.length} 个错误。成功迁移 ${result.migratedTables.length} 个表，共 ${result.migratedRecords} 条记录。`;
    }

    logger.info('数据迁移完成:', result);

  } catch (error: any) {
    result.message = `数据迁移失败: ${error.message}`;
    result.errors.push(error.message);
    logger.error('数据迁移失败:', error);
  } finally {
    // 关闭 MySQL 连接
    await closeMySQL();
  }

  return result;
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToMySQL()
    .then(result => {
      console.log('迁移结果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}