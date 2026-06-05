/**
 * 配方导出引擎
 * 将配方数据导出为 Excel 文件
 */
import XLSX from "xlsx";
import { query } from "../config/database-better-sqlite3.js";
import { safeJsonParse, rowToCamelCase } from "./helpers.js";
import { TemplateConfig, getDefaultTemplateConfig, getDefaultSelectedFields } from "./exportFieldRegistry.js";

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

/**
 * 导出配方为 Excel Buffer
 */
export async function exportFormulaToExcel(
  formulaId: string,
  versionId?: string,
  templateConfig?: TemplateConfig,
): Promise<{ buffer: Buffer; fileName: string }> {
  // 获取配方基本信息
  const [formulas]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [formulaId]);
  if (!formulas.length) throw new Error("配方不存在");
  const formula = rowToCamelCase<FormulaRow>(formulas[0]);

  // 确定使用的版本
  let version: VersionRow | null = null;
  let snapshot: any = null;

  if (versionId) {
    const [versions]: any[][] = await query("SELECT * FROM formula_versions WHERE version_id = ?", [versionId]);
    if (versions.length) {
      version = rowToCamelCase(versions[0]);
      snapshot = safeJsonParse(version!.snapshotJson, null);
    }
  }

  // 如果没指定版本或版本不存在，使用配方当前数据
  const materials = snapshot?.materials || safeJsonParse<any[]>(formula.materialsJson, []);
  const ratioFactor = version?.ratioFactor ?? formula.ratioFactor;
  const supplementRatioFactor = version?.supplementRatioFactor ?? formula.supplementRatioFactor;
  const versionLabel = version ? `V${version.versionNumber}` : "当前版本";

  // 获取原料详情和营养数据
  const materialDetails: Map<string, MaterialRow> = new Map();
  const nutritionData: Map<string, NutritionRow> = new Map();

  if (materials.length > 0) {
    const materialIds = materials.map((m: any) => m.materialId).filter(Boolean);
    if (materialIds.length > 0) {
      const placeholders = materialIds.map(() => "?").join(",");
      const [matRows]: any[][] = await query(`SELECT * FROM materials WHERE id IN (${placeholders})`, materialIds);
      matRows.forEach((row: any) => {
        materialDetails.set(row.id, rowToCamelCase<MaterialRow>(row));
      });

      const [nutRows]: any[][] = await query(
        `SELECT * FROM material_nutrition WHERE material_id IN (${placeholders}) AND is_latest = 1`,
        materialIds,
      );
      nutRows.forEach((row: any) => {
        const per100g = safeJsonParse<Record<string, number>>(row.per_100g_json, null);
        if (per100g && row.material_id) {
          nutritionData.set(row.material_id, {
            materialId: row.material_id,
            protein: per100g.protein ?? 0,
            fat: per100g.fat ?? 0,
            carbohydrate: per100g.carbohydrate ?? 0,
            sodium: per100g.sodium ?? 0,
            calories: per100g.calories ?? per100g.energy ?? 0,
            dietaryFiber: per100g.dietary_fiber ?? per100g.dietaryFiber ?? 0,
          });
        }
      });
    }
  }

  const config = templateConfig || getDefaultTemplateConfig('formula', 'excel');
  const fields = config.selectedFields.length > 0
    ? config.selectedFields
    : getDefaultSelectedFields('formula');

  // 构建工作簿
  const workbook = XLSX.utils.book_new();

  // ===== Sheet 1: 配方信息 =====
  if (fields.some((f: string) => ['name','code','salesmanName','finishedWeight','version','createdAt','updatedAt','description','preparationMethod'].includes(f))) {
    const infoData: (string | number)[][] = [["配方基本信息"], [""]];
    if (fields.includes('name')) infoData.push(["配方名称", formula.name]);
    if (fields.includes('code')) infoData.push(["配方编码", formula.code || '—']);
    if (fields.includes('salesmanName')) infoData.push(["业务员", formula.salesmanName]);
    if (fields.includes('version')) infoData.push(["版本", versionLabel]);
    if (fields.includes('createdAt')) infoData.push(["创建时间", formula.createdAt]);
    if (fields.includes('updatedAt')) infoData.push(["最后更新", formula.updatedAt]);
    infoData.push([""]);
    if (fields.includes('finishedWeight')) infoData.push(["成品重量(g)", formula.finishedWeight]);
    if (fields.includes('description') || fields.includes('preparationMethod')) {
      if (fields.includes('description')) infoData.push(["备注", formula.description || "无"]);
      if (fields.includes('preparationMethod')) infoData.push(["制法", formula.preparationMethod || "无"]);
    }
    if (fields.includes('versionReason') && version?.versionReason) {
      infoData.push(["版本说明", version.versionReason]);
    }
    const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
    infoSheet["!cols"] = [{ wch: 16 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, infoSheet, "配方信息");
  }

  // ===== Sheet 2: 原料清单 =====
  if (fields.includes('materialList')) {
    const materialHeader = [
    "序号",
    "原料名称",
    "原料编码",
    "类型",
    "数量(g)",
    "单位",
    "基价(¥/kg)",
    "调整价(¥/kg)",
    "单价状态",
    "小计(¥)",
  ];
  const hasAnyAdjustment = materials.some(
    (m: any) =>
      m.adjustedPrice != null &&
      m.adjustedPrice !== (m.basePriceAtSave ?? materialDetails.get(m.materialId)?.unitPrice),
  );
  const materialRows = materials.map((m: any, i: number) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null;
    const basePrice = m.basePriceAtSave ?? detail?.unitPrice ?? null;
    const adjPrice = m.adjustedPrice ?? null;
    const effectivePrice = adjPrice != null ? adjPrice : basePrice;
    const isAdjusted = adjPrice != null && adjPrice !== basePrice;
    const subtotal = effectivePrice != null ? Number((((m.quantity || 0) / 1000) * effectivePrice).toFixed(4)) : 0;
    return [
      i + 1,
      detail?.name || m.materialName || "未匹配原料",
      detail?.code || "",
      detail?.materialType === "supplement" ? "辅料" : "药材",
      m.quantity || 0,
      detail?.unit || "g",
      basePrice != null ? Number(basePrice).toFixed(2) : "--",
      adjPrice != null ? Number(adjPrice).toFixed(2) : "--",
      isAdjusted ? "已调整" : effectivePrice != null ? "基价" : "未录入",
      subtotal > 0 ? subtotal.toFixed(2) : "--",
    ];
  });
  const materialData = [materialHeader, ...materialRows];
  const materialSheet = XLSX.utils.aoa_to_sheet(materialData);
  materialSheet["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ];
  if (hasAnyAdjustment) {
    const range = XLSX.utils.decode_range(materialSheet["!ref"] || "A1");
    for (let r = 1; r <= materialRows.length; r++) {
      const statusCell = materialSheet[XLSX.utils.encode_cell({ r, c: 8 })];
      if (statusCell && statusCell.v === "已调整") {
        statusCell.s = { font: { bold: true, color: { rgb: "B45309" } }, fill: { fgColor: { rgb: "FEF3C7" } } };
        const adjPriceCell = materialSheet[XLSX.utils.encode_cell({ r, c: 7 })];
        if (adjPriceCell) adjPriceCell.s = { font: { bold: true, color: { rgb: "D97706" } } };
      }
    }
  }
  XLSX.utils.book_append_sheet(workbook, materialSheet, "原料清单");
  }

  // ===== Sheet 3: 报价信息 =====
  if (fields.includes('priceInfo')) {
    const materialTotalCost = materials.reduce((sum: number, m: any) => {
    const detail = m.materialId ? materialDetails.get(m.materialId) : null;
    const basePrice = m.basePriceAtSave ?? detail?.unitPrice ?? null;
    const adjPrice = m.adjustedPrice ?? null;
    const effectivePrice = adjPrice != null ? adjPrice : basePrice;
    return sum + (effectivePrice != null ? ((m.quantity || 0) / 1000) * effectivePrice : 0);
  }, 0);
  const packagingPrice = formula.packagingPrice ?? 0;
  const otherPrice = formula.otherPrice ?? 0;
  const profitMargin = formula.profitMargin ?? 20;
  const costSubtotal = materialTotalCost + packagingPrice + otherPrice;
  const profitAmount = (costSubtotal * profitMargin) / 100;
  const totalPrice = costSubtotal + profitAmount;

  const fw = formula.finishedWeight;
  const fwLabel = fw > 0 ? `${fw}g` : '0g';

  const quotationData = [
    ["报价信息"],
    [""],
    ["规格(成品重量)", `${fwLabel}`],
    [""],
    ["原料总成本(¥)", Number(materialTotalCost.toFixed(2))],
    ["包装费(¥)", Number(packagingPrice.toFixed(2))],
    ["其他费用(¥)", Number(otherPrice.toFixed(2))],
    ["成本小计(¥)", Number(costSubtotal.toFixed(2))],
    ["利润率(%)", profitMargin],
    ["利润金额(¥)", Number(profitAmount.toFixed(2))],
    [""],
    ["报价总价(¥)", Number(totalPrice.toFixed(2))],
    [""],
    ["计算公式", "报价 = (原料总成本 + 包装费 + 其他费) × (1 + 利润率%)"],
  ];
  const quotationSheet = XLSX.utils.aoa_to_sheet(quotationData);
  quotationSheet["!cols"] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, quotationSheet, "报价信息");
  }

  // 预计算配方总营养成分（nutritionTable 和 nrvTable 共用）
  const totalNutrition = { protein: 0, fat: 0, carbohydrate: 0, sodium: 0, calories: 0 };
  materials.forEach((m: any) => {
    const nutrition = m.materialId ? nutritionData.get(m.materialId) : null;
    if (nutrition) {
      const ratio = (m.quantity || 0) / 100;
      totalNutrition.protein += nutrition.protein * ratio;
      totalNutrition.fat += nutrition.fat * ratio;
      totalNutrition.carbohydrate += nutrition.carbohydrate * ratio;
      totalNutrition.sodium += nutrition.sodium * ratio;
      totalNutrition.calories += nutrition.calories * ratio;
    }
  });

  // ===== Sheet 4: 营养数据 =====
  if (fields.includes('nutritionTable')) {
    const nutritionHeader = [
    "序号",
    "原料名称",
    "蛋白质(g/100g)",
    "脂肪(g/100g)",
    "碳水化合物(g/100g)",
    "钠(mg/100g)",
    "热量(kcal/100g)",
    "膳食纤维(g/100g)",
  ];
    const nutritionRows = materials.map((m: any, i: number) => {
      const detail = m.materialId ? materialDetails.get(m.materialId) : null;
      const nutrition = m.materialId ? nutritionData.get(m.materialId) : null;
      return [
        i + 1,
        detail?.name || m.materialName || "未匹配原料",
        nutrition?.protein ?? 0,
        nutrition?.fat ?? 0,
        nutrition?.carbohydrate ?? 0,
        nutrition?.sodium ?? 0,
        nutrition?.calories ?? 0,
        nutrition?.dietaryFiber ?? 0,
      ];
    });
    const nutritionData2 = [nutritionHeader, ...nutritionRows];

    nutritionData2.push([]);
    nutritionData2.push([
      "",
      "配方合计",
      totalNutrition.protein.toFixed(2),
      totalNutrition.fat.toFixed(2),
      totalNutrition.carbohydrate.toFixed(2),
      totalNutrition.sodium.toFixed(2),
      totalNutrition.calories.toFixed(2),
      "--",
    ]);

    const nutritionSheet = XLSX.utils.aoa_to_sheet(nutritionData2);
    nutritionSheet["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, nutritionSheet, "营养数据");
  }

  // ===== Sheet 5: 营养成分表(NRV%) =====
  if (fields.includes('nrvTable')) {
    const NRV_CONFIG: Record<string, { unitLabel: string; refValue: number; zeroLimit: string; tolerance: string }> = {
      energy:   { unitLabel: "千焦(kJ)", refValue: 8400, zeroLimit: "≤17千焦(kJ)", tolerance: "≤120%标示值" },
      protein:  { unitLabel: "克(g)",   refValue: 60,   zeroLimit: "≤0.5克(g)",   tolerance: "≥80%标示值" },
      fat:       { unitLabel: "克(g)",   refValue: 60,   zeroLimit: "≤0.5克(g)",   tolerance: "≤120%标示值" },
      carbohydrate: { unitLabel: "克(g)", refValue: 300, zeroLimit: "≤0.5克(g)", tolerance: "≥80%标示值" },
      sodium:    { unitLabel: "毫克(mg)", refValue: 2000, zeroLimit: "≤5毫克(mg)", tolerance: "≤120%标示值" },
    };

    const nrvItems = [
      { key: "energy", label: "能量", value: totalNutrition.calories },
      { key: "protein", label: "蛋白质", value: totalNutrition.protein },
      { key: "fat", label: "脂肪", value: totalNutrition.fat },
      { key: "carbohydrate", label: "碳水化合物", value: totalNutrition.carbohydrate },
      { key: "sodium", label: "钠", value: totalNutrition.sodium / 1000 },
    ];

    const nrvHeader = ["项目", "每100克(g)", "", "营养素参考值%", "0界限值", "允许误差范围"];
    const nrvRows = nrvItems.map((item) => {
      const config = NRV_CONFIG[item.key];
      const per100g = item.value;
      const nrvPct = config.refValue > 0 ? ((per100g / config.refValue) * 100).toFixed(2) : "0.00";
      return [
        item.label,
        per100g > 0 ? parseFloat(per100g.toFixed(4).replace(/\.?0+$/, "")) : 0,
        config.unitLabel,
        nrvPct,
        config.zeroLimit,
        config.tolerance,
      ];
    });

    const nrvData = [["营养成分表"], [""], nrvHeader, ...nrvRows];
    const nrvSheet = XLSX.utils.aoa_to_sheet(nrvData);
    nrvSheet["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, nrvSheet, "营养成分表");
  }

  // ===== Sheet 6: 使用说明 =====
  if (fields.includes('usageNotes')) {
    const usageData = [
      ["使用说明"],
      [""],
      ["(1) 含量比指原料在成品中含量比"],
      ["(2) 每100g原料中营养素值通过中国食物成分表或原料营养标签或自检测中查找"],
      ["(3) 营养素参考值(NRV)在GB 28050附录A查找"],
      ["(4) 只需输入配料重量和各配料营养素值就可自动计算出营养成分表"],
      ["(5) 通过技术处理就可以得出正式营养成分表"],
      [""],
      [`由 TingStudio 生成于 ${new Date().toLocaleString("zh-CN")}`],
    ];
    const usageSheet = XLSX.utils.aoa_to_sheet(usageData);
    usageSheet["!cols"] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, usageSheet, "使用说明");
  }

  // 生成文件
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `${formula.name}_${versionLabel}.xlsx`.replace(/[/\\?%*:|"<>]/g, "_");

  return { buffer, fileName };
}
