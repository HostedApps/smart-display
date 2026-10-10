-- Database Migration v6: Super Admin, Email Verification, Activity Logs, and Captcha

SET @dbname = DATABASE();
SET @tablename = "users";

-- Add role column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "role")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `role` ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user' AFTER `password_hash`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add is_active column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "is_active")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add email_verified column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "email_verified")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `email_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add verification_token column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "verification_token")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `verification_token` VARCHAR(64) NULL AFTER `email_verified`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add verification_expires_at column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "verification_expires_at")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `verification_expires_at` TIMESTAMP NULL AFTER `verification_token`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add oauth_provider column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "oauth_provider")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `oauth_provider` VARCHAR(30) NULL AFTER `verification_expires_at`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add oauth_id column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "oauth_id")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `oauth_id` VARCHAR(100) NULL AFTER `oauth_provider`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add last_login_at column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_NAME = @tablename)
      AND (TABLE_SCHEMA = @dbname)
      AND (COLUMN_NAME = "last_login_at")
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `last_login_at` TIMESTAMP NULL AFTER `created_at`;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Mark existing users as email-verified (superadmins are assigned explicitly, never by a default email)
UPDATE `users` SET `email_verified` = 1 WHERE `email_verified` = 0;

-- 3. Create User Activity Logs Table
CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_email` VARCHAR(255) NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_activity_user` (`user_id`),
  INDEX `idx_activity_action` (`action`),
  INDEX `idx_activity_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create Captcha Challenges Table
CREATE TABLE IF NOT EXISTS `captcha_challenges` (
  `challenge_token` VARCHAR(64) PRIMARY KEY,
  `answer_hash` VARCHAR(64) NOT NULL,
  `expires_at` INT NOT NULL,
  INDEX `idx_captcha_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
