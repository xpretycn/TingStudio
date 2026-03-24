// 客户管理控制器
import { Request, Response } from 'express'
import { query } from '../config/database.js'
import { generateId, now, success, successWithPagination, buildPagination, buildLike, rowToCamelCase, rowsToCamelCase } from '../utils/helpers.js'

/** 获取客户列表 */
export async function getCustomers(req: any, res: Response) {
  try {
    const { keyword, page, pageSize } = req.query
    const { page: p, pageSize: size, offset } = buildPagination(
      Number(page), Number(pageSize)
    )
    const userId = req.user.userId

    let whereSql = 'WHERE created_by = ?'
    const params: any[] = [userId]

    if (keyword) {
      whereSql += ' AND (name LIKE ? OR contact LIKE ? OR phone LIKE ?)'
      const like = buildLike(keyword as string)
      params.push(like, like, like)
    }

    const [list]: any[] = await query(
      `SELECT * FROM customers ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset]
    )

    const [countResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM customers ${whereSql}`,
      params
    )

    res.json(successWithPagination(
      rowsToCamelCase(list),
      countResult[0].total,
      p,
      size
    ))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取客户列表失败', error: error.message })
  }
}

/** 获取单个客户 */
export async function getCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params
    const [[customer]]: any[][] = await query('SELECT * FROM customers WHERE id = ?', [id])

    if (!customer) {
      res.status(404).json({ success: false, message: '客户不存在' })
      return
    }

    res.json(success(rowToCamelCase(customer)))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取客户失败', error: error.message })
  }
}

/** 创建客户 */
export async function createCustomer(req: any, res: Response) {
  try {
    const { name, contact, phone, email, address } = req.body
    const userId = req.user.userId
    const id = generateId()

    await query(
      `INSERT INTO customers (id, name, contact, phone, email, address, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, contact, phone, email, address, userId, now()]
    )

    const [[customer]]: any[][] = await query('SELECT * FROM customers WHERE id = ?', [id])
    res.status(201).json(success(rowToCamelCase(customer), '客户创建成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '创建客户失败', error: error.message })
  }
}

/** 更新客户 */
export async function updateCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, contact, phone, email, address } = req.body

    await query(
      `UPDATE customers SET name=?, contact=?, phone=?, email=?, address=? WHERE id=?`,
      [name, contact, phone, email, address, id]
    )

    const [[customer]]: any[][] = await query('SELECT * FROM customers WHERE id = ?', [id])
    if (!customer) {
      res.status(404).json({ success: false, message: '客户不存在' })
      return
    }

    res.json(success(rowToCamelCase(customer), '客户更新成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '更新客户失败', error: error.message })
  }
}

/** 删除客户 */
export async function deleteCustomer(req: Request, res: Response) {
  try {
    const { id } = req.params

    await query('DELETE FROM customers WHERE id = ?', [id])
    res.json(success(null, '客户删除成功'))
  } catch (error: any) {
    if (error.message?.includes('FOREIGN KEY constraint failed')) {
      res.status(400).json({ success: false, message: '该客户下存在配方，无法删除' })
      return
    }
    res.status(500).json({ success: false, message: '删除客户失败', error: error.message })
  }
}
