// 配方版本控制控制器
import { Request, Response } from 'express'
import { query } from '../config/database-better-sqlite3.js'
import { generateId, now, success, rowToCamelCase, rowsToCamelCase, safeJsonParse } from '../utils/helpers.js'

/** 获取配方的所有版本 */
export async function getVersions(req: Request, res: Response) {
  try {
    const { formulaId } = req.params
    const { status } = req.query

    // 数据一致性修复：确保每个配方只有一个当前版本，且只有一个已发布版本
    // 1. 多个 is_current=1 时，仅保留最新的一个
    const [currentVersions]: any[] = await query(
      `SELECT version_id FROM formula_versions WHERE formula_id = ? AND is_current = 1 ORDER BY created_at DESC`,
      [formulaId]
    )
    if (currentVersions.length > 1) {
      const archiveIds = currentVersions.slice(1).map((v: any) => v.version_id)
      if (archiveIds.length > 0) {
        const placeholders = archiveIds.map(() => '?').join(',')
        await query(
          `UPDATE formula_versions SET is_current = 0, status = 'archived' WHERE version_id IN (${placeholders})`,
          archiveIds
        )
      }
    }

    // 2. 多个 status='published' 时，仅保留最新的一个，其余归档
    const [publishedVersions]: any[] = await query(
      `SELECT version_id FROM formula_versions WHERE formula_id = ? AND status = 'published' ORDER BY created_at DESC`,
      [formulaId]
    )
    if (publishedVersions.length > 1) {
      const archiveIds = publishedVersions.slice(1).map((v: any) => v.version_id)
      if (archiveIds.length > 0) {
        const placeholders = archiveIds.map(() => '?').join(',')
        await query(
          `UPDATE formula_versions SET status = 'archived' WHERE version_id IN (${placeholders})`,
          archiveIds
        )
      }
    }

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
    const { versionName, versionReason, status } = req.body
    const userId = req.user.userId

    if (!versionReason?.trim()) {
      res.status(400).json({ success: false, message: '请填写升版原因' })
      return
    }

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
      `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, version_reason, snapshot_json, status, is_current, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        versionId, formulaId, newVersionNum, versionReason?.trim() || `手动版本 ${newVersionNum}`,
        versionReason?.trim() || null,
        JSON.stringify({
          name: formula.name, salesmanId: formula.salesman_id,
          salesmanName: formula.salesman_name,
          materials: safeJsonParse(formula.materials_json, []),
          packagingPrice: formula.packaging_price ?? 0,
          otherPrice: formula.other_price ?? 0,
          profitMargin: formula.profit_margin ?? 20,
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

    const formulaId = version.formula_id

    // 检查配方是否存在
    const [[formula]]: any[][] = await query(
      'SELECT id FROM formulas WHERE id = ?',
      [formulaId]
    )
    if (!formula) {
      res.status(404).json({ success: false, message: '关联的配方不存在，无法发布' })
      return
    }

    // 将同一配方的其他所有版本设为归档（仅影响状态为 draft 或 published 的）
    await query(
      `UPDATE formula_versions SET is_current = 0, status = 'archived'
       WHERE formula_id = ? AND version_id <> ? AND status IN ('draft', 'published')`,
      [formulaId, versionId]
    )

    // 发布当前版本
    await query(
      `UPDATE formula_versions SET status = 'published', is_current = 1 WHERE version_id = ?`,
      [versionId]
    )

    // 将快照数据回写到 formulas 表，确保配方数据与当前版本一致
    const snapshot = safeJsonParse(version.snapshot_json, {})
    const formulaData = snapshot.formulaData || snapshot // 兼容两种快照格式
    
    if (snapshot.name || snapshot.materials || formulaData.name) {
      await query(
        `UPDATE formulas SET name=?, salesman_id=?, salesman_name=?, materials_json=?, finished_weight=?, ratio_factor=?, supplement_ratio_factor=?, packaging_price=?, other_price=?, profit_margin=?, description=? WHERE id=?`,
        [
          snapshot.name || formulaData.name || formula.name,
          snapshot.salesmanId || formulaData.salesmanId || formulaData.salesman_id || formula.salesman_id,
          snapshot.salesmanName || formulaData.salesmanName || formulaData.salesman_name || formula.salesman_name,
          JSON.stringify(snapshot.materials || formulaData.materials || []),
          formulaData.finished_weight ?? formulaData.finishedWeight ?? formula.finished_weight ?? 0,
          formulaData.ratio_factor ?? formulaData.ratioFactor ?? formula.ratio_factor ?? 0.18,
          formulaData.supplement_ratio_factor ?? formulaData.supplementRatioFactor ?? formula.supplement_ratio_factor ?? 1.0,
          snapshot.packagingPrice ?? formulaData.packaging_price ?? formulaData.packagingPrice ?? formula.packaging_price ?? 0,
          snapshot.otherPrice ?? formulaData.other_price ?? formulaData.otherPrice ?? formula.other_price ?? 0,
          snapshot.profitMargin ?? formulaData.profit_margin ?? formulaData.profitMargin ?? formula.profit_margin ?? 20,
          snapshot.description ?? formulaData.description ?? formula.description,
          formulaId,
        ]
      )
    }

    res.json(success(null, '版本已发布，配方数据已同步'))
  } catch (error: any) {
    console.error('发布版本失败:', error)
    res.status(500).json({ success: false, message: '发布版本失败: ' + error.message })
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

    // 配方名称变更
    if (snapshotA.name !== snapshotB.name) {
      differences.push({
        fieldId: 'name',
        fieldLabel: '配方名称',
        fieldType: 'formula',
        changes: { oldValue: snapshotA.name, newValue: snapshotB.name, changeType: 'modify', highlighted: true },
      })
      modifiedCount++
    }

    // 业务员变更
    if (snapshotA.salesmanId !== snapshotB.salesmanId) {
      differences.push({
        fieldId: 'salesmanId',
        fieldLabel: '所属业务员',
        fieldType: 'salesman',
        changes: { oldValue: snapshotA.salesmanName, newValue: snapshotB.salesmanName, changeType: 'modify', highlighted: true },
      })
      modifiedCount++
    }

    // 成品重量变更
    if (snapshotA.finishedWeight !== snapshotB.finishedWeight) {
      differences.push({
        fieldId: 'finishedWeight',
        fieldLabel: '成品重量(g)',
        fieldType: 'param',
        changes: { oldValue: snapshotA.finishedWeight, newValue: snapshotB.finishedWeight, changeType: 'modify' },
      })
      modifiedCount++
    }

    // 主料含量比系数变更
    if (snapshotA.ratioFactor !== snapshotB.ratioFactor) {
      differences.push({
        fieldId: 'ratioFactor',
        fieldLabel: '主料含量比系数',
        fieldType: 'param',
        changes: { oldValue: snapshotA.ratioFactor, newValue: snapshotB.ratioFactor, changeType: 'modify' },
      })
      modifiedCount++
    }

    // 辅料含量比系数变更
    if (snapshotA.supplementRatioFactor !== snapshotB.supplementRatioFactor) {
      differences.push({
        fieldId: 'supplementRatioFactor',
        fieldLabel: '辅料含量比系数',
        fieldType: 'param',
        changes: { oldValue: snapshotA.supplementRatioFactor, newValue: snapshotB.supplementRatioFactor, changeType: 'modify' },
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
        paramChanges: differences.filter((d: any) => d.fieldType === 'param').length,
        descriptionChanges: differences.filter((d: any) => d.fieldType === 'description').length,
        nutritionChanges: 0,
      },
    }

    res.json(success(diffResult))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '版本对比失败', error: error.message })
  }
}
