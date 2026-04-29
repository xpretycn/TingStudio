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

export async function getSalesList(req: any, res: Response) {
  try {
    const { formulaId, salesmanId, periodStart, periodEnd, keyword, sortBy, order, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));

    let whereSql = "WHERE 1=1";
    const params: any[] = [];

    if (formulaId) { whereSql += " AND fs.formula_id = ?"; params.push(formulaId); }
    if (salesmanId) { whereSql += " AND fs.salesman_id = ?"; params.push(salesmanId); }
    if (periodStart) { whereSql += " AND fs.period_start >= ?"; params.push(periodStart); }
    if (periodEnd) { whereSql += " AND fs.period_start <= ?"; params.push(periodEnd); }
    if (keyword) {
      whereSql += " AND (f.name LIKE ? OR sm.name LIKE ?)";
      const like = buildLike(keyword as string);
      params.push(like, like);
    }

    const sortCol = sortBy === 'revenue' ? 'fs.revenue' : sortBy === 'period' ? 'fs.period_start' : 'fs.quantity';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const [list]: any[] = await query(
      `SELECT fs.*, f.name as formula_name, f.code as formula_code, sm.name as salesman_name
       FROM formula_sales fs
       LEFT JOIN formulas f ON fs.formula_id = f.id
       LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      [...params, size, offset]
    );

    const [countResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM formula_sales fs
       LEFT JOIN formulas f ON fs.formula_id = f.id
       LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       ${whereSql}`, params
    );

    res.json(successWithPagination(rowsToCamelCase(list), countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取销量列表失败", error: error.message });
  }
}

export async function getSalesByFormula(req: any, res: Response) {
  try {
    const { formulaId } = req.params;
    const [rows]: any[] = await query(
      `SELECT fs.*, f.name as formula_name, sm.name as salesman_name
       FROM formula_sales fs
       LEFT JOIN formulas f ON fs.formula_id = f.id
       LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       WHERE fs.formula_id = ? ORDER BY fs.period_start DESC`,
      [formulaId]
    );
    res.json(success(rowsToCamelCase(rows)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取配方销量历史失败", error: error.message });
  }
}

export async function getSalesStats(req: any, res: Response) {
  try {
    const { periodStart, periodEnd } = req.query;

    let dateFilter = "WHERE 1=1";
    const params: any[] = [];
    if (periodStart) { dateFilter += " AND fs.period_start >= ?"; params.push(periodStart); }
    if (periodEnd) { dateFilter += " AND fs.period_start <= ?"; params.push(periodEnd); }

    const [summary]: any[] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_revenue
       FROM formula_sales fs ${dateFilter}`, params
    );

    const [topFormulas]: any[] = await query(
      `SELECT f.id as formula_id, f.name as formula_name, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_revenue
       FROM formula_sales fs LEFT JOIN formulas f ON fs.formula_id = f.id
       ${dateFilter} GROUP BY fs.formula_id ORDER BY total_quantity DESC LIMIT 10`, params
    );

    const [topSalesmen]: any[] = await query(
      `SELECT sm.id as salesman_id, sm.name as salesman_name, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_revenue
       FROM formula_sales fs LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       ${dateFilter} GROUP BY fs.salesman_id ORDER BY total_quantity DESC LIMIT 10`, params
    );

    const [monthlyTrend]: any[] = await query(
      `SELECT fs.period_start as month, SUM(fs.quantity) as quantity, SUM(fs.revenue) as revenue
       FROM formula_sales fs ${dateFilter} GROUP BY fs.period_start ORDER BY fs.period_start ASC`, params
    );

    const now2 = new Date();
    const curMonth = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-01`;
    const prevDate = new Date(now2.getFullYear(), now2.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;

    const [curData]: any[] = await query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(revenue), 0) as revenue FROM formula_sales WHERE period_start = ?`,
      [curMonth]
    );
    const [prevData]: any[] = await query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(revenue), 0) as revenue FROM formula_sales WHERE period_start = ?`,
      [prevMonth]
    );

    const qtyGrowth = prevData[0].quantity > 0 ? ((curData[0].quantity - prevData[0].quantity) / prevData[0].quantity * 100) : 0;
    const revGrowth = prevData[0].revenue > 0 ? ((curData[0].revenue - prevData[0].revenue) / prevData[0].revenue * 100) : 0;

    res.json(success({
      totalQuantity: summary[0].total_quantity,
      totalRevenue: summary[0].total_revenue,
      topFormulas: rowsToCamelCase(topFormulas),
      topSalesmen: rowsToCamelCase(topSalesmen),
      monthlyTrend: rowsToCamelCase(monthlyTrend),
      periodComparison: {
        current: { quantity: curData[0].quantity, revenue: curData[0].revenue, month: curMonth },
        previous: { quantity: prevData[0].quantity, revenue: prevData[0].revenue, month: prevMonth },
        quantityGrowthRate: Math.round(qtyGrowth * 10) / 10,
        revenueGrowthRate: Math.round(revGrowth * 10) / 10,
      }
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取销量统计失败", error: error.message });
  }
}

export async function createSale(req: any, res: Response) {
  try {
    const { formulaId, salesmanId, periodType, periodStart, quantity, revenue, notes } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    const periodEnd = calcPeriodEnd(periodStart, periodType || 'monthly');

    const [existing]: any[] = await query(
      "SELECT id FROM formula_sales WHERE formula_id = ? AND period_type = ? AND period_start = ?",
      [formulaId, periodType || 'monthly', periodStart]
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: "该配方在此周期已有销量记录，请使用更新功能" });
    }

    const [[formula]]: any[][] = await query("SELECT salesman_id FROM formulas WHERE id = ?", [formulaId]);
    const actualSalesmanId = salesmanId || (formula ? formula.salesman_id : null);
    if (!actualSalesmanId) {
      return res.status(400).json({ success: false, message: "无法确定关联业务员" });
    }

    await query(
      `INSERT INTO formula_sales (id, formula_id, salesman_id, period_type, period_start, period_end, quantity, revenue, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, formulaId, actualSalesmanId, periodType || 'monthly', periodStart, periodEnd, quantity || 0, revenue || 0, notes || null, userId, now(), now()]
    );

    const [[created]]: any[][] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(created)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "创建销量记录失败", error: error.message });
  }
}

export async function updateSale(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { quantity, revenue, notes } = req.body;

    const [[existing]]: any[][] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "销量记录不存在" });
    }

    await query(
      `UPDATE formula_sales SET quantity = ?, revenue = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [quantity ?? existing.quantity, revenue ?? existing.revenue, notes ?? existing.notes, now(), id]
    );

    const [[updated]]: any[][] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    res.json(success(rowToCamelCase(updated)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新销量记录失败", error: error.message });
  }
}

export async function deleteSale(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [[existing]]: any[][] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "销量记录不存在" });
    }
    await query("DELETE FROM formula_sales WHERE id = ?", [id]);
    res.json(success({ id }, "删除成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "删除销量记录失败", error: error.message });
  }
}

function calcPeriodEnd(periodStart: string, periodType: string): string {
  const [year, month] = periodStart.split('-').map(Number);
  if (periodType === 'monthly') {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  } else if (periodType === 'quarterly') {
    const qEnd = Math.ceil(month / 3) * 3;
    const lastDay = new Date(year, qEnd, 0).getDate();
    return `${year}-${String(qEnd).padStart(2, '0')}-${lastDay}`;
  } else {
    return `${year}-12-31`;
  }
}
