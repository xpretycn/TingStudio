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
  `display_name` TEXT DEFAULT NULL,
  `avatar` TEXT DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `email` TEXT DEFAULT NULL,
  `phone` TEXT DEFAULT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `data_source` TEXT NOT NULL DEFAULT 'manual' CHECK(data_source IN ('manual', 'batch_import', 'api_sync'))
);

-- 原料表
CREATE TABLE IF NOT EXISTS `materials` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `code` TEXT NOT NULL,
  `unit` TEXT NOT NULL DEFAULT 'g',
  `stock` REAL NOT NULL DEFAULT 0,
  `material_type` TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
  `unit_price` REAL DEFAULT NULL,
  `data_source` TEXT NOT NULL DEFAULT 'manual',
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `version` INTEGER NOT NULL DEFAULT 1,
  `previous_version_id` TEXT DEFAULT NULL,
  `is_latest` INTEGER NOT NULL DEFAULT 1,
  `is_deleted` INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS `idx_material_name` ON `materials`(`name`);
CREATE INDEX IF NOT EXISTS `idx_material_code` ON `materials`(`code`);
CREATE INDEX IF NOT EXISTS `idx_material_version` ON `materials`(`version`);
CREATE INDEX IF NOT EXISTS `idx_material_previous_version` ON `materials`(`previous_version_id`);
CREATE INDEX IF NOT EXISTS `idx_material_is_latest` ON `materials`(`is_latest`);
CREATE INDEX IF NOT EXISTS `idx_material_is_deleted` ON `materials`(`is_deleted`);

-- 配方表（关联业务员）
CREATE TABLE IF NOT EXISTS `formulas` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `salesman_id` TEXT NOT NULL,
  `salesman_name` TEXT NOT NULL,
  `materials_json` TEXT NOT NULL,
  `finished_weight` REAL NOT NULL DEFAULT 0,
  `ratio_factor` REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  `supplement_ratio_factor` REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  `description` TEXT DEFAULT NULL,
  `preparation_method` TEXT DEFAULT NULL,
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
  `version_reason` TEXT DEFAULT NULL,
  `changes_json` TEXT DEFAULT NULL,
  `snapshot_json` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
  `is_current` INTEGER NOT NULL DEFAULT 0,
  `ratio_factor` REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  `supplement_ratio_factor` REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  `created_by` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_fv_formula` ON `formula_versions`(`formula_id`);
CREATE INDEX IF NOT EXISTS `idx_fv_version_number` ON `formula_versions`(`formula_id`, `version_number`);
CREATE INDEX IF NOT EXISTS `idx_fv_status` ON `formula_versions`(`status`);
CREATE INDEX IF NOT EXISTS `idx_fv_formula_status` ON `formula_versions`(`formula_id`, `status`);

-- 配方版本审批日志表
CREATE TABLE IF NOT EXISTS `formula_review_logs` (
  `review_log_id` TEXT PRIMARY KEY,
  `version_id` TEXT NOT NULL,
  `reviewer_id` TEXT NOT NULL,
  `reviewer_name` TEXT DEFAULT NULL,
  `action` TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
  `comment` TEXT DEFAULT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`version_id`) REFERENCES `formula_versions`(`version_id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS `idx_frl_version` ON `formula_review_logs`(`version_id`);
CREATE INDEX IF NOT EXISTS `idx_frl_reviewer` ON `formula_review_logs`(`reviewer_id`);
CREATE INDEX IF NOT EXISTS `idx_frl_action` ON `formula_review_logs`(`action`);

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
  `material_id` TEXT NOT NULL,
  `per_100g_json` TEXT NOT NULL,
  `data_version` TEXT NOT NULL DEFAULT '1.0',
  `data_source` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `confidence` TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  `last_updated` TEXT NOT NULL DEFAULT (datetime('now')),
  `material_version` INTEGER NOT NULL DEFAULT 1,
  `is_latest` INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_mn_material_version` ON `material_nutrition`(`material_id`, `material_version`);
CREATE INDEX IF NOT EXISTS `idx_mn_is_latest` ON `material_nutrition`(`is_latest`);

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
  `is_preset` INTEGER NOT NULL DEFAULT 0,
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

-- 含量比校验阈值配置表
CREATE TABLE IF NOT EXISTS `ratio_threshold_configs` (
  `id` TEXT PRIMARY KEY,
  `normal_low` REAL NOT NULL DEFAULT 0.98,
  `normal_high` REAL NOT NULL DEFAULT 1.02,
  `warning_low` REAL NOT NULL DEFAULT 0.95,
  `warning_high` REAL NOT NULL DEFAULT 1.05,
  `high_warning_low` REAL NOT NULL DEFAULT 0.92,
  `high_warning_high` REAL NOT NULL DEFAULT 1.08,
  `updated_at` TEXT NOT NULL,
  `updated_by` TEXT
);
