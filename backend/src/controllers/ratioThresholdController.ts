import { AuthRequest } from "../middleware/auth.js";
import { Response } from "express";
import { query, execute } from '../config/database-adapter.js';
import { success, now as getNow, generateId } from "../utils/helpers.js";
import { setCachedThresholds } from "../services/ratioFactorValidator.js";

export async function getRatioThresholds(req: AuthRequest, res: Response) {
  try {
    
    const row = (await query(`
      SELECT id, normal_low, normal_high, warning_low, warning_high,
             high_warning_low, high_warning_high, updated_at, updated_by
      FROM ratio_threshold_configs LIMIT 1
    `, [])).rows[0] as any;

    if (!row) {
      res.json(success({
        normalLow: 0.98,
        normalHigh: 1.02,
        warningLow: 0.95,
        warningHigh: 1.05,
        highWarningLow: 0.92,
        highWarningHigh: 1.08,
        updatedAt: null,
        updatedBy: null,
      }));
      return;
    }

    res.json(success({
      normalLow: row.normal_low,
      normalHigh: row.normal_high,
      warningLow: row.warning_low,
      warningHigh: row.warning_high,
      highWarningLow: row.high_warning_low,
      highWarningHigh: row.high_warning_high,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    }));
  } catch (error: any) {
    console.error("[RatioThreshold] 获取阈值配置失败:", error);
    res.status(500).json({
      success: false,
      error: { message: "获取阈值配置失败", code: "INTERNAL_ERROR" },
    });
  }
}

export async function updateRatioThresholds(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { message: "仅管理员可修改阈值配置", code: "FORBIDDEN" },
      });
      return;
    }

    const {
      normalLow, normalHigh,
      warningLow, warningHigh,
      highWarningLow, highWarningHigh,
    } = req.body;

    const errors: string[] = [];

    if (typeof normalLow !== "number" || typeof normalHigh !== "number") {
      errors.push("正常范围阈值必须为数字");
    }
    if (typeof warningLow !== "number" || typeof warningHigh !== "number") {
      errors.push("预警范围阈值必须为数字");
    }
    if (typeof highWarningLow !== "number" || typeof highWarningHigh !== "number") {
      errors.push("高级预警范围阈值必须为数字");
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: { message: errors.join("; "), code: "VALIDATION_ERROR" },
      });
      return;
    }

    if (normalLow >= normalHigh) {
      errors.push("正常范围下限必须小于上限");
    }
    if (warningLow >= normalLow || normalHigh >= warningHigh) {
      errors.push("预警范围必须包含正常范围（warningLow < normalLow, normalHigh < warningHigh）");
    }
    if (highWarningLow >= warningLow || warningHigh >= highWarningHigh) {
      errors.push("高级预警范围必须包含预警范围（highWarningLow < warningLow, warningHigh < highWarningHigh）");
    }
    if (highWarningLow <= 0 || highWarningHigh <= 0) {
      errors.push("阈值必须大于0");
    }
    if (highWarningHigh > 2.0) {
      errors.push("高级预警上限不能超过2.0");
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: { message: errors.join("; "), code: "VALIDATION_ERROR" },
      });
      return;
    }

    
    const existing = (await query("SELECT id FROM ratio_threshold_configs LIMIT 1", [])).rows[0] as any;
    const updatedAt = getNow();
    const updatedBy = req.user?.userId || null;

    if (existing) {
      await execute(`
        UPDATE ratio_threshold_configs
        SET normal_low = ?, normal_high = ?,
            warning_low = ?, warning_high = ?,
            high_warning_low = ?, high_warning_high = ?,
            updated_at = ?, updated_by = ?
        WHERE id = ?
      `, [normalLow, normalHigh,
        warningLow, warningHigh,
        highWarningLow, highWarningHigh,
        updatedAt, updatedBy,
        existing.id,]);
    } else {
      const id = generateId();
      await execute(`
        INSERT INTO ratio_threshold_configs (id, normal_low, normal_high, warning_low, warning_high, high_warning_low, high_warning_high, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id,
        normalLow, normalHigh,
        warningLow, warningHigh,
        highWarningLow, highWarningHigh,
        updatedAt, updatedBy,]);
    }

    setCachedThresholds({
      normalLow, normalHigh,
      warningLow, warningHigh,
      highWarningLow, highWarningHigh,
    });

    res.json(success({
      normalLow, normalHigh,
      warningLow, warningHigh,
      highWarningLow, highWarningHigh,
      updatedAt, updatedBy,
    }, "阈值配置更新成功"));
  } catch (error: any) {
    console.error("[RatioThreshold] 更新阈值配置失败:", error);
    res.status(500).json({
      success: false,
      error: { message: "更新阈值配置失败", code: "INTERNAL_ERROR" },
    });
  }
}
