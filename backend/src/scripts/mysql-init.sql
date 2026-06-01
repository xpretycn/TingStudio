-- MySQL 数据库初始化脚本
-- TingStudio 完整表结构
-- 基于 database-better-sqlite3.ts INIT_SQL + runAutoMigrations

CREATE DATABASE IF NOT EXISTS `tingstudio` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tingstudio`;

-- ============================================================
-- 1. schema_migrations - 数据库迁移版本记录
-- ============================================================
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` VARCHAR(255) PRIMARY KEY,
  `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. users - 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'formulist' CHECK(role IN ('admin', 'formulist')),
  `display_name` VARCHAR(255) DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role_id` VARCHAR(36) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `data_source` VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK(data_source IN ('manual', 'batch_import', 'api_sync')),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_role` (`role`),
  INDEX `idx_users_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. roles - 角色表
-- ============================================================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `role_key` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT DEFAULT '',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_roles_role_key` (`role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. permissions - 权限表
-- ============================================================
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `module` VARCHAR(255) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `permission_key` VARCHAR(255) NOT NULL UNIQUE,
  `label` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_permissions_module` (`module`),
  INDEX `idx_permissions_permission_key` (`permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. role_permissions - 角色权限关联表
-- ============================================================
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` VARCHAR(36) NOT NULL,
  `permission_id` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`, `permission_id`),
  INDEX `idx_role_permissions_role_id` (`role_id`),
  INDEX `idx_role_permissions_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. salesmen - 业务员表
-- ============================================================
CREATE TABLE IF NOT EXISTS `salesmen` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `department` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_salesman_name` (`name`),
  INDEX `idx_salesman_code` (`code`),
  INDEX `idx_salesman_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. materials - 原料表（版本化，code 无 UNIQUE 约束）
-- ============================================================
CREATE TABLE IF NOT EXISTS `materials` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'g',
  `stock` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `material_type` VARCHAR(20) NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
  `unit_price` DECIMAL(10,2) DEFAULT NULL,
  `data_source` VARCHAR(255) NOT NULL DEFAULT 'manual',
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `version` INT NOT NULL DEFAULT 1,
  `previous_version_id` VARCHAR(36) DEFAULT NULL,
  `is_latest` TINYINT(1) NOT NULL DEFAULT 1,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `changes_json` JSON DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published')),
  `appearance_json` JSON DEFAULT NULL,
  `taste_json` JSON DEFAULT NULL,
  `efficacy_json` JSON DEFAULT NULL,
  INDEX `idx_material_name` (`name`),
  INDEX `idx_material_code` (`code`),
  INDEX `idx_material_version` (`version`),
  INDEX `idx_material_previous_version` (`previous_version_id`),
  INDEX `idx_material_is_latest` (`is_latest`),
  INDEX `idx_material_is_deleted` (`is_deleted`),
  INDEX `idx_material_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. material_review_logs - 原料审批日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS `material_review_logs` (
  `review_log_id` VARCHAR(36) PRIMARY KEY,
  `material_id` VARCHAR(36) NOT NULL,
  `reviewer_id` VARCHAR(36) NOT NULL,
  `reviewer_name` VARCHAR(255) DEFAULT NULL,
  `action` VARCHAR(20) NOT NULL CHECK(action IN ('submit', 'approve', 'reject', 'publish')),
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_mrl_material` (`material_id`),
  INDEX `idx_mrl_reviewer` (`reviewer_id`),
  INDEX `idx_mrl_action` (`action`),
  INDEX `idx_mrl_created_at` (`created_at`),
  CONSTRAINT `fk_mrl_material` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mrl_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. material_nutrition - 原料营养成分表（版本化，material_id 无 UNIQUE 约束）
-- ============================================================
CREATE TABLE IF NOT EXISTS `material_nutrition` (
  `nutrition_id` VARCHAR(36) PRIMARY KEY,
  `material_id` VARCHAR(36) NOT NULL,
  `per_100g_json` JSON NOT NULL,
  `data_version` VARCHAR(20) NOT NULL DEFAULT '1.0',
  `data_source` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `confidence` VARCHAR(20) DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  `last_updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `material_version` INT NOT NULL DEFAULT 1,
  `is_latest` TINYINT(1) NOT NULL DEFAULT 1,
  INDEX `idx_mn_material_version` (`material_id`, `material_version`),
  INDEX `idx_mn_is_latest` (`is_latest`),
  CONSTRAINT `fk_mn_material` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. formulas - 配方表
-- ============================================================
CREATE TABLE IF NOT EXISTS `formulas` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `salesman_id` VARCHAR(36) NOT NULL,
  `salesman_name` VARCHAR(255) NOT NULL,
  `materials_json` JSON NOT NULL,
  `finished_weight` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `ratio_factor` DOUBLE NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  `supplement_ratio_factor` DOUBLE NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  `packaging_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `other_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `profit_margin` DOUBLE NOT NULL DEFAULT 20,
  `description` TEXT DEFAULT NULL,
  `preparation_method` TEXT DEFAULT NULL,
  `original_name` VARCHAR(255) DEFAULT NULL,
  `original_weight` DECIMAL(10,2) DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_formula_name` (`name`),
  INDEX `idx_formula_salesman_id` (`salesman_id`),
  INDEX `idx_formula_created_by` (`created_by`),
  CONSTRAINT `fk_formula_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. formula_versions - 配方版本表
-- ============================================================
CREATE TABLE IF NOT EXISTS `formula_versions` (
  `version_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_number` VARCHAR(50) NOT NULL,
  `version_name` VARCHAR(255) DEFAULT NULL,
  `version_reason` TEXT DEFAULT NULL,
  `changes_json` JSON DEFAULT NULL,
  `snapshot_json` JSON NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
  `is_current` TINYINT(1) NOT NULL DEFAULT 0,
  `ratio_factor` DOUBLE NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  `supplement_ratio_factor` DOUBLE NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_fv_formula` (`formula_id`),
  INDEX `idx_fv_version_number` (`formula_id`, `version_number`),
  INDEX `idx_fv_status` (`status`),
  INDEX `idx_fv_formula_status` (`formula_id`, `status`),
  CONSTRAINT `fk_fv_formula` FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. formula_review_logs - 配方版本审批日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS `formula_review_logs` (
  `review_log_id` VARCHAR(36) PRIMARY KEY,
  `version_id` VARCHAR(36) NOT NULL,
  `reviewer_id` VARCHAR(36) NOT NULL,
  `reviewer_name` VARCHAR(255) DEFAULT NULL,
  `action` VARCHAR(20) NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_frl_version` (`version_id`),
  INDEX `idx_frl_reviewer` (`reviewer_id`),
  INDEX `idx_frl_action` (`action`),
  CONSTRAINT `fk_frl_version` FOREIGN KEY (`version_id`) REFERENCES `formula_versions`(`version_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_frl_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. formula_sales - 配方销售数据表
-- ============================================================
CREATE TABLE IF NOT EXISTS `formula_sales` (
  `id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `salesman_id` VARCHAR(36) NOT NULL,
  `period_type` VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
  `period_start` VARCHAR(20) NOT NULL,
  `period_end` VARCHAR(20) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `revenue` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `uk_fs_unique` (`formula_id`, `salesman_id`, `period_type`, `period_start`),
  INDEX `idx_fs_formula` (`formula_id`),
  INDEX `idx_fs_salesman` (`salesman_id`),
  INDEX `idx_fs_period` (`period_start`),
  CONSTRAINT `fk_fs_formula` FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fs_salesman` FOREIGN KEY (`salesman_id`) REFERENCES `salesmen`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. formula_nutrition_summaries - 配方营养汇总表
-- ============================================================
CREATE TABLE IF NOT EXISTS `formula_nutrition_summaries` (
  `summary_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_id` VARCHAR(36) DEFAULT NULL,
  `total_weight` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_nutrition_json` JSON NOT NULL,
  `per_100g_nutrition_json` JSON NOT NULL,
  `material_breakdown_json` JSON DEFAULT NULL,
  `calculated_by` VARCHAR(36) NOT NULL,
  `calculated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_fns_formula` (`formula_id`),
  UNIQUE INDEX `uk_fns_version` (`version_id`),
  CONSTRAINT `fk_fns_formula` FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. nutrition_profiles - 营养标准档案表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nutrition_profiles` (
  `profile_id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(20) NOT NULL CHECK(category IN ('infant', 'child', 'adult', 'elderly', 'pregnant', 'special')),
  `target_values_json` JSON NOT NULL,
  `tolerance_ranges_json` JSON DEFAULT NULL,
  `mandatory_fields_json` JSON DEFAULT NULL,
  `is_preset` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_np_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. nutrition_analysis_reports - 营养分析报告表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nutrition_analysis_reports` (
  `report_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_id` VARCHAR(36) DEFAULT NULL,
  `summary_id` VARCHAR(36) NOT NULL,
  `compliance_check_json` JSON DEFAULT NULL,
  `recommendations_json` JSON DEFAULT NULL,
  `generated_by` VARCHAR(36) NOT NULL,
  `generated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nar_formula` (`formula_id`),
  CONSTRAINT `fk_nar_formula` FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nar_summary` FOREIGN KEY (`summary_id`) REFERENCES `formula_nutrition_summaries`(`summary_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. ratio_threshold_configs - 配比阈值配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ratio_threshold_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `normal_low` DOUBLE NOT NULL DEFAULT 0.98,
  `normal_high` DOUBLE NOT NULL DEFAULT 1.02,
  `warning_low` DOUBLE NOT NULL DEFAULT 0.95,
  `warning_high` DOUBLE NOT NULL DEFAULT 1.05,
  `high_warning_low` DOUBLE NOT NULL DEFAULT 0.92,
  `high_warning_high` DOUBLE NOT NULL DEFAULT 1.08,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` VARCHAR(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. enum_options - 枚举选项表
-- ============================================================
CREATE TABLE IF NOT EXISTS `enum_options` (
  `id` VARCHAR(36) PRIMARY KEY,
  `category` VARCHAR(20) NOT NULL CHECK(category IN ('appearance', 'taste', 'efficacy')),
  `label` VARCHAR(255) NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `uk_enum_category_value` (`category`, `value`),
  INDEX `idx_enum_category` (`category`),
  INDEX `idx_enum_category_active` (`category`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. quick_formulas - 快捷配方表
-- ============================================================
CREATE TABLE IF NOT EXISTS `quick_formulas` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  `ratio_factor` DOUBLE NOT NULL DEFAULT 0.18,
  `supplement_ratio_factor` DOUBLE NOT NULL DEFAULT 1.0,
  `finished_weight` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `materials_json` JSON NOT NULL,
  `packaging_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `other_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `profit_margin` DOUBLE NOT NULL DEFAULT 20,
  `description` TEXT DEFAULT NULL,
  `preparation_method` TEXT DEFAULT NULL,
  `salesman_id` VARCHAR(36) DEFAULT NULL,
  `salesman_name` VARCHAR(255) DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_qf_name` (`name`),
  INDEX `idx_qf_status` (`status`),
  INDEX `idx_qf_created_by` (`created_by`),
  UNIQUE INDEX `idx_qf_name_user` (`name`, `created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 20. formula_templates - 配方模板表
-- ============================================================
CREATE TABLE IF NOT EXISTS `formula_templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `ratio_factor` DOUBLE NOT NULL DEFAULT 0.18,
  `supplement_ratio_factor` DOUBLE NOT NULL DEFAULT 1.0,
  `finished_weight` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `materials_json` JSON NOT NULL,
  `packaging_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `other_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `profit_margin` DOUBLE NOT NULL DEFAULT 20,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_template_name` (`name`),
  INDEX `idx_template_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21. export_templates - 导出模板表
-- ============================================================
CREATE TABLE IF NOT EXISTS `export_templates` (
  `template_id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `type` VARCHAR(20) NOT NULL CHECK(type IN ('pdf', 'excel', 'api', 'print')),
  `category` VARCHAR(20) NOT NULL DEFAULT 'formula' CHECK(category IN ('formula', 'material', 'weekly-report', 'monthly-report')),
  `format_config_json` JSON NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_et_type` (`type`),
  INDEX `idx_et_category` (`category`),
  INDEX `idx_et_category_type` (`category`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 22. export_jobs - 导出任务表
-- ============================================================
CREATE TABLE IF NOT EXISTS `export_jobs` (
  `job_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) DEFAULT NULL,
  `version_id` VARCHAR(36) DEFAULT NULL,
  `template_id` VARCHAR(36) DEFAULT NULL,
  `data_category` VARCHAR(20) NOT NULL DEFAULT 'formula' CHECK(data_category IN ('formula', 'material', 'weekly-report', 'monthly-report')),
  `target_ids_json` JSON DEFAULT NULL,
  `export_type` VARCHAR(20) NOT NULL CHECK(export_type IN ('pdf', 'excel')),
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  `file_url` VARCHAR(500) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `progress` INT NOT NULL DEFAULT 0,
  `error_message` TEXT DEFAULT NULL,
  `period_start` VARCHAR(20) DEFAULT NULL,
  `period_end` VARCHAR(20) DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_ej_formula` (`formula_id`),
  INDEX `idx_ej_status` (`status`),
  INDEX `idx_ej_data_category` (`data_category`),
  INDEX `idx_ej_created_by` (`created_by`),
  INDEX `idx_ej_category_status` (`data_category`, `status`),
  CONSTRAINT `fk_ej_formula` FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 23. export_center_config - 导出中心配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `export_center_config` (
  `config_key` VARCHAR(100) PRIMARY KEY,
  `config_value` TEXT NOT NULL,
  `config_type` VARCHAR(20) NOT NULL DEFAULT 'string' CHECK(config_type IN ('string', 'number', 'boolean', 'json')),
  `description` TEXT DEFAULT NULL,
  `updated_by` VARCHAR(36) NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ecc_config_type` (`config_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 24. api_data_interfaces - API 数据接口表
-- ============================================================
CREATE TABLE IF NOT EXISTS `api_data_interfaces` (
  `interface_id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `endpoint` VARCHAR(500) NOT NULL UNIQUE,
  `method` VARCHAR(10) NOT NULL DEFAULT 'GET' CHECK(method IN ('GET', 'POST', 'PUT', 'DELETE')),
  `authentication` VARCHAR(20) NOT NULL DEFAULT 'none' CHECK(authentication IN ('none', 'basic', 'apiKey', 'oauth')),
  `auth_config_json` JSON DEFAULT NULL,
  `data_format` VARCHAR(10) NOT NULL DEFAULT 'json' CHECK(data_format IN ('json', 'xml')),
  `field_mapping_json` JSON DEFAULT NULL,
  `rate_limit_json` JSON DEFAULT NULL,
  `retry_config_json` JSON DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `uk_adi_endpoint` (`endpoint`),
  INDEX `idx_adi_authentication` (`authentication`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 25. share_configs - 分享配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `share_configs` (
  `share_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_id` VARCHAR(36) DEFAULT NULL,
  `share_type` VARCHAR(20) NOT NULL DEFAULT 'link' CHECK(share_type IN ('link', 'email', 'api')),
  `share_url` VARCHAR(500) DEFAULT NULL,
  `password` VARCHAR(100) DEFAULT NULL,
  `expire_date` VARCHAR(20) DEFAULT NULL,
  `allowed_emails_json` JSON DEFAULT NULL,
  `download_limit` INT DEFAULT NULL,
  `download_count` INT NOT NULL DEFAULT 0,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sc_formula` (`formula_id`),
  INDEX `idx_sc_share_type` (`share_type`),
  INDEX `idx_sc_expire_date` (`expire_date`),
  CONSTRAINT `fk_sc_formula` FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 26. reports - 报告表
-- ============================================================
CREATE TABLE IF NOT EXISTS `reports` (
  `id` VARCHAR(36) PRIMARY KEY,
  `type` VARCHAR(20) NOT NULL CHECK(type IN ('weekly', 'monthly')),
  `title` VARCHAR(255) NOT NULL,
  `period_start` VARCHAR(20) NOT NULL,
  `period_end` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  `data_json` JSON NOT NULL,
  `generated_by` VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK(generated_by IN ('auto', 'manual')),
  `period_key` VARCHAR(255) DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_reports_type` (`type`),
  INDEX `idx_reports_period` (`period_start`, `period_end`),
  INDEX `idx_reports_status` (`status`),
  INDEX `idx_reports_created_by` (`created_by`),
  INDEX `idx_reports_period_key` (`type`, `created_by`, `period_key`),
  CONSTRAINT `fk_reports_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 27. report_targets - 报告目标表
-- ============================================================
CREATE TABLE IF NOT EXISTS `report_targets` (
  `id` VARCHAR(36) PRIMARY KEY,
  `period_type` VARCHAR(20) NOT NULL CHECK(period_type IN ('quarterly', 'yearly')),
  `period_start` VARCHAR(20) NOT NULL,
  `period_end` VARCHAR(20) NOT NULL,
  `targets_json` JSON NOT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rt_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 28. uploaded_files - 上传文件表
-- ============================================================
CREATE TABLE IF NOT EXISTS `uploaded_files` (
  `file_id` VARCHAR(36) PRIMARY KEY,
  `original_name` VARCHAR(255) NOT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `file_size` INT NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_type` VARCHAR(20) NOT NULL CHECK(file_type IN ('formula', 'material')),
  `status` VARCHAR(20) NOT NULL DEFAULT 'uploaded' CHECK(status IN ('uploaded', 'parsed', 'linked', 'orphaned', 'archived')),
  `related_id` VARCHAR(36) DEFAULT NULL,
  `related_type` VARCHAR(20) DEFAULT NULL CHECK(related_type IS NULL OR related_type IN ('formula', 'material')),
  `parse_result_json` JSON DEFAULT NULL,
  `parse_model` VARCHAR(255) DEFAULT NULL,
  `parse_confidence` DOUBLE DEFAULT NULL,
  `parse_usage_json` JSON DEFAULT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `uploaded_by` VARCHAR(36) NOT NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_accessed_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_uploaded_files_related` (`related_id`, `related_type`),
  INDEX `idx_uploaded_files_type` (`file_type`),
  INDEX `idx_uploaded_files_status` (`status`),
  INDEX `idx_uploaded_files_uploaded_by` (`uploaded_by`),
  INDEX `idx_uploaded_files_uploaded_at` (`uploaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 29. file_audit_log - 文件审计日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS `file_audit_log` (
  `log_id` VARCHAR(36) PRIMARY KEY,
  `file_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(20) NOT NULL CHECK(action IN ('upload', 'parse', 'link', 'unlink', 'reparse', 'download', 'delete', 'archive')),
  `operator` VARCHAR(255) NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `detail_json` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  INDEX `idx_file_audit_file` (`file_id`),
  INDEX `idx_file_audit_operator` (`operator`),
  INDEX `idx_file_audit_timestamp` (`timestamp`),
  CONSTRAINT `fk_fal_file` FOREIGN KEY (`file_id`) REFERENCES `uploaded_files`(`file_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 30. file_relations - 文件关联表
-- ============================================================
CREATE TABLE IF NOT EXISTS `file_relations` (
  `relation_id` VARCHAR(36) PRIMARY KEY,
  `file_id` VARCHAR(36) NOT NULL,
  `related_id` VARCHAR(36) NOT NULL,
  `related_type` VARCHAR(20) NOT NULL CHECK(related_type IN ('formula', 'material')),
  `related_name` VARCHAR(255) NOT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `uk_fr_file_related` (`file_id`, `related_id`, `related_type`),
  INDEX `idx_fr_file` (`file_id`),
  INDEX `idx_fr_related` (`related_id`, `related_type`),
  CONSTRAINT `fk_fr_file` FOREIGN KEY (`file_id`) REFERENCES `uploaded_files`(`file_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 31. ai_models - AI 模型配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_models` (
  `id` VARCHAR(36) PRIMARY KEY,
  `provider` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `base_url` VARCHAR(500) NOT NULL,
  `api_key` TEXT DEFAULT '',
  `model` VARCHAR(255) NOT NULL,
  `vision_model` VARCHAR(255) DEFAULT '',
  `vision_max_tokens` INT DEFAULT NULL,
  `description` TEXT DEFAULT '',
  `supports_vision` TINYINT(1) NOT NULL DEFAULT 0,
  `health_status` VARCHAR(20) NOT NULL DEFAULT 'unknown',
  `last_health_check` TIMESTAMP NULL DEFAULT NULL,
  `last_health_latency` INT DEFAULT NULL,
  `health_check_interval_days` INT NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ai_models_provider` (`provider`),
  INDEX `idx_ai_models_health` (`health_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 32. ai_usage_logs - AI 使用日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_usage_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `provider` VARCHAR(255) NOT NULL,
  `model` VARCHAR(255) NOT NULL,
  `call_type` VARCHAR(255) NOT NULL,
  `prompt_tokens` INT NOT NULL DEFAULT 0,
  `completion_tokens` INT NOT NULL DEFAULT 0,
  `total_tokens` INT NOT NULL DEFAULT 0,
  `latency_ms` INT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'success',
  `error_message` TEXT DEFAULT NULL,
  `request_summary` TEXT DEFAULT NULL,
  `fallback_from` VARCHAR(255) DEFAULT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `application_name` VARCHAR(255) DEFAULT NULL,
  `application_location` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ai_usage_provider_date` (`provider`, `created_at`),
  INDEX `idx_ai_usage_call_type` (`call_type`),
  INDEX `idx_ai_usage_user` (`user_id`, `created_at`),
  INDEX `idx_ai_usage_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 33. ai_alert_configs - AI 告警配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_alert_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `model_id` VARCHAR(36) NOT NULL UNIQUE,
  `provider` VARCHAR(255) NOT NULL,
  `daily_call_limit` INT NOT NULL DEFAULT 0,
  `monthly_token_limit` INT NOT NULL DEFAULT 0,
  `warning_threshold` INT NOT NULL DEFAULT 80,
  `critical_threshold` INT NOT NULL DEFAULT 95,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ai_alert_model` (`model_id`),
  CONSTRAINT `fk_aac_model` FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 34. ai_alert_records - AI 告警记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_alert_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `provider` VARCHAR(255) NOT NULL,
  `model_name` VARCHAR(255) NOT NULL,
  `alert_type` VARCHAR(255) NOT NULL,
  `level` VARCHAR(255) NOT NULL,
  `threshold` INT NOT NULL,
  `current_value` INT NOT NULL,
  `limit_value` INT NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ai_alert_rec_provider` (`provider`, `created_at`),
  INDEX `idx_ai_alert_rec_level` (`level`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 35. ai_health_records - AI 健康检查记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_health_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `provider` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `latency_ms` INT DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `checked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ai_health_provider_date` (`provider`, `checked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 36. ai_fallback_configs - AI 降级配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_fallback_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `model_id` VARCHAR(36) NOT NULL,
  `provider` VARCHAR(255) NOT NULL,
  `fallback_provider` VARCHAR(255) NOT NULL,
  `fallback_priority` INT NOT NULL DEFAULT 1,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `uk_afc_model_fallback` (`model_id`, `fallback_provider`),
  INDEX `idx_ai_fallback_model` (`model_id`),
  CONSTRAINT `fk_afc_model` FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 37. model_applications - 模型应用配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `model_applications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `module` VARCHAR(255) NOT NULL UNIQUE,
  `module_name` VARCHAR(255) NOT NULL,
  `provider` VARCHAR(255) NOT NULL,
  `model` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT '',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_model_app_module` (`module`),
  INDEX `idx_model_app_provider` (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 38. ai_prompt_templates - AI 提示词模板表
-- ============================================================
CREATE TABLE IF NOT EXISTS `ai_prompt_templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `module` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(255) NOT NULL DEFAULT 'description',
  `system_prompt` TEXT NOT NULL DEFAULT '',
  `user_prompt_template` TEXT NOT NULL DEFAULT '',
  `variables` JSON DEFAULT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_by` VARCHAR(36) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ai_prompt_module` (`module`),
  INDEX `idx_ai_prompt_type` (`module`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 39. agent_sessions - Agent 会话表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_sessions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) DEFAULT '',
  `message_count` INT DEFAULT 0,
  `last_intent` VARCHAR(255) DEFAULT NULL,
  `last_active_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_agent_sessions_user_id` (`user_id`),
  INDEX `idx_agent_sessions_last_active` (`user_id`, `last_active_at` DESC),
  CONSTRAINT `fk_as_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 40. agent_messages - Agent 消息表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_messages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `session_id` VARCHAR(36) NOT NULL,
  `role` VARCHAR(20) NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  `content` TEXT DEFAULT '',
  `intent` VARCHAR(255) DEFAULT NULL,
  `tool_calls` JSON DEFAULT NULL,
  `tool_results` JSON DEFAULT NULL,
  `display_type` VARCHAR(255) DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_agent_messages_session_id` (`session_id`),
  INDEX `idx_agent_messages_session_created` (`session_id`, `created_at`),
  CONSTRAINT `fk_am_session` FOREIGN KEY (`session_id`) REFERENCES `agent_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 41. agent_pending_confirmations - Agent 待确认操作表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_pending_confirmations` (
  `session_id` VARCHAR(36) PRIMARY KEY,
  `tool_name` VARCHAR(255) NOT NULL,
  `params_json` JSON NOT NULL,
  `confirm_message` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_apc_session` FOREIGN KEY (`session_id`) REFERENCES `agent_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 42. agent_pending_forms - Agent 待填表单表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_pending_forms` (
  `session_id` VARCHAR(36) PRIMARY KEY,
  `form_id` VARCHAR(36) NOT NULL,
  `tool_name` VARCHAR(255) NOT NULL,
  `form_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_apf_session` FOREIGN KEY (`session_id`) REFERENCES `agent_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 43. agent_role_config - Agent 角色配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_role_config` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `agent_name` VARCHAR(255) NOT NULL DEFAULT '小听',
  `user_title` VARCHAR(255) NOT NULL DEFAULT '老板',
  `greeting` TEXT DEFAULT '',
  `tone_style` VARCHAR(255) DEFAULT 'professional',
  `custom_instructions` TEXT DEFAULT '',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_arc_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 44. agent_float_config - Agent 浮窗配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_float_config` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `enabled` TINYINT(1) DEFAULT 1,
  `model` VARCHAR(255) DEFAULT 'deepseek',
  `model_name` VARCHAR(255) DEFAULT '',
  `fallback_model` VARCHAR(255) DEFAULT '',
  `fallback_model_name` VARCHAR(255) DEFAULT '',
  `position` VARCHAR(20) DEFAULT 'right',
  `drawer_width` INT DEFAULT 400,
  `theme_color` VARCHAR(255) DEFAULT '',
  `show_pulse` TINYINT(1) DEFAULT 1,
  `enabled_pages` JSON DEFAULT NULL,
  `max_rounds` INT DEFAULT 10,
  `fill_strategy` VARCHAR(255) DEFAULT 'overwrite',
  `context_mode` VARCHAR(255) DEFAULT 'page',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_afc_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 45. agent_provider_health - Agent 服务商健康状态表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_provider_health` (
  `provider` VARCHAR(255) PRIMARY KEY,
  `consecutive_failures` INT DEFAULT 0,
  `circuit_open` TINYINT(1) DEFAULT 0,
  `circuit_open_until` TIMESTAMP NULL DEFAULT NULL,
  `last_error` TEXT DEFAULT NULL,
  `last_failure_at` TIMESTAMP NULL DEFAULT NULL,
  `last_success_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_agent_provider_health_circuit` (`circuit_open`, `circuit_open_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 46. agent_session_cleanup_log - Agent 会话清理日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS `agent_session_cleanup_log` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `cleaned_sessions` INT DEFAULT 0,
  `cleaned_messages` INT DEFAULT 0,
  `cleaned_confirmations` INT DEFAULT 0,
  `cleaned_forms` INT DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_agent_cleanup_log_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 47. parse_templates - 解析模板表
-- ============================================================
CREATE TABLE IF NOT EXISTS `parse_templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(20) NOT NULL DEFAULT 'nutrition' CHECK(category IN ('formula', 'nutrition', 'general')),
  `default_provider` VARCHAR(255) DEFAULT NULL,
  `default_model` VARCHAR(255) DEFAULT NULL,
  `custom_prompt` TEXT DEFAULT NULL,
  `field_mapping` JSON DEFAULT NULL,
  `validation_rules` JSON DEFAULT NULL,
  `is_preset` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pt_category` (`category`),
  INDEX `idx_pt_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 48. parse_results - 解析结果表
-- ============================================================
CREATE TABLE IF NOT EXISTS `parse_results` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `call_type` VARCHAR(255) NOT NULL,
  `file_hash` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` INT NOT NULL,
  `parsed_result` JSON NOT NULL,
  `raw_response` TEXT NOT NULL,
  `model_provider` VARCHAR(255) DEFAULT NULL,
  `model_name` VARCHAR(255) DEFAULT NULL,
  `tokens_used` INT NOT NULL DEFAULT 0,
  `prompt_tokens` INT NOT NULL DEFAULT 0,
  `completion_tokens` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `error_message` TEXT DEFAULT NULL,
  `used_count` INT NOT NULL DEFAULT 0,
  `is_linked` TINYINT(1) NOT NULL DEFAULT 0,
  `linked_formula_id` VARCHAR(36) DEFAULT NULL,
  `linked_material_id` VARCHAR(36) DEFAULT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_parse_results_user_id` (`user_id`),
  INDEX `idx_parse_results_file_hash` (`file_hash`),
  INDEX `idx_parse_results_call_type` (`call_type`),
  INDEX `idx_parse_results_status` (`status`),
  INDEX `idx_parse_results_created_at` (`created_at`),
  INDEX `idx_parse_results_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 49. parse_result_configs - 解析结果配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `parse_result_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `config_key` VARCHAR(255) NOT NULL UNIQUE,
  `config_value` TEXT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 50. user_preferences - 用户偏好设置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `user_id` VARCHAR(36) PRIMARY KEY,
  `preferences_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 51. db_script_logs - 数据库脚本执行日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS `db_script_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `script_id` VARCHAR(255) NOT NULL,
  `script_name` VARCHAR(255) NOT NULL,
  `triggered_by` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'running',
  `started_at` TIMESTAMP NOT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `duration_ms` INT DEFAULT NULL,
  `result_summary` TEXT DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  INDEX `idx_script_logs_script_id` (`script_id`),
  INDEX `idx_script_logs_status` (`status`),
  INDEX `idx_script_logs_started_at` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 52. search_export_cache - 搜索导出缓存表
-- ============================================================
CREATE TABLE IF NOT EXISTS `search_export_cache` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `sql` TEXT NOT NULL,
  `row_count` INT DEFAULT 0,
  `file_path` VARCHAR(500) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_search_export_user` (`user_id`),
  INDEX `idx_search_export_expires` (`expires_at`),
  CONSTRAINT `fk_sec_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
