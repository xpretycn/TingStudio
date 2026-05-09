/**
 * 周报数据内容诊断工具
 * 检查周报的 dataJson 中是否包含 formula/sales 数据
 * 运行方式: npx tsx src/scripts/check-weekly-report-data.ts
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "tingstudio.db");

console.log("=".repeat(60));
console.log("📋 周报数据内容诊断");
console.log("=".repeat(60));

if (!fs.existsSync(DB_PATH)) {
  console.error("❌ 数据库文件不存在！");
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

try {
  // 获取所有周报
  const weeklyReports = db.prepare(`
    SELECT id, title, status, created_at, data_json
    FROM reports
    WHERE type = 'weekly'
    ORDER BY created_at DESC
  `).all();

  console.log(`\n📊 周报总数: ${weeklyReports.length}\n`);

  weeklyReports.forEach((r: any, idx: number) => {
    console.log(`${"─".repeat(55)}`);
    console.log(`[${idx + 1}] ${r.title}`);
    console.log(`    ID: ${r.id} | 状态: ${r.status} | 创建: ${r.created_at?.slice(0, 16)}`);

    let dataJson: any = null;
    try {
      dataJson = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
    } catch {
      console.log(`    ⚠️ data_json 解析失败`);
      return;
    }

    if (!dataJson) {
      console.log(`    ⚠️ data_json 为空 (null/undefined)`);
      return;
    }

    // 检查 formula 数据
    const formula = dataJson.formula;
    if (!formula) {
      console.log(`    🔴 配方数据: ❌ 不存在 (dataJson 无 formula 字段)`);
    } else {
      const hasTrend = Array.isArray(formula.dailyFormulaTrend) && formula.dailyFormulaTrend.length > 0;
      const hasDist = Array.isArray(formula.statusDistribution) && formula.statusDistribution.length > 0;
      console.log(`    🟢 配方数据: ✅ 存在`);
      console.log(`       - newFormulaCount: ${formula.newFormulaCount ?? 'N/A'}`);
      console.log(`       - completedFormulaCount: ${formula.completedFormulaCount ?? 'N/A'}`);
      console.log(`       - completionRate: ${formula.completionRate != null ? formula.completionRate + '%' : 'N/A'}`);
      console.log(`       - totalFormulaCount: ${formula.totalFormulaCount ?? 'N/A'}`);
      console.log(`       - dailyFormulaTrend: ${hasTrend ? formula.dailyFormulaTrend.length + ' 条记录' : '❌ 空/不存在'}`);
      if (hasTrend) {
        console.log(`         样例:`, JSON.stringify(formula.dailyFormulaTrend[0]));
      }
      console.log(`       - statusDistribution: ${hasDist ? formula.statusDistribution.length + ' 条记录' : '❌ 空/不存在'}`);
      if (hasDist) {
        console.log(`         样例:`, JSON.stringify(formula.statusDistribution[0]));
      }
    }

    // 检查 sales 数据
    const sales = dataJson.sales;
    if (!sales) {
      console.log(`    🔴 销售数据: ❌ 不存在 (dataJson 无 sales 字段)`);
    } else {
      const hasDaily = Array.isArray(sales.dailySalesTrend) && sales.dailySalesTrend.length > 0;
      const hasTop = Array.isArray(sales.topFormulas) && sales.topFormulas.length > 0;
      const hasWeekly = Array.isArray(sales.weeklyComparison) && sales.weeklyComparison.length > 0;
      console.log(`    🟢 销售数据: ✅ 存在`);
      console.log(`       - weeklyQuantity: ${sales.weeklyQuantity ?? 'N/A'}`);
      console.log(`       - weeklyRevenue: ${sales.weeklyRevenue ?? 'N/A'}`);
      console.log(`       - quantityGrowthRate: ${sales.quantityGrowthRate != null ? sales.quantityGrowthRate + '%' : 'N/A'}`);
      console.log(`       - revenueGrowthRate: ${sales.revenueGrowthRate != null ? sales.revenueGrowthRate + '%' : 'N/A'}`);
      console.log(`       - dailySalesTrend: ${hasDaily ? sales.dailySalesTrend.length + ' 条记录' : '❌ 空/不存在'}`);
      if (hasDaily) {
        console.log(`         样例:`, JSON.stringify(sales.dailySalesTrend[0]));
      }
      console.log(`       - topFormulas: ${hasTop ? sales.topFormulas.length + ' 条记录' : '❌ 空/不存在'}`);
      console.log(`       - weeklyComparison: ${hasWeekly ? sales.weeklyComparison.length + ' 条记录' : '❌ 空/不存在'}`);
    }

    console.log("");
  });

  console.log("=".repeat(60));

  // 额外：检查月报是否有数据（对比用）
  console.log("\n📋 月报数据抽样检查:\n");
  const monthlyReport = db.prepare(`
    SELECT id, title, data_json FROM reports WHERE type = 'monthly' LIMIT 2
  `).all();

  monthlyReport.forEach((r: any) => {
    let dataJson: any = null;
    try { dataJson = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json; } catch {}
    if (!dataJson) return;

    const f = dataJson.formula;
    const s = dataJson.sales;
    console.log(`  📄 ${r.title} (${r.id?.slice(0,8)}...)`);
    console.log(`     formula: ${f ? `✅ keys=[${Object.keys(f).join(', ')}]` : '❌ 无'}`);
    console.log(`     sales: ${s ? `✅ keys=[${Object.keys(s).join(', ')}]` : '❌ 无'}`);
    if (s?.dailySalesTrend) console.log(`     dailySalesTrend 长度: ${s.dailySalesTrend.length}`);
    if (s?.weeklyComparison) console.log(`     weeklyComparison 长度: ${s.weeklyComparison.length}`);
    console.log("");
  });

} finally {
  db.close();
}
