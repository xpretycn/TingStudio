import { Request, Response } from "express";
import { query } from "../config/database-better-sqlite3.js";
import { success, fail, rowsToCamelCase } from "../utils/helpers.js";

function isFormulist(req: any): boolean {
  return req.user?.role === "formulist";
}

function getUserFilter(req: any): { clause: string; params: any[] } {
  if (!isFormulist(req)) {
    return { clause: "", params: [] };
  }
  return { clause: "WHERE created_by = ?", params: [req.user.userId] };
}

export async function getDashboardStats(req: any, res: Response) {
  try {
    const userFilter = getUserFilter(req);

    const [formulasResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM formulas ${userFilter.clause}`,
      userFilter.params
    );

    const [materialsResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM materials ${userFilter.clause}`,
      userFilter.params
    );

    let salesSQL: string;
    let salesParams: any[];
    if (isFormulist(req)) {
      salesSQL = `
        SELECT 
          COALESCE(SUM(fs.quantity), 0) as totalQuantity,
          COALESCE(SUM(fs.revenue), 0) as totalRevenue,
          COUNT(DISTINCT fs.formula_id) as formulaCount
        FROM formula_sales fs
        JOIN formulas f ON f.id = fs.formula_id
        WHERE f.created_by = ? AND fs.period_start >= date('now', 'start of month')
      `;
      salesParams = [req.user.userId];
    } else {
      salesSQL = `
        SELECT 
          COALESCE(SUM(fs.quantity), 0) as totalQuantity,
          COALESCE(SUM(fs.revenue), 0) as totalRevenue,
          COUNT(DISTINCT fs.formula_id) as formulaCount
        FROM formula_sales fs
        WHERE fs.period_start >= date('now', 'start of month')
      `;
      salesParams = [];
    }

    const [salesResult]: any[] = await query(salesSQL, salesParams);

    const stats = {
      formulas: formulasResult[0]?.total || 0,
      materials: materialsResult[0]?.total || 0,
      sales: {
        quantity: Number(salesResult[0]?.totalQuantity || 0),
        revenue: Number(salesResult[0]?.totalRevenue || 0),
        formulaCount: salesResult[0]?.formulaCount || 0,
      },
      pendingTasks: 0,
    };

    res.json(success(stats));
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json(fail("获取仪表盘数据失败"));
  }
}

export async function getRecentActivity(req: any, res: Response) {
  try {
    const { limit = 10 } = req.query;
    const parsedLimit = parseInt(String(limit), 10);
    const limitNum = Math.min(Number.isNaN(parsedLimit) ? 10 : parsedLimit, 20);
    const halfLimit = Math.floor(limitNum / 2);
    const userFilter = getUserFilter(req);

    const [recentFormulas]: any[] = await query(
      `
      SELECT id, name, code, updated_at as updatedAt, 'formula' as type
      FROM formulas ${userFilter.clause}
      ORDER BY updated_at DESC LIMIT ?
    `,
      [...userFilter.params, halfLimit],
    );

    const [recentMaterials]: any[] = await query(
      `
      SELECT id, name, code, updated_at as updatedAt, 'material' as type
      FROM materials ${userFilter.clause}
      ORDER BY updated_at DESC LIMIT ?
    `,
      [...userFilter.params, halfLimit],
    );

    const allActivities = [...rowsToCamelCase(recentFormulas), ...rowsToCamelCase(recentMaterials)]
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limitNum);

    res.json(success(allActivities));
  } catch (error: any) {
    console.error("Recent activity error:", error);
    res.status(500).json(fail("获取最近活动失败"));
  }
}

export async function getSalesTrend(req: any, res: Response) {
  try {
    const { period = "month" } = req.query;

    let dateFormat: string;
    let groupBy: string;

    switch (period) {
      case "week":
        dateFormat = "%Y-%W";
        groupBy = "strftime('%Y-%W', fs.period_start)";
        break;
      case "year":
        dateFormat = "%Y";
        groupBy = "strftime('%Y', fs.period_start)";
        break;
      default:
        dateFormat = "%Y-%m";
        groupBy = "strftime('%Y-%m', fs.period_start)";
    }

    let sql: string;
    let params: any[];
    if (isFormulist(req)) {
      sql = `
        SELECT 
          ${groupBy} as period,
          SUM(fs.quantity) as quantity,
          SUM(fs.revenue) as revenue,
          COUNT(*) as orderCount
        FROM formula_sales fs
        JOIN formulas f ON f.id = fs.formula_id
        WHERE f.created_by = ? AND fs.period_start >= date('now', '-12 months')
        GROUP BY period
        ORDER BY period ASC
      `;
      params = [req.user.userId];
    } else {
      sql = `
        SELECT 
          ${groupBy} as period,
          SUM(fs.quantity) as quantity,
          SUM(fs.revenue) as revenue,
          COUNT(*) as orderCount
        FROM formula_sales fs
        WHERE fs.period_start >= date('now', '-12 months')
        GROUP BY period
        ORDER BY period ASC
      `;
      params = [];
    }

    const [trendData]: any[] = await query(sql, params);

    res.json(success(rowsToCamelCase(trendData)));
  } catch (error: any) {
    console.error("Sales trend error:", error);
    res.status(500).json(fail("获取销量趋势失败"));
  }
}