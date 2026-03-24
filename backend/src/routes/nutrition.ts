// 营养成分路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getMaterialNutrition, setMaterialNutrition,
  calculateFormulaNutrition,
  getNutritionProfiles, createNutritionProfile,
  checkCompliance,
} from '../controllers/nutritionController.js'
import { validateBody } from '../middleware/validate.js'

export const nutritionRoutes = Router()

nutritionRoutes.use(authMiddleware)

// 原料营养
nutritionRoutes.get('/material/:materialId', getMaterialNutrition)
nutritionRoutes.put('/material/:materialId', setMaterialNutrition)

// 配方营养计算
nutritionRoutes.post('/calculate/:formulaId', calculateFormulaNutrition)

// 营养标准
nutritionRoutes.get('/profiles', getNutritionProfiles)
nutritionRoutes.post('/profiles', createNutritionProfile)

// 合规检查
nutritionRoutes.post('/compliance/:formulaId', checkCompliance)
