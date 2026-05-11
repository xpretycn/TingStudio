import { Request, Response } from "express";
import { query } from "../config/database-better-sqlite3.js";
import {
  generateId,
  now,
  success,
  successWithPagination,
  buildPagination,
  rowToCamelCase,
  rowsToCamelCase,
  safeJsonParse,
  buildContentDisposition,
} from "../utils/helpers.js";
import { exportReportToPdf } from "../utils/reportPdfExporter.js";
import { exportReportToExcel } from "../utils/reportExcelExporter.js";
import { aiService } from "../services/ai/AIService.js";

async function getUserRole(userId: string): Promise<string> {
  try {
    const [[user]]: any[][] = await query("SELECT role FROM users WHERE id = ?", [userId]);
    return user?.role || "formulist";
  } catch {
    return "formulist";
  }
}

export async function getReportList(req: any, res: Response) {
  try {
    const { type, status, startDate, endDate, generatedBy, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));
    const userRole = await getUserRole(req.user.userId);

    let whereSql = "WHERE 1=1";
    const params: any[] = [];

    if (type) { whereSql += " AND r.type = ?"; params.push(type); }
    if (status) { whereSql += " AND r.status = ?"; params.push(status); }
    if (generatedBy) { whereSql += " AND r.generated_by = ?"; params.push(generatedBy); }
    if (startDate) { whereSql += " AND r.period_start >= ?"; params.push(startDate); }
    if (endDate) { whereSql += " AND r.period_end <= ?"; params.push(endDate); }

    if (userRole === "formulist") {
      whereSql += " AND (r.created_by = ? OR r.status = 'published')";
      params.push(req.user.userId);
    }

    const [list]: any[] = await query(
      `SELECT r.*, u.username as creator_name FROM reports r LEFT JOIN users u ON r.created_by = u.id ${whereSql} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, size, offset]
    );

    const [countResult]: any[] = await query(
      `SELECT COUNT(*) as total FROM reports r ${whereSql}`,
      params
    );

    const formattedList = list.map((row: any) => ({
      ...rowToCamelCase(row),
      dataJson: safeJsonParse(row.data_json, {}),
    }));

    res.json(successWithPagination(formattedList, countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取报告列表失败", error: error.message });
  }
}

export async function getReportById(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [[report]]: any[][] = await query(
      `SELECT r.*, u.username as creator_name FROM reports r LEFT JOIN users u ON r.created_by = u.id WHERE r.id = ?`,
      [id]
    );

    if (!report) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    const userRole = await getUserRole(req.user.userId);
    if (userRole === "formulist" && report.created_by !== req.user.userId && report.status !== "published") {
      return res.status(403).json({ success: false, message: "无权查看此报告" });
    }

    res.json(success({
      ...rowToCamelCase(report),
      dataJson: safeJsonParse(report.data_json, {}),
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取报告详情失败", error: error.message });
  }
}

export async function generateReport(req: any, res: Response) {
  try {
    const userRole = await getUserRole(req.user.userId);
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, message: "仅管理员可生成报告" });
    }

    const { type, periodStart, periodEnd, includePlans, includeAIAnalysis } = req.body;
    const userId = req.user.userId;

    if (!type || !periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: "缺少必要参数: type, periodStart, periodEnd" });
    }

    const dataJson = await aggregateReportData(type, periodStart, periodEnd, includePlans, includeAIAnalysis);

    const title = type === "weekly"
      ? `TingStudio 第${getWeekNumber(periodStart)}周工作报告`
      : `TingStudio ${periodStart.substring(0, 7).replace("-", "年")}月工作报告`;

    const id = generateId();
    await query(
      `INSERT INTO reports (id, type, title, period_start, period_end, status, data_json, generated_by, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, 'manual', ?, ?, ?)`,
      [id, type, title, periodStart, periodEnd, JSON.stringify(dataJson), userId, now(), now()]
    );

    const [[created]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);
    res.status(201).json(success({
      ...rowToCamelCase(created),
      dataJson: safeJsonParse(created.data_json, {}),
    }, "报告生成成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "生成报告失败", error: error.message });
  }
}

export async function updateReport(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { title, dataJson, status } = req.body;

    const [[existing]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    const userRole = await getUserRole(req.user.userId);
    if (userRole === "formulist" && existing.created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: "无权编辑此报告" });
    }

    if (userRole === "formulist" && dataJson !== undefined) {
      const existingData = safeJsonParse(existing.data_json, {});
      const allowedKeys = ["plans"];
      const newData = typeof dataJson === "string" ? JSON.parse(dataJson) : dataJson;
      for (const key of Object.keys(newData)) {
        if (!allowedKeys.includes(key)) {
          delete newData[key];
        }
      }
      const mergedData = { ...existingData, ...newData };
      req.body.dataJson = mergedData;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { updates.push("title = ?"); params.push(title); }
    if (req.body.dataJson !== undefined) { updates.push("data_json = ?"); params.push(JSON.stringify(req.body.dataJson)); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "没有需要更新的字段" });
    }

    updates.push("updated_at = ?");
    params.push(now());
    params.push(id);

    await query(`UPDATE reports SET ${updates.join(", ")} WHERE id = ?`, params);

    const [[updated]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);
    res.json(success({
      ...rowToCamelCase(updated),
      dataJson: safeJsonParse(updated.data_json, {}),
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新报告失败", error: error.message });
  }
}

export async function deleteReport(req: any, res: Response) {
  const startTime = Date.now()
  console.log('\n[ReportController] ========== 报告删除请求开始 ==========')
  console.log(`[ReportController] 📥 请求参数: id=${req.params?.id}`)
  console.log(`[ReportController] 👤 请求用户: userId=${req.user?.userId}, username=${req.user?.username || 'N/A'}`)

  try {
    const { id } = req.params;

    console.log(`[ReportController] 🔍 步骤1: 查询报告是否存在 (id=${id})...`)
    const [[existing]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);

    if (!existing) {
      console.warn(`[ReportController] ⚠️ 步骤1结果: 报告不存在! id=${id}`)
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    console.log(`[ReportController] ✅ 步骤1结果: 报告已找到`)
    console.log(`[ReportController]   - id: ${existing.id}`)
    console.log(`[ReportController]   - title: ${existing.title}`)
    console.log(`[ReportController]   - type: ${existing.type}`)
    console.log(`[ReportController]   - status: ${existing.status}`)
    console.log(`[ReportController]   - created_by: ${existing.created_by}`)
    console.log(`[ReportController]   - created_at: ${existing.created_at}`)

    console.log(`[ReportController] 🔐 步骤2: 验证用户权限...`)
    const userRole = await getUserRole(req.user.userId);
    console.log(`[ReportController]   - 用户角色: ${userRole}`)
    console.log(`[ReportController]   - 用户ID: ${req.user?.userId}`)
    console.log(`[ReportController]   - 报告创建者ID: ${existing.created_by}`)

    if (userRole === "admin" || existing.created_by === req.user.userId) {
      console.log(`[ReportController] ✅ 步骤2结果: 权限验证通过 (role=${userRole}, isOwner=${existing.created_by === req.user.userId})`)

      console.log(`[ReportController] 🗑️  步骤3: 执行删除操作 (id=${id})...`)
      const result = await query("DELETE FROM reports WHERE id = ?", [id]);
      console.log(`[ReportController] ✅ 步骤3结果: 删除执行成功`)
      console.log(`[ReportController]   - 影响行数: ${JSON.stringify(result)}`)

      const elapsed = Date.now() - startTime
      console.log(`[ReportController] ✅ ========== 删除成功 (耗时 ${elapsed}ms) ==========\n`)
      return res.json(success({ id }, "删除成功"));
    }

    console.warn(`[ReportController] ❌ 步骤2结果: 权限验证失败!`)
    console.warn(`[ReportController]   - 原因: role="${userRole}" !== "admin" 且 created_by="${existing.created_by}" !== userId="${req.user?.userId}"`)
    return res.status(403).json({ success: false, message: "仅管理员或报告创建者可删除报告" });
  } catch (error: any) {
    console.error(`[ReportController] ❌ ========== 删除异常 ==========`)
    console.error(`[ReportController] 错误类型: ${error.name}`)
    console.error(`[ReportController] 错误消息: ${error.message}`)
    console.error(`[ReportController] 错误堆栈:`, error.stack)
    res.status(500).json({ success: false, message: "删除报告失败", error: error.message });
  }
}

export async function publishReport(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [[existing]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    const userRole = await getUserRole(req.user.userId);
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, message: "仅管理员可发布报告" });
    }

    await query(
      "UPDATE reports SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?",
      [now(), now(), id]
    );

    const [[updated]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);
    res.json(success({
      ...rowToCamelCase(updated),
      dataJson: safeJsonParse(updated.data_json, {}),
    }, "报告已发布"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "发布报告失败", error: error.message });
  }
}

export async function getWeeklyData(req: any, res: Response) {
  try {
    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: "缺少时间范围参数" });
    }
    const data = await aggregateReportData("weekly", periodStart as string, periodEnd as string, false, false);
    res.json(success(data));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取周报数据失败", error: error.message });
  }
}

export async function getMonthlyData(req: any, res: Response) {
  try {
    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: "缺少时间范围参数" });
    }
    const data = await aggregateReportData("monthly", periodStart as string, periodEnd as string, false, false);
    res.json(success(data));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取月报数据失败", error: error.message });
  }
}

export async function getTargetList(req: any, res: Response) {
  try {
    const { periodType } = req.query;
    let whereSql = "WHERE 1=1";
    const params: any[] = [];
    if (periodType) { whereSql += " AND t.period_type = ?"; params.push(periodType); }

    const [list]: any[] = await query(
      `SELECT t.*, u.username as creator_name FROM report_targets t LEFT JOIN users u ON t.created_by = u.id ${whereSql} ORDER BY t.created_at DESC`,
      params
    );

    const formattedList = list.map((row: any) => ({
      ...rowToCamelCase(row),
      targetsJson: safeJsonParse(row.targets_json, {}),
    }));

    res.json(success(formattedList));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取目标列表失败", error: error.message });
  }
}

export async function createTarget(req: any, res: Response) {
  try {
    const { periodType, periodStart, periodEnd, targetsJson } = req.body;
    const userId = req.user.userId;
    const id = generateId();

    await query(
      `INSERT INTO report_targets (id, period_type, period_start, period_end, targets_json, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, periodType, periodStart, periodEnd, JSON.stringify(targetsJson || {}), userId, now(), now()]
    );

    const [[created]]: any[][] = await query("SELECT * FROM report_targets WHERE id = ?", [id]);
    res.status(201).json(success({
      ...rowToCamelCase(created),
      targetsJson: safeJsonParse(created.targets_json, {}),
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "创建目标失败", error: error.message });
  }
}

