import { Router } from "express";
import { query } from "../config/database-better-sqlite3.js";
import { success } from "../utils/helpers.js";

export const salesRoutes = Router();

salesRoutes.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 10, formulaId, salesmanId, periodStart, periodEnd, keyword } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let whereClause = "1=1";
    const params: any[] = [];

    if (formulaId) {
      whereClause += " AND fs.formula_id = ?";
      params.push(formulaId);
    }
    if (salesmanId) {
      whereClause += " AND fs.salesman_id = ?";
      params.push(salesmanId);
    }
    if (periodStart) {
      whereClause += " AND fs.period_start >= ?";
      params.push(periodStart);
    }
    if (periodEnd) {
      whereClause += " AND fs.period_end <= ?";
      params.push(periodEnd);
    }
    if (keyword) {
      whereClause += " AND (f.name LIKE ? OR s.name LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [countRows]: any[] = await query(
      `SELECT COUNT(*) as total FROM formula_sales fs LEFT JOIN formulas f ON fs.formula_id = f.id LEFT JOIN salesmen s ON fs.salesman_id = s.id WHERE ${whereClause}`,
      params,
    );
    const total = countRows?.[0]?.total || 0;

    const [salesRows]: any[] = await query(
      `SELECT fs.*, f.name as formulaName, f.code as formulaCode, s.name as salesmanName
       FROM formula_sales fs
       LEFT JOIN formulas f ON fs.formula_id = f.id
       LEFT JOIN salesmen s ON fs.salesman_id = s.id
       WHERE ${whereClause}
       ORDER BY fs.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset],
    );

    res.json(
      success({
        list: salesRows || [],
        pagination: { page: Number(page), pageSize: Number(pageSize), total },
      }),
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取销售列表失败", error: error.message });
  }
});

salesRoutes.get("/stats", async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.query;

    let dateFilter = "";
    const params: any[] = [];
    if (periodStart) {
      dateFilter += " AND fs.period_start >= ?";
      params.push(periodStart);
    }
    if (periodEnd) {
      dateFilter += " AND fs.period_end <= ?";
      params.push(periodEnd);
    }

    const [totalStatsRows]: any[] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as totalQuantity, COALESCE(SUM(fs.revenue), 0) as totalRevenue
       FROM formula_sales fs WHERE 1=1 ${dateFilter}`,
      params,
    );

    const [topFormulasRows]: any[] = await query(
      `SELECT fs.formula_id, f.name as formulaName, SUM(fs.quantity) as totalQuantity, SUM(fs.revenue) as totalRevenue
       FROM formula_sales fs LEFT JOIN formulas f ON fs.formula_id = f.id
       WHERE 1=1 ${dateFilter} GROUP BY fs.formula_id ORDER BY totalRevenue DESC LIMIT 5`,
      params,
    );

    const [topSalesmenRows]: any[] = await query(
      `SELECT fs.salesman_id, s.name as salesmanName, SUM(fs.quantity) as totalQuantity, SUM(fs.revenue) as totalRevenue
       FROM formula_sales fs LEFT JOIN salesmen s ON fs.salesman_id = s.id
       WHERE 1=1 ${dateFilter} GROUP BY fs.salesman_id ORDER BY totalRevenue DESC LIMIT 5`,
      params,
    );

    const [monthlyTrendRows]: any[] = await query(
      `SELECT strftime('%Y-%m', fs.period_start) as month, SUM(fs.quantity) as quantity, SUM(fs.revenue) as revenue
       FROM formula_sales fs WHERE 1=1 ${dateFilter} GROUP BY month ORDER BY month DESC LIMIT 12`,
      params,
    );

    const [currentPeriodRows]: any[] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as quantity, COALESCE(SUM(fs.revenue), 0) as revenue,
              strftime('%Y-%m', MAX(fs.period_start)) as month
       FROM formula_sales fs WHERE 1=1 ${dateFilter}`,
      params,
    );

    let prevDateFilter = "";
    const prevParams: any[] = [];
    if (periodStart) {
      const prevStart = new Date(periodStart as string);
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevDateFilter += " AND fs.period_start >= ?";
      prevParams.push(prevStart.toISOString().substring(0, 7));
    }
    if (periodEnd) {
      const prevEnd = new Date(periodEnd as string);
      prevEnd.setMonth(prevEnd.getMonth() - 1);
      prevDateFilter += " AND fs.period_end <= ?";
      prevParams.push(prevEnd.toISOString().substring(0, 7));
    }

    const [previousPeriodRows]: any[] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as quantity, COALESCE(SUM(fs.revenue), 0) as revenue,
              strftime('%Y-%m', MAX(fs.period_start)) as month
       FROM formula_sales fs WHERE 1=1 ${prevDateFilter}`,
      prevParams,
    );

    const currentData = currentPeriodRows?.[0] || { quantity: 0, revenue: 0, month: null };
    const previousData = previousPeriodRows?.[0] || { quantity: 0, revenue: 0, month: null };
    const quantityGrowthRate =
      previousData.quantity > 0
        ? Number((((currentData.quantity - previousData.quantity) / previousData.quantity) * 100).toFixed(1))
        : 0;
    const revenueGrowthRate =
      previousData.revenue > 0
        ? Number((((currentData.revenue - previousData.revenue) / previousData.revenue) * 100).toFixed(1))
        : 0;

    res.json(
      success({
        totalQuantity: Number(totalStatsRows?.[0]?.totalQuantity || 0),
        totalRevenue: Number(totalStatsRows?.[0]?.totalRevenue || 0),
        topFormulas: topFormulasRows || [],
        topSalesmen: topSalesmenRows || [],
        monthlyTrend: monthlyTrendRows || [],
        periodComparison: {
          current: {
            quantity: Number(currentData.quantity),
            revenue: Number(currentData.revenue),
            month: currentData.month,
          },
          previous: {
            quantity: Number(previousData.quantity),
            revenue: Number(previousData.revenue),
            month: previousData.month,
          },
          quantityGrowthRate,
          revenueGrowthRate,
        },
      }),
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取销售统计失败", error: error.message });
  }
});

