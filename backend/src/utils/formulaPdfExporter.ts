/**
 * 配方 PDF 导出引擎
 * 将配方数据导出为 PDF 文件
 * 支持中文字体显示
 */
import PDFDocument from "pdfkit";
import { query } from "../config/database-better-sqlite3.js";
import { safeJsonParse, rowToCamelCase } from "./helpers.js";
import path from "path";
import fs from "fs";

interface FormulaRow {
  id: string;
  name: string;
  salesmanName: string;
  finishedWeight: number;
  ratioFactor: number;
  supplementRatioFactor: number;
  packagingPrice: number;
  otherPrice: number;
  profitMargin: number;
  description: string | null;
  preparationMethod: string | null;
  materialsJson: string;
  createdAt: string;
  updatedAt: string;
}

interface VersionRow {
  versionId: string;
  versionNumber: string;
  versionName: string | null;
  versionReason: string | null;
  status: string;
  isCurrent: number;
  snapshotJson: string;
  ratioFactor: number;
  supplementRatioFactor: number;
  createdAt: string;
}

interface MaterialRow {
  id: string;
  name: string;
  code: string;
  unit: string;
  materialType: string;
  unitPrice: number | null;
}

interface NutritionRow {
  materialId: string;
  protein: number;
  fat: number;
  carbohydrate: number;
  sodium: number;
  calories: number;
  dietaryFiber: number;
}

