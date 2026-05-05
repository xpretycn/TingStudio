import XLSX from "xlsx";

export async function exportReportToExcel(
  report: { type: string; title: string; periodStart: string; periodEnd: string; dataJson: any }
): Promise<{ buffer: Buffer; fileName: string }> {
  const { type, title, periodStart, periodEnd, dataJson } = report;
  const workbook = XLSX.utils.book_new();

  const overviewData: any[][] = [
    ["报告概览"],
    [""],
    ["报告标题", title],
    ["报告类型", type === "weekly" ? "周报" : "月报"],
    ["统计周期", `${periodStart} ~ ${periodEnd}`],
    ["生成时间", new Date().toLocaleString("zh-CN")],
    [""],
    ["关键指标"],
  ];

  if (dataJson.formula) {
    overviewData.push(["新增配方数", dataJson.formula.newFormulaCount ?? 0]);
    overviewData.push(["完成配方数", dataJson.formula.completedFormulaCount ?? 0]);
    overviewData.push(["完成率", (dataJson.formula.completionRate ?? 0) + "%"]);
  }
  if (dataJson.sales) {
    overviewData.push(["销售量", dataJson.sales.weeklyQuantity ?? 0]);
    overviewData.push(["销售额", dataJson.sales.weeklyRevenue ?? 0]);
    overviewData.push(["销量增长率", (dataJson.sales.quantityGrowthRate ?? 0) + "%"]);
    overviewData.push(["销售额增长率", (dataJson.sales.revenueGrowthRate ?? 0) + "%"]);
  }
  if (type === "monthly" && dataJson.monthlySummary) {
    overviewData.push(["月销售量", dataJson.monthlySummary.monthlyQuantity ?? 0]);
    overviewData.push(["月销售额", dataJson.monthlySummary.monthlyRevenue ?? 0]);
  }

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet["!cols"] = [{ wch: 16 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "概览");

  if (dataJson.formula) {
    const formulaData: any[][] = [["配方数据"]];

    if (dataJson.formula.dailyFormulaTrend?.length > 0) {
      formulaData.push([""]);
      formulaData.push(["每日配方趋势"]);
      formulaData.push(["日期", "新增数", "完成数"]);
      for (const d of dataJson.formula.dailyFormulaTrend) {
        formulaData.push([d.date, d.new ?? 0, d.completed ?? 0]);
      }
    }

    if (dataJson.formula.statusDistribution?.length > 0) {
      formulaData.push([""]);
      formulaData.push(["状态分布"]);
      formulaData.push(["状态", "数量"]);
      for (const d of dataJson.formula.statusDistribution) {
        formulaData.push([d.status, d.count]);
      }
    }

    formulaData.push([""]);
    formulaData.push(["关键指标"]);
    formulaData.push(["新增配方数", dataJson.formula.newFormulaCount ?? 0]);
    formulaData.push(["完成配方数", dataJson.formula.completedFormulaCount ?? 0]);
    formulaData.push(["完成率", (dataJson.formula.completionRate ?? 0) + "%"]);
    formulaData.push(["配方总数", dataJson.formula.totalFormulaCount ?? 0]);

    const formulaSheet = XLSX.utils.aoa_to_sheet(formulaData);
    formulaSheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, formulaSheet, "配方数据");
  }

  if (dataJson.sales) {
    const salesData: any[][] = [["销售数据"]];

    if (dataJson.sales.dailySalesTrend?.length > 0) {
      salesData.push([""]);
      salesData.push(["每日销售趋势"]);
      salesData.push(["日期", "销量", "销售额"]);
      for (const d of dataJson.sales.dailySalesTrend) {
        salesData.push([d.date ?? d.periodStart ?? "", d.quantity ?? 0, d.revenue ?? 0]);
      }
    }

    if (dataJson.sales.topFormulas?.length > 0) {
      salesData.push([""]);
      salesData.push(["热销配方 TOP5"]);
      salesData.push(["配方名称", "销量", "销售额"]);
      for (const d of dataJson.sales.topFormulas) {
        salesData.push([d.formulaName ?? d.formula_name ?? "", d.totalQuantity ?? d.total_quantity ?? 0, d.totalRevenue ?? d.total_revenue ?? 0]);
      }
    }

    if (dataJson.sales.weeklyComparison?.length > 0) {
      salesData.push([""]);
      salesData.push(["周度对比"]);
      salesData.push(["周次", "销量", "销售额"]);
      for (const d of dataJson.sales.weeklyComparison) {
        salesData.push([d.week, d.quantity ?? 0, d.revenue ?? 0]);
      }
    }

    salesData.push([""]);
    salesData.push(["关键指标"]);
    salesData.push(["销售量", dataJson.sales.weeklyQuantity ?? 0]);
    salesData.push(["销售额", dataJson.sales.weeklyRevenue ?? 0]);
    salesData.push(["销量增长率", (dataJson.sales.quantityGrowthRate ?? 0) + "%"]);
    salesData.push(["销售额增长率", (dataJson.sales.revenueGrowthRate ?? 0) + "%"]);

    const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
    salesSheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, salesSheet, "销售数据");
  }

  if (dataJson.plans) {
    const plansData: any[][] = [["未来规划"]];

    if (dataJson.plans.nextWeekPlans?.length > 0) {
      plansData.push([""]);
      plansData.push(["下周计划"]);
      plansData.push(["计划内容", "优先级"]);
      for (const d of dataJson.plans.nextWeekPlans) {
        plansData.push([d.content ?? d.plan ?? "", d.priority ?? ""]);
      }
    }

    if (dataJson.plans.resourceNeeds?.length > 0) {
      plansData.push([""]);
      plansData.push(["资源需求"]);
      plansData.push(["名称", "描述"]);
      for (const d of dataJson.plans.resourceNeeds) {
        plansData.push([d.name ?? d.content ?? "", d.description ?? ""]);
      }
    }

    if (dataJson.plans.expectedTargets?.length > 0) {
      plansData.push([""]);
      plansData.push(["预期目标"]);
      plansData.push(["指标", "目标值"]);
      for (const d of dataJson.plans.expectedTargets) {
        plansData.push([d.metric ?? d.name ?? "", d.value ?? d.target ?? ""]);
      }
    }

    if (dataJson.plans.riskAssessment?.length > 0) {
      plansData.push([""]);
      plansData.push(["风险评估"]);
      plansData.push(["风险", "等级"]);
      for (const d of dataJson.plans.riskAssessment) {
        plansData.push([d.risk ?? d.content ?? "", d.level ?? d.severity ?? ""]);
      }
    }

    const plansSheet = XLSX.utils.aoa_to_sheet(plansData);
    plansSheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, plansSheet, "未来规划");
  }

  if (type === "monthly") {
    const monthlyData: any[][] = [["月度分析"]];

    if (dataJson.monthlySummary) {
      monthlyData.push([""]);
      monthlyData.push(["月度汇总指标"]);
      monthlyData.push(["月新增配方", dataJson.monthlySummary.monthlyNewFormulas ?? 0]);
      monthlyData.push(["月完成配方", dataJson.monthlySummary.monthlyCompletedFormulas ?? 0]);
      monthlyData.push(["月完成率", (dataJson.monthlySummary.monthlyCompletionRate ?? 0) + "%"]);
      monthlyData.push(["月销售量", dataJson.monthlySummary.monthlyQuantity ?? 0]);
      monthlyData.push(["月销售额", dataJson.monthlySummary.monthlyRevenue ?? 0]);

      if (dataJson.monthlySummary.weeklyBreakdown?.length > 0) {
        monthlyData.push([""]);
        monthlyData.push(["周度分解"]);
        monthlyData.push(["周次", "销量", "销售额", "配方数"]);
        for (const d of dataJson.monthlySummary.weeklyBreakdown) {
          monthlyData.push([d.week, d.quantity ?? 0, d.revenue ?? 0, d.formulaCount ?? 0]);
        }
      }
    }

    if (dataJson.trend) {
      monthlyData.push([""]);
      monthlyData.push(["趋势数据"]);

      if (dataJson.trend.monthlyTrend?.length > 0) {
        monthlyData.push([""]);
        monthlyData.push(["月度趋势"]);
        monthlyData.push(["月份", "销量", "销售额", "配方数"]);
        for (const d of dataJson.trend.monthlyTrend) {
          monthlyData.push([d.month, d.quantity ?? 0, d.revenue ?? 0, d.formulaCount ?? 0]);
        }
      }

      if (dataJson.trend.yearOverYear) {
        monthlyData.push([""]);
        monthlyData.push(["同比增长"]);
        monthlyData.push(["销量增长", (dataJson.trend.yearOverYear.quantity ?? 0) + "%"]);
        monthlyData.push(["销售额增长", (dataJson.trend.yearOverYear.revenue ?? 0) + "%"]);
        monthlyData.push(["配方数增长", (dataJson.trend.yearOverYear.formulaCount ?? 0) + "%"]);
      }

      if (dataJson.trend.monthOverMonth) {
        monthlyData.push([""]);
        monthlyData.push(["环比增长"]);
        monthlyData.push(["销量增长", (dataJson.trend.monthOverMonth.quantity ?? 0) + "%"]);
        monthlyData.push(["销售额增长", (dataJson.trend.monthOverMonth.revenue ?? 0) + "%"]);
        monthlyData.push(["配方数增长", (dataJson.trend.monthOverMonth.formulaCount ?? 0) + "%"]);
      }
    }

    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
    monthlySheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "月度分析");

    const targetTeamData: any[][] = [["目标与团队"]];

    if (dataJson.targets) {
      if (dataJson.targets.quarterlyTargets?.length > 0) {
        targetTeamData.push([""]);
        targetTeamData.push(["季度目标"]);
        targetTeamData.push(["指标", "目标", "实际", "达成率"]);
        for (const d of dataJson.targets.quarterlyTargets) {
          targetTeamData.push([d.metric ?? "", d.target ?? 0, d.actual ?? 0, (d.rate ?? 0) + "%"]);
        }
      }
      targetTeamData.push([""]);
      targetTeamData.push(["季度整体进度", (dataJson.targets.quarterlyProgress ?? 0) + "%"]);
    }

    if (dataJson.team?.salesmanPerformance?.length > 0) {
      targetTeamData.push([""]);
      targetTeamData.push(["业务员业绩"]);
      targetTeamData.push(["业务员", "销量", "销售额"]);
      for (const d of dataJson.team.salesmanPerformance) {
        targetTeamData.push([d.salesmanName ?? d.salesman_name ?? "", d.totalQuantity ?? d.total_quantity ?? 0, d.totalRevenue ?? d.total_revenue ?? 0]);
      }
    }

    const targetTeamSheet = XLSX.utils.aoa_to_sheet(targetTeamData);
    targetTeamSheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, targetTeamSheet, "目标与团队");
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `${title}_${periodStart}_${periodEnd}.xlsx`.replace(/[/\\?%*:|"<>]/g, "_");
  return { buffer, fileName };
}
