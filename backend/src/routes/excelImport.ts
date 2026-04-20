/**
 * Excel导入路由
 */
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { downloadFormulaTemplate, parseFormulaExcel } from '../controllers/excelImportController.js'
import multer from 'multer'

export const excelImportRoutes = Router()

excelImportRoutes.use(authMiddleware)

function getUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ]
      if (allowedMimes.includes(file.mimetype) || 
          file.originalname.endsWith('.xlsx') || 
          file.originalname.endsWith('.xls')) {
        cb(null, true)
      } else {
        cb(new Error('只支持Excel文件(.xlsx, .xls)'))
      }
    }
  })
}

excelImportRoutes.get('/formula/template', downloadFormulaTemplate)
excelImportRoutes.post('/formula/parse', (req, res, next) => getUpload().single('file')(req, res, next), parseFormulaExcel)

export default excelImportRoutes
