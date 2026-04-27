import XLSX from "xlsx";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("./data/tingstudio.db");
const filePath = path.resolve("d:/Program Data/workspace-codebd/TingStudio/test/原料单价.xlsx");

console.log("=== 开始原料单价更新 ===\n");

try {
  // 1. 读取 Excel 文件
  console.log("📖 正在读取原料单价文件...");
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const priceData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`✅ 成功读取 ${priceData.length} 条单价记录\n`);

  // 2. 检查/添加 unit_price 字段
  console.log("🔧 检查数据库表结构...");
  const columns = db.prepare("PRAGMA table_info(materials)").all();
  const hasUnitPriceColumn = columns.some(col => col.name === "unit_price");

  if (!hasUnitPriceColumn) {
    console.log("   ➕ 添加 unit_price 字段...");
    db.prepare("ALTER TABLE materials ADD COLUMN unit_price REAL DEFAULT NULL").run();
    console.log("✅ unit_price 字段添加成功\n");
  } else {
    console.log("✅ unit_price 字段已存在\n");
  }

  // 3. 更新单价数据
  console.log("💰 正在更新原料单价...");

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  const notFoundMaterials = [];
  const errors = [];

  const updateStmt = db.prepare(`
    UPDATE materials 
    SET unit_price = ?, updated_at = datetime('now')
    WHERE name = ?
  `);

  const updateTransaction = db.transaction(rows => {
    rows.forEach((row, index) => {
      try {
        const materialName = String(row["原料"] || "").trim();

        // 查找单价字段（支持多种可能的字段名）
        let priceValue = null;
        if (row["单价（元/kg）"] !== undefined) {
          priceValue = parseFloat(row["单价（元/kg）"]);
        } else if (row["单价"] !== undefined) {
          priceValue = parseFloat(row["单价"]);
        } else {
          // 尝试找到包含"单价"或"价格"的任意字段
          const priceField = Object.keys(row).find(
            key => key.includes("单价") || key.includes("价格") || key.includes("price"),
          );
          if (priceField) {
            priceValue = parseFloat(row[priceField]);
          }
        }

        if (!materialName) {
          throw new Error(`第 ${index + 1} 行: 原料名称为空`);
        }

        if (isNaN(priceValue) || priceValue < 0) {
          throw new Error(`第 ${index + 1} 行 (${materialName}): 单价无效`);
        }

        // 执行更新
        const result = updateStmt.run(priceValue, materialName);

        if (result.changes > 0) {
          successCount++;
        } else {
          notFoundCount++;
          if (notFoundMaterials.length < 10) {
            notFoundMaterials.push({
              name: materialName,
              price: priceValue,
            });
          }
        }
      } catch (error) {
        errorCount++;
        errors.push({
          row: index + 1,
          material: row["原料"],
          error: error.message,
        });
      }
    });
  });

  // 执行事务更新
  updateTransaction(priceData);

  // 4. 显示结果统计
  console.log("\n📊 单价更新结果:");
  console.log(`   ✅ 成功更新: ${successCount} 条`);
  console.log(`   ⚠️  未找到原料: ${notFoundCount} 条`);
  console.log(`   ❌ 错误: ${errorCount} 条`);

  // 显示未找到的原料
  if (notFoundMaterials.length > 0) {
    console.log("\n⚠️  未找到的原料 (前10条):");
    notFoundMaterials.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} - ¥${item.price}/kg`);
    });
    if (notFoundCount > 10) {
      console.log(`   ... 还有 ${notFoundCount - 10} 个未找到`);
    }
  }

  // 显示错误详情
  if (errors.length > 0) {
    console.log("\n❌ 错误详情:");
    errors.slice(0, 5).forEach(err => {
      console.log(`   第 ${err.row} 行 (${err.material}): ${err.error}`);
    });
  }

  // 5. 验证结果
  console.log("\n🔍 数据库验证:");

  // 统计已设置单价的原料数量
  const pricedCount = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM materials 
    WHERE unit_price IS NOT NULL AND unit_price > 0
  `,
    )
    .get();

  const totalMaterials = db.prepare("SELECT COUNT(*) as count FROM materials").get();

  console.log(`   📦 原料总数: ${totalMaterials.count}`);
  console.log(`   💰 已设置单价: ${pricedCount.count}`);
  console.log(`   📊 覆盖率: ${((pricedCount.count / totalMaterials.count) * 100).toFixed(1)}%`);

  // 显示部分更新的样本
  console.log("\n💵 单价数据样本 (前10条):");
  const samples = db
    .prepare(
      `
    SELECT name, code, unit, unit_price 
    FROM materials 
    WHERE unit_price IS NOT NULL AND unit_price > 0
    ORDER BY unit_price DESC
    LIMIT 10
  `,
    )
    .all();

  samples.forEach((sample, index) => {
    console.log(`   ${index + 1}. ${sample.name} (${sample.code}) - ¥${sample.unit_price}/${sample.unit}`);
  });

  // 显示没有单价的原料
  const noPriceMaterials = db
    .prepare(
      `
    SELECT name, code 
    FROM materials 
    WHERE unit_price IS NULL OR unit_price <= 0
    LIMIT 10
  `,
    )
    .all();

  if (noPriceMaterials.length > 0) {
    console.log("\n❌ 缺少单价的原料:");
    noPriceMaterials.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (${item.code})`);
    });
  }

  console.log("\n=== 单价更新完成 ===\n");
} catch (error) {
  console.error("❌ 更新过程出错:", error.message);
  console.error(error.stack);
}

db.close();
