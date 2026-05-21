import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDatabase, getDb } from "../config/database-better-sqlite3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, "../../../test");

interface ParsedMaterial {
  name: string;
  protein: number;
  fat: number;
  carbohydrate: number;
  sodium: number | null;
  sourceFile: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

function parseNutritionSheet(filePath: string): ParsedMaterial[] {
  const fileName = path.basename(filePath);
  console.log(`  解析: ${fileName}`);
  const wb = XLSX.readFile(filePath);
  const materials: ParsedMaterial[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    let formulaName = "";
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      if (
        data[i]?.[0] &&
        typeof data[i][0] === "string" &&
        !data[i][0].includes("营养") &&
        !data[i][0].includes("NRV")
      ) {
        formulaName = String(data[i][0]).trim();
        break;
      }
    }

    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      const name = String(row[0]).trim();
      if (!name || name === "营养成分表" || name.includes("NRV") || name.includes("参考值")) break;

      const protein = parseFloat(row[4]) || 0;
      const fat = parseFloat(row[5]) || 0;
      const carbohydrate = parseFloat(row[6]) || 0;
      const sodiumVal = parseFloat(row[7]);
      const sodium = isNaN(sodiumVal) ? null : sodiumVal;

      if (protein > 0 || fat > 0 || carbohydrate > 0) {
        materials.push({ name, protein, fat, carbohydrate, sodium, sourceFile: fileName });
      }
    }

    if (formulaName) {
      console.log(`    配方: ${formulaName}, 原料数: ${materials.filter(m => m.sourceFile === fileName).length}`);
    }
  }

  return materials;
}

function isSupplement(name: string): boolean {
  return (
    name.includes("低聚") ||
    name.includes("糖") ||
    name.includes("竹叶黄酮") ||
    name.includes("r-氨基丁酸") ||
    name.includes("地龙蛋白肽粉") ||
    name.includes("纳豆")
  );
}

