import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";
import XLSX from "xlsx";

const mockQuery = vi.fn();

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  success: vi.fn((data) => ({ success: true, message: "操作成功", data })),
}));

function createExcelBuffer(rows: Record<string, unknown>[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("excelImportController - Excel导入控制器", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  let sendMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = vi.fn();
    sendMock = vi.fn();

    mockReq = {};
    mockRes = {
      json: jsonMock,
      status: statusMock,
      setHeader: setHeaderMock,
      send: sendMock,
    };
  });

  it("downloadFormulaTemplate - 应发送XLSX文件并设置正确的响应头", async () => {
    const { downloadFormulaTemplate } = await import(
      "../src/controllers/excelImportController.js"
    );

    await downloadFormulaTemplate(mockReq as Request, mockRes as Response);

    expect(setHeaderMock).toHaveBeenCalledWith(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(setHeaderMock).toHaveBeenCalledWith(
      "Content-Disposition",
      "attachment; filename=formula-import-template.xlsx"
    );
    expect(sendMock).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("parseFormulaExcel - 未上传文件时应返回400", async () => {
    mockReq.file = undefined;
    const { parseFormulaExcel } = await import(
      "../src/controllers/excelImportController.js"
    );

    await parseFormulaExcel(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "请上传Excel文件",
      })
    );
  });

  it("parseFormulaExcel - Excel为空时应返回400", async () => {
    const buffer = createExcelBuffer([]);
    mockReq.file = { buffer } as Express.Multer.File;

    const { parseFormulaExcel } = await import(
      "../src/controllers/excelImportController.js"
    );

    await parseFormulaExcel(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("Excel文件为空"),
      })
    );
  });

  it("parseFormulaExcel - 有效数据且原料匹配时应返回解析结果", async () => {
    const buffer = createExcelBuffer([
      { "原料名称": "佛手", "数量(g)": 108 },
      { "原料名称": "低聚异麦芽糖", "数量(g)": 500 },
    ]);
    mockReq.file = { buffer } as Express.Multer.File;

    mockQuery.mockResolvedValue([
      [
        { id: "m1", name: "佛手", code: "FS001", material_type: "herb" },
        { id: "m2", name: "低聚异麦芽糖", code: "DJ001", material_type: "auxiliary" },
      ],
    ]);

    const { parseFormulaExcel } = await import(
      "../src/controllers/excelImportController.js"
    );

    await parseFormulaExcel(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          materials: expect.arrayContaining([
            expect.objectContaining({
              materialId: "m1",
              materialName: "佛手",
              quantity: 108,
              isNew: false,
            }),
            expect.objectContaining({
              materialId: "m2",
              materialName: "低聚异麦芽糖",
              quantity: 500,
              isNew: false,
            }),
          ]),
          missingMaterials: [],
        }),
      })
    );
  });

  it("parseFormulaExcel - 原料不在系统中时应标记为isNew", async () => {
    const buffer = createExcelBuffer([
      { "原料名称": "未知原料A", "数量(g)": 200 },
    ]);
    mockReq.file = { buffer } as Express.Multer.File;

    mockQuery.mockResolvedValue([[]]);

    const { parseFormulaExcel } = await import(
      "../src/controllers/excelImportController.js"
    );

    await parseFormulaExcel(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          materials: expect.arrayContaining([
            expect.objectContaining({
              materialId: null,
              materialName: "未知原料A",
              quantity: 200,
              isNew: true,
            }),
          ]),
          missingMaterials: ["未知原料A"],
        }),
      })
    );
  });

  it("parseFormulaExcel - 缺少数量时应在errors数组中报错", async () => {
    const buffer = createExcelBuffer([
      { "原料名称": "佛手" },
    ]);
    mockReq.file = { buffer } as Express.Multer.File;

    mockQuery.mockResolvedValue([
      [{ id: "m1", name: "佛手", code: "FS001", material_type: "herb" }],
    ]);

    const { parseFormulaExcel } = await import(
      "../src/controllers/excelImportController.js"
    );

    await parseFormulaExcel(mockReq as Request, mockRes as Response);

    const callArgs = jsonMock.mock.calls[0][0] as {
      data: { errors: string[] };
    };
    expect(callArgs.data.errors.length).toBeGreaterThan(0);
    expect(callArgs.data.errors[0]).toContain("数量必须大于0");
  });

  it("parseFormulaExcel - 数量为零或负数时应在errors数组中报错", async () => {
    const buffer = createExcelBuffer([
      { "原料名称": "佛手", "数量(g)": 0 },
      { "原料名称": "甘草", "数量(g)": -5 },
    ]);
    mockReq.file = { buffer } as Express.Multer.File;

    mockQuery.mockResolvedValue([
      [
        { id: "m1", name: "佛手", code: "FS001", material_type: "herb" },
        { id: "m2", name: "甘草", code: "GC001", material_type: "herb" },
      ],
    ]);

    const { parseFormulaExcel } = await import(
      "../src/controllers/excelImportController.js"
    );

    await parseFormulaExcel(mockReq as Request, mockRes as Response);

    const callArgs = jsonMock.mock.calls[0][0] as {
      data: { errors: string[] };
    };
    expect(callArgs.data.errors).toHaveLength(2);
    expect(callArgs.data.errors[0]).toContain("数量必须大于0");
    expect(callArgs.data.errors[1]).toContain("数量必须大于0");
  });

  it("parseFormulaExcel - summary中的计数应正确", async () => {
    const buffer = createExcelBuffer([
      { "原料名称": "佛手", "数量(g)": 108 },
      { "原料名称": "未知原料X", "数量(g)": 300 },
      { "原料名称": "未知原料Y", "数量(g)": 200 },
    ]);
    mockReq.file = { buffer } as Express.Multer.File;

    mockQuery.mockResolvedValue([
      [{ id: "m1", name: "佛手", code: "FS001", material_type: "herb" }],
    ]);

    const { parseFormulaExcel } = await import(
      "../src/controllers/excelImportController.js"
    );

    await parseFormulaExcel(mockReq as Request, mockRes as Response);

    const callArgs = jsonMock.mock.calls[0][0] as {
      data: {
        summary: {
          total: number;
          existing: number;
          new: number;
          hasErrors: boolean;
          hasMissingMaterials: boolean;
        };
        missingMaterials: string[];
      };
    };
    expect(callArgs.data.summary.total).toBe(3);
    expect(callArgs.data.summary.existing).toBe(1);
    expect(callArgs.data.summary.new).toBe(2);
    expect(callArgs.data.summary.hasErrors).toBe(false);
    expect(callArgs.data.summary.hasMissingMaterials).toBe(true);
    expect(callArgs.data.missingMaterials).toEqual(
      expect.arrayContaining(["未知原料X", "未知原料Y"])
    );
  });
});
