// JWT 认证中间件
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    username: string
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '未提供认证令牌' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string
      username: string
    }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, message: '令牌无效或已过期' })
  }
}

export function generateToken(payload: { userId: string; username: string }): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
}
