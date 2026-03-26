import 'dotenv/config'
import { connectDatabase, getDb, closeDatabase } from '../config/database.js'
import { now } from '../utils/helpers.js'

async function cleanOldMaterials() {
  console.log('开始清理 MAT001-MAT030 模拟数据...')
  await connectDatabase()
  const db = getDb()

  const doClean = db.transaction(() => {
    // 1. 删除旧原料的营养数据
    const delNut = db.prepare(`
      DELETE FROM material_nutrition WHERE material_id IN (
        SELECT id FROM materials WHERE code BETWEEN 'MAT001' AND 'MAT030'
      )
    `)
    const nutResult = delNut.run()
    console.log(`✓ 删除 material_nutrition: ${nutResult.changes} 条`)

    // 2. 删除旧原料
    const delMat = db.prepare("DELETE FROM materials WHERE code BETWEEN 'MAT001' AND 'MAT030'")
    const matResult = delMat.run()
    console.log(`✓ 删除 materials: ${matResult.changes} 条`)
  })

  doClean()

  // 验证
  const totalMat = (db.prepare('SELECT COUNT(*) as cnt FROM materials').get() as any).cnt
  const totalNut = (db.prepare('SELECT COUNT(*) as cnt FROM material_nutrition').get() as any).cnt
  const remaining = db.prepare('SELECT id, name, code FROM materials ORDER BY code').all() as any[]

  console.log('\n═══════════════════════════════════════')
  console.log(`✅ 清理完成！`)
  console.log(`  materials 剩余: ${totalMat} 条`)
  console.log(`  material_nutrition 剩余: ${totalNut} 条`)
  console.log('═══════════════════════════════════════')
  console.log('\n保留的原料列表:')
  remaining.forEach(m => console.log(`  ${m.code} - ${m.name}`))

  await closeDatabase()
}

cleanOldMaterials().catch((err) => {
  console.error('清理失败:', err)
  process.exit(1)
})
