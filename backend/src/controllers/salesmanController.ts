// 业务员管理控制器
import { Request, Response } from 'express'
import { query } from '../config/database.js'
import { generateId, now, success, successWithPagination, buildPagination, buildLike, rowToCamelCase, rowsToCamelCase } from '../utils/helpers.js'

/** 获取业务员列表 */
export async function getSalesmen(req: any, res: Response) {
  try {
    const { keyword, status, department, page, pageSize } = req.query
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize))

    let whereSql = 'WHERE 1=1'
    const params: any[] = []

    if (keyword) {
      whereSql += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ?)'
      const like = buildLike(keyword as string)
      params.push(like, like, like)
    }
    if (status) {
      whereSql += ' AND status = ?'
      params.push(status)
    }
    if (department) {
      whereSql += ' AND department = ?'
      params.push(department)
    }

    const [list]: any[] = await query(
      `SELECT * FROM salesmen ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset]
    )

    const [countResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM salesmen ${whereSql}`,
      params
    )

    res.json(successWithPagination(rowsToCamelCase(list), countResult[0].total, p, size))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取业务员列表失败', error: error.message })
  }
}

/** 获取业务员详情 */
export async function getSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params
    const [[salesman]]: any[][] = await query('SELECT * FROM salesmen WHERE id = ?', [id])
    if (!salesman) {
      res.status(404).json({ success: false, message: '业务员不存在' })
      return
    }

    // 获取关联客户
    const [customers]: any[] = await query(
      `SELECT r.*, c.name as customer_name, c.phone as customer_phone
       FROM salesman_customer_relations r
       JOIN customers c ON r.customer_id = c.id
       WHERE r.salesman_id = ? AND r.end_date IS NULL`,
      [id]
    )

    // 获取对接配方师
    const [formulists]: any[] = await query(
      `SELECT r.*, u.username as formulist_name
       FROM salesman_formulist_relations r
       JOIN users u ON r.formulist_id = u.id
       WHERE r.salesman_id = ?`,
      [id]
    )

    res.json(success({
      ...rowToCamelCase(salesman),
      linkedCustomers: rowsToCamelCase(customers),
      linkedFormulists: rowsToCamelCase(formulists),
    }))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取业务员详情失败', error: error.message })
  }
}

/** 创建业务员 */
export async function createSalesman(req: any, res: Response) {
  try {
    const { name, code, department, phone, email } = req.body
    const userId = req.user.userId
    const id = generateId()

    await query(
      `INSERT INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, name, code, department, phone, email, userId, now()]
    )

    const [[salesman]]: any[][] = await query('SELECT * FROM salesmen WHERE id = ?', [id])
    res.status(201).json(success(rowToCamelCase(salesman), '业务员创建成功'))
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, message: '业务员工号已存在' })
      return
    }
    res.status(500).json({ success: false, message: '创建业务员失败', error: error.message })
  }
}

/** 更新业务员 */
export async function updateSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, department, phone, email, status } = req.body

    await query(
      'UPDATE salesmen SET name=?, department=?, phone=?, email=?, status=? WHERE id=?',
      [name, department, phone, email, status, id]
    )

    const [[salesman]]: any[][] = await query('SELECT * FROM salesmen WHERE id = ?', [id])
    if (!salesman) {
      res.status(404).json({ success: false, message: '业务员不存在' })
      return
    }
    res.json(success(rowToCamelCase(salesman), '业务员更新成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '更新业务员失败', error: error.message })
  }
}

/** 删除业务员（软删除） */
export async function deleteSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params
    await query('UPDATE salesmen SET status = "inactive" WHERE id = ?', [id])
    res.json(success(null, '业务员已停用'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '停用业务员失败', error: error.message })
  }
}

/** 关联客户 */
export async function linkCustomer(req: any, res: Response) {
  try {
    const { salesmanId } = req.params
    const { customerId, relationType, startDate, notes } = req.body
    const id = generateId()

    await query(
      `INSERT INTO salesman_customer_relations (id, salesman_id, customer_id, relation_type, start_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, salesmanId, customerId, relationType || 'primary', startDate || now(), notes, now()]
    )

    res.status(201).json(success({ id }, '客户关联成功'))
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, message: '该客户已关联此业务员' })
      return
    }
    res.status(500).json({ success: false, message: '关联客户失败', error: error.message })
  }
}

/** 解除客户关联 */
export async function unlinkCustomer(req: Request, res: Response) {
  try {
    const { relationId } = req.params
    await query('UPDATE salesman_customer_relations SET end_date = ? WHERE id = ?', [new Date().toISOString().slice(0, 10), relationId])
    res.json(success(null, '客户关联已解除'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '解除关联失败', error: error.message })
  }
}

/** 对接配方师 */
export async function linkFormulist(req: any, res: Response) {
  try {
    const { salesmanId } = req.params
    const { formulistId, cooperationMode, priority, notes } = req.body
    const id = generateId()

    await query(
      `INSERT INTO salesman_formulist_relations (id, salesman_id, formulist_id, cooperation_mode, priority, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, salesmanId, formulistId, cooperationMode || 'direct', priority || 3, notes, now()]
    )

    res.status(201).json(success({ id }, '配方师对接成功'))
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, message: '该配方师已与此业务员对接' })
      return
    }
    res.status(500).json({ success: false, message: '对接配方师失败', error: error.message })
  }
}

/** 添加沟通记录 */
export async function addCommunicationLog(req: any, res: Response) {
  try {
    const { relationId } = req.params
    const { type, content, attachmentUrls } = req.body
    const userId = req.user.userId
    const id = generateId()

    await query(
      `INSERT INTO communication_logs (id, relation_id, type, content, attachment_urls, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, relationId, type, content, JSON.stringify(attachmentUrls || []), userId, now()]
    )

    res.status(201).json(success({ id }, '沟通记录添加成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '添加沟通记录失败', error: error.message })
  }
}

/** 获取沟通记录 */
export async function getCommunicationLogs(req: Request, res: Response) {
  try {
    const { relationId } = req.params
    const [logs]: any[] = await query(
      'SELECT * FROM communication_logs WHERE relation_id = ? ORDER BY created_at DESC',
      [relationId]
    )
    res.json(success(rowsToCamelCase(logs)))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取沟通记录失败', error: error.message })
  }
}
