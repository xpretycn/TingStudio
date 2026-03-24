// 配方路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getFormulas, getFormula, createFormula, updateFormula, deleteFormula,
  getFormulasByMaterial,
} from '../controllers/formulaController.js'
import { validateBody } from '../middleware/validate.js'

export const formulaRoutes = Router()

formulaRoutes.use(authMiddleware)

formulaRoutes.get('/', getFormulas)
formulaRoutes.get('/:id', getFormula)
formulaRoutes.post('/',
  validateBody({
    name: { type: 'string', required: true, minLength: 1, message: '请输入配方名称' },
    customerId: { type: 'string', required: true, message: '请选择客户' },
    materials: { type: 'array', required: true, message: '请添加原料' },
  }),
  createFormula
)
formulaRoutes.put('/:id', updateFormula)
formulaRoutes.delete('/:id', deleteFormula)
formulaRoutes.get('/by-material/:materialId', getFormulasByMaterial)
