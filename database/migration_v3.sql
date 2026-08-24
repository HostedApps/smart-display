-- ==========================================================
-- Smart Display Database Migration v3
-- Multi-User, Device Fleet & Enterprise PIN Pairing
-- Run this in Hostinger phpMyAdmin (SQL tab)
-- ==========================================================

-- 1. Add logo and security fields to `displays` table
ALTER TABLE `displays` 
  ADD COLUMN IF NOT EXISTS `logo_url` VARCHAR(500) NULL AFTER `pages_json`,
  ADD COLUMN IF NOT EXISTS `show_logo_kiosk` TINYINT(1) DEFAULT 0 AFTER `logo_url`,
  ADD COLUMN IF NOT EXISTS `require_pin` TINYINT(1) DEFAULT 0 AFTER `show_logo_kiosk`,
  ADD COLUMN IF NOT EXISTS `pin_code` VARCHAR(10) NULL AFTER `require_pin`;

-- 2. Create `devices` table (Bonded hardware screens)
CREATE TABLE IF NOT EXISTS `devices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `display_id` INT NOT NULL,
    `device_token` VARCHAR(64) NOT NULL UNIQUE,
    `device_name` VARCHAR(100) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `last_ping` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`display_id`) REFERENCES `displays`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Create `device_pairings` table (6-digit ephemeral PIN pairing)
CREATE TABLE IF NOT EXISTS `device_pairings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `pairing_code` VARCHAR(10) NOT NULL UNIQUE,
    `device_secret` VARCHAR(64) NOT NULL,
    `display_id` INT NULL,
    `status` ENUM('pending', 'paired', 'expired') DEFAULT 'pending',
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
