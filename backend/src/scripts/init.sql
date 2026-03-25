-- TingStudio SQLite 数据库初始化脚本

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 基础表（v1.0 已有功能）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` TEXT PRIMARY KEY,
  `username` TEXT NOT NULL UNIQUE,
  `password` TEXT NOT NULL,
  `role` TEXT NOT NULL DEFAULT 'formulist' CHECK(role IN ('admin', 'formulist')),
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 原料表
CREATE TABLE IF NOT EXISTS `materials` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `code` TEXT NOT NULL UNIQUE,
  `unit` TEXT NOT NULL DEFAULT 'g',
  `stock` REAL NOT NULL DEFAULT 0,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS `idx_material_name` ON `materials`(`name`);
CREATE INDEX IF NOT EXISTS `idx_material_code` ON `materials`(`code`);

-- 配方表（关联业务员）
CREATE TABLE IF NOT EXISTS `formulas` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `salesman_id` TEXT NOT NULL,
  `salesman_name` TEXT NOT NULL,
  `materials_json` TEXT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`salesman_id`) REFERENCES `salesmen`(`id`) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS `idx_formula_name` ON `formulas`(`name`);
CREATE INDEX IF NOT EXISTS `idx_formula_salesman_id` ON `formulas`(`salesman_id`);
CREATE INDEX IF NOT EXISTS `idx_formula_created_by` ON `formulas`(`created_by`);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 业务员数据管理体系
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 业务员表
CREATE TABLE IF NOT EXISTS `salesmen` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `code` TEXT NOT NULL UNIQUE,
  `department` TEXT DEFAULT NULL,
  `phone` TEXT DEFAULT NULL,
  `email` TEXT DEFAULT NULL,
  `status` TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS `idx_salesman_name` ON `salesmen`(`name`);
CREATE INDEX IF NOT EXISTS `idx_salesman_code` ON `salesmen`(`code`);
CREATE INDEX IF NOT EXISTS `idx_salesman_status` ON `salesmen`(`status`);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 配方版本控制与对比
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 配方版本表
CREATE TABLE IF NOT EXISTS `formula_versions` (
  `version_id` TEXT PRIMARY KEY,
  `formula_id` TEXT NOT NULL,
  `version_number` TEXT NOT NULL,
  `version_name` TEXT DEFAULT NULL,
  `changes_json` TEXT DEFAULT NULL,
  `snapshot_json` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  `is_current` INTEGER NOT NULL DEFAULT 0,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_fv_formula` ON `formula_versions`(`formula_id`);
