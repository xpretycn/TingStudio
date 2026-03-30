/**
 * 配方导出引擎
 * 将配方数据导出为 Excel 文件
 */
import XLSX from 'xlsx'
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

/**
 * 导出配方为 Excel Buffer
 */
export async function exportFormulaToExcel(
  formulaId: string,
  versionId?: string
): Promise<{ buffer: Buffer; fileName: string }> {
  // 获取配方基本信息
  const [formulas]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
  if (!formulas.length) throw new Error('配方不存在')
  const formula = rowToCamelCase<FormulaRow>(formulas[0])

  // 确定使用的版本
  let version: rowToCamelCase<VersionRow> | null = null
  let snapshot: any = null

  if (versionId) {
    const [versions]: any[][] = await query('SELECT * FROM formula_versions WHERE version_id = ?', [versionId])
    if (versions.length) {
      version = rowToCamelCase(versions[0])
      snapshot = safeJsonParse(version.snapshotJson, null)
    }
  }

  // 如果没指定版本或版本不存在，使用配方当前数据
  const materials = snapshot?.materials || safeJsonParse<any[]>(formula.materialsJson, [])
  const ratioFactor = version?.ratioFactor ?? formula.ratioFactor
  const supplementRatioFactor = version?.supplementRatioFactor ?? formula.supplementRatioFactor
  const versionLabel = version ? `V${version.versionNumber}` : '当前版本'

  // 获取原料详情和营养数据
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
      matRows.forEach((row: any) => {
        materialDetails.set(row.id, rowToCamelCase<MaterialRow>(row))
      })

      const [nutRows]: any[][] = await query(
        `SELECT * FROM material_nutrition WHERE material_id IN (${placeholders})`,
        materialIds
      )
      nutRows.forEach((row: any) => {
        nutritionData.set(row.material_id, rowToCamelCase<NutritionRow>(row))
      })
    }
  }

  // 构建工作簿
  const workbook = XLSX.utils.book_new()

  // ===== Sheet 1: 配方信息 =====
  const infoData = [
    ['配方基本信息'],
    [''],
    ['配方名称', formula.name],
    ['业务员', formula.salesmanName],
    ['版本', versionLabel],
    ['创建时间', formula.createdAt],
    ['最后更新', formula.updatedAt],
    [''],
    ['成品重量(g)', formula.finishedWeight],
    ['药材比系数', ratioFactor],
    ['辅料比系数', supplementRatioFactor],
    [''],
    ['备注', formula.description || '无'],
  ]
  if (version?.versionReason) {
    infoData.push(['版本说明', version.versionReason])
  }
  const infoSheet = XLSX.utils.aoa_to_sheet(infoData)
  infoSheet['!cols'] = [{ wch: 16 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(workbook, infoSheet, '配方信息')

  // ===== Sheet 2: 原料清单 =====
  const materialHeader = ['序号', '原料名称', '原料编码', '类型', '数量(g)', '单位']
  const materialRows = materials.map((m: any, i: number) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null
    return [
      i + 1,
      detail?.name || m.materialName || '未匹配原料',
      detail?.code || '',
      detail?.materialType === 'supplement' ? '辅料' : '药材',
      m.quantity || 0,
      detail?.unit || 'g',
    ]
  })
  const materialData = [materialHeader, ...materialRows]
  const materialSheet = XLSX.utils.aoa_to_sheet(materialData)
  materialSheet['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
  ]
  XLSX.utils.book_append_sheet(workbook, materialSheet, '原料清单')

  // ===== Sheet 3: 营养数据 =====
  const nutritionHeader = ['序号', '原料名称', '蛋白质(g/100g)', '脂肪(g/100g)', '碳水化合物(g/100g)', '钠(mg/100g)', '热量(kcal/100g)', '膳食纤维(g/100g)']
  const nutritionRows = materials.map((m: any, i: number) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null
    const nutrition = m.materialId ? nutritionData.get(m.materialId) : null
    return [
      i + 1,
      detail?.name || m.materialName || '未匹配原料',
      nutrition?.protein ?? 0,
      nutrition?.fat ?? 0,
      nutrition?.carbohydrate ?? 0,
      nutrition?.sodium ?? 0,
      nutrition?.calories ?? 0,
      nutrition?.dietaryFiber ?? 0,
    ]
  })
  const nutritionData2 = [nutritionHeader, ...nutritionRows]

  // 计算配方总量
  const totalNutrition = materials.reduce((acc: any, m: any) => {
    const ratio = (m.quantity || 0) / 100
    const nutrition = m.materialId ? nutritionData.get(m.materialId) : null
    if (nutrition) {
      acc.protein += nutrition.protein * ratio
      acc.fat += nutrition.fat * ratio
      acc.carbohydrate += nutrition.carbohydrate * ratio
      acc.sodium += nutrition.sodium * ratio
      acc.calories += nutrition.calories * ratio
      acc.dietaryFiber += nutrition.dietaryFiber * ratio
    }
    return acc
  }, { protein: 0, fat: 0, carbohydrate: 0, sodium: 0, calories: 0, dietaryFiber: 0 })

  nutritionData2.push([])
  nutritionData2.push(['', '配方合计', totalNutrition.protein.toFixed(2), totalNutrition.fat.toFixed(2), totalNutrition.carbohydrate.toFixed(2), totalNutrition.sodium.toFixed(2), totalNutrition.calories.toFixed(2), totalNutrition.dietaryFiber.toFixed(2)])

  const nutritionSheet = XLSX.utils.aoa_to_sheet(nutritionData2)
  nutritionSheet['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(workbook, nutritionSheet, '营养数据')

  // 生成文件
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const fileName = `${formula.name}_${versionLabel}.xlsx`.replace(/[/\\?%*:|"<>]/g, '_')

  return { buffer, fileName }
}
