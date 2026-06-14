/**
 * 配方导出引擎
 * 将配方数据导出为单 Sheet Excel 文件，还原营养成分表模板样式
 */
import XLSX from "xlsx-js-style";
import { query } from "../config/database-better-sqlite3.js";
import { safeJsonParse, rowToCamelCase } from "./helpers.js";
import { TemplateConfig } from "./exportFieldRegistry.js";

interface FormulaRow {
  id: string;
  name: string;
  code?: string;
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

// ── 样式常量 ──

const C = {
  BLACK: "000000",
  GRAY: "808080",
  GREEN_TEXT: "006100",
  GREEN_BG: "C6EFCE",
  BLUE_GRAY_BG: "D6DCE4",
  TEAL_BG: "9BC2E6",
  YELLOW_BG: "FFF2CC",
  LIGHT_BLUE_BG: "D6E4F0",
  MEDIUM_BLUE_BG: "9BC2E6",
  DARK_BLUE_TEXT: "003399",
  WHITE: "FFFFFF",
};

const BORDER_THIN = {
  top: { style: "thin" as const, color: { rgb: C.BLACK } },
  bottom: { style: "thin" as const, color: { rgb: C.BLACK } },
  left: { style: "thin" as const, color: { rgb: C.BLACK } },
  right: { style: "thin" as const, color: { rgb: C.BLACK } },
};

const BORDER_LEFT = {
  top: { style: "none" as const },
  bottom: { style: "none" as const },
  left: { style: "thin" as const, color: { rgb: C.BLACK } },
  right: { style: "none" as const },
};

const BORDER_RIGHT = {
  top: { style: "none" as const },
  bottom: { style: "none" as const },
  left: { style: "none" as const },
  right: { style: "thin" as const, color: { rgb: C.BLACK } },
};

const BORDER_TOP_BOTTOM = {
  top: { style: "thin" as const, color: { rgb: C.BLACK } },
  bottom: { style: "thin" as const, color: { rgb: C.BLACK } },
  left: { style: "none" as const },
  right: { style: "none" as const },
};

function cell(
  v: string | number,
  s?: Record<string, unknown>,
): { v: string | number; t: string; s?: Record<string, unknown> } {
  const t = typeof v === "number" ? "n" : "s";
  return s ? { v, t, s } : { v, t };
}

function style(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  return partial;
}

// ── 主导出函数 ──

export async function exportFormulaToExcel(
  formulaId: string,
  versionId?: string,
  templateConfig?: TemplateConfig,
): Promise<{ buffer: Buffer; fileName: string }> {
  // ===== 数据获取（保持不变）=====
  const [formulas]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [formulaId]);
  if (!formulas.length) throw new Error("配方不存在");
  const formula = rowToCamelCase<FormulaRow>(formulas[0]);

  let version: VersionRow | null = null;
  let snapshot: any = null;

  if (versionId) {
    const [versions]: any[][] = await query("SELECT * FROM formula_versions WHERE version_id = ?", [versionId]);
    if (versions.length) {
      version = rowToCamelCase(versions[0]);
      snapshot = safeJsonParse(version!.snapshotJson, null);
    }
  }

  const materials = snapshot?.materials || safeJsonParse<any[]>(formula.materialsJson, []);
  const ratioFactor = version?.ratioFactor ?? formula.ratioFactor;
  const supplementRatioFactor = version?.supplementRatioFactor ?? formula.supplementRatioFactor;
  const versionLabel = version ? `V${version.versionNumber}` : "当前版本";

  // 获取原料详情
  const materialDetails: Map<string, MaterialRow> = new Map();

  if (materials.length > 0) {
    const materialIds = materials.map((m: any) => m.materialId).filter(Boolean);
    if (materialIds.length > 0) {
      const placeholders = materialIds.map(() => "?").join(",");
      const [matRows]: any[][] = await query(`SELECT * FROM materials WHERE id IN (${placeholders})`, materialIds);
      matRows.forEach((row: any) => {
        materialDetails.set(row.id, rowToCamelCase<MaterialRow>(row));
      });
    }
  }

