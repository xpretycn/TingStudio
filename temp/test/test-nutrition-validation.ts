import XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const TEST_DIR = path.resolve("d:/ProgramData/workspace-codeby/ting-studio/test");

function normalizeMaterialName(name: string): string {
  if (!name) return name;
  return name
    .replace(/[\uFEFF\u200B\u200C\u200D\u00A0\u3000]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

interface MaterialNutritionItem {
  name: string;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
  sodium: number | null;
}

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
                `[TEST] 交叉校验: [${mat.name}] ${fieldA}/${fieldB} 互换已纠正 (AI: ${fieldA}=${aiA}, ${fieldB}=${aiB} → 正确: ${fieldA}=${excelA}, ${fieldB}=${excelB})`,
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
              console.log(`[TEST] 交叉校验: [${mat.name}] ${field} 值 ${aiVal} 与Excel不符(Excel=${excelVal})，已纠正`);
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

// ─── 测试用例 ───

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passCount++;
    console.log(`  ✅ ${message}`);
  } else {
    failCount++;
    console.log(`  ❌ ${message}`);
  }
}

function testReadExcelAsTextFormat() {
  console.log("\n━━━ 方案A测试：readExcelAsText 输出格式 ━━━");

  const testFiles = ["杨康正阳御湿膏营养成分表20260303.xls", "杨过酸枣仁灵芝石斛膏营养成分表20260314.xls"];

  for (const fileName of testFiles) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ 文件不存在: ${fileName}，跳过`);
      continue;
    }

    console.log(`\n📄 测试文件: ${fileName}`);
    const text = readExcelAsText(filePath);

    assert(text.length > 0, `${fileName}: readExcelAsText 返回非空文本`);

    const lines = text.split("\n").filter(l => l.trim() !== "");
    const dataLines = lines.filter(l => l.includes("=") && !l.startsWith("===") && !l.startsWith("【"));

    if (dataLines.length > 0) {
      const sampleLine = dataLines[0];
      assert(sampleLine.includes("="), `${fileName}: 数据行包含 列标题=值 格式`);

      const hasBareValue = dataLines.some(line => {
        const parts = line.split(" | ");
        return parts.some(part => {
          const trimmed = part.trim();
          return trimmed !== "" && !trimmed.includes("=") && !trimmed.startsWith("【");
        });
      });
      assert(!hasBareValue, `${fileName}: 数据行没有裸值（所有值都带列标题前缀）`);

      const proteinValues = dataLines.filter(l => /蛋白质.*=\d/.test(l));
      const fatValues = dataLines.filter(l => /脂肪.*=\d/.test(l));
      assert(proteinValues.length > 0, `${fileName}: 能识别蛋白质列的值`);
      assert(fatValues.length > 0, `${fileName}: 能识别脂肪列的值`);
    }
  }
}

function testParseExcelNutritionMap() {
  console.log("\n━━━ 方案B前置测试：parseExcelNutritionMap 结构化解析 ━━━");

  const testFiles = ["杨康正阳御湿膏营养成分表20260303.xls", "杨过酸枣仁灵芝石斛膏营养成分表20260314.xls"];

  for (const fileName of testFiles) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ 文件不存在: ${fileName}，跳过`);
      continue;
    }

    console.log(`\n📄 测试文件: ${fileName}`);
    const map = parseExcelNutritionMap(filePath);

    const materialNames = Object.keys(map);
    assert(materialNames.length > 0, `${fileName}: 解析出原料数据`);

    if (materialNames.length > 0) {
      const firstMaterial = map[materialNames[0]];
      const hasNutritionCols = Object.keys(firstMaterial).some(h => /蛋白质|蛋白/i.test(h));
      assert(hasNutritionCols, `${fileName}: 能识别蛋白质列`);

      const hasFatCols = Object.keys(firstMaterial).some(h => /脂肪|脂类/i.test(h));
      assert(hasFatCols, `${fileName}: 能识别脂肪列`);

      console.log(`  📊 解析出 ${materialNames.length} 种原料:`);
      for (const name of materialNames.slice(0, 3)) {
        const data = map[name];
        const proteinCol = Object.keys(data).find(h => /蛋白质|蛋白/i.test(h));
        const fatCol = Object.keys(data).find(h => /脂肪|脂类/i.test(h));
        const carbCol = Object.keys(data).find(h => /碳水|碳水化合物/i.test(h));
        console.log(
          `    ${name}: 蛋白质=${proteinCol ? data[proteinCol] : "N/A"}, 脂肪=${fatCol ? data[fatCol] : "N/A"}, 碳水=${carbCol ? data[carbCol] : "N/A"}`,
        );
      }
    }
  }
}