export async function updateTarget(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { periodType, periodStart, periodEnd, targetsJson } = req.body;

    const [[existing]]: any[][] = await query("SELECT * FROM report_targets WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "目标不存在" });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (periodType !== undefined) { updates.push("period_type = ?"); params.push(periodType); }
    if (periodStart !== undefined) { updates.push("period_start = ?"); params.push(periodStart); }
    if (periodEnd !== undefined) { updates.push("period_end = ?"); params.push(periodEnd); }
    if (targetsJson !== undefined) { updates.push("targets_json = ?"); params.push(JSON.stringify(targetsJson)); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "没有需要更新的字段" });
    }

    updates.push("updated_at = ?");
    params.push(now());
    params.push(id);

    await query(`UPDATE report_targets SET ${updates.join(", ")} WHERE id = ?`, params);

    const [[updated]]: any[][] = await query("SELECT * FROM report_targets WHERE id = ?", [id]);
    res.json(success({
      ...rowToCamelCase(updated),
      targetsJson: safeJsonParse(updated.targets_json, {}),
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新目标失败", error: error.message });
  }
}

export async function deleteTarget(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [[existing]]: any[][] = await query("SELECT * FROM report_targets WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "目标不存在" });
    }
    await query("DELETE FROM report_targets WHERE id = ?", [id]);
    res.json(success({ id }, "删除成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "删除目标失败", error: error.message });
  }
}

export async function exportReportPdf(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [[report]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);

    if (!report) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    const reportData = {
      type: report.type,
      title: report.title,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      dataJson: safeJsonParse(report.data_json, {}),
    };

    const { buffer, fileName } = await exportReportToPdf(reportData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", buildContentDisposition(fileName));
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "导出PDF失败", error: error.message });
  }
}