  // 优先从 formula_nutrition_snapshots 获取营养数据
  const [nutSnapshots]: any[][] = await query(
    `SELECT * FROM formula_nutrition_snapshots WHERE formula_id = ? ORDER BY calculated_at DESC LIMIT 1`,
    [formulaId],
  );

  const fw = formula.finishedWeight || 1;
  const totalNutrition = { protein: 0, fat: 0, carbohydrate: 0, sodium: 0, calories: 0 };
  let materialCalcRows: Array<{
    name: string; quantity: number; ratio: number;
    protein: number; fat: number; carbohydrate: number; sodium: number;
  }> = [];

  if (nutSnapshots.length > 0) {
    // 从快照获取数据
    const snapshotRow = nutSnapshots[0];
    const materialBreakdown = safeJsonParse<any[]>(
      snapshotRow.material_breakdown_json, [],
    );

    if (materialBreakdown.length > 0) {
      // 快照中有每种原料的明细数据
      materialCalcRows = materialBreakdown.map((row: any) => ({
        name: row.name || row.materialName || "未匹配原料",
        quantity: row.quantity || 0,
        ratio: row.ratio || 0,
        protein: row.contribution?.protein ?? row.protein ?? 0,
        fat: row.contribution?.fat ?? row.fat ?? 0,
        carbohydrate: row.contribution?.carbohydrate ?? row.carbohydrate ?? 0,
        sodium: row.contribution?.sodium ?? row.sodium ?? 0,
      }));

      // 从快照获取汇总数据
      const snapshotTotal = safeJsonParse<Record<string, number>>(
        snapshotRow.total_nutrition_json, {},
      );
      totalNutrition.protein = snapshotTotal.protein ?? 0;
      totalNutrition.fat = snapshotTotal.fat ?? 0;
      totalNutrition.carbohydrate = snapshotTotal.carbohydrate ?? 0;
      totalNutrition.sodium = snapshotTotal.sodium ?? 0;
    }
  }

  if (materialCalcRows.length === 0) {
    // 回退：从 material_nutrition 表直接查询
    const nutritionData: Map<string, NutritionRow> = new Map();

    if (materials.length > 0) {
      const materialIds = materials.map((m: any) => m.materialId).filter(Boolean);
      if (materialIds.length > 0) {
        const placeholders = materialIds.map(() => "?").join(",");
        const [nutRows]: any[][] = await query(
          `SELECT * FROM material_nutrition WHERE material_id IN (${placeholders}) AND is_latest = 1`,
          materialIds,
        );
        nutRows.forEach((row: any) => {
          const per100g = safeJsonParse<Record<string, number> | null>(row.per_100g_json, null);
          if (per100g && row.material_id) {
            nutritionData.set(row.material_id, {
              materialId: row.material_id,
              protein: per100g.protein_g ?? per100g.protein ?? 0,
              fat: per100g.fat_g ?? per100g.fat ?? 0,
              carbohydrate: per100g.carbohydrate_g ?? per100g.carbohydrate ?? 0,
              sodium: per100g.sodium_mg ?? per100g.sodium ?? 0,
              calories: per100g.energy_kj ?? per100g.calories ?? per100g.energy ?? 0,
              dietaryFiber: per100g.dietary_fiber_g ?? per100g.dietary_fiber ?? per100g.dietaryFiber ?? 0,
            });
          }
        });
      }
    }

    materialCalcRows = materials.map((m: any) => {
      const detail = m.materialId ? materialDetails.get(m.materialId) : null;
      const nutrition = m.materialId ? nutritionData.get(m.materialId) : null;
      const materialType = detail?.materialType || m.materialType || "herb";
      const isSupplement = materialType === "supplement";
      const rf = isSupplement ? (supplementRatioFactor || 1) : (ratioFactor || 0.18);
      const quantity = m.quantity || 0;
      const ratio = Math.round((quantity / fw) * rf * 100000) / 100000;

      if (nutrition) {
        totalNutrition.protein += nutrition.protein * ratio;
        totalNutrition.fat += nutrition.fat * ratio;
        totalNutrition.carbohydrate += nutrition.carbohydrate * ratio;
        totalNutrition.sodium += nutrition.sodium * ratio;
      }

      return {
        name: detail?.name || m.materialName || "未匹配原料",
        quantity,
        ratio,
        protein: nutrition?.protein ?? 0,
        fat: nutrition?.fat ?? 0,
        carbohydrate: nutrition?.carbohydrate ?? 0,
        sodium: nutrition?.sodium ?? 0,
      };
    });
  }

