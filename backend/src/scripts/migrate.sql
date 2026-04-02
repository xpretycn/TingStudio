-- TingStudio 数据库迁移脚本
-- 为 users 表添加个人资料字段

-- 个人资料显示名
ALTER TABLE `users` ADD COLUMN `display_name` TEXT DEFAULT NULL;

-- 头像（Base64 字符串或 URL）
ALTER TABLE `users` ADD COLUMN `avatar` TEXT DEFAULT NULL;

-- 个人简介
ALTER TABLE `users` ADD COLUMN `bio` TEXT DEFAULT NULL;

-- 邮箱
ALTER TABLE `users` ADD COLUMN `email` TEXT DEFAULT NULL;

-- 手机号
ALTER TABLE `users` ADD COLUMN `phone` TEXT DEFAULT NULL;
