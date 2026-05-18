import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getDb } from "../config/database-better-sqlite3.js";
import { generateId, success, successWithPagination } from "../utils/helpers.js";
import { parseResultCleanupService } from "../services/parseResultCleanupService.js";
import { parseResultMonitoringService } from "../services/parseResultMonitoringService.js";

const SMART_TOOL_CALL_TYPES = ["parse_formula", "parse_nutrition"];

export async function getParseResults(req: Request, res: Response) {
  try {
    const db = getDb();
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const userId = (req as AuthRequest).user?.userId;

    const callType = req.query.callType as string | undefined;
    const status = req.query.status as string | undefined;
    const fileName = req.query.fileName as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const keyword = req.query.keyword as string | undefined;
    const modelProvider = req.query.modelProvider as string | undefined;
    const modelName = req.query.modelName as string | undefined;
    const isLinked = req.query.isLinked as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    let whereClause = "WHERE user_id = ?";
    const params: any[] = [userId];

    if (callType && SMART_TOOL_CALL_TYPES.includes(callType)) {
      whereClause += " AND call_type = ?";
      params.push(callType);
    }

    if (status && ["success", "failed", "pending"].includes(status)) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    if (fileName) {
      whereClause += " AND file_name LIKE ?";
      params.push(`%${fileName}%`);
    }

    if (startDate) {
      whereClause += " AND created_at >= ?";
      params.push(startDate);
    }

    if (endDate) {
      whereClause += " AND created_at <= ?";
      params.push(endDate);
    }

    if (keyword) {
      whereClause += " AND (file_name LIKE ? OR parsed_result LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (modelProvider) {
      whereClause += " AND model_provider = ?";
      params.push(modelProvider);
    }

    if (modelName) {
      whereClause += " AND model_name LIKE ?";
      params.push(`%${modelName}%`);
    }

    if (isLinked === 'true') {
      whereClause += " AND is_linked = 1";
    } else if (isLinked === 'false') {
      whereClause += " AND is_linked = 0";
    }

    const validSortColumns = ['created_at', 'updated_at', 'file_name', 'file_size', 'used_count'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const totalResult = db.prepare(
      `SELECT COUNT(*) as total FROM parse_results ${whereClause}`,
    ).get(...params) as any;

    const logs = db.prepare(
      `SELECT id, call_type, file_hash, file_name, file_size, status, model_provider, model_name, used_count, is_linked, linked_formula_id, linked_material_id, created_at, expires_at
       FROM parse_results ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT ? OFFSET ?`,
    ).all(...params, pageSize, offset) as any[];

    const items = logs.map((log) => {
      return {
        id: log.id,
        callType: log.call_type,
        callTypeLabel: log.call_type === 'parse_formula' ? '智能填单' : '智能导入',
        fileName: log.file_name,
        fileHash: log.file_hash,
        fileSize: log.file_size,
        status: log.status,
        modelProvider: log.model_provider,
        modelName: log.model_name,
        usedCount: log.used_count,
        isLinked: log.is_linked === 1,
        linkedFormulaId: log.linked_formula_id,
        linkedMaterialId: log.linked_material_id,
        createdAt: log.created_at,
        expiresAt: log.expires_at,
      };
    });

    res.json(successWithPagination(items, totalResult.total, page, pageSize));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResults:", error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取解析历史失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getParseResultById(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;

    const log = db.prepare(
      `SELECT * FROM parse_results WHERE id = ? AND user_id = ?`,
    ).get(id, userId) as any;

    if (!log) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PARSE_RESULT_NOT_FOUND',
          message: '解析结果不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = {
      id: log.id,
      callType: log.call_type,
      callTypeLabel: log.call_type === 'parse_formula' ? '智能填单' : '智能导入',
      fileName: log.file_name,
      fileHash: log.file_hash,
      fileSize: log.file_size,
      parsedResult: JSON.parse(log.parsed_result),
      rawResponse: log.raw_response,
      status: log.status,
      errorMessage: log.error_message,
      modelProvider: log.model_provider,
      modelName: log.model_name,
      usedCount: log.used_count,
      isLinked: log.is_linked === 1,
      linkedFormulaId: log.linked_formula_id,
      linkedMaterialId: log.linked_material_id,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    };

    res.json(success(result));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResultById:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取解析结果详情失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function saveParseResult(req: Request, res: Response) {
  try {
    const db = getDb();
    const userId = (req as AuthRequest).user?.userId;
    const { callType, fileHash, fileName, fileSize, parsedResult, rawResponse, modelProvider, modelName, status, errorMessage } = req.body;

    if (!callType || !fileHash || !fileName || !fileSize || !parsedResult || !rawResponse) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填参数',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!SMART_TOOL_CALL_TYPES.includes(callType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的解析类型',
          timestamp: new Date().toISOString()
        }
      });
    }

    const config = db.prepare("SELECT config_value FROM parse_result_configs WHERE config_key = 'storage_limit'").get() as any;
    const storageLimit = config ? JSON.parse(config.config_value) : 5000;

    const currentCount = (db.prepare("SELECT COUNT(*) as count FROM parse_results WHERE user_id = ?").get(userId) as any).count;

    if (currentCount >= storageLimit) {
      return res.status(507).json({
        success: false,
        error: {
          code: 'PARSE_RESULT_STORAGE_LIMIT',
          message: '存储空间不足，请清理历史记录',
          timestamp: new Date().toISOString()
        }
      });
    }

    const id = generateId();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO parse_results (id, user_id, call_type, file_hash, file_name, file_size, parsed_result, raw_response, model_provider, model_name, status, error_message, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      callType,
      fileHash,
      fileName,
      fileSize,
      JSON.stringify(parsedResult),
      rawResponse,
      modelProvider || null,
      modelName || null,
      status || 'success',
      errorMessage || null,
      expiresAt,
      now,
      now
    );

    res.json(success({ id, message: '解析结果保存成功' }));
  } catch (error: any) {
    console.error("[ParseResult] Error in saveParseResult:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '保存解析结果失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function deleteParseResult(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    const log = db.prepare("SELECT * FROM parse_results WHERE id = ?").get(id) as any;

    if (!log) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PARSE_RESULT_NOT_FOUND',
          message: '解析结果不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (log.user_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PARSE_RESULT_ACCESS_DENIED',
          message: '无权删除该解析结果',
          timestamp: new Date().toISOString()
        }
      });
    }

    db.prepare("DELETE FROM parse_results WHERE id = ?").run(id);

    console.log(`[ParseResult] Deleted: id=${id}, operator=${userId}`);

    res.json(success({ message: '删除成功' }));
  } catch (error: any) {
    console.error("[ParseResult] Error in deleteParseResult:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '删除解析结果失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getParseResultStatistics(req: Request, res: Response) {
  try {
    const db = getDb();
    const userId = (req as AuthRequest).user?.userId;

    const totalResult = db.prepare(
      "SELECT COUNT(*) as count FROM parse_results WHERE user_id = ?"
    ).get(userId) as any;

    const statsByType = db.prepare(`
      SELECT call_type, COUNT(*) as count 
      FROM parse_results 
      WHERE user_id = ? 
      GROUP BY call_type
    `).all(userId) as any[];

    const statsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM parse_results 
      WHERE user_id = ? 
      GROUP BY status
    `).all(userId) as any[];

    const configStmt = db.prepare("SELECT config_key, config_value FROM parse_result_configs");
    const configs = configStmt.all() as any[];
    
    const configMap: Record<string, any> = {};
    for (const config of configs) {
      configMap[config.config_key] = JSON.parse(config.config_value);
    }

    const storageLimit = configMap.storage_limit || 5000;
    const cleanupThreshold = configMap.cleanup_threshold_percent || 95;
    const cleanupBatchPercent = configMap.cleanup_batch_percent || 5;

    const statsByTypeMap: Record<string, number> = {};
    for (const stat of statsByType) {
      statsByTypeMap[stat.call_type] = stat.count;
    }

    const statsByStatusMap: Record<string, number> = {};
    for (const stat of statsByStatus) {
      statsByStatusMap[stat.status] = stat.count;
    }

    res.json(success({
      totalCount: totalResult.count,
      storageLimit,
      usagePercent: Math.round((totalResult.count / storageLimit) * 100),
      cleanupThreshold,
      cleanupBatchPercent,
      statsByType: statsByTypeMap,
      statsByStatus: statsByStatusMap,
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResultStatistics:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取统计数据失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function checkParseResult(req: Request, res: Response) {
  try {
    const db = getDb();
    const userId = (req as AuthRequest).user?.userId;
    const { fileHash, callType } = req.body;

    if (!fileHash || !callType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填参数',
          timestamp: new Date().toISOString()
        }
      });
    }

    const existing = db.prepare(`
      SELECT id, status FROM parse_results 
      WHERE user_id = ? AND file_hash = ? AND call_type = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId, fileHash, callType) as any;

    if (existing) {
      res.json(success({
        exists: true,
        parseResultId: existing.id,
        status: existing.status,
      }));
    } else {
      res.json(success({
        exists: false,
      }));
    }
  } catch (error: any) {
    console.error("[ParseResult] Error in checkParseResult:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '检查解析结果失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function markParseResultUsed(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const { linkedFormulaId, linkedMaterialId, incrementCount } = req.body;

    const log = db.prepare("SELECT * FROM parse_results WHERE id = ? AND user_id = ?").get(id, userId) as any;

    if (!log) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PARSE_RESULT_NOT_FOUND',
          message: '解析结果不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    const updates: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (linkedFormulaId) {
      updates.push('linked_formula_id = ?');
      values.push(linkedFormulaId);
    }

    if (linkedMaterialId) {
      updates.push('linked_material_id = ?');
      values.push(linkedMaterialId);
    }

    if (incrementCount) {
      updates.push('used_count = used_count + 1');
    }

    updates.push('is_linked = 1');
    values.push(id);

    db.prepare(`UPDATE parse_results SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    res.json(success({ message: '标记成功' }));
  } catch (error: any) {
    console.error("[ParseResult] Error in markParseResultUsed:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_LINK_FAILED',
        message: '标记解析结果失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getParseResultConfig(req: Request, res: Response) {
  try {
    const db = getDb();
    const configs = db.prepare("SELECT config_key, config_value, description, updated_at FROM parse_result_configs").all() as any[];

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.config_key] = {
        value: JSON.parse(config.config_value),
        description: config.description,
        updatedAt: config.updated_at,
      };
    }

    res.json(success(result));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResultConfig:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取配置失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function updateParseResultConfig(req: Request, res: Response) {
  try {
    const db = getDb();
    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权修改配置',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { storageLimit, cleanupThresholdPercent, cleanupBatchPercent, maxFileSizeBytes } = req.body;
    const now = new Date().toISOString();

    const updates: Array<{ key: string; value: any }> = [];
    const values: any[] = [];

    if (storageLimit !== undefined) {
      if (typeof storageLimit !== 'number' || storageLimit < 1000 || storageLimit > 100000) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '存储上限应在 1000-100000 之间',
            timestamp: now
          }
        });
      }
      updates.push({ key: 'storage_limit', value: storageLimit });
    }

    if (cleanupThresholdPercent !== undefined) {
      if (typeof cleanupThresholdPercent !== 'number' || cleanupThresholdPercent < 50 || cleanupThresholdPercent > 99) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '清理阈值应在 50%-99% 之间',
            timestamp: now
          }
        });
      }
      updates.push({ key: 'cleanup_threshold_percent', value: cleanupThresholdPercent });
    }

    if (cleanupBatchPercent !== undefined) {
      if (typeof cleanupBatchPercent !== 'number' || cleanupBatchPercent < 1 || cleanupBatchPercent > 20) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '清理比例应在 1%-20% 之间',
            timestamp: now
          }
        });
      }
      updates.push({ key: 'cleanup_batch_percent', value: cleanupBatchPercent });
    }

    if (maxFileSizeBytes !== undefined) {
      if (typeof maxFileSizeBytes !== 'number' || maxFileSizeBytes < 1048576 || maxFileSizeBytes > 52428800) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '文件大小限制应在 1MB-50MB 之间',
            timestamp: now
          }
        });
      }
      updates.push({ key: 'max_file_size_bytes', value: maxFileSizeBytes });
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '没有需要更新的配置',
          timestamp: now
        }
      });
    }

    for (const update of updates) {
      db.prepare(`
        UPDATE parse_result_configs 
        SET config_value = ?, updated_at = ? 
        WHERE config_key = ?
      `).run(JSON.stringify(update.value), now, update.key);
    }

    console.log(`[ParseResult] Config updated by admin:`, updates);

    res.json(success({ message: '配置更新成功' }));
  } catch (error: any) {
    console.error("[ParseResult] Error in updateParseResultConfig:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '更新配置失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function cleanupParseResults(req: Request, res: Response) {
  try {
    const db = getDb();
    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权执行清理操作',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { beforeDate, status, dryRun } = req.body;

    let whereClause = "WHERE is_linked = 0 AND used_count = 0";
    const params: any[] = [];

    if (beforeDate) {
      whereClause += " AND created_at <= ?";
      params.push(beforeDate);
    }

    if (status) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    const toDelete = db.prepare(`
      SELECT id, file_name, created_at FROM parse_results ${whereClause}
      ORDER BY created_at ASC, used_count ASC
    `).all(...params) as any[];

    if (dryRun) {
      return res.json(success({
        wouldDelete: toDelete.length,
        records: toDelete.slice(0, 10),
        message: '预览模式，未执行实际删除'
      }));
    }

    if (toDelete.length === 0) {
      return res.json(success({
        deletedCount: 0,
        message: '没有需要清理的记录'
      }));
    }

    const ids = toDelete.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    
    db.prepare(`DELETE FROM parse_results WHERE id IN (${placeholders})`).run(...ids);

    console.log(`[ParseResult] Cleanup: deleted ${ids.length} records by admin`);

    res.json(success({
      deletedCount: ids.length,
      freedSpace: ids.length * 10240,
      message: `成功清理 ${ids.length} 条记录`
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in cleanupParseResults:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_CLEANUP_FAILED',
        message: '清理解析结果失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getParseResultDegradation(req: Request, res: Response) {
  try {
    const degradationInfo = await parseResultCleanupService.getDegradationInfo();
    const systemStatus = await parseResultCleanupService.getSystemStatus();
    const lastCleanupResult = parseResultCleanupService.getLastCleanupResult();

    res.json(success({
      level: degradationInfo.level,
      reason: degradationInfo.reason,
      recommendations: degradationInfo.recommendations,
      systemStatus: {
        totalCount: systemStatus.totalCount,
        storageLimit: systemStatus.storageLimit,
        usagePercent: systemStatus.usagePercent,
        cleanupThreshold: systemStatus.cleanupThreshold,
        isOverThreshold: systemStatus.isOverThreshold,
      },
      lastCleanup: lastCleanupResult,
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResultDegradation:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取降级状态失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getLinkedFormula(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    const parseResult = db.prepare(`
      SELECT linked_formula_id, linked_material_id 
      FROM parse_results 
      WHERE id = ? AND (user_id = ? OR ? = 1)
    `).get(id, userId, isAdmin ? 1 : 0) as any;

    if (!parseResult) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '解析结果不存在或无权访问',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!parseResult.linked_formula_id) {
      return res.json(success({
        linked: false,
        type: null,
        data: null
      }));
    }

    const formula = db.prepare(`
      SELECT id, name, code, salesman_name, status, created_at, updated_at
      FROM formulas 
      WHERE id = ?
    `).get(parseResult.linked_formula_id);

    if (!formula) {
      return res.json(success({
        linked: false,
        type: 'formula',
        data: null,
        message: '关联的配方已被删除'
      }));
    }

    res.json(success({
      linked: true,
      type: 'formula',
      data: formula
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in getLinkedFormula:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取关联配方失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getLinkedMaterial(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.userId;
    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    const parseResult = db.prepare(`
      SELECT linked_formula_id, linked_material_id 
      FROM parse_results 
      WHERE id = ? AND (user_id = ? OR ? = 1)
    `).get(id, userId, isAdmin ? 1 : 0) as any;

    if (!parseResult) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '解析结果不存在或无权访问',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!parseResult.linked_material_id) {
      return res.json(success({
        linked: false,
        type: null,
        data: null
      }));
    }

    const material = db.prepare(`
      SELECT id, name, category, specification, unit, status, created_at, updated_at
      FROM materials 
      WHERE id = ?
    `).get(parseResult.linked_material_id);

    if (!material) {
      return res.json(success({
        linked: false,
        type: 'material',
        data: null,
        message: '关联的原料已被删除'
      }));
    }

    res.json(success({
      linked: true,
      type: 'material',
      data: material
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in getLinkedMaterial:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取关联原料失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getFormulaParseResults(req: Request, res: Response) {
  try {
    const db = getDb();
    const { formulaId } = req.params;

    const parseResults = db.prepare(`
      SELECT id, call_type, file_name, file_size, status, error_message, created_at, expires_at
      FROM parse_results 
      WHERE linked_formula_id = ?
      ORDER BY created_at DESC
    `).all(formulaId);

    res.json(success({
      formulaId,
      parseResults
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in getFormulaParseResults:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取配方关联的解析结果失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getMaterialParseResults(req: Request, res: Response) {
  try {
    const db = getDb();
    const { materialId } = req.params;

    const parseResults = db.prepare(`
      SELECT id, call_type, file_name, file_size, status, error_message, created_at, expires_at
      FROM parse_results 
      WHERE linked_material_id = ?
      ORDER BY created_at DESC
    `).all(materialId);

    res.json(success({
      materialId,
      parseResults
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in getMaterialParseResults:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_DB_ERROR',
        message: '获取原料关联的解析结果失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function triggerManualCleanup(req: Request, res: Response) {
  try {
    const db = getDb();
    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权执行清理操作',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { dryRun } = req.body;
    const result = await parseResultCleanupService.performCleanup(dryRun);

    res.json(success({
      deletedCount: result.deletedCount,
      triggerReason: result.triggerReason,
      degradationLevel: result.degradationLevel,
      message: dryRun ? 'Dry Run 模式，未执行实际删除' : `成功清理 ${result.deletedCount} 条记录`
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in triggerManualCleanup:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_CLEANUP_FAILED',
        message: '手动清理失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getParseResultMetrics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const metrics = await parseResultMonitoringService.getMetrics(
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json(success(metrics));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResultMetrics:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_MONITORING_ERROR',
        message: '获取监控指标失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getParseResultAlerts(req: Request, res: Response) {
  try {
    const isAdmin = (req as AuthRequest).user?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权查看告警',
          timestamp: new Date().toISOString()
        }
      });
    }

    const alerts = await parseResultMonitoringService.checkAlerts();

    res.json(success({
      total: alerts.length,
      alerts
    }));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResultAlerts:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_MONITORING_ERROR',
        message: '获取告警失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}

export async function getParseResultPerformance(req: Request, res: Response) {
  try {
    const stats = await parseResultMonitoringService.getPerformanceStats();

    res.json(success(stats));
  } catch (error: any) {
    console.error("[ParseResult] Error in getParseResultPerformance:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARSE_RESULT_MONITORING_ERROR',
        message: '获取性能统计失败',
        timestamp: new Date().toISOString()
      }
    });
  }
}
