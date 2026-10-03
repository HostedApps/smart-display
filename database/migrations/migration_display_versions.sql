-- Display version history: a JSON snapshot of the full editor payload is
-- stored on every successful save_display.php call (newest 20 kept per display),
-- so the editor can list and restore earlier layouts.
CREATE TABLE IF NOT EXISTS display_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    display_id INT NOT NULL,
    user_id INT NULL,
    label VARCHAR(100) NULL,
    widget_count INT NOT NULL DEFAULT 0,
    snapshot_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_display_versions_display_created (display_id, created_at),
    CONSTRAINT fk_display_versions_display FOREIGN KEY (display_id) REFERENCES displays(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
