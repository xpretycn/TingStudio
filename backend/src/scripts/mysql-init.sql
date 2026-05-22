-- MySQL 数据库初始化脚本
-- 创建 TingStudio 数据库表结构

CREATE DATABASE IF NOT EXISTS `tingstudio` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tingstudio`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'formulist',
  `display_name` VARCHAR(255) DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 业务员表
CREATE TABLE IF NOT EXISTS `salesmen` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `department` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 原料表
CREATE TABLE IF NOT EXISTS `materials` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'g',
  `stock` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `material_type` VARCHAR(20) NOT NULL DEFAULT 'herb',
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_code` (`code`),
  INDEX `idx_material_type` (`material_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 配方表
CREATE TABLE IF NOT EXISTS `formulas` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `salesman_id` VARCHAR(36) NOT NULL,
  `salesman_name` VARCHAR(255) NOT NULL,
  `materials_json` JSON NOT NULL,
  `finished_weight` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `ratio_factor` DECIMAL(5,3) NOT NULL DEFAULT 0.18,
  `supplement_ratio_factor` DECIMAL(5,3) NOT NULL DEFAULT 1.0,
  `description` TEXT DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_salesman_id` (`salesman_id`),
  INDEX `idx_created_by` (`created_by`),
  FOREIGN KEY (`salesman_id`) REFERENCES `salesmen`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 配方版本表
CREATE TABLE IF NOT EXISTS `formula_versions` (
  `version_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_number` VARCHAR(50) NOT NULL,
  `version_name` VARCHAR(255) DEFAULT NULL,
  `version_reason` TEXT DEFAULT NULL,
  `changes_json` JSON DEFAULT NULL,
  `snapshot_json` JSON NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
  `is_current` TINYINT(1) NOT NULL DEFAULT 0,
  `ratio_factor` DECIMAL(5,3) NOT NULL DEFAULT 0.18,
  `supplement_ratio_factor` DECIMAL(5,3) NOT NULL DEFAULT 1.0,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_formula_id` (`formula_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_current` (`is_current`),
  INDEX `idx_formula_status` (`formula_id`, `status`),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 配方版本审批日志表
CREATE TABLE IF NOT EXISTS `formula_review_logs` (
  `review_log_id`  VARCHAR(36) PRIMARY KEY,
  `version_id`     VARCHAR(36) NOT NULL,
  `reviewer_id`    VARCHAR(36) NOT NULL,
  `reviewer_name`  VARCHAR(255) DEFAULT NULL,
  `action`         VARCHAR(20) NOT NULL,
  `comment`        TEXT DEFAULT NULL,
  `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_frl_version`  (`version_id`),
  INDEX `idx_frl_reviewer` (`reviewer_id`),
  INDEX `idx_frl_action`   (`action`),
  FOREIGN KEY (`version_id`)  REFERENCES `formula_versions`(`version_id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 导出模板表
CREATE TABLE IF NOT EXISTS `export_templates` (
  `template_id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `type` VARCHAR(20) NOT NULL,
  `format_config_json` JSON NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 导出任务表
CREATE TABLE IF NOT EXISTS `export_jobs` (
  `job_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_id` VARCHAR(36) DEFAULT NULL,
  `template_id` VARCHAR(36) DEFAULT NULL,
  `export_type` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `file_url` VARCHAR(500) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `api_endpoint` VARCHAR(500) DEFAULT NULL,
  `progress` INT NOT NULL DEFAULT 0,
  `error_message` TEXT DEFAULT NULL,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_formula_id` (`formula_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 原料营养成分表
CREATE TABLE IF NOT EXISTS `material_nutrition` (
  `nutrition_id` VARCHAR(36) PRIMARY KEY,
  `material_id` VARCHAR(36) NOT NULL UNIQUE,
  `per_100g_json` JSON NOT NULL,
  `data_version` VARCHAR(20) NOT NULL DEFAULT '1.0',
  `data_source` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `confidence` VARCHAR(20) DEFAULT 'medium',
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 配方营养汇总表
CREATE TABLE IF NOT EXISTS `formula_nutrition_summaries` (
  `summary_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_id` VARCHAR(36) DEFAULT NULL,
  `total_weight` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_nutrition_json` JSON NOT NULL,
  `per_100g_nutrition_json` JSON NOT NULL,
  `material_breakdown_json` JSON DEFAULT NULL,
  `calculated_by` VARCHAR(36) NOT NULL,
  `calculated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_formula_id` (`formula_id`),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 营养标准档案表
CREATE TABLE IF NOT EXISTS `nutrition_profiles` (
  `profile_id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(20) NOT NULL,
  `target_values_json` JSON NOT NULL,
  `tolerance_ranges_json` JSON DEFAULT NULL,
  `mandatory_fields_json` JSON DEFAULT NULL,
  `is_preset` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API 数据接口表
CREATE TABLE IF NOT EXISTS `api_data_interfaces` (
  `interface_id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `headers_json` JSON DEFAULT NULL,
  `parameters_json` JSON DEFAULT NULL,
  `response_format` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分享配置表
CREATE TABLE IF NOT EXISTS `share_configs` (
  `config_id` VARCHAR(36) PRIMARY KEY,
  `formula_id` VARCHAR(36) NOT NULL,
  `version_id` VARCHAR(36) DEFAULT NULL,
  `share_type` VARCHAR(20) NOT NULL,
  `share_url` VARCHAR(500) DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_formula_id` (`formula_id`),
  INDEX `idx_is_active` (`is_active`),
  FOREIGN KEY (`formula_id`) REFERENCES `formulas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;