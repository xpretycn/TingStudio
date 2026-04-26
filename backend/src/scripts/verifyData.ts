// 数据验证脚本
import { connectDatabase, query, closeDatabase } from '../config/database.js'

async function verifyData() {
  await connectDatabase()
  
  const tables = [
    'users', 'materials', 'salesmen', 'formulas', 'formula_versions',
    'export_templates', 'export_jobs', 'api_data_interfaces', 'share_configs',
    'material_nutrition', 'formula_nutrition_summaries', 'nutrition_profiles', 'nutrition_analysis_reports'
  ]
  
  console.log('=== 数据库数据统计 ===')
  for (const table of tables) {
    const result = query(`SELECT COUNT(*) as count FROM ${table}`) as any[]
    const count = result[0][0].count
    console.log(`${table.padEnd(25)}: ${count} 条数据`)
  }
  
  await closeDatabase()
}

verifyData().catch(console.error)