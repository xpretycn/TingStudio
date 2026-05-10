import * as XLSX from "xlsx";
import type { ParsedData, ParseResult } from "../../types/file.js";

class FileParserService {
  async parseExcel(buffer: Buffer, filename: string): Promise<ParseResult> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          success: false,
          file_type: "excel",
          filename,
          error: "Invalid Excel file: no sheets found",
          data: [],
          total_records: 0,
        };
      }

      const results: ParsedData[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) continue;

        const headers = this.normalizeHeaders(jsonData[0]);
        const dataRows = jsonData.slice(1).filter(row => row && row.length > 0);

        for (const row of dataRows) {
          const record: Record<string, any> = {};
          headers.forEach((header, index) => {
            record[header] = this.cleanValue(row[index] ?? "");
          });

          results.push({
            sheet_name: sheetName,
            row_number: dataRows.indexOf(row) + 2,
            data: record,
          });
        }
      }

      return {
        success: true,
        file_type: "excel",
        filename,
        total_records: results.length,
        sheets_parsed: workbook.SheetNames.length,
        data: results,
        summary: results.length > 0 ? this.generateSummary(results) : undefined,
      };
    } catch (error) {
      return {
        success: false,
        file_type: "excel",
        filename,
        error: error instanceof Error ? error.message : "Failed to parse Excel file",
        data: [],
        total_records: 0,
      };
    }
  }

  async parseImage(imageBuffer: Buffer, filename: string, aiService?: any): Promise<ParseResult> {
    try {
      if (!aiService) {
        return {
          success: false,
          file_type: "image",
          filename,
          error: "AI service required for image parsing. Please provide vision-capable model.",
          data: [],
          total_records: 0,
        };
      }

      const base64Image = imageBuffer.toString("base64");
      const imageExt = filename.split(".").pop()?.toLowerCase() || "png";
      const mimeType = `image/${imageExt === "jpg" ? "jpeg" : imageExt}`;

      const prompt = `请分析这张图片中的内容，提取所有可见的文字、数字和表格信息。如果是配方或原料列表，请以结构化格式返回。`;

      const result = await aiService.chatCompletion("zhipu", [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          ],
        },
      ]);

      const extractedText = result.content;
      const parsedData = this.parseTextToRecords(extractedText);

      return {
        success: true,
        file_type: "image",
        filename,
        total_records: parsedData.length,
        data: parsedData.map((record, index) => ({
          sheet_name: "image_ocr",
          row_number: index + 1,
          data: record,
        })),
        ocr_text: extractedText,
        confidence: 0.85,
        summary: this.generateSummary(parsedData.map(r => ({ data: r }))),
      };
    } catch (error) {
      return {
        success: false,
        file_type: "image",
        filename,
        error: error instanceof Error ? error.message : "Failed to parse image",
        data: [],
        total_records: 0,
      };
    }
  }

  async parsePDF(pdfBuffer: Buffer, filename: string): Promise<ParseResult> {
    try {
      const textContent = pdfBuffer.toString("utf-8");
      const lines = textContent.split("\n").filter(line => line.trim().length > 0);
      const records = this.parseTextLines(lines);

      return {
        success: true,
        file_type: "pdf",
        filename,
        total_records: records.length,
        data: records.map((record, index) => ({
          sheet_name: "pdf_content",
          row_number: index + 1,
          data: record,
        })),
        raw_text: textContent.substring(0, 5000),
        summary: this.generateSummary(records.map(r => ({ data: r }))),
      };
    } catch (error) {
      return {
        success: false,
        file_type: "pdf",
        filename,
        error: error instanceof Error ? error.message : "Failed to parse PDF",
        data: [],
        total_records: 0,
      };
    }
  }

  private normalizeHeaders(headers: any[]): string[] {
    return headers.map((header, index) => {
      if (!header || typeof header !== "string") return `column_${index}`;

      const original = String(header).trim();
      const normalized = original
        .toLowerCase()
        .replace(/[\s_]+/g, "_")
        .replace(/[^\w\u4e00-\u9fa5()（）]/g, "");

      const fieldMapping: Record<string, string> = {
        名称: "name",
        name: "name",
        品名: "name",
        重量: "weight",
        "重量(g)": "weight",
        重量g: "weight",
        quantity: "weight",
        用量: "weight",
        数量: "weight",
        单价: "unit_price",
        "单价(元/kg)": "unit_price",
        单价元kg: "unit_price",
        price: "unit_price",
        价格: "unit_price",
        类型: "type",
        类别: "type",
        蛋白质: "protein",
        protein: "protein",
        脂肪: "fat",
        fat: "fat",
        碳水: "carbohydrate",
        碳水化合物: "carbohydrate",
        钠: "sodium",
        sodium: "sodium",
        含量比: "ratio_factor",
        ratiofactor: "ratio_factor",
        药材类型: "material_type",
        herb_type: "material_type",
      };

      return fieldMapping[normalized] || fieldMapping[original] || normalized;
    });
  }

  private cleanValue(value: any): any {
    if (value === null || value === undefined || value === "") return "";

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^-?\d+\.?\d*$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
      return trimmed;
    }

    if (typeof value === "number") {
      return isNaN(value) ? "" : value;
    }

    return value;
  }

  private parseTextToRecords(text: string): Record<string, any>[] {
    const lines = text.split("\n").filter(l => l.trim());
    const records: Record<string, any>[] = [];

    let currentRecord: Record<string, any> = {};

    for (const line of lines) {
      if (line.match(/^\d+[.\)]\s/)) {
        if (Object.keys(currentRecord).length > 0) {
          records.push(currentRecord);
        }
        currentRecord = { raw_text: line.replace(/^\d+[.\)]\s/, "").trim() };
      } else if (line.includes(":") || line.includes("：")) {
        const [key, ...valueParts] = line.split(/[:：]/);
        if (currentRecord.raw_text) {
          currentRecord[key.trim()] = valueParts.join(":").trim();
        }
      } else {
        if (currentRecord.raw_text) {
          currentRecord.raw_text += " " + line.trim();
        }
      }
    }

    if (Object.keys(currentRecord).length > 0) {
      records.push(currentRecord);
    }

    return records;
  }

  private parseTextLines(lines: string[]): Record<string, any>[] {
    const records: Record<string, any>[] = [];

    for (const line of lines) {
      const record: Record<string, any> = { line_content: line.trim() };

      const keyValueMatch = line.match(/^([^:：]+)[:：](.+)$/);
      if (keyValueMatch) {
        record.key = keyValueMatch[1].trim();
        record.value = keyValueMatch[2].trim();
      }

      records.push(record);
    }

    return records;
  }

  private generateSummary(data: Array<{ data: Record<string, any> }>): Record<string, any> {
    if (data.length === 0) return { status: "empty" };

    const sampleKeys = Object.keys(data[0].data);
    const numericFields = sampleKeys.filter(key => data.some(d => typeof d.data[key] === "number"));

    return {
      total_fields: sampleKeys.length,
      fields: sampleKeys,
      numeric_fields: numericFields,
      sample_record: data[0]?.data,
      completeness: Math.round(
        (data.filter(d => Object.values(d.data).some(v => v !== "" && v !== null)).length / data.length) * 100,
      ),
    };
  }

  detectFileType(filename: string): "excel" | "image" | "pdf" | "unknown" {
    const ext = filename.split(".").pop()?.toLowerCase();
    const excelExts = ["xlsx", "xls"];
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];

    if (excelExts.includes(ext!)) return "excel";
    if (imageExts.includes(ext!)) return "image";
    if (ext === "pdf") return "pdf";

    return "unknown";
  }
}

export const fileParserService = new FileParserService();
