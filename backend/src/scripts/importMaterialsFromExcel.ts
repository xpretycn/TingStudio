import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import { connectDatabase, getDb, closeDatabase, transaction } from "../config/database-better-sqlite3.js";
import { generateMaterialCode } from "../utils/helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MaterialRow {
  "序号": number;
  "原料名称": string;
  "类型": string;
  "单位": string;
  "库存": number;
  "蛋白质(g/100g)": any;
  "脂肪(g/100g)": any;
  "碳水化合物(g/100g)": any;
  "钠(mg/100g)": any;
  "单价(元/kg)": number;
  "数据来源": string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  原料数据导入工具");
  console.log("═══════════════════════════════════════════════════════════════\n");

  await connectDatabase();
  const db = getDb();

  const inputPath = path.join(__dirname, "../../../test/原料数据库导入_完整版_已清理.xlsx");
  const workbook = XLSX.readFile(inputPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<MaterialRow>(sheet);

  console.log(`📂 读取文件: ${inputPath}`);
  console.log(`   原始记录数: ${rawData.length}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 1: 清空现有数据");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  transaction(() => {
    db.prepare("DELETE FROM material_nutrition").run();
    const nutCount = db.prepare("SELECT COUNT(*) as cnt FROM material_nutrition").get() as any;
    console.log(`   material_nutrition: 已清空 (剩余: ${nutCount.cnt})`);

    db.prepare("DELETE FROM materials").run();
    const matCount = db.prepare("SELECT COUNT(*) as cnt FROM materials").get() as any;
    console.log(`   materials: 已清空 (剩余: ${matCount.cnt})`);
  });

  console.log("");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 2: 导入原料数据");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  const adminId = adminUser ? adminUser.id : "system";
  console.log(`   管理员ID: ${adminId}\n`);

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  transaction(() => {
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const name = String(row["原料名称"] || "").trim();

      if (!name) {
        failCount++;
        errors.push(`[${i + 1}] 原料名称为空`);
        continue;
      }

      try {
        const materialId = generateId();
        const code = generateMaterialCode(name) || `MAT${i + 1}`.padStart(6, "0");
        const materialType = row["类型"] === "药材" ? "herb" : "supplement";
        const unit = row["单位"] || "g";
        const stock = Number(row["库存"]) || 0;
        const unitPrice = Number(row["单价(元/kg)"]) || null;
        const dataSource = String(row["数据来源"] || "batch_import");
        const timestamp = new Date().toISOString();

        db.prepare(`
          INSERT INTO materials (id, name, code, unit, stock, material_type, unit_price, data_source, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(materialId, name, code, unit, stock, materialType, unitPrice, dataSource, adminId, timestamp, timestamp);

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
          INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, last_updated)
          VALUES (?, ?, ?, '1.0', ?, ?)
        `).run(nutritionId, materialId, JSON.stringify(per100g), dataSource, timestamp);

        successCount++;
        if (successCount <= 10) {
          console.log(`   ✓ ${name} (${code}) - ${materialType === "herb" ? "药材" : "辅料"}`);
        } else if (successCount === 11) {
          console.log(`   ... (共 ${rawData.length} 条)`);
        }
      } catch (err: any) {
        failCount++;
        errors.push(`[${i + 1}] ${name}: ${err.message}`);
      }
    }
  });

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("步骤 3: 数据验证");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const matTotal = (db.prepare("SELECT COUNT(*) as cnt FROM materials").get() as any).cnt;
  const nutTotal = (db.prepare("SELECT COUNT(*) as cnt FROM material_nutrition").get() as any).cnt;
  const herbCount = (db.prepare("SELECT COUNT(*) as cnt FROM materials WHERE material_type = 'herb'").get() as any).cnt;
  const supCount = (db.prepare("SELECT COUNT(*) as cnt FROM materials WHERE material_type = 'supplement'").get() as any).cnt;

  console.log(`   原料总数: ${matTotal}`);
  console.log(`   营养数据: ${nutTotal}`);
  console.log(`   药材: ${herbCount}`);
  console.log(`   辅料: ${supCount}`);

  const duplicates = db.prepare(`
    SELECT name, COUNT(*) as cnt
    FROM materials
    GROUP BY name
    HAVING cnt > 1
  `).all();

  if (duplicates.length > 0) {
    console.log(`\n   ⚠️ 发现 ${duplicates.length} 组重复名称:`);
    for (const dup of duplicates as any[]) {
      console.log(`      - ${dup.name}: ${dup.cnt}条`);
    }
  } else {
    console.log(`\n   ✅ 无重复名称`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  导入完成");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ 成功: ${successCount} 条`);
  console.log(`  ❌ 失败: ${failCount} 条`);

  if (errors.length > 0) {
    console.log("\n失败详情:");
    errors.slice(0, 10).forEach(e => console.log(`   ${e}`));
    if (errors.length > 10) {
      console.log(`   ... 还有 ${errors.length - 10} 条`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");

  await closeDatabase();
}

main().catch(err => {
  console.error("导入失败:", err);
  process.exit(1);
});
