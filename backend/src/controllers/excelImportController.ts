/**
 * Excel导入配方控制器
 * 提供Excel模板下载和配方数据导入功能
 */
import { Request, Response } from 'express'
import XLSX from 'xlsx'
import { query } from "../config/database-better-sqlite3.js";
import { success } from '../utils/helpers.js'

// Excel模板列定义
const TEMPLATE_COLUMNS = [
  { key: 'materialName', header: '原料名称', width: 20 },
  { key: 'quantity', header: '数量(g)', width: 12 },
]

// 示例数据
const SAMPLE_DATA = [
  {
    materialName: '佛手',
    quantity: 108,
  },
  {
    materialName: '低聚异麦芽糖',
    quantity: 500,
  },
]

/** 生成并下载Excel模板 */
export async function downloadFormulaTemplate(req: Request, res: Response) {
  try {
    const workbook = XLSX.utils.book_new()
    
    // 创建模板工作表
    const templateData = [
      TEMPLATE_COLUMNS.map(col => col.header), // 表头
      ...SAMPLE_DATA.map(row => TEMPLATE_COLUMNS.map(col => row[col.key as keyof typeof row] ?? '')),
    ]
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData)
    
    // 设置列宽
    worksheet['!cols'] = TEMPLATE_COLUMNS.map(col => ({ wch: col.width }))
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '配方导入模板')
    
    // 创建说明工作表
    const instructionsData = [
      ['配方导入模板使用说明'],
      [''],
      ['1. 模板仅包含两列：原料名称、数量(g)'],
      ['2. 原料名称必须与系统中已录入的原料名称完全一致'],
      ['3. 数量为该原料在配方中的用量，单位为克(g)'],
      ['4. 请删除示例数据后再填入实际数据'],
      ['5. 导入时系统将根据原料名称自动匹配现有原料'],
      ['6. 若原料名称在系统中不存在，将标记为"未录入"需先去原料管理中录入'],
    ]
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
    instructionsSheet['!cols'] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, '使用说明')
    
    // 生成文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=formula-import-template.xlsx')
    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ success: false, message: '生成模板失败', error: error.message })
  }
}

/** 解析上传的Excel文件并返回配方数据 */
export async function parseFormulaExcel(req: any, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: '请上传Excel文件' })
      return
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[]
    
    if (jsonData.length === 0) {
      res.status(400).json({ success: false, message: 'Excel文件为空，请填入配方数据' })
      return
    }
    
    // 获取所有现有原料用于匹配
    const [materials]: any[] = await query('SELECT id, name, code, material_type FROM materials')
    const materialMap = new Map<string, any>()
    for (const m of materials) {
      materialMap.set(m.name, m)
      if (m.code) materialMap.set(m.code, m)
    }
    
    // 解析并验证数据
    const parsedMaterials: any[] = []
    const errors: string[] = []
    const warnings: string[] = []
    const missingMaterials: string[] = []
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i]
      const rowNum = i + 2 // Excel行号（从第2行开始，第1行是表头）
      
      // 跳过空行
      if (!row['原料名称'] && !row['materialName']) continue

      const materialName = String(row['原料名称'] || row['materialName'] || '').replace(/[\uFEFF\u200B\u200C\u200D\u00A0\u3000]/g, '').trim()
      const quantity = parseFloat(row['数量(g)'] || row['quantity'] || 0)
      
      // 验证必填字段
      if (!materialName) {
        errors.push(`第${rowNum}行：原料名称不能为空`)
        continue
      }
      
      if (!quantity || quantity <= 0) {
        errors.push(`第${rowNum}行：${materialName} 的数量必须大于0`)
        continue
      }

      // 查找现有原料
      let existingMaterial = materialMap.get(materialName)

      if (existingMaterial) {
        parsedMaterials.push({
          materialId: existingMaterial.id,
          materialName: existingMaterial.name,
          materialType: existingMaterial.material_type,
          quantity,
          isNew: false,
        })
      } else {
        missingMaterials.push(materialName)
        parsedMaterials.push({
          materialId: null,
          materialName,
          quantity,
          isNew: true,
        })
      }
    }
    
    // 返回解析结果
    res.json(success({
      materials: parsedMaterials,
      errors,
      warnings,
      missingMaterials: [...new Set(missingMaterials)],
      summary: {
        total: parsedMaterials.length,
        existing: parsedMaterials.filter(m => !m.isNew).length,
        new: parsedMaterials.filter(m => m.isNew).length,
        hasErrors: errors.length > 0,
        hasMissingMaterials: missingMaterials.length > 0,
      }
    }))
    
  } catch (error: any) {
    res.status(500).json({ success: false, message: '解析Excel文件失败', error: error.message })
  }
}
