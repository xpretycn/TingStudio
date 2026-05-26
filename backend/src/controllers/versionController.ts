import { Request, Response } from 'express'
import { query } from '../config/database-better-sqlite3.js'
import { generateId, now, success, rowToCamelCase, rowsToCamelCase, safeJsonParse } from '../utils/helpers.js'
import { createReviewLog, getReviewLogs, getPendingReviewList, isFormulaOwner, getMySubmissions, getReviewedByMe, getMySubmissionStatusCounts } from '../services/reviewService.js'

async function syncSnapshotToFormula(version: any, formulaId: string): Promise<void> {
  const snapshot = safeJsonParse(version.snapshot_json, {})
  const formulaData = snapshot.formulaData || snapshot

  const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
  if (!formula) return

  if (snapshot.name || snapshot.materials || formulaData.name) {
    await query(
      `UPDATE formulas SET name=?, salesman_id=?, salesman_name=?, materials_json=?,
              finished_weight=?, ratio_factor=?, supplement_ratio_factor=?,
              packaging_price=?, other_price=?, profit_margin=?, description=? WHERE id=?`,
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
}

export async function getVersions(req: Request, res: Response) {
  try {
    const { formulaId } = req.params
    const { status } = req.query

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
      `SELECT fv.*, COALESCE(u.display_name, u.username) AS created_by_name FROM formula_versions fv LEFT JOIN users u ON fv.created_by = u.id ${whereSql} ORDER BY fv.created_at DESC`,
      params
    )

    const result = versions.map((v: any) => ({
      ...rowToCamelCase(v),
      createdByName: v.created_by_name || null,
      changes: safeJsonParse(v.changes_json, []),
      snapshot: safeJsonParse(v.snapshot_json, {}),
    }))

    res.json(success(result))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取版本列表失败', error: error.message })
  }
}

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

export async function createVersion(req: any, res: Response) {
  try {
    const { formulaId } = req.params
    const { versionName, versionReason, status } = req.body
    const userId = req.user.userId

    if (!versionReason?.trim()) {
      res.status(400).json({ success: false, message: '请填写升版原因' })
      return
    }

    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
    if (!formula) {
      res.status(404).json({ success: false, message: '配方不存在' })
      return
    }

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
          finishedWeight: formula.finished_weight ?? 0,
          ratioFactor: formula.ratio_factor ?? 0.18,
          supplementRatioFactor: formula.supplement_ratio_factor ?? 1.0,
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

export async function publishVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params
    const userId = req.user.userId

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { message: '仅管理员可直接发布版本，普通用户请提交审批', code: 'FORBIDDEN' } })
      return
    }

    const [[version]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, error: { message: '版本不存在', code: 'NOT_FOUND' } })
      return
    }

    if (version.status !== 'draft' && version.status !== 'pending_review') {
      res.status(400).json({ success: false, error: { message: '仅草稿或待审批版本可发布', code: 'VALIDATION_ERROR' } })
      return
    }

    const formulaId = version.formula_id

    const [[formula]]: any[][] = await query(
      'SELECT id FROM formulas WHERE id = ?',
      [formulaId]
    )
    if (!formula) {
      res.status(404).json({ success: false, error: { message: '关联的配方不存在，无法发布', code: 'NOT_FOUND' } })
      return
    }

    await query(
      `UPDATE formula_versions SET is_current = 0, status = 'archived'
       WHERE formula_id = ? AND version_id <> ? AND status IN ('draft', 'pending_review', 'published')`,
      [formulaId, versionId]
    )

    await query(
      `UPDATE formula_versions SET status = 'published', is_current = 1 WHERE version_id = ?`,
      [versionId]
    )

    await syncSnapshotToFormula(version, formulaId)

    const [[user]]: any[][] = await query('SELECT display_name FROM users WHERE id = ?', [userId])
    await createReviewLog({
      versionId,
      reviewerId: userId,
      reviewerName: user?.display_name || null,
      action: 'approve',
      comment: '管理员直接发布',
    })

    res.json(success(null, '版本已发布，配方数据已同步'))
  } catch (error: any) {
    console.error('[Version] publishVersion Error:', error)
    res.status(500).json({ success: false, error: { message: '发布版本失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function submitVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params
    const userId = req.user.userId
    const { comment } = req.body || {}

    const [[version]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, error: { message: '版本不存在', code: 'NOT_FOUND' } })
      return
    }

    if (version.status !== 'draft') {
      res.status(400).json({ success: false, error: { message: '仅草稿版本可提交审批', code: 'VALIDATION_ERROR' } })
      return
    }

    if (req.user.role !== 'admin' && version.created_by !== userId) {
      res.status(403).json({ success: false, error: { message: '无权提交他人版本', code: 'FORBIDDEN' } })
      return
    }

    const [[user]]: any[][] = await query('SELECT display_name FROM users WHERE id = ?', [userId])

    await query(
      "UPDATE formula_versions SET status = 'pending_review' WHERE version_id = ?",
      [versionId]
    )

    await createReviewLog({
      versionId,
      reviewerId: userId,
      reviewerName: user?.display_name || null,
      action: 'submit',
      comment: comment || null,
    })

    res.json(success({
      versionId,
      status: 'pending_review',
      formulaId: version.formula_id,
      versionNumber: version.version_number,
    }, '版本已提交审批'))
  } catch (error: any) {
    console.error('[Version] submitVersion Error:', error)
    res.status(500).json({ success: false, error: { message: '提交审批失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function approveVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params
    const userId = req.user.userId
    const { comment } = req.body || {}

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { message: '仅管理员可批准版本', code: 'FORBIDDEN' } })
      return
    }

    const [[version]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, error: { message: '版本不存在', code: 'NOT_FOUND' } })
      return
    }

    if (version.status !== 'pending_review') {
      res.status(400).json({ success: false, error: { message: '仅待审批版本可批准', code: 'VALIDATION_ERROR' } })
      return
    }

    const formulaId = version.formula_id

    await query(
      `UPDATE formula_versions SET is_current = 0, status = 'archived'
       WHERE formula_id = ? AND version_id <> ? AND status IN ('draft', 'pending_review', 'published')`,
      [formulaId, versionId]
    )

    await query(
      "UPDATE formula_versions SET status = 'published', is_current = 1 WHERE version_id = ?",
      [versionId]
    )

    await syncSnapshotToFormula(version, formulaId)

    const [[user]]: any[][] = await query('SELECT display_name FROM users WHERE id = ?', [userId])
    await createReviewLog({
      versionId,
      reviewerId: userId,
      reviewerName: user?.display_name || null,
      action: 'approve',
      comment: comment || null,
    })

    res.json(success({
      versionId,
      status: 'published',
      isCurrent: 1,
      formulaId,
      versionNumber: version.version_number,
    }, '版本已批准并发布'))
  } catch (error: any) {
    console.error('[Version] approveVersion Error:', error)
    res.status(500).json({ success: false, error: { message: '批准版本失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function rejectVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params
    const userId = req.user.userId
    const { comment } = req.body || {}

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { message: '仅管理员可驳回版本', code: 'FORBIDDEN' } })
      return
    }

    if (!comment?.trim()) {
      res.status(400).json({ success: false, error: { message: '驳回时必须填写意见', code: 'VALIDATION_ERROR' } })
      return
    }

    const [[version]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, error: { message: '版本不存在', code: 'NOT_FOUND' } })
      return
    }

    if (version.status !== 'pending_review') {
      res.status(400).json({ success: false, error: { message: '仅待审批版本可驳回', code: 'VALIDATION_ERROR' } })
      return
    }

    await query(
      "UPDATE formula_versions SET status = 'draft' WHERE version_id = ?",
      [versionId]
    )

    const [[user]]: any[][] = await query('SELECT display_name FROM users WHERE id = ?', [userId])
    await createReviewLog({
      versionId,
      reviewerId: userId,
      reviewerName: user?.display_name || null,
      action: 'reject',
      comment: comment.trim(),
    })

    res.json(success({
      versionId,
      status: 'draft',
      comment: comment.trim(),
      formulaId: version.formula_id,
      versionNumber: version.version_number,
    }, '版本已驳回'))
  } catch (error: any) {
    console.error('[Version] rejectVersion Error:', error)
    res.status(500).json({ success: false, error: { message: '驳回版本失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function getPendingReviews(req: any, res: Response) {
  try {
    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: { message: '仅管理员可查看待审核列表', code: 'FORBIDDEN' } })
      return
    }

    const rawPage = Number(req.query.page) || 1
    const rawPageSize = Number(req.query.pageSize) || 20
    const page = rawPage > 0 ? rawPage : 1
    const pageSize = Math.min(rawPageSize > 0 ? rawPageSize : 20, 100)
    const keyword = req.query.keyword as string | undefined

    const result = await getPendingReviewList({ keyword, page, pageSize })

    res.json(success(result))
  } catch (error: any) {
    console.error('[Version] getPendingReviews Error:', error)
    res.status(500).json({ success: false, error: { message: '获取待审核列表失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function getMySubmissionList(req: any, res: Response) {
  try {
    const userId = req.user?.userId || req.user?.id
    const rawPage = Number(req.query.page) || 1
    const rawPageSize = Number(req.query.pageSize) || 20
    const safePage = rawPage > 0 ? rawPage : 1
    const safePageSize = Math.min(rawPageSize > 0 ? rawPageSize : 20, 100)
    const keyword = req.query.keyword as string | undefined
    const status = req.query.status as string | undefined
    const result = await getMySubmissions({ userId, keyword, status, page: safePage, pageSize: safePageSize })
    res.json(success(result))
  } catch (error: any) {
    console.error("[VersionController] getMySubmissionList Error:", error)
    res.status(500).json({ success: false, error: { message: error.message || "获取我的提交列表失败", code: "INTERNAL_ERROR" } })
  }
}

export async function getMySubmissionCounts(req: any, res: Response) {
  try {
    const userId = req.user?.userId || req.user?.id
    const counts = await getMySubmissionStatusCounts(userId)
    res.json(success(counts))
  } catch (error: any) {
    console.error("[VersionController] getMySubmissionCounts Error:", error)
    res.status(500).json({ success: false, error: { message: error.message || "获取提交状态计数失败", code: "INTERNAL_ERROR" } })
  }
}

export async function getReviewedHistory(req: any, res: Response) {
  try {
    const reviewerId = req.user?.userId || req.user?.id
    const rawPage = Number(req.query.page) || 1
    const rawPageSize = Number(req.query.pageSize) || 20
    const safePage = rawPage > 0 ? rawPage : 1
    const safePageSize = Math.min(rawPageSize > 0 ? rawPageSize : 20, 100)
    const keyword = req.query.keyword as string | undefined
    const action = req.query.action as string | undefined
    const result = await getReviewedByMe({ reviewerId, keyword, action, page: safePage, pageSize: safePageSize })
    res.json(success(result))
  } catch (error: any) {
    console.error("[VersionController] getReviewedHistory Error:", error)
    res.status(500).json({ success: false, error: { message: error.message || "获取审核历史失败", code: "INTERNAL_ERROR" } })
  }
}

export async function getVersionReviewLogs(req: any, res: Response) {
  try {
    const { versionId } = req.params

    const [[version]]: any[][] = await query(
      'SELECT formula_id, created_by FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, error: { message: '版本不存在', code: 'NOT_FOUND' } })
      return
    }

    if (req.user.role !== 'admin' && version.created_by !== req.user.userId) {
      const isOwner = await isFormulaOwner(version.formula_id, req.user.userId)
      if (!isOwner) {
        res.status(403).json({ success: false, error: { message: '无权查看此版本的审核日志', code: 'FORBIDDEN' } })
        return
      }
    }

    const logs = await getReviewLogs(versionId)

    res.json(success({
      versionId,
      logs,
    }))
  } catch (error: any) {
    console.error('[Version] getVersionReviewLogs Error:', error)
    res.status(500).json({ success: false, error: { message: '获取审核日志失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function getMaterialUpdates(req: any, res: Response) {
  try {
    const { formulaId } = req.params

    const [[formula]]: any[][] = await query('SELECT id, name, created_by FROM formulas WHERE id = ?', [formulaId])
    if (!formula) {
      res.status(404).json({ success: false, error: { message: '配方不存在', code: 'NOT_FOUND' } })
      return
    }

    if (req.user.role !== 'admin' && formula.created_by !== req.user.userId) {
      res.status(403).json({ success: false, error: { message: '无权查看此配方的原料更新', code: 'FORBIDDEN' } })
      return
    }

    const [[currentVersion]]: any[][] = await query(
      `SELECT * FROM formula_versions WHERE formula_id = ? AND is_current = 1 LIMIT 1`,
      [formulaId]
    )
    if (!currentVersion) {
      res.status(404).json({ success: false, error: { message: '配方无当前版本', code: 'NOT_FOUND' } })
      return
    }

    const snapshot = safeJsonParse(currentVersion.snapshot_json, {})
    const materials = snapshot.materials || snapshot.formulaData?.materials || []

    const updates: any[] = []

    for (const mat of materials) {
      if (!mat.materialId) continue

      const [[materialRow]]: any[][] = await query(
        'SELECT id, name, code, is_latest, unit_price, version FROM materials WHERE id = ?',
        [mat.materialId]
      )

      if (!materialRow) {
        updates.push({
          materialId: mat.materialId,
          materialName: mat.materialName || '未知',
          isLatest: false,
          currentVersion: mat.materialVersion || 1,
          latestVersion: null,
          latestMaterialId: null,
          latestVersionName: null,
          latestUnitPrice: null,
          currentUnitPrice: mat.unitPrice ?? mat.basePriceAtSave ?? null,
          priceChanged: false,
        })
        continue
      }

      if (materialRow.is_latest === 1) {
        const oldPrice = mat.unitPrice ?? mat.basePriceAtSave ?? null
        const newPrice = materialRow.unit_price != null ? Number(materialRow.unit_price) : null
        updates.push({
          materialId: mat.materialId,
          materialName: materialRow.name,
          isLatest: true,
          currentVersion: mat.materialVersion || Number(materialRow.version) || 1,
          latestVersion: Number(materialRow.version) || 1,
          latestMaterialId: mat.materialId,
          latestVersionName: materialRow.name,
          latestUnitPrice: newPrice,
          currentUnitPrice: oldPrice,
          priceChanged: oldPrice !== null && newPrice !== null && oldPrice !== newPrice,
        })
      } else {
        const [[latestRow]]: any[][] = await query(
          'SELECT id, name, unit_price, version FROM materials WHERE code = ? AND is_latest = 1 LIMIT 1',
          [materialRow.code]
        )
        const oldPrice = mat.unitPrice ?? mat.basePriceAtSave ?? null
        const newPrice = latestRow?.unit_price != null ? Number(latestRow.unit_price) : null
        updates.push({
          materialId: mat.materialId,
          materialName: materialRow.name,
          isLatest: false,
          currentVersion: mat.materialVersion || Number(materialRow.version) || 1,
          latestVersion: latestRow ? Number(latestRow.version) : null,
          latestMaterialId: latestRow?.id || null,
          latestVersionName: latestRow?.name || null,
          latestUnitPrice: newPrice,
          currentUnitPrice: oldPrice,
          priceChanged: oldPrice !== null && newPrice !== null && oldPrice !== newPrice,
        })
      }
    }

    const hasUpdates = updates.some((u) => !u.isLatest)
    const hasPriceChanges = updates.some((u) => u.priceChanged)

    res.json(success({
      formulaId,
      formulaName: formula.name,
      versionId: currentVersion.version_id,
      versionNumber: currentVersion.version_number,
      materials: updates,
      hasUpdates,
      hasPriceChanges,
      totalMaterials: updates.length,
      outdatedCount: updates.filter((u) => !u.isLatest).length,
      priceChangedCount: updates.filter((u) => u.priceChanged).length,
    }))
  } catch (error: any) {
    console.error('[Version] getMaterialUpdates Error:', error)
    res.status(500).json({ success: false, error: { message: '检查原料更新失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function refreshSnapshot(req: any, res: Response) {
  try {
    const { formulaId } = req.params
    const userId = req.user.userId
    const { materialIds } = req.body || {}

    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [formulaId])
    if (!formula) {
      res.status(404).json({ success: false, error: { message: '配方不存在', code: 'NOT_FOUND' } })
      return
    }

    if (req.user.role !== 'admin' && formula.created_by !== userId) {
      res.status(403).json({ success: false, error: { message: '无权操作此配方', code: 'FORBIDDEN' } })
      return
    }

    const [[currentVersion]]: any[][] = await query(
      `SELECT * FROM formula_versions WHERE formula_id = ? AND is_current = 1 LIMIT 1`,
      [formulaId]
    )
    if (!currentVersion) {
      res.status(404).json({ success: false, error: { message: '配方无当前版本', code: 'NOT_FOUND' } })
      return
    }

    const snapshot = safeJsonParse(currentVersion.snapshot_json, {})
    const materials = snapshot.materials || []

    const updatedMaterials = []
    const changes: any[] = []

    for (const mat of materials) {
      if (!mat.materialId) {
        updatedMaterials.push(mat)
        continue
      }

      if (materialIds && Array.isArray(materialIds) && materialIds.length > 0 && !materialIds.includes(mat.materialId)) {
        updatedMaterials.push(mat)
        continue
      }

      const [[materialRow]]: any[][] = await query(
        'SELECT id, name, code, is_latest, unit_price, version FROM materials WHERE id = ?',
        [mat.materialId]
      )

      if (!materialRow || materialRow.is_latest === 1) {
        updatedMaterials.push(mat)
        continue
      }

      const [[latestRow]]: any[][] = await query(
        'SELECT id, name, unit_price, version FROM materials WHERE code = ? AND is_latest = 1 LIMIT 1',
        [materialRow.code]
      )

      if (!latestRow) {
        updatedMaterials.push(mat)
        continue
      }

      const oldPrice = mat.unitPrice ?? mat.basePriceAtSave ?? null
      const newPrice = latestRow.unit_price != null ? Number(latestRow.unit_price) : null

      changes.push({
        field: 'material_version_update',
        materialId: mat.materialId,
        materialName: mat.materialName,
        oldVersionId: mat.materialId,
        newVersionId: latestRow.id,
        oldPrice,
        newPrice,
      })

      updatedMaterials.push({
        ...mat,
        materialId: latestRow.id,
        materialName: latestRow.name,
        unitPrice: newPrice,
        basePriceAtSave: newPrice,
        materialVersion: Number(latestRow.version),
      })
    }

    if (changes.length === 0) {
      res.json(success(null, '所有原料已是最新版本，无需刷新'))
      return
    }

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

    const updatedSnapshot = { ...snapshot, materials: updatedMaterials }
    const existingChanges = safeJsonParse(currentVersion.changes_json, [])
    const allChanges = [
      ...existingChanges,
      {
        field: 'material_refresh',
        changeType: 'modify',
        description: `刷新 ${changes.length} 种原料至最新版本`,
        details: changes,
        timestamp: now(),
      },
    ]

    await query(
      "UPDATE formula_versions SET is_current = 0, status = 'archived' WHERE formula_id = ? AND is_current = 1",
      [formulaId]
    )

    const newVersionId = generateId()
    await query(
      `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, version_reason, snapshot_json, changes_json, status, is_current, ratio_factor, supplement_ratio_factor, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)`,
      [
        newVersionId, formulaId, newVersionNum,
        `刷新原料快照 ${newVersionNum}`,
        `刷新 ${changes.length} 种原料至最新版本`,
        JSON.stringify(updatedSnapshot),
        JSON.stringify(allChanges),
        currentVersion.ratio_factor,
        currentVersion.supplement_ratio_factor,
        userId, now(),
      ]
    )

    res.json(success({
      versionId: newVersionId,
      formulaId,
      versionNumber: newVersionNum,
      status: 'draft',
      refreshedCount: changes.length,
      changes,
    }, `已刷新 ${changes.length} 种原料至最新版本`))
  } catch (error: any) {
    console.error('[Version] refreshSnapshot Error:', error)
    res.status(500).json({ success: false, error: { message: '刷新原料数据失败', code: 'INTERNAL_ERROR' } })
  }
}

export async function setCurrentVersion(req: any, res: Response) {
  try {
    const { versionId } = req.params
    const userId = req.user.userId

    const [[version]]: any[][] = await query(
      'SELECT * FROM formula_versions WHERE version_id = ?',
      [versionId]
    )
    if (!version) {
      res.status(404).json({ success: false, error: { message: '版本不存在', code: 'NOT_FOUND' } })
      return
    }

    if (version.status !== 'published') {
      res.status(400).json({
        success: false,
        error: { message: '仅已发布版本可设为当前版本', code: 'VALIDATION_ERROR' },
      })
      return
    }

    if (req.user.role !== 'admin') {
      const isOwner = await isFormulaOwner(version.formula_id, userId)
      if (!isOwner) {
        res.status(403).json({
          success: false,
          error: { message: '无权切换他人配方的当前版本', code: 'FORBIDDEN' },
        })
        return
      }
    }

    const formulaId = version.formula_id

    if (version.is_current === 1) {
      res.json(success(null, '该版本已是当前版本'))
      return
    }

    await query(
      'UPDATE formula_versions SET is_current = 0 WHERE formula_id = ? AND is_current = 1',
      [formulaId]
    )

    await query(
      'UPDATE formula_versions SET is_current = 1 WHERE version_id = ?',
      [versionId]
    )

    await syncSnapshotToFormula(version, formulaId)

    res.json(success({
      versionId,
      formulaId,
      versionNumber: version.version_number,
      isCurrent: 1,
      status: 'published',
    }, '当前版本已切换，配方数据已同步'))
  } catch (error: any) {
    console.error('[Version] setCurrentVersion Error:', error)
    res.status(500).json({ success: false, error: { message: '切换当前版本失败', code: 'INTERNAL_ERROR' } })
  }
}

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

    if (snapshotA.name !== snapshotB.name) {
      differences.push({
        fieldId: 'name', fieldLabel: '配方名称', fieldType: 'formula',
        changes: { oldValue: snapshotA.name, newValue: snapshotB.name, changeType: 'modify', highlighted: true },
      })
      modifiedCount++
    }

    if (snapshotA.salesmanId !== snapshotB.salesmanId) {
      differences.push({
        fieldId: 'salesmanId', fieldLabel: '所属业务员', fieldType: 'salesman',
        changes: { oldValue: snapshotA.salesmanName, newValue: snapshotB.salesmanName, changeType: 'modify', highlighted: true },
      })
      modifiedCount++
    }

    if (snapshotA.finishedWeight !== snapshotB.finishedWeight) {
      differences.push({
        fieldId: 'finishedWeight', fieldLabel: '成品重量(g)', fieldType: 'param',
        changes: { oldValue: snapshotA.finishedWeight, newValue: snapshotB.finishedWeight, changeType: 'modify' },
      })
      modifiedCount++
    }

    if (snapshotA.ratioFactor !== snapshotB.ratioFactor) {
      differences.push({
        fieldId: 'ratioFactor', fieldLabel: '主料含量比系数', fieldType: 'param',
        changes: { oldValue: snapshotA.ratioFactor, newValue: snapshotB.ratioFactor, changeType: 'modify' },
      })
      modifiedCount++
    }

    if (snapshotA.supplementRatioFactor !== snapshotB.supplementRatioFactor) {
      differences.push({
        fieldId: 'supplementRatioFactor', fieldLabel: '辅料含量比系数', fieldType: 'param',
        changes: { oldValue: snapshotA.supplementRatioFactor, newValue: snapshotB.supplementRatioFactor, changeType: 'modify' },
      })
      modifiedCount++
    }

    if (snapshotA.description !== snapshotB.description) {
      differences.push({
        fieldId: 'description', fieldLabel: '配方描述', fieldType: 'description',
        changes: { oldValue: snapshotA.description, newValue: snapshotB.description, changeType: 'modify' },
      })
      modifiedCount++
    }

    for (const matA of materialsA) {
      const matB = materialsB.find((m: any) => m.materialId === matA.materialId)
      if (!matB) {
        differences.push({
          fieldId: `material_${matA.materialId}`, fieldLabel: `原料: ${matA.materialName}`, fieldType: 'material',
          changes: { oldValue: matA.quantity, newValue: null, changeType: 'delete' },
        })
        deletedCount++
      } else if (matA.quantity !== matB.quantity) {
        differences.push({
          fieldId: `material_qty_${matA.materialId}`, fieldLabel: `${matA.materialName} 数量`, fieldType: 'materialQuantity',
          changes: { oldValue: matA.quantity, newValue: matB.quantity, changeType: 'modify', highlighted: true },
        })
        modifiedCount++
      }
    }

    for (const matB of materialsB) {
      const exists = materialsA.find((m: any) => m.materialId === matB.materialId)
      if (!exists) {
        differences.push({
          fieldId: `material_${matB.materialId}`, fieldLabel: `原料: ${matB.materialName}`, fieldType: 'material',
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
