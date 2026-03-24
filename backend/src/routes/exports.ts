// 导出管理路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getExportTemplates, createExportTemplate,
  createExportJob, getExportJobs, getExportJob,
  createShare, getShare,
  createApiInterface, getApiInterfaces,
} from '../controllers/exportController.js'
import { validateBody } from '../middleware/validate.js'

export const exportRoutes = Router()

// 模板管理（需认证）
exportRoutes.use(authMiddleware)

exportRoutes.get('/templates', getExportTemplates)
exportRoutes.post('/templates', createExportTemplate)

// 导出任务
exportRoutes.post('/jobs', createExportJob)
exportRoutes.get('/jobs', getExportJobs)
exportRoutes.get('/jobs/:jobId', getExportJob)

// 分享
exportRoutes.post('/share', createShare)

// API 接口管理
exportRoutes.get('/api-interfaces', getApiInterfaces)
exportRoutes.post('/api-interfaces', createApiInterface)

// 公开分享访问（无需认证）
exportRoutes.get('/share/:shareId', getShare)