// 中文字体路径检测
function getChineseFontPath(): { path: string; name: string } | null {
  // 优先使用TTF格式字体（pdfkit对TTC格式支持有限）
  const fontPaths = [
    // TTF 格式字体（优先）
    { path: "C:/Windows/Fonts/simhei.ttf", name: "SimHei" }, // 黑体（TTF格式，最稳定）
    { path: "C:/Windows/Fonts/msyh.ttf", name: "MicrosoftYaHei" }, // 微软雅黑（某些系统有TTF版本）
    { path: "C:/Windows/Fonts/simkai.ttf", name: "KaiTi" }, // 楷体
    { path: "C:/Windows/Fonts/simfang.ttf", name: "FangSong" }, // 仿宋
    // 项目内置字体
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

// 字体缓存
let cachedFont: { path: string; name: string } | null = null;
try {
  cachedFont = getChineseFontPath();
  if (cachedFont) {
    console.log(`[PDF导出] 使用中文字体: ${cachedFont.name} (${cachedFont.path})`);
  } else {
    console.warn("[PDF导出] 未找到中文字体，中文可能无法正常显示");
  }
} catch (e) {
  console.warn("[PDF导出] 字体检测失败:", e);
}

/** 获取配方完整数据（供导出引擎复用） */
async function getFormulaData(formulaId: string, versionId?: string) {
  const [formulas]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [formulaId]);
  if (!formulas.length) throw new Error("配方不存在");
  const formula = rowToCamelCase<FormulaRow>(formulas[0]);

  let version: any = null;
  let snapshot: any = null;

  if (versionId) {
    const [versions]: any[][] = await query("SELECT * FROM formula_versions WHERE version_id = ?", [versionId]);
    if (versions.length) {
      version = rowToCamelCase(versions[0]);
      snapshot = safeJsonParse(version.snapshotJson, null);
    }
  }

  const materials = snapshot?.materials || safeJsonParse<any[]>(formula.materialsJson, []);
  const ratioFactor = version?.ratioFactor ?? formula.ratioFactor;
  const supplementRatioFactor = version?.supplementRatioFactor ?? formula.supplementRatioFactor;
  const versionLabel = version ? `V${version.versionNumber}` : "当前版本";

  const materialDetails: Map<string, MaterialRow> = new Map();
  const nutritionData: Map<string, NutritionRow> = new Map();

  if (materials.length > 0) {
    const materialIds = materials.map((m: any) => m.materialId).filter(Boolean);
    if (materialIds.length > 0) {
      const placeholders = materialIds.map(() => "?").join(",");
      const [matRows]: any[][] = await query(`SELECT * FROM materials WHERE id IN (${placeholders})`, materialIds);
      matRows.forEach((row: any) => materialDetails.set(row.id, rowToCamelCase<MaterialRow>(row)));

      const [nutRows]: any[][] = await query(
        `SELECT * FROM material_nutrition WHERE material_id IN (${placeholders})`,
        materialIds,
      );
      nutRows.forEach((row: any) => nutritionData.set(row.material_id, rowToCamelCase<NutritionRow>(row)));
    }
  }

  return {
    formula,
    version,
    materials,
    ratioFactor,
    supplementRatioFactor,
    versionLabel,
    materialDetails,
    nutritionData,
  };
}

/**
 * 导出配方为 PDF Buffer
 */
export async function exportFormulaToPdf(
  formulaId: string,
  versionId?: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const {
    formula,
    version,
    materials,
    ratioFactor,
    supplementRatioFactor,
    versionLabel,
    materialDetails,
    nutritionData,
  } = await getFormulaData(formulaId, versionId);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `${formula.name} - 配方导出`,
      Author: "TingStudio",
      Subject: formula.description || "",
    },
  });

  // 注册中文字体
  const fontName = "ChineseFont";
  if (cachedFont) {
    try {
      doc.registerFont(fontName, cachedFont.path);
      doc.font(fontName); // 设置默认字体为中文字体
    } catch (e) {
      console.warn("[PDF导出] 注册中文字体失败:", e);
    }
  }

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - 100; // 左右各 50 margin
  const startX = 50;
  let y = 50;

  // ===== 标题 =====
  doc.fontSize(22).fillColor("#333333");
  doc.text(formula.name, startX, y, { width: pageWidth });
  y = doc.y + 8;

  doc.fontSize(11).fillColor("#888888");
  doc.text(`版本: ${versionLabel}`, startX, y);
  y = doc.y + 20;

  // ===== 分割线 =====
  doc
    .moveTo(startX, y)
    .lineTo(startX + pageWidth, y)
    .strokeColor("#FF6B8A")
    .lineWidth(2)
    .stroke();
  y += 15;

  // ===== 配方基本信息 =====
  doc.fontSize(14).fillColor("#333333");
  doc.text("配方基本信息", startX, y);
  y = doc.y + 10;

  const infoItems: [string, string][] = [
    ["配方名称", formula.name],
    ["业务员", formula.salesmanName],
    ["版本", versionLabel],
    ["创建时间", new Date(formula.createdAt).toLocaleString("zh-CN")],
    ["更新时间", new Date(formula.updatedAt).toLocaleString("zh-CN")],
    ["成品重量(g)", String(formula.finishedWeight)],
    ["药材比系数", String(ratioFactor)],
    ["辅料比系数", String(supplementRatioFactor)],
  ];

  if (version?.versionReason) {
    infoItems.push(["版本说明", version.versionReason]);
  }
  infoItems.push(["备注", formula.description || "无"]);
  infoItems.push(["制法", formula.preparationMethod || "无"]);

  // 每个信息项独占一行，标签和值分两列显示
  doc.fontSize(10);
  for (const [label, value] of infoItems) {
    // 标签列
    doc.fillColor("#666666").text(label + ":", startX, y, { width: 100 });
    // 值列（换行显示）
    doc.fillColor("#333333").text(value, startX + 105, y, { width: pageWidth - 105 });
    y = doc.y + 6;
  }
  y += 10;

  // ===== 原料清单表格 =====
  doc.fontSize(14).fillColor("#333333");
  doc.text("原料清单", startX, y);
  y = doc.y + 10;

  // 表头背景 - 列宽总和等于pageWidth(495)
  // 列顺序：序号、原料名称、数量(g)、类型、基价、调整价、状态
  const colWidths = [32, 140, 60, 50, 65, 68, 80];
  const colHeaders = ["序号", "原料名称", "数量(g)", "类型", "基价(¥)", "调整价(¥)", "状态"];
  const rowHeight = 24;
  const cellPadding = 7; // 垂直居中偏移量

  // 表头
  doc.rect(startX, y, pageWidth, rowHeight).fill("#FF6B8A");
  doc.fontSize(10).fillColor("#FFFFFF");
  let x = startX;
  for (let i = 0; i < colHeaders.length; i++) {
    doc.text(colHeaders[i], x + 4, y + cellPadding, { width: colWidths[i] - 8, align: "center" });
    x += colWidths[i];
  }
  y += rowHeight;

  // 数据行
  doc.fontSize(9);
  const dataRowHeight = 22;
  const dataCellPadding = 6;
  materials.forEach((m: any, i: number) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null;
    const name = detail?.name || m.materialName || "未知";
    const type = detail?.materialType === "supplement" ? "辅料" : "药材";
    const qty = String(m.quantity || 0);
    const basePrice = m.basePriceAtSave ?? detail?.unitPrice ?? null;
    const adjPrice = m.adjustedPrice ?? null;
    const isAdjusted = adjPrice != null && adjPrice !== basePrice;
    const basePriceStr = basePrice != null ? Number(basePrice).toFixed(2) : "--";
    const adjPriceStr = adjPrice != null ? Number(adjPrice).toFixed(2) : "--";
    let statusText = "--";
    if (basePrice != null) statusText = isAdjusted ? "★ 已调整" : "基价";

    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    if (isAdjusted) {
      doc.rect(startX, y, pageWidth, dataRowHeight).fill("#FFF8F0");
    } else if (i % 2 === 0) {
      doc.rect(startX, y, pageWidth, dataRowHeight).fill("#FFF5F7");
    }

    const rowData = [String(i + 1), name, qty, type, basePriceStr, adjPriceStr, statusText];
    doc.fillColor(isAdjusted ? "#92400e" : "#333333");
    x = startX;
    for (let j = 0; j < rowData.length; j++) {
      doc.text(rowData[j], x + 3, y + dataCellPadding, { width: colWidths[j] - 6, align: j === 1 ? "left" : "center" });
      x += colWidths[j];
    }
    y += dataRowHeight;
  });

  y += 20;

  // ===== 报价信息 =====
  doc.fontSize(14).fillColor("#333333");
  doc.text("报价信息", startX, y);
  y = doc.y + 10;

  const materialTotalCost = materials.reduce((sum: number, m: any) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null;
    const basePrice = m.basePriceAtSave ?? detail?.unitPrice ?? null;
    const adjPrice = m.adjustedPrice ?? null;
    const effectivePrice = adjPrice != null ? adjPrice : basePrice;
    return sum + (effectivePrice != null ? ((m.quantity || 0) / 1000) * effectivePrice : 0);
  }, 0);
  const pPackagingPrice = formula.packagingPrice ?? 0;
  const pOtherPrice = formula.otherPrice ?? 0;
  const pProfitMargin = formula.profitMargin ?? 20;
  const pCostSubtotal = materialTotalCost + pPackagingPrice + pOtherPrice;
  const pProfitAmount = (pCostSubtotal * pProfitMargin) / 100;
  const pTotalPrice = pCostSubtotal + pProfitAmount;

  const pFw = formula.finishedWeight;
  const pFwLabel = pFw > 0 ? `${pFw}g` : '0g';

  const quotationItems: [string, string][] = [
    ["规格(成品重量)", pFwLabel],
    ["", ""],
    ["原料总成本", `¥ ${materialTotalCost.toFixed(2)}`],
    ["包装费", `¥ ${pPackagingPrice.toFixed(2)}`],
    ["其他费用", `¥ ${pOtherPrice.toFixed(2)}`],
    ["成本小计", `¥ ${pCostSubtotal.toFixed(2)}`],
    ["利润率", `${pProfitMargin}%`],
    ["利润金额", `¥ ${pProfitAmount.toFixed(2)}`],
    ["", ""],
    ["报价总价", `¥ ${pTotalPrice.toFixed(2)}`],
  ];

  doc.fontSize(10);
  for (const [label, value] of quotationItems) {
    if (!label && !value) { y += 6; continue; }
    doc.fillColor("#666666").text(label + ":", startX, y, { continued: false });
    doc.fillColor(label === "报价总价" ? "#D97706" : "#333333").text(value, startX + 125, y);
    y = doc.y + 4;
  }

  doc.fontSize(9).fillColor("#999999");
  y += 4;
  doc.text("计算公式: 报价 = (原料总成本 + 包装费 + 其他费) × (1 + 利润率%)", startX, y, { width: pageWidth });
  y = doc.y + 20;

  // ===== 营养数据表格 =====
  doc.fontSize(14).fillColor("#333333");
  doc.text("营养数据", startX, y);
  y = doc.y + 10;

  // 列宽总和等于pageWidth(495)
  const nutColWidths = [40, 140, 55, 55, 70, 55, 50, 30];
  const nutHeaders = ["序号", "原料名称", "蛋白质", "脂肪", "碳水", "钠", "热量", "纤维"];
  const nutRowHeight = 24;
  const nutCellPadding = 7; // 垂直居中偏移量

  // 表头
  doc.rect(startX, y, pageWidth, nutRowHeight).fill("#FF6B8A");
  doc.fontSize(9).fillColor("#FFFFFF");
  x = startX;
  for (let i = 0; i < nutHeaders.length; i++) {
    doc.text(nutHeaders[i], x + 3, y + nutCellPadding, { width: nutColWidths[i] - 6, align: "center" });
    x += nutColWidths[i];
  }
  y += nutRowHeight;

  // 数据行 + 合计
  const totalNutrition = { protein: 0, fat: 0, carbohydrate: 0, sodium: 0, calories: 0, dietaryFiber: 0 };

  doc.fontSize(9);
  const nutDataRowHeight = 22;
  const nutDataCellPadding = 6; // 垂直居中偏移量
  materials.forEach((m: any, i: number) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null;
    const name = detail?.name || m.materialName || "未知";
    const nutrition = m.materialId ? nutritionData.get(m.materialId) : null;

    if (nutrition) {
      const ratio = (m.quantity || 0) / 100;
      totalNutrition.protein += nutrition.protein * ratio;
      totalNutrition.fat += nutrition.fat * ratio;
      totalNutrition.carbohydrate += nutrition.carbohydrate * ratio;
      totalNutrition.sodium += nutrition.sodium * ratio;
      totalNutrition.calories += nutrition.calories * ratio;
      totalNutrition.dietaryFiber += nutrition.dietaryFiber * ratio;
    }

    // 检查是否需要分页
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    if (i % 2 === 0) {
      doc.rect(startX, y, pageWidth, nutDataRowHeight).fill("#FFF5F7");
    }

    const rowData = [
      String(i + 1),
      name,
      nutrition?.protein?.toFixed(1) ?? "-",
      nutrition?.fat?.toFixed(1) ?? "-",
      nutrition?.carbohydrate?.toFixed(1) ?? "-",
      nutrition?.sodium?.toFixed(1) ?? "-",
      nutrition?.calories?.toFixed(1) ?? "-",
      nutrition?.dietaryFiber?.toFixed(1) ?? "-",
    ];
    doc.fillColor("#333333");
    x = startX;
    for (let j = 0; j < rowData.length; j++) {
      // 所有列都居中对齐
      doc.text(rowData[j], x + 3, y + nutDataCellPadding, { width: nutColWidths[j] - 6, align: "center" });
      x += nutColWidths[j];
    }
    y += nutDataRowHeight;
  });

  // 合计行
  y += 2;
  const totalRowHeight = 22;
  const totalCellPadding = 6;
  doc.rect(startX, y, pageWidth, totalRowHeight).fill("#FFE8EE");
  doc.fontSize(9).fillColor("#333333");
  const totalData = [
    "",
    "合计",
    totalNutrition.protein.toFixed(2),
    totalNutrition.fat.toFixed(2),
    totalNutrition.carbohydrate.toFixed(2),
    totalNutrition.sodium.toFixed(2),
    totalNutrition.calories.toFixed(2),
    totalNutrition.dietaryFiber.toFixed(2),
  ];
  x = startX;
  for (let j = 0; j < totalData.length; j++) {
    // 所有列都居中对齐
    doc.text(totalData[j], x + 3, y + totalCellPadding, { width: nutColWidths[j] - 6, align: "center" });
    x += nutColWidths[j];
  }
  y += 35;

  // ===== 页脚 =====
  doc.fontSize(9).fillColor("#AAAAAA");
  doc.text(`由 TingStudio 生成于 ${new Date().toLocaleString("zh-CN")}`, startX, y, {
    width: pageWidth,
    align: "center",
  });

  doc.end();

  // 等待 PDF 生成完成
  return new Promise<{ buffer: Buffer; fileName: string }>((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const fileName = `${formula.name}_${versionLabel}.pdf`.replace(/[/\\?%*:|"<>]/g, "_");
      resolve({ buffer, fileName });
    });
    doc.on("error", reject);
  });
}
