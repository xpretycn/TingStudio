// 种子数据 - SQLite 版本
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase, getDb, closeDatabase } from '../config/database.js'
import { generateId, now } from '../utils/helpers.js'

async function seedData() {
  console.log('开始插入种子数据...')
  await connectDatabase()
  const db = getDb()

  const insert = db.transaction(() => {
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
    // 2. 原料表 materials（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建原料 (30条) ---')
    const materialsData = [
      { name: '炒山楂', code: 'MAT001', unit: 'g', stock: 50000 },
      { name: '炒麦芽', code: 'MAT002', unit: 'g', stock: 40000 },
      { name: '莱菔子', code: 'MAT003', unit: 'g', stock: 35000 },
      { name: '炒鸡内金', code: 'MAT004', unit: 'g', stock: 20000 },
      { name: '茯苓', code: 'MAT005', unit: 'g', stock: 60000 },
      { name: '陈皮', code: 'MAT006', unit: 'g', stock: 45000 },
      { name: '火麻仁', code: 'MAT007', unit: 'g', stock: 30000 },
      { name: '磷酸三钙', code: 'MAT008', unit: 'g', stock: 80000 },
      { name: '低聚异麦芽糖', code: 'MAT009', unit: 'g', stock: 100000 },
      { name: '蒲公英', code: 'MAT010', unit: 'g', stock: 25000 },
      { name: '昆布', code: 'MAT011', unit: 'g', stock: 20000 },
      { name: '罗汉果', code: 'MAT012', unit: 'g', stock: 18000 },
      { name: '桔梗', code: 'MAT013', unit: 'g', stock: 28000 },
      { name: '甘草', code: 'MAT014', unit: 'g', stock: 55000 },
      { name: '山楂', code: 'MAT015', unit: 'g', stock: 40000 },
      { name: '乌梅', code: 'MAT016', unit: 'g', stock: 35000 },
      { name: '大枣', code: 'MAT017', unit: 'g', stock: 70000 },
      { name: '桑叶', code: 'MAT018', unit: 'g', stock: 30000 },
      { name: '白芷', code: 'MAT019', unit: 'g', stock: 22000 },
      { name: '苦杏仁', code: 'MAT020', unit: 'g', stock: 25000 },
      { name: '黄芪', code: 'MAT021', unit: 'g', stock: 50000 },
      { name: '党参', code: 'MAT022', unit: 'g', stock: 38000 },
      { name: '枸杞子', code: 'MAT023', unit: 'g', stock: 65000 },
      { name: '当归', code: 'MAT024', unit: 'g', stock: 30000 },
      { name: '菊花', code: 'MAT025', unit: 'g', stock: 40000 },
      { name: '金银花', code: 'MAT026', unit: 'g', stock: 35000 },
      { name: '淡竹叶', code: 'MAT027', unit: 'g', stock: 20000 },
      { name: '芡实', code: 'MAT028', unit: 'g', stock: 25000 },
      { name: '山药', code: 'MAT029', unit: 'g', stock: 55000 },
      { name: '益智仁', code: 'MAT030', unit: 'g', stock: 15000 },
    ]
    const stmtMat = db.prepare(
      'INSERT OR IGNORE INTO materials (id, name, code, unit, stock, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const materialIds: string[] = []
    for (const mat of materialsData) {
      const id = generateId()
      materialIds.push(id)
      try {
        stmtMat.run(id, mat.name, mat.code, mat.unit, mat.stock, userIds[0], now(), now())
        console.log(`✓ 原料: ${mat.name}`)
      } catch {
        console.log(`  原料 ${mat.name} 已存在，跳过`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 3. 业务员表 salesmen（15条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建业务员 (15条) ---')
    const departments = ['华东销售部', '华南销售部', '华北销售部', '西南销售部', '华中销售部']
    const salesmenData = Array.from({ length: 15 }, (_, i) => ({
      name: `业务员${String.fromCharCode(65 + Math.floor(i / 2))}${i % 2 === 0 ? '甲' : '乙'}`,
      code: `SM${String(i + 1).padStart(3, '0')}`,
      department: departments[i % departments.length],
      phone: `136${String(10000000 + i * 111111).padStart(8, '0')}`,
      email: `sm${String(i + 1).padStart(3, '0')}@ting.com`,
      status: i < 13 ? 'active' : 'inactive',
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
    // 4. 配方表 formulas（30条）— 关联业务员
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建配方 (30条) ---')
    const formulaData = [
      { name: '消积通便固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '消积、通便',
        materials: [[0,0.31,6,60],[1,0.465,9,55],[2,0.31,6,70],[3,0.155,3,70],[4,0.465,9,75],[5,0.31,6,70],[6,0.465,9,55],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '鼻炎扁腺炎固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '鼻炎、扁腺炎症',
        materials: [[9,0.4133,9,70],[10,0.4133,9,70],[11,0.4133,9,70],[12,0.2756,6,70],[13,0.2756,6,70],[14,0.2756,6,70],[15,0.4133,9,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '过敏体质固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '过敏体质',
        materials: [[15,0.4133,6,70],[5,0.4133,6,70],[13,0.2067,3,75],[16,0.8267,12,70],[17,0.4133,6,70],[18,0.2067,3,75],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '止咳化痰固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '咳嗽',
        materials: [[12,0.2918,6,70],[19,0.4376,9,70],[5,0.2918,6,70],[4,0.5835,12,75],[13,0.1459,3,70],[15,0.2918,6,70],[11,0.4376,9,80],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '健脾益胃固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '健脾、益胃',
        materials: [[20,0.5,9,55],[21,0.5,9,60],[28,0.5,9,50],[4,0.333,6,75],[5,0.333,6,70],[13,0.167,3,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '益气养血固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '气血两虚',
        materials: [[20,0.5,9,55],[22,0.5,9,65],[23,0.333,6,80],[16,0.333,6,70],[23,0.167,3,80],[13,0.167,3,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '安神助眠固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '失眠、多梦',
        materials: [[4,0.5,9,75],[15,0.5,9,70],[6,0.333,6,70],[5,0.333,6,70],[16,0.167,3,70],[13,0.167,3,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '清热解毒固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '清热、解毒',
        materials: [[25,0.5,9,45],[26,0.5,9,50],[27,0.333,6,40],[14,0.333,6,70],[5,0.167,3,70],[11,0.167,3,80],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '补钙壮骨固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '补钙、壮骨',
        materials: [[7,0.5,null,40],[20,0.375,6,55],[28,0.375,6,50],[4,0.25,3,75],[23,0.25,3,80],[8,1.5,null,10.8]] },
      { name: '免疫力提升固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '免疫力低下',
        materials: [[20,0.5,9,55],[21,0.375,6,60],[28,0.375,6,50],[4,0.25,3,75],[13,0.25,3,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '消积通便口服液', productType: '口服液', dosage: '15g/支', efficacy: '消积、通便',
        materials: [[0,1.5,6,14],[1,2.25,9,7],[2,1.5,6,28],[3,0.75,3,15],[4,2.25,9,28],[5,1.5,6,15],[6,2.25,9,28],[8,5,null,10.8]] },
      { name: '鼻炎扁腺炎口服液', productType: '口服液', dosage: '15g/支', efficacy: '鼻炎、扁腺炎症',
        materials: [[9,1.8,9,15],[10,1.8,9,28],[11,1.8,9,48],[12,1.2,6,45],[13,1.2,6,28],[14,1.2,6,14],[15,1.8,9,19],[8,5,null,10.8]] },
      { name: '过敏体质口服液', productType: '口服液', dosage: '15g/支', efficacy: '过敏体质',
        materials: [[15,2,6,19],[5,2,6,15],[13,1,3,28],[16,4,12,12],[17,2,6,15],[18,1,3,38],[8,8,null,10.8]] },
      { name: '止咳化痰口服液', productType: '口服液', dosage: '15g/支', efficacy: '咳嗽',
        materials: [[12,1.2,6,35],[19,1.8,9,45],[5,1.2,6,15],[4,2.4,12,25],[13,0.6,3,28],[15,1.2,6,19],[11,1.8,9,48],[8,5,null,10.8]] },
      { name: '健脾益胃口服液', productType: '口服液', dosage: '15g/支', efficacy: '健脾、益胃',
        materials: [[20,1.8,9,28],[21,1.8,9,30],[28,1.8,9,22],[4,1.2,6,25],[5,1.2,6,28],[13,0.6,3,28],[8,5,null,10.8]] },
      { name: '益气养血口服液', productType: '口服液', dosage: '15g/支', efficacy: '气血两虚',
        materials: [[20,1.8,9,28],[22,1.8,9,35],[23,1.2,6,38],[16,1.2,6,32],[23,0.6,3,38],[13,0.6,3,28],[8,5,null,10.8]] },
      { name: '安神助眠口服液', productType: '口服液', dosage: '15g/支', efficacy: '失眠、多梦',
        materials: [[4,1.8,9,25],[15,1.8,9,32],[6,1.2,6,28],[5,1.2,6,28],[16,0.6,3,32],[13,0.6,3,28],[8,5,null,10.8]] },
      { name: '清热解毒口服液', productType: '口服液', dosage: '15g/支', efficacy: '清热、解毒',
        materials: [[25,1.8,9,20],[26,1.8,9,22],[27,1.2,6,18],[13,1.2,6,28],[5,0.6,3,28],[11,0.6,3,48],[8,5,null,10.8]] },
      { name: '补钙壮骨口服液', productType: '口服液', dosage: '15g/支', efficacy: '补钙、壮骨',
        materials: [[7,1.5,null,40],[20,1.2,6,28],[28,1.2,6,22],[4,0.8,3,25],[23,0.8,3,38],[8,8,null,10.8]] },
      { name: '免疫力提升口服液', productType: '口服液', dosage: '15g/支', efficacy: '免疫力低下',
        materials: [[20,1.8,9,28],[21,1.2,6,30],[28,1.2,6,22],[4,0.8,3,25],[13,0.8,3,28],[8,5,null,10.8]] },
      { name: '儿童消积开胃固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '儿童消积、开胃',
        materials: [[0,0.31,6,60],[1,0.465,9,55],[3,0.155,3,70],[4,0.465,9,75],[5,0.31,6,70],[29,0.31,6,50],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '儿童健脾化痰固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '儿童健脾、化痰',
        materials: [[4,0.465,9,75],[12,0.31,6,70],[5,0.31,6,70],[29,0.31,6,50],[13,0.155,3,70],[14,0.31,6,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '成人疏肝理气固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '疏肝、理气',
        materials: [[5,0.465,9,70],[14,0.31,6,70],[15,0.465,9,70],[6,0.31,6,70],[24,0.155,3,80],[13,0.155,3,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '女性调理养颜固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '女性调理、养颜',
        materials: [[23,0.465,9,80],[24,0.31,6,80],[16,0.465,9,70],[4,0.31,6,75],[20,0.155,3,55],[13,0.155,3,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '中老年润肠通便固体饮料', productType: '固体饮料', dosage: '4g/袋', efficacy: '中老年润肠、通便',
        materials: [[6,0.465,9,70],[2,0.465,9,70],[5,0.31,6,55],[4,0.31,6,75],[17,0.31,6,70],[7,0.02,null,40],[8,1.5,null,10.8]] },
      { name: '儿童消积开胃口服液', productType: '口服液', dosage: '15g/支', efficacy: '儿童消积、开胃',
        materials: [[0,1.5,6,14],[1,2.25,9,7],[3,0.75,3,15],[4,2.25,9,28],[5,1.5,6,15],[29,1.5,6,12],[8,5,null,10.8]] },
      { name: '儿童健脾化痰口服液', productType: '口服液', dosage: '15g/支', efficacy: '儿童健脾、化痰',
        materials: [[4,2.25,9,25],[12,1.5,6,35],[5,1.5,6,15],[29,1.5,6,12],[13,0.75,3,28],[14,1.5,6,28],[8,5,null,10.8]] },
      { name: '成人疏肝理气口服液', productType: '口服液', dosage: '15g/支', efficacy: '疏肝、理气',
        materials: [[5,1.8,9,28],[13,1.2,6,28],[15,1.8,9,32],[6,1.2,6,28],[24,0.6,3,48],[13,0.6,3,28],[8,5,null,10.8]] },
      { name: '女性调理养颜口服液', productType: '口服液', dosage: '15g/支', efficacy: '女性调理、养颜',
        materials: [[23,1.8,9,48],[24,1.2,6,48],[16,1.8,9,32],[4,1.2,6,25],[20,0.6,3,28],[13,0.6,3,28],[8,5,null,10.8]] },
      { name: '中老年润肠通便口服液', productType: '口服液', dosage: '15g/支', efficacy: '中老年润肠、通便',
        materials: [[6,1.8,9,28],[2,1.8,9,28],[7,1.2,null,40],[4,1.2,6,25],[17,1.2,6,32],[8,8,null,10.8]] },
    ]
    const stmtFormula = db.prepare(
      'INSERT OR IGNORE INTO formulas (id, name, salesman_id, salesman_name, materials_json, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const formulaIds: string[] = []
    for (let i = 0; i < 30; i++) {
      const id = generateId()
      formulaIds.push(id)
      const smIdx = i % salesmanIds.length
      const f = formulaData[i]
      const matsList = f.materials.map(([matIdx, amount, ratio, unitPrice]: number[]) => ({
        materialId: materialIds[matIdx],
        materialName: materialsData[matIdx].name,
        quantity: amount,
      }))
      const materialDetails = f.materials.map(([matIdx, amount, ratio, unitPrice]: number[]) => ({
        name: materialsData[matIdx].name,
        ratio: ratio ? `${ratio}%` : '辅料',
        amount: `${amount}g`,
        unitPrice: unitPrice ? `${unitPrice}元/kg` : '',
        quote: unitPrice ? parseFloat((amount * unitPrice / 1000).toFixed(4)) : null,
      }))
      const totalQuote = materialDetails.reduce((s, m) => s + (m.quote || 0), 0)
      const description = JSON.stringify({
        productType: f.productType, dosage: f.dosage, efficacy: f.efficacy,
        totalQuote: parseFloat(totalQuote.toFixed(4)), materials: materialDetails,
      })
      try {
        stmtFormula.run(
          id, f.name, salesmanIds[smIdx], salesmenData[smIdx].name,
          JSON.stringify(matsList), description, userIds[i % userIds.length], now(), now()
        )
        console.log(`✓ 配方: ${f.name} [${f.productType}]`)
      } catch (e) {
        console.log(`  配方 ${f.name} 创建失败或已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 5. 配方版本表 formula_versions（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建配方版本 (30条) ---')
    const stmtFv = db.prepare(
      'INSERT OR IGNORE INTO formula_versions (version_id, formula_id, version_number, version_name, changes_json, snapshot_json, status, is_current, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const versionIds: string[] = []
    for (let i = 0; i < 30; i++) {
      const vid = generateId()
      versionIds.push(vid)
      const formulaIdx = i % formulaIds.length
      const verNum = `v${Math.floor(i / formulaIds.length) + 1}.${(i % 3) + 1}.0`
      const statuses = ['draft', 'published', 'archived'] as const
      const status = statuses[i % 3]
      const isCurrent = (i % 10 === 0) ? 1 : 0
      const changes = [
        { field: '炒山楂', oldVal: '0.31g', newVal: `${(0.28 + i * 0.01).toFixed(2)}g` },
        { field: '茯苓', oldVal: '0.465g', newVal: `${(0.4 + i * 0.01).toFixed(2)}g` },
      ]
      const snapshot = { name: formulaData[formulaIdx].name, timestamp: now(), data: `配方快照 ${verNum}` }
      try {
        stmtFv.run(
          vid, formulaIds[formulaIdx], verNum,
          `${formulaData[formulaIdx].name} ${verNum}`,
          JSON.stringify(changes), JSON.stringify(snapshot),
          status, isCurrent, userIds[(i + 2) % userIds.length], now()
        )
        console.log(`✓ 版本: ${verNum} (${formulaData[formulaIdx].name})`)
      } catch (e) {
        console.log(`  版本 ${verNum} 创建失败或已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 6. 导出模板表 export_templates（12条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建导出模板 (12条) ---')
    const templateNames = [
      '标准配方PDF模板', '营养标签PDF模板', '内部审核PDF模板',
      '生产配方Excel模板', '原料清单Excel模板', '成本核算Excel模板',
      'MES对接API模板', 'ERP对接API模板', '质检系统API模板',
      '生产指令打印模板', '原料领料单打印模板', '质检报告打印模板',
    ]
    const types = ['pdf', 'excel', 'api', 'print'] as const
    const stmtEt = db.prepare(
      'INSERT OR IGNORE INTO export_templates (template_id, name, description, type, format_config_json, is_default, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const templateIds: string[] = []
    for (let i = 0; i < 12; i++) {
      const tid = generateId()
      templateIds.push(tid)
      const type = types[i % 4]
      const isDefault = (i === 0) ? 1 : 0
      const config = {
        columns: ['配方名称', '业务员名称', '原料列表', '创建时间'],
        orientation: i % 2 === 0 ? 'portrait' : 'landscape',
        fontSize: 12,
      }
      try {
        stmtEt.run(
          tid, templateNames[i], `${templateNames[i]}的描述信息`,
          type, JSON.stringify(config), isDefault, userIds[0], now()
        )
        console.log(`✓ 导出模板: ${templateNames[i]} (${type})`)
      } catch (e) {
        console.log(`  导出模板 ${templateNames[i]} 已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 7. 导出任务表 export_jobs（10条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建导出任务 (10条) ---')
    const jobStatuses = ['completed', 'completed', 'completed', 'failed', 'processing', 'pending'] as const
    const stmtEj = db.prepare(
      'INSERT OR IGNORE INTO export_jobs (job_id, formula_id, version_id, template_id, export_type, status, file_url, file_name, api_endpoint, progress, error_message, created_by, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < 10; i++) {
      const jid = generateId()
      const formulaIdx = i % formulaIds.length
      const status = jobStatuses[i % jobStatuses.length]
      const exportType = (types[i % 4] === 'print') ? 'pdf' : types[i % 4]
      const progress = status === 'completed' ? 100 : status === 'pending' ? 0 : Math.floor(Math.random() * 80) + 10
      const fileUrl = status === 'completed' ? `/exports/formula_${formulaIdx + 1}_${Date.now()}.pdf` : null
      const fileName = status === 'completed' ? `配方_${formulaData[formulaIdx].name}_${i + 1}.pdf` : null
      const errorMsg = status === 'failed' ? '导出过程中发生超时错误' : null
      const completedAt = status === 'completed' ? now() : null
      try {
        stmtEj.run(
          jid, formulaIds[formulaIdx], versionIds[i % versionIds.length],
          templateIds[i % templateIds.length], exportType, status,
          fileUrl, fileName, exportType === 'api' ? '/api/v1/formula/export' : null,
          progress, errorMsg, userIds[(i + 1) % userIds.length], now(), completedAt
        )
        console.log(`✓ 导出任务: ${formulaData[formulaIdx].name} (${status})`)
      } catch (e) {
        console.log(`  导出任务创建失败: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 8. 营养标准表 nutrition_profiles（12条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建营养标准 (12条) ---')
    const categories = ['infant', 'child', 'adult', 'elderly', 'pregnant', 'special'] as const
    const profileNames = [
      '婴儿配方奶GB10765标准', '较大婴儿配方奶GB10767标准',
      '1-3岁幼儿营养标准', '4-6岁儿童营养标准',
      '成人基础营养标准', '成人高强度运动标准',
      '老年男性营养标准', '老年女性营养标准',
      '孕早期营养标准', '孕中期营养标准',
      '乳糖不耐受特殊配方标准', '糖尿病专用营养标准',
    ]
    const stmtNp = db.prepare(
      'INSERT OR IGNORE INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < 12; i++) {
      const pid = generateId()
      const category = categories[i % categories.length]
      const targetValues = {
        energy_kj: 1500 + i * 50, protein_g: 10 + i * 2, fat_g: 20 + i,
        carbohydrate_g: 50 + i * 3, calcium_mg: 300 + i * 20, iron_mg: 5 + i * 0.5,
        zinc_mg: 3 + i * 0.3, vitaminA_ug: 200 + i * 30, vitaminD_ug: 5 + i, vitaminE_mg: 3 + i * 0.5,
      }
      const toleranceRanges = { energy_kj: { min: 0.9, max: 1.1 }, protein_g: { min: 0.8, max: 1.2 }, fat_g: { min: 0.85, max: 1.15 } }
      const mandatoryFields = ['energy_kj', 'protein_g', 'fat_g', 'calcium_mg']
      try {
        stmtNp.run(pid, profileNames[i], `${profileNames[i]}的详细描述`, category,
          JSON.stringify(targetValues), JSON.stringify(toleranceRanges), JSON.stringify(mandatoryFields), now(), now())
        console.log(`✓ 营养标准: ${profileNames[i]}`)
      } catch (e) {
        console.log(`  营养标准 ${profileNames[i]} 已存在: ${e}`)
      }
    }

    // ═══════════════════════════════════════════════════════
    // 9. 原料营养成分表 material_nutrition（30条）
    // ═══════════════════════════════════════════════════════
    console.log('\n--- 创建原料营养成分 (30条) ---')
    const stmtMn = db.prepare(
      'INSERT OR IGNORE INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const sources = ['中国食物成分表2024版', 'USDA食物数据库', 'GB28050-2011', '企业检测数据', '第三方检测报告']
    for (let i = 0; i < 30; i++) {
      const nid = generateId()
      const per100g = {
        energy_kj: 1500 + i * 100, protein_g: Math.round((5 + i * 2.5) * 10) / 10,
        fat_g: Math.round((1 + i * 1.5) * 10) / 10, carbohydrate_g: Math.round((70 + i * 3) * 10) / 10,
        dietary_fiber_g: Math.round((0.5 + i * 0.2) * 10) / 10, sodium_mg: Math.round((50 + i * 30) * 10) / 10,
        calcium_mg: Math.round((20 + i * 15) * 10) / 10, iron_mg: Math.round((0.5 + i * 0.3) * 10) / 10,
        vitaminC_mg: Math.round((0.1 + i * 0.05) * 10) / 10,
      }
      try {
        stmtMn.run(nid, materialIds[i], JSON.stringify(per100g), '1.0', sources[i % sources.length], `原料[${materialsData[i].name}]营养成分数据`, now())
        console.log(`✓ 原料营养: ${materialsData[i].name}`)
      } catch (e) {
        console.log(`  原料营养 ${materialsData[i].name} 已存在: ${e}`)
      }
    }

    console.log('\n✅ 种子数据全部插入完成！')
    console.log(`  用户: ${userIds.length} 条`)
    console.log(`  原料: 30 条`)
    console.log(`  业务员: ${salesmanIds.length} 条`)
    console.log(`  配方: 30 条`)
    console.log(`  配方版本: 30 条`)
    console.log(`  导出模板: 12 条`)
    console.log(`  导出任务: 10 条`)
    console.log(`  营养标准: 12 条`)
    console.log(`  原料营养: 30 条`)
  })

  insert()
  await closeDatabase()
}

seedData().catch((err) => {
  console.error('种子数据插入失败:', err)
  process.exit(1)
})
