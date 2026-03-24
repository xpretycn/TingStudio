// 配方版本控制控制器
import { Request, Response } from 'express'
import { query } from '../config/database.js'
import { generateId, now, success, rowToCamelCase, rowsToCamelCase, safeJsonParse } from '../utils/helpers.js'

/** 获取配方的所有版本 */
export async function getVersions(req: Request, res: Response) {
  try {
    const { formulaId } = req.params
    const { status } = req.query

    let whereSql = 'WHERE formula_id = ?'
    const params: any[] = [formulaId]

    if (status) {
      whereSql += ' AND status = ?'
      params.push(status)
    }

    const [versions]: any[] = await query(
      `SELECT * FROM formula_versions ${whereSql} ORDER BY created_at DESC`,
      params
    )

    const result = versions.map((v: any) => ({
      ...rowToCamelCase(v),
      changes: safeJsonParse(v.changes_json, []),
      snapshot: safeJsonParse(v.snapshot_json, {}),
    }))

    res.json(success(result))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取版本列表失败', error: error.message })
  }
}

/** 获取单个版本详情 */
export async function getVersion(req: Request, res: Response) {
  try {
    const { versionId } = req.params
    const [[version]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, message: '版本不存在' })
      return
    }

    res.json(success({
      ...rowToCamelCase(version),
      changes: safeJsonParse(version.changes_json, []),
      snapshot: safeJsonParse(version.snapshot_json, {}),
    }))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取版本详情失败', error: error.message })
  }
}

/** 创建新版本（手动快照） */
export async function createVersion(req: any, res: Response) {
  try {
    const { formulaId } = req.params
    const { versionName, status } = req.body
    const userId = req.user.userId

    // 获取当前配方
    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
    if (!formula) {
      res.status(404).json({ success: false, message: '配方不存在' })
      return
    }

    // 获取最新版本号
    const [versions]: any[] = await query(
      'SELECT version_number FROM formula_versions WHERE formula_id = ? ORDER BY created_at DESC LIMIT 1',
      [formulaId]
    )
    const lastVersionNum = versions.length > 0 ? versions[0].version_number : 'v0.0'
    const match = lastVersionNum.match(/v(\d+)\.(\d+)/)
    let newVersionNum = 'v1.0'
    if (match) {
      newVersionNum = `v${parseInt(match[1]) + 1}.0`
    }

    const versionId = generateId()

    // 将旧当前版本设为非当前
    await query('UPDATE formula_versions SET is_current = 0 WHERE formula_id = ?', [formulaId])

    await query(
      `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, snapshot_json, status, is_current, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        versionId, formulaId, newVersionNum, versionName || `手动版本 ${newVersionNum}`,
        JSON.stringify({
          name: formula.name, customerId: formula.customer_id,
          customerName: formula.customer_name,
          materials: safeJsonParse(formula.materials_json, []),
          description: formula.description,
          formulaData: formula,
        }),
        status || 'draft', userId, now()
      ]
    )

    res.status(201).json(success({ versionId, versionNumber: newVersionNum }, '版本创建成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '创建版本失败', error: error.message })
  }
}

/** 发布版本 */
export async function publishVersion(req: Request, res: Response) {
  try {
    const { versionId } = req.params

    const [[version]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, message: '版本不存在' })
      return
    }

    // 将同一配方的所有版本设为非当前和归档
    await query(
      'UPDATE formula_versions SET is_current = 0, status = "archived" WHERE formula_id = ? AND version_id != ?',
      [version.formula_id, versionId]
    )

    // 发布当前版本
    await query(
      'UPDATE formula_versions SET status = "published", is_current = 1 WHERE version_id = ?',
      [versionId]
    )

    res.json(success(null, '版本已发布'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '发布版本失败', error: error.message })
  }
}

/** 版本对比 */
export async function compareVersions(req: Request, res: Response) {
  try {
    const { formulaId } = req.params
    const { versionA, versionB } = req.query

    if (!versionA || !versionB) {
      res.status(400).json({ success: false, message: '请提供两个版本ID进行对比' })
      return
    }

    const [[vA]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ? AND formula_id = ?',
      [versionA, formulaId]
    )
    const [[vB]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ? AND formula_id = ?',
      [versionB, formulaId]
    )

    if (!vA || !vB) {
      res.status(404).json({ success: false, message: '版本不存在' })
      return
    }

    const snapshotA = safeJsonParse(vA.snapshot_json, {})
    const snapshotB = safeJsonParse(vB.snapshot_json, {})
    const materialsA = snapshotA.materials || []
    const materialsB = snapshotB.materials || []

    const differences: any[] = []
    let addedCount = 0, modifiedCount = 0, deletedCount = 0

    // 客户变更
    if (snapshotA.customerId !== snapshotB.customerId) {
      differences.push({
        fieldId: 'customerId',
        fieldLabel: '客户',
        fieldType: 'customer',
        changes: { oldValue: snapshotA.customerName, newValue: snapshotB.customerName, changeType: 'modify', highlighted: true },
      })
      modifiedCount++
    }

    // 描述变更
    if (snapshotA.description !== snapshotB.description) {
      differences.push({
        fieldId: 'description',
        fieldLabel: '配方描述',
        fieldType: 'description',
        changes: { oldValue: snapshotA.description, newValue: snapshotB.description, changeType: 'modify' },
      })
      modifiedCount++
    }

    // 原料变更
    for (const matA of materialsA) {
      const matB = materialsB.find((m: any) => m.materialId === matA.materialId)
      if (!matB) {
        differences.push({
          fieldId: `material_${matA.materialId}`,
          fieldLabel: `原料: ${matA.materialName}`,
          fieldType: 'material',
          changes: { oldValue: matA.quantity, newValue: null, changeType: 'delete' },
        })
        deletedCount++
      } else if (matA.quantity !== matB.quantity) {
        differences.push({
          fieldId: `material_qty_${matA.materialId}`,
          fieldLabel: `${matA.materialName} 数量`,
          fieldType: 'materialQuantity',
          changes: { oldValue: matA.quantity, newValue: matB.quantity, changeType: 'modify', highlighted: true },
        })
        modifiedCount++
      }
    }

    for (const matB of materialsB) {
      const exists = materialsA.find((m: any) => m.materialId === matB.materialId)
      if (!exists) {
        differences.push({
          fieldId: `material_${matB.materialId}`,
          fieldLabel: `原料: ${matB.materialName}`,
          fieldType: 'material',
          changes: { oldValue: null, newValue: matB.quantity, changeType: 'add' },
        })
        addedCount++
      }
    }

    const diffResult = {
      diffId: generateId(),
      versionA: rowToCamelCase(vA),
      versionB: rowToCamelCase(vB),
      differences,
      summary: {
        totalChanges: differences.length,
        addedCount,
        modifiedCount,
        deletedCount,
        materialChanges: differences.filter((d: any) => d.fieldType?.startsWith('material')).length,
        descriptionChanges: differences.filter((d: any) => d.fieldType === 'description').length,
        nutritionChanges: 0,
      },
    }

    res.json(success(diffResult))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '版本对比失败', error: error.message })
  }
}
