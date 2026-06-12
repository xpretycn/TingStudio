import XLSX from "xlsx";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { query } from "../config/database-better-sqlite3.js";
import { rowToCamelCase } from "./helpers.js";

interface MaterialRow {
  id: string;
  name: string;
  code: string;
  unit: string;
  materialType: string;
  unitPrice: number | null;
  stock: number;
  version: number;
  status: string;
  dataSource: string;
  appearance: string[];
  taste: string[];
  efficacy: string[];
}

interface MaterialDbRow {
  id: string;
  name: string;
  code: string;
  unit: string;
  material_type: string;
  unit_price: number | null;
  stock: number;
  version: number;
  status: string;
  data_source: string;
  appearance_json: string | null;
  taste_json: string | null;
  efficacy_json: string | null;
}

interface NutritionRow {
  material_id: string;
  per_100g_json: string;
  data_source: string;
  source_detail: string;
}

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
  if (cachedFont) {
    console.log(`[PDF导出] 使用中文字体: ${cachedFont.name} (${cachedFont.path})`);
  } else {
    console.warn("[PDF导出] 未找到中文字体，中文可能无法正常显示");
  }
} catch (e) {
  console.warn("[PDF导出] 字体检测失败:", e);
}

function formatDate(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function resolveMaterialType(type: string): string {
  return type === "supplement" ? "辅料" : "药材";
}

function resolveStatus(status: string): string {
  const map: Record<string, string> = { draft: "草稿", pending_review: "审批中", published: "已发布" };
  return map[status] || status;
}

function resolveDataSource(source: string): string {
  const map: Record<string, string> = { manual: "手动录入", full_reimport: "批量导入", excel_import: "Excel导入", ai: "AI识别" };
  return map[source] || source || "--";
}

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

async function fetchMaterials(materialIds: string[]): Promise<MaterialRow[]> {
  if (materialIds.length === 0) return [];
  const placeholders = materialIds.map(() => "?").join(",");
  const [rows] = await query<[MaterialDbRow[]]>(
    `SELECT id, name, code, unit, material_type, unit_price, stock, version, status, data_source,
            appearance_json, taste_json, efficacy_json
     FROM materials WHERE id IN (${placeholders})`,
    materialIds,
  );
  return rows.map((row: MaterialDbRow) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    unit: row.unit,
    materialType: row.material_type,
    unitPrice: row.unit_price,
    stock: row.stock,
    version: row.version,
    status: row.status,
    dataSource: row.data_source,
    appearance: parseJsonArray(row.appearance_json),
    taste: parseJsonArray(row.taste_json),
    efficacy: parseJsonArray(row.efficacy_json),
  }));
}

async function fetchNutritionMap(materialIds: string[]): Promise<Map<string, { per100g: Record<string, number>; source: string; sourceDetail: string }>> {
  const map = new Map<string, { per100g: Record<string, number>; source: string; sourceDetail: string }>();
  if (materialIds.length === 0) return map;
  const placeholders = materialIds.map(() => "?").join(",");
  const [rows] = await query<[NutritionRow[]]>(
    `SELECT material_id, per_100g_json, data_source, source_detail
     FROM material_nutrition WHERE material_id IN (${placeholders}) AND is_latest = 1`,
    materialIds,
  );
  for (const row of rows) {
    let per100g: Record<string, number> = {};
    try { per100g = JSON.parse(row.per_100g_json || "{}"); } catch { /* ignore */ }
    map.set(row.material_id, { per100g, source: row.data_source || "", sourceDetail: row.source_detail || "" });
  }
  return map;
}

const NUTRITION_LABELS: Record<string, string> = {
  energy: "能量(kJ)",
  protein: "蛋白质(g)",
  fat: "脂肪(g)",
  carbohydrate: "碳水化合物(g)",
  sodium: "钠(mg)",
};

