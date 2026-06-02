// 营养来源对比导出工具
// 支持 PDF（pdfkit）与 Excel（xlsx）两种格式
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
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

export async function exportNutritionSourcesPdf(payload: ExportPayload): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 })
      const chunks: Buffer[] = []
      doc.on("data", (chunk: Buffer) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      doc.fontSize(20).text("Nutrition Source Comparison Report", { align: "center" } as unknown as number)
      doc.moveDown()
      doc.fontSize(12).text(`Material: ${payload.materialName} (${payload.materialId})`, { align: "center" } as unknown as number)
      doc.fontSize(10).text(`Generated at: ${payload.generatedAt} by ${payload.generatedBy}`, { align: "center" } as unknown as number)
      doc.moveDown(2)

      doc.fontSize(14).text("Overview")
      doc.moveDown(0.5)
      doc.fontSize(10)
      doc.text(`Sources: ${payload.sources.length}`)
      doc.text(`Authoritative: ${payload.authoritative ? (SOURCE_TYPE_LABELS[payload.authoritative.sourceType] ?? payload.authoritative.sourceType) : "N/A"}`)
      if (payload.recommendation) {
        doc.text(`Recommendation: ${SOURCE_TYPE_LABELS[payload.recommendation.sourceType] ?? payload.recommendation.sourceType} (score: ${payload.recommendation.totalScore})`)
      }
      doc.moveDown()

      doc.fontSize(14).text("Source Details")
      doc.moveDown(0.5)
      doc.fontSize(9)
      payload.sources.forEach((s, i) => {
        doc.text(`${i + 1}. ${SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType} | Confidence: ${CONFIDENCE_LABELS[s.confidence] ?? s.confidence} | Created: ${s.createdAt}`)
        if (s.sourceDetail) doc.text(`   Detail: ${s.sourceDetail}`)
        if (s.notes) doc.text(`   Notes: ${s.notes}`)
        doc.moveDown(0.3)
      })
      doc.moveDown()

      doc.addPage()
      doc.fontSize(14).text("Value Comparison")
      doc.moveDown(0.5)
      doc.fontSize(8)

      const headers = ["Nutrient", "Unit", "Auth", ...payload.sources.map((s, i) => {
        const typeLabel = SOURCE_TYPE_LABELS[s.sourceType] ?? s.sourceType
        return `${typeLabel.substring(0, 6)}#${i + 1}`
      })]
      doc.text(headers.join("\t"), undefined, undefined, { align: "left" } as Record<string, unknown>)
      doc.moveDown(0.3)
      doc.text("─".repeat(80))
      doc.moveDown(0.3)

      for (const field of NUTRIENT_FIELDS) {
        const label = (NUTRIENT_LABELS as Record<string, string>)[field] ?? field
        const meta = (NUTRIENT_META as Record<string, Record<string, unknown>>)[field]
        const unit = (meta?.unit as string) ?? ""
        const authVal = payload.authoritative?.per100g[field] ?? 0
        const row: string[] = [label, unit, String(authVal)]
        for (const s of payload.sources) {
          row.push(String(s.per100g[field] ?? 0))
        }
        doc.text(row.join("\t"))
      }

      doc.end()
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}
