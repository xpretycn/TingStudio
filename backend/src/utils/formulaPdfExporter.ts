/**
 * 配方 PDF 导出引擎
 * 将配方数据导出为 PDF 文件
 */
import PDFDocument from 'pdfkit'
import { query } from '../config/database.js'
import { safeJsonParse, rowToCamelCase } from './helpers.js'

interface FormulaRow {
  id: string
  name: string
  salesmanName: string
  finishedWeight: number
  ratioFactor: number
  supplementRatioFactor: number
  description: string | null
  materialsJson: string
  createdAt: string
  updatedAt: string
}

interface VersionRow {
  versionId: string
  versionNumber: string
  versionName: string | null
  versionReason: string | null
  status: string
  isCurrent: number
  snapshotJson: string
  ratioFactor: number
  supplementRatioFactor: number
  createdAt: string
}

interface MaterialRow {
  id: string
  name: string
  code: string
  unit: string
  materialType: string
}

interface NutritionRow {
  materialId: string
  protein: number
  fat: number
  carbohydrate: number
  sodium: number
  calories: number
  dietaryFiber: number
}

/** 获取配方完整数据（供导出引擎复用） */
async function getFormulaData(formulaId: string, versionId?: string) {
  const [formulas]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
  if (!formulas.length) throw new Error('配方不存在')
  const formula = rowToCamelCase<FormulaRow>(formulas[0])

  let version: any = null
  let snapshot: any = null

  if (versionId) {
    const [versions]: any[][] = await query('SELECT * FROM formula_versions WHERE version_id = ?', [versionId])
    if (versions.length) {
      version = rowToCamelCase(versions[0])
      snapshot = safeJsonParse(version.snapshotJson, null)
    }
  }

  const materials = snapshot?.materials || safeJsonParse<any[]>(formula.materialsJson, [])
  const ratioFactor = version?.ratioFactor ?? formula.ratioFactor
  const supplementRatioFactor = version?.supplementRatioFactor ?? formula.supplementRatioFactor
  const versionLabel = version ? `V${version.versionNumber}` : '当前版本'

  const materialDetails: Map<string, MaterialRow> = new Map()
  const nutritionData: Map<string, NutritionRow> = new Map()

  if (materials.length > 0) {
    const materialIds = materials.map((m: any) => m.materialId).filter(Boolean)
    if (materialIds.length > 0) {
      const placeholders = materialIds.map(() => '?').join(',')
      const [matRows]: any[][] = await query(
        `SELECT * FROM materials WHERE id IN (${placeholders})`,
        materialIds
      )
      matRows.forEach((row: any) => materialDetails.set(row.id, rowToCamelCase<MaterialRow>(row)))

      const [nutRows]: any[][] = await query(
        `SELECT * FROM material_nutrition WHERE material_id IN (${placeholders})`,
        materialIds
      )
      nutRows.forEach((row: any) => nutritionData.set(row.material_id, rowToCamelCase<NutritionRow>(row)))
    }
  }

  return { formula, version, materials, ratioFactor, supplementRatioFactor, versionLabel, materialDetails, nutritionData }
}

/**
 * 导出配方为 PDF Buffer
 */
