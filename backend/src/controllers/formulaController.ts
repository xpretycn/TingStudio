// 配方管理控制器
import { Request, Response } from 'express'
import { query } from '../config/database.js'
import { generateId, now, success, successWithPagination, buildPagination, buildLike, rowToCamelCase, rowsToCamelCase } from '../utils/helpers.js'

/** 获取配方列表 */
export async function getFormulas(req: any, res: Response) {
  try {
    const { keyword, salesmanId, page, pageSize } = req.query
    const { page: p, pageSize: size, offset } = buildPagination(
      Number(page), Number(pageSize)
    )
    const userId = req.user.userId

    // 查询当前用户角色，admin 可查看所有配方
    const [[userRow]]: any[][] = await query(
      'SELECT role FROM users WHERE id = ?', [userId]
    )
    const isAdmin = userRow?.role === 'admin'

    let whereParts: string[] = []
    const params: any[] = []

    if (!isAdmin) {
      whereParts.push('created_by = ?')
      params.push(userId)
    }

    if (keyword) {
      whereParts.push('(name LIKE ? OR salesman_name LIKE ?)')
      const like = buildLike(keyword as string)
      params.push(like, like)
    }
    if (salesmanId) {
      whereParts.push('salesman_id = ?')
      params.push(salesmanId)
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''

    const [list]: any[] = await query(
      `SELECT * FROM formulas ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset]
    )

    const [countResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM formulas ${whereSql}`,
      params
    )

    // 批量查询每个配方的版本信息
    const formulaIds = list.map((f: any) => f.id)
    let versionsMap: Record<string, any[]> = {}
    if (formulaIds.length > 0) {
      const placeholders = formulaIds.map(() => '?').join(',')
      const [versions]: any[] = await query(
        `SELECT * FROM formula_versions WHERE formula_id IN (${placeholders}) ORDER BY created_at DESC`,
        formulaIds
      )
      for (const v of versions) {
        const fid = v.formula_id
        if (!versionsMap[fid]) versionsMap[fid] = []
        versionsMap[fid].push(rowToCamelCase(v))
      }
    }

    const listWithVersions = rowsToCamelCase(list).map((f: any) => ({
      ...f,
      versions: versionsMap[f.id] || []
    }))

    res.json(successWithPagination(listWithVersions, countResult[0].total, p, size))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取配方列表失败', error: error.message })
  }
}

/** 获取单个配方 */
export async function getFormula(req: Request, res: Response) {
  try {
    const { id } = req.params
    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [id])

    if (!formula) {
      res.status(404).json({ success: false, message: '配方不存在' })
      return
    }

    res.json(success(rowToCamelCase(formula)))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取配方失败', error: error.message })
  }
}

