// 从 nutrition1.xls 和 nutrition2.xls 导入真实原料营养数据
import 'dotenv/config'
import { connectDatabase, getDb, closeDatabase } from '../config/database.js'
import { generateId, now } from '../utils/helpers.js'

function generateId2(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function now2(): string {
  return new Date().toISOString()
}

interface MaterialRow {
  name: string
  protein: number
  fat: number
  carbohydrate: number
  sodium: number
  source: string // 来源配方
}

// ═══════════════════════════════════════════════════════
// 从 XLS 文件中提取的完整原料营养数据（每100g）
// 列: 原料名, 配方(g), 含量比, 能量(kJ/100g), 蛋白质(g/100g), 脂肪(g/100g), 碳水化合物(g/100g), 钠(mg/100g)
// ═══════════════════════════════════════════════════════
const allMaterials: MaterialRow[] = [
  // ─── nutrition1.xls - 佛手玫苓膏 ───
  { name: '佛手',       protein: 1.2,  fat: 7.7,  carbohydrate: 92,   sodium: 0,   source: '佛手玫苓膏' },
  { name: '重瓣玫瑰花', protein: 8.5,  fat: 4.7,  carbohydrate: 68,   sodium: 0,   source: '佛手玫苓膏' },
  { name: '茯苓',       protein: 1.2,  fat: 0.5,  carbohydrate: 82.6, sodium: 1,   source: '佛手玫苓膏' },
  { name: '山药',       protein: 9.4,  fat: 1,    carbohydrate: 70.8, sodium: 104, source: '佛手玫苓膏' },
  { name: '桔梗',       protein: 10.7, fat: 0.9,  carbohydrate: 74.6, sodium: 12,  source: '佛手玫苓膏' },
  { name: '甘草',       protein: 4.9,  fat: 4.2,  carbohydrate: 75,   sodium: 155, source: '佛手玫苓膏' },
  { name: '低聚异麦芽糖', protein: 0, fat: 0,    carbohydrate: 90,   sodium: 0,   source: '佛手玫苓膏' },

  // ─── nutrition2.xls - 沫彐淳膏 ───
  { name: '桃仁',       protein: 7.4,  fat: 0.8,  carbohydrate: 77.9, sodium: 3.8, source: '沫彐淳膏' },
  { name: '短梗五加',   protein: 12,   fat: 0,    carbohydrate: 65,   sodium: 0,   source: '沫彐淳膏' },
  { name: '桑椹',       protein: 1.7,  fat: 0.4,  carbohydrate: 13.8, sodium: 2,   source: '沫彐淳膏' },
  { name: '黄精',       protein: 11.6, fat: 3.7,  carbohydrate: 52.3, sodium: 0,   source: '沫彐淳膏' },
  { name: '黄芪',       protein: 14.9, fat: 1.1,  carbohydrate: 33.4, sodium: 0,   source: '沫彐淳膏' },
  { name: '沙棘',       protein: 0.9,  fat: 1.8,  carbohydrate: 25.5, sodium: 28,  source: '沫彐淳膏' },
  { name: '枸杞子',     protein: 13.9, fat: 1.5,  carbohydrate: 64.1, sodium: 252, source: '沫彐淳膏' },
  { name: '香橼',       protein: 6.9,  fat: 0.9,  carbohydrate: 29.5, sodium: 0,   source: '沫彐淳膏' },
  { name: '陈皮',       protein: 8,    fat: 1.4,  carbohydrate: 79,   sodium: 21,  source: '沫彐淳膏' },
  { name: '平卧菊三七', protein: 6.8,  fat: 3.9,  carbohydrate: 67.6, sodium: 17.5,source: '沫彐淳膏' },
  { name: '重瓣红玫瑰', protein: 8.5,  fat: 4.7,  carbohydrate: 68,   sodium: 0,   source: '沫彐淳膏' },
  { name: '金银花',     protein: 13.1, fat: 4.5,  carbohydrate: 32.8, sodium: 0,   source: '沫彐淳膏' },
  { name: '葛根',       protein: 0.4,  fat: 0.1,  carbohydrate: 94,   sodium: 5,   source: '沫彐淳膏' },
  { name: '荷叶',       protein: 3.1,  fat: 0.2,  carbohydrate: 5.6,  sodium: 5,   source: '沫彐淳膏' },
  { name: '竹叶黄酮',   protein: 0,    fat: 0,    carbohydrate: 0,    sodium: 0,   source: '沫彐淳膏' },
  { name: '纳豆',       protein: 20.2, fat: 0.6,  carbohydrate: 63.4, sodium: 2,   source: '沫彐淳膏' },
  { name: '显脉旋覆花', protein: 5.5,  fat: 1.8,  carbohydrate: 62,   sodium: 0,   source: '沫彐淳膏' },
  { name: '栀子',       protein: 2.9,  fat: 0.4,  carbohydrate: 5.6,  sodium: 5,   source: '沫彐淳膏' },
  { name: '西红花',     protein: 11.4, fat: 5.9,  carbohydrate: 65.4, sodium: 0,   source: '沫彐淳膏' },
  { name: '当归',       protein: 44.2, fat: 2.4,  carbohydrate: 18.2, sodium: 0,   source: '沫彐淳膏' },
  { name: '地龙蛋白肽粉', protein: 60, fat: 1,    carbohydrate: 15,   sodium: 0,   source: '沫彐淳膏' },

  // ─── nutrition2.xls - 津源盈膏 ───
  { name: '芦根',       protein: 0.8,  fat: 0.4,  carbohydrate: 12,   sodium: 0,   source: '津源盈膏' },
  { name: '薄荷',       protein: 6.8,  fat: 3.9,  carbohydrate: 67.6, sodium: 17.5,source: '津源盈膏' },
  { name: '白芷',       protein: 8.9,  fat: 1.5,  carbohydrate: 74.1, sodium: 27,  source: '津源盈膏' },
  { name: '薏苡仁',     protein: 0.8,  fat: 0.6,  carbohydrate: 25.1, sodium: 15,  source: '津源盈膏' },
  { name: '化橘红',     protein: 8,    fat: 1.4,  carbohydrate: 79,   sodium: 21,  source: '津源盈膏' },
  { name: '鱼腥草',     protein: 8,    fat: 1.4,  carbohydrate: 79,   sodium: 21,  source: '津源盈膏' },
  { name: '乌药叶',     protein: 3.8,  fat: 1.3,  carbohydrate: 9.9,  sodium: 0,   source: '津源盈膏' },
  { name: '黄芥子',     protein: 13.4, fat: 6.6,  carbohydrate: 28.4, sodium: 0,   source: '津源盈膏' },
  { name: '苦杏仁',     protein: 22.5, fat: 45.4, carbohydrate: 23.9, sodium: 8,   source: '津源盈膏' },
  { name: '蒲公英',     protein: 4.8,  fat: 1.1,  carbohydrate: 7,    sodium: 76,  source: '津源盈膏' },
  { name: '麦冬',       protein: 10.7, fat: 0.9,  carbohydrate: 74.6, sodium: 12,  source: '津源盈膏' },
  { name: '西洋参',     protein: 9.9,  fat: 0.3,  carbohydrate: 65.6, sodium: 0,   source: '津源盈膏' },

  // ─── nutrition2.xls - 甘绪理膏 ───
  { name: '牡蛎',       protein: 10.8, fat: 1.3,  carbohydrate: 2.7,  sodium: 510, source: '甘绪理膏' },
  { name: '昆布',       protein: 8,    fat: 2,    carbohydrate: 56.5, sodium: 2700,source: '甘绪理膏' },
  { name: '丹凤牡丹花', protein: 8.5,  fat: 4.7,  carbohydrate: 68,   sodium: 0,   source: '甘绪理膏' },
  { name: '百合',       protein: 6.7,  fat: 0.5,  carbohydrate: 79.5, sodium: 37,  source: '甘绪理膏' },
  { name: '麦芽',       protein: 10.3, fat: 1.8,  carbohydrate: 78.3, sodium: 11,  source: '甘绪理膏' },
  { name: '姜黄',       protein: 7.8,  fat: 9.9,  carbohydrate: 64.9, sodium: 38,  source: '甘绪理膏' },
  { name: '山茱萸',     protein: 13.9, fat: 1.5,  carbohydrate: 64.1, sodium: 252, source: '甘绪理膏' },
  { name: '肉桂',       protein: 4,    fat: 1.9,  carbohydrate: 36.6, sodium: 15,  source: '甘绪理膏' },
  { name: '山楂',       protein: 0.5,  fat: 0.6,  carbohydrate: 25.1, sodium: 5,   source: '甘绪理膏' },
  { name: '酸枣仁',     protein: 31.8, fat: 25.7, carbohydrate: 0,    sodium: 0,   source: '甘绪理膏' },
  { name: '鸡内金',     protein: 83.1, fat: 1.3,  carbohydrate: 3.8,  sodium: 0,   source: '甘绪理膏' },
  { name: 'r-氨基丁酸', protein: 0,    fat: 0,    carbohydrate: 0,    sodium: 0,   source: '甘绪理膏' },
]

async function importNutritionData() {
  console.log('开始导入 XLS 原料营养数据...')
  await connectDatabase()
  const db = getDb()

  // 查询现有最大 code 编号
  const maxCodeRow = db.prepare("SELECT code FROM materials WHERE code LIKE 'MAT%' ORDER BY code DESC LIMIT 1").get() as any
  const startNum = maxCodeRow ? parseInt(maxCodeRow.code.replace('MAT', '')) + 1 : 1

  // 查询现有用户（用作 created_by）
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any
  const adminId = adminUser ? adminUser.id : 'system'

  // 去重：同名原料只保留第一条
  const uniqueMaterials = new Map<string, MaterialRow>()
  for (const mat of allMaterials) {
    if (!uniqueMaterials.has(mat.name)) {
      uniqueMaterials.set(mat.name, mat)
    }
  }
  const materials = Array.from(uniqueMaterials.values())
  console.log(`去重后共 ${materials.length} 种唯一原料`)

  const doImport = db.transaction(() => {
    let insertedCount = 0
    let updatedCount = 0
    const materialIdMap = new Map<string, string>()

    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i]
      const code = `MAT${String(startNum + i).padStart(3, '0')}`
      const timestamp = now2()

      // 检查是否已存在同名原料
      const existing = db.prepare('SELECT id, name, code FROM materials WHERE name = ?').get(mat.name) as any

      let materialId: string
      if (existing) {
        materialId = existing.id
        console.log(`  原料已存在，跳过新增: ${mat.name} (${existing.code})`)
      } else {
        materialId = generateId2()
        db.prepare(
          'INSERT INTO materials (id, name, code, unit, stock, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(materialId, mat.name, code, 'g', 0, adminId, timestamp, timestamp)
        console.log(`✓ 新增原料: ${mat.name} (${code})`)
        insertedCount++
      }
      materialIdMap.set(mat.name, materialId)

      // 计算能量 (kJ/100g): Atwater 系数 蛋白质17 + 脂肪37 + 碳水17
      const energy = Math.round(mat.protein * 17 + mat.fat * 37 + mat.carbohydrate * 17)

      const per100g = {
        energy_kj: energy,
        protein_g: mat.protein,
        fat_g: mat.fat,
        carbohydrate_g: mat.carbohydrate,
        dietary_fiber_g: 0,
        sodium_mg: mat.sodium,
        calcium_mg: 0,
        iron_mg: 0,
        vitaminC_mg: 0,
      }

      const nutritionId = generateId2()

      // 检查是否已有营养数据
      const existingNut = db.prepare('SELECT nutrition_id FROM material_nutrition WHERE material_id = ?').get(materialId) as any

      if (existingNut) {
        db.prepare(
          `UPDATE material_nutrition SET per_100g_json = ?, data_source = ?, data_version = ?, notes = ?, last_updated = ? WHERE material_id = ?`
        ).run(
          JSON.stringify(per100g),
          'nutrition1.xls / nutrition2.xls 配方营养计算表',
          '2.0',
          `来源配方: ${mat.source}`,
          timestamp,
          materialId
        )
        console.log(`  更新营养数据: ${mat.name}`)
        updatedCount++
      } else {
        db.prepare(
          'INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          nutritionId,
          materialId,
          JSON.stringify(per100g),
          '1.0',
          'nutrition1.xls / nutrition2.xls 配方营养计算表',
          `来源配方: ${mat.source}`,
          timestamp
        )
        console.log(`  ✓ 新增营养数据: ${mat.name} (能量: ${energy} kJ/100g)`)
        insertedCount++
      }
    }

    return { insertedCount, updatedCount }
  })

  const result = doImport()

  console.log('\n═══════════════════════════════════════')
  console.log('✅ 导入完成！')
  console.log(`  新增记录: ${result.insertedCount} 条`)
  console.log(`  更新记录: ${result.updatedCount} 条`)
  console.log(`  唯一原料: ${materials.length} 种`)
  console.log('═══════════════════════════════════════')

  // 验证
  const totalMaterials = (db.prepare('SELECT COUNT(*) as cnt FROM materials').get() as any).cnt
  const totalNutrition = (db.prepare('SELECT COUNT(*) as cnt FROM material_nutrition').get() as any).cnt
  console.log(`\n数据库验证:`)
  console.log(`  materials 表总数: ${totalMaterials}`)
  console.log(`  material_nutrition 表总数: ${totalNutrition}`)

  await closeDatabase()
}

importNutritionData().catch((err) => {
  console.error('导入失败:', err)
  process.exit(1)
})
