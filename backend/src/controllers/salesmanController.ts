// 业务员管理控制器
import { Request, Response } from "express";
import { query } from "../config/database-better-sqlite3.js";
import {
  generateId,
  now,
  success,
  fail,
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
    res.status(500).json(fail("获取业务员列表失败"));
  }
}

/** 获取业务员详情 */
export async function getSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [[salesman]]: any[][] = await query("SELECT * FROM salesmen WHERE id = ?", [id]);
    if (!salesman) {
      res.status(404).json(fail("业务员不存在", "NOT_FOUND"));
      return;
    }

    res.json(success(rowToCamelCase(salesman)));
  } catch (error: any) {
    res.status(500).json(fail("获取业务员详情失败"));
  }
}

/** 生成业务员工号 YW+5位数字 */
async function generateSalesmanCode(): Promise<string> {
  const [[result]]: any[][] = await query(
    "SELECT code FROM salesmen WHERE code LIKE 'YW%' ORDER BY code DESC LIMIT 1"
  );

  let nextNum = 1;
  if (result?.code) {
    const numPart = result.code.replace('YW', '');
    const currentNum = parseInt(numPart, 10);
    if (!isNaN(currentNum)) {
      nextNum = currentNum + 1;
    }
  }

  let code = 'YW' + String(nextNum).padStart(5, '0');
  let attempts = 0;
  while (attempts < 10) {
    const [[existing]]: any[][] = await query("SELECT id FROM salesmen WHERE code = ?", [code]);
    if (!existing) break;
    nextNum++;
    code = 'YW' + String(nextNum).padStart(5, '0');
    attempts++;
  }

  return code;
}

/** 创建业务员 */
export async function createSalesman(req: any, res: Response) {
  try {
    const { name, department, phone, email } = req.body;
    const userId = req.user.userId;
    const id = generateId();
    const code = await generateSalesmanCode();

    await query(
      `INSERT INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, name, code, department, phone, email, userId, now()],
    );

    const [[salesman]]: any[][] = await query("SELECT * FROM salesmen WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(salesman), "业务员创建成功"));
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      res.status(409).json(fail("业务员工号已存在", "DUPLICATE_ENTRY"));
      return;
    }
    res.status(500).json(fail("创建业务员失败"));
  }
}

/** 更新业务员 */
export async function updateSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, code, department, phone, email, status } = req.body;

    // 先查询现有数据，未传入的字段保留原值
    const [[existing]]: any[][] = await query("SELECT * FROM salesmen WHERE id = ?", [id]);
    if (!existing) {
      res.status(404).json(fail("业务员不存在", "NOT_FOUND"));
      return;
    }

    const resolvedName = name ?? existing.name;
    const resolvedCode = code ?? existing.code;
    const resolvedDepartment = department ?? existing.department;
    const resolvedPhone = phone ?? existing.phone;
    const resolvedEmail = email ?? existing.email;
    const resolvedStatus = status ?? existing.status;

    await query(
      "UPDATE salesmen SET name=?, code=?, department=?, phone=?, email=?, status=?, updated_at=? WHERE id=?",
      [resolvedName, resolvedCode, resolvedDepartment, resolvedPhone, resolvedEmail, resolvedStatus, now(), id],
    );

    const [[salesman]]: any[][] = await query("SELECT * FROM salesmen WHERE id = ?", [id]);
    res.json(success(rowToCamelCase(salesman), "业务员更新成功"));
  } catch (error: any) {
    res.status(500).json(fail("更新业务员失败"));
  }
}

/** 删除业务员（物理删除） */
export async function deleteSalesman(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const [[salesman]]: any[][] = await query("SELECT id, name FROM salesmen WHERE id = ?", [id]);
    if (!salesman) {
      return res.status(404).json(fail("业务员不存在", "NOT_FOUND"));
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
    res.status(500).json(fail("删除业务员失败"));
  }
}

/** 切换业务员状态（停用/启用） */
export async function toggleSalesmanStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json(fail("无效的状态值", "VALIDATION_ERROR"));
    }
    await query("UPDATE salesmen SET status = ? WHERE id = ?", [status, id]);
    const msg = status === "active" ? "业务员已启用" : "业务员已停用";
    res.json(success({ message: msg }, msg));
  } catch (error: any) {
    res.status(500).json(fail("更新状态失败"));
  }
}
