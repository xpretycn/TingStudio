// 营养来源对比导出工具
// 支持 PDF（pdfkit）与 Excel（xlsx）两种格式
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { NUTRIENT_FIELDS, NUTRIENT_LABELS, NUTRIENT_META } from "../config/nutritionConstants.js";

interface SourceForExport {
  sourceId: string
  sourceType: string
  sourceDetail: string | null
  confidence: string
  per100g: Record<string, number>
  createdAt: string
  notes?: string | null
}

interface ExportPayload {
  materialId: string
  materialName: string
  sources: SourceForExport[]
  authoritative: {
    sourceType: string
    sourceDetail: string | null
    per100g: Record<string, number>
  } | null
  recommendation: {
    sourceId: string
    sourceType: string
    totalScore: number
  } | null
  generatedAt: string
  generatedBy: string
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: "手工录入",
  tianapi: "天眼查API",
  seed: "种子库",
  ai: "AI估算",
  excel_import: "Excel导入",
  other: "其他",
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
}

// 中文字体路径检测
function getChineseFontPath(): { path: string; name: string } | null {
  const fontPaths = [
    { path: "C:/Windows/Fonts/simhei.ttf", name: "SimHei" },
    { path: "C:/Windows/Fonts/msyh.ttf", name: "MicrosoftYaHei" },
    { path: "C:/Windows/Fonts/simkai.ttf", name: "KaiTi" },
    { path: "C:/Windows/Fonts/simfang.ttf", name: "FangSong" },
    { path: path.join(process.cwd(), "fonts", "simhei.ttf"), name: "SimHei" },
    { path: path.join(process.cwd(), "fonts", "SourceHanSansCN-Regular.ttf"), name: "SourceHanSans" },
  ];
  for (const font of fontPaths) {
    if (fs.existsSync(font.path)) {
      return font;
    }
  }
  return null;
}

let cachedChineseFont: { path: string; name: string } | null = null;
try {
  cachedChineseFont = getChineseFontPath();
  if (cachedChineseFont) {
    console.log(`[NutritionSourcesPDF] 使用中文字体: ${cachedChineseFont.name} (${cachedChineseFont.path})`);
  } else {
    console.warn("[NutritionSourcesPDF] 未找到中文字体，中文可能无法正常显示");
  }
} catch (e) {
  console.warn("[NutritionSourcesPDF] 字体检测失败:", e);
}

function buildValueMatrix(payload: ExportPayload) {
  const headers = ["营养素", "单位", "主用值", ...payload.sources.map((s, i) => {
    const typeLabel = SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType
    return `${typeLabel}#${i + 1}`
  })]

  const rows: (string | number)[][] = [headers]

  for (const field of NUTRIENT_FIELDS) {
    const label = (NUTRIENT_LABELS as Record<string, string>)[field] ?? field
    const meta = (NUTRIENT_META as Record<string, Record<string, unknown>>)[field]
    const unit = (meta?.unit as string) ?? ""
    const authoritativeValue = payload.authoritative?.per100g[field] ?? 0

    const row: (string | number)[] = [label, unit, authoritativeValue]
    for (const s of payload.sources) {
      row.push(s.per100g[field] ?? 0)
    }
    rows.push(row)
  }

  return rows
}

function logPageEvent(event: string, range: { start: number; count: number }): void {
  // noop
}

