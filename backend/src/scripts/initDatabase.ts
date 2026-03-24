// 数据库初始化脚本 - SQLite 版本
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDatabase, getDb, closeDatabase } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

  console.log('\n数据库初始化完成！')
  await closeDatabase()
}

initDatabase().catch((err) => {
  console.error('数据库初始化失败:', err)
  process.exit(1)
})
