// 分析test文件夹内各业务员配方营养数据 - 修正版
import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join("..", "test");

interface MaterialInfo {
  name: string;
  protein: number | null;
  fat: number | null;
  carbohydrate: number | null;
  sodium: number | null;
  materialType: "herb" | "supplement";
  sourceFile: string;
  sourceFormula: string;
}

function parseNumber(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function isHerbByFormula(cellFormula: string | undefined): boolean {
  if (!cellFormula) return false;
  // 公式中包含 *0.18 或 * 0.18 的是药材
  return /\*0\.18|\* *0\.18/.test(cellFormula);
}

function parseExcelFile(filePath: string): { fileName: string; formulaName: string; materials: MaterialInfo[] } {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet["!ref"]) throw new Error(`空文件: ${filePath}`);

  console.log(`\n📄 ${path.basename(filePath)}`);

  // 方法：遍历所有单元格，找到表头行和数据
  const range = XLSX.utils.decode_range(sheet["!ref"]);

  let headerRowIdx = -1;
  const headerColMap = new Map<number, string>(); // 列索引 -> 列标题

  // 从第1行到第5行找表头
  for (let r = 0; r <= Math.min(5, range.e.r); r++) {
    const rowHeaders: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (cell) {
        rowHeaders.push(String(cell.v ?? "").trim());
      }
    }

    const headerStr = rowHeaders.join("");
    // 检查是否包含营养相关的关键词
    if (/蛋白质|蛋白\(g/.test(headerStr) || /脂肪\(g/.test(headerStr)) {
      headerRowIdx = r;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellRef];
        if (cell && String(cell.v ?? "").trim()) {
          headerColMap.set(c, String(cell.v).trim());
        }
      }
      break;
    }
  }

  if (headerRowIdx < 0) {
    throw new Error(`未找到表头行`);
  }

  // 显示表头信息
  const headerArr: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    if (headerColMap.has(c)) {
      headerArr.push(`${c}:${headerColMap.get(c)}`);
    }
  }
  console.log(`   表头(行${headerRowIdx + 1}): ${headerArr.slice(0, 10).join(", ")}`);

  // 找到各字段所在的列索引
  let nameCol = -1,
    proteinCol = -1,
    fatCol = -1,
    carbCol = -1,
    sodiumCol = -1,
    ratioCol = -1;

  for (const [colIdx, header] of headerColMap.entries()) {
    if (/原料名|原料|材料|品名|名称/.test(header)) nameCol = colIdx;
    else if (/蛋白质|蛋白\(g/i.test(header)) proteinCol = colIdx;
    else if (/脂肪|fat|脂类/i.test(header) && !header.includes("碳")) fatCol = colIdx;
    else if (/碳水|碳水化合物|carbohydrate|淀粉/i.test(header)) carbCol = colIdx;
    else if (/钠|sodium|Na/i.test(header)) sodiumCol = colIdx;
    else if (/含量比|比例|ratio|占比/i.test(header)) ratioCol = colIdx;
  }

  console.log(
    `   字段列: 名称=A${nameCol}, 蛋白=${proteinCol}, 脂肪=${fatCol}, 碳水=${carbCol}, 钠=${sodiumCol}, 含量比=${ratioCol}`,
  );

  // 获取配方名（通常在第一行第一列）
  let formulaName = path
    .basename(filePath, ".xls")
    .replace(/\s+$/, "")
    .replace(/营养成分表\d*/, "")
    .trim();
  const firstCell = sheet[XLSX.utils.encode_cell({ r: 0, c: 0 })];
  if (firstCell && String(firstCell.v).trim().length > 1 && String(firstCell.v).trim().length < 30) {
    formulaName = String(firstCell.v).trim();
  }

  // 读取数据行
  const materials: MaterialInfo[] = [];

  for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
    // 读取原料名称（必须在第一列或nameCol指定的列）
    let rawName = "";
    if (nameCol >= 0) {
      const cellRef = XLSX.utils.encode_cell({ r, c: nameCol });
      const cell = sheet[cellRef];
      rawName = cell ? String(cell.v ?? "").trim() : "";
    }

    // 跳过无效行
    if (!rawName || /^合计|总计|小计$/i.test(rawName)) continue;
    // 跳过纯数字或特殊符号的名称
    if (/^[\d\s._]+$/.test(rawName) || rawName.length > 15) continue;

    // 读取各营养值（根据列标题匹配）
    let protein: number | null = null;
    let fat: number | null = null;
    let carbohydrate: number | null = null;
    let sodium: number | null = null;
    let ratioFormula: string | undefined = undefined;

    for (const [colIdx, header] of headerColMap.entries()) {
      const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
      const cell = sheet[cellRef];
      if (!cell) continue;

      if (colIdx === proteinCol) protein = parseNumber(cell.v);
      else if (colIdx === fatCol) fat = parseNumber(cell.v);
      else if (colIdx === carbCol) carbohydrate = parseNumber(cell.v);
      else if (colIdx === sodiumCol) sodium = parseNumber(cell.v);
      else if (colIdx === ratioCol) ratioFormula = cell.f; // 获取公式
    }

    // 通过公式判断类型：*0.18 的是药材，否则是辅料
    const materialType: "herb" | "supplement" = isHerbByFormula(ratioFormula) ? "herb" : "supplement";

    materials.push({
      name: rawName,
      protein,
      fat,
      carbohydrate,
      sodium,
      materialType,
      sourceFile: path.basename(filePath),
      sourceFormula: formulaName,
    });
  }

  console.log(`   ✅ 解析 ${materials.length} 条原料:`);
  for (const m of materials) {
    const typeLabel = m.materialType === "herb" ? "药材" : "辅料";
    console.log(
      `      → ${m.name.padEnd(8)} [${typeLabel}] P:${m.protein ?? "-"} F:${m.fat ?? "-"} C:${m.carbohydrate ?? "-"} Na:${m.sodium ?? "-"}`,
    );
  }

  return { fileName: path.basename(filePath), formulaName, materials };
}