  // 能量 = 蛋白质×17 + 脂肪×37 + 碳水×17
  totalNutrition.calories =
    totalNutrition.protein * 17 + totalNutrition.fat * 37 + totalNutrition.carbohydrate * 17;

  const totalWeight = materialCalcRows.reduce((s: number, r: { quantity: number }) => s + r.quantity, 0);
  const totalRatio = materialCalcRows.reduce((s: number, r: { ratio: number }) => s + r.ratio, 0);

  // ===== NRV 配置 =====
  const NRV_REF: Record<string, { unitLabel: string; refValue: number; zeroLimit: string; tolerance: string }> = {
    energy:       { unitLabel: "千焦(kJ)", refValue: 8400,  zeroLimit: "≤17千焦(kJ)",   tolerance: "≤120%标示值" },
    protein:      { unitLabel: "克(g)",    refValue: 60,    zeroLimit: "≤0.5克(g)",     tolerance: "≥80%标示值" },
    fat:          { unitLabel: "克(g)",    refValue: 60,    zeroLimit: "≤0.5克(g)",     tolerance: "≤120%标示值" },
    carbohydrate: { unitLabel: "克(g)",    refValue: 300,   zeroLimit: "≤0.5克(g)",     tolerance: "≥80%标示值" },
    sodium:       { unitLabel: "毫克(mg)", refValue: 2000,  zeroLimit: "≤5毫克(mg)",    tolerance: "≤120%标示值" },
  };

  const nrvItems = [
    { key: "energy" as const,       label: "能量",     value: totalNutrition.calories },
    { key: "protein" as const,      label: "蛋白质",   value: totalNutrition.protein },
    { key: "fat" as const,          label: "脂肪",     value: totalNutrition.fat },
    { key: "carbohydrate" as const, label: "碳水化合物", value: totalNutrition.carbohydrate },
    { key: "sodium" as const,       label: "钠",       value: totalNutrition.sodium / 1000 },
  ];

  // ===== 构建单 Sheet 数据 =====
  const N = materialCalcRows.length;
  const data: any[][] = [];
  const merges: XLSX.Range[] = [];

  // 解析模板配置：决定哪些区域需要输出
  const fields = templateConfig?.selectedFields?.length
    ? templateConfig.selectedFields
    : ["name", "finishedWeight", "materialList", "nrvTable", "usageNotes"];
  const showCalcTable = fields.includes("materialList");
  const showNrvTable = fields.includes("nrvTable");
  const showUsageNotes = fields.includes("usageNotes");

  let currentRow = 0;

