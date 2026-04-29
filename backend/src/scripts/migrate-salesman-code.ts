import Database from 'better-sqlite3'
import { join } from 'path'

const DB_PATH = join(process.cwd(), 'data', 'tingstudio.db')

console.log('开始执行业务员工号缩短迁移...')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function all<T = any>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as T[]
}

function run(sql: string, params: any[] = []): void {
  db.prepare(sql).run(...params)
}

function migrate() {
  try {
    run('BEGIN TRANSACTION')

    const salesmen = all<{ id: string; code: string; name: string }>(
      "SELECT id, code, name FROM salesmen ORDER BY created_at"
    )

    console.log(`共找到 ${salesmen.length} 条业务员记录`)

    let updatedCount = 0
    const codeMap: Record<string, string> = {}

    for (const s of salesmen) {
      const oldCode = s.code

      if (!/^YW\d{7}$/.test(oldCode)) {
        console.log(`  跳过 ${s.name}: 工号 ${oldCode} 格式不匹配（非9位YW开头）`)
        continue
      }

      const timestampPart = oldCode.slice(2, 7)
      const randomPart = oldCode.slice(7, 9)

      const newTimestamp = timestampPart.slice(-3)
      const newCode = `YW${newTimestamp}${randomPart}`

      const existing = all<{ count: number }>(
        "SELECT COUNT(*) as count FROM salesmen WHERE code = ? AND id != ?",
        [newCode, s.id]
      )

      if (existing[0].count > 0) {
        const altRandom = String(Math.floor(Math.random() * 100)).padStart(2, '0')
        const altCode = `YW${newTimestamp}${altRandom}`
        console.log(`  ${s.name}: ${oldCode} → ${altCode} (原新工号冲突，使用备用随机数)`)
        run("UPDATE salesmen SET code = ?, updated_at = datetime('now') WHERE id = ?", [altCode, s.id])
        codeMap[oldCode] = altCode
      } else {
        console.log(`  ${s.name}: ${oldCode} → ${newCode}`)
        run("UPDATE salesmen SET code = ?, updated_at = datetime('now') WHERE id = ?", [newCode, s.id])
        codeMap[oldCode] = newCode
      }

      updatedCount++
    }

    run('COMMIT')

    console.log(`\n✅ 迁移完成！共更新 ${updatedCount}/${salesmen.length} 条记录`)
    console.log('工号格式变更：YW + 5位时间戳 + 2位随机（9位）→ YW + 3位时间戳 + 2位随机（7位）')
  } catch (error: any) {
    run('ROLLBACK')
    console.error('❌ 迁移失败:', error.message)
    process.exit(1)
  } finally {
    db.close()
  }
}

migrate()
