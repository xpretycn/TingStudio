// 导出管理控制器
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { query } from "../config/database-better-sqlite3.js";
import {
  generateId,
  now,
  success,
  successWithPagination,
  buildPagination,
  rowToCamelCase,
  rowsToCamelCase,
  safeJsonParse,
  buildContentDisposition,
} from "../utils/helpers.js";
import { exportFormulaToExcel } from "../utils/formulaExporter.js";
import { exportFormulaToPdf } from "../utils/formulaPdfExporter.js";

function getExportDir(): string {
  const dir = process.env.EXPORT_DIR || path.resolve(process.cwd(), "exports");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** 获取导出模板列表 */
export async function getExportTemplates(req: Request, res: Response) {
  try {
    const { type, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));

    let whereSql = "";
    const params: any[] = [];

    if (type) {
      whereSql = " WHERE type = ?";
      params.push(type);
    }

    const [templates]: any[] = await query(
      `SELECT * FROM export_templates${whereSql} ORDER BY is_default DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );
    const [countResult]: any[] = await query(`SELECT COUNT(*) as total FROM export_templates${whereSql}`, params);

    const result = templates.map((t: any) => ({
      ...rowToCamelCase(t),
      formatConfig: safeJsonParse(t.format_config_json, {}),
    }));

    res.json(successWithPagination(result, countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取导出模板失败", error: error.message });
  }
}

/** 创建导出模板 */
export async function createExportTemplate(req: any, res: Response) {
  try {
    const { name, description, type, formatConfig, isDefault } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    if (isDefault) {
      await query("UPDATE export_templates SET is_default = 0 WHERE type = ?", [type]);
    }

    await query(
      `INSERT INTO export_templates (template_id, name, description, type, format_config_json, is_default, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, type, JSON.stringify(formatConfig), isDefault ? 1 : 0, userId, now()],
    );

    res.status(201).json(success({ templateId: id }, "模板创建成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "创建模板失败", error: error.message });
  }
}

/** 创建导出任务（同步执行导出） */
export async function createExportJob(req: any, res: Response) {
  try {
    const { formulaId, versionId, templateId, exportType } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    // 校验导出类型
    if (exportType !== "excel" && exportType !== "pdf") {
      res.status(400).json({ success: false, message: "当前仅支持 Excel 和 PDF 格式导出" });
      return;
    }

    // 创建任务记录（processing 状态）
    await query(
      `INSERT INTO export_jobs (job_id, formula_id, version_id, template_id, export_type, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'processing', ?, ?)`,
      [id, formulaId, versionId, templateId, exportType, userId, now()],
    );

    try {
      let buffer: Buffer;
      let fileName: string;
      const ext = exportType === "pdf" ? "pdf" : "xlsx";

      if (exportType === "pdf") {
        const result = await exportFormulaToPdf(formulaId, versionId);
        buffer = result.buffer;
        fileName = result.fileName;
      } else {
        const result = await exportFormulaToExcel(formulaId, versionId);
        buffer = result.buffer;
        fileName = result.fileName;
      }

      // 保存文件到磁盘
      const filePath = path.join(getExportDir(), `${id}.${ext}`);
      fs.writeFileSync(filePath, buffer);

      // 更新任务状态为已完成
      await query(
        `UPDATE export_jobs SET status = 'completed', file_name = ?, progress = 100, completed_at = ? WHERE job_id = ?`,
        [fileName, now(), id],
      );

      res.status(201).json(success({ jobId: id, status: "completed", fileName }, "导出完成"));
    } catch (exportError: any) {
      const errMsg = exportError.message || "导出失败";
      const userMsg = errMsg.includes("数据库未初始化")
        ? "系统数据库连接异常，请稍后重试或联系管理员"
        : errMsg.includes("配方不存在")
          ? "配方数据不存在，请检查配方是否已被删除"
          : errMsg;
      await query(`UPDATE export_jobs SET status = 'failed', error_message = ? WHERE job_id = ?`, [
        userMsg,
        id,
      ]);
      res
        .status(201)
        .json(success({ jobId: id, status: "failed", errorMessage: userMsg }, "导出任务已创建但执行失败"));
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: "创建导出任务失败", error: error.message });
  }
}

/** 获取导出任务列表 */
export async function getExportJobs(req: any, res: Response) {
  try {
    const { status, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));
    const userId = req.user.userId;

    let whereSql = "WHERE ej.created_by = ?";
    const params: any[] = [userId];

    if (status) {
      whereSql += " AND ej.status = ?";
      params.push(status);
    }

    // 关联查询配方名称
    const [list]: any[] = await query(
      `SELECT ej.*, f.name as formula_name 
       FROM export_jobs ej 
       LEFT JOIN formulas f ON ej.formula_id = f.id 
       ${whereSql} ORDER BY ej.created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );
    const [countResult]: any[] = await query(`SELECT COUNT(*) as total FROM export_jobs ej ${whereSql}`, params);

    res.json(successWithPagination(rowsToCamelCase(list), countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取导出任务失败", error: error.message });
  }
}

/** 获取导出任务状态 */
export async function getExportJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const [[job]]: any[][] = await query("SELECT * FROM export_jobs WHERE job_id = ?", [jobId]);
    if (!job) {
      res.status(404).json({ success: false, message: "导出任务不存在" });
      return;
    }
    res.json(success(rowToCamelCase(job)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取任务状态失败", error: error.message });
  }
}

/** 创建分享链接 */
export async function createShare(req: any, res: Response) {
  try {
    const { formulaId, versionId, shareType, password, expireDate, allowedEmails, downloadLimit } = req.body;
    const userId = req.user.userId;
    const id = generateId();
    const shareUrl = `/share/${id}`;

    await query(
      `INSERT INTO share_configs (share_id, formula_id, version_id, share_type, share_url, password, expire_date, allowed_emails_json, download_limit, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        formulaId,
        versionId,
        shareType || "link",
        shareUrl,
        password,
        expireDate,
        JSON.stringify(allowedEmails || []),
        downloadLimit,
        userId,
        now(),
      ],
    );

    res.status(201).json(success({ shareId: id, shareUrl }, "分享链接创建成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "创建分享失败", error: error.message });
  }
}

/** 获取分享配置 */
export async function getShare(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const [[share]]: any[][] = await query("SELECT * FROM share_configs WHERE share_id = ?", [shareId]);
    if (!share) {
      res.status(404).json({ success: false, message: "分享不存在" });
      return;
    }

    // 检查过期
    if (share.expire_date && new Date(share.expire_date) < new Date()) {
      res.status(410).json({ success: false, message: "分享链接已过期" });
      return;
    }

    // 检查下载次数
    if (share.download_limit && share.download_count >= share.download_limit) {
      res.status(410).json({ success: false, message: "下载次数已达上限" });
      return;
    }

    // 更新下载计数
    await query("UPDATE share_configs SET download_count = download_count + 1 WHERE share_id = ?", [shareId]);

    // 获取配方数据
    const [[formula]]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [share.formula_id]);

    res.json(
      success({
        ...rowToCamelCase(share),
        allowedEmails: safeJsonParse(share.allowed_emails_json, []),
        formula: formula ? rowToCamelCase(formula) : null,
      }),
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取分享失败", error: error.message });
  }
}

/** API数据接口管理 */
export async function createApiInterface(req: any, res: Response) {
  try {
    const {
      name,
      description,
      endpoint,
      method,
      authentication,
      authConfig,
      dataFormat,
      fieldMapping,
      rateLimit,
      retryConfig,
    } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    await query(
      `INSERT INTO api_data_interfaces (interface_id, name, description, endpoint, method, authentication, auth_config_json, data_format, field_mapping_json, rate_limit_json, retry_config_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description,
        endpoint,
        method,
        authentication,
        JSON.stringify(authConfig || {}),
        dataFormat || "json",
        JSON.stringify(fieldMapping || []),
        JSON.stringify(rateLimit || {}),
        JSON.stringify(retryConfig || {}),
        userId,
        now(),
      ],
    );

    res.status(201).json(success({ interfaceId: id }, "API接口创建成功"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({ success: false, message: "接口地址已存在" });
      return;
    }
    res.status(500).json({ success: false, message: "创建API接口失败", error: error.message });
  }
}

/** 获取API接口列表 */
export async function getApiInterfaces(req: Request, res: Response) {
  try {
    const { page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));

    const [interfaces]: any[] = await query(
      "SELECT * FROM api_data_interfaces ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [size, offset],
    );
    const [countResult]: any[] = await query("SELECT COUNT(*) as total FROM api_data_interfaces");

    const result = interfaces.map((i: any) => ({
      ...rowToCamelCase(i),
      authConfig: safeJsonParse(i.auth_config_json, {}),
      fieldMapping: safeJsonParse(i.field_mapping_json, []),
      rateLimit: safeJsonParse(i.rate_limit_json, {}),
      retryConfig: safeJsonParse(i.retry_config_json, {}),
    }));
    res.json(successWithPagination(result, countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取API接口列表失败", error: error.message });
  }
}

/** 下载导出文件 */
export async function downloadExportFile(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const [[job]]: any[][] = await query("SELECT * FROM export_jobs WHERE job_id = ? AND status = ?", [
      jobId,
      "completed",
    ]);
    if (!job) {
      res.status(404).json({ success: false, message: "导出文件不存在或任务未完成" });
      return;
    }

    const ext = job.export_type === "pdf" ? "pdf" : "xlsx";
    const filePath = path.join(getExportDir(), `${jobId}.${ext}`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: "导出文件已过期或不存在" });
      return;
    }

    const fileName = job.file_name || `配方导出.${ext}`;
    const contentType =
      ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", buildContentDisposition(fileName));
    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "下载失败", error: error.message });
  }
}

/** 重试导出任务 */
export async function retryExportJob(req: any, res: Response) {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId;
    const [[job]]: any[][] = await query("SELECT * FROM export_jobs WHERE job_id = ? AND created_by = ?", [
      jobId,
      userId,
    ]);
    if (!job) {
      res.status(404).json({ success: false, message: "任务不存在" });
      return;
    }
    if (job.status !== "failed") {
      res.status(400).json({ success: false, message: "只能重试失败的任务" });
      return;
    }

    // 重置为 processing 并重新执行
    await query(
      "UPDATE export_jobs SET status = 'processing', error_message = NULL, completed_at = NULL WHERE job_id = ?",
      [jobId],
    );

    try {
      let buffer: Buffer;
      let fileName: string;
      const ext = job.export_type === "pdf" ? "pdf" : "xlsx";

      if (job.export_type === "pdf") {
        const result = await exportFormulaToPdf(job.formula_id, job.version_id);
        buffer = result.buffer;
        fileName = result.fileName;
      } else {
        const result = await exportFormulaToExcel(job.formula_id, job.version_id);
        buffer = result.buffer;
        fileName = result.fileName;
      }

      const filePath = path.join(getExportDir(), `${jobId}.${ext}`);
      fs.writeFileSync(filePath, buffer);
      await query(
        "UPDATE export_jobs SET status = ?, file_name = ?, progress = 100, completed_at = ? WHERE job_id = ?",
        ["completed", fileName, now(), jobId],
      );
      res.json(success({ jobId, status: "completed", fileName }, "重试成功"));
    } catch (exportError: any) {
      await query("UPDATE export_jobs SET status = ?, error_message = ? WHERE job_id = ?", [
        "failed",
        exportError.message,
        jobId,
      ]);
      res.status(500).json({ success: false, message: "重试失败", error: exportError.message });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: "重试失败", error: error.message });
  }
}

/** 获取分享列表 */
export async function getShares(req: any, res: Response) {
  try {
    const userId = req.user.userId;
    const [shares]: any[] = await query(
      "SELECT sc.*, f.name as formula_name FROM share_configs sc LEFT JOIN formulas f ON sc.formula_id = f.id WHERE sc.created_by = ? ORDER BY sc.created_at DESC",
      [userId],
    );
    const result = shares.map((s: any) => ({
      ...rowToCamelCase(s),
      allowedEmails: safeJsonParse(s.allowed_emails_json, []),
    }));
    res.json(success(result));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取分享列表失败", error: error.message });
  }
}

/** 删除/使失效分享链接 */
export async function deleteShare(req: any, res: Response) {
  try {
    const { shareId } = req.params;
    await query("DELETE FROM share_configs WHERE share_id = ?", [shareId]);
    res.json(success(null, "分享已删除"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "删除分享失败", error: error.message });
  }
}

/** 更新导出模板 */
export async function updateExportTemplate(req: any, res: Response) {
  try {
    const { templateId } = req.params;
    const { name, description, type, formatConfig, isDefault } = req.body;

    if (isDefault) {
      await query("UPDATE export_templates SET is_default = 0 WHERE type = ?", [type]);
    }

    await query(
      `UPDATE export_templates SET name = ?, description = ?, type = ?, format_config_json = ?, is_default = ? WHERE template_id = ?`,
      [name, description, type, JSON.stringify(formatConfig), isDefault ? 1 : 0, templateId],
    );
    res.json(success(null, "模板更新成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新模板失败", error: error.message });
  }
}

/** 删除导出模板 */
export async function deleteExportTemplate(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    await query("DELETE FROM export_templates WHERE template_id = ?", [templateId]);
    res.json(success(null, "模板已删除"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "删除模板失败", error: error.message });
  }
}
