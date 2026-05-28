import { query, connectDatabase } from "../../config/database-better-sqlite3.js";

interface ConfigRow {
  config_key: string;
}

const DEFAULT_CONFIGS = [
  {
    configKey: "default_export_format",
    configValue: "excel",
    configType: "string",
    description: "默认导出格式",
  },
  {
    configKey: "default_template_formula",
    configValue: "",
    configType: "string",
    description: "配方导出默认模板ID",
  },
  {
    configKey: "default_template_material",
    configValue: "",
    configType: "string",
    description: "原料导出默认模板ID",
  },
  {
    configKey: "default_template_weekly_report",
    configValue: "",
    configType: "string",
    description: "周报导出默认模板ID",
  },
  {
    configKey: "default_template_monthly_report",
    configValue: "",
    configType: "string",
    description: "月报导出默认模板ID",
  },
  {
    configKey: "export_rate_limit",
    configValue: "10",
    configType: "number",
    description: "每小时最大导出次数",
  },
  {
    configKey: "file_naming_pattern",
    configValue: "{type}_{category}_{date}",
    configType: "string",
    description: "文件命名模式",
  },
  {
    configKey: "auto_delete_days",
    configValue: "30",
    configType: "number",
    description: "导出文件自动删除天数",
  },
];

export async function up(): Promise<void> {
  console.log("[Migration] 开始：填充 export_center_config 默认配置...");

  try {
    const [tables] = query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='export_center_config'"
    ) as [Array<{ name: string }>];

    if (!tables || tables.length === 0) {
      console.log("[Migration] export_center_config 表不存在，请先运行 createExportCenterConfig 迁移");
      throw new Error("export_center_config 表不存在");
    }

    const [existingRows] = query(
      "SELECT config_key FROM export_center_config"
    ) as [Array<ConfigRow>];

    const existingKeys = new Set(existingRows.map((r) => r.config_key));

    for (const config of DEFAULT_CONFIGS) {
      if (existingKeys.has(config.configKey)) {
        console.log(`[Migration] ⏭️ 配置已存在: ${config.configKey}`);
        continue;
      }

      query(
        "INSERT INTO export_center_config (config_key, config_value, config_type, description, updated_by, updated_at) VALUES (?, ?, ?, ?, 'system', datetime('now'))",
        [config.configKey, config.configValue, config.configType, config.description]
      );
      console.log(`[Migration] ✅ 插入配置: ${config.configKey} = ${config.configValue}`);
    }

    console.log("[Migration] ✅ export_center_config 默认配置填充完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 迁移失败:", message);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log("[Migration] 开始回滚 export_center_config 默认配置...");

  try {
    const keys = DEFAULT_CONFIGS.map((c) => c.configKey);
    const placeholders = keys.map(() => "?").join(", ");
    query(
      `DELETE FROM export_center_config WHERE config_key IN (${placeholders})`,
      keys
    );
    console.log(`[Migration] ✅ 已删除 ${keys.length} 条默认配置`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Migration] ✗ 回滚失败:", message);
    throw error;
  }
}

connectDatabase()
  .then(() => up())
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("迁移失败:", err);
    process.exit(1);
  });
