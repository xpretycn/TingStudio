import { Request, Response } from "express";
import path from "path";

import * as exportService from "../services/exportService.js";
import { fail, success, successWithPagination, buildContentDisposition } from "../utils/helpers.js";

export async function getExportTemplates(req: Request, res: Response) {
  try {
    const type = req.query.type as string | undefined;
    const category = req.query.category as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const result = await exportService.getTemplates({ type, category, page, pageSize });
    res.json(successWithPagination(result.list, result.total, result.page, result.pageSize));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function createExportTemplate(req: Request, res: Response) {
  try {
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId;
    const result = await exportService.createTemplate(req.body as Record<string, unknown>, userId ?? "");
    res.status(201).json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function updateExportTemplate(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    await exportService.updateTemplate(templateId, req.body as Record<string, unknown>);
    res.json(success(null));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function deleteExportTemplate(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    await exportService.deleteTemplate(templateId);
    res.json(success(null));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function createExportJob(req: Request, res: Response) {
  try {
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId;
    const result = await exportService.createJob(
      req.body as exportService.CreateJobInput,
      userId ?? "",
    );
    if (result.status === "failed" && result.errorMessage === "配方不存在") {
      res.status(404).json(fail("配方不存在", "NOT_FOUND"));
      return;
    }
    res.status(201).json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getExportJobs(req: Request, res: Response) {
  try {
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId ?? "";
    const role = (req as { user?: { userId: string; role: string } }).user?.role ?? "";

    const result = await exportService.getJobs(
      {
        status: req.query.status as string | undefined,
        salesmanId: req.query.salesmanId as string | undefined,
        creatorId: req.query.creatorId as string | undefined,
        dateRangeStart: req.query.dateRangeStart as string | undefined,
        dateRangeEnd: req.query.dateRangeEnd as string | undefined,
        keyword: req.query.keyword as string | undefined,
        dataCategory: req.query.dataCategory as string | undefined,
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.pageSize) || 20,
      },
      userId,
      role,
    );

    res.json(successWithPagination(result.list, result.total, result.page, result.pageSize));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getExportJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const job = await exportService.getJob(jobId);
    if (!job) {
      res.status(404).json(fail("导出任务不存在", "NOT_FOUND"));
      return;
    }
    res.json(success(job));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function downloadExportFile(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const { filePath, fileName, contentType } = await exportService.downloadFile(jobId);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", buildContentDisposition(fileName));
    res.sendFile(path.resolve(filePath));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "操作失败";
    if (msg.includes("不存在")) {
      res.status(404).json(fail(msg, "NOT_FOUND"));
      return;
    }
    res.status(500).json(fail("操作失败"));
  }
}

export async function retryExportJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId ?? "";
    const result = await exportService.retryJob(jobId, userId);
    if (result.status === "failed" && result.errorMessage) {
      if (result.errorMessage === "任务不存在") {
        res.status(404).json(fail(result.errorMessage, "NOT_FOUND"));
        return;
      }
      if (result.errorMessage === "只能重试失败的任务") {
        res.status(400).json(fail(result.errorMessage, "VALIDATION_ERROR"));
        return;
      }
      res.status(500).json(fail("操作失败"));
      return;
    }
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function reExportJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId ?? "";
    const result = await exportService.reExportJob(jobId, userId);
    if (result.status === "failed" && result.errorMessage) {
      if (result.errorMessage === "任务不存在") {
        res.status(404).json(fail(result.errorMessage, "NOT_FOUND"));
        return;
      }
      if (result.errorMessage === "只能重新导出已完成或失败的任务") {
        res.status(400).json(fail(result.errorMessage, "VALIDATION_ERROR"));
        return;
      }
      res.status(500).json(fail("操作失败"));
      return;
    }
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function createShare(req: Request, res: Response) {
  try {
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId ?? "";
    const result = await exportService.createShare(req.body as Record<string, unknown>, userId);
    res.status(201).json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getShare(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const result = await exportService.getPublicShare(shareId);
    res.json(success(result));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "操作失败";
    if (msg === "分享不存在") {
      res.status(404).json(fail(msg, "NOT_FOUND"));
      return;
    }
    if (msg === "分享链接已过期" || msg === "下载次数已达上限") {
      res.status(410).json(fail(msg, "GONE"));
      return;
    }
    res.status(500).json(fail("操作失败"));
  }
}

export async function getShares(req: Request, res: Response) {
  try {
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId ?? "";
    const role = (req as { user?: { userId: string; role: string } }).user?.role ?? "";
    const result = await exportService.getShares(userId, role);
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function deleteShare(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    await exportService.deleteShare(shareId);
    res.json(success(null));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getExportStatistics(req: Request, res: Response) {
  try {
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId ?? "";
    const role = (req as { user?: { userId: string; role: string } }).user?.role ?? "";
    const result = await exportService.getStatistics(userId, role);
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getExportConfig(req: Request, res: Response) {
  try {
    const role = (req as { user?: { userId: string; role: string } }).user?.role ?? "";
    if (role !== "admin") {
      res.json(
        success([
          { configKey: "default_export_format", configValue: "excel", configType: "string", description: "默认导出格式", updatedBy: "", updatedAt: "" },
          { configKey: "export_rate_limit", configValue: "10", configType: "number", description: "每小时最大导出次数", updatedBy: "", updatedAt: "" },
          { configKey: "file_naming_pattern", configValue: "{type}_{category}_{date}", configType: "string", description: "文件命名模式", updatedBy: "", updatedAt: "" },
          { configKey: "auto_delete_days", configValue: "30", configType: "number", description: "导出文件自动删除天数", updatedBy: "", updatedAt: "" },
        ]),
      );
      return;
    }
    const result = await exportService.getConfig();
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function updateExportConfig(req: Request, res: Response) {
  try {
    const role = (req as { user?: { userId: string; role: string } }).user?.role ?? "";
    if (role !== "admin") {
      res.json(success({ updatedCount: 0 }));
      return;
    }
    const userId = (req as { user?: { userId: string; role: string } }).user?.userId ?? "";
    const configs = req.body.configs as Array<{ configKey: string; configValue: string }>;
    const result = await exportService.updateConfig(configs, userId);
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getExportMaterials(req: Request, res: Response) {
  try {
    const keyword = req.query.keyword as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await exportService.getMaterialsForExport(keyword, page, pageSize);
    res.json(successWithPagination(result.list, result.total, result.page, result.pageSize));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getExportReports(req: Request, res: Response) {
  try {
    const type = req.query.type as string;
    const periodStart = req.query.periodStart as string | undefined;
    const periodEnd = req.query.periodEnd as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await exportService.getReportsForExport(type, periodStart, periodEnd, page, pageSize);
    res.json(successWithPagination(result.list, result.total, result.page, result.pageSize));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getPublicShare(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const result = await exportService.getPublicShare(shareId);
    res.json(success(result));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "操作失败";
    if (msg === "分享不存在") {
      res.status(404).json(fail(msg, "NOT_FOUND"));
      return;
    }
    if (msg === "分享链接已过期" || msg === "下载次数已达上限") {
      res.status(410).json(fail(msg, "GONE"));
      return;
    }
    res.status(500).json(fail("操作失败"));
  }
}
