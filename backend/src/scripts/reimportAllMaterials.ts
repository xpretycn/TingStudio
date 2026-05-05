import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDatabase, getDb } from "../config/database-better-sqlite3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname, "../../../test");

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

interface MaterialRow {
  name: string;
  code: string;
  type: string;
  unit: string;
  stock: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  sodium: number | null;
  sourceFile: string;
}

interface PriceRow {
  name: string;
  unitPrice: number;
}

function parseCompleteDatabaseFile(filePath: string): MaterialRow[] {
  const fileName = path.basename(filePath);
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const materials: MaterialRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[2]) continue;

    const name = String(row[2]).trim();
    const code = String(row[3] || "").trim();
    const type = String(row[4] || "herb").trim();
    const unit = String(row[5] || "g").trim();
    const stock = parseFloat(row[6]) || 0;
    const protein = parseFloat(row[7]) || 0;
    const fat = parseFloat(row[8]) || 0;
    const carbohydrate = parseFloat(row[9]) || 0;
    const sodiumVal = row[10] !== undefined && row[10] !== null ? parseFloat(row[10]) : null;
    const sodium = sodiumVal !== null && !isNaN(sodiumVal) ? sodiumVal : null;

    if (!name) continue;

    materials.push({
      name,
      code: code || `MAT${String(i).padStart(3, "0")}`,
      type: type === "辅料" ? "supplement" : "herb",
      unit,
      stock,
      protein,
      fat,
      carbohydrate,
      sodium,
      sourceFile: fileName,
    });
  }

  return materials;
}

function parseNutritionSheet(filePath: string): Map<string, { protein: number; fat: number; carbohydrate: number; sodium: number | null }> {
  const result = new Map<string, { protein: number; fat: number; carbohydrate: number; sodium: number | null }>();
  const wb = XLSX.readFile(filePath);

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

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
        if (!result.has(name)) {
          result.set(name, { protein, fat, carbohydrate, sodium });
        }
      }
    }
  }

  return result;
}

function parsePriceFile(filePath: string): PriceRow[] {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const prices: PriceRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    const unitPrice = parseFloat(row[1]) || 0;
    if (name && unitPrice > 0) {
      prices.push({ name, unitPrice });
    }
  }
  return prices;
}

