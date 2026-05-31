import { Router, RequestHandler } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getMaterialNutrition, setMaterialNutrition,
  calculateFormulaNutrition,
  getNutritionProfiles, createNutritionProfile, updateNutritionProfile, deleteNutritionProfile,
  checkCompliance,
  getFormulaNutritionTables,
  analyzeFormula, getCoverage,
} from '../controllers/nutritionController.js'
import { validateBody } from '../middleware/validate.js'

const H = (fn: unknown) => fn as RequestHandler;

export const nutritionRoutes = Router()

nutritionRoutes.use(authMiddleware)

nutritionRoutes.get('/material/:materialId', H(getMaterialNutrition))
nutritionRoutes.put('/material/:materialId', validateBody({
  per100g: { required: true, type: 'object', message: 'per100g 为必填对象' },
  confidence: { type: 'string', message: 'confidence 必须为字符串' },
}), H(setMaterialNutrition))

nutritionRoutes.post('/calculate/:formulaId', H(calculateFormulaNutrition))
nutritionRoutes.get('/tables/:formulaId', H(getFormulaNutritionTables))

nutritionRoutes.get('/profiles', H(getNutritionProfiles))
nutritionRoutes.post('/profiles', validateBody({
  name: { required: true, type: 'string', minLength: 1, maxLength: 100, message: '名称为必填项(1-100字)' },
  targetValues: { required: true, type: 'object', message: 'targetValues 为必填对象' },
}), H(createNutritionProfile))
nutritionRoutes.put('/profiles/:profileId', validateBody({
  name: { type: 'string', minLength: 1, maxLength: 100, message: '名称长度1-100字' },
  targetValues: { type: 'object', message: 'targetValues 必须为对象' },
}), H(updateNutritionProfile))
nutritionRoutes.delete('/profiles/:profileId', H(deleteNutritionProfile))

nutritionRoutes.post('/compliance/:formulaId', H(checkCompliance))

nutritionRoutes.post('/analyze/:formulaId', H(analyzeFormula))
nutritionRoutes.get('/coverage/:formulaId', H(getCoverage))
