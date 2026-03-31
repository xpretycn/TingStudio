// 营养成分管理控制器
import { Request, Response } from 'express'
import { query } from '../config/database.js'
import { generateId, now, success, rowToCamelCase, rowsToCamelCase, safeJsonParse } from '../utils/helpers.js'

// 营养成分字段列表
const NUTRIENT_FIELDS = [
  'energy', 'protein', 'fat', 'carbohydrate', 'fiber', 'sugars',
  'sodium', 'potassium', 'calcium', 'iron', 'zinc', 'magnesium', 'phosphorus',
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
  'vitaminB1', 'vitaminB2', 'vitaminB3', 'vitaminB6', 'vitaminB12', 'folate',
  'cholesterol', 'transFat', 'saturatedFat',
]

// DB 键名 → 标准键名映射（兼容带单位后缀的键名）
function normalizeNutrientKey(key: string): string {
  const map: Record<string, string> = {
    energy_kj: 'energy', protein_g: 'protein', fat_g: 'fat',
    carbohydrate_g: 'carbohydrate', dietary_fiber_g: 'fiber',
    sugars_g: 'sugars', sodium_mg: 'sodium', potassium_mg: 'potassium',
    calcium_mg: 'calcium', iron_mg: 'iron', zinc_mg: 'zinc',
    magnesium_mg: 'magnesium', phosphorus_mg: 'phosphorus',
    vitaminA_ug: 'vitaminA', vitaminC_mg: 'vitaminC',
    vitaminD_ug: 'vitaminD', vitaminE_mg: 'vitaminE', vitaminK_ug: 'vitaminK',
    vitaminB1_mg: 'vitaminB1', vitaminB2_mg: 'vitaminB2', vitaminB3_mg: 'vitaminB3',
    vitaminB6_mg: 'vitaminB6', vitaminB12_ug: 'vitaminB12', folate_ug: 'folate',
    cholesterol_mg: 'cholesterol', transFat_g: 'transFat', saturatedFat_g: 'saturatedFat',
  }
  if (map[key]) return map[key]
  // 去掉常见的单位后缀
  const cleaned = key.replace(/_(mg|g|ug|μg|kj|kcal)$/, '')
  return map[cleaned] || key
}

/** 将 DB 中的 per_100g_json 键名标准化 */
function normalizePer100g(raw: Record<string, any>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number') {
      result[normalizeNutrientKey(k)] = v
    }
  }
  return result
}

// 营养素参考值 (NRV)
const NRV: Record<string, number> = {
  energy: 8400, protein: 60, fat: 60, carbohydrate: 300, sodium: 2000,
  potassium: 2000, calcium: 800, iron: 15, zinc: 15, vitaminA: 800,
  vitaminC: 100, vitaminD: 5, vitaminE: 14, vitaminB1: 1.4, vitaminB2: 1.4,
  vitaminB3: 14, vitaminB6: 1.4, vitaminB12: 2.4, folate: 400, cholesterol: 300,
  dietaryFiber: 25,
}

/** 获取原料营养成分 */
export async function getMaterialNutrition(req: Request, res: Response) {
  try {
    const { materialId } = req.params
    const [[nutrition]]: any[][] = await query(
      'SELECT * FROM material_nutrition WHERE material_id = ?',
      [materialId]
    )
    if (!nutrition) {
      res.json({ success: true, data: null })
      return
    }
    res.json(success({
      ...rowToCamelCase(nutrition),
      per100g: normalizePer100g(safeJsonParse(nutrition.per_100g_json, {})),
    }))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取营养成分失败', error: error.message })
  }
}

