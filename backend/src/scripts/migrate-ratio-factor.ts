// 数据库迁移脚本：将 ratio_factor 字段从 materials 表迁移到 formulas 表
import Database from 'better-sqlite3'
import { join } from 'path'

const DB_PATH = join(process.cwd(), 'data', 'tingstudio.db')

console.log('开始执行 ratio_factor 字段迁移...')

// 连接数据库
const db = new Database(DB_PATH)
console.log('数据库连接成功')

// 执行 SQL 语句的封装函数
function exec(sql: string, params: any[] = []): void {
  const stmt = db.prepare(sql)
  stmt.run(...params)
}

// 查询数据的封装函数
function all<T = any>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql)
  return stmt.all(...params) as T[]
}

async function migrate() {
  try {
    // 开始事务
    await exec('BEGIN TRANSACTION')
    
    console.log('1. 检查当前表结构...')
    
    // 检查是否已经迁移过
    const tableInfo = await all<{ name: string }>(
      "SELECT name FROM pragma_table_info('formulas') WHERE name = 'ratio_factor'"
    )
    
    if (tableInfo.length > 0) {
      console.log('⚠️  检测到 formulas 表已存在 ratio_factor 字段，可能已执行过迁移')
      console.log('   如果需要重新执行，请先手动删除该字段')
      process.exit(1)
    }
    
    console.log('2. 为 formulas 表添加 ratio_factor 字段...')
    await exec(`
      ALTER TABLE formulas ADD COLUMN ratio_factor REAL NOT NULL DEFAULT 0.18
    `)
    
    console.log('3. 为 formula_versions 表添加 ratio_factor 字段...')
    await exec(`
      ALTER TABLE formula_versions ADD COLUMN ratio_factor REAL NOT NULL DEFAULT 0.18
    `)
    
    console.log('4. 迁移现有数据：根据原料类型设置默认 ratio_factor 值...')
    
    // 获取所有配方及其原料信息
    const formulas = await all<{
      id: string
      materials_json: string
    }>('SELECT id, materials_json FROM formulas')
    
    console.log(`   发现 ${formulas.length} 个配方需要处理`)
    
    // 为每个配方设置 ratio_factor 值
    for (const formula of formulas) {
      try {
        const materials = JSON.parse(formula.materials_json || '[]')
        
        // 检查配方中的原料类型
        let hasSupplement = false
        let hasHerb = false
        
        for (const mat of materials) {
          const materialId = mat.materialId
          if (materialId) {
            const [material] = await all<{ material_type: string }>(
              'SELECT material_type FROM materials WHERE id = ?',
              [materialId]
            )
            
            if (material) {
              if (material.material_type === 'supplement') {
                hasSupplement = true
              } else if (material.material_type === 'herb') {
                hasHerb = true
              }
            }
          }
        }
        
        // 根据原料类型决定 ratio_factor 值
        // 如果包含辅料，使用 1.0；否则使用 0.18（药材默认值）
        const ratioFactor = hasSupplement ? 1.0 : 0.18
        
        // 更新配方的 ratio_factor
        await exec(`
          UPDATE formulas SET ratio_factor = ? WHERE id = ?
        `, [ratioFactor, formula.id])
        
        // 同时更新该配方的所有版本
        await exec(`
          UPDATE formula_versions SET ratio_factor = ? WHERE formula_id = ?
        `, [ratioFactor, formula.id])
        
        console.log(`   ✓ 配方 ${formula.id}: ratio_factor = ${ratioFactor} (${hasSupplement ? '含辅料' : '纯药材'})`)
        
      } catch (error) {
        console.error(`   ✗ 处理配方 ${formula.id} 时出错:`, error)
      }
    }
    
    console.log('5. 验证迁移结果...')
    
    // 验证 formulas 表
    const formulaCheck = await all('SELECT COUNT(*) as count FROM formulas')
    const formulaWithRatio = await all('SELECT COUNT(*) as count FROM formulas WHERE ratio_factor IS NOT NULL')
    console.log(`   formulas 表: 总计 ${formulaCheck[0].count} 条记录，其中 ${formulaWithRatio[0].count} 条包含 ratio_factor`)
    
    // 验证 formula_versions 表
    const versionCheck = await all('SELECT COUNT(*) as count FROM formula_versions')
    const versionWithRatio = await all('SELECT COUNT(*) as count FROM formula_versions WHERE ratio_factor IS NOT NULL')
    console.log(`   formula_versions 表: 总计 ${versionCheck[0].count} 条记录，其中 ${versionWithRatio[0].count} 条包含 ratio_factor`)
    
    // 提交事务
    await exec('COMMIT')
    console.log('✅ 数据库迁移完成！')
    
    console.log('\n📋 迁移摘要:')
    console.log('   - 已为 formulas 表添加 ratio_factor 字段')
    console.log('   - 已为 formula_versions 表添加 ratio_factor 字段')
    console.log('   - 已根据原料类型为现有配方设置合适的 ratio_factor 值')
    console.log('   - 下一步请更新 init.sql 文件以反映新的表结构')
    
  } catch (error) {
    // 回滚事务
    await exec('ROLLBACK')
    console.error('❌ 迁移过程中发生错误:', error)
    process.exit(1)
  } finally {
    // 关闭数据库连接
    db.close()
    console.log('数据库连接已关闭')
    process.exit(0)
  }
}

// 执行迁移
migrate()