async function main() {
  console.log("════════════════════════════════════════════════════════");
  console.log(" TingStudio - 从test/目录批量导入全部原料+营养数据");
  console.log("════════════════════════════════════════════════════════\n");

  await connectDatabase();
  const db = getDb();

  // 1. 扫描所有Excel文件
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤1: 扫描test/目录下的所有Excel文件");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const files = fs
    .readdirSync(TEST_DIR)
    .filter(f => f.endsWith(".xls") || f.endsWith(".xlsx"))
    .sort();
  console.log(`  发现 ${files.length} 个文件: ${files.join(", ")}\n`);

  // 2. 解析所有文件，收集唯一原料
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤2: 解析Excel，提取原料及营养数据");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const allMaterials = new Map<string, ParsedMaterial>();
  for (const file of files) {
    const filePath = path.join(TEST_DIR, file);
    try {
      const parsed = parseNutritionSheet(filePath);
      for (const mat of parsed) {
        if (!allMaterials.has(mat.name)) {
          allMaterials.set(mat.name, mat);
        }
      }
    } catch (e: any) {
      console.log(`  ⚠ 跳过 ${file}: ${e.message}`);
    }
  }

  const uniqueMaterials = Array.from(allMaterials.values());
  console.log(`\n  共提取 ${uniqueMaterials.length} 种唯一原料\n`);

  // 3. 查询已存在的原料
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤3: 对比数据库，导入缺失原料");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  const adminId = adminUser ? adminUser.id : "system";

  const existingNames = new Set(db.prepare("SELECT name FROM materials").all() as { name: string }[]);
  console.log(`  数据库已有 ${existingNames.size} 种原料\n`);

  const stmtInsertMat = db.prepare(
    `INSERT OR IGNORE INTO materials (id, name, code, unit, stock, material_type, data_source, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, 'excel_import', ?, ?, ?)`,
  );

  const stmtInsertNut = db.prepare(
    `INSERT OR REPLACE INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
     VALUES (?, ?, ?, '1.0', ?, 'high', ?)`,
  );

  let insertedCount = 0;
  let updatedNutCount = 0;
  let skippedCount = 0;

  const insertTx = db.transaction(() => {
    for (const mat of uniqueMaterials) {
      const matType = isSupplement(mat.name) ? "supplement" : "herb";
      const id = generateId();
      const code = `MAT${String(insertedCount + skippedCount + 1).padStart(3, "0")}`;

      const result = stmtInsertMat.run(id, mat.name, code, "g", matType, adminId, now(), now());

      if (result.changes > 0) {
        insertedCount++;
        const energy = Math.round((mat.protein * 17 + mat.fat * 37 + mat.carbohydrate * 17) * 100) / 100;
        const nutJson = JSON.stringify({
          energy,
          protein: mat.protein,
          fat: mat.fat,
          carbohydrate: mat.carbohydrate,
          sodium: mat.sodium,
          unit: "per_100g",
        });
        const nutId = generateId();
        stmtInsertNut.run(nutId, id, nutJson, mat.sourceFile, now());
        console.log(
          `  ✓ 新增: ${mat.name} (蛋白${mat.protein}g 脂肪${mat.fat}g 碳水${mat.carbohydrate}g 钠${mat.sodium ?? "-"}mg) ← ${mat.sourceFile}`,
        );
      } else {
        skippedCount++;
        const existing = db.prepare("SELECT id FROM materials WHERE name = ?").get(mat.name) as any;
        if (existing) {
          const hasNut = db.prepare("SELECT 1 FROM material_nutrition WHERE material_id = ?").get(existing.id);
          if (!hasNut) {
            const energy = Math.round((mat.protein * 17 + mat.fat * 37 + mat.carbohydrate * 17) * 100) / 100;
            const nutJson = JSON.stringify({
              energy,
              protein: mat.protein,
              fat: mat.fat,
              carbohydrate: mat.carbohydrate,
              sodium: mat.sodium,
              unit: "per_100g",
            });
            const nutId = generateId();
            stmtInsertNut.run(nutId, existing.id, nutJson, mat.sourceFile, now());
            updatedNutCount++;
            console.log(`  ⊕ 补充营养: ${mat.name} ← ${mat.sourceFile}`);
          } else {
            stmtInsertNut.run(
              generateId(),
              existing.id,
              JSON.stringify({
                energy: Math.round((mat.protein * 17 + mat.fat * 37 + mat.carbohydrate * 17) * 100) / 100,
                protein: mat.protein,
                fat: mat.fat,
                carbohydrate: mat.carbohydrate,
                sodium: mat.sodium,
                unit: "per_100g",
              }),
              mat.sourceFile,
              now(),
            );
            updatedNutCount++;
            console.log(`  ↻ 更新营养: ${mat.name} ← ${mat.sourceFile}`);
          }
        }
      }
    }
  });

  insertTx();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤4: 导入完成统计");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  新增原料: ${insertedCount}`);
  console.log(`  更新/补充营养数据: ${updatedNutCount}`);
  console.log(`  已存在(跳过): ${skippedCount}`);

  const totalAfter = db.prepare("SELECT COUNT(*) as cnt FROM materials").get() as any;
  const totalNut = db.prepare("SELECT COUNT(*) as cnt FROM material_nutrition").get() as any;
  console.log(`  数据库原料总数: ${totalAfter.cnt}`);
  console.log(`  营养数据总数: ${totalNut.cnt}`);

  // 4. 列出所有原料名称供验证
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("当前数据库全部原料清单:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const allMats = db.prepare("SELECT name, material_type FROM materials ORDER BY name").all() as {
    name: string;
    material_type: string;
  }[];
  for (const m of allMats) {
    const nut = db
      .prepare(
        "SELECT per_100g_json FROM material_nutrition mn JOIN materials m ON mn.material_id = m.id WHERE m.name = ?",
      )
      .get(m.name) as any;
    const hasNut = nut ? "✓" : "✗";
    console.log(`  [${hasNut}] ${m.name} (${m.material_type})`);
  }

  console.log("\n✅ 导入完成！请重启后端服务使数据生效。");
  process.exit(0);
}

main().catch(err => {
  console.error("导入失败:", err);
  process.exit(1);
});
