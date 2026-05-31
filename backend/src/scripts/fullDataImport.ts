import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  connectDatabase,
  getDb,
  closeDatabase,
  transaction,
} from "../config/database-better-sqlite3.js";
import { generateMaterialCode, generateFormulaCode } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MaterialRow {
  序号: number;
  原料名称: string;
  类型: string;
  单位: string;
  库存: number;
  "蛋白质(g/100g)": number;
  "脂肪(g/100g)": number;
  "碳水化合物(g/100g)": number;
  "钠(mg/100g)": number;
  "单价(元/kg)": number;
  数据来源: string;
}

interface FormulaMaterialData {
  name: string;
  weight: number;
  ratio: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  sodium: number;
}

interface FormulaData {
  name: string;
  finishedWeight: number;
  materials: FormulaMaterialData[];
  fileName: string;
  salesmanName: string;
}

function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
  );
}

function now(): string {
  return new Date().toISOString();
}

const SUPPLEMENT_KEYWORDS = [
  "低聚",
  "糖",
  "竹叶黄酮",
  "r-氨基丁酸",
  "地龙蛋白肽粉",
  "纳豆",
];

function isSupplement(name: string): boolean {
  return SUPPLEMENT_KEYWORDS.some((kw) => name.includes(kw));
}

function extractSalesmanName(fileName: string, formulaName: string): string {
  const baseName = fileName
    .replace(/营养成分表.*$/g, "")
    .replace(/\.xls[x]?$/g, "")
    .replace(/\d+/g, "")
    .trim();

  const formulaBase = formulaName
    .replace(/\d+/g, "")
    .trim();

  const idx = baseName.indexOf(formulaBase);
  if (idx > 0) {
    return baseName.substring(0, idx).trim();
  }

  for (const suffix of ["膏滋", "膏"]) {
    const lastIdx = baseName.lastIndexOf(suffix);
    if (lastIdx > 0) {
      return baseName.substring(0, lastIdx).trim();
    }
  }

  return baseName;
}

function parseFormulaFile(filePath: string, fileName: string): FormulaData | null {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (data.length < 4) return null;

    const formulaName = String(data[0][0] || "").trim();
    const finishedWeight = Number(data[0][2]) || 0;

    if (!formulaName) return null;

    const salesmanName = extractSalesmanName(fileName, formulaName);

    const materials: FormulaMaterialData[] = [];
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      if (
        !row ||
        !row[0] ||
        row[0] === "营养成分表" ||
        row[0] === "营养素参考值(NRV)"
      )
        break;

      const name = String(row[0] || "").trim();
      if (!name) continue;

      materials.push({
        name,
        weight: parseFloat(row[1]) || 0,
        ratio: parseFloat(row[2]) || 0,
        protein: parseFloat(row[4]) || 0,
        fat: parseFloat(row[5]) || 0,
        carbohydrate: parseFloat(row[6]) || 0,
        sodium: parseFloat(row[7]) || 0,
      });
    }

    return { name: formulaName, finishedWeight, materials, fileName, salesmanName };
  } catch (err) {
    console.error(`解析文件失败: ${filePath}`, err);
    return null;
  }
}

