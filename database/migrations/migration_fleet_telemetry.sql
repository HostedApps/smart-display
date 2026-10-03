-- Fleet hub telemetry: kiosk heartbeats (last seen + client info + optional
-- screenshot thumbnail) and a short-lived remote command queue that kiosks pick
-- up through the emergency.php poll.
ALTER TABLE displays ADD COLUMN IF NOT EXISTS last_seen_at DATETIME NULL;
ALTER TABLE displays ADD COLUMN IF NOT EXISTS client_info_json TEXT NULL;
ALTER TABLE displays ADD COLUMN IF NOT EXISTS thumbnail_data MEDIUMTEXT NULL;
ALTER TABLE displays ADD COLUMN IF NOT EXISTS thumbnail_at DATETIME NULL;

ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at DATETIME NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS client_info_json TEXT NULL;

CREATE TABLE IF NOT EXISTS display_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    display_id INT NOT NULL,
    command VARCHAR(20) NOT NULL,
    payload_json TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_display_commands_display_id (display_id, id),
    CONSTRAINT fk_display_commands_display FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