/** 设置/更新原料营养成分 */
export async function setMaterialNutrition(req: any, res: Response) {
  try {
    const { materialId } = req.params
    const { per100g, dataSource, notes, confidence } = req.body
    const userId = req.user.userId

    // 验证原料存在
    const [[material]]: any[][] = await query('SELECT id, name, code FROM materials WHERE id = ?', [materialId])
    if (!material) {
      res.status(404).json({ success: false, message: '原料不存在' })
      return
    }

    // 检查是否已存在
    const [[existing]]: any[][] = await query(
      'SELECT nutrition_id, per_100g_json, data_source, notes, data_version, confidence FROM material_nutrition WHERE material_id = ?',
      [materialId]
    )

    // 验证 confidence 值
    const validConfidence = ['high', 'medium', 'low'].includes(confidence) ? confidence : 'medium'

    if (existing) {
      // 增量更新：将新数据合并到已有数据中
      const oldData: Record<string, number> = safeJsonParse(existing.per_100g_json, {})
      const merged = { ...oldData }
      for (const [key, val] of Object.entries(per100g)) {
        if (typeof val === 'number' && val > 0) {
          merged[key] = val
        } else {
          // 值为0或负数时，移除该字段
          delete merged[key]
        }
      }

      const version = existing.data_version
      const match = version.match(/^(\d+)\./)
      const newVersion = match ? `${parseInt(match[1]) + 1}.0` : '2.0'

      await query(
        `UPDATE material_nutrition SET per_100g_json = ?, data_source = ?, notes = ?, confidence = ?, data_version = ?, last_updated = ?
         WHERE material_id = ?`,
        [JSON.stringify(merged), dataSource || existing.data_source, notes || existing.notes, validConfidence, newVersion, now(), materialId]
      )
    } else {
      // 新建
      const nutritionId = generateId()
      await query(
        `INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_source, notes, confidence, data_version, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, '1.0', ?)`,
        [nutritionId, materialId, JSON.stringify(per100g), dataSource, notes, validConfidence, now()]
      )
    }

    res.json(success(null, '营养成分保存成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '保存营养成分失败', error: error.message })
  }
}

/** 计算配方营养汇总 */
export async function calculateFormulaNutrition(req: any, res: Response) {
  try {
    const { formulaId } = req.params
    const userId = req.user.userId

    // 获取配方数据
    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
    if (!formula) {
      res.status(404).json({ success: false, message: '配方不存在' })
      return
    }

    const materials = safeJsonParse(formula.materials_json, [])
    const formulaRatioFactor = formula.ratio_factor ?? 0.18

    // 获取每个原料的营养数据
    const breakdown: any[] = []
    let totalWeight = 0
    const totalNutrition: Record<string, number> = {}
    for (const field of NUTRIENT_FIELDS) {
      totalNutrition[field] = 0
    }

    for (const mat of materials) {
      let [[nutrition]]: any[][] = await query(
        'SELECT per_100g_json FROM material_nutrition WHERE material_id = ?',
        [mat.materialId]
      )

      // 备选查找：如果通过 materialId 找不到营养数据，尝试通过原料名称匹配
      if (!nutrition && mat.materialName) {
        const [[altMaterial]]: any[][] = await query(
          'SELECT id FROM materials WHERE name = ? LIMIT 1',
          [mat.materialName]
        )
        if (altMaterial) {
          const [[altNutrition]]: any[][] = await query(
            'SELECT per_100g_json FROM material_nutrition WHERE material_id = ?',
            [altMaterial.id]
          )
          if (altNutrition) {
            nutrition = altNutrition
          }
        }
      }

      const rawPer100g = nutrition ? safeJsonParse(nutrition.per_100g_json, {}) : {}
      const per100g = normalizePer100g(rawPer100g)
      const quantity = mat.quantity || 0
      const contribution: Record<string, number> = {}

      for (const field of NUTRIENT_FIELDS) {
        const val = (per100g[field] || 0) * (quantity / 100)
        contribution[field] = val
        totalNutrition[field] += val
      }

      totalWeight += quantity
      breakdown.push({
        materialId: mat.materialId,
        materialName: mat.materialName,
        materialCode: '',
        quantity,
        unit: 'g',
        weightContribution: quantity,
        percentage: 0,
        nutritionContribution: contribution,
      })
    }

    // 计算占比
    if (totalWeight > 0) {
      for (const item of breakdown) {
        item.percentage = Math.round((item.weightContribution / totalWeight) * 10000) / 100
      }
    }

    // 计算 per100g
    const per100gNutrition: Record<string, number> = {}
    if (totalWeight > 0) {
      for (const field of NUTRIENT_FIELDS) {
        per100gNutrition[field] = Math.round((totalNutrition[field] / totalWeight) * 100 * 100) / 100
      }
    }

    // 保存汇总
    const [[existingSummary]]: any[][] = await query(
      'SELECT summary_id FROM formula_nutrition_summaries WHERE formula_id = ?',
      [formulaId]
    )

    if (existingSummary) {
      await query(
        `UPDATE formula_nutrition_summaries SET total_weight = ?, total_nutrition_json = ?, per_100g_nutrition_json = ?, material_breakdown_json = ?, calculated_by = ?, calculated_at = ?
         WHERE formula_id = ?`,
        [totalWeight, JSON.stringify(totalNutrition), JSON.stringify(per100gNutrition),
         JSON.stringify(breakdown), userId, now(), formulaId]
      )
    } else {
      const summaryId = generateId()
      await query(
        `INSERT INTO formula_nutrition_summaries (summary_id, formula_id, total_weight, total_nutrition_json, per_100g_nutrition_json, material_breakdown_json, calculated_by, calculated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [summaryId, formulaId, totalWeight, JSON.stringify(totalNutrition),
         JSON.stringify(per100gNutrition), JSON.stringify(breakdown), userId, now()]
      )
    }

    res.json(success({
      formulaId,
      formulaName: formula.name,
      totalWeight,
      totalNutrition,
      per100gNutrition,
      materialBreakdown: breakdown,
    }))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '营养计算失败', error: error.message })
  }
}

/** 获取营养标准列表 */
export async function getNutritionProfiles(req: Request, res: Response) {
  try {
    const { category } = req.query
    let sql = 'SELECT * FROM nutrition_profiles'
    const params: any[] = []

    if (category) {
      sql += ' WHERE category = ?'
      params.push(category)
    }
    sql += ' ORDER BY created_at DESC'

    const [profiles]: any[] = await query(sql, params)
    const result = profiles.map((p: any) => ({
      ...rowToCamelCase(p),
      targetValues: safeJsonParse(p.target_values_json, {}),
      toleranceRanges: safeJsonParse(p.tolerance_ranges_json, []),
      mandatoryFields: safeJsonParse(p.mandatory_fields_json, []),
    }))

    res.json(success(result))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取营养标准失败', error: error.message })
  }
}

/** 创建营养标准 */
export async function createNutritionProfile(req: Request, res: Response) {
  try {
    const { name, description, category, targetValues, toleranceRanges, mandatoryFields } = req.body
    const id = generateId()

    await query(
      `INSERT INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, is_preset, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, name, description, category, JSON.stringify(targetValues),
       JSON.stringify(toleranceRanges || []), JSON.stringify(mandatoryFields || []), now()]
    )

    res.status(201).json(success({ profileId: id }, '营养标准创建成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '创建营养标准失败', error: error.message })
  }
}

/** 更新营养标准 */
export async function updateNutritionProfile(req: Request, res: Response) {
  try {
    const { profileId } = req.params
    const { name, description, category, targetValues, toleranceRanges, mandatoryFields } = req.body

    // 检查是否存在
    const [[profile]]: any[][] = await query(
      'SELECT * FROM nutrition_profiles WHERE profile_id = ?',
      [profileId]
    )
    if (!profile) {
      res.status(404).json({ success: false, message: '营养标准不存在' })
      return
    }

    // 预置标准不可修改
    if (profile.is_preset === 1) {
      res.status(403).json({ success: false, message: '预置营养标准不可修改' })
      return
    }

    await query(
      `UPDATE nutrition_profiles SET name = ?, description = ?, category = ?,
       target_values_json = ?, tolerance_ranges_json = ?, mandatory_fields_json = ?, updated_at = ?
       WHERE profile_id = ?`,
      [name, description, category,
       JSON.stringify(targetValues), JSON.stringify(toleranceRanges || []),
       JSON.stringify(mandatoryFields || []), now(), profileId]
    )

    res.json(success(null, '营养标准更新成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '更新营养标准失败', error: error.message })
  }
}

/** 删除营养标准 */
export async function deleteNutritionProfile(req: Request, res: Response) {
  try {
    const { profileId } = req.params

    // 检查是否存在
    const [[profile]]: any[][] = await query(
      'SELECT * FROM nutrition_profiles WHERE profile_id = ?',
      [profileId]
    )
    if (!profile) {
      res.status(404).json({ success: false, message: '营养标准不存在' })
      return
    }

    // 预置标准不可删除
    if (profile.is_preset === 1) {
      res.status(403).json({ success: false, message: '预置营养标准不可删除' })
      return
    }

    await query('DELETE FROM nutrition_profiles WHERE profile_id = ?', [profileId])
    res.json(success(null, '营养标准删除成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '删除营养标准失败', error: error.message })
  }
}

/** 合规性检查 */
export async function checkCompliance(req: any, res: Response) {
  try {
    const { formulaId } = req.params
    const profileId = req.query.profileId as string | undefined
    const userId = req.user.userId

    console.log('[Nutrition] 合规检查:', { formulaId, profileId })
    console.log('[Nutrition] req.query:', req.query)
    console.log('[Nutrition] req.user:', req.user)

    // 获取配方营养汇总
    const [[summary]]: any[][] = await query(
      'SELECT * FROM formula_nutrition_summaries WHERE formula_id = ?',
      [formulaId]
    )
    if (!summary) {
      console.error('[Nutrition] 未找到配方营养汇总:', formulaId)
      res.status(404).json({ success: false, message: '请先计算配方营养成分' })
      return
    }

    console.log('[Nutrition] 配方营养汇总:', summary.formula_id)

    const per100g = safeJsonParse(summary.per_100g_nutrition_json, {})
    console.log('[Nutrition] per100g:', per100g)

    const profile = profileId ? await getProfile(profileId) : null
    console.log('[Nutrition] profile:', profile ? profile.name : '无')

    // 营养素中文名映射
    const NUTRIENT_LABELS: Record<string, string> = {
      energy: '能量', protein: '蛋白质', fat: '脂肪', carbohydrate: '碳水化合物',
      fiber: '膳食纤维', sugars: '糖', sodium: '钠', potassium: '钾',
      calcium: '钙', iron: '铁', zinc: '锌', magnesium: '镁', phosphorus: '磷',
      vitaminA: '维生素A', vitaminC: '维生素C', vitaminD: '维生素D',
      vitaminE: '维生素E', vitaminK: '维生素K', vitaminB1: '维生素B1',
      vitaminB2: '维生素B2', vitaminB3: '烟酸', vitaminB6: '维生素B6',
      vitaminB12: '维生素B12', folate: '叶酸', cholesterol: '胆固醇',
      transFat: '反式脂肪', saturatedFat: '饱和脂肪',
    }

    // 将 profile 的 targetValues 和 toleranceRanges 标准化为统一的内部格式
    // 数据库可能存储两种格式：
    //   1) 数组格式: toleranceRanges=[{field, label, min, max, alertLevel}]
    //   2) 对象格式: toleranceRanges={energy_kj:{min:0.9,max:1.1}} (倍率) + targetValues={energy_kj:1900}
    let normalizedTolerances: Record<string, { min: number; max: number; label: string; alertLevel?: string }> = {}
    let normalizedTargets: Record<string, number> = {}

    if (profile) {
      // 标准化 targetValues（兼容带单位后缀的键名）
      const rawTargets = profile.targetValues || {}
      for (const [key, val] of Object.entries(rawTargets)) {
        const normalizedKey = normalizeNutrientKey(key)
        if (typeof val === 'number') {
          normalizedTargets[normalizedKey] = val
        }
      }

      const rawRanges = profile.toleranceRanges
      if (Array.isArray(rawRanges)) {
        // 数组格式: [{field:"energy", label:"能量", min:10, max:15}, ...]
        for (const r of rawRanges) {
          const normalizedKey = normalizeNutrientKey(r.field || '')
          normalizedTolerances[normalizedKey] = {
            min: r.min,
            max: r.max,
            label: r.label || NUTRIENT_LABELS[normalizedKey] || normalizedKey,
            alertLevel: r.alertLevel,
          }
        }
      } else if (rawRanges && typeof rawRanges === 'object') {
        // 对象格式: {energy_kj:{min:0.9,max:1.1}, protein_g:{min:0.8,max:1.2}}
        // min/max 是倍率，需要乘以 target 得到实际范围
        for (const [key, range] of Object.entries(rawRanges)) {
          const normalizedKey = normalizeNutrientKey(key)
          const target = normalizedTargets[normalizedKey]
          const r = range as any
          if (target && typeof r.min === 'number' && typeof r.max === 'number') {
            normalizedTolerances[normalizedKey] = {
              min: Math.round(target * r.min * 100) / 100,
              max: Math.round(target * r.max * 100) / 100,
              label: NUTRIENT_LABELS[normalizedKey] || normalizedKey,
              alertLevel: 'warning',
            }
          }
        }
      }
    }

    const complianceChecks: any[] = []
    const recommendations: any[] = []

    for (const field of NUTRIENT_FIELDS) {
      const actualValue = per100g[field] || 0
      if (actualValue === 0) continue

      if (profile) {
        const tolerance = normalizedTolerances[field]
        const target = normalizedTargets[field]
        const label = NUTRIENT_LABELS[field] || field

        if (tolerance) {
          let status: 'pass' | 'warning' | 'fail' = 'pass'
          let deviation = 0
          let message = ''
          let suggestedActions: string[] = []

          if (target !== undefined) {
            deviation = actualValue - target

            if (actualValue < tolerance.min) {
              status = 'fail'
              message = `${label} 不足: 实际 ${actualValue.toFixed(2)} < 最小值 ${tolerance.min}`
              suggestedActions = [
                `增加富含${label}的原料`,
                `调整配方比例以提高${label}含量`,
              ]
            } else if (actualValue > tolerance.max) {
              status = 'fail'
              message = `${label} 超标: 实际 ${actualValue.toFixed(2)} > 最大值 ${tolerance.max}`
              suggestedActions = [
                `减少富含${label}的原料`,
                `调整配方比例以降低${label}含量`,
              ]
            } else if (tolerance.alertLevel === 'warning') {
              const range = tolerance.max - tolerance.min
              const deviationPercent = Math.abs(deviation) / range
              if (deviationPercent > 0.8) {
                status = 'warning'
                message = `${label} 接近临界值: 实际 ${actualValue.toFixed(2)}, 范围 ${tolerance.min}-${tolerance.max}`
                suggestedActions = [
                  `关注${label}含量变化`,
                  `考虑微调配方`,
                ]
              }
            }
          }

          complianceChecks.push({
            field,
            label,
            actualValue,
            targetRange: { min: tolerance.min, max: tolerance.max },
            target,
            status,
            deviation: Math.round(deviation * 100) / 100,
            message,
            suggestedActions,
          })
        }
      } else {
        // 没有标准时，只显示数值
        const label = NUTRIENT_LABELS[field] || field
        complianceChecks.push({
          field,
          label,
          actualValue,
          status: 'pass' as const,
          message: `${label}: ${actualValue.toFixed(2)}`,
          suggestedActions: [],
        })
      }
    }

    // 生成推荐建议（结构化）
    const passCount = complianceChecks.filter((c: any) => c.status === 'pass').length
    const warningCount = complianceChecks.filter((c: any) => c.status === 'warning').length
    const failCount = complianceChecks.filter((c: any) => c.status === 'fail').length

    if (failCount > 0) {
      recommendations.push({
        type: 'safety',
        priority: 'high',
        title: '营养合规性警告',
        description: `有 ${failCount} 项营养指标不达标，建议调整配方`,
        actionable: true,
        suggestedActions: complianceChecks
          .filter((c: any) => c.status === 'fail')
          .flatMap((c: any) => c.suggestedActions || []),
      })
    }

    if (warningCount > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        title: '营养指标接近临界值',
        description: `有 ${warningCount} 项营养指标接近临界值，建议关注`,
        actionable: true,
        suggestedActions: complianceChecks
          .filter((c: any) => c.status === 'warning')
          .flatMap((c: any) => c.suggestedActions || []),
      })
    }

    if (passCount > 0 && failCount === 0) {
      recommendations.push({
        type: 'nutrition',
        priority: 'low',
        title: '营养指标达标',
        description: '所有营养指标均在标准范围内',
        actionable: false,
        suggestedActions: [],
      })
    }

    // 保存报告
    const reportId = generateId()
    await query(
      `INSERT INTO nutrition_analysis_reports (report_id, formula_id, summary_id, compliance_check_json, recommendations_json, generated_by, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reportId, formulaId, summary.summary_id, JSON.stringify(complianceChecks),
       JSON.stringify(recommendations), userId, now()]
    )

    res.json(success({
      reportId,
      complianceCheck: complianceChecks,
      recommendations,
      summary: {
        totalChecked: complianceChecks.length,
        passed: passCount,
        failed: failCount,
        warnings: warningCount,
      },
    }))
  } catch (error: any) {
    console.error('[Nutrition] 合规检查出错:', error)
    console.error('[Nutrition] 错误堆栈:', error.stack)
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误',
      error: error.message 
    })
  }
}

async function getProfile(profileId: string): Promise<any | null> {
  const [[profile]]: any[][] = await query('SELECT * FROM nutrition_profiles WHERE profile_id = ?', [profileId])
  if (!profile) return null
  
  const result = {
    ...rowToCamelCase(profile),
    targetValues: safeJsonParse(profile.target_values_json, {}),
    toleranceRanges: safeJsonParse(profile.tolerance_ranges_json, []),
    mandatoryFields: safeJsonParse(profile.mandatory_fields_json, []),
  }
  
  console.log('[Nutrition] getProfile:', { 
    profileId, 
    hasToleranceRanges: Array.isArray(result.toleranceRanges),
    toleranceRangesCount: result.toleranceRanges?.length || 0,
    targetValuesCount: Object.keys(result.targetValues).length
  })
  
  return result
}

/** 获取配方营养计算表格数据（与 XLS 格式一致） */
export async function getFormulaNutritionTables(req: any, res: Response) {
  try {
    const { formulaId } = req.params

    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
    if (!formula) {
      res.status(404).json({ success: false, message: '配方不存在' })
      return
    }

    const materials = safeJsonParse(formula.materials_json, [])
    const NUTRIENT_COLS = ['protein', 'fat', 'carbohydrate', 'sodium'] as const
    const finishedWeight = formula.finished_weight || 0
    const formulaRatioFactor = formula.ratio_factor ?? 0.18
    const supplementRatioFactor = formula.supplement_ratio_factor ?? 1.0

    // 批量获取所有原料的类型（区分药材和辅料）
    // ratio_factor 现在存储在 formulas 表中，不再从 materials 表获取
    const materialTypes: Record<string, string> = {}
    if (materials.length > 0) {
      const matIds = materials.map((m: any) => m.materialId)
      const placeholders = matIds.map(() => '?').join(',')
      const [matRows]: any[] = await query(
        `SELECT id, material_type FROM materials WHERE id IN (${placeholders})`,
        matIds
      )
      for (const row of matRows) {
        materialTypes[row.id] = row.material_type || 'herb'
      }
    }

    const LABEL_INFO: Record<string, { name: string; unit: string; zeroThreshold: string; tolerance: string }> = {
      energy: { name: '能量', unit: '千焦(kJ)', zeroThreshold: '≤17千焦(kJ)', tolerance: '≤120%标示值' },
      protein: { name: '蛋白质', unit: '克(g)', zeroThreshold: '≤0.5克(g)', tolerance: '≥80%标示值' },
      fat: { name: '脂肪', unit: '克(g)', zeroThreshold: '≤0.5克(g)', tolerance: '≤120%标示值' },
      carbohydrate: { name: '碳水化合物', unit: '克(g)', zeroThreshold: '≤0.5克(g)', tolerance: '≥80%标示值' },
      sodium: { name: '钠', unit: '毫克(mg)', zeroThreshold: '≤5毫克(mg)', tolerance: '≤120%标示值' },
    }

    let totalQuantity = 0
    let totalRatio = 0

    // 记录缺少营养数据的原料
    const missingNutritionMaterials: string[] = []

    // 表1：营养成分计算表格行数据
    const calcRows: any[] = []
    for (const mat of materials) {
      let [[nutrition]]: any[][] = await query(
        'SELECT per_100g_json FROM material_nutrition WHERE material_id = ?', [mat.materialId]
      )

      // 备选查找：如果通过 materialId 找不到营养数据，尝试通过原料名称匹配
      if (!nutrition && mat.materialName) {
        const [[altMaterial]]: any[][] = await query(
          'SELECT id FROM materials WHERE name = ? LIMIT 1',
          [mat.materialName]
        )
        if (altMaterial) {
          const [[altNutrition]]: any[][] = await query(
            'SELECT per_100g_json FROM material_nutrition WHERE material_id = ?',
            [altMaterial.id]
          )
          if (altNutrition) {
            nutrition = altNutrition
          }
        }
      }

      const hasNutrition = !!nutrition && nutrition.per_100g_json
      const per100g = hasNutrition ? normalizePer100g(safeJsonParse(nutrition.per_100g_json, {})) : {}

      if (!hasNutrition || Object.keys(per100g).length === 0) {
        missingNutritionMaterials.push(mat.materialName || mat.materialId)
      }

      const quantity = mat.quantity || 0

      // 含量比 = quantity / finishedWeight * ratioFactor
      // 药材使用 ratio_factor，辅料使用 supplement_ratio_factor
      const isSupplement = materialTypes[mat.materialId] === 'supplement'
      const effectiveRatio = isSupplement ? supplementRatioFactor : formulaRatioFactor
      const ratio = finishedWeight > 0
        ? Math.round((quantity / finishedWeight) * effectiveRatio * 100000) / 100000
        : 0

      const row: any = {
        name: mat.materialName,
        quantity,
        ratio,
        energy: '',  // 能量由DB不直接提供，单独计算
        protein: per100g.protein ?? 0,
        fat: per100g.fat ?? 0,
        carbohydrate: per100g.carbohydrate ?? 0,
        sodium: per100g.sodium ?? 0,
        hasEmptyNutrition: !hasNutrition || Object.keys(per100g).length === 0,
      }
      calcRows.push(row)

      totalQuantity += quantity
      totalRatio += ratio
    }

    // 汇总行：营养成分表
    // 计算：Σ(per100g营养素 × 含量比)
    const summaryNutrition: Record<string, number> = {}
    for (const f of NUTRIENT_COLS) {
      let sum = 0
      for (const row of calcRows) {
        sum += (row[f] || 0) * row.ratio
      }
      summaryNutrition[f] = Math.round(sum * 10000) / 10000
    }
    // 能量 = 蛋白质 * 17 + 脂肪 * 37 + 碳水化合物 * 17
    const summaryEnergy = Math.round(
      (summaryNutrition.protein * 17 + summaryNutrition.fat * 37 + summaryNutrition.carbohydrate * 17) * 100
    ) / 100

    const summaryRow: any = {
      name: '营养成分表',
      quantity: totalQuantity,
      ratio: Math.round(totalRatio * 100000) / 100000,
      energy: summaryEnergy,
      protein: summaryNutrition.protein,
      fat: summaryNutrition.fat,
      carbohydrate: summaryNutrition.carbohydrate,
      sodium: summaryNutrition.sodium,
    }

    // NRV% 计算
    const nrvRow: any = { name: '营养素参考值(NRV)', quantity: '', ratio: '' }
    const nrvPercentRow: any = { name: '营养素参考值%', quantity: '', ratio: '' }
    // 能量NRV
    nrvRow.energy = NRV.energy ?? ''
    nrvPercentRow.energy = NRV.energy ? Math.round((summaryEnergy / NRV.energy) * 10000) / 100 : 0
    for (const f of NUTRIENT_COLS) {
      nrvRow[f] = NRV[f] ?? ''
      nrvPercentRow[f] = NRV[f] ? Math.round((summaryNutrition[f] / NRV[f]) * 10000) / 100 : 0
    }

    // 表2：营养成分表 + 技术处理依据
    // 技术处理规则（与 Excel 一致）：
    //   - 低于 0 界限值的归零
    //   - 能量需要重新计算（排除归零的蛋白质/脂肪/碳水贡献后用换算系数重算）
    const ZERO_THRESHOLDS: Record<string, number> = {
      energy: 17,      // ≤17 kJ
      protein: 0.5,    // ≤0.5 g
      fat: 0.5,        // ≤0.5 g
      carbohydrate: 0.5, // ≤0.5 g
      sodium: 5,       // ≤5 mg
    }
    const labelRows: any[] = []

    // 先确定哪些营养素需要归零
    const labelValues: Record<string, number> = {}
    labelValues.energy = summaryEnergy
    for (const f of NUTRIENT_COLS) {
      labelValues[f] = summaryNutrition[f]
    }

    // 技术处理：低于 0 界限值的归零
    const zeroedFields = new Set<string>()
    for (const f of NUTRIENT_COLS) {
      if (Math.abs(labelValues[f]) < ZERO_THRESHOLDS[f]) {
        zeroedFields.add(f)
        labelValues[f] = 0
      }
    }
    // 能量归零判断
    if (Math.abs(labelValues.energy) < ZERO_THRESHOLDS.energy) {
      zeroedFields.add('energy')
      labelValues.energy = 0
    }

    // 能量重新计算：用技术处理后的蛋白质、脂肪、碳水计算
    // 能量(kJ) = 蛋白质(g) × 17 + 脂肪(g) × 37 + 碳水化合物(g) × 17
    if (!zeroedFields.has('energy')) {
      const techEnergy = labelValues.protein * 17 + labelValues.fat * 37 + labelValues.carbohydrate * 17
      labelValues.energy = Math.round(techEnergy)
    }

    // 生成表2行
    // 能量行
    const energyNrv = NRV.energy || 1
    const energyNrvPercent = labelValues.energy > 0
      ? Math.round((labelValues.energy / energyNrv) * 10000) / 100
      : 0
    labelRows.push({
      item: '能量',
      value: labelValues.energy,
      unit: '千焦(kJ)',
      nrvPercent: energyNrvPercent,
      zeroThreshold: '≤17千焦(kJ)',
      tolerance: '≤120%标示值',
    })
    for (const f of NUTRIENT_COLS) {
      const info = LABEL_INFO[f]
      const val = labelValues[f]
      const nrv = NRV[f] || 1
      const nrvPct = val > 0 ? Math.round((val / nrv) * 10000) / 100 : 0
      labelRows.push({
        item: info.name,
        value: val,
        unit: info.unit,
        nrvPercent: nrvPct,
        zeroThreshold: info.zeroThreshold,
        tolerance: info.tolerance,
      })
    }

    res.json(success({
      formulaName: formula.name,
      finishedWeight,
      totalWeight: totalQuantity,
      calcRows,
      summaryRow,
      nrvRow,
      nrvPercentRow,
      labelRows,
      missingNutritionMaterials,
    }))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取营养计算表格失败', error: error.message })
  }
}