function testCrossValidationProteinFatSwap() {
  console.log("\n━━━ 方案B核心测试：交叉校验纠正蛋白质/脂肪互换 ━━━");

  const testFiles = ["杨康正阳御湿膏营养成分表20260303.xls", "杨过酸枣仁灵芝石斛膏营养成分表20260314.xls"];

  for (const fileName of testFiles) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ 文件不存在: ${fileName}，跳过`);
      continue;
    }

    console.log(`\n📄 测试文件: ${fileName}`);
    const map = parseExcelNutritionMap(filePath);
    const materialNames = Object.keys(map);

    if (materialNames.length === 0) {
      console.log(`  ⚠️ 无原料数据，跳过`);
      continue;
    }

    const testName = materialNames[0];
    const excelData = map[testName];

    const proteinCol = Object.keys(excelData).find(h => /蛋白质|蛋白/i.test(h));
    const fatCol = Object.keys(excelData).find(h => /脂肪|脂类/i.test(h));
    const carbCol = Object.keys(excelData).find(h => /碳水|碳水化合物/i.test(h));
    const sodiumCol = Object.keys(excelData).find(h => /钠|Na/i.test(h));

    if (!proteinCol || !fatCol) {
      console.log(`  ⚠️ 无法识别蛋白质或脂肪列，跳过`);
      continue;
    }

    const excelProtein = excelData[proteinCol] as number;
    const excelFat = excelData[fatCol] as number;
    const excelCarb = carbCol ? (excelData[carbCol] as number) : null;
    const excelSodium = sodiumCol ? (excelData[sodiumCol] as number) : null;

    console.log(
      `  📊 Excel原始数据 [${testName}]: protein=${excelProtein}, fat=${excelFat}, carb=${excelCarb}, sodium=${excelSodium}`,
    );

    const swappedMat: MaterialNutritionItem = {
      name: testName,
      protein: excelFat,
      fat: excelProtein,
      carbohydrate: excelCarb,
      sodium: excelSodium,
    };

    console.log(`  🔀 模拟AI互换结果: protein=${swappedMat.protein}, fat=${swappedMat.fat}`);

    const result = validateAndFixNutritionData(swappedMat, map);

    assert(result.wasFixed, `${fileName}: 检测到蛋白质/脂肪互换`);
    assert(
      result.data.protein === excelProtein,
      `${fileName}: 蛋白质已纠正为Excel原始值 ${excelProtein} (实际=${result.data.protein})`,
    );
    assert(result.data.fat === excelFat, `${fileName}: 脂肪已纠正为Excel原始值 ${excelFat} (实际=${result.data.fat})`);

    console.log(`  ✨ 纠正后: protein=${result.data.protein}, fat=${result.data.fat}`);
  }
}

function testCrossValidationNoFalsePositive() {
  console.log("\n━━━ 方案B测试：正确数据不被误纠正 ━━━");

  const testFiles = ["杨康正阳御湿膏营养成分表20260303.xls", "杨过酸枣仁灵芝石斛膏营养成分表20260314.xls"];

  for (const fileName of testFiles) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    console.log(`\n📄 测试文件: ${fileName}`);
    const map = parseExcelNutritionMap(filePath);
    const materialNames = Object.keys(map);

    if (materialNames.length === 0) continue;

    const testName = materialNames[0];
    const excelData = map[testName];

    const proteinCol = Object.keys(excelData).find(h => /蛋白质|蛋白/i.test(h));
    const fatCol = Object.keys(excelData).find(h => /脂肪|脂类/i.test(h));
    const carbCol = Object.keys(excelData).find(h => /碳水|碳水化合物/i.test(h));
    const sodiumCol = Object.keys(excelData).find(h => /钠|Na/i.test(h));

    if (!proteinCol || !fatCol) continue;

    const correctMat: MaterialNutritionItem = {
      name: testName,
      protein: excelData[proteinCol] as number,
      fat: excelData[fatCol] as number,
      carbohydrate: carbCol ? (excelData[carbCol] as number) : null,
      sodium: sodiumCol ? (excelData[sodiumCol] as number) : null,
    };

    const result = validateAndFixNutritionData(correctMat, map);

    assert(!result.wasFixed, `${fileName}: 正确数据不被误纠正`);
    assert(result.data.protein === correctMat.protein, `${fileName}: 蛋白质值保持不变`);
    assert(result.data.fat === correctMat.fat, `${fileName}: 脂肪值保持不变`);
  }
}

function testCrossValidationCarbProteinSwap() {
  console.log("\n━━━ 方案B测试：交叉校验纠正碳水/蛋白质互换 ━━━");

  const testFiles = ["杨康正阳御湿膏营养成分表20260303.xls", "杨过酸枣仁灵芝石斛膏营养成分表20260314.xls"];

  for (const fileName of testFiles) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n📄 测试文件: ${fileName}`);
    const map = parseExcelNutritionMap(filePath);
    const materialNames = Object.keys(map);
    if (materialNames.length === 0) continue;

    const testName = materialNames[0];
    const excelData = map[testName];

    const proteinCol = Object.keys(excelData).find(h => /蛋白质|蛋白/i.test(h));
    const fatCol = Object.keys(excelData).find(h => /脂肪|脂类/i.test(h));
    const carbCol = Object.keys(excelData).find(h => /碳水|碳水化合物/i.test(h));
    const sodiumCol = Object.keys(excelData).find(h => /钠|Na/i.test(h));

    if (!proteinCol || !fatCol || !carbCol) continue;

    const excelProtein = excelData[proteinCol] as number;
    const excelFat = excelData[fatCol] as number;
    const excelCarb = excelData[carbCol] as number;
    const excelSodium = sodiumCol ? (excelData[sodiumCol] as number) : null;

    const swappedMat: MaterialNutritionItem = {
      name: testName,
      protein: excelCarb,
      fat: excelFat,
      carbohydrate: excelProtein,
      sodium: excelSodium,
    };

    console.log(
      `  🔀 模拟AI碳水/蛋白质互换: protein=${swappedMat.protein}(应为${excelProtein}), carb=${swappedMat.carbohydrate}(应为${excelCarb})`,
    );

    const result = validateAndFixNutritionData(swappedMat, map);

    assert(result.wasFixed, `${fileName}: 检测到碳水/蛋白质互换`);
    assert(
      result.data.protein === excelProtein,
      `${fileName}: 蛋白质已纠正为 ${excelProtein} (实际=${result.data.protein})`,
    );
    assert(
      result.data.carbohydrate === excelCarb,
      `${fileName}: 碳水已纠正为 ${excelCarb} (实际=${result.data.carbohydrate})`,
    );
  }
}

