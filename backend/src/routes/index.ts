// 路由汇总
import { Router } from 'express'
import { authRoutes } from './auth.js'
import { materialRoutes } from './materials.js'
import { formulaRoutes } from './formulas.js'
import { salesmanRoutes } from './salesmen.js'
import { versionRoutes } from './versions.js'
import { exportRoutes } from './exports.js'
import { nutritionRoutes } from './nutrition.js'

export function createAppRouter(): Router {
  const router = Router()

  router.use('/auth', authRoutes)
  router.use('/materials', materialRoutes)
  router.use('/formulas', formulaRoutes)
  router.use('/salesmen', salesmanRoutes)
  router.use('/versions', versionRoutes)
  router.use('/exports', exportRoutes)
  router.use('/nutrition', nutritionRoutes)

  return router
}