async function main() {
  const report = {
    materials: { success: 0, fail: 0, errors: [] as string[] },
    nutrition: { success: 0, fail: 0, errors: [] as string[] },
    salesmen: { success: 0, fail: 0, errors: [] as string[] },
    formulas: { success: 0, fail: 0, errors: [] as string[] },
    cleared: {} as Record<string, number>,
  };

  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("  TingStudio 数据清理与导入工具（统一版）");
  console.log(
    "═══════════════════════════════════════════════════════════════\n"
  );

  await connectDatabase();
  const db = getDb();

  const adminUser = db
    .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  const adminId = adminUser ? (adminUser.id as string) : "system";
  console.log(`管理员ID: ${adminId}\n`);

  // ═══════════════════════════════════════════════════════════════
  // 阶段 1: 数据清理
  // ═══════════════════════════════════════════════════════════════
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log("阶段 1: 数据清理");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  transaction(() => {
    const tablesToClear = [
      "nutrition_analysis_reports",
      "formula_nutrition_summaries",
      "material_review_logs",
      "formula_review_logs",
      "formula_versions",
      "material_nutrition",
      "export_jobs",
      "share_configs",
      "formulas",
      "materials",
      "salesmen",
    ];

    for (const table of tablesToClear) {
      try {
        const result = db.prepare(`DELETE FROM ${table}`).run();
        report.cleared[table] = result.changes;
        console.log(
          `   ${table}: 删除 ${result.changes} 条记录`
        );
      } catch (err) {
        console.log(
          `   ${table}: 清空失败或不存在 (${(err as Error).message})`
        );
      }
    }
  });

  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // 阶段 2a: 从 Excel 导入原料数据
  // ═══════════════════════════════════════════════════════════════
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log("阶段 2a: 从 Excel 导入原料数据");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  const excelPath = path.join(
    __dirname,
    "../../../test/原料数据库导入_完整版_已清理.xlsx"
  );
  console.log(`📂 读取文件: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<MaterialRow>(sheet);
  console.log(`   原始记录数: ${rawData.length}\n`);

  const materialIdMap = new Map<string, string>();

  transaction(() => {
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const name = String(row["原料名称"] || "").trim();

      if (!name) {
        report.materials.fail++;
        report.materials.errors.push(`[${i + 1}] 原料名称为空`);
        continue;
      }

      try {
        const materialId = generateId();
        const code = generateMaterialCode(name) || `MAT${String(i + 1).padStart(6, "0")}`;
        const materialType = row["类型"] === "药材" ? "herb" : "supplement";
        const unit = row["单位"] || "g";
        const stock = Number(row["库存"]) || 0;
        const unitPrice = Number(row["单价(元/kg)"]) || null;
        const dataSource = String(row["数据来源"] || "batch_import");
        const timestamp = now();

        db.prepare(`
          INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          materialId,
          name,
          code,
          unit,
          stock,
          materialType,
          unitPrice,
          dataSource,
          adminId,
          timestamp,
          timestamp
        );

        materialIdMap.set(name, materialId);

        const protein = Number(row["蛋白质(g/100g)"]) || 0;
        const fat = Number(row["脂肪(g/100g)"]) || 0;
        const carbohydrate = Number(row["碳水化合物(g/100g)"]) || 0;
        const sodium = Number(row["钠(mg/100g)"]) || 0;
        const energy = Math.round(protein * 17 + fat * 37 + carbohydrate * 17);

        const nutritionId = generateId();
        const per100g = {
          energy_kj: energy,
          protein_g: protein,
          fat_g: fat,
          carbohydrate_g: carbohydrate,
          dietary_fiber_g: 0,
          sodium_mg: sodium,
          calcium_mg: 0,
          iron_mg: 0,
          vitaminC_mg: 0,
        };

        db.prepare(`
          INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, last_updated, material_version, is_latest)
          VALUES (?, ?, ?, '1.0', ?, ?, 1, 1)
        `).run(nutritionId, materialId, JSON.stringify(per100g), dataSource, timestamp);

        report.materials.success++;
        report.nutrition.success++;
        console.log(
          `   ✓ ${name} (${code}) - ${materialType === "herb" ? "药材" : "辅料"}`
        );
      } catch (err) {
        report.materials.fail++;
        report.nutrition.fail++;
        const msg = (err as Error).message;
        report.materials.errors.push(`[${i + 1}] ${name}: ${msg}`);
        report.nutrition.errors.push(`[${i + 1}] ${name}: ${msg}`);
      }
    }
  });

  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // 阶段 2b: 从配方文件夹导入业务员和配方数据
  // ═══════════════════════════════════════════════════════════════
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log("阶段 2b: 从配方文件夹导入业务员和配方数据");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  const formulasDir = path.join(__dirname, "../../../test/formulas");
  const files = fs
    .readdirSync(formulasDir)
    .filter((f) => f.endsWith(".xls") || f.endsWith(".xlsx"));

  console.log(`📂 配方文件夹: ${formulasDir}`);
  console.log(`   配方文件数: ${files.length}\n`);

  const formulas: FormulaData[] = [];
  for (const file of files) {
    const filePath = path.join(formulasDir, file);
    const formula = parseFormulaFile(filePath, file);
    if (formula) {
      formulas.push(formula);
      console.log(
        `   ✓ 解析: ${formula.name} (业务员: ${formula.salesmanName}, ${formula.materials.length}种原料, ${formula.finishedWeight}g)`
      );
    } else {
      console.log(`   ✗ ${file} 解析失败`);
    }
  }
  console.log("");

  // 补充配方中缺失的原料（配方文件中引用但Excel原料库中不存在的原料）
  console.log("  补充配方缺失原料:");
  const missingMaterials = new Map<string, FormulaMaterialData>();
  for (const formula of formulas) {
    for (const mat of formula.materials) {
      if (!materialIdMap.has(mat.name) && !missingMaterials.has(mat.name)) {
        missingMaterials.set(mat.name, mat);
      }
    }
  }

  if (missingMaterials.size > 0) {
    transaction(() => {
      for (const [name, mat] of missingMaterials) {
        try {
          const materialId = generateId();
          const code = generateMaterialCode(name) || `MAT${Date.now().toString(36).slice(-4)}`;
          const materialType = isSupplement(name) ? "supplement" : "herb";
          const timestamp = now();

          db.prepare(`
            INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, created_at, updated_at)
            VALUES (?, ?, ?, 'g', 0, ?, NULL, 'formula_import', ?, ?, ?)
          `).run(materialId, name, code, materialType, adminId, timestamp, timestamp);

          materialIdMap.set(name, materialId);

          const energy = Math.round(mat.protein * 17 + mat.fat * 37 + mat.carbohydrate * 17);
          const nutritionId = generateId();
          const per100g = {
            energy_kj: energy,
            protein_g: mat.protein,
            fat_g: mat.fat,
            carbohydrate_g: mat.carbohydrate,
            dietary_fiber_g: 0,
            sodium_mg: mat.sodium,
            calcium_mg: 0,
            iron_mg: 0,
            vitaminC_mg: 0,
          };

          db.prepare(`
            INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, last_updated, material_version, is_latest)
            VALUES (?, ?, ?, '1.0', 'formula_import', ?, 1, 1)
          `).run(nutritionId, materialId, JSON.stringify(per100g), timestamp);

          report.materials.success++;
          report.nutrition.success++;
          console.log(
            `   ✓ 补充: ${name} (${code}) - ${materialType === "herb" ? "药材" : "辅料"}`
          );
        } catch (err) {
          report.materials.fail++;
          report.materials.errors.push(`[补充] ${name}: ${(err as Error).message}`);
          console.log(`   ✗ 补充失败: ${name} - ${(err as Error).message}`);
        }
      }
    });
  } else {
    console.log("   无需补充缺失原料");
  }
  console.log("");

  // 创建业务员
  console.log("  创建业务员:");
  const salesmenMap = new Map<string, string>();
  const usedCodes = new Set<string>();

  const existingSalesmen = db
    .prepare("SELECT code FROM salesmen")
    .all() as Record<string, string>[];
  for (const s of existingSalesmen) {
    usedCodes.add(s.code);
  }

  let salesmanIndex = 1;
  for (const formula of formulas) {
    const salesmanName = formula.salesmanName;

    const existing = db
      .prepare("SELECT id FROM salesmen WHERE name = ?")
      .get(salesmanName) as Record<string, string> | undefined;

    if (existing) {
      salesmenMap.set(formula.name, existing.id);
      console.log(`   业务员已存在: ${salesmanName}`);
    } else {
      let salesmanCode = `SALE${String(salesmanIndex).padStart(3, "0")}`;
      while (usedCodes.has(salesmanCode)) {
        salesmanIndex++;
        salesmanCode = `SALE${String(salesmanIndex).padStart(3, "0")}`;
      }
      usedCodes.add(salesmanCode);

      const salesmanId = generateId();
      const timestamp = now();

      try {
        db.prepare(`
          INSERT INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at, updated_at)
          VALUES (?, ?, ?, '配方部', ?, ?, 'active', ?, ?, ?)
        `).run(
          salesmanId,
          salesmanName,
          salesmanCode,
          `138${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
          `${salesmanName.replace(/\s/g, "")}@tingstudio.com`,
          adminId,
          timestamp,
          timestamp
        );
        salesmenMap.set(formula.name, salesmanId);
        report.salesmen.success++;
        console.log(
          `   ✓ 创建业务员: ${salesmanName} (${salesmanCode})`
        );
      } catch (err) {
        report.salesmen.fail++;
        report.salesmen.errors.push(
          `${salesmanName}: ${(err as Error).message}`
        );
        console.log(
          `   ✗ 创建业务员失败: ${salesmanName} - ${(err as Error).message}`
        );
      }
    }
    salesmanIndex++;
  }
  console.log("");

  // 导入配方
  console.log("  导入配方:");
  transaction(() => {
    for (const formula of formulas) {
      try {
        const formulaId = generateId();
        const salesmanId = salesmenMap.get(formula.name) || "";
        const salesmanName = formula.salesmanName;
        const timestamp = now();

        const materialsJson = formula.materials.map((mat) => {
          const matRecord = db
            .prepare("SELECT id, material_type FROM materials WHERE name = ?")
            .get(mat.name) as Record<string, unknown> | undefined;
          return {
            materialId: matRecord ? (matRecord.id as string) : null,
            materialName: mat.name,
            quantity: mat.weight,
            ratio: mat.ratio,
            materialType: matRecord
              ? (matRecord.material_type as string)
              : isSupplement(mat.name)
                ? "supplement"
                : "herb",
          };
        });

        const hasHerb = formula.materials.some((m) => !isSupplement(m.name));
        const hasSupplement = formula.materials.some((m) =>
          isSupplement(m.name)
        );
        const ratioFactor = hasHerb ? 0.18 : 1.0;
        const supplementRatioFactor = hasSupplement ? 1.0 : 0.18;

        const finishedWeight =
          formula.finishedWeight ||
          Math.round(
            formula.materials.reduce((sum, m) => sum + m.weight, 0) * 0.85
          );

        const description = `源自"${formula.name}"配方数据，共${formula.materials.length}种原料精心调配。`;
        const preparationMethod = "传统膏方熬制工艺";

        db.prepare(`
          INSERT INTO formulas (
            id, code, name, salesman_id, salesman_name, materials_json,
            finished_weight, ratio_factor, supplement_ratio_factor,
            packaging_price, other_price, profit_margin,
            description, preparation_method,
            created_by, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          formulaId,
          generateFormulaCode(formula.name),
          formula.name,
          salesmanId,
          salesmanName,
          JSON.stringify(materialsJson),
          finishedWeight,
          ratioFactor,
          supplementRatioFactor,
          0,
          0,
          20,
          description,
          preparationMethod,
          adminId,
          timestamp,
          timestamp
        );

        report.formulas.success++;
        console.log(
          `   ✓ ${formula.name} (${formula.materials.length}种原料, ${finishedWeight}g)`
        );
      } catch (err) {
        report.formulas.fail++;
        report.formulas.errors.push(
          `${formula.name}: ${(err as Error).message}`
        );
        console.log(
          `   ✗ ${formula.name}: ${(err as Error).message}`
        );
      }
    }
  });

  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // 阶段 3: 数据验证
  // ═══════════════════════════════════════════════════════════════
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log("阶段 3: 数据验证");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  const matTotal = (
    db.prepare("SELECT COUNT(*) as cnt FROM materials").get() as Record<
      string,
      number
    >
  ).cnt;
  const nutTotal = (
    db.prepare("SELECT COUNT(*) as cnt FROM material_nutrition").get() as Record<
      string,
      number
    >
  ).cnt;
  const herbCount = (
    db.prepare(
      "SELECT COUNT(*) as cnt FROM materials WHERE material_type = 'herb'"
    ).get() as Record<string, number>
  ).cnt;
  const supCount = (
    db.prepare(
      "SELECT COUNT(*) as cnt FROM materials WHERE material_type = 'supplement'"
    ).get() as Record<string, number>
  ).cnt;
  const formulaTotal = (
    db.prepare("SELECT COUNT(*) as cnt FROM formulas").get() as Record<
      string,
      number
    >
  ).cnt;
  const salesmanTotal = (
    db.prepare("SELECT COUNT(*) as cnt FROM salesmen").get() as Record<
      string,
      number
    >
  ).cnt;

  console.log(`   原料总数: ${matTotal} (药材: ${herbCount}, 辅料: ${supCount})`);
  console.log(`   营养数据: ${nutTotal}`);
  console.log(`   配方总数: ${formulaTotal}`);
  console.log(`   业务员数: ${salesmanTotal}`);

  // 验证创建人
  const nonAdminMaterials = (
    db.prepare(
      "SELECT COUNT(*) as cnt FROM materials WHERE created_by != ?"
    ).get(adminId) as Record<string, number>
  ).cnt;
  const nonAdminFormulas = (
    db.prepare(
      "SELECT COUNT(*) as cnt FROM formulas WHERE created_by != ?"
    ).get(adminId) as Record<string, number>
  ).cnt;
  const nonAdminSalesmen = (
    db.prepare(
      "SELECT COUNT(*) as cnt FROM salesmen WHERE created_by != ?"
    ).get(adminId) as Record<string, number>
  ).cnt;

  if (nonAdminMaterials === 0 && nonAdminFormulas === 0 && nonAdminSalesmen === 0) {
    console.log(`\n   ✅ 所有记录的创建人均为 admin (${adminId})`);
  } else {
    console.log(
      `\n   ⚠️ 存在非 admin 创建的记录: 原料=${nonAdminMaterials}, 配方=${nonAdminFormulas}, 业务员=${nonAdminSalesmen}`
    );
  }

  // 验证配方-原料关联
  const formulasWithNullMaterial = db
    .prepare(
      `SELECT f.name, f.materials_json FROM formulas f`
    )
    .all() as Record<string, string>[];

  let nullMaterialCount = 0;
  for (const f of formulasWithNullMaterial) {
    try {
      const materials = JSON.parse(f.materials_json) as Array<{
        materialId: string | null;
        materialName: string;
      }>;
      const nulls = materials.filter((m) => !m.materialId);
      if (nulls.length > 0) {
        nullMaterialCount += nulls.length;
        console.log(
          `   ⚠️ 配方 "${f.name}" 有 ${nulls.length} 种原料未关联: ${nulls.map((n) => n.materialName).join(", ")}`
        );
      }
    } catch {
      // ignore parse errors
    }
  }

  if (nullMaterialCount === 0) {
    console.log(`   ✅ 所有配方原料均已正确关联`);
  }

  // 验证重复名称
  const duplicates = db.prepare(`
    SELECT name, COUNT(*) as cnt
    FROM materials
    GROUP BY name
    HAVING cnt > 1
  `).all() as Record<string, unknown>[];

  if (duplicates.length > 0) {
    console.log(`\n   ⚠️ 发现 ${duplicates.length} 组重复原料名称:`);
    for (const dup of duplicates) {
      console.log(`      - ${dup.name}: ${dup.cnt}条`);
    }
  } else {
    console.log(`   ✅ 无重复原料名称`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 导入报告
  // ═══════════════════════════════════════════════════════════════
  console.log("\n");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("  数据导入报告");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );

  console.log("\n  📊 数据清理:");
  for (const [table, count] of Object.entries(report.cleared)) {
    console.log(`     ${table}: 删除 ${count} 条`);
  }

  console.log("\n  📊 原料导入:");
  console.log(`     ✅ 成功: ${report.materials.success} 条`);
  console.log(`     ❌ 失败: ${report.materials.fail} 条`);
  if (report.materials.errors.length > 0) {
    console.log(`     错误详情:`);
    report.materials.errors
      .slice(0, 5)
      .forEach((e) => console.log(`       - ${e}`));
    if (report.materials.errors.length > 5) {
      console.log(
        `       ... 还有 ${report.materials.errors.length - 5} 条`
      );
    }
  }

  console.log("\n  📊 营养数据导入:");
  console.log(`     ✅ 成功: ${report.nutrition.success} 条`);
  console.log(`     ❌ 失败: ${report.nutrition.fail} 条`);

  console.log("\n  📊 业务员导入:");
  console.log(`     ✅ 成功: ${report.salesmen.success} 条`);
  console.log(`     ❌ 失败: ${report.salesmen.fail} 条`);
  if (report.salesmen.errors.length > 0) {
    console.log(`     错误详情:`);
    report.salesmen.errors.forEach((e) => console.log(`       - ${e}`));
  }

  console.log("\n  📊 配方导入:");
  console.log(`     ✅ 成功: ${report.formulas.success} 条`);
  console.log(`     ❌ 失败: ${report.formulas.fail} 条`);
  if (report.formulas.errors.length > 0) {
    console.log(`     错误详情:`);
    report.formulas.errors.forEach((e) => console.log(`       - ${e}`));
  }

  console.log("\n  📊 数据库最终状态:");
  console.log(`     原料: ${matTotal} 条 (药材: ${herbCount}, 辅料: ${supCount})`);
  console.log(`     营养数据: ${nutTotal} 条`);
  console.log(`     配方: ${formulaTotal} 条`);
  console.log(`     业务员: ${salesmanTotal} 条`);
  console.log(`     配方文件数: ${files.length}`);

  const totalSuccess =
    report.materials.success +
    report.nutrition.success +
    report.salesmen.success +
    report.formulas.success;
  const totalFail =
    report.materials.fail +
    report.nutrition.fail +
    report.salesmen.fail +
    report.formulas.fail;

  console.log("\n  📊 汇总:");
  console.log(`     总成功: ${totalSuccess} 条`);
  console.log(`     总失败: ${totalFail} 条`);

  console.log(
    "\n═══════════════════════════════════════════════════════════════"
  );

  await closeDatabase();
}

main().catch((err) => {
  console.error("导入失败:", err);
  process.exit(1);
});
