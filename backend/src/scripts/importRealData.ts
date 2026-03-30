/**
 * 从 nutrition1.xls 和 nutrition2.xls 导入真实配方和营养数据
 * 
 * 步骤：
 * 1. 清空相关表（materials、formulas、formula_versions、material_nutrition等）
 * 2. 读取Excel文件数据
 * 3. 创建业务员数据
 * 4. 导入原料（去重）
 * 5. 导入配方
 * 6. 导入营养数据
 */
import 'dotenv/config'
import XLSX from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDatabase, getDb, closeDatabase } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function now(): string {
  return new Date().toISOString()
}

// ═══════════════════════════════════════════════════════
// 数据结构定义
// ═══════════════════════════════════════════════════════
interface MaterialData {
  name: string
  weight: number          // 配方(g)
  ratio: number           // 含量比
  protein: number         // 蛋白质(g/100g)
  fat: number             // 脂肪(g/100g)
  carbohydrate: number    // 碳水化合物(g/100g)
  sodium: number          // 钠(mg/100g)
}

interface FormulaData {
  name: string
  materials: MaterialData[]
  totalWeight: number
  finishedWeight: number  // 成品重量（从Excel含量比反推）
}

// ═══════════════════════════════════════════════════════
// Excel 解析
// ═══════════════════════════════════════════════════════
function parseExcelFiles(): FormulaData[] {
  const formulas: FormulaData[] = []
  
  // 解析 nutrition1.xls
  const xls1Path = path.resolve(__dirname, '../../../nutrition1.xls')
  console.log(`解析文件: ${xls1Path}`)
  const wb1 = XLSX.readFile(xls1Path)
  const sheet1 = wb1.Sheets[wb1.SheetNames[0]]
  const data1 = XLSX.utils.sheet_to_json(sheet1, { header: 1 }) as any[][]
  
  const formula1 = parseSheet(data1)
  formulas.push(formula1)
  console.log(`  ✓ 配方: ${formula1.name}, 原料数: ${formula1.materials.length}`)
  
  // 解析 nutrition2.xls
  const xls2Path = path.resolve(__dirname, '../../../nutrition2.xls')
  console.log(`解析文件: ${xls2Path}`)
  const wb2 = XLSX.readFile(xls2Path)
  
  for (const sheetName of wb2.SheetNames) {
    const sheet = wb2.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
    const formula = parseSheet(data)
    formulas.push(formula)
    console.log(`  ✓ 配方: ${formula.name}, 原料数: ${formula.materials.length}`)
  }
  
  return formulas
}

function parseSheet(data: any[][]): FormulaData {
  // 第0行: 配方名
  const formulaName = String(data[0][0] || '').trim()
  
  // 第2行: 列标题 (原料名,配方(g),含量比,能量(kJ/100g),蛋白质(g/100g),脂肪(g/100g),碳水化合物(g/100g),钠(mg/100g))
  // 数据从第3行开始
  const materials: MaterialData[] = []
  let totalWeight = 0
  let finishedWeight = 0  // 成品重量
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0] || row[0] === '营养成分表' || row[0] === '营养素参考值(NRV)') break
    
    const name = String(row[0] || '').trim()
    if (!name) continue
    
    const weight = parseFloat(row[1]) || 0
    const ratio = parseFloat(row[2]) || 0
    const protein = parseFloat(row[4]) || 0
    const fat = parseFloat(row[5]) || 0
    const carbohydrate = parseFloat(row[6]) || 0
    const sodium = parseFloat(row[7]) || 0
    
    // 判断是否为辅料：低聚异麦芽糖、糖类、竹叶黄酮、r-氨基丁酸、地龙蛋白肽粉、纳豆
    const isSupplement = name.includes('低聚') || name.includes('糖') || name.includes('竹叶黄酮') || 
                         name.includes('r-氨基丁酸') || name.includes('地龙蛋白肽粉') || name.includes('纳豆')
    
    // 从含量比反推成品重量: 成品重量 = 原料重量 × 含量比系数 / 含量比
    // 药材含量比系数 = 0.18, 辅料含量比系数 = 1.0
    if (ratio > 0 && finishedWeight === 0) {
      const ratioFactor = isSupplement ? 1.0 : 0.18
      finishedWeight = Math.round(weight * ratioFactor / ratio)
    }
    
    materials.push({
      name,
      weight,
      ratio,
      protein,
      fat,
      carbohydrate,
      sodium
    })
    totalWeight += weight
  }
  
  // 如果没有计算出品重量，使用默认值
  if (finishedWeight === 0) {
    finishedWeight = Math.round(totalWeight * 0.85)
  }
  
  return { name: formulaName, materials, totalWeight, finishedWeight }
}

