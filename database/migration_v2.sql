-- ==========================================================
-- Smart Display Database Migration / Update Script
-- Run this in Hostinger phpMyAdmin (SQL tab)
-- ==========================================================

-- 1. Update `users` table
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(100) DEFAULT 'Admin User' AFTER `id`,
  ADD COLUMN IF NOT EXISTS `auth_token` VARCHAR(255) NULL AFTER `password_hash`;

-- 2. Update `displays` table
ALTER TABLE `displays` 
  ADD COLUMN IF NOT EXISTS `orientation` VARCHAR(30) DEFAULT 'landscape_720p' AFTER `theme`,
  ADD COLUMN IF NOT EXISTS `background_json` JSON NULL AFTER `refresh_interval`,
  ADD COLUMN IF NOT EXISTS `sleep_schedule_json` JSON NULL AFTER `background_json`,
  ADD COLUMN IF NOT EXISTS `pages_json` JSON NULL AFTER `sleep_schedule_json`;

-- 3. Update `widgets` table
ALTER TABLE `widgets` 
  ADD COLUMN IF NOT EXISTS `page_id` VARCHAR(50) DEFAULT 'default' AFTER `display_id`,
  ADD COLUMN IF NOT EXISTS `style_json` JSON NULL AFTER `position_json`;

-- 4. Seed or Update Default Admin User (admin@smartdisplay.local / adminpassword)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`) 
VALUES (1, 'Admin', 'admin@smartdisplay.local', '$2y$10$O0N8yW9m6L/C3sB4H8qPee9gq6n2e6uQp2K6KxP8o0W8J6qL9P3aK')
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `password_hash` = VALUES(`password_hash`);
