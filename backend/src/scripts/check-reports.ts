/**
 * 报告删除诊断工具
 * 运行方式: npx tsx scripts/check-reports.ts
 * 
 * 用途: 检查数据库中报告的实际状态，验证删除操作是否生效
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "tingstudio.db");

console.log("=".repeat(60));
console.log("📋 报告数据诊断工具");
console.log("=".repeat(60));
console.log(`\n📁 数据库路径: ${DB_PATH}\n`);

if (!fs.existsSync(DB_PATH)) {
  console.error("❌ 数据库文件不存在！");
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

try {
  // 1. 统计总报告数
  const totalCount = db.prepare("SELECT COUNT(*) as total FROM reports").get() as any;
  console.log(`📊 报告总数: ${totalCount.total}\n`);

  // 2. 查找所有包含"第18周"或"4月"的报告
  const week18Reports = db.prepare(`
    SELECT id, title, type, status, created_by, created_at, updated_at
    FROM reports
    WHERE title LIKE '%第18周%' OR title LIKE '%4月%'
    ORDER BY created_at DESC
  `).all();

  console.log(`🔍 找到 ${week18Reports.length} 条包含"第18周"或"4月"的报告:\n`);
  
  if (week18Reports.length === 0) {
    console.log("   ✅ 未找到任何第18周或4月的报告 - 可能已被全部删除\n");
  } else {
    week18Reports.forEach((r: any, i: number) => {
      console.log(`   [${i + 1}] ID: ${r.id}`);
      console.log(`       标题: ${r.title}`);
      console.log(`       类型: ${r.type} | 状态: ${r.status}`);
      console.log(`       创建者: ${r.created_by} | 创建时间: ${r.created_at}`);
      console.log(`       更新时间: ${r.updated_at || 'N/A'}`);
      console.log("");
    });
  }

  // 3. 按类型统计
  const typeStats = db.prepare(`
    SELECT type, status, COUNT(*) as count
    FROM reports
    GROUP BY type, status
    ORDER BY type, status
  `).all();

  console.log(`📈 按类型+状态分布:`);
  typeStats.forEach((s: any) => {
    console.log(`   ${s.type} / ${s.status}: ${s.count} 条`);
  });
  console.log("");

  // 4. 最近删除的痕迹（如果有 soft delete 字段）
  try {
    const columns = db.prepare("PRAGMA table_info(reports)").all() as any[];
    const hasDeletedAt = columns.some((c: any) => c.name === 'deleted_at');
    
    if (hasDeletedAt) {
      const deleted = db.prepare("SELECT COUNT(*) as cnt FROM reports WHERE deleted_at IS NOT NULL").get() as any;
      console.log(`🗑️ 软删除记录数: ${deleted.cnt}\n`);
    }
  } catch {}

  // 5. 最近10条报告（用于对比）
  console.log(`📋 最近10条报告 (最新优先):\n`);
  const recent = db.prepare(`
    SELECT id, title, type, status, created_by, created_at
    FROM reports
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  recent.forEach((r: any, i: number) => {
    console.log(`   ${i + 1}. [${r.id?.slice(0, 12)}...] "${r.title}" | ${r.type}/${r.status} | by ${r.created_by?.slice(0, 8)} | ${r.created_at?.slice(0, 16)}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("✅ 诊断完成");
  console.log("=".repeat(60));

} finally {
  db.close();
}