// ═══════════════════════════════════════════════════════
// 数据库操作
// ═══════════════════════════════════════════════════════
async function importData() {
  console.log('════════════════════════════════════════════════════════')
  console.log(' TingStudio 真实数据导入工具')
  console.log('════════════════════════════════════════════════════════\n')
  
  await connectDatabase()
  const db = getDb()
  
  // 1. 解析Excel文件
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('步骤 1: 解析Excel文件')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const formulas = parseExcelFiles()
  console.log(`共解析 ${formulas.length} 个配方\n`)
  
  // 2. 清空相关表
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('步骤 2: 清空相关数据表')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const clearTables = db.transaction(() => {
    // 按外键依赖顺序删除
    const tables = [
      'nutrition_analysis_reports',
      'formula_nutrition_summaries', 
      'material_nutrition',
      'export_jobs',
      'share_configs',
      'formula_versions',
      'formulas',
      'materials'
    ]
    
    for (const table of tables) {
      const result = db.prepare(`DELETE FROM ${table}`).run()
      console.log(`  清空 ${table}: 删除 ${result.changes} 条记录`)
    }
  })
  
  clearTables()
  console.log('')
  
  // 3. 获取管理员用户
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('步骤 3: 准备基础数据')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any
  const adminId = adminUser ? adminUser.id : 'system'
  console.log(`  管理员ID: ${adminId}`)
  
  // 4. 创建/更新业务员（每个配方对应一个业务员）
  const salesmenMap = new Map<string, string>()
  for (const formula of formulas) {
    const salesmanName = `${formula.name}业务员`
    const salesmanCode = `SALE${String(formulas.indexOf(formula) + 1).padStart(3, '0')}`
    
    // 检查是否已存在（按code或名称）
    const existingByCode = db.prepare('SELECT id, name FROM salesmen WHERE code = ?').get(salesmanCode) as any
    const existingByName = db.prepare('SELECT id, name FROM salesmen WHERE name = ?').get(salesmanName) as any
    
    if (existingByCode) {
      salesmenMap.set(formula.name, existingByCode.id)
      console.log(`  业务员已存在: ${existingByCode.name} (${salesmanCode})`)
    } else if (existingByName) {
      salesmenMap.set(formula.name, existingByName.id)
      console.log(`  业务员已存在: ${existingByName.name}`)
    } else {
      const salesmanId = generateId()
      db.prepare(`
        INSERT INTO salesmen (id, name, code, department, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, '配方部', 'active', ?, ?, ?)
      `).run(salesmanId, salesmanName, salesmanCode, adminId, now(), now())
      salesmenMap.set(formula.name, salesmanId)
      console.log(`  ✓ 创建业务员: ${salesmanName} (${salesmanCode})`)
    }
  }
  console.log('')
  
  // 5. 收集所有唯一原料
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('步骤 4: 导入原料数据')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const allMaterials = new Map<string, MaterialData & { sourceFormula: string }>()
  for (const formula of formulas) {
    for (const mat of formula.materials) {
      if (!allMaterials.has(mat.name)) {
        allMaterials.set(mat.name, { ...mat, sourceFormula: formula.name })
      }
    }
  }
  console.log(`  唯一原料数: ${allMaterials.size}`)
  
  // 导入原料和营养数据
  const materialIdMap = new Map<string, string>()
  let matCode = 1
  
  // 获取当前最大编号
  const maxCode = db.prepare("SELECT code FROM materials WHERE code LIKE 'MAT%' ORDER BY code DESC LIMIT 1").get() as any
  if (maxCode) {
    matCode = parseInt(maxCode.code.replace('MAT', '')) + 1
  }
  
  const importMaterials = db.transaction(() => {
    for (const [name, mat] of allMaterials) {
      const code = `MAT${String(matCode++).padStart(3, '0')}`
      const materialId = generateId()
      const timestamp = now()
      
      // 判断原料类型：辅料(supplement)还是药材(herb)
      const isSupplement = name.includes('低聚') || name.includes('糖') || 
                          name.includes('竹叶黄酮') || name.includes('r-氨基丁酸') || 
                          name.includes('地龙蛋白肽粉') || name.includes('纳豆')
      const materialType = isSupplement ? 'supplement' : 'herb'
      
      // 插入原料
      db.prepare(`
        INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 'g', 0, ?, ?, ?, ?)
      `).run(materialId, name, code, materialType, adminId, timestamp, timestamp)
      
      materialIdMap.set(name, materialId)
      
      // 计算能量 (kJ/100g): Atwater 系数
      const energy = Math.round(mat.protein * 17 + mat.fat * 37 + mat.carbohydrate * 17)
      
      // 插入营养数据
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
      
      const nutritionId = generateId()
      db.prepare(`
        INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, last_updated)
        VALUES (?, ?, ?, '1.0', 'nutrition1.xls / nutrition2.xls', ?, ?)
      `).run(
        nutritionId, 
        materialId, 
        JSON.stringify(per100g), 
        `来源配方: ${mat.sourceFormula}`, 
        timestamp
      )
      
      console.log(`  ✓ ${name} (${code}) - ${materialType === 'supplement' ? '辅料' : '药材'} - 能量: ${energy} kJ/100g`)
    }
  })
  
  importMaterials()
  console.log('')
  
  // 6. 导入配方
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('步骤 5: 导入配方数据')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const importFormulas = db.transaction(() => {
    for (const formula of formulas) {
      const formulaId = generateId()
      const timestamp = now()
      const salesmanId = salesmenMap.get(formula.name) || ''
      
      // 构建原料JSON（使用 quantity 字段名与系统其他部分保持一致）
      const materialsJson = formula.materials.map(mat => ({
        materialId: materialIdMap.get(mat.name),
        materialName: mat.name,
        quantity: mat.weight,  // Excel中的配方(g)列对应系统的quantity字段
        ratio: mat.ratio
      }))
      
      // 使用从Excel含量比反推的成品重量
      const finishedWeight = formula.finishedWeight
      
      // 含量比系数 (ratio_factor) - 药材默认0.18
      const ratioFactor = 0.18
      
      db.prepare(`
        INSERT INTO formulas (id, name, salesman_id, salesman_name, materials_json, finished_weight, ratio_factor, description, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        formulaId, 
        formula.name, 
        salesmanId,
        `${formula.name}业务员`,
        JSON.stringify(materialsJson),
        finishedWeight,
        ratioFactor,
        `从Excel导入的真实配方数据`,
        adminId,
        timestamp,
        timestamp
      )
      
      console.log(`  ✓ ${formula.name} - 原料数: ${formula.materials.length} - 成品重量: ${finishedWeight}g`)
    }
  })
  
  importFormulas()
  console.log('')
  
  // 7. 验证
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('步骤 6: 数据验证')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const matCount = (db.prepare('SELECT COUNT(*) as cnt FROM materials').get() as any).cnt
  const formulaCount = (db.prepare('SELECT COUNT(*) as cnt FROM formulas').get() as any).cnt
  const nutritionCount = (db.prepare('SELECT COUNT(*) as cnt FROM material_nutrition').get() as any).cnt
  const salesmenCount = (db.prepare('SELECT COUNT(*) as cnt FROM salesmen').get() as any).cnt
  
  console.log(`  原料总数: ${matCount}`)
  console.log(`  配方总数: ${formulaCount}`)
  console.log(`  营养数据: ${nutritionCount}`)
  console.log(`  业务员数: ${salesmenCount}`)
  
  console.log('\n════════════════════════════════════════════════════════')
  console.log('✅ 数据导入完成！')
  console.log('════════════════════════════════════════════════════════')
  
  await closeDatabase()
}

// 执行导入
importData().catch((err) => {
  console.error('导入失败:', err)
  process.exit(1)
})