export async function exportNutritionSourcesExcel(payload: ExportPayload): Promise<Buffer> {
  const wb = XLSX.utils.book_new()

  const summaryData = [
    ["原料名称", payload.materialName],
    ["原料ID", payload.materialId],
    ["来源数量", payload.sources.length],
    ["主用来源类型", payload.authoritative
      ? SOURCE_TYPE_LABELS[payload.authoritative.sourceType] ?? payload.authoritative.sourceType
      : "无"],
    ["推荐来源", payload.recommendation
      ? `${SOURCE_TYPE_LABELS[payload.recommendation.sourceType] ?? payload.recommendation.sourceType} (评分: ${payload.recommendation.totalScore})`
      : "无"],
    ["生成时间", payload.generatedAt],
    ["生成人", payload.generatedBy],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["营养数据来源对比 - 概览"],
    [],
    ...summaryData,
  ])
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, "概览")

  const matrix = buildValueMatrix(payload)
  const valueSheet = XLSX.utils.aoa_to_sheet(matrix)
  valueSheet["!cols"] = matrix[0].map(() => ({ wch: 14 }))
  XLSX.utils.book_append_sheet(wb, valueSheet, "数值对比")

  const deviationHeader = ["营养素", "主用值", "来源均值", "最大偏差%", "来源1偏差%", "来源2偏差%"]
  const deviationRows: (string | number)[][] = [deviationHeader]
  for (const field of NUTRIENT_FIELDS) {
    const label = (NUTRIENT_LABELS as Record<string, string>)[field] ?? field
    const authoritativeValue = payload.authoritative?.per100g[field] ?? 0
    const values = payload.sources.map((s) => s.per100g[field] ?? 0)
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const diffs = values.map((v) => (authoritativeValue > 0.001 ? Math.abs((v - authoritativeValue) / authoritativeValue) * 100 : 0))
    const maxDiff = diffs.length > 0 ? Math.max(...diffs) : 0
    deviationRows.push([
      label,
      authoritativeValue,
      Math.round(avg * 100) / 100,
      Math.round(maxDiff * 10) / 10,
      ...diffs.slice(0, 2).map((d) => Math.round(d * 10) / 10),
    ])
  }
  const deviationSheet = XLSX.utils.aoa_to_sheet(deviationRows)
  deviationSheet["!cols"] = deviationRows[0].map(() => ({ wch: 14 }))
  XLSX.utils.book_append_sheet(wb, deviationSheet, "偏差分析")

  const historyHeader = ["来源类型", "可信度", "更新时间", "来源详情", "备注"]
  const historyRows: (string | number)[][] = [historyHeader]
  for (const s of payload.sources) {
    historyRows.push([
      SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType,
      CONFIDENCE_LABELS[s.confidence] ?? s.confidence,
      s.createdAt,
      s.sourceDetail ?? "",
      s.notes ?? "",
    ])
  }
  const historySheet = XLSX.utils.aoa_to_sheet(historyRows)
  historySheet["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 24 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, historySheet, "来源历史")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return buffer
}

// 表格单元格（支持换行）
interface TableCell {
  text: string
  bg?: string  // 背景色（hex）
  bold?: boolean
  align?: "left" | "center" | "right"
}

interface TableOptions {
  startY?: number
  colWidths: number[]  // 列宽（pt），合计 ≤ A4 内容区宽度
  rowHeight?: number   // 默认行高
  headerBg?: string
  headerFg?: string
  borderColor?: string
  altRowBg?: string
  paddingX?: number
  paddingY?: number
  fontSize?: number
}

const PAGE_WIDTH = 595.28  // A4 宽
const PAGE_HEIGHT = 841.89
const MARGIN = 40
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM_LIMIT = PAGE_HEIGHT - MARGIN

// 简单的中英文字符宽度估算：中文按 1em，英文/数字按 0.55em
function estimateTextWidth(text: string, fontSize: number, isBold = false): number {
  if (!text) return 0
  let w = 0
  for (const ch of text) {
    if (/[　-鿿]/.test(ch)) w += fontSize * 1.0
    else if (/[！-～]/.test(ch)) w += fontSize * 0.6
    else w += fontSize * 0.55
  }
  return w + (isBold ? 0 : 0)
}

