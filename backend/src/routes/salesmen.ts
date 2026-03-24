// 业务员路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getSalesmen, getSalesman, createSalesman, updateSalesman, deleteSalesman,
  linkCustomer, unlinkCustomer, linkFormulist, addCommunicationLog, getCommunicationLogs,
} from '../controllers/salesmanController.js'
import { validateBody } from '../middleware/validate.js'

export const salesmanRoutes = Router()

salesmanRoutes.use(authMiddleware)

salesmanRoutes.get('/', getSalesmen)
salesmanRoutes.get('/:id', getSalesman)
salesmanRoutes.post('/',
  validateBody({
    name: { type: 'string', required: true, minLength: 1, message: '请输入业务员姓名' },
    code: { type: 'string', required: true, minLength: 1, message: '请输入业务员工号' },
  }),
  createSalesman
)
salesmanRoutes.put('/:id', updateSalesman)
salesmanRoutes.delete('/:id', deleteSalesman)

// 客户关联
salesmanRoutes.post('/:salesmanId/customers', linkCustomer)
salesmanRoutes.delete('/customers/:relationId', unlinkCustomer)

// 配方师对接
salesmanRoutes.post('/:salesmanId/formulists', linkFormulist)

// 沟通记录
salesmanRoutes.post('/relations/:relationId/communications', addCommunicationLog)
salesmanRoutes.get('/relations/:relationId/communications', getCommunicationLogs)
