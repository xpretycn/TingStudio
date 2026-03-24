// 导出管理控制器
import { Request, Response } from 'express'
import { query } from '../config/database.js'
import { generateId, now, success, successWithPagination, buildPagination, rowToCamelCase, rowsToCamelCase, safeJsonParse } from '../utils/helpers.js'

/** 获取导出模板列表 */
export async function getExportTemplates(req: Request, res: Response) {
  try {
    const { type } = req.query
    let sql = 'SELECT * FROM export_templates'
    const params: any[] = []

    if (type) {
      sql += ' WHERE type = ?'
      params.push(type)
    }

    sql += ' ORDER BY is_default DESC, created_at DESC'
    const [templates]: any[] = await query(sql, params)

    const result = templates.map((t: any) => ({
      ...rowToCamelCase(t),
      formatConfig: safeJsonParse(t.format_config_json, {}),
    }))

    res.json(success(result))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取导出模板失败', error: error.message })
  }
}

/** 创建导出模板 */
export async function createExportTemplate(req: any, res: Response) {
  try {
    const { name, description, type, formatConfig, isDefault } = req.body
    const userId = req.user.userId
    const id = generateId()

    if (isDefault) {
      await query('UPDATE export_templates SET is_default = 0 WHERE type = ?', [type])
    }

    await query(
      `INSERT INTO export_templates (template_id, name, description, type, format_config_json, is_default, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, type, JSON.stringify(formatConfig), isDefault ? 1 : 0, userId, now()]
    )

    res.status(201).json(success({ templateId: id }, '模板创建成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '创建模板失败', error: error.message })
  }
}

/** 创建导出任务 */
export async function createExportJob(req: any, res: Response) {
  try {
    const { formulaId, versionId, templateId, exportType } = req.body
    const userId = req.user.userId
    const id = generateId()

    await query(
      `INSERT INTO export_jobs (job_id, formula_id, version_id, template_id, export_type, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, formulaId, versionId, templateId, exportType, userId, now()]
    )

    res.status(201).json(success({ jobId: id, status: 'pending' }, '导出任务已创建'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '创建导出任务失败', error: error.message })
  }
}

/** 获取导出任务列表 */
export async function getExportJobs(req: any, res: Response) {
  try {
    const { status, page, pageSize } = req.query
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize))
    const userId = req.user.userId

    let whereSql = 'WHERE created_by = ?'
    const params: any[] = [userId]

    if (status) {
      whereSql += ' AND status = ?'
      params.push(status)
    }

    const [list]: any[] = await query(
      `SELECT * FROM export_jobs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset]
    )
    const [countResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM export_jobs ${whereSql}`,
      params
    )

    res.json(successWithPagination(rowsToCamelCase(list), countResult[0].total, p, size))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取导出任务失败', error: error.message })
  }
}

/** 获取导出任务状态 */
export async function getExportJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params
    const [[job]]: any[][] = await query('SELECT * FROM export_jobs WHERE job_id = ?', [jobId])
    if (!job) {
      res.status(404).json({ success: false, message: '导出任务不存在' })
      return
    }
    res.json(success(rowToCamelCase(job)))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取任务状态失败', error: error.message })
  }
}

/** 创建分享链接 */
export async function createShare(req: any, res: Response) {
  try {
    const { formulaId, versionId, shareType, password, expireDate, allowedEmails, downloadLimit } = req.body
    const userId = req.user.userId
    const id = generateId()
    const shareUrl = `/share/${id}`

    await query(
      `INSERT INTO share_configs (share_id, formula_id, version_id, share_type, share_url, password, expire_date, allowed_emails_json, download_limit, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, formulaId, versionId, shareType || 'link', shareUrl, password,
       expireDate, JSON.stringify(allowedEmails || []), downloadLimit, userId, now()]
    )

    res.status(201).json(success({ shareId: id, shareUrl }, '分享链接创建成功'))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '创建分享失败', error: error.message })
  }
}

/** 获取分享配置 */
export async function getShare(req: Request, res: Response) {
  try {
    const { shareId } = req.params
    const [[share]]: any[][] = await query(
      'SELECT * FROM share_configs WHERE share_id = ?',
      [shareId]
    )
    if (!share) {
      res.status(404).json({ success: false, message: '分享不存在' })
      return
    }

    // 检查过期
    if (share.expire_date && new Date(share.expire_date) < new Date()) {
      res.status(410).json({ success: false, message: '分享链接已过期' })
      return
    }

    // 检查下载次数
    if (share.download_limit && share.download_count >= share.download_limit) {
      res.status(410).json({ success: false, message: '下载次数已达上限' })
      return
    }

    // 更新下载计数
    await query(
      'UPDATE share_configs SET download_count = download_count + 1 WHERE share_id = ?',
      [shareId]
    )

    // 获取配方数据
    const [[formula]]: any[][] = await query(
      'SELECT * FROM formulas WHERE id = ?',
      [share.formula_id]
    )

    res.json(success({
      ...rowToCamelCase(share),
      allowedEmails: safeJsonParse(share.allowed_emails_json, []),
      formula: formula ? rowToCamelCase(formula) : null,
    }))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取分享失败', error: error.message })
  }
}

/** API数据接口管理 */
export async function createApiInterface(req: any, res: Response) {
  try {
    const { name, description, endpoint, method, authentication, authConfig, dataFormat, fieldMapping, rateLimit, retryConfig } = req.body
    const userId = req.user.userId
    const id = generateId()

    await query(
      `INSERT INTO api_data_interfaces (interface_id, name, description, endpoint, method, authentication, auth_config_json, data_format, field_mapping_json, rate_limit_json, retry_config_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, endpoint, method, authentication, JSON.stringify(authConfig || {}),
       dataFormat || 'json', JSON.stringify(fieldMapping || []), JSON.stringify(rateLimit || {}),
       JSON.stringify(retryConfig || {}), userId, now()]
    )

    res.status(201).json(success({ interfaceId: id }, 'API接口创建成功'))
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, message: '接口地址已存在' })
      return
    }
    res.status(500).json({ success: false, message: '创建API接口失败', error: error.message })
  }
}

/** 获取API接口列表 */
export async function getApiInterfaces(req: Request, res: Response) {
  try {
    const [interfaces]: any[] = await query(
      'SELECT * FROM api_data_interfaces ORDER BY created_at DESC'
    )
    const result = interfaces.map((i: any) => ({
      ...rowToCamelCase(i),
      authConfig: safeJsonParse(i.auth_config_json, {}),
      fieldMapping: safeJsonParse(i.field_mapping_json, []),
      rateLimit: safeJsonParse(i.rate_limit_json, {}),
      retryConfig: safeJsonParse(i.retry_config_json, {}),
    }))
    res.json(success(result))
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取API接口列表失败', error: error.message })
  }
}
