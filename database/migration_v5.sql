-- ==========================================================
-- Smart Display Database Migration v5
-- Rate Limiting Table for Auth & Pairing Protection
-- ==========================================================

CREATE TABLE IF NOT EXISTS `rate_limits` (
    `rate_key` VARCHAR(191) PRIMARY KEY,
    `hits` INT NOT NULL DEFAULT 1,
    `expires_at` INT NOT NULL
) ENGINE=InnoDB;
