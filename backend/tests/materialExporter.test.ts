import { describe, it, expect, beforeEach, vi } from "vitest";
import XLSX from "xlsx";

const mockQuery = vi.fn();
vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
}));

function makeDbRow(overrides: Partial<{
  id: string;
  name: string;
  code: string;
  unit: string;
  material_type: string;
  unit_price: number | null;
  stock: number;
}> = {}) {
  return {
    id: "mat-001",
    name: "黄芪",
    code: "HQ001",
    unit: "kg",
    material_type: "herb",
    unit_price: 120.5,
    stock: 50,
    ...overrides,
  };
}

describe("materialExporter - 原料导出工具", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未找到匹配原料时应抛出错误", async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const { exportMaterialToExcel } = await import("../src/utils/materialExporter.js");

    await expect(exportMaterialToExcel(["non-existent-id"])).rejects.toThrow(
      "未找到匹配的原料数据",
    );
  });

  it("导出 Excel 应返回 buffer 和 fileName", async () => {
    mockQuery.mockResolvedValueOnce([[makeDbRow()]]);

    const { exportMaterialToExcel } = await import("../src/utils/materialExporter.js");
    const result = await exportMaterialToExcel(["mat-001"]);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.fileName).toMatch(/\.xlsx$/);

    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    expect(workbook.SheetNames).toContain("原料清单");
  });

  it("文件名应包含日期 YYYYMMDD 格式", async () => {
    mockQuery.mockResolvedValueOnce([[makeDbRow()]]);

    const { exportMaterialToExcel } = await import("../src/utils/materialExporter.js");
    const result = await exportMaterialToExcel(["mat-001"]);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(result.fileName).toBe(`原料导出_${dateStr}.xlsx`);
  });

  it("原料类型解析：herb 应为药材，supplement 应为辅料", async () => {
    mockQuery.mockResolvedValueOnce([
      [makeDbRow({ material_type: "herb" }), makeDbRow({ id: "mat-002", name: "蜂蜜", code: "FM001", material_type: "supplement", unit_price: 35.0, stock: 100 })],
    ]);

    const { exportMaterialToExcel } = await import("../src/utils/materialExporter.js");
    const result = await exportMaterialToExcel(["mat-001", "mat-002"]);

    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    const sheet = workbook.Sheets["原料清单"];
    const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    expect(data[1][4]).toBe("药材");
    expect(data[2][4]).toBe("辅料");
  });

  it("单价为 null 时应显示--", async () => {
    mockQuery.mockResolvedValueOnce([[makeDbRow({ unit_price: null })]]);

    const { exportMaterialToExcel } = await import("../src/utils/materialExporter.js");
    const result = await exportMaterialToExcel(["mat-001"]);

    const workbook = XLSX.read(result.buffer, { type: "buffer" });
    const sheet = workbook.Sheets["原料清单"];
    const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    expect(data[1][5]).toBe("--");
  });

  it("导出 PDF 应返回 buffer 和 fileName", async () => {
    mockQuery.mockResolvedValueOnce([[makeDbRow()]]);

    const { exportMaterialToPdf } = await import("../src/utils/materialExporter.js");
    const result = await exportMaterialToPdf(["mat-001"]);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.fileName).toMatch(/\.pdf$/);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(result.fileName).toBe(`原料导出_${dateStr}.pdf`);
  });
});
