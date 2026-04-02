// AI 助手控制器
import { Request, Response } from 'express'
import { aiService, AIService } from '../services/ai/AIService.js'
import {
  FORMULA_PARSE_SYSTEM_PROMPT,
  FORMULA_PARSE_USER_PROMPT,
  FORMULA_PARSE_IMAGE_PROMPT,
  NL2SQL_SYSTEM_PROMPT,
  NL2SQL_USER_PROMPT,
} from '../services/ai/prompts.js'
import { validateSQL, readFileAsBase64 } from '../utils/sqlValidator.js'
import { query } from '../config/database.js'
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

// ─── AI 解析配方 ───

interface ParsedMaterial {
  name: string
  quantity: number
  unit: string
  ratioFormula?: string
  ratioDivisor?: number
  materialId?: string
  matched?: boolean
}

interface ParsedFormula {
  name: string
  salesmanName?: string
  formulaDate?: string
  materials: ParsedMaterial[]
  finishedWeight?: number
  formulaConsistency?: boolean
  description?: string
}

/** POST /api/ai/parse-formula — 上传文件 + AI 解析为结构化配方 */
export async function parseFormula(req: any, res: Response) {
  try {
    const file = req.file as Express.Multer.File | undefined
    const { model: provider } = req.body

    if (!file) {
      res.status(400).json({ success: false, message: '请上传文件' })
      return
    }

    if (!provider) {
      res.status(400).json({ success: false, message: '请选择 AI 模型' })
      return
    }

    // 上传图片时校验模型是否支持视觉
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (imageExts.includes(ext)) {
      const modelConfig = aiService.getModel(provider)
      if (!modelConfig?.supportsVision || !modelConfig?.visionModel) {
        res.status(400).json({
          success: false,
          message: `模型 "${modelConfig?.name || provider}" 不支持图片解析，请选择支持视觉的模型（通义千问 或 智谱GLM）`,
        })
        return
      }
    }

    const isImage = imageExts.includes(ext)
    const excelExts = ['.xlsx', '.xls']
    const isExcel = excelExts.includes(ext)

    let messages: AIService.ChatMessage[]

    if (isImage) {
      // 图片文件：构建多模态 prompt（附带文件名信息）
      const { base64, mimeType } = readFileAsBase64(file.path)
      const imagePrompt = file.originalname
        ? `${FORMULA_PARSE_IMAGE_PROMPT}\n\n文件名：${file.originalname}\n请从文件名中提取业务员姓名、配方名称、配方日期等元信息。`
        : FORMULA_PARSE_IMAGE_PROMPT
      messages = [
        { role: 'system', content: FORMULA_PARSE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: imagePrompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ]
    } else if (isExcel) {
      // Excel 文件：用 xlsx 库解析为文本
      const textContent = readExcelAsText(file.path)
      if (!textContent.trim()) {
        res.status(400).json({ success: false, message: '文件内容为空' })
        return
      }
      messages = [
        { role: 'system', content: FORMULA_PARSE_SYSTEM_PROMPT },
        { role: 'user', content: FORMULA_PARSE_USER_PROMPT(textContent, file.originalname) },
      ]
    } else {
      // 纯文本文件
      const textContent = fs.readFileSync(file.path, 'utf-8')
      if (!textContent.trim()) {
        res.status(400).json({ success: false, message: '文件内容为空' })
        return
      }
      messages = [
        { role: 'system', content: FORMULA_PARSE_SYSTEM_PROMPT },
        { role: 'user', content: FORMULA_PARSE_USER_PROMPT(textContent, file.originalname) },
      ]
    }

    // 调用 AI
    const result = await aiService.chatCompletion(provider, messages, {
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
      useVision: isImage,
    })

    // 解析 AI 返回的 JSON
    let parsed: ParsedFormula
    try {
      parsed = AIService.parseJSONResponse(result.content) as ParsedFormula
    } catch (parseErr: any) {
      console.error('[AI] JSON 解析失败，AI 原始返回:', result.content.substring(0, 500))
      res.status(422).json({
        success: false,
        message: `AI 返回的内容无法解析为 JSON: ${parseErr.message}`,
        data: { rawContent: result.content.substring(0, 1000) },
      })
      return
    }

    // 验证必要字段
    if (!parsed.name || !Array.isArray(parsed.materials) || parsed.materials.length === 0) {
      console.error('[AI] 解析结果不完整，AI 原始返回:', JSON.stringify(parsed).substring(0, 500))
      res.status(422).json({
        success: false,
        message: 'AI 解析结果不完整：缺少配方名称或原料列表',
        data: { parsed: parsed, rawContent: result.content.substring(0, 1000) },
      })
      return
    }

    // 模糊匹配原料 ID
    const userId = req.user.userId
    const materialsWithName = await matchMaterials(parsed.materials, userId)

    // 清理临时文件
    try { fs.unlinkSync(file.path) } catch {}

    res.json({
      success: true,
      data: {
        ...parsed,
        materials: materialsWithName,
        model: result.model,
        usage: result.usage,
      },
    })
  } catch (error: any) {
    console.error('[AI] parseFormula error:', error)
    res.status(500).json({ success: false, message: `AI 解析失败: ${error.message}` })
  }
}

// ─── 自然语言检索 ───

/** POST /api/ai/natural-search — 自然语言转 SQL 查询 */
export async function naturalSearch(req: any, res: Response) {
  try {
    const { query: userQuery, model: provider } = req.body

    if (!userQuery?.trim()) {
      res.status(400).json({ success: false, message: '请输入查询内容' })
      return
    }
    if (!provider) {
      res.status(400).json({ success: false, message: '请选择 AI 模型' })
      return
    }

    // 调用 AI 生成 SQL
    const messages: AIService.ChatMessage[] = [
      { role: 'system', content: NL2SQL_SYSTEM_PROMPT },
      { role: 'user', content: NL2SQL_USER_PROMPT(userQuery) },
    ]

    const aiResult = await aiService.chatCompletion(provider, messages, {
      temperature: 0.1,
    })

    // 提取 SQL（去除 markdown 代码块）
    let sql = aiResult.content.trim()
    const sqlMatch = sql.match(/```(?:sql)?\s*([\s\S]*?)```/)
    if (sqlMatch) {
      sql = sqlMatch[1].trim()
    }

    // 安全校验
    const validation = validateSQL(sql)
    if (!validation.valid) {
      res.status(422).json({
        success: false,
        message: `生成的 SQL 不安全: ${validation.error}`,
        data: { sql, reason: validation.error },
      })
      return
    }

    // 执行查询
    const userId = req.user.userId
    const [[userRow]]: any[][] = await query(
      'SELECT role FROM users WHERE id = ?', [userId]
    )
    const isAdmin = userRow?.role === 'admin'

    // 非 admin 用户强制添加数据隔离条件
    let finalSQL = validation.sql
    if (!isAdmin) {
      // 如果查询涉及 formulas 表且没有 created_by 条件，添加数据隔离
      if (/formulas/i.test(finalSQL) && !/created_by/i.test(finalSQL)) {
        finalSQL = finalSQL.replace(
          /FROM\s+formulas/i,
          'FROM formulas WHERE created_by = ?'
        )
      }
    }

    const [rows]: any[][] = await query(finalSQL, isAdmin ? [] : [userId])

    res.json({
      success: true,
      data: {
        sql: finalSQL,
        originalSQL: aiResult.content.trim(),
        rows,
        rowCount: rows.length,
        model: aiResult.model,
        usage: aiResult.usage,
      },
    })
  } catch (error: any) {
    console.error('[AI] naturalSearch error:', error)
    res.status(500).json({ success: false, message: `AI 检索失败: ${error.message}` })
  }
}

// ─── 获取可用模型列表 ───

/** GET /api/ai/models — 获取已配置的 AI 模型列表 */
export async function getModels(_req: Request, res: Response) {
  try {
    const available = aiService.getAvailableModels()
    const all = aiService.getAllModels()

    res.json({
      success: true,
      data: {
        available: available.map(m => ({
          provider: m.provider,
          name: m.name,
          model: m.model,
          description: m.description,
          supportsVision: m.supportsVision,
        })),
        all: all.map(m => ({
          provider: m.provider,
          name: m.name,
          model: m.model,
          description: m.description,
          supportsVision: m.supportsVision,
          configured: !!m.apiKey && m.apiKey !== '',
        })),
      },
    })
  } catch (error: any) {
    console.error('[AI] getModels error:', error)
    res.status(500).json({ success: false, message: '获取模型列表失败' })
  }
}

// ─── 辅助函数 ───

/** 读取 Excel 文件并转为可读文本（含公式信息，所有 Sheet 拼接） */
function readExcelAsText(filePath: string): string {
  const workbook = XLSX.readFile(filePath)
  const parts: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet['!ref']) continue

    // 用 sheet_to_json 获取值，同时遍历原始单元格提取公式
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (data.length === 0) continue

    // 获取列标题行（第一行的 key）
    const headers = Object.keys(data[0])

    // 找到"含量比"列的索引
    const ratioColIndex = headers.findIndex(h =>
      /含量比|含量|比例|ratio/i.test(h)
    )

    parts.push(`=== ${sheetName} ===`)
    // 输出表头
    parts.push(headers.join(' | '))

    // 遍历数据行
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx]
      const values: string[] = []

      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx]
        const rawVal = String(row[header] ?? '').trim()

        // 对含量比列，尝试提取单元格公式
        if (colIdx === ratioColIndex) {
          // xlsx 内部单元格地址：第一数据行 = 2（第1行是表头）
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx })
          const cell = sheet[cellRef]
          const formula = cell?.f ? String(cell.f) : ''

          if (formula && formula !== rawVal) {
            values.push(`${rawVal} 【公式: ${formula}】`)
          } else {
            values.push(rawVal)
          }
        } else {
          values.push(rawVal)
        }
      }

      const filtered = values.filter(v => v !== '')
      if (filtered.length > 0) {
        parts.push(filtered.join(' | '))
      }
    }

    // 输出公式汇总提示（帮助 AI 理解公式结构）
    if (ratioColIndex >= 0) {
      parts.push('')
      parts.push(`【提示: "${headers[ratioColIndex]}" 列中标记了 【公式: ...】 的单元格含有Excel公式，请从公式中提取除数（如公式 "A2/B2" 中的 B2 值，或 "100/C1" 中的 100）作为成品重量。如果多行公式的除数一致则为有效值，不一致请标记异常。】`)
    }

    parts.push('')
  }

  return parts.join('\n')
}

