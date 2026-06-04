import { describe, it, expect, vi, beforeEach } from "vitest";
import XLSX from "xlsx";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));
vi.mock("../src/config/database-better-sqlite3.js", () => ({ query: mockQuery }));
vi.mock("../src/utils/helpers.js", () => ({
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
  safeJsonParse: vi.fn((str: string | null, def: unknown) => (str ? JSON.parse(str) : def)),
}));

import { exportFormulaToExcel } from "../src/utils/formulaExporter.js";

const baseFormulaRow: Record<string, unknown> = {
  id: "f1",
  name: "测试配方",
  salesman_name: "张三",
  finished_weight: 500,
  ratio_factor: 0.18,
  supplement_ratio_factor: 1.0,
  packaging_price: 2.5,
  other_price: 1.0,
  profit_margin: 20,
  description: "测试描述",
  preparation_method: "煎煮",
  materials_json: JSON.stringify([
    { materialId: "m1", materialName: "黄芪", quantity: 50, basePriceAtSave: 120, adjustedPrice: null },
  ]),
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

const baseMaterialRow: Record<string, unknown> = {
  id: "m1",
  name: "黄芪",
  code: "HQ001",
  unit: "g",
  material_type: "herb",
  unit_price: 120.0,
};

const baseNutritionRow: Record<string, unknown> = {
  material_id: "m1",
  per_100g_json: JSON.stringify({
    protein: 15.5,
    fat: 3.2,
    carbohydrate: 45.0,
    sodium: 120,
    calories: 280,
    dietary_fiber: 8.5,
  }),
  is_latest: 1,
};

function setupMocksWithoutVersion(): void {
  mockQuery.mockResolvedValueOnce([[baseFormulaRow]]);
  mockQuery.mockResolvedValueOnce([[baseMaterialRow]]);
  mockQuery.mockResolvedValueOnce([[baseNutritionRow]]);
}

function readSheet(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
}

describe("formulaExporter - 配方导出引擎", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("配方不存在时抛出错误", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    await expect(exportFormulaToExcel("nonexistent")).rejects.toThrow("配方不存在");
  });

  it("不指定版本时使用当前配方数据", async () => {
    setupMocksWithoutVersion();

    const result = await exportFormulaToExcel("f1");
    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    const infoData = readSheet(workbook, "配方信息");
    const versionRow = infoData.find((row) => row[0] === "版本");

    expect(versionRow).toBeDefined();
    expect((versionRow as unknown[])[1]).toBe("当前版本");
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery).toHaveBeenNthCalledWith(1, "SELECT * FROM formulas WHERE id = ?", ["f1"]);
  });

  it("指定版本ID时使用版本快照数据", async () => {
    const snapshotMaterials = [
      { materialId: "m1", materialName: "黄芪", quantity: 80, basePriceAtSave: 100 },
    ];
    const versionRow: Record<string, unknown> = {
      version_id: "v1",
      version_number: "2",
      version_name: "V2",
      version_reason: "调整配方",
      status: "active",
      is_current: 0,
      snapshot_json: JSON.stringify({ materials: snapshotMaterials }),
      ratio_factor: 0.2,
      supplement_ratio_factor: 1.0,
      created_at: "2026-01-03T00:00:00.000Z",
    };

    mockQuery.mockResolvedValueOnce([[baseFormulaRow]]);
    mockQuery.mockResolvedValueOnce([[versionRow]]);
    mockQuery.mockResolvedValueOnce([[baseMaterialRow]]);
    mockQuery.mockResolvedValueOnce([[baseNutritionRow]]);

    const templateConfig = {
      selectedFields: ['name', 'code', 'salesmanName', 'finishedWeight', 'version', 'versionReason', 'materialList', 'priceInfo', 'nutritionTable'],
      requiredFields: ['name'],
      exportFormat: 'excel' as const,
      orientation: 'landscape' as const,
      pageSize: 'A4',
      fontSize: 10,
      includeHeader: true,
      includeFooter: true,
    };

    const result = await exportFormulaToExcel("f1", "v1", templateConfig);
    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    const infoData = readSheet(workbook, "配方信息");
    const versionLabelRow = infoData.find((row) => row[0] === "版本");
    const versionReasonRow = infoData.find((row) => row[0] === "版本说明");

    expect((versionLabelRow as unknown[])[1]).toBe("V2");
    expect(versionReasonRow).toBeDefined();
    expect((versionReasonRow as unknown[])[1]).toBe("调整配方");
  });

  it("包含原料详情时XLSX原料清单有对应数据", async () => {
    setupMocksWithoutVersion();

    const result = await exportFormulaToExcel("f1");
    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    const materialData = readSheet(workbook, "原料清单");

    expect(materialData[0]).toContain("原料名称");
    expect((materialData[1] as unknown[])[1]).toBe("黄芪");
    expect((materialData[1] as unknown[])[2]).toBe("HQ001");
    expect((materialData[1] as unknown[])[3]).toBe("药材");
  });

  it("包含营养数据时XLSX营养数据表有对应数据", async () => {
    setupMocksWithoutVersion();

    const result = await exportFormulaToExcel("f1");
    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    const nutritionDataArr = readSheet(workbook, "营养数据");

    expect(nutritionDataArr[0]).toContain("蛋白质(g/100g)");
    expect((nutritionDataArr[1] as unknown[])[1]).toBe("黄芪");
    expect((nutritionDataArr[1] as unknown[])[2]).toBe(15.5);

    const totalRow = nutritionDataArr.find((row) => row[1] === "配方合计");
    expect(totalRow).toBeDefined();
  });

  it("文件名包含配方名称和版本标签", async () => {
    setupMocksWithoutVersion();

    const result = await exportFormulaToExcel("f1");
    expect(result.fileName).toBe("测试配方_当前版本.xlsx");

    mockQuery.mockResolvedValueOnce([[baseFormulaRow]]);
    mockQuery.mockResolvedValueOnce([[
      {
        version_id: "v2",
        version_number: "3",
        version_name: null,
        version_reason: null,
        status: "active",
        is_current: 0,
        snapshot_json: JSON.stringify({ materials: [] }),
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]]);

    const result2 = await exportFormulaToExcel("f1", "v2");
    expect(result2.fileName).toBe("测试配方_V3.xlsx");
  });

  it("返回的buffer是有效的XLSX格式", async () => {
    setupMocksWithoutVersion();

    const result = await exportFormulaToExcel("f1");

    expect(result.buffer).toBeInstanceOf(Buffer);
    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    expect(workbook.SheetNames).toEqual(["配方信息", "原料清单", "报价信息", "营养数据"]);
  });

  it("原料列表为空时仍能生成有效XLSX", async () => {
    const emptyFormulaRow: Record<string, unknown> = {
      ...baseFormulaRow,
      materials_json: JSON.stringify([]),
    };
    mockQuery.mockResolvedValueOnce([[emptyFormulaRow]]);

    const result = await exportFormulaToExcel("f1");
    const workbook = XLSX.read(result.buffer, { type: "buffer" });

    expect(workbook.SheetNames).toEqual(["配方信息", "原料清单", "报价信息", "营养数据"]);

    const materialData = readSheet(workbook, "原料清单");
    expect(materialData.length).toBe(1);

    const nutritionDataArr = readSheet(workbook, "营养数据");
    expect(nutritionDataArr.length).toBeGreaterThanOrEqual(1);

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
