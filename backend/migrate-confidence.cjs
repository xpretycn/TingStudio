// 数据库迁移脚本：添加 confidence 字段到 material_nutrition 表
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data/tingstudio.db')
const db = new Database(dbPath)

try {
  db.exec("ALTER TABLE material_nutrition ADD COLUMN confidence TEXT DEFAULT 'medium'")
  console.log('✅ confidence column added successfully')
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('ℹ️ confidence column already exists')
  } else {
    console.error('❌ Error:', e.message)
  }
}

db.close()
