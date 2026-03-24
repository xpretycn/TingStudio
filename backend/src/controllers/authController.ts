// 认证控制器
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../config/database.js'
import { generateId, now, success } from '../utils/helpers.js'
import { generateToken } from '../middleware/auth.js'

/** 用户注册 */
export async function register(req: Request, res: Response) {
  try {
    const { username, password } = req.body

    // 检查用户名是否已存在
    const [[existing]]: any[][] = await query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )
    if (existing) {
      res.status(409).json({ success: false, message: '用户名已存在' })
      return
    }

    const userId = generateId()
    const hashedPassword = await bcrypt.hash(password, 10)

    await query(
      'INSERT INTO users (id, username, password, role, created_at) VALUES (?, ?, ?, "formulist", ?)',
      [userId, username, hashedPassword, now()]
    )

    const token = generateToken({ userId, username })
    res.status(201).json(success({
      user: { id: userId, username, role: 'formulist' },
      token,
    }, '注册成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '注册失败', error: error.message })
  }
}

/** 用户登录 */
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body

    const [[user]]: any[][] = await query(
      'SELECT id, username, password, role FROM users WHERE username = ?',
      [username]
    )
    if (!user) {
      res.status(401).json({ success: false, message: '用户名或密码错误' })
      return
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      res.status(401).json({ success: false, message: '用户名或密码错误' })
      return
    }

    const token = generateToken({ userId: user.id, username: user.username })
    const { password: _, ...userWithoutPassword } = user

    res.json(success({
      user: userWithoutPassword,
      token,
    }, '登录成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '登录失败', error: error.message })
  }
}

/** 获取当前用户信息 */
export async function getCurrentUser(req: any, res: Response) {
  try {
    const [[user]]: any[][] = await query(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [req.user.userId]
    )
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' })
      return
    }
    res.json(success(user))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取用户信息失败', error: error.message })
  }
}
