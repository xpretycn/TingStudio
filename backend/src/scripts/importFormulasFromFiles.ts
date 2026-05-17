import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDatabase, getDb, closeDatabase, transaction } from "../config/database-better-sqlite3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MaterialData {
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
  materials: MaterialData[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function parseFormulaFile(filePath: string): FormulaData | null {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (data.length < 4) return null;

    const formulaName = String(data[0][0] || "").trim();
    const finishedWeight = Number(data[0][2]) || 0;

    if (!formulaName) return null;

    const materials: MaterialData[] = [];
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0] || row[0] === "营养成分表" || row[0] === "营养素参考值(NRV)") break;

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

    return { name: formulaName, finishedWeight, materials };
  } catch (err) {
    console.error(`解析文件失败: ${filePath}`, err);
    return null;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  配方数据导入工具");
  console.log("═══════════════════════════════════════════════════════════════\n");

  await connectDatabase();
  const db = getDb();

  const formulasDir = path.join(__dirname, "../../../test/formulas");
  const files = fs.readdirSync(formulasDir).filter(f => f.endsWith(".xls"));

  console.log(`📂 配方文件夹: ${formulasDir}`);
  console.log(`   配方文件数: ${files.length}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 1: 清空现有数据");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  transaction(() => {
    db.prepare("DELETE FROM nutrition_analysis_reports").run();
    db.prepare("DELETE FROM formula_nutrition_summaries").run();
    db.prepare("DELETE FROM formula_versions").run();
    db.prepare("DELETE FROM export_jobs").run();
    db.prepare("DELETE FROM share_configs").run();
    db.prepare("DELETE FROM formulas").run();
    const formulaCount = db.prepare("SELECT COUNT(*) as cnt FROM formulas").get() as any;
    console.log(`   formulas: 已清空 (剩余: ${formulaCount.cnt})`);
  });
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 2: 解析配方文件");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const formulas: FormulaData[] = [];
  for (const file of files) {
    const filePath = path.join(formulasDir, file);
    const formula = parseFormulaFile(filePath);
    if (formula) {
      formulas.push(formula);
      console.log(`   ✓ ${formula.name} (${formula.materials.length}种原料, ${formula.finishedWeight}g)`);
    } else {
      console.log(`   ✗ ${file} 解析失败`);
    }
  }
  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 3: 创建业务员");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  const adminId = adminUser ? adminUser.id : "system";

  const salesmenMap = new Map<string, string>();

  for (let i = 0; i < formulas.length; i++) {
    const formula = formulas[i];
    const salesmanName = formula.name.replace(/膏|营养成分表|\d+/g, "").trim() + "业务员";
    const salesmanCode = `SALE${String(i + 1).padStart(3, "0")}`;

    const existing = db.prepare("SELECT id FROM salesmen WHERE code = ?").get(salesmanCode) as any;
    if (existing) {
      salesmenMap.set(formula.name, existing.id);
    } else {
      const salesmanId = generateId();
      const timestamp = new Date().toISOString();
      db.prepare(`
        INSERT INTO salesmen (id, name, code, department, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, '配方部', 'active', ?, ?, ?)
      `).run(salesmanId, salesmanName, salesmanCode, adminId, timestamp, timestamp);
      salesmenMap.set(formula.name, salesmanId);
    }
  }

  const salesmanCount = (db.prepare("SELECT COUNT(*) as cnt FROM salesmen").get() as any).cnt;
  console.log(`   业务员总数: ${salesmanCount}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 4: 导入配方");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let successCount = 0;
  let failCount = 0;

  transaction(() => {
    for (const formula of formulas) {
      try {
        const formulaId = generateId();
        const salesmanId = salesmenMap.get(formula.name) || "";
        const salesmanName = formula.name.replace(/膏|营养成分表|\d+/g, "").trim() + "业务员";
        const timestamp = new Date().toISOString();

        const materialsJson = formula.materials.map(mat => {
          const matRecord = db.prepare("SELECT id FROM materials WHERE name = ?").get(mat.name) as any;
          return {
            materialId: matRecord ? matRecord.id : null,
            materialName: mat.name,
            quantity: mat.weight,
            ratio: mat.ratio,
          };
        });

        const description = `源自"${formula.name}"配方数据，共${formula.materials.length}种原料精心调配。`;
        const preparationMethod = "传统膏方熬制工艺";
        const ratioFactor = 0.18;
        const finishedWeight = formula.finishedWeight || Math.round(formula.materials.reduce((sum, m) => sum + m.weight, 0) * 0.85);

        db.prepare(`
          INSERT INTO formulas (
            id, name, salesman_id, salesman_name, materials_json,
            finished_weight, ratio_factor, description, preparation_method,
            created_by, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          formulaId,
          formula.name,
          salesmanId,
          salesmanName,
          JSON.stringify(materialsJson),
          finishedWeight,
          ratioFactor,
          description,
          preparationMethod,
          adminId,
          timestamp,
          timestamp
        );

        successCount++;
        console.log(`   ✓ ${formula.name} (${formula.materials.length}种原料)`);
      } catch (err: any) {
        failCount++;
        console.log(`   ✗ ${formula.name}: ${err.message}`);
      }
    }
  });

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 5: 数据验证");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const formulaTotal = (db.prepare("SELECT COUNT(*) as cnt FROM formulas").get() as any).cnt;
  console.log(`   配方总数: ${formulaTotal}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  导入完成");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ 成功: ${successCount} 条`);
  console.log(`  ❌ 失败: ${failCount} 条`);
  console.log("\n═══════════════════════════════════════════════════════════════");

  await closeDatabase();
}

main().catch(err => {
  console.error("导入失败:", err);
  process.exit(1);
});
