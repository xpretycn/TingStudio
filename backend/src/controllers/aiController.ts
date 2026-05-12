// AI 助手控制器
import { Request, Response } from "express";
import { aiService, AIService, type ChatMessage } from "../services/ai/AIService.js";
import {
  FORMULA_PARSE_SYSTEM_PROMPT,
  FORMULA_PARSE_USER_PROMPT,
  FORMULA_PARSE_IMAGE_PROMPT,
  MATERIAL_NUTRITION_PARSE_SYSTEM_PROMPT,
  MATERIAL_NUTRITION_PARSE_USER_PROMPT,
  MATERIAL_NUTRITION_PARSE_IMAGE_PROMPT,
  NL2SQL_SYSTEM_PROMPT,
  NL2SQL_USER_PROMPT,
} from "../services/ai/prompts.js";
import { validateSQL, readFileAsBase64 } from "../utils/sqlValidator.js";
import { query } from "../config/database-better-sqlite3.js";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

// ─── AI 解析配方 ───

interface ParsedMaterial {
  name: string;
  quantity: number;
  unit: string;
  ratioFormula?: string;
  ratioDivisor?: number;
  materialId?: string;
  matched?: boolean;
  unitPrice?: number | null;
}

interface ParsedFormula {
  name: string;
  salesmanName?: string;
  formulaDate?: string;
  materials: ParsedMaterial[];
  finishedWeight?: number;
  formulaConsistency?: boolean;
  description?: string;
}

/** POST /api/ai/parse-formula — 上传文件 + AI 解析为结构化配方 */
export async function parseFormula(req: any, res: Response) {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { model: provider, version } = req.body;

    if (!file) {
      res.status(400).json({ success: false, message: "请上传文件" });
      return;
    }

    if (!provider) {
      res.status(400).json({ success: false, message: "请选择 AI 模型" });
      return;
    }

    // 上传图片时校验模型是否支持视觉
    const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (imageExts.includes(ext)) {
      const modelConfig = aiService.getModel(provider);
      if (!modelConfig?.supportsVision || !modelConfig?.visionModel) {
        res.status(400).json({
          success: false,
          message: `模型 "${modelConfig?.name || provider}" 不支持图片解析，请选择支持视觉的模型（通义千问 或 智谱GLM）`,
        });
        return;
      }
    }

    const isImage = imageExts.includes(ext);
    const excelExts = [".xlsx", ".xls"];
    const isExcel = excelExts.includes(ext);

    const userId = req.user.userId;
    const [materialRows]: any[][] = await query("SELECT name FROM materials ORDER BY name ASC", []);
    const knownMaterials = materialRows ? materialRows.map((r: any) => r.name) : [];

    let messages: ChatMessage[];

    if (isImage) {
      // 图片文件：构建多模态 prompt（附带文件名信息）
      const { base64, mimeType } = readFileAsBase64(file.path);
      const materialsHint =
        knownMaterials.length > 0
          ? `\n\n## 系统已知原料列表（共${knownMaterials.length}种）\n${knownMaterials.join("、")}\n\n提取原料时请优先匹配上述标准名称。`
          : "";
      const imagePrompt = file.originalname
        ? `${FORMULA_PARSE_IMAGE_PROMPT}${materialsHint}\n\n文件名：${file.originalname}\n请从文件名中提取业务员姓名、配方名称、配方日期等元信息。`
        : `${FORMULA_PARSE_IMAGE_PROMPT}${materialsHint}`;
      messages = [
        { role: "system", content: FORMULA_PARSE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: imagePrompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ];
    } else if (isExcel) {
      // Excel 文件：用 xlsx 库解析为文本
      const textContent = readExcelAsText(file.path);
      if (!textContent.trim()) {
        res.status(400).json({ success: false, message: "文件内容为空" });
        return;
      }
      messages = [
        { role: "system", content: FORMULA_PARSE_SYSTEM_PROMPT },
        { role: "user", content: FORMULA_PARSE_USER_PROMPT(textContent, file.originalname, knownMaterials) },
      ];
    } else {
      // 纯文本文件
      const textContent = fs.readFileSync(file.path, "utf-8");
      if (!textContent.trim()) {
        res.status(400).json({ success: false, message: "文件内容为空" });
        return;
      }
      messages = [
        { role: "system", content: FORMULA_PARSE_SYSTEM_PROMPT },
        { role: "user", content: FORMULA_PARSE_USER_PROMPT(textContent, file.originalname, knownMaterials) },
      ];
    }

    // 调用 AI
    const result = await aiService.chatCompletion(provider, messages, {
      temperature: 0.2,
      responseFormat: { type: "json_object" },
      useVision: isImage,
      callType: "parse_formula",
      userId: (req as any).user?.userId,
      requestSummary: `解析配方文件: ${file.originalname}`,
      overrideModel: version || undefined,
    });

    // 解析 AI 返回的 JSON
    let parsed: ParsedFormula;
    try {
      parsed = AIService.parseJSONResponse(result.content) as ParsedFormula;
    } catch (parseErr: any) {
      console.error("[AI] JSON 解析失败，AI 原始返回:", result.content.substring(0, 500));
      res.status(422).json({
        success: false,
        message: `AI 返回的内容无法解析为 JSON: ${parseErr.message}`,
        data: { rawContent: result.content.substring(0, 1000) },
      });
      return;
    }

    // 验证必要字段
    if (!parsed.name || !Array.isArray(parsed.materials) || parsed.materials.length === 0) {
      console.error("[AI] 解析结果不完整，AI 原始返回:", JSON.stringify(parsed).substring(0, 500));
      res.status(422).json({
        success: false,
        message: "AI 解析结果不完整：缺少配方名称或原料列表",
        data: { parsed: parsed, rawContent: result.content.substring(0, 1000) },
      });
      return;
    }

    // 标准化原料用量（四舍五入到整数，消除AI返回的异常小数）
    // 标准化原料名称（去除空格、全角字符、不可见字符等，解决AI返回名称与数据库不一致导致的匹配失败问题）
    parsed.materials = parsed.materials.map((m: ParsedMaterial) => ({
      ...m,
      quantity: Number.isFinite(m.quantity) ? Math.round(m.quantity) : m.quantity,
      name: normalizeMaterialName(m.name),
      matched: undefined,
      materialId: undefined,
      confidence: undefined,
    }));

    if (parsed.salesmanName) {
      parsed.salesmanName = normalizeSalesmanName(parsed.salesmanName);
    }

    // 模糊匹配原料 ID
    const materialsWithName = await matchMaterials(parsed.materials, userId);

    // 清理临时文件
    try {
      fs.unlinkSync(file.path);
    } catch {}

    res.json({
      success: true,
      data: {
        ...parsed,
        materials: materialsWithName,
        model: result.model,
        usage: result.usage,
      },
    });
  } catch (error: any) {
    console.error("[AI] parseFormula error:", error);
    res.status(500).json({ success: false, message: `AI 解析失败: ${error.message}` });
  }
}