export async function exportReportExcel(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [[report]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);

    if (!report) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    const reportData = {
      type: report.type,
      title: report.title,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      dataJson: safeJsonParse(report.data_json, {}),
    };

    const { buffer, fileName } = await exportReportToExcel(reportData);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", buildContentDisposition(fileName));
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "导出Excel失败", error: error.message });
  }
}

export async function compareReports(req: any, res: Response) {
  try {
    const { reportId1, reportId2 } = req.body;
    if (!reportId1 || !reportId2) {
      return res.status(400).json({ success: false, message: "请提供两个报告ID" });
    }

    const [[report1]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [reportId1]);
    const [[report2]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [reportId2]);

    if (!report1 || !report2) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    const data1 = safeJsonParse(report1.data_json, {}) as any;
    const data2 = safeJsonParse(report2.data_json, {}) as any;

    const diff: any = {};

    if (data1.formula && data2.formula) {
      diff.formula = {
        newFormulaCount: { report1: data1.formula.newFormulaCount ?? 0, report2: data2.formula.newFormulaCount ?? 0, diff: (data2.formula.newFormulaCount ?? 0) - (data1.formula.newFormulaCount ?? 0) },
        completedFormulaCount: { report1: data1.formula.completedFormulaCount ?? 0, report2: data2.formula.completedFormulaCount ?? 0, diff: (data2.formula.completedFormulaCount ?? 0) - (data1.formula.completedFormulaCount ?? 0) },
        completionRate: { report1: data1.formula.completionRate ?? 0, report2: data2.formula.completionRate ?? 0, diff: (data2.formula.completionRate ?? 0) - (data1.formula.completionRate ?? 0) },
      };
    }

    if (data1.sales && data2.sales) {
      diff.sales = {
        weeklyQuantity: { report1: data1.sales.weeklyQuantity ?? 0, report2: data2.sales.weeklyQuantity ?? 0, diff: (data2.sales.weeklyQuantity ?? 0) - (data1.sales.weeklyQuantity ?? 0) },
        weeklyRevenue: { report1: data1.sales.weeklyRevenue ?? 0, report2: data2.sales.weeklyRevenue ?? 0, diff: (data2.sales.weeklyRevenue ?? 0) - (data1.sales.weeklyRevenue ?? 0) },
        quantityGrowthRate: { report1: data1.sales.quantityGrowthRate ?? 0, report2: data2.sales.quantityGrowthRate ?? 0, diff: (data2.sales.quantityGrowthRate ?? 0) - (data1.sales.quantityGrowthRate ?? 0) },
        revenueGrowthRate: { report1: data1.sales.revenueGrowthRate ?? 0, report2: data2.sales.revenueGrowthRate ?? 0, diff: (data2.sales.revenueGrowthRate ?? 0) - (data1.sales.revenueGrowthRate ?? 0) },
      };
    }

    if (data1.monthlySummary && data2.monthlySummary) {
      diff.monthlySummary = {
        monthlyQuantity: { report1: data1.monthlySummary.monthlyQuantity ?? 0, report2: data2.monthlySummary.monthlyQuantity ?? 0, diff: (data2.monthlySummary.monthlyQuantity ?? 0) - (data1.monthlySummary.monthlyQuantity ?? 0) },
        monthlyRevenue: { report1: data1.monthlySummary.monthlyRevenue ?? 0, report2: data2.monthlySummary.monthlyRevenue ?? 0, diff: (data2.monthlySummary.monthlyRevenue ?? 0) - (data1.monthlySummary.monthlyRevenue ?? 0) },
      };
    }

    res.json(success({
      report1: { ...rowToCamelCase(report1), dataJson: data1 },
      report2: { ...rowToCamelCase(report2), dataJson: data2 },
      diff,
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "报告对比失败", error: error.message });
  }
}

export async function getAIAnalysis(req: any, res: Response) {
  try {
    const { reportData, provider } = req.body;
    if (!reportData) {
      return res.status(400).json({ success: false, message: "请提供报告数据" });
    }

    const availableModels = aiService.getAvailableModels();
    if (availableModels.length === 0) {
      return res.status(503).json({ success: false, message: "未配置AI模型，请在环境变量中设置API Key" });
    }

    const zhipuModel = availableModels.find(m => m.provider === 'zhipu');
    const defaultProvider = zhipuModel ? 'zhipu' : availableModels[0].provider;
    const selectedProvider = provider || defaultProvider;

    console.log(`[ReportController] 🤖 AI分析使用模型: ${selectedProvider} (${zhipuModel?.model || availableModels[0]?.model})`);

    const prompt = `你是一位专业的数据分析顾问。请根据以下报告数据，提供深入的分析和建议：

报告类型：${reportData.type === "weekly" ? "周报" : "月报"}
统计周期：${reportData.periodStart} ~ ${reportData.periodEnd}

配方数据：
- 新增配方数：${reportData.dataJson?.formula?.newFormulaCount ?? 0}
- 完成配方数：${reportData.dataJson?.formula?.completedFormulaCount ?? 0}
- 完成率：${reportData.dataJson?.formula?.completionRate ?? 0}%

销售数据：
- 销售量：${reportData.dataJson?.sales?.weeklyQuantity ?? 0}
- 销售额：${reportData.dataJson?.sales?.weeklyRevenue ?? 0}
- 销量增长率：${reportData.dataJson?.sales?.quantityGrowthRate ?? 0}%
- 销售额增长率：${reportData.dataJson?.sales?.revenueGrowthRate ?? 0}%

请从以下角度进行分析：
1. 整体表现评估
2. 关键指标分析
3. 潜在问题识别
4. 改进建议
5. 下一步行动建议

请用中文回答，结构清晰，重点突出。`;

    const result = await aiService.chatCompletion(selectedProvider, [
      { role: "system", content: "你是一位专业的数据分析顾问，擅长从数据中发现问题并提出改进建议。" },
      { role: "user", content: prompt },
    ], {
      temperature: 0.7,
      maxTokens: 2048,
      callType: reportData.type === "weekly" ? "weekly-report" : "monthly-report",
      userId: (req as any).user?.userId,
      requestSummary: `${reportData.type === "weekly" ? "周报" : "月报"}AI分析: ${reportData.periodStart} ~ ${reportData.periodEnd}`,
    });

    res.json(success({
      analysis: result.content,
      model: result.model,
      usage: result.usage,
      provider: selectedProvider,
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "AI分析失败", error: error.message });
  }
}

export async function saveAIAnalysis(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { aiAnalysis } = req.body;

    if (!aiAnalysis) {
      return res.status(400).json({ success: false, message: "请提供AI分析数据" });
    }

    const [[existing]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }

    const userRole = await getUserRole(req.user.userId);
    if (userRole === "formulist" && existing.created_by !== req.user.userId) {
      return res.status(403).json({ success: false, message: "无权编辑此报告" });
    }

    const currentData = safeJsonParse(existing.data_json, {});
    const updatedData = { ...currentData, aiAnalysis };

    await query(
      "UPDATE reports SET data_json = ?, updated_at = ? WHERE id = ?",
      [JSON.stringify(updatedData), now(), id]
    );

    const [[updated]]: any[][] = await query("SELECT * FROM reports WHERE id = ?", [id]);
    res.json(success({
      ...rowToCamelCase(updated),
      dataJson: safeJsonParse(updated.data_json, {}),
    }, "AI分析保存成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "保存AI分析失败", error: error.message });
  }
}

export async function aggregateReportData(
  type: string,
  periodStart: string,
  periodEnd: string,
  _includePlans: boolean,
  _includeAI: boolean
): Promise<any> {
  const [formulaResult]: any[] = await query(
    `SELECT COUNT(*) as total FROM formulas WHERE created_at >= ? AND created_at <= ?`,
    [periodStart, periodEnd + "T23:59:59"]
  );
  const [completedResult]: any[] = await query(
    `SELECT COUNT(*) as total FROM formulas WHERE updated_at >= ? AND updated_at <= ?`,
    [periodStart, periodEnd + "T23:59:59"]
  );
  const [totalFormulas]: any[] = await query("SELECT COUNT(*) as total FROM formulas");

  const [salesSummary]: any[] = await query(
    `SELECT COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_revenue
     FROM formula_sales fs WHERE fs.period_start >= ? AND fs.period_start <= ?`,
    [periodStart, periodEnd]
  );

  const [topFormulas]: any[] = await query(
    `SELECT f.id as formula_id, f.name as formula_name, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_revenue
     FROM formula_sales fs LEFT JOIN formulas f ON fs.formula_id = f.id
     WHERE fs.period_start >= ? AND fs.period_start <= ?
     GROUP BY fs.formula_id ORDER BY total_quantity DESC LIMIT 5`,
    [periodStart, periodEnd]
  );

  const [topSalesmen]: any[] = await query(
    `SELECT sm.id as salesman_id, sm.name as salesman_name, SUM(fs.quantity) as total_quantity, SUM(fs.revenue) as total_revenue
     FROM formula_sales fs LEFT JOIN salesmen sm ON fs.salesman_id = sm.id
     WHERE fs.period_start >= ? AND fs.period_start <= ?
     GROUP BY fs.salesman_id ORDER BY total_revenue DESC LIMIT 5`,
    [periodStart, periodEnd]
  );

  const [dailyFormulaTrend]: any[] = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as new_count FROM formulas
     WHERE created_at >= ? AND created_at <= ? GROUP BY DATE(created_at) ORDER BY date`,
    [periodStart, periodEnd + "T23:59:59"]
  );
  const [dailyFormulaCompleted]: any[] = await query(
    `SELECT DATE(updated_at) as date, COUNT(*) as completed_count FROM formulas
     WHERE updated_at >= ? AND updated_at <= ? GROUP BY DATE(updated_at) ORDER BY date`,
    [periodStart, periodEnd + "T23:59:59"]
  );

  const dateMap = new Map<string, { date: string; new: number; completed: number }>();
  for (const row of dailyFormulaTrend) {
    dateMap.set(row.date, { date: row.date, new: row.new_count, completed: 0 });
  }
  for (const row of dailyFormulaCompleted) {
    const existing = dateMap.get(row.date);
    if (existing) {
      existing.completed = row.completed_count;
    } else {
      dateMap.set(row.date, { date: row.date, new: 0, completed: row.completed_count });
    }
  }
  const dailyFormulaTrendData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const [statusDistribution]: any[] = await query(
    `SELECT salesman_name as status, COUNT(*) as count FROM formulas GROUP BY salesman_name`
  );
  const statusDistributionData = statusDistribution.map((row: any) => ({
    status: row.status || "未分配",
    count: row.count,
  }));

  const [dailySalesTrend]: any[] = await query(
    `SELECT fs.period_start as date, SUM(fs.quantity) as quantity, SUM(fs.revenue) as revenue
     FROM formula_sales fs WHERE fs.period_start >= ? AND fs.period_start <= ?
     GROUP BY fs.period_start ORDER BY fs.period_start`,
    [periodStart, periodEnd]
  );

  const prevPeriodStart = getPreviousPeriodStart(type, periodStart, periodEnd);
  const [prevSalesSummary]: any[] = await query(
    `SELECT COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_revenue
     FROM formula_sales fs WHERE fs.period_start >= ? AND fs.period_start <= ?`,
    [prevPeriodStart, periodStart]
  );

  const currentQuantity = salesSummary[0]?.total_quantity || 0;
  const currentRevenue = salesSummary[0]?.total_revenue || 0;
  const prevQuantity = prevSalesSummary[0]?.total_quantity || 0;
  const prevRevenue = prevSalesSummary[0]?.total_revenue || 0;
  const quantityGrowthRate = prevQuantity > 0 ? Math.round(((currentQuantity - prevQuantity) / prevQuantity) * 1000) / 10 : 0;
  const revenueGrowthRate = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0;

  const weeklyComparisonData = await getWeeklyComparison(periodStart, periodEnd, type);

  const newFormulaCount = formulaResult[0]?.total || 0;
  const completedFormulaCount = completedResult[0]?.total || 0;
  const completionRate = newFormulaCount > 0 ? Math.round((completedFormulaCount / newFormulaCount) * 100) : 0;

  const data: any = {
    formula: {
      newFormulaCount,
      completedFormulaCount,
      completionRate,
      totalFormulaCount: totalFormulas[0]?.total || 0,
      dailyFormulaTrend: dailyFormulaTrendData,
      statusDistribution: statusDistributionData,
      incompleteReasons: [],
    },
    sales: {
      weeklyQuantity: currentQuantity,
      weeklyRevenue: currentRevenue,
      quantityGrowthRate,
      revenueGrowthRate,
      dailySalesTrend: rowsToCamelCase(dailySalesTrend),
      topFormulas: rowsToCamelCase(topFormulas),
      weeklyComparison: weeklyComparisonData,
    },
    plans: {
      nextWeekPlans: [],
      resourceNeeds: [],
      expectedTargets: [],
      riskAssessment: [],
    },
  };

  if (type === "monthly") {
    const [monthlySummary]: any[] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_revenue
       FROM formula_sales fs WHERE fs.period_start >= ? AND fs.period_start <= ?`,
      [periodStart, periodEnd]
    );

    const weeklyBreakdownData = await getWeeklyBreakdown(periodStart, periodEnd);

    const [formulaTypeDistribution]: any[] = await query(
      `SELECT f.name as type, SUM(fs.quantity) as quantity, SUM(fs.revenue) as revenue
       FROM formula_sales fs LEFT JOIN formulas f ON fs.formula_id = f.id
       WHERE fs.period_start >= ? AND fs.period_start <= ?
       GROUP BY fs.formula_id ORDER BY revenue DESC`,
      [periodStart, periodEnd]
    );

    const monthlyTrendData = await getMonthlyTrend(periodStart);

    const yearStart = periodStart.substring(0, 4) + "-01-01";
    const prevYearStart = (parseInt(periodStart.substring(0, 4)) - 1) + "-01-01";
    const prevYearEnd = (parseInt(periodStart.substring(0, 4)) - 1) + "-12-31";
    const [prevYearSales]: any[] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_revenue
       FROM formula_sales fs WHERE fs.period_start >= ? AND fs.period_start <= ?`,
      [prevYearStart, prevYearEnd]
    );
    const [prevYearFormulas]: any[] = await query(
      `SELECT COUNT(*) as total FROM formulas WHERE created_at >= ? AND created_at <= ?`,
      [yearStart, periodEnd + "T23:59:59"]
    );
    const [prevYearFormulasOld]: any[] = await query(
      `SELECT COUNT(*) as total FROM formulas WHERE created_at >= ? AND created_at <= ?`,
      [prevYearStart, prevYearEnd + "T23:59:59"]
    );

    const monthStart = periodStart.substring(0, 7) + "-01";
    const prevMonthDate = new Date(monthStart);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthStart = prevMonthDate.toISOString().split("T")[0];
    const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).toISOString().split("T")[0];
    const [prevMonthSales]: any[] = await query(
      `SELECT COALESCE(SUM(fs.quantity), 0) as total_quantity, COALESCE(SUM(fs.revenue), 0) as total_revenue
       FROM formula_sales fs WHERE fs.period_start >= ? AND fs.period_start <= ?`,
      [prevMonthStart, prevMonthEnd]
    );
    const [prevMonthFormulas]: any[] = await query(
      `SELECT COUNT(*) as total FROM formulas WHERE created_at >= ? AND created_at <= ?`,
      [prevMonthStart, prevMonthEnd + "T23:59:59"]
    );

    const mQuantity = monthlySummary[0]?.total_quantity || 0;
    const mRevenue = monthlySummary[0]?.total_revenue || 0;
    const pmQuantity = prevMonthSales[0]?.total_quantity || 0;
    const pmRevenue = prevMonthSales[0]?.total_revenue || 0;
    const pmFormulaCount = prevMonthFormulas[0]?.total || 0;

    const [targetResult]: any[] = await query(
      `SELECT targets_json FROM report_targets WHERE period_type = 'quarterly' AND period_start <= ? AND period_end >= ? LIMIT 1`,
      [periodEnd, periodStart]
    );
    const targetsJson = targetResult?.[0]?.targets_json ? safeJsonParse(targetResult[0].targets_json, {}) : {};
    const quarterlyTargets = buildQuarterlyTargets(targetsJson, mQuantity, mRevenue, newFormulaCount);

    data.monthlySummary = {
      monthlyNewFormulas: newFormulaCount,
      monthlyCompletedFormulas: completedFormulaCount,
      monthlyCompletionRate: completionRate,
      monthlyQuantity: mQuantity,
      monthlyRevenue: mRevenue,
      weeklyBreakdown: weeklyBreakdownData,
      formulaTypeDistribution: rowsToCamelCase(formulaTypeDistribution),
    };

    data.trend = {
      monthlyTrend: monthlyTrendData,
      yearOverYear: {
        quantity: prevYearSales[0]?.total_quantity > 0 ? Math.round(((mQuantity - prevYearSales[0].total_quantity) / prevYearSales[0].total_quantity) * 1000) / 10 : 0,
        revenue: prevYearSales[0]?.total_revenue > 0 ? Math.round(((mRevenue - prevYearSales[0].total_revenue) / prevYearSales[0].total_revenue) * 1000) / 10 : 0,
        formulaCount: prevYearFormulasOld[0]?.total > 0 ? Math.round(((prevYearFormulas[0]?.total || 0) - prevYearFormulasOld[0].total) / prevYearFormulasOld[0].total * 1000) / 10 : 0,
      },
      monthOverMonth: {
        quantity: pmQuantity > 0 ? Math.round(((mQuantity - pmQuantity) / pmQuantity) * 1000) / 10 : 0,
        revenue: pmRevenue > 0 ? Math.round(((mRevenue - pmRevenue) / pmRevenue) * 1000) / 10 : 0,
        formulaCount: pmFormulaCount > 0 ? Math.round(((newFormulaCount - pmFormulaCount) / pmFormulaCount) * 1000) / 10 : 0,
      },
    };

    data.targets = {
      quarterlyTargets,
      quarterlyProgress: quarterlyTargets.length > 0 ? Math.round(quarterlyTargets.reduce((sum: number, t: any) => sum + t.rate, 0) / quarterlyTargets.length) : 0,
    };

    data.team = {
      salesmanPerformance: rowsToCamelCase(topSalesmen),
      collaborationMetrics: { crossTeamProjects: 0, avgResponseTime: "" },
    };

    data.issues = {
      issues: [],
      suggestions: [],
    };
  }

  return data;
}

function getPreviousPeriodStart(type: string, periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - diffDays);
  return prevStart.toISOString().split("T")[0];
}

async function getWeeklyComparison(periodStart: string, periodEnd: string, type: string): Promise<any[]> {
  const result: any[] = [];
  const start = new Date(periodStart);
  const numWeeks = type === "monthly" ? 5 : 4;
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekEnd = new Date(start);
    weekEnd.setDate(weekEnd.getDate() - (i * 7) + 6);
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const ws = weekStart.toISOString().split("T")[0];
    const we = weekEnd.toISOString().split("T")[0];
    const [weekData]: any[] = await query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(revenue), 0) as revenue
       FROM formula_sales WHERE period_start >= ? AND period_start <= ?`,
      [ws, we]
    );
    result.push({
      week: `第${numWeeks - i}周`,
      quantity: weekData[0]?.quantity || 0,
      revenue: weekData[0]?.revenue || 0,
    });
  }
  return result;
}

