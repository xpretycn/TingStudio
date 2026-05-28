import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const SECTION_COLORS: Record<string, string> = {
  formula: "#3B82F6",
  sales: "#10B981",
  plans: "#8B5CF6",
  monthlySummary: "#F59E0B",
  trend: "#06B6D4",
  targets: "#10B981",
  team: "#6366F1",
  issues: "#EF4444",
};

function getChineseFontPath(): { path: string; name: string } | null {
  const fontPaths = [
    { path: "C:/Windows/Fonts/simhei.ttf", name: "SimHei" },
    { path: "C:/Windows/Fonts/msyh.ttf", name: "MicrosoftYaHei" },
    { path: "C:/Windows/Fonts/simkai.ttf", name: "KaiTi" },
    { path: "C:/Windows/Fonts/simfang.ttf", name: "FangSong" },
    { path: path.join(process.cwd(), "fonts", "simhei.ttf"), name: "SimHei" },
    { path: path.join(process.cwd(), "fonts", "SourceHanSansCN-Regular.ttf"), name: "SourceHanSans" },
  ];
  for (const font of fontPaths) {
    if (fs.existsSync(font.path)) {
      return font;
    }
  }
  return null;
}

let cachedFont: { path: string; name: string } | null = null;
try {
  cachedFont = getChineseFontPath();
} catch (_e) {}

