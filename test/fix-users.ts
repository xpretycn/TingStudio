import { connectDatabase, query, closeDatabase } from '../backend/src/config/database.js'
import bcrypt from 'bcryptjs'

async function fix() {
  await connectDatabase()

  // 1. Update role_id for all users based on their role field
  console.log('=== Fixing role_id for all users ===')
  await query("UPDATE users SET role_id = 'role_admin_001' WHERE role = 'admin' AND role_id IS NULL")
  await query("UPDATE users SET role_id = 'role_formulist_001' WHERE role = 'formulist' AND role_id IS NULL")
  console.log('role_id updated for all users')

  // 2. Restore user008 account
  console.log('\n=== Restoring user008 ===')
  const existing = await query("SELECT id FROM users WHERE username = 'user008'")
  if (existing[0] && (existing[0] as unknown[]).length > 0) {
    console.log('user008 already exists, skipping')
  } else {
    const hashedPassword = bcrypt.hashSync('user008', 10)
    const now = new Date().toISOString()
    await query(
      "INSERT INTO users (id, username, password, role, role_id, display_name, email, phone, is_active, data_source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['moczzdcoi101b29c', 'user008', hashedPassword, 'formulist', 'role_formulist_001', '周九', 'user008@tingstudio.com', '13849049985', 1, 'manual', now, now]
    )
    console.log('user008 restored (formulist, 周九)')
  }

  // 3. Verify
  console.log('\n=== Verification ===')
  const users = await query('SELECT username, role, role_id, is_active, display_name FROM users')
  for (const u of users[0] as Record<string, unknown>[]) {
    console.log(`${u.username}: role=${u.role}, role_id=${u.role_id}, display_name=${u.display_name}`)
  }

  await closeDatabase()
}

fix().catch(err => { console.error(err); process.exit(1) })