  // ── Row 0: 配方名 + 成品重量 ──
  data.push([formula.name, "", fw, "", "", "", "", ""]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
  currentRow++;

  // ── Row 1: 标题 ──
  data.push(["营养成分表计算表格", "", "", "", "", "", "", ""]);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
  currentRow++;

  // ── Row 2: 表头 ──
  data.push(["原料名", "配方(g)", "含量比", "能量(kJ/100g)", "蛋白质(g/100g)", "脂肪(g/100g)", "碳水化合物(g/100g)", "钠(mg/100g)"]);
  currentRow++;

  let sumRow = currentRow;

  if (showCalcTable) {
    // ── 原料数据 ──
    materialCalcRows.forEach((row: { name: string; quantity: number; ratio: number; protein: number; fat: number; carbohydrate: number; sodium: number }) => {
      data.push([
        row.name,
        row.quantity,
        row.ratio,
        "",                       // 能量列留空
        row.protein,
        row.fat,
        row.carbohydrate,
        row.sodium,
      ]);
      currentRow++;
    });

    // ── 空行占位（与原料行数相同，还原模板视觉间距）──
    for (let i = 0; i < N; i++) {
      data.push(["", "", "", "", "", "", "", ""]);
      currentRow++;
    }

    sumRow = currentRow;

    // ── 汇总行: 营养成分表 ──
    data.push([
      "营养成分表",
      Math.round(totalWeight * 10000) / 10000,
      Math.round(totalRatio * 100000) / 100000,
      Math.round(totalNutrition.calories * 10000) / 10000,
      Math.round(totalNutrition.protein * 10000) / 10000,
      Math.round(totalNutrition.fat * 10000) / 10000,
      Math.round(totalNutrition.carbohydrate * 10000) / 10000,
      Math.round(totalNutrition.sodium * 10000) / 10000,
    ]);
    currentRow++;

    // ── NRV 参考值行 ──
    data.push(["营养素参考值(NRV)", "", "_", 8400, 60, 60, 300, 2000]);
    currentRow++;

    // ── NRV% 行 ──
    const nrvPctValues = nrvItems.map((item) => {
      const cfg = NRV_REF[item.key];
      return cfg.refValue > 0 ? Math.round((item.value / cfg.refValue) * 100 * 10000) / 10000 : 0;
    });
    data.push(["营养素参考值%", "", "_", nrvPctValues[0], nrvPctValues[1], nrvPctValues[2], nrvPctValues[3], nrvPctValues[4]]);
    currentRow++;
  }

  // ── 配方名（小标题）──
  data.push([formula.name, "", "", "", "", "", "", ""]);
  currentRow++;

  if (showNrvTable) {
    // ── 区域标题: 营养成分表 + 技术处理依据 ──
    data.push(["营养成分表", "", "", "", "技术处理依据", "", "", ""]);
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
    merges.push({ s: { r: currentRow, c: 4 }, e: { r: currentRow, c: 5 } });
    currentRow++;

    // ── NRV 表头 ──
    data.push(["项目", "每100克(g)", "", "营养素参考值%", "0界限值", "允许误差范围", "", ""]);
    merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 2 } });
    currentRow++;

    // ── NRV 数据行（5 项）──
    nrvItems.forEach((item) => {
      const cfg = NRV_REF[item.key];
      const per100g = item.key === "sodium"
        ? Math.round(totalNutrition.sodium * 100) / 100
        : Math.round(item.value * 100) / 100;
      const nrvRatio = cfg.refValue > 0
        ? Math.round((per100g / cfg.refValue) * 100) / 100
        : 0;
      data.push([item.label, per100g, cfg.unitLabel, nrvRatio, cfg.zeroLimit, cfg.tolerance, "", ""]);
      currentRow++;
    });

    // ── 空行 ──
    data.push(["", "", "", "", "", "", "", ""]);
    currentRow++;
  }

  if (showUsageNotes) {
    // ── 使用说明 ──
    data.push(["使用说明：", "", "", "", "", "", "", ""]);
    data.push(["(1)含量比指原料在成品中含量比", "", "", "", "", "", "", ""]);
    data.push(["(2)每100g原料中营养素值通过中国食物成分表或原料营养标签或自检测中查找", "", "", "", "", "", "", ""]);
    data.push(["(3)营养素参考值(NRV)在GB 28050附录A查找", "", "", "", "", "", "", ""]);
    data.push(["(4)只需输入配料重量和各配料营养素值就可自动计算出营养成分表", "", "", "", "", "", "", ""]);
    data.push(["(5)通过技术处理就可以得出正式营养成分表", "", "", "", "", "", "", ""]);
  }

  // ===== 创建 Sheet =====
  const sheet = XLSX.utils.aoa_to_sheet(data);

  // ===== 追加行级 merges =====
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }); // Row 0 A-B
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }); // Row 1 A-H

  // 去重 merges（Row 0/1 可能重复）
  const seen = new Set<string>();
  const uniqueMerges = merges.filter((m) => {
    const key = `${m.s.r},${m.s.c}-${m.e.r},${m.e.c}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  sheet["!merges"] = uniqueMerges;

  // ===== 列宽 =====
  sheet["!cols"] = [
    { wch: 16 }, // A: 原料名
    { wch: 12 }, // B: 配方(g)
    { wch: 12 }, // C: 含量比
    { wch: 16 }, // D: 能量
    { wch: 16 }, // E: 蛋白质
    { wch: 16 }, // F: 脂肪
    { wch: 18 }, // G: 碳水化合物
    { wch: 14 }, // H: 钠
  ];

  // ===== 应用样式 =====
  applyStyles(sheet, N, sumRow, currentRow, nrvItems, showCalcTable, showNrvTable, showUsageNotes);

  // ===== 生成文件 =====
  const buffer = XLSX.write(workbook_from_sheet(sheet, formula.name), {
    type: "buffer",
    bookType: "xlsx",
  });
  const fileName = `${formula.name}营养成分表${versionLabel}.xlsx`.replace(/[/\\?%*:|"<>]/g, "_");

  return { buffer, fileName };
}

function workbook_from_sheet(sheet: XLSX.WorkSheet, name: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const safeName = name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, sheet, safeName || "营养成分表");
  return wb;
}

// ===== 样式应用 =====

function applyStyles(
  sheet: XLSX.WorkSheet,
  materialCount: number,
  sumRow: number,
  totalRows: number,
  nrvItems: Array<{ key: string; label: string; value: number }>,
  showCalcTable: boolean,
  showNrvTable: boolean,
  showUsageNotes: boolean,
) {
  const lastDataRow = totalRows - 1;

  for (let r = 0; r <= lastDataRow; r++) {
    for (let c = 0; c < 8; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const existing = sheet[addr];
      const val = existing?.v ?? "";
      const s = getStyleForCell(r, c, val, materialCount, sumRow, showCalcTable, showNrvTable, showUsageNotes);
      if (s) {
        if (!sheet[addr]) {
          sheet[addr] = { t: typeof val === "number" ? "n" : "s", v: val };
        }
        sheet[addr].s = s;
      }
    }
  }
}

function getStyleForCell(
  r: number,
  c: number,
  _val: string | number,
  materialCount: number,
  sumRow: number,
  _showCalcTable: boolean,
  _showNrvTable: boolean,
  _showUsageNotes: boolean,
): Record<string, unknown> | null {
  // ── Row 0: 配方名 + 重量 ──
  if (r === 0) {
    if (c <= 1) {
      return { font: { sz: 12 }, alignment: { horizontal: "right", vertical: "center" }, border: undefined };
    }
    if (c === 2) {
      return { font: { sz: 11 }, alignment: { horizontal: "left", vertical: "center" } };
    }
    return null;
  }

  // ── Row 1: 标题 ──
  if (r === 1) {
    return {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // ── Row 2: 表头 ──
  if (r === 2) {
    return {
      font: { sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_THIN,
    };
  }

  // ── 原料数据行 (3 ~ 3+N-1) ──
  if (r >= 3 && r < 3 + materialCount) {
    return getMaterialRowStyle(c);
  }

  // ── 空行占位 (3+N ~ 3+2N-1) ──
  if (r >= 3 + materialCount && r < sumRow) {
    return getMaterialRowStyle(c);
  }

  // ── 汇总行 (sumRow) ──
  if (r === sumRow) {
    return getSummaryRowStyle(c);
  }

  // ── NRV 参考值行 (sumRow+1) ──
  if (r === sumRow + 1) {
    return getNrvRefRowStyle(c);
  }

  // ── NRV% 行 (sumRow+2) ──
  if (r === sumRow + 2) {
    return getNrvPctRowStyle(c);
  }

  // ── 配方名小标题 (sumRow+3) ──
  if (r === sumRow + 3) {
    return { font: { sz: 11 }, alignment: { horizontal: "center", vertical: "center" } };
  }

  // ── 区域标题 (sumRow+4): 营养成分表 + 技术处理依据 ──
  if (r === sumRow + 4) {
    if (c <= 3) {
      return {
        font: { sz: 14 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { ...BORDER_TOP_BOTTOM, bottom: { style: "thin" as const, color: { rgb: C.BLACK } } },
      };
    }
    if (c >= 4 && c <= 5) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.MEDIUM_BLUE_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { ...BORDER_TOP_BOTTOM, bottom: { style: "thin" as const, color: { rgb: C.BLACK } } },
      };
    }
    return null;
  }

  // ── NRV 表头 (sumRow+5) ──
  if (r === sumRow + 5) {
    if (c === 0) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_THIN,
      };
    }
    if (c === 1 || c === 2) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_THIN,
      };
    }
    if (c === 3) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_THIN,
      };
    }
    if (c === 4) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.YELLOW_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_THIN,
      };
    }
    if (c === 5) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.BLUE_GRAY_BG } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_THIN,
      };
    }
    return null;
  }

  // ── NRV 数据行 (sumRow+6 ~ sumRow+10) ──
  if (r >= sumRow + 6 && r <= sumRow + 10) {
    if (c === 0) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_LEFT,
      };
    }
    if (c === 1) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "right", vertical: "center" },
      };
    }
    if (c === 2) {
      return {
        font: { sz: 11 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "left", vertical: "center" },
      };
    }
    if (c === 3) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.TEAL_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_RIGHT,
      };
    }
    if (c === 4) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.YELLOW_BG } },
        alignment: { horizontal: "center", vertical: "center" },
        border: BORDER_THIN,
      };
    }
    if (c === 5) {
      return {
        font: { sz: 12 },
        fill: { fgColor: { rgb: C.BLUE_GRAY_BG } },
        alignment: { horizontal: "left", vertical: "center" },
        border: BORDER_THIN,
      };
    }
    return null;
  }

  // ── 空行 (sumRow+11) ──
  if (r === sumRow + 11) {
    return null;
  }

  // ── 使用说明行 (sumRow+12 ~ sumRow+17) ──
  if (r >= sumRow + 12 && r <= sumRow + 17) {
    return {
      font: { sz: 11 },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  return null;
}

function getMaterialRowStyle(c: number): Record<string, unknown> {
  const thinBorder = BORDER_THIN;

  if (c === 0) {
    return {
      font: { sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    };
  }
  if (c === 1) {
    return {
      font: { sz: 11, color: { rgb: C.GRAY } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    };
  }
  if (c === 2) {
    return {
      font: { sz: 12, color: { rgb: C.GREEN_TEXT } },
      fill: { fgColor: { rgb: C.GREEN_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    };
  }
  if (c === 3) {
    return {
      font: { sz: 12, color: { rgb: C.GREEN_TEXT } },
      fill: { fgColor: { rgb: C.BLUE_GRAY_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    };
  }
  // c >= 4: 蛋白质/脂肪/碳水/钠
  return {
    font: { sz: 12, color: { rgb: C.GREEN_TEXT } },
    fill: { fgColor: { rgb: C.GREEN_BG } },
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder,
  };
}

function getSummaryRowStyle(c: number): Record<string, unknown> {
  if (c === 0) {
    return {
      font: { sz: 12 },
      fill: { fgColor: { rgb: C.LIGHT_BLUE_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { ...BORDER_THIN, bottom: { style: "none" as const } },
    };
  }
  if (c === 1 || c === 2) {
    return {
      font: { sz: 12, color: { rgb: C.DARK_BLUE_TEXT } },
      fill: { fgColor: { rgb: C.BLUE_GRAY_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { ...BORDER_THIN, bottom: { style: "none" as const } },
    };
  }
  return {
    font: { sz: 12 },
    fill: { fgColor: { rgb: C.LIGHT_BLUE_BG } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { ...BORDER_THIN, bottom: { style: "none" as const } },
  };
}

function getNrvRefRowStyle(c: number): Record<string, unknown> {
  if (c === 0) {
    return {
      font: { sz: 11 },
      fill: { fgColor: { rgb: C.GREEN_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_THIN,
    };
  }
  if (c === 1 || c === 2) {
    return {
      font: { sz: 11 },
      fill: { fgColor: { rgb: C.BLUE_GRAY_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_THIN,
    };
  }
  return {
    font: { sz: 12 },
    fill: { fgColor: { rgb: C.GREEN_BG } },
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER_THIN,
  };
}

function getNrvPctRowStyle(c: number): Record<string, unknown> {
  if (c === 0) {
    return {
      font: { sz: 11 },
      fill: { fgColor: { rgb: C.LIGHT_BLUE_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_THIN,
    };
  }
  if (c === 1 || c === 2) {
    return {
      font: { sz: 11 },
      fill: { fgColor: { rgb: C.BLUE_GRAY_BG } },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER_THIN,
    };
  }
  return {
    font: { sz: 12 },
    fill: { fgColor: { rgb: C.LIGHT_BLUE_BG } },
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER_THIN,
  };
}
