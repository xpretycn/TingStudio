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

    let whereSql = isAdmin ? '' : 'WHERE created_by = ?'
    const params: any[] = isAdmin ? [] : [userId]

    if (keyword) {
      whereSql += ' AND (name LIKE ? OR salesman_name LIKE ?)'
      const like = buildLike(keyword as string)
      params.push(like, like)
    }
    if (salesmanId) {
      whereSql += ' AND salesman_id = ?'
      params.push(salesmanId)
    }

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
        versionId, id, 'v1.0', '初始版本',
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
    const { name, salesmanId, materials, description, finishedWeight, ratioFactor, supplementRatioFactor } = req.body
    const userId = req.user.userId

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
      const changes = buildChanges(oldMaterials, materialItems)

      await query(
        `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, changes_json, snapshot_json, status, is_current, ratio_factor, supplement_ratio_factor, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)`,
        [
          versionId, id, newVersionNum, `自动版本 ${newVersionNum}`,
          JSON.stringify(changes),
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
function buildChanges(oldMaterials: any[], newMaterials: any[]) {
  const changes: any[] = []

  // 找出删除和修改的原料
  for (const old of oldMaterials) {
    const newMat = newMaterials.find((m: any) => m.materialId === old.materialId)
    if (!newMat) {
      changes.push({
        field: 'materials',
        fieldLabel: `原料: ${old.materialName}`,
        oldValue: old.quantity,
        newValue: null,
        changeType: 'delete',
      })
    } else if (old.quantity !== newMat.quantity) {
      changes.push({
        field: 'materials',
        fieldLabel: `原料数量: ${old.materialName}`,
        oldValue: old.quantity,
        newValue: newMat.quantity,
        changeType: 'modify',
      })
    }
  }

  // 找出新增的原料
  for (const newMat of newMaterials) {
    const exists = oldMaterials.find((m: any) => m.materialId === newMat.materialId)
    if (!exists) {
      changes.push({
        field: 'materials',
        fieldLabel: `原料: ${newMat.materialName}`,
        oldValue: null,
        newValue: newMat.quantity,
        changeType: 'add',
      })
    }
  }

  return changes
}
