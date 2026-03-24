// 认证路由
import { Router } from 'express'
import { validateBody } from '../middleware/validate.js'
import { register, login, getCurrentUser } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/auth.js'

export const authRoutes = Router()

authRoutes.post('/register',
  validateBody({
    username: { type: 'string', required: true, minLength: 2, maxLength: 50, message: '用户名长度为2-50个字符' },
    password: { type: 'string', required: true, minLength: 6, message: '密码长度至少6个字符' },
  }),
  register
)

authRoutes.post('/login', login)

authRoutes.get('/me', authMiddleware, getCurrentUser)
