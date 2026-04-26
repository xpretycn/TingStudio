import Database from "better-sqlite3";
import XLSX from "xlsx";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = "data/tingstudio.db";
const EXCEL_PATH = path.join("..", "test", "原料数据库导入_完整版_已清理.xlsx");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

console.log("=== 更新原料数据库 ===\n");

// 1. 获取admin用户ID
const adminUser = db.prepare("SELECT id FROM users WHERE username='admin'").get() as any;
const adminId = adminUser.id;
console.log(`Admin ID: ${adminId}`);

// 检查当前数据
const beforeCount = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as any).c;
console.log(`当前原料数: ${beforeCount}`);

// 2. 读取Excel
console.log("\n读取Excel...");
const workbook = XLSX.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames[0];
const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
console.log(`Excel记录数: ${rawData.length}`);

// 检查编码重复
const codes = new Set<string>();
const dupCodes: string[] = [];
for (const row of rawData) {
  const code = String(row["编码"] || "").trim();
  if (code && codes.has(code)) {
    dupCodes.push(code);
  }
  codes.add(code);
}
if (dupCodes.length > 0) {
  console.log(`⚠️ 发现重复编码: ${dupCodes.join(", ")}`);
}

// 3. 清空现有数据
console.log("\n清空现有数据...");
db.prepare("DELETE FROM material_nutrition").run();
db.prepare("DELETE FROM materials").run();

const afterClear = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as any).c;
console.log(`清空后原料数: ${afterClear}`);

// 4. 导入数据
let imported = 0;

for (const row of rawData) {
  const name = String(row["原料名称"] ?? "").trim();
  if (!name) continue;

  // 使用唯一编码
  const excelCode = String(row["编码"] || "").trim();
  const code = excelCode || `MAT_${randomUUID().slice(0, 8)}`;
  const unit = String(row["单位"] || "g").trim();

  // 获取营养值
  const protein = parseFloat(row["蛋白质"]) || 0;
  const fat = parseFloat(row["脂肪"]) || 0;
  const carbohydrate = parseFloat(row["碳水化合物"]) || 0;
  const sodium = parseFloat(row["钠"]) || 0;

  // 判断类型 - 映射中英文
  const rawCategory = String(row["分类"] || row["类型"] || "").trim();
  let category = "supplement";
  if (rawCategory.includes("药材") || rawCategory === "herb") {
    category = "herb";
  } else if (rawCategory.includes("辅料") || rawCategory === "supplement") {
    category = "supplement";
  }

  const materialId = `MAT_${randomUUID().slice(0, 8)}_${randomUUID().slice(0, 6)}`;

  try {
    // 插入原料
    db.prepare(`
      INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'), datetime('now'))
    `).run(materialId, name, code, unit, category, adminId);

    // 插入营养数据
    const nutritionId = `NUT_${randomUUID().slice(0, 8)}_${randomUUID().slice(0, 6)}`;
    const per100gJson = JSON.stringify({
      protein,
      fat,
      carbohydrate,
      sodium,
      unit: "per_100g",
    });

    db.prepare(`
      INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, confidence, last_updated)
      VALUES (?, ?, ?, '1.0', 'high', datetime('now'))
    `).run(nutritionId, materialId, per100gJson);

    imported++;
  } catch (e: any) {
    console.log(`⚠️ 跳过 [${name}]: ${e.message}`);
  }
}

// 合并WAL
db.pragma("wal_checkpoint(TRUNCATE)");

// 验证
const count = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as any).c;
const nutCount = (db.prepare("SELECT COUNT(*) as c FROM material_nutrition").get() as any).c;

console.log(`\n✅ 导入完成:`);
console.log(`   原料: ${count} 条`);
console.log(`   营养: ${nutCount} 条`);

// 显示前5条
console.log(`\n📋 前5条原料:`);
const samples = db.prepare("SELECT name, code FROM materials LIMIT 5").all() as any[];
for (const s of samples) {
  console.log(`   - ${s.name} (${s.code})`);
}

db.close();
console.log("\n=== 完成 ===");