function testCrossValidationFuzzyNameMatch() {
  console.log("\n━━━ 方案B测试：模糊名称匹配交叉校验 ━━━");

  const testFiles = ["杨康正阳御湿膏营养成分表20260303.xls"];

  for (const fileName of testFiles) {
    const filePath = path.join(TEST_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n📄 测试文件: ${fileName}`);
    const map = parseExcelNutritionMap(filePath);
    const materialNames = Object.keys(map);
    if (materialNames.length === 0) continue;

    const testName = materialNames[0];
    const excelData = map[testName];

    const proteinCol = Object.keys(excelData).find(h => /蛋白质|蛋白/i.test(h));
    const fatCol = Object.keys(excelData).find(h => /脂肪|脂类/i.test(h));
    if (!proteinCol || !fatCol) continue;

    const excelProtein = excelData[proteinCol] as number;
    const excelFat = excelData[fatCol] as number;

    const fuzzyName = testName + " ";
    const swappedMat: MaterialNutritionItem = {
      name: fuzzyName,
      protein: excelFat,
      fat: excelProtein,
      carbohydrate: null,
      sodium: null,
    };

    console.log(`  🔀 模糊名称 "${fuzzyName}" (原始: "${testName}"), 蛋白质/脂肪互换`);

    const result = validateAndFixNutritionData(swappedMat, map);

    assert(result.wasFixed, `${fileName}: 模糊名称匹配后检测到互换`);
    assert(
      result.data.protein === excelProtein,
      `${fileName}: 蛋白质已纠正 (实际=${result.data.protein}, 期望=${excelProtein})`,
    );
  }
}

function testHeuristicFallback() {
  console.log("\n━━━ 启发式回退测试：无Excel数据时的启发式校验 ━━━");

  const swappedHighProtein: MaterialNutritionItem = {
    name: "测试原料",
    protein: 30,
    fat: 2.5,
    carbohydrate: 60,
    sodium: 10,
  };

  const result = validateAndFixNutritionData(swappedHighProtein);

  assert(result.wasFixed, "启发式校验: protein=30 超出典型范围，检测到互换");
  assert(result.data.protein === 2.5, `启发式校验: 蛋白质纠正为 2.5 (实际=${result.data.protein})`);
  assert(result.data.fat === 30, `启发式校验: 脂肪纠正为 30 (实际=${result.data.fat})`);

  const normalData: MaterialNutritionItem = {
    name: "正常原料",
    protein: 8.5,
    fat: 1.2,
    carbohydrate: 72,
    sodium: 15,
  };

  const normalResult = validateAndFixNutritionData(normalData);
  assert(!normalResult.wasFixed, "启发式校验: 正常数据不被误纠正");
}

// ─── 运行所有测试 ───

console.log("╔══════════════════════════════════════════════╗");
console.log("║  营养数据解析与校验 自动化测试                ║");
console.log("║  方案A: readExcelAsText 列标题前缀强化        ║");
console.log("║  方案B: validateAndFixNutritionData 交叉校验  ║");
console.log("╚══════════════════════════════════════════════╝");

testReadExcelAsTextFormat();
testParseExcelNutritionMap();
testCrossValidationProteinFatSwap();
testCrossValidationNoFalsePositive();
testCrossValidationCarbProteinSwap();
testCrossValidationFuzzyNameMatch();
testHeuristicFallback();

console.log("\n══════════════════════════════════════════════");
console.log(`测试结果: ✅ ${passCount} 通过, ❌ ${failCount} 失败`);
console.log("══════════════════════════════════════════════");

if (failCount > 0) {
  process.exit(1);
}
