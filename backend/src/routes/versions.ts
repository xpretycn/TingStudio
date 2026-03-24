// 版本控制路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getVersions, getVersion, createVersion, publishVersion, compareVersions,
} from '../controllers/versionController.js'

export const versionRoutes = Router()

versionRoutes.use(authMiddleware)

versionRoutes.get('/formula/:formulaId', getVersions)
versionRoutes.get('/detail/:versionId', getVersion)
versionRoutes.post('/formula/:formulaId', createVersion)
versionRoutes.put('/publish/:versionId', publishVersion)
versionRoutes.get('/compare/:formulaId', compareVersions)
