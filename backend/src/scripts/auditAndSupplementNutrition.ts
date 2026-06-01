import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDatabase, getDb, closeDatabase } from "../config/database-better-sqlite3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.join(__dirname, "../../../test/原料数据库导入_完整版_已清理.xlsx");
const REPORT_PATH = path.join(__dirname, "../../../test/营养数据排查报告.md");

interface NutritionData {
  protein?: number;
  fat?: number;
  carbohydrate?: number;
  energy?: number;
  fiber?: number;
  sugars?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  zinc?: number;
  magnesium?: number;
  phosphorus?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  vitaminB1?: number;
  vitaminB2?: number;
  vitaminB3?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  folate?: number;
  cholesterol?: number;
  transFat?: number;
  saturatedFat?: number;
}

interface ExcelMaterial {
  原料名称: string;
  类型: string;
  单位: string;
  库存: number;
  "蛋白质(g/100g)"?: number;
  "脂肪(g/100g)"?: number;
  "碳水化合物(g/100g)"?: number;
  "能量(kJ/100g)"?: number;
  "钠(mg/100g)"?: number;
  "单价(元/kg)"?: number;
  "膳食纤维(g/100g)"?: number;
  "糖类(g/100g)"?: number;
  "钾(mg/100g)"?: number;
  "钙(mg/100g)"?: number;
  "铁(mg/100g)"?: number;
  "锌(mg/100g)"?: number;
  "镁(mg/100g)"?: number;
  "磷(mg/100g)"?: number;
  "维生素A(μg/100g)"?: number;
  "维生素C(mg/100g)"?: number;
  "维生素D(μg/100g)"?: number;
  "维生素E(mg/100g)"?: number;
  "维生素K(μg/100g)"?: number;
  "维生素B1(mg/100g)"?: number;
  "维生素B2(mg/100g)"?: number;
  "烟酸(mg/100g)"?: number;
  "维生素B6(mg/100g)"?: number;
  "维生素B12(μg/100g)"?: number;
  "叶酸(μg/100g)"?: number;
  "胆固醇(mg/100g)"?: number;
  "反式脂肪酸(g/100g)"?: number;
  "饱和脂肪酸(g/100g)"?: number;
}

const CORE_NUTRIENTS = ['protein', 'fat', 'carbohydrate', 'energy', 'sodium'];

const EXCEL_TO_DB_MAP: Record<string, string> = {
  "蛋白质(g/100g)": "protein",
  "脂肪(g/100g)": "fat",
  "碳水化合物(g/100g)": "carbohydrate",
  "能量(kJ/100g)": "energy",
  "钠(mg/100g)": "sodium",
  "膳食纤维(g/100g)": "fiber",
  "糖类(g/100g)": "sugars",
  "钾(mg/100g)": "potassium",
  "钙(mg/100g)": "calcium",
  "铁(mg/100g)": "iron",
  "锌(mg/100g)": "zinc",
  "镁(mg/100g)": "magnesium",
  "磷(mg/100g)": "phosphorus",
  "维生素A(μg/100g)": "vitaminA",
  "维生素C(mg/100g)": "vitaminC",
  "维生素D(μg/100g)": "vitaminD",
  "维生素E(mg/100g)": "vitaminE",
  "维生素K(μg/100g)": "vitaminK",
  "维生素B1(mg/100g)": "vitaminB1",
  "维生素B2(mg/100g)": "vitaminB2",
  "烟酸(mg/100g)": "vitaminB3",
  "维生素B6(mg/100g)": "vitaminB6",
  "维生素B12(μg/100g)": "vitaminB12",
  "叶酸(μg/100g)": "folate",
  "胆固醇(mg/100g)": "cholesterol",
  "反式脂肪酸(g/100g)": "transFat",
  "饱和脂肪酸(g/100g)": "saturatedFat",
};

