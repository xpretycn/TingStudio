import { query, execute } from '../../config/database-adapter.js';
import crypto from "node:crypto";

connectDatabase();

async function migrateCreateRatioThresholdConfigs() {
  console.log("开始迁移：创建含量比校验阈值配置表...\n");

  try {
    

    console.log("创建 ratio_threshold_configs 表...");
    await execute(`
      CREATE TABLE IF NOT EXISTS ratio_threshold_configs (
        id TEXT PRIMARY KEY,
        normal_low REAL NOT NULL DEFAULT 0.98,
        normal_high REAL NOT NULL DEFAULT 1.02,
        warning_low REAL NOT NULL DEFAULT 0.95,
        warning_high REAL NOT NULL DEFAULT 1.05,
        high_warning_low REAL NOT NULL DEFAULT 0.92,
        high_warning_high REAL NOT NULL DEFAULT 1.08,
        updated_at TEXT NOT NULL,
        updated_by TEXT
      )
    `);
    console.log("✅ ratio_threshold_configs 表创建成功\n");

    const existing = (await query("SELECT id FROM ratio_threshold_configs LIMIT 1", [])).rows[0];
    if (!existing) {
      const now = new Date().toISOString();
      await execute(`
        INSERT INTO ratio_threshold_configs (id, normal_low, normal_high, warning_low, warning_high, high_warning_low, high_warning_high, updated_at, updated_by)
        VALUES (?, 0.98, 1.02, 0.95, 1.05, 0.92, 1.08, ?, NULL)
      `, [crypto.randomUUID(]), now);
      console.log("✅ 默认阈值配置插入成功\n");
    } else {
      console.log("ℹ️ 阈值配置已存在，跳过默认数据插入\n");
    }

    console.log("✅ 迁移完成！");
    console.log("\n已创建的表：");
    console.log("  - ratio_threshold_configs: 含量比校验阈值配置表");
    console.log("\n默认阈值：");
    console.log("  - 正常范围: [0.98, 1.02]");
    console.log("  - 预警范围: [0.95, 1.05]");
    console.log("  - 高级预警范围: [0.92, 1.08]");

  } catch (error: any) {
    console.error(`\n❌ 迁移失败:`, error.message);
    throw error;
  }
}

migrateCreateRatioThresholdConfigs()
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n迁移失败:", err);
    process.exit(1);
  });
