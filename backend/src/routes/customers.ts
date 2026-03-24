// 客户路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController.js'
import { validateBody } from '../middleware/validate.js'

export const customerRoutes = Router()

customerRoutes.use(authMiddleware)

customerRoutes.get('/', getCustomers)
customerRoutes.get('/:id', getCustomer)
customerRoutes.post('/',
  validateBody({
    name: { type: 'string', required: true, minLength: 1, maxLength: 100, message: '请输入客户名称' },
  }),
  createCustomer
)
customerRoutes.put('/:id', updateCustomer)
customerRoutes.delete('/:id', deleteCustomer)