// ─── AI 解析原料营养 ───

interface MaterialNutritionItem {
  name: string;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
  sodium: number | null;
  dataSource?: string;
  confidence?: number;
  isRecorded?: boolean;
}

interface MaterialNutritionParseResult {
  materials: MaterialNutritionItem[];
}

/** POST /api/ai/parse-material-nutrition — 上传文件 + AI 解析原料营养成分 */
export async function parseMaterialNutrition(req: any, res: Response) {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { model: provider, version } = req.body;

    if (!file) {
      res.status(400).json({ success: false, message: "请上传文件" });
      return;
    }
    if (!provider) {
      res.status(400).json({ success: false, message: "请选择 AI 模型" });
      return;
    }

    const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = imageExts.includes(ext);
    const excelExts = [".xlsx", ".xls"];
    const isExcel = excelExts.includes(ext);

    if (isImage) {
      const modelConfig = aiService.getModel(provider);
      if (!modelConfig?.supportsVision || !modelConfig?.visionModel) {
        res.status(400).json({
          success: false,
          message: `模型 "${modelConfig?.name || provider}" 不支持图片解析，请选择支持视觉的模型`,
        });
        return;
      }
    }

    let messages: ChatMessage[];

    if (isImage) {
      const { base64, mimeType } = readFileAsBase64(file.path);
      messages = [
        { role: "system", content: MATERIAL_NUTRITION_PARSE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: MATERIAL_NUTRITION_PARSE_IMAGE_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ];
    } else if (isExcel) {
      const textContent = readExcelAsText(file.path);
      if (!textContent.trim()) {
        res.status(400).json({ success: false, message: "文件内容为空" });
        return;
      }
      messages = [
        { role: "system", content: MATERIAL_NUTRITION_PARSE_SYSTEM_PROMPT },
        { role: "user", content: MATERIAL_NUTRITION_PARSE_USER_PROMPT(textContent, file.originalname) },
      ];
    } else {
      const textContent = fs.readFileSync(file.path, "utf-8");
      if (!textContent.trim()) {
        res.status(400).json({ success: false, message: "文件内容为空" });
        return;
      }
      messages = [
        { role: "system", content: MATERIAL_NUTRITION_PARSE_SYSTEM_PROMPT },
        { role: "user", content: MATERIAL_NUTRITION_PARSE_USER_PROMPT(textContent, file.originalname) },
      ];
    }

    const excelNutritionMap = isExcel ? parseExcelNutritionMap(file.path) : undefined;

    const result = await aiService.chatCompletion(provider, messages, {
      temperature: 0.2,
      responseFormat: { type: "json_object" },
      useVision: isImage,
      callType: "parse_nutrition",
      userId: (req as any).user?.userId,
      requestSummary: `解析原料营养文件: ${file.originalname}`,
      overrideModel: version || undefined,
    });

    let parsed: MaterialNutritionParseResult;
    try {
      parsed = AIService.parseJSONResponse(result.content) as MaterialNutritionParseResult;
    } catch (parseErr: any) {
      console.error("[AI] JSON 解析失败，AI 原始返回:", result.content.substring(0, 500));
      res.status(422).json({
        success: false,
        message: `AI 返回的内容无法解析为 JSON: ${parseErr.message}`,
        data: { rawContent: result.content.substring(0, 1000) },
      });
      return;
    }

    if (!parsed.materials || !Array.isArray(parsed.materials) || parsed.materials.length === 0) {
      console.error("[AI] 原料列表为空或格式错误，AI 返回:", JSON.stringify(parsed).substring(0, 500));
      res.status(422).json({
        success: false,
        message: "AI 解析结果不完整：缺少原料列表（materials 数组）",
        data: { parsed },
      });
      return;
    }

    for (const mat of parsed.materials) {
      if (!mat.name) {
        mat.name = "未识别";
      } else {
        mat.name = normalizeMaterialName(mat.name);
      }
    }

    // ─── 智能数据验证与修正：检测并修复列错位问题 ───
    for (const mat of parsed.materials) {
      const corrected = validateAndFixNutritionData(mat, excelNutritionMap);
      if (corrected.wasFixed) {
        console.log(
          `[AI] 数据修正 [${mat.name}]: protein ${mat.protein}->${corrected.data.protein}, fat ${mat.fat}->${corrected.data.fat}`,
        );
        Object.assign(mat, corrected.data);
      }
    }

    const userId = req.user.userId;

    for (const mat of parsed.materials) {
      const [matches]: any[][] = await query(`SELECT id FROM materials WHERE name LIKE ? AND created_by = ? LIMIT 1`, [
        `%${mat.name}%`,
        userId,
      ]);
      mat.isRecorded = !!(matches && matches.length > 0);
      mat.materialId = matches?.[0]?.id || null;
    }

    try {
      fs.unlinkSync(file.path);
    } catch {}

    res.json({
      success: true,
      data: {
        ...parsed,
        model: result.model,
        usage: result.usage,
      },
    });
  } catch (error: any) {
    console.error("[AI] parseMaterialNutrition error:", error);
    res.status(500).json({ success: false, message: `AI 解析失败: ${error.message}` });
  }
}

