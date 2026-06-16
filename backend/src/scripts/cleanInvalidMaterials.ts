
import XLSX from "xlsx";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "tingstudio.db");
const EXCEL_PATH = path.join("..", "test", "原料数据库导入_完整版.xlsx");
const OUTPUT_PATH = path.join("..", "test", "原料数据库导入_完整版_已清理.xlsx");

// 需要剔除的错误数据
const INVALID_PATTERNS = [/沫彐淳膏/, /使用说明/, /酸枣仁灵芝石斛膏/, /^项目$/, /正阳御湿膏/, /竹叶黄酮/];

function isInvalidData(name: string): boolean {
  if (!name || typeof name !== "string") return true;
  const trimmed = name.trim();
  if (trimmed.length > 12) return true;
  if (/^[\d\s._\-+*=()]+$/.test(trimmed)) return true;
  if (/^(蛋白质|脂肪|碳水|钠|能量|营养|成分|序号|数据|NRV|参考)/i.test(trimmed)) return true;
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

console.log("=== 清理错误原料数据 ===\n");

// 1. 读取Excel并过滤
let rawData: any[] = [];
try {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  rawData = XLSX.utils.sheet_to_json(sheet);
} catch (e: any) {
  console.log(`⚠️ Excel文件被占用，仅清理数据库`);
}

console.log(`📄 原始数据: ${rawData.length} 条`);

const validData: any[] = [];
const removedData: string[] = [];

for (const row of rawData) {
  const name = String(row["原料名称"] ?? "").trim();
  if (isInvalidData(name)) {
    removedData.push(name || "(空)");
  } else {
    validData.push(row);
  }
}

console.log(`✅ 有效数据: ${validData.length} 条`);
console.log(`❌ 已移除: ${removedData.length} 条`);
if (removedData.length > 0) {
  console.log(`   移除项: ${removedData.join(", ")}`);
}

// 2. 输出新的Excel文件
if (validData.length > 0 && rawData.length > 0) {
  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.json_to_sheet(validData);
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, "原料数据");
  try {
    XLSX.writeFile(newWorkbook, OUTPUT_PATH);
    console.log(`\n✅ 新Excel已生成: ${OUTPUT_PATH}`);
  } catch (e: any) {
    console.log(`⚠️ Excel写入失败: ${e.message}`);
  }
}

// 3. 更新数据库
const db = new Database(DB_PATH);

let dbRemoved = 0;

for (const pattern of INVALID_PATTERNS) {
  const result = await execute("DELETE FROM materials WHERE name LIKE ?", [`%${pattern.source}%`]);
  dbRemoved += result.changes;
}

// 清理孤立营养数据
const orphanResult = db
  .prepare(
    `
  DELETE FROM material_nutrition 
  WHERE material_id NOT IN (SELECT id FROM materials)
`,
  )
  .run();

// 合并WAL

console.log(`\n📦 数据库:`);
console.log(`   删除原料: ${dbRemoved} 条`);
console.log(`   删除孤立营养: ${orphanResult.changes} 条`);

const count = (await query("SELECT COUNT(*) as c FROM materials", [])).rows[0] as any;
console.log(`   剩余原料: ${count.c} 条`);

db.close();
console.log("\n=== 完成 ===");
