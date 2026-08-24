-- ==========================================================
-- Smart Display Database Migration v4
-- 6 Breakthrough Market-Leading Features:
-- Emergency Broadcasts, WallDrop Items, AI Briefing Config
-- Run this in Hostinger phpMyAdmin (SQL tab)
-- ==========================================================

-- 1. Emergency Fleet Broadcasts Table
CREATE TABLE IF NOT EXISTS `emergency_broadcasts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `display_id` INT NULL, -- NULL means all displays owned by user
    `severity` ENUM('info', 'warning', 'critical') DEFAULT 'warning',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `play_sound` TINYINT(1) DEFAULT 1,
    `is_active` TINYINT(1) DEFAULT 1,
    `expires_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. WallDrop Mobile Items Table (Notes and Photos beamed from phones)
CREATE TABLE IF NOT EXISTS `walldrop_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `display_id` INT NOT NULL,
    `type` ENUM('note', 'photo', 'alert') DEFAULT 'note',
    `author` VARCHAR(100) DEFAULT 'Family Member',
    `content` TEXT NOT NULL,
    `media_url` VARCHAR(500) NULL,
    `color` VARCHAR(20) DEFAULT '#fef08a',
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`display_id`) REFERENCES `displays`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
