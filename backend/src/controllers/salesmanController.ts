// 业务员管理控制器
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

/** 获取业务员列表 */
export async function getSalesmen(req: any, res: Response) {
  try {
    const { keyword, status, department, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));

    let whereSql = "WHERE 1=1";
    const params: any[] = [];

    if (keyword) {
      whereSql += " AND (name LIKE ? OR code LIKE ? OR phone LIKE ?)";
      const like = buildLike(keyword as string);
      params.push(like, like, like);
    }
    if (status) {
      whereSql += " AND status = ?";
      params.push(status);
    }
    if (department) {
      whereSql += " AND department = ?";
      params.push(department);
    }

    const [list]: any[] = await query(`SELECT * FROM salesmen ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [
      ...params,
      size,
      offset,
    ]);

    const [countResult]: any[] = await query(`SELECT COUNT(*) as total FROM salesmen ${whereSql}`, params);

    res.json(successWithPagination(rowsToCamelCase(list), countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取业务员列表失败", error: error.message });
  }
}

/** 获取业务员详情 */
export async function getSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [[salesman]]: any[][] = await query("SELECT * FROM salesmen WHERE id = ?", [id]);
    if (!salesman) {
      res.status(404).json({ success: false, message: "业务员不存在" });
      return;
    }

    res.json(success(rowToCamelCase(salesman)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取业务员详情失败", error: error.message });
  }
}

/** 创建业务员 */
export async function createSalesman(req: any, res: Response) {
  try {
    const { name, code, department, phone, email } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    await query(
      `INSERT INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, name, code, department, phone, email, userId, now()],
    );

    const [[salesman]]: any[][] = await query("SELECT * FROM salesmen WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(salesman), "业务员创建成功"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json({ success: false, message: "业务员工号已存在" });
      return;
    }
    res.status(500).json({ success: false, message: "创建业务员失败", error: error.message });
  }
}

/** 更新业务员 */
export async function updateSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, code, department, phone, email, status } = req.body;

    // 只更新传入的字段，status 未传则保持原值
    if (status !== undefined) {
      await query("UPDATE salesmen SET name=?, code=?, department=?, phone=?, email=?, status=? WHERE id=?", [
        name,
        code,
        department,
        phone,
        email,
        status,
        id,
      ]);
    } else {
      await query("UPDATE salesmen SET name=?, code=?, department=?, phone=?, email=? WHERE id=?", [
        name,
        code,
        department,
        phone,
        email,
        id,
      ]);
    }

    const [[salesman]]: any[][] = await query("SELECT * FROM salesmen WHERE id = ?", [id]);
    if (!salesman) {
      res.status(404).json({ success: false, message: "业务员不存在" });
      return;
    }
    res.json(success(rowToCamelCase(salesman), "业务员更新成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新业务员失败", error: error.message });
  }
}

/** 删除业务员（物理删除） */
export async function deleteSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const [[salesman]]: any[][] = await query("SELECT id, name FROM salesmen WHERE id = ?", [id]);
    if (!salesman) {
      return res.status(404).json({ success: false, message: "业务员不存在" });
    }

    const [[usageResult]]: any[][] = await query(
      `SELECT COUNT(*) as cnt FROM formulas WHERE salesman_id = ?`,
      [id],
    );
    if (usageResult && usageResult.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: `业务员「${salesman.name}」已被 ${usageResult.cnt} 个配方引用，无法删除。请先移除或转移相关配方。`,
      });
    }

    await query("DELETE FROM salesmen WHERE id = ?", [id]);
    res.json(success({ message: "业务员已删除" }, "业务员已删除"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "删除业务员失败", error: error.message });
  }
}

/** 切换业务员状态（停用/启用） */
export async function toggleSalesmanStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "无效的状态值" });
    }
    await query("UPDATE salesmen SET status = ? WHERE id = ?", [status, id]);
    const msg = status === "active" ? "业务员已启用" : "业务员已停用";
    res.json(success({ message: msg }, msg));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新状态失败", error: error.message });
  }
}