// ─── 自然语言检索 ───

/** POST /api/ai/natural-search — 自然语言转 SQL 查询 */
export async function naturalSearch(req: any, res: Response) {
  try {
    const { query: userQuery, model: provider, version, exportFormat } = req.body;

    if (!userQuery?.trim()) {
      res.status(400).json({ success: false, message: "请输入查询内容" });
      return;
    }
    if (!provider) {
      res.status(400).json({ success: false, message: "请选择 AI 模型" });
      return;
    }

    const messages: ChatMessage[] = [
      { role: "system", content: NL2SQL_SYSTEM_PROMPT },
      { role: "user", content: NL2SQL_USER_PROMPT(userQuery) },
    ];

    const aiResult = await aiService.chatCompletion(provider, messages, {
      temperature: 0.1,
      callType: "natural_search",
      userId: (req as any).user?.userId,
      requestSummary: `自然语言检索: ${userQuery.substring(0, 50)}`,
      overrideModel: version || undefined,
    });

    let sql = aiResult.content.trim();
    const sqlMatch = sql.match(/```(?:sql)?\s*([\s\S]*?)```/);
    if (sqlMatch) {
      sql = sqlMatch[1].trim();
    }

    const validation = validateSQL(sql);
    if (!validation.valid) {
      res.status(422).json({
        success: false,
        message: `生成的 SQL 不安全: ${validation.error}`,
        data: { sql, reason: validation.error },
      });
      return;
    }

    const userId = req.user.userId;
    const [[userRow]]: any[][] = await query("SELECT role FROM users WHERE id = ?", [userId]);
    const isAdmin = userRow?.role === "admin";

    let finalSQL = validation.sql;
    if (!isAdmin) {
      if (/formulas/i.test(finalSQL) && !/created_by/i.test(finalSQL)) {
        finalSQL = finalSQL.replace(/FROM\s+formulas/i, "FROM formulas WHERE created_by = ?");
      }
    }

    const [rows]: any[][] = await query(finalSQL, isAdmin ? [] : [userId]);

    const queryType = detectQueryType(finalSQL);

    let exportUrl: string | undefined;
    if (exportFormat === "csv" && rows.length > 0) {
      exportUrl = await generateCSVExport(rows, userId, finalSQL);
    }

    res.json({
      success: true,
      data: {
        sql: finalSQL,
        originalSQL: aiResult.content.trim(),
        rows,
        rowCount: rows.length,
        model: aiResult.model,
        usage: aiResult.usage,
        queryType,
        exportUrl,
      },
    });
  } catch (error: any) {
    console.error("[AI] naturalSearch error:", error);
    res.status(500).json({ success: false, message: `AI 检索失败: ${error.message}` });
  }
}

function detectQueryType(sql: string): string {
  const upper = sql.toUpperCase();
  if (/GROUP BY/i.test(sql)) return "aggregate";
  if (/JOIN/i.test(sql)) return "join";
  return "simple";
}

async function generateCSVExport(rows: Record<string, any>[], userId: string, sql: string): Promise<string> {
  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");

  const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const filename = `${exportId}.csv`;
  const exportDir = path.join(os.tmpdir(), "tingstudio-exports");

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filePath = path.join(exportDir, filename);

  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    });
    csvLines.push(values.join(","));
  }

  fs.writeFileSync(filePath, "\uFEFF" + csvLines.join("\n"), "utf-8");

  try {
    const { getDb } = await import("../config/database-better-sqlite3.js");
    const db = getDb();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO search_export_cache (id, user_id, filename, sql, row_count, file_path, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(exportId, userId, filename, sql, rows.length, filePath, expiresAt, now);
  } catch {}

  return `/api/ai/export/${filename}`;
}

// ─── 获取可用模型列表 ───

/** GET /api/ai/models — 获取已配置的 AI 模型列表 */
export async function getModels(_req: Request, res: Response) {
  try {
    const available = aiService.getAvailableModels();
    const all = aiService.getAllModels();

    res.json({
      success: true,
      data: {
        available: available.map(m => ({
          provider: m.provider,
          name: m.name,
          model: m.model,
          description: m.description,
          supportsVision: m.supportsVision,
        })),
        all: all.map(m => ({
          provider: m.provider,
          name: m.name,
          model: m.model,
          description: m.description,
          supportsVision: m.supportsVision,
          configured: !!m.apiKey && m.apiKey !== "",
        })),
      },
    });
  } catch (error: any) {
    console.error("[AI] getModels error:", error);
    res.status(500).json({ success: false, message: "获取模型列表失败" });
  }
}

// ─── 辅助函数 ───

