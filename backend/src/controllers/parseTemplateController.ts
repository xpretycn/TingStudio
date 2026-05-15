import { Request, Response } from "express";
import { query } from "../config/database-better-sqlite3.js";
import {
  generateId, now, success, successWithPagination,
  buildPagination, buildLike, rowToCamelCase, rowsToCamelCase,
} from "../utils/helpers.js";

const TABLE = "parse_templates";

export async function getParseTemplates(req: any, res: Response) {
  try {
    const { keyword, category, page = "1", pageSize = "20" } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));
    const userId = req.user.userId;

    let whereSql = "WHERE created_by = ?";
    const params: any[] = [userId];

    if (keyword) {
      whereSql += " AND name LIKE ?";
      params.push(buildLike(keyword as string));
    }

    if (category) {
      whereSql += " AND category = ?";
      params.push(category);
    }

    const [list]: any[] = await query(
      `SELECT id, name, category, default_provider, default_model, custom_prompt, field_mapping, validation_rules, is_preset, is_active, created_by, created_at, updated_at FROM ${TABLE} ${whereSql} ORDER BY is_preset DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );
    const [countResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM ${TABLE} ${whereSql}`,
      params,
    );
    res.json(successWithPagination(rowsToCamelCase(list), countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: "获取模板列表失败", code: "INTERNAL_ERROR" },
    });
  }
}

export async function getParseTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [[row]]: any[][] = await query(
      `SELECT id, name, category, default_provider, default_model, custom_prompt, field_mapping, validation_rules, is_preset, is_active, created_by, created_at, updated_at FROM ${TABLE} WHERE id = ?`,
      [id],
    );
    if (!row) {
      res.status(404).json({
        success: false,
        error: { message: "模板不存在", code: "NOT_FOUND" },
      });
      return;
    }
    res.json(success(rowToCamelCase(row)));
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: "获取模板失败", code: "INTERNAL_ERROR" },
    });
  }
}

export async function createParseTemplate(req: any, res: Response) {
  try {
    const userId = req.user.userId;
    const id = generateId();
    const timestamp = now();
    const {
      name,
      category = "nutrition",
      defaultProvider = null,
      defaultModel = null,
      customPrompt = null,
      fieldMapping = {},
      validationRules = {},
    } = req.body;

    await query(
      `INSERT INTO ${TABLE} (id, name, category, default_provider, default_model, custom_prompt, field_mapping, validation_rules, is_preset, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)`,
      [
        id,
        name,
        category,
        defaultProvider,
        defaultModel,
        customPrompt,
        JSON.stringify(fieldMapping),
        JSON.stringify(validationRules),
        userId,
        timestamp,
        timestamp,
      ],
    );

    const [[row]]: any[][] = await query(
      `SELECT id, name, category, default_provider, default_model, custom_prompt, field_mapping, validation_rules, is_preset, is_active, created_by, created_at, updated_at FROM ${TABLE} WHERE id = ?`,
      [id],
    );
    res.status(201).json(success(rowToCamelCase(row), "模板创建成功"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({
        success: false,
        error: { message: "模板名称已存在", code: "DUPLICATE_ENTRY" },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { message: "创建模板失败", code: "INTERNAL_ERROR" },
    });
  }
}

export async function updateParseTemplate(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [[existing]]: any[][] = await query(
      `SELECT id FROM ${TABLE} WHERE id = ?`,
      [id],
    );
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { message: "模板不存在", code: "NOT_FOUND" },
      });
      return;
    }

    const timestamp = now();
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields: Record<string, string> = {
      name: "name",
      category: "category",
      defaultProvider: "default_provider",
      defaultModel: "default_model",
      customPrompt: "custom_prompt",
      fieldMapping: "field_mapping",
      validationRules: "validation_rules",
      isActive: "is_active",
    };

    for (const [bodyKey, colName] of Object.entries(allowedFields)) {
      if (req.body[bodyKey] !== undefined) {
        fields.push(`${colName} = ?`);
        if (bodyKey === "fieldMapping" || bodyKey === "validationRules") {
          values.push(JSON.stringify(req.body[bodyKey]));
        } else if (bodyKey === "isActive") {
          values.push(req.body[bodyKey] ? 1 : 0);
        } else {
          values.push(req.body[bodyKey]);
        }
      }
    }

    if (fields.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: "没有需要更新的字段", code: "VALIDATION_ERROR" },
      });
      return;
    }

    fields.push("updated_at = ?");
    values.push(timestamp);
    values.push(id);

    await query(
      `UPDATE ${TABLE} SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    const [[row]]: any[][] = await query(
      `SELECT id, name, category, default_provider, default_model, custom_prompt, field_mapping, validation_rules, is_preset, is_active, created_by, created_at, updated_at FROM ${TABLE} WHERE id = ?`,
      [id],
    );
    res.json(success(rowToCamelCase(row), "模板更新成功"));
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: "更新模板失败", code: "INTERNAL_ERROR" },
    });
  }
}

export async function deleteParseTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result: any = await query(
      `DELETE FROM ${TABLE} WHERE id = ? AND is_preset = 0`,
      [id],
    );
    if (result.changes === 0) {
      res.status(404).json({
        success: false,
        error: { message: "模板不存在或为系统预设不可删除", code: "NOT_FOUND" },
      });
      return;
    }
    res.json(success(null, "模板删除成功"));
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: "删除模板失败", code: "INTERNAL_ERROR" },
    });
  }
}