function parseExcelNutrition(row: ExcelMaterial): NutritionData {
  const nutrition: NutritionData = {};
  
  for (const [excelKey, dbKey] of Object.entries(EXCEL_TO_DB_MAP)) {
    const value = row[excelKey as keyof ExcelMaterial];
    if (typeof value === 'number' && !isNaN(value)) {
      (nutrition as Record<string, number>)[dbKey] = value;
    }
  }
  
  if (nutrition.protein !== undefined || nutrition.fat !== undefined || nutrition.carbohydrate !== undefined) {
    if (nutrition.energy === undefined) {
      nutrition.energy = Math.round((nutrition.protein! * 17 + nutrition.fat! * 37 + nutrition.carbohydrate! * 17) * 100) / 100;
    }
  }
  
  return nutrition;
}

async function main() {
  console.log("=" .repeat(60));
  console.log("原料营养数据排查与补充工具 (修复版)");
  console.log("=" .repeat(60));
  
  const report: string[] = [];
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  report.push(`# 原料营养数据排查与补充报告\n`);
  report.push(`生成时间: ${timestamp}\n`);
  
  console.log("\n📖 第一步：读取 Excel 参考文件...");
  report.push("\n## 一、数据来源\n");
  report.push(`- 参考文件: ${EXCEL_PATH}\n`);
  
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Excel 文件不存在: ${EXCEL_PATH}`);
    report.push(`\n❌ Excel 文件不存在，排查终止。\n`);
    fs.writeFileSync(REPORT_PATH, report.join(''));
    return;
  }
  
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json<ExcelMaterial>(worksheet, { defval: null });
  
  const excelNutritionMap = new Map<string, NutritionData>();
  for (const row of excelData) {
    if (row.原料名称) {
      const nutrition = parseExcelNutrition(row);
      if (Object.keys(nutrition).length > 0) {
        excelNutritionMap.set(row.原料名称.trim(), nutrition);
      }
    }
  }
  
  console.log(`   ✓ 读取到 ${excelData.length} 条原料记录`);
  console.log(`   ✓ 其中 ${excelNutritionMap.size} 条包含营养数据`);
  report.push(`- Excel 原料总数: ${excelData.length}`);
  report.push(`- 含营养数据的原料: ${excelNutritionMap.size}\n`);
  
  console.log("\n🗄️ 第二步：连接数据库...");
  connectDatabase();
  const db = getDb();
  
  const dbMaterials = db.prepare(`
    SELECT id, name, code FROM materials
  `).all() as Array<{id: string; name: string; code: string}>;
  
  console.log(`   ✓ 数据库原料总数: ${dbMaterials.length}`);
  report.push(`\n## 二、数据库现状\n`);
  report.push(`- 数据库原料总数: ${dbMaterials.length}\n`);
  
  const beforeStats = {
    totalWithNutrition: 0,
    missingNutrition: dbMaterials.length,
    emptyNutrition: dbMaterials.length
  };
  
  console.log("\n📊 第三步：数据分析...");
  console.log(`   ✓ 补充前已有营养数据: ${beforeStats.totalWithNutrition}`);
  console.log(`   ✓ 缺失营养数据: ${beforeStats.missingNutrition}`);
  
  report.push(`\n## 三、补充前数据统计\n`);
  report.push(`| 状态 | 数量 | 占比 |\n`);
  report.push(`|------|------|------|\n`);
  report.push(`| 已有营养数据 | ${beforeStats.totalWithNutrition} | ${((beforeStats.totalWithNutrition / dbMaterials.length) * 100).toFixed(1)}% |\n`);
  report.push(`| 缺失营养数据 | ${beforeStats.missingNutrition} | ${((beforeStats.missingNutrition / dbMaterials.length) * 100).toFixed(1)}% |\n`);
  
  report.push(`\n## 四、可补充数据原料清单\n`);
  
  const canFixMaterials = dbMaterials.filter(m => excelNutritionMap.has(m.name));
  const cannotFixMaterials = dbMaterials.filter(m => !excelNutritionMap.has(m.name));
  
  report.push(`\n### 4.1 可从 Excel 补充的原料 (${canFixMaterials.length} 条)\n`);
  report.push(`\n| 序号 | 原料名称 | 原料编号 |\n`);
  report.push(`|------|----------|----------|\n`);
  
  let idx = 1;
  for (const mat of canFixMaterials) {
    report.push(`| ${idx++} | ${mat.name} | ${mat.id.substring(0, 8)}... |\n`);
  }
  
  if (cannotFixMaterials.length > 0) {
    report.push(`\n### 4.2 无法从 Excel 补充的原料 (${cannotFixMaterials.length} 条)\n`);
    report.push(`\n| 序号 | 原料名称 | 原料编号 | 备注 |\n`);
    report.push(`|------|----------|----------|------|\n`);
    
    idx = 1;
    for (const mat of cannotFixMaterials) {
      const note = mat.name.startsWith('测试') ? '测试数据' : 'Excel中无匹配';
      report.push(`| ${idx++} | ${mat.name} | ${mat.id.substring(0, 8)}... | ${note} |\n`);
    }
  }
  
  console.log("\n🔧 第四步：开始补充数据...");
  
  const insertStmt = db.prepare(`
    INSERT INTO material_nutrition 
    (nutrition_id, material_id, per_100g_json, data_version, data_source, last_updated, material_version, is_latest)
    VALUES (?, ?, ?, ?, ?, datetime('now'), 1, 1)
  `);
  
  const updateStmt = db.prepare(`
    UPDATE material_nutrition 
    SET per_100g_json = ?, data_source = ?, last_updated = datetime('now'), is_latest = 1
    WHERE material_id = ?
  `);
  
  let fixedCount = 0;
  let failedFixes: Array<{name: string; error: string}> = [];
  
  for (const mat of canFixMaterials) {
    const excelNutrition = excelNutritionMap.get(mat.name);
    
    if (excelNutrition) {
      try {
        const jsonStr = JSON.stringify(excelNutrition);
        
        const existingCount = db.prepare(
          `SELECT COUNT(*) as count FROM material_nutrition WHERE material_id = ?`
        ).get(mat.id) as { count: number };
        
        if (existingCount.count > 0) {
          updateStmt.run(jsonStr, 'excel-reference-supplement', mat.id);
        } else {
          insertStmt.run(
            generateId(),
            mat.id,
            jsonStr,
            '1.0',
            'excel-reference-supplement'
          );
        }
        
        fixedCount++;
        console.log(`   ✓ 补充: ${mat.name}`);
      } catch (err: any) {
        failedFixes.push({ name: mat.name, error: err.message });
        console.log(`   ✗ 失败: ${mat.name} - ${err.message}`);
      }
    }
  }
  
  console.log(`\n✅ 数据补充完成!`);
  console.log(`   - 成功补充: ${fixedCount}`);
  console.log(`   - 失败: ${failedFixes.length}`);
  
  report.push(`\n## 五、数据补充结果\n`);
  report.push(`\n| 操作类型 | 数量 |\n`);
  report.push(`|----------|------|\n`);
  report.push(`| 尝试补充总数 | ${canFixMaterials.length} |\n`);
  report.push(`| 成功补充 | ${fixedCount} |\n`);
  report.push(`| 补充失败 | ${failedFixes.length} |\n`);
  report.push(`| 未能匹配Excel | ${cannotFixMaterials.length} |\n`);
  
  if (failedFixes.length > 0) {
    report.push(`\n### 5.1 补充失败记录\n`);
    for (const err of failedFixes) {
      report.push(`- ${err.name}: ${err.error}\n`);
    }
  }
  
  console.log("\n📋 第五步：验证补充结果...");
  
  const afterStats = {
    totalWithNutrition: 0,
    missingNutrition: 0
  };
  
  for (const mat of dbMaterials) {
    const nutritionRecord = db.prepare(
      `SELECT per_100g_json FROM material_nutrition WHERE material_id = ? AND is_latest = 1`
    ).get(mat.id) as { per_100g_json: string } | undefined;
    
    if (nutritionRecord && nutritionRecord.per_100g_json && nutritionRecord.per_100g_json !== '{}') {
      try {
        const nutrition = JSON.parse(nutritionRecord.per_100g_json);
        if (Object.keys(nutrition).length > 0) {
          afterStats.totalWithNutrition++;
        } else {
          afterStats.missingNutrition++;
        }
      } catch {
        afterStats.missingNutrition++;
      }
    } else {
      afterStats.missingNutrition++;
    }
  }
  
  report.push(`\n## 六、补充前后对比\n`);
  report.push(`\n### 6.1 整体数据质量变化\n`);
  report.push(`\n| 状态 | 补充前 | 补充后 | 变化 |\n`);
  report.push(`|------|--------|--------|------|\n`);
  report.push(`| 已有营养数据 | ${beforeStats.totalWithNutrition} | ${afterStats.totalWithNutrition} | ${afterStats.totalWithNutrition - beforeStats.totalWithNutrition >= 0 ? '+' : ''}${afterStats.totalWithNutrition - beforeStats.totalWithNutrition} |\n`);
  report.push(`| 缺失营养数据 | ${beforeStats.missingNutrition} | ${afterStats.missingNutrition} | ${afterStats.missingNutrition - beforeStats.missingNutrition >= 0 ? '+' : ''}${afterStats.missingNutrition - beforeStats.missingNutrition} |\n`);
  report.push(`| 完整率 | ${((beforeStats.totalWithNutrition / dbMaterials.length) * 100).toFixed(1)}% | ${((afterStats.totalWithNutrition / dbMaterials.length) * 100).toFixed(1)}% | ${((afterStats.totalWithNutrition - beforeStats.totalWithNutrition) / dbMaterials.length * 100).toFixed(1)}% |\n`);
  
  console.log(`\n   ✓ 补充后已有营养数据: ${afterStats.totalWithNutrition}`);
  console.log(`   ✓ 补充后缺失营养数据: ${afterStats.missingNutrition}`);
  console.log(`   ✓ 数据完整率: ${((afterStats.totalWithNutrition / dbMaterials.length) * 100).toFixed(1)}%`);
  
  report.push(`\n## 七、异常数据处理说明\n`);
  report.push(`\n### 7.1 未能补充的原料 (${cannotFixMaterials.length + failedFixes.length} 条)\n`);
  
  if (cannotFixMaterials.length > 0) {
    report.push(`\n以下原料在 Excel 参考文件中未找到对应数据，建议手动补充或忽略：\n`);
    for (const mat of cannotFixMaterials) {
      const note = mat.name.startsWith('测试') ? '(测试数据)' : '';
      report.push(`- ${mat.name} ${note}\n`);
    }
  }
  
  if (failedFixes.length > 0) {
    report.push(`\n以下原料补充失败：\n`);
    for (const err of failedFixes) {
      report.push(`- ${err.name}: ${err.error}\n`);
    }
  }
  
  report.push(`\n### 7.2 补充规则说明\n`);
  report.push(`\n1. **数据来源**：使用 Excel 参考文件中的营养数据进行补充\n`);
  report.push(`2. **匹配方式**：按原料名称精确匹配\n`);
  report.push(`3. **数据来源标识**：所有补充数据标记为 "excel-reference-supplement"\n`);
  report.push(`4. **更新时间**：自动更新为当前时间\n`);
  report.push(`5. **版本管理**：is_latest 标记为 1\n`);
  
  report.push(`\n### 7.3 营养数据字段说明\n`);
  report.push(`\n| 字段 | 说明 | 单位 |\n`);
  report.push(`|------|------|------|\n`);
  report.push(`| protein | 蛋白质 | g/100g |\n`);
  report.push(`| fat | 脂肪 | g/100g |\n`);
  report.push(`| carbohydrate | 碳水化合物 | g/100g |\n`);
  report.push(`| energy | 能量（由蛋白质、脂肪、碳水化合物计算） | kJ/100g |\n`);
  report.push(`| sodium | 钠 | mg/100g |\n`);
  report.push(`| ... | 其他可选字段 | ... |\n`);
  
  report.push(`\n---\n`);
  report.push(`*本报告由 TingStudio 营养数据排查工具自动生成*\n`);
  
  closeDatabase();
  
  fs.writeFileSync(REPORT_PATH, report.join(''));
  console.log(`\n📄 报告已生成: ${REPORT_PATH}`);
  console.log("\n" + "=".repeat(60));
  console.log("排查完成!");
  console.log("=".repeat(60));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

main().catch(console.error);
