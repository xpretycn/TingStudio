/**
 * 验证 AI 用量记录功能
 * 运行方式: npx tsx scripts/check-ai-usage.ts
 */


import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "tingstudio.db");

console.log("=".repeat(60));
console.log("AI 用量记录验证工具");
console.log("=".repeat(60));
console.log(`\n📁 数据库路径: ${DB_PATH}\n`);

// 1. 检查数据库文件是否存在
if (!fs.existsSync(DB_PATH)) {
  console.error("❌ 数据库文件不存在！");
  process.exit(1);
}

console.log("✅ 数据库文件存在");

// 2. 连接数据库
const db = new Database(DB_PATH, { readonly: true });

try {
  // 3. 检查 ai_usage_logs 表是否存在
  const tableCheck = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_usage_logs'")
    .get();

  if (!tableCheck) {
    console.error("\n❌ ai_usage_logs 表不存在！");
    console.error("\n可能的原因:");
    console.error("1. 数据库迁移未执行");
    console.error("2. 表创建语句未包含在初始化脚本中");
    console.error("\n建议: 重启后端服务，让自动迁移创建表");
    process.exit(1);
  }

  console.log("✅ ai_usage_logs 表存在");

  // 4. 查询表结构
  console.log("\n📋 表结构:");
  const columns = (await query("PRAGMA table_info(ai_usage_logs)", [])).rows;
  console.table(columns);

  // 5. 统计数据总量
  const countResult = (await query("SELECT COUNT(*) as total FROM ai_usage_logs", [])).rows[0] as { total: number };
  console.log(`\n📊 总记录数: ${countResult.total}`);

  if (countResult.total === 0) {
    console.warn("\n⚠️  表为空，没有任何用量记录！");
    console.warn("\n请执行以下步骤排查:");
    console.warn("1. 启动后端服务: npm run dev");
    console.warn("2. 执行一次 AI 解析操作");
    console.warn("3. 查看后端控制台日志，搜索 [AI-Usage]");
    console.warn("4. 如果看到 ❌ 错误信息，说明记录失败");
    console.warn("5. 如果看到 ✅ 成功信息，刷新此页面查看数据");
  } else {
    // 6. 显示最近的记录
    console.log("\n📝 最近 5 条记录:");
    const recentRecords = db
      .prepare(
        `
        SELECT id, provider, model, call_type, 
               prompt_tokens, completion_tokens, total_tokens,
               latency_ms, status, created_at
        FROM ai_usage_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `
      )
      .all();
    console.table(recentRecords);

    // 7. 统计摘要
    console.log("\n📈 用量统计:");
    const stats = db
      .prepare(
        `
        SELECT 
          COUNT(*) as total_calls,
          SUM(total_tokens) as total_tokens,
          AVG(latency_ms) as avg_latency,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN status = 'fallback' THEN 1 END) as fallback_count,
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM ai_usage_logs
      `
      )
      .get();
    console.table(stats);

    // 8. 按模型统计
    console.log("\n🤖 按模型统计:");
    const modelStats = db
      .prepare(
        `
        SELECT 
          provider, model,
          COUNT(*) as calls,
          SUM(total_tokens) as tokens,
          AVG(latency_ms) as avg_latency
        FROM ai_usage_logs
        GROUP BY provider, model
        ORDER BY tokens DESC
      `
      )
      .all();
    console.table(modelStats);
  }

  // 9. 按日期统计（最近7天）
  console.log("\n📅 最近7天趋势:");
  const dailyStats = db
    .prepare(
      `
      SELECT 
        date(created_at) as date,
        COUNT(*) as calls,
        SUM(total_tokens) as tokens
      FROM ai_usage_logs
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date
    `
    )
    .all();

  if (dailyStats.length > 0) {
    console.table(dailyStats);
  } else {
    console.log("   （最近7天无数据）");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 验证完成");
  console.log("=".repeat(60));
} finally {
  db.close();
}
