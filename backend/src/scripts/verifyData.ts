// ??????
import { connectDatabase, query, closeDatabase } from '../config/database.js'

async function verifyData() {
  await connectDatabase()
  
  const tables = [
    'users', 'materials', 'salesmen', 'formulas', 'formula_versions',
    'export_templates', 'export_jobs', 'api_data_interfaces', 'share_configs',
    'material_nutrition', 'formula_nutrition_summaries', 'nutrition_profiles', 'nutrition_analysis_reports'
  ]
  
  console.log('=== ??????? ===')
  for (const table of tables) {
    const result = query(`SELECT COUNT(*) as count FROM ${table}`) as any[]
    const count = result[0][0].count
    console.log(`${table.padEnd(25)}: ${count} ???`)
  }
  
  await closeDatabase()
}

verifyData().catch(console.error)