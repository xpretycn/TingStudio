// 认证路由
import { Router } from 'express'
import { validateBody } from '../middleware/validate.js'
import { register, login, getCurrentUser, updateProfile, changePassword, getPreferences, updatePreferences } from '../controllers/authController.js'
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

authRoutes.put('/profile',
  authMiddleware,
  validateBody({
    email: { type: 'string', required: false, message: '邮箱格式不正确' },
    phone: { type: 'string', required: false, minLength: 11, maxLength: 11, message: '手机号长度为11位' },
    display_name: { type: 'string', required: false, maxLength: 50, message: '昵称不超过50个字符' },
    bio: { type: 'string', required: false, maxLength: 500, message: '简介不超过500个字符' },
  }),
  updateProfile
)

authRoutes.put('/password',
  authMiddleware,
  validateBody({
    oldPassword: { type: 'string', required: true, message: '请输入当前密码' },
    newPassword: { type: 'string', required: true, minLength: 6, message: '新密码长度至少6个字符' },
  }),
  changePassword
)

authRoutes.get('/preferences', authMiddleware, getPreferences)

authRoutes.put('/preferences',
  authMiddleware,
  validateBody({
    preferences: { type: 'object', required: true, message: '偏好数据格式不正确' },
  }),
  updatePreferences
)