// 文本按可用宽度换行，返回每行内容
function wrapText(text: string, maxWidth: number, fontSize: number, isBold = false): string[] {
  if (!text) return [""]
  if (estimateTextWidth(text, fontSize, isBold) <= maxWidth) return [text]
  const lines: string[] = []
  let line = ""
  for (const ch of text) {
    const next = line + ch
    if (estimateTextWidth(next, fontSize, isBold) > maxWidth && line.length > 0) {
      lines.push(line)
      line = ch
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

// 绘制表格
function drawTable(
  doc: PDFKit.PDFDocument,
  rows: TableCell[][],
  options: TableOptions,
): void {
  const {
    colWidths,
    rowHeight = 18,
    headerBg = "#E5F3EE",
    headerFg = "#0F3D2E",
    borderColor = "#D0D7D2",
    altRowBg = "#F7FAF8",
    paddingX = 4,
    paddingY = 3,
    fontSize = 8,
  } = options

  const totalWidth = colWidths.reduce((s, w) => s + w, 0)
  const lineHeight = fontSize * 1.2

  let cursorY = options.startY ?? doc.y
  let rowIndex = 0

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > BOTTOM_LIMIT) {
      doc.addPage()
      cursorY = MARGIN
    }
  }

  const drawCellText = (cell: TableCell, x: number, y: number, w: number, h: number) => {
    const isBold = cell.bold ?? false
    const align = cell.align ?? "left"
    const innerW = w - paddingX * 2
    const lines = wrapText(cell.text, innerW, fontSize, isBold)
    const textHeight = lines.length * lineHeight
    const startY = y + Math.max(paddingY, (h - textHeight) / 2)
    doc.fontSize(fontSize)
    if (isBold) {
      // 模拟加粗：在原文字位置再叠加一层（PDFKit registerFont 时不直接支持加粗）
    }
    for (let li = 0; li < lines.length; li++) {
      const lineY = startY + li * lineHeight
      let lineX = x + paddingX
      if (align === "center") {
        const tw = estimateTextWidth(lines[li], fontSize, isBold)
        lineX = x + (w - tw) / 2
      } else if (align === "right") {
        const tw = estimateTextWidth(lines[li], fontSize, isBold)
        lineX = x + w - paddingX - tw
      }
      doc.text(lines[li], lineX, lineY, {
        lineBreak: false,
        width: innerW,
        ellipsis: true,
      } as unknown as number)
    }
  }

  for (const row of rows) {
    // 先按本行 cell 文本换行后计算真实行高
    let actualRowHeight = rowHeight
    for (let ci = 0; ci < row.length; ci++) {
      const cell = row[ci]
      const innerW = colWidths[ci] - paddingX * 2
      const lines = wrapText(cell.text, innerW, fontSize, cell.bold)
      const h = lines.length * lineHeight + paddingY * 2
      if (h > actualRowHeight) actualRowHeight = h
    }

    if (cursorY + actualRowHeight > BOTTOM_LIMIT) {
      // logPageEvent(`drawTable-row-${rowIndex}-addPage`, doc.bufferedPageRange())
    }
    ensureSpace(actualRowHeight)

    // 画 cell 背景
    let cellX = MARGIN
    for (let ci = 0; ci < row.length; ci++) {
      const cell = row[ci]
      const w = colWidths[ci]
      const isHeader = rowIndex === 0
      let bg: string | undefined
      if (isHeader && headerBg) bg = headerBg
      else if (!isHeader && altRowBg && rowIndex % 2 === 0) bg = altRowBg
      if (cell.bg) bg = cell.bg
      if (bg) {
        doc.save()
        doc.rect(cellX, cursorY, w, actualRowHeight).fill(bg)
        doc.restore()
      }
      // 画 cell 边框
      doc.save()
      doc.lineWidth(0.5)
      doc.strokeColor(borderColor)
      doc.rect(cellX, cursorY, w, actualRowHeight).stroke()
      doc.restore()
      cellX += w
    }

    // 写 cell 文本
    cellX = MARGIN
    const isHeader = rowIndex === 0
    const originalColor = isHeader && headerFg ? headerFg : "#0F172A"
    for (let ci = 0; ci < row.length; ci++) {
      const cell = row[ci]
      const w = colWidths[ci]
      doc.save()
      doc.fillColor(isHeader && headerFg ? headerFg : "#0F172A")
      drawCellText(cell, cellX, cursorY, w, actualRowHeight)
      doc.restore()
      cellX += w
    }
    void originalColor

    cursorY += actualRowHeight
    rowIndex++
  }

  doc.x = MARGIN
  doc.y = cursorY + 4
}

export async function exportNutritionSourcesPdf(payload: ExportPayload): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: MARGIN })

      // 注册中文字体
      if (cachedChineseFont) {
        try {
          doc.registerFont("ChineseFont", cachedChineseFont.path)
          doc.font("ChineseFont")
        } catch (e) {
          console.warn("[NutritionSourcesPDF] 注册中文字体失败:", e)
        }
      }

      const chunks: Buffer[] = []
      doc.on("data", (chunk: Buffer) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // 标题区
      doc.fontSize(20).fillColor("#0F3D2E").text("营养数据来源对比报告", MARGIN, MARGIN, {
        width: CONTENT_WIDTH,
        align: "center",
      } as unknown as number)
      doc.moveDown(0.3)
      doc.fontSize(11).fillColor("#475569").text(
        `原料：${payload.materialName}（${payload.materialId}）`,
        { width: CONTENT_WIDTH, align: "center" } as unknown as number,
      )
      doc.fontSize(9).fillColor("#94A3B8").text(
        `生成时间：${payload.generatedAt} · 生成人：${payload.generatedBy}`,
        { width: CONTENT_WIDTH, align: "center" } as unknown as number,
      )
      doc.moveDown(1)

      // ============ 概览表格 ============
      doc.fontSize(13).fillColor("#0F3D2E").text("概览")
      doc.moveDown(0.3)

      const overviewRows: TableCell[][] = [
        [
          { text: "项目", bold: true, align: "center" },
          { text: "内容", bold: true, align: "center" },
        ],
        [{ text: "来源数量" }, { text: String(payload.sources.length) }],
        [
          { text: "主用来源" },
          { text: payload.authoritative ? (SOURCE_TYPE_LABELS[payload.authoritative.sourceType] ?? payload.authoritative.sourceType) : "无" },
        ],
        [
          { text: "推荐来源" },
          {
            text: payload.recommendation
              ? `${SOURCE_TYPE_LABELS[payload.recommendation.sourceType] ?? payload.recommendation.sourceType}（评分 ${payload.recommendation.totalScore}）`
              : "无",
          },
        ],
        [
          { text: "营养素覆盖" },
          { text: `${NUTRIENT_FIELDS.length} 项（${NUTRIENT_FIELDS.map((f) => (NUTRIENT_LABELS as Record<string, string>)[f] ?? f).slice(0, 5).join(" / ")}…）` },
        ],
      ]
      drawTable(doc, overviewRows, {
        colWidths: [110, 405],
        fontSize: 10,
        rowHeight: 22,
      })

      // ============ 来源明细表格 ============
      doc.moveDown(0.8)
      doc.fontSize(13).fillColor("#0F3D2E").text("来源明细")
      doc.moveDown(0.3)

      const sourceHeader: TableCell[] = [
        { text: "#", bold: true, align: "center" },
        { text: "来源类型", bold: true, align: "center" },
        { text: "置信度", bold: true, align: "center" },
        { text: "详情", bold: true, align: "center" },
        { text: "备注", bold: true, align: "center" },
        { text: "创建时间", bold: true, align: "center" },
      ]
      const sourceRows: TableCell[][] = [sourceHeader]
      payload.sources.forEach((s, i) => {
        const isAuthoritative = payload.authoritative?.sourceId === s.sourceId
        sourceRows.push([
          { text: String(i + 1), align: "center" },
          { text: SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType, bold: isAuthoritative },
          { text: CONFIDENCE_LABELS[s.confidence] ?? s.confidence, align: "center" },
          { text: s.sourceDetail ?? "—" },
          { text: s.notes ?? "—" },
          { text: s.createdAt, align: "center" },
        ])
      })
      drawTable(doc, sourceRows, {
        colWidths: [28, 90, 60, 180, 90, 67],
        fontSize: 8,
        rowHeight: 20,
      })

      // ============ 数值对比表格 ============
      // 不调用 addPage，让 drawTable 根据内容自动分页
      doc.moveDown(1.2)
      doc.fontSize(13).fillColor("#0F3D2E").text("数值对比（每 100g）")
      doc.fontSize(9).fillColor("#94A3B8").text("以下数据为每 100g 原料对应的营养素含量")
      doc.moveDown(0.6)

      // 列宽规划：营养素 + 单位 + 主用值 + N 个来源
      const sourceColCount = payload.sources.length
      const fixedCols = [80, 45, 65]  // 营养素 / 单位 / 主用值
      const sourceColWidth = sourceColCount > 0
        ? Math.max(45, Math.floor((CONTENT_WIDTH - fixedCols.reduce((s, w) => s + w, 0)) / sourceColCount))
        : 0

      const numericHeader: TableCell[] = [
        { text: "营养素", bold: true, align: "center" },
        { text: "单位", bold: true, align: "center" },
        { text: "主用值", bold: true, align: "center" },
        ...payload.sources.map((s, i) => ({
          text: `${SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType}\n#${i + 1}`,
          bold: true,
          align: "center" as const,
        })),
      ]
      const numericRows: TableCell[][] = [numericHeader]
      for (const field of NUTRIENT_FIELDS) {
        const label = (NUTRIENT_LABELS as Record<string, string>)[field] ?? field
        const meta = (NUTRIENT_META as Record<string, Record<string, unknown>>)[field]
        const unit = (meta?.unit as string) ?? ""
        const authVal = payload.authoritative?.per100g[field]
        const row: TableCell[] = [
          { text: label, bold: true },
          { text: unit, align: "center" },
          { text: authVal !== undefined && authVal !== null ? String(authVal) : "—", align: "center" },
        ]
        for (const s of payload.sources) {
          const v = s.per100g[field]
          row.push({
            text: v !== undefined && v !== null ? String(v) : "—",
            align: "center",
          })
        }
        numericRows.push(row)
      }
      drawTable(doc, numericRows, {
        colWidths: [...fixedCols, ...payload.sources.map(() => sourceColWidth)],
        fontSize: 8,
        rowHeight: 20,
      })

      // 页脚
      // 使用缓冲的页数（包括所有已 addPage 的页），逐页添加页脚
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        try {
          doc.switchToPage(i)
          doc.fontSize(8).fillColor("#94A3B8").text(
            `第 ${i + 1} / ${totalPages} 页 · 营养数据来源对比报告`,
            MARGIN,
            PAGE_HEIGHT - MARGIN / 2,
            { width: CONTENT_WIDTH, align: "center" } as unknown as number,
          )
        } catch (e) {
          // ignore
        }
      }

      doc.end()
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}
