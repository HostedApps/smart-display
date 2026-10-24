CREATE DATABASE IF NOT EXISTS `smart_display_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smart_display_db`;

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) DEFAULT 'Admin User',
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `auth_token` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Displays Table (Physical/Virtual screens)
CREATE TABLE IF NOT EXISTS `displays` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token` VARCHAR(64) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `theme` VARCHAR(50) DEFAULT 'dark',
    `orientation` VARCHAR(30) DEFAULT 'landscape_720p',
    `refresh_interval` INT DEFAULT 60,
    `background_json` JSON NULL,
    `sleep_schedule_json` JSON NULL,
    `pages_json` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Widgets Table
CREATE TABLE IF NOT EXISTS `widgets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `display_id` INT NOT NULL,
    `page_id` VARCHAR(50) DEFAULT 'default',
    `type` VARCHAR(50) NOT NULL,
    `position_json` JSON NOT NULL,
    `style_json` JSON NULL,
    `config_json` JSON NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`display_id`) REFERENCES `displays`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- No default user is seeded. For local development, scripts/setup-dev-db.sh creates an admin
-- with a password you choose (DEV_ADMIN_PASSWORD) or a random one it prints.
