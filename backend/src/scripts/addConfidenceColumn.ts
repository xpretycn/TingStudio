// 数据库迁移脚本：添加 confidence 字段到 material_nutrition 表
import Database from 'better-sqlite3'
import { join } from 'path'

const dbPath = join(__dirname, '../data/tingstudio.db')
const db = new Database(dbPath)

try {
  db.exec(`ALTER TABLE material_nutrition ADD COLUMN confidence TEXT DEFAULT 'medium'`)
  console.log('✅ confidence column added successfully')
} catch (e: any) {
  if (e.message.includes('duplicate column')) {
    console.log('ℹ️ confidence column already exists')
  } else {
    console.error('❌ Error:', e.message)
  }
}

db.close()
