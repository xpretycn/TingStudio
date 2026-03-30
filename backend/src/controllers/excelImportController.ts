/**
 * Excel导入配方控制器
 * 提供Excel模板下载和配方数据导入功能
 */
import { Request, Response } from 'express'
import XLSX from 'xlsx'
import { query } from '../config/database.js'
import { success } from '../utils/helpers.js'

// Excel模板列定义
const TEMPLATE_COLUMNS = [
  { key: 'materialName', header: '原料名称*', width: 15 },
  { key: 'materialCode', header: '原料编码', width: 12 },
  { key: 'materialType', header: '原料类型*', width: 10 },
  { key: 'quantity', header: '数量(g)*', width: 10 },
  { key: 'unit', header: '单位', width: 8 },
  { key: 'protein', header: '蛋白质(g/100g)', width: 14 },
  { key: 'fat', header: '脂肪(g/100g)', width: 12 },
  { key: 'carbohydrate', header: '碳水化合物(g/100g)', width: 16 },
  { key: 'sodium', header: '钠(mg/100g)', width: 12 },
  { key: 'remarks', header: '备注', width: 20 },
]

// 示例数据
const SAMPLE_DATA = [
  {
    materialName: '佛手',
    materialCode: 'MAT001',
    materialType: '药材',
    quantity: 108,
    unit: 'g',
    protein: 1.2,
    fat: 7.7,
    carbohydrate: 92,
    sodium: 0,
    remarks: '示例数据-可删除'
  },
  {
    materialName: '低聚异麦芽糖',
    materialCode: 'MAT007',
    materialType: '辅料',
    quantity: 500,
    unit: 'g',
    protein: 0,
    fat: 0,
    carbohydrate: 90,
    sodium: 0,
    remarks: '示例数据-可删除'
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
      ['1. 必填字段标记了 * 符号'],
      ['2. 原料类型只能是：药材 或 辅料'],
      ['3. 数量单位默认为g（克）'],
      ['4. 营养成分为每100g原料中的含量'],
      ['5. 如果原料编码为空，系统将自动生成'],
      ['6. 请删除示例数据后再填入实际数据'],
      ['7. 导入时如遇同名原料，将自动匹配现有原料'],
      ['8. 若原料不存在，系统会提示错误，需先录入原料'],
      [''],
      ['营养成分说明：'],
      ['- 蛋白质(g/100g)：每100g原料中蛋白质克数'],
      ['- 脂肪(g/100g)：每100g原料中脂肪克数'],
      ['- 碳水化合物(g/100g)：每100g原料中碳水化合物克数'],
      ['- 钠(mg/100g)：每100g原料中钠毫克数'],
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
      
      // 跳过空行或备注行
      if (!row['原料名称*'] && !row['materialName']) continue
      
      const materialName = String(row['原料名称*'] || row['materialName'] || '').trim()
      const materialCode = String(row['原料编码'] || row['materialCode'] || '').trim()
      const materialTypeRaw = String(row['原料类型*'] || row['materialType'] || '药材').trim()
      const quantity = parseFloat(row['数量(g)*'] || row['quantity'] || 0)
      const unit = String(row['单位'] || row['unit'] || 'g').trim()
      const protein = parseFloat(row['蛋白质(g/100g)'] || row['protein'] || 0)
      const fat = parseFloat(row['脂肪(g/100g)'] || row['fat'] || 0)
      const carbohydrate = parseFloat(row['碳水化合物(g/100g)'] || row['carbohydrate'] || 0)
      const sodium = parseFloat(row['钠(mg/100g)'] || row['sodium'] || 0)
      
      // 验证必填字段
      if (!materialName) {
        errors.push(`第${rowNum}行：原料名称不能为空`)
        continue
      }
      
      if (!quantity || quantity <= 0) {
        errors.push(`第${rowNum}行：${materialName} 的数量必须大于0`)
        continue
      }
      
      // 验证原料类型
      let materialType = 'herb'
      if (materialTypeRaw === '辅料' || materialTypeRaw === 'supplement') {
        materialType = 'supplement'
      } else if (materialTypeRaw !== '药材' && materialTypeRaw !== 'herb') {
        warnings.push(`第${rowNum}行：${materialName} 的原料类型"${materialTypeRaw}"不识别，已默认为药材`)
      }
      
      // 查找现有原料
      let existingMaterial = materialMap.get(materialName)
      if (!existingMaterial && materialCode) {
        existingMaterial = materialMap.get(materialCode)
      }
      
      if (existingMaterial) {
        // 使用现有原料
        parsedMaterials.push({
          materialId: existingMaterial.id,
          materialName: existingMaterial.name,
          materialCode: existingMaterial.code,
          materialType: existingMaterial.material_type,
          quantity,
          unit,
          nutrition: { protein, fat, carbohydrate, sodium },
          isNew: false,
        })
      } else {
        // 记录缺失的原料
        missingMaterials.push(materialName)
        parsedMaterials.push({
          materialId: null,
          materialName,
          materialCode,
          materialType,
          quantity,
          unit,
          nutrition: { protein, fat, carbohydrate, sodium },
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