async function getWeeklyBreakdown(periodStart: string, periodEnd: string): Promise<any[]> {
  const result: any[] = [];
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  let weekNum = 1;
  let current = new Date(start);
  while (current <= end) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());
    const ws = current.toISOString().split("T")[0];
    const we = weekEnd.toISOString().split("T")[0];
    const [weekData]: any[] = await query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(revenue), 0) as revenue
       FROM formula_sales WHERE period_start >= ? AND period_start <= ?`,
      [ws, we]
    );
    const [formulaCount]: any[] = await query(
      `SELECT COUNT(*) as total FROM formulas WHERE created_at >= ? AND created_at <= ?`,
      [ws, we + "T23:59:59"]
    );
    result.push({
      week: `第${weekNum}周`,
      quantity: weekData[0]?.quantity || 0,
      revenue: weekData[0]?.revenue || 0,
      formulaCount: formulaCount[0]?.total || 0,
    });
    current.setDate(current.getDate() + 7);
    weekNum++;
  }
  return result;
}

async function getMonthlyTrend(currentPeriodStart: string): Promise<any[]> {
  const result: any[] = [];
  const current = new Date(currentPeriodStart);
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const monthStart = monthDate.toISOString().split("T")[0];
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split("T")[0];
    const [monthData]: any[] = await query(
      `SELECT COALESCE(SUM(quantity), 0) as quantity, COALESCE(SUM(revenue), 0) as revenue
       FROM formula_sales WHERE period_start >= ? AND period_start <= ?`,
      [monthStart, monthEnd]
    );
    const [formulaCount]: any[] = await query(
      `SELECT COUNT(*) as total FROM formulas WHERE created_at >= ? AND created_at <= ?`,
      [monthStart, monthEnd + "T23:59:59"]
    );
    result.push({
      month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      quantity: monthData[0]?.quantity || 0,
      revenue: monthData[0]?.revenue || 0,
      formulaCount: formulaCount[0]?.total || 0,
    });
  }
  return result;
}

function buildQuarterlyTargets(targetsJson: any, currentQuantity: number, currentRevenue: number, currentFormulaCount: number): any[] {
  const targets = targetsJson?.targets || [];
  if (targets.length === 0) {
    return [
      { metric: "配方完成", target: 0, actual: currentFormulaCount, rate: 0 },
      { metric: "销售量", target: 0, actual: currentQuantity, rate: 0 },
      { metric: "销售额", target: 0, actual: currentRevenue, rate: 0 },
    ];
  }
  return targets.map((t: any) => {
    let actual = 0;
    if (t.metric === "配方完成" || t.metric === "formulaCount") actual = currentFormulaCount;
    else if (t.metric === "销售量" || t.metric === "quantity") actual = currentQuantity;
    else if (t.metric === "销售额" || t.metric === "revenue") actual = currentRevenue;
    const target = t.target || t.value || 0;
    const rate = target > 0 ? Math.round((actual / target) * 100) : 0;
    return { metric: t.metric, target, actual, rate };
  });
}

export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil((diff / oneWeek) + 1);
}
