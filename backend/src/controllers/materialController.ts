// 原料管理控制器
import { Request, Response } from "express";
import { query } from "../config/database-better-sqlite3.js";
import {
  generateId,
  now,
  success,
  successWithPagination,
  buildPagination,
  buildLike,
  rowToCamelCase,
  rowsToCamelCase,
} from "../utils/helpers.js";

/** 获取原料列表 */
export async function getMaterials(req: any, res: Response) {
  try {
    const { keyword, page, pageSize, scope } = req.query;
    const kw = Array.isArray(keyword) ? keyword[0] : keyword || "";
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));
    const userId = req.user.userId;

    let whereSql: string;
    const params: any[] = [];

    if (scope === 'all') {
      whereSql = "WHERE 1=1";
    } else {
      whereSql = "WHERE created_by = ?";
      params.push(userId);
    }

    if (kw) {
      whereSql += " AND (name LIKE ? OR code LIKE ?)";
      const like = buildLike(kw);
      params.push(like, like);
    }

    const [list]: any[] = await query(`SELECT * FROM materials ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [
      ...params,
      size,
      offset,
    ]);

    const [countResult]: any[] = await query(`SELECT COUNT(*) as total FROM materials ${whereSql}`, params);

    res.json(successWithPagination(rowsToCamelCase(list), countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取原料列表失败", error: error.message });
  }
}

/** 获取单个原料 */
export async function getMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [[material]]: any[][] = await query("SELECT * FROM materials WHERE id = ?", [id]);

    if (!material) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }

    res.json(success(rowToCamelCase(material)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取原料失败", error: error.message });
  }
}

/** 获取下一个原料编码 */
export async function getNextCode(req: any, res: Response) {
  try {
    const userId = req.user.userId;
    const [rows]: any[] = await query(
      "SELECT code FROM materials WHERE code LIKE 'MAT%' AND created_by = ? ORDER BY code DESC LIMIT 1",
      [userId],
    );
    let nextNum = 1;
    if (rows && rows.length > 0) {
      nextNum = parseInt(rows[0].code.replace("MAT", "")) + 1;
    }
    res.json(success({ code: `MAT${String(nextNum).padStart(3, "0")}` }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取编码失败", error: error.message });
  }
}

/** 创建原料 */
export async function createMaterial(req: any, res: Response) {
  try {
    const { name, code, unit, stock, materialType, unitPrice, dataSource } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    await query(
      `INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        code,
        unit || "g",
        stock || 0,
        materialType || "herb",
        unitPrice ?? null,
        dataSource || "manual",
        userId,
        now(),
      ],
    );

    const [[material]]: any[][] = await query("SELECT * FROM materials WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(material), "原料创建成功"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({ success: false, message: "原料编码已存在" });
      return;
    }
    res.status(500).json({ success: false, message: "创建原料失败", error: error.message });
  }
}

/** 更新原料 */
export async function updateMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, code, unit, stock, materialType, unitPrice, dataSource } = req.body;

    await query(
      "UPDATE materials SET name=?, code=?, unit=?, stock=?, material_type=?, unit_price=?, data_source=?, updated_at=? WHERE id=?",
      [name, code, unit, stock, materialType || "herb", unitPrice ?? null, dataSource || undefined, now(), id],
    );

    const [[material]]: any[][] = await query("SELECT * FROM materials WHERE id = ?", [id]);
    if (!material) {
      res.status(404).json({ success: false, message: "原料不存在" });
      return;
    }

    res.json(success(rowToCamelCase(material), "原料更新成功"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({ success: false, message: "原料编码已存在" });
      return;
    }
    res.status(500).json({ success: false, message: "更新原料失败", error: error.message });
  }
}

/** 删除原料 */
export async function deleteMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 检查是否被配方引用（SQLite: LIKE 搜索 JSON 文本）
    const [[usageResult]]: any[][] = await query(`SELECT COUNT(*) as cnt FROM formulas WHERE materials_json LIKE ?`, [
      `%"materialId":"${id}"%`,
    ]);
    if (usageResult && usageResult.cnt > 0) {
      res.status(400).json({ success: false, message: "该原料正在被配方使用，无法删除" });
      return;
    }

    await query("DELETE FROM materials WHERE id = ?", [id]);
    res.json(success(null, "原料删除成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "删除原料失败", error: error.message });
  }
}

/** 获取原料统计数据（数据看板用） */
export async function getMaterialStats(req: any, res: Response) {
  try {
    const [[total]]: any[] = await query("SELECT COUNT(*) as count FROM materials");
    const [[herbCount]]: any[] = await query("SELECT COUNT(*) as count FROM materials WHERE material_type = 'herb'");
    const [[supplementCount]]: any[] = await query(
      "SELECT COUNT(*) as count FROM materials WHERE material_type != 'herb'",
    );
    const [[nutritionCount]]: any[] = await query(
      "SELECT COUNT(DISTINCT material_id) as count FROM material_nutrition",
    );
    res.json(
      success({
        total: total.count,
        herbCount: herbCount.count,
        supplementCount: supplementCount.count,
        nutritionCount: nutritionCount.count,
      }),
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取统计数据失败", error: error.message });
  }
}