CREATE INDEX IF NOT EXISTS `idx_fv_version_number` ON `formula_versions`(`formula_id`, `version_number`);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 多元化配方输出方案
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 导出模板表
CREATE TABLE IF NOT EXISTS `export_templates` (
  `template_id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `type` TEXT NOT NULL CHECK(type IN ('pdf', 'excel', 'api', 'print')),
  `format_config_json` TEXT NOT NULL,
  `is_default` INTEGER NOT NULL DEFAULT 0,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS `idx_et_type` ON `export_templates`(`type`);

-- 导出任务表
CREATE TABLE IF NOT EXISTS `export_jobs` (
  `job_id` TEXT PRIMARY KEY,
  `formula_id` TEXT NOT NULL,
  `version_id` TEXT DEFAULT NULL,
  `template_id` TEXT DEFAULT NULL,
  `export_type` TEXT NOT NULL CHECK(export_type IN ('pdf', 'excel', 'api')),
  `status` TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  `file_url` TEXT DEFAULT NULL,
  `file_name` TEXT DEFAULT NULL,
  `api_endpoint` TEXT DEFAULT NULL,
  `progress` INTEGER NOT NULL DEFAULT 0,
  `error_message` TEXT DEFAULT NULL,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `completed_at` TEXT DEFAULT NULL,
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_ej_formula` ON `export_jobs`(`formula_id`);
CREATE INDEX IF NOT EXISTS `idx_ej_status` ON `export_jobs`(`status`);

-- API数据接口表
CREATE TABLE IF NOT EXISTS `api_data_interfaces` (
  `interface_id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `endpoint` TEXT NOT NULL UNIQUE,
  `method` TEXT NOT NULL DEFAULT 'GET' CHECK(method IN ('GET', 'POST', 'PUT', 'DELETE')),
  `authentication` TEXT NOT NULL DEFAULT 'none' CHECK(authentication IN ('none', 'basic', 'apiKey', 'oauth')),
  `auth_config_json` TEXT DEFAULT NULL,
  `data_format` TEXT NOT NULL DEFAULT 'json' CHECK(data_format IN ('json', 'xml')),
  `field_mapping_json` TEXT DEFAULT NULL,
  `rate_limit_json` TEXT DEFAULT NULL,
  `retry_config_json` TEXT DEFAULT NULL,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS `idx_adi_endpoint` ON `api_data_interfaces`(`endpoint`);

-- 分享配置表
CREATE TABLE IF NOT EXISTS `share_configs` (
  `share_id` TEXT PRIMARY KEY,
  `formula_id` TEXT NOT NULL,
  `version_id` TEXT DEFAULT NULL,
  `share_type` TEXT NOT NULL DEFAULT 'link' CHECK(share_type IN ('link', 'email', 'api')),
  `share_url` TEXT DEFAULT NULL,
  `password` TEXT DEFAULT NULL,
  `expire_date` TEXT DEFAULT NULL,
  `allowed_emails_json` TEXT DEFAULT NULL,
  `download_limit` INTEGER DEFAULT NULL,
  `download_count` INTEGER NOT NULL DEFAULT 0,
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_sc_formula` ON `share_configs`(`formula_id`);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 营养成分集成模块
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 原料营养成分表
CREATE TABLE IF NOT EXISTS `material_nutrition` (
  `nutrition_id` TEXT PRIMARY KEY,
  `material_id` TEXT NOT NULL UNIQUE,
  `per_100g_json` TEXT NOT NULL,
  `data_version` TEXT NOT NULL DEFAULT '1.0',
  `data_source` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `last_updated` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
);

-- 配方营养汇总表
CREATE TABLE IF NOT EXISTS `formula_nutrition_summaries` (
  `summary_id` TEXT PRIMARY KEY,
  `formula_id` TEXT NOT NULL,
  `version_id` TEXT DEFAULT NULL,
  `total_weight` REAL NOT NULL DEFAULT 0,
  `total_nutrition_json` TEXT NOT NULL,
  `per_100g_nutrition_json` TEXT NOT NULL,
  `material_breakdown_json` TEXT DEFAULT NULL,
  `calculated_by` TEXT NOT NULL,
  `calculated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_fns_formula` ON `formula_nutrition_summaries`(`formula_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `uk_fns_version` ON `formula_nutrition_summaries`(`version_id`);

-- 营养标准/档案表
CREATE TABLE IF NOT EXISTS `nutrition_profiles` (
  `profile_id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` TEXT NOT NULL CHECK(category IN ('infant', 'child', 'adult', 'elderly', 'pregnant', 'special')),
  `target_values_json` TEXT NOT NULL,
  `tolerance_ranges_json` TEXT DEFAULT NULL,
  `mandatory_fields_json` TEXT DEFAULT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS `idx_np_category` ON `nutrition_profiles`(`category`);

-- 营养分析报告表
CREATE TABLE IF NOT EXISTS `nutrition_analysis_reports` (
  `report_id` TEXT PRIMARY KEY,
  `formula_id` TEXT NOT NULL,
  `version_id` TEXT DEFAULT NULL,
  `summary_id` TEXT NOT NULL,
  `compliance_check_json` TEXT DEFAULT NULL,
  `recommendations_json` TEXT DEFAULT NULL,
  `generated_by` TEXT NOT NULL,
  `generated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`summary_id`) REFERENCES `formula_nutrition_summaries`(`summary_id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_nar_formula` ON `nutrition_analysis_reports`(`formula_id`);
