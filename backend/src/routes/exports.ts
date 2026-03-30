// 导出管理路由
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getExportTemplates, createExportTemplate, updateExportTemplate, deleteExportTemplate,
  createExportJob, getExportJobs, getExportJob, downloadExportFile, retryExportJob,
  createShare, getShare, getShares, deleteShare,
  createApiInterface, getApiInterfaces,
} from '../controllers/exportController.js'

export const exportRoutes = Router()

// 模板管理（需认证）
exportRoutes.use(authMiddleware)

exportRoutes.get('/templates', getExportTemplates)
exportRoutes.post('/templates', createExportTemplate)
exportRoutes.put('/templates/:templateId', updateExportTemplate)
exportRoutes.delete('/templates/:templateId', deleteExportTemplate)

// 导出任务
exportRoutes.post('/jobs', createExportJob)
exportRoutes.get('/jobs', getExportJobs)
exportRoutes.get('/jobs/:jobId', getExportJob)
exportRoutes.get('/jobs/:jobId/download', downloadExportFile)
exportRoutes.post('/jobs/:jobId/retry', retryExportJob)

// 分享
exportRoutes.get('/shares', getShares)
exportRoutes.post('/share', createShare)
exportRoutes.delete('/share/:shareId', deleteShare)

// API 接口管理
exportRoutes.get('/api-interfaces', getApiInterfaces)
exportRoutes.post('/api-interfaces', createApiInterface)

// 公开分享访问（无需认证）- 放在认证中间件之后但路由在最后
// 由于 exportRoutes.use(authMiddleware) 在上面，需要单独处理公开路由
// 通过在 app.ts 中注册独立路由来实现