function main() {
  console.log("═══════════════════════════════════════");
  console.log("  业务员配方营养数据分析 v3");
  console.log("═══════════════════════════════════════");

  const files = fs
    .readdirSync(TEST_DIR)
    .filter(f => f.endsWith(".xls") || f.endsWith(".xlsx"))
    .filter(f => !f.includes("模板") && !f.includes("输出"))
    .sort();

  console.log(`\n📂 数据文件 (${files.length}个):`);
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  const allMaterials: MaterialInfo[] = [];

  for (const file of files) {
    try {
      const result = parseExcelFile(path.join(TEST_DIR, file));
      allMaterials.push(...result.materials);
    } catch (e: any) {
      console.error(`   ❌ ${file}: ${e.message}`);
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  总计: ${allMaterials.length} 条记录`);

  // 统计
  const herbs = allMaterials.filter(m => m.materialType === "herb");
  const supps = allMaterials.filter(m => m.materialType === "supplement");
  console.log(`  📊 药材: ${herbs.length}条 | 辅料: ${supps.length}条`);

  // 按名称去重合并
  const materialMap = new Map<string, MaterialInfo>();
  for (const mat of allMaterials) {
    const existing = materialMap.get(mat.name);
    if (!existing) {
      materialMap.set(mat.name, { ...mat });
    } else {
      if (existing.protein === null && mat.protein !== null) existing.protein = mat.protein;
      if (existing.fat === null && mat.fat !== null) existing.fat = mat.fat;
      if (existing.carbohydrate === null && mat.carbohydrate !== null) existing.carbohydrate = mat.carbohydrate;
      if (existing.sodium === null && mat.sodium !== null) existing.sodium = mat.sodium;
    }
  }

  const uniqueMaterials = Array.from(materialMap.values());
  uniqueMaterials.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  📋 去重后: ${uniqueMaterials.length} 种原料`);
  console.log(`═══════════════════════════════════════\n`);

  // 格式化输出表格
  console.log(
    `${"序号".padStart(3)} │ ${"原料名称".padEnd(8)} │ ${"类型".padEnd(4)} │ ${"蛋白质(g)".padStart(7)} │ ${"脂肪(g)".padStart(7)} │ ${"碳水(g)".padStart(7)} │ ${"钠(mg)".padStart(7)}`,
  );
  console.log("───┼──────────┼──────┼─────────┼─────────┼─────────┼─────────");

  uniqueMaterials.forEach((mat, idx) => {
    const typeLabel = mat.materialType === "herb" ? "药材" : "辅料";
    console.log(
      `${String(idx + 1).padStart(3)} │ ${mat.name.padEnd(8)} │ ${typeLabel.padEnd(4)} │ ` +
        `${String(mat.protein ?? "-").padStart(7)} │ ` +
        `${String(mat.fat ?? "-").padStart(7)} │ ` +
        `${String(mat.carbohydrate ?? "-").padStart(7)} │ ` +
        `${String(mat.sodium ?? "-").padStart(7)}`,
    );
  });

  // 输出Excel
  const outputData = uniqueMaterials.map((mat, idx) => ({
    序号: idx + 1,
    原料名称: mat.name,
    原料类型: mat.materialType === "herb" ? "药材" : "辅料",
    "蛋白质(g/100g)": mat.protein ?? "",
    "脂肪(g/100g)": mat.fat ?? "",
    "碳水化合物(g/100g)": mat.carbohydrate ?? "",
    "钠(mg/100g)": mat.sodium ?? "",
    数据来源: mat.sourceFormula,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(outputData);
  ws["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, "原料营养汇总");

  const outputPath = path.join(TEST_DIR, "原料营养汇总_输出.xlsx");
  XLSX.writeFile(wb, outputPath);

  console.log(`\n✅ 已输出: ${outputPath}`);
  console.log(`   共 ${uniqueMaterials.length} 种原料 (${herbs.length}药材 + ${supps.length}辅料)`);
}

main();
