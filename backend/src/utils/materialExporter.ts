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
}

interface MaterialDbRow {
  id: string;
  name: string;
  code: string;
  unit: string;
  material_type: string;
  unit_price: number | null;
  stock: number;
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

async function fetchMaterials(materialIds: string[]): Promise<MaterialRow[]> {
  if (materialIds.length === 0) return [];
  const placeholders = materialIds.map(() => "?").join(",");
  const [rows] = await query<[MaterialDbRow[]]>(
    `SELECT id, name, code, unit, material_type, unit_price, stock FROM materials WHERE id IN (${placeholders})`,
    materialIds,
  );
  return rows.map((row: MaterialDbRow) => rowToCamelCase<MaterialRow>(row));
}

export async function exportMaterialToExcel(
  materialIds: string[],
): Promise<{ buffer: Buffer; fileName: string }> {
  const materials = await fetchMaterials(materialIds);
  if (materials.length === 0) throw new Error("未找到匹配的原料数据");

  const workbook = XLSX.utils.book_new();

  const header = ["序号", "原料名称", "原料编码", "单位", "类型", "单价(¥)", "库存"];
  const dataRows = materials.map((m, i) => [
    i + 1,
    m.name,
    m.code,
    m.unit,
    resolveMaterialType(m.materialType),
    m.unitPrice != null ? Number(m.unitPrice).toFixed(2) : "--",
    m.stock ?? 0,
  ]);

  const sheetData = [header, ...dataRows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "原料清单");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `原料导出_${formatDate()}.xlsx`;

  return { buffer, fileName };
}

export async function exportMaterialToPdf(
  materialIds: string[],
): Promise<{ buffer: Buffer; fileName: string }> {
  const materials = await fetchMaterials(materialIds);
  if (materials.length === 0) throw new Error("未找到匹配的原料数据");

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

  doc.fontSize(22).fillColor("#333333");
  doc.text("原料导出", startX, y, { width: pageWidth });
  y = doc.y + 8;

  doc.fontSize(11).fillColor("#888888");
  doc.text(`导出时间: ${new Date().toLocaleString("zh-CN")}`, startX, y);
  y = doc.y + 20;

  doc
    .moveTo(startX, y)
    .lineTo(startX + pageWidth, y)
    .strokeColor("#FF6B8A")
    .lineWidth(2)
    .stroke();
  y += 15;

  doc.fontSize(14).fillColor("#333333");
  doc.text("原料清单", startX, y);
  y = doc.y + 10;

  const colWidths = [32, 130, 70, 45, 50, 85, 83];
  const colHeaders = ["序号", "原料名称", "原料编码", "单位", "类型", "单价(¥)", "库存"];
  const rowHeight = 24;
  const cellPadding = 7;

  doc.rect(startX, y, pageWidth, rowHeight).fill("#FF6B8A");
  doc.fontSize(10).fillColor("#FFFFFF");
  let x = startX;
  for (let i = 0; i < colHeaders.length; i++) {
    doc.text(colHeaders[i], x + 4, y + cellPadding, { width: colWidths[i] - 8, align: "center" });
    x += colWidths[i];
  }
  y += rowHeight;

  doc.fontSize(9);
  const dataRowHeight = 22;
  const dataCellPadding = 6;
  materials.forEach((m, i) => {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    if (i % 2 === 0) {
      doc.rect(startX, y, pageWidth, dataRowHeight).fill("#FFF5F7");
    }

    const rowData = [
      String(i + 1),
      m.name,
      m.code,
      m.unit,
      resolveMaterialType(m.materialType),
      m.unitPrice != null ? Number(m.unitPrice).toFixed(2) : "--",
      String(m.stock ?? 0),
    ];
    doc.fillColor("#333333");
    x = startX;
    for (let j = 0; j < rowData.length; j++) {
      doc.text(rowData[j], x + 3, y + dataCellPadding, {
        width: colWidths[j] - 6,
        align: j === 1 ? "left" : "center",
      });
      x += colWidths[j];
    }
    y += dataRowHeight;
  });

  y += 35;

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
