import 'dotenv/config'
import { connectDatabase, query, closeDatabase } from '../config/database.js'

async function main() {
  await connectDatabase()
  query("UPDATE users SET role='admin' WHERE username='admin'")
  const r = query('SELECT id, username, role FROM users WHERE username=?', ['admin'])
  console.log(JSON.stringify(r))
  await closeDatabase()
}

main().catch(console.error)
