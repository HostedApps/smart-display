CREATE DATABASE IF NOT EXISTS `smart_display_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smart_display_db`;

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Displays Table (Physical/Virtual screens)
CREATE TABLE IF NOT EXISTS `displays` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token` VARCHAR(64) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `theme` VARCHAR(50) DEFAULT 'dark',
    `orientation` VARCHAR(30) DEFAULT 'landscape_720p', -- 'landscape_720p', 'landscape_1080p', 'portrait_720p', 'portrait_1080p'
    `refresh_interval` INT DEFAULT 60, -- in seconds
    `background_json` JSON NULL,       -- { "type": "color|gradient|image", "value": "..." }
    `sleep_schedule_json` JSON NULL,   -- { "enabled": true, "sleepTime": "23:00", "wakeTime": "06:30", "nightMode": true }
    `pages_json` JSON NULL,            -- Multi-screen pages configuration
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Widgets Table
CREATE TABLE IF NOT EXISTS `widgets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `display_id` INT NOT NULL,
    `page_id` VARCHAR(50) DEFAULT 'default',
    `type` VARCHAR(50) NOT NULL, -- 'clock', 'weather', 'calendar', 'photo', 'rss', 'todo', 'homeassistant', 'spotify', 'stock_crypto'
    `position_json` JSON NOT NULL, -- { "x": 0, "y": 0, "width": 320, "height": 200 }
    `style_json` JSON NULL,        -- { "opacity": 1.0, "borderRadius": 12, "backdropBlur": true }
    `config_json` JSON NOT NULL,   -- { "timezone": "...", "apiKey": "...", etc. }
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`display_id`) REFERENCES `displays`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
