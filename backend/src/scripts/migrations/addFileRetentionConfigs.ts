import { getDb, connectDatabase } from "../../config/database-better-sqlite3.js";
import crypto from "node:crypto";

connectDatabase();

async function migrateAddFileRetentionConfigs() {
  console.log("开始迁移：添加文件保留策略配置...\n");

  try {
    const db = getDb();
    const now = new Date().toISOString();

    const configs = [
      { key: 'file_retention_days', value: 90, desc: '原文件保留天数（超期自动清理）' },
      { key: 'file_storage_limit_bytes', value: 10737418240, desc: '文件存储空间上限（10GB）' },
      { key: 'file_storage_alert_percent', value: 80, desc: '磁盘使用率告警阈值（百分比）' },
    ];

    for (const config of configs) {
      const existing = db.prepare("SELECT id FROM parse_result_configs WHERE config_key = ?").get(config.key);
      if (!existing) {
        db.prepare(`
          INSERT INTO parse_result_configs (id, config_key, config_value, description, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          config.key,
          JSON.stringify(config.value),
          config.desc,
          now
        );
        console.log(`✅ 插入配置: ${config.key} = ${config.value}`);
      } else {
        console.log(`ℹ️ 配置已存在: ${config.key}`);
      }
    }

    console.log("\n✅ 迁移完成！");
  } catch (error: any) {
    console.error("\n❌ 迁移失败:", error.message);
    throw error;
  }
}

migrateAddFileRetentionConfigs()
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n迁移失败:", err);
    process.exit(1);
  });