/** 模糊匹配原料 ID */
async function matchMaterials(
  materials: ParsedMaterial[],
  userId: string,
): Promise<ParsedMaterial[]> {
  for (const mat of materials) {
    // 模糊查找原料
    const [matches]: any[][] = await query(
      `SELECT id, name, code, unit FROM materials 
       WHERE name LIKE ? AND created_by = ?
       ORDER BY LENGTH(name) ASC LIMIT 1`,
      [`%${mat.name}%`, userId]
    )

    if (matches && matches.length > 0) {
      mat.materialId = matches[0].id
      mat.matched = true
      // 如果 AI 未提供单位，使用数据库中的单位
      if (!mat.unit && matches[0].unit) {
        mat.unit = matches[0].unit
      }
    } else {
      // 尝试不限制 created_by（admin 创建的公共原料）
      const [globalMatches]: any[][] = await query(
        `SELECT id, name, code, unit FROM materials 
         WHERE name LIKE ?
         ORDER BY LENGTH(name) ASC LIMIT 1`,
        [`%${mat.name}%`]
      )
      if (globalMatches && globalMatches.length > 0) {
        mat.materialId = globalMatches[0].id
        mat.matched = true
        if (!mat.unit && globalMatches[0].unit) {
          mat.unit = globalMatches[0].unit
        }
      } else {
        mat.materialId = ''
        mat.matched = false
      }
    }
  }
  return materials
}
