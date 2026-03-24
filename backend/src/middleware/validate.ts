// 请求验证中间件
import { Request, Response, NextFunction } from 'express'

interface FieldRule {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  message?: string
}

type ValidationRules = Record<string, FieldRule>

export function validateBody(rules: ValidationRules) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body
    const errors: string[] = []

    for (const [field, rule] of Object.entries(rules)) {
      const value = body[field]

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(rule.message || `${field} 为必填项`)
        continue
      }

      if (value === undefined || value === null) continue

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(rule.message || `${field} 必须为字符串`)
      }
      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(rule.message || `${field} 必须为数字`)
      }
      if (rule.type === 'array' && !Array.isArray(value)) {
        errors.push(rule.message || `${field} 必须为数组`)
      }

      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(rule.message || `${field} 长度不能少于 ${rule.minLength}`)
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(rule.message || `${field} 长度不能超过 ${rule.maxLength}`)
        }
      }

      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(rule.message || `${field} 不能小于 ${rule.min}`)
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(rule.message || `${field} 不能大于 ${rule.max}`)
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, message: '参数验证失败', errors })
      return
    }

    next()
  }
}