salesRoutes.get("/formula/:formulaId", async (req, res) => {
  try {
    const { formulaId } = req.params;
    const [salesRows]: any[] = await query(
      `SELECT fs.*, s.name as salesmanName FROM formula_sales fs LEFT JOIN salesmen s ON fs.salesman_id = s.id WHERE fs.formula_id = ? ORDER BY fs.created_at DESC`,
      [formulaId],
    );
    res.json(success(salesRows || []));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取配方销售记录失败", error: error.message });
  }
});

salesRoutes.post("/", async (req, res) => {
  try {
    const { formulaId, salesmanId, periodType = "monthly", periodStart, quantity, revenue, notes } = req.body;

    const id = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO formula_sales (id, formula_id, salesman_id, period_type, period_start, period_end, quantity, revenue, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, formulaId, salesmanId, periodType, periodStart, periodStart, quantity, revenue, notes, "system", now, now],
    );

    const [newSaleRows]: any[] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    res.status(201).json(success(newSaleRows?.[0], "销售记录创建成功"));
  } catch (error: any) {
    res.status(400).json({ success: false, message: "创建销售记录失败", error: error.message });
  }
});

salesRoutes.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, revenue, notes } = req.body;
    const now = new Date().toISOString();

    await query("UPDATE formula_sales SET quantity = ?, revenue = ?, notes = ?, updated_at = ? WHERE id = ?", [
      quantity,
      revenue,
      notes,
      now,
      id,
    ]);

    const [updatedRows]: any[] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    res.json(success(updatedRows?.[0], "销售记录更新成功"));
  } catch (error: any) {
    res.status(400).json({ success: false, message: "更新销售记录失败", error: error.message });
  }
});

salesRoutes.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM formula_sales WHERE id = ?", [id]);
    res.json(success(null, "销售记录删除成功"));
  } catch (error: any) {
    res.status(400).json({ success: false, message: "删除销售记录失败", error: error.message });
  }
});
