import { Request, Response } from "express";
import { query } from '../config/database-adapter.js';
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

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: string;
  };
}

export async function getSalesList(req: AuthenticatedRequest, res: Response) {
  try {
    const { formulaId, salesmanId, periodStart, periodEnd, keyword, sortBy, order, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));

    let whereSql = "WHERE 1=1";
    const params: unknown[] = [];

    // 数据隔离：formulist 用户只能看到自己创建的配方关联的销量
    const userId = req.user.userId;
    const role = req.user.role;
    if (role !== "admin") {
      whereSql += " AND f.created_by = ?";
      params.push(userId);
    }

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

    const [list]: Record<string, unknown>[][] = await query(
      `SELECT fs.id, fs.formula_id, fs.salesman_id, fs.period_type, fs.period_start, fs.period_end,
              fs.quantity, fs.revenue, fs.notes, fs.created_by, fs.created_at, fs.updated_at,
              f.name as formula_name, f.code as formula_code, sm.name as salesman_name
       FROM formula_sales fs
       LEFT JOIN formulas f ON fs.formula_id = f.id
       LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      [...params, size, offset]
    );

    const [countResult]: Record<string, unknown>[][] = await query(
      `SELECT COUNT(*) as total FROM formula_sales fs
       LEFT JOIN formulas f ON fs.formula_id = f.id
       LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       ${whereSql}`, params
    );

    const totalRow = countResult[0] as Record<string, unknown>;
    res.json(successWithPagination(rowsToCamelCase(list), Number(totalRow.total), p, size));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取销量列表失败";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getSalesByFormula(req: AuthenticatedRequest, res: Response) {
  try {
    const { formulaId } = req.params;
    const [rows]: Record<string, unknown>[][] = await query(
      `SELECT fs.id, fs.formula_id, fs.salesman_id, fs.period_type, fs.period_start, fs.period_end,
              fs.quantity, fs.revenue, fs.notes, fs.created_by, fs.created_at, fs.updated_at,
              f.name as formula_name, sm.name as salesman_name
       FROM formula_sales fs
       LEFT JOIN formulas f ON fs.formula_id = f.id
       LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       WHERE fs.formula_id = ? ORDER BY fs.period_start DESC`,
      [formulaId]
    );
    res.json(success(rowsToCamelCase(rows)));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取配方销量历史失败";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getSalesStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { periodStart, periodEnd } = req.query;

    let dateFilter = "WHERE 1=1";
    const params: unknown[] = [];

    // 数据隔离：formulist 用户只能看到自己创建的配方关联的销量
    const userId = req.user.userId;
    const role = req.user.role;
    const isNonAdmin = role !== "admin";
    if (isNonAdmin) {
      dateFilter += " AND fs.formula_id IN (SELECT id FROM formulas WHERE created_by = ?)";
      params.push(userId);
    }

    if (periodStart) { dateFilter += " AND fs.period_start >= ?"; params.push(periodStart); }
    if (periodEnd) { dateFilter += " AND fs.period_start <= ?"; params.push(periodEnd); }

    const [summary]: Record<string, unknown>[][] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_revenue
       FROM formula_sales fs ${dateFilter}`, params
    );

    const [topFormulas]: Record<string, unknown>[][] = await query(
      `SELECT f.id as formula_id, f.name as formula_name, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_revenue
       FROM formula_sales fs LEFT JOIN formulas f ON fs.formula_id = f.id
       ${dateFilter} GROUP BY fs.formula_id ORDER BY total_quantity DESC LIMIT 10`, params
    );

    const [topSalesmen]: Record<string, unknown>[][] = await query(
      `SELECT sm.id as salesman_id, sm.name as salesman_name, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_revenue
       FROM formula_sales fs LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
       ${dateFilter} GROUP BY fs.salesman_id ORDER BY total_quantity DESC LIMIT 10`, params
    );

    const [monthlyTrend]: Record<string, unknown>[][] = await query(
      `SELECT fs.period_start as month, SUM(fs.quantity) as quantity, SUM(fs.revenue) as revenue
       FROM formula_sales fs ${dateFilter} GROUP BY fs.period_start ORDER BY fs.period_start ASC`, params
    );

    const now2 = new Date();
    const curMonth = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-01`;
    const prevDate = new Date(now2.getFullYear(), now2.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;

    // 环比查询也需要数据隔离
    const curIsolation = isNonAdmin ? " AND formula_id IN (SELECT id FROM formulas WHERE created_by = ?)" : "";
    const curParams: unknown[] = isNonAdmin ? [curMonth, userId] : [curMonth];
    const prevParams: unknown[] = isNonAdmin ? [prevMonth, userId] : [prevMonth];

    const [curData]: Record<string, unknown>[][] = await query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(revenue), 0) as revenue FROM formula_sales WHERE period_start = ?${curIsolation}`,
      curParams
    );
    const [prevData]: Record<string, unknown>[][] = await query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(revenue), 0) as revenue FROM formula_sales WHERE period_start = ?${curIsolation}`,
      prevParams
    );

    const curRow = curData[0] as Record<string, unknown>;
    const prevRow = prevData[0] as Record<string, unknown>;
    const summaryRow = summary[0] as Record<string, unknown>;

    const curQty = Number(curRow.quantity);
    const curRev = Number(curRow.revenue);
    const prevQty = Number(prevRow.quantity);
    const prevRev = Number(prevRow.revenue);

    const qtyGrowth = prevQty > 0 ? ((curQty - prevQty) / prevQty * 100) : 0;
    const revGrowth = prevRev > 0 ? ((curRev - prevRev) / prevRev * 100) : 0;

    res.json(success({
      totalQuantity: Number(summaryRow.total_quantity),
      totalRevenue: Number(summaryRow.total_revenue),
      topFormulas: rowsToCamelCase(topFormulas),
      topSalesmen: rowsToCamelCase(topSalesmen),
      monthlyTrend: rowsToCamelCase(monthlyTrend),
      periodComparison: {
        current: { quantity: curQty, revenue: curRev, month: curMonth },
        previous: { quantity: prevQty, revenue: prevRev, month: prevMonth },
        quantityGrowthRate: Math.round(qtyGrowth * 10) / 10,
        revenueGrowthRate: Math.round(revGrowth * 10) / 10,
      }
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取销量统计失败";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createSale(req: AuthenticatedRequest, res: Response) {
  try {
    const { formulaId, salesmanId, periodType, periodStart, quantity, revenue, notes, mergeMode } = req.body as {
      formulaId: string;
      salesmanId?: string;
      periodType?: string;
      periodStart: string;
      quantity?: number;
      revenue?: number;
      notes?: string;
      mergeMode?: "accumulate" | "replace";
    };
    const userId = req.user.userId;

    if (!periodStart) {
      return res.status(400).json({
        success: false,
        error: { message: "periodStart 为必填项", code: "VALIDATION_ERROR" }
      });
    }

    const currentMonth = new Date();
    const maxMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;
    if (periodStart > maxMonth) {
      return res.status(400).json({
        success: false,
        error: { message: "periodStart不得晚于当前月份", code: "VALIDATION_ERROR" }
      });
    }

    const resolvedPeriodType = periodType || 'monthly';
    const periodEnd = calcPeriodEnd(periodStart, resolvedPeriodType);

    const [[formula]]: [Record<string, unknown>[]] = await query("SELECT salesman_id FROM formulas WHERE id = ?", [formulaId]);
    const actualSalesmanId = salesmanId || (formula ? formula.salesman_id as string : null);
    if (!actualSalesmanId) {
      return res.status(400).json({
        success: false,
        error: { message: "无法确定关联业务员", code: "VALIDATION_ERROR" }
      });
    }

    const [existing]: Record<string, unknown>[] = await query(
      "SELECT id, quantity, revenue FROM formula_sales WHERE formula_id = ? AND salesman_id = ? AND period_type = ? AND period_start = ?",
      [formulaId, actualSalesmanId, resolvedPeriodType, periodStart]
    );

    if (existing && existing.length > 0) {
      const existingRow = existing[0] as Record<string, unknown>;

      if (mergeMode === 'accumulate') {
        const newQuantity = Number(existingRow.quantity) + (quantity || 0);
        const newRevenue = Number(existingRow.revenue) + (revenue || 0);
        await query(
          "UPDATE formula_sales SET quantity = ?, revenue = ?, updated_at = ? WHERE id = ?",
          [newQuantity, newRevenue, now(), existingRow.id]
        );
        const [[updated]]: [Record<string, unknown>[]] = await query("SELECT * FROM formula_sales WHERE id = ?", [existingRow.id]);
        return res.status(200).json(success(rowToCamelCase(updated)));
      }

      if (mergeMode === 'replace') {
        await query(
          "UPDATE formula_sales SET quantity = ?, revenue = ?, notes = ?, updated_at = ? WHERE id = ?",
          [quantity || 0, revenue || 0, notes || null, now(), existingRow.id]
        );
        const [[updated]]: [Record<string, unknown>[]] = await query("SELECT * FROM formula_sales WHERE id = ?", [existingRow.id]);
        return res.status(200).json(success(rowToCamelCase(updated)));
      }

      return res.status(409).json({
        success: false,
        message: "该配方在此周期该业务员下已有销量记录",
        code: "DUPLICATE_ENTRY",
        data: rowToCamelCase(existingRow)
      });
    }

    const id = generateId();
    await query(
      `INSERT INTO formula_sales (id, formula_id, salesman_id, period_type, period_start, period_end, quantity, revenue, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, formulaId, actualSalesmanId, resolvedPeriodType, periodStart, periodEnd, quantity || 0, revenue || 0, notes || null, userId, now(), now()]
    );

    const [[created]]: [Record<string, unknown>[]] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(created)));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "创建销量记录失败";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function updateSale(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { quantity, revenue, notes } = req.body as {
      quantity?: number;
      revenue?: number;
      notes?: string;
    };

    const [[existing]]: [Record<string, unknown>[]] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: "销量记录不存在", code: "NOT_FOUND" } });
    }

    await query(
      `UPDATE formula_sales SET quantity = ?, revenue = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [quantity ?? existing.quantity, revenue ?? existing.revenue, notes ?? existing.notes, now(), id]
    );

    const [[updated]]: [Record<string, unknown>[]] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    res.json(success(rowToCamelCase(updated)));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "更新销量记录失败";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function deleteSale(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const [[existing]]: [Record<string, unknown>[]] = await query("SELECT * FROM formula_sales WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: "销量记录不存在", code: "NOT_FOUND" } });
    }
    await query("DELETE FROM formula_sales WHERE id = ?", [id]);
    res.json(success({ id }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "删除销量记录失败";
    res.status(500).json({ success: false, message: msg });
  }
}

export async function batchCreateSales(req: AuthenticatedRequest, res: Response) {
  try {
    const { records, mergeMode = "accumulate" } = req.body as {
      records: Record<string, unknown>[];
      mergeMode?: "accumulate" | "replace";
    };

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "records必须是非空数组", code: "VALIDATION_ERROR" }
      });
    }

    const MAX_BATCH_SIZE = 200;
    if (records.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        success: false,
        error: { message: `单次批量录入不得超过${MAX_BATCH_SIZE}条`, code: "VALIDATION_ERROR" }
      });
    }

    const currentDate = new Date();
    const maxMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;

    const userId = req.user.userId;
    const role = req.user.role;

    const results: Record<string, unknown>[] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const formulaId = record.formulaId as string | undefined;
      const salesmanId = record.salesmanId as string | undefined;
      const periodStart = record.periodStart as string | undefined;
      const periodType = (record.periodType as string) || "monthly";
      const quantity = Number(record.quantity) || 0;
      const revenue = Number(record.revenue) || 0;
      const notes = record.notes as string | undefined;

      if (!formulaId || !salesmanId || !periodStart) {
        failed++;
        results.push({
          index: i,
          status: "failed",
          formulaCode: "",
          salesmanName: "",
          action: "none",
          message: "缺少必填字段(formulaId, salesmanId, periodStart)"
        });
        continue;
      }

      if (periodStart > maxMonth) {
        failed++;
        results.push({
          index: i,
          status: "failed",
          formulaCode: "",
          salesmanName: "",
          action: "none",
          message: "periodStart不得晚于当前月份"
        });
        continue;
      }

      const [[formulaRow]]: [Record<string, unknown>[]] = await query(
        "SELECT id, code, created_by FROM formulas WHERE id = ?",
        [formulaId]
      );
      if (!formulaRow) {
        failed++;
        results.push({
          index: i,
          status: "failed",
          formulaCode: "",
          salesmanName: "",
          action: "none",
          message: "配方不存在"
        });
        continue;
      }

      const formulaCode = formulaRow.code as string;
      const formulaCreatedBy = formulaRow.created_by as string;

      const [[salesmanRow]]: [Record<string, unknown>[]] = await query(
        "SELECT id, name FROM salesmen WHERE id = ?",
        [salesmanId]
      );
      let salesmanName = "";
      if (salesmanRow) {
        salesmanName = salesmanRow.name as string;
      } else {
        const [[formulaSalesmanRow]]: [Record<string, unknown>[]] = await query(
          "SELECT salesman_name FROM formulas WHERE id = ?",
          [formulaId]
        );
        if (formulaSalesmanRow) {
          salesmanName = (formulaSalesmanRow.salesman_name as string) || "";
        }
      }

      if (role === "formulist" && formulaCreatedBy !== userId) {
        failed++;
        results.push({
          index: i,
          status: "failed",
          formulaCode,
          salesmanName,
          action: "none",
          message: "无权操作此配方"
        });
        continue;
      }

      if (quantity === 0 && revenue === 0) {
        skipped++;
        results.push({
          index: i,
          status: "skipped",
          formulaCode,
          salesmanName,
          action: "skipped",
          message: "销量和金额均为空，跳过"
        });
        continue;
      }

      const periodEnd = calcPeriodEnd(periodStart, periodType);

      const [existingRows]: [Record<string, unknown>[]] = await query(
        "SELECT id, quantity, revenue FROM formula_sales WHERE formula_id = ? AND salesman_id = ? AND period_type = ? AND period_start = ?",
        [formulaId, salesmanId, periodType, periodStart]
      );

      if (existingRows && existingRows.length > 0) {
        const existingRow = existingRows[0] as Record<string, unknown>;
        const existingId = existingRow.id as string;

        if (mergeMode === "accumulate") {
          const newQuantity = Number(existingRow.quantity) + quantity;
          const newRevenue = Number(existingRow.revenue) + revenue;
          await query(
            "UPDATE formula_sales SET quantity = ?, revenue = ?, updated_at = ? WHERE id = ?",
            [newQuantity, newRevenue, now(), existingId]
          );
          succeeded++;
          results.push({
            index: i,
            status: "merged",
            recordId: existingId,
            formulaCode,
            salesmanName,
            action: "accumulated",
            message: "已累加到已有记录"
          });
        } else if (mergeMode === "replace") {
          await query(
            "UPDATE formula_sales SET quantity = ?, revenue = ?, notes = ?, updated_at = ? WHERE id = ?",
            [quantity, revenue, notes || null, now(), existingId]
          );
          succeeded++;
          results.push({
            index: i,
            status: "merged",
            recordId: existingId,
            formulaCode,
            salesmanName,
            action: "replaced",
            message: "已替换已有记录"
          });
        }
      } else {
        const id = generateId();
        await query(
          `INSERT INTO formula_sales (id, formula_id, salesman_id, period_type, period_start, period_end, quantity, revenue, notes, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, formulaId, salesmanId, periodType, periodStart, periodEnd, quantity, revenue, notes || null, userId, now(), now()]
        );
        succeeded++;
        results.push({
          index: i,
          status: "success",
          recordId: id,
          formulaCode,
          salesmanName,
          action: "created",
          message: "新建成功"
        });
      }
    }

    res.json(success({
      total: records.length,
      succeeded,
      failed,
      skipped,
      results
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "批量录入销量失败";
    res.status(500).json({ success: false, error: { message: msg, code: "INTERNAL_ERROR" } });
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