export async function exportReportToPdf(
  report: { type: string; title: string; periodStart: string; periodEnd: string; dataJson: any }
): Promise<{ buffer: Buffer; fileName: string }> {
  const { type, title, periodStart, periodEnd, dataJson } = report;

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: title,
      Author: "TingStudio",
      Subject: `${type === "weekly" ? "周报" : "月报"} ${periodStart} ~ ${periodEnd}`,
    },
  });

  const fontName = "ChineseFont";
  if (cachedFont) {
    try {
      doc.registerFont(fontName, cachedFont.path);
      doc.font(fontName);
    } catch (_e) {}
  }

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - 100;
  const startX = 50;
  let y = 50;

  function checkPage(needed: number) {
    if (y + needed > 700) {
      doc.addPage();
      y = 50;
    }
  }

  function drawSectionTitle(text: string, color: string) {
    checkPage(40);
    doc.rect(startX, y, 4, 20).fill(color);
    doc.fontSize(14).fillColor("#333333");
    doc.text(text, startX + 12, y + 2, { width: pageWidth - 12 });
    y = doc.y + 8;
    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
    y += 8;
  }

  function drawKeyValue(label: string, value: string | number, labelWidth = 120) {
    checkPage(20);
    doc.fontSize(10).fillColor("#666666").text(label + ":", startX + 12, y, { width: labelWidth });
    doc.fillColor("#333333").text(String(value), startX + 12 + labelWidth, y, { width: pageWidth - labelWidth - 12 });
    y = doc.y + 4;
  }

  function drawTable(headers: string[], rows: any[][], colWidths: number[]) {
    const rowHeight = 22;
    const cellPadding = 6;
    checkPage(rowHeight * 2 + 10);

    doc.rect(startX, y, pageWidth, rowHeight).fill("#F3F4F6");
    doc.fontSize(9).fillColor("#374151");
    let x = startX;
    for (let i = 0; i < headers.length; i++) {
      const align: "left" | "center" = i === 0 ? "left" : "center";
      doc.text(headers[i], x + 4, y + cellPadding, { width: colWidths[i] - 8, align });
      x += colWidths[i];
    }
    y += rowHeight;

    for (let r = 0; r < rows.length; r++) {
      checkPage(rowHeight + 5);
      if (r % 2 === 0) {
        doc.rect(startX, y, pageWidth, rowHeight).fill("#F9FAFB");
      }
      doc.fontSize(9).fillColor("#333333");
      x = startX;
      for (let c = 0; c < rows[r].length; c++) {
        const align: "left" | "center" = c === 0 ? "left" : "center";
        doc.text(String(rows[r][c] ?? ""), x + 4, y + cellPadding, { width: colWidths[c] - 8, align });
        x += colWidths[c];
      }
      y += rowHeight;
    }
    y += 8;
  }

  doc.fontSize(22).fillColor("#111827");
  doc.text(title, startX, y, { width: pageWidth, align: "center" });
  y = doc.y + 8;

  doc.fontSize(11).fillColor("#6B7280");
  const typeLabel = type === "weekly" ? "周报" : "月报";
  doc.text(`${typeLabel} | ${periodStart} ~ ${periodEnd}`, startX, y, { width: pageWidth, align: "center" });
  y = doc.y + 12;

  doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor("#3B82F6").lineWidth(2).stroke();
  y += 15;

  if (dataJson.formula) {
    drawSectionTitle("配方完成情况", SECTION_COLORS.formula);
    drawKeyValue("新增配方数", dataJson.formula.newFormulaCount ?? 0);
    drawKeyValue("已完成配方数", dataJson.formula.completedFormulaCount ?? 0);
    drawKeyValue("完成率", (dataJson.formula.completionRate ?? 0) + "%");
    drawKeyValue("配方总数", dataJson.formula.totalFormulaCount ?? 0);

    if (dataJson.formula.dailyFormulaTrend?.length > 0) {
      const headers = ["日期", "新增", "完成"];
      const rows = dataJson.formula.dailyFormulaTrend.map((d: any) => [d.date, d.new ?? 0, d.completed ?? 0]);
      const colWidths = [pageWidth * 0.5, pageWidth * 0.25, pageWidth * 0.25];
      drawTable(headers, rows, colWidths);
    }

    if (dataJson.formula.statusDistribution?.length > 0) {
      const headers = ["状态", "数量"];
      const rows = dataJson.formula.statusDistribution.map((d: any) => [d.status, d.count]);
      const colWidths = [pageWidth * 0.6, pageWidth * 0.4];
      drawTable(headers, rows, colWidths);
    }
  }

  if (dataJson.sales) {
    drawSectionTitle("销售数据统计", SECTION_COLORS.sales);
    drawKeyValue("销售量", dataJson.sales.weeklyQuantity ?? 0);
    drawKeyValue("销售额", "¥" + (dataJson.sales.weeklyRevenue ?? 0));
    drawKeyValue("销量增长率", (dataJson.sales.quantityGrowthRate ?? 0) + "%");
    drawKeyValue("销售额增长率", (dataJson.sales.revenueGrowthRate ?? 0) + "%");

    if (dataJson.sales.topFormulas?.length > 0) {
      const headers = ["配方名称", "销量", "销售额"];
      const rows = dataJson.sales.topFormulas.map((d: any) => [
        d.formulaName ?? d.formula_name ?? "",
        d.totalQuantity ?? d.total_quantity ?? 0,
        "¥" + (d.totalRevenue ?? d.total_revenue ?? 0),
      ]);
      const colWidths = [pageWidth * 0.5, pageWidth * 0.25, pageWidth * 0.25];
      drawTable(headers, rows, colWidths);
    }

    if (dataJson.sales.weeklyComparison?.length > 0) {
      const headers = ["周次", "销量", "销售额"];
      const rows = dataJson.sales.weeklyComparison.map((d: any) => [
        d.week, d.quantity ?? 0, "¥" + (d.revenue ?? 0),
      ]);
      const colWidths = [pageWidth * 0.4, pageWidth * 0.3, pageWidth * 0.3];
      drawTable(headers, rows, colWidths);
    }
  }

  if (type === "weekly" && dataJson.plans) {
    drawSectionTitle("未来规划", SECTION_COLORS.plans);
    if (dataJson.plans.nextWeekPlans?.length > 0) {
      const headers = ["计划", "优先级"];
      const rows = dataJson.plans.nextWeekPlans.map((d: any) => [
        d.content ?? d.plan ?? "", d.priority ?? "",
      ]);
      const colWidths = [pageWidth * 0.7, pageWidth * 0.3];
      drawTable(headers, rows, colWidths);
    }
    if (dataJson.plans.resourceNeeds?.length > 0) {
      drawKeyValue("资源需求", dataJson.plans.resourceNeeds.map((r: any) => r.name ?? r.content ?? "").join(", "));
    }
    if (dataJson.plans.expectedTargets?.length > 0) {
      drawKeyValue("预期目标", dataJson.plans.expectedTargets.map((t: any) => t.metric ?? t.name ?? "").join(", "));
    }
    if (dataJson.plans.riskAssessment?.length > 0) {
      drawKeyValue("风险评估", dataJson.plans.riskAssessment.map((r: any) => r.risk ?? r.content ?? "").join(", "));
    }
  }

  if (type === "monthly") {
    if (dataJson.monthlySummary) {
      drawSectionTitle("月度汇总分析", SECTION_COLORS.monthlySummary);
      drawKeyValue("月新增配方", dataJson.monthlySummary.monthlyNewFormulas ?? 0);
      drawKeyValue("月完成配方", dataJson.monthlySummary.monthlyCompletedFormulas ?? 0);
      drawKeyValue("月完成率", (dataJson.monthlySummary.monthlyCompletionRate ?? 0) + "%");
      drawKeyValue("月销售量", dataJson.monthlySummary.monthlyQuantity ?? 0);
      drawKeyValue("月销售额", "¥" + (dataJson.monthlySummary.monthlyRevenue ?? 0));

      if (dataJson.monthlySummary.weeklyBreakdown?.length > 0) {
        const headers = ["周次", "销量", "销售额", "配方数"];
        const rows = dataJson.monthlySummary.weeklyBreakdown.map((d: any) => [
          d.week, d.quantity ?? 0, "¥" + (d.revenue ?? 0), d.formulaCount ?? 0,
        ]);
        const colWidths = [pageWidth * 0.2, pageWidth * 0.25, pageWidth * 0.3, pageWidth * 0.25];
        drawTable(headers, rows, colWidths);
      }
    }

    if (dataJson.trend) {
      drawSectionTitle("趋势变化分析", SECTION_COLORS.trend);
      if (dataJson.trend.monthlyTrend?.length > 0) {
        const headers = ["月份", "销量", "销售额", "配方数"];
        const rows = dataJson.trend.monthlyTrend.map((d: any) => [
          d.month, d.quantity ?? 0, "¥" + (d.revenue ?? 0), d.formulaCount ?? 0,
        ]);
        const colWidths = [pageWidth * 0.2, pageWidth * 0.25, pageWidth * 0.3, pageWidth * 0.25];
        drawTable(headers, rows, colWidths);
      }
      if (dataJson.trend.yearOverYear) {
        drawKeyValue("同比销量增长", (dataJson.trend.yearOverYear.quantity ?? 0) + "%");
        drawKeyValue("同比销售额增长", (dataJson.trend.yearOverYear.revenue ?? 0) + "%");
      }
      if (dataJson.trend.monthOverMonth) {
        drawKeyValue("环比销量增长", (dataJson.trend.monthOverMonth.quantity ?? 0) + "%");
        drawKeyValue("环比销售额增长", (dataJson.trend.monthOverMonth.revenue ?? 0) + "%");
      }
    }

    if (dataJson.targets) {
      drawSectionTitle("季度目标达成率", SECTION_COLORS.targets);
      if (dataJson.targets.quarterlyTargets?.length > 0) {
        const headers = ["指标", "目标", "实际", "达成率"];
        const rows = dataJson.targets.quarterlyTargets.map((d: any) => [
          d.metric ?? "", d.target ?? 0, d.actual ?? 0, (d.rate ?? 0) + "%",
        ]);
        const colWidths = [pageWidth * 0.3, pageWidth * 0.2, pageWidth * 0.25, pageWidth * 0.25];
        drawTable(headers, rows, colWidths);
      }
      drawKeyValue("季度整体进度", (dataJson.targets.quarterlyProgress ?? 0) + "%");
    }

    if (dataJson.team) {
      drawSectionTitle("部门/团队协作", SECTION_COLORS.team);
      if (dataJson.team.salesmanPerformance?.length > 0) {
        const headers = ["业务员", "销量", "销售额"];
        const rows = dataJson.team.salesmanPerformance.map((d: any) => [
          d.salesmanName ?? d.salesman_name ?? "", d.totalQuantity ?? d.total_quantity ?? 0,
          "¥" + (d.totalRevenue ?? d.total_revenue ?? 0),
        ]);
        const colWidths = [pageWidth * 0.4, pageWidth * 0.3, pageWidth * 0.3];
        drawTable(headers, rows, colWidths);
      }
    }

    if (dataJson.issues) {
      drawSectionTitle("问题反馈与改进", SECTION_COLORS.issues);
      if (dataJson.issues.issues?.length > 0) {
        const headers = ["问题", "严重程度"];
        const rows = dataJson.issues.issues.map((d: any) => [d.content ?? d.issue ?? "", d.severity ?? ""]);
        const colWidths = [pageWidth * 0.7, pageWidth * 0.3];
        drawTable(headers, rows, colWidths);
      }
      if (dataJson.issues.suggestions?.length > 0) {
        drawKeyValue("改进建议", dataJson.issues.suggestions.map((s: any) => s.content ?? s.suggestion ?? "").join("; "));
      }
    }
  }

  checkPage(30);
  y += 20;
  doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor("#D1D5DB").lineWidth(0.5).stroke();
  y += 8;
  doc.fontSize(9).fillColor("#9CA3AF");
  doc.text(`由 TingStudio 生成于 ${new Date().toLocaleString("zh-CN")}`, startX, y, {
    width: pageWidth,
    align: "center",
  });

  doc.end();

  return new Promise<{ buffer: Buffer; fileName: string }>((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const fileName = `${title}_${periodStart}_${periodEnd}.pdf`.replace(/[/\\?%*:|"<>]/g, "_");
      resolve({ buffer, fileName });
    });
    doc.on("error", reject);
  });
}
