/**
 * Excel导入路由
 */
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { downloadFormulaTemplate, parseFormulaExcel } from '../controllers/excelImportController.js'
import multer from 'multer'

export const excelImportRoutes = Router()

excelImportRoutes.use(authMiddleware)

// 配置multer用于文件上传（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 最大5MB
  },
  fileFilter: (_req, file, cb) => {
    // 只接受Excel文件
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
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

// 下载配方导入模板
excelImportRoutes.get('/formula/template', downloadFormulaTemplate)

// 解析配方Excel文件
excelImportRoutes.post('/formula/parse', upload.single('file'), parseFormulaExcel)

export default excelImportRoutes