/** 读取 Excel 文件并转为可读文本（含公式信息，所有 Sheet 拼接） */
function readExcelAsText(filePath: string): string {
  const workbook = XLSX.readFile(filePath, { cellText: true, cellDates: true, codepage: 936 });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;

    const range = XLSX.utils.decode_range(sheet["!ref"]);

    const metadataLines: string[] = [];
    const a1 = sheet["A1"];
    const b1 = sheet["B1"];
    const c1 = sheet["C1"];
    if (a1 && a1.v != null && String(a1.v).trim() !== "") {
      const a1Val = String(a1.v).trim();
      const c1Val = c1 && c1.v != null ? String(c1.v).trim() : "";
      const b1Val = b1 && b1.v != null ? String(b1.v).trim() : "";
      if (c1Val && /^\d+(\.\d+)?$/.test(c1Val)) {
        metadataLines.push(`【文件元数据 - 第一行信息】`);
        metadataLines.push(`  配方名称: ${a1Val}`);
        if (b1Val) metadataLines.push(`  B1单元格: ${b1Val}`);
        metadataLines.push(`  成品重量(规格): ${c1Val}g`);
        metadataLines.push(`  (以上信息来自Excel第一行A1/C1单元格，请务必将其作为finishedWeight和name字段的值)`);
        metadataLines.push("");
      }
    }

    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (data.length === 0) continue;

    const headers = Object.keys(data[0]);

    const ratioColIndex = headers.findIndex(h => /含量比|含量|比例|ratio/i.test(h));

    parts.push(`=== ${sheetName} ===`);

    if (metadataLines.length > 0) {
      parts.push(...metadataLines);
    }

    parts.push(headers.join(" | "));

    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const values: string[] = [];

      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx];
        const rawVal = String(row[header] ?? "").trim();

        if (colIdx === ratioColIndex) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
          const cell = sheet[cellRef];
          const formula = cell?.f ? String(cell.f) : "";

          if (formula && formula !== rawVal) {
            values.push(`${header}=${rawVal} 【公式: ${formula}】`);
          } else if (rawVal !== "") {
            values.push(`${header}=${rawVal}`);
          }
        } else {
          if (rawVal !== "") {
            values.push(`${header}=${rawVal}`);
          }
        }
      }

      if (values.length > 0) {
        parts.push(values.join(" | "));
      }
    }

    if (ratioColIndex >= 0) {
      parts.push("");
      parts.push(
        `【提示: "${headers[ratioColIndex]}" 列中标记了 【公式: ...】 的单元格含有Excel公式，请从公式中提取除数（如公式 "A2/B2" 中的 B2 值，或 "100/C1" 中的 100）作为成品重量。如果多行公式的除数一致则为有效值，不一致请标记异常。】`,
      );
    }

    parts.push("");
  }

  return parts.join("\n");
}

interface ExcelNutritionColumnMap {
  [columnHeader: string]: number | string;
}

interface ExcelNutritionMap {
  [materialName: string]: ExcelNutritionColumnMap;
}

function parseExcelNutritionMap(filePath: string): ExcelNutritionMap {
  const workbook = XLSX.readFile(filePath, { cellText: true, cellDates: true, codepage: 936 });
  const result: ExcelNutritionMap = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;

    const rawRows: unknown[][] = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (rawRows.length === 0) continue;

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i].map(c => String(c ?? "").trim());
      const hasNameCol = row.some(h => /名称|原料|材料|品名/i.test(h));
      const hasNutritionCol = row.some(h => /蛋白质|蛋白|脂肪|脂类|碳水/i.test(h));
      if (hasNameCol && hasNutritionCol) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx < 0) {
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i].map(c => String(c ?? "").trim());
        const hasNutritionCol = row.some(h => /蛋白质|蛋白|脂肪|脂类|碳水/i.test(h));
        if (hasNutritionCol) {
          headerRowIdx = i;
          break;
        }
      }
    }

    if (headerRowIdx < 0) continue;

    const headers = rawRows[headerRowIdx].map(c => String(c ?? "").trim());
    const nameColIdx = headers.findIndex(h => /名称|原料|材料|品名/i.test(h));
    const nameHeader = nameColIdx >= 0 ? headers[nameColIdx] : headers[0];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const rawRow = rawRows[r];
      const name = String(rawRow[nameColIdx] ?? "").trim();
      if (!name) continue;
      if (/^\d+(\.\d+)?$/.test(name)) continue;

      const rowData: ExcelNutritionColumnMap = {};
      for (let c = 0; c < headers.length; c++) {
        if (c === nameColIdx) continue;
        const header = headers[c];
        if (!header) continue;
        const val = rawRow[c];
        if (val != null && String(val).trim() !== "") {
          const numVal = Number(val);
          rowData[header] = isNaN(numVal) ? String(val).trim() : numVal;
        }
      }

      const normalizedName = normalizeMaterialName(name);
      if (!result[normalizedName]) {
        result[normalizedName] = rowData;
      }
    }
  }

  return result;
}