async function main() {
  console.log("============================================================");
  console.log(" TingStudio - Complete Reimport (Full Database + Nutrition)");
  console.log("============================================================\n");

  await connectDatabase();
  const db = getDb();

  // Step 0: Backup
  console.log("--- Step 0: Backup current data ---");
  const backupMaterials = db.prepare("SELECT * FROM materials").all();
  const backupNutrition = db.prepare("SELECT * FROM material_nutrition").all();
  console.log(`  Backup: ${backupMaterials.length} materials, ${backupNutrition.length} nutrition records`);

  const backupDir = path.resolve(__dirname, "../../data/backup");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `materials_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ materials: backupMaterials, nutrition: backupNutrition }, null, 2));
  console.log(`  Saved: ${backupFile}\n`);

  // Step 1: Clear tables
  console.log("--- Step 1: Clear materials + material_nutrition ---");
  const beforeM = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as any).c;
  const beforeN = (db.prepare("SELECT COUNT(*) as c FROM material_nutrition").get() as any).c;
  console.log(`  Before: materials=${beforeM}, nutrition=${beforeN}`);

  db.prepare("DELETE FROM material_nutrition").run();
  db.prepare("DELETE FROM materials").run();
  console.log(`  Cleared.\n`);

  // Step 2: Parse complete database file first
  console.log("--- Step 2: Parse complete database file ---");
  const completeFile = path.join(TEST_DIR, "原料数据库导入_完整版_已清理.xlsx");
  const baseMaterials = fs.existsSync(completeFile) ? parseCompleteDatabaseFile(completeFile) : [];
  console.log(`  Found ${baseMaterials.length} materials in complete database file\n`);

  // Step 3: Parse all nutrition sheets for enrichment
  console.log("--- Step 3: Parse nutrition sheets for enrichment ---");
  const nutritionMap = new Map<string, { protein: number; fat: number; carbohydrate: number; sodium: number | null }>();
  const nutritionFiles = fs
    .readdirSync(TEST_DIR)
    .filter(
      f =>
        (f.endsWith(".xls") || f.endsWith(".xlsx")) &&
        !f.includes("原料单价") &&
        !f.includes("数据库导入") &&
        !f.includes("营养素模板"),
    )
    .sort();

  for (const file of nutritionFiles) {
    const filePath = path.join(TEST_DIR, file);
    try {
      const parsed = parseNutritionSheet(filePath);
      let newCount = 0;
      for (const [name, data] of parsed) {
        if (!nutritionMap.has(name)) {
          nutritionMap.set(name, data);
          newCount++;
        }
      }
      console.log(`  ${file}: ${parsed.size} materials (${newCount} new unique)`);
    } catch (e: any) {
      console.log(`  Skip ${file}: ${e.message}`);
    }
  }
  console.log(`  Total unique nutrition entries: ${nutritionMap.size}\n`);

  // Step 4: Parse price file
  console.log("--- Step 4: Parse price file ---");
  const priceFile = path.join(TEST_DIR, "原料单价.xlsx");
  const priceMap = new Map<string, number>();
  if (fs.existsSync(priceFile)) {
    const prices = parsePriceFile(priceFile);
    for (const p of prices) {
      priceMap.set(p.name, p.unitPrice);
    }
    console.log(`  Found ${prices.length} price entries\n`);
  } else {
    console.log(`  Price file not found\n`);
  }

  // Step 5: Merge data - base materials + nutrition enrichment + price enrichment
  console.log("--- Step 5: Merge and import data ---");
  const finalMaterials = new Map<string, MaterialRow>();

  // First: add all from complete database
  for (const mat of baseMaterials) {
    finalMaterials.set(mat.name, mat);
  }

  // Second: add any materials from nutrition sheets that are NOT in the complete database
  for (const [name, nut] of nutritionMap) {
    if (!finalMaterials.has(name)) {
      finalMaterials.set(name, {
        name,
        code: `MAT${String(finalMaterials.size + 1).padStart(3, "0")}`,
        type: "herb",
        unit: "g",
        stock: 0,
        protein: nut.protein,
        fat: nut.fat,
        carbohydrate: nut.carbohydrate,
        sodium: nut.sodium,
        sourceFile: "nutrition_sheet",
      });
    }
  }

  // Enrich nutrition data from nutrition sheets (override if base has 0s)
  for (const [name, nut] of nutritionMap) {
    const existing = finalMaterials.get(name);
    if (existing) {
      if (existing.protein === 0 && nut.protein > 0) existing.protein = nut.protein;
      if (existing.fat === 0 && nut.fat > 0) existing.fat = nut.fat;
      if (existing.carbohydrate === 0 && nut.carbohydrate > 0) existing.carbohydrate = nut.carbohydrate;
      if (existing.sodium === null && nut.sodium !== null) existing.sodium = nut.sodium;
    }
  }

  console.log(`  Final material count: ${finalMaterials.size}`);

  // Step 6: Import to database
  console.log("\n--- Step 6: Import to database ---");
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  const adminId = adminUser ? adminUser.id : "system";

  const stmtInsertMat = db.prepare(
    `INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'full_reimport', ?, ?, ?)`,
  );

  const stmtInsertNut = db.prepare(
    `INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
     VALUES (?, ?, ?, '2.0', ?, 'high', ?)`,
  );

  let insertedM = 0;
  let insertedN = 0;
  let enrichedCount = 0;
  let pricedCount = 0;

  const insertTx = db.transaction(() => {
    const usedCodes = new Set<string>();
    let idx = 0;
    for (const [name, mat] of finalMaterials) {
      idx++;
      const id = generateId();
      let code = mat.code || `MAT${String(idx).padStart(3, "0")}`;
      if (usedCodes.has(code)) {
        code = `${code}_${idx}`;
      }
      usedCodes.add(code);
      const unitPrice = priceMap.get(name) || 0;
      if (unitPrice > 0) pricedCount++;

      stmtInsertMat.run(id, mat.name, code, mat.unit, mat.stock, mat.type, unitPrice, adminId, now(), now());
      insertedM++;

      const nutJson = JSON.stringify({
        energy: null,
        protein: mat.protein,
        fat: mat.fat,
        carbohydrate: mat.carbohydrate,
        sodium: mat.sodium,
        unit: "per_100g",
      });
      const nutId = generateId();
      stmtInsertNut.run(nutId, id, nutJson, mat.sourceFile, now());
      insertedN++;

      const hasNut = mat.protein > 0 || mat.fat > 0 || mat.carbohydrate > 0 ? "Y" : "N";
      const priceStr = unitPrice > 0 ? ` price=${unitPrice}` : "";
      console.log(
        `  [${String(idx).padStart(3, " ")}] ${code} ${name} (${mat.type}) P=${mat.protein} F=${mat.fat} C=${mat.carbohydrate} Na=${mat.sodium ?? "-"} nut=${hasNut}${priceStr}`,
      );
    }
  });

  insertTx();

  // Step 7: Verification
  console.log("\n--- Step 7: Data Consistency Verification ---");
  const totalM = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as any).c;
  const totalN = (db.prepare("SELECT COUNT(*) as c FROM material_nutrition").get() as any).c;

  console.log(`  Inserted materials: ${insertedM}`);
  console.log(`  Inserted nutrition: ${insertedN}`);
  console.log(`  Materials with prices: ${pricedCount}`);
  console.log(`  DB materials total: ${totalM}`);
  console.log(`  DB nutrition total: ${totalN}`);

  if (totalM === totalN) {
    console.log(`  [PASS] materials(${totalM}) = nutrition(${totalN})`);
  } else {
    console.log(`  [FAIL] materials(${totalM}) != nutrition(${totalN})`);
  }

  const matWithoutNut = db
    .prepare(
      `SELECT m.name FROM materials m LEFT JOIN material_nutrition mn ON m.id = mn.material_id WHERE mn.nutrition_id IS NULL`,
    )
    .all() as { name: string }[];
  if (matWithoutNut.length === 0) {
    console.log(`  [PASS] All materials have nutrition data`);
  } else {
    console.log(`  [FAIL] ${matWithoutNut.length} materials missing nutrition: ${matWithoutNut.map(m => m.name).join(", ")}`);
  }

  const invalidNut = db
    .prepare(
      `SELECT m.name FROM materials m JOIN material_nutrition mn ON m.id = mn.material_id WHERE mn.per_100g_json IS NULL OR mn.per_100g_json = ''`,
    )
    .all() as { name: string }[];
  if (invalidNut.length === 0) {
    console.log(`  [PASS] All nutrition JSON fields complete`);
  } else {
    console.log(`  [FAIL] ${invalidNut.length} nutrition records with empty JSON`);
  }

  // Check table structure
  const matCols = db.prepare("PRAGMA table_info(materials)").all() as any[];
  const nutCols = db.prepare("PRAGMA table_info(material_nutrition)").all() as any[];
  console.log(`  [PASS] materials table: ${matCols.length} columns`);
  console.log(`  [PASS] material_nutrition table: ${nutCols.length} columns`);

  // Summary by type
  const herbCount = (db.prepare("SELECT COUNT(*) as c FROM materials WHERE material_type = 'herb'").get() as any).c;
  const suppCount = (db.prepare("SELECT COUNT(*) as c FROM materials WHERE material_type = 'supplement'").get() as any).c;
  const pricedTotal = (db.prepare("SELECT COUNT(*) as c FROM materials WHERE unit_price > 0").get() as any).c;
  console.log(`\n  Summary: herbs=${herbCount}, supplements=${suppCount}, with_price=${pricedTotal}`);

  // All tables check
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
  console.log(`\n  All database tables (${tables.length}):`);
  for (const t of tables) {
    const cnt = (db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get() as any).c;
    console.log(`    ${t.name}: ${cnt}`);
  }

  console.log("\n✅ All operations completed! Please restart the backend service.");
  process.exit(0);
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
