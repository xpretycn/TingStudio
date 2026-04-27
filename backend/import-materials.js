import XLSX from "xlsx";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("./data/tingstudio.db");
const filePath = path.resolve("d:/Program Data/workspace-codebd/TingStudio/test/原料数据库导入_完整版_已清理.xlsx");

console.log("=== 开始原料数据导入 ===\n");

try {
  // 1. 读取 Excel 文件
  console.log("📖 正在读取 Excel 文件...");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`✅ 成功读取 ${excelData.length} 条原料记录\n`);

  // 2. 清空现有数据
  console.log("🗑️  正在清空现有数据...");

  const beforeMaterials = db.prepare("SELECT COUNT(*) as count FROM materials").get();
  const beforeFormulas = db.prepare("SELECT COUNT(*) as count FROM formulas").get();

  console.log(`   清空前 - 原料: ${beforeMaterials.count} 条, 配方: ${beforeFormulas.count} 条`);

  // 清空配方表（先清配方，因为可能有外键关联）
  db.prepare("DELETE FROM formulas").run();

  // 清空原料表
  db.prepare("DELETE FROM materials").run();

  console.log("✅ 数据清空完成\n");

  // 3. 导入新数据
  console.log("📥 正在导入新原料数据...");

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  const insertStmt = db.prepare(`
    INSERT INTO materials (
      id, 
      name, 
      code, 
      unit, 
      stock, 
      material_type,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const importTransaction = db.transaction(rows => {
    rows.forEach((row, index) => {
      try {
        // 数据映射和清理
        const rawType = String(row["分类"] || row["类型"] || "").trim();

        // 类型映射：中文 -> 英文枚举值
        let materialType = "herb"; // 默认值
        if (rawType === "药材" || rawType === "原料") {
          materialType = "herb";
        } else if (rawType === "辅料") {
          materialType = "supplement";
        }

        const materialData = {
          id: row["ID"] || `mat_${Date.now()}_${index}`,
          name: String(row["原料名称"] || "").trim(),
          code: String(row["编码"] || "").trim(),
          unit: String(row["单位"] || "g").trim(),
          stock: parseFloat(row["库存"]) || 0,
          material_type: materialType,
          created_by: "system-import",
        };

        // 验证必要字段
        if (!materialData.name) {
          throw new Error(`第 ${index + 1} 行: 原料名称为空`);
        }

        // 执行插入
        insertStmt.run(
          materialData.id,
          materialData.name,
          materialData.code,
          materialData.unit,
          materialData.stock,
          materialData.material_type,
          materialData.created_by,
        );

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          row: index + 1,
          name: row["原料名称"],
          error: error.message,
        });
      }
    });
  });

  // 执行事务导入
  importTransaction(excelData);

  // 4. 验证结果
  console.log("\n📊 导入结果统计:");
  console.log(`   ✅ 成功导入: ${successCount} 条`);
  console.log(`   ❌ 失败: ${errorCount} 条`);

  if (errors.length > 0) {
    console.log("\n⚠️  错误详情:");
    errors.slice(0, 5).forEach(err => {
      console.log(`   第 ${err.row} 行 (${err.name}): ${err.error}`);
    });
    if (errors.length > 5) {
      console.log(`   ... 还有 ${errors.length - 5} 个错误`);
    }
  }

  // 5. 最终验证
  const afterMaterials = db.prepare("SELECT COUNT(*) as count FROM materials").get();
  const afterFormulas = db.prepare("SELECT COUNT(*) as count FROM formulas").get();

  console.log("\n✨ 最终数据库状态:");
  console.log(`   📦 原料总数: ${afterMaterials.count} 条`);
  console.log(`   🧪 配方总数: ${afterFormulas.count} 条 (已清空)`);

  // 显示部分导入的数据样本
  console.log("\n📝 导入数据样本 (前5条):");
  const samples = db
    .prepare(
      `
    SELECT id, name, code, unit, stock, material_type 
    FROM materials 
    ORDER BY created_at DESC 
    LIMIT 5
  `,
    )
    .all();

  samples.forEach((sample, index) => {
    console.log(`\n   ${index + 1}. ${sample.name} (${sample.code})`);
    console.log(`      类型: ${sample.material_type}, 单位: ${sample.unit}, 库存: ${sample.stock}`);
  });

  console.log("\n=== 导入完成 ===\n");
} catch (error) {
  console.error("❌ 导入过程出错:", error.message);
  console.error(error.stack);
}

db.close();
