// 数据库初始化脚本 - SQLite 版本
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDatabase, getDb, closeDatabase } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** 安全地添加列（如果不存在） */
function ensureColumn(db: any, table: string, col: string, type: string, defaultValue: string) {
  try {
    // 检查列是否已存在
    const cols = db.pragma(`table_info(${table})`) as any[]
    const exists = cols.some((c: any) => c.name === col)
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type} DEFAULT ${defaultValue}`)
      console.log(`  ✓ 添加列: ${table}.${col}`)
    }
  } catch (_err) {
    console.log(`  ⊘ 跳过: ${table}.${col} (可能已存在或表不存在)`)
  }
}

/** 迁移：确保所有新增列都已存在于旧数据库中 */
function runMigrations(db: any) {
  console.log('执行数据库迁移...')

  // materials 表
  ensureColumn(db, 'materials', 'material_type', "TEXT", "'herb'")

  // formulas 表
  ensureColumn(db, 'formulas', 'finished_weight', "REAL", "0")
  ensureColumn(db, 'formulas', 'ratio_factor', "REAL", "0.18")
  ensureColumn(db, 'formulas', 'supplement_ratio_factor', "REAL", "1.0")

  // formula_versions 表
  ensureColumn(db, 'formula_versions', 'ratio_factor', "REAL", "0.18")
  ensureColumn(db, 'formula_versions', 'supplement_ratio_factor', "REAL", "1.0")

  console.log('✓ 数据库迁移完成\n')
}

async function initDatabase() {
  console.log('开始初始化数据库...')

  await connectDatabase()
  const db = getDb()

  // 读取 SQL 文件并一次性执行
  const sqlPath = path.join(__dirname, 'init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  try {
    // better-sqlite3 的 exec() 支持一次执行多条 SQL
    db.exec(sql)
    console.log('✓ 所有数据库表创建成功')
  } catch (err: any) {
    console.error('✗ 执行 SQL 失败:', err.message)
  }

  // 执行迁移：确保旧数据库也有新增的列
  runMigrations(db)

  console.log('\n数据库初始化完成！')
  await closeDatabase()
}

initDatabase().catch((err) => {
  console.error('数据库初始化失败:', err)
  process.exit(1)
})