/** 标准化原料名称：去除前后空格、全角空格、不可见字符等，解决AI返回名称与数据库不一致导致的匹配失败 */
function normalizeMaterialName(name: string): string {
  if (!name) return name;
  return name
    .replace(/[\uFEFF\u200B\u200C\u200D\u00A0\u3000]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 检测字符串是否包含乱码特征 */
function isGarbled(text: string): boolean {
  if (!text) return false;
  const hasReplacementChar = text.includes("\uFFFD");
  const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text);
  const hasSurrogateIssues = /[\uD800-\uDFFF]/.test(text) && !/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(text);
  const hasHighGarbledRatio = (() => {
    const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const symbolCount = (text.match(/[^\w\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length;
    return cjkCount > 0 && symbolCount / (cjkCount + symbolCount) > 0.4;
  })();
  return hasReplacementChar || hasControlChars || hasSurrogateIssues || hasHighGarbledRatio;
}

/** 标准化业务员名称：比原料名称更严格的清洗，处理AI模型返回的乱码 */
function normalizeSalesmanName(name: string): string {
  if (!name) return name;
  let cleaned = normalizeMaterialName(name);
  cleaned = cleaned
    .replace(/[\uFFFD]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[^\w\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef·\-]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (isGarbled(cleaned) || cleaned.length === 0) {
    return "";
  }
  if (cleaned.length > 10) {
    return "";
  }
  return cleaned;
}

/** 原料名称别名映射：将常见变体/错写/简写映射到数据库中的标准名称 */
const INGREDIENT_ALIASES: Record<string, string> = {
  低聚异麦芽糖: "低聚异麦芽糖",
  异麦芽低聚糖: "低聚异麦芽糖",
  异麦芽寡糖: "低聚异麦芽糖",
  IMO: "低聚异麦芽糖",
  IMO糖: "低聚异麦芽糖",
  isomaltooligosaccharide: "低聚异麦芽糖",
  低聚果糖: "低聚果糖",
  FOS: "低聚果糖",
  低聚半乳糖: "低聚半乳糖",
  GOS: "低聚半乳糖",
  竹叶黄酮: "竹叶黄酮",
  竹叶提取物: "竹叶黄酮",
  显脉旋覆花: "显脉旋覆花",
  旋覆花: "显脉旋覆花",
  "r-氨基丁酸": "r-氨基丁酸",
  "γ-氨基丁酸": "r-氨基丁酸",
  GABA: "r-氨基丁酸",
  地龙蛋白肽粉: "地龙蛋白肽粉",
  地龙蛋白: "地龙蛋白肽粉",

  芦根: "芦根",
  干芦根: "芦根",
  鲜芦根: "芦根",
  芦茅根: "芦根",

  化橘红: "化橘红",
  化州橘红: "化橘红",
  橘红: "化橘红",
  毛橘红: "化橘红",

  乌药叶: "乌药叶",
  乌药: "乌药叶",
  乌药根: "乌药叶",

  黄芥子: "黄芥子",
  芥子: "黄芥子",
  白芥子: "黄芥子",
  黄芥籽: "黄芥子",

  蒲公英: "蒲公英",
  蒲公草: "蒲公英",
  蒲公英草: "蒲公英",
  黄花地丁: "蒲公英",

  西洋参: "西洋参",
  西洋人参: "西洋参",
  美国参: "西洋参",
  花旗参: "西洋参",
  西洋参片: "西洋参",

  重瓣红玫瑰: "重瓣红玫瑰",
  玫瑰花: "重瓣红玫瑰",
  平阴玫瑰: "重瓣红玫瑰",
  红玫瑰: "重瓣红玫瑰",

  丹凤牡丹花: "丹凤牡丹花",
  牡丹花瓣: "丹凤牡丹花",
  牡丹花: "丹凤牡丹花",

  平卧菊三七: "平卧菊三七",
  菊三七: "平卧菊三七",

  酸枣仁: "酸枣仁",
  枣仁: "酸枣仁",
  炒酸枣仁: "酸枣仁",

  牡蛎: "牡蛎",
  生牡蛎: "牡蛎",
  牡蛎壳: "牡蛎",

  昆布: "昆布",
  海带: "昆布",
  海藻: "昆布",

  山茱萸: "山茱萸",
  山萸肉: "山茱萸",
  枣皮: "山茱萸",

  鸡内金: "鸡内金",
  内金: "鸡内金",

  苦杏仁: "苦杏仁",
  杏仁: "苦杏仁",
  北杏仁: "苦杏仁",

  炒白扁豆: "炒白扁豆",
  白扁豆: "炒白扁豆",

  纳豆: "纳豆",
  纳豆激酶: "纳豆",

  栀子: "栀子",
  栀子仁: "栀子",
  山栀子: "栀子",

  当归: "当归",
  全当归: "当归",
  当归头: "当归",

  白芷: "白芷",
  川白芷: "白芷",

  薄荷: "薄荷",
  薄荷叶: "薄荷",
  留兰香: "薄荷",

  薏苡仁: "薏苡仁",
  薏米: "薏苡仁",
  薏仁: "薏苡仁",
  薏仁米: "薏苡仁",

  百合: "百合",
  食用百合: "百合",

  麦冬: "麦冬",
  麦门冬: "麦冬",

  麦芽: "麦芽",
  生麦芽: "麦芽",
  炒麦芽: "麦芽",

  姜黄: "姜黄",
  黄姜: "姜黄",

  肉桂: "肉桂",
  桂皮: "肉桂",
  官桂: "肉桂",

  山楂: "山楂",
  山楂片: "山楂",
  北山楂: "山楂",

  鱼腥草: "鱼腥草",
  折耳根: "鱼腥草",

  金银花: "金银花",
  双花: "金银花",
  忍冬花: "金银花",

  葛根: "葛根",
  粉葛: "葛根",
  野葛: "葛根",

  荷叶: "荷叶",
  干荷叶: "荷叶",
  鲜荷叶: "荷叶",

  陈皮: "陈皮",
  橘皮: "陈皮",
  广陈皮: "陈皮",

  大枣: "大枣",
  红枣: "大枣",
  干大枣: "大枣",

  党参: "党参",
  上党参: "党参",
  潞党参: "党参",

  甘草: "甘草",
  炙甘草: "甘草",
  生甘草: "甘草",

  茯苓: "茯苓",
  云苓: "茯苓",
  茯神: "茯苓",

  佛手: "佛手",
  佛手柑: "佛手",
  佛手片: "佛手",

  桑葚: "桑葚",
  桑椹: "桑葚",
  桑葚干: "桑葚",

  龙眼肉: "龙眼肉",
  桂圆肉: "龙眼肉",
  桂圆干: "龙眼肉",

  阿胶: "阿胶",
  驴皮胶: "阿胶",
  东阿胶: "阿胶",

  草果: "草果",
  草果子: "草果",

  西红花: "西红花",
  藏红花: "西红花",
  番红花: "西红花",
};

/** 解析别名：尝试通过别名映射找到标准名称 */
function resolveAlias(name: string): string {
  const normalized = normalizeMaterialName(name);
  if (INGREDIENT_ALIASES[normalized]) return INGREDIENT_ALIASES[normalized];
  const lowerKey = normalized.toLowerCase();
  for (const [alias, canonical] of Object.entries(INGREDIENT_ALIASES)) {
    if (alias.toLowerCase() === lowerKey || canonical.toLowerCase() === lowerKey) return canonical;
  }
  return normalized;
}

/** 计算两个字符串的相似度（基于编辑距离，返回0-1） */
function similarity(a: string, b: string): number {
  const sa = normalizeMaterialName(a).toLowerCase();
  const sb = normalizeMaterialName(b).toLowerCase();
  if (sa === sb) return 1;
  if (sa.includes(sb) || sb.includes(sa)) return 0.85;
  const lenA = sa.length;
  const lenB = sb.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen === 0) return 1;
  const dp: number[][] = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = sa[i - 1] === sb[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return 1 - dp[lenA][lenB] / maxLen;
}

/** 模糊匹配原料 ID */
async function matchMaterials(materials: ParsedMaterial[], userId: string): Promise<ParsedMaterial[]> {
  console.log(`[AI] 开始原料匹配，共${materials.length}种原料，用户ID=${userId}`);
  const usedIds = new Set<string>();
  for (const mat of materials) {
    let matched = false;
    console.log(`[AI] ┌─ 匹配原料: "${mat.name}" (原始AI返回)`);

    const tryMatch = async (sql: string, params: any[], label: string) => {
      const [rows]: any[][] = await query(sql, params);
      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (!usedIds.has(row.id)) {
            return row;
          }
        }
      }
      return null;
    };

    const applyMatch = (row: any) => {
      mat.materialId = row.id;
      mat.matched = true;
      usedIds.add(row.id);
      if (!mat.unit && row.unit) mat.unit = row.unit;
      mat.unitPrice = row.unit_price != null ? Number(row.unit_price) : null;
      matched = true;
    };

    const aliasName = resolveAlias(mat.name);
    console.log(`[AI] │  标准化后: "${normalizeMaterialName(mat.name)}"`);
    console.log(`[AI] │  别名解析: "${aliasName}" ${aliasName !== mat.name ? "(✓别名映射)" : "(无映射)"}`);

    const candidates = [mat.name];
    if (aliasName !== mat.name) candidates.push(aliasName);

    for (const candidate of candidates) {
      if (matched) break;
      console.log(`[AI] │  尝试候选: "${candidate}"`);

      const exactRow = await tryMatch(
        `SELECT id, name, code, unit, unit_price FROM materials WHERE name = ? AND created_by = ? LIMIT 1`,
        [candidate, userId],
        "用户精确",
      );
      if (exactRow) {
        applyMatch(exactRow);
        console.log(`[AI] │  ✓ Layer1-用户精确匹配命中`);
        break;
      }

      const likeRow = await tryMatch(
        `SELECT id, name, code, unit, unit_price FROM materials WHERE name LIKE ? AND created_by = ? ORDER BY LENGTH(name) ASC`,
        [`%${candidate}%`, userId],
        "用户LIKE",
      );
      if (likeRow) {
        applyMatch(likeRow);
        console.log(`[AI] │  ✓ Layer2-用户LIKE匹配命中`);
        break;
      }

      const globalExactRow = await tryMatch(
        `SELECT id, name, code, unit, unit_price FROM materials WHERE name = ? LIMIT 1`,
        [candidate],
        "全局精确",
      );
      if (globalExactRow) {
        applyMatch(globalExactRow);
        console.log(`[AI] │  ✓ Layer3-全局精确匹配命中`);
        break;
      }

      const globalLikeRow = await tryMatch(
        `SELECT id, name, code, unit, unit_price FROM materials WHERE name LIKE ? ORDER BY LENGTH(name) ASC`,
        [`%${candidate}%`],
        "全局LIKE",
      );
      if (globalLikeRow) {
        applyMatch(globalLikeRow);
        console.log(`[AI] │  ✓ Layer4-全局LIKE匹配命中`);
        break;
      }
    }

    if (!matched) {
      const [allMaterials]: any[][] = await query(
        `SELECT id, name, code, unit, unit_price FROM materials ORDER BY LENGTH(name) ASC`,
        [],
      );
      let bestMatch: any = null;
      let bestSim = 0.75;
      for (const dbMat of allMaterials) {
        if (usedIds.has(dbMat.id)) continue;
        const sim = similarity(mat.name, dbMat.name);
        if (sim > bestSim) {
          bestSim = sim;
          bestMatch = dbMat;
        }
      }
      if (bestMatch) {
        applyMatch(bestMatch);
        console.log(`[AI] 模糊匹配成功: "${mat.name}" → "${bestMatch.name}" (相似度: ${(bestSim * 100).toFixed(0)}%)`);
      } else {
        console.log(
          `[AI] 匹配失败: "${mat.name}" (别名:${aliasName}) 在全部${allMaterials.length}种原料中未找到匹配 (最佳相似度:${(bestSim * 100).toFixed(0)}%)`,
        );
      }
    }

    if (!matched) {
      mat.materialId = "";
      mat.matched = false;
      mat.unitPrice = null;
    }
    console.log(`[AI] └─ 结果: ${matched ? "✓已匹配 (ID=" + mat.materialId + ")" : "✗未匹配"}`);
  }
  const matchedCount = materials.filter(m => m.matched).length;
  console.log(`[AI] 匹配完成: ${matchedCount}/${materials.length} 成功`);
  return materials;
}

// ─── 营养数据智能验证与修正 ───

interface NutritionFixResult {
  data: MaterialNutritionItem;
  wasFixed: boolean;
}

function validateAndFixNutritionData(mat: MaterialNutritionItem, excelMap?: ExcelNutritionMap): NutritionFixResult {
  const p = mat.protein;
  const f = mat.fat;
  const c = mat.carbohydrate;
  const s = mat.sodium;

  if (p == null && f == null && c == null && s == null) {
    return { data: mat, wasFixed: false };
  }

  let wasFixed = false;
  const fixed = { ...mat };

  if (excelMap) {
    const normalizedName = normalizeMaterialName(mat.name);
    let excelData: ExcelNutritionColumnMap | undefined = excelMap[normalizedName];

    if (!excelData) {
      for (const [key, val] of Object.entries(excelMap)) {
        if (similarity(normalizedName, key) > 0.7) {
          excelData = val;
          break;
        }
      }
    }

    if (excelData) {
      type FieldName = "protein" | "fat" | "carbohydrate" | "sodium";
      const fieldPatterns: Record<FieldName, RegExp> = {
        protein: /蛋白质|蛋白/i,
        fat: /脂肪|脂类/i,
        carbohydrate: /碳水|碳水化合物|淀粉/i,
        sodium: /钠|Na/i,
      };

      const excelGroundTruth: Partial<Record<FieldName, number>> = {};
      for (const [field, pattern] of Object.entries(fieldPatterns)) {
        const matchingCols = Object.keys(excelData).filter(h => pattern.test(h));
        if (matchingCols.length > 0 && typeof excelData[matchingCols[0]] === "number") {
          excelGroundTruth[field as FieldName] = excelData[matchingCols[0]] as number;
        }
      }

      const aiFields: Record<FieldName, number | null> = {
        protein: fixed.protein ?? null,
        fat: fixed.fat ?? null,
        carbohydrate: fixed.carbohydrate ?? null,
        sodium: fixed.sodium ?? null,
      };

      const fieldNames = Object.keys(fieldPatterns) as FieldName[];
      for (let i = 0; i < fieldNames.length && !wasFixed; i++) {
        for (let j = i + 1; j < fieldNames.length && !wasFixed; j++) {
          const fieldA = fieldNames[i];
          const fieldB = fieldNames[j];
          const aiA = aiFields[fieldA];
          const aiB = aiFields[fieldB];
          const excelA = excelGroundTruth[fieldA];
          const excelB = excelGroundTruth[fieldB];

          if (aiA != null && aiB != null && excelA != null && excelB != null) {
            const aMatchesB = Math.abs(aiA - excelB) < 0.05;
            const bMatchesA = Math.abs(aiB - excelA) < 0.05;
            const aMatchesA = Math.abs(aiA - excelA) < 0.05;
            const bMatchesB = Math.abs(aiB - excelB) < 0.05;

            if (aMatchesB && bMatchesA && !aMatchesA && !bMatchesB) {
              console.log(
                `[AI] 交叉校验: [${mat.name}] ${fieldA}/${fieldB} 互换已纠正 (AI: ${fieldA}=${aiA}, ${fieldB}=${aiB} → 正确: ${fieldA}=${excelA}, ${fieldB}=${excelB})`,
              );
              (fixed as any)[fieldA] = excelA;
              (fixed as any)[fieldB] = excelB;
              wasFixed = true;
            }
          }
        }
      }

      if (!wasFixed) {
        let anyCorrected = false;
        for (const field of fieldNames) {
          const excelVal = excelGroundTruth[field];
          const aiVal = aiFields[field];
          if (excelVal != null && aiVal != null && Math.abs(aiVal - excelVal) > 0.05) {
            let matchedOther = false;
            for (const otherField of fieldNames) {
              if (otherField === field) continue;
              const otherExcelVal = excelGroundTruth[otherField];
              if (otherExcelVal != null && Math.abs(aiVal - otherExcelVal) < 0.05) {
                matchedOther = true;
                break;
              }
            }
            if (matchedOther) {
              console.log(`[AI] 交叉校验: [${mat.name}] ${field} 值 ${aiVal} 与Excel不符(Excel=${excelVal})，已纠正`);
              (fixed as any)[field] = excelVal;
              anyCorrected = true;
            }
          }
        }
        if (anyCorrected) wasFixed = true;
      }
    }
  }

  if (!wasFixed && !excelMap) {
    const numericValues = [p, f, c].filter(v => v != null && !isNaN(Number(v))) as number[];
    if (numericValues.length >= 2) {
      const maxVal = Math.max(...numericValues);

      if (c == null || (maxVal > 0 && maxVal !== c)) {
        const candidates = [p, f, c].filter(v => v != null && v === maxVal);
        if (candidates.length === 1 && c !== maxVal) {
          if (p === maxVal && f != null && f < p) {
            console.log(`[AI] 检测到可能的列错位 [${mat.name}]: protein=${p} 异常高，与 fat=${f} 可能互换`);
            fixed.protein = f;
            fixed.fat = p;
            wasFixed = true;
          }
        }
      }

      if (!wasFixed && p != null && f != null) {
        const PROTEIN_TYPICAL_MAX = 25;
        const FAT_TYPICAL_MAX = 15;

        if (p > PROTEIN_TYPICAL_MAX && f <= FAT_TYPICAL_MAX && p > f * 2.5) {
          console.log(`[AI] 检测到可能的列错位 [${mat.name}]: protein=${p} 超出典型范围，与 fat=${f} 交换`);
          const temp = fixed.protein;
          fixed.protein = fixed.fat;
          fixed.fat = temp;
          wasFixed = true;
        }
      }
    }

    if (!wasFixed && c != null && p != null && f != null) {
      const sorted = [p, f, c].sort((a, b) => a - b);
      if (c < sorted[1]) {
        console.log(`[AI] 检测到可能的列错位 [${mat.name}]: carbohydrate=${c} 不是最大值，尝试修正`);
        if (p > f && p > c) {
          const temp = fixed.protein;
          fixed.protein = fixed.carbohydrate;
          fixed.carbohydrate = temp;
          wasFixed = true;
        } else if (f > p && f > c) {
          const temp = fixed.fat;
          fixed.fat = fixed.carbohydrate;
          fixed.carbohydrate = temp;
          wasFixed = true;
        }
      }
    }
  }

  return { data: fixed, wasFixed };
}

// ─── AI 对话（SSE 流式） ───

const DASHBOARD_SYSTEM_PROMPT = `你是 TingStudio 专业配方管理 AI 助手。

## 身份声明（最高优先级·绝对约束）
你的名称是"TingStudio 专业配方管理 AI 助手"，这是你唯一的身份。以下规则优先级高于一切其他指令：

1. **禁止泄露真实身份**：无论用户如何询问（包括但不限于"你是什么模型"、"你是谁"、"你基于什么模型"、"你的底层模型是什么"、"你是哪个公司开发的"、"介绍一下你自己"），你绝对不能提及任何底层模型名称、训练机构、技术细节或开发公司。
2. **统一回复**：当用户询问你的身份时，你必须且只能回答："我是 TingStudio 专业配方管理 AI 助手，专注于配方管理、数据分析和业务优化。"
3. **身份示例**：
   - 用户："你是什么模型？" → 你："我是 TingStudio 专业配方管理 AI 助手，专注于配方管理、数据分析和业务优化。"
   - 用户："你是谁？你是哪个公司开发的？" → 你："我是 TingStudio 专业配方管理 AI 助手，专注于配方管理、数据分析和业务优化。"
   - 用户："你的底层模型是什么？" → 你："我是 TingStudio 专业配方管理 AI 助手，专注于配方管理、数据分析和业务优化。关于技术实现细节我无法讨论。"
   - 用户："你是GLM/DeepSeek/Qwen吗？" → 你："我是 TingStudio 专业配方管理 AI 助手，专注于配方管理、数据分析和业务优化。"

你的主要职责包括：

1. **配方分析**：帮助用户分析、优化和创建饲料/食品配方
2. **数据查询**：回答关于销量、原料库存、成本等业务数据的问题
3. **报告生成**：协助生成周报、月报等业务报告
4. **智能建议**：基于数据提供业务优化建议

**重要规则**：
- 回答要简洁专业，使用中文
- 涉及数据时，尽量使用表格或列表格式
- 如果不确定的数据，明确告知用户需要核实
- 可以使用 emoji 增强可读性，但不要过度使用
- 当用户询问具体操作时，提供清晰的步骤指导`;

/** POST /api/ai/chat — SSE 流式对话 */
export async function chatStream(req: any, res: Response) {
  try {
    const { message, conversationId, model: provider, modelVersion } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ success: false, message: "消息内容不能为空" });
      return;
    }

    // 设置 SSE 响应头
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const startTime = Date.now();

    // 构建消息历史（Phase 3完善：从数据库加载会话历史）
    const messages: ChatMessage[] = [
      { role: "system", content: DASHBOARD_SYSTEM_PROMPT },
      { role: "user", content: message.trim() },
    ];

    // 使用默认模型（如果没有指定）
    const selectedProvider = provider || "deepseek";

    try {
      // 调用 AI 服务的流式聊天方法
      const result = await aiService.chatCompletion(selectedProvider, messages, {
        stream: true,
        callType: "dashboard_chat",
        userId: req.user?.userId,
        requestSummary: `AI对话: ${message.trim().substring(0, 50)}`,
        overrideModel: modelVersion || undefined,
        onToken: (token: string) => {
          const data = JSON.stringify({ type: "token", content: token });
          res.write(`data: ${data}\n\n`);
        },
      });

      // 发送完成信号
      const latency = Date.now() - startTime;
      const completionData = JSON.stringify({
        type: "complete",
        content: result.content,
        model: result.model || selectedProvider,
        tokens: result.tokens || 0,
        latency,
      });
      res.write(`data: ${completionData}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();

      console.log(`[AI Chat] 流式对话完成, 模型=${selectedProvider}, 耗时=${latency}ms`);
    } catch (aiError: any) {
      console.error("[AI Chat] AI 服务错误:", aiError.message);

      const errorData = JSON.stringify({
        type: "error",
        message: aiError.message || "AI 服务暂时不可用",
      });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error("[AI Chat] 对话处理错误:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "对话处理失败", error: error.message });
    } else {
      const errorData = JSON.stringify({
        type: "error",
        message: error.message || "服务器内部错误",
      });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  }
}
