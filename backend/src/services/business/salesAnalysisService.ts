import { query, execute } from '../../config/database-adapter.js';

interface SalesAnalysisInput {
  start_date?: string;
  end_date?: string;
  group_by?: "day" | "week" | "month" | "salesperson" | "region" | "category";
}

interface SalesTrend {
  period: string;
  total_quantity: number;
  total_amount: number;
  order_count: number;
  avg_order_value: number;
}

class SalesAnalysisService {
  async analyze(input: SalesAnalysisInput): Promise<{
    summary: {
      total_records: number;
      total_quantity: number;
      total_amount: number;
      avg_quantity_per_order: number;
      avg_amount_per_order: number;
    };
    trends: SalesTrend[];
    top_formulas: Array<{ name: string; quantity: number; amount: number }>;
    top_salespersons: Array<{ id: string; name: string; total_amount: number }>;
    period_breakdown: Array<{ period_type: string; count: number; amount: number }>;
    has_data: boolean;
  }> {
    

    const conditions: string[] = [];
    const sqlParams: any[] = [];

    if (input.start_date) {
      conditions.push("fs.period_start >= ?");
      sqlParams.push(input.start_date);
    }
    if (input.end_date) {
      conditions.push("fs.period_end <= ?");
      sqlParams.push(input.end_date);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const totalRow = ((await query(`SELECT COUNT(*) as total_records, COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_amount FROM formula_sales fs ${whereSql}`,
      [...sqlParams])).rows[0]) as any;

    const hasData = totalRow?.total_records > 0;

    if (!hasData) {
      return {
        summary: { total_records: 0, total_quantity: 0, total_amount: 0, avg_quantity_per_order: 0, avg_amount_per_order: 0 },
        trends: [],
        top_formulas: [],
        top_salespersons: [],
        period_breakdown: [],
        has_data: false,
      };
    }

    const summary = {
      total_records: totalRow.total_records,
      total_quantity: Math.round(totalRow.total_quantity * 100) / 100,
      total_amount: Math.round(totalRow.total_amount * 100) / 100,
      avg_quantity_per_order: totalRow.total_records > 0 ? Math.round((totalRow.total_quantity / totalRow.total_records) * 100) / 100 : 0,
      avg_amount_per_order: totalRow.total_records > 0 ? Math.round((totalRow.total_amount / totalRow.total_records) * 100) / 100 : 0,
    };

    const groupBy = input.group_by || "month";

    let trends: SalesTrend[] = [];
    if (groupBy === "month") {
      const trendRows = (await query(
        `SELECT DATE_FORMAT(fs.period_start, '%Y-%m') as period, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_amount, COUNT(*) as order_count FROM formula_sales fs ${whereSql} GROUP BY period ORDER BY period DESC LIMIT 24`, [...sqlParams])).rows as Record<string, unknown>[];
      trends = trendRows.map(r => ({
        period: r.period,
        total_quantity: Math.round(r.total_quantity * 100) / 100,
        total_amount: Math.round(r.total_amount * 100) / 100,
        order_count: r.order_count,
        avg_order_value: r.order_count > 0 ? Math.round((r.total_amount / r.order_count) * 100) / 100 : 0,
      }));
    } else if (groupBy === "salesperson") {
      const trendRows = (await query(`SELECT s.name as period, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_amount, COUNT(*) as order_count FROM formula_sales fs JOIN salesmen s ON fs.salesman_id = s.id ${whereSql} GROUP BY fs.salesman_id ORDER BY total_amount DESC LIMIT 20`, [...sqlParams])).rows as any[];
      trends = trendRows.map(r => ({
        period: r.period,
        total_quantity: Math.round(r.total_quantity * 100) / 100,
        total_amount: Math.round(r.total_amount * 100) / 100,
        order_count: r.order_count,
        avg_order_value: r.order_count > 0 ? Math.round((r.total_amount / r.order_count) * 100) / 100 : 0,
      }));
    } else if (groupBy === "category" || groupBy === "region") {
      const trendRows = (await query(`SELECT fs.period_type as period, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_amount, COUNT(*) as order_count FROM formula_sales fs ${whereSql} GROUP BY fs.period_type ORDER BY total_amount DESC`, [...sqlParams])).rows as any[];
      trends = trendRows.map(r => ({
        period: r.period,
        total_quantity: Math.round(r.total_quantity * 100) / 100,
        total_amount: Math.round(r.total_amount * 100) / 100,
        order_count: r.order_count,
        avg_order_value: r.order_count > 0 ? Math.round((r.total_amount / r.order_count) * 100) / 100 : 0,
      }));
    } else {
      const trendRows = (await query(`SELECT strftime('%Y-%m-%d', fs.period_start) as period, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_amount, COUNT(*) as order_count FROM formula_sales fs ${whereSql} GROUP BY period ORDER BY period DESC LIMIT 60`, [...sqlParams])).rows as any[];
      trends = trendRows.map(r => ({
        period: r.period,
        total_quantity: Math.round(r.total_quantity * 100) / 100,
        total_amount: Math.round(r.total_amount * 100) / 100,
        order_count: r.order_count,
        avg_order_value: r.order_count > 0 ? Math.round((r.total_amount / r.order_count) * 100) / 100 : 0,
      }));
    }

    const topFormulaRows = (await query(`SELECT f.name, SUM(fs.quantity) as quantity, SUM(fs.revenue) as amount FROM formula_sales fs JOIN formulas f ON fs.formula_id = f.id ${whereSql} GROUP BY fs.formula_id ORDER BY amount DESC LIMIT 10`, [...sqlParams])).rows as any[];
    const top_formulas = topFormulaRows.map(r => ({
      name: r.name,
      quantity: Math.round(r.quantity * 100) / 100,
      amount: Math.round(r.amount * 100) / 100,
    }));

    const topSalespersonRows = (await query(`SELECT s.id, s.name, SUM(fs.revenue) as total_amount FROM formula_sales fs JOIN salesmen s ON fs.salesman_id = s.id ${whereSql} GROUP BY fs.salesman_id ORDER BY total_amount DESC LIMIT 10`, [...sqlParams])).rows as any[];
    const top_salespersons = topSalespersonRows.map(r => ({
      id: r.id,
      name: r.name,
      total_amount: Math.round(r.total_amount * 100) / 100,
    }));

    const periodRows = (await query(`SELECT period_type, COUNT(*) as count, SUM(fs.revenue) as amount FROM formula_sales fs ${whereSql} GROUP BY period_type ORDER BY amount DESC`, [...sqlParams])).rows as any[];
    const period_breakdown = periodRows.map(r => ({
      period_type: r.period_type,
      count: r.count,
      amount: Math.round(r.amount * 100) / 100,
    }));

    return {
      summary,
      trends,
      top_formulas,
      top_salespersons,
      period_breakdown,
      has_data: true,
    };
  }
}

export { SalesAnalysisService };
export const salesAnalysisService = new SalesAnalysisService();
