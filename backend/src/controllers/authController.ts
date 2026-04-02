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
      'SELECT id, username, role, display_name, avatar, bio, email, phone, created_at FROM users WHERE id = ?',
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

/** 更新个人资料 */
export async function updateProfile(req: any, res: Response) {
  try {
    const userId = req.user.userId
    const { display_name, avatar, bio, email, phone } = req.body

    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: '邮箱格式不正确' })
      return
    }

    // 验证手机号格式
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      res.status(400).json({ success: false, message: '手机号格式不正确' })
      return
    }

    // 检查邮箱唯一性（排除自己）
    if (email) {
      const [[existingEmail]]: any[][] = await query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      )
      if (existingEmail) {
        res.status(409).json({ success: false, message: '该邮箱已被其他账号绑定' })
        return
      }
    }

    // 检查手机号唯一性（排除自己）
    if (phone) {
      const [[existingPhone]]: any[][] = await query(
        'SELECT id FROM users WHERE phone = ? AND id != ?',
        [phone, userId]
      )
      if (existingPhone) {
        res.status(409).json({ success: false, message: '该手机号已被其他账号绑定' })
        return
      }
    }

    await query(
      `UPDATE users SET display_name = ?, avatar = ?, bio = ?, email = ?, phone = ?, updated_at = ? WHERE id = ?`,
      [
        display_name || null,
        avatar || null,
        bio || null,
        email || null,
        phone || null,
        now(),
        userId
      ]
    )

    // 返回更新后的用户信息
    const [[updatedUser]]: any[][] = await query(
      'SELECT id, username, role, display_name, avatar, bio, email, phone, created_at FROM users WHERE id = ?',
      [userId]
    )
    res.json(success(updatedUser, '资料更新成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '更新资料失败', error: error.message })
  }
}

/** 修改密码 */
export async function changePassword(req: any, res: Response) {
  try {
    const userId = req.user.userId
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, message: '请输入当前密码和新密码' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: '新密码长度至少6个字符' })
      return
    }

    // 获取当前用户密码
    const [[user]]: any[][] = await query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    )
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' })
      return
    }

    // 验证旧密码
    const validPassword = await bcrypt.compare(oldPassword, user.password)
    if (!validPassword) {
      res.status(400).json({ success: false, message: '当前密码不正确' })
      return
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await query(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
      [hashedPassword, now(), userId]
    )

    res.json(success(null, '密码修改成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '密码修改失败', error: error.message })
  }
}