export async function exportFormulaToPdf(
  formulaId: string,
  versionId?: string
): Promise<{ buffer: Buffer; fileName: string }> {
  const { formula, version, materials, ratioFactor, supplementRatioFactor, versionLabel, materialDetails, nutritionData } =
    await getFormulaData(formulaId, versionId)

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `${formula.name} - 配方导出`,
      Author: 'TingStudio',
      Subject: formula.description || '',
    },
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const pageWidth = doc.page.width - 100 // 左右各 50 margin
  const startX = 50
  let y = 50

  // ===== 标题 =====
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#333333')
  doc.text(formula.name, startX, y, { width: pageWidth })
  y = doc.y + 8

  doc.fontSize(11).font('Helvetica').fillColor('#888888')
  doc.text(`Version: ${versionLabel}`, startX, y)
  y = doc.y + 20

  // ===== 分割线 =====
  doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#FF6B8A').lineWidth(2).stroke()
  y += 15

  // ===== 配方基本信息 =====
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333')
  doc.text('Formula Information', startX, y)
  y = doc.y + 10

  const infoItems: [string, string][] = [
    ['Formula Name', formula.name],
    ['Salesperson', formula.salesmanName],
    ['Version', versionLabel],
    ['Created', new Date(formula.createdAt).toLocaleString('zh-CN')],
    ['Last Updated', new Date(formula.updatedAt).toLocaleString('zh-CN')],
    ['Finished Weight (g)', String(formula.finishedWeight)],
    ['Herb Ratio', String(ratioFactor)],
    ['Supplement Ratio', String(supplementRatioFactor)],
  ]

  if (version?.versionReason) {
    infoItems.push(['Version Note', version.versionReason])
  }
  infoItems.push(['Description', formula.description || 'None'])

  doc.fontSize(10).font('Helvetica')
  for (const [label, value] of infoItems) {
    doc.fillColor('#666666').text(`${label}:`, startX, y, { continued: true, width: 150 })
    doc.fillColor('#333333').text(`  ${value}`, { width: pageWidth - 150 })
    y = doc.y + 4
  }
  y += 10

  // ===== 原料清单表格 =====
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333')
  doc.text('Material List', startX, y)
  y = doc.y + 10

  // 表头背景
  const colWidths = [35, 160, 80, 50, 70, 45]
  const colHeaders = ['#', 'Material', 'Code', 'Type', 'Qty (g)', 'Unit']

  // 表头
  doc.rect(startX, y, pageWidth, 22).fill('#FF6B8A')
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
  let x = startX
  for (let i = 0; i < colHeaders.length; i++) {
    doc.text(colHeaders[i], x + 4, y + 6, { width: colWidths[i] - 8 })
    x += colWidths[i]
  }
  y += 22

  // 数据行
  doc.font('Helvetica').fontSize(9)
  materials.forEach((m: any, i: number) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null
    const name = detail?.name || m.materialName || 'N/A'
    const code = detail?.code || ''
    const type = detail?.materialType === 'supplement' ? 'Supplement' : 'Herb'
    const qty = String(m.quantity || 0)
    const unit = detail?.unit || 'g'

    // 交替行背景
    if (i % 2 === 0) {
      doc.rect(startX, y, pageWidth, 20).fill('#FFF5F7')
    }

    const rowData = [String(i + 1), name, code, type, qty, unit]
    doc.fillColor('#333333')
    x = startX
    for (let j = 0; j < rowData.length; j++) {
      doc.text(rowData[j], x + 4, y + 5, { width: colWidths[j] - 8 })
      x += colWidths[j]
    }
    y += 20
  })

  y += 15

  // ===== 营养数据表格 =====
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333')
  doc.text('Nutrition Data', startX, y)
  y = doc.y + 10

  const nutColWidths = [35, 120, 65, 60, 75, 55, 60, 50]
  const nutHeaders = ['#', 'Material', 'Protein', 'Fat', 'Carbs', 'Sodium', 'Calories', 'Fiber']
  const nutUnits = ['', '', 'g/100g', 'g/100g', 'g/100g', 'mg/100g', 'kcal/100g', 'g/100g']

  // 表头
  doc.rect(startX, y, pageWidth, 22).fill('#FF6B8A')
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF')
  x = startX
  for (let i = 0; i < nutHeaders.length; i++) {
    doc.text(nutHeaders[i], x + 3, y + 6, { width: nutColWidths[i] - 6 })
    x += nutColWidths[i]
  }
  y += 22

  // 数据行 + 合计
  const totalNutrition = { protein: 0, fat: 0, carbohydrate: 0, sodium: 0, calories: 0, dietaryFiber: 0 }

  doc.font('Helvetica').fontSize(8)
  materials.forEach((m: any, i: number) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null
    const name = detail?.name || m.materialName || 'N/A'
    const nutrition = m.materialId ? nutritionData.get(m.materialId) : null

    if (nutrition) {
      const ratio = (m.quantity || 0) / 100
      totalNutrition.protein += nutrition.protein * ratio
      totalNutrition.fat += nutrition.fat * ratio
      totalNutrition.carbohydrate += nutrition.carbohydrate * ratio
      totalNutrition.sodium += nutrition.sodium * ratio
      totalNutrition.calories += nutrition.calories * ratio
      totalNutrition.dietaryFiber += nutrition.dietaryFiber * ratio
    }

    if (i % 2 === 0) {
      doc.rect(startX, y, pageWidth, 18).fill('#FFF5F7')
    }

    const rowData = [
      String(i + 1), name,
      nutrition?.protein?.toFixed(1) ?? '0',
      nutrition?.fat?.toFixed(1) ?? '0',
      nutrition?.carbohydrate?.toFixed(1) ?? '0',
      nutrition?.sodium?.toFixed(1) ?? '0',
      nutrition?.calories?.toFixed(1) ?? '0',
      nutrition?.dietaryFiber?.toFixed(1) ?? '0',
    ]
    doc.fillColor('#333333')
    x = startX
    for (let j = 0; j < rowData.length; j++) {
      doc.text(rowData[j], x + 3, y + 5, { width: nutColWidths[j] - 6 })
      x += nutColWidths[j]
    }
    y += 18
  })

  // 合计行
  y += 2
  doc.rect(startX, y, pageWidth, 20).fill('#FFE8EE')
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333')
  const totalData = [
    '', 'TOTAL',
    totalNutrition.protein.toFixed(2),
    totalNutrition.fat.toFixed(2),
    totalNutrition.carbohydrate.toFixed(2),
    totalNutrition.sodium.toFixed(2),
    totalNutrition.calories.toFixed(2),
    totalNutrition.dietaryFiber.toFixed(2),
  ]
  x = startX
  for (let j = 0; j < totalData.length; j++) {
    doc.text(totalData[j], x + 3, y + 6, { width: nutColWidths[j] - 6 })
    x += nutColWidths[j]
  }
  y += 30

  // ===== 页脚 =====
  doc.fontSize(8).font('Helvetica').fillColor('#AAAAAA')
  doc.text(`Generated by TingStudio on ${new Date().toLocaleString('zh-CN')}`, startX, y, {
    width: pageWidth,
    align: 'center',
  })

  doc.end()

  // 等待 PDF 生成完成
  return new Promise<{ buffer: Buffer; fileName: string }>((resolve, reject) => {
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks)
      const fileName = `${formula.name}_${versionLabel}.pdf`.replace(/[/\\?%*:|"<>]/g, '_')
      resolve({ buffer, fileName })
    })
    doc.on('error', reject)
  })
}
