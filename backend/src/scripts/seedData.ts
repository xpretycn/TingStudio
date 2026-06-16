// 种子数据 - SQLite 版本
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase, getDb, transaction, closeDatabase } from '../config/database.js'
import { generateId, now } from '../utils/helpers.js'

// ═══════════════════════════════════════════════════════
// 从 nutrition1.xls / nutrition2.xls 提取的原料及营养数据
// ═══════════════════════════════════════════════════════
// 每条: [name, unitPrice元/kg(可为null), per100g: { energy, protein, fat, carbohydrate, sodium }]
interface MaterialEntry {
  name: string
  unitPrice: number | null
  per100g: { energy: number; protein: number; fat: number; carbohydrate: number; sodium: number }
  materialType: 'herb' | 'supplement'
  ratioFactor: number
}

// 佛手玫苓膏 (nutrition1.xls) + 沫彐淳膏 + 津源盈膏 + 甘绪理膏 (nutrition2.xls) 的全部唯一原料
const materialsFromExcel: MaterialEntry[] = [
  { name: '佛手', unitPrice: 60, per100g: { energy: 1869.3, protein: 1.2, fat: 7.7, carbohydrate: 92, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '重瓣玫瑰花', unitPrice: 80, per100g: { energy: 1474.4, protein: 8.5, fat: 4.7, carbohydrate: 68, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '茯苓', unitPrice: 55, per100g: { energy: 1443.1, protein: 1.2, fat: 0.5, carbohydrate: 82.6, sodium: 1 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '山药', unitPrice: 28, per100g: { energy: 1400.4, protein: 9.4, fat: 1, carbohydrate: 70.8, sodium: 104 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '桔梗', unitPrice: 50, per100g: { energy: 1483.4, protein: 10.7, fat: 0.9, carbohydrate: 74.6, sodium: 12 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '甘草', unitPrice: 35, per100g: { energy: 1513.7, protein: 4.9, fat: 4.2, carbohydrate: 75, sodium: 155 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '低聚异麦芽糖', unitPrice: 8, per100g: { energy: 1530, protein: 0, fat: 0, carbohydrate: 90, sodium: 0 }, materialType: 'supplement', ratioFactor: 1.0 },
  { name: '桃仁', unitPrice: 70, per100g: { energy: 1479.7, protein: 7.4, fat: 0.8, carbohydrate: 77.9, sodium: 3.8 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '短梗五加', unitPrice: 45, per100g: { energy: 1309, protein: 12, fat: 0, carbohydrate: 65, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '桑椹', unitPrice: 65, per100g: { energy: 278.3, protein: 1.7, fat: 0.4, carbohydrate: 13.8, sodium: 2 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '黄精', unitPrice: 55, per100g: { energy: 1223.2, protein: 11.6, fat: 3.7, carbohydrate: 52.3, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '黄芪', unitPrice: 42, per100g: { energy: 861.8, protein: 14.9, fat: 1.1, carbohydrate: 33.4, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '沙棘', unitPrice: 48, per100g: { energy: 515.4, protein: 0.9, fat: 1.8, carbohydrate: 25.5, sodium: 28 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '枸杞子', unitPrice: 58, per100g: { energy: 1381.5, protein: 13.9, fat: 1.5, carbohydrate: 64.1, sodium: 252 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '香橼', unitPrice: 40, per100g: { energy: 652.1, protein: 6.9, fat: 0.9, carbohydrate: 29.5, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '陈皮', unitPrice: 38, per100g: { energy: 1530.8, protein: 8, fat: 1.4, carbohydrate: 79, sodium: 21 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '平卧菊三七', unitPrice: 50, per100g: { energy: 1409.1, protein: 6.8, fat: 3.9, carbohydrate: 67.6, sodium: 17.5 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '重瓣红玫瑰', unitPrice: 75, per100g: { energy: 1474.4, protein: 8.5, fat: 4.7, carbohydrate: 68, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '金银花', unitPrice: 52, per100g: { energy: 946.8, protein: 13.1, fat: 4.5, carbohydrate: 32.8, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '葛根', unitPrice: 32, per100g: { energy: 1608.5, protein: 0.4, fat: 0.1, carbohydrate: 94, sodium: 5 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '荷叶', unitPrice: 25, per100g: { energy: 155.3, protein: 3.1, fat: 0.2, carbohydrate: 5.6, sodium: 5 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '竹叶黄酮', unitPrice: 120, per100g: { energy: 0, protein: 0, fat: 0, carbohydrate: 0, sodium: 0 }, materialType: 'supplement', ratioFactor: 1.0 },
  { name: '纳豆', unitPrice: 60, per100g: { energy: 1443.4, protein: 20.2, fat: 0.6, carbohydrate: 63.4, sodium: 2 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '显脉旋覆花', unitPrice: 45, per100g: { energy: 1214.1, protein: 5.5, fat: 1.8, carbohydrate: 62, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '栀子', unitPrice: 35, per100g: { energy: 159.3, protein: 2.9, fat: 0.4, carbohydrate: 5.6, sodium: 5 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '西红花', unitPrice: 800, per100g: { energy: 1523.9, protein: 11.4, fat: 5.9, carbohydrate: 65.4, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '当归', unitPrice: 55, per100g: { energy: 1149.6, protein: 44.2, fat: 2.4, carbohydrate: 18.2, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '芦根', unitPrice: 20, per100g: { energy: 232.4, protein: 0.8, fat: 0.4, carbohydrate: 12, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '薄荷', unitPrice: 42, per100g: { energy: 1409.1, protein: 6.8, fat: 3.9, carbohydrate: 67.6, sodium: 17.5 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '白芷', unitPrice: 40, per100g: { energy: 1466.5, protein: 8.9, fat: 1.5, carbohydrate: 74.1, sodium: 27 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '薏苡仁', unitPrice: 22, per100g: { energy: 462.5, protein: 0.8, fat: 0.6, carbohydrate: 25.1, sodium: 15 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '化橘红', unitPrice: 48, per100g: { energy: 1530.8, protein: 8, fat: 1.4, carbohydrate: 79, sodium: 21 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '鱼腥草', unitPrice: 18, per100g: { energy: 1530.8, protein: 8, fat: 1.4, carbohydrate: 79, sodium: 21 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '乌药叶', unitPrice: 35, per100g: { energy: 281, protein: 3.8, fat: 1.3, carbohydrate: 9.9, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '黄芥子', unitPrice: 30, per100g: { energy: 954.8, protein: 13.4, fat: 6.6, carbohydrate: 28.4, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '苦杏仁', unitPrice: 45, per100g: { energy: 2468.6, protein: 22.5, fat: 45.4, carbohydrate: 23.9, sodium: 8 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '蒲公英', unitPrice: 22, per100g: { energy: 241.3, protein: 4.8, fat: 1.1, carbohydrate: 7, sodium: 76 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '麦冬', unitPrice: 50, per100g: { energy: 1483.4, protein: 10.7, fat: 0.9, carbohydrate: 74.6, sodium: 12 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '西洋参', unitPrice: 300, per100g: { energy: 1294.6, protein: 9.9, fat: 0.3, carbohydrate: 65.6, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '牡蛎', unitPrice: 80, per100g: { energy: 277.6, protein: 10.8, fat: 1.3, carbohydrate: 2.7, sodium: 510 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '昆布', unitPrice: 25, per100g: { energy: 1170.5, protein: 8, fat: 2, carbohydrate: 56.5, sodium: 2700 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '丹凤牡丹花', unitPrice: 70, per100g: { energy: 1474.4, protein: 8.5, fat: 4.7, carbohydrate: 68, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '百合', unitPrice: 35, per100g: { energy: 1483.9, protein: 6.7, fat: 0.5, carbohydrate: 79.5, sodium: 37 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '麦芽', unitPrice: 18, per100g: { energy: 1572.8, protein: 10.3, fat: 1.8, carbohydrate: 78.3, sodium: 11 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '姜黄', unitPrice: 48, per100g: { energy: 1602.2, protein: 7.8, fat: 9.9, carbohydrate: 64.9, sodium: 38 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '山茱萸', unitPrice: 60, per100g: { energy: 1381.5, protein: 13.9, fat: 1.5, carbohydrate: 64.1, sodium: 252 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '肉桂', unitPrice: 35, per100g: { energy: 760.5, protein: 4, fat: 1.9, carbohydrate: 36.6, sodium: 15 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '山楂', unitPrice: 20, per100g: { energy: 457.4, protein: 0.5, fat: 0.6, carbohydrate: 25.1, sodium: 5 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '酸枣仁', unitPrice: 80, per100g: { energy: 1491.5, protein: 31.8, fat: 25.7, carbohydrate: 0, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: '鸡内金', unitPrice: 55, per100g: { energy: 1525.4, protein: 83.1, fat: 1.3, carbohydrate: 3.8, sodium: 0 }, materialType: 'herb', ratioFactor: 0.18 },
  { name: 'r-氨基丁酸', unitPrice: 200, per100g: { energy: 0, protein: 0, fat: 0, carbohydrate: 0, sodium: 0 }, materialType: 'supplement', ratioFactor: 1.0 },
  { name: '地龙蛋白肽粉', unitPrice: 150, per100g: { energy: 1312, protein: 60, fat: 1, carbohydrate: 15, sodium: 0 }, materialType: 'supplement', ratioFactor: 1.0 },
]

// ═══════════════════════════════════════════════════════
// 从 Excel 提取的配方数据
// ═══════════════════════════════════════════════════════
// finishedWeight: 成品重量(g)，用于含量比计算 ratio = qty * ratioFactor / finishedWeight
//   公式: ratioFactor(药材)=0.18, ratioFactor(辅料)=1.0
//   验证: Excel 含量比 = qty * matRatioFactor / finishedWeight
// 每条原料: [matIdx, amount_g]
// 含量比计算: ratio = qty * material.ratioFactor / finishedWeight
const formulaDataFromExcel = [
  { name: '佛手玫苓膏', productType: '膏方', efficacy: '疏肝理气、健脾宁心',
    finishedWeight: 900,
    materials: [[0,108],[1,90],[2,90],[3,72],[4,54],[5,36],[6,787.5]] },
  { name: '沫彐淳膏', productType: '膏方', efficacy: '益气养阴、清热解毒',
    finishedWeight: 780,
    materials: [[7,45],[8,36],[9,45],[10,54],[11,60],[12,45],[13,45],[4,24],[14,30],[15,36],[16,36],[17,24],[18,24],[19,60],[20,36],[21,18],[5,18],[2,54],[22,30],[23,24],[24,30],[25,0.15],[26,36],[51,30],[6,617.97]] },
  { name: '津源盈膏', productType: '膏方', efficacy: '润肺化痰、清热利咽',
    finishedWeight: 780,
    materials: [[27,90],[4,54],[7,45],[28,45],[29,24],[9,60],[30,75],[31,45],[32,75],[11,75],[33,24],[2,45],[5,24],[34,45],[35,45],[36,75],[37,60],[18,24],[38,9],[24,24],[26,24],[15,45],[6,594.24]] },
  { name: '甘绪理膏', productType: '膏方', efficacy: '疏肝解郁、调理脾胃',
    finishedWeight: 780,
    materials: [[39,120],[0,45],[13,45],[40,30],[1,30],[41,30],[42,30],[43,60],[26,45],[44,45],[45,30],[46,18],[47,60],[7,45],[2,60],[36,45],[15,45],[48,30],[30,45],[9,60],[49,45],[50,15.6],[6,617.52]] },
]

// 建立原料名→索引映射
const materialNameIndex = new Map<string, number>()
materialsFromExcel.forEach((m, i) => materialNameIndex.set(m.name, i))

async function seedData() {
  console.log('开始插入种子数据...')
  await connectDatabase()
  

  transaction(() => {
    // ═══════════════════════════════════════════════════════
    // 1. 用户表 users（10条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建用户 (10条) ---')
    const roles = ['admin', 'formulist']
    const stmtUser = db.prepare(
      'INSERT OR IGNORE INTO users (id, username, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const userIds: string[] = []
    for (let i = 1; i <= 10; i++) {
      const id = generateId()
      userIds.push(id)
      const username = i === 1 ? 'admin' : `user${String(i).padStart(3, '0')}`
      const role = i === 1 ? 'admin' : roles[i % roles.length]
      const pwd = i === 1 ? 'admin123' : `${username}`
      const hashedPassword = bcrypt.hashSync(pwd, 10)
      try {
        stmtUser.run(id, username, hashedPassword, role, now(), now())
        console.log(`✓ 用户: ${username} (${role})`)
      } catch {
        console.log(`  用户 ${username} 已存在，跳过`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 2. 原料表 materials（Excel 数据）
    // ═══════════════════════════════════════════════════════
    console.log(`\n--- 创建原料 (${materialsFromExcel.length}条，来源 nutrition1/2.xls) ---`)
    // ratio_factor 已从 materials 表移除（迁移到配方层级），此处不再写入
    const stmtMat = db.prepare(
      'INSERT OR IGNORE INTO materials (id, name, code, unit, stock, material_type, unit_price, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const materialIds: string[] = []
    materialsFromExcel.forEach((mat, i) => {
      const code = `MAT${String(i + 1).padStart(3, '0')}`
      // 先查找是否已存在，避免 ID 错位
      const existing = (await query('SELECT id FROM materials WHERE code = ?', [code])).rows[0] as any
      if (existing) {
        materialIds.push(existing.id)
        console.log(`  原料 ${mat.name} 已存在 (${code})，使用已有ID`)
      } else {
        const id = generateId()
        materialIds.push(id)
        try {
          stmtMat.run(id, mat.name, code, 'g', 50000, mat.materialType, mat.unitPrice, userIds[0], now(), now())
          console.log(`✓ 原料: ${mat.name} (${code})`)
        } catch (e) {
          console.log(`  原料 ${mat.name} 创建失败: ${e}`)
        }
      }
    })

    // ═══════════════════════════════════════════════════════
    // 3. 业务员表 salesmen（10条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建业务员 (10条) ---')
    const departments = ['华东销售部', '华南销售部', '华北销售部', '西南销售部', '华中销售部']
    const salesmenData = Array.from({ length: 10 }, (_, i) => ({
      name: `业务员${String.fromCharCode(65 + i)}`,
      code: `SM${String(i + 1).padStart(3, '0')}`,
      department: departments[i % departments.length],
      phone: `136${String(10000000 + i * 1111111).padStart(8, '0')}`,
      email: `sm${String(i + 1).padStart(3, '0')}@ting.com`,
      status: i < 9 ? 'active' : 'inactive',
    }))
    const stmtSm = db.prepare(
      'INSERT OR IGNORE INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const salesmanIds: string[] = []
    for (const sm of salesmenData) {
      const id = generateId()
      salesmanIds.push(id)
      try {
        stmtSm.run(id, sm.name, sm.code, sm.department, sm.phone, sm.email, sm.status, userIds[0], now(), now())
        console.log(`✓ 业务员: ${sm.name}`)
      } catch {
        console.log(`  业务员 ${sm.name} 已存在，跳过`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 4. 配方表 formulas（Excel 数据 — 4条真实配方）
    // ═══════════════════════════════════════════════════════
    console.log(`\n--- 创建配方 (${formulaDataFromExcel.length}条，来源 nutrition1/2.xls) ---`)
    const stmtFormula = db.prepare(
      'INSERT OR IGNORE INTO formulas (id, name, salesman_id, salesman_name, materials_json, finished_weight, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const formulaIds: string[] = []
    formulaDataFromExcel.forEach((f, i) => {
      const id = generateId()
      formulaIds.push(id)
      const smIdx = i % salesmanIds.length
      const matsList = f.materials.map(([matIdx, amount]: number[]) => ({
        materialId: materialIds[matIdx],
        materialName: materialsFromExcel[matIdx].name,
        quantity: amount,
      }))
      const totalWeight = f.materials.reduce((s: number, [, a]: number[]) => s + a, 0)
      const materialDetails = f.materials.map(([matIdx, amount]: number[]) => {
        const mat = materialsFromExcel[matIdx]
        const ratio = parseFloat((amount / totalWeight * 100).toFixed(4))
        return {
          name: mat.name,
          ratio: `${ratio}%`,
          amount: `${amount}g`,
          unitPrice: mat.unitPrice ? `${mat.unitPrice}元/kg` : '',
          quote: mat.unitPrice ? parseFloat((amount * mat.unitPrice / 1000).toFixed(4)) : null,
        }
      })
      const totalQuote = materialDetails.reduce((s: number, m: any) => s + (m.quote || 0), 0)
      const description = JSON.stringify({
        productType: f.productType, dosage: '每剂', efficacy: f.efficacy,
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        totalQuote: parseFloat(totalQuote.toFixed(4)), materials: materialDetails,
      })
      try {
        stmtFormula.run(
          id, f.name, salesmanIds[smIdx], salesmenData[smIdx].name,
          JSON.stringify(matsList), f.finishedWeight,
          description, userIds[i % userIds.length], now(), now()
        )
        console.log(`✓ 配方: ${f.name} [${f.productType}]`)
      } catch (e) {
        console.log(`  配方 ${f.name} 创建失败或已存在: ${e}`)
      }
    })

    // ═══════════════════════════════════════════════════════
    // 5. 配方版本表 formula_versions（每个配方1个版本）
    // ═══════════════════════════════════════════════════════
    console.log(`\n--- 创建配方版本 (${formulaDataFromExcel.length}条) ---`)
    const stmtFv = db.prepare(
      'INSERT OR IGNORE INTO formula_versions (version_id, formula_id, version_number, version_name, changes_json, snapshot_json, status, is_current, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const versionIds: string[] = []
    formulaDataFromExcel.forEach((f, i) => {
      const vid = generateId()
      versionIds.push(vid)
      const formulaIdx = i
      const snapshot = {
        name: f.name, salesmanId: salesmanIds[i % salesmanIds.length],
        salesmanName: salesmenData[i % salesmanIds.length].name,
        materials: f.materials.map(([matIdx, amount]: number[]) => ({
          materialId: materialIds[matIdx], materialName: materialsFromExcel[matIdx].name, quantity: amount,
        })),
        description: f.efficacy,
      }
      try {
        stmtFv.run(
          vid, formulaIds[formulaIdx], 'v1.0',
          `${f.name} v1.0`,
          '[]', JSON.stringify(snapshot),
          'published', 1, userIds[0], now()
        )
        console.log(`✓ 版本: v1.0 (${f.name})`)
      } catch (e) {
        console.log(`  版本创建失败: ${e}`)
      }
    })

    // ═══════════════════════════════════════════════════════
    // 6. 导出模板表 export_templates（12条）
    //    配方: 标准配方PDF / 生产配方Excel / 营养标签PDF / 出库单 / 送货单 / 发票 / 客户信息 / 质检报告（共8条）
    //    原料: 原料清单Excel / 库存管理Excel（共2条）
    //    报告: 周报导出Excel / 月报导出Excel（共2条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建导出模板 (12条) ---')

    const templateDefs: Array<{
      name: string;
      category: string;
      type: string;
      isDefault: boolean;
      fields: string[];
      orientation: string;
      description: string;
    }> = [
      { name: '标准配方PDF', category: 'formula', type: 'pdf', isDefault: true, fields: ['name','code','salesmanName','finishedWeight','version','createdAt','description','preparationMethod','materialList','priceInfo','nutritionTable','nrvTable','usageNotes'], orientation: 'portrait', description: '包含全部内容的完整配方导出模板' },
      { name: '生产配方Excel', category: 'formula', type: 'excel', isDefault: true, fields: ['name','code','salesmanName','finishedWeight','version','createdAt','materialList','priceInfo'], orientation: 'landscape', description: '用于生产环节的配方导出' },
      { name: '营养标签PDF', category: 'formula', type: 'pdf', isDefault: false, fields: ['name','finishedWeight','nrvTable','usageNotes'], orientation: 'portrait', description: '仅包含名称、重量和NRV营养标签' },
      { name: '出库单模板', category: 'formula', type: 'pdf', isDefault: false, fields: ['name','code','salesmanName','createdAt','materialList'], orientation: 'portrait', description: '原料出库单据模板' },
      { name: '送货单模板', category: 'formula', type: 'pdf', isDefault: false, fields: ['name','customerName','salesmanName','createdAt','materialList','priceInfo'], orientation: 'portrait', description: '送货单据模板' },
      { name: '发票模板', category: 'formula', type: 'pdf', isDefault: false, fields: ['name','customerName','salesmanName','salesmanPhone','createdAt','materialList','priceInfo'], orientation: 'portrait', description: '销售发票模板' },
      { name: '客户信息模板', category: 'formula', type: 'excel', isDefault: false, fields: ['name','code','customerName','salesmanName','salesmanPhone','createdAt'], orientation: 'landscape', description: '客户相关信息的汇总' },
      { name: '质检报告模板', category: 'formula', type: 'pdf', isDefault: false, fields: ['name','code','salesmanName','createdAt','nutritionTable','nrvTable'], orientation: 'portrait', description: '质量检验报告' },
      { name: '原料清单Excel', category: 'material', type: 'excel', isDefault: true, fields: ['name','code','materialType','spec','unit','stockQuantity','supplierName','unitPrice','nutrition'], orientation: 'landscape', description: '完整的原料清单导出' },
      { name: '库存管理模板', category: 'material', type: 'excel', isDefault: false, fields: ['name','code','materialType','unit','stockQuantity','supplierName','unitPrice','stockStatus'], orientation: 'landscape', description: '库存管理专用' },
      { name: '周报导出Excel', category: 'weekly-report', type: 'excel', isDefault: true, fields: ['periodRange','generatedAt','generatedBy','newFormulasCount','newMaterialsCount','exportCount','topFormulas','salesmanStats','dataCutoffTime'], orientation: 'landscape', description: '周度运营数据报告' },
      { name: '月报导出Excel', category: 'monthly-report', type: 'excel', isDefault: true, fields: ['periodRange','generatedAt','generatedBy','newFormulasCount','newMaterialsCount','exportCount','topFormulas','salesmanStats','dataCutoffTime'], orientation: 'landscape', description: '月度运营数据报告' },
    ]

    const stmtEt = db.prepare(
      'INSERT OR IGNORE INTO export_templates (template_id, name, description, category, type, format_config_json, is_default, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const templateIds: string[] = []
    for (const tpl of templateDefs) {
      const tid = generateId()
      templateIds.push(tid)
      const config = {
        selectedFields: tpl.fields,
        requiredFields: tpl.fields.filter((f: string) => ['name','code','createdAt','periodRange','generatedAt'].includes(f)),
        exportFormat: tpl.type,
        orientation: tpl.orientation,
        pageSize: 'A4',
        fontSize: 12,
        includeHeader: true,
        includeFooter: true,
      }
      try {
        stmtEt.run(tid, tpl.name, tpl.description || `${tpl.name}的默认配置`, tpl.category, tpl.type, JSON.stringify(config), tpl.isDefault ? 1 : 0, userIds[0], now(), now())
        console.log(`✓ 导出模板: ${tpl.name} (${tpl.category}/${tpl.type})`)
      } catch (e) {
        console.log(`  导出模板 ${tpl.name} 已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 7. 导出任务表 export_jobs（4条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建导出任务 (4条) ---')
    const jobStatuses = ['completed', 'completed', 'processing', 'pending'] as const
    const exportTypes = ['pdf', 'excel', 'pdf', 'excel'] as const
    // 表已移除 api_endpoint 列；data_category 留默认 'formula'
    const stmtEj = db.prepare(
      'INSERT OR IGNORE INTO export_jobs (job_id, formula_id, version_id, template_id, export_type, status, file_url, file_name, progress, error_message, created_by, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < 4; i++) {
      const jid = generateId()
      const formulaIdx = i % formulaIds.length
      const status = jobStatuses[i]
      const exportType = exportTypes[i % exportTypes.length]
      const progress = status === 'completed' ? 100 : status === 'pending' ? 0 : 65
      const fileUrl = status === 'completed' ? `/exports/formula_${i + 1}_${Date.now()}.${exportType}` : null
      const fileName = status === 'completed' ? `配方_${formulaDataFromExcel[formulaIdx].name}.${exportType}` : null
      const completedAt = status === 'completed' ? now() : null
      try {
        stmtEj.run(
          jid, formulaIds[formulaIdx], versionIds[formulaIdx],
          templateIds[i % templateIds.length], exportType, status,
          fileUrl, fileName, progress, null, userIds[0], now(), completedAt
        )
        console.log(`✓ 导出任务: ${formulaDataFromExcel[formulaIdx].name} (${status})`)
      } catch (e) {
        console.log(`  导出任务创建失败: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 8. 营养标准表 nutrition_profiles（6条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建营养标准 (6条) ---')
    const categories = ['infant', 'child', 'adult', 'elderly', 'pregnant', 'special'] as const
    const profileNames = [
      '婴儿配方食品营养标准', '1-3岁幼儿营养标准',
      '成人基础营养标准', '老年男性营养标准',
      '孕早期营养标准', '糖尿病专用营养标准',
    ]
    const stmtNp = db.prepare(
      'INSERT OR IGNORE INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < 6; i++) {
      const pid = generateId()
      const category = categories[i]
      const targetValues = {
        energy_kj: 1500 + i * 200, protein_g: 10 + i * 3, fat_g: 20 + i * 2,
        carbohydrate_g: 50 + i * 5, sodium_mg: 200 + i * 100,
      }
      const toleranceRanges = { energy_kj: { min: 0.9, max: 1.1 }, protein_g: { min: 0.8, max: 1.2 } }
      const mandatoryFields = ['energy_kj', 'protein_g', 'fat_g', 'carbohydrate_g']
      try {
        stmtNp.run(pid, profileNames[i], `${profileNames[i]}的详细描述`, category,
          JSON.stringify(targetValues), JSON.stringify(toleranceRanges), JSON.stringify(mandatoryFields), now(), now())
        console.log(`✓ 营养标准: ${profileNames[i]}`)
      } catch (e) {
        console.log(`  营养标准 ${profileNames[i]} 已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 9. 原料营养成分表 material_nutrition（Excel 真实数据）
    // ═══════════════════════════════════════════════════════
    console.log(`\n--- 创建原料营养成分 (${materialsFromExcel.length}条，来源 nutrition1/2.xls) ---`)
    const stmtMn = db.prepare(
      'INSERT OR IGNORE INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    materialsFromExcel.forEach((mat, i) => {
      const nid = generateId()
      try {
        stmtMn.run(nid, materialIds[i], JSON.stringify(mat.per100g), '1.0',
          '中国食物成分表/原料营养标签', `原料[${mat.name}]营养成分数据（来源nutrition1/2.xls）`, now())
        console.log(`✓ 原料营养: ${mat.name}`)
      } catch (e) {
        console.log(`  原料营养 ${mat.name} 已存在: ${e}`)
      }
    })

    // ═══════════════════════════════════════════════════════
    // 汇总
    // ═══════════════════════════════════════════════════════
    console.log('\n✅ 种子数据全部插入完成！')
    console.log(`  用户: ${userIds.length} 条`)
    console.log(`  原料: ${materialsFromExcel.length} 条`)
    console.log(`  业务员: ${salesmanIds.length} 条`)
    console.log(`  配方: ${formulaDataFromExcel.length} 条`)
    console.log(`  配方版本: ${versionIds.length} 条`)
    console.log(`  导出模板: ${templateIds.length} 条`)
    console.log(`  导出任务: 4 条`)
    console.log(`  营养标准: 6 条`)
    console.log(`  原料营养: ${materialsFromExcel.length} 条`)
  })

  await closeDatabase()
}

seedData().catch((err) => {
  console.error('种子数据插入失败:', err)
  process.exit(1)
})