/** 创建配方 */
export async function createFormula(req: any, res: Response) {
  try {
    const { name, salesmanId, materials, description, finishedWeight, ratioFactor, supplementRatioFactor } = req.body
    const userId = req.user.userId
    const id = generateId()

    // 获取业务员信息
    const [[salesman]]: any[][] = await query('SELECT name FROM salesmen WHERE id = ?', [salesmanId])
    if (!salesman) {
      res.status(400).json({ success: false, message: '业务员不存在' })
      return
    }

    // 补充原料名称（ratioFactor 从原料表获取，不再从请求中传入）
    const materialItems = materials.map((m: any) => {
      return { materialId: m.materialId, materialName: m.materialName || '', quantity: m.quantity }
    })

    const supRatio = supplementRatioFactor ?? 1.0

    await query(
      `INSERT INTO formulas (id, name, salesman_id, salesman_name, materials_json, finished_weight, ratio_factor, supplement_ratio_factor, description, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, salesmanId, salesman.name, JSON.stringify(materialItems), finishedWeight || 0, ratioFactor ?? 0.18, supRatio, description, userId, now()]
    )

    // 自动创建初始版本
    const versionId = generateId()
    await query(
      `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, snapshot_json, status, is_current, ratio_factor, supplement_ratio_factor, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'published', 1, ?, ?, ?, ?)`,
      [
        versionId, id, 'v1.0', `首次创建，含${materialItems.length}种原料`,
        JSON.stringify({ name, salesmanId, salesmanName: salesman.name, materials: materialItems, finishedWeight, ratioFactor, supplementRatioFactor: supRatio, description, formulaData: { name, salesmanId, materials, finishedWeight, ratioFactor, supplementRatioFactor: supRatio, description } }),
        ratioFactor ?? 0.18, supRatio, userId, now()
      ]
    )

    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [id])
    res.status(201).json(success(rowToCamelCase(formula), '配方创建成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '创建配方失败', error: error.message })
  }
}

/** 更新配方 */
export async function updateFormula(req: any, res: Response) {
  try {
    const { id } = req.params
    const { name, salesmanId, materials, description, finishedWeight, ratioFactor, supplementRatioFactor, versionReason } = req.body
    const userId = req.user.userId

    // 升版时必须填写升版原因
    if (materials && !versionReason?.trim()) {
      res.status(400).json({ success: false, message: '请填写升版原因' })
      return
    }

    // 获取旧配方
    const [[oldFormula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [id])
    if (!oldFormula) {
      res.status(404).json({ success: false, message: '配方不存在' })
      return
    }

    let salesmanName = oldFormula.salesman_name
    if (salesmanId && salesmanId !== oldFormula.salesman_id) {
      const [[salesman]]: any[][] = await query('SELECT name FROM salesmen WHERE id = ?', [salesmanId])
      if (!salesman) {
        res.status(400).json({ success: false, message: '业务员不存在' })
        return
      }
      salesmanName = salesman.name
    }

    const materialItems = materials ? materials.map((m: any) => ({
      materialId: m.materialId, materialName: m.materialName || '', quantity: m.quantity
    })) : oldFormula.materials_json

    await query(
      `UPDATE formulas SET name=?, salesman_id=?, salesman_name=?, materials_json=?, finished_weight=?, ratio_factor=?, supplement_ratio_factor=?, description=? WHERE id=?`,
      [name || oldFormula.name, salesmanId || oldFormula.salesman_id, salesmanName,
       JSON.stringify(materialItems), finishedWeight !== undefined ? finishedWeight : oldFormula.finished_weight,
       ratioFactor !== undefined ? ratioFactor : oldFormula.ratio_factor,
       supplementRatioFactor !== undefined ? supplementRatioFactor : oldFormula.supplement_ratio_factor,
       description !== undefined ? description : oldFormula.description, id]
    )

    // 创建新版本（如果材料有变更）
    if (materials) {
      // 将旧当前版本设为非当前
      await query(
        'UPDATE formula_versions SET is_current = 0 WHERE formula_id = ?',
        [id]
      )

      // 获取最新版本号
      const [versions]: any[] = await query(
        `SELECT version_number FROM formula_versions WHERE formula_id = ? ORDER BY created_at DESC LIMIT 1`,
        [id]
      )

      const lastVersionNum = versions.length > 0 ? versions[0].version_number : 'v0.0'
      const match = lastVersionNum.match(/v(\d+)\.(\d+)/)
      let newVersionNum = 'v1.1'
      if (match) {
        newVersionNum = `v${match[1]}.${parseInt(match[2]) + 1}`
      }

      const versionId = generateId()
      // 计算变更
      const oldMaterials = JSON.parse(oldFormula.materials_json || '[]')
      const changes = buildChanges(oldMaterials, materialItems, oldFormula, { name, salesmanId, salesmanName, finishedWeight, ratioFactor, supplementRatioFactor, description })
      // 空变更存 null，避免前端误显示"查看变更"按钮后展示"暂无变更记录"
      const changesJsonStr = changes.length > 0 ? JSON.stringify(changes) : null

      await query(
        `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, version_reason, changes_json, snapshot_json, status, is_current, ratio_factor, supplement_ratio_factor, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)`,
        [
          versionId, id, newVersionNum, buildVersionName(changes, materialItems.length),
          versionReason?.trim() || null,
          changesJsonStr,
          JSON.stringify({
            name: name || oldFormula.name,
            salesmanId: salesmanId || oldFormula.salesman_id,
            salesmanName,
            materials: materialItems,
            finishedWeight: finishedWeight !== undefined ? finishedWeight : oldFormula.finished_weight,
            ratioFactor: ratioFactor !== undefined ? ratioFactor : oldFormula.ratio_factor,
            supplementRatioFactor: supplementRatioFactor !== undefined ? supplementRatioFactor : oldFormula.supplement_ratio_factor,
            description: description !== undefined ? description : oldFormula.description,
            formulaData: { name, salesmanId, materials, finishedWeight, ratioFactor, supplementRatioFactor, description }
          }),
          ratioFactor !== undefined ? ratioFactor : oldFormula.ratio_factor,
          supplementRatioFactor !== undefined ? supplementRatioFactor : oldFormula.supplement_ratio_factor,
          userId, now()
        ]
      )
    }

    const [[formula]]: any[][] = await query('SELECT * FROM formulas WHERE id = ?', [id])
    res.json(success(rowToCamelCase(formula), '配方更新成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '更新配方失败', error: error.message })
  }
}

/** 删除配方 */
export async function deleteFormula(req: Request, res: Response) {
  try {
    const { id } = req.params
    await query('DELETE FROM formulas WHERE id = ?', [id])
    res.json(success(null, '配方删除成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '删除配方失败', error: error.message })
  }
}

/** 根据原料查找配方 */
export async function getFormulasByMaterial(req: Request, res: Response) {
  try {
    const { materialId } = req.params
    const [formulas]: any[] = await query(
      `SELECT * FROM formulas WHERE materials_json LIKE ? ORDER BY created_at DESC`,
      [`%"materialId":"${materialId}"%`]
    )
    res.json(success(rowsToCamelCase(formulas)))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '查询失败', error: error.message })
  }
}

/** 构建变更记录 */
function buildChanges(oldMaterials: any[], newMaterials: any[], oldFormula: any, newFields: any) {
  const changes: any[] = []

  // 配方名称变更
  if (newFields.name && newFields.name !== oldFormula.name) {
    changes.push({ field: 'name', fieldLabel: '配方名称', oldValue: oldFormula.name, newValue: newFields.name, changeType: 'modify' })
  }

  // 业务员变更
  if (newFields.salesmanId && newFields.salesmanId !== oldFormula.salesman_id) {
    const oldSalesman = oldFormula.salesman_name || oldFormula.salesman_id
    changes.push({ field: 'salesman', fieldLabel: '所属业务员', oldValue: oldSalesman, newValue: newFields.salesmanName || newFields.salesmanId, changeType: 'modify' })
  }

  // 成品重量变更
  if (newFields.finishedWeight !== undefined && newFields.finishedWeight !== oldFormula.finished_weight) {
    changes.push({ field: 'finishedWeight', fieldLabel: '成品重量(g)', oldValue: oldFormula.finished_weight, newValue: newFields.finishedWeight, changeType: 'modify' })
  }

  // 主料含量比系数变更
  if (newFields.ratioFactor !== undefined && newFields.ratioFactor !== oldFormula.ratio_factor) {
    changes.push({ field: 'ratioFactor', fieldLabel: '主料含量比系数', oldValue: oldFormula.ratio_factor, newValue: newFields.ratioFactor, changeType: 'modify' })
  }

  // 辅料含量比系数变更
  if (newFields.supplementRatioFactor !== undefined && newFields.supplementRatioFactor !== oldFormula.supplement_ratio_factor) {
    changes.push({ field: 'supplementRatioFactor', fieldLabel: '辅料含量比系数', oldValue: oldFormula.supplement_ratio_factor, newValue: newFields.supplementRatioFactor, changeType: 'modify' })
  }

  // 描述变更
  if (newFields.description !== undefined && newFields.description !== oldFormula.description) {
    changes.push({ field: 'description', fieldLabel: '配方描述', oldValue: oldFormula.description || '-', newValue: newFields.description || '-', changeType: 'modify' })
  }

  // 找出删除和修改的原料
  for (const old of oldMaterials) {
    const newMat = newMaterials.find((m: any) => m.materialId === old.materialId)
    if (!newMat) {
      changes.push({ field: 'materials', fieldLabel: `原料: ${old.materialName}`, oldValue: old.quantity, newValue: null, changeType: 'delete' })
    } else if (old.quantity !== newMat.quantity) {
      changes.push({ field: 'materials', fieldLabel: `原料数量: ${old.materialName}`, oldValue: old.quantity, newValue: newMat.quantity, changeType: 'modify' })
    }
  }

  // 找出新增的原料
  for (const newMat of newMaterials) {
    const exists = oldMaterials.find((m: any) => m.materialId === newMat.materialId)
    if (!exists) {
      changes.push({ field: 'materials', fieldLabel: `原料: ${newMat.materialName}`, oldValue: null, newValue: newMat.quantity, changeType: 'add' })
    }
  }

  return changes
}

/** 根据变更数组生成有业务语义的版本名称 */
function buildVersionName(changes: any[], materialCount: number): string {
  if (!changes.length) return '配方参数微调'

  const parts: string[] = []

  // 非原料变更
  const nonMaterialChanges = changes.filter(c => c.field !== 'materials')
  const materialChanges = changes.filter(c => c.field === 'materials')

  // 按字段汇总非原料变更
  const nonMaterialLabels: string[] = []
  for (const c of nonMaterialChanges) {
    if (c.field === 'name') nonMaterialLabels.push('配方名')
    else if (c.field === 'salesman') nonMaterialLabels.push('业务员')
    else if (c.field === 'finishedWeight') nonMaterialLabels.push('成品重量')
    else if (c.field === 'ratioFactor') nonMaterialLabels.push('主料系数')
    else if (c.field === 'supplementRatioFactor') nonMaterialLabels.push('辅料系数')
    else if (c.field === 'description') nonMaterialLabels.push('描述')
  }
  if (nonMaterialLabels.length) {
    parts.push('修改' + nonMaterialLabels.join('、'))
  }

  // 原料变更
  const added = materialChanges.filter(c => c.changeType === 'add')
  const deleted = materialChanges.filter(c => c.changeType === 'delete')
  const modified = materialChanges.filter(c => c.changeType === 'modify')

  if (added.length) {
    const names = added.map(c => c.fieldLabel.replace('原料: ', ''))
    parts.push(`新增${names.length > 2 ? names.slice(0, 2).join('、') + '等' + names.length + '种' : names.join('、')}`)
  }
  if (deleted.length) {
    const names = deleted.map(c => c.fieldLabel.replace('原料: ', ''))
    parts.push(`删除${names.length > 2 ? names.slice(0, 2).join('、') + '等' + names.length + '种' : names.join('、')}`)
  }
  if (modified.length) {
    const names = modified.map(c => c.fieldLabel.replace('原料数量: ', ''))
    parts.push(`调整${names.length > 2 ? names.slice(0, 2).join('、') + '等' + names.length + '项' : names.join('、') + '用量'}`)
  }

  const summary = parts.join('，')
  if (summary.length > 40) {
    return summary.slice(0, 37) + '...'
  }
  return summary || '原料调整'
}
