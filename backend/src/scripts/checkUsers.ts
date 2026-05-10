import 'dotenv/config'
import { connectDatabase, query, closeDatabase } from '../config/database.js'

async function checkUsers() {
  await connectDatabase()
  const result = query('SELECT id, username, role FROM users LIMIT 10') as any[]
  console.log('用户列表 (前10个):')
  if (result && result[0]) {
    result[0].forEach((u: any) => {
      console.log(`- ${u.username} (${u.role}) [ID: ${u.id}]`)
    })
  } else {
    console.log('没有找到用户')
  }
  await closeDatabase()
}

checkUsers().catch(console.error)
