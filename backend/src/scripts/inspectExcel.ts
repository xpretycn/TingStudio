// 查看Excel文件的实际结构
import XLSX from 'xlsx'
import path from 'path'

const TEST_DIR = path.join('..', 'test')
const files = ['王伟佛手玫苓膏营养成分表20260424  .xls', '营养素模板.xls']

for (const file of files) {
  const filePath = path.join(TEST_DIR, file)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`文件: ${file}`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    const workbook = XLSX.readFile(filePath)
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📋 工作表: ${sheetName}`)
      const sheet = workbook.Sheets[sheetName]
      
      // 获取范围
      const range = sheet['!ref']
      console.log(`   范围: ${range}`)
      
      // 遍历前20行，显示原始单元格内容
      console.log(`\n   原始单元格数据 (前20行):`)
      for (let r = 0; r < 20; r++) {
        const rowValues: string[] = []
        for (let c = 0; c < 15; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c })
          const cell = sheet[cellRef]
          if (cell) {
            const val = String(cell.v ?? '').substring(0, 15).padEnd(15)
            rowValues.push(val)
          } else {
            rowValues.push(''.padEnd(15))
          }
        }
        if (rowValues.some(v => v.trim())) {
          console.log(`   R${String(r+1).padStart(2)}: ${rowValues.join('|')}`)
        }
      }
    }
  } catch (e: any) {
    console.error(`错误: ${e.message}`)
  }
}