import path from "path";
import fs from "fs";

import { query } from "../config/database-better-sqlite3.js";
import {
  generateId,
  now,
  buildPagination,
  rowToCamelCase,
  rowsToCamelCase,
  safeJsonParse,
} from "../utils/helpers.js";
import { exportFormulaToExcel } from "../utils/formulaExporter.js";
import { exportFormulaToPdf } from "../utils/formulaPdfExporter.js";
import { exportMaterialToExcel, exportMaterialToPdf } from "../utils/materialExporter.js";
import { exportReportToExcel, exportMultipleReportsToExcel } from "../utils/reportExcelExporter.js";
import { exportReportToPdf } from "../utils/reportPdfExporter.js";

interface ExportStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingJobs: number;
  activeShares: number;
  templateCount: number;
  recentActivities: Array<{
    type: string;
    title: string;
    desc: string;
    time: string;
  }>;
}

export interface CreateJobInput {
  dataCategory: "formula" | "material" | "weekly-report" | "monthly-report";
  formulaIds?: string[];
  materialIds?: string[];
  includeVersionInfo?: boolean;
  periodStart?: string;
  periodEnd?: string;
  templateId?: string;
  exportType: "excel" | "pdf";
}

interface CreateJobResult {
  jobId: string;
  status: "completed" | "failed";
  fileName?: string;
  errorMessage?: string;
}

interface GetJobsInput {
  status?: string;
  salesmanId?: string;
  creatorId?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  keyword?: string;
  dataCategory?: string;
  page: number;
  pageSize: number;
}

interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface ExportCenterConfig {
  configKey: string;
  configValue: string;
  configType: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

interface MaterialBrief {
  id: string;
  name: string;
  code: string;
  unit: string;
  materialType: string;
  version: number;
  isLatest: boolean;
  totalVersions: number;
}

interface ReportBrief {
  id: string;
  title: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  status: string;
}

function getExportDir(): string {
  const dir = process.env.EXPORT_DIR || path.resolve(process.cwd(), "exports");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function normalizeErrorMessage(err: unknown): string {
  const errMsg = err instanceof Error ? err.message : "导出失败";
  if (errMsg.includes("数据库未初始化")) {
    return "系统数据库连接异常，请稍后重试或联系管理员";
  }
  if (errMsg.includes("配方不存在")) {
    return "配方数据不存在，请检查配方是否已被删除";
  }
  if (errMsg.includes("原料不存在")) {
    return "原料数据不存在，请检查原料是否已被删除";
  }
  if (errMsg.includes("报告不存在")) {
    return "报告数据不存在，请检查报告是否已被删除";
  }
  return errMsg;
}

async function executeFormulaExport(
  formulaId: string,
  versionId: string | undefined,
  exportType: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  if (exportType === "pdf") {
    return exportFormulaToPdf(formulaId, versionId);
  }
  return exportFormulaToExcel(formulaId, versionId);
}

async function executeMaterialExport(
  materialIds: string[],
  exportType: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  if (exportType === "pdf") {
    return exportMaterialToPdf(materialIds);
  }
  return exportMaterialToExcel(materialIds);
}

async function executeReportExport(
  dataCategory: string,
  periodStart: string | undefined,
  periodEnd: string | undefined,
  exportType: string,
  userId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const reportType = dataCategory === "weekly-report" ? "weekly" : "monthly";

  let whereSql = "WHERE type = ?";
  const params: unknown[] = [reportType];

  if (periodStart) {
    whereSql += " AND period_start >= ?";
    params.push(periodStart);
  }
  if (periodEnd) {
    whereSql += " AND period_end <= ?";
    params.push(periodEnd);
  }

  const [rows] = query(
    `SELECT id, type, title, period_start, period_end, status, data_json FROM reports ${whereSql} ORDER BY period_start DESC`,
    params,
  ) as [Record<string, unknown>[]];

  if (!rows || rows.length === 0) {
    throw new Error("报告不存在");
  }

  if (exportType === "pdf") {
    const report = rows[0];
    return exportReportToPdf({
      type: report.type as string,
      title: report.title as string,
      periodStart: report.period_start as string,
      periodEnd: report.period_end as string,
      dataJson: safeJsonParse(report.data_json as string, {}),
    });
  }

  if (rows.length === 1) {
    const report = rows[0];
    return exportReportToExcel({
      type: report.type as string,
      title: report.title as string,
      periodStart: report.period_start as string,
      periodEnd: report.period_end as string,
      dataJson: safeJsonParse(report.data_json as string, {}),
    });
  }

  const reports = rows.map((r) => ({
    id: r.id as string,
    type: r.type as string,
    title: r.title as string,
    periodStart: r.period_start as string,
    periodEnd: r.period_end as string,
    dataJson: safeJsonParse(r.data_json as string, {}),
  }));
  return exportMultipleReportsToExcel(reports);
}

export async function getStatistics(userId: string, role: string): Promise<ExportStatistics> {
  const ownerFilter = role === "admin" ? "" : "WHERE created_by = ?";
  const ownerParams = role === "admin" ? [] : [userId];

  const [jobStats] = query(
    `SELECT
      COUNT(*) as total_jobs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
      SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) as processing_jobs
     FROM export_jobs ${ownerFilter}`,
    ownerParams,
  ) as [Record<string, unknown>[]];

  const shareFilter = role === "admin" ? "" : "WHERE created_by = ?";
  const shareParams = role === "admin" ? [] : [userId];

  const [shareStats] = query(
    `SELECT COUNT(*) as active_shares FROM share_configs ${shareFilter}`,
    shareParams,
  ) as [Record<string, unknown>[]];

  const [templateStats] = query(
    "SELECT COUNT(*) as template_count FROM export_templates",
  ) as [Record<string, unknown>[]];

  const [recentJobs] = query(
    `SELECT job_id, data_category, export_type, status, created_at, error_message
     FROM export_jobs ${ownerFilter}
     ORDER BY created_at DESC LIMIT 5`,
    ownerParams,
  ) as [Record<string, unknown>[]];

  const [recentShares] = query(
    `SELECT share_id, share_type, created_at FROM share_configs ${shareFilter} ORDER BY created_at DESC LIMIT 5`,
    shareParams,
  ) as [Record<string, unknown>[]];

  const recentActivities: Array<{ type: string; title: string; desc: string; time: string }> = [];

  for (const job of recentJobs) {
    const category = (job.data_category as string) || "formula";
    const categoryLabel = category === "formula"
      ? "配方"
      : category === "material"
        ? "原料"
        : category === "weekly-report"
          ? "周报"
          : "月报";
    const statusLabel = job.status === "completed" ? "完成" : job.status === "failed" ? "失败" : "处理中";
    recentActivities.push({
      type: "export",
      title: `${categoryLabel}导出`,
      desc: `${(job.export_type as string)?.toUpperCase() || "EXCEL"} 导出${statusLabel}`,
      time: job.created_at as string,
    });
  }

  for (const share of recentShares) {
    recentActivities.push({
      type: "share",
      title: "分享链接",
      desc: `创建${share.share_type === "link" ? "公开" : share.share_type === "email" ? "邮件" : "API"}分享`,
      time: share.created_at as string,
    });
  }

  recentActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return {
    totalJobs: Number(jobStats[0]?.total_jobs ?? 0),
    completedJobs: Number(jobStats[0]?.completed_jobs ?? 0),
    failedJobs: Number(jobStats[0]?.failed_jobs ?? 0),
    processingJobs: Number(jobStats[0]?.processing_jobs ?? 0),
    activeShares: Number(shareStats[0]?.active_shares ?? 0),
    templateCount: Number(templateStats[0]?.template_count ?? 0),
    recentActivities: recentActivities.slice(0, 10),
  };
}

export async function getTemplates(params: {
  type?: string;
  category?: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<Record<string, unknown>>> {
  const { type, category, page, pageSize } = params;
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  if (type) {
    conditions.push("type = ?");
    queryParams.push(type);
  }
  if (category) {
    conditions.push("category = ?");
    queryParams.push(category);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [templates] = query(
    `SELECT * FROM export_templates ${whereSql} ORDER BY is_default DESC, created_at DESC LIMIT ? OFFSET ?`,
    [...queryParams, size, offset],
  ) as [Record<string, unknown>[]];

  const [countResult] = query(
    `SELECT COUNT(*) as total FROM export_templates ${whereSql}`,
    queryParams,
  ) as [Record<string, unknown>[]];

  const result = templates.map((t) => ({
    ...rowToCamelCase(t),
    formatConfig: safeJsonParse(t.format_config_json as string, {}),
    category: t.category ?? "formula",
  }));

  return {
    list: result,
    total: Number(countResult[0]?.total ?? 0),
    page: p,
    pageSize: size,
  };
}

export async function createTemplate(
  data: Record<string, unknown>,
  userId: string,
): Promise<{ templateId: string }> {
  const { name, description, type, formatConfig, isDefault, category } = data;
  const id = generateId();

  if (isDefault) {
    const catValue = (category as string) ?? "formula";
    query("UPDATE export_templates SET is_default = 0 WHERE type = ? AND category = ?", [
      type,
      catValue,
    ]);
  }

  query(
    `INSERT INTO export_templates (template_id, name, description, type, format_config_json, is_default, category, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      description ?? null,
      type,
      JSON.stringify(formatConfig ?? {}),
      isDefault ? 1 : 0,
      (category as string) ?? "formula",
      userId,
      now(),
    ],
  );

  return { templateId: id };
}

export async function updateTemplate(
  templateId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { name, description, type, formatConfig, isDefault, category } = data;

  if (isDefault) {
    const catValue = (category as string) ?? "formula";
    query("UPDATE export_templates SET is_default = 0 WHERE type = ? AND category = ?", [
      type,
      catValue,
    ]);
  }

  query(
    `UPDATE export_templates SET name = ?, description = ?, type = ?, format_config_json = ?, is_default = ?, category = ?, updated_at = ? WHERE template_id = ?`,
    [
      name,
      description ?? null,
      type,
      JSON.stringify(formatConfig ?? {}),
      isDefault ? 1 : 0,
      (category as string) ?? "formula",
      now(),
      templateId,
    ],
  );
}

export async function deleteTemplate(templateId: string): Promise<void> {
  query("DELETE FROM export_templates WHERE template_id = ?", [templateId]);
}

export async function createJob(
  data: CreateJobInput,
  userId: string,
): Promise<CreateJobResult> {
  const {
    dataCategory,
    formulaIds,
    materialIds,
    periodStart,
    periodEnd,
    templateId,
    exportType,
  } = data;
  const id = generateId();

  if (exportType !== "excel" && exportType !== "pdf") {
    return {
      jobId: id,
      status: "failed",
      errorMessage: "当前仅支持 Excel 和 PDF 格式导出",
    };
  }

  const targetIds = dataCategory === "formula"
    ? formulaIds ?? []
    : dataCategory === "material"
      ? materialIds ?? []
      : [];

  query(
    `INSERT INTO export_jobs (job_id, data_category, target_ids_json, period_start, period_end, template_id, export_type, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?)`,
    [
      id,
      dataCategory,
      JSON.stringify(targetIds),
      periodStart ?? null,
      periodEnd ?? null,
      templateId ?? null,
      exportType,
      userId,
      now(),
    ],
  );

  try {
    let buffer: Buffer;
    let fileName: string;
    const ext = exportType === "pdf" ? "pdf" : "xlsx";

    switch (dataCategory) {
      case "formula": {
        const ids = formulaIds ?? [];
        if (ids.length === 0) {
          throw new Error("未指定配方ID");
        }
        if (ids.length === 1) {
          const result = await executeFormulaExport(ids[0], undefined, exportType);
          buffer = result.buffer;
          fileName = result.fileName;
        } else {
          const results = await Promise.all(
            ids.map(id => executeFormulaExport(id, undefined, exportType)),
          );
          if (exportType === "pdf") {
            const { mergePdfs } = await import("../utils/pdfMerger.js");
            const pdfBuffers = results.map(r => r.buffer);
            buffer = await mergePdfs(pdfBuffers);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            fileName = `配方批量导出_${dateStr}.pdf`;
          } else {
            const { mergeExcelBuffers } = await import("../utils/excelMerger.js");
            const excelBuffers = results.map(r => r.buffer);
            const sheetNames = results.map(r => {
              const baseName = r.fileName.replace(/\.(xlsx|xls)$/i, "");
              return baseName.length > 31 ? baseName.slice(0, 31) : baseName;
            });
            buffer = await mergeExcelBuffers(excelBuffers, sheetNames);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            fileName = `配方批量导出_${dateStr}.xlsx`;
          }
        }
        break;
      }
      case "material": {
        const ids = materialIds ?? [];
        if (ids.length === 0) {
          throw new Error("未指定原料ID");
        }
        const result = await executeMaterialExport(ids, exportType);
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      case "weekly-report":
      case "monthly-report": {
        const result = await executeReportExport(
          dataCategory,
          periodStart,
          periodEnd,
          exportType,
          userId,
        );
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      default:
        throw new Error(`不支持的数据类别: ${dataCategory}`);
    }

    const filePath = path.join(getExportDir(), `${id}.${ext}`);
    fs.writeFileSync(filePath, buffer);

    query(
      `UPDATE export_jobs SET status = 'completed', file_name = ?, progress = 100, completed_at = ? WHERE job_id = ?`,
      [fileName, now(), id],
    );

    return { jobId: id, status: "completed", fileName };
  } catch (exportError: unknown) {
    const userMsg = normalizeErrorMessage(exportError);
    query(`UPDATE export_jobs SET status = 'failed', error_message = ? WHERE job_id = ?`, [
      userMsg,
      id,
    ]);
    return { jobId: id, status: "failed", errorMessage: userMsg };
  }
}

export async function getJobs(
  params: GetJobsInput,
  userId: string,
  role: string,
): Promise<PaginatedResult<Record<string, unknown>>> {
  const {
    status,
    salesmanId,
    creatorId,
    dateRangeStart,
    dateRangeEnd,
    keyword,
    dataCategory,
    page,
    pageSize,
  } = params;
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  if (role !== "admin") {
    conditions.push("ej.created_by = ?");
    queryParams.push(userId);
  }

  if (status) {
    conditions.push("ej.status = ?");
    queryParams.push(status);
  }

  if (creatorId) {
    conditions.push("ej.created_by = ?");
    queryParams.push(creatorId);
  }

  if (dateRangeStart) {
    conditions.push("ej.created_at >= ?");
    queryParams.push(dateRangeStart);
  }

  if (dateRangeEnd) {
    conditions.push("ej.created_at <= ?");
    queryParams.push(dateRangeEnd);
  }

  if (keyword) {
    conditions.push("(ej.file_name LIKE ? OR ej.error_message LIKE ? OR ej.data_category LIKE ?)");
    const likeVal = `%${keyword}%`;
    queryParams.push(likeVal, likeVal, likeVal);
  }

  if (dataCategory) {
    conditions.push("ej.data_category = ?");
    queryParams.push(dataCategory);
  }

  if (salesmanId) {
    conditions.push("f.salesman_id = ?");
    queryParams.push(salesmanId);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [list] = query(
    `SELECT ej.*, f.name as formula_name
     FROM export_jobs ej
     LEFT JOIN formulas f ON ej.formula_id = f.id
     ${whereSql} ORDER BY ej.created_at DESC LIMIT ? OFFSET ?`,
    [...queryParams, size, offset],
  ) as [Record<string, unknown>[]];

  const [countResult] = query(
    `SELECT COUNT(*) as total FROM export_jobs ej LEFT JOIN formulas f ON ej.formula_id = f.id ${whereSql}`,
    queryParams,
  ) as [Record<string, unknown>[]];

  const result = rowsToCamelCase(list).map((item) => ({
    ...item,
    targetIds: safeJsonParse((item as Record<string, unknown>).targetIdsJson as string, []),
  }));

  return {
    list: result,
    total: Number(countResult[0]?.total ?? 0),
    page: p,
    pageSize: size,
  };
}

export async function getJob(
  jobId: string,
): Promise<Record<string, unknown> | null> {
  const [rows] = query("SELECT * FROM export_jobs WHERE job_id = ?", [jobId]) as [
    Record<string, unknown>[],
  ];

  if (!rows || rows.length === 0) {
    return null;
  }

  const job = rowToCamelCase(rows[0]);
  return {
    ...job,
    targetIds: safeJsonParse((job as Record<string, unknown>).targetIdsJson as string, []),
  };
}

export async function retryJob(
  jobId: string,
  userId: string,
): Promise<CreateJobResult> {
  const [rows] = query("SELECT * FROM export_jobs WHERE job_id = ? AND created_by = ?", [
    jobId,
    userId,
  ]) as [Record<string, unknown>[]];

  if (!rows || rows.length === 0) {
    return { jobId, status: "failed", errorMessage: "任务不存在" };
  }

  const job = rows[0];

  if (job.status !== "failed") {
    return { jobId, status: "failed", errorMessage: "只能重试失败的任务" };
  }

  query(
    "UPDATE export_jobs SET status = 'processing', error_message = NULL, completed_at = NULL WHERE job_id = ?",
    [jobId],
  );

  try {
    let buffer: Buffer;
    let fileName: string;
    const exportType = job.export_type as string;
    const ext = exportType === "pdf" ? "pdf" : "xlsx";
    const dataCategory = (job.data_category as string) ?? "formula";
    const targetIds = safeJsonParse(job.target_ids_json as string, []) as string[];

    switch (dataCategory) {
      case "formula": {
        const formulaId = job.formula_id as string;
        const result = await executeFormulaExport(formulaId, job.version_id as string, exportType);
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      case "material": {
        const ids = targetIds.length > 0 ? targetIds : [job.formula_id as string];
        const result = await executeMaterialExport(ids, exportType);
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      case "weekly-report":
      case "monthly-report": {
        const result = await executeReportExport(
          dataCategory,
          job.period_start as string | undefined,
          job.period_end as string | undefined,
          exportType,
          userId,
        );
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      default: {
        const formulaId = job.formula_id as string;
        const result = await executeFormulaExport(formulaId, job.version_id as string, exportType);
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
    }

    const filePath = path.join(getExportDir(), `${jobId}.${ext}`);
    fs.writeFileSync(filePath, buffer);

    query(
      "UPDATE export_jobs SET status = ?, file_name = ?, progress = 100, completed_at = ? WHERE job_id = ?",
      ["completed", fileName, now(), jobId],
    );

    return { jobId, status: "completed", fileName };
  } catch (exportError: unknown) {
    const errMsg = normalizeErrorMessage(exportError);
    query("UPDATE export_jobs SET status = ?, error_message = ? WHERE job_id = ?", [
      "failed",
      errMsg,
      jobId,
    ]);
    return { jobId, status: "failed", errorMessage: errMsg };
  }
}

export async function reExportJob(
  jobId: string,
  userId: string,
): Promise<CreateJobResult> {
  const [rows] = query("SELECT * FROM export_jobs WHERE job_id = ? AND created_by = ?", [
    jobId,
    userId,
  ]) as [Record<string, unknown>[]];

  if (!rows || rows.length === 0) {
    return { jobId, status: "failed", errorMessage: "任务不存在" };
  }

  const job = rows[0];

  if (job.status !== "completed" && job.status !== "failed") {
    return { jobId, status: "failed", errorMessage: "只能重新导出已完成或失败的任务" };
  }

  query(
    "UPDATE export_jobs SET status = 'processing', error_message = NULL, completed_at = NULL WHERE job_id = ?",
    [jobId],
  );

  try {
    let buffer: Buffer;
    let fileName: string;
    const exportType = job.export_type as string;
    const ext = exportType === "pdf" ? "pdf" : "xlsx";
    const dataCategory = (job.data_category as string) ?? "formula";
    const targetIds = safeJsonParse(job.target_ids_json as string, []) as string[];

    switch (dataCategory) {
      case "formula": {
        const formulaId = job.formula_id as string;
        const result = await executeFormulaExport(formulaId, job.version_id as string, exportType);
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      case "material": {
        const ids = targetIds.length > 0 ? targetIds : [job.formula_id as string];
        const result = await executeMaterialExport(ids, exportType);
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      case "weekly-report":
      case "monthly-report": {
        const result = await executeReportExport(
          dataCategory,
          job.period_start as string | undefined,
          job.period_end as string | undefined,
          exportType,
          userId,
        );
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
      default: {
        const formulaId = job.formula_id as string;
        const result = await executeFormulaExport(formulaId, job.version_id as string, exportType);
        buffer = result.buffer;
        fileName = result.fileName;
        break;
      }
    }

    const filePath = path.join(getExportDir(), `${jobId}.${ext}`);
    fs.writeFileSync(filePath, buffer);

    query(
      "UPDATE export_jobs SET status = ?, file_name = ?, progress = 100, completed_at = ? WHERE job_id = ?",
      ["completed", fileName, now(), jobId],
    );

    return { jobId, status: "completed", fileName };
  } catch (exportError: unknown) {
    const errMsg = normalizeErrorMessage(exportError);
    query("UPDATE export_jobs SET status = ?, error_message = ? WHERE job_id = ?", [
      "failed",
      errMsg,
      jobId,
    ]);
    return { jobId, status: "failed", errorMessage: errMsg };
  }
}

export async function downloadFile(
  jobId: string,
): Promise<{ filePath: string; fileName: string; contentType: string }> {
  const [rows] = query("SELECT * FROM export_jobs WHERE job_id = ? AND status = ?", [
    jobId,
    "completed",
  ]) as [Record<string, unknown>[]];

  if (!rows || rows.length === 0) {
    throw new Error("导出文件不存在或任务未完成");
  }

  const job = rows[0];
  const ext = job.export_type === "pdf" ? "pdf" : "xlsx";
  const filePath = path.join(getExportDir(), `${jobId}.${ext}`);

  if (!fs.existsSync(filePath)) {
    throw new Error("导出文件已过期或不存在");
  }

  const fileName = (job.file_name as string) || `导出文件.${ext}`;
  const contentType =
    ext === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return { filePath, fileName, contentType };
}

export async function createShare(
  data: Record<string, unknown>,
  userId: string,
): Promise<{ shareId: string; shareUrl: string }> {
  const {
    formulaId,
    versionId,
    shareType,
    password,
    expireDate,
    allowedEmails,
    downloadLimit,
  } = data;
  const id = generateId();
  const shareUrl = `/share/${id}`;

  query(
    `INSERT INTO share_configs (share_id, formula_id, version_id, share_type, share_url, password, expire_date, allowed_emails_json, download_limit, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      formulaId,
      versionId ?? null,
      shareType ?? "link",
      shareUrl,
      password ?? null,
      expireDate ?? null,
      JSON.stringify(allowedEmails ?? []),
      downloadLimit ?? null,
      userId,
      now(),
    ],
  );

  return { shareId: id, shareUrl };
}

export async function getShares(
  userId: string,
  role: string,
): Promise<Record<string, unknown>[]> {
  const filterSql = role === "admin" ? "" : "WHERE sc.created_by = ?";
  const filterParams = role === "admin" ? [] : [userId];

  const [shares] = query(
    `SELECT sc.*, f.name as formula_name FROM share_configs sc LEFT JOIN formulas f ON sc.formula_id = f.id ${filterSql} ORDER BY sc.created_at DESC`,
    filterParams,
  ) as [Record<string, unknown>[]];

  return shares.map((s) => ({
    ...rowToCamelCase(s),
    allowedEmails: safeJsonParse(s.allowed_emails_json as string, []),
  }));
}

export async function deleteShare(shareId: string): Promise<void> {
  query("DELETE FROM share_configs WHERE share_id = ?", [shareId]);
}

export async function getPublicShare(
  shareId: string,
): Promise<Record<string, unknown>> {
  const [rows] = query("SELECT * FROM share_configs WHERE share_id = ?", [shareId]) as [
    Record<string, unknown>[],
  ];

  if (!rows || rows.length === 0) {
    throw new Error("分享不存在");
  }

  const share = rows[0];

  if (share.expire_date && new Date(share.expire_date as string) < new Date()) {
    throw new Error("分享链接已过期");
  }

  if (share.download_limit && Number(share.download_count) >= Number(share.download_limit)) {
    throw new Error("下载次数已达上限");
  }

  query("UPDATE share_configs SET download_count = download_count + 1 WHERE share_id = ?", [
    shareId,
  ]);

  const [formulaRows] = query("SELECT * FROM formulas WHERE id = ?", [share.formula_id]) as [
    Record<string, unknown>[],
  ];

  return {
    ...rowToCamelCase(share),
    allowedEmails: safeJsonParse(share.allowed_emails_json as string, []),
    formula: formulaRows?.[0] ? rowToCamelCase(formulaRows[0]) : null,
  };
}

export async function getConfig(): Promise<ExportCenterConfig[]> {
  const [rows] = query("SELECT * FROM export_center_config") as [Record<string, unknown>[]];

  if (!rows || rows.length === 0) {
    return [];
  }

  return rows.map((r) => rowToCamelCase(r) as ExportCenterConfig);
}

export async function updateConfig(
  configs: Array<{ configKey: string; configValue: string }>,
  updatedBy: string,
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  for (const config of configs) {
    const [existing] = query(
      "SELECT config_key, config_type FROM export_center_config WHERE config_key = ?",
      [config.configKey],
    ) as [Record<string, unknown>[]];

    if (!existing || existing.length === 0) {
      continue;
    }

    const configType = existing[0].config_type as string;

    if (configType === "number") {
      const numVal = Number(config.configValue);
      if (isNaN(numVal)) {
        continue;
      }
    }

    if (configType === "boolean") {
      if (config.configValue !== "true" && config.configValue !== "false") {
        continue;
      }
    }

    query(
      "UPDATE export_center_config SET config_value = ?, updated_by = ?, updated_at = ? WHERE config_key = ?",
      [config.configValue, updatedBy, now(), config.configKey],
    );
    updatedCount++;
  }

  return { updatedCount };
}

export async function getMaterialsForExport(
  keyword?: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedResult<MaterialBrief>> {
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = ["is_latest = 1", "is_deleted = 0"];
  const queryParams: unknown[] = [];

  if (keyword) {
    conditions.push("(name LIKE ? OR code LIKE ?)");
    const likeVal = `%${keyword}%`;
    queryParams.push(likeVal, likeVal);
  }

  const whereSql = `WHERE ${conditions.join(" AND ")}`;

  const [rows] = query(
    `SELECT id, name, code, unit, material_type, version, is_latest FROM materials ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...queryParams, size, offset],
  ) as [Record<string, unknown>[]];

  const [countResult] = query(
    `SELECT COUNT(*) as total FROM materials ${whereSql}`,
    queryParams,
  ) as [Record<string, unknown>[]];

  const materialIds = rows.map((r) => r.id);

  const versionCounts: Record<string, number> = {};
  if (materialIds.length > 0) {
    const [versionRows] = query(
      `SELECT code, COUNT(*) as cnt FROM materials WHERE code IN (SELECT code FROM materials WHERE id IN (${materialIds.map(() => "?").join(",")})) GROUP BY code`,
      materialIds,
    ) as [Record<string, unknown>[]];

    for (const vr of versionRows) {
      versionCounts[vr.code as string] = Number(vr.cnt);
    }
  }

  const list: MaterialBrief[] = rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    code: r.code as string,
    unit: r.unit as string,
    materialType: r.material_type as string,
    version: Number(r.version),
    isLatest: Number(r.is_latest) === 1,
    totalVersions: versionCounts[r.code as string] ?? 1,
  }));

  return {
    list,
    total: Number(countResult[0]?.total ?? 0),
    page: p,
    pageSize: size,
  };
}

export async function getReportsForExport(
  type: string,
  periodStart?: string,
  periodEnd?: string,
  page?: number,
  pageSize?: number,
): Promise<PaginatedResult<ReportBrief>> {
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = ["type = ?"];
  const queryParams: unknown[] = [type];

  if (periodStart) {
    conditions.push("period_start >= ?");
    queryParams.push(periodStart);
  }
  if (periodEnd) {
    conditions.push("period_end <= ?");
    queryParams.push(periodEnd);
  }

  const whereSql = `WHERE ${conditions.join(" AND ")}`;

  const [rows] = query(
    `SELECT id, title, type, period_start, period_end, status FROM reports ${whereSql} ORDER BY period_start DESC LIMIT ? OFFSET ?`,
    [...queryParams, size, offset],
  ) as [Record<string, unknown>[]];

  const [countResult] = query(
    `SELECT COUNT(*) as total FROM reports ${whereSql}`,
    queryParams,
  ) as [Record<string, unknown>[]];

  const list: ReportBrief[] = rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    type: r.type as string,
    periodStart: r.period_start as string,
    periodEnd: r.period_end as string,
    status: r.status as string,
  }));

  return {
    list,
    total: Number(countResult[0]?.total ?? 0),
    page: p,
    pageSize: size,
  };
}
