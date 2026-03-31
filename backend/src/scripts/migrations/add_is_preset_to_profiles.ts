/**
 * 数据库迁移脚本：为 nutrition_profiles 表添加 is_preset 字段
 */

import { query, connectDatabase } from '../config/database.js'

// 初始化数据库
connectDatabase()

async function migrateAddIsPreset() {
  console.log('开始迁移：为 nutrition_profiles 表添加 is_preset 字段...')
  
  try {
    // SQLite 不支持直接 ADD COLUMN IF NOT EXISTS，需要先检查列是否存在
    const [[tableInfo]]: any[] = await query("PRAGMA table_info(nutrition_profiles)")
    
    const hasIsPreset = tableInfo.some((col: any) => col.name === 'is_preset')
    
    if (hasIsPreset) {
      console.log('✓ is_preset 字段已存在，无需迁移')
      return
    }
    
    await query(`ALTER TABLE nutrition_profiles ADD COLUMN is_preset INTEGER DEFAULT 0`)
    console.log('✓ 成功添加 is_preset 字段')
    
  } catch (error: any) {
    console.error('✗ 迁移失败:', error.message)
    throw error
  }
}

migrateAddIsPreset()
  .then(() => {
    console.log('\n迁移完成！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('迁移失败:', err)
    process.exit(1)
  })
