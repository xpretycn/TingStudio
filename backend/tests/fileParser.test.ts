import { describe, it, expect } from "vitest";
import { fileParserService } from "../src/services/file/fileParser.js";
import * as XLSX from "xlsx";

describe("FileParserService - 文件解析服务", () => {
  describe("detectFileType()", () => {
    it("应该正确识别Excel文件类型", () => {
      expect(fileParserService.detectFileType("test.xlsx")).toBe("excel");
      expect(fileParserService.detectFileType("data.xls")).toBe("excel");
    });

    it("应该正确识别图片文件类型", () => {
      expect(fileParserService.detectFileType("photo.jpg")).toBe("image");
      expect(fileParserService.detectFileType("image.png")).toBe("image");
      expect(fileParserService.detectFileType("pic.webp")).toBe("image");
    });

    it("应该正确识别PDF文件类型", () => {
      expect(fileParserService.detectFileType("document.pdf")).toBe("pdf");
    });

    it("应该对未知类型返回unknown", () => {
      expect(fileParserService.detectFileType("file.txt")).toBe("unknown");
      expect(fileParserService.detectFileType("video.mp4")).toBe("unknown");
    });
  });

  describe("parseExcel()", () => {
    it("应该解析Excel缓冲区并提取数据", async () => {
      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        ["名称", "重量(g)", "单价(元/kg)", "类型"],
        ["人参", 500, 200, "药材"],
        ["枸杞", 300, 60, "辅料"],
        ["红枣", 400, 25, "辅料"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = await fileParserService.parseExcel(buffer, "test.xlsx");

      expect(result.success).toBe(true);
      expect(result.file_type).toBe("excel");
      expect(result.total_records).toBe(3);
      expect(result.sheets_parsed).toBe(1);
      expect(result.data.length).toBe(3);

      const firstRecord = result.data[0];
      expect(firstRecord.data.name).toBe("人参");
      expect(firstRecord.data.weight).toBe(500);
      expect(firstRecord.data.unit_price).toBe(200);
      expect(firstRecord.sheet_name).toBe("Sheet1");
    });

    it("应该处理多Sheet工作簿", async () => {
      const workbook = XLSX.utils.book_new();

      const sheet1Data = [
        ["名称", "数量"],
        ["A", 1],
      ];
      const sheet2Data = [
        ["产品", "价格"],
        ["X", 100],
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

      XLSX.utils.book_append_sheet(workbook, ws1, "原料表");
      XLSX.utils.book_append_sheet(workbook, ws2, "价格表");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const result = await fileParserService.parseExcel(buffer, "multi.xlsx");

      expect(result.success).toBe(true);
      expect(result.sheets_parsed).toBe(2);
      expect(result.total_records).toBe(2);
    });

    it("应该处理空工作簿", async () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([["标题"]]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Empty");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const result = await fileParserService.parseExcel(buffer, "empty.xlsx");

      expect(result.success).toBe(true);
      expect(result.total_records).toBe(0);
    });

    it("应该处理无效的Excel数据", async () => {
      const invalidBuffer = Buffer.from("invalid excel data");
      const result = await fileParserService.parseExcel(invalidBuffer, "invalid.xlsx");

      expect(result.total_records).toBe(0);
      expect(result.data.length).toBe(0);
    });
  });

  describe("字段映射和清洗", () => {
    it("应该将中文列名映射为英文标准字段名", async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ["名称", "重量", "单价", "蛋白质", "脂肪", "碳水化合物", "钠", "含量比"],
        ["测试", 100, 50, 5.2, 1.1, 23.4, 8, 0.18],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, "Test");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const result = await fileParserService.parseExcel(buffer, "mapping.xlsx");

      expect(result.success).toBe(true);
      const record = result.data[0].data;
      expect(record.name).toBe("测试");
      expect(record.weight).toBe(100);
      expect(record.unit_price).toBe(50);
      expect(record.protein).toBe(5.2);
      expect(record.fat).toBe(1.1);
      expect(record.carbohydrate).toBe(23.4);
      expect(record.sodium).toBe(8);
      expect(record.ratio_factor).toBe(0.18);
    });

    it("应该正确解析数值类型", async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Name", "Value"],
        ["Integer", 42],
        ["Float", 3.14],
        ["String", "hello"],
        ["Empty", ""],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, "Types");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const result = await fileParserService.parseExcel(buffer, "types.xlsx");

      expect(result.data[0].data.value).toBe(42);
      expect(typeof result.data[0].data.value).toBe("number");
      expect(result.data[1].data.value).toBeCloseTo(3.14);
      expect(result.data[2].data.value).toBe("hello");
      expect(result.data[3].data.value).toBe("");
    });
  });

  describe("generateSummary()", () => {
    it("应该生成完整的解析摘要", async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ["名称", "重量", "单价", "类型"],
        ["A", 100, 50, "药材"],
        ["B", 200, 30, "辅料"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, "Summary");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const result = await fileParserService.parseExcel(buffer, "summary.xlsx");

      expect(result.summary).toBeDefined();
      expect(result.summary!.total_fields).toBe(4);
      expect(result.summary!.fields).toContain("name");
      expect(result.summary!.fields).toContain("weight");
      expect(result.summary!.numeric_fields.length).toBeGreaterThan(0);
      expect(result.summary!.completeness).toBeGreaterThan(0);
    });
  });
});