export async function exportMaterialToExcel(
  materialIds: string[],
): Promise<{ buffer: Buffer; fileName: string }> {
  const materials = await fetchMaterials(materialIds);
  if (materials.length === 0) throw new Error("未找到匹配的原料数据");

  const nutritionMap = await fetchNutritionMap(materialIds);
  const workbook = XLSX.utils.book_new();

  // Sheet 1: 原料概况
  const overviewHeader = ["序号", "原料名称", "原料编码", "单位", "类型", "单价(¥)", "库存", "版本", "状态", "性状", "味型", "功效"];
  const overviewRows = materials.map((m, i) => [
    i + 1,
    m.name,
    m.code,
    m.unit,
    resolveMaterialType(m.materialType),
    m.unitPrice != null ? Number(m.unitPrice).toFixed(2) : "--",
    m.stock ?? 0,
    `v${m.version}`,
    resolveStatus(m.status),
    m.appearance.join("、") || "--",
    m.taste.join("、") || "--",
    m.efficacy.join("、") || "--",
  ]);

  const overviewSheet = XLSX.utils.aoa_to_sheet([overviewHeader, ...overviewRows]);
  overviewSheet["!cols"] = [
    { wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 8 },
    { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "原料概况");

  // Sheet 2: 营养成分
  const nutriHeader = ["序号", "原料名称", "原料编码"];
  const nutriKeys = Object.keys(NUTRITION_LABELS);
  for (const key of nutriKeys) {
    nutriHeader.push(NUTRITION_LABELS[key]);
  }
  const nutriRows = materials.map((m, i) => {
    const nutri = nutritionMap.get(m.id);
    const row: (string | number)[] = [i + 1, m.name, m.code];
    for (const key of nutriKeys) {
      const val = nutri?.per100g?.[key];
      row.push(val != null ? Number(val).toFixed(1) : "--");
    }
    return row;
  });

  const nutriSheet = XLSX.utils.aoa_to_sheet([nutriHeader, ...nutriRows]);
  nutriSheet["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, nutriSheet, "营养成分");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `原料导出_${formatDate()}.xlsx`;

  return { buffer, fileName };
}

export async function exportMaterialToPdf(
  materialIds: string[],
): Promise<{ buffer: Buffer; fileName: string }> {
  const materials = await fetchMaterials(materialIds);
  if (materials.length === 0) throw new Error("未找到匹配的原料数据");

  const nutritionMap = await fetchNutritionMap(materialIds);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: "原料导出",
      Author: "TingStudio",
      Subject: "原料数据导出",
    },
  });

  const fontName = "ChineseFont";
  if (cachedFont) {
    try {
      doc.registerFont(fontName, cachedFont.path);
      doc.font(fontName);
    } catch (e) {
      console.warn("[PDF导出] 注册中文字体失败:", e);
    }
  }

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width - 100;
  const startX = 50;
  let y = 50;

  // Title
  doc.fontSize(22).fillColor("#333333");
  doc.text("原料导出", startX, y, { width: pageWidth });
  y = doc.y + 8;

  doc.fontSize(11).fillColor("#888888");
  doc.text(`导出时间: ${new Date().toLocaleString("zh-CN")}`, startX, y);
  y = doc.y + 20;

  doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor("#FF6B8A").lineWidth(2).stroke();
  y += 15;

  // ── Section 1: 原料概况 ──
  doc.fontSize(14).fillColor("#333333");
  doc.text("一、原料概况", startX, y);
  y = doc.y + 10;

  const overviewColWidths = [28, 95, 55, 35, 40, 65, 45, 38, 42, 55];
  const overviewHeaders = ["序号", "原料名称", "编码", "单位", "类型", "单价(¥)", "库存", "版本", "状态", "数据来源"];

  doc.rect(startX, y, pageWidth, 24).fill("#FF6B8A");
  doc.fontSize(9).fillColor("#FFFFFF");
  let x = startX;
  for (let i = 0; i < overviewHeaders.length; i++) {
    doc.text(overviewHeaders[i], x + 2, y + 7, { width: overviewColWidths[i] - 4, align: "center" });
    x += overviewColWidths[i];
  }
  y += 24;

  doc.fontSize(9).fillColor("#333333");
  materials.forEach((m, i) => {
    if (y > 720) { doc.addPage(); y = 50; }
    if (i % 2 === 0) doc.rect(startX, y, pageWidth, 22).fill("#FFF5F7");

    const row = [
      String(i + 1), m.name, m.code, m.unit, resolveMaterialType(m.materialType),
      m.unitPrice != null ? Number(m.unitPrice).toFixed(2) : "--",
      String(m.stock ?? 0), `v${m.version}`, resolveStatus(m.status), resolveDataSource(m.dataSource),
    ];
    doc.fillColor("#333333");
    x = startX;
    for (let j = 0; j < row.length; j++) {
      doc.text(row[j], x + 2, y + 5, { width: overviewColWidths[j] - 4, align: j <= 1 ? "left" : "center" });
      x += overviewColWidths[j];
    }
    y += 22;
  });

  y += 10;

  // ── Section 2: 性状/味型/功效 ──
  doc.fontSize(14).fillColor("#333333");
  doc.text("二、性状·味型·功效", startX, y);
  y = doc.y + 10;

  materials.forEach((m, i) => {
    if (y > 720) { doc.addPage(); y = 50; }

    doc.fontSize(10).fillColor("#FF6B8A").font(fontName);
    doc.text(`${i + 1}. ${m.name}（${m.code}）`, startX, y);
    y = doc.y + 4;

    doc.fontSize(9).fillColor("#555555");
    if (m.appearance.length > 0) {
      doc.text(`性状: ${m.appearance.join("、")}`, startX + 10, y, { width: pageWidth - 10 });
      y = doc.y + 2;
    }
    if (m.taste.length > 0) {
      doc.text(`味型: ${m.taste.join("、")}`, startX + 10, y, { width: pageWidth - 10 });
      y = doc.y + 2;
    }
    if (m.efficacy.length > 0) {
      doc.text(`功效: ${m.efficacy.join("、")}`, startX + 10, y, { width: pageWidth - 10 });
      y = doc.y + 2;
    }
    if (m.appearance.length === 0 && m.taste.length === 0 && m.efficacy.length === 0) {
      doc.text("暂无数据", startX + 10, y, { width: pageWidth - 10 });
      y = doc.y + 2;
    }
    y += 6;
  });

  y += 5;

  // ── Section 3: 营养成分 ──
  doc.fontSize(14).fillColor("#333333");
  doc.text("三、营养成分（每100g）", startX, y);
  y = doc.y + 10;

  const nutriColWidths = [28, 95, 55, 60, 60, 58, 72, 52];
  const nutriHeaders = ["序号", "原料名称", "编码", "能量(kJ)", "蛋白质(g)", "脂肪(g)", "碳水化合物(g)", "钠(mg)"];

  doc.rect(startX, y, pageWidth, 24).fill("#FF6B8A");
  doc.fontSize(9).fillColor("#FFFFFF");
  x = startX;
  for (let i = 0; i < nutriHeaders.length; i++) {
    doc.text(nutriHeaders[i], x + 2, y + 7, { width: nutriColWidths[i] - 4, align: "center" });
    x += nutriColWidths[i];
  }
  y += 24;

  doc.fontSize(9).fillColor("#333333");
  materials.forEach((m, i) => {
    if (y > 720) { doc.addPage(); y = 50; }
    if (i % 2 === 0) doc.rect(startX, y, pageWidth, 22).fill("#FFF5F7");

    const nutri = nutritionMap.get(m.id);
    const row = [
      String(i + 1), m.name, m.code,
      nutri?.per100g?.energy != null ? Number(nutri.per100g.energy).toFixed(1) : "--",
      nutri?.per100g?.protein != null ? Number(nutri.per100g.protein).toFixed(1) : "--",
      nutri?.per100g?.fat != null ? Number(nutri.per100g.fat).toFixed(1) : "--",
      nutri?.per100g?.carbohydrate != null ? Number(nutri.per100g.carbohydrate).toFixed(1) : "--",
      nutri?.per100g?.sodium != null ? Number(nutri.per100g.sodium).toFixed(1) : "--",
    ];
    doc.fillColor("#333333");
    x = startX;
    for (let j = 0; j < row.length; j++) {
      doc.text(row[j], x + 2, y + 5, { width: nutriColWidths[j] - 4, align: j <= 1 ? "left" : "center" });
      x += nutriColWidths[j];
    }
    y += 22;
  });

  y += 35;

  // Footer
  doc.fontSize(9).fillColor("#AAAAAA");
  doc.text(`由 TingStudio 生成于 ${new Date().toLocaleString("zh-CN")}`, startX, y, {
    width: pageWidth,
    align: "center",
  });

  doc.end();

  return new Promise<{ buffer: Buffer; fileName: string }>((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const fileName = `原料导出_${formatDate()}.pdf`;
      resolve({ buffer, fileName });
    });
    doc.on("error", reject);
  });
}
