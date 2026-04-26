// 快速创建默认用户 - 兼容当前数据库配置
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase, query, closeDatabase } from '../config/database.js'
import { generateId, now } from '../utils/helpers.js'

async function createDefaultUser() {
  console.log('开始创建默认用户...')
  
  try {
    await connectDatabase()
    
    // 检查是否已有用户
    const existingUsers = query('SELECT id FROM users') as any[]
    
    if (existingUsers && existingUsers.length > 0 && existingUsers[0].length > 0) {
      console.log(`✅ 数据库中已有 ${existingUsers[0].length} 个用户`)
      const users = existingUsers[0] as any[]
      console.log('现有用户:')
      users.forEach((u: any) => {
        console.log(`  - ${u.username} (${u.role})`)
      })
      
      // 检查是否有 admin 用户
      const admin = users.find((u: any) => u.username === 'admin')
      if (admin) {
        console.log('\n✅ admin 用户已存在')
        await closeDatabase()
        return
      }
    }
    
    // 创建 admin 用户
    const adminId = generateId()
    const hashedPassword = bcrypt.hashSync('admin123', 10)
    
    query(
      'INSERT INTO users (id, username, password, role, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [adminId, 'admin', hashedPassword, 'admin', '系统管理员', now(), now()]
    )
    
    console.log('\n✅ 默认用户创建成功!')
    console.log('  用户名: admin')
    console.log('  密码:   admin123')
    console.log('  角色:   管理员 (admin)')
    
    await closeDatabase()
    console.log('\n数据库连接已关闭')
    
  } catch (error: any) {
    console.error('❌ 创建用户失败:', error.message)
    process.exit(1)
  }
}

createDefaultUser().catch(console.error)
