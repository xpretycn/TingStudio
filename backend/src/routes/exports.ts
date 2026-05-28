import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import {
  getExportTemplates, createExportTemplate, updateExportTemplate, deleteExportTemplate,
  createExportJob, getExportJobs, getExportJob, downloadExportFile, retryExportJob, reExportJob,
  createShare, getShare, getShares, deleteShare,
  getExportStatistics, getExportConfig, updateExportConfig,
  getExportMaterials, getExportReports, getPublicShare,
} from '../controllers/exportController.js'

export const exportRoutes = Router()

exportRoutes.get('/public/share/:shareId', getPublicShare)

exportRoutes.use(authMiddleware)

exportRoutes.get('/statistics', getExportStatistics)

exportRoutes.get('/config', getExportConfig)
exportRoutes.put('/config', validateBody({
  configs: { type: 'array', required: true },
}), updateExportConfig)

exportRoutes.get('/materials', getExportMaterials)

exportRoutes.get('/reports', getExportReports)

exportRoutes.get('/templates', getExportTemplates)
exportRoutes.post('/templates', validateBody({
  name: { type: 'string', required: true },
  type: { type: 'string', required: true },
  category: { type: 'string', required: false },
  formatConfig: { type: 'object', required: true },
}), createExportTemplate)
exportRoutes.put('/templates/:templateId', updateExportTemplate)
exportRoutes.delete('/templates/:templateId', deleteExportTemplate)

exportRoutes.post('/jobs', validateBody({
  dataCategory: { type: 'string', required: true },
  exportType: { type: 'string', required: true },
}), createExportJob)
exportRoutes.get('/jobs', getExportJobs)
exportRoutes.get('/jobs/:jobId', getExportJob)
exportRoutes.get('/jobs/:jobId/download', downloadExportFile)
exportRoutes.post('/jobs/:jobId/retry', retryExportJob)
exportRoutes.post('/jobs/:jobId/re-export', reExportJob)

exportRoutes.get('/shares', getShares)
exportRoutes.post('/share', createShare)
exportRoutes.delete('/share/:shareId', deleteShare)
