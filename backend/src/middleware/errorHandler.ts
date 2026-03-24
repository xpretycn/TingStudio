// 全局错误处理中间件
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('未处理的错误:', err.message)

  // SQLite UNIQUE 约束错误
  if (err.message?.includes('UNIQUE constraint failed')) {
    res.status(409).json({ success: false, message: '数据已存在' })
    return
  }

  // SQLite 外键约束错误
  if (err.message?.includes('FOREIGN KEY constraint failed')) {
    res.status(400).json({ success: false, message: '关联数据不存在' })
    return
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: '认证令牌无效' })
    return
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: '认证令牌已过期' })
    return
  }

  // 文件大小超限
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ success: false, message: '文件大小超出限制' })
    return
  }

  // 默认 500
  const statusCode = (err as any).statusCode || 500
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : '服务器内部错误',
  })
}
