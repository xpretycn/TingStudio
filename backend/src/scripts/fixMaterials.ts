import Database from "better-sqlite3";
import XLSX from "xlsx";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "tingstudio.db");
const TEST_DIR = path.join("..", "test");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

console.log("=== 1. 清除佛手玫苓膏 ===\n");

// 查找佛手玫苓膏
const foshou = db
  .prepare("SELECT id, name, code FROM materials WHERE name LIKE '%佛手%'")
  .all();
console.log("找到:", foshou);

if (foshou.length > 0) {
  for (const item of foshou as any[]) {
    // 删除关联营养数据
    db.prepare("DELETE FROM material_nutrition WHERE material_id = ?").run(item.id);
    // 删除原料
    db.prepare("DELETE FROM materials WHERE id = ?").run(item.id);
    console.log(`已删除: ${item.name} (ID: ${item.id})`);
  }
}

console.log("\n=== 2. 查找低聚异麦芽糖当前数据 ===\n");

const diju = db
  .prepare("SELECT * FROM materials WHERE name LIKE '%低聚异麦芽糖%'")
  .all() as any[];
console.log("当前数据库:", JSON.stringify(diju, null, 2));

if (diju.length > 0) {
  const materialId = diju[0].id;
  const nutrition = db
    .prepare("SELECT * FROM material_nutrition WHERE material_id = ?")
    .all(materialId) as any[];
  console.log("\n当前营养数据:", JSON.stringify(nutrition, null, 2));
}

console.log("\n=== 3. 从原始文件解析低聚异麦芽糖 ===\n");

// 扫描所有原始营养素文件
const files = [
  "杨军酸枣仁灵芝石斛膏营养成分表20260421.xls",
  "王伟佛手玫苓膏营养成分表20260424  .xls",
  "程联花两款膏滋营养成分表20260303.xls",
  "韩双酸枣仁灵芝石斛膏营养成分表20260314.xls",
  "黄平三款营养成分表20260326.xls",
];

let foundData: any[] = [];

for (const file of files) {
  try {
    const filePath = path.join(TEST_DIR, file);
    const workbook = XLSX.readFile(filePath);
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // 检查是否包含低聚异麦芽糖
        for (const key of Object.keys(row)) {
          if (
            String(row[key]).includes("低聚异麦芽糖") ||
            String(key).includes("低聚异麦芽糖")
          ) {
            console.log(`📄 ${file} [${sheetName}] 行${i + 1}:`);
            console.log("   ", row);
            foundData.push({ file, sheet: sheetName, row: i + 1, data: row });
          }
        }
      }
    }
  } catch (e) {
    // skip
  }
}

if (foundData.length === 0) {
  console.log("未在原始文件中找到'低聚异麦芽糖'");
}

console.log("\n=== 4. 更新Excel文件 ===\n");

// 读取已清理的Excel，再次清理
const excelPath = path.join(TEST_DIR, "原料数据库导入_完整版_已清理.xlsx");
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

console.log(`当前Excel记录数: ${rawData.length}`);

const filtered = rawData.filter((row) => {
  const name = String(row["原料名称"] ?? "").trim();
  return !name.includes("佛手玫苓膏") && name !== "";
});

console.log(`过滤后记录数: ${filtered.length}`);

// 输出新文件
const newWorkbook = XLSX.utils.book_new();
const newSheet = XLSX.utils.json_to_sheet(filtered);
XLSX.utils.book_append_sheet(newWorkbook, newSheet, "原料数据");
XLSX.writeFile(newWorkbook, path.join(TEST_DIR, "原料数据库导入_完整版_已清理.xlsx"));
console.log("Excel已更新");

// 合并WAL
db.pragma("wal_checkpoint(TRUNCATE)");

const finalCount = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as any).c;
console.log(`\n数据库剩余原料: ${finalCount} 条`);

db.close();
console.log("\n=== 完成 ===");
