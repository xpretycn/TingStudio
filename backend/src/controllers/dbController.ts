import { Request, Response } from "express";
import * as dbService from "../services/dbService.js";
import { success } from "../utils/helpers.js";

export async function getDbInfo(req: Request, res: Response) {
  try {
    const data = await dbService.getDbInfo();
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error getting db info:", error);
    res.status(500).json({
      success: false,
      message: "获取数据库信息失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function getTableList(req: Request, res: Response) {
  try {
    const data = await dbService.getTableList();
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error getting table list:", error);
    res.status(500).json({
      success: false,
      message: "获取表列表失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function getTableSchema(req: Request, res: Response) {
  try {
    const { tableName } = req.params;
    if (!tableName) {
      res.status(400).json({
        success: false,
        message: "缺少表名参数",
        error: { message: "Table name is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const data = await dbService.getTableSchema(tableName);
    if (!data) {
      res.status(404).json({
        success: false,
        message: `表 ${tableName} 不存在`,
        error: { message: `Table ${tableName} not found`, code: "NOT_FOUND" },
      });
      return;
    }
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error getting table schema:", error);
    res.status(500).json({
      success: false,
      message: "获取表结构失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function getTableData(req: Request, res: Response) {
  try {
    const { tableName } = req.params;
    if (!tableName) {
      res.status(400).json({
        success: false,
        message: "缺少表名参数",
        error: { message: "Table name is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const search = req.query.search as string | undefined;
    const sort = req.query.sort as string | undefined;
    const order = req.query.order as string | undefined;
    const data = await dbService.getTableData(tableName, { page, pageSize, search, sort, order });
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error getting table data:", error);
    res.status(500).json({
      success: false,
      message: "获取表数据失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function getBackupList(req: Request, res: Response) {
  try {
    const data = await dbService.getBackupList();
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error getting backup list:", error);
    res.status(500).json({
      success: false,
      message: "获取备份列表失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function createBackup(req: Request, res: Response) {
  try {
    const data = await dbService.createBackup();
    res.status(201).json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error creating backup:", error);
    res.status(500).json({
      success: false,
      message: "创建备份失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function downloadBackup(req: Request, res: Response) {
  try {
    const { fileName } = req.params;
    if (!fileName) {
      res.status(400).json({
        success: false,
        message: "缺少文件名参数",
        error: { message: "File name is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const fileData = await dbService.readBackupFile(fileName);
    if (!fileData) {
      res.status(404).json({
        success: false,
        message: `备份文件 ${fileName} 不存在`,
        error: { message: `Backup file ${fileName} not found`, code: "NOT_FOUND" },
      });
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(fileData);
  } catch (error: unknown) {
    console.error("[DbController] Error downloading backup:", error);
    res.status(500).json({
      success: false,
      message: "下载备份失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function restoreBackup(req: Request, res: Response) {
  try {
    const { fileName } = req.params;
    if (!fileName) {
      res.status(400).json({
        success: false,
        message: "缺少文件名参数",
        error: { message: "File name is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const data = await dbService.restoreBackup(fileName);
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error restoring backup:", error);
    res.status(500).json({
      success: false,
      message: "恢复备份失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function deleteBackup(req: Request, res: Response) {
  try {
    const { fileName } = req.params;
    if (!fileName) {
      res.status(400).json({
        success: false,
        message: "缺少文件名参数",
        error: { message: "File name is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const data = await dbService.deleteBackup(fileName);
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error deleting backup:", error);
    res.status(500).json({
      success: false,
      message: "删除备份失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function uploadAndRestore(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "缺少备份文件",
        error: { message: "Backup file is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const data = await dbService.uploadAndRestore(req.file);
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error uploading and restoring backup:", error);
    res.status(500).json({
      success: false,
      message: "上传并恢复备份失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function getScriptList(req: Request, res: Response) {
  try {
    const data = await dbService.getScriptList();
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error getting script list:", error);
    res.status(500).json({
      success: false,
      message: "获取脚本列表失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function executeScript(req: Request, res: Response) {
  try {
    const { scriptId } = req.params;
    if (!scriptId) {
      res.status(400).json({
        success: false,
        message: "缺少脚本ID参数",
        error: { message: "Script ID is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const authReq = req as Request & { user?: { userId: string } };
    const triggeredBy = authReq.user?.userId || "unknown";
    const data = await dbService.executeScript(scriptId, triggeredBy);
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error executing script:", error);
    res.status(500).json({
      success: false,
      message: "执行脚本失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}

export async function getScriptHistory(req: Request, res: Response) {
  try {
    const { scriptId } = req.params;
    if (!scriptId) {
      res.status(400).json({
        success: false,
        message: "缺少脚本ID参数",
        error: { message: "Script ID is required", code: "VALIDATION_ERROR" },
      });
      return;
    }
    const rawLimit = Number(req.query.limit) || 10;
    const limit = Math.min(Math.max(1, rawLimit), 50);
    const data = await dbService.getScriptHistory(scriptId, limit);
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[DbController] Error getting script history:", error);
    res.status(500).json({
      success: false,
      message: "获取脚本执行历史失败",
      error: { message: (error as Error).message, code: "INTERNAL_ERROR" },
    });
  }
}
