import { Request, Response } from "express";
import { query } from "../config/database-better-sqlite3.js";
import { success, rowToCamelCase } from "../utils/helpers.js";

export async function getDashboardStats(req: any, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, message: "未提供认证令牌" });
    }

    // 并行查询4个核心指标
    const [formulasResult]: any[] = await query("SELECT COUNT(*) as total FROM formulas");

    const [materialsResult]: any[] = await query("SELECT COUNT(*) as total FROM materials");

    const [salesResult]: any[] = await query(`
      SELECT 
        COALESCE(SUM(fs.quantity), 0) as totalQuantity,
        COALESCE(SUM(fs.revenue), 0) as totalRevenue,
        COUNT(DISTINCT fs.formula_id) as formulaCount
      FROM formula_sales fs
      WHERE fs.period_start >= date('now', 'start of month')
    `);

    // 待处理任务（这里先返回0，Phase 2完善后对接真实任务系统）
    const pendingTasksCount = 0;

    const stats = {
      formulas: formulasResult[0]?.total || 0,
      materials: materialsResult[0]?.total || 0,
      sales: {
        quantity: Number(salesResult[0]?.totalQuantity || 0),
        revenue: Number(salesResult[0]?.totalRevenue || 0),
        formulaCount: salesResult[0]?.formulaCount || 0,
      },
      pendingTasks: pendingTasksCount,
    };

    res.json(success(stats));
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "获取仪表盘数据失败", error: error.message });
  }
}

export async function getRecentActivity(req: any, res: Response) {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(Number(limit), 20);

    // 获取最近更新的配方（最近5条）
    const [recentFormulas]: any[] = await query(
      `
      SELECT id, name, code, updated_at as updatedAt, 'formula' as type
      FROM formulas
      ORDER BY updated_at DESC LIMIT ?
    `,
      [Math.floor(limitNum / 2)],
    );

    // 获取最近更新的原料（最近5条）
    const [recentMaterials]: any[] = await query(
      `
      SELECT id, name, code, updated_at as updatedAt, 'material' as type
      FROM materials
      ORDER BY updated_at DESC LIMIT ?
    `,
      [Math.floor(limitNum / 2)],
    );

    // 合并并按时间排序
    const allActivities = [...rowToCamelCase(recentFormulas), ...rowToCamelCase(recentMaterials)]
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limitNum);

    res.json(success(allActivities));
  } catch (error: any) {
    console.error("Recent activity error:", error);
    res.status(500).json({ success: false, message: "获取最近活动失败", error: error.message });
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
      default: // month
        dateFormat = "%Y-%m";
        groupBy = "strftime('%Y-%m', fs.period_start)";
    }

    const [trendData]: any[] = await query(`
      SELECT 
        ${groupBy} as period,
        SUM(fs.quantity) as quantity,
        SUM(fs.revenue) as revenue,
        COUNT(*) as orderCount
      FROM formula_sales fs
      WHERE fs.period_start >= date('now', '-12 months')
      GROUP BY period
      ORDER BY period ASC
    `);

    res.json(success(rowToCamelCase(trendData)));
  } catch (error: any) {
    console.error("Sales trend error:", error);
    res.status(500).json({ success: false, message: "获取销量趋势失败", error: error.message });
  }
}
